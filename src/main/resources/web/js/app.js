/* ═══════════════════════════════════════════════════════════════════════════
   LucaMoneyManager — app.js
   Bridge JS→Java via cefQuery, tutte le pagine SPA
═══════════════════════════════════════════════════════════════════════════ */

/* ─── Emoji picker ────────────────────────────────────────────────────────── */
const EMOJI_LIST = [
  // Cibo & Ristoranti
  {e:'🍕',k:'pizza cibo ristorante'},{e:'🍔',k:'hamburger fast food burger'},
  {e:'🍜',k:'pasta noodle cibo ristorante'},{e:'🍣',k:'sushi pesce ristorante'},
  {e:'🥗',k:'insalata verdura pranzo'},{e:'🥩',k:'carne bistecca grill'},
  {e:'🍱',k:'pranzo box bento cibo'},{e:'🥐',k:'croissant colazione bar'},
  {e:'☕',k:'caffe bar colazione'},{e:'🍺',k:'birra bar locale'},
  {e:'🍷',k:'vino ristorante cena'},{e:'🍸',k:'cocktail aperitivo bar'},
  {e:'🍰',k:'torta dolci pasticceria'},{e:'🍦',k:'gelato dolci'},
  {e:'🍿',k:'popcorn cinema snack'},{e:'🥤',k:'bibita drink takeaway'},
  {e:'🧃',k:'succo bevanda'},{e:'🫖',k:'te infuso bevanda'},
  {e:'🥪',k:'panino sandwich pranzo'},{e:'🍞',k:'pane forno bakery'},
  // Supermercato & Spesa
  {e:'🛒',k:'spesa supermercato alimentari'},{e:'🧺',k:'spesa acquisti'},
  {e:'🥛',k:'latte spesa alimenti'},{e:'🥚',k:'uova spesa alimenti'},
  {e:'🧀',k:'formaggio spesa alimenti'},{e:'🫙',k:'conserve dispensa'},
  // Trasporti
  {e:'🚗',k:'auto macchina trasporto'},{e:'⛽',k:'benzina carburante auto'},
  {e:'🚌',k:'bus autobus trasporto pubblico'},{e:'🚇',k:'metro metropolitana'},
  {e:'🚂',k:'treno ferrovia'},{e:'✈️',k:'aereo volo viaggio'},
  {e:'🚕',k:'taxi uber trasporto'},{e:'🛵',k:'scooter moto'},
  {e:'🚲',k:'bici bicicletta'},{e:'🛳️',k:'nave traghetto'},
  {e:'🅿️',k:'parcheggio sosta'},
  // Casa & Abitazione
  {e:'🏠',k:'casa affitto mutuo abitazione'},{e:'🔧',k:'manutenzione riparazioni'},
  {e:'💡',k:'elettricita luce bolletta'},{e:'💧',k:'acqua bolletta idrico'},
  {e:'🔥',k:'gas riscaldamento bolletta'},{e:'🔌',k:'elettricita energia'},
  {e:'🛋️',k:'arredamento mobili casa'},{e:'🪴',k:'piante giardino'},
  {e:'🧹',k:'pulizie casa domestico'},{e:'🪣',k:'pulizie casa'},
  {e:'🔑',k:'affitto casa chiavi'},{e:'🏗️',k:'ristrutturazione lavori'},
  {e:'📦',k:'trasloco spedizione pacco'},
  // Salute & Benessere
  {e:'💊',k:'medicine farmacia salute'},{e:'🏥',k:'ospedale medico visita'},
  {e:'🩺',k:'medico visita salute'},{e:'🦷',k:'dentista odontoiatra'},
  {e:'👁️',k:'oculista vista occhi'},{e:'💪',k:'palestra fitness sport'},
  {e:'🧘',k:'yoga meditazione benessere'},{e:'💆',k:'massaggio benessere spa'},
  {e:'🧴',k:'cosmetici igiene cura'},{e:'🧼',k:'igiene personale'},
  // Abbigliamento & Shopping
  {e:'👗',k:'vestiti abbigliamento shopping'},{e:'👔',k:'camicia vestiti lavoro'},
  {e:'👟',k:'scarpe sneaker abbigliamento'},{e:'👜',k:'borsa accessori'},
  {e:'💄',k:'trucco cosmetici bellezza'},{e:'🛍️',k:'shopping acquisti'},
  {e:'👒',k:'cappello accessori'},{e:'🧥',k:'giacca cappotto'},
  {e:'👓',k:'occhiali accessori'},{e:'⌚',k:'orologio accessori'},
  // Intrattenimento
  {e:'🎬',k:'cinema film intrattenimento'},{e:'🎵',k:'musica concerto spotify'},
  {e:'🎮',k:'videogiochi gaming intrattenimento'},{e:'📺',k:'tv streaming netflix'},
  {e:'🎭',k:'teatro spettacolo'},{e:'🎨',k:'arte hobby'},
  {e:'📚',k:'libri lettura cultura'},{e:'🎲',k:'giochi hobby'},
  {e:'🎤',k:'karaoke musica concerto'},{e:'🎸',k:'musica strumento hobby'},
  {e:'🎰',k:'gioco azzardo scommesse'},{e:'🎳',k:'bowling svago'},
  // Finanza & Banca
  {e:'💰',k:'soldi risparmio finanza'},{e:'💳',k:'carta credito banca pagamento'},
  {e:'💵',k:'contanti soldi'},{e:'🏦',k:'banca istituto finanziario'},
  {e:'📈',k:'investimenti borsa azioni'},{e:'📉',k:'perdita spese'},
  {e:'💹',k:'investimenti finanza'},{e:'💸',k:'spese uscite soldi'},
  {e:'🤑',k:'guadagno entrate soldi'},{e:'🪙',k:'moneta risparmio'},
  {e:'🏧',k:'bancomat prelievo'},
  // Lavoro & Professione
  {e:'💼',k:'lavoro ufficio professione'},{e:'🖥️',k:'computer lavoro tech'},
  {e:'📱',k:'telefono cellulare abbonamento'},{e:'📊',k:'report lavoro'},
  {e:'📋',k:'documenti burocrazia'},{e:'🖊️',k:'scrittura ufficio'},
  {e:'🏢',k:'ufficio azienda lavoro'},{e:'📞',k:'telefono comunicazione'},
  {e:'💻',k:'laptop lavoro freelance'},{e:'🖨️',k:'stampa ufficio'},
  {e:'✉️',k:'posta spedizione busta'},
  // Famiglia & Persone
  {e:'👶',k:'bambino figlio neonato'},{e:'🧒',k:'figlio bambino scuola'},
  {e:'👨‍👩‍👧‍👦',k:'famiglia'},{e:'❤️',k:'amore regalo donazione'},
  {e:'🎁',k:'regalo dono compleanno'},{e:'🎂',k:'compleanno festa'},
  {e:'🎓',k:'istruzione universita diploma'},{e:'🏫',k:'scuola istruzione'},
  {e:'🧸',k:'giocattoli bambini'},{e:'🍼',k:'bebé neonato'},
  // Viaggi & Vacanze
  {e:'🌍',k:'viaggio estero vacanza'},{e:'🏖️',k:'vacanza mare spiaggia'},
  {e:'⛺',k:'camping vacanza'},{e:'🏔️',k:'montagna escursione'},
  {e:'🗺️',k:'viaggio tour'},{e:'🎒',k:'zaino vacanza'},
  {e:'🏨',k:'hotel albergo soggiorno'},{e:'🗼',k:'turismo viaggio'},
  {e:'🌴',k:'vacanza tropici'},{e:'🎡',k:'parco divertimenti'},
  // Sport & Fitness
  {e:'⚽',k:'calcio sport'},{e:'🏀',k:'basket sport'},
  {e:'🎾',k:'tennis sport'},{e:'🏊',k:'nuoto piscina sport'},
  {e:'🚴',k:'ciclismo bici sport'},{e:'🏋️',k:'palestra pesi fitness'},
  {e:'⛷️',k:'sci montagna sport invernale'},{e:'🧗',k:'arrampicata sport'},
  {e:'🏄',k:'surf mare sport'},{e:'⛳',k:'golf sport'},
  {e:'🎿',k:'sci sport invernale'},{e:'🥊',k:'boxe sport'},
  // Animali
  {e:'🐶',k:'cane animale domestico'},{e:'🐱',k:'gatto animale domestico'},
  {e:'🐟',k:'pesce acquario animale'},{e:'🐰',k:'coniglio animale'},
  {e:'🐾',k:'veterinario animale cura'},
  // Istruzione
  {e:'✏️',k:'matita scuola istruzione'},{e:'📝',k:'appunti studio'},
  {e:'🔬',k:'scienza laboratorio corso'},{e:'🧮',k:'matematica calcolo'},
  // Generici / Varie
  {e:'📁',k:'cartella generale'},{e:'⭐',k:'preferito speciale'},
  {e:'🔔',k:'abbonamento notifica'},{e:'🌱',k:'ambiente ecologia'},
  {e:'♻️',k:'riciclaggio ambiente'},{e:'🌞',k:'energia solare'},
  {e:'🎪',k:'eventi fiera'},{e:'🏛️',k:'comune burocrazia tasse'},
  {e:'⚖️',k:'legale avvocato tasse'},{e:'🧾',k:'ricevuta scontrino tasse'},
  {e:'📮',k:'posta corrispondenza'},{e:'🖼️',k:'arte quadri arredamento'},
  {e:'🕯️',k:'decorazione casa'},{e:'🧰',k:'attrezzi bricolage'},
  {e:'🪟',k:'finestre casa'},{e:'🚿',k:'bagno idraulico'},
  {e:'📷',k:'foto fotografia hobby'},{e:'🎥',k:'video riprese hobby'},
  {e:'🕹️',k:'gaming videogiochi hobby'},{e:'🧩',k:'hobby passatempo'},
  {e:'🌐',k:'internet web abbonamento'},{e:'☁️',k:'cloud storage servizi'},
  {e:'🔐',k:'sicurezza assicurazione'},
];

