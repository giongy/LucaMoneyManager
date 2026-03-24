import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:permission_handler/permission_handler.dart';
import '../db/db_helper.dart';
import '../models/account.dart';
import 'add_transaction_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<Account> _accounts = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    final path = await DbHelper.getSavedPath();
    if (path == null) {
      setState(() => _loading = false);
      return;
    }
    await _openAndLoad(path);
  }

  Future<void> _openAndLoad(String path) async {
    setState(() { _loading = true; _error = null; });
    final err = await DbHelper.openDb(path);
    if (err != null) {
      setState(() { _loading = false; _error = err; });
      return;
    }
    await _loadAccounts();
  }

  Future<void> _loadAccounts() async {
    final accounts = await DbHelper.getFavoriteAccounts();
    setState(() { _accounts = accounts; _loading = false; });
  }

  Future<void> _pickDb() async {
    if (await Permission.manageExternalStorage.isDenied) {
      final status = await Permission.manageExternalStorage.request();
      if (!status.isGranted) {
        await openAppSettings();
        return;
      }
    }
    final result = await FilePicker.platform.pickFiles(allowMultiple: false);
    if (result == null || result.files.single.path == null) return;
    final path = result.files.single.path!;
    await DbHelper.savePath(path);
    await _openAndLoad(path);
  }

  Future<void> _openAddTransaction() async {
    if (!DbHelper.isOpen) return;
    final saved = await Navigator.push<bool>(
      context,
      MaterialPageRoute(builder: (_) => const AddTransactionScreen()),
    );
    if (saved == true) await _loadAccounts();
  }

  Color _hexColor(String hex) {
    try {
      return Color(int.parse(hex.replaceFirst('#', '0xFF')));
    } catch (_) {
      return const Color(0xFF58a6ff);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Luca Wallet'),
        actions: [
          IconButton(
            icon: const Icon(Icons.folder_open),
            tooltip: 'Seleziona file DB',
            onPressed: _pickDb,
          ),
          if (DbHelper.isOpen)
            IconButton(
              icon: const Icon(Icons.refresh),
              tooltip: 'Aggiorna',
              onPressed: _loadAccounts,
            ),
        ],
      ),
      body: _buildBody(),
      floatingActionButton: DbHelper.isOpen
          ? FloatingActionButton.extended(
              onPressed: _openAddTransaction,
              icon: const Icon(Icons.add),
              label: const Text('Movimento'),
            )
          : null,
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (!DbHelper.isOpen) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.storage, size: 64, color: Colors.grey),
              const SizedBox(height: 16),
              const Text('Nessun file DB selezionato',
                  style: TextStyle(fontSize: 16)),
              const SizedBox(height: 8),
              const Text(
                'Seleziona il file .db di LucaMoneyManager dalla cartella OneDrive',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey),
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: _pickDb,
                icon: const Icon(Icons.folder_open),
                label: const Text('Seleziona file'),
              ),
            ],
          ),
        ),
      );
    }
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 16),
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              ElevatedButton(
                  onPressed: _pickDb, child: const Text('Cambia file')),
            ],
          ),
        ),
      );
    }
    if (_accounts.isEmpty) {
      return const Center(child: Text('Nessun conto preferito trovato'));
    }
    return RefreshIndicator(
      onRefresh: _loadAccounts,
      child: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: _accounts.length,
        itemBuilder: (_, i) =>
            _AccountCard(account: _accounts[i], hexColor: _hexColor),
      ),
    );
  }
}

class _AccountCard extends StatelessWidget {
  final Account account;
  final Color Function(String) hexColor;

  const _AccountCard({required this.account, required this.hexColor});

  @override
  Widget build(BuildContext context) {
    final isPositive = account.balance >= 0;
    final color = hexColor(account.color);
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: color.withOpacity(0.2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Center(
                child: Text(account.icon,
                    style: const TextStyle(fontSize: 22)),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Text(account.name,
                  style: const TextStyle(
                      fontSize: 16, fontWeight: FontWeight.w500)),
            ),
            Text(
              '${account.balance.toStringAsFixed(2)} ${account.currency}',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: isPositive
                    ? const Color(0xFF3fb950)
                    : const Color(0xFFf85149),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
