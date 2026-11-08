/* ═══════════════════════════════════════════════════════════════════════════
   LucaMoneyManager — pages/proiezione.js
   Scheda «🔮 Proiezione» della pagina Investimenti: come crescerebbe un
   investimento versando una cifra fissa al mese o all'anno.

   Due strumenti:
   - un'OBBLIGAZIONE che possiedi: cedola, frequenza, aliquota e scadenza vere,
     prezzo attuale; la proiezione non può andare oltre la scadenza.
   - un investimento GENERICO: rendimento lordo a scatti di 0,5%, aliquota
     12,5% (titoli di Stato ed equiparati) o 26% (tutto il resto).

   Tutto è calcolato qui, in sola lettura: nessuna scrittura nel DB (lo stato dei
   controlli vive in memoria, come i filtri della pagina). Dipende da
   _portfolioItems e da fmt/chartColors/evalAmount/esc (utils.js).
═══════════════════════════════════════════════════════════════════════════ */

// Stato dei controlli: resta finché l'app è aperta, si azzera al riavvio.
let _proj = {
  src: 'generic',     // 'generic' | id del bond (stringa)
  includePos: true,   // bond: parti dalla posizione che hai già
  initial: 0,         // € investiti subito (in aggiunta alla posizione, per il bond)
  contrib: 200,       // € per versamento
  contribFreq: 'monthly', // 'monthly' | 'yearly'
  years: 10,
  rate: 4,            // generico: rendimento lordo annuo %
  tax: 26,            // aliquota %
  taxMode: 'exit',    // generico: 'exit' (fondo/ETF ad accumulo) | 'yearly' (conto deposito)
  reinvest: true,     // bond: reinvesti le cedole nello stesso titolo
  inflation: 2,
};
let _projChart = null;

const _PROJ_FREQ = { annual: 1, semiannual: 2, quarterly: 4, monthly: 12 };

// Obbligazioni proiettabili: in portafoglio e non ancora scadute.
function _projBonds() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return (_portfolioItems || []).filter(i =>
    i.asset_type === 'bond' && i.quantity > 0 && i.maturity_date &&
    new Date(i.maturity_date + 'T00:00:00') > today);
}

// Mesi interi da oggi alla scadenza (almeno 1).
function _projMonthsTo(dateStr) {
  const t = new Date(), m = new Date(dateStr + 'T00:00:00');
  let n = (m.getFullYear() - t.getFullYear()) * 12 + (m.getMonth() - t.getMonth());
  if (m.getDate() < t.getDate()) n--;
  return Math.max(1, n);
}

