package com.example.luca_wallet

import android.os.Bundle
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Spinner
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.appbar.MaterialToolbar
import com.google.android.material.switchmaterial.SwitchMaterial

class SettingsActivity : AppCompatActivity() {

    private val intervalOptions = listOf(1, 2, 4, 6, 12, 24)
    private val intervalLabels  = listOf("1 ora", "2 ore", "4 ore", "6 ore", "12 ore", "24 ore")

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_settings)

        val toolbar = findViewById<MaterialToolbar>(R.id.toolbar)
        setSupportActionBar(toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)

        val switchSync      = findViewById<SwitchMaterial>(R.id.switchSync)
        val rowInterval     = findViewById<View>(R.id.rowInterval)
        val spinnerInterval = findViewById<Spinner>(R.id.spinnerInterval)

        val prefs        = getSharedPreferences("luca_wallet", MODE_PRIVATE)
        val syncEnabled  = prefs.getBoolean("sync_enabled", false)
        val syncInterval = prefs.getInt("sync_interval_hours", 6)

        spinnerInterval.adapter = ArrayAdapter(
            this, android.R.layout.simple_spinner_dropdown_item, intervalLabels
        )
        spinnerInterval.setSelection(intervalOptions.indexOf(syncInterval).coerceAtLeast(0))
        switchSync.isChecked = syncEnabled
        rowInterval.visibility = if (syncEnabled) View.VISIBLE else View.GONE

        switchSync.setOnCheckedChangeListener { _, checked ->
            rowInterval.visibility = if (checked) View.VISIBLE else View.GONE
            applySettings(checked, intervalOptions[spinnerInterval.selectedItemPosition])
        }

        spinnerInterval.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>, view: View?, pos: Int, id: Long) {
                if (switchSync.isChecked) applySettings(true, intervalOptions[pos])
            }
            override fun onNothingSelected(parent: AdapterView<*>) {}
        }
    }

    private fun applySettings(enabled: Boolean, intervalHours: Int) {
        getSharedPreferences("luca_wallet", MODE_PRIVATE).edit()
            .putBoolean("sync_enabled", enabled)
            .putInt("sync_interval_hours", intervalHours)
            .apply()
        if (enabled) SyncWorker.schedule(this, intervalHours)
        else SyncWorker.cancel(this)
    }

    override fun onSupportNavigateUp(): Boolean {
        finish()
        return true
    }
}
