package com.example.luca_wallet

import android.graphics.Color
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView

class PendingAdapter(
    private val items: List<Row>
) : RecyclerView.Adapter<PendingAdapter.VH>() {

    data class Row(
        val type: String,
        val amount: Double,
        val date: String,
        val description: String,
        val accountName: String
    )

    class VH(view: View) : RecyclerView.ViewHolder(view) {
        val type:        TextView = view.findViewById(R.id.tvType)
        val description: TextView = view.findViewById(R.id.tvDescription)
        val date:        TextView = view.findViewById(R.id.tvDate)
        val amount:      TextView = view.findViewById(R.id.tvAmount)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) =
        VH(LayoutInflater.from(parent.context).inflate(R.layout.item_pending, parent, false))

    override fun getItemCount() = items.size

    override fun onBindViewHolder(holder: VH, position: Int) {
        val r = items[position]
        holder.type.text        = when (r.type) {
            "income"   -> "↓"   // freccia in basso: entrata
            "expense"  -> "↑"   // freccia in alto: uscita
            "transfer" -> "⇄"   // doppia freccia: trasferimento
            else       -> "•"
        }
        holder.description.text = r.description
        holder.date.text        = "${r.date} · ${r.accountName}"

        val sign = if (r.type == "income") "+" else if (r.type == "expense") "-" else ""
        holder.amount.text = "$sign${"%.2f".format(r.amount)}"
        holder.amount.setTextColor(when (r.type) {
            "income"  -> Color.parseColor("#3fb950")
            "expense" -> Color.parseColor("#f85149")
            else      -> Color.parseColor("#58a6ff")
        })
    }
}
