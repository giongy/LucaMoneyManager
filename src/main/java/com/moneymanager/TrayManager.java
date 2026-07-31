package com.moneymanager;

import javax.swing.*;
import javax.swing.border.AbstractBorder;
import javax.swing.border.EmptyBorder;
import javax.swing.event.PopupMenuEvent;
import javax.swing.event.PopupMenuListener;
import java.awt.*;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;

/** Gestisce l'icona nella system tray e la registrazione all'avvio di Windows. */
public class TrayManager {

    private static TrayIcon trayIcon;
    private static boolean  trayActive = false;

    // Azione eseguita quando si richiede di portare la finestra in primo piano.
    // Impostata da App.java: include riapertura DB + show + refresh frontend.
    static Runnable bringToFrontAction;

    // Azione "Ricarica" del menu tray: reopen DB + reload del browser. Impostata da App.java.
    static Runnable reloadAction;

    // Stato e controllo connessione DB (impostati da App.java). Servono a mostrare nel menu
    // se il file SQLite è aperto/chiuso e a chiuderlo/riaprirlo: utile quando il desktop è
    // nel tray ma il DB resta in uso (es. browser LAN su un altro PC) e si vuole rilasciare
    // il lock per la sync OneDrive.
    static java.util.function.BooleanSupplier dbStatusSupplier;         // true se la connessione è aperta
    static java.util.function.BooleanSupplier dbManuallyClosedSupplier; // true se chiuso a mano (non idle)
    static Runnable closeDbAction;  // chiude la connessione DB
    static Runnable openDbAction;   // riapre la connessione DB

    // Timer che aggiorna il colore dell'icona tray in base allo stato DB (aperto/idle/chiuso).
    // Autonomo: funziona anche a finestra nascosta nel tray, indipendente dal polling del frontend.
    private static java.util.Timer iconStateTimer;

    // Riferimenti alle voci dinamiche del menu (aggiornate ad ogni apertura)
    private static StatusRow dbStatusRow;
    private static MenuRow   dbToggleRow;

    // Percorsi calcolati all'avvio (usati per la registrazione autostart)
    static String javaExePath;
    static String jarPath;

    // ── Palette menu tray: scura di proposito, indipendente dal tema dell'app.
    //    È un menu di sistema (fuori dalla finestra), dove i menu scuri sono la norma su Windows. ──
    private static final Color MENU_BG     = new Color(0x1b, 0x22, 0x2c);
    private static final Color MENU_BORDER = new Color(0x30, 0x36, 0x3d);
    private static final Color MENU_FG     = new Color(0xc9, 0xd1, 0xd9);
    private static final Color MENU_HOVER  = new Color(0x2f, 0x6b, 0x5e);
    private static final Color MENU_SEP    = new Color(0xff, 0xff, 0xff, 26);
    private static final Color STATUS_OK   = new Color(0x3f, 0xb9, 0x50); // verde: DB connesso
    private static final Color STATUS_OFF  = new Color(0x8b, 0x94, 0x9e); // grigio: DB inattivo (idle)
    private static final Color STATUS_CLOSED = new Color(0xc0, 0x39, 0x2b); // rosso: DB chiuso a mano
    private static final Font  MENU_FONT   = new Font("Segoe UI", Font.PLAIN, 13);
    private static final Font  MENU_EMOJI  = new Font("Segoe UI Emoji", Font.PLAIN, 14);
    private static final int   MENU_RADIUS = 12; // raggio angoli (clip finestra + bordo)

    /** Attiva il tray: aggiunge l'icona e abilita "chiudi = nascondi al tray".
     *  Ritorna false se SystemTray non è supportato. */
    public static boolean enable(JFrame frame) {
        if (!SystemTray.isSupported()) return false;
        if (trayActive) return true;

        // Menu moderno: JPopupMenu Swing stilizzato (l'AWT PopupMenu nativo non è personalizzabile).
        JPopupMenu menu = buildModernMenu(frame);

        trayIcon = new TrayIcon(IconFactory.create(16), "LucaMoneyManager");
        trayIcon.setImageAutoSize(true);
        trayIcon.addActionListener(e -> bringToFront()); // doppio click sinistro = apri
        attachPopup(trayIcon, menu);                      // click destro = menu moderno

        try {
            SystemTray.getSystemTray().add(trayIcon);
            trayActive = true;
            startIconStatePolling();
            return true;
        } catch (AWTException e) {
            System.err.println("TrayManager: impossibile aggiungere icona tray: " + e.getMessage());
            return false;
        }
    }

