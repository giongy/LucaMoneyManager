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
#
#  NB: -Js gira nel contesto della pagina, quindi vede le funzioni globali
#      dell'app (navigate, applyTheme, currentPage, ...). Il valore restituito
#      viene stampato: utile per leggere stili calcolati o stato interno.
# ═══════════════════════════════════════════════════════════════════════════
param(
  [int]$Port        = 7890,                    # porta del WebServer
  [string]$Js       = "",                      # JS da eseguire prima dello scatto
  [string]$Out      = "shot",                  # nome file (senza estensione)
  [string]$OutDir   = "",                      # cartella output (default: tools/screenshots)
  [int]$SettleMs    = 3500,                    # attesa render/caricamento dati
  [int]$Width       = 1600,
  [int]$Height      = 1000,
  [int]$CdpPort     = 9222,                    # porta debug di Chrome
  [switch]$KeepOpen                            # non chiudere Chrome a fine run
)

$ErrorActionPreference = "Stop"

# ─── Percorsi ──────────────────────────────────────────────────────────────
$root = Split-Path -Parent $PSScriptRoot
if (-not $OutDir) { $OutDir = Join-Path $PSScriptRoot "screenshots" }
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir -Force | Out-Null }
$outFile = Join-Path $OutDir "$Out.png"
$profile = Join-Path $env:TEMP "lmm-chrome-cdp"

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

# Chrome con debug remoto gia' attivo? altrimenti lo avvia
$needStart = $true
try { Invoke-RestMethod "http://127.0.0.1:$CdpPort/json/version" -TimeoutSec 2 | Out-Null; $needStart = $false } catch { }
if ($needStart) {
  Start-Process $chrome -ArgumentList `
    "--headless=new","--disable-gpu","--no-first-run","--no-default-browser-check",
    "--remote-debugging-port=$CdpPort","--user-data-dir=$profile",
    "--window-size=$Width,$Height","--hide-scrollbars","about:blank"
  $ok = $false
  foreach ($i in 1..20) {
    Start-Sleep -Milliseconds 400
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
function Send-Cdp([string]$method, $params) {
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
    if (-not $r.Wait(30000)) { return $null }
    [void]$sb.Append([System.Text.Encoding]::UTF8.GetString($buf, 0, $r.Result.Count))
    if (-not $r.Result.EndOfMessage) { continue }
    $txt = $sb.ToString(); [void]$sb.Clear()
    try { $o = $txt | ConvertFrom-Json } catch { continue }
    if ($o.id -eq $script:msgId) { return $o }   # ignora gli eventi non richiesti
  }
}

Send-Cdp "Page.enable" $null | Out-Null
Start-Sleep -Milliseconds $SettleMs

# NB: si usa Write-Output (non Write-Host) perche' check-ui.ps1 cattura queste
# righe per filtrarle; Write-Host scrive sulla console e sfuggirebbe alla cattura.
if ($Js) {
  $res = Send-Cdp "Runtime.evaluate" @{ expression = $Js; awaitPromise = $true; returnByValue = $true }
  if ($null -ne $res.result.result.value) { Write-Output $res.result.result.value }
  if ($res.result.exceptionDetails)       { Write-Output ("JS ERRORE: " + $res.result.exceptionDetails.text) }
  Start-Sleep -Milliseconds $SettleMs
}

$shot = Send-Cdp "Page.captureScreenshot" @{ format = "png" }
if ($shot.result.data) {
  [IO.File]::WriteAllBytes($outFile, [Convert]::FromBase64String($shot.result.data))
  Write-Output ("OK  $outFile  (" + [math]::Round((Get-Item $outFile).Length / 1KB) + " KB)")
} else {
  Write-Error "Screenshot fallito."
}

$ws.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "", $ct).Wait(3000) | Out-Null
Invoke-RestMethod "http://127.0.0.1:$CdpPort/json/close/$($tab.id)" -TimeoutSec 5 | Out-Null
if (-not $KeepOpen -and $needStart) {
  try { Invoke-RestMethod "http://127.0.0.1:$CdpPort/json/close/$($tab.id)" -TimeoutSec 2 | Out-Null } catch { }
  Get-Process chrome, msedge -ErrorAction SilentlyContinue |
    Where-Object { $_.Path -eq $chrome -and $_.CommandLine -like "*$profile*" } |
    Stop-Process -Force -ErrorAction SilentlyContinue
}