function _iconPickerBuild(containerId, currentEmoji) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  wrap.innerHTML = `
    <div class="icon-picker-preview" onclick="_iconPickerToggle('${containerId}')">
      <span id="${containerId}_preview" style="font-size:22px">${currentEmoji}</span>
      <span class="icon-picker-hint">Clicca per cambiare</span>
    </div>
    <div id="${containerId}_panel" class="icon-picker-panel" style="display:none">
      <input type="text" class="form-input" style="margin-bottom:6px"
             placeholder="Cerca icona…" oninput="_iconPickerSearch('${containerId}',this.value)">
      <div id="${containerId}_grid" class="icon-grid"></div>
    </div>`;
  _iconPickerSearch(containerId, '');
}

function _iconPickerToggle(cid) {
  const panel = document.getElementById(cid + '_panel');
  const open = panel.style.display === 'none';
  panel.style.display = open ? '' : 'none';
  if (open) panel.querySelector('input').focus();
}

function _iconPickerSearch(cid, q) {
  const ql = q.toLowerCase().trim();
  const list = ql ? EMOJI_LIST.filter(e => e.k.includes(ql)) : EMOJI_LIST;
  document.getElementById(cid + '_grid').innerHTML =
    list.slice(0, 150).map(e =>
      `<button type="button" class="icon-btn" title="${e.k}"
               onclick="_iconPickerSelect('${cid}','${e.e}')">${e.e}</button>`
    ).join('');
}

