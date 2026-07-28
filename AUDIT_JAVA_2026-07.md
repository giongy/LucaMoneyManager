# Audit codice Java — luglio 2026

> Scope: `src/main/java/com/moneymanager/*.java` (12 file, ~7.400 righe) · Data: 2026-07-26/27
> Metodo: 6 analisi parallele (concorrenza, integrità dati, performance, sicurezza, robustezza, manutenibilità), findings verificati sul codice reale.
> Predecessore: [AUDIT_ROBUSTEZZA_JAVA.md](AUDIT_ROBUSTEZZA_JAVA.md) (2026-07-18, focus logging/eccezioni).

**52 finding.** Legenda stato: ✅ fatto · ⏳ da fare · 🔕 rischio accettato · ⏭️ valutato e scartato.

**Stato al 2026-07-28:** **38 chiusi** · 3 a rischio accettato (S1/S3/S4) ·
6 archiviati (D6 nessun backup pre-v20 · P4 zero non conciliate misurate ·
`generateBudget` lentezza accettata · `touchSyncMeta` Android non legge il portafoglio ·
`archiveTransactions` e `getScheduled()` ×2 non influenti) · **5 aperti**.

| Commit | Contenuto |
|---|---|
| `a218f2e` | Concorrenza sulla Connection + 8 commenti fuori sync + CLAUDE.md/ARCHITECTURE.md |
| `b058115` | D2 · drift delle ricorrenze |
| `c12da6f` | S2 · path degli allegati confinati |
| `b9358bf` | D4 · guardia eliminazione conto · D5 · riassegnazione categoria completa |
| `43e78cf` | D3 · blocco cancellazione transazioni buy/sell |
| `5c42ed4` | P1 · P2 · P3 · indici (guadagno misurato ~10%, non il 10× stimato) |
| `029571e` | R1 · backup fuori dall'EDT · R2 · "Esci" dal tray non salta più il backup |
| *(ultimo)* | R3 · Swing sull'EDT in setSetting(autostart) |
| *(2026-07-28)* | D1 · riscrittura coda · R4 · deadlock picker · R5 · db.path · X1 · escaping HTML |
| *(2026-07-28)* | Errori invisibili (4 case → throw) · WebServer catch+logging in entrambi i rami |
| *(2026-07-28)* | `startOffset` dopo il purge · `backup()` synchronized + guardia journal |
| *(2026-07-28)* | Concorrenza/UI: contatore auto-release · `openAsync` ×7 · `reopen()` fuori dall'EDT · timeout HTTP |
| *(2026-07-28)* | Integrità: qty/price in buy-sellStock · guardia update acquisto · tracciabilità delete posizione · registrazione pianificata atomica |

**Nessun critico rimasto.** Il prossimo per gravità è il purge del log che non ricalcola
`startOffset` (§ medi): il backup automatico non parte e non lo segnala nessuno.

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
- `migrate()`: nota sul DB pre-v20 riformulata come caso non applicabile (D6 archiviato).
- **CLAUDE.md**: 22 tabelle (non 21, mancava `imported_pending`), LOC e conteggi reali, 14 moduli JS, `temp_store=MEMORY`, nuova sezione sull'invariante della connessione.
- **ARCHITECTURE.md**: 11 riferimenti `#Lnnn` marci corretti, 133 case, nota su virtual thread e `activeQueries`.

---

## Critici — ⏳ D1 da fare · ✅ D2 D3 S2 risolti · 🔕 S1 S3 S4 rischio accettato

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

### ✅ D1 · `importPending` troncava `pending.jsonl` — RISOLTO 2026-07-28
Legge N righe, riscrive N righe. Se OneDrive completava il download fra le due, **le transazioni
del telefono sparivano per sempre**. L'import parte al boot, il momento di massima attività di sync.

Fix: impronta `size`+`mtime` rilevata **prima** della lettura e riverificata subito prima di
`Files.write`. Se il file è cambiato, la riscrittura viene **saltata** e l'evento loggato
(`IMPORT CODA — RISCRITTURA SALTATA`). Saltare è sicuro e non perde nulla: le transazioni lette
sono già nel DB e i loro id sono in `imported_pending`, quindi il prossimo import non le duplica
e ri-marca `applied` al passaggio successivo — cioè si perde al più un ciclo di marcatura, non un dato.

Verificato simulando la corsa su file reali: (1) senza interferenza la riscrittura avviene e le
righe risultano `applied`; (2) con una riga accodata durante l'import la riscrittura è saltata e
la riga nuova **sopravvive** (prima veniva cancellata); (3) riscrittura in-place di pari
dimensione — che `size` da sola non vedrebbe — intercettata da `mtime`.

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

### ✅ D3 · Cancellare una transazione di portafoglio — RISOLTO 2026-07-27
`portfolio_transactions.transaction_id` è `ON DELETE CASCADE`: cancellando la transazione cadeva
anche la riga di storico, ma la **posizione** restava intatta — `portfolio.quantity` e `avg_price`
non vengono ricalcolati da nessuna parte. Risultato: portafoglio che dichiara titoli non più
pagati (patrimonio gonfiato) e costo di carico sbagliato su cui si basa tutto il P&L successivo.
Non annullabile: l'undo ricrea la transazione con id nuovo, quindi il legame è perso.

Fix: guardia in `deleteTransaction` che rifiuta se esiste un `portfolio_transactions` di tipo
`buy`/`sell` collegato, indicando il titolo e rimandando alla scheda del titolo (dove
`deletePortfolioTransaction` aggiorna quantità e prezzo medio insieme allo storico).

**Guardia graduata, non totale:** `coupon`/`dividend`/`expense` (cedole, dividendi, commissioni)
restano eliminabili perché non toccano `quantity`/`avg_price`. Sul DB reale sono 16 delle 24
transazioni collegate: bloccarle tutte avrebbe tolto libertà senza motivo.

Il frontend non è stato toccato: `transactions.js:deleteTx` aveva già `try/catch` con toast.

Verificato su una **copia** del DB reale: acquisto (id 1734, IT0005599938) e vendita (id 1672,
IT0005508921) rifiutati col messaggio corretto; cedola (1703), commissione (1735) e una
transazione normale eliminate regolarmente. 0 movimenti portfolio orfani preesistenti.

Il CASCADE distrugge la riga `portfolio_transactions` ma `portfolio.quantity`/`avg_price` restano →
patrimonio gonfiato e P&L successivo su base sbagliata. L'undo ricrea la transazione con id nuovo:
legame perso. Nessun avviso in cancellazione (c'è solo in modifica, `transactions.js:659`).
→ Bloccare la delete se esiste un `portfolio_transactions` collegato.

---

## ✅ FATTO — 2026-07-27 · Integrità: eliminazione conto e riassegnazione categoria

### ✅ D4 · Trasferimenti orfani all'eliminazione di un conto — `Database.java:deleteAccount`
`account_id` è `ON DELETE CASCADE` ma `to_account_id` è `ON DELETE SET NULL`: i bonifici **in
entrata** verso il conto eliminato hanno `account_id` su un *altro* conto, quindi sopravvivevano
con `to_account_id` a NULL. Il `CASE` del saldo continua ad applicare `-amount` al conto sorgente,
che restava **scalato per sempre senza contropartita**, in modo invisibile.

Fix: guardia in `deleteAccount` che conta i trasferimenti in entrata da altri conti e rifiuta
l'operazione con un messaggio che riporta numero e importo. Lato UI, `accounts.js:deleteAccount`
ora intercetta l'errore e lo mostra in un toast (prima l'eccezione non produceva alcun feedback).

