import com.google.gson.*;
import com.moneymanager.Database;
import java.lang.reflect.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.sql.*;
import java.time.LocalDate;
import java.util.*;

/**
 * Confronto "prima/dopo" delle letture di Database: dice se una modifica al codice cambia un
 * numero che l'app mostra. Lo orchestra tools\confronta-query.ps1, che compila la versione di
 * riferimento (un commit) e quella in corso e lancia questo file una volta per ciascuna.
 *
 *   esegui    <db-sorgente> <cartella> <etichetta>
 *       Chiama le letture di Database su una COPIA del DB, in due scenari (vedi SCENARI), e
 *       salva per ogni chiamata il risultato e il testo SQL di ogni query eseguita,
 *       intercettato da una spia sulla Connection.
 *   confronta <cartella> <rif> <nuovo> <rif-bis>
 *       Confronta le esecuzioni. <rif-bis> è una seconda esecuzione del riferimento: una
 *       chiamata che cambia fra <rif> e <rif-bis> non è deterministica (orari, ordine casuale)
 *       e viene segnalata a parte, invece di far fallire il confronto per un motivo finto.
 *
 * Esce con 0 se i risultati sono identici, 1 se qualcosa cambia, 2 se il confronto non è
 * stato possibile.
 */
public class ConfrontaQuery {
    /**
     * reale   : il DB com'è.
     * escluse : le categorie più usate (anche dagli split) marcate "escluse da budget e report".
     *           Sui dati veri quasi nessun movimento sta su una categoria esclusa e nessuna riga
     *           split: senza questo scenario i rami del filtro non verrebbero mai messi alla
     *           prova, e un filtro rotto passerebbe per "identico".
     */
    static final List<String> SCENARI = List.of("reale", "escluse");

    static final List<String> sqlLog = Collections.synchronizedList(new ArrayList<>());
    // disableHtmlEscaping: senza, '=' '<' '>' diventano = ecc. e l'SQL nel rapporto è illeggibile
    static final Gson GSON = new GsonBuilder().serializeNulls().serializeSpecialFloatingPointValues()
            .disableHtmlEscaping().create();

    interface Chiamata { Object run() throws Exception; }

    public static void main(String[] args) throws Exception {
        System.setOut(new java.io.PrintStream(new java.io.FileOutputStream(java.io.FileDescriptor.out), true, "UTF-8"));
        System.setErr(new java.io.PrintStream(new java.io.FileOutputStream(java.io.FileDescriptor.err), true, "UTF-8"));
        try {
            if (args.length == 4 && args[0].equals("esegui"))         esegui(Path.of(args[1]), Path.of(args[2]), args[3]);
            else if (args.length == 5 && args[0].equals("confronta")) System.exit(confronta(Path.of(args[1]), args[2], args[3], args[4]));
            else { System.err.println("uso: esegui <db> <cartella> <etichetta> | confronta <cartella> <rif> <nuovo> <rif-bis>"); System.exit(2); }
        } catch (Exception e) {
            e.printStackTrace();
            System.exit(2);
        }
    }

    // ── esegui ──────────────────────────────────────────────────────────────────

    static void esegui(Path sorgente, Path cartella, String etichetta) throws Exception {
        for (String scen : SCENARI) {
            // Stesso nome di file per TUTTE le esecuzioni: alcune letture restituiscono il path
            // del DB, e un nome diverso per versione le farebbe risultare cambiate.
            Path copia = cartella.resolve("lavoro.db");
            pulisci(copia);
            Files.copy(sorgente, copia);

            // Gli id da interrogare si leggono con una connessione a parte, PRIMA di aprire
            // Database: se venissero dal codice sotto esame, una modifica che cambia getAccounts
            // cambierebbe anche l'elenco delle chiamate, e il confronto non avrebbe più senso.
            Ids ids;
            try (Connection raw = DriverManager.getConnection("jdbc:sqlite:" + copia)) {
                if (scen.equals("escluse")) segnaEscluse(raw);
                ids = Ids.leggi(raw);
            }

            Database d = new Database(copia.toString());
            d.setAutoRelease(false);
            Field f = Database.class.getDeclaredField("conn");
            f.setAccessible(true);
            Connection spia = spia((Connection) f.get(d));
            f.set(d, spia);

            JsonArray out = new JsonArray();
            List<Map.Entry<String, Chiamata>> chiamate = chiamate(d, ids);
            for (var c : chiamate) {
                int da = sqlLog.size();
                Object r;
                try { r = canon(c.getValue().run()); }
                catch (Throwable t) { r = "ERRORE " + t.getClass().getSimpleName() + ": " + t.getMessage(); }
                JsonObject o = new JsonObject();
                o.addProperty("nome", c.getKey());
                o.add("risultato", GSON.toJsonTree(r));
                JsonArray sql = new JsonArray();
                for (String s : new ArrayList<>(sqlLog.subList(da, sqlLog.size()))) sql.add(normSql(s));
                o.add("sql", sql);
                out.add(o);
            }
            // La spia deve essere ancora al suo posto: se Database avesse riaperto la connessione,
            // le query successive non sarebbero state registrate e il confronto SQL mentirebbe.
            if (f.get(d) != spia) throw new IllegalStateException("la connessione è stata sostituita durante l'esecuzione");
            if (sqlLog.isEmpty()) throw new IllegalStateException("nessuna query intercettata: la spia non funziona");
            d.close();

            Files.writeString(cartella.resolve(etichetta + "-" + scen + ".json"), GSON.toJson(out), StandardCharsets.UTF_8);
            System.out.printf("   %-8s %-8s %4d chiamate, %5d query%n", etichetta, scen, chiamate.size(), sqlLog.size());
            sqlLog.clear();
            pulisci(copia);
        }
    }

