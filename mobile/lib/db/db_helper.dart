import 'dart:io';
import 'package:sqflite/sqflite.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/account.dart';
import '../models/category.dart';

class DbHelper {
  static Database? _db;
  static String? _openedAt; // valore di last_modified al momento dell'apertura

  // ── Configurazione percorso ──────────────────────────────────────────────

  static Future<String?> getSavedPath() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('db_path');
  }

  static Future<void> savePath(String path) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('db_path', path);
  }

  // ── Apertura DB ─────────────────────────────────────────────────────────

  /// Restituisce null se OK, oppure il messaggio di errore.
  static String? _path;
  static String? _syncBackPath; // path reale OneDrive, se diverso da _path (cache)

  static Future<String?> openDb(String path) async {
    try {
      if (_db != null && _db!.isOpen) await _db!.close();
      _db = await openDatabase(path);
      _path = path;
      try {
        await _db!.rawQuery('PRAGMA wal_checkpoint(TRUNCATE)');
        await _db!.execute('PRAGMA journal_mode=DELETE');
        await _db!.execute('PRAGMA synchronous=FULL');
      } catch (_) {}
      await _ensureSyncMeta();
      _openedAt = await _readLastModified();
      return null;
    } catch (e) {
      _db = null;
      return 'Errore apertura DB:\n$e\n\nVerifica il percorso e che il file sia disponibile offline su OneDrive.';
    }
  }

  static bool get isOpen => _db != null && _db!.isOpen;

  // ── sync_meta ────────────────────────────────────────────────────────────

  static Future<void> _ensureSyncMeta() async {
    await _db!.execute('''
      CREATE TABLE IF NOT EXISTS sync_meta (
        key   TEXT PRIMARY KEY,
        value TEXT
      )
    ''');
  }

  static Future<String?> _readLastModified() async {
    final rows = await _db!.query(
      'sync_meta',
      where: "key = 'last_modified'",
      limit: 1,
    );
    return rows.isEmpty ? null : rows.first['value'] as String?;
  }

  /// true se il file è stato modificato da un altro dispositivo dopo l'apertura
  static Future<bool> hasConflict() async {
    if (_db == null) return false;
    return await _readLastModified() != _openedAt;
  }

  /// Aggiorna il riferimento locale dopo che l'utente ha scelto di ignorare il conflitto
  static Future<void> refreshOpenedAt() async {
    _openedAt = await _readLastModified();
  }

  // ── Risoluzione path reale OneDrive ──────────────────────────────────────

  /// Dopo il file picker (che può restituire un path di cache),
  /// cerca il file vero in OneDrive e lo usa direttamente.
  /// Se lo trova: apre sqflite dal path reale, nessuna copia necessaria.
  /// Se non lo trova: usa il path cache + copia indietro dopo ogni scrittura.
  static Future<String> resolveRealPath(String pickedPath, String filename) async {
    // Se non sembra un path di cache, usalo com'è
    if (!pickedPath.contains('/cache/') && !pickedPath.contains('file_picker')) {
      _syncBackPath = null;
      return pickedPath;
    }
    // Cerca il file vero in OneDrive
    final real = await _findInOneDrive(filename);
    if (real != null) {
      _syncBackPath = null; // sqflite scrive direttamente sul file reale
      return real;
    }
    // Non trovato: lavora sulla cache e copia indietro dopo le scritture
    _syncBackPath = pickedPath; // non dovrebbe succedere, ma sicurezza
    return pickedPath;
  }

  static Future<String?> _findInOneDrive(String filename) async {
    final roots = [
      '/storage/emulated/0/OneDrive',
      '/storage/emulated/0/OneDrive - Personal',
      '/sdcard/OneDrive',
    ];
    for (final root in roots) {
      final dir = Directory(root);
      if (!await dir.exists()) continue;
      // Controlla la radice
      final direct = File('$root/$filename');
      if (await direct.exists()) return direct.path;
      // Controlla il primo livello di sottocartelle
      try {
        await for (final sub in dir.list(followLinks: false)) {
          if (sub is Directory) {
            final f = File('${sub.path}/$filename');
            if (await f.exists()) return f.path;
          }
        }
      } catch (_) {}
    }
    return null;
  }

  static Future<void> _touchSyncMeta() async {
    final now = DateTime.now().toIso8601String();
    await _db!.insert('sync_meta', {'key': 'last_modified', 'value': now},
        conflictAlgorithm: ConflictAlgorithm.replace);
    await _db!.insert('sync_meta', {'key': 'last_modified_by', 'value': 'android'},
        conflictAlgorithm: ConflictAlgorithm.replace);
    // Chiudi e riapri per forzare flush su disco (WAL checkpoint + fsync)
    // così OneDrive vede il file .db aggiornato
    await _db!.rawQuery('PRAGMA wal_checkpoint(TRUNCATE)');
    await _db!.close();
    // Se stiamo lavorando su una copia cache, copiala sul file reale
    if (_syncBackPath != null && _path != null) {
      try { await File(_path!).copy(_syncBackPath!); } catch (_) {}
    }
    _db = await openDatabase(_syncBackPath ?? _path!);
    _openedAt = now;
  }

  // ── Conti ────────────────────────────────────────────────────────────────

  /// Restituisce i conti preferiti con saldo calcolato (stesso algoritmo del desktop)
  static Future<List<Account>> getFavoriteAccounts() async {
    if (!isOpen) return [];
    final rows = await _db!.rawQuery('''
      SELECT
        a.id, a.name, a.icon, a.color, a.currency, a.initial_balance,
        COALESCE(SUM(
          CASE
            WHEN t.type = 'income'                              THEN  t.amount
            WHEN t.type = 'expense'                             THEN -t.amount
            WHEN t.type = 'transfer' AND t.account_id    = a.id THEN -t.amount
            WHEN t.type = 'transfer' AND t.to_account_id = a.id THEN  t.amount
            ELSE 0
          END
        ), 0) AS movements
      FROM accounts a
      LEFT JOIN transactions t
             ON t.account_id = a.id OR t.to_account_id = a.id
      WHERE a.is_favorite = 1 AND a.is_closed = 0
      GROUP BY a.id
      ORDER BY COALESCE(a.sort_order, 0) ASC, a.name ASC
    ''');
    return rows
        .map((r) => Account(
              id: r['id'] as int,
              name: r['name'] as String,
              icon: (r['icon'] as String?) ?? '🏦',
              color: (r['color'] as String?) ?? '#58a6ff',
              balance: ((r['initial_balance'] as num?) ?? 0).toDouble() +
                  ((r['movements'] as num?) ?? 0).toDouble(),
              currency: (r['currency'] as String?) ?? 'EUR',
              isFavorite: true,
            ))
        .toList();
  }

  /// Tutti i conti aperti (per i dropdown del form)
  static Future<List<Account>> getAllAccounts() async {
    if (!isOpen) return [];
    final rows = await _db!.rawQuery('''
      SELECT id, name, icon, color, currency, is_favorite
      FROM   accounts
      WHERE  is_closed = 0
      ORDER  BY is_favorite DESC, COALESCE(sort_order, 0) ASC, name ASC
    ''');
    return rows
        .map((r) => Account(
              id: r['id'] as int,
              name: r['name'] as String,
              icon: (r['icon'] as String?) ?? '🏦',
              color: (r['color'] as String?) ?? '#58a6ff',
              balance: 0,
              currency: (r['currency'] as String?) ?? 'EUR',
              isFavorite: ((r['is_favorite'] as int?) ?? 0) == 1,
            ))
        .toList();
  }

  // ── Categorie ────────────────────────────────────────────────────────────

  static Future<List<Category>> getCategories(String type) async {
    if (!isOpen) return [];
    final rows = await _db!.query(
      'categories',
      where: 'type = ?',
      whereArgs: [type],
      orderBy: 'name ASC',
    );
    return rows
        .map((r) => Category(
              id: r['id'] as int,
              name: r['name'] as String,
              type: r['type'] as String,
              icon: (r['icon'] as String?) ?? '📁',
              color: (r['color'] as String?) ?? '#58a6ff',
            ))
        .toList();
  }

  // ── Inserimento transazione ───────────────────────────────────────────────

  static Future<int> _getOrCreateTag(String name) async {
    final existing = await _db!.query(
      'tags',
      where: 'name = ?',
      whereArgs: [name],
      limit: 1,
    );
    if (existing.isNotEmpty) return existing.first['id'] as int;
    return _db!.insert('tags', {'name': name, 'color': '#f0883e'});
  }

  static Future<void> insertTransaction({
    required DateTime date,
    required double amount,
    required String type,
    int? categoryId,
    required int accountId,
    int? toAccountId,
    String description = '',
  }) async {
    if (!isOpen) throw Exception('Database non aperto');

    final dateStr =
        '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';

    final tagId = await _getOrCreateTag('DA TELEFONO');

    final txId = await _db!.insert('transactions', {
      'date': dateStr,
      'amount': amount,
      'type': type,
      'category_id': categoryId,
      'account_id': accountId,
      'to_account_id': toAccountId,
      'description': description,
      'reconciled': 0,
    });

    await _db!.insert('transaction_tags', {
      'transaction_id': txId,
      'tag_id': tagId,
    });

    await _touchSyncMeta();
  }
}
