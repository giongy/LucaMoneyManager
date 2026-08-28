// ─────────────────────────────────────────────────────────────────────────────
//  TestTitoli.java — verifica di non regressione del ciclo acquisto/vendita titoli.
//
//  Lanciato da test-titoli.ps1, che gli passa il path di una COPIA usa-e-getta del DB:
//  qui dentro si compra, si vende, si annulla e si sporca senza alcun riguardo.
//
//  Perché esiste: il portafoglio è l'unico punto in cui l'app crea denaro (una plusvalenza
//  non è un giroconto). Se il calcolo sbaglia, i saldi restano plausibili e nessuno se ne
//  accorge per mesi. Le due proprietà che questo file difende sono:
//    · il conto investimenti sale e scende SEMPRE del solo carico, mai del ricavo;
//    · annullare un'operazione riporta i saldi esattamente dove erano.
//  Le regole di dettaglio stanno in CLAUDE.md, sezione "Titoli".
// ─────────────────────────────────────────────────────────────────────────────
import com.google.gson.JsonObject;
import com.moneymanager.Database;
import java.sql.*;
import java.util.*;

public class TestTitoli {
    static Connection raw;
    static Database d;
    static int passati = 0, falliti = 0;
    static boolean verboso = false;

    public static void main(String[] args) throws Exception {
        // Le accentate delle descrizioni escono come "?" se la console resta sulla code page OEM.
        try {
            System.setOut(new java.io.PrintStream(new java.io.FileOutputStream(java.io.FileDescriptor.out), true, "UTF-8"));
            System.setErr(new java.io.PrintStream(new java.io.FileOutputStream(java.io.FileDescriptor.err), true, "UTF-8"));
        } catch (Exception ignored) {}

        if (args.length < 1) { System.err.println("uso: TestTitoli <path-db> [-v]"); System.exit(2); }
        String db = args[0];
        verboso = args.length > 1 && "-v".equals(args[1]);

        d   = new Database(db);
        raw = DriverManager.getConnection("jdbc:sqlite:" + db);

        int uni = id("SELECT id FROM accounts WHERE type NOT IN ('investment','credit') AND is_closed=0 ORDER BY id LIMIT 1");
        int tit = id("SELECT id FROM accounts WHERE type='investment' ORDER BY id LIMIT 1");
        if (uni < 0 || tit < 0) {
            System.err.println("Servono un conto di liquidità e un conto investimenti nel DB.");
            System.exit(2);
        }
        System.out.printf("conto liquidità: %s   ·   conto investimenti: %s%n",
                str("SELECT name FROM accounts WHERE id=" + uni), str("SELECT name FROM accounts WHERE id=" + tit));

        suiteAzioni(uni, tit);
        suiteObbligazioni(uni, tit);
        suiteCedole(uni, tit);

        d.close();
        System.out.printf("%n════ %d superate, %d fallite ════%n", passati, falliti);
        System.exit(falliti > 0 ? 1 : 0);
    }

