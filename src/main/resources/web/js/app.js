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
      onFailure: (code, msg) => reject(new Error(msg))
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

  // Conti
  getAccounts:   ()     => callJava('getAccounts'),
  addAccount:    data   => callJava('addAccount',   data),
  updateAccount: data   => callJava('updateAccount', data),
  deleteAccount: id     => callJava('deleteAccount', {id}),

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

  // Pianificate
  getScheduled:    ()    => callJava('getScheduled'),
  addScheduled:    data  => callJava('addScheduled', data),
  updateScheduled: data  => callJava('updateScheduled', data),
  deleteScheduled: id    => callJava('deleteScheduled', {id}),
  getUpcoming:     (n)   => callJava('getUpcoming',    {limit: n||15}),
  getUpcomingAll:  (n)   => callJava('getUpcomingAll', {limit: n||15}),
  getOverdue:      ()    => callJava('getOverdue'),
  skipOccurrence:  (id, date) => callJava('skipOccurrence', {id, date}),
  getProjection:   data  => callJava('getProjection', data),
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
  budgets:'Budget', portfolio:'Portafoglio', reports:'Report', settings:'Impostazioni',
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
    case 'scheduled':    renderScheduled();    break;
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
    <div class="dash-top-row" style="margin-bottom:24px">
      <div class="card dash-accounts-card">
        <div class="card-header"><span class="card-title">I miei conti</span>
          <button class="btn btn-ghost" onclick="navigate('accounts')">Gestisci →</button>
        </div>
        <div id="dashAccounts"></div>
      </div>
      <div class="card dash-barchart-card">
        <div class="card-header"><span class="card-title">Entrate vs Uscite ${dashYear}</span></div>
        <canvas id="barChart"></canvas>
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
          <th>Data</th><th>Descrizione</th><th>Categoria</th><th>Freq.</th><th class="text-right">Importo</th>
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

  document.getElementById('dashYearLabel').textContent = dashYear;
  document.getElementById('dashPrev').onclick = () => { dashYear--; renderDashboard(); };
  document.getElementById('dashNext').onclick = () => { dashYear++; renderDashboard(); };

  const [stats, accounts, recent, monthly, catData, upcoming] = await Promise.all([
    api.getDashboardStats(dashYear),
    api.getAccounts(),
    api.getTransactions({year:dashYear, limit:10}),
    api.getMonthlyChartData(dashYear),
    api.getCategoryChartData(dashYear, 'expense'),
    api.getUpcomingAll(12)
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

  const totalBalance = accounts.reduce((s,a) => s + (a.balance||0), 0);
  document.getElementById('dashAccounts').innerHTML = orderedTypes.length ? `
    <table class="acc-list-table">
      ${orderedTypes.map(t => `
        <tbody>
          <tr class="acc-group-row"><td colspan="2">${ACC_TYPE_LABELS[t] || t}</td></tr>
          ${grouped[t].map(a => `
            <tr class="acc-list-row" onclick="navigateToAccountTx(${a.id})">
              <td>
                <span class="acc-dot" style="background:${a.color||'var(--accent)'}"></span>
                <span class="acc-icon">${a.icon||''}</span>
                <span class="acc-name">${a.name}</span>
              </td>
              <td class="acc-bal ${a.balance<0?'neg':''}" style="color:${a.balance<0?'var(--expense)':(a.color||'var(--accent)')}">
                ${fmt.currency(a.balance)}
              </td>
            </tr>`).join('')}
        </tbody>`).join('')}
      <tbody>
        <tr class="acc-total-row">
          <td>Totale</td>
          <td class="acc-bal ${totalBalance<0?'neg':''}" style="color:${totalBalance<0?'var(--expense)':'var(--income)'}">
            ${fmt.currency(totalBalance)}
          </td>
        </tr>
      </tbody>
    </table>` :
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

  // Upcoming scheduled
  const freqLabel = f => ({once:'Una volta',daily:'Giornaliera',weekly:'Settimanale',biweekly:'Bisettimanale',monthly:'Mensile',quarterly:'Trimestrale',yearly:'Annuale'}[f]||f);
  document.getElementById('upcomingRows').innerHTML = upcoming.length ? upcoming.map(u => `
    <tr class="${u.overdue ? 'upcoming-overdue' : ''}">
      <td>${u.overdue ? `<span class="overdue-badge">⚠️</span>` : ''}${fmt.date(u.date)}</td>
      <td class="td-main">${u.description||'-'}</td>
      <td><span class="cat-chip">${u.category_icon||''}${u.category_name||'-'}</span></td>
      <td><span class="sched-freq-badge">${freqLabel(u.frequency)}</span></td>
      <td class="text-right amount-${u.type}">${u.type==='expense'?'-':''}${fmt.currency(u.amount)}</td>
    </tr>`).join('') :
    '<tr><td colspan="5" class="text-muted" style="text-align:center;padding:20px">Nessuna transazione pianificata</td></tr>';

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
      scales:{ x:{ticks:{color:'#8b949e',font:{size:10}},grid:{color:'#21262d'}},
               y:{ticks:{color:'#8b949e',font:{size:10}},grid:{color:'#21262d'}}}}
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
        scales:{ x:{ticks:{color:'#8b949e',font:{size:10}},grid:{color:'#21262d'}},
                 y:{ticks:{color:'#8b949e',font:{size:10}},grid:{color:'#21262d'}}}}
    });
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   TRANSAZIONI
═══════════════════════════════════════════════════════════════════════════ */
let txFilters = { range: '30d' };

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
let txSort    = { col: 'date', dir: 'desc' };
let txCache   = [];

