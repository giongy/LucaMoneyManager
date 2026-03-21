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

public class Database {

    private Connection conn;
    private String currentDbPath;
    private final DbLogger logger;

    public Database(String dbPath) throws SQLException {
        currentDbPath = dbPath;
        logger = new DbLogger(dbPath);
        conn = openConnection(dbPath);
        initSchema();
        migrate();
        seedDefaultData();
        logger.log("AVVIO", "db:" + dbPath);
    }

    private static Connection openConnection(String dbPath) throws SQLException {
        SQLiteConfig config = new SQLiteConfig();
        config.setJournalMode(SQLiteConfig.JournalMode.WAL);
        config.enforceForeignKeys(true);
        return DriverManager.getConnection("jdbc:sqlite:" + dbPath, config.toProperties());
    }

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

    public void close() throws SQLException { conn.close(); }

    /**
     * Esegue un backup del database corrente nella cartella specificata.
     * Il file avrà il formato: nomedb_YYYY-MM-DD_HH-mm-ss.db.bak
     * Mantiene al massimo maxBackups file, eliminando i più vecchi.
     */
    public String getSQLiteVersion() throws SQLException {
        try (var st = conn.createStatement();
             var rs = st.executeQuery("SELECT sqlite_version()")) {
            return rs.next() ? rs.getString(1) : "?";
        }
    }

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

        // WAL checkpoint prima di copiare per avere un file consistente
        try (Statement st = conn.createStatement()) {
            st.execute("PRAGMA wal_checkpoint(TRUNCATE)");
        } catch (SQLException ignored) {}

        Files.copy(src, dest, StandardCopyOption.REPLACE_EXISTING);
        logger.log("BACKUP ESEGUITO", "dest:" + dest);

        // Pulizia vecchi backup (ordine cronologico, elimina i più vecchi)
        if (maxBackups > 0) {
            try (DirectoryStream<Path> ds = Files.newDirectoryStream(dir, baseName + "_*.db.bak")) {
                List<Path> baks = new ArrayList<>();
                ds.forEach(baks::add);
                baks.sort(Comparator.comparing(Path::getFileName));
                while (baks.size() > maxBackups) {
                    Files.deleteIfExists(baks.remove(0));
                }
            }
        }