    // ═══ AZIONI: acquisto, vendita in utile e in perdita, imposta differita, annullamenti ═══
    static void suiteAzioni(int uni, int tit) throws Exception {
        titolo("AZIONI");
        double T0 = saldo(tit), U0 = saldo(uni);
        long   tx0 = count("SELECT COUNT(*) FROM transactions");

        sez("acquisto 1000 x 10,00 con 20,00 di commissione");
        Map<String,Object> pos = d.buyStock(buy("TESTAZ", "Azione di prova", 1000, 10, "equity", 20, tit, uni));
        int pid    = ((Number) pos.get("id")).intValue();
        double avg = ((Number) pos.get("avg_price")).doubleValue();
        ok("la commissione entra nel prezzo di carico", avg, 10.02);
        ok("il conto investimenti sale del carico, non del puro", saldo(tit) - T0, 1000 * avg);
        ok("dal conto liquidità esce puro + commissione", U0 - saldo(uni), 10020);
        ok("nessuna transazione di spesa separata per la commissione",
           count("SELECT COUNT(*) FROM portfolio_transactions WHERE portfolio_id=" + pid
               + " AND type='expense' AND transaction_id IS NOT NULL"), 0);
        ok("la commissione resta però nello storico della posizione",
           count("SELECT COUNT(*) FROM portfolio_transactions WHERE portfolio_id=" + pid
               + " AND notes='Commissione acquisto'"), 1);

        sez("vendita 400 x 15,20 con 5,00 di commissione (in utile)");
        double T1 = saldo(tit), U1 = saldo(uni);
        d.sellStock(sell(pid, uni, 400, 15.20, 5));
        ok("plusvalenza = ricavo netto − carico",
           numQ("SELECT price FROM portfolio_transactions WHERE portfolio_id=" + pid + " AND type='gain'"),
           400 * 15.20 - 5 - 400 * avg);
        ok("sul conto arriva lordo − commissione", saldo(uni) - U1, 400 * 15.20 - 5);
        ok("il conto investimenti scende del SOLO carico venduto", T1 - saldo(tit), 400 * avg);
        ok("la vendita non genera imposte",
           count("SELECT COUNT(*) FROM portfolio_transactions WHERE portfolio_id=" + pid + " AND type='tax'"), 0);
        ok("la plusvalenza è esclusa da budget e report",
           count("SELECT COUNT(*) FROM transactions t JOIN categories c ON c.id=t.category_id"
               + " WHERE t.description='Plusvalenza TESTAZ' AND c.name='Plusvalenze' AND c.excluded_from_budget=1"), 1);

        sez("vendita 200 x 8,00 (in perdita)");
        double T2 = saldo(tit), U2 = saldo(uni);
        d.sellStock(sell(pid, uni, 200, 8.0, 0));
        ok("minusvalenza col segno negativo",
           numQ("SELECT price FROM portfolio_transactions WHERE portfolio_id=" + pid + " AND type='gain' ORDER BY id DESC LIMIT 1"),
           200 * 8 - 200 * avg);
        ok("registrata come USCITA in Minusvalenze, esclusa",
           count("SELECT COUNT(*) FROM transactions t JOIN categories c ON c.id=t.category_id"
               + " WHERE t.description='Minusvalenza TESTAZ' AND t.type='expense'"
               + " AND c.name='Minusvalenze' AND c.excluded_from_budget=1"), 1);
        ok("sul conto arriva comunque il ricavo", saldo(uni) - U2, 1600);
        ok("il conto investimenti scende del carico venduto", T2 - saldo(tit), 200 * avg);

        sez("imposta addebitata dopo, a posizione ancora aperta");
        double T3 = saldo(tit), U3 = saldo(uni);
        d.registerPortfolioTax(tax(pid, uni, 150, "2026-10-15", "IMPOSTA TEST"));
        ok("esce dal conto scelto", U3 - saldo(uni), 150);
        ok("il conto investimenti non viene toccato", saldo(tit), T3);
        ok("finisce in Imposte su rendite, esclusa",
           count("SELECT COUNT(*) FROM transactions t JOIN categories c ON c.id=t.category_id"
               + " WHERE t.description='IMPOSTA TEST' AND c.name='Imposte su rendite' AND c.excluded_from_budget=1"), 1);

        sez("imposta su una posizione CHIUSA (il caso normale)");
        int chiusa = id("SELECT id FROM portfolio WHERE quantity=0 AND id<>" + pid + " ORDER BY id LIMIT 1");
        if (chiusa > 0) {
            long prima = count("SELECT COUNT(*) FROM portfolio_transactions WHERE portfolio_id=" + chiusa + " AND type='tax'");
            d.registerPortfolioTax(tax(chiusa, uni, 42.5, "2026-10-15", "IMPOSTA CHIUSA TEST"));
            ok("accettata anche a quantità zero",
               count("SELECT COUNT(*) FROM portfolio_transactions WHERE portfolio_id=" + chiusa + " AND type='tax'"), prima + 1);
        } else {
            salta("nessuna posizione chiusa nel DB");
        }

        sez("rifiuti attesi");
        okb("vendere più del disponibile",       fallisce(() -> d.sellStock(sell(pid, uni, 999999, 10, 0))));
        okb("quantità negativa",                 fallisce(() -> d.sellStock(sell(pid, uni, -10, 10, 0))));
        okb("commissione negativa",              fallisce(() -> d.sellStock(sell(pid, uni, 10, 10, -5))));
        okb("imposta a zero",                    fallisce(() -> d.registerPortfolioTax(tax(pid, uni, 0, "2026-10-15", null))));
        int figlia = id("SELECT id FROM portfolio_transactions WHERE parent_pt_id IS NOT NULL AND portfolio_id=" + pid + " LIMIT 1");
        okb("annullare una riga figlia da sola", fallisce(() -> d.deletePortfolioTransaction(figlia)));

        sez("annullamento della vendita in utile");
        double T4 = saldo(tit), U4 = saldo(uni);
        int vendita = id("SELECT id FROM portfolio_transactions WHERE portfolio_id=" + pid + " AND type='sell' ORDER BY id LIMIT 1");
        ok("la vendita ha due righe figlie (plusvalenza e commissione)",
           count("SELECT COUNT(*) FROM portfolio_transactions WHERE parent_pt_id=" + vendita), 2);
        d.deletePortfolioTransaction(vendita);
        ok("le righe figlie spariscono con lei",
           count("SELECT COUNT(*) FROM portfolio_transactions WHERE parent_pt_id=" + vendita), 0);
        ok("sparisce anche la TRANSAZIONE di plusvalenza",
           count("SELECT COUNT(*) FROM transactions WHERE description='Plusvalenza TESTAZ'"), 0);
        ok("il conto investimenti risale del carico", saldo(tit) - T4, 400 * avg);
        ok("il conto liquidità riscende del ricavo", U4 - saldo(uni), 400 * 15.20 - 5);
        ok("la quantità torna in posizione", numQ("SELECT quantity FROM portfolio WHERE id=" + pid), 800);

        sez("le categorie escluse non entrano nelle analisi");
        double lorde = numQ("SELECT COALESCE(SUM(amount),0) FROM transactions WHERE type='expense' AND date LIKE '2026-10%'");
        double viste = numQ("""
            SELECT COALESCE(SUM(t.amount),0) FROM transactions t
            WHERE t.type='expense' AND t.date LIKE '2026-10%'
              AND COALESCE((SELECT excluded_from_budget FROM categories WHERE id=t.category_id),0)=0""");
        ok("le imposte registrate sono invisibili a budget e Salute", lorde - viste, chiusa > 0 ? 192.5 : 150);

        sez("pulizia: annullando tutto si torna al punto di partenza");
        for (int pt : ids("SELECT id FROM portfolio_transactions WHERE portfolio_id=" + pid
                        + " AND parent_pt_id IS NULL ORDER BY id DESC"))
            d.deletePortfolioTransaction(pt);
        d.deletePortfolioItem(pid);
        if (chiusa > 0)
            for (int pt : ids("SELECT id FROM portfolio_transactions WHERE portfolio_id=" + chiusa
                            + " AND type='tax' AND notes='IMPOSTA CHIUSA TEST'"))
                d.deletePortfolioTransaction(pt);
        ok("saldo del conto investimenti identico a prima", saldo(tit), T0);
        ok("saldo del conto liquidità identico a prima", saldo(uni), U0);
        ok("nessuna transazione di prova residua", count("SELECT COUNT(*) FROM transactions"), tx0);
    }

