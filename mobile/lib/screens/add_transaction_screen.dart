import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../db/db_helper.dart';
import '../models/account.dart';
import '../models/category.dart';

class AddTransactionScreen extends StatefulWidget {
  const AddTransactionScreen({super.key});

  @override
  State<AddTransactionScreen> createState() => _AddTransactionScreenState();
}

class _AddTransactionScreenState extends State<AddTransactionScreen> {
  final _formKey = GlobalKey<FormState>();
  final _amountCtrl = TextEditingController();
  final _descCtrl = TextEditingController();

  String _type = 'expense';
  DateTime _date = DateTime.now();
  List<Account> _accounts = [];
  List<Category> _categories = [];
  int? _selectedAccountId;
  int? _selectedToAccountId;
  int? _selectedCategoryId;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final accounts = await DbHelper.getAllAccounts();
    final categories = await DbHelper.getCategories(_type);
    setState(() {
      _accounts = accounts;
      _categories = categories;
      if (accounts.isNotEmpty) {
        final fav = accounts.firstWhere(
          (a) => a.isFavorite,
          orElse: () => accounts.first,
        );
        _selectedAccountId = fav.id;
      }
    });
  }

  Future<void> _onTypeChanged(String type) async {
    final List<Category> categories =
        type == 'transfer' ? [] : await DbHelper.getCategories(type);
    setState(() {
      _type = type;
      _categories = categories;
      _selectedCategoryId = null;
      _selectedToAccountId = null;
    });
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(2000),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) setState(() => _date = picked);
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedAccountId == null) {
      _snack('Seleziona un conto');
      return;
    }
    if (_type == 'transfer' && _selectedToAccountId == null) {
      _snack('Seleziona il conto di destinazione');
      return;
    }

    // Controllo conflitto sync
    if (await DbHelper.hasConflict()) {
      if (!mounted) return;
      final proceed = await showDialog<bool>(
        context: context,
        builder: (_) => AlertDialog(
          title: const Text('Attenzione'),
          content: const Text(
              'Il file è stato modificato da un altro dispositivo. Continuare comunque?'),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('Annulla')),
            FilledButton(
                onPressed: () => Navigator.pop(context, true),
                child: const Text('Continua')),
          ],
        ),
      );
      if (proceed != true) return;
      await DbHelper.refreshOpenedAt();
    }

    setState(() => _saving = true);
    try {
      await DbHelper.insertTransaction(
        date: _date,
        amount: double.parse(_amountCtrl.text.replaceAll(',', '.')),
        type: _type,
        categoryId: _selectedCategoryId,
        accountId: _selectedAccountId!,
        toAccountId: _type == 'transfer' ? _selectedToAccountId : null,
        description: _descCtrl.text.trim(),
      );
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      setState(() => _saving = false);
      if (mounted) _snack('Errore: $e');
    }
  }

  void _snack(String msg) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(msg)));
  }

  @override
  void dispose() {
    _amountCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Nuovo movimento'),
        actions: [
          _saving
              ? const Padding(
                  padding: EdgeInsets.all(16),
                  child: SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2)),
                )
              : TextButton(
                  onPressed: _save, child: const Text('Salva')),
        ],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // ── Tipo ───────────────────────────────────────────────────────
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(
                    value: 'expense',
                    label: Text('Uscita'),
                    icon: Icon(Icons.arrow_upward)),
                ButtonSegment(
                    value: 'income',
                    label: Text('Entrata'),
                    icon: Icon(Icons.arrow_downward)),
                ButtonSegment(
                    value: 'transfer',
                    label: Text('Trasferimento'),
                    icon: Icon(Icons.swap_horiz)),
              ],
              selected: {_type},
              onSelectionChanged: (s) => _onTypeChanged(s.first),
            ),
            const SizedBox(height: 20),

            // ── Importo ────────────────────────────────────────────────────
            TextFormField(
              controller: _amountCtrl,
              autofocus: true,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [
                FilteringTextInputFormatter.allow(RegExp(r'[\d.,]'))
              ],
              decoration: const InputDecoration(
                labelText: 'Importo',
                prefixText: '€ ',
                border: OutlineInputBorder(),
              ),
              validator: (v) {
                if (v == null || v.isEmpty) return 'Inserisci un importo';
                final n = double.tryParse(v.replaceAll(',', '.'));
                if (n == null || n <= 0) return 'Importo non valido';
                return null;
              },
            ),
            const SizedBox(height: 16),

            // ── Data ───────────────────────────────────────────────────────
            InkWell(
              onTap: _pickDate,
              borderRadius: BorderRadius.circular(4),
              child: InputDecorator(
                decoration: const InputDecoration(
                  labelText: 'Data',
                  border: OutlineInputBorder(),
                  suffixIcon: Icon(Icons.calendar_today),
                ),
                child: Text(
                  '${_date.day.toString().padLeft(2, '0')}/${_date.month.toString().padLeft(2, '0')}/${_date.year}',
                ),
              ),
            ),
            const SizedBox(height: 16),

            // ── Categoria (non per trasferimento) ──────────────────────────
            if (_type != 'transfer') ...[
              DropdownButtonFormField<int>(
                value: _selectedCategoryId,
                decoration: const InputDecoration(
                  labelText: 'Categoria',
                  border: OutlineInputBorder(),
                ),
                items: _categories
                    .map((c) => DropdownMenuItem(
                          value: c.id,
                          child: Row(children: [
                            Text(c.icon),
                            const SizedBox(width: 8),
                            Text(c.name),
                          ]),
                        ))
                    .toList(),
                onChanged: (v) => setState(() => _selectedCategoryId = v),
              ),
              const SizedBox(height: 16),
            ],

            // ── Conto (Da) ─────────────────────────────────────────────────
            DropdownButtonFormField<int>(
              value: _selectedAccountId,
              decoration: InputDecoration(
                labelText: _type == 'transfer' ? 'Da conto' : 'Conto',
                border: const OutlineInputBorder(),
              ),
              items: _accounts
                  .map((a) => DropdownMenuItem(
                        value: a.id,
                        child: Row(children: [
                          Text(a.icon),
                          const SizedBox(width: 8),
                          Text(a.name + (a.isFavorite ? ' ⭐' : '')),
                        ]),
                      ))
                  .toList(),
              onChanged: (v) => setState(() => _selectedAccountId = v),
            ),

            // ── Conto (A) — solo trasferimento ─────────────────────────────
            if (_type == 'transfer') ...[
              const SizedBox(height: 16),
              DropdownButtonFormField<int>(
                value: _selectedToAccountId,
                decoration: const InputDecoration(
                  labelText: 'A conto',
                  border: OutlineInputBorder(),
                ),
                items: _accounts
                    .where((a) => a.id != _selectedAccountId)
                    .map((a) => DropdownMenuItem(
                          value: a.id,
                          child: Row(children: [
                            Text(a.icon),
                            const SizedBox(width: 8),
                            Text(a.name + (a.isFavorite ? ' ⭐' : '')),
                          ]),
                        ))
                    .toList(),
                onChanged: (v) =>
                    setState(() => _selectedToAccountId = v),
              ),
            ],
            const SizedBox(height: 16),

            // ── Descrizione ────────────────────────────────────────────────
            TextFormField(
              controller: _descCtrl,
              decoration: const InputDecoration(
                labelText: 'Descrizione (opzionale)',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}
