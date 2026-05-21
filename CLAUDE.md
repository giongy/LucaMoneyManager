# LucaMoneyManager — Contesto progetto

App di gestione finanze personali sviluppata da Luca per uso personale.
Due piattaforme: **desktop (primaria)** e **Android (secondaria)**, database SQLite condiviso via OneDrive.

---

## Piattaforme

### Desktop
- **Linguaggio:** Java 25, Maven 3.x
- **UI:** JCEF v143 (Chromium embedded) + Swing per dialogs/titlebar/splash
- **Frontend:** Vanilla JS puro (`src/main/resources/web/`, modulare in `js/pages/*.js`), no React/Vue
- **Versione:** 1.14.0 — output `target/moneymanager-1.14.0.jar` (fat JAR, web/ esclusa)
- **Web assets:** serviti da filesystem (cartella `web/` accanto al `.exe` in produzione, `target/classes/web/` in IDE)
- **DB path:** `%APPDATA%\Roaming\LucaMoneyManager\data.db`
- **Build:** `mvn package` oppure `build.bat`

### Android
- **Linguaggio:** Kotlin (Java 17 compat), Gradle Kotlin DSL
- **UI:** AndroidX + Material Design 3, min SDK 26, target SDK 35
- **App ID:** `com.example.luca_wallet`, versione 2.0
- **Path:** `mobile/android/`
- **CI/CD:** GitHub Actions — APK firmato automatico su push a master

---

## Architettura desktop

```
JS Frontend (app.js)
    ↓  cefQuery (payload JSON in Base64)
Bridge.java (420 LOC) — dispatch 40+ operazioni
    ↓
Database.java (2378 LOC) — tutte le query JDBC
    ↓
SQLite
```

**Classi principali:** `App`, `MainWindow`, `Bridge`, `Database`, `Settings`, `IconFactory`

---

## Schema DB (v4, 13+ tabelle)

`accounts`, `categories` (gerarchiche), `transactions`, `transaction_splits`, `transaction_tags`, `tags`, `budgets`, `budget_config`, `scheduled_transactions`, `portfolio`, `portfolio_transactions`, `schema_version`, `sync_meta`

**SQLite config:** journal=DELETE, synchronous=FULL, cache=16MB, FK abilitati

---

## Convenzioni

- **Lingua:** tutto in italiano (commenti, stringhe UI, messaggi errore)
- **Naming:** PascalCase classi, camelCase metodi/variabili, UPPER_SNAKE_CASE costanti, snake_case tabelle DB
- **Nessun test automatico** — test manuale via UI
- **Nessun framework JS** — Vanilla JS puro
- **Commenti sezione** con separatori Unicode `── ──`
- **SQL:** text blocks Java (`"""..."""`)
- Non aggiungere feature extra, refactoring non richiesti, o docstring a codice non modificato

---

## UI — Tema light

Il tema light **non deve essere bianco puro** — l'utente lo trova aggressivo.
- Gerarchia obbligatoria: `bg3 < bg < bg2` (cards più chiare dello sfondo, mai #fff)
- Valori approvati: `bg=#dce0e7`, `bg2=#e9ecf2`, `bg3=#d0d5dc`
- Badge mensile/annuale in light richiedono override con colori solidi (le trasparenze dark non funzionano)

---

## Funzionalità principali

Dashboard · Conti (tipi, valute, icone emoji, colori) · Transazioni (split, tag, riconciliazione) · Categorie (gerarchiche, colori) · Budget (mensile/annuale, master amount) · Pianificate (ricorrenti, previsioni) · Portfolio (ticker, buy/sell, dividendi) · Report (Chart.js) · Impostazioni (tema, backup)

---

## Android — note specifiche

- DB condiviso con desktop via OneDrive (ContentResolver SAF)
- `DbHelper.kt` — accesso SQLite, gestione URI OneDrive, sync_meta
- `MainActivity.kt` — lista conti preferiti, swipe-to-refresh, ContentObserver per auto-reload dopo sync OneDrive
- `AddTransactionActivity.kt` — inserimento transazione con selezione categoria via BottomSheet
- `AccountsWidget.kt` — widget home screen statico (7 righe), aggiornamento con WorkManager
- `SyncWorker.kt` — sync periodico configurabile (1-24h) da Impostazioni
- `onStop()` chiude il DB → sblocca il file per OneDrive
- Tutti gli elementi widget devono essere `<ImageView>` o `<TextView>`, mai `<View>` base (non è nell'allowlist RemoteViews)
