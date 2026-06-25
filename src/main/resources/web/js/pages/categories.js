/* ═══════════════════════════════════════════════════════════════════════════
   LucaMoneyManager — pages/categories.js
   Pagina Categorie (estratta da app.js, stadio 5c del refactor)
═══════════════════════════════════════════════════════════════════════════ */

// _iconPickerBuild è definito in app.js (riga ~112): risolto lazy a runtime.

// Disegna la pagina Categorie ad albero: parent con sottocategorie, separate per Uscite/Entrate
// e la categoria speciale Trasferimento (non modificabile).
async function renderCategories() {
  const pg = document.getElementById('pg-categories');
  const cats = await api.getCategories();

  // Separa categorie speciali, parent e figlie
  const transfer = cats.find(c => c.type === 'transfer');
  const parents  = cats.filter(c => !c.parent_id && c.type !== 'transfer');
  const children = cats.filter(c => c.parent_id);

  const typeLabel = t => t === 'income' ? '📥 Entrata' : t === 'expense' ? '📤 Uscita' : '🔁 Trasferimento';
  const typeCls   = t => t === 'income' ? 'badge-income' : t === 'expense' ? 'badge-expense' : 'badge-transfer';

  function childrenOf(parentId) {
    return children.filter(c => c.parent_id === parentId);
  }

  // Renderizza una lista di categorie parent con le rispettive sottocategorie annidate.
  function renderTree(list) {
    return list.map(p => {
      const kids = childrenOf(p.id);
      const isTransfer = p.type === 'transfer';
      return `
        <div class="cat-parent">
          <div class="cat-row cat-parent-row">
            <span class="cat-icon" style="background:${p.color}22;color:${p.color}">${p.icon}</span>
            <span class="cat-color-dot" style="background:${p.color}" title="${p.color}"></span>
            <span class="cat-name">${p.name}</span>
            <span class="badge ${typeCls(p.type)}">${typeLabel(p.type)}</span>
            ${p.expense_nature ? `<span class="nature-badge nature-${p.expense_nature}">${{essenziale:'🟢 Essenziale',variabile:'🟡 Variabile',superflua:'🔴 Superflua'}[p.expense_nature]||''}</span>` : ''}
            ${p.excluded_from_budget ? `<span class="badge" style="background:var(--txt3);color:#fff;font-size:10px" title="Esclusa da budget, report, dashboard e previsioni">🚫 Esclusa</span>` : ''}
            <span class="cat-sub-count">${kids.length} sottocategorie</span>
            <div class="cat-actions">
              ${!isTransfer ? `
                <button class="btn btn-ghost btn-icon" onclick="addSubCategory(${p.id},'${p.type}')" title="Aggiungi sottocategoria">＋</button>
                <button class="btn btn-ghost btn-icon" onclick="editCategory(${p.id})" title="Modifica">✏️</button>
                <button class="btn btn-ghost btn-icon" onclick="deleteCategory(${p.id})" title="Elimina">🗑️</button>
              ` : '<span class="settings-hint">speciale</span>'}
            </div>
          </div>
          ${kids.length ? `
            <div class="cat-children">
              ${kids.map(k => `
                <div class="cat-row cat-child-row">
                  <span class="cat-indent">└</span>
                  <span class="cat-icon" style="background:${k.color}22;color:${k.color}">${k.icon}</span>
                  <span class="cat-color-dot" style="background:${k.color}" title="${k.color}"></span>
                  <span class="cat-name">${k.name}</span>
                  ${(() => { const n = k.expense_nature || k.parent_expense_nature; const inh = !k.expense_nature && n; return n ? `<span class="nature-badge nature-${n}" title="${inh?'ereditata dal parent':''}">${{essenziale:'🟢',variabile:'🟡',superflua:'🔴'}[n]||''}${inh?' ↑':''}</span>` : ''; })()}
                  ${k.excluded_from_budget ? `<span class="badge" style="background:var(--txt3);color:#fff;font-size:10px" title="Esclusa da budget, report, dashboard e previsioni">🚫</span>` : ''}
                  <span class="cat-inherited">eredita ${typeLabel(k.type)}</span>
                  <div class="cat-actions">
                    <button class="btn btn-ghost btn-icon" onclick="editCategory(${k.id})" title="Modifica">✏️</button>
                    <button class="btn btn-ghost btn-icon" onclick="deleteCategory(${k.id})" title="Elimina">🗑️</button>
                  </div>
                </div>`).join('')}
            </div>` : ''}
        </div>`;
    }).join('');
  }

  pg.innerHTML = `
    <div style="max-width:700px">
    <div class="page-header">
      <h1 class="page-title">🏷️ Categorie</h1>
      <div class="page-actions">
        <button class="btn btn-primary" onclick="addMainCategory('expense')">＋ Uscita</button>
        <button class="btn btn-secondary" onclick="addMainCategory('income')">＋ Entrata</button>
      </div>
    </div>

    <div class="cats-section-title">📤 Uscite</div>
    <div class="cats-list" id="catsExpense">
      ${renderTree(parents.filter(p => p.type === 'expense'))}
    </div>

    <div class="cats-section-title" style="margin-top:24px">📥 Entrate</div>
    <div class="cats-list" id="catsIncome">
      ${renderTree(parents.filter(p => p.type === 'income'))}
    </div>

    ${transfer ? `
    <div class="cats-section-title" style="margin-top:24px">🔁 Speciale</div>
    <div class="cats-list">
      <div class="cat-parent">
        <div class="cat-row cat-parent-row">
          <span class="cat-icon" style="background:${transfer.color}22;color:${transfer.color}">${transfer.icon}</span>
          <span class="cat-name">${transfer.name}</span>
          <span class="badge badge-transfer">Trasferimento</span>
          <span class="settings-hint" style="margin-left:8px">Categoria di sistema, non modificabile</span>
        </div>
      </div>
    </div>` : ''}
    </div>`;
}

