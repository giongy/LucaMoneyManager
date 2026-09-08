/* ═══════════════════════════════════════════════════════════════════════════
   LucaMoneyManager — pages/categories.js
   Pagina Categorie (estratta da app.js, stadio 5c del refactor)
═══════════════════════════════════════════════════════════════════════════ */

// _iconPickerBuild è definito in app.js (riga ~112): risolto lazy a runtime.

// Filtro attivo nella pagina: uno per volta, come le barre di Portafoglio e Storico.
// Sono facce diverse dello stesso elenco, non condizioni da combinare: una sottocategoria
// Android e una esclusa da budget non si sovrappongono quasi mai, e metterle in AND darebbe
// quasi sempre zero risultati. Sopravvive ai re-render, così marcare un 📱 dopo l'altro non
// rimanda ogni volta all'elenco completo.
//   'all' | 'mobile' | 'excluded' | 'portfolio' | 'unused'
//   'nat:essenziale' | 'nat:variabile' | 'nat:superflua' | 'nat:'  (senza natura)
let _catFilter = 'all';

function _setCatFilter(f) {
  _catFilter = f;
  renderCategories();
}

// Natura EFFETTIVA: le sottocategorie senza natura propria ereditano quella del parent (è così
// che la mostra la lista e che la contano i report). Filtrare sulla sola colonna lascerebbe
// fuori proprio le figlie, che sono la maggioranza.
function _catNature(c) {
  return c.expense_nature || c.parent_expense_nature || '';
}

// Riga di cortesia quando un filtro non trova niente: senza, la sezione resta un vuoto muto
// e non si capisce se il filtro non ha trovato nulla o se il render è fallito.
function _catEmpty() {
  return `<div class="settings-hint" style="padding:10px 2px">Nessuna categoria con questo filtro.</div>`;
}

// Badge delle categorie in cui scrive il portafoglio. È **permanente**: quali categorie siano
// coinvolte nelle operazioni su titoli non si ricava in nessun altro modo dalla lista — la
// system_key non è esposta e il nome non conta più nulla (v25), quindi senza badge l'unico modo
// per saperlo sarebbe provare a eliminarle e leggere l'avviso.
// ⚠️ Non è un lucchetto e non è un avviso: restano categorie normali, che si rinominano, si
// spostano e si eliminano come le altre. Dice soltanto che lì dentro scrive qualcuno, e il
// tooltip dice cosa. Le CONSEGUENZE di toccarle restano nei modali (modifica ed eliminazione),
// dove servono davvero.
function _sysBadge(c) {
  const what = SYSTEM_CAT_LABEL[c.system_key];
  if (!what) return '';
  return `<span class="badge" style="background:#d2992222;color:#d29922;font-size:10px"
                title="Categoria del portafoglio: qui l'app registra ${what}">📈</span>`;
}

