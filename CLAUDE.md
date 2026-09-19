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
- **Versione:** 1.25.17 — output `target/moneymanager-1.25.17.jar` (fat JAR, web/ esclusa)
- **Web assets:** serviti da filesystem (cartella `web/` accanto al `.exe` in produzione, `target/classes/web/` in IDE)
- **DB path:** `%APPDATA%\LucaMoneyManager\data.db` (`%APPDATA%` = `...\Roaming`)
- **Due log distinti, in due posti diversi** — vedi "I due log e OneDrive"
- **Build:** `mvn package` oppure `tools\build\build.bat`

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
Bridge.java (~1080 LOC) — dispatch 137 operazioni (+4 dialog nativi fuori dispatch)
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

### I due log e OneDrive (1.25.11)

Sono due file distinti, con due destini diversi. La differenza non è cosmetica: uno vive dentro
la cartella sincronizzata, l'altro no.

| file | dove | chi scrive | apertura |
|---|---|---|---|
| `<nomedb>.log` (es. `luca.log`) | **accanto al DB**, quindi su OneDrive | `DbLogger` — una riga per operazione sui dati | apre e **richiude a ogni riga** (`Files.writeString` in APPEND) |
| `app.log` | **`%APPDATA%\LucaMoneyManager\`**, fuori da OneDrive | `System.err`/`System.out` dirottati da `App.redirectLog()` | `PrintStream` **aperto per tutta la sessione**, mai chiuso |

⚠️ **`app.log` non torna accanto al DB.** È diagnostica pura, non ha motivo di essere
sincronizzata, e il suo stream resta aperto quanto il processo: stando su OneDrive era l'unico
file della cartella non rinominabile né eliminabile mentre l'app girava (`FileOutputStream` non
concede `FILE_SHARE_DELETE` — leggibile sì, quindi l'upload passava, ma non sostituibile in
direzione download). Il path si ricava da `dataDir`, mai da `db.path`: nel `Bridge` sono
**quattro** i punti che lo usano (`getSettings`, `openAppLog`, `clearAppLog`, `appLogErrors`).

⚠️ **Nel log accanto al DB non si scrivono eventi di sfondo.** Ogni riga costa a OneDrive il
ricaricamento del **file intero** (nessun delta su file piccoli), quindi ci va solo ciò che
l'utente ha davvero fatto. Dalla 1.25.11 sono spariti gli ultimi tre eventi automatici:

| evento tolto | dove stava | perché faceva danno |
|---|---|---|
| `DB TOCCO ESTERNO` | `ensureOpen()` | si mordeva la coda: OneDrive toccava il `.db` → l'app scriveva una riga → OneDrive doveva ricaricare il `.log` |
| `DB MODIFICATO ESTERNAMENTE` | `ensureOpen()` | idem, più il problema qui sotto |
| `DB IDLE-RELEASE` | `scheduleIdleRelease()` | una riga a ogni rilascio del lock, cioè proprio mentre OneDrive prova a sincronizzare |

Le prime due, in più, **non** sono in `SYSTEM_ACTIONS`: contavano quindi come modifiche di
sessione in `hasChanges()`, e un tocco esterno bastava a far scattare alla chiusura un backup
dell'intero DB senza che l'utente avesse cambiato nulla.

⚠️ **È sparita solo la scrittura sul log, non la logica.** I due rami di `ensureOpen()` restano e
devono restare: consumano l'evento (`lastClosedMtime/Size = -1`) e fanno partire
`externalChangeCallback`, cioè il refresh del frontend dopo una sync vera.

Corollario per chi aggiunge un evento di sistema: se serve tracciarlo va su `app.log`
(`System.err`), che non è sincronizzato. `DbLogger` è il registro di **cosa ha fatto l'utente**,
ed è anche ciò che finisce nel sidecar `.json` del backup.

⚠️ Da `SYSTEM_ACTIONS` un nome si toglie **solo se nessun log in giro lo contiene più**: quelle
righe diventerebbero altrimenti impurgabili da "ripulisci log di sistema" e tornerebbero a
contare come modifiche di sessione, facendo scattare backup a vuoto. `DB IDLE-RELEASE` è potuto
uscire dall'elenco perché i `.log` sono stati azzerati nella stessa occasione: dalla 1.25.11 si
riparte da file nuovi, in cui quel nome non compare.

### Una scrittura a vuoto costa un upload intero (`ensureSystemTags`)

Stessa economia della sezione qui sopra, un piano più in basso: lì era una riga di log, qui è
una transazione SQLite che non cambia un solo dato. Per OneDrive non c'è differenza — il `.db`
ha l'header riscritto, quindi va ricaricato **per intero** (nessun delta sui file piccoli).

`ensureSystemTags()` girava così a ogni avvio:

```sql
INSERT OR IGNORE INTO tags(name,color,is_system,system_key) VALUES(...);   -- 6 volte
```

⚠️ **`OR IGNORE` protegge i dati, non il file.** La riga viene scartata **dopo** che il rowid è
stato allocato da `sqlite_sequence` (`tags.id` è `AUTOINCREMENT`): il contatore avanza lo
stesso, e quel contatore sta in una pagina del database. Sei tag = sei transazioni di scrittura
a ogni apertura dell'app, con zero tag creati — misurabile su `sqlite_sequence(tags)`, che
avanzava di 6 per avvio, e sul change counter nell'header (byte 24-27, +6). Ora una `SELECT`
sola raccoglie le `system_key` presenti e il ciclo salta le chiavi già a posto: avvio a
scrittura zero sul caso normale.

Da cui la regola generale: **`INSERT OR IGNORE` su una tabella `AUTOINCREMENT` è una
scrittura**, anche quando non inserisce nulla. Innocua su un percorso che sta già scrivendo
(sono le altre quattro del progetto: `transaction_tags`, `note_tags`,
`scheduled_transaction_tags`, `imported_pending` — link table e PK testuali, per giunta senza
`AUTOINCREMENT`), da evitare su avvio, risveglio o lettura.

⚠️ **Saltare l'`INSERT` senza saltare anche l'`UPDATE` che lo segue sarebbe un bug.** Quello
adotta un tag pre-v3 riconoscendolo dal nome; se la chiave è già su un tag e ne esiste un
**altro** col nome di default e `system_key` vuota, tenterebbe di duplicare la chiave →
violazione dell'indice UNIQUE su `system_key`, cioè un'eccezione in fase di avvio. Con la
chiave già presente non c'è comunque nulla da adottare.

I tre casi che il metodo deve continuare a coprire, e che vanno riprovati toccandolo: DB nuovo
(nascono tutti e sei i tag), DB pre-v3 (il tag col nome di default viene adottato, prende
`system_key` e `is_system=1`), DB già a posto (nessuna scrittura).

---

## Schema DB (v26, 22 tabelle)

- **Core:** `accounts` (3 stati: `is_closed`, `is_hidden` — nascosto ⇒ sempre chiuso; per le carte anche `payment_day`, `payment_account_id`, `auto_settle` — vedi "Saldo automatico carte"), `categories` (gerarchiche, `expense_nature`, `mobile_favorite` — vedi "Categorie per Android" — `system_key` — vedi "Titoli"), `transactions` (`reconciled`, `attachment_path`, `color`), `transaction_splits`, `transaction_tags`, `tags` (`is_system`, `system_key`)
- **Budget:** `budgets`, `budget_config` (master_amount mensile/annuale)
- **Pianificate:** `scheduled_transactions` (`portfolio_id`, `original_start_date`), `scheduled_transaction_tags`
- **Portfolio:** `portfolio` (equity/bond: `asset_type`, `face_value`, `maturity_date`, `coupon_*`, `country`), `portfolio_transactions` (`parent_pt_id` — righe generate insieme dalla stessa operazione, vedi "Titoli")
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

## Titoli: acquisto, vendita, plusvalenze e imposte (v24)

Budget e Pianificate prevedono la stessa cosa in due modi; il portafoglio invece **crea denaro**,
e un giroconto per definizione non lo fa. Prima la vendita girava l'intero ricavo dal conto
titoli — che dentro aveva solo il carico — quindi ogni vendita in utile lasciava quel conto
sotto di quell'utile, e il guadagno non compariva in nessuna entrata.

**Come si compone oggi un'operazione** (esempio: 1000 azioni comprate a 10 con 20 di
commissione, vendute a 12 con 25 di commissione):

| | scrittura | importo |
|---|---|---|
| acquisto | giroconto liquidità → titoli | 10.020 (puro **+ commissione**) |
| vendita | entrata `Plusvalenze` sul conto **titoli** | 1.955 |
| vendita | giroconto titoli → liquidità | 11.975 (ricavo − commissione) |
| dopo, quando arriva | uscita `Imposte su rendite` sul conto scelto | 508,30 |

Il conto titoli torna così a zero sulla posizione chiusa: `carico + plusvalenza − accredito = 0`.

⚠️ **Regole da non violare:**

1. **La commissione sta nel carico, non è una spesa a sé.** È dentro `avg_price` *e* dentro il
   giroconto d'acquisto. Registrarla anche come transazione di spesa la conterebbe due volte:
   una nel carico (che abbassa la plusvalenza) e una come uscita.
2. **La plusvalenza nasce sul conto titoli**, non su quello di liquidità. Se nascesse sulla
   liquidità, vendere senza prelevare non la registrerebbe mai.
3. **L'imposta non sta nella vendita.** La banca la addebita settimane dopo, cumulata su più
   operazioni: si registra con `registerPortfolioTax`, che funziona **anche a quantità 0** —
   è anzi il caso normale, l'addebito arriva a titolo ormai venduto.
4. **Il rimborso a scadenza di un'obbligazione è una vendita a 100**, non un giroconto: la
   differenza col carico è una plusvalenza a tutti gli effetti.
5. `parent_pt_id` lega le righe nate dalla stessa operazione. Annullando la madre vanno tolte
   **anche le transazioni delle figlie**: il vincolo `ON DELETE CASCADE` porta via le righe di
   storico ma non le transazioni, che resterebbero a muovere i saldi.
6. Note `'Commissione'`, `'Commissione acquisto'` e `'Rateo acquisto'` sono **marcatori
   semantici**: i punti fra `Database.java` e `portfolio.js` che le escludono dai totali (sono
   già contate altrove) le riconoscono da quel testo esatto. Cambiarlo le fa contare due volte.
7. **Un'operazione non si smonta un pezzo per volta dalla pagina Transazioni.**
   `portfolio_transactions.transaction_id` è `ON DELETE CASCADE`: eliminando da lì la
   transazione di plusvalenza sparirebbe anche la sua riga di storico, **ma la vendita
   resterebbe** — e il conto titoli rimarrebbe scoperto di quell'importo, senza un segnale.
   `deleteTransaction` e `updateTransaction` rifiutano quindi non solo `buy`/`sell` ma
   **qualsiasi riga con `parent_pt_id`**, per tipo di riga e non per elenco di tipi: vale
   anche per le figlie che si aggiungessero in futuro. Restano liberi data, descrizione,
   categoria, colore e tag — non spostano saldi. I movimenti **autonomi** (cedola, dividendo,
   imposta, spesa) restano invece eliminabili: la riga di storico se ne va con loro.
   ⚠️ L'`UPDATE` che riallinea `portfolio_transactions.price` all'importo della transazione
   copre `coupon`/`dividend`/`tax`/`expense`. Togliendone uno, la scheda del titolo mostra una
   cifra e il conto un'altra.
8. **Il rateo di un acquisto obbligazionario (v26, `accrued_interest`) non tocca né il
   bonifico né `avg_price`.** È l'interesse già maturato che si paga al venditore fra una
   cedola e l'altra: torna con la prima cedola incassata, non è un vero carico. Prima non
   esisteva un campo separato: l'unico modo per far quadrare quanto usciva dal conto con
   quanto pagato davvero era sommarlo dentro `price`, gonfiando con lui anche il PMC **per
   sempre** — ogni plusvalenza futura su quel titolo risultava sottostimata.
   ⚠️ **In `accrued_interest` ci va il rateo NETTO, non quello lordo** (1.25.14). Alla cedola
   successiva la banca trattiene l'imposta sull'intero importo, compresa la parte che
   restituisce il rateo: per compensare, all'acquisto accredita lo **storno tassazione rateo**
   (`rateo lordo × aliquota cedola`), e dal conto esce `lordo − storno`. Con il lordo i conti
   non tornerebbero: all'acquisto uscirebbe `R`, alla cedola rientrerebbe `R × (1 − t)` (la
   cedola si registra sempre netta), lasciando una perdita secca di `R × t` che non è mai
   avvenuta. Col netto il giro chiude esattamente a zero. `computeRateo()` in `portfolio.js`
   calcola i tre numeri dal periodo cedola (giorni effettivi/effettivi, camminando all'indietro
   dalla scadenza con `couponPeriodBounds()`) e li mostra nel modale d'acquisto; il campo resta
   modificabile, perché chi ha l'eseguito davanti ricopia il numero della banca.
   ⚠️ Non basta escluderlo da `avg_price`: **non deve nemmeno passare dal bonifico verso il
   conto titoli.** Il primo tentativo lo sommava lì (come la commissione) — ma la cedola che lo
   "restituisce" arriva su un conto scelto dall'utente, non su quello titoli: il rateo ci
   sarebbe rimasto per sempre, e la posizione chiusa non sarebbe più tornata a zero (punto 4
   della sezione precedente). `buyStock` lo registra invece con una **vera transazione a sé**,
   dal conto pagante, nella categoria di sistema `Rateo obbligazioni` (`SK_RATEO`, stesso
   meccanismo delle quattro categorie qui sotto) — esclusa da budget, altrimenti il mese
   dell'acquisto avrebbe una spesa fantasma che sparisce da sola alla cedola successiva.
   `getPortfolio` esclude comunque quella riga da `total_other_expenses` (marcatore
   `'Rateo acquisto'`, punto 6): il Total Return del portafoglio non deve contarla, esattamente
   come la commissione. Solo lato acquisto: la vendita (dirty price incassato dal compratore)
   ha la stessa distorsione in teoria ma non è ancora gestita.

9. **Eliminare un titolo porta via tutto ciò che ha prodotto (1.25.16).** `deletePortfolioItem`
   non cancella più la sola scheda: ripercorre le operazioni **madri** dalla più recente alla più
   vecchia annullandole con `undoPortfolioTransaction`, cioè la stessa identica logica
   dell'annullamento singolo. I saldi tornano dov'erano prima del primo acquisto e non resta
   nessuna transazione orfana. Prima restavano — con la motivazione giusta che sono movimenti di
   denaro veri — ma insieme alla scheda spariva `portfolio_transactions`, **l'unico legame** con
   il titolo: nessuno poteva più dire a cosa si riferissero, e cadevano anche le protezioni di
   `deleteTransaction`, che riconoscono le righe di portafoglio interrogando proprio quella
   tabella. Tre cose da non toccare:
   - **L'ordine `date DESC, id DESC` è funzionale, non estetico.** Annullare un acquisto che ha
     vendite in data pari o successiva è **vietato** (il PMC verrebbe ricalcolato senza di loro
     mentre le plusvalenze già scritte resterebbero quelle vecchie): togliendo prima le vendite,
     quel rifiuto non scatta mai durante la cascata.
   - **`undoPortfolioTransaction` non apre una `inTx` e va chiamato solo dentro una.** `inTx` fa
     commit esplicito e **non è rientrante**: annidarla committerebbe a metà la cancellazione,
     lasciando il resto in autocommit — un titolo smontato per metà, senza errore visibile. Il
     metodo pubblico `deletePortfolioTransaction` è il guscio che apre la transazione.
   - **Ogni transazione del portafoglio nasce col tag di sistema `investment`** (`tagInvestment`):
     il legame vero è `portfolio_transactions`, che una cancellazione porta via, e il tag è la
     sola traccia che sopravvive. Fino alla 1.25.15 lo mettevano solo cedole, dividendi, imposte
     e spese — non i bonifici, il rateo e le plusvalenze, cioè gli importi grossi.

La stessa spiegazione, in italiano e con i **nomi veri** delle categorie letti dalla chiave, sta
dentro l'app: pulsante **❓ Come funziona** nella pagina Investimenti (`showPortfolioHelp` in
[portfolio.js](src/main/resources/web/js/pages/portfolio.js)), più il riepilogo "Cosa registra
l'app" che si aggiorna mentre si compila il modale di vendita. Cambiando le regole qui sopra va
aggiornato anche quel testo: è l'unico posto in cui l'utente le legge.

### Le categorie degli investimenti (`categories.system_key`, v25 · +1 in v26)

`Plusvalenze`, `Minusvalenze`, `Imposte su rendite` e (dalla v26) `Rateo obbligazioni` sono
**escluse da budget e report** — muovono i saldi ma non entrano in medie, previsioni e Salute
Finanziaria, perché sono eventi di capitale grumosi e non pianificabili (il rateo in più: torna
da solo con la cedola successiva, contarlo come spesa lo farebbe uscire due volte dal
patrimonio). `Cedole e dividendi` invece **no**: quelle sono ricorrenti, si pianificano, e
devono restare dentro budget e previsioni.

**Non sono categorie speciali.** Non c'è nessun divieto: si rinominano, si spostano, si
eliminano come qualsiasi altra. `system_key` (`plusvalenze`, `minusvalenze`, `imposte_rendite`,
`cedole_dividendi`, `rateo_obbligazioni`) non è un lucchetto — è **l'indirizzo a cui il codice
scrive**, come `tags.system_key` per i tag. Il modello in una riga:

> **la chiave segue i dati.**

Da cui discende tutto il comportamento:

| gesto dell'utente | conseguenza |
|---|---|
| rinomina, cambia icona/colore/parent | niente: la chiave sta sulla riga, non nel nome |
| elimina una categoria **vuota** | sparisce; la prossima operazione su titoli la ricrea |
| **"sposta ed elimina" su «X»** | `reassignCategory` porta **la chiave su «X»**: da lì in poi l'app registra là, accanto ai movimenti spostati |
| elimina il parent che la contiene | idem: la UI obbliga già a riassegnare (`getCategoryUsage` conta anche figlie e loro transazioni) |

⚠️ **Il pezzo da non rimuovere è `carrySystemKeys()`**, chiamato da `reassignCategory` *prima*
della DELETE. Senza, spostare le plusvalenze su «X» le lascerebbe lì ma farebbe rinascere una
"Plusvalenze" vuota al movimento dopo: storia spezzata in due, senza un errore visibile.
Se «X» ha già una chiave sua la nuova **non** la sovrascrive (la colonna ne tiene una): quella
si perde e la categoria verrà ricreata — esito imperfetto ma innocuo, e scritto nel log.

**Invarianti a difesa del meccanismo:**

1. **Indice UNIQUE parziale** `idx_cat_system_key`: al massimo una categoria per chiave. Non è
   una convenzione da ricordare, è il DB che rifiuta. Serve perché `systemCategoryIdByKey()`
   legge una riga sola: due righe con la stessa chiave farebbero scrivere ora nell'una ora
   nell'altra a seconda del piano di esecuzione.
   ⚠️ La `CREATE INDEX` in `initSchema()` sta in `try/catch`: `initSchema` gira **prima** di
   `migrate()` e non altera le tabelle esistenti, quindi su un DB pre-v25 la colonna lì non
   esiste ancora. Senza il catch l'app non si apre più. L'indice lo ricrea la migrazione.
2. **Le euristiche stanno solo nella migrazione.** Il riconoscimento per nome — incluso il
   `LIKE '%edole%'`, che serve perché quella categoria è la `Investimenti` del seed rinominata
   (`is_default=1`) — gira **una volta sola** in `backfillCategorySystemKeys()`. A runtime la
   ricerca è per chiave, con al più un ripiego su nomi **esatti**: un'euristica nel percorso
   quotidiano cambierebbe risposta nel tempo, basta che l'utente crei una categoria simile.
   Dalla 1.25.10 la regola non ha più eccezioni: le ultime due euristiche per nome rimaste
   (il ripiego di `registerPortfolioExpense` e `commissionCategoryId()`, che dalla v24 non
   chiamava più nessuno) sono state tolte. Se una spesa su titoli non ha categoria, resta
   senza: metterla in una a caso la farebbe comparire in un report dove non è mai stata scritta.
3. **Si vede sempre quali categorie usa il portafoglio, e si dice quando serve cosa comporta.**
   Due cose distinte, che fino alla 1.25.7 erano confuse in una sola («nessun badge permanente
   in pagina»):
   - **Il fatto** sta in pagina, sempre: badge 📈 sulla riga, col tooltip che dice cosa l'app
     registra lì. Senza, quell'informazione non è ricavabile in nessun modo dalla lista —
     `system_key` non è esposta e dalla v25 il nome non conta più nulla, quindi l'unico modo per
     scoprirlo sarebbe provare a eliminare la categoria e leggere l'avviso. Nasconderlo per non
     "sporcare" la pagina lasciava l'utente all'oscuro di ciò che stava per toccare.
     ⚠️ Il badge **non** è un lucchetto: restano categorie normali: si rinominano, si spostano,
     si eliminano come tutte le altre. Dice solo che lì dentro scrive qualcuno.
   - **Le conseguenze** restano contestuali, dove servono: il modale di **eliminazione** dice
     cosa comporta e segnala se la destinazione scelta **non** è esclusa da budget — l'unica
     conseguenza davvero difficile da notare a posteriori; il modale di **modifica** dice cosa
     l'app registra lì e che rinominare non rompe niente.
   In più: i testi del portafoglio leggono il **nome vero** dalla chiave invece di scriverlo a
   mano — dopo un rinomina un'etichetta fissa mentirebbe.
4. **`reassignCategory` valida prima di scrivere**, perché la UI non è l'unica via d'ingresso
   (il Bridge risponde anche via HTTP dalla LAN) e qui gli esiti sarebbero silenziosi:
   destinazione uguale all'origine o **figlia** dell'origine → la CASCADE la eliminerebbe
   subito dopo averci spostato tutto, lasciando le transazioni senza categoria; tipo diverso →
   porterebbe la chiave delle plusvalenze (entrate) su una categoria di uscita, e da lì in poi
   l'app scriverebbe entrate in una categoria di spesa.

Fino alla v24 il legame era il **nome**: rinominare "Plusvalenze" faceva nascere una seconda
categoria al movimento successivo, in silenzio. Era la trappola che la v25 chiude.

### Avviso «cedola non pianificata» (v26)

Comprare un'obbligazione e collegarci le cedole future sono due gesti separati: il secondo
("Aggiungi cedola a pianificate", menu tasto destro → crea una `scheduled_transactions` con
`portfolio_id` valorizzato) è facile da dimenticare, e fino alla v26 dimenticarlo era silenzioso
— l'unico segnale sarebbe stata la cedola che non arriva mai, mesi dopo.

`Database.getPortfolio()` espone `active_scheduled_count` (subquery correlata su
`scheduled_transactions.portfolio_id = p.id AND is_active = 1`, una per posizione — non
nell'aggregato raggruppato sopra, che è tutta un'altra tabella). `bondMissingCouponSchedule()`
in [portfolio.js](src/main/resources/web/js/pages/portfolio.js) lo traduce in un booleano: bond
attivo (`quantity > 0`), cedola non-zero, scadenza non ancora passata, zero pianificate attive.
Da qui **due avvisi**, stesso schema fatto/conseguenze delle categorie qui sopra:

- **Il fatto** sta in pagina, sempre: badge ⏰ "Cedola non pianificata" sulla riga in Portafoglio,
  cliccabile — apre direttamente "Aggiungi cedola a pianificate" per quel titolo.
- **Il promemoria** è una notice all'avvio (stesso meccanismo di scadute/da telefono/da
  verificare, vedi `_noticeData`/`showBondNoCouponNotice` in [init.js](src/main/resources/web/js/init.js)), così l'avviso non dipende dal ricordarsi di
  guardare la pagina Portafoglio.

⚠️ Il punto di risoluzione è uno solo: il successo di `showAddCouponToScheduled` — da lì
`renderPortfolio()` toglie il badge e `_resolveBondNoCoupon(portfolioId)` toglie la voce da
`_noticeData` (stesso schema di `_resolveOverdue` in scheduled.js). Non è nell'elenco che
`refreshNotices()` ricalcola al risveglio (quello è per notice che si risolvono altrove, es. da
telefono): come scadute/pianificate-oggi/previsioni, si risolve solo nel suo punto dedicato.

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

## Budget: blocchi entrate e uscite nella griglia (1.25.17)

Nella griglia del Budget (tab 📊) il tipo di una categoria non era rappresentato in nessun modo,
e il parent `Entrate` — alfabetico come tutti gli altri — finiva in mezzo alle uscite: andava
cercato a ogni apertura della pagina. `getBudgetYear` ordina ora il blocco delle entrate per
primo; **dentro** ciascun blocco l'ordine resta quello di prima, alfabetico per nome del parent.
La griglia apre una banda di sezione ENTRATE/USCITE al cambio di blocco e segna ogni riga con un
accento colorato sulla colonna categoria.

⚠️ **Il tipo si ricava dal parent in due punti, che devono restare la stessa espressione**:
`COALESCE(p.type, c.type)` nell'`ORDER BY` di `getBudgetYear` e `typeOf()` in
[budget.js](src/main/resources/web/js/pages/budget.js). L'ordine delle righe lo decide il SQL, ma
le bande si aprono dove il **JS** vede cambiare il tipo: se le due divergessero, una banda
cadrebbe *dentro* un gruppo invece che al suo confine — senza errori, solo una pagina che si
legge male.

Due dettagli che sembrano arbitrari e non lo sono:

- **L'accento è un `box-shadow` inset, non un `border-left`.** La colonna categoria è
  `position:sticky` e petrolio/glassy ne riscrivono lo sfondo con `!important`: un bordo
  entrerebbe in conflitto con quelle regole.
- **Le bande non hanno né `data-row-over` né `.budget-cell`**, i due selettori su cui agiscono
  "solo rossi" e "solo mese corrente". È ciò che le lascia piene mentre il resto sbiadisce, così
  restano leggibili come intestazioni anche a griglia filtrata. Aggiungendo un filtro nuovo,
  verificare che non le colpisca.

---

## Budget "Da inizio anno": il metro è il piano, non il calendario

Il banner in cima alla scheda confronta lo speso col budget di **tutto l'anno**. La domanda è
quale riga di riferimento usare per dire se si è avanti o indietro, e la risposta **non è il
tempo trascorso**: il budget non esce in rate giornaliere uguali, è collocato mese per mese —
e circa metà, sui dati reali, in mesi scelti a mano.

Una spesa grossa ma **prevista** in un mese preciso (arredamento ad aprile, dentista a giugno)
col righello dei giorni manda il banner in rosso da lì fino a dicembre, pur essendo in linea:
è già uscita, e il piano lo sapeva. Col budget reale del 2026 il vecchio confronto diceva
"speso 81%, anno trascorso 72% → in ritardo" e proiettava **74.099 €** su un budget di 65.444;
il piano a settembre ne prevede l'**84%**, quindi l'81% è *sotto*, e la proiezione è 63.355 €.

| | formula |
|---|---|
| marker della barra | `expBudgetYtd / expBudgetFull` — quota di piano collocata entro il mese di taglio |
| proiezione | `expR / planFrac`, cioè *speso × annuo ÷ previsto* |
| soglia di affidabilità | `planFrac >= 1/6` (non più i 60 giorni) |

⚠️ **`expBudgetYtd` va sommato su `allRows`, non su `shown`**, esattamente come
`expBudgetFull`: filtrare i due su insiemi diversi darebbe alle due percentuali denominatori
diversi, e il marker cadrebbe nel punto sbagliato senza nessun errore visibile.

⚠️ **La soglia della proiezione è legata al piano, non ai giorni.** I 60 giorni di prima erano
la traduzione di "un sesto del periodo" (la regola del banner di Mese, che aspetta 5 giorni su
~30); ora che il divisore è la quota di piano, un sesto si scrive `planFrac >= 1/6`. È anche
più utile: un anno che concentra a gennaio ha una proiezione sensata già a fine gennaio.

**Il limite che resta, e perché c'è il "Restano".** Se una categoria ha solo il totale annuo e
nessun mese fissato, il piano la spalma in dodici parti: una spesa concentrata risulta in
anticipo, e nessun calcolo può saperlo — al budget non è mai stato detto *quando*. Per questo
il banner mostra anche **quanto resta del budget annuo**, l'unico numero che non dipende né dal
tempo né dalla forma del piano.

⚠️ Il banner della scheda **Mese** usa ancora il tempo trascorso, e deve continuare a farlo:
lì il budget del mese è un numero solo, senza forma interna, quindi il calendario è l'unico
riferimento disponibile. Le due schede si somigliano ma questo pezzo non va uniformato.

---

## Convenzioni

- **Lingua:** tutto in italiano (commenti, stringhe UI, messaggi errore)
- **Naming:** PascalCase classi, camelCase metodi/variabili, UPPER_SNAKE_CASE costanti, snake_case tabelle DB
- **Nessun test automatico** sulla logica — test manuale via UI. Fanno eccezione due verifiche di non regressione: `test-titoli.ps1` (portafoglio) e `confronta-query.ps1` (ogni lettura di `Database`, prima/dopo una modifica). Per la **resa grafica** esiste una verifica automatizzabile: vedi "Verifica visiva dell'UI" più sotto
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
| 🌁 Nebbia (default) | `nebbia` | `:root` — **nessun** `data-theme` | `#e3e7f1` |
| 📜 Carta | `carta` | `[data-theme="carta"]` | `#ece5d8` |
| 🛢️ Petrolio | `petrolio` | `[data-theme="petrolio"]` | `#0f1e23` |
| 🪟 Vetro | `glassy` | `[data-theme="glassy"]` | `#161b25` |

