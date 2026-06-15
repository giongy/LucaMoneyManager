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
// histFromYm   = primo mese dello storico (incluso) → fino al mese precedente al corrente
// horizonToYm  = ultimo mese della proiezione (incluso) → mese corrente o successivi
// Valori derivati a runtime via _fcDeriveMonths() — l'utente sceglie le date,
// noi calcoliamo quanti mesi richiedere al backend.
let _fcChart          = null;
let _fcParams         = { histFromYm: null, horizonToYm: null };
let _fcShowNetWorth   = false;       // toggle: previsione patrimonio netto (conti + portfolio + bond)

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

// Dispatcher: renderizza la tab Analytics attiva nel contenitore #analyticsContent.
function _renderCurrentAnalyticsTab() {
  if (_analyticsTab === 'balance')     renderAnalyticsBalance();
  else if (_analyticsTab === 'trend')      renderAnalyticsTrend();
  else if (_analyticsTab === 'health')     renderAnalyticsHealth();
  else if (_analyticsTab === 'forecast')   renderAnalyticsForecast();
  else if (_analyticsTab === 'accbalance') renderAnalyticsAccBalance();
  else if (_analyticsTab === 'nature')     renderNatureReport();
  else renderAnalyticsCatMonth();
}

// Disegna la pagina Analytics: barra delle 7 tab (Salute, Categorie/Mese, Bilancio, Andamento,
// Saldo Conti, Previsione, Natura) + controlli periodo, poi renderizza la tab attiva.
// Gestisce anche la navigazione "pending" arrivata da altre pagine (es. stat-card dashboard).
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

  // Pending nav (es. da stat-card di dashboard): imposta tab + periodo + confronto
  if (_pendingAnalyticsNav) {
    _analyticsTab = _pendingAnalyticsNav.tab || _analyticsTab;
    _analyticsStartYm = _pendingAnalyticsNav.startYm;
    _analyticsEndYm   = _pendingAnalyticsNav.endYm;
    if (_pendingAnalyticsNav.compare != null) _analyticsBalanceCompare = _pendingAnalyticsNav.compare;
    if (_pendingAnalyticsNav.ytd != null)     _analyticsBalanceYtd     = _pendingAnalyticsNav.ytd;
    if (_pendingAnalyticsNav.compareA) _analyticsCompareA = _pendingAnalyticsNav.compareA;
    if (_pendingAnalyticsNav.compareB) _analyticsCompareB = _pendingAnalyticsNav.compareB;
    _pendingAnalyticsNav = null;
  } else {
    _analyticsStartYm = last12 > oldestYm ? last12 : oldestYm;
    if (!_analyticsEndYm) _analyticsEndYm = prevYm;
  }

  // Salva il contesto temporale globale per _renderAnalyticsControls (è una closure)
  _aCtx = { now, oldestYm, maxYm: curYm, prevYm };

  const pg = document.getElementById('pg-analytics');
  pg.innerHTML = `
    <div style="padding:16px 24px 0;display:flex;flex-direction:column;height:100%;overflow:hidden;box-sizing:border-box">
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;flex-shrink:0">
        <button class="sched-tab${_analyticsTab==='health'?' active':''}" data-atab="health" onclick="_setAnalyticsTab('health',this)">💚 Salute Finanziaria</button>
        <button class="sched-tab${_analyticsTab==='catmonth'?' active':''}" data-atab="catmonth" onclick="_setAnalyticsTab('catmonth',this)">🗂️ Categorie / Mese</button>
        <button class="sched-tab${_analyticsTab==='balance'?' active':''}" data-atab="balance" onclick="_setAnalyticsTab('balance',this)">⚖️ Bilancio Mensile</button>
        <button class="sched-tab${_analyticsTab==='trend'?' active':''}" data-atab="trend" onclick="_setAnalyticsTab('trend',this)">📈 Andamento Categoria</button>
        <button class="sched-tab${_analyticsTab==='accbalance'?' active':''}" data-atab="accbalance" onclick="_setAnalyticsTab('accbalance',this)">🏦 Saldo Conti</button>
        <button class="sched-tab${_analyticsTab==='forecast'?' active':''}" data-atab="forecast" onclick="_setAnalyticsTab('forecast',this)">📊 Previsione Saldo</button>
        <button class="sched-tab${_analyticsTab==='nature'?' active':''}" data-atab="nature" onclick="_setAnalyticsTab('nature',this)">🌿 Natura Spese</button>
      </div>
      <div id="aDateControls" style="${_analyticsTab==='forecast'?'display:none':'display:flex'};gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px;padding:8px 10px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;flex-shrink:0"></div>
      <div id="analyticsContent" style="flex:1;overflow:auto;padding-bottom:16px"></div>
    </div>`;

  _renderAnalyticsControls();
  _renderCurrentAnalyticsTab();
}

// Contesto temporale condiviso (calcolato in renderAnalytics, riutilizzato in _renderAnalyticsControls)
let _aCtx = null;

// Helper: scompone YYYY-MM in {y, m}
const _parseYm = ym => ({ y: parseInt(ym.slice(0,4)), m: parseInt(ym.slice(5,7)) });
const _fmtYm   = (y, m) => `${y}-${String(m).padStart(2,'0')}`;

// Disegna la barra controlli periodo (select da/a mese-anno, scorciatoie) sopra le tab Analytics.
function _renderAnalyticsControls() {
  const wrap = document.getElementById('aDateControls');
  if (!wrap || !_aCtx) return;
  const { now, oldestYm, maxYm, prevYm } = _aCtx;

  // Modalità confronto attiva solo per Bilancio Mensile
  const inCompareMode = _analyticsTab === 'balance' && _analyticsBalanceCompare;

  wrap.style.display = _analyticsTab === 'forecast' ? 'none' : 'flex';

  // Bottoni "⚖ Confronta" + "📅 YTD" — visibili solo su tab Bilancio Mensile
  // YTD ha senso solo in confronto: nella vista singola il mese corrente è già parziale
  // (non esistono transazioni future), quindi troncarlo non cambia nulla. Disabilitato
  // finché Confronta non è attivo.
  const ytdDisabled = !_analyticsBalanceCompare;
  const cmpBtn = _analyticsTab === 'balance'
    ? `<button class="btn btn-xs ${_analyticsBalanceCompare?'btn-primary':'btn-ghost'}" id="aBalanceCompareBtn"
              onclick="_toggleBalanceCompare()" title="Confronta due periodi">⚖ Confronta</button>
       <button class="btn btn-xs ${_analyticsBalanceYtd&&!ytdDisabled?'btn-primary':'btn-ghost'}" id="aBalanceYtdBtn"
              ${ytdDisabled?'disabled':''} onclick="_toggleBalanceYtd()"
              title="${ytdDisabled?'Disponibile solo in modalità Confronta: allinea il mese corrente al giorno odierno per un paragone equo col periodo storico':'Tronca l\'ultimo mese al giorno odierno (confronto onesto se il mese corrente è incompleto)'}">📅 YTD</button>
       <div style="width:1px;height:16px;background:var(--border);margin:0 2px"></div>` : '';

  if (!inCompareMode) {
    // Modalità singolo periodo (default per tutti i tab)
    let sYm = _parseYm(_analyticsStartYm), eYm = _parseYm(_analyticsEndYm);
    wrap.innerHTML = `
      ${cmpBtn}
      <button class="btn btn-xs btn-ghost" id="aPreset6m">6 mesi</button>
      <button class="btn btn-xs btn-ghost" id="aPreset12m">12 mesi</button>
      <button class="btn btn-xs btn-ghost" id="aPresetYtd">Anno</button>
      <div style="width:1px;height:16px;background:var(--border);margin:0 2px"></div>
      <label style="font-size:13px;color:var(--txt2)">Da:</label>
      <select id="aStartY" class="form-control" style="font-size:12px;padding:3px 8px;width:72px">${_buildYearOptions(oldestYm, maxYm, sYm.y)}</select>
      <select id="aStartM" class="form-control" style="font-size:12px;padding:3px 8px;width:60px">${_buildMonthsForYear(sYm.y, oldestYm, maxYm, sYm.m)}</select>
      <label style="font-size:13px;color:var(--txt2)">A:</label>
      <select id="aEndY" class="form-control" style="font-size:12px;padding:3px 8px;width:72px">${_buildYearOptions(_analyticsStartYm, maxYm, eYm.y)}</select>
      <select id="aEndM" class="form-control" style="font-size:12px;padding:3px 8px;width:60px">${_buildMonthsForYear(eYm.y, _analyticsStartYm, maxYm, eYm.m)}</select>`;

    const rebuildEndSelects = () => {
      eYm = _parseYm(_analyticsEndYm);
      document.getElementById('aEndY').innerHTML = _buildYearOptions(_analyticsStartYm, maxYm, eYm.y);
      document.getElementById('aEndM').innerHTML = _buildMonthsForYear(eYm.y, _analyticsStartYm, maxYm, eYm.m);
    };

    document.getElementById('aStartY').onchange = function() {
      sYm.y = parseInt(this.value);
      const p = _parseYm(oldestYm), q = _parseYm(maxYm);
      const mFrom = sYm.y === p.y ? p.m : 1, mTo = sYm.y === q.y ? q.m : 12;
      sYm.m = Math.min(Math.max(sYm.m, mFrom), mTo);
      document.getElementById('aStartM').innerHTML = _buildMonthsForYear(sYm.y, oldestYm, maxYm, sYm.m);
      _analyticsStartYm = _fmtYm(sYm.y, sYm.m);
      if (_analyticsEndYm < _analyticsStartYm) { _analyticsEndYm = _analyticsStartYm; eYm = {...sYm}; }
      rebuildEndSelects();
      _renderCurrentAnalyticsTab();
    };
    document.getElementById('aStartM').onchange = function() {
      sYm.m = parseInt(this.value);
      _analyticsStartYm = _fmtYm(sYm.y, sYm.m);
      if (_analyticsEndYm < _analyticsStartYm) { _analyticsEndYm = _analyticsStartYm; eYm = {...sYm}; }
      rebuildEndSelects();
      _renderCurrentAnalyticsTab();
    };
    document.getElementById('aEndY').onchange = function() {
      eYm.y = parseInt(this.value);
      const p = _parseYm(_analyticsStartYm), q = _parseYm(maxYm);
      const mFrom = eYm.y === p.y ? p.m : 1, mTo = eYm.y === q.y ? q.m : 12;
      eYm.m = Math.min(Math.max(eYm.m, mFrom), mTo);
      document.getElementById('aEndM').innerHTML = _buildMonthsForYear(eYm.y, _analyticsStartYm, maxYm, eYm.m);
      _analyticsEndYm = _fmtYm(eYm.y, eYm.m);
      _renderCurrentAnalyticsTab();
    };
    document.getElementById('aEndM').onchange = function() {
      eYm.y = parseInt(document.getElementById('aEndY').value);
      eYm.m = parseInt(this.value);
      _analyticsEndYm = _fmtYm(eYm.y, eYm.m);
      _renderCurrentAnalyticsTab();
    };

    const applyPreset = (startYm) => {
      _analyticsStartYm = startYm < oldestYm ? oldestYm : startYm;
      _analyticsEndYm   = prevYm;
      _renderAnalyticsControls();
      _renderCurrentAnalyticsTab();
    };
    const ymFromDate = d => _fmtYm(d.getFullYear(), d.getMonth()+1);
    document.getElementById('aPreset6m').onclick  = () => applyPreset(ymFromDate(new Date(now.getFullYear(), now.getMonth()-6, 1)));
    document.getElementById('aPreset12m').onclick = () => applyPreset(ymFromDate(new Date(now.getFullYear(), now.getMonth()-12, 1)));
    document.getElementById('aPresetYtd').onclick = () => applyPreset(_fmtYm(now.getFullYear(), 1));
  } else {
    // Modalità confronto: due periodi A vs B
    const A = _analyticsCompareA || { startYm: _analyticsStartYm, endYm: _analyticsEndYm };
    const B = _analyticsCompareB || { startYm: _shiftYmByYears(_analyticsStartYm,-1), endYm: _shiftYmByYears(_analyticsEndYm,-1) };
    _analyticsCompareA = A; _analyticsCompareB = B;
    const aS = _parseYm(A.startYm), aE = _parseYm(A.endYm);
    const bS = _parseYm(B.startYm), bE = _parseYm(B.endYm);
    const oldestY = parseInt(oldestYm.slice(0,4));
    const maxY = parseInt(maxYm.slice(0,4));
    const yearOpts = (sel) => { let h=''; for (let y=oldestY; y<=maxY; y++) h+=`<option value="${y}"${y===sel?' selected':''}>${y}</option>`; return h; };
    const monthOpts = (sel) => _MONTHS_IT.map((n,i)=>`<option value="${i+1}"${i+1===sel?' selected':''}>${n}</option>`).join('');

    wrap.innerHTML = `
      ${cmpBtn}
      <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
        <div style="display:flex;gap:4px;align-items:center;background:rgba(106,183,255,.10);border:1px solid rgba(106,183,255,.35);padding:4px 8px;border-radius:6px">
          <span style="font-size:12px;font-weight:600;color:var(--accent)">Periodo A</span>
          <label style="font-size:12px;color:var(--txt2)">Da</label>
          <select id="aCompAStartY" class="form-control" style="font-size:12px;padding:3px 6px;width:68px">${yearOpts(aS.y)}</select>
          <select id="aCompAStartM" class="form-control" style="font-size:12px;padding:3px 6px;width:56px">${monthOpts(aS.m)}</select>
          <label style="font-size:12px;color:var(--txt2)">A</label>
          <select id="aCompAEndY" class="form-control" style="font-size:12px;padding:3px 6px;width:68px">${yearOpts(aE.y)}</select>
          <select id="aCompAEndM" class="form-control" style="font-size:12px;padding:3px 6px;width:56px">${monthOpts(aE.m)}</select>
        </div>
        <span style="color:var(--txt3);font-weight:700">vs</span>
        <div style="display:flex;gap:4px;align-items:center;background:rgba(188,140,255,.10);border:1px solid rgba(188,140,255,.35);padding:4px 8px;border-radius:6px">
          <span style="font-size:12px;font-weight:600;color:#bc8cff">Periodo B</span>
          <label style="font-size:12px;color:var(--txt2)">Da</label>
          <select id="aCompBStartY" class="form-control" style="font-size:12px;padding:3px 6px;width:68px">${yearOpts(bS.y)}</select>
          <select id="aCompBStartM" class="form-control" style="font-size:12px;padding:3px 6px;width:56px">${monthOpts(bS.m)}</select>
          <label style="font-size:12px;color:var(--txt2)">A</label>
          <select id="aCompBEndY" class="form-control" style="font-size:12px;padding:3px 6px;width:68px">${yearOpts(bE.y)}</select>
          <select id="aCompBEndM" class="form-control" style="font-size:12px;padding:3px 6px;width:56px">${monthOpts(bE.m)}</select>
        </div>
      </div>`;

    const onChange = () => {
      const aSy = parseInt(document.getElementById('aCompAStartY').value);
      const aSm = parseInt(document.getElementById('aCompAStartM').value);
      const aEy = parseInt(document.getElementById('aCompAEndY').value);
      const aEm = parseInt(document.getElementById('aCompAEndM').value);
      const bSy = parseInt(document.getElementById('aCompBStartY').value);
      const bSm = parseInt(document.getElementById('aCompBStartM').value);
      const bEy = parseInt(document.getElementById('aCompBEndY').value);
      const bEm = parseInt(document.getElementById('aCompBEndM').value);
      _analyticsCompareA = { startYm: _fmtYm(aSy, aSm), endYm: _fmtYm(aEy, aEm) };
      _analyticsCompareB = { startYm: _fmtYm(bSy, bSm), endYm: _fmtYm(bEy, bEm) };
      // Clamp se start > end
      if (_analyticsCompareA.endYm < _analyticsCompareA.startYm) _analyticsCompareA.endYm = _analyticsCompareA.startYm;
      if (_analyticsCompareB.endYm < _analyticsCompareB.startYm) _analyticsCompareB.endYm = _analyticsCompareB.startYm;
      renderAnalyticsBalance();
    };
    ['aCompAStartY','aCompAStartM','aCompAEndY','aCompAEndM',
     'aCompBStartY','aCompBStartM','aCompBEndY','aCompBEndM'].forEach(id => {
      document.getElementById(id).onchange = onChange;
    });
  }
}

