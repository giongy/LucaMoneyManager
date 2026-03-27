package com.example.luca_wallet

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.view.View
import android.widget.RemoteViews

class AccountsWidget : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        val result = goAsync()
        Thread {
            try {
                val accounts = loadAccounts(context)
                for (id in appWidgetIds) updateWidget(context, appWidgetManager, id, accounts)
            } finally {
                result.finish()
            }
        }.start()
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_REFRESH) {
            Thread {
                // Full sync like MainActivity.init()
                val uriStr = DbHelper.getSavedContentUri(context)
                val path   = DbHelper.getSavedPath(context)
                if (path != null) {
                    DbHelper.closeDb()
                    if (uriStr != null) {
                        try {
                            val local = DbHelper.copyUriToLocal(context, Uri.parse(uriStr))
                            DbHelper.openDb(local, Uri.parse(uriStr))
                        } catch (_: Exception) {
                            DbHelper.openDb(path, null)
                        }
                    } else {
                        DbHelper.openDb(path, null)
                    }
                }
                val accounts = loadAccounts(context)
                val manager  = AppWidgetManager.getInstance(context)
                val ids = manager.getAppWidgetIds(ComponentName(context, AccountsWidget::class.java))
                for (id in ids) updateWidget(context, manager, id, accounts)
            }.start()
        }
    }

    companion object {

        const val ACTION_REFRESH = "com.example.luca_wallet.WIDGET_REFRESH"
        private const val MAX_ROWS = 7

        private val ROW_IDS     = intArrayOf(R.id.widgetRow0,     R.id.widgetRow1,     R.id.widgetRow2,     R.id.widgetRow3,     R.id.widgetRow4,     R.id.widgetRow5,     R.id.widgetRow6)
        private val STRIPE_IDS  = intArrayOf(R.id.widgetStripe0,  R.id.widgetStripe1,  R.id.widgetStripe2,  R.id.widgetStripe3,  R.id.widgetStripe4,  R.id.widgetStripe5,  R.id.widgetStripe6)
        private val ICON_IDS    = intArrayOf(R.id.widgetIcon0,    R.id.widgetIcon1,    R.id.widgetIcon2,    R.id.widgetIcon3,    R.id.widgetIcon4,    R.id.widgetIcon5,    R.id.widgetIcon6)
        private val NAME_IDS    = intArrayOf(R.id.widgetName0,    R.id.widgetName1,    R.id.widgetName2,    R.id.widgetName3,    R.id.widgetName4,    R.id.widgetName5,    R.id.widgetName6)
        private val BAL_IDS     = intArrayOf(R.id.widgetBalance0, R.id.widgetBalance1, R.id.widgetBalance2, R.id.widgetBalance3, R.id.widgetBalance4, R.id.widgetBalance5, R.id.widgetBalance6)

        private fun loadAccounts(context: Context): List<DbHelper.Account> = try {
            val path = DbHelper.getSavedPath(context) ?: return emptyList()
            if (!DbHelper.isConfigured) DbHelper.openDb(path, null)
            DbHelper.getFavoriteAccounts()
        } catch (_: Exception) { emptyList() }

        fun updateAll(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, AccountsWidget::class.java))
            if (ids.isEmpty()) return
            Thread {
                val accounts = loadAccounts(context)
                for (id in ids) updateWidget(context, manager, id, accounts)
            }.start()
        }

        fun updateWidget(
            context: Context,
            manager: AppWidgetManager,
            widgetId: Int,
            accounts: List<DbHelper.Account>
        ) {
            val views = RemoteViews(context.packageName, R.layout.widget_accounts)

            // Populate rows
            for (i in 0 until MAX_ROWS) {
                if (i < accounts.size) {
                    val a = accounts[i]
                    views.setViewVisibility(ROW_IDS[i], View.VISIBLE)
                    views.setTextViewText(ICON_IDS[i], a.icon)
                    views.setTextViewText(NAME_IDS[i], a.name)
                    views.setTextViewText(BAL_IDS[i], "${"%.2f".format(a.balance)} ${a.currency}")
                    val balColor = if (a.balance >= 0) Color.parseColor("#3fb950") else Color.parseColor("#f85149")
                    views.setTextColor(BAL_IDS[i], balColor)
                    val stripeColor = runCatching { Color.parseColor(a.color) }.getOrDefault(Color.parseColor("#58a6ff"))
                    views.setInt(STRIPE_IDS[i], "setBackgroundColor", stripeColor)
                    // Each row opens AddTransactionActivity with the specific account
                    val clickIntent = Intent(context, AddTransactionActivity::class.java)
                        .putExtra("account_id", a.id)
                    val clickPI = PendingIntent.getActivity(
                        context, a.id, clickIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                    views.setOnClickPendingIntent(ROW_IDS[i], clickPI)
                } else {
                    views.setViewVisibility(ROW_IDS[i], View.GONE)
                }
            }

            // Empty state
            views.setViewVisibility(R.id.widgetEmpty,
                if (accounts.isEmpty()) View.VISIBLE else View.GONE)

            // Refresh button
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
