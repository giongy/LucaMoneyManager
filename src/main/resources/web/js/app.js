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

// ─── Performance tracking ─────────────────────────────────────────────────────
let _perfEnabled = false;
const _perfBuf = [];          // { method, roundMs, ts }
const _PERF_MAX = 150;

function _perfRecord(method, roundMs) {
  if (_perfBuf.length >= _PERF_MAX) _perfBuf.shift();
  _perfBuf.push({ method, roundMs, ts: Date.now() });
}

function callJava(method, params = {}) {
  const payload = _toB64(JSON.stringify({ method, params }));
  const t0 = _perfEnabled ? performance.now() : 0;

  const finish = result => {
    if (_perfEnabled) _perfRecord(method, Math.round(performance.now() - t0));
    return result;
  };

  if (typeof window.cefQuery === 'function') {
    return new Promise((resolve, reject) => {
      window.cefQuery({
        request: payload,
        onSuccess: r => resolve(finish(JSON.parse(_fromB64(r)))),
        onFailure: (_code, msg) => { finish(null); reject(new Error(msg)); }
      });
    });
  }
  // Modalità browser: usa HTTP bridge
  return fetch('/bridge', { method: 'POST', body: payload })
    .then(r => r.text())
    .then(b64 => finish(JSON.parse(_fromB64(b64))));
}

const api = {
  // Finestra
  minimize:    ()          => callJava('minimize'),
  maximize:    ()          => callJava('maximize'),
  close:       ()          => callJava('close'),
  getDbPath:      ()          => callJava('getDbPath'),
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

  // Categorie (cache in-session: invalidata ad ogni modifica)
  _categoriesCache: null,
  getCategories: async function() {
    if (this._categoriesCache) return this._categoriesCache;
    this._categoriesCache = await callJava('getCategories');
    return this._categoriesCache;
  },
  _invalidateCategories() { this._categoriesCache = null; },
  addCategory:      async data => { api._invalidateCategories(); return callJava('addCategory',     data); },
  updateCategory:   async data => { api._invalidateCategories(); return callJava('updateCategory',  data); },
  deleteCategory:   async id   => { api._invalidateCategories(); return callJava('deleteCategory',  {id}); },
  reassignCategory: async data => { api._invalidateCategories(); return callJava('reassignCategory', data); },
  getCategoryUsage: id => callJava('getCategoryUsage', {id}),

  // Tag (cache in-session: invalidata ad ogni modifica)
  _tagsCache: null,
  getTags: async function() {
    if (this._tagsCache) return this._tagsCache;
    this._tagsCache = await callJava('getTags');
    return this._tagsCache;
  },
  _invalidateTags() { this._tagsCache = null; },
  addTag:                 async data => { api._invalidateTags(); return callJava('addTag',    data); },
  updateTag:              async data => { api._invalidateTags(); return callJava('updateTag', data); },
  deleteTag:              async id   => { api._invalidateTags(); return callJava('deleteTag', {id}); },
  getTransactionsWithTag: name => callJava('getTransactionsWithTag', {name}),

  // Range Preset
  getRangePresets:    ()     => callJava('getRangePresets'),
  addRangePreset:     data   => callJava('addRangePreset',    data),
  updateRangePreset:  data   => callJava('updateRangePreset', data),
  deleteRangePreset:  data   => callJava('deleteRangePreset', data),

  // Transazioni
  getTransactions:             f    => callJava('getTransactions',             f || {}),
  getTransactionSplits:        id   => callJava('getTransactionSplits',        {id}),
  addTransaction:              async data  => { api._invalidateAccounts(); return callJava('addTransaction',    data); },
  updateTransaction:           async data  => { api._invalidateAccounts(); return callJava('updateTransaction', data); },
  deleteTransaction:           async id    => { api._invalidateAccounts(); return callJava('deleteTransaction', {id}); },
  updateTransactionReconciled: (id, reconciled) => callJava('updateTransactionReconciled', {id, reconciled}),
  getAccountSummary:           account_id => callJava('getAccountSummary',    {account_id}),

  // Budget
  getBudgets:  (month,year) => callJava('getBudgets', {month,year}),
  setBudget:   data         => callJava('setBudget',  data),
  deleteBudget:id           => callJava('deleteBudget',{id}),
  getBudgetYear: y          => callJava('getBudgetYear', {year:y}),
  setBudgetBulk: data       => callJava('setBudgetBulk', data),
  deleteBudgetMonth: data      => callJava('deleteBudgetMonth', data),
  deleteBudgetYear:  year      => callJava('deleteBudgetYear', {year}),
  setBudgetConfig: data       => callJava('setBudgetConfig', data),
  generateBudget: data      => callJava('generateBudget', data),
  getBudgetYears: ()        => callJava('getBudgetYears', {}),

  // Portafoglio
  getPortfolio:             ()      => callJava('getPortfolio', {}),
  getPortfolioTransactions: (id)    => callJava('getPortfolioTransactions', {portfolio_id: id}),
  buyStock:                 (data)  => callJava('buyStock', data),
  sellStock:                (data)  => callJava('sellStock', data),
  updateStockPrice:         (id, p) => callJava('updateStockPrice', {id, price: p}),
  fetchOnlinePrice:         (isin)  => callJava('fetchOnlinePrice', {isin}),
  importPosition:           (data)  => callJava('importPosition', data),
  registerCoupon:           (data)  => callJava('registerCoupon', data),
  registerPortfolioExpense: (data)  => callJava('registerPortfolioExpense', data),
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
  reloadDb: async path => { api._invalidateAccounts(); api._invalidateCategories(); api._invalidateTags(); return callJava('reloadDb', {path}); },
  chooseBackupDir:       ()             => callJava('chooseBackupDir', {}),
  chooseAttachmentsDir:  ()             => callJava('chooseAttachmentsDir', {}),
  chooseAttachmentFile:  ()             => callJava('chooseAttachmentFile', {}),
  attachFile:            (tx_id, source_path, old_path) => callJava('attachFile', {tx_id, source_path, old_path: old_path||null}),
  openAttachment:        (path)         => callJava('openAttachment', {path}),
  removeAttachment:      (tx_id, path)  => callJava('removeAttachment', {tx_id, path: path||null}),
  openSettingsFile:      ()             => callJava('openSettingsFile', {}),
  openAppLog:            ()             => callJava('openAppLog', {}),
  openUrl:           (url)   => callJava('openUrl', {url}),
  resetJcef:         ()      => callJava('resetJcef', {}),
  doBackup:        ()         => callJava('doBackup', {}),
  listBackups:     ()         => callJava('listBackups', {}),
  restoreBackup:   (path)     => callJava('restoreBackup', {path}),

  // Pianificate
  getScheduled:    ()    => callJava('getScheduled'),
  addScheduled:    data  => callJava('addScheduled', data),
  updateScheduled: data  => callJava('updateScheduled', data),
  deleteScheduled: id    => callJava('deleteScheduled', {id}),
  getUpcoming:     (n)   => callJava('getUpcoming',    {limit: n||15}),
  getUpcomingAll:  (n)   => callJava('getUpcomingAll', {limit: n||15}),
  getOverdue:      ()    => callJava('getOverdue'),
  getDueToday:     ()    => callJava('getDueToday'),
  advanceScheduled: (id, date, transactionId) => callJava('advanceScheduled', {id, date, transaction_id: transactionId ?? null}),
  getProjection:          data  => callJava('getProjection', data),
  getProjectionByCategory:data  => callJava('getProjectionByCategory', data),
  saveForecast:           data  => callJava('saveForecast', data),
  getForecasts:           ()    => callJava('getForecasts'),
  deleteForecast:         data  => callJava('deleteForecast', data),
  archiveForecast:        data  => callJava('archiveForecast', data),
  getForecastDetail:      data  => callJava('getForecastDetail', data),

  // Analytics
  getCategoryMonthTable: (months) => callJava('getCategoryMonthTable', { months }),
  getMonthlyBalance:          (months) => callJava('getMonthlyBalance',         { months }),
  getOldestTransactionMonth: ()       => callJava('getOldestTransactionMonth',  {}),
  getForecastExcluded:   ()           => callJava('getForecastExcluded',   {}),
  addForecastExcluded:   (id) => callJava('addForecastExcluded', {id}),
  removeForecastExcluded:(id)         => callJava('removeForecastExcluded', {id}),
  getForecastExpenseSplit:(months)    => callJava('getForecastExpenseSplit', {months}),

  // Resoconti
  getReports:   ()     => callJava('getReports'),
  saveReport:   data   => callJava('saveReport',   data),
  deleteReport: id     => callJava('deleteReport', {id}),

  // Log
  readLog:    (lines) => callJava('readLog', {lines: lines || 1000}),
  getLogInfo: ()      => callJava('getLogInfo'),
  purgeLog:   (p)     => callJava('purgeLog', p),

  // Prestazioni
  setPerfEnabled: (enabled) => callJava('setPerfEnabled', {enabled}),
  getPerfLog:     ()        => callJava('getPerfLog'),
  clearPerfLog:   ()        => callJava('clearPerfLog'),
};

/* ─── Chart theme helpers ─────────────────────────────────────────────────── */
Chart.defaults.animation.duration = 700;
Chart.defaults.animation.easing   = 'linear';

const chartColors = () => {
  const t = document.documentElement.dataset.theme;
  if (t === 'carta') return { tick: '#8a7860', grid: 'rgba(0,0,0,0.05)' };
  if (t === 'salvia') return { tick: '#5a7a60', grid: 'rgba(0,0,0,0.06)' };
  return { tick: '#8b949e', grid: 'rgba(255,255,255,0.06)' };
};

const zoomOpts = () => ({
  zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' },
  pan:  { enabled: true, mode: 'x' }
});

/* ─── Account visibility helpers ─────────────────────────────────────────── */
const isAccountVisible = a =>
  _accFavoritesOnly ? (a.is_favorite && !a.is_closed) : true;
const isAccountActive  = a => !a.is_closed;

/* ─── Calculator helper ────────────────────────────────────────────────────── */
/** Valuta una semplice espressione +/- (es. "40+10.30", "100-49.70").
 *  Accetta sia virgola che punto come separatore decimale.
 *  Ritorna un Number >= 0 se valido, null altrimenti. */
function evalAmount(raw) {
  if (!raw || !raw.toString().trim()) return null;
  const s = raw.toString().replace(/,/g, '.').replace(/\s/g, '');
  if (!/^[0-9+\-*/.][0-9+\-*/.]*$/.test(s)) return null;
  // Split su + e - come nell'originale (lookahead, nessun lookbehind)
  const addTerms = s.split(/(?=[+\-])/).filter(t => t !== '');
  let result = 0;
  for (const term of addTerms) {
    // Estrai segno iniziale (+/-)
    let sign = 1, rest = term;
    if (rest[0] === '+') rest = rest.slice(1);
    else if (rest[0] === '-') { sign = -1; rest = rest.slice(1); }
    // Gestisci * e / all'interno del termine (split con delimitatori)
    const parts = rest.split(/([*\/])/);
    let val = parseFloat(parts[0]);
    if (isNaN(val)) return null;
    for (let i = 1; i < parts.length; i += 2) {
      const op = parts[i], n = parseFloat(parts[i + 1]);
      if (isNaN(n)) return null;
      if (op === '*') val *= n;
      else { if (n === 0) return null; val /= n; }
    }
    result += sign * val;
  }
  return result >= 0 ? result : null;
}

/* ─── Utils ───────────────────────────────────────────────────────────────── */
const fmt = {
  currency: v => new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(v ?? 0),
  price:    v => new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:4}).format(v ?? 0),
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
document.getElementById('themeToggleBtn').onclick = () => _toggleTheme();
document.getElementById('shortcutsBtn').onclick   = () => showShortcutsHelp();

/* ─── Router ──────────────────────────────────────────────────────────────── */
const PAGE_TITLES = {
  dashboard:'Dashboard', transactions:'Transazioni', accounts:'Conti',
  budgets:'Budget', portfolio:'Portafoglio', analytics:'Reports', reports:'Filtri', forecasts:'Previsioni', settings:'Impostazioni',
  scheduled:'Transazioni Pianificate', ranges:'Periodi personalizzati'
};
let currentPage = 'dashboard';
let charts = {};

function navigate(page) {
  if (currentPage === page) return;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`pg-${page}`).classList.add('active');
  document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
  document.getElementById('pageTitle').textContent = PAGE_TITLES[page];
  document.getElementById('pageTitleSub').textContent = '';
  currentPage = page;
  renderPage(page);
}

document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', () => {
    if (el.dataset.page === 'transactions') txFilters = { range: txFilters.range };
    if (el.dataset.page === 'budgets') _budgetTab = 'grid';
    navigate(el.dataset.page);
  });
});

function navigateToBudgetMese() {
  _budgetTab = 'mese';
  if (currentPage === 'budgets') _setBudgetTab('mese');
  else navigate('budgets');
}

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
    case 'ranges':       renderRangePresets(); break;
    case 'settings':     renderSettings();     break;
    case 'scheduled':    renderScheduled();    break;
    case 'forecasts':    renderForecasts();    break;
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
document.getElementById('modalConfirm').onclick = async () => { if (modalConfirmCallback) { const result = await modalConfirmCallback(); if (result !== false) closeModal(); } };

/* ─── Refresh after any transaction change ───────────────────────────────── */
let _dashboardDirty = false;
async function refreshAfterTxChange() {
  updateSidebar();
  renderTransactions();
  if (currentPage === 'dashboard') renderDashboard();
}

/* ─── Sidebar accounts ───────────────────────────────────────────────────── */
async function updateSidebar() {
  const accounts = await api.getAccounts();
  const el = document.getElementById('sidebarAccounts');
  const visAcc = accounts.filter(isAccountVisible);
  const grouped = {};
  visAcc.forEach(a => { (grouped[a.type] = grouped[a.type] || []).push(a); });
  const orderedTypes = [...new Set([..._accTypeOrder.filter(t => grouped[t]), ...Object.keys(grouped)])];
  el.innerHTML = orderedTypes.flatMap(t => grouped[t]).map(a => `
    <div class="sidebar-account-item" style="--acc-color:${a.color||'var(--border)'};${a.is_closed?'opacity:.55':''}"
         onclick="navigateToAccountTx(${a.id})" title="${a.name}">
      <div class="acc-tile-icon">${a.icon}</div>
      <div class="acc-tile-name">${a.name}</div>
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

function _renderDashBudgetBubbles(budgetYear) {
  const el = document.getElementById('dashBudgetBubbles');
  if (!el) return;

  const { categories = [], budgets = [], configs = [], actuals = [] } = budgetYear;
  const curMonth  = new Date().getMonth() + 1;
  const curYear   = new Date().getFullYear();
  const monthName = new Date(curYear, curMonth - 1).toLocaleString('it-IT', { month: 'long' });

  // Effective budget per mese (stessa logica pagina budget)
  const _bMap = {};
  budgets.forEach(b => { if (!_bMap[b.category_id]) _bMap[b.category_id] = {}; _bMap[b.category_id][b.month] = b.amount; });
  const _cfgMap = {};
  configs.forEach(c => { _cfgMap[c.category_id] = c; });
  const _getEff = catId => {
    const cfg = _cfgMap[catId], stored = _bMap[catId] || {};
    if (!cfg || !cfg.master_amount) return stored;
    const locked = cfg.mode === 'annuale' ? cfg.master_amount : cfg.master_amount * 12;
    const pinned = Object.keys(stored).map(Number);
    const pinnedSum = pinned.reduce((s, m) => s + (stored[m] || 0), 0);
    const free = 12 - pinned.length;
    const freeVal = free > 0 ? Math.round((locked - pinnedSum) / free * 100) / 100 : 0;
    const res = { ...stored };
    for (let m = 1; m <= 12; m++) if (res[m] === undefined) res[m] = Math.max(0, freeVal);
    return res;
  };

  // Speso questo mese per categoria
  const actualMap = {};
  actuals.forEach(a => { if (a.month === curMonth) actualMap[a.category_id] = a.total; });

  // Categorie foglia (senza figli)
  const parentIds = new Set(categories.filter(c => c.parent_id).map(c => c.parent_id));
  const leafCats  = categories.filter(c => !parentIds.has(c.id));
  const catMap    = Object.fromEntries(categories.map(c => [c.id, c]));

  const allCatData = leafCats.map(c => ({
    ...c,
    budget: _getEff(c.id)[curMonth] || 0,
    actual: actualMap[c.id] || 0,
    parent_name: c.parent_id ? (catMap[c.parent_id]?.name || '') : '',
  }));
  const catData = allCatData.filter(c => c.actual > 0 || c.type === 'income');

  if (!catData.length) { el.innerHTML = ''; el.style.display = 'none'; return; }
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
    const pct  = budget > 0 ? Math.min(spent / budget, 1) : 0;
    const over = budget > 0 && spent > budget;
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
    const amtColor = c.budget <= 0
      ? 'var(--txt3)'
      : c.type === 'income'
        ? (c.actual > c.budget ? 'var(--income)' : c.actual < c.budget ? 'var(--expense)' : 'var(--txt3)')
        : (c.actual < c.budget ? 'var(--income)' : c.actual > c.budget ? 'var(--expense)' : 'var(--txt3)');
    const hexColor  = c.color?.startsWith('#') ? c.color : null;
    const bg        = hexColor ? hexColor + '28' : 'rgba(255,255,255,0.07)';
    const catLine   = c.parent_name ? `${c.parent_name} : ${c.name}` : c.name;
    const remaining = c.budget > 0
      ? (c.type === 'income' ? c.actual - c.budget : c.budget - c.actual)
      : null;
    const hesc = s => String(s).replace(/"/g, '&quot;');
    return `<div class="budget-bubble" onclick="_dashBubbleDetail(${c.id})"
        data-tt-cat="${hesc(catLine)}"
        data-tt-budget="${hesc(c.budget > 0 ? fmt.currency(c.budget) : '—')}"
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
        <span style="color:var(--txt3);font-size:11px">${c.budget > 0 ? fmt.currency(c.budget) : '—'}</span>
      </div>
    </div>`;
  };

  // Cella totale
  const _tot = (label, actual, budget, color) =>
    `<div style="text-align:right">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--txt3);margin-bottom:2px">${label}</div>
      <div style="font-size:13px;font-weight:700;color:${color}">${fmt.currency(actual)}</div>
      ${budget !== 0 ? `<div style="font-size:11px;color:var(--txt3)">/ ${fmt.currency(budget)}</div>` : ''}
    </div>`;

  const netColor = netActual >= 0 ? 'var(--income)' : 'var(--expense)';

  el.innerHTML = `
    <div class="card-header">
      <span class="card-title">Budget — ${monthName} ${curYear}</span>
      <div style="display:flex;gap:6px">
        <button class="btn btn-ghost" onclick="navigateToBudgetMese()">Analisi mese →</button>
        <button class="btn btn-ghost" onclick="navigate('budgets')">Gestisci →</button>
      </div>
    </div>
    <div style="padding:0 16px 8px;flex:1">
      ${expCats.length ? `
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--txt3);margin-bottom:8px">Uscite</div>
        <div class="dash-bubbles-scroll-wrap" style="margin-bottom:${incCats.length ? '14' : '0'}px">
          <div class="dash-budget-bubbles">${expCats.map(_bubble).join('')}</div>
        </div>` : ''}
      ${incCats.length ? `
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--txt3);margin-bottom:8px">Entrate</div>
        <div class="dash-bubbles-scroll-wrap">
          <div class="dash-budget-bubbles">${incCats.map(_bubble).join('')}</div>
        </div>` : ''}
    </div>
    <div style="display:flex;justify-content:flex-end;gap:24px;padding:10px 16px;margin-top:auto;border-top:1px solid var(--border)">
      ${expCats.length ? _tot('Uscite',  totExpActual, totExpBudget, 'var(--expense)') : ''}
      ${incCats.length ? _tot('Entrate', totIncActual, totIncBudget, 'var(--income)')  : ''}
      ${expCats.length && incCats.length ? _tot('Netto', netActual, netBudget, netColor) : ''}
    </div>`;
}

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
                ${a.type==='credit'?`<span id="cc-cur-${a.id}" style="display:block;font-size:11px;color:var(--txt2);font-weight:400"></span>`:''}
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
            <div style="display:flex;align-items:center;gap:0">
              <span class="flex-center-8" style="flex:1">
                <span>Totale Conti:</span>
                <span class="acc-bal" style="color:${contiBalance<0?'var(--expense)':'var(--income)'}">${fmt.currency(contiBalance)}</span>
              </span>
              ${investBalance !== 0 ? `

              <span style="flex:1;display:flex;align-items:center;justify-content:flex-end;gap:8px">
                <span style="color:var(--txt2)">Investimenti</span>
                <span class="acc-bal" style="color:var(--accent2)">${fmt.currency(investBalance)}</span>
              </span>` : ''}
            </div>
          </td>
        </tr>
      </tbody>
    </table>`;
}

window._dashQuickTx = async (accountId, type) => {
  const [cats, accs, tags] = await Promise.all([api.getCategories(), api.getAccounts(), api.getTags()]);
  showTxModal({account_id: accountId, type}, cats, accs, type, tags, async () => {
    api._invalidateAccounts();
    const _freshAccs = await api.getAccounts();
    _renderDashAccountsWidget(_freshAccs);
    _fillCreditMonthDash(_freshAccs);
  });
};

