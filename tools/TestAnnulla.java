import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.moneymanager.Database;

import java.sql.*;
import java.util.*;

/**
 * Audit dell'annullamento: per ogni <b>tipo</b> di scrittura dell'app, esegue il gesto, lo
 * annulla dal solo giornale, e confronta <b>l'intero database riga per riga</b> con com'era
 * prima. Lo lancia tools\test-annulla.ps1, sempre su una copia.
 *
 * <p>Il confronto non è sui saldi né su qualche campo scelto a mano: è il contenuto completo
 * di tutte le tabelle journalate. È l'unico modo per accorgersi dei danni che non si vedono —
 * la riga figlia sparita, il tag perso, il prezzo medio ricalcolato invece che ripristinato.
 * Una prova che guarda solo i totali li dichiarerebbe tutti superati.</p>
 *
 * <p>Tre esiti per scenario:</p>
 * <ul>
 *   <li><b>OK</b> — dopo l'annullamento il database è identico a prima, byte per byte logico;</li>
 *   <li><b>DIFFERENZE</b> — è tornato <i>quasi</i> com'era: sono elencate le righe che ballano;</li>
 *   <li><b>RIFIUTATO</b> — l'annullamento si è fermato prima di scrivere, col suo motivo. Per
 *       alcuni scenari è l'esito <b>atteso</b>: sono i casi in cui annullare farebbe danno.</li>
 * </ul>
 */
public class TestAnnulla {

    static Database app;
    static Connection raw;
    static String url;
    static boolean verboso = false;
    static int ok = 0, differenze = 0, rifiuti = 0, attesi = 0, errori = 0;

    /** Gli scenari di conflitto girano tre volte (rifiuto, catena, riporta-a): senza un suffisso
     *  diverso a ogni giro, il secondo ricrea un tag con un nome già esistente e sbatte contro
     *  il vincolo UNIQUE — un fallimento del banco, non del meccanismo. */
    static int giro = 0;

    /** Le tabelle che il giornale copre: la fotografia è su queste. */
    static final List<String> TABELLE = List.of(
            "accounts", "categories", "transactions", "transaction_splits", "transaction_tags",
            "tags", "budgets", "budget_config", "scheduled_transactions",
            "scheduled_transaction_tags", "portfolio", "portfolio_transactions",
            "forecasts", "forecast_categories", "notes", "note_tags",
            "reports", "range_presets", "app_settings");

