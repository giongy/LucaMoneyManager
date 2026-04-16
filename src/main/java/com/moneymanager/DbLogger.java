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

    private Path logFile;
    private int  startLineCount; // righe nel log all'avvio della sessione

    public DbLogger(String dbPath) {
        initPath(dbPath);
    }

    /** Aggiorna il percorso del log file quando si cambia DB. */
    public void setDbPath(String dbPath) { initPath(dbPath); }

    private void initPath(String dbPath) {
        if (dbPath == null || dbPath.isBlank()) { logFile = null; startLineCount = 0; return; }
        Path db = Path.of(dbPath);
        String base = db.getFileName().toString().replaceAll("\\.[^.]+$", "");
        logFile = db.resolveSibling(base + ".log");
        startLineCount = countCurrentLines();
    }

    /** Conta le righe attuali nel file di log (0 se non esiste). */
    private int countCurrentLines() {
        if (logFile == null || !Files.exists(logFile)) return 0;
        try (var lines = Files.lines(logFile, StandardCharsets.UTF_8)) {
            return (int) lines.count();
        } catch (IOException e) { return 0; }
    }

    /** True se in questa sessione sono state eseguite operazioni di scrittura sui dati. */
    public boolean hasChanges() {
        return !getSessionEntries().isEmpty();
    }

    /**
     * Restituisce le voci di log scritte in questa sessione, escludendo le operazioni di sistema.
     * Ogni voce: {time, op, desc}
     */
    public List<Map<String, Object>> getSessionEntries() {
        if (logFile == null || !Files.exists(logFile)) return List.of();
        try {
            List<String> all = Files.readAllLines(logFile, StandardCharsets.UTF_8);
            int from = Math.min(startLineCount, all.size());
            return all.subList(from, all.size()).stream()
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

    public Path getLogFile() { return logFile; }

    /**
     * Scrive una riga di log.
     * @param action  etichetta azione (es. "TRANSAZIONE AGGIUNTA")
     * @param fields  coppie "chiave:valore" da aggiungere separati da  |
     */
    public void log(String action, String... fields) {
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
    public Map<String, Object> getLogDateRange() {
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
    public Map<String, Object> purgeLogBefore(String cutoffDate) {
        if (logFile == null || !Files.exists(logFile)) return Map.of("deleted", 0, "remaining", 0);
        try {
            List<String> all  = Files.readAllLines(logFile, java.nio.charset.StandardCharsets.UTF_8);
            List<String> kept = all.stream()
                    .filter(l -> l.length() < 10 || l.substring(0, 10).compareTo(cutoffDate) >= 0)
                    .collect(Collectors.toList());
            int deleted = all.size() - kept.size();
            String content = kept.isEmpty() ? "" : String.join(System.lineSeparator(), kept) + System.lineSeparator();
            Files.writeString(logFile, content, StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.CREATE);
            return Map.of("deleted", deleted, "remaining", kept.size());
        } catch (IOException e) { return Map.of("error", e.getMessage(), "deleted", 0); }
    }

    private static final java.util.Set<String> SYSTEM_ACTIONS = java.util.Set.of(
        "AVVIO", "DB CAMBIATO", "BACKUP ESEGUITO", "RIPRISTINO BACKUP", "MANUTENZIONE"
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
     * (AVVIO, DB CAMBIATO, BACKUP ESEGUITO, RIPRISTINO BACKUP, MANUTENZIONE).
     * Restituisce il numero di righe eliminate e quelle rimaste.
     */
    public Map<String, Object> purgeSystemEntries() {
        if (logFile == null || !Files.exists(logFile)) return Map.of("deleted", 0, "remaining", 0);
        try {
            List<String> all  = Files.readAllLines(logFile, java.nio.charset.StandardCharsets.UTF_8);
            List<String> kept = all.stream()
                    .filter(l -> !SYSTEM_ACTIONS.contains(extractAction(l)))
                    .collect(Collectors.toList());
            int deleted = all.size() - kept.size();
            String content = kept.isEmpty() ? "" : String.join(System.lineSeparator(), kept) + System.lineSeparator();
            Files.writeString(logFile, content, StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.CREATE);
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
