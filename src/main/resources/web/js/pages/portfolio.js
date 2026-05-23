/* ═══════════════════════════════════════════════════════════════════════════
   LucaMoneyManager — pages/portfolio.js
   Pagina Portafoglio (3 tab: portfolio/analisi/storico)
   (estratta da app.js, stadio 7d del refactor)

   Dipendenze esterne (lazy a runtime):
   - FREQ_LABELS (scheduled.js)
   - _todayStr, _dateStr (transactions.js)
   - currentPage, renderDashboard (router / dashboard)
═══════════════════════════════════════════════════════════════════════════ */

// Stato pagina (era in scheduled.js con FIXME, ora nel posto corretto)
let _portfolioActiveOnly = 'active'; // 'active' | 'closed' | 'all'
let _portfolioTypeFilter = 'all';    // 'all' | 'equity' | 'bond'
let _portfolioSort = { col: 'ticker', dir: 1 };
let _portfolioTab = 'portfolio';
let _portfolioItems = [];
let _portStoricoExp    = new Set();
let _portStoricoFilter = 'all'; // 'all' | 'active' | 'closed'
let _portfolioPriceStatus = {}; // id → 'ok' | 'fail' | undefined (grigio)

// Calcola valore di mercato di una posizione (gestisce equity e bond)
// Bond: quantity = nominale totale (€), price = % → valore = nominale × price% / 100
function portfolioItemValue(i, useAvg = false) {
  const price = useAvg ? i.avg_price : (i.current_price || i.avg_price);
  if (i.asset_type === 'bond') return i.quantity * price / 100;
  return i.quantity * price;
}

// ── Metriche di rendimento ──────────────────────────────────────────────────

// Current yield netto annuo: cedola netta annua / prezzo attuale × 100
// Es. bond cedola 4%, tax 12.5%, prezzo 95 → (4×0.875)/95×100 = 3.68% annuo netto
function bondCurrentYield(i) {
  if (i.asset_type !== 'bond' || !i.coupon_rate || !i.current_price) return null;
  const tax = i.coupon_tax != null ? i.coupon_tax : 12.5;
  const annualNet = i.coupon_rate * (1 - tax / 100);
  return annualNet / i.current_price * 100;
}

// YTM approssimato (bond-equivalent yield)
// YTM ≈ (C + (100-P)/n) / ((100+P)/2)
// dove C=cedola%/anno, P=prezzo attuale %, n=anni a scadenza
// Restituisce { gross, net, years } o null se manca scadenza/cedola/prezzo
function bondYTM(i) {
  if (i.asset_type !== 'bond' || !i.coupon_rate || !i.maturity_date || !i.current_price) return null;
  const today = new Date();
  const mat   = new Date(i.maturity_date);
  const years = (mat - today) / (365.25 * 24 * 3600 * 1000);
  if (years <= 0.01) return null;  // scaduto o troppo vicino
  const C = i.coupon_rate;
  const P = i.current_price;
  const gross = (C + (100 - P) / years) / ((100 + P) / 2) * 100;
  const tax = i.coupon_tax != null ? i.coupon_tax : 12.5;
  const net = gross * (1 - tax / 100);
  return { gross, net, years };
}