// Disegna la pagina Categorie ad albero: parent con sottocategorie, separate per Uscite/Entrate
// e la categoria speciale Trasferimento (non modificabile).
async function renderCategories() {
  const pg = document.getElementById('pg-categories');
  const cats = await api.getCategories();

  // Separa categorie speciali, parent e figlie
  const transfer = cats.find(c => c.type === 'transfer');
  const parents  = cats.filter(c => !c.parent_id && c.type !== 'transfer');
  const children = cats.filter(c => c.parent_id);

  function childrenOf(parentId) {
    return children.filter(c => c.parent_id === parentId);
  }

  // Quante sottocategorie sono marcate per Android: se sono zero l'app mostra tutto
  // (vedi DbHelper.getSubCategories), e il messaggio in cima alla pagina lo dice.
  const mobileTotal = children.filter(c => c.mobile_favorite).length;

  // ── Filtri ────────────────────────────────────────────────────────────────
  // Una categoria principale è "mai usata" solo se non lo è nemmeno una sua figlia: i movimenti
  // stanno quasi sempre sulle figlie, e senza questa condizione ogni parent risulterebbe vuoto.
  const isUnused = c => (c.usage_count || 0) === 0
                     && childrenOf(c.id).every(k => (k.usage_count || 0) === 0);

  const matchesFilter = c => {
    if (_catFilter === 'all')       return true;
    if (_catFilter === 'mobile')    return !!c.mobile_favorite;
    if (_catFilter === 'excluded')  return !!c.excluded_from_budget;
    if (_catFilter === 'portfolio') return !!c.system_key;
    if (_catFilter === 'unused')    return isUnused(c);
    if (_catFilter.startsWith('nat:'))
      return c.type === 'expense' && _catNature(c) === _catFilter.slice(4);
    return true;
  };
  const filtering = _catFilter !== 'all';
  const isNatureFilter = _catFilter.startsWith('nat:');

  // Conteggi sui bottoni: servono a decidere se vale la pena cliccare, e a vedere a colpo
  // d'occhio quante categorie sono marcate in un modo o nell'altro.
  const notTransfer = cats.filter(c => c.type !== 'transfer');
  const nMobile    = mobileTotal;
  const nExcluded  = notTransfer.filter(c => c.excluded_from_budget).length;
  const nPortfolio = notTransfer.filter(c => c.system_key).length;
  const nUnused    = notTransfer.filter(isUnused).length;
  const nNature    = n => notTransfer.filter(c => c.type === 'expense' && _catNature(c) === n).length;

  const filtroBtn = (key, label, count, title) => `
    <button class="btn theme-btn ${_catFilter === key ? 'theme-btn-active' : ''}"
            onclick="_setCatFilter('${key}')" title="${title}">
      ${label}${count != null ? ` <span style="opacity:.65">${count}</span>` : ''}
    </button>`;

  // Renderizza una lista di categorie parent con le rispettive sottocategorie annidate.
  // Col filtro attivo la principale resta visibile anche se non corrisponde lei stessa: senza
  // il suo rigo la figlia trovata comparirebbe senza contesto, e "Benzina" da sola non dice
  // sotto quale ramo sta. Delle sottocategorie si mostrano invece solo quelle che passano.
  function renderTree(list) {
    return list.map(p => {
      const allKids = childrenOf(p.id);
      const kids    = filtering ? allKids.filter(matchesFilter) : allKids;
      if (filtering && !kids.length && !matchesFilter(p)) return '';
      const isTransfer = p.type === 'transfer';
      const mobileKids = allKids.filter(k => k.mobile_favorite).length;
      const hiddenKids = allKids.length - kids.length;
      return `
        <div class="cat-parent">
          <div class="cat-row cat-parent-row">
            <span class="cat-icon" style="background:${esc(p.color)}22;color:${esc(p.color)}">${esc(p.icon)}</span>
            <span class="cat-color-dot" style="background:${esc(p.color)}" title="${esc(p.color)}"></span>
            <span class="cat-name">${esc(p.name)}</span>
            ${p.expense_nature ? `<span class="nature-badge nature-${p.expense_nature}">${{essenziale:'🟢 Essenziale',variabile:'🟡 Variabile',superflua:'🔴 Superflua'}[p.expense_nature]||''}</span>` : ''}
            ${p.excluded_from_budget ? `<span class="badge" style="background:var(--txt3);color:#fff;font-size:10px" title="Esclusa da budget, report, dashboard e previsioni">🚫 Esclusa</span>` : ''}
            ${mobileKids ? `<span class="badge" style="background:#3fb95022;color:#3fb950;font-size:10px" title="${mobileKids} sottocategorie proposte dall'app Android">📱 ${mobileKids}</span>` : ''}
            ${_sysBadge(p)}
            ${_catFilter === 'unused' && isUnused(p) ? `<span class="badge" style="background:var(--bg3);color:var(--txt3);font-size:10px" title="Nessun movimento su questa categoria né sulle sue sottocategorie">0 movimenti</span>` : ''}
            <span class="cat-sub-count">${hiddenKids ? `${kids.length} di ${allKids.length}` : kids.length} sottocategorie</span>
            <div class="cat-actions">
              ${!isTransfer ? `
                <!-- ＋ a tutta larghezza (U+FF0B) e non "+": qui il bottone è solo icona e sta
                     accanto a due emoji (✏️ 🗑️), che sono larghe il doppio di un "+" ASCII —
                     il segno normale resterebbe minuscolo e fuori asse. Nei bottoni con testo
                     si usa invece il "+" normale, che è la convenzione del resto dell'app. -->
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
                  <span class="cat-icon" style="background:${esc(k.color)}22;color:${esc(k.color)}">${esc(k.icon)}</span>
                  <span class="cat-color-dot" style="background:${esc(k.color)}" title="${esc(k.color)}"></span>
                  <span class="cat-name">${esc(k.name)}</span>
                  ${(() => { const n = k.expense_nature || k.parent_expense_nature; const inh = !k.expense_nature && n; return n ? `<span class="nature-badge nature-${n}" title="${inh?'ereditata dal parent':''}">${{essenziale:'🟢',variabile:'🟡',superflua:'🔴'}[n]||''}${inh?' ↑':''}</span>` : ''; })()}
                  ${k.excluded_from_budget ? `<span class="badge" style="background:var(--txt3);color:#fff;font-size:10px" title="Esclusa da budget, report, dashboard e previsioni">🚫</span>` : ''}
                  ${_sysBadge(k)}
                  ${_catFilter === 'unused' ? `<span class="badge" style="background:var(--bg3);color:var(--txt3);font-size:10px" title="Nessun movimento in questa categoria">0 movimenti</span>` : ''}
                  <div class="cat-actions">
                    <button class="btn btn-ghost btn-icon cat-mobile-btn ${k.mobile_favorite ? 'active' : ''}"
                            onclick="toggleCategoryMobile(${k.id}, ${k.mobile_favorite ? 0 : 1})"
                            title="${k.mobile_favorite ? 'Proposta dall\'app Android — clicca per toglierla' : 'Non proposta dall\'app Android — clicca per aggiungerla'}">📱</button>
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
    <div class="section-header">
      <h2 class="section-title">Categorie</h2>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" onclick="addMainCategory('expense')">+ Uscita</button>
        <button class="btn btn-secondary" onclick="addMainCategory('income')">+ Entrata</button>
      </div>
    </div>

    <div class="settings-hint" style="margin:0 0 14px">
      📱 sulle sottocategorie = proposta dall'app Android in inserimento.
      ${mobileTotal
        ? `Ne hai marcate <b>${mobileTotal}</b>: sul telefono compaiono solo quelle.`
        : `Nessuna marcata: sul telefono compaiono <b>tutte</b> le sottocategorie.`}
    </div>

    <!-- Barra filtri: due gruppi, un solo filtro attivo per volta. Il primo raccoglie i
         contrassegni (Android, esclusione da budget, portafoglio, mai usate), il secondo la
         natura della spesa — che esiste solo sulle uscite, quindi lì le entrate spariscono. -->
    <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 14px">
      <div class="theme-toggle-group" style="margin:0;flex-wrap:wrap">
        ${filtroBtn('all',       'Tutte',        null,       'Mostra tutte le categorie')}
        ${filtroBtn('mobile',    '📱 Android',   nMobile,    'Sottocategorie proposte dall\'app Android in inserimento')}
        ${filtroBtn('excluded',  '🚫 Escluse',   nExcluded,  'Escluse da budget, report, dashboard e previsioni')}
        ${filtroBtn('portfolio', '📈 Portafoglio', nPortfolio, 'Categorie in cui l\'app registra plusvalenze, minusvalenze, imposte e cedole')}
        ${filtroBtn('unused',    '💤 Mai usate', nUnused,    'Nessun movimento, né qui né nelle sottocategorie: si possono eliminare senza spostare niente')}
      </div>
      <div class="theme-toggle-group" style="margin:0;flex-wrap:wrap">
        ${filtroBtn('nat:essenziale', '🟢 Essenziali',  nNature('essenziale'), 'Uscite di natura essenziale (natura ereditata dal parent inclusa)')}
        ${filtroBtn('nat:variabile',  '🟡 Variabili',   nNature('variabile'),  'Uscite di natura variabile (natura ereditata dal parent inclusa)')}
        ${filtroBtn('nat:superflua',  '🔴 Superflue',   nNature('superflua'),  'Uscite di natura superflua (natura ereditata dal parent inclusa)')}
        ${filtroBtn('nat:',           '⬜ Senza natura', nNature(''),          'Uscite a cui non è stata assegnata una natura, nemmeno tramite il parent')}
      </div>
    </div>

    <h3 class="section-subtitle">📤 Uscite</h3>
    <div class="cats-list" id="catsExpense">
      ${renderTree(parents.filter(p => p.type === 'expense')) || _catEmpty()}
    </div>

    <h3 class="section-subtitle" style="margin-top:24px">📥 Entrate</h3>
    <div class="cats-list" id="catsIncome">
      ${renderTree(parents.filter(p => p.type === 'income'))
        || (isNatureFilter
             ? `<div class="settings-hint" style="padding:10px 2px">La natura della spesa riguarda solo le uscite.</div>`
             : _catEmpty())}
    </div>

    ${transfer && !filtering ? `
    <h3 class="section-subtitle" style="margin-top:24px">🔁 Speciale</h3>
    <div class="cats-list">
      <div class="cat-parent">
        <div class="cat-row cat-parent-row">
          <span class="cat-icon" style="background:${esc(transfer.color)}22;color:${esc(transfer.color)}">${esc(transfer.icon)}</span>
          <span class="cat-name">${esc(transfer.name)}</span>
          <span class="settings-hint">Categoria di sistema, non modificabile</span>
        </div>
      </div>
    </div>` : ''}
    </div>`;
}

// Accende/spegne il flag "proposta dall'app Android" su una sottocategoria, direttamente
// dalla lista: marcarne una decina dal modale sarebbe inutilmente lento.
async function toggleCategoryMobile(id, on) {
  try {
    await api.setCategoryMobile(id, !!on);
    renderCategories();
  } catch(e) { toast(e.message, 'error'); }
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

// Cosa registra l'app in ciascuna categoria marcata da una system_key (v25). Serve solo a
// dirlo in italiano nei modali: l'identità vera è la chiave, che sta nel DB.
const SYSTEM_CAT_LABEL = {
  plusvalenze:      'le plusvalenze delle vendite in utile',
  minusvalenze:     'le minusvalenze delle vendite in perdita',
  imposte_rendite:  'le imposte sul capital gain',
  cedole_dividendi: 'le cedole e i dividendi'
};

// Le categorie con chiave coinvolte nell'eliminazione: quella scelta e le sue figlie, che la
// CASCADE su parent_id porterebbe via insieme a lei.
function systemCatsInvolved(cat, allCats) {
  return [cat, ...allCats.filter(c => c.parent_id === cat.id)]
    .filter(c => c.system_key && SYSTEM_CAT_LABEL[c.system_key]);
}

// Elimina una categoria: conferma semplice se inutilizzata, altrimenti chiede su quale
// categoria spostare transazioni/budget/sottocategorie prima di eliminarla.
async function deleteCategory(id) {
  const [usage, allCats] = await Promise.all([api.getCategoryUsage(id), api.getCategories()]);
  const cat = allCats.find(c => c.id === id);
  if (!cat) return;
  const sysCats = systemCatsInvolved(cat, allCats);
  const sysWhat = sysCats.map(c => SYSTEM_CAT_LABEL[c.system_key]).join(' e ');

  const totalTx = (usage.tx_count || 0) + (usage.child_tx_count || 0);
  const hasBudget = (usage.budget_count || 0) > 0;
  const hasChildren = (usage.child_count || 0) > 0;
  // Split e pianificate contano quanto le transazioni: sono importi veri nei report per
  // categoria. Senza questi due, una categoria usata SOLO come riga di split risultava
  // "inutilizzata" e veniva eliminata con la conferma semplice, senza riassegnare nulla.
  const splitCount = usage.split_count || 0;
  const schedCount = usage.scheduled_count || 0;

  // Nessun uso → semplice conferma
  if (totalTx === 0 && splitCount === 0 && schedCount === 0 && !hasBudget && !hasChildren) {
    openModal('Elimina categoria',
      `<p style="margin:0">Eliminare <b>${esc(cat.icon)} ${esc(cat.name)}</b>?</p>
       ${sysCats.length ? `
       <div class="settings-hint" style="margin-top:10px">
         📈 Qui l'app registra <b>${sysWhat}</b>. La categoria è vuota, quindi non si perde niente:
         verrà ricreata da sola alla prossima operazione su titoli.
       </div>` : ''}`,
      async () => {
        await api.deleteCategory(id); closeModal();
        toast('Categoria eliminata'); renderCategories();
      }, 'Elimina', 'btn-danger');
    return;
  }

  // Ha dipendenze → proponi spostamento
  const descParts = [];
  if (totalTx > 0)      descParts.push(`${totalTx} transazion${totalTx===1?'e':'i'}`);
  if (splitCount > 0)   descParts.push(`${splitCount} voc${splitCount===1?'e':'i'} suddivis${splitCount===1?'a':'e'}`);
  if (schedCount > 0)   descParts.push(`${schedCount} pianificat${schedCount===1?'a':'e'}`);
  if (hasBudget)   descParts.push(`${usage.budget_count} voc${usage.budget_count===1?'e':'i'} di budget`);
  if (hasChildren) descParts.push(`${usage.child_count} sottocategor${usage.child_count===1?'ia':'ie'}`);

  // Categorie disponibili per lo spostamento (stesso tipo, esclude questa e i suoi figli)
  const childIds = new Set(allCats.filter(c => c.parent_id === id).map(c => c.id));
  const targets = allCats.filter(c =>
    c.id !== id && !childIds.has(c.id) && c.type === cat.type && c.type !== 'transfer'
  );
  const opts = targets.map(c =>
    `<option value="${c.id}">${c.parent_id ? '  └ ' : ''}${esc(c.icon)} ${esc(c.name)}</option>`
  ).join('');

  openModal('Elimina categoria',
    `<p style="margin-bottom:12px">
       <b>${esc(cat.icon)} ${esc(cat.name)}</b> è usata da: <b>${descParts.join(', ')}</b>.<br>
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
     </div>
     ${sysCats.length ? `
     <div class="settings-hint" style="margin-top:10px;padding:8px 10px;border-radius:6px;background:var(--bg3)">
       📈 Qui l'app registra <b>${sysWhat}</b>: d'ora in poi le registrerà sulla categoria che scegli,
       insieme a quelle già inserite. Non ne ricrea una nuova.
       <div id="del_sys_warn" style="margin-top:6px;color:var(--expense)"></div>
     </div>` : ''}`,
    async () => {
      const toId = parseInt(document.getElementById('del_target').value);
      if (!toId) { toast('Seleziona una categoria di destinazione', 'error'); return false; }
      await api.reassignCategory({from_id: id, to_id: toId});
      closeModal(); toast('Categoria eliminata e transazioni spostate'); renderCategories();
    }, 'Sposta ed elimina', 'btn-danger');

  // Avviso reattivo: spostare movimenti esclusi da budget su una categoria NON esclusa li
  // rimette dentro medie, previsioni e Salute Finanziaria. È l'unica conseguenza davvero
  // difficile da notare a posteriori, quindi la si dice al momento della scelta.
  if (sysCats.length && sysCats.some(c => c.excluded_from_budget)) {
    const sel = document.getElementById('del_target');
    const warn = document.getElementById('del_sys_warn');
    if (sel && warn) sel.onchange = () => {
      const dest = targets.find(c => c.id === parseInt(sel.value));
      warn.innerHTML = dest && !dest.excluded_from_budget
        ? `⚠️ <b>${esc(dest.name)}</b> non è esclusa da budget e report: spostandoceli, questi
           movimenti entreranno in medie, previsioni e Salute Finanziaria.`
        : '';
    };
  }
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
    `<option value="${p.id}" ${pId === p.id ? 'selected' : ''}>${esc(p.icon)} ${esc(p.name)}</option>`
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
        <input id="c_name" class="form-control" value="${esc(cat?.name ?? '')}" placeholder="es. Supermercato">
      </div>
      <div class="form-group" style="grid-column:1/-1">
        <label class="form-label">Icona</label>
        <input type="hidden" id="c_icon" value="${esc(cat?.icon ?? '📁')}">
        <div id="iconPickerWrap"></div>
      </div>
      <div class="form-group">
        <label class="form-label">Colore</label>
        <input id="c_color" type="color" class="form-color-tx" value="${esc(cat?.color ?? '#58a6ff')}">
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
      ${cat?.system_key && SYSTEM_CAT_LABEL[cat.system_key] ? `
      <div class="form-group" style="grid-column:1/-1">
        <div class="settings-hint" style="padding:9px 11px;border-radius:6px;background:var(--bg3);line-height:1.5">
          📈 Qui l'app registra <b>${SYSTEM_CAT_LABEL[cat.system_key]}</b>.
          Puoi rinominarla, spostarla sotto un'altra categoria o cambiarle icona e colore
          <b>senza rompere niente</b>: il collegamento non è il nome.
          ${cat.system_key === 'cedole_dividendi'
            ? 'Questa resta dentro budget e previsioni di proposito: le rendite sono ricorrenti e si pianificano.'
            : 'Togliendo la spunta qui sopra, questi movimenti entreranno in medie, previsioni e Salute Finanziaria — sono eventi di capitale, di solito è meglio tenerli fuori.'}
        </div>
      </div>` : ''}
      ${isChild ? `
      <div class="form-group" style="grid-column:1/-1">
        <label class="form-label" style="display:flex;align-items:center;gap:8px;cursor:pointer">
          <input id="c_mobile" type="checkbox" ${cat?.mobile_favorite ? 'checked' : ''} style="width:auto;margin:0">
          📱 Usabile dall'app Android
        </label>
        <div style="font-size:11px;color:var(--txt3);margin-top:4px">
          Nell'inserimento da telefono compaiono solo le sottocategorie marcate così — l'elenco resta
          corto e la spesa si registra in pochi tocchi. Se non ne marchi nessuna, l'app le mostra tutte.
        </div>
      </div>` : ''}
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
      // La casella c'è solo sulle sottocategorie: senza di essa si conserva il valore attuale,
      // altrimenti modificare una categoria principale azzererebbe un flag messo altrove.
      mobile_favorite: document.getElementById('c_mobile')
                         ? (document.getElementById('c_mobile').checked ? 1 : 0)
                         : (cat?.mobile_favorite ? 1 : 0),
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