// ── Motore: simulazione mese per mese ───────────────────────────────────────
// Restituisce i punti mensili { m, invested, gross, net, real } e un riepilogo.
// gross = valore di mercato; net = quanto resterebbe vendendo/incassando quel mese
// (imposte sulla plusvalenza latente già tolte); real = net in euro di oggi.
function _projSimulate(p, bond) {
  const months   = p._months;
  const infl     = p.inflation / 100;
  const t        = p.tax / 100;
  const isContribMonth = m => p.contribFreq === 'monthly' ? true : m % 12 === 0;
  const pts = [];
  const real = (v, m) => v / Math.pow(1 + infl, m / 12);

  if (!bond) {
    // Generico. Imposta alla vendita: il capitale cresce lordo e si tassa solo il
    // guadagno finale (fondo/ETF ad accumulo). Imposta ogni anno: il rendimento è già
    // netto mentre matura, quindi capitalizza meno (conto deposito, cedole incassate).
    const rGross = p.rate / 100;
    const rEff   = p.taxMode === 'yearly' ? rGross * (1 - t) : rGross;
    const rm     = Math.pow(1 + rEff, 1 / 12) - 1;
    let value = p.initial, invested = p.initial, taxPaidYearly = 0;
    const netOf = () => p.taxMode === 'yearly' ? value : value - Math.max(0, value - invested) * t;
    pts.push({ m: 0, invested, gross: value, net: netOf(), real: netOf() });
    for (let m = 1; m <= months; m++) {
      const before = value;
      value *= 1 + rm;
      if (p.taxMode === 'yearly') {
        // Quota d'imposta implicita nel rendimento netto: per il riepilogo.
        const grossGain = before * (Math.pow(1 + rGross, 1 / 12) - 1);
        taxPaidYearly += Math.max(0, grossGain - (value - before));
      }
      if (isContribMonth(m)) { value += p.contrib; invested += p.contrib; }
      const net = netOf();
      pts.push({ m, invested, gross: value, net, real: real(net, m) });
    }
    const last = pts[pts.length - 1];
    const taxes = p.taxMode === 'yearly' ? taxPaidYearly : last.gross - last.net;
    return { pts, taxes, coupons: 0 };
  }

  // Obbligazione. Prezzo che converge linearmente a 100 alla scadenza ("pull to par"):
  // non è una previsione del mercato, è l'unica ipotesi neutra — alla scadenza il
  // titolo vale per forza 100. Si compra sempre al prezzo del momento, niente
  // commissioni né rateo. Cedole e plusvalenza usano la stessa aliquota (Stato 12,5%, altri 26%).
  const P0      = bond.current_price || bond.avg_price || 100;
  const T       = _projMonthsTo(bond.maturity_date);
  const priceAt = m => P0 + (100 - P0) * Math.min(m, T) / T;
  const freq    = _PROJ_FREQ[bond.coupon_frequency] || 1;
  const step    = 12 / freq;
  // Le cedole cadono nei mesi che distano un multiplo del periodo dalla scadenza.
  const isCouponMonth = m => (T - m) % step === 0;

  let nominal = 0, cost = 0, cash = 0, invested = 0, couponsNet = 0, couponTax = 0;
  if (p.includePos) {
    nominal  = bond.quantity;
    cost     = bond.quantity * (bond.avg_price || P0) / 100;
    invested = cost;
  }
  const buy = (eur, m) => { nominal += eur / (priceAt(m) / 100); cost += eur; };
  if (p.initial > 0) { buy(p.initial, 0); invested += p.initial; }

  const snap = m => {
    const matured = m >= T;
    const gross = nominal * (matured ? 100 : priceAt(m)) / 100;
    const net   = gross - Math.max(0, gross - cost) * t + cash;
    return { m, invested, gross: gross + cash, net, real: real(net, m) };
  };
  pts.push(snap(0));
  for (let m = 1; m <= months; m++) {
    if (isCouponMonth(m) && bond.coupon_rate > 0) {
      const lordo = nominal * (bond.coupon_rate / 100) / freq;
      const c = lordo * (1 - t);   // aliquota scelta (proposta da quella della posizione)
      couponTax += lordo - c;
      couponsNet += c;
      // L'ultima cedola arriva insieme al rimborso: non c'è più niente da comprare.
      if (p.reinvest && m < T) buy(c, m); else cash += c;
    }
    if (isContribMonth(m) && m < T) { buy(p.contrib, m); invested += p.contrib; }
    pts.push(snap(m));
  }
  const last = pts[pts.length - 1];
  // Imposte = ritenute sulle cedole + imposta sulla plusvalenza finale (o latente).
  return { pts, taxes: couponTax + (last.gross - last.net), couponTax, coupons: couponsNet, nominal };
}

