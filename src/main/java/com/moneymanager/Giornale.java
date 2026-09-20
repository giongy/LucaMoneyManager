package com.moneymanager;

import java.sql.SQLException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Deque;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;

/**
 * Giornale delle operazioni: la cronologia di cosa ha fatto l'utente, con sotto le righe di
 * dati che ogni gesto ha cambiato — cioè quanto serve per annullarlo.
 *
 * <p>Due tabelle, due pesi, due ruoli:</p>
 * <ul>
 *   <li><b>{@code op_log}</b> è <b>il gesto</b>: una riga, in italiano, quella che l'utente
 *       legge. È l'erede diretto della riga di testo che fino alla 1.25.x finiva nel
 *       file {@code <db>.log}.</li>
 *   <li><b>{@code change_log}</b> sono <b>le conseguenze sui dati</b>: n righe, in JSON, la
 *       riga di tabella <i>com'era prima</i>. Non si leggono, si eseguono a ritroso.</li>
 * </ul>
 *
 * <p>La cattura non sta nei metodi di scrittura ma in <b>trigger SQLite generati</b> da un
 * elenco unico ({@link #TABELLE}): un metodo di scrittura nuovo è journalato senza che nessuno
 * se ne debba ricordare, e una tabella nuova che non compare nell'elenco viene segnalata da
 * {@link #allineaTrigger()} invece di sparire in silenzio.</p>
 *
 * <p>⚠️ I trigger catturano anche le righe eliminate dalle {@code ON DELETE CASCADE} — verificato
 * su SQLite 3.53.2, e senza bisogno di {@code recursive_triggers}. È il punto su cui si regge
 * tutto: senza, annullare la cancellazione di una transazione ne restituirebbe il guscio
 * <b>senza split né tag</b>.</p>
 *
 * <h2>Il confine dell'operazione</h2>
 * Una richiesta del Bridge = un gesto = una riga in {@code op_log}. Ma l'operazione nasce
 * <b>pigra</b>, alla prima scrittura, e si materializza <b>alla fine</b>:
 * <ol>
 *   <li>il Bridge dichiara soltanto metodo e origine ({@link #iniziaRichiesta}) — zero SQL,
 *       altrimenti ogni lettura diventerebbe una scrittura;</li>
 *   <li>la prima {@code execute()} apre lock e transazione (vedi {@code Database});</li>
 *   <li>i trigger scrivono le righe con {@code op_id = NULL};</li>
 *   <li>alla fine, <b>solo se ci sono righe</b>, {@link #materializza} inserisce la riga di
 *       {@code op_log} e se le assegna con {@code WHERE op_id IS NULL}.</li>
 * </ol>
 *
 * <p>⚠️ <b>Un'operazione che non ha cambiato dati non lascia traccia.</b> Non basta
 * un'annotazione: il giornale non deve mai trasformare un non-evento in una scrittura, perché
 * ogni scrittura costa a OneDrive il ricaricamento del file intero. È la stessa economia che ha
 * tolto gli eventi di sfondo dal vecchio log (1.25.11) e le scritture a vuoto dall'avvio
 * (1.25.9, {@code ensureSystemTags}).</p>
 *
 * <p>⚠️ <b>L'assegnazione con {@code WHERE op_id IS NULL} richiede un solo scrittore per
 * volta.</b> Due operazioni concorrenti (thread UI di JCEF + virtual thread del WebServer) si
 * ruberebbero le righe a vicenda. Lo impedisce il lock di scrittura preso al passo 2, ed è una
 * garanzia in più rispetto a prima: fino alla 1.26.0 solo le scritture dentro {@code inTx}
 * erano serializzate, le {@code execute()} nude no.</p>
 *
 * <p>Il vecchio file {@code <db>.log} non viene più scritto dalla 1.26.0: resta come archivio
 * di sola lettura della storia precedente al giornale, raggiungibile da Cronologia → Archivio.
 * L'app non lo tocca e non lo cancella.</p>
 */
public class Giornale {

    private static final DateTimeFormatter TS = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    /**
     * Le tabelle di dati che finiscono nel giornale. Elenco unico: da qui si generano i
     * trigger e contro questo si verifica l'allineamento all'avvio.
     *
     * <p>⚠️ Restano <b>fuori</b>, e non per dimenticanza:</p>
     * <ul>
     *   <li>{@code op_log}, {@code change_log} — il giornale non registra sé stesso;</li>
     *   <li>{@code sync_meta}, {@code imported_pending} — marcatori di sincronizzazione,
     *       riscritti a ogni operazione: rumore puro, e nessuno vorrebbe annullarli;</li>
     *   <li>{@code schema_version}, {@code android_metadata}, {@code sqlite_*} — servizio.</li>
     * </ul>
     */
    static final List<String> TABELLE = List.of(
            "accounts", "categories", "transactions", "transaction_splits", "transaction_tags",
            "tags", "budgets", "budget_config", "scheduled_transactions",
            "scheduled_transaction_tags", "portfolio", "portfolio_transactions",
            "forecasts", "forecast_categories", "notes", "note_tags",
            "reports", "range_presets", "app_settings");

    /** Tabelle che esistono ma NON vanno journalate: serve a distinguere "esclusa di proposito"
     *  da "tabella nuova che nessuno ha aggiunto all'elenco" nella guardia di allineamento. */
    private static final List<String> ESCLUSE_NOTE = List.of(
            "op_log", "change_log", "sync_meta", "imported_pending",
            "schema_version", "android_metadata");

    /**
     * Chiavi di {@code app_settings} che NON sono preferenze ma <b>stato di navigazione</b>,
     * riscritto a ogni clic: il periodo scelto in Transazioni, il range del flusso di cassa,
     * la modalità delle proiezioni. Senza filtro, cambiare periodo scriverebbe ~700 byte di
     * giornale — circa 600 KB al mese di niente.
     *
     * <p>⚠️ È un elenco di <b>esclusione</b>, non di inclusione. Una preferenza nuova viene
     * quindi journalata per default: fa rumore, che è visibile e innocuo. Con un elenco di
     * inclusione verrebbe dimenticata e perderebbe l'annullamento <b>in silenzio</b>.</p>
     */
    private static final List<String> CHIAVI_VOLATILI = List.of(
            "tx.range", "cf.range", "proj.", "fc.", "portfolio.active_only");

    private final Database db;

    /** false finché op_log/change_log non esistono di sicuro (primo avvio su DB nuovo):
     *  prima di allora non si materializza niente, e non c'è niente da materializzare. */
    private volatile boolean attivo = false;

    /** L'operazione in corso sul thread chiamante. Una per richiesta, mai condivisa. */
    private final ThreadLocal<Operazione> corrente = new ThreadLocal<>();

    private int contatoreSavepoint = 0;

    Giornale(String dbPath, Database db) {
        this.db = db;
        setDbPath(dbPath);
    }

    // ── L'operazione in corso ────────────────────────────────────────────────────

    /** Un gesto dell'utente: ciò che sta fra l'inizio e la fine di una richiesta del Bridge. */
    static final class Operazione {
        final String metodo;
        final String origine;
        final boolean implicita;      // nata da una scrittura fuori da una richiesta dichiarata
        boolean aperta;               // lock preso e transazione aperta
        java.sql.Connection conn;     // catturata all'apertura, mai riletta dal campo di Database
        final Set<Long> annullate = new TreeSet<>();   // le operazioni che questa annulla
        final List<String[]> annotazioni = new ArrayList<>();   // {etichetta, campi}