// Total Return € — basato su avg_price (sempre affidabile, anche per posizioni importate)
//   unrealized = (current_price − avg_price) × qty_attuale
//   realized   = sell_revenue − sold_qty × avg_price   (approssimato con avg corrente)
//   totalReturn = unrealized + realized + cedole + dividendi − commissioni_vendita − altre_spese
//   (commissioni di acquisto sono già incluse in avg_price tramite la formula in buyStock)
// Bond: avg_price è in %, qty in nominale €; ogni componente in € usa /100
function positionTotalReturn(i) {
  const isBond = i.asset_type === 'bond';
  const div = isBond ? 100 : 1;
  const avg = i.avg_price || 0;
  const cur = i.current_price || avg;

  const currentValue   = i.quantity * cur / div;
  const heldCostBasis  = i.quantity * avg / div;
  const unrealized     = currentValue - heldCostBasis;

  const soldQty        = i.total_sold_qty || 0;
  const sellRevenue    = (i.total_sell_principal || 0) / div;
  const soldCostBasis  = soldQty * avg / div;
  const realized       = sellRevenue - soldCostBasis;

  const coup    = i.total_coupons          || 0;
  const divi    = i.total_dividends        || 0;
  const sellCom = i.total_sell_commissions || 0;
  const otherE  = i.total_other_expenses   || 0;

  const totalReturn = unrealized + realized + coup + divi - sellCom - otherE;
  // % sul max capitale investito (posizione attuale + venduta, tutte al costo medio)
  const maxInvested = (i.quantity + soldQty) * avg / div;
  const pct = maxInvested > 0 ? (totalReturn / maxInvested) * 100 : 0;
  return { totalReturn, pct, currentValue, unrealized, realized };
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
  const totalCoupons     = visibleItems.reduce((s,i) => s + (i.total_coupons   || 0), 0);
  const totalDividends   = visibleItems.reduce((s,i) => s + (i.total_dividends || 0), 0);
  const totalReturnAll   = visibleItems.reduce((s,i) => s + positionTotalReturn(i).totalReturn, 0);
  // Base = somma di max invested (posizione attuale + venduta al costo medio)
  const totalMaxInvested = visibleItems.reduce((s,i) => {
    const div = i.asset_type === 'bond' ? 100 : 1;
    const soldQty = i.total_sold_qty || 0;
    return s + (i.quantity + soldQty) * (i.avg_price || 0) / div;
  }, 0);
  const totalReturnPct   = totalMaxInvested > 0 ? (totalReturnAll / totalMaxInvested) * 100 : 0;

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
      <div class="stat-card" title="Variazione di prezzo dei titoli ancora in portafoglio (valore attuale − costo medio)">
        <div class="stat-label">📈 P&L Mercato</div>
        <div class="stat-value ${totalPnL>=0?'pnl-positive':'pnl-negative'}">${fmt.currency(totalPnL)}</div>
        <div class="stat-sub ${totalPnL>=0?'pnl-positive':'pnl-negative'}">${fmt.pct(pnlPct)}</div>
      </div>
      <div class="stat-card" title="Rendimento totale: P&L mercato + cedole + dividendi + plusvalenze realizzate − tutte le commissioni e spese">
        <div class="stat-label">🏁 Tot. Return</div>
        <div class="stat-value ${totalReturnAll>=0?'pnl-positive':'pnl-negative'}">${fmt.currency(totalReturnAll)}</div>
        <div class="stat-sub ${totalReturnAll>=0?'pnl-positive':'pnl-negative'}">${fmt.pct(totalReturnPct)}</div>
      </div>
      ${(totalCoupons + totalDividends) > 0 ? `
      <div class="stat-card" title="Cedole bond + dividendi azioni incassati netti">
        <div class="stat-label">💵 Incassi</div>
        <div class="stat-value" style="color:var(--income)">${fmt.currency(totalCoupons + totalDividends)}</div>
        ${totalCoupons > 0 && totalDividends > 0 ? `<div class="stat-sub" style="color:var(--txt3)">Ced. ${fmt.currency(totalCoupons)} · Div. ${fmt.currency(totalDividends)}</div>` : ''}
      </div>` : ''}
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
            ['pnl',      'P&L mkt',       'text-right'],
            ['totret',   'Tot. Return',   'text-right'],
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
            const tr   = positionTotalReturn(i);
            return { ...i, _val: val, _cost: cost, _pnl: val - cost, _comm: i.total_commissions || 0,
                     _totret: tr.totalReturn, _totretPct: tr.pct };
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
              case 'totret':   va = a._totret;          vb = b._totret;          break;
              default:         va = ''; vb = '';
            }
            if (typeof va === 'string') return dir * va.localeCompare(vb);
            return dir * (va - vb);
          });
          if (!rows.length) return '<tr><td colspan="14" style="text-align:center;padding:40px;color:var(--txt3)">Nessun titolo in portafoglio. Clicca "+ Acquista" per iniziare.<br><small style="color:var(--txt3)">Tasto destro su una riga per le azioni</small></td></tr>';
          return rows.map(i => {
            const isBond = i.asset_type === 'bond';
            const val = i._val, cost = i._cost, pnl = i._pnl, comm = i._comm;
            const pnlP = cost ? (pnl/cost)*100 : 0;
            const totret = i._totret, totretPct = i._totretPct;
            const priceDisplay = isBond ? `${(i.avg_price||0).toFixed(4)} %` : fmt.price(i.avg_price);
            const priceUnit    = isBond ? '%' : '€';
            const typeBadge    = isBond
              ? `<span class="badge" style="background:#d29922;color:#fff;font-size:10px;padding:1px 5px;border-radius:4px">OBB</span>`
              : `<span class="badge" style="background:#58a6ff;color:#fff;font-size:10px;padding:1px 5px;border-radius:4px">AZI</span>`;
            const cy  = isBond ? bondCurrentYield(i) : null;
            const ytm = isBond ? bondYTM(i) : null;
            const yieldInfo = isBond && (cy != null || ytm != null)
              ? `<br><small style="color:var(--txt3);font-size:10px" title="CY = cedola netta annua / prezzo attuale &#10;YTM = rendimento netto a scadenza (formula approssimata)">
                  ${cy != null ? `CY ${cy.toFixed(2)}%` : ''}${cy != null && ytm != null ? ' · ' : ''}${ytm != null ? `YTM ${ytm.net.toFixed(2)}% (${ytm.years.toFixed(1)}y)` : ''}
                 </small>` : '';
            const couponInfo = isBond && i.coupon_rate
              ? `<br><small style="color:var(--txt3);font-size:10px">Cedola ${i.coupon_rate}% lordo · ${((1-(i.coupon_tax||12.5)/100)*i.coupon_rate).toFixed(3)}% netto</small>${yieldInfo}`
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
              <td class="text-right ${pnl>=0?'pnl-positive':'pnl-negative'}" title="P&L solo da variazione di prezzo (escluso cedole, dividendi, commissioni)">${fmt.currency(pnl)}<br><small>${fmt.pct(pnlP)}</small></td>
              <td class="text-right ${totret>=0?'pnl-positive':'pnl-negative'}" title="Rendimento complessivo: valore attuale + vendite + cedole/dividendi − acquisti − commissioni − spese">${fmt.currency(totret)}<br><small>${fmt.pct(totretPct)}</small></td>
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

  const TYPE_LABEL = { buy:'Acquisto', sell:'Vendita', coupon:'Cedola', dividend:'Dividendo', expense:'Spesa' };
  const TYPE_COLOR = { buy:'var(--expense)', sell:'var(--income)', coupon:'var(--income)', dividend:'var(--income)', expense:'var(--expense)' };
  const TYPE_SIGN  = { buy:'-', sell:'+', coupon:'+', dividend:'+', expense:'-' };

  let grandBuy = 0, grandSell = 0, grandCoupon = 0, grandDividend = 0, grandExpense = 0;

  const cards = withTxs.map(({ item, txs }) => {
    const isB = item.asset_type === 'bond';
    const buyValue = t => isB ? t.quantity * t.price / 100 + (t.commission || 0) : t.quantity * t.price + (t.commission || 0);
    const sellValue = t => isB ? t.quantity * t.price / 100 : t.quantity * t.price;
    const totBuy     = txs.filter(t=>t.type==='buy').reduce((s,t)=>s+buyValue(t), 0);
    const totSell    = txs.filter(t=>t.type==='sell').reduce((s,t)=>s+sellValue(t), 0);
    const totCoupon  = txs.filter(t=>t.type==='coupon').reduce((s,t)=>s+t.price, 0);
    const totDividend= txs.filter(t=>t.type==='dividend').reduce((s,t)=>s+t.price, 0);
    const totExpense = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.price, 0);
    grandBuy += totBuy; grandSell += totSell; grandCoupon += totCoupon; grandDividend += totDividend; grandExpense += totExpense;

    const collapsed = !_portStoricoExp.has(item.id);
    const net = totSell + totCoupon - totBuy - totExpense;

    const chips = [
      totBuy      > 0 ? `<span class="r-chip" style="color:var(--expense)">Acq. ${fmt.currency(totBuy)}</span>`     : '',
      totSell     > 0 ? `<span class="r-chip" style="color:var(--income)">Vend. ${fmt.currency(totSell)}</span>`    : '',
      totCoupon   > 0 ? `<span class="r-chip" style="color:var(--income)">Ced. ${fmt.currency(totCoupon)}</span>`   : '',
      totDividend > 0 ? `<span class="r-chip" style="color:var(--income)">Div. ${fmt.currency(totDividend)}</span>` : '',
      totExpense  > 0 ? `<span class="r-chip" style="color:var(--expense)">Sp. ${fmt.currency(totExpense)}</span>`  : '',
      `<span class="r-chip" style="font-weight:600;color:${net>=0?'var(--income)':'var(--expense)'}">Netto ${net>=0?'+':''}${fmt.currency(net)}</span>`,
    ].filter(Boolean).join('');

    const isBond = item.asset_type === 'bond';
    const rows = [...txs].sort((a, b) => a.date.localeCompare(b.date)).map(t => {
      const isValued = t.type === 'buy' || t.type === 'sell';
      const commPart = (t.type === 'buy' && t.commission > 0) ? t.commission : 0;
      const principal = isValued ? (isBond ? t.quantity * t.price / 100 : t.quantity * t.price) : t.price;
      const total = principal + commPart;
      const priceDisplay = !isValued ? '—'
        : isBond ? `${t.price.toFixed(4)} %`
        : `${t.price.toFixed(4)} €`;
      const typeLabel = t.type === 'expense' && t.notes === 'Commissione'
        ? `<span style="color:${TYPE_COLOR.expense};font-weight:600">Commissione</span>`
        : `<span style="color:${TYPE_COLOR[t.type]||'var(--txt)'};font-weight:600">${TYPE_LABEL[t.type]||t.type}</span>`;
      const noteText = (t.notes && t.notes !== 'Commissione') ? t.notes : '';
      const commNote = commPart > 0 ? `<small style="color:var(--txt3)">+ comm. ${fmt.currency(commPart)}</small>` : '';
      return `<tr>
        <td style="width:110px">${fmt.date(t.date)}</td>
        <td style="width:130px">${typeLabel}</td>
        <td style="width:100px;text-align:right">${isValued ? t.quantity : '—'}</td>
        <td style="width:160px;text-align:right">${priceDisplay}</td>
        <td style="width:160px;text-align:right;color:${TYPE_COLOR[t.type]||'var(--txt)'}">${TYPE_SIGN[t.type]||''}${fmt.currency(total)}${commNote ? '<br>' + commNote : ''}</td>
        <td>${noteText}</td>
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

  const grandNet = grandSell + grandCoupon + grandDividend - grandBuy - grandExpense;
  const showExp  = grandExpense > 0;
  const showDiv  = grandDividend > 0;
  const showCoup = grandCoupon > 0;

  container.innerHTML = toolbar + cards.join('') + `
    <div class="card" style="margin-top:4px">
      <div style="font-weight:700;margin-bottom:10px">Totale complessivo</div>
      <div class="table-wrap">
        <table><thead><tr>
          <th class="text-right">Acquisti</th>
          <th class="text-right">Vendite</th>
          ${showCoup ? '<th class="text-right">Cedole</th>' : ''}
          ${showDiv  ? '<th class="text-right">Dividendi</th>' : ''}
          ${showExp ? '<th class="text-right">Spese</th>' : ''}
          <th class="text-right">Netto</th>
        </tr></thead><tbody><tr>
          <td class="text-right amount-expense">-${fmt.currency(grandBuy)}</td>
          <td class="text-right amount-income">+${fmt.currency(grandSell)}</td>
          ${showCoup ? `<td class="text-right amount-income">+${fmt.currency(grandCoupon)}</td>` : ''}
          ${showDiv  ? `<td class="text-right amount-income">+${fmt.currency(grandDividend)}</td>` : ''}
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

  const equities = items.filter(i => (i.asset_type || 'equity') === 'equity' && i.quantity > 0);
  const bonds    = items.filter(i => i.asset_type === 'bond' && i.quantity > 0);

  if (!equities.length && !bonds.length) {
    container.innerHTML = '<div class="card" style="padding:32px;text-align:center;color:var(--txt3)">Nessun titolo attivo in portafoglio.</div>';
    return;
  }

  // Render dinamico: prima equity (se presente), poi bond (se presente)
  let html = '';
  if (equities.length) html += `<div id="eqAnalisiSection"></div>`;
  if (bonds.length)    html += `<div id="bondAnalisiSection" style="${equities.length?'margin-top:24px':''}"></div>`;
  container.innerHTML = html;

  if (equities.length) renderEquityAnalisi(equities);
  if (!bonds.length) return;
  // Esegui il rendering bond dentro la propria sezione
  const bondContainer = document.getElementById('bondAnalisiSection');
  renderBondAnalisi(bonds, bondContainer, today, todayYear);
}

// ── Equity analytics ────────────────────────────────────────────────────────
function renderEquityAnalisi(equities) {
  const container = document.getElementById('eqAnalisiSection');
  if (!container) return;

  const palette = [
    '#58a6ff','#3fb950','#f85149','#d29922','#a371f7','#f0883e','#00d4aa','#ec4899',
    '#06b6d4','#84cc16','#6366f1','#fb7185','#22d3ee','#a3e635','#e879f9'
  ];

  // Allocation per posizione (valore attuale)
  const withVal = equities.map(i => ({
    ticker: i.ticker, name: i.name, account: i.account_name,
    val: portfolioItemValue(i, false),
    cost: portfolioItemValue(i, true),
    tr:   positionTotalReturn(i),
  }));
  const totalVal = withVal.reduce((s, x) => s + x.val, 0);

  // Top 10 + "Altri"
  const sortedByVal = [...withVal].sort((a, b) => b.val - a.val);
  const top10 = sortedByVal.slice(0, 10);
  const rest  = sortedByVal.slice(10);
  const restVal = rest.reduce((s, x) => s + x.val, 0);
  const allocLabels = [...top10.map(x => x.ticker), ...(rest.length ? ['Altri'] : [])];
  const allocData   = [...top10.map(x => x.val),    ...(rest.length ? [restVal] : [])];
  const allocColors = allocLabels.map((_, i) => palette[i % palette.length]);

  // Allocazione per conto investimento
  const byAcct = {};
  withVal.forEach(x => { byAcct[x.account] = (byAcct[x.account] || 0) + x.val; });
  const acctLabels = Object.keys(byAcct);
  const acctData   = acctLabels.map(k => byAcct[k]);
  const acctColors = acctLabels.map((_, i) => palette[i % palette.length]);

  // Top winners / losers per % (escludo posizioni con cost=0 per evitare NaN)
  const ranked = withVal.filter(x => x.cost > 0).map(x => ({
    ...x, retPct: x.tr.pct, retEur: x.tr.totalReturn
  }));
  ranked.sort((a, b) => b.retPct - a.retPct);
  const winners = ranked.slice(0, 5);
  const losers  = ranked.slice(-5).reverse();

  container.innerHTML = `
    <div style="font-size:13px;font-weight:700;color:var(--txt2);margin-bottom:10px;letter-spacing:.3px">📈 AZIONARIO</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="card" style="padding:16px">
        <div style="font-weight:600;margin-bottom:12px">Allocazione per titolo</div>
        <canvas id="eqAllocChart" style="max-height:300px"></canvas>
      </div>
      <div class="card" style="padding:16px">
        <div style="font-weight:600;margin-bottom:12px">Allocazione per conto</div>
        <canvas id="eqAcctChart" style="max-height:300px"></canvas>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px">
      <div class="card" style="padding:16px">
        <div style="font-weight:600;margin-bottom:10px;color:var(--income)">▲ Top performer (Tot. Return %)</div>
        ${winners.length ? `<table style="width:100%;font-size:12px;border-collapse:collapse">
          <thead><tr style="color:var(--txt3);border-bottom:1px solid var(--border)">
            <th style="text-align:left;padding:4px 6px">Ticker</th>
            <th style="text-align:right;padding:4px 6px">Tot. Return</th>
            <th style="text-align:right;padding:4px 6px">%</th>
            <th style="text-align:right;padding:4px 6px">Valore</th>
          </tr></thead><tbody>
          ${winners.map(w => `<tr style="border-bottom:1px solid var(--border)">
            <td style="padding:5px 6px"><strong>${w.ticker}</strong><br><small style="color:var(--txt3)">${w.name}</small></td>
            <td style="padding:5px 6px;text-align:right;color:${w.retEur>=0?'var(--income)':'var(--expense)'}">${fmt.currency(w.retEur)}</td>
            <td style="padding:5px 6px;text-align:right;color:${w.retPct>=0?'var(--income)':'var(--expense)'};font-weight:600">${fmt.pct(w.retPct)}</td>
            <td style="padding:5px 6px;text-align:right;color:var(--txt3)">${fmt.currency(w.val)}</td>
          </tr>`).join('')}
        </tbody></table>` : '<div style="color:var(--txt3);font-size:12px">Nessuna posizione con costo &gt; 0</div>'}
      </div>
      <div class="card" style="padding:16px">
        <div style="font-weight:600;margin-bottom:10px;color:var(--expense)">▼ Peggiori (Tot. Return %)</div>
        ${losers.length ? `<table style="width:100%;font-size:12px;border-collapse:collapse">
          <thead><tr style="color:var(--txt3);border-bottom:1px solid var(--border)">
            <th style="text-align:left;padding:4px 6px">Ticker</th>
            <th style="text-align:right;padding:4px 6px">Tot. Return</th>
            <th style="text-align:right;padding:4px 6px">%</th>
            <th style="text-align:right;padding:4px 6px">Valore</th>
          </tr></thead><tbody>
          ${losers.map(w => `<tr style="border-bottom:1px solid var(--border)">
            <td style="padding:5px 6px"><strong>${w.ticker}</strong><br><small style="color:var(--txt3)">${w.name}</small></td>
            <td style="padding:5px 6px;text-align:right;color:${w.retEur>=0?'var(--income)':'var(--expense)'}">${fmt.currency(w.retEur)}</td>
            <td style="padding:5px 6px;text-align:right;color:${w.retPct>=0?'var(--income)':'var(--expense)'};font-weight:600">${fmt.pct(w.retPct)}</td>
            <td style="padding:5px 6px;text-align:right;color:var(--txt3)">${fmt.currency(w.val)}</td>
          </tr>`).join('')}
        </tbody></table>` : '<div style="color:var(--txt3);font-size:12px">—</div>'}
      </div>
    </div>`;

  const txtColor = getComputedStyle(document.documentElement).getPropertyValue('--txt1').trim() || '#ccc';

  new Chart(document.getElementById('eqAllocChart'), {
    type: 'doughnut',
    data: { labels: allocLabels, datasets: [{ data: allocData, backgroundColor: allocColors, borderWidth: 1 }] },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { color: txtColor, font: { size: 11 }, padding: 8 } },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${fmt.currency(ctx.parsed)} (${(ctx.parsed/totalVal*100).toFixed(1)}%)`,
            footer: () => [`Totale: ${fmt.currency(totalVal)}`]
          }
        }
      }
    }
  });

  new Chart(document.getElementById('eqAcctChart'), {
    type: 'doughnut',
    data: { labels: acctLabels, datasets: [{ data: acctData, backgroundColor: acctColors, borderWidth: 1 }] },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { color: txtColor, font: { size: 11 }, padding: 8 } },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${fmt.currency(ctx.parsed)} (${(ctx.parsed/totalVal*100).toFixed(1)}%)`,
          }
        }
      }
    }
  });
}