    /** Stato DB corrente (per l'icona tray) derivato dai supplier: aperto → OPEN, chiuso a
     *  mano → CLOSED, altrimenti (idle/iconify temporaneo) → IDLE. */
    private static IconFactory.DbState currentDbState() {
        boolean open = dbStatusSupplier != null && dbStatusSupplier.getAsBoolean();
        if (open) return IconFactory.DbState.OPEN;
        boolean manual = dbManuallyClosedSupplier != null && dbManuallyClosedSupplier.getAsBoolean();
        return manual ? IconFactory.DbState.CLOSED : IconFactory.DbState.IDLE;
    }

    /** Avvia il polling (ogni 2s) che tiene il colore dell'icona tray allineato allo stato DB.
     *  Solo un check booleano su db.isOpen()/isManuallyClosed(): non riapre il DB. */
    private static void startIconStatePolling() {
        if (iconStateTimer != null) return;
        updateIcon(currentDbState());  // stato iniziale
        iconStateTimer = new java.util.Timer("tray-icon-state", true);
        iconStateTimer.schedule(new java.util.TimerTask() {
            @Override public void run() {
                SwingUtilities.invokeLater(() -> updateIcon(currentDbState()));
            }
        }, 2000, 2000);
    }

    // Ultimo stato riflesso nell'icona: evita di rigenerare l'immagine se invariato.
    private static IconFactory.DbState lastIconState = IconFactory.DbState.OPEN;

    /** Aggiorna l'icona della tray in base allo stato del DB (verde=aperto, grigio=idle,
     *  rosso=chiuso a mano). No-op se il tray non è attivo o lo stato non è cambiato. */
    public static void updateIcon(IconFactory.DbState state) {
        if (trayIcon == null || state == lastIconState) return;
        lastIconState = state;
        trayIcon.setImage(IconFactory.createForState(16, state));
    }

    /** Costruisce il JPopupMenu stilizzato: stato DB, azioni (Apri, Ricarica, Chiudi DB), Esci. */
    private static JPopupMenu buildModernMenu(JFrame frame) {
        JPopupMenu menu = new JPopupMenu();
        menu.setLightWeightPopupEnabled(false); // forza popup heavyweight: il tray è fuori da ogni finestra
        menu.setOpaque(true);
        menu.setBackground(MENU_BG);
        menu.setBorder(new CompoundRoundBorder());

        dbStatusRow = new StatusRow();                  // riga informativa (stato connessione DB)
        // Toggle DB: etichetta/icona aggiornate ad ogni apertura in base allo stato corrente
        dbToggleRow = new MenuRow("🔌", "Chiudi connessione DB", menu, TrayManager::toggleDb);

        menu.add(dbStatusRow);
        menu.add(separator());
        menu.add(new MenuRow("📂", "Apri LucaMoneyManager", menu, TrayManager::bringToFront));
        menu.add(new MenuRow("🔄", "Ricarica",              menu, TrayManager::reload));
        menu.add(dbToggleRow);
        menu.add(separator());
        menu.add(new MenuRow("⏻", "Esci", menu, () -> doExit(frame)));
        return menu;
    }

    /** Azzera lo stato hover di tutte le voci del menu (chiamato ad ogni apertura: le righe
     *  sono riusate tra un'apertura e l'altra e, dopo un click, l'hover resterebbe "acceso"). */
    private static void resetHover(JPopupMenu menu) {
        for (Component c : menu.getComponents())
            if (c instanceof MenuRow row) row.setHover(false);
    }

    /** Riga di menu: pannello con emoji + testo, evidenziazione hover arrotondata (stile Fluent). */
    private static final class MenuRow extends JPanel {
        private boolean hover = false;
        private final JLabel ic;
        private final JLabel tx;

