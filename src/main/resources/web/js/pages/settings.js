/* ═══════════════════════════════════════════════════════════════════════════
   LucaMoneyManager — pages/settings.js
   Pagina Impostazioni (5 tab: data/prefs/maintenance/info/perf) +
   sistema temi (built-in + custom + editor) + overlay scorciatoie.
   (estratta da app.js, stadio 8/9 del refactor)

   Dipendenze esterne (lazy a runtime):
   - _accFavoritesOnly (budget.js), updateSidebar (sidebar.js),
     renderDashboard (dashboard.js), currentPage (router.js)
   - _perfEnabled, _perfBuf, _PERF_MAX (bridge.js)
   - _dateStr (transactions.js)
═══════════════════════════════════════════════════════════════════════════ */

// _settingsTab era "parcheggiato" in scheduled.js con FIXME — ora nel posto corretto
let _settingsTab = 'data';

/* ═══════════════════════════════════════════════════════════════════════════
   IMPOSTAZIONI
═══════════════════════════════════════════════════════════════════════════ */
// Disegna la pagina Impostazioni con le 5 tab (Dati DB, Preferenze, Manutenzione, Info, Prestazioni)
// e collega tutti i controlli (tema, backup, autostart, HTTP, allegati, ecc.).
async function renderSettings() {
  const s = await api.getSettings();
  const pg = document.getElementById('pg-settings');

  const tabs = [
    { id: 'data',        label: '🗄️ Dati'         },
    { id: 'prefs',       label: '🎨 Preferenze'    },
    { id: 'maintenance', label: '🔧 Manutenzione'  },
    { id: 'archive',     label: '🗂️ Svecchiamento' },
    { id: 'info',        label: 'ℹ️ Informazioni'  },
    { id: 'perf',        label: '⏱️ Prestazioni'   },
  ];

  const tabContent = {
    data: `
      <div class="settings-section">
        <div class="settings-section-title">🗄️ Database</div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>File database attivo</strong>
            <span class="settings-hint">Il file SQLite dove vengono salvati tutti i dati</span>
          </div>
          <div class="settings-control">
            <div class="settings-path-row">
              <input id="dbPathInput" class="form-input settings-path-input"
                     type="text" readonly value="${s['db.path'] ?? ''}">
              <button class="btn btn-secondary" onclick="settingsChooseDb('open')">📂 Apri esistente</button>
              <button class="btn btn-ghost" onclick="settingsChooseDb('save')">➕ Crea nuovo</button>
              <button class="btn btn-ghost" onclick="showOnboardingWizard(document.getElementById('dbPathInput').value)" title="Riapri la schermata di benvenuto (scelta DB + dati di esempio)">🧭 Procedura guidata</button>
            </div>
            <p class="settings-hint" id="dbHint"></p>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">💾 Backup automatico</div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Backup all'uscita</strong>
            <span class="settings-hint">Crea un backup del database ad ogni chiusura dell'app</span>
          </div>
          <div class="settings-control">
            <div class="theme-toggle-group">
              <button class="btn theme-btn ${s['backup.enabled']==='1'?'theme-btn-active':''}"
                      onclick="settingsSetBackup('enabled','1')">Attivo</button>
              <button class="btn theme-btn ${s['backup.enabled']!=='1'?'theme-btn-active':''}"
                      onclick="settingsSetBackup('enabled','0')">Disattivo</button>
            </div>
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Cartella backup</strong>
            <span class="settings-hint">Dove salvare i file .db.bak</span>
          </div>
          <div class="settings-control">
            <div class="settings-path-row">
              <input id="backupDirInput" class="form-input settings-path-input"
                     type="text" readonly value="${s['backup.dir'] ?? ''}">
              <button class="btn btn-secondary" onclick="settingsChooseBackupDir()">📂 Scegli</button>
            </div>
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Backup da conservare</strong>
            <span class="settings-hint">Numero massimo di backup (i più vecchi vengono eliminati)</span>
          </div>
          <div class="settings-control">
            <input type="number" class="form-control" style="width:80px" min="1" max="999"
                   value="${s['backup.max']||'10'}"
                   onchange="settingsSetBackup('max', this.value)">
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Backup manuale</strong>
            <span class="settings-hint">Esegui subito un backup</span>
          </div>
          <div class="settings-control">
            <button class="btn btn-secondary" onclick="settingsDoBackup()">💾 Esegui backup ora</button>
            <span class="settings-hint" id="backupHint" style="margin-left:10px"></span>
          </div>
        </div>
        <div class="settings-row" style="align-items:flex-start">
          <div class="settings-label">
            <strong>Ripristina backup</strong>
            <span class="settings-hint">Seleziona un backup da ripristinare. Il database attuale verrà archiviato prima di procedere.</span>
          </div>
          <div class="settings-control" style="flex-direction:column;align-items:flex-start;gap:6px">
            <button class="btn btn-secondary" onclick="settingsLoadBackupList()">📂 Mostra backup disponibili</button>
            <div id="backupRestoreList" style="width:100%"></div>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">📎 Allegati</div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Cartella allegati</strong>
            <span class="settings-hint">Dove vengono copiati i file allegati alle transazioni</span>
          </div>
          <div class="settings-control">
            <div class="settings-path-row">
              <input id="attachmentsDirInput" class="form-input settings-path-input"
                     type="text" readonly value="${s['attachments.dir'] ?? ''}">
              <button class="btn btn-secondary" onclick="settingsChooseAttachmentsDir()">📂 Scegli</button>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">📱 Coda da telefono</div>
        <div class="settings-row" style="align-items:flex-start">
          <div class="settings-label">
            <strong>Transazioni in coda</strong>
            <span class="settings-hint">Contenuto di pending.jsonl: transazioni inserite da Android, in attesa di essere importate (o già importate).</span>
          </div>
          <div class="settings-control" style="flex-direction:column;align-items:flex-start;gap:8px">
            <button class="btn btn-secondary" onclick="settingsShowPendingQueue()">📱 Mostra coda</button>
            <div id="pendingQueueView" style="width:100%"></div>
          </div>
        </div>
      </div>`,

    prefs: `
      <div class="settings-section">
        <div class="settings-section-title">🎨 Tema</div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Tema predefinito</strong>
            <span class="settings-hint">Scegli o crea un tema personalizzato</span>
          </div>
          <div class="settings-control">
            <div style="display:flex;flex-direction:column;gap:10px">
              <div style="display:flex;gap:6px;flex-wrap:wrap">
                ${[['dark','🌙 Scuro'],['glassy','🪟 Vetro'],['petrolio','🛢️ Petrolio'],['carta','📜 Carta']].map(([key,label]) => `
                  <button class="btn theme-btn ${(s['appearance.theme']||'dark')===key?'theme-btn-active':''}"
                          onclick="settingsSetTheme('${key}')">${label}</button>
                  <button class="btn btn-ghost btn-icon" title="Duplica e personalizza" onclick="duplicateTheme('${key}')">⧉</button>`).join('')}
              </div>
              ${_customThemes.length ? `
              <div style="border-top:1px solid var(--border);padding-top:8px">
                <div style="font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--txt3);margin-bottom:6px">Personalizzati</div>
                ${_customThemes.map(ct => `
                  <div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--border)">
                    <span style="font-size:13px;flex:1;color:var(--txt)">${esc(ct.name)}</span>
                    <button class="btn theme-btn ${(s['appearance.theme']||'dark')==='c:'+ct.id?'theme-btn-active':''}" style="padding:4px 12px"
                            onclick="settingsSetTheme('c:${ct.id}')">Attiva</button>
                    <button class="btn btn-ghost btn-icon" title="Modifica" onclick="showThemeEditor(_customThemes.find(t=>t.id==='${ct.id}'))">✏️</button>
                    <button class="btn btn-ghost btn-icon" title="Duplica" onclick="duplicateTheme('c:${ct.id}')">⧉</button>
                    <button class="btn btn-ghost btn-icon" style="color:var(--txt3)" title="Elimina" onclick="_deleteCustomTheme('${ct.id}')">🗑️</button>
                  </div>`).join('')}
              </div>` : ''}
            </div>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">🏦 Conti</div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Visualizzazione conti</strong>
            <span class="settings-hint">Filtra i conti mostrati nelle liste e nella dashboard</span>
          </div>
          <div class="settings-control">
            <div class="theme-toggle-group">
              <button class="btn theme-btn ${!_accFavoritesOnly?'theme-btn-active':''}"
                      onclick="settingsSetAccFilter(false)">Tutti i conti</button>
              <button class="btn theme-btn ${_accFavoritesOnly?'theme-btn-active':''}"
                      onclick="settingsSetAccFilter(true)">Solo preferiti</button>
            </div>
          </div>
        </div>
      </div>

      ${s['_autostart_supported'] === '1' ? `
      <div class="settings-section">
        <div class="settings-section-title">🚀 Avvio</div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Avvia con Windows</strong>
            <span class="settings-hint">Precarica l'app al login. La chiusura della finestra la nasconde nel tray — usa "Esci" dal tray per uscire davvero.</span>
          </div>
          <div class="settings-control">
            <div class="theme-toggle-group">
              <button class="btn theme-btn ${s['autostart.enabled']==='1'?'theme-btn-active':''}"
                      onclick="settingsSetAutostart('1')">Attivo</button>
              <button class="btn theme-btn ${s['autostart.enabled']!=='1'?'theme-btn-active':''}"
                      onclick="settingsSetAutostart('0')">Disattivo</button>
            </div>
          </div>
        </div>
      </div>` : ''}

      <div class="settings-section">
        <div class="settings-section-title">📡 Accesso da browser (LAN)</div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Server HTTP</strong>
            <span class="settings-hint">Permette di accedere all'app dal browser di un altro dispositivo sulla stessa rete</span>
          </div>
          <div class="settings-control">
            <div class="theme-toggle-group">
              <button class="btn theme-btn ${s['http.enabled']!=='0'?'theme-btn-active':''}"
                      onclick="settingsSetHttp('enabled','1')">Attivo</button>
              <button class="btn theme-btn ${s['http.enabled']==='0'?'theme-btn-active':''}"
                      onclick="settingsSetHttp('enabled','0')">Disattivo</button>
            </div>
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Porta</strong>
            <span class="settings-hint">Porta TCP su cui risponde il server (default: 7890)</span>
          </div>
          <div class="settings-control">
            <input type="number" class="form-control" style="width:100px" min="1024" max="65535"
                   value="${s['http.port']||'7890'}"
                   onchange="settingsSetHttp('port', this.value)">
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-label">
            <span class="settings-hint">Le modifiche hanno effetto al prossimo avvio dell'app</span>
          </div>
        </div>
      </div>`,

    maintenance: `
      <div class="settings-section">
        <div class="settings-section-title">📊 Stato database</div>
        <div id="dbInfoPanel" class="maint-info-grid">
          <span class="settings-hint">Caricamento...</span>
        </div>
        <div class="settings-row" style="margin-top:10px">
          <div class="settings-label"></div>
          <div class="settings-control">
            <button class="btn btn-secondary" onclick="maintLoadInfo()">🔄 Aggiorna</button>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">🔧 Operazioni</div>

        <div class="settings-row">
          <div class="settings-label">
            <strong>Compatta database</strong>
            <span class="settings-hint">VACUUM: ricostruisce il file eliminando spazio inutilizzato. Può richiedere qualche secondo.</span>
          </div>
          <div class="settings-control maint-op-control">
            <button class="btn btn-secondary" id="btnVacuum" onclick="maintVacuum()">🗜️ Compatta</button>
            <span class="settings-hint maint-result" id="vacuumResult"></span>
          </div>
        </div>

        <div class="settings-row">
          <div class="settings-label">
            <strong>Verifica integrità</strong>
            <span class="settings-hint">Controlla che il file non sia corrotto (PRAGMA integrity_check).</span>
          </div>
          <div class="settings-control maint-op-control">
            <button class="btn btn-secondary" id="btnIntegrity" onclick="maintIntegrity()">🔍 Verifica</button>
            <span class="settings-hint maint-result" id="integrityResult"></span>
          </div>
        </div>

        <div class="settings-row">
          <div class="settings-label">
            <strong>Ricostruisci indici</strong>
            <span class="settings-hint">REINDEX + ottimizza le statistiche del query planner. Utile dopo import massivi di dati.</span>
          </div>
          <div class="settings-control maint-op-control">
            <button class="btn btn-secondary" id="btnReindex" onclick="maintReindex()">⚡ Ricostruisci</button>
            <span class="settings-hint maint-result" id="reindexResult"></span>
          </div>
        </div>

        <div class="settings-row">
          <div class="settings-label">
            <strong>Analizza statistiche</strong>
            <span class="settings-hint">ANALYZE: aggiorna le statistiche usate dal query planner per scegliere il piano di esecuzione migliore.</span>
          </div>
          <div class="settings-control maint-op-control">
            <button class="btn btn-secondary" id="btnAnalyze" onclick="maintAnalyze()">📊 Analizza</button>
            <span class="settings-hint maint-result" id="analyzeResult"></span>
          </div>
        </div>


        <div class="settings-row">
          <div class="settings-label">
            <strong>Cartella dati applicazione</strong>
            <span class="settings-hint">
              Contiene DB, impostazioni, log, cache Chromium (jcef/) e file web estratti.<br>
              Per reinstallare Chromium: <strong>chiudi l'app</strong>, poi apri questa cartella ed elimina la sottocartella <code>jcef</code>. Al riavvio verrà riscaricata (~200 MB).
            </span>
          </div>
          <div class="settings-control maint-op-control">
            <button class="btn btn-ghost" onclick="callJava('openDataDir')">📂 Apri cartella</button>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">📋 Log operazioni</div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>File di log</strong>
            <span class="settings-hint">Percorso e dimensione del file di log</span>
          </div>
          <div class="settings-control" style="display:flex;flex-direction:column;gap:4px">
            <span class="settings-hint" id="logPathText" style="word-break:break-all;font-family:monospace">—</span>
            <div class="flex-center-8">
              <span class="settings-hint" id="logSizeText">—</span>
              <button class="btn btn-ghost" style="white-space:nowrap;padding:2px 8px;font-size:11px"
                      onclick="callJava('openLogFolder')">Apri cartella ↗</button>
            </div>
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Contenuto log</strong>
            <span class="settings-hint">Prima e ultima registrazione nel file di log</span>
          </div>
          <div class="settings-control">
            <span class="settings-hint" id="logInfoText">Caricamento...</span>
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Elimina righe precedenti a</strong>
            <span class="settings-hint">Rimuove dal file di log tutte le righe antecedenti alla data scelta</span>
          </div>
          <div class="settings-control maint-op-control">
            <select class="form-control" id="logCutoffSelect" onchange="maintUpdateLogCutoff()">
              <option value="3m">Mantieni ultimi 3 mesi</option>
              <option value="6m">Mantieni ultimi 6 mesi</option>
              <option value="1y">Mantieni ultimo anno</option>
              <option value="2y">Mantieni ultimi 2 anni</option>
              <option value="custom">Personalizzato…</option>
            </select>
            <input type="date" class="form-control" id="logCutoffDate" style="display:none">
            <button class="btn btn-danger" onclick="maintPurgeLog()">🗑️ Elimina</button>
            <span class="settings-hint maint-result" id="logPurgeResult"></span>
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Elimina voci di sistema</strong>
            <span class="settings-hint">Rimuove avvio, backup, manutenzione — conserva transazioni e modifiche dati</span>
          </div>
          <div class="settings-control maint-op-control">
            <button class="btn btn-danger" onclick="maintPurgeSystemLog()">🗑️ Elimina voci sistema</button>
            <span class="settings-hint maint-result" id="logSystemPurgeResult"></span>
          </div>
        </div>
      </div>`,

    archive: `
      <div class="settings-section">
        <div class="settings-section-title">🗂️ Svecchiamento transazioni</div>
        <p class="settings-hint" style="margin:0 0 12px">
          Raggruppa le vecchie transazioni di una stessa categoria/conto/mese in un'unica voce
          riassuntiva, riducendo il numero di record e la dimensione del database.
          Le descrizioni, gli importi e i tag delle voci originali vengono conservati nel commento
          della transazione aggregata. <strong>Trasferimenti, transazioni con split, allegati o
          legate al portafoglio vengono sempre escluse.</strong> Prima dell'operazione viene creato
          un backup automatico del database.
        </p>

        <div class="settings-row">
          <div class="settings-label">
            <strong>Intervallo date</strong>
            <span class="settings-hint">Solo le transazioni in questo intervallo verranno considerate</span>
          </div>
          <div class="settings-control" style="gap:8px">
            <input type="date" class="form-control" id="archiveFrom">
            <span class="settings-hint">→</span>
            <input type="date" class="form-control" id="archiveTo">
          </div>
        </div>

        <div class="settings-row" style="align-items:flex-start">
          <div class="settings-label">
            <strong>Categorie</strong>
            <span class="settings-hint">Seleziona le categorie da raggruppare (nessuna preselezionata)</span>
          </div>
          <div class="settings-control" style="flex-direction:column;align-items:stretch;gap:6px">
            <div id="archiveCatList" style="display:flex;flex-direction:column;gap:2px;max-height:240px;overflow:auto;border:1px solid var(--border);border-radius:var(--radius,8px);padding:8px">
              <span class="settings-hint">Caricamento categorie...</span>
            </div>
          </div>
        </div>

        <div class="settings-row">
          <div class="settings-label"></div>
          <div class="settings-control maint-op-control">
            <button class="btn btn-secondary" id="btnArchivePreview" onclick="archiveDoPreview()">🔍 Anteprima transazioni</button>
            <span class="settings-hint maint-result" id="archivePreviewResult"></span>
          </div>
        </div>

        <div id="archivePreviewWrap" style="margin-top:8px"></div>
      </div>`,

    info: `
      <div class="settings-section">
        <div class="settings-section-title">ℹ️ Informazioni</div>
        <div class="settings-info-grid">
          <span class="settings-info-label">Versione app</span>
          <span class="settings-info-value">${s['_app_version'] || '—'}</span>
          <span class="settings-info-label">Java</span>
          <span class="settings-info-value">${s['_java_version'] || '—'}</span>
          <span class="settings-info-label">Browser engine</span>
          <span class="settings-info-value">Chromium ${s['_chromium'] || '(JCEF)'}</span>
          <span class="settings-info-label">Database</span>
          <span class="settings-info-value">${s['db.path'] || '—'}</span>
          <span class="settings-info-label">Impostazioni</span>
          <span class="settings-info-value flex-center-8">
            <span style="word-break:break-all">${s['_settings_path'] || '—'}</span>
            <button class="btn btn-ghost" style="white-space:nowrap;padding:2px 8px;font-size:11px"
                    onclick="api.openSettingsFile()">Apri ↗</button>
          </span>
          <span class="settings-info-label">Log Java</span>
          <span class="settings-info-value flex-center-8">
            <span style="word-break:break-all">${s['_app_log_path'] || '—'}</span>
            <!-- Conteggio errori nel file (riempito da _fillLogErrCount dopo il render) -->
            <span id="logErrCount" class="settings-hint" style="white-space:nowrap">…</span>
            <button class="btn btn-ghost" style="white-space:nowrap;padding:2px 8px;font-size:11px"
                    onclick="api.openAppLog()">Apri ↗</button>
            <button class="btn btn-ghost" style="white-space:nowrap;padding:2px 8px;font-size:11px"
                    onclick="_clearAppLog()">🗑️</button>
          </span>
        </div>
      </div>
      <div class="settings-section">
        <div class="settings-section-title">📦 Dipendenze</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="border-bottom:1px solid var(--border)">
              <th style="text-align:left;padding:6px 8px;color:var(--txt2);font-weight:500">Componente</th>
              <th style="text-align:left;padding:6px 8px;color:var(--txt2);font-weight:500">Versione</th>
              <th style="text-align:left;padding:6px 8px;color:var(--txt2);font-weight:500">Maven Central</th>
            </tr>
          </thead>
          <tbody>
            ${(function() {
              var deps = [
                { name: 'jcefmaven (JCEF)',  ver: s['_dep_jcef'],   g: 'me.friwi',            a: 'jcefmaven'   },
                { name: 'sqlite-jdbc',        ver: s['_dep_sqlite'], g: 'org.xerial',           a: 'sqlite-jdbc' },
                { name: 'gson',               ver: s['_dep_gson'],   g: 'com.google.code.gson', a: 'gson'        },
                { name: 'slf4j-nop',          ver: s['_dep_slf4j'],  g: 'org.slf4j',            a: 'slf4j-nop'   },
              ];
              var url = function(d) { return 'https://central.sonatype.com/artifact/' + d.g + '/' + d.a; };
              var rows = deps.map(function(d) {
                return '<tr style="border-bottom:1px solid var(--border)">'
                  + '<td style="padding:7px 8px">' + d.name + '</td>'
                  + '<td style="padding:7px 8px;font-family:monospace">' + (d.ver || '—') + '</td>'
                  + '<td style="padding:7px 8px"><a href="#" onclick="api.openUrl(\'' + url(d) + '\');return false;"'
                  + ' style="color:var(--accent);text-decoration:none">' + d.g + ':' + d.a + ' ↗</a></td>'
                  + '</tr>';
              });
              rows.push('<tr>'
                + '<td style="padding:7px 8px">SQLite (native)</td>'
                + '<td style="padding:7px 8px;font-family:monospace">' + (s['_sqlite_version'] || '—') + '</td>'
                + '<td style="padding:7px 8px;color:var(--txt2)">embedded in sqlite-jdbc</td>'
                + '</tr>');
              return rows.join('');
            })()}
          </tbody>
        </table>
      </div>`,

    perf: `
      <div class="settings-section">
        <div class="settings-section-title">⏱️ Monitoraggio prestazioni</div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Registrazione attiva</strong>
            <span class="settings-hint">Misura i tempi di risposta di ogni chiamata Java. Disattivare in uso normale.</span>
          </div>
          <div class="settings-control">
            <div class="theme-toggle-group">
              <button id="perfToggleOn"  class="btn theme-btn ${_perfEnabled?'theme-btn-active':''}"
                      onclick="perfSetEnabled(true)">Attivo</button>
              <button id="perfToggleOff" class="btn theme-btn ${!_perfEnabled?'theme-btn-active':''}"
                      onclick="perfSetEnabled(false)">Disattivo</button>
            </div>
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-label">
            <strong>Registro ultimi ${_PERF_MAX} log</strong>
            <span class="settings-hint">Round-trip = tempo totale JS. Java = elaborazione Bridge+DB. JCEF = overhead CEF.</span>
          </div>
          <div class="settings-control" style="gap:6px">
            <button class="btn btn-secondary" onclick="perfRefresh()">🔄 Aggiorna</button>
            <button class="btn btn-ghost"     onclick="perfClear()">🗑️ Svuota</button>
          </div>
        </div>
        <div id="perfTableWrap" style="overflow-x:auto;margin-top:4px">
          <span class="settings-hint" style="padding:8px 0;display:block">Premi Aggiorna per caricare i dati.</span>
        </div>
      </div>`,
  };

  // Layout a due zone (come Budget/Pianificate/Portfolio): header + barra tab restano
  // fissi in alto (flex-shrink:0), solo il contenuto della tab scorre (flex:1 + overflow).
  pg.innerHTML = `
    <div style="flex-shrink:0;padding:var(--dash-gap) var(--dash-gap) 0;background:var(--bg)">
      <div class="page-header">
        <h1 class="page-title">Impostazioni</h1>
      </div>
      <div class="settings-tabs">
        ${tabs.map(t=>`
          <button class="settings-tab ${_settingsTab===t.id?'settings-tab-active':''}"
                  onclick="_setSettingsTab('${t.id}')">${t.label}</button>`).join('')}
      </div>
    </div>
    <div style="flex:1;overflow-y:auto;padding:0 var(--dash-gap) var(--dash-gap)">
      <div class="settings-wrap">
        ${tabContent[_settingsTab] || ''}
      </div>
    </div>`;
  if (_settingsTab === 'maintenance') setTimeout(() => { maintLoadInfo(); maintLoadLogInfo(); }, 50);
  if (_settingsTab === 'archive')     setTimeout(() => { archiveLoadCategories(); }, 50);
  if (_settingsTab === 'info')        setTimeout(_fillLogErrCount, 50);
}

