package com.moneymanager;

import org.cef.CefApp;
import org.cef.CefClient;
import org.cef.browser.CefBrowser;

import javax.swing.*;
import java.awt.*;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;

public class MainWindow {

    private final JFrame frame;
    private final CefBrowser browser;
    private final CefApp cefApp;
    private final Database db;
    private final Settings settings;

    public MainWindow(CefApp cefApp, Database db, Settings settings, String htmlUrl, java.nio.file.Path dataDir) {
        this.cefApp = cefApp;
        this.db = db;
        this.settings = settings;

        // Finestra senza decorazioni (titlebar personalizzata in HTML)
        frame = new JFrame("LucaMoneyManager");
        frame.setIconImages(IconFactory.getAppIcons());
        frame.setUndecorated(true);
        frame.setSize(1280, 820);
        frame.setMinimumSize(new Dimension(900, 600));
        frame.setLocationRelativeTo(null);
        frame.setDefaultCloseOperation(JFrame.DO_NOTHING_ON_CLOSE);
        frame.getContentPane().setBackground(new Color(13, 17, 23));

        // Client JCEF
        CefClient client = cefApp.createClient();

        // Message router (canale JS <-> Java)
        var routerConfig = new org.cef.browser.CefMessageRouter.CefMessageRouterConfig();
        routerConfig.jsQueryFunction = "cefQuery";
        routerConfig.jsCancelFunction = "cefQueryCancel";
        var router = org.cef.browser.CefMessageRouter.create(routerConfig);

        Bridge bridge = new Bridge(db, settings, frame, dataDir);
        router.addHandler(bridge, true);
        client.addMessageRouter(router);

        // Crea browser Chromium
        browser = client.createBrowser(htmlUrl, false, false);
        Component browserUI = browser.getUIComponent();

        frame.setLayout(new BorderLayout());
        frame.add(browserUI, BorderLayout.CENTER);

        // Chiusura sicura
        frame.addWindowListener(new WindowAdapter() {
            @Override
            public void windowClosing(WindowEvent e) {
                // Backup automatico all'uscita se abilitato
                if ("1".equals(settings.get(Settings.BACKUP_ENABLED))) {
                    String bDir = settings.get(Settings.BACKUP_DIR);
                    int bMax;
                    try { bMax = Integer.parseInt(settings.get(Settings.BACKUP_MAX, "10")); }
                    catch (NumberFormatException ex) { bMax = 10; }
                    try { db.backup(bDir, bMax); }
                    catch (Exception ex) { System.err.println("Backup fallito: " + ex.getMessage()); }
                }
                CefApp.getInstance().dispose();
                frame.dispose();
                System.exit(0);
            }
        });
    }

    public void show() {
        GraphicsEnvironment ge = GraphicsEnvironment.getLocalGraphicsEnvironment();
        frame.setMaximizedBounds(ge.getMaximumWindowBounds());
        frame.setExtendedState(JFrame.MAXIMIZED_BOTH);
        frame.setVisible(true);
    }
}
