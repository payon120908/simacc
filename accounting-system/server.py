# server.py - Full-stack Python Backend Server with SQLite for Accounting & Inventory System
import http.server
import socketserver
import json
import sqlite3
import os
import urllib.parse
import webbrowser
import threading
import time
import traceback

PORT = int(os.environ.get('PORT', 8085))
TABLE_COLUMNS = {
    'users': ['id', 'username', 'password_hash', 'role', 'company_code', 'created_at'],
    'companies': ['code', 'name'],
    'settings': ['company_code', 'key', 'value'],
    'accounts': ['company_code', 'code', 'name', 'category', 'parent_code', 'type', 'level', 'name_en'],
    'journal_entries': ['id', 'company_code', 'date', 'reference', 'description', 'is_posted', 'is_opening', 'vat_type', 'vat_amount', 'wht_type', 'wht_amount', 'party_name', 'tax_id', 'last_updated'],
    'journal_items': ['id', 'journal_entry_id', 'account_code', 'debit', 'credit', 'description'],
    'contacts': ['id', 'company_code', 'name', 'email', 'phone', 'address', 'tax_id', 'credit_term', 'contact_person', 'bank_account', 'is_customer', 'is_supplier'],

    'invoices': ['id', 'company_code', 'date', 'customer_id', 'due_date', 'status', 'subtotal', 'vat_rate', 'vat_amount', 'total', 'tax_withheld', 'net_payable', 'items', 'last_updated', 'customer_name', 'tax_id', 'address', 'wht_rate', 'payment_date', 'payment_account', 'payments'],
    'bills': ['id', 'company_code', 'date', 'supplier_id', 'due_date', 'status', 'subtotal', 'vat_rate', 'vat_amount', 'total', 'tax_withheld', 'net_payable', 'items', 'last_updated', 'payment_date', 'payment_account', 'vendor_name', 'wht_rate', 'tax_id', 'address', 'payments'],
    'ar_receipts': ['id', 'company_code', 'date', 'invoice_id', 'customer_id', 'amount', 'payment_method', 'reference_no'],
    'ap_payments': ['id', 'company_code', 'date', 'bill_id', 'supplier_id', 'amount', 'payment_method', 'reference_no'],
    'petty_cash_payments': ['id', 'company_code', 'date', 'type', 'status', 'remarks', 'lines', 'total_amount', 'vr_id', 'contact_code', 'wht_type', 'wht_amount', 'vat_type', 'vat_amount', 'tax_invoice_no'],
    'petty_cash_reimbursements': ['id', 'company_code', 'date', 'explanation', 'reimburse_account', 'dp_ids', 'lines', 'total_amount', 'journal_id'],
    'payment_methods': ['company_code', 'code', 'name', 'type', 'account_code', 'is_cheque', 'bank_code'],
    'expense_catalog': ['company_code', 'code', 'name', 'name_en', 'category', 'unit', 'vat_type', 'amount', 'remarks', 'account_code'],
    'products': ['id', 'company_code', 'code', 'name', 'type', 'category', 'unit', 'standard_cost', 'standard_price', 'description', 'min_qty', 'reorder_qty', 'status'],
    'product_set_items': ['id', 'set_product_id', 'member_product_id', 'quantity'],
    'price_lists': ['id', 'company_code', 'product_code', 'price_tier', 'price'],
    'inventory_transactions': ['id', 'company_code', 'product_id', 'date', 'doc_ref', 'transaction_type', 'quantity', 'unit_cost', 'total_cost', 'description'],
    'inventory_counts': ['id', 'company_code', 'date', 'ref_no', 'status', 'description'],
    'inventory_count_items': ['id', 'count_id', 'product_id', 'system_qty', 'counted_qty', 'diff_qty', 'unit_cost']
}


def get_db():
    db_dir = os.path.join(os.path.dirname(__file__), 'database')
    os.makedirs(db_dir, exist_ok=True)
    db_path = os.path.join(db_dir, 'accounting.db')
    
    # Copy template database if it exists and target doesn't (useful for cloud deployments with persistent disks)
    if not os.path.exists(db_path):
        template_path = os.path.join(os.path.dirname(__file__), 'database_template', 'accounting.db')
        if os.path.exists(template_path):
            import shutil
            try:
                shutil.copy2(template_path, db_path)
                print(f"Initialized database from template: {template_path} -> {db_path}")
            except Exception as e:
                print(f"Error copying template database: {e}")
                
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def map_journal_entry_to_frontend(je_row, conn):
    je_dict = dict(je_row)
    je_id = je_dict['id']
    items = conn.execute("SELECT * FROM journal_items WHERE journal_entry_id = ?", (je_id,)).fetchall()
    
    lines = []
    for it in items:
        lines.append({
            "id": it["id"],
            "accountCode": it["account_code"],
            "debit": it["debit"],
            "credit": it["credit"],
            "description": it["description"] or ""
        })
        
    return {
        "id": je_dict["id"],
        "companyCode": je_dict["company_code"],
        "date": je_dict["date"],
        "reference": je_dict["reference"],
        "description": je_dict["description"] or "",
        "isPosted": bool(je_dict.get("is_posted", 0)),
        "isOpening": bool(je_dict.get("is_opening", 0)),
        "vatType": je_dict.get("vat_type", "none"),
        "vatAmount": je_dict.get("vat_amount", 0.0),
        "whtType": je_dict.get("wht_type", "none"),
        "whtAmount": je_dict.get("wht_amount", 0.0),
        "partyName": je_dict.get("party_name", ""),
        "taxId": je_dict.get("tax_id", ""),
        "lastUpdated": je_dict.get("last_updated", 0),
        "lines": lines
    }

