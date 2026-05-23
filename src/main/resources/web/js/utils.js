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
  if (t === 'salvia') return { tick: '#5a7a60', grid: 'rgba(0,0,0,0.06)' };
  return { tick: '#8b949e', grid: 'rgba(255,255,255,0.06)' };
};

const zoomOpts = () => ({
  zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' },
  pan:  { enabled: true, mode: 'x' }
});

/* ─── Account visibility helpers ─────────────────────────────────────────── */
// Dipende da _accFavoritesOnly (let globale dichiarata in app.js).
const isAccountVisible = a =>
  _accFavoritesOnly ? (a.is_favorite && !a.is_closed) : true;
const isAccountActive  = a => !a.is_closed;

/* ─── Calculator helper ────────────────────────────────────────────────────── */
/** Valuta una semplice espressione +/- (es. "40+10.30", "100-49.70").
 *  Accetta sia virgola che punto come separatore decimale.
 *  Ritorna un Number >= 0 se valido, null altrimenti. */
function evalAmount(raw) {
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
  return result >= 0 ? result : null;
}

/* ─── Utils ───────────────────────────────────────────────────────────────── */
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
};

/* ─── Date helpers ────────────────────────────────────────────────────────── */
// Formatta una Date come YYYY-MM-DD nel fuso locale (toISOString userebbe UTC e sfaserebbe di 1 giorno)
const _dateStr  = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const _todayStr = () => _dateStr(new Date());

function toast(msg, type='success') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  const icon = type==='success'?'✅':type==='error'?'❌':'ℹ️';
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// Sparkline cumulativa con confronto anno precedente.
// Linea solida (anno corrente) + linea tratteggiata grigia (anno precedente, stessi mesi).
// Il colore della solida è semanticamente corretto (verde = sopra/meglio dell'anno scorso, rosso = sotto).
function cumulativeCompareSvg(currCum, prevCum, color, w = 90, h = 36) {
  if (!currCum || !currCum.length) return '';
  const allValues = [...currCum, ...(prevCum || [])].filter(v => v != null);
  if (!allValues.length) return '';
  const min = Math.min(...allValues, 0);
  const max = Math.max(...allValues, 0);
  const range = max - min || 1;
  const pad = 2;
  const len = Math.max(currCum.length, (prevCum || []).length);
  const stepX = w / (len - 1 || 1);
  const toPoints = vals => vals.map((v, i) => {
    const y = (h - pad - ((v - min) / range) * (h - 2 * pad)).toFixed(1);
    return `${(i * stepX).toFixed(1)},${y}`;
  }).join(' ');
  const currPts = toPoints(currCum);
  const prevPts = prevCum && prevCum.length ? toPoints(prevCum) : '';
  // Baseline zero se la scala attraversa 0
  let zeroLine = '';
  if (min < 0 && max > 0) {
    const zy = (h - pad - ((0 - min) / range) * (h - 2 * pad)).toFixed(1);
    zeroLine = `<line x1="0" y1="${zy}" x2="${w}" y2="${zy}" stroke="rgba(255,255,255,.18)" stroke-width="0.6" stroke-dasharray="2,2"/>`;
  }
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;flex-shrink:0">
    ${zeroLine}
    ${prevPts ? `<polyline points="${prevPts}" fill="none" stroke="var(--txt3)" stroke-width="1.2" stroke-dasharray="3,2" opacity="0.55" stroke-linecap="round"/>` : ''}
    <polyline points="${currPts}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

// Sparkline SVG inline (no Chart.js). Per dashboard stat cards.
function sparklineSvg(values, color = 'currentColor', w = 90, h = 36) {
  if (!values || !values.length || values.every(v => v === 0)) return '';
  const max = Math.max(...values);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const stepX = w / (values.length - 1 || 1);
  const pad = 2;
  const points = values.map((v, i) =>
    `${(i * stepX).toFixed(1)},${(h - pad - ((v - min) / range) * (h - 2 * pad)).toFixed(1)}`
  ).join(' ');
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;opacity:.85;flex-shrink:0">
    <polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5"
              stroke-linecap="round" stroke-linejoin="round"/>
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
