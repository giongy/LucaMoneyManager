/* ═══════════════════════════════════════════════════════════════════════════
   LucaMoneyManager — pages/transactions.js
   Pagina Transazioni + context menu + scorciatoie da tastiera
   (estratta da app.js, stadio 7b del refactor)

   Dipendenze esterne (lazy a runtime):
   - showScheduledModal (scheduled), showReportModal (analytics)
   - closeShortcutsHelp, showShortcutsHelp (init/settings)
   - refreshAfterTxChange (router)
═══════════════════════════════════════════════════════════════════════════ */

let txFilters = { range: '30d' };

// ── Preferenze range per contesto ──────────────────────────────────────────
// Il timeframe non è più unico e globale: ogni conto ricorda il proprio range,
// più uno per la vista "Tutti i conti" (global) e uno per le notifiche (notif).
// Tutto persiste in app_settings (nessuna colonna nuova):
//   tx.range.global        → vista senza conto selezionato
//   tx.range.acct.<id>     → range memorizzato per un conto specifico
//   tx.range.notif         → range usato dalle notifiche (default 'all')
// La cache è seminata all'avvio da initApp (getSettings) e tenuta in sync ad
// ogni salvataggio, così le letture sono sincrone.
const RANGE_FALLBACK = '30d';
let _rangeSettings = {};  // { 'tx.range.global': '14d', 'tx.range.acct.3': '3m', ... }

// Popola la cache dai settings caricati all'avvio, migrando la vecchia chiave
// 'tx.range' (globale unica) in 'tx.range.global' se quest'ultima manca.
function seedRangeSettings(s) {
  _rangeSettings = {};
  Object.keys(s || {}).forEach(k => { if (k.startsWith('tx.range')) _rangeSettings[k] = s[k]; });
  if (!_rangeSettings['tx.range.global'] && s && s['tx.range']) {
    _rangeSettings['tx.range.global'] = s['tx.range'];
    api.setSetting('tx.range.global', s['tx.range']);
  }
}

// Chiave settings per il contesto (conto o vista globale).
function rangeKeyFor(accountId) {
  return accountId ? `tx.range.acct.${accountId}` : 'tx.range.global';
}

// Range preferito per un conto (o vista globale): chiave specifica → global → fallback.
function preferredRange(accountId) {
  return _rangeSettings[rangeKeyFor(accountId)] || _rangeSettings['tx.range.global'] || RANGE_FALLBACK;
}

// Range usato dalle notifiche: mostra di default TUTTO (così vedi anche tx vecchie),
// senza mai toccare le preferenze di conto/globale.
function notifRange() {
  return _rangeSettings['tx.range.notif'] || 'all';
}

// Salva il range su una chiave settings, aggiornando cache + persistenza.
function saveRangeSetting(key, range) {
  _rangeSettings[key] = range;
  api.setSetting(key, range);
}

// Totale mese corrente per conto carta di credito (mostrato in barra riepilogo).
// null se il conto filtrato non è una carta. Persiste tra le riconciliazioni.
let _txCreditMonth = null;

// Le globali _reports* e _fc* sono state spostate in pages/analytics.js (stadio 7e).
// Le funzioni _dateStr / _todayStr sono state spostate in utils.js (cleanup finale).

// Converte una chiave di range in {date_from, date_to}. Supporta i preset fissi (7d, cur_month,
// ytd, all, custom…), il formato avanzato "{n}{D|W|M|Y}..{n}{...}" e il vecchio formato Nd/Nm/Ny.
function rangeToFilter(range, from, to) {
  const today = new Date();
  const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const sub = days => { const d = new Date(today); d.setDate(d.getDate()-days); return d; };
  // Sottrae mesi limitando il giorno all'ultimo del mese di arrivo. setMonth() non satura ma
  // trabocca (31 maggio −3 mesi = 31 febbraio → 3 marzo), quindi "Ultimi 3 mesi" chiesto il
  // 31 maggio sarebbe partito dal 3 marzo escludendo 5 giorni, e il totale sarebbe cambiato
  // rispetto al giorno prima senza motivo apparente. Stessa regola di _schedOccurrences
  // (scheduled.js) e nextCouponDate (portfolio.js).
  const subMonths = n => {
    const y = today.getFullYear(), m = today.getMonth() - n;
    const lastDom = new Date(y, m + 1, 0).getDate();   // giorno 0 = ultimo del mese precedente
    return new Date(y, m, Math.min(today.getDate(), lastDom));
  };
  switch (range) {
    case '7d':        return { date_from: fmt(sub(6)),  date_to: fmt(today) };
    case '14d':       return { date_from: fmt(sub(13)), date_to: fmt(today) };
    case '30d':       return { date_from: fmt(sub(29)), date_to: fmt(today) };
    case '3m':        return { date_from: fmt(subMonths(3)), date_to: fmt(today) };
    case '6m':        return { date_from: fmt(subMonths(6)), date_to: fmt(today) };
    case 'cur_month': { const d=new Date(today.getFullYear(), today.getMonth(), 1);
                        return { date_from: fmt(d), date_to: fmt(today) }; }
    case 'prev_month':{ const d=new Date(today.getFullYear(), today.getMonth()-1, 1);
                        const e=new Date(today.getFullYear(), today.getMonth(), 0);
                        return { date_from: fmt(d), date_to: fmt(e) }; }
    case 'ytd':       return { date_from: `${today.getFullYear()}-01-01`, date_to: fmt(today) };
    case 'last_year': { const y=today.getFullYear()-1;
                        return { date_from: `${y}-01-01`, date_to: `${y}-12-31` }; }
    case 'all':       return {};
    case 'custom':    return { date_from: from||'', date_to: to||'' };
    default: {
      // ── Formato avanzato preset: '{int}{unit}..{int}{unit}' es. -7D..0D, 0Y..0Y
      const anchor = (off, unit, side) => {
        switch(unit) {
          case 'D': { const d=new Date(today); d.setDate(d.getDate()+off); return fmt(d); }
          case 'W': { const d=new Date(today); d.setDate(d.getDate()+off*7);
                      const dow=d.getDay();
                      if (side==='from') d.setDate(d.getDate()-(dow===0?6:dow-1));
                      else               d.setDate(d.getDate()+(dow===0?0:7-dow));
                      return fmt(d); }
          case 'M': { const r=new Date(today.getFullYear(), today.getMonth()+off, 1);
                      if (side==='to') r.setMonth(r.getMonth()+1, 0);
                      return fmt(r); }
          case 'Y': { const y=today.getFullYear()+off;
                      return side==='from' ? `${y}-01-01` : `${y}-12-31`; }
        }
      };
      const pa = range && range.match(/^(-?\d+)([DWMY])\.\.(-?\d+)([DWMY])$/);
      if (pa) return { date_from: anchor(+pa[1],pa[2],'from'), date_to: anchor(+pa[3],pa[4],'to') };
      // ── Vecchio formato semplice (compatibilità): Nd/Nm/Ny
      const mD = range && range.match(/^(\d+)d$/);
      const mM = range && range.match(/^(\d+)m$/);
      const mY = range && range.match(/^(\d+)y$/);
      if (mD) { const n=parseInt(mD[1]); return { date_from: fmt(sub(n-1)), date_to: fmt(today) }; }
      // Stesso clamp dei preset 3m/6m: anche qui setMonth/setFullYear traboccherebbero
      // (il 29 febbraio −1 anno darebbe il 1° marzo invece del 28 febbraio).
      if (mM) { return { date_from: fmt(subMonths(parseInt(mM[1]))),      date_to: fmt(today) }; }
      if (mY) { return { date_from: fmt(subMonths(parseInt(mY[1]) * 12)), date_to: fmt(today) }; }
      return { date_from: fmt(sub(29)), date_to: fmt(today) };
    }
  }
}

// ─── Range centralizzati ──────────────────────────────────────────────────────

const RANGE_DEFAULTS = [
  {v:'7d',        l:'Ultimi 7 giorni'},
  {v:'14d',       l:'Ultime 2 settimane'},
  {v:'30d',       l:'Ultimi 30 giorni'},
  {v:'cur_month', l:'Mese corrente a oggi'},
  // Mese intero (fino all'ultimo giorno, date future comprese): nessun caso dedicato in
  // rangeToFilter, '0M..0M' è già il formato avanzato "inizio mese corrente → fine mese corrente".
  {v:'0M..0M',    l:'Mese corrente (intero)'},
  {v:'prev_month',l:'Mese precedente'},
  {v:'3m',        l:'Ultimi 3 mesi'},
  {v:'6m',        l:'Ultimi 6 mesi'},
  {v:'ytd',       l:'Da inizio anno'},
  {v:'last_year', l:'Anno scorso'},
  {v:'all',       l:'Tutto'},
  {v:'custom',    l:'Personalizza…'},
];

// Costruisce le <option> per un select di range.
// presets: array {range_key, label} dal DB; includeEmpty: aggiunge voce "Nessun filtro"; selected: valore corrente
function buildRangeOptions(presets, includeEmpty, selected) {
  const list = [...RANGE_DEFAULTS];
  if (presets && presets.length) {
    // Inserisce i preset prima di 'all' e 'custom'.
    // Scarta quelli che ripetono una chiave già predefinita (es. un '0M..0M' creato a mano
    // in Periodi): due <option> con lo stesso value mostrerebbero due voci apparentemente
    // diverse per lo stesso periodo, e la selezione ricadrebbe sempre sulla prima.
    const known = new Set(RANGE_DEFAULTS.map(o => o.v));
    const idx = list.findIndex(o => o.v === 'all');
    list.splice(idx, 0, ...presets.filter(p => !known.has(p.range_key))
                               .map(p => ({v: p.range_key, l: p.label})));
  }
  const opts = list.map(o => `<option value="${o.v}"${selected===o.v?' selected':''}>${o.l}</option>`).join('');
  return includeEmpty ? `<option value="">Nessun filtro data</option>${opts}` : opts;
}

let txSort       = { col: 'date', dir: 'asc' };
let txCache      = [];
let _selectedTxId = null;
let _selectedTxIds = new Set();  // multi-select per bulk operations

