package com.moneymanager;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Scrive una riga di log per ogni operazione di scrittura sul database.
 * File: stessa cartella del DB, nome <dbname>.log
 * Formato: YYYY-MM-DD  HH:mm:ss  AZIONE                         |  campo:valore  |  ...
 */
public class DbLogger {

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm:ss");

    // Formato riga: DATE(10) + "  " + TIME(8) + "  " + ACTION(35) + fields...
    // Posizioni:    0-9          10-11  12-19     20-21  22-56
    private static final int POS_TIME   = 12;
    private static final int POS_ACTION = 22;
    private static final int POS_FIELDS = 57; // 22 + 35

    // ── Thread-safety ────────────────────────────────────────────────────────────
    // Questa classe è usata da QUATTRO famiglie di thread: il thread UI di JCEF, i virtual
    // thread del WebServer (una richiesta = un thread), l'EDT Swing (tray, iconify, chiusura) e
    // il thread del Timer di auto-release. Senza lock:
    //   - due log() concorrenti potevano INTRECCIARE le righe nel file (ogni chiamata è una
    //     writeString in APPEND separata), producendo voci illeggibili o mezze righe che poi
    //     finiscono nel sidecar JSON del backup come "operazioni fantasma";
    //   - `logFile` e `startOffset` sono stato mutabile condiviso: un setDbPath (cambio DB) o un
    //     purge concorrente a un log()/getSessionEntries() poteva far leggere un path vecchio con
    //     un offset nuovo, cioè una finestra di sessione senza senso — e da quella finestra
    //     dipende hasChanges(), cioè se il backup automatico parte.
    // Tutti i metodi pubblici e i privati che toccano questi campi sono quindi `synchronized`
    // sullo stesso monitor (l'istanza). Il costo è irrilevante: le scritture sono poche righe di
    // testo e la contesa reale è vicina a zero, mentre il rischio evitato è la perdita silenziosa
    // del backup automatico.
    private Path logFile;
    private long startOffset; // byte nel log all'avvio della sessione (Files.size, istantaneo)

    public DbLogger(String dbPath) {
        initPath(dbPath);
    }

    /** Aggiorna il percorso del log file quando si cambia DB. */
    public synchronized void setDbPath(String dbPath) { initPath(dbPath); }

    /** Calcola il path del .log accanto al DB e fissa l'offset di inizio sessione. */
    private synchronized void initPath(String dbPath) {
        if (dbPath == null || dbPath.isBlank()) { logFile = null; startOffset = 0; return; }
        Path db = Path.of(dbPath);
        String base = db.getFileName().toString().replaceAll("\\.[^.]+$", "");
        logFile = db.resolveSibling(base + ".log");
        try { startOffset = Files.exists(logFile) ? Files.size(logFile) : 0; }
        catch (IOException e) { startOffset = 0; }
    }

    /** True se in questa sessione sono state eseguite operazioni di scrittura sui dati. */
    public synchronized boolean hasChanges() {
        return !getSessionEntries().isEmpty();
    }

    /** Azzera la finestra di sessione al byte corrente del file di log.
     *  Va chiamato dopo un backup per evitare che le stesse modifiche
     *  vengano considerate "non backuppate" alla prossima chiusura. */
    public synchronized void resetSession() {
        if (logFile == null) return;
        try { startOffset = Files.exists(logFile) ? Files.size(logFile) : 0; }
        catch (IOException e) { startOffset = 0; }
    }

    /**
     * Ri-aggancia startOffset dopo un purge, sottraendo i byte eliminati PRIMA dell'offset.
     *
     * Senza questo, startOffset restava al valore di prima (es. 34.890) mentre il file scendeva
     * a poche centinaia di byte: getSessionEntries() usciva subito su `size <= startOffset` e
     * tornava sempre vuoto, quindi hasChanges() era permanentemente false e **il backup
     * automatico alla chiusura non partiva più, senza dirlo a nessuno**.
     *
     * Non basta però limitare l'offset alla nuova dimensione: il purge elimina di norma proprio
     * lo storico VECCHIO, cioè i byte che stavano prima dell'offset. Portare l'offset a `size`
     * lo metterebbe in fondo al file e nasconderebbe le modifiche della sessione corrente, che
     * dopo il taglio si trovano all'inizio — di nuovo backup saltato, per un'altra strada.
     * Quello che serve è **scalare** l'offset dei byte rimossi che lo precedevano, così la
     * finestra di sessione continua a puntare alle stesse righe di prima.
     *
     * @param removedBeforeOffset byte eliminati che si trovavano prima di startOffset
     */
    private synchronized void shiftSessionOffset(long removedBeforeOffset) {
        if (logFile == null) return;
        startOffset = Math.max(0, startOffset - removedBeforeOffset);
        try {   // tetto di sicurezza: mai oltre la fine del file
            long size = Files.exists(logFile) ? Files.size(logFile) : 0;
            if (startOffset > size) startOffset = size;
        } catch (IOException e) { startOffset = 0; }
    }

