# Disegno — Cronologia, annullamento, backup e manutenzione

**Stato:** fasi 1 (cattura), 2 (annullamento), 3 (pagina Cronologia) e 4 (backup e manutenzione)
**fatte**; resta la 5 (pulizia). Versione bersaglio **1.26.0**, schema **v27**.

### Cosa è cambiato scrivendo la fase 4

Tre precisazioni al disegno, tutte nate da cose che si vedono solo col codice in mano.

1. ⚠️ **La potatura gira a backup *spento*, non a backup *rotto*.** Il disegno diceva «la
   potatura gira SEMPRE», per impedire che spegnendo il backup il giornale cresca all'infinito.
   Ma backup disattivato è una scelta dell'utente, backup fallito è un'altra cosa: potare lì
   butterebbe la storia senza averne messa da parte una copia, e non si torna indietro. Quindi:
   backup non richiesto → si pota; backup richiesto e riuscito → si pota; **backup richiesto e
   fallito → non si pota**, e il motivo si legge nel resoconto.
2. ⚠️ **Il pulsante manuale non fa un backup se non c'è niente da salvare.** Sembrava giusto il
   contrario («l'ha chiesto l'utente»), ma con la rotazione a numero fisso di copie un `.bak`
   identico al precedente ne butta fuori uno vecchio e davvero diverso: si perderebbe storia
   premendo un pulsante che sembra prudente.
3. ⚠️ **La potatura ha bisogno di `PRAGMA foreign_keys=ON` esplicito.** Gira sulla connessione
   esclusiva (serve a `VACUUM`, che non può stare dentro una transazione), e quella è una
   `DriverManager.getConnection` nuda: le foreign key non sono attive, quindi la `CASCADE` da
   `op_log` a `change_log` non scatterebbe. Il giornale peserebbe uguale dopo la potatura, con
   le righe di dati appese a operazioni che non esistono più. C'è un controllo apposta.

Un pezzo del disegno è stato invece **tolto**: il pulsante `[pota…]` della §9. Con la retention
in Impostazioni e la potatura dentro il momento di manutenzione, quel pulsante non avrebbe quasi
mai niente da fare — e un pulsante che di solito non fa niente insegna a non fidarsi. Nello
stesso spirito è sparita l'operazione `doBackup`: averne due (backup da solo, o backup +
manutenzione) significa poter fare il backup senza potare, che è il modo in cui un giornale
cresce all'infinito senza che nessuno se ne accorga.

### Cosa è cambiato scrivendo la fase 3

Una cosa sola, ma tocca il modello e non l'interfaccia — per questo sta qui e non in un commento.

⚠️ **`stato` e `annullata_da` non sono cronaca: sono derivati.** Il disegno diceva «su `X`
imposta `stato='annullata'`», e basta. Non basta: un annullamento può essere a sua volta
annullato, e allora ciò che aveva disfatto **torna in vigore**. Provato dall'interfaccia con
*annulla → ripeti → annulla → ripeti*: il dato era tornato al suo posto e la riga restava
barrata, col pulsante «ripeti» puntato a un annullamento a sua volta annullato.

La regola giusta è ricorsiva — *X è annullata se e solo se esiste un annullamento **ancora in
vigore** che l'ha disfatta* — ma non serve ricorrere: chi annulla è sempre più recente di ciò che
annulla, quindi una passata sola dalla più recente alla più vecchia basta
(`Giornale.ricalcolaStati()`, che gira **solo** quando l'operazione appena chiusa è un
annullamento). Un singolo `annullata_da` per riga regge anche quando la stessa operazione viene
annullata due volte in momenti diversi: perché il vecchio annullatore torni in vigore servirebbe
un gesto che il **controllo 1** rifiuta sempre — tocca righe che qualcuno di più recente ha già
toccato.

⚠️ Quello che **non** si tocca resta quello di prima: le righe di `change_log`. La storia si
aggiunge, non si corregge. Questi due campi non sono storia, sono un fatto su com'è il database
adesso.

### Due bug veri trovati dall'audit

Nessuno dei due si sarebbe visto guardando i saldi. Sono qui perché è il tipo di errore che
questo meccanismo deve saper evitare, e che va riconosciuto se ricompare.

1. ⚠️ **`INSERT OR REPLACE` per rimettere una riga modificata distrugge le figlie.** È il modo
   ovvio di scrivere l'inverso di una `U`, e sembra equivalente a un `UPDATE`. Non lo è:
   `REPLACE` **cancella** la riga in conflitto prima di reinserirla, e quella cancellazione fa
   scattare le `ON DELETE CASCADE`. Misurato su due righe figlie: la madre torna perfetta, le
   figlie spariscono. Nel dominio: annullare la modifica di una transazione la restituiva
   **senza split e senza tag**. Il rimedio è usare `UPDATE` per la `U` e `INSERT` per la `D` —
   ed è il **controllo 3** a dire quale dei due serve, il che lo rende parte del meccanismo e
   non solo una guardia.
2. ⚠️ **Il controllo 3 va simulato in sequenza, non valutato riga per riga.** Dentro una sola
   operazione la stessa riga può essere toccata più volte: `updateTransaction` riscrive i tag
   cancellandoli e reinserendoli, quindi la stessa chiave compare sia come `I` sia come `D`.
   Valutandole isolatamente, la `D` dice «esiste già» (è vero: la `I` non è ancora stata
   disfatta) e **ogni modifica con tag o split risultava non annullabile**.

### Cosa è cambiato scrivendo la fase 1

Tre cose sono risultate diverse da come erano disegnate. Sono qui e non nascoste nel codice
perché chi riprende il lavoro deve trovarle al primo colpo d'occhio.

