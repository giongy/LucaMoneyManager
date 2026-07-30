# LucaMoneyManager — Contesto progetto

App di gestione finanze personali sviluppata da Luca per uso personale.
Due piattaforme: **desktop (primaria)** e **Android (secondaria)**, database SQLite condiviso via OneDrive.

---

## Piattaforme

### Desktop
- **Linguaggio:** Java 25, Maven 3.x
- **UI:** JCEF v146 (Chromium embedded) + Swing per dialogs/titlebar/splash
- **Frontend:** Vanilla JS puro (`src/main/resources/web/`, modulare in `js/pages/*.js`), no React/Vue
- **Versione:** 1.18.1 — output `target/moneymanager-1.18.1.jar` (fat JAR, web/ esclusa)
- **Web assets:** serviti da filesystem (cartella `web/` accanto al `.exe` in produzione, `target/classes/web/` in IDE)
- **DB path:** `%APPDATA%\LucaMoneyManager\data.db` (`%APPDATA%` = `...\Roaming`)
- **Build:** `mvn package` oppure `build.bat`

### Android
- **Linguaggio:** Kotlin (Java 17 compat), Gradle Kotlin DSL
- **UI:** AndroidX + Material Design 3, min SDK 26, target SDK 35
- **App ID:** `com.example.luca_wallet`, versione 2.1 (versionCode 3)
- **Path:** `mobile/android/`
- **CI/CD:** GitHub Actions — APK firmato automatico su push a master

---

## Architettura desktop

```
JS Frontend (js/pages/*.js, 14 moduli)
    ↓  cefQuery (payload JSON in Base64)      ↑ stessa API anche via HTTP LAN (WebServer)
Bridge.java (~935 LOC) — dispatch 133 operazioni
    ↓
Database.java (~4730 LOC) — tutte le query JDBC
    ↓
SQLite
```

**Classi Java:** `App` (entry point), `MainWindow` (Swing + JCEF), `Bridge` (dispatch JS↔Java), `Database` (JDBC), `Settings` (preferenze utente), `IconFactory` (generazione .ico), `SplashWindow` (splash Swing 700ms), `TrayManager` (system tray), `SingleInstance` (lock istanza unica), `WebServer` (serve web/ da filesystem), `DbLogger` (logging query), `ContextMenuHandler` (menu tasto destro nativo: ricarica/zoom/devtools)

**Moduli JS pagine** (LOC indicativi): `analytics` (3480), `portfolio` (2020), `budget` (1960), `settings` (1765), `transactions` (1350), `scheduled` (1005), `dashboard` (970), `accounts` (375), `notes` (350), `categories` (270), `forecasts` (235), `logviewer` (205), `ranges` (195), `tags` (105)

### Connessione DB — invariante da rispettare

`Database` usa **una sola `Connection`**, condivisa da più thread: thread UI di JCEF, virtual thread del `WebServer` e dei dialog async, EDT Swing (tray/iconify/backup), thread del timer di auto-release. **Non** c'è nulla che serializzi le chiamate. Le tre regole che tengono in piedi il tutto:

1. `conn` si legge e si scrive **solo** sotto il lock di `Database` (`synchronized`);
2. la connessione si chiude **solo** da `close()` — unico punto, che aggiorna anche la baseline mtime/size per il rilevamento delle modifiche esterne;
3. `close()` **non chiude** se `activeQueries > 0`; ci penserà l'auto-release, riprogrammato da `endQuery()`.

Le query girano deliberatamente **fuori** dal lock (per non serializzarle): è per questo che serve il contatore `activeQueries` oltre al `synchronized`. `inTx()` lo tiene alzato per tutta la transazione, non solo per i singoli statement.

⚠️ Aggiungendo un metodo che tocca `conn`, rispetta le tre regole: violarle produce corruzione dati silenziosa (transazione committata a metà) o una connessione orfana che tiene il lock su OneDrive per sempre.

---

## Schema DB (v21, 22 tabelle)

