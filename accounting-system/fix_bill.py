import sqlite3, json, sys, time
sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)
conn = sqlite3.connect('database/accounting.db')
cur = conn.cursor()

# 1. Generate new bill number for the new expense (ค่าซักผ้า)
new_bill_id = f'BILL-{int(time.time()*1000) % 100000000:08d}'
print(f'New bill ID for ค่าซักผ้า: {new_bill_id}')

# 2. Update journal entry 31 to use the new bill number
cur.execute("UPDATE journal_entries SET reference=? WHERE id=31 AND company_code='DATA2'", (new_bill_id,))
print(f'Updated JE 31 reference to {new_bill_id}')

# 3. Create a new bill record for JE 31 (ค่าซักผ้า 49257.43)
new_items = json.dumps([{
    "description": "ค่าซักผ้าและทำความสะอาดเวชภัณฑ์",
    "quantity": 1,
    "unitPrice": 49257.43,
    "amount": 49257.43
}])

cur.execute("""
    INSERT INTO bills (id, company_code, date, supplier_id, due_date, status, subtotal, vat_rate, vat_amount, total, tax_withheld, net_payable, items, last_updated)
    VALUES (?, 'DATA2', '2026-05-28', 17, '2026-05-28', 'paid', 49257.43, 7.0, 3448.02, 52705.45, 0.0, 52705.45, ?, ?)
""", (new_bill_id, new_items, int(time.time()*1000)))
print(f'Created new bill {new_bill_id} for ค่าซักผ้า')

# 4. Restore BILL-71511553 to original data (ค่าเช่า 27,000, supplier 15 = บริษัท แอท-ยีนต์)
# Need to find the correct account for ค่าเช่า - from JE 30: account 5101-02 which was lab fees
# Actually JE 30 uses 5101-02 but that's "ค่าแล็บและวัสดุ". The user said first item is "ค่าเช่า" 27,000
# Let me check what account code should be for rent - 5240-00 based on expense_catalog

# For now, restore the bill with correct data from JE 30
original_items = json.dumps([{
    "description": "ค่าเช่า",
    "quantity": 1,
    "unitPrice": 27000.0,
    "amount": 27000.0
}])

cur.execute("""
    UPDATE bills SET 
        date='2026-06-17',
        supplier_id=15,
        due_date='2026-06-17',
        status='paid',
        subtotal=27000.0,
        vat_rate=0.0,
        vat_amount=0.0,
        total=27000.0,
        tax_withheld=0.0,
        net_payable=27000.0,
        items=?,
        last_updated=?
    WHERE id='BILL-71511553' AND company_code='DATA2'
""", (original_items, int(time.time()*1000)))
print(f'Restored BILL-71511553 to ค่าเช่า 27,000')

conn.commit()
conn.close()
print('Done!')
