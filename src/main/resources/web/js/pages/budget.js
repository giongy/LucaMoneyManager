/* ═══════════════════════════════════════════════════════════════════════════
   LucaMoneyManager — pages/budget.js
   Pagina Budget (4 tab) + Budget vs Pianificate
   (estratta da app.js, stadio 7c del refactor — unisce 2 blocchi non contigui)

   Dipendenze esterne (lazy a runtime):
   - schedTab, _schedFilter, renderScheduled (scheduled.js)
═══════════════════════════════════════════════════════════════════════════ */

const MONTHS_SHORT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
let budgetYear = new Date().getFullYear();
let _budgetTab = 'grid';
let _budgetAndamentoChart = null;
let _budgetMeseSort  = 'rimasto';
let _budgetMeseMonth = new Date().getMonth() + 1;

async function renderBudgets() {
  if (_budgetAndamentoChart) { _budgetAndamentoChart.destroy(); _budgetAndamentoChart = null; }
  const pg = document.getElementById('pg-budgets');
  pg.innerHTML = `
    <div style="flex-shrink:0;padding:16px 16px 0;background:var(--bg)">
      <div class="scheduled-tabs" style="margin-bottom:12px">
        <button class="sched-tab ${_budgetTab==='grid'?'active':''}"        data-btab="grid"        onclick="_setBudgetTab('grid')">📊 Budget</button>
        <button class="sched-tab ${_budgetTab==='andamento'?'active':''}"   data-btab="andamento"   onclick="_setBudgetTab('andamento')">📈 Andamento</button>
        <button class="sched-tab ${_budgetTab==='scostamenti'?'active':''}" data-btab="scostamenti" onclick="_setBudgetTab('scostamenti')">📉 Scostamenti</button>
        <button class="sched-tab ${_budgetTab==='mese'?'active':''}"        data-btab="mese"        onclick="_setBudgetTab('mese')">🗓 Mese</button>
      </div>
      <div class="section-header">
        <div class="month-nav" style="margin-bottom:0">
          <button id="budgPrev">‹</button>
          <span id="budgYearLabel"></span>
          <button id="budgNext">›</button>
        </div>
        <div id="budgGridActions" style="display:${_budgetTab==='grid'?'flex':'none'};align-items:center;gap:8px;flex:1;margin-left:16px">
          <div style="display:flex;gap:8px">
            <button class="btn btn-ghost" id="btnBudgToggleAll">Comprimi tutto</button>
            <button class="btn btn-ghost" id="btnBudgOnlyRed">Solo rossi</button>
            <button class="btn btn-ghost" id="btnBudgOnlyCurMonth">Solo mese corrente</button>
          </div>
          <div style="display:flex;gap:8px;margin-left:auto">
            <button class="btn btn-ghost" id="btnDelBudgetYear" style="color:var(--expense)">Cancella anno</button>
            <button class="btn btn-primary" id="btnGenBudget">Genera budget</button>
          </div>
        </div>
      </div>
    </div>
    <div id="budgetContent" style="flex:1;overflow:hidden;padding:0 16px 16px;display:flex;flex-direction:column">
      <div id="budgGridWrap" style="display:${_budgetTab==='grid'?'block':'none'};flex:1;overflow:auto;margin-top:14px">
        <table class="budget-table" id="budgetTable">
          <thead id="budgetThead"></thead>
          <tbody id="budgetBody"></tbody>
        </table>
      </div>
      <div id="budgAndamentoWrap"  style="display:${_budgetTab==='andamento'  ?'block':'none'};overflow-y:auto;flex:1"></div>
      <div id="budgScostWrap"      style="display:${_budgetTab==='scostamenti'?'block':'none'};overflow-y:auto;flex:1"></div>
      <div id="budgMeseWrap"       style="display:${_budgetTab==='mese'       ?'block':'none'};overflow-y:auto;flex:1"></div>
    </div>`;

  document.getElementById('budgYearLabel').textContent = budgetYear;
  document.getElementById('budgPrev').onclick = () => { budgetYear--; _budgetMeseMonth = new Date().getMonth() + 1; renderBudgets(); };
  document.getElementById('budgNext').onclick = () => { budgetYear++; _budgetMeseMonth = new Date().getMonth() + 1; renderBudgets(); };
  document.getElementById('btnGenBudget').onclick = () => showGenerateBudgetModal();
  document.getElementById('btnDelBudgetYear').onclick = async () => {
    const ok = await confirm('Cancella budget', `Eliminare tutti i budget dell'anno ${budgetYear}? L'operazione non è reversibile.`);
    if (!ok) return;
    await api.deleteBudgetYear(budgetYear);
    toast(`Budget ${budgetYear} eliminato`);
    renderBudgets();
  };
  document.getElementById('btnBudgOnlyRed').onclick = () => {
    _budgetOnlyRed = !_budgetOnlyRed;
    document.getElementById('btnBudgOnlyRed').classList.toggle('btn-active-red', _budgetOnlyRed);
    document.getElementById('budgGridWrap')?.classList.toggle('budget-only-red', _budgetOnlyRed);
  };
  document.getElementById('btnBudgOnlyCurMonth').onclick = () => {
    _budgetOnlyCurrentMonth = !_budgetOnlyCurrentMonth;
    document.getElementById('btnBudgOnlyCurMonth').classList.toggle('btn-active-red', _budgetOnlyCurrentMonth);
    document.getElementById('budgGridWrap')?.classList.toggle('budget-only-current-month', _budgetOnlyCurrentMonth);
  };
  document.getElementById('btnBudgToggleAll').onclick = () => {
    const parentIds = new Set((_budgetData?.categories||[]).filter(c=>c.parent_id).map(c=>c.parent_id));
    const allCollapsed = [...parentIds].every(id => _budgetCollapsed.has(id));
    if (allCollapsed) _budgetCollapsed.clear();
    else parentIds.forEach(id => _budgetCollapsed.add(id));
    document.getElementById('btnBudgToggleAll').textContent = allCollapsed ? 'Comprimi tutto' : 'Espandi tutto';
    renderBudgetTable();
  };

  await loadBudgetTable();
}

window._setBudgetTab = tab => {
  _budgetTab = tab;
  document.querySelectorAll('#pg-budgets [data-btab]').forEach(b => {
    b.classList.toggle('active', b.dataset.btab === tab);
  });
  document.getElementById('budgGridWrap').style.display      = tab === 'grid'        ? 'block' : 'none';
  document.getElementById('budgAndamentoWrap').style.display = tab === 'andamento'   ? 'block' : 'none';
  document.getElementById('budgScostWrap').style.display     = tab === 'scostamenti' ? 'block' : 'none';
  document.getElementById('budgMeseWrap').style.display      = tab === 'mese'        ? 'block' : 'none';
  document.getElementById('budgGridActions').style.display   = tab === 'grid'        ? 'flex' : 'none';
  if (tab === 'andamento'   && _budgetData) renderBudgetAndamento();
  if (tab === 'scostamenti' && _budgetData) renderBudgetScostamenti();
  if (tab === 'mese'        && _budgetData) renderBudgetMese();
};

let _accFavoritesOnly = false;
let _budgetData = null;
let _budgetCollapsed = new Set();
let _budgetOnlyRed = false;
let _budgetOnlyCurrentMonth = false;
let _budgetDetailNavList = [];
let _budgetDetailNavIdx  = 0;
let _budgetScostTab  = 'uscite';
let _budgetScostSort = 'pct';

async function loadBudgetTable() {
  _budgetData = await api.getBudgetYear(budgetYear);
  renderBudgetTable();
  if (_budgetTab === 'andamento')   renderBudgetAndamento();
  if (_budgetTab === 'scostamenti') renderBudgetScostamenti();
  if (_budgetTab === 'mese')        renderBudgetMese();
}

/* ─── Budget: calcolo distribuzione mensile da master_amount ─────────────── */
// Dati cfg (da budget_config) e stored ({mese: importo}) → mappa {1..12: importo}
function _budgetEffective(cfg, stored) {
  if (!cfg || !cfg.master_amount) return { ...stored };
  const lockedTotal = cfg.mode === 'annuale' ? cfg.master_amount : cfg.master_amount * 12;
  const pinnedMonths = Object.keys(stored).map(Number);
  const pinnedSum = pinnedMonths.reduce((s, m) => s + (stored[m] || 0), 0);
  const freeCount = 12 - pinnedMonths.length;
  const freeVal = freeCount > 0 ? Math.round((lockedTotal - pinnedSum) / freeCount * 100) / 100 : 0;
  const result = { ...stored };
  for (let m = 1; m <= 12; m++) if (result[m] === undefined) result[m] = Math.max(0, freeVal);
  return result;
}

/* ─── Budget: mappe condivise tra le 3 viste ─────────────────────────────── */
function _buildBudgetMaps() {
  const { budgets, actuals, categories, configs } = _budgetData;
  const budgetMap = {}, actualMap = {}, configMap = {}, catById = {};
  budgets.forEach(b => {
    if (!budgetMap[b.category_id]) budgetMap[b.category_id] = {};
    budgetMap[b.category_id][b.month] = b.amount;
  });
  actuals.forEach(a => {
    if (!actualMap[a.category_id]) actualMap[a.category_id] = {};
    actualMap[a.category_id][a.month] = a.total;
  });
  (configs || []).forEach(c => { configMap[c.category_id] = c; });
  categories.forEach(c => { catById[c.id] = c; });

  const parentIds = new Set(categories.filter(c => c.parent_id).map(c => c.parent_id));
  const childrenOf = {};
  categories.forEach(c => { if (c.parent_id) (childrenOf[c.parent_id] ??= []).push(c); });
  const leafCats = categories.filter(c => !parentIds.has(c.id));

  const getEffective = catId => _budgetEffective(configMap[catId], budgetMap[catId] || {});

  return { budgetMap, actualMap, configMap, catById, parentIds, childrenOf, leafCats, getEffective };
}

