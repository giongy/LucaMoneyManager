package com.example.luca_wallet

import android.content.Context
import androidx.work.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Worker one-shot che "sveglia" OneDrive a far partire l'upload del file coda (pending.jsonl)
 * dopo un inserimento da telefono.
 *
 * Necessario perché fsync + notifyChange da soli non fanno partire l'upload OneDrive: il
 * DocumentsProvider tiene i byte in un buffer finché una rilettura del file non forza il commit
 * (lo stesso effetto dello swipe manuale). Senza questo kick il jsonl resta locale finché non
 * si fa refresh a mano una o due volte.
 *
 * WorkManager garantisce l'esecuzione anche a processo terminato, con retry automatico finché
 * OneDrive non risponde. Idempotente: rileggere l'URI è a sola lettura.
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
