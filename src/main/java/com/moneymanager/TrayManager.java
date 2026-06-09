package com.moneymanager;

import javax.swing.*;
import java.awt.*;

/** Gestisce l'icona nella system tray e la registrazione all'avvio di Windows. */
public class TrayManager {

    private static TrayIcon trayIcon;
    private static boolean  trayActive = false;

    // Azione eseguita quando si richiede di portare la finestra in primo piano.
    // Impostata da App.java: include riapertura DB + show + refresh frontend.
    static Runnable bringToFrontAction;

    // Percorsi calcolati all'avvio (usati per la registrazione autostart)
    static String javaExePath;
    static String jarPath;

    /** Attiva il tray: aggiunge l'icona e abilita "chiudi = nascondi al tray".
     *  Ritorna false se SystemTray non è supportato. */
    public static boolean enable(JFrame frame) {
        if (!SystemTray.isSupported()) return false;
        if (trayActive) return true;

        PopupMenu menu = new PopupMenu();
        MenuItem openItem = new MenuItem("Apri LucaMoneyManager");
        MenuItem exitItem = new MenuItem("Esci");

        openItem.addActionListener(e -> bringToFront());
        exitItem.addActionListener(e -> doExit(frame));

        menu.add(openItem);
        menu.addSeparator();
        menu.add(exitItem);

        trayIcon = new TrayIcon(IconFactory.create(16), "LucaMoneyManager", menu);
        trayIcon.setImageAutoSize(true);
        trayIcon.addActionListener(e -> bringToFront());

        try {
            SystemTray.getSystemTray().add(trayIcon);
            trayActive = true;
            return true;
        } catch (AWTException e) {
            System.err.println("TrayManager: impossibile aggiungere icona tray: " + e.getMessage());
            return false;
        }
    }

    /** Disattiva il tray: rimuove l'icona. */
    public static void disable() {
        if (trayIcon != null) {
            SystemTray.getSystemTray().remove(trayIcon);
            trayIcon = null;
        }
        trayActive = false;
    }

    /** true se il tray è attivo (chiudi finestra = nascondi invece di uscire). */
    public static boolean isActive() { return trayActive; }

    /** Porta la finestra in primo piano: delega a bringToFrontAction (impostata da App.java).
     *  L'azione include riapertura DB, show finestra e refresh del frontend. */
    public static void bringToFront() {
        if (bringToFrontAction != null) SwingUtilities.invokeLater(bringToFrontAction);
    }

    /** Registra l'app nell'avvio automatico di Windows (HKCU Run). */
    public static boolean registerAutostart() {
        if (javaExePath == null || jarPath == null) {
            System.err.println("TrayManager: path java/jar non disponibili, autostart non registrato.");
            return false;
        }
        String cmd = "\"" + javaExePath + "\" -jar \"" + jarPath + "\"";
        return runReg("add",
            "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
            "/v", "LucaMoneyManager", "/t", "REG_SZ", "/d", cmd, "/f");
    }

    /** Rimuove la registrazione dall'avvio automatico di Windows. */
    public static boolean unregisterAutostart() {
        return runReg("delete",
            "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
            "/v", "LucaMoneyManager", "/f");
    }

    /** Esegue il comando Windows `reg` con gli argomenti dati; true se exit code 0. */
    private static boolean runReg(String... args) {
        String[] cmd = new String[args.length + 1];
        cmd[0] = "reg";
        System.arraycopy(args, 0, cmd, 1, args.length);
        try {
            return new ProcessBuilder(cmd)
                .redirectErrorStream(true)
                .start()
                .waitFor() == 0;
        } catch (Exception e) {
            System.err.println("TrayManager reg: " + e.getMessage());
            return false;
        }
    }

    /** Uscita completa dall'app dal menu tray: rimuove il tray, rilascia il lock e termina. */
    private static void doExit(JFrame frame) {
        disable();
        SingleInstance.release();
        frame.dispose();
        System.exit(0);
    }
}