async function renderDashboard() {
  api.getDbPath().then(r => {
    const el = document.getElementById('pageTitleSub');
    if (el) el.textContent = '(' + r.path + ')';
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
          <th>Categoria</th><th>Descrizione</th><th>Giorni</th><th class="text-right">Importo</th>
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
      <div class="card dash-chart-sm">
        <div class="card-header"><span class="card-title">Spese per categoria</span></div>
        <div class="dash-chart-wrap"><canvas id="pieChart"></canvas></div>
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

  const [stats, accounts, recent, monthly, catData, upcoming, budgetYear] = await Promise.all([
    api.getDashboardStats(dashYear),
    api.getAccounts(),
    api.getTransactions({limit:12, sort_desc:true}),
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
  _fillCreditMonthDash(accounts);
  _renderDashBudgetBubbles(budgetYear);
  _initBubbleDrag();

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
        responsive:true, maintainAspectRatio:false,
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
    plugins:[_dashGradPlugin],
    data: { labels: months, datasets: [
      { label:'Risparmio+', data: savArr.map(v => v >= 0 ? v : null),
        _gradColors:['rgba(63,185,80,.9)','rgba(63,185,80,.2)'], backgroundColor:'rgba(63,185,80,.75)', borderRadius:4 },
      { label:'Risparmio-', data: savArr.map(v => v < 0 ? v : null),
        _gradColors:['rgba(248,81,73,.2)','rgba(248,81,73,.9)'], backgroundColor:'rgba(248,81,73,.75)', borderRadius:4 }
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
      options: { indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}},
        scales:{ x:{ticks:{color:chartColors().tick,font:{size:10},stepSize:200},grid:{color:chartColors().grid}},
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
let _reportsTab       = 'resoconti';
let _fcChart          = null;
let _fcParams         = { histMonths: 12, horizonMonths: 6, sensitivity: 'media' };
let _fcManualExcl     = new Set();   // mesi forzatamente esclusi dall'utente
let _fcManualIncl     = new Set();   // mesi forzatamente reintegrati dall'utente
let _fcExcludedTxIds  = new Set();   // IDs transazioni escluse dal calcolo
let _fcTxAdjustments  = {};          // { ym: { incAdj, expAdj } } — aggiustamenti tx
let _fcMonthTxCache   = {};          // { ym: tx[] } — cache transazioni per mese
let _fcExpandedMonths = new Set();   // mesi espansi nella tabella storica

// Formatta una Date come YYYY-MM-DD nel fuso locale (toISOString userebbe UTC e sfaserebbe di 1 giorno)
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
    <div id="txScrollWrap" style="flex:1;overflow:auto;padding:0 16px 16px">
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
          ${accounts.filter(a => isAccountActive(a) && a.type !== 'investment').map(a=>`<option value="${a.id}" ${(tx ? tx.account_id==a.id : String(a.id)===String(txFilters.account_id))?'selected':''}>${a.icon} ${a.name}</option>`).join('')}
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
    const parentIds = new Set(cats.filter(c => c.parent_id).map(c => c.parent_id));
    const leafs = cats.filter(c => c.parent_id || !parentIds.has(c.id));
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
      if (onAfterSave) await onAfterSave(txResult);
      closeModal();
      toast(isEdit ? 'Transazione aggiornata' : 'Transazione aggiunta');
      refreshAfterTxChange();
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
    const parentIds = new Set(cats.filter(c => c.parent_id).map(c => c.parent_id));
    const leaves = cats.filter(c => c.parent_id || !parentIds.has(c.id));
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
      } catch(e) { /* ignora */ }
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
      e.stopPropagation();
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

  // ── Click → transazioni del conto ───────────────────────────────────────────
  grid.querySelectorAll('.account-card').forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', e => {
      if (e.target.closest('.account-actions, .acc-drag-handle')) return;
      navigateToAccountTx(Number(card.dataset.id));
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

async function _creditCardMonthTotal(cardId, y, m) {
  const from = `${y}-${String(m).padStart(2,'0')}-01`;
  const to   = `${y}-${String(m).padStart(2,'0')}-${new Date(y, m, 0).getDate()}`;
  const txs  = await api.getTransactions({ account_id: cardId, date_from: from, date_to: to, limit: 5000 });
  return txs.filter(t => t.type !== 'transfer').reduce((s,t) => s + t.amount, 0);
}

async function _fillCreditMonthDash(accounts) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth() + 1;
  const monthName = now.toLocaleString('it-IT', { month: 'long' });
  for (const a of accounts.filter(a => a.type === 'credit')) {
    const total = await _creditCardMonthTotal(a.id, y, m);
    const el = document.getElementById(`cc-cur-${a.id}`);
    if (el) el.textContent = `${monthName}: ${fmt.currency(total)}`;
  }
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
    const total = await _creditCardMonthTotal(cardId, y, m);
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
    if (!sourceId) { toast('Seleziona il conto sorgente', 'error'); return false; }
    if (!amount || amount <= 0) { toast('Importo non valido', 'error'); return false; }
    if (!date)    { toast('Inserisci la data', 'error'); return false; }
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
  }, 'Salva', 'btn-primary', 'modal-sm');

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
let _budgetMeseSort  = 'rimasto';
let _budgetMeseMonth = new Date().getMonth() + 1;

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
      <div class="scheduled-tabs">
        <button class="sched-tab ${_budgetTab==='grid'?'active':''}"        data-btab="grid"        onclick="_setBudgetTab('grid')">📊 Budget</button>
        <button class="sched-tab ${_budgetTab==='andamento'?'active':''}"   data-btab="andamento"   onclick="_setBudgetTab('andamento')">📈 Andamento</button>
        <button class="sched-tab ${_budgetTab==='scostamenti'?'active':''}" data-btab="scostamenti" onclick="_setBudgetTab('scostamenti')">📉 Scostamenti</button>
        <button class="sched-tab ${_budgetTab==='mese'?'active':''}"        data-btab="mese"        onclick="_setBudgetTab('mese')">🗓 Mese</button>
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
    showToast(`Budget ${budgetYear} eliminato`);
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

  // Ritorna i 12 valori mensili effettivi: DB per i mesi manuali, distribuiti per i liberi
  const getEffective = catId => {
    const cfg = configMap[catId], stored = budgetMap[catId] || {};
    if (!cfg || !cfg.master_amount) return stored;
    const lockedTotal = cfg.mode === 'annuale' ? cfg.master_amount : cfg.master_amount * 12;
    const pinnedMonths = Object.keys(stored).map(Number);
    const pinnedSum = pinnedMonths.reduce((s, m) => s + (stored[m] || 0), 0);
    const freeCount = 12 - pinnedMonths.length;
    const freeVal = freeCount > 0 ? Math.round((lockedTotal - pinnedSum) / freeCount * 100) / 100 : 0;
    const result = {...stored};
    for (let m = 1; m <= 12; m++) if (result[m] === undefined) result[m] = Math.max(0, freeVal);
    return result;
  };

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
            <span style="font-size:11px;color:var(--txt2)">${expRemaining >= 0 ? 'Rimasto' : 'Sforo totale'}</span>
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
    openModal(`📊 ${catName} — ${budgetYear}`, body, null);
  } else {
    document.getElementById('modalTitle').textContent = `📊 ${catName} — ${budgetYear}`;
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
  _portfolioItems = items;
  const investAccounts = accounts.filter(a => a.type === 'investment' && !a.is_closed);

  const visibleItems = items
    .filter(i => _portfolioActiveOnly ? i.quantity > 0 : true)
    .filter(i => _portfolioTypeFilter === 'all' ? true : (i.asset_type || 'equity') === _portfolioTypeFilter);

  const totalInvested    = visibleItems.reduce((s,i) => s + portfolioItemValue(i, true), 0);
  const totalCurrent     = visibleItems.reduce((s,i) => s + portfolioItemValue(i, false), 0);
  const totalCommissions = visibleItems.reduce((s,i) => s + (i.total_commissions || 0), 0);
  const totalPnL         = totalCurrent - totalInvested;
  const pnlPct           = totalInvested ? (totalPnL/totalInvested)*100 : 0;

  pg.innerHTML = `
    <div style="display:flex;align-items:center;gap:0;border-bottom:1px solid var(--border);margin-bottom:16px">
      <button class="btn" onclick="_setPortfolioTab('portfolio')"
        style="border-radius:0;border:none;border-bottom:2px solid ${_portfolioTab==='portfolio'?'var(--accent)':'transparent'};
               color:${_portfolioTab==='portfolio'?'var(--accent)':'var(--txt2)'};font-weight:${_portfolioTab==='portfolio'?'600':'400'};
               padding:8px 18px;background:none">📋 Portafoglio</button>
      <button class="btn" onclick="_setPortfolioTab('analisi')"
        style="border-radius:0;border:none;border-bottom:2px solid ${_portfolioTab==='analisi'?'var(--accent)':'transparent'};
               color:${_portfolioTab==='analisi'?'var(--accent)':'var(--txt2)'};font-weight:${_portfolioTab==='analisi'?'600':'400'};
               padding:8px 18px;background:none">📊 Analisi</button>
      <button class="btn" onclick="_setPortfolioTab('storico')"
        style="border-radius:0;border:none;border-bottom:2px solid ${_portfolioTab==='storico'?'var(--accent)':'transparent'};
               color:${_portfolioTab==='storico'?'var(--accent)':'var(--txt2)'};font-weight:${_portfolioTab==='storico'?'600':'400'};
               padding:8px 18px;background:none">📋 Storico</button>
      ${investAccounts.length && _portfolioTab==='portfolio' ? `
        <div style="margin-left:auto;padding-bottom:2px;display:flex;align-items:center;gap:6px">
          <div style="display:flex;flex-direction:column;align-items:center;gap:3px;padding:4px 8px;background:var(--bg3);border-radius:8px">
            <span style="font-size:10px;color:var(--txt3);text-transform:uppercase;letter-spacing:.5px;line-height:1">Visualizza</span>
            <div class="theme-toggle-group" style="margin:0">
              <button class="btn theme-btn ${_portfolioActiveOnly?'theme-btn-active':''}"  onclick="_setPortfolioFilter(true)">Solo attivi</button>
              <button class="btn theme-btn ${!_portfolioActiveOnly?'theme-btn-active':''}" onclick="_setPortfolioFilter(false)">Tutti</button>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:center;gap:3px;padding:4px 8px;background:var(--bg3);border-radius:8px">
            <span style="font-size:10px;color:var(--txt3);text-transform:uppercase;letter-spacing:.5px;line-height:1">Tipo</span>
            <div class="theme-toggle-group" style="margin:0">
              <button class="btn theme-btn ${_portfolioTypeFilter==='all'?'theme-btn-active':''}"    onclick="_setPortfolioTypeFilter('all')">Tutti</button>
              <button class="btn theme-btn ${_portfolioTypeFilter==='equity'?'theme-btn-active':''}" onclick="_setPortfolioTypeFilter('equity')">Azioni</button>
              <button class="btn theme-btn ${_portfolioTypeFilter==='bond'?'theme-btn-active':''}"   onclick="_setPortfolioTypeFilter('bond')">Obbligazioni</button>
            </div>
          </div>
          <div style="width:1px;height:36px;background:var(--border);margin:0 10px;flex-shrink:0"></div>
          <button class="btn btn-success" id="btnRefreshPrices">🌐 Aggiorna valori online</button>
          <div style="width:8px;flex-shrink:0"></div>
          <button class="btn btn-secondary" id="btnImportPos">📥 Carica esistente</button>
          <div style="width:8px;flex-shrink:0"></div>
          <button class="btn btn-primary" id="btnBuyStock">+ Acquista</button>
        </div>` : ''}
    </div>
    ${!investAccounts.length ? `
      <div class="card" style="padding:32px;text-align:center;color:var(--txt2)">
        <div style="font-size:32px;margin-bottom:12px">💼</div>
        <div style="font-size:16px;font-weight:600;margin-bottom:8px">Nessun conto investimento</div>
        <div style="margin-bottom:16px">Per usare il portafoglio crea prima un conto di tipo <strong>Investimento</strong>.</div>
        <button class="btn btn-primary" onclick="navigate('accounts')">Vai ai Conti →</button>
      </div>` : _portfolioTab === 'analisi' ? `
    <div id="pgPortfolioAnalisi"></div>
    ` : _portfolioTab === 'storico' ? `
    <div id="pgPortfolioStorico"></div>
    ` : `
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
            ['acquisto', 'Acquisto',      ''],
            ['ticker',   'Ticker',        ''],
            ['nome',     'Nome',          ''],
            ['paese',    'Paese',         ''],
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
        </tr></thead><tbody>
        ${(() => {
          let rows = visibleItems.slice();
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
              case 'acquisto': va = a.first_buy_date||'9999'; vb = b.first_buy_date||'9999'; break;
              case 'ticker':   va = a.ticker || '';     vb = b.ticker || '';     break;
              case 'nome':     va = a.name || '';       vb = b.name || '';       break;
              case 'paese':    va = a.country || '';    vb = b.country || '';    break;
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
          if (!rows.length) return '<tr><td colspan="13" style="text-align:center;padding:40px;color:var(--txt3)">Nessun titolo in portafoglio. Clicca "+ Acquista" per iniziare.<br><small style="color:var(--txt3)">Tasto destro su una riga per le azioni</small></td></tr>';
          return rows.map(i => {
            const isBond = i.asset_type === 'bond';
            const val = i._val, cost = i._cost, pnl = i._pnl, comm = i._comm;
            const pnlP = cost ? (pnl/cost)*100 : 0;
            const priceDisplay = isBond ? `${(i.avg_price||0).toFixed(4)} %` : fmt.price(i.avg_price);
            const priceUnit    = isBond ? '%' : '€';
            const typeBadge    = isBond
              ? `<span class="badge" style="background:#d29922;color:#fff;font-size:10px;padding:1px 5px;border-radius:4px">OBB</span>`
              : `<span class="badge" style="background:#58a6ff;color:#fff;font-size:10px;padding:1px 5px;border-radius:4px">AZI</span>`;
            const couponInfo = isBond && i.coupon_rate
              ? `<br><small style="color:var(--txt3);font-size:10px">${i.coupon_rate}% → netto ${((1-(i.coupon_tax||12.5)/100)*i.coupon_rate).toFixed(3)}%</small>`
              : '';
            const qtyDisplay = isBond
              ? `<span title="Nominale totale">${fmt.currency(i.quantity)}</span>`
              : i.quantity;
            const scadenzaDisplay = i.maturity_date || '<span style="color:var(--txt3)">—</span>';
            const countryDisplay = i.country
              ? `<span style="font-size:12px">${i.country}</span>`
              : `<span style="color:var(--txt3)">—</span>`;
            const firstBuyDisplay = i.first_buy_date
              ? `<span style="font-size:12px;white-space:nowrap">${i.first_buy_date}</span>`
              : `<span style="color:var(--txt3)">—</span>`;
            const priceStatus = _portfolioPriceStatus[i.id];
            const statusDot = priceStatus === 'ok'   ? `<span style="color:#3fb950;font-size:12px;margin-left:4px" title="Prezzo aggiornato">●</span>`
                            : priceStatus === 'fail' ? `<span style="color:#e3b341;font-size:12px;margin-left:4px" title="Non trovato online">●</span>`
                            :                         `<span style="color:var(--txt3);font-size:12px;margin-left:4px" title="Non ancora aggiornato">●</span>`;
            return `<tr oncontextmenu="_showPortfolioCtx(${i.id},event)" style="cursor:context-menu" title="Tasto destro per le azioni">
              <td style="white-space:nowrap">${typeBadge}${statusDot}</td>
              <td>${firstBuyDisplay}</td>
              <td class="td-main" style="font-weight:700">${i.ticker}</td>
              <td>${i.name}${couponInfo}</td>
              <td>${countryDisplay}</td>
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
            </tr>`;
          }).join('');
        })()}
        </tbody></table>
      </div>
    </div>`}`;

  if (investAccounts.length && _portfolioTab === 'portfolio') {
    document.getElementById('btnBuyStock').onclick      = () => showBuyModal(null, investAccounts, accounts).catch(e => toast(e.message,'error'));
    document.getElementById('btnImportPos').onclick     = () => showImportModal(investAccounts);
    document.getElementById('btnRefreshPrices').onclick = () => refreshPortfolioPrices();
  }
  if (investAccounts.length && _portfolioTab === 'analisi') {
    renderPortfolioAnalisi(items);
  }
  if (_portfolioTab === 'storico') {
    renderPortfolioStorico(items);
  }
}

function _setPortfolioTab(tab) {
  _portfolioTab = tab;
  renderPortfolio();
}

function _setPortStoricoFilter(f) {
  _portStoricoFilter = f;
  renderPortfolioStorico(_portfolioItems);
}

function _togglePortStorico(id) {
  if (_portStoricoExp.has(id)) _portStoricoExp.delete(id);
  else _portStoricoExp.add(id);
  renderPortfolioStorico(_portfolioItems);
}

async function renderPortfolioStorico(items) {
  const container = document.getElementById('pgPortfolioStorico');
  if (!container) return;
  container.innerHTML = `<div style="text-align:center;padding:32px;color:var(--txt3)">⏳ Caricamento…</div>`;

  const filtered = _portStoricoFilter === 'active' ? items.filter(i => i.quantity > 0)
                 : _portStoricoFilter === 'closed'  ? items.filter(i => !(i.quantity > 0))
                 : items;

  const txResults = await Promise.all(filtered.map(i => api.getPortfolioTransactions(i.id)));
  const withTxs   = filtered.map((item, idx) => ({ item, txs: txResults[idx] })).filter(x => x.txs.length > 0);

  const toolbar = `
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px">
      <div class="theme-toggle-group" style="margin:0">
        <button class="btn theme-btn ${_portStoricoFilter==='all'    ?'theme-btn-active':''}" onclick="_setPortStoricoFilter('all')">Tutti</button>
        <button class="btn theme-btn ${_portStoricoFilter==='active' ?'theme-btn-active':''}" onclick="_setPortStoricoFilter('active')">Attivi</button>
        <button class="btn theme-btn ${_portStoricoFilter==='closed' ?'theme-btn-active':''}" onclick="_setPortStoricoFilter('closed')">Chiusi</button>
      </div>
    </div>`;

  if (!withTxs.length) {
    container.innerHTML = toolbar + `<div class="empty-state"><div class="empty-icon">📋</div><p>Nessuno storico disponibile.</p></div>`;
    return;
  }

  const TYPE_LABEL = { buy:'Acquisto', sell:'Vendita', coupon:'Cedola', expense:'Spesa' };
  const TYPE_COLOR = { buy:'var(--expense)', sell:'var(--income)', coupon:'var(--income)', expense:'var(--expense)' };
  const TYPE_SIGN  = { buy:'-', sell:'+', coupon:'+', expense:'-' };

  let grandBuy = 0, grandSell = 0, grandCoupon = 0, grandExpense = 0;

  const cards = withTxs.map(({ item, txs }) => {
    const totBuy     = txs.filter(t=>t.type==='buy').reduce((s,t)=>s+t.quantity*t.price, 0);
    const totSell    = txs.filter(t=>t.type==='sell').reduce((s,t)=>s+t.quantity*t.price, 0);
    const totCoupon  = txs.filter(t=>t.type==='coupon').reduce((s,t)=>s+t.price, 0);
    const totExpense = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.price, 0);
    grandBuy += totBuy; grandSell += totSell; grandCoupon += totCoupon; grandExpense += totExpense;

    const collapsed = !_portStoricoExp.has(item.id);
    const net = totSell + totCoupon - totBuy - totExpense;

    const chips = [
      totBuy     > 0 ? `<span class="r-chip" style="color:var(--expense)">Acq. ${fmt.currency(totBuy)}</span>`      : '',
      totSell    > 0 ? `<span class="r-chip" style="color:var(--income)">Vend. ${fmt.currency(totSell)}</span>`     : '',
      totCoupon  > 0 ? `<span class="r-chip" style="color:var(--income)">Ced. ${fmt.currency(totCoupon)}</span>`    : '',
      totExpense > 0 ? `<span class="r-chip" style="color:var(--expense)">Sp. ${fmt.currency(totExpense)}</span>`   : '',
      `<span class="r-chip" style="font-weight:600;color:${net>=0?'var(--income)':'var(--expense)'}">Netto ${net>=0?'+':''}${fmt.currency(net)}</span>`,
    ].filter(Boolean).join('');

    const isBond = item.asset_type === 'bond';
    const rows = [...txs].sort((a, b) => a.date.localeCompare(b.date)).map(t => {
      const isValued = t.type !== 'coupon' && t.type !== 'expense';
      const total = isValued ? t.quantity * t.price : t.price;
      const priceDisplay = !isValued ? '—'
        : isBond ? `${(t.price * 100).toFixed(4)} %`
        : `${t.price.toFixed(4)} €`;
      return `<tr>
        <td style="width:130px">${fmt.date(t.date)}</td>
        <td style="width:120px"><span style="color:${TYPE_COLOR[t.type]||'var(--txt)'};font-weight:600">${TYPE_LABEL[t.type]||t.type}</span></td>
        <td style="width:120px;text-align:right">${isValued ? t.quantity : '—'}</td>
        <td style="width:180px;text-align:right">${priceDisplay}</td>
        <td style="width:180px;text-align:right;color:${TYPE_COLOR[t.type]||'var(--txt)'}">${TYPE_SIGN[t.type]||''}${fmt.currency(total)}</td>
        <td>${t.notes||''}</td>
      </tr>`;
    }).join('');

    return `
      <div class="card" style="margin-bottom:4px;${collapsed?'padding:6px 12px':''}">
        <div class="port-storico-row${collapsed?' port-storico-collapsed':''}" style="display:flex;align-items:center;gap:8px;cursor:pointer;user-select:none"
             onclick="_togglePortStorico(${item.id})">
          <span style="font-size:10px;color:var(--txt3);flex-shrink:0">${collapsed?'▶':'▼'}</span>
          <span style="font-weight:700;font-size:var(--fs-md,12px)">${item.ticker}</span>
          <span style="color:var(--txt2);font-size:var(--fs-md,12px)">${item.name}</span>
          <div style="display:flex;flex-wrap:wrap;gap:4px;margin-left:auto">${chips}</div>
        </div>
        ${collapsed ? '' : `
        <div class="table-wrap" style="margin-top:10px">
          <table style="table-layout:fixed;width:100%"><thead><tr>
            <th style="width:130px">Data</th>
            <th style="width:120px">Tipo</th>
            <th style="width:120px;text-align:right">Qtà</th>
            <th style="width:180px;text-align:right">Prezzo</th>
            <th style="width:180px;text-align:right">Totale</th>
            <th>Note</th>
          </tr></thead><tbody>${rows}</tbody></table>
        </div>`}
      </div>`;
  });

  const grandNet = grandSell + grandCoupon - grandBuy - grandExpense;
  const showExp  = grandExpense > 0;

  container.innerHTML = toolbar + cards.join('') + `
    <div class="card" style="margin-top:4px">
      <div style="font-weight:700;margin-bottom:10px">Totale complessivo</div>
      <div class="table-wrap">
        <table><thead><tr>
          <th class="text-right">Acquisti</th>
          <th class="text-right">Vendite</th>
          <th class="text-right">Cedole</th>
          ${showExp ? '<th class="text-right">Spese</th>' : ''}
          <th class="text-right">Netto</th>
        </tr></thead><tbody><tr>
          <td class="text-right amount-expense">-${fmt.currency(grandBuy)}</td>
          <td class="text-right amount-income">+${fmt.currency(grandSell)}</td>
          <td class="text-right amount-income">+${fmt.currency(grandCoupon)}</td>
          ${showExp ? `<td class="text-right amount-expense">-${fmt.currency(grandExpense)}</td>` : ''}
          <td class="text-right" style="font-weight:700;color:${grandNet>=0?'var(--income)':'var(--expense)'}">
            ${grandNet>=0?'+':''}${fmt.currency(grandNet)}
          </td>
        </tr></tbody></table>
      </div>
    </div>`;
}

function renderPortfolioAnalisi(items) {
  const container = document.getElementById('pgPortfolioAnalisi');
  if (!container) return;

  const today     = new Date();
  const todayYear = today.getFullYear();

  const bonds = items.filter(i => i.asset_type === 'bond' && i.quantity > 0);

  if (!bonds.length) {
    container.innerHTML = '<div class="card" style="padding:32px;text-align:center;color:var(--txt3)">Nessun titolo obbligazionario in portafoglio.</div>';
    return;
  }

  // Usa il campo country se presente, normalizzato (trim + title case), altrimenti "Sconosciuto"
  const normCountry = s => s.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  const bondCountry = b => (b.country && b.country.trim()) ? normCountry(b.country) : 'Sconosciuto';

  const palette = [
    '#e05252','#52aee0','#52c47d','#e0c952','#b352e0',
    '#e07852','#52d4c4','#8fe052','#e052b3','#52b8e0',
    '#e0a352','#7d88e0','#c4e052','#e05290','#52e0d4'
  ];

  const countries = [...new Set(bonds.map(bondCountry))];
  const countryColor = Object.fromEntries(countries.map((c,i) => [c, palette[i % palette.length]]));

  // ── Chart 1: Esposizione per Paese ────────────────────────────────────
  const byCountry = {};
  bonds.forEach(b => {
    const c = bondCountry(b);
    byCountry[c] = (byCountry[c] || 0) + b.quantity;
  });
  const c1Sorted = Object.entries(byCountry).sort((a, b) => b[1] - a[1]);
  const c1Labels = c1Sorted.map(([c]) => c);
  const c1Data   = c1Sorted.map(([, v]) => v);
  const c1Colors = c1Labels.map(c => countryColor[c] || palette[0]);
  const c1Total  = c1Data.reduce((a,b) => a+b, 0);

  // ── Chart 2: Ripartizione per durata (stacked per Paese) ─────────────
  const durLabels = ['0 anni','1 anno','2 anni','3 anni','4 anni','5 anni','6 anni','Scaduto / N.D.'];
  const durData = {};
  countries.forEach(c => { durData[c] = new Array(8).fill(0); });
  bonds.forEach(b => {
    const c = bondCountry(b);
    let idx = 7;
    if (b.maturity_date) {
      const yearsLeft = (new Date(b.maturity_date) - today) / (365.25 * 24 * 3600 * 1000);
      if (yearsLeft >= 0) idx = Math.min(6, Math.floor(yearsLeft));
    }
    if (durData[c]) durData[c][idx] += b.quantity;
  });

  // ── Chart 3: Ladder cumulativa ────────────────────────────────────────
  const byYear = {};
  bonds.forEach(b => {
    if (!b.maturity_date) return;
    const y = new Date(b.maturity_date).getFullYear();
    byYear[y] = (byYear[y] || 0) + b.quantity;
  });
  const maxYear = Object.keys(byYear).length ? Math.max(...Object.keys(byYear).map(Number)) : todayYear + 1;
  const allYears = [];
  for (let y = todayYear; y <= maxYear; y++) allYears.push(y);
  let cumul = 0;
  const ladderData = allYears.map(y => { cumul += (byYear[y] || 0); return cumul; });
  // Nominale in scadenza per anno (per tooltip)
  const ladderDeltaByYear = allYears.map(y => byYear[y] || 0);

  // ── Chart 4: Cedole per mese ──────────────────────────────────────────
  const freqMap = { annual:1, semiannual:2, quarterly:4, monthly:12 };
  const months  = Array.from({length:12}, (_,i) => `${todayYear}-${String(i+1).padStart(2,'0')}`);
  const couponBonds = bonds.filter(b => b.coupon_rate > 0);
  const couponMonthData = {};
  couponBonds.forEach(b => {
    const freq     = freqMap[b.coupon_frequency] || 2;
    const matMonth = b.maturity_date ? new Date(b.maturity_date).getMonth() + 1 : 6;
    const matYear  = b.maturity_date ? new Date(b.maturity_date).getFullYear() : 9999;
    const interval = 12 / freq;
    const payMonths = new Set();
    for (let i = 0; i < freq; i++) {
      const m = ((matMonth - 1 - Math.round(i * interval)) % 12 + 12) % 12 + 1;
      payMonths.add(m);
    }
    const netPerPay = b.quantity * (b.coupon_rate / 100) * (1 - (b.coupon_tax || 12.5) / 100) / freq;
    const data = new Array(12).fill(0);
    payMonths.forEach(m => { if (matYear >= todayYear) data[m - 1] = netPerPay; });
    couponMonthData[b.ticker] = data;
  });

  // ── Chart 5: Cedole annue ─────────────────────────────────────────────
  const couponYears = allYears.length >= 2 ? allYears : [todayYear, todayYear + 1];
  const couponYearData = {};
  couponBonds.forEach(b => {
    const matYear   = b.maturity_date ? new Date(b.maturity_date).getFullYear() : todayYear + 10;
    const annualNet = b.quantity * (b.coupon_rate / 100) * (1 - (b.coupon_tax || 12.5) / 100);
    couponYearData[b.ticker] = couponYears.map(y => y <= matYear ? annualNet : 0);
  });

  // ── HTML ───────────────────────────────────────────────────────────────
  container.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:8px">
      <div class="card" style="padding:16px">
        <div style="font-weight:600;margin-bottom:12px">Esposizione per Paese</div>
        <canvas id="chAnPaese" style="max-height:340px"></canvas>
      </div>
      <div class="card" style="padding:16px">
        <div style="font-weight:600;margin-bottom:12px">Ripartizione per durata (stacked per Paese)</div>
        <canvas id="chAnDurata" style="max-height:340px"></canvas>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:2fr 3fr;gap:16px;margin-top:16px">
      <div class="card" style="padding:16px">
        <div style="font-weight:600;margin-bottom:12px">Ladder cumulativa (per anno)</div>
        <canvas id="chAnLadder" style="max-height:320px"></canvas>
      </div>
      <div class="card" style="padding:16px">
        <div style="font-weight:600;margin-bottom:12px">Incasso cedole per mese (stacked per ISIN)</div>
        <canvas id="chAnCedoleMese" style="max-height:320px"></canvas>
      </div>
    </div>
    <div style="margin-top:16px">
      <div class="card" style="padding:16px">
        <div style="font-weight:600;margin-bottom:12px">Cedole annue</div>
        <canvas id="chAnCedoleAnno" style="max-height:320px"></canvas>
      </div>
    </div>`;

  const txtColor    = getComputedStyle(document.documentElement).getPropertyValue('--txt1').trim() || '#ccc';
  const txt2Color   = getComputedStyle(document.documentElement).getPropertyValue('--txt2').trim() || '#aaa';
  const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || '#333';
  const SEP         = '─'.repeat(22);

  // Plugin inline per data labels (donut → %, bar → valore, line → valore sopra punto)
  let _pdlSeq = 0;
  const makeDataLabels = () => ({
    id: '_pdl_' + (++_pdlSeq),
    afterDatasetsDraw(chart) {
      const ctx  = chart.ctx;
      const type = chart.config.type;
      chart.data.datasets.forEach((ds, di) => {
        const meta = chart.getDatasetMeta(di);
        if (meta.hidden) return;
        meta.data.forEach((el, idx) => {
          const val = ds.data[idx];
          if (!val || val === 0) return;
          ctx.save();
          ctx.textAlign = 'center';
          if (type === 'doughnut') {
            const total = chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
            const mid   = (el.startAngle + el.endAngle) / 2;
            const r     = (el.innerRadius + el.outerRadius) / 2;
            if ((el.endAngle - el.startAngle) * r < 28) { ctx.restore(); return; }
            ctx.font = 'bold 10px Segoe UI,sans-serif';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#fff';
            ctx.shadowColor = 'rgba(0,0,0,.55)';
            ctx.shadowBlur  = 3;
            ctx.fillText(((val / total) * 100).toFixed(1) + '%',
              el.x + r * Math.cos(mid), el.y + r * Math.sin(mid));
          } else if (type === 'bar') {
            const segH = Math.abs(el.base - el.y);
            if (segH < 14) { ctx.restore(); return; }
            ctx.font = 'bold 9px Segoe UI,sans-serif';
            ctx.textBaseline = 'middle';
            const text = fmt.currency(val);
            if (ctx.measureText(text).width > Math.abs(el.width) - 6) { ctx.restore(); return; }
            ctx.fillStyle = '#fff';
            ctx.shadowColor = 'rgba(0,0,0,.55)';
            ctx.shadowBlur  = 3;
            ctx.fillText(text, el.x, (el.y + el.base) / 2);
          } else if (type === 'line') {
            ctx.font = 'bold 9px Segoe UI,sans-serif';
            ctx.textBaseline = 'bottom';
            ctx.fillStyle = txt2Color;
            ctx.shadowColor = 'rgba(0,0,0,.3)';
            ctx.shadowBlur  = 2;
            ctx.fillText(fmt.currency(val), el.x, el.y - 5);
          }
          ctx.restore();
        });
      });
    }
  });

  const axisOpts = (stacked = false) => ({
    x: { stacked, ticks: { color: txt2Color, maxRotation: 45 }, grid: { color: borderColor } },
    y: { stacked, ticks: { color: txt2Color, callback: v => fmt.currency(v) }, grid: { color: borderColor } }
  });

  // Tooltip helper per stacked bar / line: totale IN CIMA, poi lista valori
  const stackedTooltip = (extraFooter) => ({
    mode: 'index',
    intersect: false,
    callbacks: {
      beforeBody: items => {
        const visible = items.filter(i => i.parsed.y !== 0);
        if (!visible.length) return [];
        const total = visible.reduce((s,i) => s + i.parsed.y, 0);
        const lines = [`Totale: ${fmt.currency(total)}`, SEP];
        if (extraFooter) lines.push(...extraFooter(items));
        return lines;
      },
      label: ctx => ctx.parsed.y !== 0 ? ` ${ctx.dataset.label}: ${fmt.currency(ctx.parsed.y)}` : null,
    }
  });

  // Chart 1: Donut — vignetta con tutti i valori + totale
  new Chart(document.getElementById('chAnPaese'), {
    type: 'doughnut',
    plugins: [makeDataLabels()],
    data: { labels: c1Labels, datasets: [{ data: c1Data, backgroundColor: c1Colors, borderWidth: 1 }] },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { color: txtColor, font: { size: 11 }, padding: 8 } },
        tooltip: {
          callbacks: {
            label:     ctx => ` ${ctx.label}: ${fmt.currency(ctx.parsed)} (${((ctx.parsed/c1Total)*100).toFixed(1)}%)`,
            afterBody: () => [SEP],
            footer:    ()  => [`Totale: ${fmt.currency(c1Total)}`]
          }
        }
      }
    }
  });

  // Chart 2: Stacked bar – durata
  new Chart(document.getElementById('chAnDurata'), {
    type: 'bar',
    plugins: [makeDataLabels()],
    data: {
      labels: durLabels,
      datasets: countries.map(c => ({ label: c, data: durData[c], backgroundColor: countryColor[c], stack: 'st' }))
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: txtColor, font: { size: 11 } } },
        tooltip: stackedTooltip()
      },
      scales: axisOpts(true)
    }
  });

  // Chart 3: Ladder cumulativa
  new Chart(document.getElementById('chAnLadder'), {
    type: 'line',
    plugins: [makeDataLabels()],
    data: {
      labels: allYears,
      datasets: [{ label: 'Nominale cumulativo', data: ladderData, borderColor: '#58a6ff',
        backgroundColor: 'rgba(88,166,255,0.15)', fill: true, tension: 0.3, pointRadius: 5 }]
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label:  ctx => ` Cumulativo: ${fmt.currency(ctx.parsed.y)}`,
            footer: items => {
              const idx   = items[0]?.dataIndex ?? -1;
              const delta = idx >= 0 ? ladderDeltaByYear[idx] : 0;
              return delta > 0 ? [SEP, `In scadenza: ${fmt.currency(delta)}`] : [];
            }
          }
        }
      },
      scales: axisOpts()
    }
  });

  // Chart 4: Cedole per mese
  const tkList = Object.keys(couponMonthData);
  new Chart(document.getElementById('chAnCedoleMese'), {
    type: 'bar',
    plugins: [makeDataLabels()],
    data: {
      labels: months,
      datasets: tkList.map((tk, i) => ({ label: tk, data: couponMonthData[tk], backgroundColor: palette[i % palette.length], stack: 'st' }))
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: txtColor, font: { size: 10 } } },
        tooltip: stackedTooltip()
      },
      scales: axisOpts(true)
    }
  });

  // Chart 5: Cedole annue
  const tkYList = Object.keys(couponYearData);
  new Chart(document.getElementById('chAnCedoleAnno'), {
    type: 'bar',
    plugins: [makeDataLabels()],
    data: {
      labels: couponYears,
      datasets: tkYList.map((tk, i) => ({ label: tk, data: couponYearData[tk], backgroundColor: palette[i % palette.length], stack: 'st' }))
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: txtColor, font: { size: 10 } } },
        tooltip: stackedTooltip()
      },
      scales: axisOpts(true)
    }
  });
}

async function showBuyModal(portfolioId, investAccounts, allAccounts) {
  if (!investAccounts || !allAccounts) {
    const accounts = await api.getAccounts();
    investAccounts = accounts.filter(a => a.type === 'investment' && !a.is_closed);
    allAccounts = accounts;
  }
  const regularAccounts = allAccounts.filter(a => a.type !== 'investment' && !a.is_closed);
  const today = _todayStr();

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
      quantity:        evalAmount(document.getElementById('b_qty').value),
      price:           evalAmount(document.getElementById('b_price').value),
      date:            document.getElementById('b_date').value,
      notes:           document.getElementById('b_notes').value.trim() || null,
      commissions:     evalAmount(document.getElementById('b_comm')?.value) || 0,
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
    const q      = evalAmount(document.getElementById('b_qty')?.value)||0;
    const p      = evalAmount(document.getElementById('b_price')?.value)||0;
    const c      = evalAmount(document.getElementById('b_comm')?.value)||0;
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
    const qty    = evalAmount(document.getElementById('ip_qty').value);
    const price  = evalAmount(document.getElementById('ip_price').value);
    const comm   = evalAmount(document.getElementById('ip_comm').value) || 0;
    // Per bond: qty = nominale €, prezzo in %, comm in € → avg% = price + (comm/qty)*100
    // Per equity: avg = (qty*price + comm) / qty
    const avg    = qty && price ? (isBond ? price + (comm / qty) * 100 : (qty * price + comm) / qty) : NaN;
    const cur    = evalAmount(document.getElementById('ip_cur').value) || null;
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
    const q  = evalAmount(document.getElementById('ip_qty')?.value)   || 0;
    const p  = evalAmount(document.getElementById('ip_price')?.value) || 0;
    const c  = evalAmount(document.getElementById('ip_comm')?.value)  || 0;
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
  const today = _todayStr();
  const isBond = pos.asset_type === 'bond';
  const avgDisplay = isBond ? `${(pos.avg_price||0).toFixed(4)} %` : fmt.price(pos.avg_price);
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
      quantity:      evalAmount(document.getElementById('s_qty').value),
      price:         evalAmount(document.getElementById('s_price').value),
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
    const q = evalAmount(document.getElementById('s_qty')?.value)||0;
    const p = evalAmount(document.getElementById('s_price')?.value)||0;
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
  const today = _todayStr();
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

async function showExpenseModal(portfolioId) {
  const [items, accounts, categories] = await Promise.all([api.getPortfolio(), api.getAccounts(), api.getCategories()]);
  const pos = items.find(i => i.id === portfolioId);
  if (!pos) return;
  const regularAccounts = accounts.filter(a => a.type !== 'investment' && !a.is_closed);
  const expCats = categories.filter(c => c.type === 'expense');
  const today = _todayStr();

  const optLabel = c => `${c.parent_name ? c.parent_name + ' › ' : ''}${c.icon || ''} ${c.name}`;
  const catOptions = expCats.map(c => `<option value="${c.id}">${optLabel(c)}</option>`).join('');

  const body = `
    <div style="background:var(--bg3);border-radius:6px;padding:8px 14px;margin-bottom:14px;font-size:13px">
      <strong>${pos.ticker}</strong> — ${pos.name}
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Tipo spesa *</label>
        <input class="form-control" id="ex_label" placeholder="es. Tobin Tax, Commissione, Ritenuta" value="Tobin Tax">
      </div>
      <div class="form-group">
        <label class="form-label">Data *</label>
        <input type="date" class="form-control" id="ex_date" value="${today}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Addebita da *</label>
        <select class="form-control" id="ex_account">
          <option value="">— Seleziona conto —</option>
          ${regularAccounts.map(a=>`<option value="${a.id}">${a.icon} ${a.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Importo (€) *</label>
        <input type="text" inputmode="decimal" class="form-control" id="ex_amount" placeholder="0,00">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Categoria</label>
        <select class="form-control" id="ex_cat">
          <option value="">— Nessuna —</option>
          ${catOptions}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Note</label>
        <input class="form-control" id="ex_notes" placeholder="Facoltativo">
      </div>
    </div>`;

  openModal('Registra Spesa', body, async () => {
    const label  = document.getElementById('ex_label').value.trim();
    const amount = parseFloat((document.getElementById('ex_amount').value||'').replace(',','.'));
    const catId  = parseInt(document.getElementById('ex_cat').value) || null;
    const data = {
      portfolio_id: portfolioId,
      account_id:   parseInt(document.getElementById('ex_account').value),
      amount,
      date:         document.getElementById('ex_date').value,
      label:        label || 'Spesa',
      notes:        document.getElementById('ex_notes').value.trim() || null,
      category_id:  catId,
    };
    if (!data.account_id)       { toast('Seleziona il conto di addebito','error'); return; }
    if (!amount || amount <= 0) { toast('Inserisci un importo valido','error'); return; }
    if (!data.date)             { toast('Inserisci la data','error'); return; }
    try {
      await api.registerPortfolioExpense(data);
      closeModal();
      toast(`Spesa registrata — ${fmt.currency(amount)}`);
      renderPortfolio();
    } catch(e) { toast(e.message,'error'); }
  });
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
      ${txs.length ? [...txs].sort((a,b)=>a.date.localeCompare(b.date)).map(t=>{
        const isBuy     = t.type === 'buy';
        const isCoupon  = t.type === 'coupon';
        const isExpense = t.type === 'expense';
        const isSell    = t.type === 'sell';
        const color = isBuy || isExpense ? 'var(--expense)' : 'var(--income)';
        const label = isBuy ? 'Acquisto' : isCoupon ? 'Cedola' : isExpense ? (t.notes || 'Spesa') : 'Vendita';
        const sign  = isBuy || isExpense ? '-' : '+';
        const total = (isCoupon || isExpense) ? t.price : t.quantity * t.price;
        return `<tr>
          <td>${t.date}</td>
          <td><span style="color:${color};font-weight:600">${label}</span></td>
          <td>${(isCoupon || isExpense) ? '—' : t.quantity}</td>
          <td>${(isCoupon || isExpense) ? '—' : fmt.price(t.price)}</td>
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
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Paese / Emittente</label>
        <input class="form-control" id="e_country" value="${pos.country||''}" placeholder="Es. Italia, Germania…">
      </div>
      <div class="form-group">
        <label class="form-label">Note</label>
        <input class="form-control" id="e_notes" value="${pos.notes||''}" placeholder="Opzionale">
      </div>
    </div>`;

  openModal('Modifica Posizione', body, async () => {
    const n = (id) => document.getElementById(id)?.value || '';
    const data = {
      id:               portfolioId,
      name:             document.getElementById('e_name').value.trim(),
      account_id:       parseInt(document.getElementById('e_account').value),
      quantity:         evalAmount(n('e_qty')),
      avg_price:        evalAmount(n('e_avg')),
      current_price:    evalAmount(n('e_cur')) || null,
      total_commissions:evalAmount(n('e_comm')) || 0,
      asset_type:       pos.asset_type,
      maturity_date:    isBond ? (document.getElementById('e_maturity')?.value || null) : null,
      coupon_rate:      isBond ? (evalAmount(n('e_coupon_rate')) || 0) : 0,
      coupon_frequency: isBond ? (document.getElementById('e_coupon_freq')?.value || null) : null,
      coupon_tax:       isBond ? (parseFloat(n('e_coupon_tax')) ?? 12.5) : 0,
      country:          document.getElementById('e_country').value.trim() || null,
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
  return _dateStr(candidates[0]);
}

function closePortfolioContextMenu() {
  document.getElementById('portfolio-ctx-menu')?.remove();
  document.removeEventListener('click', closePortfolioContextMenu);
  document.removeEventListener('contextmenu', closePortfolioContextMenu);
}

window._showPortfolioCtx = (portfolioId, evt) => {
  evt.preventDefault();
  closePortfolioContextMenu();

  const pos    = _portfolioItems.find(i => i.id === portfolioId);
  const isBond = pos?.asset_type === 'bond';
  const hasCoupon = isBond && pos?.coupon_rate > 0 && pos?.maturity_date;

  const menu = document.createElement('div');
  menu.id = 'portfolio-ctx-menu';
  menu.style.cssText = `position:fixed;z-index:9999;background:var(--bg2);border:1px solid var(--border);
    border-radius:8px;padding:4px 0;min-width:220px;box-shadow:0 4px 16px rgba(0,0,0,.3);
    left:${Math.min(evt.clientX, window.innerWidth-240)}px;top:${Math.min(evt.clientY, window.innerHeight-260)}px`;

  const mkItem = (icon, label, cb, danger = false) => {
    const el = document.createElement('div');
    el.style.cssText = `padding:8px 14px;cursor:pointer;font-size:13px;display:flex;align-items:center;gap:8px;${danger?'color:var(--expense)':''}`;
    el.innerHTML = `${icon} ${label}`;
    el.onmouseenter = () => el.style.background = 'var(--bg3)';
    el.onmouseleave = () => el.style.background = '';
    el.onclick = () => { closePortfolioContextMenu(); cb(); };
    return el;
  };

  const mkSep = () => {
    const s = document.createElement('div');
    s.style.cssText = 'border-top:1px solid var(--border);margin:4px 0';
    return s;
  };

  menu.appendChild(mkItem('➕', 'Acquista altro', () => showBuyModal(portfolioId)));
  menu.appendChild(mkItem('➖', 'Vendi',          () => showSellModal(portfolioId)));
  if (hasCoupon) {
    menu.appendChild(mkItem('💰', 'Registra cedola',               () => showCouponModal(portfolioId)));
    menu.appendChild(mkItem('📅', 'Aggiungi cedola a pianificate', () => showAddCouponToScheduled(portfolioId)));
  }
  if (!isBond) {
    menu.appendChild(mkItem('💸', 'Registra spesa', () => showExpenseModal(portfolioId)));
  }
  menu.appendChild(mkSep());
  menu.appendChild(mkItem('✏️', 'Modifica',  () => showEditPositionModal(portfolioId)));
  menu.appendChild(mkItem('📋', 'Storico',   () => showPortfolioHistory(portfolioId)));
  menu.appendChild(mkSep());
  menu.appendChild(mkItem('🗑️', 'Elimina',  () => deleteStock(portfolioId), true));

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
      portfolio_id:  portfolioId,
    };
    try {
      await api.addScheduled(data);
      closeModal();
      toast(`Cedola ${pos.ticker} aggiunta alle pianificate`);
    } catch(e) { toast(e.message,'error'); }
  });
}
window.showAddCouponToScheduled = showAddCouponToScheduled;

window._setPortfolioTab = _setPortfolioTab;
window._setPortfolioFilter = async (activeOnly) => {
  _portfolioActiveOnly = activeOnly;
  await api.setSetting('portfolio.active_only', activeOnly ? '1' : '0');
  renderPortfolio();
};
window._setPortfolioTypeFilter = type => {
  _portfolioTypeFilter = type;
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
window.showExpenseModal     = showExpenseModal;
window.showPortfolioHistory = showPortfolioHistory;
async function refreshPortfolioPrices() {
  const btn = document.getElementById('btnRefreshPrices');
  const items = (_portfolioItems || [])
    .filter(i => _portfolioActiveOnly ? i.quantity > 0 : true)
    .filter(i => _portfolioTypeFilter === 'all' ? true : (i.asset_type || 'equity') === _portfolioTypeFilter);
  if (!items.length) { toast('Nessun titolo da aggiornare', 'info'); return; }

  if (btn) btn.disabled = true;
  let updated = 0, failed = 0;

  for (const item of items) {
    if (btn) btn.textContent = `⏳ ${updated + failed + 1}/${items.length}`;
    try {
      const res = await api.fetchOnlinePrice(item.ticker);
      await api.updateStockPrice(item.id, res.price);
      _portfolioPriceStatus[item.id] = 'ok';
      updated++;
    } catch(e) {
      _portfolioPriceStatus[item.id] = 'fail';
      failed++;
      console.warn('Prezzo non aggiornato per', item.ticker, ':', e.message);
    }
  }

  await renderPortfolio();
  const msg = failed === 0
    ? `Aggiornati ${updated} titoli`
    : `Aggiornati ${updated}, non trovati ${failed}`;
  toast(msg, failed > 0 ? 'warning' : 'success');
}

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
  if (_analyticsTab === 'balance')   renderAnalyticsBalance();
  else if (_analyticsTab === 'trend')    renderAnalyticsTrend();
  else if (_analyticsTab === 'health')   renderAnalyticsHealth();
  else if (_analyticsTab === 'forecast') renderAnalyticsForecast();
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
          <button class="sched-tab${_analyticsTab==='forecast'?' active':''}" data-atab="forecast" onclick="_setAnalyticsTab('forecast',this)">📊 Previsione Saldo</button>
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
  if (tab === 'catmonth')  renderAnalyticsCatMonth();
  if (tab === 'balance')   renderAnalyticsBalance();
  if (tab === 'trend')     renderAnalyticsTrend();
  if (tab === 'health')    renderAnalyticsHealth();
  if (tab === 'forecast')  renderAnalyticsForecast();
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
      const k = t.date.slice(0,7);
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
    { id: 'perf',        label: '⏱️ Prestazioni'   },
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
        <div class="settings-row" style="align-items:flex-start">
          <div class="settings-label">
            <strong>Ripristina backup</strong>
            <span class="settings-hint">Seleziona un backup da ripristinare. Il database attuale verrà archiviato prima di procedere.</span>
          </div>
          <div class="settings-control" style="flex-direction:column;align-items:flex-start;gap:6px">
            <button class="btn btn-secondary" onclick="settingsLoadBackupList()">📂 Mostra backup disponibili</button>
            <div id="backupRestoreList" style="width:100%"></div>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">📎 Allegati</div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Cartella allegati</strong>
            <span class="settings-hint">Dove vengono copiati i file allegati alle transazioni</span>
          </div>
          <div class="settings-control">
            <div class="settings-path-row">
              <input id="attachmentsDirInput" class="form-input settings-path-input"
                     type="text" readonly value="${s['attachments.dir'] ?? ''}">
              <button class="btn btn-secondary" onclick="settingsChooseAttachmentsDir()">📂 Scegli</button>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">📡 Accesso da browser (LAN)</div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Server HTTP</strong>
            <span class="settings-hint">Permette di accedere all'app dal browser di un altro dispositivo sulla stessa rete</span>
          </div>
          <div class="settings-control">
            <div class="theme-toggle-group">
              <button class="btn theme-btn ${s['http.enabled']!=='0'?'theme-btn-active':''}"
                      onclick="settingsSetHttp('enabled','1')">Attivo</button>
              <button class="btn theme-btn ${s['http.enabled']==='0'?'theme-btn-active':''}"
                      onclick="settingsSetHttp('enabled','0')">Disattivo</button>
            </div>
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Porta</strong>
            <span class="settings-hint">Porta TCP su cui risponde il server (default: 7890)</span>
          </div>
          <div class="settings-control">
            <input type="number" class="form-control" style="width:100px" min="1024" max="65535"
                   value="${s['http.port']||'7890'}"
                   onchange="settingsSetHttp('port', this.value)">
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-label">
            <span class="settings-hint">Le modifiche hanno effetto al prossimo avvio dell'app</span>
          </div>
        </div>
      </div>`,

    prefs: `
      <div class="settings-section">
        <div class="settings-section-title">🎨 Tema</div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Tema predefinito</strong>
            <span class="settings-hint">Scegli o crea un tema personalizzato</span>
          </div>
          <div class="settings-control">
            <div style="display:flex;flex-direction:column;gap:10px">
              <div style="display:flex;gap:6px;flex-wrap:wrap">
                ${[['dark','🌙 Scuro'],['carta','📜 Carta'],['salvia','🌿 Salvia']].map(([key,label]) => `
                  <button class="btn theme-btn ${(s['appearance.theme']||'dark')===key?'theme-btn-active':''}"
                          onclick="settingsSetTheme('${key}')">${label}</button>
                  <button class="btn btn-ghost btn-icon" title="Duplica e personalizza" onclick="duplicateTheme('${key}')">⧉</button>`).join('')}
              </div>
              ${_customThemes.length ? `
              <div style="border-top:1px solid var(--border);padding-top:8px">
                <div style="font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--txt3);margin-bottom:6px">Personalizzati</div>
                ${_customThemes.map(ct => `
                  <div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--border)">
                    <span style="font-size:13px;flex:1;color:var(--txt)">${ct.name}</span>
                    <button class="btn theme-btn ${(s['appearance.theme']||'dark')==='c:'+ct.id?'theme-btn-active':''}" style="padding:4px 12px"
                            onclick="settingsSetTheme('c:${ct.id}')">Attiva</button>
                    <button class="btn btn-ghost btn-icon" title="Modifica" onclick="showThemeEditor(_customThemes.find(t=>t.id==='${ct.id}'))">✏️</button>
                    <button class="btn btn-ghost btn-icon" title="Duplica" onclick="duplicateTheme('c:${ct.id}')">⧉</button>
                    <button class="btn btn-ghost btn-icon" style="color:var(--txt3)" title="Elimina" onclick="_deleteCustomTheme('${ct.id}')">🗑️</button>
                  </div>`).join('')}
              </div>` : ''}
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
      </div>

      ${s['_autostart_supported'] === '1' ? `
      <div class="settings-section">
        <div class="settings-section-title">🚀 Avvio</div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Avvia con Windows</strong>
            <span class="settings-hint">Precarica l'app al login. La chiusura della finestra la nasconde nel tray — usa "Esci" dal tray per uscire davvero.</span>
          </div>
          <div class="settings-control">
            <div class="theme-toggle-group">
              <button class="btn theme-btn ${s['autostart.enabled']==='1'?'theme-btn-active':''}"
                      onclick="settingsSetAutostart('1')">Attivo</button>
              <button class="btn theme-btn ${s['autostart.enabled']!=='1'?'theme-btn-active':''}"
                      onclick="settingsSetAutostart('0')">Disattivo</button>
            </div>
          </div>
        </div>
      </div>` : ''}`,

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
            <strong>Analizza statistiche</strong>
            <span class="settings-hint">ANALYZE: aggiorna le statistiche usate dal query planner per scegliere il piano di esecuzione migliore.</span>
          </div>
          <div class="settings-control maint-op-control">
            <button class="btn btn-secondary" id="btnAnalyze" onclick="maintAnalyze()">📊 Analizza</button>
            <span class="settings-hint maint-result" id="analyzeResult"></span>
          </div>
        </div>


        <div class="settings-row">
          <div class="settings-label">
            <strong>Cartella dati applicazione</strong>
            <span class="settings-hint">
              Contiene DB, impostazioni, log, cache Chromium (jcef/) e file web estratti.<br>
              Per reinstallare Chromium: <strong>chiudi l'app</strong>, poi apri questa cartella ed elimina la sottocartella <code>jcef</code>. Al riavvio verrà riscaricata (~200 MB).
            </span>
          </div>
          <div class="settings-control maint-op-control">
            <button class="btn btn-ghost" onclick="callJava('openDataDir')">📂 Apri cartella</button>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">📋 Log operazioni</div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>File di log</strong>
            <span class="settings-hint">Percorso e dimensione del file di log</span>
          </div>
          <div class="settings-control" style="display:flex;flex-direction:column;gap:4px">
            <span class="settings-hint" id="logPathText" style="word-break:break-all;font-family:monospace">—</span>
            <div class="flex-center-8">
              <span class="settings-hint" id="logSizeText">—</span>
              <button class="btn btn-ghost" style="white-space:nowrap;padding:2px 8px;font-size:11px"
                      onclick="callJava('openLogFolder')">Apri cartella ↗</button>
            </div>
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Contenuto log</strong>
            <span class="settings-hint">Prima e ultima registrazione nel file di log</span>
          </div>
          <div class="settings-control">
            <span class="settings-hint" id="logInfoText">Caricamento...</span>
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Elimina righe precedenti a</strong>
            <span class="settings-hint">Rimuove dal file di log tutte le righe antecedenti alla data scelta</span>
          </div>
          <div class="settings-control maint-op-control">
            <select class="form-control" id="logCutoffSelect" onchange="maintUpdateLogCutoff()">
              <option value="3m">Mantieni ultimi 3 mesi</option>
              <option value="6m">Mantieni ultimi 6 mesi</option>
              <option value="1y">Mantieni ultimo anno</option>
              <option value="2y">Mantieni ultimi 2 anni</option>
              <option value="custom">Personalizzato…</option>
            </select>
            <input type="date" class="form-control" id="logCutoffDate" style="display:none">
            <button class="btn btn-danger" onclick="maintPurgeLog()">🗑️ Elimina</button>
            <span class="settings-hint maint-result" id="logPurgeResult"></span>
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Elimina voci di sistema</strong>
            <span class="settings-hint">Rimuove avvio, backup, manutenzione — conserva transazioni e modifiche dati</span>
          </div>
          <div class="settings-control maint-op-control">
            <button class="btn btn-danger" onclick="maintPurgeSystemLog()">🗑️ Elimina voci sistema</button>
            <span class="settings-hint maint-result" id="logSystemPurgeResult"></span>
          </div>
        </div>
      </div>`,

    info: `
      <div class="settings-section">
        <div class="settings-section-title">ℹ️ Informazioni</div>
        <div class="settings-info-grid">
          <span class="settings-info-label">Versione app</span>
          <span class="settings-info-value">${s['_app_version'] || '—'}</span>
          <span class="settings-info-label">Java</span>
          <span class="settings-info-value">${s['_java_version'] || '—'}</span>
          <span class="settings-info-label">Browser engine</span>
          <span class="settings-info-value">Chromium ${s['_chromium'] || '(JCEF)'}</span>
          <span class="settings-info-label">Database</span>
          <span class="settings-info-value">${s['db.path'] || '—'}</span>
          <span class="settings-info-label">Impostazioni</span>
          <span class="settings-info-value flex-center-8">
            <span style="word-break:break-all">${s['_settings_path'] || '—'}</span>
            <button class="btn btn-ghost" style="white-space:nowrap;padding:2px 8px;font-size:11px"
                    onclick="api.openSettingsFile()">Apri ↗</button>
          </span>
          <span class="settings-info-label">Log Java</span>
          <span class="settings-info-value flex-center-8">
            <span style="word-break:break-all">${s['_app_log_path'] || '—'}</span>
            <button class="btn btn-ghost" style="white-space:nowrap;padding:2px 8px;font-size:11px"
                    onclick="api.openAppLog()">Apri ↗</button>
            <button class="btn btn-ghost" style="white-space:nowrap;padding:2px 8px;font-size:11px"
                    onclick="_clearAppLog()">🗑️</button>
          </span>
        </div>
      </div>
      <div class="settings-section">
        <div class="settings-section-title">📦 Dipendenze</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="border-bottom:1px solid var(--border-color)">
              <th style="text-align:left;padding:6px 8px;color:var(--text-secondary);font-weight:500">Componente</th>
              <th style="text-align:left;padding:6px 8px;color:var(--text-secondary);font-weight:500">Versione</th>
              <th style="text-align:left;padding:6px 8px;color:var(--text-secondary);font-weight:500">Maven Central</th>
            </tr>
          </thead>
          <tbody>
            ${(function() {
              var deps = [
                { name: 'jcefmaven (JCEF)',  ver: s['_dep_jcef'],   g: 'me.friwi',            a: 'jcefmaven'   },
                { name: 'sqlite-jdbc',        ver: s['_dep_sqlite'], g: 'org.xerial',           a: 'sqlite-jdbc' },
                { name: 'gson',               ver: s['_dep_gson'],   g: 'com.google.code.gson', a: 'gson'        },
                { name: 'slf4j-nop',          ver: s['_dep_slf4j'],  g: 'org.slf4j',            a: 'slf4j-nop'   },
              ];
              var url = function(d) { return 'https://central.sonatype.com/artifact/' + d.g + '/' + d.a; };
              var rows = deps.map(function(d) {
                return '<tr style="border-bottom:1px solid var(--border-color)">'
                  + '<td style="padding:7px 8px">' + d.name + '</td>'
                  + '<td style="padding:7px 8px;font-family:monospace">' + (d.ver || '—') + '</td>'
                  + '<td style="padding:7px 8px"><a href="#" onclick="api.openUrl(\'' + url(d) + '\');return false;"'
                  + ' style="color:var(--accent-color);text-decoration:none">' + d.g + ':' + d.a + ' ↗</a></td>'
                  + '</tr>';
              });
              rows.push('<tr>'
                + '<td style="padding:7px 8px">SQLite (native)</td>'
                + '<td style="padding:7px 8px;font-family:monospace">' + (s['_sqlite_version'] || '—') + '</td>'
                + '<td style="padding:7px 8px;color:var(--text-secondary)">embedded in sqlite-jdbc</td>'
                + '</tr>');
              return rows.join('');
            })()}
          </tbody>
        </table>
      </div>`,

    perf: `
      <div class="settings-section">
        <div class="settings-section-title">⏱️ Monitoraggio prestazioni</div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Registrazione attiva</strong>
            <span class="settings-hint">Misura i tempi di risposta di ogni chiamata Java. Disattivare in uso normale.</span>
          </div>
          <div class="settings-control">
            <div class="theme-toggle-group">
              <button id="perfToggleOn"  class="btn theme-btn ${_perfEnabled?'theme-btn-active':''}"
                      onclick="perfSetEnabled(true)">Attivo</button>
              <button id="perfToggleOff" class="btn theme-btn ${!_perfEnabled?'theme-btn-active':''}"
                      onclick="perfSetEnabled(false)">Disattivo</button>
            </div>
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Registro ultimi ${_PERF_MAX} log</strong>
            <span class="settings-hint">Round-trip = tempo totale JS. Java = elaborazione Bridge+DB. JCEF = overhead CEF.</span>
          </div>
          <div class="settings-control" style="gap:6px">
            <button class="btn btn-secondary" onclick="perfRefresh()">🔄 Aggiorna</button>
            <button class="btn btn-ghost"     onclick="perfClear()">🗑️ Svuota</button>
          </div>
        </div>
        <div id="perfTableWrap" style="overflow-x:auto;margin-top:4px">
          <span class="settings-hint" style="padding:8px 0;display:block">Premi Aggiorna per caricare i dati.</span>
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
  if (_settingsTab === 'maintenance') setTimeout(() => { maintLoadInfo(); maintLoadLogInfo(); }, 50);
}

window._setSettingsTab = tab => {
  _settingsTab = tab;
  renderSettings();
};

// ─── Prestazioni ──────────────────────────────────────────────────────────────

window.perfSetEnabled = async (enabled) => {
  _perfEnabled = enabled;
  await api.setPerfEnabled(enabled);
  renderSettings();
};

window.perfRefresh = async () => {
  const wrap = document.getElementById('perfTableWrap');
  if (!wrap) return;
  wrap.innerHTML = '<span class="settings-hint">Caricamento...</span>';
  try {
    const [jsLog, javaLog] = await Promise.all([
      Promise.resolve(_perfBuf.slice()),
      api.getPerfLog(),
    ]);
    // Merge by method+ts: build javaMap keyed by method+ts (closest match)
    const javaByMethod = {};
    for (const j of javaLog) {
      const k = j.method;
      if (!javaByMethod[k]) javaByMethod[k] = [];
      javaByMethod[k].push(j);
    }
    // Match js entries to java entries by method, picking closest ts
    const rows = jsLog.map(js => {
      const candidates = javaByMethod[js.method] || [];
      let best = null, bestDiff = Infinity;
      for (const j of candidates) {
        const diff = Math.abs(j.ts - js.ts);
        if (diff < bestDiff) { bestDiff = diff; best = j; }
      }
      const javaMs  = best ? best.javaMs : null;
      const roundMs = js.roundMs;
      const jcefMs  = (javaMs != null) ? Math.max(0, roundMs - javaMs) : null;
      return { method: js.method, ts: js.ts, roundMs, javaMs, jcefMs };
    }).reverse();

    if (!rows.length) {
      wrap.innerHTML = '<span class="settings-hint" style="padding:8px 0;display:block">Nessun dato. Attiva la registrazione ed esegui alcune operazioni.</span>';
      return;
    }

    const badge = (ms, label) => {
      if (ms == null) return '<span style="color:var(--text-secondary)">—</span>';
      const color = ms < 50 ? 'var(--income)' : ms < 200 ? '#f0a030' : 'var(--expense)';
      return `<span style="color:${color};font-weight:600">${label !== undefined ? label : ms + ' ms'}</span>`;
    };

    wrap.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:12px;font-family:monospace">
        <thead>
          <tr style="border-bottom:1px solid var(--border-color)">
            <th style="text-align:left;padding:5px 8px;color:var(--text-secondary);font-weight:500;white-space:nowrap">Metodo</th>
            <th style="text-align:right;padding:5px 8px;color:var(--text-secondary);font-weight:500">Round-trip</th>
            <th style="text-align:right;padding:5px 8px;color:var(--text-secondary);font-weight:500">Java</th>
            <th style="text-align:right;padding:5px 8px;color:var(--text-secondary);font-weight:500">JCEF</th>
            <th style="text-align:right;padding:5px 8px;color:var(--text-secondary);font-weight:500">Ora</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => {
            const t = new Date(r.ts);
            const hms = `${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}:${String(t.getSeconds()).padStart(2,'0')}`;
            return `<tr style="border-bottom:1px solid var(--border-color)">
              <td style="padding:5px 8px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${r.method}">${r.method}</td>
              <td style="text-align:right;padding:5px 8px">${badge(r.roundMs, r.roundMs + ' ms')}</td>
              <td style="text-align:right;padding:5px 8px">${badge(r.javaMs,  r.javaMs  != null ? r.javaMs  + ' ms' : null)}</td>
              <td style="text-align:right;padding:5px 8px">${badge(r.jcefMs,  r.jcefMs  != null ? r.jcefMs  + ' ms' : null)}</td>
              <td style="text-align:right;padding:5px 8px;color:var(--text-secondary)">${hms}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  } catch(e) {
    wrap.innerHTML = `<span class="settings-hint" style="color:var(--expense)">Errore: ${e}</span>`;
  }
};

window.perfClear = async () => {
  _perfBuf.length = 0;
  await api.clearPerfLog();
  const wrap = document.getElementById('perfTableWrap');
  if (wrap) wrap.innerHTML = '<span class="settings-hint" style="padding:8px 0;display:block">Log svuotato.</span>';
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
      <span class="maint-info-value">${info.acc_count}</span>
      <span class="maint-info-label">Schema DB</span>
      <span class="maint-info-value">v${info.schema_version} / v${info.schema_latest}</span>`;
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

async function maintAnalyze() {
  const btn = document.getElementById('btnAnalyze');
  const res = document.getElementById('analyzeResult');
  btn.disabled = true; btn.textContent = '⏳ In corso...';
  res.textContent = '';
  try {
    const r = await callJava('dbAnalyze');
    // Raggruppa per tabella e prendi il primo valore stat (righe totali)
    const byTable = {};
    for (const s of r.stats) {
      if (!byTable[s.name]) byTable[s.name] = parseInt((s.stat||'0').split(' ')[0], 10);
    }
    const lines = Object.entries(byTable)
      .sort((a,b) => b[1]-a[1])
      .map(([t,n]) => `${t}: ${n.toLocaleString()} righe`)
      .join(' · ');
    res.style.color = 'var(--income)';
    res.textContent = '✓ ' + (lines || 'statistiche aggiornate');
  } catch(e) {
    res.style.color = 'var(--expense)';
    res.textContent = 'Errore: ' + e;
  }
  btn.disabled = false; btn.textContent = '📊 Analizza';
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


// ─── Manutenzione log ────────────────────────────────────────────────────────

async function maintLoadLogInfo() {
  const el = document.getElementById('logInfoText');
  if (!el) return;
  try {
    const info = await callJava('getLogInfo');
    // percorso e dimensione
    const pathEl = document.getElementById('logPathText');
    const sizeEl = document.getElementById('logSizeText');
    if (pathEl) pathEl.textContent = info.log_path || '—';
    if (sizeEl && info.log_size != null) {
      const kb = (info.log_size / 1024).toFixed(1);
      sizeEl.textContent = kb >= 1024
        ? `${(kb / 1024).toFixed(2)} MB`
        : `${kb} KB`;
    } else if (sizeEl) sizeEl.textContent = '—';
    // contenuto
    if (info.empty)        el.textContent = 'Log vuoto o non trovato';
    else if (info.error)   el.textContent = 'Errore: ' + info.error;
    else                   el.textContent = `Prima registrazione: ${info.first}  ·  Ultima: ${info.last}  ·  ${info.total_lines} righe`;
  } catch(e) { el.textContent = 'Errore: ' + e; }
}

window.maintUpdateLogCutoff = () => {
  const v = document.getElementById('logCutoffSelect').value;
  document.getElementById('logCutoffDate').style.display = v === 'custom' ? '' : 'none';
};

window.maintPurgeSystemLog = async () => {
  const ok = await confirm('Elimina voci di sistema', 'Eliminare tutte le voci di sistema dal log (avvio, backup, manutenzione)?');
  if (!ok) return;
  const res = await callJava('purgeSystemLog');
  const result = document.getElementById('logSystemPurgeResult');
  if (res.error) {
    result.style.color = 'var(--expense)';
    result.textContent = 'Errore: ' + res.error;
  } else {
    result.style.color = res.deleted > 0 ? 'var(--income)' : '';
    result.textContent = res.deleted > 0 ? `Eliminate ${res.deleted} righe` : 'Nessuna voce di sistema trovata';
    maintLoadLogInfo();
  }
};

window._clearAppLog = async () => {
  const ok = await confirm('Pulisci log Java', 'Eliminare il contenuto di app.log?');
  if (!ok) return;
  await callJava('clearAppLog', {});
  toast('Log Java eliminato', 'success');
};

window.maintPurgeLog = async () => {
  const sel = document.getElementById('logCutoffSelect').value;
  let cutoff;
  if (sel === 'custom') {
    cutoff = document.getElementById('logCutoffDate').value;
    if (!cutoff) { document.getElementById('logPurgeResult').textContent = 'Seleziona una data'; return; }
  } else {
    const d = new Date();
    if      (sel === '3m') d.setMonth(d.getMonth() - 3);
    else if (sel === '6m') d.setMonth(d.getMonth() - 6);
    else if (sel === '1y') d.setFullYear(d.getFullYear() - 1);
    else if (sel === '2y') d.setFullYear(d.getFullYear() - 2);
    cutoff = _dateStr(d);
  }
  const ok = await confirm('Elimina log', `Eliminare tutte le righe di log precedenti al ${cutoff}?`);
  if (!ok) return;
  const res = await callJava('purgeLog', { cutoff });
  const result = document.getElementById('logPurgeResult');
  if (res.error) {
    result.style.color = 'var(--expense)';
    result.textContent = 'Errore: ' + res.error;
  } else {
    result.style.color = res.deleted > 0 ? 'var(--income)' : '';
    result.textContent = res.deleted > 0 ? `Eliminate ${res.deleted} righe` : 'Nessuna riga da eliminare';
    maintLoadLogInfo();
  }
};

/* ─── Custom themes ──────────────────────────────────────────────────────── */
let _customThemes  = [];
let _activeThemeKey = 'dark';
let _teWorkingTheme = null;
let _teOriginalTheme = null;
let _teDragState = null;

const _BUILTIN_VARS = {
  dark: {
    '--bg':'#0d1117','--bg2':'#161b22','--bg3':'#1c2128','--bg4':'#21262d',
    '--border':'#30363d','--accent':'#58a6ff','--accent2':'#00d4aa',
    '--income':'#3fb950','--expense':'#f85149','--warn':'#d29922',
    '--txt':'#e6edf3','--txt2':'#8b949e','--txt3':'#6e7681',
  },
  carta: {
    '--bg':'#ece5d8','--bg2':'#f4ede0','--bg3':'#e0d8cb','--bg4':'#d4ccbf',
    '--border':'#c2b8a6','--accent':'#8b5a18','--accent2':'#2e6e58',
    '--income':'#1e6b2e','--expense':'#b52a1a','--warn':'#7a5600',
    '--txt':'#241a08','--txt2':'#5c4a2c','--txt3':'#8a7860',
  },
  salvia: {
    '--bg':'#d8e4da','--bg2':'#e4ede6','--bg3':'#c8d5ca','--bg4':'#baccbe',
    '--border':'#a8b8aa','--accent':'#2563eb','--accent2':'#0891b2',
    '--income':'#15803d','--expense':'#dc2626','--warn':'#b45309',
    '--txt':'#0d1f12','--txt2':'#2d4a32','--txt3':'#5a7a60',
  },
  sintesi: {
    '--bg':'#0d0618','--bg2':'#140a28','--bg3':'#1c1038','--bg4':'#261548',
    '--border':'#3a2060','--accent':'#ff2d78','--accent2':'#00f5c0',
    '--income':'#39e87a','--expense':'#ff5040','--warn':'#ffd040',
    '--txt':'#f0e8ff','--txt2':'#b090d8','--txt3':'#705888',
  },
};

const _THEME_VAR_GROUPS = [
  { title: 'Sfondi', vars: [
    ['--bg',     'Sfondo principale'],
    ['--bg2',    'Sidebar / Card'],
    ['--bg3',    'Input / Tabelle'],
    ['--bg4',    'Hover'],
    ['--border', 'Bordi'],
  ]},
  { title: 'Testo', vars: [
    ['--txt',  'Testo principale'],
    ['--txt2', 'Testo secondario'],
    ['--txt3', 'Testo tenue'],
  ]},
  { title: 'Accenti & Colori', vars: [
    ['--accent',  'Accent principale'],
    ['--accent2', 'Accent secondario / Investimenti'],
    ['--income',  'Entrate'],
    ['--expense', 'Uscite'],
    ['--warn',    'Avviso'],
  ]},
];
const _ALL_THEME_VARS = _THEME_VAR_GROUPS.flatMap(g => g.vars.map(v => v[0]));

const _FONT_OPTIONS = [
  ["'Segoe UI', sans-serif",           'Segoe UI (default)'],
  ['Arial, sans-serif',                'Arial'],
  ['Verdana, sans-serif',              'Verdana'],
  ['Tahoma, sans-serif',               'Tahoma'],
  ['Calibri, sans-serif',              'Calibri'],
  ["'Trebuchet MS', sans-serif",       'Trebuchet MS'],
  ["'Gill Sans', sans-serif",          'Gill Sans'],
  ['Georgia, serif',                   'Georgia (serif)'],
  ["'Times New Roman', serif",         'Times New Roman (serif)'],
  ['Consolas, monospace',              'Consolas (mono)'],
  ["'Courier New', monospace",         'Courier New (mono)'],
];

async function _loadCustomThemes() {
  const s = await api.getSettings();
  try { _customThemes = JSON.parse(s['appearance.custom_themes'] || '[]'); } catch { _customThemes = []; }
}
async function _saveCustomThemesToDB() {
  await api.setSetting('appearance.custom_themes', JSON.stringify(_customThemes));
}
const _FONT_SIZE_VARS = [
  { key: '--fs-xs',    label: 'Badge e tag',       hint: 'badge colorati, tag filtro, etichette nav',  def: 10, min: 7,  max: 14 },
  { key: '--fs-sm',    label: 'Etichette',          hint: 'label campo, testo secondario, hint',        def: 11, min: 8,  max: 15 },
  { key: '--fs-md',    label: 'Pulsanti e input',   hint: 'bottoni, campi form',                        def: 12, min: 9,  max: 16 },
  { key: '--font-size',label: 'Corpo testo',        hint: 'testo principale, voci lista, menu',         def: 13, min: 10, max: 17 },
  { key: '--fs-lg',    label: 'Dati e tabelle',     hint: 'celle tabella, importi, valori',             def: 13, min: 11, max: 18 },
  { key: '--fs-xl',    label: 'Titolo finestra',    hint: 'barra del titolo applicazione',              def: 16, min: 12, max: 22 },
];

function _applyCustomVars(ct) {
  _ALL_THEME_VARS.forEach(v => {
    if (ct.vars[v]) document.documentElement.style.setProperty(v, ct.vars[v]);
    else document.documentElement.style.removeProperty(v);
  });
  document.documentElement.style.setProperty('--radius', (ct.radius ?? 8) + 'px');
  const fs = ct.fontSizes || {};
  _FONT_SIZE_VARS.forEach(({ key, def }) =>
    document.documentElement.style.setProperty(key, (fs[key] ?? (key === '--font-size' ? ct.fontSize : null) ?? def) + 'px')
  );
  document.body.style.fontFamily = ct.fontFamily || '';
}
function _clearCustomVars() {
  _ALL_THEME_VARS.forEach(v => document.documentElement.style.removeProperty(v));
  document.documentElement.style.removeProperty('--radius');
  _FONT_SIZE_VARS.forEach(({ key }) => document.documentElement.style.removeProperty(key));
  document.body.style.fontFamily = '';
}

function applyTheme(theme) {
  _activeThemeKey = theme || 'dark';
  _clearCustomVars();
  if (theme && theme.startsWith('c:')) {
    const ct = _customThemes.find(t => t.id === theme.slice(2));
    document.documentElement.dataset.theme = '';
    if (ct) _applyCustomVars(ct);
  } else {
    const valid = ['carta', 'salvia'];
    document.documentElement.dataset.theme = valid.includes(theme) ? theme : '';
  }
  _updateThemeBtn();
}

async function settingsSetTheme(theme) {
  applyTheme(theme);
  await api.setSetting('appearance.theme', theme);
  _updateThemeBtn();
  renderSettings();
}

const _THEME_CYCLE = [
  { key: '',      icon: '🌙', label: 'Scuro' },
  { key: 'carta', icon: '📜', label: 'Carta' },
  { key: 'salvia', icon: '🌿', label: 'Salvia' },
];

function _fullThemeCycle() {
  const customs = _customThemes.map(ct => ({ key: 'c:' + ct.id, icon: '🎨', label: ct.name }));
  return [..._THEME_CYCLE, ...customs];
}

function _updateThemeBtn() {
  const btn = document.getElementById('themeToggleBtn');
  if (!btn) return;
  const cycle = _fullThemeCycle();
  const activeKey = _activeThemeKey || '';
  const currIdx = cycle.findIndex(x => x.key === activeKey);
  const curr = currIdx >= 0 ? cycle[currIdx] : cycle[0];
  const next = cycle[(Math.max(currIdx, 0) + 1) % cycle.length];
  btn.textContent = curr.icon;
  btn.title = `Tema ${curr.label} — clicca per passare a ${next.label} (Alt+T)`;
}

async function _toggleTheme() {
  const cycle = _fullThemeCycle();
  const activeKey = _activeThemeKey || '';
  const currIdx = cycle.findIndex(x => x.key === activeKey);
  const next = cycle[(Math.max(currIdx, 0) + 1) % cycle.length];
  await settingsSetTheme(next.key || 'dark');
}

/* ─── Theme editor ───────────────────────────────────────────────────────── */
function duplicateTheme(sourceKey) {
  let base;
  if (sourceKey.startsWith('c:')) {
    const ct = _customThemes.find(t => t.id === sourceKey.slice(2));
    if (!ct) return;
    base = { ...ct, id: Date.now().toString(36), name: ct.name + ' (copia)', vars: { ...ct.vars } };
  } else {
    const names = { dark: 'Scuro', carta: 'Carta', salvia: 'Salvia', sintesi: 'Sintesi' };
    base = {
      id: Date.now().toString(36),
      name: (names[sourceKey] || 'Tema') + ' (copia)',
      vars: { ...(_BUILTIN_VARS[sourceKey] || _BUILTIN_VARS.dark) },
      baseKey: sourceKey,
      fontFamily: '', fontSize: 13, radius: 8,
    };
  }
  showThemeEditor(base);
}

function showThemeEditor(themeObj) {
  _teWorkingTheme = JSON.parse(JSON.stringify(themeObj));
  // Inizializza fontSizes con valori di default se mancanti
  if (!_teWorkingTheme.fontSizes) _teWorkingTheme.fontSizes = {};
  _FONT_SIZE_VARS.forEach(({ key, def }) => {
    if (_teWorkingTheme.fontSizes[key] == null)
      _teWorkingTheme.fontSizes[key] = key === '--font-size' ? (_teWorkingTheme.fontSize || def) : def;
  });
  _teOriginalTheme = _activeThemeKey;
  // Applica subito per live preview
  document.documentElement.dataset.theme = '';
  _applyCustomVars(_teWorkingTheme);

  let panel = document.getElementById('tePanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'tePanel';
    document.body.appendChild(panel);
    panel.addEventListener('mousedown', e => {
      if (!e.target.closest('#teHeader') || e.target.tagName === 'BUTTON') return;
      const r = panel.getBoundingClientRect();
      _teDragState = { x: e.clientX - r.left, y: e.clientY - r.top };
      e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
      if (!_teDragState) return;
      panel.style.left  = Math.max(0, e.clientX - _teDragState.x) + 'px';
      panel.style.top   = Math.max(0, e.clientY - _teDragState.y) + 'px';
      panel.style.right = 'auto';
    });
    document.addEventListener('mouseup', () => { _teDragState = null; });
  }

  const isNew = !_customThemes.find(t => t.id === _teWorkingTheme.id);
  const colorSections = _THEME_VAR_GROUPS.map(g => `
    <div class="te-section-hdr">${g.title}</div>
    ${g.vars.map(([v, label]) => {
      const val = _teWorkingTheme.vars[v] || '#888888';
      const base = _BUILTIN_VARS[_teWorkingTheme.baseKey || 'dark'] || _BUILTIN_VARS.dark;
      const defVal = base[v] || '';
      const isDefault = defVal && val.toLowerCase() === defVal.toLowerCase();
      return `<div class="te-color-row">
        <span class="te-color-label">${label}</span>
        <div class="te-color-inputs">
          <input type="color" class="te-swatch" data-var="${v}" value="${val}">
          <input type="text" class="te-hex" data-var="${v}" value="${val.toUpperCase()}" maxlength="7" spellcheck="false">
          <button class="te-reset-btn" data-var="${v}" title="Ripristina default (${defVal.toUpperCase()})" style="opacity:${isDefault?'0.2':'0.8'}"${!defVal?' disabled':''}>↺</button>
        </div>
      </div>`;
    }).join('')}`).join('');

  const fontSel = _FONT_OPTIONS.map(([v, l]) =>
    `<option value="${v}"${_teWorkingTheme.fontFamily===v?' selected':''}>${l}</option>`).join('');

  panel.innerHTML = `
    <div id="teHeader">
      <span>🎨 ${_teWorkingTheme.name}</span>
      <button class="btn btn-ghost btn-icon" onclick="closeThemeEditor(false)" title="Chiudi senza salvare">✕</button>
    </div>
    <div id="teBody">
      <div class="te-prop-row" style="padding-top:2px">
        <label>Nome</label>
        <input class="form-control" id="teName" value="${_teWorkingTheme.name}" placeholder="Nome tema" style="flex:1">
      </div>
      ${colorSections}
      <div class="te-section-hdr">Tipografia</div>
      <div class="te-prop-row">
        <label>Font</label>
        <select class="form-control" id="teFont" style="flex:1;min-width:0">${fontSel}</select>
      </div>
      <div class="te-prop-row">
        <label style="flex:none;margin-right:6px">Font personalizzato</label>
        <input class="form-control" id="teFontCustom" placeholder="es. Impact, sans-serif"
               value="${!_FONT_OPTIONS.find(([v])=>v===_teWorkingTheme.fontFamily) && _teWorkingTheme.fontFamily ? _teWorkingTheme.fontFamily : ''}"
               style="flex:1;font-size:var(--fs-sm,11px)">
      </div>
      ${_FONT_SIZE_VARS.map(({key, label, hint, def, min, max}) => {
        const fs = _teWorkingTheme.fontSizes || {};
        const val = fs[key] ?? (key==='--font-size' ? (_teWorkingTheme.fontSize||def) : def);
        const safeId = 'teFs_' + key.replace(/[^a-z0-9]/gi,'_');
        return `<div class="te-prop-row" style="align-items:center;gap:6px">
          <div style="flex:none;width:130px">
            <div style="font-size:var(--fs-md,12px);color:var(--txt);font-weight:500;line-height:1.3">${label}</div>
            <div style="font-size:var(--fs-xs,10px);color:var(--txt3);line-height:1.4">${hint}</div>
          </div>
          <input type="range" id="${safeId}" data-fskey="${key}" min="${min}" max="${max}" value="${val}" style="flex:1;min-width:0">
          <span class="te-range-val" id="${safeId}Val">${val}px</span>
          <span id="${safeId}Preview" style="font-size:${val}px;color:var(--txt2);min-width:22px;text-align:right;flex-shrink:0;line-height:1">Aa</span>
        </div>`;
      }).join('')}
      <div class="te-section-hdr">Forma</div>
      <div class="te-prop-row">
        <label>Raggio bordi</label>
        <input type="range" id="teRadius" min="0" max="20" value="${_teWorkingTheme.radius??8}" style="flex:1">
        <span class="te-range-val" id="teRadiusVal">${_teWorkingTheme.radius??8}px</span>
      </div>
    </div>
    <div id="teFooter">
      ${!isNew ? `<button class="btn btn-ghost btn-icon" style="color:var(--expense)" title="Elimina tema" onclick="_deleteCustomTheme('${_teWorkingTheme.id}')">🗑️</button>` : ''}
      <span style="flex:1"></span>
      <button class="btn btn-secondary" onclick="closeThemeEditor(false)">Annulla</button>
      <button class="btn btn-primary" onclick="closeThemeEditor(true)">Salva e applica</button>
    </div>`;

  panel.classList.add('open');
  _teWireEvents();
}

function _teWireEvents() {
  document.querySelectorAll('#tePanel input.te-swatch').forEach(el => {
    el.addEventListener('input', e => {
      const v = e.target.dataset.var, val = e.target.value;
      _teWorkingTheme.vars[v] = val;
      const hex = document.querySelector(`#tePanel input.te-hex[data-var="${v}"]`);
      if (hex) hex.value = val.toUpperCase();
      document.documentElement.style.setProperty(v, val);
    });
  });
  document.querySelectorAll('#tePanel input.te-hex').forEach(el => {
    el.addEventListener('input', e => {
      let val = e.target.value.trim();
      if (!val.startsWith('#')) val = '#' + val;
      if (/^#[0-9a-fA-F]{6}$/.test(val)) {
        const v = e.target.dataset.var;
        _teWorkingTheme.vars[v] = val;
        const sw = document.querySelector(`#tePanel input.te-swatch[data-var="${v}"]`);
        if (sw) sw.value = val;
        document.documentElement.style.setProperty(v, val);
      }
    });
    el.addEventListener('blur', e => {
      e.target.value = (_teWorkingTheme.vars[e.target.dataset.var] || '#888888').toUpperCase();
    });
  });
  document.querySelectorAll('#tePanel button.te-reset-btn').forEach(el => {
    el.addEventListener('click', e => {
      const v = e.currentTarget.dataset.var;
      const base = _BUILTIN_VARS[_teWorkingTheme.baseKey || 'dark'] || _BUILTIN_VARS.dark;
      const defVal = base[v];
      if (!defVal) return;
      _teWorkingTheme.vars[v] = defVal;
      const sw  = document.querySelector(`#tePanel input.te-swatch[data-var="${v}"]`);
      const hex = document.querySelector(`#tePanel input.te-hex[data-var="${v}"]`);
      const btn = e.currentTarget;
      if (sw)  sw.value  = defVal;
      if (hex) hex.value = defVal.toUpperCase();
      if (btn) btn.style.opacity = '0.2';
      document.documentElement.style.setProperty(v, defVal);
    });
  });
  const applyFont = val => {
    _teWorkingTheme.fontFamily = val;
    document.body.style.fontFamily = val;
  };
  document.getElementById('teFont')?.addEventListener('change', e => {
    applyFont(e.target.value);
    document.getElementById('teFontCustom').value = '';
  });
  document.getElementById('teFontCustom')?.addEventListener('input', e => {
    const val = e.target.value.trim();
    if (val) applyFont(val);
  });
  // Slider per ogni taglia font
  document.querySelectorAll('#tePanel input[data-fskey]').forEach(el => {
    el.addEventListener('input', e => {
      const key = e.target.dataset.fskey;
      const v = parseInt(e.target.value);
      _teWorkingTheme.fontSizes[key] = v;
      if (key === '--font-size') _teWorkingTheme.fontSize = v;
      const valEl = document.getElementById(e.target.id + 'Val');
      if (valEl) valEl.textContent = v + 'px';
      const previewEl = document.getElementById(e.target.id + 'Preview');
      if (previewEl) previewEl.style.fontSize = v + 'px';
      document.documentElement.style.setProperty(key, v + 'px');
    });
  });
  document.getElementById('teRadius')?.addEventListener('input', e => {
    const v = parseInt(e.target.value);
    _teWorkingTheme.radius = v;
    document.getElementById('teRadiusVal').textContent = v + 'px';
    document.documentElement.style.setProperty('--radius', v + 'px');
  });
}

async function closeThemeEditor(save) {
  const panel = document.getElementById('tePanel');
  if (!panel || !panel.classList.contains('open')) return;
  if (save) {
    const nameEl = document.getElementById('teName');
    if (nameEl) _teWorkingTheme.name = nameEl.value.trim() || 'Tema personalizzato';
    const idx = _customThemes.findIndex(t => t.id === _teWorkingTheme.id);
    if (idx >= 0) _customThemes[idx] = _teWorkingTheme;
    else _customThemes.push(_teWorkingTheme);
    await _saveCustomThemesToDB();
    await settingsSetTheme('c:' + _teWorkingTheme.id);
  } else {
    applyTheme(_teOriginalTheme || 'dark');
  }
  panel.classList.remove('open');
  _teWorkingTheme = null;
}

async function _deleteCustomTheme(id) {
  _customThemes = _customThemes.filter(t => t.id !== id);
  await _saveCustomThemesToDB();
  if (_activeThemeKey === 'c:' + id) await settingsSetTheme('dark');
  const panel = document.getElementById('tePanel');
  if (panel) panel.classList.remove('open');
  if (currentPage === 'settings') renderSettings();
}

/* ─── Shortcuts overlay ──────────────────────────────────────────────────── */
const _NAV_SHORTCUTS = [
  { key:'1', page:'dashboard',    label:'Dashboard' },
  { key:'2', page:'accounts',     label:'Conti' },
  { key:'3', page:'transactions', label:'Transazioni' },
  { key:'4', page:'budgets',      label:'Budget' },
  { key:'5', page:'scheduled',    label:'Pianificate' },
  { key:'6', page:'portfolio',    label:'Portfolio' },
  { key:'7', page:'analytics',    label:'Analisi' },
  { key:'8', page:'reports',      label:'Report' },
  { key:'9', page:'settings',     label:'Impostazioni' },
];

function showShortcutsHelp() {
  const kbdStyle = "background:var(--bg3);border:1px solid var(--border);border-radius:4px;padding:0 5px;font-size:10px";
  const overlay = document.getElementById('shortcutsOverlay');
  overlay.innerHTML = `
    <div id="shortcutsPanel">
      <h3>Scorciatoie da tastiera <span>premi <kbd style="${kbdStyle}">Esc</kbd> o <kbd style="${kbdStyle}">?</kbd> per chiudere</span></h3>
      <div class="sc-group">
        <div class="sc-group-title">Pagina Transazioni — generali</div>
        <div class="sc-row">
          <span class="sc-desc">Nuova transazione (spesa)</span>
          <span class="sc-keys"><kbd>N</kbd></span>
        </div>
        <div class="sc-row">
          <span class="sc-desc">Focus sulla ricerca</span>
          <span class="sc-keys"><kbd>F</kbd></span>
        </div>
      </div>
      <div class="sc-group">
        <div class="sc-group-title">Pagina Transazioni — riga selezionata</div>
        <div class="sc-row">
          <span class="sc-desc">Modifica</span>
          <span class="sc-keys"><kbd>E</kbd></span>
        </div>
        <div class="sc-row">
          <span class="sc-desc">Duplica</span>
          <span class="sc-keys"><kbd>D</kbd></span>
        </div>
        <div class="sc-row">
          <span class="sc-desc">Segna come conciliata</span>
          <span class="sc-keys"><kbd>R</kbd></span>
        </div>
        <div class="sc-row">
          <span class="sc-desc">Segna come "da verificare"</span>
          <span class="sc-keys"><kbd>V</kbd></span>
        </div>
        <div class="sc-row">
          <span class="sc-desc">Elimina</span>
          <span class="sc-keys"><kbd>Canc</kbd></span>
        </div>
      </div>
      <div class="sc-group">
        <div class="sc-group-title">Interfaccia</div>
        <div class="sc-row">
          <span class="sc-desc">Mostra questa guida</span>
          <span class="sc-keys"><kbd>?</kbd></span>
        </div>
      </div>
    </div>`;
  overlay.classList.add('open');
}

function closeShortcutsHelp() {
  document.getElementById('shortcutsOverlay').classList.remove('open');
}

async function settingsSetAccFilter(favOnly) {
  _accFavoritesOnly = favOnly;
  await api.setSetting('accounts.favorites_only', favOnly ? '1' : '0');
  renderSettings();
  updateSidebar();
}

async function settingsSetAutostart(value) {
  await api.setSetting('autostart.enabled', value);
  renderSettings();
}

async function settingsSetBackup(key, value) {
  await api.setSetting('backup.' + key, value);
  renderSettings();
}

async function settingsSetHttp(key, value) {
  await api.setSetting('http.' + key, value);
  renderSettings();
}

async function settingsChooseBackupDir() {
  const res = await api.chooseBackupDir();
  if (res.cancelled) return;
  await api.setSetting('backup.dir', res.path);
  renderSettings();
}

async function settingsChooseAttachmentsDir() {
  const res = await api.chooseAttachmentsDir();
  if (res.cancelled) return;
  await api.setSetting('attachments.dir', res.path);
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

async function settingsLoadBackupList() {
  const container = document.getElementById('backupRestoreList');
  if (!container) return;
  container.innerHTML = '<span class="settings-hint">⏳ Caricamento...</span>';
  try {
    const res = await api.listBackups();
    const list = res.backups || [];
    if (!list.length) {
      container.innerHTML = '<span class="settings-hint">Nessun backup trovato.</span>';
      return;
    }
    container.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:4px">
        <thead>
          <tr style="color:var(--txt2);border-bottom:1px solid var(--border)">
            <th style="text-align:left;padding:4px 8px">Data e ora</th>
            <th style="text-align:left;padding:4px 8px">Modifiche</th>
            <th style="text-align:right;padding:4px 8px">Dim.</th>
            <th style="padding:4px 8px"></th>
          </tr>
        </thead>
        <tbody>
          ${list.map((b,i) => {
            const changes = b.changes || [];
            const nChanges = changes.length;
            const rowBg = i%2===1 ? 'background:rgba(255,255,255,.025)' : '';
            const detailId = `bak-detail-${i}`;
            const changesCell = nChanges === 0
              ? `<span style="color:var(--txt3)">—</span>`
              : `<button class="btn-bak-changes" data-detail="${detailId}">
                   ${nChanges} ${nChanges===1?'modifica':'modifiche'}
                 </button>`;
            const detailRows = changes.map(c =>
              `<tr class="bak-detail-row ${detailId}" style="background:var(--bg3)">
                <td colspan="4" style="padding:3px 8px 3px 24px;font-size:11px;color:var(--txt2)">
                  <span style="color:var(--txt3);margin-right:6px">${c.time}</span>
                  <strong>${c.op}</strong>
                  ${c.desc ? `<span style="color:var(--txt3);margin-left:6px">${c.desc}</span>` : ''}
                </td>
              </tr>`
            ).join('');
            return `
            <tr style="border-bottom:1px solid var(--border);${rowBg}">
              <td style="padding:5px 8px;font-weight:600;color:var(--accent)">${b.displayTs}</td>
              <td style="padding:5px 8px">${changesCell}</td>
              <td style="padding:5px 8px;text-align:right;color:var(--txt3)">${(b.size/1024).toFixed(1)} KB</td>
              <td style="padding:5px 8px">
                <button class="btn btn-secondary btn-restore-bak" style="font-size:11px;padding:2px 10px"
                  data-path="${b.path.replace(/\\/g,'\\\\')}" data-ts="${b.displayTs}">
                  ♻️ Ripristina
                </button>
              </td>
            </tr>
            ${detailRows}`;
          }).join('')}
        </tbody>
      </table>`;
    container.querySelectorAll('.bak-detail-row').forEach(r => r.classList.add('hidden'));
    container.querySelectorAll('.btn-bak-changes').forEach(btn => {
      btn.addEventListener('click', () => {
        const rows = container.querySelectorAll(`.${btn.dataset.detail}`);
        const open = !rows[0]?.classList.contains('hidden');
        rows.forEach(r => r.classList.toggle('hidden', open));
        btn.classList.toggle('active', !open);
      });
    });
    container.querySelectorAll('.btn-restore-bak').forEach(btn => {
      btn.addEventListener('click', () => settingsConfirmRestore(btn.dataset.path, btn.dataset.ts));
    });
  } catch(e) {
    container.innerHTML = `<span class="settings-hint" style="color:var(--expense)">❌ ${e.message}</span>`;
  }
}

async function settingsConfirmRestore(path, displayTs) {
  const ok = await confirm('Ripristina backup', `Ripristinare il backup del <strong>${displayTs}</strong>?<br><br>Il database corrente verrà archiviato nella cartella backup prima di procedere.`);
  if (!ok) return;
  const container = document.getElementById('backupRestoreList');
  if (container) container.innerHTML = '<span class="settings-hint">⏳ Ripristino in corso...</span>';
  try {
    const res = await api.restoreBackup(path);
    openModal('✅ Ripristino completato',
      `<p style="color:var(--txt2);line-height:1.6">Database precedente archiviato in:<br><code style="font-size:11px">${res.archived}</code><br><br>L'applicazione verrà ricaricata.</p>`,
      () => { closeModal(); location.reload(); }, 'Ok', 'btn-primary');
  } catch(e) {
    if (container) container.innerHTML = `<span class="settings-hint" style="color:var(--expense)">❌ ${e.message}</span>`;
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
            <span class="cat-color-dot" style="background:${p.color}" title="${p.color}"></span>
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
                  <span class="cat-color-dot" style="background:${k.color}" title="${k.color}"></span>
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
      closeModal();
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
              ${t.is_system ? '<span class="text-muted" style="font-size:11px;margin-left:4px" title="Tag di sistema">🔒</span>' : ''}
              <div style="margin-left:auto;display:flex;gap:4px">
                <button class="btn btn-ghost btn-icon" onclick="editTagMgmt(${t.id})">✏️</button>
                ${t.is_system ? '' : `<button class="btn btn-ghost btn-icon" onclick="deleteTagMgmt(${t.id})">🗑️</button>`}
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
   PERIODI PERSONALIZZATI
═══════════════════════════════════════════════════════════════════════════ */

async function renderRangePresets() {
  const pg = document.getElementById('pg-ranges');
  const presets = await api.getRangePresets();
  pg.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">Periodi personalizzati</h2>
      <button class="btn btn-primary" id="btnAddRangePreset">+ Nuovo periodo</button>
    </div>
    <div class="card" style="margin-bottom:12px">
      <p class="text-muted" style="font-size:12px;padding:8px 0 4px">
        I periodi personalizzati vengono aggiunti ai range predefiniti in tutti i filtri per data
        (transazioni, filtri analitici…). Puoi definire intervalli in giorni, settimane, mesi o anni.
      </p>
    </div>
    <div class="card" style="margin-bottom:12px;border-left:3px solid var(--accent);background:var(--bg3)">
      <div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--accent);padding:10px 12px 6px">📖 Guida agli offset</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="border-bottom:1px solid var(--border)">
            <th style="text-align:left;padding:4px 12px;color:var(--text-muted);font-weight:600">Da</th>
            <th style="text-align:left;padding:4px 12px;color:var(--text-muted);font-weight:600">A</th>
            <th style="text-align:left;padding:4px 12px;color:var(--text-muted);font-weight:600">Risultato</th>
          </tr>
        </thead>
        <tbody>
          ${[
            ['-7 D',  '0 D',  'ultimi 7 giorni'],
            ['0 Y',   '0 Y',  'anno corrente (1 gen → 31 dic)'],
            ['-1 Y',  '-1 Y', 'anno scorso'],
            ['-1 Y',  '+2 Y', 'da inizio anno scorso a fine 2028'],
            ['0 M',   '0 M',  'mese corrente'],
            ['-3 M',  '0 M',  'ultimi 3 mesi (inizio mese → fine mese corrente)'],
            ['-1 W',  '0 W',  'settimana scorsa + settimana corrente'],
          ].map(([da,a,res],i) => `
            <tr style="${i%2===0?'':'background:color-mix(in srgb,var(--accent) 10%,var(--bg))'}">
              <td style="padding:5px 12px"><code style="background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--accent);padding:1px 6px;border-radius:4px;font-size:11.5px">${da}</code></td>
              <td style="padding:5px 12px"><code style="background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--accent);padding:1px 6px;border-radius:4px;font-size:11.5px">${a}</code></td>
              <td style="padding:5px 12px;color:var(--text-muted);font-size:12px">${res}</td>
            </tr>`).join('')}
        </tbody>
      </table>
      <p style="font-size:11px;color:var(--text-muted);padding:8px 12px 10px;margin:0;border-top:1px solid var(--border)">
        Per <strong>Mese/Anno</strong> la data "Da" prende sempre l'inizio del periodo (1° del mese, 1 gennaio),
        la data "A" prende la fine (ultimo giorno del mese, 31 dicembre).
      </p>
    </div>
    <div class="card">
      ${presets.length ? `
        <div class="tags-mgmt-list">
          ${presets.map(p => {
            const preview = (() => { try { const f=rangeToFilter(p.range_key); return f.date_from && f.date_to ? `${f.date_from} → ${f.date_to}` : ''; } catch { return ''; } })();
            return `
            <div class="tag-mgmt-row">
              <span style="font-weight:500">${p.label}</span>
              <span class="tag-inline" style="--tc:#58a6ff;font-size:11px;padding:2px 8px;margin-left:8px">${p.range_key}</span>
              ${preview ? `<span class="text-muted" style="font-size:11px;margin-left:8px">${preview}</span>` : ''}
              <div style="margin-left:auto;display:flex;gap:4px">
                <button class="btn btn-ghost btn-icon" onclick="editRangePreset(${p.id})">✏️</button>
                <button class="btn btn-ghost btn-icon" onclick="deleteRangePresetMgmt(${p.id})">🗑️</button>
              </div>
            </div>`;
          }).join('')}
        </div>` :
        `<p class="text-muted" style="text-align:center;padding:30px">Nessun periodo personalizzato. Creane uno cliccando "+ Nuovo periodo".</p>`
      }
    </div>`;

  document.getElementById('btnAddRangePreset').onclick = () => showRangePresetModal(null);
}

function showRangePresetModal(preset) {
  const isEdit = !!preset;

  // Parse range_key esistente (nuovo formato {int}{unit}..{int}{unit} o vecchio Nd/Nm/Ny)
  let fromOff = -30, fromUnit = 'D', toOff = 0, toUnit = 'D';
  if (preset) {
    const rk = preset.range_key;
    const pa = rk.match(/^(-?\d+)([DWMY])\.\.(-?\d+)([DWMY])$/);
    if (pa) {
      fromOff=parseInt(pa[1]); fromUnit=pa[2]; toOff=parseInt(pa[3]); toUnit=pa[4];
    } else {
      const mD=rk.match(/^(\d+)d$/), mM=rk.match(/^(\d+)m$/), mY=rk.match(/^(\d+)y$/);
      if (mD)      { fromOff=-parseInt(mD[1]); fromUnit='D'; toOff=0; toUnit='D'; }
      else if (mM) { fromOff=-parseInt(mM[1]); fromUnit='M'; toOff=0; toUnit='M'; }
      else if (mY) { fromOff=-parseInt(mY[1]); fromUnit='Y'; toOff=0; toUnit='Y'; }
    }
  }

  const unitOpts = (sel) => ['D','W','M','Y'].map(v =>
    `<option value="${v}"${v===sel?' selected':''}>${{D:'Giorno',W:'Settimana',M:'Mese',Y:'Anno'}[v]}</option>`
  ).join('');

  const body = `
    <div class="form-group">
      <label class="form-label">Nome</label>
      <input class="form-control" id="rp_label" value="${preset?.label||''}" placeholder="es. Ultimi 45 giorni, Anno corrente…">
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:4px">
      <div class="form-group">
        <label class="form-label">Da</label>
        <div style="display:flex;gap:6px">
          <input type="number" class="form-control" id="rp_from_off" value="${fromOff}" style="width:76px">
          <select class="form-control" id="rp_from_unit">${unitOpts(fromUnit)}</select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">A</label>
        <div style="display:flex;gap:6px">
          <input type="number" class="form-control" id="rp_to_off" value="${toOff}" style="width:76px">
          <select class="form-control" id="rp_to_unit">${unitOpts(toUnit)}</select>
        </div>
      </div>
    </div>
    <div style="font-size:12px;color:var(--txt3);padding:6px 0 2px;line-height:2">
      Codice: <code id="rp_code" style="font-family:monospace;color:var(--txt2);background:var(--bg3);padding:2px 6px;border-radius:4px"></code>
      &nbsp;&nbsp;Anteprima: <span id="rp_preview" style="color:var(--accent)"></span>
    </div>
    <div style="font-size:11px;color:var(--txt3)">
      Offset 0 = periodo corrente. Negativi = passato, positivi = futuro.<br>
      Per unità Mese/Anno: "Da" prende l'inizio, "A" prende la fine del periodo.
    </div>`;

  openModal(isEdit ? 'Modifica periodo' : 'Nuovo periodo', body, async () => {
    const label    = document.getElementById('rp_label').value.trim();
    const fromOffV = parseInt(document.getElementById('rp_from_off').value);
    const fromUnitV= document.getElementById('rp_from_unit').value;
    const toOffV   = parseInt(document.getElementById('rp_to_off').value);
    const toUnitV  = document.getElementById('rp_to_unit').value;
    if (!label) { toast('Inserisci un nome', 'error'); return; }
    if (isNaN(fromOffV) || isNaN(toOffV)) { toast('Offset non valido', 'error'); return; }
    const range_key = `${fromOffV}${fromUnitV}..${toOffV}${toUnitV}`;
    try {
      if (isEdit) await api.updateRangePreset({id: preset.id, label, range_key});
      else        await api.addRangePreset({label, range_key});
      closeModal();
      toast(isEdit ? 'Periodo aggiornato' : 'Periodo aggiunto');
      renderRangePresets();
    } catch(e) { toast(e.message, 'error'); }
  });

  // Preview live
  setTimeout(() => {
    const upd = () => {
      const fo = parseInt(document.getElementById('rp_from_off')?.value) || 0;
      const fu = document.getElementById('rp_from_unit')?.value || 'D';
      const to = parseInt(document.getElementById('rp_to_off')?.value)   || 0;
      const tu = document.getElementById('rp_to_unit')?.value   || 'D';
      const key = `${fo}${fu}..${to}${tu}`;
      const cEl = document.getElementById('rp_code');
      const pEl = document.getElementById('rp_preview');
      if (cEl) cEl.textContent = key;
      if (pEl) {
        try {
          const f = rangeToFilter(key);
          pEl.textContent = f.date_from && f.date_to ? `${f.date_from} → ${f.date_to}`
                          : f.date_from ? `dal ${f.date_from}` : f.date_to ? `al ${f.date_to}` : '—';
        } catch { pEl.textContent = '—'; }
      }
    };
    ['rp_from_off','rp_from_unit','rp_to_off','rp_to_unit'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.oninput = upd; el.onchange = upd; }
    });
    upd();
  }, 50);
}

window.editRangePreset = async id => {
  const presets = await api.getRangePresets();
  showRangePresetModal(presets.find(p => p.id === id));
};

window.deleteRangePresetMgmt = async id => {
  const ok = await confirm('Elimina periodo', 'Eliminare questo periodo personalizzato?');
  if (!ok) return;
  try {
    await api.deleteRangePreset({id});
    toast('Periodo eliminato');
    renderRangePresets();
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

// origStart: data della prima occorrenza storica (original_start_date dal DB).
// Se presente viene usata come limite inferiore così le transazioni create
// a metà anno non vengono proiettate prima della loro vera data di inizio.
// Se NULL (record pre-migrazione) si usa il comportamento storico (proiezione a yStart).
function _countSchedYearOcc(freq, startDate, endDate, year, origStart) {
  const yStart = `${year}-01-01`;
  const yEnd   = `${year}-12-31`;
  if (!startDate) return 0;
  if (endDate && endDate < yStart) return 0;
  const effEnd   = (endDate   && endDate   < yEnd)   ? endDate   : yEnd;
  const effStart = (origStart && origStart > yStart)  ? origStart : yStart;

  // 'once': conta solo se la data cade nel range effettivo
  if (freq === 'once') return (startDate >= effStart && startDate <= effEnd) ? 1 : 0;

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
    if (cur >= effStart) count++;
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

  // Pianificate annuali per categoria (solo attive, no trasferimenti)
  const schedByCat = {};
  for (const s of scheds) {
    if (!s.is_active || s.type === 'transfer' || !s.category_id) continue;
    const occ = _countSchedYearOcc(s.frequency, s.start_date, s.end_date, budgetYear, s.original_start_date);
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
      <td><a style="cursor:pointer;color:inherit;text-decoration:none" onmouseover="this.style.color='var(--accent)'" onmouseout="this.style.color=''" onclick="schedTab='lista';_schedFilter.category='${r.catId}';renderScheduled()">${r.cat.icon||''} ${catLabel}</a></td>
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
      <div class="scheduled-tabs" id="schedTabBar">
        <button class="sched-tab ${schedTab==='lista'?'active':''}"       data-stab="lista"       onclick="setSchedTab('lista')">📋 Lista</button>
        <button class="sched-tab ${schedTab==='projection'?'active':''}" data-stab="projection"  onclick="setSchedTab('projection')">📈 Proiezione Saldo</button>
        <button class="sched-tab ${schedTab==='cashflow'?'active':''}"   data-stab="cashflow"    onclick="setSchedTab('cashflow')">💰 Flusso di Cassa</button>
        <button class="sched-tab ${schedTab==='forecasts'?'active':''}"  data-stab="forecasts"   onclick="setSchedTab('forecasts')">🔮 Previsioni</button>
        <button class="sched-tab ${schedTab==='verificabud'?'active':''}" data-stab="verificabud" onclick="setSchedTab('verificabud')">🔗 Verifica Budget</button>
      </div>
    </div>
    <div id="schedContent" style="flex:1;overflow-y:auto;padding:0 16px 16px"></div>`;

  renderSchedTab();
}

window.setSchedTab = tab => {
  schedTab = tab;
  document.querySelectorAll('#schedTabBar .sched-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.stab === tab);
  });
  renderSchedTab();
};

async function renderSchedTab() {
  if      (schedTab === 'lista')      await renderSchedLista();
  else if (schedTab === 'projection') await renderSchedProjection();
  else if (schedTab === 'cashflow')   await renderSchedCashflow();
  else if (schedTab === 'forecasts')  await renderForecastsInTab();
  else if (schedTab === 'verificabud') await renderBudgetVsPianificate();
}

// Conta le occorrenze rimanenti da start_date a end_date inclusi.
// Ritorna '∞' se end_date è assente, 0 se la pianificata è già terminata.
function _schedOccurrences(startDate, freq, endDate) {
  if (!endDate) return '∞';
  if (!startDate) return '—';
  const start = new Date(startDate + 'T00:00:00');
  const end   = new Date(endDate   + 'T00:00:00');
  if (start > end) return 0;
  if (freq === 'once') return 1;
  const days = Math.round((end - start) / 86400000);
  if (freq === 'daily')    return days + 1;
  if (freq === 'weekly')   return Math.floor(days / 7) + 1;
  if (freq === 'biweekly') return Math.floor(days / 14) + 1;
  const step = { monthly:1, monthly_last:1, bimonthly:2, quarterly:3, semiannual:6, yearly:12 }[freq] || 1;
  let count = 0, cur = new Date(start);
  while (cur <= end) { count++; cur.setMonth(cur.getMonth() + step); }
  return count;
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
let _portfolioTypeFilter = 'all'; // 'all' | 'equity' | 'bond'
let _portfolioSort = { col: 'ticker', dir: 1 };
let _portfolioTab = 'portfolio';
let _portfolioItems = [];
let _portStoricoExp    = new Set();
let _portStoricoFilter = 'all'; // 'all' | 'active' | 'closed'
let _portfolioPriceStatus = {}; // id → 'ok' | 'fail' | undefined (grigio)
let _schedSort   = { col: 'days', dir: 'asc' };
let _schedFilter = { type: '', active: '1', category: '', tags: new Set() };

function _buildSchedCatOptions(categories) {
  const parents  = categories.filter(c => !c.parent_id).sort((a,b) => (a.name||'').localeCompare(b.name));
  const childMap = {};
  categories.filter(c => c.parent_id).forEach(c => {
    (childMap[c.parent_id] = childMap[c.parent_id] || []).push(c);
  });
  const sel = _schedFilter.category;
  let html = `<option value="">Tutte le categorie</option>`;
  for (const p of parents) {
    const children = (childMap[p.id] || []).sort((a,b) => (a.name||'').localeCompare(b.name));
    if (children.length) {
      html += `<option value="p:${p.id}" ${sel===`p:${p.id}`?'selected':''}>${p.icon||''} ${p.name}</option>`;
      for (const c of children)
        html += `<option value="${c.id}" ${sel===String(c.id)?'selected':''}>&nbsp;&nbsp;└ ${c.icon||''} ${c.name}</option>`;
    } else {
      html += `<option value="${p.id}" ${sel===String(p.id)?'selected':''}>${p.icon||''} ${p.name}</option>`;
    }
  }
  return html;
}

async function renderSchedLista() {
  const [scheds, accounts, categories, tags] = await Promise.all([
    api.getScheduled(), api.getAccounts(), api.getCategories(), api.getTags()
  ]);

  // Mappa categorie per il filtro: id → parent_id
  window._schedCatParentMap = Object.fromEntries(categories.map(c => [c.id, c.parent_id ?? null]));
  window._schedCatsArr = categories;
  window._schedTagsArr = tags;

  // Arricchisce ogni pianificata con prossima data e giorni rimanenti
  const todayStr = _todayStr();
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
      <div class="filter-bar" style="margin-bottom:0;flex:1;flex-wrap:wrap">
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
        <select class="form-control" id="sfCat">
          ${_buildSchedCatOptions(categories)}
        </select>
        <div class="sched-tag-filter" id="sfTagWrap">
          <button class="form-control sched-tag-btn" id="sfTagBtn" type="button">
            ${_schedFilter.tags.size ? `Tag: ${_schedFilter.tags.size} ✕` : 'Tutti i tag ▾'}
          </button>
          <div class="sched-tag-dropdown" id="sfTagDrop" style="display:none">
            ${tags.length ? tags.map(t => `
              <label class="sched-tag-opt">
                <input type="checkbox" value="${t.id}" ${_schedFilter.tags.has(t.id)?'checked':''}>
                <span class="tag-chip" style="background:${t.color}22;color:${t.color};border-color:${t.color}55">${t.name}</span>
              </label>`).join('') : '<span style="padding:8px;color:var(--txt3);font-size:12px">Nessun tag</span>'}
          </div>
        </div>
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
          <th class="sched-th-sort" data-scol="occ" onclick="_schedSortBy('occ')" title="Occorrenze rimanenti fino alla data di scadenza">Occ.<span class="sort-ind"></span></th>
          <th></th>
        </tr></thead><tbody id="schedBody"></tbody></table>
      </div>
    </div>`;

  document.getElementById('btnNewSched').onclick = () => showScheduledModal(null, accounts, categories, tags);
  document.getElementById('sfActive').addEventListener('change', e => { _schedFilter.active   = e.target.value; _renderSchedRows(scheds); });
  document.getElementById('sfType').addEventListener('change',   e => { _schedFilter.type     = e.target.value; _renderSchedRows(scheds); });
  document.getElementById('sfCat').addEventListener('change',    e => { _schedFilter.category = e.target.value; _renderSchedRows(scheds); });

  // Tag multi-select dropdown
  const tagBtn  = document.getElementById('sfTagBtn');
  const tagDrop = document.getElementById('sfTagDrop');
  tagBtn.addEventListener('click', e => {
    e.stopPropagation();
    tagDrop.style.display = tagDrop.style.display === 'none' ? 'block' : 'none';
  });
  tagDrop.querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', () => {
      const id = Number(cb.value);
      if (cb.checked) _schedFilter.tags.add(id); else _schedFilter.tags.delete(id);
      tagBtn.textContent = _schedFilter.tags.size ? `Tag: ${_schedFilter.tags.size} ✕` : 'Tutti i tag ▾';
      _renderSchedRows(scheds);
    });
  });
  document.addEventListener('click', function _closeTagDrop(e) {
    if (!document.getElementById('sfTagWrap')?.contains(e.target)) {
      if (tagDrop) tagDrop.style.display = 'none';
      document.removeEventListener('click', _closeTagDrop);
    }
  });

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
    if (_schedFilter.category !== '') {
      const cv = _schedFilter.category;
      if (cv.startsWith('p:')) {
        const pid = Number(cv.slice(2));
        const parentMap = window._schedCatParentMap || {};
        const isChild = s.category_id && parentMap[s.category_id] === pid;
        const isSelf  = s.category_id === pid;
        if (!isChild && !isSelf) return false;
      } else {
        if (String(s.category_id) !== cv) return false;
      }
    }
    if (_schedFilter.tags.size > 0) {
      const sTags = new Set((s.tags || []).map(t => Number(t.id)));
      if (![..._schedFilter.tags].some(tid => sTags.has(tid))) return false;
    }
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
      case 'occ': {
        const toN = v => v === '∞' ? Infinity : v === '—' ? -1 : Number(v);
        va = toN(_schedOccurrences(a.start_date, a.frequency, a.end_date));
        vb = toN(_schedOccurrences(b.start_date, b.frequency, b.end_date));
        break;
      }
      case 'days':
      default:
        va = a._days ?? 99999; vb = b._days ?? 99999;
    }
    const c = va < vb ? -1 : va > vb ? 1 : 0;
    return _schedSort.dir === 'asc' ? c : -c;
  });

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:40px;color:var(--txt3)">Nessuna transazione pianificata.</td></tr>';
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
      <td style="text-align:center;color:var(--txt2)">${_schedOccurrences(s.start_date, s.frequency, s.end_date)}</td>
      <td class="sched-actions">
        <div class="sched-actions-wrap">
          ${s.is_active && s._next ? `<button class="btn btn-xs btn-success" onclick="registerSched(${s.id})" title="Inserisci transazione">✔ Inserisci</button>
          <button class="btn btn-xs btn-ghost" onclick="skipSched(${s.id})" title="Salta questa occorrenza">⏭ Salta</button>` : ''}
        </div>
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
  // Fix timezone bug: usa date locali invece di toISOString() che converte in UTC
  const localFmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const y = today.getFullYear();

  if (useMonthBoundaries) {
    // Mensile: parte sempre da oggi (saldo reale attuale), arriva alla fine dell'N-esimo mese
    // Mostra un punto per fine mese → N punti totali
    // Stessa data di fine del daily: oggi + N mesi
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
    const end = new Date(today); end.setMonth(end.getMonth() + n);
    const eom = new Date(end.getFullYear(), end.getMonth() + 1, 0); // fine del mese di arrivo
    return { from_date: localFmt(today), to_date: localFmt(eom) };
  }

  // Daily: parte da oggi, fine arrotondata a fine mese di arrivo
  const addEom = months => {
    const d = new Date(today); d.setMonth(d.getMonth() + months);
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
  };
  switch(range) {
    case '3m':       return { from_date: localFmt(today), to_date: localFmt(addEom(3)) };
    case '6m':       return { from_date: localFmt(today), to_date: localFmt(addEom(6)) };
    case '1y':       return { from_date: localFmt(today), to_date: localFmt(addEom(12)) };
    case '2y':       return { from_date: localFmt(today), to_date: localFmt(addEom(24)) };
    case 'ytd':      return { from_date: `${y}-01-01`, to_date: `${y}-12-31` };
    case 'nxt_year': return { from_date: `${y+1}-01-01`, to_date: `${y+1}-12-31` };
    case 'custom':   { const m = parseInt(customMonths)||6;
                       return { from_date: localFmt(today), to_date: localFmt(addEom(m)) }; }
    default:         return { from_date: localFmt(today), to_date: localFmt(addEom(6)) };
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
      <div style="margin-top:12px;text-align:right">
        <button class="btn btn-ghost" id="btnSalvaPrevisione" style="gap:6px">🔮 Salva previsione</button>
      </div>
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

  document.getElementById('btnSalvaPrevisione').addEventListener('click', async () => {
    const range      = document.getElementById('projRange')?.value || '6m';
    const customMths = document.getElementById('projMonths')?.value;
    const isDaily    = _projMode === 'daily';
    const { from_date, to_date } = projRangeToFilter(range, customMths, !isDaily);
    if (!from_date || !to_date) { toast('Nessun periodo selezionato','error'); return; }

    // Saldo proiettato = ultimo valore del grafico
    const accIds = accounts.filter(a=>a.type!=='investment').map(a=>a.id).join(',');
    let proj; try { proj = await api.getProjection({from_date, to_date, account_ids:accIds, daily:isDaily}); }
    catch(e) { toast(e.message,'error'); return; }
    const dates  = [...new Set(proj.series.map(p=>p.date))].sort();
    const lastDate = dates[dates.length-1] || to_date;
    const lastBal  = dates.length
      ? proj.series.filter(p=>p.date===lastDate).reduce((s,p)=>s+p.balance,0)
      : 0;

    // Categorie pianificate nel periodo
    let cats; try { cats = await api.getProjectionByCategory({from_date, to_date}); }
    catch(e) { toast(e.message,'error'); return; }

    openModal('Salva previsione', `
      <div style="display:flex;flex-direction:column;gap:10px">
        <div>
          <label class="form-label">Data previsione</label>
          <input type="date" class="form-control" id="fcDate" value="${to_date}">
          <div class="settings-hint" style="margin-top:4px">Il giorno fino al quale proiettiamo</div>
        </div>
        <div>
          <label class="form-label">Saldo proiettato</label>
          <div style="font-size:15px;font-weight:600;color:var(--accent)">${fmt.currency(lastBal)}</div>
        </div>
        <div>
          <label class="form-label">Categorie pianificate (${cats.length})</label>
          <div style="max-height:160px;overflow-y:auto;font-size:12px;border:1px solid var(--border);border-radius:6px;padding:6px">
            ${cats.length ? cats.map(c=>`<div style="display:flex;justify-content:space-between;padding:2px 4px">
              <span style="color:${c.type==='income'?'var(--income)':'var(--expense)'}">${c.category_name}</span>
              <span>${fmt.currency(c.projected_amount)}</span>
            </div>`).join('') : '<span style="color:var(--txt3)">Nessuna transazione pianificata</span>'}
          </div>
        </div>
      </div>
    `, async () => {
      const forecastDate = document.getElementById('fcDate').value;
      if (!forecastDate) { toast('Seleziona una data','error'); return; }
      try {
        await api.saveForecast({ forecast_date: forecastDate, projected_balance: lastBal, categories: cats });
        toast('Previsione salvata');
        closeModal();
      } catch(e) { toast(e.message,'error'); }
    }, 'Salva');
  });
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
      plugins: { legend: { labels: { color:chartColors().tick } }, zoom: zoomOpts() },
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
    // Δ totale sempre relativo al saldo di oggi (primo punto della serie)
    const todayPts = series.filter(p => p.date === dates[0]);
    const firstTotal = todayPts.length ? todayPts.reduce((s,p)=>s+p.balance,0) : monthTotals.find(t=>t!=null);

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
      plugins: { legend: { labels: { color:chartColors().tick } }, zoom: zoomOpts() },
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

function _resolveOverdue(schedId) {
  for (const type of ['overdue', 'duetoday']) {
    const entry = _noticeData.find(n => n.type === type);
    if (!entry) continue;
    entry.list = entry.list.filter(u => u.id !== schedId);
    if (entry.list.length === 0) _noticeData.splice(_noticeData.indexOf(entry), 1);
  }
  updateNoticeBtn();
}

window.skipSched = async id => {
  const s = window._schedCache?.[id];
  if (!s || !s._next) return;
  await api.advanceScheduled(id, s._next);
  _resolveOverdue(id);
  toast('Occorrenza saltata');
  renderSchedLista();
};

window.registerSched = async id => {
  const s = window._schedCache?.[id];
  if (!s || !s._next) return;
  const [cats, accs, tags] = await Promise.all([
    api.getCategories(), api.getAccounts(), api.getTags()
  ]);
  const budgetTag = tags.find(t => t.system_key === 'budget');
  const existingIds = (s.tags || []).map(t => t.id);
  const tagIds = budgetTag && !existingIds.includes(budgetTag.id)
    ? [...existingIds, budgetTag.id]
    : existingIds;
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
    tag_ids: tagIds
  };
  showTxModal(prefilled, cats, accs, s.type, tags, async (txResult) => {
    await api.advanceScheduled(id, s._next, txResult?.id);
    _resolveOverdue(id);
    renderSchedLista();
  });
};

function showScheduledModal(sched, accounts, categories, tags = []) {
  const isEdit = !!(sched?.id);
  const today  = _todayStr();
  const initType = sched?.type || 'expense';

  const expCats = categories.filter(c=>c.type==='expense');
  const incCats = categories.filter(c=>c.type==='income');

  const body = `
    ${sched?.portfolio_id ? `<div class="portfolio-link-banner">📈 Collegata a posizione portfolio</div>` : ''}
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
        <input type="text" inputmode="decimal" class="form-control" id="sc_amount" value="${sched?.amount||''}" placeholder="es. 40+10.30 o 100/3*2" autocomplete="off">
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
        <div class="flex-center-8">
          <input type="color" id="sc_color" class="form-color-tx" value="${sched?.color||'#ffffff'}">
          <label class="settings-hint" style="display:flex;align-items:center;gap:6px;cursor:pointer">
            <input type="checkbox" id="sc_color_use" ${sched?.color?'checked':''} style="margin:0">
            Usa colore
          </label>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Attivo</label>
        <label class="flex-center-8" style="cursor:pointer;margin-top:6px">
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
      <div class="recon-toggle" id="scReconToggle">
        <input type="radio" name="sc_reconciled" id="sc_rec_pending" value="0" ${sched?.reconciled==0?'checked':''} hidden>
        <input type="radio" name="sc_reconciled" id="sc_rec_done"    value="1" ${sched==null||sched?.reconciled!=0?'checked':''} hidden>
        <button type="button" class="recon-opt${sched?.reconciled==0?' active':''}" data-val="0" data-radio="sc_rec_pending">🔲 Da verificare</button>
        <button type="button" class="recon-opt${sched==null||sched?.reconciled!=0?' active':''}" data-val="1" data-radio="sc_rec_done">✅ Conciliata</button>
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
      amount:        evalAmount(document.getElementById('sc_amount').value),
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
    if (!data.amount) { _markErr('sc_amount', 'Inserisci l\'importo'); return false; }
    if (!data.account_id) { _markErr('sc_account', 'Seleziona il conto'); return false; }
    if (data.type !== 'transfer' && !data.category_id) { _markErr('sc_cat_input', 'Seleziona la categoria'); return false; }
    if (!data.start_date) { _markErr('sc_start', 'Inserisci la data di inizio'); return false; }
    try {
      if (isEdit) await api.updateScheduled(data);
      else        await api.addScheduled(data);
      closeModal();
      toast(isEdit ? 'Transazione pianificata aggiornata' : 'Transazione pianificata aggiunta');
      renderSchedLista();
    } catch(e) { toast(e.message, 'error'); return false; }
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

  document.querySelectorAll('#scReconToggle .recon-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#scReconToggle .recon-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.radio).checked = true;
    });
  });

  // Enter su importo → salva; blur → valuta espressione
  const scAmtEl = document.getElementById('sc_amount');
  if (scAmtEl) {
    scAmtEl.addEventListener('blur', () => {
      const v = evalAmount(scAmtEl.value);
      if (v !== null) scAmtEl.value = v.toFixed(2);
    });
    scAmtEl.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); document.getElementById('modalConfirm')?.click(); }
    });
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   INIT — notices
═══════════════════════════════════════════════════════════════════════════ */
const _noticeData = []; // {type:'telefono'|'overdue'|'forecast'|'unverified', list}
let _noticeDelay = 0; // stagger automatico tra notice successive

