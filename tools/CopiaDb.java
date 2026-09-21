// ─────────────────────────────────────────────────────────────────────────────
// CopiaDb — rifà il DB di test a immagine di quello di produzione, TRANNE le impostazioni.
//
// Sostituisce la copia di file su file che faceva copy-db.ps1. Quella riportava indietro
// anche `app_settings`, cioè le cartelle di backup e di allegati di PRODUZIONE: il DB di
// progetto finiva a puntare ai file veri e andava ripuntato in locale a ogni copia. Qui il
// file di test resta lo stesso e cambiano le tabelle:
//
//   1. DROP di ogni tabella del test, tranne `app_settings`
//   2. CREATE TABLE, col testo esatto letto da `sqlite_master` di prod
//   3. INSERT ... SELECT dei dati
//   4. indici, trigger e viste — DOPO i dati
//   5. i contatori AUTOINCREMENT (`sqlite_sequence`)
//   6. verifica contro prod; solo se torna tutto, COMMIT
//
//   java --enable-native-access=ALL-UNNAMED --class-path target/moneymanager-<ver>.jar \
//        tools/CopiaDb.java --prod <path> --test <path> [--yes]
//
// (di norma si usa il wrapper tools\copy-db.ps1, che risolve da sé JAR e path)
//
// ⚠️ Prod si apre in SOLA LETTURA per costruzione: `ATTACH ... ?mode=ro`, e il driver rifiuta
// ogni scrittura (SQLITE_READONLY) — lo stesso vincolo di DbQuery, non una convenzione. Non
// disturba il lock dell'app di produzione né la sincronizzazione OneDrive.
//
// ⚠️ Tutto in UNA transazione. SQLite ha il DDL transazionale, quindi DROP + CREATE + INSERT
// sono atomici: se qualcosa fallisce, o la verifica finale non torna, ROLLBACK e il test
// resta com'era. La copia di file poteva lasciarlo a metà.
//
// ⚠️ Indici, trigger e viste si creano DOPO i dati. I 57 trigger di cattura scrivono in
// `change_log` a ogni INSERT: creati prima, il giornale del test si riempirebbe di una riga
// per ogni riga copiata, e non sarebbe più il giornale di prod.
//
// ⚠️ Foreign key spente per tutto il lavoro. Accese, un DROP TABLE fa prima una DELETE
// implicita che innesca le ON DELETE CASCADE, o viene rifiutato se altre tabelle puntano a
// righe che sta per togliere: l'ordine dei DROP diventerebbe un problema. Qui non conta.
//
// ⚠️ `app_settings` mantiene le RIGHE (la cartella dei backup, quella degli allegati e ogni
// altra preferenza sono del test), ma non gli oggetti che le stanno intorno: indici e trigger
// si rifanno da prod come per ogni altra tabella. Sono derivati, e quelli vecchi potrebbero
// riferirsi a tabelle che prod non ha (o non ha ancora). Se la tabella manca del tutto (DB di
// test nuovo) nasce VUOTA: senza cartella backup l'app rifiuta il backup, senza cartella
// allegati rifiuta gli allegati — non scrive da nessuna parte. Meglio vuota che ereditata.
//
// ⚠️ `sqlite_sequence` si copia: il contatore AUTOINCREMENT può essere più alto di MAX(id)
// (righe eliminate), ed è ciò che decide l'id della prossima riga. Le tabelle `sqlite_stat*`
// no: le ha create ANALYZE, `PRAGMA optimize` alla chiusura dell'app le rifà, e il DROP TABLE
// toglie da sé le righe delle tabelle cancellate — niente statistiche vecchie sui dati nuovi.
// ─────────────────────────────────────────────────────────────────────────────
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.sql.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

public class CopiaDb {

    /** L'unica tabella di cui il test tiene le righe: sono le preferenze, ciò che DEVE differire da prod. */
    static final String TENUTA = "app_settings";

