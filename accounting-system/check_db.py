import sqlite3, json, sys
sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)
conn = sqlite3.connect('database/accounting.db')
cur = conn.cursor()

print('=== Journal entries referencing BILL-71511553 ===')
cur.execute("SELECT * FROM journal_entries WHERE company_code='DATA2' AND reference='BILL-71511553'")
cur.execute("PRAGMA table_info(journal_entries)")
jecols = [c[1] for c in cur.fetchall()]
print('JE columns:', jecols)

cur.execute("SELECT * FROM journal_entries WHERE company_code='DATA2' AND reference='BILL-71511553'")
je_rows = cur.fetchall()
for je in je_rows:
    print()
    for c, v in zip(jecols, je):
        print(f'  {c}: {v}')
    je_id = je[0]
    print('  -- Journal Items --')
    cur.execute("SELECT * FROM journal_items WHERE journal_entry_id=?", (je_id,))
    for item in cur.fetchall():
        print(f'    {item}')

print()
print('=== Supplier ID 17 ===')
cur.execute("SELECT * FROM suppliers WHERE company_code='DATA2' AND rowid=(SELECT rowid FROM suppliers WHERE company_code='DATA2' LIMIT 1 OFFSET 16)")
# Better approach:
cur.execute("SELECT * FROM suppliers WHERE company_code='DATA2'")
cur.execute("PRAGMA table_info(suppliers)")
scols = [c[1] for c in cur.fetchall()]
cur.execute("SELECT * FROM suppliers WHERE company_code='DATA2'")
for row in cur.fetchall():
    print(row[:4])

conn.close()
