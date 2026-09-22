import com.moneymanager.Database;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Verifica di non regressione sul giornale delle operazioni (op_log + change_log).
 * Lo lancia tools\test-giornale.ps1, sempre su una COPIA del database.
 *
 * <p>Le proprietà difese sono quelle che si rompono in silenzio:</p>
 * <ul>
 *   <li><b>l'avvio non scrive</b> — su OneDrive ogni scrittura costa il ricaricamento del file
 *       intero, e un avvio che scrive lo fa a ogni apertura, per sempre;</li>
 *   <li><b>una lettura non lascia traccia</b> — sarebbe lo stesso danno, moltiplicato per ogni
 *       pagina aperta;</li>
 *   <li><b>le figlie eliminate dalla CASCADE vengono catturate</b> — senza, annullare la
 *       cancellazione di una transazione ne restituirebbe il guscio senza split né tag: saldi
 *       plausibili e totali per categoria sbagliati;</li>
 *   <li><b>nessuna riga resta orfana</b> ({@code op_id IS NULL}) — verrebbe assegnata al gesto
 *       successivo, cioè a quello sbagliato;</li>
 *   <li><b>un gesto fallito non lascia niente a metà</b>;</li>
 *   <li><b>il vecchio {@code <db>.log} non viene più scritto</b> — dalla 1.26.0 l'app non lo
 *       tocca più in nessun modo, e cinque gesti veri non devono cambiarlo di un byte;
 *       ciascuno di quei gesti resta però una riga sola di cronologia.</li>
 * </ul>
 */
public class TestGiornale {

    static int passati = 0, falliti = 0;
    static boolean verboso = false;
    static String url;

