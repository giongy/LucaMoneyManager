#!/usr/bin/env python3
"""
Import CSV transactions into LucaMoneyManager.
- Solo Withdrawal (expense) e Deposit (income) — i Transfer vengono ignorati
- Aggiusta initial_balance per mantenere i saldi attuali INVARIATI
"""

import sqlite3, csv, sys
from datetime import datetime
from collections import defaultdict

DB_PATH  = r"d:\LucaMoneyManager\luca.db"
CSV_PATH = r"d:\LucaMoneyManager\test.csv"   # <-- cambia se necessario

# Mapping manuale per categorie con nome diverso tra CSV e DB
# chiave = nome sub-categoria CSV (minuscolo, senza asterisco)
MANUAL_CAT = {
    'manut./revis./telepass'           : 32,   # Manutenzione/revisione/telepass
    'software/abbon./netflix/amazon'   : 48,   # Software/abbon./Netflix/Amaz.
    'cedole/dividendi'                 : 15,   # Investimenti (income)
    'commissioni/spese/tasse'          : 68,   # Spese/tasse/commissioni bancarie
    'stipendio luca'                   : 13,   # Stipendio
    'stipendio sonia'                  : 13,   # Stipendio
    'visita specialistica'             : 21,   # visita specialitica (typo in DB)
    'vacanza estiva'                   : 61,   # Vacanza Estiva (sotto Viaggi)
}

# Normalizza la macro-categoria CSV → nome parent nel DB
PARENT_NORM = {
    'famiglia, noi' : 'famiglia-noi',
    'casa+tutto'    : 'casa + tutto',
    'hobby-sw-hw'   : 'hobby-sw-hw',
    'vacanze'       : 'viaggi',
    'investimenti'  : 'entrate',
}

def parse_date(s):
    return datetime.strptime(s.strip(), "%d/%m/%Y").strftime("%Y-%m-%d")

def norm_parent(macro):
    m = macro.lower().strip()
    return PARENT_NORM.get(m, m)

def find_cat(cat_str, cat_by_both, cat_by_sub):
    if ':' in cat_str:
        macro, sub = cat_str.split(':', 1)
    else:
        macro, sub = cat_str, cat_str
    sub_n   = sub.strip().lower().lstrip('*')
    macro_n = norm_parent(macro.strip())

    if sub_n in MANUAL_CAT:
        return MANUAL_CAT[sub_n]
    key = (macro_n, sub_n)
    if key in cat_by_both:
        return cat_by_both[key]
    matches = cat_by_sub.get(sub_n, [])
    if len(matches) == 1:
        return matches[0]
    return None   # non trovata

def main():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # Carica conti (case-insensitive)
    cur.execute("SELECT id, name FROM accounts")
    acc_by_name = {r['name'].lower(): r['id'] for r in cur.fetchall()}

    # Carica categorie
    cur.execute("""SELECT c.id, c.name, p.name as parent
                   FROM categories c LEFT JOIN categories p ON c.parent_id=p.id""")
    cat_by_both = {}
    cat_by_sub  = defaultdict(list)
    for c in cur.fetchall():
        sub_n = c['name'].lower().strip().lstrip('*')
        par_n = (c['parent'] or '').lower().strip()
        cat_by_both[(par_n, sub_n)] = c['id']
        cat_by_sub[sub_n].append(c['id'])

    # Leggi CSV, solo Withdrawal e Deposit
    with open(CSV_PATH, encoding='utf-8-sig') as f:
        rows = [r for r in csv.DictReader(f) if r['Tipo'] in ('Withdrawal', 'Deposit')]

    unmatched_acc = set()
    unmatched_cat = {}   # cat_str -> conteggio
    to_import     = []
    account_net   = defaultdict(float)   # acc_id -> delta netto (+ = entrate, - = uscite)

    for row in rows:
        acc_name = row['Conto'].strip()
        acc_id   = acc_by_name.get(acc_name.lower())
        if acc_id is None:
            unmatched_acc.add(acc_name)
            continue

        cat_str = row['Categoria'].strip()
        cat_id  = find_cat(cat_str, cat_by_both, cat_by_sub)
        if cat_id is None:
            unmatched_cat[cat_str] = unmatched_cat.get(cat_str, 0) + 1

        amount  = abs(float(row['Importo']))
        tx_type = 'income' if row['Tipo'] == 'Deposit' else 'expense'
        date    = parse_date(row['Data'])

        ben  = (row['Beneficiario'] or '').strip()
        note = (row['Note']         or '').strip()
        parts = []
        if ben and ben.lower() != 'sconosciuta':
            parts.append(ben)
        if note:
            parts.append(note)
        description = ' - '.join(parts)

        to_import.append({
            'date': date, 'type': tx_type, 'amount': amount,
            'account_id': acc_id, 'category_id': cat_id,
            'description': description
        })
        account_net[acc_id] += amount if tx_type == 'income' else -amount

    # ── Report ──────────────────────────────────────────────────────────────────
    print(f"\n{'='*60}")
    print(f"  Transazioni da importare : {len(to_import)}")
    print(f"    Uscite  : {sum(1 for t in to_import if t['type']=='expense')}")
    print(f"    Entrate : {sum(1 for t in to_import if t['type']=='income')}")

    if unmatched_acc:
        print(f"\n⚠  Conti NON trovati nel DB (righe saltate):")
        for a in sorted(unmatched_acc):
            print(f"     - {a}")

    if unmatched_cat:
        print(f"\n⚠  Categorie NON trovate (importate senza categoria):")
        for c, n in sorted(unmatched_cat.items()):
            print(f"     - {c}  ({n} tx)")

    print(f"\n  Aggiustamento saldi (initial_balance) per mantenere saldi invariati:")
    for acc_id in sorted(account_net, key=lambda x: acc_by_name.get(
            next(k for k,v in acc_by_name.items() if v==x), '')):
        delta = account_net[acc_id]
        cur.execute("SELECT name, initial_balance FROM accounts WHERE id=?", (acc_id,))
        a = cur.fetchone()
        print(f"     {a['name']:28s} {a['initial_balance']:10.2f} → {a['initial_balance']-delta:10.2f}  (Δ {delta:+.2f})")

    print(f"\n{'='*60}")
    confirm = input("  Procedere con l'importazione? (s/N): ")
    if confirm.strip().lower() != 's':
        print("  Annullato.")
        conn.close()
        return

    # ── Import ──────────────────────────────────────────────────────────────────
    for tx in to_import:
        cur.execute("""
            INSERT INTO transactions
                (date, type, amount, account_id, category_id, description, reconciled, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'))
        """, (tx['date'], tx['type'], tx['amount'],
              tx['account_id'], tx['category_id'], tx['description']))

    for acc_id, delta in account_net.items():
        cur.execute(
            "UPDATE accounts SET initial_balance = initial_balance - ? WHERE id=?",
            (delta, acc_id))

    conn.commit()
    conn.close()
    print(f"\n  ✓ Importate {len(to_import)} transazioni. Saldi invariati.\n")

if __name__ == '__main__':
    main()
