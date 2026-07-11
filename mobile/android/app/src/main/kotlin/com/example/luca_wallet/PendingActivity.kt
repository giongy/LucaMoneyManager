package com.example.luca_wallet

import android.os.Bundle
import android.view.View
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.appbar.MaterialToolbar
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Elenco delle transazioni ancora in coda (pending.jsonl) non ancora importate dal desktop.
 * Sola lettura: qui non si modifica né si cancella nulla — la coda è consumata dal desktop.
 */
class PendingActivity : AppCompatActivity() {

    private lateinit var recycler: RecyclerView
    private lateinit var tvEmpty: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_pending)

        val toolbar = findViewById<MaterialToolbar>(R.id.toolbar)
        setSupportActionBar(toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)

        recycler = findViewById(R.id.recyclerPending)
        tvEmpty  = findViewById(R.id.tvEmpty)
        recycler.layoutManager = LinearLayoutManager(this)

        load()
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
