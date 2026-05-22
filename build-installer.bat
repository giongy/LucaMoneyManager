@echo off
:: ============================================================================
::  LucaMoneyManager - build-installer.bat
:: ----------------------------------------------------------------------------
::  Crea un installer .exe Windows classico (wizard next-next-next).
::  Richiede Inno Setup 6: https://jrsoftware.org/isdl.php
::
::  Pipeline (5 fasi):
::    1. Maven      -> fat JAR
::    2. jlink      -> JRE custom (~40MB)
::    3. jpackage   -> app-image (cartella LucaMoneyManager con .exe + runtime)
::    4. Copia web/ -> dentro l'app-image, accanto al .exe
::    5. Inno Setup -> compila installer\LucaMoneyManager.iss -> setup.exe
::
::  Output: dist\installer\LucaMoneyManager-<ver>.exe
::
::  Nota: da JDK 17+ jpackage --type exe richiede WiX e produce comunque MSI;
::  qui usiamo --type app-image + Inno Setup esterno per avere un vero
::  installer EXE wizard classico.
:: ============================================================================
setlocal enabledelayedexpansion

:: ── Configurazione ──────────────────────────────────────────────────────────
set JAVA_HOME=C:\Program Files\Java\jdk-25
set MVN=C:\Tools\apache-maven-3.9.6\bin\mvn.cmd
set ROOT=%~dp0
set DIST=%ROOT%dist
set ISS=%ROOT%installer\LucaMoneyManager.iss

:: Legge la versione da pom.xml
for /f %%a in ('call "%MVN%" -f "%ROOT%pom.xml" help:evaluate -Dexpression^=project.version -q -DforceStdout') do set VERSION=%%a
set JAR=%ROOT%target\moneymanager-%VERSION%.jar

echo.
echo  ========================================
echo   LucaMoneyManager - Installer v%VERSION%
echo  ========================================
echo.

:: ── Verifica toolchain ──────────────────────────────────────────────────────
if not exist "%JAVA_HOME%\bin\java.exe" ( echo [ERRORE] Java non trovato in %JAVA_HOME% & pause & exit /b 1 )
if not exist "%MVN%"                    ( echo [ERRORE] Maven non trovato in %MVN%       & pause & exit /b 1 )
if not exist "%ISS%"                    ( echo [ERRORE] Script Inno Setup non trovato: %ISS% & pause & exit /b 1 )

:: Inno Setup: cerca nei path standard, altrimenti su PATH
set INNO_DIR=
if exist "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" set "INNO_DIR=C:\Program Files (x86)\Inno Setup 6"
if exist "C:\Program Files\Inno Setup 6\ISCC.exe"       set "INNO_DIR=C:\Program Files\Inno Setup 6"
if "%INNO_DIR%"=="" (
    where iscc.exe >nul 2>&1
    if errorlevel 1 (
        echo [ERRORE] Inno Setup 6 non trovato.
        echo Installa da: https://jrsoftware.org/isdl.php
        pause & exit /b 1
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
echo.
echo Creazione JRE con jlink...
if exist "%DIST%\runtime"   rmdir /s /q "%DIST%\runtime"
if exist "%DIST%\build"     rmdir /s /q "%DIST%\build"
if exist "%DIST%\input"     rmdir /s /q "%DIST%\input"
if exist "%DIST%\installer" rmdir /s /q "%DIST%\installer"

set MODULES=java.base,java.desktop,java.sql,java.logging,java.xml,java.naming,java.management,java.net.http,java.security.jgss,jdk.unsupported,jdk.crypto.ec,jdk.crypto.cryptoki,jdk.security.auth,jdk.httpserver
"%JAVA_HOME%\bin\jlink" --module-path "%JAVA_HOME%\jmods" --add-modules %MODULES% --output "%DIST%\runtime" --strip-debug --compress zip-2 --no-header-files --no-man-pages
if errorlevel 1 ( echo [ERRORE] jlink fallito. & pause & exit /b 1 )
echo       OK - JRE in %DIST%\runtime

:: ── 3) jpackage --type app-image ────────────────────────────────────────────
echo.
echo Creazione app-image con jpackage...
mkdir "%DIST%\input"
copy /y "%JAR%" "%DIST%\input\" >nul
"%JAVA_HOME%\bin\jpackage" --type app-image --runtime-image "%DIST%\runtime" --input "%DIST%\input" --main-jar moneymanager-%VERSION%.jar --name LucaMoneyManager --app-version %VERSION% --dest "%DIST%\build" --icon "%ROOT%target\icon.ico" --java-options "-Dfile.encoding=UTF-8" --java-options "--enable-native-access=ALL-UNNAMED"
if errorlevel 1 ( echo [ERRORE] jpackage fallito. & pause & exit /b 1 )

rmdir /s /q "%DIST%\runtime"
rmdir /s /q "%DIST%\input"
echo       OK - app-image in %DIST%\build\LucaMoneyManager

:: ── 4) Copia risorse web nell'app-image ─────────────────────────────────────
echo.
echo Copia risorse web in app-image...
%SystemRoot%\System32\robocopy.exe "%ROOT%target\classes\web" "%DIST%\build\LucaMoneyManager\web" /e /purge /njh /njs /ndl
if errorlevel 8 ( echo [ERRORE] Copia web fallita. & pause & exit /b 1 )
echo       OK - web/ nell'app-image

:: ── 5) Inno Setup ───────────────────────────────────────────────────────────
:: /Q     -> output silenzioso (solo errori/warning)
:: /DAppVersion=...  -> passa la versione come define allo script .iss
:: /O"..."           -> output directory per il setup .exe
echo.
echo Compilazione installer con Inno Setup...
mkdir "%DIST%\installer"
iscc.exe /Q /DAppVersion=%VERSION% /O"%DIST%\installer" "%ISS%"
if errorlevel 1 ( echo [ERRORE] Inno Setup fallito. & pause & exit /b 1 )

echo.
echo  ----------------------------------------
echo   Installer creato:
echo   %DIST%\installer\LucaMoneyManager-%VERSION%.exe
echo  ----------------------------------------
echo.
pause
