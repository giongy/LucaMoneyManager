/* ═══════════════════════════════════════════════════════════════════════════
   LucaMoneyManager — sidebar.js
   Sidebar conti + sezione "Filtri" (resoconti salvati)
   (estratto da app.js, stadio 4 del refactor)
═══════════════════════════════════════════════════════════════════════════ */

/* ─── Sidebar accounts ───────────────────────────────────────────────────── */
// Dipende da _accTypeOrder, _reportsGroupOpen, _currentReportId,
// _loadReportConfig, _updateReportHeader (tutti definiti in app.js, lazy).
// Ridisegna i conti nella sidebar (visibili, raggruppati per tipo e ordinati).
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

/* ─── Sidebar: data del giorno ───────────────────────────────────────────── */
function renderSidebarDate() {
  const el = document.getElementById('sidebarDate');
  if (!el) return;
  const now = new Date();
  const weekday = now.toLocaleDateString('it-IT', { weekday: 'long' });
  const month   = now.toLocaleDateString('it-IT', { month: 'long' });
  el.innerHTML = `
    <div class="sd-top"><span class="sd-weekday">${weekday}</span><span class="sd-day">${now.getDate()}</span></div>
    <div class="sd-month">${month} ${now.getFullYear()}</div>
    <div class="sd-rule"></div>`;
}

// Aggiorna la data se l'app resta aperta oltre la mezzanotte (controllo ogni minuto).
if (!window._sidebarDateTimer) {
  window._sidebarDateTimer = setInterval(renderSidebarDate, 60000);
}

// Il menù "Filtri" si apre come popover flottante accanto alla voce: si sceglie
// un filtro e si richiude da solo (click fuori o Esc), senza riempire la sidebar.
function toggleReportsGroup(e) {
  if (e) e.stopPropagation();
  if (_reportsGroupOpen) { _closeReportsFlyout(); return; }
  _reportsGroupOpen = true;
  const sub    = document.getElementById('navReportsSub');
  const arrow  = document.getElementById('navReportsArrow');
  const anchor = document.getElementById('navReports');
  if (!sub) return;
  renderSidebarReports();
  // Sposta su <body>: evita che il backdrop-filter della sidebar (tema glassy)
  // diventi il contenitore di position:fixed e sfalsi le coordinate.
  document.body.appendChild(sub);
  sub.classList.add('nav-sub-flyout');
  sub.style.display = '';
  _positionReportsFlyout(sub, anchor);
  if (arrow) arrow.classList.add('open');
  // Aggancia le chiusure al ciclo successivo, per non intercettare questo stesso click.
  setTimeout(() => {
    document.addEventListener('mousedown', _onReportsOutside, true);
    document.addEventListener('keydown', _onReportsEsc, true);
  }, 0);
}

// Posiziona il popover a destra della voce "Filtri", clampato dentro la finestra.
function _positionReportsFlyout(sub, anchor) {
  if (!anchor) return;
  const r = anchor.getBoundingClientRect();
  sub.style.left = (r.right - 4) + 'px';
  sub.style.top  = r.top + 'px';
  const h = sub.offsetHeight;
  const maxTop = window.innerHeight - h - 8;
  if (r.top > maxTop) sub.style.top = Math.max(8, maxTop) + 'px';
}

function _closeReportsFlyout() {
  _reportsGroupOpen = false;
  const sub   = document.getElementById('navReportsSub');
  const arrow = document.getElementById('navReportsArrow');
  if (sub) {
    sub.style.display = 'none';
    sub.classList.remove('nav-sub-flyout');
    sub.style.left = ''; sub.style.top = '';
  }
  if (arrow) arrow.classList.remove('open');
  document.removeEventListener('mousedown', _onReportsOutside, true);
  document.removeEventListener('keydown', _onReportsEsc, true);
}

function _onReportsOutside(e) {
  const sub    = document.getElementById('navReportsSub');
  const anchor = document.getElementById('navReports');
  if (sub && !sub.contains(e.target) && anchor && !anchor.contains(e.target))
    _closeReportsFlyout();
}
function _onReportsEsc(e) { if (e.key === 'Escape') _closeReportsFlyout(); }

// Popola la lista dei filtri salvati nel popover (con pulsanti modifica/elimina).
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
              onclick="_closeReportsFlyout();showReportModal(${r.id})" title="Modifica">✏️</button>
      <button class="btn btn-ghost btn-icon" style="padding:2px 5px;font-size:10px;flex-shrink:0;opacity:.4"
              onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=.4"
              onclick="deleteReportConfirm(${r.id},'${r.name.replace(/'/g,"\\'")}')">✕</button>
    </div>`).join('');
}

// Apre un filtro salvato: naviga alla pagina Resoconti e ne carica configurazione + header.
async function openSavedReport(id) {
  _closeReportsFlyout();
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