        Operazione(String metodo, String origine, boolean implicita) {
            this.metodo = metodo; this.origine = origine; this.implicita = implicita;
        }
    }

    /** Dichiara l'inizio di una richiesta. Non scrive nulla: una lettura non deve costare
     *  una riga di giornale. Da bilanciare sempre con {@link #fineRichiesta()}. */
    void iniziaRichiesta(String metodo, String origine) {
        // ⚠️ Trovare un contesto con la TRANSAZIONE ancora aperta significa che una richiesta
        // precedente non è stata chiusa: da lì in poi le righe catturate finirebbero sotto il
        // gesto sbagliato. Va su app.log, che non è sincronizzato — segnalare non costa niente
        // a OneDrive.
        // Un contesto solo *presente* non è invece un errore: `Database.avvia()` annida di
        // proposito, mettendo da parte il contesto esterno e rimettendolo con ripristina().
        Operazione appesa = corrente.get();
        if (appesa != null && appesa.aperta)
            System.err.println("[Giornale] ⚠️ operazione '" + appesa.metodo + "' ancora aperta"
                    + " all'inizio di '" + metodo + "': confine di richiesta sbilanciato");
        corrente.set(new Operazione(metodo, origine, false));
    }

    /** Apre un'operazione implicita attorno a una scrittura che non passa da una richiesta
     *  dichiarata (avvio, manutenzione, strumenti). Senza, le righe catturate resterebbero
     *  con {@code op_id IS NULL} e verrebbero assegnate all'operazione successiva — cioè al
     *  gesto sbagliato. */
    void iniziaImplicita() {
        corrente.set(new Operazione("(interna)", "interno", true));
    }

    /** Dimentica l'operazione del thread corrente. */
    void fineRichiesta() { corrente.remove(); }

    /** Rimette al suo posto un contesto messo da parte: serve a {@code Database.avvia()}, che
     *  può girare <b>dentro</b> una richiesta (il cambio di database arriva dal Bridge) e non
     *  deve rubarle il contesto. */
    void ripristina(Operazione op) {
        if (op == null) corrente.remove(); else corrente.set(op);
    }

    Operazione corrente() { return corrente.get(); }

    String nomeSavepoint() { return "sp" + (++contatoreSavepoint); }

    // ── Annotazioni ─────────────────────────────────────────────────────────────

    /**
     * Annota cosa sta facendo l'operazione in corso.
     *
     * <p>La firma è <b>la stessa</b> del vecchio {@code DbLogger.log}: è ciò che ha permesso di
     * sostituire il meccanismo senza toccare di un carattere gli ~85 punti di chiamata in
     * {@link Database}. Il testo non finisce più in un file, ma nell'operazione in corso.</p>
     *
     * @param azione etichetta dell'operazione (es. "TRANSAZIONE ELIMINATA")
     * @param campi  coppie "chiave:valore"
     */
    public void log(String azione, String... campi) {
        Operazione op = corrente.get();
        if (op != null) op.annotazioni.add(new String[]{ azione, String.join(" · ", campi) });
    }

    // ── Materializzazione ───────────────────────────────────────────────────────

    /**
     * Chiude l'operazione scrivendone la riga in {@code op_log} e assegnandole le righe di
     * {@code change_log} rimaste senza padrone. Da chiamare <b>dentro</b> la transazione
     * dell'operazione, appena prima del commit: così la riga di cronologia e i dati che
     * descrive o ci sono entrambi, o non c'è nessuno dei due.
     *
     * <p>⚠️ Se non ci sono righe da assegnare non scrive niente — nemmeno quando ci sono
     * annotazioni. Un avvio, un {@code integrity_check} o un {@code UPDATE} che non trova
     * righe non devono lasciare traccia: sarebbe una scrittura su un file che OneDrive
     * ricarica per intero.</p>
     */
    void materializza(Operazione op) throws SQLException {
        if (!attivo) return;

        Map<String, Object> n = db.queryOne("SELECT COUNT(*) AS n FROM change_log WHERE op_id IS NULL");
        if (n == null || ((Number) n.get("n")).longValue() == 0) return;

        boolean utente = !op.annotazioni.isEmpty()
                      && ("desktop".equals(op.origine) || "lan".equals(op.origine));

        long id = db.execute(
                "INSERT INTO op_log(ts,etichetta,dettaglio,origine,tipo,stato,annulla_op)"
                + " VALUES(?,?,?,?,?,'attiva',?)",
                LocalDateTime.now().format(TS), etichetta(op), dettaglio(op), op.origine,
                utente ? "utente" : "sistema",
                op.annullate.isEmpty() ? null : op.annullate.iterator().next());

        db.execute("UPDATE change_log SET op_id=? WHERE op_id IS NULL", id);

        // Il legame fra le operazioni si scrive qui perché è l'unico punto in cui si conosce
        // l'id della nuova. Le operazioni annullate NON spariscono e non vengono riscritte:
        // si marcano soltanto. La storia si aggiunge, non si corregge — ed è ciò che rende
        // l'annullamento a sua volta annullabile (il "ripeti").
        for (long annullata : op.annullate)
            db.execute("UPDATE op_log SET annullata_da=? WHERE id=?", id, annullata);
        if (!op.annullate.isEmpty()) ricalcolaStati();
    }

    /**
     * Ricalcola quali operazioni sono <b>in vigore</b>, dopo un annullamento.
     *
     * <p>⚠️ Lo stato non si aggiorna a colpi locali: si deriva. Un'operazione è annullata se
     * e solo se esiste un annullamento <b>ancora in vigore</b> che l'ha disfatta — e quello a
     * sua volta può essere stato annullato. Marcare soltanto «annullata» chi viene disfatto,
     * senza guardare la catena, produce una pagina che mente: dopo annulla → ripeti → annulla
     * → ripeti la transazione è tornata al suo posto ma la sua riga resta barrata, col
     * pulsante «ripeti» puntato a un annullamento a sua volta annullato.</p>
     *
     * <p>Il calcolo va <b>dalla più recente alla più vecchia</b>: chi annulla è sempre più
     * recente di ciò che annulla, quindi arrivando a un'operazione si sa già se il suo
     * annullatore è in vigore. Nessuna ricorsione, una passata sola.</p>
     *
     * <p>Gira solo quando l'operazione appena chiusa è un annullamento: è l'unico momento in
     * cui questi stati possono cambiare. {@code annullata_da} non si azzera mai — resta il
     * riferimento all'ultimo annullatore, e serve al «ripeti».</p>
     */
    private void ricalcolaStati() throws SQLException {
        Map<Long, Boolean> inVigore = new HashMap<>();
        for (Map<String, Object> o : db.queryList(
                "SELECT id, stato, annullata_da FROM op_log ORDER BY id DESC")) {
            long id = ((Number) o.get("id")).longValue();
            String stato = String.valueOf(o.get("stato"));
            // Un'operazione non annullabile è comunque in vigore: semplicemente non la si può
            // disfare, e il suo stato non è un'informazione da ricalcolare.
            if ("non_annullabile".equals(stato)) { inVigore.put(id, true); continue; }
            Object da = o.get("annullata_da");
            boolean viva = da == null || !Boolean.TRUE.equals(inVigore.get(((Number) da).longValue()));
            inVigore.put(id, viva);
            String nuovo = viva ? "attiva" : "annullata";
            if (!nuovo.equals(stato)) db.execute("UPDATE op_log SET stato=? WHERE id=?", nuovo, id);
        }
    }