// Riempie il conteggio errori accanto alla riga "Log Java" (tab Informazioni).
// Stesso dato del badge in titlebar (intero file): verde se pulito, rosso se ci sono errori.
async function _fillLogErrCount() {
  const el = document.getElementById('logErrCount');
  if (!el) return;
  try {
    const { count } = await api.getAppLogErrors();
    if (count > 0) {
      el.textContent = '⚠ ' + count + (count === 1 ? ' errore' : ' errori');
      el.style.color = 'var(--expense)';
    } else {
      el.textContent = '✓ nessun errore';
      el.style.color = 'var(--income)';
    }
  } catch {
    el.textContent = '';
  }
}

// Cambia la tab attiva delle Impostazioni e carica i dati lazy della tab (manutenzione/perf).
window._setSettingsTab = tab => {
  _settingsTab = tab;
  renderSettings();
};

// ─── Prestazioni ──────────────────────────────────────────────────────────────

// Attiva/disattiva il logging delle prestazioni (tempi delle chiamate Bridge).
window.perfSetEnabled = async (enabled) => {
  _perfEnabled = enabled;
  await api.setPerfEnabled(enabled);
  renderSettings();
};

// Ricarica e mostra il log prestazioni (statistiche per metodo: conteggio, medie, ecc.).
window.perfRefresh = async () => {
  const wrap = document.getElementById('perfTableWrap');
  if (!wrap) return;
  wrap.innerHTML = '<span class="settings-hint">Caricamento...</span>';
  try {
    const [jsLog, javaLog] = await Promise.all([
      Promise.resolve(_perfBuf.slice()),
      api.getPerfLog(),
    ]);
    // Merge by method+ts: build javaMap keyed by method+ts (closest match)
    const javaByMethod = {};
    for (const j of javaLog) {
      const k = j.method;
      if (!javaByMethod[k]) javaByMethod[k] = [];
      javaByMethod[k].push(j);
    }
    // Match js entries to java entries by method, picking closest ts
    const rows = jsLog.map(js => {
      const candidates = javaByMethod[js.method] || [];
      let best = null, bestDiff = Infinity;
      for (const j of candidates) {
        const diff = Math.abs(j.ts - js.ts);
        if (diff < bestDiff) { bestDiff = diff; best = j; }
      }
      const javaMs  = best ? best.javaMs : null;
      const roundMs = js.roundMs;
      const jcefMs  = (javaMs != null) ? Math.max(0, roundMs - javaMs) : null;
      return { method: js.method, ts: js.ts, roundMs, javaMs, jcefMs };
    }).reverse();

    if (!rows.length) {
      wrap.innerHTML = '<span class="settings-hint" style="padding:8px 0;display:block">Nessun dato. Attiva la registrazione ed esegui alcune operazioni.</span>';
      return;
    }

    const badge = (ms, label) => {
      if (ms == null) return '<span style="color:var(--txt2)">—</span>';
      const color = ms < 50 ? 'var(--income)' : ms < 200 ? '#f0a030' : 'var(--expense)';
      return `<span style="color:${color};font-weight:600">${label !== undefined ? label : ms + ' ms'}</span>`;
    };

    wrap.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:12px;font-family:monospace">
        <thead>
          <tr style="border-bottom:1px solid var(--border)">
            <th style="text-align:left;padding:5px 8px;color:var(--txt2);font-weight:500;white-space:nowrap">Metodo</th>
            <th style="text-align:right;padding:5px 8px;color:var(--txt2);font-weight:500">Round-trip</th>
            <th style="text-align:right;padding:5px 8px;color:var(--txt2);font-weight:500">Java</th>
            <th style="text-align:right;padding:5px 8px;color:var(--txt2);font-weight:500">JCEF</th>
            <th style="text-align:right;padding:5px 8px;color:var(--txt2);font-weight:500">Ora</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => {
            const t = new Date(r.ts);
            const hms = `${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}:${String(t.getSeconds()).padStart(2,'0')}`;
            return `<tr style="border-bottom:1px solid var(--border)">
              <td style="padding:5px 8px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${r.method}">${r.method}</td>
              <td style="text-align:right;padding:5px 8px">${badge(r.roundMs, r.roundMs + ' ms')}</td>
              <td style="text-align:right;padding:5px 8px">${badge(r.javaMs,  r.javaMs  != null ? r.javaMs  + ' ms' : null)}</td>
              <td style="text-align:right;padding:5px 8px">${badge(r.jcefMs,  r.jcefMs  != null ? r.jcefMs  + ' ms' : null)}</td>
              <td style="text-align:right;padding:5px 8px;color:var(--txt2)">${hms}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  } catch(e) {
    wrap.innerHTML = `<span class="settings-hint" style="color:var(--expense)">Errore: ${e}</span>`;
  }
};

// Svuota il buffer del log prestazioni.
window.perfClear = async () => {
  _perfBuf.length = 0;
  await api.clearPerfLog();
  const wrap = document.getElementById('perfTableWrap');
  if (wrap) wrap.innerHTML = '<span class="settings-hint" style="padding:8px 0;display:block">Log svuotato.</span>';
};

// ─── Manutenzione DB ──────────────────────────────────────────────────────────

// Formatta un numero di byte in stringa leggibile (KB/MB/…).
function fmtBytes(b) {
  if (b == null) return '—';
  b = Number(b);
  if (b < 1024)       return b + ' B';
  if (b < 1024*1024)  return (b/1024).toFixed(1) + ' KB';
  return (b/1024/1024).toFixed(2) + ' MB';
}

// Carica e mostra le info diagnostiche del DB (dimensione, pagine, spazio libero, versione schema).
async function maintLoadInfo() {
  const panel = document.getElementById('dbInfoPanel');
  if (!panel) return;
  panel.innerHTML = '<span class="settings-hint">Caricamento...</span>';
  try {
    const info = await callJava('dbGetInfo');
    const fragPct = info.page_count > 0 ? ((info.free_pages / info.page_count) * 100).toFixed(1) : 0;
    panel.innerHTML = `
      <span class="maint-info-label">Dimensione file</span>
      <span class="maint-info-value">${fmtBytes(info.file_size)}</span>
      <span class="maint-info-label">WAL in attesa</span>
      <span class="maint-info-value">${fmtBytes(info.wal_size)}</span>
      <span class="maint-info-label">Pagine totali / libere</span>
      <span class="maint-info-value">${info.page_count} / ${info.free_pages} (${fragPct}% frammentazione)</span>
      <span class="maint-info-label">Dimensione pagina</span>
      <span class="maint-info-value">${fmtBytes(info.page_size)}</span>
      <span class="maint-info-label">Transazioni</span>
      <span class="maint-info-value">${info.tx_count}</span>
      <span class="maint-info-label">Conti</span>
      <span class="maint-info-value">${info.acc_count}</span>
      <span class="maint-info-label">Schema DB</span>
      <span class="maint-info-value">v${info.schema_version} / v${info.schema_latest}</span>`;
  } catch(e) {
    panel.innerHTML = `<span class="settings-hint" style="color:var(--expense)">Errore: ${e}</span>`;
  }
}

// Esegue VACUUM (compatta il DB) e mostra i byte liberati.
async function maintVacuum() {
  const btn = document.getElementById('btnVacuum');
  const res = document.getElementById('vacuumResult');
  btn.disabled = true; btn.textContent = '⏳ In corso...';
  res.textContent = '';
  try {
    const r = await callJava('dbVacuum');
    const saved = Number(r.saved);
    res.style.color = saved > 0 ? 'var(--income)' : '';
    res.textContent = `${fmtBytes(r.size_before)} → ${fmtBytes(r.size_after)}` +
      (saved > 0 ? ` (liberati ${fmtBytes(saved)})` : ' (nessuno spazio da recuperare)');
    maintLoadInfo();
  } catch(e) {
    res.style.color = 'var(--expense)';
    res.textContent = 'Errore: ' + e;
  }
  btn.disabled = false; btn.textContent = '🗜️ Compatta';
}

// Esegue il controllo di integrità del DB e mostra l'esito.
async function maintIntegrity() {
  const btn = document.getElementById('btnIntegrity');
  const res = document.getElementById('integrityResult');
  btn.disabled = true; btn.textContent = '⏳ Verifica...';
  res.textContent = '';
  try {
    const r = await callJava('dbIntegrityCheck');
    if (r.ok) {
      res.style.color = 'var(--income)';
      res.textContent = '✓ Database integro';
    } else {
      res.style.color = 'var(--expense)';
      res.textContent = '✗ Errori: ' + r.messages.join(' | ');
    }
  } catch(e) {
    res.style.color = 'var(--expense)';
    res.textContent = 'Errore: ' + e;
  }
  btn.disabled = false; btn.textContent = '🔍 Verifica';
}

// Esegue ANALYZE (aggiorna le statistiche del query planner) e mostra il risultato.
async function maintAnalyze() {
  const btn = document.getElementById('btnAnalyze');
  const res = document.getElementById('analyzeResult');
  btn.disabled = true; btn.textContent = '⏳ In corso...';
  res.textContent = '';
  try {
    const r = await callJava('dbAnalyze');
    // Raggruppa per tabella e prendi il primo valore stat (righe totali)
    const byTable = {};
    for (const s of r.stats) {
      if (!byTable[s.name]) byTable[s.name] = parseInt((s.stat||'0').split(' ')[0], 10);
    }
    const lines = Object.entries(byTable)
      .sort((a,b) => b[1]-a[1])
      .map(([t,n]) => `${t}: ${n.toLocaleString()} righe`)
      .join(' · ');
    res.style.color = 'var(--income)';
    res.textContent = '✓ ' + (lines || 'statistiche aggiornate');
  } catch(e) {
    res.style.color = 'var(--expense)';
    res.textContent = 'Errore: ' + e;
  }
  btn.disabled = false; btn.textContent = '📊 Analizza';
}

// Esegue REINDEX + PRAGMA optimize (ricostruisce/ottimizza gli indici).
async function maintReindex() {
  const btn = document.getElementById('btnReindex');
  const res = document.getElementById('reindexResult');
  btn.disabled = true; btn.textContent = '⏳ In corso...';
  res.textContent = '';
  try {
    await callJava('dbReindex');
    res.style.color = 'var(--income)';
    res.textContent = '✓ Indici ricostruiti';
  } catch(e) {
    res.style.color = 'var(--expense)';
    res.textContent = 'Errore: ' + e;
  }
  btn.disabled = false; btn.textContent = '⚡ Ricostruisci';
}


// ─── Svecchiamento (raggruppamento transazioni vecchie) ───────────────────────

// Importi candidati all'anteprima, memorizzati tra preview ed esecuzione.
let _archiveRows = [];

// Carica le categorie nella lista a checkbox (raggruppate per parent, nessuna preselezionata).
async function archiveLoadCategories() {
  const box = document.getElementById('archiveCatList');
  if (!box) return;
  try {
    const cats = await api.getCategories();
    if (!cats.length) { box.innerHTML = '<span class="settings-hint">Nessuna categoria</span>'; return; }
    // Etichetta gerarchica: "Parent:Figlia" se ha un parent
    box.innerHTML = cats.map(c => {
      const label = esc(c.parent_name ? `${c.parent_name}:${c.name}` : c.name);
      const color = esc(c.color || c.parent_color || 'var(--txt3)');
      return `<label style="display:flex;align-items:center;gap:8px;padding:3px 4px;cursor:pointer;font-size:var(--fs-md,12px)">
        <input type="checkbox" class="archive-cat-cb" value="${c.id}">
        <span style="width:10px;height:10px;border-radius:3px;background:${color};flex:none"></span>
        <span style="color:var(--txt)">${label}</span>
        <span class="settings-hint" style="margin-left:auto">${c.usage_count||0} tr.</span>
      </label>`;
    }).join('');
  } catch(e) {
    box.innerHTML = `<span class="settings-hint" style="color:var(--expense)">Errore: ${e}</span>`;
  }
}

// Esegue l'anteprima: chiede al backend le transazioni candidate e mostra la lista
// dettagliata con checkbox per riga (categoria, importo, descrizione, tag).
window.archiveDoPreview = async () => {
  const from = document.getElementById('archiveFrom').value;
  const to   = document.getElementById('archiveTo').value;
  const res  = document.getElementById('archivePreviewResult');
  const wrap = document.getElementById('archivePreviewWrap');
  const catIds = [...document.querySelectorAll('.archive-cat-cb:checked')].map(cb => Number(cb.value));

  res.style.color = '';
  if (!from || !to) { res.style.color = 'var(--expense)'; res.textContent = 'Seleziona l\'intervallo date'; return; }
  if (from > to)    { res.style.color = 'var(--expense)'; res.textContent = 'La data iniziale è successiva a quella finale'; return; }
  if (!catIds.length) { res.style.color = 'var(--expense)'; res.textContent = 'Seleziona almeno una categoria'; return; }

  const btn = document.getElementById('btnArchivePreview');
  btn.disabled = true; btn.textContent = '⏳ Caricamento...';
  wrap.innerHTML = '';
  try {
    const r = await api.archivePreview(from, to, catIds);
    _archiveRows = r.rows || [];
    if (!_archiveRows.length) {
      res.textContent = '';
      wrap.innerHTML = `<span class="settings-hint" style="display:block;padding:6px 0">Nessuna transazione raggruppabile nell'intervallo scelto.${
        r.excluded ? ` (${r.excluded} escluse perché split/trasferimenti/allegati/portafoglio o già raggruppate)` : ''}</span>`;
      return;
    }
    res.style.color = 'var(--income)';
    res.textContent = `${_archiveRows.length} transazioni candidate` + (r.excluded ? ` · ${r.excluded} escluse` : '');
    wrap.innerHTML = archiveRenderList(_archiveRows);
    archiveUpdateSummary();
  } catch(e) {
    res.style.color = 'var(--expense)';
    res.textContent = 'Errore: ' + e;
  }
  btn.disabled = false; btn.textContent = '🔍 Anteprima transazioni';
};

// Costruisce la tabella dell'anteprima: una riga per transazione, checkbox spuntata di default.
function archiveRenderList(rows) {
  // Numero di gruppi distinti (mese|categoria|conto|tipo) → quante aggregate verranno create
  const fmt = v => Number(v).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const body = rows.map(r => `
    <tr style="border-bottom:1px solid var(--border)">
      <td style="padding:4px 8px"><input type="checkbox" class="archive-row-cb" data-id="${r.id}" data-group="${r.group}" checked onchange="archiveUpdateSummary()"></td>
      <td style="padding:4px 8px;white-space:nowrap;color:var(--txt2)">${r.date}</td>
      <td style="padding:4px 8px;white-space:nowrap">${esc(r.category_name||'—')}</td>
      <td style="padding:4px 8px;text-align:right;white-space:nowrap;color:${r.type==='income'?'var(--income)':'var(--expense)'}">${fmt(r.amount)}</td>
      <td style="padding:4px 8px;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(r.description||'')}">${r.description ? esc(r.description) : '<span style="color:var(--txt3)">(senza commento)</span>'}</td>
      <td style="padding:4px 8px;color:var(--txt2);white-space:nowrap">${esc(r.tags||'')}</td>
    </tr>`).join('');
  return `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;flex-wrap:wrap">
      <button class="btn btn-ghost" style="padding:2px 10px;font-size:11px" onclick="archiveToggleAll(true)">Seleziona tutte</button>
      <button class="btn btn-ghost" style="padding:2px 10px;font-size:11px" onclick="archiveToggleAll(false)">Deseleziona tutte</button>
      <span class="settings-hint" id="archiveSummary" style="margin-left:auto"></span>
    </div>
    <div style="overflow-x:auto;max-height:420px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius,8px)">
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="border-bottom:1px solid var(--border);position:sticky;top:0;background:var(--bg2)">
            <th style="padding:5px 8px"></th>
            <th style="text-align:left;padding:5px 8px;color:var(--txt2);font-weight:500">Data</th>
            <th style="text-align:left;padding:5px 8px;color:var(--txt2);font-weight:500">Categoria</th>
            <th style="text-align:right;padding:5px 8px;color:var(--txt2);font-weight:500">Importo</th>
            <th style="text-align:left;padding:5px 8px;color:var(--txt2);font-weight:500">Descrizione</th>
            <th style="text-align:left;padding:5px 8px;color:var(--txt2);font-weight:500">Tag</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    </div>
    <div class="maint-op-control" style="margin-top:10px">
      <button class="btn btn-danger" id="btnArchiveRun" onclick="archiveRun()">🗂️ Raggruppa le selezionate</button>
      <span class="settings-hint maint-result" id="archiveRunResult"></span>
    </div>`;
}

// Spunta/deseleziona tutte le righe dell'anteprima.
window.archiveToggleAll = (on) => {
  document.querySelectorAll('.archive-row-cb').forEach(cb => cb.checked = on);
  archiveUpdateSummary();
};

// Aggiorna il riepilogo "N transazioni → M aggregate" in base alle righe spuntate.
window.archiveUpdateSummary = () => {
  const checked = [...document.querySelectorAll('.archive-row-cb:checked')];
  const groups = new Set(checked.map(cb => cb.dataset.group));
  // Gruppi con una sola transazione selezionata non vengono aggregati (resterebbero invariati)
  const groupCounts = {};
  checked.forEach(cb => { groupCounts[cb.dataset.group] = (groupCounts[cb.dataset.group]||0) + 1; });
  const aggregable = Object.entries(groupCounts).filter(([,n]) => n >= 2);
  const aggTx = aggregable.reduce((s,[,n]) => s+n, 0);
  const el = document.getElementById('archiveSummary');
  if (el) el.textContent = `${checked.length} selezionate · verranno create ${aggregable.length} voci aggregate da ${aggTx} transazioni` +
    (checked.length - aggTx > 0 ? ` (${checked.length - aggTx} singole non raggruppabili, restano invariate)` : '');
};

// Esegue il raggruppamento sulle righe spuntate, previa conferma. Backup automatico lato Java.
window.archiveRun = async () => {
  const ids = [...document.querySelectorAll('.archive-row-cb:checked')].map(cb => Number(cb.dataset.id));
  const result = document.getElementById('archiveRunResult');
  if (!ids.length) { result.style.color = 'var(--expense)'; result.textContent = 'Nessuna transazione selezionata'; return; }

  const ok = await confirm('Raggruppa transazioni',
    `Stai per raggruppare ${ids.length} transazioni in voci riassuntive ed eliminare gli originali.\n\n` +
    `Verrà creato automaticamente un backup del database prima di procedere. L'operazione non è annullabile dall'app (solo ripristinando il backup).\n\nProcedere?`);
  if (!ok) return;

  const btn = document.getElementById('btnArchiveRun');
  btn.disabled = true; btn.textContent = '⏳ In corso...';
  result.textContent = '';
  try {
    const r = await api.archiveTransactions(ids);
    if (r.error) {
      result.style.color = 'var(--expense)';
      result.textContent = 'Errore: ' + r.error;
    } else {
      result.style.color = 'var(--income)';
      result.textContent = `✓ Create ${r.created} voci aggregate, eliminate ${r.deleted} transazioni`;
      // Ricarica l'anteprima per riflettere lo stato aggiornato del DB
      setTimeout(() => archiveDoPreview(), 600);
    }
  } catch(e) {
    result.style.color = 'var(--expense)';
    result.textContent = 'Errore: ' + e;
  }
  btn.disabled = false; btn.textContent = '🗂️ Raggruppa le selezionate';
};


// ─── Manutenzione log ────────────────────────────────────────────────────────

// Carica le info sul log operazioni (intervallo date, numero righe, percorso/dimensione file).
async function maintLoadLogInfo() {
  const el = document.getElementById('logInfoText');
  if (!el) return;
  try {
    const info = await callJava('getLogInfo');
    // percorso e dimensione
    const pathEl = document.getElementById('logPathText');
    const sizeEl = document.getElementById('logSizeText');
    if (pathEl) pathEl.textContent = info.log_path || '—';
    if (sizeEl && info.log_size != null) {
      const kb = (info.log_size / 1024).toFixed(1);
      sizeEl.textContent = kb >= 1024
        ? `${(kb / 1024).toFixed(2)} MB`
        : `${kb} KB`;
    } else if (sizeEl) sizeEl.textContent = '—';
    // contenuto
    if (info.empty)        el.textContent = 'Log vuoto o non trovato';
    else if (info.error)   el.textContent = 'Errore: ' + info.error;
    else                   el.textContent = `Prima registrazione: ${info.first}  ·  Ultima: ${info.last}  ·  ${info.total_lines} righe`;
  } catch(e) { el.textContent = 'Errore: ' + e; }
}

// Aggiorna l'anteprima della data di taglio per la pulizia del log.
window.maintUpdateLogCutoff = () => {
  const v = document.getElementById('logCutoffSelect').value;
  document.getElementById('logCutoffDate').style.display = v === 'custom' ? '' : 'none';
};

// Elimina le righe di log di sistema (avvii, backup, ecc.) mantenendo le operazioni utente.
window.maintPurgeSystemLog = async () => {
  const ok = await confirm('Elimina voci di sistema', 'Eliminare tutte le voci di sistema dal log (avvio, backup, manutenzione)?');
  if (!ok) return;
  const res = await callJava('purgeSystemLog');
  const result = document.getElementById('logSystemPurgeResult');
  if (res.error) {
    result.style.color = 'var(--expense)';
    result.textContent = 'Errore: ' + res.error;
  } else {
    result.style.color = res.deleted > 0 ? 'var(--income)' : '';
    result.textContent = res.deleted > 0 ? `Eliminate ${res.deleted} righe` : 'Nessuna voce di sistema trovata';
    maintLoadLogInfo();
  }
};

// Svuota il file app.log (errori Java), troncandolo.
window._clearAppLog = async () => {
  const ok = await confirm('Pulisci log Java', 'Eliminare il contenuto di app.log?');
  if (!ok) return;
  await callJava('clearAppLog', {});
  toast('Log Java eliminato', 'success');
  // Aggiorna sia il conteggio in Impostazioni sia il badge in titlebar (ora a zero)
  _fillLogErrCount();
  if (typeof window.refreshLogErrors === 'function') window.refreshLogErrors();
};

// Elimina dal log le righe più vecchie della data di taglio scelta.
window.maintPurgeLog = async () => {
  const sel = document.getElementById('logCutoffSelect').value;
  let cutoff;
  if (sel === 'custom') {
    cutoff = document.getElementById('logCutoffDate').value;
    if (!cutoff) { document.getElementById('logPurgeResult').textContent = 'Seleziona una data'; return; }
  } else {
    const d = new Date();
    if      (sel === '3m') d.setMonth(d.getMonth() - 3);
    else if (sel === '6m') d.setMonth(d.getMonth() - 6);
    else if (sel === '1y') d.setFullYear(d.getFullYear() - 1);
    else if (sel === '2y') d.setFullYear(d.getFullYear() - 2);
    cutoff = _dateStr(d);
  }
  const ok = await confirm('Elimina log', `Eliminare tutte le righe di log precedenti al ${cutoff}?`);
  if (!ok) return;
  const res = await callJava('purgeLog', { cutoff });
  const result = document.getElementById('logPurgeResult');
  if (res.error) {
    result.style.color = 'var(--expense)';
    result.textContent = 'Errore: ' + res.error;
  } else {
    result.style.color = res.deleted > 0 ? 'var(--income)' : '';
    result.textContent = res.deleted > 0 ? `Eliminate ${res.deleted} righe` : 'Nessuna riga da eliminare';
    maintLoadLogInfo();
  }
};

/* ─── Custom themes ──────────────────────────────────────────────────────── */
let _customThemes  = [];
let _activeThemeKey = 'dark';
let _teWorkingTheme = null;
let _teOriginalTheme = null;
let _teDragState = null;

const _BUILTIN_VARS = {
  dark: {
    '--bg':'#0d1117','--bg2':'#161b22','--bg3':'#1c2128','--bg4':'#21262d',
    '--border':'#30363d','--accent':'#7c6cff','--accent2':'#00d4aa',
    '--income':'#3fb950','--expense':'#f85149','--warn':'#d29922',
    '--txt':'#e6edf3','--txt2':'#8b949e','--txt3':'#6e7681',
  },
  carta: {
    '--bg':'#ece5d8','--bg2':'#f4ede0','--bg3':'#e0d8cb','--bg4':'#d4ccbf',
    '--border':'#c2b8a6','--accent':'#8b5a18','--accent2':'#2e6e58',
    '--income':'#1e6b2e','--expense':'#b52a1a','--warn':'#7a5600',
    '--txt':'#241a08','--txt2':'#5c4a2c','--txt3':'#8a7860',
  },
  petrolio: {
    '--bg':'#0f1e23','--bg2':'#16292f','--bg3':'#1e353c','--bg4':'#1a2f35',
    '--border':'#294349','--accent':'#f0883e','--accent2':'#2fb9a0',
    '--income':'#4ec76a','--expense':'#f4695f','--warn':'#e0a94a',
    '--txt':'#e7f0f2','--txt2':'#9db3b8','--txt3':'#6a848a',
  },
};

const _THEME_VAR_GROUPS = [
  { title: 'Sfondi', vars: [
    ['--bg',     'Sfondo principale'],
    ['--bg2',    'Sidebar / Card'],
    ['--bg3',    'Input / Tabelle'],
    ['--bg4',    'Hover'],
    ['--border', 'Bordi'],
  ]},
  { title: 'Testo', vars: [
    ['--txt',  'Testo principale'],
    ['--txt2', 'Testo secondario'],
    ['--txt3', 'Testo tenue'],
  ]},
  { title: 'Accenti & Colori', vars: [
    ['--accent',  'Accent principale'],
    ['--accent2', 'Accent secondario / Investimenti'],
    ['--income',  'Entrate'],
    ['--expense', 'Uscite'],
    ['--warn',    'Avviso'],
  ]},
];
const _ALL_THEME_VARS = _THEME_VAR_GROUPS.flatMap(g => g.vars.map(v => v[0]));

const _FONT_OPTIONS = [
  ["'Segoe UI', sans-serif",           'Segoe UI (default)'],
  ['Arial, sans-serif',                'Arial'],
  ['Verdana, sans-serif',              'Verdana'],
  ['Tahoma, sans-serif',               'Tahoma'],
  ['Calibri, sans-serif',              'Calibri'],
  ["'Trebuchet MS', sans-serif",       'Trebuchet MS'],
  ["'Gill Sans', sans-serif",          'Gill Sans'],
  ['Georgia, serif',                   'Georgia (serif)'],
  ["'Times New Roman', serif",         'Times New Roman (serif)'],
  ['Consolas, monospace',              'Consolas (mono)'],
  ["'Courier New', monospace",         'Courier New (mono)'],
];

// Carica i temi personalizzati dell'utente dalle impostazioni (JSON in appearance.custom_themes).
async function _loadCustomThemes() {
  const s = await api.getSettings();
  try { _customThemes = JSON.parse(s['appearance.custom_themes'] || '[]'); } catch { _customThemes = []; }
}
// Persiste l'array dei temi personalizzati nel DB.
async function _saveCustomThemesToDB() {
  await api.setSetting('appearance.custom_themes', JSON.stringify(_customThemes));
}
const _FONT_SIZE_VARS = [
  { key: '--fs-xs',    label: 'Badge e tag',       hint: 'badge colorati, tag filtro, etichette nav',  def: 10, min: 7,  max: 14 },
  { key: '--fs-sm',    label: 'Etichette',          hint: 'label campo, testo secondario, hint',        def: 11, min: 8,  max: 15 },
  { key: '--fs-md',    label: 'Pulsanti e input',   hint: 'bottoni, campi form',                        def: 12, min: 9,  max: 16 },
  { key: '--font-size',label: 'Corpo testo',        hint: 'testo principale, voci lista, menu',         def: 13, min: 10, max: 17 },
  { key: '--fs-lg',    label: 'Dati e tabelle',     hint: 'celle tabella, importi, valori',             def: 13, min: 11, max: 18 },
  { key: '--fs-xl',    label: 'Titolo finestra',    hint: 'barra del titolo applicazione',              def: 16, min: 12, max: 22 },
];

// Applica le variabili CSS di un tema personalizzato (colori, raggio, dimensioni font, font family).
function _applyCustomVars(ct) {
  _ALL_THEME_VARS.forEach(v => {
    if (ct.vars[v]) document.documentElement.style.setProperty(v, ct.vars[v]);
    else document.documentElement.style.removeProperty(v);
  });
  document.documentElement.style.setProperty('--radius', (ct.radius ?? 8) + 'px');
  const fs = ct.fontSizes || {};
  _FONT_SIZE_VARS.forEach(({ key, def }) =>
    document.documentElement.style.setProperty(key, (fs[key] ?? (key === '--font-size' ? ct.fontSize : null) ?? def) + 'px')
  );
  document.body.style.fontFamily = ct.fontFamily || '';
}
// Rimuove tutte le variabili CSS inline di un tema personalizzato (ripristina il tema base).
function _clearCustomVars() {
  _ALL_THEME_VARS.forEach(v => document.documentElement.style.removeProperty(v));
  document.documentElement.style.removeProperty('--radius');
  _FONT_SIZE_VARS.forEach(({ key }) => document.documentElement.style.removeProperty(key));
  document.body.style.fontFamily = '';
}

// Applica un tema: built-in (data-theme) o personalizzato ("c:id" → variabili inline). Non persiste.
function applyTheme(theme) {
  if (theme === 'salvia' || theme === 'cristallo' || theme === 'nebula' || theme === 'twilight' || theme === 'chiaro') theme = 'petrolio'; // migrazione: Salvia→Cristallo→Nebula→Twilight→Chiaro→Petrolio
  _activeThemeKey = theme || 'dark';
  _clearCustomVars();
  if (theme && theme.startsWith('c:')) {
    const ct = _customThemes.find(t => t.id === theme.slice(2));
    document.documentElement.dataset.theme = '';
    if (ct) _applyCustomVars(ct);
  } else {
    const valid = ['carta', 'petrolio', 'glassy'];
    document.documentElement.dataset.theme = valid.includes(theme) ? theme : '';
  }
  _updateThemeBtn();
  _cacheAppearance(theme);
}

// Salva in localStorage uno snapshot dell'aspetto corrente (data-theme, sfondo risolto e,
// per i temi personalizzati, le variabili CSS) così index.html può riapplicarlo
// sincronicamente al caricamento, prima del primo paint. Vedi lo script inline in <head>.
function _cacheAppearance(theme) {
  try {
    const de = document.documentElement;
    const bg = getComputedStyle(de).getPropertyValue('--bg').trim();
    const cache = { dataTheme: de.dataset.theme || '', bg: bg || '' };
    if (theme && theme.startsWith('c:')) {
      const ct = _customThemes.find(t => t.id === theme.slice(2));
      if (ct) {
        const vars = {};
        _ALL_THEME_VARS.forEach(v => { if (ct.vars[v]) vars[v] = ct.vars[v]; });
        cache.vars = vars;
        cache.radius = ct.radius ?? 8;
        const fs = ct.fontSizes || {}, out = {};
        _FONT_SIZE_VARS.forEach(({ key, def }) =>
          out[key] = (fs[key] ?? (key === '--font-size' ? ct.fontSize : null) ?? def));
        cache.fontSizes = out;
      }
    }
    localStorage.setItem('lmm.appearance', JSON.stringify(cache));
  } catch (e) {}
}

// Applica e salva il tema scelto (persistente), poi aggiorna pulsante e pagina.
async function settingsSetTheme(theme) {
  applyTheme(theme);
  await api.setSetting('appearance.theme', theme);
  _updateThemeBtn();
  renderSettings();
}

const _THEME_CYCLE = [
  { key: '',          icon: '🌙', label: 'Scuro' },
  { key: 'glassy',    icon: '🪟', label: 'Vetro' },
  { key: 'petrolio',  icon: '🛢️', label: 'Petrolio' },
  { key: 'carta',     icon: '📜', label: 'Carta' },
];

// Sequenza completa di temi per il toggle ciclico (built-in + personalizzati).
function _fullThemeCycle() {
  const customs = _customThemes.map(ct => ({ key: 'c:' + ct.id, icon: '🎨', label: ct.name }));
  return [..._THEME_CYCLE, ...customs];
}

// Aggiorna icona/tooltip del pulsante tema in titlebar in base al tema attivo e al prossimo nel ciclo.
function _updateThemeBtn() {
  const btn = document.getElementById('themeToggleBtn');
  if (!btn) return;
  const cycle = _fullThemeCycle();
  const activeKey = _activeThemeKey || '';
  const currIdx = cycle.findIndex(x => x.key === activeKey);
  const curr = currIdx >= 0 ? cycle[currIdx] : cycle[0];
  const next = cycle[(Math.max(currIdx, 0) + 1) % cycle.length];
  btn.textContent = curr.icon;
  btn.title = `Tema ${curr.label} — clicca per passare a ${next.label} (Alt+T)`;
}

// Passa al tema successivo nel ciclo (pulsante titlebar / scorciatoia Alt+T).
async function _toggleTheme() {
  const cycle = _fullThemeCycle();
  const activeKey = _activeThemeKey || '';
  const currIdx = cycle.findIndex(x => x.key === activeKey);
  const next = cycle[(Math.max(currIdx, 0) + 1) % cycle.length];
  await settingsSetTheme(next.key || 'dark');
}

/* ─── Theme editor ───────────────────────────────────────────────────────── */
// Crea un nuovo tema personalizzato duplicando un tema esistente (built-in o custom) e apre l'editor.
function duplicateTheme(sourceKey) {
  let base;
  if (sourceKey.startsWith('c:')) {
    const ct = _customThemes.find(t => t.id === sourceKey.slice(2));
    if (!ct) return;
    base = { ...ct, id: Date.now().toString(36), name: ct.name + ' (copia)', vars: { ...ct.vars } };
  } else {
    const names = { dark: 'Scuro', carta: 'Carta', petrolio: 'Petrolio' };
    base = {
      id: Date.now().toString(36),
      name: (names[sourceKey] || 'Tema') + ' (copia)',
      vars: { ...(_BUILTIN_VARS[sourceKey] || _BUILTIN_VARS.dark) },
      baseKey: sourceKey,
      fontFamily: '', fontSize: 13, radius: 8,
    };
  }
  showThemeEditor(base);
}

// Apre l'editor temi (pannello flottante): colori per gruppi, dimensioni font, raggio, font family,
// con anteprima live applicata mentre si modifica. Lavora su una copia (_teWorkingTheme).
function showThemeEditor(themeObj) {
  _teWorkingTheme = JSON.parse(JSON.stringify(themeObj));
  // Inizializza fontSizes con valori di default se mancanti
  if (!_teWorkingTheme.fontSizes) _teWorkingTheme.fontSizes = {};
  _FONT_SIZE_VARS.forEach(({ key, def }) => {
    if (_teWorkingTheme.fontSizes[key] == null)
      _teWorkingTheme.fontSizes[key] = key === '--font-size' ? (_teWorkingTheme.fontSize || def) : def;
  });
  _teOriginalTheme = _activeThemeKey;
  // Applica subito per live preview
  document.documentElement.dataset.theme = '';
  _applyCustomVars(_teWorkingTheme);

  let panel = document.getElementById('tePanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'tePanel';
    document.body.appendChild(panel);
    panel.addEventListener('mousedown', e => {
      if (!e.target.closest('#teHeader') || e.target.tagName === 'BUTTON') return;
      const r = panel.getBoundingClientRect();
      _teDragState = { x: e.clientX - r.left, y: e.clientY - r.top };
      e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
      if (!_teDragState) return;
      panel.style.left  = Math.max(0, e.clientX - _teDragState.x) + 'px';
      panel.style.top   = Math.max(0, e.clientY - _teDragState.y) + 'px';
      panel.style.right = 'auto';
    });
    document.addEventListener('mouseup', () => { _teDragState = null; });
  }

  const isNew = !_customThemes.find(t => t.id === _teWorkingTheme.id);
  const colorSections = _THEME_VAR_GROUPS.map(g => `
    <div class="te-section-hdr">${g.title}</div>
    ${g.vars.map(([v, label]) => {
      const val = _teWorkingTheme.vars[v] || '#888888';
      const base = _BUILTIN_VARS[_teWorkingTheme.baseKey || 'dark'] || _BUILTIN_VARS.dark;
      const defVal = base[v] || '';
      const isDefault = defVal && val.toLowerCase() === defVal.toLowerCase();
      return `<div class="te-color-row">
        <span class="te-color-label">${label}</span>
        <div class="te-color-inputs">
          <input type="color" class="te-swatch" data-var="${v}" value="${val}">
          <input type="text" class="te-hex" data-var="${v}" value="${val.toUpperCase()}" maxlength="7" spellcheck="false">
          <button class="te-reset-btn" data-var="${v}" title="Ripristina default (${defVal.toUpperCase()})" style="opacity:${isDefault?'0.2':'0.8'}"${!defVal?' disabled':''}>↺</button>
        </div>
      </div>`;
    }).join('')}`).join('');

  const fontSel = _FONT_OPTIONS.map(([v, l]) =>
    `<option value="${v}"${_teWorkingTheme.fontFamily===v?' selected':''}>${l}</option>`).join('');

  panel.innerHTML = `
    <div id="teHeader">
      <span>🎨 ${esc(_teWorkingTheme.name)}</span>
      <button class="btn btn-ghost btn-icon" onclick="closeThemeEditor(false)" title="Chiudi senza salvare">✕</button>
    </div>
    <div id="teBody">
      <div class="te-prop-row" style="padding-top:2px">
        <label>Nome</label>
        <input class="form-control" id="teName" value="${esc(_teWorkingTheme.name)}" placeholder="Nome tema" style="flex:1">
      </div>
      ${colorSections}
      <div class="te-section-hdr">Tipografia</div>
      <div class="te-prop-row">
        <label>Font</label>
        <select class="form-control" id="teFont" style="flex:1;min-width:0">${fontSel}</select>
      </div>
      <div class="te-prop-row">
        <label style="flex:none;margin-right:6px">Font personalizzato</label>
        <input class="form-control" id="teFontCustom" placeholder="es. Impact, sans-serif"
               value="${!_FONT_OPTIONS.find(([v])=>v===_teWorkingTheme.fontFamily) && _teWorkingTheme.fontFamily ? _teWorkingTheme.fontFamily : ''}"
               style="flex:1;font-size:var(--fs-sm,11px)">
      </div>
      ${_FONT_SIZE_VARS.map(({key, label, hint, def, min, max}) => {
        const fs = _teWorkingTheme.fontSizes || {};
        const val = fs[key] ?? (key==='--font-size' ? (_teWorkingTheme.fontSize||def) : def);
        const safeId = 'teFs_' + key.replace(/[^a-z0-9]/gi,'_');
        return `<div class="te-prop-row" style="align-items:center;gap:6px">
          <div style="flex:none;width:130px">
            <div style="font-size:var(--fs-md,12px);color:var(--txt);font-weight:500;line-height:1.3">${label}</div>
            <div style="font-size:var(--fs-xs,10px);color:var(--txt3);line-height:1.4">${hint}</div>
          </div>
          <input type="range" id="${safeId}" data-fskey="${key}" min="${min}" max="${max}" value="${val}" style="flex:1;min-width:0">
          <span class="te-range-val" id="${safeId}Val">${val}px</span>
          <span id="${safeId}Preview" style="font-size:${val}px;color:var(--txt2);min-width:22px;text-align:right;flex-shrink:0;line-height:1">Aa</span>
        </div>`;
      }).join('')}
      <div class="te-section-hdr">Forma</div>
      <div class="te-prop-row">
        <label>Raggio bordi</label>
        <input type="range" id="teRadius" min="0" max="20" value="${_teWorkingTheme.radius??8}" style="flex:1">
        <span class="te-range-val" id="teRadiusVal">${_teWorkingTheme.radius??8}px</span>
      </div>
    </div>
    <div id="teFooter">
      ${!isNew ? `<button class="btn btn-ghost btn-icon" style="color:var(--expense)" title="Elimina tema" onclick="_deleteCustomTheme('${_teWorkingTheme.id}')">🗑️</button>` : ''}
      <span style="flex:1"></span>
      <button class="btn btn-secondary" onclick="closeThemeEditor(false)">Annulla</button>
      <button class="btn btn-primary" onclick="closeThemeEditor(true)">Salva e applica</button>
    </div>`;

  panel.classList.add('open');
  _teWireEvents();
}

// Collega gli eventi dell'editor temi (input colore/font/raggio → anteprima live) e il drag del pannello.
function _teWireEvents() {
  document.querySelectorAll('#tePanel input.te-swatch').forEach(el => {
    el.addEventListener('input', e => {
      const v = e.target.dataset.var, val = e.target.value;
      _teWorkingTheme.vars[v] = val;
      const hex = document.querySelector(`#tePanel input.te-hex[data-var="${v}"]`);
      if (hex) hex.value = val.toUpperCase();
      document.documentElement.style.setProperty(v, val);
    });
  });
  document.querySelectorAll('#tePanel input.te-hex').forEach(el => {
    el.addEventListener('input', e => {
      let val = e.target.value.trim();
      if (!val.startsWith('#')) val = '#' + val;
      if (/^#[0-9a-fA-F]{6}$/.test(val)) {
        const v = e.target.dataset.var;
        _teWorkingTheme.vars[v] = val;
        const sw = document.querySelector(`#tePanel input.te-swatch[data-var="${v}"]`);
        if (sw) sw.value = val;
        document.documentElement.style.setProperty(v, val);
      }
    });
    el.addEventListener('blur', e => {
      e.target.value = (_teWorkingTheme.vars[e.target.dataset.var] || '#888888').toUpperCase();
    });
  });
  document.querySelectorAll('#tePanel button.te-reset-btn').forEach(el => {
    el.addEventListener('click', e => {
      const v = e.currentTarget.dataset.var;
      const base = _BUILTIN_VARS[_teWorkingTheme.baseKey || 'dark'] || _BUILTIN_VARS.dark;
      const defVal = base[v];
      if (!defVal) return;
      _teWorkingTheme.vars[v] = defVal;
      const sw  = document.querySelector(`#tePanel input.te-swatch[data-var="${v}"]`);
      const hex = document.querySelector(`#tePanel input.te-hex[data-var="${v}"]`);
      const btn = e.currentTarget;
      if (sw)  sw.value  = defVal;
      if (hex) hex.value = defVal.toUpperCase();
      if (btn) btn.style.opacity = '0.2';
      document.documentElement.style.setProperty(v, defVal);
    });
  });
  const applyFont = val => {
    _teWorkingTheme.fontFamily = val;
    document.body.style.fontFamily = val;
  };
  document.getElementById('teFont')?.addEventListener('change', e => {
    applyFont(e.target.value);
    document.getElementById('teFontCustom').value = '';
  });
  document.getElementById('teFontCustom')?.addEventListener('input', e => {
    const val = e.target.value.trim();
    if (val) applyFont(val);
  });
  // Slider per ogni taglia font
  document.querySelectorAll('#tePanel input[data-fskey]').forEach(el => {
    el.addEventListener('input', e => {
      const key = e.target.dataset.fskey;
      const v = parseInt(e.target.value);
      _teWorkingTheme.fontSizes[key] = v;
      if (key === '--font-size') _teWorkingTheme.fontSize = v;
      const valEl = document.getElementById(e.target.id + 'Val');
      if (valEl) valEl.textContent = v + 'px';
      const previewEl = document.getElementById(e.target.id + 'Preview');
      if (previewEl) previewEl.style.fontSize = v + 'px';
      document.documentElement.style.setProperty(key, v + 'px');
    });
  });
  document.getElementById('teRadius')?.addEventListener('input', e => {
    const v = parseInt(e.target.value);
    _teWorkingTheme.radius = v;
    document.getElementById('teRadiusVal').textContent = v + 'px';
    document.documentElement.style.setProperty('--radius', v + 'px');
  });
}