let _analyticsTab = 'health';
let _analyticsBalanceCompare = false; // se true: modalità confronto Bilancio Mensile (Periodo A vs Periodo B)
let _analyticsBalanceYtd = false;     // se true: tronca l'ultimo mese al giorno odierno (sia A sia B)
let _analyticsCompareA = null;        // { startYm, endYm } — periodo principale
let _analyticsCompareB = null;        // { startYm, endYm } — periodo di confronto

// Helper: shift YYYY-MM by N anni
function _shiftYmByYears(ym, yearDelta) {
  const y = parseInt(ym.slice(0,4)) + yearDelta;
  return `${y}-${ym.slice(5,7)}`;
}

// Attiva/disattiva il troncamento YTD (ultimo mese fino a oggi) nel Bilancio Mensile.
window._toggleBalanceYtd = () => {
  _analyticsBalanceYtd = !_analyticsBalanceYtd;
  _renderAnalyticsControls();
  renderAnalyticsBalance();
};

// Cambia la tab Analytics attiva, aggiorna i controlli periodo e renderizza la tab.
window._setAnalyticsTab = (tab, btn) => {
  _analyticsTab = tab;
  document.querySelectorAll('[data-atab]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  _renderAnalyticsControls();
  if (tab === 'catmonth')   renderAnalyticsCatMonth();
  if (tab === 'balance')    renderAnalyticsBalance();
  if (tab === 'trend')      renderAnalyticsTrend();
  if (tab === 'health')     renderAnalyticsHealth();
  if (tab === 'forecast')   renderAnalyticsForecast();
  if (tab === 'accbalance') renderAnalyticsAccBalance();
  if (tab === 'nature')     renderNatureReport();
};

// Attiva/disattiva la modalità confronto nel Bilancio: periodo A vs B (default B = A −1 anno).
window._toggleBalanceCompare = () => {
  _analyticsBalanceCompare = !_analyticsBalanceCompare;
  if (_analyticsBalanceCompare) {
    // Inizializza A = periodo corrente, B = stesso periodo anno precedente
    _analyticsCompareA = { startYm: _analyticsStartYm, endYm: _analyticsEndYm };
    _analyticsCompareB = {
      startYm: _shiftYmByYears(_analyticsStartYm, -1),
      endYm:   _shiftYmByYears(_analyticsEndYm,   -1),
    };
  } else {
    // YTD ha senso solo in confronto: spegnendo Confronta si disattiva anche YTD,
    // così non resta "attivo ma disabilitato".
    _analyticsBalanceYtd = false;
  }
  _renderAnalyticsControls();
  renderAnalyticsBalance();
};

// Pending nav payload: usato per portare periodo + tab da altre pagine senza farsi
// sovrascrivere dal reset di startYm in renderAnalytics().
let _pendingAnalyticsNav = null;

// Naviga al Bilancio Mensile in modalità confronto YTD su un periodo (da stat-card dashboard).
window.navigateToBalanceCompare = (startYm, endYm) => {
  _pendingAnalyticsNav = {
    tab: 'balance', startYm, endYm, compare: true, ytd: true,
    compareA: { startYm, endYm },
    compareB: { startYm: _shiftYmByYears(startYm,-1), endYm: _shiftYmByYears(endYm,-1) },
  };
  navigate('analytics');
};

let _analyticsCatSort = { col: null, dir: -1 };
let _analyticsCatCache = null;

// Tab "Categorie / Mese": carica la tabella pivot categoria×mese e la renderizza.
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

// Ordina la tabella Categorie/Mese per la colonna scelta e ridisegna.
window._sortAnalyticsCat = col => {
  if (_analyticsCatSort.col === col) _analyticsCatSort.dir *= -1;
  else { _analyticsCatSort.col = col; _analyticsCatSort.dir = -1; }
  _renderAnalyticsCatTable();
};

// Disegna la tabella pivot Categorie×Mese (con totali, ordinamento e colori) da _analyticsCatCache.
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

// Se YTD attivo: tronca i totali dell'ultimo mese al giorno odierno (in-place + ricalcolo balances).
//
// `force` (usato nel confronto): se true tronca l'ultimo mese qualunque sia, perché il
// chiamante ha già stabilito che il confronto coinvolge il mese in corso e i due periodi
// vanno troncati allo stesso giorno (es. giu 2026 parziale vs giu 2025 → entrambi 1–13).
// Se false (vista singola) tronca SOLO se l'ultimo mese è davvero quello corrente: troncare
// un mese passato (range gen–mag a giugno) ai primi giorni falserebbe i dati.
async function _applyYtdTruncation(cols, incomes, expenses, balances, force = false) {
  if (!_analyticsBalanceYtd || !cols.length) return;
  const today = new Date();
  const curYm = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
  const i = cols.length - 1;
  const ym = cols[i].ym;
  if (!force && ym !== curYm) return;   // vista singola: ultimo mese non corrente → dati pieni
  const day = String(today.getDate()).padStart(2,'0');
  const stats = await api.getStatsByDateRange(`${ym}-01`, `${ym}-${day}`);
  incomes[i]  = Number(stats.income)   || 0;
  expenses[i] = Number(stats.expenses) || 0;
  balances[i] = incomes[i] - expenses[i];
}

// Costruisce array di month-cols { ym, label } per un periodo
// Costruisce l'array di colonne mese {ym, label} nell'intervallo [startYm, endYm] inclusi.
function _buildMonthCols(startYm, endYm) {
  const cols = [];
  if (!startYm || !endYm || endYm < startYm) return cols;
  let d = new Date(startYm + '-01');
  const end = new Date(endYm + '-01');
  while (d <= end) {
    const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    cols.push({ ym, label: d.toLocaleDateString('it-IT', { month:'short', year:'2-digit' }) });
    d = new Date(d.getFullYear(), d.getMonth()+1, 1);
  }
  return cols;
}

// Tab "Bilancio Mensile": entrate/uscite/saldo per mese, con eventuale confronto A vs B e YTD.
// Instrada alla vista singola o di confronto in base allo stato.
async function renderAnalyticsBalance() {
  const el = document.getElementById('analyticsContent');
  if (!el) return;
  el.innerHTML = '<p style="padding:20px;color:var(--text2)">Caricamento…</p>';

  const compare = _analyticsBalanceCompare;
  const cc = chartColors();

  if (!compare) {
    return _renderAnalyticsBalanceSingle();
  }

  // ── Modalità confronto Periodo A vs Periodo B ───────────────────────────
  const A = _analyticsCompareA, B = _analyticsCompareB;
  const colsA = _buildMonthCols(A.startYm, A.endYm);
  const colsB = _buildMonthCols(B.startYm, B.endYm);

  // Fetch abbastanza mesi per coprire entrambi i periodi
  const oldestStart = (A.startYm < B.startYm ? A.startYm : B.startYm);
  const now = new Date();
  const oldestStartDate = new Date(oldestStart + '-01');
  const fetchMonths = Math.max(1,
    (now.getFullYear() - oldestStartDate.getFullYear()) * 12 +
    (now.getMonth()    - oldestStartDate.getMonth())    + 1);
  const rows = await api.getMonthlyBalance(fetchMonths);
  const byYm = {};
  for (const r of rows) byYm[r.ym] = r;

  const incA = colsA.map(m => byYm[m.ym]?.income  || 0);
  const expA = colsA.map(m => byYm[m.ym]?.expense || 0);
  const balA = colsA.map((_, i) => incA[i] - expA[i]);

  const incB = colsB.map(m => byYm[m.ym]?.income  || 0);
  const expB = colsB.map(m => byYm[m.ym]?.expense || 0);
  const balB = colsB.map((_, i) => incB[i] - expB[i]);

  // YTD: tronca l'ultimo mese di ENTRAMBI i periodi allo stesso giorno odierno, ma solo
  // se il periodo A (di norma quello corrente) termina nel mese in corso. Così il paragone
  // è equo (primi N giorni vs primi N giorni); se A finisce in un mese passato non si tronca.
  const _now = new Date();
  const _curYm = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,'0')}`;
  const _truncCompare = colsA.length && colsA[colsA.length-1].ym === _curYm;
  await Promise.all([
    _applyYtdTruncation(colsA, incA, expA, balA, _truncCompare),
    _applyYtdTruncation(colsB, incB, expB, balB, _truncCompare),
  ]);

  let cuA = 0; const cumA = balA.map(b => (cuA += b));
  let cuB = 0; const cumB = balB.map(b => (cuB += b));

  // Posizioni allineate (max delle due lunghezze)
  const N = Math.max(colsA.length, colsB.length);
  const at = (arr, i) => i < arr.length ? arr[i] : null;

  // Etichette x-axis: nome del mese del Periodo A (fallback su B se A non copre quella posizione)
  const labels = Array.from({length:N}, (_, i) => colsA[i]?.label || colsB[i]?.label || `Mese ${i+1}`);

  const dPct = (a, b) => b ? ((a - b) / Math.abs(b)) * 100 : null;
  const pctTd = (pct, isGoodPositive=true) => {
    if (pct == null) return `<td class="text-right" style="color:var(--txt3)">—</td>`;
    const good = isGoodPositive ? pct >= 0 : pct <= 0;
    const col = good ? 'var(--income)' : 'var(--expense)';
    const sign = pct >= 0 ? '+' : '';
    return `<td class="text-right" style="color:${col};font-weight:600">${sign}${pct.toFixed(1)}%</td>`;
  };

  // Header info: range dei due periodi
  const totIncA = incA.reduce((a,b)=>a+b,0), totExpA = expA.reduce((a,b)=>a+b,0);
  const totBalA = totIncA - totExpA;
  const totIncB = incB.reduce((a,b)=>a+b,0), totExpB = expB.reduce((a,b)=>a+b,0);
  const totBalB = totIncB - totExpB;
  const totDelta = dPct(totBalA, totBalB);

  const labelA = colsA.length ? `${colsA[0].label} → ${colsA[colsA.length-1].label}` : '—';
  const labelB = colsB.length ? `${colsB[0].label} → ${colsB[colsB.length-1].label}` : '—';

  el.innerHTML = `
    <div style="display:flex;gap:14px;margin-bottom:14px;flex-wrap:wrap">
      <div style="flex:1;min-width:260px;padding:10px 14px;background:rgba(106,183,255,.10);border:1px solid rgba(106,183,255,.35);border-radius:8px">
        <div style="font-size:11px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">Periodo A · ${labelA}</div>
        <div style="display:flex;gap:18px;flex-wrap:wrap;align-items:baseline">
          <div><span style="color:var(--txt3);font-size:11px">Entrate</span> <b style="color:var(--income)">${fmt.currency(totIncA)}</b></div>
          <div><span style="color:var(--txt3);font-size:11px">Uscite</span>  <b style="color:var(--expense)">${fmt.currency(totExpA)}</b></div>
          <div><span style="color:var(--txt3);font-size:11px">Saldo</span>   <b style="color:${totBalA>=0?'var(--income)':'var(--expense)'}">${fmt.currency(totBalA)}</b></div>
        </div>
      </div>
      <div style="flex:1;min-width:260px;padding:10px 14px;background:rgba(188,140,255,.10);border:1px solid rgba(188,140,255,.35);border-radius:8px">
        <div style="font-size:11px;font-weight:700;color:#bc8cff;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">Periodo B · ${labelB}</div>
        <div style="display:flex;gap:18px;flex-wrap:wrap;align-items:baseline">
          <div><span style="color:var(--txt3);font-size:11px">Entrate</span> <b style="color:var(--income)">${fmt.currency(totIncB)}</b></div>
          <div><span style="color:var(--txt3);font-size:11px">Uscite</span>  <b style="color:var(--expense)">${fmt.currency(totExpB)}</b></div>
          <div><span style="color:var(--txt3);font-size:11px">Saldo</span>   <b style="color:${totBalB>=0?'var(--income)':'var(--expense)'}">${fmt.currency(totBalB)}</b></div>
        </div>
      </div>
      <div style="min-width:160px;padding:10px 14px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;display:flex;flex-direction:column;justify-content:center">
        <div style="font-size:11px;color:var(--txt3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">Δ Saldo (A vs B)</div>
        <div style="font-size:20px;font-weight:700;color:${totBalA-totBalB>=0?'var(--income)':'var(--expense)'}">${(totBalA-totBalB)>=0?'+':''}${fmt.currency(totBalA-totBalB)}</div>
        <div style="font-size:12px;color:${totDelta!=null&&totDelta>=0?'var(--income)':'var(--expense)'}">${totDelta!=null?`${totDelta>=0?'+':''}${totDelta.toFixed(1)}%`:'—'}</div>
      </div>
    </div>

    <div style="height:380px;margin-bottom:20px"><canvas id="balanceChart"></canvas></div>

    <table class="analytics-table">
      <thead><tr>
        <th>#</th>
        <th>Mese A</th><th class="text-right">Saldo A</th>
        <th style="background:rgba(188,140,255,.07)">Mese B</th>
        <th class="text-right" style="background:rgba(188,140,255,.07)">Saldo B</th>
        <th class="text-right">Δ Saldo</th>
        <th class="text-right">Δ %</th>
      </tr></thead>
      <tbody>
        ${Array.from({length:N}, (_, i) => {
          const lA = colsA[i]?.label || '—', lB = colsB[i]?.label || '—';
          const sA = at(balA,i), sB = at(balB,i);
          const dlt = (sA!=null && sB!=null) ? sA-sB : null;
          const dltPct = dPct(sA, sB);
          const sACol = sA==null ? 'var(--txt3)' : sA>=0?'var(--income)':'var(--expense)';
          const sBCol = sB==null ? 'var(--txt3)' : sB>=0?'var(--income)':'var(--expense)';
          const bBg = 'background:rgba(188,140,255,.05)';
          return `<tr>
            <td style="color:var(--txt3)">${i+1}</td>
            <td>${lA}</td>
            <td class="text-right" style="color:${sACol};font-weight:600">${sA!=null?fmt.currency(sA):'—'}</td>
            <td style="color:var(--txt2);${bBg}">${lB}</td>
            <td class="text-right" style="color:${sBCol};opacity:.85;${bBg}">${sB!=null?fmt.currency(sB):'—'}</td>
            <td class="text-right" style="color:${dlt==null?'var(--txt3)':dlt>=0?'var(--income)':'var(--expense)'};font-weight:600">${dlt!=null?(dlt>=0?'+':'')+fmt.currency(dlt):'—'}</td>
            ${pctTd(dltPct, true)}
          </tr>`;
        }).join('')}
        <tr class="analytics-subtotal">
          <td></td>
          <td>Totale A</td>
          <td class="text-right" style="font-weight:700;color:${totBalA>=0?'var(--income)':'var(--expense)'}">${fmt.currency(totBalA)}</td>
          <td style="background:rgba(188,140,255,.07)">Totale B</td>
          <td class="text-right" style="font-weight:700;color:${totBalB>=0?'var(--income)':'var(--expense)'};opacity:.85;background:rgba(188,140,255,.07)">${fmt.currency(totBalB)}</td>
          <td class="text-right" style="font-weight:700;color:${totBalA-totBalB>=0?'var(--income)':'var(--expense)'}">${(totBalA-totBalB)>=0?'+':''}${fmt.currency(totBalA-totBalB)}</td>
          ${pctTd(totDelta, true)}
        </tr>
      </tbody>
    </table>`;

  const pad = (arr) => Array.from({length:N}, (_, i) => at(arr, i));
  // 4 barre (Entrate A/B, Uscite A/B) raggruppate side-by-side per posizione, + 2 linee Saldo
  const datasets = [
    { type:'bar', label:'Entrate A', data:pad(incA), backgroundColor:'rgba(63,185,80,.85)',
      borderColor:'rgba(63,185,80,1)', borderWidth:1, order:5 },
    { type:'bar', label:'Entrate B', data:pad(incB), backgroundColor:'rgba(63,185,80,.30)',
      borderColor:'rgba(63,185,80,.7)', borderWidth:1, borderDash:[4,3], order:5 },
    { type:'bar', label:'Uscite A',  data:pad(expA), backgroundColor:'rgba(248,81,73,.85)',
      borderColor:'rgba(248,81,73,1)', borderWidth:1, order:5 },
    { type:'bar', label:'Uscite B',  data:pad(expB), backgroundColor:'rgba(248,81,73,.30)',
      borderColor:'rgba(248,81,73,.7)', borderWidth:1, borderDash:[4,3], order:5 },
    { type:'line', label:'Saldo A', data:pad(balA),
      borderColor:'#58a6ff', backgroundColor:'transparent',
      pointRadius:3, tension:.3, borderWidth:2.5, order:1 },
    { type:'line', label:'Saldo B', data:pad(balB),
      borderColor:'#58a6ff', backgroundColor:'transparent',
      borderDash:[6,4], pointRadius:2, tension:.3, borderWidth:1.5, order:2 },
  ];

  if (_analyticsBalanceChart) { _analyticsBalanceChart.destroy(); _analyticsBalanceChart = null; }
  _analyticsBalanceChart = new Chart(document.getElementById('balanceChart'), {
    data: { labels, datasets },
    options: {
      responsive:true, maintainAspectRatio:false,
      interaction:{ mode:'index', intersect:false },
      plugins:{
        tooltip:{
          callbacks:{
            title: items => {
              const i = items[0].dataIndex;
              const lA = colsA[i]?.label || '—', lB = colsB[i]?.label || '—';
              return `Posizione ${i+1} · A: ${lA} · B: ${lB}`;
            },
            label: ctx => ` ${ctx.dataset.label}: ${fmt.currency(ctx.parsed.y)}`,
          }
        },
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

// Vista Bilancio "singola" (senza confronto): grafico + tabella entrate/uscite/saldo per mese.
async function _renderAnalyticsBalanceSingle() {
  const el = document.getElementById('analyticsContent');
  if (!el) return;
  const { fetchMonths, monthCols } = _analyticsMonthRange();
  const rows = await api.getMonthlyBalance(fetchMonths);
  const byYm = {};
  for (const r of rows) byYm[r.ym] = r;

  const incomes  = monthCols.map(m => byYm[m.ym]?.income  || 0);
  const expenses = monthCols.map(m => byYm[m.ym]?.expense || 0);
  const balances = monthCols.map((_, i) => incomes[i] - expenses[i]);

  // YTD: tronca ultimo mese al giorno odierno
  await _applyYtdTruncation(monthCols, incomes, expenses, balances);

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
let _healthIncChart  = null;
let _healthVolChart  = null;

// ── Previsione Saldo nel contesto Analytics ───────────────────────────────────
// Tab "Previsione Saldo": delega al motore Previsione Saldo (sezione _fc* più in basso).
async function renderAnalyticsForecast() {
  const el = document.getElementById('analyticsContent');
  if (!el) return;
  // Inizializza default con il primo mese disponibile in DB (caricato a livello Analytics)
  _fcInitDefaults(_analyticsOldestYm);
  el.innerHTML = _fcControlsHtml() + `<div id="fcOutput"></div>`;
  _fcBindControls();
  await _runForecastSaldo();
}

// Tab "Salute Finanziaria": score 0-100 (via utils.computeHealthScore) con dettaglio di tutte
// le componenti (tasso risparmio, mesi positivi, riserva, trend, stabilità entrate) e spiegazioni.
async function renderAnalyticsHealth() {
  const el = document.getElementById('analyticsContent');
  if (!el) return;
  el.innerHTML = '<p style="padding:20px;color:var(--txt2)">Caricamento…</p>';

  const { fetchMonths, monthCols } = _analyticsMonthRange();
  const [balRowsRaw, accounts] = await Promise.all([
    api.getMonthlyBalance(fetchMonths),
    api.getAccounts(),
  ]);

  // Allinea i dati ai mesi selezionati dall'utente
  const byYm = {};
  for (const r of balRowsRaw) byYm[r.ym] = r;
  const aligned = monthCols.map(m => ({
    ym: m.ym,
    income:  byYm[m.ym]?.income  || 0,
    expense: byYm[m.ym]?.expense || 0,
  }));

  // ── Score salute via funzione condivisa (utils.js) ───────────────────────
  // Destructuring di tutti gli intermedi necessari per il rendering downstream
  const {
    incomes, expenses, savings, n,
    totalIncome, totalExpense, totalSavings, avgSavingsRate,
    scoreSavings, scorePos, scoreRunway, scoreIncTrend, scoreVol,
    score, scoreColor, scoreLabel,
    posMonths, posPct, roll3Pos, roll3Total, roll3Pct,
    expMedian, cashBalance, investBalance, reserveBalance, liquidAccs, investAccs, runwayMonths, investHaircut,
    incMedian, savSlope, savSlopePct, savMedFirst, savMedSecond, trendHalf,
    incStddev, incCV,
  } = computeHealthScore(aligned, accounts);

  const cc = chartColors();

  // ── Colori badge componenti ───────────────────────────────────────────────
  const colS = scoreSavings >= 33 ? 'var(--income)' : scoreSavings >= 18 ? '#e8a838' : 'var(--expense)';
  const colP = scorePos >= 11 ? 'var(--income)' : scorePos >= 5 ? '#e8a838' : 'var(--expense)';
  const colR = scoreRunway >= 10 ? 'var(--income)' : scoreRunway >= 6 ? '#e8a838' : 'var(--expense)';
  const colI = scoreIncTrend >= 13 ? 'var(--income)' : scoreIncTrend >= 6 ? '#e8a838' : 'var(--expense)';
  const colV = scoreVol >= 7 ? 'var(--income)' : scoreVol >= 4 ? '#e8a838' : 'var(--expense)';

  // ── Dati grafici dettaglio ────────────────────────────────────────────────
  const monthlyRates = monthCols.map((_,i) => incomes[i] > 0 ? +(savings[i] / incomes[i] * 100).toFixed(2) : 0);
  const savRegLine   = monthCols.map((_,i) => i < trendHalf ? savMedFirst : savMedSecond);
  const labels       = monthCols.map(m => m.label);

  // Runway display + posizione marker (clamp visivo a 0..12 mesi)
  const runwayDisplay = !isFinite(runwayMonths) || runwayMonths >= 99 ? '99+' : runwayMonths.toFixed(1);
  const runwayClamped = Math.max(0, Math.min(12, isFinite(runwayMonths) ? runwayMonths : 12));
  const runwayPos     = (runwayClamped / 12) * 100;

  // ── HTML ──────────────────────────────────────────────────────────────────
  el.innerHTML = `
    <div id="healthReport" style="padding-bottom:24px">

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
              desc:  `Quota media di entrate risparmiata negli ultimi ${n} mesi. ≥20% = eccellente (46 pt) · ≥15% = ottimo · ≥10% = buono · ≥5% = sufficiente · ≤3% = scarso · =0% = nullo · <0% = penalità (fino a −23 pt).`,
              got: scoreSavings, max: 46,
              detail: `${avgSavingsRate.toFixed(1)}% medio → ${scoreSavings}/46 pt`,
              col: scoreSavings>=33?'var(--income)':scoreSavings>=18?'#e8a838':'var(--expense)'
            },
            {
              label: 'Stabilità mensile',
              desc:  `Quota di finestre mobili di 3 mesi chiuse in positivo (somma risparmio &gt; 0). Usare 3 mesi invece del singolo mese evita che una grossa spesa annuale pianificata (tasse, assicurazione) conti come "fallimento" se i mesi vicini la assorbono. 100% = ottimo · ≥75% = buono · &lt;40% = attenzione.`,
              got: scorePos, max: 14,
              detail: `${roll3Pos}/${roll3Total} finestre di 3 mesi positive (${(roll3Pct*100).toFixed(0)}%) → ${scorePos}/14 pt`,
              col: scorePos>=11?'var(--income)':scorePos>=5?'#e8a838':'var(--expense)'
            },
            {
              label: 'Riserva di emergenza',
              desc:  `Mesi di vita coperti dalla riserva disponibile — liquidità (conti non-investimento) più investimenti scontati al ${(investHaircut*100).toFixed(0)}% — divisa per la spesa di un mese tipico (media interquartile su ${n} mesi: scarta il 25% più alto e più basso per ignorare outlier come tasse o vacanze). ≥6 mesi = ottimo (14 pt) · ≥3 = buono · ≥1.5 = sufficiente · ≥0.5 = scarso · &lt;0.5 = critico.`,
              got: scoreRunway, max: 14,
              detail: `${fmt.currency(reserveBalance)} riserva ÷ ${fmt.currency(expMedian)}/mese tipico = <strong>${runwayDisplay} mesi</strong> → ${scoreRunway}/14 pt`,
              col: scoreRunway>=10?'var(--income)':scoreRunway>=6?'#e8a838':'var(--expense)'
            },
            {
              label: 'Trend del risparmio',
              desc:  `Confronto robusto tra la mediana del risparmio mensile della seconda metà del periodo e quella della prima metà (più stabile di una regressione: un singolo mese-outlier non lo sposta). Normalizzato sul reddito mediano. Crescita &gt;+3%/mese = ottimo · stabile = sufficiente · calo &gt;−3%/mese = critico. Se tutti i mesi sono positivi e risparmi ≥10%, il punteggio minimo è 7 — un calo di tendenza conta meno quando sei sempre in attivo.`,
              got: scoreIncTrend, max: 16,
              detail: `mediana ${fmt.currency(savMedFirst)} → ${fmt.currency(savMedSecond)} (${savSlopePct>=0?'+':''}${savSlopePct.toFixed(1)}%/mese del reddito) → ${scoreIncTrend}/16 pt`,
              col: scoreIncTrend>=13?'var(--income)':scoreIncTrend>=6?'#e8a838':'var(--expense)'
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
            <div class="score-badge" style="color:${colS}">${scoreSavings > 0 ? '+' : ''}${scoreSavings} / 46 pt</div>
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
            <div class="score-badge" style="color:${colP}">${scorePos} / 14 pt</div>
          </div>
          <div class="health-desc" style="margin-bottom:12px">
            Finestre mobili di 3 mesi chiuse in positivo: <strong style="color:${colP}">${roll3Pos} su ${roll3Total}</strong> (${(roll3Pct*100).toFixed(0)}%).
            Valutare 3 mesi alla volta evita che una grossa spesa annuale (tasse, assicurazione) penalizzi se i mesi vicini la assorbono.
            100% = 14 pt · ≥90% = 13 · ≥75% = 11 · ≥60% = 8 · ≥40% = 5 · ≥20% = 2 · &lt;20% = 0 pt.
            <span style="color:var(--txt3)">I riquadri sotto mostrano comunque il singolo mese.</span>
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

        <!-- Riserva di emergenza -->
        <div class="card-section">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <div style="font-size:13px;font-weight:600">Riserva di emergenza</div>
            <div class="score-badge" style="color:${colR}">${scoreRunway} / 14 pt</div>
          </div>
          <div class="health-desc" style="margin-bottom:14px">
            Mesi di vita coperti dalla <strong>riserva disponibile</strong> — liquidità (conti non-investimento)
            più gli investimenti scontati al ${(investHaircut*100).toFixed(0)}% (in una crisi possono valere meno e richiedono tempo/tasse per essere venduti) —
            divisa per la spesa di un mese tipico. Indica la tua <em>resilienza</em>: quanto duri se le entrate si fermano.
            Soglie: ≥6 mesi ottimo · ≥3 buono · ≥1.5 sufficiente · &lt;0.5 critico.
          </div>

          <div style="display:flex;align-items:center;gap:18px;margin-bottom:14px">
            <div style="text-align:center;min-width:90px">
              <div style="font-size:34px;font-weight:700;color:${colR};line-height:1">${runwayDisplay}</div>
              <div style="font-size:11px;color:var(--txt3);margin-top:3px">mesi</div>
            </div>
            <div style="flex:1">
              <div style="position:relative;height:16px;display:flex;border-radius:8px;overflow:hidden">
                <div style="flex:0.5;background:rgba(248,81,73,.55)"  title="Critico (&lt;0.5 mesi)"></div>
                <div style="flex:1;background:rgba(240,136,62,.55)"   title="Scarso (0.5–1.5 mesi)"></div>
                <div style="flex:1.5;background:rgba(232,168,56,.55)" title="Sufficiente (1.5–3 mesi)"></div>
                <div style="flex:3;background:rgba(99,179,90,.5)"     title="Buono (3–6 mesi)"></div>
                <div style="flex:6;background:rgba(63,185,80,.6)"     title="Ottimo (≥6 mesi)"></div>
                <div style="position:absolute;top:-4px;bottom:-4px;width:3px;background:var(--txt);left:calc(${runwayPos.toFixed(2)}% - 1.5px);box-shadow:0 0 4px rgba(0,0,0,.6);border-radius:2px"></div>
              </div>
              <div style="position:relative;height:14px;margin-top:4px;font-size:10px;color:var(--txt3)">
                <span style="position:absolute;left:0">0</span>
                <span style="position:absolute;left:12.5%;transform:translateX(-50%)">1.5</span>
                <span style="position:absolute;left:25%;transform:translateX(-50%)">3</span>
                <span style="position:absolute;left:50%;transform:translateX(-50%)">6</span>
                <span style="position:absolute;right:0">12+</span>
              </div>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:12px;padding-top:10px;border-top:1px solid var(--border)">
            <div>
              <div style="color:var(--txt3);font-size:10px;margin-bottom:2px">Riserva disponibile</div>
              <div style="font-weight:600;color:${reserveBalance>=0?'var(--income)':'var(--expense)'}">${fmt.currency(reserveBalance)}</div>
              <div style="font-size:10px;color:var(--txt3);margin-top:1px">
                ${fmt.currency(cashBalance)} liquidi${investBalance>0?` + ${fmt.currency(investBalance*investHaircut)} invest. (${(investHaircut*100).toFixed(0)}% di ${fmt.currency(investBalance)})`:''}
              </div>
            </div>
            <div>
              <div style="color:var(--txt3);font-size:10px;margin-bottom:2px">Spesa mensile tipica</div>
              <div style="font-weight:600">${fmt.currency(expMedian)}<span style="font-weight:400;color:var(--txt3)">/mese</span></div>
              <div style="font-size:10px;color:var(--txt3);margin-top:1px">media interquartile ultimi ${n} mesi</div>
            </div>
          </div>
        </div>

        <!-- Trend del risparmio -->
        <div class="card-section">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <div style="font-size:13px;font-weight:600">Trend del risparmio</div>
            <div class="score-badge" style="color:${colI}">${scoreIncTrend} / 16 pt</div>
          </div>
          <div class="health-desc" style="margin-bottom:10px">
            Confronto robusto tra la <strong>mediana del risparmio mensile</strong> della seconda metà del periodo e quella della prima metà
            (più stabile di una regressione: un singolo mese-outlier non lo sposta).
            Mediana: <strong>${fmt.currency(savMedFirst)}</strong> → <strong>${fmt.currency(savMedSecond)}</strong>, pari a
            <strong style="color:${savSlopePct>=0?'var(--income)':'var(--expense)'}">${savSlopePct>=0?'+':''}${savSlopePct.toFixed(1)}% del reddito/mese</strong>.
            La linea a gradino indica i due livelli mediani.
            ${(posPct===1&&avgSavingsRate>=10)?'<em style="color:var(--income)">Tutti i mesi in attivo con risparmio ≥10%: punteggio minimo garantito a 7.</em>':(posPct>=0.75&&avgSavingsRate>=5)?'<em style="color:#e8a838">Situazione complessivamente positiva: punteggio minimo garantito a 5.</em>':''}
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
  if (_healthIncChart)  _healthIncChart.destroy();
  if (_healthVolChart)  _healthVolChart.destroy();
  _healthRateChart = _healthIncChart = _healthVolChart = null;

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
          pointRadius:0, stepped:'middle', fill:false, borderWidth:2 }
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

