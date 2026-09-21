# ─────────────────────────────────────────────────────────────────────────────
# copy-db.ps1 — rifà il DB di test (progetto) a immagine di quello di produzione (OneDrive),
# TRANNE le impostazioni.
#
#   .\tools\copy-db.ps1
#   .\tools\copy-db.ps1 -Yes        # senza chiedere conferma (per chi lo lancia da uno script)
#
# Non copia il file: droppa e ricrea le tabelle del test rileggendole da prod, che si apre in
# sola lettura, e lascia com'è la tabella app_settings. È il motivo del cambio: la copia di file
# riportava indietro anche la cartella dei backup e quella degli allegati di PRODUZIONE, e il DB
# di progetto andava ripuntato in locale a ogni giro. Ora quelle impostazioni si mettono una
# volta e restano.
#
# Il lavoro sta in tools\CopiaDb.java (piano, conferma, ricostruzione, verifica contro prod, e
# tutto in una transazione: se qualcosa non torna il test resta com'era). Qui ci sono solo le
# tre cose che servono a lanciarlo: il JAR col driver SQLite, i due path e il controllo che il
# DB di test non sia aperto da un altro programma.
#
# La direzione è una sola — prod → test — proprio perché l'inversa sovrascriverebbe i dati veri.
# Il DB di test viene ricostruito senza copie di sicurezza: è una copia di lavoro, rigenerabile
# in qualsiasi momento rilanciando questo script.
#
# ⚠️ Con l'app aperta sul DB di test lo script si ferma prima di toccare qualcosa: il file è
# tenuto dall'app e la ricostruzione andrebbe a scrivergli sotto i piedi.
# ─────────────────────────────────────────────────────────────────────────────
param(
  [switch] $Yes
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent

# Senza questo le accentate escono come "?": la console eredita la code page OEM, Java scrive UTF-8.
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch {}

# Gli stessi due path degli altri strumenti (db.ps1, test-*.ps1, DbQuery.java): se cambiano lì,
# cambiano qui.
$PROD  = "$env:USERPROFILE\OneDrive\Documents\Luca_Money_Manager\luca.db"
$LOCAL = Join-Path $root 'lucatest.db'

# Il driver sqlite-jdbc sta dentro il fat JAR: si prende il più recente. Se manca (target/
# ripulita), si ripiega sul JAR del driver nella cache Maven. Stesso schema di db.ps1.
$jar = Get-ChildItem (Join-Path $root 'target') -Filter 'moneymanager-*.jar' -ErrorAction SilentlyContinue |
       Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $jar) {
  $jar = Get-ChildItem "$env:USERPROFILE\.m2\repository\org\xerial\sqlite-jdbc" -Recurse -Filter '*.jar' -ErrorAction SilentlyContinue |
         Sort-Object LastWriteTime -Descending | Select-Object -First 1
}
if (-not $jar) { Write-Error "Driver SQLite non trovato: manca sia target\moneymanager-*.jar sia sqlite-jdbc in ~\.m2. Esegui 'mvn package'."; exit 1 }

# Il DB di test va scritto: se l'app (o un altro programma) lo tiene aperto, l'apertura
# esclusiva fallisce. Meglio accorgersene adesso che a lavoro iniziato.
function Bloccato($path) {
    if (-not (Test-Path -LiteralPath $path)) { return $false }
    try { $h = [IO.File]::Open($path, 'Open', 'ReadWrite', 'None'); $h.Close(); $false }
    catch { $true }
}

if (Bloccato $LOCAL) {
    Write-Host ''
    Write-Host "  ERRORE: il DB di test e' bloccato da un altro programma: $LOCAL" -ForegroundColor Red
    Write-Host '          Chiudi l''app (o il tool che lo tiene aperto) e riprova.'
    Write-Host ''
    exit 1
}

$jargs = @('--prod', $PROD, '--test', $LOCAL)
if ($Yes) { $jargs += '--yes' }

# --enable-native-access: sqlite-jdbc carica una libreria nativa; senza il flag, Java 25
# stampa quattro righe di WARNING prima di ogni risultato.
& java --enable-native-access=ALL-UNNAMED --class-path $jar.FullName (Join-Path $PSScriptRoot 'CopiaDb.java') @jargs
exit $LASTEXITCODE
