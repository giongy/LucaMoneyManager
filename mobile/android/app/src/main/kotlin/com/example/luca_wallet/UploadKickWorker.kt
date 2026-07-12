package com.example.luca_wallet

import android.content.Context
import androidx.work.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Worker one-shot che "sveglia" OneDrive a far partire l'upload del file coda (pending.jsonl)
 * dopo un inserimento da telefono.
 *
 * Il kick chiama ContentResolver.refresh() sul documento — l'equivalente programmatico dello
 * swipe manuale: chiede al DocumentsProvider di risincronizzare l'item, upload delle modifiche
 * locali incluso. (La sola rilettura del file, usata in passato, NON basta: il provider serve la
 * cache locale senza avviare alcuna sync.) Vedi PendingQueue.kickUpload.
 *
 * WorkManager garantisce l'esecuzione anche a processo terminato, con vincolo di rete.
 * Idempotente: refresh e rilettura sono operazioni a sola lettura.
 */
class UploadKickWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {

    override suspend fun doWork(): Result {
        // Nessun file coda configurato: niente da caricare.
        PendingQueue.getQueueUri(applicationContext) ?: return Result.success()
        return try {
            withContext(Dispatchers.IO) { PendingQueue.kickUpload(applicationContext) }
            Result.success()
        } catch (_: Exception) {
            Result.retry()
        }
    }

    companion object {
        private const val WORK_NAME = "onedrive_upload_kick"

        /**
         * Programma il kick di upload subito dopo un inserimento. Un piccolo ritardo iniziale dà
         * tempo alla scrittura fsync di propagarsi prima della rilettura.
         * REPLACE: un nuovo inserimento rimpiazza il kick pendente (basta l'ultimo).
         */
        fun enqueue(context: Context) {
            val request = OneTimeWorkRequestBuilder<UploadKickWorker>()
                .setInitialDelay(2, java.util.concurrent.TimeUnit.SECONDS)
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .build()
                )
                .setBackoffCriteria(
                    BackoffPolicy.LINEAR,
                    WorkRequest.MIN_BACKOFF_MILLIS,
                    java.util.concurrent.TimeUnit.MILLISECONDS
                )
                .build()
            WorkManager.getInstance(context).enqueueUniqueWork(
                WORK_NAME,
                ExistingWorkPolicy.REPLACE,
                request
            )
        }
    }
}