/** Chiamata quando l'app torna visibile dal tray.
 *  Invalida i cache JS (il DB su OneDrive potrebbe essere cambiato),
 *  ricarica la pagina corrente e ricontrolla tutte le scadenze/notifiche. */
async function onTrayRestore() {
  // Invalida cache in-session: il DB potrebbe essere stato sincronizzato da Android
  api._invalidateAccounts();
  api._invalidateCategories();
  api._invalidateTags();
  // Ricarica la pagina con dati freschi
  await renderPage();
  // Azzera le notice stale e ricontrolla tutto da zero
  _noticeData.length = 0;
  _noticeDelay = 0;
  try {
    const daTelefono = await api.getTransactionsWithTag('phone');
    if (daTelefono.length) showDaTelefonoNotice(daTelefono);
  } catch(e) {}
  try {
    const overdue = await api.getOverdue();
    if (overdue.length) showOverdueNotice(overdue);
  } catch(e) {}
  try {
    const dueToday = await api.getDueToday();
    if (dueToday.length) showDueTodayNotice(dueToday);
  } catch(e) {}
  try {
    const forecasts = await api.getForecasts();
    const ready = forecasts.filter(f => f.is_ready === 1 && !f.archived);
    if (ready.length) showForecastReadyNotice(ready);
  } catch(e) {}
  try {
    const unverified = await api.getTransactions({ reconciled: 0, sort_desc: true });
    if (unverified.length) showUnverifiedNotice(unverified);
  } catch(e) {}
  updateNoticeBtn();
}

