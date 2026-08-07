# Audit `src/main/resources` — finding aperti

Audit svolto il 2026-07-29 su tutta la cartella `resources` (JS + CSS, ~19.000 righe)
con 6 agent paralleli. Questo file elenca **solo ciò che resta da fare**.

> ⚠️ I finding non ancora affrontati **non sono stati verificati personalmente**: vengono
> dagli agent. Sui 3 già corretti sono emersi 2 difetti che l'audit non aveva visto
> (le due note di commissione distinte, la semantica di `monthly_last`). Rileggere sempre
> il codice prima di applicare un fix.

---

## Già fatto

| Commit | Contenuto |
|---|---|
| `19a1911` | 3 bug contabili e di perdita dati (commissioni doppie, date ricorrenti, `_selectedTxIds`) |
| `c76cea5` | Escaping completo dei campi utente (16 file) — chiude la priorità 1 |

Entrambi pushati su `master` e deployati in `D:\Luca Money Manager App` (v1.20.1).

**Collaudo ancora aperto:** nessuna modifica JS è mai stata eseguita (su questa macchina non
c'è alcun runtime JS: no node/deno/bun, e Java 25 ha rimosso Nashorn; `mvn compile` valida
solo il Java). Da verificare in particolare che non compaiano `&amp;` o `&#39;` visibili nei
nomi conto/categoria contenenti `&` o apostrofi.

---

## Priorità 3 — Sistematici, basso rischio

- **`renderPage()` non è async** — `js/router.js:51`
  Tutti gli `await renderPage(...)` risolvono subito. Sul refresh post-OneDrive partono due
  render concorrenti della stessa pagina: l'utente può vedere la notice "📱 3 transazioni da
  telefono" senza le transazioni.

- **22 `return` nudi in `js/pages/portfolio.js`** — righe 1105-1110, 1225-1228, 1346-1347,
  1444-1445, 1545-1547, 1711-1713, 1895-1897
  `ui-shell.js:44-50` richiede `return false` per tenere aperto il modale. Con `return` nudo
  il modale si chiude e i dati inseriti si perdono. Portfolio è l'unico modulo che non segue
  la convenzione (transactions, scheduled, categories, accounts usano tutti `return false`).

---

## Calcoli e date

- ~~**`evalAmount` accetta numeri malformati**~~ ✅ **fatto** (commit `5d34c30`)
  Confermato eseguendo la logica: `"12.34.56"` → 12.34, `"5..5"` → 5, `"1.2.3"` → 1.2,
  `"12,34,56"` → 12.34. Verificato anche il vettore: `_append` in `calculator.js` concatena il
  punto senza controllare quelli già presenti. Aggiunto un helper `num()` che valida la forma di
  ogni operando, così un operando malformato annulla l'intera espressione. Testato su 28 casi:
  gli 11 malformati ora danno `null`, i 17 legittimi restano invariati (compresi `.5`, `12.`,
  `12,5` e `allowNegative` della calcolatrice). Bonus: l'anteprima della calcolatrice mostra `—`
  invece di un importo plausibile ma sbagliato.

- ~~**Date cedola a fine mese**~~ ✅ **fatto** (commit `1b98467`)
  Confermato — riga reale **1755**, non 1739. Sei casi su dieci davano una data sbagliata: con
  scadenza al 31, febbraio diventava 3 marzo e novembre 1° dicembre. Il caso peggiore era un bond
  29/02/2028 a cedola annuale, che proponeva `2026-03-01` invece di `2027-02-28`. Applicato il
  clamp con `new Date(year, month, 0).getDate()`, la stessa regola di `_schedOccurrences`.
  Verificato anche sugli anni bisestili (29 feb nel 2028, 28 nel 2027).