        MenuRow(String emoji, String label, JPopupMenu owner, Runnable action) {
            super(new BorderLayout(10, 0));
            setOpaque(false);
            setBorder(new EmptyBorder(8, 14, 8, 22));
            setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
            setAlignmentX(0f);

            ic = new JLabel(emoji);
            ic.setFont(MENU_EMOJI);
            ic.setForeground(MENU_FG);
            tx = new JLabel(label);
            tx.setFont(MENU_FONT);
            tx.setForeground(MENU_FG);
            add(ic, BorderLayout.WEST);
            add(tx, BorderLayout.CENTER);
            // Larghezza coerente di tutte le voci (BoxLayout del popup stira fino a questa)
            setMaximumSize(new Dimension(Integer.MAX_VALUE, getPreferredSize().height));

            addMouseListener(new MouseAdapter() {
                @Override public void mouseEntered(MouseEvent e) { setHover(true); }
                @Override public void mouseExited(MouseEvent e)  { setHover(false); }
                @Override public void mouseReleased(MouseEvent e) {
                    owner.setVisible(false);
                    if (action != null) action.run();
                }
            });
        }

        void setHover(boolean h) {
            if (hover == h) return;
            hover = h;
            Color fg = h ? Color.WHITE : MENU_FG;
            tx.setForeground(fg);
            ic.setForeground(fg);
            repaint();
        }

        /** Aggiorna icona ed etichetta (per le voci dinamiche, es. toggle DB). */
        void setContent(String emoji, String label) {
            ic.setText(emoji);
            tx.setText(label);
        }

        @Override protected void paintComponent(Graphics g) {
            Graphics2D g2 = (Graphics2D) g.create();
            g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g2.setColor(MENU_BG);
            g2.fillRect(0, 0, getWidth(), getHeight());
            if (hover) {
                g2.setColor(MENU_HOVER);
                g2.fillRoundRect(4, 2, getWidth() - 8, getHeight() - 4, 8, 8);
            }
            g2.dispose();
        }
    }

    /** Riga informativa (non cliccabile) che mostra lo stato della connessione al DB:
     *  pallino verde + "Database connesso" oppure pallino grigio + "Database chiuso". */
    private static final class StatusRow extends JPanel {
        private IconFactory.DbState state = IconFactory.DbState.OPEN;
        private final JLabel tx;

        StatusRow() {
            super(new BorderLayout(10, 0));
            setOpaque(false);
            setBorder(new EmptyBorder(7, 14, 7, 22));
            setAlignmentX(0f);

            // Pallino di stato come componente WEST (stessa larghezza dell'emoji nelle MenuRow,
            // così il testo resta allineato a quello delle altre voci).
            JComponent dot = new JComponent() {
                @Override protected void paintComponent(Graphics g) {
                    Graphics2D g2 = (Graphics2D) g.create();
                    g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
                    int d = 9;
                    g2.setColor(switch (state) {
                        case OPEN   -> STATUS_OK;
                        case IDLE   -> STATUS_OFF;
                        case CLOSED -> STATUS_CLOSED;
                    });
                    g2.fillOval((getWidth() - d) / 2, (getHeight() - d) / 2, d, d);
                    g2.dispose();
                }
            };
            dot.setPreferredSize(new Dimension(16, 16));

            tx = new JLabel("Database");
            tx.setFont(MENU_FONT.deriveFont(12f));
            tx.setForeground(STATUS_OFF);
            add(dot, BorderLayout.WEST);
            add(tx, BorderLayout.CENTER);
            setMaximumSize(new Dimension(Integer.MAX_VALUE, getPreferredSize().height));
        }

        void setState(IconFactory.DbState s) {
            state = s;
            tx.setText(switch (s) {
                case OPEN   -> "Database connesso";
                case IDLE   -> "Database inattivo";
                case CLOSED -> "Database chiuso";
            });
            tx.setForeground(s == IconFactory.DbState.OPEN ? MENU_FG : STATUS_OFF);
            repaint();
        }
    }

