/* ═══════════════════════════════════════════════════════════════════════════
   LucaMoneyManager — utils.js
   Helper puri condivisi (estratti da app.js, stadio 2 del refactor)
═══════════════════════════════════════════════════════════════════════════ */

/* ─── Chart theme helpers ─────────────────────────────────────────────────── */
Chart.defaults.animation.duration = 700;
Chart.defaults.animation.easing   = 'linear';

const chartColors = () => {
  const t = document.documentElement.dataset.theme;
  if (t === 'carta') return { tick: '#8a7860', grid: 'rgba(0,0,0,0.05)' };
  if (t === 'petrolio') return { tick: '#9db3b8', grid: 'rgba(157,179,184,0.10)' };
  return { tick: '#8b949e', grid: 'rgba(255,255,255,0.06)' };
};

const zoomOpts = () => ({
  zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' },
  pan:  { enabled: true, mode: 'x' }
});

/* ─── Lazy-load script vendor (caricamento on-demand) ─────────────────────── */
// Carica uno script una sola volta, restituendo una Promise risolta quando è
// pronto. Usato per librerie pesanti non necessarie all'avvio (es. Quill, usato
// solo nell'editor delle Note) così da non parsarle a ogni avvio dell'app.
const _lazyScripts = {};
function loadVendorScript(src) {
  if (_lazyScripts[src]) return _lazyScripts[src];
  _lazyScripts[src] = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => { delete _lazyScripts[src]; reject(new Error('Caricamento fallito: ' + src)); };
    document.head.appendChild(s);
  });
  return _lazyScripts[src];
}

/* ─── Account visibility helpers ─────────────────────────────────────────── */
// Tre stati: aperto (is_closed=0) → chiuso (is_closed=1) → chiuso e nascosto (is_hidden=1).
// "Nascosto" è un sotto-stato di "chiuso": is_hidden=1 implica sempre is_closed=1 (invariante
// garantita da Database.updateAccount). Un conto nascosto sparisce da liste, selettori, totali
// e report; resta raggiungibile solo dal toggle "Mostra nascosti" nella pagina Conti.
const isAccountHidden  = a => !!a.is_hidden;
// Dipende da _accFavoritesOnly (let globale dichiarata in app.js).
const isAccountVisible = a =>
  isAccountHidden(a) ? false : (_accFavoritesOnly ? (a.is_favorite && !a.is_closed) : true);
const isAccountActive  = a => !a.is_closed && !a.is_hidden;

/* ─── Calculator helper ────────────────────────────────────────────────────── */
/** Valuta una semplice espressione +/- (es. "40+10.30", "100-49.70").
 *  Accetta sia virgola che punto come separatore decimale.
 *  Ritorna un Number se valido, null altrimenti.
 *  Di default rifiuta i risultati negativi (campi importo); passare
 *  `allowNegative = true` (calcolatrice) per accettarli. */
function evalAmount(raw, allowNegative = false) {
  if (!raw || !raw.toString().trim()) return null;
  const s = raw.toString().replace(/,/g, '.').replace(/\s/g, '');
  if (!/^[0-9+\-*/.][0-9+\-*/.]*$/.test(s)) return null;
  // Split su + e - come nell'originale (lookahead, nessun lookbehind)
  const addTerms = s.split(/(?=[+\-])/).filter(t => t !== '');
  let result = 0;
  for (const term of addTerms) {
    // Estrai segno iniziale (+/-)
    let sign = 1, rest = term;
    if (rest[0] === '+') rest = rest.slice(1);
    else if (rest[0] === '-') { sign = -1; rest = rest.slice(1); }
    // Gestisci * e / all'interno del termine (split con delimitatori)
    const parts = rest.split(/([*\/])/);
    let val = parseFloat(parts[0]);
    if (isNaN(val)) return null;
    for (let i = 1; i < parts.length; i += 2) {
      const op = parts[i], n = parseFloat(parts[i + 1]);
      if (isNaN(n)) return null;
      if (op === '*') val *= n;
      else { if (n === 0) return null; val /= n; }
    }
    result += sign * val;
  }
  return (allowNegative || result >= 0) ? result : null;
}

/* ─── Utils ───────────────────────────────────────────────────────────────── */
// Restituisce solo le categorie foglia (quelle senza figli) da una lista di categorie.
function _leafCats(cats) {
  const pids = new Set(cats.filter(c => c.parent_id).map(c => c.parent_id));
  return cats.filter(c => !pids.has(c.id));
}

