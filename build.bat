@echo off
setlocal enabledelayedexpansion

set JAVA_HOME=C:\Program Files\Java\jdk-25
set MVN=C:\Tools\apache-maven-3.9.6\bin\mvn.cmd
set ROOT=%~dp0
for /f %%a in ('call "%MVN%" -f "%ROOT%pom.xml" help:evaluate -Dexpression^=project.version -q -DforceStdout') do set VERSION=%%a
set JAR=%ROOT%target\moneymanager-%VERSION%.jar
set DIST=%ROOT%dist
set DEPLOY=D:\Luca Money Manager App

echo.
echo  ========================================
echo   LucaMoneyManager - Build v%VERSION%
echo  ========================================
echo.

if not exist "%JAVA_HOME%\bin\java.exe" ( echo [ERRORE] Java non trovato in %JAVA_HOME% & pause & exit /b 1 )
if not exist "%MVN%" ( echo [ERRORE] Maven non trovato in %MVN% & pause & exit /b 1 )

echo Scegli il tipo di build:
echo.
echo   2) Build + Deploy   - aggiorna "%DEPLOY%"
echo   3) Build + ZIP      - aggiorna deploy e crea ZIP distribuibile
echo.
set /p SCELTA="Scelta [2/3]: "
if "%SCELTA%"=="" set SCELTA=2

:: ── Maven ───────────────────────────────────────────────────────────────────
echo.
echo Compilazione Maven...
call "%MVN%" -f "%ROOT%pom.xml" clean package -q
if errorlevel 1 ( echo [ERRORE] Build Maven fallita. & pause & exit /b 1 )
del /q "%ROOT%target\original-moneymanager-*.jar" 2>nul
echo       OK - %JAR%

:: ── jlink ───────────────────────────────────────────────────────────────────
echo.
echo Creazione JRE con jlink...
if exist "%DIST%\build" rmdir /s /q "%DIST%\build"
if exist "%DIST%\runtime" rmdir /s /q "%DIST%\runtime"

set MODULES=java.base,java.desktop,java.sql,java.logging,java.xml,java.naming,java.management,java.net.http,java.security.jgss,jdk.unsupported,jdk.crypto.ec,jdk.crypto.cryptoki,jdk.security.auth,jdk.httpserver
"%JAVA_HOME%\bin\jlink" --module-path "%JAVA_HOME%\jmods" --add-modules %MODULES% --output "%DIST%\runtime" --strip-debug --compress zip-2 --no-header-files --no-man-pages
if errorlevel 1 ( echo [ERRORE] jlink fallito. & pause & exit /b 1 )

:: ── jpackage ─────────────────────────────────────────────────────────────────
echo Creazione EXE con jpackage...
if exist "%DIST%\input" rmdir /s /q "%DIST%\input"
mkdir "%DIST%\input"
copy /y "%JAR%" "%DIST%\input\" >nul
"%JAVA_HOME%\bin\jpackage" --type app-image --runtime-image "%DIST%\runtime" --input "%DIST%\input" --main-jar moneymanager-%VERSION%.jar --name LucaMoneyManager --app-version %VERSION% --dest "%DIST%\build" --icon "%ROOT%target\icon.ico" --java-options "-Dfile.encoding=UTF-8" --java-options "--enable-native-access=ALL-UNNAMED"
if errorlevel 1 ( echo [ERRORE] jpackage fallito. & pause & exit /b 1 )

rmdir /s /q "%DIST%\runtime"
rmdir /s /q "%DIST%\input"

:: ── Deploy ──────────────────────────────────────────────────────────────────
echo Deploy in "%DEPLOY%"...
if not exist "%DEPLOY%" mkdir "%DEPLOY%"
%SystemRoot%\System32\robocopy.exe "%DIST%\build\LucaMoneyManager" "%DEPLOY%" /e /xf "*.db" "settings.properties" "*.bak" "*.log" /xd "backup" "jcef" /njh /njs /ndl
if errorlevel 8 ( echo [ERRORE] Deploy fallito. & pause & exit /b 1 )
echo       OK - deploy in %DEPLOY%

if "%SCELTA%"=="2" goto :fine

:: ── ZIP (solo opzione 3) ─────────────────────────────────────────────────────
echo Creazione ZIP...
if exist "%DIST%\LucaMoneyManager-distrib.zip" del /q "%DIST%\LucaMoneyManager-distrib.zip"
powershell -NoProfile -Command "Compress-Archive -Path '%DIST%\build\LucaMoneyManager\*' -DestinationPath '%DIST%\LucaMoneyManager-distrib.zip'"
if errorlevel 1 ( echo [ERRORE] Creazione ZIP fallita. & pause & exit /b 1 )
echo       OK - %DIST%\LucaMoneyManager-distrib.zip

:fine
echo.
echo  ----------------------------------------
echo   Build completata.
echo  ----------------------------------------
echo.
pause