    /** Esclude le tabelle interne di SQLite (sqlite_sequence, sqlite_stat*): non si creano a mano. */
    static final String NON_INTERNE = "name NOT LIKE 'sqlite\\_%' ESCAPE '\\'";

    /** Esiti d'uscita: 0 fatto, 1 errore (test intatto), 2 annullato dall'utente. */
    public static void main(String[] args) {
        // Le accentate di messaggi e nomi: senza forzare UTF-8 escono come "?" (code page OEM).
        System.setOut(new PrintStream(new FileOutputStream(FileDescriptor.out), true, StandardCharsets.UTF_8));
        System.setErr(new PrintStream(new FileOutputStream(FileDescriptor.err), true, StandardCharsets.UTF_8));
        int esito;
        try {
            esito = run(args);
        } catch (Exception e) {
            esito = errore(e.getMessage());
        }
        System.exit(esito);
    }

    static int run(String[] args) throws Exception {
        String prodArg = null, testArg = null;
        boolean subito = false;
        for (int i = 0; i < args.length; i++) {
            switch (args[i]) {
                case "--prod" -> prodArg = args[++i];
                case "--test" -> testArg = args[++i];
                case "--yes"  -> subito = true;      // niente conferma: per chi lo lancia da uno script
                default       -> { return uso(); }
            }
        }
        if (prodArg == null || testArg == null) return uso();

        Path prod = Path.of(prodArg).toAbsolutePath(), test = Path.of(testArg).toAbsolutePath();
        if (!Files.exists(prod)) return errore("il DB di produzione non esiste: " + prod);
        boolean nuovo = !Files.exists(test);
        // Stesso file con due grafie: senza questo controllo, un errore di configurazione
        // farebbe droppare le tabelle di PROD (l'ATTACH sarebbe read-only, il main no).
        if (!nuovo && Files.isSameFile(prod, test)) return errore("prod e test sono lo stesso file: " + prod);
        if (nuovo && !Files.isDirectory(test.getParent()))
            return errore("la cartella del DB di test non esiste: " + test.getParent());

        // ── Il piano: cosa c'è, cosa cambia, cosa resta ──────────────────────
        Info ip = leggi(prod);
        Info it = nuovo ? null : leggi(test);
        stampaPiano(prod, ip, test, it);

        if (!subito) {
            System.out.print("  INVIO per confermare, qualsiasi altro tasto + INVIO per annullare: ");
            System.out.flush();
            String risposta = new BufferedReader(new InputStreamReader(System.in)).readLine();
            if (risposta == null) {
                System.out.println();
                System.out.println("  Nessun input: annullato, niente è stato modificato (per procedere senza conferma: -Yes).");
                System.out.println();
                return 2;
            }
            if (!risposta.isEmpty()) {
                System.out.println("  Annullato: niente è stato modificato.");
                System.out.println();
                return 2;
            }
        }

        // ── Il lavoro ────────────────────────────────────────────────────────
        long t0 = System.nanoTime();
        Esito e;
        try {
            e = ricostruisci(prod, test);
        } catch (SQLException | RuntimeException ex) {
            // Il rollback ha già annullato tutto: al più resta il file vuoto che il driver crea
            // aprendo un path nuovo, ed è meglio non lasciarlo lì a sembrare un DB.
            if (nuovo) { Files.deleteIfExists(test); Files.deleteIfExists(Path.of(test + "-journal")); }
            String m = String.valueOf(ex.getMessage());
            System.out.println();
            if (m.contains("locked") || m.contains("BUSY"))
                System.out.println("  ERRORE: un database è occupato da un altro programma (" + m + ").\n"
                                 + "          Chiudi l'app e gli altri strumenti che lo tengono aperto (se è prod che sta\n"
                                 + "          salvando, basta aspettare un istante) e riprova.");
            else
                System.out.println("  ERRORE: " + m);
            System.out.println("  Il DB di test " + (nuovo ? "non è stato creato." : "è com'era: la transazione è stata annullata."));
            System.out.println();
            return 1;
        }

        double sec = (System.nanoTime() - t0) / 1e9;
        System.out.println();
        System.out.printf(Locale.ITALY, "  Fatto in %.1f s. DB di test ricostruito:%n", sec);
        System.out.printf(Locale.ITALY, "    %d tabelle · %,d righe · %d indici · %d trigger%s%n",
            e.tabelle, e.righe, e.indici, e.trigger, e.viste > 0 ? " · " + e.viste + " viste" : "");
        System.out.println("    Verificato contro prod: schema, righe e contatori identici · integrità del file: ok");
        System.out.printf(Locale.ITALY, "    %s: %s%n", TENUTA, creata(it) ? "creata vuota" : "intatta");
        System.out.println();
        return 0;
    }