// Apre la pagina Transazioni filtrata su un conto specifico (da sidebar/dashboard).
// Carica il range memorizzato per quel conto (fallback: global → 30d).
function navigateToAccountTx(accountId) {
  const range = preferredRange(accountId);
  txFilters = { range, ...rangeToFilter(range), account_id: String(accountId) };
  if (currentPage === 'transactions') renderTransactions();
  else navigate('transactions');
}

// Apre la pagina Transazioni filtrata sul mese corrente e su una o più categorie
// (dal widget "Uscite del mese corrente" della dashboard: la singola voce passa un id,
// la riga di coda "Altre N categorie" passa l'array degli id che aggrega; dal Confronto Periodi:
// la riga macro passa macro + figlie, la riga di dettaglio il solo id della categoria).
// Senza from/to il range è '0M..0M' (mese intero) e non 'cur_month': il widget somma TUTTO il
// mese, comprese le date future (pianificate già registrate), mentre 'cur_month' si ferma a oggi
// — i due totali non coinciderebbero e la pagina sembrerebbe aver perso delle righe.
// Con from/to (Confronto Periodi) il range diventa 'custom' sulle due date esatte del periodo
// cliccato: la barra dei filtri le mostra e restano modificabili a mano.
function navigateToCategoryTx(cat, from, to) {
  const ids = Array.isArray(cat) ? cat.map(Number) : null;
  const range = (from && to) ? 'custom' : '0M..0M';
  txFilters = {
    range, ...rangeToFilter(range, from, to),
    ...(ids ? { category_ids: ids } : { category_id: String(cat) }),
  };
  if (currentPage === 'transactions') renderTransactions();
  else navigate('transactions');
}

// Apre la pagina Transazioni isolando una singola transazione (da click su una riga altrove).
function navigateToTx(id) {
  txFilters = { range: txFilters.range, id };
  if (currentPage === 'transactions') renderTransactions();
  else navigate('transactions');
}

// Disegna la pagina Transazioni: barra filtri (range, conto, categoria, tag, ricerca, allegati),
// header con riepilogo e la tabella; collega tutti gli handler di filtro/ordinamento/selezione.
async function renderTransactions() {
  _selectedTxId = null;
  const pg = document.getElementById('pg-transactions');
  const [categories, accounts, tags, rangePresets] = await Promise.all([api.getCategories(), api.getAccounts(), api.getTags(), api.getRangePresets()]);

  pg.innerHTML = `
    <div style="flex-shrink:0;padding:16px 16px 0;background:var(--bg)">
      <div class="filter-bar" style="margin-bottom:12px">
        <select class="form-control" id="txRange">
          ${buildRangeOptions(rangePresets, false, txFilters.range||'30d')}
        </select>
        <input type="date" class="form-control" id="txFrom" value="${txFilters.date_from||''}"
               style="display:${txFilters.range==='custom'?'':'none'}">
        <input type="date" class="form-control" id="txTo"   value="${txFilters.date_to||''}"
               style="display:${txFilters.range==='custom'?'':'none'}">
        <select class="form-control" id="txType">
          <option value="">Tutti i tipi</option>
          <option value="income"   ${txFilters.type==='income'?'selected':''}>Entrate</option>
          <option value="expense"  ${txFilters.type==='expense'?'selected':''}>Uscite</option>
          <option value="transfer" ${txFilters.type==='transfer'?'selected':''}>Trasferimenti</option>
        </select>
        <select class="form-control" id="txAccount">
          <option value="">Tutti i conti</option>
          ${accounts.filter(isAccountVisible).map(a=>`<option value="${a.id}" ${String(a.id)===String(txFilters.account_id)?'selected':''}>${a.icon} ${a.name}</option>`).join('')}
        </select>
        <select class="form-control" id="txCategory">
          ${/* Selezione multipla (arrivo dalla riga "Altre N categorie" del widget dashboard):
                il select è a scelta singola e senza questa voce mostrerebbe "Tutte le categorie"
                mentre la tabella è filtrata — sembrerebbe un elenco incompleto senza motivo.
                Gli id stanno nel data-ids e non in txFilters: così la voce resta riselezionabile
                anche dopo essere passati per "Tutte le categorie". */''}
          ${txFilters.category_ids?.length
            ? `<option value="__multi__" data-ids="${txFilters.category_ids.join(',')}" selected>🗂️ ${txFilters.category_ids.length} categorie minori</option>`
            : ''}
          <option value="">Tutte le categorie</option>
          ${(() => {
            const parents = categories.filter(c => !c.parent_id && c.type !== 'transfer');
            const html = parents.map(p => {
              const children = categories.filter(c => String(c.parent_id) === String(p.id));
              if (!children.length) return `<option value="${p.id}" ${String(p.id)===String(txFilters.category_id)?'selected':''}>${p.icon||''} ${p.name}</option>`;
              return `<optgroup label="${p.icon||''} ${p.name}">${children.map(c=>`<option value="${c.id}" ${String(c.id)===String(txFilters.category_id)?'selected':''}>${c.icon||''} ${c.name}</option>`).join('')}</optgroup>`;
            }).join('');
            // La categoria di sistema Trasferimento va in fondo, staccata dalle categorie utente:
            // non è una voce di spesa/entrata ma serve per isolare i giroconti nella lista.
            const tr = categories.find(c => c.type === 'transfer');
            return html + (tr ? `<option value="${tr.id}" ${String(tr.id)===String(txFilters.category_id)?'selected':''}>${tr.icon||''} ${tr.name}</option>` : '');
          })()}
        </select>
        <select class="form-control" id="txTag">
          <option value="">Tutti i tag</option>
          ${tags.map(t=>`<option value="${t.id}" ${String(t.id)===String(txFilters.tag_id)?'selected':''}>${esc(t.name)}</option>`).join('')}
        </select>
        <select class="form-control" id="txHasAttachment">
          <option value="">Tutti (attach.)</option>
          <option value="1" ${txFilters.has_attachment==='1'?'selected':''}>📎 Con allegato</option>
          <option value="0" ${txFilters.has_attachment==='0'?'selected':''}>Senza allegato</option>
        </select>
        <input class="form-control" id="txSearch" value="${txFilters.search||''}" placeholder="🔍 Cerca..." style="min-width:160px">
        <button class="btn btn-ghost" title="Salva filtri correnti come resoconto" onclick="saveTxFiltersAsReport()" style="white-space:nowrap;flex-shrink:0">💾 Salva filtro</button>
      </div>
    </div>
    <div id="txSummaryBar" style="flex-shrink:0;padding:4px 16px 10px;background:var(--bg);display:flex;align-items:center;gap:12px;font-size:13px;color:var(--txt2)"></div>
    <div id="txBulkBar" style="display:none;align-items:center;gap:10px;padding:8px 14px;margin-bottom:8px;background:var(--bg3);border-radius:8px;font-size:13px">
      <span><strong id="txBulkCount">0</strong> selezionate</span>
      <div style="width:1px;height:18px;background:var(--border);margin:0 4px"></div>
      <button class="btn btn-ghost btn-sm" onclick="bulkReconcile(1)" title="Segna come conciliate">✅ Riconcilia</button>
      <button class="btn btn-ghost btn-sm" onclick="bulkReconcile(0)" title="Segna come da verificare">🔲 Da verificare</button>
      <button class="btn btn-ghost btn-sm" onclick="bulkDelete()" style="color:var(--expense)" title="Elimina tutte">🗑️ Elimina</button>
      <button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="clearTxSelection()" title="Pulisci selezione">✕</button>
    </div>
    <div id="txScrollWrap" style="flex:1;overflow:auto;padding:0 16px 0">
      <div class="card">
        <table id="txTable"><thead><tr>
            <th class="th-select" style="width:32px"><input type="checkbox" id="txSelectAll" onclick="toggleTxSelectAll(this.checked)" title="Seleziona tutte le visibili"></th>
            <th class="th-sort th-sort-active" data-col="date"        onclick="_txSortBy('date')">Data<span class="sort-ind">▲</span></th>
            <th class="th-reconciled" id="thReconciled" title="Stato conciliazione">Stato</th>
            <th class="th-portfolio" title="Collegata al portafoglio">📈</th>
            <th class="th-attach" title="Allegato">📎</th>
            <th class="th-sort" data-col="account"     onclick="_txSortBy('account')">Conto<span class="sort-ind"></span></th>
            <th class="th-sort" data-col="type"        onclick="_txSortBy('type')">Tipo<span class="sort-ind"></span></th>
            <th class="th-tags">Tag</th>
            <th class="th-sort" data-col="category"    onclick="_txSortBy('category')">Categoria<span class="sort-ind"></span></th>
            <th class="th-sort" data-col="description" onclick="_txSortBy('description')">Descrizione<span class="sort-ind"></span></th>
            <th class="th-sort text-right" data-col="amount" onclick="_txSortBy('amount')">Importo<span class="sort-ind"></span></th>
            <th class="text-right th-balance" id="thBalance" style="display:none">Saldo</th>
            <th></th>
          </tr></thead><tbody id="txBody"></tbody></table>
      </div>
      <div class="tx-add-group">
        <button class="btn btn-add-income"   id="btnAddIncome">📥 Entrata</button>
        <button class="btn btn-add-expense"  id="btnAddExpense">📤 Uscita</button>
        <button class="btn btn-add-transfer" id="btnAddTransfer">🔁 Trasferimento</button>
      </div>
    </div>`;

  const applyFilters = () => {
    const range = document.getElementById('txRange').value;
    const from  = document.getElementById('txFrom').value;
    const to    = document.getElementById('txTo').value;
    const accountId = document.getElementById('txAccount').value || undefined;
    // Voce "N categorie minori": non è una categoria vera, gli id viaggiano nel suo data-ids.
    // Va letta qui e non da txFilters perché toccare un altro filtro (tipo, conto, ricerca…)
    // ricostruisce txFilters da zero: senza questo la selezione multipla sparirebbe al primo
    // ritocco di qualunque altro filtro.
    const catSel  = document.getElementById('txCategory');
    const catOpt  = catSel.selectedOptions[0];
    const multiIds = catSel.value === '__multi__' && catOpt?.dataset.ids
      ? catOpt.dataset.ids.split(',').map(Number) : null;
    txFilters = {
      range,
      ...rangeToFilter(range, from, to),
      type:        document.getElementById('txType').value,
      account_id:  accountId,
      ...(multiIds ? { category_ids: multiIds } : {}),
      category_id: multiIds ? undefined : (catSel.value || undefined),
      tag_id:         document.getElementById('txTag').value            || undefined,
      has_attachment: document.getElementById('txHasAttachment').value  || undefined,
      search:         document.getElementById('txSearch').value,
    };
    // Ricorda il range sulla chiave del contesto corrente (conto selezionato o global).
    saveRangeSetting(rangeKeyFor(accountId), range);
    loadTxRows(categories, accounts);
  };

  document.getElementById('txRange').addEventListener('change', () => {
    const isCustom = document.getElementById('txRange').value === 'custom';
    document.getElementById('txFrom').style.display = isCustom ? '' : 'none';
    document.getElementById('txTo').style.display   = isCustom ? '' : 'none';
    applyFilters();
  });
  let _txSearchTimer;
  ['txType','txAccount','txCategory','txTag','txHasAttachment'].forEach(id =>
    document.getElementById(id).addEventListener('change', applyFilters));
  ['txFrom','txTo'].forEach(id =>
    document.getElementById(id).addEventListener('change', applyFilters));
  document.getElementById('txSearch').addEventListener('input', () => {
    clearTimeout(_txSearchTimer);
    _txSearchTimer = setTimeout(applyFilters, 300);
  });

  document.getElementById('btnAddIncome').onclick   = () => showTxModal(null, categories, accounts, 'income',   tags);
  document.getElementById('btnAddExpense').onclick  = () => showTxModal(null, categories, accounts, 'expense',  tags);
  document.getElementById('btnAddTransfer').onclick = () => showTxModal(null, categories, accounts, 'transfer', tags);

  // Ensure date range is resolved into date_from/date_to before loading rows (skip if filtering by id)
  if (!txFilters.id) txFilters = { ...txFilters, ...rangeToFilter(txFilters.range || '30d', txFilters.date_from, txFilters.date_to) };
  await loadTxRows(categories, accounts);
  // Thead sticky a top:0 dentro txScrollWrap (che è il container scroll)
  document.querySelectorAll('#txTable thead th').forEach(th => {
    th.style.position = 'sticky';
    th.style.top = '0';
    th.style.zIndex = '5';
    th.style.background = 'var(--bg2)';
  });
  // Scroll to bottom (le tx sono ordinate per data asc, le più recenti sono in fondo)
  const scrollWrap = document.getElementById('txScrollWrap');
  if (scrollWrap) requestAnimationFrame(() => { scrollWrap.scrollTop = scrollWrap.scrollHeight; });
}

