# ─────────────────────────────────────────────────────────────────────────────
# test-giornale.ps1 — verifica di non regressione sul giornale delle operazioni.
#
#   .\tools\test-giornale.ps1                    # sul DB di progetto
#   .\tools\test-giornale.ps1 -Database prod     # sui dati veri (senza toccarli, vedi sotto)
#   .\tools\test-giornale.ps1 -Verbose           # stampa anche i valori attesi/ottenuti
#   .\tools\test-giornale.ps1 -Keep              # non cancella la copia, per ispezionarla dopo
#
# Difende le proprietà che si rompono in silenzio: l'avvio che non deve scrivere (su OneDrive
# ogni scrittura costa il ricaricamento del file intero), la lettura che non deve lasciare
# traccia, le righe figlie eliminate dalle CASCADE che devono finire nel giornale (senza,
# annullare la cancellazione di una transazione ne restituirebbe il guscio senza split né tag),
# nessuna riga orfana, nessun gesto a metà.
#
# ⚠️ LO STRUMENTO SCRIVE: aggiunge, modifica, elimina, fa backup e pota. Per questo NON lavora
# mai sul DB indicato ma su una COPIA temporanea, che cancella alla fine insieme ai file che le
# nascono accanto. Conseguenze pratiche, le stesse di test-titoli.ps1:
#   · si può lanciare ad app aperta, non c'è contesa sul lock;
#   · -Database prod è innocuo: i dati veri vengono solo letti per fare la copia.
#
# Esce con codice diverso da zero se un controllo fallisce, così è usabile in uno script.
#
# ⚠️ Il parametro è -Database e non -Db: "db" è già l'alias di -Debug e PowerShell rifiuta
# lo script all'avvio per collisione di alias (stessa ragione di db.ps1).
# ─────────────────────────────────────────────────────────────────────────────
[CmdletBinding()]
param(
  [string] $Database = 'local',
  [switch] $Keep
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent

# Senza questo le accentate tornano come "?": la console eredita la code page OEM, Java
# scrive UTF-8 (l'uscita la imposta TestGiornale su System.out).
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch {}

$PROD  = "$env:USERPROFILE\OneDrive\Documents\Luca_Money_Manager\luca.db"
$LOCAL = Join-Path $root 'lucatest.db'
$src = switch ($Database) {
  'local' { $LOCAL }
  'prod'  { $PROD }
  default { $Database }
}
if (-not (Test-Path $src)) { Write-Host "DB non trovato: $src" -ForegroundColor Red; exit 2 }

# Il classpath mette target\classes PRIMA del fat JAR: dentro il JAR ci sono le classi
# dell'ultima build, in target\classes quelle appena compilate. Senza quest'ordine si
# verificherebbe il codice vecchio credendo di provare il nuovo.
$classes = Join-Path $root 'target\classes'
if (-not (Test-Path (Join-Path $classes 'com\moneymanager\Giornale.class'))) {
  Write-Host "Manca target\classes\com\moneymanager\Giornale.class: esegui prima 'mvn -o compile'." -ForegroundColor Red
  exit 2
}
$jar = Get-ChildItem (Join-Path $root 'target') -Filter 'moneymanager-*.jar' -ErrorAction SilentlyContinue |
       Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $jar) {
  Write-Host "Manca il fat JAR in target: esegui 'mvn package'." -ForegroundColor Red
  exit 2
}

$copia = Join-Path ([IO.Path]::GetTempPath()) ("mm-giornale-{0}.db" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
Copy-Item $src $copia
$info = Get-Item $src
Write-Host ("DB di partenza:  {0}  ({1:N0} KB, modificato {2:yyyy-MM-dd HH:mm})" -f $src, ($info.Length/1KB), $info.LastWriteTime)
Write-Host ("Copia di lavoro: {0}" -f $copia)

$jargs = @($copia)
if ($VerbosePreference -ne 'SilentlyContinue') { $jargs += '-v' }

# --enable-native-access: sqlite-jdbc carica una libreria nativa e senza il flag Java 25
# antepone quattro righe di WARNING a ogni esecuzione.
& java --enable-native-access=ALL-UNNAMED --class-path "$classes;$($jar.FullName)" (Join-Path $PSScriptRoot 'TestGiornale.java') @jargs
$esito = $LASTEXITCODE

if ($Keep) {
  Write-Host "`nCopia conservata: $copia"
} else {
  $base = [IO.Path]::Combine([IO.Path]::GetDirectoryName($copia), [IO.Path]::GetFileNameWithoutExtension($copia))
  # -Recurse perché il gruppo sul backup crea una cartella "<copia>-bak" accanto alla copia:
  # senza, i .bak di prova si accumulerebbero nel %TEMP% a ogni esecuzione.
  Get-ChildItem "$base*" -ErrorAction SilentlyContinue | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
}

exit $esito
