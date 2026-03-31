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

    public static HttpServer start(Path webDir, Bridge bridge, int port) throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
        server.setExecutor(Executors.newVirtualThreadPerTaskExecutor());

        // POST /bridge — riceve base64(JSON{method,params}), risponde base64(JSON)
        server.createContext("/bridge", ex -> {
            if (!ex.getRequestMethod().equalsIgnoreCase("POST")) {
                ex.sendResponseHeaders(405, -1);
                return;
            }
            try {
                byte[] body = ex.getRequestBody().readAllBytes();
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
                        || method.equals("chooseAttachmentFile")) {
                    respond(ex, Map.of("ok", false, "webOnly", true));
                    return;
                }

                Object result = bridge.dispatch(method, params, null);
                respond(ex, result);
            } catch (Exception e) {
                ex.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
                ex.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
                byte[] err = gson.toJson(Map.of("error", e.getMessage() != null ? e.getMessage() : "Errore interno"))
                        .getBytes(StandardCharsets.UTF_8);
                ex.sendResponseHeaders(500, err.length);
                ex.getResponseBody().write(err);
                ex.getResponseBody().close();
            }
        });

        // GET /* — serve file statici dalla cartella web estratta
        server.createContext("/", ex -> {
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
            ex.getResponseBody().close();
        });

        server.start();
        return server;
    }

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
