# Audit robustezza — codice Java (LucaMoneyManager)

> Obiettivo: applicazione "a prova di bomba", ogni eccezione tracciata in `app.log`, try/catch corretti.
> Data audit: 2026-07-18 · Scope: `src/main/java/com/moneymanager/*.java` (12 file, ~7100 righe).

---

## Come funziona il logging (per capire cosa è "perso")

In `App.java` (righe 110-115) `System.setErr(logStream)` e `System.setOut(logStream)` reindirizzano
stdout/stderr su `app.log`. Quindi finiscono in log **solo**:
- `System.err.println(...)` / `System.out.println(...)`
- `e.printStackTrace()` (usa `System.err`)

Un `catch` che **non** fa nessuna di queste due cose e **non** rilancia = **eccezione persa**
(invisibile in app.log). Questo è il criterio usato sotto.

---

## 🔴 PROBLEMI CRITICI (la garanzia "tutto in app.log" oggi NON regge)

### C1 — Bridge: il catch principale non logga NULLA · `Bridge.java:143-145`
```java
} catch (Exception e) {
    callback.failure(500, e.getMessage() != null ? e.getMessage() : "Errore interno");
}
```
**Ogni** operazione JS→Java passa da qui. Se `dispatch()` lancia (SQLException, NPE, parse, ecc.),
l'errore va **solo** al frontend, **mai** in app.log. Peggio: per NPE/IllegalStateException Gson il
`getMessage()` è spesso `null` → l'utente vede *"Errore interno"* e in log non resta traccia né del
messaggio né dello stacktrace né del `method` chiamato.
**È la falla numero uno.** Tutta la robustezza del layer Database (che delega il logging al chiamante)
poggia su questo catch, e questo catch non logga.
→ **Fix:** loggare prima di rispondere:
```java
} catch (Exception e) {
    System.err.println("[Bridge] '" + method + "' fallito: " + e);
    e.printStackTrace();
    callback.failure(500, e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName());
}
```
(spostare `method` fuori dal try per averlo disponibile nel catch).

### C2 — Bridge: dialog async ingoiano tutto e mentono · `Bridge.java:160,171,182,192`
```java
} catch (Exception e) { succeed(callback, Map.of("path", "", "cancelled", true)); }
```
Un fallimento del file/folder picker viene mascherato da *"annullato dall'utente"*: nessun log, e il
frontend non distingue errore da cancellazione. Se il picker fallisce sistematicamente (permessi, SAF,
PowerShell assente) l'utente non capisce perché "non succede niente".
→ **Fix:** loggare `e` e restituire un campo `error` distinto da `cancelled`.

### C3 — WebServer: nessun log + concorrenza sul DB single-thread · `WebServer.java`
Due problemi nello stesso file:

1. **Ramo statico `/` senza catch** (righe 72-90): se `Files.readAllBytes` lancia *dopo*
   `sendResponseHeaders(200, len)`, l'exchange si rompe a metà e **niente** finisce in log.
   Il ramo `/bridge` (righe 60-68) risponde 500 al client ma **non logga** l'eccezione.

2. **Concorrenza reale sul DB** (riga 28): l'executor è
   `Executors.newVirtualThreadPerTaskExecutor()` → più richieste LAN eseguono `bridge.dispatch()`
   **in parallelo**. Ma la connessione JDBC SQLite è **single-thread**: `beginQuery()/ensureOpen()`
   sono `synchronized`, però l'esecuzione vera dello statement gira **fuori** dal lock (per design,
   `Database.java:44-45`). Con 2 dispositivi/tab LAN attivi contemporaneamente si possono avere due
   thread che usano la **stessa** `Connection` insieme → `SQLITE_MISUSE` / risultati corrotti /
   "database connection closed". In JCEF questo non accade (thread UI serializza), ma **via LAN sì**.
→ **Fix:** serializzare le dispatch del WebServer (es. un `synchronized` su un lock condiviso con
   Bridge, o un single-thread executor per le chiamate `/bridge`), e aggiungere logging in entrambi i rami.

