package com.moneymanager;

import java.sql.SQLException;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Il momento unico di backup e manutenzione: un blocco solo, alla chiusura dell'app o dal
 * pulsante «Backup e manutenzione ora» in Cronologia.
 *
 * <pre>
 *   1. backup    -> .bak, se serve davvero
 *   2. potatura  -> DELETE FROM op_log WHERE ts &lt; taglio   (change_log segue per CASCADE)
 *   3. vacuum    -> solo se lo spazio libero supera la soglia
 * </pre>
 *
 * <p>⚠️ <b>L'ordine backup → potatura, mai l'inverso.</b> Il {@code .bak} conserva così la
 * cronologia <b>intera</b> fino a quell'istante: la storia più vecchia della retention non si
 * perde, si sposta nei backup. È ciò che rende accettabile una finestra corta sul DB vivo.</p>
 *
 * <p>⚠️ <b>La potatura gira anche a backup disattivato.</b> Agganciarla al {@code .bak}
 * significherebbe che spegnendo il backup il giornale cresce all'infinito, in silenzio.</p>
 *
 * <p>⚠️ <b>Ma non gira se un backup richiesto è fallito.</b> Le due regole sopra parlano di
 * backup <i>spento</i>, che è una scelta dell'utente; un backup <i>rotto</i> è un'altra cosa —
 * potare lì vorrebbe dire buttare la storia senza averne messa da parte una copia, e non si
 * torna indietro.</p>
 *
 * <p>Questa classe tiene le <b>regole</b> (l'ordine, le condizioni, cosa succede se un passo
 * fallisce); i <b>meccanismi</b> — come si produce un {@code .bak}, come si ottiene il file in
 * esclusiva per potare e compattare — restano in {@link Database}, che è persistenza.</p>
 *
 * <p>⚠️ La manutenzione <b>non lascia una riga di cronologia</b>, ed è voluto: non è un gesto
 * dell'utente, e il giornale sta dentro il {@code .db} che OneDrive ricarica per intero a ogni
 * scrittura. Il suo resoconto va su {@code app.log}, che non è sincronizzato.</p>
 */
final class Manutenzione {

    /**
     * Quota di pagine libere oltre la quale conviene compattare.
     *
     * <p>⚠️ Il {@code VACUUM} <b>non va fatto a ogni chiusura</b>: riscrive il file intero, cioè
     * un ricaricamento OneDrive completo ogni volta. Cancellare righe non rimpicciolisce il
     * file ma libera pagine che SQLite riusa, quindi in regime il file <b>si stabilizza da
     * sé</b>. Sotto questa soglia compattare costerebbe più di quanto rende.</p>
     */
    private static final double SOGLIA_VACUUM = 0.25;

    /** Giorni di cronologia conservati, se l'impostazione non c'è o non si legge. */
    static final int RETENTION_DEFAULT = 30;

    private final Database db;

    Manutenzione(Database db) { this.db = db; }

    /**
     * Esegue il blocco e ne restituisce il resoconto.
     *
     * @param manuale true se l'ha chiesto l'utente dal pulsante: allora il backup si fa anche
     *                con «backup all'uscita» disattivato — ma <b>sempre e solo se c'è qualcosa
     *                da salvare</b>. ⚠️ Un {@code .bak} identico al precedente non è innocuo:
     *                la rotazione a numero fisso di copie ne butterebbe fuori uno vecchio e
     *                davvero diverso, cioè si perderebbe storia premendo un pulsante che
     *                sembra prudente.
     */
    Map<String, Object> esegui(boolean manuale) {
        return esegui(manuale, -1);
    }

    /**
     * Potatura decisa sul momento: conserva gli ultimi {@code giorni} giorni di cronologia,
     * qualunque cosa dica {@code journal.retention_days}. {@code 0} = via tutto.
     *
     * <p>Serve perché la retention automatica può essere spenta ({@code 0} = non potare mai) e
     * chi la spegne deve comunque poter ripulire quando vuole. Senza questa strada l'unica leva
     * sarebbe cambiare l'impostazione, far girare la manutenzione e rimetterla a posto.</p>
     *
     * <p>⚠️ <b>Passa dallo stesso blocco</b>, backup compreso, e non pota se il backup fallisce.
     * La regola «prima la copia, poi si taglia» non ha eccezioni — meno che mai quando è
     * l'utente a chiedere il taglio, perché è lì che si perde roba senza accorgersene.</p>
     */
    Map<String, Object> pota(int giorni) {
        return esegui(true, Math.max(0, giorni));
    }

