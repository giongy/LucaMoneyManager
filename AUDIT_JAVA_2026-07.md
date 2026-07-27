# Audit codice Java — luglio 2026

> Scope: `src/main/java/com/moneymanager/*.java` (12 file, ~7.400 righe) · Data: 2026-07-26/27
> Metodo: 6 analisi parallele (concorrenza, integrità dati, performance, sicurezza, robustezza, manutenibilità), findings verificati sul codice reale.
> Predecessore: [AUDIT_ROBUSTEZZA_JAVA.md](AUDIT_ROBUSTEZZA_JAVA.md) (2026-07-18, focus logging/eccezioni).

**52 finding.** Legenda stato: ✅ fatto · ⏳ da fare · 🔕 rischio accettato · ⏭️ valutato e scartato.

**Stato al 2026-07-27:** 10 chiusi (concorrenza `a218f2e`, date `b058115`, allegati `S2`) ·
3 a rischio accettato (S1/S3/S4, sicurezza WebServer) · **39 aperti**.

---

## ✅ FATTO — 2026-07-27 · Concorrenza sulla Connection

Tutto in `Database.java` salvo dove indicato. Compila (`mvn compile` OK). **Da provare a mano** (vedi § Test manuali).

- ✅ **`conn` è `volatile`** — letto senza lock da `isOpen()`, che il polling del tray chiama ogni 2s.
- ✅ **`close()` è l'unico punto di chiusura** e ha la guardia `if (activeQueries > 0) return;`
  Ci passano ora anche: il TimerTask di auto-release (prima faceva `conn.close()` diretto, quindi
  **non aggiornava la baseline mtime/size** → il rilevamento "DB modificato esternamente" era muto
  dopo ogni rilascio idle), `reconnect()` e `restoreBackup()`.
- ✅ **`restoreBackup` non azzera più `conn`** (`conn = null` era la causa possibile di un NPE nel
  TimerTask → morte del thread del Timer → tutte le query in errore fino al riavvio). Ora sospende
  anche l'auto-release per tutta la durata, e azzera la baseline dopo il ripristino.
- ✅ **`reconnect` azzera la baseline** dopo il cambio file: si riferiva al DB precedente e avrebbe
  prodotto una falsa "modifica esterna" al primo accesso sul nuovo.
- ✅ **`synchronized` su tutto ciò che riassegna `conn`**: `reopen`, `reconnect`, `restoreBackup`,
  `withExclusiveAccess`, `close`, `closeManual`. Senza, `reopen()` (EDT, dal tray) e `ensureOpen()`
  (thread di una query) potevano aprire **due** connessioni e perderne una: orfana, file handle
  aperto fino a fine processo → lock su OneDrive mai rilasciato → file di conflitto e divergenza
  con Android, cioè esattamente ciò che l'auto-release esiste per evitare.
- ✅ **`inTx` è `synchronized` e usa `beginQuery()/endQuery()`** invece di `ensureOpen()` + campo
  `conn`: prende la Connection sotto lock e tiene `activeQueries > 0` per **tutta** la transazione
  (prima tornava a 0 fra uno statement e l'altro, quindi nessuna guardia la vedeva).
- ✅ **TimerTask: `catch (Throwable)`** invece di `SQLException`, e `idleTimer.schedule` protetto da
  `IllegalStateException`. Un'eccezione che sfuggiva da `run()` terminava il thread del Timer, e da
  lì ogni `schedule()` lanciava risalendo fino a `beginQuery()` → **tutte** le query fallivano.
- ✅ **Shutdown hook** in `App.java`: chiude il DB all'uscita. I due percorsi (X sulla finestra,
  "Esci" dal tray) facevano `System.exit(0)` senza chiudere → lock trattenuto e possibile
  `<db>-journal` orfano sincronizzato su OneDrive.

**Invariante risultante** (ora documentata nel javadoc della classe e in CLAUDE.md):
> `conn` si legge/scrive solo sotto lock · si chiude solo da `close()` · `close()` non chiude se c'è lavoro in volo.