function _iconPickerSelect(cid, emoji) {
  document.getElementById('c_icon').value = emoji;
  document.getElementById(cid + '_preview').textContent = emoji;
  document.getElementById(cid + '_panel').style.display = 'none';
}

/* ─── Bridge Java ────── spostato in js/bridge.js ─────────────────────────── */
/* ─── Utils / Chart / fmt / toast ── spostati in js/utils.js ──────────────── */
/* ─── Modal / confirm / titlebar / resize ── spostati in js/ui-shell.js ──── */
/* ─── Router / navigate / renderPage / refreshAfterTxChange ── js/router.js  */
/* ─── Sidebar conti + filtri salvati ── spostati in js/sidebar.js ────────── */

/* ─── DASHBOARD ── spostata in js/pages/dashboard.js ──────────────────────── */

/* ─── TRANSAZIONI ── spostata in js/pages/transactions.js ─────────────────── */
/* ─── CONTI ── spostata in js/pages/accounts.js ───────────────────────────── */

/* ─── BUDGET ── spostata in js/pages/budget.js ────────────────────────────── */

/* ─── PORTAFOGLIO ── spostata in js/pages/portfolio.js ─────────────────────── */

/* ─── RESOCONTI / Analytics ── spostati in js/pages/analytics.js ──────────── */
/* ═══════════════════════════════════════════════════════════════════════════
   IMPOSTAZIONI
═══════════════════════════════════════════════════════════════════════════ */
async function renderSettings() {
  const s = await api.getSettings();
  const pg = document.getElementById('pg-settings');

  const tabs = [
    { id: 'data',        label: '🗄️ Dati'         },
    { id: 'prefs',       label: '🎨 Preferenze'    },
    { id: 'maintenance', label: '🔧 Manutenzione'  },
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
                ${[['dark','🌙 Scuro'],['carta','📜 Carta'],['salvia','🌿 Salvia']].map(([key,label]) => `
                  <button class="btn theme-btn ${(s['appearance.theme']||'dark')===key?'theme-btn-active':''}"
                          onclick="settingsSetTheme('${key}')">${label}</button>
                  <button class="btn btn-ghost btn-icon" title="Duplica e personalizza" onclick="duplicateTheme('${key}')">⧉</button>`).join('')}
              </div>
              ${_customThemes.length ? `
              <div style="border-top:1px solid var(--border);padding-top:8px">
                <div style="font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--txt3);margin-bottom:6px">Personalizzati</div>
                ${_customThemes.map(ct => `
                  <div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--border)">
                    <span style="font-size:13px;flex:1;color:var(--txt)">${ct.name}</span>
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
      </div>` : ''}`,

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
            <tr style="border-bottom:1px solid var(--border-color)">
              <th style="text-align:left;padding:6px 8px;color:var(--text-secondary);font-weight:500">Componente</th>
              <th style="text-align:left;padding:6px 8px;color:var(--text-secondary);font-weight:500">Versione</th>
              <th style="text-align:left;padding:6px 8px;color:var(--text-secondary);font-weight:500">Maven Central</th>
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
                return '<tr style="border-bottom:1px solid var(--border-color)">'
                  + '<td style="padding:7px 8px">' + d.name + '</td>'
                  + '<td style="padding:7px 8px;font-family:monospace">' + (d.ver || '—') + '</td>'
                  + '<td style="padding:7px 8px"><a href="#" onclick="api.openUrl(\'' + url(d) + '\');return false;"'
                  + ' style="color:var(--accent-color);text-decoration:none">' + d.g + ':' + d.a + ' ↗</a></td>'
                  + '</tr>';
              });
              rows.push('<tr>'
                + '<td style="padding:7px 8px">SQLite (native)</td>'
                + '<td style="padding:7px 8px;font-family:monospace">' + (s['_sqlite_version'] || '—') + '</td>'
                + '<td style="padding:7px 8px;color:var(--text-secondary)">embedded in sqlite-jdbc</td>'
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

  pg.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Impostazioni</h1>
    </div>
    <div class="settings-tabs">
      ${tabs.map(t=>`
        <button class="settings-tab ${_settingsTab===t.id?'settings-tab-active':''}"
                onclick="_setSettingsTab('${t.id}')">${t.label}</button>`).join('')}
    </div>
    <div class="settings-wrap">
      ${tabContent[_settingsTab] || ''}
    </div>`;
  if (_settingsTab === 'maintenance') setTimeout(() => { maintLoadInfo(); maintLoadLogInfo(); }, 50);
}

window._setSettingsTab = tab => {
  _settingsTab = tab;
  renderSettings();
};

// ─── Prestazioni ──────────────────────────────────────────────────────────────

window.perfSetEnabled = async (enabled) => {
  _perfEnabled = enabled;
  await api.setPerfEnabled(enabled);
  renderSettings();
};

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
      if (ms == null) return '<span style="color:var(--text-secondary)">—</span>';
      const color = ms < 50 ? 'var(--income)' : ms < 200 ? '#f0a030' : 'var(--expense)';
      return `<span style="color:${color};font-weight:600">${label !== undefined ? label : ms + ' ms'}</span>`;
    };

    wrap.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:12px;font-family:monospace">
        <thead>
          <tr style="border-bottom:1px solid var(--border-color)">
            <th style="text-align:left;padding:5px 8px;color:var(--text-secondary);font-weight:500;white-space:nowrap">Metodo</th>
            <th style="text-align:right;padding:5px 8px;color:var(--text-secondary);font-weight:500">Round-trip</th>
            <th style="text-align:right;padding:5px 8px;color:var(--text-secondary);font-weight:500">Java</th>
            <th style="text-align:right;padding:5px 8px;color:var(--text-secondary);font-weight:500">JCEF</th>
            <th style="text-align:right;padding:5px 8px;color:var(--text-secondary);font-weight:500">Ora</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => {
            const t = new Date(r.ts);
            const hms = `${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}:${String(t.getSeconds()).padStart(2,'0')}`;
            return `<tr style="border-bottom:1px solid var(--border-color)">
              <td style="padding:5px 8px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${r.method}">${r.method}</td>
              <td style="text-align:right;padding:5px 8px">${badge(r.roundMs, r.roundMs + ' ms')}</td>
              <td style="text-align:right;padding:5px 8px">${badge(r.javaMs,  r.javaMs  != null ? r.javaMs  + ' ms' : null)}</td>
              <td style="text-align:right;padding:5px 8px">${badge(r.jcefMs,  r.jcefMs  != null ? r.jcefMs  + ' ms' : null)}</td>
              <td style="text-align:right;padding:5px 8px;color:var(--text-secondary)">${hms}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  } catch(e) {
    wrap.innerHTML = `<span class="settings-hint" style="color:var(--expense)">Errore: ${e}</span>`;
  }
};

