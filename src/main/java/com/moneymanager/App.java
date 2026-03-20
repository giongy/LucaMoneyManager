package com.moneymanager;

import java.nio.file.Files;
import java.nio.file.Path;

import javax.swing.JOptionPane;
import javax.swing.SwingUtilities;

import org.cef.CefApp;

import me.friwi.jcefmaven.CefAppBuilder;
import me.friwi.jcefmaven.MavenCefAppHandlerAdapter;

public class App {

    public static void main(String[] args) throws Exception {
        // Cartella dati utente
        Path dataDir = Path.of(System.getProperty("user.home"),
                "AppData", "Roaming", "LucaMoneyManager");
        Files.createDirectories(dataDir);

        // Impostazioni (settings.properties) — nella stessa cartella del JAR (o user.dir in IDE)
        Path settingsDir;
        try {
            java.net.URL loc = App.class.getProtectionDomain().getCodeSource().getLocation();
            Path p = Path.of(loc.toURI());
            // Se stiamo girando da un JAR usa la sua cartella, altrimenti (IDE) usa user.dir
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
        }

        // Database SQLite
        Database db = new Database(dbPath);

        // Estrai risorse web (HTML/CSS/JS) nella cartella dati
        String htmlUrl = WebExtractor.extract(dataDir.resolve("web"));

        // Dialogo di caricamento (visibile durante download JCEF al primo avvio)
        LoadingDialog loading = new LoadingDialog();
        loading.setVisible(true);

        // Inizializza JCEF (scarica ~200MB di Chromium al primo avvio)
        CefAppBuilder builder = new CefAppBuilder();
        builder.setInstallDir(dataDir.resolve("jcef").toFile());
        builder.addJcefArgs("--disable-gpu"); // più stabile su alcuni sistemi
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

        CefApp cefApp = builder.build(); // blocca finché JCEF non è pronto

        loading.setVisible(false);
        loading.dispose();

        // Crea e mostra la finestra principale
        SwingUtilities.invokeAndWait(() -> {
            try {
                MainWindow window = new MainWindow(cefApp, db, settings, htmlUrl, dataDir);
                window.show();
            } catch (Exception e) {
                e.printStackTrace();
                JOptionPane.showMessageDialog(null,
                        "Errore avvio: " + e.getMessage(), "Errore", JOptionPane.ERROR_MESSAGE);
                System.exit(1);
            }
        });
    }
}
 