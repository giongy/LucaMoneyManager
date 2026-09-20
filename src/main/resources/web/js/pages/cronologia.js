/* ═══════════════════════════════════════════════════════════════════════════
   LucaMoneyManager — pages/cronologia.js
   Cronologia: il giornale delle operazioni e i punti di ripristino, sulla
   stessa linea del tempo. Da qui si annulla un gesto o si riporta indietro
   tutto il database.

   ⚠️ Operazioni e backup stanno insieme di proposito: la scelta fra il
   bisturi (annullo quel gesto) e il ripristino totale si fa guardando UNA
   schermata, non incrociandone due. Era il buco del vecchio assetto — fra
   due backup non esisteva niente.
═══════════════════════════════════════════════════════════════════════════ */

let _cronOps   = [];        // operazioni dal giornale (op_log), dalla più recente
let _cronBaks  = [];        // punti di ripristino (.db.bak)
let _cronInfo  = {};        // peso e copertura del giornale
let _cronAperte = new Set();  // id delle operazioni espanse: sopravvivono al ridisegno

async function renderCronologia() {
  const pg = document.getElementById('pg-cronologia');
  pg.innerHTML = `
    <div class="section-header">
      <h2 class="section-title">Cronologia</h2>
      <div style="display:flex;gap:8px;align-items:center;margin-left:auto;flex-wrap:wrap">
        <input class="form-control" id="cronSearch" placeholder="🔍 Filtra..." style="width:200px">
        <select class="form-control" id="cronTypeFilter" style="width:190px"></select>
        <label class="cron-check" title="Mostra solo le operazioni che si possono ancora annullare">
          <input type="checkbox" id="cronOnlyUndoable"> solo annullabili
        </label>
        <label class="cron-check" title="Avvio, manutenzione, importazioni: cose fatte dal programma, non da te">
          <input type="checkbox" id="cronShowSystem"> di sistema
        </label>
        <button class="btn btn-ghost" id="btnCronRefresh" title="Aggiorna">↻</button>
        <button class="btn btn-ghost" id="btnCronArchive"
                title="Il vecchio file .log: la storia precedente alla cronologia, in sola lettura">📜 Archivio</button>
        <button class="btn btn-secondary" id="btnCronManut"
                title="Backup, potatura della cronologia e compattazione del file: lo stesso blocco che gira alla chiusura">💾 Backup e manutenzione ora</button>
      </div>
    </div>
    <div class="cron-info" id="cronInfo">Caricamento…</div>
    <div class="card" style="flex:1;display:flex;flex-direction:column;min-height:0">
      <div class="cron-wrap" id="cronWrap">
        <div style="color:var(--txt3);padding:40px;text-align:center">Caricamento…</div>
      </div>
    </div>`;

  document.getElementById('btnCronRefresh').onclick = cronLoad;
  document.getElementById('btnCronArchive').onclick = cronMostraArchivio;
  document.getElementById('btnCronManut').onclick   = cronManutenzione;

  let t;
  document.getElementById('cronSearch').addEventListener('input', () => {
    clearTimeout(t); t = setTimeout(cronRender, 150);
  });
  document.getElementById('cronTypeFilter').addEventListener('change', cronRender);
  document.getElementById('cronOnlyUndoable').addEventListener('change', cronRender);
  document.getElementById('cronShowSystem').addEventListener('change', cronRender);

  await cronLoad();
}

// Rilegge giornale e backup. I due elenchi arrivano da due posti diversi (una tabella del DB
// e la cartella dei .bak) ma finiscono in una lista sola, ordinata per istante.
async function cronLoad() {
  _cronAperte.clear();
  try {
    const [cron, baks] = await Promise.all([
      callJava('getCronologia', { limite: 500 }),
      api.listBackups().catch(() => ({ backups: [] }))
    ]);
    _cronOps  = cron.operazioni || [];
    _cronInfo = cron.info || {};
    _cronBaks = (baks.backups || []).filter(b => b.timestamp);
  } catch (e) {
    document.getElementById('cronWrap').innerHTML =
      `<div style="color:var(--expense);padding:40px;text-align:center">❌ ${esc(e.message || e)}</div>`;
    return;
  }
  cronAggiornaFiltroTipi();
  cronRenderInfo();
  cronRender();
}