### C4 — Sequenza di avvio prima che app.log esista · `App.java:76-113`
Tutto ciò che precede la riga 114 (`System.setErr`) logga sul **vero** stderr, che in produzione
(jpackage, niente console) è **perso**: `Files.createDirectories` (76), `SingleInstance.tryAcquire`
(79), costruzione `Settings` → `load()` (92), risoluzione `dbPath`, `new Database(dbPath)` (127),
`findWebDir()` (131). `main` è `throws Exception`: se una di queste lancia, l'app muore **senza
lasciare traccia** e senza dialog (il `JOptionPane` è solo dentro `invokeAndWait`, righe 207-214).
→ **Fix:** wrappare l'intero `main` in try/catch che (a) scrive un file di crash minimale
   (es. `crash.log` nella dataDir, sempre esistente) e (b) mostra un `JOptionPane`. Anticipare il
   redirect di `System.err` il più possibile (subito dopo aver calcolato `dataDir`, usando un log di
   fallback nella dataDir se il dbPath non è ancora noto).

---

## 🟠 IMPORTANTI

### I1 — Database: catch muti ("buchi neri") · `Database.java`
Punti dove l'eccezione sparisce senza una riga in log (return silenzioso):
- `364, 385` parse timestamp/JSON sidecar in `listBackups` → riga corrotta saltata in silenzio
- `1701` parse riga coda in `readPendingRaw`
- `844-848 / 852-858` `getAppSetting`/`getAllAppSettings` → `catch(Exception){return def}`: se il DB è
  rotto/chiuso l'app usa i default **senza avvisare** (può nascondere problemi seri)
- `888-893` `getSystemTagIdByKey` → `return null` muto, il null si propaga a valle
- `113` `isOpen()` → `catch(SQLException){return false}` muto (usato ovunque)
- `156-164` `fileMtime/fileSize` → `return -1` muto (accettabile, ma zero traccia)

→ **Fix:** aggiungere almeno `System.err.println(...)` in ognuno. Sono i candidati #1.

### I2 — Database: `LocalDate.parse` non protetti su dati DB/telefono · `Database.java`
`getOverdue/getUpcoming/getUpcomingAll/getProjection/getProjectionByCategory` fanno
`LocalDate.parse((String)s.get("start_date"))` **senza try/catch** (righe ~2472, 2475, 2732, 2734,
2761, 2763, 2793-2794, 2828-2829, 2922-2923, 3955-3956, 3970-3971, 4376). Una sola pianificata con
data malformata (import Android, edit manuale del DB, sync parziale OneDrive) → `DateTimeParseException`
che **azzera l'intera lista pianificate/proiezione** e non viene loggata. Path molto usato.
→ **Fix:** parse difensivo per-riga (salta e logga la riga malformata invece di far esplodere tutto).

### I3 — Database: import coda telefono non robusto per-riga · `Database.java:1622-1739`
In `importPending`, il parse JSON è protetto (1622-1627) ma l'**applicazione** delle righe
(`applyPendingEntry`) no: `e.get("date").getAsString()`, `e.get("amount").getAsDouble()`,
`e.get("account_id").getAsInt()` **senza `has()`/null-check** (1730-1739). Una riga malformata dal
telefono lancia e **interrompe l'import di tutte le righe successive**, senza log.
→ **Fix:** try/catch **per singola riga** nel loop di import: riga fallita → logga e continua.
   (Coerente con la coda pending Android→desktop, memory `project_pending_queue_architecture`.)

### I4 — Database: `restoreBackup` lascia `conn=null` dopo rollback fallito · `Database.java:434-446`
Operazione irreversibile. Dopo `Files.move(src, archive)`, se il ripristino fallisce e **anche** il
rollback fallisce, si rilancia ma `conn` resta `null` (azzerato a 417, mai riaperto in quel ramo):
ogni query successiva tenta `ensureOpen()` su un file magari inesistente → cascata di SQLException.
→ **Fix:** garantire nel `finally` una riapertura verso un DB valido (originale o archivio) e loggare
   esplicitamente lo stato in cui si è rimasti.

### I5 — Database: `withExclusiveAccess` (VACUUM/REINDEX) — finally che maschera · `Database.java:3666-3681`
Se `openConnection` nel `finally` lancia, `conn` resta col riferimento chiuso/null e l'eccezione del
finally **maschera** quella originale dell'operazione. VACUUM/reindex operano sul file DB primario.
→ **Fix:** usare `addSuppressed`, loggare, e non lasciare `conn` invalida.

### I6 — Database: NPE su diagnostica DB · `Database.java:3686-3691` (`dbGetInfo`), `1826-1827` (`getAccountSummary`), `4001-4002` (`saveForecast`)
`((Number) queryOne(...).get("...")).longValue()` senza null-check su `queryOne`: se il PRAGMA/SELECT
non ritorna righe → NPE. In `dbGetInfo` è particolarmente ironico (crasha proprio quando il DB è malato).
→ **Fix:** null-check + fallback.

