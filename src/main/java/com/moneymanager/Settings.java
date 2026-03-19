package com.moneymanager;

import java.io.*;
import java.nio.file.*;
import java.util.*;

/**
 * Gestione impostazioni persistenti via file .properties.
 * Estensibile: aggiungere nuove chiavi in DEFAULTS.
 *
 * File salvato in: %APPDATA%\LucaMoneyManager\settings.properties
 */
public class Settings {

    // ─── Chiavi con valori di default ─────────────────────────────────────────
    public static final String DB_PATH       = "db.path";
    public static final String BACKUP_ENABLED = "backup.enabled";
    public static final String BACKUP_DIR     = "backup.dir";
    public static final String BACKUP_MAX     = "backup.max";

    private static final Map<String, String> DEFAULTS = Map.of(
        DB_PATH,        "",
        BACKUP_ENABLED, "0",
        BACKUP_DIR,     "",
        BACKUP_MAX,     "10"
    );

    // ──────────────────────────────────────────────────────────────────────────

    private final Properties props = new Properties();
    private final Path settingsFile;

    public Settings(Path settingsFile) {
        this.settingsFile = settingsFile;
        load();
    }

    /** Restituisce il valore della chiave, o il default se non presente. */
    public String get(String key) {
        return props.getProperty(key, DEFAULTS.getOrDefault(key, ""));
    }

    /** Restituisce il valore della chiave, o il fallback fornito. */
    public String get(String key, String fallback) {
        return props.getProperty(key, fallback);
    }

    /** Imposta una chiave e salva immediatamente su disco. */
    public void set(String key, String value) {
        props.setProperty(key, value);
        save();
    }

    /** Percorso assoluto del file usato. */
    public Path getPath() { return settingsFile; }

    /** Restituisce tutte le impostazioni come Map (per invio a JS). */
    public Map<String, String> getAll() {
        Map<String, String> all = new LinkedHashMap<>();
        // Prima i default, poi i valori effettivi (sovrascrivono i default)
        DEFAULTS.forEach((k, v) -> all.put(k, props.getProperty(k, v)));
        props.stringPropertyNames().forEach(k -> all.put(k, props.getProperty(k)));
        return all;
    }

    // ─── I/O ──────────────────────────────────────────────────────────────────

    private void load() {
        if (!Files.exists(settingsFile)) return;
        try (InputStream is = Files.newInputStream(settingsFile)) {
            props.load(is);
        } catch (IOException e) {
            System.err.println("Settings: impossibile leggere " + settingsFile + ": " + e.getMessage());
        }
    }

    private void save() {
        try {
            Files.createDirectories(settingsFile.getParent());
            try (OutputStream os = Files.newOutputStream(settingsFile)) {
                props.store(os, "LucaMoneyManager - Impostazioni\nhttps://github.com/lucaa/moneymanager");
            }
        } catch (IOException e) {
            System.err.println("Settings: impossibile salvare " + settingsFile + ": " + e.getMessage());
        }
    }
}
