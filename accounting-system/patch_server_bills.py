import re

with open('server.py', 'r', encoding='utf-8') as f:
    server_py = f.read()

old_logic = '''                            if col_name == 'invoices':
                                cust_name = vendor_name_direct or 'ลูกค้าทั่วไป'
                                row = cursor.execute("SELECT id FROM customers WHERE company_code=? AND name=?", (company_code, cust_name)).fetchone()
                                if row:
                                    party_id = row[0]
                                    if tax_id_direct or address_direct:
                                        cursor.execute("UPDATE customers SET tax_id=COALESCE(?, tax_id), address=COALESCE(?, address) WHERE id=?", (tax_id_direct or None, address_direct or None, party_id))
                                else:
                                    cursor.execute("INSERT INTO customers (company_code, name, tax_id, address) VALUES (?, ?, ?, ?)", (company_code, cust_name, tax_id_direct or None, address_direct or None))
                                    party_id = cursor.lastrowid
                            elif col_name == 'bills':
                                supp_name = vendor_name_direct or 'คู่ค้าทั่วไป'
                                row = cursor.execute("SELECT id FROM suppliers WHERE company_code=? AND name=?", (company_code, supp_name)).fetchone()
                                if row:
                                    party_id = row[0]
                                    if tax_id_direct or address_direct:
                                        cursor.execute("UPDATE suppliers SET tax_id=COALESCE(?, tax_id), address=COALESCE(?, address) WHERE id=?", (tax_id_direct or None, address_direct or None, party_id))
                                else:
                                    cursor.execute("INSERT INTO suppliers (company_code, name, tax_id, address) VALUES (?, ?, ?, ?)", (company_code, supp_name, tax_id_direct or None, address_direct or None))
                                    party_id = cursor.lastrowid
                        else:
                            # If party_id is provided, try to update details if present
                            if col_name == 'invoices' and (tax_id_direct or address_direct):
                                cursor.execute("UPDATE customers SET tax_id=COALESCE(?, tax_id), address=COALESCE(?, address) WHERE id=?", (tax_id_direct or None, address_direct or None, party_id))
                            elif col_name == 'bills' and (tax_id_direct or address_direct):
                                cursor.execute("UPDATE suppliers SET tax_id=COALESCE(?, tax_id), address=COALESCE(?, address) WHERE id=?", (tax_id_direct or None, address_direct or None, party_id))'''


new_logic = '''                            if col_name == 'invoices':
                                cust_name = vendor_name_direct or 'ลูกค้าทั่วไป'
                                row = cursor.execute("SELECT id FROM contacts WHERE company_code=? AND name=?", (company_code, cust_name)).fetchone()
                                if row:
                                    party_id = row[0]
                                    if tax_id_direct or address_direct:
                                        cursor.execute("UPDATE contacts SET tax_id=COALESCE(?, tax_id), address=COALESCE(?, address), is_customer=1 WHERE id=?", (tax_id_direct or None, address_direct or None, party_id))
                                else:
                                    import time
                                    now_ts = int(time.time() * 1000)
                                    cursor.execute("INSERT INTO contacts (company_code, name, tax_id, address, is_customer, is_supplier, created_at, last_updated) VALUES (?, ?, ?, ?, 1, 0, ?, ?)", (company_code, cust_name, tax_id_direct or None, address_direct or None, now_ts, now_ts))
                                    party_id = cursor.lastrowid
                            elif col_name == 'bills':
                                supp_name = vendor_name_direct or 'คู่ค้าทั่วไป'
                                row = cursor.execute("SELECT id FROM contacts WHERE company_code=? AND name=?", (company_code, supp_name)).fetchone()
                                if row:
                                    party_id = row[0]
                                    if tax_id_direct or address_direct:
                                        cursor.execute("UPDATE contacts SET tax_id=COALESCE(?, tax_id), address=COALESCE(?, address), is_supplier=1 WHERE id=?", (tax_id_direct or None, address_direct or None, party_id))
                                else:
                                    import time
                                    now_ts = int(time.time() * 1000)
                                    cursor.execute("INSERT INTO contacts (company_code, name, tax_id, address, is_customer, is_supplier, created_at, last_updated) VALUES (?, ?, ?, ?, 0, 1, ?, ?)", (company_code, supp_name, tax_id_direct or None, address_direct or None, now_ts, now_ts))
                                    party_id = cursor.lastrowid
                        else:
                            # If party_id is provided, try to update details if present
                            if col_name == 'invoices' and (tax_id_direct or address_direct):
                                cursor.execute("UPDATE contacts SET tax_id=COALESCE(?, tax_id), address=COALESCE(?, address), is_customer=1 WHERE id=?", (tax_id_direct or None, address_direct or None, party_id))
                            elif col_name == 'bills' and (tax_id_direct or address_direct):
                                cursor.execute("UPDATE contacts SET tax_id=COALESCE(?, tax_id), address=COALESCE(?, address), is_supplier=1 WHERE id=?", (tax_id_direct or None, address_direct or None, party_id))'''

if old_logic in server_py:
    server_py = server_py.replace(old_logic, new_logic)
    with open('server.py', 'w', encoding='utf-8') as f:
        f.write(server_py)
    print("Patch applied via direct string replacement")
else:
    print("Exact old_logic string not found. Please check spacing.")