### ✅ D5 · `reassignCategory` perdeva split e pianificate — `Database.java:reassignCategory`
Spostava solo `transactions`; `transaction_splits.category_id` e
`scheduled_transactions.category_id` sono `ON DELETE SET NULL`, quindi la DELETE finale li
azzerava. Per gli split significava far **sparire quegli importi da tutti i report per categoria**
(budget, torta, categorie/mese, confronto periodi) pur restando nel totale annuo della dashboard.
`getCategoryUsage` inoltre non li contava, quindi il dialogo diceva "0 transazioni" per categorie
usate solo negli split, e il frontend le eliminava con la **conferma semplice, senza riassegnare**.

Fix: `reassignCategory` sposta anche split e pianificate (predicato "categoria stessa o sua
figlia", coerente con la CASCADE sui figli), chiama `touchSyncMeta()` e logga i tre conteggi;
`getCategoryUsage` restituisce `split_count` e `scheduled_count`; `categories.js` li include sia
nel test "categoria inutilizzata" sia nella descrizione del dialogo. Aggiunto l'helper
`countRows()` perché `execute()` ritorna la chiave generata, non il numero di righe modificate.

**Nessun dato corrotto preesistente** (verificato in sola lettura sul DB reale: 0 trasferimenti
orfani, 0 split senza categoria): entrambe le guardie sono preventive. Potenziale evitato: il
conto "Titoli" da solo avrebbe lasciato 18.211,98 € di bonifici orfani, e riassegnare "Spesa"
avrebbe perso 13 split per 1.519,26 €.

Collaudato **su una copia** del DB reale: eliminazione di "Titoli" rifiutata col messaggio giusto,
conto senza entrate eliminato regolarmente, `getCategoryUsage("Spesa")` ora riporta
`split_count=13, scheduled_count=1` (prima solo `tx_count=104`), e la riassegnazione Spesa→Figli
sposta tutti e 13 gli split (12 → 25) senza creare orfani.

---

## ✅ FATTO — 2026-07-27 · Performance (P1, P2, P3)

⚠️ **Lezione importante: le stime dell'audit erano sbagliate di un ordine di grandezza.**
Prevedevano "10× sulla dashboard" partendo da 5000 transazioni. Il DB reale ne ha ~1200 e pesa
1 MB: **ci sta tutto nella cache SQLite da 16 MB**, quindi una scansione completa costa
microsecondi e l'I/O che avrebbe giustificato il 10× non avviene mai. Misurato (best of 10,
su copia del DB reale):

| | prima | dopo | Δ |
|---|---|---|---|
| `getPortfolio` | 0,94 ms | 0,77 ms | −19% |
| `getMonthlyChartData` | 0,67 ms | 0,57 ms | −15% |
| `getDashboardStats` | 0,93 ms | 0,83 ms | −11% |
| `getBudgetYear` | 2,27 ms | 2,08 ms | −8% |
| `getTransactions{mese}` | 1,96 ms | 1,80 ms | −8% |
| **dashboard completa (5 query)** | **5,09 ms** | **4,6 ms** | **−10%** |

Le modifiche restano valide perché eliminano lavoro che **cresce col volume dei dati** (le
subquery correlate/materializzate erano O(righe totali), ora sono O(righe restituite)), ma il
guadagno percepibile oggi è vicino a zero. Da non usare come precedente per stime future non misurate.

- ✅ **P1** — 11 `strftime('%Y'|'%m', colonna)` nel WHERE sostituiti con l'intervallo semiaperto
  `date >= ? AND date < ?` (helper `yearStart()`/`yearEnd()`). Le date sono TEXT ISO, quindi il
  confronto lessicografico è equivalente ma resta sargable. Toccati `getTransactions` (filtro
  mese/anno), `getBudgetYear`, `generateBudget`, `getDashboardStats`, `getMonthlyChartData`,
  `getCategoryChartData`. Gli `strftime` in SELECT/GROUP BY sono stati **lasciati**: lì non
  bloccano nulla.
- ✅ **P2** — le 9 subquery correlate di `getPortfolio` sostituite da una derived table
  `GROUP BY portfolio_id` con `SUM(CASE WHEN type=…)`: `portfolio_transactions` viene letta una
  volta sola invece di 9×N. `COALESCE` fuori dal LEFT JOIN per mantenere 0 (non NULL) sulle
  posizioni senza movimenti; `MIN(CASE…)` mantiene NULL su `first_buy_date` come prima.
- ✅ **P3** — le due derived table con `GROUP BY` di `getTransactions` (`sp`, `pt`) trasformate in
  subquery **correlate**. Quelle non erano appiattibili, quindi SQLite materializzava tutti gli
  split e tutti i movimenti di portafoglio anche per una pagina da 40 righe.
  `NULLIF(COUNT(*),0)` su `split_count` per riprodurre esattamente il NULL che dava il LEFT JOIN.
- ✅ **Indici**: aggiunti `idx_porttx_portfolio(portfolio_id, type)` (la colonna di join di
  `getPortfolio` non era indicizzata) e `idx_splits_cat(category_id)`. Rimosso
  `idx_tx_account`: ridondante perché `account_id` è la colonna più a sinistra di
  `idx_tx_account_date`, quindi si pagava solo la manutenzione in scrittura.
- ✅ **`PRAGMA optimize` in `close()`**, in try/catch che non può impedire la chiusura.

**Non fatto, e perché:**
- ❌ **indice parziale `idx_tx_unreconciled`** — provato e **rimosso**: PEGGIORAVA
  (`getTransactions{reconciled=0}` da 0,29 a 0,37 ms, stabile su 3 run). Su questa mole il planner
  sceglieva il percorso indice→tabella, più costoso della scansione diretta. C'è un
  `DROP INDEX IF EXISTS` per toglierlo dai DB che l'hanno già preso.
- ⏳ **`idx_sched_active`, `idx_note_tags_tag`** — l'audit li dava da rimuovere. Verificato che
  non sono usati da nessuna query (il filtro `is_active` è in Java, `note_tags` non è mai filtrata
  per `tag_id`), ma sono su tabelle minuscole: rimuoverli non misura niente. Lasciati.