// Salva i filtri correnti come Resoconto: mappa txFilters nel formato report e apre il modale precompilato.
function saveTxFiltersAsReport() {
  // Mappa txFilters nel formato usato dai resoconti, poi apre il modal già compilato
  const f = {};
  // Periodo: salva range dinamico; per custom salva le date statiche
  if (txFilters.range === 'custom') {
    if (txFilters.date_from) f.date_from = txFilters.date_from;
    if (txFilters.date_to)   f.date_to   = txFilters.date_to;
    f.range = 'custom';
  } else if (txFilters.range) {
    f.range = txFilters.range;
  }
  if (txFilters.type)         f.type        = txFilters.type;
  if (txFilters.account_id)   f.account_id  = parseInt(txFilters.account_id);
  if (txFilters.category_id)  f.category_id = parseInt(txFilters.category_id);
  // I resoconti hanno una sola categoria (il loro modale ha un select singolo): una selezione
  // multipla non è rappresentabile e verrebbe persa in silenzio, salvando un resoconto più
  // largo di quello che si vede a schermo. Meglio dirlo.
  if (txFilters.category_ids?.length)
    toast('Il filtro su più categorie non si può salvare in un resoconto: verrà salvato senza filtro categoria', 'error');
  if (txFilters.tag_id)        f.tag_ids        = [parseInt(txFilters.tag_id)];
  if (txFilters.search)        f.search         = txFilters.search;
  if (txFilters.has_attachment) f.has_attachment = txFilters.has_attachment;
  _reportFilters = f;
  showReportModal();
}

// Disegna la barra riepilogo: saldo conto (se filtrato) + entrate/uscite/netto delle righe filtrate.
function _renderTxSummaryBar(rows, summary) {
  const el = document.getElementById('txSummaryBar');
  if (!el) return;
  // Stessa regola con cui la tabella mostra l'importo di riga (vedi `displayAmt` in
  // renderTxBodyAndHeaders): filtrando per categoria, di una transazione divisa conta la sola
  // quota che ricade nel filtro, non l'importo pieno. Sommare `amount` faceva dire alla barra
  // un totale diverso da quello delle righe che ha sopra — e diverso dal numero da cui si è
  // arrivati (Confronto Periodi, widget della dashboard), che la quota la conta giusta.
  // `filtered_split_amount` esiste SOLO quando c'è un filtro categoria: senza, si ricade
  // sull'importo pieno e la barra si comporta esattamente come prima.
  const amtOf = t => (t.split_count > 0 && t.filtered_split_amount != null) ? t.filtered_split_amount : t.amount;
  const income  = rows.filter(t => t.type === 'income').reduce((s,t) => s + amtOf(t), 0);
  const expense = rows.filter(t => t.type === 'expense').reduce((s,t) => s + amtOf(t), 0);
  const net     = income - expense;
  const sep     = `<span style="color:var(--txt3);margin:0 4px">|</span>`;
  const val     = (v, id='') => `<span ${id?`id="${id}"`:''} style="color:${v>=0?'var(--income)':'var(--expense)'}">${fmt.currency(v)}</span>`;
  const ccPart = _txCreditMonth
    ? `<span style="color:var(--txt3);font-size:11px">💳 ${_txCreditMonth.label}: ${fmt.currency(_txCreditMonth.total)}</span>`
    : '';
  const accPart = summary
    ? `<span>Saldo <span id="txhsBal" style="color:${summary.balance>=0?'var(--income)':'var(--expense)'}">${fmt.currency(summary.balance)}</span></span>
       <span style="color:var(--txt3);font-size:11px">✅ ${fmt.currency(summary.reconciled_balance)}</span>${ccPart}${sep}`
    : '';
  el.innerHTML = `${accPart}
    <span style="color:var(--txt3)">Saldo filtrato:</span>
    <span>Entrate ${val(income)}</span>${sep}
    <span>Uscite <span style="color:var(--expense)">${fmt.currency(expense)}</span></span>${sep}
    <span>Netto ${val(net)}</span>`;
}

// Carica le transazioni filtrate (+ saldo conto e totale mese carta), aggiorna la cache e la tabella.
async function loadTxRows(categories, accounts) {
  const hasAccount = txFilters.account_id && String(txFilters.account_id).trim() !== '';
  const acc = hasAccount ? accounts.find(a => a.id === parseInt(txFilters.account_id)) : null;
  const filtersWithSort = { ...txFilters, sort_col: txSort.col, sort_dir: txSort.dir };
  const [rows, summary] = await Promise.all([
    api.getTransactions(filtersWithSort),
    hasAccount ? api.getAccountSummary(parseInt(txFilters.account_id)) : Promise.resolve(null),
  ]);
  txCache = rows;
  // La selezione multipla vale solo per le righe correntemente caricate: cambiando filtro,
  // ricerca, range o ordinamento gli id selezionati non sono più a schermo e le azioni
  // multiple agirebbero su transazioni che l'utente non vede più.
  _selectedTxIds.clear();
  // Mostra/nascondi colonna Saldo
  const thBal = document.getElementById('thBalance');
  if (thBal) thBal.style.display = hasAccount ? '' : 'none';
  // Per le carte di credito mostra anche il totale del mese corrente (come in dashboard)
  if (acc && acc.type === 'credit') {
    const now = new Date();
    const total = await _creditCardMonthTotal(acc.id, now.getFullYear(), now.getMonth() + 1);
    _txCreditMonth = { label: now.toLocaleString('it-IT', { month: 'long' }), total };
  } else {
    _txCreditMonth = null;
  }
  _renderTxSummaryBar(rows, summary);
  renderTxBodyAndHeaders();
}

// Apre l'allegato di una transazione tramite l'app di sistema.
window.openTxAttachment = async el => {
  const path = decodeURIComponent(el.dataset.path);
  const res = await api.openAttachment(path);
  if (res.error) toast(res.error, 'error');
};

// Cambia colonna/direzione di ordinamento e ricarica dal backend (ordina includendo i join).
window._txSortBy = async col => {
  txSort.dir = txSort.col === col ? (txSort.dir === 'asc' ? 'desc' : 'asc') : 'desc';
  txSort.col = col;
  // Ricarica dal backend con il nuovo sort (il backend ordina correttamente includendo i join)
  const [categories, accounts] = await Promise.all([api.getCategories(), api.getAccounts()]);
  await loadTxRows(categories, accounts);
};

// Aggiorna la barra azioni multiple (conteggio selezionati, visibilità, stato del "Seleziona tutto").
function _updateBulkBar() {
  const bar = document.getElementById('txBulkBar');
  const cnt = document.getElementById('txBulkCount');
  if (!bar) return;
  const n = _selectedTxIds.size;
  bar.style.display = n > 0 ? 'flex' : 'none';
  if (cnt) cnt.textContent = n;
  // Aggiorna stato del "Select all" in base alle righe visibili
  const selAll = document.getElementById('txSelectAll');
  if (selAll) {
    const visibleIds = txCache.map(t => t.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => _selectedTxIds.has(id));
    selAll.checked = allSelected;
    selAll.indeterminate = !allSelected && visibleIds.some(id => _selectedTxIds.has(id));
  }
}

// Selezione multipla: singola riga / tutte le righe visibili / azzera selezione.
window.toggleTxSelected = (id, checked) => {
  if (checked) _selectedTxIds.add(id);
  else         _selectedTxIds.delete(id);
  _updateBulkBar();
};

