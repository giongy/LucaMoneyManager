package com.example.luca_wallet

import android.content.Intent
import android.widget.RemoteViewsService

class AccountsWidgetService : RemoteViewsService() {
    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory =
        AccountsWidgetFactory(applicationContext)
}
