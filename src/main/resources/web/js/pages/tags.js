/* ═══════════════════════════════════════════════════════════════════════════
   LucaMoneyManager — pages/tags.js
   Pagina Tag (estratta da app.js, stadio 5a del refactor)
═══════════════════════════════════════════════════════════════════════════ */

// Markup di una singola riga tag (anteprima, colore, lucchetto se di sistema, azioni).
function _tagMgmtRow(t) {
  return `
    <div class="tag-mgmt-row">
      <span class="tag-inline" style="--tc:${t.color};font-size:13px;padding:4px 10px">${t.name}</span>
      <span class="text-muted" style="font-size:11px;margin-left:8px">${t.color}</span>
      ${t.is_system ? '<span class="text-muted" style="font-size:11px;margin-left:4px" title="Tag di sistema">🔒</span>' : ''}
      <div style="margin-left:auto;display:flex;gap:4px">
        <button class="btn btn-ghost btn-icon" onclick="editTagMgmt(${t.id})">✏️</button>
        ${t.is_system ? '' : `<button class="btn btn-ghost btn-icon" onclick="deleteTagMgmt(${t.id})">🗑️</button>`}
      </div>
    </div>`;
}

// Disegna la pagina Tag: due tabelle separate (tag utente e tag di sistema),
// con colore, lucchetto sui tag di sistema e azioni.
async function renderTags() {
  const pg = document.getElementById('pg-tags');
  const tags = await api.getTags();
  const userTags   = tags.filter(t => !t.is_system);
  const systemTags = tags.filter(t => t.is_system);

  pg.innerHTML = `
    <div style="max-width:700px">
    <div class="section-header">
      <h2 class="section-title">Tag</h2>
      <button class="btn btn-primary" id="btnAddTag">+ Nuovo tag</button>
    </div>

    <h3 class="section-subtitle">Tag personali</h3>
    <div class="card">
      ${userTags.length
        ? `<div class="tags-mgmt-list">${userTags.map(_tagMgmtRow).join('')}</div>`
        : `<p class="text-muted" style="text-align:center;padding:30px">Nessun tag personale. Creane uno cliccando "+ Nuovo tag".</p>`}
    </div>

    <h3 class="section-subtitle" style="margin-top:18px">Tag di sistema 🔒</h3>
    <div class="card">
      ${systemTags.length
        ? `<div class="tags-mgmt-list">${systemTags.map(_tagMgmtRow).join('')}</div>`
        : `<p class="text-muted" style="text-align:center;padding:30px">Nessun tag di sistema.</p>`}
    </div>
    </div>`;

  document.getElementById('btnAddTag').onclick = () => showTagModal(null);
}

// Modale crea/modifica tag (nome + colore) con anteprima live; tag=null → nuovo.
function showTagModal(tag) {
  const isEdit = !!tag;
  const body = `
    <div class="form-group">
      <label class="form-label">Nome</label>
      <input class="form-control" id="tg_name" value="${tag?.name||''}" placeholder="Es. Vacanza, Lavoro...">
    </div>
    <div class="form-group">
      <label class="form-label">Colore</label>
      <div style="display:flex;align-items:center;gap:10px">
        <input type="color" id="tg_color" value="${tag?.color||'#58a6ff'}" class="color-input-sm" style="width:50px;height:34px">
        <span class="tag-inline" id="tg_preview" style="--tc:${tag?.color||'#58a6ff'}">${tag?.name||'Anteprima'}</span>
      </div>
    </div>`;
  openModal(isEdit ? 'Modifica Tag' : 'Nuovo Tag', body, async () => {
    const name  = document.getElementById('tg_name').value.trim();
    const color = document.getElementById('tg_color').value;
    if (!name) { toast('Inserisci un nome', 'error'); return; }
    try {
      if (isEdit) await api.updateTag({id: tag.id, name, color});
      else        await api.addTag({name, color});
      closeModal();
      toast(isEdit ? 'Tag aggiornato' : 'Tag aggiunto');
      renderTags();
    } catch(e) { toast(e.message, 'error'); }
  });
  // Live preview
  setTimeout(() => {
    const nameEl  = document.getElementById('tg_name');
    const colorEl = document.getElementById('tg_color');
    const prev    = document.getElementById('tg_preview');
    if (!nameEl || !colorEl || !prev) return;
    nameEl.oninput  = () => { prev.textContent = nameEl.value || 'Anteprima'; };
    colorEl.oninput = () => { prev.style.setProperty('--tc', colorEl.value); };
  }, 50);
}

// Apre il modale di modifica per il tag con l'id dato.
window.editTagMgmt = async id => {
  const tags = await api.getTags();
  showTagModal(tags.find(t => t.id === id));
};

// Elimina un tag previa conferma (lo rimuove da tutte le transazioni).
window.deleteTagMgmt = async id => {
  const ok = await confirm('Elimina tag', 'Eliminare questo tag? Verrà rimosso da tutte le transazioni.');
  if (!ok) return;
  try {
    await api.deleteTag(id);
    toast('Tag eliminato');
    renderTags();
  } catch(e) { toast(e.message, 'error'); }
};
