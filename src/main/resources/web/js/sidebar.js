/* ═══════════════════════════════════════════════════════════════════════════
   LucaMoneyManager — sidebar.js
   Sidebar conti + sezione "Filtri" (resoconti salvati)
   (estratto da app.js, stadio 4 del refactor)
═══════════════════════════════════════════════════════════════════════════ */

/* ─── Sidebar accounts ───────────────────────────────────────────────────── */
// Dipende da _accTypeOrder, _reportsGroupOpen, _currentReportId,
// _loadReportConfig, _updateReportHeader (tutti definiti in app.js, lazy).
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
    <div class="sd-weekday">${weekday}</div>
    <div class="sd-day">${now.getDate()}</div>
    <div class="sd-month">${month} ${now.getFullYear()}</div>
    <div class="sd-rule"></div>`;
}

// Aggiorna la data se l'app resta aperta oltre la mezzanotte (controllo ogni minuto).
if (!window._sidebarDateTimer) {
  window._sidebarDateTimer = setInterval(renderSidebarDate, 60000);
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
