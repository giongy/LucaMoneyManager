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
// Ripristina anche gli handler di Annulla/✕: confirm() li sostituisce con closure legate alla
// SUA Promise, che non devono sopravvivere alla chiusura — altrimenti il modale successivo
// eredita l'Annulla del confirm precedente (era la ragione della toppa in accounts.js).
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  modalConfirmCallback = null;
  document.getElementById('modalCancel').onclick = closeModal;
  document.getElementById('modalClose').onclick  = closeModal;
  const modal = document.getElementById('modal');
  if (modal) { modal.style.width = ''; modal.className = 'modal'; }
  if (window._budgetDetailChart) { window._budgetDetailChart.destroy(); window._budgetDetailChart = null; }
  // Editor note: l'istanza Quill e la nota in editing vanno rilasciate a OGNI chiusura, non
  // solo dopo un salvataggio riuscito (chiudendo con ✕ restavano appese, e un _editingNote
  // stantio poteva far sovrascrivere la nota sbagliata al salvataggio successivo).
  if (typeof window._resetNoteEditor === 'function') window._resetNoteEditor();
}

document.getElementById('modalClose').onclick  = closeModal;
document.getElementById('modalCancel').onclick = closeModal;
// Conferma del modale: esegue il callback e chiude (a meno che ritorni false = validazione fallita).
// try/catch obbligatorio: senza, un errore nel callback (es. salvataggio fallito) diventa una
// promise rejection non gestita → il bottone "non fa niente". Così l'errore viene sempre mostrato.
document.getElementById('modalConfirm').onclick = async () => {
  if (!modalConfirmCallback) return;
  const btn = document.getElementById('modalConfirm');
  btn.disabled = true;
  try {
    const result = await modalConfirmCallback();
    if (result !== false) closeModal();
  } catch (e) {
    toast('Errore: ' + (e && e.message ? e.message : e), 'error');
  } finally {
    btn.disabled = false;
  }
};

/* ─── Confirm dialog (usa openModal) ─────────────────────────────────────── */
// Dialogo di conferma basato su openModal: risolve la Promise a true (Elimina) o false
// (Annulla / ✕). TUTTE le vie d'uscita del modale devono risolvere: il ✕ era cablato a
// closeModal nudo, quindi chiuderlo lasciava la Promise pendente per sempre e il chiamante
// bloccato sull'await. closeModal() rimette gli handler di default dopo la chiusura.
function confirm(title, msg) {
  return new Promise(resolve => {
    const done = v => { closeModal(); resolve(v); };
    openModal(title, `<p style="color:var(--txt2);line-height:1.6">${msg}</p>`,
      () => done(true),
      'Elimina', 'btn-danger');
    document.getElementById('modalCancel').onclick = () => done(false);
    document.getElementById('modalClose').onclick  = () => done(false);
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
  // winX/winY sono popolati da getWindowPos() (async): un mousemove che arriva prima
  // che ritorni li troverebbe undefined → setWindowPos(NaN) → JsonNull lato Java. Attendi.
  if (winX === undefined || winY === undefined) return;
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

/* ─── Indicatore stato connessione DB ────────────────────────────────────── */
// Il DB viene chiuso automaticamente quando la finestra è inattiva/minimizzata,
// per liberare il lock e lasciare sincronizzare OneDrive col telefono (vedi
// Database.ensureOpen/auto-release). Il pallino verde/grigio in titlebar riflette
// se la connessione è aperta (in uso) o chiusa (lock rilasciato).
// Nota: dbStatus NON riapre il DB — leggere lo stato non tiene vivo il lock.
const _dbStatusEl = document.getElementById('dbStatusIndicator');
const _dbStatusLabelEl = document.getElementById('dbStatusLabel');
async function _refreshDbStatus() {
  try {
    const { open } = await api.dbStatus();
    _dbStatusEl.classList.toggle('db-open', !!open);
    _dbStatusEl.title = open
      ? 'Database aperto (in uso)'
      : 'Database chiuso — OneDrive può sincronizzare';
    // L'etichetta dice a parole quel che il colore del pallino codifica.
    if (_dbStatusLabelEl) _dbStatusLabelEl.textContent = open ? 'DB aperto' : 'DB chiuso';
  } catch { /* connessione bridge non pronta: riprova al prossimo tick */ }
}
// Il polling si sospende quando la pagina non è visibile: a finestra minimizzata o coperta
// nessuno guarda il pallino, e continuare a interrogare il bridge ogni 2s è lavoro sprecato
// (dbStatus non riapre il DB, quindi non c'è alcun effetto sul lock OneDrive: solo CPU).
// Al ritorno in primo piano si aggiorna subito, senza attendere il tick successivo.
// In modalità browser la titlebar è nascosta (init.js) e questo indicatore non esiste a
// schermo: lì il polling non parte affatto — ci pensa la barra #webDbToggle.
let _dbStatusTimer = null;
function _stopDbStatusPolling() {
  if (_dbStatusTimer) { clearInterval(_dbStatusTimer); _dbStatusTimer = null; }
}
function _startDbStatusPolling() {
  if (_dbStatusTimer || document.hidden) return;
  _dbStatusTimer = setInterval(_refreshDbStatus, 2000);
}
// typeof cefQuery: stessa discriminante usata da init.js per _isBrowser.
if (typeof window.cefQuery === 'function') {
  _refreshDbStatus();
  _startDbStatusPolling();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) _stopDbStatusPolling();
    else { _refreshDbStatus(); _startDbStatusPolling(); }
  });
  // Canale di riserva per il desktop: su minimizza/ripristina Java chiama windowIconified /
  // windowDeiconified (MainWindow) e da lì onTrayRestore() in JS. È il segnale autorevole
  // della finestra, quindi il polling riprende anche se visibilitychange non scattasse in JCEF.
  window._resumeDbStatusPolling = () => { _refreshDbStatus(); _startDbStatusPolling(); };
}