// Tab "Saldo Conti": andamento storico del saldo per conto (serie multiple selezionabili).
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

// Disegna il grafico Saldo Conti per i conti selezionati (una linea per conto + totale).
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

// Mostra/nasconde un conto nel grafico Saldo Conti e ridisegna.
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

// Tab "Andamento Categoria": evoluzione mensile della spesa/entrata di una o più categorie scelte.
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

// Disegna il grafico Andamento Categoria per le categorie selezionate.
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
  const isLight    = t === 'carta' || t === 'cristallo';
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

// Pagina Resoconti (Filtri salvati): mostra il resoconto selezionato dalla sidebar (filtri + grafico)
// o un placeholder se nessuno è attivo.
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


// Tab "Natura Spese": ripartizione delle uscite per natura (essenziale/variabile/superflua) e per categoria.
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
    const natureTotal = cats.reduce((s, c) => s + Number(c.total), 0);
    const naturePct = totalAll > 0 ? (natureTotal / totalAll * 100).toFixed(1) : '0.0';
    const natureTxCount = cats.reduce((s, c) => s + Number(c.tx_count), 0);
    const df = filter.date_from || '';
    const dt = filter.date_to   || '';
    const rows = cats.map(c => {
      const tot = Number(c.total);
      const pct = totalAll > 0 ? (tot / totalAll * 100).toFixed(1) : '0.0';
      const catLabel = c.parent_name
        ? `<span style="opacity:.6">${c.parent_name}:</span>${c.cat_name}`
        : c.cat_name;
      return `<div class="nature-cat-row" onclick="txFilters={range:'custom',date_from:'${df}',date_to:'${dt}',category_id:${c.cat_id},type:'expense'};navigate('transactions')" title="Vedi transazioni" style="display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:6px;cursor:pointer">
        <span style="background:${c.color}22;color:${c.color};padding:2px 8px;border-radius:4px;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0">${c.icon} ${catLabel}</span>
        <span style="font-weight:600;font-size:12px;white-space:nowrap">${fmt.currency(tot)}</span>
        <span style="color:var(--txt3);font-size:11px;white-space:nowrap;text-align:right;min-width:74px">${c.tx_count} tx · ${pct}%</span>
      </div>`;
    }).join('');
    return `
      <div class="card" style="padding:12px 14px">
        <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid var(--border)">
          <div style="font-size:13px;font-weight:700;color:${m.color}">${m.icon} ${m.label}</div>
          <div style="font-size:11px;color:var(--txt3)"><strong style="color:${m.color}">${fmt.currency(natureTotal)}</strong> · ${naturePct}% · ${natureTxCount} tx</div>
        </div>
        ${rows}
      </div>`;
  }).join('');

  el.innerHTML = `
    ${totalAll > 0 ? `
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px">${cards}</div>
    <div class="card" style="padding:12px 16px;margin-bottom:16px">
      <div style="font-size:11px;color:var(--txt3);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">Ripartizione totale · ${fmt.currency(totalAll)}</div>
      <div style="display:flex;height:14px;border-radius:7px;overflow:hidden;gap:2px">${barSegments}</div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:14px;align-items:start">${sections}</div>` : '<div style="text-align:center;color:var(--txt3);padding:60px">Nessuna uscita nel periodo selezionato.</div>'}`;
}


