/* ═══════════════════════════════════════════════════════════════════════════
   LucaMoneyManager — app.js
   Bridge JS→Java via cefQuery, tutte le pagine SPA
═══════════════════════════════════════════════════════════════════════════ */

/* ─── Bridge Java ─────────────────────────────────────────────────────────── */
// JCEF tronca le stringhe per byte, non per carattere: un emoji a 4 byte
// (es. 🏦) sfasa l'offset JSON causando MalformedJsonException in Gson.
// Fix: codifica tutto in base64 (ASCII puro) prima di passare a cefQuery.
// Encode UTF-8 string → base64 (gestisce emoji/surrogate pairs)
function _toB64(str) {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/gi,
    (_, h) => String.fromCharCode(parseInt(h, 16))));
}
// Decode base64 → UTF-8 string (simmetrico a Java Base64.getEncoder())
function _fromB64(b64) {
  return decodeURIComponent(atob(b64).split('').map(c =>
    '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
}

function callJava(method, params = {}) {
  return new Promise((resolve, reject) => {
    window.cefQuery({
      request: _toB64(JSON.stringify({ method, params })),
      onSuccess: r => resolve(JSON.parse(_fromB64(r))),
      onFailure: (code, msg) => reject(new Error(msg))
    });
  });
}

const api = {
  // Finestra
  minimize:    ()          => callJava('minimize'),
  maximize:    ()          => callJava('maximize'),
  close:       ()          => callJava('close'),
  getWindowPos:()          => callJava('getWindowPos'),
  setWindowPos:(x,y)       => callJava('setWindowPos', {x,y}),

  // Conti
  getAccounts:   ()     => callJava('getAccounts'),
  addAccount:    data   => callJava('addAccount',   data),
  updateAccount: data   => callJava('updateAccount', data),
  deleteAccount: id     => callJava('deleteAccount', {id}),

  // Categorie
  getCategories:   ()   => callJava('getCategories'),
  addCategory:     data => callJava('addCategory',    data),
  updateCategory:  data => callJava('updateCategory', data),
  deleteCategory:  id   => callJava('deleteCategory', {id}),

  // Tag
  getTags:    ()   => callJava('getTags'),
  addTag:     data => callJava('addTag',    data),
  updateTag:  data => callJava('updateTag', data),
  deleteTag:  id   => callJava('deleteTag', {id}),

  // Transazioni
  getTransactions:   f    => callJava('getTransactions',   f || {}),
  addTransaction:    data => callJava('addTransaction',    data),
  updateTransaction: data => callJava('updateTransaction', data),
  deleteTransaction: id   => callJava('deleteTransaction', {id}),

  // Budget
  getBudgets:  (month,year) => callJava('getBudgets', {month,year}),
  setBudget:   data         => callJava('setBudget',  data),
  deleteBudget:id           => callJava('deleteBudget',{id}),
  getBudgetYear: y          => callJava('getBudgetYear', {year:y}),
  setBudgetBulk: data       => callJava('setBudgetBulk', data),
  generateBudget: data      => callJava('generateBudget', data),

  // Portafoglio
  getPortfolio:        ()   => callJava('getPortfolio'),
  addPortfolioItem:    data => callJava('addPortfolioItem',    data),
  updatePortfolioItem: data => callJava('updatePortfolioItem', data),
  deletePortfolioItem: id   => callJava('deletePortfolioItem', {id}),

  // Stats
  getDashboardStats:   y          => callJava('getDashboardStats',   {year:y}),
  getMonthlyChartData: y          => callJava('getMonthlyChartData',  {year:y}),
  getCategoryChartData:(y,type)   => callJava('getCategoryChartData', {year:y,type}),

  // Impostazioni
  getSettings:   ()           => callJava('getSettings'),
  setSetting:    (key, value) => callJava('setSetting', {key, value}),
  chooseDbFile:  (mode)       => callJava('chooseDbFile', {mode}),
};

/* ─── Utils ───────────────────────────────────────────────────────────────── */
const fmt = {
  currency: v => new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(v ?? 0),
  date: s => s ? new Date(s).toLocaleDateString('it-IT') : '',
  month: (m,y) => new Date(y,m-1,1).toLocaleDateString('it-IT',{month:'long',year:'numeric'}),
  pct: v => (v >= 0 ? '+' : '') + v.toFixed(2) + '%',
};

function toast(msg, type='success') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  const icon = type==='success'?'✅':type==='error'?'❌':'ℹ️';
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

function confirm(title, msg) {
  return new Promise(resolve => {
    openModal(title, `<p style="color:var(--txt2);line-height:1.6">${msg}</p>`, resolve, 'Elimina', 'btn-danger');
    document.getElementById('modalCancel').onclick = () => { closeModal(); resolve(false); };
  });
}

/* ─── Titlebar drag ──────────────────────────────────────────────────────── */
let drag=false, startX, startY, winX, winY;
const titlebar = document.getElementById('titlebar');

titlebar.addEventListener('mousedown', async e => {
  if (e.target.closest('.tb-btn')) return;
  drag = true;
  const pos = await api.getWindowPos();
  startX = e.screenX; startY = e.screenY;
  winX = pos.x; winY = pos.y;
});
document.addEventListener('mousemove', e => {
  if (!drag) return;
  api.setWindowPos(winX + (e.screenX - startX), winY + (e.screenY - startY));
});
document.addEventListener('mouseup', () => drag = false);

document.getElementById('btnMin').onclick   = () => api.minimize();
document.getElementById('btnMax').onclick   = () => api.maximize();
document.getElementById('btnClose').onclick = () => api.close();

/* ─── Router ──────────────────────────────────────────────────────────────── */
const PAGE_TITLES = {
  dashboard:'Dashboard', transactions:'Transazioni', accounts:'Conti',
  budgets:'Budget', portfolio:'Portafoglio', reports:'Report', settings:'Impostazioni'
};
let currentPage = 'dashboard';
let charts = {};

function navigate(page) {
  if (currentPage === page) return;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`pg-${page}`).classList.add('active');
  document.querySelector(`[data-page="${page}"]`).classList.add('active');
  document.getElementById('pageTitle').textContent = PAGE_TITLES[page];
  currentPage = page;
  renderPage(page);
}

document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', () => navigate(el.dataset.page));
});

function renderPage(page) {
  switch(page) {
    case 'dashboard':    renderDashboard();    break;
    case 'transactions': renderTransactions(); break;
    case 'accounts':     renderAccounts();     break;
    case 'budgets':      renderBudgets();      break;
    case 'portfolio':    renderPortfolio();    break;
    case 'reports':      renderReports();      break;
    case 'categories':   renderCategories();   break;
    case 'tags':         renderTags();         break;
    case 'settings':     renderSettings();     break;
  }
}

/* ─── Modal ───────────────────────────────────────────────────────────────── */
let modalConfirmCallback = null;

function openModal(title, bodyHtml, onConfirm, confirmLabel='Salva', confirmClass='btn-primary') {
  document.getElementById('modalTitle').textContent   = title;
  document.getElementById('modalBody').innerHTML      = bodyHtml;
  document.getElementById('modalConfirm').textContent = confirmLabel;
  document.getElementById('modalConfirm').className   = `btn ${confirmClass}`;
  modalConfirmCallback = onConfirm;
  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  modalConfirmCallback = null;
}

document.getElementById('modalClose').onclick  = closeModal;
document.getElementById('modalCancel').onclick = closeModal;
document.getElementById('modalConfirm').onclick = () => { if (modalConfirmCallback) modalConfirmCallback(); };
document.getElementById('modalOverlay').addEventListener('click', e => { if(e.target===e.currentTarget) closeModal(); });

/* ─── Sidebar accounts ───────────────────────────────────────────────────── */
async function updateSidebar() {
  const accounts = await api.getAccounts();
  const el = document.getElementById('sidebarAccounts');
  el.innerHTML = accounts.map(a => `
    <div class="sidebar-account-item">
      <div class="acc-name"><span>${a.icon}</span><span>${a.name}</span></div>
      <div class="acc-balance" style="color:${a.color}">${fmt.currency(a.balance)}</div>
    </div>`).join('');
}

/* ═══════════════════════════════════════════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════════════════════════════════════════ */
let dashYear = new Date().getFullYear();