function renderBudgetTable() {
  const { categories } = _budgetData;

  if (!categories.length) {
    document.getElementById('budgetBody').innerHTML =
      `<tr><td colspan="16" style="text-align:center;padding:40px;color:var(--txt3)">
        Nessuna categoria trovata. Aggiungile prima dalla pagina Categorie.
      </td></tr>`;
    return;
  }

  const { budgetMap, actualMap, configMap, parentIds, childrenOf, leafCats, getEffective } = _buildBudgetMaps();

  const now = new Date();
  const curYear = now.getFullYear(), curMonth = now.getMonth() + 1;
  const isCurMonthCol = m => budgetYear === curYear && m === curMonth;

  const sumBm = id => {
    const direct = getEffective(id);
    const kids = childrenOf[id] || [];
    const result = {...direct};
    kids.forEach(k => {
      const km = getEffective(k.id);
      for (let m = 1; m <= 12; m++) result[m] = (result[m]||0) + (km[m]||0);
    });
    return result;
  };
  const sumAm = id => {
    const direct = actualMap[id] || {};
    const kids = childrenOf[id] || [];
    const result = {...direct};
    kids.forEach(k => {
      const km = actualMap[k.id] || {};
      for (let m = 1; m <= 12; m++) result[m] = (result[m]||0) + (km[m]||0);
    });
    return result;
  };

  const rows = categories.map(cat => {
    const isGroupHeader = parentIds.has(cat.id);
    const isChild = !!cat.parent_id;
    const bm = isGroupHeader ? sumBm(cat.id) : getEffective(cat.id);
    const am = isGroupHeader ? sumAm(cat.id) : (actualMap[cat.id] || {});
    const annualBudget = Object.values(bm).reduce((s,v)=>s+v,0);
    const annualActual = Object.values(am).reduce((s,v)=>s+v,0);

    const isIncome = cat.type === 'income';
    const isOver = (budget, actual) => budget > 0 && (isIncome ? actual < budget : actual > budget);

    // Colonna Gestione
    const cfg = configMap[cat.id];
    const gestioneCell = isGroupHeader
      ? `<td class="budget-gestione-cell budget-cell-parent"></td>`
      : `<td class="budget-gestione-cell" onclick="_budgetEditGestione(${cat.id},'${cat.name.replace(/'/g,"\\'")}')">
          ${cfg && cfg.master_amount > 0
            ? `<span class="budget-gestione-badge ${cfg.mode === 'annuale' ? 'annual' : 'monthly'}">${cfg.mode === 'annuale' ? 'Annuale' : 'Mensile'} / ${fmt.currency(cfg.master_amount)}</span>`
            : `<span class="budget-gestione-empty">+ Imposta</span>`}
        </td>`;

    const hasCfg = !isGroupHeader && cfg && cfg.master_amount > 0;
    const isPast = m => budgetYear < curYear || (budgetYear === curYear && m <= curMonth);

    const cellBottom = (budget, actual, m) => {
      const past = isPast(m);
      const showActual = actual > 0 && past;
      // diff: mostrata per tutti i mesi passati/correnti, anche senza transazioni
      // Se hasCfg ma budget calcolato = 0 (master_amount esaurito), mostra comunque se c'è spesa reale
      const showDiff = past && (budget > 0 || (hasCfg && actual > 0));
      // income: diff = actual - budget (negativo = sotto il previsto = rosso)
      // expense: diff = budget - actual (negativo = sforato = rosso)
      // 0 sempre verde
      const diff = isIncome ? (actual - budget) : (budget - actual);
      const diffColor = diff < 0 ? 'var(--expense)' : 'var(--income)';
      const diffStr = (diff >= 0 ? '+' : '') + fmt.currency(diff);
      if (!showActual && !showDiff) return '';
      return `${(showActual || showDiff) ? `<span class="budget-cell-actual">${showActual ? fmt.currency(actual) : '&nbsp;'}</span>` : ''}
        ${showDiff ? `<span class="budget-cell-diff" style="color:${diffColor}">${diffStr}</span>` : ''}`;
    };
    const cells = Array.from({length:12},(_,i)=>{
      const m = i+1;
      const budget = bm[m] || 0;
      const actual = am[m] || 0;
      const over = isPast(m) && isOver(budget, actual);
      const budgetStr = (budget > 0 || hasCfg) ? fmt.currency(budget) : '';
      const curCls = isCurMonthCol(m) ? ' budget-cur-month' : '';
      if (isGroupHeader) {
        const collapsed = _budgetCollapsed.has(cat.id);
        return `<td class="budget-cell budget-cell-parent budget-cell-readonly${curCls}" data-over="${collapsed&&over?1:0}">
          ${collapsed ? `<span class="budget-cell-val">${budget>0?fmt.currency(budget):''}</span>` : ''}
          ${collapsed ? cellBottom(budget, actual, m) : ''}
        </td>`;
      }
      const isCalc = hasCfg && (budgetMap[cat.id]?.[m] === undefined);
      return `<td class="budget-cell${isCalc?' budget-cell-calc':''}${curCls}"
                  data-cat="${cat.id}" data-month="${m}" data-over="${over?1:0}"
                  onclick="_budgetCellEdit(this,${cat.id},${m})">
        <span class="budget-cell-val">${budgetStr}</span>
        ${cellBottom(budget, actual, m)}
      </td>`;
    }).join('');
    const anyOver = Array.from({length:12}, (_,i) => isPast(i+1) && isOver(bm[i+1]||0, am[i+1]||0)).some(Boolean);

    // Totale: se annuale e ci sono mesi liberi, usa almeno master_amount;
    // se tutti i mesi sono impostati manualmente, usa solo la loro somma
    const pinnedCount = isGroupHeader ? 0 : Object.keys(budgetMap[cat.id] || {}).length;
    const displayTotal = (!isGroupHeader && cfg && cfg.mode === 'annuale' && cfg.master_amount > 0 && pinnedCount < 12)
      ? Math.max(cfg.master_amount, annualBudget) : annualBudget;
    const totalOver = isOver(displayTotal, annualActual);
    const actions = isGroupHeader
      ? `<td class="budget-actions-cell"></td>`
      : `<td class="budget-actions-cell">
           <button class="btn btn-ghost btn-icon" title="Svuota" onclick="_budgetClearRow(${cat.id})">🗑️</button>
         </td>`;

    const isCollapsed = isGroupHeader && _budgetCollapsed.has(cat.id);
    const parentCollapsed = isChild && _budgetCollapsed.has(cat.parent_id);
    const rowStyle = parentCollapsed ? 'display:none' : '';

    const showParentData = !isGroupHeader || isCollapsed;
    return `<tr class="${isGroupHeader?'budget-row-parent':''} ${isChild?'budget-row-child':''}" data-cat-id="${cat.id}" data-parent-id="${cat.parent_id||''}" data-row-over="${showParentData&&anyOver?1:0}" style="${rowStyle}" ${isGroupHeader?`ondblclick="_budgetToggle(${cat.id})"`:''}">
      <td class="budget-cat-cell ${isChild?'budget-child-indent':''}">
        ${isGroupHeader ? `<button class="btn-budget-toggle" onclick="_budgetToggle(${cat.id})">${isCollapsed?'▶':'▼'}</button>` : ''}
        <span style="color:${cat.color}">${cat.icon}</span> ${cat.name}
        ${isGroupHeader?'<span class="budget-group-hint"> (riepilogo)</span>':''}
        <button class="btn-budget-detail" title="Dettaglio" onclick="event.stopPropagation();_budgetShowDetail(${cat.id},'${cat.name.replace(/'/g,"\\'")}')">📊</button>
      </td>
      ${gestioneCell}
      ${cells}
      <td class="budget-total-cell ${isGroupHeader?'budget-cell-parent':''}">
        ${showParentData&&displayTotal>0?`<b>${fmt.currency(displayTotal)}</b>`:''}
        ${showParentData&&displayTotal>0?`<span class="budget-cell-actual ${totalOver?'over':''}">${fmt.currency(annualActual)}</span>`:''}
      </td>
      ${actions}
    </tr>`;
  }).join('');

  // ── Righe sommario (Reale / Budget / Differenza) ─────────────────────────
  const mReale = {}, mBudget = {};
  for (let m = 1; m <= 12; m++) {
    // income categories contribute positively, expense negatively → net balance
    mReale[m]  = leafCats.reduce((s,c) => s + (c.type === 'income' ? 1 : -1) * (actualMap[c.id]?.[m]||0), 0);
    mBudget[m] = leafCats.reduce((s,c) => s + (c.type === 'income' ? 1 : -1) * (getEffective(c.id)[m]||0), 0);
  }
  const totReale  = Object.values(mReale).reduce((s,v)=>s+v,0);
  const totBudget = Object.values(mBudget).reduce((s,v)=>s+v,0);
  // diff = actual - budget: positive means surplus (doing better than planned) → green
  const totDiff   = totReale - totBudget;

  const s = 'padding:5px 8px;white-space:nowrap;border-bottom:1px solid var(--border)';
  const numCell = (v, show, colorize, bold, month=0) => {
    const col = colorize ? (v>0?'color:var(--income)':v<0?'color:var(--expense)':'') : '';
    const curCls = isCurMonthCol(month) ? ' budget-cur-month' : '';
    const mCls = month > 0 ? ' budget-month-col' : '';
    return `<td class="${(curCls+mCls).trim()}" style="${s};text-align:right;${bold?'font-weight:700;':''}${col}">${show?fmt.currency(v):''}</td>`;
  };

  document.getElementById('budgetThead').innerHTML = `
    <tr class="budget-thead-months">
      <th style="${s};min-width:160px">Categoria</th>
      <th style="${s};min-width:110px">Gestione</th>
      ${MONTHS_SHORT.map((m,i)=>`<th class="budget-month-col${isCurMonthCol(i+1)?' budget-cur-month':''}" style="${s};text-align:right">${m}</th>`).join('')}
      <th style="${s};text-align:right">Totale</th>
      <th style="${s}"></th>
    </tr>
    <tr class="budget-summary-row budget-row-reale">
      <td style="${s};font-weight:600;color:var(--txt2)">Reale</td>
      <td style="${s}"></td>
      ${Array.from({length:12},(_,i)=>numCell(mReale[i+1], mReale[i+1]!==0, false, false, i+1)).join('')}
      ${numCell(totReale, totReale!==0, false, true)}
      <td style="${s}"></td>
    </tr>
    <tr class="budget-summary-row budget-row-budget">
      <td style="${s};font-weight:600;color:var(--txt2)">Budget</td>
      <td style="${s}"></td>
      ${Array.from({length:12},(_,i)=>numCell(mBudget[i+1], mBudget[i+1]!==0, false, false, i+1)).join('')}
      <td class="budget-total-highlight" style="${s};text-align:right;">${totBudget!==0?fmt.currency(totBudget):''}</td>
      <td style="${s}"></td>
    </tr>
    <tr class="budget-summary-row budget-row-diff">
      <td style="${s};font-weight:600;color:var(--txt2)">Differenza</td>
      <td style="${s}"></td>
      ${Array.from({length:12},(_,i)=>{
        const diff = mReale[i+1] - mBudget[i+1];
        return numCell(diff, mBudget[i+1]!==0||mReale[i+1]!==0, true, false, i+1);
      }).join('')}
      ${numCell(totDiff, totBudget!==0||totReale!==0, true, true)}
      <td style="${s}"></td>
    </tr>`;

  document.getElementById('budgetBody').innerHTML = rows;

  // Sticky: calcola top offset di ogni riga del thead dopo il layout
  // Il double-rAF garantisce che il browser abbia completato il layout prima di leggere le altezze
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const thead = document.getElementById('budgetThead');
    if (!thead) return;
    let top = 0;
    thead.querySelectorAll('tr').forEach(tr => {
      tr.querySelectorAll('th,td').forEach(cell => {
        cell.style.position = 'sticky';
        cell.style.top = top + 'px';
        cell.style.zIndex = '20';
      });
      top += tr.getBoundingClientRect().height;
    });
  }));
}

