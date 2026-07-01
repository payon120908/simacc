import re

with open('server.py', 'r', encoding='utf-8') as f:
    server_py = f.read()

# 1. Add journal_id to migration for bills
bills_migration_old = '''for col_def in [
    ("payment_date", "TEXT"),
    ("payment_account", "TEXT"),
    ("vendor_name", "TEXT"),
    ("wht_rate", "REAL DEFAULT 0.00"),
    ("tax_id", "TEXT"),
    ("address", "TEXT"),
    ("payments", "TEXT"),
]:'''
bills_migration_new = '''for col_def in [
    ("payment_date", "TEXT"),
    ("payment_account", "TEXT"),
    ("vendor_name", "TEXT"),
    ("wht_rate", "REAL DEFAULT 0.00"),
    ("tax_id", "TEXT"),
    ("address", "TEXT"),
    ("payments", "TEXT"),
    ("journal_id", "TEXT"),
]:'''
server_py = server_py.replace(bills_migration_old, bills_migration_new)

# 2. Add journal_id to migration for invoices
inv_migration_old = '''for col_def in [
    ("customer_name", "TEXT"),
    ("tax_id", "TEXT"),
    ("address", "TEXT"),
    ("wht_rate", "REAL DEFAULT 0.00"),
    ("payment_date", "TEXT"),
    ("payment_account", "TEXT"),
    ("payments", "TEXT"),
]:'''
inv_migration_new = '''for col_def in [
    ("customer_name", "TEXT"),
    ("tax_id", "TEXT"),
    ("address", "TEXT"),
    ("wht_rate", "REAL DEFAULT 0.00"),
    ("payment_date", "TEXT"),
    ("payment_account", "TEXT"),
    ("payments", "TEXT"),
    ("journal_id", "TEXT"),
]:'''
server_py = server_py.replace(inv_migration_old, inv_migration_new)

# 3. In GET /api/bills, return journalId
get_bills_old = '''                            r_dict['taxId'] = r_dict.get('tax_id', '')
                            r_dict['address'] = r_dict.get('address', '')
                            result.append(r_dict)'''
get_bills_new = '''                            r_dict['taxId'] = r_dict.get('tax_id', '')
                            r_dict['address'] = r_dict.get('address', '')
                            r_dict['journalId'] = r_dict.get('journal_id', '')
                            result.append(r_dict)'''
server_py = server_py.replace(get_bills_old, get_bills_new)

# 4. In GET /api/bills/<id>, return journalId
get_bill_old = '''                        r_dict['taxId'] = r_dict.get('tax_id', '')
                        r_dict['address'] = r_dict.get('address', '')
                        send_json(r_dict)'''
get_bill_new = '''                        r_dict['taxId'] = r_dict.get('tax_id', '')
                        r_dict['address'] = r_dict.get('address', '')
                        r_dict['journalId'] = r_dict.get('journal_id', '')
                        send_json(r_dict)'''
server_py = server_py.replace(get_bill_old, get_bill_new)

# 5. In GET /api/invoices, return journalId
get_invs_old = '''                            r_dict['taxId'] = r_dict.get('tax_id', '')
                            r_dict['address'] = r_dict.get('address', '')
                            r_dict['paymentDate'] = r_dict.get('payment_date', r_dict.get('date', ''))
                            r_dict['paymentAccount'] = r_dict.get('payment_account', '')
                            r_dict['amountPaid'] = sum(p.get('amount', 0.0) for p in r_dict['payments']) if r_dict['payments'] else (r_dict['grandTotal'] if r_dict.get('status') == 'paid' else 0.0)
                            r_dict['outstanding'] = r_dict['grandTotal'] - r_dict['amountPaid']
                            result.append(r_dict)'''
get_invs_new = '''                            r_dict['taxId'] = r_dict.get('tax_id', '')
                            r_dict['address'] = r_dict.get('address', '')
                            r_dict['paymentDate'] = r_dict.get('payment_date', r_dict.get('date', ''))
                            r_dict['paymentAccount'] = r_dict.get('payment_account', '')
                            r_dict['amountPaid'] = sum(p.get('amount', 0.0) for p in r_dict['payments']) if r_dict['payments'] else (r_dict['grandTotal'] if r_dict.get('status') == 'paid' else 0.0)
                            r_dict['outstanding'] = r_dict['grandTotal'] - r_dict['amountPaid']
                            r_dict['journalId'] = r_dict.get('journal_id', '')
                            result.append(r_dict)'''
