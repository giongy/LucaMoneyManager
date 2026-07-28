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
    /** Risposta del listener a un SHOW valido: serve al mittente per distinguere la nostra
     *  istanza da un programma estraneo che occupa la stessa porta (vedi tryAcquire). */
    private static final String ACK = "LMM-OK";
    private static ServerSocket server;

    /** Tenta di acquisire il lock dell'istanza singola.
     *  Se riesce, avvia il thread listener e ritorna true.
     *  Se un'altra istanza è attiva le invia SHOW e ritorna false (il chiamante esce).
     *  Se la porta è occupata ma il SHOW NON va a buon fine, ritorna comunque true: vedi sotto. */
    public static boolean tryAcquire(Runnable onShowSignal) {
        try {
            server = new ServerSocket(PORT, 1, InetAddress.getLoopbackAddress());
            Thread t = new Thread(() -> listenLoop(onShowSignal), "single-instance-listener");
            t.setDaemon(true);
            t.start();
            return true;
        } catch (IOException e) {
            // Porta occupata. Il caso NORMALE è che ci sia un'altra istanza in ascolto: le
            // mandiamo SHOW e usciamo (return false).
            //
            // Ma la porta 47291 può essere occupata da QUALCUN ALTRO — un altro programma, o un
            // socket rimasto appeso da un crash precedente. Prima l'errore di invio finiva in un
            // `catch (IOException ignored)` e si ritornava false lo stesso: App faceva
            // System.exit(0) e l'app NON PARTIVA PIÙ, senza finestra, senza messaggio, senza
            // niente in app.log. Un guasto totale e completamente muto.
            //
            // Ora, se il SHOW fallisce, assumiamo che dall'altra parte non ci sia una nostra
            // istanza e partiamo comunque: restare senza il lock di istanza singola è un
            // inconveniente minore (al più due finestre aperte), non poter avviare l'app è un
            // guasto. `server` resta null: release() è già null-safe.
            try (Socket s = new Socket(InetAddress.getLoopbackAddress(), PORT);
                 PrintWriter pw = new PrintWriter(s.getOutputStream(), true);
                 BufferedReader in = new BufferedReader(new InputStreamReader(s.getInputStream()))) {
                // Timeout: se dall'altra parte c'è un programma che accetta la connessione ma non
                // parla il nostro protocollo, la lettura resterebbe appesa e l'avvio con lei.
                s.setSoTimeout(2000);
                pw.println("SHOW");
                // Si esce SOLO se risponde la nostra istanza (ACK): scrivere su un socket
                // qualsiasi "riesce" anche se dall'altra parte c'è un programma estraneo che
                // il segnale lo ignora — e in quel caso uscire vorrebbe dire non partire mai.
                String ack = in.readLine();
                if (ACK.equals(ack)) return false;   // c'è davvero un'altra istanza: questa esce
                System.err.println("SingleInstance: porta " + PORT + " occupata da un programma"
                        + " che non è LucaMoneyManager (risposta: " + ack + ")."
                        + " Avvio comunque senza lock di istanza singola.");
                return true;
            } catch (IOException sendFailed) {
                System.err.println("SingleInstance: porta " + PORT + " occupata ma il segnale SHOW"
                        + " non è stato consegnato (" + sendFailed.getMessage() + ")."
                        + " Avvio comunque senza lock di istanza singola.");
                return true;
            }
        }
    }

    /** Loop del listener: a ogni connessione locale che invia "SHOW" esegue onShowSignal sull'EDT
     *  e risponde ACK, così il mittente sa di aver parlato con la nostra istanza e può uscire. */
    private static void listenLoop(Runnable onShowSignal) {
        while (server != null && !server.isClosed()) {
            try (Socket client = server.accept();
                 BufferedReader br = new BufferedReader(new InputStreamReader(client.getInputStream()));
                 PrintWriter pw = new PrintWriter(client.getOutputStream(), true)) {
                // Timeout anche qui: una connessione che si apre e non invia nulla non deve
                // bloccare il listener, altrimenti i SHOW successivi non verrebbero più serviti.
                client.setSoTimeout(2000);
                if ("SHOW".equals(br.readLine())) {
                    pw.println(ACK);
                    SwingUtilities.invokeLater(onShowSignal);
                }
            } catch (IOException e) {
                if (server != null && !server.isClosed())
                    System.err.println("SingleInstance: " + e.getMessage());
            }
        }
    }

    /** Rilascia il lock chiudendo il ServerSocket. */
    public static void release() {
        if (server != null && !server.isClosed()) {
            try { server.close(); } catch (IOException ignored) {}
        }
    }
}