// ─── Toggle DB remoto (solo modalità browser/WebServer) ──────────────────────

async function _updateWebDbToggle() {
  const el = document.getElementById('webDbToggle');
  if (!el) return;
  let open = false;
  try { const r = await callJava('dbStatus', {}); open = !!r.open; } catch(e) {}
  el.innerHTML = open
    ? `<div class="web-db-bar web-db-open">
         <span class="web-db-dot"></span>
         <span>Database aperto</span>
         <button class="btn btn-xs btn-ghost" onclick="_webDbClose()" style="margin-left:auto">Chiudi</button>
       </div>`
    : `<div class="web-db-bar web-db-closed">
         <span class="web-db-dot"></span>
         <span>Database chiuso</span>
         <button class="btn btn-xs btn-primary" onclick="_webDbOpen()" style="margin-left:auto">Apri</button>
       </div>`;
}

async function _webDbOpen() {
  await callJava('dbOpen', {});
  await _updateWebDbToggle();
  api._invalidateAccounts();
  api._invalidateCategories();
  api._invalidateTags();
  await updateSidebar();
  await renderPage();
}

async function _webDbClose() {
  await callJava('dbClose', {});
  await _updateWebDbToggle();
}

function _showNotice(className, html, onHeadClick) {
  const delay = _noticeDelay;
  _noticeDelay += 400;
  setTimeout(() => { _noticeDelay = Math.max(0, _noticeDelay - 400); }, delay + 500);
  setTimeout(() => {
    const el = document.createElement('div');
    el.className = 'overdue-notice' + (className ? ' ' + className : '');
    el.innerHTML = html;
    document.getElementById('noticeStack').appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.querySelector('.overdue-notice-progress').style.transition = 'width 8s linear';
      el.querySelector('.overdue-notice-progress').style.width = '0%';
    }));
    setTimeout(() => el.classList.add('fade-out'), 7800);
    setTimeout(() => el.remove(), 8500);
    el.querySelector('.overdue-notice-head').addEventListener('click', e => {
      if (!e.target.closest('button')) onHeadClick();
    });
  }, delay);
}

