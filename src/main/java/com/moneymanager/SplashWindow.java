package com.moneymanager;

import javax.swing.*;
import java.awt.*;

public class SplashWindow extends JWindow {

    private String statusText = "";
    private float  progress   = -1f; // -1 = nascosta, 0..1 = visibile

    public SplashWindow() {
        GraphicsEnvironment ge = GraphicsEnvironment.getLocalGraphicsEnvironment();
        Rectangle screen = ge.getMaximumWindowBounds();
        int w = (int)(screen.width  * 0.70);
        int h = (int)(screen.height * 0.70);
        setBounds(screen.x + (screen.width - w) / 2, screen.y + (screen.height - h) / 2, w, h);
        setBackground(new Color(0x2f, 0x6b, 0x5e));
        // Always-on-top dalla creazione: copre la JFrame mentre Chromium si
        // inizializza, evitando flash dello sfondo dark prima del primo paint.
        setAlwaysOnTop(true);

        JPanel panel = new JPanel() {
            @Override
            protected void paintComponent(Graphics g) {
                Graphics2D g2 = (Graphics2D) g;
                g2.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING,
                        RenderingHints.VALUE_TEXT_ANTIALIAS_LCD_HRGB);
                g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING,
                        RenderingHints.VALUE_ANTIALIAS_ON);

                int W = getWidth(), H = getHeight();
                int cx = W / 2, cy = H / 2;
                Color white = Color.WHITE;

                // Sfondo
                g2.setColor(new Color(0x2f, 0x6b, 0x5e));
                g2.fillRect(0, 0, W, H);

                // Linee orizzontali
                g2.setStroke(new BasicStroke(0.7f));
                g2.setColor(new Color(255, 255, 255, 115));
                int rw = (int)(W * 0.78f / 2);
                g2.drawLine(cx - rw, cy - 95, cx + rw, cy - 95);
                g2.drawLine(cx - rw, cy + 95, cx + rw, cy + 95);

                // PERSONAL FINANCE
                g2.setColor(new Color(255, 255, 255, 191));
                drawCentered(g2, "PERSONAL FINANCE",
                        new Font("Segoe UI", Font.PLAIN, 11), cx, cy - 63, 6);

                // LUCA MONEY
                g2.setColor(white);
                drawCentered(g2, "LUCA MONEY",
                        new Font("Segoe UI", Font.PLAIN, 50), cx, cy + 10, 13);

                // M A N A G E R
                g2.setColor(new Color(255, 255, 255, 234));
                drawCentered(g2, "M A N A G E R",
                        new Font("Segoe UI", Font.PLAIN, 20), cx, cy + 52, 0);

                // Divisore centrale
                g2.setColor(new Color(255, 255, 255, 178));
                g2.setStroke(new BasicStroke(0.7f));
                g2.drawLine(cx - 30, cy + 72, cx + 30, cy + 72);

                // TRACK · ANALYZE · GROW
                g2.setColor(new Color(255, 255, 255, 178));
                drawCentered(g2, "TRACK  \u00B7  ANALYZE  \u00B7  GROW",
                        new Font("Segoe UI", Font.PLAIN, 10), cx, cy + 94, 5);

                // Barra progresso — visibile solo durante download JCEF
                if (progress >= 0f) {
                    int bw = (int)(W * 0.35f), bh = 3;
                    int bx = cx - bw / 2, by = H - 40;
                    g2.setColor(new Color(255, 255, 255, 40));
                    g2.fillRoundRect(bx, by, bw, bh, 2, 2);
                    g2.setColor(new Color(255, 255, 255, 200));
                    g2.fillRoundRect(bx, by, (int)(bw * progress), bh, 2, 2);

                    // Testo stato
                    g2.setColor(new Color(255, 255, 255, 140));
                    g2.setFont(new Font("Segoe UI", Font.PLAIN, 10));
                    FontMetrics fm = g2.getFontMetrics();
                    g2.drawString(statusText, cx - fm.stringWidth(statusText) / 2, by - 6);
                }
            }
        };
        panel.setOpaque(false);
        setContentPane(panel);
    }

    /** Aggiorna stato e progresso (chiamato durante download JCEF). */
    public void update(String status, float percent) {
        SwingUtilities.invokeLater(() -> {
            statusText = status;
            progress   = percent > 0 ? percent : 0f;
            repaint();
        });
    }

    /** Sfuma l'opacità della splash a 0 in durationMs, poi la chiude e invoca onDone.
     *  Se il sistema non supporta la traslucenza, chiude immediatamente. */
    public void fadeOut(int durationMs, Runnable onDone) {
        GraphicsDevice gd = GraphicsEnvironment.getLocalGraphicsEnvironment().getDefaultScreenDevice();
        if (!gd.isWindowTranslucencySupported(GraphicsDevice.WindowTranslucency.TRANSLUCENT)) {
            setVisible(false);
            dispose();
            if (onDone != null) onDone.run();
            return;
        }

        // Già always-on-top dalla creazione: ci limitiamo a riportarla davanti.
        toFront();

        final int steps = 40;
        final int delay = Math.max(16, durationMs / steps);
        final int[] i = {0};
        javax.swing.Timer timer = new javax.swing.Timer(delay, null);
        timer.setInitialDelay(0);
        timer.addActionListener(e -> {
            i[0]++;
            // Easing ease-out cubic: parte veloce e rallenta sul finale, transizione più "naturale"
            float t  = i[0] / (float) steps;
            float ec = 1f - (1f - t) * (1f - t) * (1f - t);
            float op = Math.max(0f, 1f - ec);
            try {
                setOpacity(op);
            } catch (Exception ex) {
                System.err.println("Fade splash fallito: " + ex.getMessage());
                timer.stop();
                setVisible(false);
                dispose();
                if (onDone != null) onDone.run();
                return;
            }
            if (op <= 0f) {
                timer.stop();
                setVisible(false);
                dispose();
                if (onDone != null) onDone.run();
            }
        });
        timer.start();
    }

    // Disegna testo centrato con spaziatura extra tra caratteri
    private static void drawCentered(Graphics2D g2, String text, Font font,
                                     int cx, int y, int spacing) {
        g2.setFont(font);
        FontMetrics fm = g2.getFontMetrics();
        int total = 0;
        for (char c : text.toCharArray()) total += fm.charWidth(c) + spacing;
        total -= spacing;
        int x = cx - total / 2;
        for (char c : text.toCharArray()) {
            g2.drawString(String.valueOf(c), x, y);
            x += fm.charWidth(c) + spacing;
        }
    }
}
