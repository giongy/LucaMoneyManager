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

// Le globali _reports* e _fc* sono state spostate in pages/analytics.js (stadio 7e).

// Formatta una Date come YYYY-MM-DD nel fuso locale (toISOString userebbe UTC e sfaserebbe di 1 giorno)
// FIXME: appartengono semanticamente a utils.js, verranno spostate in una pulizia finale.
const _dateStr  = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const _todayStr = () => _dateStr(new Date());

function rangeToFilter(range, from, to) {
  const today = new Date();
  const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const sub = days => { const d = new Date(today); d.setDate(d.getDate()-days); return d; };
  switch (range) {
    case '7d':        return { date_from: fmt(sub(6)),  date_to: fmt(today) };
    case '14d':       return { date_from: fmt(sub(13)), date_to: fmt(today) };
    case '30d':       return { date_from: fmt(sub(29)), date_to: fmt(today) };
    case '3m':        { const d=new Date(today); d.setMonth(d.getMonth()-3);
                        return { date_from: fmt(d), date_to: fmt(today) }; }
    case '6m':        { const d=new Date(today); d.setMonth(d.getMonth()-6);
                        return { date_from: fmt(d), date_to: fmt(today) }; }
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
      if (mM) { const d=new Date(today); d.setMonth(d.getMonth()-parseInt(mM[1])); return { date_from: fmt(d), date_to: fmt(today) }; }
      if (mY) { const d=new Date(today); d.setFullYear(d.getFullYear()-parseInt(mY[1])); return { date_from: fmt(d), date_to: fmt(today) }; }
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
    // Inserisce i preset prima di 'all' e 'custom'
    const idx = list.findIndex(o => o.v === 'all');
    list.splice(idx, 0, ...presets.map(p => ({v: p.range_key, l: p.label})));
  }
  const opts = list.map(o => `<option value="${o.v}"${selected===o.v?' selected':''}>${o.l}</option>`).join('');
  return includeEmpty ? `<option value="">Nessun filtro data</option>${opts}` : opts;
}

let txSort       = { col: 'date', dir: 'asc' };
let txCache      = [];
let _selectedTxId = null;

function navigateToAccountTx(accountId) {
  txFilters = { range: txFilters.range, account_id: String(accountId) };
  if (currentPage === 'transactions') renderTransactions();
  else navigate('transactions');
}

function navigateToTx(id) {
  txFilters = { range: txFilters.range, id };
  if (currentPage === 'transactions') renderTransactions();
  else navigate('transactions');
}

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
          <option value="">Tutte le categorie</option>
          ${(() => {
            const parents = categories.filter(c => !c.parent_id && c.type !== 'transfer');
            return parents.map(p => {
              const children = categories.filter(c => String(c.parent_id) === String(p.id));
              if (!children.length) return `<option value="${p.id}" ${String(p.id)===String(txFilters.category_id)?'selected':''}>${p.icon||''} ${p.name}</option>`;
              return `<optgroup label="${p.icon||''} ${p.name}">${children.map(c=>`<option value="${c.id}" ${String(c.id)===String(txFilters.category_id)?'selected':''}>${c.icon||''} ${c.name}</option>`).join('')}</optgroup>`;
            }).join('');
          })()}
        </select>
        <select class="form-control" id="txTag">
          <option value="">Tutti i tag</option>
          ${tags.map(t=>`<option value="${t.id}" ${String(t.id)===String(txFilters.tag_id)?'selected':''}>${t.name}</option>`).join('')}
        </select>
        <select class="form-control" id="txHasAttachment">
          <option value="">Tutti</option>
          <option value="1" ${txFilters.has_attachment==='1'?'selected':''}>📎 Con allegato</option>
          <option value="0" ${txFilters.has_attachment==='0'?'selected':''}>Senza allegato</option>
        </select>
        <input class="form-control" id="txSearch" value="${txFilters.search||''}" placeholder="🔍 Cerca..." style="min-width:160px">
        <button class="btn btn-ghost" title="Salva filtri correnti come resoconto" onclick="saveTxFiltersAsReport()" style="white-space:nowrap;flex-shrink:0">💾 Salva filtro</button>
      </div>
    </div>
    <div id="txSummaryBar" style="flex-shrink:0;padding:4px 16px 10px;background:var(--bg);display:flex;align-items:center;gap:12px;font-size:13px;color:var(--txt2)"></div>
    <div id="txScrollWrap" style="flex:1;overflow:auto;padding:0 16px 0">
      <div class="card">
        <table id="txTable"><thead><tr>
            <th class="th-sort th-sort-active" data-col="date"        onclick="_txSortBy('date')">Data<span class="sort-ind">▲</span></th>
            <th class="th-reconciled" id="thReconciled" title="Stato conciliazione">Stato</th>
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
    txFilters = {
      range,
      ...rangeToFilter(range, from, to),
      type:        document.getElementById('txType').value,
      account_id:  document.getElementById('txAccount').value   || undefined,
      category_id: document.getElementById('txCategory').value  || undefined,
      tag_id:         document.getElementById('txTag').value            || undefined,
      has_attachment: document.getElementById('txHasAttachment').value  || undefined,
      search:         document.getElementById('txSearch').value,
    };
    api.setSetting('tx.range', range);
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
  if (txFilters.tag_id)        f.tag_ids        = [parseInt(txFilters.tag_id)];
  if (txFilters.search)        f.search         = txFilters.search;
  if (txFilters.has_attachment) f.has_attachment = txFilters.has_attachment;
  _reportFilters = f;
  showReportModal();
}

