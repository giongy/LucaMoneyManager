/* ═══════════════════════════════════════════════════════════════════════════
   LucaMoneyManager — pages/scheduled.js
   Pagina Transazioni Pianificate (estratta da app.js, stadio 6b del refactor)

   Dipendenze esterne (in app.js, risolte lazy a runtime):
   - _todayStr, initCatPicker, showTxModal (transactions)
   - _noticeData, updateNoticeBtn (init)
   - renderBudgetVsPianificate (budget vs pianificate section)
   - renderForecastsInTab (previsioni)
═══════════════════════════════════════════════════════════════════════════ */

const FREQ_LABELS = {
  once:'Una volta', daily:'Giornaliera', weekly:'Settimanale',
  biweekly:'Bisettimanale', monthly:'Mensile', monthly_last:'Mensile (ultimo giorno)', bimonthly:'Ogni 2 mesi', quarterly:'Trimestrale', semiannual:'Semestrale', yearly:'Annuale'
};

let schedTab = 'lista';
let schedCharts = {};

// Disegna la pagina Pianificate: barra tab (Lista, Proiezione, Cashflow, Previsioni,
// Verifica Budget) + contenitore che ospita la tab attiva.
async function renderScheduled() {
  const pg = document.getElementById('pg-scheduled');
  pg.innerHTML = `
    <div style="flex-shrink:0;padding:16px 16px 0;background:var(--bg)">
      <div class="scheduled-tabs" id="schedTabBar">
        <button class="sched-tab ${schedTab==='lista'?'active':''}"       data-stab="lista"       onclick="setSchedTab('lista')">📋 Lista</button>
        <button class="sched-tab ${schedTab==='projection'?'active':''}" data-stab="projection"  onclick="setSchedTab('projection')">📈 Proiezione Saldo</button>
        <button class="sched-tab ${schedTab==='cashflow'?'active':''}"   data-stab="cashflow"    onclick="setSchedTab('cashflow')">💰 Flusso di Cassa</button>
        <button class="sched-tab ${schedTab==='forecasts'?'active':''}"  data-stab="forecasts"   onclick="setSchedTab('forecasts')">🔮 Previsioni</button>
        <button class="sched-tab ${schedTab==='verificabud'?'active':''}" data-stab="verificabud" onclick="setSchedTab('verificabud')">🔗 Verifica Budget</button>
      </div>
    </div>
    <div id="schedContent" style="flex:1;overflow-y:auto;padding:0 16px 16px"></div>`;

  renderSchedTab();
}

// Cambia la tab attiva della pagina Pianificate e la renderizza.
window.setSchedTab = tab => {
  schedTab = tab;
  document.querySelectorAll('#schedTabBar .sched-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.stab === tab);
  });
  renderSchedTab();
};

// Dispatcher: renderizza la tab Pianificate attiva nel contenitore #schedContent.
async function renderSchedTab() {
  if      (schedTab === 'lista')      await renderSchedLista();
  else if (schedTab === 'projection') await renderSchedProjection();
  else if (schedTab === 'cashflow')   await renderSchedCashflow();
  else if (schedTab === 'forecasts')  await renderForecastsInTab();
  else if (schedTab === 'verificabud') await renderBudgetVsPianificate();
}

// Conta le occorrenze rimanenti da start_date a end_date inclusi.
// Ritorna '∞' se end_date è assente, 0 se la pianificata è già terminata.
function _schedOccurrences(startDate, freq, endDate) {
  if (!endDate) return '∞';
  if (!startDate) return '—';
  const start = new Date(startDate + 'T00:00:00');
  const end   = new Date(endDate   + 'T00:00:00');
  if (start > end) return 0;
  if (freq === 'once') return 1;
  const days = Math.round((end - start) / 86400000);
  if (freq === 'daily')    return days + 1;
  if (freq === 'weekly')   return Math.floor(days / 7) + 1;
  if (freq === 'biweekly') return Math.floor(days / 14) + 1;
  const step = { monthly:1, monthly_last:1, bimonthly:2, quarterly:3, semiannual:6, yearly:12 }[freq] || 1;
  // Ogni occorrenza va calcolata dall'àncora `start`, mai da quella precedente: Date.setMonth()
  // trabocca invece di clampare (31 gen + 1 mese = 3 mar), e derivare a catena propagherebbe
  // l'errore a tutti i mesi successivi. Stessa regola di Database.firstOccurrenceFrom in Java,
  // che usa plusMonths() dall'àncora proprio per questo motivo.
  const y = start.getFullYear(), m = start.getMonth(), d = start.getDate();
  let count = 0;
  for (let k = 0; ; k++) {
    const lastDom = new Date(y, m + step * k + 1, 0).getDate();  // giorno 0 = ultimo del mese prec.
    const dom = freq === 'monthly_last' ? lastDom : Math.min(d, lastDom);
    const cur = new Date(y, m + step * k, dom);
    if (cur > end) break;
    count++;
  }
  return count;
}

let _schedSort   = { col: 'days', dir: 'asc' };
let _schedFilter = { type: '', active: '1', category: '', tags: new Set() };

// Costruisce le <option> del filtro categoria (parent con figli annidati; "p:id" = intero ramo parent).
function _buildSchedCatOptions(categories) {
  const parents  = categories.filter(c => !c.parent_id).sort((a,b) => (a.name||'').localeCompare(b.name));
  const childMap = {};
  categories.filter(c => c.parent_id).forEach(c => {
    (childMap[c.parent_id] = childMap[c.parent_id] || []).push(c);
  });
  const sel = _schedFilter.category;
  let html = `<option value="">Tutte le categorie</option>`;
  for (const p of parents) {
    const children = (childMap[p.id] || []).sort((a,b) => (a.name||'').localeCompare(b.name));
    if (children.length) {
      html += `<option value="p:${p.id}" ${sel===`p:${p.id}`?'selected':''}>${p.icon||''} ${p.name}</option>`;
      for (const c of children)
        html += `<option value="${c.id}" ${sel===String(c.id)?'selected':''}>&nbsp;&nbsp;└ ${c.icon||''} ${c.name}</option>`;
    } else {
      html += `<option value="${p.id}" ${sel===String(p.id)?'selected':''}>${p.icon||''} ${p.name}</option>`;
    }
  }
  return html;
}