### ✅ Commenti e documentazione allineati
- javadoc di `Database`: diceva *"è sicuro perché le chiamate arrivano serializzate dal thread UI di JCEF"* — **falso** da quando esiste il WebServer. Sostituito con l'invariante.
- `activeQueries`: citava `withConnection()`, metodo che non esiste (è `beginQuery()`).
- `autoReleaseEnabled`: citava "Backup/reconnect" fra chi lo sospende; in realtà sono `inTx`, `restoreBackup`, `withExclusiveAccess`.
- `ensureSystemTags`: elencava 3 tag su 4 — mancava **RAGGRUPPATE**, su cui poggia lo svecchiamento.
- `phoneTagId`: diceva "creato in seedDefaultData", è `ensureSystemTags`.
- `initSchema`: diceva "tutte le tabelle"; ora precisa che `sync_meta`/`imported_pending` nascono altrove e che `CREATE IF NOT EXISTS` **non aggiunge colonne** a tabelle esistenti.
- `getDueToday`: prometteva "prossima occorrenza", confronta solo `start_date`.
- `tryParseDate`: messaggio "data pianificata non valida" usato anche per le scadenze obbligazionarie, con `id` sempre `null` (la SELECT non lo seleziona) → messaggio generico + passa il `ticker`.
- `migrate()`: aggiunta la nota sul limite noto (vedi ⏳ D1).
- **CLAUDE.md**: 22 tabelle (non 21, mancava `imported_pending`), LOC e conteggi reali, 14 moduli JS, `temp_store=MEMORY`, nuova sezione sull'invariante della connessione.
- **ARCHITECTURE.md**: 11 riferimenti `#Lnnn` marci corretti, 133 case, nota su virtual thread e `activeQueries`.

---

## Critici — ⏳ D1 D3 da fare · ✅ D2 e S2 risolti · 🔕 S1 S3 S4 rischio accettato

### 🔕 S1, S3, S4 · Sicurezza WebServer — RISCHIO ACCETTATO (decisione utente, 2026-07-27)
- **S1** — WebServer su `0.0.0.0:7890` senza autenticazione, `http.enabled` default `"1"` · `WebServer.java:27`, `Settings.java:28`
- **S3** — blocklist invece di allowlist: 17 metodi bloccati su 133, restano esposti `doBackup`, `restoreBackup`, `setSetting`, `reloadDb`, `dbVacuum`, tutte le `delete*` · `WebServer.java:46-57`
- **S4** — `Access-Control-Allow-Origin: *` con body `text/plain` (simple request) → CSRF e lettura cross-origin · `WebServer.java:103`,`:63`

**Motivazione:** app a uso strettamente personale, accessibile solo dalla LAN domestica, unico
utente. Il modello di minaccia "altri sulla stessa rete" non si applica.

**Quando rivalutare:** se il portatile si collega a una rete non fidata (hotel, coworking, wifi di
un cliente) il server si espone da solo, senza nessuna azione dell'utente. In quel caso basta
mettere `http.enabled=0` in `settings.properties` prima di connettersi — non serve toccare codice.
⚠️ Non riproporre questi tre punti senza che cambi il contesto d'uso.

### ✅ S2 · Path degli allegati non confinato — RISOLTO 2026-07-27
`Path.of(attDir).resolve(relPath)` senza `normalize()`/`startsWith()`: `resolve()` **restituisce il
path tal quale se è assoluto**, quindi `C:\...\x.exe` o `\\host\share\x.exe` ignoravano del tutto
`attachments.dir`. I chiamanti poi aprivano il risultato con `Desktop.open` (su Windows **esegue**
.exe/.bat/.lnk) o lo cancellavano.

Non dipende dalla LAN: `attachment_path` sta nel DB condiviso via OneDrive, scrivibile anche
dall'app Android, e può essere semplicemente **sbagliato** (vecchia cartella allegati, share di
rete non più esistente, sync parziale).

Fix: nuovo helper `Bridge.resolveAttachment(attDir, relPath)` che normalizza e verifica
`startsWith(base)`, ritornando null se il percorso esce. Usato nei **3** punti che risolvevano un
path allegato: `openAttachment` (`:561`), `removeAttachment` (`:585`) e `attachFile` (`:549`,
cancellazione del vecchio allegato — aveva lo stesso difetto). In `removeAttachment` il
riferimento viene comunque staccato dalla transazione anche quando il path è respinto: è proprio
il caso in cui è sbagliato. I `catch (Exception ignored)` sono diventati log su `app.log`.