    public static void main(String[] args) throws Exception {
        System.setOut(new java.io.PrintStream(new java.io.FileOutputStream(java.io.FileDescriptor.out),
                true, java.nio.charset.StandardCharsets.UTF_8));
        if (args.length < 1) { System.err.println("uso: TestAnnulla <path-db> [-v]"); System.exit(2); }
        verboso = args.length > 1 && "-v".equals(args[1]);
        url = "jdbc:sqlite:" + args[0].replace(java.io.File.separatorChar, '/');
        app = new Database(args[0]);
        raw = DriverManager.getConnection(url);

        int liq = id("SELECT id FROM accounts WHERE type NOT IN ('investment','credit') AND is_closed=0 ORDER BY id LIMIT 1");
        int tit = id("SELECT id FROM accounts WHERE type='investment' ORDER BY id LIMIT 1");
        int spesa   = id("SELECT id FROM categories WHERE type='expense' AND parent_id IS NOT NULL ORDER BY id LIMIT 1");
        int entrata = id("SELECT id FROM categories WHERE type='income'  AND parent_id IS NOT NULL ORDER BY id LIMIT 1");
        int liq2 = id("SELECT id FROM accounts WHERE type NOT IN ('investment','credit') AND is_closed=0 ORDER BY id LIMIT 1 OFFSET 1");
        if (liq < 0 || tit < 0 || spesa < 0) {
            System.err.println("Servono almeno un conto di liquidità, un conto investimenti e una sottocategoria di spesa.");
            System.exit(2);
        }

        gruppo("CONTI");
        prova("addAccount", () -> app.addAccount(j("{'name':'Conto prova','type':'checking','initial_balance':100}")));
        prova("updateAccount", () -> {
            int a = ((Number) app.addAccount(j("{'name':'Conto mod','type':'checking'}")).get("id")).intValue();
            fissa();
            app.updateAccount(a, j("{'name':'Conto rinominato','type':'savings','initial_balance':50}"));
        });
        prova("deleteAccount (vuoto)", () -> {
            int a = ((Number) app.addAccount(j("{'name':'Conto da togliere','type':'checking'}")).get("id")).intValue();
            fissa();
            app.deleteAccount(a);
        });

        gruppo("CATEGORIE");
        prova("addCategory", () -> app.addCategory(j("{'name':'Cat prova','type':'expense'}")));
        prova("updateCategory (rinomina)", () -> {
            int c = ((Number) app.addCategory(j("{'name':'Cat da rinominare','type':'expense'}")).get("id")).intValue();
            fissa();
            app.updateCategory(c, j("{'name':'Cat rinominata','type':'expense'}"));
        });
        prova("setCategoryMobile", () -> app.setCategoryMobile(spesa, true));
        prova("deleteCategory (vuota)", () -> {
            int c = ((Number) app.addCategory(j("{'name':'Cat da eliminare','type':'expense'}")).get("id")).intValue();
            fissa();
            app.deleteCategory(c);
        });
        prova("deleteCategory con budget (CASCADE)", () -> {
            int c = ((Number) app.addCategory(j("{'name':'Cat con budget','type':'expense'}")).get("id")).intValue();
            app.setBudget(j("{'category_id':" + c + ",'month':8,'year':2026,'amount':100}"));
            fissa();
            app.deleteCategory(c);
        });
        prova("reassignCategory (sposta ed elimina)", () -> {
            int da = ((Number) app.addCategory(j("{'name':'Cat origine','type':'expense'}")).get("id")).intValue();
            int a  = ((Number) app.addCategory(j("{'name':'Cat destinazione','type':'expense'}")).get("id")).intValue();
            app.addTransaction(j("{'date':'2026-08-10','amount':12.5,'type':'expense','account_id':" + liq
                    + ",'category_id':" + da + ",'description':'da spostare'}"));
            fissa();
            app.reassignCategory(da, a);
        });

        gruppo("TRANSAZIONI");
        prova("addTransaction (semplice)", () -> app.addTransaction(j("{'date':'2026-08-10','amount':25.40,"
                + "'type':'expense','account_id':" + liq + ",'category_id':" + spesa + ",'description':'spesa prova'}")));
        if (liq2 > 0) prova("addTransaction (giroconto)", () -> app.addTransaction(j("{'date':'2026-08-11','amount':300,"
                + "'type':'transfer','account_id':" + liq + ",'to_account_id':" + liq2 + ",'description':'giroconto prova'}")));
        prova("addTransaction (split + tag)", () -> {
            int t = ((Number) app.addTag(j("{'name':'tag audit'}")).get("id")).intValue();
            fissa();
            app.addTransaction(j("{'date':'2026-08-12','amount':100,'type':'expense','account_id':" + liq
                    + ",'description':'suddivisa prova','tag_ids':[" + t + "],"
                    + "'splits':[{'category_id':" + spesa + ",'amount':60,'description':'a'},"
                    + "{'category_id':" + spesa + ",'amount':40,'description':'b'}]}"));
        });
        prova("updateTransaction (con split e tag)", () -> {
            int t = ((Number) app.addTag(j("{'name':'tag audit2'}")).get("id")).intValue();
            int tx = ((Number) app.addTransaction(j("{'date':'2026-08-12','amount':100,'type':'expense','account_id':" + liq
                    + ",'description':'da modificare','tag_ids':[" + t + "],"
                    + "'splits':[{'category_id':" + spesa + ",'amount':60,'description':'a'},"
                    + "{'category_id':" + spesa + ",'amount':40,'description':'b'}]}")).get("id")).intValue();
            fissa();
            app.updateTransaction(tx, j("{'date':'2026-08-13','amount':100,'type':'expense','account_id':" + liq
                    + ",'description':'modificata','tag_ids':[" + t + "],"
                    + "'splits':[{'category_id':" + spesa + ",'amount':70,'description':'a'},"
                    + "{'category_id':" + spesa + ",'amount':30,'description':'b'}]}"));
        });
        prova("updateTransactionReconciled", () -> {
            int tx = ((Number) app.addTransaction(j("{'date':'2026-08-14','amount':10,'type':'expense','account_id':" + liq
                    + ",'category_id':" + spesa + ",'description':'da conciliare'}")).get("id")).intValue();
            fissa();
            app.updateTransactionReconciled(tx, true);
        });
        prova("deleteTransaction (con split e tag)", () -> {
            int t = ((Number) app.addTag(j("{'name':'tag audit3'}")).get("id")).intValue();
            int tx = ((Number) app.addTransaction(j("{'date':'2026-08-15','amount':100,'type':'expense','account_id':" + liq
                    + ",'description':'da eliminare','tag_ids':[" + t + "],"
                    + "'splits':[{'category_id':" + spesa + ",'amount':100,'description':'unica'}]}")).get("id")).intValue();
            fissa();
            app.deleteTransaction(tx);
        });
        prova("setTransactionOneoff", () -> {
            int tx = ((Number) app.addTransaction(j("{'date':'2026-08-16','amount':10,'type':'expense','account_id':" + liq
                    + ",'category_id':" + spesa + ",'description':'straordinaria'}")).get("id")).intValue();
            fissa();
            app.setTransactionOneoff(tx, true);
        });
        prova("setAttachment", () -> {
            int tx = ((Number) app.addTransaction(j("{'date':'2026-08-17','amount':10,'type':'expense','account_id':" + liq
                    + ",'category_id':" + spesa + ",'description':'con allegato'}")).get("id")).intValue();
            fissa();
            app.setAttachment(tx, "prova.pdf");
        });

        gruppo("TAG E NOTE");
        prova("addTag",    () -> app.addTag(j("{'name':'tag nuovo','color':'#ff0000'}")));
        prova("updateTag", () -> {
            int t = ((Number) app.addTag(j("{'name':'tag da mod'}")).get("id")).intValue();
            fissa();
            app.updateTag(t, j("{'name':'tag modificato','color':'#00ff00'}"));
        });
        prova("deleteTag (usato da una transazione)", () -> {
            int t = ((Number) app.addTag(j("{'name':'tag usato'}")).get("id")).intValue();
            app.addTransaction(j("{'date':'2026-08-18','amount':5,'type':'expense','account_id':" + liq
                    + ",'category_id':" + spesa + ",'description':'con tag','tag_ids':[" + t + "]}"));
            fissa();
            app.deleteTag(t);
        });
        prova("saveNote (nuova)",  () -> app.saveNote(j("{'title':'Nota prova','content':'testo'}")));
        prova("saveNote (modifica)", () -> {
            int n = ((Number) app.saveNote(j("{'title':'Nota da mod','content':'a'}")).get("id")).intValue();
            fissa();
            app.saveNote(j("{'id':" + n + ",'title':'Nota modificata','content':'b'}"));
        });
        prova("setNotePinned", () -> {
            int n = ((Number) app.saveNote(j("{'title':'Nota pin','content':'x'}")).get("id")).intValue();
            fissa();
            app.setNotePinned(n, true);
        });
        prova("deleteNote", () -> {
            int n = ((Number) app.saveNote(j("{'title':'Nota da eliminare','content':'x'}")).get("id")).intValue();
            fissa();
            app.deleteNote(n);
        });

        gruppo("BUDGET");
        prova("setBudget (nuovo)",   () -> app.setBudget(j("{'category_id':" + spesa + ",'month':7,'year':2027,'amount':120}")));
        prova("setBudget (modifica)", () -> {
            app.setBudget(j("{'category_id':" + spesa + ",'month':6,'year':2027,'amount':100}"));
            fissa();
            app.setBudget(j("{'category_id':" + spesa + ",'month':6,'year':2027,'amount':250}"));
        });
        prova("setBudgetConfig", () -> app.setBudgetConfig(spesa, 2027, "annual", 1200));
        prova("setBudgetBulk",   () -> {
            JsonArray importi = new JsonArray();
            for (int m = 0; m < 12; m++) importi.add(50 + m);
            app.setBudgetBulk(spesa, 2028, importi);
        });
        prova("deleteBudgetMonth", () -> {
            app.setBudget(j("{'category_id':" + spesa + ",'month':5,'year':2029,'amount':80}"));
            fissa();
            app.deleteBudgetMonth(spesa, 5, 2029);
        });
        prova("copyBudgetFromYear", () -> {
            app.setBudget(j("{'category_id':" + spesa + ",'month':3,'year':2030,'amount':90}"));
            fissa();
            app.copyBudgetFromYear(2031, 2030);
        });
        prova("deleteBudgetYear", () -> {
            app.setBudget(j("{'category_id':" + spesa + ",'month':2,'year':2032,'amount':70}"));
            app.setBudgetConfig(spesa, 2032, "monthly", 0);
            fissa();
            app.deleteBudgetYear(2032);
        });

        gruppo("PIANIFICATE");
        prova("addScheduled", () -> app.addScheduled(j("{'description':'Pianificata prova','amount':50,'type':'expense',"
                + "'account_id':" + liq + ",'category_id':" + spesa + ",'frequency':'monthly','start_date':'2026-10-05'}")));
        prova("updateScheduled", () -> {
            int s = ((Number) app.addScheduled(j("{'description':'Pian da mod','amount':50,'type':'expense','account_id':" + liq
                    + ",'category_id':" + spesa + ",'frequency':'monthly','start_date':'2026-10-06'}")).get("id")).intValue();
            fissa();
            app.updateScheduled(s, j("{'description':'Pian modificata','amount':80,'type':'expense','account_id':" + liq
                    + ",'category_id':" + spesa + ",'frequency':'monthly','start_date':'2026-11-06'}"));
        });
        prova("deleteScheduled (con tag)", () -> {
            int t = ((Number) app.addTag(j("{'name':'tag pian'}")).get("id")).intValue();
            int s = ((Number) app.addScheduled(j("{'description':'Pian con tag','amount':50,'type':'expense','account_id':" + liq
                    + ",'category_id':" + spesa + ",'frequency':'monthly','start_date':'2026-10-07','tag_ids':[" + t + "]}")).get("id")).intValue();
            fissa();
            app.deleteScheduled(s);
        });
        prova("registra pianificata (transazione + avanzamento)", () -> {
            int s = ((Number) app.addScheduled(j("{'description':'Paghetta prova','amount':20,'type':'expense','account_id':" + liq
                    + ",'category_id':" + spesa + ",'frequency':'monthly','start_date':'2026-10-08'}")).get("id")).intValue();
            fissa();
            app.addTransactionAndAdvanceScheduled(j("{'date':'2026-10-08','amount':20,'type':'expense','account_id':" + liq
                    + ",'category_id':" + spesa + ",'description':'Paghetta prova'}"), s, "2026-10-08");
        });

        gruppo("PORTAFOGLIO");
        prova("buyStock (azione con commissione)", () -> app.buyStock(j("{'ticker':'AUDIT1','name':'Azione audit',"
                + "'quantity':100,'price':10,'date':'2026-08-01','account_id':" + tit + ",'from_account_id':" + liq
                + ",'asset_type':'equity','commissions':15}")));
        prova("buyStock (bond con rateo)", () -> app.buyStock(j("{'ticker':'AUDIT2','name':'Bond audit',"
                + "'quantity':10000,'price':99.5,'date':'2026-08-01','account_id':" + tit + ",'from_account_id':" + liq
                + ",'asset_type':'bond','commissions':10,'accrued_interest':87.5,'coupon_tax':12.5}")));
        prova("sellStock (in utile)", () -> {
            int p = ((Number) app.buyStock(j("{'ticker':'AUDIT3','name':'Azione da vendere','quantity':100,'price':10,"
                    + "'date':'2026-08-01','account_id':" + tit + ",'from_account_id':" + liq
                    + ",'asset_type':'equity','commissions':0}")).get("id")).intValue();
            fissa();
            app.sellStock(j("{'portfolio_id':" + p + ",'to_account_id':" + liq + ",'quantity':50,'price':15,"
                    + "'date':'2026-08-15','commission':5}"));
        });
        prova("sellStock (in perdita)", () -> {
            int p = ((Number) app.buyStock(j("{'ticker':'AUDIT4','name':'Azione in perdita','quantity':100,'price':10,"
                    + "'date':'2026-08-01','account_id':" + tit + ",'from_account_id':" + liq
                    + ",'asset_type':'equity','commissions':0}")).get("id")).intValue();
            fissa();
            app.sellStock(j("{'portfolio_id':" + p + ",'to_account_id':" + liq + ",'quantity':50,'price':6,"
                    + "'date':'2026-08-15','commission':0}"));
        });
        prova("registerCoupon", () -> {
            int p = ((Number) app.buyStock(j("{'ticker':'AUDIT5','name':'Bond cedola','quantity':10000,'price':100,"
                    + "'date':'2026-08-01','account_id':" + tit + ",'from_account_id':" + liq
                    + ",'asset_type':'bond','commissions':0,'coupon_tax':12.5}")).get("id")).intValue();
            fissa();
            app.registerCoupon(j("{'portfolio_id':" + p + ",'account_id':" + liq + ",'amount':125,"
                    + "'date':'2026-09-01','notes':'cedola audit'}"));
        });
        prova("registerDividend", () -> {
            int p = ((Number) app.buyStock(j("{'ticker':'AUDIT6','name':'Azione dividendo','quantity':100,'price':10,"
                    + "'date':'2026-08-01','account_id':" + tit + ",'from_account_id':" + liq
                    + ",'asset_type':'equity','commissions':0}")).get("id")).intValue();
            fissa();
            app.registerDividend(j("{'portfolio_id':" + p + ",'account_id':" + liq + ",'amount':40,"
                    + "'date':'2026-09-01','notes':'dividendo audit'}"));
        });
        prova("registerPortfolioTax", () -> {
            int p = ((Number) app.buyStock(j("{'ticker':'AUDIT7','name':'Azione imposta','quantity':100,'price':10,"
                    + "'date':'2026-08-01','account_id':" + tit + ",'from_account_id':" + liq
                    + ",'asset_type':'equity','commissions':0}")).get("id")).intValue();
            fissa();
            app.registerPortfolioTax(j("{'portfolio_id':" + p + ",'account_id':" + liq + ",'amount':30,"
                    + "'date':'2026-09-10','notes':'imposta audit'}"));
        });
        prova("registerPortfolioExpense", () -> {
            int p = ((Number) app.buyStock(j("{'ticker':'AUDIT8','name':'Azione spesa','quantity':100,'price':10,"
                    + "'date':'2026-08-01','account_id':" + tit + ",'from_account_id':" + liq
                    + ",'asset_type':'equity','commissions':0}")).get("id")).intValue();
            fissa();
            app.registerPortfolioExpense(j("{'portfolio_id':" + p + ",'account_id':" + liq + ",'amount':12,"
                    + "'date':'2026-09-11','notes':'spesa audit'}"));
        });
        prova("updateStockPrice", () -> {
            int p = ((Number) app.buyStock(j("{'ticker':'AUDIT9','name':'Azione prezzo','quantity':100,'price':10,"
                    + "'date':'2026-08-01','account_id':" + tit + ",'from_account_id':" + liq
                    + ",'asset_type':'equity','commissions':0}")).get("id")).intValue();
            fissa();
            app.updateStockPrice(p, 13.75);
        });
        prova("updatePortfolioItem", () -> {
            int p = ((Number) app.buyStock(j("{'ticker':'AUDIT11','name':'Azione da modificare','quantity':100,'price':10,"
                    + "'date':'2026-08-01','account_id':" + tit + ",'from_account_id':" + liq
                    + ",'asset_type':'equity','commissions':0}")).get("id")).intValue();
            fissa();
            app.updatePortfolioItem(j("{'id':" + p + ",'name':'Rinominata','account_id':" + tit
                    + ",'quantity':100,'avg_price':10,'current_price':12,'total_commissions':0,"
                    + "'asset_type':'equity','notes':'modificata dall audit'}"));
        });
        prova("deletePortfolioTransaction (annulla una sola operazione)", () -> {
            int p = ((Number) app.buyStock(j("{'ticker':'AUDIT12','name':'Azione op singola','quantity':100,'price':10,"
                    + "'date':'2026-08-01','account_id':" + tit + ",'from_account_id':" + liq
                    + ",'asset_type':'equity','commissions':0}")).get("id")).intValue();
            app.registerDividend(j("{'portfolio_id':" + p + ",'account_id':" + liq + ",'amount':25,"
                    + "'date':'2026-09-05','notes':'dividendo da annullare'}"));
            // ⚠️ L'id si legge DOPO fissa(): prima la preparazione è ancora dentro la sua
            // transazione, e la connessione di sola lettura del banco non la vede.
            fissa();
            int pt = id("SELECT id FROM portfolio_transactions WHERE portfolio_id=" + p
                    + " AND type='dividend' ORDER BY id DESC LIMIT 1");
            app.deletePortfolioTransaction(pt);
        });
        prova("removeAttachment", () -> {
            int tx = ((Number) app.addTransaction(j("{'date':'2026-08-21','amount':10,'type':'expense','account_id':" + liq
                    + ",'category_id':" + spesa + ",'description':'allegato da togliere'}")).get("id")).intValue();
            app.setAttachment(tx, "vecchio.pdf");
            fissa();
            app.removeAttachment(tx);
        });
        prova("deletePortfolioItem (con acquisto e vendita)", () -> {
            int p = ((Number) app.buyStock(j("{'ticker':'AUDIT10','name':'Azione da eliminare','quantity':100,'price':10,"
                    + "'date':'2026-08-01','account_id':" + tit + ",'from_account_id':" + liq
                    + ",'asset_type':'equity','commissions':5}")).get("id")).intValue();
            app.sellStock(j("{'portfolio_id':" + p + ",'to_account_id':" + liq + ",'quantity':40,'price':12,"
                    + "'date':'2026-08-20','commission':2}"));
            fissa();
            app.deletePortfolioItem(p);
        });

        gruppo("PREVISIONI, REPORT, PERIODI, IMPOSTAZIONI");
        prova("saveForecast (con categorie)", () -> {
            JsonArray cat = new JsonArray();
            JsonObject c = new JsonObject();
            c.addProperty("category_id", spesa);
            c.addProperty("category_name", "Categoria prova");
            c.addProperty("type", "expense");
            c.addProperty("projected_amount", 100);
            cat.add(c);
            app.saveForecast("2026-12-31", 1234.56, cat);
        });
        prova("archiveForecast", () -> {
            JsonArray cat = new JsonArray();
            JsonObject c = new JsonObject();
            c.addProperty("category_id", spesa);
            c.addProperty("category_name", "Categoria prova");
            c.addProperty("type", "expense");
            c.addProperty("projected_amount", 50);
            cat.add(c);
            int f = app.saveForecast("2026-11-30", 999.0, cat);
            fissa();
            app.archiveForecast(f);
        });
        prova("deleteForecast (con categorie, CASCADE)", () -> {
            JsonArray cat = new JsonArray();
            JsonObject c = new JsonObject();
            c.addProperty("category_id", spesa);
            c.addProperty("category_name", "Categoria prova");
            c.addProperty("type", "expense");
            c.addProperty("projected_amount", 75);
            cat.add(c);
            int f = app.saveForecast("2026-10-31", 500.0, cat);
            fissa();
            app.deleteForecast(f);
        });
        prova("updateRangePreset", () -> {
            int r = ((Number) app.addRangePreset(j("{'range_key':'mod','label':'Da modificare',"
                    + "'start_date':'2026-01-01','end_date':'2026-06-30'}")).get("id")).intValue();
            fissa();
            app.updateRangePreset(r, j("{'range_key':'mod','label':'Modificato','start_date':'2026-02-01','end_date':'2026-07-31'}"));
        });
        prova("deleteRangePreset", () -> {
            int r = ((Number) app.addRangePreset(j("{'range_key':'del','label':'Da eliminare',"
                    + "'start_date':'2026-01-01','end_date':'2026-06-30'}")).get("id")).intValue();
            fissa();
            app.deleteRangePreset(r);
        });
        prova("deleteReport", () -> {
            int r = ((Number) app.saveReport(j("{'name':'Report da eliminare','config':'{}'}")).get("id")).intValue();
            fissa();
            app.deleteReport(r);
        });
        prova("updateAccountOrder", () -> {
            JsonArray items = new JsonArray();
            JsonObject a = new JsonObject();
            a.addProperty("id", liq); a.addProperty("sort_order", 42);
            items.add(a);
            app.updateAccountOrder(items);
        });
        prova("saveReport",     () -> app.saveReport(j("{'name':'Report prova','config':'{}'}")));
        prova("addRangePreset", () -> app.addRangePreset(j("{'range_key':'prova','label':'Periodo prova','start_date':'2026-01-01','end_date':'2026-12-31'}")));
        prova("setAppSetting (preferenza)", () -> app.setAppSetting("backup.max", "99"));
        // Scrittura di massa: ~300 execute() in un gesto solo. Verifica che l'operazione resti
        // UNA e che l'annullamento rimetta tutte le righe generate.
        // 2027 si genera dallo storico 2026, che nel DB c'è: così il gesto scrive davvero, e
        // scrive sia righe nuove sia aggiornamenti (l'upsert su budgets).
        prova("generateBudget (scrittura di massa)", () -> app.generateBudget(2027, true));

        // Gli scenari di conflitto si provano DUE volte: con l'annullamento semplice, che deve
        // rifiutare, e con quello a catena, che deve riuscire e riportare il database al punto
        // fissato da puntoDiRitorno(). Definirli una volta sola evita che le due prove divergano.
        List<Object[]> conflitti = new ArrayList<>();

        conflitti.add(new Object[]{"acquisto con vendita successiva", (Scenario) () -> {
            int[] p = new int[1];
            gesto("buyStock", () -> p[0] = ((Number) app.buyStock(j("{'ticker':'AUDITX" + giro + "','name':'Azione con vendita',"
                    + "'quantity':100,'price':10,'date':'2026-08-01','account_id':" + tit + ",'from_account_id':" + liq
                    + ",'asset_type':'equity','commissions':0}")).get("id")).intValue());
            puntoDiRitorno();
            gesto("sellStock", () -> app.sellStock(j("{'portfolio_id':" + p[0] + ",'to_account_id':" + liq
                    + ",'quantity':50,'price':12,'date':'2026-08-20','commission':0}")));
            long op = ultimaOp();
            gesto("sellStock 2", () -> app.sellStock(j("{'portfolio_id':" + p[0] + ",'to_account_id':" + liq
                    + ",'quantity':25,'price':13,'date':'2026-08-25','commission':0}")));
            return op;
        }});

        conflitti.add(new Object[]{"transazione con tag, poi il tag eliminato", (Scenario) () -> {
            int[] t = new int[1]; int[] tx = new int[1];
            gesto("preparazione", () -> {
                t[0] = ((Number) app.addTag(j("{'name':'tag sparito" + giro + "'}")).get("id")).intValue();
                tx[0] = ((Number) app.addTransaction(j("{'date':'2026-08-19','amount':9,'type':'expense',"
                        + "'account_id':" + liq + ",'category_id':" + spesa + ",'description':'con tag',"
                        + "'tag_ids':[" + t[0] + "]}")).get("id")).intValue();
            });
            puntoDiRitorno();
            gesto("deleteTransaction", () -> app.deleteTransaction(tx[0]));
            long op = ultimaOp();
            gesto("deleteTag", () -> app.deleteTag(t[0]));
            return op;
        }});

        conflitti.add(new Object[]{"budget modificato, poi categoria eliminata", (Scenario) () -> {
            int[] c = new int[1];
            gesto("preparazione", () -> {
                c[0] = ((Number) app.addCategory(j("{'name':'Cat budget conflitto" + giro + "','type':'expense'}")).get("id")).intValue();
                app.setBudget(j("{'category_id':" + c[0] + ",'month':8,'year':2033,'amount':100}"));
            });
            puntoDiRitorno();
            gesto("setBudget", () -> app.setBudget(j("{'category_id':" + c[0] + ",'month':8,'year':2033,'amount':250}")));
            long op = ultimaOp();
            gesto("deleteCategory", () -> app.deleteCategory(c[0]));
            return op;
        }});

        conflitti.add(new Object[]{"pianificata registrata due volte", (Scenario) () -> {
            int[] s = new int[1];
            gesto("addScheduled", () -> s[0] = ((Number) app.addScheduled(j("{'description':'Pian doppia" + giro + "',"
                    + "'amount':20,'type':'expense','account_id':" + liq + ",'category_id':" + spesa
                    + ",'frequency':'monthly','start_date':'2026-10-09'}")).get("id")).intValue());
            puntoDiRitorno();
            gesto("registra 1", () -> app.addTransactionAndAdvanceScheduled(
                    j("{'date':'2026-10-09','amount':20,'type':'expense','account_id':" + liq
                    + ",'category_id':" + spesa + ",'description':'Pian doppia'}"), s[0], "2026-10-09"));
            long op = ultimaOp();
            gesto("registra 2", () -> app.addTransactionAndAdvanceScheduled(
                    j("{'date':'2026-11-09','amount':20,'type':'expense','account_id':" + liq
                    + ",'category_id':" + spesa + ",'description':'Pian doppia'}"), s[0], "2026-11-09"));
            return op;
        }});

        gruppo("RIFIUTI ATTESI — annullare da solo farebbe danno");
        giro = 1;
        for (Object[] c : conflitti) rifiutoAtteso((String) c[0], (Scenario) c[1]);

        gruppo("LE STESSE, A CATENA — annullando anche chi blocca");
        giro = 2;
        for (Object[] c : conflitti) catena((String) c[0], (Scenario) c[1]);

        gruppo("RIPORTA IL DATABASE A PRIMA DI QUI");
        giro = 3;
        for (Object[] c : conflitti) riportaA((String) c[0], (Scenario) c[1]);

        app.close();
        System.out.println();
        System.out.println("════════════════════════════════════════════════════════════════");
        System.out.printf("  identici dopo l'annullamento : %d%n", ok);
        System.out.printf("  DIFFERENZE                   : %d%n", differenze);
        System.out.printf("  rifiutati (non attesi)       : %d%n", rifiuti);
        System.out.printf("  rifiutati come previsto      : %d%n", attesi);
        System.out.printf("  errori                       : %d%n", errori);
        System.out.println("════════════════════════════════════════════════════════════════");
        System.exit(differenze + rifiuti + errori > 0 ? 1 : 0);
    }