function updateNoticeBtn() {
  const btn = document.getElementById('noticeBtn');
  if (!btn) return;
  if (_noticeData.length === 0) {
    btn.innerHTML = '✓';
    btn.className = '';
    btn.title = 'Nessuna notifica';
  } else {
    const total = _noticeData.reduce((s, n) => s + n.list.length, 0);
    btn.innerHTML = `🔔<span class="notice-badge">${total}</span>`;
    btn.className = 'has-notices';
    btn.title = `${total} notific${total===1?'a':'he'} — clicca per rivedere`;
  }
}

function replayNotices() {
  if (!_noticeData.length) return;
  _noticeData.forEach(n => {
    if (n.type === 'telefono') showDaTelefonoNotice(n.list, false);
    else if (n.type === 'overdue') showOverdueNotice(n.list, false);
    else if (n.type === 'duetoday') showDueTodayNotice(n.list, false);
    else if (n.type === 'forecast') showForecastReadyNotice(n.list, false);
    else if (n.type === 'unverified') showUnverifiedNotice(n.list, false);
  });
}

function showDaTelefonoNotice(list, save=true) {
  if (save) _noticeData.push({type:'telefono', list});
  _showNotice('notice-telefono', `
    <div class="overdue-notice-head">
      <span>📱 ${list.length} transazion${list.length===1?'e':'i'} da telefono da controllare</span>
      <button onclick="this.closest('.overdue-notice').remove()">✕</button>
    </div>
    <div class="overdue-notice-body">
      ${list.slice(0,4).map(t=>`<div class="overdue-row">
        <span>${fmt.date(t.date)}</span>
        <span class="td-main">${t.description||'-'}</span>
        <span class="amount-${t.type}">${t.type==='expense'?'-':''}${fmt.currency(t.amount)}</span>
      </div>`).join('')}
      ${list.length>4?`<div class="overdue-more">+ altre ${list.length-4}…</div>`:''}
    </div>
    <div class="overdue-notice-bar"><div class="overdue-notice-progress"></div></div>`,
    () => navigate('transactions'));
}