// Tab "Lista": carica pianificate/conti/categorie/tag, arricchisce ogni voce con prossima
// data e giorni rimanenti, e disegna la tabella con filtri (tipo, stato, categoria, tag) e ordinamento.
async function renderSchedLista() {
  const [scheds, accounts, categories, tags] = await Promise.all([
    api.getScheduled(), api.getAccounts(), api.getCategories(), api.getTags()
  ]);

  // Mappa categorie per il filtro: id → parent_id
  window._schedCatParentMap = Object.fromEntries(categories.map(c => [c.id, c.parent_id ?? null]));
  window._schedCatsArr = categories;
  window._schedTagsArr = tags;

  // Arricchisce ogni pianificata con prossima data e giorni rimanenti
  const todayStr = _todayStr();
  const today = new Date(todayStr + 'T00:00:00');
  scheds.forEach(s => {
    if (!s.is_active) { s._next = null; s._days = null; return; }
    // start_date IS già la prossima occorrenza — nessuna conversione Date per evitare bug timezone
    const hasEnded = s.end_date && s.start_date > s.end_date;
    s._next = hasEnded ? null : s.start_date;
    const nextD = s._next ? new Date(s._next + 'T00:00:00') : null;
    s._days = nextD ? Math.round((nextD - today) / 86400000) : null;
  });
  window._schedCache = Object.fromEntries(scheds.map(s => [s.id, s]));

  const el = document.getElementById('schedContent');
  el.innerHTML = `
    <div class="sched-toolbar">
      <div class="filter-bar" style="margin-bottom:0;flex:1;flex-wrap:wrap">
        <select class="form-control" id="sfActive">
          <option value="">Tutte</option>
          <option value="1" ${_schedFilter.active==='1'?'selected':''}>Solo attive</option>
          <option value="0" ${_schedFilter.active==='0'?'selected':''}>Solo inattive</option>
        </select>
        <select class="form-control" id="sfType">
          <option value="">Tutti i tipi</option>
          <option value="income"   ${_schedFilter.type==='income'  ?'selected':''}>Entrate</option>
          <option value="expense"  ${_schedFilter.type==='expense' ?'selected':''}>Uscite</option>
          <option value="transfer" ${_schedFilter.type==='transfer'?'selected':''}>Trasferimenti</option>
        </select>
        <select class="form-control" id="sfCat">
          ${_buildSchedCatOptions(categories)}
        </select>
        <div class="sched-tag-filter" id="sfTagWrap">
          <button class="form-control sched-tag-btn" id="sfTagBtn" type="button">
            ${_schedFilter.tags.size ? `Tag: ${_schedFilter.tags.size} ✕` : 'Tutti i tag ▾'}
          </button>
          <div class="sched-tag-dropdown" id="sfTagDrop" style="display:none">
            ${tags.length ? tags.map(t => `
              <label class="sched-tag-opt">
                <input type="checkbox" value="${t.id}" ${_schedFilter.tags.has(t.id)?'checked':''}>
                <span class="tag-chip" style="--tc:${t.color}">${t.name}</span>
              </label>`).join('') : '<span style="padding:8px;color:var(--txt3);font-size:12px">Nessun tag</span>'}
          </div>
        </div>
      </div>
      <button class="btn btn-primary" id="btnNewSched">+ Nuova</button>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table id="schedTable"><thead><tr>
          <th class="sched-th-sort" data-scol="active"  onclick="_schedSortBy('active')">Stato<span class="sort-ind"></span></th>
          <th class="sched-th-sort" data-scol="account" onclick="_schedSortBy('account')">Conto<span class="sort-ind"></span></th>
          <th class="sched-th-sort" data-scol="tag"     onclick="_schedSortBy('tag')">Tag<span class="sort-ind"></span></th>
          <th class="sched-th-sort" data-scol="freq"    onclick="_schedSortBy('freq')">Frequenza<span class="sort-ind"></span></th>
          <th class="sched-th-sort" data-scol="cat"     onclick="_schedSortBy('cat')">Categoria<span class="sort-ind"></span></th>
          <th class="sched-th-sort" data-scol="desc"    onclick="_schedSortBy('desc')">Descrizione<span class="sort-ind"></span></th>
          <th class="sched-th-sort" data-scol="amount"  onclick="_schedSortBy('amount')">Importo<span class="sort-ind"></span></th>
          <th class="sched-th-sort" data-scol="next"    onclick="_schedSortBy('next')">Prossima<span class="sort-ind"></span></th>
          <th class="sched-th-sort th-sort-active" data-scol="days" onclick="_schedSortBy('days')">Giorni<span class="sort-ind">▲</span></th>
          <th class="sched-th-sort" data-scol="occ" onclick="_schedSortBy('occ')" title="Occorrenze rimanenti fino alla data di scadenza">Occ.<span class="sort-ind"></span></th>
          <th></th>
        </tr></thead><tbody id="schedBody"></tbody></table>
      </div>
    </div>`;

  document.getElementById('btnNewSched').onclick = () => showScheduledModal(null, accounts, categories, tags);
  document.getElementById('sfActive').addEventListener('change', e => { _schedFilter.active   = e.target.value; _renderSchedRows(scheds); });
  document.getElementById('sfType').addEventListener('change',   e => { _schedFilter.type     = e.target.value; _renderSchedRows(scheds); });
  document.getElementById('sfCat').addEventListener('change',    e => { _schedFilter.category = e.target.value; _renderSchedRows(scheds); });

  // Tag multi-select dropdown
  const tagBtn  = document.getElementById('sfTagBtn');
  const tagDrop = document.getElementById('sfTagDrop');
  tagBtn.addEventListener('click', e => {
    e.stopPropagation();
    tagDrop.style.display = tagDrop.style.display === 'none' ? 'block' : 'none';
  });
  tagDrop.querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', () => {
      const id = Number(cb.value);
      if (cb.checked) _schedFilter.tags.add(id); else _schedFilter.tags.delete(id);
      tagBtn.textContent = _schedFilter.tags.size ? `Tag: ${_schedFilter.tags.size} ✕` : 'Tutti i tag ▾';
      _renderSchedRows(scheds);
    });
  });
  document.addEventListener('click', function _closeTagDrop(e) {
    if (!document.getElementById('sfTagWrap')?.contains(e.target)) {
      if (tagDrop) tagDrop.style.display = 'none';
      document.removeEventListener('click', _closeTagDrop);
    }
  });

  _renderSchedRows(scheds);
}