### I7 — Database: `inTx` — il finally può mascherare l'errore utile · `Database.java:569-587`
`finally { conn.setAutoCommit(true); }` può lanciare una seconda SQLException che sostituisce quella
originale del blocco transazionale.
→ **Fix:** try/catch nel finally con `addSuppressed`/log.

### I8 — Database: `execute()` non chiude il ResultSet in try-with-resources · `Database.java:484-501`
`ResultSet keys = ps.getGeneratedKeys()` non è in try-with-resources. Non è un leak permanente (il PS lo
chiude), ma è l'helper usato da **tutte** le INSERT/UPDATE → anti-pattern pervasivo.
→ **Fix:** `try (ResultSet keys = ps.getGeneratedKeys()) { ... }`.

---

## 🟡 MINORI / DIFENSIVI

- **`Database.java`** parse non protetti: `Integer.parseInt` su CSV `tag_ids` (1895) e `accountIds`
  (2799); vari `p.get(...).getAsInt()/getAsDouble()` in metodi pubblici (`addTransaction` 1535,
  `buyStock` 3078+, `setBudget`, `sellStock`…) assumono la presenza dei campi. Oggi il frontend li
  manda sempre, ma un payload incompleto (o una chiamata LAN malformata) → RuntimeException. Con il fix
  **C1** almeno finirebbero in log; idealmente validare i campi obbligatori.
- **`getAccountBalanceHistory`** `Database.java:3921-3927`: `currentBalances.get(aid)` può essere `null`
  → NPE da autoboxing (conto senza balance calcolato). Improbabile ma non protetto.
- **`DbLogger.java:113`** `catch(IOException ignored){}` in `log()`: se il .log non è scrivibile
  (file lockato da OneDrive/altro processo) le scritture spariscono senza traccia. Accettabile per non
  bloccare le operazioni, ma zero segnale. Valuta un fallback una-tantum su app.log.
- **`TrayManager.java:452`** `runReg` fa `waitFor()` **senza timeout**: se `reg.exe` si blocca, blocca
  il thread chiamante. Usa `waitFor(timeout, unit)`. Idem `Bridge.winPickFolder` (`proc.waitFor()`
  riga 237) e `readAllBytes` sullo stream del processo PowerShell: senza timeout un processo appeso
  blocca il virtual thread indefinitamente.
- **`TrayManager.java:403`** `disable()` → `SystemTray.remove` fuori da try/catch (può lanciare in
  scenari display anomali). Basso rischio.
- **`Settings.java:79`** `load()` nel costruttore gira prima del redirect di `System.err` (vedi C4):
  l'eventuale errore di lettura settings è perso in produzione.
- **`SingleInstance.java:34,55`** `catch(IOException ignored){}`: accettabili (best-effort), ma senza
  log; il caso "porta occupata ma invio SHOW fallito" è invisibile.
- **`IconFactory.java:148`** `main`: `out.getParentFile().mkdirs()` → NPE se il path non ha parent.
  Solo tool di build, non runtime.

---

## ✅ Parti già solide (nessuna azione)

- `MainWindow.java`: tutti i `db.close()/reopen()/backup()` nei lifecycle handler sono in try/catch
  **con** `System.err.println` → finiscono in app.log. Buono.
- `SplashWindow.fadeOut`: fallback corretto se la traslucenza non è supportata.
- `ContextMenuHandler.java`: nessun I/O, nessun path di eccezione.
- `Database`: l'infrastruttura `beginQuery/endQuery/activeQueries` guarda bene l'auto-release
  vs query in volo (fix già consolidato, memory `project_db_query_autorelease_guard`).

---

## Ordine di intervento consigliato

1. **C1** (Bridge logga) — sblocca da solo la visibilità in app.log di quasi tutto il resto.
2. **C4** (avvio a prova di crash) — evita morti silenziose all'avvio in produzione.
3. **C3** (WebServer: log + serializzazione DB) — l'unico rischio di **corruzione dati** reale.
4. **I2 + I3** (parse date + import telefono per-riga) — robustezza sui dati esterni/OneDrive.
5. **I4/I5/I7** (backup/restore/vacuum/inTx irreversibili) — atomicità e niente `conn` invalida.
6. **I1** (catch muti) + **I6/I8** (NPE diagnostica, ResultSet) — igiene.
7. **Minori** (timeout su processi esterni, ecc.).