    // ═══ OBBLIGAZIONI: prezzo in percentuale, vendita parziale, rimborso a scadenza ═══
    static void suiteObbligazioni(int uni, int tit) throws Exception {
        titolo("OBBLIGAZIONI");
        double T0 = saldo(tit), U0 = saldo(uni);
        long   tx0 = count("SELECT COUNT(*) FROM transactions");

        sez("acquisto 10.000 di nominale al 99,5% con 10,00 di commissione");
        Map<String,Object> pos = d.buyStock(buy("TESTBOND", "Obbligazione di prova", 10000, 99.5, "bond", 10, tit, uni));
        int pid    = ((Number) pos.get("id")).intValue();
        double avg = ((Number) pos.get("avg_price")).doubleValue();
        ok("la commissione entra nel carico rapportata al nominale", avg, 99.6);
        ok("il conto investimenti sale del carico", saldo(tit) - T0, 10000 * avg / 100);

        sez("vendita parziale: 5.000 di nominale al 101%");
        double T1 = saldo(tit), U1 = saldo(uni);
        d.sellStock(sell(pid, uni, 5000, 101.0, 5));
        ok("plusvalenza calcolata sul nominale venduto",
           numQ("SELECT price FROM portfolio_transactions WHERE portfolio_id=" + pid + " AND type='gain'"),
           5000 * 101 / 100.0 - 5 - 5000 * avg / 100);
        ok("accredito = lordo − commissione", saldo(uni) - U1, 5000 * 101 / 100.0 - 5);
        ok("il conto investimenti scende del solo carico venduto", T1 - saldo(tit), 5000 * avg / 100);
        ok("resta metà del nominale", numQ("SELECT quantity FROM portfolio WHERE id=" + pid), 5000);
        ok("il prezzo medio non cambia sulle vendite parziali",
           numQ("SELECT avg_price FROM portfolio WHERE id=" + pid), avg);

        sez("rimborso a scadenza: il resto a 100 (è una vendita, non un giroconto)");
        double T2 = saldo(tit);
        d.sellStock(sell(pid, uni, 5000, 100.0, 0));
        ok("la posizione si chiude", numQ("SELECT quantity FROM portfolio WHERE id=" + pid), 0);
        ok("lo scarto fra 100 e il carico è una plusvalenza",
           numQ("SELECT price FROM portfolio_transactions WHERE portfolio_id=" + pid + " AND type='gain' ORDER BY id DESC LIMIT 1"),
           5000 - 5000 * avg / 100);
        ok("sul conto investimenti non resta nulla della posizione", T2 - saldo(tit), 5000 * avg / 100);
        ok("il conto investimenti è tornato al valore di partenza", saldo(tit), T0);

        sez("pulizia");
        for (int pt : ids("SELECT id FROM portfolio_transactions WHERE portfolio_id=" + pid
                        + " AND parent_pt_id IS NULL ORDER BY id DESC"))
            d.deletePortfolioTransaction(pt);
        d.deletePortfolioItem(pid);
        ok("saldo del conto investimenti identico a prima", saldo(tit), T0);
        ok("saldo del conto liquidità identico a prima", saldo(uni), U0);
        ok("nessuna transazione di prova residua", count("SELECT COUNT(*) FROM transactions"), tx0);
    }

