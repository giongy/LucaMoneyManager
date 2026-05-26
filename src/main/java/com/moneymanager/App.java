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

public class App {

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

    public static void main(String[] args) throws Exception {
        // Cartella dati utente
        Path dataDir = Path.of(System.getProperty("user.home"),
                "AppData", "Roaming", "LucaMoneyManager");
        Files.createDirectories(dataDir);

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

        // Log eccezioni Java → stessa cartella del DB (app.log)
        Path appLog = Path.of(dbPath).getParent().resolve("app.log");
        Files.createDirectories(appLog.getParent());
        PrintStream logStream = new PrintStream(
                new java.io.FileOutputStream(appLog.toFile(), true),
                true, java.nio.charset.StandardCharsets.UTF_8);
        logStream.println("\n── Avvio " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")) + " ──");
        System.setErr(logStream);
        System.setOut(logStream);

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

        CefApp cefApp = builder.build();

        loading.update("Caricamento interfaccia...", 0);

        final SplashWindow ld = loading;
        SwingUtilities.invokeAndWait(() -> {
            try {
                MainWindow window = new MainWindow(cefApp, db, settings, indexUrl, dataDir, webDir);
                window.showWhenReady(ld);
                // Registra l'azione "porta in primo piano" (include reopen DB + refresh JS)
                TrayManager.bringToFrontAction = window::bringToFront;
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
