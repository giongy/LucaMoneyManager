/* ═══════════════════════════════════════════════════════════════════════════
   LucaMoneyManager — calculator.js
   Calcolatrice popup riutilizzabile.

   Due modalità d'uso:
     1) Agganciata a un campo importo: ogni <input class="form-control"
        inputmode="decimal"> nei modal riceve automaticamente un bottoncino 🧮
        a destra (dentro il campo). Cliccandolo si apre la calcolatrice; il tasto
        OK/= scrive il risultato nel campo e ne rivaluta l'espressione.
     2) Standalone: il pulsante in sidebar apre la calcolatrice come utility libera
        (senza campo di destinazione, solo per fare conti).

   La valutazione riusa evalAmount() (utils.js) → stessa precedenza operatori e
   stessa tolleranza virgola/punto dei campi importo.
   Input sia da mouse (tastierino a schermo) sia da tastiera fisica (tastierino num.).
═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  let _panel      = null;   // elemento .calc-panel (creato lazy)
  let _display    = null;   // <input> del display espressione
  let _preview    = null;   // riga anteprima risultato
  let _targetInput = null;  // campo importo agganciato (null in standalone)
  let _pos        = null;   // {left, top} posizione salvata del pannello (null = da centrare)

  // ─── Display: dimensione del testo e vista sulla coda ───────────────────────
  // Il pannello ha larghezza fissa: con espressioni lunghe (es. 123+345+456+…)
  // il testo sforava a destra e le ultime cifre digitate uscivano dalla vista.
  // Due difese, in quest'ordine: si rimpicciolisce il carattere finché
  // l'espressione ci sta (fino a 13px, sotto cui si leggerebbe peggio della
  // riga di anteprima), e se nemmeno così basta si scorre il display in fondo.
  const _FONT_STEPS = [20, 18, 17, 16, 15, 14, 13];   // px: si usa il primo che ci sta

  function _fitFont() {
    for (const px of _FONT_STEPS) {
      _display.style.fontSize = px + 'px';
      // La larghezza del campo non dipende dal font (pannello a misura fissa),
      // quindi basta il confronto contenuto/contenitore.
      if (_display.scrollWidth <= _display.clientWidth) break;
    }
  }

  // Rimette il fuoco sul display col cursore in fondo e la coda dell'espressione
  // in vista: i tasti a schermo inseriscono sempre in coda, ed è lì che guarda
  // l'utente. Usata al posto di _display.focus() nelle azioni del tastierino.
  function _focusEnd() {
    _display.focus();
    const n = _display.value.length;
    try { _display.setSelectionRange(n, n); } catch (_) { /* campo non selezionabile */ }
    _display.scrollLeft = _display.scrollWidth;
  }

  // ─── Anteprima / valutazione ───────────────────────────────────────────────
  // Aggiorna la riga di anteprima col risultato dell'espressione corrente.
  function _updatePreview() {
    const raw = _display.value.trim();
    if (!raw) {
      _preview.textContent = '';
    } else {
      const r = evalAmount(raw, true);   // consenti risultati negativi in anteprima
      _preview.textContent = (r == null) ? '—' : fmt.currency(r);
    }
    _fitFont();   // l'espressione è cambiata: ricalcola la dimensione del carattere
  }

  // ─── Manipolazione del display ──────────────────────────────────────────────
  function _append(ch) {
    _display.value += ch;
    _updatePreview();
    _focusEnd();
  }
  function _backspace() {
    _display.value = _display.value.slice(0, -1);
    _updatePreview();
    _focusEnd();
  }
  function _clear() {
    _display.value = '';
    _updatePreview();
    _focusEnd();
  }

  // Valuta l'espressione e la sostituisce col risultato numerico (tasto =).
  // Ritorna il Number valutato, oppure null se l'espressione non è valida.
  function _evaluate() {
    const r = evalAmount(_display.value, true);   // consenti risultati negativi
    if (r == null) return null;
    // Numero "pulito": max 2 decimali, senza zeri superflui.
    _display.value = String(Math.round(r * 100) / 100);
    _updatePreview();
    _focusEnd();
    return r;
  }

  // Conferma: se agganciata a un campo, scrive il risultato e chiude.
  // In standalone, il tasto OK si comporta come "=" (valuta e resta aperta).
  function _confirm() {
    const r = _evaluate();
    if (r == null) return;
    // Un campo importo non accetta valori negativi: valuta e mostra il
    // risultato, ma non confermarlo nel campo (l'utente vede l'anteprima).
    if (r < 0) return;
    if (_targetInput) {
      _targetInput.value = _display.value;
      // Notifica la logica esistente (validazione, calcolo resto split, ecc.).
      _targetInput.dispatchEvent(new Event('input',  { bubbles: true }));
      _targetInput.dispatchEvent(new Event('change', { bubbles: true }));
      _targetInput.dispatchEvent(new Event('blur',   { bubbles: true }));
      close();
      _targetInput.focus();
    }
  }

  // ─── Costruzione del pannello (lazy, una sola volta) ────────────────────────
  function _build() {
    if (_panel) return;

    const overlay = document.createElement('div');
    overlay.className = 'calc-overlay';
    overlay.id = 'calcOverlay';
    // Nota: l'overlay è pointer-events:none (vedi CSS) così i click "passano"
    // agli elementi sottostanti e si può lavorare vedendo cosa c'è sotto.
    // Di conseguenza non c'è più chiusura "click fuori": si chiude con ✕ o Esc.

    _panel = document.createElement('div');
    _panel.className = 'calc-panel';

    // Layout tastierino: ogni bottone ha data-k (carattere/azione).
    // Azioni speciali: back, clear, eq, ok.
    _panel.innerHTML = `
      <div class="calc-head">
        <span class="calc-title">🧮 Calcolatrice</span>
        <button type="button" class="calc-close" data-k="close" title="Chiudi (Esc)">✕</button>
      </div>
      <input type="text" class="calc-display" inputmode="decimal" autocomplete="off"
             placeholder="0" aria-label="Espressione">
      <div class="calc-preview"></div>
      <div class="calc-keys">
        <button type="button" class="calc-key calc-fn"  data-k="clear" title="Azzera (C / Canc)">C</button>
        <button type="button" class="calc-key calc-fn"  data-k="back"  title="Cancella (Backspace)">⌫</button>
        <button type="button" class="calc-key calc-op"  data-k="/"     title="Diviso">÷</button>
        <button type="button" class="calc-key calc-op"  data-k="*"     title="Per">×</button>

        <button type="button" class="calc-key" data-k="7">7</button>
        <button type="button" class="calc-key" data-k="8">8</button>
        <button type="button" class="calc-key" data-k="9">9</button>
        <button type="button" class="calc-key calc-op" data-k="-" title="Meno">−</button>

        <button type="button" class="calc-key" data-k="4">4</button>
        <button type="button" class="calc-key" data-k="5">5</button>
        <button type="button" class="calc-key" data-k="6">6</button>
        <button type="button" class="calc-key calc-op" data-k="+" title="Più">+</button>

        <button type="button" class="calc-key" data-k="1">1</button>
        <button type="button" class="calc-key" data-k="2">2</button>
        <button type="button" class="calc-key" data-k="3">3</button>
        <button type="button" class="calc-key calc-eq" data-k="eq" title="Calcola (=)">=</button>

        <button type="button" class="calc-key calc-zero" data-k="0">0</button>
        <button type="button" class="calc-key" data-k=".">,</button>
        <button type="button" class="calc-key calc-ok" data-k="ok" title="Conferma (Invio)">OK</button>
      </div>`;

    overlay.appendChild(_panel);
    document.body.appendChild(overlay);

    _display = _panel.querySelector('.calc-display');
    _preview = _panel.querySelector('.calc-preview');

    // Delega click sui tasti del tastierino a schermo.
    _panel.querySelector('.calc-keys').addEventListener('click', (e) => {
      const btn = e.target.closest('.calc-key');
      if (!btn) return;
      _dispatchKey(btn.dataset.k);
    });
    _panel.querySelector('.calc-close').addEventListener('click', close);

    // Digitazione diretta nel display (tastiera fisica / tastierino numerico).
    // Filtriamo i caratteri validi e gestiamo i tasti azione qui, così l'input
    // resta sempre coerente con evalAmount.
    _display.addEventListener('keydown', _onDisplayKeydown);
    _display.addEventListener('input', () => {
      // Normalizza virgola→punto già a monte così l'anteprima è sempre giusta;
      // evalAmount accetta comunque entrambe, ma teniamo il display pulito.
      _updatePreview();
    });

    _enableDrag();
  }

  // ─── Trascinamento del pannello ─────────────────────────────────────────────
  // La barra del titolo (.calc-head) fa da maniglia. Il ✕ è escluso (è un bottone).
  // La posizione scelta viene ricordata in _pos e riusata alle aperture successive.
  function _enableDrag() {
    const head = _panel.querySelector('.calc-head');
    let startX, startY, startLeft, startTop, dragging = false;

    const onMove = (e) => {
      if (!dragging) return;
      // Mantieni il pannello dentro il viewport.
      const maxLeft = window.innerWidth  - _panel.offsetWidth;
      const maxTop  = window.innerHeight - _panel.offsetHeight;
      const left = Math.max(0, Math.min(maxLeft, startLeft + (e.clientX - startX)));
      const top  = Math.max(0, Math.min(maxTop,  startTop  + (e.clientY - startY)));
      _pos = { left, top };
      _panel.style.left = left + 'px';
      _panel.style.top  = top  + 'px';
    };
    const onUp = () => {
      dragging = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    head.addEventListener('mousedown', (e) => {
      if (e.target.closest('.calc-close')) return;   // il ✕ non avvia il drag
      e.preventDefault();
      const r = _panel.getBoundingClientRect();
      startX = e.clientX; startY = e.clientY;
      startLeft = r.left;  startTop = r.top;
      dragging = true;
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  // Traduce un data-k (o tasto fisico) in azione sul display.
  function _dispatchKey(k) {
    switch (k) {
      case 'clear': _clear();      break;
      case 'back':  _backspace();  break;
      case 'eq':    _evaluate();   break;
      case 'ok':    _confirm();    break;
      case 'close': close();       break;
      case '.':     _append('.');  break;   // il tasto a schermo mostra "," ma inseriamo "."
      default:      _append(k);    break;    // cifre e operatori + - * /
    }
  }

  // Tastiera fisica sul display: mappa i tasti utili, blocca i caratteri non validi.
  function _onDisplayKeydown(e) {
    // Lascia passare navigazione/selezione senza interferire.
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;

    if (k === 'Enter')     { e.preventDefault(); _confirm();  return; }
    if (k === 'Escape')    { e.preventDefault(); close();     return; }
    if (k === '=')         { e.preventDefault(); _evaluate(); return; }
    if (k === 'Backspace') { return; }           // comportamento nativo (aggiorniamo via 'input')
    if (k === 'Delete')    { e.preventDefault(); _clear();    return; }
    if (k === ',')         { e.preventDefault(); _append('.'); return; }  // virgola → punto
    if (k === '.')         { e.preventDefault(); _append('.'); return; }

    // Cifre e operatori: consenti solo il set valido, inserendo noi il carattere
    // così l'anteprima resta sincronizzata anche col tastierino numerico.
    if (/^[0-9]$/.test(k))       { e.preventDefault(); _append(k); return; }
    if (k === '+' || k === '-' || k === '*' || k === '/') {
      e.preventDefault(); _append(k); return;
    }

    // Consenti tasti di navigazione/editing; blocca il resto (lettere, ecc.).
    const allowNav = ['ArrowLeft','ArrowRight','Home','End','Tab'];
    if (!allowNav.includes(k)) e.preventDefault();
  }

  // ─── API pubblica ───────────────────────────────────────────────────────────
  // Apre la calcolatrice. `input` = campo importo da riempire (null → standalone).
  function open(input = null) {
    _build();
    _targetInput = input || null;

    // In modalità agganciata: precarica l'eventuale valore/espressione già presente
    // così l'utente può continuare a modificarla (es. "40+10" già digitato).
    _display.value = _targetInput ? (_targetInput.value || '').trim() : '';

    // Il tasto OK ha senso solo quando c'è un campo di destinazione.
    _panel.querySelector('.calc-ok').style.display = _targetInput ? '' : 'none';
    _panel.classList.toggle('calc-standalone', !_targetInput);

    document.getElementById('calcOverlay').classList.add('open');

    // Anteprima dopo l'apertura: _fitFont() misura il display, e a pannello
    // nascosto (overlay display:none) tutte le misure varrebbero zero.
    _updatePreview();

    // Posiziona il pannello: riusa la posizione scelta dall'utente (drag) se presente,
    // altrimenti lo centra nel viewport. Fatto dopo l'add di 'open' così offsetWidth è valido.
    if (_pos) {
      _panel.style.left = _pos.left + 'px';
      _panel.style.top  = _pos.top  + 'px';
    } else {
      const left = Math.max(0, (window.innerWidth  - _panel.offsetWidth)  / 2);
      const top  = Math.max(0, (window.innerHeight - _panel.offsetHeight) / 2);
      _panel.style.left = left + 'px';
      _panel.style.top  = top  + 'px';
    }

    // Focus sul display: consente subito la digitazione da tastierino numerico.
    setTimeout(() => { _display.focus(); _display.select(); }, 20);
  }

  function close() {
    const ov = document.getElementById('calcOverlay');
    if (ov) ov.classList.remove('open');
    _targetInput = null;
  }

  // ─── Aggancio automatico ai campi importo dei modal ─────────────────────────
  // Aggiunge il bottoncino 🧮 dentro un input importo (idempotente).
  function _attachButton(input) {
    if (input.dataset.calcAttached) return;
    input.dataset.calcAttached = '1';

    // Avvolge l'input in un wrapper relativo, così il bottone può stare "dentro"
    // il campo (assoluto a destra). Preserva la posizione dell'input nel DOM.
    const wrap = document.createElement('div');
    wrap.className = 'calc-field-wrap';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    input.classList.add('has-calc-btn');   // padding-right per non coprire il testo

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'calc-field-btn';
    btn.tabIndex = -1;                       // non intercettare il Tab tra i campi
    btn.title = 'Apri calcolatrice';
    btn.textContent = '🧮';
    btn.addEventListener('mousedown', (e) => e.preventDefault()); // non rubare il focus prima del click
    btn.addEventListener('click', () => open(input));
    wrap.appendChild(btn);
  }

  // Scansiona un contenitore e aggancia il bottone a tutti i campi importo trovati.
  function _scan(root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('input.form-control[inputmode="decimal"]')
        .forEach(_attachButton);
  }

  // Osserva il corpo del modal: ogni volta che openModal() ne rigenera l'HTML,
  // riagganciamo i bottoni ai nuovi campi importo. Un solo observer globale.
  function _installObserver() {
    const body = document.getElementById('modalBody');
    if (!body) return;
    _scan(body);   // caso in cui il modal fosse già aperto all'avvio
    new MutationObserver(() => _scan(body)).observe(body, { childList: true, subtree: true });
  }

  // ─── Bootstrap ──────────────────────────────────────────────────────────────
  // Espone l'API globale usata dalla sidebar (openCalculator) e dai bottoni campo.
  window.openCalculator = open;
  window.closeCalculator = close;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _installObserver);
  } else {
    _installObserver();
  }
})();