function _renderTxSummaryBar(rows, summary) {
  const el = document.getElementById('txSummaryBar');
  if (!el) return;
  const income  = rows.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0);
  const expense = rows.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0);
  const net     = income - expense;
  const sep     = `<span style="color:var(--txt3);margin:0 4px">|</span>`;
  const val     = (v, id='') => `<span ${id?`id="${id}"`:''} style="color:${v>=0?'var(--income)':'var(--expense)'}">${fmt.currency(v)}</span>`;
  const accPart = summary
    ? `<span>Saldo <span id="txhsBal" style="color:${summary.balance>=0?'var(--income)':'var(--expense)'}">${fmt.currency(summary.balance)}</span></span>
       <span style="color:var(--txt3);font-size:11px">✅ ${fmt.currency(summary.reconciled_balance)}</span>${sep}`
    : '';
  el.innerHTML = `${accPart}
    <span style="color:var(--txt3)">Saldo filtrato:</span>
    <span>Entrate ${val(income)}</span>${sep}
    <span>Uscite <span style="color:var(--expense)">${fmt.currency(expense)}</span></span>${sep}
    <span>Netto ${val(net)}</span>`;
}

async function loadTxRows(categories, accounts) {
  const hasAccount = txFilters.account_id && String(txFilters.account_id).trim() !== '';
  const [rows, summary] = await Promise.all([
    api.getTransactions(txFilters),
    hasAccount ? api.getAccountSummary(parseInt(txFilters.account_id)) : Promise.resolve(null),
  ]);
  txCache = rows;
  // Mostra/nascondi colonna Saldo
  const thBal = document.getElementById('thBalance');
  if (thBal) thBal.style.display = hasAccount ? '' : 'none';
  _renderTxSummaryBar(rows, summary);
  renderTxBodyAndHeaders();
}

function sortTxs(arr) {
  return [...arr].sort((a, b) => {
    let va, vb;
    switch (txSort.col) {
      case 'date':        va=a.date;  vb=b.date;  break;
      case 'description': va=(a.description||'').toLowerCase(); vb=(b.description||'').toLowerCase(); break;
      case 'type':        va=a.type;  vb=b.type;  break;
      case 'category':    va=(a.category_name||'').toLowerCase(); vb=(b.category_name||'').toLowerCase(); break;
      case 'account':     va=(a.account_name||'').toLowerCase();  vb=(b.account_name||'').toLowerCase();  break;
      case 'amount':      va=(a.type==='expense'?-1:1)*a.amount;  vb=(b.type==='expense'?-1:1)*b.amount;  break;
      default:            va=a.date;  vb=b.date;
    }
    const c = va < vb ? -1 : va > vb ? 1 : 0;
    return txSort.dir === 'asc' ? c : -c;
  });
}

window.openTxAttachment = async el => {
  const path = decodeURIComponent(el.dataset.path);
  const res = await api.openAttachment(path);
  if (res.error) toast(res.error, 'error');
};

