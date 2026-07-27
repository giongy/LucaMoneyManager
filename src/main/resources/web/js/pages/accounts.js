/* ═══════════════════════════════════════════════════════════════════════════
   LucaMoneyManager — pages/accounts.js
   Pagina Conti + chiusura mese carte di credito (estratta da app.js, stadio 6a)
═══════════════════════════════════════════════════════════════════════════ */

// Dipende da _accTypeOrder, navigateToAccountTx (in app.js, lazy a runtime).
// _fillCreditMonthDash è chiamata dalla Dashboard (in app.js): function decl
// globale → risolta lazy quando renderDashboard viene eseguita.

// Disegna la pagina Conti (intestazione + griglia, popolata da loadAccountCards).
async function renderAccounts() {
  const pg = document.getElementById('pg-accounts');
  pg.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">Conti</h2>
      <button class="btn btn-primary" id="btnAddAcc">+ Nuovo Conto</button>
    </div>
    <div class="accounts-grid" id="accountsGrid"></div>`;
  document.getElementById('btnAddAcc').onclick = () => showAccountModal(null);
  loadAccountCards();
}

// HTML di una card conto: icona, nome, badge (preferito/chiuso), saldo e azioni
// (per le carte di credito aggiunge "Chiudi mese").
function _accountCardHtml(a) {
  const badges = [a.is_favorite ? '⭐' : '', a.is_closed ? '🔒' : ''].filter(Boolean).join(' ');
  return `<div class="account-card${a.is_closed ? ' account-card-closed' : ''}" data-id="${a.id}" data-type="${a.type}" draggable="true" style="--acc-color:${a.color}">
    <span class="acc-drag-handle" title="Trascina per riordinare">⠿</span>
    <div class="account-icon">${a.icon}</div>
    <div class="acc-info">
      <div class="account-name">${a.name}${badges ? ` <span style="font-size:11px;font-weight:400">${badges}</span>` : ''}</div>
    </div>
    <div class="account-balance" style="color:${a.is_closed ? 'var(--txt3)' : a.color}">${fmt.currency(a.balance)}</div>
    <div class="account-actions">
      ${a.type === 'credit' ? `<button class="btn btn-ghost btn-icon" onclick="closeCreditMonth(${a.id},\`${a.name.replace(/`/g,"'")}\`)">💳 Chiudi mese</button>` : ''}
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
  const accounts = await api.getAccounts();
  if (!accounts.length) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">🏦</div><p>Nessun conto. Creane uno!</p></div>';
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
window.closeCreditMonth = async (cardId, cardName) => {
  const accounts = await api.getAccounts();
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
        ${sources.map(a=>`<option value="${a.id}">${a.icon} ${a.name} (${fmt.currency(a.balance)})</option>`).join('')}
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
      <input class="form-control" id="a_name" placeholder="Es. Conto BancaX" value="${account?.name||''}">
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
        <input type="hidden" id="a_icon" value="${account?.icon||'🏦'}">
      </div>
      <div class="form-group">
        <label class="form-label">Colore</label>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">
          ${ACCOUNT_COLORS.map(c=>`<button type="button" onclick="selectColor(this,'${c}')" style="width:28px;height:28px;border-radius:50%;background:${c};border:2px solid ${account?.color===c?'#fff':'transparent'}" class="color-pick" data-color="${c}"></button>`).join('')}
        </div>
        <input type="hidden" id="a_color" value="${account?.color||'#58a6ff'}">
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
// Elimina un conto e tutte le sue transazioni previa conferma.
// Il backend rifiuta se esistono trasferimenti IN ENTRATA da altri conti: quelli non
// cadono con la cascata e lascerebbero i conti di partenza scalati senza contropartita.
// In quel caso mostriamo il messaggio del backend, che spiega cosa fare.
window.deleteAccount = async id => {
  const ok = await confirm('Elimina conto','Vuoi eliminare questo conto e tutte le sue transazioni?');
  if (!ok) return;
  try {
    await api.deleteAccount(id);
  } catch (e) {
    toast(e.message || 'Eliminazione non riuscita', 'error');
    return;
  }
  toast('Conto eliminato');
  updateSidebar();
  loadAccountCards();
};
