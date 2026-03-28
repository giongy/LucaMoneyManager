package com.moneymanager;

import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
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

    private Path logFile;

    public DbLogger(String dbPath) {
        setDbPath(dbPath);
    }

    /** Aggiorna il percorso del log file quando si cambia DB. */
    public void setDbPath(String dbPath) {
        if (dbPath == null || dbPath.isBlank()) { logFile = null; return; }
        Path db = Path.of(dbPath);
        String base = db.getFileName().toString().replaceAll("\\.[^.]+$", "");
        logFile = db.resolveSibling(base + ".log");
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