// Cambia colonna/direzione di ordinamento della tabella pianificate e ridisegna le righe.
window._schedSortBy = col => {
  _schedSort.dir = _schedSort.col === col ? (_schedSort.dir === 'asc' ? 'desc' : 'asc') : 'asc';
  _schedSort.col = col;
  document.querySelectorAll('#schedTable th[data-scol]').forEach(th => {
    const active = _schedSort.col === th.dataset.scol;
    th.classList.toggle('th-sort-active', active);
    const ind = th.querySelector('.sort-ind');
    if (ind) ind.textContent = active ? (_schedSort.dir === 'asc' ? '▲' : '▼') : '';
  });
  _renderSchedRows(Object.values(window._schedCache || {}));
};

// Applica filtri (stato/tipo/categoria/tag) e ordinamento correnti, poi disegna le righe
// della tabella pianificate con badge giorni e azioni Inserisci/Salta.
function _renderSchedRows(scheds) {
  const tbody = document.getElementById('schedBody');
  if (!tbody) return;

  // Filter
  let rows = scheds.filter(s => {
    if (_schedFilter.active !== '' && String(s.is_active) !== _schedFilter.active) return false;
    if (_schedFilter.type   !== '' && s.type !== _schedFilter.type) return false;
    if (_schedFilter.category !== '') {
      const cv = _schedFilter.category;
      if (cv.startsWith('p:')) {
        const pid = Number(cv.slice(2));
        const parentMap = window._schedCatParentMap || {};
        const isChild = s.category_id && parentMap[s.category_id] === pid;
        const isSelf  = s.category_id === pid;
        if (!isChild && !isSelf) return false;
      } else {
        if (String(s.category_id) !== cv) return false;
      }
    }
    if (_schedFilter.tags.size > 0) {
      const sTags = new Set((s.tags || []).map(t => Number(t.id)));
      if (![..._schedFilter.tags].some(tid => sTags.has(tid))) return false;
    }
    return true;
  });

  // Sort
  rows = [...rows].sort((a, b) => {
    let va, vb;
    switch (_schedSort.col) {
      case 'active':  va = a.is_active; vb = b.is_active; break;
      case 'account': va = (a.account_name||'').toLowerCase(); vb = (b.account_name||'').toLowerCase(); break;
      case 'desc':    va = (a.description||'').toLowerCase(); vb = (b.description||'').toLowerCase(); break;
      case 'cat':     va = (a.parent_category_name?a.parent_category_name+':'+a.category_name:a.category_name||'').toLowerCase(); vb = (b.parent_category_name?b.parent_category_name+':'+b.category_name:b.category_name||'').toLowerCase(); break;
      case 'tag':     va = (a.tags&&a.tags.length?a.tags.map(t=>t.name).sort().join(','):'').toLowerCase(); vb = (b.tags&&b.tags.length?b.tags.map(t=>t.name).sort().join(','):'').toLowerCase(); break;
      case 'freq':    va = a.frequency; vb = b.frequency; break;
      case 'amount':  va = a.amount;    vb = b.amount;    break;
      case 'next':    va = a._next||'9'; vb = b._next||'9'; break;
      case 'occ': {
        const toN = v => v === '∞' ? Infinity : v === '—' ? -1 : Number(v);
        va = toN(_schedOccurrences(a.start_date, a.frequency, a.end_date));
        vb = toN(_schedOccurrences(b.start_date, b.frequency, b.end_date));
        break;
      }
      case 'days':
      default:
        va = a._days ?? 99999; vb = b._days ?? 99999;
    }
    const c = va < vb ? -1 : va > vb ? 1 : 0;
    return _schedSort.dir === 'asc' ? c : -c;
  });

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:40px;color:var(--txt3)">Nessuna transazione pianificata.</td></tr>';
    return;
  }

  const daysLabel = s => {
    if (!s.is_active) return '<span class="sched-days-badge inactive">Inattiva</span>';
    if (s._days === null) return '<span class="sched-days-badge ended">Terminata</span>';
    if (s._days < 0)  return `<span class="sched-days-badge overdue">⚠️ ${Math.abs(s._days)}g fa</span>`;
    if (s._days === 0) return '<span class="sched-days-badge today">Oggi</span>';
    return `<span class="sched-days-badge upcoming">${s._days}g</span>`;
  };

  tbody.innerHTML = rows.map(s => `
    <tr oncontextmenu="_showSchedCtx(${s.id},event)" style="${s.color?`background:${s.color}40;`:''}cursor:context-menu">
      <td style="text-align:center"><span style="font-size:15px">${s.is_active ? '✅' : '⏸️'}</span></td>
      <td>${s.account_name||''}${s.to_account_name?' → '+s.to_account_name:''}</td>
      <td class="td-tags">${(s.tags&&s.tags.length)?s.tags.map(t=>`<span class="tag-inline" style="--tc:${t.color}">${t.name}</span>`).join(''):''}</td>
      <td><span class="sched-freq-badge">${FREQ_LABELS[s.frequency]||s.frequency}</span></td>
      <td><span class="cat-chip">${s.category_icon||''} ${s.parent_category_name?s.parent_category_name+' › '+s.category_name:s.category_name||'—'}</span></td>
      <td class="td-main">${s.description||'—'}</td>
      <td class="text-right amount-${s.type}">${s.type==='expense'?'-':''}${fmt.currency(s.amount)}</td>
      <td>${s._next ? fmt.date(s._next) : '—'}</td>
      <td>${daysLabel(s)}</td>
      <td style="text-align:center;color:var(--txt2)">${_schedOccurrences(s.start_date, s.frequency, s.end_date)}</td>
      <td class="sched-actions">
        <div class="sched-actions-wrap">
          ${s.is_active && s._next ? `<button class="btn btn-xs btn-success" onclick="registerSched(${s.id})" title="Inserisci transazione">✔ Inserisci</button>
          <button class="btn btn-xs btn-ghost" onclick="skipSched(${s.id})" title="Salta questa occorrenza">⏭ Salta</button>` : ''}
        </div>
      </td>
    </tr>`).join('');
}

// Tutti i range partono SEMPRE da oggi (è una proiezione: i mesi passati non hanno senso).
const PROJ_RANGES = [
  {v:'6m',      l:'Prossimi 6 mesi'},
  {v:'12m',     l:'Prossimi 12 mesi'},
  {v:'eoy',     l:'Fino a fine anno'},
  {v:'eoy_nxt', l:'Fino all\'anno prossimo'},
  {v:'3y',      l:'Prossimi 3 anni'},
  {v:'custom',  l:'Personalizza…'},
];
let _projRange = '6m';
let _projMonths = 6;
let _projMode = 'monthly'; // 'monthly' | 'daily'

