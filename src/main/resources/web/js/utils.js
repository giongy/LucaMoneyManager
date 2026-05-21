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

function toast(msg, type='success') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  const icon = type==='success'?'✅':type==='error'?'❌':'ℹ️';
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