window.toggleTxSelectAll = checked => {
  if (checked) txCache.forEach(t => _selectedTxIds.add(t.id));
  else         txCache.forEach(t => _selectedTxIds.delete(t.id));
  renderTxBodyAndHeaders();
};

window.clearTxSelection = () => {
  _selectedTxIds.clear();
  renderTxBodyAndHeaders();
};

// Azione multipla: concilia/de-concilia tutte le transazioni selezionate, poi aggiorna saldo e tabella.
window.bulkReconcile = async newVal => {
  // Solo le righe correntemente visibili: mai agire su selezioni relative a un filtro precedente.
  const ids = [..._selectedTxIds].filter(id => txCache.some(t => t.id === id));
  if (!ids.length) return;
  // Esegue in parallelo (rate-limit naturale del bridge JCEF). allSettled e non all: un
  // fallimento parziale non deve lasciare la cache disallineata dal DB senza avvisare.
  const results = await Promise.allSettled(ids.map(id => api.updateTransactionReconciled(id, newVal === 1)));
  let failed = 0;
  results.forEach((r, i) => {
    if (r.status === 'rejected') { failed++; return; }
    const tx = txCache.find(t => t.id === ids[i]);
    if (tx) tx.reconciled = newVal;
  });
  const done = ids.length - failed;
  if (failed) toast(`Aggiornate ${done}, fallite ${failed}`, 'error');
  else toast(`${done} transazion${done===1?'e':'i'} ${newVal ? 'riconciliat' : 'da verificar'}${done===1?'a':'e'}`);
  _selectedTxIds.clear();
  renderTxBodyAndHeaders();
  // Ricarica saldo conto se filtro attivo
  const hasAccount = txFilters.account_id && String(txFilters.account_id).trim() !== '';
  if (hasAccount) {
    const summary = await api.getAccountSummary(parseInt(txFilters.account_id));
    _renderTxSummaryBar(txCache, summary);
  }
  refreshNotices();  // il badge 🔔 deve riflettere le transazioni appena verificate
};

// Azione multipla: elimina tutte le transazioni selezionate previa conferma.
window.bulkDelete = async () => {
  // Solo le righe correntemente visibili: mai eliminare in base a una selezione ormai fuori filtro.
  const ids = [..._selectedTxIds].filter(id => txCache.some(t => t.id === id));
  if (!ids.length) return;
  const ok = await confirm('Elimina transazioni', `Eliminare definitivamente ${ids.length} transazion${ids.length===1?'e':'i'}? L'operazione non è reversibile.`);
  if (!ok) return;
  let failed = 0;
  for (const id of ids) {
    try { await api.deleteTransaction(id); }
    catch { failed++; }
  }
  _selectedTxIds.clear();
  if (failed) toast(`Eliminate ${ids.length - failed}, fallite ${failed}`, 'error');
  else        toast(`${ids.length} transazion${ids.length===1?'e':'i'} eliminat${ids.length===1?'a':'e'}`);
  refreshAfterTxChange();
};

// Disegna le righe della tabella transazioni (da txCache) e aggiorna gli indicatori di ordinamento
// negli header. Gestisce colonna saldo, righe colorate, allegati, split filtrati e selezione multipla.
function renderTxBodyAndHeaders() {
  document.querySelectorAll('#txTable th[data-col]').forEach(th => {
    const active = txSort.col === th.dataset.col;
    th.classList.toggle('th-sort-active', active);
    const ind = th.querySelector('.sort-ind');
    if (ind) ind.textContent = active ? (txSort.dir === 'asc' ? '▲' : '▼') : '';
  });
  const tbody = document.getElementById('txBody');
  if (!tbody) return;
  const showBalance = txFilters.account_id && String(txFilters.account_id).trim() !== '';
  const sorted = txCache;  // backend già ordinato via sort_col/sort_dir
  const colCount = (showBalance ? 12 : 11) + 1;  // +1 per checkbox column
  // Nome categoria filtrata (per mostrare la voce giusta negli split filtrati).
  // esc() perché viene da textContent (già decodificato) e torna dentro innerHTML: senza,
  // un nome categoria con < o & verrebbe re-interpretato come markup.
  // Con più categorie filtrate insieme non esiste UNA voce del select da mostrare: il nome
  // giusto è quello dello split che ha fatto match, che il backend restituisce riga per riga.
  const filterCatLabel = esc(txFilters.category_id
    ? document.querySelector(`#txCategory option[value="${txFilters.category_id}"]`)?.textContent?.trim() || ''
    : '');
  const splitCatLabel = t => esc(t.filtered_split_category_name || '') || filterCatLabel;
  tbody.innerHTML = sorted.length ? sorted.map(t => {
    const isRec = t.reconciled == 1;
    const isSel = t.id === _selectedTxId;
    const balCell = showBalance && t.balance != null
      ? `<td class="text-right tx-balance ${t.balance >= 0 ? 'positive' : 'negative'}">${fmt.currency(t.balance)}</td>`
      : (showBalance ? '<td></td>' : '');
    const bgStyle = t.color ? `style="background:${esc(t.color)}40"` : '';
    // Se filtro per categoria e la transazione è uno split che matcha → mostra solo la quota filtrata
    const isSplitFiltered = t.split_count > 0 && t.filtered_split_amount != null;
    const displayAmt = isSplitFiltered ? t.filtered_split_amount : t.amount;
    const isMultiSel = _selectedTxIds.has(t.id);
    return `
    <tr data-tx-id="${t.id}" class="${t.color ? 'tx-colored' : ''}${isSel ? ' tx-selected' : ''}${!isRec ? ' tx-unreconciled' : ''}${isMultiSel ? ' tx-multi-selected' : ''}" ${bgStyle} ondblclick="editTx(${t.id})">
      <td class="td-select"><input type="checkbox" class="tx-select-cb" onclick="event.stopPropagation()" onchange="toggleTxSelected(${t.id}, this.checked)" ${isMultiSel ? 'checked' : ''}></td>
      <td>${fmt.date(t.date)}</td>
      <td class="td-reconciled">
        <button class="btn-reconcile ${isRec ? 'reconciled' : 'unreconciled'}" title="${isRec ? 'Conciliata [R] – clicca per annullare' : 'Da verificare [V] – clicca per conciliare'}" onclick="toggleReconciled(${t.id}, ${isRec ? 0 : 1})">
          ${isRec ? '✅' : '🔲'}
        </button>
      </td>
      <td class="td-portfolio">${t.portfolio_id ? `<span class="tx-portfolio-badge" title="Collegata al portafoglio — clicca per lo storico della posizione" onclick="event.stopPropagation();showPortfolioHistory(${t.portfolio_id})">📈</span>` : ''}</td>
      <td class="td-attach">${t.attachment_path ? `<span class="tx-attach-badge" title="${esc(t.attachment_path)}" data-path="${encodeURIComponent(t.attachment_path)}" onclick="event.stopPropagation();openTxAttachment(this)">📎</span>` : ''}</td>
      <td>${esc(t.account_name||'-')}${t.to_account_name?` → ${esc(t.to_account_name)}`:''}</td>
      <td><span class="badge badge-${t.type}">${t.type==='income'?'Entrata':t.type==='expense'?'Uscita':'Trasferimento'}</span></td>
      <td class="td-tags">${(t.tags&&t.tags.length)?t.tags.map(tg=>`<span class="tag-inline" style="--tc:${esc(tg.color)}">${esc(tg.name)}</span>`).join(''):''}</td>
      <td>${isSplitFiltered
        ? `<span class="cat-chip" style="opacity:.8;font-size:11px" title="${esc(t.splits_summary||'')}">${splitCatLabel(t)} <span style="opacity:.6;font-size:10px">(÷ split)</span></span>`
        : t.split_count > 0
          ? `<span class="cat-chip" style="opacity:.8;font-size:11px" title="${esc(t.splits_summary||'')}">÷ ${esc(t.splits_summary||`${t.split_count} voci`)}</span>`
          : `<span class="ico">${esc(t.category_icon||'')}</span> ${esc(t.parent_category_name ? t.parent_category_name + ' : ' + t.category_name : (t.category_name||'-'))}`
      }</td>
      <td class="td-main"><div class="td-main-clip">${esc(t.description||'')}${isSplitFiltered ? ` <span style="font-size:10px;opacity:.5" title="Totale transazione: ${fmt.currency(t.amount)}">(tot. ${fmt.currency(t.amount)})</span>` : ''}</div></td>
      <td class="text-right amount-${t.type}">${t.type==='expense'?'-':''}${fmt.currency(displayAmt)}</td>
      ${balCell}
      <td class="td-actions">
        <button class="btn btn-ghost btn-icon" onclick="editTx(${t.id})">✏️</button>
        <button class="btn btn-ghost btn-icon" onclick="deleteTx(${t.id})">🗑️</button>
      </td>
    </tr>`;
  }).join('') :
    `<tr><td colspan="${colCount}" style="text-align:center;padding:40px;color:var(--txt3)">Nessuna transazione trovata</td></tr>`;
  _updateBulkBar();
}

// Concilia/de-concilia una singola transazione, aggiornando la riga e (se serve) il saldo conto.
window.toggleReconciled = async (id, newVal) => {
  await api.updateTransactionReconciled(id, newVal === 1);
  // Aggiorna solo la riga in cache senza ricaricare tutto
  const tx = txCache.find(t => t.id === id);
  if (tx) tx.reconciled = newVal;
  renderTxBodyAndHeaders();
  // Aggiorna i valori nell'header senza re-render completo
  const hasAccount = txFilters.account_id && String(txFilters.account_id).trim() !== '';
  if (hasAccount) {
    const summary = await api.getAccountSummary(parseInt(txFilters.account_id));
    _renderTxSummaryBar(txCache, summary);
  }
  refreshNotices();  // il badge 🔔 deve riflettere la transazione appena verificata
};

