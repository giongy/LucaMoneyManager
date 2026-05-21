package com.moneymanager;

import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.nio.file.*;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.List;
import java.util.jar.JarEntry;
import java.util.jar.JarFile;
import java.util.stream.Stream;

/**
 * Estrae le risorse web (HTML/CSS/JS) dal JAR nella cartella dati utente.
 * Questo permette al WebView JCEF di caricarle via file://.
 * La lista dei file è ricavata scansionando /web/ nel classpath (JAR o directory):
 * basta aggiungere file sotto src/main/resources/web/ e vengono estratti.
 */
public class WebExtractor {

    public static String extract(Path webDir) throws Exception {
        Files.createDirectories(webDir);
        Path marker = webDir.resolve(".version");

        if (!needsExtraction(webDir, marker)) {
            return webDir.resolve("index.html").toUri().toURL().toExternalForm();
        }

        for (String file : listWebResources()) {
            Path dest = webDir.resolve(file);
            Files.createDirectories(dest.getParent());
            try (InputStream is = WebExtractor.class.getResourceAsStream("/web/" + file)) {
                if (is != null) Files.copy(is, dest, StandardCopyOption.REPLACE_EXISTING);
            }
        }

        writeMarker(marker);
        return webDir.resolve("index.html").toUri().toURL().toExternalForm();
    }

    /** Scansiona /web/ nel classpath e ritorna i path relativi (es. "js/app.js"). */
    private static List<String> listWebResources() throws Exception {
        List<String> result = new ArrayList<>();
        URL loc = WebExtractor.class.getProtectionDomain().getCodeSource().getLocation();
        Path src = Path.of(loc.toURI());

        if (Files.isRegularFile(src)) {
            // Runtime da JAR
            try (JarFile jar = new JarFile(src.toFile())) {
                Enumeration<JarEntry> entries = jar.entries();
                while (entries.hasMoreElements()) {
                    JarEntry e = entries.nextElement();
                    String name = e.getName();
                    if (!e.isDirectory() && name.startsWith("web/")) {
                        result.add(name.substring("web/".length()));
                    }
                }
            }
        } else if (Files.isDirectory(src)) {
            // Runtime da IDE (target/classes)
            Path webRoot = src.resolve("web");
            if (Files.isDirectory(webRoot)) {
                try (Stream<Path> stream = Files.walk(webRoot)) {
                    stream.filter(Files::isRegularFile)
                          .forEach(p -> result.add(
                              webRoot.relativize(p).toString().replace('\\', '/')));
                }
            }
        }
        return result;
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