// Banda di testa: quanto pesa il giornale e da dove si può ancora tornare indietro.
// È in pagina e non in Impostazioni perché è un fatto, non una preferenza.
function cronRenderInfo() {
  const el = document.getElementById('cronInfo');
  if (!el) return;
  const i = _cronInfo;
  const peso = (i.byte || 0) >= 1024 ? `${(i.byte / 1024).toFixed(0)} KB` : `${i.byte || 0} byte`;
  const dal = i.dal ? _cronGiorno(i.dal.slice(0, 10)) : null;
  // "annullabile da oggi" ma "annullabile dal 21/08": la preposizione segue l'etichetta.
  const da = dal === 'oggi' || dal === 'ieri' ? 'da' : 'dal';
  // Valore in chiaro, etichetta in grigio: cinque numeri tutti dello stesso peso si leggono
  // come una riga di testo unica, e il pulsante in fondo spariva in mezzo a loro.
  el.innerHTML = `
    <span class="cron-kpi"><b>${i.operazioni || 0}</b> operazioni</span>
    <span class="cron-kpi"><b>${i.righe || 0}</b> righe di dati</span>
    <span class="cron-kpi"><b>~${peso}</b></span>
    <span class="cron-kpi">${dal ? `annullabile ${da} <b>${esc(dal)}</b>` : 'giornale vuoto'}</span>
    <span class="cron-kpi">potatura automatica
      <b>${i.retention_giorni > 0 ? i.retention_giorni + ' gg' : 'no'}</b></span>
    <button class="btn btn-ghost cron-pota" id="btnCronPota"
            title="Elimina dalla cronologia le operazioni più vecchie di una data che scegli tu">🗑️ Pota la cronologia</button>`;
  document.getElementById('btnCronPota').onclick = cronPota;
}

// Le etichette presenti nel giornale, non un elenco scritto a mano: un'operazione nuova
// compare nel filtro senza che nessuno debba ricordarsene.
function cronAggiornaFiltroTipi() {
  const sel = document.getElementById('cronTypeFilter');
  if (!sel) return;
  const prec = sel.value;
  const tipi = [...new Set(_cronOps.map(o => o.etichetta))].sort();
  sel.innerHTML = `<option value="">Tutti i tipi</option>` +
    tipi.map(t => `<option${t === prec ? ' selected' : ''}>${esc(t)}</option>`).join('');
}

/* ─── Disegno della linea del tempo ───────────────────────────────────────── */

function cronRender() {
  const wrap = document.getElementById('cronWrap');
  if (!wrap) return;
  const q        = (document.getElementById('cronSearch')?.value || '').toLowerCase();
  const tipo     = document.getElementById('cronTypeFilter')?.value || '';
  const soloAnn  = document.getElementById('cronOnlyUndoable')?.checked;
  const sistema  = document.getElementById('cronShowSystem')?.checked;

  const voci = [];
  for (const o of _cronOps) {
    if (!sistema && o.tipo === 'sistema') continue;
    if (tipo && o.etichetta !== tipo) continue;
    if (soloAnn && !cronAnnullabile(o)) continue;
    if (q && !`${o.etichetta} ${o.dettaglio || ''}`.toLowerCase().includes(q)) continue;
    voci.push({ ts: o.ts, tipo: 'op', op: o });
  }
  // Un punto di ripristino non ha etichetta né dettaglio: lo si filtra solo per testo,
  // e sparisce quando è attivo un filtro per tipo (lì si sta cercando un gesto preciso).
  if (!tipo && !soloAnn) {
    for (const b of _cronBaks) {
      const ts = b.timestamp.replace('_', ' ').replace(/-(\d\d)-(\d\d)$/, ':$1:$2');
      if (q && !`punto di ripristino backup ${b.name}`.toLowerCase().includes(q)) continue;
      voci.push({ ts, tipo: 'bak', bak: b });
    }
  }
  voci.sort((a, b) => b.ts.localeCompare(a.ts));

  if (!voci.length) {
    wrap.innerHTML = '<div style="color:var(--txt3);padding:40px;text-align:center">Nessuna voce.</div>';
    return;
  }

  let html = '', giornoCorrente = null, iBak = 0;
  for (const v of voci) {
    const g = v.ts.slice(0, 10);
    if (g !== giornoCorrente) {
      giornoCorrente = g;
      html += `<div class="cron-day">${esc(_cronGiorno(g))}</div>`;
    }
    html += v.tipo === 'op' ? cronRigaOp(v.op) : cronRigaBak(v.bak, iBak++);
  }
  wrap.innerHTML = html;

  wrap.querySelectorAll('[data-cron-act]').forEach(b => {
    b.onclick = ev => {
      ev.stopPropagation();
      const id = Number(b.dataset.id);
      const a = b.dataset.cronAct;
      if (a === 'annulla')  cronAnnulla(id);
      if (a === 'ripeti')   cronRipeti(id);
      if (a === 'menu')     cronMenu(b, id);
      if (a === 'restore')  cronRipristina(b.dataset.path, b.dataset.ts);
      if (a === 'folder')   callJava('openBackupFolder', { path: b.dataset.path });
    };
  });
  wrap.querySelectorAll('.cron-row[data-op]').forEach(r => {
    r.onclick = () => cronEspandi(Number(r.dataset.op));
  });
  wrap.querySelectorAll('.cron-row[data-bak]').forEach(r => {
    r.onclick = () => cronEspandiBak(Number(r.dataset.bak), r.dataset.path);
  });
  _cronAperte.forEach(id => cronEspandi(id, true));
}

