package com.moneymanager;

import javax.swing.*;
import java.awt.*;

public class LoadingDialog extends JWindow {

    private final JLabel statusLabel;
    private final JProgressBar progressBar;

    public LoadingDialog() {
        // Copre tutto lo schermo per nascondere il flash di Chromium durante il caricamento
        GraphicsEnvironment ge = GraphicsEnvironment.getLocalGraphicsEnvironment();
        Rectangle screen = ge.getMaximumWindowBounds();
        setBounds(screen);
        setBackground(new Color(13, 17, 23));
        setAlwaysOnTop(true);

        // Pannello centrato con le info di caricamento
        JPanel card = new JPanel(new BorderLayout(10, 10));
        card.setBackground(new Color(22, 27, 34));
        card.setBorder(BorderFactory.createLineBorder(new Color(48, 54, 61), 1));
        card.setPreferredSize(new Dimension(400, 120));
        card.setMaximumSize(new Dimension(400, 120));

        JLabel titleLabel = new JLabel("💰 LucaMoneyManager", SwingConstants.CENTER);
        titleLabel.setForeground(new Color(230, 237, 243));
        titleLabel.setFont(new Font("Segoe UI", Font.BOLD, 16));
        titleLabel.setBorder(BorderFactory.createEmptyBorder(15, 20, 5, 20));

        statusLabel = new JLabel("Inizializzazione...", SwingConstants.CENTER);
        statusLabel.setForeground(new Color(139, 148, 158));
        statusLabel.setFont(new Font("Segoe UI", Font.PLAIN, 12));

        progressBar = new JProgressBar(0, 100);
        progressBar.setStringPainted(false);
        progressBar.setForeground(new Color(88, 166, 255));
        progressBar.setBackground(new Color(33, 38, 45));
        progressBar.setBorder(BorderFactory.createEmptyBorder(0, 20, 15, 20));
        progressBar.setIndeterminate(true);

        card.add(titleLabel, BorderLayout.NORTH);
        card.add(statusLabel, BorderLayout.CENTER);
        card.add(progressBar, BorderLayout.SOUTH);

        // Wrapper scuro a schermo intero con card centrata
        JPanel bg = new JPanel(new GridBagLayout());
        bg.setBackground(new Color(13, 17, 23));
        bg.add(card);
        setContentPane(bg);
    }

    public void update(String status, float percent) {
        SwingUtilities.invokeLater(() -> {
            statusLabel.setText(status);
            if (percent > 0) {
                progressBar.setIndeterminate(false);
                progressBar.setValue((int) (percent * 100));
            } else {
                progressBar.setIndeterminate(true);
            }
        });
    }
}
