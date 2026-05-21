@echo off
:: ============================================================================
::  LucaMoneyManager - build script
:: ----------------------------------------------------------------------------
::  Pipeline in 5 fasi:
::    1. Maven        -> compila il fat JAR in target\moneymanager-<ver>.jar
::    2. jlink        -> crea un JRE custom (solo i moduli che servono)
::    3. jpackage     -> impacchetta JAR + JRE in un .exe nativo (dist\build\)
::    4. Copia web    -> mette src/main/resources/web/ accanto al .exe
::                       (App.findWebDir() la cerca a runtime)
::    5. Deploy / ZIP -> sincronizza il pacchetto in DEPLOY (e opzionalmente
::                       crea uno ZIP distribuibile)
:: ============================================================================
setlocal

:: ── Configurazione ──────────────────────────────────────────────────────────
set JAVA_HOME=C:\Program Files\Java\jdk-25
set MVN=C:\Tools\apache-maven-3.9.6\bin\mvn.cmd
set ROOT=%~dp0
set DIST=%ROOT%dist
set DEPLOY=D:\Luca Money Manager App

:: Legge la versione da pom.xml (-q -DforceStdout = output pulito, solo il valore)
for /f %%a in ('call "%MVN%" -f "%ROOT%pom.xml" help:evaluate -Dexpression^=project.version -q -DforceStdout') do set VERSION=%%a
set JAR=%ROOT%target\moneymanager-%VERSION%.jar

echo.
echo  ========================================
echo   LucaMoneyManager - Build v%VERSION%
echo  ========================================
echo.

:: Verifica toolchain prima di partire (fallisce subito se manca qualcosa)
if not exist "%JAVA_HOME%\bin\java.exe" ( echo [ERRORE] Java non trovato in %JAVA_HOME% & pause & exit /b 1 )
if not exist "%MVN%" ( echo [ERRORE] Maven non trovato in %MVN% & pause & exit /b 1 )

:: ── Scelta utente ───────────────────────────────────────────────────────────
:: Entrambe le opzioni fanno build + deploy; la 2 aggiunge in coda lo ZIP.
echo Scegli il tipo di build:
echo.
echo   1) Build + Deploy   - aggiorna "%DEPLOY%"
echo   2) Build + ZIP      - aggiorna deploy e crea ZIP distribuibile
echo.
set /p SCELTA="Scelta [1/2]: "
if "%SCELTA%"=="" set SCELTA=1

:: ── 1) Maven ────────────────────────────────────────────────────────────────
:: clean package produce il fat JAR (shade plugin); -q riduce l'output ai soli
:: errori/warning. Lo "original-*.jar" e' il JAR pre-shade lasciato dal plugin
:: e non serve a runtime -> lo cancelliamo per non confondere il deploy.
echo.
echo Compilazione Maven...
call "%MVN%" -f "%ROOT%pom.xml" clean package -q
if errorlevel 1 ( echo [ERRORE] Build Maven fallita. & pause & exit /b 1 )
del /q "%ROOT%target\original-moneymanager-*.jar" 2>nul
echo       OK - %JAR%

:: ── 2) jlink ────────────────────────────────────────────────────────────────
:: Costruisce un JRE minimale contenente solo i moduli effettivamente usati.
:: Modules:
::   java.base/desktop/sql/logging/xml/naming/management  -> core + Swing + JDBC
::   java.net.http                                        -> chiamate HTTP (prezzi titoli)
::   java.security.jgss / jdk.security.auth               -> richiesti da deps transitivi
::   jdk.unsupported                                      -> sun.misc.Unsafe (sqlite-jdbc)
::   jdk.crypto.ec / jdk.crypto.cryptoki                  -> TLS verso endpoint esterni
::   jdk.httpserver                                       -> WebServer embedded (LAN)
:: Flag di ottimizzazione: --strip-debug, --compress zip-2, --no-header-files,
:: --no-man-pages -> taglio dimensione runtime di ~40%.
echo.
echo Creazione JRE con jlink...
if exist "%DIST%\build"   rmdir /s /q "%DIST%\build"
if exist "%DIST%\runtime" rmdir /s /q "%DIST%\runtime"

