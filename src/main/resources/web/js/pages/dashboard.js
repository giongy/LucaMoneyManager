/* ═══════════════════════════════════════════════════════════════════════════
   LucaMoneyManager — pages/dashboard.js
   Pagina Dashboard (estratta da app.js, stadio 7a del refactor)

   Dipendenze esterne (lazy a runtime):
   - _budgetEffective (BUDGET section in app.js)
   - _dashBubbleDetail (BUDGET section, esposto su window)
   - _initGlobalTooltip (INIT/notices in app.js)
   - showTxModal, navigateToTx (TRANSAZIONI in app.js)
   - _budgetTab, _analyticsTab, txFilters (globali in app.js)
   - _todayStr (app.js)
   - charts (router.js)
═══════════════════════════════════════════════════════════════════════════ */

let   _accTypeOrder         = ['checking','savings','cash','credit','investment'];
const _DASH_ACC_TYPE_LABELS = {checking:'Conti Correnti',savings:'Risparmio',cash:'Contanti',credit:'Carte di Credito',investment:'Investimenti'};

// Disegna il widget budget del mese corrente: una riga-barra per categoria foglia
// (barra di progresso speso/budget) divise in Uscite/Entrate, con riga totali in fondo.
function _renderDashBudgetBubbles(budgetYear) {
  const el = document.getElementById('dashBudgetBubbles');
  if (!el) return;

  const { categories = [], budgets = [], configs = [], actuals = [] } = budgetYear;
  const curMonth  = new Date().getMonth() + 1;
  const curYear   = new Date().getFullYear();
  const monthName = new Date(curYear, curMonth - 1).toLocaleString('it-IT', { month: 'long' });

  // Header della card (titolo mese + azioni): condiviso tra stato pieno e stato vuoto (placeholder).
  const _budgetHeader = `
    <div class="card-header">
      <span class="card-title">Budget — ${monthName} ${curYear}</span>
      <div style="display:flex;gap:6px">
        <button class="btn btn-ghost" onclick="navigateToBudgetMese()">Analisi mese corrente →</button>
        <button class="btn btn-ghost" onclick="navigate('budgets')">Gestisci Budget →</button>
      </div>
    </div>`;

  // Effective budget per mese (stessa logica pagina budget)
  const _bMap = {};
  budgets.forEach(b => { if (!_bMap[b.category_id]) _bMap[b.category_id] = {}; _bMap[b.category_id][b.month] = b.amount; });
  const _cfgMap = {};
  configs.forEach(c => { _cfgMap[c.category_id] = c; });
  const _getEff = catId => _budgetEffective(_cfgMap[catId], _bMap[catId] || {});

  // Speso questo mese per categoria
  const actualMap = {};
  actuals.forEach(a => { if (a.month === curMonth) actualMap[a.category_id] = a.total; });

  // Categorie foglia (senza figli)
  const leafCats  = _leafCats(categories);
  const catMap    = Object.fromEntries(categories.map(c => [c.id, c]));

  const allCatData = leafCats.map(c => ({
    ...c,
    budget: _getEff(c.id)[curMonth] || 0,
    actual: actualMap[c.id] || 0,
    parent_name: c.parent_id ? (catMap[c.parent_id]?.name || '') : '',
  }));
  const catData = allCatData.filter(c => c.actual > 0 || c.type === 'income');

  // Nessuna spesa né categoria entrata visibile questo mese: mostra comunque la card con
  // header + placeholder (niente display:none, che lasciava un vuoto a fianco del widget conti).
  if (!catData.length) {
    el.style.display = '';
    el.innerHTML = _budgetHeader + `
      <div style="flex:1;display:flex;align-items:center;justify-content:center;color:var(--txt3);font-size:13px;padding:24px 16px">
        Nessuna transazione nel mese
      </div>`;
    return;
  }
  el.style.display = '';

  // Quota di mese trascorso (0..1). Serve per non segnalare come "sotto target" le entrate
  // che tipicamente arrivano a fine mese (stipendio, assegni): finché il mese non è quasi
  // concluso non ha senso mostrarle in rosso.
  const _daysInMonth = new Date(curYear, curMonth, 0).getDate();
  const _monthElapsed = (new Date().getDate()) / _daysInMonth;
  const _MONTH_END = 0.9;   // "quasi fine mese" oltre il 90% dei giorni trascorsi

  // "bad" = situazione da tenere d'occhio: uscita sopra budget (o senza budget ma con spesa),
  // entrata sotto target ma solo a fine mese. Stessa semantica usata in _barRow per il colore/bordo.
  const _isBad = c => {
    if (c.type === 'income')
      // Entrata sotto target: rilevante solo quando il mese è quasi finito (evita 30 giorni di rosso
      // per stipendio & simili che vengono incassati verso la fine).
      return c.budget > 0 && c.actual < c.budget && _monthElapsed >= _MONTH_END;
    const overNoBudget = c.budget <= 0 && c.actual > 0;                    // uscita senza budget ma spesa
    return (c.budget > 0 && c.actual > c.budget) || overNoBudget;         // uscita sopra budget
  };
  // Severità dello sforamento/scostamento: quanto (in %) ci si discosta dal budget, per ordinare
  // i "bad" dai più gravi ai meno gravi. Le uscite senza budget ma con spesa vanno in cima.
  const _severity = c => {
    if (c.budget <= 0) return c.actual > 0 ? Infinity : 0;
    return c.type === 'income'
      ? (c.budget - c.actual) / c.budget      // entrata: quanto manca al target
      : (c.actual - c.budget) / c.budget;     // uscita: quanto si supera il budget
  };
  // Ordina: prima i "bad" (per severità decrescente), poi le categorie in regola (per budget decrescente).
  // `minorOf`, se passata, sposta parte delle categorie in regola nel gruppo "minor" (riepilogo
  // collassato): serve alle uscite, che a fine mese sarebbero decine di card tutte in regola.
  const _splitSort = (cats, minorOf = null) => {
    const bad = cats.filter(_isBad).sort((a, b) => _severity(b) - _severity(a));
    const okAll = cats.filter(c => !_isBad(c)).sort((a, b) => b.budget - a.budget);
    if (!minorOf) return { bad, ok: okAll, minor: [] };
    return { bad, ok: okAll.filter(c => !minorOf(c)), minor: okAll.filter(minorOf) };
  };
  const expCats = catData.filter(c => c.type === 'expense');
  const incCats = catData.filter(c => c.type === 'income');

  // Quali uscite in regola meritano una card: quelle su cui c'è ancora qualcosa "in gioco".
  //  - "peso": il budget vale ≥ 5% del budget uscite totale (Spesa, Fuori...) — categorie che
  //    muovono il mese, da tenere d'occhio anche quando sono perfettamente in regola;
  //  - "residuo": resta da spendere almeno 50 €, quindi la categoria può ancora sforare.
  // Il criterio è volutamente sull'importo e non sulla percentuale: le spese fisse/una-tantum
  // (Dentista 112/112, TIM 76/76) stanno stabilmente al 100% del loro budget ma sono chiuse,
  // non c'è nulla da sorvegliare — con una soglia percentuale resterebbero sempre visibili.
  // Tutte le altre confluiscono nella riga riepilogo espandibile in fondo alla colonna.
  const _WEIGHT_SHARE = 0.05;   // quota del budget uscite totale sopra cui la categoria è "pesante"
  const _MIN_LEFT     = 50;     // € ancora da spendere sotto cui la categoria è "chiusa"
  const _totExpBudgetAll = allCatData.filter(c => c.type === 'expense').reduce((s, c) => s + c.budget, 0);
  const _isMinorExp = c => {
    const heavy = _totExpBudgetAll > 0 && c.budget / _totExpBudgetAll >= _WEIGHT_SHARE;
    const left  = c.budget > 0 && (c.budget - c.actual) >= _MIN_LEFT;
    return !heavy && !left;
  };
  const expSplit = _splitSort(expCats, _isMinorExp);
  const incSplit = _splitSort(incCats);   // le entrate sono poche: restano tutte visibili

  // Totali: actual solo dalle categorie visibili, budget da tutte le foglie
  const totExpBudget = _totExpBudgetAll;
  const totExpActual = expCats.reduce((s, c) => s + c.actual, 0);
  const totIncBudget = allCatData.filter(c => c.type === 'income').reduce((s, c) => s + c.budget, 0);
  const totIncActual = incCats.reduce((s, c) => s + c.actual, 0);
  const netActual    = totIncActual - totExpActual;
  const netBudget    = totIncBudget - totExpBudget;

  // HTML singola riga-barra (sostituisce la vecchia "bolla" con anello).
  // Layout: [icona] [nome + %] su una riga, barra di progresso sotto, importi reale/budget a destra.
  const _barRow = c => {
    // Budget 0 con uscita reale = sforamento: trattalo come budget valido (colore rosso, rimasto negativo).
    // Per le entrate un budget 0 non è un "mancato target", quindi resta neutro.
    const isExpOverNoBudget = c.type !== 'income' && c.budget <= 0 && c.actual > 0;
    const isIncome = c.type === 'income';

    // pct di riempimento barra (clamp a 100), e pct "reale" per l'etichetta (può superare 100).
    const rawPct  = c.budget > 0 ? (c.actual / c.budget * 100) : (isExpOverNoBudget ? 100 : 0);
    const fillPct = Math.min(rawPct, 100);
    const pctLbl  = c.budget > 0 ? Math.round(rawPct) : (isExpOverNoBudget ? null : null);

    // "bad" = situazione negativa: uscita sopra budget, oppure entrata sotto target (solo a fine mese).
    // Riusa _isBad per restare coerente con l'ordinamento/split in sezioni.
    const bad = _isBad(c);

    const amtColor = c.budget <= 0
      ? (isExpOverNoBudget ? 'var(--expense)' : 'var(--txt3)')
      : isIncome
        ? (c.actual > c.budget ? 'var(--income)' : c.actual < c.budget ? 'var(--expense)' : 'var(--txt3)')
        : (c.actual < c.budget ? 'var(--income)' : c.actual > c.budget ? 'var(--expense)' : 'var(--txt3)');

    const hexColor = c.color?.startsWith('#') ? c.color : null;
    // Colore di riempimento barra: sempre il colore categoria (o accent). Lo sforamento/sotto target
    // è già segnalato dalla card evidenziata (striscia + sfondo rosso), la barra resta col suo colore.
    const barColor = c.actual > 0 ? (hexColor || 'var(--accent)') : 'transparent';

    const catLine   = c.parent_name ? `${c.parent_name} : ${c.name}` : c.name;
    const remaining = c.budget > 0
      ? (isIncome ? c.actual - c.budget : c.budget - c.actual)
      : (isExpOverNoBudget ? c.budget - c.actual : null);

    // Badge % a destra del nome: mostrato solo se c'è un budget; rosso se sforato/sotto target.
    const pctBadge = pctLbl !== null
      ? `<span class="bbar-pct" style="color:${bad ? 'var(--expense)' : 'var(--txt3)'}">${pctLbl}%</span>`
      : '';

    // Sforato/sotto target: striscia rossa a sinistra della card + sfondo rosso tenue (classe .bbar-over).
    const badClass = bad ? ' bbar-over' : '';

    return `<div class="bbar${badClass}" onclick="_dashBubbleDetail(${c.id})"
        data-tt-cat="${esc(catLine)}"
        data-tt-budget="${esc((c.budget > 0 || c.actual > 0) ? fmt.currency(c.budget) : '—')}"
        data-tt-actual="${esc(fmt.currency(c.actual))}"
        data-tt-rem="${esc(remaining !== null ? fmt.currency(remaining) : '—')}"
        data-tt-over="${remaining !== null && remaining < 0 ? '1' : '0'}"
        data-tt-l2="Reale">
      <div class="bbar-head">
        <span class="bbar-icon">${esc(c.icon || '📁')}</span>
        <span class="bbar-name">${esc(c.name)}</span>
        ${pctBadge}
      </div>
      <div class="bbar-track">
        <div class="bbar-fill" data-fill="${fillPct.toFixed(1)}" style="width:0;background-color:${barColor}"></div>
      </div>
      <div class="bbar-amounts">
        <span style="color:${amtColor};font-weight:700">${fmt.currency(c.actual)}</span>
        <span class="bbar-budget">/ ${(c.budget > 0 || c.actual > 0) ? fmt.currency(c.budget) : '—'}</span>
      </div>
    </div>`;
  };

  // Cella totale
  const _tot = (label, actual, budget, color) =>
    `<div style="display:flex;align-items:baseline;gap:6px">
      <span style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--txt3)">${label}</span>
      <span style="font-size:13px;font-weight:700;color:${color}">${fmt.currency(actual)}</span>
      ${budget !== 0 ? `<span style="font-size:11px;color:var(--txt3)">/ ${fmt.currency(budget)}</span>` : ''}
    </div>`;

  const netColor = netActual >= 0 ? 'var(--income)' : 'var(--expense)';

  // Rende una colonna in due sezioni: prima i "bad" (sforati/sotto target), poi un separatore
  // le categorie ok. Se una delle due è vuota, la relativa sezione/separatore sparisce.
  // In fondo, se ci sono categorie "minor" (poco rilevanti, filtrate a monte), una riga
  // riepilogo cliccabile che espande/collassa la loro griglia.
  // gridClass: classe extra per la griglia (es. bbar-grid-inc per le entrate).
  const _renderCol = (split, gridClass) => {
    const minor = split.minor || [];
    if (!split.bad.length && !split.ok.length && !minor.length)
      return `<div style="color:var(--txt3);font-size:12px;padding:8px 0">—</div>`;
    const grid = (rows, extra = '') => `<div class="bbar-grid ${gridClass} ${extra}">${rows.map(_barRow).join('')}</div>`;
    let html = '';
    // Quando ci sono entrambe le sezioni, comprimo il padding verticale attorno al separatore
    // (griglia bad senza padding-bottom, griglia ok senza padding-top) per tenerle vicine.
    const both = split.bad.length && split.ok.length;
    if (split.bad.length) html += grid(split.bad, both ? 'bbar-grid-tight-b' : '');
    if (split.ok.length) {
      // Linea divisoria mostrata solo se ci sono anche dei "bad" sopra da separare (senza etichetta).
      if (both) html += `<div class="bbar-sep"></div>`;
      html += grid(split.ok, both ? 'bbar-grid-tight-t' : '');
    }
    if (minor.length) {
      const mActual = minor.reduce((s, c) => s + c.actual, 0);
      const mBudget = minor.reduce((s, c) => s + c.budget, 0);
      html += `
        <div class="bbar-more" onclick="_dashToggleMinor(this)">
          <span class="bbar-more-caret">▸</span>
          <span class="bbar-more-label">Altre ${minor.length} categorie</span>
          <span class="bbar-more-amt">${fmt.currency(mActual)}</span>
          ${mBudget > 0 ? `<span class="bbar-budget">/ ${fmt.currency(mBudget)}</span>` : ''}
        </div>
        ${grid(minor, 'bbar-grid-minor')}`;
    }
    return html;
  };

  el.innerHTML = _budgetHeader + `
    <div style="padding:0 16px 8px;flex:1;display:flex;flex-direction:column;min-height:0">
      <div class="dash-budget-cols">
        <div class="dash-budget-col-exp">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--txt3);margin-bottom:8px">Uscite</div>
          ${_renderCol(expSplit, '')}
        </div>
        <div class="dash-budget-col-inc">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--txt3);margin-bottom:8px">Entrate</div>
          ${_renderCol(incSplit, 'bbar-grid-inc')}
        </div>
      </div>
    </div>
    <div style="display:flex;justify-content:flex-end;gap:24px;padding:5px 16px;margin-top:auto;border-top:1px solid var(--border)">
      ${expCats.length ? _tot('Uscite',  totExpActual, totExpBudget, 'var(--expense)') : ''}
      ${incCats.length ? _tot('Entrate', totIncActual, totIncBudget, 'var(--income)')  : ''}
      ${expCats.length && incCats.length ? _tot('Netto', netActual, netBudget, netColor) : ''}
    </div>`;

  // Animazione "crescita" delle barre all'avvio: le fill partono da width:0 e, al frame
  // successivo, vengono portate al valore reale — la transition CSS su .bbar-fill anima il riempimento.
  // Doppio rAF per garantire che il browser registri prima lo stato width:0 (evita il salto istantaneo).
  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.querySelectorAll('.bbar-fill').forEach(f => { f.style.width = (f.dataset.fill || '0') + '%'; });
  }));
}

