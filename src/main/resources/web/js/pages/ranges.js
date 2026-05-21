/* ═══════════════════════════════════════════════════════════════════════════
   LucaMoneyManager — pages/ranges.js
   Periodi personalizzati (estratta da app.js, stadio 5b del refactor)
═══════════════════════════════════════════════════════════════════════════ */

// rangeToFilter è definita in app.js (caricato dopo): risolta lazy a runtime.

async function renderRangePresets() {
  const pg = document.getElementById('pg-ranges');
  const presets = await api.getRangePresets();
  pg.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">Periodi personalizzati</h2>
      <button class="btn btn-primary" id="btnAddRangePreset">+ Nuovo periodo</button>
    </div>
    <div class="card" style="margin-bottom:12px">
      <p class="text-muted" style="font-size:12px;padding:8px 0 4px">
        I periodi personalizzati vengono aggiunti ai range predefiniti in tutti i filtri per data
        (transazioni, filtri analitici…). Puoi definire intervalli in giorni, settimane, mesi o anni.
      </p>
    </div>
    <div class="card" style="margin-bottom:12px;border-left:3px solid var(--accent);background:var(--bg3)">
      <div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--accent);padding:10px 12px 6px">📖 Guida agli offset</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="border-bottom:1px solid var(--border)">
            <th style="text-align:left;padding:4px 12px;color:var(--text-muted);font-weight:600">Da</th>
            <th style="text-align:left;padding:4px 12px;color:var(--text-muted);font-weight:600">A</th>
            <th style="text-align:left;padding:4px 12px;color:var(--text-muted);font-weight:600">Risultato</th>
          </tr>
        </thead>
        <tbody>
          ${[
            ['-7 D',  '0 D',  'ultimi 7 giorni'],
            ['0 Y',   '0 Y',  'anno corrente (1 gen → 31 dic)'],
            ['-1 Y',  '-1 Y', 'anno scorso'],
            ['-1 Y',  '+2 Y', 'da inizio anno scorso a fine 2028'],
            ['0 M',   '0 M',  'mese corrente'],
            ['-3 M',  '0 M',  'ultimi 3 mesi (inizio mese → fine mese corrente)'],
            ['-1 W',  '0 W',  'settimana scorsa + settimana corrente'],
          ].map(([da,a,res],i) => `
            <tr style="${i%2===0?'':'background:color-mix(in srgb,var(--accent) 10%,var(--bg))'}">
              <td style="padding:5px 12px"><code style="background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--accent);padding:1px 6px;border-radius:4px;font-size:11.5px">${da}</code></td>
              <td style="padding:5px 12px"><code style="background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--accent);padding:1px 6px;border-radius:4px;font-size:11.5px">${a}</code></td>
              <td style="padding:5px 12px;color:var(--text-muted);font-size:12px">${res}</td>
            </tr>`).join('')}
        </tbody>
      </table>
      <p style="font-size:11px;color:var(--text-muted);padding:8px 12px 10px;margin:0;border-top:1px solid var(--border)">
        Per <strong>Mese/Anno</strong> la data "Da" prende sempre l'inizio del periodo (1° del mese, 1 gennaio),
        la data "A" prende la fine (ultimo giorno del mese, 31 dicembre).
      </p>
    </div>
    <div class="card">
      ${presets.length ? `
        <div class="tags-mgmt-list">
          ${presets.map(p => {
            const preview = (() => { try { const f=rangeToFilter(p.range_key); return f.date_from && f.date_to ? `${f.date_from} → ${f.date_to}` : ''; } catch { return ''; } })();
            return `
            <div class="tag-mgmt-row">
              <span style="font-weight:500">${p.label}</span>
              <span class="tag-inline" style="--tc:#58a6ff;font-size:11px;padding:2px 8px;margin-left:8px">${p.range_key}</span>
              ${preview ? `<span class="text-muted" style="font-size:11px;margin-left:8px">${preview}</span>` : ''}
              <div style="margin-left:auto;display:flex;gap:4px">
                <button class="btn btn-ghost btn-icon" onclick="editRangePreset(${p.id})">✏️</button>
                <button class="btn btn-ghost btn-icon" onclick="deleteRangePresetMgmt(${p.id})">🗑️</button>
              </div>
            </div>`;
          }).join('')}
        </div>` :
        `<p class="text-muted" style="text-align:center;padding:30px">Nessun periodo personalizzato. Creane uno cliccando "+ Nuovo periodo".</p>`
      }
    </div>`;

  document.getElementById('btnAddRangePreset').onclick = () => showRangePresetModal(null);
}

function showRangePresetModal(preset) {
  const isEdit = !!preset;

  // Parse range_key esistente (nuovo formato {int}{unit}..{int}{unit} o vecchio Nd/Nm/Ny)
  let fromOff = -30, fromUnit = 'D', toOff = 0, toUnit = 'D';
  if (preset) {
    const rk = preset.range_key;
    const pa = rk.match(/^(-?\d+)([DWMY])\.\.(-?\d+)([DWMY])$/);
    if (pa) {
      fromOff=parseInt(pa[1]); fromUnit=pa[2]; toOff=parseInt(pa[3]); toUnit=pa[4];
    } else {
      const mD=rk.match(/^(\d+)d$/), mM=rk.match(/^(\d+)m$/), mY=rk.match(/^(\d+)y$/);
      if (mD)      { fromOff=-parseInt(mD[1]); fromUnit='D'; toOff=0; toUnit='D'; }
      else if (mM) { fromOff=-parseInt(mM[1]); fromUnit='M'; toOff=0; toUnit='M'; }
      else if (mY) { fromOff=-parseInt(mY[1]); fromUnit='Y'; toOff=0; toUnit='Y'; }
    }
  }

  const unitOpts = (sel) => ['D','W','M','Y'].map(v =>
    `<option value="${v}"${v===sel?' selected':''}>${{D:'Giorno',W:'Settimana',M:'Mese',Y:'Anno'}[v]}</option>`
  ).join('');

  const body = `
    <div class="form-group">
      <label class="form-label">Nome</label>
      <input class="form-control" id="rp_label" value="${preset?.label||''}" placeholder="es. Ultimi 45 giorni, Anno corrente…">
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:4px">
      <div class="form-group">
        <label class="form-label">Da</label>
        <div style="display:flex;gap:6px">
          <input type="number" class="form-control" id="rp_from_off" value="${fromOff}" style="width:76px">
          <select class="form-control" id="rp_from_unit">${unitOpts(fromUnit)}</select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">A</label>
        <div style="display:flex;gap:6px">
          <input type="number" class="form-control" id="rp_to_off" value="${toOff}" style="width:76px">
          <select class="form-control" id="rp_to_unit">${unitOpts(toUnit)}</select>
        </div>
      </div>
    </div>
    <div style="font-size:12px;color:var(--txt3);padding:6px 0 2px;line-height:2">
      Codice: <code id="rp_code" style="font-family:monospace;color:var(--txt2);background:var(--bg3);padding:2px 6px;border-radius:4px"></code>
      &nbsp;&nbsp;Anteprima: <span id="rp_preview" style="color:var(--accent)"></span>
    </div>
    <div style="font-size:11px;color:var(--txt3)">
      Offset 0 = periodo corrente. Negativi = passato, positivi = futuro.<br>
      Per unità Mese/Anno: "Da" prende l'inizio, "A" prende la fine del periodo.
    </div>`;

  openModal(isEdit ? 'Modifica periodo' : 'Nuovo periodo', body, async () => {
    const label    = document.getElementById('rp_label').value.trim();
    const fromOffV = parseInt(document.getElementById('rp_from_off').value);
    const fromUnitV= document.getElementById('rp_from_unit').value;
    const toOffV   = parseInt(document.getElementById('rp_to_off').value);
    const toUnitV  = document.getElementById('rp_to_unit').value;
    if (!label) { toast('Inserisci un nome', 'error'); return; }
    if (isNaN(fromOffV) || isNaN(toOffV)) { toast('Offset non valido', 'error'); return; }
    const range_key = `${fromOffV}${fromUnitV}..${toOffV}${toUnitV}`;
    try {
      if (isEdit) await api.updateRangePreset({id: preset.id, label, range_key});
      else        await api.addRangePreset({label, range_key});
      closeModal();
      toast(isEdit ? 'Periodo aggiornato' : 'Periodo aggiunto');
      renderRangePresets();
    } catch(e) { toast(e.message, 'error'); }
  });

  // Preview live
  setTimeout(() => {
    const upd = () => {
      const fo = parseInt(document.getElementById('rp_from_off')?.value) || 0;
      const fu = document.getElementById('rp_from_unit')?.value || 'D';
      const to = parseInt(document.getElementById('rp_to_off')?.value)   || 0;
      const tu = document.getElementById('rp_to_unit')?.value   || 'D';
      const key = `${fo}${fu}..${to}${tu}`;
      const cEl = document.getElementById('rp_code');
      const pEl = document.getElementById('rp_preview');
      if (cEl) cEl.textContent = key;
      if (pEl) {
        try {
          const f = rangeToFilter(key);
          pEl.textContent = f.date_from && f.date_to ? `${f.date_from} → ${f.date_to}`
                          : f.date_from ? `dal ${f.date_from}` : f.date_to ? `al ${f.date_to}` : '—';
        } catch { pEl.textContent = '—'; }
      }
    };
    ['rp_from_off','rp_from_unit','rp_to_off','rp_to_unit'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.oninput = upd; el.onchange = upd; }
    });
    upd();
  }, 50);
}

window.editRangePreset = async id => {
  const presets = await api.getRangePresets();
  showRangePresetModal(presets.find(p => p.id === id));
};

window.deleteRangePresetMgmt = async id => {
  const ok = await confirm('Elimina periodo', 'Eliminare questo periodo personalizzato?');
  if (!ok) return;
  try {
    await api.deleteRangePreset({id});
    toast('Periodo eliminato');
    renderRangePresets();
  } catch(e) { toast(e.message, 'error'); }
};