    /** L'etichetta è l'<b>ultima</b> annotazione: è quella che chiude l'operazione e la
     *  descrive meglio (in {@code buyStock} è "TITOLO ACQUISTATO", non la commissione che la
     *  precede). Senza annotazioni resta il nome del metodo del Bridge. */
    private static String etichetta(Operazione op) {
        if (op.annotazioni.isEmpty()) return op.metodo;
        return op.annotazioni.get(op.annotazioni.size() - 1)[0];
    }

    /** Con una sola annotazione il dettaglio sono i suoi campi; con più di una, ciascuna viene
     *  prefissata dalla propria etichetta — altrimenti i campi di operazioni diverse si
     *  mescolerebbero in un unico elenco illeggibile. */
    private static String dettaglio(Operazione op) {
        if (op.annotazioni.isEmpty()) return null;
        if (op.annotazioni.size() == 1) return op.annotazioni.get(0)[1];
        return op.annotazioni.stream()
                .map(a -> a[0] + ": " + a[1])
                .collect(Collectors.joining(" | "));
    }

    // ── Annullamento ────────────────────────────────────────────────────────────

    /**
     * Annulla un'operazione rimettendo le righe com'erano prima.
     *
     * <p>Non conosce il dominio: applica una regola sola, a ritroso.</p>
     *
     * <table>
     *   <tr><th>verso</th><th>inverso</th></tr>
     *   <tr><td>{@code I}</td><td>{@code DELETE} della riga identificata dalla chiave</td></tr>
     *   <tr><td>{@code U}</td><td>{@code UPDATE} con i valori di {@code riga}</td></tr>
     *   <tr><td>{@code D}</td><td>{@code INSERT} di {@code riga}, id originale compreso</td></tr>
     * </table>
     *
     * <p>⚠️ <b>Per il verso {@code U} si usa {@code UPDATE}, mai {@code INSERT OR REPLACE}.</b>
     * Sembra equivalente e non lo è: {@code REPLACE} <b>cancella</b> la riga in conflitto prima
     * di reinserirla, e quella cancellazione fa scattare le {@code ON DELETE CASCADE}. Misurato:
     * rimettere una riga madre con REPLACE le porta via le due figlie. Nel dominio vero
     * significa che annullare la modifica di una transazione la restituirebbe <b>senza split e
     * senza tag</b>, con la transazione dall'aspetto giusto e i totali per categoria sbagliati.
     * È esattamente il danno silenzioso che tutto questo meccanismo esiste per evitare.</p>
     *
     * <p>⚠️ È per questo che il controllo 3 non è solo una guardia: stabilendo se la riga
     * esiste, è lui a dire <b>quale istruzione</b> usare.</p>
     *
     * @return {@code {ok:true, righe:n}} oppure {@code {ok:false, motivo:…, bloccanti:[…]}}
     */
    public Map<String, Object> annulla(long opId) throws SQLException {
        return annullaInsieme(new TreeSet<>(List.of(opId)));
    }

    /**
     * Annulla un'operazione <b>insieme a tutte quelle che la bloccano</b>, calcolate come
     * insieme minimo e transitivo.
     *
     * <p>È la prima delle due strade offerte quando {@link #annulla} rifiuta. Non è "riporta
     * tutto indietro": se fra l'operazione e oggi ci sono venti gesti ma solo uno tocca le
     * stesse righe, si annullano due operazioni, non ventuno.</p>
     */
    public Map<String, Object> annullaACatena(long opId) throws SQLException {
        return annullaInsieme(bloccantiTransitivi(opId));
    }

    /** Riporta il database a prima di un'operazione: annulla lei e tutto ciò che è venuto dopo.
     *  Per costruzione non ha conflitti — è la stessa ragione per cui {@code deletePortfolioItem}
     *  annulla in {@code date DESC, id DESC}. */
    public Map<String, Object> riportaA(long opId) throws SQLException {
        Set<Long> insieme = new TreeSet<>();
        for (Map<String, Object> r : db.queryList(
                "SELECT id FROM op_log WHERE id >= ? AND stato='attiva' ORDER BY id", opId))
            insieme.add(((Number) r.get("id")).longValue());
        if (insieme.isEmpty()) return rifiuto("Non c'è niente da riportare indietro da qui.", List.of());
        return annullaInsieme(insieme);
    }

