/* ═══════════════════════════════════════════════════════════════════════════
   LucaMoneyManager — pages/notes.js
   Pagina Note: griglia "post-it" + editor rich text Quill in modale
═══════════════════════════════════════════════════════════════════════════ */

// Palette colori (vuoto = nessun colore, usa --bg2 puro)
const NOTE_COLORS = [
  { key: '',         label: 'Nessuno' },
  { key: '#fff3a0',  label: 'Giallo'  },
  { key: '#a8e6cf',  label: 'Verde'   },
  { key: '#b3d4fc',  label: 'Blu'     },
  { key: '#f4b3c2',  label: 'Rosa'    },
  { key: '#d4a5ff',  label: 'Viola'   },
  { key: '#ffd6a5',  label: 'Arancio' },
];

let _notesState = { search: '', tagFilter: null };
let _quill = null;            // istanza Quill attiva nel modale
let _editingNote = null;      // nota in editing (null = nuova)

// Disegna la pagina Note: barra ricerca + filtro tag + griglia di card "post-it"; collega gli handler.
async function renderNotes() {
  const pg = document.getElementById('pg-notes');
  const [notes, tags] = await Promise.all([api.getNotes(), api.getTags()]);
  const tagMap = Object.fromEntries(tags.map(t => [t.id, t]));

  // Filtro
  const q = _notesState.search.trim().toLowerCase();
  const tf = _notesState.tagFilter;
  const filtered = notes.filter(n => {
    if (tf != null && !(n.tag_ids || []).includes(tf)) return false;
    if (!q) return true;
    const plain = _stripHtml(n.content).toLowerCase();
    return (n.title || '').toLowerCase().includes(q) || plain.includes(q);
  });

  pg.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">Note</h2>
      <div style="display:flex;gap:8px;align-items:center">
        <input class="form-control" id="notesSearch" placeholder="🔍 Cerca…"
               style="width:240px;height:32px" value="${_escAttr(_notesState.search)}">
        <button class="btn btn-primary" id="btnAddNote">+ Nuova nota</button>
      </div>
    </div>

    ${tags.length ? `
      <div class="notes-tagbar">
        <button class="notes-tagchip ${tf == null ? 'active' : ''}" data-tag="">Tutti</button>
        ${tags.map(t => `
          <button class="notes-tagchip ${tf === t.id ? 'active' : ''}" data-tag="${t.id}"
                  style="--tc:${t.color}">${_esc(t.name)}</button>`).join('')}
      </div>` : ''
    }

    ${filtered.length ? `
      <div class="notes-grid">
        ${filtered.map(n => _renderNoteCard(n, tagMap)).join('')}
      </div>` :
      `<div class="card" style="text-align:center;padding:48px;color:var(--txt3)">
         ${notes.length === 0
            ? 'Nessuna nota. Clicca "+ Nuova nota" per iniziare.'
            : 'Nessuna nota corrisponde al filtro.'}
       </div>`
    }
  `;

  document.getElementById('btnAddNote').onclick = () => showNoteEditor(null);
  const srch = document.getElementById('notesSearch');
  srch.oninput = () => {
    _notesState.search = srch.value;
    // ri-rendering soft (solo griglia) per non perdere il focus
    _renderGridOnly(notes, tags, tagMap);
  };
  pg.querySelectorAll('.notes-tagchip').forEach(el => {
    el.onclick = () => {
      const v = el.dataset.tag;
      _notesState.tagFilter = v === '' ? null : parseInt(v);
      renderNotes();
    };
  });
  pg.querySelectorAll('.note-card').forEach(el => {
    const id = parseInt(el.dataset.id);
    el.onclick = e => {
      if (e.target.closest('.note-pin') || e.target.closest('.note-card-actions')) return;
      showNoteEditor(notes.find(n => n.id === id));
    };
  });
  pg.querySelectorAll('.note-pin').forEach(el => {
    el.onclick = async e => {
      e.stopPropagation();
      const id = parseInt(el.closest('.note-card').dataset.id);
      const n  = notes.find(x => x.id === id);
      await api.setNotePinned(id, !n.pinned);
      renderNotes();
    };
  });
  pg.querySelectorAll('.note-del').forEach(el => {
    el.onclick = async e => {
      e.stopPropagation();
      const id = parseInt(el.closest('.note-card').dataset.id);
      const ok = await confirm('Elimina nota', 'Eliminare questa nota? L\'azione non è annullabile.');
      if (!ok) return;
      await api.deleteNote(id);
      toast('Nota eliminata');
      renderNotes();
    };
  });
}

// Ridisegna solo la griglia (durante la digitazione nella ricerca) per non perdere il focus dell'input.
function _renderGridOnly(notes, tags, tagMap) {
  const q = _notesState.search.trim().toLowerCase();
  const tf = _notesState.tagFilter;
  const filtered = notes.filter(n => {
    if (tf != null && !(n.tag_ids || []).includes(tf)) return false;
    if (!q) return true;
    const plain = _stripHtml(n.content).toLowerCase();
    return (n.title || '').toLowerCase().includes(q) || plain.includes(q);
  });
  const grid = document.querySelector('#pg-notes .notes-grid');
  if (!grid) { renderNotes(); return; }
  grid.innerHTML = filtered.map(n => _renderNoteCard(n, tagMap)).join('');
  // ricollega handler
  grid.querySelectorAll('.note-card').forEach(el => {
    const id = parseInt(el.dataset.id);
    el.onclick = e => {
      if (e.target.closest('.note-pin') || e.target.closest('.note-card-actions')) return;
      showNoteEditor(notes.find(n => n.id === id));
    };
  });
  grid.querySelectorAll('.note-pin').forEach(el => {
    el.onclick = async e => {
      e.stopPropagation();
      const id = parseInt(el.closest('.note-card').dataset.id);
      const n  = notes.find(x => x.id === id);
      await api.setNotePinned(id, !n.pinned);
      renderNotes();
    };
  });
  grid.querySelectorAll('.note-del').forEach(el => {
    el.onclick = async e => {
      e.stopPropagation();
      const id = parseInt(el.closest('.note-card').dataset.id);
      const ok = await confirm('Elimina nota', 'Eliminare questa nota? L\'azione non è annullabile.');
      if (!ok) return;
      await api.deleteNote(id);
      toast('Nota eliminata');
      renderNotes();
    };
  });
}

// HTML di una singola card nota: titolo, snippet di testo, tag e data (pin/colore opzionali).
function _renderNoteCard(n, tagMap) {
  const snippet = _stripHtml(n.content).slice(0, 220);
  const colorStyle = n.color ? `style="--note-color:${n.color}"` : '';
  const date = n.updated_at ? _formatNoteDate(n.updated_at) : '';
  const tagIds = n.tag_ids || [];
  return `
    <div class="note-card ${n.color ? 'has-color' : ''} ${n.pinned ? 'pinned' : ''}"
         data-id="${n.id}" ${colorStyle}>
      <div class="note-card-head">
        <div class="note-title">${_esc(n.title || 'Senza titolo')}</div>
        <button class="note-pin" title="${n.pinned ? 'Rimuovi pin' : 'Fissa in cima'}">
          ${n.pinned ? '★' : '☆'}
        </button>
      </div>
      <div class="note-snippet">${_esc(snippet) || '<span class="note-empty">(vuota)</span>'}</div>
      <div class="note-card-foot">
        <div class="note-tags-row">
          ${tagIds.slice(0,4).map(id => {
            const t = tagMap[id]; if (!t) return '';
            return `<span class="tag-inline" style="--tc:${t.color};font-size:10px;padding:2px 7px">${_esc(t.name)}</span>`;
          }).join('')}
          ${tagIds.length > 4 ? `<span class="note-tags-more">+${tagIds.length-4}</span>` : ''}
        </div>
        <div class="note-card-actions">
          <span class="note-date">${date}</span>
          <button class="note-del" title="Elimina nota">🗑</button>
        </div>
      </div>
    </div>`;
}

// Apre il modale editor nota (titolo, colore, pin, tag, corpo Quill); note=null → nuova nota.
function showNoteEditor(note) {
  _editingNote = note;
  api.getTags().then(tags => {
    const selectedIds = new Set(note?.tag_ids || []);
    const currentColor = note?.color || '';
    const body = `
      <div class="note-editor">
        <input class="note-editor-title" id="noteTitle" placeholder="Titolo…"
               value="${_escAttr(note?.title || '')}">

        <div class="note-editor-bar">
          <div class="note-color-row" id="noteColorRow">
            ${NOTE_COLORS.map(c => `
              <button class="note-color-dot ${currentColor === c.key ? 'active' : ''}"
                      data-color="${c.key}" title="${c.label}"
                      style="${c.key ? `background:${c.key}` : ''}">
                ${c.key ? '' : '∅'}
              </button>`).join('')}
          </div>

          <label class="note-pin-toggle">
            <input type="checkbox" id="notePinned" ${note?.pinned ? 'checked' : ''}>
            <span>★ Fissa in cima</span>
          </label>
        </div>

        ${tags.length ? `
          <div class="note-tags-picker" id="noteTagsPicker">
            ${tags.map(t => `
              <button class="notes-tagchip ${selectedIds.has(t.id) ? 'active' : ''}"
                      data-tag="${t.id}" style="--tc:${t.color}">
                ${_esc(t.name)}
              </button>`).join('')}
          </div>` :
          `<div class="note-tags-empty">Nessun tag definito.
             <a onclick="closeModal();navigate('tags')" style="color:var(--accent);cursor:pointer">Creane uno</a>.
           </div>`
        }

        <div id="noteEditor" class="note-editor-quill"></div>
      </div>`;

    openModal(
      note ? 'Modifica nota' : 'Nuova nota',
      body,
      _saveNoteFromModal,
      'Salva', 'btn-primary', 'modal-notes'
    );

    // Quill init (DOM è ora montato)
    setTimeout(() => _initNoteEditor(note), 30);
  });
}

// Inizializza l'editor Quill (caricato on-demand) e i toggle colore/tag dentro il modale nota.
async function _initNoteEditor(note) {
  let el = document.getElementById('noteEditor');
  if (!el) return;
  // Quill è caricato on-demand: pesa ~210 KB e serve solo qui (editor Note)
  if (typeof Quill === 'undefined') {
    el.innerHTML = '<div style="padding:12px;color:var(--muted)">Caricamento editor…</div>';
    try {
      await loadVendorScript('js/vendor/quill.min.js');
    } catch (e) {
      toast('Impossibile caricare l\'editor: ' + e.message, 'error');
      return;
    }
    // Il modale potrebbe essere stato chiuso/riaperto durante il caricamento:
    // rileggo l'elemento corrente ed esco se non esiste più.
    el = document.getElementById('noteEditor');
    if (!el) return;
    el.innerHTML = '';
  }
  _quill = new Quill(el, {
    theme: 'snow',
    placeholder: 'Inizia a scrivere…',
    modules: {
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ color: [] }, { background: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }, { list: 'check' }],
        ['blockquote', 'code-block'],
        ['link'],
        [{ align: [] }],
        ['clean'],
      ],
    },
  });
  if (note?.content) _quill.clipboard.dangerouslyPasteHTML(note.content);

  // Toggle colore
  document.querySelectorAll('#noteColorRow .note-color-dot').forEach(b => {
    b.onclick = () => {
      document.querySelectorAll('#noteColorRow .note-color-dot')
        .forEach(x => x.classList.remove('active'));
      b.classList.add('active');
    };
  });
  // Toggle tag
  document.querySelectorAll('#noteTagsPicker .notes-tagchip').forEach(b => {
    b.onclick = () => b.classList.toggle('active');
  });
  // Focus titolo se nuova nota
  if (!note) document.getElementById('noteTitle').focus();
}

// Raccoglie i campi del modale (titolo, contenuto Quill, colore, pin, tag) e salva la nota.
async function _saveNoteFromModal() {
  const title   = document.getElementById('noteTitle').value.trim();
  const content = _quill ? _quill.root.innerHTML : '';
  const pinned  = document.getElementById('notePinned').checked ? 1 : 0;
  const colorBtn = document.querySelector('#noteColorRow .note-color-dot.active');
  const color = colorBtn ? colorBtn.dataset.color : '';
  const tag_ids = Array.from(document.querySelectorAll('#noteTagsPicker .notes-tagchip.active'))
    .map(b => parseInt(b.dataset.tag));

  // Considera "vuota" se titolo vuoto e contenuto privo di testo
  const plain = _stripHtml(content).trim();
  if (!title && !plain) {
    toast('Nota vuota: aggiungi un titolo o del contenuto', 'error');
    return false;
  }
  try {
    await api.saveNote({
      id: _editingNote?.id ?? null,
      title, content, color, pinned, tag_ids,
    });
    toast(_editingNote ? 'Nota aggiornata' : 'Nota salvata');
    _quill = null;
    _editingNote = null;
    renderNotes();
  } catch (e) {
    toast('Errore: ' + e.message, 'error');
    return false;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────
// _esc: escape HTML per contenuto testuale; _escAttr: escape per valori di attributo;
// _stripHtml: estrae il testo puro da HTML; _formatNoteDate: data compatta (ora se oggi).
function _esc(s) {
  return (s == null ? '' : String(s))
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function _escAttr(s) {
  return (s == null ? '' : String(s))
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
function _stripHtml(html) {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
}
function _formatNoteDate(iso) {
  try {
    const d = new Date(iso.replace(' ', 'T'));
    if (isNaN(d)) return iso;
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();
    if (sameDay) return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
  } catch { return iso; }
}