    static int uso() {
        System.err.println("uso: CopiaDb --prod <path> --test <path> [--yes]");
        return 1;
    }

    static int errore(String msg) {
        System.err.println();
        System.err.println("  ERRORE: " + msg);
        System.err.println();
        return 1;
    }

    // ── Il piano mostrato prima di confermare ────────────────────────────────

    /** Cosa c'è in un DB, in poche righe: alimenta il piano. */
    record Info(long kb, LocalDateTime modificato, String schema, int tabelle, int indici, int trigger,
                boolean conImpostazioni, Map<String, String> impostazioni) {}

    /** `app_settings` andrà creata da zero: il test è nuovo, o è un file vuoto che non l'ha. */
    static boolean creata(Info test) { return test == null || !test.conImpostazioni; }

    /** Legge un DB in sola lettura. Un file che non è un database fa fallire qui, prima di toccare niente. */
    static Info leggi(Path p) throws Exception {
        try (Connection c = apri(p, true); Statement st = c.createStatement()) {
            String schema = esiste(st, "main", "schema_version") ? una(st, "SELECT version FROM schema_version") : null;
            Map<String, String> impl = new TreeMap<>();
            boolean conImpostazioni = esiste(st, "main", TENUTA);
            if (conImpostazioni) {
                try (ResultSet rs = st.executeQuery("SELECT key, value FROM " + TENUTA)) {
                    while (rs.next()) impl.put(rs.getString(1), rs.getString(2));
                }
            }
            return new Info(
                Files.size(p) / 1024,
                LocalDateTime.ofInstant(Files.getLastModifiedTime(p).toInstant(), ZoneId.systemDefault()),
                schema == null ? "?" : schema,
                Integer.parseInt(una(st, "SELECT count(*) FROM sqlite_master WHERE type='table' AND "
                                         + NON_INTERNE + " AND name <> " + lit(TENUTA))),
                Integer.parseInt(una(st, "SELECT count(*) FROM sqlite_master WHERE type='index' AND sql IS NOT NULL")),
                Integer.parseInt(una(st, "SELECT count(*) FROM sqlite_master WHERE type='trigger'")),
                conImpostazioni, impl);
        }
    }