// Espande/collassa la griglia delle categorie "minori" nel widget budget.
// La griglia è il fratello immediato della riga riepilogo; al primo apri anima anche
// le barre, che erano rimaste a width:0 perché nascoste (display:none non fa partire la transition).
function _dashToggleMinor(row) {
  const grid = row.nextElementSibling;
  if (!grid) return;
  const open = row.classList.toggle('open');
  grid.classList.toggle('open', open);
  if (open) requestAnimationFrame(() => requestAnimationFrame(() => {
    grid.querySelectorAll('.bbar-fill').forEach(f => { f.style.width = (f.dataset.fill || '0') + '%'; });
  }));
}

// Inizializza i tooltip (data-tt-*) sulle barre di progresso budget.
// (Le barre sono in griglia a flusso, niente più scroll orizzontale a trascinamento.)
function _initBubbleDrag() {
  _initGlobalTooltip();
}

// Disegna il widget "I miei conti": tabella raggruppata per tipo con saldo, pulsanti rapidi
// (+/−/⇄) e righe totali (conti liquidi + investimenti). Per gli investment il valore in primo
// piano è calcolato con i bond a scadenza (a 100); il valore di mercato reale è mostrato in secondo piano.
function _renderDashAccountsWidget(accounts) {
  const el = document.getElementById('dashAccounts');
  if (!el) return;
  const visibleAccounts = accounts.filter(isAccountVisible);
  const investBalance = visibleAccounts.filter(a => a.type === 'investment').reduce((s,a) => s + (a.balance||0), 0);
  const contiBalance  = visibleAccounts.filter(a => a.type !== 'investment').reduce((s,a) => s + (a.balance||0), 0);
  // Valore investimenti con i bond conteggiati a 100 (a scadenza) invece che a prezzo di mercato.
  const investBalanceAt100 = visibleAccounts.filter(a => a.type === 'investment')
                                            .reduce((s,a) => s + accountBalance100(a), 0);
  // Se non c'è nessuna obbligazione, "a 100" e valore di mercato coincidono: si mostra
  // il saldo secco, senza tooltip né riga "valore reale".
  const hasBonds = visibleAccounts.some(accountHasBonds);
  const visGrouped = {};
  visibleAccounts.forEach(a => { (visGrouped[a.type] = visGrouped[a.type] || []).push(a); });
  const visOrderedTypes = [...new Set([..._accTypeOrder.filter(t => visGrouped[t]), ...Object.keys(visGrouped)])];
  if (!visOrderedTypes.length) {
    el.innerHTML = `<p class="text-muted" style="padding:20px;text-align:center">Nessun conto. <a onclick="navigate('accounts')" style="color:var(--accent);cursor:pointer">Aggiungi un conto →</a></p>`;
    return;
  }
  el.innerHTML = `
    <table class="acc-list-table">
      ${visOrderedTypes.map(t => `
        <tbody>
          <tr class="acc-group-row"><td colspan="3"><span>${_DASH_ACC_TYPE_LABELS[t] || t}</span></td></tr>
          ${visGrouped[t].map(a => `
            <tr class="acc-list-row" onclick="navigateToAccountTx(${a.id})">
              <td>
                <span class="acc-dot" style="background:${esc(a.color||'var(--accent)')}"></span>
                <span class="acc-icon">${esc(a.icon||'')}</span>
                <span class="acc-name">${esc(a.name)}</span>
              </td>
              <td class="acc-bal ${a.balance<0?'neg':''}" style="color:${a.balance<0?'var(--expense)':esc(a.color||'var(--accent)')}"
                  ${accountHasBonds(a) ? `title="Valore con bond a scadenza (a 100). Valore di mercato attuale: ${fmt.currency(a.balance)}"` : ''}>
                ${fmt.currency(accountBalance100(a))}
                ${a.type==='credit'?`<span id="cc-cur-${a.id}" style="display:block;font-size:11px;color:var(--txt2);font-weight:400"></span>`:''}
                ${accountHasBonds(a) ? `<span style="display:block;font-size:10px;color:var(--txt3);font-weight:400">valore reale ${fmt.currency(a.balance)}</span>` : ''}
              </td>
              <td onclick="event.stopPropagation()">
                <div class="acc-quick-btns">
                  <button class="acc-quick-btn acc-quick-exp" title="Aggiungi uscita"  onclick="_dashQuickTx(${a.id},'expense')"><span>−</span></button>
                  <button class="acc-quick-btn acc-quick-inc" title="Aggiungi entrata" onclick="_dashQuickTx(${a.id},'income')"><span>+</span></button>
                  <button class="acc-quick-btn acc-quick-tra" title="Trasferimento"    onclick="_dashQuickTx(${a.id},'transfer')"><span>⇄</span></button>
                </div>
              </td>
            </tr>`).join('')}
        </tbody>`).join('')}
      <tbody>
        <tr class="acc-total-row">
          <td colspan="3">
            <div style="display:flex;align-items:baseline;gap:16px">
              <div style="display:flex;align-items:baseline;gap:6px">
                <span style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--txt3)">Totale Conti</span>
                <span class="acc-bal" style="font-size:13px;font-weight:700;color:${contiBalance<0?'var(--expense)':'var(--income)'}">${fmt.currency(contiBalance)}</span>
              </div>
              ${investBalance !== 0 ? `
              <div style="display:flex;align-items:baseline;gap:6px" ${hasBonds?`title="Valore investimenti con bond a scadenza (a 100). Valore di mercato attuale: ${fmt.currency(investBalance)}"`:''}>
                <span style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--txt3)">Investimenti</span>
                <span class="acc-bal" style="font-size:13px;font-weight:700;color:var(--accent2)">${fmt.currency(investBalanceAt100)}</span>
                ${hasBonds?`<span style="font-size:10px;color:var(--txt3)">· valore reale ${fmt.currency(investBalance)}</span>`:''}
              </div>` : ''}
            </div>
          </td>
        </tr>
      </tbody>
    </table>`;
}

