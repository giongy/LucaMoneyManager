@echo off
setlocal enabledelayedexpansion

set JAVA_HOME=C:\Program Files\Java\jdk-25
set MVN=C:\Tools\apache-maven-3.9.6\bin\mvn.cmd
set LAUNCH4J=D:\launch4j\launch4jc.exe
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
if not exist "%LAUNCH4J%" ( echo [ERRORE] Launch4j non trovato in %LAUNCH4J% & pause & exit /b 1 )

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
mkdir "%DIST%\build\app"
copy /y "%JAR%" "%DIST%\build\app\moneymanager.jar" >nul
copy /y "%ROOT%target\icon.ico" "%DIST%\build\icon.ico" >nul

"%JAVA_HOME%\bin\jlink" --module-path "%JAVA_HOME%\jmods" --add-modules ALL-MODULE-PATH --output "%DIST%\build\runtime" --strip-debug --compress zip-6 --no-header-files --no-man-pages
if errorlevel 1 ( echo [ERRORE] jlink fallito. & pause & exit /b 1 )

:: ── Launch4j ────────────────────────────────────────────────────────────────
echo Generazione EXE con Launch4j...
(
  echo ^<launch4jConfig^>
  echo   ^<dontWrapJar^>true^</dontWrapJar^>
  echo   ^<headerType^>gui^</headerType^>
  echo   ^<jar^>app/moneymanager.jar^</jar^>
  echo   ^<outfile^>%DIST%\build\LucaMoneyManager.exe^</outfile^>
  echo   ^<errTitle^>LucaMoneyManager^</errTitle^>
  echo   ^<icon^>%DIST%\build\icon.ico^</icon^>
  echo   ^<jre^>
  echo     ^<path^>runtime^</path^>
  echo     ^<opt^>-Dfile.encoding=UTF-8^</opt^>
  echo   ^</jre^>
  echo   ^<versionInfo^>
  echo     ^<fileVersion^>%VERSION%.0^</fileVersion^>
  echo     ^<txtFileVersion^>%VERSION%^</txtFileVersion^>
  echo     ^<fileDescription^>LucaMoneyManager^</fileDescription^>
  echo     ^<copyright^>Luca^</copyright^>
  echo     ^<productVersion^>%VERSION%.0^</productVersion^>
  echo     ^<txtProductVersion^>%VERSION%^</txtProductVersion^>
  echo     ^<productName^>LucaMoneyManager^</productName^>
  echo     ^<internalName^>LucaMoneyManager^</internalName^>
  echo     ^<originalFilename^>LucaMoneyManager.exe^</originalFilename^>
  echo   ^</versionInfo^>
  echo ^</launch4jConfig^>
) > "%DIST%\launch4j-config.xml"

"%LAUNCH4J%" "%DIST%\launch4j-config.xml"
if errorlevel 1 ( echo [ERRORE] Launch4j fallito. & pause & exit /b 1 )
del /q "%DIST%\build\icon.ico" 2>nul
del /q "%DIST%\launch4j-config.xml" 2>nul

:: ── Deploy ──────────────────────────────────────────────────────────────────
echo Deploy in "%DEPLOY%"...
if not exist "%DEPLOY%" mkdir "%DEPLOY%"
%SystemRoot%\System32\robocopy.exe "%DIST%\build" "%DEPLOY%" /e /xf "*.db" "settings.properties" "*.bak" "*.properties" "*.log" /xd "backup" "jcef" /njh /njs /ndl
if errorlevel 8 ( echo [ERRORE] Deploy fallito. & pause & exit /b 1 )
echo       OK - deploy in %DEPLOY%

if "%SCELTA%"=="2" goto :fine

:: ── ZIP (solo opzione 3) ─────────────────────────────────────────────────────
echo Creazione ZIP...
if exist "%DIST%\LucaMoneyManager-distrib.zip" del /q "%DIST%\LucaMoneyManager-distrib.zip"
powershell -NoProfile -Command "Compress-Archive -Path '%DIST%\build\*' -DestinationPath '%DIST%\LucaMoneyManager-distrib.zip'"
if errorlevel 1 ( echo [ERRORE] Creazione ZIP fallita. & pause & exit /b 1 )
echo       OK - %DIST%\LucaMoneyManager-distrib.zip

:fine
echo.
echo  ----------------------------------------
echo   Build completata.
echo  ----------------------------------------
echo.
pause
