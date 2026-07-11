package com.example.luca_wallet

import android.content.Context
import android.net.Uri
import androidx.documentfile.provider.DocumentFile
import org.json.JSONObject
import java.io.FileInputStream
import java.time.Instant
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.UUID

/**
 * Coda pendenti Android → desktop.
 *
 * L'app Android NON scrive più le transazioni nel DB SQLite condiviso su OneDrive (operazione
 * fragile: lock, corruzione, conflitti). Ogni transazione inserita fuori casa viene accodata in
 * un file JSON-lines `pending.jsonl` che vive nella STESSA cartella del DB su OneDrive. Il desktop,
 * all'avvio, importa le righe non ancora applicate, le scrive nel DB vero e le marca `applied:true`.
 *
 * Formato: una riga = una transazione, es.
 *   {"id":"a3f1-…","device":"android","created":"…Z","applied":false,
 *    "date":"2026-07-11","amount":1000.0,"type":"expense","category_id":42,
 *    "account_id":3,"to_account_id":null,"description":"pranzo"}
 *
 * `id` (UUID) è la chiave con cui il desktop de-duplica e marca lo stato → nessun doppio conteggio
 * del saldo nella finestra di sincronizzazione OneDrive.
 *
 * Il file richiede un tree URI (cartella scelta con OpenDocumentTree): da un URI a singolo
 * documento — quello del vecchio flusso OpenDocument — SAF non consente di creare fratelli, quindi
 * la coda è disponibile solo dopo che l'utente ha selezionato la CARTELLA del DB.
 */
object PendingQueue {

    private const val QUEUE_NAME = "pending.jsonl"
    private const val QUEUE_MIME = "application/x-ndjson"

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

    // ── Preferenze: tree URI della cartella del DB ───────────────────────────────

    fun saveTreeUri(context: Context, treeUri: String?) {
        context.getSharedPreferences("luca_wallet", Context.MODE_PRIVATE).edit().apply {
            if (treeUri != null) putString("db_tree_uri", treeUri) else remove("db_tree_uri")
            apply()
        }
    }

    fun getTreeUri(context: Context): String? =
        context.getSharedPreferences("luca_wallet", Context.MODE_PRIVATE)
            .getString("db_tree_uri", null)

    /** True se conosciamo la cartella del DB → la coda è utilizzabile. */
    fun isAvailable(context: Context): Boolean = getTreeUri(context) != null

    /** File .db presenti nella cartella scelta (per selezionare il DB dopo OpenDocumentTree). */
    fun listDatabases(context: Context, treeUri: Uri): List<DocumentFile> {
        val dir = DocumentFile.fromTreeUri(context, treeUri) ?: return emptyList()
        if (!dir.isDirectory) return emptyList()
        return dir.listFiles().filter { it.isFile && (it.name?.endsWith(".db", ignoreCase = true) == true) }
    }

    // ── Accesso al file coda ─────────────────────────────────────────────────────

    /** Ritorna il DocumentFile della coda, creandolo se non esiste. Null se il tree non è noto. */
    private fun queueFile(context: Context, create: Boolean): DocumentFile? {
        val treeUriStr = getTreeUri(context) ?: return null
        val dir = DocumentFile.fromTreeUri(context, Uri.parse(treeUriStr)) ?: return null
        if (!dir.isDirectory) return null
        val existing = dir.findFile(QUEUE_NAME)
        if (existing != null) return existing
        if (!create) return null
        return dir.createFile(QUEUE_MIME, QUEUE_NAME)
    }

    // ── Scrittura (append) ───────────────────────────────────────────────────────

    /**
     * Aggiunge una transazione alla coda. Append reale: rilegge il contenuto esistente e riscrive
     * il tutto con la nuova riga in fondo, poi forza fsync sul ParcelFileDescriptor
     * così OneDrive committa subito senza attendere un refresh manuale.
     *
     * Nota: SAF non ha modalità "append" affidabile su tutti i provider (OneDrive tronca in "wt"),
     * perciò leggiamo-e-riscriviamo. Il file è piccolo (poche righe) → costo trascurabile.
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
        val file = queueFile(context, create = true)
            ?: throw Exception("Cartella DB non selezionata: impossibile scrivere la coda")

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

        val existing = readRaw(context, file)
        val sb = StringBuilder(existing)
        if (sb.isNotEmpty() && !sb.endsWith("\n")) sb.append('\n')
        sb.append(entry.toString()).append('\n')

        context.contentResolver.openFileDescriptor(file.uri, "wt")!!.use { pfd ->
            java.io.FileOutputStream(pfd.fileDescriptor).use { out ->
                out.write(sb.toString().toByteArray(Charsets.UTF_8))
                out.flush()
                try { pfd.fileDescriptor.sync() } catch (_: Exception) {}
            }
        }
        // Sveglia OneDrive: notifyChange fa partire l'upload senza refresh manuale.
        try { context.contentResolver.notifyChange(file.uri, null) } catch (_: Exception) {}
    }

    // ── Lettura ──────────────────────────────────────────────────────────────────

    private fun readRaw(context: Context, file: DocumentFile): String = try {
        context.contentResolver.openInputStream(file.uri)?.use { it.readBytes().toString(Charsets.UTF_8) } ?: ""
    } catch (_: Exception) { "" }

    /** Tutte le entry della coda (applicate e non). Lista vuota se la coda non esiste. */
    fun readAll(context: Context): List<Entry> {
        val file = queueFile(context, create = false) ?: return emptyList()
        val raw = readRaw(context, file)
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