// Chiude l'editor temi: se save=true salva/aggiorna il tema personalizzato e lo applica,
// altrimenti annulla ripristinando il tema precedente.
async function closeThemeEditor(save) {
  const panel = document.getElementById('tePanel');
  if (!panel || !panel.classList.contains('open')) return;
  if (save) {
    const nameEl = document.getElementById('teName');
    if (nameEl) _teWorkingTheme.name = nameEl.value.trim() || 'Tema personalizzato';
    const idx = _customThemes.findIndex(t => t.id === _teWorkingTheme.id);
    if (idx >= 0) _customThemes[idx] = _teWorkingTheme;
    else _customThemes.push(_teWorkingTheme);
    await _saveCustomThemesToDB();
    await settingsSetTheme('c:' + _teWorkingTheme.id);
  } else {
    applyTheme(_teOriginalTheme || 'dark');
  }
  panel.classList.remove('open');
  _teWorkingTheme = null;
}

// Elimina un tema personalizzato; se era attivo torna al tema scuro.
async function _deleteCustomTheme(id) {
  _customThemes = _customThemes.filter(t => t.id !== id);
  await _saveCustomThemesToDB();
  if (_activeThemeKey === 'c:' + id) await settingsSetTheme('dark');
  const panel = document.getElementById('tePanel');
  if (panel) panel.classList.remove('open');
  if (currentPage === 'settings') renderSettings();
}

