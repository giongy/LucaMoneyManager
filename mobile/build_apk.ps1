# build_apk.ps1 - Genera il progetto Android e compila l'APK
$ErrorActionPreference = "Stop"
$MobileDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$FlutterHome = "D:\flutter\flutter"

# PATH
$env:PATH = "$FlutterHome\bin;" + $env:PATH

# Android SDK
$AndroidSdk = "$env:LOCALAPPDATA\Android\Sdk"
if (Test-Path $AndroidSdk) {
    $env:ANDROID_HOME = $AndroidSdk
    $env:ANDROID_SDK_ROOT = $AndroidSdk
    Write-Host "Android SDK: $AndroidSdk" -ForegroundColor Green
} else {
    Write-Warning "Android SDK non trovato in $AndroidSdk"
    Write-Warning "Installa Android Studio da https://developer.android.com/studio e riprova."
    Read-Host "Premi Invio per uscire"
    exit 1
}

# Flutter doctor (gira da FlutterHome, non da mobile/ che ha pubspec.yaml)
Write-Host ""
Write-Host "-- flutter doctor --" -ForegroundColor Cyan
Push-Location $FlutterHome
flutter doctor
Pop-Location

Set-Location $MobileDir

# Backup lib/
Write-Host ""
Write-Host "-- Backup sorgenti lib/ --" -ForegroundColor Cyan
$backup = @{}
Get-ChildItem -Path "lib" -Recurse -File | ForEach-Object {
    $backup[$_.FullName] = [System.IO.File]::ReadAllBytes($_.FullName)
}

# flutter create
Write-Host ""
Write-Host "-- flutter create --" -ForegroundColor Cyan
flutter create --project-name luca_wallet --platforms android .

# Ripristina lib/
Write-Host ""
Write-Host "-- Ripristino sorgenti lib/ --" -ForegroundColor Cyan
foreach ($path in $backup.Keys) {
    [System.IO.File]::WriteAllBytes($path, $backup[$path])
}
Write-Host "OK" -ForegroundColor Green

# Patch AndroidManifest.xml
Write-Host ""
Write-Host "-- Patch AndroidManifest.xml --" -ForegroundColor Cyan
$manifestPath = Join-Path $MobileDir "android\app\src\main\AndroidManifest.xml"
$manifest = Get-Content $manifestPath -Raw

if ($manifest -notmatch "MANAGE_EXTERNAL_STORAGE") {
    $manifest = $manifest -replace '(<manifest\s[^>]*>)', ('$1' + "`n    <uses-permission android:name=`"android.permission.READ_EXTERNAL_STORAGE`" android:maxSdkVersion=`"32`"/>" + "`n    <uses-permission android:name=`"android.permission.WRITE_EXTERNAL_STORAGE`" android:maxSdkVersion=`"32`"/>" + "`n    <uses-permission android:name=`"android.permission.MANAGE_EXTERNAL_STORAGE`"/>")
    $manifest = $manifest -replace '<application', '<application android:requestLegacyExternalStorage="true"'
    Set-Content $manifestPath $manifest -NoNewline
    Write-Host "Permessi storage aggiunti." -ForegroundColor Green
} else {
    Write-Host "Manifest gia aggiornato." -ForegroundColor Yellow
}

# flutter pub get
Write-Host ""
Write-Host "-- flutter pub get --" -ForegroundColor Cyan
flutter pub get

# Build APK
Write-Host ""
Write-Host "-- flutter build apk --release --" -ForegroundColor Cyan
flutter build apk --release

# Risultato
$apkPath = Join-Path $MobileDir "build\app\outputs\flutter-apk\app-release.apk"
if (Test-Path $apkPath) {
    Write-Host ""
    Write-Host "APK pronto:" -ForegroundColor Green
    Write-Host "  $apkPath"
    explorer.exe (Split-Path $apkPath)
} else {
    Write-Host ""
    Write-Host "Build fallita. Controlla gli errori sopra." -ForegroundColor Red
}

Read-Host "Premi Invio per uscire"
