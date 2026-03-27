package com.example.luca_wallet

import android.graphics.Color
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView

class AccountAdapter(
    private val items: List<DbHelper.Account>,
    private val onItemClick: (DbHelper.Account) -> Unit
) : RecyclerView.Adapter<AccountAdapter.VH>() {

    class VH(view: View) : RecyclerView.ViewHolder(view) {
        val stripe:  View     = view.findViewById(R.id.stripe)
        val icon:    TextView = view.findViewById(R.id.tvIcon)
        val name:    TextView = view.findViewById(R.id.tvName)
        val balance: TextView = view.findViewById(R.id.tvBalance)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) =
        VH(LayoutInflater.from(parent.context).inflate(R.layout.item_account, parent, false))

    override fun getItemCount() = items.size

    override fun onBindViewHolder(holder: VH, position: Int) {
        val a = items[position]
        holder.icon.text    = a.icon
        holder.name.text    = a.name
        holder.balance.text = "${"%.2f".format(a.balance)} ${a.currency}"
        holder.balance.setTextColor(
            if (a.balance >= 0) Color.parseColor("#3fb950")
            else                Color.parseColor("#f85149")
        )
        holder.stripe.setBackgroundColor(
            runCatching { Color.parseColor(a.color) }.getOrDefault(Color.parseColor("#58a6ff"))
        )
        holder.itemView.setOnClickListener { onItemClick(a) }
    }
}