/* ─── Budget Andamento ───────────────────────────────────────────────────── */
function renderBudgetAndamento() {
  const el = document.getElementById('budgAndamentoWrap');
  if (!el || !_budgetData) return;

  const { actualMap, leafCats, getEffective } = _buildBudgetMaps();

  const now = new Date();
  const curYear = now.getFullYear(), curMonth = now.getMonth()+1;
  const isPast = m => budgetYear < curYear || (budgetYear === curYear && m <= curMonth);
  const sign = c => c.type === 'income' ? 1 : -1;

  // Mensile
  const budgetMese = Array.from({length:12}, (_,i) =>
    leafCats.reduce((s,c) => s + sign(c)*(getEffective(c.id)[i+1]||0), 0));
  const realeMese  = Array.from({length:12}, (_,i) =>
    isPast(i+1) ? leafCats.reduce((s,c) => s + sign(c)*(actualMap[c.id]?.[i+1]||0), 0) : null);

  // Progressivo
  const budgetProg = [], realeProg = [];
  let bCum=0, aCum=0;
  for (let i=0; i<12; i++) {
    bCum += budgetMese[i];
    budgetProg.push(bCum);
    if (realeMese[i] !== null) { aCum += realeMese[i]; realeProg.push(aCum); }
    else realeProg.push(null);
  }

  const deltaMese = realeMese.map((r,i) => r !== null ? r - budgetMese[i] : null);
  const deltaProg = realeProg.map((r,i) => r !== null ? r - budgetProg[i] : null);

  // ── Render ────────────────────────────────────────────────────────────────
  el.innerHTML = `
    <div class="card" style="margin-top:16px;margin-bottom:16px">
      <div class="proj-chart-wrap"><canvas id="budgAndChart"></canvas></div>
    </div>
    <div class="card" style="overflow-x:auto">
      <table id="budgAndTable" style="width:100%;border-collapse:collapse">
        <thead><tr>
          <th style="text-align:left;padding:7px 12px;border-bottom:2px solid var(--border);color:var(--txt2);font-weight:600">Mese</th>
          <th data-col="bm" style="text-align:right;padding:7px 12px;border-bottom:2px solid var(--border);border-left:2px solid var(--accent);color:var(--txt2);font-weight:600;cursor:grab">Budget mese (A)</th>
          <th data-col="rm" style="text-align:right;padding:7px 12px;border-bottom:2px solid var(--border);border-left:1px solid var(--border);color:var(--txt2);font-weight:600;cursor:grab">Reale mese (B)</th>
          <th data-col="dm" style="text-align:right;padding:7px 12px;border-bottom:2px solid var(--border);border-left:1px solid var(--border);color:var(--txt2);font-weight:600;cursor:grab">Δ mese (B−A)</th>
          <th data-col="bp" style="text-align:right;padding:7px 12px;border-bottom:2px solid var(--border);border-left:2px solid var(--accent2);color:var(--txt2);font-weight:600;cursor:grab">Budget prog. (AA)</th>
          <th data-col="rp" style="text-align:right;padding:7px 12px;border-bottom:2px solid var(--border);border-left:1px solid var(--border);color:var(--txt2);font-weight:600;cursor:grab">Reale prog. (BB)</th>
          <th data-col="dp" style="text-align:right;padding:7px 12px;border-bottom:2px solid var(--border);border-left:1px solid var(--border);color:var(--txt2);font-weight:600;cursor:grab">Δ prog. (BB−AA)</th>
        </tr></thead>
        <tbody>${MONTHS_SHORT.map((mName, i) => {
          const bm = budgetMese[i], bp = budgetProg[i];
          const rm = realeMese[i], rp = realeProg[i];
          const dm = deltaMese[i], dp = deltaProg[i];
          const past = isPast(i+1);
          const fmtD = v => v == null ? '—' : (v >= 0 ? '+' : '') + fmt.currency(v);
          const colD  = v => v == null ? '' : v >= 0 ? 'color:var(--income)' : 'color:var(--expense)';
          const sep   = s => s ? `border-left:2px solid ${s};` : '';
          const _cbl  = s => s==='bm'?'border-left:2px solid var(--accent);':s==='bp'?'border-left:2px solid var(--accent2);':s==='rm'||s==='dm'||s==='rp'||s==='dp'?'border-left:1px solid var(--border);':'';
          const td  = (v, s='') => `<td data-col="${s}" style="text-align:right;padding:7px 12px;border-bottom:1px solid var(--border);${_cbl(s)}">${v!=null?fmt.currency(v):'—'}</td>`;
          const tdd = (v, s='') => `<td data-col="${s}" style="text-align:right;padding:7px 12px;border-bottom:1px solid var(--border);${_cbl(s)}${colD(v)}">${fmtD(v)}</td>`;
          const dash = (s='') => `<td data-col="${s}" style="text-align:right;padding:7px 12px;border-bottom:1px solid var(--border);${_cbl(s)}color:var(--txt3)">—</td>`;
          const rowBg = past && dm !== null ? (dm > 0 ? 'background:rgba(63,185,80,.04)' : dm < 0 ? 'background:rgba(248,81,73,.04)' : '') : '';
          return `<tr style="${rowBg}">
            <td style="padding:7px 12px;border-bottom:1px solid var(--border);font-weight:500">${mName} ${budgetYear}</td>
            ${td(bm,'bm')}
            ${past ? td(rm,'rm') : dash('rm')}
            ${past ? tdd(dm,'dm') : '<td data-col="dm" style="padding:7px 12px;border-bottom:1px solid var(--border);border-left:1px solid var(--border)"></td>'}
            ${td(bp,'bp')}
            ${past ? td(rp,'rp') : dash('rp')}
            ${past ? tdd(dp,'dp') : '<td data-col="dp" style="padding:7px 12px;border-bottom:1px solid var(--border);border-left:1px solid var(--border)"></td>'}
          </tr>`;
        }).join('')}</tbody>
      </table>
    </div>`;

  // ── Drag colonne ─────────────────────────────────────────────────────────
  _wireBudgetAndDrag();

  // ── Grafico ───────────────────────────────────────────────────────────────
  if (_budgetAndamentoChart) { _budgetAndamentoChart.destroy(); _budgetAndamentoChart = null; }
  const ctx = document.getElementById('budgAndChart');
  if (!ctx) return;
  _budgetAndamentoChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: MONTHS_SHORT,
      datasets: [
        {
          type: 'bar',
          label: 'Budget mese',
          data: budgetMese,
          backgroundColor: 'rgba(88,166,255,.35)',
          borderColor: 'rgba(88,166,255,.7)',
          borderWidth: 1,
          borderRadius: 3,
          order: 2
        },
        {
          type: 'bar',
          label: 'Reale mese',
          data: realeMese,
          backgroundColor: realeMese.map((v,i) =>
            v === null ? 'transparent' : v >= budgetMese[i] ? 'rgba(63,185,80,.45)' : 'rgba(248,81,73,.45)'),
          borderColor: realeMese.map((v,i) =>
            v === null ? 'transparent' : v >= budgetMese[i] ? 'rgba(63,185,80,.8)' : 'rgba(248,81,73,.8)'),
          borderWidth: 1,
          borderRadius: 3,
          order: 2
        },
        {
          type: 'line',
          label: 'Budget prog.',
          data: budgetProg,
          borderColor: '#58a6ff',
          backgroundColor: 'transparent',
          tension: 0.3, pointRadius: 3, pointHoverRadius: 5,
          order: 1
        },
        {
          type: 'line',
          label: 'Reale prog.',
          data: realeProg,
          borderColor: '#3fb950',
          backgroundColor: 'transparent',
          tension: 0.3, pointRadius: 3, pointHoverRadius: 5,
          spanGaps: false,
          order: 1
        },
        {
          type: 'line',
          label: 'Δ cumulativo',
          data: deltaProg,
          borderColor: '#b388ff',
          borderWidth: 1,
          fill: { target: 'origin', above: 'rgba(63,185,80,0.18)', below: 'rgba(248,81,73,0.18)' },
          tension: 0.3, pointRadius: 2, pointHoverRadius: 4,
          spanGaps: false,
          order: 1,
          segment: {
            borderColor: ctx => {
              const avg = ((ctx.p0.parsed.y ?? 0) + (ctx.p1.parsed.y ?? 0)) / 2;
              return avg >= 0 ? 'rgba(63,185,80,0.9)' : 'rgba(248,81,73,0.9)';
            }
          },
          pointBackgroundColor: ctx => ctx.parsed.y >= 0 ? 'rgba(63,185,80,0.9)' : 'rgba(248,81,73,0.9)'
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: chartColors().tick } },
        tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${fmt.currency(ctx.parsed.y)}` } },
        zoom: zoomOpts()
      },
      scales: {
        x: { ticks: { color: chartColors().tick }, grid: { color: chartColors().grid } },
        y: {
          ticks: { color: chartColors().tick, callback: v => fmt.currency(v) },
          grid: { color: chartColors().grid }
        }
      }
    }
  });
}

let _budgAndDragFrom = null;
let _budgAndDragController = null;

function _wireBudgetAndDrag() {
  // Rimuove i vecchi listener prima di ri-agganciare (evita accumulo su re-drop)
  if (_budgAndDragController) _budgAndDragController.abort();
  _budgAndDragController = new AbortController();
  const signal = _budgAndDragController.signal;

  const table = document.getElementById('budgAndTable');
  if (!table) return;
  const headers = [...table.querySelectorAll('thead th[data-col]')];

  headers.forEach(th => {
    th.addEventListener('dragstart', e => {
      _budgAndDragFrom = th.dataset.col;
      e.dataTransfer.effectAllowed = 'move';
      th.style.opacity = '0.4';
    }, { signal });
    th.addEventListener('dragend', () => {
      th.style.opacity = '';
      table.querySelectorAll('th[data-col]').forEach(h => h.style.outline = '');
    }, { signal });
    th.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      table.querySelectorAll('th[data-col]').forEach(h => h.style.outline = '');
      if (th.dataset.col !== _budgAndDragFrom)
        th.style.outline = '2px dashed var(--accent)';
    }, { signal });
    th.addEventListener('dragleave', () => { th.style.outline = ''; }, { signal });
    th.addEventListener('drop', e => {
      e.preventDefault();
      th.style.outline = '';
      const toCol = th.dataset.col;
      if (!_budgAndDragFrom || _budgAndDragFrom === toCol) return;
      // Sposta la colonna in ogni riga
      table.querySelectorAll('tr').forEach(row => {
        const from = row.querySelector(`[data-col="${_budgAndDragFrom}"]`);
        const to   = row.querySelector(`[data-col="${toCol}"]`);
        if (!from || !to) return;
        const fromIdx = [...row.children].indexOf(from);
        const toIdx   = [...row.children].indexOf(to);
        if (fromIdx < toIdx) row.insertBefore(from, to.nextSibling);
        else                 row.insertBefore(from, to);
      });
      _budgAndDragFrom = null;
      // Ri-aggancia drag sui nuovi header (i vecchi listener vengono rimossi dall'abort)
      _wireBudgetAndDrag();
    }, { signal });
    // Abilita drag (l'attributo draggable deve essere settato via JS per evitare problemi con Chrome)
    th.setAttribute('draggable', 'true');
  });
}

/* ─── Budget Scostamenti YTD ─────────────────────────────────────────────── */
function renderBudgetScostamenti() {
  const el = document.getElementById('budgScostWrap');
  if (!el || !_budgetData) return;

  const { actualMap, catById, leafCats, getEffective } = _buildBudgetMaps();

  const now = new Date();
  const curYear = now.getFullYear(), curMonth = now.getMonth()+1;
  const ytdMonths = budgetYear < curYear ? 12 : (budgetYear===curYear ? curMonth : 0);
  const MONTHS_IT = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
                     'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
  const untilName = ytdMonths>0 ? MONTHS_IT[ytdMonths-1] : '—';

  // Calcola YTD per ogni categoria foglia
  const allRows = leafCats.map(cat => {
    const eff = getEffective(cat.id), am = actualMap[cat.id]||{};
    let bYTD=0, rYTD=0;
    for (let m=1; m<=ytdMonths; m++) { bYTD+=eff[m]||0; rYTD+=am[m]||0; }
    const parent = cat.parent_id ? catById[cat.parent_id] : null;
    const isExp  = cat.type==='expense';
    // Valori con segno per display (expense = negativi)
    const bDisplay = isExp ? -bYTD : bYTD;
    const rDisplay = isExp ? -rYTD : rYTD;
    const diff = rDisplay - bDisplay;
    // % scostamento: per expense positivo = sforato (rosso), negativo = risparmiato (verde)
    //               per income  positivo = guadagnato di più (verde), negativo = meno (rosso)
    const pct = bYTD!==0 ? (rYTD-bYTD)/bYTD*100 : (rYTD!==0 ? (isExp?100:-100) : 0);
    // isGood: expense → pct<=0 (risparmiato), income → pct>=0 (guadagnato di più)
    const isGood = isExp ? pct<=0 : pct>=0;
    return { cat, parent, bDisplay, rDisplay, diff, pct, isGood, bYTD, rYTD };
  }).filter(r => r.bYTD>0 || r.rYTD>0);

  const expRows = allRows.filter(r=>r.cat.type==='expense');
  const incRows = allRows.filter(r=>r.cat.type==='income');

  const sortFn = rows => [...rows].sort((a,b) => {
    switch (_budgetScostSort) {
      case 'pct':    return b.pct - a.pct;          // worst first (expense: più sforato; income: più guadagnato)
      case 'diff':   return a.diff - b.diff;         // più negativo (expense: sforato) / meno positivo (income)
      case 'budget': return Math.abs(b.bYTD)-Math.abs(a.bYTD); // budget più alto prima
      case 'cat':    return a.cat.name.localeCompare(b.cat.name);
      default:       return b.pct - a.pct;
    }
  });

  const activeRows = sortFn(_budgetScostTab==='uscite' ? expRows : incRows);

  // Totali
  const totB = activeRows.reduce((s,r)=>s+r.bDisplay,0);
  const totR = activeRows.reduce((s,r)=>s+r.rDisplay,0);
  const totD = totR - totB;
  const totCol = totD>=0 ? 'var(--income)' : 'var(--expense)';

  // Scala barre
  const maxPct = Math.max(1, ...activeRows.map(r=>Math.abs(r.pct)));
  const fmtPct = p => (p>=0?'+':'')+p.toFixed(1)+'%';

  const thS = 'padding:7px 10px;border-bottom:2px solid var(--border);color:var(--txt2);font-weight:600;white-space:nowrap';
  const tdS = 'padding:5px 10px;border-bottom:1px solid var(--border);white-space:nowrap';

  el.innerHTML = `
    <div style="padding:14px 0 6px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
      <div>
        <h3 style="margin:0 0 6px;font-size:15px">Scostamenti YTD fino a <b>${untilName} ${budgetYear}</b></h3>
        <div style="font-size:13px;color:var(--txt2)">
          Budget YTD <b>${fmt.currency(totB)}</b> &nbsp;|&nbsp; Reale YTD <b>${fmt.currency(totR)}</b> &nbsp;|&nbsp;
          <span style="color:${totCol}"><b>Diff ${totD>=0?'+':''}${fmt.currency(totD)}</b></span>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <div style="display:flex;gap:0;border:1px solid var(--border);border-radius:6px;overflow:hidden">
          <button class="btn btn-xs ${_budgetScostTab==='uscite'?'btn-primary':'btn-ghost'}" style="border-radius:0"
            onclick="_budgetScostTab='uscite';renderBudgetScostamenti()">🔴 Uscite</button>
          <button class="btn btn-xs ${_budgetScostTab==='entrate'?'btn-primary':'btn-ghost'}" style="border-radius:0;border-left:1px solid var(--border)"
            onclick="_budgetScostTab='entrate';renderBudgetScostamenti()">🟢 Entrate</button>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:12px;color:var(--txt2)">Ordina per:</span>
          <select class="form-control" style="font-size:12px;padding:3px 8px;width:auto"
            onchange="_budgetScostSort=this.value;renderBudgetScostamenti()">
            <option value="pct"    ${_budgetScostSort==='pct'   ?'selected':''}>%</option>
            <option value="diff"   ${_budgetScostSort==='diff'  ?'selected':''}>Diff</option>
            <option value="budget" ${_budgetScostSort==='budget'?'selected':''}>Budget</option>
            <option value="cat"    ${_budgetScostSort==='cat'   ?'selected':''}>Categoria</option>
          </select>
        </div>
      </div>
    </div>
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr>
          <th style="${thS};text-align:right;width:32px">#</th>
          <th style="${thS};text-align:left">Macro-cat</th>
          <th style="${thS};text-align:left">Categoria</th>
          <th style="${thS};text-align:right">Budget YTD</th>
          <th style="${thS};text-align:right">Reale YTD</th>
          <th style="${thS};text-align:right">Diff</th>
          <th style="${thS};text-align:right">%</th>
          <th style="${thS};text-align:left;min-width:220px">Scostamento</th>
        </tr></thead>
        <tbody>${activeRows.map((r,i) => {
          const hasActual = r.rYTD > 0;
          const color = r.isGood ? 'var(--income)' : 'var(--expense)';
          const barBg  = r.isGood ? 'rgba(63,185,80,.65)' : 'rgba(248,81,73,.65)';
          const rowBg  = !r.isGood && Math.abs(r.pct)>3 ? 'background:rgba(248,81,73,.05)' :
                          r.isGood && Math.abs(r.pct)>3 ? 'background:rgba(63,185,80,.04)' : '';
          const barW   = Math.min(100, Math.abs(r.pct)/maxPct*100).toFixed(1);
          const diffStr = hasActual ? (r.diff>=0?'+':'')+fmt.currency(r.diff) : '—';
          const pctStr  = hasActual ? fmtPct(r.pct) : '—';
          const pctCol  = hasActual ? color : 'var(--txt3)';
          const macroEl = r.parent
            ? `<span style="color:${r.parent.color}">${r.parent.icon}</span> <span style="color:var(--txt2)">${r.parent.name}</span>`
            : `<span style="color:var(--txt3)">—</span>`;
          return `<tr style="${rowBg}">
            <td style="${tdS};text-align:right;color:var(--txt3)">${i+1}</td>
            <td style="${tdS};font-size:12px">${macroEl}</td>
            <td style="${tdS}"><span style="color:${r.cat.color}">${r.cat.icon}</span> ${r.cat.name} <button class="btn-budget-detail" title="Grafico categoria" onclick="_budgetShowDetail(${r.cat.id},'${r.cat.name.replace(/'/g,"\\'")}')">📊</button></td>
            <td style="${tdS};text-align:right;font-variant-numeric:tabular-nums">${fmt.currency(r.bDisplay)}</td>
            <td style="${tdS};text-align:right;font-variant-numeric:tabular-nums">${hasActual?fmt.currency(r.rDisplay):'—'}</td>
            <td style="${tdS};text-align:right;font-variant-numeric:tabular-nums;color:${pctCol}">${diffStr}</td>
            <td style="${tdS};text-align:right;font-weight:600;color:${pctCol}">${pctStr}</td>
            <td style="${tdS}">
              <div class="flex-center-8">
                <div style="flex:1;height:14px;background:var(--bg3);border-radius:3px;overflow:hidden;position:relative">
                  ${hasActual?`<div style="position:absolute;right:0;top:0;height:100%;width:${barW}%;background:${barBg};border-radius:3px"></div>`:''}
                </div>
                <span style="font-size:11px;color:${pctCol};min-width:52px;text-align:right;font-weight:600">${pctStr}</span>
              </div>
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table>
    </div>`;
}

/* ─── Budget Mese: zone colore (% + importo assoluto) ───────────────────── */
function _budgetMeseZone(pctUsed, budget, spent, isExpSide) {
  if (isExpSide) {
    if (pctUsed <= 70) return 'dkgreen';
    if (pctUsed <= 85) return 'green';
    if (pctUsed < 100) return 'ltgreen';   // 85–99%
    const absOver = spent - budget;
    if (absOver <= 0)  return 'blue';       // esattamente 100%
    // Sforato: combina euro assoluti e percentuale
    // formula: absOver × (1 + pctOver/200) — la % scala senza dominare
    const combined = absOver * (1 + (pctUsed - 100) / 200);
    if (combined < 30)  return 'ltamber';
    if (combined < 60)  return 'amber';
    if (combined < 100) return 'ltred';
    return 'red';
  } else {
    if (pctUsed >= 100) return 'green';
    if (pctUsed >= 80)  return 'ltgreen';
    const absMissing = budget - spent;
    if (absMissing < 50)  return 'ltgreen';
    if (absMissing < 200) return 'amber';
    return 'red';
  }
}
const _MESE_ZONE_STYLE = {
  dkgreen: { color: '#2a7a42',        bg: 'rgba(42,122,66,.07)',   bar: '#2a7a42'        },
  green:   { color: 'var(--income)',  bg: 'rgba(63,185,80,.05)',   bar: 'var(--income)'  },
  ltgreen: { color: '#5a9a6a',        bg: 'rgba(90,154,106,.04)',  bar: '#5a9a6a'        },
  blue:    { color: '#4a9cf0',        bg: 'rgba(74,156,240,.07)',  bar: '#4a9cf0'        },
  ltamber: { color: '#b88030',        bg: 'rgba(184,128,48,.05)',  bar: '#b88030'        },
  amber:   { color: '#e07010',        bg: 'rgba(224,112,16,.07)',  bar: '#e07010'        },
  ltred:   { color: '#c84040',        bg: 'rgba(200,64,64,.06)',   bar: '#c84040'        },
  red:     { color: 'var(--expense)', bg: 'rgba(248,81,73,.08)',   bar: 'var(--expense)' },
};

/* ─── Budget Mese Treemap ─────────────────────────────────────────────────── */
function _drawBudgetMeseTreemap(rows, vw, vh, isExpSide) {
  if (!rows.length) return `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--txt3);font-size:13px">Nessun dato</div>`;

  const hesc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const sz   = r => Math.max(r.budget, r.spent, 1);
  const sorted = [...rows].sort((a, b) => sz(b) - sz(a));

  function slice(items, x, y, w, h, horiz) {
    if (!items.length) return [];
    if (items.length === 1) return [{ ...items[0], x, y, w, h }];
    const tot = items.reduce((s, r) => s + sz(r), 0);
    let acc = 0, mid = 0;
    for (let i = 0; i < items.length; i++) { acc += sz(items[i]); mid = i; if (acc >= tot / 2) break; }
    const a = items.slice(0, mid + 1), b = items.slice(mid + 1);
    const f = a.reduce((s, r) => s + sz(r), 0) / tot;
    return horiz
      ? [...slice(a, x,       y, w*f,       h, !horiz), ...slice(b, x+w*f, y, w*(1-f), h, !horiz)]
      : [...slice(a, x, y,           w, h*f, !horiz), ...slice(b, x, y+h*f, w, h*(1-f), !horiz)];
  }

  const G = 3;
  const cells = slice(sorted, 0, 0, vw, vh, vw >= vh);

  return cells.map(c => {
    const pw = c.w - G*2, ph = c.h - G*2;
    if (pw < 6 || ph < 6) return '';
    const pct    = c.pctUsed === Infinity ? 999 : c.pctUsed;
    const zone   = _budgetMeseZone(pct, c.budget, c.spent, isExpSide);
    const st     = _MESE_ZONE_STYLE[zone];
    const isOver = c.remaining < 0;
    const pctStr = pct === 999 ? '∞%' : pct.toFixed(0) + '%';
    const area   = Math.sqrt(pw * ph);
    const fsPct  = Math.min(18, Math.max(8,  area / 7));
    const fsName = Math.min(11, Math.max(7,  area / 12));
    const fsRem  = Math.min(10, Math.max(7,  area / 14));
    const fillPct = Math.min(100, pct === 999 ? 100 : pct);
    const showName = pw > 44 && ph > 30;
    const showPct  = pw > 26 && ph > 18;
    const showRem  = isOver && pw > 60 && ph > 58;
    const bgHi   = st.bg.replace(/[\d.]+\)$/, '0.22)');
    const bgLo   = st.bg.replace(/[\d.]+\)$/, '0.07)');
    const border = isOver ? `2px solid ${st.color}` : `1px solid ${st.color}55`;
    const lx = ((c.x + G) / vw * 100).toFixed(3);
    const ly = ((c.y + G) / vh * 100).toFixed(3);
    const lw = (pw / vw * 100).toFixed(3);
    const lh = (ph / vh * 100).toFixed(3);
    return `<div class="tm-cell"
      data-tt-cat="${hesc(c.cat.icon + ' ' + c.cat.name)}"
      data-tt-budget="${hesc(fmt.currency(c.budget))}"
      data-tt-actual="${hesc(fmt.currency(c.spent))}"
      data-tt-rem="${hesc(fmt.currency(Math.abs(c.remaining)))}"
      data-tt-over="${c.remaining < 0 ? '1' : '0'}"
      data-tt-l2="Speso"
      style="position:absolute;left:${lx}%;top:${ly}%;width:${lw}%;height:${lh}%;
        background:linear-gradient(135deg,${bgHi} 0%,${bgLo} 100%);
        border:${border};border-radius:6px;overflow:hidden;box-sizing:border-box;
        display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px">
      ${showName ? `<span style="font-size:${fsName.toFixed(1)}px;color:${st.color};opacity:0.7;padding:0 5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;text-align:center;line-height:1.2">${c.cat.icon} ${hesc(c.cat.name)}</span>` : ''}
      ${showPct  ? `<span style="font-size:${fsPct.toFixed(1)}px;color:${st.color};font-weight:700;line-height:1;letter-spacing:-.5px">${pctStr}</span>` : ''}
      ${showRem  ? `<span style="font-size:${fsRem.toFixed(1)}px;color:${st.color};opacity:0.6;line-height:1">−${hesc(fmt.currency(Math.abs(c.remaining)))}</span>` : ''}
      <div style="position:absolute;bottom:0;left:0;right:0;height:5px;background:rgba(0,0,0,0.15)">
        <div style="height:100%;width:${fillPct.toFixed(1)}%;background:${st.bar};opacity:0.75"></div>
      </div>
    </div>`;
  }).join('');
}

function _showBudgetMeseTreemap() {
  if (!_budgetData) return;
  const { actualMap, catById, leafCats, getEffective } = _buildBudgetMaps();
  const viewMonth = _budgetMeseMonth;
  const MONTHS_IT = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
                     'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
  const allRows = leafCats.map(cat => {
    const eff = getEffective(cat.id);
    const budget = eff[viewMonth] || 0;
    const spent  = (actualMap[cat.id] || {})[viewMonth] || 0;
    if (budget === 0 && spent === 0) return null;
    const pctUsed   = budget > 0 ? (spent / budget) * 100 : (spent > 0 ? Infinity : 0);
    const remaining = cat.type === 'expense' ? budget - spent : spent - budget;
    return { cat, budget, spent, remaining, pctUsed, isExp: cat.type === 'expense' };
  }).filter(r => r !== null);

  const expRows = allRows.filter(r => r.isExp);
  const incRows = allRows.filter(r => !r.isExp);
  const VW = 1000, VH = 700;
  const body = `
    <div id="tmWrap" data-tmactive="exp" style="display:flex;flex-direction:column;height:calc(90vh - 100px);overflow:hidden">
      <div style="display:flex;border-bottom:1px solid var(--border);margin-bottom:10px;flex-shrink:0">
        <button id="tmTab_exp" class="tm-tab" onclick="_tmSwitchTab('exp')">Uscite</button>
        <button id="tmTab_inc" class="tm-tab" onclick="_tmSwitchTab('inc')">Entrate</button>
      </div>
      <div id="tmPane_exp" class="tm-pane">
        <div style="position:relative;flex:1;border-radius:10px;background:var(--bg3);overflow:hidden">
          ${_drawBudgetMeseTreemap(expRows, VW, VH, true)}
        </div>
      </div>
      <div id="tmPane_inc" class="tm-pane">
        <div style="position:relative;flex:1;border-radius:10px;background:var(--bg3);overflow:hidden">
          ${_drawBudgetMeseTreemap(incRows, VW, VH, false)}
        </div>
      </div>
    </div>`;

  openModal(`Mappa di impatto — ${MONTHS_IT[viewMonth - 1]} ${budgetYear}`, body, null, '', '', 'modal-treemap');
  const mb = document.getElementById('modalBody');
  mb.style.overflow = 'hidden';
  mb.style.padding  = '12px 16px';
}

window._tmSwitchTab = id => {
  const wrap = document.getElementById('tmWrap');
  if (wrap) wrap.dataset.tmactive = id;
};

/* ─── Budget Mese Corrente ───────────────────────────────────────────────── */
function renderBudgetMese() {
  const el = document.getElementById('budgMeseWrap');
  if (!el || !_budgetData) return;

  const { actualMap, catById, leafCats, getEffective } = _buildBudgetMaps();

  const now = new Date();
  const curYear = now.getFullYear(), curMonth = now.getMonth() + 1;
  const MONTHS_IT = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
                     'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

  const viewMonth = _budgetMeseMonth;
  const monthName = MONTHS_IT[viewMonth - 1];

  // Costruisce righe per ogni categoria foglia
  const allRows = leafCats.map(cat => {
    const eff    = getEffective(cat.id);
    const budget = eff[viewMonth] || 0;
    const spent  = (actualMap[cat.id] || {})[viewMonth] || 0;
    if (budget === 0 && spent === 0) return null;
    const isExp    = cat.type === 'expense';
    const pctUsed  = budget > 0 ? (spent / budget) * 100 : (spent > 0 ? Infinity : 0);
    // remaining: expense = budget - spent (positivo = libero); income = spent - budget (positivo = extra)
    const remaining = isExp ? budget - spent : spent - budget;
    const absOver   = remaining < 0 ? Math.abs(remaining) : 0;
    const parent    = cat.parent_id ? catById[cat.parent_id] : null;
    return { cat, parent, budget, spent, remaining, pctUsed, absOver, isExp };
  }).filter(r => r !== null);

  const expRows = allRows.filter(r => r.cat.type === 'expense');
  const incRows = allRows.filter(r => r.cat.type === 'income');

  const sortRows = rows => [...rows].sort((a, b) => {
    switch (_budgetMeseSort) {
      case 'rimasto': return a.remaining - b.remaining; // più negativo (sforo) prima
      case 'usage':   return b.pctUsed - a.pctUsed;
      case 'abs':     return b.absOver - a.absOver;
      case 'budget':  return b.budget - a.budget;
      case 'cat':     return a.cat.name.localeCompare(b.cat.name);
      default:       return b.pctUsed - a.pctUsed;
    }
  });

  // Totali per le card di riepilogo
  const expBudget  = expRows.reduce((s, r) => s + r.budget, 0);
  const expSpent   = expRows.reduce((s, r) => s + r.spent, 0);
  const expOver    = expRows.filter(r => r.remaining < 0).length;
  const incBudget  = incRows.reduce((s, r) => s + r.budget, 0);
  const incSpent   = incRows.reduce((s, r) => s + r.spent, 0);
  const incUnder   = incRows.filter(r => r.remaining < 0).length;

  const thS = 'padding:6px 10px;border-bottom:2px solid var(--border);color:var(--txt2);font-weight:600;white-space:nowrap;font-size:12px';
  const tdS = 'padding:5px 10px;border-bottom:1px solid var(--border);white-space:nowrap;font-size:13px';

  const makeRows = (rows, isExpSide) => sortRows(rows).map(r => {
    const pct = r.pctUsed === Infinity ? 999 : r.pctUsed;
    const zone = _budgetMeseZone(pct, r.budget, r.spent, isExpSide);
    const { color: zoneColor, bg: zoneBg, bar: barColor } = _MESE_ZONE_STYLE[zone];
    const barW     = Math.min(100, pct === 999 ? 100 : pct).toFixed(1);
    const pctStr   = pct === 999 ? '∞%' : pct.toFixed(0) + '%';
    const remColor = r.remaining >= 0 ? (isExpSide ? 'var(--income)' : 'var(--income)') : 'var(--expense)';
    const remLabel = r.remaining >= 0
      ? (isExpSide ? fmt.currency(r.remaining) : '+' + fmt.currency(r.remaining))
      : (isExpSide ? '−' + fmt.currency(-r.remaining) : '−' + fmt.currency(-r.remaining));

    const macroEl = r.parent
      ? `<div style="font-size:10px;color:var(--txt3);line-height:1.2">${r.parent.icon} ${r.parent.name}</div>`
      : '';
    return `<tr style="background:${zoneBg}">
      <td style="${tdS}">
        ${macroEl}<span style="color:${r.cat.color}">${r.cat.icon}</span> ${r.cat.name}
        <button class="btn-budget-detail" title="Grafico categoria" onclick="_budgetShowDetail(${r.cat.id},'${r.cat.name.replace(/'/g,"\\'")}')">📊</button>
      </td>
      <td style="${tdS};text-align:right;font-variant-numeric:tabular-nums">${fmt.currency(r.budget)}</td>
      <td style="${tdS};text-align:right;font-variant-numeric:tabular-nums">${fmt.currency(r.spent)}</td>
      <td style="${tdS};text-align:right;font-variant-numeric:tabular-nums;color:${remColor};font-weight:600">${remLabel}</td>
      <td style="${tdS};min-width:130px">
        <div style="display:flex;align-items:center;gap:6px">
          <div style="flex:1;height:11px;background:var(--bg3);border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${barW}%;background:${barColor};border-radius:3px"></div>
          </div>
          <span style="font-size:11px;color:${zoneColor};font-weight:700;min-width:36px;text-align:right">${pctStr}</span>
        </div>
      </td>
    </tr>`;
  }).join('');

  const cardStyle = (bg, col) =>
    `style="flex:1;min-width:0;background:${bg};border-radius:10px;padding:12px 16px;display:flex;flex-direction:column;gap:2px"`;

  const expRemaining = expBudget - expSpent;
  const incRemaining = incSpent - incBudget;
  const expRemColor  = expRemaining >= 0 ? 'var(--income)' : 'var(--expense)';
  const incRemColor  = incRemaining >= 0 ? 'var(--income)' : 'var(--expense)';

  const sortSelect = `
    <div style="display:flex;align-items:center;gap:6px">
      <span style="font-size:12px;color:var(--txt2)">Ordina:</span>
      <select class="form-control" style="font-size:12px;padding:3px 8px;width:auto"
        onchange="_budgetMeseSort=this.value;renderBudgetMese()">
        <option value="rimasto" ${_budgetMeseSort==='rimasto'?'selected':''}>Rimasto</option>
        <option value="usage"   ${_budgetMeseSort==='usage' ?'selected':''}>% usato</option>
        <option value="abs"     ${_budgetMeseSort==='abs'   ?'selected':''}>Sforamento €</option>
        <option value="budget"  ${_budgetMeseSort==='budget'?'selected':''}>Budget</option>
        <option value="cat"     ${_budgetMeseSort==='cat'   ?'selected':''}>Categoria</option>
      </select>
    </div>`;

  el.innerHTML = `
    <div style="padding:14px 0 10px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
      <div style="display:flex;align-items:center;gap:8px">
        <h3 style="margin:0;font-size:15px;white-space:nowrap">Stato budget</h3>
        <select class="form-control" style="font-size:13px;padding:3px 10px;width:auto;font-weight:600"
          onchange="_budgetMeseMonth=+this.value;renderBudgetMese()">
          ${MONTHS_IT.map((m,i) => `<option value="${i+1}" ${viewMonth===i+1?'selected':''}>${m}</option>`).join('')}
        </select>
        <span style="font-size:14px;color:var(--txt2);font-weight:600">${budgetYear}</span>
        <button class="btn btn-primary" style="font-size:13px;padding:6px 14px" onclick="_showBudgetMeseTreemap()">📊 Treemap</button>
      </div>
      ${sortSelect}
    </div>

    <div class="budget-mese-cols">

      <!-- ── USCITE ── -->
      <div class="budget-mese-col">
        <div style="display:flex;gap:8px;margin-bottom:12px">
          <div ${cardStyle('color-mix(in srgb,var(--expense) 10%,var(--bg2))', 'var(--expense)')}>
            <span style="font-size:11px;color:var(--txt2)">Budget uscite</span>
            <span style="font-size:16px;font-weight:700">${fmt.currency(-expBudget)}</span>
          </div>
          <div ${cardStyle('color-mix(in srgb,var(--txt3) 8%,var(--bg2))', 'var(--txt)')}>
            <span style="font-size:11px;color:var(--txt2)">Speso</span>
            <span style="font-size:16px;font-weight:700">${fmt.currency(-expSpent)}</span>
          </div>
          <div ${cardStyle('color-mix(in srgb,' + expRemColor + ' 10%,var(--bg2))', expRemColor)}>
            <span style="font-size:11px;color:var(--txt2)">${expRemaining >= 0 ? 'Rimasto' : 'Superamento totale'}</span>
            <span style="font-size:16px;font-weight:700;color:${expRemColor}">${fmt.currency(Math.abs(expRemaining))}</span>
            ${expOver > 0 ? `<span style="font-size:11px;color:var(--expense)">${expOver} ${expOver===1?'categoria':'categorie'} in sforamento</span>` : ''}
          </div>
        </div>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead><tr>
              <th style="${thS};text-align:left">Categoria</th>
              <th style="${thS};text-align:right">Budget</th>
              <th style="${thS};text-align:right">Speso</th>
              <th style="${thS};text-align:right">Rimasto</th>
              <th style="${thS};text-align:left;min-width:130px">Utilizzo</th>
            </tr></thead>
            <tbody>${makeRows(expRows, true)}</tbody>
          </table>
        </div>
      </div>

      <!-- ── ENTRATE ── -->
      <div class="budget-mese-col">
        <div style="display:flex;gap:8px;margin-bottom:12px">
          <div ${cardStyle('color-mix(in srgb,var(--income) 10%,var(--bg2))', 'var(--income)')}>
            <span style="font-size:11px;color:var(--txt2)">Budget entrate</span>
            <span style="font-size:16px;font-weight:700">${fmt.currency(incBudget)}</span>
          </div>
          <div ${cardStyle('color-mix(in srgb,var(--txt3) 8%,var(--bg2))', 'var(--txt)')}>
            <span style="font-size:11px;color:var(--txt2)">Incassato</span>
            <span style="font-size:16px;font-weight:700">${fmt.currency(incSpent)}</span>
          </div>
          <div ${cardStyle('color-mix(in srgb,' + incRemColor + ' 10%,var(--bg2))', incRemColor)}>
            <span style="font-size:11px;color:var(--txt2)">${incRemaining >= 0 ? 'Extra' : 'Mancanti'}</span>
            <span style="font-size:16px;font-weight:700;color:${incRemColor}">${fmt.currency(Math.abs(incRemaining))}</span>
            ${incUnder > 0 ? `<span style="font-size:11px;color:var(--expense)">${incUnder} ${incUnder===1?'categoria':'categorie'} sotto target</span>` : ''}
          </div>
        </div>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead><tr>
              <th style="${thS};text-align:left">Categoria</th>
              <th style="${thS};text-align:right">Budget</th>
              <th style="${thS};text-align:right">Incassato</th>
              <th style="${thS};text-align:right">Diff</th>
              <th style="${thS};text-align:left;min-width:130px">Utilizzo</th>
            </tr></thead>
            <tbody>${makeRows(incRows, false)}</tbody>
          </table>
        </div>
      </div>

    </div>`;
}

window._budgetCellEdit = (td, catId, month) => {
  const originalHtml = td.innerHTML;
  const valSpan = td.querySelector('.budget-cell-val');
  // Formato italiano: "€ 1.200,50" → rimuovi tutto tranne cifre e virgola → "1200,50" → "1200.50"
  const originalVal = parseFloat((valSpan?.textContent || '').replace(/[^0-9,]/g,'').replace(',','.')) || 0;

  const inp = document.createElement('input');
  inp.type = 'number'; inp.step = '0.01'; inp.min = '0';
  inp.value = originalVal || '';
  inp.className = 'budget-cell-input';
  inp.onclick = e => e.stopPropagation();

  let committed = false;
  const restore = () => { td.innerHTML = originalHtml; };
  const save = async () => {
    if (committed) return;
    committed = true;
    const raw = inp.value.trim();
    if (raw === '') {
      // Svuota → rimuove dal DB, il mese torna calcolato a runtime
      await api.deleteBudgetMonth({category_id: catId, month, year: budgetYear});
    } else {
      const val = parseFloat(raw) || 0;
      const stored = (_budgetData.budgets || []).find(b => b.category_id === catId && b.month === month);
      if (val === originalVal && stored) { restore(); return; }
      await api.setBudget({category_id: catId, amount: val, month, year: budgetYear});
    }
    await loadBudgetTable();
  };
  inp.onblur    = save;
  inp.onkeydown = e => {
    if (e.key === 'Enter')  { inp.blur(); }
    if (e.key === 'Escape') { committed = true; restore(); }
  };

  td.innerHTML = '';
  td.appendChild(inp);
  inp.focus(); inp.select();
};

window._budgetEditGestione = (catId, catName) => {
  const cfg = (_budgetData.configs || []).find(c => c.category_id === catId) || {};
  const currentMode = cfg.mode || 'mensile';
  const currentAmount = cfg.master_amount || 0;

  openModal(`Gestione budget — ${catName}`,
    `<div class="form-group">
       <label class="form-label">Modalità</label>
       <select class="form-control" id="bc_mode">
         <option value="mensile" ${currentMode==='mensile'?'selected':''}>Mensile</option>
         <option value="annuale" ${currentMode==='annuale'?'selected':''}>Annuale</option>
       </select>
     </div>
     <div class="form-group">
       <label class="form-label" id="bc_label">${currentMode==='mensile'?'Importo mensile (€)':'Importo annuale (€)'}</label>
       <input type="number" step="0.01" min="0" class="form-control" id="bc_amount" value="${currentAmount||''}">
       <div class="settings-hint" id="bc_hint">${currentMode==='mensile'?'Stesso importo per tutti i 12 mesi':'Verrà diviso in 12 mesi (÷12)'}</div>
     </div>`,
    async () => {
      const mode = document.getElementById('bc_mode').value;
      const amount = parseFloat(document.getElementById('bc_amount').value) || 0;
      await api.setBudgetConfig({category_id: catId, year: budgetYear, mode, master_amount: amount});
      await api.setBudgetBulk({category_id: catId, year: budgetYear, amounts: Array(12).fill(0)});
      closeModal();
      await loadBudgetTable();
    });

  setTimeout(() => {
    const sel = document.getElementById('bc_mode');
    if (!sel) return;
    sel.addEventListener('change', () => {
      const m = sel.value;
      document.getElementById('bc_label').textContent = m === 'mensile' ? 'Importo mensile (€)' : 'Importo annuale (€)';
      document.getElementById('bc_hint').textContent  = m === 'mensile' ? 'Stesso importo per tutti i 12 mesi' : 'Verrà diviso in 12 mesi (÷12)';
    });
    const inp = document.getElementById('bc_amount');
    if (inp) {
      inp.focus();
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('modalConfirm').click(); });
    }
  }, 0);
};

