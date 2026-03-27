package com.example.luca_wallet

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

class AccountsWidget : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (id in appWidgetIds) updateWidget(context, appWidgetManager, id)
    }

    companion object {

        /** Called from MainActivity after accounts are reloaded. */
        fun updateAll(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, AccountsWidget::class.java))
            if (ids.isEmpty()) return
            // Refresh list data (triggers onDataSetChanged in factory)
            manager.notifyAppWidgetViewDataChanged(ids, R.id.widgetList)
            for (id in ids) updateWidget(context, manager, id)
        }

        fun updateWidget(context: Context, manager: AppWidgetManager, widgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_accounts)

            // Wire up RemoteViewsService as the list adapter
            val serviceIntent = Intent(context, AccountsWidgetService::class.java)
            views.setRemoteAdapter(R.id.widgetList, serviceIntent)
            views.setEmptyView(R.id.widgetList, R.id.widgetEmpty)

            // Template PendingIntent: each item's fillInIntent adds account_id
            val clickIntent = Intent(context, AddTransactionActivity::class.java)
            val clickPI = PendingIntent.getActivity(
                context, 0, clickIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
            )
            views.setPendingIntentTemplate(R.id.widgetList, clickPI)

            manager.updateAppWidget(widgetId, views)
        }
    }
}