/* ─── Shortcuts overlay ──────────────────────────────────────────────────── */
// Mostra l'overlay con l'elenco delle scorciatoie da tastiera.
function showShortcutsHelp() {
  const kbdStyle = "background:var(--bg3);border:1px solid var(--border);border-radius:4px;padding:0 5px;font-size:10px";
  const overlay = document.getElementById('shortcutsOverlay');
  overlay.innerHTML = `
    <div id="shortcutsPanel">
      <h3>Scorciatoie da tastiera <span>premi <kbd style="${kbdStyle}">Esc</kbd> o <kbd style="${kbdStyle}">?</kbd> per chiudere</span></h3>
      <div class="sc-group">
        <div class="sc-group-title">Pagina Transazioni — generali</div>
        <div class="sc-row">
          <span class="sc-desc">Nuova transazione (spesa)</span>
          <span class="sc-keys"><kbd>N</kbd></span>
        </div>
        <div class="sc-row">
          <span class="sc-desc">Focus sulla ricerca</span>
          <span class="sc-keys"><kbd>F</kbd></span>
        </div>
      </div>
      <div class="sc-group">
        <div class="sc-group-title">Pagina Transazioni — riga selezionata</div>
        <div class="sc-row">
          <span class="sc-desc">Modifica</span>
          <span class="sc-keys"><kbd>E</kbd></span>
        </div>
        <div class="sc-row">
          <span class="sc-desc">Duplica</span>
          <span class="sc-keys"><kbd>D</kbd></span>
        </div>
        <div class="sc-row">
          <span class="sc-desc">Segna come conciliata</span>
          <span class="sc-keys"><kbd>R</kbd></span>
        </div>
        <div class="sc-row">
          <span class="sc-desc">Segna come "da verificare"</span>
          <span class="sc-keys"><kbd>V</kbd></span>
        </div>
        <div class="sc-row">
          <span class="sc-desc">Elimina</span>
          <span class="sc-keys"><kbd>Canc</kbd></span>
        </div>
      </div>
      <div class="sc-group">
        <div class="sc-group-title">Interfaccia</div>
        <div class="sc-row">
          <span class="sc-desc">Mostra questa guida</span>
          <span class="sc-keys"><kbd>?</kbd></span>
        </div>
      </div>
    </div>`;
  overlay.classList.add('open');
}

