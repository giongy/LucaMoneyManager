# ═══════════════════════════════════════════════════════════════════════════
#  screenshot.ps1 — cattura schermate dell'app e ne ispeziona il rendering
#
#  L'app espone la UI via HTTP (classe WebServer): questo script la apre in
#  Chrome headless pilotato via DevTools Protocol, quindi puo' navigare tra le
#  pagine, eseguire JS nella pagina e salvare uno screenshot PNG.
#  Serve a verificare CSS/impaginazione/temi guardando il risultato reale,
#  invece di dedurlo dal codice.
#
#  PREREQUISITI
#    - App in esecuzione con WebServer attivo (Impostazioni -> accesso LAN).
#      Porta di default 7890; da VSCode si usa spesso un'altra istanza/porta.
#    - Google Chrome installato (nessun npm/Node richiesto).
#
#  ESEMPI
#    .\tools\screenshot.ps1 -Out dashboard
#    .\tools\screenshot.ps1 -Port 7891 -Js "navigate('transactions')" -Out tx
#    .\tools\screenshot.ps1 -Js "applyTheme('carta'); navigate('budgets')" -Out budget-carta
#    .\tools\screenshot.ps1 -Js "getComputedStyle(document.body).backgroundColor" -Probe
#    .\tools\screenshot.ps1 -Out tema -Stamp        # tema-<contatore>.png, mai sovrascritto
#
#  NB: -Js gira nel contesto della pagina, quindi vede le funzioni globali
#      dell'app (navigate, applyTheme, currentPage, ...). Il valore restituito
#      viene stampato: utile per leggere stili calcolati o stato interno.
#      Si puo' usare direttamente `await` (es. "await api.getSettings()"): lo
#      script incapsula l'espressione in una funzione async.
#
#  ─── LEGGERE IL RISULTATO ──────────────────────────────────────────────────
#  Lo script stampa sempre una riga  PIXEL <hash> <colori>  con l'impronta del
#  PNG appena scritto. Serve a un agente (o a chiunque legga il file con un
#  visualizzatore che fa cache) per accorgersi se sta guardando uno scatto
#  vecchio: se l'immagine sembra invariata ma l'hash e' cambiato, la vista e'
#  stantia, non il rendering. Con -Stamp ogni scatto ha un nome nuovo e il
#  problema non si pone affatto.
# ═══════════════════════════════════════════════════════════════════════════
param(
  [int]$Port        = 7890,                    # porta del WebServer
  [string]$Js       = "",                      # JS da eseguire prima dello scatto (supporta await)
  [string]$Out      = "shot",                  # nome file (senza estensione)
  [string]$OutDir   = "",                      # cartella output (default: tools/screenshots)
  [int]$SettleMs    = 0,                       # 0 = attesa automatica (vedi Wait-Idle)
  [int]$MaxWaitMs   = 8000,                    # tetto massimo dell'attesa automatica
  # Default allineati allo schermo reale dell'utente (1920x1080). L'altezza e'
  # 970 e non 1080 perche' e' l'area utile: barra applicazioni di Windows (~48px)
  # e titlebar dell'app (~44px, nascosta in modalita' browser) non fanno parte
  # del viewport. Scattare piu' stretto di cosi' TAGLIA contenuto reale: a 1600px
  # le colonne Totale/Media di Categorie/Mese restavano fuori dall'immagine e
  # sembravano assenti.
  [int]$Width       = 1920,
  [int]$Height      = 970,
  [int]$CdpPort     = 9222,                    # porta debug di Chrome
  [switch]$KeepOpen,                           # non chiudere Chrome a fine run
  [switch]$Stamp,                              # aggiunge un progressivo al nome file
  [switch]$Probe,                              # solo misura JS, nessun PNG (piu' veloce)
  [switch]$NoCache                             # ignora la cache HTTP (dopo un deploy di CSS/JS)
)
# NB: niente opzione "full page": il layout dell'app e' a viewport fissa (e' .page-container
# a scrollare, non il documento), quindi captureBeyondViewport non estenderebbe nulla.
# Per vedere il fondo di una lista lunga si scrolla via -Js prima dello scatto.

$ErrorActionPreference = "Stop"

# ─── Percorsi ──────────────────────────────────────────────────────────────
if (-not $OutDir) { $OutDir = Join-Path $PSScriptRoot "screenshots" }
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir -Force | Out-Null }

# -Stamp: nome sempre nuovo (dash-001.png, dash-002.png, ...). Serve quando si
# confrontano piu' scatti a distanza di poco: riusare lo stesso path e' la via
# piu' rapida per farsi ingannare da una copia in cache del visualizzatore.
if ($Stamp) {
  $n = 1
  while (Test-Path (Join-Path $OutDir ("{0}-{1:d3}.png" -f $Out, $n))) { $n++ }
  $outFile = Join-Path $OutDir ("{0}-{1:d3}.png" -f $Out, $n)
} else {
  $outFile = Join-Path $OutDir "$Out.png"
}
$chromeProfile = Join-Path $env:TEMP "lmm-chrome-cdp"

