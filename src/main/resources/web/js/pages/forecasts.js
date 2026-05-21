/* ═══════════════════════════════════════════════════════════════════════════
   LucaMoneyManager — pages/forecasts.js
   Pagina Previsioni (estratta da app.js, stadio 6c del refactor)
   Esporta sia renderForecasts (pagina standalone) sia renderForecastsInTab
   (usata dalla tab "Previsioni" dentro Pianificate).
═══════════════════════════════════════════════════════════════════════════ */

let _forecastDetailId = null;

function _forecastsHTML(list, openCmd) {
  const tdS = 'padding:8px 12px;border-bottom:1px solid var(--border)';
  const thS = `${tdS};color:var(--txt2);font-weight:500;font-size:12px;text-transform:uppercase;letter-spacing:.4px`;

  const today    = new Date(); today.setHours(0,0,0,0);
  const active   = list.filter(f => !f.archived).sort((a,b) => a.forecast_date.localeCompare(b.forecast_date));
  const archived = list.filter(f =>  f.archived);

  const daysTo = dateStr => {
    const d = new Date(dateStr); d.setHours(0,0,0,0);
    return Math.round((d - today) / 86400000);
  };

  const daysBadge = days => {
    if (days === 0) return `<span style="color:var(--warn);font-weight:700">Oggi</span>`;
    if (days < 0)  return `<span style="color:var(--expense);font-weight:700">${days} gg</span>`;
    return `<span style="color:var(--txt2)">${days} gg</span>`;
  };

  const tableHTML = (rows, isArchived) => {
    if (!rows.length) return '';
    return `<table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead><tr>
        <th style="${thS}">Data previsione</th>
        ${!isArchived ? `<th style="${thS};text-align:center">Scade tra</th>` : ''}
        <th style="${thS};text-align:right">Saldo previsto</th>
        <th style="${thS};text-align:center">Categorie</th>
        <th style="${thS}">Salvata il</th>
        <th style="${thS};text-align:center">Orizzonte</th>
        ${!isArchived ? `<th style="${thS};text-align:center">Stato</th>` : ''}
        <th style="${thS}"></th>
      </tr></thead>
      <tbody>
        ${rows.map(f => {
          const ready = f.is_ready === 1;
          const statusBadge = ready
            ? `<span style="background:rgba(63,185,80,.15);color:#3fb950;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600">Pronta</span>`
            : `<span style="background:rgba(88,166,255,.12);color:#58a6ff;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600">In attesa</span>`;
          const clickable = ready || isArchived;
          return `<tr style="${clickable?'cursor:pointer':''}" ${clickable ? `onclick="_forecastDetailId=${f.id};${openCmd}"` : ''}>
            <td style="${tdS};font-weight:600">${fmt.date(f.forecast_date)}</td>
            ${!isArchived ? `<td style="${tdS};text-align:center">${daysBadge(daysTo(f.forecast_date))}</td>` : ''}
            <td style="${tdS};text-align:right;font-variant-numeric:tabular-nums">${fmt.currency(f.projected_balance)}</td>
            <td style="${tdS};text-align:center">${f.cat_count}</td>
            <td style="${tdS};color:var(--txt2)">${fmt.date(f.created_at.substring(0,10))}</td>
            <td style="${tdS};text-align:center;color:var(--txt2)">${Math.round((new Date(f.forecast_date) - new Date(f.created_at.substring(0,10))) / 86400000)} gg</td>
            ${!isArchived ? `<td style="${tdS};text-align:center">${statusBadge}</td>` : ''}
            <td style="${tdS};text-align:right;white-space:nowrap;display:flex;gap:6px;justify-content:flex-end">
              ${!ready && !isArchived ? `<button class="btn btn-xs btn-ghost" onclick="event.stopPropagation();_showForecastPreview(${f.id})">👁 Preview</button>` : ''}
              ${!isArchived ? `<button class="btn btn-xs btn-ghost" onclick="event.stopPropagation();_archiveForecast(${f.id},()=>{${openCmd}})">Archivia</button>` : ''}
              <button class="btn btn-xs btn-danger" onclick="event.stopPropagation();_deleteForecast(${f.id},()=>{${openCmd}})">Elimina</button>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
  };

  return `
    <div class="card" style="overflow:hidden;margin-bottom:${archived.length?'16px':'0'}">
      ${!active.length
        ? `<div style="padding:32px;text-align:center;color:var(--txt3)">
             Nessuna previsione attiva.<br>
             <span style="font-size:13px">Vai in <strong>Pianificate → Proiezione Saldo</strong> e clicca "Salva previsione".</span>
           </div>`
        : tableHTML(active, false)}
    </div>
    ${archived.length ? `
    <div class="card" style="overflow:hidden">
      <div style="padding:10px 16px;font-size:12px;font-weight:600;color:var(--txt3);border-bottom:1px solid var(--border);text-transform:uppercase;letter-spacing:.5px">
        📦 Archiviate (${archived.length})
      </div>
      ${tableHTML(archived, true)}
    </div>` : ''}`;
}

