/* ═══════════════════════════════════════════════════════════════════════════
   LucaMoneyManager — pages/analytics.js
   Pagina Analytics (7 tab) + Resoconti salvati + Previsione Saldo
   (estratta da app.js, stadio 7e del refactor — 2480 LOC)

   Dipendenze esterne (lazy a runtime):
   - RANGE_DEFAULTS, buildRangeOptions, rangeToFilter, txFilters,
     editTx (transactions.js)
   - renderSidebarReports (sidebar.js)
   - currentPage, navigate (router.js)
═══════════════════════════════════════════════════════════════════════════ */

// Stato Resoconti (era in transactions.js con FIXME, ora nel posto corretto)
let _reportsGroupOpen = false;
let _currentReportId  = null;
let _reportFilters    = {};
let _reportGroupby    = 'none';
let _reportChartType  = 'none';
let _reportChart      = null;
let _reportsTab       = 'resoconti';

// Stato Previsione Saldo (era in transactions.js con FIXME)
let _fcChart          = null;
let _fcParams         = { histMonths: 12, horizonMonths: 6, sensitivity: 'media' };
let _fcManualExcl     = new Set();   // mesi forzatamente esclusi dall'utente
let _fcManualIncl     = new Set();   // mesi forzatamente reintegrati dall'utente
let _fcExcludedTxIds  = new Set();   // IDs transazioni escluse dal calcolo
let _fcTxAdjustments  = {};          // { ym: { incAdj, expAdj } } — aggiustamenti tx
let _fcMonthTxCache   = {};          // { ym: tx[] } — cache transazioni per mese
let _fcExpandedMonths = new Set();   // mesi espansi nella tabella storica

/* ─── Analytics ──────────────────────────────────────────────────────────── */

let _analyticsStartYm       = null;  // "YYYY-MM" — null = default (primo mese DB)
let _analyticsEndYm         = null;  // "YYYY-MM" — null = default (mese prec. o corrente)
let _analyticsOldestYm      = undefined; // cache primo mese disponibile in DB (undefined = non ancora caricato)

/* Restituisce { fetchMonths, monthCols } pronti per i render function.
   fetchMonths = quanti mesi chiedere al DB (da startYm a oggi).
   monthCols   = array { ym, label } filtrato su [startYm, endYm]. */
function _analyticsMonthRange() {
  const now = new Date();
  const toYm = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  const prevYm = toYm(new Date(now.getFullYear(), now.getMonth()-1, 1));

  const startYm = _analyticsStartYm || _analyticsOldestYm || prevYm;
  const endYm   = _analyticsEndYm   || prevYm;

  // quanti mesi dal startYm a oggi (per la query DB che parte sempre da oggi)
  const startDate = new Date(startYm + '-01');
  const fetchMonths = Math.max(1,
    (now.getFullYear() - startDate.getFullYear()) * 12 +
    (now.getMonth()    - startDate.getMonth())    + 1);

  // monthCols: tutti i mesi da startYm a endYm inclusi
  const monthCols = [];
  let d = new Date(startYm + '-01');
  const endDate = new Date(endYm + '-01');
  while (d <= endDate) {
    const ym = toYm(d);
    monthCols.push({ ym, label: d.toLocaleDateString('it-IT', { month:'short', year:'2-digit' }) });
    d = new Date(d.getFullYear(), d.getMonth()+1, 1);
  }
  return { fetchMonths, monthCols };
}

/* Helper: popola un <select> con opzioni mese/anno nell'intervallo [fromYm, toYm] */
const _MONTHS_IT = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];

function _buildYearOptions(fromYm, toYm, selectedYear) {
  const fromY = parseInt(fromYm.slice(0,4)), toY = parseInt(toYm.slice(0,4));
  let html = '';
  for (let y = fromY; y <= toY; y++)
    html += `<option value="${y}"${y===selectedYear?' selected':''}>${y}</option>`;
  return html;
}

function _buildMonthsForYear(year, fromYm, toYm, selectedMonth) {
  const fromY = parseInt(fromYm.slice(0,4)), fromM = parseInt(fromYm.slice(5,7));
  const toY   = parseInt(toYm.slice(0,4)),   toM   = parseInt(toYm.slice(5,7));
  const mFrom = year === fromY ? fromM : 1;
  const mTo   = year === toY   ? toM   : 12;
  let html = '';
  for (let m = mFrom; m <= mTo; m++)
    html += `<option value="${m}"${m===selectedMonth?' selected':''}>${_MONTHS_IT[m-1]}</option>`;
  return html;
}

function _renderCurrentAnalyticsTab() {
  if (_analyticsTab === 'balance')     renderAnalyticsBalance();
  else if (_analyticsTab === 'trend')      renderAnalyticsTrend();
  else if (_analyticsTab === 'health')     renderAnalyticsHealth();
  else if (_analyticsTab === 'forecast')   renderAnalyticsForecast();
  else if (_analyticsTab === 'accbalance') renderAnalyticsAccBalance();
  else if (_analyticsTab === 'nature')     renderNatureReport();
  else renderAnalyticsCatMonth();
}

async function renderAnalytics() {
  // Carica il primo mese disponibile in DB (una sola volta per sessione)
  if (_analyticsOldestYm === undefined) {
    _analyticsOldestYm = await api.getOldestTransactionMonth() || null;
  }
  // startYm: sempre ultimi 12 mesi escluso corrente; endYm: mese precedente (persistito)
  const now    = new Date();
  const toYm   = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  const prevYm = toYm(new Date(now.getFullYear(), now.getMonth()-1, 1));
  const curYm  = toYm(now);
  const oldestYm = _analyticsOldestYm || prevYm;
  const last12 = toYm(new Date(now.getFullYear(), now.getMonth()-12, 1));
  _analyticsStartYm = last12 > oldestYm ? last12 : oldestYm;
  if (!_analyticsEndYm)   _analyticsEndYm   = prevYm;
  const maxYm = curYm;

  // Scompone YYYY-MM in {y, m}
  const parseYm = ym => ({ y: parseInt(ym.slice(0,4)), m: parseInt(ym.slice(5,7)) });
  const fmtYm   = (y, m) => `${y}-${String(m).padStart(2,'0')}`;

  let sYm = parseYm(_analyticsStartYm), eYm = parseYm(_analyticsEndYm);

  const pg = document.getElementById('pg-analytics');
  pg.innerHTML = `
    <div style="padding:16px 24px 0;display:flex;flex-direction:column;height:100%;overflow:hidden;box-sizing:border-box">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;flex-shrink:0">
        <div style="display:flex;gap:6px">
          <button class="sched-tab${_analyticsTab==='health'?' active':''}" data-atab="health" onclick="_setAnalyticsTab('health',this)">Salute Finanziaria</button>
          <button class="sched-tab${_analyticsTab==='catmonth'?' active':''}" data-atab="catmonth" onclick="_setAnalyticsTab('catmonth',this)">Categorie / Mese</button>
          <button class="sched-tab${_analyticsTab==='balance'?' active':''}" data-atab="balance" onclick="_setAnalyticsTab('balance',this)">Bilancio Mensile</button>
          <button class="sched-tab${_analyticsTab==='trend'?' active':''}" data-atab="trend" onclick="_setAnalyticsTab('trend',this)">Andamento Categoria</button>
          <button class="sched-tab${_analyticsTab==='accbalance'?' active':''}" data-atab="accbalance" onclick="_setAnalyticsTab('accbalance',this)">Saldo Conti</button>
          <button class="sched-tab${_analyticsTab==='forecast'?' active':''}" data-atab="forecast" onclick="_setAnalyticsTab('forecast',this)">📊 Previsione Saldo</button>
          <button class="sched-tab${_analyticsTab==='nature'?' active':''}" data-atab="nature" onclick="_setAnalyticsTab('nature',this)">🌿 Natura Spese</button>
        </div>
        <div id="aDateControls" style="margin-left:auto;display:flex;gap:6px;align-items:center;white-space:nowrap;${_analyticsTab==='forecast'?'visibility:hidden':''}">
          <button class="btn btn-xs btn-ghost" id="aPreset6m">6 mesi</button>
          <button class="btn btn-xs btn-ghost" id="aPreset12m">12 mesi</button>
          <button class="btn btn-xs btn-ghost" id="aPresetYtd">Anno</button>
          <div style="width:1px;height:16px;background:var(--border);margin:0 2px"></div>
          <label style="font-size:13px;color:var(--txt2)">Da:</label>
          <select id="aStartY" class="form-control" style="font-size:12px;padding:3px 8px;width:72px">${_buildYearOptions(oldestYm, maxYm, sYm.y)}</select>
          <select id="aStartM" class="form-control" style="font-size:12px;padding:3px 8px;width:60px">${_buildMonthsForYear(sYm.y, oldestYm, maxYm, sYm.m)}</select>
          <label style="font-size:13px;color:var(--txt2)">A:</label>
          <select id="aEndY" class="form-control" style="font-size:12px;padding:3px 8px;width:72px">${_buildYearOptions(_analyticsStartYm, maxYm, eYm.y)}</select>
          <select id="aEndM" class="form-control" style="font-size:12px;padding:3px 8px;width:60px">${_buildMonthsForYear(eYm.y, _analyticsStartYm, maxYm, eYm.m)}</select>
        </div>
      </div>
      <div id="analyticsContent" style="flex:1;overflow:auto;padding-bottom:16px"></div>
    </div>`;

  const rebuildEndSelects = () => {
    eYm = parseYm(_analyticsEndYm);
    document.getElementById('aEndY').innerHTML = _buildYearOptions(_analyticsStartYm, maxYm, eYm.y);
    document.getElementById('aEndM').innerHTML = _buildMonthsForYear(eYm.y, _analyticsStartYm, maxYm, eYm.m);
  };

  document.getElementById('aStartY').onchange = function() {
    sYm.y = parseInt(this.value);
    // Ricava mesi validi per il nuovo anno e clampsa il mese corrente
    const p = parseYm(oldestYm), q = parseYm(maxYm);
    const mFrom = sYm.y === p.y ? p.m : 1, mTo = sYm.y === q.y ? q.m : 12;
    sYm.m = Math.min(Math.max(sYm.m, mFrom), mTo);
    document.getElementById('aStartM').innerHTML = _buildMonthsForYear(sYm.y, oldestYm, maxYm, sYm.m);
    _analyticsStartYm = fmtYm(sYm.y, sYm.m);
    if (_analyticsEndYm < _analyticsStartYm) { _analyticsEndYm = _analyticsStartYm; eYm = {...sYm}; }
    rebuildEndSelects();
    _renderCurrentAnalyticsTab();
  };
  document.getElementById('aStartM').onchange = function() {
    sYm.m = parseInt(this.value);
    _analyticsStartYm = fmtYm(sYm.y, sYm.m);
    if (_analyticsEndYm < _analyticsStartYm) { _analyticsEndYm = _analyticsStartYm; eYm = {...sYm}; }
    rebuildEndSelects();
    _renderCurrentAnalyticsTab();
  };
  document.getElementById('aEndY').onchange = function() {
    eYm.y = parseInt(this.value);
    // Ricava mesi validi per il nuovo anno e clampsa il mese corrente
    const p = parseYm(_analyticsStartYm), q = parseYm(maxYm);
    const mFrom = eYm.y === p.y ? p.m : 1, mTo = eYm.y === q.y ? q.m : 12;
    eYm.m = Math.min(Math.max(eYm.m, mFrom), mTo);
    document.getElementById('aEndM').innerHTML = _buildMonthsForYear(eYm.y, _analyticsStartYm, maxYm, eYm.m);
    _analyticsEndYm = fmtYm(eYm.y, eYm.m);
    _renderCurrentAnalyticsTab();
  };
  document.getElementById('aEndM').onchange = function() {
    eYm.y = parseInt(document.getElementById('aEndY').value);
    eYm.m = parseInt(this.value);
    _analyticsEndYm = fmtYm(eYm.y, eYm.m);
    _renderCurrentAnalyticsTab();
  };

  const applyPreset = (startYm) => {
    _analyticsStartYm = startYm < oldestYm ? oldestYm : startYm;
    _analyticsEndYm   = prevYm;
    sYm = parseYm(_analyticsStartYm); eYm = parseYm(_analyticsEndYm);
    document.getElementById('aStartY').innerHTML = _buildYearOptions(oldestYm, maxYm, sYm.y);
    document.getElementById('aStartM').innerHTML = _buildMonthsForYear(sYm.y, oldestYm, maxYm, sYm.m);
    rebuildEndSelects();
    _renderCurrentAnalyticsTab();
  };
  const ymFromDate = d => fmtYm(d.getFullYear(), d.getMonth()+1);
  document.getElementById('aPreset6m').onclick  = () => applyPreset(ymFromDate(new Date(now.getFullYear(), now.getMonth()-6, 1)));
  document.getElementById('aPreset12m').onclick = () => applyPreset(ymFromDate(new Date(now.getFullYear(), now.getMonth()-12, 1)));
  document.getElementById('aPresetYtd').onclick = () => applyPreset(fmtYm(now.getFullYear(), 1));

  _renderCurrentAnalyticsTab();
}