Nebbia e Carta sono chiari; Petrolio e Vetro scuri. **Nebbia "aurora"**: fondo a mesh
gradient, card in vetro smerigliato, accento indaco, card hero sul Saldo totale, e l'unico tema con
**font propri** — Geist (testo) e Manrope (titoli e grandi importi), inclusi in `web/fonts/` (mai da
Google Fonts: il link remoto bloccava il primo render). Tutto il tema sta in un solo blocco CSS
annidato (`html:not(:where(...)) { & ... }`); la palette ha copie in `_BUILTIN_VARS.nebbia`
(settings.js), nello sfondo del primo paint (index.html) e in `chartColors()` (utils.js).
⚠️ Cambiando font del corpo, verificare che `tnum` (applicato a tutte le celle) tocchi solo le
cifre: Inter allarga anche trattino, virgola e spazio ("Famiglia - Noi : Fuori").
I temi personalizzati (chiave `c:<id>`)
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

## UI — Layout per telefono (≤ 820px)

L'interfaccia nasce desktop, ma la stessa UI è raggiungibile dal browser del telefono via
`WebServer` (accesso LAN). Con sidebar fissa da 236px su ~390px di schermo restava una
striscia di contenuto: in fondo a [style.css](src/main/resources/web/css/style.css) c'è una
sezione **Responsive** con un unico `@media (max-width: 820px)` che rimedia. Sotto quella
soglia la sidebar diventa un **cassetto a scomparsa** (classe `nav-open` su `<body>`, aperta
dall'hamburger di `#mobilebar`, chiusa dal velo `#navScrim`, da Esc o da `navigate()`), le
griglie collassano su una colonna e le tabelle più larghe perdono le colonne accessorie.

⚠️ Regole da rispettare:

1. **La soglia 820px sta sotto il minimo della finestra desktop** (900px,
   `MainWindow.setMinimumSize`): è ciò che garantisce che in JCEF queste regole non si
   attivino mai. Alzando l'una o abbassando l'altro le due si incrociano e il desktop si
   ritrova il layout da telefono.
2. **La titlebar non va nascosta lì dentro.** In modalità browser la nasconde già `init.js`;
   in JCEF con zoom spinto il viewport può scendere sotto gli 820px, e nasconderla
   toglierebbe gli unici controlli finestra disponibili.
3. Le pagine che compongono le griglie **inline** dal JS (Reports soprattutto) si scavalcano
   solo per attributo: `[style*="grid-template-columns"]`. L'esclusione
   `:not([style*="min-width"])` protegge l'unica griglia che deve restare larga e scorrere.
4. Le colonne nascoste in Transazioni si scelgono **per classe** (`td-account`, `td-type`…);
   in Pianificate, che di classi non ne ha, **per posizione** — spostando una colonna lì
   vanno rivisti gli indici `nth-child`.

Si verifica come tutto il resto, dando una larghezza allo strumento:
`.\tools\screenshot.ps1 -Port 7891 -Width 390 -Height 844 -NoCache -Js "navigate('budgets')"`
e `.\tools\interact.ps1 -Port 7891 -Width 390 -Height 844 -Do "click #mbBurger; ..."`.

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
`key` accetta i modificatori come prefisso (`key Alt+ArrowLeft`, `key Ctrl+Shift+F`).
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

## Leggere il DB senza avviare l'app: `db.ps1`

Tutto quanto sopra richiede l'**app accesa**: `screenshot.ps1 -Probe` passa dalle api del
bridge, quindi a app chiusa non risponde. `tools\db.ps1` legge invece il file SQLite
direttamente e funziona sempre.

```powershell
.\tools\db.ps1 "SELECT COUNT(*) FROM transactions"
.\tools\db.ps1 -Database prod "SELECT * FROM accounts" -Limit 50
.\tools\db.ps1 -File .\query.sql -Json -Quiet
```

`-Database local` (default) è `D:\LucaMoneyManager\luca.db`, `prod` è quello su OneDrive;
accetta anche un path esplicito. Ogni esecuzione stampa in testa **quale DB** ha aperto, con
dimensione e data di modifica — è l'errore che costa di più. Altre opzioni: `-Limit`
(default 200), `-Json`, `-Quiet` (niente intestazione, output parsabile).

Per **rinfrescare il DB di test con i dati veri** c'è `tools\copy-db.ps1`: copia prod → test in
una direzione sola (l'inversa sovrascriverebbe i dati veri), mostra i due file con dimensione e
data e chiede conferma con INVIO. Il DB di test viene sovrascritto senza copie di sicurezza: è
una copia di lavoro, si rigenera rilanciando lo script. Si ferma prima di toccare qualcosa se il
DB di destinazione è bloccato dall'app aperta.

**Read-only per costruzione**: `tools/DbQuery.java` apre la connessione con
`SQLiteConfig.setReadOnly(true)`, quindi il driver rifiuta ogni DML (`SQLITE_READONLY`) — non
è una convenzione da ricordare, è un vincolo. Non disturba il lock dell'app né la
sincronizzazione OneDrive, e SQLite ammette più lettori: si può interrogare anche ad app
aperta. Non installa niente: usa il driver `sqlite-jdbc` già dentro `target/moneymanager-*.jar`
(fallback sulla cache `~/.m2`) e gira in *source-file mode* di Java 25, senza compilazione.

⚠️ Tre trappole già pagate, da non ripetere:

1. Il parametro è **`-Database`, non `-Db`**: `db` è l'alias del parametro comune `-Debug` e
   PowerShell rifiuta lo script all'avvio per collisione di alias.
2. `-Dstdout.encoding=UTF-8` sulla riga di comando **non funziona**: PowerShell 5.1 spezza
   l'argomento sul punto e java non trova la main class. L'UTF-8 lo imposta `DbQuery` da sé su
   `System.out`/`err`, altrimenti le accentate dei nomi di categorie e conti escono come `?`.
3. Serve `--enable-native-access=ALL-UNNAMED`, altrimenti Java 25 antepone quattro righe di
   WARNING a ogni risultato (sqlite-jdbc carica una libreria nativa).

⚠️ **I dati anteriori a marzo 2026 non sono normale amministrazione**: importati da un
programma precedente, e il 2025 contiene un'eredità e il saldo del mutuo (ottobre 2025 da solo
vale il 69% delle entrate della finestra ago 25 → lug 26). Qualsiasi analisi su medie, mediane
o tassi va filtrata da `2026-01-01` in avanti, salvo diverso accordo.

---

## Verifica di non regressione sui titoli: `test-titoli.ps1`

Il portafoglio è l'unico punto in cui l'app **crea denaro**: una plusvalenza non è un
giroconto. Se il calcolo sbaglia i saldi restano plausibili e non se ne accorge nessuno per
mesi — motivo per cui questa parte, sola in tutto il progetto, ha una verifica automatica.

```powershell
.\tools\test-titoli.ps1                 # sul DB di progetto
.\tools\test-titoli.ps1 -Database prod  # sui dati veri, senza toccarli
.\tools\test-titoli.ps1 -Verbose        # stampa anche atteso/ottenuto di ogni controllo
.\tools\test-titoli.ps1 -Keep           # conserva la copia per ispezionarla
```

**Ottanta controlli** su quattro suite: azioni (acquisto con commissione, vendita in utile e
in perdita, imposta differita anche a posizione chiusa, rifiuti attesi, annullamento),
obbligazioni (prezzo in percentuale, vendita parziale, rimborso a scadenza, e il rateo lordo
d'acquisto: non tocca il PMC, esce dal conto liquidità insieme al carico, compare come riga di
storico dedicata, sparisce annullando l'acquisto), cedole/dividendi (che devono restare
**dentro** budget e previsioni) e **difese** — quello che l'utente può fare per sbaglio:
smontare una vendita dalla pagina Transazioni, e spostare o eliminare la categoria in cui
l'app registra le plusvalenze (dopo uno "sposta ed elimina" la vendita successiva deve
scrivere nella destinazione scelta, senza far rinascere la categoria vecchia).