server_py = server_py.replace(get_invs_old, get_invs_new)

# 6. In GET /api/invoices/<id>, return journalId
get_inv_old = '''                        r_dict['taxId'] = r_dict.get('tax_id', '')
                        r_dict['address'] = r_dict.get('address', '')
                        r_dict['paymentDate'] = r_dict.get('payment_date', r_dict.get('date', ''))
                        r_dict['paymentAccount'] = r_dict.get('payment_account', '')
                        r_dict['amountPaid'] = sum(p.get('amount', 0.0) for p in r_dict['payments']) if r_dict['payments'] else (r_dict['grandTotal'] if r_dict.get('status') == 'paid' else 0.0)
                        r_dict['outstanding'] = r_dict['grandTotal'] - r_dict['amountPaid']
                        send_json(r_dict)'''
get_inv_new = '''                        r_dict['taxId'] = r_dict.get('tax_id', '')
                        r_dict['address'] = r_dict.get('address', '')
                        r_dict['paymentDate'] = r_dict.get('payment_date', r_dict.get('date', ''))
                        r_dict['paymentAccount'] = r_dict.get('payment_account', '')
                        r_dict['amountPaid'] = sum(p.get('amount', 0.0) for p in r_dict['payments']) if r_dict['payments'] else (r_dict['grandTotal'] if r_dict.get('status') == 'paid' else 0.0)
                        r_dict['outstanding'] = r_dict['grandTotal'] - r_dict['amountPaid']
                        r_dict['journalId'] = r_dict.get('journal_id', '')
                        send_json(r_dict)'''
server_py = server_py.replace(get_inv_old, get_inv_new)

# 7. In POST handler, read journalId and save it
post_read_old = '''                    address_direct = data.get('address', '')
                    payments_str = json.dumps(data.get('payments', []))
                    
                    conn = get_db()'''
post_read_new = '''                    address_direct = data.get('address', '')
                    payments_str = json.dumps(data.get('payments', []))
                    journal_id_direct = data.get('journalId', data.get('journal_id', ''))
                    
                    conn = get_db()'''
server_py = server_py.replace(post_read_old, post_read_new)

post_bills_old = '''                                INSERT INTO bills (
                                    id, company_code, date, supplier_id, due_date, status, 
                                    subtotal, vat_rate, vat_amount, total, tax_withheld, net_payable, items, last_updated,
                                    payment_date, payment_account, vendor_name, wht_rate, tax_id, address, payments
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                                ON CONFLICT(company_code, id) DO UPDATE SET 
                                    date=excluded.date, supplier_id=excluded.supplier_id, due_date=excluded.due_date, status=excluded.status, 
                                    subtotal=excluded.subtotal, vat_rate=excluded.vat_rate, vat_amount=excluded.vat_amount, total=excluded.total, 
                                    tax_withheld=excluded.tax_withheld, net_payable=excluded.net_payable, items=excluded.items, last_updated=excluded.last_updated,
                                    payment_date=excluded.payment_date, payment_account=excluded.payment_account, vendor_name=excluded.vendor_name, wht_rate=excluded.wht_rate,
                                    tax_id=excluded.tax_id, address=excluded.address, payments=excluded.payments
                            """, (doc_id, company_code, date, party_id, date, status, subtotal, vat_rate, vat_amount, total, tax_withheld, net_payable, items_str, last_updated, payment_date, payment_account, vendor_name_direct, wht_rate, tax_id_direct, address_direct, payments_str))'''
