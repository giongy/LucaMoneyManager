/* ═══════════════════════════════════════════════════════════════════════════
   LucaMoneyManager — pages/logviewer.js
   Log Viewer (estratto da app.js, stadio 5d del refactor)
═══════════════════════════════════════════════════════════════════════════ */

// Disegna la pagina Log: ricerca testo, filtro per tipo record e caricamento ultime 2000 righe.
async function renderLogViewer() {
  const pg = document.getElementById('pg-logviewer');
  pg.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">Log operazioni</h2>
      <!-- I due filtri della stessa lista stanno insieme: prima "Tipo record" era in una
           barra in fondo alla card, cioè sotto le righe che filtra e all'estremo opposto
           della ricerca. Ovunque altrove nell'app i filtri stanno sopra il contenuto. -->
      <div style="display:flex;gap:8px;align-items:center;margin-left:auto">
        <input class="form-control" id="logSearch" placeholder="🔍 Filtra..." style="width:220px">
        ${_buildLogTypeSelect()}
        <button class="btn btn-ghost" id="btnLogRefresh" title="Aggiorna">↻ Aggiorna</button>
        <button class="btn btn-ghost" id="btnLogPurgeSystem"
                title="Elimina dal log le voci di sistema (avvio, backup, manutenzione), mantenendo le operazioni utente">🗑️ Cancella voci sistema</button>
      </div>
    </div>
    <div class="card" style="flex:1;display:flex;flex-direction:column;min-height:0">
      <div id="logPath" style="font-size:11px;color:var(--txt3);padding:6px 12px;border-bottom:1px solid var(--border)"></div>
      <div class="log-wrap" id="logWrap">
        <div style="color:var(--txt3);padding:40px;text-align:center">Caricamento…</div>
      </div>
    </div>`;

  const load = async () => {
    const data = await api.readLog(2000);
    document.getElementById('logPath').textContent = data.path || '';
    _logLines = data.lines || [];
    renderLogLines();
  };

  document.getElementById('btnLogRefresh').onclick = load;

  // Riusa la stessa operazione Java delle Impostazioni (purgeSystemLog): elimina
  // le voci di sistema (avvio, backup, manutenzione) tenendo le operazioni utente.
  document.getElementById('btnLogPurgeSystem').onclick = async () => {
    const ok = await confirm('Elimina voci di sistema', 'Eliminare tutte le voci di sistema dal log (avvio, backup, manutenzione)?');
    if (!ok) return;
    const res = await callJava('purgeSystemLog');
    if (res.error) { toast('Errore: ' + res.error, 'error'); return; }
    toast(res.deleted > 0 ? `Eliminate ${res.deleted} righe` : 'Nessuna voce di sistema trovata',
          res.deleted > 0 ? 'success' : 'info');
    if (res.deleted > 0) await load();
  };

  let _logTimer;
  document.getElementById('logSearch').addEventListener('input', () => {
    clearTimeout(_logTimer);
    _logTimer = setTimeout(renderLogLines, 150);
  });
  document.getElementById('logTypeFilter').addEventListener('change', renderLogLines);

  await load();
}

let _logLines = [];

// Colore per ciascun tipo di azione di log (verde=crea, blu=modifica, rosso=elimina, ecc.)
const LOG_ACTION_COLORS = {
  'TRANSAZIONE AGGIUNTA':   '#3fb950',
  'TRANSAZIONE MODIFICATA': '#58a6ff',
  'TRANSAZIONE ELIMINATA':  '#f85149',
  'PIANIFICATA AGGIUNTA':   '#3fb950',
  'PIANIFICATA MODIFICATA': '#58a6ff',
  'PIANIFICATA ELIMINATA':  '#f85149',
  'PIANIFICATA AVANZATA':   '#d2a8ff',
  'PIANIFICATA COMPLETATA': '#8b949e',
  'CONCILIAZIONE':          '#e3b341',
  'CONTO AGGIUNTO':         '#3fb950',
  'CONTO MODIFICATO':       '#58a6ff',
  'CONTO ELIMINATO':        '#f85149',
  'CATEGORIA AGGIUNTA':     '#3fb950',
  'CATEGORIA MODIFICATA':   '#58a6ff',
  'CATEGORIA ELIMINATA':    '#f85149',
  'CATEGORIA RIASSEGNATA':  '#d2a8ff',
  'BUDGET IMPOSTATO':       '#3fb950',
  'BUDGET ELIMINATO':       '#f85149',
  'BUDGET BULK':            '#58a6ff',
  'BUDGET MESE ELIMINATO':  '#f85149',
  'BUDGET ANNO ELIMINATO':  '#f85149',
  'BUDGET GENERATO':        '#d2a8ff',
  'BUDGET CONFIG':          '#58a6ff',
  'TAG AGGIUNTO':           '#3fb950',
  'TAG MODIFICATO':         '#58a6ff',
  'TAG ELIMINATO':          '#f85149',
  'TITOLO ACQUISTATO':      '#3fb950',
  'TITOLO VENDUTO':         '#e3b341',
  'TITOLO ELIMINATO':       '#f85149',
  'PREZZO AGGIORNATO':      '#58a6ff',
  'PORTAFOGLIO MODIFICATO': '#58a6ff',
  'POSIZIONE IMPORTATA':    '#d2a8ff',
  'CEDOLA REGISTRATA':      '#3fb950',
  'BACKUP ESEGUITO':        '#8b949e',
  'DB CAMBIATO':            '#e3b341',
  'AVVIO':                  '#8b949e',
};

// Raggruppamento dei tipi di azione per dominio (usato nel menu a tendina del filtro).
const LOG_ACTION_GROUP = {
  'TRANSAZIONE AGGIUNTA':   'Transazioni',
  'TRANSAZIONE MODIFICATA': 'Transazioni',
  'TRANSAZIONE ELIMINATA':  'Transazioni',
  'PIANIFICATA AGGIUNTA':   'Pianificate',
  'PIANIFICATA MODIFICATA': 'Pianificate',
  'PIANIFICATA ELIMINATA':  'Pianificate',
  'PIANIFICATA AVANZATA':   'Pianificate',
  'PIANIFICATA COMPLETATA': 'Pianificate',
  'CONCILIAZIONE':          'Conti',
  'CONTO AGGIUNTO':         'Conti',
  'CONTO MODIFICATO':       'Conti',
  'CONTO ELIMINATO':        'Conti',
  'CATEGORIA AGGIUNTA':     'Categorie',
  'CATEGORIA MODIFICATA':   'Categorie',
  'CATEGORIA ELIMINATA':    'Categorie',
  'CATEGORIA RIASSEGNATA':  'Categorie',
  'BUDGET IMPOSTATO':       'Budget',
  'BUDGET ELIMINATO':       'Budget',
  'BUDGET BULK':            'Budget',
  'BUDGET MESE ELIMINATO':  'Budget',
  'BUDGET ANNO ELIMINATO':  'Budget',
  'BUDGET GENERATO':        'Budget',
  'BUDGET CONFIG':          'Budget',
  'TAG AGGIUNTO':           'Tag',
  'TAG MODIFICATO':         'Tag',
  'TAG ELIMINATO':          'Tag',
  'TITOLO ACQUISTATO':      'Portfolio',
  'TITOLO VENDUTO':         'Portfolio',
  'TITOLO ELIMINATO':       'Portfolio',
  'PREZZO AGGIORNATO':      'Portfolio',
  'PORTAFOGLIO MODIFICATO': 'Portfolio',
  'POSIZIONE IMPORTATA':    'Portfolio',
  'CEDOLA REGISTRATA':      'Portfolio',
  'BACKUP ESEGUITO':        'Sistema',
  'DB CAMBIATO':            'Sistema',
  'AVVIO':                  'Sistema',
};

// Costruisce il <select> del filtro tipo record, con optgroup per dominio.
function _buildLogTypeSelect() {
  const groups = {};
  for (const [action, group] of Object.entries(LOG_ACTION_GROUP)) {
    if (!groups[group]) groups[group] = [];
    groups[group].push(action);
  }
  // Larghezza fissa e non flex:1: sta nella barra di intestazione accanto alla ricerca,
  // dove "prendersi tutto lo spazio" vorrebbe dire attraversare mezzo schermo.
  return `<select class="form-control" id="logTypeFilter" style="width:200px">
    <option value="">Tutti i tipi</option>
    ${Object.entries(groups).map(([g, actions]) =>
      `<optgroup label="${g}">${actions.map(a => `<option>${a}</option>`).join('')}</optgroup>`
    ).join('')}
  </select>`;
}

// Filtra (per testo e tipo) e ridisegna le righe di log parsate, scrollando in fondo.
function renderLogLines() {
  const wrap = document.getElementById('logWrap');
  if (!wrap) return;
  const q    = (document.getElementById('logSearch')?.value || '').toLowerCase();
  const type = document.getElementById('logTypeFilter')?.value || '';
  const filtered = _logLines.filter(l => {
    if (q && !l.toLowerCase().includes(q)) return false;
    if (type) {
      const rest   = l.substring(22).trimStart();
      const sepIdx = rest.indexOf('  |  ');
      const action = (sepIdx >= 0 ? rest.substring(0, sepIdx) : rest).trim();
      if (action !== type) return false;
    }
    return true;
  });
  if (!filtered.length) {
    wrap.innerHTML = '<div style="color:var(--txt3);padding:40px;text-align:center">Nessun log trovato</div>';
    return;
  }
  wrap.innerHTML = filtered.map(line => {
    // parse: "YYYY-MM-DD  HH:mm:ss  AZIONE                               |  campo:val  |  ..."
    const dateStr  = line.substring(0, 10);
    const timeStr  = line.substring(12, 20);
    const rest     = line.substring(22).trimStart();
    // split on first "  |  " to get action vs fields
    const sepIdx   = rest.indexOf('  |  ');
    const action   = sepIdx >= 0 ? rest.substring(0, sepIdx).trim() : rest.trim();
    const fields   = sepIdx >= 0 ? rest.substring(sepIdx + 5).split('  |  ') : [];
    const color    = LOG_ACTION_COLORS[action] || 'var(--txt2)';
    // Il log contiene i campi delle transazioni (descrizione compresa), quindi testo utente:
    // va escapato prima di finire in innerHTML. `color` viene da LOG_ACTION_COLORS, non dal file.
    const fieldsHtml = fields.map(f => {
      const ci = f.indexOf(':');
      if (ci < 0) return `<span class="log-field">${esc(f)}</span>`;
      const k = f.substring(0, ci);
      const v = f.substring(ci + 1);
      return `<span class="log-field"><span class="log-key">${esc(k)}</span><span class="log-val">${esc(v)}</span></span>`;
    }).join('');
    return `<div class="log-row">
      <span class="log-date">${esc(dateStr)}</span>
      <span class="log-time">${esc(timeStr)}</span>
      <span class="log-action" style="color:${color}">${esc(action)}</span>
      <span class="log-fields">${fieldsHtml}</span>
    </div>`;
  }).join('');
  setTimeout(() => {
    const wrap = document.getElementById('logWrap');
    if (wrap) wrap.scrollTop = wrap.scrollHeight;
  }, 50);
}