// Annullabile = attiva e con righe di dati nel giornale. È un controllo a buon mercato:
// i tre veri controlli (conflitti, dipendenze, coerenza) girano in Java al momento del clic,
// perché richiedono una transazione e sanno dire CHI blocca — cosa che un pulsante spento no.
function cronAnnullabile(o) {
  return o.stato === 'attiva' && o.righe > 0;
}

function cronRigaOp(o) {
  const colore = LOG_ACTION_COLORS[o.etichetta] || 'var(--txt2)';
  const annullata = o.stato === 'annullata';
  const nonAnn    = o.stato === 'non_annullabile';

  let azioni = '';
  if (annullata) {
    azioni = `<button class="btn btn-ghost cron-act" data-cron-act="ripeti" data-id="${o.annullata_da}"
                 title="Annulla l'annullamento: rimette le cose com'erano">↷ Ripeti</button>`;
  } else if (nonAnn) {
    azioni = `<span class="cron-nope" title="${esc(o.motivo || '')}">non annullabile</span>`;
  } else if (cronAnnullabile(o)) {
    azioni = `<button class="btn btn-ghost cron-act" data-cron-act="annulla" data-id="${o.id}"
                 title="Rimette le righe com'erano prima di questo gesto">↶ Annulla</button>
              <button class="btn btn-ghost cron-act" data-cron-act="menu" data-id="${o.id}" title="Altro">⋯</button>`;
  } else {
    azioni = `<span class="cron-nope" title="Questa operazione non ha cambiato dati">—</span>`;
  }

  return `<div class="cron-row${annullata ? ' cron-undone' : ''}" data-op="${o.id}">
      <span class="cron-time">${esc(o.ts.slice(11, 16))}</span>
      <span class="cron-label" style="color:${colore}">${esc(o.etichetta)}</span>
      <span class="cron-detail">${cronDettaglio(o)}</span>
      <span class="cron-actions">${azioni}</span>
    </div>
    <div class="cron-body hidden" id="cron-body-${o.id}"></div>`;
}

function cronRigaBak(b, i) {
  return `<div class="cron-row cron-bak" data-bak="${i}" data-path="${esc(b.path)}">
      <span class="cron-time">${esc(b.displayTs.slice(11, 16))}</span>
      <span class="cron-label">▣ PUNTO DI RIPRISTINO</span>
      <span class="cron-detail"><span class="cron-field">${esc(b.name)}</span>
        <span class="cron-field">${(b.size / 1024).toFixed(0)} KB</span></span>
      <span class="cron-actions">
        <button class="btn btn-ghost cron-act" data-cron-act="restore"
                data-path="${esc(b.path)}" data-ts="${esc(b.displayTs)}"
                title="Rimette il database com'era a quell'ora. L'attuale viene archiviato.">⤺ Ripristina</button>
        <button class="btn btn-ghost cron-act" data-cron-act="folder"
                data-path="${esc(b.path)}" title="Apri la cartella">📂</button>
      </span>
    </div>
    <div class="cron-body hidden" id="cron-bak-${i}"></div>`;
}

/**
 * Cosa c'era dentro un backup: si apre il .bak e si legge il suo op_log.
 *
 * ⚠️ Un .bak È un database, quindi la domanda ha una risposta esatta senza tenere accanto un
 * secondo file. Fino alla 1.25.x c'era un sidecar .json con le modifiche di sessione: poteva
 * mancare, corrompersi o descrivere un backup diverso da quello che gli stava accanto.
 * Un backup anteriore alla v27 non ha op_log: l'elenco torna vuoto, e non è un errore.
 */
