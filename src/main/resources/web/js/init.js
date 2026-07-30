/* ═══════════════════════════════════════════════════════════════════════════
   LucaMoneyManager — init.js
   INIT / notices / Chart defaults / tooltip globale / bootstrap finale
   (estratto da app.js, stadio 9/9 del refactor — chiude lo split)

   Caricato come ULTIMO script: tutte le dipendenze (pages, router, ecc.)
   devono essere già disponibili al momento dell'esecuzione di init().
═══════════════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════════════
   INIT — notices
═══════════════════════════════════════════════════════════════════════════ */
const _noticeData = []; // {type:'telefono'|'overdue'|'forecast'|'unverified', list}
let _noticeDelay = 0; // stagger automatico tra notice successive

/** Chiamata quando l'app torna visibile dal tray o dalla taskbar (l'utente era via).
 *  Invalida i cache JS (il DB su OneDrive potrebbe essere cambiato), torna sulla
 *  dashboard con dati freschi e ricontrolla tutte le scadenze/notifiche. */
async function onTrayRestore() {
  // Il polling dello stato DB si sospende a finestra nascosta: qui siamo appena tornati in
  // primo piano, quindi va ripreso. Java ci chiama da windowDeiconified/tray, che è il
  // segnale autorevole anche se visibilitychange non fosse scattato.
  if (typeof window._resumeDbStatusPolling === 'function') window._resumeDbStatusPolling();
  await _refreshFromExternalChange(true);
}

/** Chiamata quando il DB viene riaperto (dopo l'auto-release idle) e si rileva che
 *  il file è stato modificato esternamente (sync OneDrive), MENTRE l'app è aperta e
 *  in uso. A differenza del ripristino da tray, qui l'utente sta lavorando su una
 *  pagina: NON deve essere spostato sulla dashboard. Refresh in place della pagina
 *  corrente + ricontrollo notifiche. */
async function onExternalDbChange() {
  await _refreshFromExternalChange(false);
}

/** Logica condivisa di refresh dopo un possibile cambio del DB su OneDrive.
 *  @param toDashboard true = torna sulla dashboard (ripristino da tray/taskbar);
 *                     false = resta sulla pagina corrente (cambio idle in foreground). */
