# ─────────────────────────────────────────────────────────────────────────────
# copy-db.ps1 — copia il DB di produzione (OneDrive) sopra quello di test (progetto).
#
#   .\tools\copy-db.ps1
#
# Serve a lavorare su dati veri senza toccarli: si prova sulla copia in D:\, il DB
# reale resta intatto. La direzione è una sola — prod → test — proprio perché
# l'inversa sovrascriverebbe i dati veri.
#
# Prima di copiare mostra i due file (path, dimensione, data) e chiede conferma:
# INVIO procede, qualsiasi altro tasto annulla. Il DB di test viene sovrascritto e
# basta: niente .bak, è una copia di lavoro rigenerabile in qualsiasi momento
# rilanciando questo script.
#
# ⚠️ Con l'app aperta sul DB di destinazione il file è bloccato e la copia fallisce:
# lo script se ne accorge prima e si ferma, senza lasciare la copia a metà.
# ─────────────────────────────────────────────────────────────────────────────

$ErrorActionPreference = 'Stop'

# Gli stessi due path di tools\DbQuery.java (PROD / LOCAL): se cambiano lì, cambiano qui.
$src = 'C:\Users\lucaa\OneDrive\Documents\Luca_Money_Manager\luca.db'
$dst = 'D:\LucaMoneyManager\luca.db'

# Descrive un file in una riga: esiste o no, quanto pesa, di quando è.
function Descrivi($path) {
    $f = Get-Item -LiteralPath $path -ErrorAction SilentlyContinue
    if (-not $f) { return '(non esiste ancora)' }
    '{0,8:N0} KB   modificato {1:dd/MM/yyyy HH:mm}' -f ($f.Length / 1KB), $f.LastWriteTime
}

# Il DB di destinazione va scritto: se l'app lo tiene aperto, l'apertura esclusiva fallisce.
# Meglio accorgersene adesso che a copia iniziata.
function Bloccato($path) {
    if (-not (Test-Path -LiteralPath $path)) { return $false }
    try { $h = [IO.File]::Open($path, 'Open', 'ReadWrite', 'None'); $h.Close(); $false }
    catch { $true }
}

if (-not (Test-Path -LiteralPath $src)) {
    Write-Host "ERRORE: il DB di produzione non esiste: $src" -ForegroundColor Red
    exit 1
}

Write-Host ''
Write-Host '  Copia del database: PRODUZIONE  ->  TEST' -ForegroundColor Cyan
Write-Host '  ---------------------------------------------------------------'
Write-Host '  DA  (prod, resta intatto) ' -NoNewline; Write-Host $src -ForegroundColor White
Write-Host "                            $(Descrivi $src)"
Write-Host ''
Write-Host '  A   (test, SOVRASCRITTO)  ' -NoNewline; Write-Host $dst -ForegroundColor Yellow
Write-Host "                            $(Descrivi $dst)"
Write-Host ''
if (Bloccato $dst) {
    Write-Host '  ERRORE: il DB di test e'' bloccato da un altro programma.' -ForegroundColor Red
    Write-Host '          Chiudi l''app (o il tool che lo tiene aperto) e riprova.'
    Write-Host ''
    exit 1
}

$risposta = Read-Host '  INVIO per confermare, qualsiasi altro tasto + INVIO per annullare'
if ($risposta -ne '') {
    Write-Host '  Annullato: niente e'' stato modificato.' -ForegroundColor DarkGray
    Write-Host ''
    exit 2
}

Copy-Item -LiteralPath $src -Destination $dst -Force

Write-Host ''
Write-Host '  Fatto. DB di test aggiornato:' -ForegroundColor Green
Write-Host "  $dst   $(Descrivi $dst)"
Write-Host ''

exit 0
