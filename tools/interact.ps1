# ═══════════════════════════════════════════════════════════════════════════
#  interact.ps1 — pilota l'app come farebbe l'utente: click veri, tastiera vera
#
#  A differenza di screenshot.ps1 (che esegue JS nella pagina, cioe' chiama le
#  funzioni dell'app scavalcando l'interfaccia), qui gli eventi vengono
#  iniettati dal browser tramite CDP Input.*: sono indistinguibili da mouse e
#  tastiera reali.
#
#  A COSA SERVE (quello che il solo JS non puo' verificare)
#    - menu contestuali: richiedono un vero tasto destro con coordinate
#    - handler agganciati per delega (document.addEventListener('contextmenu'))
#    - dialog e form: che il click su "Salva" sia davvero collegato
#    - hover, focus, scorciatoie da tastiera
#  In breve: screenshot.ps1 verifica che la LOGICA sia giusta, interact.ps1
#  che l'INTERFACCIA sia collegata a quella logica.
#
#  AZIONI (-Do), una per riga, eseguite in ordine:
#    goto <pagina>            navigate() + attesa render
#    click <selettore>        click sinistro al centro dell'elemento
#    rightclick <selettore>   click destro (menu contestuale)
#    dblclick <selettore>     doppio click
#    hover <selettore>        solo spostamento del mouse
#    type <testo>             digita nell'elemento con focus
#    key <tasto>              Escape | Enter | Tab | Delete | ArrowDown | ...
#    wait <ms>                pausa esplicita
#    shot <nome>              screenshot in tools/screenshots/
#    expect <selettore>       verifica che l'elemento sia VISIBILE (esito EXPECT)
#    expectnot <selettore>    verifica che NON sia visibile
#    eval <js>                valuta JS e ne stampa il risultato (sempre, anche con -Quiet)
#                             NB: deve stare su una riga sua — e' l'unica azione in cui
#                             i ';' NON separano: appartengono al codice JavaScript
#
#  Il selettore e' un normale selettore CSS. Per scegliere un elemento dal suo
#  testo si usa la sintassi  <css>|<testo>  (primo elemento che lo contiene):
#    rightclick #txBody tr[data-tx-id]
#    click .ctx-item|Duplica
#
#  ESEMPI
#    .\tools\interact.ps1 -Port 7891 -Do "goto transactions; rightclick #txBody tr; expect #ctxMenu; shot menu"
#    .\tools\interact.ps1 -Port 7891 -DoFile .\tools\flows\menu-contestuali.txt
#
#  ⚠️ Questo script AGISCE davvero: se una sequenza clicca "Elimina", cancella.
#     Verificare sempre su quale DB si sta lavorando (getSettings -> db.path)
#     e preferire il DB di progetto per le prove.
# ═══════════════════════════════════════════════════════════════════════════
param(
  [int]$Port      = 7890,
  [string]$Do     = "",                        # azioni separate da ';' o a capo
  [string]$DoFile = "",                        # file con un'azione per riga
  [int]$CdpPort   = 9222,
  [int]$Width     = 1600,
  [int]$Height    = 1000,
  [int]$StepMs    = 250,                       # pausa fra un'azione e l'altra
  [switch]$KeepOpen,
  [switch]$Quiet                               # stampa solo EXPECT/errori
)

$ErrorActionPreference = "Stop"

$OutDir = Join-Path $PSScriptRoot "screenshots"
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir -Force | Out-Null }
$chromeProfile = Join-Path $env:TEMP "lmm-chrome-cdp"

if ($DoFile) {
  if (-not (Test-Path $DoFile)) { Write-Error "File azioni non trovato: $DoFile"; exit 1 }
  $Do = (Get-Content $DoFile -Raw)
}
if (-not $Do) { Write-Error "Nessuna azione: usare -Do oppure -DoFile."; exit 1 }

# ─── Chrome ────────────────────────────────────────────────────────────────
$chrome = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $chrome) { Write-Error "Chrome/Edge non trovato."; exit 1 }

try { Invoke-WebRequest "http://127.0.0.1:$Port/" -TimeoutSec 3 -UseBasicParsing | Out-Null }
catch { Write-Error "L'app non risponde su http://127.0.0.1:$Port/ - avviala e abilita il WebServer."; exit 1 }