// Pulsante rapido sul widget conti: apre il modale transazione precompilato sul conto/tipo dati.
// Al salvataggio ricarica l'intera dashboard (saldi, bolle budget, stat YTD, ultime tx, grafici),
// non solo il widget conti — così la nuova transazione si riflette ovunque (come "Esegui ora").
window._dashQuickTx = async (accountId, type) => {
  const [cats, accs, tags] = await Promise.all([api.getCategories(), api.getAccounts(), api.getTags()]);
  showTxModal({account_id: accountId, type}, cats, accs, type, tags, () => renderDashboard());
};

// ─── Layout widget dashboard (spostabili + larghezza a scelta) ──────────────
//
// I widget non sono più cablati in righe flex fisse: qui c'è il registro delle card
// (id stabile + corpo HTML) e sotto il layout salvato dall'utente. L'ordine e la
// larghezza vivono in app_settings ('dashboard.layout'), non in una tabella nuova:
// è una singola preferenza dell'utente, la stessa strada di tema e backup.
//
// Il contenuto delle card è invariato rispetto a prima: cambia solo il contenitore,
// che ora è una griglia a 6 colonne invece di 5 righe flex. Le funzioni che riempiono
// i widget dopo il fetch (_fillDashAccounts, i grafici, ecc.) non sono state toccate:
// cercano gli stessi id.

// w = larghezza in PERCENTUALE della riga. I widget di una riga sommano ~100.
// Percentuale e non "taglie fisse": le proporzioni storiche della dashboard erano
// 36/64 e 60/40, non esprimibili con ⅓ ½ ⅔.
const DASH_W_MIN  = 15;   // sotto questa soglia un widget diventa illeggibile
const DASH_W_STEP = 5;    // passo del ridimensionamento a tastiera/click

// Ordine e larghezze di default: riproducono ESATTAMENTE il layout storico della
// dashboard (le percentuali vengono dal CSS che c'era prima dei widget mobili:
// .dash-accounts-card 36%, .dash-upcoming-card 60%, il resto in parti uguali).
// rowH: altezza della riga; le prime due card storicamente erano a contenuto libero
// (nessuna altezza fissata), le righe grafico avevano --dash-row-h = 400px.
const DASH_DEFAULT_LAYOUT = [
  { id: 'accounts',    row: 0, w: 36 },
  { id: 'bubbles',     row: 0, w: 64 },
  { id: 'upcoming',    row: 1, w: 60, rowH: 400 },
  { id: 'budgetchart', row: 1, w: 40 },
  { id: 'topcat',      row: 2, w: 50, rowH: 400 },
  { id: 'recent',      row: 2, w: 50 },
  { id: 'donut',       row: 3, w: 34, rowH: 400 },
  { id: 'barchart',    row: 3, w: 33 },
  { id: 'savings',     row: 3, w: 33 },
];

// Registro dei widget: id → titolo (per il menu) e corpo HTML.
// `tall` marca le card che vogliono l'altezza fissa delle righe grafico (--dash-row-h).
function _dashWidgetDefs(dashYear) {
  return {
    accounts: { title: 'I miei conti', html: `
      <div class="card-header"><span class="card-title">I miei conti</span>
        <button class="btn btn-ghost" onclick="navigate('accounts')">Gestisci →</button>
      </div>
      <div id="dashAccounts"></div>` },

    bubbles: { title: 'Bolle budget', raw: true, html: '' },

    upcoming: { title: '🗓️ Prossime pianificate', tall: true, cls: 'dash-upcoming-card', html: `
      <div class="card-header">
        <span class="card-title">🗓️ Prossime pianificate</span>
        <button class="btn btn-ghost" onclick="navigate('scheduled')">Gestisci →</button>
      </div>
      <div class="table-wrap"><table><thead><tr>
        <th>Categoria</th><th>Descrizione</th><th>Giorni</th><th class="text-right">Importo</th><th style="width:24px"></th>
      </tr></thead><tbody id="upcomingRows"></tbody></table></div>` },

    budgetchart: { title: `Budget vs Reale ${dashYear}`, tall: true,
      attrs: `style="cursor:pointer" onclick="_budgetTab='andamento';navigate('budgets')"`, html: `
      <div class="card-header"><span class="card-title">Budget vs Reale ${dashYear}</span></div>
      <div class="dash-chart-wrap"><canvas id="budgetChart"></canvas></div>` },

    topcat: { title: 'Top categorie spesa', tall: true,
      attrs: `style="cursor:pointer" onclick="_analyticsTab='catmonth';navigate('analytics')"`, html: `
      <div class="card-header"><span class="card-title">Top categorie spesa - Anno corrente</span></div>
      <div class="dash-chart-wrap"><canvas id="topCatChart"></canvas></div>` },

    recent: { title: 'Ultime transazioni', tall: true, cls: 'dash-recent-card', html: `
      <div class="card-header">
        <span class="card-title">Ultime transazioni</span>
        <button class="btn btn-ghost" onclick="txFilters={range:txFilters.range};navigate('transactions')">Vedi tutte →</button>
      </div>
      <div class="table-wrap"><table><thead><tr>
        <th>Data</th><th>Descrizione</th><th>Categoria</th><th>Conto</th><th class="text-right">Importo</th>
      </tr></thead><tbody id="recentRows"></tbody></table></div>` },

    donut: { title: 'Uscite del mese corrente', tall: true, id: 'dashMonthDonutCard',
      attrs: `style="cursor:pointer" onclick="_analyticsTab='catmonth';navigate('analytics')" title="Uscite per categoria — mese corrente"`, html: `
      <div class="card-header">
        <span class="card-title">Uscite del mese corrente</span>
        <span style="font-size:11px;color:var(--txt3);font-weight:400" id="dashMonthDonutTot"></span>
      </div>
      <div id="dashMonthDonutBody" style="flex:1;display:flex;flex-direction:column;padding:4px 16px 12px;min-height:0"></div>` },

    barchart: { title: `Entrate vs Uscite ${dashYear}`, tall: true,
      attrs: `style="cursor:pointer" onclick="_analyticsTab='balance';navigate('analytics')"`, html: `
      <div class="card-header"><span class="card-title">Entrate vs Uscite ${dashYear}</span></div>
      <div class="dash-chart-wrap"><canvas id="barChart"></canvas></div>` },

    savings: { title: 'Risparmio mensile', tall: true, html: `
      <div class="card-header"><span class="card-title">Risparmio mensile</span></div>
      <div class="dash-chart-wrap"><canvas id="savingsChart"></canvas></div>` },
  };
}

// Layout corrente (in memoria). Caricato da app_settings al primo render.
let _dashLayout = null;

// Modalità modifica layout. Fuori da questa modalità la dashboard è "sola lettura":
// niente maniglie, niente selettori larghezza, e le card restano cliccabili come sempre.
// È di sessione (non salvata): si riparte sempre in visualizzazione normale.
let _dashEditMode = false;

/** Riempie il comando "Personalizza" in titlebar. Vive lì (e non sopra la griglia)
 *  per non rubare una riga di altezza alla dashboard in permanenza.
 *  Va nascosto sulle altre pagine: la titlebar è condivisa da tutta l'app. */
function _syncDashEditBar() {
  const bar = document.getElementById('dashEditBar');
  if (!bar) return;
  if (currentPage !== 'dashboard') { bar.style.display = 'none'; bar.innerHTML = ''; return; }
  bar.style.display = '';
  bar.innerHTML = _dashEditMode
    ? `<span class="tb-dash-hint">✋ trascina i widget per riordinarli · i bordi per ridimensionarli</span>
       <div class="tb-item" onclick="resetDashLayout()" title="Torna all'ordine e alle larghezze originali">↺<span class="tb-label">Ripristina</span></div>
       <div class="tb-item tb-dash-done" onclick="toggleDashEdit(false)" title="Esci dalla personalizzazione">✓<span class="tb-label">Fatto</span></div>`
    : `<div class="tb-item" onclick="toggleDashEdit(true)" title="Sposta i widget e cambiane la larghezza">⚙️<span class="tb-label">Personalizza</span></div>`;
}

/** Entra/esce dalla modalità modifica. */
window.toggleDashEdit = (on) => {
  _dashEditMode = !!on;
  renderDashboard();
};

/** Fonde il layout salvato coi default: i widget nuovi (aggiunti da una versione
 *  successiva) vengono accodati invece di sparire, e gli id non più esistenti si
 *  scartano. Senza questo, aggiungere un widget lo renderebbe invisibile a chiunque
 *  abbia già salvato un layout. */
function _mergeDashLayout(saved, defs) {
  const valid = (saved || []).filter(it => defs[it.id]);
  const seen  = new Set(valid.map(it => it.id));
  // Copie: gli oggetti di DASH_DEFAULT_LAYOUT non devono mai finire nel layout vivo,
  // altrimenti salvare un'altezza li modificherebbe e i "default" non sarebbero più tali.
  const added = DASH_DEFAULT_LAYOUT.filter(d => !seen.has(d.id) && defs[d.id]).map(d => ({ ...d }));
  const out   = [...valid, ...added];
  return out.length ? out : DASH_DEFAULT_LAYOUT.filter(d => defs[d.id]).map(d => ({ ...d }));
}

