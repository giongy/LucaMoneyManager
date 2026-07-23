# LucaMoneyManager — Flusso applicazione (Desktop)

> Mappa completa di **cosa parte, in quale ordine, e dove vive cosa**.
> Riferimento per orientarsi prima di modificare il codice.
> Per l'app Android vedi [mobile/android/](mobile/android/) — questo file copre solo il desktop.

---

## 1. Stack in una riga

```
Java 25  +  JCEF v146 (Chromium embedded)  +  SQLite (JDBC)
     │              │                              │
     │              └── ospita la UI web           └── DB locale (+ sync OneDrive)
     └── Swing per: titlebar, splash, dialog nativi, tray
```

- **Entry point JVM:** [App.java](src/main/java/com/moneymanager/App.java)
- **Manifest mainClass:** definito in [pom.xml:103](pom.xml#L103)
- **Frontend:** Vanilla JS in [src/main/resources/web/](src/main/resources/web/)
- **Comunicazione JS↔Java:** `window.cefQuery` ([bridge.js](src/main/resources/web/js/bridge.js)) → [Bridge.java](src/main/java/com/moneymanager/Bridge.java)
- **DB:** SQLite via `org.xerial:sqlite-jdbc`, schema gestito in [Database.java](src/main/java/com/moneymanager/Database.java)

---

## 2. Sequenza di avvio (cold start)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PROCESSO JVM                                                               │
│                                                                             │
│  App.main()                                                                 │
│   │                                                                         │
│   ├─ 1.  Crea %APPDATA%\Roaming\LucaMoneyManager                            │
│   │                                                                         │
│   ├─ 2.  SingleInstance.tryAcquire()                                        │
│   │       ServerSocket porta 47291 (loopback).                              │
│   │       Già occupata → invia "SHOW" e System.exit(0).                     │
│   │                                                                         │
│   ├─ 3.  Carica settings.properties (Settings.java)                         │
│   │       Solo chiavi bootstrap: db.path, http.port, http.enabled,          │
│   │       autostart.enabled. Tutto il resto vive in app_settings nel DB.    │
│   │                                                                         │
│   ├─ 4.  Risolve dbPath + crea app.log accanto al DB                        │
│   │       System.err e System.out vengono REDIRIZIATI al log.               │
│   │                                                                         │
│   ├─ 5.  new Database(dbPath)                                               │
│   │       openConnection()  ─ SQLiteConfig: DELETE journal, FULL sync,      │
│   │                           cache 16MB, FK on                             │
│   │       initSchema()      ─ CREATE TABLE IF NOT EXISTS (20 tabelle)       │
│   │       migrate()         ─ schema_version step-by-step (vedi §6)         │
│   │       seedDefaultData() ─ categorie default, tag system, ecc.           │
│   │                                                                         │
│   ├─ 6.  findWebDir()                                                       │
│   │       Produzione: <dir-exe>/web/                                        │
│   │       IDE:        target/classes/web/  (filtrato da Maven)              │
│   │                                                                         │
│   ├─ 7.  SplashWindow (JWindow Swing 70%×70%, sfondo verde)                 │
│   │       Mostrata SUBITO, prima ancora che JCEF parta.                     │
│   │                                                                         │
│   ├─ 8.  CefAppBuilder.build()                                              │
│   │       installDir   = <appdata>\jcef\        (~200MB di Chromium)        │
│   │       cache        = <appdata>\jcef_cache\                              │
│   │       jcefArgs     = --ignore-gpu-blocklist --enable-gpu-rasterization  │
│   │                      --enable-zero-copy                                 │
│   │       progressHandler aggiorna la splash durante il download al primo   │
│   │       avvio (LOCATING → DOWNLOADING → EXTRACTING → INSTALL).            │
│   │                                                                         │
│   └─ 9.  SwingUtilities.invokeAndWait → new MainWindow(...)                 │
│            │                                                                │
│            ├─ JFrame undecorated 1280×820, min 900×600                      │
│            ├─ CefClient + CefMessageRouter (jsQueryFunction="cefQuery")     │
│            ├─ new Bridge(db, settings, frame, dataDir)                      │
│            │     └─ migrateSettingsToDB() (una tantum)                      │
│            ├─ router.addHandler(bridge)                                     │
│            ├─ WebServer.start(webDir, bridge, 7890) su virtual thread       │
│            │     (saltato se http.enabled=0)                                │
│            ├─ client.createBrowser(file:///.../index.html)                  │
│            ├─ WindowListener: tray hide / backup automatico / close         │
│            └─ showWhenReady(splash):                                        │
│                  setExtendedState(MAXIMIZED_BOTH); setVisible(true);        │
│                  attende callback "uiReady" dal JS, poi splash.fadeOut().   │
│                  Fallback: fade dopo 4s se uiReady non arriva.              │
│                                                                             │
│  → Chromium carica index.html → init.js esegue init() → uiReady() →         │
│    Bridge invoca uiReadyCallback → splash svanisce → UI utente pronta.      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Dettagli "perché" non ovvi

| Step | Motivazione |
|------|-------------|
| Splash mostrata prima di JCEF | Al primo avvio JCEF scarica ~200MB di Chromium: senza splash sembra che l'app non sia partita. |
| `setErr/setOut` su `app.log` | Le eccezioni di JCEF/SQLite/Swing non andrebbero altrimenti da nessuna parte (l'app non ha console in modalità windowed). |
| `uiReady` callback invece di `onLoadEnd` | Con la GPU attiva il primo composite arriva ~500ms DOPO `onLoadEnd` → senza questo trigger si vede un flash nero dietro la splash che svanisce. Il JS chiama `api.uiReady()` dopo un double-`requestAnimationFrame` per avere certezza che un frame sia stato dipinto. Vedi [init.js:324](src/main/resources/web/js/init.js#L324) e [Bridge.java:260](src/main/java/com/moneymanager/Bridge.java#L260). |
| `SwingUtilities.invokeAndWait` per MainWindow | JCEF richiede che `createBrowser` venga chiamato sull'EDT; `invokeAndWait` blocca `main()` finché la finestra è costruita, così le successive operazioni di tray/autostart trovano il frame valido. |

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
JCEF tronca le stringhe per byte e non per carattere: un emoji a 4 byte (es. 🏦) sfasa l'offset → `MalformedJsonException` lato Gson.
Encoding base64 in ASCII puro elimina il problema. Vedi [bridge.js:11](src/main/resources/web/js/bridge.js#L11) e [Bridge.java:75](src/main/java/com/moneymanager/Bridge.java#L75).

### Operazioni async-friendly (escono dal dispatch)
Vengono trattate a parte perché aprono UI bloccante o fanno HTTP esterno:
- `chooseDbFile`, `chooseBackupDir`, `chooseAttachmentsDir`, `chooseAttachmentFile` → `Thread.ofVirtual()` + dialog nativi Win32
- `fetchOnlinePrice` → HTTP a Borsa Italiana (scraping HTML, vedi [Bridge.java:715](src/main/java/com/moneymanager/Bridge.java#L715))

### Tutto il resto: `dispatch(method, params, browser)`
Switch gigante in [Bridge.java:233](src/main/java/com/moneymanager/Bridge.java#L233). ~120 case raggruppati per dominio:

| Sezione | Esempi di method | Delega a |
|---------|------------------|----------|
| Finestra | minimize, maximize, close, uiReady, get/setWindowBounds | `window` (JFrame), `uiReadyCallback` |
| Conti | getAccounts, addAccount, updateAccount, deleteAccount | `db.getAccounts()` ecc. |
| Categorie | getCategories, addCategory, getExpenseNatureReport | `db.*` |
| Transazioni | getTransactions, addTransaction, getTransactionSplits | `db.*` |
| Budget | getBudgets, generateBudget, setBudgetBulk, setBudgetConfig | `db.*` |
| Pianificate | getScheduled, advanceScheduled, getProjection, saveForecast | `db.*` |
| Portafoglio | getPortfolio, buyStock, registerCoupon, registerDividend | `db.*` |
| Tag / Note / Range | get/add/update/delete | `db.*` |
| Statistiche | getDashboardStats, getMonthlyChartData, getCategoryChartData | `db.*` |
| Impostazioni | getSettings, setSetting | `settings` + `db.app_settings` |
| Allegati | attachFile, openAttachment, removeAttachment | filesystem + `db.setAttachment` |
| Backup / DB | doBackup, listBackups, restoreBackup, dbVacuum, dbIntegrityCheck | `db.*` |
| Sistema | openSettingsFile, openAppLog, openUrl, openDataDir, resetJcef | `java.awt.Desktop` |
| Performance | setPerfEnabled, getPerfLog | buffer in-memory in Bridge |
| DB remoto | dbStatus, dbOpen, dbClose | usato solo via WebServer |

### Performance log
Se `_perfEnabled` è true ([Bridge.java:38](src/main/java/com/moneymanager/Bridge.java#L38)), ogni chiamata salva `{method, javaMs, ts}` in un ring buffer da 150 elementi. Disponibile dal frontend via `api.getPerfLog()`, visibile dalla pagina Impostazioni.

---

## 4. Frontend — caricamento e bootstrap

### Ordine di esecuzione degli script
Definito in [index.html:168-192](src/main/resources/web/index.html#L168). Tutti senza `defer`, eseguono in ordine:

```
┌──────────────────────────── VENDOR ───────────────────────────┐
│ 1. lucide.min.js          icone SVG sidebar/titlebar          │
│ 2. chart.min.js           Chart.js (grafici dashboard/analytics)│
│ 3. hammer.min.js          gesture touch (panel zoom mobile)    │
│ 4. chartjs-plugin-zoom    pan/zoom su grafici                  │
│ 5. quill.min.js           rich text editor per pagina Note     │
├─────────────────────────── CORE ──────────────────────────────┤
│ 6. bridge.js              callJava + oggetto api {}            │
│ 7. utils.js               fmt.currency/date, evalAmount, …     │
│ 8. ui-shell.js            modale, titlebar drag, resize handles│
│ 9. router.js              navigate(), renderPage(), PAGE_TITLES│
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

### Cosa fa `init()` ([init.js:282](src/main/resources/web/js/init.js#L282))

```
init() async
  │
  ├─ _initGlobalTooltip()         (overlay <div> per dashboard bubbles)
  ├─ lucide.createIcons()         (sostituisce <i data-lucide="..."> con SVG)
  ├─ Detect modalità:
  │     cefQuery presente → JCEF (desktop)
  │     altrimenti          → browser remoto via WebServer
  ├─ isMaximized → mostra/nasconde resize handles
  ├─ getSettings → carica preferenze persistenti
  │     appearance.theme, accounts.favorites_only, proj.range, ecc.
  ├─ applyTheme(...)              (data-theme="dark|light|carta|cristallo|glassy|...")
  ├─ updateSidebar()              (lista conti preferiti + tipi)
  ├─ renderDashboard()            (PRIMA pagina visibile)
  ├─ requestAnimationFrame×2 → api.uiReady()  ← splash svanisce
  └─ Notifiche non bloccanti:
        api.getTransactionsWithTag('phone')  → showDaTelefonoNotice
        api.getOverdue()                     → showOverdueNotice
        api.getDueToday()                    → showDueTodayNotice
        api.getForecasts()                   → showForecastReadyNotice
        api.getTransactions({reconciled:0})  → showUnverifiedNotice
```

L'`init()` viene chiamata appena `window.cefQuery` è disponibile. In modalità JCEF è iniettato sincronamente dopo `onLoadEnd`; il polling `setInterval(50ms)` è un fallback.

### `onTrayRestore()`
Chiamato da Java quando si fa "Apri" dal tray ([MainWindow.java:148](src/main/java/com/moneymanager/MainWindow.java#L148)). Invalida le cache JS di accounts/categories/tags (il DB potrebbe essere stato sincronizzato da Android via OneDrive) e ri-renderizza la pagina corrente.

---

## 5. Router SPA + ciclo di vita di una pagina

### Navigazione
Definita in [router.js](src/main/resources/web/js/router.js).

```
Click su .nav-item (sidebar)
       │
       ▼
navigate('budgets')
       │
       ├─ Rimuove .active da tutte le .page e .nav-item
       ├─ Aggiunge .active a #pg-budgets e [data-page=budgets]
       ├─ Aggiorna document.getElementById('pageTitle')
       ├─ currentPage = 'budgets'
       └─ renderPage('budgets')   ──►   renderBudgets()  (in pages/budget.js)
```

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

Le pagine **non sono moduli ES**: tutte le funzioni e variabili `let/const` ai loro top-level diventano globali della finestra. È intenzionale (no transpiler, no bundler), ma significa che i nomi devono essere unici tra pagine (convenzione: prefisso `_` per stato interno).

### Pattern modifica → refresh
1. `await api.addTransaction(data)` → Java aggiorna SQLite, JS invalida cache locali (`api._invalidateAccounts()`)
2. `refreshAfterTxChange()` ([router.js:66](src/main/resources/web/js/router.js#L66)) → `updateSidebar() + renderTransactions() + renderDashboard()` se attiva

---

## 6. Database — schema, migrazioni, seed

### Apertura connessione
[Database.java:32](src/main/java/com/moneymanager/Database.java#L32)

```java
SQLiteConfig:
  journalMode  = DELETE          // niente WAL: OneDrive non gradisce -wal/-shm
  synchronous  = FULL            // durability massima
  cacheSize    = 16 MB           // default è 2 MB
  tempStore    = MEMORY
  foreignKeys  = ON
```

### Pipeline `Database(dbPath)`

```
initSchema()        Crea le 20 tabelle "canoniche" se mancano.
                    Definizione attuale dello schema (rispecchia v13).
       │
       ▼
migrate()           Step idempotenti basati su schema_version.
                    1 → 2: aggiunge tags + transaction_tags
                    2 → 3: scheduled_transactions con portfolio_id
                    3 → 4: budget_config (master_amount)
                    4 → 5: scheduled_transaction_tags
                    5 → 6: portfolio (asset_type, face_value, …)
                    6 → 7: portfolio_transactions
                    7 → 8: reports
                    8 → 9: forecasts + forecast_categories
                    9 → 10: range_presets / migra portfolio_transactions schema
                    10 → 11: forecast_excluded
                    11 → 12: app_settings
                    12 → 13: notes + note_tags
       │
       ▼
seedDefaultData()   Categorie default (Casa, Spesa, Stipendio, …),
                    tag di sistema (phone, ecc.), range preset, ecc.
                    Inserite solo se le tabelle sono vuote.
```

### Tabelle (raggruppate per dominio)
| Dominio | Tabelle |
|---------|---------|
| Core | `accounts`, `categories`, `transactions`, `transaction_splits`, `tags`, `transaction_tags` |
| Budget | `budgets` (mensile), `budget_config` (master_amount + modo annuale) |
| Pianificate | `scheduled_transactions`, `scheduled_transaction_tags` |
| Portfolio | `portfolio`, `portfolio_transactions` |
| Previsioni | `forecasts` (archived/is_ready), `forecast_categories`, `forecast_excluded` |
| Sistema | `app_settings`, `reports`, `range_presets`, `notes`, `note_tags`, `sync_meta`, `schema_version` |

### Logging scritture
[DbLogger.java](src/main/java/com/moneymanager/DbLogger.java) — ogni operazione di modifica scrive una riga formattata in `<dbname>.log`. La sessione corrente è delimitata da `startOffset` (byte size all'avvio): permette al backup automatico di sapere se ci sono cambiamenti reali e generare il sidecar JSON `<backup>.db.bak.json` con la lista delle modifiche.

---

## 7. Ciclo di vita finestra & system tray

```
┌────────────────────────────────────────────────────────────────────────┐
│  WindowListener.windowClosing()  in MainWindow.java                    │
│                                                                        │
│   1. Backup automatico (se settings 'backup.enabled'=1 e               │
│      logger.hasChanges()) → backup + sidecar JSON + resetSession()     │
│                                                                        │
│   2. TrayManager.isActive() ?                                          │
│        SÌ → bridge.clearSessionState() + db.close() + setVisible(false)│
│             (il DB viene chiuso così OneDrive può sincronizzare)       │
│        NO → CefApp.dispose() + frame.dispose() + System.exit(0)        │
└────────────────────────────────────────────────────────────────────────┘

TrayManager.bringToFront() (dal tray o da SingleInstance.SHOW):
   1. db.reopen()                     ← riapre connessione SQLite
   2. frame.setVisible(true)
   3. Deminimizza + massimizza
   4. browser.executeJavaScript("onTrayRestore()")  ← invalida cache JS
```

### Autostart Windows
[TrayManager.registerAutostart()](src/main/java/com/moneymanager/TrayManager.java#L70) scrive una chiave in `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` con `"<java.exe>" -jar "<jar>"`. Si attiva da Impostazioni → `setSetting("autostart.enabled", "1")`.

### Single instance
[SingleInstance.java](src/main/java/com/moneymanager/SingleInstance.java) usa un `ServerSocket` sulla porta 47291 (loopback). Se l'app è già in esecuzione il secondo processo si connette, manda "SHOW", e `bringToFrontAction` riapre la finestra.

---

## 8. WebServer LAN (accesso da browser remoto)

Avviato da [MainWindow.java:56](src/main/java/com/moneymanager/MainWindow.java#L56) su virtual thread, default porta 7890.

```
http://<IP-PC>:7890/                   →   serve file da webDir (index.html, css, js)
http://<IP-PC>:7890/bridge   POST      →   stesso onQuery di JCEF, payload base64
                                            ma certi method sono bloccati (window
                                            controls, dialog nativi, openUrl,…)
```

Lato JS [bridge.js:55](src/main/resources/web/js/bridge.js#L55): se `window.cefQuery` non esiste, fallback a `fetch('/bridge', ...)`. La modalità browser mostra inoltre il toggle "DB aperto/chiuso" in sidebar ([init.js:55](src/main/resources/web/js/init.js#L55)).

Disabilitabile con `http.enabled=0` in `settings.properties`.

---

## 9. Temi e CSS

- Foglio unico: [css/style.css](src/main/resources/web/css/style.css) (~3000 righe)
- Tema via `<html data-theme="...">` impostato da `applyTheme()` in [pages/settings.js](src/main/resources/web/js/pages/settings.js)
- Temi built-in: `dark` (default), `light`, `carta`, `cristallo`, `glassy`
- Temi custom utente: salvati in `app_settings` chiave `appearance.custom_themes` (JSON)
- **Regola tema light:** mai bianco puro — vedi [CLAUDE.md](CLAUDE.md) sezione "UI — Tema light"

---

## 10. Build & deploy

| Comando | Cosa fa |
|---------|---------|
| `mvn exec:java` | Avvio diretto in IDE/CLI, mainClass `com.moneymanager.App` |
| `mvn package` | Fat JAR via maven-shade-plugin → `target/moneymanager-1.18.1.jar` (esclude `web/`) |
| `build.bat` | Wrapper interattivo Maven (chiede passi) |
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
In **IDE**: `web/` viene letta da `target/classes/web/` (con resource filtering Maven, es. `${project.version}`). Una modifica a un `.js` richiede solo un Reload della finestra Chromium per essere visibile (no riavvio JVM).

---

## 11. Cheat sheet — "dove modifico cosa?"

| Voglio modificare… | File principale | Note |
|--------------------|-----------------|------|
| Colori/stili/layout | [css/style.css](src/main/resources/web/css/style.css) | Variabili CSS in `:root` e `[data-theme="..."]` |
| Una pagina (es. Budget) | [js/pages/budget.js](src/main/resources/web/js/pages/budget.js) | Funzione `renderBudgets()` è l'entry point |
| Sidebar / menu | [index.html](src/main/resources/web/index.html) + [js/sidebar.js](src/main/resources/web/js/sidebar.js) | Aggiungi `<a data-page="X">` + handler in [router.js](src/main/resources/web/js/router.js) |
| Query SQL | [Database.java](src/main/java/com/moneymanager/Database.java) | Text blocks `"""..."""`, sempre PreparedStatement |
| Esporre un metodo nuovo al JS | [Bridge.java:dispatch](src/main/java/com/moneymanager/Bridge.java#L233) + [bridge.js:api{}](src/main/resources/web/js/bridge.js#L61) | Aggiungere `case "x" -> ...` e wrapper `api.x` |
| Schema DB | [Database.initSchema](src/main/java/com/moneymanager/Database.java#L359) + nuova migrazione `migrate(N→N+1)` | Non modificare migrazioni vecchie già rilasciate |
| Splash | [SplashWindow.java](src/main/java/com/moneymanager/SplashWindow.java) | `paintComponent` Swing puro |
| Icona app | [IconFactory.java](src/main/java/com/moneymanager/IconFactory.java) | Generata a `prepare-package` |
| Impostazioni nuove | Default lato JS in [init.js](src/main/resources/web/js/init.js); persistite tramite `api.setSetting(key, value)` → DB | Solo le 4 chiavi bootstrap restano in `settings.properties` |
| Tray / autostart | [TrayManager.java](src/main/java/com/moneymanager/TrayManager.java) | Solo Windows (HKCU Run) |
| Bridge HTTP remoto | [WebServer.java](src/main/java/com/moneymanager/WebServer.java) | Blocklist dei method desktop-only nel dispatch |
| Logging modifiche DB | [DbLogger.java](src/main/java/com/moneymanager/DbLogger.java) | `db.logger.log("AZIONE", "campo:val")` |

---

## 12. Mini-glossario

- **JCEF** — Java Chromium Embedded Framework: bindings Java per CEF (Chromium senza barra URL/menu). [`jcefmaven`](pom.xml#L23) gestisce il download dei binari nativi.
- **EDT** — Event Dispatch Thread (Swing). Tutto ciò che tocca `JFrame` deve girare lì → `SwingUtilities.invokeLater/invokeAndWait`.
- **`cefQuery`** — funzione JS iniettata da JCEF per chiamare Java. Configurata in [MainWindow.java:40](src/main/java/com/moneymanager/MainWindow.java#L40).
- **virtual thread** — `Thread.ofVirtual().start(...)`, leggero. Usato per dialog nativi, HTTP esterno, WebServer.
- **bootstrap key** — chiave di impostazione necessaria PRIMA che il DB sia aperto (db.path, http.*, autostart.*). Vivono in `settings.properties`. Tutto il resto sta in `app_settings`.
- **`uiReady`** — segnale JS→Java che il primo frame è stato dipinto; sblocca il fade della splash.

---

Per dubbi sul lato Android vedi [mobile/android/](mobile/android/) (struttura indipendente, condivide solo il file `data.db` via OneDrive).