set MODULES=java.base,java.desktop,java.sql,java.logging,java.xml,java.naming,java.management,java.net.http,java.security.jgss,jdk.unsupported,jdk.crypto.ec,jdk.crypto.cryptoki,jdk.security.auth,jdk.httpserver
"%JAVA_HOME%\bin\jlink" --module-path "%JAVA_HOME%\jmods" --add-modules %MODULES% --output "%DIST%\runtime" --strip-debug --compress zip-2 --no-header-files --no-man-pages
if errorlevel 1 ( echo [ERRORE] jlink fallito. & pause & exit /b 1 )

:: ── 3) jpackage ─────────────────────────────────────────────────────────────
:: Crea l'app-image (cartella LucaMoneyManager\ con .exe + app\ + runtime\).
:: --runtime-image riusa il JRE creato sopra al posto di farne uno nuovo.
:: --input contiene SOLO il JAR principale (le deps sono gia' nel fat JAR).
:: --java-options:
::   -Dfile.encoding=UTF-8           -> evita problemi con accenti su Windows
::   --enable-native-access=ALL-UNNAMED -> silenzia warning JNI di JCEF/SQLite
echo Creazione EXE con jpackage...
if exist "%DIST%\input" rmdir /s /q "%DIST%\input"
mkdir "%DIST%\input"
copy /y "%JAR%" "%DIST%\input\" >nul
"%JAVA_HOME%\bin\jpackage" --type app-image --runtime-image "%DIST%\runtime" --input "%DIST%\input" --main-jar moneymanager-%VERSION%.jar --name LucaMoneyManager --app-version %VERSION% --dest "%DIST%\build" --icon "%ROOT%target\icon.ico" --java-options "-Dfile.encoding=UTF-8" --java-options "--enable-native-access=ALL-UNNAMED"
if errorlevel 1 ( echo [ERRORE] jpackage fallito. & pause & exit /b 1 )

:: jpackage ha gia' copiato runtime/ dentro build/, e l'input/ era solo uno
:: staging temporaneo -> entrambi possono sparire.
rmdir /s /q "%DIST%\runtime"
rmdir /s /q "%DIST%\input"

:: ── 4) Copia risorse web ────────────────────────────────────────────────────
:: I file HTML/CSS/JS NON sono dentro il JAR (esclusi dal maven-shade-plugin):
:: devono stare accanto al .exe. App.findWebDir() li cerca in <deploy>\web\ e
:: li passa sia a JCEF (file://) sia al WebServer (HTTP LAN).
:: Sorgente: target\classes\web (NON src\main\resources\web) -> Maven ha gia'
:: applicato il filtering, quindi eventuali ${project.version} sono risolti.
:: /e = sottocartelle, /purge = elimina file rimossi alla sorgente,
:: /njh /njs /ndl = output piu' compatto. robocopy ritorna 0-7 = OK, >=8 = errore.
echo Copia risorse web in build...
%SystemRoot%\System32\robocopy.exe "%ROOT%target\classes\web" "%DIST%\build\LucaMoneyManager\web" /e /purge /njh /njs /ndl
if errorlevel 8 ( echo [ERRORE] Copia web fallita. & pause & exit /b 1 )
echo       OK - web/ nel build

:: ── 5a) Deploy ──────────────────────────────────────────────────────────────
:: Sincronizza l'app-image verso la cartella di deploy. Esclude i file utente
:: (DB, settings, log, backup, cache JCEF) che vengono creati a runtime e che
:: NON devono essere sovrascritti dalla build.
echo Deploy in "%DEPLOY%"...
if not exist "%DEPLOY%" mkdir "%DEPLOY%"
%SystemRoot%\System32\robocopy.exe "%DIST%\build\LucaMoneyManager" "%DEPLOY%" /e /xf "*.db" "settings.properties" "*.bak" "*.log" /xd "backup" "jcef" /njh /njs /ndl
if errorlevel 8 ( echo [ERRORE] Deploy fallito. & pause & exit /b 1 )
echo       OK - deploy in %DEPLOY%

:: Solo deploy: fine. ZIP solo se scelta = 2.
if "%SCELTA%"=="1" goto :fine

:: ── 5b) ZIP distribuibile (solo opzione 2) ──────────────────────────────────
:: Compress-Archive di PowerShell -> ZIP pulito senza dover installare 7zip.
:: Si parte da build\ (non da DEPLOY) per evitare di includere dati utente.
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