- 🗑️ **P4 — ARCHIVIATO, nessun intervento (decisione utente, 2026-07-27).** L'audit lo dava per
  "cresce senza limite perché buy/sell/cedole inseriscono sempre `reconciled=0`". Misurato sul DB
  reale: **0 transazioni non conciliate** su 1197, e la query costa **0,27 ms** — la più veloce
  del benchmark. Il codice le inserisce davvero con `reconciled=0`, ma vengono conciliate: non
  esiste arretrato. Aggiungere un `limit` non sarebbe nemmeno banale, perché la notice usa la
  lista in due modi (mostra le prime 4 righe ma conta `list.length` per il titolo e per
  "+ altre N…"): servirebbe un endpoint di conteggio separato, cioè più codice e più superficie
  per un problema inesistente. **Riaprire solo se le non conciliate superano qualche centinaio.**

**Verifica di non-regressione:** confronto dell'output di **20 query** (dashboard, budget ×2,
grafici categoria ×3, portafoglio, conti, `getTransactions` con 8 filtri diversi) fra il codice
pre-modifiche e quello post, su copia del DB reale, con JSON canonicalizzato a chiavi ordinate
(`Map.of()` ha iterazione randomizzata per esecuzione, quindi il confronto testuale ingenuo dà
falsi positivi). Risultato: **1.048.798 byte identici**. Verificata anche la migrazione degli
indici su un DB che aveva già i vecchi.

---

## 📌 Nota — crescita del file DB (falso allarme, 2026-07-27)

Il DB è passato da ~440 KB (backup delle 07:41) a ~1050 KB in giornata, e il VACUUM **non** lo
riduceva. Diagnosi: nessuna corruzione (`integrity_check = ok`), nessun duplicato di massa
(3 soli gruppi duplicati in tutto il DB, tutti vecchi), `freelist_count = 0` cioè zero spazio
sprecato. La causa è **una singola nota** (`notes.id=11`, creata alle 15:34) che contiene uno
screenshot incollato: l'editor Quill incorpora le immagini come **data URI base64 nel campo
`content`**, quindi quella nota da sola pesa **612 KB su 719 KB di dati totali** — le 1197
transazioni ne occupano 80.

Il VACUUM non riduce perché non c'è niente da recuperare: è contenuto reale.

**Se un giorno il DB dovesse gonfiarsi di nuovo, guardare prima qui:**
```sql
SELECT id, title, LENGTH(CAST(content AS BLOB)) len FROM notes ORDER BY len DESC LIMIT 5;
```
**Possibile miglioramento (feature, non bug):** salvare le immagini delle note come file su disco
— come già si fa per gli allegati delle transazioni — invece che dentro `content`. Il DB sta su
OneDrive e viene risincronizzato per intero a ogni modifica, quindi ogni screenshot incollato
rallenta la sync con Android e gonfia ogni backup.

⚠️ Nota metodologica per il futuro: `getDashboardStats(anno).transaction_count` conta le
transazioni **di quell'anno**, non le righe della tabella. Confrontarlo con `COUNT(*)` porta a
concludere erroneamente che i dati siano raddoppiati.

---

## ✅ FATTO — 2026-07-27 · Chiusura ordinata (R1, R2)

Entrambi i difetti stavano nello stesso percorso e sono stati risolti insieme.

### ✅ R2 · "Esci" dal tray saltava il backup automatico — `TrayManager.java:doExit`
`doExit` faceva `frame.dispose()` + `System.exit(0)`. `dispose()` emette `windowClosed`, **non**
`windowClosing`: tutta la logica di chiusura ordinata (backup automatico, `clearSessionState`,
`db.close()`) vive solo in `windowClosing` e non partiva mai. Scenario reale: chiudi con la X
(backup fatto, app al tray), continui a inserire transazioni dal browser del telefono, poi esci
dal tray → **nessun backup delle modifiche successive**, pur avendo "backup alla chiusura" attivo.

Fix: `doExit` invia un `WINDOW_CLOSING` vero con `frame.dispatchEvent(...)`. `disable()` resta
prima, perché azzera `trayActive` e fa quindi prendere a `windowClosing` il ramo di uscita
completa invece di quello "nascondi nel tray".

### ✅ R1 · Backup del DB eseguito sull'EDT — `MainWindow.java:windowClosing`
Il backup è un `Files.copy` dell'intero file `.db`, e girava sull'Event Dispatch Thread: la
finestra si congelava per tutta la copia (secondi su un DB di decine di MB, minuti se OneDrive
deve idratare un file cloud-only, fino al timeout SMB se la cartella di backup è su una share
irraggiungibile). Windows la marcava "Non risponde".

Fix: la finestra viene nascosta **subito** (feedback immediato), poi backup e `db.close()` girano
su un thread `shutdown-backup` **non-daemon** — necessario perché sull'uscita la JVM deve
aspettare che la copia finisca, altrimenti si otterrebbe un `.bak` troncato. Il `System.exit`
finale viene rimandato sull'EDT al termine, insieme al dispose di JCEF.

Aggiunta una **guardia anti-rientranza** (`AtomicBoolean closing`) sul solo lavoro di sfondo:
una seconda chiusura non lancia un secondo backup in parallelo né una seconda `System.exit`.
Il nascondimento della finestra resta invece **sempre** eseguito — mettere la guardia più in alto
avrebbe introdotto il bug "richiudo dal tray mentre il backup è in corso e la finestra non si
nasconde". La guardia si riarma quando si va al tray, dove l'app resta viva e richiudibile.

Aggiornato anche il commento dello shutdown hook in `App.java`: diceva che i due percorsi di
uscita non chiudevano il DB, cosa non più vera. Resta come rete di sicurezza per i percorsi che
non passano da `windowClosing` (errore fatale, terminazione dal sistema); `close()` è idempotente
e `synchronized`, quindi la doppia chiamata è innocua.

Verificato riproducendo la logica di chiusura su 5 scenari: chiusura con tray attivo (nasconde),
con tray non attivo (esce), uscita dal tray dopo `disable()`, doppia chiusura durante un backup
in corso (la finestra si nasconde comunque, il secondo backup viene saltato) e riarmo della
guardia dopo il ritorno al tray. Backup reale provato su copia: 1,08 MB in 11 ms, sidecar incluso.

⚠️ **Effetto collaterale voluto:** all'uscita la finestra sparisce subito ma il processo resta
vivo finché il backup non finisce. Su una cartella di backup lenta o irraggiungibile questo può
durare; se in quel momento si prova a riavviare l'app, `SingleInstance` la considera già in
esecuzione. È comunque preferibile alla finestra congelata di prima.

---

## ✅ FATTO — 2026-07-27 · R3 · Swing fuori dall'EDT

`setSetting("autostart.enabled", …)` chiamava `TrayManager.enable()`/`disable()` direttamente dal
thread di dispatch. `enable()` costruisce un `JPopupMenu`, un `JDialog`, `JLabel`/`JPanel` e
registra l'icona nella `SystemTray`: è tutto codice Swing, che va eseguito sull'EDT. Nello
**stesso** `switch`, le altre cinque operazioni su `window` (minimize, maximize, close,
setWindowPos, setWindowBounds) erano già correttamente avvolte in `invokeLater` — l'incoerenza è
la prova che si trattava di una dimenticanza, non di una scelta.

