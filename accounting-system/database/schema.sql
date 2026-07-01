-- database/schema.sql
-- DDL Script to initialize MySQL Database for Accounting & Inventory System

CREATE DATABASE IF NOT EXISTS accounting_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE accounting_db;

-- 1. Companies Table
CREATE TABLE IF NOT EXISTS companies (
    code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Settings Table
CREATE TABLE IF NOT EXISTS settings (
    company_code VARCHAR(50) NOT NULL,
    `key` VARCHAR(100) NOT NULL,
    value TEXT,
    PRIMARY KEY (company_code, `key`),
    FOREIGN KEY (company_code) REFERENCES companies(code) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3. Chart of Accounts Table
CREATE TABLE IF NOT EXISTS accounts (
    company_code VARCHAR(50) NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'assets', 'liabilities', 'equity', 'revenue', 'expenses'
    parent_code VARCHAR(50) NULL,
    PRIMARY KEY (company_code, code),
    FOREIGN KEY (company_code) REFERENCES companies(code) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. Journal Entries Table
CREATE TABLE IF NOT EXISTS journal_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_code VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    reference VARCHAR(100) NOT NULL,
    description TEXT,
    is_posted TINYINT(1) DEFAULT 0,
    last_updated BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_code) REFERENCES companies(code) ON DELETE CASCADE,
    INDEX idx_company_date (company_code, date)
) ENGINE=InnoDB;

-- 5. Journal Items (Debit/Credit lines) Table
CREATE TABLE IF NOT EXISTS journal_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    journal_entry_id INT NOT NULL,
    account_code VARCHAR(50) NOT NULL,
    debit DECIMAL(15,2) DEFAULT 0.00,
    credit DECIMAL(15,2) DEFAULT 0.00,
    description TEXT,
    FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
    INDEX idx_entry_account (journal_entry_id, account_code)
) ENGINE=InnoDB;

-- 6. Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NULL,
    phone VARCHAR(50) NULL,
    address TEXT,
    tax_id VARCHAR(20) NULL,
    credit_term INT DEFAULT 0,
    contact_person VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_code) REFERENCES companies(code) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 7. Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NULL,
    phone VARCHAR(50) NULL,
    address TEXT,
    tax_id VARCHAR(20) NULL,
    credit_term INT DEFAULT 0,
    contact_person VARCHAR(255) NULL,
    bank_account VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_code) REFERENCES companies(code) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 8. Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(100) NOT NULL,
    company_code VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    customer_id INT NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'draft', 'unpaid', 'paid', 'overdue'
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    vat_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    vat_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    tax_withheld DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    net_payable DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    items TEXT NOT NULL, -- JSON formatted array of invoice items
    last_updated BIGINT NOT NULL,
    PRIMARY KEY (company_code, id),
    FOREIGN KEY (company_code) REFERENCES companies(code) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    INDEX idx_company_invoice_date (company_code, date)
) ENGINE=InnoDB;

-- 9. Bills Table
CREATE TABLE IF NOT EXISTS bills (
    id VARCHAR(100) NOT NULL,
    company_code VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    supplier_id INT NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'draft', 'unpaid', 'paid', 'overdue'
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    vat_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    vat_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    tax_withheld DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    net_payable DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    items TEXT NOT NULL, -- JSON formatted array of bill items
    last_updated BIGINT NOT NULL,
    PRIMARY KEY (company_code, id),
    FOREIGN KEY (company_code) REFERENCES companies(code) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
    INDEX idx_company_bill_date (company_code, date)
) ENGINE=InnoDB;