// ── Disegno ─────────────────────────────────────────────────────────────────
function renderPortfolioProiezione() {
  const box = document.getElementById('pgPortfolioProiezione');
  if (!box) return;
  const bonds = _projBonds();
  if (_proj.src !== 'generic' && !bonds.some(b => String(b.id) === _proj.src)) _proj.src = 'generic';
  const bond = bonds.find(b => String(b.id) === _proj.src) || null;

  const row = (label, inner, hint = '') => `
    <div style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:4px">
        <span class="form-label" style="margin:0">${label}</span>${hint}
      </div>${inner}
    </div>`;
  const out = id => `<strong id="${id}" style="font-variant-numeric:tabular-nums"></strong>`;
  const seg = (name, val, opts) => `<div class="theme-toggle-group" style="margin:0">${opts.map(([v, l]) =>
    `<button class="btn theme-btn ${_proj[name] === v ? 'theme-btn-active' : ''}"
       style="${_proj[name] === v ? 'background:var(--accent);border-color:var(--accent);color:#fff' : ''}"
       onclick="_projSet('${name}', ${typeof v === 'number' ? v : `'${v}'`}, true)">${l}</button>`).join('')}</div>`;

  let bondInfo = '';
  if (bond) {
    const P0 = bond.current_price || bond.avg_price || 100;
    const yrs = _projMonthsTo(bond.maturity_date) / 12;
    bondInfo = `<div style="font-size:12px;color:var(--txt2);background:var(--bg3);border-radius:var(--radius-ctl,6px);padding:8px 10px;margin-bottom:14px;line-height:1.55">
      Cedola <strong>${bond.coupon_rate || 0}%</strong> lorda ${esc(({annual:'annuale',semiannual:'semestrale',quarterly:'trimestrale',monthly:'mensile'})[bond.coupon_frequency] || '')}
      · imposta ${bond.coupon_tax ?? 12.5}%<br>
      Prezzo ${P0.toLocaleString('it-IT', { maximumFractionDigits: 3 })}${bond.current_price ? '' : ' <span title="Nessun prezzo di mercato: uso il prezzo medio di carico">(PMC)</span>'}
      · scade il <strong>${fmt.date ? fmt.date(bond.maturity_date) : bond.maturity_date}</strong> (${yrs.toLocaleString('it-IT', { maximumFractionDigits: 1 })} anni)<br>
      In portafoglio: ${fmt.currency(bond.quantity).replace('€', '').trim()} nominali</div>`;
  }

  const maxYears = bond ? Math.ceil(_projMonthsTo(bond.maturity_date) / 12) : 40;
  if (_proj.years > maxYears) _proj.years = maxYears;

  box.innerHTML = `
  <div class="card" style="padding:16px">
    <div style="margin-bottom:14px">
      <div style="font-size:16px;font-weight:600">Proiezione dell'investimento</div>
      <div style="font-size:12px;color:var(--txt3)">Come potrebbe crescere un capitale versando una cifra fissa nel tempo, al netto delle imposte.</div>
    </div>
    <div style="display:grid;grid-template-columns:300px 1fr;gap:20px;align-items:start">
      <div>
        ${row('Strumento', `<select class="form-control" onchange="_projSet('src', this.value, true)">
            <option value="generic" ${!bond ? 'selected' : ''}>📈 Investimento generico</option>
            ${bonds.length ? `<optgroup label="Le mie obbligazioni">${bonds
              .sort((a, b) => a.maturity_date.localeCompare(b.maturity_date))
              .map(b => `<option value="${b.id}" ${bond && b.id === bond.id ? 'selected' : ''}>${esc(b.ticker)}${b.name ? ' — ' + esc(b.name) : ''} (${b.maturity_date.slice(0, 4)})</option>`).join('')}</optgroup>` : ''}
          </select>`)}
        ${bondInfo}
        ${bond ? row('', `<label style="display:flex;gap:8px;align-items:center;font-size:13px;cursor:pointer">
            <input type="checkbox" ${_proj.includePos ? 'checked' : ''} onchange="_projSet('includePos', this.checked, false)">
            Parti dalla posizione che hai già</label>`) : ''}
        ${row(bond ? 'Acquisto iniziale aggiuntivo' : 'Capitale iniziale',
          `<input type="text" inputmode="decimal" class="form-control" value="${_proj.initial}"
             oninput="_projSet('initial', evalAmount(this.value) || 0, false)">`)}
        ${row('Versamento', `<div style="display:flex;gap:8px;align-items:center">
            <input type="text" inputmode="decimal" class="form-control" style="flex:1;min-width:0" value="${_proj.contrib}"
               oninput="_projSet('contrib', evalAmount(this.value) || 0, false)">
            ${seg('contribFreq', _proj.contribFreq, [['monthly', 'al mese'], ['yearly', "all'anno"]])}
          </div>`)}
        ${row('Orizzonte', `<input type="range" min="1" max="${maxYears}" step="1" value="${_proj.years}" style="width:100%;accent-color:var(--accent)"
             oninput="_projSet('years', +this.value, false)">`, out('projYearsOut'))}
        ${bond ? '' : row('Rendimento lordo annuo', `<input type="range" min="0.5" max="12" step="0.5" value="${_proj.rate}" style="width:100%;accent-color:var(--accent)"
             oninput="_projSet('rate', +this.value, false)">`, out('projRateOut'))}
        ${row('Aliquota', seg('tax', _proj.tax, [[12.5, '12,5% · titoli di Stato'], [26, '26% · altri']]))}
        ${bond ? row('', `<label style="display:flex;gap:8px;align-items:center;font-size:13px;cursor:pointer">
              <input type="checkbox" ${_proj.reinvest ? 'checked' : ''} onchange="_projSet('reinvest', this.checked, false)">
              Reinvesti le cedole nello stesso titolo</label>`)
          : row('Imposte pagate', seg('taxMode', _proj.taxMode, [['exit', 'alla vendita'], ['yearly', 'ogni anno']]),
              `<span style="font-size:11px;color:var(--txt3)" title="Alla vendita: fondi ed ETF ad accumulo, il guadagno si tassa solo quando si disinveste e intanto capitalizza lordo.&#10;Ogni anno: conti deposito, cedole e dividendi incassati, l'imposta si paga mentre il rendimento matura.">ⓘ</span>`)}
        ${row('Inflazione annua', `<input type="range" min="0" max="10" step="0.5" value="${_proj.inflation}" style="width:100%;accent-color:var(--accent)"
             oninput="_projSet('inflation', +this.value, false)">`, out('projInflOut'))}
      </div>
      <div style="min-width:0">
        <div id="projKpi" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:12px"></div>
        <div id="projNote" style="font-size:12px;color:var(--txt3);margin-bottom:8px"></div>
        <div style="position:relative;height:340px"><canvas id="projChart"></canvas></div>
        <div style="font-size:11px;color:var(--txt3);margin-top:10px;line-height:1.5">
          ${bond
            ? "Ipotesi: si compra sempre al prezzo del momento, che converge in linea retta a 100 alla scadenza; niente commissioni né rateo. All'imposta sulle cedole si aggiunge quella sulla differenza fra rimborso (o prezzo) e costo; le minusvalenze non danno credito."
            : "Ipotesi: rendimento costante, capitalizzazione mensile, nessuna commissione. Le minusvalenze non danno credito d'imposta."}
          È una stima, non una previsione.
        </div>
      </div>
    </div>
  </div>`;
  _projUpdate();
}

