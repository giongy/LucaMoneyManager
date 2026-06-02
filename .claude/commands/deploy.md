---
description: Commit + push su master e build.bat (Build + Deploy in produzione)
argument-hint: [messaggio di commit opzionale]
---

Esegui in sequenza, fermandoti e segnalando subito se un passo fallisce:

## 1. Commit
- Controlla `git status`. Se il working tree è pulito (niente da committare), **salta commit e push** (segnalalo) e vai direttamente al passo 3.
- Altrimenti `git add -A` e crea **un commit diretto su `master`** (è il workflow dell'utente per questo progetto: niente branch).
- Messaggio di commit:
  - Se `$ARGUMENTS` è valorizzato, usalo come oggetto del commit.
  - Altrimenti generane uno in **italiano** seguendo i conventional commit del progetto (`feat(...)`, `fix(...)`, `perf(...)`, `refactor(...)`, `docs(...)`), ricavandolo dal diff.
  - Termina sempre il messaggio con:
    ```
    Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
    ```
  - Se il messaggio ha parentesi o caratteri speciali, scrivilo in un file temporaneo e usa `git commit -F`, **non** here-string PowerShell nel tool Bash.

## 2. Push
- `git push origin master`.

## 3. Build + Deploy (build.bat opzione 1)
- Lancia `build.bat` in modalità non interattiva. L'opzione 1 (Build + Deploy) è il default del prompt, quindi basta dare EOF allo stdin.
- **Importante (gotcha noto):** `build.bat` va eseguito con code page OEM **850**, altrimenti cmd genera un errore di decodifica. Comando esatto da usare con il tool PowerShell (timeout ampio, ~7 min, jlink+jpackage sono lenti):
  ```
  & cmd.exe /c 'chcp 850 >nul & "D:\LucaMoneyManager\build.bat" < nul'
  ```
- NON usare `2>&1` (in PowerShell 5.1 incapsula lo stderr nativo come errore).
- La build fa: fat JAR → jlink (JRE custom) → jpackage (`LucaMoneyManager.exe`) → copia `web/` → deploy con robocopy in `D:\Luca Money Manager App` (DB/settings/backup/log esclusi e protetti).

## 4. Report finale
Riassumi: hash del commit, esito push, e conferma `Build completata` + deploy in `D:\Luca Money Manager App`. Riporta fedelmente eventuali errori reali (non l'errore cosmetico di decodifica, ormai risolto rendendo `build.bat` ASCII puro).
