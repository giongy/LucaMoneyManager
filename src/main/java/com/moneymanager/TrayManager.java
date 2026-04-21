package com.moneymanager;

import javax.swing.*;
import java.awt.*;

/** Gestisce l'icona nella system tray e la registrazione all'avvio di Windows. */
public class TrayManager {

    private static TrayIcon trayIcon;
    private static JFrame   managedFrame;
    private static boolean  trayActive = false;

    // Percorsi calcolati all'avvio (usati per la registrazione autostart)
    static String javaExePath;
    static String jarPath;

    /** Attiva il tray: aggiunge l'icona e abilita "chiudi = nascondi al tray".
     *  Ritorna false se SystemTray non è supportato o non è disponibile. */
    public static boolean enable(JFrame frame) {
        if (!SystemTray.isSupported()) return false;
        managedFrame = frame;

        if (trayActive) return true; // già attivo

        PopupMenu menu = new PopupMenu();
        MenuItem openItem = new MenuItem("Apri LucaMoneyManager");
        MenuItem exitItem = new MenuItem("Esci");

        openItem.addActionListener(e -> SwingUtilities.invokeLater(TrayManager::bringToFront));
        exitItem.addActionListener(e -> doExit(frame));

        menu.add(openItem);
        menu.addSeparator();
        menu.add(exitItem);

        trayIcon = new TrayIcon(IconFactory.create(16), "LucaMoneyManager", menu);
        trayIcon.setImageAutoSize(true);
        // doppio clic sull'icona → apri finestra
        trayIcon.addActionListener(e -> SwingUtilities.invokeLater(TrayManager::bringToFront));

        try {
            SystemTray.getSystemTray().add(trayIcon);
            trayActive = true;
            return true;
        } catch (AWTException e) {
            System.err.println("TrayManager: impossibile aggiungere icona tray: " + e.getMessage());
            return false;
        }
    }

    /** Disattiva il tray: rimuove l'icona. La chiusura della finestra tornerà a uscire. */
    public static void disable() {
        if (trayIcon != null) {
            SystemTray.getSystemTray().remove(trayIcon);
            trayIcon = null;
        }
        trayActive = false;
    }

    /** true se il tray è attivo (chiudi finestra = nascondi invece di uscire). */
    public static boolean isActive() { return trayActive; }

    /** Porta la finestra in primo piano dalla modalità nascosta/minimizzata. */
    public static void bringToFront() {
        if (managedFrame == null) return;
        managedFrame.setVisible(true);
        if ((managedFrame.getExtendedState() & JFrame.ICONIFIED) != 0)
            managedFrame.setExtendedState(managedFrame.getExtendedState() & ~JFrame.ICONIFIED);
        GraphicsEnvironment ge = GraphicsEnvironment.getLocalGraphicsEnvironment();
        managedFrame.setMaximizedBounds(ge.getMaximumWindowBounds());
        managedFrame.setExtendedState(JFrame.MAXIMIZED_BOTH);
        managedFrame.toFront();
        managedFrame.requestFocus();
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

    private static void doExit(JFrame frame) {
        // Esegui backup automatico se abilitato (stessa logica di windowClosing)
        disable();
        SingleInstance.release();
        frame.dispose();
        System.exit(0);
    }
}