        return dest.toAbsolutePath().toString();
    }

    // ─── Helpers JDBC ─────────────────────────────────────────────────────────

    private List<Map<String, Object>> queryList(String sql, Object... params) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            bind(ps, params);
            return toList(ps.executeQuery());
        }
    }

    private Map<String, Object> queryOne(String sql, Object... params) throws SQLException {
        List<Map<String, Object>> rows = queryList(sql, params);
        return rows.isEmpty() ? null : rows.get(0);
    }

    private long execute(String sql, Object... params) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            bind(ps, params);
            ps.executeUpdate();
            ResultSet keys = ps.getGeneratedKeys();
            return keys.next() ? keys.getLong(1) : -1;
        }
    }

    private void executePlain(String sql) throws SQLException {
        // JDBC esegue solo la prima istruzione: splittiamo per ";"
        for (String stmt : sql.split(";")) {
            String s = stmt.strip();
            if (!s.isEmpty()) {
                try (Statement st = conn.createStatement()) { st.execute(s); }
            }
        }
    }

    private void bind(PreparedStatement ps, Object[] params) throws SQLException {
        for (int i = 0; i < params.length; i++) ps.setObject(i + 1, params[i]);
    }

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

    private String str(JsonObject p, String key) {
        return p.has(key) && !p.get(key).isJsonNull() ? p.get(key).getAsString() : null;
    }

    private Double dbl(JsonObject p, String key) {
        return p.has(key) && !p.get(key).isJsonNull() ? p.get(key).getAsDouble() : null;
    }

    private Integer intVal(JsonObject p, String key) {
        return p.has(key) && !p.get(key).isJsonNull() ? p.get(key).getAsInt() : null;
    }

    // ─── Schema ───────────────────────────────────────────────────────────────

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
        """);
    }

    private void migrate() throws SQLException {
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
        // transactions: colonne filtrate/join più frequenti
        executePlain("CREATE INDEX IF NOT EXISTS idx_tx_date        ON transactions(date)");
        executePlain("CREATE INDEX IF NOT EXISTS idx_tx_account      ON transactions(account_id)");
        executePlain("CREATE INDEX IF NOT EXISTS idx_tx_to_account   ON transactions(to_account_id)");
        executePlain("CREATE INDEX IF NOT EXISTS idx_tx_category     ON transactions(category_id)");
        executePlain("CREATE INDEX IF NOT EXISTS idx_tx_account_date ON transactions(account_id, date)");
        // categories
        executePlain("CREATE INDEX IF NOT EXISTS idx_cat_parent      ON categories(parent_id)");
        // budgets: getBudgetYear filtra per year
        executePlain("CREATE INDEX IF NOT EXISTS idx_budgets_year    ON budgets(year)");
        // scheduled_transactions: getScheduled filtra per is_active
        executePlain("CREATE INDEX IF NOT EXISTS idx_sched_active    ON scheduled_transactions(is_active)");
        // transaction_tags: lookup inverso per tag
        executePlain("CREATE INDEX IF NOT EXISTS idx_tx_tags_tag     ON transaction_tags(tag_id)");
        // portfolio
        executePlain("CREATE INDEX IF NOT EXISTS idx_portfolio_acc   ON portfolio(account_id)");

        // Aggiorna le statistiche query-planner (come ANALYZE ma incrementale)
        executePlain("PRAGMA optimize");
    }

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

    // ─── Conti ────────────────────────────────────────────────────────────────

    public List<Map<String, Object>> getAccounts() throws SQLException {
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
                END AS balance
            FROM accounts a
            LEFT JOIN transactions t ON (t.account_id = a.id OR t.to_account_id = a.id) AND a.type != 'investment'
            GROUP BY a.id
            ORDER BY a.sort_order, a.created_at
        """);
    }

    public Map<String, Object> addAccount(JsonObject p) throws SQLException {
        Map<String,Object> maxRow = queryOne("SELECT COALESCE(MAX(sort_order),0)+1 AS next_order FROM accounts");
        int nextOrder = ((Number) maxRow.get("next_order")).intValue();
        long id = execute("INSERT INTO accounts(name,type,currency,initial_balance,color,icon,is_favorite,is_closed,sort_order) VALUES(?,?,?,?,?,?,?,?,?)",
                str(p,"name"), str(p,"type"), str(p,"currency") != null ? str(p,"currency") : "EUR",
                dbl(p,"initial_balance") != null ? dbl(p,"initial_balance") : 0.0,
                str(p,"color"), str(p,"icon"),
                intVal(p,"is_favorite") != null ? intVal(p,"is_favorite") : 0, 0, nextOrder);
        logger.log("CONTO AGGIUNTO", "id:" + id, "nome:" + str(p,"name"), "tipo:" + str(p,"type"),
                   "saldo_iniziale:" + DbLogger.amt(dbl(p,"initial_balance")));
        return queryOne("SELECT * FROM accounts WHERE id=?", id);
    }

    public Map<String, Object> updateAccount(int id, JsonObject p) throws SQLException {
        execute("UPDATE accounts SET name=?,type=?,currency=?,initial_balance=?,color=?,icon=?,is_favorite=?,is_closed=? WHERE id=?",
                str(p,"name"), str(p,"type"), str(p,"currency") != null ? str(p,"currency") : "EUR",
                dbl(p,"initial_balance") != null ? dbl(p,"initial_balance") : 0.0,
                str(p,"color"), str(p,"icon"),
                intVal(p,"is_favorite") != null ? intVal(p,"is_favorite") : 0,
                intVal(p,"is_closed") != null ? intVal(p,"is_closed") : 0,
                id);
        logger.log("CONTO MODIFICATO", "id:" + id, "nome:" + str(p,"name"), "tipo:" + str(p,"type"),
                   "chiuso:" + intVal(p,"is_closed"));
        return queryOne("SELECT * FROM accounts WHERE id=?", id);
    }

    public void updateAccountOrder(JsonArray items) throws SQLException {
        for (var el : items) {
            JsonObject obj = el.getAsJsonObject();
            execute("UPDATE accounts SET sort_order=? WHERE id=?",
                    obj.get("sort_order").getAsInt(), obj.get("id").getAsInt());
        }
    }

    public Map<String, Object> deleteAccount(int id) throws SQLException {
        Map<String, Object> old = queryOne("SELECT name FROM accounts WHERE id=?", id);
        execute("DELETE FROM accounts WHERE id=?", id);
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
                   p.name  AS parent_name,
                   p.type  AS parent_type,
                   p.color AS parent_color
            FROM categories c
            LEFT JOIN categories p ON c.parent_id = p.id
            ORDER BY
                COALESCE(p.name, c.name),
                c.parent_id NULLS FIRST,
                c.name
        """);
    }

    public Map<String, Object> addCategory(JsonObject p) throws SQLException {
        Integer parentId = intVal(p, "parent_id");
        // Le sottocategorie ereditano il tipo dal parent
        String type = str(p, "type");
        if (parentId != null) {
            Map<String, Object> parent = queryOne("SELECT type FROM categories WHERE id=?", parentId);
            if (parent != null) type = (String) parent.get("type");
        }
        long id = execute(
            "INSERT INTO categories(name,type,icon,color,parent_id) VALUES(?,?,?,?,?)",
            str(p,"name"), type, str(p,"icon"), str(p,"color"), parentId);
        logger.log("CATEGORIA AGGIUNTA", "id:" + id, "nome:" + str(p,"name"), "tipo:" + type);
        return queryOne("SELECT * FROM categories WHERE id=?", id);
    }

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
        execute("UPDATE categories SET name=?,type=?,icon=?,color=?,parent_id=? WHERE id=?",
                str(p,"name"), type, str(p,"icon"), str(p,"color"), parentId, id);
        logger.log("CATEGORIA MODIFICATA", "id:" + id, "nome:" + str(p,"name"), "tipo:" + type);
        return queryOne("SELECT * FROM categories WHERE id=?", id);
    }

    public Map<String, Object> deleteCategory(int id) throws SQLException {
        Map<String, Object> existing = queryOne("SELECT * FROM categories WHERE id=?", id);
        if (existing != null && "transfer".equals(existing.get("type")))
            throw new SQLException("La categoria Trasferimento non può essere eliminata");
        logger.log("CATEGORIA ELIMINATA", "id:" + id, "nome:" + DbLogger.s(existing != null ? existing.get("name") : null));
        execute("DELETE FROM categories WHERE id=?", id);
        return Map.of("id", id, "deleted", true);
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
        Map<String, Object> from = queryOne("SELECT name FROM categories WHERE id=?", fromId);
        Map<String, Object> to   = queryOne("SELECT name FROM categories WHERE id=?", toId);
        execute("UPDATE transactions SET category_id=? WHERE category_id=?", toId, fromId);
        execute("UPDATE transactions SET category_id=? WHERE category_id IN (SELECT id FROM categories WHERE parent_id=?)", toId, fromId);
        execute("DELETE FROM categories WHERE id=?", fromId);
        logger.log("CATEGORIA RIASSEGNATA", "da:" + DbLogger.s(from != null ? from.get("name") : fromId),
                   "a:" + DbLogger.s(to != null ? to.get("name") : toId));
    }

    // ─── Transazioni ──────────────────────────────────────────────────────────

    public List<Map<String, Object>> getTransactions(JsonObject f) throws SQLException {
        StringBuilder sql = new StringBuilder("""
            SELECT t.*,
                c.name  AS category_name, c.icon AS category_icon, c.color AS category_color,
                pc.name AS parent_category_name,
                a.name  AS account_name,  a.color AS account_color,
                ta.name AS to_account_name,
                GROUP_CONCAT(CASE WHEN tg.id IS NOT NULL
                    THEN tg.id || '\u00A7' || tg.name || '\u00A7' || tg.color END, '||') AS tags_concat
            FROM transactions t
            LEFT JOIN categories c  ON t.category_id    = c.id
            LEFT JOIN categories pc ON c.parent_id      = pc.id
            LEFT JOIN accounts   a  ON t.account_id     = a.id
            LEFT JOIN accounts   ta ON t.to_account_id  = ta.id
            LEFT JOIN transaction_tags tt ON tt.transaction_id = t.id
            LEFT JOIN tags tg ON tg.id = tt.tag_id
            WHERE 1=1
        """);
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
        if (f.has("account_id") && !f.get("account_id").isJsonNull()) {
            sql.append(" AND (t.account_id=? OR t.to_account_id=?)");
            int aid = f.get("account_id").getAsInt();
            params.add(aid); params.add(aid);
        }
        if (f.has("category_id") && !f.get("category_id").isJsonNull()) {
            sql.append(" AND t.category_id=?"); params.add(f.get("category_id").getAsInt());
        }
        if (f.has("search") && !f.get("search").getAsString().isBlank()) {
            sql.append(" AND t.description LIKE ?");
            params.add("%" + str(f,"search") + "%");
        }
        boolean desc = f.has("sort_desc") && f.get("sort_desc").getAsBoolean();
        sql.append(desc ? " GROUP BY t.id ORDER BY t.date DESC, t.id DESC"
                        : " GROUP BY t.id ORDER BY t.date ASC,  t.id ASC");
        if (f.has("limit")) { sql.append(" LIMIT ?"); params.add(f.get("limit").getAsInt()); }

        List<Map<String, Object>> rows = parseTags(queryList(sql.toString(), params.toArray()));

        // Calcola saldo progressivo quando si filtra per un singolo conto
        if (f.has("account_id") && !f.get("account_id").isJsonNull()
                && !f.get("account_id").getAsString().isBlank()) {
            int accountId = f.get("account_id").getAsInt();
            Map<String, Object> acc = queryOne("SELECT initial_balance FROM accounts WHERE id=?", accountId);
            double init = acc != null && acc.get("initial_balance") != null
                    ? ((Number) acc.get("initial_balance")).doubleValue() : 0.0;
            // Tutte le transazioni del conto in ordine ASC per costruire mappa saldo
            List<Map<String, Object>> allTx = queryList("""
                SELECT id, amount, type, account_id, to_account_id FROM transactions
                WHERE account_id=? OR to_account_id=?
                ORDER BY date ASC, id ASC
            """, accountId, accountId);
            Map<Long, Double> balMap = new java.util.LinkedHashMap<>();
            double running = init;
            for (Map<String, Object> tx : allTx) {
                String type = (String) tx.get("type");
                double amount = ((Number) tx.get("amount")).doubleValue();
                long txAccId = tx.get("account_id") != null ? ((Number) tx.get("account_id")).longValue() : -1;
                if ("income".equals(type))        running += amount;
                else if ("expense".equals(type))  running -= amount;
                else if ("transfer".equals(type)) {
                    if (txAccId == accountId) running -= amount; else running += amount;
                }
                balMap.put(((Number) tx.get("id")).longValue(), running);
            }
            for (Map<String, Object> row : rows) {
                long id = ((Number) row.get("id")).longValue();
                row.put("balance", balMap.getOrDefault(id, null));
            }
        }

        return rows;
    }

    public Map<String, Object> addTransaction(JsonObject p) throws SQLException {
        int reconciled = p.has("reconciled") && !p.get("reconciled").isJsonNull()
                ? p.get("reconciled").getAsInt() : 0;
        long id = execute("""
            INSERT INTO transactions(date,amount,type,category_id,account_id,to_account_id,description,color,reconciled)
            VALUES(?,?,?,?,?,?,?,?,?)
        """, str(p,"date"), dbl(p,"amount"), str(p,"type"),
                intVal(p,"category_id"), p.get("account_id").getAsInt(),
                intVal(p,"to_account_id"),
                str(p,"description") != null ? str(p,"description") : "",
                str(p,"color"), reconciled);
        saveTags(id, p);
        Map<String, Object> tx = getTransactionById(id);
        logger.log("TRANSAZIONE AGGIUNTA",
            "id:" + id,
            "data:" + str(p,"date"),
            "tipo:" + str(p,"type"),
            "importo:" + DbLogger.amt(dbl(p,"amount")),
            "conto:" + DbLogger.s(tx != null ? tx.get("account_name") : null),
            "categoria:" + DbLogger.s(tx != null ? tx.get("category_name") : null),
            "descrizione:" + DbLogger.s(str(p,"description")));
        return tx;
    }

    public Map<String, Object> updateTransaction(int id, JsonObject p) throws SQLException {
        int reconciled = p.has("reconciled") && !p.get("reconciled").isJsonNull()
                ? p.get("reconciled").getAsInt() : 0;
        execute("""
            UPDATE transactions SET date=?,amount=?,type=?,category_id=?,account_id=?,
                to_account_id=?,description=?,color=?,reconciled=? WHERE id=?
        """, str(p,"date"), dbl(p,"amount"), str(p,"type"),
                intVal(p,"category_id"), p.get("account_id").getAsInt(),
                intVal(p,"to_account_id"),
                str(p,"description") != null ? str(p,"description") : "",
                str(p,"color"), reconciled, id);
        saveTags(id, p);
        Map<String, Object> tx = getTransactionById(id);
        logger.log("TRANSAZIONE MODIFICATA",
            "id:" + id,
            "data:" + str(p,"date"),
            "tipo:" + str(p,"type"),
            "importo:" + DbLogger.amt(dbl(p,"amount")),
            "conto:" + DbLogger.s(tx != null ? tx.get("account_name") : null),
            "categoria:" + DbLogger.s(tx != null ? tx.get("category_name") : null),
            "descrizione:" + DbLogger.s(str(p,"description")));
        return tx;
    }

    public Map<String, Object> updateTransactionReconciled(int id, boolean reconciled) throws SQLException {
        execute("UPDATE transactions SET reconciled=? WHERE id=?", reconciled ? 1 : 0, id);
        logger.log("CONCILIAZIONE", "id:" + id, "stato:" + (reconciled ? "conciliata" : "non conciliata"));
        return Map.of("ok", true);
    }

    public Map<String, Object> getAccountSummary(int accountId) throws SQLException {
        Map<String, Object> acc = queryOne("SELECT initial_balance FROM accounts WHERE id=?", accountId);
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

    public Map<String, Object> deleteTransaction(int id) throws SQLException {
        Map<String, Object> tx = queryOne(
            "SELECT t.date, t.amount, t.type, t.description, a.name AS account_name " +
            "FROM transactions t LEFT JOIN accounts a ON a.id=t.account_id WHERE t.id=?", id);
        execute("DELETE FROM transactions WHERE id=?", id);
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

    public List<Map<String, Object>> getTags() throws SQLException {
        return queryList("SELECT * FROM tags ORDER BY name");
    }

    public Map<String, Object> addTag(JsonObject p) throws SQLException {
        long id = execute("INSERT INTO tags(name,color) VALUES(?,?)",
                str(p,"name"), str(p,"color") != null ? str(p,"color") : "#58a6ff");
        logger.log("TAG AGGIUNTO", "id:" + id, "nome:" + str(p,"name"));
        return queryOne("SELECT * FROM tags WHERE id=?", id);
    }

    public Map<String, Object> updateTag(int id, JsonObject p) throws SQLException {
        execute("UPDATE tags SET name=?,color=? WHERE id=?", str(p,"name"), str(p,"color"), id);
        logger.log("TAG MODIFICATO", "id:" + id, "nome:" + str(p,"name"));
        return queryOne("SELECT * FROM tags WHERE id=?", id);
    }

    public Map<String, Object> deleteTag(int id) throws SQLException {
        Map<String, Object> old = queryOne("SELECT name FROM tags WHERE id=?", id);
        execute("DELETE FROM tags WHERE id=?", id);
        logger.log("TAG ELIMINATO", "id:" + id, "nome:" + DbLogger.s(old != null ? old.get("name") : null));
        return Map.of("id", id, "deleted", true);
    }

    // ─── Resoconti ────────────────────────────────────────────────────────────

    public List<Map<String, Object>> getReports() throws SQLException {
        return queryList("SELECT * FROM reports ORDER BY name COLLATE NOCASE");
    }

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

    public Map<String, Object> deleteReport(int id) throws SQLException {
        Map<String, Object> old = queryOne("SELECT name FROM reports WHERE id=?", id);
        execute("DELETE FROM reports WHERE id=?", id);
        logger.log("REPORT ELIMINATO", "id:" + id, "nome:" + DbLogger.s(old != null ? old.get("name") : null));
        return Map.of("id", id, "deleted", true);
    }

    private void saveTags(long txId, JsonObject p) throws SQLException {
        execute("DELETE FROM transaction_tags WHERE transaction_id=?", txId);
        if (p.has("tag_ids") && p.get("tag_ids").isJsonArray()) {
            for (var el : p.get("tag_ids").getAsJsonArray()) {
                execute("INSERT OR IGNORE INTO transaction_tags(transaction_id,tag_id) VALUES(?,?)",
                        txId, el.getAsInt());
            }
        }
    }

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

    public List<Map<String, Object>> getBudgets(int month, int year) throws SQLException {
        return queryList("""
            SELECT b.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color,
                COALESCE(SUM(CASE WHEN t.type='expense' THEN t.amount ELSE 0 END), 0) AS spent
            FROM budgets b
            JOIN categories c ON b.category_id = c.id
            LEFT JOIN transactions t ON t.category_id = b.category_id
                AND strftime('%m',t.date)=? AND strftime('%Y',t.date)=?
            WHERE b.month=? AND b.year=?
            GROUP BY b.id ORDER BY c.name
        """, String.format("%02d",month), String.valueOf(year), month, year);
    }

    public Map<String, Object> setBudget(JsonObject p) throws SQLException {
        int catId = p.get("category_id").getAsInt();
        int month = p.get("month").getAsInt();
        int year  = p.get("year").getAsInt();
        execute("""
            INSERT INTO budgets(category_id,amount,month,year) VALUES(?,?,?,?)
            ON CONFLICT(category_id,month,year) DO UPDATE SET amount=excluded.amount
        """, catId, dbl(p,"amount"), month, year);
        Map<String, Object> cat = queryOne("SELECT name FROM categories WHERE id=?", catId);
        logger.log("BUDGET IMPOSTATO",
            "categoria:" + DbLogger.s(cat != null ? cat.get("name") : catId),
            "mese:" + month + "/" + year,
            "importo:" + DbLogger.amt(dbl(p,"amount")));
        return queryOne("SELECT * FROM budgets WHERE category_id=? AND month=? AND year=?", catId, month, year);
    }

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
            SELECT t.category_id,
                   CAST(strftime('%m', t.date) AS INTEGER) AS month,
                   SUM(t.amount) AS total
            FROM transactions t
            WHERE strftime('%Y', t.date)=? AND t.type IN ('expense','income')
            GROUP BY t.category_id, strftime('%m', t.date)
        """, String.valueOf(year));
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
            SELECT category_id,
                   CAST(strftime('%m', date) AS INTEGER) AS month,
                   SUM(amount) AS total
            FROM transactions
            WHERE strftime('%Y', date)=? AND type IN ('expense','income')
            GROUP BY category_id, strftime('%m', date)
        """, String.valueOf(prevYear));

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
        """, categoryId, year, mode, masterAmount);
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
                """, categoryId, el.getAsDouble(), m, year);
            }
        }
        Map<String, Object> cat = queryOne("SELECT name FROM categories WHERE id=?", categoryId);
        logger.log("BUDGET BULK", "categoria:" + DbLogger.s(cat != null ? cat.get("name") : categoryId),
                   "anno:" + year);
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

    private void saveSchedTags(long schedId, JsonObject p) throws SQLException {
        execute("DELETE FROM scheduled_transaction_tags WHERE scheduled_id=?", schedId);
        if (p.has("tag_ids") && p.get("tag_ids").isJsonArray()) {
            for (var el : p.get("tag_ids").getAsJsonArray()) {
                execute("INSERT OR IGNORE INTO scheduled_transaction_tags(scheduled_id,tag_id) VALUES(?,?)",
                        schedId, el.getAsInt());
            }
        }
    }

    public Map<String, Object> addScheduled(JsonObject p) throws SQLException {
        long id = execute("""
            INSERT INTO scheduled_transactions
                (description,amount,type,category_id,account_id,to_account_id,
                 frequency,start_date,end_date,is_active,color,reconciled)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
        """, str(p,"description"), dbl(p,"amount"), str(p,"type"),
                intVal(p,"category_id"), p.get("account_id").getAsInt(),
                intVal(p,"to_account_id"), str(p,"frequency"),
                str(p,"start_date"), str(p,"end_date"),
                p.has("is_active") ? p.get("is_active").getAsInt() : 1,
                str(p,"color"),
                p.has("reconciled") && !p.get("reconciled").isJsonNull() ? p.get("reconciled").getAsInt() : 1);
        saveSchedTags(id, p);
        logger.log("PIANIFICATA AGGIUNTA", "id:" + id, "descrizione:" + str(p,"description"),
                   "tipo:" + str(p,"type"), "importo:" + DbLogger.amt(dbl(p,"amount")),
                   "frequenza:" + str(p,"frequency"), "inizio:" + str(p,"start_date"));
        return queryOne("SELECT * FROM scheduled_transactions WHERE id=?", id);
    }

    public Map<String, Object> updateScheduled(int id, JsonObject p) throws SQLException {
        execute("""
            UPDATE scheduled_transactions SET
                description=?,amount=?,type=?,category_id=?,account_id=?,to_account_id=?,
                frequency=?,start_date=?,end_date=?,is_active=?,color=?,reconciled=?
            WHERE id=?
        """, str(p,"description"), dbl(p,"amount"), str(p,"type"),
                intVal(p,"category_id"), p.get("account_id").getAsInt(),
                intVal(p,"to_account_id"), str(p,"frequency"),
                str(p,"start_date"), str(p,"end_date"),
                p.has("is_active") ? p.get("is_active").getAsInt() : 1,
                str(p,"color"),
                p.has("reconciled") && !p.get("reconciled").isJsonNull() ? p.get("reconciled").getAsInt() : 1,
                id);
        saveSchedTags(id, p);
        logger.log("PIANIFICATA MODIFICATA", "id:" + id, "descrizione:" + str(p,"description"),
                   "tipo:" + str(p,"type"), "importo:" + DbLogger.amt(dbl(p,"amount")),
                   "frequenza:" + str(p,"frequency"), "attiva:" + p.get("is_active"));
        return queryOne("SELECT * FROM scheduled_transactions WHERE id=?", id);
    }

    public Map<String, Object> deleteScheduled(int id) throws SQLException {
        Map<String, Object> old = queryOne("SELECT description, amount, type FROM scheduled_transactions WHERE id=?", id);
        execute("DELETE FROM scheduled_transactions WHERE id=?", id);
        logger.log("PIANIFICATA ELIMINATA", "id:" + id,
                   "descrizione:" + DbLogger.s(old != null ? old.get("description") : null),
                   "importo:" + DbLogger.amt(old != null ? old.get("amount") : null));
        return Map.of("id", id, "deleted", true);
    }

    /** Returns the next occurrence of a scheduled transaction on or after `from`. */
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

    /** Active scheduled transactions with at least one occurrence in the past 30 days. */
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

    /**
     * Avanza start_date alla prossima occorrenza dopo registeredDate.
     * Chiamato dopo aver registrato un'occorrenza pianificata: in questo modo
     * le occorrenze passate non vengono più generate e non risultano scadute.
     * Se la frequenza è "once", marca la transazione come inattiva.
     */
    public void advanceScheduled(int scheduledId, String registeredDate) throws SQLException {
        Map<String, Object> s = queryOne(
                "SELECT frequency, start_date, description FROM scheduled_transactions WHERE id=?", scheduledId);
        if (s == null) return;
        String freq = (String) s.get("frequency");
        if ("once".equals(freq)) {
            execute("UPDATE scheduled_transactions SET is_active=0 WHERE id=?", scheduledId);
            logger.log("PIANIFICATA COMPLETATA", "id:" + scheduledId,
                       "descrizione:" + DbLogger.s(s.get("description")));
            return;
        }
        LocalDate registered = LocalDate.parse(registeredDate);
        LocalDate next = advanceDate(registered, freq);
        if (next == null) return;
        execute("UPDATE scheduled_transactions SET start_date=? WHERE id=?", next.toString(), scheduledId);
        logger.log("PIANIFICATA AVANZATA", "id:" + scheduledId,
                   "descrizione:" + DbLogger.s(s.get("description")),
                   "registrata:" + registeredDate, "prossima:" + next);
    }

    /** Next N upcoming occurrences across all active scheduled transactions. */
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

    /** Past 30 days + next N future occurrences, with overdue flag. */
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

    public List<Map<String, Object>> getPortfolio() throws SQLException {
        return queryList("""
            SELECT p.*, a.name AS account_name, a.icon AS account_icon, a.color AS account_color
            FROM portfolio p
            JOIN accounts a ON p.account_id = a.id
            ORDER BY a.name, p.ticker
        """);
    }

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

    public Map<String, Object> buyStock(JsonObject p) throws SQLException {
        int investAccountId  = p.get("account_id").getAsInt();    // investment account
        int fromAccountId    = p.get("from_account_id").getAsInt(); // regular account paying
        String ticker        = p.get("ticker").getAsString().toUpperCase();
        String name          = p.get("name").getAsString();
        double qty           = p.get("quantity").getAsDouble();
        double price         = p.get("price").getAsDouble();
        String date          = p.get("date").getAsString();
        String notes         = p.has("notes") && !p.get("notes").isJsonNull() ? p.get("notes").getAsString() : null;
        String assetType     = p.has("asset_type") && !p.get("asset_type").isJsonNull() ? p.get("asset_type").getAsString() : "equity";
        double faceValue     = p.has("face_value") && !p.get("face_value").isJsonNull() ? p.get("face_value").getAsDouble() : 1.0;
        String maturityDate  = p.has("maturity_date") && !p.get("maturity_date").isJsonNull() ? p.get("maturity_date").getAsString() : null;
        double couponRate    = p.has("coupon_rate") && !p.get("coupon_rate").isJsonNull() ? p.get("coupon_rate").getAsDouble() : 0.0;
        String couponFreq    = p.has("coupon_frequency") && !p.get("coupon_frequency").isJsonNull() ? p.get("coupon_frequency").getAsString() : null;
        double couponTax     = p.has("coupon_tax") && !p.get("coupon_tax").isJsonNull() ? p.get("coupon_tax").getAsDouble() : 12.5;
        double commissions   = p.has("commissions") && !p.get("commissions").isJsonNull() ? p.get("commissions").getAsDouble() : 0.0;
        boolean isBond       = "bond".equals(assetType);
        // Controvalore puro + commissioni = totale trasferito
        double pureAmount = isBond ? qty * price / 100.0 : qty * price;
        double amount     = pureAmount + commissions;

        // Get transfer category
        var cat = queryOne("SELECT id FROM categories WHERE type='transfer' LIMIT 1");
        Integer catId = cat != null ? ((Number)cat.get("id")).intValue() : null;

        // Create transfer transaction: from regular → investment account (include commissions)
        long txId = execute("""
            INSERT INTO transactions(date,amount,type,category_id,account_id,to_account_id,description,reconciled)
            VALUES(?,?,?,?,?,?,?,0)
        """, date, amount, "transfer", catId, fromAccountId, investAccountId,
            "Acquisto " + ticker + (commissions > 0 ? String.format(" (comm. %.2f)", commissions) : ""));

        // Find or create portfolio position
        var existing = queryOne("SELECT * FROM portfolio WHERE account_id=? AND ticker=?",
                investAccountId, ticker);
        long portfolioId;
        if (existing != null) {
            double existQty  = ((Number)existing.get("quantity")).doubleValue();
            double existAvg  = ((Number)existing.get("avg_price")).doubleValue();
            double existComm = existing.get("total_commissions") != null
                    ? ((Number)existing.get("total_commissions")).doubleValue() : 0.0;
            // Avg price includes commissions: per equity in €/unit, per bond in % equivalente
            double newAvg = isBond
                ? (existQty * existAvg + qty * price + commissions * 100) / (existQty + qty)
                : (existQty * existAvg + qty * price + commissions) / (existQty + qty);
            portfolioId = ((Number)existing.get("id")).longValue();
            execute("UPDATE portfolio SET quantity=?, avg_price=?, current_price=?, total_commissions=? WHERE id=?",
                    existQty + qty, newAvg, price, existComm + commissions, portfolioId);
        } else {
            double initAvg = isBond
                ? price + (commissions > 0 ? commissions * 100 / qty : 0)
                : (commissions > 0 ? (qty * price + commissions) / qty : price);
            portfolioId = execute("""
                INSERT INTO portfolio(account_id,ticker,name,quantity,avg_price,current_price,notes,
                                      asset_type,face_value,maturity_date,coupon_rate,coupon_frequency,coupon_tax,total_commissions)
                VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, investAccountId, ticker, name, qty, initAvg, price, notes,
                 assetType, faceValue, maturityDate, couponRate, couponFreq, couponTax, commissions);
        }

        // Record portfolio transaction
        execute("""
            INSERT INTO portfolio_transactions(portfolio_id,type,quantity,price,date,transaction_id,notes)
            VALUES(?,?,?,?,?,?,?)
        """, portfolioId, "buy", qty, price, date, txId,
             commissions > 0 ? String.format("comm. %.2f", commissions) : notes);

        logger.log("TITOLO ACQUISTATO", "ticker:" + ticker, "nome:" + name,
                   "quantita:" + qty, "prezzo:" + DbLogger.amt(price),
                   "commissioni:" + DbLogger.amt(commissions), "data:" + date);
        return queryOne("SELECT * FROM portfolio WHERE id=?", portfolioId);
    }

    public Map<String, Object> sellStock(JsonObject p) throws SQLException {
        int portfolioId   = p.get("portfolio_id").getAsInt();
        int toAccountId   = p.get("to_account_id").getAsInt(); // regular account receiving
        double qty        = p.get("quantity").getAsDouble();
        double price      = p.get("price").getAsDouble();
        String date       = p.get("date").getAsString();
        String notes      = p.has("notes") && !p.get("notes").isJsonNull() ? p.get("notes").getAsString() : null;

        var position = queryOne("SELECT * FROM portfolio WHERE id=?", portfolioId);
        if (position == null) throw new SQLException("Posizione non trovata");

        double existQty       = ((Number)position.get("quantity")).doubleValue();
        int investAccountId   = ((Number)position.get("account_id")).intValue();
        String ticker         = (String)position.get("ticker");

        if (qty > existQty + 0.00001)
            throw new SQLException("Quantità venduta (" + qty + ") superiore alla disponibile (" + existQty + ")");

        double amount = qty * price;

        // Get transfer category
        var cat = queryOne("SELECT id FROM categories WHERE type='transfer' LIMIT 1");
        Integer catId = cat != null ? ((Number)cat.get("id")).intValue() : null;

        // Create transfer transaction: investment → regular account
        long txId = execute("""
            INSERT INTO transactions(date,amount,type,category_id,account_id,to_account_id,description,reconciled)
            VALUES(?,?,?,?,?,?,?,0)
        """, date, amount, "transfer", catId, investAccountId, toAccountId,
            "Vendita " + ticker + " x" + qty);

        // Update portfolio position
        double newQty = existQty - qty;
        execute("UPDATE portfolio SET quantity=? WHERE id=?", newQty, portfolioId);

        // Record portfolio transaction
        execute("""
            INSERT INTO portfolio_transactions(portfolio_id,type,quantity,price,date,transaction_id,notes)
            VALUES(?,?,?,?,?,?,?)
        """, portfolioId, "sell", qty, price, date, txId, notes);

        logger.log("TITOLO VENDUTO", "ticker:" + ticker,
                   "quantita:" + qty, "prezzo:" + DbLogger.amt(price),
                   "controvalore:" + DbLogger.amt(qty * price), "data:" + date);
        return queryOne("SELECT * FROM portfolio WHERE id=?", portfolioId);
    }

    public Map<String, Object> updateStockPrice(int id, double price) throws SQLException {
        Map<String, Object> old = queryOne("SELECT ticker FROM portfolio WHERE id=?", id);
        execute("UPDATE portfolio SET current_price=? WHERE id=?", price, id);
        logger.log("PREZZO AGGIORNATO", "ticker:" + DbLogger.s(old != null ? old.get("ticker") : id),
                   "prezzo:" + DbLogger.amt(price));
        return queryOne("SELECT * FROM portfolio WHERE id=?", id);
    }

    /** Modifica una posizione esistente (tutto tranne ticker). */
    public Map<String, Object> updatePortfolioItem(JsonObject p) throws SQLException {
        int    id            = p.get("id").getAsInt();
        String name          = p.get("name").getAsString();
        int    accountId     = p.get("account_id").getAsInt();
        double quantity      = p.get("quantity").getAsDouble();
        double avgPrice      = p.get("avg_price").getAsDouble();
        double curPrice      = p.has("current_price") && !p.get("current_price").isJsonNull()
                               ? p.get("current_price").getAsDouble() : avgPrice;
        double totalComm     = p.has("total_commissions") && !p.get("total_commissions").isJsonNull()
                               ? p.get("total_commissions").getAsDouble() : 0.0;
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

    /** Carica una posizione esistente senza creare transazioni bancarie. */
    public Map<String, Object> importPosition(JsonObject p) throws SQLException {
        int accountId    = p.get("account_id").getAsInt();
        String ticker    = p.get("ticker").getAsString().toUpperCase();
        String name      = p.get("name").getAsString();
        double qty       = p.get("quantity").getAsDouble();
        double avgPrice  = p.get("avg_price").getAsDouble();
        double curPrice  = p.has("current_price") && !p.get("current_price").isJsonNull()
                ? p.get("current_price").getAsDouble() : avgPrice;
        String notes     = p.has("notes") && !p.get("notes").isJsonNull() ? p.get("notes").getAsString() : null;
        String assetType = p.has("asset_type") && !p.get("asset_type").isJsonNull() ? p.get("asset_type").getAsString() : "equity";
        double faceValue = p.has("face_value") && !p.get("face_value").isJsonNull() ? p.get("face_value").getAsDouble() : 1.0;
        String maturityDate = p.has("maturity_date") && !p.get("maturity_date").isJsonNull() ? p.get("maturity_date").getAsString() : null;
        double couponRate   = p.has("coupon_rate") && !p.get("coupon_rate").isJsonNull() ? p.get("coupon_rate").getAsDouble() : 0.0;
        String couponFreq   = p.has("coupon_frequency") && !p.get("coupon_frequency").isJsonNull() ? p.get("coupon_frequency").getAsString() : null;
        double couponTax    = p.has("coupon_tax") && !p.get("coupon_tax").isJsonNull() ? p.get("coupon_tax").getAsDouble() : 12.5;

        double commissions  = p.has("commissions") && !p.get("commissions").isJsonNull() ? p.get("commissions").getAsDouble() : 0.0;

        var existing = queryOne("SELECT * FROM portfolio WHERE account_id=? AND ticker=?", accountId, ticker);
        long id;
        boolean isBondImp   = "bond".equals(assetType);
        // Bond: qty = nominale €, avgPrice = %; valore = nominale * prezzo% / 100
        double addedValue   = isBondImp ? qty * avgPrice / 100.0 : qty * avgPrice;
        if (existing != null) {
            double existQty  = ((Number)existing.get("quantity")).doubleValue();
            double existAvg  = ((Number)existing.get("avg_price")).doubleValue();
            double existComm = existing.get("total_commissions") != null
                    ? ((Number)existing.get("total_commissions")).doubleValue() : 0.0;
            double newAvg    = (existQty * existAvg + qty * avgPrice) / (existQty + qty);
            id = ((Number)existing.get("id")).longValue();
            execute("UPDATE portfolio SET quantity=?, avg_price=?, current_price=?, total_commissions=? WHERE id=?",
                    existQty + qty, newAvg, curPrice, existComm + commissions, id);
        } else {
            id = execute("""
                INSERT INTO portfolio(account_id,ticker,name,quantity,avg_price,current_price,notes,
                                      asset_type,face_value,maturity_date,coupon_rate,coupon_frequency,coupon_tax,total_commissions)
                VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, accountId, ticker, name, qty, avgPrice, curPrice, notes,
                 assetType, faceValue, maturityDate, couponRate, couponFreq, couponTax, commissions);
        }
        execute("UPDATE accounts SET initial_balance = initial_balance + ? WHERE id = ?", addedValue, accountId);
        logger.log("POSIZIONE IMPORTATA", "ticker:" + ticker, "nome:" + name,
                   "quantita:" + qty, "prezzo_medio:" + DbLogger.amt(avgPrice));
        return queryOne("SELECT * FROM portfolio WHERE id=?", id);
    }

    /** Registra il pagamento di una cedola come transazione income. */
    public Map<String, Object> registerCoupon(JsonObject p) throws SQLException {
        int portfolioId = p.get("portfolio_id").getAsInt();
        int accountId   = p.get("account_id").getAsInt();  // conto su cui accreditare
        double amount   = p.get("amount").getAsDouble();
        String date     = p.get("date").getAsString();
        String notes    = p.has("notes") && !p.get("notes").isJsonNull() ? p.get("notes").getAsString() : null;

        var pos = queryOne("SELECT * FROM portfolio WHERE id=?", portfolioId);
        if (pos == null) throw new SQLException("Posizione non trovata");
        String ticker = (String)pos.get("ticker");

        // Usa la prima categoria income disponibile
        var incCat = queryOne("SELECT id FROM categories WHERE type='income' LIMIT 1");
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

        logger.log("CEDOLA REGISTRATA", "ticker:" + ticker,
                   "importo:" + DbLogger.amt(amount), "data:" + date,
                   "note:" + DbLogger.s(notes));
        return Map.of("ok", true, "transaction_id", txId);
    }

    public Map<String, Object> deletePortfolioItem(int id) throws SQLException {
        Map<String, Object> old = queryOne("SELECT ticker, name FROM portfolio WHERE id=?", id);
        execute("DELETE FROM portfolio WHERE id=?", id);
        logger.log("TITOLO ELIMINATO", "id:" + id,
                   "ticker:" + DbLogger.s(old != null ? old.get("ticker") : null),
                   "nome:" + DbLogger.s(old != null ? old.get("name") : null));
        return Map.of("id", id, "deleted", true);
    }

    // ─── Log ──────────────────────────────────────────────────────────────────

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
                        SELECT SUM(CASE WHEN t.type='income' THEN t.amount
                                        WHEN t.type='expense' THEN -t.amount ELSE 0 END)
                        FROM transactions t WHERE t.account_id = a.id OR t.to_account_id = a.id
                    ), 0)
                END), 0) AS total
            FROM accounts a
        """);
        double inc  = yearly != null ? ((Number)yearly.get("income")).doubleValue()   : 0;
        double exp  = yearly != null ? ((Number)yearly.get("expenses")).doubleValue() : 0;
        double bal  = balance != null ? ((Number)balance.get("total")).doubleValue()  : 0;
        int    cnt  = yearly != null ? ((Number)yearly.get("transaction_count")).intValue() : 0;
        return Map.of("income",inc,"expenses",exp,"balance",bal,"net",inc-exp,"transaction_count",cnt);
    }

    public List<Map<String, Object>> getMonthlyChartData(int year) throws SQLException {
        return queryList("""
            SELECT CAST(strftime('%m',date) AS INTEGER) AS month,
                SUM(CASE WHEN type='income'  THEN amount ELSE 0 END) AS income,
                SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expenses
            FROM transactions WHERE strftime('%Y',date)=? AND type IN ('income','expense')
            GROUP BY strftime('%m',date) ORDER BY month
        """, String.valueOf(year));
    }

    public List<Map<String, Object>> getCategoryChartData(int year, String type) throws SQLException {
        return queryList("""
            SELECT c.name, c.color, c.icon, SUM(t.amount) AS total
            FROM transactions t JOIN categories c ON t.category_id = c.id
            WHERE strftime('%Y',t.date)=? AND t.type=?
            GROUP BY t.category_id ORDER BY total DESC
        """, String.valueOf(year), type);
    }

    // ─── Manutenzione DB ────────────────────────────────────────────────────────

    /** Esegue un'operazione che richiede accesso esclusivo al file DB.
     *  Chiude la connessione principale, apre una connessione plain (senza WAL),
     *  esegue l'operazione, poi riapre la connessione WAL normale. */
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

    public Map<String, Object> dbGetInfo() throws SQLException, IOException {
        long fileSize = Files.exists(Path.of(currentDbPath)) ? Files.size(Path.of(currentDbPath)) : 0;
        Path walPath  = Path.of(currentDbPath + "-wal");
        long walSize  = Files.exists(walPath) ? Files.size(walPath) : 0;
        var pageCount = queryOne("PRAGMA page_count");
        var pageSize  = queryOne("PRAGMA page_size");
        var freePages = queryOne("PRAGMA freelist_count");
        long pc = ((Number) pageCount.get("page_count")).longValue();
        long ps = ((Number) pageSize.get("page_size")).longValue();
        long fp = ((Number) freePages.get("freelist_count")).longValue();
        var txCount   = queryOne("SELECT COUNT(*) AS n FROM transactions");
        var accCount  = queryOne("SELECT COUNT(*) AS n FROM accounts");
        int txN  = txCount  != null ? ((Number) txCount.get("n")).intValue()  : 0;
        int accN = accCount != null ? ((Number) accCount.get("n")).intValue() : 0;
        return Map.of(
            "file_size",  fileSize,
            "wal_size",   walSize,
            "page_count", pc,
            "page_size",  ps,
            "free_pages", fp,
            "free_bytes", fp * ps,
            "tx_count",   txN,
            "acc_count",  accN
        );
    }

    public Map<String, Object> dbVacuum() throws SQLException, IOException {
        long sizeBefore = Files.exists(Path.of(currentDbPath)) ? Files.size(Path.of(currentDbPath)) : 0;
        withExclusiveAccess(c -> {
            try (Statement st = c.createStatement()) { st.execute("VACUUM"); }
        });
        long sizeAfter = Files.exists(Path.of(currentDbPath)) ? Files.size(Path.of(currentDbPath)) : 0;
        logger.log("MANUTENZIONE", String.format("VACUUM: %d → %d bytes (liberati: %d)", sizeBefore, sizeAfter, sizeBefore - sizeAfter));
        return Map.of("ok", true, "size_before", sizeBefore, "size_after", sizeAfter, "saved", sizeBefore - sizeAfter);
    }

    public Map<String, Object> dbIntegrityCheck() throws SQLException {
        var rows = queryList("PRAGMA integrity_check");
        boolean ok = rows.size() == 1 && "ok".equals(String.valueOf(rows.get(0).get("integrity_check")));
        List<String> messages = rows.stream().map(r -> String.valueOf(r.get("integrity_check"))).toList();
        logger.log("MANUTENZIONE", "integrity_check: " + (ok ? "OK" : String.join("; ", messages)));
        return Map.of("ok", ok, "messages", messages);
    }

    public Map<String, Object> dbReindex() throws SQLException {
        withExclusiveAccess(c -> {
            try (Statement st = c.createStatement()) { st.execute("REINDEX"); }
            try (Statement st = c.createStatement()) { st.execute("PRAGMA optimize"); }
        });
        logger.log("MANUTENZIONE", "REINDEX + PRAGMA optimize");
        return Map.of("ok", true);
    }

    public Map<String, Object> dbWalCheckpoint() throws SQLException, IOException {
        withExclusiveAccess(c -> {
            try (Statement st = c.createStatement()) { st.execute("PRAGMA wal_checkpoint(TRUNCATE)"); }
        });
        Path walPath = Path.of(currentDbPath + "-wal");
        long walSize = Files.exists(walPath) ? Files.size(walPath) : 0;
        logger.log("MANUTENZIONE", "WAL checkpoint(TRUNCATE): wal_size=" + walSize);
        return Map.of("ok", true, "wal_size", walSize);
    }

    // ─── Analytics ────────────────────────────────────────────────────────────

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

    public int saveForecast(String forecastDate, double projectedBalance, JsonArray categories) throws SQLException {
        execute("INSERT INTO forecasts (forecast_date, projected_balance) VALUES (?,?)",
                forecastDate, projectedBalance);
        var r  = queryOne("SELECT last_insert_rowid() AS id");
        int id = ((Number) r.get("id")).intValue();
        for (var el : categories) {
            var cat = el.getAsJsonObject();
            execute("INSERT INTO forecast_categories (forecast_id, category_id, category_name, category_type, projected_amount) VALUES (?,?,?,?,?)",
                    id,
                    cat.has("category_id") && !cat.get("category_id").isJsonNull() ? cat.get("category_id").getAsInt() : null,
                    cat.get("category_name").getAsString(),
                    cat.get("type").getAsString(),
                    cat.get("projected_amount").getAsDouble());
        }
        logger.log("PREVISIONE SALVATA", "data:" + forecastDate, "saldo:" + DbLogger.amt(projectedBalance));
        return id;
    }

    public List<Map<String, Object>> getForecasts() throws SQLException {
        String today = LocalDate.now().toString();
        var list = queryList(
                "SELECT f.*, (SELECT COUNT(*) FROM forecast_categories WHERE forecast_id=f.id) AS cat_count " +
                "FROM forecasts f ORDER BY f.forecast_date DESC");
        for (var f : list)
            f.put("is_ready", ((String) f.get("forecast_date")).compareTo(today) <= 0 ? 1 : 0);
        return list;
    }

    public void deleteForecast(int id) throws SQLException {
        execute("DELETE FROM forecasts WHERE id=?", id);
        logger.log("PREVISIONE ELIMINATA", "id:" + id);
    }

    public Map<String, Object> getForecastDetail(int id) throws SQLException {
        var forecast = queryOne("SELECT * FROM forecasts WHERE id=?", id);
        if (forecast == null) throw new SQLException("Previsione non trovata");
        String createdAt    = ((String) forecast.get("created_at")).substring(0, 10);
        String forecastDate = (String) forecast.get("forecast_date");
        var cats = queryList("SELECT * FROM forecast_categories WHERE forecast_id=? ORDER BY category_name", id);
        for (var cat : cats) {
            Object catId  = cat.get("category_id");
            String txType = (String) cat.get("category_type");
            double actual = 0;
            if (catId != null) {
                var row = queryOne(
                        "SELECT COALESCE(SUM(amount),0) AS tot FROM transactions " +
                        "WHERE category_id=? AND date>=? AND date<=? AND type=?",
                        ((Number) catId).intValue(), createdAt, forecastDate, txType);
                if (row != null) actual = ((Number) row.get("tot")).doubleValue();
            }
            cat.put("actual_amount", actual);
            double proj = ((Number) cat.get("projected_amount")).doubleValue();
            // diff > 0 = sei stato bravo: spese < previsto (uscite) o incassi > previsto (entrate)
            cat.put("diff", "income".equals(txType) ? actual - proj : proj - actual);
        }
        // Saldo reale alla forecast_date
        var accList = queryList(
                "SELECT a.initial_balance, " +
                "COALESCE((SELECT SUM(CASE WHEN t.type='income' THEN t.amount " +
                "  WHEN t.type='expense' THEN -t.amount " +
                "  WHEN t.type='transfer' AND t.account_id=a.id THEN -t.amount ELSE 0 END) " +
                "  FROM transactions t WHERE t.account_id=a.id AND t.date<=?),0) " +
                "+ COALESCE((SELECT SUM(t.amount) FROM transactions t " +
                "  WHERE t.to_account_id=a.id AND t.type='transfer' AND t.date<=?),0) AS tx_sum " +
                "FROM accounts a WHERE a.type!='investment'",
                forecastDate, forecastDate);
        double actualBalance = accList.stream()
                .mapToDouble(a -> ((Number) a.get("initial_balance")).doubleValue()
                                + ((Number) a.get("tx_sum")).doubleValue())
                .sum();
        forecast.put("categories",     cats);
        forecast.put("actual_balance", actualBalance);
        return forecast;
    }

    public List<Map<String, Object>> getCategoryMonthTable(int months) throws SQLException {
        java.time.LocalDate start = java.time.LocalDate.now()
                .withDayOfMonth(1).minusMonths(months - 1);
        String sql = """
            SELECT c.id, c.name, c.type, c.color, c.icon,
                   strftime('%Y-%m', t.date) AS ym,
                   SUM(ABS(t.amount))        AS total
            FROM transactions t
            JOIN categories c ON t.category_id = c.id
            WHERE t.date >= ? AND t.type IN ('expense','income')
            GROUP BY c.id, ym
            ORDER BY c.type, c.name, ym
            """;
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, start.toString());
            return toList(ps.executeQuery());
        }
    }
}
