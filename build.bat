@echo off
setlocal enabledelayedexpansion

set JAVA_HOME=C:\Program Files\Java\jdk-25
set MVN=C:\Tools\apache-maven-3.9.6\bin\mvn.cmd
set JAR=target\moneymanager-1.0.0.jar
set DIST=dist

echo.
echo  ========================================
echo   LucaMoneyManager - Build
echo  ========================================
echo.

:: Verifica dipendenze
if not exist "%JAVA_HOME%\bin\java.exe" (
    echo [ERRORE] Java non trovato in %JAVA_HOME%
    pause & exit /b 1
)
if not exist "%MVN%" (
    echo [ERRORE] Maven non trovato in %MVN%
    pause & exit /b 1
)

:: Scelta tipo build
echo Scegli il tipo di build:
echo.
echo   1) Fat JAR  - solo il .jar (richiede Java sul PC destinazione)
echo   2) App EXE  - cartella autonoma con .exe (nessun Java richiesto)
echo   3) Entrambi
echo.
set /p SCELTA="Scelta [1/2/3]: "

if "%SCELTA%"=="" set SCELTA=1
if not "%SCELTA%"=="1" if not "%SCELTA%"=="2" if not "%SCELTA%"=="3" (
    echo Scelta non valida.
    pause & exit /b 1
)

:: ── Maven package ──────────────────────────────────────────────────────────
echo.
echo [1/2] Compilazione e packaging Maven...
call "%MVN%" package -q
if errorlevel 1 (
    echo [ERRORE] Build Maven fallita.
    pause & exit /b 1
)
echo       OK - %JAR%

:: ── Fat JAR ────────────────────────────────────────────────────────────────
if "%SCELTA%"=="1" goto :fat_jar
if "%SCELTA%"=="3" goto :fat_jar
goto :app_image

:fat_jar
echo.
echo [2/2] Preparazione distribuzione JAR...
if not exist "%DIST%\jar" mkdir "%DIST%\jar"
copy /y "%JAR%" "%DIST%\jar\LucaMoneyManager.jar" >nul
copy /y "LucaMoneyManager.vbs" "%DIST%\jar\" >nul

:: Crea avvia.bat per il PC destinazione
(
echo @echo off
echo set JAVA_HOME=C:\Program Files\Java\jdk-21
echo set PATH=%%JAVA_HOME%%\bin;%%PATH%%
echo start "" javaw -jar "%%~dp0LucaMoneyManager.jar"
) > "%DIST%\jar\Avvia.bat"

echo.
echo  ----------------------------------------
echo   Fat JAR pronto in: %DIST%\jar\
echo.
echo   Sul PC destinazione serve:
echo   - Java 21+ installato (adoptium.net)
echo   - Internet al primo avvio (scarica Chromium ~200MB)
echo.
echo   Per avviare: doppio clic su LucaMoneyManager.vbs
echo  ----------------------------------------

if "%SCELTA%"=="1" goto :fine
goto :app_image

:: ── App EXE (jpackage) ─────────────────────────────────────────────────────
:app_image
echo.
echo [2/2] Creazione app autonoma con jpackage...
if exist "%DIST%\app" rmdir /s /q "%DIST%\app"

"%JAVA_HOME%\bin\jpackage" ^
  --type app-image ^
  --input target ^
  --main-jar moneymanager-1.0.0.jar ^
  --name LucaMoneyManager ^
  --app-version 1.0.0 ^
  --dest "%DIST%\app" ^
  --java-options "-Dfile.encoding=UTF-8"

if errorlevel 1 (
    echo [ERRORE] jpackage fallito.
    pause & exit /b 1
)

echo.
echo  ----------------------------------------
echo   App autonoma pronta in: %DIST%\app\LucaMoneyManager\
echo.
echo   Sul PC destinazione serve:
echo   - NIENTE (Java incluso)
echo   - Internet al primo avvio (scarica Chromium ~200MB)
echo.
echo   Per distribuire: zippare la cartella LucaMoneyManager\
echo  ----------------------------------------

:fine
echo.
pause