1. **Serve un lock di scrittura esplicito, tenuto per l'operazione intera.** L'assegnazione con
   `WHERE op_id IS NULL` vuole un solo scrittore per volta, e la vecchia serializzazione era il
   `synchronized` su `inTx` — che ora non c'è più. Da qui `Database.lockScrittura` e
   ⚠️ **l'ordine di acquisizione: lock prima del monitor, mai il contrario**, che ha imposto di
   dividere `reconnect`, `backup`, `restoreBackup` e `withExclusiveAccess` in un guscio che
   prende il lock e un corpo `synchronized`. Effetto collaterale gradito: ora sono serializzate
   anche le `execute()` nude, che prima potevano incrociarsi con una transazione altrui.
2. **Chiude l'operazione solo chi ha creato il contesto**, non chi l'ha aperta. Il primo disegno
   la faceva chiudere a chi apriva la transazione: sarebbe stata la prima scrittura, che avrebbe
   committato a metà gesto lasciando il resto della richiesta in autocommit — e un gesto solo
   sarebbe comparso in cronologia come più operazioni.
3. **Una scrittura fuori da una richiesta dichiarata apre un'operazione implicita per singolo
   statement.** È il comportamento sicuro (nessuna riga orfana, nessuna attribuzione sbagliata),
   ma si paga: `generateBudget`, che è un ciclo di ~300 `execute()` senza `inTx`, chiamato da uno
   strumento produce ~300 righe di cronologia. Dal Bridge invece è **una** operazione e **una**
   transazione. In produzione non capita mai, perché ogni via d'ingresso passa dal Bridge.

⚠️ **Questo file ha una scadenza.** Non è documentazione viva come `CLAUDE.md` e
`docs/ARCHITECTURE.md`, e non è un registro storico come gli `AUDIT*`: è il **progetto** di un
lavoro da fare. Quando le fasi sono chiuse, le invarianti della sezione 10 migrano in
`CLAUDE.md`, il flusso in `ARCHITECTURE.md`, e questo file si elimina. Finché esiste, è la fonte
unica: se il codice e questo documento divergono, si aggiorna il documento nello stesso commit.

---

## 1. Il problema

Oggi ci sono **tre meccanismi separati** che fingono di essere un sistema:

| pezzo | cosa fa | dove si rompe |
|---|---|---|
| `DbLogger` | una riga di testo a larghezza fissa accanto al DB | è **prosa**: da `desc` non si ricostruisce niente. E un campo con un a capo dentro spezza il record (visto nel log di produzione, righe 163-165: una descrizione `[RAGGRUPPATE …]` diventa tre righe, due delle quali spazzatura) |
| `startOffset` + `shiftSessionOffset` + `SYSTEM_ACTIONS` | rispondere a `hasChanges()` per il backup all'uscita | tre bug già pagati e documentati. Tutta questa aritmetica esiste per una domanda che sarebbe un `COUNT` |
| `Database.backup()` | `Files.copy` del file previa `close()` | il retry sul `-journal` **non può funzionare** per costruzione (`synchronized` + `Thread.sleep` non rilascia il monitor). Granularità: tutto o niente |

E il buco vero: **fra due backup non esiste niente**. Cancelli 30 transazioni alle 15:00, l'ultimo
`.bak` è di ieri sera → o perdi la cancellazione o perdi la giornata.

L'idea che risolve tutto insieme, in una riga:

> **Il log smette di essere un testo e diventa il giornale delle operazioni: la stessa riga che
> leggi, con sotto le righe di dati che quell'operazione ha cambiato.**

---

## 2. Decisioni prese

| decisione | scelta |
|---|---|
| retention di `op_log` **e** `change_log` | **30 giorni**, configurabile in Impostazioni (`0` = nessun limite) |
| quando si pota | nel **momento unico di manutenzione**, agganciato al backup |
| ordine dentro quel momento | **backup → potatura → vacuum condizionale** (§8) |
| snapshot automatici | **solo alla chiusura**, se ci sono modifiche (come oggi) |
| snapshot prima delle migrazioni di schema | **no** — rischio accettato, vedi §12 |
| ambito | dati utente **+ impostazioni**, queste ultime nascoste di default |
| `<db>.log` | **sparisce** |
| dove si vede | la pagina **Log** diventa **Cronologia** (§9) |

---

## 3. Le prove fatte prima di disegnare

Le domande che, con la risposta sbagliata, fanno cadere il disegno. Provate su SQLite 3.53.2 col
driver del progetto, sul DB vero.

| prova | esito |
|---|---|
| **Un `DELETE ON CASCADE` fa scattare i trigger sulle figlie?** Se no, annullare la cancellazione di una transazione restituirebbe il guscio senza split né tag | ✅ **sì**, senza bisogno di `recursive_triggers` (che resta off) |
| **Attribuzione delle righe all'operazione** | ✅ funziona (poi sostituita da una soluzione migliore, §6) |
| **`backup to <file>`** del driver sqlite-jdbc (Online Backup API, a connessione aperta) | ✅ 20ms, niente `close()`, niente corsa al journal. **Rifiuta con `SQLITE_BUSY` se una transazione è aperta** e lascia un file parziale da cancellare |
| **Costo** del giornale: 200 UPDATE su `transactions` | 18ms → 24ms (**+30 µs a riga**), JSON della riga vecchia **231 byte** medi, ~350 byte su disco |
| **Annullamento end-to-end** sul DB vero: elimino la transazione 2146 (2 split + 1 tag via CASCADE), ripristino **solo dal giornale** con `defer_foreign_keys`, confronto riga per riga | ✅ 4 inversi applicati, **contenuto identico al prima**, id originali conservati |

Il ritmo reale di scrittura, misurato sul `luca.log` di produzione: **213 operazioni in 11 giorni
≈ 19 al giorno** (mediana ~11, picchi 38-67). Da lì i costi della §13.

---

## 4. Il modello

> **`op_log` è il gesto** — una riga, in italiano, quella che leggi.
> **`change_log` sono le conseguenze sui dati** — n righe, in JSON, quelle che si eseguono a
> ritroso per annullare.

Una si **legge**, l'altra si **esegue**.

