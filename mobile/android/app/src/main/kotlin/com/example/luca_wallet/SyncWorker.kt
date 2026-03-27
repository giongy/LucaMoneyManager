package com.example.luca_wallet

import android.content.Context
import android.net.Uri
import androidx.work.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

class SyncWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {

    override suspend fun doWork(): Result {
        val uriStr = DbHelper.getSavedContentUri(applicationContext) ?: return Result.success()
        val uri    = Uri.parse(uriStr)
        return try {
            withContext(Dispatchers.IO) {
                val path = DbHelper.copyUriToLocal(applicationContext, uri)
                DbHelper.savePrefs(applicationContext, path, uriStr)
            }
            // Aggiorna il widget con i dati freschi (gestisce apertura/chiusura DB internamente)
            AccountsWidget.updateAll(applicationContext)
            Result.success()
        } catch (_: Exception) {
            Result.retry()
        }
    }

    companion object {

        private const val WORK_NAME = "db_sync"

        fun schedule(context: Context, intervalHours: Int) {
            val request = PeriodicWorkRequestBuilder<SyncWorker>(
                intervalHours.toLong(), TimeUnit.HOURS
            ).setConstraints(
                Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build()
            ).build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.UPDATE,
                request
            )
        }

        fun cancel(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME)
        }

        /** Chiamato all'avvio dell'app per ripristinare il job se era abilitato. */
        fun ensureScheduled(context: Context) {
            val prefs = context.getSharedPreferences("luca_wallet", Context.MODE_PRIVATE)
            if (prefs.getBoolean("sync_enabled", false)) {
                schedule(context, prefs.getInt("sync_interval_hours", 6))
            }
        }
    }
}
