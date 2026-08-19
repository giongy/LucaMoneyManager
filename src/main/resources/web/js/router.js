/* ═══════════════════════════════════════════════════════════════════════════
   LucaMoneyManager — router.js
   SPA router + navigation + refresh orchestration
   (estratto da app.js, stadio 4 del refactor)
═══════════════════════════════════════════════════════════════════════════ */

/* ─── Router ──────────────────────────────────────────────────────────────── */
const PAGE_TITLES = {
  dashboard:'Dashboard', transactions:'Transazioni', accounts:'Conti',
  budgets:'Budget', portfolio:'Portafoglio', analytics:'Reports', reports:'Filtri', forecasts:'Previsioni', settings:'Impostazioni',
  scheduled:'Transazioni Pianificate', ranges:'Periodi personalizzati', notes:'Note',
  categories:'Categorie', tags:'Tag', logviewer:'Log'
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

/* ─── Cronologia di navigazione (indietro / avanti) ──────────────────────────
   Stack lineare in stile browser: navigate() appende, le frecce in sidebar lo
   scorrono. Ogni voce porta con sé lo *stato* della pagina (filtri, tab), non
   solo il nome: tornare su Transazioni senza i filtri con cui la si era lasciata
   mostrerebbe un elenco diverso da quello da cui si è usciti — sarebbe una nuova
   navigazione, non un ritorno.
   Vive solo in memoria: a ogni avvio si riparte dalla pagina iniziale.         */
const HIST_MAX = 50;                                     // tetto alla crescita: oltre, cadono le voci più vecchie
const _histStack = [{ page: currentPage, state: null }]; // la pagina di partenza è già una voce
let _histIdx = 0;                                        // indice della voce corrente
let _histLocked = false;                                 // true mentre indietro/avanti pilotano navigate(): non deve appendere

// Lo stato che distingue due visite alla stessa pagina, letto/scritto per pagina.
// Le variabili vivono nei moduli di pagina, caricati DOPO router.js: si toccano
// solo a runtime, e sempre dentro try/catch — un modulo non caricato darebbe
// ReferenceError, e un dettaglio di stato non deve poter rompere la navigazione.
const _HIST_STATE = {
  transactions: { get: () => ({ f: txFilters }),        set: s => { txFilters       = s.f; } },
  budgets:      { get: () => ({ t: _budgetTab }),       set: s => { _budgetTab      = s.t; } },
  analytics:    { get: () => ({ t: _analyticsTab }),    set: s => { _analyticsTab   = s.t; } },
  scheduled:    { get: () => ({ t: schedTab }),         set: s => { schedTab        = s.t; } },
  reports:      { get: () => ({ r: _currentReportId }), set: s => { _currentReportId = s.r; } },
};

// Copia difensiva: la voce di cronologia non deve cambiare sotto i piedi se la
// pagina poi rimpiazza (o muta) i propri filtri.
const _histClone = o => { try { return structuredClone(o); } catch(e) { return o; } };

// Fotografa lo stato di una pagina. Sui push cattura la *destinazione*: i filtri
// li ha già impostati il chiamante prima di invocare navigate().
function _histCapture(page) {
  const h = _HIST_STATE[page];
  if (!h) return null;
  try { return _histClone(h.get()); } catch(e) { return null; }
}

// Riapplica lo stato di una voce. Va chiamata PRIMA del render della pagina.
function _histApply(entry) {
  const h = _HIST_STATE[entry.page];
  if (!h || !entry.state) return;
  try { h.set(_histClone(entry.state)); } catch(e) { console.warn('cronologia: stato non ripristinabile', e); }
}

// Aggiorna la voce corrente con lo stato vivo della pagina che stiamo lasciando:
// dopo l'arrivo l'utente può aver cambiato filtri o tab dentro la pagina, ed è
// quella vista — non quella di quando ci è entrato — che "indietro" deve ridare.
function _histSyncCurrent() {
  const cur = _histStack[_histIdx];
  if (!cur || cur.page !== currentPage) return;
  // Solo se la fotografia è riuscita: se _histCapture fallisce meglio tenere lo
  // stato precedente della voce che azzerarlo.
  const snap = _histCapture(currentPage);
  if (snap) cur.state = snap;
}

// Appende una voce troncando il ramo "avanti", come in un browser.
function _histPush(page) {
  _histSyncCurrent();
  _histStack.length = _histIdx + 1;
  _histStack.push({ page, state: _histCapture(page) });
  if (_histStack.length > HIST_MAX) _histStack.shift();
  _histIdx = _histStack.length - 1;
}

// Scorre la cronologia di delta posizioni (-1 = indietro, +1 = avanti).
function histGo(delta) {
  const entry = _histStack[_histIdx + delta];
  if (!entry) return;
  _histSyncCurrent();
  _histIdx += delta;
  _histApply(entry);
  if (entry.page === currentPage) {
    // Stessa pagina, stato diverso (es. due viste di Transazioni): basta ridisegnare,
    // navigate() qui uscirebbe subito per via della guardia currentPage === page.
    renderPage(entry.page);
  } else {
    _histLocked = true;
    try { navigate(entry.page); } finally { _histLocked = false; }
  }
  _histRender();
}
function histBack()    { histGo(-1); }
function histForward() { histGo(+1); }

// Accende/spegne le due frecce e scrive nel tooltip dove portano.
function _histRender() {
  const back = document.getElementById('histBack');
  const fwd  = document.getElementById('histFwd');
  if (!back || !fwd) return;
  const prev = _histStack[_histIdx - 1];
  const next = _histStack[_histIdx + 1];
  const label = e => PAGE_TITLES[e.page] || e.page;
  back.disabled = !prev;
  fwd.disabled  = !next;
  back.title = prev ? 'Indietro: ' + label(prev) : 'Nessuna pagina precedente';
  fwd.title  = next ? 'Avanti: '   + label(next) : 'Nessuna pagina successiva';
}

// Le scorciatoie non devono agire con un pannello aperto sopra la pagina (modale,
// guida scorciatoie, calcolatrice, editor dei temi): lì l'utente sta completando
// un'operazione, e cambiare pagina sotto lo lascerebbe appeso sulla pagina sbagliata.
function _histBlocked() {
  return !!document.querySelector('#modalOverlay.open, #shortcutsOverlay.open, #calcOverlay.open, #tePanel.open');
}

// Il focus è in un punto dove le frecce servono a scrivere/scegliere, non a navigare.
function _histTypingFocus() {
  const el = document.activeElement;
  if (!el) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable;
}

// ← / → da sole, più Alt+← / Alt+→ come nel browser.
// La differenza è dove valgono: Alt non serve a scrivere, quindi la coppia con Alt
// funziona anche con il focus in un campo (la barra filtri di Transazioni è tutta
// input e select); le frecce nude lì muoverebbero il cursore o cambierebbero la
// voce di una select, quindi si fermano.
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.shiftKey || e.metaKey) return;
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  if (_histBlocked()) return;
  if (!e.altKey && _histTypingFocus()) return;
  e.preventDefault();
  if (e.key === 'ArrowLeft') histBack(); else histForward();
});