// Aggiorna l'intestazione della pagina Resoconti col nome del resoconto attivo e azioni.
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
    const groupL = {
      year:'Per anno', quarter:'Per trimestre', month:'Per mese', weekday:'Per giorno settimana',
      category:'Per categoria', category_parent:'Per categoria padre',
      account:'Per conto', tag:'Per tag', type:'Per tipo', amount_bucket:'Per fascia importo'
    };
    chips.push(chip(`⊞ ${groupL[groupby] || groupby}`));
  }

  // Resoconto salvato → nome + Modifica. Filtro temporaneo (non salvato) → etichetta + Modifica:
  // riapre la modale precompilata coi filtri correnti, così puoi modificarlo senza salvarlo
  // (lascia il nome vuoto) oppure salvarlo dandogli un nome.
  const nameHtml = r
    ? `<span class="r-report-name">📋 ${r.name}</span> <button class="btn btn-ghost btn-icon" onclick="showReportModal(${r.id})" title="Modifica">✏️</button>`
    : (chips.length
        ? `<span class="r-report-name" style="color:var(--txt3)">📋 Filtro temporaneo <span style="font-size:11px;font-weight:400">(non salvato)</span></span> <button class="btn btn-ghost btn-icon" onclick="showReportModal()" title="Modifica / salva con nome">✏️</button>`
        : '');
  const chipsHtml = chips.length ? `<div class="r-chips">${chips.join('')}</div>` : '';
  headerEl.innerHTML = `${nameHtml}${chipsHtml}`;
}

