package com.moneymanager;

import com.google.gson.*;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.Executors;

/**
 * HTTP server embedded — espone l'UI web e il bridge API sulla LAN.
 * Avvio: WebServer.start(webDir, bridge, port)
 * Accesso da browser: http://<IP-PC>:<port>/
 */
public class WebServer {

    private static final Gson gson = new GsonBuilder().serializeNulls().create();

    /** Avvia l'HTTP server: registra /bridge (API JSON via dispatch) e / (file statici web/). */
    public static HttpServer start(Path webDir, Bridge bridge, int port) throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
        server.setExecutor(Executors.newVirtualThreadPerTaskExecutor());

        // Timeout su lettura e scrittura: senza, un client che apre la connessione e poi non
        // manda (o non legge) nulla tiene occupato il suo virtual thread e la connessione a
        // tempo indeterminato. Sono proprietà di sistema perché com.sun.net.httpserver non
        // espone un'API per impostarli; si scrivono solo se non già definite dall'esterno.
        // 30s è generoso per una LAN domestica e per il salvataggio di una nota con immagine.
        setPropIfAbsent("sun.net.httpserver.maxReqTime", "30");
        setPropIfAbsent("sun.net.httpserver.maxRspTime", "30");

        // POST /bridge — riceve base64(JSON{method,params}), risponde base64(JSON)
        server.createContext("/bridge", ex -> {
            if (!ex.getRequestMethod().equalsIgnoreCase("POST")) {
                ex.sendResponseHeaders(405, -1);
                return;
            }
            try {
                byte[] body = readLimited(ex.getRequestBody());
                String b64in = new String(body, StandardCharsets.UTF_8).trim();
                String json  = new String(Base64.getDecoder().decode(b64in), StandardCharsets.UTF_8);
                JsonObject req = JsonParser.parseString(json).getAsJsonObject();
                String method = req.get("method").getAsString();
                JsonObject params = req.has("params") && req.get("params").isJsonObject()
                        ? req.get("params").getAsJsonObject() : new JsonObject();

                // Operazioni desktop-only: ignorate silenziosamente
                if (method.equals("minimize") || method.equals("maximize") || method.equals("close")
                        || method.equals("getWindowPos") || method.equals("setWindowPos")
                        || method.equals("getWindowBounds") || method.equals("setWindowBounds")
                        || method.equals("isMaximized") || method.equals("chooseDbFile")
                        || method.equals("chooseBackupDir") || method.equals("chooseAttachmentsDir")
                        || method.equals("chooseAttachmentFile")
                        || method.equals("openDataDir") || method.equals("openLogFolder")
                        || method.equals("openUrl") || method.equals("resetJcef")
                        || method.equals("exportHtmlReport")) {
                    respond(ex, Map.of("ok", false, "webOnly", true));
                    return;
                }

                Object result = bridge.dispatch(method, params, null);
                respond(ex, result);
            } catch (Exception e) {
                // Log esplicito: una richiesta dalla LAN che fallisce qui non passa dal catch
                // centrale di Bridge.onQuery (quello copre solo il percorso JCEF), quindi senza
                // questa riga l'errore spariva — nessuna traccia in app.log, nessun badge.
                System.err.println("[WebServer] /bridge fallito: " + e);
                e.printStackTrace();
                try {
                    ex.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
                    ex.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
                    byte[] err = gson.toJson(Map.of("error", e.getMessage() != null ? e.getMessage()
                                    : e.getClass().getSimpleName()))
                            .getBytes(StandardCharsets.UTF_8);
                    ex.sendResponseHeaders(500, err.length);
                    ex.getResponseBody().write(err);
                } catch (IOException io) {
                    // Client sparito a metà risposta: non c'è più niente da dirgli.
                    System.err.println("[WebServer] invio errore fallito: " + io);
                }
            } finally {
                ex.close();   // rilascia sempre la connessione, anche se sendResponseHeaders è saltato
            }
        });