    /** Gli id su cui iterare, letti dal DB e non dal codice sotto esame. */
    record Ids(List<Integer> conti, List<Integer> categorie, List<List<Integer>> gruppi, List<Integer> titoli,
               List<Integer> previsioni, List<Integer> conSplit, List<Integer> anni) {
        static Ids leggi(Connection raw) throws SQLException {
            List<List<Integer>> gruppi = new ArrayList<>();
            for (int p : interi(raw, "SELECT id FROM categories WHERE parent_id IS NULL ORDER BY id")) {
                List<Integer> g = new ArrayList<>(List.of(p));
                g.addAll(interi(raw, "SELECT id FROM categories WHERE parent_id=" + p + " ORDER BY id"));
                gruppi.add(g);
            }
            return new Ids(
                interi(raw, "SELECT id FROM accounts ORDER BY id"),
                interi(raw, "SELECT id FROM categories ORDER BY id"),
                gruppi,
                interi(raw, "SELECT id FROM portfolio ORDER BY id"),
                interi(raw, "SELECT id FROM forecasts ORDER BY id"),
                interi(raw, "SELECT DISTINCT transaction_id FROM transaction_splits ORDER BY 1"),
                interi(raw, "SELECT DISTINCT CAST(substr(date,1,4) AS INTEGER) FROM transactions WHERE date IS NOT NULL ORDER BY 1"));
        }
    }

