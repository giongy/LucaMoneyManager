# ═══════════════════════════════════════════════════════════════════════════
#  check-ui.ps1 — controlli automatici di resa grafica su tutte le pagine
#
#  Per ogni pagina dell'app verifica:
#    - errori JavaScript in console
#    - overflow orizzontale del body (il layout non deve mai scrollare in X)
#    - elementi che sforano il bordo destro della viewport
#    - contrasto testo/sfondo sui bottoni pieni (.btn-primary, .btn-danger, ...)
#  e salva uno screenshot per pagina.
#
#  Nato dopo il fix del tema "carta", dove tre regole scrivevano testo nero su
#  accento scuro: un controllo del genere lo avrebbe intercettato subito.
#
#  ESEMPI
#    .\tools\check-ui.ps1                       # tema corrente, porta 7890
#    .\tools\check-ui.ps1 -Port 7891 -Theme carta
#    .\tools\check-ui.ps1 -Theme petrolio -Pages dashboard,budgets
#    .\tools\check-ui.ps1 -Port 7891 -AllThemes # tutti i temi built-in in sequenza
#    .\tools\check-ui.ps1 -Port 7891 -NoShots   # solo diagnostica, nessun PNG (piu' veloce)
# ═══════════════════════════════════════════════════════════════════════════
param(
  [int]$Port      = 7890,
  [string]$Theme  = "",                        # nebbia | carta | petrolio | glassy | "" = non cambiare
  [string[]]$Pages = @("dashboard","accounts","transactions","budgets","scheduled",
                       "portfolio","analytics","categories","tags","notes","settings"),
  [int]$CdpPort   = 9222,
  [switch]$AllThemes,                          # cicla su tutti i temi built-in
  [switch]$NoShots                             # niente PNG: solo i controlli
)

$shot = Join-Path $PSScriptRoot "screenshot.ps1"
if (-not (Test-Path $shot)) { Write-Error "screenshot.ps1 non trovato accanto a questo script."; exit 1 }

# JS di diagnostica eseguito dentro la pagina dopo la navigazione.
# Restituisce una riga per problema; "ok" se non ne trova.
$diag = @'
(() => {
  const P = [];
  const de = document.documentElement;

  // 1) overflow orizzontale del documento
  if (de.scrollWidth > de.clientWidth + 1)
    P.push("OVERFLOW-X: scrollWidth=" + de.scrollWidth + " > clientWidth=" + de.clientWidth);

  // 2) elementi che sforano a destra (esclusi i fixed e chi scrolla per conto suo)
  const vw = de.clientWidth, over = [];
  document.querySelectorAll(".page.active *").forEach(el => {
    const cs = getComputedStyle(el);
    if (cs.position === "fixed" || cs.display === "none") return;
    let p = el.parentElement, inScroller = false;
    while (p && p !== document.body) {
      const pc = getComputedStyle(p);
      if (pc.overflowX === "auto" || pc.overflowX === "scroll") { inScroller = true; break; }
      p = p.parentElement;
    }
    if (inScroller) return;
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.right > vw + 2)
      over.push(el.tagName.toLowerCase() + "." + (el.className || "").toString().trim().split(/\s+/)[0]);
  });
  if (over.length) P.push("SFORA A DESTRA: " + [...new Set(over)].slice(0, 5).join(", "));

  // 3) contrasto sui bottoni pieni (WCAG AA testo normale = 4.5)
  const lum = c => {
    const [r,g,b] = c.match(/\d+/g).slice(0,3).map(Number).map(v => {
      v /= 255; return v <= .03928 ? v/12.92 : Math.pow((v+.055)/1.055, 2.4);
    });
    return .2126*r + .7152*g + .0722*b;
  };
  const seen = new Set();
  document.querySelectorAll(".btn-primary, .btn-danger, .btn-success, .calc-eq, .theme-btn-active, .badge").forEach(el => {
    const cs = getComputedStyle(el);
    const bg = cs.backgroundColor, fg = cs.color;
    if (!bg || bg === "rgba(0, 0, 0, 0)") return;
    const key = el.className + "|" + bg + "|" + fg;
    if (seen.has(key)) return; seen.add(key);
    const L1 = lum(fg), L2 = lum(bg);
    const ratio = (Math.max(L1,L2) + .05) / (Math.min(L1,L2) + .05);
    if (ratio < 4.5)
      P.push("CONTRASTO BASSO " + ratio.toFixed(2) + ":1  ." +
             (el.className||"").toString().trim().split(/\s+/)[0] + "  testo " + fg + " su " + bg);
  });

  return P.length ? P.join("\n") : "ok";
})()
'@

