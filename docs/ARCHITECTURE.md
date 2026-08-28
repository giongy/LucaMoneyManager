# LucaMoneyManager — Flusso applicazione (Desktop)

> Mappa completa di **cosa parte, in quale ordine, e dove vive cosa**.
> Riferimento per orientarsi prima di modificare il codice.
> Per l'app Android vedi [mobile/android/](../mobile/android/) — questo file copre solo il desktop.

> **Nota sui riferimenti:** i link puntano al file e citano il **nome del metodo**, non il numero
> di riga. I numeri di riga invecchiano male e diventano silenziosamente sbagliati; i nomi no.

---

## 1. Stack in una riga

```
Java 25  +  JCEF v146 (Chromium embedded)  +  SQLite (JDBC)
     │              │                              │
     │              └── ospita la UI web           └── DB locale (+ sync OneDrive)
     └── Swing per: titlebar, splash, dialog nativi, tray
```

- **Entry point JVM:** [App.java](../src/main/java/com/moneymanager/App.java) → `main()` → `run()`
- **Manifest mainClass:** `com.moneymanager.App`, definito in [pom.xml](../pom.xml) (`maven-shade-plugin`)
- **Frontend:** Vanilla JS in [src/main/resources/web/](../src/main/resources/web/)
- **Comunicazione JS↔Java:** `window.cefQuery` ([bridge.js](../src/main/resources/web/js/bridge.js) → `callJava`) → [Bridge.java](../src/main/java/com/moneymanager/Bridge.java) → `onQuery`
- **DB:** SQLite via `org.xerial:sqlite-jdbc`, schema gestito in [Database.java](../src/main/java/com/moneymanager/Database.java)

---

## 2. Sequenza di avvio (cold start)

