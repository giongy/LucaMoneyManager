# LucaMoneyManager — Contesto progetto

App di gestione finanze personali sviluppata da Luca per uso personale.
Due piattaforme: **desktop (primaria)** e **Android (secondaria)**, database SQLite condiviso via OneDrive.

### Dove sta la documentazione

| File | Cosa contiene |
|---|---|
| `CLAUDE.md` (questo) | Contesto, convenzioni e **invarianti da non violare**. Resta in root: è quello che viene caricato in automatico. |
| `README.md` | Presentazione pubblica su GitHub (in inglese). Resta in root per convenzione. |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Mappa del flusso: avvio, bridge, router, DB, tray, WebServer, build. Da leggere prima di toccare il codice. |
| [docs/AUDIT_JAVA_2026-07.md](docs/AUDIT_JAVA_2026-07.md) | Audit dei 52 finding Java + rilettura indipendente. **Storico, non aggiornare** |
| [docs/AUDIT_ROBUSTEZZA_JAVA.md](docs/AUDIT_ROBUSTEZZA_JAVA.md) · [docs/AUDIT-RESOURCES.md](docs/AUDIT-RESOURCES.md) | Altri audit datati. Stessa regola: sono fotografie, non documentazione viva. |

⚠️ I file `AUDIT*` sono **registri storici**: descrivono lo stato a una certa data e vanno letti come
tali. La documentazione da tenere aggiornata è solo questa terna: `CLAUDE.md`, `README.md`,
`docs/ARCHITECTURE.md`.

---

## Piattaforme

### Desktop
- **Linguaggio:** Java 25, Maven 3.x
- **UI:** JCEF v146 (Chromium embedded) + Swing per dialogs/titlebar/splash
- **Frontend:** Vanilla JS puro (`src/main/resources/web/`, modulare in `js/pages/*.js`), no React/Vue
- **Versione:** 1.20.2 — output `target/moneymanager-1.20.2.jar` (fat JAR, web/ esclusa)
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
Bridge.java (~1080 LOC) — dispatch 136 operazioni (+4 dialog nativi fuori dispatch)
    ↓
Database.java (~5890 LOC) — tutte le query JDBC
    ↓