window._budgetToggle = catId => {
  if (_budgetCollapsed.has(catId)) _budgetCollapsed.delete(catId);
  else _budgetCollapsed.add(catId);
  renderBudgetTable();
};

window._budgetShowDetail = (catId, catName) => {
  if (!_budgetData) return;
  const { categories } = _budgetData;
  const parentIds = new Set(categories.filter(c => c.parent_id).map(c => c.parent_id));
  _budgetDetailNavList = categories.filter(c => parentIds.has(c.id) || !c.parent_id);
  _budgetDetailNavIdx  = _budgetDetailNavList.findIndex(c => c.id === catId);
  if (_budgetDetailNavIdx < 0) {
    _budgetDetailNavList = [...categories];
    _budgetDetailNavIdx  = _budgetDetailNavList.findIndex(c => c.id === catId);
  }
  _openBudgetDetail(catId, catName, true);
};

window._dashBubbleDetail = async (catId) => {
  if (!_budgetData) _budgetData = await api.getBudgetYear(budgetYear);
  const cat = _budgetData.categories.find(c => c.id === catId);
  if (cat) _budgetShowDetail(catId, cat.name);
};

window._budgetNavDetail = dir => {
  const newIdx = _budgetDetailNavIdx + dir;
  if (newIdx < 0 || newIdx >= _budgetDetailNavList.length) return;
  _budgetDetailNavIdx = newIdx;
  const cat = _budgetDetailNavList[newIdx];
  _openBudgetDetail(cat.id, cat.name, false);
};