window.perfClear = async () => {
  _perfBuf.length = 0;
  await api.clearPerfLog();
  const wrap = document.getElementById('perfTableWrap');
  if (wrap) wrap.innerHTML = '<span class="settings-hint" style="padding:8px 0;display:block">Log svuotato.</span>';
};

// ─── Manutenzione DB ──────────────────────────────────────────────────────────

function fmtBytes(b) {
  if (b == null) return '—';
  b = Number(b);
  if (b < 1024)       return b + ' B';
  if (b < 1024*1024)  return (b/1024).toFixed(1) + ' KB';
  return (b/1024/1024).toFixed(2) + ' MB';
}

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


// ─── Manutenzione log ────────────────────────────────────────────────────────

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

window.maintUpdateLogCutoff = () => {
  const v = document.getElementById('logCutoffSelect').value;
  document.getElementById('logCutoffDate').style.display = v === 'custom' ? '' : 'none';
};

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

window._clearAppLog = async () => {
  const ok = await confirm('Pulisci log Java', 'Eliminare il contenuto di app.log?');
  if (!ok) return;
  await callJava('clearAppLog', {});
  toast('Log Java eliminato', 'success');
};

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
    '--border':'#30363d','--accent':'#58a6ff','--accent2':'#00d4aa',
    '--income':'#3fb950','--expense':'#f85149','--warn':'#d29922',
    '--txt':'#e6edf3','--txt2':'#8b949e','--txt3':'#6e7681',
  },
  carta: {
    '--bg':'#ece5d8','--bg2':'#f4ede0','--bg3':'#e0d8cb','--bg4':'#d4ccbf',
    '--border':'#c2b8a6','--accent':'#8b5a18','--accent2':'#2e6e58',
    '--income':'#1e6b2e','--expense':'#b52a1a','--warn':'#7a5600',
    '--txt':'#241a08','--txt2':'#5c4a2c','--txt3':'#8a7860',
  },
  salvia: {
    '--bg':'#d8e4da','--bg2':'#e4ede6','--bg3':'#c8d5ca','--bg4':'#baccbe',
    '--border':'#a8b8aa','--accent':'#2563eb','--accent2':'#0891b2',
    '--income':'#15803d','--expense':'#dc2626','--warn':'#b45309',
    '--txt':'#0d1f12','--txt2':'#2d4a32','--txt3':'#5a7a60',
  },
  sintesi: {
    '--bg':'#0d0618','--bg2':'#140a28','--bg3':'#1c1038','--bg4':'#261548',
    '--border':'#3a2060','--accent':'#ff2d78','--accent2':'#00f5c0',
    '--income':'#39e87a','--expense':'#ff5040','--warn':'#ffd040',
    '--txt':'#f0e8ff','--txt2':'#b090d8','--txt3':'#705888',
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

async function _loadCustomThemes() {
  const s = await api.getSettings();
  try { _customThemes = JSON.parse(s['appearance.custom_themes'] || '[]'); } catch { _customThemes = []; }
}
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
function _clearCustomVars() {
  _ALL_THEME_VARS.forEach(v => document.documentElement.style.removeProperty(v));
  document.documentElement.style.removeProperty('--radius');
  _FONT_SIZE_VARS.forEach(({ key }) => document.documentElement.style.removeProperty(key));
  document.body.style.fontFamily = '';
}

function applyTheme(theme) {
  _activeThemeKey = theme || 'dark';
  _clearCustomVars();
  if (theme && theme.startsWith('c:')) {
    const ct = _customThemes.find(t => t.id === theme.slice(2));
    document.documentElement.dataset.theme = '';
    if (ct) _applyCustomVars(ct);
  } else {
    const valid = ['carta', 'salvia'];
    document.documentElement.dataset.theme = valid.includes(theme) ? theme : '';
  }
  _updateThemeBtn();
}

async function settingsSetTheme(theme) {
  applyTheme(theme);
  await api.setSetting('appearance.theme', theme);
  _updateThemeBtn();
  renderSettings();
}

const _THEME_CYCLE = [
  { key: '',      icon: '🌙', label: 'Scuro' },
  { key: 'carta', icon: '📜', label: 'Carta' },
  { key: 'salvia', icon: '🌿', label: 'Salvia' },
];

function _fullThemeCycle() {
  const customs = _customThemes.map(ct => ({ key: 'c:' + ct.id, icon: '🎨', label: ct.name }));
  return [..._THEME_CYCLE, ...customs];
}

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

async function _toggleTheme() {
  const cycle = _fullThemeCycle();
  const activeKey = _activeThemeKey || '';
  const currIdx = cycle.findIndex(x => x.key === activeKey);
  const next = cycle[(Math.max(currIdx, 0) + 1) % cycle.length];
  await settingsSetTheme(next.key || 'dark');
}

/* ─── Theme editor ───────────────────────────────────────────────────────── */
function duplicateTheme(sourceKey) {
  let base;
  if (sourceKey.startsWith('c:')) {
    const ct = _customThemes.find(t => t.id === sourceKey.slice(2));
    if (!ct) return;
    base = { ...ct, id: Date.now().toString(36), name: ct.name + ' (copia)', vars: { ...ct.vars } };
  } else {
    const names = { dark: 'Scuro', carta: 'Carta', salvia: 'Salvia', sintesi: 'Sintesi' };
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
      <span>🎨 ${_teWorkingTheme.name}</span>
      <button class="btn btn-ghost btn-icon" onclick="closeThemeEditor(false)" title="Chiudi senza salvare">✕</button>
    </div>
    <div id="teBody">
      <div class="te-prop-row" style="padding-top:2px">
        <label>Nome</label>
        <input class="form-control" id="teName" value="${_teWorkingTheme.name}" placeholder="Nome tema" style="flex:1">
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

async function _deleteCustomTheme(id) {
  _customThemes = _customThemes.filter(t => t.id !== id);
  await _saveCustomThemesToDB();
  if (_activeThemeKey === 'c:' + id) await settingsSetTheme('dark');
  const panel = document.getElementById('tePanel');
  if (panel) panel.classList.remove('open');
  if (currentPage === 'settings') renderSettings();
}

/* ─── Shortcuts overlay ──────────────────────────────────────────────────── */
const _NAV_SHORTCUTS = [
  { key:'1', page:'dashboard',    label:'Dashboard' },
  { key:'2', page:'accounts',     label:'Conti' },
  { key:'3', page:'transactions', label:'Transazioni' },
  { key:'4', page:'budgets',      label:'Budget' },
  { key:'5', page:'scheduled',    label:'Pianificate' },
  { key:'6', page:'portfolio',    label:'Portfolio' },
  { key:'7', page:'analytics',    label:'Analisi' },
  { key:'8', page:'reports',      label:'Report' },
  { key:'9', page:'settings',     label:'Impostazioni' },
];

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

function closeShortcutsHelp() {
  document.getElementById('shortcutsOverlay').classList.remove('open');
}

async function settingsSetAccFilter(favOnly) {
  _accFavoritesOnly = favOnly;
  await api.setSetting('accounts.favorites_only', favOnly ? '1' : '0');
  renderSettings();
  updateSidebar();
}

async function settingsSetAutostart(value) {
  await api.setSetting('autostart.enabled', value);
  renderSettings();
}

async function settingsSetBackup(key, value) {
  await api.setSetting('backup.' + key, value);
  renderSettings();
}

async function settingsSetHttp(key, value) {
  await api.setSetting('http.' + key, value);
  renderSettings();
}

async function settingsChooseBackupDir() {
  const res = await api.chooseBackupDir();
  if (res.cancelled) return;
  await api.setSetting('backup.dir', res.path);
  renderSettings();
}

async function settingsChooseAttachmentsDir() {
  const res = await api.chooseAttachmentsDir();
  if (res.cancelled) return;
  await api.setSetting('attachments.dir', res.path);
  renderSettings();
}

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
                descHtml = c.desc.split(' · ').map(part => {
                  const colon = part.indexOf(':');
                  if (colon === -1) return `<span style="color:var(--txt3)">${part}</span>`;
                  const key = part.slice(0, colon);
                  const val = part.slice(colon + 1);
                  if (key === 'importo') return `<span style="color:var(--txt3)">${key}:</span><span style="color:var(--income);font-weight:700"> ${val}</span>`;
                  if (key === 'categoria') return `<span style="color:var(--txt3)">${key}:</span><span style="color:var(--accent);font-weight:600"> ${val}</span>`;
                  return `<span style="color:var(--txt3)">${part}</span>`;
                }).join('<span style="color:var(--border)"> · </span>');
              }
              return `<tr class="bak-detail-row ${detailId}" style="background:var(--bg3)">
                <td colspan="4" style="padding:3px 8px 3px 24px;font-size:11px;color:var(--txt2)">
                  <span style="color:var(--txt3);margin-right:6px">${c.time}</span>
                  <strong>${c.op}</strong>
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

async function settingsConfirmRestore(path, displayTs) {
  const ok = await confirm('Ripristina backup', `Ripristinare il backup del <strong>${displayTs}</strong>?<br><br>Il database corrente verrà archiviato nella cartella backup prima di procedere.`);
  if (!ok) return;
  const container = document.getElementById('backupRestoreList');
  if (container) container.innerHTML = '<span class="settings-hint">⏳ Ripristino in corso...</span>';
  try {
    const res = await api.restoreBackup(path);
    openModal('✅ Ripristino completato',
      `<p style="color:var(--txt2);line-height:1.6">Database precedente archiviato in:<br><code style="font-size:11px">${res.archived}</code><br><br>L'applicazione verrà ricaricata.</p>`,
      () => { closeModal(); location.reload(); }, 'Ok', 'btn-primary');
  } catch(e) {
    if (container) container.innerHTML = `<span class="settings-hint" style="color:var(--expense)">❌ ${e.message}</span>`;
  }
}

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

