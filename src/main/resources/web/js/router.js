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

// Cambia pagina visibile (SPA): aggiorna classi .active, titolo e renderizza la pagina.
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

// txFilters e _budgetTab sono dichiarati in app.js: risolti lazy al click.
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
let _dashboardDirty = false;
// Riallinea sidebar, lista transazioni e (se visibile) dashboard dopo una modifica alle transazioni.
async function refreshAfterTxChange() {
  updateSidebar();
  renderTransactions();
  if (currentPage === 'dashboard') renderDashboard();
}
