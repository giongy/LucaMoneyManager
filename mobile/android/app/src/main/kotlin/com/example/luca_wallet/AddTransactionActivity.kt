package com.example.luca_wallet

import android.app.Activity
import android.app.DatePickerDialog
import android.os.Bundle
import android.view.View
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import android.widget.ArrayAdapter
import android.widget.AutoCompleteTextView
import android.widget.Toast
import com.google.android.material.textfield.TextInputEditText
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.android.material.appbar.MaterialToolbar
import com.google.android.material.button.MaterialButton
import com.google.android.material.button.MaterialButtonToggleGroup
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import java.time.LocalDate
import java.time.format.DateTimeFormatter

class AddTransactionActivity : AppCompatActivity() {

    private var txType     = "expense"
    private var date       = LocalDate.now()
    private var categories = listOf<DbHelper.Category>()
    private var accounts   = listOf<DbHelper.Account>()
    private var catIdx     = -1
    private var accIdx     = -1
    private var toAccIdx   = -1

    private lateinit var toggleType:   MaterialButtonToggleGroup
    private lateinit var etAmount:     TextInputEditText
    private lateinit var etDate:       TextInputEditText
    private lateinit var tilCategory:  TextInputLayout
    private lateinit var etCategory:   TextInputEditText
    private lateinit var actvAccount:  AutoCompleteTextView
    private lateinit var tilToAccount: TextInputLayout
    private lateinit var actvToAccount: AutoCompleteTextView
    private lateinit var btnSave:      MaterialButton

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_add_transaction)

        val toolbar = findViewById<MaterialToolbar>(R.id.toolbar)
        setSupportActionBar(toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        supportActionBar?.title = "Nuovo movimento"

        bindViews()
        updateDateField()

        toggleType.check(R.id.btnExpense)
        toggleType.addOnButtonCheckedListener { _, checkedId, isChecked ->
            if (!isChecked) return@addOnButtonCheckedListener
            txType = when (checkedId) {
                R.id.btnExpense  -> "expense"
                R.id.btnIncome   -> "income"
                R.id.btnTransfer -> "transfer"
                else -> return@addOnButtonCheckedListener
            }
            catIdx   = -1
            toAccIdx = -1
            updateTransferUI()
            lifecycleScope.launch { loadCategories() }
        }

        etAmount.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_DONE) { hideKeyboard(); true } else false
        }

        etDate.setOnClickListener { pickDate() }
        btnSave.setOnClickListener { lifecycleScope.launch { save() } }

        lifecycleScope.launch { loadAll() }
    }

    override fun onSupportNavigateUp(): Boolean { finish(); return true }

    private fun bindViews() {
        toggleType    = findViewById(R.id.toggleType)
        etAmount      = findViewById(R.id.etAmount)
        etDate        = findViewById(R.id.etDate)
        tilCategory   = findViewById(R.id.tilCategory)
        etCategory    = findViewById(R.id.etCategory)
        etCategory.setOnClickListener { showCategoryPicker() }
        actvAccount   = findViewById(R.id.actvAccount)
        tilToAccount  = findViewById(R.id.tilToAccount)
        actvToAccount = findViewById(R.id.actvToAccount)
        btnSave       = findViewById(R.id.btnSave)
    }

    private fun updateDateField() {
        etDate.setText(date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")))
    }

    private fun pickDate() {
        DatePickerDialog(this, { _, y, m, d ->
            date = LocalDate.of(y, m + 1, d)
            updateDateField()
        }, date.year, date.monthValue - 1, date.dayOfMonth).show()
    }

    private fun updateTransferUI() {
        val isTransfer = txType == "transfer"
        tilCategory.visibility  = if (isTransfer) View.GONE  else View.VISIBLE
        tilToAccount.visibility = if (isTransfer) View.VISIBLE else View.GONE
    }

    private suspend fun loadAll() {
        accounts = withContext(Dispatchers.IO) { DbHelper.getAllAccounts() }
        val names = accounts.map { "${it.icon} ${it.name}${if (it.isFavorite) " ⭐" else ""}" }
        val ad = ArrayAdapter(this, android.R.layout.simple_dropdown_item_1line, names)
        actvAccount.setAdapter(ad)
        actvToAccount.setAdapter(ArrayAdapter(this, android.R.layout.simple_dropdown_item_1line, names))
        actvAccount.setOnItemClickListener   { _, _, i, _ -> accIdx   = i }
        actvToAccount.setOnItemClickListener { _, _, i, _ -> toAccIdx = i }

        val preselectedId = intent.getIntExtra("account_id", -1)
        val favIdx = if (preselectedId >= 0) {
            accounts.indexOfFirst { it.id == preselectedId }.takeIf { it >= 0 }
                ?: accounts.indexOfFirst { it.isFavorite }.takeIf { it >= 0 } ?: 0
        } else {
            accounts.indexOfFirst { it.isFavorite }.takeIf { it >= 0 } ?: 0
        }
        if (accounts.isNotEmpty()) {
            actvAccount.setText(names[favIdx], false)
            accIdx = favIdx
        }
        loadCategories()
    }

    private suspend fun loadCategories() {
        if (txType == "transfer") {
            etCategory.setText("")
            catIdx = -1
            return
        }
        categories = withContext(Dispatchers.IO) { DbHelper.getSubCategories(txType) }
        etCategory.setText("")
        catIdx = -1
    }

    private fun showCategoryPicker() {
        if (categories.isEmpty()) return
        CategoryBottomSheet(categories) { idx, displayName ->
            catIdx = idx
            etCategory.setText(displayName.substringAfter(":").trim())
        }.show(supportFragmentManager, "cat_picker")
    }

    private fun hideKeyboard() {
        val imm = getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager
        currentFocus?.let { imm.hideSoftInputFromWindow(it.windowToken, 0) }
    }

    private suspend fun save() {
        hideKeyboard()
        val amount = etAmount.text?.toString()?.replace(',', '.')?.toDoubleOrNull()
        if (amount == null || amount <= 0) {
            Toast.makeText(this, "Inserisci un importo valido", Toast.LENGTH_SHORT).show(); return
        }
        if (accIdx < 0) {
            Toast.makeText(this, "Seleziona un conto", Toast.LENGTH_SHORT).show(); return
        }
        if (txType == "transfer" && toAccIdx < 0) {
            Toast.makeText(this, "Seleziona il conto di destinazione", Toast.LENGTH_SHORT).show(); return
        }

        if (withContext(Dispatchers.IO) { DbHelper.hasConflict() }) {
            val go = suspendCancellableCoroutine<Boolean> { cont ->
                AlertDialog.Builder(this)
                    .setTitle("Attenzione")
                    .setMessage("Il file è stato modificato da un altro dispositivo. Continuare?")
                    .setPositiveButton("Continua") { _, _ -> cont.resumeWith(Result.success(true))  }
                    .setNegativeButton("Annulla")  { _, _ -> cont.resumeWith(Result.success(false)) }
                    .setOnCancelListener           { cont.resumeWith(Result.success(false)) }
                    .show()
            }
            if (!go) return
            withContext(Dispatchers.IO) { DbHelper.refreshOpenedAt() }
        }

        btnSave.isEnabled = false
        try {
            withContext(Dispatchers.IO) {
                DbHelper.insertTransaction(
                    context     = this@AddTransactionActivity,
                    date        = date,
                    amount      = amount,
                    type        = txType,
                    categoryId  = if (catIdx >= 0) categories[catIdx].id else null,
                    accountId   = accounts[accIdx].id,
                    toAccountId = if (txType == "transfer" && toAccIdx >= 0) accounts[toAccIdx].id else null,
                    description = ""
                )
            }
            setResult(Activity.RESULT_OK)
            finish()
        } catch (e: Exception) {
            Toast.makeText(this, "Errore: ${e.message}", Toast.LENGTH_LONG).show()
            btnSave.isEnabled = true
        }
    }
}