    /**
     * Le letture da confrontare. Date relative a oggi: le due versioni girano a pochi secondi di
     * distanza, quindi vedono lo stesso "oggi". In fondo le poche scritture, perché cambiano i
     * dati che le letture successive vedrebbero.
     */
    static List<Map.Entry<String, Chiamata>> chiamate(Database d, Ids ids) {
        List<Map.Entry<String, Chiamata>> c = new ArrayList<>();
        LocalDate oggi = LocalDate.now();
        int y = oggi.getYear();
        String t = oggi.toString(), inizioAnno = y + "-01-01";
        String unAnnoFa = oggi.minusYears(1).toString(), inizioAnnoScorso = (y - 1) + "-01-01";
        List<Integer> anni = new ArrayList<>(ids.anni());
        if (!anni.contains(y + 1)) anni.add(y + 1);
        String tutte = "\"date_from\":\"1900-01-01\",\"date_to\":\"2999-12-31\"";

        // ── Conti
        c.add(Map.entry("getAccounts", d::getAccounts));
        for (int a : ids.conti()) {
            c.add(Map.entry("getAccountSummary(" + a + ")", () -> d.getAccountSummary(a)));
            c.add(Map.entry("getAccountUsage(" + a + ")", () -> d.getAccountUsage(a)));
        }
        for (int n : new int[]{6, 12, 36}) c.add(Map.entry("getAccountBalanceHistory(" + n + ")", () -> d.getAccountBalanceHistory(n)));

        // ── Categorie
        c.add(Map.entry("getCategories", d::getCategories));
        for (int k : ids.categorie()) c.add(Map.entry("getCategoryUsage(" + k + ")", () -> d.getCategoryUsage(k)));
        c.add(Map.entry("getExpenseNatureReport({})", () -> d.getExpenseNatureReport(json("{}"))));
        c.add(Map.entry("getExpenseNatureReport(anno)", () -> d.getExpenseNatureReport(json("{\"date_from\":\"" + inizioAnno + "\",\"date_to\":\"" + t + "\"}"))));
        c.add(Map.entry("getTopDescriptions({})", () -> d.getTopDescriptions(json("{}"))));
        c.add(Map.entry("getTopDescriptions(query=a)", () -> d.getTopDescriptions(json("{\"query\":\"a\"}"))));

        // ── Transazioni (con i filtri della pagina)
        c.add(Map.entry("getTransactions(tutte)", () -> d.getTransactions(json("{" + tutte + "}"))));
        for (int a : anni) c.add(Map.entry("getTransactions(year=" + a + ")", () -> d.getTransactions(json("{\"year\":" + a + "}"))));
        c.add(Map.entry("getTransactions(mese corrente)", () -> d.getTransactions(json("{\"year\":" + y + ",\"month\":" + oggi.getMonthValue() + "}"))));
        for (String tipo : new String[]{"expense", "income", "transfer"})
            c.add(Map.entry("getTransactions(type=" + tipo + ")", () -> d.getTransactions(json("{" + tutte + ",\"type\":\"" + tipo + "\"}"))));
        for (int a : ids.conti())
            c.add(Map.entry("getTransactions(account_id=" + a + ")", () -> d.getTransactions(json("{" + tutte + ",\"account_id\":" + a + "}"))));
        for (List<Integer> g : ids.gruppi())
            c.add(Map.entry("getTransactions(category_ids=" + g + ")", () -> d.getTransactions(json("{" + tutte + ",\"category_ids\":" + g + "}"))));
        c.add(Map.entry("getTransactions(reconciled=0)", () -> d.getTransactions(json("{" + tutte + ",\"reconciled\":0}"))));
        c.add(Map.entry("getTransactions(search=a)", () -> d.getTransactions(json("{" + tutte + ",\"search\":\"a\"}"))));
        c.add(Map.entry("getTransactions(has_attachment=1)", () -> d.getTransactions(json("{" + tutte + ",\"has_attachment\":\"1\"}"))));
        c.add(Map.entry("getTransactions(sort amount desc, limit 50)", () -> d.getTransactions(json("{" + tutte + ",\"sort_col\":\"amount\",\"sort_dir\":\"desc\",\"limit\":50}"))));
        for (int tx : ids.conSplit()) c.add(Map.entry("getTransactionSplits(" + tx + ")", () -> d.getTransactionSplits(tx)));
        for (String k : new String[]{"phone", "oneoff", "investment", "cardsettle"})
            c.add(Map.entry("getTransactionsWithTag(" + k + ")", () -> d.getTransactionsWithTag(k)));
        c.add(Map.entry("getTags", d::getTags));
        c.add(Map.entry("getNotes", d::getNotes));
        c.add(Map.entry("getRangePresets", d::getRangePresets));
        c.add(Map.entry("getReports", d::getReports));
        c.add(Map.entry("archivePreview(anno scorso -> oggi)", () -> d.archivePreview(inizioAnnoScorso, t, ids.categorie())));

        // ── Pianificate. getScheduled riallinea anche i saldi carta (syncCardSettlements):
        //    sta qui in testa perché nell'app succede lo stesso, all'avvio.
        c.add(Map.entry("getScheduled", d::getScheduled));
        c.add(Map.entry("getOverdue", d::getOverdue));
        c.add(Map.entry("getDueToday", d::getDueToday));
        for (int n : new int[]{15, 100}) c.add(Map.entry("getUpcomingAll(" + n + ")", () -> d.getUpcomingAll(n)));
        String fra3m = oggi.plusMonths(3).toString(), fra12m = oggi.plusMonths(12).toString();
        c.add(Map.entry("getProjection(12 mesi)", () -> d.getProjection(t, fra12m, null, false)));
        c.add(Map.entry("getProjection(3 mesi, giornaliera)", () -> d.getProjection(t, fra3m, null, true)));
        if (ids.conti().size() >= 2) {
            String dueConti = ids.conti().get(0) + "," + ids.conti().get(1);
            c.add(Map.entry("getProjection(12 mesi, conti " + dueConti + ")", () -> d.getProjection(t, fra12m, dueConti, false)));
        }
        c.add(Map.entry("getProjectionByCategory(12 mesi)", () -> d.getProjectionByCategory(t, fra12m)));

        // ── Portafoglio
        c.add(Map.entry("getPortfolio", d::getPortfolio));
        for (int p : ids.titoli()) {
            c.add(Map.entry("getPortfolioTransactions(" + p + ")", () -> d.getPortfolioTransactions(p)));
            c.add(Map.entry("getPortfolioDeletionPreview(" + p + ")", () -> d.getPortfolioDeletionPreview(p)));
        }

        // ── Previsioni salvate
        c.add(Map.entry("getForecasts", d::getForecasts));
        for (int p : ids.previsioni()) c.add(Map.entry("getForecastDetail(" + p + ")", () -> d.getForecastDetail(p)));

        // ── Budget
        c.add(Map.entry("getBudgetYears", d::getBudgetYears));
        for (int a : anni) c.add(Map.entry("getBudgetYear(" + a + ")", () -> d.getBudgetYear(a)));

        // ── Dashboard e Analytics
        for (int a : anni) {
            c.add(Map.entry("getDashboardStats(" + a + ")", () -> d.getDashboardStats(a)));
            c.add(Map.entry("getMonthlyChartData(" + a + ")", () -> d.getMonthlyChartData(a)));
            for (String tipo : new String[]{"expense", "income"})
                c.add(Map.entry("getCategoryChartData(" + a + "," + tipo + ")", () -> d.getCategoryChartData(a, tipo)));
        }
        String[][] periodi = {{inizioAnno, t}, {inizioAnnoScorso, (y - 1) + "-12-31"}, {"1900-01-01", "2999-12-31"}};
        for (String[] r : periodi) c.add(Map.entry("getStatsByDateRange(" + r[0] + "," + r[1] + ")", () -> d.getStatsByDateRange(r[0], r[1])));
        c.add(Map.entry("getOldestTransactionMonth", d::getOldestTransactionMonth));
        for (int n : new int[]{1, 6, 12, 36}) c.add(Map.entry("getMonthlyBalance(" + n + ")", () -> d.getMonthlyBalance(n)));
        for (int n : new int[]{6, 12, 36})    c.add(Map.entry("getCategoryMonthTable(" + n + ")", () -> d.getCategoryMonthTable(n)));
        LocalDate meseScorso = oggi.minusMonths(1).withDayOfMonth(1);
        String[][] confronti = {
            {inizioAnnoScorso, unAnnoFa, inizioAnno, t},
            {meseScorso.minusYears(1).toString(), meseScorso.minusYears(1).plusMonths(1).minusDays(1).toString(),
             meseScorso.toString(), meseScorso.plusMonths(1).minusDays(1).toString()},
            {(y - 2) + "-01-01", (y - 2) + "-12-31", inizioAnnoScorso, (y - 1) + "-12-31"}};
        for (String[] r : confronti)
            for (String g : new String[]{"parent", "category"})
                c.add(Map.entry("getCategoryComparison(" + String.join(",", r) + "," + g + ")",
                        () -> d.getCategoryComparison(r[0], r[1], r[2], r[3], g)));
        for (int n : new int[]{3, 6, 12, 24}) c.add(Map.entry("getForecastExpenseSplit(" + n + ")", () -> d.getForecastExpenseSplit(n)));
        int[][] motore = {{6, 12, 0}, {12, 24, 1}, {24, 6, 0}, {3, 120, 1}};
        for (int[] p : motore)
            c.add(Map.entry("getForecastEngine(" + p[0] + "," + p[1] + "," + (p[2] == 1) + ")", () -> d.getForecastEngine(p[0], p[1], p[2] == 1)));

        // ── Scritture, in fondo: si confronta ciò che lasciano scritto
        for (int a : new int[]{y + 1, y}) {
            c.add(Map.entry("generateBudget(" + a + ",true)", () -> { d.generateBudget(a, true); return "ok"; }));
            c.add(Map.entry("dopo generateBudget -> getBudgetYear(" + a + ")", () -> d.getBudgetYear(a)));
        }
        return c;
    }