    /** Aggiorna le voci dinamiche (stato DB + etichetta del toggle) in base allo stato corrente.
     *  Chiamato ad ogni apertura del menu. */
    private static void refreshDbState() {
        if (dbStatusSupplier == null) {        // controllo DB non disponibile: nascondi le voci
            if (dbStatusRow != null) dbStatusRow.setVisible(false);
            if (dbToggleRow != null) dbToggleRow.setVisible(false);
            return;
        }
        IconFactory.DbState state = currentDbState();
        if (dbStatusRow != null) {
            dbStatusRow.setVisible(true);
            dbStatusRow.setState(state);
        }
        if (dbToggleRow != null) {
            dbToggleRow.setVisible(true);
            // Aperto → offri "Chiudi"; idle → si riaprirà da solo, ma lasciamo comunque
            // "Chiudi definitivamente" per rilasciare il lock a mano; chiuso a mano → "Riapri".
            switch (state) {
                case OPEN   -> dbToggleRow.setContent("🔌", "Chiudi connessione DB");
                case IDLE   -> dbToggleRow.setContent("🔌", "Chiudi connessione DB");
                case CLOSED -> dbToggleRow.setContent("🔗", "Riapri connessione DB");
            }
        }
    }

    /** Chiude o riapre la connessione DB a seconda dello stato corrente. Coerente col menu:
     *  aperto/idle → "Chiudi" (closeManual, rilascia il lock a mano); chiuso a mano → "Riapri". */
    public static void toggleDb() {
        Runnable action = currentDbState() == IconFactory.DbState.CLOSED ? openDbAction : closeDbAction;
        if (action != null) SwingUtilities.invokeLater(action);
    }

    /** Separatore sottile con margine orizzontale. */
    private static JComponent separator() {
        JPanel sep = new JPanel() {
            @Override protected void paintComponent(Graphics g) {
                g.setColor(MENU_BG);
                g.fillRect(0, 0, getWidth(), getHeight());
                g.setColor(MENU_SEP);
                g.fillRect(12, getHeight() / 2, getWidth() - 24, 1);
            }
        };
        sep.setOpaque(false);
        sep.setAlignmentX(0f);
        sep.setPreferredSize(new Dimension(10, 9));
        sep.setMaximumSize(new Dimension(Integer.MAX_VALUE, 9));
        return sep;
    }

    /** Mostra il JPopupMenu al click destro sul tray, usando un dialog invisibile come
     *  invoker focusabile (così il menu si chiude cliccando altrove). */
    private static void attachPopup(TrayIcon icon, JPopupMenu menu) {
        final JDialog anchor = new JDialog((Frame) null);
        anchor.setUndecorated(true);
        anchor.setAlwaysOnTop(true);
        anchor.setSize(1, 1);
        anchor.getContentPane().setBackground(MENU_BG);

        menu.addPopupMenuListener(new PopupMenuListener() {
            @Override public void popupMenuWillBecomeVisible(PopupMenuEvent e) { resetHover(menu); }
            @Override public void popupMenuWillBecomeInvisible(PopupMenuEvent e) {
                SwingUtilities.invokeLater(() -> anchor.setVisible(false));
            }
            @Override public void popupMenuCanceled(PopupMenuEvent e) { anchor.setVisible(false); }
        });

        icon.addMouseListener(new MouseAdapter() {
            @Override public void mousePressed(MouseEvent e)  { maybeShow(e); }
            @Override public void mouseReleased(MouseEvent e) { maybeShow(e); }
            private void maybeShow(MouseEvent e) {
                if (!e.isPopupTrigger()) return;
                // Aggiorna stato DB ed etichette PRIMA di misurare il menu (la show() ricalcola
                // dopo, ma la posizione qui sotto usa getPreferredSize()).
                refreshDbState();
                // Per i MouseEvent del tray, getX/getY sono coordinate schermo.
                Point cursor = new Point(e.getX(), e.getY());
                Dimension size = menu.getPreferredSize();
                Rectangle scr = screenBoundsAt(cursor); // area di lavoro (esclude la taskbar)

                // Apre il menu SOPRA-A-SINISTRA del cursore con un piccolo gap: così il
                // mouse resta fuori dal menu e nessuna voce risulta pre-selezionata.
                int gap = 2;
                int bottom = Math.min(cursor.y, scr.y + scr.height) - gap;
                int x = cursor.x - size.width;
                int y = bottom - size.height;
                // Clamp ai bordi dell'area di lavoro
                if (x < scr.x) x = scr.x;
                if (x + size.width > scr.x + scr.width) x = scr.x + scr.width - size.width;
                if (y < scr.y) y = scr.y;

                anchor.setLocation(x, y);   // l'anchor è già nell'angolo alto-sx del menu
                anchor.setVisible(true);
                anchor.toFront();
                menu.show(anchor, 0, 0);
                // Ritaglia la finestra heavyweight del popup ad angoli arrotondati:
                // senza questo i 4 angoli quadrati scuri restano visibili dietro il bordo.
                SwingUtilities.invokeLater(() -> roundPopupWindow(menu));
            }
        });
    }