    /**
     * Il motore: annulla un insieme di operazioni come <b>un solo gesto</b>.
     *
     * <p>⚠️ Annullarle una per una, in sequenza, non funzionerebbe: ogni annullamento è a sua
     * volta un'operazione che tocca quelle stesse righe, quindi l'annullamento di B diventerebbe
     * subito un conflitto per A. Applicandole insieme il problema non si pone — e in cronologia
     * resta una riga sola, «annullate 3 operazioni», che si può disfare in un colpo.</p>
     */
    private Map<String, Object> annullaInsieme(Set<Long> insieme) throws SQLException {
        Operazione op = corrente.get();
        if (op == null) throw new SQLException("annulla() va chiamato dentro una richiesta");

        long opId = insieme.iterator().next();   // la più vecchia: è lei a dettare i conflitti
        List<String> etichette = new ArrayList<>();
        for (long id : insieme) {
            Map<String, Object> testa = db.queryOne("SELECT * FROM op_log WHERE id=?", id);
            if (testa == null) throw new SQLException("Operazione " + id + " non trovata.");
            etichette.add("#" + id + " " + testa.get("etichetta"));
            String stato = String.valueOf(testa.get("stato"));
            if ("annullata".equals(stato))
                return rifiuto("L'operazione #" + id + " è già stata annullata.", List.of());
            if ("non_annullabile".equals(stato))
                return rifiuto("L'operazione #" + id + " non è annullabile: " + testa.get("motivo"), List.of());
        }

        // Tutte le righe delle operazioni coinvolte, dalla più recente alla più vecchia:
        // gli id di change_log sono globali e crescenti, quindi un solo ORDER BY le mette
        // nell'ordine giusto anche fra operazioni diverse.
        List<Map<String, Object>> righe = db.queryList(
                "SELECT tabella, chiave, verso, riga FROM change_log WHERE op_id IN " + in(insieme)
                + " ORDER BY id DESC");
        if (righe.isEmpty())
            return rifiuto("Le modifiche di questa operazione non sono più nel giornale:"
                    + " è più vecchia della finestra di annullamento. Resta il ripristino da un backup.",
                    List.of());

        // ── Controllo 1: qualcuno FUORI dall'insieme ha toccato queste righe dopo? ──
        List<Map<String, Object>> conflitti = db.queryList("""
                SELECT DISTINCT o.id, o.ts, o.etichetta, o.dettaglio
                FROM change_log d JOIN op_log o ON o.id = d.op_id
                WHERE d.op_id > ? AND o.stato = 'attiva' AND d.op_id NOT IN """ + in(insieme) + """
                  AND (d.tabella, d.chiave) IN (SELECT tabella, chiave FROM change_log WHERE op_id IN """
                + in(insieme) + """
                )
                ORDER BY o.id
                """, opId);
        if (!conflitti.isEmpty())
            return rifiuto("Altre operazioni più recenti hanno modificato le stesse righe:"
                    + " vanno annullate prima di questa.", conflitti);

        // La transazione deve essere aperta PRIMA del pragma: defer_foreign_keys vale per la
        // transazione in corso e viene azzerato a ogni commit.
        db.assicuraTransazioneAperta();
        rimandaChiaviEsterne(op);

        // ── Controllo 3: la realtà corrisponde a quello che il giornale si aspetta? ──
        //
        // ⚠️ Va simulato in sequenza, non valutato riga per riga in modo indipendente: dentro
        // UNA operazione la stessa riga può essere toccata più volte. `updateTransaction`, per
        // dirne una, riscrive i tag cancellandoli e reinserendoli — quindi la stessa chiave
        // compare sia come I sia come D. Controllando le righe isolatamente, la D direbbe "esiste
        // già" (è vero: la I non è ancora stata disfatta) e ogni modifica con tag o split
        // risulterebbe non annullabile.
        Map<String, Boolean> simulato = new LinkedHashMap<>();
        for (Map<String, Object> r : righe) {
            String tabella = (String) r.get("tabella"), verso = (String) r.get("verso");
            String chiave = (String) r.get("chiave");
            String k = tabella + "#" + chiave;
            boolean esiste = simulato.containsKey(k) ? simulato.get(k) : rigaEsiste(tabella, chiave);
            if ("D".equals(verso)) {
                if (esiste) return rifiuto("Una riga che l'annullamento dovrebbe ricreare esiste già ("
                        + tabella + "): il database non corrisponde al giornale.", List.of());
                simulato.put(k, true);            // la reinseriamo
            } else {
                if (!esiste) return rifiuto("Una riga che l'annullamento dovrebbe " +
                        ("I".equals(verso) ? "eliminare" : "modificare")
                        + " non esiste più (" + tabella + "): il database non corrisponde al giornale.",
                        List.of());
                simulato.put(k, !"I".equals(verso));   // la I la cancella, la U la lascia
            }
        }

        // ── Controllo 2: le righe da rimettere puntano a roba che esiste ancora? ──
        Map<String, Object> mancante = dipendenzaMancante(righe, simulato);
        if (mancante != null) {
            List<Map<String, Object>> colpevole = db.queryList("""
                    SELECT DISTINCT o.id, o.ts, o.etichetta, o.dettaglio
                    FROM change_log d JOIN op_log o ON o.id = d.op_id
                    WHERE d.tabella = ? AND d.verso = 'D' AND o.stato = 'attiva'
                      AND CAST(json_extract(d.chiave,'$[0]') AS TEXT) = ?
                    ORDER BY o.id DESC LIMIT 1
                    """, mancante.get("tabella"), mancante.get("valore"));
            return rifiuto("Manca qualcosa a cui queste righe fanno riferimento: "
                    + mancante.get("descrizione") + ".", colpevole);
        }

        for (Map<String, Object> r : righe) applicaInverso(r);

        // L'annullamento è a sua volta un'operazione: il legame si scrive in materializza(),
        // che è l'unico punto in cui si conosce il suo id.
        op.annullate.addAll(insieme);
        // ⚠️ L'annotazione non è decorativa: senza, l'operazione nascerebbe senza etichetta e
        // quindi `tipo='sistema'` — cioè nascosta di default nella pagina che l'ha appena
        // prodotta. Annullare è un gesto dell'utente e va letto come tale.
        log(insieme.size() == 1 ? "OPERAZIONE ANNULLATA" : "OPERAZIONI ANNULLATE",
            "operazioni:" + String.join(" · ", etichette), "righe:" + righe.size());
        return Map.of("ok", true, "righe", righe.size(), "operazioni", new ArrayList<>(insieme));
    }

    /**
     * L'insieme minimo di operazioni da annullare perché {@code opId} sia annullabile:
     * lei, chi la blocca, chi blocca loro, e così via.
     *
     * <p>⚠️ Chi blocca è sempre <b>più recente</b> di ciò che blocca — un'operazione non può
     * essere ostacolata dal passato. Il calcolo quindi termina sempre, e ne discende una
     * proprietà utile: se un'operazione è ancora annullabile lo sono anche tutte quelle che la
     * bloccano, perché sono più recenti e quindi dentro la stessa finestra di retention. La
     * potatura non può mettere in un vicolo cieco.</p>
     */
    private Set<Long> bloccantiTransitivi(long opId) throws SQLException {
        Set<Long> insieme = new TreeSet<>();
        insieme.add(opId);
        Deque<Long> daEsaminare = new ArrayDeque<>(insieme);
        while (!daEsaminare.isEmpty()) {
            long id = daEsaminare.poll();
            for (long b : bloccantiDiretti(id))
                if (insieme.add(b)) daEsaminare.add(b);
        }
        return insieme;
    }

    /** Le operazioni che impediscono di annullare {@code opId}: quelle che hanno toccato le
     *  stesse righe dopo (controllo 1) e quella che ha eliminato un padre di cui ha bisogno
     *  (controllo 2). */
    private List<Long> bloccantiDiretti(long opId) throws SQLException {
        List<Long> out = new ArrayList<>();
        for (Map<String, Object> r : db.queryList("""
                SELECT DISTINCT d.op_id AS id
                FROM change_log d JOIN op_log o ON o.id = d.op_id
                WHERE d.op_id > ? AND o.stato = 'attiva'
                  AND (d.tabella, d.chiave) IN (SELECT tabella, chiave FROM change_log WHERE op_id = ?)
                """, opId, opId))
            out.add(((Number) r.get("id")).longValue());

        List<Map<String, Object>> righe = db.queryList(
                "SELECT tabella, chiave, verso, riga FROM change_log WHERE op_id=? ORDER BY id DESC", opId);
        Map<String, Boolean> finti = new LinkedHashMap<>();
        for (Map<String, Object> r : righe)
            finti.put(r.get("tabella") + "#" + r.get("chiave"), !"I".equals(r.get("verso")));
        Map<String, Object> mancante = dipendenzaMancante(righe, finti);
        if (mancante != null) {
            for (Map<String, Object> r : db.queryList("""
                    SELECT d.op_id AS id FROM change_log d JOIN op_log o ON o.id = d.op_id
                    WHERE d.tabella = ? AND d.verso = 'D' AND o.stato = 'attiva'
                      AND CAST(json_extract(d.chiave,'$[0]') AS TEXT) = ?
                    ORDER BY d.id DESC LIMIT 1
                    """, mancante.get("tabella"), mancante.get("valore")))
                out.add(((Number) r.get("id")).longValue());
        }
        return out;
    }

    /** Elenco di id per una clausola IN, costruito da long: nessun valore arriva da fuori. */
    private static String in(Set<Long> ids) {
        return "(" + ids.stream().map(String::valueOf).collect(Collectors.joining(",")) + ")";
    }