    // ── Il banco ────────────────────────────────────────────────────────────────

    @FunctionalInterface interface Gesto { void esegui() throws Exception; }
    @FunctionalInterface interface Scenario { long prepara() throws Exception; }

    /** Fotografia scattata dal gesto di preparazione: vedi {@link #fissa()}. */
    static Map<String, List<String>> fotoPreparazione;

    static String nomeCorrente;

    /**
     * Da chiamare dentro un gesto, fra la preparazione e l'azione da annullare.
     *
     * <p>Fa due cose, ed entrambe servono: fissa il punto a cui il database deve tornare, e
     * soprattutto <b>chiude la richiesta della preparazione aprendone una nuova</b>. Senza la
     * seconda, preparazione e azione finirebbero nella stessa operazione — si annullerebbero
     * insieme, e per giunta la stessa riga comparirebbe come creata <i>e</i> cancellata dentro
     * un solo gesto: non è lo scenario che si vuole provare.</p>
     */
    static long opDopoPreparazione = -1;

    static void fissa() throws SQLException {
        app.terminaRichiesta(true);
        fotoPreparazione = fotografia();
        opDopoPreparazione = ultimaOp();
        app.iniziaRichiesta(nomeCorrente, "desktop");
    }

    static void prova(String nome, Gesto gesto) {
        try {
            fotoPreparazione = null;
            opDopoPreparazione = -1;
            nomeCorrente = nome;
            Map<String, List<String>> prima = fotografia();
            long opPrima = ultimaOp();

            // try/finally come fa Bridge.dispatch: un gesto che lancia deve comunque chiudere
            // la richiesta, altrimenti resta aperta con il lock di scrittura in mano.
            boolean fatto = false;
            app.iniziaRichiesta(nome, "desktop");
            try { gesto.esegui(); fatto = true; }
            finally { app.terminaRichiesta(fatto); }

            if (fotoPreparazione != null) { prima = fotoPreparazione; opPrima = opDopoPreparazione; }
            long op = ultimaOp();
            if (op == opPrima) { esito(nome, "NESSUNA OPERAZIONE", "il gesto non ha lasciato traccia nel giornale"); errori++; return; }

            Map<String, Object> esito;
            boolean annullato = false;
            app.iniziaRichiesta("annulla", "desktop");
            try { esito = app.annullaOperazione(op); annullato = true; }
            finally { app.terminaRichiesta(annullato); }

            if (!Boolean.TRUE.equals(esito.get("ok"))) {
                esito(nome, "RIFIUTATO", String.valueOf(esito.get("motivo")));
                rifiuti++;
                return;
            }
            List<String> diff = confronta(prima, fotografia());
            if (diff.isEmpty()) { esito(nome, "ok", null); ok++; }
            else { esito(nome, "DIFFERENZE", String.join("; ", diff)); differenze++; }
        } catch (Exception e) {
            esito(nome, "ERRORE", e.getMessage());
            errori++;
        }
    }