function _openBudgetDetail(catId, catName, isFirstOpen) {
  if (!_budgetData) return;
  const { budgets, actuals, categories, configs } = _budgetData;

  // Rebuild maps (same logic as renderBudgetTable)
  const budgetMap = {};
  budgets.forEach(b => { if (!budgetMap[b.category_id]) budgetMap[b.category_id] = {}; budgetMap[b.category_id][b.month] = b.amount; });
  const actualMap = {};
  actuals.forEach(a => { if (!actualMap[a.category_id]) actualMap[a.category_id] = {}; actualMap[a.category_id][a.month] = a.total; });
  const configMap = {};
  (configs || []).forEach(c => { configMap[c.category_id] = c; });

  const parentIds = new Set(categories.filter(c => c.parent_id).map(c => c.parent_id));
  const childrenOf = {};
  categories.forEach(c => { if (c.parent_id) (childrenOf[c.parent_id] ??= []).push(c); });

  const getEffective = catId => _budgetEffective(configMap[catId], budgetMap[catId] || {});

  const catObj = categories.find(c => c.id === catId);
  const isIncome = catObj ? catObj.type === 'income' : false;

  // Nome completo con parent (es. "Abbigliamento:Figli") per sottocategorie
  const parentObj = catObj && catObj.parent_id ? categories.find(c => c.id === catObj.parent_id) : null;
  const catFullName = parentObj ? `${parentObj.name}:${catName}` : catName;

  const isGroup = parentIds.has(catId);
  const bm = {}, am = {};
  if (isGroup) {
    const kids = childrenOf[catId] || [];
    for (let m = 1; m <= 12; m++) {
      bm[m] = kids.reduce((s,k) => s + (getEffective(k.id)[m]||0), 0);
      am[m] = kids.reduce((s,k) => s + (actualMap[k.id]?.[m]||0), 0);
    }
  } else {
    const eff = getEffective(catId);
    const act = actualMap[catId] || {};
    for (let m = 1; m <= 12; m++) { bm[m] = eff[m]||0; am[m] = act[m]||0; }
  }

  // d = Reale − Budget (segno convenzionale: negativo = sotto budget per uscite = buono)
  // Colore: uscite → d<0 verde; entrate → d>0 verde
  const diffColor = (d) => {
    if (!d) return '';
    return isIncome
      ? (d > 0 ? 'color:var(--income)' : 'color:var(--expense)')
      : (d < 0 ? 'color:var(--income)' : 'color:var(--expense)');
  };

  let cumB = 0, cumA = 0;
  const tableRows = MONTHS_SHORT.map((mn, i) => {
    const m = i + 1;
    const b = bm[m], a = am[m], d = a - b;  // Reale − Budget
    cumB += b; cumA += a;
    const cumD = cumA - cumB;
    return `<tr>
      <td class="td-main">${mn}</td>
      <td style="text-align:right">${a ? fmt.currency(a) : '—'}</td>
      <td style="text-align:right">${b ? fmt.currency(b) : '—'}</td>
      <td style="text-align:right;${(b||a) ? diffColor(d) : ''}">${(b||a) ? fmt.currency(d) : '—'}</td>
      <td style="text-align:right;color:var(--txt3);border-left:2px solid var(--border)">${cumA ? fmt.currency(cumA) : '—'}</td>
      <td style="text-align:right;color:var(--txt3)">${cumB ? fmt.currency(cumB) : '—'}</td>
      <td style="text-align:right;${(cumB||cumA) ? diffColor(cumD) : ''}">${(cumB||cumA) ? fmt.currency(cumD) : '—'}</td>
    </tr>`;
  }).join('');

  const totB = Object.values(bm).reduce((s,v)=>s+v,0);
  const totA = Object.values(am).reduce((s,v)=>s+v,0);
  const totD = totA - totB;  // Reale − Budget
  const totDc = (totB||totA) ? diffColor(totD) : '';

  const hasPrev = _budgetDetailNavIdx > 0;
  const hasNext = _budgetDetailNavIdx < _budgetDetailNavList.length - 1;
  const navBar = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
    <button class="btn btn-ghost" onclick="_budgetNavDetail(-1)" ${hasPrev ? '' : 'disabled style="opacity:.35;pointer-events:none"'}>‹ ${hasPrev ? _budgetDetailNavList[_budgetDetailNavIdx-1].name : 'Inizio'}</button>
    <span style="font-size:12px;color:var(--txt2)">${_budgetDetailNavIdx+1} / ${_budgetDetailNavList.length}</span>
    <button class="btn btn-ghost" onclick="_budgetNavDetail(1)" ${hasNext ? '' : 'disabled style="opacity:.35;pointer-events:none"'}>${hasNext ? _budgetDetailNavList[_budgetDetailNavIdx+1].name : 'Fine'} ›</button>
  </div>`;

  const body = navBar + `
    <div style="display:flex;gap:20px;align-items:flex-start">
      <div class="table-wrap" style="flex:0 0 auto">
        <table>
          <thead>
            <tr>
              <th rowspan="2">Mese</th>
              <th colspan="3" style="text-align:center;border-bottom:1px solid var(--border)">Mensile</th>
              <th colspan="3" style="text-align:center;border-bottom:1px solid var(--border);border-left:2px solid var(--border)">Cumulativo</th>
            </tr>
            <tr>
              <th style="text-align:right">Reale</th>
              <th style="text-align:right">Budget</th>
              <th style="text-align:right">Diff.</th>
              <th style="text-align:right;border-left:2px solid var(--border)">Reale</th>
              <th style="text-align:right">Budget</th>
              <th style="text-align:right">Diff.</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
          <tfoot><tr style="font-weight:700;border-top:2px solid var(--border)">
            <td class="td-main">Totale</td>
            <td style="text-align:right">${totA ? fmt.currency(totA) : '—'}</td>
            <td style="text-align:right">${totB ? fmt.currency(totB) : '—'}</td>
            <td style="text-align:right;${totDc}">${(totB||totA) ? fmt.currency(totD) : '—'}</td>
            <td style="text-align:right;color:var(--txt3);border-left:2px solid var(--border)">${totA ? fmt.currency(totA) : '—'}</td>
            <td style="text-align:right;color:var(--txt3)">${totB ? fmt.currency(totB) : '—'}</td>
            <td style="text-align:right;${totDc}">${(totB||totA) ? fmt.currency(totD) : '—'}</td>
          </tr></tfoot>
        </table>
      </div>
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px">
        <div style="position:relative;height:360px">
          <canvas id="budgetDetailChart"></canvas>
        </div>
      </div>
    </div>`;

  if (isFirstOpen) {
    openModal(`📊 ${catFullName} — ${budgetYear}`, body, null);
  } else {
    document.getElementById('modalTitle').textContent = `📊 ${catFullName} — ${budgetYear}`;
    document.getElementById('modalBody').innerHTML = body;
  }

  // Widen modal and draw chart after modal renders
  setTimeout(() => {
    const modal = document.querySelector('.modal');
    if (modal) modal.style.width = '1200px';
    const canvas = document.getElementById('budgetDetailChart');
    if (!canvas) return;
    if (window._budgetDetailChart) { window._budgetDetailChart.destroy(); window._budgetDetailChart = null; }
    const _now = new Date();
    const _maxM = budgetYear < _now.getFullYear() ? 12
                : budgetYear === _now.getFullYear() ? _now.getMonth() + 1
                : 12;
    const chartLabels = MONTHS_SHORT.slice(0, _maxM);
    window._budgetDetailChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: chartLabels,
        datasets: [
          {
            label: 'Budget (cumulativo)',
            data: chartLabels.map((_,i) => { let s=0; for(let m=1;m<=i+1;m++) s+=bm[m]||0; return s; }),
            borderColor: '#58a6ff',
            backgroundColor: 'rgba(88,166,255,0.08)',
            borderWidth: 2,
            pointRadius: 2,
            tension: 0.3,
            fill: false,
          },
          {
            label: 'Reale (cumulativo)',
            data: chartLabels.map((_,i) => { let s=0; for(let m=1;m<=i+1;m++) s+=am[m]||0; return s; }),
            borderColor: '#a78bfa',
            backgroundColor: 'rgba(167,139,250,0.08)',
            borderWidth: 2,
            pointRadius: 2,
            tension: 0.3,
            fill: false,
          },
          {
            label: 'Differenza cumulativa',
            data: chartLabels.map((_,i) => { let a=0,b=0; for(let m=1;m<=i+1;m++){a+=am[m]||0;b+=bm[m]||0;} return a-b; }),
            borderWidth: 2,
            pointRadius: 2,
            tension: 0.3,
            fill: {
              target: 'origin',
              above: isIncome ? 'rgba(63,185,80,0.20)' : 'rgba(248,81,73,0.20)',
              below: isIncome ? 'rgba(248,81,73,0.20)' : 'rgba(63,185,80,0.20)',
            },
            segment: {
              borderColor: ctx => {
                const good = isIncome ? ctx.p1.parsed.y > 0 : ctx.p1.parsed.y < 0;
                return good ? 'rgba(63,185,80,0.9)' : 'rgba(248,81,73,0.9)';
              }
            },
            pointBackgroundColor: ctx => {
              const good = isIncome ? ctx.parsed.y > 0 : ctx.parsed.y < 0;
              return good ? 'rgba(63,185,80,0.9)' : 'rgba(248,81,73,0.9)';
            },
          },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: '#8b949e', font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.dataset.label}: ${fmt.currency(ctx.parsed.y)}`
            }
          },
          zoom: zoomOpts()
        },
        scales: {
          x: { ticks: { color: '#8b949e', font: { size: 10 } }, grid: { color: '#21262d' } },
          y: { ticks: { color: '#8b949e', font: { size: 10 }, callback: v => fmt.currency(v) }, grid: { color: '#21262d' } },
        }
      }
    });

  }, 50);
}