// Disegna una voce del picker: "Parent › 🏠 Foglia" col percorso in grigio, così l'occhio
// cade sulla foglia — che è quella che si sceglie — invece che sul prefisso ripetuto su
// ogni riga. Escapa qui perché il risultato finisce in innerHTML.
function _catItemHtml(label) {
  const i = label.indexOf(' › ');
  return i < 0 ? esc(label)
    : `<span class="cat-picker-path">${esc(label.slice(0, i))} ›</span> ${esc(label.slice(i + 3))}`;
}

// Inizializza un selettore di categoria ad autocomplete: input testuale + lista filtrabile
// con navigazione da tastiera. Espone input._catPickerSetItems(items, keepId) per (ri)popolarlo.
// Scrive l'id scelto nell'input nascosto hiddenId.
function initCatPicker(inputId, hiddenId, listId) {
  const input  = document.getElementById(inputId);
  const hidden = document.getElementById(hiddenId);
  const list   = document.getElementById(listId);
  if (!input || !hidden || !list) return;

  let items = [], activeIdx = -1;

  const hide = () => { list.style.display = 'none'; activeIdx = -1; };

  // Sceglie da che lato aprire la lista e quanto può allargarsi, misurando lo spazio
  // dentro il modale. Serve perché il picker sta nella colonna destra (Transazioni) e
  // nella sinistra (Pianificate): un lato fisso in CSS sborda in uno dei due casi, e
  // .modal-body è scrollabile — quindi ritaglia la parte fuori invece di lasciarla
  // uscire, mangiandosi l'inizio dei nomi di categoria.
  const place = () => {
    const box = list.closest('.modal-body') || document.documentElement;
    const br = box.getBoundingClientRect(), ir = input.getBoundingClientRect();
    const PAD = 10;
    const spaceRight = br.right - PAD - ir.left;   // aprendo a destra dal bordo sinistro dell'input
    const spaceLeft  = ir.right - (br.left + PAD); // aprendo a sinistra dal bordo destro dell'input
    const toRight = spaceRight >= spaceLeft;
    list.style.left  = toRight ? '0'    : 'auto';
    list.style.right = toRight ? 'auto' : '0';
    list.style.maxWidth = Math.round(Math.min(520, Math.max(ir.width, toRight ? spaceRight : spaceLeft))) + 'px';
  };

  const renderList = filtered => {
    activeIdx = -1;
    const selectables = filtered.filter(it => !it.separator);
    if (!selectables.length) {
      list.innerHTML = '<div class="cat-picker-empty">Nessuna categoria trovata</div>';
    } else {
      // label contiene nomi di categoria (testo utente): va escapata qui (in _catItemHtml),
      // dove finisce in innerHTML. Alla sorgente non si può, perché la stessa label viene
      // assegnata a input.value in selectById, dove le entità HTML si vedrebbero a schermo.
      list.innerHTML = filtered.map(it =>
        it.separator
          ? `<div class="cat-picker-sep">${esc(it.label)}</div>`
          : `<div class="cat-picker-item" data-id="${it.id}">${_catItemHtml(it.label)}</div>`
      ).join('');
      list.querySelectorAll('.cat-picker-item').forEach(el => {
        el.onmousedown = e => { e.preventDefault(); selectById(Number(el.dataset.id)); };
      });
    }
    place();
    list.style.display = 'block';
  };

  const selectById = id => {
    const item = items.find(i => i.id == id);
    hidden.value = item ? item.id : '';
    input.value  = item ? item.label : '';
    hide();
  };

  // Called by updateCatSelect to reset items and pre-select
  input._catPickerSetItems = (newItems, keepId) => {
    items = newItems;
    // ⚠️ Senza la guardia su keepId, `i.id == keepId` con keepId null pesca la riga
    // separatore (id undefined, e undefined == null è vero): il campo nasceva scritto
    // "── tutte le categorie ──" con l'id nascosto a "undefined".
    const sel = keepId == null ? null : items.find(i => !i.separator && i.id == keepId);
    hidden.value = sel ? sel.id : '';
    input.value  = sel ? sel.label : '';
    hide();
  };

  input.addEventListener('focus', () => {
    input.select();
    renderList(items);
  });

  input.addEventListener('input', () => {
    hidden.value = '';
    const q = input.value.toLowerCase();
    if (q) {
      const seen = new Set();
      const filtered = items.filter(i => {
        if (i.separator || !i.label.toLowerCase().includes(q)) return false;
        if (seen.has(i.id)) return false;
        seen.add(i.id);
        return true;
      });
      renderList(filtered);
    } else {
      renderList(items);
    }
  });

  input.addEventListener('keydown', e => {
    const els = [...list.querySelectorAll('.cat-picker-item')];
    if (list.style.display === 'none') {
      if (e.key === 'Enter') { e.preventDefault(); document.getElementById('modalConfirm')?.click(); }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIdx = Math.min(activeIdx + 1, els.length - 1);
      els.forEach((el, i) => el.classList.toggle('active', i === activeIdx));
      els[activeIdx]?.scrollIntoView({block:'nearest'});
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIdx = Math.max(activeIdx - 1, 0);
      els.forEach((el, i) => el.classList.toggle('active', i === activeIdx));
      els[activeIdx]?.scrollIntoView({block:'nearest'});
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0 && els[activeIdx]) {
        selectById(Number(els[activeIdx].dataset.id));
      } else if (els.length === 1) {
        selectById(Number(els[0].dataset.id));
      } else {
        hide();
      }
    } else if (e.key === 'Escape') {
      hide();
    }
  });

  input.addEventListener('blur', () => setTimeout(hide, 150));
}