    // ═══ CEDOLE E DIVIDENDI: devono restare DENTRO budget e previsioni ═══
    static void suiteCedole(int uni, int tit) throws Exception {
        titolo("CEDOLE E DIVIDENDI");
        long tx0 = count("SELECT COUNT(*) FROM transactions");
        int bond = id("SELECT id FROM portfolio WHERE asset_type='bond' AND quantity>0 ORDER BY id LIMIT 1");
        if (bond < 0) { salta("nessuna obbligazione in portafoglio"); return; }

        // Queste due sono le uniche entrate da investimento che si pianificano: se finissero in
        // una categoria esclusa sparirebbero da budget e previsioni. È già successo una volta,
        // rinominando la categoria mentre il codice la cercava per nome.
        sez("la cedola finisce in Cedole e dividendi, NON esclusa");
        d.registerCoupon(cedola(bond, uni, 25, "2026-10-20", "CEDOLA TEST"));
        ok("categoria giusta e visibile a budget e previsioni",
           count("SELECT COUNT(*) FROM transactions t JOIN categories c ON c.id=t.category_id"
               + " WHERE t.description='CEDOLA TEST' AND c.name='Cedole e dividendi'"
               + " AND COALESCE(c.excluded_from_budget,0)=0"), 1);

        sez("stessa sorte per il dividendo");
        d.registerDividend(cedola(bond, uni, 30, "2026-10-21", "DIVIDENDO TEST"));
        ok("categoria giusta",
           count("SELECT COUNT(*) FROM transactions t JOIN categories c ON c.id=t.category_id"
               + " WHERE t.description='DIVIDENDO TEST' AND c.name='Cedole e dividendi'"), 1);

        sez("pulizia");
        for (int pt : ids("SELECT id FROM portfolio_transactions WHERE notes IN ('CEDOLA TEST','DIVIDENDO TEST')"))
            d.deletePortfolioTransaction(pt);
        ok("nessuna transazione di prova residua", count("SELECT COUNT(*) FROM transactions"), tx0);
    }

