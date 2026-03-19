@echo off
setlocal enabledelayedexpansion

set JAVA_HOME=C:\Program Files\Java\jdk-25
set MVN=C:\Tools\apache-maven-3.9.6\bin\mvn.cmd
set ROOT=%~dp0
set JAR=%ROOT%target\moneymanager-1.0.0.jar
set DIST=%ROOT%dist

echo.
echo  ========================================
echo   LucaMoneyManager - Build
echo  ========================================
echo.

if not exist "%JAVA_HOME%\bin\java.exe" (
    echo [ERRORE] Java non trovato in %JAVA_HOME%
    pause & exit /b 1
)
if not exist "%MVN%" (
    echo [ERRORE] Maven non trovato in %MVN%
    pause & exit /b 1
)

echo Scegli il tipo di build:
echo.
echo   1) Fat JAR  - solo il .jar (richiede Java sul PC destinazione)
echo   2) App EXE  - cartella autonoma con .exe (nessun Java richiesto)
echo   3) Entrambi
echo.
set /p SCELTA="Scelta [1/2/3]: "
if "%SCELTA%"=="" set SCELTA=1

:: ── Maven package ──────────────────────────────────────────────────────────
echo.
echo [1/2] Compilazione Maven...
call "%MVN%" -f "%ROOT%pom.xml" package -q
if errorlevel 1 ( echo [ERRORE] Build Maven fallita. & pause & exit /b 1 )
echo       OK - %JAR%

:: ── Fat JAR ────────────────────────────────────────────────────────────────
if "%SCELTA%"=="2" goto :app_image

echo.
echo [2/2] Preparazione distribuzione JAR...
if not exist "%DIST%\jar" mkdir "%DIST%\jar"
copy /y "%JAR%" "%DIST%\jar\LucaMoneyManager.jar" >nul
copy /y "%ROOT%LucaMoneyManager.vbs" "%DIST%\jar\" >nul

(
echo @echo off
echo start "" javaw -jar "%%~dp0LucaMoneyManager.jar"
) > "%DIST%\jar\Avvia.bat"

echo.
echo  ----------------------------------------
echo   FAT JAR pronto in:
echo   %DIST%\jar\
echo.
echo   Sul PC destinazione:
echo   - Installa Java 21+ da adoptium.net
echo   - Doppio clic su LucaMoneyManager.vbs
echo   - Al primo avvio scarica Chromium (~200MB)
echo  ----------------------------------------

if "%SCELTA%"=="1" goto :fine

:: ── App EXE (jpackage) ─────────────────────────────────────────────────────
:app_image
echo.
echo [2/2] Creazione app autonoma con jpackage...
if exist "%DIST%\app" rmdir /s /q "%DIST%\app"
mkdir "%DIST%\app"

"%JAVA_HOME%\bin\jpackage" --type app-image --input "%ROOT%target" --main-jar moneymanager-1.0.0.jar --name LucaMoneyManager --app-version 1.0.0 --dest "%DIST%\app" --icon "%ROOT%target\icon.ico" --java-options "-Dfile.encoding=UTF-8" --add-modules java.base,java.desktop,java.logging,java.management,java.naming,java.net.http,java.security.jgss,java.sql,jdk.crypto.ec,jdk.crypto.cryptoki,jdk.security.auth

if errorlevel 1 ( echo [ERRORE] jpackage fallito. & pause & exit /b 1 )

echo.
echo  ----------------------------------------
echo   APP EXE pronta in:
echo   %DIST%\app\LucaMoneyManager\
echo.
echo   Sul PC destinazione:
echo   - Nessun Java richiesto
echo   - Zippa e copia la cartella LucaMoneyManager\
echo   - Al primo avvio scarica Chromium (~200MB)
echo  ----------------------------------------

:fine
echo.
pause