function showForecastReadyNotice(list, save=true) {
  if (save) _noticeData.push({type:'forecast', list});
  _showNotice('', `
    <div class="overdue-notice-head">
      <span>🔮 ${list.length} previsione${list.length===1?' pronta':' pronte'} da analizzare</span>
      <button onclick="this.closest('.overdue-notice').remove()">✕</button>
    </div>
    <div class="overdue-notice-body">
      ${list.slice(0,4).map(f=>`<div class="overdue-row">
        <span>${fmt.date(f.forecast_date)}</span>
        <span class="td-main">Saldo previsto: ${fmt.currency(f.projected_balance)}</span>
      </div>`).join('')}
      ${list.length>4?`<div class="overdue-more">+ altre ${list.length-4}…</div>`:''}
    </div>
    <div class="overdue-notice-bar"><div class="overdue-notice-progress"></div></div>`,
    () => navigate('forecasts'));
}

function showOverdueNotice(list, save=true) {
  if (save) _noticeData.push({type:'overdue', list});
  _showNotice('', `
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
    <div class="overdue-notice-bar"><div class="overdue-notice-progress"></div></div>`,
    () => { schedTab = 'lista'; navigate('scheduled'); });
}

function showDueTodayNotice(list, save=true) {
  if (save) _noticeData.push({type:'duetoday', list});
  _showNotice('notice-duetoday', `
    <div class="overdue-notice-head">
      <span>📅 ${list.length} transazion${list.length===1?'e pianificata':'i pianificate'} da inserire oggi</span>
      <button onclick="this.closest('.overdue-notice').remove()">✕</button>
    </div>
    <div class="overdue-notice-body">
      ${list.slice(0,4).map(u=>`<div class="overdue-row">
        <span class="td-main">${u.description||'-'}</span>
        <span class="amount-${u.type}">${u.type==='expense'?'-':''}${fmt.currency(u.amount)}</span>
      </div>`).join('')}
      ${list.length>4?`<div class="overdue-more">+ altre ${list.length-4}…</div>`:''}
    </div>
    <div class="overdue-notice-bar"><div class="overdue-notice-progress"></div></div>`,
    () => { schedTab = 'lista'; navigate('scheduled'); });
}