/* ─── CATEGORIE ── spostata in js/pages/categories.js ─────────────────────── */
/* ─── TAG ────── spostato in js/pages/tags.js ─────────────────────────────── */

/* ─── PERIODI PERSONALIZZATI ── spostato in js/pages/ranges.js ────────────── */

/* ─── BUDGET VS PIANIFICATE ── spostata in js/pages/budget.js ─────────────── */

/* ═══════════════════════════════════════════════════════════════════════════
   INIT — notices
═══════════════════════════════════════════════════════════════════════════ */
const _noticeData = []; // {type:'telefono'|'overdue'|'forecast'|'unverified', list}
let _noticeDelay = 0; // stagger automatico tra notice successive

/** Chiamata quando l'app torna visibile dal tray.
 *  Invalida i cache JS (il DB su OneDrive potrebbe essere cambiato),
 *  ricarica la pagina corrente e ricontrolla tutte le scadenze/notifiche. */
async function onTrayRestore() {
  // Invalida cache in-session: il DB potrebbe essere stato sincronizzato da Android
  api._invalidateAccounts();
  api._invalidateCategories();
  api._invalidateTags();
  // Ricarica la pagina con dati freschi
  await renderPage(currentPage);
  // Azzera le notice stale e ricontrolla tutto da zero
  _noticeData.length = 0;
  _noticeDelay = 0;
  try {
    const daTelefono = await api.getTransactionsWithTag('phone');
    if (daTelefono.length) showDaTelefonoNotice(daTelefono);
  } catch(e) {}
  try {
    const overdue = await api.getOverdue();
    if (overdue.length) showOverdueNotice(overdue);
  } catch(e) {}
  try {
    const dueToday = await api.getDueToday();
    if (dueToday.length) showDueTodayNotice(dueToday);
  } catch(e) {}
  try {
    const forecasts = await api.getForecasts();
    const ready = forecasts.filter(f => f.is_ready === 1 && !f.archived);
    if (ready.length) showForecastReadyNotice(ready);
  } catch(e) {}
  try {
    const unverified = await api.getTransactions({ reconciled: 0, sort_desc: true });
    if (unverified.length) showUnverifiedNotice(unverified);
  } catch(e) {}
  updateNoticeBtn();
}