### Esempio reale: elimini la transazione 2146

`op_log` — una riga:

| id | ts | etichetta | dettaglio | origine | tipo | stato |
|---|---|---|---|---|---|---|
| 4871 | 2026-09-20 18:04:11 | TRANSAZIONE ELIMINATA | id:2146 · data:2026-07-29 · tipo:expense · importo:34.52 · conto:Contanti · descrizione:libri minecraft… | desktop | utente | attiva |

`change_log` — quattro righe (una è tua, tre le ha aggiunte la `CASCADE`):

| id | op_id | tabella | chiave | verso | riga |
|---|---|---|---|---|---|
| 9012 | 4871 | transaction_splits | `[69]` | D | `{"id":69,"transaction_id":2146,"category_id":45,"amount":11.03,"description":""}` |
| 9013 | 4871 | transaction_splits | `[70]` | D | `{"id":70,…,"category_id":22,"amount":23.49,…}` |
| 9014 | 4871 | transaction_tags | `[2146,8]` | D | `{"transaction_id":2146,"tag_id":8}` |
| 9015 | 4871 | transactions | `[2146]` | D | `{"id":2146,"date":"2026-07-29","amount":34.52,"type":"expense","category_id":null,"account_id":3,…,"reconciled":1,"attachment_path":null}` |

### Schema

```sql
CREATE TABLE op_log (
    id            INTEGER PRIMARY KEY,           -- NO AUTOINCREMENT: vedi ⚠️ sotto
    ts            TEXT    NOT NULL,              -- 'YYYY-MM-DD HH:MM:SS'
    etichetta     TEXT    NOT NULL,              -- 'TRANSAZIONE ELIMINATA'
    dettaglio     TEXT,                          -- 'id:2146 · data:… · importo:…'
    origine       TEXT    NOT NULL,              -- desktop | lan | telefono | avvio | manutenzione
    tipo          TEXT    NOT NULL,              -- utente | sistema
    stato         TEXT    NOT NULL DEFAULT 'attiva',   -- attiva | annullata | non_annullabile
    motivo        TEXT,                          -- perché non annullabile, quando lo è
    annulla_op    INTEGER REFERENCES op_log(id) ON DELETE SET NULL,  -- questa op ANNULLA la…
    annullata_da  INTEGER REFERENCES op_log(id) ON DELETE SET NULL   -- questa op è stata ANNULLATA da…
);
CREATE INDEX idx_op_log_ts ON op_log(ts);

CREATE TABLE change_log (
    id       INTEGER PRIMARY KEY,
    op_id    INTEGER REFERENCES op_log(id) ON DELETE CASCADE,  -- NULL = in corso, vedi §6
    tabella  TEXT NOT NULL,
    chiave   TEXT NOT NULL,      -- json_array dei valori di chiave primaria: [2146] o [2146,8]
    verso    TEXT NOT NULL,      -- I | U | D
    riga     TEXT                -- json_object della riga PRIMA (NULL per I)
);
CREATE INDEX idx_change_log_op    ON change_log(op_id);
CREATE INDEX idx_change_log_riga  ON change_log(tabella, chiave);   -- rilevamento conflitti
```

⚠️ **`op_log.id` non è `AUTOINCREMENT`.** È la lezione di `ensureSystemTags` (commit `6b51a81`):
su una tabella `AUTOINCREMENT` il contatore in `sqlite_sequence` avanza anche per una riga poi
scartata, e quella è una pagina scritta — cioè un ricaricamento OneDrive del file intero. Qui la
riga di operazione nasce **alla fine** e solo se serve (§6), ma la regola resta: niente
`AUTOINCREMENT` dove il riuso di un id non fa danno.

⚠️ **Le due autoreferenze sono `ON DELETE SET NULL`, mai `CASCADE`.** Con `CASCADE`, potare
un'operazione vecchia porterebbe via **anche l'operazione recente che l'ha annullata**: la
potatura mangerebbe in avanti invece che all'indietro.

⚠️ **`change_log.op_id` è invece `ON DELETE CASCADE`**: è ciò che rende la potatura una `DELETE`
sola su `op_log`. Le due retention restano allineate per costruzione, non per disciplina.

### Cosa entra nel giornale

**Dentro** (19 tabelle → 57 trigger): `accounts` · `categories` · `transactions` ·
`transaction_splits` · `transaction_tags` · `tags` · `budgets` · `budget_config` ·
`scheduled_transactions` · `scheduled_transaction_tags` · `portfolio` ·
`portfolio_transactions` · `forecasts` · `forecast_categories` · `notes` · `note_tags` ·
`reports` · `range_presets` · `app_settings`.

**Fuori**: `op_log`, `change_log` (ovvio) · `sync_meta` e `imported_pending` (marcatori di
sincronizzazione: rumore puro, riscritti a ogni operazione) · `schema_version` ·
`android_metadata` · le tabelle `sqlite_*`.

⚠️ **`app_settings` entra con un'eccezione.** Alcune chiavi non sono preferenze ma **stato di
navigazione**, riscritto a ogni clic: `tx.range%`, `cf.range`, `proj.%`, `fc.%`,
`portfolio.active_only`. Senza filtro, cambiare periodo in Transazioni scriverebbe ~700 byte di
giornale — ~600 KB al mese di niente. Il trigger le salta con una `WHEN`, ed è un **elenco di
esclusione, non di inclusione**: una preferenza nuova viene journalata per default (rumore
visibile e innocuo), mentre con un elenco di inclusione verrebbe dimenticata e perderebbe
l'annullamento in silenzio.

### Il trigger, generato

Tre per tabella, prodotti in Java da `pragma_table_info`. Quello vero per `transactions`:

