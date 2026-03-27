package com.example.luca_wallet

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews

class AccountsWidget : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (id in appWidgetIds) updateWidget(context, appWidgetManager, id)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_REFRESH) {
            // Full sync like MainActivity.init(): re-download from OneDrive then reload
            Thread {
                val uriStr = DbHelper.getSavedContentUri(context)
                val path   = DbHelper.getSavedPath(context)
                if (path != null) {
                    DbHelper.closeDb()
                    if (uriStr != null) {
                        try {
                            val localPath = DbHelper.copyUriToLocal(context, Uri.parse(uriStr))
                            DbHelper.openDb(localPath, Uri.parse(uriStr))
                        } catch (_: Exception) {
                            DbHelper.openDb(path, null)
                        }
                    } else {
                        DbHelper.openDb(path, null)
                    }
                }
                val manager = AppWidgetManager.getInstance(context)
                val ids = manager.getAppWidgetIds(ComponentName(context, AccountsWidget::class.java))
                manager.notifyAppWidgetViewDataChanged(ids, R.id.widgetList)
            }.start()
        }
    }

    companion object {

        const val ACTION_REFRESH = "com.example.luca_wallet.WIDGET_REFRESH"

        /** Called from MainActivity after accounts are reloaded. */
        fun updateAll(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, AccountsWidget::class.java))
            if (ids.isEmpty()) return
            manager.notifyAppWidgetViewDataChanged(ids, R.id.widgetList)
            for (id in ids) updateWidget(context, manager, id)
        }

        fun updateWidget(context: Context, manager: AppWidgetManager, widgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_accounts)

            // Wire up RemoteViewsService as the list adapter
            // setRemoteAdapter(viewId, intent) è API 31+; usiamo la versione a 3 parametri
            // (deprecated API 31 ma compatibile con API 26+)
            val serviceIntent = Intent(context, AccountsWidgetService::class.java)
            @Suppress("DEPRECATION")
            views.setRemoteAdapter(widgetId, R.id.widgetList, serviceIntent)
            views.setEmptyView(R.id.widgetList, R.id.widgetEmpty)

            // Template PendingIntent: each item's fillInIntent adds account_id
            val clickIntent = Intent(context, AddTransactionActivity::class.java)
            val clickPI = PendingIntent.getActivity(
                context, 0, clickIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
            )
            views.setPendingIntentTemplate(R.id.widgetList, clickPI)

            // Refresh button → broadcast → onReceive(ACTION_REFRESH)
            val refreshIntent = Intent(context, AccountsWidget::class.java).apply {
                action = ACTION_REFRESH
            }
            val refreshPI = PendingIntent.getBroadcast(
                context, widgetId, refreshIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widgetRefresh, refreshPI)

            manager.updateAppWidget(widgetId, views)
        }
    }
}
