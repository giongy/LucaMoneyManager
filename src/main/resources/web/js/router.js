/* ═══════════════════════════════════════════════════════════════════════════
   LucaMoneyManager — router.js
   SPA router + navigation + refresh orchestration
   (estratto da app.js, stadio 4 del refactor)
═══════════════════════════════════════════════════════════════════════════ */

/* ─── Router ──────────────────────────────────────────────────────────────── */
const PAGE_TITLES = {
  dashboard:'Dashboard', transactions:'Transazioni', accounts:'Conti',
  budgets:'Budget', portfolio:'Portafoglio', analytics:'Reports', reports:'Filtri', forecasts:'Previsioni', settings:'Impostazioni',
  scheduled:'Transazioni Pianificate', ranges:'Periodi personalizzati', notes:'Note'
};
let currentPage = 'dashboard';
let charts = {};

// Chiude i menu contestuali ancora aperti. Va chiamata quando si cambia pagina:
// quei menu sono overlay in position:fixed appesi a <body>, quindi nascondere la
// pagina che li ha aperti NON li rimuove. Restavano a schermo con i loro listener
// di chiusura registrati su document ({once:true}): il primo tasto destro sulla
// pagina nuova veniva consumato per chiudere il menu vecchio invece di aprire
// quello giusto — da utente, "a volte devo cliccare due volte".
// Le funzioni vivono nei rispettivi moduli di pagina: si chiamano solo se definite.
function closeAllContextMenus() {
  if (typeof closeSchedContextMenu     === 'function') closeSchedContextMenu();
  if (typeof closePortfolioContextMenu === 'function') closePortfolioContextMenu();
  if (typeof _hideCtxMenu              === 'function') _hideCtxMenu();
}

// Cambia pagina visibile (SPA): aggiorna classi .active, titolo e renderizza la pagina.
function navigate(page) {
  if (currentPage === page) return;
  // Guardia: pagina inesistente → non toccare la UI (eviterebbe di lasciarla vuota).
  if (!page || !document.getElementById(`pg-${page}`)) return;
  closeAllContextMenus();
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`pg-${page}`).classList.add('active');
  document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
  document.getElementById('pageTitle').textContent = PAGE_TITLES[page];
  document.getElementById('pageTitleSub').textContent = '';
  currentPage = page;
  renderPage(page);
}

// txFilters e _budgetTab sono dichiarati in app.js: risolti lazy al click.
// Solo le voci con data-page navigano: quelle con azioni proprie (es. Calcolatrice,
// che usa onclick=openCalculator) non hanno data-page e vanno ignorate qui, altrimenti
// navigate(undefined) svuoterebbe la pagina corrente senza attivarne una nuova.
document.querySelectorAll('.nav-item[data-page]').forEach(el => {
  el.addEventListener('click', () => {
    // Voce sidebar "Transazioni" (nessun conto) → vista global col suo range preferito.
    if (el.dataset.page === 'transactions') { const r = preferredRange(); txFilters = { range: r, ...rangeToFilter(r) }; }
    if (el.dataset.page === 'budgets') _budgetTab = 'grid';
    navigate(el.dataset.page);
  });
});

function navigateToBudgetMese() {
  _budgetTab = 'mese';
  if (currentPage === 'budgets') _setBudgetTab('mese');
  else navigate('budgets');
}

// Dispatcher di rendering: chiama la render<Pagina> giusta, con cattura errori → toast.
function renderPage(page) {
  const _run = fn => { try { const r = fn(); if (r && typeof r.catch === 'function') r.catch(e => toast('Errore: ' + e.message, 'error')); } catch(e) { toast('Errore: ' + e.message, 'error'); } };
  switch(page) {
    case 'dashboard':    _run(renderDashboard);    break;
    case 'transactions': _run(renderTransactions); break;
    case 'accounts':     _run(renderAccounts);     break;
    case 'budgets':      _run(renderBudgets);      break;
    case 'portfolio':    _run(renderPortfolio);    break;
    case 'analytics':    _run(renderAnalytics);    break;
    case 'reports':      _run(renderReports);      break;
    case 'categories':   _run(renderCategories);   break;
    case 'tags':         _run(renderTags);         break;
    case 'ranges':       _run(renderRangePresets); break;
    case 'settings':     _run(renderSettings);     break;
    case 'scheduled':    _run(renderScheduled);    break;
    case 'forecasts':    _run(renderForecasts);    break;
    case 'logviewer':    _run(renderLogViewer);    break;
    case 'notes':        _run(renderNotes);        break;
  }
}

/* ─── Refresh after any transaction change ───────────────────────────────── */
// Riallinea sidebar, lista transazioni e (se visibile) dashboard dopo una modifica alle transazioni.
// Ricalcola anche le notifiche: aggiungere/modificare/eliminare una transazione può cambiare
// il numero di "da verificare" o togliere il tag "phone", e il badge 🔔 deve seguirlo.
async function refreshAfterTxChange() {
  updateSidebar();
  renderTransactions();
  if (currentPage === 'dashboard') renderDashboard();
  refreshNotices();
}
