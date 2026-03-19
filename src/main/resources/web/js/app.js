/* ═══════════════════════════════════════════════════════════════════════════
   LucaMoneyManager — app.js
   Bridge JS→Java via cefQuery, tutte le pagine SPA
═══════════════════════════════════════════════════════════════════════════ */

/* ─── Emoji picker ────────────────────────────────────────────────────────── */
const EMOJI_LIST = [
  // Cibo & Ristoranti
  {e:'🍕',k:'pizza cibo ristorante'},{e:'🍔',k:'hamburger fast food burger'},
  {e:'🍜',k:'pasta noodle cibo ristorante'},{e:'🍣',k:'sushi pesce ristorante'},
  {e:'🥗',k:'insalata verdura pranzo'},{e:'🥩',k:'carne bistecca grill'},
  {e:'🍱',k:'pranzo box bento cibo'},{e:'🥐',k:'croissant colazione bar'},
  {e:'☕',k:'caffe bar colazione'},{e:'🍺',k:'birra bar locale'},
  {e:'🍷',k:'vino ristorante cena'},{e:'🍸',k:'cocktail aperitivo bar'},
  {e:'🍰',k:'torta dolci pasticceria'},{e:'🍦',k:'gelato dolci'},
  {e:'🍿',k:'popcorn cinema snack'},{e:'🥤',k:'bibita drink takeaway'},
  {e:'🧃',k:'succo bevanda'},{e:'🫖',k:'te infuso bevanda'},
  {e:'🥪',k:'panino sandwich pranzo'},{e:'🍞',k:'pane forno bakery'},
  // Supermercato & Spesa
  {e:'🛒',k:'spesa supermercato alimentari'},{e:'🧺',k:'spesa acquisti'},
  {e:'🥛',k:'latte spesa alimenti'},{e:'🥚',k:'uova spesa alimenti'},
  {e:'🧀',k:'formaggio spesa alimenti'},{e:'🫙',k:'conserve dispensa'},
  // Trasporti
  {e:'🚗',k:'auto macchina trasporto'},{e:'⛽',k:'benzina carburante auto'},
  {e:'🚌',k:'bus autobus trasporto pubblico'},{e:'🚇',k:'metro metropolitana'},
  {e:'🚂',k:'treno ferrovia'},{e:'✈️',k:'aereo volo viaggio'},
  {e:'🚕',k:'taxi uber trasporto'},{e:'🛵',k:'scooter moto'},
  {e:'🚲',k:'bici bicicletta'},{e:'🛳️',k:'nave traghetto'},
  {e:'🅿️',k:'parcheggio sosta'},
  // Casa & Abitazione
  {e:'🏠',k:'casa affitto mutuo abitazione'},{e:'🔧',k:'manutenzione riparazioni'},
  {e:'💡',k:'elettricita luce bolletta'},{e:'💧',k:'acqua bolletta idrico'},
  {e:'🔥',k:'gas riscaldamento bolletta'},{e:'🔌',k:'elettricita energia'},
  {e:'🛋️',k:'arredamento mobili casa'},{e:'🪴',k:'piante giardino'},
  {e:'🧹',k:'pulizie casa domestico'},{e:'🪣',k:'pulizie casa'},
  {e:'🔑',k:'affitto casa chiavi'},{e:'🏗️',k:'ristrutturazione lavori'},
  {e:'📦',k:'trasloco spedizione pacco'},
  // Salute & Benessere
  {e:'💊',k:'medicine farmacia salute'},{e:'🏥',k:'ospedale medico visita'},
  {e:'🩺',k:'medico visita salute'},{e:'🦷',k:'dentista odontoiatra'},
  {e:'👁️',k:'oculista vista occhi'},{e:'💪',k:'palestra fitness sport'},
  {e:'🧘',k:'yoga meditazione benessere'},{e:'💆',k:'massaggio benessere spa'},
  {e:'🧴',k:'cosmetici igiene cura'},{e:'🧼',k:'igiene personale'},
  // Abbigliamento & Shopping
  {e:'👗',k:'vestiti abbigliamento shopping'},{e:'👔',k:'camicia vestiti lavoro'},
  {e:'👟',k:'scarpe sneaker abbigliamento'},{e:'👜',k:'borsa accessori'},
  {e:'💄',k:'trucco cosmetici bellezza'},{e:'🛍️',k:'shopping acquisti'},
  {e:'👒',k:'cappello accessori'},{e:'🧥',k:'giacca cappotto'},
  {e:'👓',k:'occhiali accessori'},{e:'⌚',k:'orologio accessori'},
  // Intrattenimento
  {e:'🎬',k:'cinema film intrattenimento'},{e:'🎵',k:'musica concerto spotify'},
  {e:'🎮',k:'videogiochi gaming intrattenimento'},{e:'📺',k:'tv streaming netflix'},
  {e:'🎭',k:'teatro spettacolo'},{e:'🎨',k:'arte hobby'},
  {e:'📚',k:'libri lettura cultura'},{e:'🎲',k:'giochi hobby'},
  {e:'🎤',k:'karaoke musica concerto'},{e:'🎸',k:'musica strumento hobby'},
  {e:'🎰',k:'gioco azzardo scommesse'},{e:'🎳',k:'bowling svago'},
  // Finanza & Banca
  {e:'💰',k:'soldi risparmio finanza'},{e:'💳',k:'carta credito banca pagamento'},
  {e:'💵',k:'contanti soldi'},{e:'🏦',k:'banca istituto finanziario'},
  {e:'📈',k:'investimenti borsa azioni'},{e:'📉',k:'perdita spese'},
  {e:'💹',k:'investimenti finanza'},{e:'💸',k:'spese uscite soldi'},
  {e:'🤑',k:'guadagno entrate soldi'},{e:'🪙',k:'moneta risparmio'},
  {e:'🏧',k:'bancomat prelievo'},
  // Lavoro & Professione
  {e:'💼',k:'lavoro ufficio professione'},{e:'🖥️',k:'computer lavoro tech'},
  {e:'📱',k:'telefono cellulare abbonamento'},{e:'📊',k:'report lavoro'},
  {e:'📋',k:'documenti burocrazia'},{e:'🖊️',k:'scrittura ufficio'},
  {e:'🏢',k:'ufficio azienda lavoro'},{e:'📞',k:'telefono comunicazione'},
  {e:'💻',k:'laptop lavoro freelance'},{e:'🖨️',k:'stampa ufficio'},
  {e:'✉️',k:'posta spedizione busta'},
  // Famiglia & Persone
  {e:'👶',k:'bambino figlio neonato'},{e:'🧒',k:'figlio bambino scuola'},
  {e:'👨‍👩‍👧‍👦',k:'famiglia'},{e:'❤️',k:'amore regalo donazione'},
  {e:'🎁',k:'regalo dono compleanno'},{e:'🎂',k:'compleanno festa'},
  {e:'🎓',k:'istruzione universita diploma'},{e:'🏫',k:'scuola istruzione'},
  {e:'🧸',k:'giocattoli bambini'},{e:'🍼',k:'bebé neonato'},
  // Viaggi & Vacanze
  {e:'🌍',k:'viaggio estero vacanza'},{e:'🏖️',k:'vacanza mare spiaggia'},
  {e:'⛺',k:'camping vacanza'},{e:'🏔️',k:'montagna escursione'},
  {e:'🗺️',k:'viaggio tour'},{e:'🎒',k:'zaino vacanza'},
  {e:'🏨',k:'hotel albergo soggiorno'},{e:'🗼',k:'turismo viaggio'},
  {e:'🌴',k:'vacanza tropici'},{e:'🎡',k:'parco divertimenti'},
  // Sport & Fitness
  {e:'⚽',k:'calcio sport'},{e:'🏀',k:'basket sport'},
  {e:'🎾',k:'tennis sport'},{e:'🏊',k:'nuoto piscina sport'},
  {e:'🚴',k:'ciclismo bici sport'},{e:'🏋️',k:'palestra pesi fitness'},
  {e:'⛷️',k:'sci montagna sport invernale'},{e:'🧗',k:'arrampicata sport'},
  {e:'🏄',k:'surf mare sport'},{e:'⛳',k:'golf sport'},
  {e:'🎿',k:'sci sport invernale'},{e:'🥊',k:'boxe sport'},
  // Animali
  {e:'🐶',k:'cane animale domestico'},{e:'🐱',k:'gatto animale domestico'},
  {e:'🐟',k:'pesce acquario animale'},{e:'🐰',k:'coniglio animale'},
  {e:'🐾',k:'veterinario animale cura'},
  // Istruzione
  {e:'✏️',k:'matita scuola istruzione'},{e:'📝',k:'appunti studio'},
  {e:'🔬',k:'scienza laboratorio corso'},{e:'🧮',k:'matematica calcolo'},
  // Generici / Varie
  {e:'📁',k:'cartella generale'},{e:'⭐',k:'preferito speciale'},
  {e:'🔔',k:'abbonamento notifica'},{e:'🌱',k:'ambiente ecologia'},
  {e:'♻️',k:'riciclaggio ambiente'},{e:'🌞',k:'energia solare'},
  {e:'🎪',k:'eventi fiera'},{e:'🏛️',k:'comune burocrazia tasse'},
  {e:'⚖️',k:'legale avvocato tasse'},{e:'🧾',k:'ricevuta scontrino tasse'},
  {e:'📮',k:'posta corrispondenza'},{e:'🖼️',k:'arte quadri arredamento'},
  {e:'🕯️',k:'decorazione casa'},{e:'🧰',k:'attrezzi bricolage'},
  {e:'🪟',k:'finestre casa'},{e:'🚿',k:'bagno idraulico'},
  {e:'📷',k:'foto fotografia hobby'},{e:'🎥',k:'video riprese hobby'},
  {e:'🕹️',k:'gaming videogiochi hobby'},{e:'🧩',k:'hobby passatempo'},
  {e:'🌐',k:'internet web abbonamento'},{e:'☁️',k:'cloud storage servizi'},
  {e:'🔐',k:'sicurezza assicurazione'},
];

function _iconPickerBuild(containerId, currentEmoji) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  wrap.innerHTML = `
    <div class="icon-picker-preview" onclick="_iconPickerToggle('${containerId}')">
      <span id="${containerId}_preview" style="font-size:22px">${currentEmoji}</span>
      <span class="icon-picker-hint">Clicca per cambiare</span>
    </div>
    <div id="${containerId}_panel" class="icon-picker-panel" style="display:none">
      <input type="text" class="form-input" style="margin-bottom:6px"
             placeholder="Cerca icona…" oninput="_iconPickerSearch('${containerId}',this.value)">
      <div id="${containerId}_grid" class="icon-grid"></div>
    </div>`;
  _iconPickerSearch(containerId, '');
}

function _iconPickerToggle(cid) {
  const panel = document.getElementById(cid + '_panel');
  const open = panel.style.display === 'none';
  panel.style.display = open ? '' : 'none';
  if (open) panel.querySelector('input').focus();
}

function _iconPickerSearch(cid, q) {
  const ql = q.toLowerCase().trim();
  const list = ql ? EMOJI_LIST.filter(e => e.k.includes(ql)) : EMOJI_LIST;
  document.getElementById(cid + '_grid').innerHTML =
    list.slice(0, 150).map(e =>
      `<button type="button" class="icon-btn" title="${e.k}"
               onclick="_iconPickerSelect('${cid}','${e.e}')">${e.e}</button>`
    ).join('');
}

function _iconPickerSelect(cid, emoji) {
  document.getElementById('c_icon').value = emoji;
  document.getElementById(cid + '_preview').textContent = emoji;
  document.getElementById(cid + '_panel').style.display = 'none';
}

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
      onFailure: (_code, msg) => reject(new Error(msg))
    });
  });
}

const api = {
  // Finestra
  minimize:    ()          => callJava('minimize'),
  maximize:    ()          => callJava('maximize'),
  close:       ()          => callJava('close'),
  getWindowPos:   ()          => callJava('getWindowPos'),
  setWindowPos:   (x,y)       => callJava('setWindowPos', {x,y}),
  getWindowBounds:()          => callJava('getWindowBounds'),
  setWindowBounds:(x,y,w,h)   => callJava('setWindowBounds', {x,y,w,h}),
  isMaximized:    ()          => callJava('isMaximized'),

  // Conti (cache in-session: invalidata ad ogni modifica)
  _accountsCache: null,
  getAccounts:    async function() {
    if (this._accountsCache) return this._accountsCache;
    this._accountsCache = await callJava('getAccounts');
    return this._accountsCache;
  },
  _invalidateAccounts() { this._accountsCache = null; },
  addAccount:         async data  => { api._invalidateAccounts(); return callJava('addAccount',   data); },
  updateAccount:      async data  => { api._invalidateAccounts(); return callJava('updateAccount', data); },
  deleteAccount:      async id    => { api._invalidateAccounts(); return callJava('deleteAccount', {id}); },
  updateAccountOrder: async items => { api._invalidateAccounts(); return callJava('updateAccountOrder', {items}); },

  // Categorie
  getCategories:   ()   => callJava('getCategories'),
  addCategory:     data => callJava('addCategory',    data),
  updateCategory:  data => callJava('updateCategory', data),
  deleteCategory:    id   => callJava('deleteCategory', {id}),
  getCategoryUsage:  id   => callJava('getCategoryUsage', {id}),
  reassignCategory:  data => callJava('reassignCategory', data),

  // Tag
  getTags:    ()   => callJava('getTags'),
  addTag:     data => callJava('addTag',    data),
  updateTag:  data => callJava('updateTag', data),
  deleteTag:  id   => callJava('deleteTag', {id}),

  // Transazioni
  getTransactions:             f    => callJava('getTransactions',             f || {}),
  addTransaction:              data => callJava('addTransaction',              data),
  updateTransaction:           data => callJava('updateTransaction',           data),
  deleteTransaction:           id   => callJava('deleteTransaction',           {id}),
  updateTransactionReconciled: (id, reconciled) => callJava('updateTransactionReconciled', {id, reconciled}),
  getAccountSummary:           account_id => callJava('getAccountSummary',    {account_id}),

  // Budget
  getBudgets:  (month,year) => callJava('getBudgets', {month,year}),
  setBudget:   data         => callJava('setBudget',  data),
  deleteBudget:id           => callJava('deleteBudget',{id}),
  getBudgetYear: y          => callJava('getBudgetYear', {year:y}),
  setBudgetBulk: data       => callJava('setBudgetBulk', data),
  deleteBudgetMonth: data      => callJava('deleteBudgetMonth', data),
  setBudgetConfig: data       => callJava('setBudgetConfig', data),
  generateBudget: data      => callJava('generateBudget', data),
  getBudgetYears: ()        => callJava('getBudgetYears', {}),

  // Portafoglio
  getPortfolio:             ()      => callJava('getPortfolio', {}),
  getPortfolioTransactions: (id)    => callJava('getPortfolioTransactions', {portfolio_id: id}),
  buyStock:                 (data)  => callJava('buyStock', data),
  sellStock:                (data)  => callJava('sellStock', data),
  updateStockPrice:         (id, p) => callJava('updateStockPrice', {id, price: p}),
  importPosition:           (data)  => callJava('importPosition', data),
  registerCoupon:           (data)  => callJava('registerCoupon', data),
  updatePortfolioItem:      (data)  => callJava('updatePortfolioItem', data),
  deletePortfolioItem:      (id)    => callJava('deletePortfolioItem', {id}),

  // Stats
  getDashboardStats:   y          => callJava('getDashboardStats',   {year:y}),
  getMonthlyChartData: y          => callJava('getMonthlyChartData',  {year:y}),
  getCategoryChartData:(y,type)   => callJava('getCategoryChartData', {year:y,type}),

  // Impostazioni
  getSettings:   ()           => callJava('getSettings'),
  setSetting:    (key, value) => callJava('setSetting', {key, value}),
  chooseDbFile:      (mode)   => callJava('chooseDbFile', {mode}),
  reloadDb:          (path)  => callJava('reloadDb', {path}),
  chooseBackupDir:   ()      => callJava('chooseBackupDir', {}),
  openSettingsFile:  ()      => callJava('openSettingsFile', {}),
  resetJcef:         ()      => callJava('resetJcef', {}),
  doBackup:        ()         => callJava('doBackup', {}),

  // Pianificate
  getScheduled:    ()    => callJava('getScheduled'),
  addScheduled:    data  => callJava('addScheduled', data),
  updateScheduled: data  => callJava('updateScheduled', data),
  deleteScheduled: id    => callJava('deleteScheduled', {id}),
  getUpcoming:     (n)   => callJava('getUpcoming',    {limit: n||15}),
  getUpcomingAll:  (n)   => callJava('getUpcomingAll', {limit: n||15}),
  getOverdue:      ()    => callJava('getOverdue'),
  advanceScheduled: (id, date) => callJava('advanceScheduled', {id, date}),
  getProjection:   data  => callJava('getProjection', data),

  // Analytics
  getCategoryMonthTable: (months) => callJava('getCategoryMonthTable', { months }),
  getMonthlyBalance:     (months) => callJava('getMonthlyBalance',     { months }),

  // Resoconti
  getReports:   ()     => callJava('getReports'),
  saveReport:   data   => callJava('saveReport',   data),
  deleteReport: id     => callJava('deleteReport', {id}),

  // Log
  readLog: (lines) => callJava('readLog', {lines: lines || 1000}),
};

/* ─── Chart theme helpers ─────────────────────────────────────────────────── */
const chartColors = () => document.documentElement.dataset.theme === 'light'
  ? { tick: '#636c76', grid: '#e8ecf0' }
  : { tick: '#8b949e', grid: '#21262d' };

/* ─── Account visibility helpers ─────────────────────────────────────────── */
const isAccountVisible = a =>
  _accFavoritesOnly ? (a.is_favorite && !a.is_closed) : true;
const isAccountActive  = a => !a.is_closed;

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
    openModal(title, `<p style="color:var(--txt2);line-height:1.6">${msg}</p>`,
      () => { closeModal(); resolve(true); },
      'Elimina', 'btn-danger');
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
document.addEventListener('mouseup', () => { drag = false; _resizeDir = null; });

/* ─── Resize handles ─────────────────────────────────────────────────────── */
let _resizeDir = null, _resizeStartX = 0, _resizeStartY = 0, _resizeBounds = null;

document.querySelectorAll('.rh').forEach(el => {
  el.addEventListener('mousedown', async e => {
    if (e.button !== 0) return;
    const isMax = await api.isMaximized();
    if (isMax.maximized) return;
    e.preventDefault();
    _resizeDir    = el.dataset.dir;
    _resizeStartX = e.screenX;
    _resizeStartY = e.screenY;
    _resizeBounds = await api.getWindowBounds();
  });
});

document.addEventListener('mousemove', e => {
  if (!_resizeDir || !_resizeBounds) return;
  const dx = e.screenX - _resizeStartX;
  const dy = e.screenY - _resizeStartY;
  let {x, y, w, h} = _resizeBounds;
  if (_resizeDir.includes('e')) w += dx;
  if (_resizeDir.includes('s')) h += dy;
  if (_resizeDir.includes('w')) { x += dx; w -= dx; }
  if (_resizeDir.includes('n')) { y += dy; h -= dy; }
  api.setWindowBounds(x, y, w, h);
});

document.getElementById('btnMin').onclick   = () => api.minimize();
document.getElementById('btnMax').onclick   = async () => {
  await api.maximize();
  const {maximized} = await api.isMaximized();
  document.querySelectorAll('.rh').forEach(el => el.style.display = maximized ? 'none' : '');
};
document.getElementById('btnClose').onclick = () => api.close();

/* ─── Router ──────────────────────────────────────────────────────────────── */
const PAGE_TITLES = {
  dashboard:'Dashboard', transactions:'Transazioni', accounts:'Conti',
  budgets:'Budget', portfolio:'Portafoglio', analytics:'Reports', reports:'Filtri', settings:'Impostazioni',
  scheduled:'Transazioni Pianificate'
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
  el.addEventListener('click', () => {
    if (el.dataset.page === 'transactions') txFilters = { range: txFilters.range || '30d' };
    if (el.dataset.page === 'budgets') _budgetTab = 'grid';
    navigate(el.dataset.page);
  });
});

function renderPage(page) {
  switch(page) {
    case 'dashboard':    renderDashboard();    break;
    case 'transactions': renderTransactions(); break;
    case 'accounts':     renderAccounts();     break;
    case 'budgets':      renderBudgets();      break;
    case 'portfolio':    renderPortfolio();    break;
    case 'analytics':    renderAnalytics();    break;
    case 'reports':      renderReports();      break;
    case 'categories':   renderCategories();   break;
    case 'tags':         renderTags();         break;
    case 'settings':     renderSettings();     break;
    case 'scheduled':    renderScheduled();    break;
    case 'logviewer':    renderLogViewer();    break;
  }
}

/* ─── Modal ───────────────────────────────────────────────────────────────── */
let modalConfirmCallback = null;

function openModal(title, bodyHtml, onConfirm, confirmLabel='Salva', confirmClass='btn-primary', modalClass='') {
  document.getElementById('modalTitle').textContent   = title;
  document.getElementById('modalBody').innerHTML      = bodyHtml;
  document.getElementById('modalConfirm').textContent = confirmLabel;
  document.getElementById('modalConfirm').className   = `btn ${confirmClass}`;
  modalConfirmCallback = onConfirm;
  const hasActions = onConfirm !== null;
  document.getElementById('modalCancel').style.display  = hasActions ? '' : 'none';
  document.getElementById('modalConfirm').style.display = hasActions ? '' : 'none';
  const modalEl = document.getElementById('modal');
  modalEl.className = modalClass ? `modal ${modalClass}` : 'modal';
  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  modalConfirmCallback = null;
  const modal = document.getElementById('modal');
  if (modal) { modal.style.width = ''; modal.className = 'modal'; }
  if (window._budgetDetailChart) { window._budgetDetailChart.destroy(); window._budgetDetailChart = null; }
}

document.getElementById('modalClose').onclick  = closeModal;
document.getElementById('modalCancel').onclick = closeModal;
document.getElementById('modalConfirm').onclick = () => { if (modalConfirmCallback) modalConfirmCallback(); };

/* ─── Sidebar accounts ───────────────────────────────────────────────────── */
async function updateSidebar() {
  const accounts = await api.getAccounts();
  const el = document.getElementById('sidebarAccounts');
  el.innerHTML = accounts.filter(isAccountVisible).map(a => `
    <div class="sidebar-account-item" style="${a.is_closed ? 'opacity:.55' : ''}cursor:pointer" onclick="navigateToAccountTx(${a.id})">
      <span>${a.icon}</span><span>${a.name}</span>
    </div>`).join('');
  if (_reportsGroupOpen) renderSidebarReports();
}

function toggleReportsGroup(e) {
  if (e) e.stopPropagation();
  _reportsGroupOpen = !_reportsGroupOpen;
  const sub   = document.getElementById('navReportsSub');
  const arrow = document.getElementById('navReportsArrow');
  if (sub)   sub.style.display  = _reportsGroupOpen ? '' : 'none';
  if (arrow) arrow.classList.toggle('open', _reportsGroupOpen);
  if (_reportsGroupOpen) renderSidebarReports();
}

async function renderSidebarReports() {
  const el = document.getElementById('sidebarReportsList');
  if (!el) return;
  const reports = await api.getReports();
  el.innerHTML = reports.map(r => `
    <div style="display:flex;align-items:center">
      <a class="nav-sub-item${_currentReportId === r.id ? ' active' : ''}" style="flex:1;min-width:0"
         onclick="openSavedReport(${r.id})" title="${r.name}">
        <span style="font-size:11px">📋</span>
        <span class="nav-sub-label">${r.name}</span>
      </a>
      <button class="btn btn-ghost btn-icon" style="padding:2px 5px;font-size:10px;flex-shrink:0;opacity:.6"
              onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=.6"
              onclick="showReportModal(${r.id})" title="Modifica">✏️</button>
      <button class="btn btn-ghost btn-icon" style="padding:2px 5px;font-size:10px;flex-shrink:0;opacity:.4"
              onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=.4"
              onclick="deleteReportConfirm(${r.id},'${r.name.replace(/'/g,"\\'")}')">✕</button>
    </div>`).join('');
}

async function openSavedReport(id) {
  _currentReportId = id;
  if (currentPage !== 'reports') {
    navigate('reports'); // renderReports() will load and run the report
    return;
  }
  const reports = await api.getReports();
  const r = reports.find(x => x.id === id);
  if (!r) return;
  _loadReportConfig(r);
  _updateReportHeader(r);
  renderSidebarReports();
}

/* ═══════════════════════════════════════════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════════════════════════════════════════ */

let   _accTypeOrder         = ['checking','savings','cash','credit','investment'];
const _DASH_ACC_TYPE_LABELS = {checking:'Conti Correnti',savings:'Risparmio',cash:'Contanti',credit:'Carte di Credito',investment:'Investimenti'};