    static void stampaPiano(Path prod, Info ip, Path test, Info it) {
        var data = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
        System.out.println();
        System.out.println("  Ricostruzione del DB di test da PRODUZIONE");
        System.out.println("  " + "─".repeat(63));
        System.out.println("  DA  (prod, sola lettura)   " + prod);
        System.out.printf(Locale.ITALY, "                             %,d KB · modificato %s · schema v%s%n",
            ip.kb, ip.modificato.format(data), ip.schema);
        System.out.println();
        if (it == null) {
            System.out.println("  A   (test, NUOVO)          " + test);
            System.out.println("                             non esiste ancora: lo creo");
        } else {
            System.out.println("  A   (test, RICOSTRUITO)    " + test);
            System.out.printf(Locale.ITALY, "                             %,d KB · modificato %s · schema v%s%n",
                it.kb, it.modificato.format(data), it.schema);
        }
        System.out.println();
        System.out.printf(Locale.ITALY, "  Da prod passano %d tabelle coi loro dati, %d indici e %d trigger.%n",
            ip.tabelle, ip.indici, ip.trigger);

        if (creata(it)) {
            System.out.println("  " + TENUTA + " nasce vuota: senza cartella backup e allegati l'app rifiuta di scriverli");
            System.out.println("  (nessun rischio per prod). Impostale da Impostazioni.");
        } else {
            System.out.printf(Locale.ITALY, "  Nel test si cancella tutto tranne le righe di %s: le sue %d impostazioni restano.%n",
                TENUTA, it.impostazioni.size());
            // Solo i percorsi: sono le impostazioni che dicono DOVE scrive l'istanza di test, e
            // quelle per cui un valore uguale a quello di prod è un guaio (backup che ne buttano
            // fuori di veri, allegati eliminati dalla cartella vera).
            int larg = 0;
            for (var k : it.impostazioni.entrySet())
                if (ePercorso(k.getValue())) larg = Math.max(larg, k.getKey().length());
            for (var k : it.impostazioni.entrySet()) {
                if (!ePercorso(k.getValue())) continue;
                System.out.println("      " + k.getKey() + " ".repeat(larg - k.getKey().length() + 2) + k.getValue());
                if (k.getValue().equalsIgnoreCase(ip.impostazioni.get(k.getKey())))
                    System.out.println("      " + " ".repeat(larg + 2)
                        + "⚠ identica a quella di prod: da questa istanza si scrive (e si elimina) nei file veri");
            }
        }
        System.out.println();
    }

    /** Un valore che è un percorso assoluto di Windows (X:\ oppure \\server\). */
    static boolean ePercorso(String v) {
        return v != null && v.matches("^([A-Za-z]:[\\\\/]|\\\\\\\\).*");
    }

    // ── Il lavoro vero ───────────────────────────────────────────────────────

    /** Cosa è stato ricostruito: serve al resoconto finale. */
    static final class Esito { int tabelle, indici, trigger, viste; long righe; }

    /** Apre il test in scrittura, aggancia prod in sola lettura e rifà tutto in una transazione. */
    static Esito ricostruisci(Path prod, Path test) throws SQLException {
        var cfg = new org.sqlite.SQLiteConfig();
        // Se prod sta salvando o il test è tenuto da un altro processo si aspetta un attimo
        // invece di fallire al primo tentativo.
        cfg.setBusyTimeout(5000);
        try (Connection c = DriverManager.getConnection(url(test), cfg.toProperties());
             Statement st = c.createStatement()) {

            // Fuori da una transazione, altrimenti il PRAGMA è un no-op.
            st.execute("PRAGMA foreign_keys=OFF");
            // Il nome del file finisce dentro l'SQL, non come parametro: gli apici si raddoppiano.
            st.execute("ATTACH DATABASE " + lit(prod.toUri().toASCIIString() + "?mode=ro") + " AS prod");

            st.execute("BEGIN IMMEDIATE");
            try {
                Esito e = lavora(st);
                st.execute("COMMIT");
                return e;
            } catch (SQLException | RuntimeException e) {
                // Un ROLLBACK che fallisce non cambia l'esito: la connessione si chiude qui sotto
                // e SQLite annulla comunque la transazione aperta.
                try { st.execute("ROLLBACK"); } catch (SQLException ignorata) { }
                throw e;
            }
        }
    }

