package com.moneymanager;

import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.nio.file.*;

/**
 * Estrae le risorse web (HTML/CSS/JS) dal JAR nella cartella dati utente.
 * Questo permette al WebView JCEF di caricarle via file://.
 */
public class WebExtractor {

    private static final String[] WEB_FILES = {
        "index.html",
        "css/style.css",
        "js/app.js",
        "js/vendor/chart.min.js",
        "js/vendor/hammer.min.js",
        "js/vendor/chartjs-plugin-zoom.min.js",
        "js/vendor/lucide.min.js"
    };

    public static String extract(Path webDir) throws Exception {
        Files.createDirectories(webDir);
        Path marker = webDir.resolve(".version");

        if (!needsExtraction(webDir, marker)) {
            return webDir.resolve("index.html").toUri().toURL().toExternalForm();
        }

        for (String file : WEB_FILES) {
            Path dest = webDir.resolve(file);
            Files.createDirectories(dest.getParent());
            try (InputStream is = WebExtractor.class.getResourceAsStream("/web/" + file)) {
                if (is != null) Files.copy(is, dest, StandardCopyOption.REPLACE_EXISTING);
            }
        }

        writeMarker(marker);
        return webDir.resolve("index.html").toUri().toURL().toExternalForm();
    }

    /** Controlla se il JAR è cambiato dall'ultima estrazione comparando size+mtime. */
    private static boolean needsExtraction(Path webDir, Path marker) {
        try {
            if (!Files.exists(webDir.resolve("index.html")) || !Files.exists(marker)) return true;
            URL loc = WebExtractor.class.getProtectionDomain().getCodeSource().getLocation();
            if (!"file".equals(loc.getProtocol())) return true; // IDE: estrai sempre
            Path jar = Path.of(loc.toURI());
            if (!Files.isRegularFile(jar)) return true; // IDE: estrai sempre
            String sig = Files.getLastModifiedTime(jar).toMillis() + ":" + Files.size(jar);
            return !sig.equals(Files.readString(marker).trim());
        } catch (Exception e) { return true; }
    }

    private static void writeMarker(Path marker) throws IOException {
        try {
            URL loc = WebExtractor.class.getProtectionDomain().getCodeSource().getLocation();
            if (!"file".equals(loc.getProtocol())) return;
            Path jar = Path.of(loc.toURI());
            if (!Files.isRegularFile(jar)) return;
            String sig = Files.getLastModifiedTime(jar).toMillis() + ":" + Files.size(jar);
            Files.writeString(marker, sig);
        } catch (Exception ignored) {}
    }
}