// Aggiorna un parametro. `full` ridisegna anche i controlli (cambio strumento,
// pulsanti a scelta); altrimenti ricalcola solo numeri e grafico, così chi sta
// scrivendo in un campo non perde il cursore.
function _projSet(key, val, full) {
  _proj[key] = val;
  if (key === 'src' && val !== 'generic') {
    const b = _projBonds().find(x => String(x.id) === val);
    if (b) { _proj.tax = (b.coupon_tax ?? 12.5) <= 12.5 ? 12.5 : 26; _proj.years = Math.ceil(_projMonthsTo(b.maturity_date) / 12); }
  }
  if (full) renderPortfolioProiezione(); else _projUpdate();
}

function _projUpdate() {
  const bond = _projBonds().find(b => String(b.id) === _proj.src) || null;
  const p = { ..._proj };
  p._months = p.years * 12;
  let capped = false;
  if (bond) {
    const T = _projMonthsTo(bond.maturity_date);
    if (p._months >= T) { p._months = T; capped = true; }
  }
  const r = _projSimulate(p, bond);
  const last = r.pts[r.pts.length - 1];
  const gain = last.net - last.invested;

  const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  const yLbl = n => n === 1 ? '1 anno' : `${n} anni`;
  const anni = (p._months / 12).toLocaleString('it-IT', { maximumFractionDigits: 1 });
  set('projYearsOut', capped ? `${anni} anni (a scadenza)` : yLbl(p.years));
  set('projRateOut',  `${p.rate.toLocaleString('it-IT')}%  ·  netto ${(p.rate * (1 - p.tax / 100)).toLocaleString('it-IT', { maximumFractionDigits: 2 })}%`);
  set('projInflOut',  `${p.inflation.toLocaleString('it-IT')}%`);

  const card = (label, value, sub, color = 'var(--txt)', title = '') => `
    <div class="stat-card" ${title ? `title="${title}"` : ''}>
      <div class="stat-label">${label}</div>
      <div class="stat-value" style="color:${color}">${value}</div>
      <div class="stat-sub" style="color:var(--txt3)">${sub}</div>
    </div>`;
  const kpi = document.getElementById('projKpi');
  if (kpi) kpi.innerHTML =
    card('💶 Totale versato', fmt.currency(last.invested),
      bond && p.includePos ? 'carico attuale + versamenti' : `${fmt.currency(last.invested - p.initial)} di versamenti`) +
    card('📈 Valore finale netto', fmt.currency(last.net),
      `${gain >= 0 ? '+' : ''}${fmt.currency(gain)} di guadagno`, gain >= 0 ? 'var(--income)' : 'var(--expense)',
      'Quanto resterebbe in tasca incassando o vendendo tutto alla fine, imposte già tolte') +
    card('🛒 Valore reale', fmt.currency(last.real),
      `in euro di oggi (inflazione ${p.inflation.toLocaleString('it-IT')}%)`, 'var(--accent2)') +
    card('🏛️ Imposte', fmt.currency(r.taxes),
      bond ? `${fmt.currency(r.couponTax)} sulle cedole · cedole nette ${fmt.currency(r.coupons)}` : (p.taxMode === 'yearly' ? 'pagate anno per anno' : 'da pagare alla vendita'),
      'var(--txt2)');

  const note = document.getElementById('projNote');
  if (note) {
    note.innerHTML = bond
      ? (capped
          ? `La proiezione si ferma alla scadenza: il ${bond.maturity_date.split('-').reverse().join('/')} ricevi il rimborso del valore nominale, ${fmt.currency(r.nominal)},${r.coupons ? ' più l\'ultima cedola' : ''}. Per andare oltre, scegli un <a href="#" onclick="_projSet('src','generic',true);return false">investimento generico</a> col rendimento a cui reinvestiresti.`
          : `Fra ${yLbl(p.years)} il titolo non sarà ancora scaduto: il valore è quello di mercato stimato (${fmt.currency(r.nominal)} nominali), con le imposte che pagheresti vendendolo.`)
      : '';
  }
  _projDrawChart(r.pts);
}

