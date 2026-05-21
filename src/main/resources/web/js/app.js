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

/* ─── Bridge Java ────── spostato in js/bridge.js ─────────────────────────── */
/* ─── Utils / Chart / fmt / toast ── spostati in js/utils.js ──────────────── */
/* ─── Modal / confirm / titlebar / resize ── spostati in js/ui-shell.js ──── */
/* ─── Router / navigate / renderPage / refreshAfterTxChange ── js/router.js  */
/* ─── Sidebar conti + filtri salvati ── spostati in js/sidebar.js ────────── */

/* ─── DASHBOARD ── spostata in js/pages/dashboard.js ──────────────────────── */

/* ─── TRANSAZIONI ── spostata in js/pages/transactions.js ─────────────────── */
/* ─── CONTI ── spostata in js/pages/accounts.js ───────────────────────────── */

/* ─── BUDGET ── spostata in js/pages/budget.js ────────────────────────────── */

/* ─── PORTAFOGLIO ── spostata in js/pages/portfolio.js ─────────────────────── */

/* ─── RESOCONTI / Analytics ── spostati in js/pages/analytics.js ──────────── */
/* ─── IMPOSTAZIONI / Temi / Shortcuts ── spostati in js/pages/settings.js ── */
/* ─── CATEGORIE ── spostata in js/pages/categories.js ─────────────────────── */
/* ─── TAG ────── spostato in js/pages/tags.js ─────────────────────────────── */

/* ─── PERIODI PERSONALIZZATI ── spostato in js/pages/ranges.js ────────────── */

/* ─── BUDGET VS PIANIFICATE ── spostata in js/pages/budget.js ─────────────── */

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
  await renderPage(currentPage);
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
  await renderPage(currentPage);
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
  if (s['portfolio.active_only']) _portfolioActiveOnly = ['active','closed','all'].includes(s['portfolio.active_only']) ? s['portfolio.active_only'] : (s['portfolio.active_only'] !== '0' ? 'active' : 'all');
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

/* ─── Log Viewer ── spostato in js/pages/logviewer.js ─────────────────────── */

/* ─── Previsioni ── spostate in js/pages/forecasts.js ─────────────────────── */

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