    /** Scenario "escluse": 3 categorie dagli split, 3 di uscita e 2 di entrata, le più usate. */
    static void segnaEscluse(Connection raw) throws SQLException {
        List<Integer> ids = new ArrayList<>();
        for (String q : new String[]{
                "SELECT category_id FROM transaction_splits WHERE category_id IS NOT NULL GROUP BY category_id ORDER BY COUNT(*) DESC, category_id LIMIT 3",
                "SELECT category_id FROM transactions WHERE type='expense' AND category_id IS NOT NULL GROUP BY category_id ORDER BY COUNT(*) DESC, category_id LIMIT 3",
                "SELECT category_id FROM transactions WHERE type='income'  AND category_id IS NOT NULL GROUP BY category_id ORDER BY COUNT(*) DESC, category_id LIMIT 2"})
            for (int id : interi(raw, q)) if (!ids.contains(id)) ids.add(id);
        if (ids.isEmpty()) return;
        String in = ids.toString().replace('[', '(').replace(']', ')');
        try (Statement st = raw.createStatement()) { st.executeUpdate("UPDATE categories SET excluded_from_budget=1 WHERE id IN " + in); }
    }

    // ── confronta ───────────────────────────────────────────────────────────────

    static int confronta(Path cartella, String rif, String nuovo, String rifBis) throws Exception {
        int diverse = 0;
        for (String scen : SCENARI) {
            Map<String, JsonObject> a = leggi(cartella, rif, scen), b = leggi(cartella, nuovo, scen), a2 = leggi(cartella, rifBis, scen);
            // risDiversi: l'esito. sqlSolo: SQL cambiato ma risultato identico — informativo (una
            // riscrittura delle query lo produce per definizione). Dove cambia il risultato, che
            // sia cambiato anche l'SQL è scontato e non si ripete.
            List<String> risDiversi = new ArrayList<>(), sqlSolo = new ArrayList<>(), instabili = new ArrayList<>();
            int errori = 0;
            for (String k : a.keySet()) if (!b.containsKey(k)) risDiversi.add(k + "\n        presente solo nel riferimento");
            for (String k : b.keySet()) if (!a.containsKey(k)) risDiversi.add(k + "\n        presente solo nella versione nuova");
            for (String k : a.keySet()) {
                if (!b.containsKey(k)) continue;
                String ra = GSON.toJson(a.get(k).get("risultato")), rb = GSON.toJson(b.get(k).get("risultato"));
                String ra2 = a2.containsKey(k) ? GSON.toJson(a2.get(k).get("risultato")) : ra;
                if (rb.startsWith("\"ERRORE")) errori++;
                if (!ra.equals(ra2)) { instabili.add(k); continue; }
                if (!ra.equals(rb)) { risDiversi.add(k + "\n" + differenza(ra, rb)); continue; }
                String sa = GSON.toJson(a.get(k).get("sql")), sb = GSON.toJson(b.get(k).get("sql"));
                if (!sa.equals(sb)) sqlSolo.add(k + "\n" + differenza(sa, sb));
            }
            diverse += risDiversi.size();

            System.out.printf("%n── scenario %s: %d chiamate%n", scen, a.size());
            System.out.printf("   risultati : %s%n", risDiversi.isEmpty() ? "IDENTICI" : risDiversi.size() + " DIVERSI");
            stampa("≠", risDiversi, 15);
            System.out.printf("   testo SQL : %s%n", sqlSolo.isEmpty()
                    ? (risDiversi.isEmpty() ? "identico (a meno degli spazi)" : "identico dove i risultati coincidono")
                    : "cambiato in " + sqlSolo.size() + " chiamate con risultato identico");
            stampa("~", sqlSolo, 3);
            if (!instabili.isEmpty())
                System.out.printf("   non deterministiche, escluse dal confronto: %d  %s%n", instabili.size(), instabili);
            if (errori > 0)
                System.out.printf("   chiamate finite in errore nella versione nuova: %d%n", errori);
        }
        return diverse == 0 ? 0 : 1;
    }

