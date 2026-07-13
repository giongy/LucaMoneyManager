package com.example.luca_wallet

import android.graphics.Color
import android.graphics.PorterDuff
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.RecyclerView

/**
 * Lista conti preferiti con, in cima, una card "patrimonio totale" (view type header).
 * Il totale è raggruppato PER VALUTA: conti in valute diverse non si sommano tra loro.
 */
class AccountAdapter(
    private val items: List<DbHelper.Account>,
    private val onItemClick: (DbHelper.Account) -> Unit
) : RecyclerView.Adapter<RecyclerView.ViewHolder>() {

    private companion object {
        const val TYPE_HEADER = 0
        const val TYPE_ACCOUNT = 1
    }

    // ── Header patrimonio ────────────────────────────────────────────────────────
    class HeaderVH(view: View) : RecyclerView.ViewHolder(view) {
        val rows: LinearLayout = view.findViewById(R.id.networthRows)
    }

    // ── Riga conto ───────────────────────────────────────────────────────────────
    class AccountVH(view: View) : RecyclerView.ViewHolder(view) {
        val icon:     TextView = view.findViewById(R.id.tvIcon)
        val name:     TextView = view.findViewById(R.id.tvName)
        val currency: TextView = view.findViewById(R.id.tvCurrency)
        val balance:  TextView = view.findViewById(R.id.tvBalance)
    }

    // La posizione 0 è l'header, quindi il conto i-esimo sta a position i+1.
    override fun getItemCount() = items.size + 1

    override fun getItemViewType(position: Int) =
        if (position == 0) TYPE_HEADER else TYPE_ACCOUNT

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
        val inflater = LayoutInflater.from(parent.context)
        return if (viewType == TYPE_HEADER)
            HeaderVH(inflater.inflate(R.layout.item_networth, parent, false))
        else
            AccountVH(inflater.inflate(R.layout.item_account, parent, false))
    }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        if (holder is HeaderVH) bindHeader(holder)
        else if (holder is AccountVH) bindAccount(holder, items[position - 1])
    }

    // ── Bind header: una riga "totale" per ogni valuta presente ──────────────────
    private fun bindHeader(holder: HeaderVH) {
        val ctx = holder.itemView.context
        holder.rows.removeAllViews()

        // Somma i saldi per valuta, nell'ordine di prima comparsa (LinkedHashMap).
        val totals = LinkedHashMap<String, Double>()
        for (a in items) totals.merge(a.currency, a.balance, Double::plus)

        if (totals.isEmpty()) {
            holder.rows.addView(totalRow(ctx, "0,00 €", positive = true, big = true))
            return
        }
        // La prima valuta è la "principale" → riga grande; le altre più piccole sotto.
        var first = true
        for ((cur, sum) in totals) {
            holder.rows.addView(totalRow(ctx, Money.format(sum, cur), positive = sum >= 0, big = first))
            first = false
        }
    }

    /** Crea una TextView per una riga di totale (grande per la valuta principale). */
    private fun totalRow(ctx: android.content.Context, text: String, positive: Boolean, big: Boolean): TextView =
        TextView(ctx).apply {
            this.text = text
            textSize = if (big) 30f else 18f
            setTypeface(typeface, android.graphics.Typeface.BOLD)
            setTextColor(ContextCompat.getColor(ctx, if (positive) R.color.positive else R.color.negative))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { topMargin = if (big) 0 else dp(ctx, 2) }
            gravity = Gravity.START
        }

    // ── Bind conto ───────────────────────────────────────────────────────────────
    private fun bindAccount(holder: AccountVH, a: DbHelper.Account) {
        val ctx = holder.itemView.context
        holder.icon.text     = a.icon
        holder.name.text     = a.name
        holder.currency.text = a.currency
        holder.balance.text  = Money.format(a.balance, a.currency)

        val positive = a.balance >= 0
        holder.balance.setTextColor(
            ContextCompat.getColor(ctx, if (positive) R.color.positive else R.color.negative)
        )

        // Cerchio icona tinto col colore del conto, a bassa opacità (~22%) così l'emoji resta leggibile.
        val accountColor = runCatching { Color.parseColor(a.color) }
            .getOrDefault(ContextCompat.getColor(ctx, R.color.accent))
        holder.icon.background?.mutate()?.setColorFilter(
            (accountColor and 0x00FFFFFF) or 0x38000000, PorterDuff.Mode.SRC_IN
        )

        holder.itemView.setOnClickListener { onItemClick(a) }
    }

    private fun dp(ctx: android.content.Context, value: Int): Int =
        (value * ctx.resources.displayMetrics.density).toInt()
}