async function _refreshFromExternalChange(toDashboard) {
  // Invalida cache in-session: il DB potrebbe essere stato sincronizzato da Android
  api._invalidateAccounts();
  api._invalidateCategories();
  api._invalidateTags();
  if (toDashboard) {
    // Ripristino dal tray/taskbar: torna sempre sulla dashboard (con dati freschi).
    // navigate() aggiorna sidebar/titolo e renderizza; se siamo già sulla dashboard
    // la guardia interna blocca il navigate → forziamo comunque il render.
    if (currentPage === 'dashboard') await renderPage('dashboard');
    else navigate('dashboard');
  } else {
    // App in foreground, utente al lavoro: ridisegna la pagina corrente senza spostarlo.
    // renderPage() rilegge i dati dal DB appena risincronizzato.
    try { await renderPage(currentPage); }
    catch(e) { console.error('refresh esterno: render pagina', e); }
  }
  // Azzera le notice stale e ricontrolla tutto da zero
  _noticeData.length = 0;
  _noticeDelay = 0;
  // Importa la coda pendenti: al risveglio il DB può essere stato sincronizzato da OneDrive
  // con transazioni nuove dal telefono. Va PRIMA della notifica "da telefono".
  // Niente toast "N importate": sarebbe ridondante con la notice "📱 …da telefono da
  // controllare" qui sotto, che segnala le stesse transazioni in modo persistente e con
  // i dettagli. Qui ci limitiamo a ridisegnare per aggiornare i saldi con le nuove transazioni.
  // I catch qui sotto erano tutti muti. Questa funzione gira PROPRIO quando il DB è appena
  // stato risincronizzato da OneDrive, cioè nello scenario in cui un fallimento è più
  // probabile (file lockato, connessione riaperta a metà): inghiottire l'errore in silenzio
  // rende impossibile capire cosa è andato storto. Il pattern muto è deliberato in init()
  // (un errore non deve fermare il bootstrap) ma qui non era giustificato da alcun commento.
  try {
    const importate = await api.importPending();
    if (importate && importate.length) {
      await renderPage(currentPage);   // saldi aggiornati con le nuove transazioni, sulla pagina corrente
    }
  } catch(e) {
    // Unico caso con toast: è il solo canale da cui l'utente può accorgersi che le
    // transazioni dal telefono non stanno arrivando. Restano in pending.jsonl e senza
    // questo messaggio non comparirebbe alcun indizio del perché.
    console.error('refresh esterno: importPending', e);
    toast('Import dal telefono non riuscito: ' + (e?.message || e), 'error');
  }
  // Le notice qui sotto sono informative: un fallimento si nota (la notice non compare) e
  // un toast per ognuna sarebbe rumore. Basta il log per la diagnosi.
  try {
    const daTelefono = await api.getTransactionsWithTag('phone');
    if (daTelefono.length) showDaTelefonoNotice(daTelefono);
  } catch(e) { console.error('refresh esterno: notice da telefono', e); }
  try {
    const overdue = await api.getOverdue();
    if (overdue.length) showOverdueNotice(overdue);
  } catch(e) { console.error('refresh esterno: notice scadute', e); }
  try {
    const dueToday = await api.getDueToday();
    if (dueToday.length) showDueTodayNotice(dueToday);
  } catch(e) { console.error('refresh esterno: notice in scadenza oggi', e); }
  try {
    const forecasts = await api.getForecasts();
    const ready = forecasts.filter(f => f.is_ready === 1 && !f.archived);
    if (ready.length) showForecastReadyNotice(ready);
  } catch(e) { console.error('refresh esterno: notice previsioni', e); }
  try {
    const unverified = await api.getTransactions({ reconciled: 0, sort_desc: true });
    if (unverified.length) showUnverifiedNotice(unverified);
  } catch(e) { console.error('refresh esterno: notice da verificare', e); }
  updateNoticeBtn();
}

// ─── Toggle DB remoto (solo modalità browser/WebServer) ──────────────────────

// Aggiorna la barra "Database aperto/chiuso" (solo modalità browser via WebServer).
// Il DB può chiudersi da solo (auto-release idle per la sync OneDrive): un polling
// (_startWebDbPolling) tiene la barra allineata allo stato reale.
let _lastWebDbState = null;  // ultimo stato mostrato: evita di ridisegnare l'HTML se invariato
async function _updateWebDbToggle() {
  const el = document.getElementById('webDbToggle');
  if (!el) return;
  let open = false, manuallyClosed = false;
  try {
    const r = await callJava('dbStatus', {});
    open = !!r.open; manuallyClosed = !!r.manuallyClosed;
  } catch(e) {}
  // Tre stati: aperto · idle (chiuso ma temporaneo, si riapre da solo) · chiuso a mano.
  const state = open ? 'open' : (manuallyClosed ? 'closed' : 'idle');
  if (state === _lastWebDbState) return;  // stato invariato: niente re-render (evita sfarfallii)
  _lastWebDbState = state;
  if (state === 'open') {
    el.innerHTML = `<div class="web-db-bar web-db-open">
         <span class="web-db-dot"></span>
         <span>Database aperto</span>
         <button class="btn btn-xs btn-ghost" onclick="_webDbClose()" style="margin-left:auto">Chiudi</button>
       </div>`;
  } else if (state === 'idle') {
    // Chiuso solo per inattività: nessun bottone "Apri", la prossima azione lo riapre da sola.
    el.innerHTML = `<div class="web-db-bar web-db-idle">
         <span class="web-db-dot"></span>
         <span>Database inattivo (si riapre all'uso)</span>
       </div>`;
  } else {
    el.innerHTML = `<div class="web-db-bar web-db-closed">
         <span class="web-db-dot"></span>
         <span>Database chiuso</span>
         <button class="btn btn-xs btn-primary" onclick="_webDbOpen()" style="margin-left:auto">Apri</button>
       </div>`;
  }
}

