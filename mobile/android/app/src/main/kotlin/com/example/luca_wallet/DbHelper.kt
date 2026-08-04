package com.example.luca_wallet

import android.content.Context
import android.content.Intent
import android.database.sqlite.SQLiteDatabase
import android.net.Uri
import android.provider.OpenableColumns
import java.io.File
import java.io.FileOutputStream

object DbHelper {

    data class Account(
        val id: Int,
        val name: String,
        val icon: String,
        val color: String,
        val balance: Double,
        val currency: String,
        val isFavorite: Boolean
    )

    data class Category(
        val id: Int,
        val displayName: String  // "Macro: Sottocategoria"
    )

    private var db: SQLiteDatabase? = null
    private var localPath: String? = null
    private var openedAt: String? = null

    /** True se il DB è stato configurato (path noto), indipendentemente dalla connessione aperta. */
    val isConfigured: Boolean get() = localPath != null

    val currentFilename: String? get() = localPath?.substringAfterLast('/')

    /** Valore last_modified del DB attualmente aperto (null se non ancora aperto). */
    val lastModified: String? get() = openedAt

    /** Legge last_modified da un file SQLite arbitrario senza toccare la connessione principale. */
    fun readLastModifiedFromPath(path: String): String? = try {
        SQLiteDatabase.openDatabase(path, null, SQLiteDatabase.OPEN_READONLY).use { tmp ->
            tmp.rawQuery("SELECT value FROM sync_meta WHERE key='last_modified' LIMIT 1", null)
                .use { c -> if (c.moveToFirst()) c.getString(0) else null }
        }
    } catch (_: Exception) { null }

    // ── Preferences ───────────────────────────────────────────────────────────

    fun savePrefs(context: Context, path: String?, uri: String?) {
        context.getSharedPreferences("luca_wallet", Context.MODE_PRIVATE).edit().apply {
            if (path != null) putString("db_path", path) else remove("db_path")
            if (uri != null) putString("db_content_uri", uri) else remove("db_content_uri")
            apply()
        }
    }

    fun getSavedPath(context: Context): String? =
        context.getSharedPreferences("luca_wallet", Context.MODE_PRIVATE)
            .getString("db_path", null)

    fun getSavedContentUri(context: Context): String? =
        context.getSharedPreferences("luca_wallet", Context.MODE_PRIVATE)
            .getString("db_content_uri", null)

    // ── File I/O ─────────────────────────────────────────────────────────────

    /** Cancella il file locale e tutti i file SQLite associati (-wal, -shm, -journal). */
    fun clearLocalCache(context: Context) {
        val path = localPath ?: getSavedPath(context) ?: return
        val base = File(path)
        for (suffix in listOf("", "-wal", "-shm", "-journal")) {
            File(base.absolutePath + suffix).delete()
        }
    }

    fun copyUriToLocal(context: Context, uri: Uri): String {
        try {
            val flags = Intent.FLAG_GRANT_READ_URI_PERMISSION or
                        Intent.FLAG_GRANT_WRITE_URI_PERMISSION
            context.contentResolver.takePersistableUriPermission(uri, flags)
        } catch (_: Exception) {}

        val displayName = resolveDisplayName(context, uri) ?: "database.db"
        val localFile = File(context.filesDir, displayName)

        // Rimuovi file residui SQLite prima di sovrascrivere
        for (suffix in listOf("", "-wal", "-shm", "-journal")) {
            File(localFile.absolutePath + suffix).delete()
        }

        context.contentResolver.openInputStream(uri)!!.use { input ->
            FileOutputStream(localFile).use { output -> input.copyTo(output) }
        }
        return localFile.absolutePath
    }

    private fun resolveDisplayName(context: Context, uri: Uri): String? = try {
        context.contentResolver.query(uri, null, null, null, null)?.use { c ->
            val col = c.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (col >= 0 && c.moveToFirst()) c.getString(col) else null
        }
    } catch (_: Exception) { null }

    // ── Connessione ───────────────────────────────────────────────────────────

    // Il parametro uri non è più memorizzato (Android è read-only: non riscrive più il DB
    // sull'URI OneDrive). Firma mantenuta per non toccare i chiamanti (MainActivity, widget).
    @Suppress("UNUSED_PARAMETER")
    fun openDb(path: String, uri: Uri?): String? {
        return try {
            closeDb()
            localPath = path
            ensureOpen()
            openedAt = readLastModified()
            null
        } catch (e: Exception) {
            localPath = null
            db = null
            "Errore apertura DB:\n${e.message}"
        }
    }

    /**
     * Apre la connessione se chiusa, senza ri-scaricare da OneDrive.
     * READ-ONLY: Android non scrive più il DB condiviso (le transazioni vanno sulla coda
     * pending.jsonl, vedi PendingQueue). Aprire read-only elimina ogni lock di scrittura →
     * OneDrive è sempre libero di sincronizzare e non c'è rischio di corruzione.
     */
    @Synchronized
    fun ensureOpen() {
        if (db?.isOpen == true) return
        val path = localPath ?: throw Exception("Database non configurato")
        db = SQLiteDatabase.openDatabase(path, null, SQLiteDatabase.OPEN_READONLY)
    }

    /** Chiude la connessione e rimuove file WAL/SHM residui. */
    @Synchronized
    fun closeDb() {
        db?.close()
        db = null
        localPath?.let { path ->
            for (suffix in listOf("-wal", "-shm")) {
                File(path + suffix).delete()
            }
        }
    }