    public static void main(String[] args) throws Exception {
        System.setOut(new java.io.PrintStream(new java.io.FileOutputStream(java.io.FileDescriptor.out),
                true, java.nio.charset.StandardCharsets.UTF_8));
        Path db = Path.of(args[0]);
        for (String a : args) if ("-v".equals(a)) verboso = true;
        url = "jdbc:sqlite:" + db.toString().replace(java.io.File.separatorChar, '/');

        sezione("SCHEMA E TRIGGER");
        // ⚠️ Tutto si misura a DIFFERENZE, mai a valori assoluti: il DB di partenza è quello
        // vero e il suo giornale contiene già le operazioni di chi usa l'app. Un banco che
        // pretende un giornale vuoto passa solo il primo giorno.
        // ⚠️ Prima apertura a parte: se la copia arriva da un DB non ancora migrato, è l'unico
        // avvio che scrive davvero (la migrazione dello schema), quindi mtime, dimensione e
        // change counter cambiano. Tutto ciò che si misura dopo parte da un DB già allineato,
        // dove vale la regola dell'avvio a scrittura zero.
        // In op_log non lascia nulla, ed è coerente: sqlite_master non è journalata, quindi
        // l'operazione di avvio resta senza righe di change_log e non viene registrata.
        new Database(db.toString()).close();

        int opIniziali = contaTollerante("SELECT COUNT(*) FROM op_log");
        Database d = new Database(db.toString());
        d.close();
        try (Connection c = DriverManager.getConnection(url); Statement st = c.createStatement()) {
            eq("schema allineato alla v28", "28", uno(st, "SELECT version FROM schema_version"));
            eq("op_log e change_log esistono", "2", uno(st,
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name IN ('op_log','change_log')"));
            eq("un trigger per ogni verso di ogni tabella journalata", "57", uno(st,
                "SELECT COUNT(*) FROM sqlite_master WHERE type='trigger' AND name LIKE 'jr\\_%' ESCAPE '\\'"));
            vero("il trigger di app_settings tiene fuori lo stato di navigazione",
                 String.valueOf(uno(st, "SELECT sql FROM sqlite_master WHERE name='jr_app_settings_u'"))
                       .contains("NOT LIKE 'tx.range%'"));
        }
        eq("il solo avvio non registra operazioni", opIniziali, conta("SELECT COUNT(*) FROM op_log"));

        sezione("AVVIO A SCRITTURA ZERO");
        long mtime = Files.getLastModifiedTime(db).toMillis();
        long size  = Files.size(db);
        int  cc    = changeCounter(db);
        Thread.sleep(1100);                    // l'mtime ha risoluzione di un secondo
        new Database(db.toString()).close();
        eq("change counter nell'header invariato", String.valueOf(cc), String.valueOf(changeCounter(db)));
        eq("dimensione del file invariata", String.valueOf(size), String.valueOf(Files.size(db)));
        eq("mtime invariato", String.valueOf(mtime),
           String.valueOf(Files.getLastModifiedTime(db).toMillis()));

        Database app = new Database(db.toString());

        sezione("UNA LETTURA NON LASCIA TRACCIA");
        app.iniziaRichiesta("getAccounts", "desktop");
        app.getAccounts();
        app.getTransactions(json("{}"));
        app.terminaRichiesta(true);
        eq("nessuna operazione dopo due letture", opIniziali, conta("SELECT COUNT(*) FROM op_log"));

        sezione("UN GESTO, CON LE SUE FIGLIE");
        // Una transazione che abbia davvero split e tag: eliminandola, SQLite ne cancella
        // quattro righe in tre tabelle, e il giornale deve averle tutte.
        int tx = intUno("""
            SELECT t.id FROM transactions t
            WHERE (SELECT COUNT(*) FROM transaction_splits s WHERE s.transaction_id=t.id) > 0
              AND (SELECT COUNT(*) FROM transaction_tags   g WHERE g.transaction_id=t.id) > 0
            ORDER BY t.date DESC LIMIT 1""");
        int split = conta("SELECT COUNT(*) FROM transaction_splits WHERE transaction_id=" + tx);
        int tag   = conta("SELECT COUNT(*) FROM transaction_tags   WHERE transaction_id=" + tx);
        app.iniziaRichiesta("deleteTransaction", "desktop");
        app.deleteTransaction(tx);
        app.terminaRichiesta(true);

        try (Connection c = DriverManager.getConnection(url); Statement st = c.createStatement()) {
            String op = uno(st, "SELECT MAX(id) FROM op_log");   // l'operazione appena nata
            eq("una sola operazione per un solo gesto", opIniziali + 1, conta("SELECT COUNT(*) FROM op_log"));
            eq("etichetta presa dall'annotazione", "TRANSAZIONE ELIMINATA",
               uno(st, "SELECT etichetta FROM op_log WHERE id=" + op));
            eq("origine e tipo", "desktop|utente", uno(st, "SELECT origine||'|'||tipo FROM op_log WHERE id=" + op));
            vero("il dettaglio riporta i campi dell'annotazione",
                 String.valueOf(uno(st, "SELECT dettaglio FROM op_log WHERE id=" + op)).contains("id:" + tx));
            eq("righe catturate = 1 transazione + " + split + " split + " + tag + " tag",
               String.valueOf(1 + split + tag), uno(st, "SELECT COUNT(*) FROM change_log WHERE op_id=" + op));
            eq("nessuna riga orfana", "0", uno(st, "SELECT COUNT(*) FROM change_log WHERE op_id IS NULL"));
            vero("la riga vecchia conserva i dati della transazione",
                 String.valueOf(uno(st, "SELECT riga FROM change_log WHERE op_id=" + op + " AND tabella='transactions'"))
                       .contains("\"id\":" + tx));
            vero("le chiavi composte sono coppie",
                 String.valueOf(uno(st, "SELECT chiave FROM change_log WHERE op_id=" + op + " AND tabella='transaction_tags'"))
                       .matches("\\[\\d+,\\d+\\]"));
        }

        sezione("UN OROLOGIO SOLO");
        // ⚠️ Il DEFAULT delle colonne created_at era CURRENT_TIMESTAMP, che in SQLite è SEMPRE
        // UTC: la stessa riga di cronologia mostrava il gesto delle 18:46 con dentro un
        // created_at delle 16:46, e nessun errore lo segnalava. Dalla v28 il DEFAULT è
        // datetime('now','localtime'), lo stesso orologio che Java scrive in op_log.ts.
        app.iniziaRichiesta("addAccount", "desktop");
        long conto = ((Number) app.addAccount(json("""
            {"name":"Orologio","type":"bank","currency":"EUR","initial_balance":0}""")).get("id")).longValue();
        app.terminaRichiesta(true);
        try (Connection c = DriverManager.getConnection(url); Statement st = c.createStatement()) {
            String ts  = uno(st, "SELECT ts FROM op_log ORDER BY id DESC LIMIT 1");
            String cre = uno(st, "SELECT created_at FROM accounts WHERE id=" + conto);
            eq("il gesto e la riga che ha creato portano la stessa ora",
               String.valueOf(ts).substring(0, 16), String.valueOf(cre).substring(0, 16));
            eq("nessun DEFAULT rimasto in UTC", "0", uno(st,
               "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND upper(sql) LIKE '%CURRENT_TIMESTAMP%'"));
        }
        app.iniziaRichiesta("deleteAccount", "desktop");
        app.deleteAccount((int) conto);
        app.terminaRichiesta(true);

        sezione("LE IMPOSTAZIONI: PREFERENZE SI, NAVIGAZIONE NO");
        int opPrima = conta("SELECT COUNT(*) FROM op_log");
        // ⚠️ A differenze, non a valore assoluto: il DB di partenza è quello vero, e basta aver
        // cambiato una preferenza dall'app perché una riga 'setSetting' ci sia già.
        int sysPrima = conta("SELECT COUNT(*) FROM op_log WHERE tipo='sistema' AND etichetta='setSetting'");
        app.iniziaRichiesta("setSetting", "desktop");
        app.setAppSetting("tx.range.acct.3", "2026");
        app.terminaRichiesta(true);
        eq("cambiare periodo non entra nel giornale", opPrima, conta("SELECT COUNT(*) FROM op_log"));

        app.iniziaRichiesta("setSetting", "desktop");
        app.setAppSetting("backup.max", "12");
        app.terminaRichiesta(true);
        eq("una preferenza vera entra", opPrima + 1, conta("SELECT COUNT(*) FROM op_log"));
        eq("e senza annotazione resta un'operazione di sistema", sysPrima + 1,
           conta("SELECT COUNT(*) FROM op_log WHERE tipo='sistema' AND etichetta='setSetting'"));

        sezione("UN GESTO FALLITO NON LASCIA NIENTE A META'");
        int op0  = conta("SELECT COUNT(*) FROM op_log");
        int tag0 = conta("SELECT COUNT(*) FROM tags");
        app.iniziaRichiesta("addTag", "desktop");
        try {
            app.addTag(json("{\"name\":\"prova-rollback\"}"));
            throw new IllegalStateException("errore simulato a meta' gesto");
        } catch (IllegalStateException atteso) {
            app.terminaRichiesta(false);
        }
        eq("nessuna operazione registrata", op0,  conta("SELECT COUNT(*) FROM op_log"));
        eq("nessun dato scritto",           tag0, conta("SELECT COUNT(*) FROM tags"));
        eq("nessuna riga orfana rimasta",   0,    conta("SELECT COUNT(*) FROM change_log WHERE op_id IS NULL"));

        sezione("IL CAMBIO DI DATABASE NON AVVIENE A META' GESTO");
        // close() non chiude se c'è lavoro in volo, e un'operazione aperta ne tiene uno alzato:
        // senza guardia, il close() di reconnect sarebbe un no-op silenzioso e la connessione
        // vecchia resterebbe orfana, col lock sul file per sempre.
        Path db2 = db.resolveSibling(db.getFileName().toString().replace(".db", "-2.db"));
        Files.copy(db, db2, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        app.iniziaRichiesta("reloadDb", "desktop");
        app.addTag(json("{\"name\":\"prova-guardia\"}"));      // apre l'operazione
        boolean rifiutato = false;
        try { app.reconnect(db2.toString()); } catch (SQLException atteso) { rifiutato = true; }
        app.terminaRichiesta(false);
        vero("rifiutato: cambiare database con un'operazione aperta", rifiutato);

        // E viceversa: un cambio DB legittimo (nessuna scrittura prima) non deve rubare il
        // contesto alla richiesta che lo ha chiesto — la scrittura successiva è ancora sua.
        String url2 = "jdbc:sqlite:" + db2.toString().replace(java.io.File.separatorChar, '/');
        int opDb2;   // la copia porta con sé le operazioni già registrate: si conta il delta
        try (Connection c = DriverManager.getConnection(url2); Statement st = c.createStatement()) {
            opDb2 = Integer.parseInt(uno(st, "SELECT COUNT(*) FROM op_log"));
        }
        app.iniziaRichiesta("reloadDb", "desktop");
        app.reconnect(db2.toString());
        app.addTag(json("{\"name\":\"dopo-il-cambio\"}"));
        app.terminaRichiesta(true);
        try (Connection c = DriverManager.getConnection(url2); Statement st = c.createStatement()) {
            eq("dopo il cambio la scrittura resta un solo gesto",
               String.valueOf(opDb2 + 1), uno(st, "SELECT COUNT(*) FROM op_log"));
            eq("con la sua etichetta", "TAG AGGIUNTO",
               uno(st, "SELECT etichetta FROM op_log ORDER BY id DESC LIMIT 1"));
        }
        app.reconnect(db.toString());   // si torna sul DB di prova per il resto dei controlli

        // Fino alla fase 2 questo gruppo era il confronto 1:1 col vecchio `<db>.log`: serviva a
        // dimostrare che nel passaggio non si perdeva nessuna riga. Ora che il giornale è
        // l'unico registro, la proprietà da difendere è l'opposto — il file di testo non deve
        // più essere toccato — e resta quella che contava: un gesto, una riga di cronologia.
        sezione("IL VECCHIO .LOG NON VIENE PIU' SCRITTO");
        Path log = db.resolveSibling(db.getFileName().toString().replaceAll("\\.[^.]+$", "") + ".log");
        long logPrima = Files.exists(log) ? Files.size(log) : -1;
        for (Object[] g : gesti(app)) {
            String nome = (String) g[0];
            int opPre = conta("SELECT COUNT(*) FROM op_log");
            app.iniziaRichiesta(nome, "desktop");
            ((Azione) g[1]).esegui();
            app.terminaRichiesta(true);
            String etichetta = uno("SELECT etichetta FROM op_log ORDER BY id DESC LIMIT 1");
            vero(nome + ": un gesto, una operazione (" + etichetta + ")",
                 conta("SELECT COUNT(*) FROM op_log") == opPre + 1
                 && etichetta != null && !etichetta.isBlank());
        }
        long logDopo = Files.exists(log) ? Files.size(log) : -1;
        eq("dopo cinque gesti il file .log è intatto", String.valueOf(logPrima), String.valueOf(logDopo));


        // ── Backup a caldo e manutenzione ───────────────────────────────────────
        // Le proprietà che si rompono in silenzio: un .bak incoerente sembra a posto e lo si
        // scopre il giorno del ripristino; una potatura che non porta via change_log lascia il
        // giornale pesante e i dati per annullare appesi a operazioni che non esistono più.
        sezione("BACKUP A CALDO");
        // La cartella sta accanto alla copia e ne porta il nome: così la pulizia dello script
        // (che cancella tutto ciò che inizia col nome della copia) se la porta via, invece di
        // lasciare backup di prova nel %TEMP% a ogni giro.
        Path cartellaBak = db.resolveSibling(
                db.getFileName().toString().replaceAll("\\.[^.]+$", "") + "-bak");
        Files.createDirectories(cartellaBak);
        app.iniziaRichiesta("setSetting", "desktop");
        app.setAppSetting("backup.dir", cartellaBak.toString());
        app.setAppSetting("backup.max", "9");
        app.terminaRichiesta(true);

        int txPrima = conta("SELECT COUNT(*) FROM transactions");
        String dest = app.backup(cartellaBak.toString(), 9);
        vero("il .bak esiste ed è stato prodotto a connessione aperta",
             Files.exists(Path.of(dest)) && app.isOpen());
        eq("niente sidecar .json accanto al backup", 0,
           (int) java.util.stream.StreamSupport.stream(
                   Files.newDirectoryStream(cartellaBak, "*.json").spliterator(), false).count());
        try (Connection c = DriverManager.getConnection(
                     "jdbc:sqlite:" + dest.replace(java.io.File.separatorChar, '/'));
             Statement st = c.createStatement()) {
            eq("il backup è integro", "ok", uno(st, "PRAGMA integrity_check"));
            eq("e contiene gli stessi dati dell'originale", String.valueOf(txPrima),
               uno(st, "SELECT COUNT(*) FROM transactions"));
            vero("compreso il proprio giornale (al posto del vecchio sidecar)",
                 Integer.parseInt(uno(st, "SELECT COUNT(*) FROM op_log")) > 0);
        }

        // ⚠️ Dentro una transazione l'Online Backup API risponde SQLITE_BUSY e lascia un file
        // di 0 byte: se non lo si cancella resta in cartella un .bak troncato dall'aria buona.
        app.iniziaRichiesta("addTag", "desktop");
        app.addTag(json("{\"name\":\"prova-backup-busy\"}"));   // apre l'operazione
        boolean bakRifiutato = false;
        int bakPrima = (int) java.util.stream.StreamSupport.stream(
                Files.newDirectoryStream(cartellaBak, "*.db.bak").spliterator(), false).count();
        try { app.backup(cartellaBak.toString(), 9); }
        catch (Exception atteso) { bakRifiutato = true; }
        app.terminaRichiesta(false);
        vero("rifiutato: backup con un'operazione aperta", bakRifiutato);
        eq("e nessun file parziale lasciato in cartella", bakPrima,
           (int) java.util.stream.StreamSupport.stream(
                   Files.newDirectoryStream(cartellaBak, "*.db.bak").spliterator(), false).count());

        sezione("POTATURA DEL GIORNALE");
        // Un giornale finto di 90 giorni: tre operazioni vecchie con le loro righe di dati, e
        // una di ieri. Con retention 30 devono sparire le tre vecchie e restare quella recente.
        try (Connection c = DriverManager.getConnection(url); Statement st = c.createStatement()) {
            for (int g : new int[]{90, 60, 31, 1}) {
                st.executeUpdate("INSERT INTO op_log(ts,etichetta,dettaglio,origine,tipo,stato)"
                        + " VALUES(datetime('now','localtime','-" + g + " days'),'PROVA POTATURA','g:"
                        + g + "','desktop','utente','attiva')");
                long id = Long.parseLong(uno(st, "SELECT MAX(id) FROM op_log"));
                for (int k = 0; k < 2; k++)
                    st.executeUpdate("INSERT INTO change_log(op_id,tabella,chiave,verso,riga)"
                            + " VALUES(" + id + ",'tags','[999]','U','{\"id\":999}')");
            }
        }
        int opVecchie   = conta("SELECT COUNT(*) FROM op_log WHERE etichetta='PROVA POTATURA'");
        int righeVecchie = conta("SELECT COUNT(*) FROM change_log WHERE chiave='[999]'");
        eq("giornale finto pronto: 4 operazioni", 4, opVecchie);
        eq("con 2 righe di dati ciascuna", 8, righeVecchie);

        app.iniziaRichiesta("setSetting", "desktop");
        app.setAppSetting("journal.retention_days", "0");
        app.terminaRichiesta(true);
        app.manutenzione(true);
        eq("con retention 0 non si pota niente", 4,
           conta("SELECT COUNT(*) FROM op_log WHERE etichetta='PROVA POTATURA'"));

        app.iniziaRichiesta("setSetting", "desktop");
        app.setAppSetting("journal.retention_days", "30");
        app.terminaRichiesta(true);
        app.manutenzione(true);
        eq("con retention 30 restano solo le operazioni dentro la finestra", 1,
           conta("SELECT COUNT(*) FROM op_log WHERE etichetta='PROVA POTATURA'"));
        // ⚠️ La connessione esclusiva usata dalla potatura non ha le foreign key attive per
        // default: senza PRAGMA foreign_keys=ON queste righe resterebbero tutte e otto.
        eq("e le loro righe di dati se ne vanno con loro (CASCADE)", 2,
           conta("SELECT COUNT(*) FROM change_log WHERE chiave='[999]'"));
        eq("nessuna riga di dati orfana", 0,
           conta("SELECT COUNT(*) FROM change_log c"
                 + " WHERE c.op_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM op_log o WHERE o.id=c.op_id)"));


        sezione("POTATURA A MANO");
        // ⚠️ Esiste anche — anzi soprattutto — con la retention automatica spenta: mettere 0
        // nelle impostazioni vuol dire «non potare da solo», non «non potare mai». E deve
        // passare dallo stesso blocco della manutenzione, backup compreso: è il punto in cui
        // si perde roba senza accorgersene.
        app.iniziaRichiesta("setSetting", "desktop");
        app.setAppSetting("journal.retention_days", "0");
        app.terminaRichiesta(true);
        vero("con retention 0 l'app dichiara che non pota da sé",
             Integer.parseInt(String.valueOf(app.infoGiornale().get("retention_giorni"))) == 0);
        vero("e dice se il backup è attivo (serve ad avvisare prima di potare)",
             Boolean.TRUE.equals(app.infoGiornale().get("backup_attivo")));

        try (Connection c = DriverManager.getConnection(url); Statement st = c.createStatement()) {
            for (int g : new int[]{90, 45, 2}) {
                st.executeUpdate("INSERT INTO op_log(ts,etichetta,dettaglio,origine,tipo,stato)"
                        + " VALUES(datetime('now','localtime','-" + g + " days'),'PROVA MANO','g:"
                        + g + "','desktop','utente','attiva')");
                st.executeUpdate("INSERT INTO change_log(op_id,tabella,chiave,verso,riga)"
                        + " VALUES((SELECT MAX(id) FROM op_log),'tags','[998]','U','{\"id\":998}')");
            }
        }
        eq("tre operazioni finte da potare a mano", 3, conta("SELECT COUNT(*) FROM op_log WHERE etichetta='PROVA MANO'"));

        Map<String, Object> esito = app.potaCronologia(30);
        eq("la potatura a mano ignora la retention e usa i giorni chiesti", 1,
           conta("SELECT COUNT(*) FROM op_log WHERE etichetta='PROVA MANO'"));
        eq("e porta via anche le loro righe di dati", 1,
           conta("SELECT COUNT(*) FROM change_log WHERE chiave='[998]'"));
        vero("ha prodotto un backup",
             esito.get("backup") != null && Files.exists(Path.of(String.valueOf(esito.get("backup")))));
        // ⚠️ Il controllo che conta davvero, e l'unico che dimostra l'ORDINE: le tre operazioni
        // non sono più nel database ma sono ancora nella copia, quindi la copia è stata fatta
        // PRIMA del taglio. Senza, «pota» sarebbe un pulsante che butta via la storia senza
        // rete — ed è irreversibile.
        // (Contare i file .bak non funzionerebbe: il nome ha la risoluzione di un secondo,
        // quindi due backup nello stesso secondo si sovrascrivono e il conto non cambia.)
        vero("e il backup contiene ancora le tre operazioni che il taglio ha portato via",
             contaNelBackup(String.valueOf(esito.get("backup")),
                            "SELECT COUNT(*) FROM op_log WHERE etichetta='PROVA MANO'") == 3);

        // ⚠️ Il taglio è `ts < adesso` con la risoluzione di un secondo, quindi le operazioni
        // nate nello STESSO secondo della potatura sopravvivono. Si verifica perciò sulle righe
        // finte, che hanno una data vera e non dipendono dall'istante in cui gira il banco:
        // un controllo su `COUNT(*) = 0` fallirebbe a caso, a seconda di quanto è veloce la
        // macchina.
        app.potaCronologia(0);
        eq("con 0 giorni va via anche quello che era dentro la finestra", 0,
           conta("SELECT COUNT(*) FROM op_log WHERE etichetta='PROVA MANO'"));
        eq("e non restano le loro righe di dati", 0,
           conta("SELECT COUNT(*) FROM change_log WHERE chiave='[998]'"));
        sezione("RIPRISTINO DI UN BACKUP FATTO A CALDO");
        // La prova che conta davvero: il .bak prodotto a caldo si può rimettere al suo posto,
        // e quello che è successo dopo sparisce.
        app.iniziaRichiesta("addTag", "desktop");
        app.addTag(json("{\"name\":\"dopo-il-backup\"}"));
        app.terminaRichiesta(true);
        vero("il tag creato dopo il backup c'è", conta("SELECT COUNT(*) FROM tags WHERE name='dopo-il-backup'") == 1);
        app.restoreBackup(dest, cartellaBak.toString());
        eq("dopo il ripristino il database è tornato a prima", 0,
           conta("SELECT COUNT(*) FROM tags WHERE name='dopo-il-backup'"));
        eq("con i dati del backup al loro posto", txPrima, conta("SELECT COUNT(*) FROM transactions"));
        app.close();
        System.out.println();
        System.out.println(falliti == 0
                ? "════ " + passati + " superate, 0 fallite ════"
                : "════ " + passati + " superate, " + falliti + " FALLITE ════");
        System.exit(falliti == 0 ? 0 : 1);
    }

    // ── I gesti di tutti i giorni ───────────────────────────────────────────────

    @FunctionalInterface interface Azione { void esegui() throws Exception; }

    static List<Object[]> gesti(Database app) {
        List<Object[]> g = new ArrayList<>();
        final int[]  tag = new int[1];
        final long[] tx  = new long[1];
        g.add(new Object[]{"addTag", (Azione) () ->
                tag[0] = ((Number) app.addTag(json("{\"name\":\"prova-giornale\",\"color\":\"#58a6ff\"}")).get("id")).intValue()});
        g.add(new Object[]{"updateTag", (Azione) () ->
                app.updateTag(tag[0], json("{\"name\":\"prova-giornale-bis\",\"color\":\"#d29922\"}"))});
        g.add(new Object[]{"addTransaction", (Azione) () ->
                tx[0] = ((Number) app.addTransaction(json(
                        "{\"date\":\"2026-09-20\",\"amount\":12.34,\"type\":\"expense\","
                        + "\"account_id\":" + primoConto() + ",\"description\":\"prova giornale\"}")).get("id")).longValue()});
        g.add(new Object[]{"deleteTransaction", (Azione) () -> app.deleteTransaction((int) tx[0])});
        g.add(new Object[]{"deleteTag",         (Azione) () -> app.deleteTag(tag[0])});
        return g;
    }

    static int primoConto() throws SQLException { return intUno("SELECT MIN(id) FROM accounts"); }

    // ── Utilità ─────────────────────────────────────────────────────────────────

    /** Contatore di modifica nell'header SQLite (byte 24-27): avanza a ogni transazione che
     *  scrive davvero. È il modo più diretto di dimostrare "l'avvio non ha scritto". */
    static int changeCounter(Path db) throws Exception {
        byte[] h = new byte[28];
        try (var in = Files.newInputStream(db)) { in.read(h); }
        return ((h[24] & 0xff) << 24) | ((h[25] & 0xff) << 16) | ((h[26] & 0xff) << 8) | (h[27] & 0xff);
    }
    static com.google.gson.JsonObject json(String s) {
        return com.google.gson.JsonParser.parseString(s).getAsJsonObject();
    }

    static String uno(String sql) throws SQLException {
        try (Connection c = DriverManager.getConnection(url); Statement st = c.createStatement()) {
            return uno(st, sql);
        }
    }
    static String uno(Statement st, String sql) throws SQLException {
        try (ResultSet rs = st.executeQuery(sql)) { return rs.next() ? String.valueOf(rs.getString(1)) : "-"; }
    }
    static int conta(String sql)  throws SQLException { return Integer.parseInt(uno(sql)); }

    /** Conta dentro un file di backup, in sola lettura. Serve a dimostrare che la copia fatta
     *  prima del taglio contiene ancora quello che il taglio ha portato via: senza questo, la
     *  frase «la storia non si perde, si sposta nei backup» resterebbe una promessa. */
    static int contaNelBackup(String bak, String sql) throws SQLException {
        try (Connection c = DriverManager.getConnection(
                     "jdbc:sqlite:" + bak.replace(java.io.File.separatorChar, '/'));
             Statement st = c.createStatement();
             ResultSet rs = st.executeQuery(sql)) {
            return rs.next() ? rs.getInt(1) : -1;
        }
    }

    /** Come {@link #conta} ma tollera la tabella assente: serve prima della migrazione a v27,
     *  quando op_log non esiste ancora. */
    static int contaTollerante(String sql) {
        try { return conta(sql); } catch (SQLException e) { return 0; }
    }
    static int intUno(String sql) throws SQLException { return Integer.parseInt(uno(sql)); }

    static void sezione(String titolo) {
        System.out.println();
        System.out.println("═══ " + titolo + " " + "═".repeat(Math.max(0, 60 - titolo.length())));
    }
    static void eq(String cosa, Object atteso, Object ottenuto) {
        boolean ok = String.valueOf(atteso).equals(String.valueOf(ottenuto));
        if (verboso && !ok) System.out.println("       atteso: " + atteso + "  ottenuto: " + ottenuto);
        vero(cosa + (verboso && ok ? "  [" + ottenuto + "]" : ""), ok);
    }
    static void vero(String cosa, boolean ok) {
        System.out.println(ok ? "   [OK] " + cosa : "   [FALLITO] " + cosa);
        if (ok) passati++; else falliti++;
    }
}