async function _webDbOpen() {
  await callJava('dbOpen', {});
  await _updateWebDbToggle();
  api._invalidateAccounts();
  api._invalidateCategories();
  api._invalidateTags();
  await updateSidebar();
  await renderPage(currentPage);
}

async function _webDbClose() {
  await callJava('dbClose', {});
  await _updateWebDbToggle();
}

// Polling dello stato DB in modalità browser: il DB può chiudersi da solo (auto-release
// idle per la sync OneDrive), quindi teniamo la barra allineata alla realtà ogni 2s.
// _updateWebDbToggle ridisegna solo al cambio di stato (guardia _lastWebDbState).
// Come il polling del pallino in titlebar (ui-shell.js), si sospende a pagina non visibile:
// a tab in background nessuno guarda la barra e dbStatus non tiene vivo il lock OneDrive,
// quindi il tick sarebbe solo lavoro sprecato. Al ritorno si aggiorna subito.
// _webDbPollingOn segna che siamo in modalità browser e il polling è desiderato: serve perché
// #webDbToggle esiste sempre nell'HTML (solo display:none in desktop) e quindi non discrimina
// la modalità, e perché il timer è null anche durante una sospensione legittima.
let _webDbPollTimer  = null;
let _webDbPollingOn  = false;
function _startWebDbPolling() {
  _webDbPollingOn = true;
  if (_webDbPollTimer || document.hidden) return;
  _webDbPollTimer = setInterval(_updateWebDbToggle, 2000);
}
function _stopWebDbPolling() {
  if (_webDbPollTimer) { clearInterval(_webDbPollTimer); _webDbPollTimer = null; }
}
document.addEventListener('visibilitychange', () => {
  if (!_webDbPollingOn) return;                       // desktop: qui non c'è nulla da riprendere
  if (document.hidden) { _stopWebDbPolling(); return; }
  _updateWebDbToggle();
  if (!_webDbPollTimer) _webDbPollTimer = setInterval(_updateWebDbToggle, 2000);
});

// Mostra una notifica toast in alto a destra: stagger automatico, barra di progresso
// 8s, auto-dismiss e click sull'header (escluso il bottone ✕) → onHeadClick.
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

// Aggiorna il bottone notifiche nella titlebar (✓ se nessuna, 🔔+badge col totale).
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

/** Ricalcola dal DB le notifiche il cui contenuto può cambiare mentre l'utente lavora
 *  (transazioni da verificare, transazioni dal telefono) e aggiorna il badge in titlebar.
 *  Serve perché _noticeData è una fotografia scattata all'avvio: senza questo, il badge
 *  resta al conteggio vecchio anche dopo che l'utente ha sistemato tutto.
 *  NON ri-mostra le toast: aggiorna solo i dati e il bottone 🔔.
 *  Le pianificate (overdue/duetoday) e le previsioni si aggiornano da sole nei rispettivi
 *  punti di risoluzione (_resolveOverdue, _archiveForecast). */
async function refreshNotices() {
  // Sostituisce in blocco una voce di _noticeData: la rimuove se la lista è vuota.
  const _sync = (type, list) => {
    const i = _noticeData.findIndex(n => n.type === type);
    if (list.length === 0) { if (i >= 0) _noticeData.splice(i, 1); }
    else if (i >= 0) _noticeData[i].list = list;
    else _noticeData.push({ type, list });
  };
  try {
    const unverified = await api.getTransactions({ reconciled: 0, sort_desc: true });
    _sync('unverified', unverified);
  } catch(e) {}
  try {
    const daTelefono = await api.getTransactionsWithTag('phone');
    _sync('telefono', daTelefono);
  } catch(e) {}
  updateNoticeBtn();
}

// Ri-mostra tutte le notifiche della sessione (click sul bottone 🔔), senza ri-salvarle.
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

