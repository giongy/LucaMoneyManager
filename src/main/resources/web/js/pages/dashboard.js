/* ═══════════════════════════════════════════════════════════════════════════
   LucaMoneyManager — pages/dashboard.js
   Pagina Dashboard (estratta da app.js, stadio 7a del refactor)

   Dipendenze esterne (lazy a runtime):
   - _budgetEffective (BUDGET section in app.js)
   - _dashBubbleDetail (BUDGET section, esposto su window)
   - _initGlobalTooltip (INIT/notices in app.js)
   - showTxModal, navigateToTx (TRANSAZIONI in app.js)
   - _budgetTab, _analyticsTab, txFilters (globali in app.js)
   - _todayStr (app.js)
   - charts (router.js)
═══════════════════════════════════════════════════════════════════════════ */

let   _accTypeOrder         = ['checking','savings','cash','credit','investment'];
const _DASH_ACC_TYPE_LABELS = {checking:'Conti Correnti',savings:'Risparmio',cash:'Contanti',credit:'Carte di Credito',investment:'Investimenti'};

// computeHealthScore() è in utils.js — single source of truth condivisa con analytics.

// Disegna il widget "bolle budget" del mese corrente: una bolla per categoria foglia
// (anello di progresso speso/budget) divise in Uscite/Entrate, con riga totali in fondo.
function _renderDashBudgetBubbles(budgetYear) {
  const el = document.getElementById('dashBudgetBubbles');
  if (!el) return;

  const { categories = [], budgets = [], configs = [], actuals = [] } = budgetYear;
  const curMonth  = new Date().getMonth() + 1;
  const curYear   = new Date().getFullYear();
  const monthName = new Date(curYear, curMonth - 1).toLocaleString('it-IT', { month: 'long' });

  // Header della card (titolo mese + azioni): condiviso tra stato pieno e stato vuoto (placeholder).
  const _budgetHeader = `
    <div class="card-header">
      <span class="card-title">Budget — ${monthName} ${curYear}</span>
      <div style="display:flex;gap:6px">
        <button class="btn btn-ghost" onclick="navigateToBudgetMese()">Analisi mese corrente →</button>
        <button class="btn btn-ghost" onclick="navigate('budgets')">Gestisci Budget →</button>
      </div>
    </div>`;

  // Effective budget per mese (stessa logica pagina budget)
  const _bMap = {};
  budgets.forEach(b => { if (!_bMap[b.category_id]) _bMap[b.category_id] = {}; _bMap[b.category_id][b.month] = b.amount; });
  const _cfgMap = {};
  configs.forEach(c => { _cfgMap[c.category_id] = c; });
  const _getEff = catId => _budgetEffective(_cfgMap[catId], _bMap[catId] || {});

  // Speso questo mese per categoria
  const actualMap = {};
  actuals.forEach(a => { if (a.month === curMonth) actualMap[a.category_id] = a.total; });

  // Categorie foglia (senza figli)
  const leafCats  = _leafCats(categories);
  const catMap    = Object.fromEntries(categories.map(c => [c.id, c]));

  const allCatData = leafCats.map(c => ({
    ...c,
    budget: _getEff(c.id)[curMonth] || 0,
    actual: actualMap[c.id] || 0,
    parent_name: c.parent_id ? (catMap[c.parent_id]?.name || '') : '',
  }));
  const catData = allCatData.filter(c => c.actual > 0 || c.type === 'income');

  // Nessuna spesa né categoria entrata visibile questo mese: mostra comunque la card con
  // header + placeholder (niente display:none, che lasciava un vuoto a fianco del widget conti).
  if (!catData.length) {
    el.style.display = '';
    el.innerHTML = _budgetHeader + `
      <div style="flex:1;display:flex;align-items:center;justify-content:center;color:var(--txt3);font-size:13px;padding:24px 16px">
        Nessuna transazione nel mese
      </div>`;
    return;
  }
  el.style.display = '';

  const expCats = catData.filter(c => c.type === 'expense').sort((a, b) => b.budget - a.budget);
  const incCats = catData.filter(c => c.type === 'income').sort((a, b) => b.budget - a.budget);

  // Totali: actual solo dalle categorie visibili, budget da tutte le foglie
  const totExpBudget = allCatData.filter(c => c.type === 'expense').reduce((s, c) => s + c.budget, 0);
  const totExpActual = expCats.reduce((s, c) => s + c.actual, 0);
  const totIncBudget = allCatData.filter(c => c.type === 'income').reduce((s, c) => s + c.budget, 0);
  const totIncActual = incCats.reduce((s, c) => s + c.actual, 0);
  const netActual    = totIncActual - totExpActual;
  const netBudget    = totIncBudget - totExpBudget;

  // Anello SVG di progresso
  const _ring = (spent, budget, color, sz = 44, isIncome = false) => {
    // Uscita senza budget ma con spesa = sforamento: anello pieno e rosso (come spent>budget).
    const expOverNoBudget = !isIncome && budget <= 0 && spent > 0;
    const pct  = budget > 0 ? Math.min(spent / budget, 1) : (expOverNoBudget ? 1 : 0);
    const over = (budget > 0 && spent > budget) || expOverNoBudget;
    const bad  = isIncome ? spent < budget && budget > 0 : over;
    const r    = (sz - 4) / 2;
    const c    = 2 * Math.PI * r;
    const fill = pct * c;
    const sc   = bad ? 'var(--expense)' : spent > 0 ? (color || 'var(--accent)') : 'transparent';
    return `<svg width="${sz}" height="${sz}" viewBox="0 0 ${sz} ${sz}"
        style="position:absolute;top:0;left:0;transform:rotate(-90deg);pointer-events:none">
      <circle cx="${sz/2}" cy="${sz/2}" r="${r}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="3"/>
      <circle cx="${sz/2}" cy="${sz/2}" r="${r}" fill="none" stroke="${sc}" stroke-width="3"
        stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c - fill).toFixed(1)}" stroke-linecap="round"/>
    </svg>`;
  };

  // HTML singola bolla
  const _bubble = c => {
    const pct  = c.budget > 0 ? Math.round(c.actual / c.budget * 100) : 0;
    // Budget 0 con uscita reale = sforamento: trattalo come budget valido (colore rosso, rimasto negativo).
    // Per le entrate un budget 0 non è un "mancato target", quindi resta neutro.
    const isExpOverNoBudget = c.type !== 'income' && c.budget <= 0 && c.actual > 0;
    const amtColor = c.budget <= 0
      ? (isExpOverNoBudget ? 'var(--expense)' : 'var(--txt3)')
      : c.type === 'income'
        ? (c.actual > c.budget ? 'var(--income)' : c.actual < c.budget ? 'var(--expense)' : 'var(--txt3)')
        : (c.actual < c.budget ? 'var(--income)' : c.actual > c.budget ? 'var(--expense)' : 'var(--txt3)');
    const hexColor  = c.color?.startsWith('#') ? c.color : null;
    const bg        = hexColor ? hexColor + '28' : 'rgba(255,255,255,0.07)';
    const catLine   = c.parent_name ? `${c.parent_name} : ${c.name}` : c.name;
    const remaining = c.budget > 0
      ? (c.type === 'income' ? c.actual - c.budget : c.budget - c.actual)
      : (isExpOverNoBudget ? c.budget - c.actual : null);
    const hesc = s => String(s).replace(/"/g, '&quot;');
    return `<div class="budget-bubble" onclick="_dashBubbleDetail(${c.id})"
        data-tt-cat="${hesc(catLine)}"
        data-tt-budget="${hesc((c.budget > 0 || c.actual > 0) ? fmt.currency(c.budget) : '—')}"
        data-tt-actual="${hesc(fmt.currency(c.actual))}"
        data-tt-rem="${hesc(remaining !== null ? fmt.currency(remaining) : '—')}"
        data-tt-over="${remaining !== null && remaining < 0 ? '1' : '0'}"
        data-tt-l2="Reale">
      <div class="budget-bubble-icon" style="background:${bg}">
        <span style="position:relative;z-index:1;font-size:18px;line-height:1">${c.icon || '📁'}</span>
        ${_ring(c.actual, c.budget, hexColor, 44, c.type === 'income')}
      </div>
      <div class="budget-bubble-name">${c.name}</div>
      <div class="budget-bubble-amounts">
        <span style="color:${amtColor};font-weight:700;font-size:12px">${fmt.currency(c.actual)}</span><br>
        <span style="color:var(--txt3);font-size:11px">${(c.budget > 0 || c.actual > 0) ? fmt.currency(c.budget) : '—'}</span>
      </div>
    </div>`;
  };

  // Cella totale
  const _tot = (label, actual, budget, color) =>
    `<div style="display:flex;align-items:baseline;gap:6px">
      <span style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--txt3)">${label}</span>
      <span style="font-size:13px;font-weight:700;color:${color}">${fmt.currency(actual)}</span>
      ${budget !== 0 ? `<span style="font-size:11px;color:var(--txt3)">/ ${fmt.currency(budget)}</span>` : ''}
    </div>`;

  const netColor = netActual >= 0 ? 'var(--income)' : 'var(--expense)';

  el.innerHTML = _budgetHeader + `
    <div style="padding:0 16px 8px;flex:1;display:flex;flex-direction:column;min-height:0">
      <div class="dash-budget-cols">
        <div class="dash-budget-col-exp">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--txt3);margin-bottom:8px">Uscite</div>
          ${expCats.length
            ? `<div class="dash-budget-bubbles-wrap">${expCats.map(_bubble).join('')}</div>`
            : `<div style="color:var(--txt3);font-size:12px;padding:8px 0">—</div>`}
        </div>
        <div class="dash-budget-col-inc">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--txt3);margin-bottom:8px">Entrate</div>
          ${incCats.length
            ? `<div class="dash-budget-bubbles-grid">${incCats.map(_bubble).join('')}</div>`
            : `<div style="color:var(--txt3);font-size:12px;padding:8px 0">—</div>`}
        </div>
      </div>
    </div>
    <div style="display:flex;justify-content:flex-end;gap:24px;padding:5px 16px;margin-top:auto;border-top:1px solid var(--border)">
      ${expCats.length ? _tot('Uscite',  totExpActual, totExpBudget, 'var(--expense)') : ''}
      ${incCats.length ? _tot('Entrate', totIncActual, totIncBudget, 'var(--income)')  : ''}
      ${expCats.length && incCats.length ? _tot('Netto', netActual, netBudget, netColor) : ''}
    </div>`;
}

// Abilita lo scroll orizzontale "a trascinamento" sulle file di bolle budget + il gradiente di fine.
function _initBubbleDrag() {
  document.querySelectorAll('.dash-budget-bubbles').forEach(el => {
    const wrap = el.closest('.dash-bubbles-scroll-wrap');
    let isDown = false, startX = 0, scrollLeft = 0;

    const updateGradient = () => {
      if (!wrap) return;
      wrap.classList.toggle('at-end', el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
    };
    el.addEventListener('scroll', updateGradient);
    updateGradient();

    el.addEventListener('mousedown', e => {
      isDown = true; el.classList.add('is-dragging');
      startX = e.pageX - el.offsetLeft; scrollLeft = el.scrollLeft;
    });
    el.addEventListener('mouseleave', () => { isDown = false; el.classList.remove('is-dragging'); });
    el.addEventListener('mouseup',    () => { isDown = false; el.classList.remove('is-dragging'); });
    el.addEventListener('mousemove',  e => {
      if (!isDown) return;
      e.preventDefault();
      el.scrollLeft = scrollLeft - (e.pageX - el.offsetLeft - startX) * 1.5;
    });
  });
  _initGlobalTooltip();
}

// Disegna il widget "I miei conti": tabella raggruppata per tipo con saldo, pulsanti rapidi
// (+/−/⇄) e righe totali (conti liquidi + investimenti, con nominale bond a scadenza).
function _renderDashAccountsWidget(accounts) {
  const el = document.getElementById('dashAccounts');
  if (!el) return;
  const visibleAccounts = accounts.filter(isAccountVisible);
  const investBalance = visibleAccounts.filter(a => a.type === 'investment').reduce((s,a) => s + (a.balance||0), 0);
  const contiBalance  = visibleAccounts.filter(a => a.type !== 'investment').reduce((s,a) => s + (a.balance||0), 0);
  const bondNominal   = visibleAccounts.reduce((s,a) => s + (a.bond_nominal||0), 0);
  const visGrouped = {};
  visibleAccounts.forEach(a => { (visGrouped[a.type] = visGrouped[a.type] || []).push(a); });
  const visOrderedTypes = [...new Set([..._accTypeOrder.filter(t => visGrouped[t]), ...Object.keys(visGrouped)])];
  if (!visOrderedTypes.length) {
    el.innerHTML = `<p class="text-muted" style="padding:20px;text-align:center">Nessun conto. <a onclick="navigate('accounts')" style="color:var(--accent);cursor:pointer">Aggiungi un conto →</a></p>`;
    return;
  }
  el.innerHTML = `
    <table class="acc-list-table">
      ${visOrderedTypes.map(t => `
        <tbody>
          <tr class="acc-group-row"><td colspan="3"><span>${_DASH_ACC_TYPE_LABELS[t] || t}</span></td></tr>
          ${visGrouped[t].map(a => `
            <tr class="acc-list-row" onclick="navigateToAccountTx(${a.id})">
              <td>
                <span class="acc-dot" style="background:${a.color||'var(--accent)'}"></span>
                <span class="acc-icon">${a.icon||''}</span>
                <span class="acc-name">${a.name}</span>
              </td>
              <td class="acc-bal ${a.balance<0?'neg':''}" style="color:${a.balance<0?'var(--expense)':(a.color||'var(--accent)')}"
                  ${a.type==='investment' && a.bond_nominal>0 ? `title="Valore di mercato. Bond a scadenza: ${fmt.currency(a.bond_nominal)}"` : ''}>
                ${fmt.currency(a.balance)}
                ${a.type==='credit'?`<span id="cc-cur-${a.id}" style="display:block;font-size:11px;color:var(--txt2);font-weight:400"></span>`:''}
                ${a.type==='investment' && a.bond_nominal>0 ? `<span style="display:block;font-size:10px;color:var(--txt3);font-weight:400">bond a scad. ${fmt.currency(a.bond_nominal)}</span>` : ''}
              </td>
              <td onclick="event.stopPropagation()">
                <div class="acc-quick-btns">
                  <button class="acc-quick-btn acc-quick-exp" title="Aggiungi uscita"  onclick="_dashQuickTx(${a.id},'expense')">−</button>
                  <button class="acc-quick-btn acc-quick-inc" title="Aggiungi entrata" onclick="_dashQuickTx(${a.id},'income')">+</button>
                  <button class="acc-quick-btn acc-quick-tra" title="Trasferimento"    onclick="_dashQuickTx(${a.id},'transfer')">⇄</button>
                </div>
              </td>
            </tr>`).join('')}
        </tbody>`).join('')}
      <tbody>
        <tr class="acc-total-row">
          <td colspan="3">
            <div style="display:flex;align-items:baseline;gap:16px">
              <div style="display:flex;align-items:baseline;gap:6px">
                <span style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--txt3)">Totale Conti</span>
                <span class="acc-bal" style="font-size:13px;font-weight:700;color:${contiBalance<0?'var(--expense)':'var(--income)'}">${fmt.currency(contiBalance)}</span>
              </div>
              ${investBalance !== 0 ? `
              <div style="display:flex;align-items:baseline;gap:6px" ${bondNominal>0?`title="Valore di mercato di tutti gli investimenti (azioni a prezzo attuale + bond a prezzo attuale). Bond a scadenza: ${fmt.currency(bondNominal)}"`:''}>
                <span style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--txt3)">Investimenti</span>
                <span class="acc-bal" style="font-size:13px;font-weight:700;color:var(--accent2)">${fmt.currency(investBalance)}</span>
                ${bondNominal>0?`<span style="font-size:10px;color:var(--txt3)">· bond a scad. ${fmt.currency(bondNominal)}</span>`:''}
              </div>` : ''}
            </div>
          </td>
        </tr>
      </tbody>
    </table>`;
}

// Pulsante rapido sul widget conti: apre il modale transazione precompilato sul conto/tipo dati.
// Al salvataggio ricarica l'intera dashboard (saldi, bolle budget, stat YTD, ultime tx, grafici),
// non solo il widget conti — così la nuova transazione si riflette ovunque (come "Esegui ora").
window._dashQuickTx = async (accountId, type) => {
  const [cats, accs, tags] = await Promise.all([api.getCategories(), api.getAccounts(), api.getTags()]);
  showTxModal({account_id: accountId, type}, cats, accs, type, tags, () => renderDashboard());
};

// Disegna l'intera Dashboard: stat cards YTD (con sparkline e confronto YoY day-exact),
// widget conti, bolle budget, salute finanziaria, prossime pianificate, ultime transazioni
// e i grafici (entrate/uscite, budget vs reale, risparmio, top categorie).
async function renderDashboard() {
  api.getDbPath().then(r => {
    const el = document.getElementById('pageTitleSub');
    if (el) el.textContent = '(' + r.path + ')' + (window._appVersion ? '  v' + window._appVersion : '');
  }).catch(() => {});
  const dashYear = new Date().getFullYear();
  const pg = document.getElementById('pg-dashboard');
  pg.innerHTML = `
    <div class="stats-grid" id="statsGrid"></div>
    <div class="dash-top-row">
      <div class="card dash-accounts-card">
        <div class="card-header"><span class="card-title">I miei conti</span>
          <button class="btn btn-ghost" onclick="navigate('accounts')">Gestisci →</button>
        </div>
        <div id="dashAccounts"></div>
      </div>
      <div class="card dash-bubbles-card" id="dashBudgetBubbles"></div>
    </div>
    <div class="dash-mid-row">
      <div class="card dash-upcoming-card">
        <div class="card-header">
          <span class="card-title">🗓️ Prossime pianificate</span>
          <button class="btn btn-ghost" onclick="navigate('scheduled')">Gestisci →</button>
        </div>
        <div class="table-wrap"><table><thead><tr>
          <th>Categoria</th><th>Descrizione</th><th>Giorni</th><th class="text-right">Importo</th><th style="width:24px"></th>
        </tr></thead><tbody id="upcomingRows"></tbody></table></div>
      </div>
      <div class="card dash-budgetchart-card" style="cursor:pointer" onclick="_budgetTab='andamento';navigate('budgets')">
        <div class="card-header"><span class="card-title">Budget vs Reale ${dashYear}</span></div>
        <div class="dash-chart-wrap"><canvas id="budgetChart"></canvas></div>
      </div>
    </div>
    <div class="dash-charts-row">
      <div class="card dash-barchart-card" style="cursor:pointer" onclick="_analyticsTab='catmonth';navigate('analytics')">
        <div class="card-header"><span class="card-title">Top categorie spesa</span></div>
        <div class="dash-chart-wrap"><canvas id="topCatChart"></canvas></div>
      </div>
      <div class="card dash-recent-card">
        <div class="card-header">
          <span class="card-title">Ultime transazioni</span>
          <button class="btn btn-ghost" onclick="txFilters={range:txFilters.range};navigate('transactions')">Vedi tutte →</button>
        </div>
        <div class="table-wrap"><table><thead><tr>
          <th>Data</th><th>Descrizione</th><th>Categoria</th><th>Conto</th><th class="text-right">Importo</th>
        </tr></thead><tbody id="recentRows"></tbody></table></div>
      </div>
    </div>
    <div class="dash-bottom-charts">
      <div class="card dash-chart-sm" id="dashHealthWidget" style="cursor:pointer" onclick="_analyticsTab='health';navigate('analytics')" title="Ultimi 12 mesi completi (escluso mese corrente)">
        <div class="card-header">
          <span class="card-title">💚 Salute Finanziaria</span>
          <span style="font-size:10px;color:var(--txt3);font-weight:400">ultimi 12 mesi</span>
        </div>
        <div id="dashHealthBody" style="padding:8px 16px 14px;flex:1;display:flex;align-items:center"></div>
      </div>
      <div class="card dash-chart-sm" style="cursor:pointer" onclick="_analyticsTab='balance';navigate('analytics')">
        <div class="card-header"><span class="card-title">Entrate vs Uscite ${dashYear}</span></div>
        <div class="dash-chart-wrap"><canvas id="barChart"></canvas></div>
      </div>
      <div class="card dash-chart-sm">
        <div class="card-header"><span class="card-title">Risparmio mensile</span></div>
        <div class="dash-chart-wrap"><canvas id="savingsChart"></canvas></div>
      </div>
    </div>`;

  // Range Salute: ultimi 12 mesi completi (esclude mese corrente, allineato all'analytics default)
  const healthRange = lastNCompleteMonthsRange(12);

  // Day-exact YTD: 1 gen → oggi (entrambi gli anni allo stesso giorno-mese)
  // Confronto onesto considerando che il mese corrente è quasi sempre incompleto
  // (es. utente con entrate/uscite fisse a fine mese).
  const _today = new Date();
  const _pad = n => String(n).padStart(2, '0');
  const _ymd = (y, m, d) => `${y}-${_pad(m)}-${_pad(d)}`;
  const todayStr   = _ymd(_today.getFullYear(),     _today.getMonth() + 1, _today.getDate());
  const prevDayStr = _ymd(_today.getFullYear() - 1, _today.getMonth() + 1, _today.getDate());

  const [stats, accounts, recent, monthly, catData, upcoming, budgetYear, prevMonthly, balRowsRaw, ytdCurStats, ytdPrevStats] = await Promise.all([
    api.getDashboardStats(dashYear),
    api.getAccounts(),
    api.getTransactions({limit:12, sort_desc:true}),
    api.getMonthlyChartData(dashYear),
    api.getCategoryChartData(dashYear, 'expense'),
    api.getUpcomingAll(10),
    api.getBudgetYear(dashYear),
    api.getMonthlyChartData(dashYear - 1),
    api.getMonthlyBalance(healthRange.fetchMonths),
    api.getStatsByDateRange(`${dashYear}-01-01`,   todayStr),
    api.getStatsByDateRange(`${dashYear-1}-01-01`, prevDayStr),
  ]);

  // Filtra ai soli 12 mesi completi (esclude mese corrente parziale)
  const balRows12 = healthRange.months.map(ym => {
    const r = balRowsRaw.find(x => x.ym === ym);
    return { ym, income: r?.income || 0, expense: r?.expense || 0 };
  });

  // Cache upcoming per "Esegui ora" inline
  window._dashUpcomingCache = upcoming;

  // ── Cumulativo YTD per stat cards (day-exact: ultimo punto = oggi vs stesso giorno anno scorso) ────────
  const curMonthIdx = _today.getMonth();  // 0..11
  // Cumulativo: mesi completi 1..(curMonthIdx-1) dai dati monthly, poi punto finale = totale YTD esatto.
  // Per il confronto YoY, il "punto finale" è day-exact (somma fino a oggi vs stesso giorno anno scorso).
  // Costruisce la serie cumulativa: mesi completi dai dati mensili + ultimo punto = totale YTD
  // esatto (day-exact), così l'ultimo segmento confronta "fino a oggi" vs stesso giorno anno scorso.
  const _buildCumDayExact = (monthlyData, getter, ytdTotal) => {
    const monthly12 = Array(12).fill(0);
    monthlyData.forEach(r => monthly12[r.month - 1] = getter(r) || 0);
    const cum = [0];
    let acc = 0;
    // Mesi completi (fino al mese precedente al corrente)
    for (let i = 0; i < curMonthIdx; i++) { acc += monthly12[i]; cum.push(acc); }
    // Ultimo punto = totale YTD esatto (sostituisce il mese corrente parziale con il dato puntuale)
    cum.push(ytdTotal);
    return cum;
  };

  // YTD valori day-exact dal backend
  const ytdInc     = Number(ytdCurStats.income)    || 0;
  const ytdExp     = Number(ytdCurStats.expenses)  || 0;
  const ytdNet     = ytdInc - ytdExp;
  const prevYtdInc = Number(ytdPrevStats.income)   || 0;
  const prevYtdExp = Number(ytdPrevStats.expenses) || 0;
  const prevYtdNet = prevYtdInc - prevYtdExp;

  const cumIncCur  = _buildCumDayExact(monthly,     r => r.income,                              ytdInc);
  const cumIncPrev = _buildCumDayExact(prevMonthly, r => r.income,                              prevYtdInc);
  const cumExpCur  = _buildCumDayExact(monthly,     r => r.expenses,                            ytdExp);
  const cumExpPrev = _buildCumDayExact(prevMonthly, r => r.expenses,                            prevYtdExp);
  const cumNetCur  = _buildCumDayExact(monthly,     r => (r.income || 0) - (r.expenses || 0),  ytdNet);
  const cumNetPrev = _buildCumDayExact(prevMonthly, r => (r.income || 0) - (r.expenses || 0),  prevYtdNet);

  const trend = (cur, prev) => prev ? ((cur - prev) / Math.abs(prev)) * 100 : null;
  const trendInc = trend(ytdInc, prevYtdInc);
  const trendExp = trend(ytdExp, prevYtdExp);
  const trendNet = trend(ytdNet, prevYtdNet);

  // Colori semantici della linea solida: verde se trend "buono", rosso se "cattivo"
  const GREEN = 'rgba(63,185,80,.95)';
  const RED   = 'rgba(248,81,73,.95)';
  const NEUT  = 'var(--txt2)';
  const incColor = trendInc == null ? NEUT : (trendInc >= 0 ? GREEN : RED);
  const expColor = trendExp == null ? NEUT : (trendExp <= 0 ? GREEN : RED);
  const netColor = trendNet == null ? NEUT : (trendNet >= 0 ? GREEN : RED);

  // Label periodo day-exact: "1 gen → 24 mag" = range esatto del confronto YTD
  const _MONTHS_IT_SHORT = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
  const ytdLabel = `1 gen → ${_today.getDate()} ${_MONTHS_IT_SHORT[curMonthIdx]}`;

  // Range per atterraggio su Bilancio Mensile (gen → mese corrente dell'anno mostrato)
  const navStartYm = `${dashYear}-01`;
  const navEndYm   = `${dashYear}-${String(curMonthIdx+1).padStart(2,'0')}`;
  const navHandler = `onclick="window.navigateToBalanceCompare('${navStartYm}','${navEndYm}')"`;
  const navTitle   = `Confronto cumulativo ${ytdLabel} ${dashYear} (solida) vs stessi mesi ${dashYear-1} (tratteggiata). Clicca per aprire il Bilancio Mensile.`;
  const navStyle   = `cursor:pointer`;

  // Stat cards (con sparkline a destra del numero e trend YoY)
  document.getElementById('statsGrid').innerHTML = `
    <div class="stat-card stat-balance" ${stats.bond_nominal_total>0?`title="Valore di mercato di tutti i conti. Nominale bond a scadenza: ${fmt.currency(stats.bond_nominal_total)}"`:''}>
      <div class="stat-label">💳 Saldo Totale</div>
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center">
        <div class="stat-value">${fmt.currencyRich(stats.balance)}</div>
        <div class="stat-sub">${stats.bond_nominal_total>0
          ? `Tutti i conti · <span style="color:var(--txt3)">bond a scadenza ${fmt.currency(stats.bond_nominal_total)}</span>`
          : 'Tutti i conti'}</div>
      </div>
    </div>
    <div class="stat-card stat-income" ${navHandler} title="${navTitle}" style="${navStyle}">
      <div class="stat-label">📥 Entrate ${dashYear}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
        <div class="stat-value" style="min-width:0;flex:1">${fmt.currencyRich(stats.income)}</div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex-shrink:0">
          ${cumulativeCompareSvg(cumIncCur, cumIncPrev, incColor, 150, 32)}
          <div style="font-size:10px;line-height:1.3;text-align:right;white-space:nowrap">
            ${trendBadge(trendInc, true)}
            ${trendInc != null ? `<div style="color:var(--txt3);font-size:9px">${ytdLabel} vs ${dashYear-1}</div>` : ''}
          </div>
        </div>
      </div>
    </div>
    <div class="stat-card stat-expense" ${navHandler} title="${navTitle}" style="${navStyle}">
      <div class="stat-label">📤 Uscite ${dashYear}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
        <div class="stat-value" style="min-width:0;flex:1">${fmt.currencyRich(stats.expenses)}</div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex-shrink:0">
          ${cumulativeCompareSvg(cumExpCur, cumExpPrev, expColor, 150, 32)}
          <div style="font-size:10px;line-height:1.3;text-align:right;white-space:nowrap">
            ${trendBadge(trendExp, false)}
            ${trendExp != null ? `<div style="color:var(--txt3);font-size:9px">${ytdLabel} vs ${dashYear-1}</div>` : ''}
          </div>
        </div>
      </div>
    </div>
    <div class="stat-card stat-net" ${navHandler} title="${navTitle}" style="${navStyle}">
      <div class="stat-label">💰 Risparmio Netto ${dashYear}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
        <div style="min-width:0;flex:1">
          <div class="stat-value" style="color:${stats.net>=0?'var(--income)':'var(--expense)'}">${fmt.currencyRich(stats.net)}</div>
          <div class="stat-sub" style="font-size:11px;color:var(--txt3)">${stats.transaction_count} tx</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex-shrink:0">
          ${cumulativeCompareSvg(cumNetCur, cumNetPrev, netColor, 150, 32)}
          <div style="font-size:10px;line-height:1.3;text-align:right;white-space:nowrap">
            ${trendBadge(trendNet, true)}
            ${trendNet != null ? `<div style="color:var(--txt3);font-size:9px">${ytdLabel} vs ${dashYear-1}</div>` : ''}
          </div>
        </div>
      </div>
    </div>`;

  _renderDashAccountsWidget(accounts);
  _fillCreditMonthDash(accounts);
  _renderDashBudgetBubbles(budgetYear);
  _initBubbleDrag();

  // ── Widget Salute Finanziaria (F1+F5) ────────────────────────────────────
  _renderDashHealth(balRows12, accounts);

  // Gradient plugin per bar chart dashboard
  const _dashGradPlugin = {
    id: 'dashGrad',
    beforeDatasetsUpdate(chart) {
      const {ctx, chartArea, data} = chart;
      if (!chartArea) return;
      data.datasets.forEach(ds => {
        if (!ds._gradColors) return;
        const [c0, c1] = ds._gradColors;
        const isHoriz = chart.config.options?.indexAxis === 'y';
        const grad = isHoriz
          ? ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0)
          : ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        grad.addColorStop(0, c0);
        grad.addColorStop(1, c1);
        ds.backgroundColor = grad;
      });
    }
  };

  // Bar chart
  const months = Array.from({length:12},(_,i)=>new Date(0,i).toLocaleString('it-IT',{month:'short'}));
  const incArr = Array(12).fill(0), expArr = Array(12).fill(0);
  monthly.forEach(r => { incArr[r.month-1]=r.income; expArr[r.month-1]=r.expenses; });

  if (charts.bar) charts.bar.destroy();
  charts.bar = new Chart(document.getElementById('barChart'), {
    type:'bar',
    plugins:[_dashGradPlugin],
    data:{ labels:months,
      datasets:[
        {label:'Entrate', data:incArr, _gradColors:['rgba(63,185,80,.9)','rgba(63,185,80,.2)'], backgroundColor:'rgba(63,185,80,.7)', borderRadius:4},
        {label:'Uscite',  data:expArr, _gradColors:['rgba(248,81,73,.9)','rgba(248,81,73,.2)'], backgroundColor:'rgba(248,81,73,.7)', borderRadius:4}
      ]},
    options:{ responsive:true, maintainAspectRatio:false,
      interaction:{ mode:'index', intersect:false },
      plugins:{
        legend:{labels:{color:chartColors().tick}},
        tooltip:{ callbacks:{ label: ctx => ` ${ctx.dataset.label}: ${fmt.currency(ctx.parsed.y)}` } }
      },
      scales:{x:{ticks:{color:chartColors().tick},grid:{color:chartColors().grid}},
              y:{ticks:{color:chartColors().tick},grid:{color:chartColors().grid}}}}
  });

  // Budget vs Reale chart (solo mesi fino al mese precedente)
  {
    const prevMonthIdx = new Date().getMonth() - 1; // 0-indexed, -1 = nessun mese se siamo a gennaio
    const expCatIds = new Set(budgetYear.categories.filter(c => c.type === 'expense').map(c => c.id));

    // Replica getEffective della pagina budget per avere i valori distribuiti dal config
    const _bMap = {};
    budgetYear.budgets.forEach(b => { if (!_bMap[b.category_id]) _bMap[b.category_id] = {}; _bMap[b.category_id][b.month] = b.amount; });
    const _cfgMap = {};
    (budgetYear.configs || []).forEach(c => { _cfgMap[c.category_id] = c; });
    const _getEff = catId => _budgetEffective(_cfgMap[catId], _bMap[catId] || {});

    // Tutte le categorie foglia (income e expense) — stesso approccio della riga sommario pagina budget
    const leafCats = _leafCats(budgetYear.categories);

    // Net per mese: income contribuisce positivamente, expense negativamente
    const budgetByMonth = Array(12).fill(0);
    const actualByMonth = Array(12).fill(0);
    leafCats.forEach(c => {
      const sign = c.type === 'income' ? 1 : -1;
      const eff = _getEff(c.id);
      for (let m = 1; m <= 12; m++) budgetByMonth[m-1] += sign * (eff[m] || 0);
    });
    const _catById = new Map(budgetYear.categories.map(c => [c.id, c]));
    budgetYear.actuals.forEach(a => {
      const cat = _catById.get(a.category_id);
      if (!cat) return;
      const sign = cat.type === 'income' ? 1 : -1;
      actualByMonth[a.month - 1] += sign * a.total;
    });

    // Includi solo mesi 0..prevMonthIdx con almeno budget o reale != 0
    const bLabels = [], bBudget = [], bActual = [], bDiff = [];
    for (let i = 0; i <= prevMonthIdx; i++) {
      if (budgetByMonth[i] === 0 && actualByMonth[i] === 0) continue;
      bLabels.push(months[i]);
      bBudget.push(budgetByMonth[i]);
      bActual.push(actualByMonth[i]);
      bDiff.push(actualByMonth[i] - budgetByMonth[i]); // positivo = meglio del previsto
    }

    if (charts.budget) charts.budget.destroy();
    const budgetCtx = document.getElementById('budgetChart');
    if (budgetCtx && bLabels.length) {
      const _bCtx = budgetCtx.getContext('2d');
      const _bH   = budgetCtx.offsetHeight || 300;
      const gradGreen = _bCtx.createLinearGradient(0, 0, 0, _bH);
      gradGreen.addColorStop(0,   'rgba(63,185,80,.45)');
      gradGreen.addColorStop(1,   'rgba(63,185,80,.12)');
      const gradRed = _bCtx.createLinearGradient(0, 0, 0, _bH);
      gradRed.addColorStop(0,   'rgba(248,81,73,.12)');
      gradRed.addColorStop(1,   'rgba(248,81,73,.45)');
      charts.budget = new Chart(budgetCtx, {
        type: 'line',
        data: {
          labels: bLabels,
          datasets: [{
            label: 'Differenza',
            data: bDiff,
            fill: { target: 'origin', above: gradGreen, below: gradRed },
            segment: {
              borderColor: ctx => ctx.p1.parsed.y < 0 ? 'rgba(248,81,73,0.8)' : 'rgba(63,185,80,0.8)'
            },
            tension: 0.3, pointRadius: 3,
            pointBackgroundColor: ctx => bDiff[ctx.dataIndex] >= 0 ? 'rgba(63,185,80,0.9)' : 'rgba(248,81,73,0.9)'
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => ` Differenza: ${fmt.currency(ctx.parsed.y)}`,
                labelColor: ctx => {
                  const c = ctx.parsed.y >= 0 ? 'rgba(63,185,80,0.9)' : 'rgba(248,81,73,0.9)';
                  return { borderColor: c, backgroundColor: c };
                }
              }
            },
          },
          scales: {
            x: { ticks: { color: chartColors().tick }, grid: { color: chartColors().grid } },
            y: { beginAtZero: true, ticks: { color: chartColors().tick, callback: v => fmt.currency(v) }, grid: { color: chartColors().grid } }
          }
        }
      });
    } else if (budgetCtx && !bLabels.length) {
      budgetCtx.parentElement.innerHTML += '<p class="text-muted" style="text-align:center;padding:20px">Nessun dato budget disponibile</p>';
    }
  }

  // Pie chart rimosso (sostituito da widget Salute Finanziaria)
  if (charts.pie) { charts.pie.destroy(); charts.pie = null; }

  // Recent transactions (fetch desc → display asc: most recent at bottom)
  const recentAsc = [...recent].reverse();
  const compactTd = 'padding:4px 8px';
  document.getElementById('recentRows').innerHTML = recentAsc.length ? recentAsc.map(t => `
    <tr style="cursor:pointer" onclick="navigateToTx(${t.id})">
      <td style="${compactTd};white-space:nowrap;color:var(--txt2)">${fmt.date(t.date)}</td>
      <td style="${compactTd}" class="td-main">${t.description}</td>
      <td style="${compactTd}">${t.split_count > 0
        ? `<span class="cat-chip" style="opacity:.8">÷ ${t.split_count} voci</span>`
        : `<span class="cat-chip">${t.category_icon||''}  ${t.category_name||'-'}</span>`}</td>
      <td style="${compactTd};color:var(--txt2)">${t.account_name||'-'}</td>
      <td style="${compactTd}" class="text-right amount-${t.type}">${t.type==='expense'?'-':''}${fmt.currency(t.amount)}</td>
    </tr>`).join('') :
    '<tr><td colspan="5" class="text-muted" style="text-align:center;padding:20px">Nessuna transazione</td></tr>';

  // Upcoming scheduled
  const dashTodayStr = _todayStr();
  const dashToday = new Date(dashTodayStr + 'T00:00:00');
  document.getElementById('upcomingRows').innerHTML = upcoming.length ? upcoming.map(u => {
    const nextStr = u.date || u.start_date;
    const days = nextStr ? Math.round((new Date(nextStr + 'T00:00:00') - dashToday) / 86400000) : null;
    const daysHtml = days === null ? '—'
      : days < 0  ? `<span class="sched-days-badge overdue">⚠️ ${Math.abs(days)}g fa</span>`
      : days === 0 ? `<span class="sched-days-badge today">Oggi</span>`
      : `<span class="sched-days-badge upcoming">${days}g</span>`;
    // Bottone Esegui solo per pianificate scadute o in scadenza oggi
    const showExec = u.overdue || (days !== null && days <= 0);
    const execBtn  = showExec
      ? `<button onclick="_dashExecSched(${u.id})" title="Esegui ora — pre-compila e avanza la pianificata" style="background:transparent;border:none;cursor:pointer;color:var(--accent);font-size:11px;padding:0 4px;line-height:1">▶</button>`
      : '';
    return `
    <tr class="${u.overdue ? 'upcoming-overdue' : ''}">
      <td><span class="cat-chip">${u.category_icon||''}${u.parent_category_name?u.parent_category_name+':'+u.category_name:u.category_name||'-'}</span></td>
      <td class="td-main">${u.description||'-'}</td>
      <td>${daysHtml}</td>
      <td class="text-right amount-${u.type}">${u.type==='expense'?'-':''}${fmt.currency(u.amount)}</td>
      <td style="width:24px;text-align:center;padding:0">${execBtn}</td>
    </tr>`;
  }).join('') :
    '<tr><td colspan="5" class="text-muted" style="text-align:center;padding:20px">Nessuna transazione pianificata</td></tr>';

  // Savings chart (monthly net = income - expenses)
  const savArr = incArr.map((v,i) => v - expArr[i]);
  if (charts.savings) charts.savings.destroy();
  // Gradiente verticale per-barra: verde (netto >=0) o rosso (netto <0), con la parte
  // satura vicino allo zero che sfuma verso l'estremità della barra. Scriptable function:
  // Chart.js la chiama per ogni barra, così ogni barra ha il suo gradiente nel verso giusto.
  const _savGrad = ctx => {
    const {chart, dataIndex} = ctx;
    const area = chart.chartArea;
    if (!area) return 'rgba(63,185,80,.75)';
    const pos = savArr[dataIndex] >= 0;
    const grad = ctx.chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
    if (pos) { grad.addColorStop(0, 'rgba(63,185,80,.9)'); grad.addColorStop(1, 'rgba(63,185,80,.2)'); }
    else     { grad.addColorStop(0, 'rgba(248,81,73,.2)'); grad.addColorStop(1, 'rgba(248,81,73,.9)'); }
    return grad;
  };
  charts.savings = new Chart(document.getElementById('savingsChart'), {
    type: 'bar',
    data: { labels: months, datasets: [
      // Un'unica serie: ogni mese ha una sola barra (netto), verde se >=0, rossa se <0.
      // Due dataset separati facevano riservare a Chart.js due slot affiancati per mese,
      // disallineando la barra dal centro come se ci fossero due serie.
      { label:'Risparmio', data: savArr,
        backgroundColor: _savGrad,
        borderRadius:4 }
    ]},
    options: { responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false} },
      scales:{ x:{ticks:{color:chartColors().tick},grid:{color:chartColors().grid}},
               y:{ticks:{color:chartColors().tick},grid:{color:chartColors().grid}}}}
  });

  // Top categories chart (horizontal bar)
  const top5 = [...catData].sort((a,b)=>b.total-a.total).slice(0,10);
  if (charts.topCat) charts.topCat.destroy();
  if (top5.length) {
    charts.topCat = new Chart(document.getElementById('topCatChart'), {
      type: 'bar',
      plugins:[_dashGradPlugin],
      data: { labels: top5.map(c => c.icon+' '+c.name),
              datasets: [{label:'Spesa', data: top5.map(c=>c.total),
                backgroundColor: top5.map(c=>c.color||'rgba(88,166,255,.7)'), borderRadius:4}]},
      options: { indexAxis:'y', responsive:true, maintainAspectRatio:false,
        plugins:{legend:{display:false},
          tooltip:{callbacks:{
            // Titolo del tooltip: "Genitore : Categoria" se la categoria ha un parent.
            title: items => { const c = top5[items[0].dataIndex];
              return c.parent_name ? `${c.parent_name} : ${c.name}` : c.name; }
          }}},
        scales:{ x:{ticks:{color:chartColors().tick,font:{size:10}},grid:{color:chartColors().grid}},
                 y:{ticks:{color:chartColors().tick,font:{size:10}},grid:{color:chartColors().grid}}}}
    });
  }
}

