package com.moneymanager;

import java.io.PrintStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

import javax.swing.JOptionPane;
import javax.swing.SwingUtilities;

import org.cef.CefApp;

import me.friwi.jcefmaven.CefAppBuilder;
import me.friwi.jcefmaven.MavenCefAppHandlerAdapter;

/**
 * Entry point dell'applicazione desktop.
 * Orchestra l'avvio: cartella dati utente, lock istanza singola, impostazioni,
 * apertura DB SQLite, individuazione risorse web, splash, inizializzazione JCEF
 * (download Chromium al primo avvio) e creazione della finestra principale.
 */
public class App {

    /** Istante di ingresso in main() (nanoTime) — usato per il log [STARTUP]. */
    static long startupT0 = 0;

    /** Path del JAR (produzione) o di target/classes (IDE). */
    private static Path codeSourcePath() throws Exception {
        return Path.of(App.class.getProtectionDomain().getCodeSource().getLocation().toURI());
    }

    /**
     * Trova la cartella web/ con i file HTML/CSS/JS.
     * Produzione (jpackage): web/ accanto al .exe (sibling della dir app/ che contiene il JAR).
     * IDE: src/main/resources/web/ rispetto alla project root.
     */
    private static Path findWebDir() throws Exception {
        Path codeSrc = codeSourcePath();

        // Produzione: JAR in <deploy>/app/moneymanager.jar → cerca <deploy>/web/
        if (Files.isRegularFile(codeSrc)) {
            Path web = codeSrc.getParent().resolveSibling("web");
            if (Files.exists(web.resolve("index.html"))) return web.toAbsolutePath().normalize();
            // Fallback: web/ allo stesso livello del JAR
            Path web2 = codeSrc.resolveSibling("web");
            if (Files.exists(web2.resolve("index.html"))) return web2.toAbsolutePath().normalize();
        }

        // IDE: codeSrc è target/classes → usa target/classes/web (file filtrati da Maven,
        // es. ${project.version} risolto). Fallback su src/main/resources/web/ se non
        // ancora compilato.
        Path webClasses = codeSrc.resolve("web");
        if (Files.exists(webClasses.resolve("index.html"))) return webClasses.toAbsolutePath().normalize();
        Path projectRoot = codeSrc;
        if (projectRoot.endsWith("classes")) projectRoot = projectRoot.getParent().getParent();
        Path web3 = projectRoot.resolve("src/main/resources/web");
        if (Files.exists(web3.resolve("index.html"))) return web3.toAbsolutePath().normalize();

        throw new RuntimeException("Risorse web non trovate. Cerca near: " + codeSrc);
    }

    /**
     * Sequenza di avvio dell'app. Tutta la creazione di UI Swing/JCEF avviene
     * sull'Event Dispatch Thread tramite SwingUtilities.
     */
    /**
     * Guardia di avvio: delega a {@link #run} e cattura QUALSIASI errore non gestito.
     * In produzione (jpackage, niente console) un'eccezione prima che app.log sia agganciato
     * andrebbe persa sul vero stderr e l'app morirebbe in silenzio. Qui invece la scriviamo
     * comunque su un crash.log nella cartella dati (che esiste sempre) e la mostriamo a video.
     */
    public static void main(String[] args) {
        try {
            run(args);
        } catch (Throwable t) {
            reportFatal(t);
            System.exit(1);
        }
    }