// ─── Toggle DB remoto (solo modalità browser/WebServer) ──────────────────────

async function _updateWebDbToggle() {
  const el = document.getElementById('webDbToggle');
  if (!el) return;
  let open = false;
  try { const r = await callJava('dbStatus', {}); open = !!r.open; } catch(e) {}
  el.innerHTML = open
    ? `<div class="web-db-bar web-db-open">
         <span class="web-db-dot"></span>
         <span>Database aperto</span>
         <button class="btn btn-xs btn-ghost" onclick="_webDbClose()" style="margin-left:auto">Chiudi</button>
       </div>`
    : `<div class="web-db-bar web-db-closed">
         <span class="web-db-dot"></span>
         <span>Database chiuso</span>
         <button class="btn btn-xs btn-primary" onclick="_webDbOpen()" style="margin-left:auto">Apri</button>
       </div>`;
}

async function _webDbOpen() {
  await callJava('dbOpen', {});
  await _updateWebDbToggle();
  api._invalidateAccounts();
  api._invalidateCategories();
  api._invalidateTags();
  await updateSidebar();
  await renderPage(currentPage);
}

async function _webDbClose() {
  await callJava('dbClose', {});
  await _updateWebDbToggle();
}

function _showNotice(className, html, onHeadClick) {
  const delay = _noticeDelay;
  _noticeDelay += 400;
  setTimeout(() => { _noticeDelay = Math.max(0, _noticeDelay - 400); }, delay + 500);
  setTimeout(() => {
    const el = document.createElement('div');
    el.className = 'overdue-notice' + (className ? ' ' + className : '');
    el.innerHTML = html;
    document.getElementById('noticeStack').appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.querySelector('.overdue-notice-progress').style.transition = 'width 8s linear';
      el.querySelector('.overdue-notice-progress').style.width = '0%';
    }));
    setTimeout(() => el.classList.add('fade-out'), 7800);
    setTimeout(() => el.remove(), 8500);
    el.querySelector('.overdue-notice-head').addEventListener('click', e => {
      if (!e.target.closest('button')) onHeadClick();
    });
  }, delay);
}

function updateNoticeBtn() {
  const btn = document.getElementById('noticeBtn');
  if (!btn) return;
  if (_noticeData.length === 0) {
    btn.innerHTML = '✓';
    btn.className = '';
    btn.title = 'Nessuna notifica';
  } else {
    const total = _noticeData.reduce((s, n) => s + n.list.length, 0);
    btn.innerHTML = `🔔<span class="notice-badge">${total}</span>`;
    btn.className = 'has-notices';
    btn.title = `${total} notific${total===1?'a':'he'} — clicca per rivedere`;
  }
}

function replayNotices() {
  if (!_noticeData.length) return;
  _noticeData.forEach(n => {
    if (n.type === 'telefono') showDaTelefonoNotice(n.list, false);
    else if (n.type === 'overdue') showOverdueNotice(n.list, false);
    else if (n.type === 'duetoday') showDueTodayNotice(n.list, false);
    else if (n.type === 'forecast') showForecastReadyNotice(n.list, false);
    else if (n.type === 'unverified') showUnverifiedNotice(n.list, false);
  });
}