// Chiude l'overlay scorciatoie.
function closeShortcutsHelp() {
  document.getElementById('shortcutsOverlay').classList.remove('open');
}

// ── Setter di preferenze: salvano una chiave e ridisegnano (alcuni aggiornano anche la sidebar) ──
// Mostra solo i conti preferiti in sidebar/dashboard.
async function settingsSetAccFilter(favOnly) {
  _accFavoritesOnly = favOnly;
  await api.setSetting('accounts.favorites_only', favOnly ? '1' : '0');
  renderSettings();
  updateSidebar();
}

// Abilita/disabilita l'avvio automatico con Windows (gestito lato Java via tray).
async function settingsSetAutostart(value) {
  await api.setSetting('autostart.enabled', value);
  renderSettings();
}

// Imposta una preferenza di backup (abilitato, cartella, max copie…).
async function settingsSetBackup(key, value) {
  await api.setSetting('backup.' + key, value);
  renderSettings();
}

// Imposta una preferenza del WebServer LAN (abilitato, porta).
async function settingsSetHttp(key, value) {
  await api.setSetting('http.' + key, value);
  renderSettings();
}

// Apre il selettore cartella nativo e salva la cartella di backup scelta.
async function settingsChooseBackupDir() {
  const res = await api.chooseBackupDir();
  if (res.cancelled) return;
  await api.setSetting('backup.dir', res.path);
  renderSettings();
}

