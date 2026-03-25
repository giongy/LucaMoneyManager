package com.example.luca_wallet

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.Menu
import android.view.MenuItem
import android.view.View
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
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
        if (result.resultCode == RESULT_OK) lifecycleScope.launch { loadAccounts() }
    }

    private lateinit var recyclerView: RecyclerView
    private lateinit var fab: ExtendedFloatingActionButton
    private val accounts = mutableListOf<DbHelper.Account>()
    private lateinit var adapter: AccountAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val toolbar = findViewById<MaterialToolbar>(R.id.toolbar)
        setSupportActionBar(toolbar)

        recyclerView = findViewById(R.id.recyclerView)
        fab          = findViewById(R.id.fabAdd)
        adapter      = AccountAdapter(accounts)
        recyclerView.layoutManager = LinearLayoutManager(this)
        recyclerView.adapter = adapter

        fab.setOnClickListener {
            addTransactionLauncher.launch(
                Intent(this, AddTransactionActivity::class.java)
            )
        }

        lifecycleScope.launch { init() }
    }

    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        menuInflater.inflate(R.menu.main_menu, menu)
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when (item.itemId) {
            R.id.menu_open    -> { openFileLauncher.launch(arrayOf("*/*")); true }
            R.id.menu_refresh -> { lifecycleScope.launch { init() }; true }
            else -> super.onOptionsItemSelected(item)
        }
    }

    private suspend fun init() {
        val savedUriStr = DbHelper.getSavedContentUri(this)
        val savedPath   = DbHelper.getSavedPath(this)
        if (savedUriStr == null && savedPath == null) return

        if (savedUriStr != null) {
            val uri = Uri.parse(savedUriStr)
            try {
                val localPath = withContext(Dispatchers.IO) {
                    DbHelper.copyUriToLocal(this@MainActivity, uri)
                }
                DbHelper.savePrefs(this, localPath, savedUriStr)
                openDbAndLoad(localPath, uri)
            } catch (_: Exception) {
                if (savedPath != null) openDbAndLoad(savedPath, uri)
                else showToast("Impossibile accedere al file OneDrive")
            }
        } else {
            openDbAndLoad(savedPath!!, null)
        }
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
        fab.visibility = if (DbHelper.isOpen) View.VISIBLE else View.GONE
    }

    private fun showToast(msg: String) =
        Toast.makeText(this, msg, Toast.LENGTH_LONG).show()
}