SQLite
```

**Classi Java:** `App` (entry point), `MainWindow` (Swing + JCEF), `Bridge` (dispatch JS↔Java), `Database` (JDBC), `Settings` (preferenze utente), `IconFactory` (icona app + tray per stato DB), `SplashWindow` (splash Swing 70%×70%, fade 350ms), `TrayManager` (system tray), `SingleInstance` (lock istanza unica), `WebServer` (serve web/ da filesystem + bridge LAN), `DbLogger` (logging query), `ContextMenuHandler` (menu tasto destro nativo: modifica/zoom/devtools)

**Moduli JS pagine** (LOC indicativi): `analytics` (3915), `portfolio` (2100), `budget` (1985), `settings` (1785), `transactions` (1470), `dashboard` (1460), `scheduled` (1075), `accounts` (825), `notes` (360), `categories` (320), `forecasts` (240), `logviewer` (210), `ranges` (195), `tags` (105)

**Moduli JS di supporto** (non pagine, caricati prima): `bridge` (`callJava` + oggetto `api`), `utils` (formattazione, `evalAmount`, colori grafici per tema), `calculator` (calcolatrice nei campi importo), `ui-shell` (modali, drag titlebar, maniglie di resize), `router` (`navigate`/`renderPage`), `sidebar`, `init` (bootstrap).

### Connessione DB — invariante da rispettare

`Database` usa **una sola `Connection`**, condivisa da più thread: thread UI di JCEF, virtual thread del `WebServer` e dei dialog async, EDT Swing (tray/iconify/backup), thread del timer di auto-release. **Non** c'è nulla che serializzi le chiamate. Le tre regole che tengono in piedi il tutto:

1. `conn` si legge e si scrive **solo** sotto il lock di `Database` (`synchronized`);
2. la connessione si chiude **solo** da `close()` — unico punto, che aggiorna anche la baseline mtime/size per il rilevamento delle modifiche esterne;
3. `close()` **non chiude** se `activeQueries > 0`; ci penserà l'auto-release, riprogrammato da `endQuery()`.

Le query girano deliberatamente **fuori** dal lock (per non serializzarle): è per questo che serve il contatore `activeQueries` oltre al `synchronized`. `inTx()` lo tiene alzato per tutta la transazione, non solo per i singoli statement.

⚠️ Aggiungendo un metodo che tocca `conn`, rispetta le tre regole: violarle produce corruzione dati silenziosa (transazione committata a metà) o una connessione orfana che tiene il lock su OneDrive per sempre.

---

## Schema DB (v23, 22 tabelle)

- **Core:** `accounts` (3 stati: `is_closed`, `is_hidden` — nascosto ⇒ sempre chiuso; per le carte anche `payment_day`, `payment_account_id`, `auto_settle` — vedi "Saldo automatico carte"), `categories` (gerarchiche, `expense_nature`, `mobile_favorite` — vedi "Categorie per Android"), `transactions` (`reconciled`, `attachment_path`, `color`), `transaction_splits`, `transaction_tags`, `tags` (`is_system`, `system_key`)
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

## Saldo automatico carte di credito

`Database.syncCardSettlements()` — chiamata da **`getScheduled()`**, cioè a ogni lettura delle
pianificate: l'importo si riallinea da sé appena si registra una spesa sulla carta, senza
aspettare un riavvio. Resta esposta anche come operazione del Bridge, invocata da `init.js`
all'avvio. Niente scheduler. Per ogni conto `type='credit'` con `auto_settle=1` crea/aggiorna una
pianificata di saldo: trasferimento `payment_account_id → carta`, il giorno `payment_day` del mese
successivo a quello saldato.

⚠️ Girando a ogni lettura **deve restare a costo quasi zero**: esce subito se nessuna carta ha
l'automatismo attivo, e se l'importo è già corretto non scrive nulla — niente `UPDATE`, niente
`touchSyncMeta()`. Quest'ultimo punto non è cosmetico: una scrittura inutile marcherebbe il DB
come modificato a ogni apertura di Pianificate, facendo risincronizzare OneDrive a vuoto.

Regole che tengono in piedi il meccanismo:

1. **L'importo è dell'ultimo mese chiuso**, mai del mese in corso — un totale parziale mostrerebbe
   una cifra che non verrà addebitata.
2. **Identità = tag `cardsettle` + `to_account_id` + `start_date`.** Include la carta *e* il mese:
   fra il 1° e il giorno di addebito convivono due saldi (quello del mese scorso non ancora
   registrato e quello appena maturato), e più carte restano indipendenti anche con lo stesso
   giorno di saldo. ⚠️ Cercare solo per carta farebbe riscrivere il saldo pendente → un mese non
   verrebbe mai pagato.
3. **`start_date` non si aggiorna mai** nell'UPDATE: è la chiave d'identità.
4. **I saldi già registrati si saltano** (`is_active=0`, impostato da `advanceScheduled` sulle
   `once`): riscriverli farebbe ricomparire un pagamento già fatto.
5. Totale del mese a 0 → la pianificata di *quel* mese viene rimossa (non le altre).

Il calcolo esclude i trasferimenti: il pagamento della carta è esso stesso un trasferimento, e
per lo stesso motivo non entra in `getForecast` (che somma solo `income`/`expense`) — quindi
riscrivere l'importo a ogni avvio non altera nessuna previsione.

Il modale manuale "Chiudi mese" (`accounts.js`) resta disponibile in parallelo, per scelta:
è l'utente a decidere se saldare a mano.

---

## Categorie per Android (`categories.mobile_favorite`, v23)

Da telefono si inseriscono solo poche voci ricorrenti (spesa, benzina, bar): scorrere tutto
l'elenco costa tempo. Le sottocategorie marcate `mobile_favorite=1` sono le uniche proposte
dall'app Android in inserimento.

- **Si marca sul desktop**, pagina Categorie: interruttore 📱 sulla riga della sottocategoria
  (`setCategoryMobile`, toggle immediato) o casella nel modale di modifica.
- **Solo sulle sottocategorie**: `DbHelper.getSubCategories` fa `JOIN` sul parent, quindi una
  categoria principale non compare comunque su Android.
- ⚠️ **Fallback obbligatorio**: nessuna marcata → l'app mostra **tutte** le sottocategorie.
  Senza questo, aggiornare l'app prima di marcare qualcosa lascerebbe il picker vuoto e
  impedirebbe di inserire. Stesso fallback se la colonna manca (DB pre-v23): la query filtrata
  è in `try`, l'errore ricade sull'elenco completo.

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

## UI — Temi

Quattro temi built-in, più quelli personalizzati dall'utente. **Il default è chiaro** (Nebbia):
il tema scuro non è più il riferimento, ed è la causa della maggior parte delle trappole qui sotto.

| Tema | Chiave | Dove vive | `--bg` |
|---|---|---|---|
| 🌁 Nebbia (default) | `nebbia` | `:root` — **nessun** `data-theme` | `#dce1e8` |
| 📜 Carta | `carta` | `[data-theme="carta"]` | `#ece5d8` |
| 🛢️ Petrolio | `petrolio` | `[data-theme="petrolio"]` | `#0f1e23` |
| 🪟 Vetro | `glassy` | `[data-theme="glassy"]` | `#161b25` |