// Apre il modale per una nuova categoria principale del tipo dato (income/expense).
function addMainCategory(type) {
  showCategoryModal(null, type, null);
}

// Apre il modale per una nuova sottocategoria sotto il parent dato (eredita il tipo).
function addSubCategory(parentId, parentType) {
  showCategoryModal(null, parentType, parentId);
}

// Apre il modale di modifica per la categoria con l'id dato.
async function editCategory(id) {
  const cats = await api.getCategories();
  const cat = cats.find(c => c.id === id);
  if (cat) showCategoryModal(cat, cat.type, cat.parent_id);
}

// Elimina una categoria: conferma semplice se inutilizzata, altrimenti chiede su quale
// categoria spostare transazioni/budget/sottocategorie prima di eliminarla.
async function deleteCategory(id) {
  const [usage, allCats] = await Promise.all([api.getCategoryUsage(id), api.getCategories()]);
  const cat = allCats.find(c => c.id === id);
  if (!cat) return;

  const totalTx = (usage.tx_count || 0) + (usage.child_tx_count || 0);
  const hasBudget = (usage.budget_count || 0) > 0;
  const hasChildren = (usage.child_count || 0) > 0;

  // Nessun uso → semplice conferma
  if (totalTx === 0 && !hasBudget && !hasChildren) {
    openModal('Elimina categoria',
      `<p style="margin:0">Eliminare <b>${cat.icon} ${cat.name}</b>?</p>`,
      async () => {
        await api.deleteCategory(id); closeModal();
        toast('Categoria eliminata'); renderCategories();
      }, 'Elimina', 'btn-danger');
    return;
  }

  // Ha dipendenze → proponi spostamento
  const descParts = [];
  if (totalTx > 0) descParts.push(`${totalTx} transazion${totalTx===1?'e':'i'}`);
  if (hasBudget)   descParts.push(`${usage.budget_count} voc${usage.budget_count===1?'e':'i'} di budget`);
  if (hasChildren) descParts.push(`${usage.child_count} sottocategor${usage.child_count===1?'ia':'ie'}`);

  // Categorie disponibili per lo spostamento (stesso tipo, esclude questa e i suoi figli)
  const childIds = new Set(allCats.filter(c => c.parent_id === id).map(c => c.id));
  const targets = allCats.filter(c =>
    c.id !== id && !childIds.has(c.id) && c.type === cat.type && c.type !== 'transfer'
  );
  const opts = targets.map(c =>
    `<option value="${c.id}">${c.parent_id ? '  └ ' : ''}${c.icon} ${c.name}</option>`
  ).join('');

  openModal('Elimina categoria',
    `<p style="margin-bottom:12px">
       <b>${cat.icon} ${cat.name}</b> è usata da: <b>${descParts.join(', ')}</b>.<br>
       <span class="settings-hint">Sposta tutto su un'altra categoria prima di eliminare.</span>
     </p>
     <div class="form-group">
       <label class="form-label">Sposta su</label>
       <select id="del_target" class="form-input">
         <option value="">— Seleziona categoria —</option>
         ${opts}
       </select>
     </div>
     <div class="settings-hint" style="margin-top:6px">
       Le voci di budget verranno eliminate. Le transazioni verranno spostate sulla categoria scelta.
     </div>`,
    async () => {
      const toId = parseInt(document.getElementById('del_target').value);
      if (!toId) { toast('Seleziona una categoria di destinazione', 'error'); return false; }
      await api.reassignCategory({from_id: id, to_id: toId});
      closeModal(); toast('Categoria eliminata e transazioni spostate'); renderCategories();
    }, 'Sposta ed elimina', 'btn-danger');
}