    /**
     * Le sei fasi dell'intestazione, dentro la transazione aperta da chi chiama.
     * `main` è il test, `prod` è la produzione agganciata in sola lettura.
     */
    static Esito lavora(Statement st) throws SQLException {
        boolean haImpostazioni = esiste(st, "main", TENUTA);
        Esito e = new Esito();

        // 1. Via il vecchio. Una tabella si porta dietro i propri indici e trigger; le viste no.
        for (String v : colonna(st, "SELECT name FROM main.sqlite_master WHERE type='view'"))
            st.execute("DROP VIEW main." + q(v));
        for (String t : colonna(st, "SELECT name FROM main.sqlite_master WHERE type='table' AND "
                                    + NON_INTERNE + " AND name <> " + lit(TENUTA)))
            st.execute("DROP TABLE main." + q(t));
        // Di `app_settings` restano le righe, non gli oggetti: rifatti da prod, come tutti gli altri.
        if (haImpostazioni) {
            for (String[] o : righe(st, "SELECT type, name FROM main.sqlite_master WHERE tbl_name=" + lit(TENUTA)
                                        + " AND type IN ('index','trigger') AND sql IS NOT NULL"))
                st.execute("DROP " + o[0].toUpperCase() + " main." + q(o[1]));
        }

        // 2. Le tabelle di prod, col testo esatto di prod. Nomi non qualificati: una CREATE TABLE
        // va sempre in `main`.
        List<String[]> tabelle = righe(st, "SELECT name, sql FROM prod.sqlite_master WHERE type='table' AND "
                                           + NON_INTERNE + " ORDER BY rowid");
        for (String[] t : tabelle) {
            if (t[0].equals(TENUTA) && haImpostazioni) continue;
            st.execute(t[1]);
        }

        // 3. I dati. Le righe di `app_settings` non si copiano mai.
        for (String[] t : tabelle) {
            if (t[0].equals(TENUTA)) continue;
            e.righe += st.executeUpdate("INSERT INTO main." + q(t[0]) + " SELECT * FROM prod." + q(t[0]));
            e.tabelle++;
        }

        // 4. Indici, trigger e viste, dopo i dati. Le tabelle ci sono già tutte in `main`, quindi
        // un `ON <tabella>` non qualificato si risolve lì e non in `prod`.
        for (String[] o : righe(st, "SELECT type, sql FROM prod.sqlite_master WHERE type IN ('index','trigger','view')"
                                    + " AND sql IS NOT NULL ORDER BY CASE type WHEN 'view' THEN 0 WHEN 'index' THEN 1 ELSE 2 END, rowid")) {
            st.execute(o[1]);
            switch (o[0]) {
                case "index"   -> e.indici++;
                case "trigger" -> e.trigger++;
                default        -> e.viste++;
            }
        }

        // 5. I contatori AUTOINCREMENT, quelli veri di prod (non il massimo degli id presenti).
        if (esiste(st, "main", "sqlite_sequence") && esiste(st, "prod", "sqlite_sequence")) {
            st.executeUpdate("DELETE FROM main.sqlite_sequence WHERE name <> " + lit(TENUTA));
            st.executeUpdate("INSERT INTO main.sqlite_sequence(name, seq) SELECT name, seq FROM prod.sqlite_sequence"
                             + " WHERE name <> " + lit(TENUTA));
        }

        // 6. Verifica, ancora dentro la transazione: se non torna, chi chiama fa ROLLBACK.
        List<String> problemi = verifica(st, tabelle);
        if (!problemi.isEmpty())
            throw new SQLException("la verifica contro prod non torna:\n            - " + String.join("\n            - ", problemi));
        return e;
    }