- **Core:** `accounts` (3 stati: `is_closed`, `is_hidden` — nascosto ⇒ sempre chiuso), `categories` (gerarchiche, `expense_nature`), `transactions` (`reconciled`, `attachment_path`, `color`), `transaction_splits`, `transaction_tags`, `tags` (`is_system`, `system_key`)
- **Budget:** `budgets`, `budget_config` (master_amount mensile/annuale)
- **Pianificate:** `scheduled_transactions` (`portfolio_id`, `original_start_date`), `scheduled_transaction_tags`
- **Portfolio:** `portfolio` (equity/bond: `asset_type`, `face_value`, `maturity_date`, `coupon_*`, `country`), `portfolio_transactions`
- **Previsioni:** `forecasts` (archived), `forecast_categories` — snapshot "Salva previsione" in Pianificate
- **Note:** `notes` (`pinned`, `color`, editor Quill), `note_tags`
- **Sistema:** `reports`, `range_presets`, `app_settings`, `schema_version`
- **Sync Android:** `sync_meta` (marcatori `last_modified`/`last_modified_by`), `imported_pending` (id delle righe di `pending.jsonl` già importate → idempotenza dell'import). ⚠️ Queste 2 tabelle **non** sono in `initSchema`: nascono a runtime in `touchSyncMeta()` e `importPending()`. Le altre 20 sì.

**Indici (oltre alle PK):** su `transactions(date, account_id, category_id, to_account_id)` + composito `(account_id, date)`; su `transaction_splits(transaction_id)` e `portfolio_transactions(transaction_id)` (FK non indicizzate da SQLite); su `categories(parent_id)`, `budgets(year)`, `scheduled_transactions(is_active)`, `transaction_tags(tag_id)`, `note_tags(tag_id)`, `portfolio(account_id)`

**SQLite config:** journal=DELETE, synchronous=FULL, cache=16MB, temp_store=MEMORY, FK abilitati

---

## Convenzioni

- **Lingua:** tutto in italiano (commenti, stringhe UI, messaggi errore)
- **Naming:** PascalCase classi, camelCase metodi/variabili, UPPER_SNAKE_CASE costanti, snake_case tabelle DB
- **Nessun test automatico** sulla logica — test manuale via UI. Per la **resa grafica** esiste però una verifica automatizzabile: vedi "Verifica visiva dell'UI" più sotto
- **Nessun framework JS** — Vanilla JS puro
- **Commenti sezione** con separatori Unicode `── ──`
- **SQL:** text blocks Java (`"""..."""`)
- Non aggiungere feature extra o refactoring non richiesti
- **Commenti:** ammessi commenti esplicativi su funzioni e parti di codice (Java, JS, HTML, CSS); tenerli aggiornati quando si modifica il codice commentato, per evitare che vadano fuori sync

---

## UI — Tema light

Il tema light **non deve essere bianco puro** — l'utente lo trova aggressivo.
- Gerarchia obbligatoria: `bg3 < bg < bg2` (cards più chiare dello sfondo, mai #fff)
- Valori approvati: `bg=#dce0e7`, `bg2=#e9ecf2`, `bg3=#d0d5dc`
- Badge mensile/annuale in light richiedono override con colori solidi (le trasparenze dark non funzionano)

---

## Verifica visiva dell'UI (screenshot automatici)

**Le modifiche a CSS/layout/temi vanno verificate guardando l'app, non deducendole dal codice.**
Grep e lettura dei file dimostrano che una regola è scritta, non che si veda bene: il contrasto,
l'impaginazione e il cascade tra temi si giudicano solo sul rendering reale.

### Come funziona

Sfrutta due cose già presenti, senza installare nulla (niente Node/npm/Playwright):

1. **`WebServer`** espone UI + bridge API su HTTP → l'app è pilotabile da un browser normale,
   con dati veri e non una vista statica.
2. **Chrome** (già installato) guidato via **DevTools Protocol** (`--remote-debugging-port`).

### Prerequisiti

- App **in esecuzione** con WebServer attivo (Impostazioni → accesso LAN).
- Porta: **7890** in produzione. L'istanza lanciata da VSCode usa il DB di progetto
  (`D:\LucaMoneyManager\luca.db`) e conviene tenerla su una porta diversa (es. **7891**),
  così non c'è modo di confondersi coi dati reali su OneDrive.
- ⚠️ Prima di test che **scrivono**, verificare sempre su quale DB si sta operando:
  `getSettings` restituisce `db.path`.

### Uso

```powershell
# Screenshot di una pagina (il -Js gira nella pagina: vede navigate, applyTheme, currentPage...)
.\tools\screenshot.ps1 -Port 7891 -Js "navigate('budgets')" -Out budget
.\tools\screenshot.ps1 -Port 7891 -Js "applyTheme('carta'); navigate('transactions')" -Out tx-carta

# Controllo automatico su tutte le pagine: errori JS, overflow-X, elementi che sforano,
# contrasto WCAG sui bottoni pieni
.\tools\check-ui.ps1 -Port 7891 -Theme carta
.\tools\check-ui.ps1 -Port 7891 -Theme petrolio -Pages dashboard,budgets
```

Gli screenshot finiscono in `tools/screenshots/` (in .gitignore: sono artefatti, non codice).

`-Js` serve anche a **misurare** invece che stimare — es. leggere i colori calcolati:
```js
getComputedStyle(document.querySelector('.btn-primary')).color   // "rgb(255, 255, 255)"
```

### Limiti (importanti)

- **Chrome non è JCEF**: stesso motore Chromium, ma font, emoji e `backdrop-filter`
  (tema glassy) possono rendere diversamente. Ottima approssimazione, non prova definitiva.
- **Non copre Swing**: titlebar custom, tray, splash, dialog nativi, resize handles.
  Quella parte resta verificabile solo a mano.

---

## Funzionalità principali

Dashboard · Conti (tipi, valute, icone emoji, colori) · Transazioni (split, tag, riconciliazione) · Categorie (gerarchiche, colori) · Budget (mensile/annuale, master amount) · Pianificate (ricorrenti, previsioni) · Portfolio (ticker, buy/sell, dividendi) · Report (Chart.js) · Note (editor Quill, lazy-load) · Impostazioni (tema, backup)

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
