import sqlite3

def migrate_db(db_path):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    # Add columns if not exist
    for col_def in [('payment_date', 'TEXT'), ('payment_account', 'TEXT'), ('vendor_name', 'TEXT'), ('wht_rate', 'REAL DEFAULT 0.00')]:
        try:
            cur.execute(f'ALTER TABLE bills ADD COLUMN {col_def[0]} {col_def[1]}')
            print(f'Added column: {col_def[0]}')
        except Exception as e:
            print(f'Column {col_def[0]}: {e}')
    
    # Backfill vendor_name from suppliers table for existing bills
    cur.execute("""
        UPDATE bills SET vendor_name = (
            SELECT s.name FROM suppliers s 
            WHERE s.id = bills.supplier_id AND s.company_code = bills.company_code
        )
        WHERE vendor_name IS NULL OR vendor_name = ''
    """)
    print(f'Backfilled vendor_name for {cur.rowcount} bills')
    
    # Backfill payment_date = date if not set
    cur.execute("UPDATE bills SET payment_date = date WHERE payment_date IS NULL OR payment_date = ''")
    print(f'Backfilled payment_date for {cur.rowcount} bills')
    
    # Verify
    cur.execute("SELECT id, vendor_name, payment_date, total FROM bills WHERE company_code='DATA2'")
    rows = cur.fetchall()
    print('\n=== Bills after migration ===')
    for r in rows:
        print(dict(r))
    
    conn.commit()
    conn.close()
    print(f'\nMigration done for: {db_path}')

migrate_db('database/accounting.db')
migrate_db('accounting-system-deploy/database/accounting.db')