// Converte un range di proiezione (6m/12m/eoy/eoy_nxt/3y/custom) in {from_date, to_date}.
// Ogni range parte SEMPRE da oggi (proiezione futura: no mesi passati).
// useMonthBoundaries=true per la vista mensile (fine mese); altrimenti vista daily.
function projRangeToFilter(range, customMonths, useMonthBoundaries = false) {
  const today = new Date();
  // Fix timezone bug: usa date locali invece di toISOString() che converte in UTC
  const localFmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const y = today.getFullYear();

  // "Fino a fine anno": oggi → 31 dicembre dell'anno indicato (0 = corrente, 1 = prossimo)
  if (range === 'eoy')     return { from_date: localFmt(today), to_date: `${y}-12-31` };
  if (range === 'eoy_nxt') return { from_date: localFmt(today), to_date: `${y+1}-12-31` };

  // Range espressi in mesi da oggi
  let n;
  switch(range) {
    case '6m':     n = 6;   break;
    case '12m':    n = 12;  break;
    case '3y':     n = 36;  break;
    case 'custom': n = parseInt(customMonths)||6; break;
    default:       n = 6;
  }
  // Sia mensile che daily: fine arrotondata alla fine del mese di arrivo (oggi + N mesi)
  const end = new Date(today); end.setMonth(end.getMonth() + n);
  const eom = new Date(end.getFullYear(), end.getMonth() + 1, 0); // fine del mese di arrivo
  return { from_date: localFmt(today), to_date: localFmt(eom) };
}

// Tab "Proiezione Saldo": controlli (range, conti, mensile/giornaliero) + grafico del saldo
// futuro proiettato dalle pianificate, partendo dal saldo reale attuale.
async function renderSchedProjection() {
  const accounts = await api.getAccounts();
  const el = document.getElementById('schedContent');
  el.innerHTML = `
    <div class="card" style="margin-bottom:16px">
      <div class="proj-controls">
        <select class="form-control" id="projRange">
          ${PROJ_RANGES.map(r=>`<option value="${r.v}" ${_projRange===r.v?'selected':''}>${r.l}</option>`).join('')}
        </select>
        <span id="projCustomWrap" style="display:${_projRange==='custom'?'flex':'none'};align-items:center;gap:6px">
          <input type="number" class="form-control" id="projMonths" value="${_projMonths}" min="1" max="120" style="width:80px">
          <span class="settings-hint" style="white-space:nowrap">mesi</span>
        </span>
        <span style="display:flex;gap:0;border:1px solid var(--border);border-radius:6px;overflow:hidden;margin-left:auto">
          <button id="projModeMonthly" class="btn btn-xs ${_projMode==='monthly'?'btn-primary':'btn-ghost'}" style="border-radius:0;padding:4px 10px" title="Progresso mensile">📅 Mensile</button>
          <button id="projModeDaily"   class="btn btn-xs ${_projMode==='daily'  ?'btn-primary':'btn-ghost'}" style="border-radius:0;padding:4px 10px;border-left:1px solid var(--border)" title="Progresso giornaliero">📆 Giornaliero</button>
        </span>
      </div>
      <div class="proj-chart-wrap"><canvas id="projChart"></canvas></div>
      <div style="margin-top:12px;text-align:right">
        <button class="btn btn-ghost" id="btnSalvaPrevisione" style="gap:6px">🔮 Salva previsione</button>
      </div>
      <div id="projTable" style="margin-top:16px;overflow-x:auto"></div>
    </div>`;

  document.getElementById('projRange').addEventListener('change', () => {
    _projRange = document.getElementById('projRange').value;
    document.getElementById('projCustomWrap').style.display = _projRange==='custom' ? 'flex' : 'none';
    api.setSetting('proj.range', _projRange);
    loadProjectionChart(accounts);
  });
  document.getElementById('projMonths').addEventListener('change', () => {
    _projMonths = parseInt(document.getElementById('projMonths').value) || 6;
    api.setSetting('proj.months', String(_projMonths));
    loadProjectionChart(accounts);
  });
  document.getElementById('projModeMonthly').addEventListener('click', () => {
    _projMode = 'monthly';
    api.setSetting('proj.mode', 'monthly');
    document.getElementById('projModeMonthly').className = 'btn btn-xs btn-primary';
    document.getElementById('projModeDaily').className   = 'btn btn-xs btn-ghost';
    loadProjectionChart(accounts);
  });
  document.getElementById('projModeDaily').addEventListener('click', () => {
    _projMode = 'daily';
    api.setSetting('proj.mode', 'daily');
    document.getElementById('projModeMonthly').className = 'btn btn-xs btn-ghost';
    document.getElementById('projModeDaily').className   = 'btn btn-xs btn-primary';
    loadProjectionChart(accounts);
  });
  await loadProjectionChart(accounts);

  document.getElementById('btnSalvaPrevisione').addEventListener('click', async () => {
    const range      = document.getElementById('projRange')?.value || '6m';
    const customMths = document.getElementById('projMonths')?.value;
    const isDaily    = _projMode === 'daily';
    const { from_date, to_date } = projRangeToFilter(range, customMths, !isDaily);
    if (!from_date || !to_date) { toast('Nessun periodo selezionato','error'); return; }

    // Saldo proiettato = ultimo valore del grafico
    const accIds = accounts.filter(a=>a.type!=='investment').map(a=>a.id).join(',');
    let proj; try { proj = await api.getProjection({from_date, to_date, account_ids:accIds, daily:isDaily}); }
    catch(e) { toast(e.message,'error'); return; }
    const dates  = [...new Set(proj.series.map(p=>p.date))].sort();
    const lastDate = dates[dates.length-1] || to_date;
    const lastBal  = dates.length
      ? proj.series.filter(p=>p.date===lastDate).reduce((s,p)=>s+p.balance,0)
      : 0;

    // Categorie pianificate nel periodo
    let cats; try { cats = await api.getProjectionByCategory({from_date, to_date}); }
    catch(e) { toast(e.message,'error'); return; }

    openModal('Salva previsione', `
      <div style="display:flex;flex-direction:column;gap:10px">
        <div>
          <label class="form-label">Data previsione</label>
          <input type="date" class="form-control" id="fcDate" value="${to_date}">
          <div class="settings-hint" style="margin-top:4px">Il giorno fino al quale proiettiamo</div>
        </div>
        <div>
          <label class="form-label">Saldo proiettato</label>
          <div style="font-size:15px;font-weight:600;color:var(--accent)">${fmt.currency(lastBal)}</div>
        </div>
        <div>
          <label class="form-label">Categorie pianificate (${cats.length})</label>
          <div style="max-height:160px;overflow-y:auto;font-size:12px;border:1px solid var(--border);border-radius:6px;padding:6px">
            ${cats.length ? cats.map(c=>`<div style="display:flex;justify-content:space-between;padding:2px 4px">
              <span style="color:${c.type==='income'?'var(--income)':'var(--expense)'}">${c.category_name}</span>
              <span>${fmt.currency(c.projected_amount)}</span>
            </div>`).join('') : '<span style="color:var(--txt3)">Nessuna transazione pianificata</span>'}
          </div>
        </div>
      </div>
    `, async () => {
      const forecastDate = document.getElementById('fcDate').value;
      if (!forecastDate) { toast('Seleziona una data','error'); return; }
      try {
        await api.saveForecast({ forecast_date: forecastDate, projected_balance: lastBal, categories: cats });
        toast('Previsione salvata');
        closeModal();
      } catch(e) { toast(e.message,'error'); }
    }, 'Salva');
  });
}

