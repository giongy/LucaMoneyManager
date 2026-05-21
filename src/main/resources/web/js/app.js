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

/* ═══════════════════════════════════════════════════════════════════════════
   PORTAFOGLIO
═══════════════════════════════════════════════════════════════════════════ */
// Calcola valore di mercato di una posizione (gestisce equity e bond)
// Bond: quantity = nominale totale (€), price = % → valore = nominale × price% / 100
function portfolioItemValue(i, useAvg = false) {
  const price = useAvg ? i.avg_price : (i.current_price || i.avg_price);
  if (i.asset_type === 'bond') return i.quantity * price / 100;
  return i.quantity * price;
}

async function renderPortfolio() {
  const pg = document.getElementById('pg-portfolio');
  const [items, accounts] = await Promise.all([api.getPortfolio(), api.getAccounts()]);
  _portfolioItems = items;
  const investAccounts = accounts.filter(a => a.type === 'investment' && !a.is_closed);

  const visibleItems = items
    .filter(i => _portfolioActiveOnly === 'active' ? i.quantity > 0 : _portfolioActiveOnly === 'closed' ? i.quantity === 0 : true)
    .filter(i => _portfolioTypeFilter === 'all' ? true : (i.asset_type || 'equity') === _portfolioTypeFilter);

  const totalInvested    = visibleItems.reduce((s,i) => s + portfolioItemValue(i, true), 0);
  const totalCurrent     = visibleItems.reduce((s,i) => s + portfolioItemValue(i, false), 0);
  const totalCommissions = visibleItems.reduce((s,i) => s + (i.total_commissions || 0), 0);
  const totalPnL         = totalCurrent - totalInvested;
  const pnlPct           = totalInvested ? (totalPnL/totalInvested)*100 : 0;
  const totalNominal     = visibleItems.filter(i => i.asset_type === 'bond').reduce((s,i) => s + (i.quantity || 0), 0);

  pg.innerHTML = `
    <div style="display:flex;align-items:center;gap:0;border-bottom:1px solid var(--border);margin-bottom:16px">
      <button class="btn" onclick="_setPortfolioTab('portfolio')"
        style="border-radius:0;border:none;border-bottom:2px solid ${_portfolioTab==='portfolio'?'var(--accent)':'transparent'};
               color:${_portfolioTab==='portfolio'?'var(--accent)':'var(--txt2)'};font-weight:${_portfolioTab==='portfolio'?'600':'400'};
               padding:8px 18px;background:none">📋 Portafoglio</button>
      <button class="btn" onclick="_setPortfolioTab('analisi')"
        style="border-radius:0;border:none;border-bottom:2px solid ${_portfolioTab==='analisi'?'var(--accent)':'transparent'};
               color:${_portfolioTab==='analisi'?'var(--accent)':'var(--txt2)'};font-weight:${_portfolioTab==='analisi'?'600':'400'};
               padding:8px 18px;background:none">📊 Analisi</button>
      <button class="btn" onclick="_setPortfolioTab('storico')"
        style="border-radius:0;border:none;border-bottom:2px solid ${_portfolioTab==='storico'?'var(--accent)':'transparent'};
               color:${_portfolioTab==='storico'?'var(--accent)':'var(--txt2)'};font-weight:${_portfolioTab==='storico'?'600':'400'};
               padding:8px 18px;background:none">📋 Storico</button>
      ${investAccounts.length && _portfolioTab==='portfolio' ? `
        <div style="margin-left:auto;padding-bottom:2px;display:flex;align-items:center;gap:6px">
          <div style="display:flex;flex-direction:column;align-items:center;gap:3px;padding:4px 8px;background:var(--bg3);border-radius:8px">
            <span style="font-size:10px;color:var(--txt3);text-transform:uppercase;letter-spacing:.5px;line-height:1">Visualizza</span>
            <div class="theme-toggle-group" style="margin:0">
              <button class="btn theme-btn ${_portfolioActiveOnly==='active'?'theme-btn-active':''}"  onclick="_setPortfolioFilter('active')">Solo attivi</button>
              <button class="btn theme-btn ${_portfolioActiveOnly==='closed'?'theme-btn-active':''}" onclick="_setPortfolioFilter('closed')">Chiusi</button>
              <button class="btn theme-btn ${_portfolioActiveOnly==='all'?'theme-btn-active':''}"    onclick="_setPortfolioFilter('all')">Tutti</button>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:center;gap:3px;padding:4px 8px;background:var(--bg3);border-radius:8px">
            <span style="font-size:10px;color:var(--txt3);text-transform:uppercase;letter-spacing:.5px;line-height:1">Tipo</span>
            <div class="theme-toggle-group" style="margin:0">
              <button class="btn theme-btn ${_portfolioTypeFilter==='all'?'theme-btn-active':''}"    onclick="_setPortfolioTypeFilter('all')">Tutti</button>
              <button class="btn theme-btn ${_portfolioTypeFilter==='equity'?'theme-btn-active':''}" onclick="_setPortfolioTypeFilter('equity')">Azioni</button>
              <button class="btn theme-btn ${_portfolioTypeFilter==='bond'?'theme-btn-active':''}"   onclick="_setPortfolioTypeFilter('bond')">Obbligazioni</button>
            </div>
          </div>
          <div style="width:1px;height:36px;background:var(--border);margin:0 10px;flex-shrink:0"></div>
          <button class="btn btn-success" id="btnRefreshPrices">🌐 Aggiorna valori online</button>
          <div style="width:8px;flex-shrink:0"></div>
          <button class="btn btn-secondary" id="btnImportPos">📥 Carica esistente</button>
          <div style="width:8px;flex-shrink:0"></div>
          <button class="btn btn-primary" id="btnBuyStock">+ Acquista</button>
        </div>` : ''}
    </div>
    ${!investAccounts.length ? `
      <div class="card" style="padding:32px;text-align:center;color:var(--txt2)">
        <div style="font-size:32px;margin-bottom:12px">💼</div>
        <div style="font-size:16px;font-weight:600;margin-bottom:8px">Nessun conto investimento</div>
        <div style="margin-bottom:16px">Per usare il portafoglio crea prima un conto di tipo <strong>Investimento</strong>.</div>
        <button class="btn btn-primary" onclick="navigate('accounts')">Vai ai Conti →</button>
      </div>` : _portfolioTab === 'analisi' ? `
    <div id="pgPortfolioAnalisi"></div>
    ` : _portfolioTab === 'storico' ? `
    <div id="pgPortfolioStorico"></div>
    ` : `
    <div class="portfolio-summary">
      <div class="stat-card">
        <div class="stat-label">💼 Investito</div>
        <div class="stat-value" style="color:var(--accent)">${fmt.currency(totalInvested)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">📊 Valore Attuale</div>
        <div class="stat-value" style="color:var(--accent2)">${fmt.currency(totalCurrent)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">📈 P&L Totale</div>
        <div class="stat-value ${totalPnL>=0?'pnl-positive':'pnl-negative'}">${fmt.currency(totalPnL)}</div>
        <div class="stat-sub ${totalPnL>=0?'pnl-positive':'pnl-negative'}">${fmt.pct(pnlPct)}</div>
      </div>
      ${totalNominal > 0 ? `
      <div class="stat-card">
        <div class="stat-label">🏷️ Nominale (a 100)</div>
        <div class="stat-value" style="color:var(--txt2)">${fmt.currency(totalNominal)}</div>
      </div>` : ''}
      ${totalCommissions > 0 ? `
      <div class="stat-card">
        <div class="stat-label">💸 Commissioni</div>
        <div class="stat-value" style="color:var(--txt2)">${fmt.currency(totalCommissions)}</div>
      </div>` : ''}
    </div>
    <div class="card">
      <div class="table-wrap">
        <table><thead><tr>
          ${[
            ['tipo',     'Tipo',          ''],
            ['acquisto', 'Acquisto',      ''],
            ['ticker',   'Ticker',        ''],
            ['nome',     'Nome',          ''],
            ['paese',    'Paese',         ''],
            ['scadenza', 'Scadenza',      ''],
            ['conto',    'Conto',         ''],
            ['qty',      'Qtà / Nominale',''],
            ['avg',      'Prezzo Medio',  ''],
            ['cur',      'Prezzo Att.',   ''],
            ['valore',   'Valore',        'text-right'],
            ['comm',     'Comm.',         'text-right'],
            ['pnl',      'P&L',           'text-right'],
          ].map(([col, label, cls]) => {
            const active = _portfolioSort.col === col;
            const ind = active ? (_portfolioSort.dir > 0 ? ' ▲' : ' ▼') : '';
            return `<th class="${cls} sched-th-sort" style="cursor:pointer;white-space:nowrap" onclick="_portfolioSortBy('${col}')">${label}<span class="sort-ind">${ind}</span></th>`;
          }).join('')}
        </tr></thead><tbody>
        ${(() => {
          let rows = visibleItems.slice();
          // Calcola valori per il sort
          rows = rows.map(i => {
            const val  = portfolioItemValue(i, false);
            const cost = portfolioItemValue(i, true);
            return { ...i, _val: val, _cost: cost, _pnl: val - cost, _comm: i.total_commissions || 0 };
          });
          const col = _portfolioSort.col, dir = _portfolioSort.dir;
          rows.sort((a, b) => {
            let va, vb;
            switch (col) {
              case 'tipo':     va = a.asset_type || ''; vb = b.asset_type || ''; break;
              case 'acquisto': va = a.first_buy_date||'9999'; vb = b.first_buy_date||'9999'; break;
              case 'ticker':   va = a.ticker || '';     vb = b.ticker || '';     break;
              case 'nome':     va = a.name || '';       vb = b.name || '';       break;
              case 'paese':    va = a.country || '';    vb = b.country || '';    break;
              case 'scadenza': va = a.maturity_date||'9999'; vb = b.maturity_date||'9999'; break;
              case 'conto':    va = a.account_name||''; vb = b.account_name||''; break;
              case 'qty':      va = a.quantity||0;      vb = b.quantity||0;      break;
              case 'avg':      va = a.avg_price||0;     vb = b.avg_price||0;     break;
              case 'cur':      va = a.current_price||0; vb = b.current_price||0; break;
              case 'valore':   va = a._val;             vb = b._val;             break;
              case 'comm':     va = a._comm;            vb = b._comm;            break;
              case 'pnl':      va = a._pnl;             vb = b._pnl;             break;
              default:         va = ''; vb = '';
            }
            if (typeof va === 'string') return dir * va.localeCompare(vb);
            return dir * (va - vb);
          });
          if (!rows.length) return '<tr><td colspan="13" style="text-align:center;padding:40px;color:var(--txt3)">Nessun titolo in portafoglio. Clicca "+ Acquista" per iniziare.<br><small style="color:var(--txt3)">Tasto destro su una riga per le azioni</small></td></tr>';
          return rows.map(i => {
            const isBond = i.asset_type === 'bond';
            const val = i._val, cost = i._cost, pnl = i._pnl, comm = i._comm;
            const pnlP = cost ? (pnl/cost)*100 : 0;
            const priceDisplay = isBond ? `${(i.avg_price||0).toFixed(4)} %` : fmt.price(i.avg_price);
            const priceUnit    = isBond ? '%' : '€';
            const typeBadge    = isBond
              ? `<span class="badge" style="background:#d29922;color:#fff;font-size:10px;padding:1px 5px;border-radius:4px">OBB</span>`
              : `<span class="badge" style="background:#58a6ff;color:#fff;font-size:10px;padding:1px 5px;border-radius:4px">AZI</span>`;
            const couponInfo = isBond && i.coupon_rate
              ? `<br><small style="color:var(--txt3);font-size:10px">${i.coupon_rate}% → netto ${((1-(i.coupon_tax||12.5)/100)*i.coupon_rate).toFixed(3)}%</small>`
              : '';
            const qtyDisplay = isBond
              ? `<span title="Nominale totale">${fmt.currency(i.quantity)}</span>`
              : i.quantity;
            const scadenzaDisplay = i.maturity_date || '<span style="color:var(--txt3)">—</span>';
            const countryDisplay = i.country
              ? `<span style="font-size:12px">${i.country}</span>`
              : `<span style="color:var(--txt3)">—</span>`;
            const firstBuyDisplay = i.first_buy_date
              ? `<span style="font-size:12px;white-space:nowrap">${i.first_buy_date}</span>`
              : `<span style="color:var(--txt3)">—</span>`;
            const priceStatus = _portfolioPriceStatus[i.id];
            const statusDot = priceStatus === 'ok'   ? `<span style="color:#3fb950;font-size:12px;margin-left:4px" title="Prezzo aggiornato">●</span>`
                            : priceStatus === 'fail' ? `<span style="color:#e3b341;font-size:12px;margin-left:4px" title="Non trovato online">●</span>`
                            :                         `<span style="color:var(--txt3);font-size:12px;margin-left:4px" title="Non ancora aggiornato">●</span>`;
            return `<tr oncontextmenu="_showPortfolioCtx(${i.id},event)" style="cursor:context-menu" title="Tasto destro per le azioni">
              <td style="white-space:nowrap">${typeBadge}${statusDot}</td>
              <td>${firstBuyDisplay}</td>
              <td class="td-main" style="font-weight:700">${i.ticker}</td>
              <td>${i.name}${couponInfo}</td>
              <td>${countryDisplay}</td>
              <td style="font-size:12px;white-space:nowrap">${scadenzaDisplay}</td>
              <td><span style="color:${i.account_color}">${i.account_icon}</span> ${i.account_name}</td>
              <td>${qtyDisplay}</td>
              <td>${priceDisplay}</td>
              <td>
                <div style="display:flex;align-items:center;gap:3px">
                  <input type="text" inputmode="decimal" class="form-control" style="width:75px;padding:2px 6px;font-size:12px"
                    value="${i.current_price||''}"
                    onblur="updateStockPrice(${i.id}, this.value)"
                    onkeydown="if(event.key==='Enter'){this.blur()}"
                    placeholder="—">
                  <span style="font-size:11px;color:var(--txt3)">${priceUnit}</span>
                </div>
              </td>
              <td class="text-right">${fmt.currency(val)}</td>
              <td class="text-right" style="color:var(--txt3);font-size:12px">${comm > 0 ? fmt.currency(comm) : '—'}</td>
              <td class="text-right ${pnl>=0?'pnl-positive':'pnl-negative'}">${fmt.currency(pnl)}<br><small>${fmt.pct(pnlP)}</small></td>
            </tr>`;
          }).join('');
        })()}
        </tbody></table>
      </div>
    </div>`}`;

  if (investAccounts.length && _portfolioTab === 'portfolio') {
    document.getElementById('btnBuyStock').onclick      = () => showBuyModal(null, investAccounts, accounts).catch(e => toast(e.message,'error'));
    document.getElementById('btnImportPos').onclick     = () => showImportModal(investAccounts);
    document.getElementById('btnRefreshPrices').onclick = () => refreshPortfolioPrices();
  }
  if (investAccounts.length && _portfolioTab === 'analisi') {
    renderPortfolioAnalisi(items);
  }
  if (_portfolioTab === 'storico') {
    renderPortfolioStorico(items);
  }
}

function _setPortfolioTab(tab) {
  _portfolioTab = tab;
  renderPortfolio();
}

function _setPortStoricoFilter(f) {
  _portStoricoFilter = f;
  renderPortfolioStorico(_portfolioItems);
}

function _togglePortStorico(id) {
  if (_portStoricoExp.has(id)) _portStoricoExp.delete(id);
  else _portStoricoExp.add(id);
  renderPortfolioStorico(_portfolioItems);
}

async function renderPortfolioStorico(items) {
  const container = document.getElementById('pgPortfolioStorico');
  if (!container) return;
  container.innerHTML = `<div style="text-align:center;padding:32px;color:var(--txt3)">⏳ Caricamento…</div>`;

  const filtered = _portStoricoFilter === 'active' ? items.filter(i => i.quantity > 0)
                 : _portStoricoFilter === 'closed'  ? items.filter(i => !(i.quantity > 0))
                 : items;

  const txResults = await Promise.all(filtered.map(i => api.getPortfolioTransactions(i.id)));
  const withTxs   = filtered.map((item, idx) => ({ item, txs: txResults[idx] })).filter(x => x.txs.length > 0);

  const toolbar = `
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px">
      <div class="theme-toggle-group" style="margin:0">
        <button class="btn theme-btn ${_portStoricoFilter==='all'    ?'theme-btn-active':''}" onclick="_setPortStoricoFilter('all')">Tutti</button>
        <button class="btn theme-btn ${_portStoricoFilter==='active' ?'theme-btn-active':''}" onclick="_setPortStoricoFilter('active')">Attivi</button>
        <button class="btn theme-btn ${_portStoricoFilter==='closed' ?'theme-btn-active':''}" onclick="_setPortStoricoFilter('closed')">Chiusi</button>
      </div>
    </div>`;

  if (!withTxs.length) {
    container.innerHTML = toolbar + `<div class="empty-state"><div class="empty-icon">📋</div><p>Nessuno storico disponibile.</p></div>`;
    return;
  }

  const TYPE_LABEL = { buy:'Acquisto', sell:'Vendita', coupon:'Cedola', expense:'Spesa' };
  const TYPE_COLOR = { buy:'var(--expense)', sell:'var(--income)', coupon:'var(--income)', expense:'var(--expense)' };
  const TYPE_SIGN  = { buy:'-', sell:'+', coupon:'+', expense:'-' };

  let grandBuy = 0, grandSell = 0, grandCoupon = 0, grandExpense = 0;

  const cards = withTxs.map(({ item, txs }) => {
    const totBuy     = txs.filter(t=>t.type==='buy').reduce((s,t)=>s+t.quantity*t.price, 0);
    const totSell    = txs.filter(t=>t.type==='sell').reduce((s,t)=>s+t.quantity*t.price, 0);
    const totCoupon  = txs.filter(t=>t.type==='coupon').reduce((s,t)=>s+t.price, 0);
    const totExpense = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.price, 0);
    grandBuy += totBuy; grandSell += totSell; grandCoupon += totCoupon; grandExpense += totExpense;

    const collapsed = !_portStoricoExp.has(item.id);
    const net = totSell + totCoupon - totBuy - totExpense;

    const chips = [
      totBuy     > 0 ? `<span class="r-chip" style="color:var(--expense)">Acq. ${fmt.currency(totBuy)}</span>`      : '',
      totSell    > 0 ? `<span class="r-chip" style="color:var(--income)">Vend. ${fmt.currency(totSell)}</span>`     : '',
      totCoupon  > 0 ? `<span class="r-chip" style="color:var(--income)">Ced. ${fmt.currency(totCoupon)}</span>`    : '',
      totExpense > 0 ? `<span class="r-chip" style="color:var(--expense)">Sp. ${fmt.currency(totExpense)}</span>`   : '',
      `<span class="r-chip" style="font-weight:600;color:${net>=0?'var(--income)':'var(--expense)'}">Netto ${net>=0?'+':''}${fmt.currency(net)}</span>`,
    ].filter(Boolean).join('');

    const isBond = item.asset_type === 'bond';
    const rows = [...txs].sort((a, b) => a.date.localeCompare(b.date)).map(t => {
      const isValued = t.type !== 'coupon' && t.type !== 'expense';
      const total = isValued ? t.quantity * t.price : t.price;
      const priceDisplay = !isValued ? '—'
        : isBond ? `${(t.price * 100).toFixed(4)} %`
        : `${t.price.toFixed(4)} €`;
      const typeLabel = t.type === 'expense' && t.notes === 'Commissione'
        ? `<span style="color:${TYPE_COLOR.expense};font-weight:600">Commissione</span>`
        : `<span style="color:${TYPE_COLOR[t.type]||'var(--txt)'};font-weight:600">${TYPE_LABEL[t.type]||t.type}</span>`;
      return `<tr>
        <td style="width:110px">${fmt.date(t.date)}</td>
        <td style="width:130px">${typeLabel}</td>
        <td style="width:100px;text-align:right">${isValued ? t.quantity : '—'}</td>
        <td style="width:160px;text-align:right">${priceDisplay}</td>
        <td style="width:160px;text-align:right;color:${TYPE_COLOR[t.type]||'var(--txt)'}">${TYPE_SIGN[t.type]||''}${fmt.currency(total)}</td>
        <td>${t.notes && t.notes !== 'Commissione' ? t.notes : ''}</td>
        <td style="width:36px;text-align:center">
          <button class="btn btn-ghost" style="padding:2px 6px;font-size:11px;color:var(--txt3)"
                  onclick="deletePortfolioTransactionConfirm(${t.id},'${t.type}','${item.ticker}')"
                  title="Annulla operazione">✕</button>
        </td>
      </tr>`;
    }).join('');

    return `
      <div class="card" style="margin-bottom:4px;${collapsed?'padding:6px 12px':''}">
        <div class="port-storico-row${collapsed?' port-storico-collapsed':''}" style="display:flex;align-items:center;gap:8px;cursor:pointer;user-select:none"
             onclick="_togglePortStorico(${item.id})">
          <span style="font-size:10px;color:var(--txt3);flex-shrink:0">${collapsed?'▶':'▼'}</span>
          <span style="font-weight:700;font-size:var(--fs-md,12px)">${item.ticker}</span>
          <span style="color:var(--txt2);font-size:var(--fs-md,12px)">${item.name}</span>
          <div style="display:flex;flex-wrap:wrap;gap:4px;margin-left:auto">${chips}</div>
        </div>
        ${collapsed ? '' : `
        <div class="table-wrap" style="margin-top:10px">
          <table style="table-layout:fixed;width:100%"><thead><tr>
            <th style="width:110px">Data</th>
            <th style="width:130px">Tipo</th>
            <th style="width:100px;text-align:right">Qtà</th>
            <th style="width:160px;text-align:right">Prezzo</th>
            <th style="width:160px;text-align:right">Totale</th>
            <th>Note</th>
            <th style="width:36px"></th>
          </tr></thead><tbody>${rows}</tbody></table>
        </div>`}
      </div>`;
  });

  const grandNet = grandSell + grandCoupon - grandBuy - grandExpense;
  const showExp  = grandExpense > 0;

  container.innerHTML = toolbar + cards.join('') + `
    <div class="card" style="margin-top:4px">
      <div style="font-weight:700;margin-bottom:10px">Totale complessivo</div>
      <div class="table-wrap">
        <table><thead><tr>
          <th class="text-right">Acquisti</th>
          <th class="text-right">Vendite</th>
          <th class="text-right">Cedole</th>
          ${showExp ? '<th class="text-right">Spese</th>' : ''}
          <th class="text-right">Netto</th>
        </tr></thead><tbody><tr>
          <td class="text-right amount-expense">-${fmt.currency(grandBuy)}</td>
          <td class="text-right amount-income">+${fmt.currency(grandSell)}</td>
          <td class="text-right amount-income">+${fmt.currency(grandCoupon)}</td>
          ${showExp ? `<td class="text-right amount-expense">-${fmt.currency(grandExpense)}</td>` : ''}
          <td class="text-right" style="font-weight:700;color:${grandNet>=0?'var(--income)':'var(--expense)'}">
            ${grandNet>=0?'+':''}${fmt.currency(grandNet)}
          </td>
        </tr></tbody></table>
      </div>
    </div>`;
}

function renderPortfolioAnalisi(items) {
  const container = document.getElementById('pgPortfolioAnalisi');
  if (!container) return;

  const today     = new Date();
  const todayYear = today.getFullYear();

  const bonds = items.filter(i => i.asset_type === 'bond' && i.quantity > 0);

  if (!bonds.length) {
    container.innerHTML = '<div class="card" style="padding:32px;text-align:center;color:var(--txt3)">Nessun titolo obbligazionario in portafoglio.</div>';
    return;
  }

  // Usa il campo country se presente, normalizzato (trim + title case), altrimenti "Sconosciuto"
  const normCountry = s => s.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  const bondCountry = b => (b.country && b.country.trim()) ? normCountry(b.country) : 'Sconosciuto';

  const palette = [
    '#e05252','#52aee0','#52c47d','#e0c952','#b352e0',
    '#e07852','#52d4c4','#8fe052','#e052b3','#52b8e0',
    '#e0a352','#7d88e0','#c4e052','#e05290','#52e0d4'
  ];

  const countries = [...new Set(bonds.map(bondCountry))];
  const countryColor = Object.fromEntries(countries.map((c,i) => [c, palette[i % palette.length]]));

  // ── Chart 1: Esposizione per Paese ────────────────────────────────────
  const byCountry = {};
  bonds.forEach(b => {
    const c = bondCountry(b);
    byCountry[c] = (byCountry[c] || 0) + b.quantity;
  });
  const c1Sorted = Object.entries(byCountry).sort((a, b) => b[1] - a[1]);
  const c1Labels = c1Sorted.map(([c]) => c);
  const c1Data   = c1Sorted.map(([, v]) => v);
  const c1Colors = c1Labels.map(c => countryColor[c] || palette[0]);
  const c1Total  = c1Data.reduce((a,b) => a+b, 0);

  // ── Chart 2: Ripartizione per durata (stacked per Paese) ─────────────
  const durLabels = ['0 anni','1 anno','2 anni','3 anni','4 anni','5 anni','6 anni','Scaduto / N.D.'];
  const durData = {};
  countries.forEach(c => { durData[c] = new Array(8).fill(0); });
  bonds.forEach(b => {
    const c = bondCountry(b);
    let idx = 7;
    if (b.maturity_date) {
      const yearsLeft = (new Date(b.maturity_date) - today) / (365.25 * 24 * 3600 * 1000);
      if (yearsLeft >= 0) idx = Math.min(6, Math.floor(yearsLeft));
    }
    if (durData[c]) durData[c][idx] += b.quantity;
  });

  // ── Chart 3: Ladder cumulativa ────────────────────────────────────────
  const byYear = {};
  bonds.forEach(b => {
    if (!b.maturity_date) return;
    const y = new Date(b.maturity_date).getFullYear();
    byYear[y] = (byYear[y] || 0) + b.quantity;
  });
  const maxYear = Object.keys(byYear).length ? Math.max(...Object.keys(byYear).map(Number)) : todayYear + 1;
  const allYears = [];
  for (let y = todayYear; y <= maxYear; y++) allYears.push(y);
  let cumul = 0;
  const ladderData = allYears.map(y => { cumul += (byYear[y] || 0); return cumul; });
  // Nominale in scadenza per anno (per tooltip)
  const ladderDeltaByYear = allYears.map(y => byYear[y] || 0);

  // ── Chart 4: Cedole per mese ──────────────────────────────────────────
  const freqMap = { annual:1, semiannual:2, quarterly:4, monthly:12 };
  const months  = Array.from({length:12}, (_,i) => `${todayYear}-${String(i+1).padStart(2,'0')}`);
  const couponBonds = bonds.filter(b => b.coupon_rate > 0);
  const couponMonthData = {};
  couponBonds.forEach(b => {
    const freq     = freqMap[b.coupon_frequency] || 2;
    const matMonth = b.maturity_date ? new Date(b.maturity_date).getMonth() + 1 : 6;
    const matYear  = b.maturity_date ? new Date(b.maturity_date).getFullYear() : 9999;
    const interval = 12 / freq;
    const payMonths = new Set();
    for (let i = 0; i < freq; i++) {
      const m = ((matMonth - 1 - Math.round(i * interval)) % 12 + 12) % 12 + 1;
      payMonths.add(m);
    }
    const netPerPay = b.quantity * (b.coupon_rate / 100) * (1 - (b.coupon_tax || 12.5) / 100) / freq;
    const data = new Array(12).fill(0);
    payMonths.forEach(m => { if (matYear >= todayYear) data[m - 1] = netPerPay; });
    couponMonthData[b.ticker] = data;
  });

  // ── Chart 5: Cedole annue ─────────────────────────────────────────────
  const couponYears = allYears.length >= 2 ? allYears : [todayYear, todayYear + 1];
  const couponYearData = {};
  couponBonds.forEach(b => {
    const matYear   = b.maturity_date ? new Date(b.maturity_date).getFullYear() : todayYear + 10;
    const annualNet = b.quantity * (b.coupon_rate / 100) * (1 - (b.coupon_tax || 12.5) / 100);
    couponYearData[b.ticker] = couponYears.map(y => y <= matYear ? annualNet : 0);
  });

  // ── HTML ───────────────────────────────────────────────────────────────
  container.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:8px">
      <div class="card" style="padding:16px">
        <div style="font-weight:600;margin-bottom:12px">Esposizione per Paese</div>
        <canvas id="chAnPaese" style="max-height:340px"></canvas>
      </div>
      <div class="card" style="padding:16px">
        <div style="font-weight:600;margin-bottom:12px">Ripartizione per durata (stacked per Paese)</div>
        <canvas id="chAnDurata" style="max-height:340px"></canvas>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:2fr 3fr;gap:16px;margin-top:16px">
      <div class="card" style="padding:16px">
        <div style="font-weight:600;margin-bottom:12px">Ladder cumulativa (per anno)</div>
        <canvas id="chAnLadder" style="max-height:320px"></canvas>
      </div>
      <div class="card" style="padding:16px">
        <div style="font-weight:600;margin-bottom:12px">Incasso cedole per mese (stacked per ISIN)</div>
        <canvas id="chAnCedoleMese" style="max-height:320px"></canvas>
      </div>
    </div>
    <div style="margin-top:16px">
      <div class="card" style="padding:16px">
        <div style="font-weight:600;margin-bottom:12px">Cedole annue</div>
        <canvas id="chAnCedoleAnno" style="max-height:320px"></canvas>
      </div>
    </div>`;

  const txtColor    = getComputedStyle(document.documentElement).getPropertyValue('--txt1').trim() || '#ccc';
  const txt2Color   = getComputedStyle(document.documentElement).getPropertyValue('--txt2').trim() || '#aaa';
  const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || '#333';
  const SEP         = '─'.repeat(22);

  // Plugin inline per data labels (donut → %, bar → valore, line → valore sopra punto)
  let _pdlSeq = 0;
  const makeDataLabels = () => ({
    id: '_pdl_' + (++_pdlSeq),
    afterDatasetsDraw(chart) {
      const ctx  = chart.ctx;
      const type = chart.config.type;
      chart.data.datasets.forEach((ds, di) => {
        const meta = chart.getDatasetMeta(di);
        if (meta.hidden) return;
        meta.data.forEach((el, idx) => {
          const val = ds.data[idx];
          if (!val || val === 0) return;
          ctx.save();
          ctx.textAlign = 'center';
          if (type === 'doughnut') {
            const total = chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
            const mid   = (el.startAngle + el.endAngle) / 2;
            const r     = (el.innerRadius + el.outerRadius) / 2;
            if ((el.endAngle - el.startAngle) * r < 28) { ctx.restore(); return; }
            ctx.font = 'bold 10px Segoe UI,sans-serif';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#fff';
            ctx.shadowColor = 'rgba(0,0,0,.55)';
            ctx.shadowBlur  = 3;
            ctx.fillText(((val / total) * 100).toFixed(1) + '%',
              el.x + r * Math.cos(mid), el.y + r * Math.sin(mid));
          } else if (type === 'bar') {
            const segH = Math.abs(el.base - el.y);
            if (segH < 14) { ctx.restore(); return; }
            ctx.font = 'bold 9px Segoe UI,sans-serif';
            ctx.textBaseline = 'middle';
            const text = fmt.currency(val);
            if (ctx.measureText(text).width > Math.abs(el.width) - 6) { ctx.restore(); return; }
            ctx.fillStyle = '#fff';
            ctx.shadowColor = 'rgba(0,0,0,.55)';
            ctx.shadowBlur  = 3;
            ctx.fillText(text, el.x, (el.y + el.base) / 2);
          } else if (type === 'line') {
            ctx.font = 'bold 9px Segoe UI,sans-serif';
            ctx.textBaseline = 'bottom';
            ctx.fillStyle = txt2Color;
            ctx.shadowColor = 'rgba(0,0,0,.3)';
            ctx.shadowBlur  = 2;
            ctx.fillText(fmt.currency(val), el.x, el.y - 5);
          }
          ctx.restore();
        });
      });
    }
  });

  const axisOpts = (stacked = false) => ({
    x: { stacked, ticks: { color: txt2Color, maxRotation: 45 }, grid: { color: borderColor } },
    y: { stacked, ticks: { color: txt2Color, callback: v => fmt.currency(v) }, grid: { color: borderColor } }
  });

  // Tooltip helper per stacked bar / line: totale IN CIMA, poi lista valori
  const stackedTooltip = (extraFooter) => ({
    mode: 'index',
    intersect: false,
    callbacks: {
      beforeBody: items => {
        const visible = items.filter(i => i.parsed.y !== 0);
        if (!visible.length) return [];
        const total = visible.reduce((s,i) => s + i.parsed.y, 0);
        const lines = [`Totale: ${fmt.currency(total)}`, SEP];
        if (extraFooter) lines.push(...extraFooter(items));
        return lines;
      },
      label: ctx => ctx.parsed.y !== 0 ? ` ${ctx.dataset.label}: ${fmt.currency(ctx.parsed.y)}` : null,
    }
  });

  // Chart 1: Donut — vignetta con tutti i valori + totale
  new Chart(document.getElementById('chAnPaese'), {
    type: 'doughnut',
    plugins: [makeDataLabels()],
    data: { labels: c1Labels, datasets: [{ data: c1Data, backgroundColor: c1Colors, borderWidth: 1 }] },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { color: txtColor, font: { size: 11 }, padding: 8 } },
        tooltip: {
          callbacks: {
            label:     ctx => ` ${ctx.label}: ${fmt.currency(ctx.parsed)} (${((ctx.parsed/c1Total)*100).toFixed(1)}%)`,
            afterBody: () => [SEP],
            footer:    ()  => [`Totale: ${fmt.currency(c1Total)}`]
          }
        }
      }
    }
  });

  // Chart 2: Stacked bar – durata
  new Chart(document.getElementById('chAnDurata'), {
    type: 'bar',
    plugins: [makeDataLabels()],
    data: {
      labels: durLabels,
      datasets: countries.map(c => ({ label: c, data: durData[c], backgroundColor: countryColor[c], stack: 'st' }))
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: txtColor, font: { size: 11 } } },
        tooltip: stackedTooltip()
      },
      scales: axisOpts(true)
    }
  });

  // Chart 3: Ladder cumulativa
  new Chart(document.getElementById('chAnLadder'), {
    type: 'line',
    plugins: [makeDataLabels()],
    data: {
      labels: allYears,
      datasets: [{ label: 'Nominale cumulativo', data: ladderData, borderColor: '#58a6ff',
        backgroundColor: 'rgba(88,166,255,0.15)', fill: true, tension: 0.3, pointRadius: 5 }]
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label:  ctx => ` Cumulativo: ${fmt.currency(ctx.parsed.y)}`,
            footer: items => {
              const idx   = items[0]?.dataIndex ?? -1;
              const delta = idx >= 0 ? ladderDeltaByYear[idx] : 0;
              return delta > 0 ? [SEP, `In scadenza: ${fmt.currency(delta)}`] : [];
            }
          }
        }
      },
      scales: axisOpts()
    }
  });

  // Chart 4: Cedole per mese
  const tkList = Object.keys(couponMonthData);
  new Chart(document.getElementById('chAnCedoleMese'), {
    type: 'bar',
    plugins: [makeDataLabels()],
    data: {
      labels: months,
      datasets: tkList.map((tk, i) => ({ label: tk, data: couponMonthData[tk], backgroundColor: palette[i % palette.length], stack: 'st' }))
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: txtColor, font: { size: 10 } } },
        tooltip: stackedTooltip()
      },
      scales: axisOpts(true)
    }
  });

  // Chart 5: Cedole annue
  const tkYList = Object.keys(couponYearData);
  new Chart(document.getElementById('chAnCedoleAnno'), {
    type: 'bar',
    plugins: [makeDataLabels()],
    data: {
      labels: couponYears,
      datasets: tkYList.map((tk, i) => ({ label: tk, data: couponYearData[tk], backgroundColor: palette[i % palette.length], stack: 'st' }))
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: txtColor, font: { size: 10 } } },
        tooltip: stackedTooltip()
      },
      scales: axisOpts(true)
    }
  });
}

async function showBuyModal(portfolioId, investAccounts, allAccounts) {
  if (!investAccounts || !allAccounts) {
    const accounts = await api.getAccounts();
    investAccounts = accounts.filter(a => a.type === 'investment' && !a.is_closed);
    allAccounts = accounts;
  }
  const regularAccounts = allAccounts.filter(a => a.type !== 'investment' && !a.is_closed);
  const today = _todayStr();

  // If buying more of existing position, pre-fill ticker/name
  let prefillTicker = '', prefillName = '', prefillAccountId = '';
  let prefillAssetType = 'equity', prefillFaceValue = 1;
  let prefillMaturity = '', prefillCouponRate = '', prefillCouponFreq = 'semiannual', prefillCouponTax = 12.5;
  if (portfolioId) {
    const items = await api.getPortfolio();
    const pos = items.find(i => i.id === portfolioId);
    if (pos) {
      prefillTicker     = pos.ticker; prefillName = pos.name; prefillAccountId = pos.account_id;
      prefillAssetType  = pos.asset_type || 'equity';
      prefillFaceValue  = pos.face_value || 1;
      prefillMaturity   = pos.maturity_date || '';
      prefillCouponRate = pos.coupon_rate || '';
      prefillCouponFreq = pos.coupon_frequency || 'semiannual';
      prefillCouponTax  = pos.coupon_tax != null ? pos.coupon_tax : 12.5;
    }
  }

  const isBondPrefill = prefillAssetType === 'bond';

  const body = `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Tipo titolo *</label>
        <div class="theme-toggle-group" style="width:100%">
          <button type="button" id="b_type_equity" class="btn theme-btn ${!isBondPrefill?'theme-btn-active':''}" onclick="_setBuyType('equity')" ${prefillTicker?'disabled':''}>📈 Azionario</button>
          <button type="button" id="b_type_bond"   class="btn theme-btn ${isBondPrefill?'theme-btn-active':''}"  onclick="_setBuyType('bond')"   ${prefillTicker?'disabled':''}>📄 Obbligazionario</button>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Conto investimento *</label>
        <select class="form-control" id="b_inv_account">
          ${investAccounts.map(a=>`<option value="${a.id}" ${String(a.id)===String(prefillAccountId)?'selected':''}>${a.icon} ${a.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Ticker *</label>
        <input class="form-control" id="b_ticker" placeholder="Es. AAPL / IT0001234567" value="${prefillTicker}" style="text-transform:uppercase" ${prefillTicker?'readonly':''}>
      </div>
      <div class="form-group">
        <label class="form-label">Nome *</label>
        <input class="form-control" id="b_name" placeholder="Es. Apple Inc." value="${prefillName}" ${prefillName?'readonly':''}>
      </div>
    </div>
    <!-- Campi specifici obbligazione -->
    <div id="b_bond_fields" style="display:${isBondPrefill?'block':'none'}">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Data scadenza</label>
          <input type="date" class="form-control" id="b_maturity" value="${prefillMaturity}">
        </div>
        <div class="form-group">
          <label class="form-label">Tasso cedola (%/anno)</label>
          <input type="text" inputmode="decimal" class="form-control" id="b_coupon_rate" placeholder="Es. 4,5" value="${prefillCouponRate}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Frequenza cedola</label>
          <select class="form-control" id="b_coupon_freq">
            <option value="annual"     ${prefillCouponFreq==='annual'?'selected':''}>Annuale</option>
            <option value="semiannual" ${prefillCouponFreq==='semiannual'||!prefillCouponFreq?'selected':''}>Semestrale</option>
            <option value="quarterly"  ${prefillCouponFreq==='quarterly'?'selected':''}>Trimestrale</option>
            <option value="monthly"    ${prefillCouponFreq==='monthly'?'selected':''}>Mensile</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Tassazione cedola (%)</label>
          <input type="text" inputmode="decimal" class="form-control" id="b_coupon_tax"
                 value="${prefillCouponTax}" placeholder="12,5">
        </div>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Paga da *</label>
        <select class="form-control" id="b_from_account">
          <option value="">— Seleziona conto —</option>
          ${regularAccounts.map(a=>`<option value="${a.id}">${a.icon} ${a.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Data *</label>
        <input type="date" class="form-control" id="b_date" value="${today}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label" id="b_qty_label">Nominale (€) *</label>
        <input type="text" inputmode="decimal" class="form-control" id="b_qty" placeholder="Es. 10000">
      </div>
      <div class="form-group">
        <label class="form-label" id="b_price_label">Prezzo (€) *</label>
        <input type="text" inputmode="decimal" class="form-control" id="b_price" placeholder="Es. 0,13">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Commissioni (€)</label>
        <input type="text" inputmode="decimal" class="form-control" id="b_comm" placeholder="0">
      </div>
      <div class="form-group">
        <label class="form-label">Totale (incl. comm.)</label>
        <input type="text" class="form-control" id="b_total" readonly placeholder="—" style="background:var(--bg3)">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Note</label>
      <input class="form-control" id="b_notes" placeholder="Opzionale">
    </div>`;

  openModal('Acquisto Titolo', body, async () => {
    const assetType = document.getElementById('b_type_bond')?.classList.contains('theme-btn-active') ? 'bond' : 'equity';
    const isBond    = assetType === 'bond';
    const data = {
      account_id:      parseInt(document.getElementById('b_inv_account').value),
      from_account_id: parseInt(document.getElementById('b_from_account').value),
      ticker:          document.getElementById('b_ticker').value.trim().toUpperCase(),
      name:            document.getElementById('b_name').value.trim(),
      quantity:        evalAmount(document.getElementById('b_qty').value),
      price:           evalAmount(document.getElementById('b_price').value),
      date:            document.getElementById('b_date').value,
      notes:           document.getElementById('b_notes').value.trim() || null,
      commissions:     evalAmount(document.getElementById('b_comm')?.value) || 0,
      asset_type:      assetType,
      face_value:      1,
      maturity_date:   isBond ? (document.getElementById('b_maturity')?.value || null) : null,
      coupon_rate:     isBond ? (parseFloat((document.getElementById('b_coupon_rate')?.value||'').replace(',','.')) || 0) : 0,
      coupon_frequency:isBond ? (document.getElementById('b_coupon_freq')?.value || null) : null,
      coupon_tax:      isBond ? (parseFloat((document.getElementById('b_coupon_tax')?.value||'').replace(',','.')) ?? 12.5) : 0,
    };
    if (!data.account_id)      { toast('Seleziona il conto investimento','error'); return; }
    if (!data.from_account_id) { toast('Seleziona il conto da cui pagare','error'); return; }
    if (!data.ticker)          { toast('Inserisci il ticker','error'); return; }
    if (!data.name)            { toast('Inserisci il nome del titolo','error'); return; }
    if (!data.quantity || data.quantity <= 0) { toast('Inserisci una quantità valida','error'); return; }
    if (!data.price || data.price <= 0)       { toast('Inserisci un prezzo valido','error'); return; }
    try {
      await api.buyStock(data);
      closeModal();
      toast('Acquisto registrato');
      renderPortfolio();
    } catch(e) { toast(e.message,'error'); }
  });

  // Toggle bond fields
  window._setBuyType = (type) => {
    const isBond = type === 'bond';
    document.getElementById('b_type_equity')?.classList.toggle('theme-btn-active', !isBond);
    document.getElementById('b_type_bond')?.classList.toggle('theme-btn-active', isBond);
    const bondFields = document.getElementById('b_bond_fields');
    if (bondFields) bondFields.style.display = isBond ? 'block' : 'none';
    const qtyLabel   = document.getElementById('b_qty_label');
    const priceLabel = document.getElementById('b_price_label');
    if (qtyLabel)   qtyLabel.textContent   = isBond ? 'Nominale (€) *'       : 'Quantità *';
    if (priceLabel) priceLabel.textContent = isBond ? 'Prezzo regolamento (%) *' : 'Prezzo unitario (€) *';
    calcTotal();
  };

  // Live total calculation
  const calcTotal = () => {
    const q      = evalAmount(document.getElementById('b_qty')?.value)||0;
    const p      = evalAmount(document.getElementById('b_price')?.value)||0;
    const c      = evalAmount(document.getElementById('b_comm')?.value)||0;
    const isBond = document.getElementById('b_type_bond')?.classList.contains('theme-btn-active');
    const total  = (isBond ? q * p / 100 : q * p) + c;
    const t = document.getElementById('b_total');
    if (t) t.value = q && p ? fmt.currency(total) : '—';
  };
  setTimeout(() => {
    document.getElementById('b_qty')?.addEventListener('input', calcTotal);
    document.getElementById('b_price')?.addEventListener('input', calcTotal);
    document.getElementById('b_comm')?.addEventListener('input', calcTotal);
  }, 50);
}

async function showImportModal(investAccounts) {
  const body = `
    <div class="settings-hint" style="margin-bottom:14px">
      Carica una posizione già in tuo possesso senza creare movimenti bancari.
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Tipo titolo *</label>
        <div class="theme-toggle-group" style="width:100%">
          <button type="button" id="ip_type_equity" class="btn theme-btn theme-btn-active" onclick="_setImportType('equity')">📈 Azionario</button>
          <button type="button" id="ip_type_bond"   class="btn theme-btn"                  onclick="_setImportType('bond')">📄 Obbligazionario</button>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Conto investimento *</label>
        <select class="form-control" id="ip_account">
          ${investAccounts.map(a=>`<option value="${a.id}">${a.icon} ${a.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Ticker *</label>
        <input class="form-control" id="ip_ticker" placeholder="Es. ENI.MI / IT0001234567" style="text-transform:uppercase">
      </div>
      <div class="form-group">
        <label class="form-label">Nome titolo *</label>
        <input class="form-control" id="ip_name" placeholder="Es. Eni SpA">
      </div>
    </div>
    <!-- Campi specifici obbligazione -->
    <div id="ip_bond_fields" style="display:none">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Data scadenza</label>
          <input type="date" class="form-control" id="ip_maturity">
        </div>
        <div class="form-group">
          <label class="form-label">Tasso cedola (%/anno)</label>
          <input type="text" inputmode="decimal" class="form-control" id="ip_coupon_rate" placeholder="Es. 4,5">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Frequenza cedola</label>
          <select class="form-control" id="ip_coupon_freq">
            <option value="annual">Annuale</option>
            <option value="semiannual" selected>Semestrale</option>
            <option value="quarterly">Trimestrale</option>
            <option value="monthly">Mensile</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Tassazione cedola (%)</label>
          <input type="text" inputmode="decimal" class="form-control" id="ip_coupon_tax" value="12.5" placeholder="12,5">
        </div>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label" id="ip_qty_label">Quantità *</label>
        <input type="text" inputmode="decimal" class="form-control" id="ip_qty" placeholder="Es. 10">
      </div>
      <div class="form-group">
        <label class="form-label" id="ip_price_label">Prezzo pagato (€) *</label>
        <input type="text" inputmode="decimal" class="form-control" id="ip_price" placeholder="Es. 0,13">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Commissioni totali (€)</label>
        <input type="text" inputmode="decimal" class="form-control" id="ip_comm" placeholder="0">
      </div>
      <div class="form-group">
        <label class="form-label" id="ip_avg_label">Prezzo medio effettivo</label>
        <input type="text" class="form-control" id="ip_avg" style="background:var(--bg3)" readonly
               placeholder="Calcolato automaticamente">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label" id="ip_cur_label">Prezzo attuale (€)</label>
        <input type="text" inputmode="decimal" class="form-control" id="ip_cur" placeholder="Opzionale">
      </div>
      <div class="form-group">
        <label class="form-label">Note</label>
        <input class="form-control" id="ip_notes" placeholder="Opzionale">
      </div>
    </div>`;

  openModal('Carica posizione esistente', body, async () => {
    const isBond = document.getElementById('ip_type_bond')?.classList.contains('theme-btn-active');
    const qty    = evalAmount(document.getElementById('ip_qty').value);
    const price  = evalAmount(document.getElementById('ip_price').value);
    const comm   = evalAmount(document.getElementById('ip_comm').value) || 0;
    // Per bond: qty = nominale €, prezzo in %, comm in € → avg% = price + (comm/qty)*100
    // Per equity: avg = (qty*price + comm) / qty
    const avg    = qty && price ? (isBond ? price + (comm / qty) * 100 : (qty * price + comm) / qty) : NaN;
    const cur    = evalAmount(document.getElementById('ip_cur').value) || null;
    const data  = {
      account_id:       parseInt(document.getElementById('ip_account').value),
      ticker:           document.getElementById('ip_ticker').value.trim().toUpperCase(),
      name:             document.getElementById('ip_name').value.trim(),
      quantity:         qty,
      avg_price:        avg,
      current_price:    cur,
      notes:            document.getElementById('ip_notes').value.trim() || null,
      commissions:      comm,
      asset_type:       isBond ? 'bond' : 'equity',
      face_value:       1,
      maturity_date:    isBond ? (document.getElementById('ip_maturity')?.value || null) : null,
      coupon_rate:      isBond ? (parseFloat((document.getElementById('ip_coupon_rate')?.value||'').replace(',','.')) || 0) : 0,
      coupon_frequency: isBond ? (document.getElementById('ip_coupon_freq')?.value || null) : null,
      coupon_tax:       isBond ? (parseFloat((document.getElementById('ip_coupon_tax')?.value||'').replace(',','.')) ?? 12.5) : 0,
    };
    if (!data.ticker)              { toast('Inserisci il ticker','error'); return; }
    if (!data.name)                { toast('Inserisci il nome','error'); return; }
    if (!qty   || qty   <= 0)      { toast('Inserisci un nominale/quantità valido','error'); return; }
    if (!price || price <= 0)      { toast('Inserisci un prezzo valido','error'); return; }
    try {
      await api.importPosition(data);
      closeModal();
      toast('Posizione caricata');
      renderPortfolio();
    } catch(e) { toast(e.message,'error'); }
  });

  window._setImportType = (type) => {
    const isBond = type === 'bond';
    document.getElementById('ip_type_equity')?.classList.toggle('theme-btn-active', !isBond);
    document.getElementById('ip_type_bond')?.classList.toggle('theme-btn-active', isBond);
    const bondFields = document.getElementById('ip_bond_fields');
    if (bondFields) bondFields.style.display = isBond ? 'block' : 'none';
    const ql = document.getElementById('ip_qty_label');
    if (ql) ql.textContent = isBond ? 'Nominale (€) *' : 'Quantità *';
    const pl = document.getElementById('ip_price_label');
    if (pl) pl.textContent = isBond ? 'Prezzo di regolamento (%) *' : 'Prezzo pagato (€) *';
    const al = document.getElementById('ip_avg_label');
    if (al) al.textContent = isBond ? 'Prezzo medio effettivo (%)' : 'Prezzo medio effettivo (€)';
    const cl = document.getElementById('ip_cur_label');
    if (cl) cl.textContent = isBond ? 'Prezzo attuale (%)' : 'Prezzo attuale (€)';
    calcAvg();
  };

  // Calcola prezzo medio al cambio di qty/prezzo/commissioni
  const calcAvg = () => {
    const isBond = document.getElementById('ip_type_bond')?.classList.contains('theme-btn-active');
    const q  = evalAmount(document.getElementById('ip_qty')?.value)   || 0;
    const p  = evalAmount(document.getElementById('ip_price')?.value) || 0;
    const c  = evalAmount(document.getElementById('ip_comm')?.value)  || 0;
    const el = document.getElementById('ip_avg');
    if (!el) return;
    if (!q || !p) { el.value = ''; return; }
    if (isBond) {
      // avg% = prezzo% + (commissioni€ / nominale€) * 100
      el.value = (p + (c / q) * 100).toFixed(4) + ' %';
    } else {
      el.value = ((q * p + c) / q).toFixed(5) + ' €';
    }
  };
  setTimeout(() => {
    ['ip_qty','ip_price','ip_comm'].forEach(id =>
      document.getElementById(id)?.addEventListener('input', calcAvg));
  }, 50);
}

async function showSellModal(portfolioId) {
  const [items, accounts] = await Promise.all([api.getPortfolio(), api.getAccounts()]);
  const pos = items.find(i => i.id === portfolioId);
  if (!pos) return;
  const regularAccounts = accounts.filter(a => a.type !== 'investment' && !a.is_closed);
  const today = _todayStr();
  const isBond = pos.asset_type === 'bond';
  const avgDisplay = isBond ? `${(pos.avg_price||0).toFixed(4)} %` : fmt.price(pos.avg_price);
  const qtyLabel   = isBond ? 'Nominale da vendere (€) *' : 'Quantità *';
  const priceLabel = isBond ? 'Prezzo di regolamento (%) *' : 'Prezzo vendita (€) *';
  const defaultSellPrice = pos.current_price || pos.avg_price;

  const body = `
    <div style="background:var(--bg3);border-radius:6px;padding:10px 14px;margin-bottom:16px;font-size:13px">
      <strong>${pos.ticker}</strong> — ${pos.name}
      ${isBond?`<span class="badge" style="background:#d29922;color:#fff;font-size:10px;padding:1px 5px;border-radius:4px;margin-left:6px">OBB</span>`:''}
      <br>${isBond?'Nominale disponibile':'Quantità disponibile'}: <strong>${isBond?fmt.currency(pos.quantity):pos.quantity}</strong> &nbsp;|&nbsp; Prezzo medio: <strong>${avgDisplay}</strong>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Accredita su *</label>
        <select class="form-control" id="s_to_account">
          <option value="">— Seleziona conto —</option>
          ${regularAccounts.map(a=>`<option value="${a.id}">${a.icon} ${a.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Data *</label>
        <input type="date" class="form-control" id="s_date" value="${today}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">${qtyLabel}</label>
        <input type="text" inputmode="decimal" class="form-control" id="s_qty" placeholder="Max ${isBond?fmt.currency(pos.quantity):pos.quantity}">
      </div>
      <div class="form-group">
        <label class="form-label">${priceLabel}</label>
        <input type="text" inputmode="decimal" class="form-control" id="s_price" value="${defaultSellPrice}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Commissioni (€)</label>
        <input type="text" inputmode="decimal" class="form-control" id="s_commission" placeholder="0,00">
      </div>
      <div class="form-group"></div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Totale incasso lordo</label>
        <input type="text" class="form-control" id="s_total" readonly style="background:var(--bg3)">
      </div>
      <div class="form-group">
        <label class="form-label">P&L stimato (netto comm.)</label>
        <input type="text" class="form-control" id="s_pnl" readonly style="background:var(--bg3)">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Note</label>
      <input class="form-control" id="s_notes" placeholder="Opzionale">
    </div>`;

  openModal('Vendita Titolo', body, async () => {
    const commission = evalAmount(document.getElementById('s_commission').value) || 0;
    const data = {
      portfolio_id:  portfolioId,
      to_account_id: parseInt(document.getElementById('s_to_account').value),
      quantity:      evalAmount(document.getElementById('s_qty').value),
      price:         evalAmount(document.getElementById('s_price').value),
      date:          document.getElementById('s_date').value,
      notes:         document.getElementById('s_notes').value.trim() || null,
      commission:    commission > 0 ? commission : null,
    };
    if (!data.to_account_id)            { toast('Seleziona il conto di accredito','error'); return; }
    if (!data.quantity || data.quantity <= 0) { toast('Inserisci una quantità valida','error'); return; }
    if (data.quantity > pos.quantity)    { toast('Quantità superiore alla disponibile','error'); return; }
    if (!data.price || data.price <= 0)  { toast('Inserisci un prezzo valido','error'); return; }
    try {
      await api.sellStock(data);
      closeModal();
      const msg = commission > 0 ? `Vendita registrata (comm. ${fmt.currency(commission)})` : 'Vendita registrata';
      toast(msg);
      renderPortfolio();
      if (currentPage === 'dashboard') renderDashboard();
    } catch(e) { toast(e.message,'error'); }
  });

  const calcSell = () => {
    const q    = evalAmount(document.getElementById('s_qty')?.value) || 0;
    const p    = evalAmount(document.getElementById('s_price')?.value) || 0;
    const comm = evalAmount(document.getElementById('s_commission')?.value) || 0;
    // Bond: q = nominale €, p = prezzo% → valore = q*p/100
    const totalVal = isBond ? q * p / 100 : q * p;
    const costVal  = isBond ? q * pos.avg_price / 100 : q * pos.avg_price;
    const pnl      = q && p ? totalVal - costVal - comm : null;
    const totalEl  = document.getElementById('s_total');
    const pnlEl    = document.getElementById('s_pnl');
    if (totalEl) totalEl.value = q && p ? fmt.currency(totalVal) : '—';
    if (pnlEl) {
      pnlEl.value = pnl != null ? fmt.currency(pnl) : '—';
      pnlEl.style.color = pnl != null ? (pnl >= 0 ? 'var(--income)' : 'var(--expense)') : '';
    }
  };
  setTimeout(() => {
    document.getElementById('s_qty')?.addEventListener('input', calcSell);
    document.getElementById('s_price')?.addEventListener('input', calcSell);
    document.getElementById('s_commission')?.addEventListener('input', calcSell);
    calcSell();
  }, 50);
}

async function showCouponModal(portfolioId) {
  const [items, accounts] = await Promise.all([api.getPortfolio(), api.getAccounts()]);
  const pos = items.find(i => i.id === portfolioId);
  if (!pos) return;
  const regularAccounts = accounts.filter(a => a.type !== 'investment' && !a.is_closed);
  const today = _todayStr();
  // quantity = nominale totale €, coupon_rate = % annuo
  const freqDivisor = { annual:1, semiannual:2, quarterly:4, monthly:12 };
  const freqLabel   = { annual:'annuale', semiannual:'semestrale', quarterly:'trimestrale', monthly:'mensile' };
  const div       = freqDivisor[pos.coupon_frequency] || 1;
  const taxRate   = pos.coupon_tax != null ? pos.coupon_tax : 12.5;
  // Cedola lorda = nominale × tasso% / 100 / divisore_frequenza
  const grossCoupon = pos.quantity * (pos.coupon_rate / 100) / div;
  const taxAmount   = grossCoupon * taxRate / 100;
  const netCoupon   = grossCoupon - taxAmount;

  const body = `
    <div style="background:var(--bg3);border-radius:6px;padding:10px 14px;margin-bottom:16px;font-size:13px">
      <strong>${pos.ticker}</strong> — ${pos.name}<br>
      Nominale: <strong>${fmt.currency(pos.quantity)}</strong> &nbsp;|&nbsp;
      Tasso: <strong>${pos.coupon_rate}%</strong> &nbsp;|&nbsp;
      Freq.: <strong>${freqLabel[pos.coupon_frequency]||'—'}</strong> &nbsp;|&nbsp;
      Tassazione: <strong>${taxRate}%</strong>
    </div>
    ${pos.coupon_rate ? `
    <div style="background:var(--bg3);border-radius:6px;padding:8px 14px;margin-bottom:14px;font-size:12px;display:flex;gap:24px">
      <div>Lordo: <strong>${fmt.currency(grossCoupon)}</strong></div>
      <div>Ritenuta (${taxRate}%): <strong style="color:var(--expense)">− ${fmt.currency(taxAmount)}</strong></div>
      <div>Netto: <strong style="color:var(--income)">${fmt.currency(netCoupon)}</strong></div>
    </div>` : ''}
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Accredita su *</label>
        <select class="form-control" id="c_account">
          <option value="">— Seleziona conto —</option>
          ${regularAccounts.map(a=>`<option value="${a.id}">${a.icon} ${a.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Data pagamento *</label>
        <input type="date" class="form-control" id="c_date" value="${today}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Importo lordo (€) *</label>
        <input type="text" inputmode="decimal" class="form-control" id="c_gross"
               value="${grossCoupon.toFixed(2)}" placeholder="${grossCoupon.toFixed(2)}">
      </div>
      <div class="form-group">
        <label class="form-label">Tassazione (%)</label>
        <input type="text" inputmode="decimal" class="form-control" id="c_tax_rate"
               value="${taxRate}" placeholder="12,5">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Ritenuta (€)</label>
        <input type="text" class="form-control" id="c_tax_amt" readonly style="background:var(--bg3)">
      </div>
      <div class="form-group">
        <label class="form-label">Importo netto accreditato (€)</label>
        <input type="text" class="form-control" id="c_net" readonly style="background:var(--bg3);font-weight:700;color:var(--income)">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Note</label>
      <input class="form-control" id="c_notes" placeholder="Es. Cedola semestrale">
    </div>`;

  openModal('Registra Cedola', body, async () => {
    const gross  = parseFloat((document.getElementById('c_gross').value||'').replace(',','.'));
    const taxPct = parseFloat((document.getElementById('c_tax_rate').value||'').replace(',','.')) || 0;
    const net    = gross * (1 - taxPct / 100);
    const data = {
      portfolio_id: portfolioId,
      account_id:   parseInt(document.getElementById('c_account').value),
      amount:       net,   // registriamo il netto come income
      date:         document.getElementById('c_date').value,
      notes:        document.getElementById('c_notes').value.trim() ||
                    `Cedola ${pos.ticker} — lordo ${fmt.currency(gross)}, ritenuta ${taxPct}%`,
    };
    if (!data.account_id)           { toast('Seleziona il conto di accredito','error'); return; }
    if (!gross || gross <= 0)        { toast('Inserisci un importo lordo valido','error'); return; }
    try {
      await api.registerCoupon(data);
      closeModal();
      toast(`Cedola registrata — netto ${fmt.currency(net)}`);
      renderPortfolio();
    } catch(e) { toast(e.message,'error'); }
  });

  // Calcolo live lordo/ritenuta/netto
  const calcCoupon = () => {
    const g  = parseFloat((document.getElementById('c_gross')?.value||'').replace(',','.')) || 0;
    const t  = parseFloat((document.getElementById('c_tax_rate')?.value||'').replace(',','.')) || 0;
    const ta = g * t / 100;
    const n  = g - ta;
    const taxEl = document.getElementById('c_tax_amt');
    const netEl = document.getElementById('c_net');
    if (taxEl) taxEl.value = g ? fmt.currency(ta) : '';
    if (netEl) netEl.value = g ? fmt.currency(n) : '';
  };
  setTimeout(() => {
    document.getElementById('c_gross')?.addEventListener('input', calcCoupon);
    document.getElementById('c_tax_rate')?.addEventListener('input', calcCoupon);
    calcCoupon();
  }, 50);
}

async function showExpenseModal(portfolioId) {
  const [items, accounts, categories] = await Promise.all([api.getPortfolio(), api.getAccounts(), api.getCategories()]);
  const pos = items.find(i => i.id === portfolioId);
  if (!pos) return;
  const regularAccounts = accounts.filter(a => a.type !== 'investment' && !a.is_closed);
  const expCats = categories.filter(c => c.type === 'expense');
  const today = _todayStr();

  const optLabel = c => `${c.parent_name ? c.parent_name + ' › ' : ''}${c.icon || ''} ${c.name}`;
  const catOptions = expCats.map(c => `<option value="${c.id}">${optLabel(c)}</option>`).join('');

  const body = `
    <div style="background:var(--bg3);border-radius:6px;padding:8px 14px;margin-bottom:14px;font-size:13px">
      <strong>${pos.ticker}</strong> — ${pos.name}
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Tipo spesa *</label>
        <input class="form-control" id="ex_label" placeholder="es. Tobin Tax, Commissione, Ritenuta" value="Tobin Tax">
      </div>
      <div class="form-group">
        <label class="form-label">Data *</label>
        <input type="date" class="form-control" id="ex_date" value="${today}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Addebita da *</label>
        <select class="form-control" id="ex_account">
          <option value="">— Seleziona conto —</option>
          ${regularAccounts.map(a=>`<option value="${a.id}">${a.icon} ${a.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Importo (€) *</label>
        <input type="text" inputmode="decimal" class="form-control" id="ex_amount" placeholder="0,00">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Categoria</label>
        <select class="form-control" id="ex_cat">
          <option value="">— Nessuna —</option>
          ${catOptions}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Note</label>
        <input class="form-control" id="ex_notes" placeholder="Facoltativo">
      </div>
    </div>`;

  openModal('Registra Spesa', body, async () => {
    const label  = document.getElementById('ex_label').value.trim();
    const amount = parseFloat((document.getElementById('ex_amount').value||'').replace(',','.'));
    const catId  = parseInt(document.getElementById('ex_cat').value) || null;
    const data = {
      portfolio_id: portfolioId,
      account_id:   parseInt(document.getElementById('ex_account').value),
      amount,
      date:         document.getElementById('ex_date').value,
      label:        label || 'Spesa',
      notes:        document.getElementById('ex_notes').value.trim() || null,
      category_id:  catId,
    };
    if (!data.account_id)       { toast('Seleziona il conto di addebito','error'); return; }
    if (!amount || amount <= 0) { toast('Inserisci un importo valido','error'); return; }
    if (!data.date)             { toast('Inserisci la data','error'); return; }
    try {
      await api.registerPortfolioExpense(data);
      closeModal();
      toast(`Spesa registrata — ${fmt.currency(amount)}`);
      renderPortfolio();
    } catch(e) { toast(e.message,'error'); }
  });
}

async function showPortfolioHistory(portfolioId) {
  const [txs, items] = await Promise.all([
    api.getPortfolioTransactions(portfolioId),
    api.getPortfolio()
  ]);
  const pos = items.find(i => i.id === portfolioId);
  const body = `
    <div style="font-weight:600;margin-bottom:12px">${pos?.ticker} — ${pos?.name}</div>
    <div class="table-wrap">
      <table style="font-size:12px"><thead><tr>
        <th>Data</th><th>Tipo</th><th>Quantità</th><th>Prezzo</th><th class="text-right">Totale</th>
      </tr></thead><tbody>
      ${txs.length ? (() => {
        const sorted = [...txs].sort((a,b)=>a.date.localeCompare(b.date));
        let grandTotal = 0;
        const rows = sorted.map(t=>{
          const isBuy     = t.type === 'buy';
          const isCoupon  = t.type === 'coupon';
          const isExpense = t.type === 'expense';
          const color = isBuy || isExpense ? 'var(--expense)' : 'var(--income)';
          const label = isBuy ? 'Acquisto' : isCoupon ? 'Cedola' : isExpense ? (t.notes || 'Spesa') : 'Vendita';
          const sign  = isBuy || isExpense ? -1 : 1;
          const total = (isCoupon || isExpense) ? t.price : t.quantity * t.price;
          grandTotal += sign * total;
          return `<tr>
            <td>${t.date}</td>
            <td><span style="color:${color};font-weight:600">${label}</span></td>
            <td>${(isCoupon || isExpense) ? '—' : t.quantity}</td>
            <td>${(isCoupon || isExpense) ? '—' : fmt.price(t.price)}</td>
            <td class="text-right" style="color:${color}">${sign<0?'-':'+'} ${fmt.currency(total)}</td>
          </tr>`;
        }).join('');
        const totColor = grandTotal <= 0 ? 'var(--expense)' : 'var(--income)';
        const totRow = `<tr style="border-top:2px solid var(--border)">
          <td colspan="4" style="font-weight:700;padding-top:6px">Totale</td>
          <td class="text-right" style="font-weight:700;color:${totColor};padding-top:6px">${grandTotal<=0?'-':'+'} ${fmt.currency(Math.abs(grandTotal))}</td>
        </tr>`;
        return rows + totRow;
      })() : '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--txt3)">Nessuna operazione</td></tr>'}
      </tbody></table>
    </div>`;
  openModal('Storico operazioni', body, null);
}

async function showEditPositionModal(portfolioId) {
  const [items, accounts] = await Promise.all([api.getPortfolio(), api.getAccounts()]);
  const pos = items.find(i => i.id === portfolioId);
  if (!pos) return;
  const investAccounts = accounts.filter(a => a.type === 'investment' && !a.is_closed);
  const isBond = pos.asset_type === 'bond';

  const body = `
    <div style="background:var(--bg3);border-radius:6px;padding:8px 14px;margin-bottom:14px;font-size:13px">
      Ticker: <strong>${pos.ticker}</strong> &nbsp;·&nbsp;
      <span class="badge" style="background:${isBond?'#d29922':'#58a6ff'};color:#fff;font-size:10px;padding:1px 5px;border-radius:4px">${isBond?'OBB':'AZI'}</span>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Nome *</label>
        <input class="form-control" id="e_name" value="${pos.name}">
      </div>
      <div class="form-group">
        <label class="form-label">Conto investimento *</label>
        <select class="form-control" id="e_account">
          ${investAccounts.map(a=>`<option value="${a.id}" ${a.id==pos.account_id?'selected':''}>${a.icon} ${a.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">${isBond?'Nominale (€)':'Quantità'} *</label>
        <input type="text" inputmode="decimal" class="form-control" id="e_qty" value="${pos.quantity}">
      </div>
      <div class="form-group">
        <label class="form-label">${isBond?'Prezzo medio (%)':'Prezzo medio (€)'} *</label>
        <input type="text" inputmode="decimal" class="form-control" id="e_avg" value="${pos.avg_price}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">${isBond?'Prezzo attuale (%)':'Prezzo attuale (€)'}</label>
        <input type="text" inputmode="decimal" class="form-control" id="e_cur" value="${pos.current_price||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Commissioni totali (€)</label>
        <input type="text" inputmode="decimal" class="form-control" id="e_comm" value="${pos.total_commissions||0}">
      </div>
    </div>
    ${isBond ? `
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Data scadenza</label>
        <input type="date" class="form-control" id="e_maturity" value="${pos.maturity_date||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Tasso cedola (%/anno)</label>
        <input type="text" inputmode="decimal" class="form-control" id="e_coupon_rate" value="${pos.coupon_rate||''}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Frequenza cedola</label>
        <select class="form-control" id="e_coupon_freq">
          <option value="annual"     ${pos.coupon_frequency==='annual'?'selected':''}>Annuale</option>
          <option value="semiannual" ${pos.coupon_frequency==='semiannual'||!pos.coupon_frequency?'selected':''}>Semestrale</option>
          <option value="quarterly"  ${pos.coupon_frequency==='quarterly'?'selected':''}>Trimestrale</option>
          <option value="monthly"    ${pos.coupon_frequency==='monthly'?'selected':''}>Mensile</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Tassazione cedola (%)</label>
        <input type="text" inputmode="decimal" class="form-control" id="e_coupon_tax" value="${pos.coupon_tax??12.5}">
      </div>
    </div>` : ''}
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Paese / Emittente</label>
        <input class="form-control" id="e_country" value="${pos.country||''}" placeholder="Es. Italia, Germania…">
      </div>
      <div class="form-group">
        <label class="form-label">Note</label>
        <input class="form-control" id="e_notes" value="${pos.notes||''}" placeholder="Opzionale">
      </div>
    </div>`;

  openModal('Modifica Posizione', body, async () => {
    const n = (id) => document.getElementById(id)?.value || '';
    const data = {
      id:               portfolioId,
      name:             document.getElementById('e_name').value.trim(),
      account_id:       parseInt(document.getElementById('e_account').value),
      quantity:         evalAmount(n('e_qty')),
      avg_price:        evalAmount(n('e_avg')),
      current_price:    evalAmount(n('e_cur')) || null,
      total_commissions:evalAmount(n('e_comm')) || 0,
      asset_type:       pos.asset_type,
      maturity_date:    isBond ? (document.getElementById('e_maturity')?.value || null) : null,
      coupon_rate:      isBond ? (evalAmount(n('e_coupon_rate')) || 0) : 0,
      coupon_frequency: isBond ? (document.getElementById('e_coupon_freq')?.value || null) : null,
      coupon_tax:       isBond ? (parseFloat(n('e_coupon_tax')) ?? 12.5) : 0,
      country:          document.getElementById('e_country').value.trim() || null,
      notes:            document.getElementById('e_notes').value.trim() || null,
    };
    if (!data.name)                         { toast('Inserisci il nome','error'); return; }
    if (!data.quantity || data.quantity<=0) { toast('Inserisci una quantità valida','error'); return; }
    if (isNaN(data.avg_price))              { toast('Inserisci un prezzo medio valido','error'); return; }
    try {
      await api.updatePortfolioItem(data);
      closeModal();
      toast('Posizione aggiornata');
      renderPortfolio();
    } catch(e) { toast(e.message,'error'); }
  });
}
window.showEditPositionModal = showEditPositionModal;

// ── Portfolio context menu ──────────────────────────────────────────────────

function nextCouponDate(maturityDateStr, frequency) {
  const mat = new Date(maturityDateStr + 'T00:00:00');
  const day = mat.getDate();
  const matMonth = mat.getMonth() + 1; // 1-12
  const today = new Date(); today.setHours(0,0,0,0);
  const intervalMonths = { annual:12, semiannual:6, quarterly:3, monthly:1 }[frequency] || 12;

  const candidates = [];
  for (let year = today.getFullYear(); year <= today.getFullYear() + 2; year++) {
    for (let month = 1; month <= 12; month++) {
      const diff = ((month - matMonth) % 12 + 12) % 12;
      if (diff % intervalMonths === 0) {
        const d = new Date(year, month - 1, day);
        if (d <= mat && d >= today) candidates.push(d);
      }
    }
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => a - b);
  return _dateStr(candidates[0]);
}

function closePortfolioContextMenu() {
  document.getElementById('portfolio-ctx-menu')?.remove();
  document.removeEventListener('click', closePortfolioContextMenu);
  document.removeEventListener('contextmenu', closePortfolioContextMenu);
}

window._showPortfolioCtx = (portfolioId, evt) => {
  evt.preventDefault();
  closePortfolioContextMenu();

  const pos    = _portfolioItems.find(i => i.id === portfolioId);
  const isBond = pos?.asset_type === 'bond';
  const hasCoupon = isBond && pos?.coupon_rate > 0 && pos?.maturity_date;

  const menu = document.createElement('div');
  menu.id = 'portfolio-ctx-menu';
  menu.style.cssText = `position:fixed;z-index:9999;background:var(--bg2);border:1px solid var(--border);
    border-radius:8px;padding:4px 0;min-width:220px;box-shadow:0 4px 16px rgba(0,0,0,.3);
    left:${Math.min(evt.clientX, window.innerWidth-240)}px;top:${Math.min(evt.clientY, window.innerHeight-260)}px`;

  const mkItem = (icon, label, cb, danger = false) => {
    const el = document.createElement('div');
    el.style.cssText = `padding:8px 14px;cursor:pointer;font-size:13px;display:flex;align-items:center;gap:8px;${danger?'color:var(--expense)':''}`;
    el.innerHTML = `${icon} ${label}`;
    el.onmouseenter = () => el.style.background = 'var(--bg3)';
    el.onmouseleave = () => el.style.background = '';
    el.onclick = () => { closePortfolioContextMenu(); cb(); };
    return el;
  };

  const mkSep = () => {
    const s = document.createElement('div');
    s.style.cssText = 'border-top:1px solid var(--border);margin:4px 0';
    return s;
  };

  menu.appendChild(mkItem('➕', 'Acquista altro', () => showBuyModal(portfolioId)));
  menu.appendChild(mkItem('➖', 'Vendi',          () => showSellModal(portfolioId)));
  if (hasCoupon) {
    menu.appendChild(mkItem('💰', 'Registra cedola',               () => showCouponModal(portfolioId)));
    menu.appendChild(mkItem('📅', 'Aggiungi cedola a pianificate', () => showAddCouponToScheduled(portfolioId)));
  }
  if (!isBond) {
    menu.appendChild(mkItem('💸', 'Registra spesa', () => showExpenseModal(portfolioId)));
  }
  menu.appendChild(mkSep());
  menu.appendChild(mkItem('✏️', 'Modifica',  () => showEditPositionModal(portfolioId)));
  menu.appendChild(mkItem('📋', 'Storico',   () => showPortfolioHistory(portfolioId)));
  menu.appendChild(mkSep());
  menu.appendChild(mkItem('🗑️', 'Elimina',  () => deleteStock(portfolioId), true));

  document.body.appendChild(menu);
  setTimeout(() => {
    document.addEventListener('click', closePortfolioContextMenu, { once: true });
    document.addEventListener('contextmenu', closePortfolioContextMenu, { once: true });
  }, 0);
};

async function showAddCouponToScheduled(portfolioId) {
  const [items, accounts, categories] = await Promise.all([
    api.getPortfolio(), api.getAccounts(), api.getCategories()
  ]);
  const pos = items.find(i => i.id === portfolioId);
  if (!pos) return;

  if (!pos.coupon_rate || !pos.maturity_date) {
    toast('Questo titolo non ha cedola o scadenza configurata', 'error'); return;
  }

  // Mappa frequenza bond → frequenza pianificate
  const freqMap = { annual:'yearly', semiannual:'semiannual', quarterly:'quarterly', monthly:'monthly' };
  const schedFreq = freqMap[pos.coupon_frequency] || 'yearly';

  const regularAccounts  = accounts.filter(a => a.type !== 'investment' && !a.is_closed);
  const incomeCategories = categories.filter(c => c.type === 'income');
  const freqDivisor = { annual:1, semiannual:2, quarterly:4, monthly:12 };
  const div     = freqDivisor[pos.coupon_frequency] || 1;
  const taxRate = pos.coupon_tax ?? 12.5;
  const grossAmt = pos.quantity * (pos.coupon_rate / 100) / div;
  const netAmt   = grossAmt * (1 - taxRate / 100);
  const nextDate = nextCouponDate(pos.maturity_date, pos.coupon_frequency);

  if (!nextDate) {
    toast('Nessuna data cedola futura trovata (titolo già scaduto?)', 'error'); return;
  }

  const body = `
    <div style="background:var(--bg3);border-radius:6px;padding:8px 14px;margin-bottom:14px;font-size:13px">
      <strong>${pos.ticker}</strong> — ${pos.name}<br>
      Tasso ${pos.coupon_rate}% · tax ${taxRate}% · ${FREQ_LABELS[schedFreq]||schedFreq}<br>
      <span style="color:var(--txt3);font-size:11px">Lordo ${fmt.currency(grossAmt)} → Netto <strong style="color:var(--income)">${fmt.currency(netAmt)}</strong> per periodo</span>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Prima data pagamento *</label>
        <input type="date" class="form-control" id="cs_start" value="${nextDate}">
      </div>
      <div class="form-group">
        <label class="form-label">Ultima data (scadenza) *</label>
        <input type="date" class="form-control" id="cs_end" value="${pos.maturity_date}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Importo netto (€) *</label>
        <input type="text" inputmode="decimal" class="form-control" id="cs_amount" value="${netAmt.toFixed(2)}">
      </div>
      <div class="form-group">
        <label class="form-label">Frequenza *</label>
        <select class="form-control" id="cs_freq">
          ${Object.entries(FREQ_LABELS).map(([v,l])=>`<option value="${v}" ${v===schedFreq?'selected':''}>${l}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Accredita su *</label>
        <select class="form-control" id="cs_account">
          <option value="">— Seleziona conto —</option>
          ${regularAccounts.map(a=>`<option value="${a.id}">${a.icon} ${a.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Categoria</label>
        <select class="form-control" id="cs_cat">
          <option value="">— Nessuna —</option>
          ${incomeCategories.map(c=>`<option value="${c.id}">${c.icon||''} ${c.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Descrizione</label>
      <input class="form-control" id="cs_desc" value="Cedola ${pos.ticker}">
    </div>`;

  openModal('Aggiungi cedola a Pianificate', body, async () => {
    const amount    = parseFloat((document.getElementById('cs_amount').value||'').replace(',','.'));
    const accountId = parseInt(document.getElementById('cs_account').value);
    const startDate = document.getElementById('cs_start').value;
    const endDate   = document.getElementById('cs_end').value;
    const catId     = parseInt(document.getElementById('cs_cat').value) || null;
    if (!accountId)           { toast('Seleziona il conto','error'); return; }
    if (!amount || amount<=0) { toast('Importo non valido','error'); return; }
    if (!startDate)           { toast('Data inizio mancante','error'); return; }
    const data = {
      description:   document.getElementById('cs_desc').value.trim() || `Cedola ${pos.ticker}`,
      amount,
      type:          'income',
      category_id:   catId,
      account_id:    accountId,
      to_account_id: null,
      frequency:     document.getElementById('cs_freq').value,
      start_date:    startDate,
      end_date:      endDate || null,
      is_active:     1,
      color:         null,
      reconciled:    1,
      portfolio_id:  portfolioId,
    };
    try {
      await api.addScheduled(data);
      closeModal();
      toast(`Cedola ${pos.ticker} aggiunta alle pianificate`);
    } catch(e) { toast(e.message,'error'); }
  });
}
window.showAddCouponToScheduled = showAddCouponToScheduled;

window._setPortfolioTab = _setPortfolioTab;
window._setPortfolioFilter = async (val) => {
  _portfolioActiveOnly = val;
  await api.setSetting('portfolio.active_only', val);
  renderPortfolio();
};
window._setPortfolioTypeFilter = type => {
  _portfolioTypeFilter = type;
  renderPortfolio();
};
window._portfolioSortBy = col => {
  if (_portfolioSort.col === col) _portfolioSort.dir *= -1;
  else _portfolioSort = { col, dir: 1 };
  renderPortfolio();
};
async function deletePortfolioTransactionConfirm(ptId, type, ticker) {
  const TYPE_IT = { buy: 'acquisto', sell: 'vendita', coupon: 'cedola', expense: 'commissione/spesa' };
  const label = TYPE_IT[type] || type;
  const warn = (type === 'buy' || type === 'sell')
    ? `<p style="margin:8px 0 0;font-size:12px;color:var(--txt2)">La quantità di ${ticker} verrà ripristinata.</p>`
    : '';
  openModal(
    'Annulla operazione',
    `<p style="margin:0">Annullare la registrazione di <b>${label}</b> per <b>${ticker}</b>?${warn}</p>`,
    async () => {
      try {
        await api.deletePortfolioTransaction(ptId);
        closeModal();
        toast('Operazione annullata');
        renderPortfolio();
        if (currentPage === 'dashboard') renderDashboard();
      } catch(e) { toast(e.message, 'error'); }
    },
    'Annulla operazione', 'btn-danger'
  );
}
window.deletePortfolioTransactionConfirm = deletePortfolioTransactionConfirm;

window.showBuyModal         = showBuyModal;
window.showSellModal        = showSellModal;
window.showCouponModal      = showCouponModal;
window.showExpenseModal     = showExpenseModal;
window.showPortfolioHistory = showPortfolioHistory;
async function refreshPortfolioPrices() {
  const btn = document.getElementById('btnRefreshPrices');
  const items = (_portfolioItems || [])
    .filter(i => _portfolioActiveOnly === 'active' ? i.quantity > 0 : _portfolioActiveOnly === 'closed' ? i.quantity === 0 : true)
    .filter(i => _portfolioTypeFilter === 'all' ? true : (i.asset_type || 'equity') === _portfolioTypeFilter);
  if (!items.length) { toast('Nessun titolo da aggiornare', 'info'); return; }

  if (btn) btn.disabled = true;
  let updated = 0, failed = 0;

  for (const item of items) {
    if (btn) btn.textContent = `⏳ ${updated + failed + 1}/${items.length}`;
    try {
      const res = await api.fetchOnlinePrice(item.ticker);
      await api.updateStockPrice(item.id, res.price);
      _portfolioPriceStatus[item.id] = 'ok';
      updated++;
    } catch(e) {
      _portfolioPriceStatus[item.id] = 'fail';
      failed++;
      console.warn('Prezzo non aggiornato per', item.ticker, ':', e.message);
    }
  }

  await renderPortfolio();
  const msg = failed === 0
    ? `Aggiornati ${updated} titoli`
    : `Aggiornati ${updated}, non trovati ${failed}`;
  toast(msg, failed > 0 ? 'warning' : 'success');
}

window.updateStockPrice = async (id, val) => {
  const normalized = String(val).trim().replace(',', '.');
  const price = parseFloat(normalized);
  if (isNaN(price) || price < 0) return;
  try {
    await api.updateStockPrice(id, price);
    await renderPortfolio();
  }
  catch(e) { toast(e.message,'error'); }
};
window.deleteStock = async id => {
  const ok = await confirm('Elimina posizione', 'Eliminare questa posizione dal portafoglio? Le transazioni collegate resteranno.');
  if (!ok) return;
  await api.deletePortfolioItem(id);
  toast('Posizione eliminata');
  renderPortfolio();
};

/* ═══════════════════════════════════════════════════════════════════════════
   RESOCONTI
═══════════════════════════════════════════════════════════════════════════ */
/* ─── Analytics ──────────────────────────────────────────────────────────── */

let _analyticsStartYm       = null;  // "YYYY-MM" — null = default (primo mese DB)
let _analyticsEndYm         = null;  // "YYYY-MM" — null = default (mese prec. o corrente)
let _analyticsOldestYm      = undefined; // cache primo mese disponibile in DB (undefined = non ancora caricato)

/* Restituisce { fetchMonths, monthCols } pronti per i render function.
   fetchMonths = quanti mesi chiedere al DB (da startYm a oggi).
   monthCols   = array { ym, label } filtrato su [startYm, endYm]. */
function _analyticsMonthRange() {
  const now = new Date();
  const toYm = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  const prevYm = toYm(new Date(now.getFullYear(), now.getMonth()-1, 1));

  const startYm = _analyticsStartYm || _analyticsOldestYm || prevYm;
  const endYm   = _analyticsEndYm   || prevYm;

  // quanti mesi dal startYm a oggi (per la query DB che parte sempre da oggi)
  const startDate = new Date(startYm + '-01');
  const fetchMonths = Math.max(1,
    (now.getFullYear() - startDate.getFullYear()) * 12 +
    (now.getMonth()    - startDate.getMonth())    + 1);

  // monthCols: tutti i mesi da startYm a endYm inclusi
  const monthCols = [];
  let d = new Date(startYm + '-01');
  const endDate = new Date(endYm + '-01');
  while (d <= endDate) {
    const ym = toYm(d);
    monthCols.push({ ym, label: d.toLocaleDateString('it-IT', { month:'short', year:'2-digit' }) });
    d = new Date(d.getFullYear(), d.getMonth()+1, 1);
  }
  return { fetchMonths, monthCols };
}

/* Helper: popola un <select> con opzioni mese/anno nell'intervallo [fromYm, toYm] */
const _MONTHS_IT = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];

function _buildYearOptions(fromYm, toYm, selectedYear) {
  const fromY = parseInt(fromYm.slice(0,4)), toY = parseInt(toYm.slice(0,4));
  let html = '';
  for (let y = fromY; y <= toY; y++)
    html += `<option value="${y}"${y===selectedYear?' selected':''}>${y}</option>`;
  return html;
}

function _buildMonthsForYear(year, fromYm, toYm, selectedMonth) {
  const fromY = parseInt(fromYm.slice(0,4)), fromM = parseInt(fromYm.slice(5,7));
  const toY   = parseInt(toYm.slice(0,4)),   toM   = parseInt(toYm.slice(5,7));
  const mFrom = year === fromY ? fromM : 1;
  const mTo   = year === toY   ? toM   : 12;
  let html = '';
  for (let m = mFrom; m <= mTo; m++)
    html += `<option value="${m}"${m===selectedMonth?' selected':''}>${_MONTHS_IT[m-1]}</option>`;
  return html;
}

function _renderCurrentAnalyticsTab() {
  if (_analyticsTab === 'balance')     renderAnalyticsBalance();
  else if (_analyticsTab === 'trend')      renderAnalyticsTrend();
  else if (_analyticsTab === 'health')     renderAnalyticsHealth();
  else if (_analyticsTab === 'forecast')   renderAnalyticsForecast();
  else if (_analyticsTab === 'accbalance') renderAnalyticsAccBalance();
  else if (_analyticsTab === 'nature')     renderNatureReport();
  else renderAnalyticsCatMonth();
}

async function renderAnalytics() {
  // Carica il primo mese disponibile in DB (una sola volta per sessione)
  if (_analyticsOldestYm === undefined) {
    _analyticsOldestYm = await api.getOldestTransactionMonth() || null;
  }
  // startYm: sempre ultimi 12 mesi escluso corrente; endYm: mese precedente (persistito)
  const now    = new Date();
  const toYm   = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  const prevYm = toYm(new Date(now.getFullYear(), now.getMonth()-1, 1));
  const curYm  = toYm(now);
  const oldestYm = _analyticsOldestYm || prevYm;
  const last12 = toYm(new Date(now.getFullYear(), now.getMonth()-12, 1));
  _analyticsStartYm = last12 > oldestYm ? last12 : oldestYm;
  if (!_analyticsEndYm)   _analyticsEndYm   = prevYm;
  const maxYm = curYm;

  // Scompone YYYY-MM in {y, m}
  const parseYm = ym => ({ y: parseInt(ym.slice(0,4)), m: parseInt(ym.slice(5,7)) });
  const fmtYm   = (y, m) => `${y}-${String(m).padStart(2,'0')}`;

  let sYm = parseYm(_analyticsStartYm), eYm = parseYm(_analyticsEndYm);

  const pg = document.getElementById('pg-analytics');
  pg.innerHTML = `
    <div style="padding:16px 24px 0;display:flex;flex-direction:column;height:100%;overflow:hidden;box-sizing:border-box">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;flex-shrink:0">
        <div style="display:flex;gap:6px">
          <button class="sched-tab${_analyticsTab==='health'?' active':''}" data-atab="health" onclick="_setAnalyticsTab('health',this)">Salute Finanziaria</button>
          <button class="sched-tab${_analyticsTab==='catmonth'?' active':''}" data-atab="catmonth" onclick="_setAnalyticsTab('catmonth',this)">Categorie / Mese</button>
          <button class="sched-tab${_analyticsTab==='balance'?' active':''}" data-atab="balance" onclick="_setAnalyticsTab('balance',this)">Bilancio Mensile</button>
          <button class="sched-tab${_analyticsTab==='trend'?' active':''}" data-atab="trend" onclick="_setAnalyticsTab('trend',this)">Andamento Categoria</button>
          <button class="sched-tab${_analyticsTab==='accbalance'?' active':''}" data-atab="accbalance" onclick="_setAnalyticsTab('accbalance',this)">Saldo Conti</button>
          <button class="sched-tab${_analyticsTab==='forecast'?' active':''}" data-atab="forecast" onclick="_setAnalyticsTab('forecast',this)">📊 Previsione Saldo</button>
          <button class="sched-tab${_analyticsTab==='nature'?' active':''}" data-atab="nature" onclick="_setAnalyticsTab('nature',this)">🌿 Natura Spese</button>
        </div>
        <div id="aDateControls" style="margin-left:auto;display:flex;gap:6px;align-items:center;white-space:nowrap;${_analyticsTab==='forecast'?'visibility:hidden':''}">
          <button class="btn btn-xs btn-ghost" id="aPreset6m">6 mesi</button>
          <button class="btn btn-xs btn-ghost" id="aPreset12m">12 mesi</button>
          <button class="btn btn-xs btn-ghost" id="aPresetYtd">Anno</button>
          <div style="width:1px;height:16px;background:var(--border);margin:0 2px"></div>
          <label style="font-size:13px;color:var(--txt2)">Da:</label>
          <select id="aStartY" class="form-control" style="font-size:12px;padding:3px 8px;width:72px">${_buildYearOptions(oldestYm, maxYm, sYm.y)}</select>
          <select id="aStartM" class="form-control" style="font-size:12px;padding:3px 8px;width:60px">${_buildMonthsForYear(sYm.y, oldestYm, maxYm, sYm.m)}</select>
          <label style="font-size:13px;color:var(--txt2)">A:</label>
          <select id="aEndY" class="form-control" style="font-size:12px;padding:3px 8px;width:72px">${_buildYearOptions(_analyticsStartYm, maxYm, eYm.y)}</select>
          <select id="aEndM" class="form-control" style="font-size:12px;padding:3px 8px;width:60px">${_buildMonthsForYear(eYm.y, _analyticsStartYm, maxYm, eYm.m)}</select>
        </div>
      </div>
      <div id="analyticsContent" style="flex:1;overflow:auto;padding-bottom:16px"></div>
    </div>`;

  const rebuildEndSelects = () => {
    eYm = parseYm(_analyticsEndYm);
    document.getElementById('aEndY').innerHTML = _buildYearOptions(_analyticsStartYm, maxYm, eYm.y);
    document.getElementById('aEndM').innerHTML = _buildMonthsForYear(eYm.y, _analyticsStartYm, maxYm, eYm.m);
  };

  document.getElementById('aStartY').onchange = function() {
    sYm.y = parseInt(this.value);
    // Ricava mesi validi per il nuovo anno e clampsa il mese corrente
    const p = parseYm(oldestYm), q = parseYm(maxYm);
    const mFrom = sYm.y === p.y ? p.m : 1, mTo = sYm.y === q.y ? q.m : 12;
    sYm.m = Math.min(Math.max(sYm.m, mFrom), mTo);
    document.getElementById('aStartM').innerHTML = _buildMonthsForYear(sYm.y, oldestYm, maxYm, sYm.m);
    _analyticsStartYm = fmtYm(sYm.y, sYm.m);
    if (_analyticsEndYm < _analyticsStartYm) { _analyticsEndYm = _analyticsStartYm; eYm = {...sYm}; }
    rebuildEndSelects();
    _renderCurrentAnalyticsTab();
  };
  document.getElementById('aStartM').onchange = function() {
    sYm.m = parseInt(this.value);
    _analyticsStartYm = fmtYm(sYm.y, sYm.m);
    if (_analyticsEndYm < _analyticsStartYm) { _analyticsEndYm = _analyticsStartYm; eYm = {...sYm}; }
    rebuildEndSelects();
    _renderCurrentAnalyticsTab();
  };
  document.getElementById('aEndY').onchange = function() {
    eYm.y = parseInt(this.value);
    // Ricava mesi validi per il nuovo anno e clampsa il mese corrente
    const p = parseYm(_analyticsStartYm), q = parseYm(maxYm);
    const mFrom = eYm.y === p.y ? p.m : 1, mTo = eYm.y === q.y ? q.m : 12;
    eYm.m = Math.min(Math.max(eYm.m, mFrom), mTo);
    document.getElementById('aEndM').innerHTML = _buildMonthsForYear(eYm.y, _analyticsStartYm, maxYm, eYm.m);
    _analyticsEndYm = fmtYm(eYm.y, eYm.m);
    _renderCurrentAnalyticsTab();
  };
  document.getElementById('aEndM').onchange = function() {
    eYm.y = parseInt(document.getElementById('aEndY').value);
    eYm.m = parseInt(this.value);
    _analyticsEndYm = fmtYm(eYm.y, eYm.m);
    _renderCurrentAnalyticsTab();
  };

  const applyPreset = (startYm) => {
    _analyticsStartYm = startYm < oldestYm ? oldestYm : startYm;
    _analyticsEndYm   = prevYm;
    sYm = parseYm(_analyticsStartYm); eYm = parseYm(_analyticsEndYm);
    document.getElementById('aStartY').innerHTML = _buildYearOptions(oldestYm, maxYm, sYm.y);
    document.getElementById('aStartM').innerHTML = _buildMonthsForYear(sYm.y, oldestYm, maxYm, sYm.m);
    rebuildEndSelects();
    _renderCurrentAnalyticsTab();
  };
  const ymFromDate = d => fmtYm(d.getFullYear(), d.getMonth()+1);
  document.getElementById('aPreset6m').onclick  = () => applyPreset(ymFromDate(new Date(now.getFullYear(), now.getMonth()-6, 1)));
  document.getElementById('aPreset12m').onclick = () => applyPreset(ymFromDate(new Date(now.getFullYear(), now.getMonth()-12, 1)));
  document.getElementById('aPresetYtd').onclick = () => applyPreset(fmtYm(now.getFullYear(), 1));

  _renderCurrentAnalyticsTab();
}

let _analyticsTab = 'health';
window._setAnalyticsTab = (tab, btn) => {
  _analyticsTab = tab;
  document.querySelectorAll('[data-atab]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const dc = document.getElementById('aDateControls');
  if (dc) dc.style.visibility = tab === 'forecast' ? 'hidden' : '';
  if (tab === 'catmonth')   renderAnalyticsCatMonth();
  if (tab === 'balance')    renderAnalyticsBalance();
  if (tab === 'trend')      renderAnalyticsTrend();
  if (tab === 'health')     renderAnalyticsHealth();
  if (tab === 'forecast')   renderAnalyticsForecast();
  if (tab === 'accbalance') renderAnalyticsAccBalance();
  if (tab === 'nature')     renderNatureReport();
};

let _analyticsCatSort = { col: null, dir: -1 };
let _analyticsCatCache = null;

async function renderAnalyticsCatMonth() {
  const el = document.getElementById('analyticsContent');
  if (!el) return;
  el.innerHTML = '<p style="padding:20px;color:var(--text2)">Caricamento…</p>';

  const { fetchMonths, monthCols } = _analyticsMonthRange();
  const rows = await api.getCategoryMonthTable(fetchMonths);

  const catMap = {};
  for (const r of rows) {
    if (!catMap[r.id]) catMap[r.id] = { id: r.id, name: r.name, type: r.type, color: r.color, icon: r.icon, parent_name: r.parent_name || null, m: {} };
    catMap[r.id].m[r.ym] = r.total;
  }

  _analyticsCatCache = { monthCols, catMap };
  _renderAnalyticsCatTable();
}

window._sortAnalyticsCat = col => {
  if (_analyticsCatSort.col === col) _analyticsCatSort.dir *= -1;
  else { _analyticsCatSort.col = col; _analyticsCatSort.dir = -1; }
  _renderAnalyticsCatTable();
};

function _renderAnalyticsCatTable() {
  const el = document.getElementById('analyticsContent');
  if (!el || !_analyticsCatCache) return;
  const { monthCols, catMap } = _analyticsCatCache;

  const catTotal = c => monthCols.reduce((s, m) => s + (c.m[m.ym] || 0), 0);

  const sortCats = arr => {
    const { col, dir } = _analyticsCatSort;
    if (col === null) return [...arr].sort((a, b) => {
      const pa = a.parent_name || a.name, pb = b.parent_name || b.name;
      return pa.localeCompare(pb) || a.name.localeCompare(b.name);
    });
    return [...arr].sort((a, b) => {
      if (col === 'name') return dir * a.name.localeCompare(b.name);
      if (col === 'total' || col === 'avg') return dir * (catTotal(a) - catTotal(b));
      const ym = monthCols[col]?.ym;
      return dir * ((a.m[ym] || 0) - (b.m[ym] || 0));
    });
  };

  const arrow = col => {
    if (_analyticsCatSort.col !== col) return ' <span style="color:var(--txt3);font-size:10px;user-select:none">⇅</span>';
    return _analyticsCatSort.dir === -1 ? ' ↓' : ' ↑';
  };

  const thStyle = 'cursor:pointer;user-select:none';

  const expenses = sortCats(Object.values(catMap).filter(c => c.type === 'expense'));
  const incomes  = sortCats(Object.values(catMap).filter(c => c.type === 'income'));

  const renderSection = (cats, label) => {
    if (!cats.length) return '';
    let html = `<tr class="analytics-section-header"><td colspan="${monthCols.length + 3}">${label}</td></tr>`;
    for (const c of cats) {
      const total = catTotal(c);
      const avg = total / monthCols.length;
      html += `<tr>
        <td class="analytics-cat-name">${c.parent_name ? `<span style="color:var(--txt3);font-size:11px">${c.parent_name} ›</span> ` : ''}<span style="color:${c.color}">${c.icon}</span> ${c.name}</td>
        ${monthCols.map(m => `<td class="text-right">${c.m[m.ym] ? fmt.currency(c.m[m.ym]) : '<span style="color:var(--text3)">—</span>'}</td>`).join('')}
        <td class="text-right analytics-total">${fmt.currency(total)}</td>
        <td class="text-right analytics-avg">${fmt.currency(avg)}</td>
      </tr>`;
    }
    const colTotals = monthCols.map(m => cats.reduce((s, c) => s + (c.m[m.ym] || 0), 0));
    const grand = colTotals.reduce((a, b) => a + b, 0);
    html += `<tr class="analytics-subtotal">
      <td>Totale ${label}</td>
      ${colTotals.map(t => `<td class="text-right">${fmt.currency(t)}</td>`).join('')}
      <td class="text-right analytics-total">${fmt.currency(grand)}</td>
      <td class="text-right analytics-avg">${fmt.currency(monthCols.length ? grand / monthCols.length : 0)}</td>
    </tr>`;
    return html;
  };

  el.innerHTML = `
    <table class="analytics-table">
      <thead><tr>
        <th style="${thStyle}" onclick="_sortAnalyticsCat('name')">Categoria${arrow('name')}</th>
        ${monthCols.map((m, i) => `<th class="text-right" style="${thStyle}" onclick="_sortAnalyticsCat(${i})">${m.label}${arrow(i)}</th>`).join('')}
        <th class="text-right analytics-total" style="${thStyle}" onclick="_sortAnalyticsCat('total')">Totale${arrow('total')}</th>
        <th class="text-right analytics-avg" style="${thStyle};color:var(--accent)" onclick="_sortAnalyticsCat('avg')">Media/mese${arrow('avg')}</th>
      </tr></thead>
      <tbody>
        ${renderSection(expenses, 'Uscite')}
        ${renderSection(incomes,  'Entrate')}
      </tbody>
    </table>`;
}

let _analyticsBalanceChart = null;

async function renderAnalyticsBalance() {
  const el = document.getElementById('analyticsContent');
  if (!el) return;
  el.innerHTML = '<p style="padding:20px;color:var(--text2)">Caricamento…</p>';

  const { fetchMonths, monthCols } = _analyticsMonthRange();
  const rows = await api.getMonthlyBalance(fetchMonths);

  const byYm = {};
  for (const r of rows) byYm[r.ym] = r;

  const incomes  = monthCols.map(m => byYm[m.ym]?.income  || 0);
  const expenses = monthCols.map(m => byYm[m.ym]?.expense || 0);
  const balances = monthCols.map((_, i) => incomes[i] - expenses[i]);
  let cumul = 0;
  const cumuls = balances.map(b => (cumul += b));
  const labels  = monthCols.map(m => m.label);

  const cc = chartColors();

  el.innerHTML = `
    <div style="height:380px;margin-bottom:20px"><canvas id="balanceChart"></canvas></div>
    <table class="analytics-table">
      <thead><tr>
        <th>Mese</th><th class="text-right">Entrate</th><th class="text-right">Uscite</th>
        <th class="text-right">Saldo</th><th class="text-right">Cumulativo</th>
      </tr></thead>
      <tbody>
        ${monthCols.map((m, i) => {
          const bal = balances[i], cum = cumuls[i];
          const balCol  = bal >= 0 ? 'var(--income)' : 'var(--expense)';
          const cumCol  = cum >= 0 ? 'var(--income)' : 'var(--expense)';
          const balBg   = bal >= 0 ? 'rgba(63,185,80,.10)' : 'rgba(248,81,73,.10)';
          const cumBg   = cum >= 0 ? 'rgba(63,185,80,.10)' : 'rgba(248,81,73,.10)';
          return `<tr>
            <td>${m.label}</td>
            <td class="text-right" style="color:var(--income);background:rgba(63,185,80,.07)">${incomes[i]  ? fmt.currency(incomes[i])  : '—'}</td>
            <td class="text-right" style="color:var(--expense);background:rgba(248,81,73,.07)">${expenses[i] ? fmt.currency(expenses[i]) : '—'}</td>
            <td class="text-right" style="color:${balCol};background:${balBg};font-weight:600">${fmt.currency(bal)}</td>
            <td class="text-right" style="color:${cumCol};background:${cumBg}">${fmt.currency(cum)}</td>
          </tr>`;
        }).join('')}
        <tr class="analytics-subtotal">
          <td>Totale</td>
          <td class="text-right">${fmt.currency(incomes.reduce((a,b)=>a+b,0))}</td>
          <td class="text-right">${fmt.currency(expenses.reduce((a,b)=>a+b,0))}</td>
          <td class="text-right" style="font-weight:700">${fmt.currency(balances.reduce((a,b)=>a+b,0))}</td>
          <td></td>
        </tr>
      </tbody>
    </table>`;

  if (_analyticsBalanceChart) { _analyticsBalanceChart.destroy(); _analyticsBalanceChart = null; }
  _analyticsBalanceChart = new Chart(document.getElementById('balanceChart'), {
    data: {
      labels,
      datasets: [
        { type:'bar',  label:'Entrate', data:incomes,  backgroundColor:'rgba(63,185,80,.7)',  order:2 },
        { type:'bar',  label:'Uscite',  data:expenses, backgroundColor:'rgba(248,81,73,.7)',   order:2 },
        { type:'line', label:'Saldo',   data:balances,
          borderColor:'#58a6ff', backgroundColor:'transparent',
          pointRadius:3, tension:.3, borderWidth:2, order:1 },
        { type:'line', label:'Cumulativo', data:cumuls,
          borderColor:'#bc8cff', borderWidth:1,
          fill: { target:'origin', above:'rgba(63,185,80,.18)', below:'rgba(248,81,73,.18)' },
          pointRadius:2, pointHoverRadius:4, tension:.3, order:1,
          segment: {
            borderColor: ctx => {
              const avg = ((ctx.p0.parsed.y ?? 0) + (ctx.p1.parsed.y ?? 0)) / 2;
              return avg >= 0 ? 'rgba(63,185,80,.9)' : 'rgba(248,81,73,.9)';
            }
          },
          pointBackgroundColor: ctx => ctx.parsed.y >= 0 ? 'rgba(63,185,80,.9)' : 'rgba(248,81,73,.9)' },
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      interaction:{ mode:'index', intersect:false },
      plugins:{
        tooltip:{ callbacks:{ label: ctx => ` ${ctx.dataset.label}: ${fmt.currency(ctx.parsed.y)}` } },
        legend:{ labels:{ color:cc.tick, boxWidth:12 } },
        zoom: zoomOpts()
      },
      scales:{
        x:{ ticks:{color:cc.tick}, grid:{color:cc.grid} },
        y:{ ticks:{color:cc.tick, callback:v=>fmt.currency(v)}, grid:{color:cc.grid} }
      }
    }
  });
}

/* ─── Analytics: Salute Finanziaria ──────────────────────────────────────── */
let _healthRateChart = null;
let _healthExpChart  = null;
let _healthIncChart  = null;
let _healthVolChart  = null;

// ── Previsione Saldo nel contesto Analytics ───────────────────────────────────
async function renderAnalyticsForecast() {
  const el = document.getElementById('analyticsContent');
  if (!el) return;
  const { histMonths, horizonMonths, sensitivity } = _fcParams;
  el.innerHTML = `
    <div class="card" style="padding:16px;margin-bottom:16px">
      <div style="display:flex;flex-wrap:wrap;gap:20px;align-items:flex-end">
        <div>
          <label style="font-size:12px;color:var(--txt2);display:block;margin-bottom:6px">Storico analizzato</label>
          <div style="display:flex;align-items:center;gap:8px">
            <input type="range" id="fcHistR" min="3" max="60" value="${histMonths}" style="width:130px"
              oninput="_fcParams.histMonths=+this.value;document.getElementById('fcHistN').textContent=this.value;_fcSetDirty()">
            <span id="fcHistN" style="font-weight:700;min-width:22px">${histMonths}</span>
            <span style="color:var(--txt2);font-size:13px">mesi</span>
          </div>
        </div>
        <div>
          <label style="font-size:12px;color:var(--txt2);display:block;margin-bottom:6px">Orizzonte previsione</label>
          <div style="display:flex;align-items:center;gap:8px">
            <input type="range" id="fcHorizR" min="1" max="36" value="${horizonMonths}" style="width:130px"
              oninput="_fcParams.horizonMonths=+this.value;document.getElementById('fcHorizN').textContent=this.value;_fcSetDirty()">
            <span id="fcHorizN" style="font-weight:700;min-width:22px">${horizonMonths}</span>
            <span style="color:var(--txt2);font-size:13px">mesi</span>
          </div>
        </div>
        <div>
          <label style="font-size:12px;color:var(--txt2);display:block;margin-bottom:6px">Sensibilità outlier</label>
          <select id="fcSens" class="form-control" onchange="_fcParams.sensitivity=this.value;_fcSetDirty()">
            <option value="bassa" ${sensitivity==='bassa'?'selected':''}>Bassa  (k = 3.0)</option>
            <option value="media" ${sensitivity==='media'?'selected':''}>Media  (k = 1.5)</option>
            <option value="alta"  ${sensitivity==='alta' ?'selected':''}>Alta   (k = 1.0)</option>
          </select>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <button class="btn btn-primary" onclick="_runForecastSaldo(true)">Aggiorna</button>
          <span id="fcDirtyBadge" style="display:none;font-size:11px;color:var(--warn)">● modifiche in attesa</span>
        </div>
      </div>
    </div>
    <div id="fcOutput"></div>`;
  // Carica dal DB le transazioni escluse persistite
  await _fcLoadExcludedFromDb();
  await _runForecastSaldo();
}

async function renderAnalyticsHealth() {
  const el = document.getElementById('analyticsContent');
  if (!el) return;
  el.innerHTML = '<p style="padding:20px;color:var(--txt2)">Caricamento…</p>';

  const { fetchMonths, monthCols } = _analyticsMonthRange();
  const balRows = await api.getMonthlyBalance(fetchMonths);
  const n = monthCols.length;

  // ── Dati bilancio per mese ────────────────────────────────────────────────
  const byYm = {};
  for (const r of balRows) byYm[r.ym] = r;
  const incomes  = monthCols.map(m => byYm[m.ym]?.income  || 0);
  const expenses = monthCols.map(m => byYm[m.ym]?.expense || 0);
  const savings  = monthCols.map((_, i) => incomes[i] - expenses[i]);

  const totalIncome  = incomes.reduce((a,b)=>a+b,0);
  const totalExpense = expenses.reduce((a,b)=>a+b,0);
  const totalSavings = totalIncome - totalExpense;
  const avgSavingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;

  // ── Score salute (0–100) ──────────────────────────────────────────────────
  // 1. Tasso risparmio (0–40 pt) — 8 soglie
  const scoreSavings = avgSavingsRate >= 20 ? 40 : avgSavingsRate >= 15 ? 35 : avgSavingsRate >= 10 ? 29 : avgSavingsRate >= 7 ? 23 : avgSavingsRate >= 5 ? 16 : avgSavingsRate >= 3 ? 9 : avgSavingsRate > 0 ? 4 : avgSavingsRate === 0 ? 0 : avgSavingsRate >= -5 ? -7 : avgSavingsRate >= -10 ? -13 : -20;
  // 2. Stabilità mensile (0–20 pt) — 7 soglie %
  const posMonths = savings.filter(s => s > 0).length;
  const posPct = n > 0 ? posMonths / n : 0;
  const scorePos = posPct === 1 ? 20 : posPct >= 0.9 ? 18 : posPct >= 0.75 ? 15 : posPct >= 0.6 ? 11 : posPct >= 0.4 ? 7 : posPct >= 0.2 ? 3 : 0;
  // 3. Trend spese (0–10 pt) — slope % su media mensile
  const expXMean = (n-1)/2, expAvg = expenses.reduce((a,b)=>a+b,0)/(n||1);
  let expNum=0, expDen=0;
  expenses.forEach((v,i)=>{ expNum+=(i-expXMean)*(v-expAvg); expDen+=(i-expXMean)**2; });
  const expSlope = expDen ? expNum/expDen : 0;
  const expSlopePct = expAvg ? expSlope / expAvg * 100 : 0;
  const scoreTrendRaw = expSlopePct <= -3 ? 10 : expSlopePct <= -1 ? 9 : expSlopePct <= 0 ? 7 : expSlopePct < 1 ? 5 : expSlopePct < 3 ? 3 : expSlopePct < 5 ? 1 : 0;
  // Attenuazione: spese crescenti sono meno allarmanti se stai risparmiando bene
  const scoreTrend = avgSavingsRate >= 10 ? Math.max(scoreTrendRaw, 5) : avgSavingsRate >= 5 ? Math.max(scoreTrendRaw, 2) : scoreTrendRaw;
  // 4. Trend del risparmio (0–20 pt) — risparmio crescente = entrate/uscite in miglioramento
  // Usa la mediana delle entrate come denominatore per normalizzare la pendenza in %:
  // evita divisione per risparmi vicini a zero, e non è distorta dai mesi con bonus.
  const incSorted = [...incomes].sort((a,b) => a-b);
  // Media interquartile (IQM): media del 50% centrale, robusto agli outlier
  const iqmQ1 = Math.floor(n * 0.25), iqmQ3 = Math.ceil(n * 0.75);
  const incMedian = incSorted.slice(iqmQ1, iqmQ3).reduce((a,b)=>a+b,0) / (iqmQ3 - iqmQ1);
  const savXMean = (n-1)/2, savAvg = savings.reduce((a,b)=>a+b,0)/(n||1);
  let savNum=0, savDen=0;
  savings.forEach((v,i)=>{ savNum+=(i-savXMean)*(v-savAvg); savDen+=(i-savXMean)**2; });
  const savSlope    = savDen ? savNum/savDen : 0;
  const savSlopePct = incMedian > 0 ? savSlope / incMedian * 100 : 0;
  const scoreIncTrendRaw = savSlopePct > 3 ? 20 : savSlopePct > 1 ? 16 : savSlopePct >= 0 ? 9 : savSlopePct > -1 ? 7 : savSlopePct > -3 ? 3 : 0;
  // Attenuazione: calo di tendenza è meno grave se tutti i mesi sono positivi e risparmi bene
  const scoreIncTrend = (posPct === 1 && avgSavingsRate >= 10) ? Math.max(scoreIncTrendRaw, 8)
    : (posPct >= 0.75 && avgSavingsRate >= 5) ? Math.max(scoreIncTrendRaw, 6)
    : scoreIncTrendRaw;
  // 5. Volatilità entrate (0–10 pt) — coefficiente di variazione, basso = stabile = bene
  // Semi-deviazione (downside) rispetto alla IQM:
  const incSemiVar = n > 1 ? incomes.reduce((a,v) => a + (v < incMedian ? (v-incMedian)**2 : 0), 0) / n : 0;
  const incStddev  = Math.sqrt(incSemiVar);
  const incCV      = incMedian > 0 ? incStddev / incMedian * 100 : 100;
  const scoreVol   = n < 2 ? 0 : incCV < 3 ? 10 : incCV < 6 ? 9 : incCV < 12 ? 7 : incCV < 20 ? 4 : incCV < 30 ? 1 : 0;
  const score = Math.min(100, scoreSavings + scorePos + scoreTrend + scoreIncTrend + scoreVol);
  const scoreColor = score >= 75 ? 'var(--income)' : score >= 50 ? '#e8a838' : score >= 30 ? '#e07020' : 'var(--expense)';
  const scoreLabel = score >= 75 ? 'Ottima' : score >= 60 ? 'Buona' : score >= 45 ? 'Discreta' : score >= 30 ? 'Sufficiente' : score >= 0 ? 'Attenzione' : 'Critica';

  const cc = chartColors();

  // ── Colori badge componenti ───────────────────────────────────────────────
  const colS = scoreSavings >= 29 ? 'var(--income)' : scoreSavings >= 16 ? '#e8a838' : 'var(--expense)';
  const colP = scorePos >= 15 ? 'var(--income)' : scorePos >= 7 ? '#e8a838' : 'var(--expense)';
  const colT = scoreTrend >= 7 ? 'var(--income)' : scoreTrend >= 3 ? '#e8a838' : 'var(--expense)';
  const colI = scoreIncTrend >= 16 ? 'var(--income)' : scoreIncTrend >= 7 ? '#e8a838' : 'var(--expense)';
  const colV = scoreVol >= 7 ? 'var(--income)' : scoreVol >= 4 ? '#e8a838' : 'var(--expense)';

  // ── Dati grafici dettaglio ────────────────────────────────────────────────
  const monthlyRates = monthCols.map((_,i) => incomes[i] > 0 ? +(savings[i] / incomes[i] * 100).toFixed(2) : 0);
  const expRegLine   = monthCols.map((_,i) => expAvg + expSlope * (i - expXMean));
  const savRegLine   = monthCols.map((_,i) => savAvg + savSlope * (i - savXMean));
  const labels       = monthCols.map(m => m.label);

  // ── HTML ──────────────────────────────────────────────────────────────────
  el.innerHTML = `
    <div id="healthReport" style="padding-bottom:24px">

      <!-- Toolbar stampa -->
      <!-- Score principale -->
      <div style="display:grid;grid-template-columns:auto 1fr;gap:16px;margin-bottom:16px;align-items:stretch">
        <div style="text-align:center;padding:20px 28px;background:var(--bg3);border-radius:12px;min-width:120px;display:flex;flex-direction:column;justify-content:center">
          <div style="font-size:52px;font-weight:700;color:${scoreColor};line-height:1">${score}</div>
          <div style="font-size:12px;color:var(--txt3);margin-top:2px">/ 100</div>
          <div style="font-size:15px;font-weight:700;color:${scoreColor};margin-top:6px">${scoreLabel}</div>
        </div>
        <!-- Scomposizione score -->
        <div class="card-section" style="padding:16px 20px;display:flex;flex-direction:column;gap:10px">
          <div style="font-size:12px;font-weight:600;color:var(--txt2);margin-bottom:2px">Come è calcolato il punteggio</div>
          ${[
            {
              label: 'Tasso di risparmio',
              desc:  `Quota media di entrate risparmiata negli ultimi ${n} mesi. ≥20% = eccellente (40 pt) · ≥15% = ottimo · ≥10% = buono · ≥5% = sufficiente · ≤3% = scarso · =0% = nullo · <0% = penalità (fino a −20 pt).`,
              got: scoreSavings, max: 40,
              detail: `${avgSavingsRate.toFixed(1)}% medio → ${scoreSavings}/40 pt`,
              col: scoreSavings>=29?'var(--income)':scoreSavings>=16?'#e8a838':'var(--expense)'
            },
            {
              label: 'Stabilità mensile',
              desc:  `Percentuale di mesi su ${n} chiusi in positivo (entrate > uscite). 100% = ottimo · ≥75% = buono · <40% = attenzione.`,
              got: scorePos, max: 20,
              detail: `${posMonths}/${n} mesi positivi (${(posPct*100).toFixed(0)}%) → ${scorePos}/20 pt`,
              col: scorePos>=15?'var(--income)':scorePos>=7?'#e8a838':'var(--expense)'
            },
            {
              label: 'Trend delle spese',
              desc:  `Direzione della regressione lineare sulle uscite. Calanti ≤−3%/mese = ottimo (10 pt) · stabili = sufficiente · crescenti >+5%/mese = critico. Se stai risparmiando bene (≥10%) il punteggio minimo è 5 — spese crescenti sono meno allarmanti quando il margine è ampio.`,
              got: scoreTrend, max: 10,
              detail: `${expSlopePct>=0?'+':''}${expSlopePct.toFixed(1)}%/mese (${expSlope>=0?'+':''}${fmt.currency(expSlope)}) → ${scoreTrend}/10 pt`,
              col: scoreTrend>=7?'var(--income)':scoreTrend>=3?'#e8a838':'var(--expense)'
            },
            {
              label: 'Trend del risparmio',
              desc:  `Direzione della regressione lineare sul risparmio mensile (entrate − uscite). Cattura insieme l'effetto di entrate e uscite: se le spese crescono e le entrate restano stabili, il risparmio scende. Pendenza normalizzata sul reddito mediano. Crescita &gt;+3%/mese = ottimo · stabile = sufficiente · calo &gt;−3%/mese = critico. Se tutti i mesi sono positivi e risparmi ≥10%, il punteggio minimo è 8 — un calo di tendenza conta meno quando sei sempre in attivo.`,
              got: scoreIncTrend, max: 20,
              detail: `${savSlopePct>=0?'+':''}${savSlopePct.toFixed(1)}%/mese del reddito (${savSlope>=0?'+':''}${fmt.currency(savSlope)}/mese) → ${scoreIncTrend}/20 pt`,
              col: scoreIncTrend>=16?'var(--income)':scoreIncTrend>=7?'#e8a838':'var(--expense)'
            },
            {
              label: 'Stabilità delle entrate',
              desc:  `Semi-deviazione rispetto alla media interquartile (solo mesi sotto il reddito tipico — i bonus non spostano il riferimento). Semi-CV &lt; 3% = ottimo (10 pt) · &lt; 12% = buono · ≥ 30% = variabile.`,
              got: scoreVol, max: 10,
              detail: `Semi-CV ${incCV.toFixed(1)}% → ${scoreVol}/10 pt`,
              col: scoreVol>=7?'var(--income)':scoreVol>=4?'#e8a838':'var(--expense)'
            },
          ].map(c=>`
            <div>
              <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px">
                <span style="font-size:12px;font-weight:600">${c.label}</span>
                <span style="font-size:12px;font-weight:700;color:${c.col}">${c.got}<span style="color:var(--txt3);font-weight:400">/${c.max}</span></span>
              </div>
              <div style="height:5px;background:var(--border);border-radius:3px;margin-bottom:4px">
                <div style="width:${Math.max(0,c.got/c.max*100).toFixed(0)}%;height:100%;background:${c.col};border-radius:3px"></div>
              </div>
              <div class="health-desc">${c.desc}</div>
              <div class="health-desc" style="color:var(--txt2);margin-top:1px">${c.detail}</div>
            </div>`).join('')}
        </div>
      </div>

      <!-- KPI cards -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
        ${[
          ['Entrate totali',  fmt.currency(totalIncome),  'var(--income)'],
          ['Uscite totali',   fmt.currency(totalExpense), 'var(--expense)'],
          ['Risparmio netto', fmt.currency(totalSavings), totalSavings>=0?'var(--income)':'var(--expense)'],
          ['Tasso risparmio', avgSavingsRate.toFixed(1)+'%', avgSavingsRate>=15?'var(--income)':avgSavingsRate>=0?'#e8a838':'var(--expense)'],
        ].map(([label,val,col])=>`
          <div style="padding:14px 16px;background:var(--bg3);border-radius:12px">
            <div style="font-size:11px;color:var(--txt3);margin-bottom:4px">${label}</div>
            <div style="font-size:22px;font-weight:700;color:${col}">${val}</div>
            <div style="font-size:11px;color:var(--txt3);margin-top:2px">ultimi ${n} mesi</div>
          </div>`).join('')}
      </div>

      <!-- Riga 1: Tasso risparmio + Stabilità mensile -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">

        <!-- Tasso di risparmio -->
        <div class="card-section">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <div style="font-size:13px;font-weight:600">Tasso di risparmio</div>
            <div class="score-badge" style="color:${colS}">${scoreSavings > 0 ? '+' : ''}${scoreSavings} / 40 pt</div>
          </div>
          <div class="health-desc" style="margin-bottom:10px">
            Percentuale di entrate risparmiata ogni mese. Media: <strong style="color:${avgSavingsRate>=10?'var(--income)':avgSavingsRate>=0?'#e8a838':'var(--expense)'}">${avgSavingsRate.toFixed(1)}%</strong>.
            Soglie: ≥20% ottimo · ≥10% buono · ≥5% sufficiente · &lt;0% penalizza il punteggio.
          </div>
          <div style="height:150px"><canvas id="healthRateChart"></canvas></div>
        </div>

        <!-- Stabilità mensile -->
        <div class="card-section">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <div style="font-size:13px;font-weight:600">Stabilità mensile</div>
            <div class="score-badge" style="color:${colP}">${scorePos} / 20 pt</div>
          </div>
          <div class="health-desc" style="margin-bottom:12px">
            Mesi chiusi con entrate &gt; uscite: <strong style="color:${colP}">${posMonths} su ${n}</strong> (${(posPct*100).toFixed(0)}%).
            100% = 20 pt · ≥90% = 18 pt · ≥75% = 15 pt · ≥60% = 11 pt · ≥40% = 7 pt · ≥20% = 3 pt · &lt;20% = 0 pt.
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${monthCols.map((m,i) => {
              const s = savings[i];
              const pos = s > 0;
              const bg  = pos ? 'rgba(63,185,80,.15)' : 'rgba(248,81,73,.15)';
              const brd = pos ? 'rgba(63,185,80,.5)'  : 'rgba(248,81,73,.5)';
              const tc  = pos ? 'var(--income)' : 'var(--expense)';
              return `<div title="${m.label}: ${fmt.currency(s)}" style="padding:5px 10px;border-radius:8px;background:${bg};border:1px solid ${brd};min-width:52px;text-align:center">
                <div style="font-size:11px;font-weight:600;color:${tc}">${pos?'▲':'▼'} ${m.label}</div>
                <div style="font-size:10px;color:${tc};margin-top:2px">${fmt.currency(s)}</div>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- Riga 2: Trend spese + Trend entrate -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">

        <!-- Trend delle spese -->
        <div class="card-section">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <div style="font-size:13px;font-weight:600">Trend delle spese</div>
            <div class="score-badge" style="color:${colT}">${scoreTrend} / 10 pt</div>
          </div>
          <div class="health-desc" style="margin-bottom:10px">
            Regressione lineare sulle uscite mensili. Pendenza: <strong style="color:${expSlopePct<=0?'var(--income)':'var(--expense)'}">${expSlopePct>=0?'+':''}${expSlopePct.toFixed(1)}%/mese</strong>
            (${expSlope>=0?'+':''}${fmt.currency(expSlope)}/mese). Spese calanti = migliore punteggio. La linea tratteggiata indica la tendenza.
            ${avgSavingsRate>=10?'<em style="color:var(--income)">Stai risparmiando ≥10%: punteggio minimo garantito a 5 — le spese crescenti sono meno allarmanti con un margine di risparmio ampio.</em>':avgSavingsRate>=5?'<em style="color:#e8a838">Risparmio ≥5%: punteggio minimo garantito a 2.</em>':''}
          </div>
          <div style="height:150px"><canvas id="healthExpChart"></canvas></div>
        </div>

        <!-- Trend del risparmio -->
        <div class="card-section">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <div style="font-size:13px;font-weight:600">Trend del risparmio</div>
            <div class="score-badge" style="color:${colI}">${scoreIncTrend} / 20 pt</div>
          </div>
          <div class="health-desc" style="margin-bottom:10px">
            Regressione lineare sul <strong>risparmio mensile</strong> (entrate − uscite).
            Cattura insieme l'effetto di entrate e uscite: se le spese crescono mentre le entrate restano stabili, il risparmio scende e il punteggio peggiora.
            Pendenza attuale: <strong style="color:${savSlopePct>=0?'var(--income)':'var(--expense)'}">${savSlopePct>=0?'+':''}${savSlopePct.toFixed(1)}% del reddito/mese</strong>
            (${savSlope>=0?'+':''}${fmt.currency(savSlope)}/mese). La linea tratteggiata indica la tendenza.
            ${(posPct===1&&avgSavingsRate>=10)?'<em style="color:var(--income)">Tutti i mesi in attivo con risparmio ≥10%: punteggio minimo garantito a 8.</em>':(posPct>=0.75&&avgSavingsRate>=5)?'<em style="color:#e8a838">Situazione complessivamente positiva: punteggio minimo garantito a 4.</em>':''}
          </div>
          <div style="height:150px"><canvas id="healthIncChart"></canvas></div>
        </div>
      </div>

      <!-- Riga 3: Stabilità entrate (full width) -->
      <div class="card-section" style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <div style="font-size:13px;font-weight:600">Stabilità delle entrate</div>
          <div class="score-badge" style="color:${colV}">${scoreVol} / 10 pt</div>
        </div>
        <div style="display:grid;grid-template-columns:auto auto auto 1fr;gap:16px;align-items:center;margin-bottom:12px">
          <div>
            <div style="font-size:26px;font-weight:700;color:${colV}">${incCV.toFixed(1)}%</div>
            <div style="font-size:10px;color:var(--txt3)">Semi-CV (downside)</div>
          </div>
          <div style="width:1px;height:40px;background:var(--border)"></div>
          <div>
            <div style="font-size:20px;font-weight:600;color:var(--txt2)">− ${fmt.currency(incStddev)}</div>
            <div style="font-size:10px;color:var(--txt3)">Semi-deviazione</div>
          </div>
          <div class="health-desc" style="padding-left:8px">
            Variabilità delle entrate <em>al ribasso</em> rispetto alla media interquartile di <strong>${fmt.currency(incMedian)}/mese</strong> (reddito tipico).
            I mesi con bonus non spostano il riferimento e non penalizzano — conta solo quanto scendi sotto il tuo reddito abituale.
            Semi-CV &lt; 3% = ottimo · &lt; 12% = buono · &lt; 20% = discreto · ≥ 30% = variabile.
            ${n < 2 ? ' &nbsp;<em style="color:var(--expense)">Dati insufficienti: servono almeno 2 mesi.</em>' : ''}
          </div>
        </div>
        <div style="height:150px"><canvas id="healthVolChart"></canvas></div>
      </div>


    </div>`;

  // ── Grafici dettaglio ─────────────────────────────────────────────────────
  if (_healthRateChart) _healthRateChart.destroy();
  if (_healthExpChart)  _healthExpChart.destroy();
  if (_healthIncChart)  _healthIncChart.destroy();
  if (_healthVolChart)  _healthVolChart.destroy();
  _healthRateChart = _healthExpChart = _healthIncChart = _healthVolChart = null;

  // Tasso risparmio per mese — barre colorate + linee soglia
  const rateAvgLabelPlugin = {
    id: 'rateAvgLabel',
    afterDraw(chart) {
      const ctx = chart.ctx, area = chart.chartArea, yScale = chart.scales.y;
      const avg = chart.data.datasets[1].data[0];
      if (avg == null) return;
      const y = yScale.getPixelForValue(avg);
      const color = avg >= 10 ? 'rgba(63,185,80,.95)' : avg >= 5 ? 'rgba(232,168,56,.95)' : 'rgba(248,81,73,.95)';
      ctx.save();
      ctx.font = 'bold 10px sans-serif';
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.fillText('media ' + avg.toFixed(1) + '%', area.right + 4, y + 4);
      ctx.restore();
    }
  };

  _healthRateChart = new Chart(document.getElementById('healthRateChart'), {
    type: 'bar',
    plugins: [rateAvgLabelPlugin],
    data: {
      labels,
      datasets: [
        { label:'Tasso %', data:monthlyRates,
          backgroundColor: monthlyRates.map(r => r>=0?'rgba(63,185,80,.55)':'rgba(248,81,73,.55)'),
          borderColor:      monthlyRates.map(r => r>=0?'rgba(63,185,80,1)' :'rgba(248,81,73,1)'),
          borderWidth:1, order:1 },
        { type:'line', label:'Media', data:Array(n).fill(+avgSavingsRate.toFixed(1)),
          borderColor: avgSavingsRate>=10?'rgba(63,185,80,.85)':avgSavingsRate>=5?'rgba(232,168,56,.85)':'rgba(248,81,73,.85)',
          borderDash:[6,3], pointRadius:0, borderWidth:2, order:0, noLabels:true },
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      layout:{ padding:{ right:80 } },
      plugins:{
        legend:{ display:false },
        tooltip:{ filter: item => item.datasetIndex === 0, callbacks:{ label: ctx => ` ${ctx.parsed.y.toFixed(1)}%` } }
      },
      scales:{
        x:{ ticks:{color:cc.tick,font:{size:10}}, grid:{color:cc.grid} },
        y:{ ticks:{color:cc.tick, callback:v=>v+'%'}, grid:{color:cc.grid} }
      }
    }
  });

  // Trend spese — linea reale + regressione tratteggiata
  _healthExpChart = new Chart(document.getElementById('healthExpChart'), {
    type:'line',
    data:{
      labels,
      datasets:[
        { label:'Uscite', data:expenses,
          borderColor:'rgba(248,81,73,.8)', backgroundColor:'rgba(248,81,73,.1)',
          pointRadius:3, tension:.3, fill:true, borderWidth:2 },
        { label:'Tendenza', data:expRegLine,
          borderColor:'rgba(255,200,80,.75)', borderDash:[6,3],
          pointRadius:0, tension:0, fill:false, borderWidth:2 }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ labels:{color:cc.tick,boxWidth:12} }, tooltip:{ callbacks:{ label:ctx=>` ${ctx.dataset.label}: ${fmt.currency(ctx.parsed.y)}` } } },
      scales:{ x:{ticks:{color:cc.tick,font:{size:10}},grid:{color:cc.grid}}, y:{ticks:{color:cc.tick,callback:v=>fmt.currency(v)},grid:{color:cc.grid}} }
    }
  });

  // Trend risparmio — barre colorate + regressione tratteggiata
  _healthIncChart = new Chart(document.getElementById('healthIncChart'), {
    type:'bar',
    data:{
      labels,
      datasets:[
        { label:'Risparmio', data:savings,
          backgroundColor: savings.map(s => s>=0?'rgba(63,185,80,.5)':'rgba(248,81,73,.5)'),
          borderColor:      savings.map(s => s>=0?'rgba(63,185,80,.9)':'rgba(248,81,73,.9)'),
          borderWidth:1 },
        { type:'line', label:'Tendenza', data:savRegLine,
          borderColor:'rgba(255,200,80,.75)', borderDash:[6,3],
          pointRadius:0, tension:0, fill:false, borderWidth:2 }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ labels:{color:cc.tick,boxWidth:12} }, tooltip:{ callbacks:{ label:ctx=>` ${ctx.dataset.label}: ${fmt.currency(ctx.parsed.y)}` } } },
      scales:{ x:{ticks:{color:cc.tick,font:{size:10}},grid:{color:cc.grid}}, y:{ticks:{color:cc.tick,callback:v=>fmt.currency(v)},grid:{color:cc.grid}} }
    }
  });

  // Stabilità entrate — barre mensili + linea media + fasce ±1σ
  _healthVolChart = new Chart(document.getElementById('healthVolChart'), {
    type:'bar',
    data:{
      labels,
      datasets:[
        { label:'Entrate', data:incomes,
          backgroundColor:'rgba(63,185,80,.4)', borderColor:'rgba(63,185,80,.7)', borderWidth:1 },
        { type:'line', label:'Mediana', data:Array(n).fill(incMedian),
          borderColor:'rgba(232,168,56,.85)', borderDash:[5,3],
          pointRadius:0, fill:false, borderWidth:2 },
        { type:'line', label:'Soglia −1σ', data:Array(n).fill(Math.max(0, incMedian-incStddev)),
          borderColor:'rgba(248,81,73,.85)', borderDash:[3,4],
          pointRadius:0, fill:'origin', backgroundColor:'rgba(248,81,73,.08)', borderWidth:2 },
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{
        legend:{ labels:{ color:cc.tick, boxWidth:12 } },
        tooltip:{ callbacks:{ label:ctx=>` ${ctx.dataset.label}: ${fmt.currency(ctx.parsed.y)}` } }
      },
      scales:{ x:{ticks:{color:cc.tick,font:{size:10}},grid:{color:cc.grid}}, y:{ticks:{color:cc.tick,callback:v=>fmt.currency(v)},grid:{color:cc.grid}} }
    }
  });

}

/* ─── Analytics: Saldo Conti ────────────────────────────────────────────── */
let _accBalChart = null;
let _accBalData  = null;   // { accounts, byAccount: {aid: {ym: balance}}, monthCols }
let _accBalSel   = null;   // Set di account_id selezionati

async function renderAnalyticsAccBalance() {
  const el = document.getElementById('analyticsContent');
  if (!el) return;
  el.innerHTML = '<p style="padding:20px;color:var(--txt2)">Caricamento…</p>';

  const now = new Date();
  const toYm = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  const prevYm = toYm(new Date(now.getFullYear(), now.getMonth()-1, 1));
  const oldestYm = _analyticsOldestYm || prevYm;
  const startYm = _analyticsStartYm  || oldestYm;
  const endYm   = _analyticsEndYm    || prevYm;

  // Mesi da mostrare
  const monthCols = [];
  for (let d = new Date(startYm + '-01'), end = new Date(endYm + '-01'); d <= end; d = new Date(d.getFullYear(), d.getMonth()+1, 1))
    monthCols.push({ ym: toYm(d), label: d.toLocaleDateString('it-IT', { month:'short', year:'2-digit' }) });

  const fetchMonths = Math.max(1,
    (now.getFullYear() - new Date(startYm+'-01').getFullYear()) * 12 +
    (now.getMonth()    - new Date(startYm+'-01').getMonth()) + 1);

  let raw;
  try { raw = await api.getAccountBalanceHistory(fetchMonths); }
  catch(e) { el.innerHTML = `<p style="padding:20px;color:var(--expense)">Errore: ${e.message}</p>`; return; }
  if (!raw || !raw.accounts) { el.innerHTML = `<p style="padding:20px;color:var(--expense)">Dati non disponibili</p>`; return; }
  const accounts = raw.accounts;

  // Inizializza selezione: solo conti correnti (checking) non chiusi
  if (!_accBalSel) {
    const checking = accounts.filter(a => !a.is_closed && a.type === 'checking');
    _accBalSel = new Set((checking.length ? checking : accounts.filter(a => !a.is_closed)).map(a => a.id));
  }

  // byAccount: aid -> ym -> balance
  const byAccount = {};
  for (const r of raw.monthly) {
    if (!byAccount[r.account_id]) byAccount[r.account_id] = {};
    byAccount[r.account_id][r.ym] = r.balance;
  }

  _accBalData = { accounts, byAccount, monthCols };
  _renderAccBalChart();
}

function _renderAccBalChart() {
  const el = document.getElementById('analyticsContent');
  if (!el || !_accBalData) return;
  const { accounts, byAccount, monthCols } = _accBalData;
  const sel = _accBalSel;

  const selAccounts = accounts.filter(a => sel.has(a.id));
  const labels = monthCols.map(m => m.label);

  // Colori per conto (usa color dal DB, altrimenti palette)
  const palette = ['#58a6ff','#3fb950','#ff7b72','#e3b341','#bc8cff','#79c0ff','#56d364','#ffa657','#f78166','#d2a8ff'];
  const accColor = (a, i) => a.color || palette[i % palette.length];

  // Dataset: stacked area per conto
  const datasets = selAccounts.map((a, i) => ({
    type: 'bar',
    label: `${a.icon||''} ${a.name}`,
    data: monthCols.map(m => {
      const b = byAccount[a.id]?.[m.ym];
      return b !== undefined ? Math.round(b * 100) / 100 : 0;
    }),
    backgroundColor: accColor(a, i) + 'cc',
    borderColor: accColor(a, i),
    borderWidth: 1,
    stack: 'saldo',
  }));

  // Totale come linea sopra le barre
  const totals = monthCols.map(m =>
    selAccounts.reduce((s, a) => s + (byAccount[a.id]?.[m.ym] ?? 0), 0)
  );
  datasets.push({
    type: 'line',
    label: 'Totale',
    data: totals,
    borderColor: 'rgba(255,255,255,0.7)',
    backgroundColor: 'transparent',
    pointRadius: monthCols.length <= 18 ? 3 : 1,
    pointHoverRadius: 5,
    borderWidth: 2,
    borderDash: [5, 3],
    tension: .3,
    order: -1,
  });

  const cc = chartColors();

  // Costruisce la tabella
  const tableRows = monthCols.map(m => {
    const cells = selAccounts.map(a => {
      const v = byAccount[a.id]?.[m.ym];
      return `<td class="text-right">${v !== undefined ? fmt.currency(v) : '—'}</td>`;
    }).join('');
    const tot = selAccounts.reduce((s, a) => s + (byAccount[a.id]?.[m.ym] ?? 0), 0);
    return `<tr><td>${m.label}</td>${cells}<td class="text-right" style="font-weight:700">${fmt.currency(tot)}</td></tr>`;
  }).join('');

  const headerCells = selAccounts.map((a,i) =>
    `<th class="text-right" style="color:${accColor(a,i)}">${a.icon||''} ${a.name}</th>`
  ).join('');

  // Selettore conti
  const accButtons = accounts.map((a, i) => {
    const on = sel.has(a.id);
    const col = accColor(a, i);
    return `<button type="button" onclick="_toggleAccBal(${a.id})"
      style="padding:4px 12px;font-size:12px;border-radius:16px;border:1.5px solid ${col};cursor:pointer;
             background:${on ? col+'33' : 'transparent'};color:${on ? col : 'var(--txt2)'};
             font-weight:${on ? '600' : '400'};transition:all .15s;white-space:nowrap">
      ${a.icon||''} ${a.name}${a.is_closed ? ' ✕' : ''}
    </button>`;
  }).join('');

  el.innerHTML = `
    <div style="padding:12px 0 8px">
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">${accButtons}</div>
      <div style="height:380px;margin-bottom:20px"><canvas id="accBalChart"></canvas></div>
      <table class="analytics-table">
        <thead><tr>
          <th>Mese</th>${headerCells}<th class="text-right">Totale</th>
        </tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>`;

  if (_accBalChart) { _accBalChart.destroy(); _accBalChart = null; }
  _accBalChart = new Chart(document.getElementById('accBalChart'), {
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmt.currency(ctx.parsed.y)}` } },
        legend: { labels: { color: cc.tick, boxWidth: 12 } },
        zoom: zoomOpts(),
      },
      scales: {
        x: { stacked: true, ticks: { color: cc.tick }, grid: { color: cc.grid } },
        y: { stacked: true, ticks: { color: cc.tick, callback: v => fmt.currency(v) }, grid: { color: cc.grid } },
      },
    },
  });
}

window._toggleCfAcc = (aid) => {
  if (_cfAccSel.has(aid)) {
    if (_cfAccSel.size > 1) _cfAccSel.delete(aid);
  } else {
    _cfAccSel.add(aid);
  }
  renderSchedCashflow();
};

window._toggleAccBal = (aid) => {
  if (_accBalSel.has(aid)) {
    if (_accBalSel.size > 1) _accBalSel.delete(aid);
  } else {
    _accBalSel.add(aid);
  }
  _renderAccBalChart();
};

/* ─── Analytics: Andamento Categoria ─────────────────────────────────────── */
let _analyticsTrendCatId  = null;
let _analyticsTrendChart  = null;
let _analyticsTrendCache  = null; // { monthCols, catMap }
let _trendIncludeZero     = true;

async function renderAnalyticsTrend() {
  const el = document.getElementById('analyticsContent');
  if (!el) return;
  el.innerHTML = '<p style="padding:20px;color:var(--txt2)">Caricamento…</p>';

  const { fetchMonths, monthCols } = _analyticsMonthRange();
  const rows = await api.getCategoryMonthTable(fetchMonths);

  const catMap = {};
  for (const r of rows) {
    if (!catMap[r.id]) catMap[r.id] = { id: r.id, name: r.name, type: r.type, color: r.color, icon: r.icon, parent_name: r.parent_name || null, m: {} };
    catMap[r.id].m[r.ym] = r.total;
  }
  _analyticsTrendCache = { monthCols, catMap };

  const cats = Object.values(catMap).sort((a, b) => {
    if (a.type !== b.type) return a.type === 'expense' ? -1 : 1;
    const pa = a.parent_name || a.name, pb = b.parent_name || b.name;
    return pa.localeCompare(pb) || a.name.localeCompare(b.name);
  });

  if (!_analyticsTrendCatId || !catMap[_analyticsTrendCatId]) {
    _analyticsTrendCatId = cats[0]?.id || null;
  }

  const optLabel = c => `${c.type === 'expense' ? '↑' : '↓'} ${c.parent_name ? c.parent_name + ' › ' : ''}${c.icon || ''} ${c.name}`;

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap">
      <label style="font-size:13px;color:var(--txt2)">Categoria:</label>
      <select id="trendCatSelect" class="form-control" style="min-width:240px;max-width:360px">
        ${cats.map(c => `<option value="${c.id}"${c.id === _analyticsTrendCatId ? ' selected' : ''}>${optLabel(c)}</option>`).join('')}
      </select>
      <div id="trendSlopeInfo" style="margin-left:8px;font-size:13px"></div>
      <label style="margin-left:auto;display:flex;align-items:center;gap:6px;font-size:12px;color:var(--txt2);cursor:pointer;white-space:nowrap">
        <input type="checkbox" id="trendIncludeZero" ${_trendIncludeZero ? 'checked' : ''}>
        Includi mesi a zero nel trend
      </label>
    </div>
    <div style="font-size:11px;color:var(--txt3);margin-bottom:10px">
      La linea <span style="color:rgba(185,120,255,1);font-weight:600">Trend</span> usa il metodo Theil-Sen: mediana delle pendenze tra tutte le coppie di mesi. Più robusto della regressione lineare classica — i mesi anomali (es. spese straordinarie) non distorcono la tendenza.
    </div>
    <div style="position:relative;height:380px"><canvas id="trendChart"></canvas></div>`;

  document.getElementById('trendCatSelect').onchange = function() {
    _analyticsTrendCatId = parseInt(this.value);
    _renderAnalyticsTrendChart();
  };
  document.getElementById('trendIncludeZero').onchange = function() {
    _trendIncludeZero = this.checked;
    _renderAnalyticsTrendChart();
  };

  _renderAnalyticsTrendChart();
}

function _renderAnalyticsTrendChart() {
  if (!_analyticsTrendCache) return;
  const { monthCols, catMap } = _analyticsTrendCache;
  const cat = catMap[_analyticsTrendCatId];
  if (!cat) return;

  const values = monthCols.map(m => cat.m[m.ym] || 0);
  const labels  = monthCols.map(m => m.label);
  const n = values.length;

  // Media (linea piatta)
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = n ? sum / n : 0;
  const avgData = values.map(() => avg);

  // Trend (Theil-Sen: mediana delle pendenze tra tutte le coppie di punti — robusto agli outlier)
  const tsPoints = _trendIncludeZero
    ? values.map((v, i) => ({ v, i }))
    : values.map((v, i) => ({ v, i })).filter(p => p.v > 0);
  const tsPts = tsPoints.length >= 2 ? tsPoints : values.map((v, i) => ({ v, i }));
  const slopes = [];
  for (let a = 0; a < tsPts.length; a++)
    for (let b = a + 1; b < tsPts.length; b++)
      slopes.push((tsPts[b].v - tsPts[a].v) / (tsPts[b].i - tsPts[a].i));
  slopes.sort((a, b) => a - b);
  const slope = slopes.length === 0 ? 0 : slopes.length % 2 === 0
    ? (slopes[slopes.length/2-1] + slopes[slopes.length/2]) / 2
    : slopes[Math.floor(slopes.length/2)];
  // Intercetta: mediana(y) - slope * mediana(x) sui punti usati
  const tsXs = tsPts.map(p => p.i).sort((a,b) => a-b);
  const tsVs = [...tsPts.map(p => p.v)].sort((a,b) => a-b);
  const m = tsPts.length;
  const xMedian = m%2===0 ? (tsXs[m/2-1]+tsXs[m/2])/2 : tsXs[Math.floor(m/2)];
  const vMedian = m%2===0 ? (tsVs[m/2-1]+tsVs[m/2])/2 : tsVs[Math.floor(m/2)];
  const intercept = vMedian - slope * xMedian;
  const trendData = values.map((_, i) => Math.max(0, intercept + slope * i));

  // Mostra pendenza leggibile
  const slopeEl = document.getElementById('trendSlopeInfo');
  if (slopeEl && n >= 2) {
    const sign = slope >= 0 ? '+' : '';
    const pctYear = avg ? (slope * 12 / avg * 100) : 0;
    const pctSign = pctYear >= 0 ? '+' : '';
    const color = slope >= 0 ? 'var(--expense)' : 'var(--income)';
    slopeEl.innerHTML = `<span style="color:rgba(100,160,255,1);font-weight:600">${fmt.currency(avg)}/mese</span>`
      + `<span style="color:var(--txt3);margin-left:6px;margin-right:12px">media</span>`
      + `<span style="color:${color};font-weight:600">${sign}${fmt.currency(slope)}/mese</span>`
      + `<span style="color:var(--txt3);margin-left:8px">(${pctSign}${pctYear.toFixed(1)}%/anno)</span>`;
  } else if (slopeEl) {
    slopeEl.innerHTML = '';
  }

  const cc = chartColors();
  const t = document.documentElement.dataset.theme;
  const isLight    = t === 'carta' || t === 'salvia';
  const lineBlue   = isLight ? 'rgba(20,70,190,1)'  : 'rgba(100,160,255,1)';
  const linePurple = isLight ? 'rgba(100,30,190,1)' : 'rgba(185,120,255,1)';
  const barColor = (cat.color && cat.color.startsWith('#') && cat.color.length === 7)
    ? cat.color + '66'
    : 'rgba(88,166,255,.4)';

  // Plugin inline: etichette sui punti di media e trend
  const trendLabelPlugin = {
    id: 'trendLabels',
    afterDatasetsDraw(chart) {
      const ctx = chart.ctx;
      chart.data.datasets.forEach((ds, i) => {
        if (ds.type !== 'line') return;
        const meta = chart.getDatasetMeta(i);
        if (!meta.visible) return;
        ctx.save();
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = ds.borderColor;
        ctx.textAlign = 'center';
        if (ds.noLabels) { ctx.restore(); return; }
        meta.data.forEach((pt, j) => {
          const val = ds.data[j];
          if (val == null) return;
          const text = fmt.currency(val);
          ctx.fillText(text, pt.x, pt.y - 7);
        });
        ctx.restore();
      });
    }
  };

  if (_analyticsTrendChart) { _analyticsTrendChart.destroy(); _analyticsTrendChart = null; }
  _analyticsTrendChart = new Chart(document.getElementById('trendChart'), {
    plugins: [trendLabelPlugin],
    data: {
      labels,
      datasets: [
        { type: 'bar',  label: 'Importo',  data: values,    backgroundColor: barColor, order: 2 },
        { type: 'line', label: 'Media',    data: avgData,   borderColor: lineBlue,   borderWidth: 3, borderDash: [8, 4], pointRadius: 0, tension: 0, order: 1, noLabels: true },
        { type: 'line', label: 'Trend',    data: trendData, borderColor: linePurple, borderWidth: 3, pointRadius: 0, tension: 0, order: 1 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      layout: { padding: { top: 20 } },
      plugins: {
        tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmt.currency(ctx.parsed.y)}` } },
        legend:  { labels: { color: cc.tick, boxWidth: 12 } },
        zoom: zoomOpts()
      },
      scales: {
        x: { ticks: { color: cc.tick }, grid: { color: cc.grid } },
        y: { beginAtZero: true, ticks: { color: cc.tick, callback: v => fmt.currency(v) }, grid: { color: cc.grid } }
      }
    }
  });
}

async function renderReports() {
  const pg = document.getElementById('pg-reports');
  pg.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
      <h2 style="font-size:var(--fs-xl,18px);font-weight:700">Resoconti</h2>
      <div class="flex-center-8">
        <button class="btn btn-primary" onclick="showReportModal()">＋ Nuovo resoconto</button>
      </div>
    </div>
    <div id="rReportHeader" style="margin-bottom:16px"></div>
    <div id="rResults"></div>`;

  if (_currentReportId !== null) {
    const reports = await api.getReports();
    const r = reports.find(x => x.id === _currentReportId);
    if (r) { _loadReportConfig(r); _updateReportHeader(r); return; }
  }
  if (Object.keys(_reportFilters||{}).length || _reportGroupby !== 'none' || _reportChartType !== 'none') {
    _updateReportHeader(null);
    runReport();
  }
}


async function renderNatureReport() {
  const el = document.getElementById('analyticsContent') || document.getElementById('rNatureContent');
  if (!el) return;
  el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--txt3)">⏳ Caricamento...</div>';

  const startYm = _analyticsStartYm || _analyticsOldestYm;
  const endYm   = _analyticsEndYm;
  const filter  = (startYm && endYm)
    ? { date_from: startYm + '-01', date_to: endYm + '-31' }
    : {};
  const data   = await api.getExpenseNatureReport(filter);
  const byNature = data.by_nature   || [];
  const byCat    = data.by_category || [];
  const totalAll = byNature.reduce((s, r) => s + (Number(r.total) || 0), 0);

  const NATURE = {
    essenziale: { label: 'Essenziale', color: '#3fb950', icon: '🟢' },
    variabile:  { label: 'Variabile',  color: '#e3b341', icon: '🟡' },
    superflua:  { label: 'Superflua',  color: '#f85149', icon: '🔴' },
    '':         { label: 'Non classificata', color: 'var(--txt3)', icon: '⬜' },
  };
  const ORDER = ['essenziale', 'variabile', 'superflua', ''];

  const cards = ORDER.map(n => {
    const row  = byNature.find(r => r.nature === n);
    const tot  = Number(row?.total || 0);
    const cnt  = Number(row?.tx_count || 0);
    const pct  = totalAll > 0 ? (tot / totalAll * 100).toFixed(1) : '0.0';
    const m    = NATURE[n];
    return `
      <div class="card" style="padding:16px;flex:1;min-width:130px">
        <div style="font-size:18px;margin-bottom:4px">${m.icon}</div>
        <div style="font-size:12px;font-weight:700;color:var(--txt2);text-transform:uppercase;letter-spacing:.5px">${m.label}</div>
        <div style="font-size:22px;font-weight:700;color:${m.color};margin:6px 0">${fmt.currency(tot)}</div>
        <div style="font-size:11px;color:var(--txt3)">${pct}% · ${cnt} transazioni</div>
        <div style="margin-top:8px;height:4px;background:var(--bg3);border-radius:2px">
          <div style="height:4px;background:${m.color};border-radius:2px;width:${pct}%"></div>
        </div>
      </div>`;
  }).join('');

  const barSegments = ORDER
    .flatMap(n => {
      const r = byNature.find(x => x.nature === n);
      if (!r || !(Number(r.total) > 0)) return [];
      const tot = Number(r.total);
      const pct = (tot / totalAll * 100).toFixed(1);
      return [`<div title="${NATURE[n].label}: ${pct}% (${fmt.currency(tot)})"
        style="flex:${pct};background:${NATURE[n].color};min-width:3px;transition:flex .4s"></div>`];
    }).join('');

  const sections = ORDER.map(n => {
    const cats = byCat.filter(r => r.nature === n);
    if (!cats.length) return '';
    const m = NATURE[n];
    const rows = cats.map(c => {
      const tot  = Number(c.total);
      const pct  = totalAll > 0 ? (tot / totalAll * 100).toFixed(1) : '0.0';
      const df   = filter.date_from || '';
      const dt   = filter.date_to   || '';
      return `<tr class="nature-cat-row" onclick="txFilters={range:'custom',date_from:'${df}',date_to:'${dt}',category_id:${c.cat_id},type:'expense'};navigate('transactions')" title="Vedi transazioni">
        <td style="padding:5px 8px">
          <span style="background:${c.color}22;color:${c.color};padding:2px 8px;border-radius:4px;font-size:12px">${c.icon} ${c.cat_name}</span>
        </td>
        <td style="padding:5px 8px;text-align:right;font-weight:600">${fmt.currency(tot)}</td>
        <td style="padding:5px 8px;text-align:right;color:var(--txt3);font-size:11px">${c.tx_count} tx</td>
        <td style="padding:5px 8px;text-align:right;color:var(--txt3);font-size:11px">${pct}%</td>
      </tr>`;
    }).join('');
    return `
      <div style="margin-top:20px">
        <div style="font-size:13px;font-weight:700;color:${m.color};margin-bottom:8px">${m.icon} ${m.label}</div>
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="color:var(--txt3);border-bottom:1px solid var(--border)">
            <th style="text-align:left;padding:4px 8px">Categoria</th>
            <th style="text-align:right;padding:4px 8px">Importo</th>
            <th style="text-align:right;padding:4px 8px">Tx</th>
            <th style="text-align:right;padding:4px 8px">%</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }).join('');

  el.innerHTML = `
    ${totalAll > 0 ? `
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px">${cards}</div>
    <div class="card" style="padding:12px 16px;margin-bottom:4px">
      <div style="font-size:11px;color:var(--txt3);margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">Ripartizione totale · ${fmt.currency(totalAll)}</div>
      <div style="display:flex;height:14px;border-radius:7px;overflow:hidden;gap:2px">${barSegments}</div>
    </div>
    ${sections}` : '<div style="text-align:center;color:var(--txt3);padding:60px">Nessuna uscita nel periodo selezionato.</div>'}`;
}


async function _updateReportHeader(r) {
  const headerEl = document.getElementById('rReportHeader');
  if (!headerEl) return;


  const f = r
    ? (() => { try { return JSON.parse(r.filters_json || '{}'); } catch { return {}; } })()
    : (_reportFilters || {});

  const accIds    = f.account_ids?.length ? f.account_ids : (f.account_id ? [f.account_id] : []);
  const needPresets = f.range && f.range !== 'custom' && !RANGE_DEFAULTS.find(o => o.v === f.range);

  const [accounts, cats, tags, rangePresets] = await Promise.all([
    accIds.length   ? api.getAccounts()     : Promise.resolve([]),
    f.category_id   ? api.getCategories()   : Promise.resolve([]),
    f.tag_ids?.length ? api.getTags()       : Promise.resolve([]),
    needPresets     ? api.getRangePresets() : Promise.resolve([]),
  ]);

  const chip = label => `<span class="r-chip">${label}</span>`;
  const chips = [];

  if (f.range && f.range !== 'custom') {
    const allRanges = [...RANGE_DEFAULTS, ...rangePresets.map(p => ({v:p.range_key, l:p.label}))];
    const found = allRanges.find(o => o.v === f.range);
    chips.push(chip(`📅 ${found ? found.l : f.range}`));
  } else if (f.date_from || f.date_to) {
    chips.push(chip(`📅 ${f.date_from||'…'} → ${f.date_to||'…'}`));
  }

  if (f.type) {
    const typeL = {income:'↑ Entrate', expense:'↓ Uscite', transfer:'⇄ Trasferimenti'};
    chips.push(chip(typeL[f.type] || f.type));
  }

  if (accIds.length) {
    const names = accIds.map(id => accounts.find(a => String(a.id) === String(id))?.name || id);
    chips.push(chip(`🏦 ${names.join(', ')}`));
  }

  if (f.category_id) {
    const cat = cats.find(c => c.id === f.category_id);
    chips.push(chip(`🏷️ ${cat ? cat.name : f.category_id}`));
  }

  if (f.tag_ids?.length) {
    const tagNames = f.tag_ids.map(tid => tags.find(t => t.id === tid)?.name || tid);
    chips.push(chip(`🔖 ${tagNames.join(', ')}`));
  }

  if (f.reconciled != null) {
    chips.push(chip(f.reconciled ? '✓ Verificate' : '⚠ Da verificare'));
  }

  if (f.amount_op && f.amount_val != null && !isNaN(f.amount_val)) {
    const opL = {gt:'>', lt:'<', eq:'='};
    chips.push(chip(`€ ${opL[f.amount_op]||f.amount_op} ${fmt.currency(f.amount_val)}`));
  }

  if (f.search) chips.push(chip(`🔍 "${f.search}"`));

  if (f.has_attachment) chips.push(chip(f.has_attachment === '1' ? '📎 Con allegato' : '📎 Senza allegato'));

  const groupby = r ? r.groupby : _reportGroupby;
  if (groupby && groupby !== 'none') {
    const groupL = {category:'Per categoria', month:'Per mese', account:'Per conto', tag:'Per tag'};
    chips.push(chip(`⊞ ${groupL[groupby] || groupby}`));
  }

  const nameHtml  = r ? `<span class="r-report-name">📋 ${r.name}</span> <button class="btn btn-ghost btn-icon" onclick="showReportModal(${r.id})" title="Modifica">✏️</button>` : '';
  const chipsHtml = chips.length ? `<div class="r-chips">${chips.join('')}</div>` : '';
  headerEl.innerHTML = `${nameHtml}${chipsHtml}`;
}

function _loadReportConfig(r) {
  _currentReportId = r.id;
  _reportGroupby   = r.groupby    || 'none';
  _reportChartType = r.chart_type || 'none';
  try { _reportFilters = JSON.parse(r.filters_json || '{}'); } catch { _reportFilters = {}; }
  runReport();
}

async function runReport() {
  const f         = _reportFilters || {};
  const groupby   = _reportGroupby   || 'none';
  const chartType = _reportChartType || 'none';

  const filters = {};
  // Periodo: range dinamico o date statiche (custom / backward compat)
  if (f.range && f.range !== 'custom') {
    Object.assign(filters, rangeToFilter(f.range));
  } else {
    if (f.date_from) filters.date_from = f.date_from;
    if (f.date_to)   filters.date_to   = f.date_to;
  }
  if (f.account_ids?.length) filters.account_ids = f.account_ids;
  else if (f.account_id)    filters.account_id  = f.account_id; // backward compat
  if (f.type)           filters.type           = f.type;
  if (f.category_id)    filters.category_id    = f.category_id;
  if (f.search)         filters.search         = f.search;
  if (f.has_attachment) filters.has_attachment = f.has_attachment;

  const resultsEl = document.getElementById('rResults');
  if (resultsEl) resultsEl.innerHTML = `<div style="text-align:center;padding:40px;color:var(--txt3)">⏳ Caricamento…</div>`;

  let txs = await api.getTransactions(filters);

  // Client-side post-filters
  const reconc = f.reconciled;
  if (reconc != null) txs = txs.filter(t => (t.reconciled||0) === reconc);
  const tagIds = f.tag_ids || [];
  if (tagIds.length) {
    txs = txs.filter(t => t.tags?.length && tagIds.every(tid => t.tags.some(tag => Number(tag.id) === tid)));
  }
  const amtOp = f.amount_op, amtVal = f.amount_val;
  if (amtOp && amtVal != null && !isNaN(amtVal)) {
    txs = txs.filter(t => {
      const a = Math.abs(t.amount);
      if (amtOp==='gt') return a > amtVal;
      if (amtOp==='lt') return a < amtVal;
      if (amtOp==='eq') return Math.abs(a-amtVal) < 0.005;
      return true;
    });
  }

  renderReportResults(txs, groupby, chartType);
}

async function showReportModal(reportId = null) {
  const [accounts, categories, tags, reports, rangePresets] = await Promise.all([
    api.getAccounts(), api.getCategories(), api.getTags(), api.getReports(), api.getRangePresets(),
  ]);

  const r = reportId != null ? reports.find(x => x.id === reportId) : null;
  let f = {}, initGroupby = _reportGroupby || 'none', initChartType = _reportChartType || 'none', initName = '';

  if (r) {
    try { f = JSON.parse(r.filters_json || '{}'); } catch {}
    initGroupby   = r.groupby    || 'none';
    initChartType = r.chart_type || 'none';
    initName      = r.name       || '';
  } else if (reportId === null) {
    f = _reportFilters || {};
  }

  const sel = (val, opt) => val == opt ? ' selected' : '';
  // Se è salvato un range dinamico usalo; se ci sono date statiche = custom; altrimenti vuoto
  const initRange = f.range || (f.date_from || f.date_to ? 'custom' : '');
  const bodyHtml = `
    <div class="form-group">
      <label class="form-label">Nome del resoconto <span style="color:var(--txt3);font-weight:400">(facoltativo — compila per salvare)</span></label>
      <input type="text" class="form-control" id="rmName" value="${initName.replace(/"/g,'&quot;')}" placeholder="es. Spese famiglia 2026" autocomplete="off">
      ${r ? `<div style="font-size:11px;color:var(--txt3);margin-top:3px">Mantieni il nome per aggiornare, cambialo per salvarne una copia.</div>` : ''}
    </div>
    <hr style="border:none;border-top:1px solid var(--border);margin:8px 0 12px">
    <div class="report-modal-grid">
      <div class="form-group">
        <label class="form-label">Periodo</label>
        <select class="form-control" id="rmRange" onchange="rmOnRangeChange(this.value)">
          ${buildRangeOptions(rangePresets, true, initRange)}
        </select>
      </div>
      <div></div>
      <div class="form-group" id="rmDateFromGroup" style="display:${initRange==='custom'?'':'none'}">
        <label class="form-label">Dal</label>
        <input type="date" class="form-control" id="rmDateFrom" value="${f.date_from||''}">
      </div>
      <div class="form-group" id="rmDateToGroup" style="display:${initRange==='custom'?'':'none'}">
        <label class="form-label">Al</label>
        <input type="date" class="form-control" id="rmDateTo" value="${f.date_to||''}">
      </div>
      <div class="form-group" style="grid-column:span 2">
        <label class="form-label">Conti</label>
        <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:3px" id="rmAccountsSelector">
          ${accounts.filter(a=>!a.is_closed).map(a=>`<span class="tag-chip${(f.account_ids||[]).includes(a.id)?' selected':''}" style="--tc:${a.color||'var(--accent)'}" data-acc-id="${a.id}" onclick="this.classList.toggle('selected')">${a.icon||''} ${a.name}</span>`).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Tipo</label>
        <select class="form-control" id="rmType">
          <option value="">Tutti</option>
          <option value="income"${sel(f.type,'income')}>Entrate</option>
          <option value="expense"${sel(f.type,'expense')}>Uscite</option>
          <option value="transfer"${sel(f.type,'transfer')}>Trasferimenti</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Stato</label>
        <select class="form-control" id="rmReconciled">
          <option value="">Tutte</option>
          <option value="1"${f.reconciled===1?' selected':''}>Solo conciliate</option>
          <option value="0"${f.reconciled===0?' selected':''}>Solo da verificare</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Categoria</label>
        <select class="form-control" id="rmCategory">
          <option value="">Tutte</option>
          ${categories.filter(c=>c.type!=='transfer').map(c=>
            `<option value="${c.id}"${sel(f.category_id,c.id)}>${c.parent_id?'└ ':''}${c.icon} ${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Descrizione</label>
        <input type="text" class="form-control" id="rmSearch" value="${(f.search||'').replace(/"/g,'&quot;')}" placeholder="Cerca…">
      </div>
      <div class="form-group">
        <label class="form-label">Allegato</label>
        <select class="form-control" id="rmHasAttachment">
          <option value="">Tutti</option>
          <option value="1"${f.has_attachment==='1'?' selected':''}>📎 Con allegato</option>
          <option value="0"${f.has_attachment==='0'?' selected':''}>Senza allegato</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Importo</label>
        <div class="report-amt-row">
          <select class="form-control" id="rmAmtOp">
            <option value="">—</option>
            <option value="gt"${sel(f.amount_op,'gt')}>＞</option>
            <option value="lt"${sel(f.amount_op,'lt')}>＜</option>
            <option value="eq"${sel(f.amount_op,'eq')}>=</option>
          </select>
          <input type="number" class="form-control" id="rmAmtVal"
                 value="${f.amount_val!=null?f.amount_val:''}" placeholder="Valore" min="0" step="0.01">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Raggruppa per</label>
        <select class="form-control" id="rmGroupby">
          <option value="none">Nessuno (lista)</option>
          <option value="month"${sel(initGroupby,'month')}>Mese</option>
          <option value="category"${sel(initGroupby,'category')}>Categoria</option>
          <option value="account"${sel(initGroupby,'account')}>Conto</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Grafico</label>
        <select class="form-control" id="rmChartType">
          <option value="none">Nessuno</option>
          <option value="bar"${sel(initChartType,'bar')}>Barre</option>
          <option value="line"${sel(initChartType,'line')}>Linea</option>
          <option value="pie"${sel(initChartType,'pie')}>Torta</option>
        </select>
      </div>
    </div>
    ${tags.length ? `
    <div class="form-group" style="margin-top:6px">
      <label class="form-label">Tag</label>
      <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:3px" id="rmTagsSelector">
        ${tags.filter(t=>!t.is_system).map(t=>`<span class="tag-chip${(f.tag_ids||[]).includes(t.id)?' selected':''}" style="--tc:${t.color}" data-tag-id="${t.id}" onclick="this.classList.toggle('selected')">${t.name}</span>`).join('')}
      </div>
    </div>` : ''}`;

  openModal(
    r ? `✏️ Modifica: ${r.name}` : '📊 Nuovo resoconto',
    bodyHtml,
    async () => {
      const name      = document.getElementById('rmName')?.value.trim() || '';
      const dateFrom  = document.getElementById('rmDateFrom')?.value  || '';
      const dateTo    = document.getElementById('rmDateTo')?.value    || '';
      const accountIds = [...document.querySelectorAll('#rmAccountsSelector .tag-chip.selected')]
                           .map(el => parseInt(el.dataset.accId));
      const type      = document.getElementById('rmType')?.value      || '';
      const reconc    = document.getElementById('rmReconciled')?.value;
      const catId     = document.getElementById('rmCategory')?.value  || '';
      const search    = document.getElementById('rmSearch')?.value    || '';
      const amtOp     = document.getElementById('rmAmtOp')?.value     || '';
      const amtVal    = parseFloat(document.getElementById('rmAmtVal')?.value);
      const groupby   = document.getElementById('rmGroupby')?.value   || 'none';
      const chartType = document.getElementById('rmChartType')?.value || 'none';
      const tagIds        = [...document.querySelectorAll('#rmTagsSelector .tag-chip.selected')]
                              .map(el => parseInt(el.dataset.tagId));
      const hasAttachment = document.getElementById('rmHasAttachment')?.value || '';
      const range         = document.getElementById('rmRange')?.value || '';

      const filters = {};
      // Periodo: salva range dinamico; per custom salva le date statiche
      if (range === 'custom') {
        if (dateFrom) filters.date_from = dateFrom;
        if (dateTo)   filters.date_to   = dateTo;
        filters.range = 'custom';
      } else if (range) {
        filters.range = range;
      }
      if (accountIds.length) filters.account_ids = accountIds;
      if (type)           filters.type           = type;
      if (catId)          filters.category_id    = parseInt(catId);
      if (search)         filters.search         = search;
      if (hasAttachment)  filters.has_attachment = hasAttachment;

      _reportGroupby   = groupby;
      _reportChartType = chartType;
      _reportFilters   = { ...filters,
        amount_op: amtOp || '', amount_val: isNaN(amtVal) ? null : amtVal,
        tag_ids: tagIds, reconciled: reconc !== '' && reconc != null ? parseInt(reconc) : null,
      };

      if (name) {
        const data = {
          name,
          filters_json: JSON.stringify(_reportFilters),
          groupby, chart_type: chartType,
        };
        if (r && name === r.name) data.id = r.id;
        try {
          const saved = await api.saveReport(data);
          _currentReportId = saved.id;
          toast(`"${name}" ${data.id ? 'aggiornato' : 'salvato'}`);
        } catch(e) { toast(e.message, 'error'); return false; }
      } else {
        _currentReportId = null;
      }

      closeModal();
      renderSidebarReports();
      if (currentPage !== 'reports') {
        navigate('reports');
      } else {
        if (_currentReportId) {
          const rpts = await api.getReports();
          _updateReportHeader(rpts.find(x => x.id === _currentReportId) || null);
        } else {
          _updateReportHeader(null);
        }
        runReport();
      }
    },
    'Esegui',
    'btn-primary',
    'modal-wide'
  );
  setTimeout(() => { const e = document.getElementById('rmName'); if (e) { e.focus(); e.select(); } }, 60);
}

function rmOnRangeChange(range) {
  const show = range === 'custom';
  const fg = document.getElementById('rmDateFromGroup');
  const tg = document.getElementById('rmDateToGroup');
  if (fg) fg.style.display = show ? '' : 'none';
  if (tg) tg.style.display = show ? '' : 'none';
}

function renderReportResults(txs, groupby, chartType) {
  if (_reportChart) { _reportChart.destroy(); _reportChart = null; }
  const el = document.getElementById('rResults');
  if (!el) return;
  if (!txs.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><p>Nessuna transazione trovata.</p></div>`;
    return;
  }

  // Usa la quota filtrata (split) se disponibile, altrimenti il totale della transazione
  const effectiveAmt = t => t.filtered_split_amount != null ? t.filtered_split_amount : t.amount;
  // Categoria effettiva per split filtrati
  const effectiveCatName = t => t.filtered_split_amount != null
    ? (t.filtered_split_category_name || t.category_name || '—')
    : (t.category_name || '—');
  const effectiveCatIcon = t => t.filtered_split_amount != null
    ? (t.filtered_split_category_icon || t.category_icon || '')
    : (t.category_icon || '');
  const effectiveCatId = t => t.filtered_split_amount != null
    ? (_reportFilters?.category_id || t.category_id || 0)
    : (t.category_id || 0);

  let tableHtml = '', chartData = null;
  const cc = chartColors();

  if (groupby === 'month') {
    const byM = {};
    txs.forEach(t => {
      const k = t.date?.slice(0, 7);
      if (!k) return;
      const a = effectiveAmt(t);
      if (!byM[k]) byM[k] = {income:0,expense:0,count:0};
      byM[k].count++;
      if (t.type==='income')  byM[k].income  += a;
      if (t.type==='expense') byM[k].expense += a;
    });
    const months = Object.keys(byM).sort();
    const totI = months.reduce((s,m)=>s+byM[m].income,0);
    const totE = months.reduce((s,m)=>s+byM[m].expense,0);
    tableHtml = `<table><thead><tr>
      <th>Mese</th><th class="text-right">N.</th>
      <th class="text-right">Entrate</th><th class="text-right">Uscite</th>
      <th class="text-right">Netto</th></tr></thead><tbody>
      ${months.map(m=>{const g=byM[m],net=g.income-g.expense;return`<tr>
        <td>${_fmtMonth(m)}</td><td class="text-right">${g.count}</td>
        <td class="text-right amount-income">${fmt.currency(g.income)}</td>
        <td class="text-right amount-expense">${fmt.currency(g.expense)}</td>
        <td class="text-right" style="font-weight:600;color:${net>=0?'var(--income)':'var(--expense)'}">
          ${fmt.currency(net)}</td></tr>`;}).join('')}
      <tr style="border-top:2px solid var(--border);font-weight:700">
        <td>Totale</td><td class="text-right">${txs.length}</td>
        <td class="text-right amount-income">${fmt.currency(totI)}</td>
        <td class="text-right amount-expense">${fmt.currency(totE)}</td>
        <td class="text-right" style="font-weight:700;color:${totI-totE>=0?'var(--income)':'var(--expense)'}">
          ${fmt.currency(totI-totE)}</td>
      </tr></tbody></table>`;
    if (chartType==='bar'||chartType==='line') chartData={type:chartType,
      labels:months.map(_fmtMonth),
      datasets:[
        {label:'Entrate',data:months.map(m=>byM[m].income),backgroundColor:'rgba(63,185,80,.6)',borderColor:'#3fb950',borderWidth:2,fill:false,borderRadius:4},
        {label:'Uscite', data:months.map(m=>byM[m].expense),backgroundColor:'rgba(248,81,73,.6)',borderColor:'#f85149',borderWidth:2,fill:false,borderRadius:4},
      ]};

  } else if (groupby === 'category') {
    const byC = {};
    txs.forEach(t => {
      const k = effectiveCatId(t);
      const a = effectiveAmt(t);
      if (!byC[k]) byC[k]={name:effectiveCatName(t),icon:effectiveCatIcon(t),color:t.category_color||'var(--txt3)',total:0,count:0};
      byC[k].count++;
      if (t.type==='income')  byC[k].total += a;
      if (t.type==='expense') byC[k].total -= a;
    });
    const cats = Object.entries(byC).sort(([,a],[,b])=>Math.abs(b.total)-Math.abs(a.total));
    tableHtml = `<table><thead><tr>
      <th>Categoria</th><th class="text-right">N.</th><th class="text-right">Totale</th>
      </tr></thead><tbody>
      ${cats.map(([,g])=>`<tr>
        <td><span style="color:${g.color}">${g.icon}</span> ${g.name}</td>
        <td class="text-right">${g.count}</td>
        <td class="text-right" style="font-weight:600;color:${g.total>=0?'var(--income)':'var(--expense)'}">
          ${fmt.currency(Math.abs(g.total))}</td></tr>`).join('')}
      </tbody></table>`;
    if (chartType==='bar') chartData={type:'bar',
      labels:cats.map(([,g])=>`${g.icon} ${g.name}`),
      datasets:[{label:'Totale',data:cats.map(([,g])=>Math.abs(g.total)),
        backgroundColor:cats.map(([,g])=>g.color+'99'),borderRadius:4}]};
    else if (chartType==='pie') chartData={type:'doughnut',
      labels:cats.map(([,g])=>`${g.icon} ${g.name}`),
      datasets:[{data:cats.map(([,g])=>Math.abs(g.total)),
        backgroundColor:cats.map(([,g])=>g.color),borderWidth:0}]};

  } else if (groupby === 'account') {
    const byA = {};
    txs.forEach(t => {
      const k = t.account_id;
      const a = effectiveAmt(t);
      if (!byA[k]) byA[k]={name:t.account_name||'—',color:t.account_color||'var(--accent)',income:0,expense:0,count:0};
      byA[k].count++;
      if (t.type==='income')  byA[k].income  += a;
      if (t.type==='expense') byA[k].expense += a;
    });
    const accs = Object.entries(byA).sort(([,a],[,b])=>b.count-a.count);
    tableHtml = `<table><thead><tr>
      <th>Conto</th><th class="text-right">N.</th>
      <th class="text-right">Entrate</th><th class="text-right">Uscite</th><th class="text-right">Netto</th>
      </tr></thead><tbody>
      ${accs.map(([,g])=>{const net=g.income-g.expense;return`<tr>
        <td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${g.color};margin-right:6px"></span>${g.name}</td>
        <td class="text-right">${g.count}</td>
        <td class="text-right amount-income">${fmt.currency(g.income)}</td>
        <td class="text-right amount-expense">${fmt.currency(g.expense)}</td>
        <td class="text-right" style="font-weight:600;color:${net>=0?'var(--income)':'var(--expense)'}">
          ${fmt.currency(net)}</td></tr>`;}).join('')}
      </tbody></table>`;

  } else {
    const totI = txs.filter(t=>t.type==='income').reduce((s,t)=>s+effectiveAmt(t),0);
    const totE = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+effectiveAmt(t),0);
    const net  = totI - totE;
    tableHtml = `<table><thead><tr>
      <th>Data</th><th>Descrizione</th><th>Categoria</th><th>Conto</th>
      <th class="text-right">Importo</th><th>Tipo</th></tr></thead><tbody>
      ${txs.map(t=>{
        const isSplitFiltered = t.filtered_split_amount != null;
        const dispAmt = effectiveAmt(t);
        return `<tr style="cursor:pointer" onclick="editTx(${t.id})">
        <td>${fmt.date(t.date)}</td>
        <td class="td-main">${t.description||'—'}${isSplitFiltered ? ` <span style="font-size:10px;opacity:.5" title="Totale transazione: ${fmt.currency(t.amount)}">(tot. ${fmt.currency(t.amount)})</span>` : ''}</td>
        <td>${effectiveCatIcon(t)} ${effectiveCatName(t)}${isSplitFiltered ? ' <span style="font-size:10px;opacity:.5">(÷)</span>' : ''}</td>
        <td>${t.account_name||'—'}</td>
        <td class="text-right amount-${t.type}">${t.type==='expense'?'-':''}${fmt.currency(dispAmt)}</td>
        <td><span class="badge badge-${t.type}">${t.type==='income'?'Entrata':t.type==='expense'?'Uscita':'Trasf.'}</span></td>
        </tr>`;}).join('')}
      <tr style="border-top:2px solid var(--border);font-weight:700">
        <td colspan="4">Totale</td>
        <td class="text-right" style="color:${net>=0?'var(--income)':'var(--expense)'}">${fmt.currency(net)}</td>
        <td></td>
      </tr></tbody></table>`;
  }

  el.innerHTML = `
    ${chartData ? `<div class="card" style="margin-bottom:12px;padding:14px">
      <div style="position:relative;height:340px">
        <canvas id="rChart"></canvas></div></div>` : ''}
    <div class="card">
      <div class="card-header">
        <span class="card-title">${txs.length} transazion${txs.length===1?'e':'i'}</span>
      </div>
      <div class="table-wrap">${tableHtml}</div>
    </div>`;

  if (chartData) {
    _reportChart = new Chart(document.getElementById('rChart'), {
      type: chartData.type,
      data: { labels: chartData.labels, datasets: chartData.datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: cc.tick } },
          zoom: (chartData.type!=='doughnut'&&chartData.type!=='pie') ? zoomOpts() : undefined
        },
        scales: (chartData.type!=='doughnut'&&chartData.type!=='pie') ? {
          x: { ticks:{color:cc.tick}, grid:{color:cc.grid} },
          y: { ticks:{color:cc.tick}, grid:{color:cc.grid} }
        } : undefined
      }
    });
  }
}

function _fmtMonth(yyyyMM) {
  if (!yyyyMM || !/^\d{4}-\d{2}$/.test(yyyyMM)) return yyyyMM || '—';
  const [y, m] = yyyyMM.split('-');
  return new Date(parseInt(y), parseInt(m) - 1, 1)
    .toLocaleString('it-IT', { month: 'long', year: 'numeric' });
}


async function deleteReportConfirm(id, name) {
  openModal('Elimina resoconto',
    `<p style="margin:0">Eliminare <b>${name}</b>?</p>`,
    async () => {
      await api.deleteReport(id);
      if (_currentReportId === id) { _currentReportId = null; _updateReportHeader(null); }
      closeModal(); toast('Resoconto eliminato');
      renderSidebarReports();
    }, 'Elimina', 'btn-danger');
}

/* ─── Previsione Saldo ───────────────────────────────────────────────────── */

async function renderForecastSaldo() {
  const container = document.getElementById('rResults');
  const { histMonths, horizonMonths, sensitivity } = _fcParams;

  container.innerHTML = `
    <div class="card" style="padding:16px;margin-bottom:16px">
      <div style="display:flex;flex-wrap:wrap;gap:20px;align-items:flex-end">
        <div>
          <label style="font-size:12px;color:var(--txt2);display:block;margin-bottom:6px">Storico analizzato</label>
          <div style="display:flex;align-items:center;gap:8px">
            <input type="range" id="fcHistR" min="3" max="60" value="${histMonths}" style="width:130px"
              oninput="_fcParams.histMonths=+this.value;document.getElementById('fcHistN').textContent=this.value;_fcSetDirty()">
            <span id="fcHistN" style="font-weight:700;min-width:22px">${histMonths}</span>
            <span style="color:var(--txt2);font-size:13px">mesi</span>
          </div>
        </div>
        <div>
          <label style="font-size:12px;color:var(--txt2);display:block;margin-bottom:6px">Orizzonte previsione</label>
          <div style="display:flex;align-items:center;gap:8px">
            <input type="range" id="fcHorizR" min="1" max="36" value="${horizonMonths}" style="width:130px"
              oninput="_fcParams.horizonMonths=+this.value;document.getElementById('fcHorizN').textContent=this.value;_fcSetDirty()">
            <span id="fcHorizN" style="font-weight:700;min-width:22px">${horizonMonths}</span>
            <span style="color:var(--txt2);font-size:13px">mesi</span>
          </div>
        </div>
        <div>
          <label style="font-size:12px;color:var(--txt2);display:block;margin-bottom:6px">Sensibilità outlier</label>
          <select id="fcSens" class="form-control" onchange="_fcParams.sensitivity=this.value;_fcSetDirty()">
            <option value="bassa" ${sensitivity==='bassa'?'selected':''}>Bassa  (k = 3.0)</option>
            <option value="media" ${sensitivity==='media'?'selected':''}>Media  (k = 1.5)</option>
            <option value="alta"  ${sensitivity==='alta' ?'selected':''}>Alta   (k = 1.0)</option>
          </select>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <button class="btn btn-primary" onclick="_runForecastSaldo(true)">Aggiorna</button>
          <span id="fcDirtyBadge" style="display:none;font-size:11px;color:var(--warn)">● modifiche in attesa</span>
        </div>
      </div>
    </div>
    <div id="fcOutput"></div>`;

  await _runForecastSaldo();
}

function _fcSetDirty() {
  const badge = document.getElementById('fcDirtyBadge');
  if (badge) badge.style.display = '';
}

async function _runForecastSaldo(keepExclusions = false) {
  const { histMonths, horizonMonths, sensitivity } = _fcParams;
  const kMap = { bassa: 3.0, media: 1.5, alta: 1.0 };
  const k    = kMap[sensitivity] || 1.5;
  const out  = document.getElementById('fcOutput');
  if (!out) return;
  // Nascondi badge "modifiche in attesa"
  const _dirtyBadge = document.getElementById('fcDirtyBadge');
  if (_dirtyBadge) _dirtyBadge.style.display = 'none';
  out.innerHTML = '<div style="text-align:center;padding:40px;color:var(--txt2)">Calcolo in corso…</div>';

  if (!keepExclusions) {
    _fcManualExcl = new Set();
    _fcManualIncl = new Set();
    // tx exclusions persistite in DB — non si resettano con "Calcola previsione"
  }

  // ── Carica dati mensili + struttura spese + transazioni mesi espansi ────────
  const toFetch = [..._fcExpandedMonths].filter(ym => !_fcMonthTxCache[ym]);
  const [monthlyData, dashStats, expSplit] = await Promise.all([
    api.getMonthlyBalance(histMonths),
    api.getDashboardStats(new Date().getFullYear()),
    api.getForecastExpenseSplit(histMonths),
    ...toFetch.map(async ym => {
      const [y, mo] = ym.split('-');
      const lastDay = new Date(+y, +mo, 0).getDate();
      const txs = await api.getTransactions({ date_from: `${ym}-01`, date_to: `${ym}-${lastDay}`, limit: 5000 });
      _fcMonthTxCache[ym] = (txs || [])
        .filter(t => t.type !== 'transfer')
        .sort((a, b) => Number(b.amount) - Number(a.amount));
    }),
  ]);

  if (!monthlyData?.length) return;

  // ── Escludi mese corrente (incompleto — stipendio arriva il 27) ─────────────
  const now       = new Date();
  const currentYm = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const histData  = monthlyData.filter(r => String(r.ym) !== currentYm);

  // Flusso parziale del mese corrente (usato per correggere il saldo storico)
  const _curRow          = monthlyData.find(r => String(r.ym) === currentYm);
  const netCurrentPartial = _curRow ? Number(_curRow.income) - Number(_curRow.expense) : 0;

  if (histData.length < 3) {
    out.innerHTML = '<div class="empty-state"><div class="empty-icon">📊</div><p>Dati insufficienti. Servono almeno 3 mesi di transazioni completati.</p></div>';
    return;
  }

  // ── Dati storici ─────────────────────────────────────────────────────────
  const months   = histData.map(r => String(r.ym));
  const incomes  = histData.map(r => Number(r.income));
  const expenses = histData.map(r => Number(r.expense));
  const nets     = months.map((_, i) => incomes[i] - expenses[i]);

  // ── Aggregati aggiustati (sottratte le tx escluse) ────────────────────────
  const adjInc = incomes.map((v, i) => v - (_fcTxAdjustments[months[i]]?.incAdj || 0));
  const adjExp = expenses.map((v, i) => v - (_fcTxAdjustments[months[i]]?.expAdj || 0));
  const adjNet = months.map((_, i) => adjInc[i] - adjExp[i]);

  // ── IQR outlier sui valori aggiustati ────────────────────────────────────
  const incOut       = _fcIqrOutliers(adjInc, k);
  const expOut       = _fcIqrOutliers(adjExp, k);
  const autoExcluded = new Set(months.filter((_, i) => incOut[i] || expOut[i]));

  // ── Esclusioni finali: (auto ∪ manuali-esclusi) − manuali-inclusi ─────────
  const finalExcl = new Set([...autoExcluded, ..._fcManualExcl].filter(m => !_fcManualIncl.has(m)));
  const isOutlier = months.map(m => finalExcl.has(m));

  const cleanNets = adjNet.filter((_, i) => !isOutlier[i]);
  const cleanInc  = adjInc.filter((_, i) => !isOutlier[i]);
  const cleanExp  = adjExp.filter((_, i) => !isOutlier[i]);
  const n         = cleanNets.length;

  if (n < 2) {
    out.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><p>Troppi mesi esclusi. Riduci la sensibilità outlier o reintegra alcuni mesi.</p></div>';
    return;
  }

  // ── Struttura spese: split fisso/saltuario per mese ──────────────────────
  // monthlySplit: ym → { fixed, sporadic } — da DB, categorie freq≥0.75 = fisse
  const monthlySplit = {};
  for (const row of (expSplit?.monthly || [])) {
    monthlySplit[String(row.ym)] = { fixed: Number(row.fixed_exp), sporadic: Number(row.sporadic_exp) };
  }
  const cleanMonthNames = months.filter((_, i) => !isOutlier[i]);

  // ── Statistiche descrittive ───────────────────────────────────────────────
  const _mean = arr => arr.reduce((a,b) => a+b, 0) / arr.length;
  const meanInc  = _mean(cleanInc);
  const meanExp  = _mean(cleanExp);
  const meanNet  = _mean(cleanNets);
  const variance = cleanNets.reduce((s,v) => s + (v - meanNet)**2, 0) / n;
  const stdNet   = Math.sqrt(variance);

  // ── stdBaseline: rimuove il rumore del "quando" arrivano le spese saltuarie ─
  // Per ogni mese pulito: sostituisce la spesa saltuaria reale con la media attesa.
  // mean(netNormalizzato) = meanNet (invariato), ma la varianza è minore.
  const cleanSporadics = cleanMonthNames.map(m => monthlySplit[m]?.sporadic || 0);
  const meanSporadic   = _mean(cleanSporadics.length ? cleanSporadics : [0]);
  const meanFixed      = _mean(cleanMonthNames.map(m => monthlySplit[m]?.fixed || 0).filter((_, i) => i < n));
  const netNormalized  = cleanNets.map((v, ci) => v - cleanSporadics[ci] + meanSporadic);
  const varBaseline    = netNormalized.reduce((s,v) => s + (v - meanNet)**2, 0) / n;
  const stdBaseline    = Math.sqrt(varBaseline);

  // CV totale (variabilità reale vissuta) e baseline (struttura prevedibile)
  const cv         = stdNet      / Math.max(meanInc, 1);
  const cvBaseline = stdBaseline / Math.max(meanInc, 1);

  // ── Regressione lineare (tendenza del flusso netto) ──────────────────────
  // Usa gli indici di calendario reali (non 0..n-1) per evitare distorsione
  // quando i mesi puliti non sono consecutivi (outlier in mezzo alla serie)
  const cleanIndices = months.map((_, i) => i).filter((_, i) => !isOutlier[i]);
  const reg = _fcLinReg(cleanNets, cleanIndices);

  // ── Saldo corrente totale ─────────────────────────────────────────────────
  const currentBalance = Number(dashStats.balance);

  // ── Ricostruzione saldo storico a ritroso dal saldo attuale ─────────────
  // Punto di partenza: saldo alla fine dell'ultimo mese completato
  // (currentBalance include le tx parziali del mese corrente — le sottraiamo)
  const balAtEndOfLastMonth = currentBalance - netCurrentPartial;
  const histBal = new Array(months.length);
  histBal[months.length - 1] = balAtEndOfLastMonth;
  for (let i = months.length - 2; i >= 0; i--) {
    histBal[i] = histBal[i + 1] - nets[i + 1];
  }

  // ── Proiezione futura con IC 90% (crescita errore √t) ───────────────────
  // Flusso mensile = meanNet + trend ammortizzato.
  // Il trend è scalato per R² (affidabilità fit) e decade esponenzialmente
  // nel tempo (dimezza ogni 12 mesi): evita estrapolazioni irrealistiche
  // su orizzonti lunghi o con pochi dati, riportando verso meanNet nel lungo periodo.
  // Con slope=0 o R²=0: flusso = meanNet puro.
  const projLabels= [], projBal = [], projHigh = [], projLow = [];
  let   bal       = balAtEndOfLastMonth;
  for (let i = 1; i <= horizonMonths; i++) {
    const d  = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const trendDecay = reg.r2 * Math.exp(-0.058 * (i - 1));  // R²-scaled, dimezza ogni 12 mesi
    bal += meanNet + reg.slope * trendDecay;
    const margin = 1.645 * stdBaseline * Math.sqrt(i);   // IC 90% — usa stdBaseline (senza rumore saltuario)
    projLabels.push(ym);
    projBal.push(bal);
    projHigh.push(bal + margin);
    projLow.push(bal  - margin);
  }

  // ── Affidabilità composita ────────────────────────────────────────────────
  // 45% stabilità strutturale (cvBaseline — senza rumore saltuario)
  // 25% bontà del trend (R²)
  // 30% quantità dati
  const cvScore   = Math.max(0, 1 - Math.min(cvBaseline, 2) / 2);
  const r2Score   = Math.max(0, reg.r2);
  const nScore    = Math.min(n / histMonths, 1);
  const reliability = (cvScore * 0.45 + r2Score * 0.25 + nScore * 0.30) * 100;
  // Precisione del flusso: variabilità totale vissuta (cv su stdNet, non baseline)
  const precision = Math.max(0, Math.min(100, (1 - cv) * 100));

  const outlierCount  = isOutlier.filter(Boolean).length;
  const autoNormCnt   = months.filter(m => autoExcluded.has(m) && !finalExcl.has(m)).length;
  const manualReiCnt  = months.filter(m => _fcManualIncl.has(m)).length;
  const manualExclCnt = months.filter(m => _fcManualExcl.has(m) && !autoExcluded.has(m)).length;
  const txAdjCnt      = months.filter(m => (_fcTxAdjustments[m]?.incAdj||0)+(_fcTxAdjustments[m]?.expAdj||0) > 0).length;
  const trendLabel    = reg.slope >  50 ? '↑ Crescente'
                      : reg.slope < -50 ? '↓ Decrescente' : '→ Stabile';

  // ── Colori ───────────────────────────────────────────────────────────────
  const relColor   = reliability >= 70 ? 'var(--income)' : reliability >= 45 ? 'var(--warn)' : 'var(--expense)';
  const netColor   = meanNet  >= 0 ? 'var(--income)' : 'var(--expense)';
  const slopeColor = reg.slope >= 0 ? 'var(--income)' : 'var(--expense)';
  const finalBal   = projBal.at(-1);
  const finalColor = finalBal >= currentBalance ? 'var(--income)' : 'var(--expense)';

  // ── Helper: etichetta stato cella mese ────────────────────────────────────
  const _monthStato = m => {
    const hasTxAdj = (_fcTxAdjustments[m]?.incAdj||0)+(_fcTxAdjustments[m]?.expAdj||0) > 0;
    if (_fcManualExcl.has(m))                       return '<span style="color:var(--expense);font-size:11px">✕ escluso</span>';
    if (_fcManualIncl.has(m))                       return '<span style="color:var(--income);font-size:11px">✓ reintegrato</span>';
    if (autoExcluded.has(m) && finalExcl.has(m))   return '<span style="color:var(--warn);font-size:11px">⚠ anomalo</span>';
    if (autoExcluded.has(m) && !finalExcl.has(m))  return '<span style="color:var(--income);font-size:11px">✓ normalizzato</span>';
    if (hasTxAdj)                                   return '<span style="color:var(--txt2);font-size:11px">✂ tx escluse</span>';
    return '';
  };

  // ── Helper: sub-tabella transazioni per mese espanso ─────────────────────
  // sub-tabella tx: usa la funzione di modulo _fcBuildTxSubrow

  // ── Render ────────────────────────────────────────────────────────────────
  out.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:12px;margin-bottom:18px">
      ${_fcCard('Entrate medie/mese',  fmt.currency(meanInc),  'var(--income)')}
      ${_fcCard('Uscite medie/mese',   fmt.currency(meanExp),  'var(--expense)')}
      ${_fcCard('Flusso netto medio',  (meanNet>=0?'+':'')+fmt.currency(meanNet), netColor)}
      ${_fcCard('Trend mensile',       (reg.slope>=0?'+':'')+fmt.currency(reg.slope)+'/m', slopeColor)}
      ${_fcCard('Affidabilità',        reliability.toFixed(0)+'%', relColor)}
      ${_fcCard('Precisione flusso',   precision.toFixed(0)+'%',   relColor)}
    </div>

    <div class="card" style="padding:16px;margin-bottom:16px">
      <div style="font-size:14px;font-weight:600;margin-bottom:14px">Andamento saldo — storico &amp; previsione</div>
      <canvas id="fcChartCanvas" style="max-height:340px"></canvas>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
      <div class="card" style="padding:16px">
        <div style="font-size:13px;font-weight:600;margin-bottom:12px;color:var(--txt2)">Statistiche modello</div>
        <table style="width:100%;font-size:12px;border-collapse:collapse">
          ${_fcRow('Mesi analizzati',               months.length)}
          ${_fcRow('Mesi usati nel calcolo',        n)}
          ${_fcRow('Mesi esclusi totale',           outlierCount, outlierCount > 0 ? 'var(--warn)' : '')}
          ${autoNormCnt   > 0 ? _fcRow('Normalizzati via tx escluse', autoNormCnt,   'var(--income)') : ''}
          ${manualReiCnt  > 0 ? _fcRow('Reintegrati manualmente',     manualReiCnt,  'var(--income)') : ''}
          ${manualExclCnt > 0 ? _fcRow('Esclusi manualmente',         manualExclCnt, 'var(--expense)') : ''}
          ${txAdjCnt      > 0 ? _fcRow('Mesi con tx escluse',         txAdjCnt,      'var(--txt2)') : ''}
          ${_fcRow('Std flusso totale',              fmt.currency(stdNet))}
          ${_fcRow('Std strutturale (baseline)',    fmt.currency(stdBaseline))}
          ${_fcRow('Variabilità totale/entrate',   (cv*100).toFixed(1)+'%')}
          ${_fcRow('Variabilità strutturale',      (cvBaseline*100).toFixed(1)+'%')}
          ${_fcRow('Spese fisse medie/mese',        fmt.currency(meanFixed))}
          ${_fcRow('Spese saltuarie medie/mese',    fmt.currency(meanSporadic))}
          ${_fcRow('R² regressione lineare',        reg.r2.toFixed(3))}
          ${_fcRow('Tendenza rilevata',             trendLabel)}
        </table>
      </div>
      <div class="card" style="padding:16px">
        <div style="font-size:13px;font-weight:600;margin-bottom:12px;color:var(--txt2)">Margini d'errore IC 90%</div>
        <table style="width:100%;font-size:12px;border-collapse:collapse">
          ${_fcRow('Errore a  1 mese',  '± '+fmt.currency(1.645*stdBaseline*Math.sqrt(1)))}
          ${_fcRow('Errore a  3 mesi',  '± '+fmt.currency(1.645*stdBaseline*Math.sqrt(3)))}
          ${_fcRow('Errore a  6 mesi',  '± '+fmt.currency(1.645*stdBaseline*Math.sqrt(6)))}
          ${_fcRow('Errore a 12 mesi',  '± '+fmt.currency(1.645*stdBaseline*Math.sqrt(12)))}
          <tr><td colspan="2" style="padding:4px 0;border-top:1px solid var(--border)"></td></tr>
          ${_fcRow('Saldo previsto a '+horizonMonths+'m', fmt.currency(finalBal), finalColor)}
          ${_fcRow('Limite inferiore IC', fmt.currency(projLow.at(-1)))}
          ${_fcRow('Limite superiore IC', fmt.currency(projHigh.at(-1)))}
        </table>
      </div>
    </div>

    ${(() => {
      const cats = expSplit?.categories || [];
      if (!cats.length) return '';
      const fisse      = cats.filter(c => c.frequency >= 0.75);
      const periodiche = cats.filter(c => c.frequency >= 0.40 && c.frequency < 0.75);
      const saltuarie  = cats.filter(c => c.frequency  < 0.40);
      const col = (title, color, list) => {
        if (!list.length) return '';
        const rows = list.slice(0, 10).map(c =>
          `<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--border);font-size:11px">
            <span style="color:var(--txt)">${c.name}</span>
            <span style="color:${color};font-weight:600;white-space:nowrap;margin-left:8px">${fmt.currency(c.avg_monthly)}/m</span>
          </div>`
        ).join('');
        const totAvg = list.reduce((s, c) => s + Number(c.avg_monthly), 0);
        return `<div>
          <div style="font-size:11px;font-weight:700;color:${color};margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px">${title}</div>
          ${rows}
          <div style="font-size:11px;color:var(--txt2);margin-top:5px;text-align:right">Totale: <b style="color:${color}">${fmt.currency(totAvg)}/m</b></div>
        </div>`;
      };
      return `<div class="card" style="padding:16px;margin-bottom:16px">
        <div style="font-size:13px;font-weight:600;margin-bottom:14px;color:var(--txt2)">Struttura spese per categoria</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:20px">
          ${col('Fisse (ogni mese)',     'var(--income)',  fisse)}
          ${col('Periodiche (40-75%)',   'var(--warn)',    periodiche)}
          ${col('Saltuarie (<40%)',      'var(--expense)', saltuarie)}
        </div>
      </div>`;
    })()}

    ${outlierCount > 0 || autoNormCnt > 0 ? `
    <div class="card" style="padding:16px;margin-bottom:16px;border-left:3px solid var(--warn)">
      <div style="font-size:13px;font-weight:600;margin-bottom:6px;color:var(--warn)">⚠ Mesi anomali — gestione esclusioni</div>
      <div style="font-size:12px;color:var(--txt2);margin-bottom:10px">
        Mesi con valori anomali (IQR k=${k}). Clicca ▶ per espandere e vedere le singole transazioni — escludine una per normalizzare il mese.
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${months.map(m => {
          const isAuto = autoExcluded.has(m);
          const isExcl = finalExcl.has(m);
          if (!isAuto && !_fcManualExcl.has(m)) return '';
          if (isAuto && isExcl)  return `<span style="background:rgba(255,208,64,.12);border:1px solid var(--warn);border-radius:4px;padding:2px 10px;font-size:12px;font-weight:600;color:var(--warn)">${m} ⚠</span>`;
          if (isAuto && !isExcl) return `<span style="background:rgba(80,200,120,.12);border:1px solid var(--income);border-radius:4px;padding:2px 10px;font-size:12px;font-weight:600;color:var(--income)">${m} ✓</span>`;
          return `<span style="background:rgba(240,80,80,.1);border:1px solid var(--expense);border-radius:4px;padding:2px 10px;font-size:12px;font-weight:600;color:var(--expense)">${m} ✕</span>`;
        }).join('')}
      </div>
    </div>` : ''}

    <div class="card" style="padding:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div style="font-size:13px;font-weight:600;color:var(--txt2)">Dettaglio storico mensile</div>
        <div style="font-size:11px;color:var(--txt2)">▶ per vedere le transazioni del mese</div>
      </div>
      <div style="overflow-x:auto">
        <table style="width:100%;font-size:12px;border-collapse:collapse">
          <thead><tr style="color:var(--txt2);border-bottom:1px solid var(--border)">
            <th style="padding:6px 4px;width:24px"></th>
            <th style="padding:6px 8px;text-align:left">Mese</th>
            <th style="padding:6px 8px;text-align:right">Entrate</th>
            <th style="padding:6px 8px;text-align:right">Uscite</th>
            <th style="padding:6px 8px;text-align:right">Flusso netto</th>
            <th style="padding:6px 8px;text-align:right">Saldo stimato</th>
            <th style="padding:6px 8px;text-align:center">Stato</th>
            <th style="padding:6px 8px;text-align:center" title="Escludi mese intero">Escludi</th>
          </tr></thead>
          <tbody>
            ${months.map((m, i) => {
              const isExcl   = finalExcl.has(m);
              const expanded = _fcExpandedMonths.has(m);
              const incDiff  = Math.abs(adjInc[i] - incomes[i]) > 0.005;
              const expDiff  = Math.abs(adjExp[i] - expenses[i]) > 0.005;
              const dispNet  = adjNet[i];
              const monthRow = `<tr id="fcRow-${m}" style="${isExcl?'opacity:.45;':''}border-bottom:${expanded?'none':'1px solid var(--border)'}">
                <td style="padding:5px 4px;text-align:center">
                  <button id="fcExpBtn-${m}" onclick="_fcToggleExpand('${m}')"
                    style="background:none;border:none;cursor:pointer;color:var(--accent);font-size:11px;padding:2px 4px;border-radius:3px"
                    title="Mostra/nascondi transazioni">
                    ${expanded?'▼':'▶'}
                  </button>
                </td>
                <td style="padding:5px 8px;font-weight:600">${m}</td>
                <td style="padding:5px 8px;text-align:right;color:var(--income)">
                  ${fmt.currency(adjInc[i])}
                  ${incDiff ? `<br><span style="font-size:10px;opacity:.6">orig ${fmt.currency(incomes[i])}</span>` : ''}
                </td>
                <td style="padding:5px 8px;text-align:right;color:var(--expense)">
                  ${fmt.currency(adjExp[i])}
                  ${expDiff ? `<br><span style="font-size:10px;opacity:.6">orig ${fmt.currency(expenses[i])}</span>` : ''}
                </td>
                <td style="padding:5px 8px;text-align:right;font-weight:600;color:${dispNet>=0?'var(--income)':'var(--expense)'}">
                  ${dispNet>=0?'+':''}${fmt.currency(dispNet)}
                </td>
                <td style="padding:5px 8px;text-align:right">${fmt.currency(histBal[i])}</td>
                <td style="padding:5px 8px;text-align:center">${_monthStato(m)}</td>
                <td style="padding:5px 8px;text-align:center">
                  <input type="checkbox" ${isExcl?'checked':''} onchange="_fcToggleMonth('${m}',this.checked)"
                    title="${isExcl?'Reintegra mese nel calcolo':'Escludi mese intero dal calcolo'}"
                    style="cursor:pointer;width:14px;height:14px">
                </td>
              </tr>`;
              return monthRow + (expanded ? _fcBuildTxSubrow(m) : '');
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;

  // ── Chart.js ─────────────────────────────────────────────────────────────
  // Salva posizione scroll prima che il re-render sposti la pagina
  const _savedScrollY = window.scrollY || document.documentElement.scrollTop;
  if (_fcChart) { _fcChart.destroy(); _fcChart = null; }

  const allLabels   = [...months, ...projLabels];
  const nHist       = months.length;
  const connPad     = Array(nHist - 1).fill(null);   // null fino al penultimo storico

  // dataset 0: saldo storico (linea grigia, solo passato)
  const dsHist      = [...histBal, ...Array(horizonMonths).fill(null)];
  // dataset 1: banda superiore IC (fill verso dataset 2)
  const dsHigh      = [...connPad, balAtEndOfLastMonth, ...projHigh];
  // dataset 2: banda inferiore IC
  const dsLow       = [...connPad, balAtEndOfLastMonth, ...projLow];
  // dataset 3: saldo previsto (linea tratteggiata accent)
  const dsProj      = [...connPad, balAtEndOfLastMonth, ...projBal];
  // dataset 4: marcatori outlier (triangoli gialli sulla linea storica)
  const dsOutlier   = [...histBal.map((v,i) => isOutlier[i] ? v : null), ...Array(horizonMonths).fill(null)];

  const ctx = document.getElementById('fcChartCanvas').getContext('2d');
  _fcChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: allLabels,
      datasets: [
        { label: 'Saldo storico',
          data: dsHist, borderColor: 'var(--txt2)', borderWidth: 2,
          backgroundColor: 'transparent', pointRadius: 3, tension: 0.3,
          spanGaps: false, fill: false },
        { label: '_ciHigh',
          data: dsHigh, borderColor: 'transparent',
          backgroundColor: 'rgba(120,180,255,0.28)',
          pointRadius: 0, tension: 0.3, spanGaps: false, fill: 2 },
        { label: '_ciLow',
          data: dsLow, borderColor: 'transparent',
          backgroundColor: 'transparent',
          pointRadius: 0, tension: 0.3, spanGaps: false, fill: false },
        { label: 'Saldo previsto',
          data: dsProj, borderColor: 'var(--accent)', borderWidth: 2.5,
          borderDash: [6,4], backgroundColor: 'transparent',
          pointRadius: 3, tension: 0.3, spanGaps: false, fill: false },
        { label: 'Mesi anomali',
          data: dsOutlier, borderColor: 'var(--warn)',
          backgroundColor: 'var(--warn)', pointRadius: 7,
          pointStyle: 'triangle', showLine: false, fill: false },
      ],
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: {
            color: 'var(--txt)',
            filter: item => !item.text.startsWith('_'),
          },
        },
        tooltip: {
          callbacks: {
            label: ctx => {
              if (ctx.dataset.label.startsWith('_')) return null;
              const v = ctx.parsed.y;
              if (v == null) return null;
              return `${ctx.dataset.label}: ${fmt.currency(v)}`;
            },
          },
        },
      },
      scales: {
        x: { ticks: { color:'var(--txt2)', maxTicksLimit:14 }, grid:{ color:'var(--border)' } },
        y: { ticks: { color:'var(--txt2)', callback: v => fmt.currency(v) }, grid:{ color:'var(--border)' } },
      },
    },
  });
  // Ripristina scroll dopo il paint (evita il salto in cima al re-render)
  if (_savedScrollY > 0) requestAnimationFrame(() => window.scrollTo(0, _savedScrollY));
}

// ── Toggle esclusione mese intero ────────────────────────────────────────────
function _fcToggleMonth(ym, excluded) {
  if (excluded) { _fcManualExcl.add(ym);    _fcManualIncl.delete(ym); }
  else          { _fcManualIncl.add(ym);    _fcManualExcl.delete(ym); }
  _fcSetDirty();
}

// ── Toggle espansione mese — DOM manipulation, nessun re-render ──────────────
async function _fcToggleExpand(ym) {
  const btn     = document.getElementById('fcExpBtn-' + ym);
  const mainRow = document.getElementById('fcRow-'   + ym);
  if (!mainRow) return;

  if (_fcExpandedMonths.has(ym)) {
    // ── Collassa ─────────────────────────────────────────────────────────────
    _fcExpandedMonths.delete(ym);
    const subRow = document.getElementById('fcSub-' + ym);
    if (subRow) subRow.remove();
    mainRow.style.borderBottom = '1px solid var(--border)';
    if (btn) btn.textContent = '▶';
  } else {
    // ── Espandi ──────────────────────────────────────────────────────────────
    _fcExpandedMonths.add(ym);
    if (btn) btn.textContent = '▼';
    mainRow.style.borderBottom = 'none';
    // Carica transazioni se non ancora in cache
    if (!_fcMonthTxCache[ym]) {
      if (btn) btn.textContent = '⏳';
      const [y, mo] = ym.split('-');
      const lastDay = new Date(+y, +mo, 0).getDate();
      const txs = await api.getTransactions({ date_from: `${ym}-01`, date_to: `${ym}-${lastDay}`, limit: 5000 });
      _fcMonthTxCache[ym] = (txs || [])
        .filter(t => t.type !== 'transfer')
        .sort((a, b) => Number(b.amount) - Number(a.amount));
      if (btn) btn.textContent = '▼';
    }
    // Inserisci sub-riga dopo la riga principale
    mainRow.insertAdjacentHTML('afterend', _fcBuildTxSubrow(ym));
  }
}

// ── Carica dal DB le transazioni escluse e popola lo stato in memoria ─────────
async function _fcLoadExcludedFromDb() {
  const rows = await api.getForecastExcluded();
  _fcExcludedTxIds = new Set((rows || []).map(r => Number(r.transaction_id)));
  _fcTxAdjustments = {};
  for (const r of (rows || [])) {
    const ym = String(r.ym);
    if (!_fcTxAdjustments[ym]) _fcTxAdjustments[ym] = { incAdj: 0, expAdj: 0 };
    if (r.type === 'income')  _fcTxAdjustments[ym].incAdj += Number(r.amount);
    if (r.type === 'expense') _fcTxAdjustments[ym].expAdj += Number(r.amount);
  }
}

// ── Toggle esclusione singola transazione ─────────────────────────────────────
async function _fcToggleTx(txId, ym, excluded) {
  if (excluded) {
    _fcExcludedTxIds.add(txId);
    await api.addForecastExcluded(txId);
  } else {
    _fcExcludedTxIds.delete(txId);
    await api.removeForecastExcluded(txId);
  }
  // Ricalcola aggiustamento per questo mese dal cache
  const txs = _fcMonthTxCache[ym] || [];
  let incAdj = 0, expAdj = 0;
  for (const tx of txs) {
    if (!_fcExcludedTxIds.has(tx.id)) continue;
    if (tx.type === 'income')  incAdj += Number(tx.amount);
    if (tx.type === 'expense') expAdj += Number(tx.amount);
  }
  _fcTxAdjustments[ym] = { incAdj, expAdj };
  _fcSetDirty();
}

// ── Costruisce HTML sub-tabella transazioni per un mese espanso ──────────────
// Restituisce un <tr id="fcSub-{ym}"> con la lista delle transazioni del mese
function _fcBuildTxSubrow(ym) {
  const txs = _fcMonthTxCache[ym];
  if (!txs || txs.length === 0) {
    const msg = !txs ? 'Caricamento…' : 'Nessuna transazione in questo mese.';
    return `<tr id="fcSub-${ym}"><td colspan="8" style="padding:8px 8px 8px 36px;font-size:11px;color:var(--txt2);background:var(--bg3)">${msg}</td></tr>`;
  }
  const txRows = txs.map(tx => {
    const isExcl = _fcExcludedTxIds.has(tx.id);
    const amtCol = tx.type === 'income' ? 'var(--income)' : 'var(--expense)';
    const sign   = tx.type === 'income' ? '+' : '-';
    return `<tr style="${isExcl?'opacity:.4;':''}border-bottom:1px solid var(--border)">
      <td style="padding:3px 6px;color:var(--txt2);white-space:nowrap">${tx.date}</td>
      <td style="padding:3px 6px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${(tx.description||'').replace(/"/g,'&quot;')}">${tx.description||'—'}</td>
      <td style="padding:3px 6px;color:var(--txt2)">${tx.category_name||'—'}</td>
      <td style="padding:3px 6px;text-align:right;font-weight:600;color:${amtCol}">${sign}${fmt.currency(tx.amount)}</td>
      <td style="padding:3px 6px;text-align:center">
        <input type="checkbox" ${isExcl?'checked':''} onchange="_fcToggleTx(${tx.id},'${ym}',this.checked)"
          title="${isExcl?'Reintegra nel calcolo':'Escludi dal calcolo'}"
          style="cursor:pointer;width:13px;height:13px">
      </td>
    </tr>`;
  }).join('');
  return `<tr id="fcSub-${ym}"><td colspan="8" style="padding:0;background:var(--bg3);border-bottom:1px solid var(--border)">
    <div style="padding:6px 8px 8px 36px">
      <div style="font-size:11px;color:var(--txt2);margin-bottom:5px">
        Transazioni di <strong>${ym}</strong> — spunta per escludere dal calcolo statistico
      </div>
      <div style="overflow-x:auto">
        <table style="width:100%;font-size:11px;border-collapse:collapse">
          <thead><tr style="color:var(--txt2);border-bottom:1px solid var(--border)">
            <th style="padding:3px 6px;text-align:left">Data</th>
            <th style="padding:3px 6px;text-align:left">Descrizione</th>
            <th style="padding:3px 6px;text-align:left">Categoria</th>
            <th style="padding:3px 6px;text-align:right">Importo</th>
            <th style="padding:3px 6px;text-align:center">Escludi</th>
          </tr></thead>
          <tbody>${txRows}</tbody>
        </table>
      </div>
    </div>
  </td></tr>`;
}

// ── Rilevamento outlier IQR ───────────────────────────────────────────────────
// Restituisce array di boolean: true = il valore è anomalo rispetto alla distribuzione
function _fcIqrOutliers(values, k) {
  const pos = values.filter(v => v > 0);
  if (pos.length < 4) return values.map(() => false);
  const sorted = [...pos].sort((a,b) => a - b);
  const q1  = _fcPct(sorted, 25);
  const q3  = _fcPct(sorted, 75);
  const iqr = q3 - q1;
  const hi  = q3 + k * iqr;
  const lo  = Math.max(0, q1 - k * iqr);
  return values.map(v => v > 0 && (v > hi || v < lo));
}

function _fcPct(sorted, p) {
  const idx = (p / 100) * (sorted.length - 1);
  const lo  = Math.floor(idx), hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

// ── Regressione lineare OLS ───────────────────────────────────────────────────
// Restituisce { slope, intercept, r2 } sul vettore y.
// x opzionale: indici personalizzati (es. posizioni calendario reali).
// Se omesso usa 0,1,2,… — slope sarà "per indice", non "per mese calendario".
function _fcLinReg(y, x) {
  const n = y.length;
  if (n < 2) return { slope: 0, intercept: y[0] ?? 0, r2: 0 };
  if (!x) x = y.map((_, i) => i);
  const xMean = x.reduce((a,b) => a+b, 0) / n;
  const yMean = y.reduce((a,b) => a+b, 0) / n;
  const ssXX  = x.reduce((s,v) => s + (v - xMean)**2, 0);
  const ssXY  = x.reduce((s,v,i) => s + (v - xMean)*(y[i] - yMean), 0);
  const slope     = ssXX > 0 ? ssXY / ssXX : 0;
  const intercept = yMean - slope * xMean;
  const ssTot = y.reduce((s,v)   => s + (v - yMean)**2, 0);
  const ssRes = y.reduce((s,v,i) => s + (v - (intercept + slope*x[i]))**2, 0);
  const r2    = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
  return { slope, intercept, r2 };
}

// ── Helper UI ─────────────────────────────────────────────────────────────────
function _fcCard(label, value, color) {
  return `<div class="card" style="padding:14px 16px">
    <div style="font-size:11px;color:var(--txt2);margin-bottom:4px">${label}</div>
    <div style="font-size:16px;font-weight:700;color:${color}">${value}</div>
  </div>`;
}

function _fcRow(label, value, color) {
  return `<tr style="border-bottom:1px solid var(--border)">
    <td style="padding:5px 4px;color:var(--txt2)">${label}</td>
    <td style="padding:5px 4px;text-align:right;font-weight:600${color?';color:'+color:''}">${value}</td>
  </tr>`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   IMPOSTAZIONI
═══════════════════════════════════════════════════════════════════════════ */
async function renderSettings() {
  const s = await api.getSettings();
  const pg = document.getElementById('pg-settings');

  const tabs = [
    { id: 'data',        label: '🗄️ Dati'         },
    { id: 'prefs',       label: '🎨 Preferenze'    },
    { id: 'maintenance', label: '🔧 Manutenzione'  },
    { id: 'info',        label: 'ℹ️ Informazioni'  },
    { id: 'perf',        label: '⏱️ Prestazioni'   },
  ];

  const tabContent = {
    data: `
      <div class="settings-section">
        <div class="settings-section-title">🗄️ Database</div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>File database attivo</strong>
            <span class="settings-hint">Il file SQLite dove vengono salvati tutti i dati</span>
          </div>
          <div class="settings-control">
            <div class="settings-path-row">
              <input id="dbPathInput" class="form-input settings-path-input"
                     type="text" readonly value="${s['db.path'] ?? ''}">
              <button class="btn btn-secondary" onclick="settingsChooseDb('open')">📂 Apri esistente</button>
              <button class="btn btn-ghost" onclick="settingsChooseDb('save')">➕ Crea nuovo</button>
            </div>
            <p class="settings-hint" id="dbHint"></p>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">💾 Backup automatico</div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Backup all'uscita</strong>
            <span class="settings-hint">Crea un backup del database ad ogni chiusura dell'app</span>
          </div>
          <div class="settings-control">
            <div class="theme-toggle-group">
              <button class="btn theme-btn ${s['backup.enabled']==='1'?'theme-btn-active':''}"
                      onclick="settingsSetBackup('enabled','1')">Attivo</button>
              <button class="btn theme-btn ${s['backup.enabled']!=='1'?'theme-btn-active':''}"
                      onclick="settingsSetBackup('enabled','0')">Disattivo</button>
            </div>
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Cartella backup</strong>
            <span class="settings-hint">Dove salvare i file .db.bak</span>
          </div>
          <div class="settings-control">
            <div class="settings-path-row">
              <input id="backupDirInput" class="form-input settings-path-input"
                     type="text" readonly value="${s['backup.dir'] ?? ''}">
              <button class="btn btn-secondary" onclick="settingsChooseBackupDir()">📂 Scegli</button>
            </div>
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Backup da conservare</strong>
            <span class="settings-hint">Numero massimo di backup (i più vecchi vengono eliminati)</span>
          </div>
          <div class="settings-control">
            <input type="number" class="form-control" style="width:80px" min="1" max="999"
                   value="${s['backup.max']||'10'}"
                   onchange="settingsSetBackup('max', this.value)">
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Backup manuale</strong>
            <span class="settings-hint">Esegui subito un backup</span>
          </div>
          <div class="settings-control">
            <button class="btn btn-secondary" onclick="settingsDoBackup()">💾 Esegui backup ora</button>
            <span class="settings-hint" id="backupHint" style="margin-left:10px"></span>
          </div>
        </div>
        <div class="settings-row" style="align-items:flex-start">
          <div class="settings-label">
            <strong>Ripristina backup</strong>
            <span class="settings-hint">Seleziona un backup da ripristinare. Il database attuale verrà archiviato prima di procedere.</span>
          </div>
          <div class="settings-control" style="flex-direction:column;align-items:flex-start;gap:6px">
            <button class="btn btn-secondary" onclick="settingsLoadBackupList()">📂 Mostra backup disponibili</button>
            <div id="backupRestoreList" style="width:100%"></div>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">📎 Allegati</div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Cartella allegati</strong>
            <span class="settings-hint">Dove vengono copiati i file allegati alle transazioni</span>
          </div>
          <div class="settings-control">
            <div class="settings-path-row">
              <input id="attachmentsDirInput" class="form-input settings-path-input"
                     type="text" readonly value="${s['attachments.dir'] ?? ''}">
              <button class="btn btn-secondary" onclick="settingsChooseAttachmentsDir()">📂 Scegli</button>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">📡 Accesso da browser (LAN)</div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Server HTTP</strong>
            <span class="settings-hint">Permette di accedere all'app dal browser di un altro dispositivo sulla stessa rete</span>
          </div>
          <div class="settings-control">
            <div class="theme-toggle-group">
              <button class="btn theme-btn ${s['http.enabled']!=='0'?'theme-btn-active':''}"
                      onclick="settingsSetHttp('enabled','1')">Attivo</button>
              <button class="btn theme-btn ${s['http.enabled']==='0'?'theme-btn-active':''}"
                      onclick="settingsSetHttp('enabled','0')">Disattivo</button>
            </div>
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Porta</strong>
            <span class="settings-hint">Porta TCP su cui risponde il server (default: 7890)</span>
          </div>
          <div class="settings-control">
            <input type="number" class="form-control" style="width:100px" min="1024" max="65535"
                   value="${s['http.port']||'7890'}"
                   onchange="settingsSetHttp('port', this.value)">
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-label">
            <span class="settings-hint">Le modifiche hanno effetto al prossimo avvio dell'app</span>
          </div>
        </div>
      </div>`,

    prefs: `
      <div class="settings-section">
        <div class="settings-section-title">🎨 Tema</div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Tema predefinito</strong>
            <span class="settings-hint">Scegli o crea un tema personalizzato</span>
          </div>
          <div class="settings-control">
            <div style="display:flex;flex-direction:column;gap:10px">
              <div style="display:flex;gap:6px;flex-wrap:wrap">
                ${[['dark','🌙 Scuro'],['carta','📜 Carta'],['salvia','🌿 Salvia']].map(([key,label]) => `
                  <button class="btn theme-btn ${(s['appearance.theme']||'dark')===key?'theme-btn-active':''}"
                          onclick="settingsSetTheme('${key}')">${label}</button>
                  <button class="btn btn-ghost btn-icon" title="Duplica e personalizza" onclick="duplicateTheme('${key}')">⧉</button>`).join('')}
              </div>
              ${_customThemes.length ? `
              <div style="border-top:1px solid var(--border);padding-top:8px">
                <div style="font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--txt3);margin-bottom:6px">Personalizzati</div>
                ${_customThemes.map(ct => `
                  <div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--border)">
                    <span style="font-size:13px;flex:1;color:var(--txt)">${ct.name}</span>
                    <button class="btn theme-btn ${(s['appearance.theme']||'dark')==='c:'+ct.id?'theme-btn-active':''}" style="padding:4px 12px"
                            onclick="settingsSetTheme('c:${ct.id}')">Attiva</button>
                    <button class="btn btn-ghost btn-icon" title="Modifica" onclick="showThemeEditor(_customThemes.find(t=>t.id==='${ct.id}'))">✏️</button>
                    <button class="btn btn-ghost btn-icon" title="Duplica" onclick="duplicateTheme('c:${ct.id}')">⧉</button>
                    <button class="btn btn-ghost btn-icon" style="color:var(--txt3)" title="Elimina" onclick="_deleteCustomTheme('${ct.id}')">🗑️</button>
                  </div>`).join('')}
              </div>` : ''}
            </div>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">🏦 Conti</div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Visualizzazione conti</strong>
            <span class="settings-hint">Filtra i conti mostrati nelle liste e nella dashboard</span>
          </div>
          <div class="settings-control">
            <div class="theme-toggle-group">
              <button class="btn theme-btn ${!_accFavoritesOnly?'theme-btn-active':''}"
                      onclick="settingsSetAccFilter(false)">Tutti i conti</button>
              <button class="btn theme-btn ${_accFavoritesOnly?'theme-btn-active':''}"
                      onclick="settingsSetAccFilter(true)">Solo preferiti</button>
            </div>
          </div>
        </div>
      </div>

      ${s['_autostart_supported'] === '1' ? `
      <div class="settings-section">
        <div class="settings-section-title">🚀 Avvio</div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Avvia con Windows</strong>
            <span class="settings-hint">Precarica l'app al login. La chiusura della finestra la nasconde nel tray — usa "Esci" dal tray per uscire davvero.</span>
          </div>
          <div class="settings-control">
            <div class="theme-toggle-group">
              <button class="btn theme-btn ${s['autostart.enabled']==='1'?'theme-btn-active':''}"
                      onclick="settingsSetAutostart('1')">Attivo</button>
              <button class="btn theme-btn ${s['autostart.enabled']!=='1'?'theme-btn-active':''}"
                      onclick="settingsSetAutostart('0')">Disattivo</button>
            </div>
          </div>
        </div>
      </div>` : ''}`,

    maintenance: `
      <div class="settings-section">
        <div class="settings-section-title">📊 Stato database</div>
        <div id="dbInfoPanel" class="maint-info-grid">
          <span class="settings-hint">Caricamento...</span>
        </div>
        <div class="settings-row" style="margin-top:10px">
          <div class="settings-label"></div>
          <div class="settings-control">
            <button class="btn btn-secondary" onclick="maintLoadInfo()">🔄 Aggiorna</button>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">🔧 Operazioni</div>

        <div class="settings-row">
          <div class="settings-label">
            <strong>Compatta database</strong>
            <span class="settings-hint">VACUUM: ricostruisce il file eliminando spazio inutilizzato. Può richiedere qualche secondo.</span>
          </div>
          <div class="settings-control maint-op-control">
            <button class="btn btn-secondary" id="btnVacuum" onclick="maintVacuum()">🗜️ Compatta</button>
            <span class="settings-hint maint-result" id="vacuumResult"></span>
          </div>
        </div>

        <div class="settings-row">
          <div class="settings-label">
            <strong>Verifica integrità</strong>
            <span class="settings-hint">Controlla che il file non sia corrotto (PRAGMA integrity_check).</span>
          </div>
          <div class="settings-control maint-op-control">
            <button class="btn btn-secondary" id="btnIntegrity" onclick="maintIntegrity()">🔍 Verifica</button>
            <span class="settings-hint maint-result" id="integrityResult"></span>
          </div>
        </div>

        <div class="settings-row">
          <div class="settings-label">
            <strong>Ricostruisci indici</strong>
            <span class="settings-hint">REINDEX + ottimizza le statistiche del query planner. Utile dopo import massivi di dati.</span>
          </div>
          <div class="settings-control maint-op-control">
            <button class="btn btn-secondary" id="btnReindex" onclick="maintReindex()">⚡ Ricostruisci</button>
            <span class="settings-hint maint-result" id="reindexResult"></span>
          </div>
        </div>

        <div class="settings-row">
          <div class="settings-label">
            <strong>Analizza statistiche</strong>
            <span class="settings-hint">ANALYZE: aggiorna le statistiche usate dal query planner per scegliere il piano di esecuzione migliore.</span>
          </div>
          <div class="settings-control maint-op-control">
            <button class="btn btn-secondary" id="btnAnalyze" onclick="maintAnalyze()">📊 Analizza</button>
            <span class="settings-hint maint-result" id="analyzeResult"></span>
          </div>
        </div>


        <div class="settings-row">
          <div class="settings-label">
            <strong>Cartella dati applicazione</strong>
            <span class="settings-hint">
              Contiene DB, impostazioni, log, cache Chromium (jcef/) e file web estratti.<br>
              Per reinstallare Chromium: <strong>chiudi l'app</strong>, poi apri questa cartella ed elimina la sottocartella <code>jcef</code>. Al riavvio verrà riscaricata (~200 MB).
            </span>
          </div>
          <div class="settings-control maint-op-control">
            <button class="btn btn-ghost" onclick="callJava('openDataDir')">📂 Apri cartella</button>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">📋 Log operazioni</div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>File di log</strong>
            <span class="settings-hint">Percorso e dimensione del file di log</span>
          </div>
          <div class="settings-control" style="display:flex;flex-direction:column;gap:4px">
            <span class="settings-hint" id="logPathText" style="word-break:break-all;font-family:monospace">—</span>
            <div class="flex-center-8">
              <span class="settings-hint" id="logSizeText">—</span>
              <button class="btn btn-ghost" style="white-space:nowrap;padding:2px 8px;font-size:11px"
                      onclick="callJava('openLogFolder')">Apri cartella ↗</button>
            </div>
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Contenuto log</strong>
            <span class="settings-hint">Prima e ultima registrazione nel file di log</span>
          </div>
          <div class="settings-control">
            <span class="settings-hint" id="logInfoText">Caricamento...</span>
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Elimina righe precedenti a</strong>
            <span class="settings-hint">Rimuove dal file di log tutte le righe antecedenti alla data scelta</span>
          </div>
          <div class="settings-control maint-op-control">
            <select class="form-control" id="logCutoffSelect" onchange="maintUpdateLogCutoff()">
              <option value="3m">Mantieni ultimi 3 mesi</option>
              <option value="6m">Mantieni ultimi 6 mesi</option>
              <option value="1y">Mantieni ultimo anno</option>
              <option value="2y">Mantieni ultimi 2 anni</option>
              <option value="custom">Personalizzato…</option>
            </select>
            <input type="date" class="form-control" id="logCutoffDate" style="display:none">
            <button class="btn btn-danger" onclick="maintPurgeLog()">🗑️ Elimina</button>
            <span class="settings-hint maint-result" id="logPurgeResult"></span>
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Elimina voci di sistema</strong>
            <span class="settings-hint">Rimuove avvio, backup, manutenzione — conserva transazioni e modifiche dati</span>
          </div>
          <div class="settings-control maint-op-control">
            <button class="btn btn-danger" onclick="maintPurgeSystemLog()">🗑️ Elimina voci sistema</button>
            <span class="settings-hint maint-result" id="logSystemPurgeResult"></span>
          </div>
        </div>
      </div>`,

    info: `
      <div class="settings-section">
        <div class="settings-section-title">ℹ️ Informazioni</div>
        <div class="settings-info-grid">
          <span class="settings-info-label">Versione app</span>
          <span class="settings-info-value">${s['_app_version'] || '—'}</span>
          <span class="settings-info-label">Java</span>
          <span class="settings-info-value">${s['_java_version'] || '—'}</span>
          <span class="settings-info-label">Browser engine</span>
          <span class="settings-info-value">Chromium ${s['_chromium'] || '(JCEF)'}</span>
          <span class="settings-info-label">Database</span>
          <span class="settings-info-value">${s['db.path'] || '—'}</span>
          <span class="settings-info-label">Impostazioni</span>
          <span class="settings-info-value flex-center-8">
            <span style="word-break:break-all">${s['_settings_path'] || '—'}</span>
            <button class="btn btn-ghost" style="white-space:nowrap;padding:2px 8px;font-size:11px"
                    onclick="api.openSettingsFile()">Apri ↗</button>
          </span>
          <span class="settings-info-label">Log Java</span>
          <span class="settings-info-value flex-center-8">
            <span style="word-break:break-all">${s['_app_log_path'] || '—'}</span>
            <button class="btn btn-ghost" style="white-space:nowrap;padding:2px 8px;font-size:11px"
                    onclick="api.openAppLog()">Apri ↗</button>
            <button class="btn btn-ghost" style="white-space:nowrap;padding:2px 8px;font-size:11px"
                    onclick="_clearAppLog()">🗑️</button>
          </span>
        </div>
      </div>
      <div class="settings-section">
        <div class="settings-section-title">📦 Dipendenze</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="border-bottom:1px solid var(--border-color)">
              <th style="text-align:left;padding:6px 8px;color:var(--text-secondary);font-weight:500">Componente</th>
              <th style="text-align:left;padding:6px 8px;color:var(--text-secondary);font-weight:500">Versione</th>
              <th style="text-align:left;padding:6px 8px;color:var(--text-secondary);font-weight:500">Maven Central</th>
            </tr>
          </thead>
          <tbody>
            ${(function() {
              var deps = [
                { name: 'jcefmaven (JCEF)',  ver: s['_dep_jcef'],   g: 'me.friwi',            a: 'jcefmaven'   },
                { name: 'sqlite-jdbc',        ver: s['_dep_sqlite'], g: 'org.xerial',           a: 'sqlite-jdbc' },
                { name: 'gson',               ver: s['_dep_gson'],   g: 'com.google.code.gson', a: 'gson'        },
                { name: 'slf4j-nop',          ver: s['_dep_slf4j'],  g: 'org.slf4j',            a: 'slf4j-nop'   },
              ];
              var url = function(d) { return 'https://central.sonatype.com/artifact/' + d.g + '/' + d.a; };
              var rows = deps.map(function(d) {
                return '<tr style="border-bottom:1px solid var(--border-color)">'
                  + '<td style="padding:7px 8px">' + d.name + '</td>'
                  + '<td style="padding:7px 8px;font-family:monospace">' + (d.ver || '—') + '</td>'
                  + '<td style="padding:7px 8px"><a href="#" onclick="api.openUrl(\'' + url(d) + '\');return false;"'
                  + ' style="color:var(--accent-color);text-decoration:none">' + d.g + ':' + d.a + ' ↗</a></td>'
                  + '</tr>';
              });
              rows.push('<tr>'
                + '<td style="padding:7px 8px">SQLite (native)</td>'
                + '<td style="padding:7px 8px;font-family:monospace">' + (s['_sqlite_version'] || '—') + '</td>'
                + '<td style="padding:7px 8px;color:var(--text-secondary)">embedded in sqlite-jdbc</td>'
                + '</tr>');
              return rows.join('');
            })()}
          </tbody>
        </table>
      </div>`,

    perf: `
      <div class="settings-section">
        <div class="settings-section-title">⏱️ Monitoraggio prestazioni</div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Registrazione attiva</strong>
            <span class="settings-hint">Misura i tempi di risposta di ogni chiamata Java. Disattivare in uso normale.</span>
          </div>
          <div class="settings-control">
            <div class="theme-toggle-group">
              <button id="perfToggleOn"  class="btn theme-btn ${_perfEnabled?'theme-btn-active':''}"
                      onclick="perfSetEnabled(true)">Attivo</button>
              <button id="perfToggleOff" class="btn theme-btn ${!_perfEnabled?'theme-btn-active':''}"
                      onclick="perfSetEnabled(false)">Disattivo</button>
            </div>
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Registro ultimi ${_PERF_MAX} log</strong>
            <span class="settings-hint">Round-trip = tempo totale JS. Java = elaborazione Bridge+DB. JCEF = overhead CEF.</span>
          </div>
          <div class="settings-control" style="gap:6px">
            <button class="btn btn-secondary" onclick="perfRefresh()">🔄 Aggiorna</button>
            <button class="btn btn-ghost"     onclick="perfClear()">🗑️ Svuota</button>
          </div>
        </div>
        <div id="perfTableWrap" style="overflow-x:auto;margin-top:4px">
          <span class="settings-hint" style="padding:8px 0;display:block">Premi Aggiorna per caricare i dati.</span>
        </div>
      </div>`,
  };

  pg.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Impostazioni</h1>
    </div>
    <div class="settings-tabs">
      ${tabs.map(t=>`
        <button class="settings-tab ${_settingsTab===t.id?'settings-tab-active':''}"
                onclick="_setSettingsTab('${t.id}')">${t.label}</button>`).join('')}
    </div>
    <div class="settings-wrap">
      ${tabContent[_settingsTab] || ''}
    </div>`;
  if (_settingsTab === 'maintenance') setTimeout(() => { maintLoadInfo(); maintLoadLogInfo(); }, 50);
}

window._setSettingsTab = tab => {
  _settingsTab = tab;
  renderSettings();
};

// ─── Prestazioni ──────────────────────────────────────────────────────────────

window.perfSetEnabled = async (enabled) => {
  _perfEnabled = enabled;
  await api.setPerfEnabled(enabled);
  renderSettings();
};

window.perfRefresh = async () => {
  const wrap = document.getElementById('perfTableWrap');
  if (!wrap) return;
  wrap.innerHTML = '<span class="settings-hint">Caricamento...</span>';
  try {
    const [jsLog, javaLog] = await Promise.all([
      Promise.resolve(_perfBuf.slice()),
      api.getPerfLog(),
    ]);
    // Merge by method+ts: build javaMap keyed by method+ts (closest match)
    const javaByMethod = {};
    for (const j of javaLog) {
      const k = j.method;
      if (!javaByMethod[k]) javaByMethod[k] = [];
      javaByMethod[k].push(j);
    }
    // Match js entries to java entries by method, picking closest ts
    const rows = jsLog.map(js => {
      const candidates = javaByMethod[js.method] || [];
      let best = null, bestDiff = Infinity;
      for (const j of candidates) {
        const diff = Math.abs(j.ts - js.ts);
        if (diff < bestDiff) { bestDiff = diff; best = j; }
      }
      const javaMs  = best ? best.javaMs : null;
      const roundMs = js.roundMs;
      const jcefMs  = (javaMs != null) ? Math.max(0, roundMs - javaMs) : null;
      return { method: js.method, ts: js.ts, roundMs, javaMs, jcefMs };
    }).reverse();

    if (!rows.length) {
      wrap.innerHTML = '<span class="settings-hint" style="padding:8px 0;display:block">Nessun dato. Attiva la registrazione ed esegui alcune operazioni.</span>';
      return;
    }

    const badge = (ms, label) => {
      if (ms == null) return '<span style="color:var(--text-secondary)">—</span>';
      const color = ms < 50 ? 'var(--income)' : ms < 200 ? '#f0a030' : 'var(--expense)';
      return `<span style="color:${color};font-weight:600">${label !== undefined ? label : ms + ' ms'}</span>`;
    };

    wrap.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:12px;font-family:monospace">
        <thead>
          <tr style="border-bottom:1px solid var(--border-color)">
            <th style="text-align:left;padding:5px 8px;color:var(--text-secondary);font-weight:500;white-space:nowrap">Metodo</th>
            <th style="text-align:right;padding:5px 8px;color:var(--text-secondary);font-weight:500">Round-trip</th>
            <th style="text-align:right;padding:5px 8px;color:var(--text-secondary);font-weight:500">Java</th>
            <th style="text-align:right;padding:5px 8px;color:var(--text-secondary);font-weight:500">JCEF</th>
            <th style="text-align:right;padding:5px 8px;color:var(--text-secondary);font-weight:500">Ora</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => {
            const t = new Date(r.ts);
            const hms = `${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}:${String(t.getSeconds()).padStart(2,'0')}`;
            return `<tr style="border-bottom:1px solid var(--border-color)">
              <td style="padding:5px 8px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${r.method}">${r.method}</td>
              <td style="text-align:right;padding:5px 8px">${badge(r.roundMs, r.roundMs + ' ms')}</td>
              <td style="text-align:right;padding:5px 8px">${badge(r.javaMs,  r.javaMs  != null ? r.javaMs  + ' ms' : null)}</td>
              <td style="text-align:right;padding:5px 8px">${badge(r.jcefMs,  r.jcefMs  != null ? r.jcefMs  + ' ms' : null)}</td>
              <td style="text-align:right;padding:5px 8px;color:var(--text-secondary)">${hms}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  } catch(e) {
    wrap.innerHTML = `<span class="settings-hint" style="color:var(--expense)">Errore: ${e}</span>`;
  }
};

window.perfClear = async () => {
  _perfBuf.length = 0;
  await api.clearPerfLog();
  const wrap = document.getElementById('perfTableWrap');
  if (wrap) wrap.innerHTML = '<span class="settings-hint" style="padding:8px 0;display:block">Log svuotato.</span>';
};

// ─── Manutenzione DB ──────────────────────────────────────────────────────────

function fmtBytes(b) {
  if (b == null) return '—';
  b = Number(b);
  if (b < 1024)       return b + ' B';
  if (b < 1024*1024)  return (b/1024).toFixed(1) + ' KB';
  return (b/1024/1024).toFixed(2) + ' MB';
}

async function maintLoadInfo() {
  const panel = document.getElementById('dbInfoPanel');
  if (!panel) return;
  panel.innerHTML = '<span class="settings-hint">Caricamento...</span>';
  try {
    const info = await callJava('dbGetInfo');
    const fragPct = info.page_count > 0 ? ((info.free_pages / info.page_count) * 100).toFixed(1) : 0;
    panel.innerHTML = `
      <span class="maint-info-label">Dimensione file</span>
      <span class="maint-info-value">${fmtBytes(info.file_size)}</span>
      <span class="maint-info-label">WAL in attesa</span>
      <span class="maint-info-value">${fmtBytes(info.wal_size)}</span>
      <span class="maint-info-label">Pagine totali / libere</span>
      <span class="maint-info-value">${info.page_count} / ${info.free_pages} (${fragPct}% frammentazione)</span>
      <span class="maint-info-label">Dimensione pagina</span>
      <span class="maint-info-value">${fmtBytes(info.page_size)}</span>
      <span class="maint-info-label">Transazioni</span>
      <span class="maint-info-value">${info.tx_count}</span>
      <span class="maint-info-label">Conti</span>
      <span class="maint-info-value">${info.acc_count}</span>
      <span class="maint-info-label">Schema DB</span>
      <span class="maint-info-value">v${info.schema_version} / v${info.schema_latest}</span>`;
  } catch(e) {
    panel.innerHTML = `<span class="settings-hint" style="color:var(--expense)">Errore: ${e}</span>`;
  }
}

async function maintVacuum() {
  const btn = document.getElementById('btnVacuum');
  const res = document.getElementById('vacuumResult');
  btn.disabled = true; btn.textContent = '⏳ In corso...';
  res.textContent = '';
  try {
    const r = await callJava('dbVacuum');
    const saved = Number(r.saved);
    res.style.color = saved > 0 ? 'var(--income)' : '';
    res.textContent = `${fmtBytes(r.size_before)} → ${fmtBytes(r.size_after)}` +
      (saved > 0 ? ` (liberati ${fmtBytes(saved)})` : ' (nessuno spazio da recuperare)');
    maintLoadInfo();
  } catch(e) {
    res.style.color = 'var(--expense)';
    res.textContent = 'Errore: ' + e;
  }
  btn.disabled = false; btn.textContent = '🗜️ Compatta';
}

async function maintIntegrity() {
  const btn = document.getElementById('btnIntegrity');
  const res = document.getElementById('integrityResult');
  btn.disabled = true; btn.textContent = '⏳ Verifica...';
  res.textContent = '';
  try {
    const r = await callJava('dbIntegrityCheck');
    if (r.ok) {
      res.style.color = 'var(--income)';
      res.textContent = '✓ Database integro';
    } else {
      res.style.color = 'var(--expense)';
      res.textContent = '✗ Errori: ' + r.messages.join(' | ');
    }
  } catch(e) {
    res.style.color = 'var(--expense)';
    res.textContent = 'Errore: ' + e;
  }
  btn.disabled = false; btn.textContent = '🔍 Verifica';
}

async function maintAnalyze() {
  const btn = document.getElementById('btnAnalyze');
  const res = document.getElementById('analyzeResult');
  btn.disabled = true; btn.textContent = '⏳ In corso...';
  res.textContent = '';
  try {
    const r = await callJava('dbAnalyze');
    // Raggruppa per tabella e prendi il primo valore stat (righe totali)
    const byTable = {};
    for (const s of r.stats) {
      if (!byTable[s.name]) byTable[s.name] = parseInt((s.stat||'0').split(' ')[0], 10);
    }
    const lines = Object.entries(byTable)
      .sort((a,b) => b[1]-a[1])
      .map(([t,n]) => `${t}: ${n.toLocaleString()} righe`)
      .join(' · ');
    res.style.color = 'var(--income)';
    res.textContent = '✓ ' + (lines || 'statistiche aggiornate');
  } catch(e) {
    res.style.color = 'var(--expense)';
    res.textContent = 'Errore: ' + e;
  }
  btn.disabled = false; btn.textContent = '📊 Analizza';
}

async function maintReindex() {
  const btn = document.getElementById('btnReindex');
  const res = document.getElementById('reindexResult');
  btn.disabled = true; btn.textContent = '⏳ In corso...';
  res.textContent = '';
  try {
    await callJava('dbReindex');
    res.style.color = 'var(--income)';
    res.textContent = '✓ Indici ricostruiti';
  } catch(e) {
    res.style.color = 'var(--expense)';
    res.textContent = 'Errore: ' + e;
  }
  btn.disabled = false; btn.textContent = '⚡ Ricostruisci';
}


// ─── Manutenzione log ────────────────────────────────────────────────────────

async function maintLoadLogInfo() {
  const el = document.getElementById('logInfoText');
  if (!el) return;
  try {
    const info = await callJava('getLogInfo');
    // percorso e dimensione
    const pathEl = document.getElementById('logPathText');
    const sizeEl = document.getElementById('logSizeText');
    if (pathEl) pathEl.textContent = info.log_path || '—';
    if (sizeEl && info.log_size != null) {
      const kb = (info.log_size / 1024).toFixed(1);
      sizeEl.textContent = kb >= 1024
        ? `${(kb / 1024).toFixed(2)} MB`
        : `${kb} KB`;
    } else if (sizeEl) sizeEl.textContent = '—';
    // contenuto
    if (info.empty)        el.textContent = 'Log vuoto o non trovato';
    else if (info.error)   el.textContent = 'Errore: ' + info.error;
    else                   el.textContent = `Prima registrazione: ${info.first}  ·  Ultima: ${info.last}  ·  ${info.total_lines} righe`;
  } catch(e) { el.textContent = 'Errore: ' + e; }
}

window.maintUpdateLogCutoff = () => {
  const v = document.getElementById('logCutoffSelect').value;
  document.getElementById('logCutoffDate').style.display = v === 'custom' ? '' : 'none';
};

window.maintPurgeSystemLog = async () => {
  const ok = await confirm('Elimina voci di sistema', 'Eliminare tutte le voci di sistema dal log (avvio, backup, manutenzione)?');
  if (!ok) return;
  const res = await callJava('purgeSystemLog');
  const result = document.getElementById('logSystemPurgeResult');
  if (res.error) {
    result.style.color = 'var(--expense)';
    result.textContent = 'Errore: ' + res.error;
  } else {
    result.style.color = res.deleted > 0 ? 'var(--income)' : '';
    result.textContent = res.deleted > 0 ? `Eliminate ${res.deleted} righe` : 'Nessuna voce di sistema trovata';
    maintLoadLogInfo();
  }
};

window._clearAppLog = async () => {
  const ok = await confirm('Pulisci log Java', 'Eliminare il contenuto di app.log?');
  if (!ok) return;
  await callJava('clearAppLog', {});
  toast('Log Java eliminato', 'success');
};

window.maintPurgeLog = async () => {
  const sel = document.getElementById('logCutoffSelect').value;
  let cutoff;
  if (sel === 'custom') {
    cutoff = document.getElementById('logCutoffDate').value;
    if (!cutoff) { document.getElementById('logPurgeResult').textContent = 'Seleziona una data'; return; }
  } else {
    const d = new Date();
    if      (sel === '3m') d.setMonth(d.getMonth() - 3);
    else if (sel === '6m') d.setMonth(d.getMonth() - 6);
    else if (sel === '1y') d.setFullYear(d.getFullYear() - 1);
    else if (sel === '2y') d.setFullYear(d.getFullYear() - 2);
    cutoff = _dateStr(d);
  }
  const ok = await confirm('Elimina log', `Eliminare tutte le righe di log precedenti al ${cutoff}?`);
  if (!ok) return;
  const res = await callJava('purgeLog', { cutoff });
  const result = document.getElementById('logPurgeResult');
  if (res.error) {
    result.style.color = 'var(--expense)';
    result.textContent = 'Errore: ' + res.error;
  } else {
    result.style.color = res.deleted > 0 ? 'var(--income)' : '';
    result.textContent = res.deleted > 0 ? `Eliminate ${res.deleted} righe` : 'Nessuna riga da eliminare';
    maintLoadLogInfo();
  }
};

/* ─── Custom themes ──────────────────────────────────────────────────────── */
let _customThemes  = [];
let _activeThemeKey = 'dark';
let _teWorkingTheme = null;
let _teOriginalTheme = null;
let _teDragState = null;

const _BUILTIN_VARS = {
  dark: {
    '--bg':'#0d1117','--bg2':'#161b22','--bg3':'#1c2128','--bg4':'#21262d',
    '--border':'#30363d','--accent':'#58a6ff','--accent2':'#00d4aa',
    '--income':'#3fb950','--expense':'#f85149','--warn':'#d29922',
    '--txt':'#e6edf3','--txt2':'#8b949e','--txt3':'#6e7681',
  },
  carta: {
    '--bg':'#ece5d8','--bg2':'#f4ede0','--bg3':'#e0d8cb','--bg4':'#d4ccbf',
    '--border':'#c2b8a6','--accent':'#8b5a18','--accent2':'#2e6e58',
    '--income':'#1e6b2e','--expense':'#b52a1a','--warn':'#7a5600',
    '--txt':'#241a08','--txt2':'#5c4a2c','--txt3':'#8a7860',
  },
  salvia: {
    '--bg':'#d8e4da','--bg2':'#e4ede6','--bg3':'#c8d5ca','--bg4':'#baccbe',
    '--border':'#a8b8aa','--accent':'#2563eb','--accent2':'#0891b2',
    '--income':'#15803d','--expense':'#dc2626','--warn':'#b45309',
    '--txt':'#0d1f12','--txt2':'#2d4a32','--txt3':'#5a7a60',
  },
  sintesi: {
    '--bg':'#0d0618','--bg2':'#140a28','--bg3':'#1c1038','--bg4':'#261548',
    '--border':'#3a2060','--accent':'#ff2d78','--accent2':'#00f5c0',
    '--income':'#39e87a','--expense':'#ff5040','--warn':'#ffd040',
    '--txt':'#f0e8ff','--txt2':'#b090d8','--txt3':'#705888',
  },
};

const _THEME_VAR_GROUPS = [
  { title: 'Sfondi', vars: [
    ['--bg',     'Sfondo principale'],
    ['--bg2',    'Sidebar / Card'],
    ['--bg3',    'Input / Tabelle'],
    ['--bg4',    'Hover'],
    ['--border', 'Bordi'],
  ]},
  { title: 'Testo', vars: [
    ['--txt',  'Testo principale'],
    ['--txt2', 'Testo secondario'],
    ['--txt3', 'Testo tenue'],
  ]},
  { title: 'Accenti & Colori', vars: [
    ['--accent',  'Accent principale'],
    ['--accent2', 'Accent secondario / Investimenti'],
    ['--income',  'Entrate'],
    ['--expense', 'Uscite'],
    ['--warn',    'Avviso'],
  ]},
];
const _ALL_THEME_VARS = _THEME_VAR_GROUPS.flatMap(g => g.vars.map(v => v[0]));

const _FONT_OPTIONS = [
  ["'Segoe UI', sans-serif",           'Segoe UI (default)'],
  ['Arial, sans-serif',                'Arial'],
  ['Verdana, sans-serif',              'Verdana'],
  ['Tahoma, sans-serif',               'Tahoma'],
  ['Calibri, sans-serif',              'Calibri'],
  ["'Trebuchet MS', sans-serif",       'Trebuchet MS'],
  ["'Gill Sans', sans-serif",          'Gill Sans'],
  ['Georgia, serif',                   'Georgia (serif)'],
  ["'Times New Roman', serif",         'Times New Roman (serif)'],
  ['Consolas, monospace',              'Consolas (mono)'],
  ["'Courier New', monospace",         'Courier New (mono)'],
];

async function _loadCustomThemes() {
  const s = await api.getSettings();
  try { _customThemes = JSON.parse(s['appearance.custom_themes'] || '[]'); } catch { _customThemes = []; }
}
async function _saveCustomThemesToDB() {
  await api.setSetting('appearance.custom_themes', JSON.stringify(_customThemes));
}
const _FONT_SIZE_VARS = [
  { key: '--fs-xs',    label: 'Badge e tag',       hint: 'badge colorati, tag filtro, etichette nav',  def: 10, min: 7,  max: 14 },
  { key: '--fs-sm',    label: 'Etichette',          hint: 'label campo, testo secondario, hint',        def: 11, min: 8,  max: 15 },
  { key: '--fs-md',    label: 'Pulsanti e input',   hint: 'bottoni, campi form',                        def: 12, min: 9,  max: 16 },
  { key: '--font-size',label: 'Corpo testo',        hint: 'testo principale, voci lista, menu',         def: 13, min: 10, max: 17 },
  { key: '--fs-lg',    label: 'Dati e tabelle',     hint: 'celle tabella, importi, valori',             def: 13, min: 11, max: 18 },
  { key: '--fs-xl',    label: 'Titolo finestra',    hint: 'barra del titolo applicazione',              def: 16, min: 12, max: 22 },
];

function _applyCustomVars(ct) {
  _ALL_THEME_VARS.forEach(v => {
    if (ct.vars[v]) document.documentElement.style.setProperty(v, ct.vars[v]);
    else document.documentElement.style.removeProperty(v);
  });
  document.documentElement.style.setProperty('--radius', (ct.radius ?? 8) + 'px');
  const fs = ct.fontSizes || {};
  _FONT_SIZE_VARS.forEach(({ key, def }) =>
    document.documentElement.style.setProperty(key, (fs[key] ?? (key === '--font-size' ? ct.fontSize : null) ?? def) + 'px')
  );
  document.body.style.fontFamily = ct.fontFamily || '';
}
function _clearCustomVars() {
  _ALL_THEME_VARS.forEach(v => document.documentElement.style.removeProperty(v));
  document.documentElement.style.removeProperty('--radius');
  _FONT_SIZE_VARS.forEach(({ key }) => document.documentElement.style.removeProperty(key));
  document.body.style.fontFamily = '';
}

function applyTheme(theme) {
  _activeThemeKey = theme || 'dark';
  _clearCustomVars();
  if (theme && theme.startsWith('c:')) {
    const ct = _customThemes.find(t => t.id === theme.slice(2));
    document.documentElement.dataset.theme = '';
    if (ct) _applyCustomVars(ct);
  } else {
    const valid = ['carta', 'salvia'];
    document.documentElement.dataset.theme = valid.includes(theme) ? theme : '';
  }
  _updateThemeBtn();
}

async function settingsSetTheme(theme) {
  applyTheme(theme);
  await api.setSetting('appearance.theme', theme);
  _updateThemeBtn();
  renderSettings();
}

const _THEME_CYCLE = [
  { key: '',      icon: '🌙', label: 'Scuro' },
  { key: 'carta', icon: '📜', label: 'Carta' },
  { key: 'salvia', icon: '🌿', label: 'Salvia' },
];

function _fullThemeCycle() {
  const customs = _customThemes.map(ct => ({ key: 'c:' + ct.id, icon: '🎨', label: ct.name }));
  return [..._THEME_CYCLE, ...customs];
}

function _updateThemeBtn() {
  const btn = document.getElementById('themeToggleBtn');
  if (!btn) return;
  const cycle = _fullThemeCycle();
  const activeKey = _activeThemeKey || '';
  const currIdx = cycle.findIndex(x => x.key === activeKey);
  const curr = currIdx >= 0 ? cycle[currIdx] : cycle[0];
  const next = cycle[(Math.max(currIdx, 0) + 1) % cycle.length];
  btn.textContent = curr.icon;
  btn.title = `Tema ${curr.label} — clicca per passare a ${next.label} (Alt+T)`;
}

async function _toggleTheme() {
  const cycle = _fullThemeCycle();
  const activeKey = _activeThemeKey || '';
  const currIdx = cycle.findIndex(x => x.key === activeKey);
  const next = cycle[(Math.max(currIdx, 0) + 1) % cycle.length];
  await settingsSetTheme(next.key || 'dark');
}

/* ─── Theme editor ───────────────────────────────────────────────────────── */
function duplicateTheme(sourceKey) {
  let base;
  if (sourceKey.startsWith('c:')) {
    const ct = _customThemes.find(t => t.id === sourceKey.slice(2));
    if (!ct) return;
    base = { ...ct, id: Date.now().toString(36), name: ct.name + ' (copia)', vars: { ...ct.vars } };
  } else {
    const names = { dark: 'Scuro', carta: 'Carta', salvia: 'Salvia', sintesi: 'Sintesi' };
    base = {
      id: Date.now().toString(36),
      name: (names[sourceKey] || 'Tema') + ' (copia)',
      vars: { ...(_BUILTIN_VARS[sourceKey] || _BUILTIN_VARS.dark) },
      baseKey: sourceKey,
      fontFamily: '', fontSize: 13, radius: 8,
    };
  }
  showThemeEditor(base);
}

function showThemeEditor(themeObj) {
  _teWorkingTheme = JSON.parse(JSON.stringify(themeObj));
  // Inizializza fontSizes con valori di default se mancanti
  if (!_teWorkingTheme.fontSizes) _teWorkingTheme.fontSizes = {};
  _FONT_SIZE_VARS.forEach(({ key, def }) => {
    if (_teWorkingTheme.fontSizes[key] == null)
      _teWorkingTheme.fontSizes[key] = key === '--font-size' ? (_teWorkingTheme.fontSize || def) : def;
  });
  _teOriginalTheme = _activeThemeKey;
  // Applica subito per live preview
  document.documentElement.dataset.theme = '';
  _applyCustomVars(_teWorkingTheme);

  let panel = document.getElementById('tePanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'tePanel';
    document.body.appendChild(panel);
    panel.addEventListener('mousedown', e => {
      if (!e.target.closest('#teHeader') || e.target.tagName === 'BUTTON') return;
      const r = panel.getBoundingClientRect();
      _teDragState = { x: e.clientX - r.left, y: e.clientY - r.top };
      e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
      if (!_teDragState) return;
      panel.style.left  = Math.max(0, e.clientX - _teDragState.x) + 'px';
      panel.style.top   = Math.max(0, e.clientY - _teDragState.y) + 'px';
      panel.style.right = 'auto';
    });
    document.addEventListener('mouseup', () => { _teDragState = null; });
  }

  const isNew = !_customThemes.find(t => t.id === _teWorkingTheme.id);
  const colorSections = _THEME_VAR_GROUPS.map(g => `
    <div class="te-section-hdr">${g.title}</div>
    ${g.vars.map(([v, label]) => {
      const val = _teWorkingTheme.vars[v] || '#888888';
      const base = _BUILTIN_VARS[_teWorkingTheme.baseKey || 'dark'] || _BUILTIN_VARS.dark;
      const defVal = base[v] || '';
      const isDefault = defVal && val.toLowerCase() === defVal.toLowerCase();
      return `<div class="te-color-row">
        <span class="te-color-label">${label}</span>
        <div class="te-color-inputs">
          <input type="color" class="te-swatch" data-var="${v}" value="${val}">
          <input type="text" class="te-hex" data-var="${v}" value="${val.toUpperCase()}" maxlength="7" spellcheck="false">
          <button class="te-reset-btn" data-var="${v}" title="Ripristina default (${defVal.toUpperCase()})" style="opacity:${isDefault?'0.2':'0.8'}"${!defVal?' disabled':''}>↺</button>
        </div>
      </div>`;
    }).join('')}`).join('');

  const fontSel = _FONT_OPTIONS.map(([v, l]) =>
    `<option value="${v}"${_teWorkingTheme.fontFamily===v?' selected':''}>${l}</option>`).join('');

  panel.innerHTML = `
    <div id="teHeader">
      <span>🎨 ${_teWorkingTheme.name}</span>
      <button class="btn btn-ghost btn-icon" onclick="closeThemeEditor(false)" title="Chiudi senza salvare">✕</button>
    </div>
    <div id="teBody">
      <div class="te-prop-row" style="padding-top:2px">
        <label>Nome</label>
        <input class="form-control" id="teName" value="${_teWorkingTheme.name}" placeholder="Nome tema" style="flex:1">
      </div>
      ${colorSections}
      <div class="te-section-hdr">Tipografia</div>
      <div class="te-prop-row">
        <label>Font</label>
        <select class="form-control" id="teFont" style="flex:1;min-width:0">${fontSel}</select>
      </div>
      <div class="te-prop-row">
        <label style="flex:none;margin-right:6px">Font personalizzato</label>
        <input class="form-control" id="teFontCustom" placeholder="es. Impact, sans-serif"
               value="${!_FONT_OPTIONS.find(([v])=>v===_teWorkingTheme.fontFamily) && _teWorkingTheme.fontFamily ? _teWorkingTheme.fontFamily : ''}"
               style="flex:1;font-size:var(--fs-sm,11px)">
      </div>
      ${_FONT_SIZE_VARS.map(({key, label, hint, def, min, max}) => {
        const fs = _teWorkingTheme.fontSizes || {};
        const val = fs[key] ?? (key==='--font-size' ? (_teWorkingTheme.fontSize||def) : def);
        const safeId = 'teFs_' + key.replace(/[^a-z0-9]/gi,'_');
        return `<div class="te-prop-row" style="align-items:center;gap:6px">
          <div style="flex:none;width:130px">
            <div style="font-size:var(--fs-md,12px);color:var(--txt);font-weight:500;line-height:1.3">${label}</div>
            <div style="font-size:var(--fs-xs,10px);color:var(--txt3);line-height:1.4">${hint}</div>
          </div>
          <input type="range" id="${safeId}" data-fskey="${key}" min="${min}" max="${max}" value="${val}" style="flex:1;min-width:0">
          <span class="te-range-val" id="${safeId}Val">${val}px</span>
          <span id="${safeId}Preview" style="font-size:${val}px;color:var(--txt2);min-width:22px;text-align:right;flex-shrink:0;line-height:1">Aa</span>
        </div>`;
      }).join('')}
      <div class="te-section-hdr">Forma</div>
      <div class="te-prop-row">
        <label>Raggio bordi</label>
        <input type="range" id="teRadius" min="0" max="20" value="${_teWorkingTheme.radius??8}" style="flex:1">
        <span class="te-range-val" id="teRadiusVal">${_teWorkingTheme.radius??8}px</span>
      </div>
    </div>
    <div id="teFooter">
      ${!isNew ? `<button class="btn btn-ghost btn-icon" style="color:var(--expense)" title="Elimina tema" onclick="_deleteCustomTheme('${_teWorkingTheme.id}')">🗑️</button>` : ''}
      <span style="flex:1"></span>
      <button class="btn btn-secondary" onclick="closeThemeEditor(false)">Annulla</button>
      <button class="btn btn-primary" onclick="closeThemeEditor(true)">Salva e applica</button>
    </div>`;

  panel.classList.add('open');
  _teWireEvents();
}

function _teWireEvents() {
  document.querySelectorAll('#tePanel input.te-swatch').forEach(el => {
    el.addEventListener('input', e => {
      const v = e.target.dataset.var, val = e.target.value;
      _teWorkingTheme.vars[v] = val;
      const hex = document.querySelector(`#tePanel input.te-hex[data-var="${v}"]`);
      if (hex) hex.value = val.toUpperCase();
      document.documentElement.style.setProperty(v, val);
    });
  });
  document.querySelectorAll('#tePanel input.te-hex').forEach(el => {
    el.addEventListener('input', e => {
      let val = e.target.value.trim();
      if (!val.startsWith('#')) val = '#' + val;
      if (/^#[0-9a-fA-F]{6}$/.test(val)) {
        const v = e.target.dataset.var;
        _teWorkingTheme.vars[v] = val;
        const sw = document.querySelector(`#tePanel input.te-swatch[data-var="${v}"]`);
        if (sw) sw.value = val;
        document.documentElement.style.setProperty(v, val);
      }
    });
    el.addEventListener('blur', e => {
      e.target.value = (_teWorkingTheme.vars[e.target.dataset.var] || '#888888').toUpperCase();
    });
  });
  document.querySelectorAll('#tePanel button.te-reset-btn').forEach(el => {
    el.addEventListener('click', e => {
      const v = e.currentTarget.dataset.var;
      const base = _BUILTIN_VARS[_teWorkingTheme.baseKey || 'dark'] || _BUILTIN_VARS.dark;
      const defVal = base[v];
      if (!defVal) return;
      _teWorkingTheme.vars[v] = defVal;
      const sw  = document.querySelector(`#tePanel input.te-swatch[data-var="${v}"]`);
      const hex = document.querySelector(`#tePanel input.te-hex[data-var="${v}"]`);
      const btn = e.currentTarget;
      if (sw)  sw.value  = defVal;
      if (hex) hex.value = defVal.toUpperCase();
      if (btn) btn.style.opacity = '0.2';
      document.documentElement.style.setProperty(v, defVal);
    });
  });
  const applyFont = val => {
    _teWorkingTheme.fontFamily = val;
    document.body.style.fontFamily = val;
  };
  document.getElementById('teFont')?.addEventListener('change', e => {
    applyFont(e.target.value);
    document.getElementById('teFontCustom').value = '';
  });
  document.getElementById('teFontCustom')?.addEventListener('input', e => {
    const val = e.target.value.trim();
    if (val) applyFont(val);
  });
  // Slider per ogni taglia font
  document.querySelectorAll('#tePanel input[data-fskey]').forEach(el => {
    el.addEventListener('input', e => {
      const key = e.target.dataset.fskey;
      const v = parseInt(e.target.value);
      _teWorkingTheme.fontSizes[key] = v;
      if (key === '--font-size') _teWorkingTheme.fontSize = v;
      const valEl = document.getElementById(e.target.id + 'Val');
      if (valEl) valEl.textContent = v + 'px';
      const previewEl = document.getElementById(e.target.id + 'Preview');
      if (previewEl) previewEl.style.fontSize = v + 'px';
      document.documentElement.style.setProperty(key, v + 'px');
    });
  });
  document.getElementById('teRadius')?.addEventListener('input', e => {
    const v = parseInt(e.target.value);
    _teWorkingTheme.radius = v;
    document.getElementById('teRadiusVal').textContent = v + 'px';
    document.documentElement.style.setProperty('--radius', v + 'px');
  });
}

async function closeThemeEditor(save) {
  const panel = document.getElementById('tePanel');
  if (!panel || !panel.classList.contains('open')) return;
  if (save) {
    const nameEl = document.getElementById('teName');
    if (nameEl) _teWorkingTheme.name = nameEl.value.trim() || 'Tema personalizzato';
    const idx = _customThemes.findIndex(t => t.id === _teWorkingTheme.id);
    if (idx >= 0) _customThemes[idx] = _teWorkingTheme;
    else _customThemes.push(_teWorkingTheme);
    await _saveCustomThemesToDB();
    await settingsSetTheme('c:' + _teWorkingTheme.id);
  } else {
    applyTheme(_teOriginalTheme || 'dark');
  }
  panel.classList.remove('open');
  _teWorkingTheme = null;
}

async function _deleteCustomTheme(id) {
  _customThemes = _customThemes.filter(t => t.id !== id);
  await _saveCustomThemesToDB();
  if (_activeThemeKey === 'c:' + id) await settingsSetTheme('dark');
  const panel = document.getElementById('tePanel');
  if (panel) panel.classList.remove('open');
  if (currentPage === 'settings') renderSettings();
}

/* ─── Shortcuts overlay ──────────────────────────────────────────────────── */
const _NAV_SHORTCUTS = [
  { key:'1', page:'dashboard',    label:'Dashboard' },
  { key:'2', page:'accounts',     label:'Conti' },
  { key:'3', page:'transactions', label:'Transazioni' },
  { key:'4', page:'budgets',      label:'Budget' },
  { key:'5', page:'scheduled',    label:'Pianificate' },
  { key:'6', page:'portfolio',    label:'Portfolio' },
  { key:'7', page:'analytics',    label:'Analisi' },
  { key:'8', page:'reports',      label:'Report' },
  { key:'9', page:'settings',     label:'Impostazioni' },
];

function showShortcutsHelp() {
  const kbdStyle = "background:var(--bg3);border:1px solid var(--border);border-radius:4px;padding:0 5px;font-size:10px";
  const overlay = document.getElementById('shortcutsOverlay');
  overlay.innerHTML = `
    <div id="shortcutsPanel">
      <h3>Scorciatoie da tastiera <span>premi <kbd style="${kbdStyle}">Esc</kbd> o <kbd style="${kbdStyle}">?</kbd> per chiudere</span></h3>
      <div class="sc-group">
        <div class="sc-group-title">Pagina Transazioni — generali</div>
        <div class="sc-row">
          <span class="sc-desc">Nuova transazione (spesa)</span>
          <span class="sc-keys"><kbd>N</kbd></span>
        </div>
        <div class="sc-row">
          <span class="sc-desc">Focus sulla ricerca</span>
          <span class="sc-keys"><kbd>F</kbd></span>
        </div>
      </div>
      <div class="sc-group">
        <div class="sc-group-title">Pagina Transazioni — riga selezionata</div>
        <div class="sc-row">
          <span class="sc-desc">Modifica</span>
          <span class="sc-keys"><kbd>E</kbd></span>
        </div>
        <div class="sc-row">
          <span class="sc-desc">Duplica</span>
          <span class="sc-keys"><kbd>D</kbd></span>
        </div>
        <div class="sc-row">
          <span class="sc-desc">Segna come conciliata</span>
          <span class="sc-keys"><kbd>R</kbd></span>
        </div>
        <div class="sc-row">
          <span class="sc-desc">Segna come "da verificare"</span>
          <span class="sc-keys"><kbd>V</kbd></span>
        </div>
        <div class="sc-row">
          <span class="sc-desc">Elimina</span>
          <span class="sc-keys"><kbd>Canc</kbd></span>
        </div>
      </div>
      <div class="sc-group">
        <div class="sc-group-title">Interfaccia</div>
        <div class="sc-row">
          <span class="sc-desc">Mostra questa guida</span>
          <span class="sc-keys"><kbd>?</kbd></span>
        </div>
      </div>
    </div>`;
  overlay.classList.add('open');
}

function closeShortcutsHelp() {
  document.getElementById('shortcutsOverlay').classList.remove('open');
}

async function settingsSetAccFilter(favOnly) {
  _accFavoritesOnly = favOnly;
  await api.setSetting('accounts.favorites_only', favOnly ? '1' : '0');
  renderSettings();
  updateSidebar();
}

async function settingsSetAutostart(value) {
  await api.setSetting('autostart.enabled', value);
  renderSettings();
}

async function settingsSetBackup(key, value) {
  await api.setSetting('backup.' + key, value);
  renderSettings();
}

async function settingsSetHttp(key, value) {
  await api.setSetting('http.' + key, value);
  renderSettings();
}

async function settingsChooseBackupDir() {
  const res = await api.chooseBackupDir();
  if (res.cancelled) return;
  await api.setSetting('backup.dir', res.path);
  renderSettings();
}

async function settingsChooseAttachmentsDir() {
  const res = await api.chooseAttachmentsDir();
  if (res.cancelled) return;
  await api.setSetting('attachments.dir', res.path);
  renderSettings();
}

async function settingsDoBackup() {
  const hint = document.getElementById('backupHint');
  if (hint) hint.textContent = '⏳ Backup in corso...';
  try {
    const res = await api.doBackup();
    if (hint) hint.textContent = `✅ Salvato: ${res.path}`;
  } catch(e) {
    if (hint) hint.textContent = `❌ ${e.message}`;
  }
}

async function settingsLoadBackupList() {
  const container = document.getElementById('backupRestoreList');
  if (!container) return;
  container.innerHTML = '<span class="settings-hint">⏳ Caricamento...</span>';
  try {
    const res = await api.listBackups();
    const list = res.backups || [];
    if (!list.length) {
      container.innerHTML = '<span class="settings-hint">Nessun backup trovato.</span>';
      return;
    }
    container.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:4px">
        <thead>
          <tr style="color:var(--txt2);border-bottom:1px solid var(--border)">
            <th style="text-align:left;padding:4px 8px">Data e ora</th>
            <th style="text-align:left;padding:4px 8px">Modifiche</th>
            <th style="text-align:right;padding:4px 8px">Dim.</th>
            <th style="padding:4px 8px"></th>
          </tr>
        </thead>
        <tbody>
          ${list.map((b,i) => {
            const changes = b.changes || [];
            const nChanges = changes.length;
            const rowBg = i%2===1 ? 'background:rgba(255,255,255,.025)' : '';
            const detailId = `bak-detail-${i}`;
            const changesCell = nChanges === 0
              ? `<span style="color:var(--txt3)">—</span>`
              : `<button class="btn-bak-changes" data-detail="${detailId}">
                   ${nChanges} ${nChanges===1?'modifica':'modifiche'}
                 </button>`;
            const detailRows = changes.map(c => {
              let descHtml = '';
              if (c.desc) {
                descHtml = c.desc.split(' · ').map(part => {
                  const colon = part.indexOf(':');
                  if (colon === -1) return `<span style="color:var(--txt3)">${part}</span>`;
                  const key = part.slice(0, colon);
                  const val = part.slice(colon + 1);
                  if (key === 'importo') return `<span style="color:var(--txt3)">${key}:</span><span style="color:var(--income);font-weight:700"> ${val}</span>`;
                  if (key === 'categoria') return `<span style="color:var(--txt3)">${key}:</span><span style="color:var(--accent);font-weight:600"> ${val}</span>`;
                  return `<span style="color:var(--txt3)">${part}</span>`;
                }).join('<span style="color:var(--border)"> · </span>');
              }
              return `<tr class="bak-detail-row ${detailId}" style="background:var(--bg3)">
                <td colspan="4" style="padding:3px 8px 3px 24px;font-size:11px;color:var(--txt2)">
                  <span style="color:var(--txt3);margin-right:6px">${c.time}</span>
                  <strong>${c.op}</strong>
                  ${descHtml ? `<span style="margin-left:6px">${descHtml}</span>` : ''}
                </td>
              </tr>`;
            }).join('');
            return `
            <tr style="border-bottom:1px solid var(--border);${rowBg}">
              <td style="padding:5px 8px;font-weight:600;color:var(--accent)">${b.displayTs}</td>
              <td style="padding:5px 8px">${changesCell}</td>
              <td style="padding:5px 8px;text-align:right;color:var(--txt3)">${(b.size/1024).toFixed(1)} KB</td>
              <td style="padding:5px 8px">
                <button class="btn btn-secondary btn-restore-bak" style="font-size:11px;padding:2px 10px"
                  data-path="${b.path.replace(/\\/g,'\\\\')}" data-ts="${b.displayTs}">
                  ♻️ Ripristina
                </button>
              </td>
            </tr>
            ${detailRows}`;
          }).join('')}
        </tbody>
      </table>`;
    container.querySelectorAll('.bak-detail-row').forEach(r => r.classList.add('hidden'));
    container.querySelectorAll('.btn-bak-changes').forEach(btn => {
      btn.addEventListener('click', () => {
        const rows = container.querySelectorAll(`.${btn.dataset.detail}`);
        const open = !rows[0]?.classList.contains('hidden');
        rows.forEach(r => r.classList.toggle('hidden', open));
        btn.classList.toggle('active', !open);
      });
    });
    container.querySelectorAll('.btn-restore-bak').forEach(btn => {
      btn.addEventListener('click', () => settingsConfirmRestore(btn.dataset.path, btn.dataset.ts));
    });
  } catch(e) {
    container.innerHTML = `<span class="settings-hint" style="color:var(--expense)">❌ ${e.message}</span>`;
  }
}

async function settingsConfirmRestore(path, displayTs) {
  const ok = await confirm('Ripristina backup', `Ripristinare il backup del <strong>${displayTs}</strong>?<br><br>Il database corrente verrà archiviato nella cartella backup prima di procedere.`);
  if (!ok) return;
  const container = document.getElementById('backupRestoreList');
  if (container) container.innerHTML = '<span class="settings-hint">⏳ Ripristino in corso...</span>';
  try {
    const res = await api.restoreBackup(path);
    openModal('✅ Ripristino completato',
      `<p style="color:var(--txt2);line-height:1.6">Database precedente archiviato in:<br><code style="font-size:11px">${res.archived}</code><br><br>L'applicazione verrà ricaricata.</p>`,
      () => { closeModal(); location.reload(); }, 'Ok', 'btn-primary');
  } catch(e) {
    if (container) container.innerHTML = `<span class="settings-hint" style="color:var(--expense)">❌ ${e.message}</span>`;
  }
}

async function settingsChooseDb(mode) {
  const res = await api.chooseDbFile(mode);
  if (res.cancelled) return;

  document.getElementById('dbPathInput').value = res.path;
  const hint = document.getElementById('dbHint');
  hint.style.color = 'var(--txt3)';
  hint.textContent = '⏳ Cambio database in corso…';
  try {
    await api.reloadDb(res.path);
    hint.style.color = 'var(--income)';
    hint.textContent = '✅ Database cambiato con successo.';
    toast('Database aggiornato.', 'success');
    await updateSidebar();
    await renderDashboard();
  } catch (e) {
    hint.style.color = 'var(--expense)';
    hint.textContent = '❌ Errore: ' + (e.message || e);
    toast('Errore cambio database: ' + (e.message || e), 'error');
  }
}

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