const fmt = {
  currency: v => new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(v ?? 0),
  price:    v => new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:4}).format(v ?? 0),
  date: s => s ? new Date(s + 'T00:00:00').toLocaleDateString('it-IT') : '',
  month: (m,y) => new Date(y,m-1,1).toLocaleDateString('it-IT',{month:'long',year:'numeric'}),
  pct: v => (v >= 0 ? '+' : '') + v.toFixed(2) + '%',
  // Currency con peso variabile: intero bold, decimali medium opachi, simbolo € light tenue.
  // Restituisce HTML (usare con innerHTML). Pensata per KPI dashboard / numeri grandi prominenti.
  currencyRich: v => {
    const formatted = new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(v ?? 0);
    // Pattern italiano: "1.234,56 €" o "-1.234,56 €"
    const m = formatted.match(/^(-?)([\d.]+)(,\d{2})\s*(\D+)$/);
    if (!m) return formatted; // fallback safe
    const [, sign, intPart, decPart, symbol] = m;
    return `${sign}${intPart}<span style="font-weight:500;opacity:.75">${decPart}</span><span style="font-weight:400;opacity:.55;margin-left:2px">${symbol.trim()}</span>`;
  },
};

// Escape dei caratteri attivi in HTML, per interpolare testo dell'utente dentro un template
// letterale destinato a innerHTML. Serve perché la descrizione di una transazione può arrivare
// da pending.jsonl (scritto dall'app Android) e finisce in tabelle e notifiche senza passare da
// createTextNode. Copre anche apici e virgolette: alcuni punti la usano dentro un attributo
// (es. title="${esc(...)}"), dove & < > da soli non bastano a chiudere l'iniezione.
const esc = s => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/* ─── Date helpers ────────────────────────────────────────────────────────── */
// Formatta una Date come YYYY-MM-DD nel fuso locale (toISOString userebbe UTC e sfaserebbe di 1 giorno)
const _dateStr  = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const _todayStr = () => _dateStr(new Date());