Il caso certo non è teorico: attivando "Avvio automatico" **dal browser del telefono** la
richiesta arriva dal WebServer, che usa un virtual thread per richiesta, quindi l'intera gerarchia
del menu tray veniva costruita fuori dall'EDT. Sintomi tipici, non deterministici e scollegati
dalla causa: menu tray che non si apre più al click destro, NPE interne a `BoxLayout`/`JPopupMenu`
in `app.log`, icona fantasma che resta dopo l'uscita.

Fix: `enable()`/`disable()` dentro `SwingUtilities.invokeLater`. `registerAutostart()`/
`unregisterAutostart()` restano **fuori** dall'EDT di proposito: scrivono la chiave di registro
con `ProcessBuilder` e non sono codice Swing — metterle sull'EDT bloccherebbe il thread grafico
per lo spawn di `reg.exe` (~50-150 ms).

Verificati anche gli altri due chiamanti, entrambi **già corretti**, nessuna modifica necessaria:
`TrayManager.doExit` parte da un `MouseListener` (quindi è già sull'EDT per costruzione) e
`App.java:269` gira dentro l'`invokeAndWait` di avvio.

---

## ✅ FATTO — 2026-07-28 · Alti (R4, R5, X1)

### ✅ R4 · `winPickFolder`: deadlock permanente — `Bridge.java:winPickFolder`
stderr scollegato e **mai letto**: con un errore lungo (assembly WinForms mancante, criteri di
esecuzione) powershell riempiva il buffer della pipe, si bloccava sulla scrittura e non usciva
mai → `waitFor()` eterno sul virtual thread + un processo zombie a ogni tentativo.

Fix: `redirectErrorStream(true)` — così l'unica `readAllBytes()` svuota entrambi i flussi — stream
chiuso in try-with-resources, `waitFor(5, MINUTES)` con `destroyForcibly()` allo scadere, e
`exitValue() != 0` trattato come "annullato" invece che come path valido. Il path si prende come
**ultima riga non vuota**, dato che ora l'output può contenere righe di errore prima di esso.

Verificato: il difetto **riprodotto** sul codice vecchio (stderr da 200 KB → ancora bloccato dopo
45 s, 3 powershell zombie lasciati in giro); sul codice nuovo lo stesso input torna in 719 ms col
path corretto. Provati anche successo, exit non-zero → `null` e annullamento → `null`.

### ✅ R5 · `db.path` riscritto e DB vuoto — `App.java:run`, `Bridge.java:"reloadDb"`
All'avvio, cartella del DB non raggiungibile (OneDrive non ancora montato con autostart) →
l'app ripiegava sul default **riscrivendo `db.path`**: apriva un database vuoto e per giunta
perdeva il percorso di quello vero, che l'utente doveva ritrovare a mano.

Fix, avvio: si **attende** fino a 30 s che la cartella compaia (`waitForDbFolder`) — è esattamente
il ritardo tipico di OneDrive all'accesso a Windows. Se non arriva, messaggio esplicito
(`reportDbFolderMissing`) e uscita, **senza toccare `db.path`**: al riavvio successivo, con
OneDrive pronto, l'app riparte da sola senza riconfigurazione.

Fix, `reloadDb`: invertito l'ordine. Prima si verifica la cartella, poi `reconnect`, e `db.path`
si persiste **solo se la riconnessione è riuscita**. Prima il path veniva salvato per primo,
quindi un `reconnect` fallito lasciava in `settings.properties` un percorso inutilizzabile.
I due chiamanti JS (`settings.js:1753`, onboarding in `init.js:527`) avevano già `try/catch` con
feedback a video: l'eccezione arriva all'utente senza modifiche al frontend.

### ✅ X1 · XSS persistente — `utils.js`, `init.js`, `transactions.js`
Nessun escaping e `innerHTML` su `description`. L'iniezione via LAN non è più nel modello di
minaccia (vedi 🔕 S1/S3/S4), ma restava raggiungibile da una riga di `pending.jsonl` scritta da
Android. La catena verso l'esecuzione di file era comunque già tagliata da ✅ S2.

Fix: helper condiviso `esc()` in `utils.js` (caricato per primo, quindi visibile ovunque), che
copre anche `"` e `'` perché diversi punti interpolano dentro attributi — lì `& < >` da soli non
bastano. Applicato alle **4** notifiche di `init.js` (telefono, scadute, oggi, da verificare) e
alla riga della tabella transazioni. Nella riga sono stati coperti anche i campi che l'audit non
citava ma che hanno la stessa esposizione: `attachment_path` (dentro `title`), nomi conto e conto
destinazione, nome e colore dei tag, `splits_summary`, nomi categoria e `filterCatLabel`
(che viene da `textContent`, già decodificato, e tornava dentro `innerHTML`).
Il `const esc` locale di `analytics.js:546` resta: è dentro una funzione, quindi non collide.

Verificato con un parser HTML reale su 5 payload (`<img onerror>`, `<script>`, breakout da
attributo con `"` e con `'`, più un testo legittimo con `&` e `<b>`): tutti resi come **testo
letterale**, 0 elementi iniettati, 0 attributi extra, e il testo legittimo resta leggibile.

---

## ✅ FATTO — 2026-07-28 · WebServer: catch e logging in entrambi i rami

**Ramo `/` (file statici): nessun catch.** Un'eccezione (file cancellato fra `isRegularFile` e
`readAllBytes`, cartella `web/` su OneDrive non idratata, permessi, URI malformato) risaliva al
gestore di default di `HttpServer`, che **chiude la connessione senza risposta**: dal telefono si
vedeva una pagina bianca e in `app.log` non restava nulla da cui capire perché.

**Ramo `/bridge`: catch presente ma muto.** Le richieste dalla LAN non passano dal catch centrale
di `Bridge.onQuery` (quello copre solo il percorso JCEF), quindi ogni errore di un'operazione
fatta dal browser del telefono spariva senza traccia.

Fix: `try/catch/finally` su tutto il ramo `/` con risposta **500** e log; `System.err` + stack
trace anche nel ramo `/bridge`; `ex.close()` in `finally` in entrambi (rilascia la connessione
anche quando `sendResponseHeaders` non è stato raggiunto); invio dell'errore a sua volta protetto,
per il client sparito a metà risposta. Su NPE il messaggio è `null`, quindi si manda il nome
della classe invece di un "Errore interno" muto — stessa convenzione già usata in `onQuery`.

I messaggi contengono "fallito", quindi vengono **contati dal badge errori** (`appLogErrors`
riconosce `low.contains("fallit")`): verificato su un log finto con i 5 eventi dei due fix, ognuno
contato **una sola volta**, senza doppioni dagli stacktrace e senza contare le righe informative
(`[STARTUP]`, `[SLOW QUERY]`, `WebServer avviato`).

Collaudato avviando due `HttpServer` reali, vecchia e nuova logica a confronto:

| | vecchio | nuovo |
|---|---|---|
| errore in lettura | `IOException` lato client, **0 righe di log** | **HTTP 500** + riga di log |
| `/` normale | 200, 13 byte | 200, 13 byte |
| file da 1 MB | 200, 1.048.576 byte | 200, 1.048.576 byte |
| 404 e traversal | 404 | 404 |