// ── Widget Salute Finanziaria (F1+F5) ─────────────────────────────────────
// Widget Salute Finanziaria: calcola lo score (utils.computeHealthScore) e mostra punteggio,
// etichetta, mesi di riserva di emergenza e tasso di risparmio degli ultimi 12 mesi.
function _renderDashHealth(balRows12, accounts) {
  const body = document.getElementById('dashHealthBody');
  if (!body) return;
  const h = computeHealthScore(balRows12, accounts);
  const runwayDisplay = !isFinite(h.runwayMonths) || h.runwayMonths >= 99 ? '99+' : h.runwayMonths.toFixed(1);
  const runwayColor = h.scoreRunway >= 10 ? 'var(--income)' : h.scoreRunway >= 6 ? '#e8a838' : 'var(--expense)';
  const rateColor   = h.avgSavingsRate >= 10 ? 'var(--income)' : h.avgSavingsRate >= 5 ? '#e8a838' : 'var(--expense)';
  body.innerHTML = `
    <div style="display:flex;align-items:center;gap:18px;width:100%">
      <div style="text-align:center;flex-shrink:0;padding:6px 14px;background:var(--bg3);border-radius:12px;min-width:90px">
        <div style="font-size:38px;font-weight:700;color:${h.scoreColor};line-height:1">${h.score}</div>
        <div style="font-size:10px;color:var(--txt3);margin-top:2px">/ 100</div>
        <div style="font-size:12px;font-weight:600;color:${h.scoreColor};margin-top:4px">${h.scoreLabel}</div>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;gap:10px">
        <div>
          <div style="font-size:10px;color:var(--txt3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">Riserva di emergenza</div>
          <div style="display:flex;align-items:baseline;gap:8px">
            <span style="font-size:20px;font-weight:700;color:${runwayColor}">${runwayDisplay}</span>
            <span style="font-size:11px;color:var(--txt3)">mesi</span>
          </div>
        </div>
        <div>
          <div style="font-size:10px;color:var(--txt3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">Tasso risparmio (12m)</div>
          <div style="display:flex;align-items:baseline;gap:8px">
            <span style="font-size:18px;font-weight:700;color:${rateColor}">${h.avgSavingsRate.toFixed(1)}%</span>
            <span style="font-size:11px;color:var(--txt3)">· ${(h.posPct*100).toFixed(0)}% mesi positivi</span>
          </div>
        </div>
      </div>
    </div>`;
}