// Mostra un toast effimero (success/error/info) in basso, auto-rimosso dopo 3.5s.
function toast(msg, type='success') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  const icon = type==='success'?'✅':type==='error'?'❌':type==='warning'?'⚠️':'ℹ️';
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ── Salute Finanziaria — calcolo score 0-100 ────────────────────────────────
// Single source of truth: usata sia dal widget dashboard che dalla pagina analytics.
// Input: balRows = [{ym, income, expense}, ...] (N mesi), accounts = lista conti.
// Output: oggetto con score + tutti gli intermedi (necessari per UI dettaglio analytics).
function computeHealthScore(balRows, accounts) {
  const incomes  = balRows.map(r => r.income  || 0);
  const expenses = balRows.map(r => r.expense || 0);
  const savings  = incomes.map((v, i) => v - expenses[i]);
  const n        = balRows.length;

  const totalIncome    = incomes.reduce((a, b) => a + b, 0);
  const totalExpense   = expenses.reduce((a, b) => a + b, 0);
  const totalSavings   = totalIncome - totalExpense;
  const avgSavingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;

  // 1. Tasso risparmio (0–46 pt) — 8 soglie
  const scoreSavings = avgSavingsRate >= 20 ? 46 : avgSavingsRate >= 15 ? 40 : avgSavingsRate >= 10 ? 33 : avgSavingsRate >= 7 ? 26 : avgSavingsRate >= 5 ? 18 : avgSavingsRate >= 3 ? 11 : avgSavingsRate > 0 ? 5 : avgSavingsRate === 0 ? 0 : avgSavingsRate >= -5 ? -8 : avgSavingsRate >= -10 ? -15 : -23;

  // 2. Stabilità mensile (0–14 pt) — finestre rolling di 3 mesi (robusta alle spese annuali lumpy)
  // Una grossa uscita pianificata in un mese (tasse, assicurazione, IMU) non conta come
  // "fallimento" se i mesi adiacenti la assorbono: valutiamo la somma mobile su 3 mesi.
  const posMonths = savings.filter(s => s > 0).length;   // per-month: usata per i chip e per i floor del trend
  const posPct    = n > 0 ? posMonths / n : 0;
  let roll3Pos = 0, roll3Total = 0;
  for (let i = 0; i + 3 <= n; i++) { roll3Total++; if (savings[i] + savings[i + 1] + savings[i + 2] > 0) roll3Pos++; }
  const roll3Pct  = roll3Total > 0 ? roll3Pos / roll3Total : posPct;   // fallback per-month se n < 3
  const scorePos  = roll3Pct === 1 ? 14 : roll3Pct >= 0.9 ? 13 : roll3Pct >= 0.75 ? 11 : roll3Pct >= 0.6 ? 8 : roll3Pct >= 0.4 ? 5 : roll3Pct >= 0.2 ? 2 : 0;

  // IQM uscite (media interquartile, robusta agli outlier)
  const expSorted = [...expenses].sort((a, b) => a - b);
  const expQ1 = Math.floor(n * 0.25), expQ3 = Math.ceil(n * 0.75);
  const expDiv = expQ3 - expQ1;
  const expMedian = expDiv > 0 ? expSorted.slice(expQ1, expQ3).reduce((a, b) => a + b, 0) / expDiv : 0;

  // 3. Riserva di emergenza (0–10 pt)
  // Riserva = liquidità immediata (conti non-investimento) + investimenti scontati (haircut):
  // in una crisi gli asset investiti possono valere meno, c'è tassazione e serve tempo per
  // venderli — ma restano una riserva reale, quindi contano (al netto dello sconto) per chi
  // sceglie di investire la liquidità invece di tenerla ferma.
  const INVEST_HAIRCUT = 0.75;
  const liquidAccs     = accounts.filter(a => a.type !== 'investment' && !a.is_closed);
  const investAccs     = accounts.filter(a => a.type === 'investment' && !a.is_closed);
  const cashBalance    = liquidAccs.reduce((s, a) => s + (a.balance || 0), 0);
  const investBalance  = investAccs.reduce((s, a) => s + (a.balance || 0), 0);
  const reserveBalance = cashBalance + investBalance * INVEST_HAIRCUT;
  const runwayMonths   = expMedian > 0 ? reserveBalance / expMedian : (reserveBalance > 0 ? 99 : 0);
  const scoreRunway    = runwayMonths >= 6 ? 14 : runwayMonths >= 3 ? 10 : runwayMonths >= 1.5 ? 6 : runwayMonths >= 0.5 ? 3 : 0;

  // 4. Trend del risparmio (0–16 pt) — confronto robusto mediana 2ª metà vs 1ª metà del periodo.
  // Più stabile della regressione OLS su pochi mesi: un singolo mese-outlier non sposta il risultato.
  const incSorted = [...incomes].sort((a, b) => a - b);
  const incQ1 = Math.floor(n * 0.25), incQ3 = Math.ceil(n * 0.75);
  const incMedian = incQ3 > incQ1 ? incSorted.slice(incQ1, incQ3).reduce((a, b) => a + b, 0) / (incQ3 - incQ1) : 0;
  const _median = arr => { if (!arr.length) return 0; const s = [...arr].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const trendHalf    = Math.floor(n / 2);
  const savMedFirst  = _median(savings.slice(0, trendHalf));
  const savMedSecond = _median(savings.slice(n - trendHalf));
  const trendMonths  = (n - trendHalf) || 1;   // ~distanza tra i centri delle due metà
  const savSlope     = trendHalf > 0 ? (savMedSecond - savMedFirst) / trendMonths : 0;   // €/mese (robusto)
  const savSlopePct  = incMedian > 0 ? savSlope / incMedian * 100 : 0;
  const scoreIncTrendRaw = savSlopePct > 3 ? 16 : savSlopePct > 1 ? 13 : savSlopePct >= 0 ? 7 : savSlopePct > -1 ? 6 : savSlopePct > -3 ? 2 : 0;
  const scoreIncTrend = (posPct === 1 && avgSavingsRate >= 10) ? Math.max(scoreIncTrendRaw, 7)
    : (posPct >= 0.75 && avgSavingsRate >= 5) ? Math.max(scoreIncTrendRaw, 5) : scoreIncTrendRaw;

  // 5. Stabilità entrate (0–10 pt) — semi-deviazione downside
  const incSemiVar = n > 1 ? incomes.reduce((a, v) => a + (v < incMedian ? (v - incMedian) ** 2 : 0), 0) / n : 0;
  const incStddev  = Math.sqrt(incSemiVar);
  const incCV      = incMedian > 0 ? incStddev / incMedian * 100 : 100;
  const scoreVol   = n < 2 ? 0 : incCV < 3 ? 10 : incCV < 6 ? 9 : incCV < 12 ? 7 : incCV < 20 ? 4 : incCV < 30 ? 1 : 0;

  const score      = Math.min(100, scoreSavings + scorePos + scoreRunway + scoreIncTrend + scoreVol);
  const scoreColor = score >= 75 ? 'var(--income)' : score >= 50 ? '#e8a838' : score >= 30 ? '#e07020' : 'var(--expense)';
  const scoreLabel = score >= 75 ? 'Ottima' : score >= 60 ? 'Buona' : score >= 45 ? 'Discreta' : score >= 30 ? 'Sufficiente' : score >= 0 ? 'Attenzione' : 'Critica';

  return {
    // arrays
    incomes, expenses, savings, n,
    // totali
    totalIncome, totalExpense, totalSavings, avgSavingsRate,
    // componenti
    scoreSavings, scorePos, scoreRunway, scoreIncTrend, scoreVol,
    // aggregato
    score, scoreColor, scoreLabel,
    // dettaglio
    posMonths, posPct, roll3Pos, roll3Total, roll3Pct,
    expMedian, cashBalance, investBalance, reserveBalance, liquidAccs, investAccs, runwayMonths, investHaircut: INVEST_HAIRCUT,
    incMedian, savSlope, savSlopePct, savMedFirst, savMedSecond, trendHalf,
    incStddev, incCV,
  };
}

// Sparkline cumulativa con confronto anno precedente.
// Linea solida (anno corrente) + linea tratteggiata grigia (anno precedente, stessi mesi).
// Il colore della solida è semanticamente corretto (verde = sopra/meglio dell'anno scorso, rosso = sotto).
// showXTicks opzionale: se true, disegna tick verticali sull'asse X per ogni punto dati.
function cumulativeCompareSvg(currCum, prevCum, color, w = 150, h = 48, showXTicks = false) {
  if (!currCum || !currCum.length) return '';
  const allValues = [...currCum, ...(prevCum || [])].filter(v => v != null);
  if (!allValues.length) return '';
  const min = Math.min(...allValues, 0);
  const max = Math.max(...allValues, 0);
  const range = max - min || 1;
  const pad = 2;
  const tickH = showXTicks ? 4 : 0;
  const chartH = h - tickH;
  const len = Math.max(currCum.length, (prevCum || []).length);
  const stepX = w / (len - 1 || 1);
  const toPoints = vals => vals.map((v, i) => {
    const y = (chartH - pad - ((v - min) / range) * (chartH - 2 * pad)).toFixed(1);
    return `${(i * stepX).toFixed(1)},${y}`;
  }).join(' ');
  const currPts = toPoints(currCum);
  const prevPts = prevCum && prevCum.length ? toPoints(prevCum) : '';
  // Baseline zero se la scala attraversa 0
  let zeroLine = '';
  if (min < 0 && max > 0) {
    const zy = (chartH - pad - ((0 - min) / range) * (chartH - 2 * pad)).toFixed(1);
    zeroLine = `<line x1="0" y1="${zy}" x2="${w}" y2="${zy}" stroke="rgba(255,255,255,.18)" stroke-width="0.6" stroke-dasharray="2,2"/>`;
  }
  // Tick verticali sull'asse X (uno per punto cumulativo)
  let xTicksHtml = '';
  if (showXTicks) {
    const yTop = chartH;
    const yBot = h - 1;
    xTicksHtml = currCum.map((_, i) => {
      const x = (i * stepX).toFixed(1);
      return `<line x1="${x}" y1="${yTop}" x2="${x}" y2="${yBot}" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>`;
    }).join('');
  }
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;flex-shrink:0;color:var(--txt2)">
    ${zeroLine}
    ${prevPts ? `<polyline points="${prevPts}" fill="none" stroke="var(--txt3)" stroke-width="1.2" stroke-dasharray="3,2" opacity="0.55" stroke-linecap="round"/>` : ''}
    <polyline points="${currPts}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    ${xTicksHtml}
  </svg>`;
}

// Badge percentuale con freccia trend. goodIfPositive: true se aumento è positivo (es. entrate).
function trendBadge(pct, goodIfPositive = true) {
  if (pct === null || pct === undefined || !isFinite(pct)) return '';
  const abs = Math.abs(pct);
  const neutral = abs < 0.5;
  const good = goodIfPositive ? pct >= 0 : pct <= 0;
  const color = neutral ? 'var(--txt3)' : (good ? 'var(--income)' : 'var(--expense)');
  const arrow = neutral ? '→' : (pct > 0 ? '↑' : '↓');
  const sign = pct >= 0 ? '+' : '';
  return `<span style="font-size:11px;color:${color};font-weight:600">${arrow} ${sign}${pct.toFixed(1)}%</span>`;
}

// Toast con bottone azione (per soft-undo). Restituisce { dismiss } per chiusura manuale.
function toastWithAction(msg, actionLabel, actionCb, duration = 5000) {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = 'toast toast-info';
  t.innerHTML = `<span>↩️</span><span>${msg}</span>`;
  const btn = document.createElement('button');
  btn.textContent = actionLabel;
  btn.className = 'toast-action-btn';
  btn.style.cssText = 'margin-left:auto;background:transparent;border:1px solid var(--txt2);color:var(--txt);cursor:pointer;padding:3px 12px;border-radius:4px;font-size:12px;font-weight:600';
  let done = false;
  btn.onclick = () => {
    if (done) return;
    done = true;
    try { actionCb(); } catch(e) { console.error(e); }
    t.remove();
  };
  t.appendChild(btn);
  c.appendChild(t);
  setTimeout(() => { if (!done) t.remove(); }, duration);
  return { dismiss: () => { done = true; t.remove(); } };
}

/* ─── Emoji picker (estratto da app.js, stadio 9 del refactor) ─────────── */
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
  // ── Persone (per categorie intestate a familiari: figli, coppia, ecc.) ──
  {e:'🧑',k:'persona adulto generico'},{e:'👨',k:'uomo padre papa persona'},
  {e:'👩',k:'donna madre mamma persona'},{e:'👦',k:'figlio bambino ragazzo persona'},
  {e:'👧',k:'figlia bambina ragazza persona'},{e:'🧔',k:'uomo barba persona'},
  {e:'👴',k:'nonno anziano persona'},{e:'👵',k:'nonna anziana persona'},
  {e:'🧑‍🤝‍🧑',k:'coppia insieme persone'},
  // ── Voci aggiuntive basate sulle categorie ──
  {e:'🤝',k:'prestito anticipo accordo finanziamento'},{e:'📃',k:'contratto documento prestito'},
  {e:'💶',k:'euro soldi denaro stipendio'},{e:'🛡️',k:'assicurazione polizza protezione bollo'},
  {e:'🎟️',k:'buono pasto ticket voucher'},{e:'🗑️',k:'rifiuti spazzatura tari immondizia'},
  {e:'🏘️',k:'condominio palazzo quartiere case spese condominiali'},{e:'🛣️',k:'autostrada pedaggio telepass strada'},
  {e:'💇',k:'parrucchiere capelli taglio'},{e:'💈',k:'barbiere capelli'},
  {e:'💉',k:'vaccino iniezione siringa salute'},{e:'🩹',k:'cerotto medicazione cura salute'},
  {e:'🪁',k:'centro estivo attivita bambini gioco'},{e:'🤸',k:'ginnastica attivita extrascolastica sport bambini'},
];

// ── Icon picker: costruisce l'anteprima + pannello, gestisce apertura, ricerca e selezione ──
// Monta il selettore di emoji nel container, con anteprima e pannello di ricerca.
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

// Apre/chiude il pannello e mette il focus sul campo ricerca.
function _iconPickerToggle(cid) {
  const panel = document.getElementById(cid + '_panel');
  const open = panel.style.display === 'none';
  panel.style.display = open ? '' : 'none';
  if (open) panel.querySelector('input').focus();
}

// Filtra le emoji per parola chiave e (ri)disegna la griglia (max 150 risultati).
function _iconPickerSearch(cid, q) {
  const ql = q.toLowerCase().trim();
  const list = ql ? EMOJI_LIST.filter(e => e.k.includes(ql)) : EMOJI_LIST;
  document.getElementById(cid + '_grid').innerHTML =
    list.slice(0, 150).map(e =>
      `<button type="button" class="icon-btn" title="${e.k}"
               onclick="_iconPickerSelect('${cid}','${e.e}')">${e.e}</button>`
    ).join('');
}

// Applica l'emoji scelta (campo nascosto + anteprima) e chiude il pannello.
function _iconPickerSelect(cid, emoji) {
  document.getElementById('c_icon').value = emoji;
  document.getElementById(cid + '_preview').textContent = emoji;
  document.getElementById(cid + '_panel').style.display = 'none';
}