Le proprietà difese sono quelle che si rompono in silenzio: il conto investimenti si muove
sempre del **solo carico**, mai del ricavo; annullare un'operazione riporta i saldi esattamente
dov'erano; e nessuna singola scrittura di un'operazione può sparire da sola.

⚠️ **Lo strumento scrive** — compra, vende, annulla. Per questo non lavora mai sul DB indicato
ma su una **copia temporanea**, che cancella alla fine insieme al `.log` che `DbLogger` le
scrive accanto. Da qui due comodità: si lancia ad app aperta senza contendere il lock, e
`-Database prod` è innocuo perché i dati veri vengono solo letti per fare la copia.

Il classpath mette `target\classes` **prima** del fat JAR: nel JAR ci sono le classi
dell'ultima build, in `target\classes` quelle appena compilate. Senza quest'ordine si
verificherebbe il codice vecchio credendo di provare il nuovo — quindi prima serve
`mvn -o compile`. Esce con codice diverso da zero se un controllo fallisce.

---

## Verifica di non regressione sulle letture: `confronta-query.ps1`

`test-titoli.ps1` controlla regole scritte a mano; questo strumento risponde a un'altra
domanda: **la modifica che sto facendo cambia un numero che l'app mostra?** È la rete sotto
ogni intervento su `Database.java` che *non dovrebbe* cambiare nulla (riscrittura di query,
frammenti SQL messi in comune, ottimizzazioni), e dice esattamente cosa si sposta quando
invece un cambiamento è voluto.