Nebbia e Carta sono chiari; Petrolio e Vetro scuri. I temi personalizzati (chiave `c:<id>`)
applicano le proprie variabili **inline** su `<html>`, quindi vincono su qualsiasi regola di tema.
`applyTheme()` ([settings.js](src/main/resources/web/js/pages/settings.js)) migra le chiavi
storiche: `dark`→`nebbia`, e `salvia`/`cristallo`/`nebula`/`twilight`/`chiaro`→`petrolio`.

**Regole da rispettare:**

- **Mai bianco puro** sui temi chiari — l'utente lo trova aggressivo.
- **Gerarchia obbligatoria `bg3 < bg < bg2`**: le card (`bg2`) sono più chiare dello sfondo (`bg`),
  `bg3` è il livello più scuro (header tabella, righe alternate, hover). C'è anche `bg4`.
- ⚠️ **Molte regole base hanno colori fissi nati quando il default era scuro** (toast su fondo
  scuro, `color:#000` sulle superfici d'accento, trasparenze bianche per hover). Servono ancora a
  Petrolio e Vetro, quindi restano: Nebbia e Carta le neutralizzano in blocchi di override
  dedicati. Aggiungendo una regola con un colore fisso, verifica che regga su **tutti e quattro**.
- ⚠️ **Il selettore del default elenca in negativo gli altri temi**
  (`html:not(:where([data-theme="carta"],...))`) e non `:not([data-theme])`: `applyTheme` imposta
  `dataset.theme = ""` — attributo **presente ma vuoto** — quindi `:not([data-theme])` non
  farebbe mai match. **Aggiungendo un tema built-in va aggiornata ogni occorrenza di quella lista.**
- Badge mensile/annuale sui temi chiari richiedono override con colori solidi (le trasparenze
  pensate per i temi scuri non funzionano).

Il commento in testa a [style.css](src/main/resources/web/css/style.css) tiene il dettaglio completo,
incluso il perché di `:where()` e cosa si rompe in silenzio se cala la specificità (testo dei bottoni
primari nero su blu, 3.79:1 — nessun altro sintomo visibile). Dopo aver toccato i temi, `check-ui.ps1`.

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
.\tools\check-ui.ps1 -Port 7891 -AllThemes            # tutti e 4 i temi (~50s)
.\tools\check-ui.ps1 -Port 7891 -NoShots              # solo diagnostica, niente PNG
```

Gli screenshot finiscono in `tools/screenshots/` (in .gitignore: sono artefatti, non codice).

**Opzioni utili di `screenshot.ps1`:**

| Opzione | A cosa serve |
|---|---|
| `-Stamp` | nome progressivo (`out-001.png`, `-002`…): mai sovrascritto |
| `-Probe` | solo la misura JS, nessun PNG — il modo più rapido di leggere uno stato |
| `-NoCache` | ignora la cache HTTP: **da usare dopo aver ridistribuito CSS/JS** |
| `-FullPage` | cattura l'intera pagina, non solo la viewport |
| `-SettleMs` | forza un'attesa fissa; di default l'attesa è automatica |

L'attesa è **automatica**: lo script aspetta documento pronto, rete ferma e DOM stabile
(tipicamente ~0,5s invece di 7s fissi), con un tetto di `-MaxWaitMs`. Aspetta anche **dopo**
il `-Js`, perché `navigate()`/`applyTheme()` ridisegnano: scattare subito catturerebbe il
render precedente.

`-Js` supporta `await` diretto e più istruzioni separate da `;` (l'ultima fa da valore di
ritorno, come nella console del browser):
```powershell
-Js "(await api.getSettings())['db.path']"          # su quale DB sto lavorando
-Js "applyTheme('carta'); navigate('budgets'); currentPage"
```

`-Js` serve soprattutto a **misurare** invece che stimare — es. leggere i colori calcolati:
```js
getComputedStyle(document.querySelector('.btn-primary')).color   // "rgb(255, 255, 255)"
```

### Pilotare l'app davvero: `interact.ps1`

`screenshot.ps1 -Js` chiama le funzioni dell'app **scavalcando l'interfaccia**: verifica che la
logica sia giusta, non che un bottone sia collegato a quella logica. `tools\interact.ps1` inietta
invece eventi veri via CDP `Input.*` — indistinguibili da mouse e tastiera reali. Serve per menu
contestuali (richiedono un vero tasto destro con coordinate), handler agganciati per delega,
dialog, hover, focus, scorciatoie.

```powershell
.\tools\interact.ps1 -Port 7891 -Do "goto transactions; rightclick #txBody tr; expect #ctxMenu; shot menu"
.\tools\interact.ps1 -Port 7891 -DoFile .\mio-flusso.txt      # un'azione per riga, per i flussi lunghi
```

Azioni (`-Do`, una per riga o separate da `;`): `goto` · `click` · `rightclick` · `dblclick` ·
`hover` · `type` · `key` · `wait` · `shot` · `expect`/`expectnot` (verificano la visibilità e
stampano l'esito) · `eval`. Il selettore è CSS normale; `<css>|<testo>` sceglie il primo elemento
che contiene quel testo (es. `click .ctx-item|Duplica`).
⚠️ `eval` deve stare su una riga sua: è l'unica azione in cui i `;` non separano, appartengono al JS.

### Leggere l'esito: la riga `PIXEL`

Ogni scatto stampa `PIXEL <hash> <3 colori campionati>`. Serve a non farsi ingannare da una
**vista in cache** del PNG: se l'immagine sembra invariata ma l'hash cambia, è stantia la
vista, non il rendering. I colori dicono a colpo d'occhio quale tema è a schermo, senza
nemmeno aprire il file:

```
PIXEL 9EC59A9D  #e9edf3 #e9edf3 #e9edf3     <- nebbia (chiaro grigio-azzurro)
PIXEL 82FE213E  #f4ede0 #f4ede0 #f4ede0     <- carta  (beige)
PIXEL A64FB224  #16292f #0c191d #16292f     <- petrolio (teal scuro)
PIXEL A4E0F03C  #222732 #222c40 #212631     <- vetro/glassy (blu-grigio scuro)
```

⚠️ **Su vetro i campioni NON coincidono con `--bg`, e non è un errore.** Negli altri tre temi
`--bg2`/`--bg3` sono colori solidi, quindi il campione corrisponde a un valore che trovi nel CSS.
Su vetro sono trasparenze (`rgba(255,255,255,.045)` e `.085`) composte sopra la base `#161b25`:
il campione mostra il **risultato della composizione**, mai il fondo nudo.
`#161b25` + 4,5% di bianco = `#21262f`, che è quanto si legge sopra.

Corollario pratico: per sapere quale tema è attivo **non dedurlo dai colori** — chiedilo:

```powershell
.\tools\screenshot.ps1 -Port 7891 -Probe -Js "document.documentElement.dataset.theme"
```

Vale doppio perché nebbia non imposta `data-theme` (resta stringa vuota) e i temi personalizzati
valgono `c:<id>`: sono gli unici due casi in cui la risposta non è il nome di un tema built-in.

### Limiti (importanti)

- **Chrome non è JCEF**: stesso motore Chromium, ma font, emoji e `backdrop-filter`
  (tema glassy) possono rendere diversamente. Ottima approssimazione, non prova definitiva.
- **Non copre Swing**: titlebar custom, tray, splash, dialog nativi, resize handles.
  Quella parte resta verificabile solo a mano. In modalità browser la titlebar è nascosta:
  per ispezionarla serve `-Js "document.getElementById('titlebar').style.display='flex'"`.
- ⚠️ **Riaprire lo stesso path può mostrare una copia vecchia.** Chi legge i PNG (editor,
  visualizzatori, agenti) può servirli dalla cache: si finisce per giurare che il rendering
  sia sbagliato quando il file su disco è giusto. Difese: usare `-Stamp` quando si
  confrontano più scatti, e **credere alla riga `PIXEL`** più che all'immagine.
- ⚠️ **Dopo aver ridistribuito CSS/JS** in `target/classes/web/`, usare `-NoCache`: Chrome
  riusa il foglio di stile precedente e mostrerebbe la versione vecchia.

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