`App.main()` è solo una **guardia**: delega a `run()` e cattura qualsiasi `Throwable`. In produzione
(jpackage, niente console) un errore prima che `app.log` sia agganciato andrebbe perso e l'app
morirebbe in silenzio; `reportFatal()` lo scrive invece su `crash.log` nella cartella dati e lo
mostra in un dialog.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PROCESSO JVM — App.run()                                                   │
│                                                                             │
│   ├─ 1.  Crea %APPDATA%\Roaming\LucaMoneyManager                            │
│   │                                                                         │
│   ├─ 2.  SingleInstance.tryAcquire(TrayManager::bringToFront)               │
│   │       ServerSocket porta 47291 (loopback).                              │
│   │       Già occupata → invia "SHOW" e System.exit(0).                     │
│   │                                                                         │
│   ├─ 3.  Carica settings.properties (Settings.java)                         │
│   │       Solo chiavi bootstrap: db.path, http.port, http.enabled,          │
│   │       autostart.enabled. Tutto il resto vive in app_settings nel DB.    │
│   │                                                                         │
│   ├─ 4.  Risolve db.path                                                    │
│   │       Non configurato → default <dataDir>\data.db, e lo scrive.         │
│   │       Configurato ma cartella assente → waitForDbFolder(): attende      │
│   │       fino a 30s che OneDrive la monti; se non arriva ESCE (exit 2)     │
│   │       SENZA toccare db.path (vedi "perché" sotto).                      │
│   │                                                                         │
│   ├─ 5.  redirectLog(<dir-del-db>\app.log)                                  │
│   │       System.err e System.out REDIRIZIATI al log. Avviene DOPO il       │
│   │       punto 4 apposta: un solo app.log, accanto al DB.                  │
│   │                                                                         │
│   ├─ 6.  Rileva java.exe / jar per l'autostart (TrayManager.javaExePath)    │
│   │                                                                         │
│   ├─ 7.  new Database(dbPath)                                               │
│   │       openConnection()  ─ SQLiteConfig: DELETE journal, FULL sync,      │
│   │                           cache 16MB, FK on                             │
│   │       initSchema()      ─ CREATE TABLE IF NOT EXISTS (20 tabelle)       │
│   │       migrate()         ─ schema_version step-by-step (vedi §6)         │
│   │       seedDefaultData() ─ categorie default, tag di sistema, ecc.       │
│   │                                                                         │
│   ├─ 8.  Runtime.addShutdownHook("db-shutdown") → db.close()                │
│   │       Rete di sicurezza per i percorsi che NON passano da               │
│   │       windowClosing (errore fatale, System.exit altrove, shutdown       │
│   │       del sistema): senza, resterebbe un <db>-journal accanto al DB     │
│   │       che OneDrive sincronizzerebbe. close() è idempotente.             │
│   │                                                                         │
│   ├─ 9.  findWebDir()                                                       │
│   │       Produzione: <dir-exe>/web/                                        │
│   │       IDE:        target/classes/web/  (filtrato da Maven)              │
│   │                                                                         │
│   ├─ 10. SplashWindow (JWindow Swing 70%×70%, sfondo verde #2f6b5e)         │
│   │       Mostrata SUBITO, prima ancora che JCEF parta.                     │
│   │                                                                         │
│   ├─ 11. CefAppBuilder.build()                                              │
│   │       installDir   = <appdata>\jcef\        (~200MB di Chromium)        │
│   │       root_cache   = <appdata>\jcef_cache\                              │
│   │       jcefArgs     = --ignore-gpu-blocklist --enable-gpu-rasterization  │
│   │                      --enable-zero-copy                                 │
│   │       background   = #dce1e8 (sfondo tema Nebbia) → niente flash        │
│   │       progressHandler aggiorna la splash durante il download al primo   │
│   │       avvio (LOCATING → DOWNLOADING → EXTRACTING → INSTALL).            │
│   │                                                                         │
│   └─ 12. SwingUtilities.invokeAndWait → new MainWindow(...)                 │
│            │                                                                │
│            ├─ JFrame undecorated 1280×820, min 900×600                      │
│            ├─ CefClient + CefMessageRouter (jsQueryFunction="cefQuery")     │
│            ├─ new Bridge(db, settings, frame, dataDir)                      │
│            ├─ ContextMenuHandler (tasto destro nativo)                      │
│            ├─ LoadHandler: azzera lo zoom UNA volta al primo load           │
│            ├─ WebServer.start(webDir, bridge, 7890) su virtual thread       │
│            │     (saltato se http.enabled=0)                                │
│            ├─ client.createBrowser(file:///.../index.html)                  │
│            ├─ WindowListener: closing / iconified / deiconified (vedi §7)   │
│            └─ showWhenReady(splash)  → vedi sotto                           │
│                                                                             │
│         …poi App.run() registra i ganci del tray e del DB:                  │
│            TrayManager.bringToFrontAction  = window::bringToFront           │
│            TrayManager.reloadAction        = window::reload                 │
│            TrayManager.closeDbAction / openDbAction  (virtual thread)       │
│            TrayManager.dbStatusSupplier / dbManuallyClosedSupplier          │
│            db.setExternalChangeCallback(window::notifyExternalDbChange)     │
│            autostart.enabled=1 → TrayManager.enable(frame)                  │
│                                                                             │
│  → Chromium carica index.html → init.js esegue init() → api.uiReady() →     │
│    Bridge invoca uiReadyCallback → splash svanisce → UI utente pronta.      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### `showWhenReady()` — il trucco off-screen

JCEF renderizza solo se la finestra è visibile (serve un HWND realizzato), ma mostrarla prima del
primo paint fa vedere un Canvas vuoto. Quindi:

1. `frame.setBounds(-30000, -30000, …)` + `setVisible(true)` → Chromium ha un HWND e disegna, fuori
   dallo schermo: l'utente non vede nulla.
2. Il JS conferma il primo frame con `api.uiReady()` → la finestra viene riportata on-screen e
   massimizzata, **già dipinta con la dashboard**.
3. `splash.fadeOut(350ms)` su contenuto reale, niente flash.
4. **Fallback:** se `uiReady` non arriva entro 4s (errore JS, ecc.) si mostra comunque.

### Dettagli "perché" non ovvi

| Punto | Motivazione |
|------|-------------|
| Splash mostrata prima di JCEF | Al primo avvio JCEF scarica ~200MB di Chromium: senza splash sembra che l'app non sia partita. |
| `setErr/setOut` su `app.log` | Le eccezioni di JCEF/SQLite/Swing non andrebbero altrimenti da nessuna parte (l'app non ha console in modalità windowed). |
| `waitForDbFolder` invece del ripiego sul default | Con l'autostart l'app parte insieme a OneDrive, che può metterci secondi a montare la cartella. Prima si ripiegava sul DB di default **riscrivendo `db.path`**: si apriva un database vuoto e si perdeva il percorso di quello vero. Ora si attende, e se non arriva si esce lasciando `db.path` intatto — al riavvio successivo funziona da solo. |
| `uiReady` callback invece di `onLoadEnd` | Con la GPU attiva il primo composite arriva ~500ms DOPO `onLoadEnd` → senza questo trigger si vede un flash nero dietro la splash che svanisce. Il JS chiama `api.uiReady()` dopo un double-`requestAnimationFrame` per avere certezza che un frame sia stato dipinto. |
| `SwingUtilities.invokeAndWait` per MainWindow | JCEF richiede che `createBrowser` venga chiamato sull'EDT; `invokeAndWait` blocca `run()` finché la finestra è costruita, così le successive registrazioni di tray/autostart trovano il frame valido. |
| Zoom azzerato al primo load | CEF persiste il livello di zoom per origine nella propria cache: senza il reset, un "Riduci zoom" fatto mesi fa resterebbe applicato per sempre. Gli zoom manuali della sessione restano (flag `zoomReset`). |

---

## 3. Bridge JS↔Java (il cuore di tutto)

Tutto il dialogo tra frontend e backend passa da **un'unica funzione**: `cefQuery`.

```
  JS (browser Chromium dentro JCEF)             Java (EDT o virtual thread)
  ────────────────────────────────             ─────────────────────────────
  api.getTransactions({...})                   Bridge.onQuery(...)
       │                                              │
       ▼                                              ▼
  callJava('getTransactions', params)          base64-decode → JSON
       │                                              │
       ▼                                              ▼
  payload = base64(JSON{method, params})       parse {method, params}
       │                                              │
       ▼                                              ▼
  window.cefQuery({                            switch(method) {
    request: payload,                            case "getTransactions" →
    onSuccess: r => …,                            db.getTransactions(p);
    onFailure: …                                 …
  })                                           }
       │                                              │
       │   ◄─── base64(JSON result) ──────────────────┘
       ▼
  resolve(JSON.parse(_fromB64(r)))
```

### Perché base64?
JCEF tronca le stringhe per byte e non per carattere: un emoji a 4 byte (es. 🏦) sfasa l'offset →
`MalformedJsonException` lato Gson. Encoding base64 in ASCII puro elimina il problema.
Vedi `_toB64`/`_fromB64` in [bridge.js](../src/main/resources/web/js/bridge.js) e `onQuery` in
[Bridge.java](../src/main/java/com/moneymanager/Bridge.java).

### Operazioni che escono dal dispatch
Trattate a parte in `onQuery`, prima dello switch, perché aprono UI bloccante o fanno HTTP esterno —
in entrambi i casi su `Thread.ofVirtual()`, per non bloccare il thread chiamante:
- `chooseDbFile`, `chooseBackupDir`, `chooseAttachmentsDir`, `chooseAttachmentFile` → dialog nativi Win32
- `fetchOnlinePrice` → HTTP a Borsa Italiana (scraping HTML)

### Tutto il resto: `dispatch(method, params, browser)`
Switch gigante in [Bridge.java](../src/main/java/com/moneymanager/Bridge.java) → `dispatch`.
**136 case** raggruppati per dominio (più i 4 `choose*` gestiti prima, sopra):

| Sezione | Esempi di method | Delega a |
|---------|------------------|----------|
| Finestra | minimize, maximize, close, uiReady, get/setWindowBounds, isMaximized | `window` (JFrame), `uiReadyCallback` |
| Conti | getAccounts, addAccount, updateAccount, deleteAccount, getAccountUsage | `db.*` |
| Categorie | getCategories, addCategory, setCategoryMobile, getExpenseNatureReport, reassignCategory | `db.*` |
| Transazioni | getTransactions, addTransaction, getTransactionSplits, updateTransactionReconciled, setTransactionOneoff | `db.*` |
| Budget | setBudget, getBudgetYear, setBudgetBulk, generateBudget, setBudgetConfig | `db.*` |
| Pianificate | getScheduled, advanceScheduled, getProjection, saveForecast, syncCardSettlements | `db.*` |
| Sync telefono | importPending, readPendingQueue, getTransactionsWithTag | `db.*` (vedi §6) |
| Portafoglio | getPortfolio, buyStock, sellStock, registerCoupon, registerDividend | `db.*` |
| Tag / Note / Range | get/add/update/delete, setNotePinned | `db.*` |
| Statistiche | getDashboardStats, getMonthlyChartData, getCategoryChartData, getCategoryComparison | `db.*` |
| Impostazioni | getSettings, setSetting, openSettingsFile | `settings` + `db.app_settings` |
| Allegati | attachFile, openAttachment, setAttachmentPath, removeAttachment | filesystem + `db.*` |
| Backup / DB | doBackup, listBackups, restoreBackup, dbVacuum, dbIntegrityCheck, dbReindex, dbAnalyze, archiveTransactions | `db.*` |
| Log | openAppLog, getAppLogErrors, clearAppLog, readLog, purgeLog, purgeSystemLog | `DbLogger` + filesystem |
| Sistema | openUrl, openDataDir, openLogFolder, exportHtmlReport, reloadDb, seedExampleData | `java.awt.Desktop` |
| Performance | setPerfEnabled, getPerfLog, clearPerfLog | buffer in-memory in Bridge |
| Stato DB | dbStatus, dbOpen, dbClose | usato soprattutto via WebServer (vedi §7) |

### Performance log
Se `_perfEnabled` è true, ogni chiamata salva `{method, javaMs, ts}` in un ring buffer.
Disponibile dal frontend via `api.getPerfLog()`, visibile dalla pagina Impostazioni.

---

## 4. Frontend — caricamento e bootstrap

### Ordine di esecuzione degli script
Definito in fondo a [index.html](../src/main/resources/web/index.html). Tutti senza `defer`,
eseguono in ordine:

```
┌──────────────────────────── VENDOR ───────────────────────────┐
│ 1. lucide.min.js          icone SVG sidebar/titlebar          │
│ 2. chart.min.js           Chart.js (grafici dashboard/analytics)│
│ 3. hammer.min.js          gesture touch (pan/zoom grafici)     │
│ 4. chartjs-plugin-zoom    pan/zoom su grafici                  │
├─────────────────────────── CORE ──────────────────────────────┤
│ 5. bridge.js              callJava + oggetto api {}            │
│ 6. utils.js               fmt.currency/date, evalAmount, …     │
│ 7. calculator.js          calcolatrice nei campi importo       │
│ 8. ui-shell.js            modale, titlebar drag, resize handles│
│ 9. router.js              navigate(), renderPage(), cronologia │
│ 10. sidebar.js            updateSidebar(), reports list        │
├─────────────────────────── PAGINE ────────────────────────────┤
│ 11-24.  dashboard, transactions, budget, portfolio,            │
│         analytics, settings, accounts, scheduled, forecasts,   │
│         categories, tags, ranges, logviewer, notes             │
│                                                                │
│         Ognuna espone una funzione renderXxx() chiamata        │
│         dal router quando si entra nella pagina.               │
├─────────────────────────── INIT ──────────────────────────────┤
│ 25. init.js               init() bootstrap finale              │
└────────────────────────────────────────────────────────────────┘
```

⚠️ **Quill NON è nella lista.** L'editor della pagina Note è pesante e serve a una pagina sola:
viene caricato **a richiesta** da `notes.js` con `loadVendorScript('js/vendor/quill.min.js')`
quando si apre il modale di una nota. Il file sta comunque in `js/vendor/`.

C'è anche uno **script inline in `<head>`**: riapplica sincronicamente l'aspetto memorizzato in
`localStorage` (`data-theme` + sfondo risolto) **prima del primo paint**, così non si vede il tema
di default lampeggiare prima che il JS carichi le impostazioni dal DB. Lo snapshot lo scrive
`_cacheAppearance()` in [settings.js](../src/main/resources/web/js/pages/settings.js).

### Cosa fa `init()` ([init.js](../src/main/resources/web/js/init.js))

```
init() async
  │
  ├─ _initGlobalTooltip()         (overlay <div> per i tooltip della dashboard)
  ├─ lucide.createIcons()         (sostituisce <i data-lucide="..."> con SVG)
  ├─ Detect modalità:
  │     cefQuery presente → JCEF (desktop)
  │     altrimenti          → browser remoto via WebServer
  │                            (nasconde titlebar, mostra toggle DB)
  ├─ isMaximized → mostra/nasconde resize handles
  ├─ getSettings → carica preferenze persistenti
  │     appearance.theme, accounts.favorites_only, proj.*, cf.*, range, ecc.
  ├─ _loadCustomThemes() + applyTheme(...)
  ├─ [solo browser] _updateWebDbToggle() + polling; se DB CHIUSO → return
  ├─ updateSidebar() + renderSidebarDate()
  ├─ renderDashboard()            (PRIMA pagina visibile)
  ├─ requestAnimationFrame×2 → api.uiReady()  ← splash svanisce
  │
  └─ Da qui in poi tutto è non bloccante e in try/catch singoli
     (un errore non deve fermare il resto del bootstrap):
        api.importPending()        → importa la coda dal telefono, poi toast
                                     e re-render dashboard se ha importato
        api.getTransactionsWithTag('phone') → showDaTelefonoNotice
        api.syncCardSettlements()  → riallinea le pianificate di saldo carta
        api.getOverdue()           → showOverdueNotice
        api.getDueToday()          → showDueTodayNotice
        api.getForecasts()         → showForecastReadyNotice
        api.getTransactions({reconciled:0}) → showUnverifiedNotice
        updateNoticeBtn()
        [solo desktop] onboarding.done ≠ 1 e nessun conto → showOnboardingWizard()
```

⚠️ **L'ordine di quella coda non è casuale:** `importPending()` va **prima** di
`getTransactionsWithTag('phone')` (altrimenti le appena importate non sarebbero contate) e
`syncCardSettlements()` **prima** di `getOverdue()` (così un saldo carta appena creato entra
subito fra le scadenze notificate).

### Refresh dal lato Java
Il frontend espone tre funzioni globali che Java invoca via `executeJavaScript`:

| Funzione | Chiamata da | Cosa fa |
|---|---|---|
| `onTrayRestore()` | `MainWindow.bringToFront()` (tray) e `windowDeiconified` (taskbar) | Invalida le cache JS di conti/categorie/tag e **ridisegna** — il DB può essere stato aggiornato dal telefono via OneDrive mentre l'app era nascosta |
| `onExternalDbChange()` | `Database.ensureOpen()` via `setExternalChangeCallback` | Stesso scopo, ma ridisegna la pagina **corrente** senza spostare l'utente sulla dashboard: qui la finestra è aperta e l'utente ci sta lavorando |
| `_updateWebDbToggle()` | polling JS ogni 2s in modalità browser | Allinea la barra di stato del DB (vedi §7) |

---

## 5. Router SPA + ciclo di vita di una pagina

### Navigazione
Definita in [router.js](../src/main/resources/web/js/router.js).

```
Click su .nav-item (sidebar)
       │
       ▼
navigate('budgets')
       │
       ├─ Rimuove .active da tutte le .page e .nav-item
       ├─ Aggiunge .active a #pg-budgets e [data-page=budgets]
       ├─ Aggiorna il titolo di pagina
       ├─ currentPage = 'budgets'
       └─ renderPage('budgets')   ──►   renderBudgets()  (in pages/budget.js)
```

### Cronologia indietro/avanti
Sempre in [router.js](../src/main/resources/web/js/router.js): uno stack lineare stile browser
(`_histStack` / `_histIdx`, max 50 voci, solo in memoria). `navigate()` appende una voce e tronca
il ramo "avanti"; le due frecce in sidebar (sopra la data), `←`/`→`, `Alt+←`/`Alt+→` e i tasti
laterali del mouse lo scorrono con `histGo(±1)`.

Le frecce **nude** si fermano quando il focus è in un campo di testo o in una select (`←`/`→` lì
muovono il cursore o cambiano voce); quelle con **Alt** valgono anche lì, perché Alt non serve a
scrivere. Entrambe si fermano con un pannello aperto sopra la pagina — modale, guida scorciatoie,
calcolatrice, editor dei temi (`_histBlocked()`): cambiare pagina lascerebbe il pannello appeso
sulla pagina sbagliata.

Ogni voce porta con sé lo **stato** della pagina, non solo il nome — `txFilters` per Transazioni,
la tab per Budget/Reports/Pianificate, il filtro salvato per la pagina Filtri (tabella
`_HIST_STATE`): tornare su Transazioni senza i filtri con cui la si era lasciata mostrerebbe un
elenco diverso da quello da cui si è usciti. Lo snapshot si aggiorna sia all'arrivo sia **all'uscita**
dalla pagina, perché filtri e tab cambiano anche stando fermi sulla stessa pagina.

⚠️ Le variabili di stato vivono nei moduli di pagina, caricati **dopo** `router.js`: `_HIST_STATE`
le legge/scrive solo a runtime e sempre dentro `try/catch` — un modulo assente darebbe
`ReferenceError`, e un dettaglio di stato non deve poter rompere la navigazione.
Aggiungendo una pagina con filtri o tab propri, va aggiunta la sua riga in `_HIST_STATE`.

### Anatomia di un modulo pagina
Ogni file `js/pages/*.js` segue lo stesso pattern:

```js
// pages/notes.js
let _notesState = { search: '', tagFilter: null };  // stato modulo (let globali)

async function renderNotes() {            // chiamata dal router
  const pg = document.getElementById('pg-notes');
  const [notes, tags] = await Promise.all([api.getNotes(), api.getTags()]);
  pg.innerHTML = `<div>...</div>`;        // injection diretta, no virtual DOM
  // wiring eventi: addEventListener / onclick inline / event delegation
}

function showNoteModal(...) { ... }       // helper esposti come globali
```

Le pagine **non sono moduli ES**: tutte le funzioni e variabili `let/const` ai loro top-level
diventano globali della finestra. È intenzionale (no transpiler, no bundler), ma significa che i
nomi devono essere unici tra pagine (convenzione: prefisso `_` per stato interno).

### Pattern modifica → refresh
1. `await api.addTransaction(data)` → Java aggiorna SQLite, JS invalida le cache locali
   (`api._invalidateAccounts()`)
2. `refreshAfterTxChange()` ([router.js](../src/main/resources/web/js/router.js)) → aggiorna sidebar e
   ridisegna le pagine interessate se attive

---

## 6. Database — schema, migrazioni, seed

### Apertura connessione
`Database.openConnection()` in [Database.java](../src/main/java/com/moneymanager/Database.java)

```java
SQLiteConfig:
  journalMode  = DELETE          // niente WAL: OneDrive non gradisce -wal/-shm
  synchronous  = FULL            // durability massima
  cacheSize    = 16 MB           // default è 2 MB
  tempStore    = MEMORY
  foreignKeys  = ON
```

⚠️ La connessione è **una sola, condivisa fra più thread**, e le query girano fuori dal lock.
Le tre regole che tengono in piedi il meccanismo (e cosa si rompe violandole) stanno in
[CLAUDE.md](../CLAUDE.md) → "Connessione DB — invariante da rispettare". Leggerle **prima** di
aggiungere un metodo che tocca `conn`.

### Pipeline `Database(dbPath)`

```
initSchema()        Crea le 20 tabelle "canoniche" se mancano.
                    Rispecchia lo schema COMPLETO alla v23 e timbra
                    subito schema_version = 23 sui DB nuovi.
       │
       ▼
migrate()           Solo per DB creati da versioni precedenti.
                    Esce immediatamente se schema_version >= 23.
                    v21: accounts.is_hidden
                    v22: accounts.payment_day / payment_account_id / auto_settle
                    v23: categories.mobile_favorite
       │
       ▼
seedDefaultData()   Categorie default, tag di sistema, range preset, ecc.
                    Inserite solo se le tabelle sono vuote.
```

**Come si aggiunge una migrazione (v24+):** un blocco `if (currentVersion < 24) { try { ALTER … }
catch (SQLException ignored) {} }` in `migrate()`, **e** la colonna nella `CREATE TABLE` di
`initSchema()`. Il `try/catch` è voluto: su un DB creato da `initSchema` già aggiornato l'`ALTER`
fallisce, ed è corretto ignorarlo.

⚠️ Le migrazioni **fino alla v20 sono state consolidate** in `initSchema()` e non esistono più come
step. Un DB a `version < 20` arriverebbe in fondo e verrebbe timbrato senza che nessuno abbia
aggiunto le colonne mancanti (`initSchema` crea solo le tabelle **assenti**, non altera quelle
esistenti). Non è un caso reale — non esistono backup anteriori alla v20 — quindi non è gestito.
`dbGetInfo()` espone comunque `schema_version` accanto a `schema_latest`.

### Tabelle (22 in totale)
| Dominio | Tabelle |
|---------|---------|
| Core | `accounts`, `categories`, `transactions`, `transaction_splits`, `tags`, `transaction_tags` |
| Budget | `budgets` (mensile), `budget_config` (master_amount + modo annuale) |
| Pianificate | `scheduled_transactions`, `scheduled_transaction_tags` |
| Portfolio | `portfolio`, `portfolio_transactions` |
| Previsioni | `forecasts` (archived), `forecast_categories` |
| Sistema | `app_settings`, `reports`, `range_presets`, `notes`, `note_tags`, `schema_version` |
| Sync Android | `sync_meta`, `imported_pending` |

⚠️ Le due tabelle **Sync Android non sono in `initSchema`**: nascono a runtime, `sync_meta` in
`touchSyncMeta()` e `imported_pending` in `importPending()`. Le altre 20 sì.

### Coda pendenti dal telefono
L'app Android apre il DB in **sola lettura** e accoda gli inserimenti in un `pending.jsonl` accanto
al database. È il desktop a importarli: `importPending()` legge la coda, salta gli id già presenti
in `imported_pending` (idempotenza) e aggancia il tag di sistema `phone` tramite `phoneTagId()` —
un unico punto deterministico. Viene invocata da `init()` a ogni avvio.

### Logging scritture
[DbLogger.java](../src/main/java/com/moneymanager/DbLogger.java) — ogni operazione di modifica scrive
una riga formattata in `<dbname>.log`. La sessione corrente è delimitata da `startOffset` (byte size
all'avvio): permette al backup automatico di sapere se ci sono cambiamenti reali e di generare il
sidecar JSON `<backup>.db.bak.json` con la lista delle modifiche.

---

## 7. Ciclo di vita finestra, tray e stato del DB

### I 3 stati della connessione

Lo stato è derivato da due booleani di `Database`: `isOpen()` e `isManuallyClosed()`.
**Decisione di progetto: restano tre, non vanno ridotti a due.**

| Stato | `isOpen` | `manuallyClosed` | Come ci si arriva |
|---|---|---|---|
| **OPEN** (verde) | true | false | Qualsiasi query, `reopen()`, `ensureOpen()` |
| **IDLE** (grigio) | false | false | Timer di inattività, X→tray, minimizzazione — **solo in background** |
| **CLOSED** (rosso) | false | true | **Solo** `closeManual()`: bottone "Chiudi" nel web o voce del menu tray |

⚠️ In **foreground** `autoRelease` è disattivato: finché l'utente lavora il lock resta preso, niente
rilasci a sorpresa a metà lavoro. Si va in IDLE solo minimizzando o andando nel tray.
Da IDLE i dati si caricano lo stesso: la query successiva riapre da sé (`ensureOpen()`).

### Handler della finestra ([MainWindow.java](../src/main/java/com/moneymanager/MainWindow.java))

```
windowClosing()  ── riceve sia la X sia "Esci" dal tray (doExit invia un
   │                WINDOW_CLOSING vero, così il backup non viene saltato)
   ├─ toTray = TrayManager.isActive()   ← letto ORA, sull'EDT: doExit lo azzera prima
   ├─ se toTray: bridge.clearSessionState()
   ├─ db.setAutoRelease(true)           ← si va in background
   ├─ frame.setVisible(false)           ← feedback immediato, sempre eseguito
   ├─ guardia anti-rientranza (closing CAS)  ← niente doppio backup in parallelo
   └─ thread "shutdown-backup" (NON daemon):
        backup automatico se abilitato e ci sono modifiche
        db.close()
        toTray ? riarma la guardia e resta vivo : dispose JCEF + System.exit(0)

windowIconified()    → db.setAutoRelease(true) + db.close()
                       Minimizzata = non la stai usando: rilascia subito il lock così
                       OneDrive sincronizza senza creare file di conflitto.

windowDeiconified()  → db.setAutoRelease(false) + onTrayRestore()
                       Speculare: torni in foreground, il lock resta preso e le cache
                       JS (stale se il telefono ha scritto) vengono invalidate.
```

⚠️ **Il backup gira su un thread dedicato, non sull'EDT.** È un `Files.copy` dell'intero `.db`:
sull'EDT congelava la finestra ("Non risponde") per tutta la copia — secondi su un DB di qualche
decina di MB, minuti se OneDrive deve idratare un file cloud-only, fino al timeout SMB se la
cartella di backup è su una share irraggiungibile. Il thread è **non-daemon** apposta: sull'uscita
la JVM deve aspettare che finisca, altrimenti resterebbe un `.bak` troncato.

### Ritorno in primo piano — `bringToFront()`

```
1. db.setAutoRelease(false)        ← foreground: il lock resta preso
2. frame.setVisible(true) + deminimizza + massimizza + toFront   ← SUBITO
3. virtual thread: db.reopen()     ← fuori dall'EDT
4. …al termine, invokeLater: onTrayRestore()
```

⚠️ **La finestra si mostra prima di riaprire il DB, e `reopen()` non gira sull'EDT**: apre un file
che può stare su OneDrive de-idratato, quindi può bloccare per secondi — proprio nell'istante in cui
l'utente ha cliccato sul tray e si aspetta di rivedere la finestra. Stessa ragione per `reload()` e
per le azioni DB del menu tray, tutte su virtual thread.

### Menu tray ([TrayManager.java](../src/main/java/com/moneymanager/TrayManager.java))

Riga di stato (pallino + testo: *Database connesso / inattivo / chiuso*), poi:
🔌 **Chiudi connessione DB** (🔗 *Riapri* se CLOSED) · 📂 **Apri LucaMoneyManager** ·
🔄 **Ricarica** · ⏻ **Esci**.

L'icona del tray ha un **polling autonomo ogni 2s** e si rigenera solo al cambio di stato
(verde/grigio/rosso via `IconFactory.createForState`), così funziona anche a finestra nascosta.
L'icona dell'app/taskbar resta sempre verde.

*Scelta voluta:* a IDLE il menu mostra comunque "Chiudi connessione DB" anche se la connessione è
già chiusa — il click esegue `closeManual()` (IDLE→CLOSED) per rilasciare il lock a mano.

*Gap noto (non critico):* `openDbAction` del tray fa solo `db.reopen()` e non ri-renderizza il
frontend LAN, che si riallinea al polling successivo. Il bottone "Apri" del web invece invalida le
cache e ridisegna esplicitamente.

### Autostart Windows
`TrayManager.registerAutostart()` scrive una chiave in
`HKCU\Software\Microsoft\Windows\CurrentVersion\Run` con `"<java.exe>" -jar "<jar>"`.
Si attiva da Impostazioni → `setSetting("autostart.enabled", "1")`.

### Single instance
[SingleInstance.java](../src/main/java/com/moneymanager/SingleInstance.java) usa un `ServerSocket` sulla
porta 47291 (loopback). Se l'app è già in esecuzione il secondo processo si connette, manda "SHOW",
e `bringToFrontAction` riapre la finestra.

---

## 8. WebServer LAN (accesso da browser remoto)

Avviato dal costruttore di [MainWindow](../src/main/java/com/moneymanager/MainWindow.java) su virtual
thread, porta di default 7890 (`http.port`).

```
http://<IP-PC>:7890/                   →   serve file da webDir (index.html, css, js)
http://<IP-PC>:7890/bridge   POST      →   stesso Bridge.dispatch di JCEF, payload base64
```

Il contesto `/bridge` filtra le **operazioni desktop-only prima del dispatch**, rispondendo
`{ok:false, webOnly:true}` senza eseguirle: controlli finestra (`minimize`, `maximize`, `close`,
`get/setWindowBounds`, `isMaximized`), dialog nativi (`choose*`), e le azioni che aprirebbero
qualcosa **sul PC** invece che sul browser remoto (`openDataDir`, `openLogFolder`, `openUrl`,
`exportHtmlReport`).

Due protezioni non ovvie, entrambe nate da modi reali di far cadere l'app:
- **Corpo limitato a 8 MB** (`readLimited`): `readAllBytes()` materializzava senza limiti una POST
  arbitraria dalla LAN fino all'`OutOfMemoryError` — che non è isolabile, porta giù tutto,
  connessione al DB compresa. Il payload legittimo più grosso è una nota con immagine incollata
  (Quill incorpora data URI base64), quindi 8 MB sono larghissimi.
- **Timeout 30s** su richiesta e risposta (`sun.net.httpserver.maxReq/maxRspTime`): senza, un client
  che apre la connessione e non manda nulla tiene occupati virtual thread e connessione a tempo
  indeterminato.

Lato JS ([bridge.js](../src/main/resources/web/js/bridge.js)): se `window.cefQuery` non esiste,
fallback a `fetch('/bridge', …)`. La modalità browser nasconde la titlebar desktop e mostra la barra
di stato del DB, aggiornata da `_updateWebDbToggle()` con polling ogni 2s
(OPEN = verde + "Chiudi" · IDLE = grigia, nessun bottone, i dati caricano lo stesso ·
CLOSED = rossa + "Apri").

⚠️ Il `WebServer` usa **un virtual thread per richiesta**: `Bridge.dispatch` e `Database` girano
davvero in parallelo con il thread UI di JCEF. È il motivo per cui esiste l'invariante sulla
connessione (§6).

Disabilitabile con `http.enabled=0` in `settings.properties`.

---

## 9. Temi e CSS

- Foglio unico: [css/style.css](../src/main/resources/web/css/style.css) (~2680 righe, sezioni marcate
  con header `─── ───`)
- Tema via `<html data-theme="…">` impostato da `applyTheme()` in
  [pages/settings.js](../src/main/resources/web/js/pages/settings.js)
- **Quattro temi built-in:** 🌁 `nebbia` (default, chiaro — vive in `:root`, **senza** `data-theme`),
  📜 `carta` (chiaro), 🛢️ `petrolio` (scuro), 🪟 `glassy` (scuro, "Vetro")
- Temi custom utente: salvati in `app_settings` chiave `appearance.custom_themes` (JSON), chiave
  `c:<id>`, applicano le variabili **inline** (vincono su tutto)
- ⚠️ **Regole e trappole dei temi** (default chiaro con regole base nate scure, selettore in
  negativo, gerarchia `bg3 < bg < bg2`): vedi [CLAUDE.md](../CLAUDE.md) → "UI — Temi" e il commento in
  testa a `style.css`. Dopo averli toccati, `tools\check-ui.ps1`.

---

## 10. Build & deploy

| Comando | Cosa fa |
|---------|---------|
| `mvn exec:java` | Avvio diretto in IDE/CLI, mainClass `com.moneymanager.App` |
| `mvn package` | Fat JAR via maven-shade-plugin → `target/moneymanager-1.21.0.jar` (esclude `web/`) |
| `build.bat` | Wrapper interattivo Maven (chiede i passi) |
| `prepare-package` | Genera `target/icon.ico` invocando `IconFactory.main()` |

In **produzione** (post-jpackage):
```
<deploy>/
   app/moneymanager.jar
   moneymanager.exe
   web/               ← serviti dal filesystem, modificabili senza ricompilare
       index.html
       css/style.css
       js/...
```
In **IDE**: `web/` viene letta da `target/classes/web/` (con resource filtering Maven, es.
`${project.version}`). Una modifica a un `.js` richiede solo un Reload della finestra Chromium per
essere visibile (no riavvio JVM).

---

## 11. Cheat sheet — "dove modifico cosa?"

| Voglio modificare… | File principale | Note |
|--------------------|-----------------|------|
| Colori/stili/layout | [css/style.css](../src/main/resources/web/css/style.css) | Variabili CSS in `:root` e `[data-theme="…"]` — leggi prima §9 |
| Una pagina (es. Budget) | [js/pages/budget.js](../src/main/resources/web/js/pages/budget.js) | `renderBudgets()` è l'entry point |
| Sidebar / menu | [index.html](../src/main/resources/web/index.html) + [js/sidebar.js](../src/main/resources/web/js/sidebar.js) | Aggiungi `<a data-page="X">` + handler in [router.js](../src/main/resources/web/js/router.js) |
| Query SQL | [Database.java](../src/main/java/com/moneymanager/Database.java) | Text blocks `"""…"""`, sempre PreparedStatement |
| Esporre un metodo nuovo al JS | `dispatch` in [Bridge.java](../src/main/java/com/moneymanager/Bridge.java) + oggetto `api` in [bridge.js](../src/main/resources/web/js/bridge.js) | Aggiungere `case "x" -> …` e wrapper `api.x` |
| Schema DB | `initSchema()` **e** `migrate()` in [Database.java](../src/main/java/com/moneymanager/Database.java) | Vedi §6: servono entrambi. Non modificare migrazioni già rilasciate |
| Splash | [SplashWindow.java](../src/main/java/com/moneymanager/SplashWindow.java) | `paintComponent` Swing puro |
| Icona app / tray | [IconFactory.java](../src/main/java/com/moneymanager/IconFactory.java) | `create` (app) e `createForState` (tray verde/grigio/rosso) |
| Impostazioni nuove | Default lato JS in [init.js](../src/main/resources/web/js/init.js); persistite con `api.setSetting(key, value)` → DB | Solo le 4 chiavi bootstrap restano in `settings.properties` |
| Tray / autostart | [TrayManager.java](../src/main/java/com/moneymanager/TrayManager.java) | Solo Windows (HKCU Run) |
| Bridge HTTP remoto | [WebServer.java](../src/main/java/com/moneymanager/WebServer.java) | Blocklist dei method desktop-only nel contesto `/bridge`, prima del dispatch |
| Logging modifiche DB | [DbLogger.java](../src/main/java/com/moneymanager/DbLogger.java) | `db.logger.log("AZIONE", "campo:val")` |

---

## 12. Mini-glossario

- **JCEF** — Java Chromium Embedded Framework: bindings Java per CEF (Chromium senza barra URL/menu).
  [`jcefmaven`](../pom.xml) gestisce il download dei binari nativi.
- **EDT** — Event Dispatch Thread (Swing). Tutto ciò che tocca `JFrame` deve girare lì →
  `SwingUtilities.invokeLater/invokeAndWait`.
- **`cefQuery`** — funzione JS iniettata da JCEF per chiamare Java. Configurata nel costruttore di
  [MainWindow](../src/main/java/com/moneymanager/MainWindow.java) (`CefMessageRouterConfig`).
- **virtual thread** — `Thread.ofVirtual().start(…)`, leggero. Usato per dialog nativi, HTTP esterno,
  WebServer, e per ogni operazione che può bloccare su OneDrive (`reopen`, `close` dal tray).
- **`activeQueries`** — contatore delle query in volo in `Database`. Le query girano fuori dal lock
  per non serializzarle, quindi il `synchronized` da solo non basta a sapere se il DB è in uso: chi
  vuole chiudere la connessione deve controllare questo contatore.
- **auto-release** — rilascio automatico del lock sul file DB dopo inattività. **Attivo solo in
  background** (tray/minimizzata): in foreground il lock resta preso finché l'utente lavora.
- **bootstrap key** — chiave di impostazione necessaria PRIMA che il DB sia aperto (`db.path`,
  `http.*`, `autostart.enabled`). Vive in `settings.properties`; tutto il resto in `app_settings`.
- **`uiReady`** — segnale JS→Java che il primo frame è stato dipinto; sblocca il fade della splash.

---

Per dubbi sul lato Android vedi [mobile/android/](../mobile/android/) (struttura indipendente,
condivide solo il file `.db` e la coda `pending.jsonl` via OneDrive).