// ── Notifiche specifiche: ognuna mostra una toast e, al click, naviga al contesto
//    pertinente (transazioni da telefono/da verificare, pianificate scadute/oggi, previsioni pronte) ──
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
        <span class="td-main">${esc(t.description||'-')}</span>
        <span class="amount-${t.type}">${t.type==='expense'?'-':''}${fmt.currency(t.amount)}</span>
      </div>`).join('')}
      ${list.length>4?`<div class="overdue-more">+ altre ${list.length-4}…</div>`:''}
    </div>
    <div class="overdue-notice-bar"><div class="overdue-notice-progress"></div></div>`,
    () => {
      api.getTags().then(tags => {
        const tag = tags.find(t => t.system_key === 'phone');
        const r = notifRange();
        txFilters = { range: r, ...rangeToFilter(r), tag_id: tag ? String(tag.id) : undefined };
        navigate('transactions');
      });
    });
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
        <span class="td-main">${esc(u.description||'-')}</span>
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
        <span class="td-main">${esc(u.description||'-')}</span>
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
        <span class="td-main">${esc(t.description||'-')}</span>
        <span class="amount-${t.type}">${t.type==='expense'?'-':''}${fmt.currency(t.amount)}</span>
      </div>`).join('')}
      ${list.length>4?`<div class="overdue-more">+ altre ${list.length-4}…</div>`:''}
    </div>
    <div class="overdue-notice-bar"><div class="overdue-notice-progress"></div></div>`,
    () => { const r = notifRange(); txFilters = { reconciled: 0, range: r, ...rangeToFilter(r) }; navigate('transactions'); });
}

/* ─── Chart.js global font (allineato al body Segoe UI) ──────────────────── */
Chart.defaults.font.family = "'Segoe UI', system-ui, sans-serif";
Chart.defaults.font.size   = 13;

// Tooltip globale per le bolle budget della dashboard: un solo elemento riusato,
// popolato dai data-attribute (data-tt-*) dell'elemento sotto il mouse, con auto-posizionamento.
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
      // dataset restituisce il valore già decodificato dall'attributo: reinterpolarlo in
      // innerHTML senza escape riaprirebbe l'iniezione che l'escaping in fase di render
      // aveva chiuso (il nome categoria è testo utente).
      tt.innerHTML =
        `<div class="tt-name">${esc(el.dataset.ttCat)}</div>` +
        `<div class="tt-row"><span class="tt-label">Budget</span><span class="tt-val">${esc(el.dataset.ttBudget)}</span></div>` +
        `<div class="tt-row"><span class="tt-label">${esc(l2)}</span><span class="tt-val">${esc(el.dataset.ttActual)}</span></div>` +
        `<div class="tt-row tt-rem${isOver ? ' over' : ''}"><span class="tt-label">Rimasto</span><span class="tt-val">${esc(el.dataset.ttRem)}</span></div>`;
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