async function renderDashboard() {
  const pg = document.getElementById('pg-dashboard');
  pg.innerHTML = `
    <div class="month-nav">
      <button id="dashPrev">‹</button>
      <span id="dashYearLabel"></span>
      <button id="dashNext">›</button>
    </div>
    <div class="stats-grid" id="statsGrid"></div>
    <div class="card" style="margin-bottom:24px">
      <div class="card-header"><span class="card-title">I miei conti</span>
        <button class="btn btn-ghost" onclick="navigate('accounts')">Gestisci →</button>
      </div>
      <div id="dashAccounts"></div>
    </div>
    <div class="grid-2" style="margin-bottom:24px">
      <div class="card"><div class="card-header"><span class="card-title">Entrate vs Uscite mensili</span></div>
        <canvas id="barChart" height="200"></canvas></div>
      <div class="card"><div class="card-header"><span class="card-title">Spese per categoria</span></div>
        <canvas id="pieChart" height="200"></canvas></div>
    </div>
    <div class="card">
      <div class="card-header">
        <span class="card-title">Ultime transazioni</span>
        <button class="btn btn-ghost" onclick="navigate('transactions')">Vedi tutte →</button>
      </div>
      <div class="table-wrap"><table><thead><tr>
        <th>Data</th><th>Descrizione</th><th>Categoria</th><th>Conto</th><th class="text-right">Importo</th>
      </tr></thead><tbody id="recentRows"></tbody></table></div>
    </div>`;

  document.getElementById('dashYearLabel').textContent = dashYear;
  document.getElementById('dashPrev').onclick = () => { dashYear--; renderDashboard(); };
  document.getElementById('dashNext').onclick = () => { dashYear++; renderDashboard(); };

  const [stats, accounts, recent, monthly, catData] = await Promise.all([
    api.getDashboardStats(dashYear),
    api.getAccounts(),
    api.getTransactions({year:dashYear, limit:10}),
    api.getMonthlyChartData(dashYear),
    api.getCategoryChartData(dashYear, 'expense')
  ]);

  // Stat cards
  document.getElementById('statsGrid').innerHTML = `
    <div class="stat-card stat-balance">
      <div class="stat-label">💳 Saldo Totale</div>
      <div class="stat-value">${fmt.currency(stats.balance)}</div>
      <div class="stat-sub">Tutti i conti</div>
    </div>
    <div class="stat-card stat-income">
      <div class="stat-label">📥 Entrate ${dashYear}</div>
      <div class="stat-value">${fmt.currency(stats.income)}</div>
    </div>
    <div class="stat-card stat-expense">
      <div class="stat-label">📤 Uscite ${dashYear}</div>
      <div class="stat-value">${fmt.currency(stats.expenses)}</div>
    </div>
    <div class="stat-card stat-net">
      <div class="stat-label">💰 Risparmio Netto ${dashYear}</div>
      <div class="stat-value" style="color:${stats.net>=0?'var(--income)':'var(--expense)'}">${fmt.currency(stats.net)}</div>
      <div class="stat-sub">${stats.transaction_count} transazioni</div>
    </div>`;

  // Accounts grouped by type
  const ACC_TYPE_ORDER  = ['checking','savings','cash','credit','investment'];
  const ACC_TYPE_LABELS = {checking:'Conti Correnti',savings:'Risparmio',cash:'Contanti',credit:'Carte di Credito',investment:'Investimenti'};
  const grouped = {};
  accounts.forEach(a => { (grouped[a.type] = grouped[a.type] || []).push(a); });
  const orderedTypes = [...new Set([...ACC_TYPE_ORDER.filter(t => grouped[t]), ...Object.keys(grouped)])];

  document.getElementById('dashAccounts').innerHTML = orderedTypes.length ? `
    <div class="dash-accounts-groups">
      ${orderedTypes.map(t => `
        <div class="dash-acc-group">
          <div class="dash-acc-group-label">${ACC_TYPE_LABELS[t] || t}</div>
          <div class="dash-acc-cards">
            ${grouped[t].map(a => `
              <div class="dash-acc-card" onclick="navigateToAccountTx(${a.id})" style="--acc-color:${a.color || 'var(--accent)'}">
                <div class="dash-acc-card-icon">${a.icon}</div>
                <div class="dash-acc-card-info">
                  <div class="dash-acc-card-name">${a.name}</div>
                  <div class="dash-acc-card-balance" style="color:${a.color || 'var(--accent)'}; ${a.balance < 0 ? 'color:var(--expense)' : ''}">${fmt.currency(a.balance)}</div>
                </div>
              </div>`).join('')}
          </div>
        </div>`).join('')}
    </div>` :
    `<p class="text-muted" style="padding:20px;text-align:center">Nessun conto. <a onclick="navigate('accounts')" style="color:var(--accent);cursor:pointer">Aggiungi un conto →</a></p>`;

  // Bar chart
  const months = Array.from({length:12},(_,i)=>new Date(0,i).toLocaleString('it-IT',{month:'short'}));
  const incArr = Array(12).fill(0), expArr = Array(12).fill(0);
  monthly.forEach(r => { incArr[r.month-1]=r.income; expArr[r.month-1]=r.expenses; });

  if (charts.bar) charts.bar.destroy();
  charts.bar = new Chart(document.getElementById('barChart'), {
    type:'bar',
    data:{ labels:months,
      datasets:[
        {label:'Entrate', data:incArr, backgroundColor:'rgba(63,185,80,.7)', borderRadius:4},
        {label:'Uscite',  data:expArr, backgroundColor:'rgba(248,81,73,.7)',  borderRadius:4}
      ]},
    options:{ responsive:true, plugins:{legend:{labels:{color:'#8b949e'}}},
      scales:{x:{ticks:{color:'#8b949e'},grid:{color:'#21262d'}},
              y:{ticks:{color:'#8b949e'},grid:{color:'#21262d'}}}}
  });

  // Pie chart
  if (charts.pie) charts.pie.destroy();
  if (catData.length) {
    charts.pie = new Chart(document.getElementById('pieChart'), {
      type:'doughnut',
      data:{ labels:catData.map(c=>c.icon+' '+c.name),
             datasets:[{data:catData.map(c=>c.total), backgroundColor:catData.map(c=>c.color), borderWidth:0}]},
      options:{ responsive:true, plugins:{legend:{position:'right',labels:{color:'#8b949e',font:{size:11}}}}}
    });
  }

  // Recent transactions
  document.getElementById('recentRows').innerHTML = recent.length ? recent.map(t => `
    <tr>
      <td>${fmt.date(t.date)}</td>
      <td class="td-main">${t.description}</td>
      <td><span class="cat-chip">${t.category_icon||''}  ${t.category_name||'-'}</span></td>
      <td>${t.account_name||'-'}</td>
      <td class="text-right amount-${t.type}">${t.type==='expense'?'-':''}${fmt.currency(t.amount)}</td>
    </tr>`).join('') :
    '<tr><td colspan="5" class="text-muted" style="text-align:center;padding:30px">Nessuna transazione</td></tr>';
}

/* ═══════════════════════════════════════════════════════════════════════════
   TRANSAZIONI
═══════════════════════════════════════════════════════════════════════════ */
let txFilters = { month: new Date().getMonth()+1, year: new Date().getFullYear() };
let txSort    = { col: 'date', dir: 'desc' };
let txCache   = [];

function navigateToAccountTx(accountId) {
  txFilters = { month: new Date().getMonth()+1, year: new Date().getFullYear(), account_id: String(accountId) };
  navigate('transactions');
}