// Carica e disegna il grafico Proiezione Saldo + la tabella (giornaliera o mensile) con
// i delta rispetto al periodo precedente e al saldo di partenza.
async function loadProjectionChart(accounts) {
  const range      = document.getElementById('projRange')?.value || '6m';
  const customMths = document.getElementById('projMonths')?.value;
  const isDaily = _projMode === 'daily';
  const { from_date, to_date } = projRangeToFilter(range, customMths, !isDaily);
  if (!from_date || !to_date) return;
  const accIds = accounts.filter(a=>a.type!=='investment').map(a=>a.id).join(',');
  let data;
  try { data = await api.getProjection({from_date, to_date, account_ids:accIds, daily:isDaily}); }
  catch(e) { toast(e.message,'error'); return; }

  const { series, accounts: accList } = data;
  const dates = [...new Set(series.map(p=>p.date))].sort();

  // Somma tutti i conti per ogni data
  const totals = dates.map(d => {
    const pts = series.filter(p => p.date === d);
    return pts.length ? pts.reduce((s, p) => s + p.balance, 0) : null;
  });

  if (schedCharts.proj) schedCharts.proj.destroy();
  const ctx = document.getElementById('projChart');
  if (!ctx) return;
  schedCharts.proj = new Chart(ctx, {
    type: 'line',
    data: { labels: dates, datasets: [{
      label: 'Saldo totale',
      data: totals,
      borderColor: '#7c6cff',
      backgroundColor: '#7c6cff22',
      fill: true, tension: 0.3,
      pointRadius: isDaily ? 2 : 2,
      pointHoverRadius: 4,
      spanGaps: true
    }]},
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color:chartColors().tick } }, zoom: zoomOpts() },
      scales: {
        x: { ticks:{ color:chartColors().tick, maxTicksLimit: isDaily ? 20 : 14 }, grid:{ color:chartColors().grid } },
        y: { ticks:{ color:chartColors().tick, callback: v => fmt.currency(v) }, grid:{ color:chartColors().grid } }
      }
    }
  });

  const tbl = document.getElementById('projTable');
  if (!tbl) return;

  const thS = 'text-align:right;padding:5px 10px;border-bottom:1px solid var(--border);color:var(--txt2);font-weight:400';
  const tdS = (neg, bold) => `text-align:right;padding:5px 10px;border-bottom:1px solid var(--border);${bold?'font-weight:600;':''}${neg?'color:var(--expense)':''}`;
  const diffStr = (v) => v == null ? '—' : (v >= 0 ? '+' : '') + fmt.currency(v);

  if (isDaily) {
    // ── Tabella saldo giornaliero ────────────────────────────────────────────
    if (!dates.length) { tbl.innerHTML = ''; return; }
    const firstTotal = totals.find(t => t != null);
    tbl.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr>
          <th style="text-align:left;padding:5px 10px;border-bottom:1px solid var(--border);color:var(--txt2)">Data</th>
          <th style="${thS}">Saldo totale</th>
          <th style="${thS}">Δ giorno prec.</th>
          <th style="${thS}">Δ totale</th>
        </tr></thead>
        <tbody>${dates.map((d, i) => {
          const total = totals[i];
          const prev  = i > 0 ? totals[i-1] : null;
          const diffPrev  = (total != null && prev != null) ? total - prev : null;
          const diffFirst = (total != null && firstTotal != null) ? total - firstTotal : null;
          const hasDelta = diffPrev !== 0;
          return `<tr${hasDelta && diffPrev != null ? ` style="background:${diffPrev>0?'rgba(63,185,80,.06)':'rgba(248,81,73,.06)'}"` : ''}>
            <td style="padding:5px 10px;border-bottom:1px solid var(--border);font-variant-numeric:tabular-nums">${fmt.date(d)}</td>
            <td style="${tdS(total!=null&&total<0, true)}">${total!=null?fmt.currency(total):'—'}</td>
            <td style="${tdS(diffPrev!=null&&diffPrev<0, false)}">${diffPrev !== 0 ? diffStr(diffPrev) : '<span style="color:var(--txt3)">—</span>'}</td>
            <td style="${tdS(diffFirst!=null&&diffFirst<0, false)}">${diffStr(diffFirst)}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>`;
  } else {
    // ── Tabella saldo mensile ──────────────────────────────────────────────────
    const monthKeys = [...new Set(dates.map(d => d?.slice(0, 7)).filter(Boolean))].sort();
    if (!monthKeys.length) { tbl.innerHTML = ''; return; }

    const monthTotals = monthKeys.map(m => {
      const datesOfMonth = dates.filter(d=>d.startsWith(m));
      const lastDate = datesOfMonth[datesOfMonth.length-1];
      const pts = series.filter(p=>p.date===lastDate);
      return pts.length ? pts.reduce((s,p)=>s+p.balance,0) : null;
    });
    // Δ totale sempre relativo al saldo di oggi (primo punto della serie)
    const todayPts = series.filter(p => p.date === dates[0]);
    const firstTotal = todayPts.length ? todayPts.reduce((s,p)=>s+p.balance,0) : monthTotals.find(t=>t!=null);

    tbl.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr>
          <th style="text-align:left;padding:5px 10px;border-bottom:1px solid var(--border);color:var(--txt2)">Mese</th>
          <th style="${thS}">Saldo totale</th>
          <th style="${thS}">Δ mese prec.</th>
          <th style="${thS}">Δ totale</th>
        </tr></thead>
        <tbody>${monthKeys.map((m, i) => {
          const total = monthTotals[i];
          const prev  = i > 0 ? monthTotals[i-1] : null;
          const diffPrev  = (total != null && prev != null) ? total - prev : null;
          const diffFirst = (total != null && firstTotal != null) ? total - firstTotal : null;
          return `<tr>
            <td style="padding:5px 10px;border-bottom:1px solid var(--border)">${m}</td>
            <td style="${tdS(total!=null&&total<0, true)}">${total!=null?fmt.currency(total):'—'}</td>
            <td style="${tdS(diffPrev!=null&&diffPrev<0, false)}">${diffStr(diffPrev)}</td>
            <td style="${tdS(diffFirst!=null&&diffFirst<0, false)}">${diffStr(diffFirst)}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>`;
  }
}

let _cfRange = '12m';
let _cfMonths = 6;

// Tab "Flusso di Cassa": controlli (range) + grafico a barre
// entrate/uscite mensili proiettate dalle pianificate (tutti i conti).
async function renderSchedCashflow() {
  const el = document.getElementById('schedContent');
  el.innerHTML = `
    <div class="card" style="margin-bottom:16px">
      <div class="proj-controls">
        <select class="form-control" id="cfRange">
          ${PROJ_RANGES.map(r=>`<option value="${r.v}" ${_cfRange===r.v?'selected':''}>${r.l}</option>`).join('')}
        </select>
        <span id="cfCustomWrap" style="display:${_cfRange==='custom'?'flex':'none'};align-items:center;gap:6px">
          <input type="number" class="form-control" id="cfMonths" value="${_cfMonths}" min="1" max="120" style="width:80px">
          <span class="settings-hint" style="white-space:nowrap">mesi</span>
        </span>
      </div>
      <div class="proj-chart-wrap"><canvas id="cfChart"></canvas></div>
    </div>`;

  document.getElementById('cfRange').addEventListener('change', () => {
    _cfRange = document.getElementById('cfRange').value;
    document.getElementById('cfCustomWrap').style.display = _cfRange==='custom' ? 'flex' : 'none';
    api.setSetting('cf.range', _cfRange);
    loadCashflowChart();
  });
  document.getElementById('cfMonths')?.addEventListener('change', () => {
    _cfMonths = parseInt(document.getElementById('cfMonths').value) || 6;
    api.setSetting('cf.months', String(_cfMonths));
    loadCashflowChart();
  });
  await loadCashflowChart();
}

// Carica e disegna il grafico Flusso di Cassa (entrate vs uscite per mese) per i conti selezionati.
async function loadCashflowChart() {
  const range      = document.getElementById('cfRange')?.value || '12m';
  const customMths = document.getElementById('cfMonths')?.value;
  const { from_date, to_date } = projRangeToFilter(range, customMths);
  if (!from_date || !to_date) return;

  let data;
  try { data = await api.getProjection({from_date:from_date, to_date:to_date}); }
  catch(e) { toast(e.message,'error'); return; }

  const { cashflow } = data;
  const labels  = cashflow.map(m=>m.month);
  const incomes = cashflow.map(m=>m.income);
  const expenses= cashflow.map(m=>m.expense);

  if (schedCharts.cf) schedCharts.cf.destroy();
  const ctx = document.getElementById('cfChart');
  if (!ctx) return;
  schedCharts.cf = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label:'Entrate',  data:incomes,  backgroundColor:'rgba(63,185,80,.7)',  borderRadius:4 },
        { label:'Uscite',   data:expenses, backgroundColor:'rgba(248,81,73,.7)', borderRadius:4 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color:chartColors().tick } }, zoom: zoomOpts() },
      scales: {
        x: { ticks:{ color:chartColors().tick }, grid:{ color:chartColors().grid } },
        y: { ticks:{ color:chartColors().tick, callback: v => fmt.currency(v) }, grid:{ color:chartColors().grid } }
      }
    }
  });
}