# ─── Chrome ────────────────────────────────────────────────────────────────
$chrome = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $chrome) { Write-Error "Chrome/Edge non trovato."; exit 1 }

# App raggiungibile?
try { Invoke-WebRequest "http://127.0.0.1:$Port/" -TimeoutSec 3 -UseBasicParsing | Out-Null }
catch { Write-Error "L'app non risponde su http://127.0.0.1:$Port/ - avviala e abilita il WebServer."; exit 1 }

# Chrome con debug remoto gia' attivo? altrimenti lo avvia.
# NB: --window-size vale solo all'AVVIO. Se Chrome e' gia' aperto a un'altra
# dimensione, la si forza via CDP piu' sotto (Emulation.setDeviceMetricsOverride).
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
$url = "http://127.0.0.1:$Port/"
$tab = Invoke-RestMethod "http://127.0.0.1:$CdpPort/json/new?$([uri]::EscapeDataString($url))" -Method PUT -TimeoutSec 10
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
    if ($o.id -eq $script:msgId) { return $o }   # ignora gli eventi non richiesti
  }
}

# Esegue JS nella pagina. Il codice e' incapsulato in una IIFE async, cosi' si
# puo' usare `await` direttamente senza costruire una Promise a mano.
# NB: NON si racchiude l'espressione fra parentesi. Con piu' istruzioni separate
# da ';' — la forma piu' comune qui, es. "applyTheme('carta'); navigate('x')" —
# `return (a; b)` e' un errore di sintassi. Si aggiunge invece un `return`
# implicito solo sull'ULTIMA istruzione, come fa la console del browser.
function Invoke-Js([string]$expression, [int]$TimeoutMs = 30000) {
  $code = $expression.Trim().TrimEnd(';').Trim()
  # Ultima istruzione al primo livello (ignora ';' dentro stringhe, parentesi e graffe):
  # se e' un'espressione le si mette davanti `return`, cosi' il valore torna allo script.
  $depth = 0; $inStr = $null; $cut = -1
  for ($i = 0; $i -lt $code.Length; $i++) {
    $ch = $code[$i]
    if ($inStr) {
      if ($ch -eq '\') { $i++ }
      elseif ($ch -eq $inStr) { $inStr = $null }
      continue
    }
    if ($ch -eq "'" -or $ch -eq '"' -or $ch -eq '`') { $inStr = $ch; continue }
    if ('([{'.Contains($ch)) { $depth++; continue }
    if (')]}'.Contains($ch)) { $depth--; continue }
    if ($ch -eq ';' -and $depth -eq 0) { $cut = $i }
  }
  if ($cut -ge 0) {
    $head = $code.Substring(0, $cut + 1)
    $tail = $code.Substring($cut + 1).Trim()
    # Se dopo l'ultimo ';' non resta nulla, o resta un costrutto che non e'
    # un'espressione, si lascia il codice com'e'.
    if ($tail -and $tail -notmatch '^(return|if|for|while|var|let|const|function|class|switch|try)\b') {
      $body = "$head return $tail;"
    } else {
      $body = $code
    }
  } elseif ($code -match '^(return|if|for|while|var|let|const|function|class|switch|try)\b') {
    $body = $code
  } else {
    $body = "return ($code);"
  }
  $wrapped = "(async () => { $body })()"
  return Send-Cdp "Runtime.evaluate" @{
    expression = $wrapped; awaitPromise = $true; returnByValue = $true
  } $TimeoutMs
}

Send-Cdp "Page.enable" $null | Out-Null
if ($NoCache) { Send-Cdp "Network.enable" $null | Out-Null; Send-Cdp "Network.setCacheDisabled" @{ cacheDisabled = $true } | Out-Null }

# Dimensione viewport deterministica: --window-size non basta se Chrome era gia'
# aperto (la scheda eredita la dimensione della finestra esistente).
Send-Cdp "Emulation.setDeviceMetricsOverride" @{
  width = $Width; height = $Height; deviceScaleFactor = 1; mobile = $false
} | Out-Null

# ─── Attesa: quanto basta, non a tempo fisso ───────────────────────────────
# Prima era un Start-Sleep fisso applicato DUE volte (prima e dopo il -Js):
# ~7s a scatto anche su una pagina gia' pronta. Qui si aspetta la condizione
# reale — documento complete, nessuna richiesta di rete in volo, due frame
# consecutivi senza mutazioni del DOM — con un tetto massimo di sicurezza.
$idleProbe = @'
new Promise(res => {
  const t0 = Date.now();
  if (window.__lmmObs) { window.__lmmObs.disconnect(); }
  let dirty = 0;
  const obs = new MutationObserver(() => { dirty++; });
  window.__lmmObs = obs;
  obs.observe(document.body, { childList: true, subtree: true, attributes: true });
  const tick = () => {
    const done = document.readyState === "complete";
    const quiet = dirty === 0;
    if (done && quiet) { obs.disconnect(); res("idle:" + (Date.now() - t0) + "ms"); return; }
    dirty = 0;
    if (Date.now() - t0 > MAXWAIT) { obs.disconnect(); res("timeout:" + (Date.now() - t0) + "ms"); return; }
    setTimeout(() => requestAnimationFrame(tick), 120);
  };
  setTimeout(() => requestAnimationFrame(tick), 120);
})
'@

function Wait-Idle([int]$MaxMs) {
  if ($SettleMs -gt 0) { Start-Sleep -Milliseconds $SettleMs; return "fixed:${SettleMs}ms" }
  $probe = $idleProbe.Replace("MAXWAIT", $MaxMs)
  $r = Invoke-Js $probe ($MaxMs + 5000)
  if ($null -ne $r.result.result.value) { return $r.result.result.value }
  return "n/d"
}

$waitLoad = Wait-Idle $MaxWaitMs

# NB: si usa Write-Output (non Write-Host) perche' check-ui.ps1 cattura queste
# righe per filtrarle; Write-Host scrive sulla console e sfuggirebbe alla cattura.
if ($Js) {
  $res = Invoke-Js $Js
  if ($null -ne $res.result.result.value) { Write-Output $res.result.result.value }
  if ($res.result.exceptionDetails)       { Write-Output ("JS ERRORE: " + $res.result.exceptionDetails.text) }
  # Dopo il -Js si riattende l'idle: navigate()/applyTheme() ridisegnano, e
  # scattare troppo presto cattura il render PRECEDENTE (era la causa piu'
  # frequente di screenshot "sbagliati" che in realta' erano solo prematuri).
  Wait-Idle $MaxWaitMs | Out-Null
}

# ─── Scatto ────────────────────────────────────────────────────────────────
if ($Probe) {
  # Solo misura: niente PNG. Utile quando serve un valore calcolato e non l'immagine.
  Write-Output "PROBE (nessun PNG)  attesa=$waitLoad"
} else {
  $shotParams = @{ format = "png" }
  if ($FullPage) { $shotParams.captureBeyondViewport = $true }
  $shot = Send-Cdp "Page.captureScreenshot" $shotParams
  if ($shot.result.data) {
    [IO.File]::WriteAllBytes($outFile, [Convert]::FromBase64String($shot.result.data))
    $kb = [math]::Round((Get-Item $outFile).Length / 1KB)
    Write-Output ("OK  $outFile  ($kb KB)  attesa=$waitLoad")

    # Impronta del PNG: hash + colori campionati. Permette di distinguere
    # "il rendering non e' cambiato" da "sto guardando una copia in cache".
    $hash = (Get-FileHash $outFile -Algorithm MD5).Hash.Substring(0, 8)
    try {
      Add-Type -AssemblyName System.Drawing -ErrorAction Stop
      $img = [System.Drawing.Image]::FromFile($outFile)
      $bmp = New-Object System.Drawing.Bitmap $img
      # tre punti indicativi: sfondo pagina, area contenuto, barra in alto
      $pts = @(@([int]($bmp.Width*0.55), [int]($bmp.Height*0.75)),
               @([int]($bmp.Width*0.08), [int]($bmp.Height*0.35)),
               @([int]($bmp.Width*0.55), [int]($bmp.Height*0.02)))
      $cols = foreach ($p in $pts) {
        $x = [Math]::Min([Math]::Max($p[0],0), $bmp.Width-1)
        $y = [Math]::Min([Math]::Max($p[1],0), $bmp.Height-1)
        $c = $bmp.GetPixel($x, $y); "#{0:x2}{1:x2}{2:x2}" -f $c.R, $c.G, $c.B
      }
      $bmp.Dispose(); $img.Dispose()
      Write-Output ("PIXEL $hash  " + ($cols -join " "))
    } catch {
      Write-Output "PIXEL $hash  (campionamento non disponibile)"
    }
  } else {
    Write-Error "Screenshot fallito."
  }
}

Send-Cdp "Emulation.clearDeviceMetricsOverride" $null | Out-Null
$ws.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "", $ct).Wait(3000) | Out-Null
try { Invoke-RestMethod "http://127.0.0.1:$CdpPort/json/close/$($tab.id)" -TimeoutSec 5 | Out-Null } catch { }
if (-not $KeepOpen -and $needStart) {
  Get-Process chrome, msedge -ErrorAction SilentlyContinue |
    Where-Object { $_.Path -eq $chrome -and $_.CommandLine -like "*$chromeProfile*" } |
    Stop-Process -Force -ErrorAction SilentlyContinue
}
