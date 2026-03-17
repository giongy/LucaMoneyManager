package com.moneymanager;

import me.friwi.jcefmaven.CefAppBuilder;
import me.friwi.jcefmaven.MavenCefAppHandlerAdapter;
import org.cef.CefApp;

import javax.swing.*;
import java.nio.file.Files;
import java.nio.file.Path;

public class App {

    public static void main(String[] args) throws Exception {
        // Cartella dati utente
        Path dataDir = Path.of(System.getProperty("user.home"),
                "AppData", "Roaming", "LucaMoneyManager");
        Files.createDirectories(dataDir);

        // Impostazioni (settings.properties) — nella cartella di lavoro (root progetto o cartella del JAR)
        Settings settings = new Settings(Path.of(System.getProperty("user.dir")).resolve("settings.properties"));

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
                MainWindow window = new MainWindow(cefApp, db, settings, htmlUrl);
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