function showDaTelefonoNotice(list, save=true) {
  if (save) _noticeData.push({type:'telefono', list});
  _showNotice('notice-telefono', `
    <div class="overdue-notice-head">
      <span>📱 ${list.length} transazion${list.length===1?'e':'i'} da telefono da controllare</span>
      <button onclick="this.closest('.overdue-notice').remove()">✕</button>
    </div>
    <div class="overdue-notice-body">
      ${list.slice(0,4).map(t=>`<div class="overdue-row">
        <span>${fmt.date(t.date)}</span>
        <span class="td-main">${t.description||'-'}</span>
        <span class="amount-${t.type}">${t.type==='expense'?'-':''}${fmt.currency(t.amount)}</span>
      </div>`).join('')}
      ${list.length>4?`<div class="overdue-more">+ altre ${list.length-4}…</div>`:''}
    </div>
    <div class="overdue-notice-bar"><div class="overdue-notice-progress"></div></div>`,
    () => navigate('transactions'));
}

function showForecastReadyNotice(list, save=true) {
  if (save) _noticeData.push({type:'forecast', list});
  _showNotice('', `
    <div class="overdue-notice-head">
      <span>🔮 ${list.length} previsione${list.length===1?' pronta':' pronte'} da analizzare</span>
      <button onclick="this.closest('.overdue-notice').remove()">✕</button>
    </div>
    <div class="overdue-notice-body">
      ${list.slice(0,4).map(f=>`<div class="overdue-row">
        <span>${fmt.date(f.forecast_date)}</span>
        <span class="td-main">Saldo previsto: ${fmt.currency(f.projected_balance)}</span>
      </div>`).join('')}
      ${list.length>4?`<div class="overdue-more">+ altre ${list.length-4}…</div>`:''}
    </div>
    <div class="overdue-notice-bar"><div class="overdue-notice-progress"></div></div>`,
    () => navigate('forecasts'));
}

function showOverdueNotice(list, save=true) {
  if (save) _noticeData.push({type:'overdue', list});
  _showNotice('', `
    <div class="overdue-notice-head">
      <span>⚠️ ${list.length} transazion${list.length===1?'e pianificata scaduta':'i pianificate scadute'}</span>
      <button onclick="this.closest('.overdue-notice').remove()">✕</button>
    </div>
    <div class="overdue-notice-body">
      ${list.slice(0,4).map(u=>`<div class="overdue-row">
        <span>${fmt.date(u.date)}</span>
        <span class="td-main">${u.description||'-'}</span>
        <span class="amount-${u.type}">${u.type==='expense'?'-':''}${fmt.currency(u.amount)}</span>
      </div>`).join('')}
      ${list.length>4?`<div class="overdue-more">+ altri ${list.length-4}…</div>`:''}
    </div>
    <div class="overdue-notice-bar"><div class="overdue-notice-progress"></div></div>`,
    () => { schedTab = 'lista'; navigate('scheduled'); });
}

function showDueTodayNotice(list, save=true) {
  if (save) _noticeData.push({type:'duetoday', list});
  _showNotice('notice-duetoday', `
    <div class="overdue-notice-head">
      <span>📅 ${list.length} transazion${list.length===1?'e pianificata':'i pianificate'} da inserire oggi</span>
      <button onclick="this.closest('.overdue-notice').remove()">✕</button>
    </div>
    <div class="overdue-notice-body">
      ${list.slice(0,4).map(u=>`<div class="overdue-row">
        <span class="td-main">${u.description||'-'}</span>
        <span class="amount-${u.type}">${u.type==='expense'?'-':''}${fmt.currency(u.amount)}</span>
      </div>`).join('')}
      ${list.length>4?`<div class="overdue-more">+ altre ${list.length-4}…</div>`:''}
    </div>
    <div class="overdue-notice-bar"><div class="overdue-notice-progress"></div></div>`,
    () => { schedTab = 'lista'; navigate('scheduled'); });
}

function showUnverifiedNotice(list, save=true) {
  if (save) _noticeData.push({type:'unverified', list});
  _showNotice('notice-unverified', `
    <div class="overdue-notice-head">
      <span>🔍 ${list.length} transazion${list.length===1?'e':'i'} da verificare</span>
      <button onclick="this.closest('.overdue-notice').remove()">✕</button>
    </div>
    <div class="overdue-notice-body">
      ${list.slice(0,4).map(t=>`<div class="overdue-row">
        <span>${fmt.date(t.date)}</span>
        <span class="td-main">${t.description||'-'}</span>
        <span class="amount-${t.type}">${t.type==='expense'?'-':''}${fmt.currency(t.amount)}</span>
      </div>`).join('')}
      ${list.length>4?`<div class="overdue-more">+ altre ${list.length-4}…</div>`:''}
    </div>
    <div class="overdue-notice-bar"><div class="overdue-notice-progress"></div></div>`,
    () => { txFilters = { reconciled: 0, range: 'all' }; navigate('transactions'); });
}

/* ─── Chart.js global font (allineato al body Segoe UI) ──────────────────── */
Chart.defaults.font.family = "'Segoe UI', system-ui, sans-serif";
Chart.defaults.font.size   = 13;