    /**
     * Byte occupati dalle righe eliminate che stavano PRIMA di startOffset.
     * Si ricostruisce scorrendo le righe originali e sommando la lunghezza (contenuto +
     * terminatore) di quelle scartate, fermandosi quando si supera l'offset di sessione.
     */
    private synchronized long removedBytesBeforeOffset(List<String> all,
                                          java.util.function.Predicate<String> isKept) {
        long pos = 0, removed = 0;
        int eol = System.lineSeparator().length();
        for (String l : all) {
            long len = l.getBytes(StandardCharsets.UTF_8).length + eol;
            if (pos >= startOffset) break;      // da qui in poi siamo dentro la sessione corrente
            if (!isKept.test(l)) removed += len;
            pos += len;
        }
        return removed;
    }

    /**
     * Restituisce le voci di log scritte in questa sessione, escludendo le operazioni di sistema.
     * Legge solo i byte aggiunti dopo l'avvio, non l'intero file.
     * Ogni voce: {time, op, desc}
     */
    public synchronized List<Map<String, Object>> getSessionEntries() {
        if (logFile == null || !Files.exists(logFile)) return List.of();
        try {
            long size = Files.size(logFile);
            // Rete di sicurezza: se il file è più corto dell'offset, qualcuno l'ha accorciato
            // alle nostre spalle (purge, oppure OneDrive che riporta una versione più vecchia
            // da un altro PC). Senza il riaggancio, ogni chiamata successiva uscirebbe qui e
            // hasChanges() resterebbe false per sempre → backup automatico mai più eseguito.
            if (size < startOffset) startOffset = size;
            if (size <= startOffset) return List.of();
            byte[] buf = new byte[(int)(size - startOffset)];
            try (var raf = new java.io.RandomAccessFile(logFile.toFile(), "r")) {
                raf.seek(startOffset);
                raf.readFully(buf);
            }
            return Arrays.stream(new String(buf, StandardCharsets.UTF_8).split("\\r?\\n"))
                .filter(l -> l.length() >= POS_FIELDS && !SYSTEM_ACTIONS.contains(extractAction(l)))
                .map(l -> {
                    String time = l.substring(POS_TIME, POS_TIME + 8).trim();
                    String op   = extractAction(l);
                    String desc = Arrays.stream(l.substring(POS_FIELDS).split("\\s*\\|\\s*"))
                                        .map(String::trim).filter(s -> !s.isBlank())
                                        .collect(Collectors.joining(" · "));
                    return Map.<String, Object>of("time", time, "op", op, "desc", desc);
                })
                .collect(Collectors.toList());
        } catch (IOException e) { return List.of(); }
    }

    public synchronized Path getLogFile() { return logFile; }

    /**
     * Scrive una riga di log.
     * @param action  etichetta azione (es. "TRANSAZIONE AGGIUNTA")
     * @param fields  coppie "chiave:valore" da aggiungere separati da  |
     */
    public synchronized void log(String action, String... fields) {
        if (logFile == null) return;
        try {
            LocalDateTime now = LocalDateTime.now();
            StringBuilder sb = new StringBuilder(256);
            sb.append(now.format(DATE))
              .append("  ")
              .append(now.format(TIME))
              .append("  ")
              .append(String.format("%-35s", action));
            for (String f : fields) sb.append("  |  ").append(f);
            sb.append(System.lineSeparator());
            Files.writeString(logFile, sb.toString(),
                    StandardOpenOption.CREATE, StandardOpenOption.APPEND);
        } catch (IOException ignored) {}
    }