Le ultime tre righe servivano a escludere la regressione più probabile del fix: `ex.close()` al
posto di `getResponseBody().close()` **non tronca** il corpo, nemmeno su 1 MB.

---

## ✅ FATTO — 2026-07-28 · Backup: i due difetti silenziosi

Entrambi riguardavano il backup e avevano lo stesso profilo: **fallivano senza dirlo**, e te ne
accorgevi il giorno in cui il backup ti serviva davvero.

### ✅ Il purge del log non ricalcolava `startOffset` — `DbLogger.java`
`purgeLogBefore` e `purgeSystemEntries` riscrivono il log con `TRUNCATE_EXISTING` ma non
toccavano `startOffset`. Restava al valore di prima (es. 34.890) mentre il file scendeva a poche
centinaia di byte → `getSessionEntries()` usciva subito su `size <= startOffset` e tornava sempre
vuoto → `hasChanges()` permanentemente `false` → **il backup automatico alla chiusura non partiva
più**, senza alcun messaggio. *(L'audit lo chiamava `hasModifications()`: quello è il metodo di
`Database` che delega a `hasChanges()`.)*

Fix: nuovo `shiftSessionOffset(removed)`, che **scala** l'offset dei byte eliminati che lo
precedevano, con `removedBytesBeforeOffset()` a calcolarli sulle righe originali prima della
riscrittura. Aggiunta anche una rete di sicurezza in `getSessionEntries()` (`size < startOffset`
→ riaggancio), che copre il log accorciato da fuori, es. OneDrive che riporta una versione più
vecchia da un altro PC.

⚠️ **Nota di metodo:** il primo tentativo era `min(startOffset, size)` e *sembrava* corretto, ma
il test l'ha smentito — restituiva ancora 0 modifiche. Il purge elimina proprio lo storico che
stava **prima** dell'offset, quindi portarlo a `size` lo mette in fondo al file e nasconde le
righe della sessione, che dopo il taglio si trovano all'inizio. Serve sottrarre, non limitare.

Verificato riproducendo lo scenario (500 righe di storico + 3 modifiche di sessione + purge):

| scenario | vecchio | nuovo |
|---|---|---|
| purge dello storico (caso normale) | 3 → **0**, backup **non parte** | 3 → **3**, backup parte |
| purge che taglia dentro la sessione | — | 0, e **è corretto**: quelle righe non esistono più |
| purge righe di sistema | — | la modifica di sessione resta visibile |

### ✅ `backup()` non escludeva gli altri thread — `Database.java:backup`
Era l'unico dei due a non avere protezione: `restoreBackup` è `synchronized`, `backup()` no.
Con `journal=DELETE` una transazione in corso tiene un `<db>-journal` accanto al database e alcune
pagine non sono ancora nel `.db`.

