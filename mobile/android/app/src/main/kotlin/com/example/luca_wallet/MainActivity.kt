package com.example.luca_wallet

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.content.res.ColorStateList
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

    // OpenDocument (scelta FILE): unico picker in cui OneDrive è visibile. OpenDocumentTree
    // (scelta cartella) nasconde OneDrive, che non pubblica alberi navigabili. Perciò DB e file
    // coda vanno scelti entrambi a mano come singoli documenti.
    private val openDbLauncher = registerForActivityResult(
        ActivityResultContracts.OpenDocument()
    ) { uri: Uri? ->
        if (uri != null) onDbPicked(uri)
    }

    // OpenDocument per SELEZIONARE il file coda pending.jsonl (già esistente): OneDrive non
    // consente ad app esterne di CREARE documenti via SAF, ma mostra e lascia scrivere i file
    // esistenti. Il file lo crea il desktop (vuoto, accanto al DB) al primo avvio.
    private val selectQueueLauncher = registerForActivityResult(
        ActivityResultContracts.OpenDocument()
    ) { uri: Uri? ->
        if (uri != null) onQueuePicked(uri)
        else showToast("File coda non selezionato: l'inserimento da telefono resterà disabilitato")
    }

    private val addTransactionLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        // La transazione è stata accodata su pending.jsonl (non scritta nel DB). Il DB locale non
        // è cambiato: ricarichiamo solo la UI, che ora somma il delta delle pendenti al saldo.
        if (result.resultCode == RESULT_OK) {
            lifecycleScope.launch { loadAccounts() }
            // Sollecita l'upload OneDrive della coda: refresh esplicito del DocumentsProvider
            // (l'equivalente dello swipe manuale), eseguito via WorkManager così sopravvive al
            // passaggio in background. Vedi UploadKickWorker / PendingQueue.kickUpload.
            UploadKickWorker.enqueue(this)
        }
    }

    private val notifPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { /* l'utente ha risposto: continua normalmente in entrambi i casi */ }

    private lateinit var swipeRefresh: SwipeRefreshLayout
    private lateinit var recyclerView: RecyclerView
    private lateinit var fab: ExtendedFloatingActionButton
    private lateinit var fabPending: ExtendedFloatingActionButton
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
        fabPending   = findViewById(R.id.fabPending)

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

        fabPending.setOnClickListener {
            startActivity(Intent(this, PendingActivity::class.java))
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
        // Kick garantito anche andando in background: copre il caso in cui si inserisce una
        // transazione e si manda subito l'app in background prima del kick post-inserimento.
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
            R.id.menu_open     -> { openDbLauncher.launch(arrayOf("*/*")); true }
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

    /** DB scelto (OpenDocument): permesso persistente, salva, apre. Poi guida alla scelta coda. */
    private fun onDbPicked(dbUri: Uri) {
        try {
            contentResolver.takePersistableUriPermission(
                dbUri,
                Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
            )
        } catch (_: Exception) {}

        lifecycleScope.launch {
            try {
                val localPath = withContext(Dispatchers.IO) {
                    DbHelper.copyUriToLocal(this@MainActivity, dbUri)
                }
                DbHelper.savePrefs(this@MainActivity, localPath, dbUri.toString())
                openDbAndLoad(localPath, dbUri)
                registerObserver(dbUri)
                // Chiedi sempre il file coda dopo aver scelto il DB: la coda deve seguire il DB
                // (cambiando DB, il pending.jsonl giusto sta nella nuova cartella). Selezionarla
                // ogni volta evita di scrivere nella coda del DB precedente.
                promptSelectQueue()
            } catch (e: Exception) {
                showToast("Errore apertura file: ${e.message}")
            }
        }
    }

    /** Avvia la selezione del file coda pending.jsonl (creato dal desktop nella cartella del DB). */
    private fun promptSelectQueue() {
        showToast("Seleziona il file pending.jsonl (nella stessa cartella del DB)")
        selectQueueLauncher.launch(arrayOf("*/*"))
    }

    /** File coda selezionato: salva il suo URI (permesso persistente) per le scritture future. */
    private fun onQueuePicked(queueUri: Uri) {
        try {
            contentResolver.takePersistableUriPermission(
                queueUri,
                Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
            )
        } catch (_: Exception) {}
        PendingQueue.saveQueueUri(this, queueUri.toString())
        showToast("Coda configurata: gli inserimenti dal telefono verranno sincronizzati")
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
        // Rilancia l'animazione di ingresso a cascata ad ogni ricarica (di default parte
        // solo al primo attach): fa "ricadere" le card ad ogni refresh/swipe.
        recyclerView.scheduleLayoutAnimation()
        fab.visibility = if (DbHelper.isConfigured) View.VISIBLE else View.GONE
        AccountsWidget.updateAll(this)
        updatePendingButton()
    }

    /**
     * Bottone "Da importare": sempre visibile (se il DB è configurato). Colorato e cliccabile con
     * il conteggio quando ci sono pendenti; grigio e disabilitato quando non c'è nulla da importare.
     * Colore ambra per distinguerlo dal FAB primario "Movimento".
     */
    private suspend fun updatePendingButton() {
        if (!DbHelper.isConfigured) {
            fabPending.visibility = View.GONE
            return
        }
        val count = withContext(Dispatchers.IO) { PendingQueue.readPending(this@MainActivity).size }
        fabPending.visibility = View.VISIBLE
        if (count > 0) {
            fabPending.text = "Da importare ($count)"
            fabPending.isEnabled = true
            fabPending.backgroundTintList = colorStateList(R.color.amber)     // ambra
            val fg = colorStateList(R.color.surface2)                          // testo scuro
            fabPending.setTextColor(fg)
            fabPending.iconTint = fg
        } else {
            fabPending.text = "Da importare"
            fabPending.isEnabled = false
            fabPending.backgroundTintList = colorStateList(R.color.stroke)    // grigio
            val fg = colorStateList(R.color.text_dim)                          // grigio chiaro
            fabPending.setTextColor(fg)
            fabPending.iconTint = fg
        }
    }

    private fun showToast(msg: String) =
        Toast.makeText(this, msg, Toast.LENGTH_LONG).show()

    /** ColorStateList da una risorsa colore (helper per i tint dei FAB). */
    private fun colorStateList(colorRes: Int): ColorStateList =
        ColorStateList.valueOf(ContextCompat.getColor(this, colorRes))
}