// Bootstrap dell'app: tooltip, icone, modalità browser/desktop, preferenze persistenti,
// primo render (sidebar+dashboard), segnale uiReady a Java e controllo di tutte le notifiche.
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
  // Sincronizzo handle di resize e icona del bottone con lo stato finestra
  const {maximized} = await api.isMaximized();
  _applyMaxState(maximized);
  // Carica preferenze persistenti (non richiedono DB)
  const s = await api.getSettings();
  window._appVersion = s['_app_version'] || '';
  await _loadCustomThemes();
  if (s['appearance.theme']) applyTheme(s['appearance.theme']);
  if (s['accounts.favorites_only']) _accFavoritesOnly = s['accounts.favorites_only'] === '1';
  if (s['accounts.type_order']) { try { _accTypeOrder = JSON.parse(s['accounts.type_order']); } catch(e) {} }
  if (s['proj.range'])   _projRange  = s['proj.range'];
  if (s['proj.months'])  _projMonths = parseInt(s['proj.months']) || 6;
  if (s['proj.mode'])    _projMode   = s['proj.mode'];
  if (s['fc.networth'])  _fcShowNetWorth = s['fc.networth'] === '1';
  if (s['cf.range'])     _cfRange    = s['cf.range'];
  if (s['cf.months'])    _cfMonths   = parseInt(s['cf.months'])   || 6;
  seedRangeSettings(s);  // popola cache range per-conto/global/notif (migra 'tx.range' legacy)
  { const r = preferredRange();  txFilters = { range: r, ...rangeToFilter(r) }; }  // vista iniziale = range global
  if (s['portfolio.active_only']) _portfolioActiveOnly = ['active','closed','all'].includes(s['portfolio.active_only']) ? s['portfolio.active_only'] : (s['portfolio.active_only'] !== '0' ? 'active' : 'all');
  // Modalità browser: aggiorna il toggle, avvia il polling di stato e blocca il
  // caricamento dati se DB chiuso
  if (_isBrowser) {
    await _updateWebDbToggle();
    _startWebDbPolling();
    const { open } = await callJava('dbStatus', {}).catch(() => ({ open: false }));
    if (!open) return;
  }

  await updateSidebar();
  renderSidebarDate();
  await renderDashboard();
  // Segnala a Java che il primo frame è stato dipinto (double-rAF garantisce che
  // il compositor GPU abbia almeno un frame submitted, evitando flash neri dietro
  // la splash che svanisce). Vedi Bridge.case "uiReady" / MainWindow.showWhenReady.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    try { api.uiReady(); } catch(e) {}
  }));
  // Importa la coda pendenti dal telefono (pending.jsonl accanto al DB), poi notifica.
  // Va PRIMA di getTransactionsWithTag('phone') così le appena-importate entrano nel conteggio.
  try {
    const importate = await api.importPending();
    if (importate && importate.length) {
      toast(`Importate ${importate.length} transazion${importate.length===1?'e':'i'} dal telefono`, 'success');
      await renderDashboard();   // saldi aggiornati con le nuove transazioni
    }
  } catch(e) {}
  // Notifica transazioni da telefono
  try {
    const daTelefono = await api.getTransactionsWithTag('phone');
    if (daTelefono.length) showDaTelefonoNotice(daTelefono);
  } catch(e) {}
  // Notifica scadute (non bloccante, dopo il render): come le altre, un errore qui
  // non deve fermare il resto del bootstrap (notifiche successive e wizard di onboarding).
  try {
    const overdue = await api.getOverdue();
    if (overdue.length) showOverdueNotice(overdue);
  } catch(e) {}
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

  // Primo avvio: mostra il wizard di benvenuto (solo desktop/JCEF, una volta per DB).
  // Il flag onboarding.done vive in app_settings (per-database). Per non disturbare gli
  // utenti esistenti (DB con dati ma senza flag), lo mostriamo solo se il DB è vuoto.
  if (!_isBrowser && s['onboarding.done'] !== '1') {
    try {
      const accs = await api.getAccounts();
      if (!accs.length) showOnboardingWizard(s['db.path'] || '');
      else api.setSetting('onboarding.done', '1');  // utente esistente: marca fatto
    } catch(e) {}
  }
}