    /**
     * Confronta il risultato con prod. Non si fida di come è stato prodotto: rilegge tutto.
     * Vuota = tutto uguale.
     */
    static List<String> verifica(Statement st, List<String[]> tabelle) throws SQLException {
        List<String> p = new ArrayList<>();

        // Schema: ogni oggetto, col suo testo. Fa eccezione la sola definizione della tabella
        // `app_settings`, che è del test e non si tocca.
        String filtro = "tbl_name NOT LIKE 'sqlite\\_%' ESCAPE '\\' AND NOT (type='table' AND name=" + lit(TENUTA) + ")";
        String sm = "SELECT type, name, tbl_name, sql FROM main.sqlite_master WHERE " + filtro;
        String sp = "SELECT type, name, tbl_name, sql FROM prod.sqlite_master WHERE " + filtro;
        int soloTest = differenze(st, sm, sp), soloProd = differenze(st, sp, sm);
        if (soloTest + soloProd > 0)
            p.add("schema diverso da prod (" + soloTest + " oggetti solo nel test, " + soloProd + " solo in prod)");

        // Dati: stesso numero di righe e nessuna riga da una parte sola.
        for (String[] t : tabelle) {
            if (t[0].equals(TENUTA)) continue;
            String m = "SELECT * FROM main." + q(t[0]), r = "SELECT * FROM prod." + q(t[0]);
            long nm = conta(st, m), nr = conta(st, r);
            int x = differenze(st, m, r), y = differenze(st, r, m);
            if (nm != nr || x + y > 0)
                p.add(t[0] + ": " + nm + " righe nel test, " + nr + " in prod (" + (x + y) + " differenti)");
        }

        // Contatori AUTOINCREMENT.
        if (esiste(st, "main", "sqlite_sequence") && esiste(st, "prod", "sqlite_sequence")) {
            String m = "SELECT name, seq FROM main.sqlite_sequence WHERE name <> " + lit(TENUTA);
            String r = "SELECT name, seq FROM prod.sqlite_sequence WHERE name <> " + lit(TENUTA);
            if (differenze(st, m, r) + differenze(st, r, m) > 0) p.add("contatori AUTOINCREMENT diversi da prod");
        }

        // La struttura fisica del file dopo tutto questo DDL: indici coerenti con le tabelle, pagine a posto.
        List<String> integrita = colonna(st, "PRAGMA main.integrity_check");
        if (!integrita.equals(List.of("ok"))) p.add("integrity_check: " + String.join("; ", integrita));
        return p;
    }

    // ── Piccoli attrezzi ─────────────────────────────────────────────────────

    static Connection apri(Path p, boolean soloLettura) throws SQLException {
        var cfg = new org.sqlite.SQLiteConfig();
        cfg.setReadOnly(soloLettura);
        cfg.setBusyTimeout(5000);
        return DriverManager.getConnection(url(p), cfg.toProperties());
    }

    static String url(Path p) { return "jdbc:sqlite:" + p.toString().replace('\\', '/'); }

    /** Identificatore SQL fra virgolette (raddoppiando quelle interne). */
    static String q(String ident) { return "\"" + ident.replace("\"", "\"\"") + "\""; }

    /** Stringa letterale SQL (raddoppiando gli apici). */
    static String lit(String s) { return "'" + s.replace("'", "''") + "'"; }

    static boolean esiste(Statement st, String schema, String tabella) throws SQLException {
        return una(st, "SELECT 1 FROM " + schema + ".sqlite_master WHERE type='table' AND name=" + lit(tabella)) != null;
    }

    /** Righe di `a` che non stanno in `b`. */
    static int differenze(Statement st, String a, String b) throws SQLException {
        return Integer.parseInt(una(st, "SELECT count(*) FROM (" + a + " EXCEPT " + b + ")"));
    }

    static long conta(Statement st, String select) throws SQLException {
        return Long.parseLong(una(st, "SELECT count(*) FROM (" + select + ")"));
    }

    /** Primo valore della prima riga, o null se non ce ne sono. */
    static String una(Statement st, String sql) throws SQLException {
        try (ResultSet rs = st.executeQuery(sql)) { return rs.next() ? rs.getString(1) : null; }
    }

    static List<String> colonna(Statement st, String sql) throws SQLException {
        List<String> l = new ArrayList<>();
        try (ResultSet rs = st.executeQuery(sql)) { while (rs.next()) l.add(rs.getString(1)); }
        return l;
    }

    /** Tutte le righe materializzate: si può poi eseguire altro sullo stesso Statement. */
    static List<String[]> righe(Statement st, String sql) throws SQLException {
        List<String[]> l = new ArrayList<>();
        try (ResultSet rs = st.executeQuery(sql)) {
            int n = rs.getMetaData().getColumnCount();
            while (rs.next()) {
                String[] r = new String[n];
                for (int i = 0; i < n; i++) r[i] = rs.getString(i + 1);
                l.add(r);
            }
        }
        return l;
    }
}