async function cronEspandiBak(i, path) {
  const body = document.getElementById('cron-bak-' + i);
  if (!body) return;
  if (!body.classList.contains('hidden')) { body.classList.add('hidden'); return; }
  body.classList.remove('hidden');
  if (body.dataset.loaded === '1') return;
  body.innerHTML = '<div class="cron-loading">…</div>';
  try {
    const ops = (await api.operazioniBackup(path)).operazioni || [];
    body.innerHTML = ops.length
      ? `<div class="cron-meta" style="margin:0 0 6px">Ultime operazioni registrate dentro questo backup:</div>`
        + ops.map(o => `<div class="cron-change">
             <span class="cron-time">${esc(String(o.ts || '').slice(5, 16))}</span>
             <span class="cron-table" style="color:var(--txt)">${esc(o.etichetta || '')}</span>
             <span class="cron-fields"><span class="cron-field">${esc(String(o.dettaglio || '').slice(0, 200))}</span></span>
           </div>`).join('')
      : '<div class="cron-loading">Questo backup non contiene una cronologia: è precedente alla v27.</div>';
    body.dataset.loaded = '1';
  } catch (e) {
    body.innerHTML = `<div class="cron-loading" style="color:var(--expense)">❌ ${esc(e.message || e)}</div>`;
  }
}

/**
 * Il dettaglio di un'operazione, leggibile.
 *
 * Due cose che non sono cosmetiche:
 *  1. ⚠️ I nomi congelati non si sostituiscono. Il giornale ha registrato «Carburante»: se oggi
 *     quella categoria si chiama «Benzina», si scrive `Carburante (oggi: Benzina)`. Riscrivere
 *     il nome storico falsificherebbe la storia; ometterlo lascerebbe una riga incomprensibile.
 *  2. Un gesto composto (registrare una pianificata = transazione + avanzamento) ha più
 *     annotazioni attaccate: in riga va solo l'ultima, quella che chiude l'operazione, col
 *     resto dietro a un `+N` che si apre espandendo. Corretto e illeggibile era la versione
 *     con tutto in fila.
 */
function cronDettaglio(o) {
  if (!o.dettaglio) return '';
  const parti = o.dettaglio.split(' | ');
  const ultima = parti[parti.length - 1];
  const campi = ultima.replace(/^[A-ZÀ-Ù ]+: /, '').split(' · ').map(p => {
    const i = p.indexOf(':');
    if (i < 0) return `<span class="cron-field">${esc(p)}</span>`;
    const k = p.slice(0, i), v = p.slice(i + 1);
    const oggi = (o.nomi_oggi || {})[k];
    // Solo quando il candidato è UNO: con una transazione suddivisa le categorie sono più
    // d'una e non si saprebbe a quale si riferisce il nome scritto nel giornale.
    const nota = (oggi && oggi.length === 1 && oggi[0] !== v)
      ? `<span class="cron-today">(oggi: ${esc(oggi[0])})</span>` : '';
    return `<span class="cron-field"><span class="log-key">${esc(k)}</span><span class="log-val">${esc(v)}</span>${nota}</span>`;
  }).join('');
  const piu = parti.length > 1
    ? `<span class="cron-more" title="Questo gesto ha fatto più cose: espandi per vederle">+${parti.length - 1}</span>` : '';
  return campi + piu;
}

/* ─── Espansione: cosa ha cambiato davvero ────────────────────────────────── */

async function cronEspandi(id, forza = false) {
  const body = document.getElementById('cron-body-' + id);
  if (!body) return;
  if (!forza && _cronAperte.has(id)) {
    _cronAperte.delete(id);
    body.classList.add('hidden');
    return;
  }
  _cronAperte.add(id);
  body.classList.remove('hidden');
  if (body.dataset.loaded === '1') return;
  body.innerHTML = '<div class="cron-loading">…</div>';
  try {
    const res = await callJava('getOperazione', { id });
    const op = res.operazione || {};
    const parti = (op.dettaglio || '').split(' | ');
    const testa = parti.length > 1
      ? `<div class="cron-steps">${parti.map(p => `<div>${esc(p)}</div>`).join('')}</div>` : '';
    const righe = (res.righe || []).map(r => {
      const verso = { I: 'creata', U: 'modificata', D: 'eliminata' }[r.verso] || r.verso;
      const campi = (r.campi || []).map(c => {
        const p = c.prima === null || c.prima === undefined ? '∅' : c.prima;
        const d = c.dopo  === null || c.dopo  === undefined ? '∅' : c.dopo;
        const val = r.verso === 'U' ? `${esc(p)} → ${esc(d)}`
                  : r.verso === 'D' ? esc(p) : esc(d);
        return `<span class="cron-field"><span class="log-key">${esc(c.campo)}</span><span class="log-val">${val}</span></span>`;
      }).join('');
      return `<div class="cron-change">
          <span class="cron-verso cron-verso-${r.verso}">${verso}</span>
          <span class="cron-table">${esc(r.tabella)}</span>
          <span class="cron-fields">${campi || '<span class="cron-nope">nessun campo cambiato</span>'}</span>
        </div>`;
    }).join('');
    body.innerHTML = testa + (righe || '<div class="cron-loading">Nessuna riga di dati.</div>') +
      // ⚠️ `annullata_da` non si azzera quando l'operazione torna in vigore (resta il
      // riferimento all'ultimo annullatore, che serve al «ripeti»): il legame si mostra
      // guardando lo stato, non la presenza del campo.
      `<div class="cron-meta">operazione #${op.id} · origine ${esc(op.origine || '')} · ${esc(op.tipo || '')}`
      + (op.stato === 'annullata' ? ` · annullata dall'operazione #${op.annullata_da}` : '')
      + (op.annulla_op ? ` · annulla l'operazione #${op.annulla_op}` : '') + `</div>`;
    body.dataset.loaded = '1';
  } catch (e) {
    body.innerHTML = `<div class="cron-loading" style="color:var(--expense)">❌ ${esc(e.message || e)}</div>`;
  }
}

