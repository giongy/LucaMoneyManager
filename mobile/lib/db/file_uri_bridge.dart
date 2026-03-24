import 'package:flutter/services.dart';

/// Ponte tra Flutter e il codice Kotlin in MainActivity.
/// Gestisce la copia del file da content URI (OneDrive) alla storage privata
/// dell'app, e il write-back dopo ogni modifica.
class FileUriBridge {
  static const _ch = MethodChannel('com.example.luca_wallet/file_uri');

  /// Copia il file indicato dal [contentUri] (content://...) nella cartella
  /// privata dell'app. Restituisce il path assoluto locale.
  static Future<String> copyUriToLocal(String contentUri) async {
    final path = await _ch.invokeMethod<String>(
      'copyUriToLocal',
      {'uri': contentUri},
    );
    if (path == null) throw Exception('copyUriToLocal returned null');
    return path;
  }

  /// Riscrive il file in [localPath] sul [contentUri] originale (es. OneDrive).
  static Future<void> writeLocalBackToUri(
      String localPath, String contentUri) async {
    await _ch.invokeMethod<void>(
      'writeLocalBackToUri',
      {'localPath': localPath, 'uri': contentUri},
    );
  }
}
