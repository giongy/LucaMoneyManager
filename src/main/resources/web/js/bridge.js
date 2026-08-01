/* ═══════════════════════════════════════════════════════════════════════════
   LucaMoneyManager — bridge.js
   Ponte JS→Java via cefQuery (estratto da app.js, stadio 1 del refactor)
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

// ─── Performance tracking ─────────────────────────────────────────────────────
let _perfEnabled = false;
const _perfBuf = [];          // { method, roundMs, ts }
const _PERF_MAX = 150;

function _perfRecord(method, roundMs) {
  if (_perfBuf.length >= _PERF_MAX) _perfBuf.shift();
  _perfBuf.push({ method, roundMs, ts: Date.now() });
}

// Invoca un metodo Java: serializza {method,params}→JSON→base64, lo passa a cefQuery
// (o all'HTTP bridge in modalità browser) e ritorna una Promise col risultato decodificato.
function callJava(method, params = {}) {
  const payload = _toB64(JSON.stringify({ method, params }));
  const t0 = _perfEnabled ? performance.now() : 0;

  const finish = result => {
    if (_perfEnabled) _perfRecord(method, Math.round(performance.now() - t0));
    return result;
  };

  const _checkError = result => {
    if (result && typeof result === 'object' && result.error)
      throw new Error(result.error);
    return result;
  };

  if (typeof window.cefQuery === 'function') {
    return new Promise((resolve, reject) => {
      window.cefQuery({
        request: payload,
        onSuccess: r => { try { resolve(finish(_checkError(JSON.parse(_fromB64(r))))); } catch(e) { reject(e); } },
        onFailure: (_code, msg) => {
          finish(null);
          // Un fallimento qui significa che Bridge ha appena loggato un errore in app.log:
          // aggiorna subito il badge errori (salvo il metodo del badge stesso, per non ciclare).
          if (method !== 'getAppLogErrors' && typeof window.refreshLogErrors === 'function')
            window.refreshLogErrors();
          reject(new Error(msg));
        }
      });
    });
  }
  // Modalità browser: usa HTTP bridge
  return fetch('/bridge', { method: 'POST', body: payload })
    .then(r => r.text())
    .then(b64 => finish(_checkError(JSON.parse(_fromB64(b64)))));
}

// Facciata tipata delle operazioni Bridge: ogni metodo corrisponde a un "case" in
// Bridge.dispatch (Java). Conti/categorie/tag usano una cache di sessione invalidata a ogni modifica.
const api = {
  // Finestra
  minimize:    ()          => callJava('minimize'),
  maximize:    ()          => callJava('maximize'),
  close:       ()          => callJava('close'),
  uiReady:     ()          => callJava('uiReady'),
  getDbPath:      ()          => callJava('getDbPath'),
  getWindowPos:   ()          => callJava('getWindowPos'),
  setWindowPos:   (x,y)       => callJava('setWindowPos', {x,y}),
  getWindowBounds:()          => callJava('getWindowBounds'),
  setWindowBounds:(x,y,w,h)   => callJava('setWindowBounds', {x,y,w,h}),
  isMaximized:    ()          => callJava('isMaximized'),
  dbStatus:       ()          => callJava('dbStatus'),

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
  // Conteggi di cosa si perderebbe eliminando il conto (non tocca la cache: è di sola lettura).
  getAccountUsage:    async id    => callJava('getAccountUsage', {id}),
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
  importPending:          ()   => { api._invalidateAccounts(); return callJava('importPending'); },
  readPendingQueue:       ()   => callJava('readPendingQueue'),
  syncCardSettlements:    ()   => callJava('syncCardSettlements'),

  // Note
  getNotes:       ()           => callJava('getNotes'),
  getNote:        id           => callJava('getNote',       {id}),
  saveNote:       data         => callJava('saveNote',      data),
  deleteNote:     id           => callJava('deleteNote',    {id}),
  setNotePinned:  (id, pinned) => callJava('setNotePinned', {id, pinned}),

  // Range Preset
  getRangePresets:    ()     => callJava('getRangePresets'),
  addRangePreset:     data   => callJava('addRangePreset',    data),
  updateRangePreset:  data   => callJava('updateRangePreset', data),
  deleteRangePreset:  data   => callJava('deleteRangePreset', data),

  // Transazioni
  getTransactions:             f    => callJava('getTransactions',             f || {}),
  getTransactionSplits:        id   => callJava('getTransactionSplits',        {id}),
  getTopDescriptions:          opts => callJava('getTopDescriptions', opts || {}),
  addTransaction:              async data  => { api._invalidateAccounts(); return callJava('addTransaction',    data); },
  // Inserisce la transazione E avanza la pianificata in un'unica transazione SQL lato Java:
  // o valgono entrambe o nessuna (niente doppia registrazione se la seconda parte fallisce).
  addTransactionForScheduled:  async (data, scheduledId, scheduledDate) => {
    api._invalidateAccounts();
    return callJava('addTransactionForScheduled', {...data, scheduled_id: scheduledId, scheduled_date: scheduledDate});
  },
  updateTransaction:           async data  => { api._invalidateAccounts(); return callJava('updateTransaction', data); },
  deleteTransaction:           async id    => { api._invalidateAccounts(); return callJava('deleteTransaction', {id}); },
  updateTransactionReconciled: (id, reconciled) => callJava('updateTransactionReconciled', {id, reconciled}),
  getAccountSummary:           account_id => callJava('getAccountSummary',    {account_id}),

  // Svecchiamento (raggruppamento transazioni vecchie)
  archivePreview:      (from, to, categoryIds) => callJava('archivePreview', {from, to, categoryIds}),
  archiveTransactions: async ids => { api._invalidateAccounts(); return callJava('archiveTransactions', {ids}); },

  // Budget
  setBudget:   data         => callJava('setBudget',  data),
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
  buyStock:                 async (data)  => { api._invalidateAccounts(); return callJava('buyStock', data); },
  sellStock:                async (data)  => { api._invalidateAccounts(); return callJava('sellStock', data); },
  updateStockPrice:         async (id, p) => { api._invalidateAccounts(); return callJava('updateStockPrice', {id, price: p}); },
  fetchOnlinePrice:         (isin)  => callJava('fetchOnlinePrice', {isin}),
  registerCoupon:           async (data)  => { api._invalidateAccounts(); return callJava('registerCoupon', data); },
  registerDividend:         async (data)  => { api._invalidateAccounts(); return callJava('registerDividend', data); },
  registerPortfolioExpense: async (data)  => { api._invalidateAccounts(); return callJava('registerPortfolioExpense', data); },
  updatePortfolioItem:      async (data)  => { api._invalidateAccounts(); return callJava('updatePortfolioItem', data); },
  deletePortfolioItem:      async (id)    => { api._invalidateAccounts(); return callJava('deletePortfolioItem', {id}); },
  deletePortfolioTransaction: async (id)  => { api._invalidateAccounts(); return callJava('deletePortfolioTransaction', {id}); },

  // Stats
  getDashboardStats:   y          => callJava('getDashboardStats',   {year:y}),
  getStatsByDateRange: (df,dt)    => callJava('getStatsByDateRange',  {date_from:df, date_to:dt}),
  getMonthlyChartData: y          => callJava('getMonthlyChartData',  {year:y}),
  getCategoryChartData:(y,type)   => callJava('getCategoryChartData', {year:y,type}),

  // Impostazioni
  getSettings:   ()           => callJava('getSettings'),
  setSetting:    (key, value) => callJava('setSetting', {key, value}),
  chooseDbFile:      (mode)   => callJava('chooseDbFile', {mode}),
  reloadDb: async path => { api._invalidateAccounts(); api._invalidateCategories(); api._invalidateTags(); return callJava('reloadDb', {path}); },
  seedExampleData: async () => { api._invalidateAccounts(); api._invalidateCategories(); api._invalidateTags(); return callJava('seedExampleData'); },
  chooseBackupDir:       ()             => callJava('chooseBackupDir', {}),
  chooseAttachmentsDir:  ()             => callJava('chooseAttachmentsDir', {}),
  chooseAttachmentFile:  ()             => callJava('chooseAttachmentFile', {}),
  attachFile:            (tx_id, source_path, old_path) => callJava('attachFile', {tx_id, source_path, old_path: old_path||null}),
  openAttachment:        (path)         => callJava('openAttachment', {path}),
  removeAttachment:      (tx_id, path)  => callJava('removeAttachment', {tx_id, path: path||null}),
  setAttachmentPath:     (tx_id, path)  => callJava('setAttachmentPath', {tx_id, path}),
  openSettingsFile:      ()             => callJava('openSettingsFile', {}),
  openAppLog:            ()             => callJava('openAppLog', {}),
  getAppLogErrors:       ()             => callJava('getAppLogErrors', {}),
  openUrl:           (url)   => callJava('openUrl', {url}),
  exportHtmlReport:  (html, filename) => callJava('exportHtmlReport', {html, filename}),
  doBackup:        ()         => callJava('doBackup', {}),
  listBackups:     ()         => callJava('listBackups', {}),
  restoreBackup:   (path)     => callJava('restoreBackup', {path}),

  // Pianificate
  getScheduled:    ()    => callJava('getScheduled'),
  addScheduled:    data  => callJava('addScheduled', data),
  updateScheduled: data  => callJava('updateScheduled', data),
  deleteScheduled: id    => callJava('deleteScheduled', {id}),
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
  getCategoryComparison: (fromA, toA, fromB, toB, groupBy) =>
    callJava('getCategoryComparison', { from_a: fromA, to_a: toA, from_b: fromB, to_b: toB, group_by: groupBy }),
  getOldestTransactionMonth: ()       => callJava('getOldestTransactionMonth',  {}),
  getAccountBalanceHistory: (months) => callJava('getAccountBalanceHistory', { months }),
  getForecastExpenseSplit:(months)    => callJava('getForecastExpenseSplit', {months}),
  getForecastEngine:(histMonths, horizonMonths, includePortfolio) =>
    callJava('getForecastEngine', { hist_months: histMonths, horizon_months: horizonMonths, include_portfolio: includePortfolio }),

  // Resoconti
  getExpenseNatureReport: p => callJava('getExpenseNatureReport', p || {}),
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
