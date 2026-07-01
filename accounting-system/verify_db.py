import sqlite3, json
conn = sqlite3.connect('database/accounting.db')
cur = conn.cursor()
cur.execute("SELECT id, date, supplier_id, subtotal, vat_rate, total FROM bills WHERE company_code='DATA2' ORDER BY last_updated DESC LIMIT 5")
rows = cur.fetchall()
print('=== Bills Table ===')
for r in rows:
    print(r)
print()
cur.execute("SELECT id, date, reference, description FROM journal_entries WHERE company_code='DATA2' AND id IN (30,31)")
rows2 = cur.fetchall()
print('=== JE 30 & 31 ===')
for r in rows2:
    print(r)
conn.close()