function _renderDashAccountsWidget(accounts) {
  const el = document.getElementById('dashAccounts');
  if (!el) return;
  const visibleAccounts = accounts.filter(isAccountVisible);
  const investBalance = visibleAccounts.filter(a => a.type === 'investment').reduce((s,a) => s + (a.balance||0), 0);
  const contiBalance  = visibleAccounts.filter(a => a.type !== 'investment').reduce((s,a) => s + (a.balance||0), 0);
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
          <tr class="acc-group-row"><td colspan="3">${_DASH_ACC_TYPE_LABELS[t] || t}</td></tr>
          ${visGrouped[t].map(a => `
            <tr class="acc-list-row" onclick="navigateToAccountTx(${a.id})">
              <td>
                <span class="acc-dot" style="background:${a.color||'var(--accent)'}"></span>
                <span class="acc-icon">${a.icon||''}</span>
                <span class="acc-name">${a.name}</span>
              </td>
              <td class="acc-bal ${a.balance<0?'neg':''}" style="color:${a.balance<0?'var(--expense)':(a.color||'var(--accent)')}">
                ${fmt.currency(a.balance)}
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
          <td>Conti</td>
          <td class="acc-bal ${contiBalance<0?'neg':''}" style="color:${contiBalance<0?'var(--expense)':'var(--income)'}">
            ${fmt.currency(contiBalance)}
          </td>
          <td></td>
        </tr>
        ${investBalance !== 0 ? `
        <tr class="acc-total-row">
          <td style="color:var(--txt2)">Investimenti</td>
          <td class="acc-bal" style="color:var(--accent2)">${fmt.currency(investBalance)}</td>
          <td></td>
        </tr>` : ''}
      </tbody>
    </table>`;
}

window._dashQuickTx = async (accountId, type) => {
  const [cats, accs, tags] = await Promise.all([api.getCategories(), api.getAccounts(), api.getTags()]);
  showTxModal({account_id: accountId, type}, cats, accs, type, tags, async () => {
    api._invalidateAccounts();
    _renderDashAccountsWidget(await api.getAccounts());
  });
};

async function renderDashboard() {
  const dashYear = new Date().getFullYear();
  const pg = document.getElementById('pg-dashboard');
  pg.innerHTML = `
    <div class="stats-grid" id="statsGrid"></div>
    <div class="dash-top-row" style="margin-bottom:24px">
      <div class="card dash-accounts-card">
        <div class="card-header"><span class="card-title">I miei conti</span>
          <button class="btn btn-ghost" onclick="navigate('accounts')">Gestisci →</button>
        </div>
        <div id="dashAccounts"></div>
      </div>
      <div class="card dash-barchart-card">
        <div class="card-header"><span class="card-title">Entrate vs Uscite ${dashYear}</span></div>
        <div class="dash-chart-wrap"><canvas id="barChart"></canvas></div>
      </div>
      <div class="card dash-budgetchart-card" style="cursor:pointer" onclick="_budgetTab='andamento';navigate('budgets')">
        <div class="card-header"><span class="card-title">Budget vs Reale ${dashYear}</span></div>
        <div class="dash-chart-wrap"><canvas id="budgetChart"></canvas></div>
      </div>
    </div>
    <div class="dash-tables-row" style="margin-bottom:16px">
      <div class="card dash-recent-card">
        <div class="card-header">
          <span class="card-title">Ultime transazioni</span>
          <button class="btn btn-ghost" onclick="navigate('transactions')">Vedi tutte →</button>
        </div>
        <div class="table-wrap"><table><thead><tr>
          <th>Data</th><th>Descrizione</th><th>Categoria</th><th>Conto</th><th class="text-right">Importo</th>
        </tr></thead><tbody id="recentRows"></tbody></table></div>
      </div>
      <div class="card dash-upcoming-card">
        <div class="card-header">
          <span class="card-title">🗓️ Prossime pianificate</span>
          <button class="btn btn-ghost" onclick="navigate('scheduled')">Gestisci →</button>
        </div>
        <div class="table-wrap"><table><thead><tr>
          <th>Categoria</th><th>Descrizione</th><th>Giorni</th><th class="text-right">Importo</th>
        </tr></thead><tbody id="upcomingRows"></tbody></table></div>
      </div>
    </div>
    <div class="dash-bottom-charts">
      <div class="card dash-chart-sm">
        <div class="card-header"><span class="card-title">Spese per categoria</span></div>
        <canvas id="pieChart"></canvas>
      </div>
      <div class="card dash-chart-sm">
        <div class="card-header"><span class="card-title">Risparmio mensile</span></div>
        <canvas id="savingsChart"></canvas>
      </div>
      <div class="card dash-chart-sm">
        <div class="card-header"><span class="card-title">Top categorie spesa</span></div>
        <canvas id="topCatChart"></canvas>
      </div>
    </div>`;

  const [stats, accounts, recent, monthly, catData, upcoming, budgetYear] = await Promise.all([
    api.getDashboardStats(dashYear),
    api.getAccounts(),
    api.getTransactions({year:dashYear, limit:10}),
    api.getMonthlyChartData(dashYear),
    api.getCategoryChartData(dashYear, 'expense'),
    api.getUpcomingAll(10),
    api.getBudgetYear(dashYear)
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

  _renderDashAccountsWidget(accounts);

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
    const _getEff = catId => {
      const cfg = _cfgMap[catId], stored = _bMap[catId] || {};
      if (!cfg || !cfg.master_amount) return stored;
      const locked = cfg.mode === 'annuale' ? cfg.master_amount : cfg.master_amount * 12;
      const pinned = Object.keys(stored).map(Number);
      const pinnedSum = pinned.reduce((s, m) => s + (stored[m] || 0), 0);
      const free = 12 - pinned.length;
      const freeVal = free > 0 ? Math.round((locked - pinnedSum) / free * 100) / 100 : 0;
      const res = {...stored};
      for (let m = 1; m <= 12; m++) { if (res[m] === undefined) res[m] = Math.max(0, freeVal); }
      return res;
    };

    // Tutte le categorie foglia (income e expense) — stesso approccio della riga sommario pagina budget
    const parentIds = new Set(budgetYear.categories.filter(c => c.parent_id).map(c => c.parent_id));
    const leafCats = budgetYear.categories.filter(c => !parentIds.has(c.id));

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
      charts.budget = new Chart(budgetCtx, {
        type: 'line',
        data: {
          labels: bLabels,
          datasets: [{
            label: 'Differenza',
            data: bDiff,
            fill: { target: 'origin', above: 'rgba(63,185,80,0.25)', below: 'rgba(248,81,73,0.25)' },
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
            }
          },
          scales: {
            x: { ticks: { color: chartColors().tick }, grid: { color: chartColors().grid } },
            y: { ticks: { color: chartColors().tick, callback: v => fmt.currency(v) }, grid: { color: chartColors().grid } }
          }
        }
      });
    } else if (budgetCtx && !bLabels.length) {
      budgetCtx.parentElement.innerHTML += '<p class="text-muted" style="text-align:center;padding:20px">Nessun dato budget disponibile</p>';
    }
  }

  // Pie chart — top 10 + "Altro"
  if (charts.pie) charts.pie.destroy();
  if (catData.length) {
    const sorted = [...catData].sort((a,b) => b.total - a.total);
    const top    = sorted.slice(0, 10);
    const rest   = sorted.slice(10);
    if (rest.length) {
      const altroTotal = rest.reduce((s,c) => s + c.total, 0);
      top.push({ name:'Altro', icon:'…', total: altroTotal, color:'#666' });
    }
    charts.pie = new Chart(document.getElementById('pieChart'), {
      type:'doughnut',
      data:{ labels: top.map(c => c.icon+' '+c.name),
             datasets:[{ data: top.map(c=>c.total), backgroundColor: top.map(c=>c.color), borderWidth:0 }]},
      options:{
        responsive:true,
        plugins:{
          legend:{ position:'right', labels:{ color:chartColors().tick, font:{size:11}, boxWidth:12, padding:6 }},
          tooltip:{ callbacks:{ label: ctx => {
            const tot = ctx.dataset.data.reduce((a,b)=>a+b,0);
            const pct = tot ? (ctx.parsed/tot*100).toFixed(1) : 0;
            return ` ${fmt.currency(ctx.parsed)} (${pct}%)`;
          }}}
        }
      }
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

  // Upcoming scheduled
  const dashTodayStr = new Date().toLocaleDateString('en-CA');
  const dashToday = new Date(dashTodayStr + 'T00:00:00');
  document.getElementById('upcomingRows').innerHTML = upcoming.length ? upcoming.map(u => {
    const nextStr = u.date || u.start_date;
    const days = nextStr ? Math.round((new Date(nextStr + 'T00:00:00') - dashToday) / 86400000) : null;
    const daysHtml = days === null ? '—'
      : days < 0  ? `<span class="sched-days-badge overdue">⚠️ ${Math.abs(days)}g fa</span>`
      : days === 0 ? `<span class="sched-days-badge today">Oggi</span>`
      : `<span class="sched-days-badge upcoming">${days}g</span>`;
    return `
    <tr class="${u.overdue ? 'upcoming-overdue' : ''}">
      <td><span class="cat-chip">${u.category_icon||''}${u.parent_category_name?u.parent_category_name+':'+u.category_name:u.category_name||'-'}</span></td>
      <td class="td-main">${u.description||'-'}</td>
      <td>${daysHtml}</td>
      <td class="text-right amount-${u.type}">${u.type==='expense'?'-':''}${fmt.currency(u.amount)}</td>
    </tr>`;
  }).join('') :
    '<tr><td colspan="4" class="text-muted" style="text-align:center;padding:20px">Nessuna transazione pianificata</td></tr>';

  // Savings chart (monthly net = income - expenses)
  const savArr = incArr.map((v,i) => v - expArr[i]);
  if (charts.savings) charts.savings.destroy();
  charts.savings = new Chart(document.getElementById('savingsChart'), {
    type: 'bar',
    data: { labels: months, datasets: [{
      label: 'Risparmio',
      data: savArr,
      backgroundColor: savArr.map(v => v >= 0 ? 'rgba(63,185,80,.75)' : 'rgba(248,81,73,.75)'),
      borderRadius: 4
    }]},
    options: { responsive:true, plugins:{legend:{display:false}},
      scales:{ x:{ticks:{color:chartColors().tick,font:{size:10}},grid:{color:chartColors().grid}},
               y:{ticks:{color:chartColors().tick,font:{size:10}},grid:{color:chartColors().grid}}}}
  });

  // Top categories chart (horizontal bar)
  const top5 = [...catData].sort((a,b)=>b.total-a.total).slice(0,6);
  if (charts.topCat) charts.topCat.destroy();
  if (top5.length) {
    charts.topCat = new Chart(document.getElementById('topCatChart'), {
      type: 'bar',
      data: { labels: top5.map(c => c.icon+' '+c.name),
              datasets: [{label:'Spesa', data: top5.map(c=>c.total),
                backgroundColor: top5.map(c=>c.color||'rgba(88,166,255,.7)'), borderRadius:4}]},
      options: { indexAxis:'y', responsive:true, plugins:{legend:{display:false}},
        scales:{ x:{ticks:{color:chartColors().tick,font:{size:10}},grid:{color:chartColors().grid}},
                 y:{ticks:{color:chartColors().tick,font:{size:10}},grid:{color:chartColors().grid}}}}
    });
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   TRANSAZIONI
═══════════════════════════════════════════════════════════════════════════ */
let txFilters = { range: '30d' };

// ─── Resoconti state ──────────────────────────────────────────────────────
let _reportsGroupOpen = false;
let _currentReportId  = null;
let _reportFilters    = {};
let _reportGroupby    = 'none';
let _reportChartType  = 'none';
let _reportChart      = null;

function rangeToFilter(range, from, to) {
  const today = new Date();
  const fmt = d => d.toISOString().slice(0,10);
  const sub = days => { const d = new Date(today); d.setDate(d.getDate()-days); return d; };
  switch (range) {
    case '7d':        return { date_from: fmt(sub(6)),  date_to: fmt(today) };
    case '14d':       return { date_from: fmt(sub(13)), date_to: fmt(today) };
    case '30d':       return { date_from: fmt(sub(29)), date_to: fmt(today) };
    case '3m':        { const d=new Date(today); d.setMonth(d.getMonth()-3);
                        return { date_from: fmt(d), date_to: fmt(today) }; }
    case '6m':        { const d=new Date(today); d.setMonth(d.getMonth()-6);
                        return { date_from: fmt(d), date_to: fmt(today) }; }
    case 'ytd':       return { date_from: `${today.getFullYear()}-01-01`, date_to: fmt(today) };
    case 'last_year': { const y=today.getFullYear()-1;
                        return { date_from: `${y}-01-01`, date_to: `${y}-12-31` }; }
    case 'all':       return {};
    case 'custom':    return { date_from: from||'', date_to: to||'' };
    default:          return { date_from: fmt(sub(29)), date_to: fmt(today) };
  }
}
let txSort       = { col: 'date', dir: 'asc' };
let txCache      = [];
let _selectedTxId = null;

function navigateToAccountTx(accountId) {
  txFilters = { range: txFilters.range || '30d', account_id: String(accountId) };
  if (currentPage === 'transactions') renderTransactions();
  else navigate('transactions');
}

async function renderTransactions() {
  _selectedTxId = null;
  const pg = document.getElementById('pg-transactions');
  const [categories, accounts, tags] = await Promise.all([api.getCategories(), api.getAccounts(), api.getTags()]);

  pg.innerHTML = `
    <div style="flex-shrink:0;padding:16px 16px 0;background:var(--bg)">
      <div class="section-header">
        <h2 class="section-title">Transazioni</h2>
        <div id="txHeaderSummary" class="tx-header-summary"></div>
      </div>
      <div class="filter-bar" style="margin-bottom:12px">
        <select class="form-control" id="txRange">
          ${[
            {v:'7d',        l:'Ultimi 7 giorni'},
            {v:'14d',       l:'Ultime 2 settimane'},
            {v:'30d',       l:'Ultimi 30 giorni'},
            {v:'3m',        l:'Ultimi 3 mesi'},
            {v:'6m',        l:'Ultimi 6 mesi'},
            {v:'ytd',       l:'Da inizio anno'},
            {v:'last_year', l:'Anno scorso'},
            {v:'all',       l:'Tutto'},
            {v:'custom',    l:'Personalizza…'},
          ].map(o=>`<option value="${o.v}" ${(txFilters.range||'30d')===o.v?'selected':''}>${o.l}</option>`).join('')}
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
        <input class="form-control" id="txSearch" value="${txFilters.search||''}" placeholder="🔍 Cerca..." style="min-width:160px">
      </div>
    </div>
    <div id="txScrollWrap" style="flex:1;overflow:auto;padding:0 16px 16px">
      <div class="card">
        <table id="txTable"><thead><tr>
            <th class="th-sort th-sort-active" data-col="date"        onclick="_txSortBy('date')">Data<span class="sort-ind">▲</span></th>
            <th class="th-reconciled" id="thReconciled" title="Stato conciliazione">Stato</th>
            <th class="th-sort" data-col="account"     onclick="_txSortBy('account')">Conto<span class="sort-ind"></span></th>
            <th class="th-sort" data-col="type"        onclick="_txSortBy('type')">Tipo<span class="sort-ind"></span></th>
            <th class="th-tags">Tag</th>
            <th class="th-sort" data-col="category"    onclick="_txSortBy('category')">Categoria<span class="sort-ind"></span></th>
            <th class="th-sort" data-col="description" onclick="_txSortBy('description')">Descrizione<span class="sort-ind"></span></th>
            <th class="th-sort text-right" data-col="amount" onclick="_txSortBy('amount')">Importo<span class="sort-ind"></span></th>
            <th class="text-right th-balance" id="thBalance" style="display:none">Saldo</th>
            <th></th>
          </tr></thead><tbody id="txBody"></tbody></table>
        <div class="tx-add-group">
          <button class="btn btn-add-income"   id="btnAddIncome">📥 Entrata</button>
          <button class="btn btn-add-expense"  id="btnAddExpense">📤 Uscita</button>
          <button class="btn btn-add-transfer" id="btnAddTransfer">🔁 Trasferimento</button>
        </div>
      </div>
    </div>`;

  const applyFilters = () => {
    const range = document.getElementById('txRange').value;
    const from  = document.getElementById('txFrom').value;
    const to    = document.getElementById('txTo').value;
    txFilters = {
      range,
      ...rangeToFilter(range, from, to),
      type:       document.getElementById('txType').value,
      account_id: document.getElementById('txAccount').value || undefined,
      search:     document.getElementById('txSearch').value,
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
  ['txType','txAccount'].forEach(id =>
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

  // Ensure date range is resolved into date_from/date_to before loading rows
  txFilters = { ...txFilters, ...rangeToFilter(txFilters.range || '30d', txFilters.date_from, txFilters.date_to) };
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

function _renderTxHeaderSummary(summary, accounts) {
  const el = document.getElementById('txHeaderSummary');
  if (!el) return;
  if (!summary) { el.innerHTML = ''; return; }
  const acc = accounts.find(a => String(a.id) === String(txFilters.account_id));
  el.innerHTML = `
    <span class="txhs-item txhs-account">${acc ? acc.icon + ' ' + acc.name : ''}</span>
    <span class="txhs-sep">·</span>
    <span class="txhs-item"><span class="txhs-label">Saldo</span>
      <span class="txhs-val ${summary.balance >= 0 ? 'positive' : 'negative'}" id="txhsBal">${fmt.currency(summary.balance)}</span>
    </span>
    <span class="txhs-sep">·</span>
    <span class="txhs-item"><span class="txhs-label">Conciliato</span>
      <span class="txhs-val ${summary.reconciled_balance >= 0 ? 'positive' : 'negative'}" id="txhsRec">${fmt.currency(summary.reconciled_balance)}</span>
    </span>`;
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
  // Aggiorna riepilogo nell'header
  _renderTxHeaderSummary(summary, accounts);
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
  const showBalance = txFilters.account_id && String(txFilters.account_id).trim() !== '';
  const sorted = sortTxs(txCache);
  const colCount = showBalance ? 10 : 9;
  tbody.innerHTML = sorted.length ? sorted.map(t => {
    const isRec = t.reconciled == 1;
    const isSel = t.id === _selectedTxId;
    const balCell = showBalance && t.balance != null
      ? `<td class="text-right tx-balance ${t.balance >= 0 ? 'positive' : 'negative'}">${fmt.currency(t.balance)}</td>`
      : (showBalance ? '<td></td>' : '');
    const bgStyle = t.color ? `style="background:${t.color}40"` : '';
    return `
    <tr data-tx-id="${t.id}" class="${t.color ? 'tx-colored' : ''}${isSel ? ' tx-selected' : ''}${!isRec ? ' tx-unreconciled' : ''}" ${bgStyle}>
      <td>${fmt.date(t.date)}</td>
      <td class="td-reconciled">
        <button class="btn-reconcile ${isRec ? 'reconciled' : 'unreconciled'}" title="${isRec ? 'Conciliata [R] – clicca per annullare' : 'Da verificare [V] – clicca per conciliare'}" onclick="toggleReconciled(${t.id}, ${isRec ? 0 : 1})">
          ${isRec ? '✅' : '🔲'}
        </button>
      </td>
      <td>${t.account_name||'-'}${t.to_account_name?` → ${t.to_account_name}`:''}</td>
      <td><span class="badge badge-${t.type}">${t.type==='income'?'Entrata':t.type==='expense'?'Uscita':'Trasferimento'}</span></td>
      <td class="td-tags">${(t.tags&&t.tags.length)?t.tags.map(tg=>`<span class="tag-inline" style="--tc:${tg.color}">${tg.name}</span>`).join(''):''}</td>
      <td>${t.category_icon||''} ${t.parent_category_name ? t.parent_category_name + ' : ' + t.category_name : (t.category_name||'-')}</td>
      <td class="td-main">${t.description||''}</td>
      <td class="text-right amount-${t.type}">${t.type==='expense'?'-':''}${fmt.currency(t.amount)}</td>
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
    const balEl = document.getElementById('txhsBal');
    const recEl = document.getElementById('txhsRec');
    if (balEl) { balEl.textContent = fmt.currency(summary.balance); balEl.className = `txhs-val ${summary.balance >= 0 ? 'positive' : 'negative'}`; }
    if (recEl) { recEl.textContent = fmt.currency(summary.reconciled_balance); recEl.className = `txhs-val ${summary.reconciled_balance >= 0 ? 'positive' : 'negative'}`; }
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
    if (!filtered.length) {
      list.innerHTML = '<div class="cat-picker-empty">Nessuna categoria trovata</div>';
    } else {
      list.innerHTML = filtered.map(it =>
        `<div class="cat-picker-item" data-id="${it.id}">${it.label}</div>`).join('');
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
    renderList(q ? items.filter(i => i.label.toLowerCase().includes(q)) : items);
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
  const parentIds = new Set(cats.filter(c => c.parent_id).map(c => c.parent_id));
  // foglie = sottocategorie (parent_id!=null) OPPURE macrocategorie senza figli
  const leafs = cats.filter(c => c.parent_id || !parentIds.has(c.id));
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
        <div class="cat-picker">
          <input type="text" class="form-control" id="f_cat_input" placeholder="— Seleziona categoria —" autocomplete="off">
          <input type="hidden" id="f_cat" value="">
          <div class="cat-picker-list" id="catPickerList"></div>
        </div>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Conto</label>
        <select class="form-control" id="f_account">
          ${accounts.filter(a => isAccountActive(a) && a.type !== 'investment').map(a=>`<option value="${a.id}" ${(tx ? tx.account_id==a.id : String(a.id)===String(txFilters.account_id))?'selected':''}>${a.icon} ${a.name}</option>`).join('')}
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
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Colore riga <span class="settings-hint">(opzionale)</span></label>
        <div style="display:flex;align-items:center;gap:8px">
          <input type="color" id="f_color" class="form-color-tx" value="${tx?.color||'#ffffff'}">
          <label class="settings-hint" style="display:flex;align-items:center;gap:6px;cursor:pointer">
            <input type="checkbox" id="f_color_use" ${tx?.color?'checked':''} style="margin:0">
            Usa colore
          </label>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Stato</label>
        <div style="display:flex;align-items:center;gap:10px;padding-top:6px">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
            <input type="radio" name="f_reconciled" id="f_rec_pending"  value="0" ${tx?.reconciled==0?'checked':''}>
            <span>🔲 Da verificare</span>
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
            <input type="radio" name="f_reconciled" id="f_rec_done"     value="1" ${tx==null||tx.reconciled==1?'checked':''}>
            <span>✅ Conciliata</span>
          </label>
        </div>
      </div>
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

  // Popola il picker categoria in base al tipo selezionato
  function updateCatSelect(keepSelected) {
    const type  = document.getElementById('f_type')?.value;
    const input = document.getElementById('f_cat_input');
    if (!input?._catPickerSetItems) return;
    if (type === 'transfer') { input._catPickerSetItems([], null); return; }
    const cats = type === 'expense' ? expCats : incCats;
    const parentIds = new Set(cats.filter(c => c.parent_id).map(c => c.parent_id));
    const items = cats.filter(c => c.parent_id || !parentIds.has(c.id)).map(c => ({
      id: c.id,
      label: c.parent_id ? `${c.parent_name} › ${c.icon} ${c.name}` : `${c.icon} ${c.name}`
    }));
    input._catPickerSetItems(items, keepSelected);
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
      color: document.getElementById('f_color_use')?.checked
               ? document.getElementById('f_color').value : null,
      reconciled: parseInt(document.querySelector('input[name="f_reconciled"]:checked')?.value ?? '1'),
    };
    if (!data.amount || !data.account_id) {
      toast('Compila i campi obbligatori', 'error'); return;
    }
    try {
      if (isEdit) await api.updateTransaction(data);
      else        await api.addTransaction(data);
      if (onAfterSave) await onAfterSave();
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

  // Focus immediato sull'importo
  setTimeout(() => document.getElementById('f_amount')?.focus(), 50);

  // Enter su importo → salva
  document.getElementById('f_amount')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); document.getElementById('modalConfirm')?.click(); }
  });

  initCatPicker('f_cat_input', 'f_cat', 'catPickerList');
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
  const tx = txCache.find(t => t.id === txId);
  const isRec = tx?.reconciled == 1;
  const m = document.getElementById('ctxMenu');
  m.innerHTML = `
    <div class="ctx-item" onclick="_ctxDo('dup')">📋 Duplica transazione</div>
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
  if (action === 'edit')        window.editTx(id);
  if (action === 'del')         window.deleteTx(id);
  if (action === 'reconcile')   toggleReconciled(id, 1);
  if (action === 'unreconcile') toggleReconciled(id, 0);
};

window.duplicateTx = async id => {
  const [txs, cats, accs, tgs] = await Promise.all([
    api.getTransactions({limit:10000}), api.getCategories(), api.getAccounts(), api.getTags()
  ]);
  const tx = txs.find(t => t.id === id);
  if (tx) showTxModal({...tx, id: undefined}, cats, accs, tx.type, tgs);
};

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
  if (e.key === 'Escape') { _hideCtxMenu(); return; }
  // Attive solo se: pagina transazioni visibile, nessun modal aperto, nessun input focalizzato
  const txPage = document.getElementById('pg-transactions');
  if (!txPage || !txPage.classList.contains('active')) return;
  if (document.getElementById('modalOverlay')?.classList.contains('open')) return;
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if (!_selectedTxId) return;
  if (e.key === 'r' || e.key === 'R') {
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

function _accountCardHtml(a) {
  const badges = [a.is_favorite ? '⭐' : '', a.is_closed ? '🔒' : ''].filter(Boolean).join(' ');
  return `<div class="account-card${a.is_closed ? ' account-card-closed' : ''}" data-id="${a.id}" data-type="${a.type}" draggable="true" style="--acc-color:${a.color}">
    <span class="acc-drag-handle" title="Trascina per riordinare">⠿</span>
    <div class="account-icon">${a.icon}</div>
    <div class="acc-info">
      <div class="account-name">${a.name}${badges ? ` <span style="font-size:11px;font-weight:400">${badges}</span>` : ''}</div>
    </div>
    <div class="account-balance" style="color:${a.is_closed ? 'var(--txt3)' : a.color}">${fmt.currency(a.balance)}</div>
    <div class="account-actions">
      ${a.type === 'credit' ? `<button class="btn btn-ghost btn-icon" onclick="closeCreditMonth(${a.id},\`${a.name.replace(/`/g,"'")}\`)">💳 Chiudi mese</button>` : ''}
      <button class="btn btn-ghost btn-icon" onclick="editAccount(${a.id})">✏️</button>
      <button class="btn btn-ghost btn-icon" onclick="deleteAccount(${a.id})">🗑️</button>
    </div>
  </div>`;
}

async function loadAccountCards() {
  const grid = document.getElementById('accountsGrid');
  if (!grid) return;
  const accounts = await api.getAccounts();
  if (!accounts.length) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">🏦</div><p>Nessun conto. Creane uno!</p></div>';
    return;
  }

  const orderedTypes = [...new Set([..._accTypeOrder.filter(t => accounts.some(a => a.type === t)),
    ...accounts.map(a => a.type).filter(t => !_accTypeOrder.includes(t))])];
  grid.innerHTML = orderedTypes.map(t => `
    <div class="accounts-section" data-sec-type="${t}">
      <div class="accounts-section-label">
        <span class="sec-drag-handle" title="Trascina per riordinare">⠿</span>
        ${accTypeLabel(t)}
      </div>
      <div class="accounts-section-grid" data-type="${t}">
        ${accounts.filter(a => a.type === t).map(_accountCardHtml).join('')}
      </div>
    </div>`).join('');

  // Drag & drop
  let dragId = null;
  grid.querySelectorAll('.account-card[draggable]').forEach(card => {
    card.addEventListener('dragstart', e => {
      dragId = Number(card.dataset.id);
      setTimeout(() => card.classList.add('dragging'), 0);
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      grid.querySelectorAll('.account-card').forEach(c => c.classList.remove('drag-over'));
    });
    card.addEventListener('dragover', e => {
      if (!dragId) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      grid.querySelectorAll('.account-card').forEach(c => c.classList.remove('drag-over'));
      if (Number(card.dataset.id) !== dragId) card.classList.add('drag-over');
    });
    card.addEventListener('drop', e => {
      e.preventDefault();
      const targetId = Number(card.dataset.id);
      if (!dragId || dragId === targetId) return;
      const dragCard = grid.querySelector(`.account-card[data-id="${dragId}"]`);
      if (!dragCard || dragCard.dataset.type !== card.dataset.type) {
        toast('Riordinamento possibile solo tra conti dello stesso tipo', 'error'); return;
      }
      const container = card.parentElement;
      const cards = [...container.querySelectorAll('.account-card')];
      const fromIdx = cards.findIndex(c => Number(c.dataset.id) === dragId);
      const toIdx   = cards.findIndex(c => Number(c.dataset.id) === targetId);
      container.insertBefore(dragCard, fromIdx < toIdx ? card.nextSibling : card);

      // Ricalcola sort_order globale su tutti i gruppi visibili
      const items = [];
      let order = 0;
      grid.querySelectorAll('.accounts-section-grid').forEach(sec => {
        sec.querySelectorAll('.account-card').forEach(c => {
          items.push({ id: Number(c.dataset.id), sort_order: order++ });
        });
      });
      api.updateAccountOrder(items).catch(err => toast(err.message, 'error'));
    });
  });

  // ── Drag sezioni ────────────────────────────────────────────────────────────
  let dragSecType = null;
  grid.querySelectorAll('.accounts-section').forEach(sec => {
    const handle = sec.querySelector('.sec-drag-handle');
    handle.addEventListener('mousedown', () => sec.setAttribute('draggable', 'true'));
    sec.addEventListener('dragstart', e => {
      if (!sec.getAttribute('draggable')) { e.preventDefault(); return; }
      dragSecType = sec.dataset.secType;
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => sec.classList.add('sec-dragging'), 0);
    });
    sec.addEventListener('dragend', () => {
      sec.removeAttribute('draggable');
      sec.classList.remove('sec-dragging');
      grid.querySelectorAll('.accounts-section').forEach(s => s.classList.remove('sec-drag-over'));
      dragSecType = null;
    });
    sec.addEventListener('dragover', e => {
      if (!dragSecType) return;
      e.preventDefault();
      grid.querySelectorAll('.accounts-section').forEach(s => s.classList.remove('sec-drag-over'));
      if (sec.dataset.secType !== dragSecType) sec.classList.add('sec-drag-over');
    });
    sec.addEventListener('drop', e => {
      if (!dragSecType) return;
      e.preventDefault();
      const fromType = dragSecType;
      const toType = sec.dataset.secType;
      if (fromType === toType) return;
      const fromSec = grid.querySelector(`.accounts-section[data-sec-type="${fromType}"]`);
      const secs = [...grid.querySelectorAll('.accounts-section')];
      const fromIdx = secs.indexOf(fromSec);
      const toIdx   = secs.indexOf(sec);
      grid.insertBefore(fromSec, fromIdx < toIdx ? sec.nextSibling : sec);
      _accTypeOrder = [...grid.querySelectorAll('.accounts-section')].map(s => s.dataset.secType);
      api.setSetting('accounts.type_order', JSON.stringify(_accTypeOrder));
      grid.querySelectorAll('.accounts-section').forEach(s => s.classList.remove('sec-drag-over'));
    });
  });
}

window.closeCreditMonth = async (cardId, cardName) => {
  const accounts = await api.getAccounts();
  const sources  = accounts.filter(a => a.type !== 'credit' && a.type !== 'investment' && !a.is_closed);

  // Default: mese precedente
  const now = new Date();
  const defYear  = now.getDate() >= 10 ? now.getFullYear() : (now.getMonth() === 0 ? now.getFullYear()-1 : now.getFullYear());
  const defMonth = now.getDate() >= 10 ? now.getMonth() + 1 : (now.getMonth() === 0 ? 12 : now.getMonth());
  const defMonthStr = `${defYear}-${String(defMonth).padStart(2,'0')}`;

  // Data di pagamento default: 10 del mese successivo
  const payYear  = defMonth === 12 ? defYear + 1 : defYear;
  const payMonth = defMonth === 12 ? 1 : defMonth + 1;
  const defPayDate = `${payYear}-${String(payMonth).padStart(2,'0')}-10`;

  const body = `
    <div class="form-group">
      <label class="form-label">Mese di riferimento</label>
      <input type="month" class="form-control" id="cc_month" value="${defMonthStr}">
    </div>
    <div class="form-group" style="background:var(--bg3);border-radius:6px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:12px;color:var(--txt2)">Spese nel mese</span>
      <span id="cc_amount_display" style="font-size:16px;font-weight:700;color:var(--expense)">—</span>
    </div>
    <div class="form-group">
      <label class="form-label">Conto sorgente</label>
      <select class="form-control" id="cc_source">
        <option value="">— Seleziona —</option>
        ${sources.map(a=>`<option value="${a.id}">${a.icon} ${a.name} (${fmt.currency(a.balance)})</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Data trasferimento</label>
      <input type="date" class="form-control" id="cc_date" value="${defPayDate}">
    </div>
    <div class="form-group">
      <label class="form-label">Importo (€)</label>
      <input type="number" step="0.01" class="form-control" id="cc_amount" placeholder="Calcolato automaticamente">
    </div>`;

  const calcAmount = async () => {
    const monthVal = document.getElementById('cc_month')?.value;
    if (!monthVal) return;
    const [y, m] = monthVal.split('-').map(Number);
    const from = `${y}-${String(m).padStart(2,'0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const to   = `${y}-${String(m).padStart(2,'0')}-${lastDay}`;
    const txs  = await api.getTransactions({ account_id: cardId, date_from: from, date_to: to, limit: 5000 });
    const total = txs.filter(t => t.type !== 'transfer').reduce((s,t) => s + t.amount, 0);
    const el = document.getElementById('cc_amount_display');
    const inp = document.getElementById('cc_amount');
    if (el)  el.textContent  = fmt.currency(total);
    if (inp) inp.value = total.toFixed(2);
    // Aggiorna data pagamento in base al mese scelto
    const pm = m === 12 ? 1 : m + 1;
    const py = m === 12 ? y + 1 : y;
    const dateInp = document.getElementById('cc_date');
    if (dateInp) dateInp.value = `${py}-${String(pm).padStart(2,'0')}-10`;
  };

  openModal(`💳 Chiudi mese — ${cardName}`, body, async () => {
    const sourceId = parseInt(document.getElementById('cc_source').value);
    const amount   = parseFloat(document.getElementById('cc_amount').value);
    const date     = document.getElementById('cc_date').value;
    if (!sourceId) { toast('Seleziona il conto sorgente', 'error'); return; }
    if (!amount || amount <= 0) { toast('Importo non valido', 'error'); return; }
    if (!date)    { toast('Inserisci la data', 'error'); return; }
    const monthVal = document.getElementById('cc_month')?.value || defMonthStr;
    await api.addTransaction({
      date, amount, type: 'transfer',
      account_id: sourceId, to_account_id: cardId,
      description: `Pagamento carta ${cardName} — ${monthVal}`,
      reconciled: 0
    });
    toast(`Trasferimento di ${fmt.currency(amount)} creato`);
    loadAccountCards();
    updateSidebar();
  });

  // Calcola subito al primo render
  setTimeout(calcAmount, 50);

  // Ricalcola quando cambia il mese
  setTimeout(() => {
    document.getElementById('cc_month')?.addEventListener('change', calcAmount);
  }, 100);
};

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
    </div>
    <div class="form-row" style="margin-top:8px">
      <label class="acc-check-label">
        <input type="checkbox" id="a_favorite" ${account?.is_favorite ? 'checked' : ''}>
        ⭐ Preferito
      </label>
      <label class="acc-check-label">
        <input type="checkbox" id="a_closed" ${account?.is_closed ? 'checked' : ''}>
        🔒 Chiuso
      </label>
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
      is_favorite:     document.getElementById('a_favorite').checked ? 1 : 0,
      is_closed:       document.getElementById('a_closed').checked   ? 1 : 0,
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
const MONTHS_SHORT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
let budgetYear = new Date().getFullYear();
let _budgetTab = 'grid';
let _budgetAndamentoChart = null;

async function renderBudgets() {
  if (_budgetAndamentoChart) { _budgetAndamentoChart.destroy(); _budgetAndamentoChart = null; }
  const pg = document.getElementById('pg-budgets');
  pg.innerHTML = `
    <div style="flex-shrink:0;padding:16px 16px 0;background:var(--bg)">
      <div class="section-header">
        <div class="month-nav" style="margin-bottom:0">
          <button id="budgPrev">‹</button>
          <span id="budgYearLabel"></span>
          <button id="budgNext">›</button>
        </div>
        <div id="budgGridActions" style="display:${_budgetTab==='grid'?'flex':'none'};gap:8px">
          <button class="btn btn-ghost" id="btnBudgOnlyRed">Solo rossi</button>
          <button class="btn btn-ghost" id="btnBudgToggleAll">Comprimi tutto</button>
          <button class="btn btn-primary" id="btnGenBudget">Genera budget</button>
        </div>
      </div>
      <div class="scheduled-tabs" style="margin-top:8px">
        <button class="sched-tab ${_budgetTab==='grid'?'active':''}"        data-btab="grid"        onclick="_setBudgetTab('grid')">📊 Budget</button>
        <button class="sched-tab ${_budgetTab==='andamento'?'active':''}"   data-btab="andamento"   onclick="_setBudgetTab('andamento')">📈 Andamento</button>
        <button class="sched-tab ${_budgetTab==='scostamenti'?'active':''}" data-btab="scostamenti" onclick="_setBudgetTab('scostamenti')">📉 Scostamenti</button>
        <button class="sched-tab ${_budgetTab==='pianificate'?'active':''}" data-btab="pianificate" onclick="_setBudgetTab('pianificate')">🔗 Verifica Pianificate</button>
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
      <div id="budgPianWrap"       style="display:${_budgetTab==='pianificate' ?'block':'none'};overflow-y:auto;flex:1"></div>
    </div>`;

  document.getElementById('budgYearLabel').textContent = budgetYear;
  document.getElementById('budgPrev').onclick = () => { budgetYear--; renderBudgets(); };
  document.getElementById('budgNext').onclick = () => { budgetYear++; renderBudgets(); };
  document.getElementById('btnGenBudget').onclick = () => showGenerateBudgetModal();
  document.getElementById('btnBudgOnlyRed').onclick = () => {
    _budgetOnlyRed = !_budgetOnlyRed;
    document.getElementById('btnBudgOnlyRed').classList.toggle('btn-active-red', _budgetOnlyRed);
    document.getElementById('budgGridWrap')?.classList.toggle('budget-only-red', _budgetOnlyRed);
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
  document.getElementById('budgPianWrap').style.display      = tab === 'pianificate' ? 'block' : 'none';
  document.getElementById('budgGridActions').style.display   = tab === 'grid'        ? 'flex' : 'none';
  if (tab === 'andamento'   && _budgetData) renderBudgetAndamento();
  if (tab === 'scostamenti' && _budgetData) renderBudgetScostamenti();
  if (tab === 'pianificate') renderBudgetVsPianificate();
};

let _accFavoritesOnly = false;
let _budgetData = null;
let _budgetCollapsed = new Set();
let _budgetOnlyRed = false;
let _budgetScostTab  = 'uscite';
let _budgetScostSort = 'pct';

async function loadBudgetTable() {
  _budgetData = await api.getBudgetYear(budgetYear);
  renderBudgetTable();
  if (_budgetTab === 'andamento')   renderBudgetAndamento();
  if (_budgetTab === 'scostamenti') renderBudgetScostamenti();
}

function renderBudgetTable() {
  const { budgets, actuals, categories, configs } = _budgetData;

  if (!categories.length) {
    document.getElementById('budgetBody').innerHTML =
      `<tr><td colspan="16" style="text-align:center;padding:40px;color:var(--txt3)">
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
  const configMap = {};  // catId -> {mode, master_amount}
  (configs || []).forEach(c => { configMap[c.category_id] = c; });

  const now = new Date();
  const curYear = now.getFullYear(), curMonth = now.getMonth() + 1;
  const isCurMonthCol = m => budgetYear === curYear && m === curMonth;

  // Categorie che hanno figli → solo riepilogo, non editabili
  const parentIds = new Set(categories.filter(c => c.parent_id).map(c => c.parent_id));
  const childrenOf = {};
  categories.forEach(c => { if (c.parent_id) (childrenOf[c.parent_id] ??= []).push(c); });

  // Ritorna i 12 valori effettivi: DB per i mesi manuali, calcolato per i liberi
  const getEffective = catId => {
    const cfg = configMap[catId];
    const stored = budgetMap[catId] || {};
    if (!cfg || !cfg.master_amount) return stored;
    const lockedTotal = cfg.mode === 'annuale' ? cfg.master_amount : cfg.master_amount * 12;
    const pinnedMonths = Object.keys(stored).map(Number);
    const pinnedSum = pinnedMonths.reduce((s, m) => s + (stored[m] || 0), 0);
    const freeCount = 12 - pinnedMonths.length;
    const freeVal = freeCount > 0 ? Math.round((lockedTotal - pinnedSum) / freeCount * 100) / 100 : 0;
    const result = {...stored};
    for (let m = 1; m <= 12; m++) {
      if (result[m] === undefined) result[m] = Math.max(0, freeVal);
    }
    return result;
  };

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
      const showDiff = past && budget > 0;
      // income: diff = actual - budget (negativo = sotto il previsto = rosso)
      // expense: diff = budget - actual (negativo = sforato = rosso)
      // 0 sempre verde
      const diff = isIncome ? (actual - budget) : (budget - actual);
      const diffColor = diff < 0 ? 'var(--expense)' : 'var(--income)';
      const diffStr = (diff >= 0 ? '+' : '') + fmt.currency(diff);
      if (!showActual && !showDiff) return '';
      return `${showActual ? `<span class="budget-cell-actual">${fmt.currency(actual)}</span>` : ''}
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
        return `<td class="budget-cell budget-cell-parent budget-cell-readonly${curCls}" data-over="${over?1:0}">
          <span class="budget-cell-val">${budget>0?fmt.currency(budget):''}</span>
          ${cellBottom(budget, actual, m)}
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

    return `<tr class="${isGroupHeader?'budget-row-parent':''} ${isChild?'budget-row-child':''}" data-cat-id="${cat.id}" data-parent-id="${cat.parent_id||''}" data-row-over="${anyOver?1:0}" style="${rowStyle}" ${isGroupHeader?`ondblclick="_budgetToggle(${cat.id})"`:''}">
      <td class="budget-cat-cell ${isChild?'budget-child-indent':''}">
        ${isGroupHeader ? `<button class="btn-budget-toggle" onclick="_budgetToggle(${cat.id})">${isCollapsed?'▶':'▼'}</button>` : ''}
        <span style="color:${cat.color}">${cat.icon}</span> ${cat.name}
        ${isGroupHeader?'<span class="budget-group-hint"> (riepilogo)</span>':''}
        <button class="btn-budget-detail" title="Dettaglio" onclick="event.stopPropagation();_budgetShowDetail(${cat.id},'${cat.name.replace(/'/g,"\\'")}')">📊</button>
      </td>
      ${gestioneCell}
      ${cells}
      <td class="budget-total-cell ${isGroupHeader?'budget-cell-parent':''}">
        ${displayTotal>0?`<b>${fmt.currency(displayTotal)}</b>`:''}
        ${displayTotal>0?`<span class="budget-cell-actual ${totalOver?'over':''}">${fmt.currency(annualActual)}</span>`:''}
      </td>
      ${actions}
    </tr>`;
  }).join('');

  // ── Righe sommario (Reale / Budget / Differenza) ─────────────────────────
  const leafCats = categories.filter(c => !parentIds.has(c.id));
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
    return `<td class="${curCls.trim()}" style="${s};text-align:right;${bold?'font-weight:700;':''}${col}">${show?fmt.currency(v):''}</td>`;
  };

  document.getElementById('budgetThead').innerHTML = `
    <tr class="budget-thead-months">
      <th style="${s};min-width:160px">Categoria</th>
      <th style="${s};min-width:110px">Gestione</th>
      ${MONTHS_SHORT.map((m,i)=>`<th class="${isCurMonthCol(i+1)?'budget-cur-month':''}" style="${s};text-align:right">${m}</th>`).join('')}
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
      ${numCell(totBudget, totBudget!==0, false, true)}
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

  // Sticky: calcola top offset di ogni riga del thead dopo il render
  setTimeout(() => {
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
  }, 0);
}

/* ─── Budget Andamento ───────────────────────────────────────────────────── */
function renderBudgetAndamento() {
  const el = document.getElementById('budgAndamentoWrap');
  if (!el || !_budgetData) return;

  const { budgets, actuals, categories, configs } = _budgetData;

  // Rebuild lookup maps (identici a renderBudgetTable)
  const budgetMap = {};
  budgets.forEach(b => { if (!budgetMap[b.category_id]) budgetMap[b.category_id]={}; budgetMap[b.category_id][b.month]=b.amount; });
  const actualMap = {};
  actuals.forEach(a => { if (!actualMap[a.category_id]) actualMap[a.category_id]={}; actualMap[a.category_id][a.month]=a.total; });
  const configMap = {};
  (configs||[]).forEach(c => { configMap[c.category_id]=c; });

  const parentIds = new Set(categories.filter(c=>c.parent_id).map(c=>c.parent_id));
  const leafCats  = categories.filter(c => !parentIds.has(c.id));

  const getEffective = catId => {
    const cfg = configMap[catId];
    const stored = budgetMap[catId] || {};
    if (!cfg || !cfg.master_amount) return stored;
    const lockedTotal = cfg.mode === 'annuale' ? cfg.master_amount : cfg.master_amount * 12;
    const pinnedMonths = Object.keys(stored).map(Number);
    const pinnedSum = pinnedMonths.reduce((s,m) => s+(stored[m]||0), 0);
    const freeCount = 12 - pinnedMonths.length;
    const freeVal = freeCount > 0 ? Math.round((lockedTotal-pinnedSum)/freeCount*100)/100 : 0;
    const result = {...stored};
    for (let m=1; m<=12; m++) if (result[m]===undefined) result[m]=Math.max(0,freeVal);
    return result;
  };

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
          <th style="text-align:right;padding:7px 12px;border-bottom:2px solid var(--border);color:var(--txt2);font-weight:600">Budget mese</th>
          <th style="text-align:right;padding:7px 12px;border-bottom:2px solid var(--border);color:var(--txt2);font-weight:600">Budget prog.</th>
          <th style="text-align:right;padding:7px 12px;border-bottom:2px solid var(--border);color:var(--txt2);font-weight:600">Reale mese</th>
          <th style="text-align:right;padding:7px 12px;border-bottom:2px solid var(--border);color:var(--txt2);font-weight:600">Reale prog.</th>
          <th style="text-align:right;padding:7px 12px;border-bottom:2px solid var(--border);color:var(--txt2);font-weight:600">Δ mese</th>
          <th style="text-align:right;padding:7px 12px;border-bottom:2px solid var(--border);color:var(--txt2);font-weight:600">Δ prog.</th>
        </tr></thead>
        <tbody>${MONTHS_SHORT.map((mName, i) => {
          const bm = budgetMese[i], bp = budgetProg[i];
          const rm = realeMese[i], rp = realeProg[i];
          const dm = deltaMese[i], dp = deltaProg[i];
          const past = isPast(i+1);
          const fmtD = v => v == null ? '—' : (v >= 0 ? '+' : '') + fmt.currency(v);
          const colD  = v => v == null ? '' : v >= 0 ? 'color:var(--income)' : 'color:var(--expense)';
          const td  = (v, bold) => `<td style="text-align:right;padding:7px 12px;border-bottom:1px solid var(--border);${bold?'font-weight:600':''}">${v!=null?fmt.currency(v):'—'}</td>`;
          const tdd = (v) => `<td style="text-align:right;padding:7px 12px;border-bottom:1px solid var(--border);${colD(v)}">${fmtD(v)}</td>`;
          const rowBg = past && dm !== null ? (dm > 0 ? 'background:rgba(63,185,80,.04)' : dm < 0 ? 'background:rgba(248,81,73,.04)' : '') : '';
          return `<tr style="${rowBg}">
            <td style="padding:7px 12px;border-bottom:1px solid var(--border);font-weight:500">${mName} ${budgetYear}</td>
            ${td(bm, false)}
            ${td(bp, false)}
            ${past ? td(rm, false) : '<td style="text-align:right;padding:7px 12px;border-bottom:1px solid var(--border);color:var(--txt3)">—</td>'}
            ${past ? td(rp, false) : '<td style="text-align:right;padding:7px 12px;border-bottom:1px solid var(--border);color:var(--txt3)">—</td>'}
            ${past ? tdd(dm) : '<td style="padding:7px 12px;border-bottom:1px solid var(--border)"></td>'}
            ${past ? tdd(dp) : '<td style="padding:7px 12px;border-bottom:1px solid var(--border)"></td>'}
          </tr>`;
        }).join('')}</tbody>
      </table>
    </div>`;

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
          backgroundColor: 'transparent',
          tension: 0.3, pointRadius: 3, pointHoverRadius: 5,
          borderDash: [5, 3],
          spanGaps: false,
          order: 1
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: chartColors().tick } },
        tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${fmt.currency(ctx.parsed.y)}` } }
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

/* ─── Budget Scostamenti YTD ─────────────────────────────────────────────── */
function renderBudgetScostamenti() {
  const el = document.getElementById('budgScostWrap');
  if (!el || !_budgetData) return;

  const { budgets, actuals, categories, configs } = _budgetData;

  // Lookup maps (stessa logica di renderBudgetTable)
  const budgetMap = {}, actualMap = {}, configMap = {}, catById = {};
  budgets.forEach(b => { if (!budgetMap[b.category_id]) budgetMap[b.category_id]={}; budgetMap[b.category_id][b.month]=b.amount; });
  actuals.forEach(a => { if (!actualMap[a.category_id]) actualMap[a.category_id]={}; actualMap[a.category_id][a.month]=a.total; });
  (configs||[]).forEach(c => { configMap[c.category_id]=c; });
  categories.forEach(c => { catById[c.id]=c; });

  const parentIds = new Set(categories.filter(c=>c.parent_id).map(c=>c.parent_id));
  const leafCats  = categories.filter(c => !parentIds.has(c.id));

  const getEffective = catId => {
    const cfg = configMap[catId], stored = budgetMap[catId]||{};
    if (!cfg || !cfg.master_amount) return stored;
    const lockedTotal = cfg.mode==='annuale' ? cfg.master_amount : cfg.master_amount*12;
    const pinnedMonths = Object.keys(stored).map(Number);
    const pinnedSum = pinnedMonths.reduce((s,m)=>s+(stored[m]||0),0);
    const freeCount = 12-pinnedMonths.length;
    const freeVal = freeCount>0 ? Math.round((lockedTotal-pinnedSum)/freeCount*100)/100 : 0;
    const result = {...stored};
    for (let m=1;m<=12;m++) if (result[m]===undefined) result[m]=Math.max(0,freeVal);
    return result;
  };

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
            <td style="${tdS}"><span style="color:${r.cat.color}">${r.cat.icon}</span> ${r.cat.name}</td>
            <td style="${tdS};text-align:right;font-variant-numeric:tabular-nums">${fmt.currency(r.bDisplay)}</td>
            <td style="${tdS};text-align:right;font-variant-numeric:tabular-nums">${hasActual?fmt.currency(r.rDisplay):'—'}</td>
            <td style="${tdS};text-align:right;font-variant-numeric:tabular-nums;color:${pctCol}">${diffStr}</td>
            <td style="${tdS};text-align:right;font-weight:600;color:${pctCol}">${pctStr}</td>
            <td style="${tdS}">
              <div style="display:flex;align-items:center;gap:8px">
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

  const getEffective = catId => {
    const cfg = configMap[catId];
    const stored = budgetMap[catId] || {};
    if (!cfg || !cfg.master_amount) return stored;
    const lockedTotal = cfg.mode === 'annuale' ? cfg.master_amount : cfg.master_amount * 12;
    const pinnedMonths = Object.keys(stored).map(Number);
    const pinnedSum = pinnedMonths.reduce((s, m) => s + (stored[m] || 0), 0);
    const freeCount = 12 - pinnedMonths.length;
    const freeVal = freeCount > 0 ? Math.round((lockedTotal - pinnedSum) / freeCount * 100) / 100 : 0;
    const result = {...stored};
    for (let m = 1; m <= 12; m++) { if (result[m] === undefined) result[m] = Math.max(0, freeVal); }
    return result;
  };

  const catObj = categories.find(c => c.id === catId);
  const isIncome = catObj ? catObj.type === 'income' : false;

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
      <td style="text-align:right;color:var(--txt3)">${cumA ? fmt.currency(cumA) : '—'}</td>
      <td style="text-align:right;color:var(--txt3)">${cumB ? fmt.currency(cumB) : '—'}</td>
      <td style="text-align:right;${(cumB||cumA) ? diffColor(cumD) : ''}">${(cumB||cumA) ? fmt.currency(cumD) : '—'}</td>
    </tr>`;
  }).join('');

  const totB = Object.values(bm).reduce((s,v)=>s+v,0);
  const totA = Object.values(am).reduce((s,v)=>s+v,0);
  const totD = totA - totB;  // Reale − Budget
  const totDc = (totB||totA) ? diffColor(totD) : '';

  const body = `
    <div style="display:flex;gap:20px;align-items:flex-start">
      <div class="table-wrap" style="flex:0 0 auto">
        <table>
          <thead>
            <tr>
              <th rowspan="2">Mese</th>
              <th colspan="3" style="text-align:center;border-bottom:1px solid var(--border)">Mensile</th>
              <th colspan="3" style="text-align:center;border-bottom:1px solid var(--border)">Cumulativo</th>
            </tr>
            <tr>
              <th style="text-align:right">Reale</th>
              <th style="text-align:right">Budget</th>
              <th style="text-align:right">Diff.</th>
              <th style="text-align:right">Reale</th>
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
            <td style="text-align:right;color:var(--txt3)">${totA ? fmt.currency(totA) : '—'}</td>
            <td style="text-align:right;color:var(--txt3)">${totB ? fmt.currency(totB) : '—'}</td>
            <td style="text-align:right;${totDc}">${(totB||totA) ? fmt.currency(totD) : '—'}</td>
          </tr></tfoot>
        </table>
      </div>
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px">
        <div style="position:relative;height:360px">
          <canvas id="budgetDetailChart"></canvas>
        </div>
        <div style="font-size:10px;color:var(--txt3);text-align:center">
          Scroll per zoom · Trascina per spostare · Doppio click per reset
        </div>
      </div>
    </div>`;

  openModal(`📊 ${catName} — ${budgetYear}`, body, null);

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
            borderColor: '#3fb950',
            backgroundColor: 'rgba(63,185,80,0.08)',
            borderWidth: 2,
            pointRadius: 2,
            tension: 0.3,
            fill: false,
          },
          {
            label: 'Differenza cumulativa',
            data: chartLabels.map((_,i) => { let a=0,b=0; for(let m=1;m<=i+1;m++){a+=am[m]||0;b+=bm[m]||0;} return a-b; }),
            borderColor: '#a78bfa',
            backgroundColor: 'rgba(167,139,250,0.08)',
            borderWidth: 2,
            borderDash: [4,3],
            pointRadius: 2,
            tension: 0.3,
            fill: false,
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
          }
        },
        scales: {
          x: { ticks: { color: '#8b949e', font: { size: 10 } }, grid: { color: '#21262d' } },
          y: { ticks: { color: '#8b949e', font: { size: 10 }, callback: v => fmt.currency(v) }, grid: { color: '#21262d' } },
        }
      }
    });

    // Zoom con scroll, pan con drag, reset con doppio click
    const chart = window._budgetDetailChart;
    const N = chartLabels.length - 1;
    const getRange = () => {
      const s = chart.scales.x;
      const mn = s.min != null ? MONTHS_SHORT.indexOf(s.min) : 0;
      const mx = s.max != null ? MONTHS_SHORT.indexOf(s.max) : N;
      return { mn: mn < 0 ? 0 : mn, mx: mx < 0 ? N : mx };
    };
    const setRange = (mn, mx) => {
      mn = Math.max(0, Math.round(mn));
      mx = Math.min(N, Math.round(mx));
      if (mx <= mn) mx = mn + 1;
      chart.options.scales.x.min = chartLabels[mn];
      chart.options.scales.x.max = chartLabels[mx];
      chart.update('none');
    };

    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const { mn, mx } = getRange();
      const range = mx - mn;
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left - chart.scales.x.left) / (chart.scales.x.right - chart.scales.x.left)));
      const pivot = mn + ratio * range;
      const factor = e.deltaY > 0 ? 1.25 : 0.8;
      const newRange = Math.max(1, Math.min(N + 1, range * factor));
      setRange(pivot - ratio * newRange, pivot + (1 - ratio) * newRange);
    }, { passive: false });

    canvas.addEventListener('dblclick', () => {
      chart.options.scales.x.min = undefined;
      chart.options.scales.x.max = undefined;
      chart.update('none');
    });

    let _drag = null;
    canvas.addEventListener('mousedown', e => {
      const r = getRange();
      _drag = { startX: e.clientX, mn: r.mn, mx: r.mx };
      canvas.style.cursor = 'grabbing';
    });
    canvas.addEventListener('mousemove', e => {
      if (!_drag) return;
      const pixW = chart.scales.x.right - chart.scales.x.left;
      const range = _drag.mx - _drag.mn;
      const shift = -(_drag.startX - e.clientX) / pixW * range;
      let mn = _drag.mn - shift, mx = _drag.mx - shift;
      if (mn < 0) { mx -= mn; mn = 0; }
      if (mx > N) { mn -= mx - N; mx = N; }
      chart.options.scales.x.min = chartLabels[Math.max(0, Math.round(mn))];
      chart.options.scales.x.max = chartLabels[Math.min(N, Math.round(mx))];
      chart.update('none');
    });
    const endDrag = () => { _drag = null; canvas.style.cursor = 'default'; };
    canvas.addEventListener('mouseup', endDrag);
    canvas.addEventListener('mouseleave', endDrag);
  }, 50);
};

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
       <label style="display:flex;align-items:center;gap:8px;margin:8px 0;cursor:pointer">
         <input type="radio" name="bg_source" value="history" checked>
         Storico ${prevYear} — copia le entrate/uscite effettive per categoria
       </label>
       <label style="display:flex;align-items:center;gap:8px;margin:8px 0;cursor:pointer">
         <input type="radio" name="bg_source" value="copy">
         Copia da budget anno
         <select id="bg_copy_year" style="margin-left:4px">${yearOpts}</select>
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
   PORTAFOGLIO