let _analyticsTab = 'health';
window._setAnalyticsTab = (tab, btn) => {
  _analyticsTab = tab;
  document.querySelectorAll('[data-atab]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const dc = document.getElementById('aDateControls');
  if (dc) dc.style.visibility = tab === 'forecast' ? 'hidden' : '';
  if (tab === 'catmonth')   renderAnalyticsCatMonth();
  if (tab === 'balance')    renderAnalyticsBalance();
  if (tab === 'trend')      renderAnalyticsTrend();
  if (tab === 'health')     renderAnalyticsHealth();
  if (tab === 'forecast')   renderAnalyticsForecast();
  if (tab === 'accbalance') renderAnalyticsAccBalance();
  if (tab === 'nature')     renderNatureReport();
};

let _analyticsCatSort = { col: null, dir: -1 };
let _analyticsCatCache = null;

async function renderAnalyticsCatMonth() {
  const el = document.getElementById('analyticsContent');
  if (!el) return;
  el.innerHTML = '<p style="padding:20px;color:var(--text2)">Caricamento…</p>';

  const { fetchMonths, monthCols } = _analyticsMonthRange();
  const rows = await api.getCategoryMonthTable(fetchMonths);

  const catMap = {};
  for (const r of rows) {
    if (!catMap[r.id]) catMap[r.id] = { id: r.id, name: r.name, type: r.type, color: r.color, icon: r.icon, parent_name: r.parent_name || null, m: {} };
    catMap[r.id].m[r.ym] = r.total;
  }

  _analyticsCatCache = { monthCols, catMap };
  _renderAnalyticsCatTable();
}

window._sortAnalyticsCat = col => {
  if (_analyticsCatSort.col === col) _analyticsCatSort.dir *= -1;
  else { _analyticsCatSort.col = col; _analyticsCatSort.dir = -1; }
  _renderAnalyticsCatTable();
};

function _renderAnalyticsCatTable() {
  const el = document.getElementById('analyticsContent');
  if (!el || !_analyticsCatCache) return;
  const { monthCols, catMap } = _analyticsCatCache;

  const catTotal = c => monthCols.reduce((s, m) => s + (c.m[m.ym] || 0), 0);

  const sortCats = arr => {
    const { col, dir } = _analyticsCatSort;
    if (col === null) return [...arr].sort((a, b) => {
      const pa = a.parent_name || a.name, pb = b.parent_name || b.name;
      return pa.localeCompare(pb) || a.name.localeCompare(b.name);
    });
    return [...arr].sort((a, b) => {
      if (col === 'name') return dir * a.name.localeCompare(b.name);
      if (col === 'total' || col === 'avg') return dir * (catTotal(a) - catTotal(b));
      const ym = monthCols[col]?.ym;
      return dir * ((a.m[ym] || 0) - (b.m[ym] || 0));
    });
  };

  const arrow = col => {
    if (_analyticsCatSort.col !== col) return ' <span style="color:var(--txt3);font-size:10px;user-select:none">⇅</span>';
    return _analyticsCatSort.dir === -1 ? ' ↓' : ' ↑';
  };

  const thStyle = 'cursor:pointer;user-select:none';

  const expenses = sortCats(Object.values(catMap).filter(c => c.type === 'expense'));
  const incomes  = sortCats(Object.values(catMap).filter(c => c.type === 'income'));

  const renderSection = (cats, label) => {
    if (!cats.length) return '';
    let html = `<tr class="analytics-section-header"><td colspan="${monthCols.length + 3}">${label}</td></tr>`;
    for (const c of cats) {
      const total = catTotal(c);
      const avg = total / monthCols.length;
      html += `<tr>
        <td class="analytics-cat-name">${c.parent_name ? `<span style="color:var(--txt3);font-size:11px">${c.parent_name} ›</span> ` : ''}<span style="color:${c.color}">${c.icon}</span> ${c.name}</td>
        ${monthCols.map(m => `<td class="text-right">${c.m[m.ym] ? fmt.currency(c.m[m.ym]) : '<span style="color:var(--text3)">—</span>'}</td>`).join('')}
        <td class="text-right analytics-total">${fmt.currency(total)}</td>
        <td class="text-right analytics-avg">${fmt.currency(avg)}</td>
      </tr>`;
    }
    const colTotals = monthCols.map(m => cats.reduce((s, c) => s + (c.m[m.ym] || 0), 0));
    const grand = colTotals.reduce((a, b) => a + b, 0);
    html += `<tr class="analytics-subtotal">
      <td>Totale ${label}</td>
      ${colTotals.map(t => `<td class="text-right">${fmt.currency(t)}</td>`).join('')}
      <td class="text-right analytics-total">${fmt.currency(grand)}</td>
      <td class="text-right analytics-avg">${fmt.currency(monthCols.length ? grand / monthCols.length : 0)}</td>
    </tr>`;
    return html;
  };

  el.innerHTML = `
    <table class="analytics-table">
      <thead><tr>
        <th style="${thStyle}" onclick="_sortAnalyticsCat('name')">Categoria${arrow('name')}</th>
        ${monthCols.map((m, i) => `<th class="text-right" style="${thStyle}" onclick="_sortAnalyticsCat(${i})">${m.label}${arrow(i)}</th>`).join('')}
        <th class="text-right analytics-total" style="${thStyle}" onclick="_sortAnalyticsCat('total')">Totale${arrow('total')}</th>
        <th class="text-right analytics-avg" style="${thStyle};color:var(--accent)" onclick="_sortAnalyticsCat('avg')">Media/mese${arrow('avg')}</th>
      </tr></thead>
      <tbody>
        ${renderSection(expenses, 'Uscite')}
        ${renderSection(incomes,  'Entrate')}
      </tbody>
    </table>`;
}

let _analyticsBalanceChart = null;

async function renderAnalyticsBalance() {
  const el = document.getElementById('analyticsContent');
  if (!el) return;
  el.innerHTML = '<p style="padding:20px;color:var(--text2)">Caricamento…</p>';

  const { fetchMonths, monthCols } = _analyticsMonthRange();
  const rows = await api.getMonthlyBalance(fetchMonths);

  const byYm = {};
  for (const r of rows) byYm[r.ym] = r;

  const incomes  = monthCols.map(m => byYm[m.ym]?.income  || 0);
  const expenses = monthCols.map(m => byYm[m.ym]?.expense || 0);
  const balances = monthCols.map((_, i) => incomes[i] - expenses[i]);
  let cumul = 0;
  const cumuls = balances.map(b => (cumul += b));
  const labels  = monthCols.map(m => m.label);

  const cc = chartColors();

  el.innerHTML = `
    <div style="height:380px;margin-bottom:20px"><canvas id="balanceChart"></canvas></div>
    <table class="analytics-table">
      <thead><tr>
        <th>Mese</th><th class="text-right">Entrate</th><th class="text-right">Uscite</th>
        <th class="text-right">Saldo</th><th class="text-right">Cumulativo</th>
      </tr></thead>
      <tbody>
        ${monthCols.map((m, i) => {
          const bal = balances[i], cum = cumuls[i];
          const balCol  = bal >= 0 ? 'var(--income)' : 'var(--expense)';
          const cumCol  = cum >= 0 ? 'var(--income)' : 'var(--expense)';
          const balBg   = bal >= 0 ? 'rgba(63,185,80,.10)' : 'rgba(248,81,73,.10)';
          const cumBg   = cum >= 0 ? 'rgba(63,185,80,.10)' : 'rgba(248,81,73,.10)';
          return `<tr>
            <td>${m.label}</td>
            <td class="text-right" style="color:var(--income);background:rgba(63,185,80,.07)">${incomes[i]  ? fmt.currency(incomes[i])  : '—'}</td>
            <td class="text-right" style="color:var(--expense);background:rgba(248,81,73,.07)">${expenses[i] ? fmt.currency(expenses[i]) : '—'}</td>
            <td class="text-right" style="color:${balCol};background:${balBg};font-weight:600">${fmt.currency(bal)}</td>
            <td class="text-right" style="color:${cumCol};background:${cumBg}">${fmt.currency(cum)}</td>
          </tr>`;
        }).join('')}
        <tr class="analytics-subtotal">
          <td>Totale</td>
          <td class="text-right">${fmt.currency(incomes.reduce((a,b)=>a+b,0))}</td>
          <td class="text-right">${fmt.currency(expenses.reduce((a,b)=>a+b,0))}</td>
          <td class="text-right" style="font-weight:700">${fmt.currency(balances.reduce((a,b)=>a+b,0))}</td>
          <td></td>
        </tr>
      </tbody>
    </table>`;

  if (_analyticsBalanceChart) { _analyticsBalanceChart.destroy(); _analyticsBalanceChart = null; }
  _analyticsBalanceChart = new Chart(document.getElementById('balanceChart'), {
    data: {
      labels,
      datasets: [
        { type:'bar',  label:'Entrate', data:incomes,  backgroundColor:'rgba(63,185,80,.7)',  order:2 },
        { type:'bar',  label:'Uscite',  data:expenses, backgroundColor:'rgba(248,81,73,.7)',   order:2 },
        { type:'line', label:'Saldo',   data:balances,
          borderColor:'#58a6ff', backgroundColor:'transparent',
          pointRadius:3, tension:.3, borderWidth:2, order:1 },
        { type:'line', label:'Cumulativo', data:cumuls,
          borderColor:'#bc8cff', borderWidth:1,
          fill: { target:'origin', above:'rgba(63,185,80,.18)', below:'rgba(248,81,73,.18)' },
          pointRadius:2, pointHoverRadius:4, tension:.3, order:1,
          segment: {
            borderColor: ctx => {
              const avg = ((ctx.p0.parsed.y ?? 0) + (ctx.p1.parsed.y ?? 0)) / 2;
              return avg >= 0 ? 'rgba(63,185,80,.9)' : 'rgba(248,81,73,.9)';
            }
          },
          pointBackgroundColor: ctx => ctx.parsed.y >= 0 ? 'rgba(63,185,80,.9)' : 'rgba(248,81,73,.9)' },
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      interaction:{ mode:'index', intersect:false },
      plugins:{
        tooltip:{ callbacks:{ label: ctx => ` ${ctx.dataset.label}: ${fmt.currency(ctx.parsed.y)}` } },
        legend:{ labels:{ color:cc.tick, boxWidth:12 } },
        zoom: zoomOpts()
      },
      scales:{
        x:{ ticks:{color:cc.tick}, grid:{color:cc.grid} },
        y:{ ticks:{color:cc.tick, callback:v=>fmt.currency(v)}, grid:{color:cc.grid} }
      }
    }
  });
}

/* ─── Analytics: Salute Finanziaria ──────────────────────────────────────── */
let _healthRateChart = null;
let _healthExpChart  = null;
let _healthIncChart  = null;
let _healthVolChart  = null;

// ── Previsione Saldo nel contesto Analytics ───────────────────────────────────
async function renderAnalyticsForecast() {
  const el = document.getElementById('analyticsContent');
  if (!el) return;
  const { histMonths, horizonMonths, sensitivity } = _fcParams;
  el.innerHTML = `
    <div class="card" style="padding:16px;margin-bottom:16px">
      <div style="display:flex;flex-wrap:wrap;gap:20px;align-items:flex-end">
        <div>
          <label style="font-size:12px;color:var(--txt2);display:block;margin-bottom:6px">Storico analizzato</label>
          <div style="display:flex;align-items:center;gap:8px">
            <input type="range" id="fcHistR" min="3" max="60" value="${histMonths}" style="width:130px"
              oninput="_fcParams.histMonths=+this.value;document.getElementById('fcHistN').textContent=this.value;_fcSetDirty()">
            <span id="fcHistN" style="font-weight:700;min-width:22px">${histMonths}</span>
            <span style="color:var(--txt2);font-size:13px">mesi</span>
          </div>
        </div>
        <div>
          <label style="font-size:12px;color:var(--txt2);display:block;margin-bottom:6px">Orizzonte previsione</label>
          <div style="display:flex;align-items:center;gap:8px">
            <input type="range" id="fcHorizR" min="1" max="36" value="${horizonMonths}" style="width:130px"
              oninput="_fcParams.horizonMonths=+this.value;document.getElementById('fcHorizN').textContent=this.value;_fcSetDirty()">
            <span id="fcHorizN" style="font-weight:700;min-width:22px">${horizonMonths}</span>
            <span style="color:var(--txt2);font-size:13px">mesi</span>
          </div>
        </div>
        <div>
          <label style="font-size:12px;color:var(--txt2);display:block;margin-bottom:6px">Sensibilità outlier</label>
          <select id="fcSens" class="form-control" onchange="_fcParams.sensitivity=this.value;_fcSetDirty()">
            <option value="bassa" ${sensitivity==='bassa'?'selected':''}>Bassa  (k = 3.0)</option>
            <option value="media" ${sensitivity==='media'?'selected':''}>Media  (k = 1.5)</option>
            <option value="alta"  ${sensitivity==='alta' ?'selected':''}>Alta   (k = 1.0)</option>
          </select>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <button class="btn btn-primary" onclick="_runForecastSaldo(true)">Aggiorna</button>
          <span id="fcDirtyBadge" style="display:none;font-size:11px;color:var(--warn)">● modifiche in attesa</span>
        </div>
      </div>
    </div>
    <div id="fcOutput"></div>`;
  // Carica dal DB le transazioni escluse persistite
  await _fcLoadExcludedFromDb();
  await _runForecastSaldo();
}

async function renderAnalyticsHealth() {
  const el = document.getElementById('analyticsContent');
  if (!el) return;
  el.innerHTML = '<p style="padding:20px;color:var(--txt2)">Caricamento…</p>';

  const { fetchMonths, monthCols } = _analyticsMonthRange();
  const balRows = await api.getMonthlyBalance(fetchMonths);
  const n = monthCols.length;

  // ── Dati bilancio per mese ────────────────────────────────────────────────
  const byYm = {};
  for (const r of balRows) byYm[r.ym] = r;
  const incomes  = monthCols.map(m => byYm[m.ym]?.income  || 0);
  const expenses = monthCols.map(m => byYm[m.ym]?.expense || 0);
  const savings  = monthCols.map((_, i) => incomes[i] - expenses[i]);

  const totalIncome  = incomes.reduce((a,b)=>a+b,0);
  const totalExpense = expenses.reduce((a,b)=>a+b,0);
  const totalSavings = totalIncome - totalExpense;
  const avgSavingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;

  // ── Score salute (0–100) ──────────────────────────────────────────────────
  // 1. Tasso risparmio (0–40 pt) — 8 soglie
  const scoreSavings = avgSavingsRate >= 20 ? 40 : avgSavingsRate >= 15 ? 35 : avgSavingsRate >= 10 ? 29 : avgSavingsRate >= 7 ? 23 : avgSavingsRate >= 5 ? 16 : avgSavingsRate >= 3 ? 9 : avgSavingsRate > 0 ? 4 : avgSavingsRate === 0 ? 0 : avgSavingsRate >= -5 ? -7 : avgSavingsRate >= -10 ? -13 : -20;
  // 2. Stabilità mensile (0–20 pt) — 7 soglie %
  const posMonths = savings.filter(s => s > 0).length;
  const posPct = n > 0 ? posMonths / n : 0;
  const scorePos = posPct === 1 ? 20 : posPct >= 0.9 ? 18 : posPct >= 0.75 ? 15 : posPct >= 0.6 ? 11 : posPct >= 0.4 ? 7 : posPct >= 0.2 ? 3 : 0;
  // 3. Trend spese (0–10 pt) — slope % su media mensile
  const expXMean = (n-1)/2, expAvg = expenses.reduce((a,b)=>a+b,0)/(n||1);
  let expNum=0, expDen=0;
  expenses.forEach((v,i)=>{ expNum+=(i-expXMean)*(v-expAvg); expDen+=(i-expXMean)**2; });
  const expSlope = expDen ? expNum/expDen : 0;
  const expSlopePct = expAvg ? expSlope / expAvg * 100 : 0;
  const scoreTrendRaw = expSlopePct <= -3 ? 10 : expSlopePct <= -1 ? 9 : expSlopePct <= 0 ? 7 : expSlopePct < 1 ? 5 : expSlopePct < 3 ? 3 : expSlopePct < 5 ? 1 : 0;
  // Attenuazione: spese crescenti sono meno allarmanti se stai risparmiando bene
  const scoreTrend = avgSavingsRate >= 10 ? Math.max(scoreTrendRaw, 5) : avgSavingsRate >= 5 ? Math.max(scoreTrendRaw, 2) : scoreTrendRaw;
  // 4. Trend del risparmio (0–20 pt) — risparmio crescente = entrate/uscite in miglioramento
  // Usa la mediana delle entrate come denominatore per normalizzare la pendenza in %:
  // evita divisione per risparmi vicini a zero, e non è distorta dai mesi con bonus.
  const incSorted = [...incomes].sort((a,b) => a-b);
  // Media interquartile (IQM): media del 50% centrale, robusto agli outlier
  const iqmQ1 = Math.floor(n * 0.25), iqmQ3 = Math.ceil(n * 0.75);
  const incMedian = incSorted.slice(iqmQ1, iqmQ3).reduce((a,b)=>a+b,0) / (iqmQ3 - iqmQ1);
  const savXMean = (n-1)/2, savAvg = savings.reduce((a,b)=>a+b,0)/(n||1);
  let savNum=0, savDen=0;
  savings.forEach((v,i)=>{ savNum+=(i-savXMean)*(v-savAvg); savDen+=(i-savXMean)**2; });
  const savSlope    = savDen ? savNum/savDen : 0;
  const savSlopePct = incMedian > 0 ? savSlope / incMedian * 100 : 0;
  const scoreIncTrendRaw = savSlopePct > 3 ? 20 : savSlopePct > 1 ? 16 : savSlopePct >= 0 ? 9 : savSlopePct > -1 ? 7 : savSlopePct > -3 ? 3 : 0;
  // Attenuazione: calo di tendenza è meno grave se tutti i mesi sono positivi e risparmi bene
  const scoreIncTrend = (posPct === 1 && avgSavingsRate >= 10) ? Math.max(scoreIncTrendRaw, 8)
    : (posPct >= 0.75 && avgSavingsRate >= 5) ? Math.max(scoreIncTrendRaw, 6)
    : scoreIncTrendRaw;
  // 5. Volatilità entrate (0–10 pt) — coefficiente di variazione, basso = stabile = bene
  // Semi-deviazione (downside) rispetto alla IQM:
  const incSemiVar = n > 1 ? incomes.reduce((a,v) => a + (v < incMedian ? (v-incMedian)**2 : 0), 0) / n : 0;
  const incStddev  = Math.sqrt(incSemiVar);
  const incCV      = incMedian > 0 ? incStddev / incMedian * 100 : 100;
  const scoreVol   = n < 2 ? 0 : incCV < 3 ? 10 : incCV < 6 ? 9 : incCV < 12 ? 7 : incCV < 20 ? 4 : incCV < 30 ? 1 : 0;
  const score = Math.min(100, scoreSavings + scorePos + scoreTrend + scoreIncTrend + scoreVol);
  const scoreColor = score >= 75 ? 'var(--income)' : score >= 50 ? '#e8a838' : score >= 30 ? '#e07020' : 'var(--expense)';
  const scoreLabel = score >= 75 ? 'Ottima' : score >= 60 ? 'Buona' : score >= 45 ? 'Discreta' : score >= 30 ? 'Sufficiente' : score >= 0 ? 'Attenzione' : 'Critica';

  const cc = chartColors();

  // ── Colori badge componenti ───────────────────────────────────────────────
  const colS = scoreSavings >= 29 ? 'var(--income)' : scoreSavings >= 16 ? '#e8a838' : 'var(--expense)';
  const colP = scorePos >= 15 ? 'var(--income)' : scorePos >= 7 ? '#e8a838' : 'var(--expense)';
  const colT = scoreTrend >= 7 ? 'var(--income)' : scoreTrend >= 3 ? '#e8a838' : 'var(--expense)';
  const colI = scoreIncTrend >= 16 ? 'var(--income)' : scoreIncTrend >= 7 ? '#e8a838' : 'var(--expense)';
  const colV = scoreVol >= 7 ? 'var(--income)' : scoreVol >= 4 ? '#e8a838' : 'var(--expense)';

  // ── Dati grafici dettaglio ────────────────────────────────────────────────
  const monthlyRates = monthCols.map((_,i) => incomes[i] > 0 ? +(savings[i] / incomes[i] * 100).toFixed(2) : 0);
  const expRegLine   = monthCols.map((_,i) => expAvg + expSlope * (i - expXMean));
  const savRegLine   = monthCols.map((_,i) => savAvg + savSlope * (i - savXMean));
  const labels       = monthCols.map(m => m.label);

  // ── HTML ──────────────────────────────────────────────────────────────────
  el.innerHTML = `
    <div id="healthReport" style="padding-bottom:24px">

      <!-- Toolbar stampa -->
      <!-- Score principale -->
      <div style="display:grid;grid-template-columns:auto 1fr;gap:16px;margin-bottom:16px;align-items:stretch">
        <div style="text-align:center;padding:20px 28px;background:var(--bg3);border-radius:12px;min-width:120px;display:flex;flex-direction:column;justify-content:center">
          <div style="font-size:52px;font-weight:700;color:${scoreColor};line-height:1">${score}</div>
          <div style="font-size:12px;color:var(--txt3);margin-top:2px">/ 100</div>
          <div style="font-size:15px;font-weight:700;color:${scoreColor};margin-top:6px">${scoreLabel}</div>
        </div>
        <!-- Scomposizione score -->
        <div class="card-section" style="padding:16px 20px;display:flex;flex-direction:column;gap:10px">
          <div style="font-size:12px;font-weight:600;color:var(--txt2);margin-bottom:2px">Come è calcolato il punteggio</div>
          ${[
            {
              label: 'Tasso di risparmio',
              desc:  `Quota media di entrate risparmiata negli ultimi ${n} mesi. ≥20% = eccellente (40 pt) · ≥15% = ottimo · ≥10% = buono · ≥5% = sufficiente · ≤3% = scarso · =0% = nullo · <0% = penalità (fino a −20 pt).`,
              got: scoreSavings, max: 40,
              detail: `${avgSavingsRate.toFixed(1)}% medio → ${scoreSavings}/40 pt`,
              col: scoreSavings>=29?'var(--income)':scoreSavings>=16?'#e8a838':'var(--expense)'
            },
            {
              label: 'Stabilità mensile',
              desc:  `Percentuale di mesi su ${n} chiusi in positivo (entrate > uscite). 100% = ottimo · ≥75% = buono · <40% = attenzione.`,
              got: scorePos, max: 20,
              detail: `${posMonths}/${n} mesi positivi (${(posPct*100).toFixed(0)}%) → ${scorePos}/20 pt`,
              col: scorePos>=15?'var(--income)':scorePos>=7?'#e8a838':'var(--expense)'
            },
            {
              label: 'Trend delle spese',
              desc:  `Direzione della regressione lineare sulle uscite. Calanti ≤−3%/mese = ottimo (10 pt) · stabili = sufficiente · crescenti >+5%/mese = critico. Se stai risparmiando bene (≥10%) il punteggio minimo è 5 — spese crescenti sono meno allarmanti quando il margine è ampio.`,
              got: scoreTrend, max: 10,
              detail: `${expSlopePct>=0?'+':''}${expSlopePct.toFixed(1)}%/mese (${expSlope>=0?'+':''}${fmt.currency(expSlope)}) → ${scoreTrend}/10 pt`,
              col: scoreTrend>=7?'var(--income)':scoreTrend>=3?'#e8a838':'var(--expense)'
            },
            {
              label: 'Trend del risparmio',
              desc:  `Direzione della regressione lineare sul risparmio mensile (entrate − uscite). Cattura insieme l'effetto di entrate e uscite: se le spese crescono e le entrate restano stabili, il risparmio scende. Pendenza normalizzata sul reddito mediano. Crescita &gt;+3%/mese = ottimo · stabile = sufficiente · calo &gt;−3%/mese = critico. Se tutti i mesi sono positivi e risparmi ≥10%, il punteggio minimo è 8 — un calo di tendenza conta meno quando sei sempre in attivo.`,
              got: scoreIncTrend, max: 20,
              detail: `${savSlopePct>=0?'+':''}${savSlopePct.toFixed(1)}%/mese del reddito (${savSlope>=0?'+':''}${fmt.currency(savSlope)}/mese) → ${scoreIncTrend}/20 pt`,
              col: scoreIncTrend>=16?'var(--income)':scoreIncTrend>=7?'#e8a838':'var(--expense)'
            },
            {
              label: 'Stabilità delle entrate',
              desc:  `Semi-deviazione rispetto alla media interquartile (solo mesi sotto il reddito tipico — i bonus non spostano il riferimento). Semi-CV &lt; 3% = ottimo (10 pt) · &lt; 12% = buono · ≥ 30% = variabile.`,
              got: scoreVol, max: 10,
              detail: `Semi-CV ${incCV.toFixed(1)}% → ${scoreVol}/10 pt`,
              col: scoreVol>=7?'var(--income)':scoreVol>=4?'#e8a838':'var(--expense)'
            },
          ].map(c=>`
            <div>
              <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px">
                <span style="font-size:12px;font-weight:600">${c.label}</span>
                <span style="font-size:12px;font-weight:700;color:${c.col}">${c.got}<span style="color:var(--txt3);font-weight:400">/${c.max}</span></span>
              </div>
              <div style="height:5px;background:var(--border);border-radius:3px;margin-bottom:4px">
                <div style="width:${Math.max(0,c.got/c.max*100).toFixed(0)}%;height:100%;background:${c.col};border-radius:3px"></div>
              </div>
              <div class="health-desc">${c.desc}</div>
              <div class="health-desc" style="color:var(--txt2);margin-top:1px">${c.detail}</div>
            </div>`).join('')}
        </div>
      </div>

      <!-- KPI cards -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
        ${[
          ['Entrate totali',  fmt.currency(totalIncome),  'var(--income)'],
          ['Uscite totali',   fmt.currency(totalExpense), 'var(--expense)'],
          ['Risparmio netto', fmt.currency(totalSavings), totalSavings>=0?'var(--income)':'var(--expense)'],
          ['Tasso risparmio', avgSavingsRate.toFixed(1)+'%', avgSavingsRate>=15?'var(--income)':avgSavingsRate>=0?'#e8a838':'var(--expense)'],
        ].map(([label,val,col])=>`
          <div style="padding:14px 16px;background:var(--bg3);border-radius:12px">
            <div style="font-size:11px;color:var(--txt3);margin-bottom:4px">${label}</div>
            <div style="font-size:22px;font-weight:700;color:${col}">${val}</div>
            <div style="font-size:11px;color:var(--txt3);margin-top:2px">ultimi ${n} mesi</div>
          </div>`).join('')}
      </div>

      <!-- Riga 1: Tasso risparmio + Stabilità mensile -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">

        <!-- Tasso di risparmio -->
        <div class="card-section">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <div style="font-size:13px;font-weight:600">Tasso di risparmio</div>
            <div class="score-badge" style="color:${colS}">${scoreSavings > 0 ? '+' : ''}${scoreSavings} / 40 pt</div>
          </div>
          <div class="health-desc" style="margin-bottom:10px">
            Percentuale di entrate risparmiata ogni mese. Media: <strong style="color:${avgSavingsRate>=10?'var(--income)':avgSavingsRate>=0?'#e8a838':'var(--expense)'}">${avgSavingsRate.toFixed(1)}%</strong>.
            Soglie: ≥20% ottimo · ≥10% buono · ≥5% sufficiente · &lt;0% penalizza il punteggio.
          </div>
          <div style="height:150px"><canvas id="healthRateChart"></canvas></div>
        </div>

        <!-- Stabilità mensile -->
        <div class="card-section">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <div style="font-size:13px;font-weight:600">Stabilità mensile</div>
            <div class="score-badge" style="color:${colP}">${scorePos} / 20 pt</div>
          </div>
          <div class="health-desc" style="margin-bottom:12px">
            Mesi chiusi con entrate &gt; uscite: <strong style="color:${colP}">${posMonths} su ${n}</strong> (${(posPct*100).toFixed(0)}%).
            100% = 20 pt · ≥90% = 18 pt · ≥75% = 15 pt · ≥60% = 11 pt · ≥40% = 7 pt · ≥20% = 3 pt · &lt;20% = 0 pt.
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${monthCols.map((m,i) => {
              const s = savings[i];
              const pos = s > 0;
              const bg  = pos ? 'rgba(63,185,80,.15)' : 'rgba(248,81,73,.15)';
              const brd = pos ? 'rgba(63,185,80,.5)'  : 'rgba(248,81,73,.5)';
              const tc  = pos ? 'var(--income)' : 'var(--expense)';
              return `<div title="${m.label}: ${fmt.currency(s)}" style="padding:5px 10px;border-radius:8px;background:${bg};border:1px solid ${brd};min-width:52px;text-align:center">
                <div style="font-size:11px;font-weight:600;color:${tc}">${pos?'▲':'▼'} ${m.label}</div>
                <div style="font-size:10px;color:${tc};margin-top:2px">${fmt.currency(s)}</div>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- Riga 2: Trend spese + Trend entrate -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">

        <!-- Trend delle spese -->
        <div class="card-section">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <div style="font-size:13px;font-weight:600">Trend delle spese</div>
            <div class="score-badge" style="color:${colT}">${scoreTrend} / 10 pt</div>
          </div>
          <div class="health-desc" style="margin-bottom:10px">
            Regressione lineare sulle uscite mensili. Pendenza: <strong style="color:${expSlopePct<=0?'var(--income)':'var(--expense)'}">${expSlopePct>=0?'+':''}${expSlopePct.toFixed(1)}%/mese</strong>
            (${expSlope>=0?'+':''}${fmt.currency(expSlope)}/mese). Spese calanti = migliore punteggio. La linea tratteggiata indica la tendenza.
            ${avgSavingsRate>=10?'<em style="color:var(--income)">Stai risparmiando ≥10%: punteggio minimo garantito a 5 — le spese crescenti sono meno allarmanti con un margine di risparmio ampio.</em>':avgSavingsRate>=5?'<em style="color:#e8a838">Risparmio ≥5%: punteggio minimo garantito a 2.</em>':''}
          </div>
          <div style="height:150px"><canvas id="healthExpChart"></canvas></div>
        </div>

        <!-- Trend del risparmio -->
        <div class="card-section">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <div style="font-size:13px;font-weight:600">Trend del risparmio</div>
            <div class="score-badge" style="color:${colI}">${scoreIncTrend} / 20 pt</div>
          </div>
          <div class="health-desc" style="margin-bottom:10px">
            Regressione lineare sul <strong>risparmio mensile</strong> (entrate − uscite).
            Cattura insieme l'effetto di entrate e uscite: se le spese crescono mentre le entrate restano stabili, il risparmio scende e il punteggio peggiora.
            Pendenza attuale: <strong style="color:${savSlopePct>=0?'var(--income)':'var(--expense)'}">${savSlopePct>=0?'+':''}${savSlopePct.toFixed(1)}% del reddito/mese</strong>
            (${savSlope>=0?'+':''}${fmt.currency(savSlope)}/mese). La linea tratteggiata indica la tendenza.
            ${(posPct===1&&avgSavingsRate>=10)?'<em style="color:var(--income)">Tutti i mesi in attivo con risparmio ≥10%: punteggio minimo garantito a 8.</em>':(posPct>=0.75&&avgSavingsRate>=5)?'<em style="color:#e8a838">Situazione complessivamente positiva: punteggio minimo garantito a 4.</em>':''}
          </div>
          <div style="height:150px"><canvas id="healthIncChart"></canvas></div>
        </div>
      </div>

      <!-- Riga 3: Stabilità entrate (full width) -->
      <div class="card-section" style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <div style="font-size:13px;font-weight:600">Stabilità delle entrate</div>
          <div class="score-badge" style="color:${colV}">${scoreVol} / 10 pt</div>
        </div>
        <div style="display:grid;grid-template-columns:auto auto auto 1fr;gap:16px;align-items:center;margin-bottom:12px">
          <div>
            <div style="font-size:26px;font-weight:700;color:${colV}">${incCV.toFixed(1)}%</div>
            <div style="font-size:10px;color:var(--txt3)">Semi-CV (downside)</div>
          </div>
          <div style="width:1px;height:40px;background:var(--border)"></div>
          <div>
            <div style="font-size:20px;font-weight:600;color:var(--txt2)">− ${fmt.currency(incStddev)}</div>
            <div style="font-size:10px;color:var(--txt3)">Semi-deviazione</div>
          </div>
          <div class="health-desc" style="padding-left:8px">
            Variabilità delle entrate <em>al ribasso</em> rispetto alla media interquartile di <strong>${fmt.currency(incMedian)}/mese</strong> (reddito tipico).
            I mesi con bonus non spostano il riferimento e non penalizzano — conta solo quanto scendi sotto il tuo reddito abituale.
            Semi-CV &lt; 3% = ottimo · &lt; 12% = buono · &lt; 20% = discreto · ≥ 30% = variabile.
            ${n < 2 ? ' &nbsp;<em style="color:var(--expense)">Dati insufficienti: servono almeno 2 mesi.</em>' : ''}
          </div>
        </div>
        <div style="height:150px"><canvas id="healthVolChart"></canvas></div>
      </div>


    </div>`;

  // ── Grafici dettaglio ─────────────────────────────────────────────────────
  if (_healthRateChart) _healthRateChart.destroy();
  if (_healthExpChart)  _healthExpChart.destroy();
  if (_healthIncChart)  _healthIncChart.destroy();
  if (_healthVolChart)  _healthVolChart.destroy();
  _healthRateChart = _healthExpChart = _healthIncChart = _healthVolChart = null;

  // Tasso risparmio per mese — barre colorate + linee soglia
  const rateAvgLabelPlugin = {
    id: 'rateAvgLabel',
    afterDraw(chart) {
      const ctx = chart.ctx, area = chart.chartArea, yScale = chart.scales.y;
      const avg = chart.data.datasets[1].data[0];
      if (avg == null) return;
      const y = yScale.getPixelForValue(avg);
      const color = avg >= 10 ? 'rgba(63,185,80,.95)' : avg >= 5 ? 'rgba(232,168,56,.95)' : 'rgba(248,81,73,.95)';
      ctx.save();
      ctx.font = 'bold 10px sans-serif';
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.fillText('media ' + avg.toFixed(1) + '%', area.right + 4, y + 4);
      ctx.restore();
    }
  };

  _healthRateChart = new Chart(document.getElementById('healthRateChart'), {
    type: 'bar',
    plugins: [rateAvgLabelPlugin],
    data: {
      labels,
      datasets: [
        { label:'Tasso %', data:monthlyRates,
          backgroundColor: monthlyRates.map(r => r>=0?'rgba(63,185,80,.55)':'rgba(248,81,73,.55)'),
          borderColor:      monthlyRates.map(r => r>=0?'rgba(63,185,80,1)' :'rgba(248,81,73,1)'),
          borderWidth:1, order:1 },
        { type:'line', label:'Media', data:Array(n).fill(+avgSavingsRate.toFixed(1)),
          borderColor: avgSavingsRate>=10?'rgba(63,185,80,.85)':avgSavingsRate>=5?'rgba(232,168,56,.85)':'rgba(248,81,73,.85)',
          borderDash:[6,3], pointRadius:0, borderWidth:2, order:0, noLabels:true },
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      layout:{ padding:{ right:80 } },
      plugins:{
        legend:{ display:false },
        tooltip:{ filter: item => item.datasetIndex === 0, callbacks:{ label: ctx => ` ${ctx.parsed.y.toFixed(1)}%` } }
      },
      scales:{
        x:{ ticks:{color:cc.tick,font:{size:10}}, grid:{color:cc.grid} },
        y:{ ticks:{color:cc.tick, callback:v=>v+'%'}, grid:{color:cc.grid} }
      }
    }
  });

  // Trend spese — linea reale + regressione tratteggiata
  _healthExpChart = new Chart(document.getElementById('healthExpChart'), {
    type:'line',
    data:{
      labels,
      datasets:[
        { label:'Uscite', data:expenses,
          borderColor:'rgba(248,81,73,.8)', backgroundColor:'rgba(248,81,73,.1)',
          pointRadius:3, tension:.3, fill:true, borderWidth:2 },
        { label:'Tendenza', data:expRegLine,
          borderColor:'rgba(255,200,80,.75)', borderDash:[6,3],
          pointRadius:0, tension:0, fill:false, borderWidth:2 }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ labels:{color:cc.tick,boxWidth:12} }, tooltip:{ callbacks:{ label:ctx=>` ${ctx.dataset.label}: ${fmt.currency(ctx.parsed.y)}` } } },
      scales:{ x:{ticks:{color:cc.tick,font:{size:10}},grid:{color:cc.grid}}, y:{ticks:{color:cc.tick,callback:v=>fmt.currency(v)},grid:{color:cc.grid}} }
    }
  });

  // Trend risparmio — barre colorate + regressione tratteggiata
  _healthIncChart = new Chart(document.getElementById('healthIncChart'), {
    type:'bar',
    data:{
      labels,
      datasets:[
        { label:'Risparmio', data:savings,
          backgroundColor: savings.map(s => s>=0?'rgba(63,185,80,.5)':'rgba(248,81,73,.5)'),
          borderColor:      savings.map(s => s>=0?'rgba(63,185,80,.9)':'rgba(248,81,73,.9)'),
          borderWidth:1 },
        { type:'line', label:'Tendenza', data:savRegLine,
          borderColor:'rgba(255,200,80,.75)', borderDash:[6,3],
          pointRadius:0, tension:0, fill:false, borderWidth:2 }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ labels:{color:cc.tick,boxWidth:12} }, tooltip:{ callbacks:{ label:ctx=>` ${ctx.dataset.label}: ${fmt.currency(ctx.parsed.y)}` } } },
      scales:{ x:{ticks:{color:cc.tick,font:{size:10}},grid:{color:cc.grid}}, y:{ticks:{color:cc.tick,callback:v=>fmt.currency(v)},grid:{color:cc.grid}} }
    }
  });

  // Stabilità entrate — barre mensili + linea media + fasce ±1σ
  _healthVolChart = new Chart(document.getElementById('healthVolChart'), {
    type:'bar',
    data:{
      labels,
      datasets:[
        { label:'Entrate', data:incomes,
          backgroundColor:'rgba(63,185,80,.4)', borderColor:'rgba(63,185,80,.7)', borderWidth:1 },
        { type:'line', label:'Mediana', data:Array(n).fill(incMedian),
          borderColor:'rgba(232,168,56,.85)', borderDash:[5,3],
          pointRadius:0, fill:false, borderWidth:2 },
        { type:'line', label:'Soglia −1σ', data:Array(n).fill(Math.max(0, incMedian-incStddev)),
          borderColor:'rgba(248,81,73,.85)', borderDash:[3,4],
          pointRadius:0, fill:'origin', backgroundColor:'rgba(248,81,73,.08)', borderWidth:2 },
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{
        legend:{ labels:{ color:cc.tick, boxWidth:12 } },
        tooltip:{ callbacks:{ label:ctx=>` ${ctx.dataset.label}: ${fmt.currency(ctx.parsed.y)}` } }
      },
      scales:{ x:{ticks:{color:cc.tick,font:{size:10}},grid:{color:cc.grid}}, y:{ticks:{color:cc.tick,callback:v=>fmt.currency(v)},grid:{color:cc.grid}} }
    }
  });

}

/* ─── Analytics: Saldo Conti ────────────────────────────────────────────── */
let _accBalChart = null;
let _accBalData  = null;   // { accounts, byAccount: {aid: {ym: balance}}, monthCols }
let _accBalSel   = null;   // Set di account_id selezionati

async function renderAnalyticsAccBalance() {
  const el = document.getElementById('analyticsContent');
  if (!el) return;
  el.innerHTML = '<p style="padding:20px;color:var(--txt2)">Caricamento…</p>';

  const now = new Date();
  const toYm = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  const prevYm = toYm(new Date(now.getFullYear(), now.getMonth()-1, 1));
  const oldestYm = _analyticsOldestYm || prevYm;
  const startYm = _analyticsStartYm  || oldestYm;
  const endYm   = _analyticsEndYm    || prevYm;

  // Mesi da mostrare
  const monthCols = [];
  for (let d = new Date(startYm + '-01'), end = new Date(endYm + '-01'); d <= end; d = new Date(d.getFullYear(), d.getMonth()+1, 1))
    monthCols.push({ ym: toYm(d), label: d.toLocaleDateString('it-IT', { month:'short', year:'2-digit' }) });

  const fetchMonths = Math.max(1,
    (now.getFullYear() - new Date(startYm+'-01').getFullYear()) * 12 +
    (now.getMonth()    - new Date(startYm+'-01').getMonth()) + 1);

  let raw;
  try { raw = await api.getAccountBalanceHistory(fetchMonths); }
  catch(e) { el.innerHTML = `<p style="padding:20px;color:var(--expense)">Errore: ${e.message}</p>`; return; }
  if (!raw || !raw.accounts) { el.innerHTML = `<p style="padding:20px;color:var(--expense)">Dati non disponibili</p>`; return; }
  const accounts = raw.accounts;

  // Inizializza selezione: solo conti correnti (checking) non chiusi
  if (!_accBalSel) {
    const checking = accounts.filter(a => !a.is_closed && a.type === 'checking');
    _accBalSel = new Set((checking.length ? checking : accounts.filter(a => !a.is_closed)).map(a => a.id));
  }

  // byAccount: aid -> ym -> balance
  const byAccount = {};
  for (const r of raw.monthly) {
    if (!byAccount[r.account_id]) byAccount[r.account_id] = {};
    byAccount[r.account_id][r.ym] = r.balance;
  }

  _accBalData = { accounts, byAccount, monthCols };
  _renderAccBalChart();
}

function _renderAccBalChart() {
  const el = document.getElementById('analyticsContent');
  if (!el || !_accBalData) return;
  const { accounts, byAccount, monthCols } = _accBalData;
  const sel = _accBalSel;

  const selAccounts = accounts.filter(a => sel.has(a.id));
  const labels = monthCols.map(m => m.label);

  // Colori per conto (usa color dal DB, altrimenti palette)
  const palette = ['#58a6ff','#3fb950','#ff7b72','#e3b341','#bc8cff','#79c0ff','#56d364','#ffa657','#f78166','#d2a8ff'];
  const accColor = (a, i) => a.color || palette[i % palette.length];

  // Dataset: stacked area per conto
  const datasets = selAccounts.map((a, i) => ({
    type: 'bar',
    label: `${a.icon||''} ${a.name}`,
    data: monthCols.map(m => {
      const b = byAccount[a.id]?.[m.ym];
      return b !== undefined ? Math.round(b * 100) / 100 : 0;
    }),
    backgroundColor: accColor(a, i) + 'cc',
    borderColor: accColor(a, i),
    borderWidth: 1,
    stack: 'saldo',
  }));

  // Totale come linea sopra le barre
  const totals = monthCols.map(m =>
    selAccounts.reduce((s, a) => s + (byAccount[a.id]?.[m.ym] ?? 0), 0)
  );
  datasets.push({
    type: 'line',
    label: 'Totale',
    data: totals,
    borderColor: 'rgba(255,255,255,0.7)',
    backgroundColor: 'transparent',
    pointRadius: monthCols.length <= 18 ? 3 : 1,
    pointHoverRadius: 5,
    borderWidth: 2,
    borderDash: [5, 3],
    tension: .3,
    order: -1,
  });

  const cc = chartColors();

  // Costruisce la tabella
  const tableRows = monthCols.map(m => {
    const cells = selAccounts.map(a => {
      const v = byAccount[a.id]?.[m.ym];
      return `<td class="text-right">${v !== undefined ? fmt.currency(v) : '—'}</td>`;
    }).join('');
    const tot = selAccounts.reduce((s, a) => s + (byAccount[a.id]?.[m.ym] ?? 0), 0);
    return `<tr><td>${m.label}</td>${cells}<td class="text-right" style="font-weight:700">${fmt.currency(tot)}</td></tr>`;
  }).join('');

  const headerCells = selAccounts.map((a,i) =>
    `<th class="text-right" style="color:${accColor(a,i)}">${a.icon||''} ${a.name}</th>`
  ).join('');

  // Selettore conti
  const accButtons = accounts.map((a, i) => {
    const on = sel.has(a.id);
    const col = accColor(a, i);
    return `<button type="button" onclick="_toggleAccBal(${a.id})"
      style="padding:4px 12px;font-size:12px;border-radius:16px;border:1.5px solid ${col};cursor:pointer;
             background:${on ? col+'33' : 'transparent'};color:${on ? col : 'var(--txt2)'};
             font-weight:${on ? '600' : '400'};transition:all .15s;white-space:nowrap">
      ${a.icon||''} ${a.name}${a.is_closed ? ' ✕' : ''}
    </button>`;
  }).join('');

  el.innerHTML = `
    <div style="padding:12px 0 8px">
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">${accButtons}</div>
      <div style="height:380px;margin-bottom:20px"><canvas id="accBalChart"></canvas></div>
      <table class="analytics-table">
        <thead><tr>
          <th>Mese</th>${headerCells}<th class="text-right">Totale</th>
        </tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>`;

  if (_accBalChart) { _accBalChart.destroy(); _accBalChart = null; }
  _accBalChart = new Chart(document.getElementById('accBalChart'), {
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmt.currency(ctx.parsed.y)}` } },
        legend: { labels: { color: cc.tick, boxWidth: 12 } },
        zoom: zoomOpts(),
      },
      scales: {
        x: { stacked: true, ticks: { color: cc.tick }, grid: { color: cc.grid } },
        y: { stacked: true, ticks: { color: cc.tick, callback: v => fmt.currency(v) }, grid: { color: cc.grid } },
      },
    },
  });
}

window._toggleAccBal = (aid) => {
  if (_accBalSel.has(aid)) {
    if (_accBalSel.size > 1) _accBalSel.delete(aid);
  } else {
    _accBalSel.add(aid);
  }
  _renderAccBalChart();
};

/* ─── Analytics: Andamento Categoria ─────────────────────────────────────── */
let _analyticsTrendCatId  = null;
let _analyticsTrendChart  = null;
let _analyticsTrendCache  = null; // { monthCols, catMap }
let _trendIncludeZero     = true;

async function renderAnalyticsTrend() {
  const el = document.getElementById('analyticsContent');
  if (!el) return;
  el.innerHTML = '<p style="padding:20px;color:var(--txt2)">Caricamento…</p>';

  const { fetchMonths, monthCols } = _analyticsMonthRange();
  const rows = await api.getCategoryMonthTable(fetchMonths);

  const catMap = {};
  for (const r of rows) {
    if (!catMap[r.id]) catMap[r.id] = { id: r.id, name: r.name, type: r.type, color: r.color, icon: r.icon, parent_name: r.parent_name || null, m: {} };
    catMap[r.id].m[r.ym] = r.total;
  }
  _analyticsTrendCache = { monthCols, catMap };

  const cats = Object.values(catMap).sort((a, b) => {
    if (a.type !== b.type) return a.type === 'expense' ? -1 : 1;
    const pa = a.parent_name || a.name, pb = b.parent_name || b.name;
    return pa.localeCompare(pb) || a.name.localeCompare(b.name);
  });

  if (!_analyticsTrendCatId || !catMap[_analyticsTrendCatId]) {
    _analyticsTrendCatId = cats[0]?.id || null;
  }

  const optLabel = c => `${c.type === 'expense' ? '↑' : '↓'} ${c.parent_name ? c.parent_name + ' › ' : ''}${c.icon || ''} ${c.name}`;

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap">
      <label style="font-size:13px;color:var(--txt2)">Categoria:</label>
      <select id="trendCatSelect" class="form-control" style="min-width:240px;max-width:360px">
        ${cats.map(c => `<option value="${c.id}"${c.id === _analyticsTrendCatId ? ' selected' : ''}>${optLabel(c)}</option>`).join('')}
      </select>
      <div id="trendSlopeInfo" style="margin-left:8px;font-size:13px"></div>
      <label style="margin-left:auto;display:flex;align-items:center;gap:6px;font-size:12px;color:var(--txt2);cursor:pointer;white-space:nowrap">
        <input type="checkbox" id="trendIncludeZero" ${_trendIncludeZero ? 'checked' : ''}>
        Includi mesi a zero nel trend
      </label>
    </div>
    <div style="font-size:11px;color:var(--txt3);margin-bottom:10px">
      La linea <span style="color:rgba(185,120,255,1);font-weight:600">Trend</span> usa il metodo Theil-Sen: mediana delle pendenze tra tutte le coppie di mesi. Più robusto della regressione lineare classica — i mesi anomali (es. spese straordinarie) non distorcono la tendenza.
    </div>
    <div style="position:relative;height:380px"><canvas id="trendChart"></canvas></div>`;

  document.getElementById('trendCatSelect').onchange = function() {
    _analyticsTrendCatId = parseInt(this.value);
    _renderAnalyticsTrendChart();
  };
  document.getElementById('trendIncludeZero').onchange = function() {
    _trendIncludeZero = this.checked;
    _renderAnalyticsTrendChart();
  };

  _renderAnalyticsTrendChart();
}

function _renderAnalyticsTrendChart() {
  if (!_analyticsTrendCache) return;
  const { monthCols, catMap } = _analyticsTrendCache;
  const cat = catMap[_analyticsTrendCatId];
  if (!cat) return;

  const values = monthCols.map(m => cat.m[m.ym] || 0);
  const labels  = monthCols.map(m => m.label);
  const n = values.length;

  // Media (linea piatta)
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = n ? sum / n : 0;
  const avgData = values.map(() => avg);

  // Trend (Theil-Sen: mediana delle pendenze tra tutte le coppie di punti — robusto agli outlier)
  const tsPoints = _trendIncludeZero
    ? values.map((v, i) => ({ v, i }))
    : values.map((v, i) => ({ v, i })).filter(p => p.v > 0);
  const tsPts = tsPoints.length >= 2 ? tsPoints : values.map((v, i) => ({ v, i }));
  const slopes = [];
  for (let a = 0; a < tsPts.length; a++)
    for (let b = a + 1; b < tsPts.length; b++)
      slopes.push((tsPts[b].v - tsPts[a].v) / (tsPts[b].i - tsPts[a].i));
  slopes.sort((a, b) => a - b);
  const slope = slopes.length === 0 ? 0 : slopes.length % 2 === 0
    ? (slopes[slopes.length/2-1] + slopes[slopes.length/2]) / 2
    : slopes[Math.floor(slopes.length/2)];
  // Intercetta: mediana(y) - slope * mediana(x) sui punti usati
  const tsXs = tsPts.map(p => p.i).sort((a,b) => a-b);
  const tsVs = [...tsPts.map(p => p.v)].sort((a,b) => a-b);
  const m = tsPts.length;
  const xMedian = m%2===0 ? (tsXs[m/2-1]+tsXs[m/2])/2 : tsXs[Math.floor(m/2)];
  const vMedian = m%2===0 ? (tsVs[m/2-1]+tsVs[m/2])/2 : tsVs[Math.floor(m/2)];
  const intercept = vMedian - slope * xMedian;
  const trendData = values.map((_, i) => Math.max(0, intercept + slope * i));

  // Mostra pendenza leggibile
  const slopeEl = document.getElementById('trendSlopeInfo');
  if (slopeEl && n >= 2) {
    const sign = slope >= 0 ? '+' : '';
    const pctYear = avg ? (slope * 12 / avg * 100) : 0;
    const pctSign = pctYear >= 0 ? '+' : '';
    const color = slope >= 0 ? 'var(--expense)' : 'var(--income)';
    slopeEl.innerHTML = `<span style="color:rgba(100,160,255,1);font-weight:600">${fmt.currency(avg)}/mese</span>`
      + `<span style="color:var(--txt3);margin-left:6px;margin-right:12px">media</span>`
      + `<span style="color:${color};font-weight:600">${sign}${fmt.currency(slope)}/mese</span>`
      + `<span style="color:var(--txt3);margin-left:8px">(${pctSign}${pctYear.toFixed(1)}%/anno)</span>`;
  } else if (slopeEl) {
    slopeEl.innerHTML = '';
  }

  const cc = chartColors();
  const t = document.documentElement.dataset.theme;
  const isLight    = t === 'carta' || t === 'salvia';
  const lineBlue   = isLight ? 'rgba(20,70,190,1)'  : 'rgba(100,160,255,1)';
  const linePurple = isLight ? 'rgba(100,30,190,1)' : 'rgba(185,120,255,1)';
  const barColor = (cat.color && cat.color.startsWith('#') && cat.color.length === 7)
    ? cat.color + '66'
    : 'rgba(88,166,255,.4)';

  // Plugin inline: etichette sui punti di media e trend
  const trendLabelPlugin = {
    id: 'trendLabels',
    afterDatasetsDraw(chart) {
      const ctx = chart.ctx;
      chart.data.datasets.forEach((ds, i) => {
        if (ds.type !== 'line') return;
        const meta = chart.getDatasetMeta(i);
        if (!meta.visible) return;
        ctx.save();
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = ds.borderColor;
        ctx.textAlign = 'center';
        if (ds.noLabels) { ctx.restore(); return; }
        meta.data.forEach((pt, j) => {
          const val = ds.data[j];
          if (val == null) return;
          const text = fmt.currency(val);
          ctx.fillText(text, pt.x, pt.y - 7);
        });
        ctx.restore();
      });
    }
  };

  if (_analyticsTrendChart) { _analyticsTrendChart.destroy(); _analyticsTrendChart = null; }
  _analyticsTrendChart = new Chart(document.getElementById('trendChart'), {
    plugins: [trendLabelPlugin],
    data: {
      labels,
      datasets: [
        { type: 'bar',  label: 'Importo',  data: values,    backgroundColor: barColor, order: 2 },
        { type: 'line', label: 'Media',    data: avgData,   borderColor: lineBlue,   borderWidth: 3, borderDash: [8, 4], pointRadius: 0, tension: 0, order: 1, noLabels: true },
        { type: 'line', label: 'Trend',    data: trendData, borderColor: linePurple, borderWidth: 3, pointRadius: 0, tension: 0, order: 1 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      layout: { padding: { top: 20 } },
      plugins: {
        tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmt.currency(ctx.parsed.y)}` } },
        legend:  { labels: { color: cc.tick, boxWidth: 12 } },
        zoom: zoomOpts()
      },
      scales: {
        x: { ticks: { color: cc.tick }, grid: { color: cc.grid } },
        y: { beginAtZero: true, ticks: { color: cc.tick, callback: v => fmt.currency(v) }, grid: { color: cc.grid } }
      }
    }
  });
}

async function renderReports() {
  const pg = document.getElementById('pg-reports');
  pg.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
      <h2 style="font-size:var(--fs-xl,18px);font-weight:700">Resoconti</h2>
      <div class="flex-center-8">
        <button class="btn btn-primary" onclick="showReportModal()">＋ Nuovo resoconto</button>
      </div>
    </div>
    <div id="rReportHeader" style="margin-bottom:16px"></div>
    <div id="rResults"></div>`;

  if (_currentReportId !== null) {
    const reports = await api.getReports();
    const r = reports.find(x => x.id === _currentReportId);
    if (r) { _loadReportConfig(r); _updateReportHeader(r); return; }
  }
  if (Object.keys(_reportFilters||{}).length || _reportGroupby !== 'none' || _reportChartType !== 'none') {
    _updateReportHeader(null);
    runReport();
  }
}


async function renderNatureReport() {
  const el = document.getElementById('analyticsContent') || document.getElementById('rNatureContent');
  if (!el) return;
  el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--txt3)">⏳ Caricamento...</div>';

  const startYm = _analyticsStartYm || _analyticsOldestYm;
  const endYm   = _analyticsEndYm;
  const filter  = (startYm && endYm)
    ? { date_from: startYm + '-01', date_to: endYm + '-31' }
    : {};
  const data   = await api.getExpenseNatureReport(filter);
  const byNature = data.by_nature   || [];
  const byCat    = data.by_category || [];
  const totalAll = byNature.reduce((s, r) => s + (Number(r.total) || 0), 0);

  const NATURE = {
    essenziale: { label: 'Essenziale', color: '#3fb950', icon: '🟢' },
    variabile:  { label: 'Variabile',  color: '#e3b341', icon: '🟡' },
    superflua:  { label: 'Superflua',  color: '#f85149', icon: '🔴' },
    '':         { label: 'Non classificata', color: 'var(--txt3)', icon: '⬜' },
  };
  const ORDER = ['essenziale', 'variabile', 'superflua', ''];

  const cards = ORDER.map(n => {
    const row  = byNature.find(r => r.nature === n);
    const tot  = Number(row?.total || 0);
    const cnt  = Number(row?.tx_count || 0);
    const pct  = totalAll > 0 ? (tot / totalAll * 100).toFixed(1) : '0.0';
    const m    = NATURE[n];
    return `
      <div class="card" style="padding:16px;flex:1;min-width:130px">
        <div style="font-size:18px;margin-bottom:4px">${m.icon}</div>
        <div style="font-size:12px;font-weight:700;color:var(--txt2);text-transform:uppercase;letter-spacing:.5px">${m.label}</div>
        <div style="font-size:22px;font-weight:700;color:${m.color};margin:6px 0">${fmt.currency(tot)}</div>
        <div style="font-size:11px;color:var(--txt3)">${pct}% · ${cnt} transazioni</div>
        <div style="margin-top:8px;height:4px;background:var(--bg3);border-radius:2px">
          <div style="height:4px;background:${m.color};border-radius:2px;width:${pct}%"></div>
        </div>
      </div>`;
  }).join('');

  const barSegments = ORDER
    .flatMap(n => {
      const r = byNature.find(x => x.nature === n);
      if (!r || !(Number(r.total) > 0)) return [];
      const tot = Number(r.total);
      const pct = (tot / totalAll * 100).toFixed(1);
      return [`<div title="${NATURE[n].label}: ${pct}% (${fmt.currency(tot)})"
        style="flex:${pct};background:${NATURE[n].color};min-width:3px;transition:flex .4s"></div>`];
    }).join('');

  const sections = ORDER.map(n => {
    const cats = byCat.filter(r => r.nature === n);
    if (!cats.length) return '';
    const m = NATURE[n];
    const rows = cats.map(c => {
      const tot  = Number(c.total);
      const pct  = totalAll > 0 ? (tot / totalAll * 100).toFixed(1) : '0.0';
      const df   = filter.date_from || '';
      const dt   = filter.date_to   || '';
      return `<tr class="nature-cat-row" onclick="txFilters={range:'custom',date_from:'${df}',date_to:'${dt}',category_id:${c.cat_id},type:'expense'};navigate('transactions')" title="Vedi transazioni">
        <td style="padding:5px 8px">
          <span style="background:${c.color}22;color:${c.color};padding:2px 8px;border-radius:4px;font-size:12px">${c.icon} ${c.cat_name}</span>
        </td>
        <td style="padding:5px 8px;text-align:right;font-weight:600">${fmt.currency(tot)}</td>
        <td style="padding:5px 8px;text-align:right;color:var(--txt3);font-size:11px">${c.tx_count} tx</td>
        <td style="padding:5px 8px;text-align:right;color:var(--txt3);font-size:11px">${pct}%</td>
      </tr>`;
    }).join('');
    return `
      <div style="margin-top:20px">
        <div style="font-size:13px;font-weight:700;color:${m.color};margin-bottom:8px">${m.icon} ${m.label}</div>
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="color:var(--txt3);border-bottom:1px solid var(--border)">
            <th style="text-align:left;padding:4px 8px">Categoria</th>
            <th style="text-align:right;padding:4px 8px">Importo</th>
            <th style="text-align:right;padding:4px 8px">Tx</th>
            <th style="text-align:right;padding:4px 8px">%</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }).join('');

  el.innerHTML = `
    ${totalAll > 0 ? `
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px">${cards}</div>
    <div class="card" style="padding:12px 16px;margin-bottom:4px">
      <div style="font-size:11px;color:var(--txt3);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">Ripartizione totale · ${fmt.currency(totalAll)}</div>
      <div style="display:flex;height:14px;border-radius:7px;overflow:hidden;gap:2px">${barSegments}</div>
    </div>
    ${sections}` : '<div style="text-align:center;color:var(--txt3);padding:60px">Nessuna uscita nel periodo selezionato.</div>'}`;
}


async function _updateReportHeader(r) {
  const headerEl = document.getElementById('rReportHeader');
  if (!headerEl) return;


  const f = r
    ? (() => { try { return JSON.parse(r.filters_json || '{}'); } catch { return {}; } })()
    : (_reportFilters || {});

  const accIds    = f.account_ids?.length ? f.account_ids : (f.account_id ? [f.account_id] : []);
  const needPresets = f.range && f.range !== 'custom' && !RANGE_DEFAULTS.find(o => o.v === f.range);

  const [accounts, cats, tags, rangePresets] = await Promise.all([
    accIds.length   ? api.getAccounts()     : Promise.resolve([]),
    f.category_id   ? api.getCategories()   : Promise.resolve([]),
    f.tag_ids?.length ? api.getTags()       : Promise.resolve([]),
    needPresets     ? api.getRangePresets() : Promise.resolve([]),
  ]);

  const chip = label => `<span class="r-chip">${label}</span>`;
  const chips = [];

  if (f.range && f.range !== 'custom') {
    const allRanges = [...RANGE_DEFAULTS, ...rangePresets.map(p => ({v:p.range_key, l:p.label}))];
    const found = allRanges.find(o => o.v === f.range);
    chips.push(chip(`📅 ${found ? found.l : f.range}`));
  } else if (f.date_from || f.date_to) {
    chips.push(chip(`📅 ${f.date_from||'…'} → ${f.date_to||'…'}`));
  }

  if (f.type) {
    const typeL = {income:'↑ Entrate', expense:'↓ Uscite', transfer:'⇄ Trasferimenti'};
    chips.push(chip(typeL[f.type] || f.type));
  }

  if (accIds.length) {
    const names = accIds.map(id => accounts.find(a => String(a.id) === String(id))?.name || id);
    chips.push(chip(`🏦 ${names.join(', ')}`));
  }

  if (f.category_id) {
    const cat = cats.find(c => c.id === f.category_id);
    chips.push(chip(`🏷️ ${cat ? cat.name : f.category_id}`));
  }

  if (f.tag_ids?.length) {
    const tagNames = f.tag_ids.map(tid => tags.find(t => t.id === tid)?.name || tid);
    chips.push(chip(`🔖 ${tagNames.join(', ')}`));
  }

  if (f.reconciled != null) {
    chips.push(chip(f.reconciled ? '✓ Verificate' : '⚠ Da verificare'));
  }

  if (f.amount_op && f.amount_val != null && !isNaN(f.amount_val)) {
    const opL = {gt:'>', lt:'<', eq:'='};
    chips.push(chip(`€ ${opL[f.amount_op]||f.amount_op} ${fmt.currency(f.amount_val)}`));
  }

  if (f.search) chips.push(chip(`🔍 "${f.search}"`));

  if (f.has_attachment) chips.push(chip(f.has_attachment === '1' ? '📎 Con allegato' : '📎 Senza allegato'));

  const groupby = r ? r.groupby : _reportGroupby;
  if (groupby && groupby !== 'none') {
    const groupL = {category:'Per categoria', month:'Per mese', account:'Per conto', tag:'Per tag'};
    chips.push(chip(`⊞ ${groupL[groupby] || groupby}`));
  }

  const nameHtml  = r ? `<span class="r-report-name">📋 ${r.name}</span> <button class="btn btn-ghost btn-icon" onclick="showReportModal(${r.id})" title="Modifica">✏️</button>` : '';
  const chipsHtml = chips.length ? `<div class="r-chips">${chips.join('')}</div>` : '';
  headerEl.innerHTML = `${nameHtml}${chipsHtml}`;
}

function _loadReportConfig(r) {
  _currentReportId = r.id;
  _reportGroupby   = r.groupby    || 'none';
  _reportChartType = r.chart_type || 'none';
  try { _reportFilters = JSON.parse(r.filters_json || '{}'); } catch { _reportFilters = {}; }
  runReport();
}

async function runReport() {
  const f         = _reportFilters || {};
  const groupby   = _reportGroupby   || 'none';
  const chartType = _reportChartType || 'none';

  const filters = {};
  // Periodo: range dinamico o date statiche (custom / backward compat)
  if (f.range && f.range !== 'custom') {
    Object.assign(filters, rangeToFilter(f.range));
  } else {
    if (f.date_from) filters.date_from = f.date_from;
    if (f.date_to)   filters.date_to   = f.date_to;
  }
  if (f.account_ids?.length) filters.account_ids = f.account_ids;
  else if (f.account_id)    filters.account_id  = f.account_id; // backward compat
  if (f.type)           filters.type           = f.type;
  if (f.category_id)    filters.category_id    = f.category_id;
  if (f.search)         filters.search         = f.search;
  if (f.has_attachment) filters.has_attachment = f.has_attachment;

  const resultsEl = document.getElementById('rResults');
  if (resultsEl) resultsEl.innerHTML = `<div style="text-align:center;padding:40px;color:var(--txt3)">⏳ Caricamento…</div>`;

  let txs = await api.getTransactions(filters);

  // Client-side post-filters
  const reconc = f.reconciled;
  if (reconc != null) txs = txs.filter(t => (t.reconciled||0) === reconc);
  const tagIds = f.tag_ids || [];
  if (tagIds.length) {
    txs = txs.filter(t => t.tags?.length && tagIds.every(tid => t.tags.some(tag => Number(tag.id) === tid)));
  }
  const amtOp = f.amount_op, amtVal = f.amount_val;
  if (amtOp && amtVal != null && !isNaN(amtVal)) {
    txs = txs.filter(t => {
      const a = Math.abs(t.amount);
      if (amtOp==='gt') return a > amtVal;
      if (amtOp==='lt') return a < amtVal;
      if (amtOp==='eq') return Math.abs(a-amtVal) < 0.005;
      return true;
    });
  }

  renderReportResults(txs, groupby, chartType);
}

async function showReportModal(reportId = null) {
  const [accounts, categories, tags, reports, rangePresets] = await Promise.all([
    api.getAccounts(), api.getCategories(), api.getTags(), api.getReports(), api.getRangePresets(),
  ]);

  const r = reportId != null ? reports.find(x => x.id === reportId) : null;
  let f = {}, initGroupby = _reportGroupby || 'none', initChartType = _reportChartType || 'none', initName = '';

  if (r) {
    try { f = JSON.parse(r.filters_json || '{}'); } catch {}
    initGroupby   = r.groupby    || 'none';
    initChartType = r.chart_type || 'none';
    initName      = r.name       || '';
  } else if (reportId === null) {
    f = _reportFilters || {};
  }

  const sel = (val, opt) => val == opt ? ' selected' : '';
  // Se è salvato un range dinamico usalo; se ci sono date statiche = custom; altrimenti vuoto
  const initRange = f.range || (f.date_from || f.date_to ? 'custom' : '');
  const bodyHtml = `
    <div class="form-group">
      <label class="form-label">Nome del resoconto <span style="color:var(--txt3);font-weight:400">(facoltativo — compila per salvare)</span></label>
      <input type="text" class="form-control" id="rmName" value="${initName.replace(/"/g,'&quot;')}" placeholder="es. Spese famiglia 2026" autocomplete="off">
      ${r ? `<div style="font-size:11px;color:var(--txt3);margin-top:3px">Mantieni il nome per aggiornare, cambialo per salvarne una copia.</div>` : ''}
    </div>
    <hr style="border:none;border-top:1px solid var(--border);margin:8px 0 12px">
    <div class="report-modal-grid">
      <div class="form-group">
        <label class="form-label">Periodo</label>
        <select class="form-control" id="rmRange" onchange="rmOnRangeChange(this.value)">
          ${buildRangeOptions(rangePresets, true, initRange)}
        </select>
      </div>
      <div></div>
      <div class="form-group" id="rmDateFromGroup" style="display:${initRange==='custom'?'':'none'}">
        <label class="form-label">Dal</label>
        <input type="date" class="form-control" id="rmDateFrom" value="${f.date_from||''}">
      </div>
      <div class="form-group" id="rmDateToGroup" style="display:${initRange==='custom'?'':'none'}">
        <label class="form-label">Al</label>
        <input type="date" class="form-control" id="rmDateTo" value="${f.date_to||''}">
      </div>
      <div class="form-group" style="grid-column:span 2">
        <label class="form-label">Conti</label>
        <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:3px" id="rmAccountsSelector">
          ${accounts.filter(a=>!a.is_closed).map(a=>`<span class="tag-chip${(f.account_ids||[]).includes(a.id)?' selected':''}" style="--tc:${a.color||'var(--accent)'}" data-acc-id="${a.id}" onclick="this.classList.toggle('selected')">${a.icon||''} ${a.name}</span>`).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Tipo</label>
        <select class="form-control" id="rmType">
          <option value="">Tutti</option>
          <option value="income"${sel(f.type,'income')}>Entrate</option>
          <option value="expense"${sel(f.type,'expense')}>Uscite</option>
          <option value="transfer"${sel(f.type,'transfer')}>Trasferimenti</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Stato</label>
        <select class="form-control" id="rmReconciled">
          <option value="">Tutte</option>
          <option value="1"${f.reconciled===1?' selected':''}>Solo conciliate</option>
          <option value="0"${f.reconciled===0?' selected':''}>Solo da verificare</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Categoria</label>
        <select class="form-control" id="rmCategory">
          <option value="">Tutte</option>
          ${categories.filter(c=>c.type!=='transfer').map(c=>
            `<option value="${c.id}"${sel(f.category_id,c.id)}>${c.parent_id?'└ ':''}${c.icon} ${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Descrizione</label>
        <input type="text" class="form-control" id="rmSearch" value="${(f.search||'').replace(/"/g,'&quot;')}" placeholder="Cerca…">
      </div>
      <div class="form-group">
        <label class="form-label">Allegato</label>
        <select class="form-control" id="rmHasAttachment">
          <option value="">Tutti</option>
          <option value="1"${f.has_attachment==='1'?' selected':''}>📎 Con allegato</option>
          <option value="0"${f.has_attachment==='0'?' selected':''}>Senza allegato</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Importo</label>
        <div class="report-amt-row">
          <select class="form-control" id="rmAmtOp">
            <option value="">—</option>
            <option value="gt"${sel(f.amount_op,'gt')}>＞</option>
            <option value="lt"${sel(f.amount_op,'lt')}>＜</option>
            <option value="eq"${sel(f.amount_op,'eq')}>=</option>
          </select>
          <input type="number" class="form-control" id="rmAmtVal"
                 value="${f.amount_val!=null?f.amount_val:''}" placeholder="Valore" min="0" step="0.01">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Raggruppa per</label>
        <select class="form-control" id="rmGroupby">
          <option value="none">Nessuno (lista)</option>
          <option value="month"${sel(initGroupby,'month')}>Mese</option>
          <option value="category"${sel(initGroupby,'category')}>Categoria</option>
          <option value="account"${sel(initGroupby,'account')}>Conto</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Grafico</label>
        <select class="form-control" id="rmChartType">
          <option value="none">Nessuno</option>
          <option value="bar"${sel(initChartType,'bar')}>Barre</option>
          <option value="line"${sel(initChartType,'line')}>Linea</option>
          <option value="pie"${sel(initChartType,'pie')}>Torta</option>
        </select>
      </div>
    </div>
    ${tags.length ? `
    <div class="form-group" style="margin-top:6px">
      <label class="form-label">Tag</label>
      <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:3px" id="rmTagsSelector">
        ${tags.filter(t=>!t.is_system).map(t=>`<span class="tag-chip${(f.tag_ids||[]).includes(t.id)?' selected':''}" style="--tc:${t.color}" data-tag-id="${t.id}" onclick="this.classList.toggle('selected')">${t.name}</span>`).join('')}
      </div>
    </div>` : ''}`;

  openModal(
    r ? `✏️ Modifica: ${r.name}` : '📊 Nuovo resoconto',
    bodyHtml,
    async () => {
      const name      = document.getElementById('rmName')?.value.trim() || '';
      const dateFrom  = document.getElementById('rmDateFrom')?.value  || '';
      const dateTo    = document.getElementById('rmDateTo')?.value    || '';
      const accountIds = [...document.querySelectorAll('#rmAccountsSelector .tag-chip.selected')]
                           .map(el => parseInt(el.dataset.accId));
      const type      = document.getElementById('rmType')?.value      || '';
      const reconc    = document.getElementById('rmReconciled')?.value;
      const catId     = document.getElementById('rmCategory')?.value  || '';
      const search    = document.getElementById('rmSearch')?.value    || '';
      const amtOp     = document.getElementById('rmAmtOp')?.value     || '';
      const amtVal    = parseFloat(document.getElementById('rmAmtVal')?.value);
      const groupby   = document.getElementById('rmGroupby')?.value   || 'none';
      const chartType = document.getElementById('rmChartType')?.value || 'none';
      const tagIds        = [...document.querySelectorAll('#rmTagsSelector .tag-chip.selected')]
                              .map(el => parseInt(el.dataset.tagId));
      const hasAttachment = document.getElementById('rmHasAttachment')?.value || '';
      const range         = document.getElementById('rmRange')?.value || '';

      const filters = {};
      // Periodo: salva range dinamico; per custom salva le date statiche
      if (range === 'custom') {
        if (dateFrom) filters.date_from = dateFrom;
        if (dateTo)   filters.date_to   = dateTo;
        filters.range = 'custom';
      } else if (range) {
        filters.range = range;
      }
      if (accountIds.length) filters.account_ids = accountIds;
      if (type)           filters.type           = type;
      if (catId)          filters.category_id    = parseInt(catId);
      if (search)         filters.search         = search;
      if (hasAttachment)  filters.has_attachment = hasAttachment;

      _reportGroupby   = groupby;
      _reportChartType = chartType;
      _reportFilters   = { ...filters,
        amount_op: amtOp || '', amount_val: isNaN(amtVal) ? null : amtVal,
        tag_ids: tagIds, reconciled: reconc !== '' && reconc != null ? parseInt(reconc) : null,
      };

      if (name) {
        const data = {
          name,
          filters_json: JSON.stringify(_reportFilters),
          groupby, chart_type: chartType,
        };
        if (r && name === r.name) data.id = r.id;
        try {
          const saved = await api.saveReport(data);
          _currentReportId = saved.id;
          toast(`"${name}" ${data.id ? 'aggiornato' : 'salvato'}`);
        } catch(e) { toast(e.message, 'error'); return false; }
      } else {
        _currentReportId = null;
      }

      closeModal();
      renderSidebarReports();
      if (currentPage !== 'reports') {
        navigate('reports');
      } else {
        if (_currentReportId) {
          const rpts = await api.getReports();
          _updateReportHeader(rpts.find(x => x.id === _currentReportId) || null);
        } else {
          _updateReportHeader(null);
        }
        runReport();
      }
    },
    'Esegui',
    'btn-primary',
    'modal-wide'
  );
  setTimeout(() => { const e = document.getElementById('rmName'); if (e) { e.focus(); e.select(); } }, 60);
}

function rmOnRangeChange(range) {
  const show = range === 'custom';
  const fg = document.getElementById('rmDateFromGroup');
  const tg = document.getElementById('rmDateToGroup');
  if (fg) fg.style.display = show ? '' : 'none';
  if (tg) tg.style.display = show ? '' : 'none';
}

function renderReportResults(txs, groupby, chartType) {
  if (_reportChart) { _reportChart.destroy(); _reportChart = null; }
  const el = document.getElementById('rResults');
  if (!el) return;
  if (!txs.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><p>Nessuna transazione trovata.</p></div>`;
    return;
  }

  // Usa la quota filtrata (split) se disponibile, altrimenti il totale della transazione
  const effectiveAmt = t => t.filtered_split_amount != null ? t.filtered_split_amount : t.amount;
  // Categoria effettiva per split filtrati
  const effectiveCatName = t => t.filtered_split_amount != null
    ? (t.filtered_split_category_name || t.category_name || '—')
    : (t.category_name || '—');
  const effectiveCatIcon = t => t.filtered_split_amount != null
    ? (t.filtered_split_category_icon || t.category_icon || '')
    : (t.category_icon || '');
  const effectiveCatId = t => t.filtered_split_amount != null
    ? (_reportFilters?.category_id || t.category_id || 0)
    : (t.category_id || 0);

  let tableHtml = '', chartData = null;
  const cc = chartColors();

  if (groupby === 'month') {
    const byM = {};
    txs.forEach(t => {
      const k = t.date?.slice(0, 7);
      if (!k) return;
      const a = effectiveAmt(t);
      if (!byM[k]) byM[k] = {income:0,expense:0,count:0};
      byM[k].count++;
      if (t.type==='income')  byM[k].income  += a;
      if (t.type==='expense') byM[k].expense += a;
    });
    const months = Object.keys(byM).sort();
    const totI = months.reduce((s,m)=>s+byM[m].income,0);
    const totE = months.reduce((s,m)=>s+byM[m].expense,0);
    tableHtml = `<table><thead><tr>
      <th>Mese</th><th class="text-right">N.</th>
      <th class="text-right">Entrate</th><th class="text-right">Uscite</th>
      <th class="text-right">Netto</th></tr></thead><tbody>
      ${months.map(m=>{const g=byM[m],net=g.income-g.expense;return`<tr>
        <td>${_fmtMonth(m)}</td><td class="text-right">${g.count}</td>
        <td class="text-right amount-income">${fmt.currency(g.income)}</td>
        <td class="text-right amount-expense">${fmt.currency(g.expense)}</td>
        <td class="text-right" style="font-weight:600;color:${net>=0?'var(--income)':'var(--expense)'}">
          ${fmt.currency(net)}</td></tr>`;}).join('')}
      <tr style="border-top:2px solid var(--border);font-weight:700">
        <td>Totale</td><td class="text-right">${txs.length}</td>
        <td class="text-right amount-income">${fmt.currency(totI)}</td>
        <td class="text-right amount-expense">${fmt.currency(totE)}</td>
        <td class="text-right" style="font-weight:700;color:${totI-totE>=0?'var(--income)':'var(--expense)'}">
          ${fmt.currency(totI-totE)}</td>
      </tr></tbody></table>`;
    if (chartType==='bar'||chartType==='line') chartData={type:chartType,
      labels:months.map(_fmtMonth),
      datasets:[
        {label:'Entrate',data:months.map(m=>byM[m].income),backgroundColor:'rgba(63,185,80,.6)',borderColor:'#3fb950',borderWidth:2,fill:false,borderRadius:4},
        {label:'Uscite', data:months.map(m=>byM[m].expense),backgroundColor:'rgba(248,81,73,.6)',borderColor:'#f85149',borderWidth:2,fill:false,borderRadius:4},
      ]};

  } else if (groupby === 'category') {
    const byC = {};
    txs.forEach(t => {
      const k = effectiveCatId(t);
      const a = effectiveAmt(t);
      if (!byC[k]) byC[k]={name:effectiveCatName(t),icon:effectiveCatIcon(t),color:t.category_color||'var(--txt3)',total:0,count:0};
      byC[k].count++;
      if (t.type==='income')  byC[k].total += a;
      if (t.type==='expense') byC[k].total -= a;
    });
    const cats = Object.entries(byC).sort(([,a],[,b])=>Math.abs(b.total)-Math.abs(a.total));
    tableHtml = `<table><thead><tr>
      <th>Categoria</th><th class="text-right">N.</th><th class="text-right">Totale</th>
      </tr></thead><tbody>
      ${cats.map(([,g])=>`<tr>
        <td><span style="color:${g.color}">${g.icon}</span> ${g.name}</td>
        <td class="text-right">${g.count}</td>
        <td class="text-right" style="font-weight:600;color:${g.total>=0?'var(--income)':'var(--expense)'}">
          ${fmt.currency(Math.abs(g.total))}</td></tr>`).join('')}
      </tbody></table>`;
    if (chartType==='bar') chartData={type:'bar',
      labels:cats.map(([,g])=>`${g.icon} ${g.name}`),
      datasets:[{label:'Totale',data:cats.map(([,g])=>Math.abs(g.total)),
        backgroundColor:cats.map(([,g])=>g.color+'99'),borderRadius:4}]};
    else if (chartType==='pie') chartData={type:'doughnut',
      labels:cats.map(([,g])=>`${g.icon} ${g.name}`),
      datasets:[{data:cats.map(([,g])=>Math.abs(g.total)),
        backgroundColor:cats.map(([,g])=>g.color),borderWidth:0}]};

  } else if (groupby === 'account') {
    const byA = {};
    txs.forEach(t => {
      const k = t.account_id;
      const a = effectiveAmt(t);
      if (!byA[k]) byA[k]={name:t.account_name||'—',color:t.account_color||'var(--accent)',income:0,expense:0,count:0};
      byA[k].count++;
      if (t.type==='income')  byA[k].income  += a;
      if (t.type==='expense') byA[k].expense += a;
    });
    const accs = Object.entries(byA).sort(([,a],[,b])=>b.count-a.count);
    tableHtml = `<table><thead><tr>
      <th>Conto</th><th class="text-right">N.</th>
      <th class="text-right">Entrate</th><th class="text-right">Uscite</th><th class="text-right">Netto</th>
      </tr></thead><tbody>
      ${accs.map(([,g])=>{const net=g.income-g.expense;return`<tr>
        <td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${g.color};margin-right:6px"></span>${g.name}</td>
        <td class="text-right">${g.count}</td>
        <td class="text-right amount-income">${fmt.currency(g.income)}</td>
        <td class="text-right amount-expense">${fmt.currency(g.expense)}</td>
        <td class="text-right" style="font-weight:600;color:${net>=0?'var(--income)':'var(--expense)'}">
          ${fmt.currency(net)}</td></tr>`;}).join('')}
      </tbody></table>`;

  } else {
    const totI = txs.filter(t=>t.type==='income').reduce((s,t)=>s+effectiveAmt(t),0);
    const totE = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+effectiveAmt(t),0);
    const net  = totI - totE;
    tableHtml = `<table><thead><tr>
      <th>Data</th><th>Descrizione</th><th>Categoria</th><th>Conto</th>
      <th class="text-right">Importo</th><th>Tipo</th></tr></thead><tbody>
      ${txs.map(t=>{
        const isSplitFiltered = t.filtered_split_amount != null;
        const dispAmt = effectiveAmt(t);
        return `<tr style="cursor:pointer" onclick="editTx(${t.id})">
        <td>${fmt.date(t.date)}</td>
        <td class="td-main">${t.description||'—'}${isSplitFiltered ? ` <span style="font-size:10px;opacity:.5" title="Totale transazione: ${fmt.currency(t.amount)}">(tot. ${fmt.currency(t.amount)})</span>` : ''}</td>
        <td>${effectiveCatIcon(t)} ${effectiveCatName(t)}${isSplitFiltered ? ' <span style="font-size:10px;opacity:.5">(÷)</span>' : ''}</td>
        <td>${t.account_name||'—'}</td>
        <td class="text-right amount-${t.type}">${t.type==='expense'?'-':''}${fmt.currency(dispAmt)}</td>
        <td><span class="badge badge-${t.type}">${t.type==='income'?'Entrata':t.type==='expense'?'Uscita':'Trasf.'}</span></td>
        </tr>`;}).join('')}
      <tr style="border-top:2px solid var(--border);font-weight:700">
        <td colspan="4">Totale</td>
        <td class="text-right" style="color:${net>=0?'var(--income)':'var(--expense)'}">${fmt.currency(net)}</td>
        <td></td>
      </tr></tbody></table>`;
  }

  el.innerHTML = `
    ${chartData ? `<div class="card" style="margin-bottom:12px;padding:14px">
      <div style="position:relative;height:340px">
        <canvas id="rChart"></canvas></div></div>` : ''}
    <div class="card">
      <div class="card-header">
        <span class="card-title">${txs.length} transazion${txs.length===1?'e':'i'}</span>
      </div>
      <div class="table-wrap">${tableHtml}</div>
    </div>`;

  if (chartData) {
    _reportChart = new Chart(document.getElementById('rChart'), {
      type: chartData.type,
      data: { labels: chartData.labels, datasets: chartData.datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: cc.tick } },
          zoom: (chartData.type!=='doughnut'&&chartData.type!=='pie') ? zoomOpts() : undefined
        },
        scales: (chartData.type!=='doughnut'&&chartData.type!=='pie') ? {
          x: { ticks:{color:cc.tick}, grid:{color:cc.grid} },
          y: { ticks:{color:cc.tick}, grid:{color:cc.grid} }
        } : undefined
      }
    });
  }
}

function _fmtMonth(yyyyMM) {
  if (!yyyyMM || !/^\d{4}-\d{2}$/.test(yyyyMM)) return yyyyMM || '—';
  const [y, m] = yyyyMM.split('-');
  return new Date(parseInt(y), parseInt(m) - 1, 1)
    .toLocaleString('it-IT', { month: 'long', year: 'numeric' });
}


async function deleteReportConfirm(id, name) {
  openModal('Elimina resoconto',
    `<p style="margin:0">Eliminare <b>${name}</b>?</p>`,
    async () => {
      await api.deleteReport(id);
      if (_currentReportId === id) { _currentReportId = null; _updateReportHeader(null); }
      closeModal(); toast('Resoconto eliminato');
      renderSidebarReports();
    }, 'Elimina', 'btn-danger');
}

/* ─── Previsione Saldo ───────────────────────────────────────────────────── */

async function renderForecastSaldo() {
  const container = document.getElementById('rResults');
  const { histMonths, horizonMonths, sensitivity } = _fcParams;

  container.innerHTML = `
    <div class="card" style="padding:16px;margin-bottom:16px">
      <div style="display:flex;flex-wrap:wrap;gap:20px;align-items:flex-end">
        <div>
          <label style="font-size:12px;color:var(--txt2);display:block;margin-bottom:6px">Storico analizzato</label>
          <div style="display:flex;align-items:center;gap:8px">
            <input type="range" id="fcHistR" min="3" max="60" value="${histMonths}" style="width:130px"
              oninput="_fcParams.histMonths=+this.value;document.getElementById('fcHistN').textContent=this.value;_fcSetDirty()">
            <span id="fcHistN" style="font-weight:700;min-width:22px">${histMonths}</span>
            <span style="color:var(--txt2);font-size:13px">mesi</span>
          </div>
        </div>
        <div>
          <label style="font-size:12px;color:var(--txt2);display:block;margin-bottom:6px">Orizzonte previsione</label>
          <div style="display:flex;align-items:center;gap:8px">
            <input type="range" id="fcHorizR" min="1" max="36" value="${horizonMonths}" style="width:130px"
              oninput="_fcParams.horizonMonths=+this.value;document.getElementById('fcHorizN').textContent=this.value;_fcSetDirty()">
            <span id="fcHorizN" style="font-weight:700;min-width:22px">${horizonMonths}</span>
            <span style="color:var(--txt2);font-size:13px">mesi</span>
          </div>
        </div>
        <div>
          <label style="font-size:12px;color:var(--txt2);display:block;margin-bottom:6px">Sensibilità outlier</label>
          <select id="fcSens" class="form-control" onchange="_fcParams.sensitivity=this.value;_fcSetDirty()">
            <option value="bassa" ${sensitivity==='bassa'?'selected':''}>Bassa  (k = 3.0)</option>
            <option value="media" ${sensitivity==='media'?'selected':''}>Media  (k = 1.5)</option>
            <option value="alta"  ${sensitivity==='alta' ?'selected':''}>Alta   (k = 1.0)</option>
          </select>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <button class="btn btn-primary" onclick="_runForecastSaldo(true)">Aggiorna</button>
          <span id="fcDirtyBadge" style="display:none;font-size:11px;color:var(--warn)">● modifiche in attesa</span>
        </div>
      </div>
    </div>
    <div id="fcOutput"></div>`;

  await _runForecastSaldo();
}

function _fcSetDirty() {
  const badge = document.getElementById('fcDirtyBadge');
  if (badge) badge.style.display = '';
}

async function _runForecastSaldo(keepExclusions = false) {
  const { histMonths, horizonMonths, sensitivity } = _fcParams;
  const kMap = { bassa: 3.0, media: 1.5, alta: 1.0 };
  const k    = kMap[sensitivity] || 1.5;
  const out  = document.getElementById('fcOutput');
  if (!out) return;
  // Nascondi badge "modifiche in attesa"
  const _dirtyBadge = document.getElementById('fcDirtyBadge');
  if (_dirtyBadge) _dirtyBadge.style.display = 'none';
  out.innerHTML = '<div style="text-align:center;padding:40px;color:var(--txt2)">Calcolo in corso…</div>';

  if (!keepExclusions) {
    _fcManualExcl = new Set();
    _fcManualIncl = new Set();
    // tx exclusions persistite in DB — non si resettano con "Calcola previsione"
  }

  // ── Carica dati mensili + struttura spese + transazioni mesi espansi ────────
  const toFetch = [..._fcExpandedMonths].filter(ym => !_fcMonthTxCache[ym]);
  const [monthlyData, dashStats, expSplit] = await Promise.all([
    api.getMonthlyBalance(histMonths),
    api.getDashboardStats(new Date().getFullYear()),
    api.getForecastExpenseSplit(histMonths),
    ...toFetch.map(async ym => {
      const [y, mo] = ym.split('-');
      const lastDay = new Date(+y, +mo, 0).getDate();
      const txs = await api.getTransactions({ date_from: `${ym}-01`, date_to: `${ym}-${lastDay}`, limit: 5000 });
      _fcMonthTxCache[ym] = (txs || [])
        .filter(t => t.type !== 'transfer')
        .sort((a, b) => Number(b.amount) - Number(a.amount));
    }),
  ]);

  if (!monthlyData?.length) return;

  // ── Escludi mese corrente (incompleto — stipendio arriva il 27) ─────────────
  const now       = new Date();
  const currentYm = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const histData  = monthlyData.filter(r => String(r.ym) !== currentYm);

  // Flusso parziale del mese corrente (usato per correggere il saldo storico)
  const _curRow          = monthlyData.find(r => String(r.ym) === currentYm);
  const netCurrentPartial = _curRow ? Number(_curRow.income) - Number(_curRow.expense) : 0;

  if (histData.length < 3) {
    out.innerHTML = '<div class="empty-state"><div class="empty-icon">📊</div><p>Dati insufficienti. Servono almeno 3 mesi di transazioni completati.</p></div>';
    return;
  }

  // ── Dati storici ─────────────────────────────────────────────────────────
  const months   = histData.map(r => String(r.ym));
  const incomes  = histData.map(r => Number(r.income));
  const expenses = histData.map(r => Number(r.expense));
  const nets     = months.map((_, i) => incomes[i] - expenses[i]);

  // ── Aggregati aggiustati (sottratte le tx escluse) ────────────────────────
  const adjInc = incomes.map((v, i) => v - (_fcTxAdjustments[months[i]]?.incAdj || 0));
  const adjExp = expenses.map((v, i) => v - (_fcTxAdjustments[months[i]]?.expAdj || 0));
  const adjNet = months.map((_, i) => adjInc[i] - adjExp[i]);

  // ── IQR outlier sui valori aggiustati ────────────────────────────────────
  const incOut       = _fcIqrOutliers(adjInc, k);
  const expOut       = _fcIqrOutliers(adjExp, k);
  const autoExcluded = new Set(months.filter((_, i) => incOut[i] || expOut[i]));

  // ── Esclusioni finali: (auto ∪ manuali-esclusi) − manuali-inclusi ─────────
  const finalExcl = new Set([...autoExcluded, ..._fcManualExcl].filter(m => !_fcManualIncl.has(m)));
  const isOutlier = months.map(m => finalExcl.has(m));

  const cleanNets = adjNet.filter((_, i) => !isOutlier[i]);
  const cleanInc  = adjInc.filter((_, i) => !isOutlier[i]);
  const cleanExp  = adjExp.filter((_, i) => !isOutlier[i]);
  const n         = cleanNets.length;

  if (n < 2) {
    out.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><p>Troppi mesi esclusi. Riduci la sensibilità outlier o reintegra alcuni mesi.</p></div>';
    return;
  }

  // ── Struttura spese: split fisso/saltuario per mese ──────────────────────
  // monthlySplit: ym → { fixed, sporadic } — da DB, categorie freq≥0.75 = fisse
  const monthlySplit = {};
  for (const row of (expSplit?.monthly || [])) {
    monthlySplit[String(row.ym)] = { fixed: Number(row.fixed_exp), sporadic: Number(row.sporadic_exp) };
  }
  const cleanMonthNames = months.filter((_, i) => !isOutlier[i]);

  // ── Statistiche descrittive ───────────────────────────────────────────────
  const _mean = arr => arr.reduce((a,b) => a+b, 0) / arr.length;
  const meanInc  = _mean(cleanInc);
  const meanExp  = _mean(cleanExp);
  const meanNet  = _mean(cleanNets);
  const variance = cleanNets.reduce((s,v) => s + (v - meanNet)**2, 0) / n;
  const stdNet   = Math.sqrt(variance);

  // ── stdBaseline: rimuove il rumore del "quando" arrivano le spese saltuarie ─
  // Per ogni mese pulito: sostituisce la spesa saltuaria reale con la media attesa.
  // mean(netNormalizzato) = meanNet (invariato), ma la varianza è minore.
  const cleanSporadics = cleanMonthNames.map(m => monthlySplit[m]?.sporadic || 0);
  const meanSporadic   = _mean(cleanSporadics.length ? cleanSporadics : [0]);
  const meanFixed      = _mean(cleanMonthNames.map(m => monthlySplit[m]?.fixed || 0).filter((_, i) => i < n));
  const netNormalized  = cleanNets.map((v, ci) => v - cleanSporadics[ci] + meanSporadic);
  const varBaseline    = netNormalized.reduce((s,v) => s + (v - meanNet)**2, 0) / n;
  const stdBaseline    = Math.sqrt(varBaseline);

  // CV totale (variabilità reale vissuta) e baseline (struttura prevedibile)
  const cv         = stdNet      / Math.max(meanInc, 1);
  const cvBaseline = stdBaseline / Math.max(meanInc, 1);

  // ── Regressione lineare (tendenza del flusso netto) ──────────────────────
  // Usa gli indici di calendario reali (non 0..n-1) per evitare distorsione
  // quando i mesi puliti non sono consecutivi (outlier in mezzo alla serie)
  const cleanIndices = months.map((_, i) => i).filter((_, i) => !isOutlier[i]);
  const reg = _fcLinReg(cleanNets, cleanIndices);

  // ── Saldo corrente totale ─────────────────────────────────────────────────
  const currentBalance = Number(dashStats.balance);

  // ── Ricostruzione saldo storico a ritroso dal saldo attuale ─────────────
  // Punto di partenza: saldo alla fine dell'ultimo mese completato
  // (currentBalance include le tx parziali del mese corrente — le sottraiamo)
  const balAtEndOfLastMonth = currentBalance - netCurrentPartial;
  const histBal = new Array(months.length);
  histBal[months.length - 1] = balAtEndOfLastMonth;
  for (let i = months.length - 2; i >= 0; i--) {
    histBal[i] = histBal[i + 1] - nets[i + 1];
  }

  // ── Proiezione futura con IC 90% (crescita errore √t) ───────────────────
  // Flusso mensile = meanNet + trend ammortizzato.
  // Il trend è scalato per R² (affidabilità fit) e decade esponenzialmente
  // nel tempo (dimezza ogni 12 mesi): evita estrapolazioni irrealistiche
  // su orizzonti lunghi o con pochi dati, riportando verso meanNet nel lungo periodo.
  // Con slope=0 o R²=0: flusso = meanNet puro.
  const projLabels= [], projBal = [], projHigh = [], projLow = [];
  let   bal       = balAtEndOfLastMonth;
  for (let i = 1; i <= horizonMonths; i++) {
    const d  = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const trendDecay = reg.r2 * Math.exp(-0.058 * (i - 1));  // R²-scaled, dimezza ogni 12 mesi
    bal += meanNet + reg.slope * trendDecay;
    const margin = 1.645 * stdBaseline * Math.sqrt(i);   // IC 90% — usa stdBaseline (senza rumore saltuario)
    projLabels.push(ym);
    projBal.push(bal);
    projHigh.push(bal + margin);
    projLow.push(bal  - margin);
  }

  // ── Affidabilità composita ────────────────────────────────────────────────
  // 45% stabilità strutturale (cvBaseline — senza rumore saltuario)
  // 25% bontà del trend (R²)
  // 30% quantità dati
  const cvScore   = Math.max(0, 1 - Math.min(cvBaseline, 2) / 2);
  const r2Score   = Math.max(0, reg.r2);
  const nScore    = Math.min(n / histMonths, 1);
  const reliability = (cvScore * 0.45 + r2Score * 0.25 + nScore * 0.30) * 100;
  // Precisione del flusso: variabilità totale vissuta (cv su stdNet, non baseline)
  const precision = Math.max(0, Math.min(100, (1 - cv) * 100));

  const outlierCount  = isOutlier.filter(Boolean).length;
  const autoNormCnt   = months.filter(m => autoExcluded.has(m) && !finalExcl.has(m)).length;
  const manualReiCnt  = months.filter(m => _fcManualIncl.has(m)).length;
  const manualExclCnt = months.filter(m => _fcManualExcl.has(m) && !autoExcluded.has(m)).length;
  const txAdjCnt      = months.filter(m => (_fcTxAdjustments[m]?.incAdj||0)+(_fcTxAdjustments[m]?.expAdj||0) > 0).length;
  const trendLabel    = reg.slope >  50 ? '↑ Crescente'
                      : reg.slope < -50 ? '↓ Decrescente' : '→ Stabile';

  // ── Colori ───────────────────────────────────────────────────────────────
  const relColor   = reliability >= 70 ? 'var(--income)' : reliability >= 45 ? 'var(--warn)' : 'var(--expense)';
  const netColor   = meanNet  >= 0 ? 'var(--income)' : 'var(--expense)';
  const slopeColor = reg.slope >= 0 ? 'var(--income)' : 'var(--expense)';
  const finalBal   = projBal.at(-1);
  const finalColor = finalBal >= currentBalance ? 'var(--income)' : 'var(--expense)';

  // ── Helper: etichetta stato cella mese ────────────────────────────────────
  const _monthStato = m => {
    const hasTxAdj = (_fcTxAdjustments[m]?.incAdj||0)+(_fcTxAdjustments[m]?.expAdj||0) > 0;
    if (_fcManualExcl.has(m))                       return '<span style="color:var(--expense);font-size:11px">✕ escluso</span>';
    if (_fcManualIncl.has(m))                       return '<span style="color:var(--income);font-size:11px">✓ reintegrato</span>';
    if (autoExcluded.has(m) && finalExcl.has(m))   return '<span style="color:var(--warn);font-size:11px">⚠ anomalo</span>';
    if (autoExcluded.has(m) && !finalExcl.has(m))  return '<span style="color:var(--income);font-size:11px">✓ normalizzato</span>';
    if (hasTxAdj)                                   return '<span style="color:var(--txt2);font-size:11px">✂ tx escluse</span>';
    return '';
  };

  // ── Helper: sub-tabella transazioni per mese espanso ─────────────────────
  // sub-tabella tx: usa la funzione di modulo _fcBuildTxSubrow

  // ── Render ────────────────────────────────────────────────────────────────
  out.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:12px;margin-bottom:18px">
      ${_fcCard('Entrate medie/mese',  fmt.currency(meanInc),  'var(--income)')}
      ${_fcCard('Uscite medie/mese',   fmt.currency(meanExp),  'var(--expense)')}
      ${_fcCard('Flusso netto medio',  (meanNet>=0?'+':'')+fmt.currency(meanNet), netColor)}
      ${_fcCard('Trend mensile',       (reg.slope>=0?'+':'')+fmt.currency(reg.slope)+'/m', slopeColor)}
      ${_fcCard('Affidabilità',        reliability.toFixed(0)+'%', relColor)}
      ${_fcCard('Precisione flusso',   precision.toFixed(0)+'%',   relColor)}
    </div>

    <div class="card" style="padding:16px;margin-bottom:16px">
      <div style="font-size:14px;font-weight:600;margin-bottom:14px">Andamento saldo — storico &amp; previsione</div>
      <canvas id="fcChartCanvas" style="max-height:340px"></canvas>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
      <div class="card" style="padding:16px">
        <div style="font-size:13px;font-weight:600;margin-bottom:12px;color:var(--txt2)">Statistiche modello</div>
        <table style="width:100%;font-size:12px;border-collapse:collapse">
          ${_fcRow('Mesi analizzati',               months.length)}
          ${_fcRow('Mesi usati nel calcolo',        n)}
          ${_fcRow('Mesi esclusi totale',           outlierCount, outlierCount > 0 ? 'var(--warn)' : '')}
          ${autoNormCnt   > 0 ? _fcRow('Normalizzati via tx escluse', autoNormCnt,   'var(--income)') : ''}
          ${manualReiCnt  > 0 ? _fcRow('Reintegrati manualmente',     manualReiCnt,  'var(--income)') : ''}
          ${manualExclCnt > 0 ? _fcRow('Esclusi manualmente',         manualExclCnt, 'var(--expense)') : ''}
          ${txAdjCnt      > 0 ? _fcRow('Mesi con tx escluse',         txAdjCnt,      'var(--txt2)') : ''}
          ${_fcRow('Std flusso totale',              fmt.currency(stdNet))}
          ${_fcRow('Std strutturale (baseline)',    fmt.currency(stdBaseline))}
          ${_fcRow('Variabilità totale/entrate',   (cv*100).toFixed(1)+'%')}
          ${_fcRow('Variabilità strutturale',      (cvBaseline*100).toFixed(1)+'%')}
          ${_fcRow('Spese fisse medie/mese',        fmt.currency(meanFixed))}
          ${_fcRow('Spese saltuarie medie/mese',    fmt.currency(meanSporadic))}
          ${_fcRow('R² regressione lineare',        reg.r2.toFixed(3))}
          ${_fcRow('Tendenza rilevata',             trendLabel)}
        </table>
      </div>
      <div class="card" style="padding:16px">
        <div style="font-size:13px;font-weight:600;margin-bottom:12px;color:var(--txt2)">Margini d'errore IC 90%</div>
        <table style="width:100%;font-size:12px;border-collapse:collapse">
          ${_fcRow('Errore a  1 mese',  '± '+fmt.currency(1.645*stdBaseline*Math.sqrt(1)))}
          ${_fcRow('Errore a  3 mesi',  '± '+fmt.currency(1.645*stdBaseline*Math.sqrt(3)))}
          ${_fcRow('Errore a  6 mesi',  '± '+fmt.currency(1.645*stdBaseline*Math.sqrt(6)))}
          ${_fcRow('Errore a 12 mesi',  '± '+fmt.currency(1.645*stdBaseline*Math.sqrt(12)))}
          <tr><td colspan="2" style="padding:4px 0;border-top:1px solid var(--border)"></td></tr>
          ${_fcRow('Saldo previsto a '+horizonMonths+'m', fmt.currency(finalBal), finalColor)}
          ${_fcRow('Limite inferiore IC', fmt.currency(projLow.at(-1)))}
          ${_fcRow('Limite superiore IC', fmt.currency(projHigh.at(-1)))}
        </table>
      </div>
    </div>

    ${(() => {
      const cats = expSplit?.categories || [];
      if (!cats.length) return '';
      const fisse      = cats.filter(c => c.frequency >= 0.75);
      const periodiche = cats.filter(c => c.frequency >= 0.40 && c.frequency < 0.75);
      const saltuarie  = cats.filter(c => c.frequency  < 0.40);
      const col = (title, color, list) => {
        if (!list.length) return '';
        const rows = list.slice(0, 10).map(c =>
          `<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--border);font-size:11px">
            <span style="color:var(--txt)">${c.name}</span>
            <span style="color:${color};font-weight:600;white-space:nowrap;margin-left:8px">${fmt.currency(c.avg_monthly)}/m</span>
          </div>`
        ).join('');
        const totAvg = list.reduce((s, c) => s + Number(c.avg_monthly), 0);
        return `<div>
          <div style="font-size:11px;font-weight:700;color:${color};margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px">${title}</div>
          ${rows}
          <div style="font-size:11px;color:var(--txt2);margin-top:5px;text-align:right">Totale: <b style="color:${color}">${fmt.currency(totAvg)}/m</b></div>
        </div>`;
      };
      return `<div class="card" style="padding:16px;margin-bottom:16px">
        <div style="font-size:13px;font-weight:600;margin-bottom:14px;color:var(--txt2)">Struttura spese per categoria</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:20px">
          ${col('Fisse (ogni mese)',     'var(--income)',  fisse)}
          ${col('Periodiche (40-75%)',   'var(--warn)',    periodiche)}
          ${col('Saltuarie (<40%)',      'var(--expense)', saltuarie)}
        </div>
      </div>`;
    })()}

    ${outlierCount > 0 || autoNormCnt > 0 ? `
    <div class="card" style="padding:16px;margin-bottom:16px;border-left:3px solid var(--warn)">
      <div style="font-size:13px;font-weight:600;margin-bottom:6px;color:var(--warn)">⚠ Mesi anomali — gestione esclusioni</div>
      <div style="font-size:12px;color:var(--txt2);margin-bottom:10px">
        Mesi con valori anomali (IQR k=${k}). Clicca ▶ per espandere e vedere le singole transazioni — escludine una per normalizzare il mese.
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${months.map(m => {
          const isAuto = autoExcluded.has(m);
          const isExcl = finalExcl.has(m);
          if (!isAuto && !_fcManualExcl.has(m)) return '';
          if (isAuto && isExcl)  return `<span style="background:rgba(255,208,64,.12);border:1px solid var(--warn);border-radius:4px;padding:2px 10px;font-size:12px;font-weight:600;color:var(--warn)">${m} ⚠</span>`;
          if (isAuto && !isExcl) return `<span style="background:rgba(80,200,120,.12);border:1px solid var(--income);border-radius:4px;padding:2px 10px;font-size:12px;font-weight:600;color:var(--income)">${m} ✓</span>`;
          return `<span style="background:rgba(240,80,80,.1);border:1px solid var(--expense);border-radius:4px;padding:2px 10px;font-size:12px;font-weight:600;color:var(--expense)">${m} ✕</span>`;
        }).join('')}
      </div>
    </div>` : ''}

    <div class="card" style="padding:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div style="font-size:13px;font-weight:600;color:var(--txt2)">Dettaglio storico mensile</div>
        <div style="font-size:11px;color:var(--txt2)">▶ per vedere le transazioni del mese</div>
      </div>
      <div style="overflow-x:auto">
        <table style="width:100%;font-size:12px;border-collapse:collapse">
          <thead><tr style="color:var(--txt2);border-bottom:1px solid var(--border)">
            <th style="padding:6px 4px;width:24px"></th>
            <th style="padding:6px 8px;text-align:left">Mese</th>
            <th style="padding:6px 8px;text-align:right">Entrate</th>
            <th style="padding:6px 8px;text-align:right">Uscite</th>
            <th style="padding:6px 8px;text-align:right">Flusso netto</th>
            <th style="padding:6px 8px;text-align:right">Saldo stimato</th>
            <th style="padding:6px 8px;text-align:center">Stato</th>
            <th style="padding:6px 8px;text-align:center" title="Escludi mese intero">Escludi</th>
          </tr></thead>
          <tbody>
            ${months.map((m, i) => {
              const isExcl   = finalExcl.has(m);
              const expanded = _fcExpandedMonths.has(m);
              const incDiff  = Math.abs(adjInc[i] - incomes[i]) > 0.005;
              const expDiff  = Math.abs(adjExp[i] - expenses[i]) > 0.005;
              const dispNet  = adjNet[i];
              const monthRow = `<tr id="fcRow-${m}" style="${isExcl?'opacity:.45;':''}border-bottom:${expanded?'none':'1px solid var(--border)'}">
                <td style="padding:5px 4px;text-align:center">
                  <button id="fcExpBtn-${m}" onclick="_fcToggleExpand('${m}')"
                    style="background:none;border:none;cursor:pointer;color:var(--accent);font-size:11px;padding:2px 4px;border-radius:3px"
                    title="Mostra/nascondi transazioni">
                    ${expanded?'▼':'▶'}
                  </button>
                </td>
                <td style="padding:5px 8px;font-weight:600">${m}</td>
                <td style="padding:5px 8px;text-align:right;color:var(--income)">
                  ${fmt.currency(adjInc[i])}
                  ${incDiff ? `<br><span style="font-size:10px;opacity:.6">orig ${fmt.currency(incomes[i])}</span>` : ''}
                </td>
                <td style="padding:5px 8px;text-align:right;color:var(--expense)">
                  ${fmt.currency(adjExp[i])}
                  ${expDiff ? `<br><span style="font-size:10px;opacity:.6">orig ${fmt.currency(expenses[i])}</span>` : ''}
                </td>
                <td style="padding:5px 8px;text-align:right;font-weight:600;color:${dispNet>=0?'var(--income)':'var(--expense)'}">
                  ${dispNet>=0?'+':''}${fmt.currency(dispNet)}
                </td>
                <td style="padding:5px 8px;text-align:right">${fmt.currency(histBal[i])}</td>
                <td style="padding:5px 8px;text-align:center">${_monthStato(m)}</td>
                <td style="padding:5px 8px;text-align:center">
                  <input type="checkbox" ${isExcl?'checked':''} onchange="_fcToggleMonth('${m}',this.checked)"
                    title="${isExcl?'Reintegra mese nel calcolo':'Escludi mese intero dal calcolo'}"
                    style="cursor:pointer;width:14px;height:14px">
                </td>
              </tr>`;
              return monthRow + (expanded ? _fcBuildTxSubrow(m) : '');
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;

  // ── Chart.js ─────────────────────────────────────────────────────────────
  // Salva posizione scroll prima che il re-render sposti la pagina
  const _savedScrollY = window.scrollY || document.documentElement.scrollTop;
  if (_fcChart) { _fcChart.destroy(); _fcChart = null; }

  const allLabels   = [...months, ...projLabels];
  const nHist       = months.length;
  const connPad     = Array(nHist - 1).fill(null);   // null fino al penultimo storico

  // dataset 0: saldo storico (linea grigia, solo passato)
  const dsHist      = [...histBal, ...Array(horizonMonths).fill(null)];
  // dataset 1: banda superiore IC (fill verso dataset 2)
  const dsHigh      = [...connPad, balAtEndOfLastMonth, ...projHigh];
  // dataset 2: banda inferiore IC
  const dsLow       = [...connPad, balAtEndOfLastMonth, ...projLow];
  // dataset 3: saldo previsto (linea tratteggiata accent)
  const dsProj      = [...connPad, balAtEndOfLastMonth, ...projBal];
  // dataset 4: marcatori outlier (triangoli gialli sulla linea storica)
  const dsOutlier   = [...histBal.map((v,i) => isOutlier[i] ? v : null), ...Array(horizonMonths).fill(null)];

  const ctx = document.getElementById('fcChartCanvas').getContext('2d');
  _fcChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: allLabels,
      datasets: [
        { label: 'Saldo storico',
          data: dsHist, borderColor: 'var(--txt2)', borderWidth: 2,
          backgroundColor: 'transparent', pointRadius: 3, tension: 0.3,
          spanGaps: false, fill: false },
        { label: '_ciHigh',
          data: dsHigh, borderColor: 'transparent',
          backgroundColor: 'rgba(120,180,255,0.28)',
          pointRadius: 0, tension: 0.3, spanGaps: false, fill: 2 },
        { label: '_ciLow',
          data: dsLow, borderColor: 'transparent',
          backgroundColor: 'transparent',
          pointRadius: 0, tension: 0.3, spanGaps: false, fill: false },
        { label: 'Saldo previsto',
          data: dsProj, borderColor: 'var(--accent)', borderWidth: 2.5,
          borderDash: [6,4], backgroundColor: 'transparent',
          pointRadius: 3, tension: 0.3, spanGaps: false, fill: false },
        { label: 'Mesi anomali',
          data: dsOutlier, borderColor: 'var(--warn)',
          backgroundColor: 'var(--warn)', pointRadius: 7,
          pointStyle: 'triangle', showLine: false, fill: false },
      ],
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: {
            color: 'var(--txt)',
            filter: item => !item.text.startsWith('_'),
          },
        },
        tooltip: {
          callbacks: {
            label: ctx => {
              if (ctx.dataset.label.startsWith('_')) return null;
              const v = ctx.parsed.y;
              if (v == null) return null;
              return `${ctx.dataset.label}: ${fmt.currency(v)}`;
            },
          },
        },
      },
      scales: {
        x: { ticks: { color:'var(--txt2)', maxTicksLimit:14 }, grid:{ color:'var(--border)' } },
        y: { ticks: { color:'var(--txt2)', callback: v => fmt.currency(v) }, grid:{ color:'var(--border)' } },
      },
    },
  });
  // Ripristina scroll dopo il paint (evita il salto in cima al re-render)
  if (_savedScrollY > 0) requestAnimationFrame(() => window.scrollTo(0, _savedScrollY));
}

// ── Toggle esclusione mese intero ────────────────────────────────────────────
function _fcToggleMonth(ym, excluded) {
  if (excluded) { _fcManualExcl.add(ym);    _fcManualIncl.delete(ym); }
  else          { _fcManualIncl.add(ym);    _fcManualExcl.delete(ym); }
  _fcSetDirty();
}

// ── Toggle espansione mese — DOM manipulation, nessun re-render ──────────────
async function _fcToggleExpand(ym) {
  const btn     = document.getElementById('fcExpBtn-' + ym);
  const mainRow = document.getElementById('fcRow-'   + ym);
  if (!mainRow) return;

  if (_fcExpandedMonths.has(ym)) {
    // ── Collassa ─────────────────────────────────────────────────────────────
    _fcExpandedMonths.delete(ym);
    const subRow = document.getElementById('fcSub-' + ym);
    if (subRow) subRow.remove();
    mainRow.style.borderBottom = '1px solid var(--border)';
    if (btn) btn.textContent = '▶';
  } else {
    // ── Espandi ──────────────────────────────────────────────────────────────
    _fcExpandedMonths.add(ym);
    if (btn) btn.textContent = '▼';
    mainRow.style.borderBottom = 'none';
    // Carica transazioni se non ancora in cache
    if (!_fcMonthTxCache[ym]) {
      if (btn) btn.textContent = '⏳';
      const [y, mo] = ym.split('-');
      const lastDay = new Date(+y, +mo, 0).getDate();
      const txs = await api.getTransactions({ date_from: `${ym}-01`, date_to: `${ym}-${lastDay}`, limit: 5000 });
      _fcMonthTxCache[ym] = (txs || [])
        .filter(t => t.type !== 'transfer')
        .sort((a, b) => Number(b.amount) - Number(a.amount));
      if (btn) btn.textContent = '▼';
    }
    // Inserisci sub-riga dopo la riga principale
    mainRow.insertAdjacentHTML('afterend', _fcBuildTxSubrow(ym));
  }
}

// ── Carica dal DB le transazioni escluse e popola lo stato in memoria ─────────
async function _fcLoadExcludedFromDb() {
  const rows = await api.getForecastExcluded();
  _fcExcludedTxIds = new Set((rows || []).map(r => Number(r.transaction_id)));
  _fcTxAdjustments = {};
  for (const r of (rows || [])) {
    const ym = String(r.ym);
    if (!_fcTxAdjustments[ym]) _fcTxAdjustments[ym] = { incAdj: 0, expAdj: 0 };
    if (r.type === 'income')  _fcTxAdjustments[ym].incAdj += Number(r.amount);
    if (r.type === 'expense') _fcTxAdjustments[ym].expAdj += Number(r.amount);
  }
}

// ── Toggle esclusione singola transazione ─────────────────────────────────────
async function _fcToggleTx(txId, ym, excluded) {
  if (excluded) {
    _fcExcludedTxIds.add(txId);
    await api.addForecastExcluded(txId);
  } else {
    _fcExcludedTxIds.delete(txId);
    await api.removeForecastExcluded(txId);
  }
  // Ricalcola aggiustamento per questo mese dal cache
  const txs = _fcMonthTxCache[ym] || [];
  let incAdj = 0, expAdj = 0;
  for (const tx of txs) {
    if (!_fcExcludedTxIds.has(tx.id)) continue;
    if (tx.type === 'income')  incAdj += Number(tx.amount);
    if (tx.type === 'expense') expAdj += Number(tx.amount);
  }
  _fcTxAdjustments[ym] = { incAdj, expAdj };
  _fcSetDirty();
}

// ── Costruisce HTML sub-tabella transazioni per un mese espanso ──────────────
// Restituisce un <tr id="fcSub-{ym}"> con la lista delle transazioni del mese
function _fcBuildTxSubrow(ym) {
  const txs = _fcMonthTxCache[ym];
  if (!txs || txs.length === 0) {
    const msg = !txs ? 'Caricamento…' : 'Nessuna transazione in questo mese.';
    return `<tr id="fcSub-${ym}"><td colspan="8" style="padding:8px 8px 8px 36px;font-size:11px;color:var(--txt2);background:var(--bg3)">${msg}</td></tr>`;
  }
  const txRows = txs.map(tx => {
    const isExcl = _fcExcludedTxIds.has(tx.id);
    const amtCol = tx.type === 'income' ? 'var(--income)' : 'var(--expense)';
    const sign   = tx.type === 'income' ? '+' : '-';
    return `<tr style="${isExcl?'opacity:.4;':''}border-bottom:1px solid var(--border)">
      <td style="padding:3px 6px;color:var(--txt2);white-space:nowrap">${tx.date}</td>
      <td style="padding:3px 6px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${(tx.description||'').replace(/"/g,'&quot;')}">${tx.description||'—'}</td>
      <td style="padding:3px 6px;color:var(--txt2)">${tx.category_name||'—'}</td>
      <td style="padding:3px 6px;text-align:right;font-weight:600;color:${amtCol}">${sign}${fmt.currency(tx.amount)}</td>
      <td style="padding:3px 6px;text-align:center">
        <input type="checkbox" ${isExcl?'checked':''} onchange="_fcToggleTx(${tx.id},'${ym}',this.checked)"
          title="${isExcl?'Reintegra nel calcolo':'Escludi dal calcolo'}"
          style="cursor:pointer;width:13px;height:13px">
      </td>
    </tr>`;
  }).join('');
  return `<tr id="fcSub-${ym}"><td colspan="8" style="padding:0;background:var(--bg3);border-bottom:1px solid var(--border)">
    <div style="padding:6px 8px 8px 36px">
      <div style="font-size:11px;color:var(--txt2);margin-bottom:5px">
        Transazioni di <strong>${ym}</strong> — spunta per escludere dal calcolo statistico
      </div>
      <div style="overflow-x:auto">
        <table style="width:100%;font-size:11px;border-collapse:collapse">
          <thead><tr style="color:var(--txt2);border-bottom:1px solid var(--border)">
            <th style="padding:3px 6px;text-align:left">Data</th>
            <th style="padding:3px 6px;text-align:left">Descrizione</th>
            <th style="padding:3px 6px;text-align:left">Categoria</th>
            <th style="padding:3px 6px;text-align:right">Importo</th>
            <th style="padding:3px 6px;text-align:center">Escludi</th>
          </tr></thead>
          <tbody>${txRows}</tbody>
        </table>
      </div>
    </div>
  </td></tr>`;
}

// ── Rilevamento outlier IQR ───────────────────────────────────────────────────
// Restituisce array di boolean: true = il valore è anomalo rispetto alla distribuzione
function _fcIqrOutliers(values, k) {
  const pos = values.filter(v => v > 0);
  if (pos.length < 4) return values.map(() => false);
  const sorted = [...pos].sort((a,b) => a - b);
  const q1  = _fcPct(sorted, 25);
  const q3  = _fcPct(sorted, 75);
  const iqr = q3 - q1;
  const hi  = q3 + k * iqr;
  const lo  = Math.max(0, q1 - k * iqr);
  return values.map(v => v > 0 && (v > hi || v < lo));
}

function _fcPct(sorted, p) {
  const idx = (p / 100) * (sorted.length - 1);
  const lo  = Math.floor(idx), hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

// ── Regressione lineare OLS ───────────────────────────────────────────────────
// Restituisce { slope, intercept, r2 } sul vettore y.
// x opzionale: indici personalizzati (es. posizioni calendario reali).
// Se omesso usa 0,1,2,… — slope sarà "per indice", non "per mese calendario".
function _fcLinReg(y, x) {
  const n = y.length;
  if (n < 2) return { slope: 0, intercept: y[0] ?? 0, r2: 0 };
  if (!x) x = y.map((_, i) => i);
  const xMean = x.reduce((a,b) => a+b, 0) / n;
  const yMean = y.reduce((a,b) => a+b, 0) / n;
  const ssXX  = x.reduce((s,v) => s + (v - xMean)**2, 0);
  const ssXY  = x.reduce((s,v,i) => s + (v - xMean)*(y[i] - yMean), 0);
  const slope     = ssXX > 0 ? ssXY / ssXX : 0;
  const intercept = yMean - slope * xMean;
  const ssTot = y.reduce((s,v)   => s + (v - yMean)**2, 0);
  const ssRes = y.reduce((s,v,i) => s + (v - (intercept + slope*x[i]))**2, 0);
  const r2    = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
  return { slope, intercept, r2 };
}

// ── Helper UI ─────────────────────────────────────────────────────────────────
function _fcCard(label, value, color) {
  return `<div class="card" style="padding:14px 16px">
    <div style="font-size:11px;color:var(--txt2);margin-bottom:4px">${label}</div>
    <div style="font-size:16px;font-weight:700;color:${color}">${value}</div>
  </div>`;
}

function _fcRow(label, value, color) {
  return `<tr style="border-bottom:1px solid var(--border)">
    <td style="padding:5px 4px;color:var(--txt2)">${label}</td>
    <td style="padding:5px 4px;text-align:right;font-weight:600${color?';color:'+color:''}">${value}</td>
  </tr>`;
}