function _projDrawChart(pts) {
  const el = document.getElementById('projChart');
  if (!el) return;
  const cc = chartColors();
  const css = getComputedStyle(document.documentElement);
  const accent = css.getPropertyValue('--accent').trim() || '#58a6ff';
  const green  = css.getPropertyValue('--income').trim() || '#3fb950';
  const grey   = css.getPropertyValue('--txt3').trim() || '#888';
  const now = new Date();
  const labels = pts.map(x => {
    const d = new Date(now.getFullYear(), now.getMonth() + x.m, 1);
    return d.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' });
  });
  const round = v => Math.round(v * 100) / 100;
  const compact = new Intl.NumberFormat('it-IT', { notation: 'compact', maximumFractionDigits: 1 });
  const ds = [
    { label: 'Valore netto',  data: pts.map(x => round(x.net)),      borderColor: accent, backgroundColor: accent + '1f', fill: false, borderWidth: 2.5 },
    { label: 'Valore reale',  data: pts.map(x => round(x.real)),     borderColor: green,  borderWidth: 2 },
    { label: 'Versato',       data: pts.map(x => round(x.invested)), borderColor: grey,   borderWidth: 1.5, borderDash: [5, 4] },
  ].map(d => ({ ...d, pointRadius: 0, pointHoverRadius: 4, tension: 0.15 }));

  if (_projChart) { _projChart.destroy(); _projChart = null; }
  _projChart = new Chart(el, {
    type: 'line',
    data: { labels, datasets: ds },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: cc.tick, boxWidth: 14, font: { size: 11 } } },
        tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${fmt.currency(c.parsed.y)}` } },
      },
      scales: {
        x: { ticks: { color: cc.tick, maxTicksLimit: 12, autoSkip: true, maxRotation: 0 }, grid: { color: cc.grid } },
        y: { ticks: { color: cc.tick, callback: v => compact.format(v) + ' €' }, grid: { color: cc.grid } },
      },
    },
  });
}
