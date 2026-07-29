/* ═══════════════════════════════════════════════════════════════════════════
   LucaMoneyManager — pages/accounts.js
   Pagina Conti + chiusura mese carte di credito (estratta da app.js, stadio 6a)
═══════════════════════════════════════════════════════════════════════════ */

// Dipende da _accTypeOrder, navigateToAccountTx (in app.js, lazy a runtime).
// _fillCreditMonthDash è chiamata dalla Dashboard (in app.js): function decl
// globale → risolta lazy quando renderDashboard viene eseguita.

// Disegna la pagina Conti (intestazione + griglia, popolata da loadAccountCards).
// I conti nascosti sono esclusi dalla griglia: questo toggle è l'unico modo per rivederli
// (e quindi riaprirli). Volutamente non persistito: torna OFF ad ogni rientro nella pagina.
let _accShowHidden = false;

async function renderAccounts() {
  const pg = document.getElementById('pg-accounts');
  pg.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">Conti</h2>
      <div style="display:flex;align-items:center;gap:10px">
        <label class="acc-check-label" id="lblShowHidden" style="display:none">
          <input type="checkbox" id="chkShowHidden" ${_accShowHidden ? 'checked' : ''}>
          🙈 Mostra nascosti
        </label>
        <button class="btn btn-primary" id="btnAddAcc">+ Nuovo Conto</button>
      </div>
    </div>
    <div class="accounts-grid" id="accountsGrid"></div>`;
  document.getElementById('btnAddAcc').onclick = () => showAccountModal(null);
  document.getElementById('chkShowHidden').onchange = e => {
    _accShowHidden = e.target.checked;
    loadAccountCards();
  };
  loadAccountCards();
}

// HTML di una card conto: icona, nome, badge (preferito/chiuso), saldo e azioni
// (per le carte di credito aggiunge "Chiudi mese").
function _accountCardHtml(a) {
  const badges = [a.is_favorite ? '⭐' : '', a.is_closed ? '🔒' : '', a.is_hidden ? '🙈' : ''].filter(Boolean).join(' ');
  return `<div class="account-card${a.is_closed ? ' account-card-closed' : ''}" data-id="${a.id}" data-type="${a.type}" draggable="true" style="--acc-color:${esc(a.color)}">
    <span class="acc-drag-handle" title="Trascina per riordinare">⠿</span>
    <div class="account-icon">${esc(a.icon)}</div>
    <div class="acc-info">
      <div class="account-name">${esc(a.name)}${badges ? ` <span style="font-size:11px;font-weight:400">${badges}</span>` : ''}</div>
    </div>
    <div class="account-balance" style="color:${a.is_closed ? 'var(--txt3)' : esc(a.color)}">${fmt.currency(a.balance)}</div>
    <div class="account-actions">
      ${a.type === 'credit' ? `<button class="btn btn-ghost btn-icon" onclick="closeCreditMonth(${a.id})">💳 Chiudi mese</button>` : ''}
      <button class="btn btn-ghost btn-icon" onclick="editAccount(${a.id})">✏️</button>
      <button class="btn btn-ghost btn-icon" onclick="deleteAccount(${a.id})">🗑️</button>
    </div>
  </div>`;
}

// Carica e disegna le card dei conti raggruppate per tipo, con drag&drop per riordinare
// sia le card (dentro lo stesso tipo) sia le intere sezioni, e click → transazioni del conto.
async function loadAccountCards() {
  const grid = document.getElementById('accountsGrid');
  if (!grid) return;
  const all = await api.getAccounts();

  // Il toggle "Mostra nascosti" compare solo se c'è davvero qualcosa di nascosto.
  const hiddenCount = all.filter(isAccountHidden).length;
  const lbl = document.getElementById('lblShowHidden');
  if (lbl) lbl.style.display = hiddenCount ? '' : 'none';

  const accounts = _accShowHidden ? all : all.filter(a => !isAccountHidden(a));
  if (!accounts.length) {
    grid.innerHTML = hiddenCount
      ? `<div class="empty-state"><div class="empty-icon">🙈</div><p>Tutti i conti sono nascosti. Usa "Mostra nascosti" per rivederli.</p></div>`
      : '<div class="empty-state"><div class="empty-icon">🏦</div><p>Nessun conto. Creane uno!</p></div>';
    return;
  }

  const orderedTypes = [...new Set([..._accTypeOrder.filter(t => accounts.some(a => a.type === t)),
    ...accounts.map(a => a.type).filter(t => !_accTypeOrder.includes(t))])];
  grid.innerHTML = orderedTypes.map(t => `
    <div class="accounts-section" data-sec-type="${t}">
      <div class="accounts-section-label">
        <span class="sec-drag-handle" title="Trascina per riordinare">⠿</span>
        ${accTypeLabel(t)}
      </div>
      <div class="accounts-section-grid" data-type="${t}">
        ${accounts.filter(a => a.type === t).map(_accountCardHtml).join('')}
      </div>
    </div>`).join('');

  // Drag & drop
  let dragId = null;
  grid.querySelectorAll('.account-card[draggable]').forEach(card => {
    card.addEventListener('dragstart', e => {
      dragId = Number(card.dataset.id);
      e.stopPropagation();
      setTimeout(() => card.classList.add('dragging'), 0);
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      grid.querySelectorAll('.account-card').forEach(c => c.classList.remove('drag-over'));
    });
    card.addEventListener('dragover', e => {
      if (!dragId) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      grid.querySelectorAll('.account-card').forEach(c => c.classList.remove('drag-over'));
      if (Number(card.dataset.id) !== dragId) card.classList.add('drag-over');
    });
    card.addEventListener('drop', e => {
      e.preventDefault();
      const targetId = Number(card.dataset.id);
      if (!dragId || dragId === targetId) return;
      const dragCard = grid.querySelector(`.account-card[data-id="${dragId}"]`);
      if (!dragCard || dragCard.dataset.type !== card.dataset.type) {
        toast('Riordinamento possibile solo tra conti dello stesso tipo', 'error'); return;
      }
      const container = card.parentElement;
      const cards = [...container.querySelectorAll('.account-card')];
      const fromIdx = cards.findIndex(c => Number(c.dataset.id) === dragId);
      const toIdx   = cards.findIndex(c => Number(c.dataset.id) === targetId);
      container.insertBefore(dragCard, fromIdx < toIdx ? card.nextSibling : card);

      // Ricalcola sort_order globale su tutti i gruppi visibili
      const items = [];
      let order = 0;
      grid.querySelectorAll('.accounts-section-grid').forEach(sec => {
        sec.querySelectorAll('.account-card').forEach(c => {
          items.push({ id: Number(c.dataset.id), sort_order: order++ });
        });
      });
      api.updateAccountOrder(items).catch(err => toast(err.message, 'error'));
    });
  });

  // ── Click → transazioni del conto ───────────────────────────────────────────
  grid.querySelectorAll('.account-card').forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', e => {
      if (e.target.closest('.account-actions, .acc-drag-handle')) return;
      navigateToAccountTx(Number(card.dataset.id));
    });
  });

  // ── Drag sezioni ────────────────────────────────────────────────────────────
  let dragSecType = null;
  grid.querySelectorAll('.accounts-section').forEach(sec => {
    const handle = sec.querySelector('.sec-drag-handle');
    handle.addEventListener('mousedown', () => sec.setAttribute('draggable', 'true'));
    sec.addEventListener('dragstart', e => {
      if (!sec.getAttribute('draggable')) { e.preventDefault(); return; }
      dragSecType = sec.dataset.secType;
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => sec.classList.add('sec-dragging'), 0);
    });
    sec.addEventListener('dragend', () => {
      sec.removeAttribute('draggable');
      sec.classList.remove('sec-dragging');
      grid.querySelectorAll('.accounts-section').forEach(s => s.classList.remove('sec-drag-over'));
      dragSecType = null;
    });
    sec.addEventListener('dragover', e => {
      if (!dragSecType) return;
      e.preventDefault();
      grid.querySelectorAll('.accounts-section').forEach(s => s.classList.remove('sec-drag-over'));
      if (sec.dataset.secType !== dragSecType) sec.classList.add('sec-drag-over');
    });
    sec.addEventListener('drop', e => {
      if (!dragSecType) return;
      e.preventDefault();
      const fromType = dragSecType;
      const toType = sec.dataset.secType;
      if (fromType === toType) return;
      const fromSec = grid.querySelector(`.accounts-section[data-sec-type="${fromType}"]`);
      const secs = [...grid.querySelectorAll('.accounts-section')];
      const fromIdx = secs.indexOf(fromSec);
      const toIdx   = secs.indexOf(sec);
      grid.insertBefore(fromSec, fromIdx < toIdx ? sec.nextSibling : sec);
      _accTypeOrder = [...grid.querySelectorAll('.accounts-section')].map(s => s.dataset.secType);
      api.setSetting('accounts.type_order', JSON.stringify(_accTypeOrder));
      grid.querySelectorAll('.accounts-section').forEach(s => s.classList.remove('sec-drag-over'));
    });
  });
}

// Totale delle spese (esclusi i trasferimenti) su una carta di credito in un dato mese.
async function _creditCardMonthTotal(cardId, y, m) {
  const from = `${y}-${String(m).padStart(2,'0')}-01`;
  const to   = `${y}-${String(m).padStart(2,'0')}-${new Date(y, m, 0).getDate()}`;
  const txs  = await api.getTransactions({ account_id: cardId, date_from: from, date_to: to, limit: 5000 });
  return txs.filter(t => t.type !== 'transfer').reduce((s,t) => s + t.amount, 0);
}

// Riempie nella dashboard il totale del mese corrente per ciascuna carta di credito.
async function _fillCreditMonthDash(accounts) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth() + 1;
  const monthName = now.toLocaleString('it-IT', { month: 'long' });
  for (const a of accounts.filter(a => a.type === 'credit')) {
    const total = await _creditCardMonthTotal(a.id, y, m);
    const el = document.getElementById(`cc-cur-${a.id}`);
    if (el) el.textContent = `${monthName}: ${fmt.currency(total)}`;
  }
}

// Modale "Chiudi mese" carta di credito: calcola il totale spese del mese e crea il
// trasferimento di pagamento dal conto sorgente alla carta (importo e data precompilati).
// Il nome della carta si ricava dall'id: passarlo come argomento dell'onclick inline
// significherebbe interpolare testo utente dentro un attributo HTML.
window.closeCreditMonth = async (cardId) => {
  const accounts = await api.getAccounts();
  const card     = accounts.find(a => a.id === cardId);
  if (!card) return;
  const cardName = card.name;
  const sources  = accounts.filter(a => a.type !== 'credit' && a.type !== 'investment' && !a.is_closed);

  // Default: mese precedente (l'ultimo mese concluso da saldare). La banca addebita il saldo
  // intorno al ~10 del mese successivo: es. il 10 giugno si salda maggio. Date() gestisce
  // automaticamente il cambio d'anno (a gennaio → dicembre dell'anno prima).
  const now = new Date();
  const ref = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const defYear  = ref.getFullYear();
  const defMonth = ref.getMonth() + 1;
  const defMonthStr = `${defYear}-${String(defMonth).padStart(2,'0')}`;

  // Data di pagamento default: 10 del mese successivo
  const payYear  = defMonth === 12 ? defYear + 1 : defYear;
  const payMonth = defMonth === 12 ? 1 : defMonth + 1;
  const defPayDate = `${payYear}-${String(payMonth).padStart(2,'0')}-10`;

  const body = `
    <div class="form-group">
      <label class="form-label">Mese di riferimento</label>
      <input type="month" class="form-control" id="cc_month" value="${defMonthStr}">
    </div>
    <div class="form-group" style="background:var(--bg3);border-radius:6px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:12px;color:var(--txt2)">Spese nel mese</span>
      <span id="cc_amount_display" style="font-size:16px;font-weight:700;color:var(--expense)">—</span>
    </div>
    <div class="form-group">
      <label class="form-label">Conto sorgente</label>
      <select class="form-control" id="cc_source">
        <option value="">— Seleziona —</option>
        ${sources.map(a=>`<option value="${a.id}">${esc(a.icon)} ${esc(a.name)} (${fmt.currency(a.balance)})</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Data trasferimento</label>
      <input type="date" class="form-control" id="cc_date" value="${defPayDate}">
    </div>
    <div class="form-group">
      <label class="form-label">Importo (€)</label>
      <input type="number" step="0.01" class="form-control" id="cc_amount" placeholder="Calcolato automaticamente">
    </div>`;

  const calcAmount = async () => {
    const monthVal = document.getElementById('cc_month')?.value;
    if (!monthVal) return;
    const [y, m] = monthVal.split('-').map(Number);
    const total = await _creditCardMonthTotal(cardId, y, m);
    const el = document.getElementById('cc_amount_display');
    const inp = document.getElementById('cc_amount');
    if (el)  el.textContent  = fmt.currency(total);
    if (inp) inp.value = total.toFixed(2);
    // Aggiorna data pagamento in base al mese scelto
    const pm = m === 12 ? 1 : m + 1;
    const py = m === 12 ? y + 1 : y;
    const dateInp = document.getElementById('cc_date');
    if (dateInp) dateInp.value = `${py}-${String(pm).padStart(2,'0')}-10`;
  };

  openModal(`💳 Chiudi mese — ${cardName}`, body, async () => {
    const sourceId = parseInt(document.getElementById('cc_source').value);
    const amount   = parseFloat(document.getElementById('cc_amount').value);
    const date     = document.getElementById('cc_date').value;
    if (!sourceId) { toast('Seleziona il conto sorgente', 'error'); return false; }
    if (!amount || amount <= 0) { toast('Importo non valido', 'error'); return false; }
    if (!date)    { toast('Inserisci la data', 'error'); return false; }
    const monthVal = document.getElementById('cc_month')?.value || defMonthStr;
    await api.addTransaction({
      date, amount, type: 'transfer',
      account_id: sourceId, to_account_id: cardId,
      description: `Pagamento carta ${cardName} — ${monthVal}`,
      reconciled: 0
    });
    toast(`Trasferimento di ${fmt.currency(amount)} creato`);
    loadAccountCards();
    updateSidebar();
  }, 'Salva', 'btn-primary', 'modal-sm');

  // Calcola subito al primo render
  setTimeout(calcAmount, 50);

  // Ricalcola quando cambia il mese
  setTimeout(() => {
    document.getElementById('cc_month')?.addEventListener('change', calcAmount);
  }, 100);
};

// Etichetta leggibile per il tipo di conto.
function accTypeLabel(t) {
  return {checking:'Conto Corrente',savings:'Risparmio',cash:'Contanti',credit:'Carta di Credito',investment:'Investimento'}[t]||t;
}

const ACCOUNT_ICONS = ['🏦','💳','💵','🏧','💰','📈','🏠','🚀','💼','🪙','✈️','🎁'];
const ACCOUNT_COLORS = ['#58a6ff','#3fb950','#f85149','#d29922','#a371f7','#f0883e','#00d4aa','#8b949e','#ec4899','#06b6d4','#84cc16','#6366f1'];

// Modale crea/modifica conto: nome, tipo, saldo iniziale, icona, colore e flag preferito/chiuso.
function showAccountModal(account) {
  const body = `
    <div class="form-group">
      <label class="form-label">Nome</label>
      <input class="form-control" id="a_name" placeholder="Es. Conto BancaX" value="${esc(account?.name||'')}">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Tipo</label>
        <select class="form-control" id="a_type">
          ${['checking','savings','cash','credit','investment'].map(t=>`<option value="${t}" ${account?.type===t?'selected':''}>${accTypeLabel(t)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Saldo iniziale (€)</label>
        <input type="number" step="0.01" class="form-control" id="a_balance" value="${account?.initial_balance||0}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Icona</label>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">
          ${ACCOUNT_ICONS.map(ic=>`<button type="button" class="btn btn-ghost btn-icon icon-pick ${account?.icon===ic?'icon-selected':''}" onclick="selectIcon(this,'${ic}')" data-icon="${ic}" style="font-size:20px">${ic}</button>`).join('')}
        </div>
        <input type="hidden" id="a_icon" value="${esc(account?.icon||'🏦')}">
      </div>
      <div class="form-group">
        <label class="form-label">Colore</label>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">
          ${ACCOUNT_COLORS.map(c=>`<button type="button" onclick="selectColor(this,'${c}')" style="width:28px;height:28px;border-radius:50%;background:${c};border:2px solid ${account?.color===c?'#fff':'transparent'}" class="color-pick" data-color="${c}"></button>`).join('')}
        </div>
        <input type="hidden" id="a_color" value="${esc(account?.color||'#58a6ff')}">
      </div>
    </div>
    <div class="form-row" style="margin-top:8px">
      <label class="acc-check-label">
        <input type="checkbox" id="a_favorite" ${account?.is_favorite ? 'checked' : ''}>
        ⭐ Preferito
      </label>
      <label class="acc-check-label">
        <input type="checkbox" id="a_closed" ${account?.is_closed ? 'checked' : ''}>
        🔒 Chiuso
      </label>
      <label class="acc-check-label" title="Un conto nascosto sparisce da liste, selettori, totali e report. Implica 'Chiuso'.">
        <input type="checkbox" id="a_hidden" ${account?.is_hidden ? 'checked' : ''}>
        🙈 Nascosto
      </label>
    </div>`;

  openModal(account ? 'Modifica Conto' : 'Nuovo Conto', body, async () => {
    const data = {
      id:              account?.id,
      name:            document.getElementById('a_name').value.trim(),
      type:            document.getElementById('a_type').value,
      initial_balance: parseFloat(document.getElementById('a_balance').value)||0,
      icon:            document.getElementById('a_icon').value,
      color:           document.getElementById('a_color').value,
      currency:        'EUR',
      is_favorite:     document.getElementById('a_favorite').checked ? 1 : 0,
      is_closed:       document.getElementById('a_closed').checked   ? 1 : 0,
      is_hidden:       document.getElementById('a_hidden').checked   ? 1 : 0,
    };
    if (!data.name) { toast('Inserisci un nome per il conto','error'); return; }
    try {
      if (account) await api.updateAccount(data);
      else         await api.addAccount(data);
      closeModal();
      toast(account ? 'Conto aggiornato' : 'Conto creato');
      updateSidebar();
      loadAccountCards();
    } catch(e) { toast(e.message,'error'); }
  });

  // Invariante "nascosto ⇒ chiuso" riflessa subito nella UI (il backend la applica comunque):
  // spuntare Nascosto spunta Chiuso; togliere Chiuso toglie Nascosto.
  const cbClosed = document.getElementById('a_closed');
  const cbHidden = document.getElementById('a_hidden');
  cbHidden.onchange = () => { if (cbHidden.checked) cbClosed.checked = true; };
  cbClosed.onchange = () => { if (!cbClosed.checked) cbHidden.checked = false; };
}

// Selezione icona/colore nel modale conto (aggiornano l'input nascosto corrispondente).
window.selectIcon = (btn, icon) => {
  document.querySelectorAll('.icon-pick').forEach(b => b.classList.remove('icon-selected'));
  btn.classList.add('icon-selected');
  document.getElementById('a_icon').value = icon;
};
window.selectColor = (btn, color) => {
  document.querySelectorAll('.color-pick').forEach(b => b.style.border='2px solid transparent');
  btn.style.border='2px solid #fff';
  document.getElementById('a_color').value = color;
};
// Apre il modale di modifica per il conto con l'id dato.
window.editAccount = async id => {
  const accounts = await api.getAccounts();
  showAccountModal(accounts.find(a=>a.id===id));
};
// Cestino del conto: NON elimina subito. Mostra cosa andrebbe perso (transazioni, pianificate,
// posizioni, saldo) e propone le alternative non distruttive — chiudere o nascondere — lasciando
// l'eliminazione come terza scelta esplicita. L'eliminazione è definitiva e senza undo: le
// transazioni cadono in cascata via FK, e con esse split, tag e movimenti di portfolio.
window.deleteAccount = async id => {
  let u;
  try {
    u = await api.getAccountUsage(id);
  } catch (e) {
    toast(e.message || 'Lettura del conto non riuscita', 'error');
    return;
  }

  const rows = [
    ['Transazioni',           u.transactions],
    ['Pianificate',           u.scheduled],
    ['Posizioni portfolio',   u.portfolio],
  ].filter(([, n]) => n > 0);

  const isEmpty = rows.length === 0;
  // I trasferimenti in entrata da altri conti fanno rifiutare l'eliminazione lato backend
  // (lascerebbero i conti di partenza scalati senza contropartita): avvisa prima, non dopo.
  const blocked = u.incoming_transfers > 0;

  const listHtml = isEmpty
    ? `<p style="color:var(--txt2);line-height:1.6">Questo conto non ha transazioni, pianificate o posizioni collegate.</p>`
    : `<p style="color:var(--txt2);line-height:1.6;margin-bottom:10px">Eliminando <b>${esc(u.name)}</b> perderai in modo definitivo:</p>
       <ul style="color:var(--txt2);line-height:1.9;margin:0 0 12px 18px">
         ${rows.map(([lbl, n]) => `<li><b>${n.toLocaleString('it-IT')}</b> ${lbl.toLowerCase()}</li>`).join('')}
       </ul>
       <p style="color:var(--txt2);line-height:1.6">Saldo attuale: <b>${fmt.currency(u.balance)}</b></p>`;

  const warnHtml = blocked
    ? `<p style="color:var(--expense);line-height:1.6;margin-top:12px">
         ⛔ Non eliminabile: ci sono <b>${u.incoming_transfers}</b> trasferimenti in entrata da altri
         conti (${fmt.currency(u.incoming_amount)}). Vanno prima eliminati o riassegnati, altrimenti
         i conti di partenza resterebbero scalati senza contropartita.
       </p>`
    : (isEmpty ? '' :
      `<p style="color:var(--txt3);line-height:1.6;margin-top:12px">
         L'operazione non può essere annullata. Se il conto non è più in uso, conviene
         <b>chiuderlo</b>: la storia resta e i totali restano corretti. Se non vuoi più vederlo
         da nessuna parte, <b>nascondilo</b>.
       </p>`);

  const already = u.is_hidden ? 'hidden' : (u.is_closed ? 'closed' : 'open');
  const btn = (act, label, style) =>
    `<button type="button" class="btn ${style}" data-act="${act}" style="flex:1;min-width:120px">${label}</button>`;

  const body = `${listHtml}${warnHtml}
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:18px">
      ${already === 'open'   ? btn('close',  '🔒 Chiudi',   'btn-primary') : ''}
      ${already !== 'hidden' ? btn('hide',   '🙈 Nascondi', 'btn-ghost') : ''}
      ${btn('delete', '🗑️ Elimina definitivamente', 'btn-danger')}
    </div>`;

  // onConfirm=null → openModal mostra solo "Annulla": le azioni sono i bottoni qui sopra.
  openModal(`Elimina "${u.name}"`, body, null);
  document.getElementById('modalCancel').style.display = '';
  document.getElementById('modalCancel').onclick = closeModal;

  document.querySelectorAll('#modalBody [data-act]').forEach(b => {
    b.onclick = async () => {
      const act = b.dataset.act;
      if (act === 'delete' && blocked) {
        toast('Elimina o riassegna prima i trasferimenti in entrata', 'error');
        return;
      }
      // Doppio click di sicurezza sull'eliminazione di un conto con dati: il primo click arma
      // il bottone, il secondo esegue. Evita un secondo modale annidato (confirm() riuserebbe
      // questo stesso modale, chiudendolo) e rende difficile eliminare per sbaglio.
      if (act === 'delete' && !isEmpty && b.dataset.armed !== '1') {
        b.dataset.armed = '1';
        b.textContent = '⚠️ Clicca di nuovo per eliminare';
        setTimeout(() => {
          if (!b.isConnected) return;
          b.dataset.armed = '0';
          b.textContent = '🗑️ Elimina definitivamente';
        }, 4000);
        return;
      }
      try {
        if (act === 'delete') {
          await api.deleteAccount(id);
          toast('Conto eliminato');
        } else {
          // Chiudi/nascondi passano da updateAccount: serve il record completo, perché
          // updateAccount riscrive tutte le colonne (non fa un update parziale).
          const acc = (await api.getAccounts()).find(a => a.id === id);
          if (!acc) { toast('Conto non trovato', 'error'); return; }
          await api.updateAccount({ ...acc,
            is_closed: 1,
            is_hidden: act === 'hide' ? 1 : (acc.is_hidden || 0) });
          toast(act === 'hide' ? 'Conto nascosto' : 'Conto chiuso');
        }
      } catch (e) {
        toast(e.message || 'Operazione non riuscita', 'error');
        return;
      }
      closeModal();
      updateSidebar();
      loadAccountCards();
    };
  });
};
