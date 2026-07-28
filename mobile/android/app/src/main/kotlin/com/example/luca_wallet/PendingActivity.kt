package com.example.luca_wallet

import android.os.Bundle
import android.view.View
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.appbar.MaterialToolbar
import com.google.android.material.button.MaterialButton
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Elenco delle transazioni ancora in coda (pending.jsonl) non ancora importate dal desktop.
 *
 * Da qui si può ANNULLARE una pendente inserita per sbaglio (✕ sulla riga): la transazione non
 * verrà mai importata dal desktop e sparisce subito dal saldo mostrato. Non si aggiunge nulla —
 * l'inserimento resta in AddTransactionActivity — e non si modifica: per correggere un importo si
 * annulla e si reinserisce.
 *
 * Il bottone "Forza upload" ritocca il file (contenuto identico) per sollecitarne la
 * sincronizzazione OneDrive.
 */
class PendingActivity : AppCompatActivity() {

    private lateinit var recycler: RecyclerView
    private lateinit var tvEmpty: TextView
    private lateinit var btnForce: MaterialButton

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_pending)

        val toolbar = findViewById<MaterialToolbar>(R.id.toolbar)
        setSupportActionBar(toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)

        recycler = findViewById(R.id.recyclerPending)
        tvEmpty  = findViewById(R.id.tvEmpty)
        btnForce = findViewById(R.id.btnForceUpload)
        recycler.layoutManager = LinearLayoutManager(this)
        btnForce.isEnabled = PendingQueue.isAvailable(this)
        btnForce.setOnClickListener { forceUpload() }

        load()
    }

    /**
     * Sollecita a mano l'upload della coda su OneDrive (touch del file + refresh del provider,
     * vedi PendingQueue.forceUploadNow) e riporta l'esito in un toast — incluso se OneDrive
     * gestisce o no la richiesta di refresh, utile per diagnosticare la sync che non parte.
     */
    private fun forceUpload() {
        btnForce.isEnabled = false
        lifecycleScope.launch {
            val res = withContext(Dispatchers.IO) { PendingQueue.forceUploadNow(this@PendingActivity) }
            val msg = when {
                res == null            -> "Coda non configurata"
                res.refreshSupported   -> "Upload sollecitato: OneDrive ha accettato il refresh"
                res.touched            -> "File ritoccato (refresh non supportato da OneDrive) — se non si carica, apri l'app OneDrive"
                else                   -> "Impossibile leggere il file coda — apri l'app OneDrive per caricarlo"
            }
            Toast.makeText(this@PendingActivity, msg, Toast.LENGTH_LONG).show()
            btnForce.isEnabled = true
        }
    }

    override fun onSupportNavigateUp(): Boolean { finish(); return true }

    private fun load() {
        lifecycleScope.launch {
            val rows = withContext(Dispatchers.IO) {
                val pending = PendingQueue.readPending(this@PendingActivity)
                // Risolvi i nomi di conti e categorie (in coda ci sono solo gli ID).
                val accountNames = DbHelper.getAllAccounts().associate { it.id to it.name }
                val categoryNames = DbHelper.getAllCategoryNames()
                pending.map { e ->
                    PendingAdapter.Row(
                        type        = e.type,
                        amount      = e.amount,
                        date        = e.date.toString(),
                        description = e.description.ifBlank {
                            when (e.type) {
                                "transfer" -> "Trasferimento"
                                else       -> categoryNames[e.categoryId] ?: "—"
                            }
                        },
                        accountName = accountNames[e.accountId] ?: "?",
                        id          = e.id
                    )
                }
            }
            if (rows.isEmpty()) {
                tvEmpty.visibility = View.VISIBLE
                recycler.visibility = View.GONE
            } else {
                tvEmpty.visibility = View.GONE
                recycler.visibility = View.VISIBLE
                recycler.adapter = PendingAdapter(rows) { row -> confirmCancel(row) }
            }
        }
    }

    /**
     * Chiede conferma prima di annullare: è un'azione che tocca la coda su OneDrive e non ha
     * un "annulla l'annullamento", quindi meglio un passaggio in più che una ✕ premuta per sbaglio.
     */
    private fun confirmCancel(row: PendingAdapter.Row) {
        val segno = if (row.type == "income") "+" else if (row.type == "expense") "-" else ""
        MaterialAlertDialogBuilder(this)
            .setTitle("Annullare la transazione?")
            .setMessage("${row.description}\n$segno${"%.2f".format(row.amount)} · ${row.date} · ${row.accountName}" +
                        "\n\nNon verrà importata sul desktop e sparirà dal saldo mostrato.")
            .setNegativeButton("No", null)
            .setPositiveButton("Annulla transazione") { _, _ -> doCancel(row) }
            .show()
    }

    /** Marca la riga come annullata sulla coda (I/O su OneDrive → fuori dal main thread). */
    private fun doCancel(row: PendingAdapter.Row) {
        lifecycleScope.launch {
            val esito = withContext(Dispatchers.IO) {
                try {
                    if (PendingQueue.cancel(this@PendingActivity, row.id)) "ok" else "assente"
                } catch (e: Exception) {
                    e.message ?: "errore sconosciuto"
                }
            }
            val msg = when (esito) {
                "ok"      -> "Transazione annullata"
                // Se non è più fra le non-applicate, il desktop l'ha importata nel frattempo:
                // va eliminata da lì, non dalla coda.
                "assente" -> "Non annullabile: risulta già importata sul desktop"
                else      -> "Annullamento fallito: $esito"
            }
            Toast.makeText(this@PendingActivity, msg, Toast.LENGTH_LONG).show()
            load()   // ricarica: la riga annullata sparisce dall'elenco
        }
    }
}