/* ─── Wizard di primo avvio (benvenuto + scelta DB + dati di esempio) ───────── */
// Overlay non chiudibile mostrato al primo avvio: l'utente sceglie quale database usare
// (locale / nuovo / esistente) e se popolarlo con dati di esempio. Al termine imposta il
// flag onboarding.done e ricarica conti/pagina corrente.
function showOnboardingWizard(localDbPath) {
  if (document.getElementById('onboardingOverlay')) return;  // già aperto
  const ov = document.createElement('div');
  ov.id = 'onboardingOverlay';
  ov.style.cssText = `position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.6);
    display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)`;
  ov.innerHTML = `
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;
                max-width:520px;width:92%;padding:24px 26px;box-shadow:0 12px 40px rgba(0,0,0,.5)">
      <div style="font-size:20px;font-weight:700;margin-bottom:4px">👋 Benvenuto in LucaMoneyManager</div>
      <div style="color:var(--txt2);font-size:13px;line-height:1.5;margin-bottom:18px">
        Scegli quale database utilizzare. Puoi tenerlo in locale oppure crearlo/aprirlo in una
        cartella sincronizzata (es. OneDrive) per condividerlo con l'app Android.
      </div>
      <label class="ob-opt" style="display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border:1px solid var(--border);border-radius:8px;cursor:pointer;margin-bottom:8px">
        <input type="radio" name="ob_mode" value="local" checked style="margin-top:3px">
        <span><b>Usa il database locale</b> <span style="color:var(--txt3)">(consigliato per iniziare)</span>
          <div style="font-size:11px;color:var(--txt3);word-break:break-all;margin-top:2px">${localDbPath}</div></span>
      </label>
      <label class="ob-opt" style="display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border:1px solid var(--border);border-radius:8px;cursor:pointer;margin-bottom:8px">
        <input type="radio" name="ob_mode" value="new" style="margin-top:3px">
        <span><b>Crea un nuovo database…</b>
          <div style="font-size:11px;color:var(--txt3);margin-top:2px">Scegli dove salvarlo (es. cartella OneDrive)</div></span>
      </label>
      <label class="ob-opt" style="display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border:1px solid var(--border);border-radius:8px;cursor:pointer;margin-bottom:14px">
        <input type="radio" name="ob_mode" value="existing" style="margin-top:3px">
        <span><b>Apri un database esistente…</b>
          <div style="font-size:11px;color:var(--txt3);margin-top:2px">Se hai già un .db (es. dal telefono via OneDrive)</div></span>
      </label>
      <label id="ob_seedRow" style="display:flex;gap:10px;align-items:center;padding:10px 12px;background:var(--bg3);border-radius:8px;cursor:pointer;margin-bottom:18px">
        <input type="checkbox" id="ob_seed" checked>
        <span style="font-size:13px">Popola con <b>dati di esempio</b>
          <span style="color:var(--txt3)">(un conto, 10 pianificate, un budget)</span></span>
      </label>
      <div style="display:flex;justify-content:flex-end">
        <button id="ob_start" class="btn btn-primary">Inizia</button>
      </div>
    </div>`;
  document.body.appendChild(ov);

  // La spunta "dati di esempio" non ha senso quando si apre un DB già esistente: disattivala.
  const seedRow = ov.querySelector('#ob_seedRow');
  const seedCb  = ov.querySelector('#ob_seed');
  ov.querySelectorAll('input[name="ob_mode"]').forEach(r => {
    r.onchange = () => {
      const dis = ov.querySelector('input[name="ob_mode"]:checked').value === 'existing';
      seedCb.disabled = dis;
      seedRow.style.opacity = dis ? '.45' : '';
    };
  });

  ov.querySelector('#ob_start').onclick = () => _onboardingStart(ov);
}

async function _onboardingStart(ov) {
  const mode = ov.querySelector('input[name="ob_mode"]:checked').value;
  const seed = ov.querySelector('#ob_seed').checked && mode !== 'existing';
  const btn  = ov.querySelector('#ob_start');
  btn.disabled = true; btn.textContent = 'Attendere…';
  try {
    if (mode === 'new' || mode === 'existing') {
      const res = await api.chooseDbFile(mode === 'new' ? 'save' : 'open');
      if (!res || res.cancelled) { btn.disabled = false; btn.textContent = 'Inizia'; return; }
      await api.reloadDb(res.path);  // reconnect: crea schema + categorie di default su DB nuovo
    }
    if (seed) {
      try { await api.seedExampleData(); }
      catch (e) { toast('Dati di esempio non creati: ' + e.message, 'error'); }
    }
    await api.setSetting('onboarding.done', '1');
    ov.remove();
    // Ricarica tutto con il DB scelto
    api._invalidateAccounts(); api._invalidateCategories(); api._invalidateTags();
    await updateSidebar();
    renderSidebarDate();
    await renderPage(currentPage);
    toast('Tutto pronto! Buona gestione 💰');
  } catch (e) {
    toast('Errore: ' + e.message, 'error');
    btn.disabled = false; btn.textContent = 'Inizia';
  }
}

/* ─── Log Viewer ── spostato in js/pages/logviewer.js ─────────────────────── */

/* ─── Previsioni ── spostate in js/pages/forecasts.js ─────────────────────── */

// Avvio immediato: il bridge è già utilizzabile in entrambe le modalità. In JCEF
// window.cefQuery è iniettato prima dell'esecuzione degli script di pagina; in modalità
// browser callJava ricade su fetch verso /bridge. init() è comunque async e la prima
// chiamata a Java avviene dopo il primo await, non durante il parsing di questo file.
init();
