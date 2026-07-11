package com.example.luca_wallet

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.database.ContentObserver
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Menu
import android.view.MenuItem
import android.view.View
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.google.android.material.appbar.MaterialToolbar
import com.google.android.material.floatingactionbutton.ExtendedFloatingActionButton
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : AppCompatActivity() {

    // OpenDocumentTree (non più OpenDocument): l'utente sceglie la CARTELLA del DB su OneDrive.
    // Serve un tree URI per poter creare/scrivere il file coda pending.jsonl nella stessa cartella
    // — da un URI a singolo documento SAF non consente di creare file fratelli.
    private val openTreeLauncher = registerForActivityResult(
        ActivityResultContracts.OpenDocumentTree()
    ) { treeUri: Uri? ->
        if (treeUri != null) onTreePicked(treeUri)
    }

    private val addTransactionLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        // La transazione è stata accodata su pending.jsonl (non scritta nel DB). Il DB locale non
        // è cambiato: ricarichiamo solo la UI, che ora somma il delta delle pendenti al saldo.
        // PendingQueue.append fa già il notifyChange sul file coda → OneDrive lo sincronizza.
        if (result.resultCode == RESULT_OK) {
            lifecycleScope.launch { loadAccounts() }
        }
    }

    private val notifPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { /* l'utente ha risposto: continua normalmente in entrambi i casi */ }

    private lateinit var swipeRefresh: SwipeRefreshLayout
    private lateinit var recyclerView: RecyclerView
    private lateinit var fab: ExtendedFloatingActionButton
    private val accounts = mutableListOf<DbHelper.Account>()
    private lateinit var adapter: AccountAdapter

    private var contentObserver: ContentObserver? = null
    private var isObserverReloading = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val toolbar = findViewById<MaterialToolbar>(R.id.toolbar)
        setSupportActionBar(toolbar)

        swipeRefresh = findViewById(R.id.swipeRefresh)
        recyclerView = findViewById(R.id.recyclerView)
        fab          = findViewById(R.id.fabAdd)

        adapter = AccountAdapter(accounts) { account ->
            val intent = Intent(this, AddTransactionActivity::class.java)
            intent.putExtra("account_id", account.id)
            addTransactionLauncher.launch(intent)
        }
        recyclerView.layoutManager = LinearLayoutManager(this)
        recyclerView.adapter = adapter

        swipeRefresh.setOnRefreshListener {
            lifecycleScope.launch {
                init()
                swipeRefresh.isRefreshing = false
            }
        }

        fab.setOnClickListener {
            addTransactionLauncher.launch(
                Intent(this, AddTransactionActivity::class.java)
            )
        }

        NotifHelper.createChannel(this)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            notifPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }

        lifecycleScope.launch { init() }
        SyncWorker.ensureScheduled(this)
    }

    // Chiudi la connessione (sola lettura) quando l'app va in background → OneDrive libero.
    override fun onStop() {
        super.onStop()
        DbHelper.closeDb()
    }

    override fun onDestroy() {
        super.onDestroy()
        contentObserver?.let { contentResolver.unregisterContentObserver(it) }
    }

    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        menuInflater.inflate(R.menu.main_menu, menu)
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when (item.itemId) {
            R.id.menu_open     -> { openTreeLauncher.launch(null); true }
            R.id.menu_refresh  -> { lifecycleScope.launch { init() }; true }
            R.id.menu_pending  -> { startActivity(Intent(this, PendingActivity::class.java)); true }
            R.id.menu_settings -> { startActivity(Intent(this, SettingsActivity::class.java)); true }
            else -> super.onOptionsItemSelected(item)
        }
    }

    private suspend fun init() {
        val savedUriStr = DbHelper.getSavedContentUri(this)
        val savedPath   = DbHelper.getSavedPath(this)
        if (savedUriStr == null && savedPath == null) return

        // Leggi last_modified prima di cancellare la cache locale
        val prevModified = withContext(Dispatchers.IO) {
            savedPath?.let { DbHelper.readLastModifiedFromPath(it) }
        }

        // Chiudi e svuota la cache locale prima di scaricare la versione aggiornata
        withContext(Dispatchers.IO) {
            DbHelper.closeDb()
            DbHelper.clearLocalCache(this@MainActivity)
        }

        if (savedUriStr != null) {
            val uri = Uri.parse(savedUriStr)
            try {
                val localPath = withContext(Dispatchers.IO) {
                    DbHelper.copyUriToLocal(this@MainActivity, uri)
                }
                DbHelper.savePrefs(this, localPath, savedUriStr)
                openDbAndLoad(localPath, uri)
                registerObserver(uri)
                if (prevModified != null && DbHelper.lastModified != prevModified) {
                    showToast("DB aggiornato — nuova versione caricata")
                }
            } catch (_: Exception) {
                if (savedPath != null) openDbAndLoad(savedPath, uri)
                else showToast("Impossibile accedere al file OneDrive")
            }
        } else {
            openDbAndLoad(savedPath!!, null)
        }
    }

    /**
     * Registra un ContentObserver sull'URI OneDrive.
     * Quando OneDrive completa il download della versione aggiornata, onChange() viene
     * chiamato automaticamente → ricopia il file e ricarica i dati senza secondo refresh manuale.
     */
    private fun registerObserver(uri: Uri) {
        contentObserver?.let { contentResolver.unregisterContentObserver(it) }
        val obs = object : ContentObserver(Handler(Looper.getMainLooper())) {
            override fun onChange(selfChange: Boolean) {
                if (isObserverReloading) return
                isObserverReloading = true
                lifecycleScope.launch {
                    try {
                        val prevModified = DbHelper.lastModified
                        val localPath = withContext(Dispatchers.IO) {
                            DbHelper.copyUriToLocal(this@MainActivity, uri)
                        }
                        openDbAndLoad(localPath, uri)
                        if (DbHelper.lastModified != prevModified) {
                            NotifHelper.notifyDbUpdated(this@MainActivity)
                        }
                    } catch (_: Exception) {}
                    isObserverReloading = false
                }
            }
        }
        contentResolver.registerContentObserver(uri, false, obs)
        contentObserver = obs
    }

    private fun onTreePicked(treeUri: Uri) {
        // Permesso persistente sull'albero → potremo leggere il DB e scrivere la coda anche dopo
        // il riavvio dell'app, senza ri-chiedere all'utente.
        try {
            contentResolver.takePersistableUriPermission(
                treeUri,
                Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
            )
        } catch (_: Exception) {}

        val dbFiles = PendingQueue.listDatabases(this, treeUri)
        when {
            dbFiles.isEmpty() -> {
                showToast("Nessun file .db trovato nella cartella selezionata")
                return
            }
            dbFiles.size == 1 -> selectDatabase(treeUri, dbFiles[0].uri)
            else -> {
                // Più DB nella cartella: chiedi quale usare.
                val names = dbFiles.map { it.name ?: "database.db" }.toTypedArray()
                androidx.appcompat.app.AlertDialog.Builder(this)
                    .setTitle("Quale database?")
                    .setItems(names) { _, which -> selectDatabase(treeUri, dbFiles[which].uri) }
                    .show()
            }
        }
    }

    /** Salva tree + DB scelti e apre il database (copia locale). */
    private fun selectDatabase(treeUri: Uri, dbUri: Uri) {
        lifecycleScope.launch {
            try {
                PendingQueue.saveTreeUri(this@MainActivity, treeUri.toString())
                val localPath = withContext(Dispatchers.IO) {
                    DbHelper.copyUriToLocal(this@MainActivity, dbUri)
                }
                DbHelper.savePrefs(this@MainActivity, localPath, dbUri.toString())
                openDbAndLoad(localPath, dbUri)
                registerObserver(dbUri)
            } catch (e: Exception) {
                showToast("Errore apertura file: ${e.message}")
            }
        }
    }

    private suspend fun openDbAndLoad(path: String, uri: Uri?) {
        val err = withContext(Dispatchers.IO) { DbHelper.openDb(path, uri) }
        if (err != null) {
            showToast(err)
        } else {
            loadAccounts()
            supportActionBar?.subtitle = DbHelper.currentFilename
        }
    }

    private suspend fun loadAccounts() {
        val list = withContext(Dispatchers.IO) { DbHelper.getFavoriteAccounts(this@MainActivity) }
        accounts.clear()
        accounts.addAll(list)
        adapter.notifyDataSetChanged()
        fab.visibility = if (DbHelper.isConfigured) View.VISIBLE else View.GONE
        AccountsWidget.updateAll(this)
    }

    private fun showToast(msg: String) =
        Toast.makeText(this, msg, Toast.LENGTH_LONG).show()
}
