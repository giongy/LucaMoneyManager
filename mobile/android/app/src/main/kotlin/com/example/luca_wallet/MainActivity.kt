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

    private val openFileLauncher = registerForActivityResult(
        ActivityResultContracts.OpenDocument()
    ) { uri: Uri? ->
        if (uri != null) onFilePicked(uri)
    }

    private val addTransactionLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        // Dopo un inserimento NON rileggere dall'URI (init): la copia locale è già quella giusta
        // — l'abbiamo appena scritta in insertTransaction/touchSyncMeta. init() farebbe
        // clearLocalCache + copyUriToLocal, rischiando di rileggere dall'URI una versione OneDrive
        // non ancora aggiornata (transazione che "sparisce") o un file in transito ("unable to
        // open db"). Ricarichiamo solo la UI dal DB locale; OneDrive sincronizza in background.
        if (result.resultCode == RESULT_OK) {
            lifecycleScope.launch { loadAccounts() }
            // Kick di upload affidabile: la scrittura su OneDrive non sempre fa partire l'upload
            // da sola. Il vecchio delay(2500) nella coroutine era fragile (moriva se l'app andava
            // in background, timing fisso). WorkManager esegue il kick anche a processo terminato,
            // con retry automatico finché OneDrive non risponde. Vedi UploadKickWorker.
            UploadKickWorker.enqueue(this)
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

    // Libera il lock sul file quando l'app va in background → OneDrive può sincronizzare
    override fun onStop() {
        super.onStop()
        DbHelper.closeDb()
        // Rilasciato il file, è il momento in cui OneDrive avvia più facilmente la sync: programma
        // un kick garantito (sopravvive alla terminazione del processo). Copre il caso in cui si
        // inserisce una transazione e si manda subito l'app in background prima del kick post-insert.
        UploadKickWorker.enqueue(this)
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
            R.id.menu_open     -> { openFileLauncher.launch(arrayOf("*/*")); true }
            R.id.menu_refresh  -> { lifecycleScope.launch { init() }; true }
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

    private fun onFilePicked(uri: Uri) {
        lifecycleScope.launch {
            try {
                val localPath = withContext(Dispatchers.IO) {
                    DbHelper.copyUriToLocal(this@MainActivity, uri)
                }
                DbHelper.savePrefs(this@MainActivity, localPath, uri.toString())
                openDbAndLoad(localPath, uri)
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
        val list = withContext(Dispatchers.IO) { DbHelper.getFavoriteAccounts() }
        accounts.clear()
        accounts.addAll(list)
        adapter.notifyDataSetChanged()
        fab.visibility = if (DbHelper.isConfigured) View.VISIBLE else View.GONE
        AccountsWidget.updateAll(this)
    }

    private fun showToast(msg: String) =
        Toast.makeText(this, msg, Toast.LENGTH_LONG).show()
}
