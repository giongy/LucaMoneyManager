@echo off
:: ============================================================================
::  LucaMoneyManager - build-installer.bat
:: ----------------------------------------------------------------------------
::  Crea un installer .exe Windows classico (wizard next-next-next).
::  Richiede Inno Setup 6 installato: https://jrsoftware.org/isdl.php
::
::  Output: dist\installer\LucaMoneyManager-<ver>.exe
::
::  L'installer:
::    - chiede dove installare (default %LOCALAPPDATA%\Programs\LucaMoneyManager)
::    - chiede se creare shortcut sul desktop
::    - crea voce Start Menu
::    - registra l'app in "App e funzionalita'" (con uninstaller)
::    - rileva upgrade tramite UUID -> aggiorna sopra l'installazione esistente
::    - per-user install -> niente UAC, niente admin
::
::  I dati utente (DB, settings, log, backup) restano in
::  %APPDATA%\Roaming\LucaMoneyManager\ e NON vengono toccati dall'installer.
:: ============================================================================
setlocal enabledelayedexpansion

:: ── Configurazione ──────────────────────────────────────────────────────────
set JAVA_HOME=C:\Program Files\Java\jdk-25
set MVN=C:\Tools\apache-maven-3.9.6\bin\mvn.cmd
set ROOT=%~dp0
set DIST=%ROOT%dist

:: GUID stabile per upgrade detection (NON cambiare mai: identifica l'app
:: cosi' nuove versioni vengono installate sopra la precedente)
set UPGRADE_UUID=8b3e7c2a-9d4f-4e6b-a1c5-3f8b9d2e7a5c

:: Legge la versione da pom.xml
for /f %%a in ('call "%MVN%" -f "%ROOT%pom.xml" help:evaluate -Dexpression^=project.version -q -DforceStdout') do set VERSION=%%a
set JAR=%ROOT%target\moneymanager-%VERSION%.jar

echo.
echo  ========================================
echo   LucaMoneyManager - Installer v%VERSION%
echo  ========================================
echo.

:: ── Verifica toolchain ──────────────────────────────────────────────────────
if not exist "%JAVA_HOME%\bin\java.exe"    ( echo [ERRORE] Java non trovato in %JAVA_HOME%   & pause & exit /b 1 )
if not exist "%MVN%"                        ( echo [ERRORE] Maven non trovato in %MVN%        & pause & exit /b 1 )

:: Inno Setup: cerca nei path standard, altrimenti su PATH
set INNO_DIR=
if exist "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" set "INNO_DIR=C:\Program Files (x86)\Inno Setup 6"
if exist "C:\Program Files\Inno Setup 6\ISCC.exe"       set "INNO_DIR=C:\Program Files\Inno Setup 6"
if "%INNO_DIR%"=="" (
    where iscc.exe >nul 2>&1
    if errorlevel 1 (
        echo [ERRORE] Inno Setup 6 non trovato.
        echo Installa da: https://jrsoftware.org/isdl.php
        pause
        exit /b 1
    )
) else (
    set "PATH=%INNO_DIR%;%PATH%"
)

:: ── 1) Maven ────────────────────────────────────────────────────────────────
echo.
echo Compilazione Maven...
call "%MVN%" -f "%ROOT%pom.xml" clean package -q
if errorlevel 1 ( echo [ERRORE] Build Maven fallita. & pause & exit /b 1 )
del /q "%ROOT%target\original-moneymanager-*.jar" 2>nul
echo       OK - %JAR%

:: ── 2) jlink ────────────────────────────────────────────────────────────────
:: Stesso JRE custom di build.bat (vedi commenti li').
echo.
echo Creazione JRE con jlink...
if exist "%DIST%\runtime"   rmdir /s /q "%DIST%\runtime"
if exist "%DIST%\installer" rmdir /s /q "%DIST%\installer"
if exist "%DIST%\input"     rmdir /s /q "%DIST%\input"

set MODULES=java.base,java.desktop,java.sql,java.logging,java.xml,java.naming,java.management,java.net.http,java.security.jgss,jdk.unsupported,jdk.crypto.ec,jdk.crypto.cryptoki,jdk.security.auth,jdk.httpserver
"%JAVA_HOME%\bin\jlink" --module-path "%JAVA_HOME%\jmods" --add-modules %MODULES% --output "%DIST%\runtime" --strip-debug --compress zip-2 --no-header-files --no-man-pages
if errorlevel 1 ( echo [ERRORE] jlink fallito. & pause & exit /b 1 )
echo       OK - JRE in %DIST%\runtime

:: ── 3) jpackage --type exe ──────────────────────────────────────────────────
:: --app-content -> copia target\classes\web accanto ad app\ nell'immagine
::   installata. App.findWebDir() la trova li.
:: --win-dir-chooser     -> wizard chiede dove installare
:: --win-menu / --win-menu-group -> shortcut Start Menu
:: --win-shortcut / --win-shortcut-prompt -> wizard chiede shortcut desktop
:: --win-upgrade-uuid    -> nuove versioni aggiornano la precedente
:: --win-per-user-install-> install per utente (no UAC, no admin richiesto)
echo.
echo Creazione installer con jpackage...
mkdir "%DIST%\input"
copy /y "%JAR%" "%DIST%\input\" >nul

"%JAVA_HOME%\bin\jpackage" --type exe ^
  --runtime-image "%DIST%\runtime" ^
  --input "%DIST%\input" ^
  --main-jar moneymanager-%VERSION%.jar ^
  --name LucaMoneyManager ^
  --app-version %VERSION% ^
  --dest "%DIST%\installer" ^
  --icon "%ROOT%target\icon.ico" ^
  --vendor "Luca" ^
  --description "Personal finance manager" ^
  --copyright "Luca" ^
  --app-content "%ROOT%target\classes\web" ^
  --java-options "-Dfile.encoding=UTF-8" ^
  --java-options "--enable-native-access=ALL-UNNAMED" ^
  --win-dir-chooser ^
  --win-menu ^
  --win-menu-group LucaMoneyManager ^
  --win-shortcut ^
  --win-shortcut-prompt ^
  --win-upgrade-uuid %UPGRADE_UUID% ^
  --win-per-user-install
if errorlevel 1 ( echo [ERRORE] jpackage fallito. & pause & exit /b 1 )

:: Cleanup degli staging
rmdir /s /q "%DIST%\runtime"
rmdir /s /q "%DIST%\input"

echo.
echo  ----------------------------------------
echo   Installer creato:
echo   %DIST%\installer\LucaMoneyManager-%VERSION%.exe
echo  ----------------------------------------
echo.
pause