// Apre il selettore cartella nativo e salva la cartella allegati scelta.
async function settingsChooseAttachmentsDir() {
  const res = await api.chooseAttachmentsDir();
  if (res.cancelled) return;
  await api.setSetting('attachments.dir', res.path);
  renderSettings();
}

// Carica e mostra il contenuto di pending.jsonl (coda transazioni da telefono) ben formattato.
async function settingsShowPendingQueue() {
  const view = document.getElementById('pendingQueueView');
  if (!view) return;
  view.innerHTML = '<span class="settings-hint">⏳ Lettura coda...</span>';
  try {
    const [rows, accounts, categories] = await Promise.all([
      api.readPendingQueue(), api.getAccounts(), api.getCategories()
    ]);
    if (!rows.length) {
      view.innerHTML = '<span class="settings-hint">La coda è vuota — nessuna transazione dal telefono.</span>';
      return;
    }
    // Mappe id → nome per rendere leggibili conto e categoria (in coda ci sono solo gli id).
    const accName = {}; accounts.forEach(a => accName[a.id] = a.name);
    const catName = {}; categories.forEach(c => catName[c.id] = c.parent_name ? `${c.parent_name}: ${c.name}` : c.name);

    const typeIcon = { income: '↓', expense: '↑', transfer: '⇄' };
    const typeSign = { income: '+', expense: '-', transfer: '' };
    // Non applicate prima (le vere "da importare"), poi le già importate; entro il gruppo per data desc.
    rows.sort((a, b) => (a.applied - b.applied) || String(b.date).localeCompare(String(a.date)));

    const pending   = rows.filter(r => !r.applied).length;
    const cancelled = rows.filter(r => r.cancelled).length;
    const body = rows.map(r => {
      const conto = accName[r.account_id] || `#${r.account_id ?? '?'}`;
      const dest  = r.to_account_id != null ? ` → ${accName[r.to_account_id] || '#'+r.to_account_id}` : '';
      const catg  = r.type === 'transfer' ? 'Trasferimento' : (catName[r.category_id] || '—');
      const desc  = r.description || catg;
      // Le annullate dal telefono sono applied come le importate ma per il motivo opposto:
      // icona e barratura le distinguono, altrimenti sembrerebbero regolarmente importate.
      const icona = r.cancelled ? '🚫' : (r.applied ? '✅' : '⏳');
      const stile = r.cancelled ? 'text-decoration:line-through;opacity:.6' : '';
      // esc(): descrizione, conto e categoria arrivano da pending.jsonl (scritto da Android)
      // e finiscono in innerHTML — stessa esposizione gia' chiusa altrove con X1.
      return `<tr style="border-bottom:1px solid var(--border);${stile}"
                  ${r.cancelled ? 'title="Annullata dal telefono: non verrà importata"' : ''}>
        <td style="padding:6px 8px;white-space:nowrap">${icona}</td>
        <td style="padding:6px 8px;white-space:nowrap;color:var(--txt2)">${fmt.date(r.date)}</td>
        <td style="padding:6px 8px">${esc(desc)}</td>
        <td style="padding:6px 8px;color:var(--txt2)">${esc(conto)}${esc(dest)} · ${esc(catg)}</td>
        <td style="padding:6px 8px;white-space:nowrap;text-align:right;font-weight:600"
            class="amount-${r.type}">${typeSign[r.type]||''}${fmt.currency(r.amount)}</td>
      </tr>`;
    }).join('');

    view.innerHTML = `
      <div style="font-size:12px;color:var(--txt3);margin-bottom:6px">
        ${rows.length} rig${rows.length===1?'a':'he'} · ${pending} da importare · ${rows.length-pending-cancelled} già importate${cancelled ? ` · ${cancelled} annullate dal telefono` : ''}
      </div>
      <div style="max-height:340px;overflow:auto;border:1px solid var(--border);border-radius:8px">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr style="position:sticky;top:0;background:var(--bg2)">
            <th style="padding:6px 8px;text-align:left;font-size:11px;color:var(--txt3)"></th>
            <th style="padding:6px 8px;text-align:left;font-size:11px;color:var(--txt3)">Data</th>
            <th style="padding:6px 8px;text-align:left;font-size:11px;color:var(--txt3)">Descrizione</th>
            <th style="padding:6px 8px;text-align:left;font-size:11px;color:var(--txt3)">Conto · Categoria</th>
            <th style="padding:6px 8px;text-align:right;font-size:11px;color:var(--txt3)">Importo</th>
          </tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>`;
  } catch(e) {
    view.innerHTML = `<span class="settings-hint">❌ Errore lettura coda: ${e.message}</span>`;
  }
}

