package com.moneymanager;

import java.io.*;
import java.nio.charset.StandardCharsets;
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
    public static final String DB_PATH         = "db.path";
    public static final String BACKUP_ENABLED  = "backup.enabled";
    public static final String BACKUP_DIR      = "backup.dir";
    public static final String BACKUP_MAX      = "backup.max";
    public static final String ATTACHMENTS_DIR = "attachments.dir";
    public static final String HTTP_PORT        = "http.port";
    public static final String HTTP_ENABLED     = "http.enabled";
    public static final String AUTOSTART_ENABLED = "autostart.enabled";

    private static final Map<String, String> DEFAULTS = Map.ofEntries(
        Map.entry(DB_PATH,           ""),
        Map.entry(BACKUP_ENABLED,    "0"),
        Map.entry(BACKUP_DIR,        ""),
        Map.entry(BACKUP_MAX,        "10"),
        Map.entry(ATTACHMENTS_DIR,   ""),
        Map.entry(HTTP_PORT,         "7890"),
        Map.entry(HTTP_ENABLED,      "1"),
        Map.entry(AUTOSTART_ENABLED, "0")
    );

    // ──────────────────────────────────────────────────────────────────────────

    private static final String KEY_CUSTOM_THEMES = "appearance.custom_themes";

    private final Properties props = new Properties();
    private final Path settingsFile;
    private final Path customThemesFile;

    public Settings(Path settingsFile) {
        this.settingsFile = settingsFile;
        this.customThemesFile = settingsFile.resolveSibling("custom_themes.json");
        load();
        migrateCustomThemes();
    }

    /** Restituisce il valore della chiave, o il default se non presente. */
    public String get(String key) {
        if (KEY_CUSTOM_THEMES.equals(key)) return readCustomThemes();
        return props.getProperty(key, DEFAULTS.getOrDefault(key, ""));
    }

    /** Restituisce il valore della chiave, o il fallback fornito. */
    public String get(String key, String fallback) {
        if (KEY_CUSTOM_THEMES.equals(key)) { String v = readCustomThemes(); return v.isEmpty() ? fallback : v; }
        return props.getProperty(key, fallback);
    }

    /** Imposta una chiave e salva immediatamente su disco. */
    public void set(String key, String value) {
        if (KEY_CUSTOM_THEMES.equals(key)) { writeCustomThemes(value); return; }
        props.setProperty(key, value);
        save();
    }

    /** Percorso assoluto del file usato. */
    public Path getPath() { return settingsFile; }

    /** Percorso assoluto del file JSON dei temi personalizzati. */
    public Path getCustomThemesPath() { return customThemesFile; }

    /** Restituisce tutte le impostazioni come Map (per invio a JS). */
    public Map<String, String> getAll() {
        Map<String, String> all = new LinkedHashMap<>();
        DEFAULTS.forEach((k, v) -> all.put(k, props.getProperty(k, v)));
        props.stringPropertyNames().forEach(k -> all.put(k, props.getProperty(k)));
        all.put(KEY_CUSTOM_THEMES, readCustomThemes());
        return all;
    }

    // ─── Custom themes su file JSON dedicato ──────────────────────────────────

    private String readCustomThemes() {
        if (!Files.exists(customThemesFile)) return "[]";
        try {
            return Files.readString(customThemesFile, StandardCharsets.UTF_8).strip();
        } catch (IOException e) {
            System.err.println("Settings: impossibile leggere " + customThemesFile + ": " + e.getMessage());
            return "[]";
        }
    }

    private void writeCustomThemes(String json) {
        try {
            Files.createDirectories(customThemesFile.getParent());
            Files.writeString(customThemesFile, json, StandardCharsets.UTF_8);
        } catch (IOException e) {
            System.err.println("Settings: impossibile scrivere " + customThemesFile + ": " + e.getMessage());
        }
    }

    /** Migra il valore da settings.properties al file JSON dedicato (una tantum). */
    private void migrateCustomThemes() {
        String old = props.getProperty(KEY_CUSTOM_THEMES);
        if (old == null || old.isBlank()) return;
        if (!Files.exists(customThemesFile)) writeCustomThemes(old);
        props.remove(KEY_CUSTOM_THEMES);
        save();
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