    /** Scrive l'errore fatale su crash.log nella dataDir (best-effort) e lo mostra in un dialog. */
    private static void reportFatal(Throwable t) {
        // 1) Prova a loggare dove System.err è già stato reindirizzato (app.log)
        try { t.printStackTrace(); } catch (Throwable ignored) {}
        // 2) crash.log dedicato nella cartella dati: sopravvive anche se il redirect non era ancora attivo
        try {
            Path dataDir = Path.of(System.getProperty("user.home"),
                    "AppData", "Roaming", "LucaMoneyManager");
            Files.createDirectories(dataDir);
            try (PrintStream ps = new PrintStream(new java.io.FileOutputStream(
                    dataDir.resolve("crash.log").toFile(), true),
                    true, java.nio.charset.StandardCharsets.UTF_8)) {
                ps.println("\n── CRASH " + LocalDateTime.now()
                        .format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")) + " ──");
                t.printStackTrace(ps);
            }
        } catch (Throwable ignored) { /* niente da fare se nemmeno questo riesce */ }
        // 3) Avvisa l'utente (in produzione non c'è console: senza dialog non saprebbe nulla)
        try {
            JOptionPane.showMessageDialog(null,
                    "Errore fatale all'avvio:\n" + t + "\n\nDettagli in crash.log (cartella dati).",
                    "LucaMoneyManager — Errore", JOptionPane.ERROR_MESSAGE);
        } catch (Throwable ignored) {}
    }

    /** Reindirizza System.err/System.out in append sul file di log dato, scrivendo l'header
     *  di sessione "── Avvio ... ──". Chiamato una sola volta, dopo aver risolto il path del DB. */
    private static void redirectLog(Path logFile) throws Exception {
        Files.createDirectories(logFile.getParent());
        PrintStream logStream = new PrintStream(
                new java.io.FileOutputStream(logFile.toFile(), true),
                true, java.nio.charset.StandardCharsets.UTF_8);
        logStream.println("\n── Avvio " + LocalDateTime.now()
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")) + " ──");
        System.setErr(logStream);
        System.setOut(logStream);
    }

    /** Sequenza di avvio vera e propria (vedi {@link #main} per la guardia anti-crash). */
    private static void run(String[] args) throws Exception {
        // ── Profiling avvio: 4 timestamp per capire dove vanno i 3-5s a freddo.
        // Stampati in app.log come "[STARTUP]". Togliere/lasciare a piacere.
        long t0 = System.nanoTime();
        startupT0 = t0;

        // Cartella dati utente
        Path dataDir = Path.of(System.getProperty("user.home"),
                "AppData", "Roaming", "LucaMoneyManager");
        Files.createDirectories(dataDir);

        // NB: il redirect di stderr/stdout su app.log avviene più sotto, DOPO aver risolto il
        // path del DB, così esiste un solo app.log (accanto al DB) e non resta un file "monco"
        // in dataDir quando il DB è altrove (es. OneDrive). Gli errori di questa fase pre-redirect
        // sono comunque coperti: main() li cattura e li scrive in crash.log (vedi reportFatal).

        // Istanza singola: se un'altra è già in esecuzione, le manda SHOW ed esce
        if (!SingleInstance.tryAcquire(TrayManager::bringToFront)) {
            System.exit(0);
        }

        // Impostazioni (settings.properties) — nella stessa cartella del JAR (o user.dir in IDE)
        Path settingsDir;
        try {
            Path p = codeSourcePath();
            settingsDir = p.toString().endsWith(".jar") ? p.getParent()
                                                        : Path.of(System.getProperty("user.dir"));
        } catch (Exception e) {
            settingsDir = Path.of(System.getProperty("user.dir"));
        }
        Settings settings = new Settings(settingsDir.resolve("settings.properties"));

        // Percorso DB: dal file impostazioni, altrimenti default
        String dbPath = settings.get(Settings.DB_PATH);
        if (dbPath == null || dbPath.isBlank()) {
            dbPath = dataDir.resolve("data.db").toString();
            settings.set(Settings.DB_PATH, dbPath);
        } else {
            Path dbParent = Path.of(dbPath).getParent();
            if (dbParent == null || !Files.exists(dbParent)) {
                dbPath = dataDir.resolve("data.db").toString();
                settings.set(Settings.DB_PATH, dbPath);
            }
        }

        // Redirect stderr/stdout → app.log, ora che il path del DB è noto: un solo file, accanto
        // al DB (comportamento storico). Da qui in poi tutto (DB, risorse web, UI) è tracciato.
        redirectLog(Path.of(dbPath).getParent().resolve("app.log"));

        // Rileva percorsi java.exe e JAR per la registrazione autostart
        try {
            ProcessHandle.current().info().command().ifPresent(cmd -> TrayManager.javaExePath = cmd);
            Path jarP = codeSourcePath();
            if (jarP.toString().endsWith(".jar")) TrayManager.jarPath = jarP.toString();
        } catch (Exception e) {
            System.err.println("Autostart path detection fallita: " + e.getMessage());
        }

        // Database SQLite
        Database db = new Database(dbPath);

        // Rete di sicurezza: chiude il DB all'uscita. La chiusura ordinata avviene già in
        // MainWindow.windowClosing (che copre sia la X sia "Esci" dal tray), ma questo hook
        // copre i percorsi che non ci passano — errore fatale, System.exit da altrove,
        // terminazione richiesta dal sistema. Senza, il lock sul file resterebbe fino alla
        // morte del processo e con una transazione aperta SQLite lascerebbe un <db>-journal
        // accanto al database, che OneDrive sincronizzerebbe insieme al .db.
        // close() è idempotente e synchronized, quindi la doppia chiamata è innocua.
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            try { db.close(); } catch (Exception ignored) { /* uscita: nulla da salvare */ }
        }, "db-shutdown"));