/* ─── Annullamento ────────────────────────────────────────────────────────── */

async function cronAnnulla(id) {
  const o = _cronOps.find(x => x.id === id);
  if (!o) return;
  const ok = await confirm('Annulla operazione',
    `Rimettere le cose com'erano prima di <strong>${esc(o.etichetta)}</strong>`
    + ` delle ${esc(o.ts.slice(11, 16))}?<br><br>`
    + `<span style="color:var(--txt3)">L'annullamento è a sua volta un'operazione: resta in cronologia e si può disfare.</span>`,
    '↶ Annulla operazione', 'btn-danger');
  if (!ok) return;
  await cronEsegui('annullaOperazione', id, o);
}

async function cronRipeti(idAnnullamento) {
  const ok = await confirm('Ripeti operazione',
    'Annullare l\'annullamento, cioè rimettere le cose come le avevi lasciate?',
    '↷ Ripeti', 'btn-primary');
  if (!ok) return;
  await cronEsegui('annullaOperazione', idAnnullamento, null);
}

async function cronRiportaA(id) {
  const o = _cronOps.find(x => x.id === id);
  if (!o) return;
  const dopo = _cronOps.filter(x => x.id >= id && x.stato === 'attiva').length;
  const ok = await confirm('Riporta il database indietro',
    `Annullare <strong>${dopo}</strong> operazioni: questa e tutte quelle venute dopo.<br><br>`
    + `Il database tornerà com'era prima di <strong>${esc(o.etichetta)}</strong> delle ${esc(o.ts.slice(11, 16))} `
    + `del ${esc(_cronGiorno(o.ts.slice(0, 10)))}.`,
    '⏮ Riporta indietro', 'btn-danger');
  if (!ok) return;
  await cronEsegui('riportaAOperazione', id, o);
}

// Esegue l'annullamento e reagisce all'esito. Un rifiuto non è un errore: è il giornale che
// dice perché non si può, e da lì si sceglie la strada più forte.
async function cronEsegui(metodo, id, o) {
  let res;
  try {
    res = await callJava(metodo, { id });
  } catch (e) {
    toast('Errore: ' + (e.message || e), 'error');
    return;
  }
  if (res.ok) {
    const n = res.operazioni.length, r = res.righe;
    toast(`${n === 1 ? 'Annullata 1 operazione' : `Annullate ${n} operazioni`}`
        + ` · ${r} rig${r === 1 ? 'a rimessa' : 'he rimesse'} a posto`, 'success');
    // I saldi in sidebar cambiano subito; le altre pagine si ridisegnano quando ci si va
    // sopra (il router chiama sempre il loro render).
    await updateSidebar();
    await cronLoad();
    return;
  }
  cronMostraRifiuto(o, id, res);
}

function cronMostraRifiuto(o, id, res) {
  const bloccanti = res.bloccanti || [];
  const lista = bloccanti.length ? `
    <div class="cron-blockers">
      ${bloccanti.map(b => `<div><strong>#${b.id}</strong> ${esc(b.ts || '')} — ${esc(b.etichetta || '')}
        <div class="cron-blocker-detail">${esc((b.dettaglio || '').slice(0, 160))}</div></div>`).join('')}
    </div>` : '';
  openModal('Non si può annullare così',
    `<p style="color:var(--txt2);line-height:1.6">${esc(res.motivo)}</p>${lista}` +
    (bloccanti.length ? `<p class="settings-hint" style="margin-top:10px">
        Puoi annullare <strong>anche quelle</strong>: verranno disfatte tutte insieme, come un solo gesto.
        Non è «torna indietro a quel giorno» — si annulla solo l'insieme minimo che blocca.
      </p>` : `<p class="settings-hint" style="margin-top:10px">
        Resta la strada larga: <strong>riporta il database a prima di qui</strong>, dal menu ⋯.
      </p>`),
    bloccanti.length ? async () => {
      closeModal();
      await cronEsegui('annullaACatena', id, o);
    } : null,
    '↶ Annulla anche quelle', 'btn-danger');
}

