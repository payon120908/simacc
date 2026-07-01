import sqlite3, json, sys
sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)
conn = sqlite3.connect('database/accounting.db')
cur = conn.cursor()

# Fix retainedEarningsAccount - remove 4000-00 and 5000-00 from the mapping
cur.execute("SELECT value FROM settings WHERE company_code='DATA2' AND key='balance_sheet_mapping'")
row = cur.fetchone()
if row:
    mapping = json.loads(row[0])
    print('Before retainedEarningsAccount:', mapping.get('retainedEarningsAccount'))
    # Fix: only keep equity account 3500-00, remove income/expense accounts
    mapping['retainedEarningsAccount'] = '3500-00'
    print('After retainedEarningsAccount:', mapping.get('retainedEarningsAccount'))
    cur.execute("UPDATE settings SET value=? WHERE company_code='DATA2' AND key='balance_sheet_mapping'", (json.dumps(mapping),))
    conn.commit()
    print('Fixed successfully!')
else:
    print('Setting not found!')
conn.close()
