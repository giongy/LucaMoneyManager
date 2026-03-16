package com.moneymanager;

import javax.swing.*;
import java.awt.*;

public class LoadingDialog extends JWindow {

    private final JLabel statusLabel;
    private final JProgressBar progressBar;

    public LoadingDialog() {
        setSize(400, 120);
        setLocationRelativeTo(null);
        setBackground(new Color(13, 17, 23));

        JPanel panel = new JPanel(new BorderLayout(10, 10));
        panel.setBackground(new Color(22, 27, 34));
        panel.setBorder(BorderFactory.createLineBorder(new Color(48, 54, 61), 1));

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

        panel.add(titleLabel, BorderLayout.NORTH);
        panel.add(statusLabel, BorderLayout.CENTER);
        panel.add(progressBar, BorderLayout.SOUTH);

        setContentPane(panel);
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