function showUnverifiedNotice(list, save=true) {
  if (save) _noticeData.push({type:'unverified', list});
  _showNotice('notice-unverified', `
    <div class="overdue-notice-head">
      <span>🔍 ${list.length} transazion${list.length===1?'e':'i'} da verificare</span>
      <button onclick="this.closest('.overdue-notice').remove()">✕</button>
    </div>
    <div class="overdue-notice-body">
      ${list.slice(0,4).map(t=>`<div class="overdue-row">
        <span>${fmt.date(t.date)}</span>
        <span class="td-main">${t.description||'-'}</span>
        <span class="amount-${t.type}">${t.type==='expense'?'-':''}${fmt.currency(t.amount)}</span>
      </div>`).join('')}
      ${list.length>4?`<div class="overdue-more">+ altre ${list.length-4}…</div>`:''}
    </div>
    <div class="overdue-notice-bar"><div class="overdue-notice-progress"></div></div>`,
    () => { txFilters = { reconciled: 0, range: 'all' }; navigate('transactions'); });
}

/* ─── Chart.js global font (allineato al body Segoe UI) ──────────────────── */
Chart.defaults.font.family = "'Segoe UI', system-ui, sans-serif";
Chart.defaults.font.size   = 13;

function _initGlobalTooltip() {
  if (_initGlobalTooltip._done) return;
  _initGlobalTooltip._done = true;

  const tt = document.createElement('div');
  tt.id = 'dash-tooltip';
  document.body.appendChild(tt);

  let timer = null, cur = null, mx = 0, my = 0;

  const _place = () => {
    let x = mx + 16, y = my + 16;
    if (x + tt.offsetWidth  > window.innerWidth  - 8) x = mx - tt.offsetWidth  - 8;
    if (y + tt.offsetHeight > window.innerHeight - 8) y = my - tt.offsetHeight - 8;
    tt.style.left = x + 'px';
    tt.style.top  = y + 'px';
  };
  const _hide = () => { clearTimeout(timer); cur = null; tt.style.display = 'none'; };

  document.addEventListener('mouseover', e => {
    mx = e.clientX; my = e.clientY;
    const el = e.target.closest('[data-tt-cat]');
    if (el === cur) return;
    cur = el;
    clearTimeout(timer);
    tt.style.display = 'none';
    if (!el) return;
    timer = setTimeout(() => {
      const isOver = el.dataset.ttOver === '1';
      const l2     = el.dataset.ttL2 || 'Reale';
      tt.innerHTML =
        `<div class="tt-name">${el.dataset.ttCat}</div>` +
        `<div class="tt-row"><span class="tt-label">Budget</span><span class="tt-val">${el.dataset.ttBudget}</span></div>` +
        `<div class="tt-row"><span class="tt-label">${l2}</span><span class="tt-val">${el.dataset.ttActual}</span></div>` +
        `<div class="tt-row tt-rem${isOver ? ' over' : ''}"><span class="tt-label">Rimasto</span><span class="tt-val">${el.dataset.ttRem}</span></div>`;
      tt.style.display = 'block';
      _place();
    }, 300);
  });

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    if (tt.style.display === 'block') _place();
  });

  document.addEventListener('mouseout', e => {
    if (!e.relatedTarget || !e.relatedTarget.closest('[data-tt-cat]')) _hide();
  });
}

