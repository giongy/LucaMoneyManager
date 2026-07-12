package com.example.luca_wallet

import android.content.Context
import android.net.Uri
import org.json.JSONObject
import java.time.Instant
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.UUID

/**
 * Coda pendenti Android → desktop.
 *
 * L'app Android NON scrive più le transazioni nel DB SQLite condiviso su OneDrive (operazione
 * fragile: lock, corruzione, conflitti). Ogni transazione inserita fuori casa viene accodata in
 * un file JSON-lines `pending.jsonl` su OneDrive. Il desktop, all'avvio, importa le righe non
 * ancora applicate, le scrive nel DB vero e le marca `applied:true`.
 *
 * Formato: una riga = una transazione, es.
 *   {"id":"a3f1-…","device":"android","created":"…Z","applied":false,
 *    "date":"2026-07-11","amount":1000.0,"type":"expense","category_id":42,
 *    "account_id":3,"to_account_id":null,"description":"pranzo"}
 *
 * `id` (UUID) è la chiave con cui il desktop de-duplica e marca lo stato → nessun doppio conteggio
 * del saldo nella finestra di sincronizzazione OneDrive.
 *
 * Il file coda è un singolo documento SAF che l'utente SELEZIONA (OpenDocument), non crea: OneDrive
 * non lascia creare documenti ad app esterne via SAF né espone alberi navigabili. Il file lo crea
 * il DESKTOP (vuoto, accanto al DB) al primo avvio; Android lo seleziona e ci scrive. DB e coda
 * sono due documenti scelti separatamente, entrambi nella cartella del DB su OneDrive.
 */
object PendingQueue {

    data class Entry(
        val id: String,
        val date: LocalDate,
        val amount: Double,
        val type: String,
        val categoryId: Int?,
        val accountId: Int,
        val toAccountId: Int?,
        val description: String,
        val applied: Boolean,
        val created: String
    )

    // ── Preferenze: URI del file coda ────────────────────────────────────────────

    fun saveQueueUri(context: Context, queueUri: String?) {
        context.getSharedPreferences("luca_wallet", Context.MODE_PRIVATE).edit().apply {
            if (queueUri != null) putString("queue_uri", queueUri) else remove("queue_uri")
            apply()
        }
    }

    fun getQueueUri(context: Context): String? =
        context.getSharedPreferences("luca_wallet", Context.MODE_PRIVATE)
            .getString("queue_uri", null)

    /** True se il file coda è stato scelto/creato → la coda è utilizzabile. */
    fun isAvailable(context: Context): Boolean = getQueueUri(context) != null

    /** URI del documento coda, o null se non ancora configurato. */
    private fun queueUri(context: Context): Uri? =
        getQueueUri(context)?.let { Uri.parse(it) }

    // ── Scrittura (append) ───────────────────────────────────────────────────────

    /**
     * Aggiunge una transazione alla coda. Append reale: rilegge il contenuto esistente e riscrive
     * il tutto con la nuova riga in fondo (SAF non ha modalità "append" affidabile sui provider
     * cloud; il file è piccolo → costo trascurabile).
     *
     * La lettura preliminare NON maschera gli errori: se fallisse e scrivessimo comunque,
     * riscriveremmo la coda con la sola riga nuova perdendo quelle precedenti. Meglio far fallire
     * l'inserimento: l'utente vede l'errore e riprova.
     */
    fun append(
        context: Context,
        date: LocalDate,
        amount: Double,
        type: String,
        categoryId: Int?,
        accountId: Int,
        toAccountId: Int?,
        description: String
    ) {
        val uri = queueUri(context)
            ?: throw Exception("File coda non configurato: impossibile scrivere la coda")

        val entry = JSONObject().apply {
            put("id", UUID.randomUUID().toString())
            put("device", "android")
            put("created", Instant.now().toString())
            put("applied", false)
            put("date", date.format(DateTimeFormatter.ISO_LOCAL_DATE))
            put("amount", amount)
            put("type", type)
            if (categoryId != null) put("category_id", categoryId) else put("category_id", JSONObject.NULL)
            put("account_id", accountId)
            if (toAccountId != null) put("to_account_id", toAccountId) else put("to_account_id", JSONObject.NULL)
            put("description", description)
        }

        // Lettura strict: eccezione se il file non è leggibile (vedi KDoc sopra).
        val existing = context.contentResolver.openInputStream(uri)
            ?.use { it.readBytes().toString(Charsets.UTF_8) }
            ?: throw Exception("File coda non leggibile")

        val sb = StringBuilder(existing)
        if (sb.isNotEmpty() && !sb.endsWith("\n")) sb.append('\n')
        sb.append(entry.toString()).append('\n')

        writeAll(context, uri, sb.toString())
    }

    /**
     * Riscrive l'intero file coda in modalità "w" (fallback "wt" se il provider la rifiuta).
     *
     * Perché "w" e non "wt": col DocumentsProvider di OneDrive le scritture in "wt" finivano
     * nella cache locale ma l'upload automatico non partiva mai — né fsync, né notifyChange, né
     * riletture lo sbloccavano, solo la sync manuale (swipe) nell'app OneDrive. "w" è la modalità
     * standard di DocumentsProvider.openDocument, quella su cui i provider agganciano il
     * "documento modificato → carica". Senza truncate è sicura SOLO perché da Android il file non
     * si accorcia mai: si scrive sempre l'esistente più una riga (append) o l'identico (touch).
     */
    private fun writeAll(context: Context, uri: Uri, content: String) {
        val pfd = try { context.contentResolver.openFileDescriptor(uri, "w") }
                  catch (_: Exception) { null }
            ?: context.contentResolver.openFileDescriptor(uri, "wt")!!
        pfd.use { p ->
            java.io.FileOutputStream(p.fileDescriptor).use { out ->
                out.write(content.toByteArray(Charsets.UTF_8))
                out.flush()
                try { p.fileDescriptor.sync() } catch (_: Exception) {}
            }
        }
        // Best-effort: notifica gli observer locali (widget/UI); non influenza l'upload OneDrive.
        try { context.contentResolver.notifyChange(uri, null) } catch (_: Exception) {}
    }