// Apre il modale di modifica per la pianificata con l'id dato.
window.editSched = async id => {
  const [scheds, accounts, categories, tags] = await Promise.all([
    api.getScheduled(), api.getAccounts(), api.getCategories(), api.getTags()
  ]);
  const s = scheds.find(x=>x.id===id);
  if (s) showScheduledModal(s, accounts, categories, tags);
};

// Duplica una pianificata: apre il modale precompilato con i suoi dati ma senza id (nuova).
window.duplicateSched = async id => {
  const [scheds, accounts, categories, tags] = await Promise.all([
    api.getScheduled(), api.getAccounts(), api.getCategories(), api.getTags()
  ]);
  const s = scheds.find(x => x.id === id);
  if (!s) return;
  const copy = { ...s, id: null };
  showScheduledModal(copy, accounts, categories, tags);
};

// Elimina una pianificata previa conferma.
window.deleteSched = async id => {
  const ok = await confirm('Elimina transazione pianificata', 'Eliminare questa transazione pianificata?');
  if (!ok) return;
  await api.deleteScheduled(id);
  toast('Transazione pianificata eliminata');
  renderSchedLista();
};

// ── Scheduled context menu ──────────────────────────────────────────────────
function closeSchedContextMenu() {
  document.getElementById('sched-ctx-menu')?.remove();
  document.removeEventListener('click', closeSchedContextMenu);
  document.removeEventListener('contextmenu', closeSchedContextMenu);
}

// Mostra il menu contestuale (tasto destro) di una pianificata: Inserisci/Salta (se attiva e
// con prossima occorrenza), Modifica, Duplica, Elimina; posizionato al cursore e chiuso al click fuori.
window._showSchedCtx = (id, evt) => {
  evt.preventDefault();
  closeSchedContextMenu();

  const s = window._schedCache?.[id];
  const isActive = s?.is_active;
  const hasNext  = !!(s?._next);

  const items = [
    { icon:'✏️', label:'Modifica',  action: () => editSched(id) },
    { icon:'⧉',  label:'Duplica',  action: () => duplicateSched(id) },
    { icon:'🗑️', label:'Elimina',  action: () => deleteSched(id), danger: true },
  ];
  if (isActive && hasNext) {
    items.unshift(
      { icon:'✔',  label:'Inserisci',           action: () => registerSched(id) },
      { icon:'⏭', label:'Salta occorrenza',     action: () => skipSched(id) },
      { separator: true }
    );
  }

  const menu = document.createElement('div');
  menu.id = 'sched-ctx-menu';
  menu.style.cssText = `position:fixed;z-index:9999;background:var(--bg2);border:1px solid var(--border);
    border-radius:8px;padding:4px 0;min-width:190px;box-shadow:0 4px 16px rgba(0,0,0,.3);
    left:${Math.min(evt.clientX, window.innerWidth-210)}px;top:${Math.min(evt.clientY, window.innerHeight-160)}px`;

  items.forEach(item => {
    if (item.separator) {
      const sep = document.createElement('div');
      sep.style.cssText = 'height:1px;background:var(--border);margin:3px 0';
      menu.appendChild(sep);
      return;
    }
    const el = document.createElement('div');
    el.style.cssText = `padding:7px 14px;cursor:pointer;font-size:13px;display:flex;align-items:center;gap:8px;${item.danger?'color:var(--expense)':''}`;
    el.innerHTML = `<span>${item.icon}</span><span>${item.label}</span>`;
    el.onmouseenter = () => el.style.background = 'var(--bg3)';
    el.onmouseleave = () => el.style.background = '';
    el.onclick = () => { closeSchedContextMenu(); item.action(); };
    menu.appendChild(el);
  });

  document.body.appendChild(menu);
  setTimeout(() => {
    document.addEventListener('click', closeSchedContextMenu, { once: true });
    document.addEventListener('contextmenu', closeSchedContextMenu, { once: true });
  }, 0);
};