    /** Prima/ultima data e totale righe nel file di log. */
    public synchronized Map<String, Object> getLogDateRange() {
        if (logFile == null || !Files.exists(logFile)) return Map.of("empty", true);
        try {
            List<String> dated = Files.readAllLines(logFile, java.nio.charset.StandardCharsets.UTF_8)
                    .stream().filter(l -> l.length() >= 10).collect(Collectors.toList());
            if (dated.isEmpty()) return Map.of("empty", true);
            return Map.of(
                "first",       dated.get(0).substring(0, 10),
                "last",        dated.get(dated.size() - 1).substring(0, 10),
                "total_lines", dated.size()
            );
        } catch (IOException e) { return Map.of("error", e.getMessage()); }
    }

    /**
     * Elimina dal file di log tutte le righe con data < cutoffDate (formato yyyy-MM-dd).
     * Restituisce il numero di righe eliminate e quelle rimaste.
     */
    public synchronized Map<String, Object> purgeLogBefore(String cutoffDate) {
        if (logFile == null || !Files.exists(logFile)) return Map.of("deleted", 0, "remaining", 0);
        try {
            List<String> all  = Files.readAllLines(logFile, java.nio.charset.StandardCharsets.UTF_8);
            java.util.function.Predicate<String> isKept =
                    l -> l.length() < 10 || l.substring(0, 10).compareTo(cutoffDate) >= 0;
            List<String> kept = all.stream().filter(isKept).collect(Collectors.toList());
            int deleted = all.size() - kept.size();
            // Byte da scalare calcolati PRIMA di riscrivere (servono le righe originali)
            long removed = removedBytesBeforeOffset(all, isKept);
            String content = kept.isEmpty() ? "" : String.join(System.lineSeparator(), kept) + System.lineSeparator();
            Files.writeString(logFile, content, StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.CREATE);
            // Il file si è accorciato: senza questo hasChanges() resta false per sempre
            // e il backup automatico non parte più.
            shiftSessionOffset(removed);
            return Map.of("deleted", deleted, "remaining", kept.size());
        } catch (IOException e) { return Map.of("error", e.getMessage(), "deleted", 0); }
    }

    private static final java.util.Set<String> SYSTEM_ACTIONS = java.util.Set.of(
        "AVVIO", "DB CAMBIATO", "BACKUP ESEGUITO", "RIPRISTINO BACKUP", "MANUTENZIONE", "DB IDLE-RELEASE"
    );

    /**
     * Estrae il nome dell'azione da una riga di log.
     * Formato: DATE(10) + "  " + TIME(8) + "  " + ACTION(35) + ...
     */
    private static String extractAction(String line) {
        if (line.length() < POS_ACTION + 1) return "";
        int end = Math.min(POS_FIELDS, line.length());
        return line.substring(POS_ACTION, end).trim();
    }

    /**
     * Elimina dal file di log tutte le righe di sistema
     * (AVVIO, DB CAMBIATO, BACKUP ESEGUITO, RIPRISTINO BACKUP, MANUTENZIONE, DB IDLE-RELEASE).
     * Restituisce il numero di righe eliminate e quelle rimaste.
     */
    public synchronized Map<String, Object> purgeSystemEntries() {
        if (logFile == null || !Files.exists(logFile)) return Map.of("deleted", 0, "remaining", 0);
        try {
            List<String> all  = Files.readAllLines(logFile, java.nio.charset.StandardCharsets.UTF_8);
            java.util.function.Predicate<String> isKept =
                    l -> !SYSTEM_ACTIONS.contains(extractAction(l));
            List<String> kept = all.stream().filter(isKept).collect(Collectors.toList());
            int deleted = all.size() - kept.size();
            long removed = removedBytesBeforeOffset(all, isKept);
            String content = kept.isEmpty() ? "" : String.join(System.lineSeparator(), kept) + System.lineSeparator();
            Files.writeString(logFile, content, StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.CREATE);
            shiftSessionOffset(removed);   // idem: vedi purgeLogBefore
            return Map.of("deleted", deleted, "remaining", kept.size());
        } catch (IOException e) { return Map.of("error", e.getMessage(), "deleted", 0); }
    }

    /** Formatta un numero come importo leggibile. */
    static String amt(Object v) {
        if (v == null) return "0.00";
        double d = ((Number) v).doubleValue();
        return String.format("%.2f", d);
    }

    /** Stringa safe da Object (null → "-"). */
    static String s(Object v) {
        return v != null ? v.toString() : "-";
    }
}