/** Raggruppa i widget per riga.
 *
 *  La riga è un dato ESPLICITO (campo `row`), non dedotto dalla somma delle larghezze.
 *  Con le righe implicite un widget spostato a metà lista faceva slittare a catena tutte
 *  le righe successive, e non c'era modo di aggiungere un terzo widget a una riga piena:
 *  la somma sforava il 100% e qualcun altro veniva spinto a capo.
 *
 *  I layout salvati prima di questo cambiamento non hanno `row`: si ricostruisce con la
 *  vecchia regola (accumulo fino a 100) così nessuno perde la propria disposizione. */
function _dashRows(layout) {
  if (layout.some(it => it.row === undefined)) _assignDashRows(layout);
  const byRow = new Map();
  for (const item of layout) {
    if (!byRow.has(item.row)) byRow.set(item.row, []);
    byRow.get(item.row).push(item);
  }
  return [...byRow.keys()].sort((a, b) => a - b).map(k => byRow.get(k));
}

/** Assegna il campo `row` mancante usando la vecchia regola implicita (migrazione). */
function _assignDashRows(layout) {
  let r = 0, used = 0;
  for (const item of layout) {
    const w = item.w || 50;
    if (used + w > 101 && used > 0) { r++; used = 0; }
    item.row = r; used += w;
  }
}

/** Rinumera le righe 0..N-1 eliminando i buchi lasciati dalle righe svuotate. */
function _compactDashRows(layout) {
  const uniq = [...new Set(layout.map(it => it.row))].sort((a, b) => a - b);
  const map = new Map(uniq.map((r, i) => [r, i]));
  layout.forEach(it => { it.row = map.get(it.row); });
  // L'ordine nell'array deve rispecchiare quello visivo: il drag&drop e il salvataggio
  // si basano sulla sequenza, e una lista fuori ordine produrrebbe spostamenti erratici.
  layout.sort((a, b) => a.row - b.row);
}

/** HTML di tutti i widget, raggruppati per riga.
 *  Le colonne sono percentuali esplicite (grid-template-columns), così una riga può
 *  avere proporzioni qualsiasi — 36/64 come in origine, o quelle scelte trascinando. */
function _renderDashWidgets(dashYear) {
  const defs = _dashWidgetDefs(dashYear);
  _dashLayout = _mergeDashLayout(_dashLayout, defs);
  return _dashRows(_dashLayout).map((row, ri) => {
    // Altezza salvata sul primo widget della riga; se assente la riga si adatta al
    // contenuto (com'era la prima riga storicamente).
    const rowH = row.find(it => it.rowH)?.rowH;
    // Le percentuali sommano 100, ma fra le colonne ci sono i gap: senza sottrarli la
    // riga risulta più larga del contenitore e l'ultima card sfora oltre il bordo destro
    // (misurato: -5px, mentre le stat card in alto rientrano di 15). Ogni colonna cede
    // la propria quota del gap complessivo.
    const gapShare = row.length > 1 ? `var(--dash-gap) * ${row.length - 1} / ${row.length}` : '0px';
    const cols = row.map(it => `calc(${it.w}% - (${gapShare}))`).join(' ');
    const cards = row.map(item => {
      const d = defs[item.id];
      if (!d) return '';
      const domId = d.id ? ` id="${d.id}"` : (item.id === 'bubbles' ? ' id="dashBudgetBubbles"' : '');
      // Maniglia e barra larghezze NON stanno qui: alcuni widget (le bolle budget) si
      // ridisegnano riscrivendo l'innerHTML della card e le cancellerebbero. Le aggiunge
      // _initDashDnD() dopo che i widget sono stati riempiti.
      return `<div class="card${d.cls ? ' ' + d.cls : ''}" data-wid="${item.id}"${domId} ${d.attrs || ''}>${d.html}</div>`;
    }).join('');
    // Separatori di ridimensionamento: esistono SOLO in modalità Personalizza. Fuori, la
    // dashboard è inerte — niente zone di presa invisibili in cui inciampare mentre la si
    // usa normalmente.
    // Stanno fuori dal flusso della griglia (position:absolute): occupando una colonna
    // falserebbero le percentuali. La posizione è la somma delle larghezze a sinistra.
    let acc = 0;
    const seps = !_dashEditMode ? '' : row.slice(0, -1).map((it, ci) => {
      acc += it.w;
      return `<div class="dash-col-resize" data-row="${ri}" data-col="${ci}" style="left:${acc}%"
                   title="Trascina per cambiare la larghezza"></div>`;
    }).join('');
    const rowSep = _dashEditMode
      ? `<div class="dash-row-resize" data-row="${ri}" title="Trascina per cambiare l'altezza della riga"></div>`
      : '';
    return `<div class="dash-row" data-row="${ri}" style="grid-template-columns:${cols}${rowH ? `;height:${rowH}px` : ''}">${cards}${seps}${rowSep}</div>`;
  }).join('');
}

/** Salva il layout in app_settings (una sola chiave JSON, niente tabella nuova). */
async function _saveDashLayout() {
  try { await api.setSetting('dashboard.layout', JSON.stringify(_dashLayout)); }
  catch (e) { console.error('salvataggio layout dashboard', e); toast('Layout non salvato: ' + (e?.message || e), 'error'); }
}

/** Legge il layout salvato. Chiamata una volta prima del primo render. */
async function _loadDashLayout() {
  if (_dashLayout) return;
  try {
    const s = await api.getSettings();
    const raw = s['dashboard.layout'];
    // JSON malformato (modifica a mano, sync a metà): si riparte dai default invece
    // di lasciare la dashboard vuota.
    if (raw) { try { _dashLayout = JSON.parse(raw); } catch { _dashLayout = null; } }
  } catch (e) { console.error('lettura layout dashboard', e); }
}

/** Ripristina ordine, larghezze e altezze di fabbrica.
 *  Copia PROFONDA: con slice() gli oggetti restano condivisi con DASH_DEFAULT_LAYOUT, e
 *  un rowH salvato dopo un reset finirebbe dentro i default per il resto della sessione. */
window.resetDashLayout = async () => {
  _dashLayout = DASH_DEFAULT_LAYOUT.map(d => ({ ...d }));
  await _saveDashLayout();
  renderDashboard();
  toast('Layout ripristinato');
};


/**
 * Sposta un widget accanto a un altro, facendogli SPAZIO nella riga di destinazione.
 *
 * <p>Il solo riordino della lista non bastava: le righe nascono dalla somma delle
 * larghezze, quindi trascinare un widget da 50% in una riga già piena (50+50) sforava
 * il 100% e lo spingeva a capo, buttando fuori un altro widget. Era impossibile
 * passare da 2 a 3 widget su una riga.
 *
 * <p>Qui invece le due righe coinvolte vengono rinormalizzate: la destinazione
 * ridistribuisce lo spazio fra i suoi widget (in proporzione, così le differenze
 * volute restano), l'origine si richiude sullo spazio lasciato libero.
 *
 * @param wid      id del widget trascinato
 * @param targetId id del widget su cui è stato rilasciato
 * @param after    true se rilasciato sulla metà destra del bersaglio
 */
function _moveDashWidget(wid, targetId, after) {
  _dashRows(_dashLayout);                       // garantisce il campo row su tutti
  const moved  = _dashLayout.find(x => x.id === wid);
  const target = _dashLayout.find(x => x.id === targetId);
  if (!moved || !target || moved === target) return;

  const srcRowIdx = moved.row;
  const dstRowIdx = target.row;

  // Tetto di widget per riga: col minimo leggibile del 15% oltre 6 la riga sforerebbe
  // il 100% (il minimo vince sulla normalizzazione) e sfonderebbe la larghezza. Meglio
  // rifiutare lo spostamento che produrre un layout rotto.
  if (srcRowIdx !== dstRowIdx) {
    const dstCount = _dashLayout.filter(it => it.row === dstRowIdx).length;
    if (dstCount >= Math.floor(100 / DASH_W_MIN)) {
      toast('Riga piena: sposta prima un widget altrove', 'error');
      return;
    }
  }

  // Riga di destinazione: il widget vi entra accanto al bersaglio. L'ordine dentro la
  // riga è quello dell'array, quindi si reinserisce nella posizione giusta.
  _dashLayout.splice(_dashLayout.indexOf(moved), 1);
  let at = _dashLayout.indexOf(target) + (after ? 1 : 0);
  moved.row = dstRowIdx;
  _dashLayout.splice(at, 0, moved);

  // Le due righe coinvolte tornano a sommare 100: la destinazione fa spazio al nuovo
  // arrivato, l'origine si richiude sullo spazio lasciato libero.
  const rows = _dashRows(_dashLayout);
  _normalizeDashRow(rows.find(r => r[0]?.row === dstRowIdx) || []);
  const src = rows.find(r => r[0]?.row === srcRowIdx);
  if (src && src.length) _normalizeDashRow(src);

  _compactDashRows(_dashLayout);                // la riga d'origine può essersi svuotata
}

/** Porta a 100 la somma delle larghezze di una riga, in proporzione a quelle attuali
 *  (così le proporzioni scelte dall'utente restano) e mai sotto il minimo leggibile.
 *  Se i minimi non ci stanno tutti (riga troppo affollata) si ripiega su parti uguali:
 *  meglio widget stretti ma uniformi che una riga che sfora il 100% e sfonda. */
function _normalizeDashRow(row) {
  if (!row.length) return;
  if (row.length * DASH_W_MIN > 100) {
    const eq = Math.floor(100 / row.length);
    row.forEach((it, i) => { it.w = i === row.length - 1 ? 100 - eq * (row.length - 1) : eq; });
    return;
  }
  const tot = row.reduce((s, it) => s + (it.w || 0), 0) || 1;
  let acc = 0;
  row.forEach((it, i) => {
    if (i === row.length - 1) { it.w = Math.max(DASH_W_MIN, 100 - acc); return; }
    // Il massimo lascia spazio ai widget rimanenti al loro minimo: senza, uno molto
    // largo si prenderebbe quasi tutto e gli altri sforerebbero.
    const maxW = 100 - acc - DASH_W_MIN * (row.length - 1 - i);
    it.w = Math.min(maxW, Math.max(DASH_W_MIN, Math.round((it.w || 0) / tot * 100)));
    acc += it.w;
  });
}

/** Ridimensionamento in larghezza: si trascina il separatore fra due widget della
 *  stessa riga. Lo spazio si sposta da una card all'altra (somma della riga invariata),
 *  quindi le altre card non si muovono. Passo libero, con un minimo per non ridurre
 *  un widget a una fessura illeggibile. */