    private static Map<String, Object> rifiuto(String motivo, List<Map<String, Object>> bloccanti) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("ok", false);
        m.put("motivo", motivo);
        m.put("bloccanti", bloccanti);
        return m;
    }

    /** Attiva {@code defer_foreign_keys} e verifica che abbia preso: senza, l'ordine di
     *  reinserimento tornerebbe a contare e una figlia rimessa prima della madre farebbe
     *  fallire l'annullamento per un motivo che non è un vero conflitto. */
    private void rimandaChiaviEsterne(Operazione op) throws SQLException {
        try (java.sql.Statement st = op.conn.createStatement()) {
            st.execute("PRAGMA defer_foreign_keys=ON");
            try (java.sql.ResultSet rs = st.executeQuery("PRAGMA defer_foreign_keys")) {
                if (!rs.next() || rs.getInt(1) != 1)
                    throw new SQLException("defer_foreign_keys non attivo: annullamento interrotto"
                            + " prima di scrivere (l'ordine di reinserimento non sarebbe sicuro).");
            }
        }
    }

    /** La prima dipendenza non soddisfatta fra le righe da rimettere, o null se tutto a posto.
     *  @param simulato stato di ogni riga DOPO l'annullamento, calcolato dal controllo 3 */
    private Map<String, Object> dipendenzaMancante(List<Map<String, Object>> righe,
                                                   Map<String, Boolean> simulato) throws SQLException {
        // ⚠️ Le righe che l'annullamento sta per rimettere contano come PRESENTI: senza questo,
        // ogni annullamento di una cancellazione verrebbe rifiutato, perché le figlie puntano
        // sempre a una madre che in quel momento non c'è ancora.
        Set<String> inArrivo = new HashSet<>();
        for (Map.Entry<String, Boolean> e : simulato.entrySet()) {
            if (!e.getValue()) continue;
            String[] parti = e.getKey().split("#", 2);
            inArrivo.add(parti[0] + "#" + primoValoreChiave(parti[1]));
        }

        for (Map<String, Object> r : righe) {
            if ("I".equals(r.get("verso"))) continue;   // questa riga sparisce, non ha dipendenze
            String tabella = (String) r.get("tabella"), riga = (String) r.get("riga");
            if (riga == null) continue;
            for (String[] fk : chiaviEsterne(tabella)) {
                String valore = jsonCampo(riga, fk[0]);
                if (valore == null) continue;
                if (inArrivo.contains(fk[1] + "#" + valore)) continue;
                if (esisteValore(fk[1], fk[2], valore)) continue;
                return Map.of("tabella", fk[1], "valore", valore,
                        "descrizione", tabella + "." + fk[0] + " punta a " + fk[1]
                                + " " + valore + ", che non esiste più");
            }
        }
        return null;
    }

    /** Applica l'inverso di una riga di giornale. Vedi la tabella in {@link #annulla}. */
    private void applicaInverso(Map<String, Object> r) throws SQLException {
        String tabella = (String) r.get("tabella");
        String chiave  = (String) r.get("chiave");
        String verso   = (String) r.get("verso");
        String riga    = (String) r.get("riga");
        List<String> colonne = colonne(tabella), pk = chiavePrimaria(tabella);

        if ("I".equals(verso)) {
            db.execute("DELETE FROM " + tabella + " WHERE " + doveChiave(pk),
                    ripeti(chiave, pk.size()));
            return;
        }
        if ("U".equals(verso)) {
            StringBuilder set = new StringBuilder();
            for (int i = 0; i < colonne.size(); i++)
                set.append(i > 0 ? "," : "").append(colonne.get(i))
                   .append("=json_extract(?,'$.").append(colonne.get(i)).append("')");
            Object[] par = new Object[colonne.size() + pk.size()];
            Arrays.fill(par, 0, colonne.size(), riga);
            Arrays.fill(par, colonne.size(), par.length, chiave);
            db.execute("UPDATE " + tabella + " SET " + set + " WHERE " + doveChiave(pk), par);
            return;
        }
        StringBuilder val = new StringBuilder();
        for (int i = 0; i < colonne.size(); i++)
            val.append(i > 0 ? "," : "").append("json_extract(?,'$.").append(colonne.get(i)).append("')");
        db.execute("INSERT INTO " + tabella + "(" + String.join(",", colonne) + ") VALUES(" + val + ")",
                ripeti(riga, colonne.size()));
    }

    private static String doveChiave(List<String> pk) {
        StringBuilder w = new StringBuilder();
        for (int i = 0; i < pk.size(); i++)
            w.append(i > 0 ? " AND " : "").append(pk.get(i))
             .append("=json_extract(?,'$[").append(i).append("]')");
        return w.toString();
    }

    private static Object[] ripeti(String v, int n) {
        Object[] p = new Object[n];
        Arrays.fill(p, v);
        return p;
    }

    private boolean rigaEsiste(String tabella, String chiave) throws SQLException {
        List<String> pk = chiavePrimaria(tabella);
        return db.queryOne("SELECT 1 AS x FROM " + tabella + " WHERE " + doveChiave(pk),
                ripeti(chiave, pk.size())) != null;
    }

    private boolean esisteValore(String tabella, String colonna, String valore) throws SQLException {
        return db.queryOne("SELECT 1 AS x FROM " + tabella + " WHERE CAST(" + colonna
                + " AS TEXT)=?", valore) != null;
    }

    private String jsonCampo(String riga, String campo) throws SQLException {
        Map<String, Object> r = db.queryOne("SELECT json_extract(?,'$." + campo + "') AS v", riga);
        Object v = r != null ? r.get("v") : null;
        return v != null ? String.valueOf(v) : null;
    }

    private static String primoValoreChiave(String chiave) {
        return chiave.replaceAll("[\\[\\]\"]", "").split(",")[0];
    }

    // Metadati dello schema: letti una volta sola, non cambiano durante la sessione.
    private final Map<String, List<String>> cacheColonne = new HashMap<>();
    private final Map<String, List<String>> cacheChiave  = new HashMap<>();
    private final Map<String, List<String[]>> cacheFk    = new HashMap<>();

    private List<String> colonne(String tabella) throws SQLException {
        if (!cacheColonne.containsKey(tabella)) leggiMetadati(tabella);
        return cacheColonne.get(tabella);
    }

    private List<String> chiavePrimaria(String tabella) throws SQLException {
        if (!cacheChiave.containsKey(tabella)) leggiMetadati(tabella);
        return cacheChiave.get(tabella);
    }

    private void leggiMetadati(String tabella) throws SQLException {
        List<String> col = new ArrayList<>(), pk = new ArrayList<>();
        for (Map<String, Object> c : db.queryList(
                "SELECT name, pk FROM pragma_table_info(?) ORDER BY cid", tabella)) {
            col.add((String) c.get("name"));
            if (((Number) c.get("pk")).intValue() > 0) pk.add((String) c.get("name"));
        }
        cacheColonne.put(tabella, col);
        cacheChiave.put(tabella, pk);
    }

    /** {@code {colonna, tabella padre, colonna padre}} per ogni chiave esterna della tabella. */
    private List<String[]> chiaviEsterne(String tabella) throws SQLException {
        List<String[]> fk = cacheFk.get(tabella);
        if (fk != null) return fk;
        fk = new ArrayList<>();
        for (Map<String, Object> r : db.queryList(
                "SELECT \"from\" AS da, \"table\" AS padre, \"to\" AS a FROM pragma_foreign_key_list(?)", tabella))
            fk.add(new String[]{(String) r.get("da"), (String) r.get("padre"),
                    r.get("a") != null ? (String) r.get("a") : "id"});
        cacheFk.put(tabella, fk);
        return fk;
    }

    // ── Lettura: quello che la pagina Cronologia mostra ──────────────────────────

    /**
     * Le operazioni del giornale, dalla più recente.
     *
     * <p>Non filtra e non pagina: con la retention a 30 giorni sono qualche centinaio di righe,
     * e la pagina filtra in locale come faceva il vecchio visualizzatore del {@code .log} —
     * scrivere ogni filtro anche in SQL sarebbe una seconda copia delle stesse regole.</p>
     *
     * <p>Ogni operazione porta con sé i <b>nomi di oggi</b> delle categorie e dei conti che ha
     * toccato: il giornale registra il nome del momento, e dopo un rinomina la pagina deve poter
     * scrivere «categoria: Carburante (oggi: Benzina)». ⚠️ Il nome storico non si sostituisce mai
     * con quello attuale — quel giorno si chiamava così, e riscriverlo falsificherebbe la
     * storia.</p>
     */
    public List<Map<String, Object>> cronologia(int limite) throws SQLException {
        List<Map<String, Object>> ops = db.queryList("""
                SELECT o.id, o.ts, o.etichetta, o.dettaglio, o.origine, o.tipo, o.stato, o.motivo,
                       o.annulla_op, o.annullata_da,
                       (SELECT COUNT(*) FROM change_log c WHERE c.op_id = o.id) AS righe
                FROM op_log o ORDER BY o.id DESC LIMIT ?""", limite);
        if (ops.isEmpty()) return ops;
        aggiungiNomiDiOggi(ops);
        return ops;
    }

    /**
     * Per ogni operazione, i nomi <b>attuali</b> delle categorie e dei conti che ha toccato.
     *
     * <p>Gli id si leggono dalle righe di {@code change_log}, che li conservano: è il motivo per
     * cui il confronto è possibile. Le righe di verso {@code I} non hanno un "prima" e quindi
     * non contribuiscono — ma è proprio sulle modifiche e sulle cancellazioni che il nome
     * congelato confonde, quindi il caso utile è coperto.</p>
     *
     * <p>Tre query in tutto, non una per operazione: l'intervallo di id coperto è quello delle
     * ultime <i>n</i> operazioni, quindi basta un {@code BETWEEN}.</p>
     */
    private void aggiungiNomiDiOggi(List<Map<String, Object>> ops) throws SQLException {
        long max = ((Number) ops.get(0).get("id")).longValue();
        long min = ((Number) ops.get(ops.size() - 1).get("id")).longValue();
        Set<Long> idCategorie = new TreeSet<>(), idConti = new TreeSet<>();
        List<Object[]> usi = new ArrayList<>();        // {op_id, category_id, account_id}
        for (Map<String, Object> r : db.queryList("""
                SELECT op_id, json_extract(riga,'$.category_id') AS categoria,
                       json_extract(riga,'$.account_id')  AS conto
                FROM change_log
                WHERE op_id BETWEEN ? AND ? AND riga IS NOT NULL""", min, max)) {
            long op = ((Number) r.get("op_id")).longValue();
            Long cat = r.get("categoria") instanceof Number n ? n.longValue() : null;
            Long acc = r.get("conto")     instanceof Number n ? n.longValue() : null;
            if (cat != null) idCategorie.add(cat);
            if (acc != null) idConti.add(acc);
            if (cat != null || acc != null) usi.add(new Object[]{op, cat, acc});
        }
        if (usi.isEmpty()) return;
        Map<Long, String> nomiCategorie = nomiDi("categories", idCategorie);
        Map<Long, String> nomiConti     = nomiDi("accounts",   idConti);

        Map<Long, Map<String, Set<String>>> perOp = new HashMap<>();
        for (Object[] u : usi) {
            Map<String, Set<String>> m = perOp.computeIfAbsent((Long) u[0], k -> new LinkedHashMap<>());
            String nc = u[1] != null ? nomiCategorie.get((Long) u[1]) : null;
            String na = u[2] != null ? nomiConti.get((Long) u[2])     : null;
            if (nc != null) m.computeIfAbsent("categoria", k -> new TreeSet<>()).add(nc);
            if (na != null) m.computeIfAbsent("conto",     k -> new TreeSet<>()).add(na);
        }
        for (Map<String, Object> o : ops) {
            Map<String, Set<String>> m = perOp.get(((Number) o.get("id")).longValue());
            if (m == null) continue;
            Map<String, Object> nomi = new LinkedHashMap<>();
            m.forEach((k, v) -> nomi.put(k, new ArrayList<>(v)));
            o.put("nomi_oggi", nomi);
        }
    }

    /** {@code id → name} per un insieme di id già validati come numeri. */
    private Map<Long, String> nomiDi(String tabella, Set<Long> ids) throws SQLException {
        Map<Long, String> out = new HashMap<>();
        if (ids.isEmpty()) return out;
        for (Map<String, Object> r : db.queryList(
                "SELECT id, name FROM " + tabella + " WHERE id IN "
                + ids.stream().map(String::valueOf).collect(Collectors.joining(",", "(", ")"))))
            out.put(((Number) r.get("id")).longValue(), String.valueOf(r.get("name")));
        return out;
    }

    /** Peso e copertura del giornale: quello che la pagina mostra in testa. */
    public Map<String, Object> infoGiornale() throws SQLException {
        Map<String, Object> out = new LinkedHashMap<>();
        Map<String, Object> o = db.queryOne(
                "SELECT COUNT(*) AS n, MIN(ts) AS dal, MAX(ts) AS al FROM op_log");
        Map<String, Object> c = db.queryOne("""
                SELECT COUNT(*) AS n, COALESCE(SUM(LENGTH(COALESCE(riga,''))+LENGTH(chiave)),0) AS peso
                FROM change_log""");
        out.put("operazioni", o != null ? o.get("n")   : 0);
        out.put("dal",        o != null ? o.get("dal") : null);
        out.put("al",         o != null ? o.get("al")  : null);
        out.put("righe",      c != null ? c.get("n")   : 0);
        // Peso del solo contenuto JSON: sottostima il costo su disco (indici e intestazioni di
        // pagina non ci sono dentro), ma è l'unico numero che si ottiene senza scrivere.
        out.put("byte", c != null ? c.get("peso") : 0);
        Map<String, Object> r = db.queryOne(
                "SELECT value FROM app_settings WHERE key='journal.retention_days'");
        int giorni = 30;
        if (r != null) try { giorni = Integer.parseInt(String.valueOf(r.get("value")).trim()); }
                       catch (NumberFormatException ignored) { /* valore sporco: resta il default */ }
        out.put("retention_giorni", giorni);
        return out;
    }

    /**
     * Cosa ha cambiato un'operazione, riga per riga: è il corpo che la pagina apre espandendo
     * una voce.
     *
     * <p>Per una modifica mostra <b>solo i campi diversi</b>, confrontando la riga registrata
     * (il prima) con quella attuale: registrare anche il dopo raddoppierebbe il peso del
     * giornale per un'informazione che è già nella tabella.</p>
     */
    public Map<String, Object> dettaglioOperazione(long opId) throws SQLException {
        Map<String, Object> testa = db.queryOne("SELECT * FROM op_log WHERE id=?", opId);
        if (testa == null) throw new SQLException("Operazione " + opId + " non trovata.");
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> r : db.queryList(
                "SELECT tabella, chiave, verso, riga FROM change_log WHERE op_id=? ORDER BY id", opId)) {
            String tabella = (String) r.get("tabella"), verso = (String) r.get("verso");
            String chiave  = (String) r.get("chiave"),  riga   = (String) r.get("riga");
            Map<String, Object> prima = riga == null ? Map.of() : jsonInMappa(riga);
            Map<String, Object> ora   = "D".equals(verso) ? Map.of() : rigaAttuale(tabella, chiave);
            List<Map<String, Object>> campi = new ArrayList<>();
            for (String col : colonne(tabella)) {
                String p = testo(prima.get(col)), d = testo(ora.get(col));
                if ("U".equals(verso) && java.util.Objects.equals(p, d)) continue;
                Map<String, Object> campo = new LinkedHashMap<>();
                campo.put("campo", col);
                campo.put("prima", "I".equals(verso) ? null : p);
                campo.put("dopo",  "D".equals(verso) ? null : d);
                campi.add(campo);
            }
            Map<String, Object> voce = new LinkedHashMap<>();
            voce.put("tabella",    tabella);
            voce.put("verso",      verso);
            voce.put("chiave",     chiave);
            voce.put("esiste_ora", !ora.isEmpty());
            voce.put("campi",      campi);
            out.add(voce);
        }
        return Map.of("operazione", testa, "righe", out);
    }

    private static String testo(Object v) { return v == null ? null : String.valueOf(v); }

    /** Il JSON di una riga di {@code change_log} come mappa colonna→valore, letto da SQLite
     *  stesso: è lui che l'ha scritto, ed è lui a sapere come rileggerlo. */
    private Map<String, Object> jsonInMappa(String json) throws SQLException {
        Map<String, Object> m = new LinkedHashMap<>();
        for (Map<String, Object> r : db.queryList("SELECT key, value FROM json_each(?)", json))
            m.put(String.valueOf(r.get("key")), r.get("value"));
        return m;
    }

    /** La riga com'è adesso, o una mappa vuota se non esiste più. */
    private Map<String, Object> rigaAttuale(String tabella, String chiave) throws SQLException {
        List<String> pk = chiavePrimaria(tabella);
        Map<String, Object> r = db.queryOne("SELECT * FROM " + tabella + " WHERE " + doveChiave(pk),
                ripeti(chiave, pk.size()));
        return r == null ? Map.of() : r;
    }

    // ── Trigger: generazione e guardia di allineamento ───────────────────────────

    /**
     * Allinea i trigger di cattura allo schema reale, e segnala le tabelle scoperte.
     *
     * <p>Confronta il testo <b>generato</b> dei trigger attesi con la colonna {@code sql} di
     * {@code sqlite_master}: identici ⇒ <b>non scrive niente</b> (l'avvio resta a scrittura
     * zero); diversi ⇒ {@code DROP} + {@code CREATE} dei soli divergenti.</p>
     *
     * <p>⚠️ Il confronto è con la realtà, non con una firma memorizzata da qualche parte:
     * non può sfasarsi. È ciò che rende l'invariante «ogni tabella di dati è journalata» una
     * cosa che il codice verifica, invece di una cosa da ricordare.</p>
     */
    void allineaTrigger() throws SQLException {
        Map<String, String> attesi = new LinkedHashMap<>();
        for (String t : TABELLE) {
            List<String> colonne = new ArrayList<>(), chiave = new ArrayList<>();
            for (Map<String, Object> c : db.queryList(
                    "SELECT name, pk FROM pragma_table_info(?) ORDER BY cid", t)) {
                colonne.add((String) c.get("name"));
                if (((Number) c.get("pk")).intValue() > 0) chiave.add((String) c.get("name"));
            }
            // Tabella assente (DB non ancora migrato) o senza chiave primaria: niente trigger,
            // ci pensa la guardia qui sotto a farlo notare.
            if (colonne.isEmpty() || chiave.isEmpty()) continue;
            for (String verso : new String[]{"I", "U", "D"})
                attesi.put(nomeTrigger(t, verso), sqlTrigger(t, verso, colonne, chiave));
        }

        Map<String, String> presenti = new LinkedHashMap<>();
        for (Map<String, Object> r : db.queryList(
                "SELECT name, sql FROM sqlite_master WHERE type='trigger' AND name LIKE 'jr\\_%' ESCAPE '\\'"))
            presenti.put((String) r.get("name"), (String) r.get("sql"));

        int rifatti = 0;
        for (Map.Entry<String, String> e : attesi.entrySet()) {
            if (e.getValue().equals(presenti.get(e.getKey()))) continue;
            db.executeRaw("DROP TRIGGER IF EXISTS " + e.getKey());
            db.executeRaw(e.getValue());
            rifatti++;
        }
        for (String nome : presenti.keySet()) {
            if (attesi.containsKey(nome)) continue;   // trigger di una tabella non più journalata
            db.executeRaw("DROP TRIGGER IF EXISTS " + nome);
            rifatti++;
        }
        if (rifatti > 0)
            System.err.println("[Giornale] trigger riallineati: " + rifatti + " su " + attesi.size());

        attivo = true;
        // La soglia delle modifiche di sessione si fissa qui: da questo momento in poi ciò
        // che compare in op_log è opera di questa sessione. Fissarla più tardi (alla prima
        // domanda, che arriva alla chiusura) direbbe sempre "nessuna modifica".
        resetSession();
        segnalaTabelleScoperte();
    }

    /**
     * ⚠️ La guardia vera: una tabella di dati che non è né journalata né esclusa di proposito
     * è una tabella le cui modifiche <b>non si possono annullare</b>, e nessuno se ne
     * accorgerebbe mai. Qui diventa una riga in {@code app.log} — che non è sincronizzato,
     * quindi segnalare non costa niente a OneDrive.
     */
    private void segnalaTabelleScoperte() throws SQLException {
        List<String> scoperte = new ArrayList<>();
        for (Map<String, Object> r : db.queryList(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite\\_%' ESCAPE '\\'")) {
            String t = (String) r.get("name");
            if (!TABELLE.contains(t) && !ESCLUSE_NOTE.contains(t)) scoperte.add(t);
        }
        if (!scoperte.isEmpty())
            System.err.println("[Giornale] ⚠️ tabelle senza giornale (aggiungerle a Giornale.TABELLE"
                    + " o a ESCLUSE_NOTE): " + String.join(", ", scoperte));
    }

    private static String nomeTrigger(String tabella, String verso) {
        return "jr_" + tabella + "_" + verso.toLowerCase();
    }

    /**
     * Il testo di un trigger di cattura. Su una riga sola e senza {@code IF NOT EXISTS}:
     * è il testo con cui verrà confrontato quello in {@code sqlite_master}, che SQLite
     * conserva esattamente come lo riceve.
     *
     * <p>Per {@code INSERT} la riga vecchia è {@code NULL} (prima non esisteva): basta la
     * chiave per sapere cosa cancellare annullando. Per {@code UPDATE} si registra <b>solo il
     * prima</b> — il dopo è già nella tabella, e registrarlo raddoppierebbe il peso per
     * niente.</p>
     */
    private static String sqlTrigger(String tabella, String verso, List<String> colonne, List<String> chiave) {
        String pref   = "I".equals(verso) ? "NEW." : "OLD.";
        String evento = switch (verso) { case "I" -> "INSERT"; case "U" -> "UPDATE"; default -> "DELETE"; };
        String jChiave = "json_array(" + chiave.stream().map(c -> pref + c).collect(Collectors.joining(",")) + ")";
        String jRiga   = "I".equals(verso) ? "NULL"
                : "json_object(" + colonne.stream().map(c -> "'" + c + "',OLD." + c).collect(Collectors.joining(",")) + ")";
        return "CREATE TRIGGER " + nomeTrigger(tabella, verso)
             + " AFTER " + evento + " ON " + tabella + filtro(tabella, verso)
             + " BEGIN INSERT INTO change_log(op_id,tabella,chiave,verso,riga) VALUES("
             + "NULL,'" + tabella + "'," + jChiave + ",'" + verso + "'," + jRiga + "); END";
    }

    /** La {@code WHEN} che tiene fuori dal giornale lo stato di navigazione salvato in
     *  {@code app_settings}. Vuota per tutte le altre tabelle. */
    private static String filtro(String tabella, String verso) {
        if (!"app_settings".equals(tabella)) return "";
        String rif = "D".equals(verso) ? "OLD.key" : "NEW.key";
        return " WHEN " + CHIAVI_VOLATILI.stream()
                .map(p -> rif + " NOT LIKE '" + p + "%'")
                .collect(Collectors.joining(" AND "));
    }

    // ── Modifiche di sessione: la domanda del backup all'uscita ──────────────────

    /**
     * L'ultima operazione già coperta da un backup. Sopra questa soglia ci sono le modifiche
     * di questa sessione.
     *
     * <p>Prende il posto di tre campi e di tutta la loro aritmetica ({@code startOffset},
     * {@code shiftSessionOffset}, {@code removedBytesBeforeOffset}), che esistevano per
     * rispondere <i>contando byte in un file di testo</i> a una domanda che è un
     * {@code COUNT}. Tre bug pagati stavano lì dentro.</p>
     */
    private volatile long sogliaSessione = 0;

    /** True se in questa sessione l'<b>utente</b> ha cambiato qualcosa.
     *  ⚠️ Solo {@code tipo='utente'}: avvio, manutenzione e importazioni non devono far
     *  scattare alla chiusura il backup dell'intero database. */
    public boolean hasChanges() {
        if (!attivo) return false;
        try {
            Map<String, Object> r = db.queryOne(
                    "SELECT EXISTS(SELECT 1 FROM op_log WHERE id > ? AND tipo='utente') AS x",
                    sogliaSessione);
            return r != null && ((Number) r.get("x")).intValue() == 1;
        } catch (SQLException e) {
            // Dal lato sicuro: se non si riesce a leggere il giornale si fa il backup.
            System.err.println("[Giornale] hasChanges: " + e.getMessage());
            return true;
        }
    }

    /** Sposta la soglia all'ultima operazione: da qui in poi si riparte a contare.
     *  Chiamata dopo un backup riuscito e all'avvio. */
    public void resetSession() {
        if (!attivo) return;
        try {
            Map<String, Object> r = db.queryOne("SELECT COALESCE(MAX(id),0) AS n FROM op_log");
            sogliaSessione = r == null ? 0 : ((Number) r.get("n")).longValue();
        } catch (SQLException e) {
            System.err.println("[Giornale] resetSession: " + e.getMessage());
        }
    }

    /** Le operazioni dell'utente da quando è stata fissata la soglia: è ciò che finisce nel
     *  sidecar {@code .json} accanto al {@code .bak} (che sparisce in fase 4, quando il
     *  backup imparerà a leggersi il proprio {@code op_log}). */
    public List<Map<String, Object>> getSessionEntries() {
        if (!attivo) return List.of();
        try {
            List<Map<String, Object>> out = new ArrayList<>();
            for (Map<String, Object> r : db.queryList(
                    "SELECT ts, etichetta, dettaglio FROM op_log WHERE id > ? AND tipo='utente'"
                    + " ORDER BY id", sogliaSessione))
                out.add(Map.of("time", String.valueOf(r.get("ts")),
                               "op",   String.valueOf(r.get("etichetta")),
                               "desc", r.get("dettaglio") == null ? "" : String.valueOf(r.get("dettaglio"))));
            return out;
        } catch (SQLException e) {
            System.err.println("[Giornale] getSessionEntries: " + e.getMessage());
            return List.of();
        }
    }

    // ── Formattazione dei campi di un'annotazione ───────────────────────────────
    //
    // Usate da ~70 punti di `Database` nelle chiamate a log(). Erano statiche in DbLogger
    // insieme alla scrittura del file di testo, ma non c'entravano con quella: formattano il
    // VALORE di un campo, e il campo oggi finisce nel giornale.

    /** Un numero come importo leggibile (due decimali); {@code null} → {@code "0.00"}. */
    static String amt(Object v) {
        if (v == null) return "0.00";
        double d = ((Number) v).doubleValue();
        return String.format("%.2f", d);
    }

    /** Stringa da un Object qualsiasi; {@code null} → {@code "-"}. */
    static String s(Object v) {
        return v != null ? v.toString() : "-";
    }

    // ── Il vecchio .log: archivio di sola lettura ────────────────────────────────
    //
    // Dalla 1.26.0 l'app non lo scrive più e non lo tocca. Non è inutile: contiene la storia
    // PRECEDENTE al giornale, che il giornale non ha. Lo si legge dalla Cronologia, pulsante
    // «Archivio». Lo cancella l'utente, se vuole: l'app non cancella file suoi.
    // ⚠️ Effetto collaterale gradito su OneDrive: un file sincronizzato in meno che veniva
    // ricaricato per intero a ogni riga scritta.
    //
    // ⚠️ Qui non si scrive: c'è solo il percorso. Se un giorno servisse di nuovo scrivere un
    // registro testuale, non è questo il posto — va su app.log, che non è sincronizzato.

    private volatile java.nio.file.Path archivio;

    /** Ricalcola il percorso dell'archivio quando si cambia database. */
    public void setDbPath(String dbPath) {
        if (dbPath == null || dbPath.isBlank()) { archivio = null; return; }
        java.nio.file.Path db = java.nio.file.Path.of(dbPath);
        String base = db.getFileName().toString().replaceAll("\\.[^.]+$", "");
        archivio = db.resolveSibling(base + ".log");
    }

    /** Il vecchio {@code <db>.log}, o {@code null} se non c'è un database aperto.
     *  Può non esistere su disco: un database nato dalla 1.26.0 non ne ha mai avuto uno. */
    public java.nio.file.Path getLogFile() { return archivio; }
}
