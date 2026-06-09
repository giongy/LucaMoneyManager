/* ═══════════════════════════════════════════════════════════════════════════
   LucaMoneyManager — ui-shell.js
   Chrome della finestra: titlebar drag, resize handles, modal, bottoni titlebar
   (estratti da app.js, stadio 3 del refactor)
═══════════════════════════════════════════════════════════════════════════ */

/* ─── Modal ───────────────────────────────────────────────────────────────── */
let modalConfirmCallback = null;

// Apre il modale generico con titolo, HTML del corpo e callback di conferma (onConfirm=null → solo info).
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

// Chiude il modale e ripulisce lo stato (larghezza, classi, eventuale grafico di dettaglio budget).
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

/* ─── Confirm dialog (usa openModal) ─────────────────────────────────────── */
// Dialogo di conferma basato su openModal: risolve la Promise a true (Elimina) o false (Annulla).
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

/* ─── Bottoni titlebar ───────────────────────────────────────────────────── */
// _toggleTheme e showShortcutsHelp sono definite in app.js: risolte lazy al click.

// Sincronizza icona/tooltip del bottone e handle di resize con lo stato finestra.
// Globale: chiamata anche da init.js all'avvio.
function _applyMaxState(maximized) {
  document.querySelectorAll('.rh').forEach(el => el.style.display = maximized ? 'none' : '');
  const btn = document.getElementById('btnMax');
  if (btn) {
    btn.textContent = maximized ? '❐' : '□';
    btn.title       = maximized ? 'Ripristina' : 'Ingrandisci';
  }
}

async function _toggleMaximize() {
  await api.maximize();
  const {maximized} = await api.isMaximized();
  _applyMaxState(maximized);
}

document.getElementById('btnMin').onclick   = () => api.minimize();
document.getElementById('btnMax').onclick   = _toggleMaximize;
document.getElementById('btnClose').onclick = () => api.close();

// Doppio click sulla titlebar = massimizza/ripristina (standard desktop)
titlebar.addEventListener('dblclick', e => {
  if (e.target.closest('.tb-btn')) return;
  drag = false;
  _toggleMaximize();
});
document.getElementById('themeToggleBtn').onclick = () => _toggleTheme();
document.getElementById('shortcutsBtn').onclick   = () => showShortcutsHelp();