window._budgetClearRow = async catId => {
  await api.setBudgetBulk({category_id:catId, year:budgetYear, amounts:Array(12).fill(0)});
  await api.setBudgetConfig({category_id:catId, year:budgetYear, mode:'mensile', master_amount:0});
  await loadBudgetTable();
};

async function showGenerateBudgetModal() {
  const prevYear = budgetYear - 1;
  const allYears = (await api.getBudgetYears()).filter(y => y !== budgetYear);
  const yearOpts = allYears.map(y => `<option value="${y}">${y}</option>`).join('');

  openModal(`Genera budget ${budgetYear}`,
    `<div class="form-group">
       <label class="form-label">Basare i valori su:</label>
       <label class="flex-center-8" style="margin:8px 0;cursor:pointer">
         <input type="radio" name="bg_source" value="history" checked>
         Storico ${prevYear} — copia le entrate/uscite effettive per categoria
       </label>
       <label class="flex-center-8" style="margin:8px 0;cursor:pointer">
         <input type="radio" name="bg_source" value="copy">
         Copia da budget anno
         <select id="bg_copy_year" style="margin-left:4px">${yearOpts}</select>
       </label>
       <label class="flex-center-8" style="margin:8px 0;cursor:pointer">
         <input type="radio" name="bg_source" value="zero">
         Valori a zero — compila manualmente le celle
       </label>
       <div class="settings-hint" id="bg_hint">
         I valori mensili di ogni categoria vengono copiati dallo storico ${prevYear}.
         Potrai modificare ogni cella in seguito.
       </div>
     </div>`,
    async () => {
      const source = document.querySelector('input[name="bg_source"]:checked').value;
      const data = { year: budgetYear, source };
      if (source === 'copy') data.source_year = parseInt(document.getElementById('bg_copy_year').value);
      await api.generateBudget(data);
      closeModal();
      await loadBudgetTable();
      const msg = source === 'history' ? `Budget ${budgetYear} generato dallo storico ${prevYear}`
                : source === 'copy'    ? `Budget ${budgetYear} copiato da ${data.source_year}`
                :                       `Budget ${budgetYear} pronto — inserisci i valori nelle celle`;
      toast(msg, 'success');
    });
  setTimeout(() => {
    const hints = {
      history: `I valori mensili di ogni categoria vengono copiati dallo storico ${prevYear}. Potrai modificare ogni cella in seguito.`,
      copy:    'Vengono copiati i valori mensili e la configurazione (M/A) dal budget dell\'anno selezionato.',
      zero:    'Tutte le celle partiranno vuote. Usa i pulsanti M/A per impostare gli importi o clicca una cella.',
    };
    document.querySelectorAll('input[name="bg_source"]').forEach(r => {
      r.onchange = () => { document.getElementById('bg_hint').textContent = hints[r.value] || ''; };
    });
    // click su select → seleziona la radio "copy"
    document.getElementById('bg_copy_year')?.addEventListener('focus', () => {
      const r = document.querySelector('input[name="bg_source"][value="copy"]');
      if (r) { r.checked = true; document.getElementById('bg_hint').textContent = hints.copy; }
    });
  }, 50);
}