// Tasti laterali del mouse (3 = indietro, 4 = avanti). Il mousedown va fermato a
// monte: alcune tabelle reagiscono a un mousedown qualsiasi per la selezione riga.
document.addEventListener('mousedown', e => { if (e.button === 3 || e.button === 4) e.preventDefault(); });
document.addEventListener('mouseup', e => {
  if (e.button !== 3 && e.button !== 4) return;
  e.preventDefault();
  if (_histBlocked()) return;
  if (e.button === 3) histBack(); else histForward();
});

// Cambia pagina visibile (SPA): aggiorna classi .active, titolo e renderizza la pagina.
function navigate(page) {
  if (currentPage === page) return;
  // Guardia: pagina inesistente → non toccare la UI (eviterebbe di lasciarla vuota).
  if (!page || !document.getElementById(`pg-${page}`)) return;
  // Cronologia: la voce va aggiunta prima di cambiare pagina, finché currentPage
  // indica ancora quella che stiamo lasciando (è da lì che si fotografa il suo stato).
  // Durante indietro/avanti non si appende: si sta scorrendo lo stack esistente.
  if (!_histLocked) { _histPush(page); _histRender(); }
  closeAllContextMenus();
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`pg-${page}`).classList.add('active');
  document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
  document.getElementById('pageTitle').textContent = PAGE_TITLES[page];
  document.getElementById('pageTitleSub').textContent = '';
  currentPage = page;
  // Il comando "Personalizza" della dashboard sta in titlebar, che è condivisa da tutte
  // le pagine: va nascosto uscendo, altrimenti resterebbe visibile altrove.
  if (page !== 'dashboard') _syncDashEditBar?.();
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