async function init() {
  _initGlobalTooltip();
  // Inizializza icone Lucide nella sidebar
  if (typeof lucide !== 'undefined') lucide.createIcons();

  // Modalità browser (non JCEF): nascondi titlebar desktop, mostra toggle DB
  const _isBrowser = typeof window.cefQuery !== 'function';
  if (_isBrowser) {
    const tb = document.getElementById('titlebar');
    if (tb) tb.style.display = 'none';
    const tog = document.getElementById('webDbToggle');
    if (tog) tog.style.display = '';
  }
  // Nascondo gli handle se si parte massimizzato
  const {maximized} = await api.isMaximized();
  document.querySelectorAll('.rh').forEach(el => el.style.display = maximized ? 'none' : '');
  // Carica preferenze persistenti (non richiedono DB)
  const s = await api.getSettings();
  await _loadCustomThemes();
  if (s['appearance.theme']) applyTheme(s['appearance.theme']);
  if (s['accounts.favorites_only']) _accFavoritesOnly = s['accounts.favorites_only'] === '1';
  if (s['accounts.type_order']) { try { _accTypeOrder = JSON.parse(s['accounts.type_order']); } catch(e) {} }
  if (s['proj.range'])   _projRange  = s['proj.range'];
  if (s['proj.months'])  _projMonths = parseInt(s['proj.months']) || 6;
  if (s['proj.mode'])    _projMode   = s['proj.mode'];
  if (s['cf.range'])     _cfRange    = s['cf.range'];
  if (s['cf.months'])    _cfMonths   = parseInt(s['cf.months'])   || 6;
  if (s['tx.range'])              txFilters           = { range: s['tx.range'], ...rangeToFilter(s['tx.range']) };
  if (s['portfolio.active_only']) _portfolioActiveOnly = s['portfolio.active_only'] !== '0';
  // Modalità browser: aggiorna il toggle e blocca il caricamento dati se DB chiuso
  if (_isBrowser) {
    await _updateWebDbToggle();
    const { open } = await callJava('dbStatus', {}).catch(() => ({ open: false }));
    if (!open) return;
  }

  await updateSidebar();
  await renderDashboard();
  // Notifica transazioni da telefono
  try {
    const daTelefono = await api.getTransactionsWithTag('phone');
    if (daTelefono.length) showDaTelefonoNotice(daTelefono);
  } catch(e) {}
  // Notifica scadute (non bloccante, dopo il render)
  const overdue = await api.getOverdue();
  if (overdue.length) showOverdueNotice(overdue);
  // Notifica pianificate da inserire oggi
  try {
    const dueToday = await api.getDueToday();
    if (dueToday.length) showDueTodayNotice(dueToday);
  } catch(e) {}
  // Notifica previsioni pronte
  try {
    const forecasts = await api.getForecasts();
    const ready = forecasts.filter(f => f.is_ready === 1 && !f.archived);
    if (ready.length) showForecastReadyNotice(ready);
  } catch(e) {}
  // Notifica transazioni da verificare (reconciled=0)
  try {
    const unverified = await api.getTransactions({ reconciled: 0, sort_desc: true });
    if (unverified.length) showUnverifiedNotice(unverified);
  } catch(e) {}
  updateNoticeBtn();
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
      <div style="display:flex;gap:8px;padding:8px 12px;border-top:1px solid var(--border);align-items:center">
        <span style="font-size:12px;color:var(--txt3);white-space:nowrap">Tipo record:</span>
        ${_buildLogTypeSelect()}
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
  document.getElementById('logSearch').addEventListener('input', () => {
    clearTimeout(_logTimer);
    _logTimer = setTimeout(renderLogLines, 150);
  });
  document.getElementById('logTypeFilter').addEventListener('change', renderLogLines);

  await load();
}

let _logLines = [];

const LOG_ACTION_COLORS = {
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
  'BUDGET ANNO ELIMINATO':  '#f85149',
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

const LOG_ACTION_GROUP = {
  'TRANSAZIONE AGGIUNTA':   'Transazioni',
  'TRANSAZIONE MODIFICATA': 'Transazioni',
  'TRANSAZIONE ELIMINATA':  'Transazioni',
  'PIANIFICATA AGGIUNTA':   'Pianificate',
  'PIANIFICATA MODIFICATA': 'Pianificate',
  'PIANIFICATA ELIMINATA':  'Pianificate',
  'PIANIFICATA AVANZATA':   'Pianificate',
  'PIANIFICATA COMPLETATA': 'Pianificate',
  'CONCILIAZIONE':          'Conti',
  'CONTO AGGIUNTO':         'Conti',
  'CONTO MODIFICATO':       'Conti',
  'CONTO ELIMINATO':        'Conti',
  'CATEGORIA AGGIUNTA':     'Categorie',
  'CATEGORIA MODIFICATA':   'Categorie',
  'CATEGORIA ELIMINATA':    'Categorie',
  'CATEGORIA RIASSEGNATA':  'Categorie',
  'BUDGET IMPOSTATO':       'Budget',
  'BUDGET ELIMINATO':       'Budget',
  'BUDGET BULK':            'Budget',
  'BUDGET MESE ELIMINATO':  'Budget',
  'BUDGET ANNO ELIMINATO':  'Budget',
  'BUDGET GENERATO':        'Budget',
  'BUDGET CONFIG':          'Budget',
  'TAG AGGIUNTO':           'Tag',
  'TAG MODIFICATO':         'Tag',
  'TAG ELIMINATO':          'Tag',
  'TITOLO ACQUISTATO':      'Portfolio',
  'TITOLO VENDUTO':         'Portfolio',
  'TITOLO ELIMINATO':       'Portfolio',
  'PREZZO AGGIORNATO':      'Portfolio',
  'PORTAFOGLIO MODIFICATO': 'Portfolio',
  'POSIZIONE IMPORTATA':    'Portfolio',
  'CEDOLA REGISTRATA':      'Portfolio',
  'BACKUP ESEGUITO':        'Sistema',
  'DB CAMBIATO':            'Sistema',
  'AVVIO':                  'Sistema',
};

function _buildLogTypeSelect() {
  const groups = {};
  for (const [action, group] of Object.entries(LOG_ACTION_GROUP)) {
    if (!groups[group]) groups[group] = [];
    groups[group].push(action);
  }
  return `<select class="form-control" id="logTypeFilter" style="flex:1">
    <option value="">Tutti i tipi</option>
    ${Object.entries(groups).map(([g, actions]) =>
      `<optgroup label="${g}">${actions.map(a => `<option>${a}</option>`).join('')}</optgroup>`
    ).join('')}
  </select>`;
}

function renderLogLines() {
  const wrap = document.getElementById('logWrap');
  if (!wrap) return;
  const q    = (document.getElementById('logSearch')?.value || '').toLowerCase();
  const type = document.getElementById('logTypeFilter')?.value || '';
  const filtered = _logLines.filter(l => {
    if (q && !l.toLowerCase().includes(q)) return false;
    if (type) {
      const rest   = l.substring(22).trimStart();
      const sepIdx = rest.indexOf('  |  ');
      const action = (sepIdx >= 0 ? rest.substring(0, sepIdx) : rest).trim();
      if (action !== type) return false;
    }
    return true;
  });
  if (!filtered.length) {
    wrap.innerHTML = '<div style="color:var(--txt3);padding:40px;text-align:center">Nessun log trovato</div>';
    return;
  }
  wrap.innerHTML = filtered.map(line => {
    // parse: "YYYY-MM-DD  HH:mm:ss  AZIONE                               |  campo:val  |  ..."
    const dateStr  = line.substring(0, 10);
    const timeStr  = line.substring(12, 20);
    const rest     = line.substring(22).trimStart();
    // split on first "  |  " to get action vs fields
    const sepIdx   = rest.indexOf('  |  ');
    const action   = sepIdx >= 0 ? rest.substring(0, sepIdx).trim() : rest.trim();
    const fields   = sepIdx >= 0 ? rest.substring(sepIdx + 5).split('  |  ') : [];
    const color    = LOG_ACTION_COLORS[action] || 'var(--txt2)';
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

/* ─── Previsioni ──────────────────────────────────────────────────────────── */

let _forecastDetailId = null;

function _forecastsHTML(list, openCmd) {
  const tdS = 'padding:8px 12px;border-bottom:1px solid var(--border)';
  const thS = `${tdS};color:var(--txt2);font-weight:500;font-size:12px;text-transform:uppercase;letter-spacing:.4px`;

  const today    = new Date(); today.setHours(0,0,0,0);
  const active   = list.filter(f => !f.archived).sort((a,b) => a.forecast_date.localeCompare(b.forecast_date));
  const archived = list.filter(f =>  f.archived);

  const daysTo = dateStr => {
    const d = new Date(dateStr); d.setHours(0,0,0,0);
    return Math.round((d - today) / 86400000);
  };

  const daysBadge = days => {
    if (days === 0) return `<span style="color:var(--warn);font-weight:700">Oggi</span>`;
    if (days < 0)  return `<span style="color:var(--expense);font-weight:700">${days} gg</span>`;
    return `<span style="color:var(--txt2)">${days} gg</span>`;
  };

  const tableHTML = (rows, isArchived) => {
    if (!rows.length) return '';
    return `<table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead><tr>
        <th style="${thS}">Data previsione</th>
        ${!isArchived ? `<th style="${thS};text-align:center">Scade tra</th>` : ''}
        <th style="${thS};text-align:right">Saldo previsto</th>
        <th style="${thS};text-align:center">Categorie</th>
        <th style="${thS}">Salvata il</th>
        <th style="${thS};text-align:center">Orizzonte</th>
        ${!isArchived ? `<th style="${thS};text-align:center">Stato</th>` : ''}
        <th style="${thS}"></th>
      </tr></thead>
      <tbody>
        ${rows.map(f => {
          const ready = f.is_ready === 1;
          const statusBadge = ready
            ? `<span style="background:rgba(63,185,80,.15);color:#3fb950;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600">Pronta</span>`
            : `<span style="background:rgba(88,166,255,.12);color:#58a6ff;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600">In attesa</span>`;
          const clickable = ready || isArchived;
          return `<tr style="${clickable?'cursor:pointer':''}" ${clickable ? `onclick="_forecastDetailId=${f.id};${openCmd}"` : ''}>
            <td style="${tdS};font-weight:600">${fmt.date(f.forecast_date)}</td>
            ${!isArchived ? `<td style="${tdS};text-align:center">${daysBadge(daysTo(f.forecast_date))}</td>` : ''}
            <td style="${tdS};text-align:right;font-variant-numeric:tabular-nums">${fmt.currency(f.projected_balance)}</td>
            <td style="${tdS};text-align:center">${f.cat_count}</td>
            <td style="${tdS};color:var(--txt2)">${fmt.date(f.created_at.substring(0,10))}</td>
            <td style="${tdS};text-align:center;color:var(--txt2)">${Math.round((new Date(f.forecast_date) - new Date(f.created_at.substring(0,10))) / 86400000)} gg</td>
            ${!isArchived ? `<td style="${tdS};text-align:center">${statusBadge}</td>` : ''}
            <td style="${tdS};text-align:right;white-space:nowrap;display:flex;gap:6px;justify-content:flex-end">
              ${!ready && !isArchived ? `<button class="btn btn-xs btn-ghost" onclick="event.stopPropagation();_showForecastPreview(${f.id})">👁 Preview</button>` : ''}
              ${!isArchived ? `<button class="btn btn-xs btn-ghost" onclick="event.stopPropagation();_archiveForecast(${f.id},()=>{${openCmd}})">Archivia</button>` : ''}
              <button class="btn btn-xs btn-danger" onclick="event.stopPropagation();_deleteForecast(${f.id},()=>{${openCmd}})">Elimina</button>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
  };

  return `
    <div class="card" style="overflow:hidden;margin-bottom:${archived.length?'16px':'0'}">
      ${!active.length
        ? `<div style="padding:32px;text-align:center;color:var(--txt3)">
             Nessuna previsione attiva.<br>
             <span style="font-size:13px">Vai in <strong>Pianificate → Proiezione Saldo</strong> e clicca "Salva previsione".</span>
           </div>`
        : tableHTML(active, false)}
    </div>
    ${archived.length ? `
    <div class="card" style="overflow:hidden">
      <div style="padding:10px 16px;font-size:12px;font-weight:600;color:var(--txt3);border-bottom:1px solid var(--border);text-transform:uppercase;letter-spacing:.5px">
        📦 Archiviate (${archived.length})
      </div>
      ${tableHTML(archived, true)}
    </div>` : ''}`;
}

async function renderForecasts() {
  const pg = document.getElementById('pg-forecasts');
  let list; try { list = await api.getForecasts(); } catch(e) { pg.innerHTML=`<p class="text-muted">${e.message}</p>`; return; }
  if (_forecastDetailId != null) { await renderForecastDetail(pg, _forecastDetailId, 'renderForecasts()'); return; }
  pg.innerHTML = _forecastsHTML(list, 'renderForecasts()');
}

async function renderForecastsInTab() {
  const pg = document.getElementById('schedContent');
  let list; try { list = await api.getForecasts(); } catch(e) { pg.innerHTML=`<p class="text-muted">${e.message}</p>`; return; }
  if (_forecastDetailId != null) { await renderForecastDetail(pg, _forecastDetailId, 'renderForecastsInTab()'); return; }
  pg.innerHTML = _forecastsHTML(list, 'renderForecastsInTab()');
}

async function renderForecastDetail(pg, id, backCmd = 'renderForecasts()') {
  let d; try { d = await api.getForecastDetail({id}); } catch(e) { toast(e.message,'error'); return; }
  const cats = d.categories || [];
  const balDiff = d.actual_balance - d.projected_balance;
  const tdS = 'padding:7px 12px;border-bottom:1px solid var(--border);font-size:13px';
  const thS = `${tdS};color:var(--txt2);font-weight:500;font-size:12px`;
  const diffColor = v => v > 0 ? 'var(--income)' : v < 0 ? 'var(--expense)' : 'var(--txt2)';
  const diffStr  = v => (v > 0 ? '+' : '') + fmt.currency(v);

  pg.innerHTML = `
    <div class="page-header" style="display:flex;align-items:center;gap:12px">
      <button class="btn btn-ghost btn-sm" onclick="_forecastDetailId=null;${backCmd}">← Lista</button>
      <h2 class="page-title">Previsione al ${fmt.date(d.forecast_date)}</h2>
    </div>

    <!-- Saldo -->
    <div class="card" style="margin-bottom:16px;padding:16px 20px">
      <div style="font-size:12px;color:var(--txt2);margin-bottom:8px;text-transform:uppercase;letter-spacing:.4px">Saldo totale</div>
      <div style="display:flex;gap:40px;flex-wrap:wrap">
        <div><div style="font-size:11px;color:var(--txt3)">Previsto</div><div style="font-size:20px;font-weight:700;color:var(--accent)">${fmt.currency(d.projected_balance)}</div></div>
        <div><div style="font-size:11px;color:var(--txt3)">Reale</div><div style="font-size:20px;font-weight:700">${fmt.currency(d.actual_balance)}</div></div>
        <div><div style="font-size:11px;color:var(--txt3)">Differenza</div><div style="font-size:20px;font-weight:700;color:${diffColor(balDiff)}">${diffStr(balDiff)}</div></div>
      </div>
    </div>

    <!-- Categorie -->
    <div class="card" style="overflow:hidden">
      <div style="padding:12px 16px;font-weight:600;border-bottom:1px solid var(--border)">Dettaglio categorie</div>
      ${!cats.length ? `<div style="padding:20px;color:var(--txt3)">Nessuna categoria salvata.</div>` :
      `<table style="width:100%;border-collapse:collapse">
        <thead><tr>
          <th style="${thS};text-align:left">Categoria</th>
          <th style="${thS};text-align:center">Tipo</th>
          <th style="${thS};text-align:right">Previsto</th>
          <th style="${thS};text-align:right">Reale</th>
          <th style="${thS};text-align:right">Differenza</th>
        </tr></thead>
        <tbody>
          ${cats.map(c => {
            const diff = c.diff;
            const rowBg = diff > 0 ? 'rgba(63,185,80,.04)' : diff < 0 ? 'rgba(248,81,73,.04)' : '';
            return `<tr style="background:${rowBg}">
              <td style="${tdS}">${c.category_name}</td>
              <td style="${tdS};text-align:center">
                <span style="font-size:11px;padding:1px 7px;border-radius:8px;background:${c.category_type==='income'?'rgba(63,185,80,.15)':'rgba(248,81,73,.15)'};color:${c.category_type==='income'?'var(--income)':'var(--expense)'}">
                  ${c.category_type==='income'?'Entrata':'Uscita'}
                </span>
              </td>
              <td style="${tdS};text-align:right;font-variant-numeric:tabular-nums">${fmt.currency(c.projected_amount)}</td>
              <td style="${tdS};text-align:right;font-variant-numeric:tabular-nums">${fmt.currency(c.actual_amount)}</td>
              <td style="${tdS};text-align:right;font-variant-numeric:tabular-nums;font-weight:600;color:${diffColor(diff)}">${diffStr(diff)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`}
    </div>`;
}

async function _deleteForecast(id, refresh) {
  openModal('Elimina previsione', '<p>Eliminare questa previsione? L\'operazione non è reversibile.</p>', async () => {
    try { await api.deleteForecast({id}); toast('Previsione eliminata'); if (refresh) refresh(); else renderForecasts(); }
    catch(e) { toast(e.message,'error'); }
  }, 'Elimina', 'btn-danger');
}

async function _archiveForecast(id, refresh) {
  try {
    await api.archiveForecast({id});
    const entry = _noticeData.find(n => n.type === 'forecast');
    if (entry) {
      entry.list = entry.list.filter(f => f.id !== id);
      if (entry.list.length === 0) _noticeData.splice(_noticeData.indexOf(entry), 1);
      updateNoticeBtn();
    }
    if (refresh) refresh(); else renderForecasts();
  } catch(e) { toast(e.message, 'error'); }
}

async function _showForecastPreview(id) {
  let d; try { d = await api.getForecastDetail({id}); } catch(e) { toast(e.message,'error'); return; }
  const cats = d.categories || [];
  const balDiff = d.actual_balance - d.projected_balance;
  const tdS = 'padding:7px 12px;border-bottom:1px solid var(--border);font-size:13px';
  const thS = `${tdS};color:var(--txt2);font-weight:500;font-size:12px`;
  const diffColor = v => v > 0 ? 'var(--income)' : v < 0 ? 'var(--expense)' : 'var(--txt2)';
  const diffStr  = v => (v > 0 ? '+' : '') + fmt.currency(v);

  const body = `
    <div style="margin-bottom:16px;padding:14px 16px;background:var(--bg3);border-radius:var(--radius)">
      <div style="font-size:11px;color:var(--txt3);margin-bottom:8px;text-transform:uppercase;letter-spacing:.4px">Saldo totale</div>
      <div style="display:flex;gap:32px;flex-wrap:wrap">
        <div><div style="font-size:11px;color:var(--txt3)">Previsto</div><div style="font-size:18px;font-weight:700;color:var(--accent)">${fmt.currency(d.projected_balance)}</div></div>
        <div><div style="font-size:11px;color:var(--txt3)">Reale ad oggi</div><div style="font-size:18px;font-weight:700">${fmt.currency(d.actual_balance)}</div></div>
        <div><div style="font-size:11px;color:var(--txt3)">Differenza</div><div style="font-size:18px;font-weight:700;color:${diffColor(balDiff)}">${diffStr(balDiff)}</div></div>
      </div>
    </div>
    ${!cats.length ? `<p style="color:var(--txt3);text-align:center">Nessuna categoria salvata.</p>` :
    `<div style="overflow-x:auto">
    <table style="width:100%;border-collapse:collapse">
      <thead><tr>
        <th style="${thS};text-align:left">Categoria</th>
        <th style="${thS};text-align:center">Tipo</th>
        <th style="${thS};text-align:right">Previsto</th>
        <th style="${thS};text-align:right">Reale ad oggi</th>
        <th style="${thS};text-align:right">Differenza</th>
      </tr></thead>
      <tbody>
        ${cats.map(c => {
          const diff = c.diff;
          const rowBg = diff > 0 ? 'rgba(63,185,80,.04)' : diff < 0 ? 'rgba(248,81,73,.04)' : '';
          return `<tr style="background:${rowBg}">
            <td style="${tdS}">${c.category_name}</td>
            <td style="${tdS};text-align:center">
              <span style="font-size:11px;padding:1px 7px;border-radius:8px;background:${c.category_type==='income'?'rgba(63,185,80,.15)':'rgba(248,81,73,.15)'};color:${c.category_type==='income'?'var(--income)':'var(--expense)'}">
                ${c.category_type==='income'?'Entrata':'Uscita'}
              </span>
            </td>
            <td style="${tdS};text-align:right;font-variant-numeric:tabular-nums">${fmt.currency(c.projected_amount)}</td>
            <td style="${tdS};text-align:right;font-variant-numeric:tabular-nums">${fmt.currency(c.actual_amount)}</td>
            <td style="${tdS};text-align:right;font-variant-numeric:tabular-nums;font-weight:600;color:${diffColor(diff)}">${diffStr(diff)}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>`}`;

  openModal(`Preview — previsione al ${fmt.date(d.forecast_date)}`, body, null, null, null, '');
  document.getElementById('modal').style.width = '720px';
}

// Aspetta che il bridge JCEF sia pronto (in browser mode parte subito)
if (typeof window.cefQuery === 'function') {
  init();
} else if (typeof fetch === 'function') {
  // Modalità browser: bridge HTTP disponibile subito
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