function _initGlobalTooltip() {
  if (_initGlobalTooltip._done) return;
  _initGlobalTooltip._done = true;

  const tt = document.createElement('div');
  tt.id = 'dash-tooltip';
  document.body.appendChild(tt);

  let timer = null, cur = null, mx = 0, my = 0;

  const _place = () => {
    let x = mx + 16, y = my + 16;
    if (x + tt.offsetWidth  > window.innerWidth  - 8) x = mx - tt.offsetWidth  - 8;
    if (y + tt.offsetHeight > window.innerHeight - 8) y = my - tt.offsetHeight - 8;
    tt.style.left = x + 'px';
    tt.style.top  = y + 'px';
  };
  const _hide = () => { clearTimeout(timer); cur = null; tt.style.display = 'none'; };

  document.addEventListener('mouseover', e => {
    mx = e.clientX; my = e.clientY;
    const el = e.target.closest('[data-tt-cat]');
    if (el === cur) return;
    cur = el;
    clearTimeout(timer);
    tt.style.display = 'none';
    if (!el) return;
    timer = setTimeout(() => {
      const isOver = el.dataset.ttOver === '1';
      const l2     = el.dataset.ttL2 || 'Reale';
      tt.innerHTML =
        `<div class="tt-name">${el.dataset.ttCat}</div>` +
        `<div class="tt-row"><span class="tt-label">Budget</span><span class="tt-val">${el.dataset.ttBudget}</span></div>` +
        `<div class="tt-row"><span class="tt-label">${l2}</span><span class="tt-val">${el.dataset.ttActual}</span></div>` +
        `<div class="tt-row tt-rem${isOver ? ' over' : ''}"><span class="tt-label">Rimasto</span><span class="tt-val">${el.dataset.ttRem}</span></div>`;
      tt.style.display = 'block';
      _place();
    }, 300);
  });

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    if (tt.style.display === 'block') _place();
  });

  document.addEventListener('mouseout', e => {
    if (!e.relatedTarget || !e.relatedTarget.closest('[data-tt-cat]')) _hide();
  });
}

async function init() {
  _initGlobalTooltip();
  // Inizializza icone Lucide nella sidebar
  if (typeof lucide !== 'undefined') lucide.createIcons();

  // Modalità browser (non JCEF): nascondi titlebar desktop, mostra toggle DB
  const _isBrowser = typeof window.cefQuery !== 'function';
  if (_isBrowser) {
    const tb = document.getElementById('titlebar');
    if (tb) tb.style.display = 'none';
    const tog = document.getElementById('webDbToggle');
    if (tog) tog.style.display = '';
  }
  // Nascondo gli handle se si parte massimizzato
  const {maximized} = await api.isMaximized();
  document.querySelectorAll('.rh').forEach(el => el.style.display = maximized ? 'none' : '');
  // Carica preferenze persistenti (non richiedono DB)
  const s = await api.getSettings();
  await _loadCustomThemes();
  if (s['appearance.theme']) applyTheme(s['appearance.theme']);
  if (s['accounts.favorites_only']) _accFavoritesOnly = s['accounts.favorites_only'] === '1';
  if (s['accounts.type_order']) { try { _accTypeOrder = JSON.parse(s['accounts.type_order']); } catch(e) {} }
  if (s['proj.range'])   _projRange  = s['proj.range'];
  if (s['proj.months'])  _projMonths = parseInt(s['proj.months']) || 6;
  if (s['proj.mode'])    _projMode   = s['proj.mode'];
  if (s['cf.range'])     _cfRange    = s['cf.range'];
  if (s['cf.months'])    _cfMonths   = parseInt(s['cf.months'])   || 6;
  if (s['tx.range'])              txFilters           = { range: s['tx.range'], ...rangeToFilter(s['tx.range']) };
  if (s['portfolio.active_only']) _portfolioActiveOnly = ['active','closed','all'].includes(s['portfolio.active_only']) ? s['portfolio.active_only'] : (s['portfolio.active_only'] !== '0' ? 'active' : 'all');
  // Modalità browser: aggiorna il toggle e blocca il caricamento dati se DB chiuso
  if (_isBrowser) {
    await _updateWebDbToggle();
    const { open } = await callJava('dbStatus', {}).catch(() => ({ open: false }));
    if (!open) return;
  }

  await updateSidebar();
  await renderDashboard();
  // Notifica transazioni da telefono
  try {
    const daTelefono = await api.getTransactionsWithTag('phone');
    if (daTelefono.length) showDaTelefonoNotice(daTelefono);
  } catch(e) {}
  // Notifica scadute (non bloccante, dopo il render)
  const overdue = await api.getOverdue();
  if (overdue.length) showOverdueNotice(overdue);
  // Notifica pianificate da inserire oggi
  try {
    const dueToday = await api.getDueToday();
    if (dueToday.length) showDueTodayNotice(dueToday);
  } catch(e) {}
  // Notifica previsioni pronte
  try {
    const forecasts = await api.getForecasts();
    const ready = forecasts.filter(f => f.is_ready === 1 && !f.archived);
    if (ready.length) showForecastReadyNotice(ready);
  } catch(e) {}
  // Notifica transazioni da verificare (reconciled=0)
  try {
    const unverified = await api.getTransactions({ reconciled: 0, sort_desc: true });
    if (unverified.length) showUnverifiedNotice(unverified);
  } catch(e) {}
  updateNoticeBtn();
}

/* ─── Log Viewer ── spostato in js/pages/logviewer.js ─────────────────────── */

/* ─── Previsioni ── spostate in js/pages/forecasts.js ─────────────────────── */

// Aspetta che il bridge JCEF sia pronto (in browser mode parte subito)
if (typeof window.cefQuery === 'function') {
  init();
} else if (typeof fetch === 'function') {
  // Modalità browser: bridge HTTP disponibile subito
  init();
} else {
  // cefQuery viene iniettato da JCEF dopo il caricamento della pagina
  const check = setInterval(() => {
    if (typeof window.cefQuery === 'function') {
      clearInterval(check);
      init();
    }
  }, 50);
}