// Menu ⋯: le azioni che non meritano un pulsante fisso in ogni riga.
function cronMenu(btn, id) {
  document.getElementById('cronMenu')?.remove();
  const r = btn.getBoundingClientRect();
  const m = document.createElement('div');
  m.id = 'cronMenu';
  m.className = 'ctx-menu';
  // display esplicito: .ctx-menu nasce display:none (i menu contestuali dell'app vengono
  // creati una volta e mostrati al bisogno; questo nasce già al momento del clic).
  m.style.cssText = `position:fixed;display:block;top:${r.bottom + 4}px;`
                  + `left:${Math.max(8, r.right - 260)}px;z-index:3000`;
  m.innerHTML = `
    <div class="ctx-item" data-a="riporta">⏮ Riporta il database a prima di qui</div>
    <div class="ctx-item" data-a="espandi">🔎 Mostra cosa ha cambiato</div>`;
  document.body.appendChild(m);
  m.querySelectorAll('.ctx-item').forEach(it => it.onclick = () => {
    m.remove();
    if (it.dataset.a === 'riporta') cronRiportaA(id); else cronEspandi(id);
  });
  setTimeout(() => document.addEventListener('click', () => m.remove(), { once: true }), 0);
}

async function cronRipristina(path, displayTs) {
  const ok = await confirm('Ripristina il database',
    `Rimettere il database com'era il <strong>${esc(displayTs)}</strong>?<br><br>`
    + `Quello attuale viene archiviato nella cartella backup, quindi non si perde.<br>`
    + `<span style="color:var(--txt3)">⚠️ Torna indietro anche la cronologia: le operazioni fatte dopo quell'ora `
    + `non saranno più in questa pagina (restano nel database archiviato).</span>`,
    '⤺ Ripristina', 'btn-danger');
  if (!ok) return;
  try {
    const res = await api.restoreBackup(path);
    openModal('✅ Ripristino completato',
      `<p style="color:var(--txt2);line-height:1.6">Database precedente archiviato in:<br>
       <code style="font-size:11px">${esc(res.archived)}</code><br><br>L'applicazione verrà ricaricata.</p>`,
      () => { closeModal(); location.reload(); }, 'Ok', 'btn-primary');
  } catch (e) {
    toast('Ripristino fallito: ' + (e.message || e), 'error');
  }
}

/* ─── Backup e manutenzione ───────────────────────────────────────────────── */