// Modale crea/modifica categoria: nome, parent, icona (picker), colore e — per le uscite —
// natura spesa (essenziale/variabile/superflua, eredita dal parent se non impostata).
async function showCategoryModal(cat, type, parentId) {
  const allCats  = await api.getCategories();
  const parents  = allCats.filter(c => !c.parent_id && c.type === type && c.type !== 'transfer');
  const isEdit   = !!cat;
  const isChild  = !!parentId || (cat && !!cat.parent_id);
  const pId      = parentId ?? (cat?.parent_id ?? null);
  const parentCat = pId ? allCats.find(c => c.id === pId) : null;
  const inheritedNature = parentCat?.expense_nature ?? null;
  // Natura effettiva da mostrare preselezionata: propria se presente, altrimenti ereditata
  const effectiveNature = cat?.expense_nature ?? inheritedNature ?? '';

  const parentOpts = parents.map(p =>
    `<option value="${p.id}" ${pId === p.id ? 'selected' : ''}>${p.icon} ${p.name}</option>`
  ).join('');

  openModal(isEdit ? 'Modifica Categoria' : 'Nuova Categoria', `
    <div class="form-grid">
      <div class="form-group" style="grid-column:1/-1">
        <label class="form-label">Tipo</label>
        <div class="badge ${type === 'income' ? 'badge-income' : 'badge-expense'}" style="display:inline-block">
          ${type === 'income' ? '📥 Entrata' : '📤 Uscita'}
          ${isChild ? '(ereditato dal parent)' : ''}
        </div>
      </div>
      <div class="form-group" style="grid-column:1/-1">
        <label class="form-label">Categoria principale (opzionale)</label>
        <select id="c_parent" class="form-control">
          <option value="">— Nessuna (categoria principale) —</option>
          ${parentOpts}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Nome *</label>
        <input id="c_name" class="form-control" value="${cat?.name ?? ''}" placeholder="es. Supermercato">
      </div>
      <div class="form-group" style="grid-column:1/-1">
        <label class="form-label">Icona</label>
        <input type="hidden" id="c_icon" value="${cat?.icon ?? '📁'}">
        <div id="iconPickerWrap"></div>
      </div>
      <div class="form-group">
        <label class="form-label">Colore</label>
        <input id="c_color" type="color" class="form-color-tx" value="${cat?.color ?? '#58a6ff'}">
      </div>
      <div class="form-group" style="grid-column:1/-1">
        <label class="form-label" style="display:flex;align-items:center;gap:8px;cursor:pointer">
          <input id="c_excluded" type="checkbox" ${cat?.excluded_from_budget ? 'checked' : ''} style="width:auto;margin:0">
          🚫 Escludi da budget e report
        </label>
        <div style="font-size:11px;color:var(--txt3);margin-top:4px">
          Le transazioni di questa categoria restano visibili e muovono il saldo del conto, ma non vengono conteggiate in budget, report, dashboard e previsioni. Utile ad es. per l'addebito del capital gain.
        </div>
      </div>
      ${type === 'expense' ? `
      <div class="form-group" style="grid-column:1/-1">
        <label class="form-label">Natura spesa</label>
        <input type="hidden" id="c_nature" value="${cat?.expense_nature ?? ''}">
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${[['','⬜ Non classif.','var(--txt3)'],['essenziale','🟢 Essenziale','#3fb950'],['variabile','🟡 Variabile','#e3b341'],['superflua','🔴 Superflua','#f85149']].map(([v,l,c]) => `
            <button type="button" class="pill-nature ${effectiveNature===v?'active':''}"
              data-nature="${v}" style="--nc:${c}"
              onclick="document.querySelectorAll('.pill-nature').forEach(b=>b.classList.remove('active'));this.classList.add('active');document.getElementById('c_nature').value=this.dataset.nature">
              ${l}
            </button>`).join('')}
        </div>
        ${inheritedNature && !cat?.expense_nature ? `<div style="font-size:11px;color:var(--txt3);margin-top:4px">↑ Ereditata dal parent — seleziona un'altra opzione per sovrascrivere</div>` : ''}
      </div>` : ''}
    </div>
  `, async () => {
    const data = {
      name:           document.getElementById('c_name').value.trim(),
      type,
      icon:           document.getElementById('c_icon').value || '📁',
      color:          document.getElementById('c_color').value,
      parent_id:      document.getElementById('c_parent').value
                        ? parseInt(document.getElementById('c_parent').value) : null,
      expense_nature: document.getElementById('c_nature')?.value || null,
      excluded_from_budget: document.getElementById('c_excluded')?.checked ? 1 : 0,
    };
    if (!data.name) { toast('Inserisci un nome', 'error'); return false; }
    try {
      if (isEdit) { data.id = cat.id; await api.updateCategory(data); toast('Categoria aggiornata'); }
      else        { await api.addCategory(data); toast('Categoria creata'); }
      closeModal();
      renderCategories();
    } catch(e) { toast(e.message, 'error'); return false; }
  });
  setTimeout(() => _iconPickerBuild('iconPickerWrap', cat?.icon ?? '📁'), 30);
}
