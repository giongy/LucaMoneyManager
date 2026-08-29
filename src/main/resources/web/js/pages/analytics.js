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

// Stato Previsione Saldo (era in transactions.js con FIXME)
// histFromYm   = primo mese dello storico (incluso) → fino al mese precedente al corrente
// horizonToYm  = ultimo mese della proiezione (incluso) → mese corrente o successivi
// Valori derivati a runtime via _fcDeriveMonths() — l'utente sceglie le date,
// noi calcoliamo quanti mesi richiedere al backend.
let _fcChart          = null;
let _fcRunGen         = 0;           // generazione della richiesta forecast in corso: scarta le
                                     // risposte superate da un click più recente sull'orizzonte
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

// ── Guard centrale contro race condition + blocco su "Caricamento…" ─────────
// Le funzioni renderAnalytics* sono async: scrivono "Caricamento…", fanno await su
// chiamate Java lente, poi disegnano. Cambiando periodo/tab rapidamente si sovrappongono
// più render sullo stesso contenitore, e se una await lancia (es. connessione DB chiusa a
// metà per la sync OneDrive, o un getElementById null perché il DOM è stato sostituito)
// la funzione muore DOPO "Caricamento…" ma PRIMA del contenuto → la tab resta bloccata.
//
// _analyticsRenderToken identifica l'ultimo render richiesto: ogni nuovo render lo incrementa.
// Le funzioni render, dopo ogni await, chiamano _analyticsRenderStale(token): se un render più
// recente è partito nel frattempo, si fermano senza toccare il DOM ("ultima richiesta vince").
// _runAnalyticsRender avvolge la chiamata in un try/catch che, in errore, mostra un messaggio
// nel contenitore invece di lasciare "Caricamento…" a tempo indeterminato.
let _analyticsRenderToken = 0;

// True se il render identificato da `token` non è più quello corrente (ne è partito uno più
// recente): la funzione chiamante deve interrompersi senza scrivere sul DOM.
function _analyticsRenderStale(token) { return token !== _analyticsRenderToken; }

// Esegue una funzione render (sync o async) sotto guard: assegna un token fresco e cattura
// ogni eccezione, mostrando l'errore nel contenitore invece di lasciare "Caricamento…".
function _runAnalyticsRender(fn) {
  const token = ++_analyticsRenderToken;
  Promise.resolve()
    .then(() => fn(token))
    .catch(e => {
      // Solo se questo è ancora il render corrente: non sovrascrivere un render più recente
      // già in corso con l'errore di uno vecchio.
      if (_analyticsRenderStale(token)) return;
      const el = document.getElementById('analyticsContent');
      if (el) el.innerHTML = `<p style="padding:20px;color:var(--expense)">Errore nel caricamento: ${(e && e.message) || e}</p>`;
    });
}

// Dispatcher: renderizza la tab Analytics attiva nel contenitore #analyticsContent.
function _renderCurrentAnalyticsTab() {
  // Svuota la toolbar fissa: solo alcune tab (es. Categorie/Mese) la ripopolano
  const _tb = document.getElementById('analyticsToolbar');
  if (_tb) _tb.innerHTML = '';
  _runAnalyticsRender(token => {
    if (_analyticsTab === 'balance')     return renderAnalyticsBalance(token);
    else if (_analyticsTab === 'trend')      return renderAnalyticsTrend(token);
    else if (_analyticsTab === 'health')     return renderAnalyticsHealth(token);
    else if (_analyticsTab === 'forecast')   return renderAnalyticsForecast(token);
    else if (_analyticsTab === 'accbalance') return renderAnalyticsAccBalance(token);
    else if (_analyticsTab === 'nature')     return renderNatureReport(token);
    else if (_analyticsTab === 'catcompare') return renderAnalyticsCatCompare(token);
    else return renderAnalyticsCatMonth(token);
  });
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
        <button class="sched-tab${_analyticsTab==='balance'?' active':''}" data-atab="balance" onclick="_setAnalyticsTab('balance',this)">⚖️ Bilancio Mensile</button>
        <button class="sched-tab${_analyticsTab==='catcompare'?' active':''}" data-atab="catcompare" onclick="_setAnalyticsTab('catcompare',this)">🆚 Confronto Periodi</button>
        <button class="sched-tab${_analyticsTab==='trend'?' active':''}" data-atab="trend" onclick="_setAnalyticsTab('trend',this)">📈 Andamento Categoria</button>
        <button class="sched-tab${_analyticsTab==='catmonth'?' active':''}" data-atab="catmonth" onclick="_setAnalyticsTab('catmonth',this)">🗂️ Categorie / Mese</button>
        <button class="sched-tab${_analyticsTab==='accbalance'?' active':''}" data-atab="accbalance" onclick="_setAnalyticsTab('accbalance',this)">🏦 Saldo Conti</button>
        <button class="sched-tab${_analyticsTab==='forecast'?' active':''}" data-atab="forecast" onclick="_setAnalyticsTab('forecast',this)">📊 Previsione Saldo</button>
        <button class="sched-tab${_analyticsTab==='nature'?' active':''}" data-atab="nature" onclick="_setAnalyticsTab('nature',this)">🌿 Natura Spese</button>
      </div>
      <div id="aDateControls" style="${(_analyticsTab==='forecast'||_analyticsTab==='catcompare')?'display:none':'display:flex'};gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px;padding:8px 10px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;flex-shrink:0"></div>
      <div id="analyticsToolbar" style="flex-shrink:0"></div>
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

  wrap.style.display = (_analyticsTab === 'forecast' || _analyticsTab === 'catcompare') ? 'none' : 'flex';
  if (_analyticsTab === 'catcompare') return;  // questa tab ha controlli propri nel contenuto

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
          <span style="font-size:12px;font-weight:600;color:var(--purple)">Periodo B</span>
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
      _renderCurrentAnalyticsTab();
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
  _renderCurrentAnalyticsTab();
};