def initialize_database():
    conn = get_db()
    cursor = conn.cursor()
    
    # Enable WAL mode for concurrency
    try:
        cursor.execute("PRAGMA journal_mode=WAL;")
    except:
        pass

    
    # 0.1 Security Settings Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT
    );
    ''')
    
    # Try to alter users table for lockout support if columns don't exist
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN failed_attempts INTEGER DEFAULT 0")
        cursor.execute("ALTER TABLE users ADD COLUMN locked_until BIGINT DEFAULT 0")
    except:
        pass

    # 0. Users Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        company_code TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Create default admin if users table is empty
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        import hashlib
        # Default admin password: admin (hashed)
        default_hash = hashlib.sha256("admin".encode('utf-8')).hexdigest()
        cursor.execute("INSERT INTO users (username, password_hash, role, company_code) VALUES (?, ?, ?, ?)",
                       ('admin', default_hash, 'admin', '*'))

    # 1. Companies Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS companies (
        code TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 2. Settings Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        company_code TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT,
        PRIMARY KEY (company_code, key),
        FOREIGN KEY (company_code) REFERENCES companies(code) ON DELETE CASCADE
    );
    """)

    # 3. Chart of Accounts Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS accounts (
        company_code TEXT NOT NULL,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        parent_code TEXT NULL,
        type TEXT DEFAULT 'posting',
        level INTEGER DEFAULT 1,
        name_en TEXT,
        PRIMARY KEY (company_code, code),
        FOREIGN KEY (company_code) REFERENCES companies(code) ON DELETE CASCADE
    );
    """)

    # Auto-migration for accounts table columns
    cursor.execute("PRAGMA table_info(accounts);")
    existing_accounts_cols = [row[1] for row in cursor.fetchall()]
    new_accounts_cols = {
        'type': "TEXT DEFAULT 'posting'",
        'level': "INTEGER DEFAULT 1",
        'name_en': "TEXT"
    }
    for col, definition in new_accounts_cols.items():
        if col not in existing_accounts_cols:
            cursor.execute(f"ALTER TABLE accounts ADD COLUMN {col} {definition};")

    # 4. Journal Entries Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS journal_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_code TEXT NOT NULL,
        date TEXT NOT NULL,
        reference TEXT NOT NULL,
        description TEXT,
        is_posted INTEGER DEFAULT 0,
        is_opening INTEGER DEFAULT 0,
        vat_type TEXT DEFAULT 'none',
        vat_amount REAL DEFAULT 0.0,
        wht_type TEXT DEFAULT 'none',
        wht_amount REAL DEFAULT 0.0,
        party_name TEXT DEFAULT '',
        tax_id TEXT DEFAULT '',
        last_updated INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (company_code) REFERENCES companies(code) ON DELETE CASCADE
    );
    """)

    # Auto-migration for journal_entries table columns
    cursor.execute("PRAGMA table_info(journal_entries);")
    existing_cols = [row[1] for row in cursor.fetchall()]
    new_cols = {
        'is_opening': 'INTEGER DEFAULT 0',
        'vat_type': "TEXT DEFAULT 'none'",
        'vat_amount': 'REAL DEFAULT 0.0',
        'wht_type': "TEXT DEFAULT 'none'",
        'wht_amount': 'REAL DEFAULT 0.0',
        'party_name': "TEXT DEFAULT ''",
        'tax_id': "TEXT DEFAULT ''"
    }
    for col, definition in new_cols.items():
        if col not in existing_cols:
            cursor.execute(f"ALTER TABLE journal_entries ADD COLUMN {col} {definition};")

    # 5. Journal Items Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS journal_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        journal_entry_id INTEGER NOT NULL,
        account_code TEXT NOT NULL,
        debit REAL DEFAULT 0.00,
        credit REAL DEFAULT 0.00,
        description TEXT,
        FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE
    );
    """)

    # 6. Contacts Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_code TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT NULL,
        phone TEXT NULL,
        address TEXT,
        tax_id TEXT NULL,
        credit_term INTEGER DEFAULT 0,
        contact_person TEXT NULL,
        bank_account TEXT NULL,
        is_customer INTEGER DEFAULT 0,
        is_supplier INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (company_code) REFERENCES companies(code) ON DELETE CASCADE
    );
    """)

    # Auto-migration for contacts table columns
    cursor.execute("PRAGMA table_info(contacts);")
    existing_contacts_cols = [row[1] for row in cursor.fetchall()]
    new_contacts_cols = {
        'tax_id': 'TEXT NULL',
        'credit_term': 'INTEGER DEFAULT 0',
        'contact_person': 'TEXT NULL',
        'bank_account': 'TEXT NULL',
        'is_customer': 'INTEGER DEFAULT 0',
        'is_supplier': 'INTEGER DEFAULT 0'
    }
    for col, definition in new_contacts_cols.items():
        if col not in existing_contacts_cols:
            cursor.execute(f"ALTER TABLE contacts ADD COLUMN {col} {definition};")

    # 8. Invoices Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS invoices (
        id TEXT NOT NULL,
        company_code TEXT NOT NULL,
        date TEXT NOT NULL,
        customer_id INTEGER NOT NULL,
        due_date TEXT NOT NULL,
        status TEXT NOT NULL,
        subtotal REAL NOT NULL DEFAULT 0.00,
        vat_rate REAL NOT NULL DEFAULT 0.00,
        vat_amount REAL NOT NULL DEFAULT 0.00,
        total REAL NOT NULL DEFAULT 0.00,
        tax_withheld REAL NOT NULL DEFAULT 0.00,
        net_payable REAL NOT NULL DEFAULT 0.00,
        items TEXT NOT NULL,
        last_updated INTEGER NOT NULL,
        PRIMARY KEY (company_code, id),
        FOREIGN KEY (company_code) REFERENCES companies(code) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES contacts(id) ON DELETE RESTRICT
    );
    """)

    # 9. Bills Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS bills (
        id TEXT NOT NULL,
        company_code TEXT NOT NULL,
        date TEXT NOT NULL,
        supplier_id INTEGER NOT NULL,
        due_date TEXT NOT NULL,
        status TEXT NOT NULL,
        subtotal REAL NOT NULL DEFAULT 0.00,
        vat_rate REAL NOT NULL DEFAULT 0.00,
        vat_amount REAL NOT NULL DEFAULT 0.00,
        total REAL NOT NULL DEFAULT 0.00,
        tax_withheld REAL NOT NULL DEFAULT 0.00,
        net_payable REAL NOT NULL DEFAULT 0.00,
        items TEXT NOT NULL,
        last_updated INTEGER NOT NULL,
        payment_date TEXT,
        payment_account TEXT,
        vendor_name TEXT,
        wht_rate REAL DEFAULT 0.00,
        tax_id TEXT,
        address TEXT,
        PRIMARY KEY (company_code, id),
        FOREIGN KEY (company_code) REFERENCES companies(code) ON DELETE CASCADE,
        FOREIGN KEY (supplier_id) REFERENCES contacts(id) ON DELETE RESTRICT
    );
    """)
    # Migration: add new columns for bills if they don't exist yet
    for col_def in [
        ("payment_date", "TEXT"),
        ("payment_account", "TEXT"),
        ("vendor_name", "TEXT"),
        ("wht_rate", "REAL DEFAULT 0.00"),
        ("tax_id", "TEXT"),
        ("address", "TEXT"),
        ("payments", "TEXT"),
        ("journal_id", "TEXT"),
]:
        try:
            cursor.execute(f"ALTER TABLE bills ADD COLUMN {col_def[0]} {col_def[1]}")
        except Exception:
            pass  # Column already exists

    # Migration: add new columns for invoices if they don't exist yet
    for col_def in [
        ("customer_name", "TEXT"),
        ("tax_id", "TEXT"),
        ("address", "TEXT"),
        ("wht_rate", "REAL DEFAULT 0.00"),
        ("payment_date", "TEXT"),
        ("payment_account", "TEXT"),
        ("payments", "TEXT"),
        ("journal_id", "TEXT"),
]:
        try:
            cursor.execute(f"ALTER TABLE invoices ADD COLUMN {col_def[0]} {col_def[1]}")
        except Exception:
            pass  # Column already exists

    # 10. AR Receipts Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ar_receipts (
        id TEXT NOT NULL,
        company_code TEXT NOT NULL,
        date TEXT NOT NULL,
        invoice_id TEXT NOT NULL,
        customer_id INTEGER NOT NULL,
        amount REAL NOT NULL DEFAULT 0.00,
        payment_method TEXT NOT NULL,
        reference_no TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (company_code, id),
        FOREIGN KEY (company_code) REFERENCES companies(code) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES contacts(id) ON DELETE RESTRICT
    );
    """)

    # 11. AP Payments Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ap_payments (
        id TEXT NOT NULL,
        company_code TEXT NOT NULL,
        date TEXT NOT NULL,
        bill_id TEXT NOT NULL,
        supplier_id INTEGER NOT NULL,
        amount REAL NOT NULL DEFAULT 0.00,
        payment_method TEXT NOT NULL,
        reference_no TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (company_code, id),
        FOREIGN KEY (company_code) REFERENCES companies(code) ON DELETE CASCADE,
        FOREIGN KEY (supplier_id) REFERENCES contacts(id) ON DELETE RESTRICT
    );
    """)

    # 12. Petty Cash Payments Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS petty_cash_payments (
        id TEXT NOT NULL,
        company_code TEXT NOT NULL,
        date TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        remarks TEXT,
        lines TEXT, -- JSON array of lines
        total_amount REAL NOT NULL DEFAULT 0.00,
        vr_id TEXT,
        contact_code TEXT,
        wht_type TEXT,
        wht_amount REAL DEFAULT 0.00,
        vat_type TEXT DEFAULT 'none',
        vat_amount REAL DEFAULT 0.00,
        tax_invoice_no TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (company_code, id),
        FOREIGN KEY (company_code) REFERENCES companies(code) ON DELETE CASCADE
    );
    """)

    # Auto-migration for petty_cash_payments table columns
    cursor.execute("PRAGMA table_info(petty_cash_payments);")
    existing_pc_cols = [row[1] for row in cursor.fetchall()]
    new_pc_cols = {
        'contact_code': "TEXT",
        'wht_type': "TEXT",
        'wht_amount': "REAL DEFAULT 0.00",
        'vat_type': "TEXT DEFAULT 'none'",
        'vat_amount': "REAL DEFAULT 0.00",
        'tax_invoice_no': "TEXT"
    }
    for col, definition in new_pc_cols.items():
        if col not in existing_pc_cols:
            cursor.execute(f"ALTER TABLE petty_cash_payments ADD COLUMN {col} {definition};")

    # 13. Petty Cash Reimbursements Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS petty_cash_reimbursements (
        id TEXT NOT NULL,
        company_code TEXT NOT NULL,
        date TEXT NOT NULL,
        explanation TEXT,
        reimburse_account TEXT,
        dp_ids TEXT, -- JSON array of payment IDs
        lines TEXT, -- JSON array of aggregated lines
        total_amount REAL NOT NULL DEFAULT 0.00,
        journal_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (company_code, id),
        FOREIGN KEY (company_code) REFERENCES companies(code) ON DELETE CASCADE
    );
    """)

    # 14. Payment Methods Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS payment_methods (
        company_code TEXT NOT NULL,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT,
        account_code TEXT NOT NULL,
        is_cheque INTEGER DEFAULT 0,
        bank_code TEXT,
        PRIMARY KEY (company_code, code),
        FOREIGN KEY (company_code) REFERENCES companies(code) ON DELETE CASCADE
    );
    """)

    # 15. Expense Catalog Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS expense_catalog (
        company_code TEXT NOT NULL,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        name_en TEXT,
        category TEXT,
        unit TEXT,
        vat_type TEXT,
        amount REAL DEFAULT 0.00,
        remarks TEXT,
        account_code TEXT NOT NULL,
        PRIMARY KEY (company_code, code),
        FOREIGN KEY (company_code) REFERENCES companies(code) ON DELETE CASCADE
    );
    """)

    # 16. Products Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_code TEXT NOT NULL,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        category TEXT NULL,
        unit TEXT NOT NULL,
        standard_cost REAL DEFAULT 0.00,
        standard_price REAL DEFAULT 0.00,
        description TEXT,
        min_qty REAL DEFAULT 0.00,
        reorder_qty REAL DEFAULT 0.00,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (company_code) REFERENCES companies(code) ON DELETE CASCADE,
        UNIQUE(company_code, code)
    );
    """)

    # 17. Product Set Items (BOM) Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS product_set_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        set_product_id INTEGER NOT NULL,
        member_product_id INTEGER NOT NULL,
        quantity REAL NOT NULL,
        FOREIGN KEY (set_product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (member_product_id) REFERENCES products(id) ON DELETE CASCADE
    );
    """)

    # 18. Price Lists Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS price_lists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_code TEXT NOT NULL,
        product_code TEXT NOT NULL,
        price_tier TEXT NOT NULL,
        price REAL NOT NULL,
        FOREIGN KEY (company_code) REFERENCES companies(code) ON DELETE CASCADE,
        UNIQUE(company_code, product_code, price_tier)
    );
    """)

    # 19. Inventory Transactions Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS inventory_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_code TEXT NOT NULL,
        product_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        doc_ref TEXT NOT NULL,
        transaction_type TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit_cost REAL DEFAULT 0.00,
        total_cost REAL DEFAULT 0.00,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (company_code) REFERENCES companies(code) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );
    """)

    # 20. Inventory Counts Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS inventory_counts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_code TEXT NOT NULL,
        date TEXT NOT NULL,
        ref_no TEXT NOT NULL,
        status TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (company_code) REFERENCES companies(code) ON DELETE CASCADE,
        UNIQUE(company_code, ref_no)
    );
    """)

    # 21. Inventory Count Items Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS inventory_count_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        count_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        system_qty REAL NOT NULL,
        counted_qty REAL NOT NULL,
        diff_qty REAL NOT NULL,
        unit_cost REAL NOT NULL,
        FOREIGN KEY (count_id) REFERENCES inventory_counts(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );
    """)
    
    conn.commit()
    conn.close()
    print("SQLite database tables verified/created successfully.")

def seed_default_accounts(company_code):
    default_accounts = [
        # 1. Assets (สินทรัพย์)
        { 'code': '1000-00', 'name': 'สินทรัพย์', 'category': 'asset', 'type': 'control', 'level': 1, 'parent_code': '' },
        { 'code': '1100-00', 'name': 'สินทรัพย์หมุนเวียน', 'category': 'asset', 'type': 'control', 'level': 2, 'parent_code': '1000-00' },
        { 'code': '1110-00', 'name': 'เงินสดและเงินฝากธนาคาร', 'category': 'asset', 'type': 'control', 'level': 3, 'parent_code': '1100-00' },
        { 'code': '1111-00', 'name': 'เงินสด', 'category': 'asset', 'type': 'posting', 'level': 4, 'parent_code': '1110-00' },
        { 'code': '1112-00', 'name': 'เงินฝากธนาคาร', 'category': 'asset', 'type': 'posting', 'level': 4, 'parent_code': '1110-00' },
        { 'code': '1120-00', 'name': 'ลูกหนี้การค้าและลูกหนี้อื่น', 'category': 'asset', 'type': 'control', 'level': 3, 'parent_code': '1100-00' },
        { 'code': '1121-00', 'name': 'ลูกหนี้การค้า', 'category': 'asset', 'type': 'posting', 'level': 4, 'parent_code': '1120-00' },
        { 'code': '1150-00', 'name': 'ภาษีซื้อและภาษีรอเรียกคืน', 'category': 'asset', 'type': 'control', 'level': 3, 'parent_code': '1100-00' },
        { 'code': '1151-00', 'name': 'ภาษีซื้อ', 'category': 'asset', 'type': 'posting', 'level': 4, 'parent_code': '1150-00' },
        { 'code': '1152-00', 'name': 'ภาษีเงินได้ถูกหัก ณ ที่จ่าย (WHT สินทรัพย์)', 'category': 'asset', 'type': 'posting', 'level': 4, 'parent_code': '1150-00' },
        { 'code': '1200-00', 'name': 'ลูกหนี้เงินให้กู้ยืมแก่กรรมการและลูกจ้าง', 'category': 'asset', 'type': 'control', 'level': 2, 'parent_code': '1000-00' },
        { 'code': '1300-00', 'name': 'เงินลงทุนในบริษัทในเครือ', 'category': 'asset', 'type': 'control', 'level': 2, 'parent_code': '1000-00' },
        { 'code': '1400-00', 'name': 'ที่ดิน อาคารและอุปกรณ์สุทธิ', 'category': 'asset', 'type': 'control', 'level': 2, 'parent_code': '1000-00' },
        { 'code': '1410-00', 'name': 'ที่ดิน อาคาร และอุปกรณ์', 'category': 'asset', 'type': 'posting', 'level': 3, 'parent_code': '1400-00' },
        { 'code': '1500-00', 'name': 'สินทรัพย์อื่น ๆ', 'category': 'asset', 'type': 'control', 'level': 2, 'parent_code': '1000-00' },
        { 'code': '1500-01', 'name': 'กรมธรรม์ประกันอัคคีภัย-สินค้าและอาคาร', 'category': 'asset', 'type': 'posting', 'level': 3, 'parent_code': '1500-00' },
        { 'code': '1500-02', 'name': 'กรมธรรม์ประกันอัคคีภัย-ยานพาหนะ', 'category': 'asset', 'type': 'posting', 'level': 3, 'parent_code': '1500-00' },
        { 'code': '1500-03', 'name': 'กรมธรรม์ประกันอุบัติเหตุพนักงาน', 'category': 'asset', 'type': 'posting', 'level': 3, 'parent_code': '1500-00' },
        { 'code': '1500-04', 'name': 'พันธบัตรโทรศัพท์', 'category': 'asset', 'type': 'posting', 'level': 3, 'parent_code': '1500-00' },
        { 'code': '1500-05', 'name': 'ดอกเบี้ยรอตัดบัญชี', 'category': 'asset', 'type': 'posting', 'level': 3, 'parent_code': '1500-00' },
        
        # 2. Liabilities (หนี้สิน)
        { 'code': '2000-00', 'name': 'หนี้สิน', 'category': 'liability', 'type': 'control', 'level': 1, 'parent_code': '' },
        { 'code': '2100-00', 'name': 'หนี้สินหมุนเวียน', 'category': 'liability', 'type': 'control', 'level': 2, 'parent_code': '2000-00' },
        { 'code': '2110-00', 'name': 'เจ้าหนี้การค้าและเจ้าหนี้อื่น', 'category': 'liability', 'type': 'control', 'level': 3, 'parent_code': '2100-00' },
        { 'code': '2111-00', 'name': 'เจ้าหนี้การค้า', 'category': 'liability', 'type': 'posting', 'level': 4, 'parent_code': '2110-00' },
        { 'code': '2150-00', 'name': 'ภาษีค้างจ่าย', 'category': 'liability', 'type': 'control', 'level': 3, 'parent_code': '2100-00' },
        { 'code': '2151-00', 'name': 'ภาษีขาย', 'category': 'liability', 'type': 'posting', 'level': 4, 'parent_code': '2150-00' },
        { 'code': '2161-00', 'name': 'ภาษีเงินได้หัก ณ ที่จ่ายค้างจ่าย (WHT หนี้สิน)', 'category': 'liability', 'type': 'posting', 'level': 4, 'parent_code': '2150-00' },
        { 'code': '2200-00', 'name': 'เงินกู้ยืมระยะยาว', 'category': 'liability', 'type': 'control', 'level': 2, 'parent_code': '2000-00' },
        { 'code': '2210-00', 'name': 'เงินกู้ยืมระยะยาว', 'category': 'liability', 'type': 'posting', 'level': 3, 'parent_code': '2200-00' },
        { 'code': '2300-00', 'name': 'หนี้สินอื่น ๆ', 'category': 'liability', 'type': 'control', 'level': 2, 'parent_code': '2000-00' },
        
        # 3. Equity (ส่วนของผู้ถือหุ้น)
        { 'code': '3000-00', 'name': 'ส่วนของผู้ถือหุ้น', 'category': 'equity', 'type': 'control', 'level': 1, 'parent_code': '' },
        { 'code': '3100-00', 'name': 'ทุนเรือนหุ้น', 'category': 'equity', 'type': 'control', 'level': 2, 'parent_code': '3000-00' },
        { 'code': '3110-00', 'name': 'ทุนจดทะเบียน', 'category': 'equity', 'type': 'posting', 'level': 3, 'parent_code': '3100-00' },
        { 'code': '3200-00', 'name': 'กำไรสะสม', 'category': 'equity', 'type': 'control', 'level': 2, 'parent_code': '3000-00' },
        { 'code': '3210-00', 'name': 'กำไรสะสม', 'category': 'equity', 'type': 'posting', 'level': 3, 'parent_code': '3200-00' },
        
        # 4. Revenues (รายได้)
        { 'code': '4000-00', 'name': 'รายได้', 'category': 'revenue', 'type': 'control', 'level': 1, 'parent_code': '' },
        { 'code': '4100-00', 'name': 'รายได้หลัก', 'category': 'revenue', 'type': 'control', 'level': 2, 'parent_code': '4000-00' },
        { 'code': '4111-00', 'name': 'รายได้จากการขายสินค้า', 'category': 'revenue', 'type': 'posting', 'level': 3, 'parent_code': '4100-00' },
        { 'code': '4112-00', 'name': 'รายได้จากการบริการ', 'category': 'revenue', 'type': 'posting', 'level': 3, 'parent_code': '4100-00' },
        { 'code': '4190-00', 'name': 'รายได้อื่น', 'category': 'revenue', 'type': 'posting', 'level': 2, 'parent_code': '4000-00' },
        
        # 5. Expenses (ค่าใช้จ่าย)
        { 'code': '5000-00', 'name': 'ค่าใช้จ่าย', 'category': 'expense', 'type': 'control', 'level': 1, 'parent_code': '' },
        { 'code': '5100-00', 'name': 'ต้นทุนขายและบริการ', 'category': 'expense', 'type': 'control', 'level': 2, 'parent_code': '5000-00' },
        { 'code': '5111-00', 'name': 'ต้นทุนสินค้าที่ขาย', 'category': 'expense', 'type': 'posting', 'level': 3, 'parent_code': '5100-00' },
        { 'code': '5200-00', 'name': 'ค่าใช้จ่ายในการบริหาร', 'category': 'expense', 'type': 'control', 'level': 2, 'parent_code': '5000-00' },
        { 'code': '5210-00', 'name': 'เงินเดือนและโบนัสพนักงาน', 'category': 'expense', 'type': 'posting', 'level': 3, 'parent_code': '5200-00' },
        { 'code': '5220-00', 'name': 'ค่าเช่าสถานที่', 'category': 'expense', 'type': 'posting', 'level': 3, 'parent_code': '5200-00' },
        { 'code': '5230-00', 'name': 'ค่าน้ำ ค่าไฟ ค่าโทรศัพท์', 'category': 'expense', 'type': 'posting', 'level': 3, 'parent_code': '5200-00' },
        { 'code': '5240-00', 'name': 'ค่าบริการขนส่ง', 'category': 'expense', 'type': 'posting', 'level': 3, 'parent_code': '5200-00' },
        { 'code': '5250-00', 'name': 'ค่าใช้จ่ายเบ็ดเตล็ด', 'category': 'expense', 'type': 'posting', 'level': 3, 'parent_code': '5200-00' },
        
        # Other accounts
        { 'code': '6000-00', 'name': 'ภาษีเงินได้นิติบุคคล', 'category': 'expense', 'type': 'posting', 'level': 1, 'parent_code': '' },
        { 'code': '9999-99', 'name': 'บัญชีพัก', 'category': 'equity', 'type': 'posting', 'level': 1, 'parent_code': '' }
    ]
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT count(*) as count FROM accounts WHERE company_code = ?", (company_code,))
    cnt = cursor.fetchone()['count']
    if cnt == 0:
        for acc in default_accounts:
            cursor.execute("INSERT INTO accounts (company_code, code, name, category, parent_code, type, level) VALUES (?, ?, ?, ?, ?, ?, ?)",
                           (company_code, acc['code'], acc['name'], acc['category'], acc['parent_code'], acc['type'], acc['level']))
        conn.commit()
        print(f"Seeded default Chart of Accounts for company: {company_code}")
    conn.close()


def lookup_vat_rd(tax_id):
    url = "https://rdws.rd.go.th/jsonRD/vatserviceRD3.asmx"
    
    soap_body = f"""<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <Service xmlns="https://rdws.rd.go.th/JserviceRD3/vatserviceRD3">
      <username>anonymous</username>
      <password>anonymous</password>
      <TIN>{tax_id}</TIN>
      <Name></Name>
      <ProvinceCode>0</ProvinceCode>
      <BranchNumber>0</BranchNumber>
      <AmphurCode>0</AmphurCode>
    </Service>
  </soap:Body>
</soap:Envelope>"""

    headers = {
        "Content-Type": "text/xml; charset=utf-8",
        "SOAPAction": "https://rdws.rd.go.th/JserviceRD3/vatserviceRD3/Service",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Content-Length": str(len(soap_body.encode('utf-8')))
    }
    
    import ssl
    import urllib.request
    import re
    
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    req = urllib.request.Request(url, data=soap_body.encode('utf-8'), headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            xml_data = response.read().decode('utf-8')
            match = re.search(r'<ServiceResult[^>]*>([\s\S]*?)</ServiceResult>', xml_data)
            if not match:
                return {"success": False, "message": "Invalid response from RD service"}
            
            json_text = match.group(1)
            json_text = json_text.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&quot;', '"').replace('&apos;', "'")
            data = json.loads(json_text)
            
            if data.get('msgerr') and any(err for err in data['msgerr'] if err):
                err_msg = " ".join([err for err in data['msgerr'] if err])
                err_msg = re.sub(r'<[^>]*>', '', err_msg).strip()
                return {"success": False, "message": err_msg or "Data not found"}
                
            names = data.get('Name', [])
            if not names or not any(names):
                return {"success": False, "message": "Company not found in VAT database"}
                
            title = data.get('TitleName', [''])[0].strip() if data.get('TitleName') else ''
            name = data.get('Name', [''])[0].strip() if data.get('Name') else ''
            surname = data.get('Surname', [''])[0].strip() if data.get('Surname') else ''
            
            full_name = " ".join([t for t in [title, name, surname] if t and t != '-']).strip()
            
            parts = []
            def add_part(val, prefix=""):
                if val and val != '-':
                    parts.append(f"{prefix}{val.strip()}")
            
            house = data.get('HouseNumber', [''])[0] if data.get('HouseNumber') else ''
            moo = data.get('MooNumber', [''])[0] if data.get('MooNumber') else ''
            bldg = data.get('BuildingName', [''])[0] if data.get('BuildingName') else ''
            floor = data.get('FloorNumber', [''])[0] if data.get('FloorNumber') else ''
            room = data.get('RoomNumber', [''])[0] if data.get('RoomNumber') else ''
            village = data.get('VillageName', [''])[0] if data.get('VillageName') else ''
            soi = data.get('SoiName', [''])[0] if data.get('SoiName') else ''
            street = data.get('StreetName', [''])[0] if data.get('StreetName') else ''
            thambol = data.get('Thambol', [''])[0] if data.get('Thambol') else ''
            amphur = data.get('Amphur', [''])[0] if data.get('Amphur') else ''
            province = data.get('Province', [''])[0] if data.get('Province') else ''
            postcode = data.get('PostCode', [''])[0] if data.get('PostCode') else ''
            
            add_part(house)
            add_part(moo, "หมู่ที่ ")
            add_part(bldg)
            add_part(floor, "ชั้น ")
            add_part(room, "ห้อง ")
            add_part(village, "หมู่บ้าน")
            add_part(soi, "ซอย")
            add_part(street, "ถนน")
            
            prov_str = province.strip() if province else ''
            thamb_str = thambol.strip() if thambol else ''
            amph_str = amphur.strip() if amphur else ''
            
            if prov_str == 'กรุงเทพมหานคร':
                add_part(thamb_str, "แขวง")
                add_part(amph_str, "เขต")
                add_part(prov_str)
            else:
                add_part(thamb_str, "ตำบล")
                add_part(amph_str, "อำเภอ")
                add_part(prov_str, "จังหวัด")
                
            add_part(postcode)
            full_address = " ".join(parts).strip()
            
            return {
                "success": True,
                "taxId": tax_id,
                "name": full_name,
                "address": full_address
            }
    except Exception as e:
        return {"success": False, "message": str(e)}

class APIRouter:
    def handle_request(self, handler, method, parsed_url, body_data):
        path_parts = [p for p in parsed_url.path.split('/') if p]
        
        # Helper to respond with JSON
        def send_json(data, status=200):
            handler.send_response(status)
            handler.send_header('Content-Type', 'application/json')
            handler.send_header('Access-Control-Allow-Origin', '*')
            handler.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            handler.send_header('Access-Control-Allow-Headers', 'Content-Type')
            handler.end_headers()
            handler.wfile.write(json.dumps(data).encode('utf-8'))
            
        def send_error(msg, status=500):
            send_json({"error": True, "message": str(msg)}, status)

        # CORS preflight
        if method == 'OPTIONS':
            handler.send_response(204)
            handler.send_header('Access-Control-Allow-Origin', '*')
            handler.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            handler.send_header('Access-Control-Allow-Headers', 'Content-Type')
            handler.end_headers()
            return True

        try:
            # Auth Login
            if len(path_parts) == 3 and path_parts[0] == 'api' and path_parts[1] == 'auth' and path_parts[2] == 'login':
                if method == 'POST':
                    try:
                        import hashlib
                        req_data = json.loads(body_data)
                        username = req_data.get('username', '').strip().lower()
                        password = req_data.get('password', '')
                        
                        password_hash = hashlib.sha256(password.encode('utf-8')).hexdigest()
                        
                        conn = get_db()
                        import time
                        current_time = int(time.time())
                        
                        user = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
                        
                        if user:
                            locked_until = dict(user).get('locked_until') or 0
                            if locked_until > current_time:
                                remaining = (locked_until - current_time) // 60
                                send_json({"error": True, "message": f"บัญชีถูกล็อค กรุณาลองใหม่ในอีก {remaining or 1} นาที"}, 401)
                                return True
                                
                            if user['password_hash'] == password_hash:
                                # Success
                                conn.execute("UPDATE users SET failed_attempts = 0, locked_until = 0 WHERE username = ?", (username,))
                                conn.commit()
                                send_json({
                                    "success": True,
                                    "user": {
                                        "username": user['username'],
                                        "role": user['role'],
                                        "company_code": user['company_code']
                                    }
                                })
                            else:
                                # Failed attempt
                                max_att_row = conn.execute("SELECT value FROM system_settings WHERE key = 'max_login_attempts'").fetchone()
                                max_attempts = int(max_att_row['value']) if max_att_row else 5
                                
                                failed_attempts = (dict(user).get('failed_attempts') or 0) + 1
                                
                                if failed_attempts >= max_attempts:
                                    dur_row = conn.execute("SELECT value FROM system_settings WHERE key = 'lockout_duration_minutes'").fetchone()
                                    lockout_duration = int(dur_row['value']) if dur_row else 15
                                    new_locked_until = current_time + (lockout_duration * 60)
                                    conn.execute("UPDATE users SET failed_attempts = ?, locked_until = ? WHERE username = ?", (failed_attempts, new_locked_until, username))
                                    conn.commit()
                                    send_json({"error": True, "message": f"คุณใส่รหัสผ่านผิดเกินกำหนด บัญชีถูกล็อคเป็นเวลา {lockout_duration} นาที"}, 401)
                                else:
                                    conn.execute("UPDATE users SET failed_attempts = ? WHERE username = ?", (failed_attempts, username))
                                    conn.commit()
                                    send_json({"error": True, "message": "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง"}, 401)
                        else:
                            send_json({"error": True, "message": "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง"}, 401)
                        return True
                    except Exception as e:
                        traceback.print_exc()
                        send_error(str(e))
                        return True

            
            
            # User Management
            if len(path_parts) >= 2 and path_parts[0] == 'api' and path_parts[1] == 'users':
                if method == 'GET':
                    conn = get_db()
                    rows = conn.execute("SELECT id, username, role, company_code, created_at FROM users").fetchall()
                    send_json([dict(r) for r in rows])
                    return True
                elif method == 'POST':
                    data = json.loads(body_data)
                    username = data.get('username')
                    password = data.get('password')
                    role = data.get('role', 'accountant')
                    company_code = data.get('company_code', '')
                    
                    if not username or not password:
                        send_json({"error": True, "message": "Username and Password are required"}, 400)
                        return True
                        
                    import hashlib
                    password_hash = hashlib.sha256(password.encode('utf-8')).hexdigest()
                    
                    conn = get_db()
                    try:
                        conn.execute("INSERT INTO users (username, password_hash, role, company_code) VALUES (?, ?, ?, ?)", (username, password_hash, role, company_code))
                        conn.commit()
                        send_json({"success": True})
                    except sqlite3.IntegrityError:
                        send_json({"error": True, "message": "Username already exists"}, 400)
                    return True
                elif method == 'PUT' and len(path_parts) == 3:
                    user_id = path_parts[2]
                    data = json.loads(body_data)
                    username = data.get('username')
                    role = data.get('role')
                    company_code = data.get('company_code', '')
                    password = data.get('password')
                    
                    conn = get_db()
                    if password:
                        import hashlib
                        password_hash = hashlib.sha256(password.encode('utf-8')).hexdigest()
                        conn.execute("UPDATE users SET username=?, role=?, company_code=?, password_hash=? WHERE id=?", (username, role, company_code, password_hash, user_id))
                    else:
                        conn.execute("UPDATE users SET username=?, role=?, company_code=? WHERE id=?", (username, role, company_code, user_id))
                    conn.commit()
                    send_json({"success": True})
                    return True
                elif method == 'DELETE' and len(path_parts) == 3:
                    user_id = path_parts[2]
                    conn = get_db()
                    conn.execute("DELETE FROM users WHERE id=?", (user_id,))
                    conn.commit()
                    send_json({"success": True})
                    return True

            # Security Settings
            if len(path_parts) == 3 and path_parts[0] == 'api' and path_parts[1] == 'system' and path_parts[2] == 'security':
                if method == 'GET':
                    conn = get_db()
                    rows = conn.execute("SELECT key, value FROM system_settings").fetchall()
                    settings = {r['key']: r['value'] for r in rows}
                    send_json(settings)
                    return True
                elif method == 'POST':
                    # TODO check role=admin in real app, but here we assume caller is admin via UI constraint
                    data = json.loads(body_data)
                    conn = get_db()
                    for k, v in data.items():
                        conn.execute("INSERT INTO system_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", (k, str(v)))
                    conn.commit()
                    send_json({"success": True})
                    return True

            # VAT Lookup
            if len(path_parts) == 2 and path_parts[0] == 'api' and path_parts[1] == 'vat-lookup':
                if method == 'GET':
                    query_params = urllib.parse.parse_qs(parsed_url.query)
                    tax_id = query_params.get('taxId', [''])[0]
                    if not tax_id:
                        send_json({"error": True, "message": "Tax ID required"}, 400)
                        return True
                    result = lookup_vat_rd(tax_id)
                    if result.get("success"):
                        send_json(result)
                    else:
                        send_json(result, 400)
                    return True

            # 1. Companies
            if len(path_parts) == 2 and path_parts[0] == 'api' and path_parts[1] == 'companies':
                if method == 'GET':
                    conn = get_db()
                    rows = conn.execute("SELECT * FROM companies ORDER BY name ASC").fetchall()
                    conn.close()
                    send_json([dict(r) for r in rows])
                    return True
                elif method == 'POST':
                    data = json.loads(body_data)
                    code = data.get('code')
                    name = data.get('name')
                    if not code or not name:
                        send_json({"message": "Code and Name required"}, 400)
                        return True
                    conn = get_db()
                    conn.execute("INSERT INTO companies (code, name) VALUES (?, ?) ON CONFLICT(code) DO UPDATE SET name=excluded.name", (code, name))
                    conn.commit()
                    conn.close()
                    seed_default_accounts(code)
                    send_json({"success": True, "code": code, "name": name})
                    return True

            if len(path_parts) == 3 and path_parts[0] == 'api' and path_parts[1] == 'companies':
                if method == 'DELETE':
                    code = path_parts[2]
                    conn = get_db()
                    conn.execute("DELETE FROM companies WHERE code = ?", (code,))
                    conn.commit()
                    conn.close()
                    send_json({"success": True})
                    return True

            # 2. Settings (Key-Value per Company)
            if len(path_parts) == 3 and path_parts[0] == 'api' and path_parts[1] == 'settings':
                company_code = path_parts[2]
                if method == 'GET':
                    conn = get_db()
                    rows = conn.execute("SELECT key, value FROM settings WHERE company_code = ?", (company_code,)).fetchall()
                    conn.close()
                    settings_map = {}
                    for r in rows:
                        try:
                            settings_map[r['key']] = json.loads(r['value'])
                        except:
                            settings_map[r['key']] = r['value']
                    send_json(settings_map)
                    return True
                elif method == 'POST':
                    data = json.loads(body_data)
                    key = data.get('key')
                    if not key:
                        send_json({"message": "Key required"}, 400)
                        return True
                    
                    # If 'value' is explicitly provided, use it. Otherwise, treat the entire object (excluding 'key') as the value.
                    if 'value' in data:
                        value = data.get('value')
                    else:
                        value = dict(data)
                        value.pop('key', None)
                        
                    value_str = json.dumps(value) if isinstance(value, (dict, list)) else str(value)
                    conn = get_db()
                    conn.execute("INSERT INTO settings (company_code, key, value) VALUES (?, ?, ?) ON CONFLICT(company_code, key) DO UPDATE SET value=excluded.value",
                                 (company_code, key, value_str))
                    conn.commit()
                    conn.close()
                    send_json({"success": True})
                    return True

            # Copy COA to another company
            if len(path_parts) == 3 and path_parts[0] == 'api' and path_parts[1] == 'accounts' and path_parts[2] == 'copy-to-company':
                if method == 'POST':
                    data = json.loads(body_data)
                    from_company = data.get('fromCompanyCode')
                    to_company = data.get('toCompanyCode')
                    if not from_company or not to_company:
                        send_json({"message": "จำเป็นต้องระบุรหัสบริษัทต้นทางและปลายทาง"}, 400)
                        return True
                    if from_company == to_company:
                        send_json({"message": "บริษัทต้นทางและปลายทางต้องไม่เป็นบริษัทเดียวกัน"}, 400)
                        return True
                    
                    conn = get_db()
                    cursor = conn.cursor()
                    try:
                        # 1. Check if source company exists
                        src_exists = cursor.execute("SELECT 1 FROM companies WHERE code = ?", (from_company,)).fetchone()
                        if not src_exists:
                            send_json({"message": f"ไม่พบข้อมูลบริษัทต้นทาง {from_company}"}, 404)
                            return True
                        # 2. Check if target company exists
                        tgt_exists = cursor.execute("SELECT 1 FROM companies WHERE code = ?", (to_company,)).fetchone()
                        if not tgt_exists:
                            send_json({"message": f"ไม่พบข้อมูลบริษัทปลายทาง {to_company}"}, 404)
                            return True
                        
                        # 3. Check if target company has journal entries (transactions)
                        has_entries = cursor.execute("SELECT 1 FROM journal_entries WHERE company_code = ? LIMIT 1", (to_company,)).fetchone()
                        if has_entries:
                            send_json({"message": "ไม่สามารถคัดลอกผังบัญชีได้ เนื่องจากบริษัทปลายทางมีประวัติธุรกรรม (สมุดรายวัน) บันทึกไว้แล้ว"}, 400)
                            return True
                        
                        # SQLite transaction
                        # Delete existing accounts of target company
                        cursor.execute("DELETE FROM accounts WHERE company_code = ?", (to_company,))
                        
                        # Copy accounts from source company
                        cursor.execute("""
                            INSERT INTO accounts (company_code, code, name, category, parent_code, type, level, name_en)
                            SELECT ?, code, name, category, parent_code, type, level, name_en
                            FROM accounts WHERE company_code = ?
                        """, (to_company, from_company))
                        
                        # Copy balance_sheet_mapping setting
                        cursor.execute("DELETE FROM settings WHERE company_code = ? AND key = 'balance_sheet_mapping'", (to_company,))
                        cursor.execute("""
                            INSERT INTO settings (company_code, key, value)
                            SELECT ?, key, value FROM settings WHERE company_code = ? AND key = 'balance_sheet_mapping'
                        """, (to_company, from_company))
                        
                        conn.commit()
                        send_json({"success": True})
                    except Exception as e:
                        conn.rollback()
                        traceback.print_exc()
                        send_error(e)
                    finally:
                        conn.close()
                    return True

            # 3. Chart of Accounts
            if len(path_parts) == 3 and path_parts[0] == 'api' and path_parts[1] == 'accounts':
                company_code = path_parts[2]
                if method == 'GET':
                    conn = get_db()
                    rows = conn.execute("SELECT * FROM accounts WHERE company_code = ? ORDER BY code ASC", (company_code,)).fetchall()
                    conn.close()
                    result = []
                    for r in rows:
                        r_dict = dict(r)
                        r_dict['parentCode'] = r_dict.pop('parent_code', '')
                        r_dict['nameEn'] = r_dict.pop('name_en', '') or ''
                        result.append(r_dict)
                    send_json(result)
                    return True
                elif method == 'POST':
                    data = json.loads(body_data)
                    code = data.get('code')
                    name = data.get('name')
                    name_en = data.get('nameEn', data.get('name_en', ''))
                    category = data.get('category')
                    parent_code = data.get('parentCode', data.get('parent_code'))
                    ac_type = data.get('type', 'posting')
                    level = data.get('level', 1)
                    conn = get_db()
                    conn.execute("""
                        INSERT INTO accounts (company_code, code, name, name_en, category, parent_code, type, level) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(company_code, code) DO UPDATE SET 
                            name=excluded.name, 
                            name_en=excluded.name_en,
                            category=excluded.category, 
                            parent_code=excluded.parent_code,
                            type=excluded.type,
                            level=excluded.level
                    """, (company_code, code, name, name_en, category, parent_code or None, ac_type, level))
                    conn.commit()
                    conn.close()
                    send_json({"success": True})
                    return True

            if len(path_parts) == 4 and path_parts[0] == 'api' and path_parts[1] == 'accounts' and path_parts[3] == 'rename':
                company_code = path_parts[2]
                if method == 'POST':
                    data = json.loads(body_data)
                    old_code = data.get('oldCode')
                    new_code = data.get('newCode')
                    if not old_code or not new_code:
                        send_json({"message": "oldCode and newCode required"}, 400)
                        return True
                    
                    conn = get_db()
                    cursor = conn.cursor()
                    try:
                        # Validation
                        row = cursor.execute("SELECT 1 FROM accounts WHERE company_code = ? AND code = ?", (company_code, old_code)).fetchone()
                        if not row:
                            send_json({"message": f"Account code {old_code} not found"}, 404)
                            conn.close()
                            return True
                        
                        row = cursor.execute("SELECT 1 FROM accounts WHERE company_code = ? AND code = ?", (company_code, new_code)).fetchone()
                        if row:
                            send_json({"message": f"Account code {new_code} already exists"}, 400)
                            conn.close()
                            return True
                        
                        # SQLite transaction
                        cursor.execute("UPDATE accounts SET code = ? WHERE company_code = ? AND code = ?", (new_code, company_code, old_code))
                        cursor.execute("UPDATE accounts SET parent_code = ? WHERE company_code = ? AND parent_code = ?", (new_code, company_code, old_code))
                        
                        cursor.execute("""
                            UPDATE journal_items 
                            SET account_code = ? 
                            WHERE account_code = ? 
                              AND journal_entry_id IN (SELECT id FROM journal_entries WHERE company_code = ?)
                        """, (new_code, old_code, company_code))
                        
                        cursor.execute("UPDATE payment_methods SET account_code = ? WHERE company_code = ? AND account_code = ?", (new_code, company_code, old_code))
                        cursor.execute("UPDATE expense_catalog SET account_code = ? WHERE company_code = ? AND account_code = ?", (new_code, company_code, old_code))
                        
                        # petty_cash_payments JSON lines update
                        payments = cursor.execute("SELECT id, lines FROM petty_cash_payments WHERE company_code = ?", (company_code,)).fetchall()
                        for p in payments:
                            p_id = p['id']
                            lines_str = p['lines']
                            if lines_str:
                                try:
                                    lines_list = json.loads(lines_str)
                                    changed = False
                                    for line in lines_list:
                                        if line.get('accountCode') == old_code:
                                            line['accountCode'] = new_code
                                            changed = True
                                    if changed:
                                        cursor.execute("UPDATE petty_cash_payments SET lines = ? WHERE company_code = ? AND id = ?", (json.dumps(lines_list), company_code, p_id))
                                except Exception as e:
                                    print(f"Error updating petty_cash_payments line: {e}")
                                    
                        # petty_cash_reimbursements
                        cursor.execute("UPDATE petty_cash_reimbursements SET reimburse_account = ? WHERE company_code = ? AND reimburse_account = ?", (new_code, company_code, old_code))
                        reimbursements = cursor.execute("SELECT id, lines FROM petty_cash_reimbursements WHERE company_code = ?", (company_code,)).fetchall()
                        for r in reimbursements:
                            r_id = r['id']
                            lines_str = r['lines']
                            if lines_str:
                                try:
                                    lines_list = json.loads(lines_str)
                                    changed = False
                                    for line in lines_list:
                                        if line.get('accountCode') == old_code:
                                            line['accountCode'] = new_code
                                            changed = True
                                    if changed:
                                        cursor.execute("UPDATE petty_cash_reimbursements SET lines = ? WHERE company_code = ? AND id = ?", (json.dumps(lines_list), company_code, r_id))
                                except Exception as e:
                                    print(f"Error updating petty_cash_reimbursements line: {e}")
                                    
                        # settings balance_sheet_mapping
                        settings_row = cursor.execute("SELECT value FROM settings WHERE company_code = ? AND key = 'balance_sheet_mapping'", (company_code,)).fetchone()
                        if settings_row:
                            mapping_str = settings_row['value']
                            try:
                                mapping = json.loads(mapping_str)
                                changed = False
                                for key, val in mapping.items():
                                    if isinstance(val, str) and val:
                                        codes = [c.strip() for c in val.split(',')]
                                        new_codes = []
                                        for c in codes:
                                            if c == old_code:
                                                new_codes.append(new_code)
                                                changed = True
                                            else:
                                                new_codes.append(c)
                                        if changed:
                                            mapping[key] = ", ".join(new_codes)
                                if changed:
                                    cursor.execute("UPDATE settings SET value = ? WHERE company_code = ? AND key = 'balance_sheet_mapping'", (json.dumps(mapping), company_code))
                            except Exception as e:
                                print(f"Error updating balance_sheet_mapping setting: {e}")
                                
                        conn.commit()
                        send_json({"success": True})
                    except Exception as e:
                        conn.rollback()
                        traceback.print_exc()
                        send_error(e)
                    finally:
                        conn.close()
                    return True

            if len(path_parts) == 4 and path_parts[0] == 'api' and path_parts[1] == 'accounts':
                company_code = path_parts[2]
                code = path_parts[3]
                if method == 'DELETE':
                    # Backend safety checks
                    conn = get_db()
                    cursor = conn.cursor()
                    try:
                        # 1. Check core account
                        is_core = code in ('1000-00', '1100-00', '1110-00', '1111-00', '1112-00', '1120-00', '1121-00', 
                                           '2000-00', '2100-00', '2110-00', '2111-00', '3000-00', '4000-00', '5000-00', '9999-99')
                        if is_core:
                            send_json({"message": "ไม่สามารถลบบัญชีหลักของระบบได้"}, 400)
                            return True
                            
                        # 2. Check child accounts
                        has_child = cursor.execute("SELECT 1 FROM accounts WHERE company_code = ? AND parent_code = ? LIMIT 1", (company_code, code)).fetchone()
                        if has_child:
                            send_json({"message": "ไม่สามารถลบบัญชีนี้ได้ เนื่องจากมีบัญชีย่อยอยู่ภายใต้โครงสร้างนี้"}, 400)
                            return True
                            
                        # 3. Check journal entries & balance
                        has_entries = cursor.execute("""
                            SELECT 1 FROM journal_items 
                            WHERE account_code = ? 
                              AND journal_entry_id IN (SELECT id FROM journal_entries WHERE company_code = ?) 
                            LIMIT 1
                        """, (code, company_code)).fetchone()
                        if has_entries:
                            bal_row = cursor.execute("""
                                SELECT SUM(debit) - SUM(credit) as balance 
                                FROM journal_items 
                                WHERE account_code = ? 
                                  AND journal_entry_id IN (SELECT id FROM journal_entries WHERE company_code = ?)
                            """, (code, company_code)).fetchone()
                            balance = abs(bal_row['balance'] or 0.0)
                            
                            if balance > 0.01:
                                send_json({"message": "ไม่สามารถลบบัญชีนี้ได้ เนื่องจากบัญชีนี้ยังมียอดคงเหลืออยู่"}, 400)
                                return True
                            else:
                                send_json({"message": "ไม่สามารถลบบัญชีนี้ได้ เนื่องจากมีการบันทึกธุรกรรมในสมุดรายวันแล้ว"}, 400)
                                return True
                        
                        cursor.execute("DELETE FROM accounts WHERE company_code = ? AND code = ?", (company_code, code))
                        conn.commit()
                        send_json({"success": True})
                    except Exception as e:
                        conn.rollback()
                        traceback.print_exc()
                        send_error(e)
                    finally:
                        conn.close()
                    return True

            # 4. Journal Entries
            if len(path_parts) == 3 and path_parts[0] == 'api' and path_parts[1] == 'journal-entries':
                company_code = path_parts[2]
                if method == 'GET':
                    query_params = urllib.parse.parse_qs(parsed_url.query)
                    start_date = query_params.get('startDate', [None])[0]
                    end_date = query_params.get('endDate', [None])[0]
                    
                    conn = get_db()
                    query = "SELECT * FROM journal_entries WHERE company_code = ?"
                    params = [company_code]
                    if start_date:
                        query += " AND date >= ?"
                        params.append(start_date)
                    if end_date:
                        query += " AND date <= ?"
                        params.append(end_date)
                    query += " ORDER BY date ASC, id ASC"
                    
                    entries = conn.execute(query, params).fetchall()
                    result = [map_journal_entry_to_frontend(entry, conn) for entry in entries]
                    conn.close()
                    send_json(result)
                    return True
                
                elif method == 'POST':
                    data = json.loads(body_data)
                    je_id = data.get('id')
                    date = data.get('date')
                    reference = data.get('reference')
                    description = data.get('description')
                    is_posted = 1 if (data.get('isPosted') or data.get('is_posted')) else 0
                    is_opening = 1 if (data.get('isOpening') or data.get('is_opening')) else 0
                    vat_type = data.get('vatType', data.get('vat_type', 'none'))
                    vat_amount = data.get('vatAmount', data.get('vat_amount', 0.0))
                    wht_type = data.get('whtType', data.get('wht_type', 'none'))
                    wht_amount = data.get('whtAmount', data.get('wht_amount', 0.0))
                    party_name = data.get('partyName', data.get('party_name', ''))
                    tax_id = data.get('taxId', data.get('tax_id', ''))
                    
                    lines = data.get('lines', data.get('items', []))
                    last_updated = int(time.time() * 1000)
                    
                    conn = get_db()
                    cursor = conn.cursor()
                    try:
                        if je_id:
                            cursor.execute("""
                                UPDATE journal_entries 
                                SET date=?, reference=?, description=?, is_posted=?, is_opening=?, 
                                    vat_type=?, vat_amount=?, wht_type=?, wht_amount=?, party_name=?, tax_id=?, 
                                    last_updated=? 
                                WHERE id=? AND company_code=?
                            """, (date, reference, description, is_posted, is_opening, 
                                  vat_type, vat_amount, wht_type, wht_amount, party_name, tax_id, 
                                  last_updated, je_id, company_code))
                            cursor.execute("DELETE FROM journal_items WHERE journal_entry_id=?", (je_id,))
                        else:
                            cursor.execute("""
                                INSERT INTO journal_entries 
                                (company_code, date, reference, description, is_posted, is_opening, 
                                 vat_type, vat_amount, wht_type, wht_amount, party_name, tax_id, 
                                 last_updated) 
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """, (company_code, date, reference, description, is_posted, is_opening, 
                                  vat_type, vat_amount, wht_type, wht_amount, party_name, tax_id, 
                                  last_updated))
                            je_id = cursor.lastrowid
                            
                        for line in lines:
                            account_code = line.get('accountCode', line.get('account_code'))
                            debit = line.get('debit', 0.0)
                            credit = line.get('credit', 0.0)
                            line_desc = line.get('description', '')
                            cursor.execute("""
                                INSERT INTO journal_items 
                                (journal_entry_id, account_code, debit, credit, description) 
                                VALUES (?, ?, ?, ?, ?)
                            """, (je_id, account_code, debit, credit, line_desc))
                        conn.commit()
                        send_json({"success": True, "id": je_id})
                    except Exception as e:
                        conn.rollback()
                        print("ERROR in journal-entries POST. Payload data:", data)
                        traceback.print_exc()
                        send_error(e)
                    finally:
                        conn.close()
                    return True

            if len(path_parts) == 4 and path_parts[0] == 'api' and path_parts[1] == 'journal-entries':
                company_code = path_parts[2]
                je_id = path_parts[3]
                if method == 'GET':
                    conn = get_db()
                    entry = conn.execute("SELECT * FROM journal_entries WHERE id = ? AND company_code = ?", (je_id, company_code)).fetchone()
                    if not entry:
                        conn.close()
                        send_json({"message": "Journal Entry not found"}, 404)
                        return True
                    entry_dict = map_journal_entry_to_frontend(entry, conn)
                    conn.close()
                    send_json(entry_dict)
                    return True

                elif method == 'DELETE':
                    conn = get_db()
                    conn.execute("DELETE FROM journal_entries WHERE id = ? AND company_code = ?", (je_id, company_code))
                    conn.commit()
                    conn.close()
                    send_json({"success": True})
                    return True

            # Generic REST collections
            collections = {
                'contacts': 'contacts',
                'petty-cash-payments': 'petty_cash_payments',
                'petty-cash-reimbursements': 'petty_cash_reimbursements',
                'payment-methods': 'payment_methods',
                'expense-catalog': 'expense_catalog',
                'ar-receipts': 'ar_receipts',
                'ap-payments': 'ap_payments'
            }
            
            if len(path_parts) >= 3 and path_parts[0] == 'api' and path_parts[1] in collections:
                col_name = path_parts[1]
                table_name = collections[col_name]
                company_code = path_parts[2]
                
                # GET all items
                if len(path_parts) == 3 and method == 'GET':
                    conn = get_db()
                    rows = conn.execute(f"SELECT * FROM {table_name} WHERE company_code = ?", (company_code,)).fetchall()
                    conn.close()
                    result = []
                    for r in rows:
                        r_dict = dict(r)
                        if table_name == 'petty_cash_payments':
                            try: r_dict['lines'] = json.loads(r_dict['lines'])
                            except: r_dict['lines'] = []
                            r_dict['totalAmount'] = r_dict.pop('total_amount', 0.0)
                            r_dict['vrId'] = r_dict.pop('vr_id', '')
                            r_dict['contactCode'] = r_dict.pop('contact_code', '')
                            r_dict['whtType'] = r_dict.pop('wht_type', 'none')
                            r_dict['whtAmount'] = r_dict.pop('wht_amount', 0.0)
                            r_dict['vatType'] = r_dict.pop('vat_type', 'none')
                            r_dict['vatAmount'] = r_dict.pop('vat_amount', 0.0)
                            r_dict['taxInvoiceNo'] = r_dict.pop('tax_invoice_no', '')
                        elif table_name == 'petty_cash_reimbursements':
                            try: r_dict['lines'] = json.loads(r_dict['lines'])
                            except: r_dict['lines'] = []
                            try: r_dict['dpIds'] = json.loads(r_dict['dp_ids'])
                            except: r_dict['dpIds'] = []
                            r_dict['reimburseAccount'] = r_dict.pop('reimburse_account', '')
                            r_dict['totalAmount'] = r_dict.pop('total_amount', 0.0)
                            r_dict['journalId'] = r_dict.pop('journal_id', '')
                        elif table_name == 'payment_methods':
                            r_dict['accountCode'] = r_dict.pop('account_code', '')
                            r_dict['isCheque'] = r_dict.pop('is_cheque', 0)
                            r_dict['bankCode'] = r_dict.pop('bank_code', '')
                        elif table_name == 'expense_catalog':
                            r_dict['nameEn'] = r_dict.pop('name_en', '')
                            r_dict['vatType'] = r_dict.pop('vat_type', '')
                            r_dict['accountCode'] = r_dict.pop('account_code', '')
                        elif table_name == 'contacts':
                            r_dict['taxId'] = r_dict.pop('tax_id', '')
                            r_dict['creditTerm'] = r_dict.pop('credit_term', 0)
                            r_dict['contactPerson'] = r_dict.pop('contact_person', '')
                            r_dict['bankAccount'] = r_dict.pop('bank_account', '')
                            r_dict['isCustomer'] = r_dict.pop('is_customer', 0)
                            r_dict['isSupplier'] = r_dict.pop('is_supplier', 0)
                        result.append(r_dict)
                    send_json(result)
                    return True
                
                # POST item (insert or update)
                elif len(path_parts) == 3 and method == 'POST':
                    data = json.loads(body_data)
                    if table_name == 'petty_cash_payments':
                        if 'totalAmount' in data: data['total_amount'] = data.pop('totalAmount')
                        if 'vrId' in data: data['vr_id'] = data.pop('vrId')
                        if 'lines' in data: data['lines'] = json.dumps(data['lines'])
                        if 'contactCode' in data: data['contact_code'] = data.pop('contactCode')
                        if 'whtType' in data: data['wht_type'] = data.pop('whtType')
                        if 'whtAmount' in data: data['wht_amount'] = data.pop('whtAmount')
                        if 'vatType' in data: data['vat_type'] = data.pop('vatType')
                        if 'vatAmount' in data: data['vat_amount'] = data.pop('vatAmount')
                        if 'taxInvoiceNo' in data: data['tax_invoice_no'] = data.pop('taxInvoiceNo')
                    elif table_name == 'petty_cash_reimbursements':
                        if 'reimburseAccount' in data: data['reimburse_account'] = data.pop('reimburseAccount')
                        if 'totalAmount' in data: data['total_amount'] = data.pop('totalAmount')
                        if 'journalId' in data: data['journal_id'] = data.pop('journalId')
                        if 'dpIds' in data: data['dp_ids'] = json.dumps(data['dpIds'])
                        if 'lines' in data: data['lines'] = json.dumps(data['lines'])
                    elif table_name == 'payment_methods':
                        if 'accountCode' in data: data['account_code'] = data.pop('accountCode')
                        if 'isCheque' in data: data['is_cheque'] = 1 if data.pop('isCheque') else 0
                        if 'bankCode' in data: data['bank_code'] = data.pop('bankCode')
                    elif table_name == 'expense_catalog':
                        if 'nameEn' in data: data['name_en'] = data.pop('nameEn')
                        if 'vatType' in data: data['vat_type'] = data.pop('vatType')
                        if 'accountCode' in data: data['account_code'] = data.pop('accountCode')
                    elif table_name == 'contacts':
                        if 'taxId' in data: data['tax_id'] = data.pop('taxId')
                        if 'creditTerm' in data: data['credit_term'] = data.pop('creditTerm')
                        if 'contactPerson' in data: data['contact_person'] = data.pop('contactPerson')
                        if 'bankAccount' in data: data['bank_account'] = data.pop('bankAccount')
                        if 'isCustomer' in data: data['is_customer'] = data.pop('isCustomer')
                        if 'isSupplier' in data: data['is_supplier'] = data.pop('isSupplier')
                        if 'isCustomer' in data: data['is_customer'] = 1 if data.pop('isCustomer') else 0
                        if 'isSupplier' in data: data['is_supplier'] = 1 if data.pop('isSupplier') else 0
                        
                    conn = get_db()
                    cursor = conn.cursor()
                    
                    # Columns and placeholders from body (filtered to valid ones)
                    valid_cols = TABLE_COLUMNS.get(table_name, [])
                    keys = [k for k in data.keys() if k in valid_cols]
                    
                    # Ensure company_code is set if required
                    if 'company_code' in valid_cols and 'company_code' not in keys:
                        keys.append('company_code')
                        data['company_code'] = company_code
                        
                    val_placeholders = ", ".join(["?" for _ in keys])
                    cols = ", ".join([f"`{k}`" for k in keys])
                    vals = [data[k] for k in keys]
                    
                    try:
                        # Determine if we are updating or inserting
                        has_id = 'id' in data and data['id'] and 'id' in keys
                        has_code = 'code' in data and data['code'] and 'code' in keys
                        
                        if has_id:
                            # Check if the record already exists
                            exists = cursor.execute(f"SELECT 1 FROM {table_name} WHERE id=? AND company_code=?", (data['id'], company_code)).fetchone()
                            if exists:
                                # Update query
                                update_sets = ", ".join([f"`{k}`=?" for k in keys if k != 'id' and k != 'company_code'])
                                update_vals = [data[k] for k in keys if k != 'id' and k != 'company_code'] + [data['id'], company_code]
                                cursor.execute(f"UPDATE {table_name} SET {update_sets} WHERE id=? AND company_code=?", update_vals)
                                item_id = data['id']
                            else:
                                # Insert query (with predefined id)
                                cursor.execute(f"INSERT INTO {table_name} ({cols}) VALUES ({val_placeholders})", vals)
                                item_id = data['id']
                        elif has_code and table_name in ('payment_methods', 'expense_catalog'):
                            # Key code collections
                            update_sets = ", ".join([f"`{k}`=?" for k in keys if k != 'code' and k != 'company_code'])
                            update_vals = [data[k] for k in keys if k != 'code' and k != 'company_code'] + [data['code'], company_code]
                            cursor.execute(f"UPDATE {table_name} SET {update_sets} WHERE code=? AND company_code=?", update_vals)
                            # Check if anything updated, if not do insert
                            if cursor.rowcount == 0:
                                cursor.execute(f"INSERT INTO {table_name} ({cols}) VALUES ({val_placeholders})", vals)
                            item_id = data['code']
                        else:
                            # Standard insert
                            cursor.execute(f"INSERT INTO {table_name} ({cols}) VALUES ({val_placeholders})", vals)
                            item_id = cursor.lastrowid
                        
                        conn.commit()
                        send_json({"success": True, "id": item_id})
                    except Exception as e:
                        conn.rollback()
                        print("ERROR in generic POST. Payload data:", data)
                        print("valid_cols:", valid_cols, "keys:", keys, "vals:", vals)
                        traceback.print_exc()
                        send_error(e)
                    finally:
                        conn.close()
                    return True
                
                # DELETE item
                elif len(path_parts) == 4 and method == 'DELETE':
                    item_id = path_parts[3]
                    id_col = 'code' if table_name in ('payment_methods', 'expense_catalog') else 'id'
                    conn = get_db()
                    conn.execute(f"DELETE FROM {table_name} WHERE {id_col} = ? AND company_code = ?", (item_id, company_code))
                    conn.commit()
                    conn.close()
                    send_json({"success": True})
                    return True

            # Invoices & Bills (slightly custom because items lists are stored as JSON and party_id varies)
            invoice_bill_collections = {
                'invoices': ('invoices', 'customer_id'),
                'bills': ('bills', 'supplier_id')
            }
            if len(path_parts) >= 3 and path_parts[0] == 'api' and path_parts[1] in invoice_bill_collections:
                col_name = path_parts[1]
                table_name, party_id_field = invoice_bill_collections[col_name]
                company_code = path_parts[2]
                
                if len(path_parts) == 3 and method == 'GET':
                    conn = get_db()
                    if col_name == 'bills':
                        rows = conn.execute("""
                            SELECT b.*, COALESCE(b.vendor_name, s.name, '') as vendor_name_resolved
                            FROM bills b
                            LEFT JOIN contacts s ON b.supplier_id = s.id AND b.company_code = s.company_code
                            WHERE b.company_code = ? ORDER BY b.date DESC, b.id DESC
                        """, (company_code,)).fetchall()
                        conn.close()
                        result = []
                        for r in rows:
                            r_dict = dict(r)
                            try:
                                r_dict['items'] = json.loads(r_dict['items'])
                            except:
                                r_dict['items'] = []
                            try:
                                r_dict['payments'] = json.loads(r_dict['payments']) if r_dict.get('payments') else []
                            except:
                                r_dict['payments'] = []
                            # Map DB field names to JS-expected field names
                            r_dict['vendorName'] = r_dict.get('vendor_name_resolved') or r_dict.get('vendor_name') or ''
                            r_dict['totalAmount'] = r_dict.get('total', 0.0)
                            r_dict['vatRate'] = r_dict.get('vat_rate', 0.0)
                            r_dict['vatAmount'] = r_dict.get('vat_amount', 0.0)
                            r_dict['whtRate'] = r_dict.get('wht_rate', 0.0) or r_dict.get('tax_withheld', 0.0)
                            r_dict['whtAmount'] = r_dict.get('tax_withheld', 0.0)
                            r_dict['amountPaid'] = sum(p.get('amount', 0.0) for p in r_dict['payments']) if r_dict['payments'] else (r_dict['totalAmount'] if r_dict.get('status') == 'paid' else 0.0)
                            r_dict['outstanding'] = r_dict['totalAmount'] - r_dict['amountPaid']
                            r_dict['paymentAccount'] = r_dict.get('payment_account', '')
                            r_dict['paymentDate'] = r_dict.get('payment_date', r_dict.get('date', ''))
                            r_dict['taxId'] = r_dict.get('tax_id', '')
                            r_dict['address'] = r_dict.get('address', '')
                            r_dict['journalId'] = r_dict.get('journal_id', '')
                            result.append(r_dict)
                        send_json(result)
                        return True
                    else:
                        rows = conn.execute("""
                            SELECT i.*, COALESCE(i.customer_name, c.name, '') as customer_name_resolved
                            FROM invoices i
                            LEFT JOIN contacts c ON i.customer_id = c.id AND i.company_code = c.company_code
                            WHERE i.company_code = ? ORDER BY i.date DESC, i.id DESC
                        """, (company_code,)).fetchall()
                        conn.close()
                        result = []
                        for r in rows:
                            r_dict = dict(r)
                            try:
                                r_dict['items'] = json.loads(r_dict['items'])
                            except:
                                r_dict['items'] = []
                            try:
                                r_dict['payments'] = json.loads(r_dict['payments']) if r_dict.get('payments') else []
                            except:
                                r_dict['payments'] = []
                            r_dict['customerName'] = r_dict.get('customer_name_resolved') or r_dict.get('customer_name') or ''
                            r_dict['grandTotal'] = r_dict.get('total', 0.0)
                            r_dict['vatRate'] = r_dict.get('vat_rate', 0.0)
                            r_dict['vatAmount'] = r_dict.get('vat_amount', 0.0)
                            r_dict['whtRate'] = r_dict.get('wht_rate', 0.0) or r_dict.get('tax_withheld', 0.0)
                            r_dict['whtAmount'] = r_dict.get('tax_withheld', 0.0)
                            r_dict['netPayable'] = r_dict.get('net_payable', 0.0)
                            r_dict['taxId'] = r_dict.get('tax_id', '')
                            r_dict['address'] = r_dict.get('address', '')
                            r_dict['paymentDate'] = r_dict.get('payment_date', r_dict.get('date', ''))
                            r_dict['paymentAccount'] = r_dict.get('payment_account', '')
                            r_dict['amountPaid'] = sum(p.get('amount', 0.0) for p in r_dict['payments']) if r_dict['payments'] else (r_dict['grandTotal'] if r_dict.get('status') == 'paid' else 0.0)
                            r_dict['outstanding'] = r_dict['grandTotal'] - r_dict['amountPaid']
                            r_dict['journalId'] = r_dict.get('journal_id', '')
                            result.append(r_dict)
                        send_json(result)
                        return True
                
                elif len(path_parts) == 4 and method == 'GET':
                    doc_id = path_parts[3]
                    conn = get_db()
                    if col_name == 'bills':
                        row = conn.execute("""
                            SELECT b.*, COALESCE(b.vendor_name, s.name, '') as vendor_name_resolved
                            FROM bills b
                            LEFT JOIN contacts s ON b.supplier_id = s.id AND b.company_code = s.company_code
                            WHERE b.company_code = ? AND b.id = ?
                        """, (company_code, doc_id)).fetchone()
                        conn.close()
                        if not row:
                            send_json({"message": "Document not found"}, 404)
                            return True
                        r_dict = dict(row)
                        try:
                            r_dict['items'] = json.loads(r_dict['items'])
                        except:
                            r_dict['items'] = []
                        try:
                            r_dict['payments'] = json.loads(r_dict['payments']) if r_dict.get('payments') else []
                        except:
                            r_dict['payments'] = []
                        r_dict['vendorName'] = r_dict.get('vendor_name_resolved') or r_dict.get('vendor_name') or ''
                        r_dict['totalAmount'] = r_dict.get('total', 0.0)
                        r_dict['vatRate'] = r_dict.get('vat_rate', 0.0)
                        r_dict['vatAmount'] = r_dict.get('vat_amount', 0.0)
                        r_dict['whtRate'] = r_dict.get('wht_rate', 0.0) or r_dict.get('tax_withheld', 0.0)
                        r_dict['whtAmount'] = r_dict.get('tax_withheld', 0.0)
                        r_dict['amountPaid'] = sum(p.get('amount', 0.0) for p in r_dict['payments']) if r_dict['payments'] else (r_dict['totalAmount'] if r_dict.get('status') == 'paid' else 0.0)
                        r_dict['outstanding'] = r_dict['totalAmount'] - r_dict['amountPaid']
                        r_dict['paymentAccount'] = r_dict.get('payment_account', '')
                        r_dict['paymentDate'] = r_dict.get('payment_date', r_dict.get('date', ''))
                        r_dict['taxId'] = r_dict.get('tax_id', '')
                        r_dict['address'] = r_dict.get('address', '')
                        r_dict['journalId'] = r_dict.get('journal_id', '')
                        send_json(r_dict)
                        return True
                    else:
                        row = conn.execute("""
                            SELECT i.*, COALESCE(i.customer_name, c.name, '') as customer_name_resolved
                            FROM invoices i
                            LEFT JOIN contacts c ON i.customer_id = c.id AND i.company_code = c.company_code
                            WHERE i.company_code = ? AND i.id = ?
                        """, (company_code, doc_id)).fetchone()
                        conn.close()
                        if not row:
                            send_json({"message": "Document not found"}, 404)
                            return True
                        r_dict = dict(row)
                        try:
                            r_dict['items'] = json.loads(r_dict['items'])
                        except:
                            r_dict['items'] = []
                        try:
                            r_dict['payments'] = json.loads(r_dict['payments']) if r_dict.get('payments') else []
                        except:
                            r_dict['payments'] = []
                        r_dict['customerName'] = r_dict.get('customer_name_resolved') or r_dict.get('customer_name') or ''
                        r_dict['grandTotal'] = r_dict.get('total', 0.0)
                        r_dict['vatRate'] = r_dict.get('vat_rate', 0.0)
                        r_dict['vatAmount'] = r_dict.get('vat_amount', 0.0)
                        r_dict['whtRate'] = r_dict.get('wht_rate', 0.0) or r_dict.get('tax_withheld', 0.0)
                        r_dict['whtAmount'] = r_dict.get('tax_withheld', 0.0)
                        r_dict['netPayable'] = r_dict.get('net_payable', 0.0)
                        r_dict['taxId'] = r_dict.get('tax_id', '')
                        r_dict['address'] = r_dict.get('address', '')
                        r_dict['paymentDate'] = r_dict.get('payment_date', r_dict.get('date', ''))
                        r_dict['paymentAccount'] = r_dict.get('payment_account', '')
                        r_dict['amountPaid'] = sum(p.get('amount', 0.0) for p in r_dict['payments']) if r_dict['payments'] else (r_dict['grandTotal'] if r_dict.get('status') == 'paid' else 0.0)
                        r_dict['outstanding'] = r_dict['grandTotal'] - r_dict['amountPaid']
                        r_dict['journalId'] = r_dict.get('journal_id', '')
                        send_json(r_dict)
                        return True
                
                elif len(path_parts) == 3 and method == 'POST':
                    data = json.loads(body_data)
                    doc_id = data.get('id')
                    date = data.get('date')
                    party_id = data.get(party_id_field)
                    status = data.get('status')
                    # Accept both JS field names (totalAmount/vatRate/grandTotal) and DB names (total/vat_rate)
                    subtotal = data.get('subtotal', 0.0)
                    vat_rate = data.get('vatRate', data.get('vat_rate', 0.0))
                    vat_amount = data.get('vatAmount', data.get('vat_amount', 0.0))
                    total = data.get('grandTotal', data.get('totalAmount', data.get('total', 0.0)))
                    wht_rate = data.get('whtRate', data.get('wht_rate', 0.0))
                    tax_withheld = data.get('whtAmount', data.get('tax_withheld', 0.0))
                    net_payable = total - tax_withheld
                    items_str = json.dumps(data.get('items', []))
                    last_updated = data.get('last_updated', int(time.time() * 1000))
                    payment_date = data.get('paymentDate', data.get('payment_date', date))
                    payment_account = data.get('paymentAccount', data.get('payment_account', ''))
                    vendor_name_direct = data.get('customerName', data.get('vendorName', data.get('vendor_name', '')))
                    tax_id_direct = data.get('taxId', data.get('tax_id', ''))
                    address_direct = data.get('address', '')
                    payments_str = json.dumps(data.get('payments', []))
                    journal_id_direct = data.get('journalId', data.get('journal_id', ''))
                    
                    conn = get_db()
                    try:
                        cursor = conn.cursor()
                        if party_id is None:
                            if col_name == 'invoices':
                                cust_name = vendor_name_direct or 'ลูกค้าทั่วไป'
                                row = cursor.execute("SELECT id FROM contacts WHERE company_code=? AND name=?", (company_code, cust_name)).fetchone()
                                if row:
                                    party_id = row[0]
                                    if tax_id_direct or address_direct:
                                        cursor.execute("UPDATE contacts SET tax_id=COALESCE(?, tax_id), address=COALESCE(?, address), is_customer=1 WHERE id=?", (tax_id_direct or None, address_direct or None, party_id))
                                else:
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
                                    now_ts = int(time.time() * 1000)
                                    cursor.execute("INSERT INTO contacts (company_code, name, tax_id, address, is_customer, is_supplier, created_at, last_updated) VALUES (?, ?, ?, ?, 0, 1, ?, ?)", (company_code, supp_name, tax_id_direct or None, address_direct or None, now_ts, now_ts))
                                    party_id = cursor.lastrowid
                        else:
                            # If party_id is provided, try to update details if present
                            if col_name == 'invoices' and (tax_id_direct or address_direct):
                                cursor.execute("UPDATE contacts SET tax_id=COALESCE(?, tax_id), address=COALESCE(?, address), is_customer=1 WHERE id=?", (tax_id_direct or None, address_direct or None, party_id))
                            elif col_name == 'bills' and (tax_id_direct or address_direct):
                                cursor.execute("UPDATE contacts SET tax_id=COALESCE(?, tax_id), address=COALESCE(?, address), is_supplier=1 WHERE id=?", (tax_id_direct or None, address_direct or None, party_id))
                        
                        if col_name == 'bills':
                            # UPSERT for bills with extended fields and payments
                            conn.execute("""
                                INSERT INTO bills (
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
                            """, (doc_id, company_code, date, party_id, date, status, subtotal, vat_rate, vat_amount, total, tax_withheld, net_payable, items_str, last_updated, payment_date, payment_account, vendor_name_direct, wht_rate, tax_id_direct, address_direct, payments_str, journal_id_direct))
                        else:
                            # UPSERT for invoices with extended fields and payments
                            conn.execute("""
                                INSERT INTO invoices (
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
                            """, (doc_id, company_code, date, party_id, date, status, subtotal, vat_rate, vat_amount, total, tax_withheld, net_payable, items_str, last_updated, payment_date, payment_account, vendor_name_direct, wht_rate, tax_id_direct, address_direct, payments_str, journal_id_direct))
                        conn.commit()
                        send_json({"success": True, "id": doc_id})
                    except Exception as e:
                        traceback.print_exc()
                        send_error(e)
                    finally:
                        conn.close()
                    return True
                
                elif len(path_parts) == 4 and method == 'DELETE':
                    doc_id = path_parts[3]
                    conn = get_db()
                    conn.execute(f"DELETE FROM {table_name} WHERE company_code = ? AND id = ?", (company_code, doc_id))
                    conn.commit()
                    conn.close()
                    send_json({"success": True})
                    return True

            # 5. Products
            if len(path_parts) == 3 and path_parts[0] == 'api' and path_parts[1] == 'products':
                company_code = path_parts[2]
                if method == 'GET':
                    conn = get_db()
                    rows = conn.execute("SELECT * FROM products WHERE company_code = ? ORDER BY code ASC", (company_code,)).fetchall()
                    conn.close()
                    send_json([dict(r) for r in rows])
                    return True
                elif method == 'POST':
                    data = json.loads(body_data)
                    code = data.get('code')
                    name = data.get('name')
                    type_val = data.get('type')
                    category = data.get('category')
                    unit = data.get('unit')
                    standard_cost = data.get('standard_cost', 0.0)
                    standard_price = data.get('standard_price', 0.0)
                    description = data.get('description')
                    min_qty = data.get('min_qty', 0.0)
                    reorder_qty = data.get('reorder_qty', 0.0)
                    status = data.get('status', 'active')
                    
                    conn = get_db()
                    cursor = conn.cursor()
                    try:
                        cursor.execute("""
                            INSERT INTO products (
                                company_code, code, name, type, category, unit, 
                                standard_cost, standard_price, description, min_qty, reorder_qty, status
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            ON CONFLICT(company_code, code) DO UPDATE SET 
                                name=excluded.name, type=excluded.type, category=excluded.category, unit=excluded.unit, 
                                standard_cost=excluded.standard_cost, standard_price=excluded.standard_price, 
                                description=excluded.description, min_qty=excluded.min_qty, reorder_qty=excluded.reorder_qty, status=excluded.status
                        """, (company_code, code, name, type_val, category, unit, standard_cost, standard_price, description, min_qty, reorder_qty, status))
                        conn.commit()
                        product_id = cursor.lastrowid
                        # If this was an update, lastrowid might be empty, retrieve it
                        if not product_id:
                            row = conn.execute("SELECT id FROM products WHERE company_code=? AND code=?", (company_code, code)).fetchone()
                            product_id = row['id'] if row else None
                            
                        send_json({"success": True, "id": product_id})
                    except Exception as e:
                        traceback.print_exc()
                        send_error(e)
                    finally:
                        conn.close()
                    return True

            if len(path_parts) == 4 and path_parts[0] == 'api' and path_parts[1] == 'products':
                company_code = path_parts[2]
                code = path_parts[3]
                if method == 'DELETE':
                    conn = get_db()
                    conn.execute("DELETE FROM products WHERE company_code = ? AND code = ?", (company_code, code))
                    conn.commit()
                    conn.close()
                    send_json({"success": True})
                    return True

            # 6. Product Sets / BOM
            if len(path_parts) == 3 and path_parts[0] == 'api' and path_parts[1] == 'product-sets':
                parent_product_id = path_parts[2] # setProductId
                if method == 'GET':
                    conn = get_db()
                    rows = conn.execute("""
                        SELECT psi.*, p.code as component_product_code, p.name as component_product_name, p.unit as component_product_unit
                        FROM product_set_items psi
                        JOIN products p ON psi.member_product_id = p.id
                        WHERE psi.set_product_id = ?
                    """, (parent_product_id,)).fetchall()
                    conn.close()
                    send_json([dict(r) for r in rows])
                    return True
                elif method == 'POST':
                    components = json.loads(body_data) # List of {member_product_id, quantity}
                    conn = get_db()
                    cursor = conn.cursor()
                    try:
                        cursor.execute("DELETE FROM product_set_items WHERE set_product_id = ?", (parent_product_id,))
                        for comp in components:
                            cursor.execute("INSERT INTO product_set_items (set_product_id, member_product_id, quantity) VALUES (?, ?, ?)",
                                           (parent_product_id, comp.get('member_product_id'), comp.get('quantity')))
                        conn.commit()
                        send_json({"success": True})
                    except Exception as e:
                        conn.rollback()
                        print("ERROR in generic POST. Payload data:", data)
                        print("valid_cols:", valid_cols, "keys:", keys, "vals:", vals)
                        traceback.print_exc()
                        send_error(e)
                    finally:
                        conn.close()
                    return True

            # 7. Price Lists
            if len(path_parts) == 3 and path_parts[0] == 'api' and path_parts[1] == 'price-lists':
                company_code = path_parts[2]
                if method == 'GET':
                    conn = get_db()
                    rows = conn.execute("SELECT * FROM price_lists WHERE company_code = ?", (company_code,)).fetchall()
                    conn.close()
                    send_json([dict(r) for r in rows])
                    return True
                elif method == 'POST':
                    data = json.loads(body_data)
                    product_code = data.get('product_code')
                    price_tier = data.get('price_tier')
                    price = data.get('price', 0.0)
                    
                    conn = get_db()
                    try:
                        conn.execute("""
                            INSERT INTO price_lists (company_code, product_code, price_tier, price) VALUES (?, ?, ?, ?)
                            ON CONFLICT(company_code, product_code, price_tier) DO UPDATE SET price=excluded.price
                        """, (company_code, product_code, price_tier, price))
                        conn.commit()
                        send_json({"success": True})
                    except Exception as e:
                        traceback.print_exc()
                        send_error(e)
                    finally:
                        conn.close()
                    return True

            if len(path_parts) == 5 and path_parts[0] == 'api' and path_parts[1] == 'price-lists':
                company_code = path_parts[2]
                product_code = path_parts[3]
                price_tier = path_parts[4]
                if method == 'DELETE':
                    conn = get_db()
                    conn.execute("DELETE FROM price_lists WHERE company_code = ? AND product_code = ? AND price_tier = ?",
                                 (company_code, product_code, price_tier))
                    conn.commit()
                    conn.close()
                    send_json({"success": True})
                    return True

            # 8. Inventory Transactions (Stock Movements)
            if len(path_parts) == 3 and path_parts[0] == 'api' and path_parts[1] == 'inventory-transactions':
                company_code = path_parts[2]
                if method == 'GET':
                    query_params = urllib.parse.parse_qs(parsed_url.query)
                    product_id = query_params.get('productId', [None])[0]
                    
                    conn = get_db()
                    query = """
                        SELECT it.*, p.code as product_code, p.name as product_name, p.unit as product_unit 
                        FROM inventory_transactions it
                        JOIN products p ON it.product_id = p.id
                        WHERE it.company_code = ?
                    """
                    params = [company_code]
                    if product_id:
                        query += " AND it.product_id = ?"
                        params.append(product_id)
                    query += " ORDER BY it.date DESC, it.id DESC"
                    
                    rows = conn.execute(query, params).fetchall()
                    conn.close()
                    send_json([dict(r) for r in rows])
                    return True
                
                elif method == 'POST':
                    data = json.loads(body_data)
                    product_id = data.get('product_id')
                    date = data.get('date')
                    doc_ref = data.get('doc_ref')
                    transaction_type = data.get('transaction_type')
                    quantity = data.get('quantity')
                    unit_cost = data.get('unit_cost', 0.0)
                    description = data.get('description')
                    total_cost = quantity * unit_cost
                    
                    conn = get_db()
                    cursor = conn.cursor()
                    try:
                        cursor.execute("""
                            INSERT INTO inventory_transactions (company_code, product_id, date, doc_ref, transaction_type, quantity, unit_cost, total_cost, description)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, (company_code, product_id, date, doc_ref, transaction_type, quantity, unit_cost, total_cost, description))
                        conn.commit()
                        send_json({"success": True, "id": cursor.lastrowid})
                    except Exception as e:
                        conn.rollback()
                        print("ERROR in generic POST. Payload data:", data)
                        print("valid_cols:", valid_cols, "keys:", keys, "vals:", vals)
                        traceback.print_exc()
                        send_error(e)
                    finally:
                        conn.close()
                    return True

            if len(path_parts) == 3 and path_parts[0] == 'api' and path_parts[1] == 'inventory-transactions-bulk':
                company_code = path_parts[2]
                if method == 'POST':
                    data = json.loads(body_data)
                    transactions = data.get('transactions', [])
                    if not transactions:
                        send_json({"success": True})
                        return True
                    
                    conn = get_db()
                    cursor = conn.cursor()
                    try:
                        for t in transactions:
                            unit_cost = t.get('unit_cost', 0.0)
                            quantity = t.get('quantity', 0.0)
                            total = quantity * unit_cost
                            cursor.execute("""
                                INSERT INTO inventory_transactions (company_code, product_id, date, doc_ref, transaction_type, quantity, unit_cost, total_cost, description)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """, (company_code, t.get('product_id'), t.get('date'), t.get('doc_ref'), t.get('transaction_type'), quantity, unit_cost, total, t.get('description')))
                        conn.commit()
                        send_json({"success": True})
                    except Exception as e:
                        conn.rollback()
                        print("ERROR in generic POST. Payload data:", data)
                        print("valid_cols:", valid_cols, "keys:", keys, "vals:", vals)
                        traceback.print_exc()
                        send_error(e)
                    finally:
                        conn.close()
                    return True

            if len(path_parts) == 4 and path_parts[0] == 'api' and path_parts[1] == 'inventory-transactions':
                company_code = path_parts[2]
                doc_ref = path_parts[3]
                if method == 'DELETE':
                    conn = get_db()
                    conn.execute("DELETE FROM inventory_transactions WHERE company_code = ? AND doc_ref = ?", (company_code, doc_ref))
                    conn.commit()
                    conn.close()
                    send_json({"success": True})
                    return True

            # 9. Inventory Count Sheets
            if len(path_parts) == 3 and path_parts[0] == 'api' and path_parts[1] == 'inventory-counts':
                company_code = path_parts[2]
                if method == 'GET':
                    conn = get_db()
                    rows = conn.execute("SELECT * FROM inventory_counts WHERE company_code = ? ORDER BY date DESC, id DESC", (company_code,)).fetchall()
                    conn.close()
                    send_json([dict(r) for r in rows])
                    return True
                
                elif method == 'POST':
                    data = json.loads(body_data)
                    count_id = data.get('id')
                    date = data.get('date')
                    ref_no = data.get('ref_no')
                    status = data.get('status', 'draft')
                    description = data.get('description')
                    items = data.get('items', [])
                    
                    conn = get_db()
                    cursor = conn.cursor()
                    try:
                        if count_id:
                            cursor.execute("UPDATE inventory_counts SET date=?, ref_no=?, status=?, description=? WHERE id=? AND company_code=?",
                                           (date, ref_no, status, description, count_id, company_code))
                            cursor.execute("DELETE FROM inventory_count_items WHERE count_id=?", (count_id,))
                        else:
                            cursor.execute("""
                                INSERT INTO inventory_counts (company_code, date, ref_no, status, description) VALUES (?, ?, ?, ?, ?)
                                ON CONFLICT(company_code, ref_no) DO UPDATE SET date=excluded.date, status=excluded.status, description=excluded.description
                            """, (company_code, date, ref_no, status, description))
                            # get the id
                            if cursor.lastrowid:
                                count_id = cursor.lastrowid
                            else:
                                row = conn.execute("SELECT id FROM inventory_counts WHERE company_code=? AND ref_no=?", (company_code, ref_no)).fetchone()
                                count_id = row['id']
                                
                        for item in items:
                            cursor.execute("""
                                INSERT INTO inventory_count_items (count_id, product_id, system_qty, counted_qty, diff_qty, unit_cost)
                                VALUES (?, ?, ?, ?, ?, ?)
                            """, (count_id, item.get('product_id'), item.get('system_qty', 0.0), item.get('counted_qty', 0.0), item.get('diff_qty', 0.0), item.get('unit_cost', 0.0)))
                        conn.commit()
                        send_json({"success": True, "id": count_id})
                    except Exception as e:
                        conn.rollback()
                        print("ERROR in generic POST. Payload data:", data)
                        print("valid_cols:", valid_cols, "keys:", keys, "vals:", vals)
                        traceback.print_exc()
                        send_error(e)
                    finally:
                        conn.close()
                    return True

            if len(path_parts) == 4 and path_parts[0] == 'api' and path_parts[1] == 'inventory-counts':
                company_code = path_parts[2]
                count_id = path_parts[3]
                if method == 'GET':
                    conn = get_db()
                    count_sheet = conn.execute("SELECT * FROM inventory_counts WHERE id=? AND company_code=?", (count_id, company_code)).fetchone()
                    if not count_sheet:
                        conn.close()
                        send_json({"message": "Count sheet not found"}, 404)
                        return True
                    count_dict = dict(count_sheet)
                    items = conn.execute("""
                        SELECT ici.*, p.code as product_code, p.name as product_name, p.unit as product_unit
                        FROM inventory_count_items ici
                        JOIN products p ON ici.product_id = p.id
                        WHERE ici.count_id = ?
                    """, (count_id,)).fetchall()
                    count_dict['items'] = [dict(it) for it in items]
                    conn.close()
                    send_json(count_dict)
                    return True
                
                elif method == 'DELETE':
                    conn = get_db()
                    conn.execute("DELETE FROM inventory_counts WHERE id = ? AND company_code = ?", (count_id, company_code))
                    conn.commit()
                    conn.close()
                    send_json({"success": True})
                    return True

            # 10. Backup System (Import / Export)
            if len(path_parts) == 3 and path_parts[0] == 'api' and path_parts[1] == 'export-all':
                company_code = path_parts[2]
                conn = get_db()
                
                def export_table(tbl):
                    rows = conn.execute(f"SELECT * FROM {tbl} WHERE company_code = ?", (company_code,)).fetchall()
                    return [dict(r) for r in rows]

                # Format settings back into the list [{key, value}]
                settings_rows = export_table('settings')
                settings_list = []
                for s in settings_rows:
                    try:
                        val = json.loads(s['value'])
                    except:
                        val = s['value']
                    settings_list.append({"key": s['key'], "value": val})
                
                accounts = export_table('accounts')
                customers = export_table('customers')
                for c in customers:
                    c['taxId'] = c.pop('tax_id', '')
                    c['creditTerm'] = c.pop('credit_term', 0)
                    c['contactPerson'] = c.pop('contact_person', '')
                    
                suppliers = export_table('suppliers')
                for s in suppliers:
                    s['taxId'] = s.pop('tax_id', '')
                    s['creditTerm'] = s.pop('credit_term', 0)
                    s['contactPerson'] = s.pop('contact_person', '')
                    s['bankAccount'] = s.pop('bank_account', '')
                
                # Invoices / Bills items need to be parsed
                invoices = export_table('invoices')
                for inv in invoices:
                    try:
                        inv['items'] = json.loads(inv['items'])
                    except:
                        inv['items'] = []
                        
                bills = export_table('bills')
                for b in bills:
                    try:
                        b['items'] = json.loads(b['items'])
                    except:
                        b['items'] = []
                
                arReceipts = export_table('ar_receipts')
                apPayments = export_table('ap_payments')
                pettyCashPayments = export_table('petty_cash_payments')
                pettyCashReimbursements = export_table('petty_cash_reimbursements')
                paymentMethods = export_table('payment_methods')
                expenseCatalog = export_table('expense_catalog')
                products = export_table('products')
                
                # Journal Entries nested items
                je_rows = conn.execute("SELECT * FROM journal_entries WHERE company_code = ?", (company_code,)).fetchall()
                journal_entries_list = []
                for je in je_rows:
                    je_dict = dict(je)
                    items = conn.execute("SELECT * FROM journal_items WHERE journal_entry_id = ?", (je_dict['id'],)).fetchall()
                    je_dict['items'] = [dict(it) for it in items]
                    journal_entries_list.append(je_dict)
                    
                conn.close()
                
                send_json({
                    "settings": settings_list,
                    "accounts": accounts,
                    "customers": customers,
                    "suppliers": suppliers,
                    "journalEntries": journal_entries_list,
                    "invoices": invoices,
                    "bills": bills,
                    "arReceipts": arReceipts,
                    "apPayments": apPayments,
                    "pettyCashPayments": pettyCashPayments,
                    "pettyCashReimbursements": pettyCashReimbursements,
                    "paymentMethods": paymentMethods,
                    "expenseCatalog": expenseCatalog,
                    "products": products
                })
                return True

            if len(path_parts) == 3 and path_parts[0] == 'api' and path_parts[1] == 'import-all':
                company_code = path_parts[2]
                all_data = json.loads(body_data)
                
                conn = get_db()
                cursor = conn.cursor()
                try:
                    # Clear settings
                    cursor.execute("DELETE FROM settings WHERE company_code=?", (company_code,))
                    if all_data.get('settings'):
                        for s in all_data['settings']:
                            val_str = json.dumps(s['value']) if isinstance(s['value'], (dict, list)) else str(s['value'])
                            cursor.execute("INSERT INTO settings (company_code, key, value) VALUES (?, ?, ?)", (company_code, s['key'], val_str))

                    # Accounts
                    cursor.execute("DELETE FROM accounts WHERE company_code=?", (company_code,))
                    if all_data.get('accounts'):
                        for a in all_data['accounts']:
                            parent_code = a.get('parentCode', a.get('parent_code'))
                            ac_type = a.get('type', 'posting')
                            level = a.get('level', 1)
                            cursor.execute("""
                                INSERT INTO accounts (company_code, code, name, category, parent_code, type, level) 
                                VALUES (?, ?, ?, ?, ?, ?, ?)
                            """, (company_code, a['code'], a['name'], a['category'], parent_code or None, ac_type, level))

                    # Customers (maintain map because of autoincrement ID change)
                    cust_id_map = {}
                    cursor.execute("DELETE FROM customers WHERE company_code=?", (company_code,))
                    if all_data.get('customers'):
                        for c in all_data['customers']:
                            tax_id = c.get('taxId', c.get('tax_id', ''))
                            credit_term = c.get('creditTerm', c.get('credit_term', 0))
                            contact_person = c.get('contactPerson', c.get('contact_person', ''))
                            cursor.execute("""
                                INSERT INTO customers (company_code, name, email, phone, address, tax_id, credit_term, contact_person) 
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                            """, (company_code, c['name'], c.get('email'), c.get('phone'), c.get('address'), tax_id, credit_term, contact_person))
                            cust_id_map[c['id']] = cursor.lastrowid

                    # Suppliers (maintain map)
                    supp_id_map = {}
                    cursor.execute("DELETE FROM suppliers WHERE company_code=?", (company_code,))
                    if all_data.get('suppliers'):
                        for s in all_data['suppliers']:
                            tax_id = s.get('taxId', s.get('tax_id', ''))
                            credit_term = s.get('creditTerm', s.get('credit_term', 0))
                            contact_person = s.get('contactPerson', s.get('contact_person', ''))
                            bank_account = s.get('bankAccount', s.get('bank_account', ''))
                            cursor.execute("""
                                INSERT INTO suppliers (company_code, name, email, phone, address, tax_id, credit_term, contact_person, bank_account) 
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """, (company_code, s['name'], s.get('email'), s.get('phone'), s.get('address'), tax_id, credit_term, contact_person, bank_account))
                            supp_id_map[s['id']] = cursor.lastrowid

                    # Journal Entries
                    cursor.execute("DELETE FROM journal_entries WHERE company_code=?", (company_code,))
                    if all_data.get('journalEntries'):
                        for je in all_data['journalEntries']:
                            is_opening = 1 if (je.get('isOpening') or je.get('is_opening')) else 0
                            is_posted = 1 if (je.get('isPosted') or je.get('is_posted')) else 0
                            vat_type = je.get('vatType', je.get('vat_type', 'none'))
                            vat_amount = je.get('vatAmount', je.get('vat_amount', 0.0))
                            wht_type = je.get('whtType', je.get('wht_type', 'none'))
                            wht_amount = je.get('whtAmount', je.get('wht_amount', 0.0))
                            party_name = je.get('partyName', je.get('party_name', ''))
                            tax_id = je.get('taxId', je.get('tax_id', ''))
                            date = je.get('date')
                            reference = je.get('reference')
                            description = je.get('description')
                            last_updated = je.get('lastUpdated', je.get('last_updated', int(time.time()*1000)))
                            
                            cursor.execute("""
                                INSERT INTO journal_entries 
                                (company_code, date, reference, description, is_posted, is_opening, 
                                 vat_type, vat_amount, wht_type, wht_amount, party_name, tax_id, 
                                 last_updated) 
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """, (company_code, date, reference, description, is_posted, is_opening, 
                                  vat_type, vat_amount, wht_type, wht_amount, party_name, tax_id, 
                                  last_updated))
                            new_je_id = cursor.lastrowid
                            
                            lines = je.get('lines', je.get('items', []))
                            if lines:
                                for line in lines:
                                    account_code = line.get('accountCode', line.get('account_code'))
                                    debit = line.get('debit', 0.0)
                                    credit = line.get('credit', 0.0)
                                    line_desc = line.get('description', '')
                                    cursor.execute("""
                                        INSERT INTO journal_items 
                                        (journal_entry_id, account_code, debit, credit, description) 
                                        VALUES (?, ?, ?, ?, ?)
                                    """, (new_je_id, account_code, debit, credit, line_desc))


                    # Invoices
                    cursor.execute("DELETE FROM invoices WHERE company_code=?", (company_code,))
                    if all_data.get('invoices'):
                        for inv in all_data['invoices']:
                            old_cust_id = inv.get('customer_id')
                            new_cust_id = cust_id_map.get(old_cust_id, old_cust_id)
                            items_str = json.dumps(inv.get('items', []))
                            cursor.execute("""
                                INSERT INTO invoices (id, company_code, date, customer_id, due_date, status, subtotal, vat_rate, vat_amount, total, tax_withheld, net_payable, items, last_updated)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """, (inv['id'], company_code, inv['date'], new_cust_id, inv.get('due_date', inv['date']), inv['status'], inv.get('subtotal', 0.0), inv.get('vat_rate', 0.0), inv.get('vat_amount', 0.0), inv.get('total', 0.0), inv.get('tax_withheld', 0.0), inv.get('net_payable', 0.0), items_str, inv.get('last_updated', int(time.time()*1000))))

                    # Bills
                    cursor.execute("DELETE FROM bills WHERE company_code=?", (company_code,))
                    if all_data.get('bills'):
                        for bill in all_data['bills']:
                            old_supp_id = bill.get('supplier_id')
                            new_supp_id = supp_id_map.get(old_supp_id, old_supp_id)
                            items_str = json.dumps(bill.get('items', []))
                            cursor.execute("""
                                INSERT INTO bills (id, company_code, date, supplier_id, due_date, status, subtotal, vat_rate, vat_amount, total, tax_withheld, net_payable, items, last_updated)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """, (bill['id'], company_code, bill['date'], new_supp_id, bill.get('due_date', bill['date']), bill['status'], bill.get('subtotal', 0.0), bill.get('vat_rate', 0.0), bill.get('vat_amount', 0.0), bill.get('total', 0.0), bill.get('tax_withheld', 0.0), bill.get('net_payable', 0.0), items_str, bill.get('last_updated', int(time.time()*1000))))

                    # arReceipts
                    cursor.execute("DELETE FROM ar_receipts WHERE company_code=?", (company_code,))
                    if all_data.get('arReceipts'):
                        for r in all_data['arReceipts']:
                            old_cust_id = r.get('customer_id')
                            new_cust_id = cust_id_map.get(old_cust_id, old_cust_id)
                            cursor.execute("INSERT INTO ar_receipts (id, company_code, date, invoice_id, customer_id, amount, payment_method, reference_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                                           (r['id'], company_code, r['date'], r['invoice_id'], new_cust_id, r['amount'], r['payment_method'], r.get('reference_no')))

                    # apPayments
                    cursor.execute("DELETE FROM ap_payments WHERE company_code=?", (company_code,))
                    if all_data.get('apPayments'):
                        for p in all_data['apPayments']:
                            old_supp_id = p.get('supplier_id')
                            new_supp_id = supp_id_map.get(old_supp_id, old_supp_id)
                            cursor.execute("INSERT INTO ap_payments (id, company_code, date, bill_id, supplier_id, amount, payment_method, reference_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                                           (p['id'], company_code, p['date'], p['bill_id'], new_supp_id, p['amount'], p['payment_method'], p.get('reference_no')))

                    # pettyCashPayments
                    cursor.execute("DELETE FROM petty_cash_payments WHERE company_code=?", (company_code,))
                    if all_data.get('pettyCashPayments'):
                        for p in all_data['pettyCashPayments']:
                            cursor.execute("INSERT INTO petty_cash_payments (id, company_code, date, payee, description, amount, expense_account_code, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                                           (p['id'], company_code, p['date'], p.get('payee', p.get('paid_to', 'ผู้รับเงิน')), p.get('description'), p['amount'], p['expense_account_code'], p['status']))

                    # pettyCashReimbursements
                    cursor.execute("DELETE FROM petty_cash_reimbursements WHERE company_code=?", (company_code,))
                    if all_data.get('pettyCashReimbursements'):
                        for p in all_data['pettyCashReimbursements']:
                            cursor.execute("INSERT INTO petty_cash_reimbursements (id, company_code, date, reference, amount, status, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?)",
                                           (p['id'], company_code, p['date'], p.get('reference', p.get('reference_no', '')), p['amount'], p['status'], p['payment_method']))

                    # paymentMethods
                    cursor.execute("DELETE FROM payment_methods WHERE company_code=?", (company_code,))
                    if all_data.get('paymentMethods'):
                        for p in all_data['paymentMethods']:
                            cursor.execute("INSERT INTO payment_methods (company_code, code, name, account_code) VALUES (?, ?, ?, ?)",
                                           (company_code, p['code'], p['name'], p['account_code']))

                    # expenseCatalog
                    cursor.execute("DELETE FROM expense_catalog WHERE company_code=?", (company_code,))
                    if all_data.get('expenseCatalog'):
                        for p in all_data['expenseCatalog']:
                            cursor.execute("INSERT INTO expense_catalog (company_code, code, name, account_code) VALUES (?, ?, ?, ?)",
                                           (company_code, p['code'], p['name'], p['account_code']))

                    # products
                    cursor.execute("DELETE FROM products WHERE company_code=?", (company_code,))
                    if all_data.get('products'):
                        for p in all_data['products']:
                            cursor.execute("""
                                INSERT INTO products (company_code, code, name, type, category, unit, standard_cost, standard_price, description, min_qty, reorder_qty, status)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """, (company_code, p['code'], p['name'], p.get('type', 'product'), p.get('category'), p['unit'], p.get('standard_cost', 0.0), p.get('standard_price', 0.0), p.get('description'), p.get('min_qty', 0.0), p.get('reorder_qty', 0.0), p.get('status', 'active')))

                    conn.commit()
                    send_json({"success": True})
                except Exception as e:
                    conn.rollback()
                    traceback.print_exc()
                    send_error(e)
                finally:
                    conn.close()
                return True

        except Exception as e:
            traceback.print_exc()
            send_error(e)
            return True
        return False

api_router = APIRouter()

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Prevent caching of static assets and API calls to avoid browser caching issues during updates
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_OPTIONS(self):
        if self.path.startswith('/api/'):
            api_router.handle_request(self, 'OPTIONS', urllib.parse.urlparse(self.path), '')
        else:
            super().do_OPTIONS()

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        if parsed_url.path.startswith('/api/'):
            handled = api_router.handle_request(self, 'GET', parsed_url, '')
            if not handled:
                self.send_error(404, "API endpoint not found")
        else:
            # Fallback to index.html for client SPA routes
            clean_path = parsed_url.path.strip('/')
            local_file_path = os.path.join(os.path.dirname(__file__), clean_path)
            
            # If the path does not exist on disk and doesn't look like a file with an extension, serve index.html
            if not os.path.exists(local_file_path) and '.' not in os.path.basename(parsed_url.path):
                self.path = '/index.html'
                
            super().do_GET()

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        if parsed_url.path.startswith('/api/'):
            content_length = int(self.headers.get('Content-Length', 0))
            body_data = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else ''
            handled = api_router.handle_request(self, 'POST', parsed_url, body_data)
            if not handled:
                self.send_error(404, "API endpoint not found")
        else:
            self.send_error(405, "Method not allowed")

    
    def do_PUT(self):
        import urllib.parse
        parsed_url = urllib.parse.urlparse(self.path)
        if parsed_url.path.startswith('/api/'):
            content_length = int(self.headers.get('Content-Length', 0))
            body_data = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else ''
            handled = api_router.handle_request(self, 'PUT', parsed_url, body_data)
            if not handled:
                self.send_error(404, "API endpoint not found")
        else:
            self.send_error(403, "PUT not allowed for static files")

    def do_DELETE(self):
        parsed_url = urllib.parse.urlparse(self.path)
        if parsed_url.path.startswith('/api/'):
            handled = api_router.handle_request(self, 'DELETE', parsed_url, '')
            if not handled:
                self.send_error(404, "API endpoint not found")
        else:
            self.send_error(405, "Method not allowed")

def open_browser():
    time.sleep(1.5)
    print("Launching browser to http://127.0.0.1:8085...")
    webbrowser.open('http://127.0.0.1:8085')

def run_server():
    initialize_database()
    
    # Enable socket re-use to prevent address already in use errors
    socketserver.TCPServer.allow_reuse_address = True
    
    with socketserver.TCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
        print(f"==========================================================")
        print(f"   ERP Accounting & Inventory Server Started Successfully")
        print(f"   Local Address: http://127.0.0.1:{PORT}")
        print(f"   Database: SQLite (database/accounting.db)")
        print(f"==========================================================")
        
        # Start browser thread only if running locally (no PORT env var)
        if 'PORT' not in os.environ:
            threading.Thread(target=open_browser, daemon=True).start()
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")

if __name__ == "__main__":
    run_server()