// Modale crea/modifica transazione (il più complesso dell'app): tipo, importo con espressioni,
// categoria (cat-picker) o split multi-categoria, conti, data, tag, colore, allegato e stato
// di conciliazione. tx=null → nuova; onAfterSave callback opzionale dopo il salvataggio.
// saveOverride: se passato, sostituisce api.addTransaction sul ramo "nuova transazione".
// Serve a "Esegui ora" di una pianificata, che deve salvare e avanzare in un'unica operazione
// lato Java invece di due chiamate separate (altrimenti un errore fra le due lascia la
// transazione registrata e la pianificata ferma → doppia registrazione al tentativo dopo).
function showTxModal(tx, categories, accounts, defaultType = 'expense', tags = [], onAfterSave = null, saveOverride = null) {
  const isEdit = tx != null && tx.id != null;
  const initType = tx?.type || defaultType;
  // Stato "straordinario": tx.tags porta solo id/nome/colore (vedi parseTags), quindi la
  // system_key va risolta dall'elenco tag completo, che invece ce l'ha.
  const oneoffTagId = tags.find(t => t.system_key === 'oneoff')?.id;
  const isOneoff = oneoffTagId != null && (tx?.tags || []).some(t => Number(t.id) === Number(oneoffTagId));
  const expCats = categories.filter(c=>c.type==='expense');
  const incCats = categories.filter(c=>c.type==='income');
  // Categoria di sistema dei trasferimenti: nel modale non è selezionabile (il cat-picker
  // resta vuoto per type='transfer'), ma va comunque rimandata al salvataggio, altrimenti
  // l'UPDATE la sovrascrive con NULL e la transazione perde la categoria con cui era nata
  // (i trasferimenti creati da Portfolio la impostano — vedi Database.buyPortfolio/sell).
  const transferCat = categories.find(c=>c.type==='transfer');
  const today = _todayStr();

  const body = `
    ${tx?.portfolio_id ? `<div class="portfolio-link-banner">📈 Collegata a posizione portfolio</div>` : ''}
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Tipo</label>
        <select class="form-control" id="f_type" onchange="toggleCats()">
          <option value="expense"  ${initType==='expense' ?'selected':''}>Uscita</option>
          <option value="income"   ${initType==='income'  ?'selected':''}>Entrata</option>
          <option value="transfer" ${initType==='transfer'?'selected':''}>Trasferimento</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Data</label>
        <input type="date" class="form-control" id="f_date" value="${tx?.date||today}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Importo (€)</label>
        <input type="text" inputmode="decimal" class="form-control" id="f_amount" value="${tx?.amount||''}" placeholder="es. 40+10.30 o 100/3*2" autocomplete="off">
      </div>
      <div class="form-group" id="catGroup">
        <label class="form-label" style="display:flex;justify-content:space-between;align-items:center">
          Categoria
          <button type="button" class="btn btn-ghost btn-xs" id="splitToggleBtn" onclick="toggleSplit()" tabindex="-1" style="font-size:11px;padding:2px 8px">÷ Suddividi</button>
        </label>
        <div class="cat-picker">
          <input type="text" class="form-control" id="f_cat_input" placeholder="— Seleziona categoria —" autocomplete="off">
          <input type="hidden" id="f_cat" value="">
          <div class="cat-picker-list" id="catPickerList"></div>
        </div>
      </div>
    </div>
    <div id="splitSection" style="display:none;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <label class="form-label" style="margin:0">Voci suddivise</label>
        <span id="splitRemaining" style="font-size:12px"></span>
      </div>
      <div id="splitRows" style="display:flex;flex-direction:column;gap:6px"></div>
      <button type="button" class="btn btn-ghost btn-sm" style="margin-top:8px;font-size:12px" onclick="addSplitRow()">+ Aggiungi voce</button>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Conto</label>
        <select class="form-control" id="f_account">
          ${accounts.filter(a => isAccountActive(a) && (a.type !== 'investment' || (tx && tx.account_id == a.id))).map(a=>`<option value="${a.id}" ${(tx ? tx.account_id==a.id : String(a.id)===String(txFilters.account_id))?'selected':''}>${a.icon} ${a.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group" id="toAccGroup" style="${(tx?.type ?? initType)!=='transfer'?'display:none':''}">
        <label class="form-label">Conto destinazione</label>
        <select class="form-control" id="f_toAccount">
          <option value="">— Seleziona —</option>
          ${accounts.map(a=>`<option value="${a.id}" ${tx?.to_account_id==a.id?'selected':''}>${a.icon} ${a.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Descrizione</label>
      <textarea class="form-control" id="f_desc" rows="2" placeholder="Opzionale">${esc(tx?.description||'')}</textarea>
      <div class="desc-suggestions" id="descSuggestions" style="display:none"></div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Colore riga <span class="settings-hint">(opzionale)</span></label>
        <div class="flex-center-8">
          <input type="color" id="f_color" class="form-color-tx" value="${esc(tx?.color||'#ffffff')}">
          <label class="settings-hint" style="display:flex;align-items:center;gap:6px;cursor:pointer">
            <input type="checkbox" id="f_color_use" ${tx?.color?'checked':''} style="margin:0">
            Usa colore
          </label>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Stato</label>
        <div class="recon-toggle" id="reconToggle">
          <input type="radio" name="f_reconciled" id="f_rec_pending" value="0" ${tx?.reconciled==0?'checked':''} hidden>
          <input type="radio" name="f_reconciled" id="f_rec_done"    value="1" ${tx==null||tx.reconciled==1?'checked':''} hidden>
          <button type="button" class="recon-opt${tx?.reconciled==0?' active':''}" data-val="0" data-radio="f_rec_pending">🔲 Da verificare</button>
          <button type="button" class="recon-opt${tx==null||tx.reconciled==1?' active':''}" data-val="1" data-radio="f_rec_done">✅ Conciliata</button>
        </div>
      </div>
    </div>
      <div class="form-group">
        <label class="form-label">Tag</label>
        <div class="tag-selector" id="tagSelector">
          ${tags.filter(t=>!t.is_system).map(t=>`<span class="tag-chip" data-tag-id="${t.id}" style="--tc:${esc(t.color)}">${esc(t.name)}</span>`).join('')}
          ${tags.filter(t=>t.is_system && t.system_key!=='oneoff' && (tx?.tags||[]).some(tt=>Number(tt.id)===t.id)).map(t=>`<span class="tag-chip" data-tag-id="${t.id}" style="--tc:${esc(t.color)}" title="Tag di sistema — puoi solo rimuoverlo">${esc(t.name)} 🔒</span>`).join('')}
          <span class="tag-chip tag-chip-new" id="tagChipNew">+ nuovo</span>
        </div>
      </div>
      <!-- "Straordinario" ha un controllo suo invece del chip di sistema: serve la spiegazione
           di cosa comporta, e il chip col lucchetto si poteva solo togliere, non mettere. -->
      <div class="form-group">
        <label class="flex-center-8" style="cursor:pointer;font-weight:normal">
          <input type="checkbox" id="f_oneoff" ${isOneoff ? 'checked' : ''}>
          <span>🎯 Movimento straordinario</span>
        </label>
        <div class="settings-hint" style="margin-top:2px">
          Un episodio che non si ripeterà (un acquisto una tantum, un rimborso non ricorrente).
          Resta nei saldi, nel budget e nei report, ma esce dalle <strong>proiezioni</strong>:
          mediana della spesa variabile, forbice e mese tipico della Previsione Saldo.
          Vale a qualunque importo — la soglia dei 500 € riguarda solo i suggerimenti automatici.
        </div>
        <div class="tag-new-row" id="tagNewRow" style="display:none">
          <input class="form-control" id="tagNewName" placeholder="Nome tag" style="flex:1">
          <input type="color" id="tagNewColor" value="#58a6ff" class="color-input-sm">
          <button class="btn btn-primary btn-icon" id="tagNewConfirm">✓</button>
          <button class="btn btn-ghost btn-icon" id="tagNewCancel">✕</button>
        </div>
      </div>
    ${isEdit ? `
      <div class="form-group" style="margin-top:4px">
        <label class="form-label">Allegato</label>
        <div id="attachDisplay">
          ${tx.attachment_path
            ? `<div class="flex-center-8" style="flex-wrap:wrap">
                 <span class="settings-hint" style="word-break:break-all">${esc(tx.attachment_path)}</span>
                 <button type="button" class="btn btn-ghost btn-sm" onclick="modalOpenAttachment()">📂 Apri</button>
                 <button type="button" class="btn btn-ghost btn-sm" onclick="modalRemoveAttachment()">🗑️ Rimuovi</button>
               </div>`
            : `<button type="button" class="btn btn-secondary btn-sm" onclick="modalAttachFile()">📎 Aggiungi allegato</button>`
          }
        </div>
      </div>` : ''}`;

  // Popola il picker categoria in base al tipo selezionato
  // Aggiorna le voci del cat-picker in base al tipo selezionato (vuoto per i trasferimenti).
  function updateCatSelect(keepSelected) {
    const type  = document.getElementById('f_type')?.value;
    const input = document.getElementById('f_cat_input');
    if (!input?._catPickerSetItems) return;
    if (type === 'transfer') { input._catPickerSetItems([], null); return; }
    const cats = type === 'expense' ? expCats : incCats;
    const leafs = _leafCats(cats);
    const toItem = c => ({
      id: c.id,
      label: c.parent_id ? `${c.parent_name} › ${c.icon} ${c.name}` : `${c.icon} ${c.name}`,
      usage_count: c.usage_count || 0
    });
    const top3 = [...leafs].sort((a,b) => (b.usage_count||0) - (a.usage_count||0))
                           .slice(0, 3)
                           .filter(c => (c.usage_count||0) > 0);
    const allItems = leafs.map(toItem);
    const items = top3.length
      ? [ ...top3.map(toItem),
          { separator: true, label: '── tutte le categorie ──' },
          ...allItems ]
      : allItems;
    input._catPickerSetItems(items, keepSelected);
  }

  // Dichiarato qui (prima di toggleCats) per evitare TDZ
  let _splitActive = false;

  window.toggleCats = () => {
    const isTransfer = document.getElementById('f_type')?.value === 'transfer';
    const toAcc = document.getElementById('toAccGroup');
    if (toAcc) toAcc.style.display = isTransfer ? '' : 'none';
    const splitBtn = document.getElementById('splitToggleBtn');
    if (splitBtn) { splitBtn.disabled = isTransfer; splitBtn.style.opacity = isTransfer ? '.3' : ''; }
    if (isTransfer && _splitActive) toggleSplit(); // chiudi split se era aperto
    // Preserva la selezione corrente (evita reset durante init e cambio tipo)
    updateCatSelect(parseInt(document.getElementById('f_cat')?.value) || null);
  };

  // ─── Funzioni allegato (solo in modifica) ────────────────────────────────
  if (isEdit) {
    const _refreshAttachDisplay = path => {
      const el = document.getElementById('attachDisplay');
      if (!el) return;
      if (path) {
        el.innerHTML = `<div class="flex-center-8" style="flex-wrap:wrap">
          <span class="settings-hint" style="word-break:break-all">${esc(path)}</span>
          <button type="button" class="btn btn-ghost btn-sm" onclick="modalOpenAttachment()">📂 Apri</button>
          <button type="button" class="btn btn-ghost btn-sm" onclick="modalRemoveAttachment()">🗑️ Rimuovi</button>
        </div>`;
      } else {
        el.innerHTML = `<button type="button" class="btn btn-secondary btn-sm" onclick="modalAttachFile()">📎 Aggiungi allegato</button>`;
      }
    };
    window.modalAttachFile = async () => {
      const picked = await api.chooseAttachmentFile();
      if (picked.cancelled) return;
      const res = await api.attachFile(tx.id, picked.path, tx.attachment_path || null);
      if (res.error) { toast(res.error, 'error'); return; }
      tx.attachment_path = res.path;
      _refreshAttachDisplay(res.path);
      const cached = txCache.find(t => t.id === tx.id);
      if (cached) { cached.attachment_path = res.path; renderTxBodyAndHeaders(); }
    };
    window.modalOpenAttachment = async () => {
      const res = await api.openAttachment(tx.attachment_path);
      if (res.error) toast(res.error, 'error');
    };
    window.modalRemoveAttachment = async () => {
      await api.removeAttachment(tx.id, tx.attachment_path || null);
      tx.attachment_path = null;
      _refreshAttachDisplay(null);
      const cached = txCache.find(t => t.id === tx.id);
      if (cached) { cached.attachment_path = null; renderTxBodyAndHeaders(); }
    };
  }

  openModal(isEdit ? 'Modifica Transazione' : 'Nuova Transazione', body, async () => {
    const type   = document.getElementById('f_type').value;
    const amount = evalAmount(document.getElementById('f_amount').value);

    // Raccoglie split se attivi
    const splits = _splitActive
      ? [...document.querySelectorAll('#splitRows .split-row')].map(row => ({
          category_id: parseInt(row.querySelector('.split-cat').value) || null,
          amount:      evalAmount(row.querySelector('.split-amount').value) || 0,
          description: ''
        })).filter(s => s.amount > 0)
      : null;

    const data = {
      id:            tx?.id,
      date:          document.getElementById('f_date').value,
      description:   document.getElementById('f_desc').value.trim(),
      amount,
      type,
      category_id:   type === 'transfer' ? (transferCat?.id ?? null)
                     : _splitActive ? null : (parseInt(document.getElementById('f_cat').value) || null),
      splits,
      account_id:    parseInt(document.getElementById('f_account').value),
      to_account_id: type==='transfer' ? parseInt(document.getElementById('f_toAccount').value)||null : null,
      tag_ids:       [...selectedTagIds],
      // Applicato dopo tag_ids lato Java, quindi vince sulla presenza del tag nell'elenco
      oneoff:        !!document.getElementById('f_oneoff')?.checked,
      color: document.getElementById('f_color_use')?.checked
               ? document.getElementById('f_color').value : null,
      reconciled: parseInt(document.querySelector('input[name="f_reconciled"]:checked')?.value ?? '1'),
    };

    const _markErr = (id, msg) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.style.borderColor = 'var(--expense)';
      el.style.boxShadow   = '0 0 0 2px rgba(248,81,73,.25)';
      const clear = () => { el.style.borderColor = ''; el.style.boxShadow = ''; };
      el.addEventListener('input',  clear, { once: true });
      el.addEventListener('change', clear, { once: true });
      toast(msg, 'error');
    };
    if (!data.amount)     { _markErr('f_amount',  'Inserisci l\'importo'); return false; }
    if (!data.account_id) { _markErr('f_account', 'Seleziona il conto');   return false; }
    if (type !== 'transfer') {
      if (_splitActive) {
        if (!splits.length) { toast('Aggiungi almeno una voce', 'error'); return false; }
        if (splits.some(s => !s.category_id)) { toast('Seleziona la categoria per ogni voce', 'error'); return false; }
        // Soglia allineata a quella lato Java (saveSplits): mezzo centesimo sugli importi
        // arrotondati a 2 decimali. Con `> 0.01` sui valori grezzi la somma in virgola mobile
        // decideva l'esito per differenze invisibili all'utente; arrotondando prima, il
        // confronto è sui centesimi che vede davvero, e il modale non può piu' accettare
        // qualcosa che il server rifiuta subito dopo.
        const splitTotal = Math.round(splits.reduce((s,sp) => s + sp.amount, 0) * 100) / 100;
        const txTotal    = Math.round(data.amount * 100) / 100;
        if (Math.abs(splitTotal - txTotal) >= 0.005) {
          toast(`Le voci (${fmt.currency(splitTotal)}) non corrispondono al totale (${fmt.currency(txTotal)})`, 'error'); return false;
        }
      } else {
        if (!data.category_id) { _markErr('f_cat_input', 'Seleziona una categoria'); return false; }
      }
    }

    try {
      const txResult = isEdit ? await api.updateTransaction(data)
                     : saveOverride ? await saveOverride(data)
                     : await api.addTransaction(data);
      closeModal();
      toast(isEdit ? 'Transazione aggiornata' : 'Transazione aggiunta');
      refreshAfterTxChange();
      if (onAfterSave) {
        try { await onAfterSave(txResult); }
        catch(e) { toast('Errore post-salvataggio: ' + e.message, 'error'); }
      }
    } catch(e) { toast(e.message, 'error'); return false; }
  });

  // ── Wiring tag selector ──
  const selectedTagIds = new Set((tx?.tags || []).map(t => Number(t.id)));

  // Ridisegna le chip dei tag nel modale evidenziando quelle selezionate.
  function refreshTagChips() {
    document.querySelectorAll('#tagSelector [data-tag-id]').forEach(chip => {
      const id = Number(chip.dataset.tagId);
      chip.classList.toggle('selected', selectedTagIds.has(id));
    });
  }

  document.querySelectorAll('#tagSelector [data-tag-id]').forEach(chip => {
    chip.onclick = () => {
      const id = Number(chip.dataset.tagId);
      selectedTagIds.has(id) ? selectedTagIds.delete(id) : selectedTagIds.add(id);
      chip.classList.toggle('selected', selectedTagIds.has(id));
    };
  });

  document.getElementById('tagChipNew').onclick = () => {
    document.getElementById('tagNewRow').style.display = 'flex';
    document.getElementById('tagChipNew').style.display = 'none';
    document.getElementById('tagNewName').focus();
  };
  document.getElementById('tagNewCancel').onclick = () => {
    document.getElementById('tagNewRow').style.display = 'none';
    document.getElementById('tagChipNew').style.display = '';
    document.getElementById('tagNewName').value = '';
  };
  document.getElementById('tagNewConfirm').onclick = async () => {
    const name = document.getElementById('tagNewName').value.trim();
    const color = document.getElementById('tagNewColor').value;
    if (!name) { toast('Inserisci un nome', 'error'); return; }
    try {
      const newTag = await api.addTag({name, color});
      tags.push(newTag);
      const chip = document.createElement('span');
      chip.className = 'tag-chip selected';
      chip.dataset.tagId = newTag.id;
      chip.style.setProperty('--tc', color);
      chip.textContent = name;
      chip.onclick = () => {
        const id = Number(chip.dataset.tagId);
        selectedTagIds.has(id) ? selectedTagIds.delete(id) : selectedTagIds.add(id);
        chip.classList.toggle('selected', selectedTagIds.has(id));
      };
      document.getElementById('tagSelector').insertBefore(chip, document.getElementById('tagChipNew'));
      selectedTagIds.add(Number(newTag.id));
      document.getElementById('tagNewCancel').onclick();
    } catch(e) { toast(e.message, 'error'); }
  };

  refreshTagChips();

  document.querySelectorAll('#reconToggle .recon-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#reconToggle .recon-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.radio).checked = true;
    });
  });

  // Popola subito il select con le categorie del tipo iniziale
  updateCatSelect(tx?.category_id);

  // Focus immediato sull'importo
  setTimeout(() => document.getElementById('f_amount')?.focus(), 50);

  // Enter su importo → salva; blur → valuta espressione
  const amtEl = document.getElementById('f_amount');
  if (amtEl) {
    amtEl.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); document.getElementById('modalConfirm')?.click(); }
      if (e.key === 'Tab' && !e.shiftKey && !_splitActive) {
        const catInput = document.getElementById('f_cat_input');
        if (catInput) { e.preventDefault(); catInput.focus(); }
      }
    });
    amtEl.addEventListener('blur', () => {
      const v = evalAmount(amtEl.value);
      if (v !== null) amtEl.value = v.toFixed(2);
    });
  }

  initCatPicker('f_cat_input', 'f_cat', 'catPickerList');
  updateCatSelect(tx?.category_id);
  window.toggleCats(); // aggiorna stato bottone Suddividi in base al tipo iniziale

  // ── Suggerimenti descrizione: chip cliccabili. Senza categoria né testo → le 10 più
  //    usate (ultimi 6 mesi); con categoria scelta → le 10 di quella categoria; mentre
  //    digiti → filtra per sottostringa (combinato con la categoria, se presente). ──
  (() => {
    const wrap = document.getElementById('descSuggestions');
    const desc = document.getElementById('f_desc');
    if (!wrap || !desc) return;

    // Disegna le chip da una lista di righe {description, usage_count}.
    const render = rows => {
      wrap.replaceChildren();
      if (!rows || !rows.length) { wrap.style.display = 'none'; return; }
      // Costruisce le chip via DOM (textContent) per non interpretare HTML nelle descrizioni
      rows.forEach(r => {
        const chip = document.createElement('span');
        chip.className = 'desc-chip';
        chip.title = `Usata ${r.usage_count} volte`;
        chip.textContent = r.description;
        chip.onclick = () => { desc.value = r.description; desc.focus(); refresh(); };
        wrap.appendChild(chip);
      });
      wrap.style.display = 'flex';
    };

    // Carica i suggerimenti filtrati per testo digitato e categoria selezionata.
    // _reqId evita che una risposta lenta sovrascriva una richiesta più recente.
    let _reqId = 0;
    const load = async () => {
      const id = ++_reqId;
      const opts = {};
      const q = desc.value.trim();
      if (q) opts.query = q;
      const catId = parseInt(document.getElementById('f_cat')?.value);
      if (catId) opts.category_id = catId;
      let rows;
      try { rows = await api.getTopDescriptions(opts); }
      catch { return; }
      if (id === _reqId) render(rows);
    };

    let _timer;
    const refresh = () => {
      clearTimeout(_timer);
      _timer = setTimeout(load, 200);
    };

    desc.addEventListener('input', refresh);
    // Il cat-picker scrive su #f_cat senza emettere eventi: rileggiamo la categoria
    // quando l'input categoria cambia o perde il focus (es. dopo una selezione).
    const catInput = document.getElementById('f_cat_input');
    if (catInput) {
      catInput.addEventListener('blur', refresh);
      catInput.addEventListener('input', refresh);
    }
    // Cambio tipo (uscita/entrata/trasferimento) azzera la categoria: aggiorna le chip.
    document.getElementById('f_type')?.addEventListener('change', refresh);
    load();  // stato iniziale
  })();

  // ── Split transaction logic ──────────────────────────────────────────────

  // <option> categorie foglia per i menu delle righe split (filtrate per tipo).
  function _splitCatOptions(type, selId) {
    const cats = type === 'income' ? incCats : expCats;
    const leaves = _leafCats(cats);
    return leaves.map(c => {
      const label = c.parent_name ? `${c.parent_name} › ${c.icon||''} ${c.name}` : `${c.icon||''} ${c.name}`;
      return `<option value="${c.id}" ${c.id==selId?'selected':''}>${label}</option>`;
    }).join('');
  }

  window._updateSplitRemaining = function _updateSplitRemaining() {
    const total = evalAmount(document.getElementById('f_amount')?.value) || 0;
    const used  = [...document.querySelectorAll('#splitRows .split-amount')]
                    .reduce((s, el) => s + (evalAmount(el.value) || 0), 0);
    const rem = Math.round((total - used) * 100) / 100;
    const el = document.getElementById('splitRemaining');
    if (!el) return;
    const ok = Math.abs(rem) < 0.005;
    el.textContent = ok ? '✓ Bilanciato' : `Rimanente: ${fmt.currency(rem)}`;
    el.style.color  = ok ? 'var(--income)' : (rem < 0 ? 'var(--expense)' : 'var(--txt2)');
  }

  window.toggleSplit = () => {
    _splitActive = !_splitActive;
    const catGroup = document.getElementById('catGroup');
    const section  = document.getElementById('splitSection');
    const btn      = document.getElementById('splitToggleBtn');
    catGroup.style.opacity       = _splitActive ? '0.4' : '1';
    catGroup.style.pointerEvents = _splitActive ? 'none' : '';
    section.style.display        = _splitActive ? '' : 'none';
    btn.textContent              = _splitActive ? '× Unisci' : '÷ Suddividi';
    if (_splitActive && !document.getElementById('splitRows').children.length) {
      // Pre-aggiungi 2 righe: la prima con il totale rimanente
      window.addSplitRow();
      window.addSplitRow();
    }
  };

  window.addSplitRow = (catId = null, amount = null) => {
    const container = document.getElementById('splitRows');
    const type = document.getElementById('f_type')?.value || 'expense';
    if (amount === null) {
      const total = evalAmount(document.getElementById('f_amount')?.value) || 0;
      const used  = [...container.querySelectorAll('.split-amount')]
                      .reduce((s, el) => s + (evalAmount(el.value) || 0), 0);
      const rem = Math.max(0, Math.round((total - used) * 100) / 100);
      amount = rem > 0 ? rem.toFixed(2) : '';
    }
    const div = document.createElement('div');
    div.className = 'split-row';
    div.style.cssText = 'display:flex;gap:6px;align-items:center';
    div.innerHTML = `
      <select class="form-control split-cat" style="flex:1;font-size:13px" onchange="_updateSplitRemaining()">
        <option value="">— Categoria —</option>
        ${_splitCatOptions(type, catId)}
      </select>
      <input type="text" inputmode="decimal" class="form-control split-amount"
             style="width:110px;flex:none;font-size:13px" value="${amount}"
             placeholder="Importo"
             oninput="_updateSplitRemaining()"
             onblur="const v=evalAmount(this.value);if(v!==null)this.value=v.toFixed(2);_updateSplitRemaining()">
      <button type="button" class="btn btn-ghost btn-icon" style="flex:none"
              onclick="this.closest('.split-row').remove();_updateSplitRemaining()">✕</button>`;
    container.appendChild(div);
    _updateSplitRemaining();
  };

  // Carica split esistenti se si sta modificando una transazione suddivisa
  if (tx?.split_count > 0) {
    (async () => {
      try {
        const splits = await api.getTransactionSplits(tx.id);
        if (splits.length > 0) {
          window.toggleSplit();
          document.getElementById('splitRows').innerHTML = '';
          splits.forEach(s => window.addSplitRow(s.category_id, s.amount));
        }
      } catch(e) { toast('Errore caricamento split: ' + e.message, 'error'); }
    })();
  }
}