$needStart = $true
try { Invoke-RestMethod "http://127.0.0.1:$CdpPort/json/version" -TimeoutSec 2 | Out-Null; $needStart = $false } catch { }
if ($needStart) {
  Start-Process $chrome -ArgumentList `
    "--headless=new","--disable-gpu","--no-first-run","--no-default-browser-check",
    "--remote-debugging-port=$CdpPort","--user-data-dir=$chromeProfile",
    "--window-size=$Width,$Height","--hide-scrollbars","about:blank"
  $ok = $false
  foreach ($i in 1..40) {
    Start-Sleep -Milliseconds 200
    try { Invoke-RestMethod "http://127.0.0.1:$CdpPort/json/version" -TimeoutSec 2 | Out-Null; $ok = $true; break } catch { }
  }
  if (-not $ok) { Write-Error "Chrome non ha aperto la porta di debug $CdpPort."; exit 1 }
}

# ─── Sessione CDP ──────────────────────────────────────────────────────────
$tab = Invoke-RestMethod "http://127.0.0.1:$CdpPort/json/new?$([uri]::EscapeDataString("http://127.0.0.1:$Port/"))" -Method PUT -TimeoutSec 10
$ws  = New-Object System.Net.WebSockets.ClientWebSocket
$ct  = [System.Threading.CancellationToken]::None
$ws.ConnectAsync([uri]$tab.webSocketDebuggerUrl, $ct).Wait(10000) | Out-Null

$script:msgId = 0
function Send-Cdp([string]$method, $params, [int]$TimeoutMs = 30000) {
  $script:msgId++
  $msg = @{ id = $script:msgId; method = $method }
  if ($params) { $msg.params = $params }
  $bytes = [System.Text.Encoding]::UTF8.GetBytes(($msg | ConvertTo-Json -Depth 12 -Compress))
  $seg   = New-Object System.ArraySegment[byte] -ArgumentList @(,$bytes)
  $ws.SendAsync($seg, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $ct).Wait(10000) | Out-Null
  $sb = New-Object System.Text.StringBuilder
  while ($true) {
    $buf  = New-Object byte[] 262144
    $seg2 = New-Object System.ArraySegment[byte] -ArgumentList @(,$buf)
    $r = $ws.ReceiveAsync($seg2, $ct)
    if (-not $r.Wait($TimeoutMs)) { return $null }
    [void]$sb.Append([System.Text.Encoding]::UTF8.GetString($buf, 0, $r.Result.Count))
    if (-not $r.Result.EndOfMessage) { continue }
    $txt = $sb.ToString(); [void]$sb.Clear()
    try { $o = $txt | ConvertFrom-Json } catch { continue }
    if ($o.id -eq $script:msgId) { return $o }
  }
}

function Invoke-Js([string]$expression, [int]$TimeoutMs = 30000) {
  $wrapped = "(async () => { return ($expression); })()"
  $r = Send-Cdp "Runtime.evaluate" @{ expression = $wrapped; awaitPromise = $true; returnByValue = $true } $TimeoutMs
  if ($r.result.exceptionDetails) { return "JSERR: " + $r.result.exceptionDetails.text }
  return $r.result.result.value
}

Send-Cdp "Page.enable" $null | Out-Null
Send-Cdp "Emulation.setDeviceMetricsOverride" @{ width=$Width; height=$Height; deviceScaleFactor=1; mobile=$false } | Out-Null

# Attesa "pagina ferma": stesso criterio di screenshot.ps1.
$idleJs = @'
new Promise(res => {
  const t0 = Date.now();
  let dirty = 0;
  const obs = new MutationObserver(() => dirty++);
  obs.observe(document.body, { childList:true, subtree:true, attributes:true });
  const tick = () => {
    if (document.readyState === "complete" && dirty === 0) { obs.disconnect(); res(1); return; }
    dirty = 0;
    if (Date.now() - t0 > 6000) { obs.disconnect(); res(0); return; }
    setTimeout(() => requestAnimationFrame(tick), 100);
  };
  setTimeout(() => requestAnimationFrame(tick), 100);
})
'@
function Wait-Idle { Invoke-Js $idleJs 12000 | Out-Null }

# Trova un elemento e ne restituisce il centro in coordinate viewport.
# Sintassi selettore:  "css"  oppure  "css|testo" (primo che contiene il testo).
function Get-Center([string]$sel) {
  $css = $sel; $txt = $null
  if ($sel -match '^(.*?)\|(.*)$') { $css = $Matches[1].Trim(); $txt = $Matches[2].Trim() }
  $cssJs = $css.Replace('\', '\\').Replace("'", "\'")
  if ($txt) {
    $txtJs = $txt.Replace('\', '\\').Replace("'", "\'")
    $find = "Array.from(document.querySelectorAll('$cssJs')).find(e => (e.textContent||'').includes('$txtJs'))"
  } else {
    $find = "document.querySelector('$cssJs')"
  }
  $js = @"
(() => {
  const el = $find;
  if (!el) return JSON.stringify({ok:false, why:'non trovato'});
  el.scrollIntoView({block:'center', inline:'center'});
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return JSON.stringify({ok:false, why:'invisibile (0x0)'});
  return JSON.stringify({ok:true, x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2)});
})()
"@
  $raw = Invoke-Js $js
  if (-not $raw -or $raw -like "JSERR*") { return @{ ok=$false; why="errore JS: $raw" } }
  $o = $raw | ConvertFrom-Json
  if (-not $o.ok) { return @{ ok=$false; why=$o.why } }
  return @{ ok=$true; x=[int]$o.x; y=[int]$o.y }
}

# Click reale: CDP Input.dispatchMouseEvent. Il movimento del mouse prima del
# click serve a far scattare :hover e gli handler mouseover, come farebbe una
# mano vera; senza, alcune UI non aprono il menu.
function Send-Click([int]$x, [int]$y, [string]$button = "left", [int]$clicks = 1) {
  Send-Cdp "Input.dispatchMouseEvent" @{ type="mouseMoved"; x=$x; y=$y } | Out-Null
  Start-Sleep -Milliseconds 60
  Send-Cdp "Input.dispatchMouseEvent" @{
    type="mousePressed"; x=$x; y=$y; button=$button; clickCount=$clicks; buttons=$(if($button -eq 'right'){2}else{1})
  } | Out-Null
  Start-Sleep -Milliseconds 40
  Send-Cdp "Input.dispatchMouseEvent" @{
    type="mouseReleased"; x=$x; y=$y; button=$button; clickCount=$clicks; buttons=0
  } | Out-Null
}

# Codici tasto: servono a Chrome per generare l'evento corretto (i soli
# keyIdentifier non bastano per Enter/Escape/frecce).
$KEYS = @{
  "Enter"     = @{ code="Enter";      key="Enter";      vk=13 }
  "Escape"    = @{ code="Escape";     key="Escape";     vk=27 }
  "Tab"       = @{ code="Tab";        key="Tab";        vk=9  }
  "Delete"    = @{ code="Delete";     key="Delete";     vk=46 }
  "Backspace" = @{ code="Backspace";  key="Backspace";  vk=8  }
  "ArrowDown" = @{ code="ArrowDown";  key="ArrowDown";  vk=40 }
  "ArrowUp"   = @{ code="ArrowUp";    key="ArrowUp";    vk=38 }
  "ArrowLeft" = @{ code="ArrowLeft";  key="ArrowLeft";  vk=37 }
  "ArrowRight"= @{ code="ArrowRight"; key="ArrowRight"; vk=39 }
}
function Send-Key([string]$name) {
  if ($KEYS.ContainsKey($name)) {
    $k = $KEYS[$name]
    Send-Cdp "Input.dispatchKeyEvent" @{ type="rawKeyDown"; code=$k.code; key=$k.key; windowsVirtualKeyCode=$k.vk; nativeVirtualKeyCode=$k.vk } | Out-Null
    Send-Cdp "Input.dispatchKeyEvent" @{ type="keyUp";      code=$k.code; key=$k.key; windowsVirtualKeyCode=$k.vk; nativeVirtualKeyCode=$k.vk } | Out-Null
  } else {
    # tasto singolo (es. "R", "V", "?") -> char event
    Send-Cdp "Input.dispatchKeyEvent" @{ type="keyDown"; text=$name; key=$name } | Out-Null
    Send-Cdp "Input.dispatchKeyEvent" @{ type="keyUp";   key=$name } | Out-Null
  }
}

# ─── Esecuzione delle azioni ───────────────────────────────────────────────
# Si separa PRIMA sugli a capo, poi sui ';' — ma NON dentro un'azione `eval`,
# il cui argomento e' JavaScript e i ';' fanno parte del codice.
$azioni = @()
foreach ($riga in ($Do -split "[`r`n]")) {
  $r = $riga.Trim()
  if (-not $r -or $r -match '^#') { continue }
  if ($r -match '^(?i)eval\s') { $azioni += $r; continue }
  $azioni += ($r -split ';' | ForEach-Object { $_.Trim() } | Where-Object { $_ -and $_ -notmatch '^#' })
}
$fatti = 0; $falliti = 0
if (-not $Quiet) {
  Write-Host ""
  Write-Host "  Interazione - porta $Port" -ForegroundColor Cyan
  Write-Host "  ---------------------------------------------------------------"
}
Wait-Idle

foreach ($a in $azioni) {
  $verbo = ($a -split '\s+', 2)[0].ToLower()
  $arg   = if ($a -match '^\S+\s+(.*)$') { $Matches[1].Trim() } else { "" }
  $esito = $null; $errore = $null; $gestito = $false

  switch ($verbo) {
    "goto" {
      Invoke-Js "navigate('$arg')" | Out-Null; Wait-Idle; $esito = "pagina '$arg'"
    }
    { $_ -in @("click","rightclick","dblclick","hover") } {
      $c = Get-Center $arg
      if (-not $c.ok) { $errore = "$arg -> $($c.why)"; break }
      switch ($verbo) {
        "click"      { Send-Click $c.x $c.y "left"  1 }
        "rightclick" { Send-Click $c.x $c.y "right" 1 }
        "dblclick"   { Send-Click $c.x $c.y "left"  2 }
        "hover"      { Send-Cdp "Input.dispatchMouseEvent" @{ type="mouseMoved"; x=$c.x; y=$c.y } | Out-Null }
      }
      $esito = "$arg @ $($c.x),$($c.y)"
    }
    "type" {
      foreach ($ch in $arg.ToCharArray()) {
        Send-Cdp "Input.dispatchKeyEvent" @{ type="char"; text=[string]$ch } | Out-Null
        Start-Sleep -Milliseconds 15
      }
      $esito = "digitato '$arg'"
    }
    "key"  { Send-Key $arg; $esito = "tasto $arg" }
    "wait" { Start-Sleep -Milliseconds ([int]$arg); $esito = "$arg ms" }
    "shot" {
      Start-Sleep -Milliseconds 150
      $f = Join-Path $OutDir "$arg.png"
      $s = Send-Cdp "Page.captureScreenshot" @{ format="png" }
      if ($s.result.data) { [IO.File]::WriteAllBytes($f, [Convert]::FromBase64String($s.result.data)); $esito = $f }
      else { $errore = "screenshot fallito" }
    }
    { $_ -in @("expect","expectnot") } {
      # Ritenta per ~1,5s: diversi menu vengono CREATI dal JS dopo il click
      # (document.body.appendChild in un setTimeout), quindi al primo controllo
      # possono non esistere ancora. Senza retry si otterrebbero KO fasulli.
      $atteso = ($verbo -eq "expect")
      # Un giro a vuoto prima di misurare: i menu creati da JS vengono agganciati
      # in un setTimeout(...,0), quindi subito dopo il click possono non esserci
      # ancora. Poi si ritenta fino a ~1,5s prima di dichiarare l'esito.
      Start-Sleep -Milliseconds 120
      $c = $null
      foreach ($try in 1..10) {
        $c = Get-Center $arg
        if ($c.ok -eq $atteso) { break }
        Start-Sleep -Milliseconds 150
      }
      $visibile = $c.ok
      if ($visibile -eq $atteso) {
        Write-Host ("  [EXPECT ok] {0}{1}" -f $(if(-not $atteso){"NON visibile: "}), $arg) -ForegroundColor Green
        $fatti++
      } else {
        $motivo = if ($atteso) { $c.why } else { "e' visibile ma non doveva esserlo" }
        Write-Host ("  [EXPECT KO] {0} -> {1}" -f $arg, $motivo) -ForegroundColor Red
        $falliti++
      }
      Start-Sleep -Milliseconds $StepMs
      # gia' stampato e contato qui sopra: niente report generico in fondo al ciclo
      $gestito = $true
    }
    "eval" {
      # Il risultato si stampa SEMPRE, anche con -Quiet: eval serve a misurare,
      # e una misura invisibile e' inutile.
      $v = Invoke-Js $arg
      Write-Host ("  [eval] {0}" -f $v) -ForegroundColor Cyan
      $fatti++
      Start-Sleep -Milliseconds $StepMs
      $gestito = $true
    }
    default { $errore = "azione sconosciuta: '$verbo'" }
  }

  # expect/expectnot hanno gia' stampato e contato il proprio esito
  if ($gestito) { continue }

  if ($errore) {
    Write-Host ("  [KO] {0}  {1}" -f $verbo, $errore) -ForegroundColor Red
    $falliti++
  } else {
    if (-not $Quiet) { Write-Host ("  [ok] {0}  {1}" -f $verbo.PadRight(10), $esito) -ForegroundColor DarkGray }
    $fatti++
  }
  Start-Sleep -Milliseconds $StepMs
}

if (-not $Quiet) { Write-Host "  ---------------------------------------------------------------" }
if ($falliti) { Write-Host "  $falliti azioni fallite, $fatti ok" -ForegroundColor Red }
else          { Write-Host "  Tutte le $fatti azioni ok" -ForegroundColor Green }
Write-Host ""

Send-Cdp "Emulation.clearDeviceMetricsOverride" $null | Out-Null
$ws.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "", $ct).Wait(3000) | Out-Null
try { Invoke-RestMethod "http://127.0.0.1:$CdpPort/json/close/$($tab.id)" -TimeoutSec 5 | Out-Null } catch { }
if (-not $KeepOpen -and $needStart) {
  Get-Process chrome, msedge -ErrorAction SilentlyContinue |
    Where-Object { $_.Path -eq $chrome -and $_.CommandLine -like "*$chromeProfile*" } |
    Stop-Process -Force -ErrorAction SilentlyContinue
}
if ($falliti) { exit 1 }