-- 10. AR Receipts Table
CREATE TABLE IF NOT EXISTS ar_receipts (
    id VARCHAR(100) NOT NULL,
    company_code VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    invoice_id VARCHAR(100) NOT NULL,
    customer_id INT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(100) NOT NULL,
    reference_no VARCHAR(100) NULL,
    journal_entry_id INT NULL,
    PRIMARY KEY (company_code, id),
    FOREIGN KEY (company_code) REFERENCES companies(code) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 11. AP Payments Table
CREATE TABLE IF NOT EXISTS ap_payments (
    id VARCHAR(100) NOT NULL,
    company_code VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    bill_id VARCHAR(100) NOT NULL,
    supplier_id INT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(100) NOT NULL,
    reference_no VARCHAR(100) NULL,
    journal_entry_id INT NULL,
    PRIMARY KEY (company_code, id),
    FOREIGN KEY (company_code) REFERENCES companies(code) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
    FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 12. Petty Cash Payments (DP) Table
CREATE TABLE IF NOT EXISTS petty_cash_payments (
    id VARCHAR(100) NOT NULL,
    company_code VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    payee VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(15,2) NOT NULL,
    expense_account_code VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'unreimbursed', 'reimbursed'
    journal_entry_id INT NULL,
    PRIMARY KEY (company_code, id),
    FOREIGN KEY (company_code) REFERENCES companies(code) ON DELETE CASCADE,
    FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 13. Petty Cash Reimbursements (VR) Table
CREATE TABLE IF NOT EXISTS petty_cash_reimbursements (
    id VARCHAR(100) NOT NULL,
    company_code VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    reference VARCHAR(100) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'draft', 'reimbursed'
    payment_method VARCHAR(100) NOT NULL,
    journal_entry_id INT NULL,
    PRIMARY KEY (company_code, id),
    FOREIGN KEY (company_code) REFERENCES companies(code) ON DELETE CASCADE,
    FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 14. Payment Methods Catalog Table
CREATE TABLE IF NOT EXISTS payment_methods (
    company_code VARCHAR(50) NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    account_code VARCHAR(50) NOT NULL,
    PRIMARY KEY (company_code, code),
    FOREIGN KEY (company_code) REFERENCES companies(code) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 15. Expense Catalog Table
CREATE TABLE IF NOT EXISTS expense_catalog (
    company_code VARCHAR(50) NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    account_code VARCHAR(50) NOT NULL,
    PRIMARY KEY (company_code, code),
    FOREIGN KEY (company_code) REFERENCES companies(code) ON DELETE CASCADE
) ENGINE=InnoDB;


-- ==========================================
-- INVENTORY (ระบบสินค้า) TABLES
-- ==========================================

-- 16. Products & Services Master Table
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_code VARCHAR(50) NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'product', 'service', 'set'
    category VARCHAR(100) NULL,
    unit VARCHAR(50) NOT NULL,
    standard_cost DECIMAL(15,2) DEFAULT 0.00,
    standard_price DECIMAL(15,2) DEFAULT 0.00,
    description TEXT,
    min_qty DECIMAL(12,2) DEFAULT 0.00,     -- จุดสั่งซื้อขั้นต่ำ (Reorder Point)
    reorder_qty DECIMAL(12,2) DEFAULT 0.00, -- จำนวนสั่งซื้อแนะนำ
    status VARCHAR(50) DEFAULT 'active',    -- 'active', 'inactive'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_code) REFERENCES companies(code) ON DELETE CASCADE,
    UNIQUE KEY unique_company_product_code (company_code, code)
) ENGINE=InnoDB;

-- 17. Product Set / Bundle Items Table (BOM for sets)
CREATE TABLE IF NOT EXISTS product_set_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    set_product_id INT NOT NULL,
    member_product_id INT NOT NULL,
    quantity DECIMAL(12,2) NOT NULL,
    FOREIGN KEY (set_product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (member_product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 18. Price Lists Table (ตารางราคาขาย)
CREATE TABLE IF NOT EXISTS price_lists (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_code VARCHAR(50) NOT NULL,
    product_id INT NOT NULL,
    tier_name VARCHAR(100) NOT NULL, -- e.g., 'Retail', 'Wholesale', 'VIP', 'Member'
    price DECIMAL(15,2) NOT NULL,
    FOREIGN KEY (company_code) REFERENCES companies(code) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_company_product_tier (company_code, product_id, tier_name)
) ENGINE=InnoDB;

-- 19. Inventory Transactions (ความเคลื่อนไหวสินค้าประจำวัน)
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_code VARCHAR(50) NOT NULL,
    product_id INT NOT NULL,
    date DATE NOT NULL,
    doc_ref VARCHAR(100) NOT NULL, -- เอกสารอ้างอิง เช่น IV-xxx (ขาย), BL-xxx (ซื้อ), PC-xxx (ตรวจนับ/ปรับปรุง)
    transaction_type VARCHAR(50) NOT NULL, -- 'in' (ซื้อเข้า/รับคืน), 'out' (ขายออก/เบิกจ่าย), 'adjust_in' (ปรับยอดเพิ่ม), 'adjust_out' (ปรับยอดลด)
    quantity DECIMAL(12,2) NOT NULL, -- จำนวนบวก/ลบ
    unit_cost DECIMAL(15,2) DEFAULT 0.00,
    total_cost DECIMAL(15,2) DEFAULT 0.00,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_code) REFERENCES companies(code) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_company_product_date (company_code, product_id, date)
) ENGINE=InnoDB;

-- 20. Inventory Count Sheets Table (การตรวจนับสินค้า)
CREATE TABLE IF NOT EXISTS inventory_counts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_code VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    ref_no VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'draft', 'posted'
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_code) REFERENCES companies(code) ON DELETE CASCADE,
    UNIQUE KEY unique_company_count_ref (company_code, ref_no)
) ENGINE=InnoDB;

-- 21. Inventory Count Sheet Items
CREATE TABLE IF NOT EXISTS inventory_count_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    count_id INT NOT NULL,
    product_id INT NOT NULL,
    system_qty DECIMAL(12,2) NOT NULL,
    counted_qty DECIMAL(12,2) NOT NULL,
    diff_qty DECIMAL(12,2) NOT NULL,
    unit_cost DECIMAL(15,2) NOT NULL,
    FOREIGN KEY (count_id) REFERENCES inventory_counts(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;
