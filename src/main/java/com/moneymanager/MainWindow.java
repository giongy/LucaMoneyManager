package com.moneymanager;

import org.cef.CefApp;
import org.cef.CefClient;
import org.cef.browser.CefBrowser;
import org.cef.browser.CefFrame;
import org.cef.handler.CefLoadHandlerAdapter;

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
    private final CefClient client;

    public MainWindow(CefApp cefApp, Database db, Settings settings, String htmlUrl, java.nio.file.Path dataDir) {
        this.cefApp = cefApp;
        this.db = db;
        this.settings = settings;

        frame = new JFrame("LucaMoneyManager");
        frame.setIconImages(IconFactory.getAppIcons());
        frame.setUndecorated(true);
        frame.setSize(1280, 820);
        frame.setMinimumSize(new Dimension(900, 600));
        frame.setLocationRelativeTo(null);
        frame.setDefaultCloseOperation(JFrame.DO_NOTHING_ON_CLOSE);
        frame.getContentPane().setBackground(new Color(13, 17, 23));

        client = cefApp.createClient();

        var routerConfig = new org.cef.browser.CefMessageRouter.CefMessageRouterConfig();
        routerConfig.jsQueryFunction = "cefQuery";
        routerConfig.jsCancelFunction = "cefQueryCancel";
        var router = org.cef.browser.CefMessageRouter.create(routerConfig);

        Bridge bridge = new Bridge(db, settings, frame, dataDir);
        router.addHandler(bridge, true);
        client.addMessageRouter(router);

        // HTTP server sulla LAN — avviato in background solo se abilitato
        if ("0".equals(settings.get(Settings.HTTP_ENABLED, "1"))) {
            System.out.println("WebServer disabilitato dalle impostazioni.");
        } else {
            int httpPort;
            try { httpPort = Integer.parseInt(settings.get(Settings.HTTP_PORT, "7890")); }
            catch (NumberFormatException e) { httpPort = 7890; }
            final int finalPort = httpPort;
            Thread.ofVirtual().start(() -> {
                try {
                    WebServer.start(dataDir.resolve("web"), bridge, finalPort);
                    System.out.println("WebServer avviato su http://0.0.0.0:" + finalPort);
                } catch (Exception e) {
                    System.err.println("WebServer non avviato: " + e.getMessage());
                }
            });
        }

        browser = client.createBrowser(htmlUrl, false, false);
        Component browserUI = browser.getUIComponent();

        frame.setLayout(new BorderLayout());
        frame.add(browserUI, BorderLayout.CENTER);

        frame.addWindowListener(new WindowAdapter() {
            @Override
            public void windowClosing(WindowEvent e) {
                // Se il tray è attivo, chiudi il DB (sblocca per OneDrive) e nascondi
                if (TrayManager.isActive()) {
                    try { db.close(); } catch (Exception ex) {
                        System.err.println("Errore chiusura DB al tray: " + ex.getMessage());
                    }
                    frame.setVisible(false);
                    return;
                }
                // Backup automatico all'uscita se abilitato e ci sono modifiche
                if ("1".equals(settings.get(Settings.BACKUP_ENABLED)) && db.hasModifications()) {
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

    /** Restituisce il JFrame principale (usato da TrayManager). */
    public JFrame getFrame() { return frame; }

    /** Mostra la finestra solo dopo che la pagina HTML è completamente caricata,
     *  poi nasconde il loading dialog. Evita il flash di schermata nera all'avvio. */
    public void showWhenReady(SplashWindow loading) {
        GraphicsEnvironment ge = GraphicsEnvironment.getLocalGraphicsEnvironment();
        Rectangle screen = ge.getMaximumWindowBounds();
        int w = (int)(screen.width  * 0.70);
        int h = (int)(screen.height * 0.70);
        frame.setSize(w, h);
        frame.setLocation(screen.x + (screen.width - w) / 2, screen.y + (screen.height - h) / 2);
        frame.setVisible(true);

        client.addLoadHandler(new CefLoadHandlerAdapter() {
            private int loadCount = 0;
            @Override
            public void onLoadEnd(CefBrowser b, CefFrame f, int httpStatusCode) {
                if (!f.isMain()) return;
                loadCount++;
                if (loadCount == 1) {
                    SwingUtilities.invokeLater(() -> {
                        loading.setVisible(false);
                        loading.dispose();
                        frame.toFront();
                    });
                } else if (loadCount == 2) {
                    SwingUtilities.invokeLater(() -> {
                        GraphicsEnvironment ge2 = GraphicsEnvironment.getLocalGraphicsEnvironment();
                        frame.setMaximizedBounds(ge2.getMaximumWindowBounds());
                        frame.setExtendedState(JFrame.MAXIMIZED_BOTH);
                    });
                }
            }
        });
    }

    /** Riapre il DB, porta la finestra in primo piano e aggiorna il frontend.
     *  Usato dal tray dopo che il DB era stato chiuso per permettere la sync OneDrive. */
    public void bringToFront() {
        try { db.reopen(); } catch (Exception e) {
            System.err.println("Errore riapertura DB dal tray: " + e.getMessage());
        }
        frame.setVisible(true);
        if ((frame.getExtendedState() & JFrame.ICONIFIED) != 0)
            frame.setExtendedState(frame.getExtendedState() & ~JFrame.ICONIFIED);
        GraphicsEnvironment ge = GraphicsEnvironment.getLocalGraphicsEnvironment();
        frame.setMaximizedBounds(ge.getMaximumWindowBounds());
        frame.setExtendedState(JFrame.MAXIMIZED_BOTH);
        frame.toFront();
        frame.requestFocus();
        browser.executeJavaScript("if(typeof onTrayRestore==='function') onTrayRestore();", "", 0);
    }

    public void show() {
        GraphicsEnvironment ge = GraphicsEnvironment.getLocalGraphicsEnvironment();
        frame.setMaximizedBounds(ge.getMaximumWindowBounds());
        frame.setExtendedState(JFrame.MAXIMIZED_BOTH);
        frame.setVisible(true);
    }
}
