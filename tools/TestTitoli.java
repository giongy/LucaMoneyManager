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
        suiteDifese(uni, tit);

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

        // ═══ RATEO LORDO: entra nel bonifico, mai nel prezzo di carico ═══
        // Due posizioni gemelle (stesso nominale/prezzo/commissione), una senza rateo e una con,
        // per isolare l'unico effetto che il rateo deve avere: sul bonifico, non sul PMC.
        sez("acquisto gemello SENZA rateo (riferimento)");
        double Ta = saldo(tit), Ua = saldo(uni);
        Map<String,Object> posA = d.buyStock(buy("TESTRATEOA", "Bond rateo A", 10000, 99.5, "bond", 10, tit, uni));
        double avgA = ((Number) posA.get("avg_price")).doubleValue();

        sez("acquisto gemello CON 87,50 di rateo lordo");
        double Tb = saldo(tit), Ub = saldo(uni);
        int pidB = ((Number) d.buyStock(buy("TESTRATEOB", "Bond rateo B", 10000, 99.5, "bond", 10, 87.50, tit, uni)).get("id")).intValue();
        double avgB = numQ("SELECT avg_price FROM portfolio WHERE id=" + pidB);
        ok("il rateo NON entra nel prezzo di carico: stesso PMC del gemello senza rateo", avgB, avgA);
        ok("il conto investimenti sale del solo carico, rateo escluso", saldo(tit) - Tb, 10000 * avgB / 100);
        ok("dal conto liquidità esce puro + commissione + rateo", Ub - saldo(uni), 10000 * 99.5 / 100 + 10 + 87.50);
        ok("il rateo compare come riga di storico dedicata",
           numQ("SELECT accrued_interest FROM portfolio_transactions WHERE portfolio_id=" + pidB + " AND notes='Rateo acquisto'"), 87.50);

        double totOther = -1;
        for (Map<String,Object> row : d.getPortfolio())
            if (((Number) row.get("id")).intValue() == pidB) totOther = ((Number) row.get("total_other_expenses")).doubleValue();
        ok("il rateo è escluso dalle spese che riducono il rendimento (torna con la cedola)", totOther, 0.0);

        sez("annullamento dell'acquisto con rateo");
        int buyPtIdB = id("SELECT id FROM portfolio_transactions WHERE portfolio_id=" + pidB + " AND type='buy'");
        d.deletePortfolioTransaction(buyPtIdB);
        ok("la posizione torna a zero", numQ("SELECT quantity FROM portfolio WHERE id=" + pidB), 0);
        ok("la riga di rateo sparisce insieme all'acquisto",
           count("SELECT COUNT(*) FROM portfolio_transactions WHERE portfolio_id=" + pidB), 0);
        ok("il conto liquidità torna esattamente al saldo di prima dell'acquisto", saldo(uni), Ub);
        ok("il conto investimenti torna esattamente al saldo di prima dell'acquisto", saldo(tit), Tb);

        sez("pulizia gemelli");
        d.deletePortfolioTransaction(id("SELECT id FROM portfolio_transactions WHERE portfolio_id="
            + ((Number) posA.get("id")).intValue() + " AND type='buy'"));
        d.deletePortfolioItem(((Number) posA.get("id")).intValue());
        d.deletePortfolioItem(pidB);
        ok("saldo del conto investimenti identico a prima dei gemelli", saldo(tit), T0);
        ok("saldo del conto liquidità identico a prima dei gemelli", saldo(uni), U0);
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

    // ═══ DIFESE: le cose che l'utente può fare per sbaglio ═══════════════════
    //
    // Le altre tre suite verificano che i conti tornino quando si usa l'app come previsto.
    // Questa verifica il contrario: che NON si possa smontare un'operazione un pezzo per volta
    // dalla pagina Transazioni, e che spostare o eliminare le categorie degli investimenti non
    // spezzi il legame fra il codice e il posto in cui scrive. Sono i due modi in cui i saldi
    // possono diventare sbagliati restando plausibili.
    static void suiteDifese(int uni, int tit) throws Exception {
        titolo("DIFESE: transazioni e categorie");
        long tx0 = count("SELECT COUNT(*) FROM transactions");
        double T0 = saldo(tit), U0 = saldo(uni);

        d.buyStock(buy("TESTDIF", "Difesa SpA", 100, 10, "equity", 0, tit, uni));
        int pid = id("SELECT id FROM portfolio WHERE ticker='TESTDIF'");
        d.sellStock(sell(pid, uni, 100, 12, 0));
        final int gainTx = id("SELECT transaction_id FROM portfolio_transactions"
                            + " WHERE portfolio_id=" + pid + " AND type='gain'");

        sez("la plusvalenza non si smonta dalla pagina Transazioni");
        ok("la vendita ha prodotto la sua plusvalenza", count("SELECT COUNT(*) FROM transactions WHERE id=" + gainTx), 1);
        okb("eliminare la transazione di plusvalenza", fallisce(() -> d.deleteTransaction(gainTx)));
        okb("cambiarne l'importo",                     fallisce(() -> d.updateTransaction(gainTx, txMod(gainTx, 999, null))));
        // Data, descrizione, categoria e tag restano liberi: non spostano nessun saldo.
        d.updateTransaction(gainTx, txMod(gainTx, -1, "PLUS RIBATTEZZATA"));
        ok("descrizione ancora modificabile",
           count("SELECT COUNT(*) FROM transactions WHERE id=" + gainTx + " AND description='PLUS RIBATTEZZATA'"), 1);
        ok("la riga di storico è rimasta al suo posto",
           count("SELECT COUNT(*) FROM portfolio_transactions WHERE transaction_id=" + gainTx), 1);

        sez("i movimenti autonomi invece restano eliminabili");
        d.registerPortfolioTax(tax(pid, uni, 60, "2026-10-30", "IMPOSTA DIFESA"));
        final int taxTx = id("SELECT transaction_id FROM portfolio_transactions"
                           + " WHERE portfolio_id=" + pid + " AND type='tax' AND notes='IMPOSTA DIFESA'");
        d.updateTransaction(taxTx, txMod(taxTx, 70, null));
        ok("cambiando l'importo lo storico del titolo lo segue",
           numQ("SELECT price FROM portfolio_transactions WHERE transaction_id=" + taxTx), 70);
        d.deleteTransaction(taxTx);
        ok("eliminandola sparisce anche dallo storico",
           count("SELECT COUNT(*) FROM portfolio_transactions WHERE transaction_id=" + taxTx), 0);

        sez("«sposta ed elimina» sulla categoria delle plusvalenze");
        int plusId = id("SELECT id FROM categories WHERE system_key='plusvalenze'");
        JsonObject nuova = new JsonObject();
        nuova.addProperty("name", "Guadagni da titoli TEST");
        nuova.addProperty("type", "income");
        nuova.addProperty("icon", "💰");
        nuova.addProperty("color", "#3fb950");
        int destId = ((Number) d.addCategory(nuova).get("id")).intValue();
        d.reassignCategory(plusId, destId);
        ok("la vecchia categoria non esiste più", count("SELECT COUNT(*) FROM categories WHERE id=" + plusId), 0);
        ok("il contrassegno è passato alla destinazione",
           count("SELECT COUNT(*) FROM categories WHERE id=" + destId + " AND system_key='plusvalenze'"), 1);
        // La prova vera: la prossima vendita deve scrivere LÌ, non ricreare una "Plusvalenze".
        d.buyStock(buy("TESTDIF2", "Difesa Due", 50, 20, "equity", 0, tit, uni));
        int pid2 = id("SELECT id FROM portfolio WHERE ticker='TESTDIF2'");
        d.sellStock(sell(pid2, uni, 50, 25, 0));
        ok("la nuova plusvalenza finisce nella categoria scelta",
           count("SELECT COUNT(*) FROM transactions t JOIN portfolio_transactions pt ON pt.transaction_id=t.id"
               + " WHERE pt.portfolio_id=" + pid2 + " AND pt.type='gain' AND t.category_id=" + destId), 1);
        ok("non è nata una seconda categoria di plusvalenze",
           count("SELECT COUNT(*) FROM categories WHERE system_key='plusvalenze'"), 1);

        sez("rifiuti attesi sullo spostamento di categoria");
        JsonObject figlia = new JsonObject();
        figlia.addProperty("name", "Sotto TEST"); figlia.addProperty("type", "income");
        figlia.addProperty("parent_id", destId);
        int figliaId = ((Number) d.addCategory(figlia).get("id")).intValue();
        int usc = id("SELECT id FROM categories WHERE type='expense' ORDER BY id LIMIT 1");
        okb("spostare una categoria su sé stessa",        fallisce(() -> d.reassignCategory(destId, destId)));
        okb("spostare su una propria sottocategoria",     fallisce(() -> d.reassignCategory(destId, figliaId)));
        okb("spostare un'entrata su una uscita",          fallisce(() -> d.reassignCategory(destId, usc)));
        ok("dopo i rifiuti la categoria è ancora lì, col suo contrassegno",
           count("SELECT COUNT(*) FROM categories WHERE id=" + destId + " AND system_key='plusvalenze'"), 1);

        sez("pulizia: annullando tutto si torna al punto di partenza");
        for (int p : new int[]{pid, pid2}) {
            for (int pt : ids("SELECT id FROM portfolio_transactions WHERE portfolio_id=" + p
                            + " AND parent_pt_id IS NULL ORDER BY id DESC"))
                d.deletePortfolioTransaction(pt);
            d.deletePortfolioItem(p);
        }
        ok("saldo del conto investimenti identico a prima", saldo(tit), T0);
        ok("saldo del conto liquidità identico a prima",    saldo(uni), U0);
        ok("nessuna transazione di prova residua", count("SELECT COUNT(*) FROM transactions"), tx0);
    }

    // ─── payload ────────────────────────────────────────────────────────────
    static JsonObject buy(String tk, String nome, double q, double p, String tipo, double comm, int acc, int from) {
        return buy(tk, nome, q, p, tipo, comm, 0, acc, from);
    }
    static JsonObject buy(String tk, String nome, double q, double p, String tipo, double comm, double rateo, int acc, int from) {
        JsonObject o = new JsonObject();
        o.addProperty("ticker", tk);       o.addProperty("name", nome);
        o.addProperty("quantity", q);      o.addProperty("price", p);
        o.addProperty("date", "2026-08-01"); o.addProperty("account_id", acc);
        o.addProperty("from_account_id", from); o.addProperty("asset_type", tipo);
        o.addProperty("commissions", comm);
        o.addProperty("accrued_interest", rateo);
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
    /** Payload di updateTransaction ricostruito dalla riga esistente, cambiando solo quello che
     *  serve alla prova: importo (se >= 0) e/o descrizione (se non null). Il resto deve restare
     *  identico, altrimenti si finirebbe per misurare l'effetto di un campo azzerato per sbaglio. */
    static JsonObject txMod(int txId, double nuovoImporto, String nuovaDesc) throws SQLException {
        JsonObject o = new JsonObject();
        try (Statement s = raw.createStatement();
             ResultSet r = s.executeQuery("SELECT * FROM transactions WHERE id=" + txId)) {
            if (!r.next()) throw new SQLException("transazione " + txId + " inesistente");
            o.addProperty("date",        r.getString("date"));
            o.addProperty("amount",      nuovoImporto >= 0 ? nuovoImporto : r.getDouble("amount"));
            o.addProperty("type",        r.getString("type"));
            o.addProperty("account_id",  r.getInt("account_id"));
            o.addProperty("description", nuovaDesc != null ? nuovaDesc : r.getString("description"));
            o.addProperty("reconciled",  r.getInt("reconciled"));
            int cat = r.getInt("category_id");
            if (!r.wasNull()) o.addProperty("category_id", cat);
            int to = r.getInt("to_account_id");
            if (!r.wasNull()) o.addProperty("to_account_id", to);
        }
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