    /** Il punto a cui il database deve tornare dopo un annullamento a catena: si chiama fra la
     *  preparazione e il gesto da annullare, quando non c'è una richiesta aperta. */
    static void puntoDiRitorno() throws SQLException { fotoPreparazione = fotografia(); }

    /** Annullamento a catena: deve riuscire e riportare il database al {@link #puntoDiRitorno()}. */
    static void catena(String nome, Scenario scenario) {
        eseguiCatena(nome, scenario, true);
    }

    /** "Riporta a prima di qui": stesso esito della catena, per altra strada — qui si annulla
     *  tutto ciò che è venuto dopo, non solo chi blocca. */
    static void riportaA(String nome, Scenario scenario) {
        eseguiCatena(nome, scenario, false);
    }

    static void eseguiCatena(String nome, Scenario scenario, boolean soloBloccanti) {
        try {
            fotoPreparazione = null;
            Map<String, List<String>> prima = fotografia();
            long op = scenario.prepara();
            if (fotoPreparazione != null) prima = fotoPreparazione;

            Map<String, Object> esito;
            boolean fatto = false;
            app.iniziaRichiesta(soloBloccanti ? "annullaACatena" : "riportaA", "desktop");
            try {
                esito = soloBloccanti ? app.annullaOperazioneACatena(op) : app.riportaAOperazione(op);
                fatto = true;
            } finally { app.terminaRichiesta(fatto); }

            if (!Boolean.TRUE.equals(esito.get("ok"))) {
                esito(nome, "RIFIUTATO", String.valueOf(esito.get("motivo")));
                rifiuti++;
                return;
            }
            List<String> diff = confronta(prima, fotografia());
            if (diff.isEmpty()) { esito(nome, "ok", "annullate " + esito.get("operazioni")); ok++; }
            else { esito(nome, "DIFFERENZE", String.join("; ", diff)); differenze++; }
        } catch (Exception e) {
            esito(nome, "ERRORE", e.getMessage());
            errori++;
        }
    }