// Rimuove una pianificata dalle notifiche scadute/di oggi dopo che è stata registrata o saltata.
function _resolveOverdue(schedId) {
  for (const type of ['overdue', 'duetoday']) {
    const entry = _noticeData.find(n => n.type === type);
    if (!entry) continue;
    entry.list = entry.list.filter(u => u.id !== schedId);
    if (entry.list.length === 0) _noticeData.splice(_noticeData.indexOf(entry), 1);
  }
  updateNoticeBtn();
}

// Salta l'occorrenza corrente: avanza start_date alla prossima senza creare transazioni.
window.skipSched = async id => {
  const s = window._schedCache?.[id];
  if (!s || !s._next) return;
  await api.advanceScheduled(id, s._next);
  _resolveOverdue(id);
  toast('Occorrenza saltata');
  renderSchedLista();
};

// Registra l'occorrenza: apre il modale transazione precompilato (aggiunge il tag "Da Budget")
// e, al salvataggio, avanza la pianificata alla prossima data.
window.registerSched = async id => {
  const s = window._schedCache?.[id];
  if (!s || !s._next) return;
  const [cats, accs, tags] = await Promise.all([
    api.getCategories(), api.getAccounts(), api.getTags()
  ]);
  const budgetTag = tags.find(t => t.system_key === 'budget');
  const existingIds = (s.tags || []).map(t => t.id);
  const tagIds = budgetTag && !existingIds.includes(budgetTag.id)
    ? [...existingIds, budgetTag.id]
    : existingIds;
  const prefilled = {
    id: null,
    date: s._next,
    amount:        s.amount,
    type:          s.type,
    category_id:   s.category_id   || null,
    account_id:    s.account_id,
    to_account_id: s.to_account_id || null,
    description:   s.description   || '',
    color:         s.color         || null,
    reconciled:    s.reconciled    ?? 1,
    tag_ids: tagIds
  };
  showTxModal(prefilled, cats, accs, s.type, tags, () => {
    // Avanzamento già fatto dentro la stessa transazione SQL del salvataggio (saveOverride).
    _resolveOverdue(id);
    renderSchedLista();
  },
  // Salvataggio + avanzamento atomici: come in dashboard.js, due chiamate separate potevano
  // lasciare la transazione registrata e la pianificata ferma → doppia registrazione.
  data => api.addTransactionForScheduled(data, id, s._next));
};