    /** Applica un clip ad angoli arrotondati alla finestra che ospita il popup. */
    private static void roundPopupWindow(JPopupMenu menu) {
        Window w = SwingUtilities.getWindowAncestor(menu);
        if (w == null || w.getWidth() <= 0 || w.getHeight() <= 0) return;
        try {
            w.setShape(new java.awt.geom.RoundRectangle2D.Double(
                    0, 0, w.getWidth(), w.getHeight(), MENU_RADIUS, MENU_RADIUS));
        } catch (Exception ex) {
            // shaping non supportato dalla piattaforma: il popup resta rettangolare
        }
    }

    /** Area di lavoro (taskbar esclusa) dello schermo che contiene il punto p. */
    private static Rectangle screenBoundsAt(Point p) {
        for (GraphicsDevice gd : GraphicsEnvironment.getLocalGraphicsEnvironment().getScreenDevices()) {
            GraphicsConfiguration gc = gd.getDefaultConfiguration();
            if (gc.getBounds().contains(p)) {
                Rectangle b = gc.getBounds();
                Insets ins = Toolkit.getDefaultToolkit().getScreenInsets(gc);
                return new Rectangle(b.x + ins.left, b.y + ins.top,
                        b.width - ins.left - ins.right, b.height - ins.top - ins.bottom);
            }
        }
        return GraphicsEnvironment.getLocalGraphicsEnvironment().getMaximumWindowBounds();
    }

    /** Bordo arrotondato + padding interno del popup. */
    private static final class CompoundRoundBorder extends AbstractBorder {
        @Override public void paintBorder(Component c, Graphics g, int x, int y, int w, int h) {
            Graphics2D g2 = (Graphics2D) g.create();
            g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g2.setColor(MENU_BORDER);
            g2.drawRoundRect(x, y, w - 1, h - 1, MENU_RADIUS, MENU_RADIUS);
            g2.dispose();
        }
        @Override public Insets getBorderInsets(Component c) { return new Insets(7, 0, 7, 0); }
        @Override public Insets getBorderInsets(Component c, Insets i) {
            i.set(7, 0, 7, 0); return i;
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

    /** Ricarica la UI: delega a reloadAction (impostata da App.java: reopen DB + reload browser). */
    public static void reload() {
        if (reloadAction != null) SwingUtilities.invokeLater(reloadAction);
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

    /**
     * Uscita completa dall'app dal menu tray: rimuove il tray, rilascia il lock e termina.
     *
     * NON chiude direttamente: delega a windowClosing di MainWindow inviando l'evento vero.
     * Tutta la sequenza di chiusura ordinata (backup automatico, clearSessionState, db.close(),
     * dispose di JCEF, System.exit) vive solo lì, e frame.dispose() NON la fa scattare perché
     * emette windowClosed, non windowClosing: uscendo dal tray il backup automatico veniva
     * quindi saltato in silenzio, anche con "backup alla chiusura" attivo.
     * disable() è chiamato PRIMA perché azzera trayActive: così windowClosing prende il ramo
     * di uscita completa invece di quello "nascondi nel tray".
     */
    private static void doExit(JFrame frame) {
        disable();
        SingleInstance.release();
        frame.dispatchEvent(new java.awt.event.WindowEvent(frame, java.awt.event.WindowEvent.WINDOW_CLOSING));
    }
}