```sql
CREATE TRIGGER jr_transactions_del AFTER DELETE ON transactions BEGIN
  INSERT INTO change_log(op_id,tabella,chiave,verso,riga) VALUES(
    NULL, 'transactions', json_array(OLD.id), 'D',
    json_object('id',OLD.id,'date',OLD.date,'amount',OLD.amount,'type',OLD.type,
                'category_id',OLD.category_id,'account_id',OLD.account_id,
                'to_account_id',OLD.to_account_id,'description',OLD.description,
                'created_at',OLD.created_at,'color',OLD.color,'reconciled',OLD.reconciled,
                'attachment_path',OLD.attachment_path));
END;
```

Per `INSERT` la riga vecchia è `NULL` (prima non esisteva): basta la chiave per sapere cosa
cancellare. Per `UPDATE` si registra **solo il prima** — il dopo è già nella tabella, e
registrarlo raddoppierebbe il peso per niente: il *"34,52 → 40,00"* da mostrare in pagina si
ottiene confrontando `riga` con la riga attuale.

### ⚠️ La guardia di allineamento (il pezzo che rende l'invariante non dimenticabile)

All'avvio si **genera** il testo atteso dei 57 trigger e lo si confronta con la colonna `sql` di
`sqlite_master WHERE type='trigger' AND name LIKE 'jr_%'`.

- identici → **non si scrive niente** (avvio a scrittura zero, §3 di `CLAUDE.md`);
- diversi (colonna aggiunta, tabella nuova) → `DROP` + `CREATE` di quelli che divergono, una riga
  in `app.log`, e l'operazione è marcata `origine='avvio'`.

Nessuna firma memorizzata da qualche parte: il confronto è con la realtà, quindi non può
sfasarsi. **Una tabella nuova che non compare nell'elenco è un errore visibile in `app.log`**,
non un silenzio — ed è l'unico modo in cui l'invariante "ogni tabella di dati è journalata" resta
vera senza che qualcuno debba ricordarsene.

---

## 5. Da dove arrivano le etichette

**Le ~85 chiamate `logger.log("TRANSAZIONE ELIMINATA", "id:"+id, …)` sparse in `Database` non si
toccano.** Cambia cosa fa quella chiamata: invece di appendere una riga a un file, annota
l'operazione in corso. Il campo `logger` cambia tipo (`DbLogger` → `Giornale`), il metodo si
continua a chiamare `log(String, String...)`, i call-site restano **identici byte per byte**.

Se un'operazione produce più annotazioni (`buyStock` ne fa tre: commissione, rateo, titolo):
- `etichetta` = **l'ultima** (è quella che chiude l'operazione: `TITOLO ACQUISTATO`);
- `dettaglio` = tutte, in ordine, separate da ` · `, con le precedenti prefissate dalla propria
  etichetta.

Se non ce n'è nessuna (es. `setSetting`), l'etichetta è il nome del metodo del Bridge e
`tipo='sistema'`.

---

## 6. Il confine dell'operazione

**Una richiesta del Bridge = un gesto tuo = una riga in `op_log`.** Ma con due accortezze che
cambiano l'implementazione rispetto alla prima idea.

### Apertura pigra: la prima scrittura, non la prima richiesta

Se l'operazione si aprisse all'inizio del dispatch, **ogni `getTransactions` scriverebbe una riga
in `op_log`**: una lettura diventerebbe una scrittura, e su OneDrive un ricaricamento. Quindi:

1. il Bridge, all'inizio della richiesta, **dichiara soltanto** metodo e origine (in memoria, zero scritture);
2. la **prima scrittura** — cioè il primo passaggio da `execute()`/`executePlain()` — promuove la
   richiesta a operazione: prende il lock di scrittura e apre la transazione;
3. i trigger scrivono le righe di `change_log` con `op_id = NULL`;
4. alla fine della richiesta, **solo se ci sono righe**: si inserisce la riga in `op_log` (con
   etichetta già nota) e si esegue
   `UPDATE change_log SET op_id = ? WHERE op_id IS NULL`;
5. commit.

⚠️ **Se il passo 4 non trova righe, non si scrive nessuna operazione.** È ciò che tiene a
scrittura zero i casi che oggi lo sono già: `ensureSystemTags` su un DB a posto,
`syncCardSettlements` con l'importo giusto, un `UPDATE` che non trova righe. Il giornale non deve
mai trasformare un non-evento in una scrittura.

⚠️ **`op_id` si assegna alla fine con `WHERE op_id IS NULL`, e questo richiede un solo scrittore
per volta.** Due operazioni concorrenti (thread UI di JCEF + virtual thread del `WebServer`) si
ruberebbero le righe a vicenda. Il lock di scrittura preso al passo 2 è ciò che lo impedisce, ed
è una **garanzia in più** rispetto a oggi: attualmente solo le scritture dentro `inTx` sono
serializzate, le `execute()` nude no.

Rete di sicurezza all'avvio: righe con `op_id IS NULL` possono esistere solo dentro una
transazione aperta, quindi dopo un crash non ce ne sono (il rollback le porta via). Si controlla
comunque con un `SELECT EXISTS` (lettura, gratis) e si cancella **solo se** ne esistono.

### ⚠️ `inTx` deve diventare rientrante, con SAVEPOINT

Oggi `inTx` fa commit esplicito e non è rientrante — `CLAUDE.md` lo segnala come trappola
(`undoPortfolioTransaction`). Con la transazione di richiesta come transazione esterna, i 26
`inTx` esistenti diventano **annidati**:

- fuori da una transazione → `BEGIN` / `COMMIT` come oggi;
- dentro → `SAVEPOINT` / `RELEASE`, e `ROLLBACK TO` sull'eccezione.

⚠️ **Non basta renderlo un no-op.** `importPending` cattura l'eccezione per riga e prosegue: con
un `inTx` annidato reso inerte, una riga fallita a metà lascerebbe le sue scritture parziali
dentro la transazione esterna, e il `catch` le nasconderebbe. Il `SAVEPOINT` conserva
l'atomicità interna **esattamente** com'è oggi, mentre l'esterna diventa atomica per gesto.

