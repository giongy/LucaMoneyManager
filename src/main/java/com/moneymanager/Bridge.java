package com.moneymanager;

import com.google.gson.*;
import org.cef.browser.CefBrowser;
import org.cef.browser.CefFrame;
import org.cef.callback.CefQueryCallback;
import org.cef.handler.CefMessageRouterHandlerAdapter;

import javax.swing.*;
import java.awt.*;
import java.awt.event.WindowEvent;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Bridge tra JavaScript e Java.
 * JS chiama: window.cefQuery({ request: JSON.stringify({method, params}), onSuccess, onFailure })
 * Java risponde con JSON via callback.success() o callback.failure()
 */
public class Bridge extends CefMessageRouterHandlerAdapter {

    private Database db;
    private final Settings settings;
    private final JFrame window;
    private final java.nio.file.Path dataDir;
    private final Gson gson = new GsonBuilder().serializeNulls().create();

    public Bridge(Database db, Settings settings, JFrame window, java.nio.file.Path dataDir) {
        this.db = db;
        this.settings = settings;
        this.window = window;
        this.dataDir = dataDir;
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

            // Dialog asincroni: mostrano UI DOPO che onQuery ritorna.
            if ("chooseDbFile".equals(method)) {
                handleChooseDbFileAsync(params, callback);
                return true;
            }
            if ("chooseBackupDir".equals(method)) {
                handleChooseBackupDirAsync(callback);
                return true;
            }
            if ("chooseAttachmentsDir".equals(method)) {
                handleChooseAttachmentsDirAsync(callback);
                return true;
            }
            if ("chooseAttachmentFile".equals(method)) {
                handleChooseAttachmentFileAsync(callback);
                return true;
            }
            if ("fetchOnlinePrice".equals(method)) {
                final String isin = params.get("isin").getAsString();
                Thread.ofVirtual().start(() -> {
                    try {
                        succeed(callback, doFetchOnlinePrice(isin));
                    } catch (Exception e) {
                        callback.failure(500, e.getMessage() != null ? e.getMessage() : "Errore fetch prezzo");
                    }
                });
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
        Thread.ofVirtual().start(() -> {
            try {
                String cur   = settings.get(Settings.DB_PATH);
                String title = "save".equals(mode) ? "Crea nuovo database" : "Apri database esistente";
                int    fdMode = "save".equals(mode) ? java.awt.FileDialog.SAVE : java.awt.FileDialog.LOAD;
                String path  = nativePickFile(title, fdMode, cur, "db");
                if (path == null) { succeed(callback, Map.of("path", "", "cancelled", true)); return; }
                if ("save".equals(mode) && !path.matches(".*\\.(db|sqlite|sqlite3)$")) path += ".db";
                succeed(callback, Map.of("path", path, "cancelled", false));
            } catch (Exception e) { succeed(callback, Map.of("path", "", "cancelled", true)); }
        });
    }

    private void handleChooseBackupDirAsync(CefQueryCallback callback) {
        Thread.ofVirtual().start(() -> {
            try {
                String cur = settings.get(Settings.BACKUP_DIR);
                String path = winPickFolder("Seleziona cartella backup", cur);
                if (path == null) succeed(callback, Map.of("path", "", "cancelled", true));
                else              succeed(callback, Map.of("path", path, "cancelled", false));
            } catch (Exception e) { succeed(callback, Map.of("path", "", "cancelled", true)); }
        });
    }

    private void handleChooseAttachmentsDirAsync(CefQueryCallback callback) {
        Thread.ofVirtual().start(() -> {
            try {
                String cur = settings.get(Settings.ATTACHMENTS_DIR);
                String path = winPickFolder("Seleziona cartella allegati", cur);
                if (path == null) succeed(callback, Map.of("path", "", "cancelled", true));
                else              succeed(callback, Map.of("path", path, "cancelled", false));
            } catch (Exception e) { succeed(callback, Map.of("path", "", "cancelled", true)); }
        });
    }

    private void handleChooseAttachmentFileAsync(CefQueryCallback callback) {
        Thread.ofVirtual().start(() -> {
            try {
                String path = nativePickFile("Seleziona file allegato", java.awt.FileDialog.LOAD, null, null);
                if (path == null) succeed(callback, Map.of("path", "", "cancelled", true));
                else              succeed(callback, Map.of("path", path, "cancelled", false));
            } catch (Exception e) { succeed(callback, Map.of("path", "", "cancelled", true)); }
        });
    }

    // ── Helper dialog nativi Windows ─────────────────────────────────────────

    /**
     * Picker file nativo via java.awt.FileDialog (usa Win32 GetOpenFileName/GetSaveFileName).
     * @param ext  estensione da filtrare, es. "db"; null = tutti i file
     */
    private String nativePickFile(String title, int mode, String initialPath, String ext) throws Exception {
        final String[] result = {null};
        SwingUtilities.invokeAndWait(() -> {
            java.awt.FileDialog fd = new java.awt.FileDialog(window, title, mode);
            if (ext != null) fd.setFilenameFilter((dir, name) -> name.endsWith("." + ext));
            if (initialPath != null && !initialPath.isBlank()) {
                java.io.File f = new java.io.File(initialPath);
                fd.setDirectory(f.getParent());
                fd.setFile(f.getName());
            }
            fd.setVisible(true);
            if (fd.getFile() != null) result[0] = fd.getDirectory() + fd.getFile();
        });
        return result[0];
    }

    /** Folder picker via PowerShell FolderBrowserDialog (Vista+ style). */
    private String winPickFolder(String title, String initialPath) throws Exception {
        String init = (initialPath != null && !initialPath.isBlank())
                ? "$d.SelectedPath='" + initialPath.replace("'","''") + "';" : "";
        String ps =
                "Add-Type -AssemblyName System.Windows.Forms;" +
                "[System.Windows.Forms.Application]::EnableVisualStyles();" +
                "$d=New-Object System.Windows.Forms.FolderBrowserDialog;" +
                "$d.Description='" + title.replace("'","''") + "';" +
                "$d.UseDescriptionForTitle=$true;" +
                "$d.ShowNewFolderButton=$true;" +
                init +
                "if($d.ShowDialog()-eq'OK'){$d.SelectedPath}";
        ProcessBuilder pb = new ProcessBuilder(
                "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
                "-STA", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", ps);
        pb.redirectErrorStream(false);
        Process proc = pb.start();
        String out = new String(proc.getInputStream().readAllBytes(), StandardCharsets.UTF_8).trim();
        proc.waitFor();
        return out.isBlank() ? null : out;
    }

    public Object dispatch(String method, JsonObject p, CefBrowser browser) throws Exception {
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
            case "getDbPath"    -> Map.of("path", db.getDbPath());
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
            case "getAccounts"      -> db.getAccounts();
            case "addAccount"       -> db.addAccount(p);
            case "updateAccount"    -> db.updateAccount(p.get("id").getAsInt(), p);
            case "deleteAccount"    -> db.deleteAccount(p.get("id").getAsInt());
            case "updateAccountOrder" -> {
                db.updateAccountOrder(p.get("items").getAsJsonArray());
                yield Map.of("ok", true);
            }

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
            case "getTransactions"      -> db.getTransactions(p);
            case "addTransaction"       -> db.addTransaction(p);
            case "updateTransaction"    -> db.updateTransaction(p.get("id").getAsInt(), p);
            case "deleteTransaction"    -> db.deleteTransaction(p.get("id").getAsInt());
            case "getTransactionSplits" -> db.getTransactionSplits(p.get("id").getAsInt());
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
            case "deleteBudgetMonth" -> {
                db.deleteBudgetMonth(p.get("category_id").getAsInt(),
                        p.get("month").getAsInt(), p.get("year").getAsInt());
                yield Map.of("ok", true);
            }
            case "generateBudget" -> {
                int year = p.get("year").getAsInt();
                String source = p.has("source") ? p.get("source").getAsString() : "history";
                if ("copy".equals(source)) {
                    db.copyBudgetFromYear(year, p.get("source_year").getAsInt());
                } else {
                    db.generateBudget(year, "history".equals(source));
                }
                yield Map.of("ok", true);
            }
            case "deleteBudgetYear" -> db.deleteBudgetYear(p.get("year").getAsInt());
            case "getBudgetYears" -> db.getBudgetYears();
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
            case "getOverdue"            -> db.getOverdue();
            case "getDueToday"           -> db.getDueToday();
            case "getTransactionsWithTag" -> db.getTransactionsWithTag(p.get("name").getAsString());
            case "advanceScheduled"  -> { db.advanceScheduled(p.get("id").getAsInt(), p.get("date").getAsString()); yield Map.of("ok", true); }
            case "getProjection"    -> db.getProjection(
                p.get("from_date").getAsString(), p.get("to_date").getAsString(),
                p.has("account_ids") ? p.get("account_ids").getAsString() : "",
                p.has("daily") && p.get("daily").getAsBoolean());
            case "getProjectionByCategory" -> db.getProjectionByCategory(
                p.get("from_date").getAsString(), p.get("to_date").getAsString());
            case "saveForecast"      -> { int fid = db.saveForecast(p.get("forecast_date").getAsString(), p.get("projected_balance").getAsDouble(), p.get("categories").getAsJsonArray()); yield Map.of("id", fid); }
            case "getForecasts"      -> db.getForecasts();
            case "deleteForecast"    -> { db.deleteForecast(p.get("id").getAsInt()); yield Map.of("ok", true); }
            case "archiveForecast"   -> { db.archiveForecast(p.get("id").getAsInt()); yield Map.of("ok", true); }
            case "getForecastDetail" -> db.getForecastDetail(p.get("id").getAsInt());

            // ─── Portafoglio ───────────────────────────────────────────────
            case "getPortfolio"             -> db.getPortfolio();
            case "getPortfolioTransactions" -> db.getPortfolioTransactions(p.get("portfolio_id").getAsInt());
            case "buyStock"                 -> db.buyStock(p);
            case "sellStock"                -> db.sellStock(p);
            case "updateStockPrice"         -> db.updateStockPrice(p.get("id").getAsInt(), p.get("price").getAsDouble());
            case "updatePortfolioItem"      -> db.updatePortfolioItem(p);
            case "importPosition"           -> db.importPosition(p);
            case "registerCoupon"           -> db.registerCoupon(p);
            case "deletePortfolioItem"      -> db.deletePortfolioItem(p.get("id").getAsInt());

            // ─── Tag ───────────────────────────────────────────────────────────────
            case "getTags"    -> db.getTags();
            case "addTag"     -> db.addTag(p);
            case "updateTag"  -> db.updateTag(p.get("id").getAsInt(), p);
            case "deleteTag"  -> db.deleteTag(p.get("id").getAsInt());

            // ─── Range Preset ──────────────────────────────────────────────────────
            case "getRangePresets"    -> db.getRangePresets();
            case "addRangePreset"     -> db.addRangePreset(p);
            case "updateRangePreset"  -> db.updateRangePreset(p.get("id").getAsInt(), p);
            case "deleteRangePreset"  -> db.deleteRangePreset(p.get("id").getAsInt());

            // ─── Statistiche ───────────────────────────────────────────────
            case "getDashboardStats"    -> db.getDashboardStats(p.get("year").getAsInt());
            case "getMonthlyChartData"  -> db.getMonthlyChartData(p.get("year").getAsInt());
            case "getCategoryChartData" -> db.getCategoryChartData(
                    p.get("year").getAsInt(), p.get("type").getAsString());

            // ─── Impostazioni ──────────────────────────────────────────────
            case "getSettings" -> {
                java.util.Map<String, String> all = new java.util.LinkedHashMap<>(settings.getAll());
                all.put("_settings_path", settings.getPath().toAbsolutePath().toString());
                String ver = Bridge.class.getPackage().getImplementationVersion();
                if (ver == null) {
                    // Fallback: version.properties generato da Maven con resource filtering
                    try (var is = Bridge.class.getResourceAsStream("/version.properties")) {
                        if (is != null) {
                            java.util.Properties vp = new java.util.Properties();
                            vp.load(is);
                            ver = vp.getProperty("version");
                        }
                    } catch (Exception ignored) {}
                }
                if (ver != null) all.put("_app_version", ver);
                try {
                    org.cef.CefApp.CefVersion v = org.cef.CefApp.getInstance().getVersion();
                    all.put("_chromium", v.CHROME_VERSION_MAJOR + "." + v.CHROME_VERSION_MINOR
                            + "." + v.CHROME_VERSION_BUILD + "." + v.CHROME_VERSION_PATCH);
                } catch (Exception ignored) {}
                try {
                    all.put("_sqlite_version", db.getSQLiteVersion());
                } catch (Exception ignored) {}
                all.put("_java_version", System.getProperty("java.version")
                        + " (" + System.getProperty("java.vm.name") + ")");
                all.put("_dep_jcef",   mavenVersion("me.friwi",              "jcefmaven"));
                all.put("_dep_sqlite", mavenVersion("org.xerial",             "sqlite-jdbc"));
                all.put("_dep_gson",   mavenVersion("com.google.code.gson",  "gson"));
                all.put("_dep_slf4j",  mavenVersion("org.slf4j",             "slf4j-nop"));
                yield all;
            }

            case "setSetting" -> {
                settings.set(p.get("key").getAsString(), p.get("value").getAsString());
                yield Map.of("ok", true);
            }

            case "openSettingsFile" -> {
                java.awt.Desktop.getDesktop().open(settings.getPath().toFile());
                yield Map.of("ok", true);
            }

            // ─── Allegati ─────────────────────────────────────────────────────
            case "attachFile" -> {
                String attDir = settings.get(Settings.ATTACHMENTS_DIR);
                if (attDir == null || attDir.isBlank())
                    yield Map.of("error", "Cartella allegati non configurata. Configurala in Impostazioni > Preferenze.");
                int txId       = p.get("tx_id").getAsInt();
                String srcPath = p.get("source_path").getAsString();
                String oldRel  = p.has("old_path") && !p.get("old_path").isJsonNull()
                                 ? p.get("old_path").getAsString() : null;
                java.nio.file.Path dir = java.nio.file.Path.of(attDir);
                java.nio.file.Files.createDirectories(dir);
                java.io.File srcFile = new java.io.File(srcPath);
                String destName = txId + "_" + srcFile.getName();
                java.nio.file.Files.copy(srcFile.toPath(), dir.resolve(destName),
                        java.nio.file.StandardCopyOption.REPLACE_EXISTING);
                if (oldRel != null && !oldRel.isBlank() && !oldRel.equals(destName)) {
                    try { java.nio.file.Files.deleteIfExists(dir.resolve(oldRel)); }
                    catch (Exception ignored) {}
                }
                db.setAttachment(txId, destName);
                yield Map.of("path", destName);
            }

            case "openAttachment" -> {
                String attDir = settings.get(Settings.ATTACHMENTS_DIR);
                String relPath = p.get("path").getAsString();
                if (attDir == null || attDir.isBlank())
                    yield Map.of("error", "Cartella allegati non configurata");
                java.nio.file.Path file = java.nio.file.Path.of(attDir).resolve(relPath);
                if (!java.nio.file.Files.exists(file))
                    yield Map.of("error", "File non trovato: " + file.toAbsolutePath());
                java.awt.Desktop.getDesktop().open(file.toFile());
                yield Map.of("ok", true);
            }

            case "removeAttachment" -> {
                int txId      = p.get("tx_id").getAsInt();
                String relPath = p.has("path") && !p.get("path").isJsonNull()
                                 ? p.get("path").getAsString() : null;
                if (relPath != null && !relPath.isBlank()) {
                    String attDir = settings.get(Settings.ATTACHMENTS_DIR);
                    if (attDir != null && !attDir.isBlank()) {
                        try { java.nio.file.Files.deleteIfExists(
                                java.nio.file.Path.of(attDir).resolve(relPath)); }
                        catch (Exception ignored) {}
                    }
                }
                db.removeAttachment(txId);
                yield Map.of("ok", true);
            }

            case "openLogFolder" -> {
                java.nio.file.Path logFile = db.getLogger().getLogFile();
                if (logFile != null) {
                    java.nio.file.Path dir = logFile.getParent();
                    if (dir != null && java.nio.file.Files.exists(dir))
                        java.awt.Desktop.getDesktop().open(dir.toFile());
                }
                yield Map.of("ok", true);
            }

            case "openUrl" -> {
                java.awt.Desktop.getDesktop().browse(new java.net.URI(p.get("url").getAsString()));
                yield Map.of("ok", true);
            }

            case "resetJcef" -> {
                java.nio.file.Path jcefDir = dataDir.resolve("jcef");
                if (java.nio.file.Files.exists(jcefDir)) {
                    // Su Windows i DLL JCEF sono lockati finché il processo è vivo.
                    // Lanciamo uno script batch che aspetta l'uscita del processo
                    // e poi cancella la cartella con rmdir /s /q.
                    java.nio.file.Path script = dataDir.resolve("_reset_jcef.bat");
                    String bat = "@echo off\r\n"
                            + "ping 127.0.0.1 -n 4 > nul\r\n"
                            + "rmdir /s /q \"" + jcefDir.toAbsolutePath() + "\"\r\n"
                            + "del \"%~f0\"\r\n";
                    java.nio.file.Files.writeString(script, bat);
                    new ProcessBuilder("cmd", "/c", "start", "/min", "", script.toAbsolutePath().toString())
                            .start();
                }
                SwingUtilities.invokeLater(() -> System.exit(0));
                yield Map.of("ok", true);
            }

            case "reloadDb" -> {
                String path = p.get("path").getAsString();
                settings.set(Settings.DB_PATH, path);
                db.reconnect(path);
                yield Map.of("ok", true);
            }

            case "doBackup" -> {
                String bDir = settings.get(Settings.BACKUP_DIR);
                int bMax = Integer.parseInt(settings.get(Settings.BACKUP_MAX, "10"));
                String dest = db.backup(bDir, bMax);
                yield Map.of("ok", true, "path", dest);
            }

            case "listBackups" -> {
                String bDir = settings.get(Settings.BACKUP_DIR);
                yield Map.of("backups", db.listBackups(bDir));
            }

            case "restoreBackup" -> {
                String bDir = settings.get(Settings.BACKUP_DIR);
                yield db.restoreBackup(p.get("path").getAsString(), bDir);
            }

            // ─── Manutenzione DB ───────────────────────────────────────────────────
            case "dbGetInfo"        -> db.dbGetInfo();
            case "dbVacuum"         -> db.dbVacuum();
            case "dbIntegrityCheck" -> db.dbIntegrityCheck();
            case "dbReindex"        -> db.dbReindex();
            case "dbAnalyze"        -> db.dbAnalyze();

            // ─── Analytics ─────────────────────────────────────────────────────────
            case "getCategoryMonthTable" -> db.getCategoryMonthTable(
                p.has("months") ? p.get("months").getAsInt() : 12);
            case "getMonthlyBalance"          -> db.getMonthlyBalance(
                p.has("months") ? p.get("months").getAsInt() : 12);
            case "getOldestTransactionMonth"  -> db.getOldestTransactionMonth();

            // ─── Resoconti ─────────────────────────────────────────────────────────
            case "getReports"    -> db.getReports();
            case "saveReport"    -> db.saveReport(p);
            case "deleteReport"  -> db.deleteReport(p.get("id").getAsInt());

            // ─── Log ───────────────────────────────────────────────────────────────
            case "readLog"    -> db.readLog(p.has("lines") ? p.get("lines").getAsInt() : 500);
            case "getLogInfo"      -> db.getLogInfo();
            case "purgeLog"        -> db.purgeLog(p.get("cutoff").getAsString());
            case "purgeSystemLog"  -> db.purgeSystemLog();

            default -> throw new Exception("Metodo sconosciuto: " + method);
        };
    }

    // ── Fetch prezzo online da Borsa Italiana ────────────────────────────────

    private Map<String, Object> doFetchOnlinePrice(String ticker) throws Exception {
        HttpClient client = HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.NORMAL)
                .connectTimeout(Duration.ofSeconds(15))
                .build();
        String ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

        // Step 1: cerca su Borsa Italiana search engine
        String q = URLEncoder.encode(ticker, StandardCharsets.UTF_8);
        String searchUrl = "https://www.borsaitaliana.it/borsa/searchengine/search.html?q=" + q + "&Cerca=Search&lang=it";
        System.out.println("[FetchPrice] Cerco: " + ticker + " → " + searchUrl);
        String searchHtml = httpGet(client, ua, searchUrl);
        System.out.println("[FetchPrice] Search HTML length: " + searchHtml.length());

        // Log primi 500 char utili (senza script/style)
        String searchPreview = searchHtml.replaceAll("(?s)<script[^>]*>.*?</script>", "")
                .replaceAll("(?s)<style[^>]*>.*?</style>", "")
                .replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim();
        System.out.println("[FetchPrice] Search text preview: " +
                searchPreview.substring(0, Math.min(500, searchPreview.length())));

        // Step 2: estrai scheda URL dal risultato.
        // La search engine restituisce href del tipo:
        //   /borsa/search/scheda.html?code=IT0005672024&amp;mic=MOTX&amp;lang=it
        // oppure (meno comune):
        //   /borsa/obbligazioni/mot/btp/scheda/IT0005672024-MOTX.html
        String schedaPath = null;
        String mic = "";

        // Formato 1: search/scheda.html?code=...&mic=...
        Matcher m1 = Pattern.compile(
                "href=\"(/borsa/search/scheda\\.html\\?[^\"]+)\"").matcher(searchHtml);
        if (m1.find()) {
            schedaPath = m1.group(1).replace("&amp;", "&");
            Matcher micM = Pattern.compile("[?&]mic=([A-Z0-9]+)").matcher(schedaPath);
            if (micM.find()) mic = micM.group(1);
            System.out.println("[FetchPrice] Scheda (formato 1): " + schedaPath + " mic=" + mic);
        }

        // Formato 2: /borsa/<categoria>/scheda/<ISIN>-<MIC>.html
        if (schedaPath == null) {
            Matcher m2 = Pattern.compile(
                    "href=\"(/borsa/[^\"]+/scheda/[^\"]*-([A-Z0-9]+)\\.html)\"").matcher(searchHtml);
            if (m2.find()) {
                schedaPath = m2.group(1);
                mic = m2.group(2);
                System.out.println("[FetchPrice] Scheda (formato 2): " + schedaPath + " mic=" + mic);
            }
        }

        if (schedaPath == null) {
            // Log contesto attorno a "scheda" per capire il formato reale
            int idx = searchHtml.indexOf("scheda");
            if (idx >= 0) {
                int from = Math.max(0, idx - 80);
                int to   = Math.min(searchHtml.length(), idx + 200);
                System.out.println("[FetchPrice] Raw attorno a 'scheda': " + searchHtml.substring(from, to));
            } else {
                // Nessuna occorrenza di "scheda" — log prime 1000 char di HTML raw
                System.out.println("[FetchPrice] 'scheda' non trovato nell'HTML. Raw (1000): "
                        + searchHtml.substring(0, Math.min(1000, searchHtml.length())));
            }
            throw new Exception("Titolo non trovato su Borsa Italiana: " + ticker);
        }

        // Step 3: carica la scheda e ne legge il prezzo direttamente
        String fullSchedaUrl = "https://www.borsaitaliana.it" + schedaPath;
        System.out.println("[FetchPrice] Carico scheda: " + fullSchedaUrl);
        String schedaHtml = httpGet(client, ua, fullSchedaUrl);
        String text = schedaHtml.replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ");
        System.out.println("[FetchPrice] Scheda HTML length: " + schedaHtml.length());

        // Cerca numero in formato italiano (virgola decimale) dopo parola "prezzo"
        Pattern pricePat = Pattern.compile(
                "(?i)(?:prezzo|price|ultimo|last)[^0-9]{0,80}" +
                "([1-9][0-9]{0,4}(?:[.][0-9]{3})*[,][0-9]{1,4})");
        Matcher priceMat = pricePat.matcher(text);
        if (!priceMat.find()) {
            // Log primi 300 char del testo per debug
            System.out.println("[FetchPrice] Testo scheda (primi 300): " +
                    text.substring(0, Math.min(300, text.length())));
            throw new Exception("Prezzo non trovato su Borsa Italiana per: " + ticker);
        }

        String raw = priceMat.group(1);
        System.out.println("[FetchPrice] Prezzo raw trovato: " + raw);
        double price = Double.parseDouble(raw.replace(".", "").replace(",", "."));

        Map<String, Object> result = new HashMap<>();
        result.put("ticker", ticker);
        result.put("price", price);
        result.put("mic", mic);
        return result;
    }

    private String httpGet(HttpClient client, String ua, String url) throws Exception {
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("User-Agent", ua)
                .header("Accept-Language", "it-IT,it;q=0.9")
                .GET().build();
        return client.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)).body();
    }

    private static String mavenVersion(String groupId, String artifactId) {
        try (var is = Bridge.class.getResourceAsStream(
                "/META-INF/maven/" + groupId + "/" + artifactId + "/pom.properties")) {
            if (is == null) return "?";
            var props = new java.util.Properties();
            props.load(is);
            return props.getProperty("version", "?");
        } catch (Exception e) { return "?"; }
    }
}
