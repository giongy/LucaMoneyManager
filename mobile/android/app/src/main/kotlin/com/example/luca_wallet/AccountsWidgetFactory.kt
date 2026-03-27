package com.example.luca_wallet

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.widget.RemoteViews
import android.widget.RemoteViewsService

class AccountsWidgetFactory(private val context: Context) : RemoteViewsService.RemoteViewsFactory {

    private var accounts: List<DbHelper.Account> = emptyList()

    override fun onCreate() {}

    override fun onDataSetChanged() {
        try {
            val path = DbHelper.getSavedPath(context) ?: return
            if (!DbHelper.isConfigured) {
                DbHelper.openDb(path, null)
            }
            accounts = DbHelper.getFavoriteAccounts()
        } catch (_: Exception) {
            accounts = emptyList()
        }
    }

    override fun onDestroy() {}

    override fun getCount() = accounts.size

    override fun getViewAt(position: Int): RemoteViews {
        val a  = accounts[position]
        val rv = RemoteViews(context.packageName, R.layout.widget_account_item)

        rv.setTextViewText(R.id.widgetIcon, a.icon)
        rv.setTextViewText(R.id.widgetName, a.name)
        rv.setTextViewText(R.id.widgetBalance, "${"%.2f".format(a.balance)} ${a.currency}")

        val balColor = if (a.balance >= 0) Color.parseColor("#3fb950") else Color.parseColor("#f85149")
        rv.setTextColor(R.id.widgetBalance, balColor)

        val stripeColor = runCatching { Color.parseColor(a.color) }.getOrDefault(Color.parseColor("#58a6ff"))
        rv.setInt(R.id.widgetStripe, "setBackgroundColor", stripeColor)

        // fillInIntent carries account_id; the template PendingIntent provides the rest
        val fillIn = Intent().putExtra("account_id", a.id)
        rv.setOnClickFillInIntent(R.id.widgetAccountRoot, fillIn)

        return rv
    }

    override fun getLoadingView() = null
    override fun getViewTypeCount() = 1
    override fun getItemId(position: Int) = accounts.getOrNull(position)?.id?.toLong() ?: position.toLong()
    override fun hasStableIds() = true
}