```powershell
.\tools\confronta-query.ps1                  # modifiche in corso contro HEAD, sul DB di progetto
.\tools\confronta-query.ps1 -Database prod   # sui dati veri, senza toccarli
.\tools\confronta-query.ps1 -Rif HEAD~1      # l'ultimo commit contro quello prima
.\tools\confronta-query.ps1 -Keep            # conserva la cartella di lavoro in %TEMP%
```

**Come lavora.** Estrae i sorgenti di `-Rif` con `git archive` e compila con `javac`, **con lo
stesso comando**, quella versione e il working tree. Copia il DB una volta sola, così le due
versioni leggono gli stessi byte. Poi [ConfrontaQuery.java](tools/ConfrontaQuery.java) chiama
circa 250 letture di `Database` (conti, categorie, transazioni con i filtri della pagina,
pianificate, portafoglio, budget, dashboard, Analytics, previsioni, più `generateBudget` in
fondo) e salva per ognuna il risultato e il **testo SQL** di ogni query, intercettato da una
spia sulla `Connection`. Due scenari: `reale`, e `escluse`, con le categorie più usate (anche
dagli split) marcate escluse da budget. Senza il secondo, il filtro sulle escluse non
verrebbe mai messo alla prova, perché sui dati veri quasi nulla ci ricade.

