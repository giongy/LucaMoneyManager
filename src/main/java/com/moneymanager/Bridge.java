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

    // ─── Performance log ──────────────────────────────────────────────────────
    private volatile boolean _perfEnabled = false;
    private static final int PERF_MAX = 150;
    private final java.util.Deque<java.util.Map<String,Object>> _perfBuf =
            new java.util.ArrayDeque<>();

    // Callback invocato quando il JS segnala "primo frame dipinto" (vedi case "uiReady").
    // Permette a MainWindow di nascondere la splash al momento giusto invece che su onLoadEnd
    // (che con GPU attiva precede il primo composite di ~500ms → flash nero).
    private volatile Runnable uiReadyCallback;
    public void setUiReadyCallback(Runnable r) { this.uiReadyCallback = r; }


    public Bridge(Database db, Settings settings, JFrame window, java.nio.file.Path dataDir) {
        this.db = db;
        this.settings = settings;
        this.window = window;
        this.dataDir = dataDir;
        migrateSettingsToDB();
    }

    /** Sposta le chiavi non-bootstrap da settings.properties al DB (migrazione una tantum). */
    private void migrateSettingsToDB() {
        Map<String, String> all = settings.getAll();
        for (Map.Entry<String, String> e : all.entrySet()) {
            String k = e.getKey();
            if (Settings.BOOTSTRAP_KEYS.contains(k)) continue;
            String existing = db.getAppSetting(k, null);
            if (existing == null) db.setAppSetting(k, e.getValue());
            settings.remove(k);
        }
    }

    /** Pulisce lo stato accumulato in sessione. Chiamato quando la finestra si nasconde al tray. */
    public void clearSessionState() {
        _perfBuf.clear();
    }

    /** Risponde con JSON encodato in base64 — evita corruzione emoji in JCEF. */
    private void succeed(CefQueryCallback callback, Object data) {
        String json = gson.toJson(data);
        String b64  = Base64.getEncoder().encodeToString(json.getBytes(StandardCharsets.UTF_8));
        callback.success(b64);
    }

    /** True se la chiave esiste, non è null ed è un numero (evita getAsInt() su JsonNull → eccezione). */
    private static boolean hasNum(JsonObject p, String key) {
        return p.has(key) && p.get(key).isJsonPrimitive() && p.get(key).getAsJsonPrimitive().isNumber();
    }

    /**
     * Risolve il nome di un allegato dentro la cartella allegati, garantendo che il risultato
     * resti DENTRO quella cartella. Ritorna null se il percorso esce (o non è risolvibile).
     *
     * Serve perché {@code Path.resolve(other)} restituisce {@code other} tal quale quando è
     * assoluto: senza questo controllo un attachment_path come "C:\...\x.exe" o
     * "\\server\share\x.exe" ignorerebbe completamente attDir, e i chiamanti aprono
     * (Desktop.open → su Windows ESEGUE .exe/.bat/.lnk) o cancellano il file risultante.
     * Il valore non arriva solo dalla UI: sta in transactions.attachment_path, cioè nel DB
     * condiviso via OneDrive e scrivibile anche dall'app Android, e può essere semplicemente
     * sbagliato (vecchia cartella allegati, share di rete non più esistente, sync parziale).
     *
     * normalize() risolve i ".." PRIMA del confronto, così anche "..\..\Windows\x.exe" viene
     * respinto; toAbsolutePath() sulla base evita che un attDir relativo falsi startsWith().
     */
    private static java.nio.file.Path resolveAttachment(String attDir, String relPath) {
        if (attDir == null || attDir.isBlank() || relPath == null || relPath.isBlank()) return null;
        try {
            java.nio.file.Path base = java.nio.file.Path.of(attDir).toAbsolutePath().normalize();
            java.nio.file.Path file = base.resolve(relPath).normalize();
            if (!file.startsWith(base)) {
                System.err.println("[Bridge] allegato fuori dalla cartella consentita: '" + relPath
                        + "' risolto in '" + file + "' (base: '" + base + "')");
                return null;
            }
            return file;
        } catch (java.nio.file.InvalidPathException e) {
            System.err.println("[Bridge] percorso allegato non valido: '" + relPath + "' — " + e.getMessage());
            return null;
        }
    }

    /**
     * Entry point delle chiamate dal JavaScript (window.cefQuery).
     * Decodifica il payload Base64 → JSON, estrae method+params e instrada:
     * i metodi che aprono dialog nativi o fanno I/O di rete partono su virtual thread
     * (per non bloccare il thread UI di JCEF), tutti gli altri vanno a {@link #dispatch}.
     * Eseguito sul thread UI di JCEF, serializzato → la connessione DB resta single-thread.
     */
    @Override
    public boolean onQuery(CefBrowser browser, CefFrame frame, long queryId,
                           String request, boolean persistent, CefQueryCallback callback) {
        // method fuori dal try: serve nel catch per loggare QUALE operazione è fallita
        String method = "?";
        try {
            String json = new String(Base64.getDecoder().decode(request), StandardCharsets.UTF_8);
            JsonObject req = JsonParser.parseString(json).getAsJsonObject();
            method = req.get("method").getAsString();
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
                        System.err.println("[Bridge] fetchOnlinePrice(" + isin + ") fallito: " + e);
                        callback.failure(500, e.getMessage() != null ? e.getMessage() : "Errore fetch prezzo");
                    }
                });
                return true;
            }

            long t0 = _perfEnabled ? System.nanoTime() : 0;
            Object result = dispatch(method, params, browser);
            if (_perfEnabled) {
                long javaMs = (System.nanoTime() - t0) / 1_000_000;
                synchronized (_perfBuf) {
                    if (_perfBuf.size() >= PERF_MAX) _perfBuf.pollFirst();
                    _perfBuf.addLast(java.util.Map.of(
                            "method", method,
                            "javaMs", javaMs,
                            "ts",     System.currentTimeMillis()));
                }
            }
            succeed(callback, result);

        } catch (Exception e) {
            // Ogni operazione JS→Java passa da qui: è l'unico punto centrale dove loggare
            // gli errori. Senza questo, le eccezioni (SQLException, NPE, parse, ecc.) andavano
            // solo al frontend e sparivano da app.log. Per gli NPE getMessage() è null, quindi
            // in quel caso mandiamo al JS il nome della classe invece del muto "Errore interno".
            System.err.println("[Bridge] '" + method + "' fallito: " + e);
            e.printStackTrace();
            callback.failure(500, e.getMessage() != null ? e.getMessage()
                                                          : e.getClass().getSimpleName());
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
            } catch (Exception e) {
                System.err.println("[Bridge] chooseDbFile fallito: " + e);
                succeed(callback, Map.of("path", "", "cancelled", true));
            }
        });
    }

    private void handleChooseBackupDirAsync(CefQueryCallback callback) {
        Thread.ofVirtual().start(() -> {
            try {
                String cur = db.getAppSetting("backup.dir", "");
                String path = winPickFolder("Seleziona cartella backup", cur);
                if (path == null) succeed(callback, Map.of("path", "", "cancelled", true));
                else              succeed(callback, Map.of("path", path, "cancelled", false));
            } catch (Exception e) {
                System.err.println("[Bridge] chooseBackupDir fallito: " + e);
                succeed(callback, Map.of("path", "", "cancelled", true));
            }
        });
    }

    private void handleChooseAttachmentsDirAsync(CefQueryCallback callback) {
        Thread.ofVirtual().start(() -> {
            try {
                String cur = db.getAppSetting("attachments.dir", "");
                String path = winPickFolder("Seleziona cartella allegati", cur);
                if (path == null) succeed(callback, Map.of("path", "", "cancelled", true));
                else              succeed(callback, Map.of("path", path, "cancelled", false));
            } catch (Exception e) {
                System.err.println("[Bridge] chooseAttachmentsDir fallito: " + e);
                succeed(callback, Map.of("path", "", "cancelled", true));
            }
        });
    }

    private void handleChooseAttachmentFileAsync(CefQueryCallback callback) {
        Thread.ofVirtual().start(() -> {
            try {
                String path = nativePickFile("Seleziona file allegato", java.awt.FileDialog.LOAD, null, null);
                if (path == null) succeed(callback, Map.of("path", "", "cancelled", true));
                else              succeed(callback, Map.of("path", path, "cancelled", false));
            } catch (Exception e) {
                System.err.println("[Bridge] chooseAttachmentFile fallito: " + e);
                succeed(callback, Map.of("path", "", "cancelled", true));
            }
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
        // stderr FUSO su stdout invece di lasciato scollegato: il buffer della pipe di stderr è
        // di pochi KB e nessuno lo leggeva, quindi un powershell che scriveva un errore lungo
        // (assembly WinForms mancante, criteri di esecuzione) si bloccava sulla scrittura e non
        // usciva mai → waitFor() eterno sul virtual thread + processo zombie a ogni tentativo.
        // Fondendo i due flussi, l'unica readAllBytes() sotto svuota entrambi.
        pb.redirectErrorStream(true);
        Process proc = pb.start();
        String out;
        try (java.io.InputStream in = proc.getInputStream()) {
            out = new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } finally {
            // waitFor() sempre, anche se la lettura è fallita, per non lasciare il processo
            // in giro; destroy() se l'utente non chiude mai il dialogo entro il limite.
            if (!proc.waitFor(5, java.util.concurrent.TimeUnit.MINUTES)) {
                proc.destroyForcibly();
                throw new java.io.IOException("winPickFolder: timeout, dialogo cartella non chiuso");
            }
        }
        // Con i flussi fusi l'output può contenere righe di errore prima del path: il
        // FolderBrowserDialog emette il path come ultima riga non vuota.
        String path = out.lines().map(String::trim).filter(s -> !s.isEmpty())
                         .reduce((a, b) -> b).orElse("");
        // Un exit code non-zero significa che il path non è affidabile: meglio "annullato".
        if (proc.exitValue() != 0) {
            System.err.println("[Bridge] winPickFolder: powershell exit=" + proc.exitValue()
                    + " out=" + path);
            return null;
        }
        return path.isBlank() ? null : path;
    }

    /**
     * Router centrale JS↔Java: a ogni "method" associa la chiamata corrispondente
     * (per lo più una query su {@link Database}) e restituisce l'oggetto da serializzare
     * in JSON per il JS. Organizzato per dominio funzionale (Finestra, Conti, Categorie,
     * Transazioni, Budget, ecc.). Un metodo sconosciuto solleva eccezione → failure al JS.
     */
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
            // Segnalato dal JS dopo il primo render della dashboard + un rAF.
            // A questo punto il compositor GPU ha sicuramente disegnato un frame,
            // quindi possiamo nascondere la splash senza rischiare flash neri.
            case "uiReady" -> {
                Runnable cb = uiReadyCallback;
                if (cb != null) { cb.run(); uiReadyCallback = null; }
                yield Map.of("ok", true);
            }
            case "getDbPath"    -> Map.of("path", db.getDbPath());
            case "getWindowPos" -> Map.of("x", window.getX(), "y", window.getY());
            case "setWindowPos" -> {
                // Difensivo: durante il drag il JS può inviare x/y null (getWindowPos async non
                // ancora tornata → NaN → JsonNull). In quel caso ignora il frame invece di lanciare.
                if (!hasNum(p, "x") || !hasNum(p, "y")) yield Map.of("ok", false, "skipped", true);
                int x = p.get("x").getAsInt();
                int y = p.get("y").getAsInt();
                SwingUtilities.invokeLater(() -> window.setLocation(x, y));
                yield Map.of("ok", true);
            }
            case "getWindowBounds" -> Map.of(
                "x", window.getX(), "y", window.getY(),
                "w", window.getWidth(), "h", window.getHeight());
            case "setWindowBounds" -> {
                // Difensivo come setWindowPos: durante il resize il JS può inviare valori null.
                if (!hasNum(p, "x") || !hasNum(p, "y") || !hasNum(p, "w") || !hasNum(p, "h"))
                    yield Map.of("ok", false, "skipped", true);
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
            case "getAccountUsage"  -> db.getAccountUsage(p.get("id").getAsInt());
            case "updateAccountOrder" -> {
                db.updateAccountOrder(p.get("items").getAsJsonArray());
                yield Map.of("ok", true);
            }

            // ─── Categorie ─────────────────────────────────────────────────
            case "getCategories"          -> db.getCategories();
            case "addCategory"            -> db.addCategory(p);
            case "updateCategory"         -> db.updateCategory(p.get("id").getAsInt(), p);
            case "deleteCategory"         -> db.deleteCategory(p.get("id").getAsInt());
            case "getExpenseNatureReport" -> db.getExpenseNatureReport(p);
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
            case "getTopDescriptions"   -> db.getTopDescriptions(p);
            case "updateTransactionReconciled" -> db.updateTransactionReconciled(
                    p.get("id").getAsInt(), p.get("reconciled").getAsBoolean());
            case "getAccountSummary"  -> db.getAccountSummary(p.get("account_id").getAsInt());

            // ─── Budget ────────────────────────────────────────────────────
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
            case "importPending"          -> db.importPending();
            case "readPendingQueue"       -> db.readPendingRaw();
            case "advanceScheduled"  -> {
                Integer txId = p.has("transaction_id") && !p.get("transaction_id").isJsonNull()
                        ? p.get("transaction_id").getAsInt() : null;
                db.advanceScheduled(p.get("id").getAsInt(), p.get("date").getAsString(), txId);
                yield Map.of("ok", true);
            }
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
            case "getForecastDetail"    -> db.getForecastDetail(p.get("id").getAsInt());
            case "getForecastExpenseSplit"   -> db.getForecastExpenseSplit(p.get("months").getAsInt());
            case "getForecastEngine" -> db.getForecastEngine(
                p.get("hist_months").getAsInt(), p.get("horizon_months").getAsInt(),
                p.has("include_portfolio") && p.get("include_portfolio").getAsBoolean());

            // ─── Portafoglio ───────────────────────────────────────────────
            case "getPortfolio"             -> db.getPortfolio();
            case "getPortfolioTransactions" -> db.getPortfolioTransactions(p.get("portfolio_id").getAsInt());
            case "buyStock"                 -> db.buyStock(p);
            case "sellStock"                -> db.sellStock(p);
            case "updateStockPrice"         -> db.updateStockPrice(p.get("id").getAsInt(), p.get("price").getAsDouble());
            case "updatePortfolioItem"      -> db.updatePortfolioItem(p);
            case "registerCoupon"           -> db.registerCoupon(p);
            case "registerDividend"         -> db.registerDividend(p);
            case "registerPortfolioExpense" -> db.registerPortfolioExpense(p);
            case "deletePortfolioItem"          -> db.deletePortfolioItem(p.get("id").getAsInt());
            case "deletePortfolioTransaction"   -> db.deletePortfolioTransaction(p.get("id").getAsInt());

            // ─── Tag ───────────────────────────────────────────────────────────────
            case "getTags"    -> db.getTags();
            case "addTag"     -> db.addTag(p);
            case "updateTag"  -> db.updateTag(p.get("id").getAsInt(), p);
            case "deleteTag"  -> db.deleteTag(p.get("id").getAsInt());

            // ─── Note ──────────────────────────────────────────────────────────────
            case "getNotes"      -> db.getNotes();
            case "getNote"       -> db.getNote(p.get("id").getAsInt());
            case "saveNote"      -> db.saveNote(p);
            case "deleteNote"    -> db.deleteNote(p.get("id").getAsInt());
            case "setNotePinned" -> db.setNotePinned(p.get("id").getAsInt(), p.get("pinned").getAsBoolean());

            // ─── Range Preset ──────────────────────────────────────────────────────
            case "getRangePresets"    -> db.getRangePresets();
            case "addRangePreset"     -> db.addRangePreset(p);
            case "updateRangePreset"  -> db.updateRangePreset(p.get("id").getAsInt(), p);
            case "deleteRangePreset"  -> db.deleteRangePreset(p.get("id").getAsInt());

            // ─── Statistiche ───────────────────────────────────────────────
            case "getDashboardStats"    -> db.getDashboardStats(p.get("year").getAsInt());
            case "getStatsByDateRange"  -> db.getStatsByDateRange(p.get("date_from").getAsString(), p.get("date_to").getAsString());
            case "getMonthlyChartData"  -> db.getMonthlyChartData(p.get("year").getAsInt());
            case "getCategoryChartData" -> db.getCategoryChartData(
                    p.get("year").getAsInt(), p.get("type").getAsString());

            // ─── Impostazioni ──────────────────────────────────────────────
            case "getSettings" -> {
                java.util.Map<String, String> all = new java.util.LinkedHashMap<>(settings.getAll());
                all.putAll(db.getAllAppSettings());
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
                String dbp = settings.get(Settings.DB_PATH);
                if (dbp != null) all.put("_app_log_path",
                        java.nio.file.Path.of(dbp).getParent().resolve("app.log").toString());
                all.put("_java_version", System.getProperty("java.version")
                        + " (" + System.getProperty("java.vm.name") + ")");
                all.put("_dep_jcef",   mavenVersion("me.friwi",              "jcefmaven"));
                all.put("_dep_sqlite", mavenVersion("org.xerial",             "sqlite-jdbc"));
                all.put("_dep_gson",   mavenVersion("com.google.code.gson",  "gson"));
                all.put("_dep_slf4j",  mavenVersion("org.slf4j",             "slf4j-nop"));
                all.put("_autostart_supported", java.awt.SystemTray.isSupported() ? "1" : "0");
                yield all;
            }

            case "setSetting" -> {
                String key   = p.get("key").getAsString();
                String value = p.get("value").getAsString();
                if (Settings.BOOTSTRAP_KEYS.contains(key)) settings.set(key, value);
                else db.setAppSetting(key, value);
                if (Settings.AUTOSTART_ENABLED.equals(key)) {
                    final boolean on = "1".equals(value);
                    // enable()/disable() costruiscono e registrano componenti Swing (JPopupMenu,
                    // JDialog, JLabel/JPanel) e toccano la SystemTray: vanno sull'EDT come tutte
                    // le altre operazioni su window in questo switch. Qui NON siamo sull'EDT —
                    // dispatch gira sul thread UI di JCEF, e sui virtual thread del WebServer
                    // quando la richiesta arriva dal browser del telefono.
                    SwingUtilities.invokeLater(() -> {
                        if (on) TrayManager.enable(window);
                        else    TrayManager.disable();
                    });
                    // La chiave di registro invece NON è codice Swing: resta fuori dall'EDT,
                    // così lo spawn di reg.exe non blocca il thread grafico.
                    if (on) TrayManager.registerAutostart();
                    else    TrayManager.unregisterAutostart();
                }
                yield Map.of("ok", true);
            }

            case "openSettingsFile" -> {
                java.awt.Desktop.getDesktop().open(settings.getPath().toFile());
                yield Map.of("ok", true);
            }

            // ─── Allegati ─────────────────────────────────────────────────────
            case "attachFile" -> {
                String attDir = db.getAppSetting("attachments.dir", "");
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
                    // Stesso controllo di openAttachment/removeAttachment: oldRel arriva dal DB
                    // e con un path assoluto cancellerebbe un file fuori dalla cartella allegati.
                    java.nio.file.Path old = resolveAttachment(attDir, oldRel);
                    if (old != null) {
                        try { java.nio.file.Files.deleteIfExists(old); }
                        catch (Exception e) {
                            System.err.println("[Bridge] rimozione vecchio allegato fallita: " + old + " — " + e);
                        }
                    }
                }
                db.setAttachment(txId, destName);
                yield Map.of("path", destName);
            }

            case "openAttachment" -> {
                String attDir = db.getAppSetting("attachments.dir", "");
                String relPath = p.get("path").getAsString();
                if (attDir.isBlank())
                    yield Map.of("error", "Cartella allegati non configurata");
                java.nio.file.Path file = resolveAttachment(attDir, relPath);
                if (file == null)
                    yield Map.of("error", "Percorso allegato non valido: '" + relPath
                            + "'. Deve essere un file dentro la cartella allegati.");
                if (!java.nio.file.Files.isRegularFile(file))
                    yield Map.of("error", "File non trovato: " + file);
                java.awt.Desktop.getDesktop().open(file.toFile());
                yield Map.of("ok", true);
            }

            case "setAttachmentPath" -> {
                // Riassocia un path esistente a una transazione (usato dall'undo delete:
                // il file è ancora su disco, basta riattaccare il riferimento)
                int txId = p.get("tx_id").getAsInt();
                String relPath = p.has("path") && !p.get("path").isJsonNull()
                                 ? p.get("path").getAsString() : null;
                if (relPath != null && !relPath.isBlank()) {
                    db.setAttachment(txId, relPath);
                }
                yield Map.of("ok", true);
            }

            case "removeAttachment" -> {
                int txId      = p.get("tx_id").getAsInt();
                String relPath = p.has("path") && !p.get("path").isJsonNull()
                                 ? p.get("path").getAsString() : null;
                if (relPath != null && !relPath.isBlank()) {
                    String attDir = db.getAppSetting("attachments.dir", "");
                    java.nio.file.Path file = resolveAttachment(attDir, relPath);
                    // file == null: percorso fuori dalla cartella allegati (già loggato).
                    // Non cancelliamo nulla, ma stacchiamo comunque il riferimento dalla
                    // transazione: è esattamente il caso in cui il path è sbagliato.
                    if (file != null) {
                        try { java.nio.file.Files.deleteIfExists(file); }
                        catch (Exception e) {
                            System.err.println("[Bridge] rimozione allegato fallita: " + file + " — " + e);
                        }
                    }
                }
                db.removeAttachment(txId);
                yield Map.of("ok", true);
            }

            case "openAppLog" -> {
                String dbPath = settings.get(Settings.DB_PATH);
                if (dbPath != null) {
                    java.nio.file.Path appLog = java.nio.file.Path.of(dbPath).getParent().resolve("app.log");
                    if (java.nio.file.Files.exists(appLog))
                        java.awt.Desktop.getDesktop().open(appLog.toFile());
                }
                yield Map.of("ok", true);
            }

            // Conta gli errori in app.log (per il badge "ci sono errori nel log").
            case "getAppLogErrors" -> appLogErrors();

            case "clearAppLog" -> {
                String dbPath = settings.get(Settings.DB_PATH);
                if (dbPath != null) {
                    java.nio.file.Path appLog = java.nio.file.Path.of(dbPath).getParent().resolve("app.log");
                    // Tronca invece di cancellare: il file è tenuto aperto da System.err
                    try (var _ = java.nio.channels.FileChannel.open(appLog,
                            java.nio.file.StandardOpenOption.WRITE,
                            java.nio.file.StandardOpenOption.TRUNCATE_EXISTING)) {}
                }
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

            case "openDataDir" -> {
                java.awt.Desktop.getDesktop().open(dataDir.toFile());
                yield Map.of("ok", true);
            }

            // Salva un report HTML in dataDir/reports/<filename> e lo apre col browser predefinito
            // (es. Edge), così l'utente può tenerlo su un secondo schermo come riferimento.
            // Il nome file è fisso per report → riscrittura in-place: basta ricaricare la scheda Edge.
            case "exportHtmlReport" -> {
                String html     = p.get("html").getAsString();
                String filename = p.get("filename").getAsString();
                // Sanitizza il nome file: niente separatori di percorso, solo basename
                filename = filename.replaceAll("[\\\\/:*?\"<>|]", "_");
                if (!filename.toLowerCase().endsWith(".html")) filename += ".html";
                java.nio.file.Path reportsDir = dataDir.resolve("reports");
                java.nio.file.Files.createDirectories(reportsDir);
                java.nio.file.Path file = reportsDir.resolve(filename);
                java.nio.file.Files.writeString(file, html, StandardCharsets.UTF_8);
                java.awt.Desktop.getDesktop().open(file.toFile());
                yield Map.of("ok", true, "path", file.toAbsolutePath().toString());
            }

            // Ordine voluto: PRIMA si verifica la cartella, POI si riconnette, e solo se la
            // riconnessione è riuscita si persiste db.path. Prima il path veniva salvato per
            // primo: se poi reconnect falliva (cartella OneDrive non montata, chiavetta staccata)
            // restava scritto in settings.properties un percorso inutilizzabile, e al riavvio
            // l'app apriva un DB vuoto lì invece del database vero.
            case "reloadDb" -> {
                String path = p.get("path").getAsString();
                java.nio.file.Path parent = java.nio.file.Path.of(path).getParent();
                if (parent == null || !java.nio.file.Files.isDirectory(parent))
                    throw new IllegalArgumentException(
                            "Cartella del database non raggiungibile: " + parent
                            + " — impostazione non modificata.");
                db.reconnect(path);
                settings.set(Settings.DB_PATH, path);
                yield Map.of("ok", true);
            }

            // Popola il DB corrente con dati di esempio (wizard di primo avvio)
            case "seedExampleData" -> db.seedExampleData();

            case "doBackup" -> {
                String bDir = db.getAppSetting("backup.dir", "");
                int bMax = Integer.parseInt(db.getAppSetting("backup.max", "10"));
                String dest = db.backup(bDir, bMax);
                yield Map.of("ok", true, "path", dest);
            }

            case "listBackups" -> {
                String bDir = db.getAppSetting("backup.dir", "");
                yield Map.of("backups", db.listBackups(bDir));
            }

            case "restoreBackup" -> {
                String bDir = db.getAppSetting("backup.dir", "");
                yield db.restoreBackup(p.get("path").getAsString(), bDir);
            }

            // ─── Manutenzione DB ───────────────────────────────────────────────────
            case "dbGetInfo"        -> db.dbGetInfo();
            case "dbVacuum"         -> db.dbVacuum();
            case "dbIntegrityCheck" -> db.dbIntegrityCheck();
            case "dbReindex"        -> db.dbReindex();
            case "dbAnalyze"        -> db.dbAnalyze();

            // ─── Svecchiamento (raggruppamento transazioni vecchie) ────────────────
            case "archivePreview" -> {
                java.util.List<Integer> catIds = new java.util.ArrayList<>();
                for (var el : p.get("categoryIds").getAsJsonArray()) catIds.add(el.getAsInt());
                yield db.archivePreview(p.get("from").getAsString(), p.get("to").getAsString(), catIds);
            }
            case "archiveTransactions" -> {
                java.util.List<Integer> ids = new java.util.ArrayList<>();
                for (var el : p.get("ids").getAsJsonArray()) ids.add(el.getAsInt());
                // Backup automatico pre-operazione (rispetta cartella/numero max configurati)
                String bDir = db.getAppSetting("backup.dir", "");
                String backupPath = null;
                try {
                    int bMax = Integer.parseInt(db.getAppSetting("backup.max", "10"));
                    backupPath = db.backup(bDir, bMax);
                } catch (Exception backupErr) {
                    // Se il backup fallisce non procediamo: l'operazione è irreversibile
                    yield Map.of("error", "Backup pre-operazione fallito: " + backupErr.getMessage());
                }
                Map<String, Object> res = db.archiveTransactions(ids);
                yield Map.of("created", res.get("created"), "deleted", res.get("deleted"), "backup", backupPath);
            }

            // ─── Analytics ─────────────────────────────────────────────────────────
            case "getCategoryMonthTable" -> db.getCategoryMonthTable(
                p.has("months") ? p.get("months").getAsInt() : 12);
            case "getMonthlyBalance"          -> db.getMonthlyBalance(
                p.has("months") ? p.get("months").getAsInt() : 12);
            case "getCategoryComparison"      -> db.getCategoryComparison(
                p.get("from_a").getAsString(), p.get("to_a").getAsString(),
                p.get("from_b").getAsString(), p.get("to_b").getAsString(),
                p.has("group_by") ? p.get("group_by").getAsString() : "parent");
            case "getAccountBalanceHistory"   -> db.getAccountBalanceHistory(
                p.has("months") ? p.get("months").getAsInt() : 24);
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

            // ─── Prezzi online (HTTP server: blocca il virtual thread, JCEF: async in onQuery) ──
            case "fetchOnlinePrice" -> doFetchOnlinePrice(p.get("isin").getAsString());

            // ─── Performance log ───────────────────────────────────────────────
            case "setPerfEnabled" -> {
                _perfEnabled = p.get("enabled").getAsBoolean();
                yield java.util.Map.of("ok", true);
            }
            case "getPerfLog" -> {
                synchronized (_perfBuf) { yield new java.util.ArrayList<>(_perfBuf); }
            }
            case "clearPerfLog" -> {
                synchronized (_perfBuf) { _perfBuf.clear(); }
                yield java.util.Map.of("ok", true);
            }

            // ─── DB remoto (WebServer) ─────────────────────────────────────
            case "dbStatus" -> {
                // manuallyClosed distingue la chiusura esplicita dell'utente (richiede "Apri")
                // dalla chiusura idle temporanea (si riapre da sola alla prossima query).
                yield java.util.Map.of("open", db.isOpen(), "manuallyClosed", db.isManuallyClosed());
            }
            case "dbOpen"   -> { db.reopen(); yield java.util.Map.of("ok", true); }
            case "dbClose"  -> { db.closeManual(); yield java.util.Map.of("ok", true); }

            default -> throw new Exception("Metodo sconosciuto: " + method);
        };
    }

    // ── Fetch prezzo online da Borsa Italiana ────────────────────────────────

    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.NORMAL)
            .connectTimeout(Duration.ofSeconds(15))
            .build();
    private static final String HTTP_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
    private static final Pattern PAT_SCHEDA1 = Pattern.compile(
            "href=\"(https://www\\.borsaitaliana\\.it/borsa/search/scheda\\.html\\?[^\"]+)\"");
    private static final Pattern PAT_SCHEDA2 = Pattern.compile(
            "href=\"(/borsa/[^\"]+/scheda/[^\"]*-([A-Z0-9]+)\\.html)\"");
    private static final Pattern PAT_MIC     = Pattern.compile("[?&]mic=([A-Z0-9]+)");
    // Numero in formato italiano: migliaia con '.' opzionali, decimali con ',' (es. 1.234,567)
    private static final String NUM_IT = "(?:0|[1-9][0-9]{0,4})(?:[.][0-9]{3})*[,][0-9]{1,4}";
    // Priorità 0: prezzo "Ultimo contratto" nel markup attuale (azioni e bond) —
    // <span class="… -formatPrice"><strong>11,99</strong></span>. Applicato all'HTML grezzo.
    private static final Pattern PAT_PRICE_FORMAT = Pattern.compile(
            "(?is)-formatPrice[^>]*>\\s*<strong>\\s*(" + NUM_IT + ")");
    // Priorità 1: "Prezzo di riferimento 101,581" — valore ufficiale di chiusura (layout legacy)
    private static final Pattern PAT_PRICE_REF = Pattern.compile(
            "(?i)prezzo di riferimento[^0-9]{0,40}(" + NUM_IT + ")");
    // Priorità 2: qualsiasi voce "prezzo/price" — fallback generico obbligazioni (layout legacy)
    private static final Pattern PAT_PRICE   = Pattern.compile(
            "(?i)(?:prezzo|price)[^0-9]{0,80}(" + NUM_IT + ")");
    // Priorità 3: numero seguito da variazione percentuale — azioni layout legacy (es. "0,1376 -1,01%")
    private static final Pattern PAT_PRICE_PCT = Pattern.compile(
            "(" + NUM_IT + ")\\s{0,5}[+-][0-9]");

    /**
     * Recupera il prezzo di un titolo facendo scraping di Borsa Italiana:
     * cerca il ticker/ISIN, segue il link alla scheda, e ne estrae il prezzo
     * (formato italiano con virgola) provando in ordine 3 pattern di prezzo.
     * @return mappa con ticker, price (double) e mic (codice mercato)
     */
    private Map<String, Object> doFetchOnlinePrice(String ticker) throws Exception {
        // Step 1: cerca su Borsa Italiana search engine
        String q = URLEncoder.encode(ticker, StandardCharsets.UTF_8);
        String searchHtml = httpGet("https://www.borsaitaliana.it/borsa/searchengine/search.html?q=" + q + "&Cerca=Search&lang=it");

        // Step 2: estrai scheda URL (formato 1: URL assoluto; formato 2: path relativo)
        String schedaUrl = null;
        String mic = "";

        Matcher m1 = PAT_SCHEDA1.matcher(searchHtml);
        if (m1.find()) {
            schedaUrl = m1.group(1);
            Matcher micM = PAT_MIC.matcher(schedaUrl);
            if (micM.find()) mic = micM.group(1);
        }

        if (schedaUrl == null) {
            Matcher m2 = PAT_SCHEDA2.matcher(searchHtml);
            if (m2.find()) {
                schedaUrl = "https://www.borsaitaliana.it" + m2.group(1);
                mic = m2.group(2);
            }
        }

        if (schedaUrl == null)
            throw new Exception("Titolo non trovato su Borsa Italiana: " + ticker);

        // Step 3: carica la scheda e legge il prezzo in formato italiano (virgola decimale).
        // Priorità 0 sull'HTML grezzo (classe -formatPrice del layout attuale, azioni e bond);
        // se assente si ricade sui pattern legacy applicati al testo senza tag.
        String html = httpGet(schedaUrl);
        Matcher priceMat = PAT_PRICE_FORMAT.matcher(html);
        if (!priceMat.find()) {
            String text = html.replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ");
            priceMat = PAT_PRICE_REF.matcher(text);
            if (!priceMat.find()) {
                priceMat = PAT_PRICE.matcher(text);
                if (!priceMat.find()) {
                    priceMat = PAT_PRICE_PCT.matcher(text);
                    if (!priceMat.find())
                        throw new Exception("Prezzo non trovato su Borsa Italiana per: " + ticker);
                }
            }
        }

        double price = Double.parseDouble(priceMat.group(1).replace(".", "").replace(",", "."));
        return Map.of("ticker", ticker, "price", price, "mic", mic);
    }

    private static String httpGet(String url) throws Exception {
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("User-Agent", HTTP_UA)
                .header("Accept-Language", "it-IT,it;q=0.9")
                .GET().build();
        return HTTP_CLIENT.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)).body();
    }

    /** Legge la versione di una dipendenza dal suo pom.properties (mostrata in Impostazioni). */
    private static String mavenVersion(String groupId, String artifactId) {
        try (var is = Bridge.class.getResourceAsStream(
                "/META-INF/maven/" + groupId + "/" + artifactId + "/pom.properties")) {
            if (is == null) return "?";
            var props = new java.util.Properties();
            props.load(is);
            return props.getProperty("version", "?");
        } catch (Exception e) { return "?"; }
    }

    /**
     * Conta gli "eventi di errore" presenti in app.log (per il badge in UI/Impostazioni).
     * app.log raccoglie stderr/stdout (vedi App.java): contiene sia righe informative
     * (── Avvio, [STARTUP], [SLOW QUERY], "WebServer avviato"…) sia errori. Contiamo solo
     * questi ultimi, e una sola volta per evento: le righe di continuazione di uno stacktrace
     * ("\tat ...", "Caused by", "... N more") NON incrementano il conteggio, così uno
     * stacktrace da 30 righe conta come 1 errore. Ritorna { count, lastError, lastTime }.
     */
    private Map<String, Object> appLogErrors() {
        String dbPath = settings.get(Settings.DB_PATH);
        if (dbPath == null || dbPath.isBlank()) return Map.of("count", 0, "lastError", "", "lastTime", "");
        java.nio.file.Path appLog = java.nio.file.Path.of(dbPath).getParent().resolve("app.log");
        if (!java.nio.file.Files.exists(appLog)) return Map.of("count", 0, "lastError", "", "lastTime", "");

        int count = 0;
        String lastError = "";
        String lastTime  = "";
        try {
            java.util.List<String> lines = java.nio.file.Files.readAllLines(
                    appLog, StandardCharsets.UTF_8);
            String currentSession = "";  // ultimo header "── Avvio yyyy-MM-dd HH:mm:ss ──" visto
            for (String raw : lines) {
                String l = raw.strip();
                if (l.isEmpty()) continue;
                // Header di sessione: memorizza il timestamp per associarlo agli errori successivi
                if (l.startsWith("── Avvio")) {
                    currentSession = l.replace("── Avvio", "").replace("──", "").strip();
                    continue;
                }
                // Righe informative note (System.out): non sono errori
                if (l.startsWith("[STARTUP]") || l.startsWith("[SLOW QUERY")
                        || l.startsWith("WebServer avviato") || l.startsWith("WebServer disabilitato")) {
                    continue;
                }
                // Righe di continuazione di uno stacktrace: fanno parte dell'errore già contato
                if (raw.startsWith("\t") || l.startsWith("at ")
                        || l.startsWith("Caused by") || l.startsWith("... ") || l.startsWith("Suppressed:")) {
                    continue;
                }
                // Riga-eccezione "nuda" (es. "java.lang.NullPointerException", "org.sqlite...: ..."):
                // è l'INTESTAZIONE di uno stacktrace. Con C1 compare sempre subito dopo il println
                // dell'errore (println + printStackTrace), quindi è lo stesso evento già contato:
                // non la contiamo di nuovo, altrimenti ogni errore Bridge conterebbe doppio.
                boolean bareExc = l.matches("^(java|javax|org|com|sun)\\..*(Exception|Error).*")
                               || l.matches("^\\w+(Exception|Error)(:.*)?$");
                if (bareExc) continue;
                // Marcatori di un nuovo evento di errore: i prefissi dei nostri catch ([Bridge], Database.)
                // e la convenzione italiana dei messaggi System.err ("Errore...", "...fallito...").
                String low = l.toLowerCase();
                boolean isError = l.startsWith("[Bridge]") || l.startsWith("Database.")
                        || low.contains("fallit") || low.startsWith("errore");
                if (isError) {
                    count++;
                    lastError = l.length() > 200 ? l.substring(0, 200) + "…" : l;
                    lastTime  = currentSession;
                }
            }
        } catch (Exception e) {
            System.err.println("[Bridge] getAppLogErrors: " + e.getMessage());
            return Map.of("count", 0, "lastError", "", "lastTime", "", "readError", true);
        }
        return Map.of("count", count, "lastError", lastError, "lastTime", lastTime);
    }
}