// ── Bond analytics ──────────────────────────────────────────────────────────
function renderBondAnalisi(bonds, container, today, todayYear) {
  container.innerHTML = `<div style="font-size:13px;font-weight:700;color:var(--txt2);margin-bottom:10px;letter-spacing:.3px">📄 OBBLIGAZIONARIO</div><div id="bondCharts"></div>`;
  const inner = container.querySelector('#bondCharts');

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
  inner.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
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

async function showDividendModal(portfolioId) {
  const [items, accounts] = await Promise.all([api.getPortfolio(), api.getAccounts()]);
  const pos = items.find(i => i.id === portfolioId);
  if (!pos) return;
  const regularAccounts = accounts.filter(a => a.type !== 'investment' && !a.is_closed);
  const today = _todayStr();

  const body = `
    <div style="background:var(--bg3);border-radius:6px;padding:10px 14px;margin-bottom:16px;font-size:13px">
      <strong>${pos.ticker}</strong> — ${pos.name}<br>
      Quantità posseduta: <strong>${pos.quantity}</strong>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Accredita su *</label>
        <select class="form-control" id="d_account">
          <option value="">— Seleziona conto —</option>
          ${regularAccounts.map(a=>`<option value="${a.id}">${a.icon} ${a.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Data pagamento *</label>
        <input type="date" class="form-control" id="d_date" value="${today}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Dividendo per azione (€)</label>
        <input type="text" inputmode="decimal" class="form-control" id="d_per_share" placeholder="Es. 0,52">
      </div>
      <div class="form-group">
        <label class="form-label">Importo lordo totale (€) *</label>
        <input type="text" inputmode="decimal" class="form-control" id="d_gross" placeholder="Calcolato da per azione × qtà">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Tassazione (%)</label>
        <input type="text" inputmode="decimal" class="form-control" id="d_tax_rate" value="26" placeholder="26">
      </div>
      <div class="form-group">
        <label class="form-label">Ritenuta (€)</label>
        <input type="text" class="form-control" id="d_tax_amt" readonly style="background:var(--bg3)">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Importo netto accreditato (€)</label>
        <input type="text" class="form-control" id="d_net" readonly style="background:var(--bg3);font-weight:700;color:var(--income)">
      </div>
      <div class="form-group"></div>
    </div>
    <div class="form-group">
      <label class="form-label">Note</label>
      <input class="form-control" id="d_notes" placeholder="Es. Dividendo Q3 2025">
    </div>`;

  openModal('Registra Dividendo', body, async () => {
    const gross  = parseFloat((document.getElementById('d_gross').value||'').replace(',','.'));
    const taxPct = parseFloat((document.getElementById('d_tax_rate').value||'').replace(',','.')) || 0;
    const net    = gross * (1 - taxPct / 100);
    const data = {
      portfolio_id: portfolioId,
      account_id:   parseInt(document.getElementById('d_account').value),
      amount:       net,
      date:         document.getElementById('d_date').value,
      notes:        document.getElementById('d_notes').value.trim() ||
                    `Dividendo ${pos.ticker} — lordo ${fmt.currency(gross)}, ritenuta ${taxPct}%`,
    };
    if (!data.account_id)     { toast('Seleziona il conto di accredito','error'); return; }
    if (!gross || gross <= 0) { toast('Inserisci un importo lordo valido','error'); return; }
    try {
      await api.registerDividend(data);
      closeModal();
      toast(`Dividendo registrato — netto ${fmt.currency(net)}`);
      renderPortfolio();
    } catch(e) { toast(e.message,'error'); }
  });

  const calcDiv = () => {
    const perShare = parseFloat((document.getElementById('d_per_share')?.value||'').replace(',','.')) || 0;
    const grossEl  = document.getElementById('d_gross');
    if (perShare > 0 && grossEl && !grossEl._userTouched) {
      grossEl.value = (perShare * pos.quantity).toFixed(2);
    }
    const g  = parseFloat((document.getElementById('d_gross')?.value||'').replace(',','.')) || 0;
    const t  = parseFloat((document.getElementById('d_tax_rate')?.value||'').replace(',','.')) || 0;
    const ta = g * t / 100;
    const n  = g - ta;
    const taxEl = document.getElementById('d_tax_amt');
    const netEl = document.getElementById('d_net');
    if (taxEl) taxEl.value = g ? fmt.currency(ta) : '';
    if (netEl) netEl.value = g ? fmt.currency(n) : '';
  };
  setTimeout(() => {
    const grossEl = document.getElementById('d_gross');
    if (grossEl) grossEl.addEventListener('input', () => { grossEl._userTouched = true; calcDiv(); });
    document.getElementById('d_per_share')?.addEventListener('input', calcDiv);
    document.getElementById('d_tax_rate')?.addEventListener('input', calcDiv);
    calcDiv();
  }, 50);
}
window.showDividendModal = showDividendModal;

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
          const isBuy      = t.type === 'buy';
          const isSell     = t.type === 'sell';
          const isCoupon   = t.type === 'coupon';
          const isDividend = t.type === 'dividend';
          const isExpense  = t.type === 'expense';
          const isCashOnly = isCoupon || isDividend || isExpense;
          const color = isBuy || isExpense ? 'var(--expense)' : 'var(--income)';
          const label = isBuy ? 'Acquisto' : isSell ? 'Vendita'
            : isCoupon ? 'Cedola' : isDividend ? 'Dividendo'
            : (t.notes || 'Spesa');
          const sign  = isBuy || isExpense ? -1 : 1;
          const total = isCashOnly ? t.price : t.quantity * t.price;
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
    menu.appendChild(mkItem('💵', 'Registra dividendo', () => showDividendModal(portfolioId)));
    menu.appendChild(mkItem('💸', 'Registra spesa',     () => showExpenseModal(portfolioId)));
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