async function renderTransactions() {
  const pg = document.getElementById('pg-transactions');
  const [categories, accounts, tags] = await Promise.all([api.getCategories(), api.getAccounts(), api.getTags()]);

  pg.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">Transazioni</h2>
      <div class="tx-add-group">
        <button class="btn btn-add-income"   id="btnAddIncome">📥 Entrata</button>
        <button class="btn btn-add-expense"  id="btnAddExpense">📤 Uscita</button>
        <button class="btn btn-add-transfer" id="btnAddTransfer">🔁 Trasferimento</button>
      </div>
    </div>
    <div class="filter-bar">
      <select class="form-control" id="txMonth">
        ${Array.from({length:12},(_,i)=>`<option value="${i+1}" ${i+1==txFilters.month?'selected':''}>${new Date(0,i).toLocaleString('it-IT',{month:'long'})}</option>`).join('')}
      </select>
      <select class="form-control" id="txYear">
        ${[2023,2024,2025,2026].map(y=>`<option ${y==txFilters.year?'selected':''}>${y}</option>`).join('')}
      </select>
      <select class="form-control" id="txType">
        <option value="">Tutti i tipi</option>
        <option value="income">Entrate</option>
        <option value="expense">Uscite</option>
        <option value="transfer">Trasferimenti</option>
      </select>
      <select class="form-control" id="txAccount">
        <option value="">Tutti i conti</option>
        ${accounts.map(a=>`<option value="${a.id}" ${String(a.id)===String(txFilters.account_id)?'selected':''}>${a.icon} ${a.name}</option>`).join('')}
      </select>
      <input class="form-control" id="txSearch" placeholder="🔍 Cerca..." style="min-width:160px">
      <button class="btn btn-ghost" id="btnApplyFilter">Filtra</button>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table id="txTable"><thead><tr>
          <th class="th-sort" data-col="date"        onclick="_txSortBy('date')">Data<span class="sort-ind">▼</span></th>
          <th class="th-sort" data-col="description" onclick="_txSortBy('description')">Descrizione<span class="sort-ind"></span></th>
          <th class="th-sort" data-col="type"        onclick="_txSortBy('type')">Tipo<span class="sort-ind"></span></th>
          <th class="th-sort" data-col="category"    onclick="_txSortBy('category')">Categoria<span class="sort-ind"></span></th>
          <th class="th-sort" data-col="account"     onclick="_txSortBy('account')">Conto<span class="sort-ind"></span></th>
          <th class="th-sort text-right" data-col="amount" onclick="_txSortBy('amount')">Importo<span class="sort-ind"></span></th>
          <th></th>
        </tr></thead><tbody id="txBody"></tbody></table>
      </div>
    </div>`;

  document.getElementById('btnApplyFilter').onclick = () => {
    txFilters = {
      month:     parseInt(document.getElementById('txMonth').value),
      year:      parseInt(document.getElementById('txYear').value),
      type:      document.getElementById('txType').value,
      account_id:document.getElementById('txAccount').value || undefined,
      search:    document.getElementById('txSearch').value,
    };
    loadTxRows(categories, accounts);
  };

  document.getElementById('btnAddIncome').onclick   = () => showTxModal(null, categories, accounts, 'income',   tags);
  document.getElementById('btnAddExpense').onclick  = () => showTxModal(null, categories, accounts, 'expense',  tags);
  document.getElementById('btnAddTransfer').onclick = () => showTxModal(null, categories, accounts, 'transfer', tags);

  loadTxRows(categories, accounts);
}

async function loadTxRows(categories, accounts) {
  txCache = await api.getTransactions(txFilters);
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
  const sorted = sortTxs(txCache);
  tbody.innerHTML = sorted.length ? sorted.map(t => `
    <tr data-tx-id="${t.id}">
      <td>${fmt.date(t.date)}</td>
      <td class="td-main">${t.description||''}${(t.tags&&t.tags.length)?`<br>${t.tags.map(tg=>`<span class="tag-inline" style="--tc:${tg.color}">${tg.name}</span>`).join('')}`:''}</td>
      <td><span class="badge badge-${t.type}">${t.type==='income'?'Entrata':t.type==='expense'?'Uscita':'Trasferimento'}</span></td>
      <td>${t.category_icon||''} ${t.category_name||'-'}</td>
      <td>${t.account_name||'-'}${t.to_account_name?` → ${t.to_account_name}`:''}</td>
      <td class="text-right amount-${t.type}">${t.type==='expense'?'-':''}${fmt.currency(t.amount)}</td>
      <td>
        <button class="btn btn-ghost btn-icon" onclick="editTx(${t.id})">✏️</button>
        <button class="btn btn-ghost btn-icon" onclick="deleteTx(${t.id})">🗑️</button>
      </td>
    </tr>`).join('') :
    '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--txt3)">Nessuna transazione trovata</td></tr>';
}

// Restituisce solo <option> (no optgroup) per le categorie foglia del gruppo.
// Macrocategorie senza figli = selezionabili; macrocategorie CON figli = escluse.
function buildCatOptions(cats, selectedId) {
  const parentIds = new Set(cats.filter(c => c.parent_id).map(c => c.parent_id));
  // foglie = sottocategorie (parent_id!=null) OPPURE macrocategorie senza figli
  const leafs = cats.filter(c => c.parent_id || !parentIds.has(c.id));
  return leafs.map(c => {
    const label = c.parent_id ? `${c.parent_name} › ${c.icon} ${c.name}` : `${c.icon} ${c.name}`;
    return `<option value="${c.id}" ${selectedId==c.id?'selected':''}>${label}</option>`;
  }).join('');
}

function showTxModal(tx, categories, accounts, defaultType = 'expense', tags = []) {
  const isEdit = !!tx;
  const initType = tx?.type || defaultType;
  const expCats = categories.filter(c=>c.type==='expense');
  const incCats = categories.filter(c=>c.type==='income');
  const today = new Date().toISOString().split('T')[0];

  const body = `
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
        <input type="number" step="0.01" min="0" class="form-control" id="f_amount" value="${tx?.amount||''}">
      </div>
      <div class="form-group" id="catGroup">
        <label class="form-label">Categoria</label>
        <select class="form-control" id="f_cat"></select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Conto</label>
        <select class="form-control" id="f_account">
          ${accounts.map(a=>`<option value="${a.id}" ${(tx ? tx.account_id==a.id : String(a.id)===String(txFilters.account_id))?'selected':''}>${a.icon} ${a.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group" id="toAccGroup" style="${tx?.type!=='transfer'?'display:none':''}">
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
      <div class="form-group">
        <label class="form-label">Tag</label>
        <div class="tag-selector" id="tagSelector">
          ${tags.map(t=>`<span class="tag-chip" data-tag-id="${t.id}" style="--tc:${t.color}">${t.name}</span>`).join('')}
          <span class="tag-chip tag-chip-new" id="tagChipNew">+ nuovo</span>
        </div>
        <div class="tag-new-row" id="tagNewRow" style="display:none">
          <input class="form-control" id="tagNewName" placeholder="Nome tag" style="flex:1">
          <input type="color" id="tagNewColor" value="#58a6ff" class="color-input-sm">
          <button class="btn btn-primary btn-icon" id="tagNewConfirm">✓</button>
          <button class="btn btn-ghost btn-icon" id="tagNewCancel">✕</button>
        </div>
      </div>`;

  // Popola il select categoria in base al tipo selezionato
  function updateCatSelect(keepSelected) {
    const type = document.getElementById('f_type')?.value;
    const sel  = document.getElementById('f_cat');
    if (!sel) return;
    if (type === 'transfer') {
      sel.innerHTML = '<option value="">Nessuna categoria</option>';
      return;
    }
    const cats = type === 'expense' ? expCats : incCats;
    sel.innerHTML = `<option value="">— Seleziona —</option>${buildCatOptions(cats, keepSelected)}`;
  }

  window.toggleCats = () => {
    const toAcc = document.getElementById('toAccGroup');
    if (toAcc) toAcc.style.display = document.getElementById('f_type')?.value === 'transfer' ? '' : 'none';
    updateCatSelect(null);
  };

  openModal(isEdit ? 'Modifica Transazione' : 'Nuova Transazione', body, async () => {
    const type = document.getElementById('f_type').value;
    const data = {
      id:            tx?.id,
      date:          document.getElementById('f_date').value,
      description:   document.getElementById('f_desc').value.trim(),
      amount:        parseFloat(document.getElementById('f_amount').value),
      type,
      category_id:   parseInt(document.getElementById('f_cat').value) || null,
      account_id:    parseInt(document.getElementById('f_account').value),
      to_account_id: type==='transfer' ? parseInt(document.getElementById('f_toAccount').value)||null : null,
      tag_ids:       [...selectedTagIds],
    };
    if (!data.amount || !data.account_id) {
      toast('Compila i campi obbligatori', 'error'); return;
    }
    try {
      if (isEdit) await api.updateTransaction(data);
      else        await api.addTransaction(data);
      closeModal();
      toast(isEdit ? 'Transazione aggiornata' : 'Transazione aggiunta');
      updateSidebar();
      loadTxRows(await api.getCategories(), await api.getAccounts());
    } catch(e) { toast(e.message, 'error'); }
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

  // Popola subito il select con le categorie del tipo iniziale
  updateCatSelect(tx?.category_id);
}

window.editTx = async id => {
  const [txs, cats, accs, tgs] = await Promise.all([
    api.getTransactions({limit:1000}), api.getCategories(), api.getAccounts(), api.getTags()
  ]);
  const tx = txs.find(t=>t.id===id);
  if (tx) showTxModal(tx, cats, accs, tx.type, tgs);
};

window.deleteTx = async id => {
  const ok = await confirm('Elimina transazione', 'Vuoi eliminare questa transazione? L\'operazione non è reversibile.');
  if (!ok) return;
  await api.deleteTransaction(id);
  toast('Transazione eliminata');
  updateSidebar();
  renderTransactions();
};

/* ─── Contex menu transazioni ─────────────────────────────────────────────── */
let _ctxTxId = null;

function _showCtxMenu(txId, x, y) {
  _ctxTxId = txId;
  const m = document.getElementById('ctxMenu');
  m.innerHTML = `
    <div class="ctx-item" onclick="_ctxDo('dup')">📋 Duplica transazione</div>
    <div class="ctx-separator"></div>
    <div class="ctx-item" onclick="_ctxDo('edit')">✏️ Modifica</div>
    <div class="ctx-item ctx-danger" onclick="_ctxDo('del')">🗑️ Elimina</div>`;
  m.style.display = 'block';
  const mw = 200, mh = 120;
  m.style.left = (x + mw > window.innerWidth  ? x - mw : x) + 'px';
  m.style.top  = (y + mh > window.innerHeight ? y - mh : y) + 'px';
}

function _hideCtxMenu() {
  document.getElementById('ctxMenu').style.display = 'none';
  _ctxTxId = null;
}

window._ctxDo = action => {
  const id = _ctxTxId; _hideCtxMenu();
  if (action === 'dup')  duplicateTx(id);
  if (action === 'edit') window.editTx(id);
  if (action === 'del')  window.deleteTx(id);
};

window.duplicateTx = async id => {
  const [txs, cats, accs, tgs] = await Promise.all([
    api.getTransactions({limit:10000}), api.getCategories(), api.getAccounts(), api.getTags()
  ]);
  const tx = txs.find(t => t.id === id);
  if (tx) showTxModal({...tx, id: undefined}, cats, accs, tx.type, tgs);
};

// Delegazione eventi a livello documento (funziona anche dopo re-render)
document.addEventListener('contextmenu', e => {
  const tr = e.target.closest('#txBody tr[data-tx-id]');
  if (!tr) { _hideCtxMenu(); return; }
  e.preventDefault();
  _showCtxMenu(parseInt(tr.dataset.txId), e.clientX, e.clientY);
});
document.addEventListener('click', () => _hideCtxMenu());
document.addEventListener('keydown', e => { if (e.key === 'Escape') _hideCtxMenu(); });

/* ═══════════════════════════════════════════════════════════════════════════
   CONTI
═══════════════════════════════════════════════════════════════════════════ */
async function renderAccounts() {
  const pg = document.getElementById('pg-accounts');
  pg.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">Conti</h2>
      <button class="btn btn-primary" id="btnAddAcc">+ Nuovo Conto</button>
    </div>
    <div class="accounts-grid" id="accountsGrid"></div>`;
  document.getElementById('btnAddAcc').onclick = () => showAccountModal(null);
  loadAccountCards();
}

async function loadAccountCards() {
  const grid = document.getElementById('accountsGrid');
  if (!grid) return;
  const accounts = await api.getAccounts();
  grid.innerHTML = accounts.length ? accounts.map(a => `
    <div class="account-card" style="--acc-color:${a.color}">
      <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${a.color}"></div>
      <div class="account-icon">${a.icon}</div>
      <div class="account-name">${a.name}</div>
      <div class="account-type">${accTypeLabel(a.type)}</div>
      <div class="account-balance" style="color:${a.color}">${fmt.currency(a.balance)}</div>
      <div class="account-actions">
        <button class="btn btn-ghost btn-icon" onclick="editAccount(${a.id})">✏️ Modifica</button>
        <button class="btn btn-ghost btn-icon" onclick="deleteAccount(${a.id})">🗑️</button>
      </div>
    </div>`).join('') :
    '<div class="empty-state"><div class="empty-icon">🏦</div><p>Nessun conto. Creane uno!</p></div>';
}

function accTypeLabel(t) {
  return {checking:'Conto Corrente',savings:'Risparmio',cash:'Contanti',credit:'Carta di Credito',investment:'Investimento'}[t]||t;
}

const ACCOUNT_ICONS = ['🏦','💳','💵','🏧','💰','📈','🏠','🚀'];
const ACCOUNT_COLORS = ['#58a6ff','#3fb950','#f85149','#d29922','#a371f7','#f0883e','#00d4aa','#8b949e'];

function showAccountModal(account) {
  const body = `
    <div class="form-group">
      <label class="form-label">Nome</label>
      <input class="form-control" id="a_name" placeholder="Es. Conto BancaX" value="${account?.name||''}">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Tipo</label>
        <select class="form-control" id="a_type">
          ${['checking','savings','cash','credit','investment'].map(t=>`<option value="${t}" ${account?.type===t?'selected':''}>${accTypeLabel(t)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Saldo iniziale (€)</label>
        <input type="number" step="0.01" class="form-control" id="a_balance" value="${account?.initial_balance||0}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Icona</label>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">
          ${ACCOUNT_ICONS.map(ic=>`<button type="button" class="btn btn-ghost btn-icon icon-pick ${account?.icon===ic?'icon-selected':''}" onclick="selectIcon(this,'${ic}')" data-icon="${ic}" style="font-size:20px">${ic}</button>`).join('')}
        </div>
        <input type="hidden" id="a_icon" value="${account?.icon||'🏦'}">
      </div>
      <div class="form-group">
        <label class="form-label">Colore</label>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">
          ${ACCOUNT_COLORS.map(c=>`<button type="button" onclick="selectColor(this,'${c}')" style="width:28px;height:28px;border-radius:50%;background:${c};border:2px solid ${account?.color===c?'#fff':'transparent'}" class="color-pick" data-color="${c}"></button>`).join('')}
        </div>
        <input type="hidden" id="a_color" value="${account?.color||'#58a6ff'}">
      </div>
    </div>`;

  openModal(account ? 'Modifica Conto' : 'Nuovo Conto', body, async () => {
    const data = {
      id:              account?.id,
      name:            document.getElementById('a_name').value.trim(),
      type:            document.getElementById('a_type').value,
      initial_balance: parseFloat(document.getElementById('a_balance').value)||0,
      icon:            document.getElementById('a_icon').value,
      color:           document.getElementById('a_color').value,
      currency:        'EUR',
    };
    if (!data.name) { toast('Inserisci un nome per il conto','error'); return; }
    try {
      if (account) await api.updateAccount(data);
      else         await api.addAccount(data);
      closeModal();
      toast(account ? 'Conto aggiornato' : 'Conto creato');
      updateSidebar();
      loadAccountCards();
    } catch(e) { toast(e.message,'error'); }
  });
}

window.selectIcon = (btn, icon) => {
  document.querySelectorAll('.icon-pick').forEach(b => b.classList.remove('icon-selected'));
  btn.classList.add('icon-selected');
  document.getElementById('a_icon').value = icon;
};
window.selectColor = (btn, color) => {
  document.querySelectorAll('.color-pick').forEach(b => b.style.border='2px solid transparent');
  btn.style.border='2px solid #fff';
  document.getElementById('a_color').value = color;
};
window.editAccount = async id => {
  const accounts = await api.getAccounts();
  showAccountModal(accounts.find(a=>a.id===id));
};
window.deleteAccount = async id => {
  const ok = await confirm('Elimina conto','Vuoi eliminare questo conto e tutte le sue transazioni?');
  if (!ok) return;
  await api.deleteAccount(id);
  toast('Conto eliminato');
  updateSidebar();
  loadAccountCards();
};

/* ═══════════════════════════════════════════════════════════════════════════
   BUDGET
═══════════════════════════════════════════════════════════════════════════ */
let budgetYear = new Date().getFullYear();

/* ═══════════════════════════════════════════════════════════════════════════
   BUDGET
═══════════════════════════════════════════════════════════════════════════ */
const MONTHS_SHORT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

async function renderBudgets() {
  const pg = document.getElementById('pg-budgets');
  pg.innerHTML = `
    <div class="section-header">
      <div class="month-nav" style="margin-bottom:0">
        <button id="budgPrev">‹</button>
        <span id="budgYearLabel"></span>
        <button id="budgNext">›</button>
      </div>
      <button class="btn btn-primary" id="btnGenBudget">Genera budget</button>
    </div>
    <div class="budget-year-wrap">
      <table class="budget-table" id="budgetTable">
        <thead><tr>
          <th class="budget-cat-th">Categoria</th>
          ${MONTHS_SHORT.map(m=>`<th class="budget-month-th">${m}</th>`).join('')}
          <th class="budget-total-th">Anno</th>
          <th class="budget-act-th"></th>
        </tr></thead>
        <tbody id="budgetBody"></tbody>
      </table>
    </div>`;

  document.getElementById('budgYearLabel').textContent = budgetYear;
  document.getElementById('budgPrev').onclick = () => { budgetYear--; renderBudgets(); };
  document.getElementById('budgNext').onclick = () => { budgetYear++; renderBudgets(); };
  document.getElementById('btnGenBudget').onclick = () => showGenerateBudgetModal();

  await loadBudgetTable();
}

let _budgetData = null;

async function loadBudgetTable() {
  _budgetData = await api.getBudgetYear(budgetYear);
  renderBudgetTable();
}

function renderBudgetTable() {
  const { budgets, actuals, categories } = _budgetData;

  if (!categories.length) {
    document.getElementById('budgetBody').innerHTML =
      `<tr><td colspan="15" style="text-align:center;padding:40px;color:var(--txt3)">
        Nessuna categoria trovata. Aggiungile prima dalla pagina Categorie.
      </td></tr>`;
    return;
  }

  // Lookup maps
  const budgetMap = {};  // catId -> {1:amt, 2:amt, ...}
  budgets.forEach(b => {
    if (!budgetMap[b.category_id]) budgetMap[b.category_id] = {};
    budgetMap[b.category_id][b.month] = b.amount;
  });
  const actualMap = {};  // catId -> {1:total, ...}
  actuals.forEach(a => {
    if (!actualMap[a.category_id]) actualMap[a.category_id] = {};
    actualMap[a.category_id][a.month] = a.total;
  });

  // Show ALL categories (all parents + their children)
  const ordered = categories;

  const rows = ordered.map(cat => {
    const bm = budgetMap[cat.id] || {};
    const am = actualMap[cat.id] || {};
    const isParent = !cat.parent_id;
    const annualBudget = Object.values(bm).reduce((s,v)=>s+v,0);
    const annualActual = Object.values(am).reduce((s,v)=>s+v,0);

    const cells = Array.from({length:12},(_,i)=>{
      const m = i+1;
      const budget = bm[m] || 0;
      const actual = am[m] || 0;
      const over   = actual > budget && budget > 0;
      return `<td class="budget-cell ${isParent?'budget-cell-parent':''}"
                  data-cat="${cat.id}" data-month="${m}"
                  onclick="_budgetCellEdit(this,${cat.id},${m})">
        <span class="budget-cell-val">${budget>0?fmt.currency(budget):''}</span>
        ${actual>0?`<span class="budget-cell-actual ${over?'over':''}">${fmt.currency(actual)}</span>`:''}
      </td>`;
    }).join('');

    const totalOver = annualActual > annualBudget && annualBudget > 0;
    return `<tr class="${isParent?'budget-row-parent':'budget-row-child'}" data-cat-id="${cat.id}">
      <td class="budget-cat-cell ${isParent?'':'budget-child-indent'}">
        <span style="color:${cat.color}">${cat.icon}</span> ${cat.name}
      </td>
      ${cells}
      <td class="budget-total-cell ${isParent?'budget-cell-parent':''}">
        ${annualBudget>0?`<b>${fmt.currency(annualBudget)}</b>`:''}
        ${annualBudget>0?`<span class="budget-cell-actual ${totalOver?'over':''}">${fmt.currency(annualActual)}</span>`:''}
      </td>
      <td class="budget-actions-cell">
        <button class="btn btn-ghost btn-icon" title="Imposta mensile" onclick="_budgetSetMonthly(${cat.id},'${cat.name}')">M</button>
        <button class="btn btn-ghost btn-icon" title="Imposta annuale" onclick="_budgetSetAnnual(${cat.id},'${cat.name}')">A</button>
        <button class="btn btn-ghost btn-icon" title="Svuota" onclick="_budgetClearRow(${cat.id})">🗑️</button>
      </td>
    </tr>`;
  }).join('');

  document.getElementById('budgetBody').innerHTML = rows;
}

window._budgetCellEdit = (td, catId, month) => {
  const valSpan = td.querySelector('.budget-cell-val');
  const current = (valSpan?.textContent || '').replace(/[^0-9.,]/g,'').replace(',','.');
  const inp = document.createElement('input');
  inp.type = 'number'; inp.step = '0.01'; inp.min = '0';
  inp.value = current || '';
  inp.className = 'budget-cell-input';
  inp.onclick = e => e.stopPropagation();

  const save = async () => {
    const val = parseFloat(inp.value) || 0;
    td.replaceWith(td); // restore original td
    await api.setBudget({category_id: catId, amount: val, month, year: budgetYear});
    await loadBudgetTable();
  };
  inp.onblur  = save;
  inp.onkeydown = e => { if (e.key==='Enter') inp.blur(); if (e.key==='Escape') loadBudgetTable(); };

  td.innerHTML = '';
  td.appendChild(inp);
  inp.focus(); inp.select();
};

window._budgetSetMonthly = (catId, catName) => {
  openModal(`Budget mensile — ${catName}`,
    `<div class="form-group">
       <label class="form-label">Importo mensile (€)</label>
       <input type="number" step="0.01" min="0" class="form-control" id="bm_amount" placeholder="Es. 500">
       <div class="settings-hint">Stesso importo per tutti i 12 mesi</div>
     </div>`,
    async () => {
      const v = parseFloat(document.getElementById('bm_amount').value) || 0;
      await api.setBudgetBulk({category_id:catId, year:budgetYear, amounts:Array(12).fill(v)});
      closeModal(); await loadBudgetTable();
    });
};

window._budgetSetAnnual = (catId, catName) => {
  openModal(`Budget annuale — ${catName}`,
    `<div class="form-group">
       <label class="form-label">Importo annuale (€)</label>
       <input type="number" step="0.01" min="0" class="form-control" id="ba_amount" placeholder="Es. 6000">
       <div class="settings-hint">Verrà diviso equamente nei 12 mesi (÷12)</div>
     </div>`,
    async () => {
      const total = parseFloat(document.getElementById('ba_amount').value) || 0;
      const monthly = Math.round(total / 12 * 100) / 100;
      await api.setBudgetBulk({category_id:catId, year:budgetYear, amounts:Array(12).fill(monthly)});
      closeModal(); await loadBudgetTable();
    });
};

window._budgetClearRow = async catId => {
  await api.setBudgetBulk({category_id:catId, year:budgetYear, amounts:Array(12).fill(0)});
  await loadBudgetTable();
};

function showGenerateBudgetModal() {
  const prevYear = budgetYear - 1;
  openModal(`Genera budget ${budgetYear}`,
    `<div class="form-group">
       <label class="form-label">Basare i valori su:</label>
       <label style="display:flex;align-items:center;gap:8px;margin:8px 0;cursor:pointer">
         <input type="radio" name="bg_source" value="history" checked>
         Storico ${prevYear} — copia le entrate/uscite effettive per categoria
       </label>
       <label style="display:flex;align-items:center;gap:8px;margin:8px 0;cursor:pointer">
         <input type="radio" name="bg_source" value="zero">
         Valori a zero — compila manualmente le celle
       </label>
       <div class="settings-hint" id="bg_hint">
         I valori mensili di ogni categoria vengono copiati dallo storico ${prevYear}.
         Potrai modificare ogni cella in seguito.
       </div>
     </div>`,
    async () => {
      const fromHistory = document.querySelector('input[name="bg_source"]:checked').value === 'history';
      await api.generateBudget({year: budgetYear, from_history: fromHistory});
      closeModal();
      await loadBudgetTable();
      toast(fromHistory
        ? `Budget ${budgetYear} generato dallo storico ${prevYear}`
        : `Budget ${budgetYear} pronto — inserisci i valori nelle celle`, 'success');
    });
  setTimeout(() => {
    document.querySelectorAll('input[name="bg_source"]').forEach(r => {
      r.onchange = () => {
        document.getElementById('bg_hint').textContent = r.value === 'history'
          ? `I valori mensili di ogni categoria vengono copiati dallo storico ${prevYear}. Potrai modificare ogni cella in seguito.`
          : 'Tutte le celle partiranno vuote. Usa i pulsanti M/A per impostare gli importi o clicca una cella.';
      };
    });
  }, 50);
}

/* ═══════════════════════════════════════════════════════════════════════════
   PORTAFOGLIO
═══════════════════════════════════════════════════════════════════════════ */
async function renderPortfolio() {
  const pg = document.getElementById('pg-portfolio');
  const items = await api.getPortfolio();

  const totalInvested = items.reduce((s,i)=>s+i.quantity*i.purchase_price,0);
  const totalCurrent  = items.reduce((s,i)=>s+i.quantity*(i.current_price||i.purchase_price),0);
  const totalPnL      = totalCurrent - totalInvested;
  const pnlPct        = totalInvested ? (totalPnL/totalInvested)*100 : 0;

  pg.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">Portafoglio Titoli</h2>
      <button class="btn btn-primary" id="btnAddStock">+ Aggiungi Titolo</button>
    </div>
    <div class="portfolio-summary">
      <div class="stat-card">
        <div class="stat-label">💼 Investito</div>
        <div class="stat-value" style="color:var(--accent)">${fmt.currency(totalInvested)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">📊 Valore Attuale</div>
        <div class="stat-value" style="color:var(--accent2)">${fmt.currency(totalCurrent)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">📈 P&L Totale</div>
        <div class="stat-value ${totalPnL>=0?'pnl-positive':'pnl-negative'}">${fmt.currency(totalPnL)}</div>
        <div class="stat-sub ${totalPnL>=0?'pnl-positive':'pnl-negative'}">${fmt.pct(pnlPct)}</div>
      </div>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table><thead><tr>
          <th>Ticker</th><th>Nome</th><th>Quantità</th><th>Prezzo Acq.</th>
          <th>Prezzo Att.</th><th class="text-right">Valore</th><th class="text-right">P&L</th><th></th>
        </tr></thead><tbody>
        ${items.length ? items.map(i => {
          const val = i.quantity*(i.current_price||i.purchase_price);
          const pnl = val - i.quantity*i.purchase_price;
          const pnlP = i.purchase_price ? (pnl/(i.quantity*i.purchase_price))*100 : 0;
          return `<tr>
            <td class="td-main" style="font-weight:700">${i.ticker}</td>
            <td>${i.name}</td>
            <td>${i.quantity}</td>
            <td>${fmt.currency(i.purchase_price)}</td>
            <td>${fmt.currency(i.current_price||i.purchase_price)}</td>
            <td class="text-right">${fmt.currency(val)}</td>
            <td class="text-right ${pnl>=0?'pnl-positive':'pnl-negative'}">${fmt.currency(pnl)}<br>
              <small>${fmt.pct(pnlP)}</small></td>
            <td>
              <button class="btn btn-ghost btn-icon" onclick="editStock(${i.id})">✏️</button>
              <button class="btn btn-ghost btn-icon" onclick="deleteStock(${i.id})">🗑️</button>
            </td>
          </tr>`;}).join('') :
          '<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--txt3)">Nessun titolo in portafoglio</td></tr>'}
        </tbody></table>
      </div>
    </div>`;

  document.getElementById('btnAddStock').onclick = () => showStockModal(null);
}

async function showStockModal(item) {
  const accounts = await api.getAccounts();
  const today = new Date().toISOString().split('T')[0];
  const body = `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Ticker</label>
        <input class="form-control" id="s_ticker" placeholder="Es. AAPL, ENI.MI" value="${item?.ticker||''}" style="text-transform:uppercase">
      </div>
      <div class="form-group">
        <label class="form-label">Nome</label>
        <input class="form-control" id="s_name" placeholder="Es. Apple Inc." value="${item?.name||''}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Quantità</label>
        <input type="number" step="0.0001" min="0" class="form-control" id="s_qty" value="${item?.quantity||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Prezzo acquisto (€)</label>
        <input type="number" step="0.01" min="0" class="form-control" id="s_buy" value="${item?.purchase_price||''}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Prezzo attuale (€)</label>
        <input type="number" step="0.01" min="0" class="form-control" id="s_cur" value="${item?.current_price||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Data acquisto</label>
        <input type="date" class="form-control" id="s_date" value="${item?.purchase_date||today}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Conto associato</label>
      <select class="form-control" id="s_account">
        <option value="">— Nessuno —</option>
        ${accounts.map(a=>`<option value="${a.id}" ${item?.account_id==a.id?'selected':''}>${a.icon} ${a.name}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Note</label>
      <input class="form-control" id="s_notes" placeholder="Opzionale" value="${item?.notes||''}">
    </div>`;

  openModal(item?'Modifica Titolo':'Nuovo Titolo', body, async () => {
    const data = {
      id:             item?.id,
      ticker:         document.getElementById('s_ticker').value.trim().toUpperCase(),
      name:           document.getElementById('s_name').value.trim(),
      quantity:       parseFloat(document.getElementById('s_qty').value),
      purchase_price: parseFloat(document.getElementById('s_buy').value),
      current_price:  parseFloat(document.getElementById('s_cur').value)||0,
      purchase_date:  document.getElementById('s_date').value,
      account_id:     parseInt(document.getElementById('s_account').value)||null,
      notes:          document.getElementById('s_notes').value.trim()||null,
    };
    if (!data.ticker||!data.name||!data.quantity||!data.purchase_price) {
      toast('Compila i campi obbligatori','error'); return;
    }
    try {
      if (item) await api.updatePortfolioItem(data);
      else      await api.addPortfolioItem(data);
      closeModal();
      toast(item?'Titolo aggiornato':'Titolo aggiunto');
      renderPortfolio();
    } catch(e) { toast(e.message,'error'); }
  });
}

window.editStock = async id => {
  const items = await api.getPortfolio();
  showStockModal(items.find(i=>i.id===id));
};
window.deleteStock = async id => {
  const ok = await confirm('Elimina titolo','Eliminare questo titolo dal portafoglio?');
  if (!ok) return;
  await api.deletePortfolioItem(id);
  toast('Titolo eliminato');
  renderPortfolio();
};

/* ═══════════════════════════════════════════════════════════════════════════
   REPORT
═══════════════════════════════════════════════════════════════════════════ */
let reportYear = new Date().getFullYear();

async function renderReports() {
  const pg = document.getElementById('pg-reports');
  pg.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">Report Annuale</h2>
      <div style="display:flex;align-items:center;gap:10px">
        <button class="btn btn-ghost" id="rPrev">‹</button>
        <span style="font-weight:700;font-size:18px" id="rYear">${reportYear}</span>
        <button class="btn btn-ghost" id="rNext">›</button>
      </div>
    </div>
    <div class="grid-2" style="margin-bottom:24px">
      <div class="card"><div class="card-header"><span class="card-title">Entrate vs Uscite mensili</span></div>
        <canvas id="rBar" height="220"></canvas></div>
      <div class="card"><div class="card-header"><span class="card-title">Categorie di spesa</span></div>
        <canvas id="rPie" height="220"></canvas></div>
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title">Riepilogo mensile</span></div>
      <div class="table-wrap">
        <table><thead><tr><th>Mese</th><th class="text-right">Entrate</th><th class="text-right">Uscite</th><th class="text-right">Saldo</th></tr></thead>
        <tbody id="rSummary"></tbody></table>
      </div>
    </div>`;

  document.getElementById('rPrev').onclick = () => { reportYear--; renderReports(); };
  document.getElementById('rNext').onclick = () => { reportYear++; renderReports(); };

  const now = new Date();
  const month = now.getMonth()+1;
  const [monthly, catData] = await Promise.all([
    api.getMonthlyChartData(reportYear),
    api.getCategoryChartData(month, reportYear, 'expense')
  ]);

  const labels = Array.from({length:12},(_,i)=>new Date(0,i).toLocaleString('it-IT',{month:'short'}));
  const incArr = Array(12).fill(0), expArr = Array(12).fill(0);
  monthly.forEach(r=>{incArr[r.month-1]=r.income; expArr[r.month-1]=r.expenses;});

  if (charts.rBar) charts.rBar.destroy();
  charts.rBar = new Chart(document.getElementById('rBar'),{
    type:'bar', data:{labels, datasets:[
      {label:'Entrate',data:incArr,backgroundColor:'rgba(63,185,80,.7)',borderRadius:4},
      {label:'Uscite', data:expArr,backgroundColor:'rgba(248,81,73,.7)', borderRadius:4}
    ]},
    options:{responsive:true,plugins:{legend:{labels:{color:'#8b949e'}}},
      scales:{x:{ticks:{color:'#8b949e'},grid:{color:'#21262d'}},
              y:{ticks:{color:'#8b949e'},grid:{color:'#21262d'}}}}
  });

  if (charts.rPie) charts.rPie.destroy();
  if (catData.length) {
    charts.rPie = new Chart(document.getElementById('rPie'),{
      type:'doughnut', data:{labels:catData.map(c=>c.icon+' '+c.name),
        datasets:[{data:catData.map(c=>c.total),backgroundColor:catData.map(c=>c.color),borderWidth:0}]},
      options:{responsive:true,plugins:{legend:{position:'right',labels:{color:'#8b949e',font:{size:11}}}}}
    });
  }

  // Riepilogo tabella
  const monthNames = Array.from({length:12},(_,i)=>new Date(0,i).toLocaleString('it-IT',{month:'long'}));
  const totInc = incArr.reduce((a,b)=>a+b,0), totExp = expArr.reduce((a,b)=>a+b,0);
  document.getElementById('rSummary').innerHTML =
    incArr.map((inc,i)=>inc||expArr[i]?`
      <tr>
        <td>${monthNames[i]}</td>
        <td class="text-right amount-income">${fmt.currency(inc)}</td>
        <td class="text-right amount-expense">${fmt.currency(expArr[i])}</td>
        <td class="text-right" style="color:${inc-expArr[i]>=0?'var(--income)':'var(--expense)'};font-weight:600">
          ${fmt.currency(inc-expArr[i])}</td>
      </tr>`:''
    ).join('') + `
    <tr style="border-top:2px solid var(--border);font-weight:700">
      <td>Totale Anno</td>
      <td class="text-right amount-income">${fmt.currency(totInc)}</td>
      <td class="text-right amount-expense">${fmt.currency(totExp)}</td>
      <td class="text-right" style="color:${totInc-totExp>=0?'var(--income)':'var(--expense)'};font-weight:700">
        ${fmt.currency(totInc-totExp)}</td>
    </tr>`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   IMPOSTAZIONI
═══════════════════════════════════════════════════════════════════════════ */
async function renderSettings() {
  const s = await api.getSettings();
  const pg = document.getElementById('pg-settings');
  pg.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Impostazioni</h1>
    </div>
    <div class="settings-wrap">

      <div class="settings-section">
        <div class="settings-section-title">🗄️ Database</div>

        <div class="settings-row">
          <div class="settings-label">
            <strong>File database attivo</strong>
            <span class="settings-hint">Il file SQLite dove vengono salvati tutti i dati</span>
          </div>
          <div class="settings-control">
            <div class="settings-path-row">
              <input id="dbPathInput" class="form-input settings-path-input"
                     type="text" readonly value="${s['db.path'] ?? ''}">
              <button class="btn btn-secondary" onclick="settingsChooseDb('open')">
                📂 Apri esistente
              </button>
              <button class="btn btn-ghost" onclick="settingsChooseDb('save')">
                ➕ Crea nuovo
              </button>
            </div>
            <p class="settings-hint" id="dbHint">
              Modifica applicata al prossimo avvio dell'app.
            </p>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">ℹ️ Informazioni</div>
        <div class="settings-info-grid">
          <span class="settings-info-label">Versione app</span>
          <span class="settings-info-value">1.0.0</span>
          <span class="settings-info-label">Database</span>
          <span class="settings-info-value">SQLite (JDBC)</span>
          <span class="settings-info-label">Browser engine</span>
          <span class="settings-info-value">Chromium (JCEF 135)</span>
          <span class="settings-info-label">Java</span>
          <span class="settings-info-value">JDK 25</span>
        </div>
      </div>

    </div>`;
}

async function settingsChooseDb(mode) {
  const res = await api.chooseDbFile(mode);
  if (res.cancelled) return;

  document.getElementById('dbPathInput').value = res.path;
  await api.setSetting('db.path', res.path);

  const hint = document.getElementById('dbHint');
  hint.style.color = 'var(--income)';
  hint.textContent = '✅ Percorso salvato. Riavvia l\'app per applicare la modifica.';
  toast('Percorso database aggiornato. Riavvia per applicarlo.', 'info');
}

/* ═══════════════════════════════════════════════════════════════════════════
   CATEGORIE
═══════════════════════════════════════════════════════════════════════════ */
async function renderCategories() {
  const pg = document.getElementById('pg-categories');
  const cats = await api.getCategories();

  // Separa categorie speciali, parent e figlie
  const transfer = cats.find(c => c.type === 'transfer');
  const parents  = cats.filter(c => !c.parent_id && c.type !== 'transfer');
  const children = cats.filter(c => c.parent_id);

  const typeLabel = t => t === 'income' ? '📥 Entrata' : t === 'expense' ? '📤 Uscita' : '🔁 Trasferimento';
  const typeCls   = t => t === 'income' ? 'badge-income' : t === 'expense' ? 'badge-expense' : 'badge-transfer';

  function childrenOf(parentId) {
    return children.filter(c => c.parent_id === parentId);
  }

  function renderTree(list) {
    return list.map(p => {
      const kids = childrenOf(p.id);
      const isTransfer = p.type === 'transfer';
      return `
        <div class="cat-parent">
          <div class="cat-row cat-parent-row">
            <span class="cat-icon" style="background:${p.color}22;color:${p.color}">${p.icon}</span>
            <span class="cat-name">${p.name}</span>
            <span class="badge ${typeCls(p.type)}">${typeLabel(p.type)}</span>
            <span class="cat-sub-count">${kids.length} sottocategorie</span>
            <div class="cat-actions">
              ${!isTransfer ? `
                <button class="btn btn-ghost btn-icon" onclick="addSubCategory(${p.id},'${p.type}')" title="Aggiungi sottocategoria">＋</button>
                <button class="btn btn-ghost btn-icon" onclick="editCategory(${p.id})" title="Modifica">✏️</button>
                <button class="btn btn-ghost btn-icon" onclick="deleteCategory(${p.id})" title="Elimina">🗑️</button>
              ` : '<span class="settings-hint">speciale</span>'}
            </div>
          </div>
          ${kids.length ? `
            <div class="cat-children">
              ${kids.map(k => `
                <div class="cat-row cat-child-row">
                  <span class="cat-indent">└</span>
                  <span class="cat-icon" style="background:${k.color}22;color:${k.color}">${k.icon}</span>
                  <span class="cat-name">${k.name}</span>
                  <span class="cat-inherited">eredita ${typeLabel(k.type)}</span>
                  <div class="cat-actions">
                    <button class="btn btn-ghost btn-icon" onclick="editCategory(${k.id})" title="Modifica">✏️</button>
                    <button class="btn btn-ghost btn-icon" onclick="deleteCategory(${k.id})" title="Elimina">🗑️</button>
                  </div>
                </div>`).join('')}
            </div>` : ''}
        </div>`;
    }).join('');
  }

  pg.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">🏷️ Categorie</h1>
      <div class="page-actions">
        <button class="btn btn-primary" onclick="addMainCategory('expense')">＋ Uscita</button>
        <button class="btn btn-secondary" onclick="addMainCategory('income')">＋ Entrata</button>
      </div>
    </div>

    <div class="cats-section-title">📤 Uscite</div>
    <div class="cats-list" id="catsExpense">
      ${renderTree(parents.filter(p => p.type === 'expense'))}
    </div>

    <div class="cats-section-title" style="margin-top:24px">📥 Entrate</div>
    <div class="cats-list" id="catsIncome">
      ${renderTree(parents.filter(p => p.type === 'income'))}
    </div>

    ${transfer ? `
    <div class="cats-section-title" style="margin-top:24px">🔁 Speciale</div>
    <div class="cats-list">
      <div class="cat-parent">
        <div class="cat-row cat-parent-row">
          <span class="cat-icon" style="background:${transfer.color}22;color:${transfer.color}">${transfer.icon}</span>
          <span class="cat-name">${transfer.name}</span>
          <span class="badge badge-transfer">Trasferimento</span>
          <span class="settings-hint" style="margin-left:8px">Categoria di sistema, non modificabile</span>
        </div>
      </div>
    </div>` : ''}`;
}

function addMainCategory(type) {
  showCategoryModal(null, type, null);
}

function addSubCategory(parentId, parentType) {
  showCategoryModal(null, parentType, parentId);
}

async function editCategory(id) {
  const cats = await api.getCategories();
  const cat = cats.find(c => c.id === id);
  if (cat) showCategoryModal(cat, cat.type, cat.parent_id);
}

async function deleteCategory(id) {
  if (!confirm('Eliminare questa categoria? Le transazioni associate perderanno la categoria.')) return;
  try {
    await api.deleteCategory(id);
    toast('Categoria eliminata');
    renderCategories();
  } catch(e) { toast(e.message, 'error'); }
}

async function showCategoryModal(cat, type, parentId) {
  const allCats  = await api.getCategories();
  const parents  = allCats.filter(c => !c.parent_id && c.type === type && c.type !== 'transfer');
  const isEdit   = !!cat;
  const isChild  = !!parentId || (cat && !!cat.parent_id);
  const pId      = parentId ?? (cat?.parent_id ?? null);

  const parentOpts = parents.map(p =>
    `<option value="${p.id}" ${pId === p.id ? 'selected' : ''}>${p.icon} ${p.name}</option>`
  ).join('');

  openModal(isEdit ? 'Modifica Categoria' : 'Nuova Categoria', `
    <div class="form-grid">
      <div class="form-group" style="grid-column:1/-1">
        <label class="form-label">Tipo</label>
        <div class="badge ${type === 'income' ? 'badge-income' : 'badge-expense'}" style="display:inline-block">
          ${type === 'income' ? '📥 Entrata' : '📤 Uscita'}
          ${isChild ? '(ereditato dal parent)' : ''}
        </div>
      </div>
      <div class="form-group" style="grid-column:1/-1">
        <label class="form-label">Categoria principale (opzionale)</label>
        <select id="c_parent" class="form-input">
          <option value="">— Nessuna (categoria principale) —</option>
          ${parentOpts}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Nome *</label>
        <input id="c_name" class="form-input" value="${cat?.name ?? ''}" placeholder="es. Supermercato">
      </div>
      <div class="form-group">
        <label class="form-label">Icona</label>
        <input id="c_icon" class="form-input" value="${cat?.icon ?? '📁'}" maxlength="4">
      </div>
      <div class="form-group">
        <label class="form-label">Colore</label>
        <input id="c_color" type="color" class="form-input form-color" value="${cat?.color ?? '#58a6ff'}">
      </div>
    </div>
  `, async () => {
    const data = {
      name:      document.getElementById('c_name').value.trim(),
      type,
      icon:      document.getElementById('c_icon').value.trim() || '📁',
      color:     document.getElementById('c_color').value,
      parent_id: document.getElementById('c_parent').value
                   ? parseInt(document.getElementById('c_parent').value) : null,
    };
    if (!data.name) { toast('Inserisci un nome', 'error'); return false; }
    try {
      if (isEdit) { data.id = cat.id; await api.updateCategory(data); toast('Categoria aggiornata'); }
      else        { await api.addCategory(data); toast('Categoria creata'); }
      renderCategories();
    } catch(e) { toast(e.message, 'error'); return false; }
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   TAG
═══════════════════════════════════════════════════════════════════════════ */
async function renderTags() {
  const pg = document.getElementById('pg-tags');
  const tags = await api.getTags();
  pg.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">Tag</h2>
      <button class="btn btn-primary" id="btnAddTag">+ Nuovo tag</button>
    </div>
    <div class="card">
      ${tags.length ? `
        <div class="tags-mgmt-list">
          ${tags.map(t => `
            <div class="tag-mgmt-row">
              <span class="tag-inline" style="--tc:${t.color};font-size:13px;padding:4px 10px">${t.name}</span>
              <span class="text-muted" style="font-size:11px;margin-left:8px">${t.color}</span>
              <div style="margin-left:auto;display:flex;gap:4px">
                <button class="btn btn-ghost btn-icon" onclick="editTagMgmt(${t.id})">✏️</button>
                <button class="btn btn-ghost btn-icon" onclick="deleteTagMgmt(${t.id})">🗑️</button>
              </div>
            </div>`).join('')}
        </div>` :
        `<p class="text-muted" style="text-align:center;padding:30px">Nessun tag. Creane uno cliccando "+ Nuovo tag".</p>`
      }
    </div>`;

  document.getElementById('btnAddTag').onclick = () => showTagModal(null);
}

function showTagModal(tag) {
  const isEdit = !!tag;
  const body = `
    <div class="form-group">
      <label class="form-label">Nome</label>
      <input class="form-control" id="tg_name" value="${tag?.name||''}" placeholder="Es. Vacanza, Lavoro...">
    </div>
    <div class="form-group">
      <label class="form-label">Colore</label>
      <div style="display:flex;align-items:center;gap:10px">
        <input type="color" id="tg_color" value="${tag?.color||'#58a6ff'}" class="color-input-sm" style="width:50px;height:34px">
        <span class="tag-inline" id="tg_preview" style="--tc:${tag?.color||'#58a6ff'}">${tag?.name||'Anteprima'}</span>
      </div>
    </div>`;
  openModal(isEdit ? 'Modifica Tag' : 'Nuovo Tag', body, async () => {
    const name  = document.getElementById('tg_name').value.trim();
    const color = document.getElementById('tg_color').value;
    if (!name) { toast('Inserisci un nome', 'error'); return; }
    try {
      if (isEdit) await api.updateTag({id: tag.id, name, color});
      else        await api.addTag({name, color});
      closeModal();
      toast(isEdit ? 'Tag aggiornato' : 'Tag aggiunto');
      renderTags();
    } catch(e) { toast(e.message, 'error'); }
  });
  // Live preview
  setTimeout(() => {
    const nameEl  = document.getElementById('tg_name');
    const colorEl = document.getElementById('tg_color');
    const prev    = document.getElementById('tg_preview');
    if (!nameEl || !colorEl || !prev) return;
    nameEl.oninput  = () => { prev.textContent = nameEl.value || 'Anteprima'; };
    colorEl.oninput = () => { prev.style.setProperty('--tc', colorEl.value); };
  }, 50);
}

window.editTagMgmt = async id => {
  const tags = await api.getTags();
  showTagModal(tags.find(t => t.id === id));
};

window.deleteTagMgmt = async id => {
  if (!confirm('Eliminare questo tag? Verrà rimosso da tutte le transazioni.')) return;
  try {
    await api.deleteTag(id);
    toast('Tag eliminato');
    renderTags();
  } catch(e) { toast(e.message, 'error'); }
};

/* ═══════════════════════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════════════════════ */
async function init() {
  await updateSidebar();
  await renderDashboard();
}

// Aspetta che il bridge JCEF sia pronto
if (typeof window.cefQuery === 'function') {
  init();
} else {
  // cefQuery viene iniettato da JCEF dopo il caricamento della pagina
  const check = setInterval(() => {
    if (typeof window.cefQuery === 'function') {
      clearInterval(check);
      init();
    }
  }, 50);
}
