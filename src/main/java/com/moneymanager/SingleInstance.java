package com.moneymanager;

import javax.swing.SwingUtilities;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;

/** Garantisce un'unica istanza dell'applicazione via ServerSocket locale.
 *  Se un'altra istanza è già in esecuzione, le invia il segnale SHOW ed esce. */
public class SingleInstance {

    private static final int PORT = 47291;
    private static ServerSocket server;

    /** Tenta di acquisire il lock dell'istanza singola.
     *  Se riesce, avvia il thread listener e ritorna true.
     *  Se un'altra istanza è attiva, le invia SHOW e ritorna false. */
    public static boolean tryAcquire(Runnable onShowSignal) {
        try {
            server = new ServerSocket(PORT, 1, InetAddress.getLoopbackAddress());
            Thread t = new Thread(() -> listenLoop(onShowSignal), "single-instance-listener");
            t.setDaemon(true);
            t.start();
            return true;
        } catch (IOException e) {
            // Porta occupata: un'altra istanza è già in esecuzione — segnalale di mostrarsi
            try (Socket s = new Socket(InetAddress.getLoopbackAddress(), PORT);
                 PrintWriter pw = new PrintWriter(s.getOutputStream(), true)) {
                pw.println("SHOW");
            } catch (IOException ignored) {}
            return false;
        }
    }

    private static void listenLoop(Runnable onShowSignal) {
        while (server != null && !server.isClosed()) {
            try (Socket client = server.accept();
                 BufferedReader br = new BufferedReader(new InputStreamReader(client.getInputStream()))) {
                if ("SHOW".equals(br.readLine())) SwingUtilities.invokeLater(onShowSignal);
            } catch (IOException e) {
                if (server != null && !server.isClosed())
                    System.err.println("SingleInstance: " + e.getMessage());
            }
        }
    }

    public static void release() {
        if (server != null && !server.isClosed()) {
            try { server.close(); } catch (IOException ignored) {}
        }
    }
}