function _initDashColResize() {
  const grid = document.getElementById('dashGrid');
  if (!grid) return;
  grid.querySelectorAll('.dash-col-resize').forEach(sep => {
    sep.addEventListener('mousedown', e => {
      e.preventDefault(); e.stopPropagation();
      const rowEl = sep.closest('.dash-row');
      const rows  = _dashRows(_dashLayout);
      const row   = rows[parseInt(sep.dataset.row)];
      const ci    = parseInt(sep.dataset.col);
      if (!rowEl || !row || !row[ci] || !row[ci + 1]) return;

      const startX = e.clientX;
      const rowW   = rowEl.getBoundingClientRect().width;
      const wA0    = row[ci].w, wB0 = row[ci + 1].w;
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'ew-resize';

      const onMove = ev => {
        // Delta in percentuale della riga: ciò che A guadagna, B lo perde.
        let d = ((ev.clientX - startX) / rowW) * 100;
        d = Math.max(DASH_W_MIN - wA0, Math.min(wB0 - DASH_W_MIN, d));
        const wA = Math.round(wA0 + d), wB = Math.round(wB0 - d);
        row[ci].w = wA; row[ci + 1].w = wB;
        // Stessa formula del render: le percentuali vanno al netto dei gap (vedi
        // _renderDashWidgets), altrimenti trascinando la riga sforerebbe a destra.
        const gs = row.length > 1 ? `var(--dash-gap) * ${row.length - 1} / ${row.length}` : '0px';
        rowEl.style.gridTemplateColumns = row.map(it => `calc(${it.w}% - (${gs}))`).join(' ');
        // I separatori sono in absolute: vanno riposizionati insieme alle colonne.
        let a = 0;
        [...rowEl.querySelectorAll('.dash-col-resize')].forEach((s, i) => {
          a += row[i].w; s.style.left = a + '%';
        });
      };
      const onUp = async () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        await _saveDashLayout();
        _resizeDashCharts();
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  });
}

/** Ridimensionamento in altezza delle righe: si trascina il bordo inferiore.
 *  L'altezza si salva sul PRIMO widget della riga (campo rowH). Le righe non hanno un
 *  id proprio — nascono dalle larghezze — quindi ancorarla a un indice si romperebbe
 *  appena si sposta un widget; ancorata al widget, segue il layout.
 *  I separatori esistono solo in modalità Personalizza (vedi _renderDashWidgets). */
function _initDashRowResize() {
  const grid = document.getElementById('dashGrid');
  if (!grid) return;
  grid.querySelectorAll('.dash-row-resize').forEach(hnd => {
    hnd.addEventListener('mousedown', e => {
      e.preventDefault();
      const row = hnd.closest('.dash-row');
      if (!row) return;
      const startY = e.clientY;
      const startH = row.getBoundingClientRect().height;
      row.classList.add('dash-row-resizing');
      // Durante il trascinamento il cursore non deve cambiare passando sopra le card,
      // e il testo non deve selezionarsi: entrambi rendono il gesto scattoso.
      const prevUserSelect = document.body.style.userSelect;
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'ns-resize';

      const onMove = ev => {
        const h = Math.max(120, Math.round(startH + (ev.clientY - startY)));
        row.style.height = h + 'px';
      };
      const onUp = async () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        row.classList.remove('dash-row-resizing');
        document.body.style.userSelect = prevUserSelect;
        document.body.style.cursor = '';
        // Altezza salvata sul primo widget della riga.
        const firstWid = row.querySelector('[data-wid]')?.dataset.wid;
        const item = _dashLayout.find(x => x.id === firstWid);
        if (item) {
          item.rowH = Math.round(row.getBoundingClientRect().height);
          // Gli altri widget della riga non devono portarsi dietro una vecchia altezza:
          // se poi diventano primi di riga la applicherebbero a sproposito.
          [...row.querySelectorAll('[data-wid]')].slice(1).forEach(c => {
            const other = _dashLayout.find(x => x.id === c.dataset.wid);
            if (other) delete other.rowH;
          });
          await _saveDashLayout();
        }
        // I grafici Chart.js non si riadattano da soli a un contenitore ridimensionato.
        _resizeDashCharts();
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  });
}

/** Riadatta i grafici Chart.js dopo un cambio di altezza della riga che li contiene:
 *  con responsive:true si riadattano al resize della finestra, non a quello di un
 *  contenitore mosso via JS. */
function _resizeDashCharts() {
  try { Object.values(charts || {}).forEach(c => c?.resize?.()); } catch {}
}

/** Drag & drop per riordinare + menu contestuale per la larghezza.
 *  Il drag parte solo dalla maniglia: le card contengono tabelle, bottoni e grafici
 *  cliccabili, e renderle interamente trascinabili romperebbe quelle interazioni. */
function _initDashDnD() {
  const grid = document.getElementById('dashGrid');
  if (!grid) return;
  let dragged = null;

  // Fuori dalla modalità modifica la dashboard resta com'era: nessuna maniglia, nessun
  // selettore, card cliccabili senza interferenze.
  if (!_dashEditMode) return;

  grid.querySelectorAll('[data-wid]').forEach(card => {
    // Maniglia e selettore creati qui e non nell'HTML del widget: i widget che si
    // ridisegnano da soli riscrivendo l'innerHTML della card (bolle budget) li
    // cancellerebbero, e quella card resterebbe l'unica non modificabile.
    let handle = card.querySelector(':scope > .dash-drag-handle');
    if (!handle) {
      handle = document.createElement('div');
      handle.className = 'dash-drag-handle';
      handle.title = 'Trascina per spostare';
      handle.textContent = '⠿ trascina';
      card.appendChild(handle);
    }
    handle.addEventListener('mousedown', () => { card.draggable = true; });
    card.addEventListener('dragend',     () => { card.draggable = false; dragged = null;
                                                 grid.querySelectorAll('.dash-drop-target').forEach(c => c.classList.remove('dash-drop-target')); });
    card.addEventListener('dragstart', e => {
      dragged = card;
      e.dataTransfer.effectAllowed = 'move';
      // Firefox non avvia il drag senza dati impostati.
      e.dataTransfer.setData('text/plain', card.dataset.wid);
    });
    card.addEventListener('dragover', e => {
      if (!dragged || dragged === card) return;
      e.preventDefault();
      card.classList.add('dash-drop-target');
    });
    card.addEventListener('dragleave', () => card.classList.remove('dash-drop-target'));
    card.addEventListener('drop', async e => {
      e.preventDefault();
      card.classList.remove('dash-drop-target');
      if (!dragged || dragged === card) return;
      // Lato del bersaglio su cui si rilascia: sinistra = prima, destra = dopo. Senza
      // questo non si potrebbe inserire in coda a una riga (si finirebbe sempre prima
      // del bersaglio) e certi accostamenti sarebbero irraggiungibili.
      const r = card.getBoundingClientRect();
      const after = (e.clientX - r.left) > r.width / 2;
      _moveDashWidget(dragged.dataset.wid, card.dataset.wid, after);
      await _saveDashLayout();
      renderDashboard();
    });
  });
}

// Disegna l'intera Dashboard: stat cards YTD (con sparkline e confronto YoY day-exact),
// widget conti, bolle budget, salute finanziaria, prossime pianificate, ultime transazioni
// e i grafici (entrate/uscite, budget vs reale, risparmio, top categorie).
async function renderDashboard() {
  await _loadDashLayout();
  // Invalida la cache conti: se il DB è stato aggiornato esternamente (sync OneDrive dal
  // telefono) i saldi in _accountsCache sarebbero stale. Ricaricando la dashboard vogliamo
  // sempre saldi freschi nel widget "I miei conti".
  api._invalidateAccounts();
  api.getDbPath().then(r => {
    const el = document.getElementById('pageTitleSub');
    if (el) el.textContent = '(' + r.path + ')' + (window._appVersion ? '  v' + window._appVersion : '');
  }).catch(() => {});
  const dashYear = new Date().getFullYear();
  const pg = document.getElementById('pg-dashboard');
  pg.innerHTML = `
    <div class="stats-grid" id="statsGrid"></div>
    <div class="dash-grid${_dashEditMode ? ' dash-editing' : ''}" id="dashGrid">${_renderDashWidgets(dashYear)}</div>`;
  _syncDashEditBar();

  // Day-exact YTD: 1 gen → oggi (entrambi gli anni allo stesso giorno-mese)
  // Confronto onesto considerando che il mese corrente è quasi sempre incompleto
  // (es. utente con entrate/uscite fisse a fine mese).
  const _today = new Date();
  const _pad = n => String(n).padStart(2, '0');
  const _ymd = (y, m, d) => `${y}-${_pad(m)}-${_pad(d)}`;
  const todayStr   = _ymd(_today.getFullYear(),     _today.getMonth() + 1, _today.getDate());
  const prevDayStr = _ymd(_today.getFullYear() - 1, _today.getMonth() + 1, _today.getDate());

  const [stats, accounts, recent, monthly, catData, upcoming, budgetYear, prevMonthly, ytdCurStats, ytdPrevStats] = await Promise.all([
    api.getDashboardStats(dashYear),
    api.getAccounts(),
    api.getTransactions({limit:12, sort_desc:true}),
    api.getMonthlyChartData(dashYear),
    api.getCategoryChartData(dashYear, 'expense'),
    api.getUpcomingAll(10),
    api.getBudgetYear(dashYear),
    api.getMonthlyChartData(dashYear - 1),
    api.getStatsByDateRange(`${dashYear}-01-01`,   todayStr),
    api.getStatsByDateRange(`${dashYear-1}-01-01`, prevDayStr),
  ]);

  // Cache upcoming per "Esegui ora" inline
  window._dashUpcomingCache = upcoming;

  // ── Cumulativo YTD per stat cards (day-exact: ultimo punto = oggi vs stesso giorno anno scorso) ────────
  const curMonthIdx = _today.getMonth();  // 0..11
  // Cumulativo: mesi completi 1..(curMonthIdx-1) dai dati monthly, poi punto finale = totale YTD esatto.
  // Per il confronto YoY, il "punto finale" è day-exact (somma fino a oggi vs stesso giorno anno scorso).
  // Costruisce la serie cumulativa: mesi completi dai dati mensili + ultimo punto = totale YTD
  // esatto (day-exact), così l'ultimo segmento confronta "fino a oggi" vs stesso giorno anno scorso.
  const _buildCumDayExact = (monthlyData, getter, ytdTotal) => {
    const monthly12 = Array(12).fill(0);
    monthlyData.forEach(r => monthly12[r.month - 1] = getter(r) || 0);
    const cum = [0];
    let acc = 0;
    // Mesi completi (fino al mese precedente al corrente)
    for (let i = 0; i < curMonthIdx; i++) { acc += monthly12[i]; cum.push(acc); }
    // Ultimo punto = totale YTD esatto (sostituisce il mese corrente parziale con il dato puntuale)
    cum.push(ytdTotal);
    return cum;
  };

  // YTD valori day-exact dal backend
  const ytdInc     = Number(ytdCurStats.income)    || 0;
  const ytdExp     = Number(ytdCurStats.expenses)  || 0;
  const ytdNet     = ytdInc - ytdExp;
  const prevYtdInc = Number(ytdPrevStats.income)   || 0;
  const prevYtdExp = Number(ytdPrevStats.expenses) || 0;
  const prevYtdNet = prevYtdInc - prevYtdExp;

  const cumIncCur  = _buildCumDayExact(monthly,     r => r.income,                              ytdInc);
  const cumIncPrev = _buildCumDayExact(prevMonthly, r => r.income,                              prevYtdInc);
  const cumExpCur  = _buildCumDayExact(monthly,     r => r.expenses,                            ytdExp);
  const cumExpPrev = _buildCumDayExact(prevMonthly, r => r.expenses,                            prevYtdExp);
  const cumNetCur  = _buildCumDayExact(monthly,     r => (r.income || 0) - (r.expenses || 0),  ytdNet);
  const cumNetPrev = _buildCumDayExact(prevMonthly, r => (r.income || 0) - (r.expenses || 0),  prevYtdNet);

  const trend = (cur, prev) => prev ? ((cur - prev) / Math.abs(prev)) * 100 : null;
  const trendInc = trend(ytdInc, prevYtdInc);
  const trendExp = trend(ytdExp, prevYtdExp);
  const trendNet = trend(ytdNet, prevYtdNet);

  // Colori semantici della linea solida: verde se trend "buono", rosso se "cattivo"
  const GREEN = 'rgba(63,185,80,.95)';
  const RED   = 'rgba(248,81,73,.95)';
  const NEUT  = 'var(--txt2)';
  const incColor = trendInc == null ? NEUT : (trendInc >= 0 ? GREEN : RED);
  const expColor = trendExp == null ? NEUT : (trendExp <= 0 ? GREEN : RED);
  const netColor = trendNet == null ? NEUT : (trendNet >= 0 ? GREEN : RED);

  // Label periodo day-exact: "1 gen → 24 mag" = range esatto del confronto YTD
  const _MONTHS_IT_SHORT = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
  const ytdLabel = `1 gen → ${_today.getDate()} ${_MONTHS_IT_SHORT[curMonthIdx]}`;

  // Range per atterraggio su Bilancio Mensile (gen → mese corrente dell'anno mostrato)
  const navStartYm = `${dashYear}-01`;
  const navEndYm   = `${dashYear}-${String(curMonthIdx+1).padStart(2,'0')}`;
  const navHandler = `onclick="window.navigateToBalanceCompare('${navStartYm}','${navEndYm}')"`;
  const navTitle   = `Confronto cumulativo ${ytdLabel} ${dashYear} (solida) vs stessi mesi ${dashYear-1} (tratteggiata). Clicca per aprire il Bilancio Mensile.`;
  const navStyle   = `cursor:pointer`;

  // Stat cards (con sparkline a destra del numero e trend YoY)
  // Composizione del Saldo Totale (bond a 100): bond a scadenza + azioni a mercato + altri conti (liquidità).
  // azioni a mercato = valore mercato investimenti − valore mercato bond; altri conti = saldo totale − investimenti a mercato.
  const _sbBondNom  = stats.bond_nominal_total || 0;
  const _sbAzioni   = (stats.invest_market_total || 0) - (stats.bond_market_total || 0);
  const _sbAltri    = stats.balance - (stats.invest_market_total || 0);
  const _sbTot100   = stats.balance - (stats.bond_market_total || 0) + _sbBondNom;
  // Formato decimale it-IT senza simbolo € (per la riga di composizione del saldo).
  const _sbFmt = v => new Intl.NumberFormat('it-IT', {minimumFractionDigits:2, maximumFractionDigits:2}).format(v ?? 0);
  document.getElementById('statsGrid').innerHTML = `
    <div class="stat-card stat-balance" ${_sbBondNom>0?`title="Saldo con bond a scadenza (a 100). Valore di mercato attuale: ${fmt.currency(stats.balance)}"`:''}>
      <div class="stat-label">💳 Saldo Totale</div>
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center">
        <div class="stat-value">${fmt.currencyRich(_sbBondNom>0 ? _sbTot100 : stats.balance)}</div>
        <div class="stat-sub" style="color:var(--txt3)">${_sbBondNom>0
          ? `bond(100%): ${_sbFmt(_sbBondNom)} + azioni: ${_sbFmt(_sbAzioni)} + altri conti: ${_sbFmt(_sbAltri)}`
          : 'Tutti i conti'}</div>
      </div>
    </div>
    <div class="stat-card stat-income" ${navHandler} title="${navTitle}" style="${navStyle}">
      <div class="stat-label">📥 Entrate ${dashYear}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
        <div class="stat-value" style="min-width:0;flex:1">${fmt.currencyRich(stats.income)}</div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex-shrink:0">
          ${cumulativeCompareSvg(cumIncCur, cumIncPrev, incColor, 118, 32)}
          <div style="font-size:10px;line-height:1.3;text-align:right;white-space:nowrap">
            ${trendBadge(trendInc, true)}
            ${trendInc != null ? `<div style="color:var(--txt3);font-size:9px">${ytdLabel} vs ${dashYear-1}</div>` : ''}
          </div>
        </div>
      </div>
    </div>
    <div class="stat-card stat-expense" ${navHandler} title="${navTitle}" style="${navStyle}">
      <div class="stat-label">📤 Uscite ${dashYear}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
        <div class="stat-value" style="min-width:0;flex:1">${fmt.currencyRich(stats.expenses)}</div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex-shrink:0">
          ${cumulativeCompareSvg(cumExpCur, cumExpPrev, expColor, 118, 32)}
          <div style="font-size:10px;line-height:1.3;text-align:right;white-space:nowrap">
            ${trendBadge(trendExp, false)}
            ${trendExp != null ? `<div style="color:var(--txt3);font-size:9px">${ytdLabel} vs ${dashYear-1}</div>` : ''}
          </div>
        </div>
      </div>
    </div>
    <div class="stat-card stat-net" ${navHandler} title="${navTitle}" style="${navStyle}">
      <div class="stat-label">💰 Risparmio Netto ${dashYear}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
        <div style="min-width:0;flex:1">
          <div class="stat-value" style="color:${stats.net>=0?'var(--income)':'var(--expense)'}">${fmt.currencyRich(stats.net)}</div>
          <div class="stat-sub" style="font-size:11px;color:var(--txt3)">${stats.transaction_count} tx</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex-shrink:0">
          ${cumulativeCompareSvg(cumNetCur, cumNetPrev, netColor, 118, 32)}
          <div style="font-size:10px;line-height:1.3;text-align:right;white-space:nowrap">
            ${trendBadge(trendNet, true)}
            ${trendNet != null ? `<div style="color:var(--txt3);font-size:9px">${ytdLabel} vs ${dashYear-1}</div>` : ''}
          </div>
        </div>
      </div>
    </div>`;

  _renderDashAccountsWidget(accounts);
  _fillCreditMonthDash(accounts);
  _renderDashBudgetBubbles(budgetYear);
  _initBubbleDrag();
  // Dopo che i widget si sono disegnati: _renderDashBudgetBubbles riscrive l'innerHTML
  // della sua card, quindi le maniglie vanno (ri)create adesso, non prima.
  _initDashDnD();
  _initDashRowResize();
  _initDashColResize();

  // ── Widget donut "Analisi mese corrente" ─────────────────────────────────
  _renderDashMonthDonut(budgetYear);

  // Gradient plugin per bar chart dashboard
  const _dashGradPlugin = {
    id: 'dashGrad',
    beforeDatasetsUpdate(chart) {
      const {ctx, chartArea, data} = chart;
      if (!chartArea) return;
      data.datasets.forEach(ds => {
        if (!ds._gradColors) return;
        const [c0, c1] = ds._gradColors;
        const isHoriz = chart.config.options?.indexAxis === 'y';
        const grad = isHoriz
          ? ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0)
          : ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        grad.addColorStop(0, c0);
        grad.addColorStop(1, c1);
        ds.backgroundColor = grad;
      });
    }
  };

  // Bar chart
  const months = Array.from({length:12},(_,i)=>new Date(0,i).toLocaleString('it-IT',{month:'short'}));
  const incArr = Array(12).fill(0), expArr = Array(12).fill(0);
  monthly.forEach(r => { incArr[r.month-1]=r.income; expArr[r.month-1]=r.expenses; });

  // Tronca ai soli mesi fino a quello corrente (i mesi futuri sarebbero a 0 e
  // schiaccerebbero i grafici a linea/area con una lunga caduta a zero). Usato dai
  // grafici Entrate/Uscite (bar) e Risparmio mensile (savings).
  const _lastMonthIdx = new Date().getMonth(); // 0-indexed
  const monthsYtd = months.slice(0, _lastMonthIdx + 1);
  const incYtd    = incArr.slice(0, _lastMonthIdx + 1);
  const expYtd    = expArr.slice(0, _lastMonthIdx + 1);

  if (charts.bar) charts.bar.destroy();
  {
    // Grafico ad area con gradiente verticale (satura in alto → trasparente in basso),
    // linee morbide e punti sui vertici. Il gradiente per il fill va creato sul contesto
    // 2D (lo stesso approccio del chart "Budget vs Reale" qui sotto).
    const _barCtxEl = document.getElementById('barChart');
    const _bc  = _barCtxEl.getContext('2d');
    const _bcH = _barCtxEl.offsetHeight || 260;
    const _areaGrad = (r, g, b) => {
      const grad = _bc.createLinearGradient(0, 0, 0, _bcH);
      grad.addColorStop(0, `rgba(${r},${g},${b},.42)`);
      grad.addColorStop(1, `rgba(${r},${g},${b},.02)`);
      return grad;
    };
    charts.bar = new Chart(_barCtxEl, {
      type:'line',
      data:{ labels:monthsYtd,
        datasets:[
          {label:'Entrate', data:incYtd, borderColor:'rgba(63,185,80,1)', backgroundColor:_areaGrad(63,185,80),
           fill:true, tension:.4, borderWidth:2, pointRadius:3, pointBackgroundColor:'rgba(63,185,80,1)', pointBorderWidth:0},
          {label:'Uscite',  data:expYtd, borderColor:'rgba(248,81,73,1)', backgroundColor:_areaGrad(248,81,73),
           fill:true, tension:.4, borderWidth:2, pointRadius:3, pointBackgroundColor:'rgba(248,81,73,1)', pointBorderWidth:0}
        ]},
      options:{ responsive:true, maintainAspectRatio:false,
        interaction:{ mode:'index', intersect:false },
        plugins:{
          legend:{labels:{color:chartColors().tick, usePointStyle:true, pointStyle:'circle'}},
          tooltip:{ callbacks:{ label: ctx => ` ${ctx.dataset.label}: ${fmt.currency(ctx.parsed.y)}` } }
        },
        scales:{x:{ticks:{color:chartColors().tick},grid:{color:chartColors().grid}},
                y:{ticks:{color:chartColors().tick},grid:{color:chartColors().grid}}}}
    });
  }

  // Budget vs Reale chart (solo mesi fino al mese precedente)
  {
    const prevMonthIdx = new Date().getMonth() - 1; // 0-indexed, -1 = nessun mese se siamo a gennaio
    const expCatIds = new Set(budgetYear.categories.filter(c => c.type === 'expense').map(c => c.id));

    // Replica getEffective della pagina budget per avere i valori distribuiti dal config
    const _bMap = {};
    budgetYear.budgets.forEach(b => { if (!_bMap[b.category_id]) _bMap[b.category_id] = {}; _bMap[b.category_id][b.month] = b.amount; });
    const _cfgMap = {};
    (budgetYear.configs || []).forEach(c => { _cfgMap[c.category_id] = c; });
    const _getEff = catId => _budgetEffective(_cfgMap[catId], _bMap[catId] || {});

    // Tutte le categorie foglia (income e expense) — stesso approccio della riga sommario pagina budget
    const leafCats = _leafCats(budgetYear.categories);

    // Net per mese: income contribuisce positivamente, expense negativamente
    const budgetByMonth = Array(12).fill(0);
    const actualByMonth = Array(12).fill(0);
    leafCats.forEach(c => {
      const sign = c.type === 'income' ? 1 : -1;
      const eff = _getEff(c.id);
      for (let m = 1; m <= 12; m++) budgetByMonth[m-1] += sign * (eff[m] || 0);
    });
    const _catById = new Map(budgetYear.categories.map(c => [c.id, c]));
    budgetYear.actuals.forEach(a => {
      const cat = _catById.get(a.category_id);
      if (!cat) return;
      const sign = cat.type === 'income' ? 1 : -1;
      actualByMonth[a.month - 1] += sign * a.total;
    });

    // Includi solo mesi 0..prevMonthIdx con almeno budget o reale != 0
    const bLabels = [], bBudget = [], bActual = [], bDiff = [];
    for (let i = 0; i <= prevMonthIdx; i++) {
      if (budgetByMonth[i] === 0 && actualByMonth[i] === 0) continue;
      bLabels.push(months[i]);
      bBudget.push(budgetByMonth[i]);
      bActual.push(actualByMonth[i]);
      bDiff.push(actualByMonth[i] - budgetByMonth[i]); // positivo = meglio del previsto
    }

    if (charts.budget) charts.budget.destroy();
    const budgetCtx = document.getElementById('budgetChart');
    if (budgetCtx && bLabels.length) {
      const _bCtx = budgetCtx.getContext('2d');
      const _bH   = budgetCtx.offsetHeight || 300;
      const gradGreen = _bCtx.createLinearGradient(0, 0, 0, _bH);
      gradGreen.addColorStop(0,   'rgba(63,185,80,.45)');
      gradGreen.addColorStop(1,   'rgba(63,185,80,.12)');
      const gradRed = _bCtx.createLinearGradient(0, 0, 0, _bH);
      gradRed.addColorStop(0,   'rgba(248,81,73,.12)');
      gradRed.addColorStop(1,   'rgba(248,81,73,.45)');
      charts.budget = new Chart(budgetCtx, {
        type: 'line',
        data: {
          labels: bLabels,
          datasets: [{
            label: 'Differenza',
            data: bDiff,
            fill: { target: 'origin', above: gradGreen, below: gradRed },
            segment: {
              borderColor: ctx => ctx.p1.parsed.y < 0 ? 'rgba(248,81,73,0.8)' : 'rgba(63,185,80,0.8)'
            },
            tension: 0.3, pointRadius: 3,
            pointBackgroundColor: ctx => bDiff[ctx.dataIndex] >= 0 ? 'rgba(63,185,80,0.9)' : 'rgba(248,81,73,0.9)'
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => ` Differenza: ${fmt.currency(ctx.parsed.y)}`,
                labelColor: ctx => {
                  const c = ctx.parsed.y >= 0 ? 'rgba(63,185,80,0.9)' : 'rgba(248,81,73,0.9)';
                  return { borderColor: c, backgroundColor: c };
                }
              }
            },
          },
          scales: {
            x: { ticks: { color: chartColors().tick }, grid: { color: chartColors().grid } },
            y: { beginAtZero: true, ticks: { color: chartColors().tick, callback: v => fmt.currency(v) }, grid: { color: chartColors().grid } }
          }
        }
      });
    } else if (budgetCtx && !bLabels.length) {
      budgetCtx.parentElement.innerHTML += '<p class="text-muted" style="text-align:center;padding:20px">Nessun dato budget disponibile</p>';
    }
  }

  // Pie chart rimosso (sostituito da widget Salute Finanziaria)
  if (charts.pie) { charts.pie.destroy(); charts.pie = null; }

  // Recent transactions (fetch desc → display asc: most recent at bottom)
  const recentAsc = [...recent].reverse();
  const compactTd = 'padding:4px 8px';
  document.getElementById('recentRows').innerHTML = recentAsc.length ? recentAsc.map(t => `
    <tr style="cursor:pointer" onclick="navigateToTx(${t.id})">
      <td style="${compactTd};white-space:nowrap;color:var(--txt2)">${fmt.date(t.date)}</td>
      <td style="${compactTd}" class="td-main">${esc(t.description)}</td>
      <td style="${compactTd}">${t.split_count > 0
        ? `<span class="cat-chip" style="opacity:.8">÷ ${t.split_count} voci</span>`
        : `<span class="cat-chip">${esc(t.category_icon||'')}  ${esc(t.category_name||'-')}</span>`}</td>
      <td style="${compactTd};color:var(--txt2)">${esc(t.account_name||'-')}</td>
      <td style="${compactTd}" class="text-right amount-${t.type}">${t.type==='expense'?'-':''}${fmt.currency(t.amount)}</td>
    </tr>`).join('') :
    '<tr><td colspan="5" class="text-muted" style="text-align:center;padding:20px">Nessuna transazione</td></tr>';

  // Upcoming scheduled
  const dashTodayStr = _todayStr();
  const dashToday = new Date(dashTodayStr + 'T00:00:00');
  document.getElementById('upcomingRows').innerHTML = upcoming.length ? upcoming.map(u => {
    const nextStr = u.date || u.start_date;
    const days = nextStr ? Math.round((new Date(nextStr + 'T00:00:00') - dashToday) / 86400000) : null;
    const daysHtml = days === null ? '—'
      : days < 0  ? `<span class="sched-days-badge overdue">⚠️ ${Math.abs(days)}g fa</span>`
      : days === 0 ? `<span class="sched-days-badge today">Oggi</span>`
      : `<span class="sched-days-badge upcoming">${days}g</span>`;
    // Bottone Esegui solo per pianificate scadute o in scadenza oggi
    const showExec = u.overdue || (days !== null && days <= 0);
    const execBtn  = showExec
      ? `<button onclick="_dashExecSched(${u.id})" title="Esegui ora — pre-compila e avanza la pianificata" style="background:transparent;border:none;cursor:pointer;color:var(--accent);font-size:11px;padding:0 4px;line-height:1">▶</button>`
      : '';
    return `
    <tr class="${u.overdue ? 'upcoming-overdue' : ''}">
      <td><span class="cat-chip">${esc(u.category_icon||'')}${esc(u.parent_category_name?u.parent_category_name+':'+u.category_name:u.category_name||'-')}</span></td>
      <td class="td-main">${esc(u.description||'-')}</td>
      <td>${daysHtml}</td>
      <td class="text-right amount-${u.type}">${u.type==='expense'?'-':''}${fmt.currency(u.amount)}</td>
      <td style="width:24px;text-align:center;padding:0">${execBtn}</td>
    </tr>`;
  }).join('') :
    '<tr><td colspan="5" class="text-muted" style="text-align:center;padding:20px">Nessuna transazione pianificata</td></tr>';

  // Savings chart (monthly net = income - expenses) — troncato ai mesi fino a oggi
  const savArr = incYtd.map((v,i) => v - expYtd[i]);
  if (charts.savings) charts.savings.destroy();
  // Gradiente verticale per-barra: verde (netto >=0) o rosso (netto <0), con la parte
  // satura vicino allo zero che sfuma verso l'estremità della barra. Scriptable function:
  // Chart.js la chiama per ogni barra, così ogni barra ha il suo gradiente nel verso giusto.
  const _savGrad = ctx => {
    const {chart, dataIndex} = ctx;
    const area = chart.chartArea;
    if (!area) return 'rgba(63,185,80,.75)';
    const pos = savArr[dataIndex] >= 0;
    const grad = ctx.chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
    if (pos) { grad.addColorStop(0, 'rgba(63,185,80,.9)'); grad.addColorStop(1, 'rgba(63,185,80,.2)'); }
    else     { grad.addColorStop(0, 'rgba(248,81,73,.2)'); grad.addColorStop(1, 'rgba(248,81,73,.9)'); }
    return grad;
  };
  charts.savings = new Chart(document.getElementById('savingsChart'), {
    type: 'bar',
    data: { labels: monthsYtd, datasets: [
      // Un'unica serie: ogni mese ha una sola barra (netto), verde se >=0, rossa se <0.
      // Due dataset separati facevano riservare a Chart.js due slot affiancati per mese,
      // disallineando la barra dal centro come se ci fossero due serie.
      { label:'Risparmio', data: savArr,
        backgroundColor: _savGrad,
        borderRadius:4 }
    ]},
    options: { responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false} },
      scales:{ x:{ticks:{color:chartColors().tick},grid:{color:chartColors().grid}},
               y:{ticks:{color:chartColors().tick},grid:{color:chartColors().grid}}}}
  });

  // Top categories chart (horizontal bar)
  const top5 = [...catData].sort((a,b)=>b.total-a.total).slice(0,10);
  if (charts.topCat) charts.topCat.destroy();
  if (top5.length) {
    charts.topCat = new Chart(document.getElementById('topCatChart'), {
      type: 'bar',
      plugins:[_dashGradPlugin],
      data: { labels: top5.map(c => c.icon+' '+c.name),
              datasets: [{label:'Spesa', data: top5.map(c=>c.total),
                backgroundColor: top5.map(c=>c.color||'rgba(124,124,255,.7)'), borderRadius:4}]},
      options: { indexAxis:'y', responsive:true, maintainAspectRatio:false,
        plugins:{legend:{display:false},
          tooltip:{callbacks:{
            // Titolo del tooltip: "Genitore : Categoria" se la categoria ha un parent.
            title: items => { const c = top5[items[0].dataIndex];
              return c.parent_name ? `${c.parent_name} : ${c.name}` : c.name; }
          }}},
        scales:{ x:{ticks:{color:chartColors().tick,font:{size:10}},grid:{color:chartColors().grid}},
                 y:{ticks:{color:chartColors().tick,font:{size:10}},grid:{color:chartColors().grid}}}}
    });
  }
}