/* ─── Badge errori app.log ───────────────────────────────────────────────── */
// app.log raccoglie le eccezioni Java (vedi Bridge/App): errori che possono capitare
// in modo "trasparente" (una transazione non registrata, un backup fallito) senza che
// l'utente se ne accorga sul momento. Questo badge in titlebar resta nascosto finché
// il log è pulito e diventa rosso col numero di errori appena ne compare uno; il click
// apre app.log. Il conteggio è sull'intero file: si azzera con "Pulisci log" in Impostazioni.
const _logErrBtn = document.getElementById('logErrorBtn');
async function _refreshLogErrors() {
  try {
    const { count } = await api.getAppLogErrors();
    if (count > 0) {
      _logErrBtn.textContent = '⚠ ' + count;
      _logErrBtn.title = count === 1
        ? '1 errore nel log — clicca per aprire app.log'
        : count + ' errori nel log — clicca per aprire app.log';
      _logErrBtn.style.display = '';
    } else {
      _logErrBtn.style.display = 'none';
    }
  } catch { /* bridge non pronto: riprova al prossimo tick */ }
}
_refreshLogErrors();
// Ogni 5 minuti (rete di sicurezza: gli errori non sono frequenti e la lettura di app.log
// da OneDrive è meglio farla di rado) + subito dopo ogni operazione fallita: callJava logga
// il fallimento in app.log, quindi ri-controlliamo al volo (vedi bridge.js) — è quest'ultimo
// il canale in tempo reale, il polling copre solo gli errori che non passano da onFailure.
setInterval(_refreshLogErrors, 300000);
window.refreshLogErrors = _refreshLogErrors;
// Ricontrollo al ritorno in primo piano: app.log può essere stato svuotato a mano mentre la
// finestra era minimizzata o coperta, e senza questo il badge resterebbe rosso fino al tick
// dei 5 minuti — sembrando "bloccato" e sbloccarsi solo riavviando l'app. Il conteggio viene
// riletto dal file a ogni chiamata (Bridge.appLogErrors), quindi non c'è nulla da invalidare.
// Il ripristino dal tray passa invece da onTrayRestore (init.js), che chiama la stessa
// funzione: è il canale autorevole di Java, valido anche se visibilitychange non scattasse.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) _refreshLogErrors();
});
