package com.example.luca_wallet

import android.content.Intent
import android.net.Uri
import android.provider.OpenableColumns
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream

class MainActivity : FlutterActivity() {

    companion object {
        private const val CHANNEL = "com.example.luca_wallet/file_uri"
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL)
            .setMethodCallHandler { call, result ->
                when (call.method) {

                    // Copia il file da content:// URI nella cartella privata dell'app.
                    // Restituisce il path assoluto locale su cui sqflite può operare.
                    "copyUriToLocal" -> {
                        val uriStr = call.argument<String>("uri")
                        if (uriStr == null) {
                            result.error("BAD_ARGS", "uri is null", null)
                            return@setMethodCallHandler
                        }
                        try {
                            val uri = Uri.parse(uriStr)
                            // Acquisisce permesso persistente per write-back futuro
                            try {
                                val flags = Intent.FLAG_GRANT_READ_URI_PERMISSION or
                                            Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                                contentResolver.takePersistableUriPermission(uri, flags)
                            } catch (_: Exception) {}

                            val displayName = resolveDisplayName(uri) ?: "database.db"
                            val localFile = File(filesDir, displayName)

                            contentResolver.openInputStream(uri)!!.use { input ->
                                FileOutputStream(localFile).use { output ->
                                    input.copyTo(output)
                                }
                            }
                            result.success(localFile.absolutePath)
                        } catch (e: Exception) {
                            result.error("COPY_FAILED", e.message, null)
                        }
                    }

                    // Riscrive il file locale modificato sul content:// URI originale (OneDrive).
                    "writeLocalBackToUri" -> {
                        val localPath = call.argument<String>("localPath")
                        val uriStr    = call.argument<String>("uri")
                        if (localPath == null || uriStr == null) {
                            result.error("BAD_ARGS", "missing args", null)
                            return@setMethodCallHandler
                        }
                        try {
                            val uri = Uri.parse(uriStr)
                            // "wt" = write + truncate: sovrascrive completamente il file
                            contentResolver.openOutputStream(uri, "wt")!!.use { output ->
                                FileInputStream(localPath).use { input ->
                                    input.copyTo(output)
                                }
                            }
                            result.success(null)
                        } catch (e: Exception) {
                            result.error("WRITE_BACK_FAILED", e.message, null)
                        }
                    }

                    else -> result.notImplemented()
                }
            }
    }

    private fun resolveDisplayName(uri: Uri): String? {
        return try {
            contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                val col = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                if (col >= 0 && cursor.moveToFirst()) cursor.getString(col) else null
            }
        } catch (_: Exception) { null }
    }
}