// Carica la configurazione di un resoconto salvato (filtri, raggruppamento, tipo grafico) nello stato.
function _loadReportConfig(r) {
  _currentReportId = r.id;
  _reportGroupby   = r.groupby    || 'none';
  _reportChartType = r.chart_type || 'none';
  try { _reportFilters = JSON.parse(r.filters_json || '{}'); } catch { _reportFilters = {}; }
  runReport();
}

// Esegue il resoconto attivo: recupera le transazioni filtrate e ne renderizza risultati e grafico.
async function runReport() {
  const f         = _reportFilters || {};
  const groupby   = _reportGroupby   || 'none';
  const chartType = _reportChartType || 'none';

  // Fetch categorie una volta sola (serve sia per espandere il filtro padre→figli sia per groupby)
  const catList = await api.getCategories();
  const catMap  = new Map(catList.map(c => [c.id, c]));

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
  if (f.category_id) {
    // Espande la categoria selezionata ai suoi figli (se è una categoria padre)
    const children = catList.filter(c => c.parent_id === f.category_id).map(c => c.id);
    if (children.length) {
      filters.category_ids = [f.category_id, ...children];
    } else {
      filters.category_id = f.category_id;
    }
  }
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

  renderReportResults(txs, groupby, chartType, catMap);
}

// Modale crea/modifica resoconto: nome, filtri (periodo, conto, categoria, tag, ricerca),
// raggruppamento e tipo di grafico. reportId=null → nuovo (precompilato da _reportFilters).
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
      ${r ? `<div style="font-size:11px;color:var(--txt3);margin-top:3px">Le modifiche (nome compreso) aggiornano questo filtro.</div>` : ''}
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
          <optgroup label="Tempo">
            <option value="year"${sel(initGroupby,'year')}>Anno</option>
            <option value="quarter"${sel(initGroupby,'quarter')}>Trimestre</option>
            <option value="month"${sel(initGroupby,'month')}>Mese</option>
            <option value="weekday"${sel(initGroupby,'weekday')}>Giorno settimana</option>
          </optgroup>
          <optgroup label="Dimensioni">
            <option value="category"${sel(initGroupby,'category')}>Categoria</option>
            <option value="category_parent"${sel(initGroupby,'category_parent')}>Categoria padre</option>
            <option value="account"${sel(initGroupby,'account')}>Conto</option>
            <option value="tag"${sel(initGroupby,'tag')}>Tag</option>
            <option value="type"${sel(initGroupby,'type')}>Tipo</option>
            <option value="amount_bucket"${sel(initGroupby,'amount_bucket')}>Fascia importo</option>
          </optgroup>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Grafico</label>
        <select class="form-control" id="rmChartType">
          <option value="none">Nessuno</option>
          <option value="bar"${sel(initChartType,'bar')}>Barre</option>
          <option value="hbar"${sel(initChartType,'hbar')}>Barre orizzontali</option>
          <option value="line"${sel(initChartType,'line')}>Linea</option>
          <option value="area"${sel(initChartType,'area')}>Area</option>
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
        if (r) data.id = r.id;  // in modifica aggiorna sempre il filtro esistente (anche se rinominato)
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

// Mostra/nasconde i campi data personalizzati nel modale resoconto quando il range è "custom".
function rmOnRangeChange(range) {
  const show = range === 'custom';
  const fg = document.getElementById('rmDateFromGroup');
  const tg = document.getElementById('rmDateToGroup');
  if (fg) fg.style.display = show ? '' : 'none';
  if (tg) tg.style.display = show ? '' : 'none';
}

// Helper: bucket di importo
const _AMT_BUCKETS = [
  {min:0,    max:10,   label:'0-10 €'},
  {min:10,   max:50,   label:'10-50 €'},
  {min:50,   max:100,  label:'50-100 €'},
  {min:100,  max:500,  label:'100-500 €'},
  {min:500,  max:1000, label:'500-1k €'},
  {min:1000, max:Infinity, label:'> 1k €'},
];
const _WEEKDAY_NAMES = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];