    /**
     * Sollecita OneDrive a sincronizzare il file coda.
     *
     * ContentResolver.refresh() è l'equivalente programmatico dello swipe nel picker SAF: chiede
     * al DocumentsProvider di risincronizzare il documento (se il provider lo gestisce, include
     * l'upload delle modifiche locali pendenti). La rilettura successiva è best-effort: da sola
     * NON fa partire l'upload (verificato: dopo ogni inserimento la coda viene già riletta subito
     * e dopo 2s senza effetto), ma tiene vivo il processo OneDrive qualche istante ed è gratis.
     * Sola lettura, idempotente; ogni eccezione è ignorata.
     *
     * @return true se il provider dichiara di gestire la richiesta di refresh.
     */
    fun kickUpload(context: Context): Boolean {
        val uri = queueUri(context) ?: return false
        val refreshed = try { context.contentResolver.refresh(uri, null, null) }
                        catch (_: Exception) { false }
        try {
            context.contentResolver.openInputStream(uri)?.use { input ->
                val buf = ByteArray(64 * 1024)
                while (input.read(buf) != -1) { /* scarta: serve solo a tenere sveglio OneDrive */ }
            }
        } catch (_: Exception) {}
        return refreshed
    }

    /** Esito del sollecito manuale di upload (bottone "Forza upload" in PendingActivity). */
    data class KickResult(val touched: Boolean, val refreshSupported: Boolean)

    /**
     * Sollecito manuale: "ritocca" il file riscrivendone il contenuto identico in modalità "w"
     * (nuovo evento di modifica per il provider → rimette in coda di upload anche righe scritte
     * in passato con "wt" e mai caricate), poi chiede il refresh esplicito con kickUpload().
     * Il touch è saltato se la lettura fallisce (mai riscrivere ciò che non si è letto) o se il
     * file è vuoto (niente da caricare).
     *
     * @return null se la coda non è configurata.
     */
    fun forceUploadNow(context: Context): KickResult? {
        val uri = queueUri(context) ?: return null
        val content = try {
            context.contentResolver.openInputStream(uri)?.use { it.readBytes().toString(Charsets.UTF_8) }
        } catch (_: Exception) { null }
        val touched = if (!content.isNullOrEmpty()) {
            try { writeAll(context, uri, content); true } catch (_: Exception) { false }
        } else false
        return KickResult(touched, kickUpload(context))
    }

    // ── Lettura ──────────────────────────────────────────────────────────────────

    private fun readRaw(context: Context, uri: Uri): String = try {
        context.contentResolver.openInputStream(uri)?.use { it.readBytes().toString(Charsets.UTF_8) } ?: ""
    } catch (_: Exception) { "" }

    /** Tutte le entry della coda (applicate e non). Lista vuota se la coda non esiste. */
    fun readAll(context: Context): List<Entry> {
        val uri = queueUri(context) ?: return emptyList()
        val raw = readRaw(context, uri)
        return raw.lineSequence()
            .map { it.trim() }
            .filter { it.isNotEmpty() }
            .mapNotNull { parseLine(it) }
            .toList()
    }

    /** Solo le pendenti NON ancora importate dal desktop. */
    fun readPending(context: Context): List<Entry> = readAll(context).filter { !it.applied }

    private fun parseLine(line: String): Entry? = try {
        val o = JSONObject(line)
        Entry(
            id          = o.optString("id"),
            date        = LocalDate.parse(o.getString("date")),
            amount      = o.getDouble("amount"),
            type        = o.getString("type"),
            categoryId  = if (o.isNull("category_id")) null else o.getInt("category_id"),
            accountId   = o.getInt("account_id"),
            toAccountId = if (o.isNull("to_account_id")) null else o.getInt("to_account_id"),
            description = o.optString("description", ""),
            applied     = o.optBoolean("applied", false),
            created     = o.optString("created", "")
        )
    } catch (_: Exception) { null }

    // ── Delta saldo ──────────────────────────────────────────────────────────────

    /**
     * Variazione di saldo, con segno, prodotta dalle pendenti NON applicate su un conto.
     * Stessa logica del CASE income/expense/transfer usato in DbHelper.getFavoriteAccounts,
     * così Android mostra il saldo già scalato prima che il desktop importi la coda.
     */
    fun deltaForAccount(context: Context, accountId: Int): Double =
        deltasByAccount(context)[accountId] ?: 0.0

    /**
     * Delta di saldo per TUTTI i conti in un'unica lettura della coda (evita di rileggere il file
     * OneDrive una volta per conto e garantisce che i saldi siano coerenti tra loro).
     * Chiave = account_id, valore = variazione con segno delle pendenti non applicate.
     */
    fun deltasByAccount(context: Context): Map<Int, Double> {
        val out = HashMap<Int, Double>()
        for (e in readPending(context)) {
            when (e.type) {
                "income"  -> out.merge(e.accountId,  e.amount, Double::plus)
                "expense" -> out.merge(e.accountId, -e.amount, Double::plus)
                "transfer" -> {
                    out.merge(e.accountId, -e.amount, Double::plus)          // esce dal sorgente
                    e.toAccountId?.let { out.merge(it, e.amount, Double::plus) } // entra nel dest.
                }
            }
        }
        return out
    }
}
