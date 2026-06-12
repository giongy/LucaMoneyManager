package com.moneymanager;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import org.sqlite.SQLiteConfig;

import java.io.IOException;
import java.nio.file.*;
import java.sql.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Strato di accesso ai dati: incapsula tutte le query JDBC verso SQLite.
 * Espone i metodi richiamati da {@link Bridge#dispatch} (conti, categorie, transazioni,
 * budget, pianificate, portafoglio, note, statistiche, manutenzione DB, ecc.).
 * Gestisce inoltre creazione schema ({@link #initSchema}), migrazioni ({@link #migrate})
 * e dati di default ({@link #seedDefaultData}).
 *
 * Nota: usa una singola {@link Connection} non thread-safe. È sicuro perché le chiamate
 * arrivano serializzate dal thread UI di JCEF (vedi {@link Bridge#onQuery}).
 */
public class Database {

    private Connection conn;
    private String currentDbPath;
    private final DbLogger logger;

    /** Apre il DB e prepara lo schema: crea tabelle, applica migrazioni e dati di default. */
    public Database(String dbPath) throws SQLException {
        currentDbPath = dbPath;
        logger = new DbLogger(dbPath);
        conn = openConnection(dbPath);
        initSchema();
        migrate();
        seedDefaultData();
        logger.log("AVVIO", "db:" + dbPath);
    }

    /**
     * Apre una connessione SQLite con la config scelta per la condivisione via OneDrive:
     * journal=DELETE e synchronous=FULL (massima sicurezza, niente WAL che non sopravvive
     * alla sync di rete), cache 16MB, temp in RAM, foreign key abilitati.
     */
    private static Connection openConnection(String dbPath) throws SQLException {
        SQLiteConfig config = new SQLiteConfig();
        config.setJournalMode(SQLiteConfig.JournalMode.DELETE);
        config.setSynchronous(SQLiteConfig.SynchronousMode.FULL);
        config.setCacheSize(-16000);   // 16 MB di cache (default 2 MB)
        config.setTempStore(SQLiteConfig.TempStore.MEMORY); // tabelle temporanee in RAM
        config.enforceForeignKeys(true);
        return DriverManager.getConnection("jdbc:sqlite:" + dbPath, config.toProperties());
    }

    /** Chiude il DB corrente e ne apre un altro (cambio file DB da Impostazioni). */
    public void reconnect(String dbPath) throws SQLException {
        conn.close();
        currentDbPath = dbPath;
        logger.setDbPath(dbPath);
        conn = openConnection(dbPath);
        initSchema();
        migrate();
        seedDefaultData();
        logger.log("DB CAMBIATO", "db:" + dbPath);
    }

    /** True se la connessione è aperta e valida. */
    public boolean isOpen() {
        try { return conn != null && !conn.isClosed(); } catch (SQLException e) { return false; }
    }

    /** Chiude la connessione (es. al tray) così OneDrive può sincronizzare il file. */
    public void close() throws SQLException {
        if (conn != null && !conn.isClosed()) conn.close();
    }

    /** Riapre il DB dopo una chiusura esplicita (es. nascosto al tray per OneDrive). */
    public void reopen() throws SQLException {
        if (!isOpen()) conn = openConnection(currentDbPath);
    }

    public String getDbPath() { return currentDbPath; }

    /** Versione della libreria SQLite in uso (mostrata in Impostazioni). */
    public String getSQLiteVersion() throws SQLException {
        try (var st = conn.createStatement();
             var rs = st.executeQuery("SELECT sqlite_version()")) {
            return rs.next() ? rs.getString(1) : "?";
        }
    }

    /** True se in questa sessione sono state eseguite modifiche al DB. */
    public boolean hasModifications() { return logger.hasChanges(); }

    /** Azzera il marcatore di sessione dopo un backup, evitando backup ridondanti. */
    public void resetModifications() { logger.resetSession(); }

    /**
     * Copia il DB nella cartella di backup come nomedb_YYYY-MM-DD_HH-mm-ss.db.bak,
     * con un sidecar .json delle modifiche di sessione. Mantiene al massimo
     * maxBackups file, eliminando i più vecchi (con relativo sidecar).
     */
    public String backup(String backupDir, int maxBackups) throws IOException {
        if (backupDir == null || backupDir.isBlank())
            throw new IOException("Cartella backup non configurata");

        Path src = Path.of(currentDbPath);
        if (!Files.exists(src))
            throw new IOException("File database non trovato: " + currentDbPath);

        Path dir = Path.of(backupDir);
        Files.createDirectories(dir);

        String baseName = src.getFileName().toString().replaceAll("\\.[^.]+$", "");
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd_HH-mm-ss"));
        String backupName = baseName + "_" + timestamp + ".db.bak";
        Path dest = dir.resolve(backupName);

        Files.copy(src, dest, StandardCopyOption.REPLACE_EXISTING);
        logger.log("BACKUP ESEGUITO", "dest:" + dest);

        // Sidecar JSON con le modifiche della sessione
        var entries = logger.getSessionEntries();
        if (!entries.isEmpty()) {
            Path sidecar = dest.resolveSibling(backupName + ".json");
            var gson = new com.google.gson.Gson();
            Files.writeString(sidecar, gson.toJson(Map.of("entries", entries)),
                    StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        }

        // Pulizia vecchi backup (ordine cronologico, elimina i più vecchi)
        if (maxBackups > 0) {
            try (DirectoryStream<Path> ds = Files.newDirectoryStream(dir, baseName + "_*.db.bak")) {
                List<Path> baks = new ArrayList<>();
                ds.forEach(baks::add);
                baks.sort(Comparator.comparing(Path::getFileName));
                while (baks.size() > maxBackups) {
                    Path old = baks.remove(0);
                    Files.deleteIfExists(old);
                    Files.deleteIfExists(old.resolveSibling(old.getFileName() + ".json"));
                }
            }
        }

        return dest.toAbsolutePath().toString();
    }

    /**
     * Elenca i file di backup trovati nella cartella configurata e in quella del DB,
     * con timestamp formattato, dimensione e le modifiche lette dal sidecar JSON.
     * Ordinati dal più recente.
     */
    public List<Map<String, Object>> listBackups(String backupDir) throws IOException {
        Path src = Path.of(currentDbPath);

        List<Path> searchDirs = new ArrayList<>();
        if (backupDir != null && !backupDir.isBlank()) searchDirs.add(Path.of(backupDir));
        searchDirs.add(src.getParent()); // directory del db come fallback

        List<Map<String, Object>> result = new ArrayList<>();
        Set<Path> seen = new HashSet<>();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd_HH-mm-ss");
        DateTimeFormatter display = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");

        for (Path dir : searchDirs) {
            if (!Files.isDirectory(dir) || seen.contains(dir)) continue;
            seen.add(dir);
            try (DirectoryStream<Path> ds = Files.newDirectoryStream(dir, "*.db.bak")) {
                for (Path f : ds) {
                    String name = f.getFileName().toString();
                    String ts = null;
                    String displayTs = name;
                    // Estrai timestamp dal nome tipo: luca_2026-03-23_05-24-33.db.bak
                    java.util.regex.Matcher m = java.util.regex.Pattern
                            .compile("(\\d{4}-\\d{2}-\\d{2}_\\d{2}-\\d{2}-\\d{2})").matcher(name);
                    if (m.find()) {
                        ts = m.group(1);
                        try { displayTs = LocalDateTime.parse(ts, fmt).format(display); } catch (Exception ignored) {}
                    }
                    // Leggi sidecar JSON con le modifiche della sessione (se presente)
                    List<?> changes = List.of();
                    Path sidecar = f.resolveSibling(name + ".json");
                    if (Files.exists(sidecar)) {
                        try {
                            var parsed = com.google.gson.JsonParser.parseString(
                                    Files.readString(sidecar, java.nio.charset.StandardCharsets.UTF_8))
                                    .getAsJsonObject();
                            var arr = parsed.getAsJsonArray("entries");
                            var list = new ArrayList<Map<String,Object>>();
                            for (var el : arr) {
                                var obj = el.getAsJsonObject();
                                list.add(Map.of(
                                    "time", obj.get("time").getAsString(),
                                    "op",   obj.get("op").getAsString(),
                                    "desc", obj.get("desc").getAsString()
                                ));
                            }
                            changes = list;
                        } catch (Exception ignored) {}
                    }
                    var entry = new java.util.HashMap<String,Object>();
                    entry.put("name",      name);
                    entry.put("path",      f.toAbsolutePath().toString());
                    entry.put("timestamp", ts != null ? ts : "");
                    entry.put("displayTs", displayTs);
                    entry.put("size",      Files.size(f));
                    entry.put("changes",   changes);
                    result.add(entry);
                }
            }
        }
        result.sort(Comparator.comparing(r -> ((String) r.get("timestamp")), Comparator.reverseOrder()));
        return result;
    }

    /**
     * Ripristina un backup: archivia il DB corrente (suffisso _PRIMA-RIPRISTINO),
     * copia il backup al suo posto e riapre la connessione. In caso di errore fa
     * rollback automatico ripristinando il DB originale.
     */
    public Map<String, Object> restoreBackup(String backupPath, String backupDir) throws Exception {
        Path bak = Path.of(backupPath);
        if (!Files.exists(bak)) throw new IOException("File backup non trovato: " + backupPath);

        Path src = Path.of(currentDbPath);
        String baseName = src.getFileName().toString().replaceAll("\\.[^.]+$", "");
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd_HH-mm-ss"));

        // Chiudi connessione prima di spostare il file
        try { conn.close(); } catch (SQLException ignored) {}
        conn = null;

        // Sposta il db corrente nella cartella backup con nome che evidenzia che era il "vero" db
        Path archiveDir = (backupDir != null && !backupDir.isBlank()) ? Path.of(backupDir) : src.getParent();
        Files.createDirectories(archiveDir);
        String archiveName = baseName + "_PRIMA-RIPRISTINO_" + timestamp + ".db.bak";
        Path archive = archiveDir.resolve(archiveName);
        Files.move(src, archive, StandardCopyOption.REPLACE_EXISTING);

        try {
            // Copia il backup al posto del db corrente
            Files.copy(bak, src, StandardCopyOption.REPLACE_EXISTING);

            // Riapri la connessione
            conn = openConnection(currentDbPath);
            initSchema();
            migrate();
        } catch (Exception e) {
            // Rollback: ripristina il db originale
            try {
                if (Files.exists(src)) Files.delete(src);
                Files.move(archive, src, StandardCopyOption.REPLACE_EXISTING);
                conn = openConnection(currentDbPath);
            } catch (Exception rollbackEx) {
                throw new IOException("Ripristino fallito e rollback non riuscito. " +
                    "Il database originale è in: " + archive.toAbsolutePath(), rollbackEx);
            }
            throw new IOException("Ripristino fallito: " + e.getMessage() +
                ". Database originale ripristinato automaticamente.", e);
        }

        logger.log("RIPRISTINO BACKUP",
                "sorgente:" + backupPath,
                "db-archiviato:" + archive.toAbsolutePath());

        return Map.of("ok", true, "archived", archive.toAbsolutePath().toString());
    }

    // ─── Helpers JDBC ─────────────────────────────────────────────────────────

    private static final long SLOW_QUERY_MS = 50;  // soglia oltre cui logga "[SLOW QUERY]" su stderr

    /** Esegue una SELECT e restituisce le righe come lista di mappe colonna→valore. */
    private List<Map<String, Object>> queryList(String sql, Object... params) throws SQLException {
        long t0 = System.nanoTime();
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            bind(ps, params);
            List<Map<String, Object>> result = toList(ps.executeQuery());
            long ms = (System.nanoTime() - t0) / 1_000_000;
            if (ms >= SLOW_QUERY_MS)
                System.err.printf("[SLOW QUERY %dms] %s%n", ms, sql.substring(0, Math.min(120, sql.length())).replaceAll("\\s+", " ").trim());
            return result;
        }
    }

    /** Come {@link #queryList} ma ritorna solo la prima riga (o null se vuota). */
    private Map<String, Object> queryOne(String sql, Object... params) throws SQLException {
        List<Map<String, Object>> rows = queryList(sql, params);
        return rows.isEmpty() ? null : rows.get(0);
    }

    /** Esegue INSERT/UPDATE/DELETE e ritorna la chiave generata (o -1). */
    private long execute(String sql, Object... params) throws SQLException {
        long t0 = System.nanoTime();
        try (PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            bind(ps, params);
            ps.executeUpdate();
            ResultSet keys = ps.getGeneratedKeys();
            long id = keys.next() ? keys.getLong(1) : -1;
            long ms = (System.nanoTime() - t0) / 1_000_000;
            if (ms >= SLOW_QUERY_MS)
                System.err.printf("[SLOW QUERY %dms] %s%n", ms, sql.substring(0, Math.min(120, sql.length())).replaceAll("\\s+", " ").trim());
            return id;
        }
    }

    /** Esegue uno script SQL multi-istruzione (usato da initSchema/migrate). */
    private void executePlain(String sql) throws SQLException {
        // JDBC esegue solo la prima istruzione: splittiamo per ";"
        for (String stmt : sql.split(";")) {
            String s = stmt.strip();
            if (!s.isEmpty()) {
                try (Statement st = conn.createStatement()) { st.execute(s); }
            }
        }
    }

    /** Associa i parametri posizionali (?,?,...) al PreparedStatement. */
    private void bind(PreparedStatement ps, Object[] params) throws SQLException {
        for (int i = 0; i < params.length; i++) ps.setObject(i + 1, params[i]);
    }

    /** Converte un ResultSet in lista di mappe colonna→valore (chiavi = label colonna). */
    private List<Map<String, Object>> toList(ResultSet rs) throws SQLException {
        ResultSetMetaData meta = rs.getMetaData();
        int cols = meta.getColumnCount();
        List<Map<String, Object>> rows = new ArrayList<>();
        while (rs.next()) {
            Map<String, Object> row = new LinkedHashMap<>();
            for (int i = 1; i <= cols; i++)
                row.put(meta.getColumnLabel(i), rs.getObject(i));
            rows.add(row);
        }
        return rows;
    }

    // Lettori sicuri da JsonObject: ritornano null se la chiave manca o è null
    private String str(JsonObject p, String key) {
        return p.has(key) && !p.get(key).isJsonNull() ? p.get(key).getAsString() : null;
    }

    private Double dbl(JsonObject p, String key) {
        return p.has(key) && !p.get(key).isJsonNull() ? p.get(key).getAsDouble() : null;
    }

    /** Arrotonda a 2 decimali — usato per tutti i valori monetari in €. */
    private static double r2(double v) { return Math.round(v * 100.0) / 100.0; }

    /** Arrotonda a 4 decimali — usato per prezzi unitari di azioni/obbligazioni. */
    private static double r4(double v) { return Math.round(v * 10000.0) / 10000.0; }

    /** Legge un double da JSON e lo arrotonda a 2 decimali. */
    private Double dbl2(JsonObject p, String key) {
        Double v = dbl(p, key);
        return v != null ? r2(v) : null;
    }

    private Integer intVal(JsonObject p, String key) {
        return p.has(key) && !p.get(key).isJsonNull() ? p.get(key).getAsInt() : null;
    }

    @FunctionalInterface
    private interface SqlSupplier<T> { T get() throws SQLException; }

    /** Esegue fn in un'unica transazione SQLite: commit se va bene, rollback se lancia
     *  (anche su RuntimeException — senza rollback il finally setAutoCommit(true) committerebbe
     *  silenziosamente la transazione parziale). */
    private <T> T inTx(SqlSupplier<T> fn) throws SQLException {
        conn.setAutoCommit(false);
        try {
            T result = fn.get();
            conn.commit();
            return result;
        } catch (Exception e) {
            try { conn.rollback(); } catch (SQLException re) { e.addSuppressed(re); }
            throw e;
        } finally {
            conn.setAutoCommit(true);
        }
    }

    // ─── sync_meta ────────────────────────────────────────────────────────────

    /** Aggiorna i marcatori di sync (last_modified + last_modified_by='desktop')
     *  letti da Android per sapere chi ha toccato il DB per ultimo via OneDrive. */
    private void touchSyncMeta() throws SQLException {
        executePlain("CREATE TABLE IF NOT EXISTS sync_meta (key TEXT PRIMARY KEY, value TEXT)");
        String now = java.time.Instant.now().toString();
        execute("INSERT OR REPLACE INTO sync_meta(key,value) VALUES('last_modified',?)", now);
        execute("INSERT OR REPLACE INTO sync_meta(key,value) VALUES('last_modified_by','desktop')");
    }

    // ─── Schema ───────────────────────────────────────────────────────────────

    /** Crea tutte le tabelle (CREATE TABLE IF NOT EXISTS) e gli indici dello schema base. */
    private void initSchema() throws SQLException {
        executePlain("""
            CREATE TABLE IF NOT EXISTS accounts (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                name            TEXT    NOT NULL,
                type            TEXT    NOT NULL,
                currency        TEXT    DEFAULT 'EUR',
                initial_balance REAL    DEFAULT 0,
                color           TEXT    DEFAULT '#58a6ff',
                icon            TEXT    DEFAULT '🏦',
                is_favorite     INTEGER DEFAULT 0,
                is_closed       INTEGER DEFAULT 0,
                created_at      TEXT    DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS categories (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                name       TEXT    NOT NULL,
                type       TEXT    NOT NULL,
                color      TEXT    DEFAULT '#58a6ff',
                icon       TEXT    DEFAULT '📁',
                is_default INTEGER DEFAULT 0,
                parent_id  INTEGER REFERENCES categories(id) ON DELETE CASCADE,
                created_at TEXT    DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS transactions (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                date          TEXT    NOT NULL,
                amount        REAL    NOT NULL,
                type          TEXT    NOT NULL,
                category_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
                account_id    INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
                to_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
                description   TEXT    NOT NULL,
                reconciled    INTEGER DEFAULT 1,
                created_at    TEXT    DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS transaction_splits (
                id             INTEGER PRIMARY KEY AUTOINCREMENT,
                transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
                category_id    INTEGER REFERENCES categories(id) ON DELETE SET NULL,
                amount         REAL    NOT NULL,
                description    TEXT    DEFAULT ''
            );
            CREATE TABLE IF NOT EXISTS budgets (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
                amount      REAL    NOT NULL,
                month       INTEGER NOT NULL,
                year        INTEGER NOT NULL,
                UNIQUE(category_id, month, year)
            );
            CREATE TABLE IF NOT EXISTS budget_config (
                category_id   INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
                year          INTEGER NOT NULL,
                mode          TEXT    NOT NULL DEFAULT 'mensile',
                master_amount REAL    NOT NULL DEFAULT 0,
                PRIMARY KEY (category_id, year)
            );
            CREATE TABLE IF NOT EXISTS portfolio (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id    INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
                ticker        TEXT    NOT NULL,
                name          TEXT    NOT NULL,
                quantity      REAL    NOT NULL DEFAULT 0,
                avg_price     REAL    NOT NULL DEFAULT 0,
                current_price REAL    DEFAULT 0,
                notes         TEXT,
                created_at    TEXT    DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS portfolio_transactions (
                id             INTEGER PRIMARY KEY AUTOINCREMENT,
                portfolio_id   INTEGER NOT NULL REFERENCES portfolio(id) ON DELETE CASCADE,
                type           TEXT    NOT NULL,
                quantity       REAL    NOT NULL,
                price          REAL    NOT NULL,
                date           TEXT    NOT NULL,
                transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
                notes          TEXT,
                created_at     TEXT    DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS tags (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                name       TEXT    NOT NULL UNIQUE,
                color      TEXT    DEFAULT '#58a6ff',
                is_system  INTEGER DEFAULT 0,
                system_key TEXT    UNIQUE,
                created_at TEXT    DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS transaction_tags (
                transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
                tag_id         INTEGER NOT NULL REFERENCES tags(id)         ON DELETE CASCADE,
                PRIMARY KEY (transaction_id, tag_id)
            );
        """);
        executePlain("""
            CREATE TABLE IF NOT EXISTS scheduled_transactions (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                description   TEXT,
                amount        REAL    NOT NULL,
                type          TEXT    NOT NULL,
                category_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
                account_id    INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
                to_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
                frequency     TEXT    NOT NULL DEFAULT 'monthly',
                start_date    TEXT    NOT NULL,
                end_date      TEXT,
                is_active     INTEGER DEFAULT 1,
                color         TEXT,
                reconciled    INTEGER DEFAULT 1,
                created_at    TEXT    DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS notes (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                title      TEXT    NOT NULL DEFAULT '',
                content    TEXT    NOT NULL DEFAULT '',
                color      TEXT    DEFAULT '',
                pinned     INTEGER DEFAULT 0,
                sort_order INTEGER DEFAULT 0,
                created_at TEXT    DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT    DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS note_tags (
                note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
                tag_id  INTEGER NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
                PRIMARY KEY (note_id, tag_id)
            );
        """);
    }

    private static final int SCHEMA_VERSION = 18;

    /**
     * Migrazioni incrementali dello schema. Confronta la versione salvata in
     * schema_version con SCHEMA_VERSION e applica i blocchi v1..v17 mancanti
     * (ALTER TABLE, nuove tabelle, indici), poi aggiorna il numero di versione.
     */
    private void migrate() throws SQLException {
        // Crea tabella versione se non esiste
        executePlain("CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL DEFAULT 0)");
        Map<String, Object> vRow = queryOne("SELECT version FROM schema_version");
        int currentVersion = vRow == null ? 0 : ((Number) vRow.get("version")).intValue();
        if (currentVersion >= SCHEMA_VERSION) return; // già aggiornato, salta tutto

        // ── v1: migrazioni iniziali ────────────────────────────────────────────
        if (currentVersion < 1) {
        // Aggiunge parent_id se il DB è stato creato prima di questa versione
        try {
            executePlain("ALTER TABLE categories ADD COLUMN parent_id INTEGER REFERENCES categories(id) ON DELETE CASCADE");
        } catch (SQLException ignored) { /* colonna già presente */ }
        // Unifica notes in description, poi rimuove la colonna notes
        try {
            executePlain("UPDATE transactions SET description = TRIM(COALESCE(NULLIF(TRIM(description),''), '') || CASE WHEN notes IS NOT NULL AND TRIM(notes)!='' THEN CASE WHEN TRIM(description)!='' THEN ' - ' ELSE '' END || notes ELSE '' END)");
            executePlain("ALTER TABLE transactions DROP COLUMN notes");
        } catch (SQLException ignored) { /* colonna già rimossa */ }
        // Aggiunge colonna color alle transazioni (evidenziazione riga)
        try {
            executePlain("ALTER TABLE transactions ADD COLUMN color TEXT");
        } catch (SQLException ignored) { /* già presente */ }
        // Aggiunge colonna reconciled alle transazioni (conciliata/da verificare)
        try {
            executePlain("ALTER TABLE transactions ADD COLUMN reconciled INTEGER DEFAULT 1");
            // Imposta tutte le transazioni esistenti come conciliate (default retroattivo)
            executePlain("UPDATE transactions SET reconciled=1 WHERE reconciled IS NULL OR reconciled=0");
        } catch (SQLException ignored) { /* già presente */ }
        // Crea tabelle tag se non esistono (CREATE IF NOT EXISTS è idempotente)
        executePlain("CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, color TEXT DEFAULT '#58a6ff', created_at TEXT DEFAULT CURRENT_TIMESTAMP)");
        executePlain("CREATE TABLE IF NOT EXISTS transaction_tags (transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE, tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE, PRIMARY KEY (transaction_id, tag_id))");
        // scheduled_transactions (idempotente)
        executePlain("""
            CREATE TABLE IF NOT EXISTS scheduled_transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                description TEXT, amount REAL NOT NULL, type TEXT NOT NULL,
                category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
                account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
                to_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
                frequency TEXT NOT NULL DEFAULT 'monthly',
                start_date TEXT NOT NULL, end_date TEXT, is_active INTEGER DEFAULT 1,
                color TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """);
        // Rimuove scheduled_skips (non più usata — start_date viene avanzata direttamente)
        try { executePlain("DROP TABLE IF EXISTS scheduled_skips"); } catch (SQLException ignored) {}
        // Crea budget_config se non esiste
        executePlain("""
            CREATE TABLE IF NOT EXISTS budget_config (
                category_id   INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
                year          INTEGER NOT NULL,
                mode          TEXT    NOT NULL DEFAULT 'mensile',
                master_amount REAL    NOT NULL DEFAULT 0,
                PRIMARY KEY (category_id, year)
            )
        """);
        // Aggiunge reconciled a scheduled_transactions
        try {
            executePlain("ALTER TABLE scheduled_transactions ADD COLUMN reconciled INTEGER DEFAULT 1");
            executePlain("UPDATE scheduled_transactions SET reconciled=1 WHERE reconciled IS NULL");
        } catch (SQLException ignored) {}
        // Tabella tag per transazioni pianificate
        executePlain("""
            CREATE TABLE IF NOT EXISTS scheduled_transaction_tags (
                scheduled_id INTEGER NOT NULL REFERENCES scheduled_transactions(id) ON DELETE CASCADE,
                tag_id       INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
                PRIMARY KEY (scheduled_id, tag_id)
            )
        """);
        // Aggiunge is_favorite e is_closed agli account
        try { executePlain("ALTER TABLE accounts ADD COLUMN is_favorite  INTEGER DEFAULT 0"); } catch (SQLException ignored) {}
        try { executePlain("ALTER TABLE accounts ADD COLUMN is_closed    INTEGER DEFAULT 0"); } catch (SQLException ignored) {}
        try { executePlain("ALTER TABLE accounts ADD COLUMN sort_order   INTEGER DEFAULT 0"); } catch (SQLException ignored) {}
        try { executePlain("UPDATE accounts SET sort_order = (SELECT COUNT(*) FROM accounts a2 WHERE a2.id <= accounts.id) WHERE sort_order = 0"); } catch (SQLException ignored) {}
        // Portfolio redesign: drop old structure solo se non ancora migrato (assenza colonna avg_price)
        boolean portfolioNeedsMigration = true;
        try (var rs = conn.getMetaData().getColumns(null, null, "portfolio", "avg_price")) {
            if (rs.next()) portfolioNeedsMigration = false;
        } catch (SQLException ignored) {}
        if (portfolioNeedsMigration) {
            try { executePlain("DROP TABLE IF EXISTS portfolio_transactions"); } catch (SQLException ignored) {}
            try { executePlain("DROP TABLE IF EXISTS portfolio"); } catch (SQLException ignored) {}
        }
        // Aggiungi colonne bond se mancanti (upgrade da versione precedente)
        try { executePlain("ALTER TABLE portfolio ADD COLUMN asset_type TEXT DEFAULT 'equity'"); } catch (SQLException ignored) {}
        try { executePlain("ALTER TABLE portfolio ADD COLUMN face_value REAL DEFAULT 1"); } catch (SQLException ignored) {}
        try { executePlain("ALTER TABLE portfolio ADD COLUMN maturity_date TEXT"); } catch (SQLException ignored) {}
        try { executePlain("ALTER TABLE portfolio ADD COLUMN coupon_rate REAL DEFAULT 0"); } catch (SQLException ignored) {}
        try { executePlain("ALTER TABLE portfolio ADD COLUMN coupon_frequency TEXT"); } catch (SQLException ignored) {}
        try { executePlain("ALTER TABLE portfolio ADD COLUMN coupon_tax REAL DEFAULT 12.5"); } catch (SQLException ignored) {}
        try { executePlain("ALTER TABLE portfolio ADD COLUMN total_commissions REAL DEFAULT 0"); } catch (SQLException ignored) {}
        try { executePlain("ALTER TABLE portfolio ADD COLUMN country TEXT"); } catch (SQLException ignored) {}
        executePlain("""
            CREATE TABLE IF NOT EXISTS portfolio (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id       INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
                ticker           TEXT    NOT NULL,
                name             TEXT    NOT NULL,
                quantity         REAL    NOT NULL DEFAULT 0,
                avg_price        REAL    NOT NULL DEFAULT 0,
                current_price    REAL    DEFAULT 0,
                notes            TEXT,
                asset_type       TEXT    DEFAULT 'equity',
                face_value       REAL    DEFAULT 1,
                maturity_date    TEXT,
                coupon_rate      REAL    DEFAULT 0,
                coupon_frequency TEXT,
                coupon_tax         REAL    DEFAULT 12.5,
                total_commissions  REAL    DEFAULT 0,
                country            TEXT,
                created_at         TEXT    DEFAULT CURRENT_TIMESTAMP
            )
        """);
        executePlain("""
            CREATE TABLE IF NOT EXISTS portfolio_transactions (
                id             INTEGER PRIMARY KEY AUTOINCREMENT,
                portfolio_id   INTEGER NOT NULL REFERENCES portfolio(id) ON DELETE CASCADE,
                type           TEXT    NOT NULL,
                quantity       REAL    NOT NULL,
                price          REAL    NOT NULL,
                date           TEXT    NOT NULL,
                transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
                notes          TEXT,
                created_at     TEXT    DEFAULT CURRENT_TIMESTAMP
            )
        """);
        // Resoconti salvati
        executePlain("""
            CREATE TABLE IF NOT EXISTS reports (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                name         TEXT    NOT NULL,
                filters_json TEXT    NOT NULL DEFAULT '{}',
                groupby      TEXT    NOT NULL DEFAULT 'none',
                chart_type   TEXT    NOT NULL DEFAULT 'none',
                created_at   TEXT    DEFAULT CURRENT_TIMESTAMP
            )
        """);
        // Previsioni
        executePlain("""
            CREATE TABLE IF NOT EXISTS forecasts (
                id                INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at        TEXT    DEFAULT CURRENT_TIMESTAMP,
                forecast_date     TEXT    NOT NULL,
                projected_balance REAL    NOT NULL,
                notes             TEXT
            )
        """);
        executePlain("""
            CREATE TABLE IF NOT EXISTS forecast_categories (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
                forecast_id      INTEGER NOT NULL REFERENCES forecasts(id) ON DELETE CASCADE,
                category_id      INTEGER,
                category_name    TEXT    NOT NULL,
                category_type    TEXT    NOT NULL,
                projected_amount REAL    NOT NULL DEFAULT 0
            )
        """);

        // ─── Indici per performance (idempotenti) ─────────────────────────────
        executePlain("CREATE INDEX IF NOT EXISTS idx_tx_date        ON transactions(date)");
        executePlain("CREATE INDEX IF NOT EXISTS idx_tx_account      ON transactions(account_id)");
        executePlain("CREATE INDEX IF NOT EXISTS idx_tx_to_account   ON transactions(to_account_id)");
        executePlain("CREATE INDEX IF NOT EXISTS idx_tx_category     ON transactions(category_id)");
        executePlain("CREATE INDEX IF NOT EXISTS idx_tx_account_date ON transactions(account_id, date)");
        executePlain("CREATE INDEX IF NOT EXISTS idx_cat_parent      ON categories(parent_id)");
        executePlain("CREATE INDEX IF NOT EXISTS idx_budgets_year    ON budgets(year)");
        executePlain("CREATE INDEX IF NOT EXISTS idx_sched_active    ON scheduled_transactions(is_active)");
        executePlain("CREATE INDEX IF NOT EXISTS idx_tx_tags_tag     ON transaction_tags(tag_id)");
        executePlain("CREATE INDEX IF NOT EXISTS idx_portfolio_acc   ON portfolio(account_id)");
        executePlain("PRAGMA optimize");
        } // fine blocco v1

        // ── v2: tag di sistema ─────────────────────────────────────────────────
        if (currentVersion < 2) {
            try { executePlain("ALTER TABLE tags ADD COLUMN is_system INTEGER DEFAULT 0"); } catch (SQLException ignored) {}
            ensureSystemTags();
        }
        // ── v3: system_key immutabile sui tag di sistema ───────────────────────
        if (currentVersion < 3) {
            try { executePlain("ALTER TABLE tags ADD COLUMN system_key TEXT"); } catch (SQLException ignored) {}
            ensureSystemTags();
        }
        // ── v4: colonna archived sulle previsioni ───────────────────────────────
        if (currentVersion < 4) {
            try { executePlain("ALTER TABLE forecasts ADD COLUMN archived INTEGER DEFAULT 0"); } catch (SQLException ignored) {}
        }
        // ── v5: allegati sulle transazioni ──────────────────────────────────────
        if (currentVersion < 5) {
            try { executePlain("ALTER TABLE transactions ADD COLUMN attachment_path TEXT"); } catch (SQLException ignored) {}
        }
        // ── v6: range_presets personalizzati ────────────────────────────────────
        if (currentVersion < 6) {
            executePlain("""
                CREATE TABLE IF NOT EXISTS range_presets (
                    id         INTEGER PRIMARY KEY AUTOINCREMENT,
                    label      TEXT    NOT NULL,
                    range_key  TEXT    NOT NULL UNIQUE,
                    sort_order INTEGER DEFAULT 0
                )""");
        }

        // ── v7: portfolio_transactions.transaction_id ON DELETE CASCADE ─────────
        if (currentVersion < 7) {
            executePlain("""
                CREATE TABLE portfolio_transactions_new (
                    id             INTEGER PRIMARY KEY AUTOINCREMENT,
                    portfolio_id   INTEGER NOT NULL REFERENCES portfolio(id) ON DELETE CASCADE,
                    type           TEXT    NOT NULL,
                    quantity       REAL    NOT NULL,
                    price          REAL    NOT NULL,
                    date           TEXT    NOT NULL,
                    transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
                    notes          TEXT,
                    created_at     TEXT    DEFAULT CURRENT_TIMESTAMP
                )""");
            executePlain("INSERT INTO portfolio_transactions_new SELECT * FROM portfolio_transactions");
            executePlain("DROP TABLE portfolio_transactions");
            executePlain("ALTER TABLE portfolio_transactions_new RENAME TO portfolio_transactions");
        }

        // ── v8: portfolio_id su scheduled_transactions ──────────────────────────
        if (currentVersion < 8) {
            try { executePlain("ALTER TABLE scheduled_transactions ADD COLUMN portfolio_id INTEGER REFERENCES portfolio(id) ON DELETE SET NULL"); } catch (SQLException ignored) {}
        }

        // ── v9: transazioni escluse dalla previsione saldo ──────────────────────
        if (currentVersion < 9) {
            executePlain("""
                CREATE TABLE IF NOT EXISTS forecast_excluded (
                    transaction_id INTEGER PRIMARY KEY REFERENCES transactions(id) ON DELETE CASCADE,
                    ym             TEXT    NOT NULL,
                    amount         REAL    NOT NULL,
                    type           TEXT    NOT NULL
                )""");
        }

        // ── v10: semplifica forecast_excluded a solo transaction_id (JOIN su transactions) ──
        if (currentVersion < 10) {
            executePlain("DROP TABLE IF EXISTS forecast_excluded");
            executePlain("""
                CREATE TABLE forecast_excluded (
                    transaction_id INTEGER PRIMARY KEY REFERENCES transactions(id) ON DELETE CASCADE
                )""");
        }

        // ── v11: original_start_date su scheduled_transactions ──────────────
        if (currentVersion < 11) {
            try { executePlain("ALTER TABLE scheduled_transactions ADD COLUMN original_start_date TEXT"); } catch (SQLException ignored) {}
            // Record esistenti: original_start_date=NULL → _countSchedYearOcc usa il fallback (proiezione storica)
        }

        // ── v12: impostazioni app nel DB ─────────────────────────────────────
        if (currentVersion < 12) {
            executePlain("""
                CREATE TABLE IF NOT EXISTS app_settings (
                    key   TEXT PRIMARY KEY,
                    value TEXT NOT NULL DEFAULT ''
                )""");
        }

        // ── v13: expense_nature su categories ───────────────────────────────
        if (currentVersion < 13) {
            try { executePlain("ALTER TABLE categories ADD COLUMN expense_nature TEXT"); } catch (SQLException ignored) {}
        }

        // ── v14: commission column su portfolio_transactions + backfill ─────
        if (currentVersion < 14) {
            try { executePlain("ALTER TABLE portfolio_transactions ADD COLUMN commission REAL DEFAULT 0"); } catch (SQLException ignored) {}
            // Backfill commissioni di acquisto da notes "comm. X.XX"
            var buyRows = queryList("SELECT id, notes FROM portfolio_transactions WHERE type='buy' AND notes LIKE 'comm.%'");
            for (var b : buyRows) {
                String notes = (String) b.get("notes");
                try {
                    String[] parts = notes.substring(5).trim().split("\\s+");
                    double comm = Double.parseDouble(parts[0].replace(",", "."));
                    execute("UPDATE portfolio_transactions SET commission=? WHERE id=?",
                            comm, ((Number) b.get("id")).longValue());
                } catch (Exception ignored) {}
            }
            // Commissioni di vendita: salvate come expense rows con notes='Commissione'
            // (price contiene già l'importo); copiamo in commission per coerenza
            executePlain("UPDATE portfolio_transactions SET commission=price WHERE type='expense' AND notes='Commissione' AND commission=0");
            // NOTA: total_commissions NON viene ricalcolato. I valori esistenti potrebbero includere
            // commissioni di posizioni importate via "Carica esistente" (che non creano pt rows),
            // ricalcolare le perderebbe.
        }

        // ── v15: normalizza prezzi bond a forma percentuale (99.5 = 99.5%) ─
        // Convenzione storica mista: alcuni bond avevano avg_price/current_price/pt.price
        // salvati in forma decimale (0.995 = 99.5%) incompatibili con buyStock/scraper online
        // che usano forma percentuale. Riconosciamo i decimali (< 5) e li moltiplichiamo per 100.
        if (currentVersion < 15) {
            // Posizioni bond con prezzi in forma decimale (es. 0.9394 → 93.94)
            executePlain("UPDATE portfolio SET avg_price = avg_price * 100 WHERE asset_type='bond' AND avg_price > 0 AND avg_price < 5");
            executePlain("UPDATE portfolio SET current_price = current_price * 100 WHERE asset_type='bond' AND current_price > 0 AND current_price < 5");
            // Transazioni buy/sell di posizioni bond (price column conserva il prezzo in % al momento dell'operazione)
            executePlain("""
                UPDATE portfolio_transactions
                SET price = price * 100
                WHERE type IN ('buy','sell')
                  AND price > 0 AND price < 5
                  AND portfolio_id IN (SELECT id FROM portfolio WHERE asset_type='bond')
            """);
        }

        // ── v16: tabella notes (note libere con formattazione + tag + colore) ─
        if (currentVersion < 16) {
            executePlain("""
                CREATE TABLE IF NOT EXISTS notes (
                    id         INTEGER PRIMARY KEY AUTOINCREMENT,
                    title      TEXT    NOT NULL DEFAULT '',
                    content    TEXT    NOT NULL DEFAULT '',
                    color      TEXT    DEFAULT '',
                    pinned     INTEGER DEFAULT 0,
                    sort_order INTEGER DEFAULT 0,
                    created_at TEXT    DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT    DEFAULT CURRENT_TIMESTAMP
                )
            """);
            executePlain("""
                CREATE TABLE IF NOT EXISTS note_tags (
                    note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
                    tag_id  INTEGER NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
                    PRIMARY KEY (note_id, tag_id)
                )
            """);
            executePlain("CREATE INDEX IF NOT EXISTS idx_note_tags_tag ON note_tags(tag_id)");
        }

        // ── v17: indici su transaction_id mancanti ─────────────────────────────
        // SQLite NON indicizza automaticamente le foreign key: senza questi indici
        // le numerose subquery correlate "WHERE ts.transaction_id=t.id" (aggregazioni
        // budget/analytics) e i GROUP BY per transaction_id facevano una scansione
        // completa delle tabelle per ogni transazione (O(N×M)).
        if (currentVersion < 17) {
            executePlain("CREATE INDEX IF NOT EXISTS idx_splits_tx  ON transaction_splits(transaction_id)");
            executePlain("CREATE INDEX IF NOT EXISTS idx_porttx_tx  ON portfolio_transactions(transaction_id)");
            executePlain("PRAGMA optimize");
        }

        // ── v18: tag di sistema RAGGRUPPATE (svecchiamento) ─────────────────────
        if (currentVersion < 18) {
            ensureSystemTags();
        }

        // Segna il DB come aggiornato all'ultima versione
        executePlain("DELETE FROM schema_version");
        executePlain("INSERT INTO schema_version(version) VALUES(" + SCHEMA_VERSION + ")");
    }

    // ─── App settings nel DB ──────────────────────────────────────────────────

    /** Legge un'impostazione dalla tabella app_settings, con valore di default. */
    public String getAppSetting(String key, String def) {
        try {
            Map<String, Object> row = queryOne("SELECT value FROM app_settings WHERE key=?", key);
            return row != null ? (String) row.get("value") : def;
        } catch (Exception e) { return def; }
    }

    /** Tutte le impostazioni applicative come mappa chiave→valore. */
    public Map<String, String> getAllAppSettings() {
        try {
            List<Map<String, Object>> rows = queryList("SELECT key, value FROM app_settings");
            Map<String, String> out = new java.util.LinkedHashMap<>();
            for (Map<String, Object> r : rows) out.put((String) r.get("key"), (String) r.get("value"));
            return out;
        } catch (Exception e) { return Map.of(); }
    }

    /** Scrive/aggiorna un'impostazione applicativa (upsert su key). */
    public void setAppSetting(String key, String value) {
        try {
            execute("INSERT INTO app_settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", key, value);
        } catch (Exception e) {
            System.err.println("Database.setAppSetting: " + e.getMessage());
        }
    }

    /** Garantisce l'esistenza dei tag di sistema (Da Telefono, Da Budget, Investimenti). */
    private void ensureSystemTags() throws SQLException {
        // {system_key, default_name, default_color}
        String[][] sys = {
            {"phone",      "Da Telefono", "#58a6ff"},
            {"budget",     "Da Budget",   "#d29922"},
            {"investment", "Investimenti","#3fb950"},
            {"archived",   "RAGGRUPPATE", "#8b949e"}
        };
        for (String[] t : sys) {
            // Crea se non esiste ancora un tag con questa system_key
            executePlain("INSERT OR IGNORE INTO tags(name,color,is_system,system_key) VALUES('" + t[1] + "','" + t[2] + "',1,'" + t[0] + "')");
            // Per tag già esistenti (es. creati prima della v3): imposta system_key e is_system se il nome corrisponde
            executePlain("UPDATE tags SET is_system=1, system_key='" + t[0] + "' WHERE name='" + t[1] + "' AND (system_key IS NULL OR system_key='')");
        }
    }

    /** ID del tag di sistema con la system_key data (null se assente). */
    private Integer getSystemTagIdByKey(String key) {
        try {
            Map<String, Object> row = queryOne("SELECT id FROM tags WHERE system_key=?", key);
            return row != null ? ((Number) row.get("id")).intValue() : null;
        } catch (Exception e) { return null; }
    }

    /** Su DB nuovo, popola le categorie di default (entrate/uscite); su DB esistente
     *  assicura solo la categoria speciale Trasferimento. */
    private void seedDefaultData() throws SQLException {
        Map<String, Object> cnt = queryOne("SELECT COUNT(*) as c FROM categories");
        if (cnt == null || ((Number) cnt.get("c")).intValue() > 0) {
            // DB già esistente: assicura solo la categoria Trasferimento speciale
            ensureTransferCategory();
            return;
        }

        String[][] expense = {
            {"Alimentari","🛒","#3fb950"}, {"Casa & Utenze","🏠","#58a6ff"},
            {"Trasporti","🚗","#d29922"}, {"Salute","💊","#f85149"},
            {"Ristoranti","🍽️","#a371f7"}, {"Shopping","👕","#f0883e"},
            {"Svago & Sport","🎭","#00d4aa"}, {"Istruzione","📚","#58a6ff"},
            {"Viaggi","✈️","#d29922"}, {"Abbonamenti","📱","#a371f7"},
            {"Assicurazioni","🛡️","#8b949e"}, {"Altro","📦","#6e7681"}
        };
        String[][] income = {
            {"Stipendio","💼","#3fb950"}, {"Freelance","💻","#58a6ff"},
            {"Investimenti","📈","#d29922"}, {"Rimborsi","↩️","#00d4aa"},
            {"Affitti","🏘️","#a371f7"}, {"Altro","💰","#6e7681"}
        };

        for (String[] c : expense)
            execute("INSERT INTO categories(name,type,icon,color,is_default) VALUES(?,?,?,?,1)",
                    c[0], "expense", c[1], c[2]);
        for (String[] c : income)
            execute("INSERT INTO categories(name,type,icon,color,is_default) VALUES(?,?,?,?,1)",
                    c[0], "income", c[1], c[2]);
        ensureTransferCategory();
    }

    /** La categoria Trasferimento è speciale: type='transfer', non cancellabile dall'utente. */
    private void ensureTransferCategory() throws SQLException {
        Map<String, Object> existing = queryOne(
                "SELECT id FROM categories WHERE type='transfer' LIMIT 1");
        if (existing == null)
            execute("INSERT INTO categories(name,type,icon,color,is_default) VALUES(?,?,?,?,1)",
                    "Trasferimento", "transfer", "🔁", "#8b949e");
    }

    /** ID della prima categoria con il nome dato (o null se assente). Usato dal seed di esempio. */
    private Integer catIdByName(String name) throws SQLException {
        Map<String, Object> r = queryOne("SELECT id FROM categories WHERE name=? ORDER BY id LIMIT 1", name);
        return r != null ? ((Number) r.get("id")).intValue() : null;
    }

    /** Crea una sottocategoria sotto parentId (eredita il tipo dal parent) e ne ritorna l'id. */
    private int seedChild(int parentId, String type, String name, String icon, String color) throws SQLException {
        return (int) execute("INSERT INTO categories(name,type,icon,color,parent_id) VALUES(?,?,?,?,?)",
                name, type, icon, color, parentId);
    }

    /** Inserisce una pianificata di esempio (start_date=oggi, attiva). */
    private void seedSched(String desc, String type, Integer catId, double amount, String freq,
                           long accId, String today) throws SQLException {
        execute("""
            INSERT INTO scheduled_transactions
                (description,amount,type,category_id,account_id,to_account_id,
                 frequency,start_date,end_date,is_active,color,reconciled,portfolio_id,original_start_date)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, desc, r2(amount), type, catId, (int) accId, null, freq, today, null, 1, null, 1, null, today);
    }

    /** Imposta un budget master mensile di esempio per una categoria (no-op se catId null). */
    private void seedBudget(Integer catId, int year, double amount) throws SQLException {
        if (catId == null) return;
        execute("""
            INSERT INTO budget_config(category_id, year, mode, master_amount) VALUES(?,?,?,?)
            ON CONFLICT(category_id, year) DO UPDATE SET mode=excluded.mode, master_amount=excluded.master_amount
        """, catId, year, "mensile", r2(amount));
    }

    /**
     * Popola un DB nuovo con dati di esempio articolati (wizard di primo avvio, opzionale):
     * 3 conti (corrente, carta di credito, contanti), alcune categorie di default arricchite con
     * sottocategorie (gerarchia), 10 pianificate ricorrenti e un budget annuale su categorie foglia.
     * Le categorie di default esistono già (seedDefaultData).
     * No-op se ci sono già conti o pianificate, per non duplicare su un DB esistente.
     */
    public Map<String, Object> seedExampleData() throws SQLException {
        Map<String, Object> accCnt = queryOne("SELECT COUNT(*) AS c FROM accounts");
        Map<String, Object> schCnt = queryOne("SELECT COUNT(*) AS c FROM scheduled_transactions");
        if ((accCnt != null && ((Number) accCnt.get("c")).intValue() > 0) ||
            (schCnt != null && ((Number) schCnt.get("c")).intValue() > 0))
            return Map.of("ok", false, "skipped", true);

        return inTx(() -> {
            String today = LocalDate.now().toString();
            int year = LocalDate.now().getYear();

            // 1) Conti: corrente (preferito), carta di credito, contanti
            long accConto = execute("INSERT INTO accounts(name,type,currency,initial_balance,color,icon,is_favorite,is_closed,sort_order) VALUES(?,?,?,?,?,?,?,?,?)",
                    "Conto Corrente", "checking", "EUR", 2500.0, "#58a6ff", "🏦", 1, 0, 1);
            long accCarta = execute("INSERT INTO accounts(name,type,currency,initial_balance,color,icon,is_favorite,is_closed,sort_order) VALUES(?,?,?,?,?,?,?,?,?)",
                    "Carta di Credito", "credit", "EUR", 0.0, "#f0883e", "💳", 0, 0, 2);
            long accCash = execute("INSERT INTO accounts(name,type,currency,initial_balance,color,icon,is_favorite,is_closed,sort_order) VALUES(?,?,?,?,?,?,?,?,?)",
                    "Contanti", "cash", "EUR", 150.0, "#3fb950", "💵", 0, 0, 3);

            // 2) Sottocategorie sotto alcune categorie di default → mostra la gerarchia parent/figlio
            Integer casa = catIdByName("Casa & Utenze"), trasp = catIdByName("Trasporti"), abb = catIdByName("Abbonamenti");
            Integer affitto = null, bollette = null, carburante = null, mezzi = null, streaming = null, internet = null;
            if (casa != null) {
                affitto  = seedChild(casa, "expense", "Affitto/Mutuo", "🔑", "#58a6ff");
                bollette = seedChild(casa, "expense", "Bollette",      "💡", "#d29922");
                           seedChild(casa, "expense", "Manutenzione",  "🔧", "#8b949e");
            }
            if (trasp != null) {
                carburante = seedChild(trasp, "expense", "Carburante",     "⛽", "#d29922");
                mezzi      = seedChild(trasp, "expense", "Mezzi pubblici", "🚌", "#58a6ff");
            }
            if (abb != null) {
                streaming = seedChild(abb, "expense", "Streaming",           "📺", "#a371f7");
                internet  = seedChild(abb, "expense", "Internet & Telefono", "🌐", "#58a6ff");
            }

            // 3) 10 pianificate ricorrenti, distribuite sui tre conti e (dove utile) sulle sottocategorie
            seedSched("Stipendio",            "income",  catIdByName("Stipendio"),                 1600, "monthly", accConto, today);
            seedSched("Affitto/Mutuo",        "expense", affitto != null ? affitto : casa,          650, "monthly", accConto, today);
            seedSched("Bollette luce/gas",    "expense", bollette,                                  110, "monthly", accConto, today);
            seedSched("Internet e telefono",  "expense", internet,                                   32, "monthly", accConto, today);
            seedSched("Netflix",              "expense", streaming,                                   13, "monthly", accCarta, today);
            seedSched("Spesa settimanale",    "expense", catIdByName("Alimentari"),                  90, "weekly",  accCarta, today);
            seedSched("Carburante",           "expense", carburante,                                  60, "monthly", accCarta, today);
            seedSched("Palestra",             "expense", catIdByName("Svago & Sport"),               40, "monthly", accConto, today);
            seedSched("Cena fuori",           "expense", catIdByName("Ristoranti"),                  45, "monthly", accCash,  today);
            seedSched("Assicurazione auto",   "expense", catIdByName("Assicurazioni"),              480, "yearly",  accConto, today);

            // 4) Budget annuale (master mensile) su categorie foglia
            seedBudget(affitto, year, 650);    seedBudget(bollette, year, 120);
            seedBudget(carburante, year, 90);  seedBudget(mezzi, year, 40);
            seedBudget(streaming, year, 15);   seedBudget(internet, year, 32);
            seedBudget(catIdByName("Alimentari"),    year, 350);
            seedBudget(catIdByName("Ristoranti"),    year, 120);
            seedBudget(catIdByName("Salute"),        year, 60);
            seedBudget(catIdByName("Svago & Sport"), year, 80);

            touchSyncMeta();
            logger.log("DATI ESEMPIO CREATI", "conti:3", "pianificate:10", "sottocategorie + budget");
            return Map.of("ok", true, "accounts", 3, "scheduled", 10);
        });
    }

    // ─── Conti ────────────────────────────────────────────────────────────────

    /** Tutti i conti con il saldo calcolato (per gli investment: valore di mercato del portafoglio). */
    public List<Map<String, Object>> getAccounts() throws SQLException {
        // Per investment account: balance = valore di mercato (bond: qty × prezzo% / 100; equity: qty × prezzo).
        // bond_nominal = somma nominale dei bond, esposto separatamente per UI che vuole mostrare il "valore a scadenza".
        return queryList("""
            SELECT a.*,
                CASE WHEN a.type = 'investment' THEN
                    COALESCE((SELECT SUM(CASE WHEN p.asset_type='bond'
                              THEN p.quantity * COALESCE(NULLIF(p.current_price,0), p.avg_price) / 100.0
                              ELSE p.quantity * COALESCE(NULLIF(p.current_price,0), p.avg_price) END)
                              FROM portfolio p WHERE p.account_id = a.id), 0)
                ELSE
                    a.initial_balance + COALESCE(SUM(CASE
                        WHEN t.type='income'   THEN  t.amount
                        WHEN t.type='expense'  THEN -t.amount
                        WHEN t.type='transfer' AND t.account_id    = a.id THEN -t.amount
                        WHEN t.type='transfer' AND t.to_account_id = a.id THEN  t.amount
                        ELSE 0 END), 0)
                END AS balance,
                CASE WHEN a.type = 'investment' THEN
                    COALESCE((SELECT SUM(CASE WHEN p.asset_type='bond' THEN p.quantity ELSE 0 END)
                              FROM portfolio p WHERE p.account_id = a.id), 0)
                ELSE 0 END AS bond_nominal
            FROM accounts a
            LEFT JOIN transactions t ON (t.account_id = a.id OR t.to_account_id = a.id) AND a.type != 'investment'
            GROUP BY a.id
            ORDER BY a.sort_order, a.created_at
        """);
    }

    /** Crea un conto (in coda all'ordinamento) e aggiorna sync_meta. */
    public Map<String, Object> addAccount(JsonObject p) throws SQLException {
        Map<String,Object> maxRow = queryOne("SELECT COALESCE(MAX(sort_order),0)+1 AS next_order FROM accounts");
        int nextOrder = ((Number) maxRow.get("next_order")).intValue();
        long id = execute("INSERT INTO accounts(name,type,currency,initial_balance,color,icon,is_favorite,is_closed,sort_order) VALUES(?,?,?,?,?,?,?,?,?)",
                str(p,"name"), str(p,"type"), str(p,"currency") != null ? str(p,"currency") : "EUR",
                dbl2(p,"initial_balance") != null ? dbl2(p,"initial_balance") : 0.0,
                str(p,"color"), str(p,"icon"),
                intVal(p,"is_favorite") != null ? intVal(p,"is_favorite") : 0, 0, nextOrder);
        touchSyncMeta();
        logger.log("CONTO AGGIUNTO", "id:" + id, "nome:" + str(p,"name"), "tipo:" + str(p,"type"),
                   "saldo_iniziale:" + DbLogger.amt(dbl2(p,"initial_balance")));
        return queryOne("SELECT * FROM accounts WHERE id=?", id);
    }

    /** Aggiorna i campi di un conto e sync_meta. */
    public Map<String, Object> updateAccount(int id, JsonObject p) throws SQLException {
        execute("UPDATE accounts SET name=?,type=?,currency=?,initial_balance=?,color=?,icon=?,is_favorite=?,is_closed=? WHERE id=?",
                str(p,"name"), str(p,"type"), str(p,"currency") != null ? str(p,"currency") : "EUR",
                dbl2(p,"initial_balance") != null ? dbl2(p,"initial_balance") : 0.0,
                str(p,"color"), str(p,"icon"),
                intVal(p,"is_favorite") != null ? intVal(p,"is_favorite") : 0,
                intVal(p,"is_closed") != null ? intVal(p,"is_closed") : 0,
                id);
        touchSyncMeta();
        logger.log("CONTO MODIFICATO", "id:" + id, "nome:" + str(p,"name"), "tipo:" + str(p,"type"),
                   "chiuso:" + intVal(p,"is_closed"));
        return queryOne("SELECT * FROM accounts WHERE id=?", id);
    }

    /** Riordina i conti (drag&drop): aggiorna sort_order da una lista {id, sort_order}. */
    public void updateAccountOrder(JsonArray items) throws SQLException {
        inTx(() -> {
            for (var el : items) {
                JsonObject obj = el.getAsJsonObject();
                execute("UPDATE accounts SET sort_order=? WHERE id=?",
                        obj.get("sort_order").getAsInt(), obj.get("id").getAsInt());
            }
            return null;
        });
    }

    /** Elimina un conto (le transazioni collegate cadono in cascata via FK). */
    public Map<String, Object> deleteAccount(int id) throws SQLException {
        Map<String, Object> old = queryOne("SELECT name FROM accounts WHERE id=?", id);
        execute("DELETE FROM accounts WHERE id=?", id);
        touchSyncMeta();
        logger.log("CONTO ELIMINATO", "id:" + id, "nome:" + DbLogger.s(old != null ? old.get("name") : null));
        return Map.of("id", id, "deleted", true);
    }

    // ─── Categorie ────────────────────────────────────────────────────────────

    /**
     * Restituisce le categorie ordinate per visualizzazione ad albero:
     * prima le categorie parent (parent_id IS NULL), poi le figlie ordinate per parent.
     * Le sottocategorie ereditano il tipo dal parent.
     */
    public List<Map<String, Object>> getCategories() throws SQLException {
        return queryList("""
            SELECT c.*,
                   p.name           AS parent_name,
                   p.type           AS parent_type,
                   p.color          AS parent_color,
                   p.expense_nature AS parent_expense_nature,
                   (SELECT COUNT(*) FROM transactions t WHERE t.category_id = c.id) AS usage_count
            FROM categories c
            LEFT JOIN categories p ON c.parent_id = p.id
            ORDER BY
                COALESCE(p.name, c.name),
                c.parent_id NULLS FIRST,
                c.name
        """);
    }

    /** Crea una categoria; le sottocategorie ereditano il tipo dal parent. */
    public Map<String, Object> addCategory(JsonObject p) throws SQLException {
        Integer parentId = intVal(p, "parent_id");
        // Le sottocategorie ereditano il tipo dal parent
        String type = str(p, "type");
        if (parentId != null) {
            Map<String, Object> parent = queryOne("SELECT type FROM categories WHERE id=?", parentId);
            if (parent != null) type = (String) parent.get("type");
        }
        long id = execute(
            "INSERT INTO categories(name,type,icon,color,parent_id,expense_nature) VALUES(?,?,?,?,?,?)",
            str(p,"name"), type, str(p,"icon"), str(p,"color"), parentId, str(p,"expense_nature"));
        logger.log("CATEGORIA AGGIUNTA", "id:" + id, "nome:" + str(p,"name"), "tipo:" + type);
        return queryOne("SELECT * FROM categories WHERE id=?", id);
    }

    /** Aggiorna una categoria (eredita il tipo dal parent); vieta di toccare Trasferimento. */
    public Map<String, Object> updateCategory(int id, JsonObject p) throws SQLException {
        Map<String, Object> existing = queryOne("SELECT * FROM categories WHERE id=?", id);
        if (existing != null && "transfer".equals(existing.get("type")))
            throw new SQLException("La categoria Trasferimento non può essere modificata");

        Integer parentId = intVal(p, "parent_id");
        String type = str(p, "type");
        if (parentId != null) {
            Map<String, Object> parent = queryOne("SELECT type FROM categories WHERE id=?", parentId);
            if (parent != null) type = (String) parent.get("type");
        }
        execute("UPDATE categories SET name=?,type=?,icon=?,color=?,parent_id=?,expense_nature=? WHERE id=?",
                str(p,"name"), type, str(p,"icon"), str(p,"color"), parentId, str(p,"expense_nature"), id);
        logger.log("CATEGORIA MODIFICATA", "id:" + id, "nome:" + str(p,"name"), "tipo:" + type);
        return queryOne("SELECT * FROM categories WHERE id=?", id);
    }

    /** Elimina una categoria (figlie in cascata); vieta di eliminare Trasferimento. */
    public Map<String, Object> deleteCategory(int id) throws SQLException {
        Map<String, Object> existing = queryOne("SELECT * FROM categories WHERE id=?", id);
        if (existing != null && "transfer".equals(existing.get("type")))
            throw new SQLException("La categoria Trasferimento non può essere eliminata");
        logger.log("CATEGORIA ELIMINATA", "id:" + id, "nome:" + DbLogger.s(existing != null ? existing.get("name") : null));
        execute("DELETE FROM categories WHERE id=?", id);
        return Map.of("id", id, "deleted", true);
    }

    /**
     * Report spese per "natura" (fissa/variabile/ecc.): aggrega le uscite nel periodo
     * sia per natura sia per categoria, unendo transazioni semplici e righe split.
     */
    public Map<String, Object> getExpenseNatureReport(JsonObject p) throws SQLException {
        String df = p.has("date_from") && !str(p,"date_from").isBlank() ? str(p,"date_from") : null;
        String dt = p.has("date_to")   && !str(p,"date_to").isBlank()   ? str(p,"date_to")   : null;

        // Filtro data per le transazioni (usato in entrambi i rami UNION)
        String dateWhere = "";
        List<Object> dp = new ArrayList<>();
        if (df != null) { dateWhere += " AND t.date >= ?"; dp.add(df); }
        if (dt != null) { dateWhere += " AND t.date <= ?"; dp.add(dt); }

        // Ogni UNION ha lo stesso filtro data → params duplicati
        List<Object> p2 = new ArrayList<>(dp); p2.addAll(dp);

        String byNatureSQL =
            "SELECT nature, SUM(total) AS total, SUM(tx_count) AS tx_count FROM (" +
            // ramo 1: transazioni normali (senza split)
            "SELECT COALESCE(c.expense_nature,pc.expense_nature,'') AS nature," +
            " SUM(t.amount) AS total, COUNT(*) AS tx_count" +
            " FROM transactions t LEFT JOIN categories c ON t.category_id=c.id" +
            " LEFT JOIN categories pc ON c.parent_id=pc.id" +
            " WHERE t.type='expense' AND NOT EXISTS(SELECT 1 FROM transaction_splits ts WHERE ts.transaction_id=t.id)" +
            dateWhere +
            " GROUP BY COALESCE(c.expense_nature,pc.expense_nature,'')" +
            " UNION ALL " +
            // ramo 2: righe split
            "SELECT COALESCE(sc.expense_nature,spc.expense_nature,'') AS nature," +
            " SUM(ts.amount) AS total, COUNT(DISTINCT t.id) AS tx_count" +
            " FROM transactions t JOIN transaction_splits ts ON ts.transaction_id=t.id" +
            " LEFT JOIN categories sc ON ts.category_id=sc.id" +
            " LEFT JOIN categories spc ON sc.parent_id=spc.id" +
            " WHERE t.type='expense'" + dateWhere +
            " GROUP BY COALESCE(sc.expense_nature,spc.expense_nature,'')" +
            ") GROUP BY nature ORDER BY total DESC";

        String byCatSQL =
            "SELECT nature, cat_id, cat_name, parent_name, color, icon, SUM(total) AS total, SUM(tx_count) AS tx_count FROM (" +
            // ramo 1: transazioni normali
            "SELECT COALESCE(c.expense_nature,pc.expense_nature,'') AS nature," +
            " c.id AS cat_id, COALESCE(c.name,'—') AS cat_name, pc.name AS parent_name," +
            " COALESCE(c.color,'#888') AS color, COALESCE(c.icon,'📁') AS icon," +
            " SUM(t.amount) AS total, COUNT(*) AS tx_count" +
            " FROM transactions t LEFT JOIN categories c ON t.category_id=c.id" +
            " LEFT JOIN categories pc ON c.parent_id=pc.id" +
            " WHERE t.type='expense' AND NOT EXISTS(SELECT 1 FROM transaction_splits ts WHERE ts.transaction_id=t.id)" +
            dateWhere +
            " GROUP BY c.id, COALESCE(c.expense_nature,pc.expense_nature,'')" +
            " UNION ALL " +
            // ramo 2: righe split
            "SELECT COALESCE(sc.expense_nature,spc.expense_nature,'') AS nature," +
            " sc.id AS cat_id, COALESCE(sc.name,'—') AS cat_name, spc.name AS parent_name," +
            " COALESCE(sc.color,'#888') AS color, COALESCE(sc.icon,'📁') AS icon," +
            " SUM(ts.amount) AS total, COUNT(DISTINCT t.id) AS tx_count" +
            " FROM transactions t JOIN transaction_splits ts ON ts.transaction_id=t.id" +
            " LEFT JOIN categories sc ON ts.category_id=sc.id" +
            " LEFT JOIN categories spc ON sc.parent_id=spc.id" +
            " WHERE t.type='expense'" + dateWhere +
            " GROUP BY sc.id, COALESCE(sc.expense_nature,spc.expense_nature,'')" +
            ") GROUP BY cat_id, nature ORDER BY nature, total DESC";

        Map<String, Object> result = new java.util.HashMap<>();
        result.put("by_nature",   queryList(byNatureSQL, p2.toArray()));
        result.put("by_category", queryList(byCatSQL,    p2.toArray()));
        return result;
    }

    /** Conta transazioni, budget e figli associati a questa categoria (e ai suoi figli). */
    public Map<String, Object> getCategoryUsage(int id) throws SQLException {
        var tx    = queryOne("SELECT COUNT(*) AS n FROM transactions WHERE category_id=?", id);
        var bg    = queryOne("SELECT COUNT(*) AS n FROM budgets WHERE category_id=?", id);
        var ch    = queryOne("SELECT COUNT(*) AS n FROM categories WHERE parent_id=?", id);
        var chTxR = queryOne("SELECT COUNT(*) AS n FROM transactions WHERE category_id IN (SELECT id FROM categories WHERE parent_id=?)", id);
        return Map.of(
            "tx_count",       tx    != null ? ((Number) tx.get("n")).longValue()    : 0,
            "budget_count",   bg    != null ? ((Number) bg.get("n")).longValue()    : 0,
            "child_count",    ch    != null ? ((Number) ch.get("n")).longValue()    : 0,
            "child_tx_count", chTxR != null ? ((Number) chTxR.get("n")).longValue() : 0
        );
    }

    /** Sposta transazioni (e quelle dei figli) su toId, poi elimina la categoria. */
    public void reassignCategory(int fromId, int toId) throws SQLException {
        inTx(() -> {
            Map<String, Object> from = queryOne("SELECT name FROM categories WHERE id=?", fromId);
            Map<String, Object> to   = queryOne("SELECT name FROM categories WHERE id=?", toId);
            execute("UPDATE transactions SET category_id=? WHERE category_id=?", toId, fromId);
            execute("UPDATE transactions SET category_id=? WHERE category_id IN (SELECT id FROM categories WHERE parent_id=?)", toId, fromId);
            execute("DELETE FROM categories WHERE id=?", fromId);
            logger.log("CATEGORIA RIASSEGNATA", "da:" + DbLogger.s(from != null ? from.get("name") : fromId),
                       "a:" + DbLogger.s(to != null ? to.get("name") : toId));
            return null;
        });
    }

    // ─── Transazioni ──────────────────────────────────────────────────────────

    /**
     * Elenco transazioni con filtri dinamici (periodo, tipo, conto/i, categoria/e,
     * tag, ricerca testo, allegati, ecc.) costruiti via WHERE incrementale + parametri
     * bindati. Gestisce anche le righe split per il filtro/somma per categoria.
     */
    public List<Map<String, Object>> getTransactions(JsonObject f) throws SQLException {
        // Pre-calcola il filtro categoria: serve sia nella SELECT (filtered_split_amount) che nella WHERE
        // Supporta sia category_id singolo sia category_ids array (padre + figli)
        List<Integer> filterCatIds = new ArrayList<>();
        if (f.has("category_ids") && f.get("category_ids").isJsonArray()) {
            f.getAsJsonArray("category_ids").forEach(e -> filterCatIds.add(e.getAsInt()));
        } else if (f.has("category_id") && !f.get("category_id").isJsonNull()) {
            filterCatIds.add(f.get("category_id").getAsInt());
        }
        Integer filterCatId = filterCatIds.isEmpty() ? null : filterCatIds.get(0);
        String catInClause = filterCatIds.isEmpty() ? "" :
                filterCatIds.stream().map(String::valueOf).collect(java.util.stream.Collectors.joining(","));

        // Quando si filtra per categoria, aggiunge importo/nome/icona dello split corrispondente
        String filteredSplitCol = !filterCatIds.isEmpty()
                ? ",\n                (SELECT SUM(ts.amount) FROM transaction_splits ts" +
                  " WHERE ts.transaction_id=t.id AND ts.category_id IN (" + catInClause + ")" +
                  ") AS filtered_split_amount" +
                  ",\n                (SELECT sc.name FROM transaction_splits ts" +
                  " JOIN categories sc ON sc.id=ts.category_id" +
                  " WHERE ts.transaction_id=t.id AND ts.category_id IN (" + catInClause + ") LIMIT 1) AS filtered_split_category_name" +
                  ",\n                (SELECT sc.icon FROM transaction_splits ts" +
                  " JOIN categories sc ON sc.id=ts.category_id" +
                  " WHERE ts.transaction_id=t.id AND ts.category_id IN (" + catInClause + ") LIMIT 1) AS filtered_split_category_icon" +
                  ",\n                (SELECT ts.category_id FROM transaction_splits ts" +
                  " WHERE ts.transaction_id=t.id AND ts.category_id IN (" + catInClause + ") LIMIT 1) AS filtered_split_category_id"
                : "";

        StringBuilder sql = new StringBuilder(
            "SELECT t.*,\n" +
            "                c.name  AS category_name, c.icon AS category_icon, c.color AS category_color,\n" +
            "                pc.name AS parent_category_name,\n" +
            "                a.name  AS account_name,  a.color AS account_color,\n" +
            "                ta.name AS to_account_name,\n" +
            "                GROUP_CONCAT(CASE WHEN tg.id IS NOT NULL\n" +
            "                    THEN tg.id || '\u00A7' || tg.name || '\u00A7' || tg.color END, '||') AS tags_concat,\n" +
            "                sp.split_count AS split_count,\n" +
            "                sp.splits_summary AS splits_summary,\n" +
            "                pt.portfolio_id AS portfolio_id" +
            filteredSplitCol + "\n" +
            "            FROM transactions t\n" +
            "            LEFT JOIN categories c  ON t.category_id    = c.id\n" +
            "            LEFT JOIN categories pc ON c.parent_id      = pc.id\n" +
            "            LEFT JOIN accounts   a  ON t.account_id     = a.id\n" +
            "            LEFT JOIN accounts   ta ON t.to_account_id  = ta.id\n" +
            "            LEFT JOIN transaction_tags tt ON tt.transaction_id = t.id\n" +
            "            LEFT JOIN tags tg ON tg.id = tt.tag_id\n" +
            "            LEFT JOIN (\n" +
            "                SELECT ts.transaction_id, COUNT(*) AS split_count,\n" +
            "                       GROUP_CONCAT(COALESCE(sc.icon,'') || ' ' || COALESCE(sc.name,'?') || ' (' || PRINTF('%.2f', ts.amount) || '\u20ac)', ' \u00b7 ') AS splits_summary\n" +
            "                FROM transaction_splits ts LEFT JOIN categories sc ON sc.id = ts.category_id\n" +
            "                GROUP BY ts.transaction_id\n" +
            "            ) sp ON sp.transaction_id = t.id\n" +
            "            LEFT JOIN (\n" +
            "                SELECT transaction_id, MIN(portfolio_id) AS portfolio_id\n" +
            "                FROM portfolio_transactions GROUP BY transaction_id\n" +
            "            ) pt ON pt.transaction_id = t.id\n" +
            "            WHERE 1=1\n");
        List<Object> params = new ArrayList<>();

        if (f.has("date_from") && !str(f,"date_from").isBlank()) {
            sql.append(" AND t.date >= ?"); params.add(str(f,"date_from"));
        }
        if (f.has("date_to") && !str(f,"date_to").isBlank()) {
            sql.append(" AND t.date <= ?"); params.add(str(f,"date_to"));
        }
        if (!f.has("date_from") && !f.has("date_to")) {
            if (f.has("month") && f.has("year")) {
                sql.append(" AND strftime('%m',t.date)=? AND strftime('%Y',t.date)=?");
                params.add(String.format("%02d", f.get("month").getAsInt()));
                params.add(String.valueOf(f.get("year").getAsInt()));
            } else if (f.has("year")) {
                sql.append(" AND strftime('%Y',t.date)=?");
                params.add(String.valueOf(f.get("year").getAsInt()));
            }
        }
        if (f.has("type") && !f.get("type").getAsString().isBlank()) {
            sql.append(" AND t.type=?"); params.add(str(f,"type"));
        }
        if (f.has("account_ids") && f.get("account_ids").isJsonArray()
                && f.getAsJsonArray("account_ids").size() > 0) {
            com.google.gson.JsonArray ids = f.getAsJsonArray("account_ids");
            String placeholders = "?,".repeat(ids.size()).replaceAll(",$", "");
            sql.append(" AND (t.account_id IN (").append(placeholders)
               .append(") OR t.to_account_id IN (").append(placeholders).append("))");
            ids.forEach(e -> params.add(e.getAsInt()));
            ids.forEach(e -> params.add(e.getAsInt()));
        } else if (f.has("account_id") && !f.get("account_id").isJsonNull()) {
            sql.append(" AND (t.account_id=? OR t.to_account_id=?)");
            int aid = f.get("account_id").getAsInt();
            params.add(aid); params.add(aid);
        }
        if (!filterCatIds.isEmpty()) {
            sql.append(" AND (t.category_id IN (" + catInClause + ") OR t.id IN (SELECT ts.transaction_id FROM transaction_splits ts WHERE ts.category_id IN (" + catInClause + ")))");
        }
        if (f.has("tag_id") && !f.get("tag_id").isJsonNull()) {
            sql.append(" AND t.id IN (SELECT transaction_id FROM transaction_tags WHERE tag_id=?)");
            params.add(f.get("tag_id").getAsInt());
        }
        if (f.has("id") && !f.get("id").isJsonNull()) {
            sql.append(" AND t.id=?"); params.add(f.get("id").getAsLong());
        }
        if (f.has("search") && !f.get("search").getAsString().isBlank()) {
            sql.append(" AND t.description LIKE ?");
            params.add("%" + str(f,"search") + "%");
        }
        if (f.has("has_attachment") && !f.get("has_attachment").getAsString().isBlank()) {
            if ("1".equals(str(f,"has_attachment"))) {
                sql.append(" AND t.attachment_path IS NOT NULL AND t.attachment_path != ''");
            } else {
                sql.append(" AND (t.attachment_path IS NULL OR t.attachment_path = '')");
            }
        }
        if (f.has("reconciled") && !f.get("reconciled").isJsonNull()) {
            sql.append(" AND t.reconciled=?"); params.add(f.get("reconciled").getAsInt());
        }
        sql.append(" GROUP BY t.id");
        // Sort whitelistato (mai concat raw, protezione SQL injection)
        String sortCol = f.has("sort_col") && !f.get("sort_col").isJsonNull()
                         ? f.get("sort_col").getAsString() : "date";
        boolean asc = !(f.has("sort_dir") && "desc".equalsIgnoreCase(f.get("sort_dir").getAsString()))
                      && !(f.has("sort_desc") && f.get("sort_desc").getAsBoolean());
        String dir = asc ? "ASC" : "DESC";
        String orderBy = switch (sortCol) {
            case "amount"      -> "t.amount " + dir + ", t.date " + dir + ", t.id " + dir;
            case "type"        -> "t.type " + dir + ", t.date " + dir + ", t.id " + dir;
            case "category"    -> "LOWER(COALESCE(c.name,'')) " + dir + ", t.date " + dir + ", t.id " + dir;
            case "account"     -> "LOWER(COALESCE(a.name,'')) " + dir + ", t.date " + dir + ", t.id " + dir;
            case "description" -> "LOWER(COALESCE(t.description,'')) " + dir + ", t.date " + dir + ", t.id " + dir;
            default            -> "t.date " + dir + ", t.id " + dir;  // date
        };
        sql.append(" ORDER BY ").append(orderBy);
        if (f.has("limit")) { sql.append(" LIMIT ?"); params.add(f.get("limit").getAsInt()); }

        List<Map<String, Object>> rows = parseTags(queryList(sql.toString(), params.toArray()));

        // Calcola saldo progressivo quando si filtra per un singolo conto (non investment)
        if (f.has("account_id") && !f.get("account_id").isJsonNull()
                && !f.get("account_id").getAsString().isBlank()) {
            int accountId = f.get("account_id").getAsInt();
            Map<String, Object> acc = queryOne("SELECT initial_balance, type FROM accounts WHERE id=?", accountId);
            if ("investment".equals(acc != null ? acc.get("type") : null)) return rows; // saldo progressivo non applicabile
            double init = acc != null && acc.get("initial_balance") != null
                    ? ((Number) acc.get("initial_balance")).doubleValue() : 0.0;
            // Window function SQLite: saldo cumulativo per ogni tx del conto, calcolato lato DB
            List<Map<String, Object>> balRows = queryList("""
                SELECT id, ? + SUM(CASE
                    WHEN type='income'                       THEN  amount
                    WHEN type='expense'                      THEN -amount
                    WHEN type='transfer' AND account_id=?    THEN -amount
                    WHEN type='transfer' AND to_account_id=? THEN  amount
                    ELSE 0 END) OVER (ORDER BY date, id) AS balance
                FROM transactions
                WHERE account_id=? OR to_account_id=?
            """, init, accountId, accountId, accountId, accountId);
            Map<Long, Double> balMap = new java.util.HashMap<>(balRows.size());
            for (Map<String, Object> r : balRows) {
                balMap.put(((Number) r.get("id")).longValue(),
                           ((Number) r.get("balance")).doubleValue());
            }
            for (Map<String, Object> row : rows) {
                long id = ((Number) row.get("id")).longValue();
                row.put("balance", balMap.getOrDefault(id, null));
            }
        }

        return rows;
    }

    /** Inserisce una transazione con eventuali tag e split, in un'unica transazione SQL. */
    public Map<String, Object> addTransaction(JsonObject p) throws SQLException {
        return inTx(() -> {
            int reconciled = p.has("reconciled") && !p.get("reconciled").isJsonNull()
                    ? p.get("reconciled").getAsInt() : 0;
            long id = execute("""
                INSERT INTO transactions(date,amount,type,category_id,account_id,to_account_id,description,color,reconciled)
                VALUES(?,?,?,?,?,?,?,?,?)
            """, str(p,"date"), dbl2(p,"amount"), str(p,"type"),
                    intVal(p,"category_id"), p.get("account_id").getAsInt(),
                    intVal(p,"to_account_id"),
                    str(p,"description") != null ? str(p,"description") : "",
                    str(p,"color"), reconciled);
            saveTags(id, p);
            saveSplits(id, p);
            touchSyncMeta();
            Map<String, Object> tx = getTransactionById(id);
            logger.log("TRANSAZIONE AGGIUNTA",
                "id:" + id,
                "data:" + str(p,"date"),
                "tipo:" + str(p,"type"),
                "importo:" + DbLogger.amt(dbl2(p,"amount")),
                "conto:" + DbLogger.s(tx != null ? tx.get("account_name") : null),
                "categoria:" + DbLogger.s(tx != null ? tx.get("category_name") : null),
                "descrizione:" + DbLogger.s(str(p,"description")));
            return tx;
        });
    }

    /** Aggiorna una transazione (tag, split, e prezzo dello storico portfolio se collegato). */
    public Map<String, Object> updateTransaction(int id, JsonObject p) throws SQLException {
        return inTx(() -> {
            int reconciled = p.has("reconciled") && !p.get("reconciled").isJsonNull()
                    ? p.get("reconciled").getAsInt() : 0;
            execute("""
                UPDATE transactions SET date=?,amount=?,type=?,category_id=?,account_id=?,
                    to_account_id=?,description=?,color=?,reconciled=? WHERE id=?
            """, str(p,"date"), dbl2(p,"amount"), str(p,"type"),
                    intVal(p,"category_id"), p.get("account_id").getAsInt(),
                    intVal(p,"to_account_id"),
                    str(p,"description") != null ? str(p,"description") : "",
                    str(p,"color"), reconciled, id);
            saveTags(id, p);
            saveSplits(id, p);
            // Aggiorna il prezzo nello storico portfolio se collegato (cedola/spesa)
            execute("UPDATE portfolio_transactions SET price=? WHERE transaction_id=? AND type IN ('coupon','expense')",
                    dbl2(p,"amount"), id);
            touchSyncMeta();
            Map<String, Object> tx = getTransactionById(id);
            logger.log("TRANSAZIONE MODIFICATA",
                "id:" + id,
                "data:" + str(p,"date"),
                "tipo:" + str(p,"type"),
                "importo:" + DbLogger.amt(dbl2(p,"amount")),
                "conto:" + DbLogger.s(tx != null ? tx.get("account_name") : null),
                "categoria:" + DbLogger.s(tx != null ? tx.get("category_name") : null),
                "descrizione:" + DbLogger.s(str(p,"description")));
            return tx;
        });
    }

    /** Imposta lo stato di conciliazione di una transazione. */
    public Map<String, Object> updateTransactionReconciled(int id, boolean reconciled) throws SQLException {
        execute("UPDATE transactions SET reconciled=? WHERE id=?", reconciled ? 1 : 0, id);
        touchSyncMeta();
        logger.log("CONCILIAZIONE", "id:" + id, "stato:" + (reconciled ? "conciliata" : "non conciliata"));
        return Map.of("ok", true);
    }

    /** Saldo totale e saldo conciliato di un conto (per gli investment: valore di mercato). */
    public Map<String, Object> getAccountSummary(int accountId) throws SQLException {
        Map<String, Object> acc = queryOne("SELECT initial_balance, type FROM accounts WHERE id=?", accountId);
        // Per i conti investment il saldo è il valore di mercato del portfolio, non le transazioni
        if (acc != null && "investment".equals(acc.get("type"))) {
            Map<String, Object> portVal = queryOne("""
                SELECT COALESCE(SUM(CASE WHEN p.asset_type='bond'
                                   THEN p.quantity * COALESCE(NULLIF(p.current_price,0), p.avg_price) / 100.0
                                   ELSE p.quantity * COALESCE(NULLIF(p.current_price,0), p.avg_price) END), 0) AS val
                FROM portfolio p WHERE p.account_id=?
            """, accountId);
            double val = portVal != null ? ((Number) portVal.get("val")).doubleValue() : 0.0;
            return Map.of("balance", val, "reconciled_balance", val);
        }
        double init = acc != null && acc.get("initial_balance") != null
                ? ((Number) acc.get("initial_balance")).doubleValue() : 0.0;
        Map<String, Object> tot = queryOne("""
            SELECT COALESCE(SUM(CASE
                WHEN type='income'                             THEN  amount
                WHEN type='expense'                            THEN -amount
                WHEN type='transfer' AND account_id=?          THEN -amount
                WHEN type='transfer' AND to_account_id=?       THEN  amount
                ELSE 0 END), 0) AS delta
            FROM transactions WHERE account_id=? OR to_account_id=?
        """, accountId, accountId, accountId, accountId);
        Map<String, Object> rec = queryOne("""
            SELECT COALESCE(SUM(CASE
                WHEN type='income'                             THEN  amount
                WHEN type='expense'                            THEN -amount
                WHEN type='transfer' AND account_id=?          THEN -amount
                WHEN type='transfer' AND to_account_id=?       THEN  amount
                ELSE 0 END), 0) AS delta
            FROM transactions WHERE (account_id=? OR to_account_id=?) AND reconciled=1
        """, accountId, accountId, accountId, accountId);
        double balance = init + ((Number) tot.get("delta")).doubleValue();
        double reconciledBalance = init + ((Number) rec.get("delta")).doubleValue();
        return Map.of("balance", balance, "reconciled_balance", reconciledBalance);
    }

    /** Elimina una transazione (tag e split cadono in cascata via FK). */
    public Map<String, Object> deleteTransaction(int id) throws SQLException {
        Map<String, Object> tx = queryOne(
            "SELECT t.date, t.amount, t.type, t.description, a.name AS account_name " +
            "FROM transactions t LEFT JOIN accounts a ON a.id=t.account_id WHERE t.id=?", id);
        execute("DELETE FROM transactions WHERE id=?", id);
        touchSyncMeta();
        logger.log("TRANSAZIONE ELIMINATA",
            "id:" + id,
            "data:" + DbLogger.s(tx != null ? tx.get("date") : null),
            "tipo:" + DbLogger.s(tx != null ? tx.get("type") : null),
            "importo:" + DbLogger.amt(tx != null ? tx.get("amount") : null),
            "conto:" + DbLogger.s(tx != null ? tx.get("account_name") : null),
            "descrizione:" + DbLogger.s(tx != null ? tx.get("description") : null));
        return Map.of("id", id, "deleted", true);
    }

    // ─── Tag ──────────────────────────────────────────────────────────────────

    /** Tutti i tag ordinati per nome. */
    public List<Map<String, Object>> getTags() throws SQLException {
        return queryList("SELECT * FROM tags ORDER BY name");
    }

    /** Crea un tag utente. */
    public Map<String, Object> addTag(JsonObject p) throws SQLException {
        long id = execute("INSERT INTO tags(name,color) VALUES(?,?)",
                str(p,"name"), str(p,"color") != null ? str(p,"color") : "#58a6ff");
        logger.log("TAG AGGIUNTO", "id:" + id, "nome:" + str(p,"name"));
        return queryOne("SELECT * FROM tags WHERE id=?", id);
    }

    /** Aggiorna nome/colore di un tag. */
    public Map<String, Object> updateTag(int id, JsonObject p) throws SQLException {
        execute("UPDATE tags SET name=?,color=? WHERE id=?", str(p,"name"), str(p,"color"), id);
        logger.log("TAG MODIFICATO", "id:" + id, "nome:" + str(p,"name"));
        return queryOne("SELECT * FROM tags WHERE id=?", id);
    }

    /** Elimina un tag utente; i tag di sistema non sono eliminabili. */
    public Map<String, Object> deleteTag(int id) throws SQLException {
        Map<String, Object> old = queryOne("SELECT name, is_system FROM tags WHERE id=?", id);
        if (old != null && Integer.valueOf(1).equals(old.get("is_system")))
            throw new SQLException("Il tag '" + old.get("name") + "' è di sistema e non può essere eliminato.");
        execute("DELETE FROM tags WHERE id=?", id);
        logger.log("TAG ELIMINATO", "id:" + id, "nome:" + DbLogger.s(old != null ? old.get("name") : null));
        return Map.of("id", id, "deleted", true);
    }

    // ─── Note ─────────────────────────────────────────────────────────────────

    /** Restituisce tutte le note con tag_ids aggregati. Ordine: pinned DESC, updated_at DESC. */
    public List<Map<String, Object>> getNotes() throws SQLException {
        List<Map<String, Object>> rows = queryList("""
            SELECT n.*, GROUP_CONCAT(nt.tag_id) AS tag_ids_csv
            FROM notes n
            LEFT JOIN note_tags nt ON nt.note_id = n.id
            GROUP BY n.id
            ORDER BY n.pinned DESC, n.sort_order, n.updated_at DESC
        """);
        for (Map<String, Object> r : rows) {
            String csv = (String) r.get("tag_ids_csv");
            List<Integer> ids = new ArrayList<>();
            if (csv != null && !csv.isBlank())
                for (String s : csv.split(",")) ids.add(Integer.parseInt(s.trim()));
            r.put("tag_ids", ids);
            r.remove("tag_ids_csv");
        }
        return rows;
    }

    /** Una singola nota con la lista dei suoi tag_ids. */
    public Map<String, Object> getNote(int id) throws SQLException {
        Map<String, Object> n = queryOne("SELECT * FROM notes WHERE id=?", id);
        if (n == null) return null;
        List<Map<String, Object>> tagRows = queryList("SELECT tag_id FROM note_tags WHERE note_id=?", id);
        List<Integer> ids = new ArrayList<>();
        for (Map<String, Object> t : tagRows) ids.add(((Number) t.get("tag_id")).intValue());
        n.put("tag_ids", ids);
        return n;
    }

    /** Crea o aggiorna una nota (in base alla presenza di id) e ne sostituisce i tag. */
    public Map<String, Object> saveNote(JsonObject p) throws SQLException {
        Integer id  = intVal(p, "id");
        String title   = str(p, "title")   != null ? str(p, "title")   : "";
        String content = str(p, "content") != null ? str(p, "content") : "";
        String color   = str(p, "color")   != null ? str(p, "color")   : "";
        int pinned     = intVal(p, "pinned") != null ? intVal(p, "pinned") : 0;
        String now = java.time.Instant.now().toString();
        long newId;
        if (id != null) {
            execute("UPDATE notes SET title=?, content=?, color=?, pinned=?, updated_at=? WHERE id=?",
                    title, content, color, pinned, now, id);
            newId = id;
            logger.log("NOTA MODIFICATA", "id:" + id, "titolo:" + DbLogger.s(title));
        } else {
            newId = execute("INSERT INTO notes(title,content,color,pinned,updated_at) VALUES(?,?,?,?,?)",
                    title, content, color, pinned, now);
            logger.log("NOTA AGGIUNTA", "id:" + newId, "titolo:" + DbLogger.s(title));
        }
        // Tag (sostituisce tutti)
        if (p.has("tag_ids") && p.get("tag_ids").isJsonArray()) {
            execute("DELETE FROM note_tags WHERE note_id=?", newId);
            for (var el : p.get("tag_ids").getAsJsonArray())
                execute("INSERT OR IGNORE INTO note_tags(note_id,tag_id) VALUES(?,?)", newId, el.getAsInt());
        }
        touchSyncMeta();
        return getNote((int) newId);
    }

    /** Elimina una nota (tag collegati in cascata via FK). */
    public Map<String, Object> deleteNote(int id) throws SQLException {
        Map<String, Object> old = queryOne("SELECT title FROM notes WHERE id=?", id);
        execute("DELETE FROM notes WHERE id=?", id);
        touchSyncMeta();
        logger.log("NOTA ELIMINATA", "id:" + id, "titolo:" + DbLogger.s(old != null ? old.get("title") : null));
        return Map.of("id", id, "deleted", true);
    }

    /** Fissa/sfissa una nota in cima all'elenco. */
    public Map<String, Object> setNotePinned(int id, boolean pinned) throws SQLException {
        execute("UPDATE notes SET pinned=? WHERE id=?", pinned ? 1 : 0, id);
        touchSyncMeta();
        return getNote(id);
    }

    /** Imposta il colore di sfondo di una nota. */
    public Map<String, Object> setNoteColor(int id, String color) throws SQLException {
        execute("UPDATE notes SET color=? WHERE id=?", color != null ? color : "", id);
        touchSyncMeta();
        return getNote(id);
    }

    // ─── Range Preset ─────────────────────────────────────────────────────────

    /** Preset di intervalli date salvati dall'utente (per i filtri rapidi). */
    public List<Map<String, Object>> getRangePresets() throws SQLException {
        return queryList("SELECT * FROM range_presets ORDER BY sort_order, label COLLATE NOCASE");
    }

    /** Crea un preset di intervallo. */
    public Map<String, Object> addRangePreset(JsonObject p) throws SQLException {
        long id = execute("INSERT INTO range_presets(label,range_key,sort_order) VALUES(?,?,?)",
                str(p,"label"), str(p,"range_key"), intVal(p,"sort_order") != null ? intVal(p,"sort_order") : 0);
        logger.log("RANGE PRESET AGGIUNTO", "id:" + id, "chiave:" + str(p,"range_key"), "etichetta:" + str(p,"label"));
        return queryOne("SELECT * FROM range_presets WHERE id=?", id);
    }

    /** Aggiorna un preset di intervallo. */
    public Map<String, Object> updateRangePreset(int id, JsonObject p) throws SQLException {
        execute("UPDATE range_presets SET label=?,range_key=?,sort_order=? WHERE id=?",
                str(p,"label"), str(p,"range_key"), intVal(p,"sort_order") != null ? intVal(p,"sort_order") : 0, id);
        logger.log("RANGE PRESET MODIFICATO", "id:" + id, "chiave:" + str(p,"range_key"), "etichetta:" + str(p,"label"));
        return queryOne("SELECT * FROM range_presets WHERE id=?", id);
    }

    /** Elimina un preset di intervallo. */
    public Map<String, Object> deleteRangePreset(int id) throws SQLException {
        Map<String, Object> old = queryOne("SELECT label FROM range_presets WHERE id=?", id);
        execute("DELETE FROM range_presets WHERE id=?", id);
        logger.log("RANGE PRESET ELIMINATO", "id:" + id, "etichetta:" + DbLogger.s(old != null ? old.get("label") : null));
        return Map.of("id", id, "deleted", true);
    }

    // ─── Resoconti ────────────────────────────────────────────────────────────

    /** Resoconti salvati (filtri + raggruppamento + tipo grafico). */
    public List<Map<String, Object>> getReports() throws SQLException {
        return queryList("SELECT * FROM reports ORDER BY name COLLATE NOCASE");
    }

    /** Crea o aggiorna un resoconto salvato. */
    public Map<String, Object> saveReport(JsonObject p) throws SQLException {
        Integer id         = intVal(p, "id");
        String name        = str(p, "name");
        String filtersJson = p.has("filters_json") ? p.get("filters_json").getAsString() : "{}";
        String groupby     = str(p, "groupby")    != null ? str(p, "groupby")    : "none";
        String chartType   = str(p, "chart_type") != null ? str(p, "chart_type") : "none";
        long newId;
        if (id != null) {
            execute("UPDATE reports SET name=?, filters_json=?, groupby=?, chart_type=? WHERE id=?",
                    name, filtersJson, groupby, chartType, id);
            newId = id;
            logger.log("REPORT MODIFICATO", "id:" + id, "nome:" + name);
        } else {
            newId = execute(
                "INSERT INTO reports(name, filters_json, groupby, chart_type) VALUES(?,?,?,?)",
                name, filtersJson, groupby, chartType);
            logger.log("REPORT SALVATO", "id:" + newId, "nome:" + name);
        }
        return queryOne("SELECT * FROM reports WHERE id=?", newId);
    }

    /** Elimina un resoconto salvato. */
    public Map<String, Object> deleteReport(int id) throws SQLException {
        Map<String, Object> old = queryOne("SELECT name FROM reports WHERE id=?", id);
        execute("DELETE FROM reports WHERE id=?", id);
        logger.log("REPORT ELIMINATO", "id:" + id, "nome:" + DbLogger.s(old != null ? old.get("name") : null));
        return Map.of("id", id, "deleted", true);
    }

    /** Sostituisce tutti i tag di una transazione con quelli passati in p.tag_ids. */
    private void saveTags(long txId, JsonObject p) throws SQLException {
        execute("DELETE FROM transaction_tags WHERE transaction_id=?", txId);
        if (p.has("tag_ids") && p.get("tag_ids").isJsonArray()) {
            for (var el : p.get("tag_ids").getAsJsonArray()) {
                execute("INSERT OR IGNORE INTO transaction_tags(transaction_id,tag_id) VALUES(?,?)",
                        txId, el.getAsInt());
            }
        }
    }

    /** Sostituisce tutte le righe split di una transazione con quelle in p.splits. */
    private void saveSplits(long txId, JsonObject p) throws SQLException {
        execute("DELETE FROM transaction_splits WHERE transaction_id=?", txId);
        if (p.has("splits") && p.get("splits").isJsonArray()) {
            for (var el : p.get("splits").getAsJsonArray()) {
                JsonObject s = el.getAsJsonObject();
                execute("INSERT INTO transaction_splits(transaction_id,category_id,amount,description) VALUES(?,?,?,?)",
                        txId,
                        s.has("category_id") && !s.get("category_id").isJsonNull() ? s.get("category_id").getAsInt() : null,
                        r2(s.get("amount").getAsDouble()),
                        s.has("description") && !s.get("description").isJsonNull() ? s.get("description").getAsString() : "");
            }
        }
    }

    /** Righe split di una transazione, con i dati della categoria di ciascuna. */
    public List<Map<String, Object>> getTransactionSplits(int txId) throws SQLException {
        return queryList("""
            SELECT ts.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color
            FROM transaction_splits ts
            LEFT JOIN categories c ON ts.category_id = c.id
            WHERE ts.transaction_id = ?
            ORDER BY ts.id
        """, txId);
    }

    /** Carica una singola transazione completa di categoria, conti e tag (usata dopo insert/update). */
    private Map<String, Object> getTransactionById(long id) throws SQLException {
        List<Map<String, Object>> r = parseTags(queryList("""
            SELECT t.*,
                c.name AS category_name, c.icon AS category_icon, c.color AS category_color,
                pc.name AS parent_category_name,
                a.name AS account_name, a.color AS account_color, ta.name AS to_account_name,
                GROUP_CONCAT(CASE WHEN tg.id IS NOT NULL
                    THEN tg.id || '\u00A7' || tg.name || '\u00A7' || tg.color END, '||') AS tags_concat
            FROM transactions t
            LEFT JOIN categories c  ON t.category_id   = c.id
            LEFT JOIN categories pc ON c.parent_id     = pc.id
            LEFT JOIN accounts   a  ON t.account_id    = a.id
            LEFT JOIN accounts   ta ON t.to_account_id = ta.id
            LEFT JOIN transaction_tags tt ON tt.transaction_id = t.id
            LEFT JOIN tags tg ON tg.id = tt.tag_id
            WHERE t.id=? GROUP BY t.id
        """, id));
        return r.isEmpty() ? null : r.get(0);
    }

    /** Espande la colonna aggregata tags_concat (id§nome§colore||...) in una lista di oggetti tag. */
    private List<Map<String, Object>> parseTags(List<Map<String, Object>> rows) {
        for (Map<String, Object> row : rows) {
            String tc = (String) row.remove("tags_concat");
            List<Map<String, Object>> tags = new ArrayList<>();
            if (tc != null && !tc.isEmpty()) {
                for (String part : tc.split("\\|\\|")) {
                    String[] bits = part.split("\u00A7", 3);
                    if (bits.length == 3) {
                        Map<String, Object> tag = new LinkedHashMap<>();
                        tag.put("id", Long.parseLong(bits[0].trim()));
                        tag.put("name", bits[1]);
                        tag.put("color", bits[2]);
                        tags.add(tag);
                    }
                }
            }
            row.put("tags", tags);
        }
        return rows;
    }

    // ─── Budget ───────────────────────────────────────────────────────────────

    /** Budget di un singolo mese con lo speso effettivo (spent) per categoria. */
    public List<Map<String, Object>> getBudgets(int month, int year) throws SQLException {
        return queryList("""
            WITH cat_amounts AS (
                SELECT t.type, t.category_id AS cat_id, t.amount AS amt
                FROM transactions t
                WHERE t.category_id IS NOT NULL
                  AND NOT EXISTS (SELECT 1 FROM transaction_splits ts WHERE ts.transaction_id = t.id)
                  AND strftime('%m',t.date)=? AND strftime('%Y',t.date)=?
                UNION ALL
                SELECT t.type, ts.category_id AS cat_id, ts.amount AS amt
                FROM transactions t
                JOIN transaction_splits ts ON ts.transaction_id = t.id
                WHERE strftime('%m',t.date)=? AND strftime('%Y',t.date)=?
            )
            SELECT b.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color,
                COALESCE(SUM(CASE WHEN ca.type='expense' THEN ca.amt ELSE 0 END), 0) AS spent
            FROM budgets b
            JOIN categories c ON b.category_id = c.id
            LEFT JOIN cat_amounts ca ON ca.cat_id = b.category_id
            WHERE b.month=? AND b.year=?
            GROUP BY b.id ORDER BY c.name
        """, String.format("%02d",month), String.valueOf(year),
             String.format("%02d",month), String.valueOf(year),
             month, year);
    }

    /** Imposta (upsert) il budget di una categoria per uno specifico mese/anno. */
    public Map<String, Object> setBudget(JsonObject p) throws SQLException {
        int catId = p.get("category_id").getAsInt();
        int month = p.get("month").getAsInt();
        int year  = p.get("year").getAsInt();
        execute("""
            INSERT INTO budgets(category_id,amount,month,year) VALUES(?,?,?,?)
            ON CONFLICT(category_id,month,year) DO UPDATE SET amount=excluded.amount
        """, catId, dbl2(p,"amount"), month, year);
        Map<String, Object> cat = queryOne("SELECT name FROM categories WHERE id=?", catId);
        logger.log("BUDGET IMPOSTATO",
            "categoria:" + DbLogger.s(cat != null ? cat.get("name") : catId),
            "mese:" + month + "/" + year,
            "importo:" + DbLogger.amt(dbl2(p,"amount")));
        return queryOne("SELECT * FROM budgets WHERE category_id=? AND month=? AND year=?", catId, month, year);
    }

    /** Elimina un singolo budget (cella categoria+mese+anno) per id. */
    public Map<String, Object> deleteBudget(int id) throws SQLException {
        Map<String, Object> old = queryOne(
            "SELECT b.month, b.year, c.name AS cat_name FROM budgets b " +
            "JOIN categories c ON c.id=b.category_id WHERE b.id=?", id);
        execute("DELETE FROM budgets WHERE id=?", id);
        logger.log("BUDGET ELIMINATO", "id:" + id,
            "categoria:" + DbLogger.s(old != null ? old.get("cat_name") : null),
            "periodo:" + (old != null ? old.get("month") + "/" + old.get("year") : "-"));
        return Map.of("id", id, "deleted", true);
    }

    /** Restituisce budget e consuntivo per tutte le categorie in un anno. */
    public Map<String, Object> getBudgetYear(int year) throws SQLException {
        List<Map<String, Object>> budgets = queryList(
            "SELECT category_id, month, amount FROM budgets WHERE year=? ORDER BY category_id, month",
            year);
        List<Map<String, Object>> actuals = queryList("""
            WITH cat_amounts AS (
                SELECT t.category_id AS cat_id, t.type,
                       CAST(strftime('%m', t.date) AS INTEGER) AS month, t.amount
                FROM transactions t
                WHERE t.category_id IS NOT NULL
                  AND NOT EXISTS (SELECT 1 FROM transaction_splits ts WHERE ts.transaction_id = t.id)
                  AND strftime('%Y', t.date)=? AND t.type IN ('expense','income')
                UNION ALL
                SELECT ts.category_id AS cat_id, t.type,
                       CAST(strftime('%m', t.date) AS INTEGER) AS month, ts.amount
                FROM transactions t
                JOIN transaction_splits ts ON ts.transaction_id = t.id
                WHERE strftime('%Y', t.date)=? AND t.type IN ('expense','income')
            )
            SELECT cat_id AS category_id, month, SUM(amount) AS total
            FROM cat_amounts
            GROUP BY cat_id, month
        """, String.valueOf(year), String.valueOf(year));
        List<Map<String, Object>> categories = queryList("""
            SELECT c.id, c.name, c.icon, c.color, c.type, c.parent_id, p.name AS parent_name
            FROM categories c
            LEFT JOIN categories p ON c.parent_id = p.id
            WHERE c.type != 'transfer'
            ORDER BY COALESCE(p.name, c.name), c.parent_id NULLS FIRST, c.name
        """);
        List<Map<String, Object>> configs = queryList(
            "SELECT category_id, mode, master_amount FROM budget_config WHERE year=?", year);
        return Map.of("budgets", budgets, "actuals", actuals, "categories", categories, "configs", configs);
    }

    /** Genera il budget per tutte le categorie.
     *  Se fromHistory=true copia i consuntivi dall'anno precedente. */
    public void generateBudget(int year, boolean fromHistory) throws SQLException {
        if (!fromHistory) return;

        int prevYear = year - 1;
        List<Map<String, Object>> actuals = queryList("""
            WITH cat_amounts AS (
                SELECT t.category_id, t.date, t.amount FROM transactions t
                WHERE t.category_id IS NOT NULL
                  AND NOT EXISTS (SELECT 1 FROM transaction_splits ts WHERE ts.transaction_id = t.id)
                  AND strftime('%Y', t.date)=? AND t.type IN ('expense','income')
                UNION ALL
                SELECT ts.category_id, t.date, ts.amount FROM transactions t
                JOIN transaction_splits ts ON ts.transaction_id = t.id
                WHERE strftime('%Y', t.date)=? AND t.type IN ('expense','income')
            )
            SELECT category_id, CAST(strftime('%m', date) AS INTEGER) AS month, SUM(amount) AS total
            FROM cat_amounts GROUP BY category_id, strftime('%m', date)
        """, String.valueOf(prevYear), String.valueOf(prevYear));

        Map<Object, Map<Integer, Double>> map = new HashMap<>();
        for (var a : actuals) {
            Object catId = a.get("category_id");
            int month = ((Number) a.get("month")).intValue();
            double total = ((Number) a.get("total")).doubleValue();
            map.computeIfAbsent(catId, k -> new HashMap<>()).put(month, total);
        }

        for (var cat : queryList("SELECT id FROM categories WHERE type != 'transfer'")) {
            Object catId = cat.get("id");
            Map<Integer, Double> months = map.getOrDefault(catId, Map.of());
            for (int m = 1; m <= 12; m++) {
                double amount = months.getOrDefault(m, 0.0);
                if (amount > 0) {
                    execute("""
                        INSERT INTO budgets(category_id,amount,month,year) VALUES(?,?,?,?)
                        ON CONFLICT(category_id,month,year) DO UPDATE SET amount=excluded.amount
                    """, catId, amount, m, year);
                }
            }
        }
        logger.log("BUDGET GENERATO", "anno:" + year, "da_storico:" + prevYear);
    }

    /** Copia il budget (budgets + budget_config) da sourceYear a year. */
    public void copyBudgetFromYear(int year, int sourceYear) throws SQLException {
        // Copia i valori mensili
        execute("""
            INSERT INTO budgets(category_id, amount, month, year)
            SELECT category_id, amount, month, ?
            FROM budgets WHERE year=?
            ON CONFLICT(category_id, month, year) DO UPDATE SET amount=excluded.amount
        """, year, sourceYear);
        // Copia la configurazione (mode, master_amount)
        execute("""
            INSERT INTO budget_config(category_id, year, mode, master_amount)
            SELECT category_id, ?, mode, master_amount
            FROM budget_config WHERE year=?
            ON CONFLICT(category_id, year) DO UPDATE SET mode=excluded.mode, master_amount=excluded.master_amount
        """, year, sourceYear);
        logger.log("BUDGET COPIATO", "anno:" + year, "da_anno:" + sourceYear);
    }

    /** Restituisce gli anni per cui esiste almeno una riga in budgets o budget_config. */
    public List<Integer> getBudgetYears() throws SQLException {
        List<Map<String, Object>> rows = queryList("""
            SELECT DISTINCT year FROM budgets
            UNION
            SELECT DISTINCT year FROM budget_config
            ORDER BY year DESC
        """);
        return rows.stream().map(r -> ((Number) r.get("year")).intValue()).toList();
    }

    /** Imposta la modalità (mensile/annuale) e l'importo master per una categoria in un anno. */
    public void setBudgetConfig(int categoryId, int year, String mode, double masterAmount) throws SQLException {
        execute("""
            INSERT INTO budget_config(category_id, year, mode, master_amount) VALUES(?,?,?,?)
            ON CONFLICT(category_id, year) DO UPDATE SET mode=excluded.mode, master_amount=excluded.master_amount
        """, categoryId, year, mode, r2(masterAmount));
        Map<String, Object> cat = queryOne("SELECT name FROM categories WHERE id=?", categoryId);
        logger.log("BUDGET CONFIG", "categoria:" + DbLogger.s(cat != null ? cat.get("name") : categoryId),
                   "anno:" + year, "modalita:" + mode, "importo:" + DbLogger.amt(masterAmount));
    }

    /** Imposta i 12 valori mensili per una categoria in un anno (0/null = rimuove). */
    public void setBudgetBulk(int categoryId, int year, com.google.gson.JsonArray amounts) throws SQLException {
        for (int m = 1; m <= 12; m++) {
            var el = amounts.get(m - 1);
            if (el.isJsonNull() || el.getAsDouble() <= 0) {
                execute("DELETE FROM budgets WHERE category_id=? AND year=? AND month=?",
                        categoryId, year, m);
            } else {
                execute("""
                    INSERT INTO budgets(category_id,amount,month,year) VALUES(?,?,?,?)
                    ON CONFLICT(category_id,month,year) DO UPDATE SET amount=excluded.amount
                """, categoryId, r2(el.getAsDouble()), m, year);
            }
        }
        Map<String, Object> cat = queryOne("SELECT name FROM categories WHERE id=?", categoryId);
        logger.log("BUDGET BULK", "categoria:" + DbLogger.s(cat != null ? cat.get("name") : categoryId),
                   "anno:" + year);
    }

    /** Rimuove tutti i budget e configurazioni per un intero anno. */
    public Map<String, Object> deleteBudgetYear(int year) throws SQLException {
        execute("DELETE FROM budgets WHERE year=?", year);
        execute("DELETE FROM budget_config WHERE year=?", year);
        logger.log("BUDGET ANNO ELIMINATO", "anno:" + year);
        return Map.of("year", year, "deleted", true);
    }

    /** Rimuove il budget per una singola cella (categoria + mese + anno). */
    public void deleteBudgetMonth(int categoryId, int month, int year) throws SQLException {
        execute("DELETE FROM budgets WHERE category_id=? AND month=? AND year=?",
                categoryId, month, year);
        Map<String, Object> cat = queryOne("SELECT name FROM categories WHERE id=?", categoryId);
        logger.log("BUDGET MESE ELIMINATO", "categoria:" + DbLogger.s(cat != null ? cat.get("name") : categoryId),
                   "mese:" + month + "/" + year);
    }

    // ─── Transazioni Pianificate ──────────────────────────────────────────────

    /** Tutte le transazioni pianificate con categoria, conti e tag. */
    public List<Map<String, Object>> getScheduled() throws SQLException {
        return parseTags(queryList("""
            SELECT s.*, c.name AS category_name, c.icon AS category_icon,
                   p.name AS parent_category_name,
                   a.name AS account_name, a.icon AS account_icon,
                   ta.name AS to_account_name,
                   GROUP_CONCAT(t.id || '\u00A7' || t.name || '\u00A7' || t.color, '||') AS tags_concat
            FROM scheduled_transactions s
            LEFT JOIN categories c ON s.category_id = c.id
            LEFT JOIN categories p ON c.parent_id = p.id
            LEFT JOIN accounts   a ON s.account_id  = a.id
            LEFT JOIN accounts  ta ON s.to_account_id = ta.id
            LEFT JOIN scheduled_transaction_tags stt ON stt.scheduled_id = s.id
            LEFT JOIN tags t ON t.id = stt.tag_id
            GROUP BY s.id
            ORDER BY s.start_date, s.id
        """));
    }

    /** Sostituisce i tag di una pianificata con quelli in p.tag_ids. */
    private void saveSchedTags(long schedId, JsonObject p) throws SQLException {
        execute("DELETE FROM scheduled_transaction_tags WHERE scheduled_id=?", schedId);
        if (p.has("tag_ids") && p.get("tag_ids").isJsonArray()) {
            for (var el : p.get("tag_ids").getAsJsonArray()) {
                execute("INSERT OR IGNORE INTO scheduled_transaction_tags(scheduled_id,tag_id) VALUES(?,?)",
                        schedId, el.getAsInt());
            }
        }
    }

    /** Crea una transazione pianificata (ricorrente) con i suoi tag. */
    public Map<String, Object> addScheduled(JsonObject p) throws SQLException {
        long id = execute("""
            INSERT INTO scheduled_transactions
                (description,amount,type,category_id,account_id,to_account_id,
                 frequency,start_date,end_date,is_active,color,reconciled,portfolio_id,original_start_date)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, str(p,"description"), dbl2(p,"amount"), str(p,"type"),
                intVal(p,"category_id"), p.get("account_id").getAsInt(),
                intVal(p,"to_account_id"), str(p,"frequency"),
                str(p,"start_date"), str(p,"end_date"),
                p.has("is_active") ? p.get("is_active").getAsInt() : 1,
                str(p,"color"),
                p.has("reconciled") && !p.get("reconciled").isJsonNull() ? p.get("reconciled").getAsInt() : 1,
                intVal(p,"portfolio_id"),
                str(p,"start_date"));
        saveSchedTags(id, p);
        logger.log("PIANIFICATA AGGIUNTA", "id:" + id, "descrizione:" + str(p,"description"),
                   "tipo:" + str(p,"type"), "importo:" + DbLogger.amt(dbl2(p,"amount")),
                   "frequenza:" + str(p,"frequency"), "inizio:" + str(p,"start_date"));
        return queryOne("SELECT * FROM scheduled_transactions WHERE id=?", id);
    }

    /** Aggiorna una pianificata e i suoi tag (non tocca original_start_date). */
    public Map<String, Object> updateScheduled(int id, JsonObject p) throws SQLException {
        execute("""
            UPDATE scheduled_transactions SET
                description=?,amount=?,type=?,category_id=?,account_id=?,to_account_id=?,
                frequency=?,start_date=?,end_date=?,is_active=?,color=?,reconciled=?
            WHERE id=?
        """, str(p,"description"), dbl2(p,"amount"), str(p,"type"),
                intVal(p,"category_id"), p.get("account_id").getAsInt(),
                intVal(p,"to_account_id"), str(p,"frequency"),
                str(p,"start_date"), str(p,"end_date"),
                p.has("is_active") ? p.get("is_active").getAsInt() : 1,
                str(p,"color"),
                p.has("reconciled") && !p.get("reconciled").isJsonNull() ? p.get("reconciled").getAsInt() : 1,
                id);
        saveSchedTags(id, p);
        logger.log("PIANIFICATA MODIFICATA", "id:" + id, "descrizione:" + str(p,"description"),
                   "tipo:" + str(p,"type"), "importo:" + DbLogger.amt(dbl2(p,"amount")),
                   "frequenza:" + str(p,"frequency"), "attiva:" + p.get("is_active"));
        return queryOne("SELECT * FROM scheduled_transactions WHERE id=?", id);
    }

    /** Elimina una transazione pianificata. */
    public Map<String, Object> deleteScheduled(int id) throws SQLException {
        Map<String, Object> old = queryOne("SELECT description, amount, type FROM scheduled_transactions WHERE id=?", id);
        execute("DELETE FROM scheduled_transactions WHERE id=?", id);
        logger.log("PIANIFICATA ELIMINATA", "id:" + id,
                   "descrizione:" + DbLogger.s(old != null ? old.get("description") : null),
                   "importo:" + DbLogger.amt(old != null ? old.get("amount") : null));
        return Map.of("id", id, "deleted", true);
    }

    /** Prima occorrenza di una pianificata a partire da `from` (compreso), data la frequenza.
     *  Per "once" ritorna null se la data singola è già passata rispetto a `from`. */
    private LocalDate firstOccurrenceFrom(LocalDate start, String freq, LocalDate from) {
        LocalDate cur = start;
        if (!cur.isBefore(from)) return cur;
        switch (freq) {
            case "monthly" -> {
                long months = java.time.temporal.ChronoUnit.MONTHS.between(start, from);
                cur = start.plusMonths(months);
                if (cur.isBefore(from)) cur = cur.plusMonths(1);
            }
            case "monthly_last" -> {
                long months = java.time.temporal.ChronoUnit.MONTHS.between(start, from);
                cur = start.plusMonths(months).withDayOfMonth(start.plusMonths(months).lengthOfMonth());
                if (cur.isBefore(from)) cur = cur.plusMonths(1).withDayOfMonth(cur.plusMonths(1).lengthOfMonth());
            }
            case "yearly" -> {
                long years = java.time.temporal.ChronoUnit.YEARS.between(start, from);
                cur = start.plusYears(years);
                if (cur.isBefore(from)) cur = cur.plusYears(1);
            }
            case "bimonthly" -> {
                long months = java.time.temporal.ChronoUnit.MONTHS.between(start, from);
                long b = months / 2;
                cur = start.plusMonths(b * 2);
                if (cur.isBefore(from)) cur = cur.plusMonths(2);
            }
            case "quarterly" -> {
                long months = java.time.temporal.ChronoUnit.MONTHS.between(start, from);
                long q = months / 3;
                cur = start.plusMonths(q * 3);
                if (cur.isBefore(from)) cur = cur.plusMonths(3);
            }
            case "semiannual" -> {
                long months = java.time.temporal.ChronoUnit.MONTHS.between(start, from);
                long s = months / 6;
                cur = start.plusMonths(s * 6);
                if (cur.isBefore(from)) cur = cur.plusMonths(6);
            }
            case "weekly" -> {
                long days = java.time.temporal.ChronoUnit.DAYS.between(start, from);
                long w = days / 7;
                cur = start.plusWeeks(w);
                if (cur.isBefore(from)) cur = cur.plusWeeks(1);
            }
            case "biweekly" -> {
                long days = java.time.temporal.ChronoUnit.DAYS.between(start, from);
                long bw = days / 14;
                cur = start.plusWeeks(bw * 2);
                if (cur.isBefore(from)) cur = cur.plusWeeks(2);
            }
            case "daily" -> cur = from;
            case "once" -> { return start.isBefore(from) ? null : start; }
        }
        return cur;
    }

    /** Data successiva a `d` secondo la frequenza (null se "once"/sconosciuta). */
    private LocalDate advanceDate(LocalDate d, String freq) {
        return switch (freq) {
            case "daily"     -> d.plusDays(1);
            case "weekly"    -> d.plusWeeks(1);
            case "biweekly"  -> d.plusWeeks(2);
            case "monthly"      -> d.plusMonths(1);
            case "monthly_last" -> { LocalDate n = d.plusMonths(1); yield n.withDayOfMonth(n.lengthOfMonth()); }
            case "bimonthly"  -> d.plusMonths(2);
            case "quarterly"  -> d.plusMonths(3);
            case "semiannual" -> d.plusMonths(6);
            case "yearly"     -> d.plusYears(1);
            default          -> null;
        };
    }

    /** Pianificate attive con almeno un'occorrenza negli ultimi 30 giorni (scadute/da registrare). */
    public List<Map<String, Object>> getOverdue() throws SQLException {
        var scheds = getScheduled().stream()
            .filter(s -> Integer.valueOf(1).equals(s.get("is_active")))
            .toList();
        LocalDate today    = LocalDate.now();
        LocalDate lookback = today.minusDays(30);
        LocalDate yesterday = today.minusDays(1);
        List<Map<String, Object>> overdue = new ArrayList<>();
        for (var s : scheds) {
            LocalDate start = LocalDate.parse((String) s.get("start_date"));
            String freq = (String) s.get("frequency");
            String edStr = (String) s.get("end_date");
            LocalDate endDate = edStr != null ? LocalDate.parse(edStr) : yesterday;
            if (endDate.isAfter(yesterday)) endDate = yesterday;
            LocalDate from = start.isBefore(lookback) ? firstOccurrenceFrom(start, freq, lookback) : start;
            if (from == null || from.isAfter(endDate)) continue;
            Map<String, Object> occ = new HashMap<>(s);
            occ.put("date", from.toString());
            overdue.add(occ);
        }
        overdue.sort(Comparator.comparing(o -> (String) o.get("date")));
        return overdue;
    }

    /** Pianificate attive la cui prossima occorrenza è oggi. */
    public List<Map<String, Object>> getDueToday() throws SQLException {
        String today = LocalDate.now().toString();
        return getScheduled().stream()
                .filter(s -> Integer.valueOf(1).equals(s.get("is_active")))
                .filter(s -> today.equals(s.get("start_date")))
                .collect(java.util.stream.Collectors.toList());
    }

    /** Transazioni che hanno il tag di sistema con la system_key data (es. "phone"). */
    public List<Map<String, Object>> getTransactionsWithTag(String systemKey) throws SQLException {
        return queryList("""
            SELECT t.id, t.date, t.description, t.amount, t.type
            FROM transactions t
            JOIN transaction_tags tt ON tt.transaction_id = t.id
            JOIN tags tg ON tg.id = tt.tag_id
            WHERE tg.system_key = ?
            ORDER BY t.date DESC
        """, systemKey);
    }

    // ─── Svecchiamento (raggruppamento transazioni vecchie) ────────────────────

    /**
     * Anteprima dello svecchiamento: ritorna la lista piatta delle transazioni
     * "semplici" candidate al raggruppamento nel range [from,to] per le categorie date.
     * Sono escluse (e quindi NON ritornate): trasferimenti (to_account_id non nullo),
     * transazioni con split, con allegato, legate al portfolio, e quelle già RAGGRUPPATE.
     * Ogni riga include id, data, categoria, conto, tipo, importo, descrizione, tag (CSV)
     * e una chiave di gruppo (mese|categoria|conto|tipo) per stimare le aggregate risultanti.
     * Ritorna anche il conteggio delle transazioni escluse, per trasparenza in UI.
     */
    public Map<String, Object> archivePreview(String from, String to, List<Integer> categoryIds) throws SQLException {
        if (categoryIds == null || categoryIds.isEmpty())
            return Map.of("rows", List.of(), "excluded", 0);

        String inClause = categoryIds.stream().map(String::valueOf)
                .collect(java.util.stream.Collectors.joining(","));
        Integer archivedTagId = getSystemTagIdByKey("archived");
        int archId = archivedTagId != null ? archivedTagId : -1;

        // Predicato "transazione semplice e non già raggruppata": riusato sia per le candidate
        // sia (negato) per contare quelle escluse. Concatenazione esplicita con spazi (i text block
        // strippano lo spazio finale prima di """, rompendo l'SQL).
        String simple =
            "t.to_account_id IS NULL "
            + "AND (t.attachment_path IS NULL OR t.attachment_path = '') "
            + "AND NOT EXISTS (SELECT 1 FROM transaction_splits s WHERE s.transaction_id = t.id) "
            + "AND NOT EXISTS (SELECT 1 FROM portfolio_transactions pt WHERE pt.transaction_id = t.id) "
            + "AND NOT EXISTS (SELECT 1 FROM transaction_tags ta WHERE ta.transaction_id = t.id AND ta.tag_id = " + archId + ") ";

        List<Map<String, Object>> rows = queryList(
            "SELECT t.id, t.date, t.amount, t.type, t.category_id, "
            + "c.name AS category_name, t.account_id, a.name AS account_name, t.description, "
            + "(SELECT GROUP_CONCAT(tg.name, ', ') FROM transaction_tags tt JOIN tags tg ON tg.id = tt.tag_id "
            + " WHERE tt.transaction_id = t.id AND tg.is_system = 0) AS tags, "
            + "substr(t.date,1,7) AS month "
            + "FROM transactions t "
            + "LEFT JOIN categories c ON c.id = t.category_id "
            + "LEFT JOIN accounts a ON a.id = t.account_id "
            + "WHERE t.date >= ? AND t.date <= ? "
            + "AND t.category_id IN (" + inClause + ") "
            + "AND " + simple
            + "ORDER BY substr(t.date,1,7), c.name, a.name, t.type, t.date",
            from, to);

        // Chiave di gruppo per stimare quante transazioni aggregate verranno create
        for (Map<String, Object> r : rows) {
            r.put("group", r.get("month") + "|" + r.get("category_id") + "|" + r.get("account_id") + "|" + r.get("type"));
        }

        // Conteggio escluse: transazioni nel range/categorie che NON sono semplici o già raggruppate
        Map<String, Object> exc = queryOne(
            "SELECT COUNT(*) AS c FROM transactions t "
            + "WHERE t.date >= ? AND t.date <= ? "
            + "AND t.category_id IN (" + inClause + ") "
            + "AND NOT (" + simple + ")",
            from, to);
        int excluded = exc != null ? ((Number) exc.get("c")).intValue() : 0;

        return Map.of("rows", rows, "excluded", excluded);
    }

    /** Formatta un importo in stile italiano (1.234,50) per i commenti aggregati. */
    private static String fmtEur(double v) {
        return String.format(java.util.Locale.ITALY, "%,.2f", v);
    }

    /**
     * Esegue il raggruppamento sugli ID transazione passati (quelli confermati in anteprima).
     * Raggruppa per mese + categoria + conto + tipo: per ogni gruppo crea UNA transazione-somma
     * con un commento strutturato che preserva descrizione, importo e tag di ogni voce originale,
     * applica il tag di sistema RAGGRUPPATE alla nuova transazione ed elimina le originali.
     * Tutto in un'unica transazione SQLite. Ritorna n° aggregate create e n° originali eliminate.
     */
    public Map<String, Object> archiveTransactions(List<Integer> ids) throws SQLException {
        if (ids == null || ids.isEmpty())
            return Map.of("created", 0, "deleted", 0);

        String inClause = ids.stream().map(String::valueOf)
                .collect(java.util.stream.Collectors.joining(","));

        // Rilegge gli ID dal DB (non ci si fida dei valori passati dal client) applicando
        // di nuovo il filtro "semplice": difende da split/allegati/portfolio/già-raggruppate
        // eventualmente cambiate tra anteprima ed esecuzione.
        Integer archivedTagId = getSystemTagIdByKey("archived");
        if (archivedTagId == null) { ensureSystemTags(); archivedTagId = getSystemTagIdByKey("archived"); }
        final int tagId = archivedTagId;

        List<Map<String, Object>> rows = queryList(
            "SELECT t.id, t.date, t.amount, t.type, t.category_id, t.account_id, t.description, "
            + "substr(t.date,1,7) AS month, "
            + "(SELECT GROUP_CONCAT(tg.name, ', ') FROM transaction_tags tt JOIN tags tg ON tg.id = tt.tag_id "
            + " WHERE tt.transaction_id = t.id AND tg.is_system = 0) AS tags "
            + "FROM transactions t "
            + "WHERE t.id IN (" + inClause + ") "
            + "AND t.to_account_id IS NULL "
            + "AND (t.attachment_path IS NULL OR t.attachment_path = '') "
            + "AND NOT EXISTS (SELECT 1 FROM transaction_splits s WHERE s.transaction_id = t.id) "
            + "AND NOT EXISTS (SELECT 1 FROM portfolio_transactions pt WHERE pt.transaction_id = t.id) "
            + "AND NOT EXISTS (SELECT 1 FROM transaction_tags ta WHERE ta.transaction_id = t.id AND ta.tag_id = ?) "
            + "ORDER BY substr(t.date,1,7), t.category_id, t.account_id, t.type, t.date",
            tagId);

        if (rows.isEmpty()) return Map.of("created", 0, "deleted", 0);

        // Raggruppa per mese|categoria|conto|tipo mantenendo l'ordine di inserimento
        Map<String, List<Map<String, Object>>> groups = new LinkedHashMap<>();
        for (Map<String, Object> r : rows) {
            String key = r.get("month") + "|" + r.get("category_id") + "|" + r.get("account_id") + "|" + r.get("type");
            groups.computeIfAbsent(key, k -> new ArrayList<>()).add(r);
        }

        return inTx(() -> {
            int created = 0, deleted = 0;
            for (var entry : groups.entrySet()) {
                List<Map<String, Object>> g = entry.getValue();
                if (g.size() < 2) continue; // un solo elemento: nessun vantaggio a raggruppare, lo lascio intatto

                Map<String, Object> first = g.get(0);
                String month       = (String) first.get("month");        // "yyyy-MM"
                String newDate      = month + "-01";                      // primo giorno del mese
                String type        = (String) first.get("type");
                Object categoryId  = first.get("category_id");
                Object accountId   = first.get("account_id");

                // Le voci con descrizione vengono elencate singolarmente (per non perdere
                // l'informazione); quelle senza commento sono accorpate in un'unica riga
                // riassuntiva con conteggio e somma, per non gonfiare il commento.
                double sum = 0;
                int blankCount = 0;
                double blankSum = 0;
                StringBuilder sb = new StringBuilder();
                for (Map<String, Object> r : g) {
                    double amt = ((Number) r.get("amount")).doubleValue();
                    sum += amt;
                    String desc = (String) r.get("description");
                    String tags = (String) r.get("tags");
                    if (desc == null || desc.isBlank()) {
                        blankCount++;
                        blankSum += amt;
                        continue;
                    }
                    sb.append("\n• ").append(desc.strip());
                    if (tags != null && !tags.isBlank()) sb.append(" [").append(tags).append("]");
                    sb.append(" — ").append(fmtEur(amt));
                }
                if (blankCount > 0) {
                    sb.append("\n• ").append(blankCount)
                      .append(blankCount == 1 ? " voce senza commento — " : " voci senza commento — ")
                      .append(fmtEur(r2(blankSum)));
                }
                sum = r2(sum);
                String header = "[RAGGRUPPATE " + g.size() + " voci · " + month + "]";
                String description = header + sb;

                long newId = execute(
                    "INSERT INTO transactions(date, amount, type, category_id, account_id, to_account_id, description, reconciled) "
                    + "VALUES(?,?,?,?,?,NULL,?,1)",
                    newDate, sum, type, categoryId, accountId, description);
                execute("INSERT OR IGNORE INTO transaction_tags(transaction_id, tag_id) VALUES(?,?)", newId, tagId);
                created++;

                for (Map<String, Object> r : g) {
                    execute("DELETE FROM transactions WHERE id = ?", r.get("id"));
                    deleted++;
                }
            }
            touchSyncMeta();
            logger.log("SVECCHIAMENTO", "aggregate:" + created + " eliminate:" + deleted);
            return Map.of("created", created, "deleted", deleted);
        });
    }

    /**
     * Avanza start_date alla prossima occorrenza dopo registeredDate.
     * Chiamato dopo aver registrato un'occorrenza pianificata: in questo modo
     * le occorrenze passate non vengono più generate e non risultano scadute.
     * Se la frequenza è "once", marca la transazione come inattiva.
     */
    public void advanceScheduled(int scheduledId, String registeredDate, Integer transactionId) throws SQLException {
        Map<String, Object> s = queryOne(
                "SELECT frequency, start_date, description, portfolio_id FROM scheduled_transactions WHERE id=?", scheduledId);
        if (s == null) return;
        String freq      = (String) s.get("frequency");
        LocalDate registered = LocalDate.parse(registeredDate);
        LocalDate next       = "once".equals(freq) ? null : advanceDate(registered, freq);

        inTx(() -> {
            // Se la pianificata è collegata a un titolo e abbiamo il transaction_id, registra nello storico portfolio
            if (transactionId != null && s.get("portfolio_id") != null) {
                int portfolioId = ((Number) s.get("portfolio_id")).intValue();
                var tx = queryOne("SELECT amount, date FROM transactions WHERE id=?", transactionId);
                if (tx != null) {
                    execute("""
                        INSERT INTO portfolio_transactions(portfolio_id,type,quantity,price,date,transaction_id,notes)
                        VALUES(?,?,?,?,?,?,?)
                    """, portfolioId, "coupon", 0, tx.get("amount"), tx.get("date"), transactionId,
                            DbLogger.s(s.get("description")));
                }
            }

            if ("once".equals(freq)) {
                execute("UPDATE scheduled_transactions SET is_active=0 WHERE id=?", scheduledId);
                logger.log("PIANIFICATA COMPLETATA", "id:" + scheduledId,
                           "descrizione:" + DbLogger.s(s.get("description")));
            } else if (next != null) {
                execute("UPDATE scheduled_transactions SET start_date=? WHERE id=?", next.toString(), scheduledId);
                logger.log("PIANIFICATA AVANZATA", "id:" + scheduledId,
                           "descrizione:" + DbLogger.s(s.get("description")),
                           "registrata:" + registeredDate, "prossima:" + next);
            }
            return null;
        });
    }

    /** Prossime N occorrenze future tra tutte le pianificate attive (orizzonte 2 anni). */
    public List<Map<String, Object>> getUpcoming(int limit) throws SQLException {
        var scheds = getScheduled().stream()
            .filter(s -> Integer.valueOf(1).equals(s.get("is_active")))
            .toList();
        LocalDate today = LocalDate.now();
        LocalDate horizon = today.plusYears(2);
        List<Map<String, Object>> all = new ArrayList<>();
        for (var s : scheds) {
            LocalDate start = LocalDate.parse((String) s.get("start_date"));
            String freq = (String) s.get("frequency");
            LocalDate endDate = s.get("end_date") != null ? LocalDate.parse((String) s.get("end_date")) : horizon;
            if (endDate.isAfter(horizon)) endDate = horizon;
            LocalDate cur = firstOccurrenceFrom(start, freq, today);
            if (cur == null) continue;
            while (!cur.isAfter(endDate)) {
                Map<String, Object> occ = new HashMap<>(s);
                occ.put("date", cur.toString());
                all.add(occ);
                if ("once".equals(freq)) break;
                cur = advanceDate(cur, freq);
                if (cur == null) break;
            }
        }
        all.sort(Comparator.comparing(o -> (String) o.get("date")));
        return all.stream().limit(limit).collect(Collectors.toList());
    }

    /** Occorrenze degli ultimi 30 giorni + prossime N future, ciascuna con flag overdue. */
    public List<Map<String, Object>> getUpcomingAll(int futureLimit) throws SQLException {
        var scheds = getScheduled().stream()
            .filter(s -> Integer.valueOf(1).equals(s.get("is_active")))
            .toList();
        LocalDate today    = LocalDate.now();
        LocalDate lookback = today.minusDays(30);
        LocalDate horizon  = today.plusYears(2);
        List<Map<String, Object>> all = new ArrayList<>();
        for (var s : scheds) {
            LocalDate start = LocalDate.parse((String) s.get("start_date"));
            String freq = (String) s.get("frequency");
            LocalDate endDate = s.get("end_date") != null ? LocalDate.parse((String) s.get("end_date")) : horizon;
            if (endDate.isAfter(horizon)) endDate = horizon;
            LocalDate startFrom = start.isBefore(lookback) ? firstOccurrenceFrom(start, freq, lookback) : start;
            if (startFrom == null) continue;
            LocalDate cur = startFrom;
            while (!cur.isAfter(endDate)) {
                Map<String, Object> occ = new HashMap<>(s);
                occ.put("date", cur.toString());
                occ.put("overdue", cur.isBefore(today));
                all.add(occ);
                if ("once".equals(freq)) break;
                cur = advanceDate(cur, freq);
                if (cur == null) break;
            }
        }
        all.sort(Comparator.comparing(o -> (String) o.get("date")));
        List<Map<String, Object>> overdue = all.stream().filter(o -> Boolean.TRUE.equals(o.get("overdue"))).collect(Collectors.toList());
        List<Map<String, Object>> future  = all.stream().filter(o -> !Boolean.TRUE.equals(o.get("overdue"))).limit(futureLimit).collect(Collectors.toList());
        List<Map<String, Object>> result  = new ArrayList<>(overdue);
        result.addAll(future);
        result.sort(Comparator.comparing(o -> (String) o.get("date")));
        return result;
    }

    /**
     * Proiezione saldi: per ogni conto selezionato, ritorna una lista di
     * {date, account_id, balance} con saldo giornaliero nel periodo.
     * accountIds = "1,2,3" oppure "" per tutti.
     */
    public Map<String, Object> getProjection(String fromDate, String toDate, String accountIds, boolean forceDaily) throws SQLException {
        LocalDate from = LocalDate.parse(fromDate);
        LocalDate to   = LocalDate.parse(toDate);
        // Current real balances
        List<Map<String, Object>> accounts = queryList("SELECT id, name, icon FROM accounts");
        Set<Integer> filter = new HashSet<>();
        if (accountIds != null && !accountIds.isBlank())
            for (String id : accountIds.split(",")) filter.add(Integer.parseInt(id.trim()));
        if (!filter.isEmpty()) accounts = accounts.stream()
            .filter(a -> filter.contains(((Number)a.get("id")).intValue())).collect(Collectors.toList());

        // Starting balance: sempre saldo reale di oggi (getAccounts), sia per daily che monthly.
        // Le pianificate partono da domani in entrambe le modalità.
        // La differenza daily/monthly è solo nella granularità dei punti del grafico.
        LocalDate schedFrom = from.plusDays(1);
        Map<Integer, Double> balance = new HashMap<>();
        for (var a : getAccounts()) {
            int aid = ((Number) a.get("id")).intValue();
            if (!filter.isEmpty() && !filter.contains(aid)) continue;
            balance.put(aid, ((Number) a.get("balance")).doubleValue());
        }
        for (var a : accounts) {
            int aid = ((Number) a.get("id")).intValue();
            balance.putIfAbsent(aid, 0.0);
        }

        // Expand scheduled transactions into allDeltas
        var scheds = getScheduled().stream()
            .filter(s -> Integer.valueOf(1).equals(s.get("is_active")))
            .toList();
        Map<String, Map<Integer, Double>> allDeltas = new TreeMap<>();
        for (var s : scheds) {
            int aid = ((Number) s.get("account_id")).intValue();
            Integer toAid = s.get("to_account_id") != null ? ((Number) s.get("to_account_id")).intValue() : null;
            if (!filter.isEmpty() && !filter.contains(aid) && (toAid == null || !filter.contains(toAid))) continue;
            String freq = (String) s.get("frequency");
            LocalDate start = LocalDate.parse((String) s.get("start_date"));
            LocalDate endDate = s.get("end_date") != null ? LocalDate.parse((String) s.get("end_date")) : to;
            if (endDate.isAfter(to)) endDate = to;
            LocalDate cur = firstOccurrenceFrom(start, freq, schedFrom);
            if (cur == null) continue;
            double amount = ((Number) s.get("amount")).doubleValue();
            String type = (String) s.get("type");
            while (!cur.isAfter(endDate)) {
                String ds = cur.toString();
                allDeltas.computeIfAbsent(ds, k -> new HashMap<>());
                if ("income".equals(type) && (filter.isEmpty() || filter.contains(aid))) {
                    allDeltas.get(ds).merge(aid, amount, Double::sum);
                } else if ("expense".equals(type) && (filter.isEmpty() || filter.contains(aid))) {
                    allDeltas.get(ds).merge(aid, -amount, Double::sum);
                } else if ("transfer".equals(type)) {
                    if (filter.isEmpty() || filter.contains(aid))
                        allDeltas.get(ds).merge(aid, -amount, Double::sum);
                    if (toAid != null && (filter.isEmpty() || filter.contains(toAid)))
                        allDeltas.get(ds).merge(toAid, amount, Double::sum);
                }
                if ("once".equals(freq)) break;
                cur = advanceDate(cur, freq);
                if (cur == null) break;
            }
        }

        // Build time series
        List<Map<String, Object>> series = new ArrayList<>();
        Map<Integer, Double> running = new HashMap<>(balance);
        List<String> deltaKeys = new ArrayList<>(allDeltas.keySet());
        int di = 0;

        if (forceDaily) {
            // Giornaliero: un punto per ogni giorno
            LocalDate c = from;
            while (!c.isAfter(to)) {
                String cs = c.toString();
                while (di < deltaKeys.size() && deltaKeys.get(di).compareTo(cs) <= 0) {
                    for (var e : allDeltas.get(deltaKeys.get(di)).entrySet())
                        running.merge(e.getKey(), e.getValue(), Double::sum);
                    di++;
                }
                for (var a : accounts) {
                    int aid = ((Number) a.get("id")).intValue();
                    Map<String, Object> pt = new HashMap<>();
                    pt.put("date", cs); pt.put("account_id", aid);
                    pt.put("account_name", a.get("name"));
                    pt.put("balance", running.getOrDefault(aid, 0.0));
                    series.add(pt);
                }
                c = c.plusDays(1);
            }
        } else {
            // Mensile: primo punto = oggi (saldo reale), poi fine di ogni mese.
            String todayStr = from.toString();
            for (var a : accounts) {
                int aid = ((Number) a.get("id")).intValue();
                Map<String, Object> pt = new HashMap<>();
                pt.put("date", todayStr); pt.put("account_id", aid);
                pt.put("account_name", a.get("name"));
                pt.put("balance", running.getOrDefault(aid, 0.0));
                series.add(pt);
            }
            // Poi un punto per ogni fine mese nel periodo
            LocalDate c = from;
            while (!c.isAfter(to)) {
                LocalDate eom = c.withDayOfMonth(c.lengthOfMonth());
                if (eom.isAfter(to)) eom = to;
                if (eom.equals(from)) { c = eom.plusDays(1); continue; } // salta se oggi è già fine mese
                String es = eom.toString();
                while (di < deltaKeys.size() && deltaKeys.get(di).compareTo(es) <= 0) {
                    for (var e : allDeltas.get(deltaKeys.get(di)).entrySet())
                        running.merge(e.getKey(), e.getValue(), Double::sum);
                    di++;
                }
                for (var a : accounts) {
                    int aid = ((Number) a.get("id")).intValue();
                    Map<String, Object> pt = new HashMap<>();
                    pt.put("date", es); pt.put("account_id", aid);
                    pt.put("account_name", a.get("name"));
                    pt.put("balance", running.getOrDefault(aid, 0.0));
                    series.add(pt);
                }
                c = eom.plusDays(1);
            }
        }

        // Monthly cash flow
        Map<String, double[]> cashflow = new TreeMap<>();
        for (var s : getScheduled().stream()
                .filter(sc -> Integer.valueOf(1).equals(sc.get("is_active"))).toList()) {
            int aid = ((Number) s.get("account_id")).intValue();
            if (!filter.isEmpty() && !filter.contains(aid)) continue;
            String freq = (String) s.get("frequency");
            LocalDate start = LocalDate.parse((String) s.get("start_date"));
            LocalDate endDate = s.get("end_date") != null ? LocalDate.parse((String) s.get("end_date")) : to;
            if (endDate.isAfter(to)) endDate = to;
            LocalDate cur2 = firstOccurrenceFrom(start, freq, from);
            if (cur2 == null) continue;
            double amount = ((Number) s.get("amount")).doubleValue();
            String type = (String) s.get("type");
            while (!cur2.isAfter(endDate)) {
                String month = cur2.toString().substring(0, 7);
                cashflow.computeIfAbsent(month, k -> new double[]{0,0});
                if ("income".equals(type))  cashflow.get(month)[0] += amount;
                if ("expense".equals(type)) cashflow.get(month)[1] += amount;
                if ("once".equals(freq)) break;
                cur2 = advanceDate(cur2, freq);
                if (cur2 == null) break;
            }
        }
        List<Map<String, Object>> cfList = new ArrayList<>();
        cashflow.forEach((month, vals) -> {
            Map<String, Object> m = new HashMap<>();
            m.put("month", month); m.put("income", vals[0]); m.put("expense", vals[1]);
            cfList.add(m);
        });

        return Map.of("series", series, "cashflow", cfList, "accounts", accounts);
    }

    // ─── Portafoglio ──────────────────────────────────────────────────────────

    /**
     * Tutte le posizioni del portafoglio con aggregati storici (buy/sell/cedole/dividendi/
     * spese/commissioni) e il P&L realizzato, calcolato con un walk-through cronologico
     * dei buy/sell che ricostruisce il costo medio runtime (corretto anche con vendite parziali).
     */
    public List<Map<String, Object>> getPortfolio() throws SQLException {
        // Aggregati storici per posizione: somme di buy/sell/cedole/dividendi/spese/commissioni
        // I valori principal (qty*price) sono sommati grezzi: JS converte per bond (÷100)
        List<Map<String, Object>> positions = queryList("""
            SELECT p.*, a.name AS account_name, a.icon AS account_icon, a.color AS account_color,
                   (SELECT MIN(pt.date) FROM portfolio_transactions pt WHERE pt.portfolio_id = p.id AND pt.type = 'buy') AS first_buy_date,
                   (SELECT COALESCE(SUM(pt.quantity * pt.price), 0)
                      FROM portfolio_transactions pt
                      WHERE pt.portfolio_id = p.id AND pt.type = 'buy') AS total_buy_principal,
                   (SELECT COALESCE(SUM(pt.quantity * pt.price), 0)
                      FROM portfolio_transactions pt
                      WHERE pt.portfolio_id = p.id AND pt.type = 'sell') AS total_sell_principal,
                   (SELECT COALESCE(SUM(pt.quantity), 0)
                      FROM portfolio_transactions pt
                      WHERE pt.portfolio_id = p.id AND pt.type = 'sell') AS total_sold_qty,
                   (SELECT COALESCE(SUM(pt.price), 0)
                      FROM portfolio_transactions pt
                      WHERE pt.portfolio_id = p.id AND pt.type = 'coupon') AS total_coupons,
                   (SELECT COALESCE(SUM(pt.price), 0)
                      FROM portfolio_transactions pt
                      WHERE pt.portfolio_id = p.id AND pt.type = 'dividend') AS total_dividends,
                   (SELECT COALESCE(SUM(pt.price), 0)
                      FROM portfolio_transactions pt
                      WHERE pt.portfolio_id = p.id AND pt.type = 'expense') AS total_expenses,
                   (SELECT COALESCE(SUM(pt.price), 0)
                      FROM portfolio_transactions pt
                      WHERE pt.portfolio_id = p.id AND pt.type = 'expense'
                        AND COALESCE(pt.notes,'') NOT IN ('Commissione','Commissione acquisto')) AS total_other_expenses,
                   (SELECT COALESCE(SUM(COALESCE(pt.commission,0)), 0)
                      FROM portfolio_transactions pt
                      WHERE pt.portfolio_id = p.id AND pt.type = 'expense'
                        AND pt.notes = 'Commissione') AS total_sell_commissions
            FROM portfolio p
            JOIN accounts a ON p.account_id = a.id
            ORDER BY a.name, p.ticker
        """);

        // Realized P&L corretto: walking-through cronologico dei buy/sell con avg_price runtime.
        // L'approccio precedente (sell_revenue − sold_qty × avg_corrente) è errato se l'avg_price
        // è cambiato tra una vendita e l'altra (es. sell parziale seguito da nuovo buy a prezzo diverso).
        // Per posizioni importate via "Carica esistente" (no pt buy rows) si pre-seeda lo stato con
        // la qty importata e l'avg stored, così i sell successivi usano il costo medio corretto.
        var ptRows = queryList("""
            SELECT portfolio_id, type, quantity, price, COALESCE(commission,0) AS commission, date, id
            FROM portfolio_transactions
            WHERE type IN ('buy','sell')
            ORDER BY portfolio_id, date, id
        """);
        // Pre-calcola per-portfolio: total_buy_qty (per dedurre imported_qty)
        Map<Long, Double> totalBuyQty = new HashMap<>();
        for (var r : ptRows) {
            if ("buy".equals(r.get("type"))) {
                long pid = ((Number)r.get("portfolio_id")).longValue();
                totalBuyQty.merge(pid, ((Number)r.get("quantity")).doubleValue(), Double::sum);
            }
        }
        // Seed iniziale: imported_qty = current_qty + sold_qty − bought_qty
        Map<Long, double[]> state = new HashMap<>(); // portfolioId -> [qty, avg, realized]
        Map<Long, Boolean> isBondMap = new HashMap<>();
        for (var pos : positions) {
            long pid = ((Number)pos.get("id")).longValue();
            boolean isBond = "bond".equals(pos.get("asset_type"));
            isBondMap.put(pid, isBond);
            double curQty   = ((Number)pos.get("quantity")).doubleValue();
            double soldQty  = ((Number)pos.get("total_sold_qty")).doubleValue();
            double boughtQ  = totalBuyQty.getOrDefault(pid, 0.0);
            double imported = curQty + soldQty - boughtQ;
            double storedAvg = ((Number)pos.get("avg_price")).doubleValue();
            state.put(pid, imported > 0.00001
                ? new double[]{imported, storedAvg, 0}
                : new double[]{0, 0, 0});
        }
        for (var r : ptRows) {
            long pid = ((Number)r.get("portfolio_id")).longValue();
            boolean isBond = isBondMap.getOrDefault(pid, false);
            double divisor = isBond ? 100.0 : 1.0;
            String type = (String)r.get("type");
            double q  = ((Number)r.get("quantity")).doubleValue();
            double pr = ((Number)r.get("price")).doubleValue();
            double cm = ((Number)r.get("commission")).doubleValue();
            double[] s = state.computeIfAbsent(pid, k -> new double[]{0, 0, 0});
            if ("buy".equals(type)) {
                double newQty = s[0] + q;
                if (newQty > 0) {
                    s[1] = isBond
                        ? (s[0] * s[1] + q * pr + cm * 100) / newQty
                        : (s[0] * s[1] + q * pr + cm) / newQty;
                }
                s[0] = newQty;
            } else { // sell
                s[2] += (pr - s[1]) * q / divisor;
                s[0] -= q;
                if (s[0] < 0.00001) { s[0] = 0; s[1] = 0; }
            }
        }
        for (var pos : positions) {
            long pid = ((Number)pos.get("id")).longValue();
            double[] s = state.get(pid);
            pos.put("realized_pnl", s != null ? r2(s[2]) : 0.0);
        }
        return positions;
    }

    /** Storico movimenti (buy/sell/cedole/dividendi/spese) di una posizione. */
    public List<Map<String, Object>> getPortfolioTransactions(int portfolioId) throws SQLException {
        return queryList("""
            SELECT pt.*, t.date AS tx_date, a_from.name AS from_account, a_to.name AS to_account
            FROM portfolio_transactions pt
            LEFT JOIN transactions t ON pt.transaction_id = t.id
            LEFT JOIN accounts a_from ON t.account_id = a_from.id
            LEFT JOIN accounts a_to ON t.to_account_id = a_to.id
            WHERE pt.portfolio_id = ?
            ORDER BY pt.date DESC, pt.id DESC
        """, portfolioId);
    }

    /**
     * Registra un acquisto: bonifico (transfer) dal conto liquidità a quello investimenti,
     * crea/aggiorna la posizione ricalcolando il prezzo medio, e registra il movimento "buy".
     * L'eventuale commissione diventa una transazione expense separata + movimento "expense".
     */
    public Map<String, Object> buyStock(JsonObject p) throws SQLException {
        int investAccountId  = p.get("account_id").getAsInt();
        int fromAccountId    = p.get("from_account_id").getAsInt();
        String ticker        = p.get("ticker").getAsString().toUpperCase();
        String name          = p.get("name").getAsString();
        double qty           = p.get("quantity").getAsDouble();
        double price         = r4(p.get("price").getAsDouble());
        String date          = p.get("date").getAsString();
        String notes         = p.has("notes") && !p.get("notes").isJsonNull() ? p.get("notes").getAsString() : null;
        String assetType     = p.has("asset_type") && !p.get("asset_type").isJsonNull() ? p.get("asset_type").getAsString() : "equity";
        double faceValue     = r4(p.has("face_value") && !p.get("face_value").isJsonNull() ? p.get("face_value").getAsDouble() : 1.0);
        String maturityDate  = p.has("maturity_date") && !p.get("maturity_date").isJsonNull() ? p.get("maturity_date").getAsString() : null;
        double couponRate    = p.has("coupon_rate") && !p.get("coupon_rate").isJsonNull() ? p.get("coupon_rate").getAsDouble() : 0.0;
        String couponFreq    = p.has("coupon_frequency") && !p.get("coupon_frequency").isJsonNull() ? p.get("coupon_frequency").getAsString() : null;
        double couponTax     = p.has("coupon_tax") && !p.get("coupon_tax").isJsonNull() ? p.get("coupon_tax").getAsDouble() : 12.5;
        double commissions   = r2(p.has("commissions") && !p.get("commissions").isJsonNull() ? p.get("commissions").getAsDouble() : 0.0);
        boolean isBond       = "bond".equals(assetType);
        double pureAmount    = r2(isBond ? qty * price / 100.0 : qty * price);

        return inTx(() -> {
            var cat = queryOne("SELECT id FROM categories WHERE type='transfer' LIMIT 1");
            Integer catId = cat != null ? ((Number)cat.get("id")).intValue() : null;

            // Bonifico solo per l'importo "puro" (commissione gestita come expense separata sotto)
            long txId = execute("""
                INSERT INTO transactions(date,amount,type,category_id,account_id,to_account_id,description,reconciled)
                VALUES(?,?,?,?,?,?,?,0)
            """, date, pureAmount, "transfer", catId, fromAccountId, investAccountId,
                "Acquisto " + ticker);

            var existing = queryOne("SELECT * FROM portfolio WHERE account_id=? AND ticker=?",
                    investAccountId, ticker);
            long portfolioId;
            if (existing != null) {
                double existQty  = ((Number)existing.get("quantity")).doubleValue();
                double existAvg  = ((Number)existing.get("avg_price")).doubleValue();
                double existComm = existing.get("total_commissions") != null
                        ? ((Number)existing.get("total_commissions")).doubleValue() : 0.0;
                double newAvg = r4(isBond
                    ? (existQty * existAvg + qty * price + commissions * 100) / (existQty + qty)
                    : (existQty * existAvg + qty * price + commissions) / (existQty + qty));
                portfolioId = ((Number)existing.get("id")).longValue();
                execute("UPDATE portfolio SET quantity=?, avg_price=?, current_price=?, total_commissions=? WHERE id=?",
                        existQty + qty, newAvg, price, r2(existComm + commissions), portfolioId);
            } else {
                double initAvg = r4(isBond
                    ? price + (commissions > 0 ? commissions * 100 / qty : 0)
                    : (commissions > 0 ? (qty * price + commissions) / qty : price));
                portfolioId = execute("""
                    INSERT INTO portfolio(account_id,ticker,name,quantity,avg_price,current_price,notes,
                                          asset_type,face_value,maturity_date,coupon_rate,coupon_frequency,coupon_tax,total_commissions)
                    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """, investAccountId, ticker, name, qty, initAvg, price, notes,
                     assetType, faceValue, maturityDate, couponRate, couponFreq, couponTax, commissions);
            }

            execute("""
                INSERT INTO portfolio_transactions(portfolio_id,type,quantity,price,date,transaction_id,notes,commission)
                VALUES(?,?,?,?,?,?,?,?)
            """, portfolioId, "buy", qty, price, date, txId, notes, commissions);

            if (commissions > 0) {
                // Cerca categoria expense per commissioni: prima "Commissioni", poi "Spese/Tasse", poi "Investimenti", infine fallback ordinato
                var expCat = queryOne("SELECT id FROM categories WHERE type='expense' AND LOWER(name) LIKE '%commission%' ORDER BY id LIMIT 1");
                if (expCat == null) expCat = queryOne("SELECT id FROM categories WHERE type='expense' AND (LOWER(name) LIKE '%spese/tasse%' OR LOWER(name) LIKE '%tasse%') ORDER BY id LIMIT 1");
                if (expCat == null) expCat = queryOne("SELECT id FROM categories WHERE type='expense' AND LOWER(name) LIKE '%nvestiment%' ORDER BY id LIMIT 1");
                if (expCat == null) expCat = queryOne("SELECT id FROM categories WHERE type='expense' ORDER BY id LIMIT 1");
                Integer expCatId = expCat != null ? ((Number)expCat.get("id")).intValue() : null;
                long commTxId = execute("""
                    INSERT INTO transactions(date,amount,type,category_id,account_id,description,reconciled)
                    VALUES(?,?,?,?,?,?,0)
                """, date, commissions, "expense", expCatId, fromAccountId, "Commissione acquisto " + ticker);
                execute("""
                    INSERT INTO portfolio_transactions(portfolio_id,type,quantity,price,date,transaction_id,notes,commission)
                    VALUES(?,?,?,?,?,?,?,?)
                """, portfolioId, "expense", 0, commissions, date, commTxId, "Commissione acquisto", commissions);
                logger.log("COMMISSIONE ACQUISTO", "ticker:" + ticker, "importo:" + DbLogger.amt(commissions));
            }

            logger.log("TITOLO ACQUISTATO", "ticker:" + ticker, "nome:" + name,
                       "quantita:" + qty, "prezzo:" + DbLogger.amt(price),
                       "commissioni:" + DbLogger.amt(commissions), "data:" + date);
            return queryOne("SELECT * FROM portfolio WHERE id=?", portfolioId);
        });
    }

    /**
     * Registra una vendita: bonifico dal conto investimenti a quello liquidità, riduce la
     * quantità in posizione e registra il movimento "sell" (commissione come expense separata).
     */
    public Map<String, Object> sellStock(JsonObject p) throws SQLException {
        int portfolioId   = p.get("portfolio_id").getAsInt();
        int toAccountId   = p.get("to_account_id").getAsInt();
        double qty        = p.get("quantity").getAsDouble();
        double price      = r4(p.get("price").getAsDouble());
        String date       = p.get("date").getAsString();
        String notes      = p.has("notes") && !p.get("notes").isJsonNull() ? p.get("notes").getAsString() : null;
        double commission = p.has("commission") && !p.get("commission").isJsonNull() ? r2(p.get("commission").getAsDouble()) : 0.0;

        // Valida prima di aprire la transazione
        var position = queryOne("SELECT * FROM portfolio WHERE id=?", portfolioId);
        if (position == null) throw new SQLException("Posizione non trovata");
        double existQty     = ((Number)position.get("quantity")).doubleValue();
        int investAccountId = ((Number)position.get("account_id")).intValue();
        String ticker       = (String)position.get("ticker");
        if (qty > existQty + 0.00001)
            throw new SQLException("Quantità venduta (" + qty + ") superiore alla disponibile (" + existQty + ")");

        boolean isBond = "bond".equals((String)position.get("asset_type"));
        double amount = r2(isBond ? qty * price / 100.0 : qty * price);

        return inTx(() -> {
            var cat = queryOne("SELECT id FROM categories WHERE type='transfer' LIMIT 1");
            Integer catId = cat != null ? ((Number)cat.get("id")).intValue() : null;
            long txId = execute("""
                INSERT INTO transactions(date,amount,type,category_id,account_id,to_account_id,description,reconciled)
                VALUES(?,?,?,?,?,?,?,0)
            """, date, amount, "transfer", catId, investAccountId, toAccountId,
                "Vendita " + ticker + " x" + qty);

            execute("UPDATE portfolio SET quantity=? WHERE id=?", r4(existQty - qty), portfolioId);

            execute("""
                INSERT INTO portfolio_transactions(portfolio_id,type,quantity,price,date,transaction_id,notes)
                VALUES(?,?,?,?,?,?,?)
            """, portfolioId, "sell", qty, price, date, txId, notes);

            if (commission > 0) {
                // Cerca categoria expense per commissioni: prima "Commissioni", poi "Spese/Tasse", poi "Investimenti", infine fallback ordinato
                var expCat = queryOne("SELECT id FROM categories WHERE type='expense' AND LOWER(name) LIKE '%commission%' ORDER BY id LIMIT 1");
                if (expCat == null) expCat = queryOne("SELECT id FROM categories WHERE type='expense' AND (LOWER(name) LIKE '%spese/tasse%' OR LOWER(name) LIKE '%tasse%') ORDER BY id LIMIT 1");
                if (expCat == null) expCat = queryOne("SELECT id FROM categories WHERE type='expense' AND LOWER(name) LIKE '%nvestiment%' ORDER BY id LIMIT 1");
                if (expCat == null) expCat = queryOne("SELECT id FROM categories WHERE type='expense' ORDER BY id LIMIT 1");
                Integer expCatId = expCat != null ? ((Number)expCat.get("id")).intValue() : null;
                long commTxId = execute("""
                    INSERT INTO transactions(date,amount,type,category_id,account_id,description,reconciled)
                    VALUES(?,?,?,?,?,?,0)
                """, date, commission, "expense", expCatId, toAccountId, "Commissione vendita " + ticker);
                execute("""
                    INSERT INTO portfolio_transactions(portfolio_id,type,quantity,price,date,transaction_id,notes,commission)
                    VALUES(?,?,?,?,?,?,?,?)
                """, portfolioId, "expense", 0, commission, date, commTxId, "Commissione", commission);
                // Aggiorna total_commissions della posizione
                execute("UPDATE portfolio SET total_commissions = total_commissions + ? WHERE id=?", commission, portfolioId);
                logger.log("COMMISSIONE VENDITA", "ticker:" + ticker, "importo:" + DbLogger.amt(commission));
            }

            logger.log("TITOLO VENDUTO", "ticker:" + ticker,
                       "quantita:" + qty, "prezzo:" + DbLogger.amt(price),
                       "controvalore:" + DbLogger.amt(amount),
                       "commissione:" + DbLogger.amt(commission), "data:" + date);
            return queryOne("SELECT * FROM portfolio WHERE id=?", portfolioId);
        });
    }

    /**
     * Annulla un movimento di portafoglio (buy/sell/cedola/spesa): ripristina la quantità,
     * ricalcola il prezzo medio dai buy rimanenti, aggiusta le commissioni totali ed elimina
     * la transazione collegata. È l'inverso di buyStock/sellStock/registerCoupon.
     */
    public Map<String, Object> deletePortfolioTransaction(int ptId) throws SQLException {
        var pt = queryOne("SELECT * FROM portfolio_transactions WHERE id=?", ptId);
        if (pt == null) throw new SQLException("Operazione non trovata (id:" + ptId + ")");

        int portfolioId = ((Number)pt.get("portfolio_id")).intValue();
        String type     = (String)pt.get("type");
        double qty      = ((Number)pt.get("quantity")).doubleValue();
        double comm     = pt.get("commission") != null ? ((Number)pt.get("commission")).doubleValue() : 0.0;
        String ptNotes  = (String) pt.get("notes");
        Object txIdObj  = pt.get("transaction_id");

        // Valida prima di aprire la transazione
        if ("buy".equals(type)) {
            var pos = queryOne("SELECT quantity FROM portfolio WHERE id=?", portfolioId);
            if (pos == null) throw new SQLException("Posizione non trovata");
            double curQty = ((Number)pos.get("quantity")).doubleValue();
            if (r4(curQty - qty) < -0.00001)
                throw new SQLException("Impossibile annullare: la quantità risultante sarebbe negativa (" + r4(curQty - qty) + ")");
        }

        return inTx(() -> {
            var pos = queryOne("SELECT asset_type FROM portfolio WHERE id=?", portfolioId);
            boolean isBond = pos != null && "bond".equals(pos.get("asset_type"));

            if ("sell".equals(type)) {
                execute("UPDATE portfolio SET quantity = quantity + ? WHERE id=?", qty, portfolioId);
            } else if ("buy".equals(type)) {
                execute("UPDATE portfolio SET quantity = quantity - ? WHERE id=?", qty, portfolioId);
                // Ricalcola avg_price dai buy rimanenti includendo le commissioni:
                // Equity: avg = SUM(qty*price + commission) / SUM(qty)
                // Bond:   avg% = (SUM(qty*price) + SUM(commission)*100) / SUM(qty)
                var remaining = queryList(
                    "SELECT quantity, price, COALESCE(commission,0) AS commission FROM portfolio_transactions WHERE portfolio_id=? AND type='buy' AND id!=?",
                    portfolioId, ptId);
                if (!remaining.isEmpty()) {
                    double tqty  = remaining.stream().mapToDouble(r -> ((Number)r.get("quantity")).doubleValue()).sum();
                    double tCostNoComm = remaining.stream().mapToDouble(r ->
                        ((Number)r.get("quantity")).doubleValue() * ((Number)r.get("price")).doubleValue()).sum();
                    double tComm = remaining.stream().mapToDouble(r ->
                        ((Number)r.get("commission")).doubleValue()).sum();
                    double newAvg = 0.0;
                    if (tqty > 0) {
                        newAvg = isBond
                            ? r4((tCostNoComm + tComm * 100.0) / tqty)
                            : r4((tCostNoComm + tComm) / tqty);
                    }
                    execute("UPDATE portfolio SET avg_price=? WHERE id=?", newAvg, portfolioId);
                } else {
                    execute("UPDATE portfolio SET avg_price=0 WHERE id=?", portfolioId);
                }
                // Sottrai la commissione del buy eliminato dal totale
                if (comm > 0) {
                    execute("UPDATE portfolio SET total_commissions = MAX(0, total_commissions - ?) WHERE id=?", comm, portfolioId);
                }
            } else if ("expense".equals(type) && "Commissione".equals(ptNotes) && comm > 0) {
                // Eliminazione di una commissione di vendita: sottrai dal totale
                execute("UPDATE portfolio SET total_commissions = MAX(0, total_commissions - ?) WHERE id=?", comm, portfolioId);
            }

            if (txIdObj != null) {
                long txId = ((Number)txIdObj).longValue();
                execute("DELETE FROM transactions WHERE id=?", txId);
            }

            execute("DELETE FROM portfolio_transactions WHERE id=?", ptId);

            var pos2 = queryOne("SELECT ticker FROM portfolio WHERE id=?", portfolioId);
            String ticker = pos2 != null ? (String)pos2.get("ticker") : "?";
            logger.log("OPERAZIONE PORTFOLIO ANNULLATA", "pt_id:" + ptId, "tipo:" + type, "ticker:" + ticker);
            return Map.of("ok", true, "portfolio_id", portfolioId);
        });
    }

    /** Aggiorna solo il prezzo corrente di mercato di una posizione. */
    public Map<String, Object> updateStockPrice(int id, double price) throws SQLException {
        execute("UPDATE portfolio SET current_price=? WHERE id=?", r4(price), id);
        return queryOne("SELECT * FROM portfolio WHERE id=?", id);
    }

    /** Modifica una posizione esistente (tutto tranne ticker). */
    public Map<String, Object> updatePortfolioItem(JsonObject p) throws SQLException {
        int    id            = p.get("id").getAsInt();
        String name          = p.get("name").getAsString();
        int    accountId     = p.get("account_id").getAsInt();
        double quantity      = p.get("quantity").getAsDouble();
        double avgPrice      = r4(p.get("avg_price").getAsDouble());
        double curPrice      = r4(p.has("current_price") && !p.get("current_price").isJsonNull()
                               ? p.get("current_price").getAsDouble() : avgPrice);
        double totalComm     = r2(p.has("total_commissions") && !p.get("total_commissions").isJsonNull()
                               ? p.get("total_commissions").getAsDouble() : 0.0);
        String assetType     = p.has("asset_type") && !p.get("asset_type").isJsonNull()
                               ? p.get("asset_type").getAsString() : "equity";
        String maturityDate  = p.has("maturity_date") && !p.get("maturity_date").isJsonNull()
                               ? p.get("maturity_date").getAsString() : null;
        double couponRate    = p.has("coupon_rate") && !p.get("coupon_rate").isJsonNull()
                               ? p.get("coupon_rate").getAsDouble() : 0.0;
        String couponFreq    = p.has("coupon_frequency") && !p.get("coupon_frequency").isJsonNull()
                               ? p.get("coupon_frequency").getAsString() : null;
        double couponTax     = p.has("coupon_tax") && !p.get("coupon_tax").isJsonNull()
                               ? p.get("coupon_tax").getAsDouble() : 12.5;
        String notes         = p.has("notes") && !p.get("notes").isJsonNull()
                               ? p.get("notes").getAsString() : null;
        String country       = p.has("country") && !p.get("country").isJsonNull()
                               ? p.get("country").getAsString() : null;
        execute("""
            UPDATE portfolio SET
                name=?, account_id=?, quantity=?, avg_price=?, current_price=?,
                total_commissions=?, asset_type=?, maturity_date=?,
                coupon_rate=?, coupon_frequency=?, coupon_tax=?, notes=?, country=?
            WHERE id=?
        """, name, accountId, quantity, avgPrice, curPrice,
             totalComm, assetType, maturityDate, couponRate, couponFreq, couponTax, notes, country, id);
        logger.log("PORTAFOGLIO MODIFICATO", "id:" + id, "nome:" + name,
                   "quantita:" + quantity, "prezzo_medio:" + DbLogger.amt(avgPrice));
        return queryOne("SELECT * FROM portfolio WHERE id=?", id);
    }

    /** Registra il pagamento di una cedola come transazione income. */
    public Map<String, Object> registerCoupon(JsonObject p) throws SQLException {
        int portfolioId = p.get("portfolio_id").getAsInt();
        int accountId   = p.get("account_id").getAsInt();
        double amount   = r2(p.get("amount").getAsDouble());
        String date     = p.get("date").getAsString();
        String notes    = p.has("notes") && !p.get("notes").isJsonNull() ? p.get("notes").getAsString() : null;

        var pos = queryOne("SELECT * FROM portfolio WHERE id=?", portfolioId);
        if (pos == null) throw new SQLException("Posizione non trovata");
        String ticker = (String)pos.get("ticker");

        return inTx(() -> {
            var incCat = queryOne("SELECT id FROM categories WHERE type='income' AND name LIKE '%nvestiment%' LIMIT 1");
            if (incCat == null) incCat = queryOne("SELECT id FROM categories WHERE type='income' LIMIT 1");
            Integer catId = incCat != null ? ((Number)incCat.get("id")).intValue() : null;

            String desc = notes != null ? notes : "Cedola " + ticker;
            long txId = execute("""
                INSERT INTO transactions(date,amount,type,category_id,account_id,description,reconciled)
                VALUES(?,?,?,?,?,?,0)
            """, date, amount, "income", catId, accountId, desc);

            execute("""
                INSERT INTO portfolio_transactions(portfolio_id,type,quantity,price,date,transaction_id,notes)
                VALUES(?,?,?,?,?,?,?)
            """, portfolioId, "coupon", 0, amount, date, txId, notes);

            Integer investTagId = getSystemTagIdByKey("investment");
            if (investTagId != null)
                execute("INSERT OR IGNORE INTO transaction_tags(transaction_id,tag_id) VALUES(?,?)", txId, investTagId);

            logger.log("CEDOLA REGISTRATA", "ticker:" + ticker,
                       "importo:" + DbLogger.amt(amount), "data:" + date,
                       "note:" + DbLogger.s(notes));
            return Map.of("ok", true, "transaction_id", txId);
        });
    }

    /** Registra un dividendo come transazione income (importo netto) + movimento "dividend". */
    public Map<String, Object> registerDividend(JsonObject p) throws SQLException {
        int portfolioId = p.get("portfolio_id").getAsInt();
        int accountId   = p.get("account_id").getAsInt();
        double amount   = r2(p.get("amount").getAsDouble());  // netto accreditato
        String date     = p.get("date").getAsString();
        String notes    = p.has("notes") && !p.get("notes").isJsonNull() ? p.get("notes").getAsString() : null;

        var pos = queryOne("SELECT * FROM portfolio WHERE id=?", portfolioId);
        if (pos == null) throw new SQLException("Posizione non trovata");
        String ticker = (String)pos.get("ticker");

        return inTx(() -> {
            var incCat = queryOne("SELECT id FROM categories WHERE type='income' AND name LIKE '%nvestiment%' LIMIT 1");
            if (incCat == null) incCat = queryOne("SELECT id FROM categories WHERE type='income' LIMIT 1");
            Integer catId = incCat != null ? ((Number)incCat.get("id")).intValue() : null;

            String desc = notes != null ? notes : "Dividendo " + ticker;
            long txId = execute("""
                INSERT INTO transactions(date,amount,type,category_id,account_id,description,reconciled)
                VALUES(?,?,?,?,?,?,0)
            """, date, amount, "income", catId, accountId, desc);

            execute("""
                INSERT INTO portfolio_transactions(portfolio_id,type,quantity,price,date,transaction_id,notes)
                VALUES(?,?,?,?,?,?,?)
            """, portfolioId, "dividend", 0, amount, date, txId, notes);

            Integer investTagId = getSystemTagIdByKey("investment");
            if (investTagId != null)
                execute("INSERT OR IGNORE INTO transaction_tags(transaction_id,tag_id) VALUES(?,?)", txId, investTagId);

            logger.log("DIVIDENDO REGISTRATO", "ticker:" + ticker,
                       "importo:" + DbLogger.amt(amount), "data:" + date,
                       "note:" + DbLogger.s(notes));
            return Map.of("ok", true, "transaction_id", txId);
        });
    }

    /** Registra una spesa generica legata a un titolo (es. bollo/tasse) come transazione expense. */
    public Map<String, Object> registerPortfolioExpense(JsonObject p) throws SQLException {
        int portfolioId = p.get("portfolio_id").getAsInt();
        int accountId   = p.get("account_id").getAsInt();
        double amount   = r2(p.get("amount").getAsDouble());
        String date     = p.get("date").getAsString();
        String label    = p.has("label") && !p.get("label").isJsonNull() ? p.get("label").getAsString() : "Spesa";
        String notes    = p.has("notes") && !p.get("notes").isJsonNull() ? p.get("notes").getAsString() : null;

        var pos = queryOne("SELECT * FROM portfolio WHERE id=?", portfolioId);
        if (pos == null) throw new SQLException("Posizione non trovata");
        String ticker = (String)pos.get("ticker");

        Integer catIdResolved = p.has("category_id") && !p.get("category_id").isJsonNull()
                ? p.get("category_id").getAsInt() : null;

        return inTx(() -> {
            Integer catId = catIdResolved;
            if (catId == null) {
                var expCat = queryOne("SELECT id FROM categories WHERE type='expense' AND name LIKE '%nvestiment%' LIMIT 1");
                if (expCat == null) expCat = queryOne("SELECT id FROM categories WHERE type='expense' LIMIT 1");
                catId = expCat != null ? ((Number)expCat.get("id")).intValue() : null;
            }

            String desc = notes != null ? notes : label + " " + ticker;
            long txId = execute("""
                INSERT INTO transactions(date,amount,type,category_id,account_id,description,reconciled)
                VALUES(?,?,?,?,?,?,0)
            """, date, amount, "expense", catId, accountId, desc);

            execute("""
                INSERT INTO portfolio_transactions(portfolio_id,type,quantity,price,date,transaction_id,notes)
                VALUES(?,?,?,?,?,?,?)
            """, portfolioId, "expense", 0, amount, date, txId, notes != null ? notes : label);

            Integer investTagId = getSystemTagIdByKey("investment");
            if (investTagId != null)
                execute("INSERT OR IGNORE INTO transaction_tags(transaction_id,tag_id) VALUES(?,?)", txId, investTagId);

            logger.log("SPESA PORTFOLIO REGISTRATA", "ticker:" + ticker,
                       "label:" + DbLogger.s(label), "importo:" + DbLogger.amt(amount), "data:" + date);
            return Map.of("ok", true, "transaction_id", txId);
        });
    }

    /** Elimina un'intera posizione di portafoglio (i movimenti cadono in cascata via FK). */
    public Map<String, Object> deletePortfolioItem(int id) throws SQLException {
        Map<String, Object> old = queryOne("SELECT ticker, name FROM portfolio WHERE id=?", id);
        execute("DELETE FROM portfolio WHERE id=?", id);
        logger.log("TITOLO ELIMINATO", "id:" + id,
                   "ticker:" + DbLogger.s(old != null ? old.get("ticker") : null),
                   "nome:" + DbLogger.s(old != null ? old.get("name") : null));
        return Map.of("id", id, "deleted", true);
    }

    // ─── Log ──────────────────────────────────────────────────────────────────

    /** Espone il logger per uso esterno (es. Bridge). */
    public DbLogger getLogger() { return logger; }

    /** Prima/ultima data e totale righe nel file di log, con percorso e dimensione file. */
    public Map<String, Object> getLogInfo() {
        Map<String, Object> result = new java.util.HashMap<>(logger.getLogDateRange());
        java.nio.file.Path logFile = logger.getLogFile();
        if (logFile != null) {
            result.put("log_path", logFile.toString());
            result.put("log_dir",  logFile.getParent() != null ? logFile.getParent().toString() : "");
            try { result.put("log_size", java.nio.file.Files.size(logFile)); }
            catch (java.io.IOException ignored) {}
        }
        return result;
    }

    /** Elimina le righe di log di sistema (avvio, backup, manutenzione). */
    public Map<String, Object> purgeSystemLog() {
        Map<String, Object> result = logger.purgeSystemEntries();
        if (!result.containsKey("error"))
            logger.log("MANUTENZIONE", "LOG SISTEMA RIPULITO: eliminate " + result.get("deleted") + " righe");
        return result;
    }

    /** Elimina le righe di log precedenti a cutoffDate (yyyy-MM-dd). */
    public Map<String, Object> purgeLog(String cutoffDate) {
        Map<String, Object> result = logger.purgeLogBefore(cutoffDate);
        if (!result.containsKey("error"))
            logger.log("MANUTENZIONE", "LOG RIPULITO: eliminate " + result.get("deleted") + " righe prima di " + cutoffDate);
        return result;
    }

    // ─── Allegati ─────────────────────────────────────────────────────────────

    /** Salva il nome file (relativo alla cartella allegati) su una transazione. */
    public void setAttachment(int txId, String relativePath) throws SQLException {
        execute("UPDATE transactions SET attachment_path=? WHERE id=?", relativePath, txId);
        touchSyncMeta();
    }

    /** Rimuove il riferimento all'allegato da una transazione (non cancella il file). */
    public void removeAttachment(int txId) throws SQLException {
        execute("UPDATE transactions SET attachment_path=NULL WHERE id=?", txId);
        touchSyncMeta();
    }

    /** Restituisce le ultime {@code lines} righe del file di log come lista di stringhe. */
    public Map<String, Object> readLog(int lines) {
        Path logFile = logger.getLogFile();
        if (logFile == null || !Files.exists(logFile))
            return Map.of("lines", List.of(), "path", "");
        try {
            List<String> all = Files.readAllLines(logFile, java.nio.charset.StandardCharsets.UTF_8);
            int from = Math.max(0, all.size() - lines);
            return Map.of("lines", all.subList(from, all.size()), "path", logFile.toString());
        } catch (IOException e) {
            return Map.of("lines", List.of(), "path", logFile.toString(), "error", e.getMessage());
        }
    }

    // ─── Statistiche ──────────────────────────────────────────────────────────

    /** Statistiche dashboard per un anno: entrate/uscite/netto, conteggio transazioni e patrimonio totale. */
    public Map<String, Object> getDashboardStats(int year) throws SQLException {
        String yy = String.valueOf(year);
        Map<String,Object> yearly = queryOne("""
            SELECT COALESCE(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END),0) AS income,
                   COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) AS expenses,
                   COUNT(*) AS transaction_count
            FROM transactions WHERE strftime('%Y',date)=?
        """, yy);
        Map<String,Object> balance = queryOne("""
            SELECT COALESCE(SUM(CASE
                WHEN a.type = 'investment' THEN
                    COALESCE((SELECT SUM(CASE WHEN p.asset_type='bond'
                              THEN p.quantity * COALESCE(NULLIF(p.current_price,0), p.avg_price) / 100.0
                              ELSE p.quantity * COALESCE(NULLIF(p.current_price,0), p.avg_price) END)
                              FROM portfolio p WHERE p.account_id = a.id), 0)
                ELSE
                    a.initial_balance + COALESCE((
                        SELECT SUM(CASE WHEN t.type='income'                             THEN  t.amount
                                        WHEN t.type='expense'                            THEN -t.amount
                                        WHEN t.type='transfer' AND t.account_id    = a.id THEN -t.amount
                                        WHEN t.type='transfer' AND t.to_account_id = a.id THEN  t.amount
                                        ELSE 0 END)
                        FROM transactions t WHERE t.account_id = a.id OR t.to_account_id = a.id
                    ), 0)
                END), 0) AS total,
                COALESCE(SUM(CASE WHEN a.type='investment' THEN
                    COALESCE((SELECT SUM(CASE WHEN p.asset_type='bond' THEN p.quantity ELSE 0 END)
                              FROM portfolio p WHERE p.account_id = a.id), 0)
                    ELSE 0 END), 0) AS bond_nominal_total
            FROM accounts a
        """);
        double inc  = yearly != null ? ((Number)yearly.get("income")).doubleValue()   : 0;
        double exp  = yearly != null ? ((Number)yearly.get("expenses")).doubleValue() : 0;
        double bal  = balance != null ? ((Number)balance.get("total")).doubleValue()  : 0;
        double bondNom = balance != null && balance.get("bond_nominal_total") != null
                ? ((Number)balance.get("bond_nominal_total")).doubleValue() : 0;
        int    cnt  = yearly != null ? ((Number)yearly.get("transaction_count")).intValue() : 0;
        return Map.of("income",inc,"expenses",exp,"balance",bal,
                      "bond_nominal_total",bondNom,
                      "net",inc-exp,"transaction_count",cnt);
    }

    /** Somma income/expenses in un range di date inclusivo. Per confronti day-exact YTD. */
    public Map<String, Object> getStatsByDateRange(String dateFrom, String dateTo) throws SQLException {
        Map<String,Object> r = queryOne("""
            SELECT COALESCE(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END),0) AS income,
                   COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) AS expenses
            FROM transactions WHERE date >= ? AND date <= ?
        """, dateFrom, dateTo);
        double inc = r != null ? ((Number)r.get("income")).doubleValue()   : 0;
        double exp = r != null ? ((Number)r.get("expenses")).doubleValue() : 0;
        return Map.of("income", inc, "expenses", exp, "net", inc - exp);
    }

    /** Entrate/uscite per mese di un anno (grafico a barre dashboard). */
    public List<Map<String, Object>> getMonthlyChartData(int year) throws SQLException {
        return queryList("""
            SELECT CAST(strftime('%m',date) AS INTEGER) AS month,
                SUM(CASE WHEN type='income'  THEN amount ELSE 0 END) AS income,
                SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expenses
            FROM transactions WHERE strftime('%Y',date)=? AND type IN ('income','expense')
            GROUP BY strftime('%m',date) ORDER BY month
        """, String.valueOf(year));
    }

    /** Totale per categoria (income o expense) in un anno, split inclusi (grafico a torta). */
    public List<Map<String, Object>> getCategoryChartData(int year, String type) throws SQLException {
        return queryList("""
            WITH cat_amounts AS (
                SELECT t.category_id, t.amount FROM transactions t
                WHERE t.category_id IS NOT NULL
                  AND NOT EXISTS (SELECT 1 FROM transaction_splits ts WHERE ts.transaction_id = t.id)
                  AND strftime('%Y',t.date)=? AND t.type=?
                UNION ALL
                SELECT ts.category_id, ts.amount FROM transactions t
                JOIN transaction_splits ts ON ts.transaction_id = t.id
                WHERE strftime('%Y',t.date)=? AND t.type=?
            )
            SELECT c.name, c.color, c.icon, SUM(ca.amount) AS total
            FROM cat_amounts ca JOIN categories c ON ca.category_id = c.id
            GROUP BY ca.category_id ORDER BY total DESC
        """, String.valueOf(year), type, String.valueOf(year), type);
    }

    // ─── Manutenzione DB ────────────────────────────────────────────────────────

    /** Esegue un'operazione che richiede accesso esclusivo al file DB (es. VACUUM).
     *  Chiude la connessione principale, esegue l'operazione, poi la riapre. */
    @FunctionalInterface
    private interface DbOp { void run(Connection c) throws SQLException; }

    private void withExclusiveAccess(DbOp op) throws SQLException {
        conn.close();
        try (Connection plain = DriverManager.getConnection("jdbc:sqlite:" + currentDbPath)) {
            op.run(plain);
        } finally {
            conn = openConnection(currentDbPath);
        }
    }

    /** Info diagnostiche sul DB: dimensione file, pagine, spazio libero, conteggi, versione schema. */
    public Map<String, Object> dbGetInfo() throws SQLException, IOException {
        long fileSize = Files.exists(Path.of(currentDbPath)) ? Files.size(Path.of(currentDbPath)) : 0;
        var pageCount = queryOne("PRAGMA page_count");
        var pageSize  = queryOne("PRAGMA page_size");
        var freePages = queryOne("PRAGMA freelist_count");
        long pc = ((Number) pageCount.get("page_count")).longValue();
        long ps = ((Number) pageSize.get("page_size")).longValue();
        long fp = ((Number) freePages.get("freelist_count")).longValue();
        var txCount   = queryOne("SELECT COUNT(*) AS n FROM transactions");
        var accCount  = queryOne("SELECT COUNT(*) AS n FROM accounts");
        var svRow     = queryOne("SELECT version FROM schema_version");
        int txN  = txCount != null ? ((Number) txCount.get("n")).intValue()  : 0;
        int accN = accCount != null ? ((Number) accCount.get("n")).intValue() : 0;
        int sv   = svRow   != null ? ((Number) svRow.get("version")).intValue() : 0;
        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("file_size",      fileSize);

        result.put("page_count",     pc);
        result.put("page_size",      ps);
        result.put("free_pages",     fp);
        result.put("free_bytes",     fp * ps);
        result.put("tx_count",       txN);
        result.put("acc_count",      accN);
        result.put("schema_version", sv);
        result.put("schema_latest",  SCHEMA_VERSION);
        return result;
    }

    /** Compatta il file DB (VACUUM) e riporta i byte liberati. */
    public Map<String, Object> dbVacuum() throws SQLException, IOException {
        long sizeBefore = Files.exists(Path.of(currentDbPath)) ? Files.size(Path.of(currentDbPath)) : 0;
        withExclusiveAccess(c -> {
            try (Statement st = c.createStatement()) { st.execute("VACUUM"); }
        });
        long sizeAfter = Files.exists(Path.of(currentDbPath)) ? Files.size(Path.of(currentDbPath)) : 0;
        logger.log("MANUTENZIONE", String.format("VACUUM: %d → %d bytes (liberati: %d)", sizeBefore, sizeAfter, sizeBefore - sizeAfter));
        return Map.of("ok", true, "size_before", sizeBefore, "size_after", sizeAfter, "saved", sizeBefore - sizeAfter);
    }

    /** Verifica l'integrità del DB (PRAGMA integrity_check). */
    public Map<String, Object> dbIntegrityCheck() throws SQLException {
        var rows = queryList("PRAGMA integrity_check");
        boolean ok = rows.size() == 1 && "ok".equals(String.valueOf(rows.get(0).get("integrity_check")));
        List<String> messages = rows.stream().map(r -> String.valueOf(r.get("integrity_check"))).toList();
        logger.log("MANUTENZIONE", "integrity_check: " + (ok ? "OK" : String.join("; ", messages)));
        return Map.of("ok", ok, "messages", messages);
    }

    /** Ricostruisce gli indici (REINDEX) e ottimizza (PRAGMA optimize). */
    public Map<String, Object> dbReindex() throws SQLException {
        withExclusiveAccess(c -> {
            try (Statement st = c.createStatement()) { st.execute("REINDEX"); }
            try (Statement st = c.createStatement()) { st.execute("PRAGMA optimize"); }
        });
        logger.log("MANUTENZIONE", "REINDEX + PRAGMA optimize");
        return Map.of("ok", true);
    }

    /** Aggiorna le statistiche del query planner (ANALYZE) e le restituisce. */
    public Map<String, Object> dbAnalyze() throws SQLException {
        try (Statement st = conn.createStatement()) { st.execute("ANALYZE"); }
        List<Map<String, Object>> stats = queryList(
            "SELECT tbl AS name, stat FROM sqlite_stat1 ORDER BY tbl");
        logger.log("MANUTENZIONE", "ANALYZE: " + stats.size() + " indici analizzati");
        return Map.of("ok", true, "stats", stats);
    }


    // ─── Analytics ────────────────────────────────────────────────────────────

    /** Entrate/uscite mensili degli ultimi N mesi (per i grafici Analytics). */
    public List<Map<String, Object>> getMonthlyBalance(int months) throws SQLException {
        java.time.LocalDate start = java.time.LocalDate.now()
                .withDayOfMonth(1).minusMonths(months - 1);
        String sql = """
            SELECT strftime('%Y-%m', date) AS ym,
                   SUM(CASE WHEN type='income'  THEN ABS(amount) ELSE 0 END) AS income,
                   SUM(CASE WHEN type='expense' THEN ABS(amount) ELSE 0 END) AS expense
            FROM transactions
            WHERE date >= ? AND type IN ('income','expense')
            GROUP BY ym
            ORDER BY ym
            """;
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, start.toString());
            return toList(ps.executeQuery());
        }
    }

    /**
     * Andamento del saldo per conto, mese per mese, negli ultimi N mesi: ricostruisce
     * il saldo cumulato di ogni conto a fine di ciascun mese (serie per il grafico patrimonio).
     */
    public Map<String, Object> getAccountBalanceHistory(int months) throws SQLException {
        LocalDate today = LocalDate.now();
        LocalDate startDate = today.withDayOfMonth(1).minusMonths(months - 1);
        String startStr = startDate.toString();

        // Lista completa mesi: startDate → mese corrente
        List<String> allMonths = new ArrayList<>();
        for (LocalDate d = startDate; !d.isAfter(today); d = d.plusMonths(1))
            allMonths.add(d.toString().substring(0, 7));

        // Saldi correnti e metadati conti
        List<Map<String, Object>> allAccounts = getAccounts();
        Map<Integer, Double> currentBalances = new HashMap<>();
        for (var a : allAccounts)
            currentBalances.put(((Number) a.get("id")).intValue(), ((Number) a.get("balance")).doubleValue());

        // Delta mensili per conti non-investment
        String deltaSql = """
            SELECT sub.account_id, sub.ym, SUM(sub.net) AS net_delta
            FROM (
                SELECT t.account_id,
                       strftime('%Y-%m', t.date) AS ym,
                       CASE WHEN t.type='income'   THEN  ABS(t.amount)
                            WHEN t.type='expense'  THEN -ABS(t.amount)
                            WHEN t.type='transfer' THEN -ABS(t.amount)
                            ELSE 0 END AS net
                FROM transactions t
                JOIN accounts a ON a.id = t.account_id AND a.type != 'investment'
                WHERE t.date >= ?
                UNION ALL
                SELECT t.to_account_id AS account_id,
                       strftime('%Y-%m', t.date) AS ym,
                       ABS(t.amount) AS net
                FROM transactions t
                JOIN accounts a ON a.id = t.to_account_id AND a.type != 'investment'
                WHERE t.type = 'transfer' AND t.date >= ?
            ) sub
            GROUP BY sub.account_id, sub.ym
            ORDER BY sub.account_id, sub.ym
            """;
        Map<Integer, Map<String, Double>> deltasByAccount = new HashMap<>();
        try (PreparedStatement ps = conn.prepareStatement(deltaSql)) {
            ps.setString(1, startStr); ps.setString(2, startStr);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    int aid = rs.getInt("account_id");
                    deltasByAccount.computeIfAbsent(aid, k -> new HashMap<>())
                        .put(rs.getString("ym"), rs.getDouble("net_delta"));
                }
            }
        }

        // Delta qty mensili per posizioni portfolio (conti investment)
        String ptSql = """
            SELECT pt.portfolio_id,
                   strftime('%Y-%m', pt.date) AS ym,
                   SUM(CASE WHEN pt.type='buy'  THEN  pt.quantity
                            WHEN pt.type='sell' THEN -pt.quantity
                            ELSE 0 END) AS qty_delta
            FROM portfolio_transactions pt
            WHERE pt.type IN ('buy','sell') AND pt.date >= ?
            GROUP BY pt.portfolio_id, strftime('%Y-%m', pt.date)
            ORDER BY pt.portfolio_id, strftime('%Y-%m', pt.date)
            """;
        Map<Integer, Map<String, Double>> ptDeltasByPos = new HashMap<>();
        try (PreparedStatement ps = conn.prepareStatement(ptSql)) {
            ps.setString(1, startStr);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    int pid = rs.getInt("portfolio_id");
                    ptDeltasByPos.computeIfAbsent(pid, k -> new HashMap<>())
                        .put(rs.getString("ym"), rs.getDouble("qty_delta"));
                }
            }
        }

        // Posizioni portfolio per account
        List<Map<String, Object>> positions = queryList(
            "SELECT id, account_id, asset_type, current_price, avg_price, face_value, quantity AS current_qty FROM portfolio");
        Map<Integer, List<Map<String, Object>>> possByAccount = new HashMap<>();
        for (var pos : positions)
            possByAccount.computeIfAbsent(((Number) pos.get("account_id")).intValue(), k -> new ArrayList<>()).add(pos);

        int n = allMonths.size();
        List<Map<String, Object>> monthly = new ArrayList<>();

        for (var acc : allAccounts) {
            int aid = ((Number) acc.get("id")).intValue();
            boolean isInv = "investment".equals(acc.get("type"));
            double[] vals = new double[n];

            if (isInv) {
                // Ricostruzione valore portfolio a ritroso per ogni posizione
                for (var pos : possByAccount.getOrDefault(aid, Collections.emptyList())) {
                    int pid = ((Number) pos.get("id")).intValue();
                    double curQty = ((Number) pos.get("current_qty")).doubleValue();
                    String at = (String) pos.get("asset_type");
                    double cp = pos.get("current_price") != null ? ((Number) pos.get("current_price")).doubleValue() : 0;
                    double ap = pos.get("avg_price")     != null ? ((Number) pos.get("avg_price")).doubleValue()     : 0;
                    // obbligazioni: prezzo in % (es. 97.5), valore mercato per unità = price/100
                    // azioni: prezzo in € per unità
                    // Nota: usa current_price corrente come proxy per tutti i mesi storici (no storia prezzi)
                    double price = "bond".equals(at)
                        ? (cp > 0 ? cp / 100.0 : ap / 100.0)
                        : (cp > 0 ? cp : ap);
                    var ptMap = ptDeltasByPos.getOrDefault(pid, Collections.emptyMap());

                    double[] qtys = new double[n];
                    qtys[n - 1] = curQty;
                    for (int i = n - 2; i >= 0; i--)
                        qtys[i] = qtys[i + 1] - ptMap.getOrDefault(allMonths.get(i + 1), 0.0);
                    for (int i = 0; i < n; i++)
                        vals[i] += Math.max(0, qtys[i]) * price;
                }
            } else {
                // Ricostruzione saldo a ritroso dai delta mensili
                var deltaMap = deltasByAccount.getOrDefault(aid, Collections.emptyMap());
                vals[n - 1] = currentBalances.get(aid);
                for (int i = n - 2; i >= 0; i--)
                    vals[i] = vals[i + 1] - deltaMap.getOrDefault(allMonths.get(i + 1), 0.0);
            }

            for (int i = 0; i < n; i++) {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("account_id", aid);
                row.put("ym", allMonths.get(i));
                row.put("balance", vals[i]);
                monthly.add(row);
            }
        }

        List<Map<String, Object>> accountMeta = allAccounts.stream().map(a -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", a.get("id")); m.put("name", a.get("name"));
            m.put("color", a.get("color")); m.put("icon", a.get("icon"));
            m.put("type", a.get("type")); m.put("is_closed", a.get("is_closed"));
            return m;
        }).collect(Collectors.toList());

        Map<String, Object> ret = new LinkedHashMap<>();
        ret.put("accounts", accountMeta);
        ret.put("monthly", monthly);
        return ret;
    }

    /** Mese (YYYY-MM) della transazione più vecchia, per limitare i range dei grafici. */
    public String getOldestTransactionMonth() throws SQLException {
        String sql = "SELECT strftime('%Y-%m', MIN(date)) AS ym FROM transactions WHERE type IN ('income','expense')";
        try (Statement s = conn.createStatement(); ResultSet rs = s.executeQuery(sql)) {
            return rs.next() ? rs.getString("ym") : null;
        }
    }

    // ─── Previsioni ──────────────────────────────────────────────────────────

    /** Somma le transazioni pianificate per categoria nel periodo fromDate..toDate */
    public List<Map<String, Object>> getProjectionByCategory(String fromDate, String toDate) throws SQLException {
        LocalDate from     = LocalDate.parse(fromDate);
        LocalDate to       = LocalDate.parse(toDate);
        LocalDate schedFrom = from.plusDays(1); // coerente con getProjection: esclude oggi (già nel saldo reale)
        var scheds = getScheduled().stream()
                .filter(s -> Integer.valueOf(1).equals(s.get("is_active")))
                .toList();
        Map<Integer, double[]> catAmounts = new LinkedHashMap<>();
        Map<Integer, String[]> catMeta    = new HashMap<>();
        for (var s : scheds) {
            String type = (String) s.get("type");
            if ("transfer".equals(type)) continue;
            Object catIdObj = s.get("category_id");
            int    catKey   = catIdObj != null ? ((Number) catIdObj).intValue() : -1;
            String catName  = s.get("category_name") != null ? (String) s.get("category_name") : "Senza categoria";
            String freq     = (String) s.get("frequency");
            LocalDate start = LocalDate.parse((String) s.get("start_date"));
            LocalDate end   = s.get("end_date") != null ? LocalDate.parse((String) s.get("end_date")) : to;
            if (end.isAfter(to)) end = to;
            LocalDate cur   = firstOccurrenceFrom(start, freq, schedFrom);
            if (cur == null) continue;
            double amount = ((Number) s.get("amount")).doubleValue();
            while (!cur.isAfter(end)) {
                catAmounts.computeIfAbsent(catKey, k -> new double[]{0})[0] += amount;
                catMeta.put(catKey, new String[]{catName, type});
                if ("once".equals(freq)) break;
                cur = advanceDate(cur, freq);
                if (cur == null) break;
            }
        }
        List<Map<String, Object>> result = new ArrayList<>();
        for (var e : catAmounts.entrySet()) {
            Map<String, Object> row = new HashMap<>();
            row.put("category_id",      e.getKey() < 0 ? null : e.getKey());
            row.put("category_name",    catMeta.get(e.getKey())[0]);
            row.put("type",             catMeta.get(e.getKey())[1]);
            row.put("projected_amount", e.getValue()[0]);
            result.add(row);
        }
        result.sort((a, b) -> ((String) a.get("category_name")).compareToIgnoreCase((String) b.get("category_name")));
        return result;
    }

    /** Salva una previsione (saldo proiettato a una data) con le sue categorie previste. */
    public int saveForecast(String forecastDate, double projectedBalance, JsonArray categories) throws SQLException {
        execute("INSERT INTO forecasts (forecast_date, projected_balance) VALUES (?,?)",
                forecastDate, r2(projectedBalance));
        var r  = queryOne("SELECT last_insert_rowid() AS id");
        int id = ((Number) r.get("id")).intValue();
        for (var el : categories) {
            var cat = el.getAsJsonObject();
            execute("INSERT INTO forecast_categories (forecast_id, category_id, category_name, category_type, projected_amount) VALUES (?,?,?,?,?)",
                    id,
                    cat.has("category_id") && !cat.get("category_id").isJsonNull() ? cat.get("category_id").getAsInt() : null,
                    cat.get("category_name").getAsString(),
                    cat.get("type").getAsString(),
                    r2(cat.get("projected_amount").getAsDouble()));
        }
        logger.log("PREVISIONE SALVATA", "data:" + forecastDate, "saldo:" + DbLogger.amt(projectedBalance));
        return id;
    }

    /** Elenco previsioni salvate, con flag is_ready (data raggiunta) e numero categorie. */
    public List<Map<String, Object>> getForecasts() throws SQLException {
        String today = LocalDate.now().toString();
        var list = queryList(
                "SELECT f.*, (SELECT COUNT(*) FROM forecast_categories WHERE forecast_id=f.id) AS cat_count " +
                "FROM forecasts f ORDER BY f.forecast_date DESC");
        for (var f : list)
            f.put("is_ready", ((String) f.get("forecast_date")).compareTo(today) <= 0 ? 1 : 0);
        return list;
    }

    /** Elimina una previsione (categorie in cascata via FK). */
    public void deleteForecast(int id) throws SQLException {
        execute("DELETE FROM forecasts WHERE id=?", id);
        logger.log("PREVISIONE ELIMINATA", "id:" + id);
    }

    /** Archivia una previsione (la nasconde dall'elenco attivo). */
    public void archiveForecast(int id) throws SQLException {
        execute("UPDATE forecasts SET archived=1 WHERE id=?", id);
        logger.log("PREVISIONE ARCHIVIATA", "id:" + id);
    }

    /**
     * Dettaglio di una previsione: per ogni categoria confronta il previsto con lo speso/incassato
     * reale nel periodo (created_at..forecast_date), calcola la differenza e il saldo reale a fine periodo.
     */
    public Map<String, Object> getForecastDetail(int id) throws SQLException {
        var forecast = queryOne("SELECT * FROM forecasts WHERE id=?", id);
        if (forecast == null) throw new SQLException("Previsione non trovata");
        String createdAt    = ((String) forecast.get("created_at")).substring(0, 10);
        String forecastDate = (String) forecast.get("forecast_date");
        var cats = new java.util.ArrayList<>(queryList("SELECT * FROM forecast_categories WHERE forecast_id=? ORDER BY category_name", id));
        for (var cat : cats) {
            Object catId  = cat.get("category_id");
            String txType = (String) cat.get("category_type");
            double actual = 0;
            if (catId != null) {
                var row = queryOne("""
                        SELECT COALESCE(SUM(amt),0) AS tot FROM (
                            SELECT amount AS amt FROM transactions
                            WHERE category_id=? AND date>=? AND date<=? AND type=?
                              AND NOT EXISTS (SELECT 1 FROM transaction_splits ts WHERE ts.transaction_id = id)
                            UNION ALL
                            SELECT ts.amount AS amt FROM transactions t
                            JOIN transaction_splits ts ON ts.transaction_id = t.id
                            WHERE ts.category_id=? AND t.date>=? AND t.date<=? AND t.type=?
                        )""",
                        ((Number) catId).intValue(), createdAt, forecastDate, txType,
                        ((Number) catId).intValue(), createdAt, forecastDate, txType);
                if (row != null) actual = ((Number) row.get("tot")).doubleValue();
            }
            cat.put("actual_amount", actual);
            double proj = ((Number) cat.get("projected_amount")).doubleValue();
            // diff > 0 = sei stato bravo: spese < previsto (uscite) o incassi > previsto (entrate)
            cat.put("diff", "income".equals(txType) ? actual - proj : proj - actual);
        }
        // Saldo reale alla forecast_date
        var balRow = queryOne(
                "SELECT SUM(a.initial_balance + " +
                "COALESCE((SELECT SUM(CASE WHEN t.type='income' THEN t.amount " +
                "  WHEN t.type='expense' THEN -t.amount " +
                "  WHEN t.type='transfer' AND t.account_id=a.id THEN -t.amount ELSE 0 END) " +
                "  FROM transactions t WHERE t.account_id=a.id AND t.date<=?),0) " +
                "+ COALESCE((SELECT SUM(t.amount) FROM transactions t " +
                "  WHERE t.to_account_id=a.id AND t.type='transfer' AND t.date<=?),0)) AS total " +
                "FROM accounts a WHERE a.type!='investment'",
                forecastDate, forecastDate);
        double actualBalance = (balRow != null && balRow.get("total") != null)
                ? ((Number) balRow.get("total")).doubleValue() : 0.0;
        cats.sort(java.util.Comparator.comparingDouble(c -> ((Number) c.get("diff")).doubleValue()));
        forecast.put("categories",     cats);
        forecast.put("actual_balance", actualBalance);
        return forecast;
    }

    // ── Previsione Saldo — transazioni escluse ────────────────────────────────

    /** Transazioni escluse manualmente dal calcolo della Previsione Saldo. */
    public List<Map<String, Object>> getForecastExcluded() throws SQLException {
        return queryList("""
                SELECT fe.transaction_id,
                       strftime('%Y-%m', t.date) AS ym,
                       t.amount,
                       t.type
                FROM forecast_excluded fe
                JOIN transactions t ON t.id = fe.transaction_id
                ORDER BY ym, fe.transaction_id""");
    }

    /** Esclude una transazione dalla Previsione Saldo. */
    public void addForecastExcluded(int txId) throws SQLException {
        execute("INSERT OR IGNORE INTO forecast_excluded (transaction_id) VALUES (?)", txId);
    }

    /** Reinserisce una transazione precedentemente esclusa nella Previsione Saldo. */
    public void removeForecastExcluded(int txId) throws SQLException {
        execute("DELETE FROM forecast_excluded WHERE transaction_id = ?", txId);
    }

    // ── Previsione Saldo — struttura spese per categoria ─────────────────────
    // Restituisce solo i mesi COMPLETATI (esclude il mese corrente, parziale).
    //   categories: nome, frequency (0-1), avg_monthly (media sui mesi completati)
    //   monthly:    ym, fixed_exp (cat freq≥0.75), sporadic_exp (cat freq<0.75)
    /**
     * Struttura delle spese per la Previsione Saldo: per ogni categoria calcola frequenza
     * (in quanti mesi compare) e media mensile sui soli mesi completati, distinguendo spese
     * fisse (freq≥0.75) da sporadiche. Esclude il mese corrente perché parziale.
     */
    public Map<String, Object> getForecastExpenseSplit(int histMonths) throws SQLException {
        java.time.LocalDate today     = java.time.LocalDate.now();
        java.time.LocalDate startDate = today.withDayOfMonth(1).minusMonths(histMonths - 1);
        java.time.LocalDate endExcl   = today.withDayOfMonth(1); // primo del mese corrente (escluso)
        String dateFrom       = startDate.toString();
        String dateTo         = endExcl.toString();
        int    completedMonths = histMonths - 1; // mesi completati effettivi (escluso il corrente)

        List<Map<String, Object>> categories = queryList("""
                SELECT CASE
                         WHEN p.name IS NOT NULL THEN p.name || ':' || c.name
                         WHEN c.name IS NOT NULL THEN c.name
                         ELSE 'Senza categoria'
                       END AS name,
                       ROUND(COUNT(DISTINCT strftime('%Y-%m', t.date)) * 1.0 / ?, 3) AS frequency,
                       ROUND(SUM(t.amount) / ?, 2) AS avg_monthly,
                       ROUND(SUM(t.amount), 2) AS total
                FROM transactions t
                LEFT JOIN categories c ON c.id = t.category_id
                LEFT JOIN categories p ON p.id = c.parent_id
                WHERE t.type = 'expense' AND t.date >= ? AND t.date < ?
                  AND t.id NOT IN (SELECT transaction_id FROM forecast_excluded)
                GROUP BY t.category_id
                ORDER BY total DESC
                LIMIT 50
                """, completedMonths, completedMonths, dateFrom, dateTo);

        // Per ogni mese completato: split fisso (freq≥0.75) vs saltuario (freq<0.75)
        List<Map<String, Object>> monthly = queryList("""
                WITH freq AS (
                    SELECT category_id,
                           COUNT(DISTINCT strftime('%Y-%m', date)) * 1.0 / ? AS freq
                    FROM transactions
                    WHERE type = 'expense' AND date >= ? AND date < ?
                      AND id NOT IN (SELECT transaction_id FROM forecast_excluded)
                    GROUP BY category_id
                )
                SELECT strftime('%Y-%m', t.date) AS ym,
                       ROUND(SUM(CASE WHEN COALESCE(f.freq, 0) >= 0.75 THEN t.amount ELSE 0 END), 2) AS fixed_exp,
                       ROUND(SUM(CASE WHEN COALESCE(f.freq, 0) <  0.75 THEN t.amount ELSE 0 END), 2) AS sporadic_exp
                FROM transactions t
                LEFT JOIN freq f ON f.category_id = t.category_id
                WHERE t.type = 'expense' AND t.date >= ? AND t.date < ?
                  AND t.id NOT IN (SELECT transaction_id FROM forecast_excluded)
                GROUP BY ym
                ORDER BY ym
                """, completedMonths, dateFrom, dateTo, dateFrom, dateTo);

        return Map.of("categories", categories, "monthly", monthly);
    }

    // ── Previsione Saldo — proiezione mensile delle pianificate attive ───────
    // Espande le scheduled_transactions attive nei prossimi `months` mesi (incluso
    // il mese corrente). Ritorna per ogni mese:
    //   ym, sched_income, sched_expense
    //   sched_income_remaining, sched_expense_remaining   (solo mese corrente:
    //   occorrenze da oggi compreso in poi; per gli altri mesi = totale)
    // I trasferimenti tra conti propri sono esclusi (non spostano il saldo totale).
    /**
     * Proietta entrate/uscite pianificate per i prossimi N mesi (trasferimenti esclusi).
     * Per il mese corrente espone anche i valori "remaining" (solo occorrenze da oggi in poi).
     */
    public List<Map<String, Object>> getScheduledForecast(int months) throws SQLException {
        java.time.LocalDate today  = java.time.LocalDate.now();
        java.time.LocalDate monStart = today.withDayOfMonth(1);
        java.time.LocalDate horizon  = monStart.plusMonths(months).minusDays(1);

        var scheds = getScheduled().stream()
                .filter(s -> Integer.valueOf(1).equals(s.get("is_active")))
                .filter(s -> !"transfer".equals(s.get("type")))
                .toList();

        Map<String, double[]> agg = new TreeMap<>();
        for (int i = 0; i < months; i++) {
            java.time.LocalDate ms = monStart.plusMonths(i);
            String ym = String.format("%04d-%02d", ms.getYear(), ms.getMonthValue());
            agg.put(ym, new double[]{0, 0, 0, 0});
        }

        for (var s : scheds) {
            java.time.LocalDate start   = java.time.LocalDate.parse((String) s.get("start_date"));
            String freq                  = (String) s.get("frequency");
            String edStr                 = (String) s.get("end_date");
            java.time.LocalDate endDate  = edStr != null ? java.time.LocalDate.parse(edStr) : horizon;
            if (endDate.isAfter(horizon)) endDate = horizon;
            double amount = ((Number) s.get("amount")).doubleValue();
            String type   = (String) s.get("type");

            // Parto dalla prima occorrenza dentro [monStart, horizon]
            java.time.LocalDate cur = firstOccurrenceFrom(start, freq, monStart);
            if (cur == null) continue;
            while (!cur.isAfter(endDate)) {
                String ym = String.format("%04d-%02d", cur.getYear(), cur.getMonthValue());
                double[] row = agg.get(ym);
                if (row != null) {
                    boolean fromTodayOn = !cur.isBefore(today);
                    if ("income".equals(type)) {
                        row[0] += amount;
                        if (fromTodayOn) row[2] += amount;
                    } else if ("expense".equals(type)) {
                        row[1] += amount;
                        if (fromTodayOn) row[3] += amount;
                    }
                }
                if ("once".equals(freq)) break;
                java.time.LocalDate nxt = advanceDate(cur, freq);
                if (nxt == null || !nxt.isAfter(cur)) break;
                cur = nxt;
            }
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (var e : agg.entrySet()) {
            String ym = e.getKey();
            double[] r = e.getValue();
            boolean isCurrentMonth = ym.equals(String.format("%04d-%02d", today.getYear(), today.getMonthValue()));
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("ym", ym);
            row.put("sched_income",  Math.round(r[0] * 100.0) / 100.0);
            row.put("sched_expense", Math.round(r[1] * 100.0) / 100.0);
            // Per il mese corrente "remaining" è quanto avviene da oggi in poi;
            // per i mesi futuri remaining == totale.
            row.put("sched_income_remaining",  Math.round((isCurrentMonth ? r[2] : r[0]) * 100.0) / 100.0);
            row.put("sched_expense_remaining", Math.round((isCurrentMonth ? r[3] : r[1]) * 100.0) / 100.0);
            result.add(row);
        }
        return result;
    }

    /** Totale per categoria e per mese negli ultimi N mesi (tabella pivot di Analytics, split inclusi). */
    public List<Map<String, Object>> getCategoryMonthTable(int months) throws SQLException {
        java.time.LocalDate start = java.time.LocalDate.now()
                .withDayOfMonth(1).minusMonths(months - 1);
        String sql = """
            WITH cat_amounts AS (
                SELECT t.category_id, t.date, t.amount FROM transactions t
                WHERE t.category_id IS NOT NULL
                  AND NOT EXISTS (SELECT 1 FROM transaction_splits ts WHERE ts.transaction_id = t.id)
                  AND t.date >= ? AND t.type IN ('expense','income')
                UNION ALL
                SELECT ts.category_id, t.date, ts.amount FROM transactions t
                JOIN transaction_splits ts ON ts.transaction_id = t.id
                WHERE t.date >= ? AND t.type IN ('expense','income')
            )
            SELECT c.id, c.name, c.type, c.color, c.icon,
                   c.parent_id, p.name AS parent_name,
                   strftime('%Y-%m', ca.date) AS ym,
                   SUM(ABS(ca.amount)) AS total
            FROM cat_amounts ca
            JOIN categories c ON ca.category_id = c.id
            LEFT JOIN categories p ON c.parent_id = p.id
            GROUP BY c.id, ym ORDER BY c.type, COALESCE(p.name, c.name), c.parent_id NULLS FIRST, c.name, ym
            """;
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, start.toString());
            ps.setString(2, start.toString());
            return toList(ps.executeQuery());
        }
    }
}