// Apre il modale di modifica per la transazione con l'id dato.
window.editTx = async id => {
  const [txs, cats, accs, tgs] = await Promise.all([
    api.getTransactions({id}), api.getCategories(), api.getAccounts(), api.getTags()
  ]);
  const tx = txs[0];
  if (tx) showTxModal(tx, cats, accs, tx.type, tgs);
};

// Elimina una transazione con possibilità di annullare (toast "Annulla" che la ricrea
// con split, tag e allegato — il file non viene cancellato dal disco).
window.deleteTx = async id => {
  // Pre-carica i dati completi (incl. splits e tags) per supportare l'undo
  const [txs, splits] = await Promise.all([
    api.getTransactions({ id }),
    api.getTransactionSplits(id),
  ]);
  const tx = txs[0];
  if (!tx) { toast('Transazione non trovata', 'error'); return; }
  try { await api.deleteTransaction(id); }
  catch(e) { toast(e.message, 'error'); return; }
  refreshAfterTxChange();
  toastWithAction('Transazione eliminata', 'Annulla', async () => {
    try {
      const restored = await api.addTransaction({
        date: tx.date, amount: tx.amount, type: tx.type,
        category_id: tx.category_id, account_id: tx.account_id,
        to_account_id: tx.to_account_id,
        description: tx.description, color: tx.color,
        reconciled: tx.reconciled,
        tag_ids: (tx.tags || []).map(t => Number(t.id)),
        splits: splits.length ? splits.map(s => ({
          category_id: s.category_id, amount: s.amount, description: s.description || ''
        })) : null,
      });
      // Ripristina allegato (file ancora su disco — deleteTransaction non lo cancella)
      if (tx.attachment_path && restored?.id) {
        try { await api.setAttachmentPath(restored.id, tx.attachment_path); } catch {}
      }
      toast('Transazione ripristinata');
      refreshAfterTxChange();
    } catch(e) { toast('Ripristino fallito: ' + e.message, 'error'); }
  });
};