post_bills_new = '''                                INSERT INTO bills (
                                    id, company_code, date, supplier_id, due_date, status, 
                                    subtotal, vat_rate, vat_amount, total, tax_withheld, net_payable, items, last_updated,
                                    payment_date, payment_account, vendor_name, wht_rate, tax_id, address, payments, journal_id
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                                ON CONFLICT(company_code, id) DO UPDATE SET 
                                    date=excluded.date, supplier_id=excluded.supplier_id, due_date=excluded.due_date, status=excluded.status, 
                                    subtotal=excluded.subtotal, vat_rate=excluded.vat_rate, vat_amount=excluded.vat_amount, total=excluded.total, 
                                    tax_withheld=excluded.tax_withheld, net_payable=excluded.net_payable, items=excluded.items, last_updated=excluded.last_updated,
                                    payment_date=excluded.payment_date, payment_account=excluded.payment_account, vendor_name=excluded.vendor_name, wht_rate=excluded.wht_rate,
                                    tax_id=excluded.tax_id, address=excluded.address, payments=excluded.payments, journal_id=excluded.journal_id
                            """, (doc_id, company_code, date, party_id, date, status, subtotal, vat_rate, vat_amount, total, tax_withheld, net_payable, items_str, last_updated, payment_date, payment_account, vendor_name_direct, wht_rate, tax_id_direct, address_direct, payments_str, journal_id_direct))'''
server_py = server_py.replace(post_bills_old, post_bills_new)

post_invs_old = '''                                INSERT INTO invoices (
                                    id, company_code, date, customer_id, due_date, status, 
                                    subtotal, vat_rate, vat_amount, total, tax_withheld, net_payable, items, last_updated,
                                    payment_date, payment_account, customer_name, wht_rate, tax_id, address, payments
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                                ON CONFLICT(company_code, id) DO UPDATE SET 
                                    date=excluded.date, customer_id=excluded.customer_id, due_date=excluded.due_date, status=excluded.status, 
                                    subtotal=excluded.subtotal, vat_rate=excluded.vat_rate, vat_amount=excluded.vat_amount, total=excluded.total, 
                                    tax_withheld=excluded.tax_withheld, net_payable=excluded.net_payable, items=excluded.items, last_updated=excluded.last_updated,
                                    payment_date=excluded.payment_date, payment_account=excluded.payment_account, customer_name=excluded.customer_name, wht_rate=excluded.wht_rate,
                                    tax_id=excluded.tax_id, address=excluded.address, payments=excluded.payments
                            """, (doc_id, company_code, date, party_id, date, status, subtotal, vat_rate, vat_amount, total, tax_withheld, net_payable, items_str, last_updated, payment_date, payment_account, vendor_name_direct, wht_rate, tax_id_direct, address_direct, payments_str))'''
post_invs_new = '''                                INSERT INTO invoices (
                                    id, company_code, date, customer_id, due_date, status, 
                                    subtotal, vat_rate, vat_amount, total, tax_withheld, net_payable, items, last_updated,
                                    payment_date, payment_account, customer_name, wht_rate, tax_id, address, payments, journal_id
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                                ON CONFLICT(company_code, id) DO UPDATE SET 
                                    date=excluded.date, customer_id=excluded.customer_id, due_date=excluded.due_date, status=excluded.status, 
                                    subtotal=excluded.subtotal, vat_rate=excluded.vat_rate, vat_amount=excluded.vat_amount, total=excluded.total, 
                                    tax_withheld=excluded.tax_withheld, net_payable=excluded.net_payable, items=excluded.items, last_updated=excluded.last_updated,
                                    payment_date=excluded.payment_date, payment_account=excluded.payment_account, customer_name=excluded.customer_name, wht_rate=excluded.wht_rate,
                                    tax_id=excluded.tax_id, address=excluded.address, payments=excluded.payments, journal_id=excluded.journal_id
                            """, (doc_id, company_code, date, party_id, date, status, subtotal, vat_rate, vat_amount, total, tax_withheld, net_payable, items_str, last_updated, payment_date, payment_account, vendor_name_direct, wht_rate, tax_id_direct, address_direct, payments_str, journal_id_direct))'''
server_py = server_py.replace(post_invs_old, post_invs_new)

with open('server.py', 'w', encoding='utf-8') as f:
    f.write(server_py)

print("Server patch applied to add journal_id to DB schemas and API")