    /** Le prime `conDettaglio` voci col punto di divergenza, poi solo i nomi (al massimo 20). */
    static void stampa(String segno, List<String> voci, int conDettaglio) {
        List<String> soloNomi = new ArrayList<>();
        for (int i = 0; i < voci.size(); i++) {
            String[] p = voci.get(i).split("\n", 2);
            if (i < conDettaglio) { System.out.println("   " + segno + " " + p[0]); System.out.println(p[1]); }
            else soloNomi.add(p[0]);
        }
        if (soloNomi.isEmpty()) return;
        List<String> mostrati = soloNomi.subList(0, Math.min(20, soloNomi.size()));
        System.out.println("   " + segno + " anche: " + String.join(", ", mostrati)
                + (soloNomi.size() > mostrati.size() ? " … e altre " + (soloNomi.size() - mostrati.size()) : ""));
    }

    /** Il punto in cui due testi cominciano a divergere, con un po' di contesto. */
    static String differenza(String a, String b) {
        int i = 0;
        while (i < a.length() && i < b.length() && a.charAt(i) == b.charAt(i)) i++;
        int da = Math.max(0, i - 60);
        return "        rif:   …" + a.substring(da, Math.min(a.length(), i + 60)) + "…\n"
             + "        nuovo: …" + b.substring(da, Math.min(b.length(), i + 60)) + "…";
    }

