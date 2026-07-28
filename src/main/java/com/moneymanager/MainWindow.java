package com.moneymanager;

import org.cef.CefApp;
import org.cef.CefClient;
import org.cef.browser.CefBrowser;

import javax.swing.*;
import java.awt.*;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;

/**
 * Finestra principale: JFrame Swing senza decorazioni che ospita il browser JCEF.
 * Configura il message router JS↔Java ({@link Bridge}), il menu contestuale, lo zoom,
 * l'eventuale WebServer LAN, il backup automatico alla chiusura e la logica tray.
 */
public class MainWindow {

    private final JFrame frame;
    private final CefBrowser browser;
    private final CefApp cefApp;
    private final Database db;
    private final Settings settings;
    private final CefClient client;
    private final Bridge bridge;
    // true mentre backup + chiusura DB sono in corso su "shutdown-backup" (vedi windowClosing).
    // Riarmata quando si va al tray, dove l'app resta viva e richiudibile.
    private final java.util.concurrent.atomic.AtomicBoolean closing =
            new java.util.concurrent.atomic.AtomicBoolean(false);

    /** Costruisce la finestra, il client JCEF, il bridge e il browser, registrando
     *  i gestori (router, menu contestuale, zoom, chiusura/backup) e avviando il WebServer. */
    public MainWindow(CefApp cefApp, Database db, Settings settings, String htmlUrl,
                      java.nio.file.Path dataDir, java.nio.file.Path webDir) {
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

        bridge = new Bridge(db, settings, frame, dataDir);
        router.addHandler(bridge, true);
        client.addMessageRouter(router);

        // Menu contestuale (tasto destro) personalizzato al posto di quello Chromium di default
        client.addContextMenuHandler(new ContextMenuHandler());

        // Zoom predefinito all'avvio: CEF persiste il livello di zoom per origine nella
        // propria cache e lo ripristina ad ogni avvio. Senza questo, un "Riduci zoom"
        // fatto in passato resterebbe applicato per sempre. Reimpostiamo lo zoom al
        // default (0) una sola volta, al primo caricamento: gli zoom manuali fatti
        // durante la sessione restano (i reload interni non azzerano, grazie al flag).
        client.addLoadHandler(new org.cef.handler.CefLoadHandlerAdapter() {
            private boolean zoomReset = false;
            @Override
            public void onLoadingStateChange(CefBrowser br, boolean isLoading,
                                             boolean canGoBack, boolean canGoForward) {
                if (!isLoading && !zoomReset) {
                    zoomReset = true;
                    br.setZoomLevel(0);
                }
            }
        });

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
                    WebServer.start(webDir, bridge, finalPort);
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
            /**
             * Chiusura della finestra: nasconde subito, poi fa backup e chiusura DB FUORI
             * dall'EDT. Il backup è un Files.copy dell'intero file .db, e girando sull'EDT
             * congelava la finestra ("Non risponde") per tutta la copia — secondi su un DB
             * di qualche decina di MB, minuti se OneDrive deve idratare un file cloud-only,
             * fino al timeout SMB se la cartella di backup è su una share irraggiungibile.
             *
             * Riceve anche l'uscita dal menu tray: TrayManager.doExit() invia qui un
             * WINDOW_CLOSING vero dopo aver chiamato disable(), così il backup automatico
             * non viene più saltato uscendo dal tray.
             */
            @Override
            public void windowClosing(WindowEvent e) {
                // isActive() va letto ORA, sull'EDT: doExit() lo azzera prima di inviare
                // l'evento, quindi qui distingue "nascondi nel tray" da "esci davvero".
                // isActive() va letto ORA, sull'EDT: doExit() lo azzera prima di inviare
                // l'evento, quindi qui distingue "nascondi nel tray" da "esci davvero".
                final boolean toTray = TrayManager.isActive();
                if (toTray) bridge.clearSessionState();
                // In background (tray o uscita): abilita l'auto-release così eventuali query
                // mentre l'app è nascosta non tornano a tenere il lock sul file.
                db.setAutoRelease(true);
                frame.setVisible(false);   // feedback immediato, e idempotente: sempre eseguito

                // Guardia anti-rientranza sul solo lavoro di sfondo: una seconda chiusura
                // (riaperta dal tray e richiusa mentre il backup precedente è ancora in corso)
                // non deve lanciare un secondo backup in parallelo né una seconda System.exit.
                // Il nascondimento della finestra sopra resta invece sempre eseguito.
                if (!closing.compareAndSet(false, true)) return;

                // Thread non-daemon: sull'uscita la JVM deve aspettare che il backup finisca
                // prima di terminare, altrimenti si otterrebbe un .bak troncato.
                new Thread(() -> {
                    try {
                        if ("1".equals(db.getAppSetting("backup.enabled", "0")) && db.hasModifications()) {
                            String bDir = db.getAppSetting("backup.dir", "");
                            int bMax;
                            try { bMax = Integer.parseInt(db.getAppSetting("backup.max", "10")); }
                            catch (NumberFormatException ex) { bMax = 10; }
                            try { db.backup(bDir, bMax); db.resetModifications(); }
                            catch (Exception ex) { System.err.println("Backup fallito: " + ex.getMessage()); }
                        }
                        try { db.close(); } catch (Exception ex) {
                            System.err.println("Errore chiusura DB: " + ex.getMessage());
                        }
                    } finally {
                        // Andando al tray l'app resta viva e richiudibile: riarma la guardia.
                        // Sull'uscita no, il processo sta per morire.
                        if (toTray) closing.set(false);
                    }
                    if (toTray) return;   // resta in esecuzione, riapribile dal tray
                    // Uscita definitiva: JCEF va disposto sull'EDT.
                    SwingUtilities.invokeLater(() -> {
                        CefApp.getInstance().dispose();
                        frame.dispose();
                        System.exit(0);
                    });
                }, "shutdown-backup").start();
            }

            @Override
            public void windowIconified(WindowEvent e) {
                // Finestra minimizzata = l'utente non sta usando l'app: rilascia subito il
                // lock sul file DB così OneDrive può sincronizzare le modifiche del telefono
                // senza generare un file di conflitto. La prossima query riaprirà la
                // connessione in modo trasparente (Database.ensureOpen()). Abilita anche
                // l'auto-release idle: se mentre è minimizzata partono query in background,
                // il lock viene rilasciato di nuovo dopo l'inattività invece di restare preso.
                db.setAutoRelease(true);
                try { db.close(); } catch (Exception ex) {
                    System.err.println("Errore chiusura DB su iconify: " + ex.getMessage());
                }
            }

            @Override
            public void windowDeiconified(WindowEvent e) {
                // Ripristino dalla taskbar (speculare a windowIconified): mentre l'app era
                // minimizzata il DB su OneDrive può essere stato aggiornato dal telefono, ma
                // i cache JS in-session (conti, categorie, tag) sono ancora quelli vecchi →
                // la dashboard mostrerebbe importi stale. onTrayRestore() invalida i cache,
                // ridisegna la pagina corrente e ricontrolla le notifiche. Stessa logica di
                // bringToFront() dal tray, qui per il ripristino via taskbar.
                // Tornati in foreground: disabilita l'auto-release, il lock resta preso finché
                // l'utente lavora (niente rilasci idle a metà lavoro con refresh a sorpresa).
                db.setAutoRelease(false);
                browser.executeJavaScript(
                    "if(typeof onTrayRestore==='function') onTrayRestore();", "", 0);
            }
        });
    }

    /** Restituisce il JFrame principale (usato da TrayManager). */
    public JFrame getFrame() { return frame; }

    /** Mostra la finestra solo dopo che index.html è completamente caricato.
     *
     *  Trucco off-screen: la JFrame deve essere visibile per far renderizzare
     *  JCEF (richiede un HWND realizzato), ma se la mettiamo sullo schermo
     *  prima del primo paint l'utente vede il Canvas vuoto (bianco/nero) prima
     *  che Chromium disegni la pagina. Soluzione: la posizioniamo fuori dallo
     *  schermo (-30000,-30000), così Windows non disegna nulla di visibile, e
     *  la portiamo dentro solo quando il JS conferma il primo frame via
     *  api.uiReady() (vedi Bridge.case "uiReady"). A quel punto è già dipinta
     *  con la dashboard → fade splash su contenuto reale, niente flash.
     *
     *  Fallback: se uiReady non arriva entro 4s (errore JS, ecc.) fade comunque. */
    public void showWhenReady(SplashWindow loading) {
        GraphicsEnvironment ge = GraphicsEnvironment.getLocalGraphicsEnvironment();
        Rectangle bounds = ge.getMaximumWindowBounds();
        frame.setMaximizedBounds(bounds);

        // setVisible off-screen: Chromium ha un HWND e renderizza, l'utente non vede.
        frame.setBounds(-30000, -30000, bounds.width, bounds.height);
        frame.setVisible(true);

        final boolean[] shown = {false};
        Runnable showAndFade = () -> SwingUtilities.invokeLater(() -> {
            if (shown[0]) return;
            shown[0] = true;
            if (App.startupT0 != 0) {
                System.out.println(String.format(
                    "[STARTUP] totale main()->uiReady (primo paint visibile): %d ms",
                    (System.nanoTime() - App.startupT0) / 1_000_000));
            }
            // Riporta on-screen e massimizza: la pagina è già renderizzata.
            frame.setLocation(bounds.x, bounds.y);
            frame.setExtendedState(JFrame.MAXIMIZED_BOTH);
            // Fade splash: 350ms (era 1000). La dashboard sotto è già dipinta, quindi
            // un secondo intero di dissolvenza era tempo percepito sprecato; 350ms
            // resta una transizione morbida ma toglie ~650ms all'avvio percepito.
            loading.fadeOut(350, frame::toFront);
        });

        bridge.setUiReadyCallback(showAndFade);

        new javax.swing.Timer(4000, e -> showAndFade.run()) {{
            setRepeats(false);
            start();
        }};
    }

    /** Riapre il DB, porta la finestra in primo piano e aggiorna il frontend.
     *  Usato dal tray dopo che il DB era stato chiuso per permettere la sync OneDrive. */
    public void bringToFront() {
        // Tornati in foreground dal tray: il lock resta preso finché l'utente lavora
        // (niente auto-release idle a metà lavoro). Speculare a windowDeiconified.
        db.setAutoRelease(false);

        // La finestra si mostra SUBITO, senza aspettare il DB: reopen() apre un file che può
        // stare su OneDrive de-idratato, quindi può bloccare per secondi. Girando sull'EDT
        // congelava tutta la UI Swing proprio nel momento in cui l'utente ha appena cliccato
        // sul tray e si aspetta di rivedere la finestra.
        frame.setVisible(true);
        if ((frame.getExtendedState() & JFrame.ICONIFIED) != 0)
            frame.setExtendedState(frame.getExtendedState() & ~JFrame.ICONIFIED);
        GraphicsEnvironment ge = GraphicsEnvironment.getLocalGraphicsEnvironment();
        frame.setMaximizedBounds(ge.getMaximumWindowBounds());
        frame.setExtendedState(JFrame.MAXIMIZED_BOTH);
        frame.toFront();
        frame.requestFocus();

        // Riapertura fuori dall'EDT; il refresh del frontend torna sull'EDT al termine, così
        // onTrayRestore() gira quando il DB è davvero pronto a rispondere alle query.
        Thread.ofVirtual().start(() -> {
            try { db.reopen(); } catch (Exception e) {
                System.err.println("Errore riapertura DB dal tray: " + e.getMessage());
            }
            SwingUtilities.invokeLater(() ->
                browser.executeJavaScript("if(typeof onTrayRestore==='function') onTrayRestore();", "", 0));
        });
    }

    /** Innesca nel frontend l'invalidazione cache + refresh, quando il DB è stato modificato
     *  esternamente da OneDrive mentre l'app era in idle (auto-release) ma la finestra è aperta
     *  e l'utente sta lavorando. Usa onExternalDbChange() — che ridisegna la pagina CORRENTE,
     *  senza spostare l'utente sulla dashboard (a differenza di onTrayRestore, riservato al
     *  ripristino da tray/taskbar). Chiamato da Database.ensureOpen() via callback: disaccoppiato
     *  con invokeLater per non eseguire JS in modo rientrante durante il dispatch della query che
     *  ha riaperto la connessione. */
    public void notifyExternalDbChange() {
        SwingUtilities.invokeLater(() ->
            browser.executeJavaScript("if(typeof onExternalDbChange==='function') onExternalDbChange();", "", 0));
    }

    /** Ricarica la UI web (e riapre il DB se era stato chiuso dal tray). Usato dal menu tray. */
    public void reload() {
        db.setAutoRelease(false);  // ricarica = torniamo attivi in foreground: niente auto-release idle
        // reopen() fuori dall'EDT (vedi bringToFront): su un file OneDrive de-idratato bloccava
        // la UI Swing. La reload del browser torna sull'EDT quando il DB è pronto, altrimenti
        // la pagina ripartirebbe facendo query su una connessione non ancora aperta.
        Thread.ofVirtual().start(() -> {
            try { db.reopen(); } catch (Exception e) {
                System.err.println("Errore riapertura DB dal tray (ricarica): " + e.getMessage());
            }
            SwingUtilities.invokeLater(browser::reload);
        });
    }
}
