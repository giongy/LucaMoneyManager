package com.moneymanager;

import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

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