    /** Scenario in cui l'annullamento DEVE essere rifiutato: annullare farebbe danno. */
    static void rifiutoAtteso(String nome, Scenario scenario) {
        try {
            long op = scenario.prepara();
            Map<String, Object> esito;
            boolean fatto = false;
            app.iniziaRichiesta("annulla", "desktop");
            try { esito = app.annullaOperazione(op); fatto = true; }
            finally { app.terminaRichiesta(fatto); }
            if (Boolean.TRUE.equals(esito.get("ok"))) {
                esito(nome, "NON RIFIUTATO", "l'annullamento è passato, e non doveva");
                differenze++;
            } else {
                esito(nome, "rifiutato", String.valueOf(esito.get("motivo")));
                attesi++;
            }
        } catch (Exception e) {
            esito(nome, "ERRORE", e.getMessage());
            errori++;
        }
    }

    static void gesto(String nome, Gesto g) throws Exception {
        boolean fatto = false;
        app.iniziaRichiesta(nome, "desktop");
        try { g.esegui(); fatto = true; }
        finally { app.terminaRichiesta(fatto); }
    }

    static void esito(String nome, String stato, String nota) {
        boolean buono = "ok".equals(stato) || "rifiutato".equals(stato);
        System.out.printf("   [%s] %-48s%s%n",
                buono ? "OK" : stato, nome,
                nota != null && (!buono || verboso) ? "  " + taglia(nota, 150) : "");
    }