    // ─── payload ────────────────────────────────────────────────────────────
    static JsonObject buy(String tk, String nome, double q, double p, String tipo, double comm, int acc, int from) {
        JsonObject o = new JsonObject();
        o.addProperty("ticker", tk);       o.addProperty("name", nome);
        o.addProperty("quantity", q);      o.addProperty("price", p);
        o.addProperty("date", "2026-08-01"); o.addProperty("account_id", acc);
        o.addProperty("from_account_id", from); o.addProperty("asset_type", tipo);
        o.addProperty("commissions", comm);
        if ("bond".equals(tipo)) o.addProperty("coupon_tax", 12.5);
        return o;
    }
    static JsonObject sell(int pid, int to, double q, double p, double comm) {
        JsonObject o = new JsonObject();
        o.addProperty("portfolio_id", pid); o.addProperty("to_account_id", to);
        o.addProperty("quantity", q);       o.addProperty("price", p);
        o.addProperty("date", "2026-08-15"); o.addProperty("commission", comm);
        return o;
    }
    static JsonObject tax(int pid, int acc, double importo, String data, String note) {
        JsonObject o = new JsonObject();
        o.addProperty("portfolio_id", pid); o.addProperty("account_id", acc);
        o.addProperty("amount", importo);   o.addProperty("date", data);
        if (note != null) o.addProperty("notes", note);
        return o;
    }
    static JsonObject cedola(int pid, int acc, double importo, String data, String note) {
        JsonObject o = new JsonObject();
        o.addProperty("portfolio_id", pid); o.addProperty("account_id", acc);
        o.addProperty("amount", importo);   o.addProperty("date", data);
        o.addProperty("notes", note);
        return o;
    }

    // ─── asserzioni e utilità ───────────────────────────────────────────────
    interface Azione { void run() throws Exception; }
    static boolean fallisce(Azione a) { try { a.run(); return false; } catch (Exception e) { return true; } }

    static void titolo(String s) { System.out.printf("%n═══ %s %s%n", s, "═".repeat(Math.max(0, 60 - s.length()))); }
    static void sez(String s)    { System.out.println("── " + s); }
    static void salta(String s)  { System.out.println("   [--] saltata: " + s); }

    static void ok(String cosa, double avuto, double atteso) {
        boolean buono = Math.abs(avuto - atteso) < 0.005;
        if (buono) passati++; else falliti++;
        if (!buono || verboso)
            System.out.printf("   [%s] %-56s atteso %12.2f  ottenuto %12.2f%n",
                    buono ? "OK" : "KO", cosa, atteso, avuto);
        else
            System.out.printf("   [OK] %s%n", cosa);
    }
    static void okb(String cosa, boolean cond) {
        if (cond) passati++; else falliti++;
        System.out.printf("   [%s] rifiutato: %s%n", cond ? "OK" : "KO", cosa);
    }

    static int id(String sql) throws SQLException {
        try (Statement s = raw.createStatement(); ResultSet r = s.executeQuery(sql)) { return r.next() ? r.getInt(1) : -1; }
    }
    static String str(String sql) throws SQLException {
        try (Statement s = raw.createStatement(); ResultSet r = s.executeQuery(sql)) { return r.next() ? r.getString(1) : null; }
    }
    static List<Integer> ids(String sql) throws SQLException {
        List<Integer> out = new ArrayList<>();
        try (Statement s = raw.createStatement(); ResultSet r = s.executeQuery(sql)) { while (r.next()) out.add(r.getInt(1)); }
        return out;
    }
    static long count(String sql) throws SQLException {
        try (Statement s = raw.createStatement(); ResultSet r = s.executeQuery(sql)) { return r.next() ? r.getLong(1) : 0; }
    }
    static double numQ(String sql) throws SQLException {
        try (Statement s = raw.createStatement(); ResultSet r = s.executeQuery(sql)) { return r.next() ? r.getDouble(1) : 0; }
    }
    /** Saldo ricalcolato dalle transazioni, non letto da un campo: è il numero che vede l'utente. */
    static double saldo(int acc) throws SQLException {
        return numQ("""
            SELECT (SELECT initial_balance FROM accounts WHERE id=%d)
                 + COALESCE((SELECT SUM(amount) FROM transactions WHERE to_account_id=%d AND type='transfer'),0)
                 + COALESCE((SELECT SUM(amount) FROM transactions WHERE account_id=%d    AND type='income'),0)
                 - COALESCE((SELECT SUM(amount) FROM transactions WHERE account_id=%d    AND type='transfer'),0)
                 - COALESCE((SELECT SUM(amount) FROM transactions WHERE account_id=%d    AND type='expense'),0)
            """.formatted(acc, acc, acc, acc, acc));
    }
}