window._txSortBy = col => {
  txSort.dir = txSort.col === col ? (txSort.dir === 'asc' ? 'desc' : 'asc') : 'desc';
  txSort.col = col;
  renderTxBodyAndHeaders();
};

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
  const sorted = sortTxs(txCache);
  const colCount = showBalance ? 11 : 10;
  // Nome categoria filtrata (per mostrare la voce giusta negli split filtrati)
  const filterCatLabel = txFilters.category_id
    ? document.querySelector(`#txCategory option[value="${txFilters.category_id}"]`)?.textContent?.trim() || ''
    : '';
  tbody.innerHTML = sorted.length ? sorted.map(t => {
    const isRec = t.reconciled == 1;
    const isSel = t.id === _selectedTxId;
    const balCell = showBalance && t.balance != null
      ? `<td class="text-right tx-balance ${t.balance >= 0 ? 'positive' : 'negative'}">${fmt.currency(t.balance)}</td>`
      : (showBalance ? '<td></td>' : '');
    const bgStyle = t.color ? `style="background:${t.color}40"` : '';
    // Se filtro per categoria e la transazione è uno split che matcha → mostra solo la quota filtrata
    const isSplitFiltered = t.split_count > 0 && t.filtered_split_amount != null;
    const displayAmt = isSplitFiltered ? t.filtered_split_amount : t.amount;
    return `
    <tr data-tx-id="${t.id}" class="${t.color ? 'tx-colored' : ''}${isSel ? ' tx-selected' : ''}${!isRec ? ' tx-unreconciled' : ''}" ${bgStyle} ondblclick="editTx(${t.id})">
      <td>${fmt.date(t.date)}</td>
      <td class="td-reconciled">
        <button class="btn-reconcile ${isRec ? 'reconciled' : 'unreconciled'}" title="${isRec ? 'Conciliata [R] – clicca per annullare' : 'Da verificare [V] – clicca per conciliare'}" onclick="toggleReconciled(${t.id}, ${isRec ? 0 : 1})">
          ${isRec ? '✅' : '🔲'}
        </button>
      </td>
      <td class="td-attach">${t.attachment_path ? `<span class="tx-attach-badge" title="${t.attachment_path}" data-path="${encodeURIComponent(t.attachment_path)}" onclick="event.stopPropagation();openTxAttachment(this)">📎</span>` : ''}</td>
      <td>${t.account_name||'-'}${t.to_account_name?` → ${t.to_account_name}`:''}</td>
      <td><span class="badge badge-${t.type}">${t.type==='income'?'Entrata':t.type==='expense'?'Uscita':'Trasferimento'}</span></td>
      <td class="td-tags">${(t.tags&&t.tags.length)?t.tags.map(tg=>`<span class="tag-inline" style="--tc:${tg.color}">${tg.name}</span>`).join(''):''}</td>
      <td>${isSplitFiltered
        ? `<span class="cat-chip" style="opacity:.8;font-size:11px" title="${t.splits_summary||''}">${filterCatLabel} <span style="opacity:.6;font-size:10px">(÷ split)</span></span>`
        : t.split_count > 0
          ? `<span class="cat-chip" style="opacity:.8;font-size:11px" title="${t.splits_summary||''}">÷ ${t.splits_summary||`${t.split_count} voci`}</span>`
          : `${t.category_icon||''} ${t.parent_category_name ? t.parent_category_name + ' : ' + t.category_name : (t.category_name||'-')}`
      }</td>
      <td class="td-main">${t.description||''}${isSplitFiltered ? ` <span style="font-size:10px;opacity:.5" title="Totale transazione: ${fmt.currency(t.amount)}">(tot. ${fmt.currency(t.amount)})</span>` : ''}</td>
      <td class="text-right amount-${t.type}">${t.type==='expense'?'-':''}${fmt.currency(displayAmt)}</td>
      ${balCell}
      <td>
        <button class="btn btn-ghost btn-icon" onclick="editTx(${t.id})">✏️</button>
        <button class="btn btn-ghost btn-icon" onclick="deleteTx(${t.id})">🗑️</button>
      </td>
    </tr>`;
  }).join('') :
    `<tr><td colspan="${colCount}" style="text-align:center;padding:40px;color:var(--txt3)">Nessuna transazione trovata</td></tr>`;
}

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
};