Verificato: passano i nomi normali e le sottocartelle; respinti path assoluti, UNC, traversal con
`..` (sia `/` sia `\`), altro volume, stringa vuota, null e nome con NUL. Controllato il DB reale
in sola lettura: **1 sola transazione con allegato**, formato `355_scontrino benzina...pdf` —
nessun path assoluto o con `..`, quindi il fix non blocca nulla di esistente.

### D1 · `importPending` tronca `pending.jsonl` `Database.java:1618`→`:1687`
Legge N righe, riscrive N righe. Se OneDrive completa il download fra le due, **le transazioni del
telefono spariscono per sempre**. L'import parte al boot, il momento di massima attività di sync.
→ Ricontrollare size+mtime prima di `Files.write`; se cambiati, saltare la riscrittura (le
transazioni sono già nel DB, `imported_pending` garantisce l'idempotenza).

### ✅ D2 · Drift delle ricorrenze — RISOLTO 2026-07-27 (solo codice, nessun dato toccato)
`plusMonths(1)` clampa il 31 gennaio a 28 febbraio, e il clamping **non è reversibile**
(28 feb +1 mese = 28 mar, non 31 mar). Il codice derivava ogni occorrenza da quella precedente,
quindi febbraio "contagiava" tutti i mesi successivi; `advanceScheduled` **persisteva** il valore
clampato in `start_date`, cristallizzando il drift nel DB.

Fix applicato:
- **`firstOccurrenceFrom`**: ogni occorrenza è ricalcolata dall'àncora `start`
  (`start.plusMonths(months+1)` invece di `cur.plusMonths(1)`), per monthly/monthly_last/yearly/
  bimonthly/quarterly/semiannual. Estratto `lastDayOfMonthAfter()` per monthly_last.
- **Nuovo `nextOccurrence(anchor, freq, cur)`** = `firstOccurrenceFrom(anchor, freq, cur+1g)` con
  guardia `next > cur`; sostituisce `advanceDate(cur, freq)` nei **6 cicli** di espansione
  (`getUpcoming`, `getUpcomingAll`, `getProjection` ×2, `getProjectionByCategory`,
  `getForecastEngine`). La guardia evita anche il **loop infinito** che si sarebbe aperto con una
  frequenza sconosciuta (dove `advanceDate` ritornava null e `firstOccurrenceFrom` no).
- **`advanceScheduled`** ancora a `original_start_date`, con fallback a `start_date` per le righe
  precedenti alla colonna. La colonna era scritta e **mai letta**: ora è collegata.
- **`advanceDate` rimosso**: rimasto senza chiamanti dopo la sostituzione.
- **`getProjectionByCategory`**: era l'unica delle 6 copie a usare `LocalDate.parse` diretto invece
  di `tryParseDate` → una data corrotta faceva esplodere l'intera vista. Allineata alle altre.

Verificato eseguendo la logica nuova sui casi limite: mensile 31/01 → `31 gen, 28 feb, 31 mar,
30 apr, 31 mag`; annuale 29/02/2024 → ripiega sul 28 e **torna al 29 nel 2028**; trimestrale,
semestrale, monthly_last, weekly/daily, once e frequenza ignota tutti corretti.

⚠️ **Dati non toccati, per scelta esplicita.** Le 76 pianificate con `original_start_date` a `null`
usano `start_date` come àncora: se ha già driftato (es. id=63 `noir studio alessandro`, mensile al
28/08) il fix **impedisce il peggioramento ma non recupera il giorno originale**. Recuperarlo
richiederebbe indovinare se il 28 fosse voluto o residuo di un 31 — va corretto a mano, se serve.
Pianificate esposte al momento del fix: id 13, 37, 56, 57, 67, 85, 102, 103 (giorno ≥ 29);
id 38, 41, 63, 109 (giorno 28, drift forse già avvenuto).

### D3 · Cancellare una transazione di portafoglio `Database.java:1874` + schema `:704`
Il CASCADE distrugge la riga `portfolio_transactions` ma `portfolio.quantity`/`avg_price` restano →
patrimonio gonfiato e P&L successivo su base sbagliata. L'undo ricrea la transazione con id nuovo:
legame perso. Nessun avviso in cancellazione (c'è solo in modifica, `transactions.js:659`).
→ Bloccare la delete se esiste un `portfolio_transactions` collegato.

---

## ⏳ DA FARE — alti

| # | Cosa | Dove |
|---|---|---|
| D4 | Eliminare un conto lascia **trasferimenti orfani che scalano il conto sorgente per sempre** (`to_account_id ON DELETE SET NULL` + il `CASE` del saldo) | schema `:648-649`, `deleteAccount:1141` |
| D5 | `reassignCategory` non tocca `transaction_splits` né `scheduled_transactions` (`SET NULL`) → quegli importi **escono da tutti i report per categoria**; `getCategoryUsage` non li conta e i `budgets` vecchi vengono cancellati dal CASCADE | `:1357`, `getCategoryUsage:1343` |
| P1 | `strftime('%Y',date)` nel WHERE annulla `idx_tx_date` → **7 scansioni complete per apertura dashboard** (~35.000 righe invece di ~3.500). Sostituire con `date >= ? AND date < ?` (`getCategoryComparison:4612` lo fa già: è il modello) | 10 punti: `:3648 :3721 :3735 :3740 :2215 :2222 :2254 :2259 :1445 :1449` |
| P2 | `getPortfolio`: 9 subquery correlate × N posizioni e **nessun indice su `portfolio_transactions(portfolio_id)`** → ~270 scansioni per apertura pagina | `:3049` |
| P3 | `getTransactions`: le subquery `sp`/`pt` hanno `GROUP BY` → **non flattenabili**, materializzate per intero a ogni filtro/ordinamento anche con 40 righe a video | `:1424-1433` |
| P4 | All'avvio **e a ogni risveglio dal tray** si caricano tutte le transazioni non conciliate senza `limit` (e `buyStock`/`sellStock`/cedole inseriscono sempre `reconciled=0`: crescono senza limite) | `init.js:83`,`:443` |
| R1 | Backup automatico (copia integrale del DB) **sull'EDT** durante la chiusura → freeze di secondi, minuti se il file è cloud-only | `MainWindow.java:99-110` |
| R2 | **"Esci" dal tray salta il backup automatico**: `dispose()` emette `windowClosed`, non `windowClosing` | `TrayManager.java:459` |
| R3 | `TrayManager.enable/disable` (Swing + SystemTray) invocati **fuori dall'EDT** da `setSetting` — certamente off-EDT quando arriva dal WebServer | `Bridge.java:511-526` |
| R4 | `winPickFolder`: stderr mai letto (buffer ~4 KB) e stream mai chiusi → **deadlock permanente** del virtual thread + powershell zombie | `Bridge.java:246-266` |
| R5 | All'avvio, se la cartella del DB non è raggiungibile (OneDrive non ancora montato con autostart), l'app **riscrive `db.path`** e crea un DB vuoto. Stessa dinamica in `reloadDb`, che persiste il path prima di verificarlo | `App.java:158-164`, `Bridge.java:658` |
| D6 | `migrate()` **timbra v20 su DB con schema più vecchio** senza aggiungere le colonne: ripristinare un backup vecchio produce `no such column` sparsi e permanenti. Serve almeno un log nei due rami anomali | `:919`, nota già nel codice |
| X1 | **XSS persistente** (nessun escaping, `innerHTML` su `description`). L'iniezione via LAN non è più nel modello di minaccia (vedi 🔕 S1/S3/S4), ma resta raggiungibile da una riga di `pending.jsonl` scritta da Android. La catena verso l'esecuzione di file è comunque tagliata da ✅ S2. *(area JS, fuori dal perimetro Java)* | `init.js:161`,`:215`, `transactions.js:508`,`:518` |

---

## ⏳ DA FARE — medi

- **Operazioni multi-scrittura senza `inTx`**: `setBudgetBulk` (`:2331`, 12 commit → mezzo anno aggiornato se crasha), `generateBudget` (`:2244`, ~600 INSERT = **600 commit** con journal create/fsync/delete su OneDrive — sono i secondi del pulsante "Genera budget"), `saveNote` (`:1956`, la nota **perde tutti i tag**), `copyBudgetFromYear`, `deleteBudgetYear`, `addScheduled`/`updateScheduled`, `saveForecast`, `seedDefaultData`.
- **`touchSyncMeta`** (`:600`): 3 statement di cui un DDL a ogni scrittura (spuntare "conciliata" = 4 commit invece di 1). E **manca** su categorie, tag, pianificate, budget e **tutto il portafoglio** → Android non vede una sessione di trading. → Spostare il `CREATE TABLE` in `initSchema`, fondere i due INSERT.
- **Nessuna validazione "somma split = importo"** (`saveSplits:2080`): la tolleranza JS è `> 0.01`, quindi 3×33,33 su 100 € passa → dashboard 100,00 vs torta 99,99, per sempre.
- **`excluded_from_budget` ignorato sulle transazioni suddivise** (`:3644` vs `:3729`): `category_id` è NULL → l'intero importo entra nei totali anche se tutti gli split sono su categorie escluse.
- **`importPending` non ri-marca `applied`** (`:1658`, il javadoc a `:1609` promette il contrario): Android continua a scalare l'importo dal saldo mostrato **per sempre** e la riga non è mai eleggibile per la pulizia a 30 giorni.
- **`DbLogger.log()` non thread-safe** (`DbLogger.java:99`): chiamato da 4 famiglie di thread; righe intrecciate → operazioni fantasma nel sidecar JSON del backup.
- **Il purge del log non ricalcola `startOffset`** (`DbLogger.java:135`,`:168`) → `hasModifications()` torna `false` → **il backup automatico non parte e nessuno lo dice**.
- **`getForecastDetail`** (`:4141`): N+1 (50 query) su `transaction_splits` senza indice su `category_id` → 50 scansioni complete.
- **`backup()` e `restoreBackup()` non escludono gli altri thread**: con `journal=DELETE`, copiare durante una transazione produce un **.bak corrotto** che scopri il giorno del ripristino. (`restoreBackup` è ora `synchronized`; `backup()` **no**.)
- **Salva/ripristina di `autoReleaseEnabled` non rientrante** (`inTx:579`, `withExclusiveAccess:3759`): due sospensioni sovrapposte possono lasciare l'auto-release **spento per il resto della sessione** → lock OneDrive mai rilasciato. → Contatore `autoReleaseSuspend` invece del salva/ripristina. *(Attenuato ma non risolto dal `synchronized` su `inTx`.)*
- **`fetchOnlinePrice` senza timeout di risposta** (`Bridge.java:851`): `connectTimeout` copre solo l'handshake → la Promise JS non si risolve mai.
- **`Desktop.open/browse` sul thread di dispatch** (7 punti in `Bridge.java`) → 2-4 s di UI congelata.
- **Registrazione pianificata non atomica** (`dashboard.js:963`): se `advanceScheduled` fallisce dopo il commit di `addTransaction` → **doppia registrazione** al secondo tentativo.
- **`reopen()` sull'EDT** (`MainWindow.java:211`,`:242`, `TrayManager.java:285`): apertura di un file OneDrive de-idratato blocca l'intera UI Swing.
- **Porta 47291 occupata** → l'app **esce in silenzio assoluto** e non parte più (`SingleInstance.java:22`, `App.java:138`). → Se il "SHOW" fallisce, `return true`.
- **`Integer.parseInt(backup.max)` senza fallback** (`Bridge.java:670`,`:705`; protetto invece in `MainWindow.java:106`): un campo svuotato rompe il backup pre-svecchiamento, che è irreversibile.
- **`readAllBytes` senza limite** su POST `/bridge` (`WebServer.java:37`) + nessun timeout → OOM dalla LAN.
- **`deletePortfolioItem`** (`:3568`) lascia orfane le transazioni di acquisto e le commissioni.
- **`updateTransaction`** (`:1810`) aggiorna `portfolio_transactions.price` solo per `coupon`/`expense`: correggere l'importo di un acquisto lascia `avg_price` vecchio.
- **`getProjectionByCategory`** (`:4063`) è l'unica delle 6 copie del loop pianificate che usa `LocalDate.parse` diretto invece di `tryParseDate` → una data corrotta fa esplodere l'intera vista.
- **Divisione per zero** in `buyStock` (`:3206`,`:3213`) con `qty == 0` → `NaN` in `avg_price`. Validato solo lato JS.
- **`archiveTransactions`** (`:2752`) fa DELETE riga per riga (1000-2000 statement).
- **`getScheduled()` chiamato 2 volte in `getProjection`** (`:2905`,`:3005`) con filtri divergenti sui trasferimenti.
- **WebServer: ramo `/` senza catch e nessun logging** in entrambi i rami *(resto di C3 del audit precedente)*.

---

## ⏳ DA FARE — indici e pulizia

**Aggiungere** (ognuno giustificato da query reali):
```sql
CREATE INDEX IF NOT EXISTS idx_porttx_portfolio ON portfolio_transactions(portfolio_id, type);
CREATE INDEX IF NOT EXISTS idx_splits_cat       ON transaction_splits(category_id);
CREATE INDEX IF NOT EXISTS idx_tx_unreconciled  ON transactions(date) WHERE reconciled = 0;
```
**Rimuovere:** `idx_tx_account` (ridondante con `(account_id,date)`), `idx_sched_active` (mai usato: il filtro `is_active` è in Java in 8 punti), `idx_note_tags_tag` (coperto dalla PK).
**`PRAGMA optimize` in `close()`**: popola `sqlite_stat1`, che serve al join con `OR` di `getAccounts` (`:1092`). `ANALYZE` non gira mai automaticamente.
**Non** introdurre una cache di `PreparedStatement`: `sqlite3_prepare_v2` costa 10-50 µs contro una soglia slow-query di 50 ms.

**Codice morto** (verificato: zero `api.<nome>(` in `web/js/`):
`case "deleteBudget"` + `Database.deleteBudget` · `case "getUpcoming"` + `Database.getUpcoming` (28 righe) · `case "getNote"` (⚠️ `Database.getNote` è **vivo**: lo usano `saveNote` e `setNotePinned`) · `method.equals("resetJcef")` in `WebServer.java:53` · campo `cefApp` in `MainWindow.java:21`,`:31` (write-only).

**Duplicazione con divergenza già presente:** `ABS(amount)` vs `amount` nelle 5 copie di "somma income/expense" (coincidono solo perché oggi gli importi sono tutti positivi) · CTE `cat_amounts` ×5 e filtro `excluded_from_budget` ×19 · valorizzazione bond/equity ×8 SQL + ×2 Java con **3 trattamenti diversi** dei conti investment · cascata "categoria commissioni" identica in `buyStock`/`sellStock` · costante `12.5` (aliquota cedole) in 4 punti.

**Organizzazione:** 100 righe di helper delle transazioni (`saveTags`, `saveSplits`, `getTransactionById`, `parseTags`…) stanno sotto il separatore `─── Resoconti ───`; `readLog` sotto `─── Allegati ───`; `getCategoryMonthTable`/`getCategoryComparison` in coda al file invece che in Analytics.

**Errori invisibili:** 4 case restituiscono `Map.of("error", …)` invece di lanciare (`Bridge.java:537`,`:560`,`:563`,`:709`) → non passano dal catch centrale, **non finiscono in app.log e non incrementano il badge errori**. Fra questi il fallimento del backup pre-svecchiamento.

---

## Test manuali consigliati dopo le modifiche del 2026-07-27

1. Avvio normale → dashboard, transazioni, portafoglio, budget.
2. **Minimizza mentre salvi** una transazione con split (ideale: salvataggio dal browser LAN e minimize sul desktop insieme) → la transazione deve risultare completa o assente, mai a metà.
3. Tray: chiudi al tray, aspetta >20 s, riapri → i dati si ricaricano e non compare un falso "DB modificato esternamente".
4. Tray: "Chiudi connessione DB" → "Riapri connessione DB" ripetuto qualche volta, poi verifica con Process Explorer che ci sia **un solo** handle su `luca.db`.
5. Cambio file DB da Impostazioni e ripristino di un backup → nessun falso refresh, nessun errore al primo accesso.
6. Uscita dall'app (X e "Esci" dal tray) → nessun file `luca.db-journal` residuo nella cartella OneDrive.

---

## ⏭️ Valutato e scartato

- **Cache di `PreparedStatement`** — guadagno non misurabile, rischio di leak (vedi sopra).
- **Pool di connessioni** — incompatibile con l'auto-release del lock, che è il vincolo di progetto.
- **Spezzare `Database.java` in più classi** — fuori dalle convenzioni del progetto (nessun refactoring non richiesto).
- **Cambiare `journal=DELETE`/`synchronous=FULL`** — scelta deliberata per la sync OneDrive. La leva giusta è ridurre il **numero** di commit, non indebolire la durabilità.