/* ─── Contex menu transazioni ─────────────────────────────────────────────── */
let _ctxTxId = null;

// Mostra il menu contestuale di una transazione (duplica, crea pianificata, modifica,
// concilia/de-concilia, elimina), posizionato al cursore e clampato nella finestra.
function _showCtxMenu(txId, x, y) {
  _ctxTxId = txId;
  const tx = txCache.find(t => t.id === txId);
  const isRec = tx?.reconciled == 1;
  const m = document.getElementById('ctxMenu');
  m.innerHTML = `
    <div class="ctx-item" onclick="_ctxDo('dup')">📋 Duplica transazione</div>
    <div class="ctx-item" onclick="_ctxDo('tosched')">🗓️ Crea pianificata</div>
    <div class="ctx-separator"></div>
    <div class="ctx-item" onclick="_ctxDo('edit')">✏️ Modifica</div>
    <div class="ctx-separator"></div>
    ${isRec
      ? `<div class="ctx-item" onclick="_ctxDo('unreconcile')">🔲 Segna come "Da verificare" <kbd>V</kbd></div>`
      : `<div class="ctx-item" onclick="_ctxDo('reconcile')">✅ Segna come "Conciliata" <kbd>R</kbd></div>`
    }
    <div class="ctx-separator"></div>
    <div class="ctx-item ctx-danger" onclick="_ctxDo('del')">🗑️ Elimina <kbd>Canc</kbd></div>`;
  m.style.display = 'block';
  const mw = 230, mh = 160;
  m.style.left = (x + mw > window.innerWidth  ? x - mw : x) + 'px';
  m.style.top  = (y + mh > window.innerHeight ? y - mh : y) + 'px';
}

// Nasconde il menu contestuale transazioni.
function _hideCtxMenu() {
  document.getElementById('ctxMenu').style.display = 'none';
  _ctxTxId = null;
}

// Esegue l'azione scelta dal menu contestuale sulla transazione corrente.
window._ctxDo = action => {
  const id = _ctxTxId; _hideCtxMenu();
  if (action === 'dup')         duplicateTx(id);
  if (action === 'tosched')     txToSched(id);
  if (action === 'edit')        window.editTx(id);
  if (action === 'del')         window.deleteTx(id);
  if (action === 'reconcile')   toggleReconciled(id, 1);
  if (action === 'unreconcile') toggleReconciled(id, 0);
};

// Duplica una transazione: apre il modale precompilato con i suoi dati, senza id e con data odierna.
window.duplicateTx = async id => {
  const [txs, cats, accs, tgs] = await Promise.all([
    api.getTransactions({id}), api.getCategories(), api.getAccounts(), api.getTags()
  ]);
  const tx = txs[0];
  if (tx) showTxModal({...tx, id: undefined, date: _todayStr()}, cats, accs, tx.type, tgs);
};

// Crea una pianificata a partire da una transazione esistente (apre il modale pianificate precompilato).
async function txToSched(id) {
  const [txs, cats, accs, tgs] = await Promise.all([
    api.getTransactions({id}), api.getCategories(), api.getAccounts(), api.getTags()
  ]);
  const tx = txs[0];
  if (!tx) return;
  const sched = {
    type:        tx.type,
    amount:      tx.amount,
    description: tx.description,
    category_id: tx.category_id,
    account_id:  tx.account_id,
    to_account_id: tx.to_account_id,
    color:       tx.color,
    start_date:  _todayStr()
  };
  showScheduledModal(sched, accs, cats, tgs);
}

// ── Selezione riga con click (non su bottoni) ────────────────────────────
document.addEventListener('click', e => {
  _hideCtxMenu();
  const tr = e.target.closest('#txBody tr[data-tx-id]');
  if (!tr || e.target.closest('button')) { return; }
  const id = parseInt(tr.dataset.txId);
  _selectedTxId = _selectedTxId === id ? null : id;  // toggle
  renderTxBodyAndHeaders();
});

// Delegazione eventi contestuali
document.addEventListener('contextmenu', e => {
  const tr = e.target.closest('#txBody tr[data-tx-id]');
  if (!tr) { _hideCtxMenu(); return; }
  e.preventDefault();
  const id = parseInt(tr.dataset.txId);
  // Seleziona la riga su cui si fa tasto destro
  if (_selectedTxId !== id) { _selectedTxId = id; renderTxBodyAndHeaders(); }
  _showCtxMenu(id, e.clientX, e.clientY);
});

// ── Scorciatoie da tastiera ──────────────────────────────────────────────
document.addEventListener('keydown', e => {
  const overlayOpen = document.getElementById('shortcutsOverlay')?.classList.contains('open');

  if (e.key === 'Escape') {
    if (overlayOpen) { closeShortcutsHelp(); return; }
    _hideCtxMenu(); return;
  }

  const tag = document.activeElement?.tagName;
  const inputFocused = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  const modalOpen = document.getElementById('modalOverlay')?.classList.contains('open');

  // ? → guida shortcut (senza modificatori, no input, no modal)
  if (e.key === '?' && !e.altKey && !e.ctrlKey && !inputFocused && !modalOpen) {
    if (overlayOpen) closeShortcutsHelp(); else showShortcutsHelp();
    return;
  }

  // Shortcut solo se: nessun modal, nessun input, nessun overlay
  if (overlayOpen || modalOpen || inputFocused) return;

  const txPage = document.getElementById('pg-transactions');
  const onTxPage = txPage?.classList.contains('active');

  // N → nuova transazione (da qualsiasi pagina)  -- non attivo se tema editor aperto
  if ((e.key === 'n' || e.key === 'N') && !document.getElementById('tePanel')?.classList.contains('open')) {
    if (onTxPage) {
      e.preventDefault();
      document.getElementById('btnAddExpense')?.click();
    }
    return;
  }

  // Shortcut che richiedono la pagina transazioni
  if (!onTxPage) return;

  // F → focus sulla ricerca
  if (e.key === 'f' || e.key === 'F') {
    e.preventDefault();
    const s = document.getElementById('txSearch');
    if (s) { s.focus(); s.select(); }
    return;
  }

  // Le seguenti richiedono una transazione selezionata
  if (!_selectedTxId) return;

  if (e.key === 'e' || e.key === 'E') {
    e.preventDefault();
    window.editTx(_selectedTxId);
  } else if (e.key === 'd' || e.key === 'D') {
    e.preventDefault();
    window.duplicateTx(_selectedTxId);
  } else if (e.key === 'r' || e.key === 'R') {
    e.preventDefault();
    toggleReconciled(_selectedTxId, 1);
  } else if (e.key === 'v' || e.key === 'V') {
    e.preventDefault();
    toggleReconciled(_selectedTxId, 0);
  } else if (e.key === 'Delete') {
    e.preventDefault();
    window.deleteTx(_selectedTxId);
  }
});