        // GET /* — serve file statici dalla cartella web estratta
        server.createContext("/", ex -> {
            // try/catch su TUTTO il ramo: prima non c'era. Un'eccezione qui (file cancellato fra
            // isRegularFile e readAllBytes, cartella web su OneDrive non idratata, permessi,
            // URI malformato) risaliva al gestore di default di HttpServer, che chiude la
            // connessione senza risposta: il browser mostrava una pagina bianca e in app.log
            // non restava NULLA. Ora l'errore si vede e il client riceve un 500 vero.
            try {
                if (!ex.getRequestMethod().equalsIgnoreCase("GET")) {
                    ex.sendResponseHeaders(405, -1);
                    return;
                }
                String uriPath = ex.getRequestURI().getPath();
                if (uriPath.equals("/")) uriPath = "/index.html";
                Path file = webDir.resolve(uriPath.substring(1)).normalize();
                if (!file.startsWith(webDir) || !Files.isRegularFile(file)) {
                    ex.sendResponseHeaders(404, -1);
                    return;
                }
                String mime = mimeType(file.getFileName().toString());
                byte[] data = Files.readAllBytes(file);
                ex.getResponseHeaders().set("Content-Type", mime);
                ex.sendResponseHeaders(200, data.length);
                ex.getResponseBody().write(data);
            } catch (Exception e) {
                System.err.println("[WebServer] GET " + ex.getRequestURI().getPath()
                        + " fallito: " + e);
                e.printStackTrace();
                try { ex.sendResponseHeaders(500, -1); }
                catch (IOException io) { /* risposta già iniziata o client sparito */ }
            } finally {
                ex.close();
            }
        });

        server.start();
        return server;
    }

    /** Imposta una proprietà di sistema solo se non è già stata definita (es. da riga di comando). */
    private static void setPropIfAbsent(String key, String value) {
        if (System.getProperty(key) == null) System.setProperty(key, value);
    }

    /**
     * Dimensione massima accettata per il corpo di una POST /bridge.
     *
     * Il payload più grosso legittimo è il salvataggio di una nota con un'immagine incollata:
     * l'editor Quill incorpora le immagini come data URI base64 dentro `content` (nel DB reale
     * una singola nota con uno screenshot pesa ~612 KB), e il tutto viaggia a sua volta
     * codificato in Base64, che aggiunge un altro ~33%. 8 MB lasciano quindi un margine molto
     * ampio sull'uso reale, restando lontanissimi dal poter esaurire la memoria.
     */
    private static final int MAX_BODY_BYTES = 8 * 1024 * 1024;

    /**
     * Legge il corpo della richiesta fermandosi a {@link #MAX_BODY_BYTES}.
     *
     * {@code readAllBytes()} leggeva senza alcun limite: una richiesta dalla LAN con un corpo
     * enorme (anche solo per errore, es. un upload sbagliato) veniva materializzata per intero
     * in memoria fino all'OutOfMemoryError, che non è un errore isolabile — porta giù l'intera
     * applicazione, connessione al DB compresa.
     *
     * Si legge un byte oltre il limite per distinguere "esattamente al limite" (valido) da
     * "oltre il limite" (rifiutato con un messaggio chiaro invece di un troncamento silenzioso,
     * che darebbe un Base64 corrotto e un errore incomprensibile).
     */
    private static byte[] readLimited(InputStream in) throws IOException {
        byte[] data = in.readNBytes(MAX_BODY_BYTES + 1);
        if (data.length > MAX_BODY_BYTES)
            throw new IOException("Richiesta troppo grande: oltre "
                    + (MAX_BODY_BYTES / (1024 * 1024)) + " MB");
        return data;
    }

    /** Serializza data in JSON, lo codifica in Base64 e lo invia come risposta 200 (come fa Bridge per JCEF). */
    private static void respond(HttpExchange ex, Object data) throws IOException {
        String json = gson.toJson(data);
        String b64  = Base64.getEncoder().encodeToString(json.getBytes(StandardCharsets.UTF_8));
        byte[] bytes = b64.getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().set("Content-Type", "text/plain; charset=utf-8");
        ex.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        ex.sendResponseHeaders(200, bytes.length);
        ex.getResponseBody().write(bytes);
        ex.getResponseBody().close();
    }

    /** Content-Type in base all'estensione del file servito. */
    private static String mimeType(String name) {
        if (name.endsWith(".html")) return "text/html; charset=utf-8";
        if (name.endsWith(".js"))   return "application/javascript; charset=utf-8";
        if (name.endsWith(".css"))  return "text/css; charset=utf-8";
        if (name.endsWith(".json")) return "application/json; charset=utf-8";
        if (name.endsWith(".png"))  return "image/png";
        if (name.endsWith(".ico"))  return "image/x-icon";
        if (name.endsWith(".svg"))  return "image/svg+xml";
        return "application/octet-stream";
    }
}
