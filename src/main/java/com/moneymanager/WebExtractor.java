package com.moneymanager;

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
        "js/vendor/chart.min.js"
    };

    public static String extract(Path webDir) throws Exception {
        Files.createDirectories(webDir);

        for (String file : WEB_FILES) {
            Path dest = webDir.resolve(file);
            Files.createDirectories(dest.getParent());

            try (InputStream is = WebExtractor.class.getResourceAsStream("/web/" + file)) {
                if (is != null) {
                    Files.copy(is, dest, StandardCopyOption.REPLACE_EXISTING);
                }
            }
        }

        // Restituisce URL file:// per index.html
        return webDir.resolve("index.html").toUri().toURL().toExternalForm();
    }
}
