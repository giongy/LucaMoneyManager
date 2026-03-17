package com.moneymanager;

import com.google.gson.*;
import org.cef.browser.CefBrowser;
import org.cef.browser.CefFrame;
import org.cef.callback.CefQueryCallback;
import org.cef.handler.CefMessageRouterHandlerAdapter;

import javax.swing.*;
import javax.swing.filechooser.FileNameExtensionFilter;
import java.awt.*;
import java.awt.event.WindowEvent;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;

/**
 * Bridge tra JavaScript e Java.
 * JS chiama: window.cefQuery({ request: JSON.stringify({method, params}), onSuccess, onFailure })
 * Java risponde con JSON via callback.success() o callback.failure()
 */
public class Bridge extends CefMessageRouterHandlerAdapter {

    private final Database db;
    private final Settings settings;
    private final JFrame window;
    private final Gson gson = new GsonBuilder().serializeNulls().create();

    public Bridge(Database db, Settings settings, JFrame window) {
        this.db = db;
        this.settings = settings;
        this.window = window;
    }

    /** Risponde con JSON encodato in base64 — evita corruzione emoji in JCEF. */
    private void succeed(CefQueryCallback callback, Object data) {
        String json = gson.toJson(data);
        String b64  = Base64.getEncoder().encodeToString(json.getBytes(StandardCharsets.UTF_8));
        callback.success(b64);
    }

    @Override
    public boolean onQuery(CefBrowser browser, CefFrame frame, long queryId,
                           String request, boolean persistent, CefQueryCallback callback) {
        try {
            String json = new String(Base64.getDecoder().decode(request), StandardCharsets.UTF_8);
            JsonObject req = JsonParser.parseString(json).getAsJsonObject();
            String method = req.get("method").getAsString();
            JsonObject params = req.has("params") && req.get("params").isJsonObject()
                    ? req.get("params").getAsJsonObject()
                    : new JsonObject();

            // chooseDbFile è asincrono: mostra dialog DOPO che onQuery ritorna.
            if ("chooseDbFile".equals(method)) {
                handleChooseDbFileAsync(params, callback);
                return true;
            }

            succeed(callback, dispatch(method, params, browser));

        } catch (Exception e) {
            callback.failure(500, e.getMessage() != null ? e.getMessage() : "Errore interno");
        }
        return true;
    }

    private void handleChooseDbFileAsync(JsonObject p, CefQueryCallback callback) {
        String mode = p.has("mode") ? p.get("mode").getAsString() : "open";

        // invokeLater: pianifica il dialog DOPO che onQuery ritorna → nessun blocco
        SwingUtilities.invokeLater(() -> {
            JFileChooser fc = new JFileChooser();
            fc.setDialogTitle("open".equals(mode) ? "Apri database esistente" : "Crea nuovo database");
            fc.setFileFilter(new FileNameExtensionFilter(
                    "Database SQLite (*.db, *.sqlite)", "db", "sqlite", "sqlite3"));
            String cur = settings.get(Settings.DB_PATH);
            if (cur != null && !cur.isBlank())
                fc.setSelectedFile(new File(cur));

            // Frame helper always-on-top per apparire sopra la finestra Chromium
            JFrame helper = new JFrame();
            helper.setUndecorated(true);
            helper.setAlwaysOnTop(true);
            helper.setSize(0, 0);
            helper.setLocationRelativeTo(window);
            helper.setVisible(true);

            try {
                int res = "save".equals(mode)
                        ? fc.showSaveDialog(helper)
                        : fc.showOpenDialog(helper);

                if (res == JFileChooser.APPROVE_OPTION) {
                    String path = fc.getSelectedFile().getAbsolutePath();
                    if ("save".equals(mode) && !path.matches(".*\\.(db|sqlite|sqlite3)$"))
                        path += ".db";
                    succeed(callback, Map.of("path", path, "cancelled", false));
                } else {
                    succeed(callback, Map.of("path", "", "cancelled", true));
                }
            } finally {
                helper.dispose();
            }
        });
    }

