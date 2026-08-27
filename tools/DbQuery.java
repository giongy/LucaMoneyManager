// ─────────────────────────────────────────────────────────────────────────────
// DbQuery — interroga il DB SQLite in SOLA LETTURA senza avviare l'app.
//
// Serve quando l'app (e quindi il WebServer + le api del bridge) non è in esecuzione:
// screenshot.ps1 -Probe risponde solo a app accesa, questo no.
//
// Si appoggia al driver sqlite-jdbc già presente nel fat JAR del progetto, quindi non
// installa niente. Gira in "source-file mode" di Java: nessuna compilazione, nessun .class.
//
//   java --class-path target/moneymanager-<ver>.jar tools/DbQuery.java "SELECT ..."
//
// (di norma si usa il wrapper tools\db.ps1, che risolve da sé il JAR più recente)
//
// ⚠️ La connessione è aperta read-only a livello di driver (SQLiteConfig.setReadOnly):
// non è una convenzione ma un vincolo, quindi non può modificare il DB nemmeno per errore
// e non disturba né il lock dell'app né la sincronizzazione OneDrive. SQLite ammette più
// lettori in parallelo: si può interrogare anche con l'app aperta.
// ─────────────────────────────────────────────────────────────────────────────
import java.io.*;
import java.nio.file.*;
import java.sql.*;
import java.time.*;
import java.util.*;

public class DbQuery {

    // I due DB fra cui si sbaglia: quello vero su OneDrive e la copia di lavoro nel progetto.
    static final String PROD  = "C:/Users/lucaa/OneDrive/Documents/Luca_Money_Manager/luca.db";
    static final String LOCAL = "D:/LucaMoneyManager/luca.db";

    public static void main(String[] args) throws Exception {
        // Nomi di categorie e conti sono pieni di accentate: senza forzare UTF-8 qui escono
        // come "?" perché la console eredita la code page OEM di Windows.
        System.setOut(new PrintStream(new java.io.FileOutputStream(java.io.FileDescriptor.out), true, "UTF-8"));
        System.setErr(new PrintStream(new java.io.FileOutputStream(java.io.FileDescriptor.err), true, "UTF-8"));

        String db = LOCAL, sql = null;
        boolean json = false, quiet = false;
        int limit = 200;

        for (int i = 0; i < args.length; i++) {
            switch (args[i]) {
                case "--db"    -> db    = resolveDb(args[++i]);
                case "--limit" -> limit = Integer.parseInt(args[++i]);
                case "--json"  -> json  = true;
                case "--quiet" -> quiet = true;   // niente intestazione: output pulito da parsare
                case "--file"  -> sql   = Files.readString(Path.of(args[++i]));
                default        -> sql   = args[i];
            }
        }
        if (sql == null || sql.isBlank()) {
            System.err.println("uso: DbQuery [--db prod|local|<path>] [--limit N] [--json] [--quiet] \"SELECT ...\"");
            System.exit(2);
        }

        Path p = Path.of(db);
        if (!Files.exists(p)) { System.err.println("DB non trovato: " + db); System.exit(1); }

        // Su quale DB stiamo lavorando, sempre in chiaro: è l'errore che costa di più.
        if (!quiet) {
            System.out.printf("DB: %s  (%.1f KB, modificato %s)%n%n", p.toAbsolutePath(),
                Files.size(p) / 1024.0,
                LocalDateTime.ofInstant(Files.getLastModifiedTime(p).toInstant(), ZoneId.systemDefault()));
        }

        var cfg = new org.sqlite.SQLiteConfig();
        cfg.setReadOnly(true);

        try (Connection c = DriverManager.getConnection("jdbc:sqlite:" + db, cfg.toProperties());
             Statement st = c.createStatement();
             ResultSet rs = st.executeQuery(sql)) {

            ResultSetMetaData md = rs.getMetaData();
            int nc = md.getColumnCount();
            List<String> cols = new ArrayList<>();
            for (int i = 1; i <= nc; i++) cols.add(md.getColumnLabel(i));

            List<List<String>> rows = new ArrayList<>();
            int n = 0;
            boolean truncated = false;
            while (rs.next()) {
                if (++n > limit) { truncated = true; break; }
                List<String> r = new ArrayList<>();
                for (int i = 1; i <= nc; i++) r.add(Objects.toString(rs.getString(i), ""));
                rows.add(r);
            }

            if (json) printJson(cols, rows);
            else      printTable(cols, rows);

            if (!quiet) {
                System.out.printf("%n%d righe%s%n", rows.size(), truncated ? " (troncate a --limit " + limit + ")" : "");
            }
        } catch (SQLException e) {
            // Il driver dice "attempt to write a readonly database" su qualsiasi DML: è il
            // comportamento voluto, ma vale la pena renderlo esplicito a chi legge.
            System.err.println("Errore SQL: " + e.getMessage());
            System.err.println("(la connessione è read-only: INSERT/UPDATE/DELETE sono rifiutati per costruzione)");
            System.exit(1);
        }
    }

    static String resolveDb(String s) {
        return switch (s) {
            case "prod"  -> PROD;
            case "local" -> LOCAL;
            default      -> s.replace('\\', '/');
        };
    }

    // Colonne allineate: la lettura a occhio di 10-20 righe è il caso d'uso normale.
    static void printTable(List<String> cols, List<List<String>> rows) {
        int[] w = new int[cols.size()];
        for (int i = 0; i < cols.size(); i++) w[i] = cols.get(i).length();
        for (var r : rows)
            for (int i = 0; i < r.size(); i++) w[i] = Math.max(w[i], r.get(i).length());

        StringBuilder head = new StringBuilder(), sep = new StringBuilder();
        for (int i = 0; i < cols.size(); i++) {
            head.append(pad(cols.get(i), w[i])).append("  ");
            sep.append("-".repeat(w[i])).append("  ");
        }
        System.out.println(head.toString().stripTrailing());
        System.out.println(sep.toString().stripTrailing());
        for (var r : rows) {
            StringBuilder line = new StringBuilder();
            for (int i = 0; i < r.size(); i++) line.append(pad(r.get(i), w[i])).append("  ");
            System.out.println(line.toString().stripTrailing());
        }
    }

    static String pad(String s, int w) { return s + " ".repeat(Math.max(0, w - s.length())); }

    static void printJson(List<String> cols, List<List<String>> rows) {
        StringBuilder sb = new StringBuilder("[");
        for (int j = 0; j < rows.size(); j++) {
            if (j > 0) sb.append(',');
            sb.append('{');
            for (int i = 0; i < cols.size(); i++) {
                if (i > 0) sb.append(',');
                sb.append('"').append(esc(cols.get(i))).append("\":\"").append(esc(rows.get(j).get(i))).append('"');
            }
            sb.append('}');
        }
        System.out.println(sb.append(']'));
    }

    static String esc(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "");
    }
}