- ~~**`rangeToFilter('3m'/'6m')`**~~ ✅ **fatto** (commit `64097f3`)
  Confermato. I punti col difetto erano **quattro**, non due: i preset `3m`/`6m` e anche il
  vecchio formato `Nm`/`Ny`, dove `setFullYear` traboccava allo stesso modo (29 feb −1 anno →
  1° marzo). Introdotto un helper `subMonths()` unico; `Ny` lo riusa ×12. Terza occorrenza dello
  stesso difetto dopo `_schedOccurrences` e `nextCouponDate`: ora tutte allineate. Verificato su
  14 casi, compresi il rollover d'anno e le date a metà mese che non devono cambiare.

- ~~**`parseFloat` senza normalizzazione della virgola** — tassazione cedola~~ ✅ **fatto**
  (commit `fd975af`). Confermato e corretto: il campo è `type="text" inputmode="decimal"`,
  quindi la virgola arrivava davvero a `parseFloat`, che troncava (`12,5` → 12; `0,50` → 0,
  azzerando la tassazione). Il campo gemello in `showBuyModal` normalizzava già: stesso dato,
  due comportamenti. Sostituito con `evalAmount` (che è ciò che usano tutti i campi vicini) e
  allineati anche i due campi cedola di `showBuyModal`.
  Verificati gli altri cinque `parseFloat` senza `replace` del progetto (accounts, analytics,
  budget): tutti su input `type="number"`, dove il browser non lascia passare la virgola.
  **Nessun intervento necessario** — annotati per non riaprirli.

- ~~**Proiezione fine mese esplosiva**~~ ✅ **fatto** (commit `88b838f`)
  Confermato: `expSpent / (dayOfMonth / daysInMonth)` moltiplica x31 il giorno 1, x15.5 il 2,
  x10.3 il 3. Con budget 2.000 €, la sola spesa del primo giorno (180 €) proiettava 5.580 € in
  rosso su un mese che si sarebbe chiuso a ~1.700 €, sotto budget; il giorno dopo il valore si
  dimezzava da solo senza nuove spese. Ora la proiezione compare dal giorno 5 (moltiplicatore
  ≤ x6.2), prima un trattino grigio con tooltip esplicativo. Barra e marker del banner restano
  visibili da subito: confrontano percentuali, non amplificano nulla.