    static Map<String, JsonObject> leggi(Path cartella, String etichetta, String scen) throws Exception {
        Map<String, JsonObject> m = new LinkedHashMap<>();
        for (JsonElement e : JsonParser.parseString(Files.readString(cartella.resolve(etichetta + "-" + scen + ".json"), StandardCharsets.UTF_8)).getAsJsonArray()) {
            JsonObject o = e.getAsJsonObject();
            m.put(o.get("nome").getAsString(), o);
        }
        return m;
    }

    // ── supporto ────────────────────────────────────────────────────────────────

    /** Registra il testo di ogni query preparata o eseguita sulla connessione di Database. */
    static Connection spia(Connection real) {
        return (Connection) Proxy.newProxyInstance(ConfrontaQuery.class.getClassLoader(), new Class<?>[]{Connection.class}, (p, m, a) -> {
            if (a != null && a.length > 0 && a[0] instanceof String s
                    && (m.getName().startsWith("prepare") || m.getName().equals("nativeSQL"))) sqlLog.add(s);
            try {
                Object r = m.invoke(real, a);
                if (r instanceof Statement st && m.getName().equals("createStatement")) return spiaStatement(st);
                return r;
            } catch (InvocationTargetException e) { throw e.getCause(); }
        });
    }

    static Statement spiaStatement(Statement real) {
        return (Statement) Proxy.newProxyInstance(ConfrontaQuery.class.getClassLoader(), new Class<?>[]{Statement.class}, (p, m, a) -> {
            if (a != null && a.length > 0 && a[0] instanceof String s
                    && (m.getName().startsWith("execute") || m.getName().equals("addBatch"))) sqlLog.add(s);
            try { return m.invoke(real, a); }
            catch (InvocationTargetException e) { throw e.getCause(); }
        });
    }

    /** SQL senza differenze di soli spazi: a capo, rientri, spazi attorno a parentesi e virgole. */
    static String normSql(String s) {
        return s.replaceAll("\\s+", " ").replaceAll("\\s*([(),])\\s*", "$1").trim();
    }

    /**
     * Chiavi ordinate ricorsivamente: Map.of ha un ordine di iterazione diverso a ogni avvio
     * della JVM, e senza questo due esecuzioni dello STESSO codice risulterebbero diverse.
     * I tipi che non sono mappe, liste o valori semplici diventano testo: Gson non sa
     * serializzare per riflessione i tipi del JDK (es. LocalDate) e farebbe fallire la chiamata.
     */
    static Object canon(Object o) {
        if (o instanceof Map<?, ?> m) {
            TreeMap<String, Object> t = new TreeMap<>();
            m.forEach((k, v) -> t.put(String.valueOf(k), canon(v)));
            return t;
        }
        if (o instanceof Collection<?> c) {
            List<Object> l = new ArrayList<>();
            for (Object x : c) l.add(canon(x));
            return l;
        }
        if (o == null || o instanceof Number || o instanceof String || o instanceof Boolean) return o;
        if (o.getClass().isArray()) {
            List<Object> l = new ArrayList<>();
            for (int i = 0; i < java.lang.reflect.Array.getLength(o); i++) l.add(canon(java.lang.reflect.Array.get(o, i)));
            return l;
        }
        return String.valueOf(o);
    }

    static JsonObject json(String s) { return JsonParser.parseString(s).getAsJsonObject(); }

    static List<Integer> interi(Connection raw, String sql) throws SQLException {
        List<Integer> l = new ArrayList<>();
        try (Statement st = raw.createStatement(); ResultSet rs = st.executeQuery(sql)) {
            while (rs.next()) l.add(rs.getInt(1));
        }
        return l;
    }

    /** Toglie il file e i suoi compagni (il vecchio .log accanto al DB, un eventuale -journal). */
    static void pulisci(Path db) throws Exception {
        String base = db.getFileName().toString().replaceFirst("\\.db$", "");
        try (var s = Files.list(db.getParent())) {
            for (Path p : s.filter(x -> x.getFileName().toString().startsWith(base)).toList()) Files.deleteIfExists(p);
        }
    }
}