    // ── sync_meta (sola lettura) ────────────────────────────────────────────────
    // Android è read-only: legge last_modified solo per capire se OneDrive ha portato una
    // versione più recente del DB (notifica "DB aggiornato"). Non scrive più sync_meta.

    private fun readLastModified(): String? = try {
        db!!.rawQuery(
            "SELECT value FROM sync_meta WHERE key='last_modified' LIMIT 1", null
        ).use { c -> if (c.moveToFirst()) c.getString(0) else null }
    } catch (_: Exception) { null }

    // ── Queries ───────────────────────────────────────────────────────────────

    /**
     * Conti preferiti con saldo. Il saldo include il DELTA delle transazioni ancora in coda
     * (PendingQueue): se sei in vacanza e hai inserito 2 spese non ancora importate dal desktop,
     * il conto le mostra già scalate. Passare context per leggere la coda.
     */
    fun getFavoriteAccounts(context: Context): List<Account> {
        if (!isConfigured) return emptyList()
        ensureOpen()
        val base = db!!.rawQuery("""
            SELECT a.id, a.name, a.icon, a.color, a.currency, a.initial_balance,
                COALESCE(SUM(
                    CASE
                        WHEN t.type='income'                               THEN  t.amount
                        WHEN t.type='expense'                              THEN -t.amount
                        WHEN t.type='transfer' AND t.account_id    = a.id  THEN -t.amount
                        WHEN t.type='transfer' AND t.to_account_id = a.id  THEN  t.amount
                        ELSE 0
                    END
                ), 0) AS movements
            FROM accounts a
            LEFT JOIN transactions t ON t.account_id = a.id OR t.to_account_id = a.id
            WHERE a.is_favorite = 1 AND a.is_closed = 0
            GROUP BY a.id
            ORDER BY a.name ASC
        """.trimIndent(), null).use { c ->
            buildList {
                while (c.moveToNext()) add(Account(
                    id         = c.getInt(0),
                    name       = c.getString(1) ?: "",
                    icon       = c.getString(2) ?: "🏦",
                    color      = c.getString(3) ?: "#58a6ff",
                    currency   = c.getString(4) ?: "EUR",
                    balance    = c.getDouble(5) + c.getDouble(6),
                    isFavorite = true
                ))
            }
        }
        // Somma il delta delle pendenti non ancora importate (saldo "come sarà" dopo l'import).
        // Una sola lettura della coda per tutti i conti → saldi coerenti tra loro.
        val deltas = PendingQueue.deltasByAccount(context)
        return base.map { it.copy(balance = it.balance + (deltas[it.id] ?: 0.0)) }
    }

    fun getAllAccounts(): List<Account> {
        if (!isConfigured) return emptyList()
        ensureOpen()
        return db!!.rawQuery("""
            SELECT id, name, icon, color, currency, is_favorite
            FROM accounts WHERE is_closed = 0
            ORDER BY is_favorite DESC, name ASC
        """.trimIndent(), null).use { c ->
            buildList {
                while (c.moveToNext()) add(Account(
                    id         = c.getInt(0),
                    name       = c.getString(1) ?: "",
                    icon       = c.getString(2) ?: "🏦",
                    color      = c.getString(3) ?: "#58a6ff",
                    currency   = c.getString(4) ?: "EUR",
                    balance    = 0.0,
                    isFavorite = c.getInt(5) == 1
                ))
            }
        }
    }

    /**
     * Sottocategorie proponibili in inserimento. Da telefono se ne usano poche (spesa, benzina,
     * bar): sul desktop si marcano con `categories.mobile_favorite` e qui si mostrano solo quelle,
     * così l'elenco resta corto. Se non ne è marcata nessuna — o il DB è ancora a uno schema
     * precedente alla v23, senza quella colonna — si ricade sull'elenco completo: meglio scorrere
     * che restare senza categorie.
     */
    fun getSubCategories(type: String): List<Category> {
        if (!isConfigured) return emptyList()
        ensureOpen()
        val favorites = try { querySubCategories(type, onlyMobile = true) }
                        catch (_: Exception) { emptyList() }   // colonna assente: DB pre-v23
        return favorites.ifEmpty { querySubCategories(type, onlyMobile = false) }
    }

    private fun querySubCategories(type: String, onlyMobile: Boolean): List<Category> {
        val mobileFilter = if (onlyMobile) "AND c.mobile_favorite = 1" else ""
        return db!!.rawQuery("""
            SELECT c.id, c.name, p.name
            FROM categories c
            JOIN categories p ON c.parent_id = p.id
            WHERE c.type = ? $mobileFilter
            ORDER BY p.name ASC, c.name ASC
        """.trimIndent(), arrayOf(type)).use { c ->
            buildList {
                while (c.moveToNext()) {
                    val name   = c.getString(1) ?: ""
                    val parent = c.getString(2) ?: ""
                    add(Category(c.getInt(0), "$parent: $name"))
                }
            }
        }
    }

    /** Mappa id → "Macro: Sottocategoria" per tutte le categorie (per risolvere le pendenti). */
    fun getAllCategoryNames(): Map<Int, String> {
        if (!isConfigured) return emptyMap()
        ensureOpen()
        return db!!.rawQuery("""
            SELECT c.id, c.name, p.name
            FROM categories c
            LEFT JOIN categories p ON c.parent_id = p.id
        """.trimIndent(), null).use { c ->
            buildMap {
                while (c.moveToNext()) {
                    val name   = c.getString(1) ?: ""
                    val parent = c.getString(2)
                    put(c.getInt(0), if (parent != null) "$parent: $name" else name)
                }
            }
        }
    }

}
