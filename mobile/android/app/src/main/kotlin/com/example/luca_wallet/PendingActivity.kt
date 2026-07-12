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
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Elenco delle transazioni ancora in coda (pending.jsonl) non ancora importate dal desktop.
 * Sola lettura sul contenuto: qui non si aggiunge né si cancella nulla — la coda è consumata dal
 * desktop. Il bottone "Forza upload" ritocca solo il file (contenuto identico) per sollecitarne
 * la sincronizzazione OneDrive.
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
                        accountName = accountNames[e.accountId] ?: "?"
                    )
                }
            }
            if (rows.isEmpty()) {
                tvEmpty.visibility = View.VISIBLE
                recycler.visibility = View.GONE
            } else {
                tvEmpty.visibility = View.GONE
                recycler.visibility = View.VISIBLE
                recycler.adapter = PendingAdapter(rows)
            }
        }
    }
}