# Esegue la diagnostica su tutte le pagine per UN tema. Ritorna il n. di pagine con problemi.
function Invoke-ThemeCheck([string]$T) {
  Write-Host ""
  Write-Host "  Controllo UI - porta $Port$(if($T){" - tema $T"})" -ForegroundColor Cyan
  Write-Host "  ---------------------------------------------------------------"

  $problemi = 0
  foreach ($p in $Pages) {
    $js = ""
    if ($T) { $js += "try{applyTheme('$T')}catch(e){}; " }
    $js += "try{navigate('$p')}catch(e){}; "
    $js += $diag

    $name = if ($T) { "$T-$p" } else { $p }
    # NB: non chiamare questa hashtable $args — e' una variabile automatica di PowerShell.
    $shotArgs = @{ Port = $Port; Js = $js; Out = $name; CdpPort = $CdpPort; KeepOpen = $true }
    if ($NoShots) { $shotArgs.Probe = $true }
    $res = & $shot @shotArgs 2>&1

    # Scarta le righe di servizio dello scatto (OK/PIXEL/PROBE) e l'"ok" della
    # diagnostica: resta solo l'elenco dei problemi, se ce ne sono.
    $diagLines = $res | Where-Object {
      $_ -notmatch '^OK\s' -and $_ -notmatch '^PIXEL\s' -and $_ -notmatch '^PROBE\s' -and
      $_ -notmatch '^\s*$' -and $_ -ne 'ok'
    }
    if ($diagLines) {
      Write-Host ("  [!] {0}" -f $p) -ForegroundColor Yellow
      $diagLines | ForEach-Object { Write-Host "      $_" -ForegroundColor Yellow }
      $problemi++
    } else {
      Write-Host ("  [ok] {0}" -f $p) -ForegroundColor Green
    }
  }

  Write-Host "  ---------------------------------------------------------------"
  if ($problemi) { Write-Host "  $problemi pagine con segnalazioni$(if(-not $NoShots){". Screenshot in tools\screenshots\"})" -ForegroundColor Yellow }
  else           { Write-Host "  Nessun problema rilevato$(if(-not $NoShots){". Screenshot in tools\screenshots\"})" -ForegroundColor Green }
  return $problemi
}

$sw = [Diagnostics.Stopwatch]::StartNew()
$totale = 0
if ($AllThemes) {
  # I quattro built-in. Un tema rotto si vede solo provandolo: le regole base
  # sono condivise, quindi una modifica "per un tema" puo' romperne un altro.
  foreach ($t in @("nebbia","carta","petrolio","glassy")) { $totale += (Invoke-ThemeCheck $t) }
} else {
  $totale = Invoke-ThemeCheck $Theme
}
$sw.Stop()

Write-Host ""
if ($totale) { Write-Host ("  TOTALE: $totale pagine con segnalazioni  ({0:n1}s)" -f $sw.Elapsed.TotalSeconds) -ForegroundColor Yellow }
else         { Write-Host ("  TOTALE: tutto ok  ({0:n1}s)" -f $sw.Elapsed.TotalSeconds) -ForegroundColor Green }
Write-Host ""