Questo è un **cambio di comportamento voluto e da dichiarare**: oggi una richiesta che fallisce a
metà può lasciare scritture committate; da domani no.

### Le scritture fuori dal Bridge

Avvio (migrazioni, `ensureSystemTags`, `importPending`, `syncCardSettlements`) e manutenzione
girano dentro un'operazione dichiarata esplicitamente, con `origine='avvio'` o `'manutenzione'` e
`tipo='sistema'`.

---

## 7. L'annullamento

### La regola dell'inverso

Nessuna conoscenza del dominio: si rileggono le righe di `change_log` dell'operazione e si applica
una regola sola.

| verso | inverso |
|---|---|
| `D` | reinserisco la riga con tutti i campi di `riga`, **id originale compreso** |
| `U` | riscrivo la riga con i campi di `riga` |
| `I` | cancello la riga identificata da `chiave` |

⚠️ **`PRAGMA defer_foreign_keys=ON` per tutta la transazione di annullamento.** Reinserire una
figlia prima della madre violerebbe la chiave esterna; con le verifiche rimandate al commit
l'ordine smette di contare, e un annullamento davvero incoerente fallisce comunque — al commit,
in blocco, senza lasciare niente a metà. L'alternativa (ordinare le tabelle per grafo delle FK)
sarebbe una seconda fonte di verità da tenere allineata.

⚠️ **Gli id originali si conservano.** La transazione torna `2146`, non `2400`: allegati,
riferimenti e schede aperte continuano a funzionare. Conseguenza minore e accettata:
`sqlite_sequence` non viene riavvolta, quindi il prossimo inserimento prende comunque un id più
alto. È il normale comportamento di SQLite.

### I tre controlli prima di annullare

⚠️ **Sono tre domande indipendenti: nessuna copre le altre.** Il primo disegno ne aveva una
sola, e quattro scenari provati sui dati veri hanno mostrato che non basta.

| | domanda | come |
|---|---|---|
| **1. conflitti in avanti** | qualcuno ha toccato queste righe **dopo** di me? | le `(tabella, chiave)` di `X` cercate fra le righe di operazioni successive ancora `attiva` (indice `idx_change_log_riga`) |
| **2. dipendenze** | le righe che rimetto puntano a righe **che esistono ancora**? | il grafo delle chiavi esterne (`pragma_foreign_key_list`) applicato a ogni riga da reinserire |
| **3. coerenza** | la realtà corrisponde a ciò che il giornale si aspetta? | per `D` la riga non deve esistere, per `U`/`I` deve esistere |

⚠️ **Nel controllo 2, le righe che l'annullamento sta rimettendo nello stesso lotto contano come
presenti.** Senza questa eccezione, *ogni* annullamento di una cancellazione verrebbe rifiutato:
le figlie puntano sempre a una madre che in quel momento non c'è ancora. È l'errore in cui è
caduto il primo prototipo.