// ── Widget "Spese del mese" ───────────────────────────────────────────────
// Ripartizione delle uscite del mese corrente per categoria, in barre proporzionali a
// piena larghezza: la quota è codificata dalla LUNGHEZZA della barra, non da un angolo.
// Ricava tutto da budgetYear (actuals + categories + budgets/configs, già caricato in
// renderDashboard) — nessuna query dedicata.
//
// Perché barre e non più un donut: donut + legenda testuale erano ridondanti (la legenda
// riportava già la percentuale, quindi il grafico occupava il 40% della larghezza per
// ripetere dei numeri scritti accanto). Le barre reggono entrambi gli estremi d'uso —
// 3-4 categorie a inizio mese senza lasciare un buco verticale, 20-25 a fine mese senza
// che "Altro" diventi la voce dominante.
//
// Click a due livelli: ogni riga apre le Transazioni del mese filtrate sulla sua categoria
// (stopPropagation), la riga di coda su tutte le categorie che aggrega insieme; header e
// spazio vuoto restano sull'onclick della card → Analytics/categorie del mese.
const _SHARE_FALLBACK = ['#58a6ff','#3fb950','#ff7b72','#e3b341','#bc8cff','#79c0ff','#56d364','#ffa657','#f78166','#d2a8ff'];
function _renderDashMonthDonut(budgetYear) {
  const body = document.getElementById('dashMonthDonutBody');
  const totEl = document.getElementById('dashMonthDonutTot');
  if (!body) return;

  const { actuals = [], categories = [], budgets = [], configs = [] } = budgetYear;
  const now = new Date();
  const curMonth = now.getMonth() + 1;
  const monthName = now.toLocaleString('it-IT', { month: 'long' });
  const catMap = Object.fromEntries(categories.map(c => [c.id, c]));

  // Budget effettivo del mese per categoria (stessa logica della pagina budget): serve
  // solo a marcare in rosso le categorie sforate — l'informazione principale resta la quota.
  const _bMap = {};
  budgets.forEach(b => { if (!_bMap[b.category_id]) _bMap[b.category_id] = {}; _bMap[b.category_id][b.month] = b.amount; });
  const _cfgMap = {};
  (configs || []).forEach(c => { _cfgMap[c.category_id] = c; });
  const budgetOf = catId => _budgetEffective(_cfgMap[catId], _bMap[catId] || {})[curMonth] || 0;

  // Aggrega le uscite del mese corrente per categoria (solo categorie di tipo expense).
  const byCat = {};
  actuals.forEach(a => {
    if (a.month !== curMonth) return;
    const c = catMap[a.category_id];
    if (!c || c.type !== 'expense') return;
    const t = Number(a.total) || 0;
    if (t <= 0) return;
    byCat[a.category_id] = (byCat[a.category_id] || 0) + t;
  });

  let items = Object.entries(byCat)
    .map(([id, total]) => {
      const c = catMap[id];
      const budget = budgetOf(c.id);
      return { id: c.id, name: c.name, icon: c.icon || '📁', color: c.color, total, budget, over: budget > 0 && total > budget };
    })
    .sort((a, b) => b.total - a.total);

  const totMonth = items.reduce((s, i) => s + i.total, 0);

  if (totEl) totEl.textContent = '';
  if (!items.length) {
    body.innerHTML = `<div style="flex:1;display:flex;align-items:center;justify-content:center;color:var(--txt3);font-size:13px">Nessuna spesa nel mese</div>`;
    return;
  }
  if (totEl) totEl.textContent = `${monthName} · ${fmt.currency(totMonth)}`;

  // Quante righe ci stanno DAVVERO nell'altezza disponibile: il widget è ridimensionabile
  // (rowH nel layout), quindi un cap fisso o troncava presto in una card alta o mandava in
  // overflow una card bassa — e la prima riga a sparire sotto il bordo sarebbe stata proprio
  // "Altre N categorie", cioè quella che rende conto di tutto ciò che non si vede.
  // 24 = riga 22px + gap 2px: è il PASSO tra due righe, non la sola altezza. Usare 22
  // sovrastimava di una riga e mandava in overflow proprio la coda "Altre N categorie".
  // Deve restare allineato al CSS .dshare (padding/line-height) e a .dshare-list (gap).
  const ROW_H = 24;
  const avail = body.clientHeight || 320;
  // Almeno 4 righe anche in una card molto bassa (sotto, lo scroll fa da rete di sicurezza);
  // mai più di 18: oltre, le barre diventano troppo fitte per essere confrontabili.
  const MAX_ROWS = Math.max(4, Math.min(18, Math.floor(avail / ROW_H)));

  // Il resto confluisce in "Altre N categorie" (riga grigia). Quando serve la riga di coda,
  // il cap sulle categorie è MAX_ROWS-1: la coda occupa essa stessa una riga.
  let other = null;
  if (items.length > MAX_ROWS) {
    const head = MAX_ROWS - 1;
    const rest = items.slice(head);
    other = { count: rest.length, total: rest.reduce((s, i) => s + i.total, 0), ids: rest.map(i => i.id) };
    items = items.slice(0, head);
  }

  // Colore barra: colore categoria se valido (#hex), altrimenti dalla palette fallback.
  const barColor = (it, i) => (it.color && it.color.startsWith('#')) ? it.color : _SHARE_FALLBACK[i % _SHARE_FALLBACK.length];

  const pct = t => totMonth > 0 ? t / totMonth * 100 : 0;
  // Le barre sono normalizzate sulla categoria più grossa, non sul totale: con 20 categorie
  // la quota massima è ~20% e barre tarate sul totale sarebbero tutte stumps illeggibili.
  const maxTot = items[0].total || 1;

  // Righe distribuite sull'altezza disponibile (space-evenly): con poche categorie la card
  // respira invece di lasciare un vuoto in fondo, con molte si compattano da sé.
  body.innerHTML = `
    <div class="dshare-list">
      ${items.map((it, i) => `
        <div class="dshare dshare-click${it.over ? ' dshare-over' : ''}"
             onclick="event.stopPropagation();navigateToCategoryTx(${it.id})"
             title="${esc(it.name)} — ${esc(fmt.currency(it.total))}${it.budget > 0 ? ` di ${esc(fmt.currency(it.budget))} a budget` : ''} · clicca per le transazioni del mese">
          <span class="dshare-icon">${esc(it.icon)}</span>
          <span class="dshare-name">${esc(it.name)}</span>
          <span class="dshare-track">
            <span class="dshare-fill" data-fill="${(it.total / maxTot * 100).toFixed(1)}" style="width:0;background-color:${barColor(it, i)}"></span>
          </span>
          <span class="dshare-pct">${Math.round(pct(it.total))}%</span>
          <span class="dshare-amt">${fmt.currency(it.total)}</span>
        </div>`).join('')}
      ${other ? `
        <div class="dshare dshare-other dshare-click"
             onclick="event.stopPropagation();navigateToCategoryTx([${other.ids.join(',')}])"
             title="Categorie minori aggregate — clicca per le transazioni del mese">
          <span class="dshare-icon">•</span>
          <span class="dshare-name">Altre ${other.count} categorie</span>
          <span class="dshare-track">
            <span class="dshare-fill" data-fill="${(other.total / maxTot * 100).toFixed(1)}" style="width:0;background-color:#8b949e"></span>
          </span>
          <span class="dshare-pct">${Math.round(pct(other.total))}%</span>
          <span class="dshare-amt">${fmt.currency(other.total)}</span>
        </div>` : ''}
    </div>`;

  // Stessa animazione "crescita" delle barre budget: partono da width:0 e al frame
  // successivo vanno al valore reale (doppio rAF perché il browser registri lo stato iniziale).
  requestAnimationFrame(() => requestAnimationFrame(() => {
    body.querySelectorAll('.dshare-fill').forEach(f => { f.style.width = (f.dataset.fill || '0') + '%'; });
  }));
}

