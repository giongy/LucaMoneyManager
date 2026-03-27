package com.example.luca_wallet

import android.os.Bundle
import android.util.TypedValue
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.bottomsheet.BottomSheetDialogFragment

class CategoryBottomSheet(
    private val categories: List<DbHelper.Category>,
    private val onSelected: (index: Int, displayName: String) -> Unit
) : BottomSheetDialogFragment() {

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View = inflater.inflate(R.layout.bottom_sheet_category, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        view.findViewById<RecyclerView>(R.id.recyclerCategory).apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = CatAdapter()
        }
    }

    private sealed class Item {
        data class Header(val label: String)                                    : Item()
        data class Entry(val idx: Int, val name: String, val full: String)     : Item()
    }

    private fun buildItems(): List<Item> {
        val result = mutableListOf<Item>()
        var lastParent = ""
        categories.forEachIndexed { i, cat ->
            val parent = cat.displayName.substringBefore(":").trim()
            val name   = cat.displayName.substringAfter(":").trim()
            if (parent != lastParent) {
                result += Item.Header(parent)
                lastParent = parent
            }
            result += Item.Entry(i, name, cat.displayName)
        }
        return result
    }

    private inner class CatAdapter : RecyclerView.Adapter<RecyclerView.ViewHolder>() {

        private val items = buildItems()

        override fun getItemViewType(position: Int) =
            if (items[position] is Item.Header) 0 else 1

        override fun getItemCount() = items.size

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
            val ctx = parent.context
            val dp  = ctx.resources.displayMetrics.density
            val tv  = TextView(ctx)

            if (viewType == 0) {
                // Section header
                tv.layoutParams = ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                )
                tv.setPadding(
                    (20 * dp).toInt(), (14 * dp).toInt(),
                    (20 * dp).toInt(), (4  * dp).toInt()
                )
                tv.textSize = 11f
                tv.isAllCaps = true
                tv.setTextAppearance(com.google.android.material.R.style.TextAppearance_Material3_LabelSmall)
                val mutedColor = TypedValue().also {
                    ctx.theme.resolveAttribute(com.google.android.material.R.attr.colorOnSurfaceVariant, it, true)
                }.data
                tv.setTextColor(mutedColor)
            } else {
                // Selectable entry
                tv.layoutParams = ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                )
                tv.setPadding(
                    (20 * dp).toInt(), (14 * dp).toInt(),
                    (20 * dp).toInt(), (14 * dp).toInt()
                )
                tv.textSize = 15f
                val rippleValue = TypedValue()
                ctx.theme.resolveAttribute(android.R.attr.selectableItemBackground, rippleValue, true)
                tv.setBackgroundResource(rippleValue.resourceId)
            }

            return object : RecyclerView.ViewHolder(tv) {}
        }

        override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
            val tv = holder.itemView as TextView
            when (val item = items[position]) {
                is Item.Header -> tv.text = item.label
                is Item.Entry  -> {
                    tv.text = item.name
                    tv.setOnClickListener {
                        onSelected(item.idx, item.full)
                        dismiss()
                    }
                }
            }
        }
    }
}
