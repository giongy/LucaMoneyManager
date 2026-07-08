package com.example.luca_wallet

import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.database.sqlite.SQLiteDatabase
import android.net.Uri
import android.provider.OpenableColumns
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.time.LocalDate
import java.time.format.DateTimeFormatter

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
    private var contentUri: Uri? = null
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

    private fun writeLocalBackToUri(context: Context) {
        val uri  = contentUri  ?: return
        val path = localPath   ?: return
        // Scrivi via ParcelFileDescriptor e forza fsync: openOutputStream(uri) da solo lascia
        // i byte in un buffer del DocumentsProvider di OneDrive, che non fa partire l'upload
        // finché un'operazione successiva (es. la lettura allo swipe) non forza il flush. Con
        // pfd.fileDescriptor.sync() committiamo subito → OneDrive sincronizza senza refresh manuale.
        context.contentResolver.openFileDescriptor(uri, "wt")!!.use { pfd ->
            FileOutputStream(pfd.fileDescriptor).use { output ->
                FileInputStream(path).use { input -> input.copyTo(output) }
                output.flush()
                try { pfd.fileDescriptor.sync() } catch (_: Exception) {}
            }
        }
    }

    /**
     * Sveglia OneDrive a far partire l'upload rileggendo integralmente il documento dall'URI —
     * lo stesso "kick" che di fatto fa lo swipe, ma isolato: NON tocca la copia locale (localPath)
     * né la connessione (db), quindi è sicuro chiamarlo a DB già aperto e stabile.
     * Va invocato con un piccolo ritardo dopo il salvataggio, così la scrittura precedente è
     * gia' propagata e non si rischia di leggere una versione in transito.
     * Best-effort: ogni eccezione è ignorata.
     */
    fun kickOneDriveUpload(context: Context) {
        val uri = contentUri ?: return
        try {
            context.contentResolver.openInputStream(uri)?.use { input ->
                val buf = ByteArray(64 * 1024)
                while (input.read(buf) != -1) { /* scarta: la lettura serve solo a svegliare OneDrive */ }
            }
        } catch (_: Exception) {}
    }

    private fun resolveDisplayName(context: Context, uri: Uri): String? = try {
        context.contentResolver.query(uri, null, null, null, null)?.use { c ->
            val col = c.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (col >= 0 && c.moveToFirst()) c.getString(col) else null
        }
    } catch (_: Exception) { null }

    // ── Connessione ───────────────────────────────────────────────────────────

    fun openDb(path: String, uri: Uri?): String? {
        return try {
            closeDb()
            localPath  = path
            contentUri = uri
            ensureOpen()
            openedAt = readLastModified()
            null
        } catch (e: Exception) {
            localPath = null
            db = null
            "Errore apertura DB:\n${e.message}"
        }
    }

    /** Apre la connessione se chiusa, senza ri-scaricare da OneDrive. */
    @Synchronized
    fun ensureOpen() {
        if (db?.isOpen == true) return
        val path = localPath ?: throw Exception("Database non configurato")
        db = SQLiteDatabase.openDatabase(path, null, SQLiteDatabase.OPEN_READWRITE)
        ensureSyncMeta()
        try {
            db!!.execSQL("PRAGMA journal_mode=DELETE")
            db!!.execSQL("PRAGMA synchronous=FULL")
        } catch (_: Exception) {}
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

    // ── sync_meta ─────────────────────────────────────────────────────────────

    private fun ensureSyncMeta() {
        db!!.execSQL(
            "CREATE TABLE IF NOT EXISTS sync_meta (key TEXT PRIMARY KEY, value TEXT)"
        )
    }

    private fun readLastModified(): String? = try {
        db!!.rawQuery(
            "SELECT value FROM sync_meta WHERE key='last_modified' LIMIT 1", null
        ).use { c -> if (c.moveToFirst()) c.getString(0) else null }
    } catch (_: Exception) { null }

    fun hasConflict(): Boolean {
        if (!isConfigured) return false
        ensureOpen()
        return readLastModified() != openedAt
    }

    fun refreshOpenedAt() {
        ensureOpen()
        openedAt = readLastModified()
    }

    private fun touchSyncMeta(context: Context) {
        val now = java.time.Instant.now().toString()
        db!!.insertWithOnConflict("sync_meta", null,
            ContentValues().apply { put("key", "last_modified"); put("value", now) },
            SQLiteDatabase.CONFLICT_REPLACE)
        db!!.insertWithOnConflict("sync_meta", null,
            ContentValues().apply { put("key", "last_modified_by"); put("value", "android") },
            SQLiteDatabase.CONFLICT_REPLACE)
        try { db!!.rawQuery("PRAGMA wal_checkpoint(TRUNCATE)", null).close() } catch (_: Exception) {}
        // Chiudi prima di scrivere su OneDrive → nessun lock residuo
        closeDb()
        writeLocalBackToUri(context)
        openedAt = now
        // Riapri subito così il prossimo accesso è già pronto.
        ensureOpen()
        // Sollecita OneDrive a far partire l'upload senza attendere uno swipe manuale.
        // Solo notifyChange: non rileggiamo il file dall'URI (interferirebbe con la copia locale
        // e, subito dopo la scrittura, rischierebbe di rileggere la versione vecchia).
        contentUri?.let { uri ->
            try { context.contentResolver.notifyChange(uri, null) } catch (_: Exception) {}
        }
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    fun getFavoriteAccounts(): List<Account> {
        if (!isConfigured) return emptyList()
        ensureOpen()
        return db!!.rawQuery("""
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

    fun getSubCategories(type: String): List<Category> {
        if (!isConfigured) return emptyList()
        ensureOpen()
        return db!!.rawQuery("""
            SELECT c.id, c.name, p.name
            FROM categories c
            JOIN categories p ON c.parent_id = p.id
            WHERE c.type = ?
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

    // ── Insert ────────────────────────────────────────────────────────────────

    fun insertTransaction(
        context: Context,
        date: LocalDate,
        amount: Double,
        type: String,
        categoryId: Int?,
        accountId: Int,
        toAccountId: Int?,
        description: String
    ) {
        if (!isConfigured) throw Exception("Database non aperto")
        ensureOpen()
        val tagId = getOrCreateTag()
        val txId = db!!.insert("transactions", null, ContentValues().apply {
            put("date", date.format(DateTimeFormatter.ISO_LOCAL_DATE))
            put("amount", amount)
            put("type", type)
            if (categoryId != null) put("category_id", categoryId) else putNull("category_id")
            put("account_id", accountId)
            if (toAccountId != null) put("to_account_id", toAccountId) else putNull("to_account_id")
            put("description", description)
            put("reconciled", 1)
        })
        db!!.insert("transaction_tags", null, ContentValues().apply {
            put("transaction_id", txId)
            put("tag_id", tagId)
        })
        touchSyncMeta(context)
    }

    private fun getOrCreateTag(): Int {
        db!!.rawQuery("SELECT id FROM tags WHERE system_key='phone' LIMIT 1", null).use { c ->
            if (c.moveToFirst()) return c.getInt(0)
        }
        return db!!.insert("tags", null, ContentValues().apply {
            put("name", "Da Telefono")
            put("color", "#58a6ff")
            put("is_system", 1)
            put("system_key", "phone")
        }).toInt()
    }
}