function navigateToAccountTx(accountId) {
  txFilters = { range: '30d', account_id: String(accountId) };
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
        ${accounts.map(a=>`<option value="${a.id}" ${String(a.id)===String(txFilters.account_id)?'selected':''}>${a.icon} ${a.name}</option>`).join('')}
      </select>
      <input class="form-control" id="txSearch" value="${txFilters.search||''}" placeholder="🔍 Cerca..." style="min-width:160px">
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
    <tr data-tx-id="${t.id}" ${t.color ? `style="background:${t.color}18" class="tx-colored"` : ''}>
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
      <label class="form-label">Colore riga <span class="settings-hint">(opzionale — evidenzia la riga)</span></label>
      <div style="display:flex;align-items:center;gap:8px">
        <input type="color" id="f_color" class="form-color-tx" value="${tx?.color||'#ffffff'}">
        <label class="settings-hint" style="display:flex;align-items:center;gap:6px;cursor:pointer">
          <input type="checkbox" id="f_color_use" ${tx?.color?'checked':''} style="margin:0">
          Usa colore
        </label>
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
      color: document.getElementById('f_color_use')?.checked
               ? document.getElementById('f_color').value : null,
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

  // Categorie che hanno figli → solo riepilogo, non editabili (come le transazioni)
  const parentIds = new Set(categories.filter(c => c.parent_id).map(c => c.parent_id));
  // Figli raggruppati per parent
  const childrenOf = {};
  categories.forEach(c => { if (c.parent_id) (childrenOf[c.parent_id] ??= []).push(c); });

  // Somma ricorsiva budget/actual per una categoria e i suoi figli
  const sumBm = id => {
    const direct = budgetMap[id] || {};
    const kids = childrenOf[id] || [];
    const result = {...direct};
    kids.forEach(k => {
      const km = budgetMap[k.id] || {};
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
    const isGroupHeader = parentIds.has(cat.id);  // macrocategoria con figli
    const isChild = !!cat.parent_id;
    const bm = isGroupHeader ? sumBm(cat.id) : (budgetMap[cat.id] || {});
    const am = isGroupHeader ? sumAm(cat.id) : (actualMap[cat.id] || {});
    const annualBudget = Object.values(bm).reduce((s,v)=>s+v,0);
    const annualActual = Object.values(am).reduce((s,v)=>s+v,0);

    // Per uscite: rosso se spendi più del budget. Per entrate: rosso se guadagni meno del previsto.
    const isIncome = cat.type === 'income';
    const isOver = (budget, actual) => budget > 0 && (isIncome ? actual < budget : actual > budget);

    const cells = Array.from({length:12},(_,i)=>{
      const m = i+1;
      const budget = bm[m] || 0;
      const actual = am[m] || 0;
      const over = isOver(budget, actual);
      if (isGroupHeader) {
        return `<td class="budget-cell budget-cell-parent budget-cell-readonly">
          <span class="budget-cell-val">${budget>0?fmt.currency(budget):''}</span>
          ${actual>0?`<span class="budget-cell-actual ${over?'over':''}">${fmt.currency(actual)}</span>`:''}
        </td>`;
      }
      return `<td class="budget-cell"
                  data-cat="${cat.id}" data-month="${m}"
                  onclick="_budgetCellEdit(this,${cat.id},${m})">
        <span class="budget-cell-val">${budget>0?fmt.currency(budget):''}</span>
        ${actual>0?`<span class="budget-cell-actual ${over?'over':''}">${fmt.currency(actual)}</span>`:''}
      </td>`;
    }).join('');

    const totalOver = isOver(annualBudget, annualActual);
    const actions = isGroupHeader
      ? `<td class="budget-actions-cell"></td>`
      : `<td class="budget-actions-cell">
           <button class="btn btn-ghost btn-icon" title="Imposta mensile" onclick="_budgetSetMonthly(${cat.id},'${cat.name}')">M</button>
           <button class="btn btn-ghost btn-icon" title="Imposta annuale" onclick="_budgetSetAnnual(${cat.id},'${cat.name}')">A</button>
           <button class="btn btn-ghost btn-icon" title="Svuota" onclick="_budgetClearRow(${cat.id})">🗑️</button>
         </td>`;

    return `<tr class="${isGroupHeader?'budget-row-parent':''} ${isChild?'budget-row-child':''}" data-cat-id="${cat.id}">
      <td class="budget-cat-cell ${isChild?'budget-child-indent':''}">
        <span style="color:${cat.color}">${cat.icon}</span> ${cat.name}
        ${isGroupHeader?'<span class="budget-group-hint"> (riepilogo)</span>':''}
      </td>
      ${cells}
      <td class="budget-total-cell ${isGroupHeader?'budget-cell-parent':''}">
        ${annualBudget>0?`<b>${fmt.currency(annualBudget)}</b>`:''}
        ${annualBudget>0?`<span class="budget-cell-actual ${totalOver?'over':''}">${fmt.currency(annualActual)}</span>`:''}
      </td>
      ${actions}
    </tr>`;
  }).join('');

  document.getElementById('budgetBody').innerHTML = rows;
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
    // Se vuoto o invariato, non fare nulla
    if (raw === '' || parseFloat(raw) === originalVal) { restore(); return; }
    const val = parseFloat(raw) || 0;
    await api.setBudget({category_id: catId, amount: val, month, year: budgetYear});
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
   TRANSAZIONI PIANIFICATE
═══════════════════════════════════════════════════════════════════════════ */
const FREQ_LABELS = {
  once:'Una volta', daily:'Giornaliera', weekly:'Settimanale',
  biweekly:'Bisettimanale', monthly:'Mensile', quarterly:'Trimestrale', yearly:'Annuale'
};

let schedTab = 'lista';
let schedCharts = {};

async function renderScheduled() {
  const pg = document.getElementById('pg-scheduled');
  pg.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">Transazioni Pianificate</h2>
    </div>
    <div class="scheduled-tabs">
      <button class="sched-tab ${schedTab==='lista'?'active':''}"      onclick="setSchedTab('lista')">📋 Lista</button>
      <button class="sched-tab ${schedTab==='projection'?'active':''}" onclick="setSchedTab('projection')">📈 Proiezione Saldo</button>
      <button class="sched-tab ${schedTab==='cashflow'?'active':''}"   onclick="setSchedTab('cashflow')">💰 Flusso di Cassa</button>
    </div>
    <div id="schedContent"></div>`;

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

async function renderSchedLista() {
  const [scheds, accounts, categories, upcoming] = await Promise.all([
    api.getScheduled(), api.getAccounts(), api.getCategories(), api.getUpcomingAll(20)
  ]);
  const el = document.getElementById('schedContent');
  el.innerHTML = `
    <div class="section-header" style="margin-bottom:12px">
      <span></span>
      <button class="btn btn-primary" id="btnNewSched">+ Nuova</button>
    </div>
    <div class="card" style="margin-bottom:16px">
      <div class="card-header"><span class="card-title">📅 Prossime occorrenze</span></div>
      <div class="table-wrap">
        <table><thead><tr>
          <th>Data</th><th>Descrizione</th><th>Categoria</th><th>Conto</th>
          <th class="text-right">Importo</th><th></th>
        </tr></thead>
        <tbody id="occBody"></tbody></table>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title">Transazioni pianificate</span></div>
      <div class="table-wrap">
        <table><thead><tr>
          <th>Attivo</th><th>Data inizio</th><th>Frequenza</th><th>Descrizione</th>
          <th class="text-right">Importo</th><th>Tipo</th><th>Conto</th><th></th>
        </tr></thead>
        <tbody id="schedBody"></tbody></table>
      </div>
    </div>`;

  document.getElementById('btnNewSched').onclick = () => showScheduledModal(null, accounts, categories);

  // ── Prossime occorrenze ──────────────────────────────────────────────────
  const occBody = document.getElementById('occBody');
  window._occCache = upcoming;
  if (!upcoming.length) {
    occBody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--txt3)">Nessuna occorrenza</td></tr>';
  } else {
    occBody.innerHTML = upcoming.map((u, i) => `
      <tr class="${u.overdue ? 'upcoming-overdue' : ''}">
        <td>${u.overdue ? '<span class="overdue-badge">⚠️</span>' : ''}${fmt.date(u.date)}</td>
        <td class="td-main">${u.description||'-'}</td>
        <td><span class="cat-chip">${u.category_icon||''}${u.category_name||'-'}</span></td>
        <td>${u.account_name||'-'}</td>
        <td class="text-right amount-${u.type}">${u.type==='expense'?'-':''}${fmt.currency(u.amount)}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-xs btn-success" onclick="registerOccurrence(${i})">✔ Registra</button>
          <button class="btn btn-xs btn-ghost"   onclick="skipOcc(${u.id},'${u.date}')">⏭ Salta</button>
        </td>
      </tr>`).join('');
  }

  // ── Lista pianificate ────────────────────────────────────────────────────
  const tbody = document.getElementById('schedBody');
  if (!scheds.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--txt3)">Nessuna transazione pianificata. Creane una!</td></tr>';
    return;
  }
  tbody.innerHTML = scheds.map(s => `
    <tr ${s.color ? `style="background:${s.color}18"` : ''}>
      <td><span style="font-size:16px">${s.is_active ? '✅' : '⏸️'}</span></td>
      <td>${fmt.date(s.start_date)}${s.end_date?`<br><span class="text-small text-muted">fino ${fmt.date(s.end_date)}</span>`:''}</td>
      <td><span class="sched-freq-badge">${FREQ_LABELS[s.frequency]||s.frequency}</span></td>
      <td class="td-main">${s.description||'-'}${s.category_name?`<br><span class="text-small text-muted">${s.category_icon||''} ${s.category_name}</span>`:''}</td>
      <td class="text-right amount-${s.type}">${s.type==='expense'?'-':''}${fmt.currency(s.amount)}</td>
      <td><span class="badge badge-${s.type}">${s.type==='income'?'Entrata':s.type==='expense'?'Uscita':'Trasferimento'}</span></td>
      <td>${s.account_name||'-'}${s.to_account_name?` → ${s.to_account_name}`:''}</td>
      <td>
        <button class="btn btn-ghost btn-icon" onclick="editSched(${s.id})">✏️</button>
        <button class="btn btn-ghost btn-icon" onclick="deleteSched(${s.id})">🗑️</button>
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

function projRangeToFilter(range, customMonths) {
  const today = new Date();
  const fmt = d => d.toISOString().slice(0,10);
  const add = months => { const d=new Date(today); d.setMonth(d.getMonth()+months); return d; };
  const y = today.getFullYear();
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
          <input type="number" class="form-control" id="projMonths" value="6" min="1" max="120" style="width:80px">
          <span class="settings-hint" style="white-space:nowrap">mesi</span>
        </span>
        <label class="form-label" style="margin:0;white-space:nowrap">Conti:</label>
        <select class="form-control" id="projAccounts" multiple style="min-width:160px;height:56px">
          ${accounts.map(a=>`<option value="${a.id}" selected>${a.icon} ${a.name}</option>`).join('')}
        </select>
      </div>
      <div class="proj-chart-wrap"><canvas id="projChart"></canvas></div>
      <div id="projTable" style="margin-top:16px;overflow-x:auto"></div>
    </div>`;

  document.getElementById('projRange').addEventListener('change', () => {
    _projRange = document.getElementById('projRange').value;
    document.getElementById('projCustomWrap').style.display = _projRange==='custom' ? 'flex' : 'none';
    loadProjectionChart(accounts);
  });
  ['projAccounts','projMonths'].forEach(id =>
    document.getElementById(id).addEventListener('change', () => loadProjectionChart(accounts)));
  await loadProjectionChart(accounts);
}

async function loadProjectionChart(accounts) {
  const range      = document.getElementById('projRange')?.value || '6m';
  const customMths = document.getElementById('projMonths')?.value;
  const { from_date, to_date } = projRangeToFilter(range, customMths);
  if (!from_date || !to_date) return;
  const selOpts = [...(document.getElementById('projAccounts')?.selectedOptions||[])];
  const accIds  = selOpts.map(o=>o.value).join(',');

  let data;
  try { data = await api.getProjection({from_date, to_date, account_ids:accIds}); }
  catch(e) { toast(e.message,'error'); return; }

  const { series, accounts: accList } = data;
  const dates = [...new Set(series.map(p=>p.date))].sort();
  const CHART_COLORS = ['#58a6ff','#3fb950','#f85149','#d29922','#a371f7','#f0883e','#00d4aa','#8b949e'];

  const datasets = accList.map((a,i) => {
    const aid = a.id;
    const pts = dates.map(d => {
      const found = series.find(p=>p.date===d && p.account_id===aid);
      return found ? found.balance : null;
    });
    return {
      label: a.name,
      data: pts,
      borderColor: CHART_COLORS[i % CHART_COLORS.length],
      backgroundColor: CHART_COLORS[i % CHART_COLORS.length] + '22',
      fill: false, tension: 0.3, pointRadius: 2, spanGaps: true
    };
  });

  if (schedCharts.proj) schedCharts.proj.destroy();
  const ctx = document.getElementById('projChart');
  if (!ctx) return;
  schedCharts.proj = new Chart(ctx, {
    type: 'line',
    data: { labels: dates, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color:'#8b949e' } } },
      scales: {
        x: { ticks:{ color:'#8b949e', maxTicksLimit:14 }, grid:{ color:'#21262d' } },
        y: { ticks:{ color:'#8b949e', callback: v => fmt.currency(v) }, grid:{ color:'#21262d' } }
      }
    }
  });

  // ── Tabella saldo mensile ──────────────────────────────────────────────────
  // Per ogni mese nel range, prendi l'ultimo punto disponibile per ciascun conto
  const monthKeys = [...new Set(dates.map(d=>d.slice(0,7)))].sort();
  const tbl = document.getElementById('projTable');
  if (!tbl || !monthKeys.length) return;

  const monthBalances = monthKeys.map(m => {
    const datesOfMonth = dates.filter(d=>d.startsWith(m));
    const lastDate = datesOfMonth[datesOfMonth.length-1];
    return { month: m, lastDate };
  });

  tbl.innerHTML = `
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead><tr>
        <th style="text-align:left;padding:5px 8px;border-bottom:1px solid var(--border);color:var(--txt2)">Mese</th>
        ${accList.map(a=>`<th style="text-align:right;padding:5px 8px;border-bottom:1px solid var(--border);color:var(--txt2)">${a.name}</th>`).join('')}
      </tr></thead>
      <tbody>${monthBalances.map(({month,lastDate}) => {
        const cells = accList.map(a => {
          const pt = series.find(p=>p.date===lastDate && p.account_id===a.id);
          const bal = pt ? pt.balance : null;
          const color = bal!=null && bal<0 ? 'color:var(--expense)' : '';
          return `<td style="text-align:right;padding:4px 8px;border-bottom:1px solid var(--border);${color}">${bal!=null?fmt.currency(bal):'—'}</td>`;
        }).join('');
        return `<tr><td style="padding:4px 8px;border-bottom:1px solid var(--border)">${month}</td>${cells}</tr>`;
      }).join('')}</tbody>
    </table>`;
}

let _cfRange = '1y';

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
          <input type="number" class="form-control" id="cfMonths" value="6" min="1" max="120" style="width:80px">
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
    loadCashflowChart();
  });
  ['cfAccounts','cfMonths'].forEach(id =>
    document.getElementById(id).addEventListener('change', loadCashflowChart));
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
      plugins: { legend: { labels: { color:'#8b949e' } } },
      scales: {
        x: { ticks:{ color:'#8b949e' }, grid:{ color:'#21262d' } },
        y: { ticks:{ color:'#8b949e', callback: v => fmt.currency(v) }, grid:{ color:'#21262d' } }
      }
    }
  });
}

window.editSched = async id => {
  const [scheds, accounts, categories] = await Promise.all([
    api.getScheduled(), api.getAccounts(), api.getCategories()
  ]);
  const s = scheds.find(x=>x.id===id);
  if (s) showScheduledModal(s, accounts, categories);
};

window.deleteSched = async id => {
  const ok = await confirm('Elimina transazione pianificata', 'Eliminare questa transazione pianificata?');
  if (!ok) return;
  await api.deleteScheduled(id);
  toast('Transazione pianificata eliminata');
  renderSchedLista();
};

window.skipOcc = async (id, date) => {
  await api.skipOccurrence(id, date);
  toast('Occorrenza saltata — ricomparirà alla prossima scadenza');
  renderSchedLista();
};

window.registerOccurrence = async (idx) => {
  const u = window._occCache[idx];
  if (!u) return;
  const [cats, accs, tags] = await Promise.all([
    api.getCategories(), api.getAccounts(), api.getTags()
  ]);
  const today = new Date().toISOString().slice(0,10);
  const prefilled = {
    id: null,
    date: today,
    amount: u.amount,
    type: u.type,
    category_id: u.category_id  || null,
    account_id: u.account_id,
    to_account_id: u.to_account_id || null,
    description: u.description || '',
    color: u.color || null,
    tag_ids: []
  };
  showTxModal(prefilled, cats, accs, u.type, tags, async () => {
    await api.skipOccurrence(u.id, u.date);
    renderSchedLista();
  });
};

function showScheduledModal(sched, accounts, categories) {
  const isEdit = !!sched;
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
        <select class="form-control" id="sc_cat"></select>
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
          ${accounts.map(a=>`<option value="${a.id}" ${sched?.account_id==a.id?'selected':''}>${a.icon} ${a.name}</option>`).join('')}
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
    </div>`;

  function updateSchedCatSelect(keepSelected) {
    const type = document.getElementById('sc_type')?.value;
    const sel  = document.getElementById('sc_cat');
    if (!sel) return;
    if (type === 'transfer') { sel.innerHTML = '<option value="">Nessuna categoria</option>'; return; }
    const cats = type === 'expense' ? expCats : incCats;
    sel.innerHTML = `<option value="">— Seleziona —</option>${buildCatOptions(cats, keepSelected)}`;
  }

  window.schedToggleCats = () => {
    const type = document.getElementById('sc_type')?.value;
    const toAcc = document.getElementById('sc_toAccGroup');
    if (toAcc) toAcc.style.display = type === 'transfer' ? '' : 'none';
    updateSchedCatSelect(null);
  };

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
      is_active:     document.getElementById('sc_active').checked ? 1 : 0,
      color: document.getElementById('sc_color_use')?.checked
               ? document.getElementById('sc_color').value : null,
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

  // populate category select after modal renders
  setTimeout(() => updateSchedCatSelect(sched?.category_id), 30);
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

async function init() {
  // Nascondo gli handle se si parte massimizzato
  const {maximized} = await api.isMaximized();
  document.querySelectorAll('.rh').forEach(el => el.style.display = maximized ? 'none' : '');
  await updateSidebar();
  await renderDashboard();
  // Notifica scadute (non bloccante, dopo il render)
  const overdue = await api.getOverdue();
  if (overdue.length) showOverdueNotice(overdue);
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
