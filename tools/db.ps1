# ─────────────────────────────────────────────────────────────────────────────
# db.ps1 — query SQL in sola lettura sul DB, senza avviare l'app.
#
# Complementare a screenshot.ps1 -Probe: quello interroga le api del bridge e richiede
# l'app accesa, questo legge il file SQLite direttamente e funziona sempre.
#
#   .\tools\db.ps1 "SELECT COUNT(*) FROM transactions"
#   .\tools\db.ps1 -Database prod "SELECT * FROM accounts" -Limit 50
#   .\tools\db.ps1 -File .\query.sql -Json
#
# -Database local (default) = D:\LucaMoneyManager\luca.db  ·  prod = quello su OneDrive.
# ⚠️ Il parametro è -Database e non -Db: "db" è già l'alias del parametro comune -Debug,
# e PowerShell rifiuta lo script all'avvio per collisione di alias.
# La connessione è read-only a livello di driver: nessuna query può modificare il DB.
# ─────────────────────────────────────────────────────────────────────────────
param(
  [Parameter(Position = 0)][string] $Sql,
  [string] $Database = 'local',
  [string] $File,
  [int]    $Limit = 200,
  [switch] $Json,
  [switch] $Quiet
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent

# Senza questo le accentate tornano come "?" (nomi di categorie e conti ne sono pieni):
# la console eredita la code page OEM, Java scrive UTF-8.
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch {}

# Il driver sqlite-jdbc sta dentro il fat JAR: si prende il più recente, così il tool non
# va aggiornato a ogni bump di versione. Se manca (target/ ripulita), si ripiega sul JAR
# del driver nella cache Maven.
$jar = Get-ChildItem (Join-Path $root 'target') -Filter 'moneymanager-*.jar' -ErrorAction SilentlyContinue |
       Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $jar) {
  $jar = Get-ChildItem "$env:USERPROFILE\.m2\repository\org\xerial\sqlite-jdbc" -Recurse -Filter '*.jar' -ErrorAction SilentlyContinue |
         Sort-Object LastWriteTime -Descending | Select-Object -First 1
}
if (-not $jar) { Write-Error "Driver SQLite non trovato: manca sia target\moneymanager-*.jar sia sqlite-jdbc in ~\.m2. Esegui 'mvn package'."; exit 1 }

$src  = Join-Path $PSScriptRoot 'DbQuery.java'
# $jargs e non $args: $args è una variabile automatica di PowerShell, riassegnarla qui
# funzionerebbe ma è un campo minato inutile.
$jargs = @('--db', $Database, '--limit', "$Limit")
if ($Json)  { $jargs += '--json' }
if ($Quiet) { $jargs += '--quiet' }
if ($File)  { $jargs += @('--file', (Resolve-Path $File).Path) }
elseif ($Sql) { $jargs += $Sql }
else { Write-Error 'Serve una query: .\tools\db.ps1 "SELECT ..." oppure -File query.sql'; exit 2 }

# --enable-native-access: sqlite-jdbc carica una libreria nativa; senza il flag, Java 25
# stampa quattro righe di WARNING prima di ogni risultato.
# L'UTF-8 in uscita lo imposta DbQuery su System.out/err: passarlo qui come -Dstdout.encoding
# non funziona, PowerShell 5.1 spezza l'argomento sul punto e java non trova la main class.
& java --enable-native-access=ALL-UNNAMED --class-path $jar.FullName $src @jargs
exit $LASTEXITCODE
