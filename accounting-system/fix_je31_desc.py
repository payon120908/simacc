import sqlite3
conn = sqlite3.connect('database/accounting.db')
cur = conn.cursor()

# Fix JE 31 description to use correct bill ID (BILL-94503369 instead of BILL-71511553)
cur.execute("""
    UPDATE journal_entries 
    SET description = REPLACE(description, 'BILL-71511553', 'BILL-94503369')
    WHERE id = 31 AND company_code = 'DATA2'
""")
print(f'Updated {cur.rowcount} journal entry description(s)')

# Verify
cur.execute("SELECT id, date, reference, description FROM journal_entries WHERE company_code='DATA2' AND id IN (30,31)")
rows = cur.fetchall()
print('\n=== JE 30 & 31 after fix ===')
for r in rows:
    print(r)

conn.commit()
conn.close()
print('\nDone!')
