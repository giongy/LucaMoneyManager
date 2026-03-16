@echo off
title LucaMoneyManager [debug]
set PATH=C:\Tools\apache-maven-3.9.6\bin;C:\Program Files\Java\jdk-25\bin;%PATH%
cd /d "%~dp0"
echo Avvio in modalita debug (usa LucaMoneyManager.vbs per avvio normale)
echo.
mvn exec:java
pause