// Modale crea/modifica pianificata: tipo, importo (espressioni), categoria (cat-picker),
// frequenza, conti, date inizio/fine, colore riga, attivo, tag e stato di conciliazione.
function showScheduledModal(sched, accounts, categories, tags = []) {
  const isEdit = !!(sched?.id);
  const today  = _todayStr();
  const initType = sched?.type || 'expense';

  const expCats = categories.filter(c=>c.type==='expense');
  const incCats = categories.filter(c=>c.type==='income');

  const body = `
    ${sched?.portfolio_id ? `<div class="portfolio-link-banner">📈 Collegata a posizione portfolio</div>` : ''}
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Tipo</label>
        <select class="form-control" id="sc_type" onchange="schedToggleCats()">
          <option value="expense"  ${initType==='expense' ?'selected':''}>Uscita</option>
          <option value="income"   ${initType==='income'  ?'selected':''}>Entrata</option>
          <option value="transfer" ${initType==='transfer'?'selected':''}>Trasferimento</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Importo (€) *</label>
        <input type="text" inputmode="decimal" class="form-control" id="sc_amount" value="${sched?.amount||''}" placeholder="es. 40+10.30 o 100/3*2" autocomplete="off">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Descrizione</label>
      <input class="form-control" id="sc_desc" placeholder="Opzionale" value="${sched?.description||''}">
    </div>
    <div class="form-row">
      <div class="form-group" id="sc_catGroup">
        <label class="form-label">Categoria</label>
        <div class="cat-picker">
          <input type="text" class="form-control" id="sc_cat_input" placeholder="— Seleziona categoria —" autocomplete="off">
          <input type="hidden" id="sc_cat" value="">
          <div class="cat-picker-list" id="sc_catPickerList"></div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Frequenza</label>
        <select class="form-control" id="sc_freq">
          ${Object.entries(FREQ_LABELS).map(([v,l])=>`<option value="${v}" ${sched?.frequency===v?'selected':v==='monthly'&&!sched?'selected':''}>${l}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Conto *</label>
        <select class="form-control" id="sc_account">
          ${accounts.filter(isAccountActive).map(a=>`<option value="${a.id}" ${sched?.account_id==a.id?'selected':''}>${a.icon} ${a.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group" id="sc_toAccGroup" style="${initType!=='transfer'?'display:none':''}">
        <label class="form-label">Conto destinazione</label>
        <select class="form-control" id="sc_toAccount">
          <option value="">— Seleziona —</option>
          ${accounts.map(a=>`<option value="${a.id}" ${sched?.to_account_id==a.id?'selected':''}>${a.icon} ${a.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Data inizio *</label>
        <input type="date" class="form-control" id="sc_start" value="${sched?.start_date||today}">
      </div>
      <div class="form-group">
        <label class="form-label">Data fine (opzionale)</label>
        <input type="date" class="form-control" id="sc_end" value="${sched?.end_date||''}" min="${sched?.start_date||today}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Colore riga <span class="settings-hint">(opzionale)</span></label>
        <div class="flex-center-8">
          <input type="color" id="sc_color" class="form-color-tx" value="${sched?.color||'#ffffff'}">
          <label class="settings-hint" style="display:flex;align-items:center;gap:6px;cursor:pointer">
            <input type="checkbox" id="sc_color_use" ${sched?.color?'checked':''} style="margin:0">
            Usa colore
          </label>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Attivo</label>
        <label class="flex-center-8" style="cursor:pointer;margin-top:6px">
          <input type="checkbox" id="sc_active" ${sched?.is_active!==0?'checked':''} style="margin:0">
          Transazione attiva
        </label>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Tag</label>
      <div class="tag-selector" id="sc_tagSelector">
        ${tags.map(t=>`<span class="tag-chip" data-tag-id="${t.id}" style="--tc:${t.color}">${t.name}</span>`).join('')}
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Stato alla registrazione</label>
      <div class="recon-toggle" id="scReconToggle">
        <input type="radio" name="sc_reconciled" id="sc_rec_pending" value="0" ${sched?.reconciled==0?'checked':''} hidden>
        <input type="radio" name="sc_reconciled" id="sc_rec_done"    value="1" ${sched==null||sched?.reconciled!=0?'checked':''} hidden>
        <button type="button" class="recon-opt${sched?.reconciled==0?' active':''}" data-val="0" data-radio="sc_rec_pending">🔲 Da verificare</button>
        <button type="button" class="recon-opt${sched==null||sched?.reconciled!=0?' active':''}" data-val="1" data-radio="sc_rec_done">✅ Conciliata</button>
      </div>
    </div>`;

  // Aggiorna le voci del cat-picker in base al tipo selezionato (vuoto per i trasferimenti).
  function updateSchedCatSelect(keepSelected) {
    const type  = document.getElementById('sc_type')?.value;
    const input = document.getElementById('sc_cat_input');
    if (!input?._catPickerSetItems) return;
    if (type === 'transfer') { input._catPickerSetItems([], null); return; }
    const cats = type === 'expense' ? expCats : incCats;
    const items = _leafCats(cats).map(c => ({
      id: c.id,
      label: c.parent_id ? `${c.parent_name} › ${c.icon} ${c.name}` : `${c.icon} ${c.name}`
    }));
    input._catPickerSetItems(items, keepSelected);
  }

  window.schedToggleCats = () => {
    const type = document.getElementById('sc_type')?.value;
    const toAcc = document.getElementById('sc_toAccGroup');
    if (toAcc) toAcc.style.display = type === 'transfer' ? '' : 'none';
    updateSchedCatSelect(null);
  };

  const sc_selectedTagIds = new Set((sched?.tags || []).map(t => Number(t.id)));

  openModal(isEdit ? 'Modifica Transazione Pianificata' : 'Nuova Transazione Pianificata', body, async () => {
    const type = document.getElementById('sc_type').value;
    const data = {
      id:            sched?.id,
      description:   document.getElementById('sc_desc').value.trim(),
      amount:        evalAmount(document.getElementById('sc_amount').value),
      type,
      category_id:   parseInt(document.getElementById('sc_cat').value)||null,
      account_id:    parseInt(document.getElementById('sc_account').value),
      to_account_id: type==='transfer' ? parseInt(document.getElementById('sc_toAccount').value)||null : null,
      frequency:     document.getElementById('sc_freq').value,
      start_date:    document.getElementById('sc_start').value,
      end_date:      document.getElementById('sc_end').value || null,
      is_active:  document.getElementById('sc_active').checked ? 1 : 0,
      color:      document.getElementById('sc_color_use')?.checked
                    ? document.getElementById('sc_color').value : null,
      reconciled: parseInt(document.querySelector('input[name="sc_reconciled"]:checked')?.value ?? '1'),
      tag_ids:    [...sc_selectedTagIds],
    };
    const _markErr = (id, msg) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.style.borderColor = 'var(--expense)';
      el.style.boxShadow   = '0 0 0 2px rgba(248,81,73,.25)';
      const clear = () => { el.style.borderColor = ''; el.style.boxShadow = ''; };
      el.addEventListener('input',  clear, { once: true });
      el.addEventListener('change', clear, { once: true });
      toast(msg, 'error');
    };
    if (!data.amount) { _markErr('sc_amount', 'Inserisci l\'importo'); return false; }
    if (!data.account_id) { _markErr('sc_account', 'Seleziona il conto'); return false; }
    if (data.type !== 'transfer' && !data.category_id) { _markErr('sc_cat_input', 'Seleziona la categoria'); return false; }
    if (!data.start_date) { _markErr('sc_start', 'Inserisci la data di inizio'); return false; }
    if (data.end_date && data.end_date < data.start_date) { _markErr('sc_end', 'La data fine non può essere precedente alla data inizio'); return false; }
    try {
      if (isEdit) await api.updateScheduled(data);
      else        await api.addScheduled(data);
      closeModal();
      toast(isEdit ? 'Transazione pianificata aggiornata' : 'Transazione pianificata aggiunta');
      renderSchedLista();
    } catch(e) { toast(e.message, 'error'); return false; }
  });

  // wire tag chips (DOM già disponibile dopo openModal)
  document.querySelectorAll('#sc_tagSelector [data-tag-id]').forEach(chip => {
    const id = Number(chip.dataset.tagId);
    if (sc_selectedTagIds.has(id)) chip.classList.add('selected');
    chip.onclick = () => {
      chip.classList.toggle('selected');
      sc_selectedTagIds.has(id) ? sc_selectedTagIds.delete(id) : sc_selectedTagIds.add(id);
    };
  });

  const _scStart = document.getElementById('sc_start');
  const _scEnd   = document.getElementById('sc_end');
  if (_scStart && _scEnd) {
    _scStart.addEventListener('change', () => {
      _scEnd.min = _scStart.value || '';
      if (_scEnd.value && _scStart.value && _scEnd.value < _scStart.value) _scEnd.value = '';
    });
  }

  initCatPicker('sc_cat_input', 'sc_cat', 'sc_catPickerList');
  updateSchedCatSelect(sched?.category_id);

  document.querySelectorAll('#scReconToggle .recon-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#scReconToggle .recon-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.radio).checked = true;
    });
  });

  // Enter su importo → salva; blur → valuta espressione
  const scAmtEl = document.getElementById('sc_amount');
  if (scAmtEl) {
    scAmtEl.addEventListener('blur', () => {
      const v = evalAmount(scAmtEl.value);
      if (v !== null) scAmtEl.value = v.toFixed(2);
    });
    scAmtEl.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); document.getElementById('modalConfirm')?.click(); }
    });
  }
}