// Cambia la tab Analytics attiva, aggiorna i controlli periodo e renderizza la tab.
window._setAnalyticsTab = (tab, btn) => {
  _analyticsTab = tab;
  document.querySelectorAll('[data-atab]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  _renderAnalyticsControls();
  _renderCurrentAnalyticsTab();
};

// Dal Confronto Periodi → tab "Andamento Categoria": apre l'andamento della categoria cliccata,
// impostando il periodo da inizio Periodo B a fine Periodo A (l'intera finestra confrontata).
// Usato dal link sul nome categoria nella tabella Confronto Periodi.
window._catCmpToTrend = (catId) => {
  _analyticsTrendCatId = catId;
  // Periodo del trend (granularità mensile): mese di inizio B → mese di fine A
  _analyticsStartYm = _catCmpB.startDate.slice(0, 7);
  _analyticsEndYm   = _catCmpA.endDate.slice(0, 7);
  _analyticsTab = 'trend';
  document.querySelectorAll('[data-atab]').forEach(b => b.classList.toggle('active', b.dataset.atab === 'trend'));
  _renderAnalyticsControls();
  _renderCurrentAnalyticsTab();
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
  _renderCurrentAnalyticsTab();
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
// token: identifica questo render; dopo l'await ci si ferma se ne è partito uno più recente.
async function renderAnalyticsCatMonth(token) {
  const el = document.getElementById('analyticsContent');
  if (!el) return;
  el.innerHTML = '<p style="padding:20px;color:var(--txt2)">Caricamento…</p>';

  const { fetchMonths, monthCols } = _analyticsMonthRange();
  const rows = await api.getCategoryMonthTable(fetchMonths);
  if (_analyticsRenderStale(token)) return;  // periodo/tab cambiato durante l'await: annulla

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
      if (col === 'name') {
        // Ordina prima per macrocategoria, poi per categoria (coerente col default a col===null)
        const pc = (a.parent_name || '').localeCompare(b.parent_name || '');
        return dir * (pc || a.name.localeCompare(b.name));
      }
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
        <td class="analytics-cat-name">${c.parent_name ? `<span style="color:var(--txt3);font-size:11px">${esc(c.parent_name)} ›</span> ` : ''}<span style="color:${esc(c.color)}">${esc(c.icon)}</span> ${esc(c.name)}</td>
        ${monthCols.map(m => `<td class="text-right">${c.m[m.ym] ? fmt.currency(c.m[m.ym]) : '<span style="color:var(--txt3)">—</span>'}</td>`).join('')}
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

  // Toolbar FISSA (fuori dall'area scrollabile) col pulsante export
  const toolbar = document.getElementById('analyticsToolbar');
  if (toolbar) toolbar.innerHTML = `
    <div style="display:flex;justify-content:flex-end;margin-bottom:8px">
      <button class="btn btn-xs btn-ghost" onclick="_exportCatMonthPdf()" title="Salva la tabella come pagina HTML e aprila nel browser (es. Edge su un secondo schermo). Da lì puoi anche stampare in PDF.">🖥️ Apri in browser</button>
    </div>`;

  el.innerHTML = `
    <table class="analytics-table sticky-first-col">
      <thead><tr>
        <th class="analytics-cat-name" style="${thStyle}" onclick="_sortAnalyticsCat('name')">Categoria${arrow('name')}</th>
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

// Esporta la tabella Categorie/Mese come pagina HTML autonoma salvata su disco e aperta nel
// browser predefinito (es. Edge). Serve come riferimento di sola lettura su un secondo schermo
// mentre si modificano budget/pianificate nell'app. Rispetta l'ordinamento corrente. Nome file
// fisso → riscrittura in-place: dopo aver cambiato i dati, ripremi il pulsante e in Edge fai F5.
// Nessuna dipendenza esterna. (La pagina include un pulsante Stampa → "Salva come PDF".)
window._exportCatMonthPdf = () => {
  if (!_analyticsCatCache) return;
  const { monthCols, catMap } = _analyticsCatCache;
  const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const catTotal = c => monthCols.reduce((s, m) => s + (c.m[m.ym] || 0), 0);
  // Stesso ordinamento della tabella a schermo
  const sortCats = arr => {
    const { col, dir } = _analyticsCatSort;
    if (col === null) return [...arr].sort((a, b) => {
      const pa = a.parent_name || a.name, pb = b.parent_name || b.name;
      return pa.localeCompare(pb) || a.name.localeCompare(b.name);
    });
    return [...arr].sort((a, b) => {
      if (col === 'name') {
        // Ordina prima per macrocategoria, poi per categoria (coerente col default a col===null)
        const pc = (a.parent_name || '').localeCompare(b.parent_name || '');
        return dir * (pc || a.name.localeCompare(b.name));
      }
      if (col === 'total' || col === 'avg') return dir * (catTotal(a) - catTotal(b));
      const ym = monthCols[col]?.ym;
      return dir * ((a.m[ym] || 0) - (b.m[ym] || 0));
    });
  };
  const expenses = sortCats(Object.values(catMap).filter(c => c.type === 'expense'));
  const incomes  = sortCats(Object.values(catMap).filter(c => c.type === 'income'));

  const money = v => fmt.currency(v);
  const section = (cats, label) => {
    if (!cats.length) return '';
    let h = `<tr class="sec"><td colspan="${monthCols.length + 3}">${label}</td></tr>`;
    for (const c of cats) {
      const total = catTotal(c), avg = total / monthCols.length;
      h += `<tr>
        <td class="cat">${c.parent_name ? `<span class="par">${esc(c.parent_name)} › </span>` : ''}${esc(c.name)}</td>
        ${monthCols.map(m => `<td class="num">${c.m[m.ym] ? money(c.m[m.ym]) : '—'}</td>`).join('')}
        <td class="num tot">${money(total)}</td>
        <td class="num avg">${money(avg)}</td>
      </tr>`;
    }
    const colTotals = monthCols.map(m => cats.reduce((s, c) => s + (c.m[m.ym] || 0), 0));
    const grand = colTotals.reduce((a, b) => a + b, 0);
    h += `<tr class="sub">
      <td>Totale ${label}</td>
      ${colTotals.map(t => `<td class="num">${money(t)}</td>`).join('')}
      <td class="num tot">${money(grand)}</td>
      <td class="num avg">${money(monthCols.length ? grand / monthCols.length : 0)}</td>
    </tr>`;
    return h;
  };

  const period = monthCols.length ? `${monthCols[0].label} → ${monthCols[monthCols.length-1].label}` : '';
  const genOn = new Date().toLocaleString('it-IT', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' });

  // Documento autonomo: leggibile a schermo (secondo monitor) e stampabile in PDF.
  // Colori neutri, orientamento orizzontale in stampa, intestazione ripetuta a ogni pagina.
  const doc = `<!doctype html><html lang="it"><head><meta charset="utf-8">
    <title>Categorie / Mese — ${esc(period)}</title>
    <style>
      @page { size: landscape; margin: 12mm; }
      * { box-sizing: border-box; }
      body { font-family: 'Segoe UI', system-ui, sans-serif; color:#1a1a1a; margin:0; padding:18px 22px; background:#fafafa; }
      .top { display:flex;align-items:flex-start;gap:16px;margin-bottom:12px }
      h1 { font-size:18px; margin:0 0 2px; }
      .meta { font-size:12px; color:#666; }
      .actions { margin-left:auto; display:flex; gap:8px; }
      .actions button { font:inherit; font-size:12px; padding:6px 12px; border:1px solid #bbb; border-radius:6px; background:#fff; cursor:pointer; }
      .actions button:hover { background:#eee; }
      .hint { font-size:11px; color:#999; margin:2px 0 0; }
      table { width:100%; border-collapse:collapse; font-size:11px; background:#fff; }
      thead th { background:#eee; border-bottom:2px solid #999; padding:5px 7px; text-align:right; white-space:nowrap; position:sticky; top:0; }
      thead th:first-child { text-align:left; }
      td { padding:3px 7px; border-bottom:1px solid #ddd; }
      td.cat { text-align:left; white-space:nowrap; }
      td.num { text-align:right; white-space:nowrap; font-variant-numeric:tabular-nums; }
      td.tot { font-weight:700; border-left:1px solid #bbb; }
      td.avg { font-weight:700; }
      .par { color:#888; }
      tr.sec td { background:#ddd; font-weight:700; text-transform:uppercase; font-size:10px; letter-spacing:.04em; padding:5px 7px; }
      tr.sub td { font-weight:700; background:#f0f0f0; border-top:2px solid #999; }
      thead { display:table-header-group; }
      tr { page-break-inside:avoid; }
      @media print { .actions, .hint { display:none; } body { padding:0; background:#fff; } thead th { position:static; } }
    </style></head><body>
    <div class="top">
      <div>
        <h1>Categorie / Mese</h1>
        <div class="meta">Periodo ${esc(period)} · ${monthCols.length} mesi</div>
        <div class="meta">Generato il ${esc(genOn)}</div>
        <p class="hint">Riferimento di sola lettura. Dopo aver modificato i dati nell'app, ripremi «Apri in browser» e premi F5 qui per aggiornare.</p>
      </div>
      <div class="actions">
        <button onclick="location.reload()">🔄 Aggiorna (F5)</button>
        <button onclick="window.print()">🖨️ Stampa / Salva PDF</button>
      </div>
    </div>
    <table>
      <thead><tr>
        <th>Categoria</th>
        ${monthCols.map(m => `<th>${esc(m.label)}</th>`).join('')}
        <th>Totale</th><th>Media/mese</th>
      </tr></thead>
      <tbody>${section(expenses,'Uscite')}${section(incomes,'Entrate')}</tbody>
    </table>
  </body></html>`;

  // Salva il file HTML su disco e aprilo col browser predefinito (es. Edge): l'utente lo tiene
  // su un secondo schermo come riferimento mentre modifica budget/pianificate nell'app.
  // Nome file fisso → riscrittura in-place: dopo aver cambiato i dati, ripremi Esporta e in Edge fai F5.
  api.exportHtmlReport(doc, 'categorie-mese.html').then(res => {
    if (res && res.error) alert('Export non riuscito: ' + res.error);
  });
};

/* ─── Analytics: Confronto Periodi (macrocategorie A vs B, con drill-down) ─────
   Confronta lo stesso insieme di macrocategorie fra due intervalli di tempo.
   L'utente sceglie il Periodo A; il Periodo B viene inizializzato allo stesso
   periodo dell'anno precedente e resta poi liberamente modificabile.
   Ogni riga si apre col chevron ▶ (o doppio click) mostrando le sue categorie,
   come le righe padre del Budget. */

// Stato dedicato (indipendente dal confronto Bilancio Mensile).
// A differenza degli altri tab Analytics (granularità mensile), qui i periodi hanno
// granularità al GIORNO: startDate/endDate sono stringhe "YYYY-MM-DD".
let _catCmpA       = null;             // { startDate, endDate } — periodo principale
let _catCmpB       = null;             // { startDate, endDate } — periodo di confronto
let _catCmpSort    = { col: 'delta', dir: -1 };  // col: 'name'|'a'|'b'|'delta'|'pct'
let _catCmpCache   = null;             // righe a livello macrocategoria (le righe della tabella)
let _catCmpDetail  = null;             // righe a livello categoria — contenuto del drill-down
let _catCmpOpen    = new Set();        // id delle macrocategorie espanse (come le righe padre del Budget)

// Sposta una data "YYYY-MM-DD" di N anni tenendo lo stesso giorno/mese.
// Il 29/02 in un anno non bisestile viene normalizzato al 28/02 (JS Date lo fa da sé
// se costruito via componenti, ma qui lavoriamo sulle stringhe: gestione esplicita).
function _shiftDateByYears(dateStr, yearDelta) {
  const y = parseInt(dateStr.slice(0,4)) + yearDelta;
  let md = dateStr.slice(5);  // "MM-DD"
  if (md === '02-29') {
    const bis = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    if (!bis) md = '02-28';
  }
  return `${y}-${md}`;
}

// Data odierna "YYYY-MM-DD"
function _todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// Inizializza i due periodi la prima volta: A = dall'inizio dell'anno corrente a oggi,
// B = stessi giorni dell'anno precedente.
function _catCmpInitDefaults() {
  if (!_catCmpA) {
    const today = _todayIso();
    const startDate = `${today.slice(0,4)}-01-01`;  // 1° gennaio dell'anno corrente
    const endDate   = today;
    _catCmpA = { startDate, endDate };
    _catCmpB = { startDate: _shiftDateByYears(startDate, -1), endDate: _shiftDateByYears(endDate, -1) };
  }
}

// Tab "Confronto Periodi": disegna i controlli (i 2 periodi, con date complete) e la
// tabella. Le date sono selezionabili al giorno tramite <input type="date">.
async function renderAnalyticsCatCompare(token) {
  const el = document.getElementById('analyticsContent');
  if (!el) return;
  _catCmpInitDefaults();

  // Limiti dei date picker: dal primo giorno del mese più vecchio in DB a oggi
  const minDate = _analyticsOldestYm ? `${_analyticsOldestYm}-01` : '';
  const maxDate = _todayIso();
  const dateInput = (id, val) => `<input type="date" class="form-control" id="${id}" value="${val}"
        ${minDate?`min="${minDate}"`:''} max="${maxDate}" style="font-size:12px;padding:3px 6px">`;

  // ⚠️ white-space:nowrap sulle etichette: senza, "Periodo A"/"Periodo B" vanno a capo
  // appena la barra si stringe e le pillole diventano alte il doppio, sfasando in verticale
  // tutta la riga dei controlli.
  const lbl = 'font-size:12px;color:var(--txt2);white-space:nowrap';
  el.innerHTML = `
    <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:12px;padding:8px 10px;background:var(--bg2);border:1px solid var(--border);border-radius:8px">
      <div style="display:flex;gap:4px;align-items:center;background:rgba(106,183,255,.10);border:1px solid rgba(106,183,255,.35);padding:4px 8px;border-radius:6px">
        <span style="font-size:12px;font-weight:600;color:var(--accent);white-space:nowrap">Periodo A</span>
        <label style="${lbl}">Da</label>
        ${dateInput('ccAStart', _catCmpA.startDate)}
        <label style="${lbl}">A</label>
        ${dateInput('ccAEnd', _catCmpA.endDate)}
      </div>
      <span style="color:var(--txt3);font-weight:700">vs</span>
      <div style="display:flex;gap:4px;align-items:center;background:rgba(188,140,255,.10);border:1px solid rgba(188,140,255,.35);padding:4px 8px;border-radius:6px">
        <span style="font-size:12px;font-weight:600;color:var(--purple);white-space:nowrap">Periodo B</span>
        <label style="${lbl}">Da</label>
        ${dateInput('ccBStart', _catCmpB.startDate)}
        <label style="${lbl}">A</label>
        ${dateInput('ccBEnd', _catCmpB.endDate)}
      </div>
      <button class="btn btn-xs btn-ghost hidden" id="ccExpandAll" onclick="_catCmpToggleAll()"
              style="margin-left:auto;white-space:nowrap"></button>
    </div>
    <div id="ccTable"><p style="padding:20px;color:var(--txt2)">Caricamento…</p></div>`;

  // Handler dei date picker. isA=true: cambiando il Periodo A si ri-aggancia B agli stessi
  // giorni dell'anno precedente (comodità richiesta), poi l'utente può modificarlo a mano.
  const readPeriod = (p) => ({
    startDate: document.getElementById('cc'+p+'Start').value,
    endDate:   document.getElementById('cc'+p+'End').value,
  });
  const onChange = (isA) => {
    _catCmpA = readPeriod('A');
    _catCmpB = readPeriod('B');
    // Se una data è vuota (input svuotato) o start > end, non ricaricare: aspetta un input valido
    if (!_catCmpA.startDate || !_catCmpA.endDate || !_catCmpB.startDate || !_catCmpB.endDate) return;
    if (_catCmpA.endDate < _catCmpA.startDate) _catCmpA.endDate = _catCmpA.startDate;
    if (_catCmpB.endDate < _catCmpB.startDate) _catCmpB.endDate = _catCmpB.startDate;
    if (isA) {
      // Auto-aggancio di B agli stessi giorni, anno precedente
      _catCmpB = { startDate: _shiftDateByYears(_catCmpA.startDate, -1), endDate: _shiftDateByYears(_catCmpA.endDate, -1) };
    }
    // Token fresco via _runAnalyticsRender: annulla eventuali render precedenti ancora in await
    _runAnalyticsRender(t => renderAnalyticsCatCompare(t));  // ridisegna controlli (B aggiornato) + tabella
  };
  ['ccAStart','ccAEnd'].forEach(id => document.getElementById(id).onchange = () => onChange(true));
  ['ccBStart','ccBEnd'].forEach(id => document.getElementById(id).onchange = () => onChange(false));

  // Due letture dello stesso confronto: le macrocategorie (le righe della tabella) e le
  // categorie (il contenuto dei drill-down). Il dettaglio si carica subito insieme alle
  // macro, non alla prima apertura: così il chevron risponde all'istante e non serve uno
  // stato "in caricamento" dentro la tabella.
  const rows = await api.getCategoryComparison(
    _catCmpA.startDate, _catCmpA.endDate,
    _catCmpB.startDate, _catCmpB.endDate, 'parent');
  if (_analyticsRenderStale(token)) return;  // periodo/tab cambiato durante l'await: annulla
  const detail = await api.getCategoryComparison(
    _catCmpA.startDate, _catCmpA.endDate,
    _catCmpB.startDate, _catCmpB.endDate, 'category');
  if (_analyticsRenderStale(token)) return;
  _catCmpCache  = rows;
  _catCmpDetail = detail;
  _renderCatCmpTable();
}

// Allinea il bottone "Espandi/Comprimi tutto" allo stato di apertura corrente.
// Il bottone vive nella barra dei controlli, che viene disegnata UNA volta per periodo,
// mentre lo stato cambia a ogni click sui chevron: senza questa sincronizzazione (chiamata
// da _renderCatCmpTable, cioè a ogni ridisegno della tabella) l'etichetta resterebbe
// indietro. Si nasconde se non c'è niente da espandere.
function _catCmpSyncExpandBtn() {
  const btn = document.getElementById('ccExpandAll');
  if (!btn) return;
  const expandable = (_catCmpCache || []).filter(r => _catCmpHasKids(r.id));
  btn.classList.toggle('hidden', expandable.length === 0);
  if (!expandable.length) return;
  const allOpen = expandable.every(r => _catCmpOpen.has(r.id));
  btn.textContent = allOpen ? '▲ Comprimi tutto' : '▼ Espandi tutto';
  btn.title = `${allOpen ? 'Chiude' : 'Apre'} il dettaglio di tutte le macrocategorie`;
}

// Apre o chiude tutte le macrocategorie in un colpo solo (come il comando omonimo del
// Budget): se sono già tutte aperte il comando chiude, altrimenti apre tutto.
window._catCmpToggleAll = () => {
  const ids = (_catCmpCache || []).map(r => r.id).filter(id => _catCmpHasKids(id));
  if (ids.length && ids.every(id => _catCmpOpen.has(id))) _catCmpOpen.clear();
  else ids.forEach(id => _catCmpOpen.add(id));
  _renderCatCmpTable();
};

// Dettaglio (categorie) di una macrocategoria. Una transazione registrata direttamente
// sulla macro produce una riga con parent_id nullo e id uguale a quello della macro:
// finisce sotto sé stessa, ed è corretto — è la quota non ripartita del suo totale.
// Se però quella riga è l'UNICO dettaglio non c'è niente da aprire: ripeterebbe la
// riga padre. Da qui passano sia il chevron che "Espandi tutto", che devono essere
// d'accordo su quali macro siano espandibili.
function _catCmpKidsOf(id) {
  const k = (_catCmpDetail || []).filter(d => (d.parent_id || d.id) === id);
  return (k.length === 1 && k[0].id === id) ? [] : k;
}
const _catCmpHasKids = id => _catCmpKidsOf(id).length > 0;

// Categorie che compongono il totale di una riga macro: la macro stessa più tutte le figlie che
// hanno movimenti nella finestra confrontata. Serve al drill-down verso Transazioni, il cui filtro
// per categoria NON discende la gerarchia: passando il solo id della macro si vedrebbero le sole
// transazioni registrate direttamente su di essa e l'elenco non sommerebbe al numero cliccato.
// (Sulle righe di dettaglio l'id è già quello giusto da solo: vedi la chiamata in renderSection.)
function _catCmpDrillIds(id) {
  const kids = (_catCmpDetail || []).filter(d => (d.parent_id || d.id) === id).map(d => d.id);
  return [...new Set([id, ...kids])];
}

// Dal Confronto Periodi → Transazioni: elenco filtrato sulle categorie della riga e sul periodo
// della colonna cliccata (A o B). Gli id arrivano già risolti da chi disegna la riga, così la
// stessa funzione serve righe macro e righe di dettaglio senza dover indovinare quale sia quale
// (una macro con movimenti registrati direttamente su di sé compare in entrambi i livelli con
// lo stesso id, e i due click devono filtrare in modo diverso).
window._catCmpToTx = (ids, period) => {
  const p = period === 'B' ? _catCmpB : _catCmpA;
  if (!p || !ids?.length) return;
  navigateToCategoryTx(ids.length === 1 ? ids[0] : ids, p.startDate, p.endDate);
};

// Apre/chiude il dettaglio categorie di una macrocategoria. Le macro aperte restano
// tali al cambio di periodo (gli id non cambiano): si confrontano più periodi sullo
// stesso drill-down senza doverlo riaprire ogni volta.
window._catCmpToggle = id => {
  if (_catCmpOpen.has(id)) _catCmpOpen.delete(id);
  else _catCmpOpen.add(id);
  _renderCatCmpTable();
};

// Cambia colonna/direzione di ordinamento della tabella Confronto Periodi e ridisegna.
window._sortCatCmp = col => {
  if (_catCmpSort.col === col) _catCmpSort.dir *= -1;
  else { _catCmpSort.col = col; _catCmpSort.dir = -1; }
  _renderCatCmpTable();
};

// Disegna la tabella del Confronto Periodi da _catCmpCache: una sezione Uscite e una Entrate,
// con Δ valore e Δ %. Il verde/rosso segue il verso giusto per sezione: per le uscite è
// buono calare, per le entrate è buono crescere.
function _renderCatCmpTable() {
  const el = document.getElementById('ccTable');
  if (!el || !_catCmpCache) return;

  const dPct = (a, b) => b ? ((a - b) / Math.abs(b)) * 100 : null;  // null se base B = 0 (crescita indefinita)

  // Date dei due periodi in chiaro: finiscono nel tooltip degli importi cliccabili, così prima
  // di lasciare la pagina si sa su quale finestra si sta per atterrare.
  const periodLabelA = `${fmt.date(_catCmpA.startDate)} → ${fmt.date(_catCmpA.endDate)}`;
  const periodLabelB = `${fmt.date(_catCmpB.startDate)} → ${fmt.date(_catCmpB.endDate)}`;

  // Asterisco "straordinari": la voce contiene almeno un movimento marcato 🎯 straordinario
  // (tag di sistema `oneoff`) in uno dei due periodi. È la risposta alla domanda che nasce
  // guardando un +27.737%: cambio di abitudine o episodio isolato? Il tooltip dice quanta parte
  // del totale è episodica, e in quale periodo.
  // ⚠️ Annota, non corregge: total_a/total_b restano comprensivi degli straordinari, perché
  // quei soldi si sono mossi davvero (stessa regola di `notOneoff` lato Java).
  const oneoffMark = r => {
    const oa = Number(r.oneoff_a) || 0, ob = Number(r.oneoff_b) || 0;
    if (!oa && !ob) return '';
    const parts = [];
    if (oa) parts.push(`Periodo A ${fmt.currency(oa)}`);
    if (ob) parts.push(`Periodo B ${fmt.currency(ob)}`);
    return `<span class="cc-oneoff" title="Di cui movimenti straordinari 🎯 — ${parts.join(' · ')}">*</span>`;
  };

  const sortRows = arr => {
    const { col, dir } = _catCmpSort;
    return [...arr].sort((x, y) => {
      // Righe macro e righe figlie non si mescolano mai (sortRows è chiamata separatamente
      // sulle une e sulle altre), quindi il confronto per nome basta a sé stesso.
      if (col === 'name') return dir * String(x.name).localeCompare(String(y.name));
      if (col === 'a')    return dir * (x.total_a - y.total_a);
      if (col === 'b')    return dir * (x.total_b - y.total_b);
      if (col === 'delta')return dir * ((x.total_a - x.total_b) - (y.total_a - y.total_b));
      if (col === 'pct') {
        // I null (base zero) finiscono sempre in fondo, indipendentemente dalla direzione
        const px = dPct(x.total_a, x.total_b), py = dPct(y.total_a, y.total_b);
        if (px == null && py == null) return 0;
        if (px == null) return 1;
        if (py == null) return -1;
        return dir * (px - py);
      }
      return 0;
    });
  };

  const arrow = col => {
    if (_catCmpSort.col !== col) return ' <span style="color:var(--txt3);font-size:10px;user-select:none">⇅</span>';
    return _catCmpSort.dir === -1 ? ' ↓' : ' ↑';
  };
  const thS = 'cursor:pointer;user-select:none';

  const renderSection = (rows, label, isExpense) => {
    if (!rows.length) return '';
    const sorted = sortRows(rows);
    const totA = rows.reduce((s,r)=>s+r.total_a, 0);
    const totB = rows.reduce((s,r)=>s+r.total_b, 0);
    const totDelta = totA - totB, totPct = dPct(totA, totB);

    // Scala della barra: max |Δ%| dell'insieme confrontato (come nel tab Scostamenti del
    // budget), così la barra riempie proporzionalmente. I null (base B=0) non entrano.
    // ⚠️ La barra confronta sempre righe dello STESSO livello: le macro fra macro, e le
    // figlie di una macro fra sorelle (scala locale, ricalcolata per ogni drill-down).
    // Mettere tutti i livelli sulla stessa scala sembra più coerente ma non lo è: basta
    // una figlia esplosa (+27.000% su una base quasi nulla) per azzerare visivamente ogni
    // altra barra della sezione. La domanda che la barra deve saper rispondere è "chi si è
    // mosso di più fra questi", e "questi" cambia a seconda del livello che si sta leggendo.
    const scaleOf = arr => Math.max(1, ...arr.map(r => { const p = dPct(r.total_a, r.total_b); return p==null ? 0 : Math.abs(p); }));
    const maxPct = scaleOf(rows);

    // Cella "Δ %": numero + barra ancorata a destra, verde se virtuoso / rosso altrimenti.
    const pctCell = (pct, good, scale = maxPct) => {
      const col = pct==null ? 'var(--txt3)' : (good ? 'var(--income)' : 'var(--expense)');
      const barBg = good ? 'rgba(63,185,80,.65)' : 'rgba(248,81,73,.65)';
      const barW  = pct==null ? 0 : Math.min(100, Math.abs(pct)/scale*100).toFixed(1);
      const pctStr = pct==null ? '—' : (pct>=0?'+':'')+pct.toFixed(1)+'%';
      return `<td>
        <div class="flex-center-8">
          <div style="flex:1;height:14px;background:var(--bg3);border-radius:3px;overflow:hidden;position:relative;min-width:80px">
            ${pct==null?'':`<div style="position:absolute;right:0;top:0;height:100%;width:${barW}%;background:${barBg};border-radius:3px"></div>`}
          </div>
          <span style="font-size:12px;color:${col};min-width:56px;text-align:right;font-weight:600">${pctStr}</span>
        </div>
      </td>`;
    };

    // Nome: icona colorata + nome (+ eventuale asterisco degli straordinari). Il link ad
    // "Andamento Categoria" ha senso solo sulle righe figlie, che sono singole categorie:
    // quel tab non aggrega le figlie di una macro, quindi il nome della macro resta testo semplice.
    const nameOf = (r, asLink) =>
      `<span style="color:${esc(r.color)}">${esc(r.icon || '')}</span> ${asLink
        ? `<a href="#" onclick="_catCmpToTrend(${r.id});return false" style="color:inherit;text-decoration:none;border-bottom:1px dashed var(--txt3)" title="Vedi andamento nel periodo (inizio B → fine A)">${esc(r.name)}</a>`
        : esc(r.name)}${oneoffMark(r)}`;

    // Le 4 colonne numeriche, identiche per riga macro e riga figlia (`scale`: vedi sopra,
    // le figlie usano la scala delle sorelle, non quella delle macro).
    // `ids`: le categorie da passare a Transazioni cliccando un importo (vedi _catCmpDrillIds).
    const valueCells = (r, scale, ids) => {
      const delta = r.total_a - r.total_b;
      const pct = dPct(r.total_a, r.total_b);
      // Segno del "bene": uscita in calo o entrata in crescita = verde
      const good = isExpense ? delta <= 0 : delta >= 0;
      const deltaCol = delta === 0 ? 'var(--txt3)' : (good ? 'var(--income)' : 'var(--expense)');
      // Importo cliccabile → Transazioni di QUELLA categoria in QUEL periodo (la colonna dice
      // quale). Solo se il totale non è zero: un elenco vuoto non spiega niente. Il doppio click
      // non deve arrivare alla riga, che lo interpreterebbe come apri/chiudi il drill-down.
      const drill = (total, period, extraStyle) => total
        ? `<td class="text-right cc-drill" style="${extraStyle}" onclick="_catCmpToTx([${ids}],'${period}')"
               ondblclick="event.stopPropagation()"
               title="Vedi le transazioni: ${esc(r.name)} · Periodo ${period} (${period === 'A' ? periodLabelA : periodLabelB})">${fmt.currency(total)}</td>`
        : `<td class="text-right" style="${extraStyle}"><span style="color:var(--txt3)">—</span></td>`;
      return `${drill(r.total_a, 'A', '')}
        ${drill(r.total_b, 'B', 'opacity:.85')}
        <td class="text-right" style="color:${deltaCol};font-weight:600">${delta>=0?'+':''}${fmt.currency(delta)}</td>
        ${pctCell(pct, good, scale)}`;
    };

    // Slot fisso del chevron: presente anche vuoto sulle macro senza dettaglio,
    // altrimenti i nomi non si allineano in colonna.
    const slot = 'display:inline-block;width:15px;padding:0;margin-right:3px;text-align:left;vertical-align:baseline';

    // Con un drill-down aperto la sezione resta piena di macro chiuse con numeri dello stesso
    // ordine di grandezza: il dettaglio che si sta leggendo ci si perde dentro. Se almeno una
    // macro è aperta le altre sbiadiscono (`.cc-dim`; l'hover le riporta a piena intensità) e
    // ogni gruppo aperto prende una barretta laterale del colore della propria macrocategoria
    // — lo stesso dell'icona — così più gruppi aperti restano distinguibili fra loro.
    const anyOpen = sorted.some(r => _catCmpOpen.has(r.id));

    let html = `<tr class="analytics-section-header"><td colspan="5">${label}</td></tr>`;
    for (const r of sorted) {
      const kids = _catCmpKidsOf(r.id);
      const open = _catCmpOpen.has(r.id);
      const rail = esc(r.color || '#6ab7ff');   // colore della barretta di gruppo
      // Doppio click sulla riga = stessa azione del chevron (come nel Budget).
      const twist = kids.length
        ? `<button class="btn-budget-toggle" style="${slot}${open?`;color:${rail}`:''}" onclick="_catCmpToggle(${r.id})"
             title="${open?'Nascondi':'Mostra'} le categorie di ${esc(r.name)}">${open?'▼':'▶'}</button>`
        : `<span style="${slot}"></span>`;
      const rowCls = open ? 'cc-group cc-group-head' : (anyOpen ? 'cc-dim' : '');
      html += `<tr class="${rowCls}" style="--cc-rail:${rail}" ${kids.length?`ondblclick="_catCmpToggle(${r.id})"`:''}>
        <td class="analytics-cat-name">${twist}${nameOf(r, false)}</td>
        ${valueCells(r, maxPct, _catCmpDrillIds(r.id))}
      </tr>`;
      // Righe figlie: la barretta di gruppo sul bordo sinistro della tabella (stesso colore
      // della macro) le lega alla riga di testa, e l'ultima chiude il blocco con un filetto.
      // L'indentazione da sola, con l'alternanza di sfondo, non basta a leggerle come blocco.
      if (open) {
        const kidScale = scaleOf(kids);
        const kidRows = sortRows(kids);
        kidRows.forEach((k, i) => {
          html += `<tr class="cc-group cc-detail-row${i === kidRows.length-1 ? ' cc-group-end' : ''}" style="--cc-rail:${rail}">
            <td class="analytics-cat-name" style="padding-left:32px">${nameOf(k, true)}</td>
            ${valueCells(k, kidScale, [k.id])}
          </tr>`;
        });
      }
    }
    const gGood = isExpense ? totDelta <= 0 : totDelta >= 0;
    html += `<tr class="analytics-subtotal">
      <td>Totale ${label}</td>
      <td class="text-right">${fmt.currency(totA)}</td>
      <td class="text-right" style="opacity:.85">${fmt.currency(totB)}</td>
      <td class="text-right" style="font-weight:700;color:${totDelta===0?'var(--txt3)':(gGood?'var(--income)':'var(--expense)')}">${totDelta>=0?'+':''}${fmt.currency(totDelta)}</td>
      <td class="text-right" style="font-weight:700;color:${totPct==null?'var(--txt3)':(gGood?'var(--income)':'var(--expense)')}">${totPct==null?'—':(totPct>=0?'+':'')+totPct.toFixed(1)+'%'}</td>
    </tr>`;
    return html;
  };

  const expenses = _catCmpCache.filter(r => r.type === 'expense');
  const incomes  = _catCmpCache.filter(r => r.type === 'income');

  _catCmpSyncExpandBtn();

  if (!expenses.length && !incomes.length) {
    el.innerHTML = '<p style="padding:20px;color:var(--txt2)">Nessuna transazione nei periodi selezionati.</p>';
    return;
  }

  // La legenda dell'asterisco compare solo se un asterisco c'è davvero (altrimenti spiegherebbe
  // un simbolo assente). Si guardano anche le righe di dettaglio: un episodio può stare in una
  // sola figlia mentre la macro è chiusa, ma basta aprirla per vederlo.
  const hasOneoff = [...(_catCmpCache || []), ...(_catCmpDetail || [])]
    .some(r => (Number(r.oneoff_a) || 0) || (Number(r.oneoff_b) || 0));

  el.innerHTML = `
    <table class="analytics-table">
      <thead><tr>
        <th style="${thS}" onclick="_sortCatCmp('name')">Macrocategoria${arrow('name')}</th>
        <th class="text-right" style="${thS};color:var(--accent)" onclick="_sortCatCmp('a')">Periodo A${arrow('a')}</th>
        <th class="text-right" style="${thS};color:var(--purple)" onclick="_sortCatCmp('b')">Periodo B${arrow('b')}</th>
        <th class="text-right" style="${thS}" onclick="_sortCatCmp('delta')">Δ Valore${arrow('delta')}</th>
        <th style="${thS};text-align:left;min-width:180px" onclick="_sortCatCmp('pct')">Δ %${arrow('pct')}</th>
      </tr></thead>
      <tbody>
        ${renderSection(expenses, 'Uscite', true)}
        ${renderSection(incomes,  'Entrate', false)}
      </tbody>
    </table>
    ${hasOneoff ? `<p style="margin:10px 2px 0;font-size:11.5px;color:var(--txt2)">
      <span class="cc-oneoff">*</span> la voce include movimenti marcati 🎯 <strong>straordinari</strong>:
      lo scostamento può essere un episodio isolato, non un cambio di abitudine.
      Passa sul simbolo per vedere quanto pesano e in quale periodo.</p>` : ''}`;
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
async function renderAnalyticsBalance(token) {
  const el = document.getElementById('analyticsContent');
  if (!el) return;
  el.innerHTML = '<p style="padding:20px;color:var(--txt2)">Caricamento…</p>';

  const compare = _analyticsBalanceCompare;
  const cc = chartColors();

  if (!compare) {
    return _renderAnalyticsBalanceSingle(token);
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
  if (_analyticsRenderStale(token)) return;  // periodo/tab cambiato durante l'await: annulla
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
  if (_analyticsRenderStale(token)) return;  // periodo/tab cambiato durante l'await: annulla

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
        <div style="font-size:11px;font-weight:700;color:var(--purple);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">Periodo B · ${labelB}</div>
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
      borderColor:'#7c6cff', backgroundColor:'transparent',
      pointRadius:3, tension:.3, borderWidth:2.5, order:1 },
    { type:'line', label:'Saldo B', data:pad(balB),
      borderColor:'#7c6cff', backgroundColor:'transparent',
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
async function _renderAnalyticsBalanceSingle(token) {
  const el = document.getElementById('analyticsContent');
  if (!el) return;
  const { fetchMonths, monthCols } = _analyticsMonthRange();
  const rows = await api.getMonthlyBalance(fetchMonths);
  if (_analyticsRenderStale(token)) return;  // periodo/tab cambiato durante l'await: annulla
  const byYm = {};
  for (const r of rows) byYm[r.ym] = r;

  const incomes  = monthCols.map(m => byYm[m.ym]?.income  || 0);
  const expenses = monthCols.map(m => byYm[m.ym]?.expense || 0);
  const balances = monthCols.map((_, i) => incomes[i] - expenses[i]);

  // YTD: tronca ultimo mese al giorno odierno
  await _applyYtdTruncation(monthCols, incomes, expenses, balances);
  if (_analyticsRenderStale(token)) return;  // periodo/tab cambiato durante l'await: annulla

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
          borderColor:'#7c6cff', backgroundColor:'transparent',
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
async function renderAnalyticsForecast(token) {
  const el = document.getElementById('analyticsContent');
  if (!el) return;
  // Inizializza default con il primo mese disponibile in DB (caricato a livello Analytics)
  _fcInitDefaults(_analyticsOldestYm);
  el.innerHTML = _fcControlsHtml() + `<div id="fcOutput"></div>`;
  _fcBindControls();
  await _runForecastSaldo();
  // token non serve dopo: _runForecastSaldo scrive nel suo #fcOutput, già creato qui in modo
  // sincrono, e si protegge da sé dalle richieste concorrenti con _fcRunGen (la race di questa
  // tab è interna — due click sui preset d'orizzonte — non fra tab diverse).
}

// Escludi il mese in corso dalla tab Salute (default: sì).
// Il mese corrente è parziale per definizione, e le metriche della Salute non lo sanno: nei
// test, includere un 2 agosto da 2 giorni faceva scendere il punteggio da 71 a 61 e crollare
// la stabilità delle entrate da 7/10 a 0/10 — un peggioramento inventato dal calendario.
let _healthExcludeCurrent = true;

function _toggleHealthCurrentMonth() {
  _healthExcludeCurrent = !_healthExcludeCurrent;
  _renderCurrentAnalyticsTab();
}

// Tab "Salute Finanziaria": score 0-100 (via utils.computeHealthScore) con dettaglio di tutte
// le componenti (tasso risparmio, stabilità del risparmio, riserva, trend, stabilità entrate).
// Ogni numero dichiara il periodo su cui è calcolato e le componenti non misurabili sul periodo
// scelto vengono escluse invece di valere 0 (vedi computeHealthScore in utils.js).
async function renderAnalyticsHealth(token) {
  const el = document.getElementById('analyticsContent');
  if (!el) return;
  el.innerHTML = '<p style="padding:20px;color:var(--txt2)">Caricamento…</p>';

  const { fetchMonths, monthCols } = _analyticsMonthRange();
  const [balRowsRaw, accounts] = await Promise.all([
    api.getMonthlyBalance(fetchMonths),
    api.getAccounts(),
  ]);
  if (_analyticsRenderStale(token)) return;  // periodo/tab cambiato durante l'await: annulla

  // ── Mese in corso ─────────────────────────────────────────────────────────
  const today       = new Date();
  const _ymOf       = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  const curYm       = _ymOf(today);
  const prevYm      = _ymOf(new Date(today.getFullYear(), today.getMonth()-1, 1));
  const dayOfMonth  = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth()+1, 0).getDate();
  const hasCurMonth = monthCols.length > 0 && monthCols[monthCols.length-1].ym === curYm;
  // Non si esclude l'unico mese del periodo: resterebbe niente da valutare
  const excludedCur = hasCurMonth && _healthExcludeCurrent && monthCols.length > 1;
  const cols        = excludedCur ? monthCols.slice(0, -1) : monthCols;
  const curLabel    = hasCurMonth ? monthCols[monthCols.length-1].label : '';

  // Allinea i dati ai mesi effettivamente valutati
  const byYm = {};
  for (const r of balRowsRaw) byYm[r.ym] = r;
  const aligned = cols.map(m => ({
    ym: m.ym,
    income:  byYm[m.ym]?.income  || 0,
    expense: byYm[m.ym]?.expense || 0,
  }));

  // ── Score salute via funzione condivisa (utils.js) ───────────────────────
  // Destructuring di tutti gli intermedi necessari per il rendering downstream
  const {
    incomes, expenses, savings, n,
    totalIncome, totalExpense, totalSavings, avgSavingsRate, savingsAnchors, savingsSlope,
    scoreSavings, scorePos, scoreRunway, scoreIncTrend, scoreVol,
    score, scoreColor, scoreLabel, applicable, maxApplicable, noScoreReason, partial,
    minMonths, minMonthsTrend, minMonthsVol,
    posMonths, posPct, roll3Pos, roll3Total, roll3Pct,
    expMedian, liquidBalance, cardBalance, investBalance, reserveBalance, cardAccs, runwayMonths, investMonths,
    scoreRecovery, worstMonth, medPosSaving, recoveryMonths, minMonthsRec,
    incMedian, savSlopePct, savMedFirst, savMedSecond, trendHalf,
    savAvgFirst, savAvgSecond, savSlopeAvgPct,
    incStddev, incCV,
  } = computeHealthScore(aligned, accounts);

  const cc = chartColors();
  // Chart.js disegna su canvas: le var(--x) del CSS non le risolve, servono già risolte
  const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  // ── Colori badge componenti ───────────────────────────────────────────────
  const colS = scoreSavings >= 33 ? 'var(--income)' : scoreSavings >= 18 ? 'var(--warn)' : 'var(--expense)';
  const colP = scorePos >= 11 ? 'var(--income)' : scorePos >= 5 ? 'var(--warn)' : 'var(--expense)';
  // Soglie sul nuovo massimo di 8 pt (≈3 mesi verde, ≈2 giallo): con le vecchie (10/6) il
  // verde non si sarebbe mai acceso, essendo 8 il punteggio pieno.
  const colR = scoreRunway >= 7 ? 'var(--income)' : scoreRunway >= 5 ? 'var(--warn)' : 'var(--expense)';
  const colI = scoreIncTrend >= 13 ? 'var(--income)' : scoreIncTrend >= 6 ? 'var(--warn)' : 'var(--expense)';
  const colV = scoreVol >= 7 ? 'var(--income)' : scoreVol >= 4 ? 'var(--warn)' : 'var(--expense)';
  const colRec = scoreRecovery >= 5 ? 'var(--income)' : scoreRecovery >= 3 ? 'var(--warn)' : 'var(--expense)';

  // ── Dati grafici dettaglio ────────────────────────────────────────────────
  // null (non 0) per i mesi senza entrate: una barra a 0% direbbe "pareggio", non "nessun dato"
  const monthlyRates = cols.map((_,i) => incomes[i] > 0 ? +(savings[i] / incomes[i] * 100).toFixed(2) : null);
  // Con n dispari il mese centrale non entra in nessuna delle due metà: lo lasciamo scoperto
  // invece di attribuirlo alla seconda, come faceva la vecchia linea a gradino.
  const savRegLine   = cols.map((_,i) => i < trendHalf ? savMedFirst : (i >= n - trendHalf ? savMedSecond : null));
  const labels       = cols.map(m => m.label);

  // Runway display + posizione marker. La scala visiva finisce a 6 mesi anche se il pieno dei
  // punti è a 4: mostrare la scala che si chiude esattamente sul massimo darebbe l'idea che
  // oltre non esista niente. Chi sta a 5 mesi vede che è oltre l'obiettivo, non "al limite".
  const RUNWAY_SCALE_MAX = 6;
  const runwayDisplay = runwayMonths === null ? 'n/d'
    : !isFinite(runwayMonths) || runwayMonths >= 99 ? '99+' : runwayMonths.toFixed(1);
  const runwayClamped = runwayMonths === null || !isFinite(runwayMonths)
    ? RUNWAY_SCALE_MAX : Math.max(0, Math.min(RUNWAY_SCALE_MAX, runwayMonths));
  const runwayPos     = (runwayClamped / RUNWAY_SCALE_MAX) * 100;
  const runwayOffScale = runwayMonths !== null && runwayMonths > RUNWAY_SCALE_MAX;
  // Mesi coperti includendo gli investimenti: contesto, non punteggio
  const investDisplay = investMonths === null ? 'n/d'
    : !isFinite(investMonths) || investMonths >= 99 ? '99+' : investMonths.toFixed(1);

  // Recupero del mese peggiore: mesi di risparmio per ripianare il buco più profondo
  const recoveryDisplay = !applicable.recovery ? 'n/d'
    : recoveryMonths === 0 ? '0'
    : !isFinite(recoveryMonths) ? '∞' : recoveryMonths.toFixed(1);
  const REC_SCALE_MAX = 12;
  const recoveryClamped = !isFinite(recoveryMonths) ? REC_SCALE_MAX : Math.min(REC_SCALE_MAX, Math.max(0, recoveryMonths));
  const recoveryPos     = (recoveryClamped / REC_SCALE_MAX) * 100;
  const recoveryOffScale = isFinite(recoveryMonths) && recoveryMonths > REC_SCALE_MAX;

  // ── Contesto del periodo (intestazione + avvisi) ──────────────────────────
  const periodLabel = cols.length ? `${cols[0].label} → ${cols[cols.length-1].label}` : '—';
  // La riserva è una foto di OGGI: su un periodo storico va detto, altrimenti sembra il
  // patrimonio di allora diviso per le spese di allora.
  const isHistorical = cols.length > 0 && cols[cols.length-1].ym < prevYm;
  const flag = (txt, col) => `<span style="font-size:11px;font-weight:600;padding:2px 9px;border-radius:20px;border:1px solid ${col};color:${col}">${txt}</span>`;
  const miniBtn = (txt, fn) => `<button class="btn btn-xs btn-ghost" style="font-size:11px;padding:2px 8px" onclick="${fn}">${txt}</button>`;

  // Quando il punteggio non esiste affatto il messaggio grande spiega già tutto: elencare qui
  // le componenti escluse sarebbe rumore.
  const notMeasured = [];
  if (!noScoreReason) {
    if (!applicable.trend)  notMeasured.push(`trend (servono ${minMonthsTrend} mesi)`);
    if (!applicable.vol)    notMeasured.push(`stabilità entrate (servono ${minMonthsVol} mesi)`);
    if (!applicable.runway) notMeasured.push('riserva (spesa tipica non calcolabile)');
    if (!applicable.recovery) notMeasured.push(`recupero (servono ${minMonthsRec} mesi)`);
  }

  const periodBar = `
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px;padding:9px 14px;background:var(--bg3);border-radius:10px">
      <span style="font-size:12px;color:var(--txt2)">Periodo analizzato</span>
      <strong style="font-size:14px">${periodLabel}</strong>
      <span style="font-size:12px;color:var(--txt2)">· ${n} ${n===1?'mese':'mesi'}</span>
      ${(excludedCur || hasCurMonth || notMeasured.length || (isHistorical && !noScoreReason))
        ? '<div style="width:1px;height:16px;background:var(--border)"></div>' : ''}
      ${excludedCur
        ? flag(`${curLabel} in corso: escluso`, 'var(--txt2)') + miniBtn('includilo', '_toggleHealthCurrentMonth()')
        : ''}
      ${hasCurMonth && !excludedCur
        ? flag(`⚠ ${curLabel} è in corso: ${dayOfMonth} giorni su ${daysInMonth}, dati parziali`, 'var(--warn)')
          + (monthCols.length > 1 ? miniBtn('escludilo', '_toggleHealthCurrentMonth()') : '')
        : ''}
      ${notMeasured.length ? flag(`non misurato: ${notMeasured.join(' · ')}`, 'var(--txt2)') : ''}
      ${isHistorical && !noScoreReason ? flag('la riserva usa i saldi di oggi', 'var(--txt2)') : ''}
    </div>`;

  // ── Stato "nessun punteggio": periodo vuoto o troppo corto ────────────────
  // Prima di uscire distruggiamo i grafici della resa precedente: i canvas non esistono più.
  if (noScoreReason) {
    if (_healthRateChart) _healthRateChart.destroy();
    if (_healthIncChart)  _healthIncChart.destroy();
    if (_healthVolChart)  _healthVolChart.destroy();
    _healthRateChart = _healthIncChart = _healthVolChart = null;

    const msg = noScoreReason === 'nodata'
      ? `Nessun movimento registrato in questo periodo: non c'è niente da valutare.`
      : `Servono almeno ${minMonths} mesi per un punteggio che significhi qualcosa — con meno dati
         ogni componente misurerebbe il caso, non le tue abitudini. Allarga il periodo dai controlli qui sopra.`;
    el.innerHTML = `
      <div id="healthReport" style="padding-bottom:24px">
        ${periodBar}
        <div class="card-section" style="text-align:center;padding:28px 20px">
          <div style="font-size:38px;font-weight:700;color:var(--txt3);line-height:1">—</div>
          <div style="font-size:15px;font-weight:700;color:var(--txt3);margin:4px 0 10px">Punteggio non calcolabile</div>
          <div class="health-desc" style="max-width:620px;margin:0 auto">${msg}</div>
        </div>
        ${totalIncome || totalExpense ? `
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:16px">
            ${[['Entrate totali', fmt.currency(totalIncome), 'var(--income)'],
               ['Uscite totali',  fmt.currency(totalExpense), 'var(--expense)'],
               ['Risparmio netto', fmt.currency(totalSavings), totalSavings>=0?'var(--income)':'var(--expense)']
              ].map(([l,v,c])=>`
              <div style="padding:14px 16px;background:var(--bg3);border-radius:12px">
                <div style="font-size:11px;color:var(--txt2);margin-bottom:4px">${l}</div>
                <div style="font-size:22px;font-weight:700;color:${c}">${v}</div>
                <div style="font-size:11px;color:var(--txt2);margin-top:2px">${periodLabel}</div>
              </div>`).join('')}
          </div>` : ''}
      </div>`;
    return;
  }

  // ── Finestre mobili di 3 mesi: quelle che danno i punti della stabilità ───
  // Le disegniamo sotto ai mesi che coprono (grid-column i..i+2) su 3 righe sfalsate: le
  // finestre k e k+3 non si sovrappongono mai, quindi 3 righe bastano per qualunque n.
  const roll3Windows = [];
  for (let i = 0; i + 3 <= n; i++) {
    const sum = savings[i] + savings[i+1] + savings[i+2];
    roll3Windows.push({
      i, sum, ok: sum > 0,
      label: `${cols[i].label.split(' ')[0]}–${cols[i+2].label.split(' ')[0]}`,
      title: `${cols[i].label} → ${cols[i+2].label}: ${fmt.currency(sum)} — ${sum > 0 ? 'positiva' : 'negativa'}`,
    });
  }

  // ── Scala del tasso di risparmio ──────────────────────────────────────────
  // Rimpiazza la vecchia riga "Soglie: ≥20% ottimo · ≥10% buono · ≥5% sufficiente": dichiarava
  // 3 dei 7 nodi della scala e lasciava invisibili quelli a 3, 7 e 15% — 15 punti su 46 che si
  // muovevano dove il testo diceva che non succedeva niente. Qui la scala è mostrata intera,
  // con la posizione attuale sopra, così il badge "x / 46 pt" smette di essere un verdetto
  // senza metro. Si disegna solo la parte positiva (0→15%): sotto zero il marcatore resta
  // inchiodato a sinistra e la penalità la spiega la riga di testo.
  const posAnchors = savingsAnchors.filter(([r]) => r >= 0);
  const scaleMax   = posAnchors[posAnchors.length - 1][0];
  const scalePct   = r => Math.max(0, Math.min(100, r / scaleMax * 100));
  const markerPct  = scalePct(avgSavingsRate);
  const rateUnder  = avgSavingsRate < 0;
  const rateOver   = avgSavingsRate >= scaleMax;
  // Quanto costa, in euro sul periodo, guadagnare un punto percentuale di tasso: rende
  // concreta la pendenza. 1 pp = 1% delle entrate totali del periodo.
  const eurPerPp   = totalIncome / 100;
  const rateNote   = rateOver
    ? `Sei oltre il massimo della scala: la componente è al pieno dei suoi 46 pt.`
    : rateUnder
      ? `Sotto zero la scala penalizza, fino a &minus;23 pt a &minus;15% o meno. Tornare in pari vale ${-scoreSavings} pt.`
      : `Qui ogni punto percentuale in più vale <strong>${savingsSlope.toFixed(1)} pt</strong>${
          totalIncome > 0 ? ` — sul periodo, ${fmt.currency(eurPerPp)} di uscite in meno` : ''}.`;
  const rateScaleHtml = `
    <div class="rate-scale">
      <div class="rate-scale-track">
        <div class="rate-scale-fill" style="width:${markerPct}%;background:${colS}"></div>
        ${posAnchors.map(([r]) => `<i class="rate-scale-tick" style="left:${scalePct(r)}%"></i>`).join('')}
        <i class="rate-scale-dot" style="left:${markerPct}%;background:${colS}"></i>
      </div>
      <div class="rate-scale-labels">
        ${posAnchors.map(([r, p]) => `<span style="left:${scalePct(r)}%"><b>${r}%${r === scaleMax ? '+' : ''}</b>${p} pt</span>`).join('')}
      </div>
      <div class="rate-scale-note">Fra un nodo e l'altro il punteggio sale con continuità. ${rateNote}</div>
    </div>`;

  // ── Scomposizione compatta del punteggio ──────────────────────────────────
  // Solo etichetta, barra, punti e una riga di dettaglio: le spiegazioni lunghe (soglie,
  // motivazioni) stanno nelle card sotto, dove c'è anche il grafico. Prima erano ripetute
  // qui parola per parola, raddoppiando il testo della pagina.
  const comps = [
    { key:'savings', label:'Tasso di risparmio',      got:scoreSavings,  max:46, col:colS,
      detail:`${avgSavingsRate.toFixed(1)}% delle entrate risparmiato nel periodo`,
      off:'nessun movimento nel periodo' },
    { key:'pos',     label:'Stabilità del risparmio', got:scorePos,      max:14, col:colP,
      detail:`${roll3Pos} ${roll3Total===1?'finestra':'finestre'} di 3 mesi ${roll3Pos===1?'positiva':'positive'} su ${roll3Total} (${(roll3Pct*100).toFixed(0)}%)`,
      off:`servono almeno 3 mesi per avere una finestra` },
    { key:'runway',  label:'Riserva di emergenza',    got:scoreRunway,   max:8,  col:colR,
      detail:`${runwayDisplay} mesi coperti dalla sola cassa`,
      off:'spesa mensile tipica non calcolabile' },
    { key:'recovery', label:'Recupero del mese peggiore', got:scoreRecovery, max:6, col:colRec,
      detail: recoveryMonths === 0 ? 'nessun mese chiuso in rosso nel periodo'
        : !isFinite(recoveryMonths) ? 'nessun mese positivo: il buco non si recupera'
        : `${recoveryDisplay} mesi buoni per ripianare il mese peggiore`,
      off:`servono almeno ${minMonthsRec} mesi` },
    { key:'trend',   label:'Trend del risparmio',     got:scoreIncTrend, max:16, col:colI,
      detail:`${savSlopePct>=0?'+':''}${savSlopePct.toFixed(1)}% del reddito al mese (mediane)`,
      off:`servono almeno ${minMonthsTrend} mesi: due metà da confrontare` },
    { key:'vol',     label:'Stabilità delle entrate', got:scoreVol,      max:10, col:colV,
      detail:`Semi-CV ${incCV.toFixed(1)}% sotto il reddito tipico`,
      off:`servono almeno ${minMonthsVol} mesi` },
  ];

  // ── HTML ──────────────────────────────────────────────────────────────────
  el.innerHTML = `
    <div id="healthReport" style="padding-bottom:24px">

      ${periodBar}

      <!-- Score principale -->
      <div style="display:grid;grid-template-columns:auto 1fr;gap:16px;margin-bottom:16px;align-items:start">
        <div style="text-align:center;padding:20px 28px;background:var(--bg3);border-radius:12px;min-width:132px">
          <div style="font-size:52px;font-weight:700;color:${scoreColor};line-height:1">${score}</div>
          <div style="font-size:12px;color:var(--txt2);margin-top:2px">/ 100</div>
          <div style="font-size:15px;font-weight:700;color:${scoreColor};margin-top:6px">${scoreLabel}</div>
          ${partial ? `<div style="font-size:10px;color:var(--txt2);margin-top:8px;line-height:1.35">
            su ${maxApplicable} pt<br>misurabili</div>` : ''}
        </div>
        <!-- Scomposizione score (compatta: il dettaglio sta nelle card sotto) -->
        <div class="card-section" style="padding:16px 20px">
          <div style="font-size:12px;font-weight:600;color:var(--txt2);margin-bottom:10px">Come è calcolato il punteggio</div>
          <!-- auto-fill: 2-3 colonne su finestra larga, 1 su stretta. Niente larghezze fisse,
               così la card non resta mezza vuota e la pagina non scrolla mai in orizzontale. -->
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(430px,1fr));gap:11px 26px">
            ${comps.map(c => {
              const on  = applicable[c.key];
              const col = on ? c.col : 'var(--txt3)';
              return `
              <div style="min-width:0">
                <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:3px">
                  <span style="font-size:12px;font-weight:600;color:${on?'var(--txt)':'var(--txt3)'}">${c.label}</span>
                  <span style="font-size:12px;font-weight:700;color:${col};white-space:nowrap">
                    ${on ? `${c.got}<span style="color:var(--txt2);font-weight:400">/${c.max}</span>` : 'escluso'}</span>
                </div>
                <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden;margin-bottom:4px">
                  ${on ? `<div style="width:${Math.max(0,c.got/c.max*100).toFixed(0)}%;height:100%;background:${col};border-radius:3px"></div>` : ''}
                </div>
                <div style="font-size:12px;color:var(--txt2)">${on ? c.detail : c.off}</div>
              </div>`;
            }).join('')}
          </div>
          ${partial ? `<div class="health-desc" style="margin-top:2px;padding-top:8px;border-top:1px solid var(--border)">
            Le componenti escluse non valgono 0: sparirebbe la differenza tra "va male" e "non lo so".
            Il punteggio è rapportato ai <strong>${maxApplicable} punti</strong> effettivamente misurabili su questo periodo.
          </div>` : ''}
        </div>
      </div>

      <!-- KPI cards -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
        ${[
          ['Entrate totali',  fmt.currency(totalIncome),  'var(--income)'],
          ['Uscite totali',   fmt.currency(totalExpense), 'var(--expense)'],
          ['Risparmio netto', fmt.currency(totalSavings), totalSavings>=0?'var(--income)':'var(--expense)'],
          ['Tasso risparmio', avgSavingsRate.toFixed(1)+'%', avgSavingsRate>=15?'var(--income)':avgSavingsRate>=0?'var(--warn)':'var(--expense)'],
        ].map(([label,val,col])=>`
          <div style="padding:14px 16px;background:var(--bg3);border-radius:12px">
            <div style="font-size:11px;color:var(--txt2);margin-bottom:4px">${label}</div>
            <div style="font-size:22px;font-weight:700;color:${col}">${val}</div>
            <div style="font-size:11px;color:var(--txt2);margin-top:2px">${periodLabel}</div>
          </div>`).join('')}
      </div>

      <!-- Riga 1: Tasso risparmio + Stabilità del risparmio, 30/70.
           La striscia dei mesi + finestre è la cosa più larga della pagina (12 mesi ≈ 985px):
           a metà larghezza scrollava sempre, mentre il grafico a sinistra di spazio ne avanzava.
           minmax(0,·) e non "3fr 7fr" secco: con min-width:auto la striscia allargherebbe la
           propria colonna schiacciando l'altra card invece di scorrere. -->
      <div style="display:grid;grid-template-columns:minmax(0,4fr) minmax(0,6fr);gap:16px;margin-bottom:16px">

        <!-- Tasso di risparmio -->
        <div class="card-section">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <div style="font-size:13px;font-weight:600">Tasso di risparmio</div>
            <div class="score-badge" style="color:${colS}">${scoreSavings > 0 ? '+' : ''}${scoreSavings} / 46 pt</div>
          </div>
          <div class="health-desc" style="margin-bottom:10px">
            Percentuale di entrate risparmiata ogni mese. Sul periodo intero (risparmio totale ÷ entrate totali):
            <strong style="color:${avgSavingsRate>=10?'var(--income)':avgSavingsRate>=0?'var(--warn)':'var(--expense)'}">${avgSavingsRate.toFixed(1)}%</strong>.
          </div>
          ${rateScaleHtml}
          <div style="height:150px"><canvas id="healthRateChart"></canvas></div>
        </div>

        <!-- Stabilità del risparmio -->
        <div class="card-section">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <div style="font-size:13px;font-weight:600">Stabilità del risparmio</div>
            <div class="score-badge" style="color:${applicable.pos?colP:'var(--txt3)'}">${applicable.pos?`${scorePos} / 14 pt`:'esclusa'}</div>
          </div>
          <!-- Due numeri diversi, entrambi dichiarati: i mesi positivi (informativo) e le
               finestre di 3 mesi (quelle che danno i punti). Prima la card diceva "3 su 5"
               mostrando 7 riquadri mensili, e sembrava un errore di conteggio. -->
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px">
            <div style="flex:1;min-width:150px;padding:8px 12px;background:var(--bg4);border-radius:8px">
              <div style="font-size:11px;color:var(--txt2)">Mesi chiusi in positivo</div>
              <div style="font-size:15px;font-weight:700">${posMonths} su ${n}
                <span style="font-size:11px;font-weight:400;color:var(--txt2)">(${(posPct*100).toFixed(0)}%)</span></div>
            </div>
            <div style="flex:1;min-width:150px;padding:8px 12px;background:var(--bg4);border-radius:8px;border:1px solid ${applicable.pos?colP:'var(--border)'}">
              <div style="font-size:11px;color:var(--txt2)">Finestre di 3 mesi positive → punti</div>
              <div style="font-size:15px;font-weight:700;color:${applicable.pos?colP:'var(--txt3)'}">
                ${applicable.pos ? `${roll3Pos} su ${roll3Total} <span style="font-size:11px;font-weight:400;color:var(--txt2)">(${(roll3Pct*100).toFixed(0)}%)</span>` : 'n/d'}</div>
            </div>
          </div>
          <div class="health-desc" style="margin-bottom:12px">
            ${applicable.pos
              ? `Su ${n} mesi ci sono <strong>${roll3Total} ${roll3Total===1?'finestra':'finestre'}</strong> mobili di 3 mesi consecutivi
                 (${roll3Windows.slice(0,2).map(w=>w.label).join(', ')}${roll3Total>2?', …':''}):
                 il punteggio conta quante chiudono con risparmio complessivo positivo.
                 Valutare 3 mesi alla volta evita che una grossa spesa annuale (tasse, assicurazione) conti come fallimento
                 se i mesi vicini la assorbono. 100% = 14 pt · ≥90% = 13 · ≥75% = 11 · ≥60% = 8 · ≥40% = 5 · ≥20% = 2 · &lt;20% = 0 pt.`
              : `Con ${n} ${n===1?'mese':'mesi'} non esiste nessuna finestra di 3 mesi consecutivi: la componente è esclusa dal punteggio.`}
          </div>
          <div style="overflow-x:auto;padding-bottom:2px">
            <div style="display:grid;grid-template-columns:repeat(${n},minmax(72px,1fr));gap:3px;min-width:${n*75}px">
              ${cols.map((m,i) => {
                const s = savings[i];
                const kind = s > 0 ? 'pos' : s < 0 ? 'neg' : 'zero';
                const bg  = kind==='pos' ? 'rgba(63,185,80,.15)' : kind==='neg' ? 'rgba(248,81,73,.15)' : 'var(--bg4)';
                const brd = kind==='pos' ? 'rgba(63,185,80,.5)'  : kind==='neg' ? 'rgba(248,81,73,.5)'  : 'var(--border)';
                const tc  = kind==='pos' ? 'var(--income)' : kind==='neg' ? 'var(--expense)' : 'var(--txt2)';
                const arw = kind==='pos' ? '▲' : kind==='neg' ? '▼' : '=';
                return `<div title="${esc(m.label)}: ${fmt.currency(s)}" style="grid-row:1;padding:5px 4px;border-radius:8px;background:${bg};border:1px solid ${brd};text-align:center">
                  <div style="font-size:11px;font-weight:600;color:${tc}">${arw} ${m.label}</div>
                  <div style="font-size:10px;color:${tc};margin-top:2px">${fmt.currency(s)}</div>
                </div>`;
              }).join('')}
              ${roll3Windows.map((w,k) => `
                <div title="${esc(w.title)}" style="grid-column:${w.i+1} / span 3;grid-row:${2 + (k%3)};display:flex;align-items:center;justify-content:center;gap:6px;height:19px;margin-top:3px;border-radius:5px;background:${w.ok?'rgba(63,185,80,.12)':'rgba(248,81,73,.12)'};border:1px solid ${w.ok?'rgba(63,185,80,.45)':'rgba(248,81,73,.45)'};font-size:10px;font-weight:600;color:${w.ok?'var(--income)':'var(--expense)'};white-space:nowrap;overflow:hidden">
                  <span>${w.ok?'✓':'✗'}</span><span>${w.label}</span><span style="font-weight:400">${fmt.currency(w.sum)}</span>
                </div>`).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- Riga 2: le due componenti di resilienza, appaiate di proposito — stesso widget
           (marcatore su scala a fasce) e stessa domanda vista da due lati: quanto reggo se le
           entrate si fermano, e quanto mi costa un mese storto. -->
      <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;margin-bottom:16px">

        <!-- Riserva di emergenza -->
        <div class="card-section">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <div style="font-size:13px;font-weight:600">Riserva di emergenza</div>
            <div class="score-badge" style="color:${applicable.runway?colR:'var(--txt3)'}">${applicable.runway?`${scoreRunway} / 8 pt`:'esclusa'}</div>
          </div>
          <div class="health-desc" style="margin-bottom:14px">
            Mesi di vita coperti dalla <strong>sola cassa</strong> (conti liquidi al netto delle carte) divisa per la spesa di un mese tipico:
            quanto duri se le entrate si fermano <em>senza toccare gli investimenti</em>.
            Il pieno è a <strong>4 mesi</strong> — soglia bassa di proposito, perché avere un patrimonio investito alle spalle
            giustifica un cuscinetto di cassa più sottile. Gli investimenti restano qui sotto come contesto, ma non danno punti:
            titoli tenuti a scadenza non sono liquidità d'emergenza.
            ${isHistorical ? `<strong style="color:var(--warn)">Attenzione: saldi di oggi, non di ${cols[cols.length-1].label}</strong> — i conti non hanno storico giornaliero, quindi questa parte non segue il periodo scelto.` : ''}
          </div>

          <div style="display:flex;align-items:center;gap:18px;margin-bottom:14px">
            <div style="text-align:center;min-width:90px">
              <div style="font-size:34px;font-weight:700;color:${applicable.runway?colR:'var(--txt3)'};line-height:1">${runwayDisplay}</div>
              <div style="font-size:11px;color:var(--txt2);margin-top:3px">mesi</div>
            </div>
            <!-- Il marker sta FUORI dal contenitore con overflow:hidden: dentro veniva tagliato
                 e sopra i 12 mesi restava invisibile (1px su 3 a schermo). -->
            <div style="flex:1;position:relative">
              <!-- Fasce sulla scala 0–6 mesi: il verde pieno parte a 4, dove i punti sono al massimo -->
              <div style="display:flex;height:16px;border-radius:8px;overflow:hidden">
                <div style="flex:1;background:rgba(248,81,73,.55)"  title="Critico (&lt;1 mese)"></div>
                <div style="flex:1;background:rgba(240,136,62,.55)" title="Scarso (1–2 mesi)"></div>
                <div style="flex:1;background:rgba(232,168,56,.55)" title="Sufficiente (2–3 mesi)"></div>
                <div style="flex:1;background:rgba(99,179,90,.5)"   title="Buono (3–4 mesi)"></div>
                <div style="flex:2;background:rgba(63,185,80,.6)"   title="Pieno (≥4 mesi)"></div>
              </div>
              ${applicable.runway ? `
                <div title="${runwayDisplay} mesi" style="position:absolute;top:-4px;height:24px;width:3px;background:var(--txt);left:${runwayPos.toFixed(2)}%;transform:translateX(-50%);box-shadow:0 0 4px rgba(0,0,0,.6);border-radius:2px"></div>
                ${runwayOffScale ? `<div style="position:absolute;top:-19px;right:0;font-size:10px;font-weight:600;color:var(--income);white-space:nowrap">${runwayDisplay} mesi ▸ fuori scala</div>` : ''}
              ` : ''}
              <div style="position:relative;height:14px;margin-top:4px;font-size:10px;color:var(--txt2)">
                <span style="position:absolute;left:0">0</span>
                <span style="position:absolute;left:33.3%;transform:translateX(-50%)">2</span>
                <span style="position:absolute;left:66.7%;transform:translateX(-50%)">4 = pieno</span>
                <span style="position:absolute;right:0">6+</span>
              </div>
            </div>
          </div>

          <!-- Scomposizione della riserva: le carte di credito su una riga propria. Sommate
               ai conti sotto la voce "liquidi" facevano passare un debito per liquidità. -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:12px;padding-top:10px;border-top:1px solid var(--border)">
            <div>
              <div style="color:var(--txt2);font-size:10px;margin-bottom:2px">Cassa disponibile (saldi di oggi)</div>
              <div style="font-weight:600;font-size:14px;color:${reserveBalance>=0?'var(--income)':'var(--expense)'}">${fmt.currency(reserveBalance)}</div>
              <div style="font-size:10px;color:var(--txt2);margin-top:3px;line-height:1.6">
                <div>Liquidità sui conti: <strong>${fmt.currency(liquidBalance)}</strong></div>
                ${cardAccs.length ? `<div>Debito carte di credito: <strong style="color:${cardBalance<0?'var(--expense)':'inherit'}">${fmt.currency(cardBalance)}</strong></div>` : ''}
                ${investBalance ? `<div style="opacity:.85;margin-top:3px;padding-top:3px;border-top:1px dashed var(--border)">
                  Investimenti: <strong>${fmt.currency(investBalance)}</strong> — non conteggiati.
                  Con quelli i mesi coperti sarebbero <strong>${investDisplay}</strong>.</div>` : ''}
              </div>
            </div>
            <div>
              <div style="color:var(--txt2);font-size:10px;margin-bottom:2px">Spesa mensile tipica</div>
              <div style="font-weight:600;font-size:14px">${fmt.currency(expMedian)}<span style="font-weight:400;color:var(--txt2)">/mese</span></div>
              <div style="font-size:10px;color:var(--txt2);margin-top:3px;line-height:1.6">
                media interquartile su ${n} ${n===1?'mese':'mesi'} (${periodLabel}):<br>
                scarta il 25% più alto e il 25% più basso per ignorare mesi anomali come tasse o vacanze
              </div>
            </div>
          </div>
        </div>

        <!-- Recupero del mese peggiore — l'unica componente che guarda la coda invece del centro -->
        <div class="card-section">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <div style="font-size:13px;font-weight:600">Recupero del mese peggiore</div>
            <div class="score-badge" style="color:${applicable.recovery?colRec:'var(--txt3)'}">${applicable.recovery?`${scoreRecovery} / 6 pt`:'escluso'}</div>
          </div>
          ${applicable.recovery ? `
            <div class="health-desc" style="margin-bottom:14px">
              Quanti mesi buoni servono per ripianare il buco del mese peggiore. Tasso, trend e stabilità
              descrivono tutti il <em>centro</em> della stessa serie: questa guarda la <strong>coda</strong>,
              cioè quanto ti costa un incidente. Non giudica la spesa — un mese in rosso per le tasse è
              legittimo — dice che dopo quello non ti puoi permettere il secondo.
              Soglie: ≤2 mesi pieno · 4 buono · 8 sufficiente · ≥12 niente.
            </div>

            <div style="display:flex;align-items:center;gap:18px;margin-bottom:14px">
              <div style="text-align:center;min-width:90px">
                <div style="font-size:34px;font-weight:700;color:${colRec};line-height:1">${recoveryDisplay}</div>
                <div style="font-size:11px;color:var(--txt2);margin-top:3px">mesi</div>
              </div>
              <div style="flex:1;position:relative">
                <!-- Scala rovesciata: qui il verde sta a sinistra, meno è meglio -->
                <div style="display:flex;height:16px;border-radius:8px;overflow:hidden">
                  <div style="flex:2;background:rgba(63,185,80,.6)"   title="Pieno (≤2 mesi)"></div>
                  <div style="flex:2;background:rgba(99,179,90,.5)"   title="Buono (2–4 mesi)"></div>
                  <div style="flex:4;background:rgba(232,168,56,.55)" title="Sufficiente (4–8 mesi)"></div>
                  <div style="flex:4;background:rgba(248,81,73,.55)"  title="Critico (8–12 mesi)"></div>
                </div>
                <div title="${recoveryDisplay} mesi" style="position:absolute;top:-4px;height:24px;width:3px;background:var(--txt);left:${recoveryPos.toFixed(2)}%;transform:translateX(-50%);box-shadow:0 0 4px rgba(0,0,0,.6);border-radius:2px"></div>
                ${recoveryOffScale ? `<div style="position:absolute;top:-19px;right:0;font-size:10px;font-weight:600;color:var(--expense);white-space:nowrap">${recoveryDisplay} mesi ▸ fuori scala</div>` : ''}
                <div style="position:relative;height:14px;margin-top:4px;font-size:10px;color:var(--txt2)">
                  <span style="position:absolute;left:0">0</span>
                  <span style="position:absolute;left:16.7%;transform:translateX(-50%)">2</span>
                  <span style="position:absolute;left:33.3%;transform:translateX(-50%)">4</span>
                  <span style="position:absolute;left:66.7%;transform:translateX(-50%)">8</span>
                  <span style="position:absolute;right:0">12+</span>
                </div>
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:12px;padding-top:10px;border-top:1px solid var(--border)">
              <div>
                <div style="color:var(--txt2);font-size:10px;margin-bottom:2px">Mese peggiore del periodo</div>
                <div style="font-weight:600;font-size:14px;color:${worstMonth<0?'var(--expense)':'var(--income)'}">${fmt.currency(worstMonth)}</div>
                <div style="font-size:10px;color:var(--txt2);margin-top:3px;line-height:1.6">
                  ${worstMonth < 0 ? 'il buco più profondo su ' + n + (n===1?' mese':' mesi') : 'nessun mese chiuso in rosso: niente da recuperare'}
                </div>
              </div>
              <div>
                <div style="color:var(--txt2);font-size:10px;margin-bottom:2px">Mese buono tipico</div>
                <div style="font-weight:600;font-size:14px;color:${medPosSaving>0?'var(--income)':'var(--txt2)'}">${fmt.currency(medPosSaving)}</div>
                <div style="font-size:10px;color:var(--txt2);margin-top:3px;line-height:1.6">
                  mediana dei soli mesi chiusi in positivo: la capacità di rimborso reale, non la media
                </div>
              </div>
            </div>
          ` : `<div class="health-desc">Servono almeno ${minMonthsRec} mesi: sotto, "mese peggiore" e "mese buono tipico" finiscono per essere lo stesso dato.<br>
                <span style="color:var(--txt3)">Componente esclusa dal punteggio, che si rinormalizza su ${maxApplicable} pt.</span></div>`}
        </div>

      </div>

      <!-- Riga 3: Trend del risparmio (full width) -->
      <div class="card-section" style="margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <div style="font-size:13px;font-weight:600">Trend del risparmio</div>
            <div class="score-badge" style="color:${applicable.trend?colI:'var(--txt3)'}">${applicable.trend?`${scoreIncTrend} / 16 pt`:'escluso'}</div>
          </div>
          ${applicable.trend ? `
            <div class="health-desc" style="margin-bottom:10px">
              Confronto tra la <strong>mediana del risparmio mensile</strong> della seconda metà del periodo e quella della prima metà
              (più stabile di una regressione: un singolo mese-outlier non lo sposta).
              Mediana: <strong>${fmt.currency(savMedFirst)}</strong> → <strong>${fmt.currency(savMedSecond)}</strong>, pari a
              <strong style="color:${savSlopePct>=0?'var(--income)':'var(--expense)'}">${savSlopePct>=0?'+':''}${savSlopePct.toFixed(1)}% del reddito/mese</strong>
              — è questo che dà i punti.
              <!-- Il confronto sulle medie è il controllo di realtà: la mediana di pochi mesi ignora
                   gli estremi e può dichiarare una crescita che sui totali non c'è. -->
              Sulle <strong>medie</strong> (che tengono conto anche dei mesi estremi) lo stesso confronto vale
              <strong style="color:${savSlopeAvgPct>=0?'var(--income)':'var(--expense)'}">${savSlopeAvgPct>=0?'+':''}${savSlopeAvgPct.toFixed(1)}%</strong>
              (${fmt.currency(savAvgFirst)} → ${fmt.currency(savAvgSecond)})${Math.abs(savSlopePct-savSlopeAvgPct) > 2 ? ': i due numeri divergono, quindi la tendenza dipende da pochi mesi e va presa con cautela' : ''}.
              La linea a gradino indica i due livelli mediani.
              ${(posPct===1&&avgSavingsRate>=10)?'<em style="color:var(--income)">Tutti i mesi in attivo con risparmio ≥10%: punteggio minimo garantito a 7.</em>':(posPct>=0.75&&avgSavingsRate>=5)?'<em style="color:var(--warn)">Situazione complessivamente positiva: punteggio minimo garantito a 5.</em>':''}
            </div>
            <div style="height:150px"><canvas id="healthIncChart"></canvas></div>
          ` : `
            <div class="health-desc" style="padding:22px 4px">
              Il trend confronta due metà del periodo: con ${n} ${n===1?'mese':'mesi'} ogni metà avrebbe
              ${Math.floor(n/2)||0} ${Math.floor(n/2)===1?'mese':'mesi'}, e la differenza misurerebbe il caso.
              Servono almeno <strong>${minMonthsTrend} mesi</strong>: fino ad allora la componente è esclusa dal punteggio
              invece di valere 0.
            </div>`}
      </div>

      <!-- Riga 4: Stabilità entrate (full width) -->
      <div class="card-section" style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <div style="font-size:13px;font-weight:600">Stabilità delle entrate</div>
          <div class="score-badge" style="color:${applicable.vol?colV:'var(--txt3)'}">${applicable.vol?`${scoreVol} / 10 pt`:'esclusa'}</div>
        </div>
        ${applicable.vol ? `
          <div style="display:grid;grid-template-columns:auto auto auto 1fr;gap:16px;align-items:center;margin-bottom:12px">
            <div>
              <div style="font-size:26px;font-weight:700;color:${colV}">${incCV.toFixed(1)}%</div>
              <div style="font-size:10px;color:var(--txt2)">Semi-CV (al ribasso)</div>
            </div>
            <div style="width:1px;height:40px;background:var(--border)"></div>
            <div>
              <div style="font-size:20px;font-weight:600;color:var(--txt2)">− ${fmt.currency(incStddev)}</div>
              <div style="font-size:10px;color:var(--txt2)">Semi-deviazione</div>
            </div>
            <div class="health-desc" style="padding-left:8px">
              Variabilità delle entrate <em>al ribasso</em> rispetto alla media interquartile di <strong>${fmt.currency(incMedian)}/mese</strong> (reddito tipico).
              I mesi con bonus non spostano il riferimento e non penalizzano — conta solo quanto scendi sotto il tuo reddito abituale.
              Semi-CV &lt; 3% = ottimo · &lt; 12% = buono · &lt; 20% = discreto · ≥ 30% = variabile.
            </div>
          </div>
          <div style="height:150px"><canvas id="healthVolChart"></canvas></div>
        ` : `
          <div class="health-desc" style="padding:16px 4px">
            Con ${n} ${n===1?'mese':'mesi'} una semi-deviazione misura rumore, non variabilità del reddito.
            Servono almeno <strong>${minMonthsVol} mesi</strong>: fino ad allora la componente è esclusa dal punteggio
            invece di valere 0 — che avrebbe significato "entrate pessimamente instabili" quando in realtà non si sa.
          </div>`}
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
      // Colori dal tema: il giallo fisso su fondo chiaro (carta) era illeggibile
      const color = cssVar(avg >= 10 ? '--income' : avg >= 5 ? '--warn' : '--expense');
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
        { type:'line', label:'Media periodo', data:Array(n).fill(+avgSavingsRate.toFixed(1)),
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
        // autoSkip attivo: in una card stretta 12 etichette si sovrapporrebbero. maxRotation:0
        // le tiene dritte — meglio saltarne una che leggerle di traverso.
        x:{ ticks:{color:cc.tick,font:{size:10},maxRotation:0,minRotation:0}, grid:{color:cc.grid} },
        y:{ ticks:{color:cc.tick, callback:v=>v+'%'}, grid:{color:cc.grid} }
      }
    }
  });

  // Trend risparmio — barre colorate + livelli mediani a gradino (solo se il periodo lo consente)
  if (applicable.trend) _healthIncChart = new Chart(document.getElementById('healthIncChart'), {
    type:'bar',
    data:{
      labels,
      datasets:[
        { label:'Risparmio', data:savings,
          backgroundColor: savings.map(s => s>=0?'rgba(63,185,80,.5)':'rgba(248,81,73,.5)'),
          borderColor:      savings.map(s => s>=0?'rgba(63,185,80,.9)':'rgba(248,81,73,.9)'),
          borderWidth:1 },
        // Colore dal tema: il giallo chiaro fisso spariva sui fondi chiari (carta, nebbia)
        { type:'line', label:'Mediana per metà periodo', data:savRegLine,
          borderColor:cssVar('--accent'), borderDash:[6,3],
          pointRadius:0, stepped:'middle', fill:false, borderWidth:2, spanGaps:false }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ labels:{color:cc.tick,boxWidth:12} }, tooltip:{ callbacks:{ label:ctx=>` ${ctx.dataset.label}: ${fmt.currency(ctx.parsed.y)}` } } },
      scales:{ x:{ticks:{color:cc.tick,font:{size:10},autoSkip:false,maxRotation:0,minRotation:0},grid:{color:cc.grid}}, y:{ticks:{color:cc.tick,callback:v=>fmt.currency(v)},grid:{color:cc.grid}} }
    }
  });

  // Stabilità entrate — barre mensili + reddito tipico + soglia semi-deviazione.
  // Niente fill: la banda rossa piena copriva quasi tutta l'area e nascondeva le barre, cioè
  // il dato. Ed è una semi-deviazione, non una σ: il nome della serie ora lo dice.
  if (applicable.vol) _healthVolChart = new Chart(document.getElementById('healthVolChart'), {
    type:'bar',
    data:{
      labels,
      datasets:[
        { label:'Entrate', data:incomes,
          backgroundColor:'rgba(63,185,80,.4)', borderColor:'rgba(63,185,80,.7)', borderWidth:1 },
        { type:'line', label:'Reddito tipico (media interquartile)', data:Array(n).fill(incMedian),
          borderColor:'rgba(232,168,56,.95)', borderDash:[5,3],
          pointRadius:0, fill:false, borderWidth:2 },
        { type:'line', label:'Soglia semi-deviazione', data:Array(n).fill(Math.max(0, incMedian-incStddev)),
          borderColor:'rgba(248,81,73,.9)', borderDash:[3,4],
          pointRadius:0, fill:false, borderWidth:2 },
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{
        legend:{ labels:{ color:cc.tick, boxWidth:12 } },
        tooltip:{ callbacks:{ label:ctx=>` ${ctx.dataset.label}: ${fmt.currency(ctx.parsed.y)}` } }
      },
      scales:{ x:{ticks:{color:cc.tick,font:{size:10},autoSkip:false,maxRotation:0,minRotation:0},grid:{color:cc.grid}}, y:{ticks:{color:cc.tick,callback:v=>fmt.currency(v)},grid:{color:cc.grid}} }
    }
  });

}

/* ─── Analytics: Saldo Conti ────────────────────────────────────────────── */
let _accBalChart = null;
let _accBalData  = null;   // { accounts, byAccount: {aid: {ym: balance}}, monthCols }
let _accBalSel   = null;   // Set di account_id selezionati
let _accBalKnown = null;   // Set di account_id già visti: distingue i conti nuovi da quelli
                           // che l'utente ha deselezionato a mano (vedi renderAnalyticsAccBal)

// Tab "Saldo Conti": andamento storico del saldo per conto (serie multiple selezionabili).
async function renderAnalyticsAccBalance(token) {
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
  if (_analyticsRenderStale(token)) return;  // periodo/tab cambiato durante l'await: annulla
  if (!raw || !raw.accounts) { el.innerHTML = `<p style="padding:20px;color:var(--expense)">Dati non disponibili</p>`; return; }
  // I conti nascosti non compaiono nemmeno nel selettore: qui i chiusi restano (marcati ✕),
  // perché il loro storico saldi è ancora interessante, ma i nascosti sono fuori dalla vista.
  const accounts = raw.accounts.filter(a => !isAccountHidden(a));

  // Inizializza selezione: solo conti correnti (checking) non chiusi
  if (!_accBalSel) {
    const checking = accounts.filter(a => !a.is_closed && a.type === 'checking');
    _accBalSel = new Set((checking.length ? checking : accounts.filter(a => !a.is_closed)).map(a => a.id));
    _accBalKnown = new Set(accounts.map(a => a.id));
  } else {
    // Il Set era inizializzato una volta sola per sessione: un conto creato dopo restava
    // spento e quindi FUORI dal totale e dalla linea "Totale", che mostravano un patrimonio
    // inferiore al reale senza alcuna indicazione. Qui si riconcilia: i conti mai visti prima
    // entrano selezionati (come farebbe una nuova inizializzazione), quelli spariti escono.
    // _accBalKnown distingue "conto nuovo" da "conto che l'utente ha deselezionato a mano",
    // altrimenti ogni render riaccenderebbe le voci spente di proposito.
    const currentIds = new Set(accounts.map(a => a.id));
    // Difensivo: se _accBalSel è valorizzato ma _accBalKnown no, considera noti i selezionati
    // (evita di riaccendere in blocco tutto ciò che l'utente aveva spento).
    _accBalKnown ??= new Set(_accBalSel);
    for (const a of accounts) {
      if (!_accBalKnown.has(a.id)) {
        _accBalKnown.add(a.id);
        if (!a.is_closed) _accBalSel.add(a.id);
      }
    }
    for (const id of [..._accBalSel])   if (!currentIds.has(id)) _accBalSel.delete(id);
    for (const id of [..._accBalKnown]) if (!currentIds.has(id)) _accBalKnown.delete(id);
    // Se la riconciliazione ha svuotato il Set (tutti i conti selezionati eliminati/nascosti),
    // ricade sul default, altrimenti il grafico resterebbe vuoto senza spiegazione.
    if (_accBalSel.size === 0) {
      const fallback = accounts.filter(a => !a.is_closed);
      _accBalSel = new Set((fallback.length ? fallback : accounts).map(a => a.id));
    }
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

  // readableColor: i colori conto sono scelti per distinguersi tra loro, non per
  // essere leggibili come testo (i verdi scendono a 1.7:1 sui temi chiari).
  const headerCells = selAccounts.map((a,i) =>
    `<th class="text-right" style="color:${readableColor(accColor(a,i))}">${esc(a.icon||'')} ${esc(a.name)}</th>`
  ).join('');

  // Selettore conti
  const accButtons = accounts.map((a, i) => {
    const on = sel.has(a.id);
    const col = accColor(a, i);
    return `<button type="button" onclick="_toggleAccBal(${a.id})"
      style="padding:4px 12px;font-size:12px;border-radius:16px;border:1.5px solid ${col};cursor:pointer;
             background:${on ? col+'33' : 'transparent'};color:${on ? readableColor(col, 4.5, 0x33 / 255) : 'var(--txt2)'};
             font-weight:${on ? '600' : '400'};transition:all .15s;white-space:nowrap">
      ${esc(a.icon||'')} ${esc(a.name)}${a.is_closed ? ' ✕' : ''}
    </button>`;
  }).join('');

  // destroy() PRIMA di riscrivere innerHTML: dopo, l'istanza avrebbe già perso il riferimento
  // al proprio canvas (sostituito) e i listener wheel/pan registrati da zoomOpts() resterebbero
  // attaccati al nodo staccato. Con _toggleAccBal cliccato più volte si accumulavano canvas
  // orfani con i loro listener.
  if (_accBalChart) { _accBalChart.destroy(); _accBalChart = null; }

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
async function renderAnalyticsTrend(token) {
  const el = document.getElementById('analyticsContent');
  if (!el) return;
  el.innerHTML = '<p style="padding:20px;color:var(--txt2)">Caricamento…</p>';

  const { fetchMonths, monthCols } = _analyticsMonthRange();
  const rows = await api.getCategoryMonthTable(fetchMonths);
  if (_analyticsRenderStale(token)) return;  // periodo/tab cambiato durante l'await: annulla

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
      La linea <span style="color:var(--purple);font-weight:600">Trend</span> usa il metodo Theil-Sen: mediana delle pendenze tra tutte le coppie di mesi. Più robusto della regressione lineare classica — i mesi anomali (es. spese straordinarie) non distorcono la tendenza.
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
    // --accent invece del blu chiaro fisso: quest'ultimo è tarato sui temi scuri
    // e sul fondo chiaro di Nebbia scendeva a 1.99:1.
    slopeEl.innerHTML = `<span style="color:var(--accent);font-weight:600">${fmt.currency(avg)}/mese</span>`
      + `<span style="color:var(--txt3);margin-left:6px;margin-right:12px">media</span>`
      + `<span style="color:${color};font-weight:600">${sign}${fmt.currency(slope)}/mese</span>`
      + `<span style="color:var(--txt3);margin-left:8px">(${pctSign}${pctYear.toFixed(1)}%/anno)</span>`;
  } else if (slopeEl) {
    slopeEl.innerHTML = '';
  }

  const cc = chartColors();
  const t = document.documentElement.dataset.theme;
  // Nebbia è il default (nessun data-theme) ed è un tema CHIARO: prima restava
  // fuori da isLight e prendeva le varianti pensate per i fondi scuri.
  const isLight    = t === 'carta' || !t;
  const lineBlue   = isLight ? 'rgba(20,70,190,1)'  : 'rgba(100,160,255,1)';
  const linePurple = isLight ? 'rgba(100,30,190,1)' : 'rgba(185,120,255,1)';
  const barColor = (cat.color && cat.color.startsWith('#') && cat.color.length === 7)
    ? cat.color + '66'
    : 'rgba(124,124,255,.4)';

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
// token: presente solo quando invocata dal dispatcher Analytics (guard race); assente (undefined)
// quando riusata dalla pagina Resoconti (#rNatureContent), dove il guard non si applica.
async function renderNatureReport(token) {
  const el = document.getElementById('analyticsContent') || document.getElementById('rNatureContent');
  if (!el) return;
  el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--txt3)">⏳ Caricamento...</div>';

  const startYm = _analyticsStartYm || _analyticsOldestYm;
  const endYm   = _analyticsEndYm;
  const filter  = (startYm && endYm)
    ? { date_from: startYm + '-01', date_to: endYm + '-31' }
    : {};
  const data   = await api.getExpenseNatureReport(filter);
  if (token != null && _analyticsRenderStale(token)) return;  // periodo/tab cambiato durante l'await
  const byNature = data.by_nature   || [];
  const byCat    = data.by_category || [];
  const totalAll = byNature.reduce((s, r) => s + (Number(r.total) || 0), 0);

  // `color` = tinta viva, per barre e riempimenti (dove la saturazione serve).
  // `text`  = variabile di tema, per le scritte: i toni vivi sono tarati sui fondi
  // scuri e come testo su Nebbia scendevano a 1.8-2.4:1.
  const NATURE = {
    essenziale: { label: 'Essenziale', color: '#3fb950', text: 'var(--income)',  icon: '🟢' },
    variabile:  { label: 'Variabile',  color: '#e3b341', text: 'var(--warn)',    icon: '🟡' },
    superflua:  { label: 'Superflua',  color: '#f85149', text: 'var(--expense)', icon: '🔴' },
    '':         { label: 'Non classificata', color: 'var(--txt3)', text: 'var(--txt2)', icon: '⬜' },
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
        <div style="font-size:22px;font-weight:700;color:${m.text};margin:6px 0">${fmt.currency(tot)}</div>
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
        ? `<span style="opacity:.6">${esc(c.parent_name)}:</span>${esc(c.cat_name)}`
        : esc(c.cat_name);
      return `<div class="nature-cat-row" onclick="txFilters={range:'custom',date_from:'${df}',date_to:'${dt}',category_id:${c.cat_id},type:'expense'};navigate('transactions')" title="Vedi transazioni" style="display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:6px;cursor:pointer">
        <span style="border-left:3px solid ${esc(c.color)};color:var(--txt);padding:2px 8px;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0">${esc(c.icon)} ${catLabel}</span>
        <span style="font-weight:600;font-size:12px;white-space:nowrap">${fmt.currency(tot)}</span>
        <span style="color:var(--txt3);font-size:11px;white-space:nowrap;text-align:right;min-width:74px">${c.tx_count} tx · ${pct}%</span>
      </div>`;
    }).join('');
    return `
      <div class="card" style="padding:12px 14px">
        <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid var(--border)">
          <div style="font-size:13px;font-weight:700;color:${m.text}">${m.icon} ${m.label}</div>
          <div style="font-size:11px;color:var(--txt3)"><strong style="color:${m.text}">${fmt.currency(natureTotal)}</strong> · ${naturePct}% · ${natureTxCount} tx</div>
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
    ? `<span class="r-report-name">📋 ${esc(r.name)}</span> <button class="btn btn-ghost btn-icon" onclick="showReportModal(${r.id})" title="Modifica">✏️</button>`
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
        <td><span style="color:${esc(g.color)}">${esc(g.icon)}</span> ${esc(g.name)}</td>
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
        <td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${esc(g.color)};margin-right:6px"></span>${esc(g.name)}</td>
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
        <td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${esc(g.color)};margin-right:6px"></span>${esc(g.name)}</td>
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
        <td><span style="color:${esc(g.color)}">${esc(g.icon)}</span> ${esc(g.name)}</td>
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
                 transfer:{label:'Trasferimenti',color:'#7c6cff',total:0,count:0}};
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
        <td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${esc(g.color)};margin-right:6px"></span>${esc(g.label)}</td>
        <td class="text-right">${g.count}</td>
        <td class="text-right" style="font-weight:600;color:${esc(g.color)}">
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
        <td>${esc(b.label)}</td><td class="text-right">${b.count}</td>
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
      <th>Data</th><th>Descrizione</th><th>Tag</th><th>Categoria</th><th>Conto</th>
      <th class="text-right">Importo</th><th>Tipo</th></tr></thead><tbody>
      ${txs.map(t=>{
        const isSplitFiltered = t.filtered_split_amount != null;
        const dispAmt = effectiveAmt(t);
        return `<tr style="cursor:pointer" onclick="editTx(${t.id})">
        <td>${fmt.date(t.date)}</td>
        <td class="td-main">${esc(t.description||'—')}${isSplitFiltered ? ` <span style="font-size:10px;opacity:.5" title="Totale transazione: ${fmt.currency(t.amount)}">(tot. ${fmt.currency(t.amount)})</span>` : ''}</td>
        <td class="td-tags">${(t.tags&&t.tags.length)?t.tags.map(tg=>`<span class="tag-inline" style="--tc:${esc(tg.color)}">${esc(tg.name)}</span>`).join(''):''}</td>
        <td>${esc(effectiveCatIcon(t))} ${esc(effectiveCatName(t))}${isSplitFiltered ? ' <span style="font-size:10px;opacity:.5">(÷)</span>' : ''}</td>
        <td>${esc(t.account_name||'—')}</td>
        <td class="text-right amount-${t.type}">${t.type==='expense'?'-':''}${fmt.currency(dispAmt)}</td>
        <td><span class="badge badge-${t.type}">${t.type==='income'?'Entrata':t.type==='expense'?'Uscita':'Trasf.'}</span></td>
        </tr>`;}).join('')}
      <tr style="border-top:2px solid var(--border);font-weight:700">
        <td colspan="5">Totale</td>
        <td class="text-right" style="color:${net>=0?'var(--income)':'var(--expense)'}">${fmt.currency(net)}</td>
        <td></td>
      </tr></tbody></table>`;
  }

  // ─── Gran totale del resoconto ──────────────────────────────────────────
  // Riepilogo complessivo (entrate/uscite/netto) mostrato sempre nell'header,
  // qualunque sia il raggruppamento, per rispondere a "quanto in totale".
  const grandI = txs.filter(t=>t.type==='income')  .reduce((s,t)=>s+effectiveAmt(t),0);
  const grandE = txs.filter(t=>t.type==='expense') .reduce((s,t)=>s+effectiveAmt(t),0);
  const grandT = txs.filter(t=>t.type==='transfer').reduce((s,t)=>s+effectiveAmt(t),0);
  const grandNet = grandI - grandE;
  let grandHtml = '';
  if (grandI && grandE) {
    grandHtml = `Entrate <strong class="amount-income">${fmt.currency(grandI)}</strong>
      · Uscite <strong class="amount-expense">${fmt.currency(grandE)}</strong>
      · Netto <strong style="color:${grandNet>=0?'var(--income)':'var(--expense)'}">${fmt.currency(grandNet)}</strong>`;
  } else if (grandE) {
    grandHtml = `Totale uscite <strong class="amount-expense">${fmt.currency(grandE)}</strong>`;
  } else if (grandI) {
    grandHtml = `Totale entrate <strong class="amount-income">${fmt.currency(grandI)}</strong>`;
  } else if (grandT) {
    grandHtml = `Totale trasferimenti <strong style="color:var(--accent)">${fmt.currency(grandT)}</strong>`;
  }

  el.innerHTML = `
    ${chartData ? `<div class="card" style="margin-bottom:12px;padding:14px">
      <div style="position:relative;height:340px">
        <canvas id="rChart"></canvas></div></div>` : ''}
    <div class="card">
      <div class="card-header">
        <span class="card-title">${txs.length} transazion${txs.length===1?'e':'i'}</span>
        ${grandHtml ? `<span style="font-size:var(--fs-sm,11px);color:var(--txt2)">${grandHtml}</span>` : ''}
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
// Il nome si ricava dall'id: passarlo dall'onclick inline della sidebar significherebbe
// interpolare testo utente dentro un attributo HTML.
async function deleteReportConfirm(id) {
  const reports = await api.getReports();
  const name = reports.find(r => r.id === id)?.name ?? '';
  openModal('Elimina resoconto',
    `<p style="margin:0">Eliminare <b>${esc(name)}</b>?</p>`,
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
  HORIZON_MAX: 120,     // mesi massimi di proiezione futura (10 anni)
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
        <button class="btn btn-xs btn-ghost" id="fcPresetHoriz3"   title="Previsione prossimi 3 mesi">3m</button>
        <button class="btn btn-xs btn-ghost" id="fcPresetHoriz6"   title="Previsione prossimi 6 mesi">6m</button>
        <button class="btn btn-xs btn-ghost" id="fcPresetHoriz12"  title="Previsione prossimi 12 mesi">12m</button>
        <button class="btn btn-xs btn-ghost" id="fcPresetHoriz60"  title="Previsione prossimi 5 anni">5a</button>
        <button class="btn btn-xs btn-ghost" id="fcPresetHoriz120" title="Previsione prossimi 10 anni">10a</button>
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
  document.getElementById('fcPresetHoriz3').onclick   = () => _applyHorizPreset(3);
  document.getElementById('fcPresetHoriz6').onclick   = () => _applyHorizPreset(6);
  document.getElementById('fcPresetHoriz12').onclick  = () => _applyHorizPreset(12);
  document.getElementById('fcPresetHoriz60').onclick  = () => _applyHorizPreset(60);
  document.getElementById('fcPresetHoriz120').onclick = () => _applyHorizPreset(120);
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
  // Generazione dedicata al forecast: i preset d'orizzonte (12m/5a/10a) e gli altri controlli
  // possono lanciare più _runForecastSaldo concorrenti, tutte in attesa su getForecastEngine
  // (fino a 120 mesi di proiezione: è la chiamata più lenta della pagina). Senza questa guardia
  // vinceva l'ULTIMA a completare, non l'ultima richiesta: cliccando 12m → 10a → 12m restava a
  // schermo il grafico a 10 anni con i controlli che dicevano 12 mesi, e _fcChart veniva
  // distrutto/ricreato in ordine non deterministico. Il token di tab non basta: la race è
  // interna alla tab, fra due richieste dello stesso forecast.
  const gen = ++_fcRunGen;
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
    if (gen !== _fcRunGen) return;
    out.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${esc(e.message)}</p></div>`;
    return;
  }
  if (gen !== _fcRunGen) return;   // richiesta superata da una più recente: non scrivere

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
  // Mediana dei netti storici: riferimento robusto per la colonna "insolito" della tabella
  const medNet   = (() => { const s = [...nets].sort((a,b) => a-b); const m = s.length >> 1;
                            return s.length ? (s.length % 2 ? s[m] : (s[m-1] + s[m]) / 2) : 0; })();

  // ── Componenti dal motore ──
  const dispersion  = Number(engine.dispersion) || 0;
  const variableNet = Number(engine.variable_net) || 0;
  const variableInc = Number(engine.variable_income) || 0;
  const variableExp = Number(engine.variable_expense) || 0;
  const recurring   = engine.recurring || [];
  const lumpyEvents = engine.lumpy_events || [];
  const oneoffCands = engine.oneoff_candidates || [];
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

  // ── Metriche "mese tipico" (ricorrenti + eventi annuali ammortizzati + variabile) ──
  // ⚠️ Gli eventi annuali/una-tantum vanno inclusi: escluderli faceva leggere +1.601 €/mese
  // mentre la proiezione ne usava +961 (gli eventi valgono −640 €/mese su 12), e il "tasso di
  // risparmio" diceva 32% dove la Salute Finanziaria, sugli stessi dati, diceva 4,7%.
  // Su orizzonti corti la quota annuale non è rappresentativa: lo dichiariamo sotto le card.
  let recIncMonthly = 0, recExpMonthly = 0;
  for (const r of recurring) {
    const v = Number(r.monthly_amount) || 0;
    if (r.type === 'income') recIncMonthly += v; else recExpMonthly += -v;
  }
  const _hz      = Math.max(1, horizonMonths);
  const lumpyInc = lumpyEvents.reduce((s,e) => s + Math.max(0,  Number(e.amount)), 0) / _hz;
  const lumpyExp = lumpyEvents.reduce((s,e) => s + Math.max(0, -Number(e.amount)), 0) / _hz;
  const typIncome  = recIncMonthly + variableInc + lumpyInc;
  const typExpense = recExpMonthly + variableExp + lumpyExp;
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

  // Riga di una voce: «cat_parent:cat_child» · descrizione → importo. La categoria
  // gerarchica è enfatizzata, la descrizione è secondaria; importo allineato a destra.
  const fcLine = (category, descPrefix, descr, amount, amtSuffix) => `
    <div style="display:flex;justify-content:space-between;gap:10px;font-size:12px;padding:3px 0;min-width:0;border-bottom:1px solid var(--border)">
      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0">
        ${descPrefix ? `<b style="color:var(--txt);font-weight:600">${descPrefix}</b> ` : ''}<b style="color:var(--txt);font-weight:600">${category || 'Senza categoria'}</b><span style="color:var(--txt3)"> · ${descr || '—'}</span>
      </span>
      <span style="font-variant-numeric:tabular-nums;color:${amount>=0?'var(--income)':'var(--expense)'};white-space:nowrap">${signCur(amount)}${amtSuffix || ''}</span>
    </div>`;

  // Colonna "Pianificate ricorrenti": categoria parent:child · descrizione · importo/mese
  const recColHtml = recurring.length
    ? recurring.map(r => fcLine(r.category, '', r.description, Number(r.monthly_amount), '/mese')).join('')
    : `<div style="font-size:12px;color:var(--txt3);padding:2px 0">Nessuna pianificata ricorrente attiva.</div>`;

  // Colonna "Eventi annuali / una-tantum": una riga per evento distinto (categoria + descrizione),
  // con il numero di occorrenze e il totale sull'orizzonte. Prefisso: il mese della singola
  // occorrenza, oppure "da <mese>" per la prima di una serie.
  // ⚠️ Prima si elencava ogni occorrenza tagliando alle prime 60: su 5 anni sono ~300, quindi la
  // lista si fermava al primo anno e mezzo e le pianificate annuali più lontane sembravano
  // mancare dalla previsione pur essendo nel totale. Raggruppate ci stanno tutte (43 righe anche
  // su 10 anni), e la somma della colonna resta identica al totale in header.
  const _lumpyGroups = [];
  const _lumpyByKey  = new Map();
  for (const e of lumpyEvents) {
    const key = (e.category || '') + ' ' + (e.description || '');
    let g = _lumpyByKey.get(key);
    if (!g) {
      // ym della PRIMA occorrenza: lumpy_events arriva già ordinato per data dal backend,
      // quindi l'ordine di inserimento dei gruppi è cronologico.
      g = { category: e.category, description: e.description, ym: e.ym, n: 0, amount: 0 };
      _lumpyByKey.set(key, g); _lumpyGroups.push(g);
    }
    g.n++; g.amount += Number(e.amount) || 0;
  }
  // Il conteggio sta accanto alla categoria, non in coda alla descrizione: la riga tronca con
  // ellissi da destra (colonna stretta, layout telefono) e in coda il "×N" sparirebbe proprio
  // dove serve — è l'unica cosa che spiega perché l'importo è un multiplo.
  const lumpyColHtml = _lumpyGroups.length
    ? _lumpyGroups.map(g => fcLine(
        (g.category || 'Senza categoria') + (g.n > 1 ? ` ×${g.n}` : ''),
        g.n > 1 ? `da ${g.ym}` : g.ym,
        g.description,
        g.amount, '')).join('')
    : `<div style="font-size:12px;color:var(--txt3);padding:2px 0">Nessun evento annuale/una-tantum nel periodo.</div>`;

  // ── Pannello "Movimenti straordinari" ────────────────────────────────────
  // Mostra i movimenti fuori scala RISPETTO ALLA LORO CATEGORIA (4.550 € sono enormi per un
  // mobile, normali per uno stipendio) e quelli già marcati, per poterli smarcare.
  // Il rilevatore propone, l'utente decide: solo lui sa se un movimento si ripeterà.
  const marcati  = oneoffCands.filter(c => c.oneoff);
  const proposti = oneoffCands.filter(c => !c.oneoff);
  const oneoffRow = c => {
    const amt = Number(c.amount) * (c.type === 'income' ? 1 : -1);
    return `
    <div style="display:flex;align-items:center;gap:10px;padding:5px 0;border-bottom:1px solid var(--border);font-size:12px;min-width:0">
      <span style="color:var(--txt2);white-space:nowrap;font-variant-numeric:tabular-nums">${esc(String(c.date))}</span>
      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;flex:1">
        <b style="color:var(--txt);font-weight:600">${esc(c.category || 'Senza categoria')}</b>
        <span style="color:var(--txt2)"> · ${esc(c.description || '—')}</span>
      </span>
      <span style="color:var(--txt2);font-size:11px;white-space:nowrap" title="Importo tipico di questa categoria">
        tipico ${fmt.currency(c.typical)}</span>
      <span style="font-variant-numeric:tabular-nums;font-weight:600;white-space:nowrap;color:${amt>=0?'var(--income)':'var(--expense)'}">${signCur(amt)}</span>
      <button class="btn btn-xs ${c.oneoff?'btn-primary':'btn-ghost'}" style="white-space:nowrap"
              onclick="_fcToggleOneoff(${c.id}, ${c.oneoff ? 'false' : 'true'})">
        ${c.oneoff ? '✓ straordinario' : 'è un episodio'}</button>
    </div>`;
  };
  const oneoffHtml = (marcati.length || proposti.length) ? `
    <div class="card" style="padding:16px 18px;margin-bottom:16px">
      <div style="font-size:13px;font-weight:600;margin-bottom:4px">🎯 Movimenti straordinari</div>
      <div style="font-size:11px;color:var(--txt2);margin-bottom:10px;max-width:900px">
        Movimenti molto fuori scala rispetto alla <em>loro</em> categoria. Marcarli li toglie da ciò che
        viene <strong>estrapolato in avanti</strong> — mediana della spesa variabile, forbice, mese tipico,
        struttura spese — ma li lascia in saldi, budget, report e nella linea storica del grafico:
        i soldi si sono mossi davvero, quello che non va proiettato è la loro ripetizione.
        Nessuna esclusione automatica: decidi tu, perché solo tu sai se una cosa si ripeterà.
      </div>
      ${marcati.length ? `
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--txt2);margin:8px 0 2px">
          Esclusi dalle stime (${marcati.length})</div>
        ${marcati.map(oneoffRow).join('')}` : ''}
      ${proposti.length ? `
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--warn);margin:12px 0 2px">
          Candidati — attualmente <u>dentro</u> le stime (${proposti.length})</div>
        ${proposti.map(oneoffRow).join('')}` : ''}
    </div>` : '';

  // Header di colonna con totale a destra
  const fcColHeader = (title, total) => `
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:6px">
      <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--txt2)">${title}</span>
      <span style="font-variant-numeric:tabular-nums;font-weight:700;color:${total>=0?'var(--income)':'var(--expense)'}">${signCur(total)}</span>
    </div>`;

  // Blocco a 2 colonne con scroll indipendente (pianificate | annuali/una-tantum)
  const twoColHtml = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:10px 0">
      <div style="min-width:0">
        ${fcColHeader('Pianificate ricorrenti', recTotal)}
        <div style="padding:6px 10px;background:var(--bg3);border-radius:8px;max-height:320px;overflow-y:auto">${recColHtml}</div>
      </div>
      <div style="min-width:0">
        ${fcColHeader('Eventi annuali / una-tantum', lumpyTotal)}
        <div style="padding:6px 10px;background:var(--bg3);border-radius:8px;max-height:320px;overflow-y:auto">${lumpyColHtml}</div>
      </div>
    </div>`;

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
      ${twoColHtml}
      ${decRow('Spese variabili tipiche (storico)', signCur(varTotal), varTotal>=0?'var(--income)':'var(--expense)', false)}
      ${wantNet ? decRow('Cedole / rimborsi bond', signCur(portTotal), portTotal>=0?'var(--income)':'var(--expense)', false) : ''}
      ${decRow(`Saldo previsto fra ${horizonMonths} mesi`, fmt.currency(finalBal), 'var(--accent)', true)}
      <div style="font-size:11px;color:var(--txt3);margin-top:8px">
        Le pianificate sono proiettate ai valori attuali (un aumento di stipendio si riflette subito).
        La "spesa variabile" è la mediana dello storico nelle sole categorie NON pianificate: così non
        conta due volte ciò che è già pianificato.
      </div>
    </div>

    ${oneoffHtml}

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
    <div style="font-size:11px;color:var(--txt2);margin:-8px 0 16px">
      Il mese tipico include gli eventi annuali/una-tantum spalmati sui ${horizonMonths} mesi di orizzonte
      (${signCur(-lumpyExp + lumpyInc)}/mese)${horizonMonths < 12 ? ' — su un orizzonte più corto di un anno la quota annuale può non essere rappresentativa: prova a estendere l\'orizzonte a 12 mesi' : ''}.
      Gli straordinari marcati non ci entrano.
    </div>

    ${(() => {
      const cats = expSplit?.categories || [];
      if (!cats.length) return '';
      const fisse      = cats.filter(c => c.frequency >= 0.75);
      const periodiche = cats.filter(c => c.frequency >= 0.40 && c.frequency < 0.75);
      const saltuarie  = cats.filter(c => c.frequency  < 0.40);
      const col = (title, color, list) => {
        if (!list.length) return '';
        // Le voci "irregolari" (media molto sopra la mediana) sono quelle dove il costo medio
        // mensile è fatto da pochi movimenti grossi, non da una spesa ripetibile: va detto,
        // altrimenti un acquisto una tantum si legge come "spesa fissa di ogni mese".
        const rows = list.slice(0, 10).map(c => `
          <div style="padding:3px 0;border-bottom:1px solid var(--border);font-size:11px">
            <div style="display:flex;justify-content:space-between;gap:8px">
              <span style="color:var(--txt);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.name)}</span>
              <span style="color:${color};font-weight:600;white-space:nowrap">${fmt.currency(c.avg_monthly)}/m</span>
            </div>
            ${c.irregular ? `<div style="color:var(--txt2);font-size:10px">⚠ importi irregolari — in un mese tipico ${fmt.currency(c.typical_monthly)}</div>` : ''}
          </div>`).join('');
        const totAvg = list.reduce((s, c) => s + Number(c.avg_monthly), 0);
        return `<div style="min-width:0">
          <div style="font-size:11px;font-weight:700;color:${color};margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px">${title}</div>
          ${rows}
          <div style="font-size:11px;color:var(--txt2);margin-top:5px;text-align:right">Totale: <b style="color:${color}">${fmt.currency(totAvg)}/m</b></div>
        </div>`;
      };
      return `<div class="card" style="padding:16px;margin-bottom:16px">
        <div style="font-size:13px;font-weight:600;margin-bottom:4px;color:var(--txt2)">Struttura spese per categoria</div>
        <div style="font-size:11px;color:var(--txt2);margin-bottom:12px">
          Costo medio mensile su ${expSplit?.months || histMonths} mesi completati, straordinari esclusi.
          Le colonne dividono per <em>quanto spesso</em> la categoria compare, non per quanto costa.
        </div>
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
              // Base = mediana dei TUOI mesi, non il mese tipico del modello: la colonna dice
              // "insolito rispetto al tuo solito", e confrontarlo con una stima costruita su
              // pianificate e ammortamenti rispondeva a un'altra domanda.
              const unusual = dispersion > 0 && Math.abs(nets[i] - medNet) > 2 * dispersion;
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
  const _txtCol    = _css.getPropertyValue('--txt').trim()    || '#ccc';
  const _cc        = chartColors();   // tick/grid già risolti per tema
  // Chart.js disegna su canvas: "var(--x)" non lo risolve e restava una stringa letterale, così
  // assi, griglia e legenda cadevano sui default di Chart.js (griglia nera, testo grigio) invece
  // di seguire il tema. La banda era azzurra fissa: unico elemento blu su fondo beige.
  const _bandCol   = (() => {
    const h = _accentCol.replace('#','');
    if (h.length !== 6) return 'rgba(120,180,255,0.22)';
    const n = parseInt(h, 16);
    return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},0.20)`;
  })();

  // Su orizzonti lunghi (fino a 10 anni) i pallini si sovrappongono: rimpiccioliscili/toglili
  const _pointR = allLabels.length > 90 ? 0 : (allLabels.length > 48 ? 1.5 : 3);

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
          backgroundColor: 'transparent', pointRadius: _pointR, pointHitRadius: 8, tension: 0.3, spanGaps: false, fill: false },
        // Etichetta visibile: prima si chiamava "_ciHigh" ed era filtrata dalla legenda, quindi
        // a schermo restava un'area colorata di cui non si sapeva il significato.
        { label: 'Forbice (dispersione storica)', data: dsHigh, borderColor: 'transparent',
          backgroundColor: _bandCol, pointRadius: 0, tension: 0.3, spanGaps: false, fill: 2 },
        { label: '_ciLow', data: dsLow, borderColor: 'transparent',
          backgroundColor: 'transparent', pointRadius: 0, tension: 0.3, spanGaps: false, fill: false },
        { label: 'Saldo previsto', data: dsProj, borderColor: _accentCol, borderWidth: 2.5,
          borderDash: [6,4], backgroundColor: 'transparent', pointRadius: _pointR, pointHitRadius: 8, tension: 0.3, spanGaps: false, fill: false },
      ],
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: _txtCol, filter: item => !item.text.startsWith('_') } },
        tooltip: { callbacks: { label: ctx => {
          if (ctx.dataset.label.startsWith('_')) return null;
          const v = ctx.parsed.y;
          return v == null ? null : `${ctx.dataset.label}: ${fmt.currency(v)}`;
        } } },
      },
      scales: {
        x: { ticks: { color:_cc.tick, maxTicksLimit:14 }, grid:{ color:_cc.grid } },
        y: { ticks: { color:_cc.tick, callback: v => fmt.currency(v) }, grid:{ color:_cc.grid },
             suggestedMin: yMin - yPad, suggestedMax: yMax + yPad },
      },
    },
  });
  // Il contenitore che scorre è #analyticsContent, non la finestra: window.scrollTo era un no-op
  if (_savedScrollY > 0) requestAnimationFrame(() => {
    const c = document.getElementById('analyticsContent');
    if (c) c.scrollTop = _savedScrollY;
  });
}


// Marca/smarca un movimento come straordinario e ricalcola la previsione.
// Scrive sul DB (tag di sistema "oneoff"), quindi la scelta resta anche dopo un riavvio e
// si propaga all'app Android: il tag vive nello stesso database condiviso.
async function _fcToggleOneoff(id, on) {
  try {
    await api.setTransactionOneoff(id, on);
    toast(on ? 'Movimento escluso dalle stime' : 'Movimento riportato nelle stime');
    await _runForecastSaldo();
  } catch (e) {
    toast('Errore: ' + ((e && e.message) || e), 'error');
  }
}

// ── Helper UI ─────────────────────────────────────────────────────────────────
// Helper di rendering per la Previsione Saldo: _fcCard = card riepilogativa (metrica chiave).
function _fcCard(label, value, color) {
  return `<div class="card" style="padding:14px 16px">
    <div style="font-size:11px;color:var(--txt2);margin-bottom:4px">${label}</div>
    <div style="font-size:16px;font-weight:700;color:${color}">${value}</div>
  </div>`;
}