// ── Esegui pianificata ora (F6) ───────────────────────────────────────────
// "Esegui ora" una pianificata dalla dashboard: apre il modale transazione precompilato
// (aggiunge il tag "Da Budget") e, al salvataggio, avanza la pianificata alla prossima data.
window._dashExecSched = async id => {
  const u = (window._dashUpcomingCache || []).find(x => x.id === id);
  if (!u) { toast('Pianificata non trovata', 'error'); return; }
  const [cats, accs, tags] = await Promise.all([api.getCategories(), api.getAccounts(), api.getTags()]);
  const budgetTag = tags.find(t => t.system_key === 'budget');
  const existingIds = (u.tags || []).map(t => Number(t.id));
  const tagIds = budgetTag && !existingIds.includes(budgetTag.id)
    ? [...existingIds, budgetTag.id]
    : existingIds;
  const nextDate = u.date || u.start_date;
  showTxModal({
    id: null, date: nextDate,
    amount: u.amount, type: u.type,
    category_id: u.category_id || null,
    account_id: u.account_id,
    to_account_id: u.to_account_id || null,
    description: u.description || '',
    color: u.color || null,
    reconciled: u.reconciled ?? 1,
    tag_ids: tagIds,
    // Solo per il banner "Collegata a posizione portfolio" nel modale: il link vero lo crea
    // registerScheduled lato Java leggendo portfolio_id dalla pianificata. Qui non finisce
    // nel payload di salvataggio (showTxModal lo costruisce dai campi del form).
    portfolio_id: u.portfolio_id || null,
  }, cats, accs, u.type, tags, () => {
    // L'avanzamento è già avvenuto dentro la stessa transazione SQL del salvataggio
    // (saveOverride qui sotto): qui resta solo il feedback e il refresh.
    _resolveOverdue(id);   // la pianificata è stata registrata: via dalle notifiche scadute/oggi
    toast('Pianificata eseguita e avanzata');
    renderDashboard();
  },
  // Salvataggio + avanzamento atomici: prima erano due chiamate separate e un errore sulla
  // seconda lasciava la transazione registrata con la pianificata ferma alla stessa data,
  // quindi al tentativo successivo veniva registrata una SECONDA volta.
  data => api.addTransactionForScheduled(data, id, nextDate));
};