/* ═══════════════════════════════════════════════════════════════════════════
   BUDGET VS PIANIFICATE
═══════════════════════════════════════════════════════════════════════════ */
function _nextSchedDate(dateStr, freq) {
  const d = new Date(dateStr + 'T00:00:00');
  switch(freq) {
    case 'daily':        d.setDate(d.getDate() + 1); break;
    case 'weekly':       d.setDate(d.getDate() + 7); break;
    case 'biweekly':     d.setDate(d.getDate() + 14); break;
    case 'monthly':      d.setMonth(d.getMonth() + 1); break;
    case 'monthly_last': d.setDate(1); d.setMonth(d.getMonth() + 2); d.setDate(0); break;
    case 'bimonthly':    d.setMonth(d.getMonth() + 2); break;
    case 'quarterly':    d.setMonth(d.getMonth() + 3); break;
    case 'semiannual':   d.setMonth(d.getMonth() + 6); break;
    case 'yearly':       d.setFullYear(d.getFullYear() + 1); break;
    default: return null;
  }
  return d.toLocaleDateString('en-CA');
}

function _prevSchedDate(dateStr, freq) {
  const d = new Date(dateStr + 'T00:00:00');
  switch(freq) {
    case 'daily':        d.setDate(d.getDate() - 1); break;
    case 'weekly':       d.setDate(d.getDate() - 7); break;
    case 'biweekly':     d.setDate(d.getDate() - 14); break;
    case 'monthly':      d.setMonth(d.getMonth() - 1); break;
    case 'monthly_last': d.setDate(0); break; // ultimo giorno del mese precedente
    case 'bimonthly':    d.setMonth(d.getMonth() - 2); break;
    case 'quarterly':    d.setMonth(d.getMonth() - 3); break;
    case 'semiannual':   d.setMonth(d.getMonth() - 6); break;
    case 'yearly':       d.setFullYear(d.getFullYear() - 1); break;
    default: return null;
  }
  return d.toLocaleDateString('en-CA');
}

// origStart: data della prima occorrenza storica (original_start_date dal DB).
// Se presente viene usata come limite inferiore così le transazioni create
// a metà anno non vengono proiettate prima della loro vera data di inizio.
// Se NULL (record pre-migrazione) si usa il comportamento storico (proiezione a yStart).
function _countSchedYearOcc(freq, startDate, endDate, year, origStart, fromDate, excludeMonths) {
  const yStart = `${year}-01-01`;
  const yEnd   = `${year}-12-31`;
  if (!startDate) return 0;
  if (endDate && endDate < yStart) return 0;
  const effEnd   = (endDate   && endDate   < yEnd)   ? endDate   : yEnd;
  let effStart   = (origStart && origStart > yStart)  ? origStart : yStart;
  if (fromDate && fromDate > effStart) effStart = fromDate;

  const isExcl = d => excludeMonths && excludeMonths.has(parseInt(d.substring(5,7)));

  // 'once': conta solo se la data cade nel range effettivo
  if (freq === 'once') {
    if (startDate < effStart || startDate > effEnd) return 0;
    return isExcl(startDate) ? 0 : 1;
  }

  // Per le ricorrenze, start_date è la PROSSIMA occorrenza futura (aggiornata dopo
  // ogni registrazione, può essere in un anno successivo).
  // Proiettiamo a ritroso fino a effStart per trovare la prima occorrenza del periodo.
  let cur = startDate;
  for (let i = 0; i < 400; i++) {
    const prev = _prevSchedDate(cur, freq);
    if (!prev || prev < effStart) break;
    cur = prev;
  }
  if (cur > effEnd) return 0;

  let count = 0;
  for (let i = 0; i < 400 && cur <= effEnd; i++) {
    if (cur >= effStart && !isExcl(cur)) count++;
    const next = _nextSchedDate(cur, freq);
    if (!next || next === cur) break;
    cur = next;
  }
  return count;
}