═══════════════════════════════════════════════════════════════════════════ */
// Calcola valore di mercato di una posizione (gestisce equity e bond)
// Bond: quantity = nominale totale (€), price = % → valore = nominale × price% / 100
function portfolioItemValue(i, useAvg = false) {
  const price = useAvg ? i.avg_price : (i.current_price || i.avg_price);
  if (i.asset_type === 'bond') return i.quantity * price / 100;
  return i.quantity * price;
}

async function renderPortfolio() {
  const pg = document.getElementById('pg-portfolio');
  const [items, accounts] = await Promise.all([api.getPortfolio(), api.getAccounts()]);
  const investAccounts = accounts.filter(a => a.type === 'investment' && !a.is_closed);

  const totalInvested    = items.reduce((s,i) => s + portfolioItemValue(i, true), 0);
  const totalCurrent     = items.reduce((s,i) => s + portfolioItemValue(i, false), 0);
  const totalCommissions = items.reduce((s,i) => s + (i.total_commissions || 0), 0);
  const totalPnL         = totalCurrent - totalInvested;
  const pnlPct           = totalInvested ? (totalPnL/totalInvested)*100 : 0;

  pg.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">Portafoglio Titoli</h2>
      ${investAccounts.length ? `
        <div class="theme-toggle-group" style="margin-right:8px">
          <button class="btn theme-btn ${_portfolioActiveOnly?'theme-btn-active':''}"  onclick="_setPortfolioFilter(true)">Solo attivi</button>
          <button class="btn theme-btn ${!_portfolioActiveOnly?'theme-btn-active':''}" onclick="_setPortfolioFilter(false)">Tutti</button>
        </div>
        <button class="btn btn-secondary" id="btnImportPos">📥 Carica esistente</button>
        <button class="btn btn-primary" id="btnBuyStock">+ Acquista</button>` : ''}
    </div>
    ${!investAccounts.length ? `
      <div class="card" style="padding:32px;text-align:center;color:var(--txt2)">
        <div style="font-size:32px;margin-bottom:12px">💼</div>
        <div style="font-size:16px;font-weight:600;margin-bottom:8px">Nessun conto investimento</div>
        <div style="margin-bottom:16px">Per usare il portafoglio crea prima un conto di tipo <strong>Investimento</strong>.</div>
        <button class="btn btn-primary" onclick="navigate('accounts')">Vai ai Conti →</button>
      </div>` : `
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
      ${totalCommissions > 0 ? `
      <div class="stat-card">
        <div class="stat-label">💸 Commissioni</div>
        <div class="stat-value" style="color:var(--txt2)">${fmt.currency(totalCommissions)}</div>
      </div>` : ''}
    </div>
    <div class="card">
      <div class="table-wrap">
        <table><thead><tr>
          ${[
            ['tipo',     'Tipo',          ''],
            ['ticker',   'Ticker',        ''],
            ['nome',     'Nome',          ''],
            ['scadenza', 'Scadenza',      ''],
            ['conto',    'Conto',         ''],
            ['qty',      'Qtà / Nominale',''],
            ['avg',      'Prezzo Medio',  ''],
            ['cur',      'Prezzo Att.',   ''],
            ['valore',   'Valore',        'text-right'],
            ['comm',     'Comm.',         'text-right'],
            ['pnl',      'P&L',           'text-right'],
          ].map(([col, label, cls]) => {
            const active = _portfolioSort.col === col;
            const ind = active ? (_portfolioSort.dir > 0 ? ' ▲' : ' ▼') : '';
            return `<th class="${cls} sched-th-sort" style="cursor:pointer;white-space:nowrap" onclick="_portfolioSortBy('${col}')">${label}<span class="sort-ind">${ind}</span></th>`;
          }).join('')}
          <th></th>
        </tr></thead><tbody>
        ${(() => {
          let rows = items.filter(i => _portfolioActiveOnly ? i.quantity > 0 : true);
          // Calcola valori per il sort
          rows = rows.map(i => {
            const val  = portfolioItemValue(i, false);
            const cost = portfolioItemValue(i, true);
            return { ...i, _val: val, _cost: cost, _pnl: val - cost, _comm: i.total_commissions || 0 };
          });
          const col = _portfolioSort.col, dir = _portfolioSort.dir;
          rows.sort((a, b) => {
            let va, vb;
            switch (col) {
              case 'tipo':     va = a.asset_type || ''; vb = b.asset_type || ''; break;
              case 'ticker':   va = a.ticker || '';     vb = b.ticker || '';     break;
              case 'nome':     va = a.name || '';       vb = b.name || '';       break;
              case 'scadenza': va = a.maturity_date||'9999'; vb = b.maturity_date||'9999'; break;
              case 'conto':    va = a.account_name||''; vb = b.account_name||''; break;
              case 'qty':      va = a.quantity||0;      vb = b.quantity||0;      break;
              case 'avg':      va = a.avg_price||0;     vb = b.avg_price||0;     break;
              case 'cur':      va = a.current_price||0; vb = b.current_price||0; break;
              case 'valore':   va = a._val;             vb = b._val;             break;
              case 'comm':     va = a._comm;            vb = b._comm;            break;
              case 'pnl':      va = a._pnl;             vb = b._pnl;             break;
              default:         va = ''; vb = '';
            }
            if (typeof va === 'string') return dir * va.localeCompare(vb);
            return dir * (va - vb);
          });
          if (!rows.length) return '<tr><td colspan="12" style="text-align:center;padding:40px;color:var(--txt3)">Nessun titolo in portafoglio. Clicca "+ Acquista" per iniziare.</td></tr>';
          return rows.map(i => {
            const isBond = i.asset_type === 'bond';
            const val = i._val, cost = i._cost, pnl = i._pnl, comm = i._comm;
            const pnlP = cost ? (pnl/cost)*100 : 0;
            const priceDisplay = isBond ? `${(i.avg_price||0).toFixed(2)} %` : fmt.currency(i.avg_price);
            const priceUnit    = isBond ? '%' : '€';
            const typeBadge    = isBond
              ? `<span class="badge" style="background:#d29922;color:#fff;font-size:10px;padding:1px 5px;border-radius:4px">OBB</span>`
              : `<span class="badge" style="background:#58a6ff;color:#fff;font-size:10px;padding:1px 5px;border-radius:4px">AZI</span>`;
            const couponBtn = isBond && i.coupon_rate > 0
              ? `<button class="btn btn-ghost btn-icon" title="Registra cedola" onclick="showCouponModal(${i.id})">💰</button>`
              : '';
            const couponInfo = isBond && i.coupon_rate
              ? `<br><small style="color:var(--txt3);font-size:10px">${i.coupon_rate}% → netto ${((1-(i.coupon_tax||12.5)/100)*i.coupon_rate).toFixed(3)}%</small>`
              : '';
            const qtyDisplay = isBond
              ? `<span title="Nominale totale">${fmt.currency(i.quantity)}</span>`
              : i.quantity;
            const scadenzaDisplay = i.maturity_date || '<span style="color:var(--txt3)">—</span>';
            return `<tr oncontextmenu="_showPortfolioCtx(${i.id},event)" style="cursor:context-menu">
              <td>${typeBadge}</td>
              <td class="td-main" style="font-weight:700">${i.ticker}</td>
              <td>${i.name}${couponInfo}</td>
              <td style="font-size:12px;white-space:nowrap">${scadenzaDisplay}</td>
              <td><span style="color:${i.account_color}">${i.account_icon}</span> ${i.account_name}</td>
              <td>${qtyDisplay}</td>
              <td>${priceDisplay}</td>
              <td>
                <div style="display:flex;align-items:center;gap:3px">
                  <input type="text" inputmode="decimal" class="form-control" style="width:75px;padding:2px 6px;font-size:12px"
                    value="${i.current_price||''}"
                    onblur="updateStockPrice(${i.id}, this.value)"
                    onkeydown="if(event.key==='Enter'){this.blur()}"
                    placeholder="—">
                  <span style="font-size:11px;color:var(--txt3)">${priceUnit}</span>
                </div>
              </td>
              <td class="text-right">${fmt.currency(val)}</td>
              <td class="text-right" style="color:var(--txt3);font-size:12px">${comm > 0 ? fmt.currency(comm) : '—'}</td>
              <td class="text-right ${pnl>=0?'pnl-positive':'pnl-negative'}">${fmt.currency(pnl)}<br><small>${fmt.pct(pnlP)}</small></td>
              <td style="white-space:nowrap">
                <button class="btn btn-ghost btn-icon" title="Acquista altro" onclick="showBuyModal(${i.id})">➕</button>
                <button class="btn btn-ghost btn-icon" title="Vendi" onclick="showSellModal(${i.id})">➖</button>
                ${couponBtn}
                <button class="btn btn-ghost btn-icon" title="Modifica" onclick="showEditPositionModal(${i.id})">✏️</button>
                <button class="btn btn-ghost btn-icon" title="Storico" onclick="showPortfolioHistory(${i.id})">📋</button>
                <button class="btn btn-ghost btn-icon" title="Elimina" onclick="deleteStock(${i.id})">🗑️</button>
              </td>
            </tr>`;
          }).join('');
        })()}
        </tbody></table>
      </div>
    </div>`}`;

  if (investAccounts.length) {
    document.getElementById('btnBuyStock').onclick  = () => showBuyModal(null, investAccounts, accounts).catch(e => toast(e.message,'error'));
    document.getElementById('btnImportPos').onclick = () => showImportModal(investAccounts);
  }
}

async function showBuyModal(portfolioId, investAccounts, allAccounts) {
  if (!investAccounts || !allAccounts) {
    const accounts = await api.getAccounts();
    investAccounts = accounts.filter(a => a.type === 'investment' && !a.is_closed);
    allAccounts = accounts;
  }
  const regularAccounts = allAccounts.filter(a => a.type !== 'investment' && !a.is_closed);
  const today = new Date().toISOString().split('T')[0];

  // If buying more of existing position, pre-fill ticker/name
  let prefillTicker = '', prefillName = '', prefillAccountId = '';
  let prefillAssetType = 'equity', prefillFaceValue = 1;
  let prefillMaturity = '', prefillCouponRate = '', prefillCouponFreq = 'semiannual', prefillCouponTax = 12.5;
  if (portfolioId) {
    const items = await api.getPortfolio();
    const pos = items.find(i => i.id === portfolioId);
    if (pos) {
      prefillTicker     = pos.ticker; prefillName = pos.name; prefillAccountId = pos.account_id;
      prefillAssetType  = pos.asset_type || 'equity';
      prefillFaceValue  = pos.face_value || 1;
      prefillMaturity   = pos.maturity_date || '';
      prefillCouponRate = pos.coupon_rate || '';
      prefillCouponFreq = pos.coupon_frequency || 'semiannual';
      prefillCouponTax  = pos.coupon_tax != null ? pos.coupon_tax : 12.5;
    }
  }

  const isBondPrefill = prefillAssetType === 'bond';

  const body = `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Tipo titolo *</label>
        <div class="theme-toggle-group" style="width:100%">
          <button type="button" id="b_type_equity" class="btn theme-btn ${!isBondPrefill?'theme-btn-active':''}" onclick="_setBuyType('equity')" ${prefillTicker?'disabled':''}>📈 Azionario</button>
          <button type="button" id="b_type_bond"   class="btn theme-btn ${isBondPrefill?'theme-btn-active':''}"  onclick="_setBuyType('bond')"   ${prefillTicker?'disabled':''}>📄 Obbligazionario</button>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Conto investimento *</label>
        <select class="form-control" id="b_inv_account">
          ${investAccounts.map(a=>`<option value="${a.id}" ${String(a.id)===String(prefillAccountId)?'selected':''}>${a.icon} ${a.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Ticker *</label>
        <input class="form-control" id="b_ticker" placeholder="Es. AAPL / IT0001234567" value="${prefillTicker}" style="text-transform:uppercase" ${prefillTicker?'readonly':''}>
      </div>
      <div class="form-group">
        <label class="form-label">Nome *</label>
        <input class="form-control" id="b_name" placeholder="Es. Apple Inc." value="${prefillName}" ${prefillName?'readonly':''}>
      </div>
    </div>
    <!-- Campi specifici obbligazione -->
    <div id="b_bond_fields" style="display:${isBondPrefill?'block':'none'}">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Data scadenza</label>
          <input type="date" class="form-control" id="b_maturity" value="${prefillMaturity}">
        </div>
        <div class="form-group">
          <label class="form-label">Tasso cedola (%/anno)</label>
          <input type="text" inputmode="decimal" class="form-control" id="b_coupon_rate" placeholder="Es. 4,5" value="${prefillCouponRate}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Frequenza cedola</label>
          <select class="form-control" id="b_coupon_freq">
            <option value="annual"     ${prefillCouponFreq==='annual'?'selected':''}>Annuale</option>
            <option value="semiannual" ${prefillCouponFreq==='semiannual'||!prefillCouponFreq?'selected':''}>Semestrale</option>
            <option value="quarterly"  ${prefillCouponFreq==='quarterly'?'selected':''}>Trimestrale</option>
            <option value="monthly"    ${prefillCouponFreq==='monthly'?'selected':''}>Mensile</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Tassazione cedola (%)</label>
          <input type="text" inputmode="decimal" class="form-control" id="b_coupon_tax"
                 value="${prefillCouponTax}" placeholder="12,5">
        </div>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Paga da *</label>
        <select class="form-control" id="b_from_account">
          <option value="">— Seleziona conto —</option>
          ${regularAccounts.map(a=>`<option value="${a.id}">${a.icon} ${a.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Data *</label>
        <input type="date" class="form-control" id="b_date" value="${today}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label" id="b_qty_label">Nominale (€) *</label>
        <input type="text" inputmode="decimal" class="form-control" id="b_qty" placeholder="Es. 10000">
      </div>
      <div class="form-group">
        <label class="form-label" id="b_price_label">Prezzo (€) *</label>
        <input type="text" inputmode="decimal" class="form-control" id="b_price" placeholder="Es. 0,13">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Commissioni (€)</label>
        <input type="text" inputmode="decimal" class="form-control" id="b_comm" placeholder="0">
      </div>
      <div class="form-group">
        <label class="form-label">Totale (incl. comm.)</label>
        <input type="text" class="form-control" id="b_total" readonly placeholder="—" style="background:var(--bg3)">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Note</label>
      <input class="form-control" id="b_notes" placeholder="Opzionale">
    </div>`;

  openModal('Acquisto Titolo', body, async () => {
    const assetType = document.getElementById('b_type_bond')?.classList.contains('theme-btn-active') ? 'bond' : 'equity';
    const isBond    = assetType === 'bond';
    const data = {
      account_id:      parseInt(document.getElementById('b_inv_account').value),
      from_account_id: parseInt(document.getElementById('b_from_account').value),
      ticker:          document.getElementById('b_ticker').value.trim().toUpperCase(),
      name:            document.getElementById('b_name').value.trim(),
      quantity:        parseFloat(document.getElementById('b_qty').value.replace(',','.')),
      price:           parseFloat(document.getElementById('b_price').value.replace(',','.')),
      date:            document.getElementById('b_date').value,
      notes:           document.getElementById('b_notes').value.trim() || null,
      commissions:     parseFloat((document.getElementById('b_comm')?.value||'').replace(',','.')) || 0,
      asset_type:      assetType,
      face_value:      1,
      maturity_date:   isBond ? (document.getElementById('b_maturity')?.value || null) : null,
      coupon_rate:     isBond ? (parseFloat((document.getElementById('b_coupon_rate')?.value||'').replace(',','.')) || 0) : 0,
      coupon_frequency:isBond ? (document.getElementById('b_coupon_freq')?.value || null) : null,
      coupon_tax:      isBond ? (parseFloat((document.getElementById('b_coupon_tax')?.value||'').replace(',','.')) ?? 12.5) : 0,
    };
    if (!data.account_id)      { toast('Seleziona il conto investimento','error'); return; }
    if (!data.from_account_id) { toast('Seleziona il conto da cui pagare','error'); return; }
    if (!data.ticker)          { toast('Inserisci il ticker','error'); return; }
    if (!data.name)            { toast('Inserisci il nome del titolo','error'); return; }
    if (!data.quantity || data.quantity <= 0) { toast('Inserisci una quantità valida','error'); return; }
    if (!data.price || data.price <= 0)       { toast('Inserisci un prezzo valido','error'); return; }
    try {
      await api.buyStock(data);
      closeModal();
      toast('Acquisto registrato');
      renderPortfolio();
    } catch(e) { toast(e.message,'error'); }
  });

  // Toggle bond fields
  window._setBuyType = (type) => {
    const isBond = type === 'bond';
    document.getElementById('b_type_equity')?.classList.toggle('theme-btn-active', !isBond);
    document.getElementById('b_type_bond')?.classList.toggle('theme-btn-active', isBond);
    const bondFields = document.getElementById('b_bond_fields');
    if (bondFields) bondFields.style.display = isBond ? 'block' : 'none';
    const qtyLabel   = document.getElementById('b_qty_label');
    const priceLabel = document.getElementById('b_price_label');
    if (qtyLabel)   qtyLabel.textContent   = isBond ? 'Nominale (€) *'       : 'Quantità *';
    if (priceLabel) priceLabel.textContent = isBond ? 'Prezzo regolamento (%) *' : 'Prezzo unitario (€) *';
    calcTotal();
  };

  // Live total calculation
  const calcTotal = () => {
    const q      = parseFloat((document.getElementById('b_qty')?.value||'').replace(',','.'))||0;
    const p      = parseFloat((document.getElementById('b_price')?.value||'').replace(',','.'))||0;
    const c      = parseFloat((document.getElementById('b_comm')?.value||'').replace(',','.'))  ||0;
    const isBond = document.getElementById('b_type_bond')?.classList.contains('theme-btn-active');
    const total  = (isBond ? q * p / 100 : q * p) + c;
    const t = document.getElementById('b_total');
    if (t) t.value = q && p ? fmt.currency(total) : '—';
  };
  setTimeout(() => {
    document.getElementById('b_qty')?.addEventListener('input', calcTotal);
    document.getElementById('b_price')?.addEventListener('input', calcTotal);
    document.getElementById('b_comm')?.addEventListener('input', calcTotal);
  }, 50);
}

async function showImportModal(investAccounts) {
  const body = `
    <div class="settings-hint" style="margin-bottom:14px">
      Carica una posizione già in tuo possesso senza creare movimenti bancari.
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Tipo titolo *</label>
        <div class="theme-toggle-group" style="width:100%">
          <button type="button" id="ip_type_equity" class="btn theme-btn theme-btn-active" onclick="_setImportType('equity')">📈 Azionario</button>
          <button type="button" id="ip_type_bond"   class="btn theme-btn"                  onclick="_setImportType('bond')">📄 Obbligazionario</button>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Conto investimento *</label>
        <select class="form-control" id="ip_account">
          ${investAccounts.map(a=>`<option value="${a.id}">${a.icon} ${a.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Ticker *</label>
        <input class="form-control" id="ip_ticker" placeholder="Es. ENI.MI / IT0001234567" style="text-transform:uppercase">
      </div>
      <div class="form-group">
        <label class="form-label">Nome titolo *</label>
        <input class="form-control" id="ip_name" placeholder="Es. Eni SpA">
      </div>
    </div>
    <!-- Campi specifici obbligazione -->
    <div id="ip_bond_fields" style="display:none">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Data scadenza</label>
          <input type="date" class="form-control" id="ip_maturity">
        </div>
        <div class="form-group">
          <label class="form-label">Tasso cedola (%/anno)</label>
          <input type="text" inputmode="decimal" class="form-control" id="ip_coupon_rate" placeholder="Es. 4,5">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Frequenza cedola</label>
          <select class="form-control" id="ip_coupon_freq">
            <option value="annual">Annuale</option>
            <option value="semiannual" selected>Semestrale</option>
            <option value="quarterly">Trimestrale</option>
            <option value="monthly">Mensile</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Tassazione cedola (%)</label>
          <input type="text" inputmode="decimal" class="form-control" id="ip_coupon_tax" value="12.5" placeholder="12,5">
        </div>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label" id="ip_qty_label">Quantità *</label>
        <input type="text" inputmode="decimal" class="form-control" id="ip_qty" placeholder="Es. 10">
      </div>
      <div class="form-group">
        <label class="form-label" id="ip_price_label">Prezzo pagato (€) *</label>
        <input type="text" inputmode="decimal" class="form-control" id="ip_price" placeholder="Es. 0,13">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Commissioni totali (€)</label>
        <input type="text" inputmode="decimal" class="form-control" id="ip_comm" placeholder="0">
      </div>
      <div class="form-group">
        <label class="form-label" id="ip_avg_label">Prezzo medio effettivo</label>
        <input type="text" class="form-control" id="ip_avg" style="background:var(--bg3)" readonly
               placeholder="Calcolato automaticamente">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label" id="ip_cur_label">Prezzo attuale (€)</label>
        <input type="text" inputmode="decimal" class="form-control" id="ip_cur" placeholder="Opzionale">
      </div>
      <div class="form-group">
        <label class="form-label">Note</label>
        <input class="form-control" id="ip_notes" placeholder="Opzionale">
      </div>
    </div>`;

  openModal('Carica posizione esistente', body, async () => {
    const isBond = document.getElementById('ip_type_bond')?.classList.contains('theme-btn-active');
    const qty    = parseFloat((document.getElementById('ip_qty').value||'').replace(',','.'));
    const price  = parseFloat((document.getElementById('ip_price').value||'').replace(',','.'));
    const comm   = parseFloat((document.getElementById('ip_comm').value||'').replace(',','.')) || 0;
    // Per bond: qty = nominale €, prezzo in %, comm in € → avg% = price + (comm/qty)*100
    // Per equity: avg = (qty*price + comm) / qty
    const avg    = qty && price ? (isBond ? price + (comm / qty) * 100 : (qty * price + comm) / qty) : NaN;
    const cur    = parseFloat((document.getElementById('ip_cur').value||'').replace(',','.')) || null;
    const data  = {
      account_id:       parseInt(document.getElementById('ip_account').value),
      ticker:           document.getElementById('ip_ticker').value.trim().toUpperCase(),
      name:             document.getElementById('ip_name').value.trim(),
      quantity:         qty,
      avg_price:        avg,
      current_price:    cur,
      notes:            document.getElementById('ip_notes').value.trim() || null,
      commissions:      comm,
      asset_type:       isBond ? 'bond' : 'equity',
      face_value:       1,
      maturity_date:    isBond ? (document.getElementById('ip_maturity')?.value || null) : null,
      coupon_rate:      isBond ? (parseFloat((document.getElementById('ip_coupon_rate')?.value||'').replace(',','.')) || 0) : 0,
      coupon_frequency: isBond ? (document.getElementById('ip_coupon_freq')?.value || null) : null,
      coupon_tax:       isBond ? (parseFloat((document.getElementById('ip_coupon_tax')?.value||'').replace(',','.')) ?? 12.5) : 0,
    };
    if (!data.ticker)              { toast('Inserisci il ticker','error'); return; }
    if (!data.name)                { toast('Inserisci il nome','error'); return; }
    if (!qty   || qty   <= 0)      { toast('Inserisci un nominale/quantità valido','error'); return; }
    if (!price || price <= 0)      { toast('Inserisci un prezzo valido','error'); return; }
    try {
      await api.importPosition(data);
      closeModal();
      toast('Posizione caricata');
      renderPortfolio();
    } catch(e) { toast(e.message,'error'); }
  });

  window._setImportType = (type) => {
    const isBond = type === 'bond';
    document.getElementById('ip_type_equity')?.classList.toggle('theme-btn-active', !isBond);
    document.getElementById('ip_type_bond')?.classList.toggle('theme-btn-active', isBond);
    const bondFields = document.getElementById('ip_bond_fields');
    if (bondFields) bondFields.style.display = isBond ? 'block' : 'none';
    const ql = document.getElementById('ip_qty_label');
    if (ql) ql.textContent = isBond ? 'Nominale (€) *' : 'Quantità *';
    const pl = document.getElementById('ip_price_label');
    if (pl) pl.textContent = isBond ? 'Prezzo di regolamento (%) *' : 'Prezzo pagato (€) *';
    const al = document.getElementById('ip_avg_label');
    if (al) al.textContent = isBond ? 'Prezzo medio effettivo (%)' : 'Prezzo medio effettivo (€)';
    const cl = document.getElementById('ip_cur_label');
    if (cl) cl.textContent = isBond ? 'Prezzo attuale (%)' : 'Prezzo attuale (€)';
    calcAvg();
  };

  // Calcola prezzo medio al cambio di qty/prezzo/commissioni
  const calcAvg = () => {
    const isBond = document.getElementById('ip_type_bond')?.classList.contains('theme-btn-active');
    const q  = parseFloat((document.getElementById('ip_qty')?.value||'').replace(',','.'))   || 0;
    const p  = parseFloat((document.getElementById('ip_price')?.value||'').replace(',','.')) || 0;
    const c  = parseFloat((document.getElementById('ip_comm')?.value||'').replace(',','.'))  || 0;
    const el = document.getElementById('ip_avg');
    if (!el) return;
    if (!q || !p) { el.value = ''; return; }
    if (isBond) {
      // avg% = prezzo% + (commissioni€ / nominale€) * 100
      el.value = (p + (c / q) * 100).toFixed(4) + ' %';
    } else {
      el.value = ((q * p + c) / q).toFixed(5) + ' €';
    }
  };
  setTimeout(() => {
    ['ip_qty','ip_price','ip_comm'].forEach(id =>
      document.getElementById(id)?.addEventListener('input', calcAvg));
  }, 50);
}

async function showSellModal(portfolioId) {
  const [items, accounts] = await Promise.all([api.getPortfolio(), api.getAccounts()]);
  const pos = items.find(i => i.id === portfolioId);
  if (!pos) return;
  const regularAccounts = accounts.filter(a => a.type !== 'investment' && !a.is_closed);
  const today = new Date().toISOString().split('T')[0];
  const isBond = pos.asset_type === 'bond';
  const avgDisplay = isBond ? `${(pos.avg_price||0).toFixed(2)} %` : fmt.currency(pos.avg_price);
  const qtyLabel   = isBond ? 'Nominale da vendere (€) *' : 'Quantità *';
  const priceLabel = isBond ? 'Prezzo di regolamento (%) *' : 'Prezzo vendita (€) *';
  const defaultSellPrice = pos.current_price || pos.avg_price;

  const body = `
    <div style="background:var(--bg3);border-radius:6px;padding:10px 14px;margin-bottom:16px;font-size:13px">
      <strong>${pos.ticker}</strong> — ${pos.name}
      ${isBond?`<span class="badge" style="background:#d29922;color:#fff;font-size:10px;padding:1px 5px;border-radius:4px;margin-left:6px">OBB</span>`:''}
      <br>${isBond?'Nominale disponibile':'Quantità disponibile'}: <strong>${isBond?fmt.currency(pos.quantity):pos.quantity}</strong> &nbsp;|&nbsp; Prezzo medio: <strong>${avgDisplay}</strong>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Accredita su *</label>
        <select class="form-control" id="s_to_account">
          <option value="">— Seleziona conto —</option>
          ${regularAccounts.map(a=>`<option value="${a.id}">${a.icon} ${a.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Data *</label>
        <input type="date" class="form-control" id="s_date" value="${today}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">${qtyLabel}</label>
        <input type="text" inputmode="decimal" class="form-control" id="s_qty" placeholder="Max ${isBond?fmt.currency(pos.quantity):pos.quantity}">
      </div>
      <div class="form-group">
        <label class="form-label">${priceLabel}</label>
        <input type="text" inputmode="decimal" class="form-control" id="s_price" value="${defaultSellPrice}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Totale incasso</label>
        <input type="text" class="form-control" id="s_total" readonly style="background:var(--bg3)">
      </div>
      <div class="form-group">
        <label class="form-label">P&L stimato</label>
        <input type="text" class="form-control" id="s_pnl" readonly style="background:var(--bg3)">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Note</label>
      <input class="form-control" id="s_notes" placeholder="Opzionale">
    </div>`;

  openModal('Vendita Titolo', body, async () => {
    const data = {
      portfolio_id:  portfolioId,
      to_account_id: parseInt(document.getElementById('s_to_account').value),
      quantity:      parseFloat((document.getElementById('s_qty').value||'').replace(',','.')),
      price:         parseFloat((document.getElementById('s_price').value||'').replace(',','.')),
      date:          document.getElementById('s_date').value,
      notes:         document.getElementById('s_notes').value.trim() || null,
    };
    if (!data.to_account_id)            { toast('Seleziona il conto di accredito','error'); return; }
    if (!data.quantity || data.quantity <= 0) { toast('Inserisci una quantità valida','error'); return; }
    if (data.quantity > pos.quantity)    { toast('Quantità superiore alla disponibile','error'); return; }
    if (!data.price || data.price <= 0)  { toast('Inserisci un prezzo valido','error'); return; }
    try {
      await api.sellStock(data);
      closeModal();
      toast('Vendita registrata');
      renderPortfolio();
    } catch(e) { toast(e.message,'error'); }
  });

  const calcSell = () => {
    const q = parseFloat((document.getElementById('s_qty')?.value||'').replace(',','.'))||0;
    const p = parseFloat((document.getElementById('s_price')?.value||'').replace(',','.'))||0;
    // Bond: q = nominale €, p = prezzo% → valore = q*p/100
    const totalVal = isBond ? q * p / 100 : q * p;
    const costVal  = isBond ? q * pos.avg_price / 100 : q * pos.avg_price;
    const pnl      = q && p ? totalVal - costVal : null;
    const totalEl  = document.getElementById('s_total');
    const pnlEl    = document.getElementById('s_pnl');
    if (totalEl) totalEl.value = q && p ? fmt.currency(totalVal) : '—';
    if (pnlEl) {
      pnlEl.value = pnl != null ? fmt.currency(pnl) : '—';
      pnlEl.style.color = pnl != null ? (pnl >= 0 ? 'var(--income)' : 'var(--expense)') : '';
    }
  };
  setTimeout(() => {
    document.getElementById('s_qty')?.addEventListener('input', calcSell);
    document.getElementById('s_price')?.addEventListener('input', calcSell);
    calcSell();
  }, 50);
}

async function showCouponModal(portfolioId) {
  const [items, accounts] = await Promise.all([api.getPortfolio(), api.getAccounts()]);
  const pos = items.find(i => i.id === portfolioId);
  if (!pos) return;
  const regularAccounts = accounts.filter(a => a.type !== 'investment' && !a.is_closed);
  const today = new Date().toISOString().split('T')[0];
  // quantity = nominale totale €, coupon_rate = % annuo
  const freqDivisor = { annual:1, semiannual:2, quarterly:4, monthly:12 };
  const freqLabel   = { annual:'annuale', semiannual:'semestrale', quarterly:'trimestrale', monthly:'mensile' };
  const div       = freqDivisor[pos.coupon_frequency] || 1;
  const taxRate   = pos.coupon_tax != null ? pos.coupon_tax : 12.5;
  // Cedola lorda = nominale × tasso% / 100 / divisore_frequenza
  const grossCoupon = pos.quantity * (pos.coupon_rate / 100) / div;
  const taxAmount   = grossCoupon * taxRate / 100;
  const netCoupon   = grossCoupon - taxAmount;

  const body = `
    <div style="background:var(--bg3);border-radius:6px;padding:10px 14px;margin-bottom:16px;font-size:13px">
      <strong>${pos.ticker}</strong> — ${pos.name}<br>
      Nominale: <strong>${fmt.currency(pos.quantity)}</strong> &nbsp;|&nbsp;
      Tasso: <strong>${pos.coupon_rate}%</strong> &nbsp;|&nbsp;
      Freq.: <strong>${freqLabel[pos.coupon_frequency]||'—'}</strong> &nbsp;|&nbsp;
      Tassazione: <strong>${taxRate}%</strong>
    </div>
    ${pos.coupon_rate ? `
    <div style="background:var(--bg3);border-radius:6px;padding:8px 14px;margin-bottom:14px;font-size:12px;display:flex;gap:24px">
      <div>Lordo: <strong>${fmt.currency(grossCoupon)}</strong></div>
      <div>Ritenuta (${taxRate}%): <strong style="color:var(--expense)">− ${fmt.currency(taxAmount)}</strong></div>
      <div>Netto: <strong style="color:var(--income)">${fmt.currency(netCoupon)}</strong></div>
    </div>` : ''}
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Accredita su *</label>
        <select class="form-control" id="c_account">
          <option value="">— Seleziona conto —</option>
          ${regularAccounts.map(a=>`<option value="${a.id}">${a.icon} ${a.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Data pagamento *</label>
        <input type="date" class="form-control" id="c_date" value="${today}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Importo lordo (€) *</label>
        <input type="text" inputmode="decimal" class="form-control" id="c_gross"
               value="${grossCoupon.toFixed(2)}" placeholder="${grossCoupon.toFixed(2)}">
      </div>
      <div class="form-group">
        <label class="form-label">Tassazione (%)</label>
        <input type="text" inputmode="decimal" class="form-control" id="c_tax_rate"
               value="${taxRate}" placeholder="12,5">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Ritenuta (€)</label>
        <input type="text" class="form-control" id="c_tax_amt" readonly style="background:var(--bg3)">
      </div>
      <div class="form-group">
        <label class="form-label">Importo netto accreditato (€)</label>
        <input type="text" class="form-control" id="c_net" readonly style="background:var(--bg3);font-weight:700;color:var(--income)">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Note</label>
      <input class="form-control" id="c_notes" placeholder="Es. Cedola semestrale">
    </div>`;

  openModal('Registra Cedola', body, async () => {
    const gross  = parseFloat((document.getElementById('c_gross').value||'').replace(',','.'));
    const taxPct = parseFloat((document.getElementById('c_tax_rate').value||'').replace(',','.')) || 0;
    const net    = gross * (1 - taxPct / 100);
    const data = {
      portfolio_id: portfolioId,
      account_id:   parseInt(document.getElementById('c_account').value),
      amount:       net,   // registriamo il netto come income
      date:         document.getElementById('c_date').value,
      notes:        document.getElementById('c_notes').value.trim() ||
                    `Cedola ${pos.ticker} — lordo ${fmt.currency(gross)}, ritenuta ${taxPct}%`,
    };
    if (!data.account_id)           { toast('Seleziona il conto di accredito','error'); return; }
    if (!gross || gross <= 0)        { toast('Inserisci un importo lordo valido','error'); return; }
    try {
      await api.registerCoupon(data);
      closeModal();
      toast(`Cedola registrata — netto ${fmt.currency(net)}`);
      renderPortfolio();
    } catch(e) { toast(e.message,'error'); }
  });

  // Calcolo live lordo/ritenuta/netto
  const calcCoupon = () => {
    const g  = parseFloat((document.getElementById('c_gross')?.value||'').replace(',','.')) || 0;
    const t  = parseFloat((document.getElementById('c_tax_rate')?.value||'').replace(',','.')) || 0;
    const ta = g * t / 100;
    const n  = g - ta;
    const taxEl = document.getElementById('c_tax_amt');
    const netEl = document.getElementById('c_net');
    if (taxEl) taxEl.value = g ? fmt.currency(ta) : '';
    if (netEl) netEl.value = g ? fmt.currency(n) : '';
  };
  setTimeout(() => {
    document.getElementById('c_gross')?.addEventListener('input', calcCoupon);
    document.getElementById('c_tax_rate')?.addEventListener('input', calcCoupon);
    calcCoupon();
  }, 50);
}

async function showPortfolioHistory(portfolioId) {
  const [txs, items] = await Promise.all([
    api.getPortfolioTransactions(portfolioId),
    api.getPortfolio()
  ]);
  const pos = items.find(i => i.id === portfolioId);
  const body = `
    <div style="font-weight:600;margin-bottom:12px">${pos?.ticker} — ${pos?.name}</div>
    <div class="table-wrap">
      <table style="font-size:12px"><thead><tr>
        <th>Data</th><th>Tipo</th><th>Quantità</th><th>Prezzo</th><th class="text-right">Totale</th>
      </tr></thead><tbody>
      ${txs.length ? txs.map(t=>{
        const isBuy    = t.type === 'buy';
        const isCoupon = t.type === 'coupon';
        const color    = isBuy ? 'var(--expense)' : 'var(--income)';
        const label    = isBuy ? 'Acquisto' : isCoupon ? 'Cedola' : 'Vendita';
        const sign     = isBuy ? '-' : '+';
        const total    = isCoupon ? t.price : t.quantity * t.price;
        return `<tr>
          <td>${t.date}</td>
          <td><span style="color:${color};font-weight:600">${label}</span></td>
          <td>${isCoupon ? '—' : t.quantity}</td>
          <td>${isCoupon ? '—' : fmt.currency(t.price)}</td>
          <td class="text-right" style="color:${color}">${sign} ${fmt.currency(total)}</td>
        </tr>`;
      }).join('') : '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--txt3)">Nessuna operazione</td></tr>'}
      </tbody></table>
    </div>`;
  openModal('Storico operazioni', body, null);
}

async function showEditPositionModal(portfolioId) {
  const [items, accounts] = await Promise.all([api.getPortfolio(), api.getAccounts()]);
  const pos = items.find(i => i.id === portfolioId);
  if (!pos) return;
  const investAccounts = accounts.filter(a => a.type === 'investment' && !a.is_closed);
  const isBond = pos.asset_type === 'bond';

  const body = `
    <div style="background:var(--bg3);border-radius:6px;padding:8px 14px;margin-bottom:14px;font-size:13px">
      Ticker: <strong>${pos.ticker}</strong> &nbsp;·&nbsp;
      <span class="badge" style="background:${isBond?'#d29922':'#58a6ff'};color:#fff;font-size:10px;padding:1px 5px;border-radius:4px">${isBond?'OBB':'AZI'}</span>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Nome *</label>
        <input class="form-control" id="e_name" value="${pos.name}">
      </div>
      <div class="form-group">
        <label class="form-label">Conto investimento *</label>
        <select class="form-control" id="e_account">
          ${investAccounts.map(a=>`<option value="${a.id}" ${a.id==pos.account_id?'selected':''}>${a.icon} ${a.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">${isBond?'Nominale (€)':'Quantità'} *</label>
        <input type="text" inputmode="decimal" class="form-control" id="e_qty" value="${pos.quantity}">
      </div>
      <div class="form-group">
        <label class="form-label">${isBond?'Prezzo medio (%)':'Prezzo medio (€)'} *</label>
        <input type="text" inputmode="decimal" class="form-control" id="e_avg" value="${pos.avg_price}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">${isBond?'Prezzo attuale (%)':'Prezzo attuale (€)'}</label>
        <input type="text" inputmode="decimal" class="form-control" id="e_cur" value="${pos.current_price||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Commissioni totali (€)</label>
        <input type="text" inputmode="decimal" class="form-control" id="e_comm" value="${pos.total_commissions||0}">
      </div>
    </div>
    ${isBond ? `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Data scadenza</label>
        <input type="date" class="form-control" id="e_maturity" value="${pos.maturity_date||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Tasso cedola (%/anno)</label>
        <input type="text" inputmode="decimal" class="form-control" id="e_coupon_rate" value="${pos.coupon_rate||''}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Frequenza cedola</label>
        <select class="form-control" id="e_coupon_freq">
          <option value="annual"     ${pos.coupon_frequency==='annual'?'selected':''}>Annuale</option>
          <option value="semiannual" ${pos.coupon_frequency==='semiannual'||!pos.coupon_frequency?'selected':''}>Semestrale</option>
          <option value="quarterly"  ${pos.coupon_frequency==='quarterly'?'selected':''}>Trimestrale</option>
          <option value="monthly"    ${pos.coupon_frequency==='monthly'?'selected':''}>Mensile</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Tassazione cedola (%)</label>
        <input type="text" inputmode="decimal" class="form-control" id="e_coupon_tax" value="${pos.coupon_tax??12.5}">
      </div>
    </div>` : ''}
    <div class="form-group">
      <label class="form-label">Note</label>
      <input class="form-control" id="e_notes" value="${pos.notes||''}" placeholder="Opzionale">
    </div>`;

  openModal('Modifica Posizione', body, async () => {
    const n = (id, fallback='') => (document.getElementById(id)?.value||'').replace(',','.') || fallback;
    const data = {
      id:               portfolioId,
      name:             document.getElementById('e_name').value.trim(),
      account_id:       parseInt(document.getElementById('e_account').value),
      quantity:         parseFloat(n('e_qty')),
      avg_price:        parseFloat(n('e_avg')),
      current_price:    parseFloat(n('e_cur')) || null,
      total_commissions:parseFloat(n('e_comm')) || 0,
      asset_type:       pos.asset_type,
      maturity_date:    isBond ? (document.getElementById('e_maturity')?.value || null) : null,
      coupon_rate:      isBond ? (parseFloat(n('e_coupon_rate')) || 0) : 0,
      coupon_frequency: isBond ? (document.getElementById('e_coupon_freq')?.value || null) : null,
      coupon_tax:       isBond ? (parseFloat(n('e_coupon_tax')) ?? 12.5) : 0,
      notes:            document.getElementById('e_notes').value.trim() || null,
    };
    if (!data.name)                         { toast('Inserisci il nome','error'); return; }
    if (!data.quantity || data.quantity<=0) { toast('Inserisci una quantità valida','error'); return; }
    if (isNaN(data.avg_price))              { toast('Inserisci un prezzo medio valido','error'); return; }
    try {
      await api.updatePortfolioItem(data);
      closeModal();
      toast('Posizione aggiornata');
      renderPortfolio();
    } catch(e) { toast(e.message,'error'); }
  });
}
window.showEditPositionModal = showEditPositionModal;

// ── Portfolio context menu ──────────────────────────────────────────────────

function nextCouponDate(maturityDateStr, frequency) {
  const mat = new Date(maturityDateStr + 'T00:00:00');
  const day = mat.getDate();
  const matMonth = mat.getMonth() + 1; // 1-12
  const today = new Date(); today.setHours(0,0,0,0);
  const intervalMonths = { annual:12, semiannual:6, quarterly:3, monthly:1 }[frequency] || 12;

  const candidates = [];
  for (let year = today.getFullYear(); year <= today.getFullYear() + 2; year++) {
    for (let month = 1; month <= 12; month++) {
      const diff = ((month - matMonth) % 12 + 12) % 12;
      if (diff % intervalMonths === 0) {
        const d = new Date(year, month - 1, day);
        if (d <= mat && d >= today) candidates.push(d);
      }
    }
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => a - b);
  return candidates[0].toISOString().split('T')[0];
}

function closePortfolioContextMenu() {
  document.getElementById('portfolio-ctx-menu')?.remove();
  document.removeEventListener('click', closePortfolioContextMenu);
  document.removeEventListener('contextmenu', closePortfolioContextMenu);
}

window._showPortfolioCtx = (portfolioId, evt) => {
  evt.preventDefault();
  closePortfolioContextMenu();

  const menu = document.createElement('div');
  menu.id = 'portfolio-ctx-menu';
  menu.style.cssText = `position:fixed;z-index:9999;background:var(--bg2);border:1px solid var(--border);
    border-radius:8px;padding:4px 0;min-width:220px;box-shadow:0 4px 16px rgba(0,0,0,.3);
    left:${Math.min(evt.clientX, window.innerWidth-240)}px;top:${Math.min(evt.clientY, window.innerHeight-80)}px`;

  const addCouponItem = document.createElement('div');
  addCouponItem.style.cssText = 'padding:8px 14px;cursor:pointer;font-size:13px;display:flex;align-items:center;gap:8px';
  addCouponItem.innerHTML = '📅 Aggiungi cedola a pianificate';
  addCouponItem.onmouseenter = () => addCouponItem.style.background = 'var(--bg3)';
  addCouponItem.onmouseleave = () => addCouponItem.style.background = '';
  addCouponItem.onclick = () => { closePortfolioContextMenu(); showAddCouponToScheduled(portfolioId); };

  menu.appendChild(addCouponItem);
  document.body.appendChild(menu);
  setTimeout(() => {
    document.addEventListener('click', closePortfolioContextMenu, { once: true });
    document.addEventListener('contextmenu', closePortfolioContextMenu, { once: true });
  }, 0);
};

async function showAddCouponToScheduled(portfolioId) {
  const [items, accounts, categories] = await Promise.all([
    api.getPortfolio(), api.getAccounts(), api.getCategories()
  ]);
  const pos = items.find(i => i.id === portfolioId);
  if (!pos) return;

  if (!pos.coupon_rate || !pos.maturity_date) {
    toast('Questo titolo non ha cedola o scadenza configurata', 'error'); return;
  }

  // Mappa frequenza bond → frequenza pianificate
  const freqMap = { annual:'yearly', semiannual:'semiannual', quarterly:'quarterly', monthly:'monthly' };
  const schedFreq = freqMap[pos.coupon_frequency] || 'yearly';

  const regularAccounts  = accounts.filter(a => a.type !== 'investment' && !a.is_closed);
  const incomeCategories = categories.filter(c => c.type === 'income');
  const freqDivisor = { annual:1, semiannual:2, quarterly:4, monthly:12 };
  const div     = freqDivisor[pos.coupon_frequency] || 1;
  const taxRate = pos.coupon_tax ?? 12.5;
  const grossAmt = pos.quantity * (pos.coupon_rate / 100) / div;
  const netAmt   = grossAmt * (1 - taxRate / 100);
  const nextDate = nextCouponDate(pos.maturity_date, pos.coupon_frequency);

  if (!nextDate) {
    toast('Nessuna data cedola futura trovata (titolo già scaduto?)', 'error'); return;
  }

  const body = `
    <div style="background:var(--bg3);border-radius:6px;padding:8px 14px;margin-bottom:14px;font-size:13px">
      <strong>${pos.ticker}</strong> — ${pos.name}<br>
      Tasso ${pos.coupon_rate}% · tax ${taxRate}% · ${FREQ_LABELS[schedFreq]||schedFreq}<br>
      <span style="color:var(--txt3);font-size:11px">Lordo ${fmt.currency(grossAmt)} → Netto <strong style="color:var(--income)">${fmt.currency(netAmt)}</strong> per periodo</span>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Prima data pagamento *</label>
        <input type="date" class="form-control" id="cs_start" value="${nextDate}">
      </div>
      <div class="form-group">
        <label class="form-label">Ultima data (scadenza) *</label>
        <input type="date" class="form-control" id="cs_end" value="${pos.maturity_date}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Importo netto (€) *</label>
        <input type="text" inputmode="decimal" class="form-control" id="cs_amount" value="${netAmt.toFixed(2)}">
      </div>
      <div class="form-group">
        <label class="form-label">Frequenza *</label>
        <select class="form-control" id="cs_freq">
          ${Object.entries(FREQ_LABELS).map(([v,l])=>`<option value="${v}" ${v===schedFreq?'selected':''}>${l}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Accredita su *</label>
        <select class="form-control" id="cs_account">
          <option value="">— Seleziona conto —</option>
          ${regularAccounts.map(a=>`<option value="${a.id}">${a.icon} ${a.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Categoria</label>
        <select class="form-control" id="cs_cat">
          <option value="">— Nessuna —</option>
          ${incomeCategories.map(c=>`<option value="${c.id}">${c.icon||''} ${c.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Descrizione</label>
      <input class="form-control" id="cs_desc" value="Cedola ${pos.ticker}">
    </div>`;

  openModal('Aggiungi cedola a Pianificate', body, async () => {
    const amount    = parseFloat((document.getElementById('cs_amount').value||'').replace(',','.'));
    const accountId = parseInt(document.getElementById('cs_account').value);
    const startDate = document.getElementById('cs_start').value;
    const endDate   = document.getElementById('cs_end').value;
    const catId     = parseInt(document.getElementById('cs_cat').value) || null;
    if (!accountId)           { toast('Seleziona il conto','error'); return; }
    if (!amount || amount<=0) { toast('Importo non valido','error'); return; }
    if (!startDate)           { toast('Data inizio mancante','error'); return; }
    const data = {
      description:   document.getElementById('cs_desc').value.trim() || `Cedola ${pos.ticker}`,
      amount,
      type:          'income',
      category_id:   catId,
      account_id:    accountId,
      to_account_id: null,
      frequency:     document.getElementById('cs_freq').value,
      start_date:    startDate,
      end_date:      endDate || null,
      is_active:     1,
      color:         null,
      reconciled:    1,
    };
    try {
      await api.addScheduled(data);
      closeModal();
      toast(`Cedola ${pos.ticker} aggiunta alle pianificate`);
    } catch(e) { toast(e.message,'error'); }
  });
}
window.showAddCouponToScheduled = showAddCouponToScheduled;

window._setPortfolioFilter = async (activeOnly) => {
  _portfolioActiveOnly = activeOnly;
  await api.setSetting('portfolio.active_only', activeOnly ? '1' : '0');
  renderPortfolio();
};
window._portfolioSortBy = col => {
  if (_portfolioSort.col === col) _portfolioSort.dir *= -1;
  else _portfolioSort = { col, dir: 1 };
  renderPortfolio();
};
window.showBuyModal         = showBuyModal;
window.showSellModal        = showSellModal;
window.showCouponModal      = showCouponModal;
window.showPortfolioHistory = showPortfolioHistory;
window.updateStockPrice = async (id, val) => {
  const normalized = String(val).trim().replace(',', '.');
  const price = parseFloat(normalized);
  if (isNaN(price) || price < 0) return;
  try {
    await api.updateStockPrice(id, price);
    await renderPortfolio();
  }
  catch(e) { toast(e.message,'error'); }
};
window.deleteStock = async id => {
  const ok = await confirm('Elimina posizione', 'Eliminare questa posizione dal portafoglio? Le transazioni collegate resteranno.');
  if (!ok) return;
  await api.deletePortfolioItem(id);
  toast('Posizione eliminata');
  renderPortfolio();
};

/* ═══════════════════════════════════════════════════════════════════════════
   RESOCONTI
═══════════════════════════════════════════════════════════════════════════ */
/* ─── Analytics ──────────────────────────────────────────────────────────── */

let _analyticsMonths = 12;

async function renderAnalytics() {
  const pg = document.getElementById('pg-analytics');
  pg.innerHTML = `
    <div style="padding:16px 24px 0;display:flex;flex-direction:column;height:100%;overflow:hidden;box-sizing:border-box">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;flex-shrink:0">
        <div style="display:flex;gap:6px">
          <button class="sched-tab active" data-atab="catmonth" onclick="_setAnalyticsTab('catmonth',this)">Categorie / Mese</button>
          <button class="sched-tab" data-atab="balance" onclick="_setAnalyticsTab('balance',this)">Bilancio Mensile</button>
        </div>
        <div style="margin-left:auto;display:flex;gap:10px;align-items:center">
          <label style="font-size:13px;color:var(--text2)">Periodo:</label>
          <input type="range" id="analyticsPeriod" min="2" max="24" value="${_analyticsMonths}"
            style="width:120px;accent-color:var(--accent)">
          <span id="analyticsPeriodLabel" style="font-size:13px;min-width:60px">${_analyticsMonths} mesi</span>
        </div>
      </div>
      <div id="analyticsContent" style="flex:1;overflow:auto;padding-bottom:16px"></div>
    </div>`;
  const slider = document.getElementById('analyticsPeriod');
  slider.oninput = () => {
    _analyticsMonths = parseInt(slider.value);
    document.getElementById('analyticsPeriodLabel').textContent = _analyticsMonths + ' mesi';
  };
  slider.onchange = () => {
    _analyticsMonths = parseInt(slider.value);
    api.setSetting('analytics.months', String(_analyticsMonths));
    renderAnalyticsCatMonth();
  };
  renderAnalyticsCatMonth();
}

let _analyticsTab = 'catmonth';
window._setAnalyticsTab = (tab, btn) => {
  _analyticsTab = tab;
  document.querySelectorAll('[data-atab]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (tab === 'catmonth') renderAnalyticsCatMonth();
  if (tab === 'balance')  renderAnalyticsBalance();
};

async function renderAnalyticsCatMonth() {
  const el = document.getElementById('analyticsContent');
  if (!el) return;
  el.innerHTML = '<p style="padding:20px;color:var(--text2)">Caricamento…</p>';

  const months = _analyticsMonths;

  const rows = await api.getCategoryMonthTable(months);

  // Build month columns (oldest → newest)
  const now = new Date();
  const monthCols = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthCols.push({
      ym:    `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,
      label: d.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' })
    });
  }

  // Group rows by category
  const catMap = {};
  for (const r of rows) {
    if (!catMap[r.id]) catMap[r.id] = { id: r.id, name: r.name, type: r.type, color: r.color, icon: r.icon, m: {} };
    catMap[r.id].m[r.ym] = r.total;
  }

  const catTotal = c => monthCols.reduce((s, m) => s + (c.m[m.ym] || 0), 0);

  const expenses = Object.values(catMap).filter(c => c.type === 'expense').sort((a, b) => catTotal(b) - catTotal(a));
  const incomes  = Object.values(catMap).filter(c => c.type === 'income' ).sort((a, b) => catTotal(b) - catTotal(a));

  const renderSection = (cats, label) => {
    if (!cats.length) return '';
    let html = `<tr class="analytics-section-header"><td colspan="${monthCols.length + 3}">${label}</td></tr>`;
    for (const c of cats) {
      const total = catTotal(c);
      const avg = total / monthCols.length;
      html += `<tr>
        <td class="analytics-cat-name"><span style="color:${c.color}">${c.icon}</span> ${c.name}</td>
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
      <td class="text-right">${fmt.currency(grand)}</td>
      <td class="text-right">${fmt.currency(monthCols.length ? grand / monthCols.length : 0)}</td>
    </tr>`;
    return html;
  };

  el.innerHTML = `
    <table class="analytics-table">
      <thead><tr>
        <th>Categoria</th>
        ${monthCols.map(m => `<th class="text-right">${m.label}</th>`).join('')}
        <th class="text-right">Totale</th>
        <th class="text-right">Media/mese</th>
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

  const rows = await api.getMonthlyBalance(_analyticsMonths);

  // Build full month grid
  const now = new Date();
  const monthCols = [];
  for (let i = _analyticsMonths - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    monthCols.push({ ym, label: d.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' }) });
  }

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
    <div style="height:260px;margin-bottom:20px"><canvas id="balanceChart"></canvas></div>
    <table class="analytics-table">
      <thead><tr>
        <th>Mese</th><th class="text-right">Entrate</th><th class="text-right">Uscite</th>
        <th class="text-right">Saldo</th><th class="text-right">Cumulativo</th>
      </tr></thead>
      <tbody>
        ${monthCols.map((m, i) => {
          const bal = balances[i], cum = cumuls[i];
          const balCol = bal >= 0 ? 'var(--green)' : 'var(--red)';
          const cumCol = cum >= 0 ? 'var(--green)' : 'var(--red)';
          return `<tr>
            <td>${m.label}</td>
            <td class="text-right" style="color:var(--green)">${incomes[i]  ? fmt.currency(incomes[i])  : '—'}</td>
            <td class="text-right" style="color:var(--red)">${expenses[i]  ? fmt.currency(expenses[i]) : '—'}</td>
            <td class="text-right" style="color:${balCol};font-weight:600">${fmt.currency(bal)}</td>
            <td class="text-right" style="color:${cumCol}">${fmt.currency(cum)}</td>
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
          borderColor:'#bc8cff', backgroundColor:'transparent',
          pointRadius:3, tension:.3, borderWidth:2, borderDash:[4,3], order:1 },
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      interaction:{ mode:'index', intersect:false },
      plugins:{
        tooltip:{ callbacks:{ label: ctx => ` ${ctx.dataset.label}: ${fmt.currency(ctx.parsed.y)}` } },
        legend:{ labels:{ color:cc.tick, boxWidth:12 } }
      },
      scales:{
        x:{ ticks:{color:cc.tick}, grid:{color:cc.grid} },
        y:{ ticks:{color:cc.tick, callback:v=>fmt.currency(v)}, grid:{color:cc.grid} }
      }
    }
  });
}

async function renderReports() {
  const pg = document.getElementById('pg-reports');
  pg.innerHTML = `
    <div class="page-header">
      <h2 class="page-title">Resoconti</h2>
      <div style="display:flex;align-items:center;gap:8px">
        <span id="rCurrentLabel" style="font-size:12px;color:var(--txt3)"></span>
        <button class="btn btn-primary" onclick="showReportModal()">＋ Nuovo resoconto</button>
      </div>
    </div>
    <div id="rResults"></div>`;

  if (_currentReportId !== null) {
    const reports = await api.getReports();
    const r = reports.find(x => x.id === _currentReportId);
    if (r) { _loadReportConfig(r); _updateReportHeader(r); return; }
  }
  if (Object.keys(_reportFilters||{}).length || _reportGroupby !== 'none' || _reportChartType !== 'none') {
    runReport();
  }
}

function _updateReportHeader(r) {
  const lbl = document.getElementById('rCurrentLabel');
  if (!lbl) return;
  lbl.innerHTML = r
    ? `📋 ${r.name} <button class="btn btn-ghost btn-icon" style="font-size:11px;padding:1px 5px" onclick="showReportModal(${r.id})" title="Modifica">✏️</button>`
    : '';
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
  if (f.date_from)   filters.date_from   = f.date_from;
  if (f.date_to)     filters.date_to     = f.date_to;
  if (f.account_id)  filters.account_id  = f.account_id;
  if (f.type)        filters.type        = f.type;
  if (f.category_id) filters.category_id = f.category_id;
  if (f.search)      filters.search      = f.search;

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
  const [accounts, categories, tags, reports] = await Promise.all([
    api.getAccounts(), api.getCategories(), api.getTags(), api.getReports(),
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
  const bodyHtml = `
    <div class="form-group">
      <label class="form-label">Nome del resoconto <span style="color:var(--txt3);font-weight:400">(facoltativo — compila per salvare)</span></label>
      <input type="text" class="form-control" id="rmName" value="${initName.replace(/"/g,'&quot;')}" placeholder="es. Spese famiglia 2026" autocomplete="off">
      ${r ? `<div style="font-size:11px;color:var(--txt3);margin-top:3px">Mantieni il nome per aggiornare, cambialo per salvarne una copia.</div>` : ''}
    </div>
    <hr style="border:none;border-top:1px solid var(--border);margin:8px 0 12px">
    <div class="report-modal-grid">
      <div class="form-group">
        <label class="form-label">Periodo rapido</label>
        <select class="form-control" id="rmDatePreset" onchange="rmApplyDatePreset(this.value)">
          <option value="">Personalizzato</option>
          <option value="thisMonth">Mese corrente</option>
          <option value="lastMonth">Mese scorso</option>
          <option value="thisYear">Anno corrente</option>
          <option value="lastYear">Anno scorso</option>
          <option value="last30">Ultimi 30 giorni</option>
          <option value="last90">Ultimi 90 giorni</option>
        </select>
      </div>
      <div></div>
      <div class="form-group">
        <label class="form-label">Dal</label>
        <input type="date" class="form-control" id="rmDateFrom" value="${f.date_from||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Al</label>
        <input type="date" class="form-control" id="rmDateTo" value="${f.date_to||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Conto</label>
        <select class="form-control" id="rmAccount">
          <option value="">Tutti i conti</option>
          ${accounts.filter(a=>!a.is_closed).map(a=>`<option value="${a.id}"${sel(f.account_id,a.id)}>${a.icon} ${a.name}</option>`).join('')}
        </select>
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
        ${tags.map(t=>`<span class="tag-chip${(f.tag_ids||[]).includes(t.id)?' selected':''}" style="--tc:${t.color}" data-tag-id="${t.id}" onclick="this.classList.toggle('selected')">${t.name}</span>`).join('')}
      </div>
    </div>` : ''}`;

  openModal(
    r ? `✏️ Modifica: ${r.name}` : '📊 Nuovo resoconto',
    bodyHtml,
    async () => {
      const name      = document.getElementById('rmName')?.value.trim() || '';
      const dateFrom  = document.getElementById('rmDateFrom')?.value  || '';
      const dateTo    = document.getElementById('rmDateTo')?.value    || '';
      const accountId = document.getElementById('rmAccount')?.value   || '';
      const type      = document.getElementById('rmType')?.value      || '';
      const reconc    = document.getElementById('rmReconciled')?.value;
      const catId     = document.getElementById('rmCategory')?.value  || '';
      const search    = document.getElementById('rmSearch')?.value    || '';
      const amtOp     = document.getElementById('rmAmtOp')?.value     || '';
      const amtVal    = parseFloat(document.getElementById('rmAmtVal')?.value);
      const groupby   = document.getElementById('rmGroupby')?.value   || 'none';
      const chartType = document.getElementById('rmChartType')?.value || 'none';
      const tagIds    = [...document.querySelectorAll('#rmTagsSelector .tag-chip.selected')]
                          .map(el => parseInt(el.dataset.tagId));

      const filters = {};
      if (dateFrom)  filters.date_from   = dateFrom;
      if (dateTo)    filters.date_to     = dateTo;
      if (accountId) filters.account_id  = parseInt(accountId);
      if (type)      filters.type        = type;
      if (catId)     filters.category_id = parseInt(catId);
      if (search)    filters.search      = search;

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

function rmApplyDatePreset(preset) {
  const t = new Date(), y = t.getFullYear(), m = t.getMonth();
  const iso = d => d.toISOString().slice(0,10);
  let from = '', to = '';
  if      (preset==='thisMonth') { from=iso(new Date(y,m,1));    to=iso(new Date(y,m+1,0)); }
  else if (preset==='lastMonth') { from=iso(new Date(y,m-1,1));  to=iso(new Date(y,m,0));   }
  else if (preset==='thisYear')  { from=`${y}-01-01`;             to=`${y}-12-31`;           }
  else if (preset==='lastYear')  { from=`${y-1}-01-01`;           to=`${y-1}-12-31`;         }
  else if (preset==='last30')    { from=iso(new Date(t-30*864e5));to=iso(t);                 }
  else if (preset==='last90')    { from=iso(new Date(t-90*864e5));to=iso(t);                 }
  const df = document.getElementById('rmDateFrom'), dt = document.getElementById('rmDateTo');
  if (df) df.value = from; if (dt) dt.value = to;
}

function renderReportResults(txs, groupby, chartType) {
  if (_reportChart) { _reportChart.destroy(); _reportChart = null; }
  const el = document.getElementById('rResults');
  if (!el) return;
  if (!txs.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><p>Nessuna transazione trovata.</p></div>`;
    return;
  }

  let tableHtml = '', chartData = null;
  const cc = chartColors();

  if (groupby === 'month') {
    const byM = {};
    txs.forEach(t => {
      const k = t.date.slice(0,7);
      if (!byM[k]) byM[k] = {income:0,expense:0,count:0};
      byM[k].count++;
      if (t.type==='income')  byM[k].income  += t.amount;
      if (t.type==='expense') byM[k].expense += t.amount;
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
      const k = t.category_id || 0;
      if (!byC[k]) byC[k]={name:t.category_name||'(nessuna)',icon:t.category_icon||'📁',color:t.category_color||'var(--txt3)',total:0,count:0};
      byC[k].count++;
      if (t.type==='income')  byC[k].total += t.amount;
      if (t.type==='expense') byC[k].total -= t.amount;
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
      if (!byA[k]) byA[k]={name:t.account_name||'—',color:t.account_color||'var(--accent)',income:0,expense:0,count:0};
      byA[k].count++;
      if (t.type==='income')  byA[k].income  += t.amount;
      if (t.type==='expense') byA[k].expense += t.amount;
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
    tableHtml = `<table><thead><tr>
      <th>Data</th><th>Descrizione</th><th>Categoria</th><th>Conto</th>
      <th class="text-right">Importo</th><th>Tipo</th></tr></thead><tbody>
      ${txs.map(t=>`<tr>
        <td>${fmt.date(t.date)}</td>
        <td class="td-main">${t.description||'—'}</td>
        <td>${t.category_icon||''} ${t.category_name||'—'}</td>
        <td>${t.account_name||'—'}</td>
        <td class="text-right amount-${t.type}">${t.type==='expense'?'-':''}${fmt.currency(t.amount)}</td>
        <td><span class="badge badge-${t.type}">${t.type==='income'?'Entrata':t.type==='expense'?'Uscita':'Trasf.'}</span></td>
        </tr>`).join('')}
      </tbody></table>`;
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
        plugins: { legend: { labels: { color: cc.tick } } },
        scales: (chartData.type!=='doughnut'&&chartData.type!=='pie') ? {
          x: { ticks:{color:cc.tick}, grid:{color:cc.grid} },
          y: { ticks:{color:cc.tick}, grid:{color:cc.grid} }
        } : undefined
      }
    });
  }
}

function _fmtMonth(yyyyMM) {
  const [y,m] = yyyyMM.split('-');
  return new Date(parseInt(y), parseInt(m)-1, 1)
    .toLocaleString('it-IT', {month:'long', year:'numeric'});
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

/* ═══════════════════════════════════════════════════════════════════════════
   IMPOSTAZIONI
═══════════════════════════════════════════════════════════════════════════ */
async function renderSettings() {
  const s = await api.getSettings();
  const pg = document.getElementById('pg-settings');

  const tabs = [
    { id: 'data',        label: '🗄️ Dati'         },
    { id: 'prefs',       label: '🎨 Preferenze'    },
    { id: 'maintenance', label: '🔧 Manutenzione'  },
    { id: 'info',        label: 'ℹ️ Informazioni'  },
  ];

  const tabContent = {
    data: `
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
              <button class="btn btn-secondary" onclick="settingsChooseDb('open')">📂 Apri esistente</button>
              <button class="btn btn-ghost" onclick="settingsChooseDb('save')">➕ Crea nuovo</button>
            </div>
            <p class="settings-hint" id="dbHint"></p>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">💾 Backup automatico</div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Backup all'uscita</strong>
            <span class="settings-hint">Crea un backup del database ad ogni chiusura dell'app</span>
          </div>
          <div class="settings-control">
            <div class="theme-toggle-group">
              <button class="btn theme-btn ${s['backup.enabled']==='1'?'theme-btn-active':''}"
                      onclick="settingsSetBackup('enabled','1')">Attivo</button>
              <button class="btn theme-btn ${s['backup.enabled']!=='1'?'theme-btn-active':''}"
                      onclick="settingsSetBackup('enabled','0')">Disattivo</button>
            </div>
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Cartella backup</strong>
            <span class="settings-hint">Dove salvare i file .db.bak</span>
          </div>
          <div class="settings-control">
            <div class="settings-path-row">
              <input id="backupDirInput" class="form-input settings-path-input"
                     type="text" readonly value="${s['backup.dir'] ?? ''}">
              <button class="btn btn-secondary" onclick="settingsChooseBackupDir()">📂 Scegli</button>
            </div>
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Backup da conservare</strong>
            <span class="settings-hint">Numero massimo di backup (i più vecchi vengono eliminati)</span>
          </div>
          <div class="settings-control">
            <input type="number" class="form-control" style="width:80px" min="1" max="999"
                   value="${s['backup.max']||'10'}"
                   onchange="settingsSetBackup('max', this.value)">
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Backup manuale</strong>
            <span class="settings-hint">Esegui subito un backup</span>
          </div>
          <div class="settings-control">
            <button class="btn btn-secondary" onclick="settingsDoBackup()">💾 Esegui backup ora</button>
            <span class="settings-hint" id="backupHint" style="margin-left:10px"></span>
          </div>
        </div>
      </div>`,

    prefs: `
      <div class="settings-section">
        <div class="settings-section-title">🎨 Tema</div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Modalità colore</strong>
            <span class="settings-hint">Scegli tra tema scuro e chiaro</span>
          </div>
          <div class="settings-control">
            <div class="theme-toggle-group">
              <button class="btn theme-btn ${(s['appearance.theme']||'dark')==='dark'?'theme-btn-active':''}"
                      onclick="settingsSetTheme('dark')">🌙 Scuro</button>
              <button class="btn theme-btn ${(s['appearance.theme']||'dark')==='light'?'theme-btn-active':''}"
                      onclick="settingsSetTheme('light')">☀️ Chiaro</button>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">🏦 Conti</div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Visualizzazione conti</strong>
            <span class="settings-hint">Filtra i conti mostrati nelle liste e nella dashboard</span>
          </div>
          <div class="settings-control">
            <div class="theme-toggle-group">
              <button class="btn theme-btn ${!_accFavoritesOnly?'theme-btn-active':''}"
                      onclick="settingsSetAccFilter(false)">Tutti i conti</button>
              <button class="btn theme-btn ${_accFavoritesOnly?'theme-btn-active':''}"
                      onclick="settingsSetAccFilter(true)">Solo preferiti</button>
            </div>
          </div>
        </div>
      </div>`,

    maintenance: `
      <div class="settings-section">
        <div class="settings-section-title">📊 Stato database</div>
        <div id="dbInfoPanel" class="maint-info-grid">
          <span class="settings-hint">Caricamento...</span>
        </div>
        <div class="settings-row" style="margin-top:10px">
          <div class="settings-label"></div>
          <div class="settings-control">
            <button class="btn btn-secondary" onclick="maintLoadInfo()">🔄 Aggiorna</button>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">🔧 Operazioni</div>

        <div class="settings-row">
          <div class="settings-label">
            <strong>Compatta database</strong>
            <span class="settings-hint">VACUUM: ricostruisce il file eliminando spazio inutilizzato. Può richiedere qualche secondo.</span>
          </div>
          <div class="settings-control maint-op-control">
            <button class="btn btn-secondary" id="btnVacuum" onclick="maintVacuum()">🗜️ Compatta</button>
            <span class="settings-hint maint-result" id="vacuumResult"></span>
          </div>
        </div>

        <div class="settings-row">
          <div class="settings-label">
            <strong>Verifica integrità</strong>
            <span class="settings-hint">Controlla che il file non sia corrotto (PRAGMA integrity_check).</span>
          </div>
          <div class="settings-control maint-op-control">
            <button class="btn btn-secondary" id="btnIntegrity" onclick="maintIntegrity()">🔍 Verifica</button>
            <span class="settings-hint maint-result" id="integrityResult"></span>
          </div>
        </div>

        <div class="settings-row">
          <div class="settings-label">
            <strong>Ricostruisci indici</strong>
            <span class="settings-hint">REINDEX + ottimizza le statistiche del query planner. Utile dopo import massivi di dati.</span>
          </div>
          <div class="settings-control maint-op-control">
            <button class="btn btn-secondary" id="btnReindex" onclick="maintReindex()">⚡ Ricostruisci</button>
            <span class="settings-hint maint-result" id="reindexResult"></span>
          </div>
        </div>

        <div class="settings-row">
          <div class="settings-label">
            <strong>Flush WAL</strong>
            <span class="settings-hint">Incorpora il file di log (WAL) nel database principale, riducendo le dimensioni su disco.</span>
          </div>
          <div class="settings-control maint-op-control">
            <button class="btn btn-secondary" id="btnWal" onclick="maintWal()">💾 Flush WAL</button>
            <span class="settings-hint maint-result" id="walResult"></span>
          </div>
        </div>

        <div class="settings-row">
          <div class="settings-label">
            <strong>Reinstalla Chromium</strong>
            <span class="settings-hint">Elimina la cartella JCEF e chiude l'app. Al riavvio Chromium verrà riscaricato (~200MB).</span>
          </div>
          <div class="settings-control maint-op-control">
            <button class="btn btn-danger" onclick="if(confirm('Eliminare Chromium e chiudere l\\'app?')) api.resetJcef()">🗑️ Reset Chromium</button>
          </div>
        </div>
      </div>`,

    info: `
      <div class="settings-section">
        <div class="settings-section-title">ℹ️ Informazioni</div>
        <div class="settings-info-grid">
          <span class="settings-info-label">Versione app</span>
          <span class="settings-info-value">1.0.0</span>
          <span class="settings-info-label">Database</span>
          <span class="settings-info-value">SQLite 3.45 (JDBC)</span>
          <span class="settings-info-label">Browser engine</span>
          <span class="settings-info-value">Chromium ${s['_chromium'] ? s['_chromium'] : '(JCEF)'}</span>
          <span class="settings-info-label">Java</span>
          <span class="settings-info-value">JDK 25</span>
          <span class="settings-info-label">Database</span>
          <span class="settings-info-value">${s['db.path'] || '—'}</span>
          <span class="settings-info-label">Impostazioni</span>
          <span class="settings-info-value" style="display:flex;align-items:center;gap:8px">
            <span style="word-break:break-all">${s['_settings_path'] || '—'}</span>
            <button class="btn btn-ghost" style="white-space:nowrap;padding:2px 8px;font-size:11px"
                    onclick="api.openSettingsFile()">Apri ↗</button>
          </span>
        </div>
      </div>`,
  };

  pg.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Impostazioni</h1>
    </div>
    <div class="settings-tabs">
      ${tabs.map(t=>`
        <button class="settings-tab ${_settingsTab===t.id?'settings-tab-active':''}"
                onclick="_setSettingsTab('${t.id}')">${t.label}</button>`).join('')}
    </div>
    <div class="settings-wrap">
      ${tabContent[_settingsTab] || ''}
    </div>`;
  if (_settingsTab === 'maintenance') setTimeout(maintLoadInfo, 50);
}

window._setSettingsTab = tab => {
  _settingsTab = tab;
  renderSettings();
};

// ─── Manutenzione DB ──────────────────────────────────────────────────────────

function fmtBytes(b) {
  if (b == null) return '—';
  b = Number(b);
  if (b < 1024)       return b + ' B';
  if (b < 1024*1024)  return (b/1024).toFixed(1) + ' KB';
  return (b/1024/1024).toFixed(2) + ' MB';
}

async function maintLoadInfo() {
  const panel = document.getElementById('dbInfoPanel');
  if (!panel) return;
  panel.innerHTML = '<span class="settings-hint">Caricamento...</span>';
  try {
    const info = await callJava('dbGetInfo');
    const fragPct = info.page_count > 0 ? ((info.free_pages / info.page_count) * 100).toFixed(1) : 0;
    panel.innerHTML = `
      <span class="maint-info-label">Dimensione file</span>
      <span class="maint-info-value">${fmtBytes(info.file_size)}</span>
      <span class="maint-info-label">WAL in attesa</span>
      <span class="maint-info-value">${fmtBytes(info.wal_size)}</span>
      <span class="maint-info-label">Pagine totali / libere</span>
      <span class="maint-info-value">${info.page_count} / ${info.free_pages} (${fragPct}% frammentazione)</span>
      <span class="maint-info-label">Dimensione pagina</span>
      <span class="maint-info-value">${fmtBytes(info.page_size)}</span>
      <span class="maint-info-label">Transazioni</span>
      <span class="maint-info-value">${info.tx_count}</span>
      <span class="maint-info-label">Conti</span>
      <span class="maint-info-value">${info.acc_count}</span>`;
  } catch(e) {
    panel.innerHTML = `<span class="settings-hint" style="color:var(--expense)">Errore: ${e}</span>`;
  }
}

async function maintVacuum() {
  const btn = document.getElementById('btnVacuum');
  const res = document.getElementById('vacuumResult');
  btn.disabled = true; btn.textContent = '⏳ In corso...';
  res.textContent = '';
  try {
    const r = await callJava('dbVacuum');
    const saved = Number(r.saved);
    res.style.color = saved > 0 ? 'var(--income)' : '';
    res.textContent = `${fmtBytes(r.size_before)} → ${fmtBytes(r.size_after)}` +
      (saved > 0 ? ` (liberati ${fmtBytes(saved)})` : ' (nessuno spazio da recuperare)');
    maintLoadInfo();
  } catch(e) {
    res.style.color = 'var(--expense)';
    res.textContent = 'Errore: ' + e;
  }
  btn.disabled = false; btn.textContent = '🗜️ Compatta';
}

async function maintIntegrity() {
  const btn = document.getElementById('btnIntegrity');
  const res = document.getElementById('integrityResult');
  btn.disabled = true; btn.textContent = '⏳ Verifica...';
  res.textContent = '';
  try {
    const r = await callJava('dbIntegrityCheck');
    if (r.ok) {
      res.style.color = 'var(--income)';
      res.textContent = '✓ Database integro';
    } else {
      res.style.color = 'var(--expense)';
      res.textContent = '✗ Errori: ' + r.messages.join(' | ');
    }
  } catch(e) {
    res.style.color = 'var(--expense)';
    res.textContent = 'Errore: ' + e;
  }
  btn.disabled = false; btn.textContent = '🔍 Verifica';
}

async function maintReindex() {
  const btn = document.getElementById('btnReindex');
  const res = document.getElementById('reindexResult');
  btn.disabled = true; btn.textContent = '⏳ In corso...';
  res.textContent = '';
  try {
    await callJava('dbReindex');
    res.style.color = 'var(--income)';
    res.textContent = '✓ Indici ricostruiti';
  } catch(e) {
    res.style.color = 'var(--expense)';
    res.textContent = 'Errore: ' + e;
  }
  btn.disabled = false; btn.textContent = '⚡ Ricostruisci';
}

async function maintWal() {
  const btn = document.getElementById('btnWal');
  const res = document.getElementById('walResult');
  btn.disabled = true; btn.textContent = '⏳ In corso...';
  res.textContent = '';
  try {
    const r = await callJava('dbWalCheckpoint');
    res.style.color = 'var(--income)';
    res.textContent = Number(r.wal_size) === 0
      ? '✓ WAL già incorporato (0 B)'
      : `✓ WAL incorporato (era ${fmtBytes(r.wal_size)})`;
    maintLoadInfo();
  } catch(e) {
    res.style.color = 'var(--expense)';
    res.textContent = 'Errore: ' + e;
  }
  btn.disabled = false; btn.textContent = '💾 Flush WAL';
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme === 'light' ? 'light' : '';
}

async function settingsSetTheme(theme) {
  applyTheme(theme);
  await api.setSetting('appearance.theme', theme);
  renderSettings();
}

async function settingsSetAccFilter(favOnly) {
  _accFavoritesOnly = favOnly;
  await api.setSetting('accounts.favorites_only', favOnly ? '1' : '0');
  renderSettings();
  updateSidebar();
}

async function settingsSetBackup(key, value) {
  await api.setSetting('backup.' + key, value);
  renderSettings();
}

async function settingsChooseBackupDir() {
  const res = await api.chooseBackupDir();
  if (res.cancelled) return;
  await api.setSetting('backup.dir', res.path);
  renderSettings();
}

async function settingsDoBackup() {
  const hint = document.getElementById('backupHint');
  if (hint) hint.textContent = '⏳ Backup in corso...';
  try {
    const res = await api.doBackup();
    if (hint) hint.textContent = `✅ Salvato: ${res.path}`;
  } catch(e) {
    if (hint) hint.textContent = `❌ ${e.message}`;
  }
}

async function settingsChooseDb(mode) {
  const res = await api.chooseDbFile(mode);
  if (res.cancelled) return;

  document.getElementById('dbPathInput').value = res.path;
  const hint = document.getElementById('dbHint');
  hint.style.color = 'var(--txt3)';
  hint.textContent = '⏳ Cambio database in corso…';
  try {
    await api.reloadDb(res.path);
    hint.style.color = 'var(--income)';
    hint.textContent = '✅ Database cambiato con successo.';
    toast('Database aggiornato.', 'success');
    await updateSidebar();
    await renderDashboard();
  } catch (e) {
    hint.style.color = 'var(--expense)';
    hint.textContent = '❌ Errore: ' + (e.message || e);
    toast('Errore cambio database: ' + (e.message || e), 'error');
  }
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
    <div style="max-width:700px">
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
    </div>` : ''}
    </div>`;
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
  const [usage, allCats] = await Promise.all([api.getCategoryUsage(id), api.getCategories()]);
  const cat = allCats.find(c => c.id === id);
  if (!cat) return;

  const totalTx = (usage.tx_count || 0) + (usage.child_tx_count || 0);
  const hasBudget = (usage.budget_count || 0) > 0;
  const hasChildren = (usage.child_count || 0) > 0;

  // Nessun uso → semplice conferma
  if (totalTx === 0 && !hasBudget && !hasChildren) {
    openModal('Elimina categoria',
      `<p style="margin:0">Eliminare <b>${cat.icon} ${cat.name}</b>?</p>`,
      async () => {
        await api.deleteCategory(id); closeModal();
        toast('Categoria eliminata'); renderCategories();
      }, 'Elimina', 'btn-danger');
    return;
  }

  // Ha dipendenze → proponi spostamento
  const descParts = [];
  if (totalTx > 0) descParts.push(`${totalTx} transazion${totalTx===1?'e':'i'}`);
  if (hasBudget)   descParts.push(`${usage.budget_count} voc${usage.budget_count===1?'e':'i'} di budget`);
  if (hasChildren) descParts.push(`${usage.child_count} sottocategor${usage.child_count===1?'ia':'ie'}`);

  // Categorie disponibili per lo spostamento (stesso tipo, esclude questa e i suoi figli)
  const childIds = new Set(allCats.filter(c => c.parent_id === id).map(c => c.id));
  const targets = allCats.filter(c =>
    c.id !== id && !childIds.has(c.id) && c.type === cat.type && c.type !== 'transfer'
  );
  const opts = targets.map(c =>
    `<option value="${c.id}">${c.parent_id ? '  └ ' : ''}${c.icon} ${c.name}</option>`
  ).join('');

  openModal('Elimina categoria',
    `<p style="margin-bottom:12px">
       <b>${cat.icon} ${cat.name}</b> è usata da: <b>${descParts.join(', ')}</b>.<br>
       <span class="settings-hint">Sposta tutto su un'altra categoria prima di eliminare.</span>
     </p>
     <div class="form-group">
       <label class="form-label">Sposta su</label>
       <select id="del_target" class="form-input">
         <option value="">— Seleziona categoria —</option>
         ${opts}
       </select>
     </div>
     <div class="settings-hint" style="margin-top:6px">
       Le voci di budget verranno eliminate. Le transazioni verranno spostate sulla categoria scelta.
     </div>`,
    async () => {
      const toId = parseInt(document.getElementById('del_target').value);
      if (!toId) { toast('Seleziona una categoria di destinazione', 'error'); return false; }
      await api.reassignCategory({from_id: id, to_id: toId});
      closeModal(); toast('Categoria eliminata e transazioni spostate'); renderCategories();
    }, 'Sposta ed elimina', 'btn-danger');
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
      <div class="form-group" style="grid-column:1/-1">
        <label class="form-label">Icona</label>
        <input type="hidden" id="c_icon" value="${cat?.icon ?? '📁'}">
        <div id="iconPickerWrap"></div>
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
      icon:      document.getElementById('c_icon').value || '📁',
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
  setTimeout(() => _iconPickerBuild('iconPickerWrap', cat?.icon ?? '📁'), 30);
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
  const ok = await confirm('Elimina tag', 'Eliminare questo tag? Verrà rimosso da tutte le transazioni.');
  if (!ok) return;
  try {
    await api.deleteTag(id);
    toast('Tag eliminato');
    renderTags();
  } catch(e) { toast(e.message, 'error'); }
};

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

function _countSchedYearOcc(freq, startDate, endDate, year) {
  const yStart = `${year}-01-01`;
  const yEnd   = `${year}-12-31`;
  if (!startDate) return 0;
  if (endDate && endDate < yStart) return 0;
  const effEnd = (endDate && endDate < yEnd) ? endDate : yEnd;

  // 'once': nessuna proiezione, conta solo se la data è nell'anno
  if (freq === 'once') return (startDate >= yStart && startDate <= effEnd) ? 1 : 0;

  // Per le ricorrenze, start_date è la PROSSIMA occorrenza futura (aggiornata dopo
  // ogni registrazione, può essere in un anno successivo).
  // Proiettiamo a ritroso per trovare la prima occorrenza nell'anno target.
  let cur = startDate;
  for (let i = 0; i < 400; i++) {
    const prev = _prevSchedDate(cur, freq);
    if (!prev || prev < yStart) break;
    cur = prev;
  }
  // Se anche dopo la proiezione siamo oltre l'anno, nessuna occorrenza
  if (cur > yEnd) return 0;

  let count = 0;
  for (let i = 0; i < 400 && cur <= effEnd; i++) {
    if (cur >= yStart) count++;
    const next = _nextSchedDate(cur, freq);
    if (!next || next === cur) break;
    cur = next;
  }
  return count;
}

async function renderBudgetVsPianificate() {
  const wrap = document.getElementById('budgPianWrap');
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

  // Pianificate annuali per categoria (solo attive, no trasferimenti)
  const schedByCat = {};
  for (const s of scheds) {
    if (!s.is_active || s.type === 'transfer' || !s.category_id) continue;
    const occ = _countSchedYearOcc(s.frequency, s.start_date, s.end_date, budgetYear);
    schedByCat[s.category_id] = (schedByCat[s.category_id] || 0) + occ * s.amount;
  }

  // Righe di confronto (solo categorie con budget > 0)
  const rows = [];
  for (const [catIdStr, budgAnnual] of Object.entries(budgByCat)) {
    if (budgAnnual <= 0) continue;
    const catId = parseInt(catIdStr);
    const cat = catMap[catId];
    if (!cat) continue;
    const scheduled = schedByCat[catId] || 0;
    const diff = budgAnnual - scheduled;
    rows.push({ catId, cat, budgAnnual, scheduled, diff });
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
      <td>${r.cat.icon||''} ${catLabel}</td>
      <td class="num">${fmt.currency(r.budgAnnual)}</td>
      <td class="num">${fmt.currency(r.scheduled)}</td>
      <td class="num ${diffCls}">${diffTxt}</td>
      <td style="text-align:right">${action}</td>
    </tr>`;
  };

  const renderSection = (label, sRows) => {
    if (!sRows.length) return '';
    const tBudg  = sRows.reduce((s, r) => s + r.budgAnnual, 0);
    const tSched = sRows.reduce((s, r) => s + r.scheduled, 0);
    const tDiff  = tBudg - tSched;
    const tOk    = Math.abs(tDiff) <= 0.01;
    return `
      <tr class="sync-section-header"><td colspan="5">${label}</td></tr>
      ${sRows.map(renderRow).join('')}
      <tr class="sync-subtotal">
        <td>Totale ${label}</td>
        <td class="num">${fmt.currency(tBudg)}</td>
        <td class="num">${fmt.currency(tSched)}</td>
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
  const wrap = document.getElementById('budgPianWrap');
  const accs = (wrap._budgAccounts || []).filter(a => a.type !== 'investment');

  const tags = await api.getTags();
  let tag = tags.find(t => t.name === 'Da Budget');
  if (!tag) tag = await api.addTag({ name: 'Da Budget', color: '#8b5cf6' });

  const startDef  = `${budgetYear}-01-01`;
  const yearEnd   = `${budgetYear}-12-31`;
  const monthlyAmt = (Math.abs(diff) / 12).toFixed(2);
  const txType = catType === 'expense' ? 'Uscita' : 'Entrata';

  const body = `
    <div class="form-row">
      <div class="form-group">
        <label>Mancante annuale</label>
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

/* ═══════════════════════════════════════════════════════════════════════════
   TRANSAZIONI PIANIFICATE
═══════════════════════════════════════════════════════════════════════════ */
const FREQ_LABELS = {
  once:'Una volta', daily:'Giornaliera', weekly:'Settimanale',
  biweekly:'Bisettimanale', monthly:'Mensile', monthly_last:'Mensile (ultimo giorno)', bimonthly:'Ogni 2 mesi', quarterly:'Trimestrale', semiannual:'Semestrale', yearly:'Annuale'
};

let schedTab = 'lista';
let schedCharts = {};

async function renderScheduled() {
  const pg = document.getElementById('pg-scheduled');
  pg.innerHTML = `
    <div style="flex-shrink:0;padding:16px 16px 0;background:var(--bg)">
      <div class="section-header">
        <h2 class="section-title">Transazioni Pianificate</h2>
      </div>
      <div class="scheduled-tabs">
        <button class="sched-tab ${schedTab==='lista'?'active':''}"      onclick="setSchedTab('lista')">📋 Lista</button>
        <button class="sched-tab ${schedTab==='projection'?'active':''}" onclick="setSchedTab('projection')">📈 Proiezione Saldo</button>
        <button class="sched-tab ${schedTab==='cashflow'?'active':''}"   onclick="setSchedTab('cashflow')">💰 Flusso di Cassa</button>
      </div>
    </div>
    <div id="schedContent" style="flex:1;overflow-y:auto;padding:0 16px 16px"></div>`;

  renderSchedTab();
}

window.setSchedTab = tab => {
  schedTab = tab;
  document.querySelectorAll('.sched-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.sched-tab').forEach(b => {
    if ((tab==='lista'&&b.textContent.includes('Lista'))||
        (tab==='projection'&&b.textContent.includes('Proiezione'))||
        (tab==='cashflow'&&b.textContent.includes('Flusso'))) b.classList.add('active');
  });
  renderSchedTab();
};

async function renderSchedTab() {
  if (schedTab === 'lista')       await renderSchedLista();
  else if (schedTab === 'projection') await renderSchedProjection();
  else if (schedTab === 'cashflow')   await renderSchedCashflow();
}

// Restituisce la prossima occorrenza di una transazione pianificata.
// Con il sistema attuale start_date viene già avanzata ad ogni registrazione/salto,
// quindi start_date È la prossima occorrenza (passata = scaduta, futura = in arrivo).
function computeSchedNext(startDate, _freq, endDate) {
  const d = new Date(startDate + 'T00:00:00');
  if (endDate && d > new Date(endDate + 'T00:00:00')) return null;
  return d;
}

let _settingsTab = 'data';
let _portfolioActiveOnly = true;
let _portfolioSort = { col: 'ticker', dir: 1 };
let _schedSort   = { col: 'days', dir: 'asc' };
let _schedFilter = { type: '', active: '1' };

async function renderSchedLista() {
  const [scheds, accounts, categories, tags] = await Promise.all([
    api.getScheduled(), api.getAccounts(), api.getCategories(), api.getTags()
  ]);

  // Arricchisce ogni pianificata con prossima data e giorni rimanenti
  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD locale-safe
  const today = new Date(todayStr + 'T00:00:00');
  scheds.forEach(s => {
    if (!s.is_active) { s._next = null; s._days = null; return; }
    // start_date IS già la prossima occorrenza — nessuna conversione Date per evitare bug timezone
    const hasEnded = s.end_date && s.start_date > s.end_date;
    s._next = hasEnded ? null : s.start_date;
    const nextD = s._next ? new Date(s._next + 'T00:00:00') : null;
    s._days = nextD ? Math.round((nextD - today) / 86400000) : null;
  });
  window._schedCache = Object.fromEntries(scheds.map(s => [s.id, s]));

  const el = document.getElementById('schedContent');
  el.innerHTML = `
    <div class="sched-toolbar">
      <div class="filter-bar" style="margin-bottom:0;flex:1">
        <select class="form-control" id="sfActive">
          <option value="">Tutte</option>
          <option value="1" ${_schedFilter.active==='1'?'selected':''}>Solo attive</option>
          <option value="0" ${_schedFilter.active==='0'?'selected':''}>Solo inattive</option>
        </select>
        <select class="form-control" id="sfType">
          <option value="">Tutti i tipi</option>
          <option value="income"   ${_schedFilter.type==='income'  ?'selected':''}>Entrate</option>
          <option value="expense"  ${_schedFilter.type==='expense' ?'selected':''}>Uscite</option>
          <option value="transfer" ${_schedFilter.type==='transfer'?'selected':''}>Trasferimenti</option>
        </select>
      </div>
      <button class="btn btn-primary" id="btnNewSched">+ Nuova</button>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table id="schedTable"><thead><tr>
          <th class="sched-th-sort" data-scol="active"  onclick="_schedSortBy('active')">Stato<span class="sort-ind"></span></th>
          <th class="sched-th-sort" data-scol="account" onclick="_schedSortBy('account')">Conto<span class="sort-ind"></span></th>
          <th class="sched-th-sort" data-scol="tag"     onclick="_schedSortBy('tag')">Tag<span class="sort-ind"></span></th>
          <th class="sched-th-sort" data-scol="freq"    onclick="_schedSortBy('freq')">Frequenza<span class="sort-ind"></span></th>
          <th class="sched-th-sort" data-scol="cat"     onclick="_schedSortBy('cat')">Categoria<span class="sort-ind"></span></th>
          <th class="sched-th-sort" data-scol="desc"    onclick="_schedSortBy('desc')">Descrizione<span class="sort-ind"></span></th>
          <th class="sched-th-sort" data-scol="amount"  onclick="_schedSortBy('amount')">Importo<span class="sort-ind"></span></th>
          <th class="sched-th-sort" data-scol="next"    onclick="_schedSortBy('next')">Prossima<span class="sort-ind"></span></th>
          <th class="sched-th-sort th-sort-active" data-scol="days" onclick="_schedSortBy('days')">Giorni<span class="sort-ind">▲</span></th>
          <th></th>
        </tr></thead><tbody id="schedBody"></tbody></table>
      </div>
    </div>`;

  document.getElementById('btnNewSched').onclick = () => showScheduledModal(null, accounts, categories, tags);
  document.getElementById('sfActive').addEventListener('change', e => { _schedFilter.active = e.target.value; _renderSchedRows(scheds); });
  document.getElementById('sfType').addEventListener('change',   e => { _schedFilter.type   = e.target.value; _renderSchedRows(scheds); });

  _renderSchedRows(scheds);
}

window._schedSortBy = col => {
  _schedSort.dir = _schedSort.col === col ? (_schedSort.dir === 'asc' ? 'desc' : 'asc') : 'asc';
  _schedSort.col = col;
  document.querySelectorAll('#schedTable th[data-scol]').forEach(th => {
    const active = _schedSort.col === th.dataset.scol;
    th.classList.toggle('th-sort-active', active);
    const ind = th.querySelector('.sort-ind');
    if (ind) ind.textContent = active ? (_schedSort.dir === 'asc' ? '▲' : '▼') : '';
  });
  _renderSchedRows(Object.values(window._schedCache || {}));
};

function _renderSchedRows(scheds) {
  const tbody = document.getElementById('schedBody');
  if (!tbody) return;

  // Filter
  let rows = scheds.filter(s => {
    if (_schedFilter.active !== '' && String(s.is_active) !== _schedFilter.active) return false;
    if (_schedFilter.type   !== '' && s.type !== _schedFilter.type) return false;
    return true;
  });

  // Sort
  rows = [...rows].sort((a, b) => {
    let va, vb;
    switch (_schedSort.col) {
      case 'active':  va = a.is_active; vb = b.is_active; break;
      case 'account': va = (a.account_name||'').toLowerCase(); vb = (b.account_name||'').toLowerCase(); break;
      case 'desc':    va = (a.description||'').toLowerCase(); vb = (b.description||'').toLowerCase(); break;
      case 'cat':     va = (a.parent_category_name?a.parent_category_name+':'+a.category_name:a.category_name||'').toLowerCase(); vb = (b.parent_category_name?b.parent_category_name+':'+b.category_name:b.category_name||'').toLowerCase(); break;
      case 'tag':     va = (a.tags&&a.tags.length?a.tags.map(t=>t.name).sort().join(','):'').toLowerCase(); vb = (b.tags&&b.tags.length?b.tags.map(t=>t.name).sort().join(','):'').toLowerCase(); break;
      case 'freq':    va = a.frequency; vb = b.frequency; break;
      case 'amount':  va = a.amount;    vb = b.amount;    break;
      case 'next':    va = a._next||'9'; vb = b._next||'9'; break;
      case 'days':
      default:
        va = a._days ?? 99999; vb = b._days ?? 99999;
    }
    const c = va < vb ? -1 : va > vb ? 1 : 0;
    return _schedSort.dir === 'asc' ? c : -c;
  });

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:40px;color:var(--txt3)">Nessuna transazione pianificata.</td></tr>';
    return;
  }

  const daysLabel = s => {
    if (!s.is_active) return '<span class="sched-days-badge inactive">Inattiva</span>';
    if (s._days === null) return '<span class="sched-days-badge ended">Terminata</span>';
    if (s._days < 0)  return `<span class="sched-days-badge overdue">⚠️ ${Math.abs(s._days)}g fa</span>`;
    if (s._days === 0) return '<span class="sched-days-badge today">Oggi</span>';
    return `<span class="sched-days-badge upcoming">${s._days}g</span>`;
  };

  tbody.innerHTML = rows.map(s => `
    <tr oncontextmenu="_showSchedCtx(${s.id},event)" style="${s.color?`background:${s.color}40;`:''}cursor:context-menu">
      <td style="text-align:center"><span style="font-size:15px">${s.is_active ? '✅' : '⏸️'}</span></td>
      <td>${s.account_name||''}${s.to_account_name?' → '+s.to_account_name:''}</td>
      <td class="td-tags">${(s.tags&&s.tags.length)?s.tags.map(t=>`<span class="tag-inline" style="--tc:${t.color}">${t.name}</span>`).join(''):''}</td>
      <td><span class="sched-freq-badge">${FREQ_LABELS[s.frequency]||s.frequency}</span></td>
      <td><span class="cat-chip">${s.category_icon||''} ${s.parent_category_name?s.parent_category_name+' › '+s.category_name:s.category_name||'—'}</span></td>
      <td class="td-main">${s.description||'—'}</td>
      <td class="text-right amount-${s.type}">${s.type==='expense'?'-':''}${fmt.currency(s.amount)}</td>
      <td>${s._next ? fmt.date(s._next) : '—'}</td>
      <td>${daysLabel(s)}</td>
      <td class="sched-actions" style="white-space:nowrap">
        ${s.is_active && s._next ? `<button class="btn btn-xs btn-success" onclick="registerSched(${s.id})" title="Inserisci transazione">✔ Inserisci</button>
        <button class="btn btn-xs btn-ghost" onclick="skipSched(${s.id})" title="Salta questa occorrenza">⏭ Salta</button>` : ''}
      </td>
    </tr>`).join('');
}

const PROJ_RANGES = [
  {v:'3m',       l:'Prossimi 3 mesi'},
  {v:'6m',       l:'Prossimi 6 mesi'},
  {v:'1y',       l:'Prossimo anno'},
  {v:'2y',       l:'Prossimi 2 anni'},
  {v:'ytd',      l:'Anno corrente'},
  {v:'nxt_year', l:'Anno prossimo'},
  {v:'custom',   l:'Personalizza…'},
];
let _projRange = '6m';
let _projMonths = 6;
let _projMode = 'monthly'; // 'monthly' | 'daily'

function projRangeToFilter(range, customMonths, useMonthBoundaries = false) {
  const today = new Date();
  const fmt = d => d.toISOString().slice(0,10);
  const y = today.getFullYear();

  if (useMonthBoundaries) {
    // Mensile: dal 1° del mese corrente alla fine del mese d'arrivo (N mesi pieni)
    const som  = new Date(today.getFullYear(), today.getMonth(), 1); // 1° mese corrente
    const addM = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
    const eom  = d  => new Date(d.getFullYear(), d.getMonth() + 1, 0); // ultimo giorno mese
    let n;
    switch(range) {
      case '3m':       n = 3;  break;
      case '6m':       n = 6;  break;
      case '1y':       n = 12; break;
      case '2y':       n = 24; break;
      case 'ytd':      return { from_date: `${y}-01-01`, to_date: `${y}-12-31` };
      case 'nxt_year': return { from_date: `${y+1}-01-01`, to_date: `${y+1}-12-31` };
      case 'custom':   n = parseInt(customMonths)||6; break;
      default:         n = 6;
    }
    // N mesi pieni: mese corrente = mese 1, mese corrente+(N-1) = mese N
    return { from_date: fmt(som), to_date: fmt(eom(addM(som, n - 1))) };
  }

  // Daily / cashflow: parte da oggi
  const add = months => { const d=new Date(today); d.setMonth(d.getMonth()+months); return d; };
  switch(range) {
    case '3m':       return { from_date: fmt(today), to_date: fmt(add(3)) };
    case '6m':       return { from_date: fmt(today), to_date: fmt(add(6)) };
    case '1y':       return { from_date: fmt(today), to_date: fmt(add(12)) };
    case '2y':       return { from_date: fmt(today), to_date: fmt(add(24)) };
    case 'ytd':      return { from_date: `${y}-01-01`, to_date: `${y}-12-31` };
    case 'nxt_year': return { from_date: `${y+1}-01-01`, to_date: `${y+1}-12-31` };
    case 'custom':   { const m = parseInt(customMonths)||6;
                       return { from_date: fmt(today), to_date: fmt(add(m)) }; }
    default:         return { from_date: fmt(today), to_date: fmt(add(6)) };
  }
}

async function renderSchedProjection() {
  const accounts = await api.getAccounts();
  const el = document.getElementById('schedContent');
  el.innerHTML = `
    <div class="card" style="margin-bottom:16px">
      <div class="proj-controls">
        <select class="form-control" id="projRange">
          ${PROJ_RANGES.map(r=>`<option value="${r.v}" ${_projRange===r.v?'selected':''}>${r.l}</option>`).join('')}
        </select>
        <span id="projCustomWrap" style="display:${_projRange==='custom'?'flex':'none'};align-items:center;gap:6px">
          <input type="number" class="form-control" id="projMonths" value="${_projMonths}" min="1" max="120" style="width:80px">
          <span class="settings-hint" style="white-space:nowrap">mesi</span>
        </span>
        <span style="display:flex;gap:0;border:1px solid var(--border);border-radius:6px;overflow:hidden;margin-left:auto">
          <button id="projModeMonthly" class="btn btn-xs ${_projMode==='monthly'?'btn-primary':'btn-ghost'}" style="border-radius:0;padding:4px 10px" title="Progresso mensile">📅 Mensile</button>
          <button id="projModeDaily"   class="btn btn-xs ${_projMode==='daily'  ?'btn-primary':'btn-ghost'}" style="border-radius:0;padding:4px 10px;border-left:1px solid var(--border)" title="Progresso giornaliero">📆 Giornaliero</button>
        </span>
      </div>
      <div class="proj-chart-wrap"><canvas id="projChart"></canvas></div>
      <div id="projTable" style="margin-top:16px;overflow-x:auto"></div>
    </div>`;

  document.getElementById('projRange').addEventListener('change', () => {
    _projRange = document.getElementById('projRange').value;
    document.getElementById('projCustomWrap').style.display = _projRange==='custom' ? 'flex' : 'none';
    api.setSetting('proj.range', _projRange);
    loadProjectionChart(accounts);
  });
  document.getElementById('projMonths').addEventListener('change', () => {
    _projMonths = parseInt(document.getElementById('projMonths').value) || 6;
    api.setSetting('proj.months', String(_projMonths));
    loadProjectionChart(accounts);
  });
  document.getElementById('projModeMonthly').addEventListener('click', () => {
    _projMode = 'monthly';
    api.setSetting('proj.mode', 'monthly');
    document.getElementById('projModeMonthly').className = 'btn btn-xs btn-primary';
    document.getElementById('projModeDaily').className   = 'btn btn-xs btn-ghost';
    loadProjectionChart(accounts);
  });
  document.getElementById('projModeDaily').addEventListener('click', () => {
    _projMode = 'daily';
    api.setSetting('proj.mode', 'daily');
    document.getElementById('projModeMonthly').className = 'btn btn-xs btn-ghost';
    document.getElementById('projModeDaily').className   = 'btn btn-xs btn-primary';
    loadProjectionChart(accounts);
  });
  await loadProjectionChart(accounts);
}

async function loadProjectionChart(accounts) {
  const range      = document.getElementById('projRange')?.value || '6m';
  const customMths = document.getElementById('projMonths')?.value;
  const isDaily = _projMode === 'daily';
  const { from_date, to_date } = projRangeToFilter(range, customMths, !isDaily);
  if (!from_date || !to_date) return;
  const accIds = accounts.filter(a=>a.type!=='investment').map(a=>a.id).join(',');
  let data;
  try { data = await api.getProjection({from_date, to_date, account_ids:accIds, daily:isDaily}); }
  catch(e) { toast(e.message,'error'); return; }

  const { series, accounts: accList } = data;
  const dates = [...new Set(series.map(p=>p.date))].sort();

  // Somma tutti i conti per ogni data
  const totals = dates.map(d => {
    const pts = series.filter(p => p.date === d);
    return pts.length ? pts.reduce((s, p) => s + p.balance, 0) : null;
  });

  if (schedCharts.proj) schedCharts.proj.destroy();
  const ctx = document.getElementById('projChart');
  if (!ctx) return;
  schedCharts.proj = new Chart(ctx, {
    type: 'line',
    data: { labels: dates, datasets: [{
      label: 'Saldo totale',
      data: totals,
      borderColor: '#58a6ff',
      backgroundColor: '#58a6ff22',
      fill: true, tension: 0.3,
      pointRadius: isDaily ? 2 : 2,
      pointHoverRadius: 4,
      spanGaps: true
    }]},
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color:chartColors().tick } } },
      scales: {
        x: { ticks:{ color:chartColors().tick, maxTicksLimit: isDaily ? 20 : 14 }, grid:{ color:chartColors().grid } },
        y: { ticks:{ color:chartColors().tick, callback: v => fmt.currency(v) }, grid:{ color:chartColors().grid } }
      }
    }
  });

  const tbl = document.getElementById('projTable');
  if (!tbl) return;

  const thS = 'text-align:right;padding:5px 10px;border-bottom:1px solid var(--border);color:var(--txt2);font-weight:400';
  const tdS = (neg, bold) => `text-align:right;padding:5px 10px;border-bottom:1px solid var(--border);${bold?'font-weight:600;':''}${neg?'color:var(--expense)':''}`;
  const diffStr = (v) => v == null ? '—' : (v >= 0 ? '+' : '') + fmt.currency(v);

  if (isDaily) {
    // ── Tabella saldo giornaliero ────────────────────────────────────────────
    if (!dates.length) { tbl.innerHTML = ''; return; }
    const firstTotal = totals.find(t => t != null);
    tbl.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr>
          <th style="text-align:left;padding:5px 10px;border-bottom:1px solid var(--border);color:var(--txt2)">Data</th>
          <th style="${thS}">Saldo totale</th>
          <th style="${thS}">Δ giorno prec.</th>
          <th style="${thS}">Δ totale</th>
        </tr></thead>
        <tbody>${dates.map((d, i) => {
          const total = totals[i];
          const prev  = i > 0 ? totals[i-1] : null;
          const diffPrev  = (total != null && prev != null) ? total - prev : null;
          const diffFirst = (total != null && firstTotal != null) ? total - firstTotal : null;
          const hasDelta = diffPrev !== 0;
          return `<tr${hasDelta && diffPrev != null ? ` style="background:${diffPrev>0?'rgba(63,185,80,.06)':'rgba(248,81,73,.06)'}"` : ''}>
            <td style="padding:5px 10px;border-bottom:1px solid var(--border);font-variant-numeric:tabular-nums">${fmt.date(d)}</td>
            <td style="${tdS(total!=null&&total<0, true)}">${total!=null?fmt.currency(total):'—'}</td>
            <td style="${tdS(diffPrev!=null&&diffPrev<0, false)}">${diffPrev !== 0 ? diffStr(diffPrev) : '<span style="color:var(--txt3)">—</span>'}</td>
            <td style="${tdS(diffFirst!=null&&diffFirst<0, false)}">${diffStr(diffFirst)}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>`;
  } else {
    // ── Tabella saldo mensile ──────────────────────────────────────────────────
    const monthKeys = [...new Set(dates.map(d=>d.slice(0,7)))].sort();
    if (!monthKeys.length) { tbl.innerHTML = ''; return; }

    const monthTotals = monthKeys.map(m => {
      const datesOfMonth = dates.filter(d=>d.startsWith(m));
      const lastDate = datesOfMonth[datesOfMonth.length-1];
      const pts = series.filter(p=>p.date===lastDate);
      return pts.length ? pts.reduce((s,p)=>s+p.balance,0) : null;
    });
    const firstTotal = monthTotals.find(t => t != null);

    tbl.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr>
          <th style="text-align:left;padding:5px 10px;border-bottom:1px solid var(--border);color:var(--txt2)">Mese</th>
          <th style="${thS}">Saldo totale</th>
          <th style="${thS}">Δ mese prec.</th>
          <th style="${thS}">Δ totale</th>
        </tr></thead>
        <tbody>${monthKeys.map((m, i) => {
          const total = monthTotals[i];
          const prev  = i > 0 ? monthTotals[i-1] : null;
          const diffPrev  = (total != null && prev != null) ? total - prev : null;
          const diffFirst = (total != null && firstTotal != null) ? total - firstTotal : null;
          return `<tr>
            <td style="padding:5px 10px;border-bottom:1px solid var(--border)">${m}</td>
            <td style="${tdS(total!=null&&total<0, true)}">${total!=null?fmt.currency(total):'—'}</td>
            <td style="${tdS(diffPrev!=null&&diffPrev<0, false)}">${diffStr(diffPrev)}</td>
            <td style="${tdS(diffFirst!=null&&diffFirst<0, false)}">${diffStr(diffFirst)}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>`;
  }
}

let _cfRange = '1y';
let _cfMonths = 6;

async function renderSchedCashflow() {
  const accounts = await api.getAccounts();
  const el = document.getElementById('schedContent');
  el.innerHTML = `
    <div class="card" style="margin-bottom:16px">
      <div class="proj-controls">
        <select class="form-control" id="cfRange">
          ${PROJ_RANGES.map(r=>`<option value="${r.v}" ${_cfRange===r.v?'selected':''}>${r.l}</option>`).join('')}
        </select>
        <span id="cfCustomWrap" style="display:${_cfRange==='custom'?'flex':'none'};align-items:center;gap:6px">
          <input type="number" class="form-control" id="cfMonths" value="${_cfMonths}" min="1" max="120" style="width:80px">
          <span class="settings-hint" style="white-space:nowrap">mesi</span>
        </span>
        <label class="form-label" style="margin:0;white-space:nowrap">Conti:</label>
        <select class="form-control" id="cfAccounts" multiple style="min-width:160px;height:56px">
          ${accounts.map(a=>`<option value="${a.id}" selected>${a.icon} ${a.name}</option>`).join('')}
        </select>
      </div>
      <div class="proj-chart-wrap"><canvas id="cfChart"></canvas></div>
    </div>`;

  document.getElementById('cfRange').addEventListener('change', () => {
    _cfRange = document.getElementById('cfRange').value;
    document.getElementById('cfCustomWrap').style.display = _cfRange==='custom' ? 'flex' : 'none';
    api.setSetting('cf.range', _cfRange);
    loadCashflowChart();
  });
  document.getElementById('cfMonths').addEventListener('change', () => {
    _cfMonths = parseInt(document.getElementById('cfMonths').value) || 6;
    api.setSetting('cf.months', String(_cfMonths));
    loadCashflowChart();
  });
  document.getElementById('cfAccounts').addEventListener('change', loadCashflowChart);
  await loadCashflowChart();
}

async function loadCashflowChart() {
  const range      = document.getElementById('cfRange')?.value || '1y';
  const customMths = document.getElementById('cfMonths')?.value;
  const { from_date, to_date } = projRangeToFilter(range, customMths);
  if (!from_date || !to_date) return;
  const selOpts = [...(document.getElementById('cfAccounts')?.selectedOptions||[])];
  const accIds  = selOpts.map(o=>o.value).join(',');

  let data;
  try { data = await api.getProjection({from_date:from_date, to_date:to_date, account_ids:accIds}); }
  catch(e) { toast(e.message,'error'); return; }

  const { cashflow } = data;
  const labels  = cashflow.map(m=>m.month);
  const incomes = cashflow.map(m=>m.income);
  const expenses= cashflow.map(m=>m.expense);

  if (schedCharts.cf) schedCharts.cf.destroy();
  const ctx = document.getElementById('cfChart');
  if (!ctx) return;
  schedCharts.cf = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label:'Entrate',  data:incomes,  backgroundColor:'rgba(63,185,80,.7)',  borderRadius:4 },
        { label:'Uscite',   data:expenses, backgroundColor:'rgba(248,81,73,.7)', borderRadius:4 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color:chartColors().tick } } },
      scales: {
        x: { ticks:{ color:chartColors().tick }, grid:{ color:chartColors().grid } },
        y: { ticks:{ color:chartColors().tick, callback: v => fmt.currency(v) }, grid:{ color:chartColors().grid } }
      }
    }
  });
}

window.editSched = async id => {
  const [scheds, accounts, categories, tags] = await Promise.all([
    api.getScheduled(), api.getAccounts(), api.getCategories(), api.getTags()
  ]);
  const s = scheds.find(x=>x.id===id);
  if (s) showScheduledModal(s, accounts, categories, tags);
};

window.duplicateSched = async id => {
  const [scheds, accounts, categories, tags] = await Promise.all([
    api.getScheduled(), api.getAccounts(), api.getCategories(), api.getTags()
  ]);
  const s = scheds.find(x => x.id === id);
  if (!s) return;
  const copy = { ...s, id: null };
  showScheduledModal(copy, accounts, categories, tags);
};

window.deleteSched = async id => {
  const ok = await confirm('Elimina transazione pianificata', 'Eliminare questa transazione pianificata?');
  if (!ok) return;
  await api.deleteScheduled(id);
  toast('Transazione pianificata eliminata');
  renderSchedLista();
};

// ── Scheduled context menu ──────────────────────────────────────────────────
function closeSchedContextMenu() {
  document.getElementById('sched-ctx-menu')?.remove();
  document.removeEventListener('click', closeSchedContextMenu);
  document.removeEventListener('contextmenu', closeSchedContextMenu);
}

window._showSchedCtx = (id, evt) => {
  evt.preventDefault();
  closeSchedContextMenu();

  const s = window._schedCache?.[id];
  const isActive = s?.is_active;
  const hasNext  = !!(s?._next);

  const items = [
    { icon:'✏️', label:'Modifica',  action: () => editSched(id) },
    { icon:'⧉',  label:'Duplica',  action: () => duplicateSched(id) },
    { icon:'🗑️', label:'Elimina',  action: () => deleteSched(id), danger: true },
  ];
  if (isActive && hasNext) {
    items.unshift(
      { icon:'✔',  label:'Inserisci',           action: () => registerSched(id) },
      { icon:'⏭', label:'Salta occorrenza',     action: () => skipSched(id) },
      { separator: true }
    );
  }

  const menu = document.createElement('div');
  menu.id = 'sched-ctx-menu';
  menu.style.cssText = `position:fixed;z-index:9999;background:var(--bg2);border:1px solid var(--border);
    border-radius:8px;padding:4px 0;min-width:190px;box-shadow:0 4px 16px rgba(0,0,0,.3);
    left:${Math.min(evt.clientX, window.innerWidth-210)}px;top:${Math.min(evt.clientY, window.innerHeight-160)}px`;

  items.forEach(item => {
    if (item.separator) {
      const sep = document.createElement('div');
      sep.style.cssText = 'height:1px;background:var(--border);margin:3px 0';
      menu.appendChild(sep);
      return;
    }
    const el = document.createElement('div');
    el.style.cssText = `padding:7px 14px;cursor:pointer;font-size:13px;display:flex;align-items:center;gap:8px;${item.danger?'color:var(--expense)':''}`;
    el.innerHTML = `<span>${item.icon}</span><span>${item.label}</span>`;
    el.onmouseenter = () => el.style.background = 'var(--bg3)';
    el.onmouseleave = () => el.style.background = '';
    el.onclick = () => { closeSchedContextMenu(); item.action(); };
    menu.appendChild(el);
  });

  document.body.appendChild(menu);
  setTimeout(() => {
    document.addEventListener('click', closeSchedContextMenu, { once: true });
    document.addEventListener('contextmenu', closeSchedContextMenu, { once: true });
  }, 0);
};

window.skipSched = async id => {
  const s = window._schedCache?.[id];
  if (!s || !s._next) return;
  await api.advanceScheduled(id, s._next);
  toast('Occorrenza saltata');
  renderSchedLista();
};

window.registerSched = async id => {
  const s = window._schedCache?.[id];
  if (!s || !s._next) return;
  const [cats, accs, tags] = await Promise.all([
    api.getCategories(), api.getAccounts(), api.getTags()
  ]);
  const prefilled = {
    id: null,
    date: s._next,
    amount:        s.amount,
    type:          s.type,
    category_id:   s.category_id   || null,
    account_id:    s.account_id,
    to_account_id: s.to_account_id || null,
    description:   s.description   || '',
    color:         s.color         || null,
    reconciled:    s.reconciled    ?? 1,
    tag_ids: (s.tags || []).map(t => t.id)
  };
  showTxModal(prefilled, cats, accs, s.type, tags, async () => {
    await api.advanceScheduled(id, s._next);
    renderSchedLista();
  });
};

function showScheduledModal(sched, accounts, categories, tags = []) {
  const isEdit = !!(sched?.id);
  const today  = new Date().toISOString().slice(0,10);
  const initType = sched?.type || 'expense';

  const expCats = categories.filter(c=>c.type==='expense');
  const incCats = categories.filter(c=>c.type==='income');

  const body = `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Tipo</label>
        <select class="form-control" id="sc_type" onchange="schedToggleCats()">
          <option value="expense"  ${initType==='expense' ?'selected':''}>Uscita</option>
          <option value="income"   ${initType==='income'  ?'selected':''}>Entrata</option>
          <option value="transfer" ${initType==='transfer'?'selected':''}>Trasferimento</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Importo (€) *</label>
        <input type="number" step="0.01" min="0" class="form-control" id="sc_amount" value="${sched?.amount||''}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Descrizione</label>
      <input class="form-control" id="sc_desc" placeholder="Opzionale" value="${sched?.description||''}">
    </div>
    <div class="form-row">
      <div class="form-group" id="sc_catGroup">
        <label class="form-label">Categoria</label>
        <div class="cat-picker">
          <input type="text" class="form-control" id="sc_cat_input" placeholder="— Seleziona categoria —" autocomplete="off">
          <input type="hidden" id="sc_cat" value="">
          <div class="cat-picker-list" id="sc_catPickerList"></div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Frequenza</label>
        <select class="form-control" id="sc_freq">
          ${Object.entries(FREQ_LABELS).map(([v,l])=>`<option value="${v}" ${sched?.frequency===v?'selected':v==='monthly'&&!sched?'selected':''}>${l}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Conto *</label>
        <select class="form-control" id="sc_account">
          ${accounts.filter(isAccountActive).map(a=>`<option value="${a.id}" ${sched?.account_id==a.id?'selected':''}>${a.icon} ${a.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group" id="sc_toAccGroup" style="${initType!=='transfer'?'display:none':''}">
        <label class="form-label">Conto destinazione</label>
        <select class="form-control" id="sc_toAccount">
          <option value="">— Seleziona —</option>
          ${accounts.map(a=>`<option value="${a.id}" ${sched?.to_account_id==a.id?'selected':''}>${a.icon} ${a.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Data inizio *</label>
        <input type="date" class="form-control" id="sc_start" value="${sched?.start_date||today}">
      </div>
      <div class="form-group">
        <label class="form-label">Data fine (opzionale)</label>
        <input type="date" class="form-control" id="sc_end" value="${sched?.end_date||''}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Colore riga <span class="settings-hint">(opzionale)</span></label>
        <div style="display:flex;align-items:center;gap:8px">
          <input type="color" id="sc_color" class="form-color-tx" value="${sched?.color||'#ffffff'}">
          <label class="settings-hint" style="display:flex;align-items:center;gap:6px;cursor:pointer">
            <input type="checkbox" id="sc_color_use" ${sched?.color?'checked':''} style="margin:0">
            Usa colore
          </label>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Attivo</label>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-top:6px">
          <input type="checkbox" id="sc_active" ${sched?.is_active!==0?'checked':''} style="margin:0">
          Transazione attiva
        </label>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Tag</label>
      <div class="tag-selector" id="sc_tagSelector">
        ${tags.map(t=>`<span class="tag-chip" data-tag-id="${t.id}" style="--tc:${t.color}">${t.name}</span>`).join('')}
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Stato alla registrazione</label>
      <div style="display:flex;align-items:center;gap:16px;padding-top:4px">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
          <input type="radio" name="sc_reconciled" value="0" ${sched?.reconciled==0?'checked':''}>
          <span>🔲 Da verificare</span>
        </label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
          <input type="radio" name="sc_reconciled" value="1" ${sched==null||sched?.reconciled!=0?'checked':''}>
          <span>✅ Conciliata</span>
        </label>
      </div>
    </div>`;

  function updateSchedCatSelect(keepSelected) {
    const type  = document.getElementById('sc_type')?.value;
    const input = document.getElementById('sc_cat_input');
    if (!input?._catPickerSetItems) return;
    if (type === 'transfer') { input._catPickerSetItems([], null); return; }
    const cats = type === 'expense' ? expCats : incCats;
    const parentIds = new Set(cats.filter(c => c.parent_id).map(c => c.parent_id));
    const items = cats.filter(c => c.parent_id || !parentIds.has(c.id)).map(c => ({
      id: c.id,
      label: c.parent_id ? `${c.parent_name} › ${c.icon} ${c.name}` : `${c.icon} ${c.name}`
    }));
    input._catPickerSetItems(items, keepSelected);
  }

  window.schedToggleCats = () => {
    const type = document.getElementById('sc_type')?.value;
    const toAcc = document.getElementById('sc_toAccGroup');
    if (toAcc) toAcc.style.display = type === 'transfer' ? '' : 'none';
    updateSchedCatSelect(null);
  };

  const sc_selectedTagIds = new Set((sched?.tags || []).map(t => Number(t.id)));

  openModal(isEdit ? 'Modifica Transazione Pianificata' : 'Nuova Transazione Pianificata', body, async () => {
    const type = document.getElementById('sc_type').value;
    const data = {
      id:            sched?.id,
      description:   document.getElementById('sc_desc').value.trim(),
      amount:        parseFloat(document.getElementById('sc_amount').value),
      type,
      category_id:   parseInt(document.getElementById('sc_cat').value)||null,
      account_id:    parseInt(document.getElementById('sc_account').value),
      to_account_id: type==='transfer' ? parseInt(document.getElementById('sc_toAccount').value)||null : null,
      frequency:     document.getElementById('sc_freq').value,
      start_date:    document.getElementById('sc_start').value,
      end_date:      document.getElementById('sc_end').value || null,
      is_active:  document.getElementById('sc_active').checked ? 1 : 0,
      color:      document.getElementById('sc_color_use')?.checked
                    ? document.getElementById('sc_color').value : null,
      reconciled: parseInt(document.querySelector('input[name="sc_reconciled"]:checked')?.value ?? '1'),
      tag_ids:    [...sc_selectedTagIds],
    };
    if (!data.amount || !data.account_id || !data.start_date) {
      toast('Compila i campi obbligatori', 'error'); return;
    }
    try {
      if (isEdit) await api.updateScheduled(data);
      else        await api.addScheduled(data);
      closeModal();
      toast(isEdit ? 'Transazione pianificata aggiornata' : 'Transazione pianificata aggiunta');
      renderSchedLista();
    } catch(e) { toast(e.message, 'error'); }
  });

  // wire tag chips (DOM già disponibile dopo openModal)
  document.querySelectorAll('#sc_tagSelector [data-tag-id]').forEach(chip => {
    const id = Number(chip.dataset.tagId);
    if (sc_selectedTagIds.has(id)) chip.classList.add('selected');
    chip.onclick = () => {
      chip.classList.toggle('selected');
      sc_selectedTagIds.has(id) ? sc_selectedTagIds.delete(id) : sc_selectedTagIds.add(id);
    };
  });

  initCatPicker('sc_cat_input', 'sc_cat', 'sc_catPickerList');
  updateSchedCatSelect(sched?.category_id);
}

/* ═══════════════════════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════════════════════ */
function showOverdueNotice(list) {
  const el = document.createElement('div');
  el.className = 'overdue-notice';
  el.innerHTML = `
    <div class="overdue-notice-head">
      <span>⚠️ ${list.length} transazion${list.length===1?'e pianificata scaduta':'i pianificate scadute'}</span>
      <button onclick="this.closest('.overdue-notice').remove()">✕</button>
    </div>
    <div class="overdue-notice-body">
      ${list.slice(0,4).map(u=>`<div class="overdue-row">
        <span>${fmt.date(u.date)}</span>
        <span class="td-main">${u.description||'-'}</span>
        <span class="amount-${u.type}">${u.type==='expense'?'-':''}${fmt.currency(u.amount)}</span>
      </div>`).join('')}
      ${list.length>4?`<div class="overdue-more">+ altri ${list.length-4}…</div>`:''}
    </div>
    <div class="overdue-notice-bar"><div class="overdue-notice-progress"></div></div>`;
  document.body.appendChild(el);
  // progress bar animation then auto-remove
  requestAnimationFrame(() => {
    el.querySelector('.overdue-notice-progress').style.transition = 'width 8s linear';
    el.querySelector('.overdue-notice-progress').style.width = '0%';
  });
  setTimeout(() => el.classList.add('fade-out'), 7800);
  setTimeout(() => el.remove(), 8500);
  el.querySelector('.overdue-notice-head').addEventListener('click', e => {
    if (!e.target.closest('button')) navigate('scheduled');
  });
}

/* ─── Chart.js global font (allineato al body Segoe UI) ──────────────────── */
Chart.defaults.font.family = "'Segoe UI', system-ui, sans-serif";
Chart.defaults.font.size   = 13;

async function init() {
  // Nascondo gli handle se si parte massimizzato
  const {maximized} = await api.isMaximized();
  document.querySelectorAll('.rh').forEach(el => el.style.display = maximized ? 'none' : '');
  // Carica preferenze persistenti
  const s = await api.getSettings();
  if (s['appearance.theme']) applyTheme(s['appearance.theme']);
  if (s['accounts.favorites_only']) _accFavoritesOnly = s['accounts.favorites_only'] === '1';
  if (s['accounts.type_order']) { try { _accTypeOrder = JSON.parse(s['accounts.type_order']); } catch(e) {} }
  if (s['proj.range'])   _projRange  = s['proj.range'];
  if (s['proj.months'])  _projMonths = parseInt(s['proj.months']) || 6;
  if (s['proj.mode'])    _projMode   = s['proj.mode'];
  if (s['cf.range'])     _cfRange    = s['cf.range'];
  if (s['cf.months'])    _cfMonths   = parseInt(s['cf.months'])   || 6;
  if (s['analytics.months'])      _analyticsMonths    = parseInt(s['analytics.months']) || 12;
  if (s['tx.range'])              txFilters           = { range: s['tx.range'], ...rangeToFilter(s['tx.range']) };
  if (s['portfolio.active_only']) _portfolioActiveOnly = s['portfolio.active_only'] !== '0';
  await updateSidebar();
  await renderDashboard();
  // Notifica scadute (non bloccante, dopo il render)
  const overdue = await api.getOverdue();
  if (overdue.length) showOverdueNotice(overdue);
}

/* ─── Log Viewer ──────────────────────────────────────────────────────────── */
async function renderLogViewer() {
  const pg = document.getElementById('pg-logviewer');
  pg.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">Log operazioni</h2>
      <div style="display:flex;gap:8px;align-items:center;margin-left:auto">
        <input class="form-control" id="logSearch" placeholder="🔍 Filtra..." style="width:220px">
        <button class="btn btn-ghost" id="btnLogRefresh" title="Aggiorna">↻ Aggiorna</button>
      </div>
    </div>
    <div class="card" style="flex:1;display:flex;flex-direction:column;min-height:0">
      <div id="logPath" style="font-size:11px;color:var(--txt3);padding:6px 12px;border-bottom:1px solid var(--border)"></div>
      <div class="log-wrap" id="logWrap">
        <div style="color:var(--txt3);padding:40px;text-align:center">Caricamento…</div>
      </div>
      <div style="display:flex;gap:8px;padding:8px 12px;border-top:1px solid var(--border)">
        <input class="form-control" id="logSearchBottom" placeholder="🔍 Filtra..." style="flex:1">
      </div>
    </div>`;

  const load = async () => {
    const data = await api.readLog(2000);
    document.getElementById('logPath').textContent = data.path || '';
    _logLines = data.lines || [];
    renderLogLines();
  };

  document.getElementById('btnLogRefresh').onclick = load;
  let _logTimer;
  const onLogSearch = (src, dst) => {
    document.getElementById(dst).value = document.getElementById(src).value;
    clearTimeout(_logTimer);
    _logTimer = setTimeout(renderLogLines, 150);
  };
  document.getElementById('logSearch').addEventListener('input', () => onLogSearch('logSearch', 'logSearchBottom'));
  document.getElementById('logSearchBottom').addEventListener('input', () => onLogSearch('logSearchBottom', 'logSearch'));

  await load();
}

let _logLines = [];

function renderLogLines() {
  const wrap = document.getElementById('logWrap');
  if (!wrap) return;
  const q = (document.getElementById('logSearch')?.value || '').toLowerCase();
  const filtered = q ? _logLines.filter(l => l.toLowerCase().includes(q)) : _logLines;
  if (!filtered.length) {
    wrap.innerHTML = '<div style="color:var(--txt3);padding:40px;text-align:center">Nessun log trovato</div>';
    return;
  }
  const ACTION_COLORS = {
    'TRANSAZIONE AGGIUNTA':   '#3fb950',
    'TRANSAZIONE MODIFICATA': '#58a6ff',
    'TRANSAZIONE ELIMINATA':  '#f85149',
    'PIANIFICATA AGGIUNTA':   '#3fb950',
    'PIANIFICATA MODIFICATA': '#58a6ff',
    'PIANIFICATA ELIMINATA':  '#f85149',
    'PIANIFICATA AVANZATA':   '#d2a8ff',
    'PIANIFICATA COMPLETATA': '#8b949e',
    'CONCILIAZIONE':          '#e3b341',
    'CONTO AGGIUNTO':         '#3fb950',
    'CONTO MODIFICATO':       '#58a6ff',
    'CONTO ELIMINATO':        '#f85149',
    'CATEGORIA AGGIUNTA':     '#3fb950',
    'CATEGORIA MODIFICATA':   '#58a6ff',
    'CATEGORIA ELIMINATA':    '#f85149',
    'CATEGORIA RIASSEGNATA':  '#d2a8ff',
    'BUDGET IMPOSTATO':       '#3fb950',
    'BUDGET ELIMINATO':       '#f85149',
    'BUDGET BULK':            '#58a6ff',
    'BUDGET MESE ELIMINATO':  '#f85149',
    'BUDGET GENERATO':        '#d2a8ff',
    'BUDGET CONFIG':          '#58a6ff',
    'TAG AGGIUNTO':           '#3fb950',
    'TAG MODIFICATO':         '#58a6ff',
    'TAG ELIMINATO':          '#f85149',
    'TITOLO ACQUISTATO':      '#3fb950',
    'TITOLO VENDUTO':         '#e3b341',
    'TITOLO ELIMINATO':       '#f85149',
    'PREZZO AGGIORNATO':      '#58a6ff',
    'PORTAFOGLIO MODIFICATO': '#58a6ff',
    'POSIZIONE IMPORTATA':    '#d2a8ff',
    'CEDOLA REGISTRATA':      '#3fb950',
    'BACKUP ESEGUITO':        '#8b949e',
    'DB CAMBIATO':            '#e3b341',
    'AVVIO':                  '#8b949e',
  };
  wrap.innerHTML = filtered.map(line => {
    // parse: "YYYY-MM-DD  HH:mm:ss  AZIONE                               |  campo:val  |  ..."
    const dateStr  = line.substring(0, 10);
    const timeStr  = line.substring(12, 20);
    const rest     = line.substring(22).trimStart();
    // split on first "  |  " to get action vs fields
    const sepIdx   = rest.indexOf('  |  ');
    const action   = sepIdx >= 0 ? rest.substring(0, sepIdx).trim() : rest.trim();
    const fields   = sepIdx >= 0 ? rest.substring(sepIdx + 5).split('  |  ') : [];
    const color    = ACTION_COLORS[action] || 'var(--txt2)';
    const fieldsHtml = fields.map(f => {
      const ci = f.indexOf(':');
      if (ci < 0) return `<span class="log-field">${f}</span>`;
      const k = f.substring(0, ci);
      const v = f.substring(ci + 1);
      return `<span class="log-field"><span class="log-key">${k}</span><span class="log-val">${v}</span></span>`;
    }).join('');
    return `<div class="log-row">
      <span class="log-date">${dateStr}</span>
      <span class="log-time">${timeStr}</span>
      <span class="log-action" style="color:${color}">${action}</span>
      <span class="log-fields">${fieldsHtml}</span>
    </div>`;
  }).join('');
  setTimeout(() => {
    const wrap = document.getElementById('logWrap');
    if (wrap) wrap.scrollTop = wrap.scrollHeight;
  }, 50);
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
