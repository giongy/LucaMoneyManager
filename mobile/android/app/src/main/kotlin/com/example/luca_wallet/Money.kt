package com.example.luca_wallet

import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.util.Locale

/**
 * Formattazione monetaria all'italiana: separatore migliaia '.', decimale ',',
 * simbolo valuta dopo il numero. Es. 1234.5 EUR → "1.234,50 €".
 *
 * Centralizzato qui perché prima il saldo era formattato inline come "%.2f EUR"
 * (senza separatori, con codice ISO grezzo). Le valute non-euro restano col loro
 * codice ISO (es. "1.000,00 USD") per non inventare simboli sbagliati.
 */
object Money {

    // Simboli fissi all'italiana, indipendenti dal Locale di sistema del telefono.
    private val symbols = DecimalFormatSymbols(Locale.ITALY).apply {
        groupingSeparator = '.'
        decimalSeparator  = ','
    }
    private val df = DecimalFormat("#,##0.00", symbols)

    // Simbolo per le valute comuni; per le altre si usa il codice ISO.
    private fun symbolFor(currency: String): String = when (currency.uppercase()) {
        "EUR" -> "€"
        "USD" -> "$"
        "GBP" -> "£"
        "CHF" -> "CHF"
        "JPY" -> "¥"
        else  -> currency
    }

    /** "1.234,56 €" — numero all'italiana + simbolo/codice valuta. */
    fun format(amount: Double, currency: String): String =
        "${df.format(amount)} ${symbolFor(currency)}"
}