        // Risorse web (HTML/CSS/JS): cartella web/ accanto all'eseguibile (produzione)
        // o src/main/resources/web/ (modalità IDE)
        Path webDir   = findWebDir();
        String indexUrl = webDir.resolve("index.html").toUri().toString();

        // Splash Swing immediato (visibile prima ancora che JCEF si avvii)
        SplashWindow loading = new SplashWindow();
        SwingUtilities.invokeLater(() -> loading.setVisible(true));

        // Inizializza JCEF (scarica ~200MB di Chromium al primo avvio)
        CefAppBuilder builder = new CefAppBuilder();
        builder.setInstallDir(dataDir.resolve("jcef").toFile());
        // GPU acceleration: di default JCEF è prudente, ma su Windows recente con
        // windowed_rendering (non OSR) Chromium gestisce bene il compositing GPU.
        // Notevole impatto sul tema glassy (backdrop-filter è GPU-bound).
        // Se compaiono artefatti/finestra nera, ripristinare "--disable-gpu".
        builder.addJcefArgs(
            "--ignore-gpu-blocklist",
            "--enable-gpu-rasterization",
            "--enable-zero-copy");
        builder.getCefSettings().windowless_rendering_enabled = false;
        builder.getCefSettings().root_cache_path = dataDir.resolve("jcef_cache").toAbsolutePath().toString();
        builder.getCefSettings().log_severity = org.cef.CefSettings.LogSeverity.LOGSEVERITY_DISABLE;
        // Sfondo Chromium = sfondo app (#0d1117): elimina il flash bianco
        // tra creazione del browser e primo paint del CSS.
        org.cef.CefSettings cs = builder.getCefSettings();
        cs.background_color = cs.new ColorType(255, 0x0d, 0x11, 0x17);
        builder.setAppHandler(new MavenCefAppHandlerAdapter() {});
        builder.setProgressHandler((state, percent) -> {
            String msg = switch (state) {
                case LOCATING -> "Ricerca JCEF...";
                case DOWNLOADING -> String.format("Download Chromium: %.0f%%", percent * 100);
                case EXTRACTING -> "Estrazione...";
                case INSTALL -> "Installazione...";
                default -> "Avvio...";
            };
            loading.update(msg, percent);
        });

        long tBeforeBuild = System.nanoTime();
        CefApp cefApp = builder.build();
        long tAfterBuild = System.nanoTime();

        System.out.println(String.format(
            "[STARTUP] pre-JCEF (JVM+init): %d ms | builder.build() (JCEF init): %d ms",
            (tBeforeBuild - t0) / 1_000_000, (tAfterBuild - tBeforeBuild) / 1_000_000));

        loading.update("Caricamento interfaccia...", 0);

        final SplashWindow ld = loading;
        SwingUtilities.invokeAndWait(() -> {
            try {
                MainWindow window = new MainWindow(cefApp, db, settings, indexUrl, dataDir, webDir);
                window.showWhenReady(ld);
                // Registra l'azione "porta in primo piano" (include reopen DB + refresh JS)
                TrayManager.bringToFrontAction = window::bringToFront;
                // Registra l'azione "ricarica" del menu tray (reopen DB + reload browser)
                TrayManager.reloadAction = window::reload;
                // Modifica esterna del file DB rilevata alla riapertura (sync OneDrive da
                // telefono/altro PC mentre l'app era idle): ricarica i dati stale nel frontend.
                db.setExternalChangeCallback(window::notifyExternalDbChange);
                // Stato/controllo connessione DB dal menu tray (indicatore + chiudi/riapri)
                TrayManager.dbStatusSupplier = db::isOpen;
                TrayManager.dbManuallyClosedSupplier = db::isManuallyClosed;
                TrayManager.closeDbAction = () -> {
                    try { db.closeManual(); } catch (Exception ex) {
                        System.err.println("Errore chiusura DB dal tray: " + ex.getMessage());
                    }
                };
                TrayManager.openDbAction = () -> {
                    try { db.reopen(); } catch (Exception ex) {
                        System.err.println("Errore riapertura DB dal tray: " + ex.getMessage());
                    }
                };
                // Attiva tray se l'autostart era già abilitato da una sessione precedente
                if ("1".equals(settings.get(Settings.AUTOSTART_ENABLED))) {
                    TrayManager.enable(window.getFrame());
                }
            } catch (Exception e) {
                ld.setVisible(false);
                ld.dispose();
                e.printStackTrace();
                JOptionPane.showMessageDialog(null,
                        "Errore avvio: " + e.getMessage(), "Errore", JOptionPane.ERROR_MESSAGE);
                System.exit(1);
            }
        });
    }
}