async function renderBudgetVsPianificate() {
  const wrap = document.getElementById('schedContent') || document.getElementById('budgPianWrap');
  wrap.innerHTML = '<div style="padding:24px;color:var(--text2)">Analisi in corso…</div>';

  const [budgetData, scheds, accs] = await Promise.all([
    api.getBudgetYear(budgetYear),
    api.getScheduled(),
    api.getAccounts()
  ]);

  const catMap = Object.fromEntries(budgetData.categories.map(c => [c.id, c]));

  // Mappa mesi espliciti per categoria: { cat_id: { month: amount } }
  const monthByCat = {};
  for (const b of budgetData.budgets) {
    if (!monthByCat[b.category_id]) monthByCat[b.category_id] = {};
    monthByCat[b.category_id][b.month] = b.amount;
  }

  // Budget annuale per categoria — stessa logica di getEffective() usata in renderBudgetTable:
  // lockedTotal = master_amount (annuale) o master_amount×12 (mensile)
  // mesi pinned = valore esplicito in budgets; mesi liberi = (lockedTotal - pinnedSum) / freeCount
  // se pinnedSum > lockedTotal: mesi liberi = 0, totale = pinnedSum
  const configMap = Object.fromEntries((budgetData.configs || []).map(c => [c.category_id, c]));

  const _getAnnual = catId => {
    const cfg = configMap[catId];
    const stored = monthByCat[catId] || {};
    const pinnedMonths = Object.keys(stored).map(Number);
    const pinnedSum = pinnedMonths.reduce((s, m) => s + stored[m], 0);
    if (!cfg || !cfg.master_amount) return pinnedSum;
    const lockedTotal = cfg.mode === 'annuale' ? cfg.master_amount : cfg.master_amount * 12;
    const freeCount = 12 - pinnedMonths.length;
    if (freeCount === 0) return pinnedSum;
    const freeVal = Math.max(0, (lockedTotal - pinnedSum) / freeCount);
    return pinnedSum + freeCount * freeVal;
  };

  const budgByCat = {};
  // Categorie con config
  for (const cfg of (budgetData.configs || [])) {
    if (cfg.master_amount > 0) budgByCat[cfg.category_id] = _getAnnual(cfg.category_id);
  }
  // Categorie senza config: solo mesi espliciti
  for (const catIdStr of Object.keys(monthByCat)) {
    if (budgByCat[catIdStr] === undefined) budgByCat[catIdStr] = _getAnnual(parseInt(catIdStr));
  }

  // Mesi coperti da pianificate "una volta" per categoria nell'anno: per le ricorrenti
  // dello stessa categoria sono "override" → la ricorrente NON conta quel mese (evita
  // doppio conteggio quando una bolletta media viene sostituita con un importo specifico).
  const onceMonthsByCat = {};
  for (const s of scheds) {
    if (!s.is_active || s.type === 'transfer' || !s.category_id) continue;
    if (s.frequency !== 'once' || !s.start_date) continue;
    if (!s.start_date.startsWith(budgetYear + '-')) continue;
    if (!onceMonthsByCat[s.category_id]) onceMonthsByCat[s.category_id] = new Set();
    onceMonthsByCat[s.category_id].add(parseInt(s.start_date.substring(5,7)));
  }

  const schedByCat = {};
  for (const s of scheds) {
    if (!s.is_active || s.type === 'transfer' || !s.category_id) continue;
    const excl = s.frequency !== 'once' ? onceMonthsByCat[s.category_id] : null;
    const occ = _countSchedYearOcc(s.frequency, s.start_date, s.end_date, budgetYear, s.original_start_date, null, excl);
    schedByCat[s.category_id] = (schedByCat[s.category_id] || 0) + occ * s.amount;
  }

  // Effettivi YTD per categoria
  const actualsByCat = {};
  for (const a of (budgetData.actuals || [])) {
    actualsByCat[a.category_id] = (actualsByCat[a.category_id] || 0) + (a.total || 0);
  }

  // gap = budget - pianificate. Se >0, le pianificate non bastano: gli actuals YTD possono
  // colmarlo (spese reali fuori piano = Caso B); altrimenti manca da pianificare.
  // Se gap <0 ci sono pianificate in eccesso rispetto al budget (segnalato come eccesso).
  // Variazioni speso/pianificato sotto le aspettative vengono ignorate: il check guarda il
  // piano, non l'esecuzione (= Caso A: pianificata 1200/mese ↔ budget 14400 → ✓ sempre).
  const rows = [];
  for (const [catIdStr, budgAnnual] of Object.entries(budgByCat)) {
    if (budgAnnual <= 0) continue;
    const catId = parseInt(catIdStr);
    const cat = catMap[catId];
    if (!cat) continue;
    const scheduled = schedByCat[catId] || 0;
    const actualYtd = actualsByCat[catId] || 0;
    const gap = budgAnnual - scheduled;
    // Segno UI: diff>0 = manca (deficit, mostra "Integra"); diff<0 = eccesso pianificato
    const diff = gap > 0
      ? Math.max(0, gap - actualYtd)
      : gap;
    rows.push({ catId, cat, budgAnnual, scheduled, actualYtd, diff });
  }
  const sortRows = arr => {
    const disc = arr.filter(r => Math.abs(r.diff) > 0.01);
    const ok   = arr.filter(r => Math.abs(r.diff) <= 0.01);
    disc.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
    ok.sort((a, b) => {
      const pa = a.cat.parent_id ? (catMap[a.cat.parent_id]?.name||'') : a.cat.name;
      const pb = b.cat.parent_id ? (catMap[b.cat.parent_id]?.name||'') : b.cat.name;
      return pa.localeCompare(pb) || a.cat.name.localeCompare(b.cat.name);
    });
    return [...disc, ...ok];
  };

  const expenseRows = sortRows(rows.filter(r => r.cat.type === 'expense'));
  const incomeRows  = sortRows(rows.filter(r => r.cat.type === 'income'));
  const discCount   = rows.filter(r => Math.abs(r.diff) > 0.01).length;

  // Salva accounts per il modal
  wrap._budgAccounts = accs;

  // Lookup globale per il modal (evita problemi di escape nelle stringhe inline)
  window._budgSyncData = {};

  const renderRow = r => {
    const parent = r.cat.parent_id ? catMap[r.cat.parent_id] : null;
    const catLabel = parent ? `${parent.name} : ${r.cat.name}` : r.cat.name;
    window._budgSyncData[r.catId] = { catLabel, catType: r.cat.type, diff: r.diff };
    const ok = Math.abs(r.diff) <= 0.01;
    const isDeficit = r.diff > 0;
    const diffCls = ok ? '' : (isDeficit ? 'amount-expense' : 'amount-income');
    const diffTxt = ok
      ? `<span style="color:var(--green)">✓</span>`
      : `${isDeficit?'-':'+'}${fmt.currency(Math.abs(r.diff))}`;
    const action = ok
      ? ''
      : isDeficit
        ? `<button class="btn btn-sm btn-primary" onclick="showBudgetIntegraModal(${r.catId})">Integra</button>`
        : `<span style="color:var(--text2);font-size:.8rem">Eccesso</span>`;
    return `<tr class="${ok ? 'sync-row-ok' : ''}">
      <td><a style="cursor:pointer;color:inherit;text-decoration:none" onmouseover="this.style.color='var(--accent)'" onmouseout="this.style.color=''" onclick="schedTab='lista';_schedFilter.category='${r.catId}';renderScheduled()">${r.cat.icon||''} ${catLabel}</a></td>
      <td class="num">${fmt.currency(r.budgAnnual)}</td>
      <td class="num">${fmt.currency(r.scheduled)}</td>
      <td class="num" style="color:var(--text2)">${r.actualYtd > 0 ? fmt.currency(r.actualYtd) : '—'}</td>
      <td class="num ${diffCls}">${diffTxt}</td>
      <td style="text-align:right">${action}</td>
    </tr>`;
  };

  const renderSection = (label, sRows) => {
    if (!sRows.length) return '';
    const tBudg   = sRows.reduce((s, r) => s + r.budgAnnual, 0);
    const tSched  = sRows.reduce((s, r) => s + r.scheduled, 0);
    const tActual = sRows.reduce((s, r) => s + r.actualYtd, 0);
    const tDiff   = sRows.reduce((s, r) => s + r.diff, 0);
    const tOk     = Math.abs(tDiff) <= 0.01;
    return `
      <tr class="sync-section-header"><td colspan="6">${label}</td></tr>
      ${sRows.map(renderRow).join('')}
      <tr class="sync-subtotal">
        <td>Totale ${label}</td>
        <td class="num">${fmt.currency(tBudg)}</td>
        <td class="num">${fmt.currency(tSched)}</td>
        <td class="num">${tActual > 0 ? fmt.currency(tActual) : '—'}</td>
        <td class="num ${tOk?'':(tDiff>0?'amount-expense':'amount-income')}">
          ${tOk ? '✓' : (tDiff>0?'-':'+') + fmt.currency(Math.abs(tDiff))}
        </td>
        <td></td>
      </tr>`;
  };

  wrap.innerHTML = `
    <div class="card" style="margin-top:16px">
      <div class="section-header" style="margin-bottom:12px">
        <span>Budget ${budgetYear} vs Pianificate</span>
        <span style="font-size:.85rem;color:var(--text2)">${discCount} incongruenz${discCount===1?'a':'e'} su ${rows.length} categorie</span>
      </div>
      <div class="table-wrap">
      <table class="budget-sync-table">
        <thead><tr>
          <th>Categoria</th>
          <th class="num">Budget annuale</th>
          <th class="num">Pianificate</th>
          <th class="num" title="Spese reali registrate YTD (informativo)">Già fatto</th>
          <th class="num">Differenza</th>
          <th></th>
        </tr></thead>
        <tbody>
          ${renderSection('Uscite', expenseRows)}
          ${renderSection('Entrate', incomeRows)}
        </tbody>
      </table>
      </div>
    </div>`;
}

window.showBudgetIntegraModal = async function(catId) {
  const { catLabel, catType, diff } = window._budgSyncData[catId] || {};
  const wrap = document.getElementById('schedContent') || document.getElementById('budgPianWrap');
  const accs = (wrap?._budgAccounts || []).filter(a => a.type !== 'investment');

  const tags = await api.getTags();
  let tag = tags.find(t => t.name === 'Da Budget');
  if (!tag) tag = await api.addTag({ name: 'Da Budget', color: '#8b5cf6' });

  const _t = new Date();
  const _isCurYear = budgetYear === _t.getFullYear();
  const startDef  = _isCurYear
    ? `${_t.getFullYear()}-${String(_t.getMonth()+1).padStart(2,'0')}-${String(_t.getDate()).padStart(2,'0')}`
    : `${budgetYear}-01-01`;
  const yearEnd   = `${budgetYear}-12-31`;
  const monthsLeft = _isCurYear ? (12 - _t.getMonth()) : 12;
  const monthlyAmt = (Math.abs(diff) / monthsLeft).toFixed(2);
  const txType = catType === 'expense' ? 'Uscita' : 'Entrata';

  const body = `
    <div class="form-row">
      <div class="form-group">
        <label>Mancante residuo</label>
        <input class="form-control" value="${fmt.currency(Math.abs(diff))}" disabled>
      </div>
      <div class="form-group">
        <label>Tipo</label>
        <input class="form-control" value="${catType === 'expense' ? 'Uscita' : 'Entrata'}" disabled>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Frequenza *</label>
        <select class="form-control" id="bi_freq">
          ${Object.entries({once:'Una volta',monthly:'Mensile',quarterly:'Trimestrale',semiannual:'Semestrale',yearly:'Annuale'}).map(([v,l])=>`<option value="${v}" ${v==='monthly'?'selected':''}>${l}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Importo per occorrenza *</label>
        <input type="number" class="form-control" id="bi_amount" value="${monthlyAmt}" min="0.01" step="0.01">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Data inizio *</label>
        <input type="date" class="form-control" id="bi_start" value="${startDef}">
      </div>
      <div class="form-group">
        <label>Data fine</label>
        <input type="date" class="form-control" id="bi_end" value="${yearEnd}">
      </div>
    </div>
    <div class="form-group">
      <label>Conto *</label>
      <select class="form-control" id="bi_acc">
        <option value="">— Seleziona conto —</option>
        ${accs.map(a=>`<option value="${a.id}">${a.icon||''} ${a.name}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Descrizione</label>
      <input type="text" class="form-control" id="bi_desc" value="Integrazione budget ${catLabel}">
    </div>
    <p style="font-size:.8rem;color:var(--text2);margin-top:8px">
      Tag <span style="background:#8b5cf6;color:#fff;padding:2px 8px;border-radius:10px;font-size:.8rem">Da Budget</span> applicato automaticamente.
    </p>`;

  openModal(`Integra pianificata — ${catLabel}`, body, async () => {
    const amount = parseFloat(document.getElementById('bi_amount').value);
    const acc    = parseInt(document.getElementById('bi_acc').value);
    const start  = document.getElementById('bi_start').value;
    const end    = document.getElementById('bi_end').value;
    const freq   = document.getElementById('bi_freq').value;
    const desc   = document.getElementById('bi_desc').value;
    if (!amount || !acc || !start) { toast('Compila i campi obbligatori', 'error'); return; }
    await api.addScheduled({
      description: desc,
      amount,
      type: catType === 'expense' ? 'expense' : 'income',
      category_id: catId,
      account_id: acc,
      frequency: freq,
      start_date: start,
      end_date: end || null,
      is_active: 1,
      reconciled: 1,
      tag_ids: [tag.id]
    });
    toast('Pianificata creata con tag "Da Budget"');
    renderBudgetVsPianificate();
  }, 'Crea Pianificata');
};