    private Object dispatch(String method, JsonObject p, CefBrowser browser) throws Exception {
        return switch (method) {

            // ─── Finestra ──────────────────────────────────────────────────
            case "minimize" -> {
                SwingUtilities.invokeLater(() -> window.setState(JFrame.ICONIFIED));
                yield Map.of("ok", true);
            }
            case "maximize" -> {
                SwingUtilities.invokeLater(() -> {
                    boolean max = (window.getExtendedState() & JFrame.MAXIMIZED_BOTH) != 0;
                    if (!max) {
                        GraphicsEnvironment ge = GraphicsEnvironment.getLocalGraphicsEnvironment();
                        window.setMaximizedBounds(ge.getMaximumWindowBounds());
                    }
                    window.setExtendedState(max ? JFrame.NORMAL : JFrame.MAXIMIZED_BOTH);
                });
                yield Map.of("ok", true);
            }
            case "close" -> {
                SwingUtilities.invokeLater(() ->
                    window.dispatchEvent(new WindowEvent(window, WindowEvent.WINDOW_CLOSING)));
                yield Map.of("ok", true);
            }
            case "getWindowPos" -> Map.of("x", window.getX(), "y", window.getY());
            case "setWindowPos" -> {
                int x = p.get("x").getAsInt();
                int y = p.get("y").getAsInt();
                SwingUtilities.invokeLater(() -> window.setLocation(x, y));
                yield Map.of("ok", true);
            }
            case "getWindowBounds" -> Map.of(
                "x", window.getX(), "y", window.getY(),
                "w", window.getWidth(), "h", window.getHeight());
            case "setWindowBounds" -> {
                int x = p.get("x").getAsInt(), y = p.get("y").getAsInt();
                int w = p.get("w").getAsInt(), h = p.get("h").getAsInt();
                Dimension min = window.getMinimumSize();
                int fw = Math.max(w, min.width), fh = Math.max(h, min.height);
                SwingUtilities.invokeLater(() -> window.setBounds(x, y, fw, fh));
                yield Map.of("ok", true);
            }
            case "isMaximized" -> Map.of("maximized",
                    (window.getExtendedState() & JFrame.MAXIMIZED_BOTH) != 0);

            // ─── Conti ─────────────────────────────────────────────────────
            case "getAccounts"    -> db.getAccounts();
            case "addAccount"     -> db.addAccount(p);
            case "updateAccount"  -> db.updateAccount(p.get("id").getAsInt(), p);
            case "deleteAccount"  -> db.deleteAccount(p.get("id").getAsInt());

            // ─── Categorie ─────────────────────────────────────────────────
            case "getCategories"     -> db.getCategories();
            case "addCategory"       -> db.addCategory(p);
            case "updateCategory"    -> db.updateCategory(p.get("id").getAsInt(), p);
            case "deleteCategory"    -> db.deleteCategory(p.get("id").getAsInt());
            case "getCategoryUsage"  -> db.getCategoryUsage(p.get("id").getAsInt());
            case "reassignCategory"  -> {
                db.reassignCategory(p.get("from_id").getAsInt(), p.get("to_id").getAsInt());
                yield Map.of("ok", true);
            }

            // ─── Transazioni ───────────────────────────────────────────────
            case "getTransactions"    -> db.getTransactions(p);
            case "addTransaction"     -> db.addTransaction(p);
            case "updateTransaction"  -> db.updateTransaction(p.get("id").getAsInt(), p);
            case "deleteTransaction"  -> db.deleteTransaction(p.get("id").getAsInt());
            case "updateTransactionReconciled" -> db.updateTransactionReconciled(
                    p.get("id").getAsInt(), p.get("reconciled").getAsBoolean());
            case "getAccountSummary"  -> db.getAccountSummary(p.get("account_id").getAsInt());

            // ─── Budget ────────────────────────────────────────────────────
            case "getBudgets"   -> db.getBudgets(p.get("month").getAsInt(), p.get("year").getAsInt());
            case "setBudget"    -> db.setBudget(p);
            case "deleteBudget" -> db.deleteBudget(p.get("id").getAsInt());
            case "getBudgetYear" -> db.getBudgetYear(p.get("year").getAsInt());
            case "setBudgetBulk" -> {
                db.setBudgetBulk(p.get("category_id").getAsInt(), p.get("year").getAsInt(),
                                 p.get("amounts").getAsJsonArray());
                yield Map.of("ok", true);
            }
            case "generateBudget" -> {
                db.generateBudget(p.get("year").getAsInt(), p.get("from_history").getAsBoolean());
                yield Map.of("ok", true);
            }
            case "setBudgetConfig" -> {
                db.setBudgetConfig(
                    p.get("category_id").getAsInt(), p.get("year").getAsInt(),
                    p.get("mode").getAsString(), p.get("master_amount").getAsDouble());
                yield Map.of("ok", true);
            }

            // ─── Transazioni Pianificate ───────────────────────────────────────────
            case "getScheduled"     -> db.getScheduled();
            case "addScheduled"     -> db.addScheduled(p);
            case "updateScheduled"  -> db.updateScheduled(p.get("id").getAsInt(), p);
            case "deleteScheduled"  -> db.deleteScheduled(p.get("id").getAsInt());
            case "getUpcoming"      -> db.getUpcoming(p.has("limit") ? p.get("limit").getAsInt() : 15);
            case "getUpcomingAll"   -> db.getUpcomingAll(p.has("limit") ? p.get("limit").getAsInt() : 15);
            case "getOverdue"       -> db.getOverdue();
            case "advanceScheduled"  -> { db.advanceScheduled(p.get("id").getAsInt(), p.get("date").getAsString()); yield Map.of("ok", true); }
            case "getProjection"    -> db.getProjection(
                p.get("from_date").getAsString(), p.get("to_date").getAsString(),
                p.has("account_ids") ? p.get("account_ids").getAsString() : "");

            // ─── Portafoglio ───────────────────────────────────────────────
            case "getPortfolio"          -> db.getPortfolio();
            case "addPortfolioItem"      -> db.addPortfolioItem(p);
            case "updatePortfolioItem"   -> db.updatePortfolioItem(p.get("id").getAsInt(), p);
            case "deletePortfolioItem"   -> db.deletePortfolioItem(p.get("id").getAsInt());

            // ─── Tag ───────────────────────────────────────────────────────────────
            case "getTags"    -> db.getTags();
            case "addTag"     -> db.addTag(p);
            case "updateTag"  -> db.updateTag(p.get("id").getAsInt(), p);
            case "deleteTag"  -> db.deleteTag(p.get("id").getAsInt());

            // ─── Statistiche ───────────────────────────────────────────────
            case "getDashboardStats"    -> db.getDashboardStats(p.get("year").getAsInt());
            case "getMonthlyChartData"  -> db.getMonthlyChartData(p.get("year").getAsInt());
            case "getCategoryChartData" -> db.getCategoryChartData(
                    p.get("year").getAsInt(), p.get("type").getAsString());

            // ─── Impostazioni ──────────────────────────────────────────────
            case "getSettings" -> settings.getAll();

            case "setSetting" -> {
                settings.set(p.get("key").getAsString(), p.get("value").getAsString());
                yield Map.of("ok", true);
            }

            default -> throw new Exception("Metodo sconosciuto: " + method);
        };
    }
}