// Un blocco solo: backup (se c'è qualcosa da salvare), potatura della cronologia oltre la
// finestra di retention, compattazione del file se è davvero frammentato. È lo stesso che gira
// alla chiusura dell'app: qui c'è solo il pulsante per anticiparlo.
async function cronManutenzione() {
  const btn = document.getElementById('btnCronManut');
  const testo = btn.textContent;
  btn.disabled = true;
  btn.textContent = '⏳ In corso…';
  try {
    const r = await api.manutenzioneOra();
    const righe = [];
    if (r.backup)             righe.push(`✅ Backup: <code style="font-size:11px">${esc(r.backup)}</code>`);
    else if (r.backup_errore) righe.push(`❌ Backup fallito: ${esc(r.backup_errore)}`);
    else                      righe.push(`➖ Nessun backup: ${esc(r.backup_saltato || '')}`);

    if (r.potatura_saltata)      righe.push(`➖ Potatura saltata: ${esc(r.potatura_saltata)}`);
    else if (r.potatura_errore)  righe.push(`❌ Potatura fallita: ${esc(r.potatura_errore)}`);
    else if (r.operazioni_potate) righe.push(`🗑️ Potate ${r.operazioni_potate} operazioni oltre i ${r.retention_giorni} giorni`);
    else if (r.retention_giorni === 0) righe.push('➖ Nessuna potatura: retention illimitata');
    else                         righe.push(`➖ Niente da potare: la cronologia sta nei ${r.retention_giorni} giorni`);

    if (r.compattato) {
      const risparmio = Math.max(0, (r.byte_prima || 0) - (r.byte_dopo || 0));
      righe.push(`📦 File compattato: ${(risparmio / 1024).toFixed(0)} KB liberati`);
    }
    openModal('Backup e manutenzione',
      `<div style="color:var(--txt2);line-height:1.9">${righe.join('<br>')}</div>`
      + `<p class="settings-hint" style="margin-top:10px">Durata: ${r.ms} ms. `
      + `La finestra di conservazione si cambia in Impostazioni → Backup e cronologia.</p>`,
      null);
    await cronLoad();
  } catch (e) {
    toast('Manutenzione fallita: ' + (e.message || e), 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = testo;
  }
}

/**
 * Potatura a mano: si sceglie quanti giorni tenere, e via il resto.
 *
 * ⚠️ Esiste **sempre**, anche con la retention automatica spenta — anzi è proprio lì che
 * serve: chi mette 0 nelle impostazioni ha detto «non potare da solo», non «non potare mai»,
 * e senza questo pulsante l'unico modo per ripulire sarebbe cambiare l'impostazione, far
 * girare la manutenzione e rimetterla com'era.
 *
 * ⚠️ Passa dallo stesso blocco della manutenzione, **backup compreso**: quello che si toglie
 * dal database resta dentro il .bak fatto un istante prima. Qui sotto si dice quale.
 */
async function cronPota() {
  const giorniDefault = _cronInfo.retention_giorni > 0 ? _cronInfo.retention_giorni : 30;
  const ultimoBak = _cronBaks[0];   // già ordinati dal più recente in cronLoad()
  const backupAttivo = _cronInfo.backup_attivo;

  // Dove finirà la storia che si sta per togliere: è la domanda che uno si fa dopo, non prima.
  const rete = backupAttivo
    ? `<p class="settings-hint" style="margin:8px 0 0">Prima di potare viene fatto un backup, se c'è
         qualcosa di nuovo da salvare: quello che togli resta là dentro, e si rivede ripristinando
         quella copia.${ultimoBak ? ` L'ultimo punto di ripristino è del <strong>${esc(ultimoBak.displayTs)}</strong>.` : ''}</p>`
    : `<p class="settings-hint" style="margin:8px 0 0;color:var(--expense)">⚠️ Il backup all'uscita è
         <strong>disattivato</strong>: quello che togli ora non finirà in nessuna copia nuova.
         ${ultimoBak ? `L'unica che ce l'ha è quella del <strong>${esc(ultimoBak.displayTs)}</strong>.`
                     : 'E non esiste nessun punto di ripristino: quello che togli è perso.'}</p>`;

  openModal('Pota la cronologia', `
    <p style="color:var(--txt2);line-height:1.7">Elimina dal database le operazioni più vecchie
      del numero di giorni che scegli. Quelle più recenti restano annullabili come adesso.</p>
    <div style="display:flex;align-items:center;gap:8px;margin-top:10px">
      <span style="color:var(--txt2)">Conserva gli ultimi</span>
      <input type="number" class="form-control" id="potaGiorni" style="width:90px"
             min="0" max="3650" value="${giorniDefault}">
      <span style="color:var(--txt2)">giorni</span>
      <span class="settings-hint" id="potaStima" style="margin-left:6px"></span>
    </div>
    ${rete}`,
    async () => {
      const giorni = Math.max(0, Math.min(3650, parseInt(
        document.getElementById('potaGiorni').value, 10) || 0));
      closeModal();
      await cronEseguiPotatura(giorni);
    },
    '🗑️ Pota', 'btn-danger');

  // Stima quante operazioni se ne andrebbero, contata sulle righe già caricate in pagina:
  // nessuna chiamata in più. Se l'elenco è troncato lo si dice, invece di dare un numero
  // preciso che preciso non è.
  const campo = document.getElementById('potaGiorni');
  const stima = document.getElementById('potaStima');
  const aggiorna = () => {
    const g = Math.max(0, parseInt(campo.value, 10) || 0);
    const taglio = new Date(Date.now() - g * 86400000);
    const n = _cronOps.filter(o => new Date(o.ts.replace(' ', 'T')) < taglio).length;
    const parziale = _cronOps.length < (_cronInfo.operazioni || 0);
    stima.textContent = n === 0
      ? '— niente da togliere'
      : `— ne toglie ${parziale ? 'almeno ' : ''}${n} su ${_cronInfo.operazioni}`;
  };
  campo.addEventListener('input', aggiorna);
  aggiorna();
}

async function cronEseguiPotatura(giorni) {
  try {
    const r = await api.potaCronologia(giorni);
    if (r.potatura_errore) { toast('Potatura fallita: ' + r.potatura_errore, 'error'); return; }
    if (r.potatura_saltata) { toast('Non potata: ' + r.potatura_saltata, 'error'); return; }
    const n = r.operazioni_potate || 0;
    toast(n === 0 ? 'Non c\'era niente da togliere'
                  : `${n === 1 ? 'Tolta 1 operazione' : `Tolte ${n} operazioni`}`
                    + (r.compattato ? ' · file compattato' : ''), 'success');
    await cronLoad();
  } catch (e) {
    toast('Potatura fallita: ' + (e.message || e), 'error');
  }
}

/* ─── Giorni ──────────────────────────────────────────────────────────────── */

function _cronGiorno(iso) {
  const oggi = new Date();
  const ieri = new Date(oggi.getTime() - 86400000);
  const f = d => d.toISOString().slice(0, 10);
  // toISOString lavora in UTC: per il confronto con una data locale si compensa il fuso,
  // altrimenti fino alle 2 del mattino "oggi" risulterebbe ieri.
  const loc = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  if (iso === f(loc(oggi))) return 'oggi';
  if (iso === f(loc(ieri))) return 'ieri';
  const [y, m, g] = iso.split('-');
  return `${g}/${m}/${y}`;
}

/* ─── Archivio: il vecchio file .log ──────────────────────────────────────────
   Non è più il registro dell'app — quello è il giornale — ma contiene la storia
   PRECEDENTE alla cronologia, che il giornale non ha. L'app smette di scriverlo e
   non lo tocca: lo cancella l'utente se e quando vuole.                        */

async function cronMostraArchivio() {
  openModal('📜 Archivio — vecchio file di log',
    '<div class="cron-loading">Caricamento…</div>', null, '', '', 'modal-wide');
  const body = document.getElementById('modalBody');
  try {
    const data = await api.readLog(2000);
    const righe = data.lines || [];
    body.innerHTML = `
      <p class="settings-hint" style="margin:0 0 8px">
        Storia precedente alla cronologia. L'app non scrive più questo file e non lo modifica:
        resta come archivio di sola lettura, e lo cancelli tu se e quando vuoi.<br>
        <code style="font-size:11px">${esc(data.path || '—')}</code>
        <button class="btn btn-ghost" style="padding:1px 8px;font-size:11px;margin-left:6px"
                onclick="callJava('openLogFolder')">Apri cartella ↗</button>
      </p>
      <div class="log-wrap" style="max-height:52vh">
        ${righe.length ? righe.map(_cronRigaArchivio).join('')
                       : '<div style="color:var(--txt3);padding:20px;text-align:center">Nessuna riga.</div>'}
      </div>`;
    const w = body.querySelector('.log-wrap');
    if (w) w.scrollTop = w.scrollHeight;
  } catch (e) {
    body.innerHTML = `<div style="color:var(--expense)">❌ ${esc(e.message || e)}</div>`;
  }
}

// Formato storico del .log: "YYYY-MM-DD  HH:mm:ss  AZIONE  |  campo:val  |  ..."
function _cronRigaArchivio(line) {
  const rest   = line.substring(22).trimStart();
  const sepIdx = rest.indexOf('  |  ');
  const action = sepIdx >= 0 ? rest.substring(0, sepIdx).trim() : rest.trim();
  const fields = sepIdx >= 0 ? rest.substring(sepIdx + 5).split('  |  ') : [];
  const color  = LOG_ACTION_COLORS[action] || 'var(--txt2)';
  // Il log contiene testo utente (le descrizioni delle transazioni): va escapato.
  const fieldsHtml = fields.map(f => {
    const ci = f.indexOf(':');
    if (ci < 0) return `<span class="log-field">${esc(f)}</span>`;
    return `<span class="log-field"><span class="log-key">${esc(f.substring(0, ci))}</span>`
         + `<span class="log-val">${esc(f.substring(ci + 1))}</span></span>`;
  }).join('');
  return `<div class="log-row">
      <span class="log-date">${esc(line.substring(0, 10))}</span>
      <span class="log-time">${esc(line.substring(12, 20))}</span>
      <span class="log-action" style="color:${color}">${esc(action)}</span>
      <span class="log-fields">${fieldsHtml}</span>
    </div>`;
}

/* ─── Colori delle etichette ──────────────────────────────────────────────────
   Le stesse etichette che scrive Giornale.log(): servono sia alla linea del tempo
   sia all'archivio. Un'etichetta assente ricade sul colore neutro.             */

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
  'OPERAZIONE ANNULLATA':   '#ff9f43',
  'OPERAZIONI ANNULLATE':   '#ff9f43',
  'BACKUP ESEGUITO':        '#8b949e',
  'DB CAMBIATO':            '#e3b341',
  'AVVIO':                  '#8b949e',
};
