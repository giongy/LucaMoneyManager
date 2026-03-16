package com.moneymanager;

import com.google.gson.JsonObject;
import org.sqlite.SQLiteConfig;

import java.sql.*;
import java.util.*;

public class Database {

    private final Connection conn;

    public Database(String dbPath) throws SQLException {
        SQLiteConfig config = new SQLiteConfig();
        config.setJournalMode(SQLiteConfig.JournalMode.WAL);
        config.enforceForeignKeys(true);
        conn = DriverManager.getConnection("jdbc:sqlite:" + dbPath, config.toProperties());
        initSchema();
        migrate();
        seedDefaultData();
    }

    public void close() throws SQLException { conn.close(); }

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
            if (!s.isEmpty()) conn.createStatement().execute(s);
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
            CREATE TABLE IF NOT EXISTS portfolio (
                id             INTEGER PRIMARY KEY AUTOINCREMENT,
                ticker         TEXT    NOT NULL,
                name           TEXT    NOT NULL,
                quantity       REAL    NOT NULL,
                purchase_price REAL    NOT NULL,
                current_price  REAL    DEFAULT 0,
                purchase_date  TEXT    NOT NULL,
                account_id     INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
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
        // Crea tabelle tag se non esistono (CREATE IF NOT EXISTS è idempotente)
        executePlain("CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, color TEXT DEFAULT '#58a6ff', created_at TEXT DEFAULT CURRENT_TIMESTAMP)");
        executePlain("CREATE TABLE IF NOT EXISTS transaction_tags (transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE, tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE, PRIMARY KEY (transaction_id, tag_id))");
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
                a.initial_balance + COALESCE(SUM(CASE
                    WHEN t.type='income'   THEN  t.amount
                    WHEN t.type='expense'  THEN -t.amount
                    WHEN t.type='transfer' AND t.account_id    = a.id THEN -t.amount
                    WHEN t.type='transfer' AND t.to_account_id = a.id THEN  t.amount
                    ELSE 0 END), 0) AS balance
            FROM accounts a
            LEFT JOIN transactions t ON t.account_id = a.id OR t.to_account_id = a.id
            GROUP BY a.id
            ORDER BY a.created_at
        """);
    }

    public Map<String, Object> addAccount(JsonObject p) throws SQLException {
        long id = execute("INSERT INTO accounts(name,type,currency,initial_balance,color,icon) VALUES(?,?,?,?,?,?)",
                str(p,"name"), str(p,"type"), str(p,"currency") != null ? str(p,"currency") : "EUR",
                dbl(p,"initial_balance") != null ? dbl(p,"initial_balance") : 0.0,
                str(p,"color"), str(p,"icon"));
        return queryOne("SELECT * FROM accounts WHERE id=?", id);
    }

    public Map<String, Object> updateAccount(int id, JsonObject p) throws SQLException {
        execute("UPDATE accounts SET name=?,type=?,currency=?,initial_balance=?,color=?,icon=? WHERE id=?",
                str(p,"name"), str(p,"type"), str(p,"currency") != null ? str(p,"currency") : "EUR",
                dbl(p,"initial_balance") != null ? dbl(p,"initial_balance") : 0.0,
                str(p,"color"), str(p,"icon"), id);
        return queryOne("SELECT * FROM accounts WHERE id=?", id);
    }

    public Map<String, Object> deleteAccount(int id) throws SQLException {
        execute("DELETE FROM accounts WHERE id=?", id);
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
                CASE WHEN c.parent_id IS NULL THEN c.id ELSE c.parent_id END,
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
        return queryOne("SELECT * FROM categories WHERE id=?", id);
    }

    public Map<String, Object> updateCategory(int id, JsonObject p) throws SQLException {
        // Non si può modificare il tipo della categoria Trasferimento speciale
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
        return queryOne("SELECT * FROM categories WHERE id=?", id);
    }

    public Map<String, Object> deleteCategory(int id) throws SQLException {
        Map<String, Object> existing = queryOne("SELECT * FROM categories WHERE id=?", id);
        if (existing != null && "transfer".equals(existing.get("type")))
            throw new SQLException("La categoria Trasferimento non può essere eliminata");
        execute("DELETE FROM categories WHERE id=?", id);
        return Map.of("id", id, "deleted", true);
    }

    // ─── Transazioni ──────────────────────────────────────────────────────────

    public List<Map<String, Object>> getTransactions(JsonObject f) throws SQLException {
        StringBuilder sql = new StringBuilder("""
            SELECT t.*,
                c.name  AS category_name, c.icon AS category_icon, c.color AS category_color,
                a.name  AS account_name,  a.color AS account_color,
                ta.name AS to_account_name,
                GROUP_CONCAT(CASE WHEN tg.id IS NOT NULL
                    THEN tg.id || '\u00A7' || tg.name || '\u00A7' || tg.color END, '||') AS tags_concat
            FROM transactions t
            LEFT JOIN categories c  ON t.category_id    = c.id
            LEFT JOIN accounts   a  ON t.account_id     = a.id
            LEFT JOIN accounts   ta ON t.to_account_id  = ta.id
            LEFT JOIN transaction_tags tt ON tt.transaction_id = t.id
            LEFT JOIN tags tg ON tg.id = tt.tag_id
            WHERE 1=1
        """);
        List<Object> params = new ArrayList<>();

        if (f.has("month") && f.has("year")) {
            sql.append(" AND strftime('%m',t.date)=? AND strftime('%Y',t.date)=?");
            params.add(String.format("%02d", f.get("month").getAsInt()));
            params.add(String.valueOf(f.get("year").getAsInt()));
        } else if (f.has("year")) {
            sql.append(" AND strftime('%Y',t.date)=?");
            params.add(String.valueOf(f.get("year").getAsInt()));
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
        sql.append(" GROUP BY t.id ORDER BY t.date DESC, t.id DESC");
        if (f.has("limit")) { sql.append(" LIMIT ?"); params.add(f.get("limit").getAsInt()); }

        return parseTags(queryList(sql.toString(), params.toArray()));
    }

    public Map<String, Object> addTransaction(JsonObject p) throws SQLException {
        long id = execute("""
            INSERT INTO transactions(date,amount,type,category_id,account_id,to_account_id,description)
            VALUES(?,?,?,?,?,?,?)
        """, str(p,"date"), dbl(p,"amount"), str(p,"type"),
                intVal(p,"category_id"), p.get("account_id").getAsInt(),
                intVal(p,"to_account_id"),
                str(p,"description") != null ? str(p,"description") : "");
        saveTags(id, p);
        return getTransactionById(id);
    }

    public Map<String, Object> updateTransaction(int id, JsonObject p) throws SQLException {
        execute("""
            UPDATE transactions SET date=?,amount=?,type=?,category_id=?,account_id=?,
                to_account_id=?,description=? WHERE id=?
        """, str(p,"date"), dbl(p,"amount"), str(p,"type"),
                intVal(p,"category_id"), p.get("account_id").getAsInt(),
                intVal(p,"to_account_id"),
                str(p,"description") != null ? str(p,"description") : "",
                id);
        saveTags(id, p);
        return getTransactionById(id);
    }

    public Map<String, Object> deleteTransaction(int id) throws SQLException {
        execute("DELETE FROM transactions WHERE id=?", id);
        return Map.of("id", id, "deleted", true);
    }

    // ─── Tag ──────────────────────────────────────────────────────────────────

    public List<Map<String, Object>> getTags() throws SQLException {
        return queryList("SELECT * FROM tags ORDER BY name");
    }

    public Map<String, Object> addTag(JsonObject p) throws SQLException {
        long id = execute("INSERT INTO tags(name,color) VALUES(?,?)",
                str(p,"name"), str(p,"color") != null ? str(p,"color") : "#58a6ff");
        return queryOne("SELECT * FROM tags WHERE id=?", id);
    }

    public Map<String, Object> updateTag(int id, JsonObject p) throws SQLException {
        execute("UPDATE tags SET name=?,color=? WHERE id=?", str(p,"name"), str(p,"color"), id);
        return queryOne("SELECT * FROM tags WHERE id=?", id);
    }

    public Map<String, Object> deleteTag(int id) throws SQLException {
        execute("DELETE FROM tags WHERE id=?", id);
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
                a.name AS account_name, a.color AS account_color, ta.name AS to_account_name,
                GROUP_CONCAT(CASE WHEN tg.id IS NOT NULL
                    THEN tg.id || '\u00A7' || tg.name || '\u00A7' || tg.color END, '||') AS tags_concat
            FROM transactions t
            LEFT JOIN categories c  ON t.category_id   = c.id
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
        execute("""
            INSERT INTO budgets(category_id,amount,month,year) VALUES(?,?,?,?)
            ON CONFLICT(category_id,month,year) DO UPDATE SET amount=excluded.amount
        """, p.get("category_id").getAsInt(), dbl(p,"amount"),
                p.get("month").getAsInt(), p.get("year").getAsInt());
        return queryOne("SELECT * FROM budgets WHERE category_id=? AND month=? AND year=?",
                p.get("category_id").getAsInt(), p.get("month").getAsInt(), p.get("year").getAsInt());
    }

    public Map<String, Object> deleteBudget(int id) throws SQLException {
        execute("DELETE FROM budgets WHERE id=?", id);
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
            WHERE strftime('%Y', t.date)=? AND t.type='expense'
            GROUP BY t.category_id, strftime('%m', t.date)
        """, String.valueOf(year));
        List<Map<String, Object>> categories = queryList("""
            SELECT c.id, c.name, c.icon, c.color, c.type, c.parent_id, p.name AS parent_name
            FROM categories c
            LEFT JOIN categories p ON c.parent_id = p.id
            WHERE c.type != 'transfer'
            ORDER BY CASE WHEN c.parent_id IS NULL THEN c.id ELSE c.parent_id END,
                     c.parent_id NULLS FIRST, c.name
        """);
        return Map.of("budgets", budgets, "actuals", actuals, "categories", categories);
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
    }

    // ─── Portafoglio ──────────────────────────────────────────────────────────

    public List<Map<String, Object>> getPortfolio() throws SQLException {
        return queryList("""
            SELECT p.*, a.name AS account_name
            FROM portfolio p
            LEFT JOIN accounts a ON p.account_id = a.id
            ORDER BY p.name
        """);
    }

    public Map<String, Object> addPortfolioItem(JsonObject p) throws SQLException {
        long id = execute("""
            INSERT INTO portfolio(ticker,name,quantity,purchase_price,current_price,purchase_date,account_id,notes)
            VALUES(?,?,?,?,?,?,?,?)
        """, str(p,"ticker"), str(p,"name"), dbl(p,"quantity"), dbl(p,"purchase_price"),
                dbl(p,"current_price") != null ? dbl(p,"current_price") : 0.0,
                str(p,"purchase_date"), intVal(p,"account_id"), str(p,"notes"));
        return queryOne("SELECT * FROM portfolio WHERE id=?", id);
    }

    public Map<String, Object> updatePortfolioItem(int id, JsonObject p) throws SQLException {
        execute("""
            UPDATE portfolio SET ticker=?,name=?,quantity=?,purchase_price=?,current_price=?,
                purchase_date=?,account_id=?,notes=? WHERE id=?
        """, str(p,"ticker"), str(p,"name"), dbl(p,"quantity"), dbl(p,"purchase_price"),
                dbl(p,"current_price") != null ? dbl(p,"current_price") : 0.0,
                str(p,"purchase_date"), intVal(p,"account_id"), str(p,"notes"), id);
        return queryOne("SELECT * FROM portfolio WHERE id=?", id);
    }

    public Map<String, Object> deletePortfolioItem(int id) throws SQLException {
        execute("DELETE FROM portfolio WHERE id=?", id);
        return Map.of("id", id, "deleted", true);
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
            SELECT COALESCE(SUM(initial_balance),0) +
                COALESCE((SELECT SUM(CASE WHEN type='income' THEN amount
                                          WHEN type='expense' THEN -amount ELSE 0 END)
                          FROM transactions),0) AS total
            FROM accounts
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
}