    /** @param giorniForzati giorni da conservare, oppure {@code -1} per usare l'impostazione. */
    private Map<String, Object> esegui(boolean manuale, int giorniForzati) {
        long t0 = System.currentTimeMillis();
        Map<String, Object> out = new LinkedHashMap<>();

        // ── 1. backup ────────────────────────────────────────────────────────────
        boolean attivo    = "1".equals(db.getAppSetting("backup.enabled", "0"));
        boolean modifiche = db.hasModifications();
        boolean richiesto = (attivo || manuale) && modifiche;
        boolean riuscito  = true;

        if (richiesto) {
            try {
                out.put("backup", db.backup(db.getAppSetting("backup.dir", ""), db.getBackupMax()));
                db.resetModifications();
            } catch (Exception e) {
                riuscito = false;
                out.put("backup_errore", e.getMessage());
            }
        } else {
            out.put("backup_saltato", !modifiche
                    ? "nessuna modifica da salvare"
                    : "backup all'uscita disattivato");
        }

        // ── 2 e 3. potatura e compattazione ──────────────────────────────────────
        // ⚠️ Due significati diversi di "0" da tenere separati: nelle impostazioni
        // `journal.retention_days = 0` vuol dire «non potare mai», mentre per potaECompatta
        // 0 vuol dire «taglia tutto fino a adesso». La traduzione avviene qui, ed è l'unico
        // punto in cui avviene: -1 = non potare.
        int impostata = retention();
        int giorni = giorniForzati >= 0 ? giorniForzati
                                        : (impostata > 0 ? impostata : -1);
        out.put("retention_giorni", impostata);
        if (giorniForzati >= 0) out.put("giorni_richiesti", giorniForzati);
        if (!riuscito) {
            out.put("potatura_saltata", "backup fallito: la cronologia non si pota senza una copia");
        } else {
            try {
                out.putAll(db.potaECompatta(giorni, SOGLIA_VACUUM));
            } catch (SQLException e) {
                out.put("potatura_errore", e.getMessage());
            }
        }

        out.put("ms", System.currentTimeMillis() - t0);
        System.err.println("[Manutenzione] " + resoconto(out));
        return out;
    }

    /**
     * Svecchiamento delle transazioni vecchie, con <b>backup obbligatorio prima</b>.
     *
     * <p>Lo svecchiamento è l'unica operazione dell'app che <b>non si può annullare dal
     * giornale</b>: raggruppa migliaia di righe, e registrarle una per una costerebbe centinaia
     * di KB di cronologia. La rete di sicurezza è quindi il {@code .bak}, e se non si riesce a
     * produrlo <b>non si procede</b>.</p>
     *
     * <p>⚠️ Questa guardia stava nel {@code case} del {@code Bridge}, ed è l'esempio che
     * {@code CLAUDE.md} porta di cosa non fare: messa lì proteggeva le sole chiamate che
     * passano dal Bridge, e una seconda via d'ingresso (uno strumento in {@code tools/}, un
     * job) l'avrebbe saltata senza saperlo. Qui sotto invece non la si può aggirare.</p>
     */
    Map<String, Object> svecchia(java.util.List<Integer> ids) throws SQLException {
        String backup;
        try {
            backup = db.backup(db.getAppSetting("backup.dir", ""), db.getBackupMax());
        } catch (Exception e) {
            // Si lancia invece di restituire un campo "error": così l'errore passa dal catch
            // centrale del Bridge, finisce in app.log e incrementa il badge errori. La causa è
            // concatenata per non perdere lo stack del fallimento vero.
            throw new IllegalStateException("Backup pre-operazione fallito: " + e.getMessage(), e);
        }
        Map<String, Object> res = db.archiveTransactions(ids);
        Map<String, Object> out = new LinkedHashMap<>(res);
        out.put("backup", backup);
        return out;
    }

    /** Giorni di retention del giornale: {@code 0} = nessun limite, poto a mano. */
    private int retention() {
        try {
            return Integer.parseInt(db.getAppSetting("journal.retention_days",
                    String.valueOf(RETENTION_DEFAULT)).trim());
        } catch (NumberFormatException e) {
            return RETENTION_DEFAULT;   // valore sporco in app_settings: meglio il default che zero
        }
    }

    /** Una riga sola per {@code app.log}: cosa è stato fatto, davvero. */
    private static String resoconto(Map<String, Object> r) {
        StringBuilder s = new StringBuilder();
        if (r.get("backup") != null)          s.append("backup ").append(r.get("backup"));
        else if (r.get("backup_errore") != null) s.append("BACKUP FALLITO (").append(r.get("backup_errore")).append(")");
        else                                  s.append("nessun backup (").append(r.get("backup_saltato")).append(")");
        if (r.get("potatura_saltata") != null) s.append(" · potatura saltata");
        else if (r.get("potatura_errore") != null) s.append(" · POTATURA FALLITA (").append(r.get("potatura_errore")).append(")");
        else s.append(" · potate ").append(r.getOrDefault("operazioni_potate", 0)).append(" operazioni")
              .append(Boolean.TRUE.equals(r.get("compattato")) ? " · compattato" : "");
        return s.append(" · ").append(r.get("ms")).append(" ms").toString();
    }
}