Fix: `backup()` è ora `synchronized` (esclude le scritture applicative, che passano tutte da
`inTx`, anch'esso synchronized), sospende l'auto-release per la durata della copia ripristinandolo
nel `finally` come fanno `inTx`/`withExclusiveAccess`, e **verifica il journal** prima di copiare:
se c'è, forza un checkpoint pulito con `close()` (punto unico di chiusura) e riprova per ~1 s —
`close()` non chiude se `activeQueries > 0`, e sono query da millisecondi, quindi il backup di
chiusura non deve saltare per così poco. Se dopo l'attesa il journal è ancora lì, **fallisce in
modo rumoroso** invece di scrivere un `.bak` incoerente. I monitor Java sono rientranti, quindi
`backup() → close()/setAutoRelease()` non può auto-bloccarsi.

Collaudato **su copia** del DB reale (1201 transazioni, `integrity=ok`), originale mai toccato:
backup normale → 432 KB, `integrity=ok`, 1201 transazioni (nessuna regressione); con transazione
aperta → il vecchio copiava comunque, il nuovo rifiuta.

⚠️ **Precisazione sul danno:** il `.bak` prodotto dal codice vecchio risulta `integrity=ok`, non
"corrotto" in senso SQLite — l'audit era impreciso su questo. Il difetto reale è che è uno
**snapshot incoerente**: contiene lo stato *senza* la transazione in volo, e il `-journal` che la
risolverebbe non viene copiato accanto. Nel caso peggiore (crash a metà commit) il `.db` è già
modificato ma manca il journal che lo riporterebbe indietro. Il fix elimina la finestra invece di
scommetterci.

---

## ✅ FATTO — 2026-07-28 · Concorrenza e UI bloccata (4)

### ✅ `autoReleaseEnabled`: salva/ripristina → contatore — `Database.java`
Le 4 sospensioni (`inTx`, `backup`, `restoreBackup`, `withExclusiveAccess`) facevano
"salva il valore precedente e ripristinalo". Non è rientrante: la sospensione interna salvava il
`false` scritto da quella esterna e alla fine lo ripristinava, lasciando l'auto-release **spento
per il resto della sessione** → lock su OneDrive mai più rilasciato, cioè esattamente ciò che
l'auto-release esiste per evitare.

Fix: **tre variabili al posto di una**, per separare due concetti che prima si sovrascrivevano:
`autoReleaseWanted` (preferenza finestra foreground/background, da `setAutoRelease`),
`autoReleaseSuspend` (quante sospensioni in corso, da `suspendAutoRelease`/`resumeAutoRelease`)
e `autoReleaseEnabled` = `wanted && suspend == 0`, che è ciò che legge il timer.
In `inTx` anche `beginQuery()`/`setAutoCommit(false)` sono finiti **dentro** il try: se lanciavano,
la sospensione restava appesa per sempre — la stessa perdita, da un'altra strada.

Verificato confrontando i due schemi sugli scenari che contano:

| scenario | vecchio | nuovo |
|---|---|---|
| sospensioni annidate, ordine normale | true ✓ | true ✓ |
| sospensioni **sovrapposte** (thread diversi) | **false** ✗ lock mai rilasciato | true ✓ |
| finestra al tray **durante** un backup | **false** ✗ preferenza persa | true ✓ |
| resume senza suspend (finally difensivo) | — | suspend=0, nessun negativo ✓ |
| foreground + sospensione | — | false ✓ (non accende nulla) |

Il secondo e il terzo sono i casi reali: il terzo in particolare non era risolvibile con una sola
variabile, perché la preferenza dell'utente e lo stato temporaneo condividevano lo stesso campo.

### ✅ `Desktop.open/browse` sul thread di dispatch — `Bridge.java` (7 punti)
Bloccano finché Windows non ha risolto l'associazione e avviato il programma: 2-4 s tipici, molti
di più su OneDrive de-idratato. Nuovo helper `openAsync(what, action)` che esegue su virtual
thread e logga il fallimento in `app.log`. Applicato a `openSettingsFile`, `openAttachment`,
`openAppLog`, `openLogFolder`, `openUrl`, `openDataDir`, `exportHtmlReport`.

⚠️ **Le validazioni restano sincrone**, di proposito: in `openAttachment` i controlli (path
confinato + file esistente) girano prima e continuano a tornare come errore al JS; in `openUrl`
l'`URI` è costruito sul dispatch, così un URL malformato resta un errore visibile; in
`exportHtmlReport` la `writeString` resta sincrona. Va in asincrono **solo** la parte lenta.

### ✅ `reopen()` sull'EDT — `MainWindow.java` ×2, `App.java` ×2
Aprire un file OneDrive de-idratato può bloccare per secondi: sull'EDT congelava tutta la UI
Swing, tray compreso — cioè proprio il menu da cui l'utente aveva appena cliccato.

- `bringToFront`: la finestra ora si mostra **subito** (feedback immediato) e `reopen()` gira su
  un virtual thread; `onTrayRestore()` torna sull'EDT al termine, così il JS parte quando il DB
  è davvero pronto a rispondere.
- `reload`: idem, con `browser.reload()` rimandato sull'EDT — altrimenti la pagina ripartirebbe
  facendo query su una connessione non ancora aperta.
- `App`: `openDbAction` **e** `closeDbAction` del tray (entrambe partono da un listener del menu,
  quindi dall'EDT). `closeManual()` non era in lista ma ha lo stesso profilo: chiude il file e fa
  `PRAGMA optimize`.

`Bridge.dbOpen` non è stato toccato: gira già fuori dall'EDT.

### ✅ `fetchOnlinePrice` senza timeout di risposta — `Bridge.java:httpGet`
`connectTimeout(15s)` copre **solo** l'handshake: un server che accetta la connessione e poi non
risponde (portale captive del wifi, sito in manutenzione, rete che sparisce a metà) teneva
`send()` bloccata per sempre → la Promise JS non si risolveva mai, rotella all'infinito senza
errore né possibilità di riprovare. Aggiunto `.timeout(Duration.ofSeconds(20))` sulla richiesta.
`doFetchOnlinePrice` fa 2 `httpGet` in sequenza, quindi il caso peggiore è 40 s: limitato e
soprattutto **terminante**.

Verificato con un server che accetta e non risponde: richiesta normale invariata (75 ms), server
muto interrotto con `HttpTimeoutException` dopo il timeout (il catch esistente la trasforma in
`failure(500)`, quindi la Promise si risolve), mentre senza timeout resta appesa oltre i 6 s.

---

## ✅ FATTO — 2026-07-28 · Integrità dati: portafoglio e pianificate (4)

Collaudati tutti su **copia** del DB reale (1201 transazioni, 19 posizioni), originale mai toccato.

### ✅ Divisione per zero in `buyStock` — `Database.java`
`qty` finiva a denominatore nel calcolo del prezzo medio, su **entrambi** i rami (posizione
esistente e nuova). ⚠️ Misurato: con `qty=0` il risultato è **`Infinity`**, non `NaN` come diceva
l'audit — in entrambi i casi il valore resta nel DB e da lì ogni P&L, valorizzazione e totale del
portafoglio diventa inutilizzabile, perché non c'è nulla che lo ricalcoli. Era validato solo lato
JS, quindi bastava una chiamata dal browser del telefono per passarci.

Fix: validazione server su `qty > 0` e `price > 0`. Aggiunta anche in **`sellStock`**, che non era
in lista ma aveva il buco speculare: controllava solo il limite superiore, quindi una `qty`
negativa avrebbe *aumentato* la posizione (`quantity - (-n)`), creando titoli dal nulla.

### ✅ `updateTransaction` lasciava `avg_price` vecchio — `Database.java`
L'UPDATE allinea `portfolio_transactions.price` solo per `coupon`/`expense`: cambiare l'importo di
un **acquisto/vendita** lasciava storico e `portfolio.avg_price` fermi al valore vecchio → costo
di carico sbagliato su cui si basa tutto il P&L successivo. Verificato sul DB reale: l'UPDATE
tocca **0 righe** e `avg_price` resta invariato, senza alcun segnale.

Fix: guardia speculare a quella di ✅ D3 sulla delete, e **graduata come quella**: blocca solo se
cambia davvero l'importo (>0,005). Data, descrizione, colore, tag, categoria e riconciliazione
restano modificabili — non toccano `quantity`/`avg_price`.

### ✅ `deletePortfolioItem` — ⚠️ il finding era mal posto, corretto il vero difetto
L'audit lo dava come "lascia orfane le transazioni di acquisto e le commissioni", implicando che
andassero cancellate. **È il contrario.** Verificato sul DB reale che cosa sono quelle transazioni:
`transfer` per 18.211,98 € di acquisti e 17.728,00 € di vendite, `income` per 1.413,10 € di cedole,
`expense` per 81,86 € di commissioni — cioè **movimenti di denaro veri fra i conti**. Cancellarle
cambierebbe i saldi e farebbe sparire dai report entrate e uscite realmente avvenute. Il dialogo di
conferma infatti promette già *"Le transazioni collegate resteranno"*: il comportamento è voluto.

Il difetto reale era la **tracciabilità**: l'operazione non lasciava scritto da nessuna parte quante
transazioni restavano scollegate, quindi a posteriori non si ritrovavano. Fix: conteggio e importi
per tipo calcolati *prima* della DELETE (dopo la cascata il legame non è più ricostruibile),
scritti nel log e restituiti al frontend; l'intero metodo passa in `inTx` con `touchSyncMeta()`.
Lato UI la conferma ora dice **quante** transazioni resteranno e perché, invece di una frase
generica, e il toast finale riporta il numero.

### ✅ Registrazione pianificata non atomica — `Database.java`, `Bridge.java`, JS
Il frontend faceva due chiamate separate (`addTransaction`, poi `advanceScheduled`): se la seconda
falliva, la transazione era già committata ma la pianificata restava alla stessa data → al
tentativo successivo veniva registrata una **seconda volta**.

Fix: nuovo `addTransactionAndAdvanceScheduled()` che fa entrambe in **un'unica transazione SQL**.
Poiché `inTx` non è rientrante, il corpo di `addTransaction` è stato estratto in
`insertTransactionNoTx()` e `advanceScheduled` diviso in `planAdvance()` (sola lettura + calcolo
date) e `applyAdvance()` (scritture), riusabili dentro la transazione altrui. `advanceScheduled`
resta invariata per i suoi chiamanti esistenti. Lato JS: nuovo `api.addTransactionForScheduled` e
parametro `saveOverride` in `showTxModal`.

⚠️ Corretti **due** punti, non uno: oltre a `dashboard.js:_dashExecSched` c'era lo stesso schema in
`scheduled.js:registerSched` (stesso bug dalla pagina Pianificate). `skipSched` resta su
`advanceScheduled` diretta, correttamente: non crea transazioni, non c'è nulla da rendere atomico.

Verificato simulando il fallimento a metà: rollback → **0 transazioni registrate** e `start_date`
invariata, cioè o valgono entrambe o nessuna.

---

## ✅ FATTO — 2026-07-28 · `excluded_from_budget` sulle transazioni suddivise

In una transazione suddivisa `category_id` è NULL, quindi il predicato
`COALESCE((SELECT excluded_from_budget FROM categories WHERE id=t.category_id),0)=0` era
**sempre vero** e l'intero importo entrava nei totali anche con tutte le voci su categorie
escluse. È la causa della divergenza "dashboard vs torta": `getCategoryChartData` e
`getBudgetYear` gestivano già gli split correttamente (righe non suddivise + righe split via
`UNION ALL`), le somme complessive no.

Corrette **4** query, allineandole a quello schema: `getDashboardStats`, `getStatsByDateRange`,
`getMonthlyChartData` e — non citata dall'audit ma con lo stesso identico difetto —
`getMonthlyBalance`, la controparte del grafico mensile in Analytics.

In `getDashboardStats` il `transaction_count` è stato estratto in una subquery separata: conta le
**transazioni**, non le righe, quindi sommarlo dentro la CTE le avrebbe moltiplicate per il numero
di split. Una transazione suddivisa resta contata anche se tutte le sue voci sono escluse — è un
conteggio di righe registrate, non di importi a budget.

⚠️ **Bug reale ma oggi latente**, verificato sul DB reale prima di intervenire: c'è **1** categoria
esclusa (`Capital Gain`) e **0** righe split che vi puntano, quindi al momento dashboard e torta
coincidono già. Ma tutte e 28 le transazioni suddivise hanno `category_id` NULL: basta spostare
una sola voce su una categoria esclusa perché l'intero importo rientri nei totali. Il fix è
preventivo.

Verificato su copia del DB reale, in due passaggi:
- **non-regressione**: as-is, vecchio e nuovo danno numeri **identici** su 2026 (47.932,20 /
  43.623,36 / 523 transazioni) e 2025 (226.213,82 / 233.548,23 / 676);
- **il bug**: spostando un singolo split da 5,70 € su `Capital Gain`, il vecchio resta a
  43.623,36 (ignora l'esclusione) mentre il nuovo scende a 43.617,66, **coincidendo con la torta**
  che era già corretta.

Restano fuori perimetro le occorrenze che raggruppano **per categoria** (`getForecastEngine`,
`archivePreview`): lì una transazione suddivisa finisce in "Senza categoria" invece di gonfiare
una categoria esclusa — comportamento diverso e preesistente, non questo finding.

---

## ✅ FATTO — 2026-07-28 · `DbLogger` thread-safe

`DbLogger` è usata da **quattro** famiglie di thread — UI di JCEF, virtual thread del WebServer,
EDT Swing (tray/iconify/chiusura), thread del Timer di auto-release — senza alcun lock. Ora tutti
i metodi che toccano `logFile`/`startOffset` sono `synchronized` sull'istanza.

⚠️ **Il finding era mal caratterizzato, verificato sperimentalmente.** L'audit parlava di "righe
intrecciate → operazioni fantasma nel sidecar". Provato con 4 e 8 thread per 1.200 e 3.200 righe:
**zero righe rotte anche senza lock**, perché su Windows una `Files.writeString` in APPEND è una
singola write atomica a livello di OS. Quel sintomo non è riproducibile.

Il difetto **reale** è lo stato condiviso, ed è più grave: `getSessionEntries()` fa
`Files.size()` e poi `readFully()` sulla finestra `[startOffset, size)`. Se un purge accorcia il
file fra le due chiamate, la lettura va oltre la fine del file. Riprodotto in modo deterministico
(purge concorrente a letture e append): **3 run su 3 falliscono con `EOFException`** senza lock,
**0 errori su 3 run** con il lock.

Perché conta davvero: nel codice vero quell'eccezione è inghiottita da
`catch (IOException e) { return List.of(); }`, quindi `hasChanges()` risponde "nessuna modifica"
e **il backup automatico non parte** — lo stesso fallimento silenzioso già chiuso lato
`startOffset`, raggiunto per un'altra strada.

Nessun rischio di deadlock: `DbLogger` non richiama mai `Database`, quindi l'ordine dei lock è
strettamente unidirezionale (`Database` → `DbLogger`).

---

## ⏳ DA FARE — medi

- **Operazioni multi-scrittura senza `inTx`**: `setBudgetBulk` (`:2331`, 12 commit → mezzo anno aggiornato se crasha), `saveNote` (`:1956`, la nota **perde tutti i tag**), `copyBudgetFromYear`, `deleteBudgetYear`, `addScheduled`/`updateScheduled`, `saveForecast`, `seedDefaultData`. 🗑️ **`generateBudget` escluso** (vedi sotto).
- 🗑️ **`generateBudget` senza `inTx` — ARCHIVIATO, nessun intervento (decisione utente, 2026-07-28).** ~600 INSERT = ~600 commit con journal create/fsync/delete su OneDrive: sono i secondi del pulsante "Genera budget". La lentezza è nota e accettata, l'operazione è manuale, rara e ripetibile (se va a metà si rigenera). **Riaprire solo se** diventa abbastanza lenta da dare fastidio o se si scopre che un'interruzione a metà lascia un budget incoerente e non evidente.
- 🗑️ **`touchSyncMeta` — ARCHIVIATO, nessun intervento (decisione utente, 2026-07-28).** Restano veri i due difetti — 3 statement di cui un DDL a ogni scrittura (spuntare "conciliata" = 4 commit invece di 1) e marcatore assente su categorie, tag, pianificate, budget e portafoglio — ma **Android non legge il portafoglio titoli**, che era la motivazione principale del finding: l'app mobile mostra conti e transazioni, non le posizioni. Il costo dei commit in più non è percepibile. **Riaprire solo se** l'app Android verrà estesa a leggere portafoglio/budget, o se compare una divergenza di sync attribuibile al marcatore mancante.
- **Nessuna validazione "somma split = importo"** (`saveSplits:2080`): la tolleranza JS è `> 0.01`, quindi 3×33,33 su 100 € passa → dashboard 100,00 vs torta 99,99, per sempre.
- ✅ ~~**`excluded_from_budget` ignorato sulle transazioni suddivise**~~ — **RISOLTO 2026-07-28**, vedi § dedicato.
- **`importPending` non ri-marca `applied`** (il javadoc promette il contrario): Android continua a scalare l'importo dal saldo mostrato **per sempre** e la riga non è mai eleggibile per la pulizia a 30 giorni. ⚠️ Distinto da ✅ D1 e **non** risolto da esso: riguarda le righe già presenti in `imported_pending`, che il ramo `!applied && !alreadyImported` salta del tutto.
- ✅ ~~**`DbLogger.log()` non thread-safe**~~ — **RISOLTO 2026-07-28**, vedi § dedicato. ⚠️ Il rischio vero non erano le righe intrecciate (l'append è atomico per write) ma lo **stato condiviso**.
- ✅ ~~**Il purge del log non ricalcola `startOffset`**~~ — **RISOLTO 2026-07-28**, vedi § dedicato.
- **`getForecastDetail`** (`:4141`): N+1 (una query per categoria di previsione). ⚠️ Parzialmente attenuato da `5c42ed4`, che ha aggiunto `idx_splits_cat`: le 50 scansioni complete sono ora 50 lookup indicizzati. Resta l'N+1 in sé.
- ✅ ~~**`backup()` non esclude gli altri thread**~~ — **RISOLTO 2026-07-28**, vedi § dedicato (`backup()` ora `synchronized` + guardia sul journal).
- ✅ ~~**Salva/ripristina di `autoReleaseEnabled` non rientrante**~~ — **RISOLTO 2026-07-28** (contatore `autoReleaseSuspend` + preferenza separata), vedi § dedicato.
- ✅ ~~**`fetchOnlinePrice` senza timeout di risposta**~~ — **RISOLTO 2026-07-28**, vedi § dedicato.
- ✅ ~~**`Desktop.open/browse` sul thread di dispatch** (7 punti)~~ — **RISOLTO 2026-07-28** (helper `openAsync`), vedi § dedicato.
- ✅ ~~**Registrazione pianificata non atomica** (`dashboard.js:963`)~~ — **RISOLTO 2026-07-28** (una sola transazione SQL; corretto anche `scheduled.js:registerSched`), vedi § dedicato.
- ✅ ~~**`reopen()` sull'EDT**~~ — **RISOLTO 2026-07-28** (`MainWindow.bringToFront`/`reload` + le due azioni DB del tray in `App.java`), vedi § dedicato.
- **Porta 47291 occupata** → l'app **esce in silenzio assoluto** e non parte più (`SingleInstance.java:22`, `App.java:138`). → Se il "SHOW" fallisce, `return true`.
- **`Integer.parseInt(backup.max)` senza fallback** (`Bridge.java:670`,`:705`; protetto invece in `MainWindow.java:106`): un campo svuotato rompe il backup pre-svecchiamento, che è irreversibile.
- **`readAllBytes` senza limite** su POST `/bridge` (`WebServer.java:37`) + nessun timeout → OOM dalla LAN.
- ✅ ~~**`deletePortfolioItem`** lascia orfane le transazioni di acquisto e le commissioni~~ — **CHIUSO 2026-07-28**: ⚠️ finding mal posto, le transazioni devono restare (movimenti di denaro reali). Risolta la tracciabilità. Vedi § dedicato.
- ✅ ~~**`updateTransaction`** aggiorna `portfolio_transactions.price` solo per `coupon`/`expense`~~ — **RISOLTO 2026-07-28** (guardia graduata sull'importo), vedi § dedicato.
- ✅ ~~`getProjectionByCategory` usa `LocalDate.parse` diretto~~ — **RISOLTO in `b058115`**, allineato a `tryParseDate` come le altre 5 copie.
- ✅ ~~**Divisione per zero** in `buyStock` con `qty == 0`~~ — **RISOLTO 2026-07-28** (produceva `Infinity`, non `NaN`; guardia aggiunta anche a `sellStock`), vedi § dedicato.
- 🗑️ **`archiveTransactions` DELETE riga per riga** (1000-2000 statement) — **ARCHIVIATO, nessun intervento (decisione utente, 2026-07-28).** Non influente sul volume di dati reale; lo svecchiamento è un'operazione rara e manuale. Coerente con la lezione già imparata su P1/P2/P3: le stime di performance non misurate su questo DB si sono rivelate sbagliate di un ordine di grandezza.
- 🗑️ **`getScheduled()` chiamato 2 volte in `getProjection`** con filtri divergenti sui trasferimenti — **ARCHIVIATO, nessun intervento (decisione utente, 2026-07-28).** ⚠️ Se un giorno le proiezioni mostrassero trasferimenti incoerenti fra le due viste, **riaprire qui**: la divergenza dei filtri è reale, è solo il costo a non essere influente.
- ✅ ~~**WebServer: ramo `/` senza catch e nessun logging** in entrambi i rami~~ — **RISOLTO 2026-07-28** *(resto di C3 dell'audit precedente)*. Vedi § dedicato.

---

## ⏳ DA FARE — indici e pulizia

✅ **Indici: FATTI in `5c42ed4`** — aggiunti `idx_porttx_portfolio(portfolio_id, type)` e
`idx_splits_cat(category_id)`; rimosso `idx_tx_account` (ridondante); `PRAGMA optimize` in
`close()`. L'indice parziale su `reconciled=0` è stato **provato e scartato**: peggiorava.

⏳ **Restano (valore trascurabile, non prioritari):** `idx_sched_active` e `idx_note_tags_tag`
non sono usati da nessuna query — verificato: il filtro `is_active` è in Java in 8 punti e
`note_tags` non è mai filtrata per `tag_id` — ma sono su tabelle minuscole, quindi rimuoverli
non produce alcun guadagno misurabile.

❌ **Non** introdurre una cache di `PreparedStatement`: `sqlite3_prepare_v2` costa 10-50 µs contro
una soglia slow-query di 50 ms.

**Codice morto** (verificato: zero `api.<nome>(` in `web/js/`):
`case "deleteBudget"` + `Database.deleteBudget` · `case "getUpcoming"` + `Database.getUpcoming` (28 righe) · `case "getNote"` (⚠️ `Database.getNote` è **vivo**: lo usano `saveNote` e `setNotePinned`) · `method.equals("resetJcef")` in `WebServer.java:53` · campo `cefApp` in `MainWindow.java:21`,`:31` (write-only).

**Duplicazione con divergenza già presente:** `ABS(amount)` vs `amount` nelle 5 copie di "somma income/expense" (coincidono solo perché oggi gli importi sono tutti positivi) · CTE `cat_amounts` ×5 e filtro `excluded_from_budget` ×19 · valorizzazione bond/equity ×8 SQL + ×2 Java con **3 trattamenti diversi** dei conti investment · cascata "categoria commissioni" identica in `buyStock`/`sellStock` · costante `12.5` (aliquota cedole) in 4 punti.

**Organizzazione:** 100 righe di helper delle transazioni (`saveTags`, `saveSplits`, `getTransactionById`, `parseTags`…) stanno sotto il separatore `─── Resoconti ───`; `readLog` sotto `─── Allegati ───`; `getCategoryMonthTable`/`getCategoryComparison` in coda al file invece che in Analytics.

✅ **Errori invisibili — RISOLTO 2026-07-28.** Le **6** `yield Map.of("error", …)` dei 4 case
(`attachFile`, `openAttachment` ×3, `archiveTransactions`) sono diventate `throw`, così passano
dal catch centrale di `onQuery` e finiscono in `app.log` + badge errori. Fra queste il fallimento
del backup pre-svecchiamento, che protegge un'operazione **irreversibile**: lì la causa originale
è concatenata (`new IllegalStateException(msg, backupErr)`) per non perdere lo stack vero.

⚠️ **Nessun cambiamento per il frontend**, verificato prima di toccare il codice: `_checkError`
in `bridge.js:42-46` trasformava già il campo `error` in un `throw new Error(result.error)`, e i
messaggi sono rimasti identici. La modifica è quindi puramente additiva — cambia solo cosa si
vede lato Java. Tipi scelti per aderenza: `IllegalStateException` (non configurato),
`IllegalArgumentException` (path non valido), `FileNotFoundException` (file assente).

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
