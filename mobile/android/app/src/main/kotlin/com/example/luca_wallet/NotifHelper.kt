package com.example.luca_wallet

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat

object NotifHelper {

    private const val CHANNEL_ID   = "db_sync"
    private const val CHANNEL_NAME = "Sincronizzazione DB"
    private const val NOTIF_ID     = 1

    fun createChannel(context: Context) {
        val channel = NotificationChannel(
            CHANNEL_ID, CHANNEL_NAME, NotificationManager.IMPORTANCE_LOW
        ).apply { description = "Notifiche aggiornamento database da OneDrive" }
        context.getSystemService(NotificationManager::class.java)
            .createNotificationChannel(channel)
    }

    fun notifyDbUpdated(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) return

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_refresh)
            .setContentTitle("LucaMoneyManager")
            .setContentText("DB aggiornato da OneDrive")
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setAutoCancel(true)
            .build()
        NotificationManagerCompat.from(context).notify(NOTIF_ID, notification)
    }
}