// ── Esegui pianificata ora (F6) ───────────────────────────────────────────
// "Esegui ora" una pianificata dalla dashboard: apre il modale transazione precompilato
// (aggiunge il tag "Da Budget") e, al salvataggio, avanza la pianificata alla prossima data.
window._dashExecSched = async id => {
  const u = (window._dashUpcomingCache || []).find(x => x.id === id);
  if (!u) { toast('Pianificata non trovata', 'error'); return; }
  const [cats, accs, tags] = await Promise.all([api.getCategories(), api.getAccounts(), api.getTags()]);
  const budgetTag = tags.find(t => t.system_key === 'budget');
  const existingIds = (u.tags || []).map(t => Number(t.id));
  const tagIds = budgetTag && !existingIds.includes(budgetTag.id)
    ? [...existingIds, budgetTag.id]
    : existingIds;
  const nextDate = u.date || u.start_date;
  showTxModal({
    id: null, date: nextDate,
    amount: u.amount, type: u.type,
    category_id: u.category_id || null,
    account_id: u.account_id,
    to_account_id: u.to_account_id || null,
    description: u.description || '',
    color: u.color || null,
    reconciled: u.reconciled ?? 1,
    tag_ids: tagIds,
  }, cats, accs, u.type, tags, async (txResult) => {
    await api.advanceScheduled(id, nextDate, txResult?.id);
    toast('Pianificata eseguita e avanzata');
    renderDashboard();
  });
};