- ~~**Budget "Mensile" ridistribuisce invece di tenere fisso**~~ ❌ **FALSO POSITIVO — non
  toccare** (verificato il 2026-07-30, comportamento confermato voluto dall'utente)
  `master × 12` **è** un tetto annuo da ridistribuire sui mesi liberi: è il design, non un bug.
  Il codice lo documenta in tre punti indipendenti:
  - `budget.js:286` — «Valore calcolato: (master − mesi fissati) ÷ mesi liberi.»
  - `budget.js:287` — «il restante del master verrà ridistribuito sugli altri mesi liberi»
  - `budget.js:316-320` — warning esplicito di **sforo del tetto** se la somma dei mesi fissati
    supera `master × 12`, con tolleranza 0,5 € per gli arrotondamenti. Questo controllo ha senso
    solo se `master × 12` è un tetto: è la prova che la semantica è intenzionale.

  L'agent aveva letto l'hint del modale («Stesso importo per tutti i 12 mesi») come una promessa
  violata. L'hint descrive invece il caso normale: **senza mesi fissati a mano i 12 mesi hanno
  davvero lo stesso importo**. La ridistribuzione avviene solo quando se ne fissa uno, ed è
  spiegata nel tooltip di cella. Nessuna modifica da fare, né al codice né all'hint.

---

## Perdita dati / crash

- **Duplicare una transazione suddivisa crasha** — `js/pages/transactions.js:1258`
  `duplicateTx` passa `{...tx, id: undefined}`; `JSON.stringify` scarta le chiavi `undefined`,
  quindi `Bridge.java:449` fa `.getAsInt()` su null → NPE. Gli split non vengono mai duplicati.

- **`_deleteCustomTheme` senza conferma** — `js/pages/settings.js:1459`
  Unica operazione distruttiva del file priva di `confirm()`. Il 🗑️ è l'ultimo di 4 icone
  adiacenti della stessa dimensione: un misclick cancella un tema con decine di colori.

- **Picker senza validazione del percorso** — `js/pages/settings.js:1554-1567`, `1752-1772`
  Solo `if (res.cancelled) return;`. Con `path` vuoto, `setSetting('backup.dir', undefined)`
  **persiste**: da quel momento i backup automatici falliscono in silenzio.

- **Doppio submit su errore di rete** — `js/pages/transactions.js:928`
  Se l'INSERT riesce lato SQLite ma il trasporto `cefQuery` fallisce, il modale resta aperto
  coi dati intatti. L'utente ripreme Salva → seconda transazione identica.

- **Doppi submit sui bottoni fuori dal modale** — `accounts.js:461-503`, `forecasts.js:60-62`,
  `notes.js:98-108`
  `ui-shell.js:47-54` protegge con `btn.disabled` solo `#modalConfirm`.

---

## Stato stantio / leak

> ✅ **Tutto il gruppo è stato risolto nel commit `2e0fa67`.** Dettagli sotto.

- ~~**`_schedCache` mai invalidata**~~ ✅ Confermato: `skipSched` e `registerSched` la usavano
  per ricavare `_next` e passarlo a operazioni che **scrivono** sul DB. Aggiunto `_freshSched(id)`
  che rilegge dal backend. `_showSchedCtx` continua a usare la cache: è solo un menu, e renderlo
  async sarebbe peggio del male.

- ~~**Listener `document` accumulato a ogni render**~~ ✅ Riferimento portato a livello di modulo
  e rimosso prima di registrare il nuovo; il nodo si risolve via `getElementById` invece che
  dalla closure, così non trattiene l'albero orfano.

- ~~**Istanza Quill mai distrutta**~~ ✅ Il reset è passato a `closeModal` via
  `window._resetNoteEditor`, sullo stesso schema del `_budgetDetailChart` già presente lì: vale
  ora per **ogni** chiusura, non solo dopo un salvataggio riuscito.

- ~~**`_accBalSel` mai reinizializzato**~~ ✅ Il Set viene riconciliato a ogni render: i conti
  nuovi entrano, quelli spariti escono, e se si svuota si ricade sul default. Serve un secondo
  Set (`_accBalKnown`) per distinguere un conto nuovo da uno spento a mano dall'utente,
  altrimenti ogni render riaccenderebbe le voci disattivate di proposito.

- ~~**Token ignorato nel forecast**~~ ✅ Aggiunto un contatore di generazione `_fcRunGen`. Il
  token di tab **non** basterebbe: la race è interna alla tab, fra due click sui preset
  d'orizzonte. Aggiunto anche `esc()` su `e.message`, che finiva grezzo in `innerHTML`.

- ~~**Chart.js: `innerHTML` prima di `destroy()`**~~ ✅ `destroy()` spostato prima della
  riscrittura.

- ~~**Doppio polling `dbStatus` a 2s**~~ ✅ **fatto** (commit `c851346`)
  Il report era imperciso: **non erano un duplicato da fondere**, alimentano due indicatori
  distinti (pallino titlebar in desktop, barra Apri/Chiudi in browser). In desktop girava solo
  il primo. Lo spreco reale era in modalità browser, dove partivano entrambi ma quello di
  `ui-shell` aggiornava un elemento con la titlebar a `display:none`: ora si avvia solo se
  `cefQuery` esiste. Entrambi si sospendono su `visibilitychange`. Verificato che `dbStatus`
  **non** tocchi il lock OneDrive (`Bridge.java:890` chiama solo `isOpen`/`isManuallyClosed`,
  non `ensureOpen`): il risparmio è CPU/bridge, non contesa sul file. Chiamate al minuto:
  desktop minimizzato 30→0, browser in uso 60→30, browser in background 60→0.

- ~~**7 `catch` vuoti in `_refreshFromExternalChange`**~~ ✅ (commit `2e0fa67`)
  Ora tutti loggano. Solo `importPending` mostra anche un **toast**: è l'unico canale da cui
  l'utente può accorgersi che le transazioni dal telefono non arrivano (restano in
  `pending.jsonl` senza alcun indizio). Le notice restano al solo log — un fallimento si nota
  perché la notice non compare, e un toast per ognuna sarebbe rumore.

