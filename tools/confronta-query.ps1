# Confronto "prima/dopo" delle letture di Database: dice se le modifiche in corso cambiano un
# numero che l'app mostra.
#
#   .\tools\confronta-query.ps1                  # modifiche in corso contro HEAD, sul DB di progetto
#   .\tools\confronta-query.ps1 -Database prod   # sui dati veri, senza toccarli (lavora su copie)
#   .\tools\confronta-query.ps1 -Rif HEAD~1      # l'ultimo commit contro quello prima
#   .\tools\confronta-query.ps1 -Keep            # conserva la cartella di lavoro per ispezionarla
#
# Come funziona:
#   1. compila con javac la versione di riferimento (i sorgenti di -Rif, estratti con git archive)
#      e quella del working tree, con lo STESSO comando
#   2. copia il DB una volta sola: entrambe le versioni lavorano sugli stessi identici byte
#   3. lancia ConfrontaQuery.java tre volte: riferimento, nuova, di nuovo riferimento (la terza
#      smaschera le chiamate non deterministiche, che altrimenti sembrerebbero differenze)
#   4. confronta risultati (esito) e testo SQL (informativo)
#
# Esce con 0 se i risultati sono identici, 1 se qualcosa cambia, 2 se il confronto non è partito.
[CmdletBinding()]
param(
  [string] $Database = 'local',
  [string] $Rif = 'HEAD',
  [switch] $Keep
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch {}

$PROD  = "$env:USERPROFILE\OneDrive\Documents\Luca_Money_Manager\luca.db"
$LOCAL = Join-Path $root 'lucatest.db'
$src = switch ($Database) {
  'local' { $LOCAL }
  'prod'  { $PROD }
  default { $Database }
}
if (-not (Test-Path $src)) { Write-Host "DB non trovato: $src" -ForegroundColor Red; exit 2 }

# Le dipendenze (sqlite-jdbc, Gson) vengono dal fat JAR, come per test-titoli.
$jar = Get-ChildItem (Join-Path $root 'target') -Filter 'moneymanager-*.jar' -ErrorAction SilentlyContinue |
       Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $jar) { Write-Host "Manca il fat JAR in target: esegui 'mvn package'." -ForegroundColor Red; exit 2 }

$javac = if ($env:JAVA_HOME -and (Test-Path "$env:JAVA_HOME\bin\javac.exe")) { "$env:JAVA_HOME\bin\javac.exe" }
         else { (Get-Command javac -ErrorAction SilentlyContinue).Source }
if (-not $javac) { Write-Host "javac non trovato (cercato in JAVA_HOME e nel PATH)." -ForegroundColor Red; exit 2 }

# Da qui in poi si lanciano comandi nativi: con 'Stop', PowerShell 5.1 tratterebbe come errore
# fatale qualsiasi riga scritta su stderr (anche un semplice warning). L'esito si legge da
# $LASTEXITCODE.
$ErrorActionPreference = 'Continue'

$rifDesc = & git -C $root log -1 --format='%h %s' $Rif 2>$null
if ($LASTEXITCODE -ne 0) { Write-Host "Riferimento git non valido: $Rif" -ForegroundColor Red; exit 2 }

$lavoro = Join-Path ([IO.Path]::GetTempPath()) ("mm-confronto-{0}" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Force $lavoro | Out-Null

function Esci($codice) {
  if ($Keep) { Write-Host "`nCartella di lavoro conservata: $lavoro" }
  else { Remove-Item -Recurse -Force $lavoro -ErrorAction SilentlyContinue }
  exit $codice
}

$info = Get-Item $src
Write-Host ("Riferimento: {0}  ({1})" -f $Rif, $rifDesc)
Write-Host  "Confronto:   working tree"
$modifiche = & git -C $root diff --stat $Rif -- src/main/java
if ($modifiche) { $modifiche | ForEach-Object { Write-Host "             $_" } }
else { Write-Host "             nessuna modifica in src/main/java: il confronto deve risultare identico" -ForegroundColor Yellow }
Write-Host ("DB:          {0}  ({1:N0} KB, modificato {2:yyyy-MM-dd HH:mm})" -f $src, ($info.Length/1KB), $info.LastWriteTime)

# ── 1. sorgenti di riferimento ──────────────────────────────────────────────
$zip = Join-Path $lavoro 'rif.zip'
& git -C $root archive --format=zip -o $zip $Rif -- src/main/java
if ($LASTEXITCODE -ne 0) { Write-Host "git archive fallito" -ForegroundColor Red; Esci 2 }
Expand-Archive -Path $zip -DestinationPath (Join-Path $lavoro 'rif-src') -Force

# ── 2. compilazione, stesso comando per le due versioni ────────────────────
# -Xprefer:source: il fat JAR contiene anche le classi dell'app, compilate all'ultimo
# 'mvn package'. Con la regola di default ("il più recente vince") javac potrebbe usare quelle
# invece dei sorgenti che gli diamo, e si confronterebbe codice diverso da quello dichiarato.
# -sourcepath compila Database.java e solo ciò che usa.
function Compila($srcDir, $outDir) {
  $out = & $javac --release 25 -encoding UTF-8 -proc:none -nowarn -Xprefer:source `
           -d $outDir -cp $jar.FullName -sourcepath $srcDir `
           (Join-Path $srcDir 'com\moneymanager\Database.java') 2>&1
  if ($LASTEXITCODE -ne 0) { $out | ForEach-Object { Write-Host "   $_" }; return $false }
  return $true
}
Write-Host "`nCompilo le due versioni..."
if (-not (Compila (Join-Path $lavoro 'rif-src\src\main\java') (Join-Path $lavoro 'cls-rif'))) {
  Write-Host "Compilazione del riferimento fallita." -ForegroundColor Red; Esci 2
}
if (-not (Compila (Join-Path $root 'src\main\java') (Join-Path $lavoro 'cls-nuovo'))) {
  Write-Host "Compilazione della versione in corso fallita." -ForegroundColor Red; Esci 2
}

# ── 3. una sola copia del DB, poi le tre esecuzioni ────────────────────────
$sorgente = Join-Path $lavoro 'sorgente.db'
Copy-Item $src $sorgente
$tool = Join-Path $PSScriptRoot 'ConfrontaQuery.java'
Write-Host "Eseguo le letture su copie del DB..."
foreach ($run in @(@('rif', 'cls-rif'), @('nuovo', 'cls-nuovo'), @('rif-bis', 'cls-rif'))) {
  & java --enable-native-access=ALL-UNNAMED --class-path "$(Join-Path $lavoro $run[1]);$($jar.FullName)" `
         $tool esegui $sorgente $lavoro $run[0] 2>&1 | Where-Object { "$_" -notmatch 'SLOW QUERY' } | ForEach-Object { "$_" }
  if ($LASTEXITCODE -ne 0) { Write-Host "Esecuzione '$($run[0])' fallita." -ForegroundColor Red; Esci 2 }
}

# ── 4. confronto ────────────────────────────────────────────────────────────
& java --class-path $jar.FullName $tool confronta $lavoro rif nuovo rif-bis
$esito = $LASTEXITCODE
Write-Host ''
switch ($esito) {
  0       { Write-Host 'ESITO: nessun risultato cambiato.' -ForegroundColor Green }
  1       { Write-Host 'ESITO: alcuni risultati sono cambiati (dettaglio sopra).' -ForegroundColor Yellow }
  default { Write-Host 'ESITO: confronto non riuscito.' -ForegroundColor Red; $esito = 2 }
}
Esci $esito