async function renderForecasts() {
  const pg = document.getElementById('pg-forecasts');
  let list; try { list = await api.getForecasts(); } catch(e) { pg.innerHTML=`<p class="text-muted">${e.message}</p>`; return; }
  if (_forecastDetailId != null) { await renderForecastDetail(pg, _forecastDetailId, 'renderForecasts()'); return; }
  pg.innerHTML = _forecastsHTML(list, 'renderForecasts()');
}

async function renderForecastsInTab() {
  const pg = document.getElementById('schedContent');
  let list; try { list = await api.getForecasts(); } catch(e) { pg.innerHTML=`<p class="text-muted">${e.message}</p>`; return; }
  if (_forecastDetailId != null) { await renderForecastDetail(pg, _forecastDetailId, 'renderForecastsInTab()'); return; }
  pg.innerHTML = _forecastsHTML(list, 'renderForecastsInTab()');
}

async function renderForecastDetail(pg, id, backCmd = 'renderForecasts()') {
  let d; try { d = await api.getForecastDetail({id}); } catch(e) { toast(e.message,'error'); return; }
  const cats = d.categories || [];
  const balDiff = d.actual_balance - d.projected_balance;
  const tdS = 'padding:7px 12px;border-bottom:1px solid var(--border);font-size:13px';
  const thS = `${tdS};color:var(--txt2);font-weight:500;font-size:12px`;
  const diffColor = v => v > 0 ? 'var(--income)' : v < 0 ? 'var(--expense)' : 'var(--txt2)';
  const diffStr  = v => (v > 0 ? '+' : '') + fmt.currency(v);

  pg.innerHTML = `
    <div class="page-header" style="display:flex;align-items:center;gap:12px">
      <button class="btn btn-ghost btn-sm" onclick="_forecastDetailId=null;${backCmd}">← Lista</button>
      <h2 class="page-title">Previsione al ${fmt.date(d.forecast_date)}</h2>
    </div>

    <!-- Saldo -->
    <div class="card" style="margin-bottom:16px;padding:16px 20px">
      <div style="font-size:12px;color:var(--txt2);margin-bottom:8px;text-transform:uppercase;letter-spacing:.4px">Saldo totale</div>
      <div style="display:flex;gap:40px;flex-wrap:wrap">
        <div><div style="font-size:11px;color:var(--txt3)">Previsto</div><div style="font-size:20px;font-weight:700;color:var(--accent)">${fmt.currency(d.projected_balance)}</div></div>
        <div><div style="font-size:11px;color:var(--txt3)">Reale</div><div style="font-size:20px;font-weight:700">${fmt.currency(d.actual_balance)}</div></div>
        <div><div style="font-size:11px;color:var(--txt3)">Differenza</div><div style="font-size:20px;font-weight:700;color:${diffColor(balDiff)}">${diffStr(balDiff)}</div></div>
      </div>
    </div>

    <!-- Categorie -->
    <div class="card" style="overflow:hidden">
      <div style="padding:12px 16px;font-weight:600;border-bottom:1px solid var(--border)">Dettaglio categorie</div>
      ${!cats.length ? `<div style="padding:20px;color:var(--txt3)">Nessuna categoria salvata.</div>` :
      `<table style="width:100%;border-collapse:collapse">
        <thead><tr>
          <th style="${thS};text-align:left">Categoria</th>
          <th style="${thS};text-align:center">Tipo</th>
          <th style="${thS};text-align:right">Previsto</th>
          <th style="${thS};text-align:right">Reale</th>
          <th style="${thS};text-align:right">Differenza</th>
        </tr></thead>
        <tbody>
          ${cats.map(c => {
            const diff = c.diff;
            const rowBg = diff > 0 ? 'rgba(63,185,80,.04)' : diff < 0 ? 'rgba(248,81,73,.04)' : '';
            return `<tr style="background:${rowBg}">
              <td style="${tdS}">${c.category_name}</td>
              <td style="${tdS};text-align:center">
                <span style="font-size:11px;padding:1px 7px;border-radius:8px;background:${c.category_type==='income'?'rgba(63,185,80,.15)':'rgba(248,81,73,.15)'};color:${c.category_type==='income'?'var(--income)':'var(--expense)'}">
                  ${c.category_type==='income'?'Entrata':'Uscita'}
                </span>
              </td>
              <td style="${tdS};text-align:right;font-variant-numeric:tabular-nums">${fmt.currency(c.projected_amount)}</td>
              <td style="${tdS};text-align:right;font-variant-numeric:tabular-nums">${fmt.currency(c.actual_amount)}</td>
              <td style="${tdS};text-align:right;font-variant-numeric:tabular-nums;font-weight:600;color:${diffColor(diff)}">${diffStr(diff)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`}
    </div>`;
}

async function _deleteForecast(id, refresh) {
  openModal('Elimina previsione', '<p>Eliminare questa previsione? L\'operazione non è reversibile.</p>', async () => {
    try { await api.deleteForecast({id}); toast('Previsione eliminata'); if (refresh) refresh(); else renderForecasts(); }
    catch(e) { toast(e.message,'error'); }
  }, 'Elimina', 'btn-danger');
}

async function _archiveForecast(id, refresh) {
  try {
    await api.archiveForecast({id});
    const entry = _noticeData.find(n => n.type === 'forecast');
    if (entry) {
      entry.list = entry.list.filter(f => f.id !== id);
      if (entry.list.length === 0) _noticeData.splice(_noticeData.indexOf(entry), 1);
      updateNoticeBtn();
    }
    if (refresh) refresh(); else renderForecasts();
  } catch(e) { toast(e.message, 'error'); }
}

async function _showForecastPreview(id) {
  let d; try { d = await api.getForecastDetail({id}); } catch(e) { toast(e.message,'error'); return; }
  const cats = d.categories || [];
  const balDiff = d.actual_balance - d.projected_balance;
  const tdS = 'padding:7px 12px;border-bottom:1px solid var(--border);font-size:13px';
  const thS = `${tdS};color:var(--txt2);font-weight:500;font-size:12px`;
  const diffColor = v => v > 0 ? 'var(--income)' : v < 0 ? 'var(--expense)' : 'var(--txt2)';
  const diffStr  = v => (v > 0 ? '+' : '') + fmt.currency(v);

  const body = `
    <div style="margin-bottom:16px;padding:14px 16px;background:var(--bg3);border-radius:var(--radius)">
      <div style="font-size:11px;color:var(--txt3);margin-bottom:8px;text-transform:uppercase;letter-spacing:.4px">Saldo totale</div>
      <div style="display:flex;gap:32px;flex-wrap:wrap">
        <div><div style="font-size:11px;color:var(--txt3)">Previsto</div><div style="font-size:18px;font-weight:700;color:var(--accent)">${fmt.currency(d.projected_balance)}</div></div>
        <div><div style="font-size:11px;color:var(--txt3)">Reale ad oggi</div><div style="font-size:18px;font-weight:700">${fmt.currency(d.actual_balance)}</div></div>
        <div><div style="font-size:11px;color:var(--txt3)">Differenza</div><div style="font-size:18px;font-weight:700;color:${diffColor(balDiff)}">${diffStr(balDiff)}</div></div>
      </div>
    </div>
    ${!cats.length ? `<p style="color:var(--txt3);text-align:center">Nessuna categoria salvata.</p>` :
    `<div style="overflow-x:auto">
    <table style="width:100%;border-collapse:collapse">
      <thead><tr>
        <th style="${thS};text-align:left">Categoria</th>
        <th style="${thS};text-align:center">Tipo</th>
        <th style="${thS};text-align:right">Previsto</th>
        <th style="${thS};text-align:right">Reale ad oggi</th>
        <th style="${thS};text-align:right">Differenza</th>
      </tr></thead>
      <tbody>
        ${cats.map(c => {
          const diff = c.diff;
          const rowBg = diff > 0 ? 'rgba(63,185,80,.04)' : diff < 0 ? 'rgba(248,81,73,.04)' : '';
          return `<tr style="background:${rowBg}">
            <td style="${tdS}">${c.category_name}</td>
            <td style="${tdS};text-align:center">
              <span style="font-size:11px;padding:1px 7px;border-radius:8px;background:${c.category_type==='income'?'rgba(63,185,80,.15)':'rgba(248,81,73,.15)'};color:${c.category_type==='income'?'var(--income)':'var(--expense)'}">
                ${c.category_type==='income'?'Entrata':'Uscita'}
              </span>
            </td>
            <td style="${tdS};text-align:right;font-variant-numeric:tabular-nums">${fmt.currency(c.projected_amount)}</td>
            <td style="${tdS};text-align:right;font-variant-numeric:tabular-nums">${fmt.currency(c.actual_amount)}</td>
            <td style="${tdS};text-align:right;font-variant-numeric:tabular-nums;font-weight:600;color:${diffColor(diff)}">${diffStr(diff)}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>`}`;

  openModal(`Preview — previsione al ${fmt.date(d.forecast_date)}`, body, null, null, null, '');
  document.getElementById('modal').style.width = '720px';
}