// Renderizza i risultati di un resoconto: tabella transazioni + eventuale aggregazione per gruppo
// (categoria/conto/tag/mese) e grafico (barre/torta/linea) secondo la configurazione.
function renderReportResults(txs, groupby, chartType, catMap) {
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
    ? (t.filtered_split_category_id || t.category_id || 0)
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
    if (chartType==='bar'||chartType==='hbar'||chartType==='line'||chartType==='area') chartData={
      type:(chartType==='bar'||chartType==='hbar')?'bar':'line',
      labels:months.map(_fmtMonth),
      datasets:[
        {label:'Entrate',data:months.map(m=>byM[m].income),backgroundColor:'rgba(63,185,80,.6)',borderColor:'#3fb950',borderWidth:2,fill:chartType==='area',borderRadius:4},
        {label:'Uscite', data:months.map(m=>byM[m].expense),backgroundColor:'rgba(248,81,73,.6)',borderColor:'#f85149',borderWidth:2,fill:chartType==='area',borderRadius:4},
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
    if (chartType==='bar'||chartType==='hbar') chartData={type:'bar',
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
    if (chartType==='bar'||chartType==='hbar') chartData={type:'bar',
      labels:accs.map(([,g])=>g.name),
      datasets:[
        {label:'Entrate',data:accs.map(([,g])=>g.income),backgroundColor:'rgba(63,185,80,.6)',borderColor:'#3fb950',borderWidth:2,borderRadius:4},
        {label:'Uscite', data:accs.map(([,g])=>g.expense),backgroundColor:'rgba(248,81,73,.6)',borderColor:'#f85149',borderWidth:2,borderRadius:4},
      ]};

  } else if (groupby === 'year' || groupby === 'quarter') {
    const isYear = groupby === 'year';
    const keyFn = t => {
      if (!t.date) return '';
      if (isYear) return t.date.slice(0,4);
      const m = parseInt(t.date.slice(5,7));
      return `${t.date.slice(0,4)}-Q${Math.ceil(m/3)}`;
    };
    const byK = {};
    txs.forEach(t => {
      const k = keyFn(t); if (!k) return;
      const a = effectiveAmt(t);
      if (!byK[k]) byK[k]={income:0,expense:0,count:0};
      byK[k].count++;
      if (t.type==='income')  byK[k].income  += a;
      if (t.type==='expense') byK[k].expense += a;
    });
    const keys = Object.keys(byK).sort();
    const totI = keys.reduce((s,k)=>s+byK[k].income,0);
    const totE = keys.reduce((s,k)=>s+byK[k].expense,0);
    tableHtml = `<table><thead><tr>
      <th>${isYear?'Anno':'Trimestre'}</th><th class="text-right">N.</th>
      <th class="text-right">Entrate</th><th class="text-right">Uscite</th>
      <th class="text-right">Netto</th></tr></thead><tbody>
      ${keys.map(k=>{const g=byK[k],net=g.income-g.expense;return`<tr>
        <td>${k}</td><td class="text-right">${g.count}</td>
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
    if (chartType==='bar'||chartType==='hbar'||chartType==='line'||chartType==='area') chartData={
      type:(chartType==='bar'||chartType==='hbar')?'bar':'line',
      labels:keys,
      datasets:[
        {label:'Entrate',data:keys.map(k=>byK[k].income),backgroundColor:'rgba(63,185,80,.6)',borderColor:'#3fb950',borderWidth:2,fill:chartType==='area',borderRadius:4},
        {label:'Uscite', data:keys.map(k=>byK[k].expense),backgroundColor:'rgba(248,81,73,.6)',borderColor:'#f85149',borderWidth:2,fill:chartType==='area',borderRadius:4},
      ]};

  } else if (groupby === 'weekday') {
    const byW = Array.from({length:7},()=>({income:0,expense:0,count:0}));
    txs.forEach(t => {
      if (!t.date) return;
      const d = new Date(t.date).getDay();
      const a = effectiveAmt(t);
      byW[d].count++;
      if (t.type==='income')  byW[d].income  += a;
      if (t.type==='expense') byW[d].expense += a;
    });
    // Ordina Lun-Dom (Italia)
    const order = [1,2,3,4,5,6,0];
    tableHtml = `<table><thead><tr>
      <th>Giorno</th><th class="text-right">N.</th>
      <th class="text-right">Entrate</th><th class="text-right">Uscite</th>
      <th class="text-right">Netto</th></tr></thead><tbody>
      ${order.map(i=>{const g=byW[i],net=g.income-g.expense;return`<tr>
        <td>${_WEEKDAY_NAMES[i]}</td><td class="text-right">${g.count}</td>
        <td class="text-right amount-income">${fmt.currency(g.income)}</td>
        <td class="text-right amount-expense">${fmt.currency(g.expense)}</td>
        <td class="text-right" style="font-weight:600;color:${net>=0?'var(--income)':'var(--expense)'}">
          ${fmt.currency(net)}</td></tr>`;}).join('')}
      </tbody></table>`;
    if (chartType==='bar'||chartType==='hbar'||chartType==='line'||chartType==='area') chartData={
      type:(chartType==='bar'||chartType==='hbar')?'bar':'line',
      labels:order.map(i=>_WEEKDAY_NAMES[i]),
      datasets:[
        {label:'Entrate',data:order.map(i=>byW[i].income),backgroundColor:'rgba(63,185,80,.6)',borderColor:'#3fb950',borderWidth:2,fill:chartType==='area',borderRadius:4},
        {label:'Uscite', data:order.map(i=>byW[i].expense),backgroundColor:'rgba(248,81,73,.6)',borderColor:'#f85149',borderWidth:2,fill:chartType==='area',borderRadius:4},
      ]};

  } else if (groupby === 'tag') {
    const byT = {};
    let untagged = {name:'(senza tag)',color:'var(--txt3)',total:0,count:0};
    txs.forEach(t => {
      const a = effectiveAmt(t);
      const signed = t.type==='income' ? a : (t.type==='expense' ? -a : 0);
      const tagList = t.tags || [];
      if (!tagList.length) {
        untagged.count++; untagged.total += signed;
        return;
      }
      tagList.forEach(tag => {
        const k = tag.id;
        if (!byT[k]) byT[k]={name:tag.name||'—',color:tag.color||'var(--accent)',total:0,count:0};
        byT[k].count++; byT[k].total += signed;
      });
    });
    const tagsArr = Object.entries(byT).map(([,g])=>g).concat(untagged.count?[untagged]:[])
      .sort((a,b)=>Math.abs(b.total)-Math.abs(a.total));
    tableHtml = `<table><thead><tr>
      <th>Tag</th><th class="text-right">N.</th><th class="text-right">Totale</th>
      </tr></thead><tbody>
      ${tagsArr.map(g=>`<tr>
        <td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${g.color};margin-right:6px"></span>${g.name}</td>
        <td class="text-right">${g.count}</td>
        <td class="text-right" style="font-weight:600;color:${g.total>=0?'var(--income)':'var(--expense)'}">
          ${fmt.currency(Math.abs(g.total))}</td></tr>`).join('')}
      </tbody></table>
      <p style="font-size:var(--fs-xs,10px);color:var(--txt3);margin-top:6px">Nota: le transazioni con più tag contano una volta per tag.</p>`;
    if (chartType==='bar'||chartType==='hbar') chartData={type:'bar',
      labels:tagsArr.map(g=>g.name),
      datasets:[{label:'Totale',data:tagsArr.map(g=>Math.abs(g.total)),
        backgroundColor:tagsArr.map(g=>g.color+'99'),borderRadius:4}]};
    else if (chartType==='pie') chartData={type:'doughnut',
      labels:tagsArr.map(g=>g.name),
      datasets:[{data:tagsArr.map(g=>Math.abs(g.total)),
        backgroundColor:tagsArr.map(g=>g.color),borderWidth:0}]};

  } else if (groupby === 'category_parent') {
    const byP = {};
    txs.forEach(t => {
      const catId = effectiveCatId(t);
      const cat = catMap?.get(catId);
      // Se ha un padre uso quello, altrimenti la categoria stessa è "root"
      const parent = cat?.parent_id ? catMap?.get(cat.parent_id) : cat;
      const k = parent?.id || 0;
      const name = parent?.name || effectiveCatName(t) || '—';
      const icon = parent?.icon || effectiveCatIcon(t) || '';
      const color = parent?.color || t.category_color || 'var(--txt3)';
      const a = effectiveAmt(t);
      if (!byP[k]) byP[k]={name,icon,color,total:0,count:0};
      byP[k].count++;
      if (t.type==='income')  byP[k].total += a;
      if (t.type==='expense') byP[k].total -= a;
    });
    const parents = Object.entries(byP).sort(([,a],[,b])=>Math.abs(b.total)-Math.abs(a.total));
    tableHtml = `<table><thead><tr>
      <th>Categoria padre</th><th class="text-right">N.</th><th class="text-right">Totale</th>
      </tr></thead><tbody>
      ${parents.map(([,g])=>`<tr>
        <td><span style="color:${g.color}">${g.icon}</span> ${g.name}</td>
        <td class="text-right">${g.count}</td>
        <td class="text-right" style="font-weight:600;color:${g.total>=0?'var(--income)':'var(--expense)'}">
          ${fmt.currency(Math.abs(g.total))}</td></tr>`).join('')}
      </tbody></table>`;
    if (chartType==='bar'||chartType==='hbar') chartData={type:'bar',
      labels:parents.map(([,g])=>`${g.icon} ${g.name}`),
      datasets:[{label:'Totale',data:parents.map(([,g])=>Math.abs(g.total)),
        backgroundColor:parents.map(([,g])=>g.color+'99'),borderRadius:4}]};
    else if (chartType==='pie') chartData={type:'doughnut',
      labels:parents.map(([,g])=>`${g.icon} ${g.name}`),
      datasets:[{data:parents.map(([,g])=>Math.abs(g.total)),
        backgroundColor:parents.map(([,g])=>g.color),borderWidth:0}]};

  } else if (groupby === 'type') {
    const byT = {income:{label:'Entrate',color:'#3fb950',total:0,count:0},
                 expense:{label:'Uscite',color:'#f85149',total:0,count:0},
                 transfer:{label:'Trasferimenti',color:'#58a6ff',total:0,count:0}};
    txs.forEach(t => {
      const a = effectiveAmt(t);
      const k = t.type;
      if (!byT[k]) return;
      byT[k].count++;
      byT[k].total += a;
    });
    const arr = Object.entries(byT).filter(([,g])=>g.count>0);
    tableHtml = `<table><thead><tr>
      <th>Tipo</th><th class="text-right">N.</th><th class="text-right">Totale</th>
      </tr></thead><tbody>
      ${arr.map(([,g])=>`<tr>
        <td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${g.color};margin-right:6px"></span>${g.label}</td>
        <td class="text-right">${g.count}</td>
        <td class="text-right" style="font-weight:600;color:${g.color}">
          ${fmt.currency(g.total)}</td></tr>`).join('')}
      </tbody></table>`;
    if (chartType==='bar'||chartType==='hbar') chartData={type:'bar',
      labels:arr.map(([,g])=>g.label),
      datasets:[{label:'Totale',data:arr.map(([,g])=>g.total),
        backgroundColor:arr.map(([,g])=>g.color+'99'),borderRadius:4}]};
    else if (chartType==='pie') chartData={type:'doughnut',
      labels:arr.map(([,g])=>g.label),
      datasets:[{data:arr.map(([,g])=>g.total),
        backgroundColor:arr.map(([,g])=>g.color),borderWidth:0}]};

  } else if (groupby === 'amount_bucket') {
    const buckets = _AMT_BUCKETS.map(b=>({...b,income:0,expense:0,count:0}));
    txs.forEach(t => {
      const a = effectiveAmt(t);
      const abs = Math.abs(a);
      const b = buckets.find(b => abs >= b.min && abs < b.max);
      if (!b) return;
      b.count++;
      if (t.type==='income')  b.income  += a;
      if (t.type==='expense') b.expense += a;
    });
    tableHtml = `<table><thead><tr>
      <th>Fascia importo</th><th class="text-right">N.</th>
      <th class="text-right">Entrate</th><th class="text-right">Uscite</th>
      </tr></thead><tbody>
      ${buckets.map(b=>`<tr>
        <td>${b.label}</td><td class="text-right">${b.count}</td>
        <td class="text-right amount-income">${b.income?fmt.currency(b.income):''}</td>
        <td class="text-right amount-expense">${b.expense?fmt.currency(b.expense):''}</td>
        </tr>`).join('')}
      </tbody></table>`;
    if (chartType==='bar'||chartType==='hbar') chartData={type:'bar',
      labels:buckets.map(b=>b.label),
      datasets:[
        {label:'Entrate',data:buckets.map(b=>b.income),backgroundColor:'rgba(63,185,80,.6)',borderColor:'#3fb950',borderWidth:2,borderRadius:4},
        {label:'Uscite', data:buckets.map(b=>b.expense),backgroundColor:'rgba(248,81,73,.6)',borderColor:'#f85149',borderWidth:2,borderRadius:4},
      ]};

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
    const isHBar = chartType === 'hbar';
    _reportChart = new Chart(document.getElementById('rChart'), {
      type: chartData.type,
      data: { labels: chartData.labels, datasets: chartData.datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        indexAxis: isHBar ? 'y' : 'x',
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

// Formatta "YYYY-MM" in etichetta mese leggibile (es. "mag 2026").
function _fmtMonth(yyyyMM) {
  if (!yyyyMM || !/^\d{4}-\d{2}$/.test(yyyyMM)) return yyyyMM || '—';
  const [y, m] = yyyyMM.split('-');
  return new Date(parseInt(y), parseInt(m) - 1, 1)
    .toLocaleString('it-IT', { month: 'long', year: 'numeric' });
}


// Elimina un resoconto salvato previa conferma e aggiorna sidebar/pagina.
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

// Costanti del modello forecast a decomposizione (raccolte in un solo posto)
const _FC = {
  Z90:        1.645,    // z-score IC 90%
  MAD_SCALE:  1.4826,   // fattore per stimare σ dalla MAD (deviazione assoluta mediana)
  HIST_MIN:   3,        // mesi minimi di storico richiesti
  HORIZON_MAX: 36,      // mesi massimi di proiezione futura
};

// Helper: util mese/anno (riusa _MONTHS_IT, parseYm, fmtYm già usati altrove)
const _fcParseYm = ym => ({ y: parseInt(ym.slice(0,4)), m: parseInt(ym.slice(5,7)) });
const _fcFmtYm   = (y, m) => `${y}-${String(m).padStart(2,'0')}`;
const _fcCurYm   = () => { const d = new Date(); return _fcFmtYm(d.getFullYear(), d.getMonth()+1); };
const _fcPrevYm  = () => { const d = new Date(); const p = new Date(d.getFullYear(), d.getMonth()-1, 1); return _fcFmtYm(p.getFullYear(), p.getMonth()+1); };

// Conta i mesi inclusivi tra fromYm e toYm (toYm >= fromYm)
// Numero di mesi tra due "YYYY-MM" inclusi.
function _fcMonthsBetween(fromYm, toYm) {
  const a = _fcParseYm(fromYm), b = _fcParseYm(toYm);
  return (b.y - a.y) * 12 + (b.m - a.m) + 1;
}

// Inizializza i default di _fcParams in base a oggi + primo mese in DB
// Inizializza i parametri di default della Previsione Saldo (storico e orizzonte) se non impostati.
function _fcInitDefaults(oldestYm) {
  const d = new Date();
  // Storico: 12 mesi indietro, ma clamp a oldestYm
  const startStorico = new Date(d.getFullYear(), d.getMonth() - 12, 1);
  const startYm = _fcFmtYm(startStorico.getFullYear(), startStorico.getMonth()+1);
  if (!_fcParams.histFromYm)  _fcParams.histFromYm  = (oldestYm && startYm < oldestYm) ? oldestYm : startYm;
  // Orizzonte: 6 mesi avanti dal mese corrente
  if (!_fcParams.horizonToYm) {
    const end = new Date(d.getFullYear(), d.getMonth() + 5, 1);
    _fcParams.horizonToYm = _fcFmtYm(end.getFullYear(), end.getMonth()+1);
  }
}

// Deriva i numeri (histMonths, horizonMonths) da _fcParams + clamp di sicurezza
// Deriva dai parametri (date scelte) quanti mesi di storico e di proiezione richiedere al backend.
function _fcDeriveMonths() {
  const curYm  = _fcCurYm();
  const prevYm = _fcPrevYm();
  const histFrom = _fcParams.histFromYm || prevYm;
  const horizTo  = _fcParams.horizonToYm || curYm;
  const histMonths    = Math.max(_FC.HIST_MIN, _fcMonthsBetween(histFrom, prevYm));
  const horizonMonths = Math.max(1, Math.min(_FC.HORIZON_MAX, _fcMonthsBetween(curYm, horizTo)));
  return { histMonths, horizonMonths };
}

// ── HTML controlli (stesso pattern degli altri report Analytics) ────────────
// Preset | Da: [Y][M] | A: [Y][M] | Sensibilità: [select]
// HTML della barra controlli della Previsione Saldo (range storico, orizzonte, sensibilità).
function _fcControlsHtml() {
  _fcInitDefaults(_analyticsOldestYm);
  const oldestYm = _analyticsOldestYm || _fcPrevYm();
  const prevYm   = _fcPrevYm();
  const curYm    = _fcCurYm();
  const d = new Date();
  const maxHorizonDate = new Date(d.getFullYear(), d.getMonth() + _FC.HORIZON_MAX, 1);
  const maxHorizonYm   = _fcFmtYm(maxHorizonDate.getFullYear(), maxHorizonDate.getMonth()+1);

  const hf  = _fcParseYm(_fcParams.histFromYm);
  const ht  = _fcParseYm(_fcParams.horizonToYm);

  return `
    <div class="card" style="padding:10px 14px;margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:nowrap;white-space:nowrap;overflow-x:auto">
        <label style="font-size:13px;color:var(--txt2)" title="Inizio dello storico analizzato">Da:</label>
        <select id="fcHistY" class="form-control" style="font-size:12px;padding:3px 8px;width:72px">
          ${_buildYearOptions(oldestYm, prevYm, hf.y)}
        </select>
        <select id="fcHistM" class="form-control" style="font-size:12px;padding:3px 8px;width:60px">
          ${_buildMonthsForYear(hf.y, oldestYm, prevYm, hf.m)}
        </select>
        <button class="btn btn-xs btn-ghost" id="fcPresetHist3"  title="Storico ultimi 3 mesi">3m</button>
        <button class="btn btn-xs btn-ghost" id="fcPresetHist6"  title="Storico ultimi 6 mesi">6m</button>
        <button class="btn btn-xs btn-ghost" id="fcPresetHist12" title="Storico ultimi 12 mesi">12m</button>
        <div style="width:1px;height:20px;background:var(--border);margin:0 10px"></div>
        <label style="font-size:13px;color:var(--txt2)" title="Fine della previsione">A:</label>
        <select id="fcHorizY" class="form-control" style="font-size:12px;padding:3px 8px;width:72px">
          ${_buildYearOptions(curYm, maxHorizonYm, ht.y)}
        </select>
        <select id="fcHorizM" class="form-control" style="font-size:12px;padding:3px 8px;width:60px">
          ${_buildMonthsForYear(ht.y, curYm, maxHorizonYm, ht.m)}
        </select>
        <button class="btn btn-xs btn-ghost" id="fcPresetHoriz3"  title="Previsione prossimi 3 mesi">3m</button>
        <button class="btn btn-xs btn-ghost" id="fcPresetHoriz6"  title="Previsione prossimi 6 mesi">6m</button>
        <button class="btn btn-xs btn-ghost" id="fcPresetHoriz12" title="Previsione prossimi 12 mesi">12m</button>
        <div style="width:1px;height:20px;background:var(--border);margin:0 10px"></div>
        <button id="fcNetWorth" class="btn btn-xs ${_fcShowNetWorth?'btn-primary':'btn-ghost'}" style="padding:4px 10px"
          title="Includi il valore del portfolio e gli eventi bond (cedole + rimborso a scadenza) nella previsione">💎 Patrimonio netto</button>
      </div>
    </div>`;
}

// Bind handlers ai controlli (chiamato dopo aver inserito _fcControlsHtml nel DOM)
// Collega gli eventi dei controlli della Previsione Saldo (cambio date/sensibilità → ricalcolo).
function _fcBindControls() {
  const oldestYm = _analyticsOldestYm || _fcPrevYm();
  const prevYm   = _fcPrevYm();
  const curYm    = _fcCurYm();
  const d = new Date();
  const maxHorizonDate = new Date(d.getFullYear(), d.getMonth() + _FC.HORIZON_MAX, 1);
  const maxHorizonYm   = _fcFmtYm(maxHorizonDate.getFullYear(), maxHorizonDate.getMonth()+1);

  // Clamp helper: assicura che value selezionato sia dentro [min, max]
  const _clampYm = (ym, minYm, maxYm) => ym < minYm ? minYm : (ym > maxYm ? maxYm : ym);

  const _onHist = () => {
    const y = parseInt(document.getElementById('fcHistY').value);
    const m = parseInt(document.getElementById('fcHistM').value);
    _fcParams.histFromYm = _clampYm(_fcFmtYm(y, m), oldestYm, prevYm);
    // Ricostruisci i mesi disponibili per il nuovo anno
    const hf2 = _fcParseYm(_fcParams.histFromYm);
    document.getElementById('fcHistM').innerHTML = _buildMonthsForYear(hf2.y, oldestYm, prevYm, hf2.m);
    _runForecastSaldo();
  };
  const _onHoriz = () => {
    const y = parseInt(document.getElementById('fcHorizY').value);
    const m = parseInt(document.getElementById('fcHorizM').value);
    _fcParams.horizonToYm = _clampYm(_fcFmtYm(y, m), curYm, maxHorizonYm);
    const ht2 = _fcParseYm(_fcParams.horizonToYm);
    document.getElementById('fcHorizM').innerHTML = _buildMonthsForYear(ht2.y, curYm, maxHorizonYm, ht2.m);
    _runForecastSaldo();
  };
  document.getElementById('fcHistY').onchange  = _onHist;
  document.getElementById('fcHistM').onchange  = _onHist;
  document.getElementById('fcHorizY').onchange = _onHoriz;
  document.getElementById('fcHorizM').onchange = _onHoriz;
  document.getElementById('fcNetWorth').onclick = () => {
    _fcShowNetWorth = !_fcShowNetWorth;
    api.setSetting('fc.networth', _fcShowNetWorth ? '1' : '0');
    document.getElementById('fcNetWorth').className = 'btn btn-xs ' + (_fcShowNetWorth ? 'btn-primary' : 'btn-ghost');
    _runForecastSaldo();
  };

  // Preset Storico: ultimi N mesi prima del corrente
  const _applyHistPreset = (months) => {
    const today = new Date();
    const histStart = new Date(today.getFullYear(), today.getMonth() - months, 1);
    const newYm = _clampYm(_fcFmtYm(histStart.getFullYear(), histStart.getMonth()+1), oldestYm, prevYm);
    _fcParams.histFromYm = newYm;
    const hf2 = _fcParseYm(newYm);
    document.getElementById('fcHistY').innerHTML = _buildYearOptions(oldestYm, prevYm, hf2.y);
    document.getElementById('fcHistM').innerHTML = _buildMonthsForYear(hf2.y, oldestYm, prevYm, hf2.m);
    _runForecastSaldo();
  };
  // Preset Previsione: prossimi N mesi dal corrente
  const _applyHorizPreset = (months) => {
    const today = new Date();
    const horizonEnd = new Date(today.getFullYear(), today.getMonth() + months - 1, 1);
    const newYm = _clampYm(_fcFmtYm(horizonEnd.getFullYear(), horizonEnd.getMonth()+1), curYm, maxHorizonYm);
    _fcParams.horizonToYm = newYm;
    const ht2 = _fcParseYm(newYm);
    document.getElementById('fcHorizY').innerHTML = _buildYearOptions(curYm, maxHorizonYm, ht2.y);
    document.getElementById('fcHorizM').innerHTML = _buildMonthsForYear(ht2.y, curYm, maxHorizonYm, ht2.m);
    _runForecastSaldo();
  };
  document.getElementById('fcPresetHist3').onclick   = () => _applyHistPreset(3);
  document.getElementById('fcPresetHist6').onclick   = () => _applyHistPreset(6);
  document.getElementById('fcPresetHist12').onclick  = () => _applyHistPreset(12);
  document.getElementById('fcPresetHoriz3').onclick  = () => _applyHorizPreset(3);
  document.getElementById('fcPresetHoriz6').onclick  = () => _applyHorizPreset(6);
  document.getElementById('fcPresetHoriz12').onclick = () => _applyHorizPreset(12);
}

// Cuore della Previsione Saldo (modello a decomposizione — "pianificate proiettate avanti"):
//   Saldo futuro = Base oggi
//                + Pianificate proiettate ai VALORI ATTUALI, mese per mese (stipendio, affitto,
//                  abbonamenti, eventi annuali/una-tantum)  → visibili e aggiornate
//                + Spesa variabile tipica dallo storico (SOLO categorie non pianificate, anti
//                  doppio conteggio)  ± banda d'incertezza (∝ √tempo).
// Tutta la parte pesante (espansione pianificate, mediane, esclusione categorie) è in
// Database.getForecastEngine; qui si compone, si spiega ("Come ci arrivo") e si disegna.
async function _runForecastSaldo() {
  const { histMonths, horizonMonths } = _fcDeriveMonths();
  const out = document.getElementById('fcOutput');
  if (!out) return;
  out.innerHTML = '<div style="text-align:center;padding:40px;color:var(--txt2)">Calcolo in corso…</div>';

  const wantNet = _fcShowNetWorth;
  let engine, expSplit;
  try {
    [engine, expSplit] = await Promise.all([
      api.getForecastEngine(histMonths, horizonMonths, wantNet),
      api.getForecastExpenseSplit(histMonths),
    ]);
  } catch (e) {
    out.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${e.message}</p></div>`;
    return;
  }

  const history = engine?.history || [];
  if (history.length < _FC.HIST_MIN) {
    out.innerHTML = `<div class="empty-state"><div class="empty-icon">📊</div><p>Dati insufficienti: servono almeno ${_FC.HIST_MIN} mesi completati.</p></div>`;
    return;
  }

  // ── Storico (per grafico e tabella) ──
  const months   = history.map(r => String(r.ym));
  const incomes  = history.map(r => Number(r.income));
  const expenses = history.map(r => Number(r.expense));
  const nets     = months.map((_, i) => incomes[i] - expenses[i]);

  // ── Componenti dal motore ──
  const dispersion  = Number(engine.dispersion) || 0;
  const variableNet = Number(engine.variable_net) || 0;
  const variableInc = Number(engine.variable_income) || 0;
  const variableExp = Number(engine.variable_expense) || 0;
  const recurring   = engine.recurring || [];
  const lumpyEvents = engine.lumpy_events || [];
  const schedByYm = {};
  for (const s of (engine.scheduled_future || []))
    schedByYm[s.ym] = { rec: Number(s.recurring_net) || 0, lumpy: Number(s.lumpy_net) || 0 };

  // ── Base oggi ──
  // accounts_liquid = somma dei soli conti NON-investment (la liquidità reale). Il valore del
  // portfolio si aggiunge SOLO in modalità patrimonio, così non si conta due volte (i conti
  // investment valgono già il portfolio a mercato).
  const accountsBalance = Number(engine.accounts_liquid) || 0;
  const portfolioToday  = wantNet && engine.portfolio ? Number(engine.portfolio.portfolio_today) : 0;
  const baseToday       = accountsBalance + portfolioToday;

  // ── Eventi portfolio (patrimonio): delta patrimonio netto = amount − market_drop ──
  const portByYm = {};
  if (wantNet && engine.portfolio) for (const ev of (engine.portfolio.events || []))
    portByYm[ev.ym] = (portByYm[ev.ym] || 0) + (Number(ev.amount) - Number(ev.market_drop || 0));

  // ── Ricostruzione saldo storico a ritroso (per il grafico) ──
  const netCurrentPartial = Number(engine.current_partial_net) || 0;
  const balEndLastMonth = accountsBalance - netCurrentPartial + portfolioToday;
  const histBal = new Array(months.length);
  histBal[months.length - 1] = balEndLastMonth;
  for (let i = months.length - 2; i >= 0; i--) histBal[i] = histBal[i+1] - nets[i+1];

  // ── Proiezione fine-mese ──
  const now = new Date();
  const daysInCurMonth    = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  const daysRemaining     = Math.max(0, daysInCurMonth - now.getDate() + 1);
  const fractionRemaining = daysRemaining / daysInCurMonth;

  const projLabels = [], projBal = [], projHigh = [], projLow = [];
  let bal = baseToday, recTotal = 0, lumpyTotal = 0, varTotal = 0, portTotal = 0;
  for (let i = 0; i < horizonMonths; i++) {
    const d  = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const sf = schedByYm[ym] || { rec: 0, lumpy: 0 };
    const varFlow = variableNet * (i === 0 ? fractionRemaining : 1);  // mese corrente prorata
    const port = portByYm[ym] || 0;
    bal += sf.rec + sf.lumpy + varFlow + port;
    recTotal += sf.rec; lumpyTotal += sf.lumpy; varTotal += varFlow; portTotal += port;
    const t = i === 0 ? Math.max(fractionRemaining, 0.0001) : fractionRemaining + i;
    const margin = _FC.Z90 * dispersion * Math.sqrt(t);
    projLabels.push(ym); projBal.push(bal);
    projHigh.push(bal + margin); projLow.push(bal - margin);
  }

  const finalBal   = projBal.at(-1);
  const finalDelta = finalBal - baseToday;
  const finalColor = finalDelta >= 0 ? 'var(--income)' : 'var(--expense)';

  // ── Metriche "mese tipico" (ricorrenti normalizzate + variabile) ──
  let recIncMonthly = 0, recExpMonthly = 0;
  for (const r of recurring) {
    const v = Number(r.monthly_amount) || 0;
    if (r.type === 'income') recIncMonthly += v; else recExpMonthly += -v;
  }
  const typIncome  = recIncMonthly + variableInc;
  const typExpense = recExpMonthly + variableExp;
  const typicalNet = typIncome - typExpense;
  const netColor   = typicalNet >= 0 ? 'var(--income)' : 'var(--expense)';
  const savingsRate = typIncome > 0 ? (typicalNet / typIncome) * 100 : 0;
  const runwayMonths = typicalNet < 0 && baseToday > 0 ? Math.floor(baseToday / -typicalNet) : null;
  const modeLabel  = wantNet ? 'patrimonio netto' : 'saldo conti';

  const signCur = v => (v >= 0 ? '+' : '−') + fmt.currency(Math.abs(v));

  // ── Render ──────────────────────────────────────────────────────────────────
  const heroBg = finalDelta >= 0
    ? 'linear-gradient(135deg, rgba(80,200,120,.10), rgba(80,200,120,.02))'
    : 'linear-gradient(135deg, rgba(240,80,80,.10), rgba(240,80,80,.02))';
  const heroBorder = finalDelta >= 0 ? 'rgba(80,200,120,.35)' : 'rgba(240,80,80,.35)';

  const decRow = (label, value, color, strong) => `
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:16px;padding:7px 0;border-bottom:1px solid var(--border)">
      <span style="${strong?'font-weight:700':'color:var(--txt2)'}">${label}</span>
      <span style="font-variant-numeric:tabular-nums;font-weight:${strong?'700':'600'};${color?`color:${color}`:''};white-space:nowrap">${value}</span>
    </div>`;

  // Sottolista pianificate ricorrenti (stipendio, affitto, abbonamenti…)
  const recListHtml = recurring.length ? `
    <div style="margin:4px 0 10px;padding:8px 10px;background:var(--bg3);border-radius:8px;max-height:180px;overflow-y:auto">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:0 28px">
        ${recurring.map(r => `<div style="display:flex;justify-content:space-between;gap:10px;font-size:12px;padding:2px 0;min-width:0">
          <span style="color:var(--txt2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.description || (r.type==='income'?'Entrata':'Uscita')}</span>
          <span style="font-variant-numeric:tabular-nums;color:${Number(r.monthly_amount)>=0?'var(--income)':'var(--expense)'};white-space:nowrap">${signCur(Number(r.monthly_amount))}/mese</span>
        </div>`).join('')}
      </div>
    </div>` : `<div style="font-size:12px;color:var(--txt3);padding:2px 0 10px">Nessuna pianificata ricorrente attiva.</div>`;

  // Sottolista eventi annuali/una-tantum (datati)
  const lumpyListHtml = lumpyEvents.length ? `
    <div style="margin:4px 0 10px;padding:8px 10px;background:var(--bg3);border-radius:8px;max-height:170px;overflow-y:auto">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:0 28px">
        ${lumpyEvents.map(e => `<div style="display:flex;justify-content:space-between;gap:10px;font-size:12px;padding:2px 0;min-width:0">
          <span style="color:var(--txt2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><b style="color:var(--txt);font-weight:600">${e.ym}</b> · ${e.description||'Evento'}</span>
          <span style="font-variant-numeric:tabular-nums;color:${Number(e.amount)>=0?'var(--income)':'var(--expense)'};white-space:nowrap">${signCur(Number(e.amount))}</span>
        </div>`).join('')}
      </div>
    </div>` : `<div style="font-size:12px;color:var(--txt3);padding:2px 0 10px">Nessun evento annuale/una-tantum nel periodo.</div>`;

  out.innerHTML = `
    <div class="card" style="padding:18px 20px;margin-bottom:16px;background:${heroBg};border-left:4px solid ${heroBorder}">
      <div style="display:flex;flex-wrap:wrap;gap:24px;align-items:center;justify-content:space-between">
        <div style="flex:1;min-width:240px">
          <div style="font-size:11px;color:var(--txt2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">
            ${modeLabel} previsto fra ${horizonMonths} mesi
          </div>
          <div style="font-size:26px;font-weight:700;color:var(--txt);line-height:1.1">${fmt.currency(finalBal)}</div>
          <div style="font-size:13px;color:${finalColor};margin-top:4px;font-weight:600">
            ${finalDelta>=0?'▲ +':'▼ '}${fmt.currency(finalDelta)} vs oggi (${fmt.currency(baseToday)})
          </div>
        </div>
        <div style="text-align:right;min-width:200px">
          <div style="font-size:11px;color:var(--txt2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Range (IC 90%)</div>
          <div style="font-size:15px;font-weight:600;color:var(--txt)">${fmt.currency(projLow.at(-1))} ↔ ${fmt.currency(projHigh.at(-1))}</div>
          <div style="font-size:12px;color:var(--txt2);margin-top:4px">Variabilità mensile ± ${fmt.currency(dispersion)}</div>
        </div>
      </div>
    </div>

    <div class="card" style="padding:16px 18px;margin-bottom:16px">
      <div style="font-size:13px;font-weight:600;margin-bottom:10px">🧩 Come ci arrivo</div>
      ${decRow(`Base oggi (conti${wantNet?' + portfolio':''})`, fmt.currency(baseToday), '', false)}
      ${decRow('Pianificate ricorrenti', signCur(recTotal), recTotal>=0?'var(--income)':'var(--expense)', false)}
      ${recListHtml}
      ${decRow('Eventi annuali / una-tantum', signCur(lumpyTotal), lumpyTotal>=0?'var(--income)':'var(--expense)', false)}
      ${lumpyListHtml}
      ${decRow('Spese variabili tipiche (storico)', signCur(varTotal), varTotal>=0?'var(--income)':'var(--expense)', false)}
      ${wantNet ? decRow('Cedole / rimborsi bond', signCur(portTotal), portTotal>=0?'var(--income)':'var(--expense)', false) : ''}
      ${decRow(`Saldo previsto fra ${horizonMonths} mesi`, fmt.currency(finalBal), 'var(--accent)', true)}
      <div style="font-size:11px;color:var(--txt3);margin-top:8px">
        Le pianificate sono proiettate ai valori attuali (un aumento di stipendio si riflette subito).
        La "spesa variabile" è la mediana dello storico nelle sole categorie NON pianificate: così non
        conta due volte ciò che è già pianificato.
      </div>
    </div>

    <div class="card" style="padding:16px;margin-bottom:16px">
      <div style="font-size:14px;font-weight:600;margin-bottom:14px">Andamento ${modeLabel} — storico &amp; previsione</div>
      <canvas id="fcChartCanvas" style="max-height:340px"></canvas>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:16px">
      ${_fcCard('Flusso tipico/mese', signCur(typicalNet), netColor)}
      ${_fcCard('Entrate tipiche/mese', fmt.currency(typIncome), 'var(--income)')}
      ${_fcCard('Uscite tipiche/mese', fmt.currency(typExpense), 'var(--expense)')}
      ${_fcCard('Tasso di risparmio', savingsRate.toFixed(0)+'%', savingsRate>=0?'var(--income)':'var(--expense)')}
      ${runwayMonths != null ? _fcCard('Autonomia (runway)', runwayMonths+' mesi', 'var(--warn)') : ''}
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
          </div>`).join('');
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
          ${col('Fisse (ogni mese)',   'var(--income)',  fisse)}
          ${col('Periodiche (40-75%)', 'var(--warn)',    periodiche)}
          ${col('Saltuarie (<40%)',    'var(--expense)', saltuarie)}
        </div>
      </div>`;
    })()}

    <div class="card" style="padding:16px">
      <div style="font-size:13px;font-weight:600;color:var(--txt2);margin-bottom:12px">Dettaglio storico mensile</div>
      <div style="overflow-x:auto">
        <table style="width:100%;font-size:12px;border-collapse:collapse">
          <thead><tr style="color:var(--txt2);border-bottom:1px solid var(--border)">
            <th style="padding:6px 8px;text-align:left">Mese</th>
            <th style="padding:6px 8px;text-align:right">Entrate</th>
            <th style="padding:6px 8px;text-align:right">Uscite</th>
            <th style="padding:6px 8px;text-align:right">Flusso netto</th>
            <th style="padding:6px 8px;text-align:right">Saldo stimato</th>
            <th style="padding:6px 8px;text-align:center">Note</th>
          </tr></thead>
          <tbody>
            ${months.map((m, i) => {
              const unusual = dispersion > 0 && Math.abs(nets[i] - (typicalNet)) > 2 * dispersion;
              return `<tr style="border-bottom:1px solid var(--border)">
                <td style="padding:5px 8px;font-weight:600">${m}</td>
                <td style="padding:5px 8px;text-align:right;color:var(--income)">${fmt.currency(incomes[i])}</td>
                <td style="padding:5px 8px;text-align:right;color:var(--expense)">${fmt.currency(expenses[i])}</td>
                <td style="padding:5px 8px;text-align:right;font-weight:600;color:${nets[i]>=0?'var(--income)':'var(--expense)'}">${signCur(nets[i])}</td>
                <td style="padding:5px 8px;text-align:right">${fmt.currency(histBal[i])}</td>
                <td style="padding:5px 8px;text-align:center">${unusual?'<span style="color:var(--warn);font-size:11px" title="Netto lontano dal mese tipico">⚠ insolito</span>':''}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;

  // ── Chart.js ──────────────────────────────────────────────────────────────
  const _savedScrollY = window.scrollY || document.documentElement.scrollTop;
  if (_fcChart) { _fcChart.destroy(); _fcChart = null; }

  const allLabels = [...months, ...projLabels];
  const nHist     = months.length;
  const connPad   = Array(nHist - 1).fill(null);   // null fino al penultimo storico

  const dsHist = [...histBal, ...Array(horizonMonths).fill(null)];
  const dsHigh = [...connPad, balEndLastMonth, ...projHigh];
  const dsLow  = [...connPad, balEndLastMonth, ...projLow];
  const dsProj = [...connPad, balEndLastMonth, ...projBal];

  const _allY = [...histBal, ...projBal, ...projHigh, ...projLow].filter(v => v != null && Number.isFinite(v));
  const yMin = Math.min(..._allY), yMax = Math.max(..._allY);
  const yPad = Math.max(50, (yMax - yMin) * 0.07);

  const _css       = getComputedStyle(document.documentElement);
  const _accentCol = _css.getPropertyValue('--accent').trim() || '#4a9eff';
  const _txt2Col   = _css.getPropertyValue('--txt2').trim()   || '#888';

  const todayLinePlugin = {
    id: 'fcTodayLine',
    afterDatasetsDraw(chart) {
      const xS = chart.scales.x, yS = chart.scales.y;
      if (!xS || !yS) return;
      const xPos = (xS.getPixelForValue(nHist - 1) + xS.getPixelForValue(nHist)) / 2;
      const c = chart.ctx;
      c.save();
      c.beginPath(); c.setLineDash([4, 4]); c.strokeStyle = _accentCol; c.lineWidth = 1.2;
      c.moveTo(xPos, yS.top); c.lineTo(xPos, yS.bottom); c.stroke();
      c.setLineDash([]); c.fillStyle = _accentCol; c.font = '11px sans-serif';
      c.fillText('oggi', xPos + 4, yS.top + 12);
      c.restore();
    },
  };

  const ctx = document.getElementById('fcChartCanvas').getContext('2d');
  _fcChart = new Chart(ctx, {
    type: 'line',
    plugins: [todayLinePlugin],
    data: {
      labels: allLabels,
      datasets: [
        { label: 'Saldo storico', data: dsHist, borderColor: _txt2Col, borderWidth: 2,
          backgroundColor: 'transparent', pointRadius: 3, tension: 0.3, spanGaps: false, fill: false },
        { label: '_ciHigh', data: dsHigh, borderColor: 'transparent',
          backgroundColor: 'rgba(120,180,255,0.28)', pointRadius: 0, tension: 0.3, spanGaps: false, fill: 2 },
        { label: '_ciLow', data: dsLow, borderColor: 'transparent',
          backgroundColor: 'transparent', pointRadius: 0, tension: 0.3, spanGaps: false, fill: false },
        { label: 'Saldo previsto', data: dsProj, borderColor: _accentCol, borderWidth: 2.5,
          borderDash: [6,4], backgroundColor: 'transparent', pointRadius: 3, tension: 0.3, spanGaps: false, fill: false },
      ],
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: 'var(--txt)', filter: item => !item.text.startsWith('_') } },
        tooltip: { callbacks: { label: ctx => {
          if (ctx.dataset.label.startsWith('_')) return null;
          const v = ctx.parsed.y;
          return v == null ? null : `${ctx.dataset.label}: ${fmt.currency(v)}`;
        } } },
      },
      scales: {
        x: { ticks: { color:'var(--txt2)', maxTicksLimit:14 }, grid:{ color:'var(--border)' } },
        y: { ticks: { color:'var(--txt2)', callback: v => fmt.currency(v) }, grid:{ color:'var(--border)' },
             suggestedMin: yMin - yPad, suggestedMax: yMax + yPad },
      },
    },
  });
  if (_savedScrollY > 0) requestAnimationFrame(() => window.scrollTo(0, _savedScrollY));
}


// ── Helper UI ─────────────────────────────────────────────────────────────────
// Helper di rendering per la Previsione Saldo: _fcCard = card riepilogativa (metrica chiave).
function _fcCard(label, value, color) {
  return `<div class="card" style="padding:14px 16px">
    <div style="font-size:11px;color:var(--txt2);margin-bottom:4px">${label}</div>
    <div style="font-size:16px;font-weight:700;color:${color}">${value}</div>
  </div>`;
}