    static String taglia(String s, int n) {
        if (s == null) return "";
        s = s.replaceAll("\\s+", " ");
        return s.length() <= n ? s : s.substring(0, n) + "…";
    }

    // ── Fotografia e confronto ──────────────────────────────────────────────────

    /** Contenuto completo di ogni tabella journalata, riga per riga, in ordine stabile. */
    static Map<String, List<String>> fotografia() throws SQLException {
        Map<String, List<String>> foto = new LinkedHashMap<>();
        for (String t : TABELLE) {
            List<String> colonne = new ArrayList<>();
            try (Statement st = raw.createStatement();
                 ResultSet rs = st.executeQuery("SELECT name FROM pragma_table_info('" + t + "') ORDER BY cid")) {
                while (rs.next()) colonne.add("'" + rs.getString(1) + "'," + rs.getString(1));
            }
            List<String> righe = new ArrayList<>();
            try (Statement st = raw.createStatement();
                 ResultSet rs = st.executeQuery("SELECT json_object(" + String.join(",", colonne) + ") FROM " + t)) {
                while (rs.next()) righe.add(rs.getString(1));
            }
            Collections.sort(righe);      // l'ordine fisico non conta, il contenuto sì
            foto.put(t, righe);
        }
        return foto;
    }

    /** Differenze fra due fotografie, tabella per tabella, con le righe che ballano. */
    static List<String> confronta(Map<String, List<String>> prima, Map<String, List<String>> dopo) {
        List<String> diff = new ArrayList<>();
        for (String t : TABELLE) {
            List<String> a = new ArrayList<>(prima.get(t)), b = new ArrayList<>(dopo.get(t));
            if (a.equals(b)) continue;
            List<String> mancanti = new ArrayList<>(a); mancanti.removeAll(b);
            List<String> aggiunte = new ArrayList<>(b); aggiunte.removeAll(a);
            StringBuilder sb = new StringBuilder(t + ": ");
            if (!mancanti.isEmpty()) sb.append(mancanti.size()).append(" non tornate [")
                                       .append(taglia(mancanti.get(0), 110)).append("] ");
            if (!aggiunte.isEmpty()) sb.append(aggiunte.size()).append(" di troppo [")
                                       .append(taglia(aggiunte.get(0), 110)).append("]");
            diff.add(sb.toString().trim());
        }
        return diff;
    }

    // ── Utilità ─────────────────────────────────────────────────────────────────

    static void gruppo(String s) {
        System.out.printf("%n═══ %s %s%n", s, "═".repeat(Math.max(0, 58 - s.length())));
    }

    /** JSON con gli apici singoli, per non annegare negli escape. */
    static JsonObject j(String s) {
        return com.google.gson.JsonParser.parseString(s.replace('\'', '"')).getAsJsonObject();
    }

    static long ultimaOp() throws SQLException {
        try (Statement st = raw.createStatement();
             ResultSet rs = st.executeQuery("SELECT COALESCE(MAX(id),0) FROM op_log")) {
            return rs.next() ? rs.getLong(1) : 0;
        }
    }

    static int id(String sql) {
        try (Statement st = raw.createStatement(); ResultSet rs = st.executeQuery(sql)) {
            return rs.next() ? rs.getInt(1) : -1;
        } catch (SQLException e) { return -1; }
    }
}