---

## Validazione mancante

- **Trasferimenti verso conti chiusi/nascosti** — `js/pages/transactions.js:720`,
  `js/pages/scheduled.js:853`
  Il select del conto **sorgente** filtra con `isAccountActive`, quello di **destinazione** no.
  Il denaro può finire su un conto non più raggiungibile dalla UI né conteggiato nei totali.

- **Pianificata `transfer` senza conto destinazione** — `js/pages/scheduled.js:934, 954-958`
  Nessun controllo su `to_account_id` nullo o uguale a `account_id`.

- **`if (res.error)` è codice morto** — `js/pages/transactions.js:382-386`, `844-847`
  `callJava` rigetta la promise, non ritorna `{error}`. Clic sulla graffetta di un file
  spostato/cancellato non produce **nulla**: nessun toast, nessun feedback.

---

## CSS (`web/css/style.css`)

### ✅ Fatto (2026-07-29)

- **Tema `carta`: elementi invisibili per trasparenze bianche** — aggiunti override dedicati.
  La zebra passava da un rapporto di contrasto di 1.007 (invisibile: 1 valore su 255 di
  scarto) a 1.067, in linea con l'1.053 che il tema dark ha sempre avuto; il marcatore del
  mese corrente da 1.149 a 2.164. Usato un bruno `rgba(120,95,55,…)` — la stessa tinta della
  texture di carta — che scurisce invece di schiarire e lascia trasparire la grana.
- **`.tag-chip` duplicata** — consolidata in una definizione unica. I due blocchi si fondevano
  in un ibrido non voluto: vincevano padding/radius/font-size/border del secondo, ma
  background, `::before` e `.selected` restavano del primo. Tutti gli usi (Resoconti,
  Pianificate, Transazioni) sono lo stesso componente.
- **`.btn-success` duplicata** — la seconda definizione (tenue) era pensata per i `btn-xs`
  delle pianificate ma, scritta come `.btn-success` nudo, si applicava globalmente e uccideva
  quella piena usata dalla toolbar di Portfolio. Ristretta a `.btn-xs.btn-success` e derivata
  da `--income` invece del verde fisso del tema dark.
- **`.portfolio-link-banner`** — colori da `var(--accent)` via `color-mix` (già usato 42 volte
  nel file), non più il viola `#7c6cff` hardcoded.
- **`.calc-title`** — due regole consecutive unite in una.
- **Commento header** — corretto in `[data-theme="carta|petrolio|glassy"]`; `chiaro` è uno dei
  nomi storici migrati a `petrolio` (`settings.js:1147`). Aggiunta la nota sulle trasparenze.

### Rimanenti

- **Selettori orfani mai usati**: `.upcoming-card` (la classe reale è `.dash-upcoming-card`),
  `.grid-2`/`.grid-3`, `.mt-16`, `.w-full`, `.account-type`, `.report-filter-sep`.
- **`.th-balance {}`**: regola vuota, la classe è però usata.
- **`.btn-primary` con `color:#000`**: contrasto ~3.8:1 sull'accent viola, sotto la soglia
  WCAG AA per il testo normale.
- **`.sched-tab` e `.settings-tab`**: blocchi quasi identici duplicati (stesso pattern "tab
  con barretta animata"), da estrarre in una classe comune.
- **`--fs-lg` e `--font-size`** hanno lo stesso valore (13px) ma alcuni fallback dicono 14px.
- **`.modal-overlay` e `.nav-sub-flyout`** hanno entrambi `z-index:1000`.
- **Duplicati non segnalati dall'audit** (trovati con un controllo sistematico): oltre a
  `.calc-title`, esistono `.budget-cell-input` (1075/1082) e `.nav-item-icon` (509/1455). Sono
  **entrambi legittimi**: il primo separa `-moz-appearance`, il secondo definisce proprietà
  disgiunte. Nessun intervento necessario — annotati per non riaprirli a ogni controllo.