**Come si legge.**
- `risultati` è l'esito: IDENTICI → exit 0; DIVERSI → exit 1, con il punto esatto in cui il
  JSON diverge (es. `current_partial_net: -3271.7` → `-2739.54`).
- `testo SQL` è informativo: elenca le chiamate con SQL cambiato **e** risultato identico,
  che è normale per una riscrittura ma sospetto se non si voleva toccare quella query. Gli
  spazi non contano (a capo, rientri, spazi attorno a parentesi e virgole).
- Il riferimento gira **due volte**: una chiamata che cambia fra le due esecuzioni dello
  stesso codice non è deterministica e viene elencata a parte, invece di far fallire il
  confronto per un motivo finto.

⚠️ Quattro dettagli su cui si regge, da non togliere:
1. **`-Xprefer:source` in `javac`.** Il fat JAR contiene anche le classi dell'app, compilate
   all'ultimo `mvn package`. Con la regola di default ("vince il più recente") `javac`
   potrebbe usare quelle invece dei sorgenti estratti, e si confronterebbe altro codice.
2. **Stesso nome di file per la copia in tutte le esecuzioni** (`lavoro.db`): alcune letture
   restituiscono il path del DB, e con nomi diversi risulterebbero cambiate.
3. **Gli id da iterare si leggono con una connessione a parte**, prima di aprire `Database`:
   se venissero dal codice sotto esame, una modifica a `getAccounts` cambierebbe l'elenco
   stesso delle chiamate.
4. **Chiavi ordinate prima di serializzare**: `Map.of` ha un ordine di iterazione diverso a
   ogni avvio della JVM, e senza questo due esecuzioni dello stesso codice non coinciderebbero.

**Limiti.** Copre `Database` e basta: non il `Bridge`, non il JS, non la resa (per quella c'è
"Verifica visiva dell'UI"). Le date dei parametri sono relative a oggi, e le due versioni girano
a pochi secondi l'una dall'altra. Sulle scritture copre solo `generateBudget`: per acquisti,
vendite e annullamenti c'è `test-titoli.ps1`. Dura circa un minuto.

---

## Funzionalità principali

Dashboard · Conti (tipi, valute, icone emoji, colori) · Transazioni (split, tag, riconciliazione) · Categorie (gerarchiche, colori, filtri per Android/esclusione/portafoglio/natura) · Budget (mensile/annuale, master amount) · Pianificate (ricorrenti, previsioni) · Portfolio (ticker, buy/sell, dividendi) · Report (Chart.js) · Note (editor Quill, lazy-load) · Impostazioni (tema, backup)

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