// Esegue un backup manuale del DB mostrando lo stato nell'hint.
async function settingsDoBackup() {
  const hint = document.getElementById('backupHint');
  if (hint) hint.textContent = '⏳ Backup in corso...';
  try {
    const res = await api.doBackup();
    if (hint) hint.textContent = `✅ Salvato: ${res.path}`;
  } catch(e) {
    if (hint) hint.textContent = `❌ ${e.message}`;
  }
}

// Carica e mostra l'elenco dei backup disponibili (con data, dimensione e modifiche di sessione).
async function settingsLoadBackupList() {
  const container = document.getElementById('backupRestoreList');
  if (!container) return;
  container.innerHTML = '<span class="settings-hint">⏳ Caricamento...</span>';
  try {
    const res = await api.listBackups();
    const list = res.backups || [];
    if (!list.length) {
      container.innerHTML = '<span class="settings-hint">Nessun backup trovato.</span>';
      return;
    }
    container.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:4px">
        <thead>
          <tr style="color:var(--txt2);border-bottom:1px solid var(--border)">
            <th style="text-align:left;padding:4px 8px">Data e ora</th>
            <th style="text-align:left;padding:4px 8px">Modifiche</th>
            <th style="text-align:right;padding:4px 8px">Dim.</th>
            <th style="padding:4px 8px"></th>
          </tr>
        </thead>
        <tbody>
          ${list.map((b,i) => {
            const changes = b.changes || [];
            const nChanges = changes.length;
            const rowBg = i%2===1 ? 'background:rgba(255,255,255,.025)' : '';
            const detailId = `bak-detail-${i}`;
            const changesCell = nChanges === 0
              ? `<span style="color:var(--txt3)">—</span>`
              : `<button class="btn-bak-changes" data-detail="${detailId}">
                   ${nChanges} ${nChanges===1?'modifica':'modifiche'}
                 </button>`;
            const detailRows = changes.map(c => {
              let descHtml = '';
              if (c.desc) {
                // desc viene dal log, che include i campi delle transazioni (descrizione
                // compresa): è testo utente e va escapato prima di finire in innerHTML.
                descHtml = c.desc.split(' · ').map(part => {
                  const colon = part.indexOf(':');
                  if (colon === -1) return `<span style="color:var(--txt3)">${esc(part)}</span>`;
                  const key = part.slice(0, colon);
                  const val = part.slice(colon + 1);
                  if (key === 'importo') return `<span style="color:var(--txt3)">${esc(key)}:</span><span style="color:var(--income);font-weight:700"> ${esc(val)}</span>`;
                  if (key === 'categoria') return `<span style="color:var(--txt3)">${esc(key)}:</span><span style="color:var(--accent);font-weight:600"> ${esc(val)}</span>`;
                  return `<span style="color:var(--txt3)">${esc(part)}</span>`;
                }).join('<span style="color:var(--border)"> · </span>');
              }
              return `<tr class="bak-detail-row ${detailId}" style="background:var(--bg3)">
                <td colspan="4" style="padding:3px 8px 3px 24px;font-size:11px;color:var(--txt2)">
                  <span style="color:var(--txt3);margin-right:6px">${esc(c.time)}</span>
                  <strong>${esc(c.op)}</strong>
                  ${descHtml ? `<span style="margin-left:6px">${descHtml}</span>` : ''}
                </td>
              </tr>`;
            }).join('');
            return `
            <tr style="border-bottom:1px solid var(--border);${rowBg}">
              <td style="padding:5px 8px;font-weight:600;color:var(--accent)">${b.displayTs}</td>
              <td style="padding:5px 8px">${changesCell}</td>
              <td style="padding:5px 8px;text-align:right;color:var(--txt3)">${(b.size/1024).toFixed(1)} KB</td>
              <td style="padding:5px 8px">
                <button class="btn btn-secondary btn-restore-bak" style="font-size:11px;padding:2px 10px"
                  data-path="${b.path.replace(/\\/g,'\\\\')}" data-ts="${b.displayTs}">
                  ♻️ Ripristina
                </button>
              </td>
            </tr>
            ${detailRows}`;
          }).join('')}
        </tbody>
      </table>`;
    container.querySelectorAll('.bak-detail-row').forEach(r => r.classList.add('hidden'));
    container.querySelectorAll('.btn-bak-changes').forEach(btn => {
      btn.addEventListener('click', () => {
        const rows = container.querySelectorAll(`.${btn.dataset.detail}`);
        const open = !rows[0]?.classList.contains('hidden');
        rows.forEach(r => r.classList.toggle('hidden', open));
        btn.classList.toggle('active', !open);
      });
    });
    container.querySelectorAll('.btn-restore-bak').forEach(btn => {
      btn.addEventListener('click', () => settingsConfirmRestore(btn.dataset.path, btn.dataset.ts));
    });
  } catch(e) {
    container.innerHTML = `<span class="settings-hint" style="color:var(--expense)">❌ ${e.message}</span>`;
  }
}

// Chiede conferma e ripristina un backup (il DB corrente viene archiviato prima del ripristino).
async function settingsConfirmRestore(path, displayTs) {
  const ok = await confirm('Ripristina backup', `Ripristinare il backup del <strong>${displayTs}</strong>?<br><br>Il database corrente verrà archiviato nella cartella backup prima di procedere.`);
  if (!ok) return;
  const container = document.getElementById('backupRestoreList');
  if (container) container.innerHTML = '<span class="settings-hint">⏳ Ripristino in corso...</span>';
  try {
    const res = await api.restoreBackup(path);
    openModal('✅ Ripristino completato',
      `<p style="color:var(--txt2);line-height:1.6">Database precedente archiviato in:<br><code style="font-size:11px">${esc(res.archived)}</code><br><br>L'applicazione verrà ricaricata.</p>`,
      () => { closeModal(); location.reload(); }, 'Ok', 'btn-primary');
  } catch(e) {
    if (container) container.innerHTML = `<span class="settings-hint" style="color:var(--expense)">❌ ${e.message}</span>`;
  }
}

// Sceglie un file DB da aprire o crea un nuovo DB (mode 'open'/'save'), poi riconnette l'app.
async function settingsChooseDb(mode) {
  const res = await api.chooseDbFile(mode);
  if (res.cancelled) return;

  document.getElementById('dbPathInput').value = res.path;
  const hint = document.getElementById('dbHint');
  hint.style.color = 'var(--txt3)';
  hint.textContent = '⏳ Cambio database in corso…';
  try {
    await api.reloadDb(res.path);
    hint.style.color = 'var(--income)';
    hint.textContent = '✅ Database cambiato con successo.';
    toast('Database aggiornato.', 'success');
    await updateSidebar();
    await renderDashboard();
  } catch (e) {
    hint.style.color = 'var(--expense)';
    hint.textContent = '❌ Errore: ' + (e.message || e);
    toast('Errore cambio database: ' + (e.message || e), 'error');
  }
}