// Restituisce solo <option> (no optgroup) per le categorie foglia del gruppo.
// Macrocategorie senza figli = selezionabili; macrocategorie CON figli = escluse.
function initCatPicker(inputId, hiddenId, listId) {
  const input  = document.getElementById(inputId);
  const hidden = document.getElementById(hiddenId);
  const list   = document.getElementById(listId);
  if (!input || !hidden || !list) return;

  let items = [], activeIdx = -1;

  const hide = () => { list.style.display = 'none'; activeIdx = -1; };

  const renderList = filtered => {
    activeIdx = -1;
    const selectables = filtered.filter(it => !it.separator);
    if (!selectables.length) {
      list.innerHTML = '<div class="cat-picker-empty">Nessuna categoria trovata</div>';
    } else {
      list.innerHTML = filtered.map(it =>
        it.separator
          ? `<div class="cat-picker-sep">${it.label}</div>`
          : `<div class="cat-picker-item" data-id="${it.id}">${it.label}</div>`
      ).join('');
      list.querySelectorAll('.cat-picker-item').forEach(el => {
        el.onmousedown = e => { e.preventDefault(); selectById(Number(el.dataset.id)); };
      });
    }
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
    const sel = items.find(i => i.id == keepId);
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

function buildCatOptions(cats, selectedId) {
  const leafs = _leafCats(cats);
  return leafs.map(c => {
    const label = c.parent_id ? `${c.parent_name} › ${c.icon} ${c.name}` : `${c.icon} ${c.name}`;
    return `<option value="${c.id}" ${selectedId==c.id?'selected':''}>${label}</option>`;
  }).join('');
}

function showTxModal(tx, categories, accounts, defaultType = 'expense', tags = [], onAfterSave = null) {
  const isEdit = tx != null && tx.id != null;
  const initType = tx?.type || defaultType;
  const expCats = categories.filter(c=>c.type==='expense');
  const incCats = categories.filter(c=>c.type==='income');
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
      <textarea class="form-control" id="f_desc" rows="2" placeholder="Opzionale">${tx?.description||''}</textarea>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Colore riga <span class="settings-hint">(opzionale)</span></label>
        <div class="flex-center-8">
          <input type="color" id="f_color" class="form-color-tx" value="${tx?.color||'#ffffff'}">
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
          ${tags.filter(t=>!t.is_system).map(t=>`<span class="tag-chip" data-tag-id="${t.id}" style="--tc:${t.color}">${t.name}</span>`).join('')}
          ${tags.filter(t=>t.is_system && (tx?.tags||[]).some(tt=>Number(tt.id)===t.id)).map(t=>`<span class="tag-chip" data-tag-id="${t.id}" style="--tc:${t.color}" title="Tag di sistema — puoi solo rimuoverlo">${t.name} 🔒</span>`).join('')}
          <span class="tag-chip tag-chip-new" id="tagChipNew">+ nuovo</span>
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
                 <span class="settings-hint" style="word-break:break-all">${tx.attachment_path}</span>
                 <button type="button" class="btn btn-ghost btn-sm" onclick="modalOpenAttachment()">📂 Apri</button>
                 <button type="button" class="btn btn-ghost btn-sm" onclick="modalRemoveAttachment()">🗑️ Rimuovi</button>
               </div>`
            : `<button type="button" class="btn btn-secondary btn-sm" onclick="modalAttachFile()">📎 Aggiungi allegato</button>`
          }
        </div>
      </div>` : ''}`;

  // Popola il picker categoria in base al tipo selezionato
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
          <span class="settings-hint" style="word-break:break-all">${path}</span>
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
      category_id:   _splitActive ? null : (parseInt(document.getElementById('f_cat').value) || null),
      splits,
      account_id:    parseInt(document.getElementById('f_account').value),
      to_account_id: type==='transfer' ? parseInt(document.getElementById('f_toAccount').value)||null : null,
      tag_ids:       [...selectedTagIds],
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
        const splitTotal = splits.reduce((s,sp) => s + sp.amount, 0);
        if (Math.abs(splitTotal - data.amount) > 0.01) {
          toast(`Le voci (${fmt.currency(splitTotal)}) non corrispondono al totale (${fmt.currency(data.amount)})`, 'error'); return false;
        }
      } else {
        if (!data.category_id) { _markErr('f_cat_input', 'Seleziona una categoria'); return false; }
      }
    }

    try {
      const txResult = isEdit ? await api.updateTransaction(data) : await api.addTransaction(data);
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

  // ── Split transaction logic ──────────────────────────────────────────────

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

window.editTx = async id => {
  const [txs, cats, accs, tgs] = await Promise.all([
    api.getTransactions({id}), api.getCategories(), api.getAccounts(), api.getTags()
  ]);
  const tx = txs[0];
  if (tx) showTxModal(tx, cats, accs, tx.type, tgs);
};

window.deleteTx = async id => {
  const ok = await confirm('Elimina transazione', 'Vuoi eliminare questa transazione? L\'operazione non è reversibile.');
  if (!ok) return;
  await api.deleteTransaction(id);
  toast('Transazione eliminata');
  refreshAfterTxChange();
};

/* ─── Contex menu transazioni ─────────────────────────────────────────────── */
let _ctxTxId = null;

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

function _hideCtxMenu() {
  document.getElementById('ctxMenu').style.display = 'none';
  _ctxTxId = null;
}

window._ctxDo = action => {
  const id = _ctxTxId; _hideCtxMenu();
  if (action === 'dup')         duplicateTx(id);
  if (action === 'tosched')     txToSched(id);
  if (action === 'edit')        window.editTx(id);
  if (action === 'del')         window.deleteTx(id);
  if (action === 'reconcile')   toggleReconciled(id, 1);
  if (action === 'unreconcile') toggleReconciled(id, 0);
};

window.duplicateTx = async id => {
  const [txs, cats, accs, tgs] = await Promise.all([
    api.getTransactions({id}), api.getCategories(), api.getAccounts(), api.getTags()
  ]);
  const tx = txs[0];
  if (tx) showTxModal({...tx, id: undefined, date: _todayStr()}, cats, accs, tx.type, tgs);
};

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
