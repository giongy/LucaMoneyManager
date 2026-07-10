package com.example.luca_wallet

import android.content.Context
import androidx.work.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Worker one-shot che "sveglia" OneDrive a far partire l'upload del DB dopo un inserimento.
 *
 * Sostituisce il vecchio kick con delay(2500) dentro la coroutine dell'Activity: quello moriva
 * se l'app andava in background prima dello scadere del ritardo e usava un timing fisso, quindi
 * era inaffidabile. WorkManager invece garantisce l'esecuzione anche a processo terminato, con
 * retry automatico (exponential backoff) finché OneDrive non risponde: la rilettura dell'URI
 * (kickOneDriveUpload) forza il DocumentsProvider a committare la modifica e avviare la sync.
 *
 * Idempotente: rileggere l'URI è a sola lettura e non tocca la copia locale né la connessione.
 */
class UploadKickWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {

    override suspend fun doWork(): Result {
        // Nessun URI configurato: niente da caricare.
        DbHelper.getSavedContentUri(applicationContext) ?: return Result.success()
        return try {
            withContext(Dispatchers.IO) { DbHelper.kickOneDriveUpload(applicationContext) }
            Result.success()
        } catch (_: Exception) {
            Result.retry()
        }
    }

    companion object {
        private const val WORK_NAME = "onedrive_upload_kick"

        /**
         * Programma il kick di upload subito dopo un inserimento. Un piccolo ritardo iniziale dà
         * tempo alla scrittura fsync (writeLocalBackToUri) di propagarsi prima della rilettura.
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