**Il giornale sa anche dire di chi è la colpa.** Quando il controllo 2 trova un padre mancante,
la riga `D` che l'ha eliminato è nel giornale con la sua operazione: l'errore opaco di SQLite
(`FOREIGN KEY constraint failed`) diventa *"il tag **\*Luca** non esiste più, l'hai eliminato il
10/09 (operazione #4)"*.

Alla fine: **si rifiuta**, nominando l'operazione che blocca, e si offrono due strade —

- **annullare anche le operazioni che bloccano**, calcolate come insieme **minimo** e
  transitivo (non "tutto da lì in poi");
- **rimettere senza il legame mancante**, ma solo quando il pezzo assente è un legame (tag,
  split) o una colonna che ammette il vuoto, e **dicendo sempre cosa si perde**. Se manca il
  conto, una transazione non può esistere senza: resta solo la prima strada.

Tutto in **una** transazione: o l'annullamento è completo, o non è avvenuto.

Proprietà che viene gratis: **chi blocca è sempre più recente di ciò che si annulla**, quindi se
un'operazione è ancora annullabile lo sono anche tutte quelle che la bloccano. La retention non
può mettere in un vicolo cieco.

### I quattro scenari provati sui dati veri

| scenario | esito | perché |
|---|---|---|
| cancello una transazione con un tag, poi cancello il tag, poi annullo | **rifiutato** dal controllo **2** | il controllo 1 non se ne accorge: la riga `transaction_tags [80,2]` era già sparita, quindi la cancellazione del tag non l'ha mai toccata |
| modifico un budget, poi **rinomino** la categoria, poi annullo | **riesce** | righe diverse in tabelle diverse, e il legame è `category_id`, non il nome — *la chiave segue i dati* |
| modifico un budget, poi **elimino** la categoria, poi annullo | **rifiutato** da **tutti e tre** | `budgets.category_id` è `ON DELETE CASCADE`: la riga di budget se n'è andata con la categoria |
| registro una pianificata (transazione + avanzamento), poi annullo | **riesce**, e rimette la pianificata "da pagare" | un clic = **un'operazione**: `transactions I` e `scheduled_transactions U` si annullano insieme. Col confine sullo statement invece che sul gesto, annullare solo la transazione avrebbe lasciato la pianificata avanzata — un mese saltato in silenzio |

⚠️ **Mai un annullamento parziale.** È la proprietà che rende il meccanismo affidabile: un
annullamento a metà lascerebbe saldi plausibili e sbagliati, cioè esattamente il danno silenzioso
che questo disegno esiste per evitare.

### "Riporta il database a prima di qui"

Annulla dalla più recente alla più vecchia fino a `X` inclusa. **Per costruzione non ha
conflitti** — è la stessa ragione per cui `deletePortfolioItem` annulla in `date DESC, id DESC`
(vedi `CLAUDE.md`, «Titoli», punto 9).

### L'annullamento è a sua volta un'operazione

Scrive la propria riga in `op_log` (con `annulla_op = X`) e le proprie righe in `change_log`;
su `X` imposta `stato='annullata'` e `annullata_da`. Da cui:

- il **redo è gratis**: annullare l'annullamento è la stessa identica meccanica;
- **la storia non viene mai riscritta**: nessuna riga sparisce, se ne aggiungono.

### Operazioni non annullabili

Marcate `stato='non_annullabile'` con il `motivo`, e mostrate senza pulsante:

| caso | perché |
|---|---|
| migrazioni di schema | i trigger catturano le righe, non il DDL |
| svecchiamento / operazioni di massa | esenti dalla cattura riga per riga (§8), protette dal backup |
| ripristino di un backup | il DB è un altro file |
| operazioni oltre la finestra di retention | le righe di `change_log` sono state potate |

### ⚠️ `undoPortfolioTransaction` diventa ridondante — ma non si tocca subito

Il ripristino riga per riga è **più corretto** di quello di dominio: riporta anche `avg_price`
invece di ricalcolarlo, e i rifiuti del portafoglio ("acquisto con vendite successive") sono un
caso particolare del rilevamento conflitti. Si rimuove **solo in fase 5**, dopo che
`test-annulla.ps1` ha dimostrato l'equivalenza, e in un commit che non cambia nient'altro.

---

## 8. Il momento unico: backup e manutenzione

Un solo blocco, alla chiusura, richiamabile a mano dal pulsante **«Backup e manutenzione ora»**:

```
1. backup      -> .bak, se "backup all'uscita" è attivo e ci sono modifiche
2. potatura    -> SEMPRE: DELETE FROM op_log WHERE ts < date('now','-N days')
3. vacuum      -> solo se lo spazio libero supera la soglia
```

⚠️ **L'ordine backup → potatura, mai l'inverso.** Il `.bak` conserva così la cronologia
**intera** fino a quell'istante: la storia più vecchia di 30 giorni non si perde, si sposta nei
backup. È ciò che rende accettabile una retention corta sul DB vivo.

⚠️ **La potatura gira anche a backup disattivato.** Agganciarla al `.bak` significherebbe che
spegnendo il backup il giornale cresce all'infinito, in silenzio.

⚠️ **Il `VACUUM` non va fatto a ogni chiusura.** Riscrive il file **intero** = un ricaricamento
OneDrive completo ogni volta. Cancellare righe non rimpicciolisce il file ma libera pagine che
SQLite riusa, quindi in regime il file **si stabilizza da solo**. Si compatta solo quando
`freelist_count / page_count` supera ~25% (due `PRAGMA`, costo nullo). Resta il pulsante manuale
in Manutenzione.

### Il backup diventa a caldo

`Files.copy` + `close()` + retry sul `-journal` → **`backup to <percorso>`** (Online Backup API,
esposta dal driver come comando esteso). Conseguenze:

- niente chiusura della connessione, niente corsa col journal, niente `.bak` incoerente;
- ⚠️ **va eseguito fuori da ogni transazione**: dentro, risponde `SQLITE_BUSY` (provato) e lascia
  un file parziale, che **va cancellato nel `catch`** — altrimenti resta in cartella un `.bak`
  troncato che sembra buono;
- il retry di 10 tentativi sparisce insieme al commento che ne spiega l'inutilità.

### Il sidecar `.json` sparisce

Un `.bak` **è** un database SQLite e contiene il proprio `op_log`: le modifiche si leggono da lì,
in sola lettura, **quando espandi la voce** nella timeline. Niente più file `.json` accanto ai
backup, niente più gestione del sidecar corrotto in `listBackups`.

### Retention configurabile

`app_settings` → `journal.retention_days`, default `30`, `0` = nessun limite. In Impostazioni,
nella sezione backup (rinominata **«Backup e cronologia»**).

---

## 9. L'interfaccia

La voce **Log** in sidebar ([index.html:139](../src/main/resources/web/index.html#L139)) diventa
**Cronologia**, icona `history`. Non nasce una pagina nuova.

✅ **Fatta**, in [cronologia.js](../src/main/resources/web/js/pages/cronologia.js), con due
differenze dal disegno qui sotto, entrambe volute:

- **`[pota…]` non c'è**, e non arriverà: vedi «Cosa è cambiato scrivendo la fase 4» in testa.
  **«Backup e manutenzione ora»** c'è, in alto a destra, e apre un resoconto di cosa ha fatto
  davvero (backup, quante operazioni potate, se ha compattato);
- in più rispetto al disegno c'è **📜 Archivio**, che apre in sola lettura il vecchio `<db>.log`:
  è l'unico posto da cui si legge la storia precedente al giornale.

Espandendo un **punto di ripristino** si legge il suo `op_log`: cosa c'era dentro quel backup,
letto dal backup stesso (§8, «Il sidecar `.json` sparisce»).

```
 Cronologia                       [🔍 filtra…] [tutte ▾] [💾 Backup e manutenzione ora]
 ──────────────────────────────────────────────────────────────────────────────────
  giornale 1.847 righe · 640 KB · annullabile dal 21/08 · retention 30 gg    [pota…]
 ──────────────────────────────────────────────────────────────────────────────────
 oggi
   18:04  TRANSAZIONE ELIMINATA    id:2146 · 34,52 € · Contanti · libri minecraft…   ↶ Annulla  ⋯
   17:51  TRANSAZIONE MODIFICATA   id:2140 · importo 12,00 → 15,50                   ↶ Annulla  ⋯
   09:12  ~~CONTO MODIFICATO~~     annullata alle 09:15                              ↷ Ripeti
 ieri
   ▣ 23:14 PUNTO DI RIPRISTINO     luca_2026-09-19_23-14-02.db.bak · 452 KB     ⤺ Ripristina  📂
   22:58  TITOLO ACQUISTATO        BTP 2037 · 5.000 · commissione 12,00              ↶ Annulla  ⋯
 21/08 ─── oltre questa riga le operazioni non sono più annullabili ───────────────
```

- **Operazioni e punti di ripristino sulla stessa linea del tempo**, in ordine cronologico. È
  tutto il senso dell'integrazione: la scelta fra bisturi e ripristino totale si fa guardando
  **una** schermata invece di incrociarne due.
- `⋯` → *"Riporta il database a prima di qui"*.
- Le annullate restano, barrate, con il rimando all'annullamento.
- Oltre la finestra di retention: niente pulsante, e il rimando al punto di ripristino utile.
- Filtri già esistenti (ricerca, tipo record) + *"solo annullabili"*; le operazioni
  `tipo='sistema'` sono nascoste di default.

### Tre dettagli della pagina, decisi provando gli scenari

1. **I nomi congelati vanno mostrati, ma non da soli.** Il giornale registra il nome del momento
   (`categoria:Carburante`). Dopo un rinomina, in cronologia si leggerebbe «Carburante» per una
   categoria che ora si chiama «Benzina»: è la verità storica, ma da sola confonde. La pagina
   mostra **`categoria: Carburante (oggi: Benzina)`**, e il confronto lo può fare perché
   `change_log` conserva l'id. ⚠️ Il nome storico non si sostituisce con quello attuale: quel
   giorno si chiamava così, e riscriverlo falsificherebbe la storia.
2. **Le operazioni composte hanno una riga di sintesi.** Registrare una pianificata produce due
   annotazioni attaccate (`TRANSAZIONE AGGIUNTA: … | PIANIFICATA AVANZATA: …`): corretto ma
   illeggibile. In pagina va una sintesi — *«Registrata "stipendio" · 3.375,00 · 27/09 →
   prossima 27/10»* — col resto sotto, espandendo. Sono poche operazioni, e sono proprio quelle
   che vale la pena leggere bene.
3. **Il rifiuto offre due strade, e ne ha già una pronta.** `annullaACatena` esiste ed è
   verificata; la seconda — *«rimetti senza il legame mancante»* — va costruita qui, perché è
   una scelta che si fa guardando un messaggio. Disponibile **solo** quando il pezzo assente è
   un legame (tag, split) o una colonna che ammette il vuoto: se manca il conto, una transazione
   non può esistere senza, e resta solo la prima strada. Dice sempre cosa si perde, prima di
   farlo.

### Che fine fa il `luca.log` esistente

L'app **smette di scriverlo e non lo tocca**. Non è inutile: contiene tutta la storia
**precedente** alla migrazione, che il giornale non ha. Diventa un archivio di sola lettura —
e siccome non cambia più, OneDrive smette di ricaricarlo a ogni azione. Lo cancella l'utente
quando vuole; l'app non cancella file suoi.

⚠️ Da lì in poi vale la divisione: **`app.log` = cosa ha fatto il programma** (avvio, errori
del Bridge, query lente, i tre avvisi `[Giornale]`), **giornale = cosa ha fatto l'utente**. Un
evento di sistema nuovo va su `app.log`, che non è sincronizzato e quindi non costa niente a
nessuno — mai nel giornale.

**In Impostazioni resta solo ciò che è preferenza**: cartella backup, copie da conservare, backup
all'uscita, retention. Le due sezioni che oggi contengono *azioni* — *Ripristina backup*
([settings.js:109](../src/main/resources/web/js/pages/settings.js#L109)) e *Log operazioni*
([settings.js:332](../src/main/resources/web/js/pages/settings.js#L332)) — diventano un rimando
alla Cronologia. La regola che ne esce, valida anche per il futuro:

> **Impostazioni = come voglio che si comporti · Cronologia = la cosa in sé.**

---

## 10. Invarianti (destinate a `CLAUDE.md` a lavoro finito)

1. **Ogni tabella di dati è journalata**, e lo garantisce la guardia di allineamento all'avvio —
   non la memoria di chi aggiunge una tabella.
2. **Un'operazione senza righe di `change_log` non lascia traccia**: il giornale non trasforma
   mai un non-evento in una scrittura.
3. **Un solo scrittore per volta**: `op_id` si assegna con `WHERE op_id IS NULL`.
4. **`inTx` annidato usa `SAVEPOINT`**, mai un no-op.
5. **`op_log.annulla_op` / `annullata_da` sono `ON DELETE SET NULL`**; `change_log.op_id` è
   `ON DELETE CASCADE`.
6. **Niente `AUTOINCREMENT`** su `op_log`/`change_log`.
7. **L'annullamento è atomico** e usa `defer_foreign_keys`; rifiuta invece di forzare quando la
   realtà non corrisponde al giornale.
8. **L'annullamento è a sua volta un'operazione**: la storia non si riscrive mai.
9. **Backup prima della potatura**, sempre.
10. **`backup to` fuori da ogni transazione**, e il file parziale si cancella nel `catch`.
11. **L'elenco delle chiavi `app_settings` escluse è di esclusione, non di inclusione.**

---

## 11. Cosa sparisce

**Già sparito (fase 3):** la scrittura del file `<db>.log` e il suo ricaricamento OneDrive a ogni
riga · l'uso di `startOffset` / `shiftSessionOffset` / `removedBytesBeforeOffset` /
`SYSTEM_ACTIONS` (`hasChanges()` è un `EXISTS` su `op_log`) · il parsing per posizione dei
caratteri · `getLogInfo` / `purgeLog` / `purgeSystemLog` in `Database` e nel `Bridge`, con le due
sezioni di Impostazioni che li usavano · l'elenco dei backup e il ripristino da Impostazioni (ora
sulla linea del tempo).

**Già sparito (fase 4):** il sidecar `.json` e la gestione del sidecar corrotto · il retry sul
`-journal` e la `close()` prima della copia · il backup pre-operazione dentro il `case` del
Bridge (che `CLAUDE.md` indicava come errore da non ripetere) · l'operazione `doBackup`.

**Ancora da togliere:** `undoPortfolioTransaction` (dopo prova di equivalenza) · la classe
`DbLogger` intera, coi suoi `purgeLogBefore` / `purgeSystemEntries` / `SYSTEM_ACTIONS` ormai
senza chiamanti (fase 5).

`hasChanges()` **è** `SELECT EXISTS(SELECT 1 FROM op_log WHERE id > ? AND tipo='utente')`.

---

## 12. Limiti noti e rischi accettati

| limite | perché resta |
|---|---|
| **Le migrazioni di schema non sono annullabili e non hanno snapshot dedicato** | scelta esplicita. Il rischio: se una v27→v28 sbagliasse, l'ultima copia utile sarebbe quella della chiusura precedente. Succede due volte l'anno, all'installazione di una versione nuova |
| **Il giornale copre il DB, non i file** | sostituire un allegato cancella il vecchio file: l'annullamento riporta la riga, non il file. Rimediabile (cestino invece di `delete`), ma è lavoro a sé |
| **Ripristinare un backup riavvolge anche il giornale** | la storia più recente resta nel DB archiviato `_PRIMA-RIPRISTINO`. Va **detto nell'interfaccia**, non lasciato scoprire |
| **Le operazioni di massa non sono annullabili riga per riga** | uno svecchiamento di 2.000 righe scriverebbe ~700 KB di giornale. Restano protette dal backup obbligatorio, che già esiste |
| **Il giornale sta dentro il file che protegge** | non sostituisce il backup: contro un DB corrotto o un disco morto serve la copia. Sono complementari |

---

## 13. Costi misurati

| voce | costo |
|---|---|
| tempo per riga cambiata | **+30 µs** (18ms → 24ms su 200 UPDATE) |
| spazio per riga cambiata | ~350 byte su disco (JSON medio 231 byte) |
| ritmo reale | 19 operazioni/giorno, ~2 righe di dati per operazione |
| **giornale in regime a 30 giorni** | **~400 KB** |
| DB oggi | 452 KB → **~850 KB**, poi stabile |

Su OneDrive il `.db` viene ricaricato **intero** a ogni scrittura: l'upload passa da ~450 KB a
~850 KB. In cambio sparisce un file sincronizzato (`luca.log`, 31 KB) che oggi viene ricaricato
**a ogni singola riga scritta**.

---

## 14. Piano

Ogni fase sta in piedi da sola e ha la sua verifica. Nessuna fase mescola spostamento e cambio di
comportamento.

| fase | contenuto | verifica |
|---|---|---|
| ~~**1 — cattura**~~ ✅ | schema v27, trigger generati + guardia, `inTx` con `SAVEPOINT`, contesto operazione, `DbLogger` → `Giornale` (call-site invariati). Il `.log` continua a essere scritto **in parallelo** | ✅ `confronta-query.ps1` **IDENTICI** (2 scenari × 257 letture) · `test-titoli.ps1` **87/87** · `test-giornale.ps1` **28/28**, compreso il confronto 1:1 col `.log` |
| ~~**2 — annullamento**~~ ✅ | `Giornale.annulla` con i **tre controlli**, `annullaACatena` (insieme minimo dei bloccanti), `riportaA`, `tools\test-annulla.ps1`. Resta da fare la seconda strada, «rimetti senza il legame mancante», che ha senso solo con l'interfaccia davanti | ✅ **71 scenari**: 67 identici dopo l'annullamento, 4 rifiutati come previsto, 0 differenze |
| ~~**3 — pagina Cronologia**~~ ✅ | la pagina legge da `op_log`, timeline con i `.bak`, annulla / riporta indietro / ripeti, archivio del vecchio `.log`. Spenta la scrittura del `.log`, `hasChanges()` è un `EXISTS` su `op_log`, via `startOffset` e l'aritmetica dell'offset, via le azioni sul log da Impostazioni | ✅ `check-ui.ps1` sui 4 temi (Cronologia aggiunta all'elenco delle pagine controllate) · `interact.ps1` sui percorsi veri: annulla, ripeti, catena di 4, rifiuto con annullamento a catena · `test-giornale.ps1` **32/32** · `test-annulla.ps1` **71** · `test-titoli.ps1` **87/87** · `confronta-query.ps1` **IDENTICI** |
| ~~**4 — manutenzione e backup**~~ ✅ | `backup to` (24 ms, a connessione aperta), classe `Manutenzione` col blocco backup→potatura→vacuum, retention in Impostazioni, via il sidecar (un `.bak` si legge il proprio `op_log`), via `doBackup`, il backup pre-svecchiamento sceso sotto il Bridge | ✅ `test-giornale.ps1` **48/48**, con tre gruppi nuovi: backup a caldo (integro, col suo giornale, rifiutato dentro una transazione e **senza file parziale**), potatura (retention 0 e 30, CASCADE su `change_log`, nessuna riga orfana), ripristino di un `.bak` prodotto a caldo · `test-annulla.ps1` **71** · `test-titoli.ps1` **87/87** · `confronta-query.ps1` **IDENTICI** · manutenzione provata dall'app vera |
| **5 — pulizia** | via `undoPortfolioTransaction` (dopo prova di equivalenza), via `DbLogger`, invarianti in `CLAUDE.md`, flusso in `ARCHITECTURE.md`, eliminazione di questo file, bump **1.26.0** | `test-titoli.ps1` + `test-annulla.ps1` + `confronta-query.ps1` |

Le fasi 1 e 2 sono la metà della fatica e **non cambiano nulla di visibile**. La 3 è la prima che
si vede: da lì in poi il giornale è l'unico registro di cosa ha fatto l'utente.

⚠️ **Da qui in avanti il `.log` non c'è più come rete di sicurezza.** Fino alla fase 2 girava in
parallelo e un errore del giornale sarebbe stato ricostruibile da lì. Adesso no: quello che il
giornale non registra è perso. È il motivo per cui `test-giornale.ps1` e `test-annulla.ps1` vanno
tenuti verdi a ogni passo, non a fine lavoro.
