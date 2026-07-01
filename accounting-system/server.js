// server.js - Full-stack Node.js Backend Server for Accounting & Inventory System
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8085;

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Support large payloads like bulk import
app.use(express.urlencoded({ limit: '50mb', extended: true }));

let pool;

/**
 * Initialize MySQL connection and create database/tables if not exist
 */
async function initializeDatabase() {
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        port: parseInt(process.env.DB_PORT || '3306'),
        multipleStatements: true
    };

    console.log(`Connecting to MySQL at ${dbConfig.host}:${dbConfig.port}...`);

    try {
        // 1. First connection without database name
        const connection = await mysql.createConnection(dbConfig);
        
        // Create database if not exists
        const dbName = process.env.DB_NAME || 'accounting_db';
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        await connection.end();
        
        // 2. Establish connection pool with database name
        dbConfig.database = dbName;
        pool = mysql.createPool(dbConfig);
        console.log(`Successfully connected to database pool: \`${dbName}\``);

        // 3. Initialize schema from schema.sql if tables don't exist
        const schemaPath = path.join(__dirname, 'database', 'schema.sql');
        if (fs.existsSync(schemaPath)) {
            const schemaSql = fs.readFileSync(schemaPath, 'utf8');
            await pool.query(schemaSql);
            console.log("Database schema tables verified/created successfully.");
        } else {
            console.warn("WARNING: database/schema.sql file not found. Skipping auto-initialization.");
        }
    } catch (err) {
        console.error("FATAL ERROR: Failed to initialize MySQL database.", err.message);
        console.error("Please verify that your MySQL server is running and your .env configuration is correct.");
        process.exit(1);
    }
}

// ==========================================
// REST API ENDPOINTS
// ==========================================

// Helper to handle async route errors
const asyncHandler = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(err => {
        console.error(`API Error [${req.method} ${req.url}]:`, err);
        res.status(500).json({ error: true, message: err.message });
    });
};

// VAT Lookup from Revenue Department
app.get('/api/vat-lookup', asyncHandler(async (req, res) => {
    const { taxId } = req.query;
    if (!taxId) {
        return res.status(400).json({ error: true, message: 'Tax ID required' });
    }

    try {
        const result = await new Promise((resolve, reject) => {
            const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <Service xmlns="https://rdws.rd.go.th/JserviceRD3/vatserviceRD3">
      <username>anonymous</username>
      <password>anonymous</password>
      <TIN>${taxId}</TIN>
      <Name></Name>
      <ProvinceCode>0</ProvinceCode>
      <BranchNumber>0</BranchNumber>
      <AmphurCode>0</AmphurCode>
    </Service>
  </soap:Body>
</soap:Envelope>`;

            const postData = Buffer.from(soapBody, 'utf8');

            const options = {
                hostname: 'rdws.rd.go.th',
                port: 443,
                path: '/jsonRD/vatserviceRD3.asmx',
                method: 'POST',
                rejectUnauthorized: false,
                headers: {
                    'Content-Type': 'text/xml; charset=utf-8',
                    'SOAPAction': 'https://rdws.rd.go.th/JserviceRD3/vatserviceRD3/Service',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Content-Length': postData.length
                }
            };

            const request = https.request(options, (response) => {
                let data = '';
                response.on('data', (chunk) => {
                    data += chunk;
                });
                response.on('end', () => {
                    try {
                        const match = data.match(/<ServiceResult[^>]*>([\s\S]*?)<\/ServiceResult>/);
                        if (!match) {
                            return resolve({ success: false, message: 'Invalid response from RD service' });
                        }
                        let jsonText = match[1];
                        jsonText = jsonText
                            .replace(/&amp;/g, '&')
                            .replace(/&lt;/g, '<')
                            .replace(/&gt;/g, '>')
                            .replace(/&quot;/g, '"')
                            .replace(/&apos;/g, "'");
                        
                        const parsed = JSON.parse(jsonText);
                        
                        if (parsed.msgerr && parsed.msgerr.some(err => err)) {
                            const err_msg = parsed.msgerr.filter(err => err).join(' ').replace(/<[^>]*>/g, '').trim();
                            return resolve({ success: false, message: err_msg || 'Data not found' });
                        }

                        const names = parsed.Name;
                        if (!names || !names.some(n => n)) {
                            return resolve({ success: false, message: 'Company not found in VAT database' });
                        }

                        const title = parsed.TitleName && parsed.TitleName[0] && parsed.TitleName[0] !== '-' ? parsed.TitleName[0].trim() : '';
                        const name = parsed.Name && parsed.Name[0] && parsed.Name[0] !== '-' ? parsed.Name[0].trim() : '';
                        const surname = parsed.Surname && parsed.Surname[0] && parsed.Surname[0] !== '-' ? parsed.Surname[0].trim() : '';
                        const fullName = [title, name, surname].filter(Boolean).join(' ');

                        const parts = [];
                        const addPart = (val, prefix = '') => {
                            if (val && val !== '-') {
                                parts.push(`${prefix}${val.trim()}`);
                            }
                        };

                        const house = parsed.HouseNumber && parsed.HouseNumber[0] ? parsed.HouseNumber[0] : '';
                        const moo = parsed.MooNumber && parsed.MooNumber[0] ? parsed.MooNumber[0] : '';
                        const bldg = parsed.BuildingName && parsed.BuildingName[0] ? parsed.BuildingName[0] : '';
                        const floor = parsed.FloorNumber && parsed.FloorNumber[0] ? parsed.FloorNumber[0] : '';
                        const room = parsed.RoomNumber && parsed.RoomNumber[0] ? parsed.RoomNumber[0] : '';
                        const village = parsed.VillageName && parsed.VillageName[0] ? parsed.VillageName[0] : '';
                        const soi = parsed.SoiName && parsed.SoiName[0] ? parsed.SoiName[0] : '';
                        const street = parsed.StreetName && parsed.StreetName[0] ? parsed.StreetName[0] : '';
                        const thambol = parsed.Thambol && parsed.Thambol[0] ? parsed.Thambol[0] : '';
                        const amphur = parsed.Amphur && parsed.Amphur[0] ? parsed.Amphur[0] : '';
                        const province = parsed.Province && parsed.Province[0] ? parsed.Province[0] : '';
                        const postcode = parsed.PostCode && parsed.PostCode[0] ? parsed.PostCode[0] : '';

                        addPart(house);
                        addPart(moo, 'หมู่ที่ ');
                        addPart(bldg);
                        addPart(floor, 'ชั้น ');
                        addPart(room, 'ห้อง ');
                        addPart(village, 'หมู่บ้าน');
                        addPart(soi, 'ซอย');
                        addPart(street, 'ถนน');

                        const provStr = province.trim();
                        if (provStr === 'กรุงเทพมหานคร') {
                            addPart(thambol, 'แขวง');
                            addPart(amphur, 'เขต');
                            addPart(provStr);
                        } else {
                            addPart(thambol, 'ตำบล');
                            addPart(amphur, 'อำเภอ');
                            addPart(provStr, 'จังหวัด');
                        }
                        addPart(postcode);

                        const fullAddress = parts.join(' ').trim();

                        resolve({
                            success: true,
                            taxId,
                            name: fullName,
                            address: fullAddress
                        });
                    } catch (err) {
                        resolve({ success: false, message: err.message });
                    }
                });
            });

            request.on('error', (e) => {
                reject(e);
            });

            request.write(postData);
            request.end();
        });

        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (ex) {
        res.status(500).json({ error: true, message: ex.message });
    }
}));

const https = require('https');

// --- 1. Companies ---
app.get('/api/companies', asyncHandler(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM companies ORDER BY name ASC');
    res.json(rows);
}));

app.post('/api/companies', asyncHandler(async (req, res) => {
    const { code, name } = req.body;
    if (!code || !name) return res.status(400).json({ message: 'Code and Name required' });
    
    await pool.query('INSERT INTO companies (code, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = ?', [code, name, name]);
    
    // Seed default chart of accounts for the new company
    await seedDefaultAccounts(code);
    
    res.json({ success: true, code, name });
}));

app.delete('/api/companies/:code', asyncHandler(async (req, res) => {
    const { code } = req.params;
    await pool.query('DELETE FROM companies WHERE code = ?', [code]);
    res.json({ success: true });
}));

// --- Helper: Seed Default Accounts ---
async function seedDefaultAccounts(companyCode) {
    const defaultAccounts = [
        // Assets
        { code: '1100-00', name: 'เงินสด', category: 'assets' },
        { code: '1110-00', name: 'เงินฝากกระแสรายวัน', category: 'assets' },
        { code: '1120-00', name: 'เงินฝากออมทรัพย์', category: 'assets' },
        { code: '1130-00', name: 'เงินสดย่อย', category: 'assets' },
        { code: '1200-00', name: 'ลูกหนี้การค้า', category: 'assets' },
        { code: '1300-00', name: 'สินค้าคงเหลือ', category: 'assets' },
        { code: '1400-00', name: 'ภาษีซื้อยังไม่ถึงกำหนด', category: 'assets' },
        { code: '1410-00', name: 'ภาษีซื้อ', category: 'assets' },
        { code: '1500-00', name: 'ที่ดิน อาคาร และอุปกรณ์', category: 'assets' },
        // Liabilities
        { code: '2100-00', name: 'เจ้าหนี้การค้า', category: 'liabilities' },
        { code: '2200-00', name: 'ภาษีขายยังไม่ถึงกำหนด', category: 'liabilities' },
        { code: '2210-00', name: 'ภาษีขาย', category: 'liabilities' },
        { code: '2300-00', name: 'ภาษีเงินได้หัก ณ ที่จ่ายค้างจ่าย', category: 'liabilities' },
        // Equity
        { code: '3100-00', name: 'ทุนจดทะเบียน', category: 'equity' },
        { code: '3110-00', name: 'ส่วนต่ำกว่ามูลค่าหุ้น', category: 'equity' },
        { code: '3200-00', name: 'กำไรสะสมยังไม่ได้จัดสรร', category: 'equity' },
        // Revenue
        { code: '4100-00', name: 'รายได้จากการขายสินค้า', category: 'revenue' },
        { code: '4200-00', name: 'รายได้จากการบริการ', category: 'revenue' },
        // Expenses
        { code: '5100-00', name: 'ต้นทุนขาย', category: 'expenses' },
        { code: '5200-00', name: 'ต้นทุนบริการ', category: 'expenses' },
        { code: '5300-00', name: 'ค่าใช้จ่ายในการขาย', category: 'expenses' },
        { code: '5400-00', name: 'ค่าใช้จ่ายในการบริหาร', category: 'expenses' },
        { code: '5500-00', name: 'ต้นทุนทางการเงิน', category: 'expenses' },
        { code: '5600-00', name: 'ภาษีเงินได้นิติบุคคล', category: 'expenses' },
        // Suspense
        { code: '9999-99', name: 'บัญชีพักยอดคงเหลือยกมา', category: 'assets' }
    ];

    // Check if accounts already exist
    const [existing] = await pool.query('SELECT count(*) as count FROM accounts WHERE company_code = ?', [companyCode]);
    if (existing[0].count === 0) {
        const insertQueries = defaultAccounts.map(acc => 
            pool.query('INSERT INTO accounts (company_code, code, name, category) VALUES (?, ?, ?, ?)', 
                [companyCode, acc.code, acc.name, acc.category])
        );
        await Promise.all(insertQueries);
        console.log(`Seeded default Chart of Accounts for company: ${companyCode}`);
    }
}

// --- 2. Settings (Generic Key-Value per Company) ---
app.get('/api/settings/:companyCode', asyncHandler(async (req, res) => {
    const { companyCode } = req.params;
    const [rows] = await pool.query('SELECT `key`, value FROM settings WHERE company_code = ?', [companyCode]);
    const settingsMap = {};
    rows.forEach(r => {
        try {
            settingsMap[r.key] = JSON.parse(r.value);
        } catch {
            settingsMap[r.key] = r.value;
        }
    });
    res.json(settingsMap);
}));

app.post('/api/settings/:companyCode', asyncHandler(async (req, res) => {
    const { companyCode } = req.params;
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ message: 'Key required' });
    
    const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
    await pool.query('INSERT INTO settings (company_code, `key`, value) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value = ?', 
        [companyCode, key, valueStr, valueStr]);
    res.json({ success: true });
}));

// --- 3. Chart of Accounts (accounts) ---
app.get('/api/accounts/:companyCode', asyncHandler(async (req, res) => {
    const { companyCode } = req.params;
    const [rows] = await pool.query('SELECT * FROM accounts WHERE company_code = ? ORDER BY code ASC', [companyCode]);
    res.json(rows);
}));

app.post('/api/accounts/:companyCode', asyncHandler(async (req, res) => {
    const { companyCode } = req.params;
    const { code, name, category, parent_code } = req.body;
    await pool.query('INSERT INTO accounts (company_code, code, name, category, parent_code) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=?, category=?, parent_code=?',
        [companyCode, code, name, category, parent_code || null, name, category, parent_code || null]);
    res.json({ success: true });
}));

app.delete('/api/accounts/:companyCode/:code', asyncHandler(async (req, res) => {
    const { companyCode, code } = req.params;
    await pool.query('DELETE FROM accounts WHERE company_code = ? AND code = ?', [companyCode, code]);
    res.json({ success: true });
}));

// --- 4. Journal Entries & Items (JV) ---
app.get('/api/journal-entries/:companyCode', asyncHandler(async (req, res) => {
    const { companyCode } = req.params;
    const { startDate, endDate } = req.query;
    
    let query = `
        SELECT je.*, 
               (SELECT JSON_ARRAYAGG(
                   JSON_OBJECT('id', id, 'account_code', account_code, 'debit', debit, 'credit', credit, 'description', description)
               ) FROM journal_items WHERE journal_entry_id = je.id) as items
        FROM journal_entries je 
        WHERE je.company_code = ?
    `;
    const params = [companyCode];
    
    if (startDate) {
        query += ' AND je.date >= ?';
        params.push(startDate);
    }
    if (endDate) {
        query += ' AND je.date <= ?';
        params.push(endDate);
    }
    query += ' ORDER BY je.date ASC, je.id ASC';
    
    const [rows] = await pool.query(query, params);
    
    // Parse nested items from string to JSON
    rows.forEach(r => {
        if (typeof r.items === 'string') {
            r.items = JSON.parse(r.items);
        } else if (r.items === null) {
            r.items = [];
        }
    });
    
    res.json(rows);
}));

app.get('/api/journal-entries/:companyCode/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const [entries] = await pool.query('SELECT * FROM journal_entries WHERE id = ?', [id]);
    if (entries.length === 0) return res.status(404).json({ message: 'Journal Entry not found' });
    const entry = entries[0];
    
    const [items] = await pool.query('SELECT * FROM journal_items WHERE journal_entry_id = ?', [id]);
    entry.items = items;
    res.json(entry);
}));

app.post('/api/journal-entries/:companyCode', asyncHandler(async (req, res) => {
    const { companyCode } = req.params;
    const { id, date, reference, description, is_posted, items } = req.body;
    
    const last_updated = Date.now();
    const conn = await pool.getConnection();
    
    try {
        await conn.beginTransaction();
        
        let jeId = id;
        if (jeId) {
            // Update existing
            await conn.query('UPDATE journal_entries SET date=?, reference=?, description=?, is_posted=?, last_updated=? WHERE id=? AND company_code=?',
                [date, reference, description, is_posted ? 1 : 0, last_updated, jeId, companyCode]);
            // Clear old items
            await conn.query('DELETE FROM journal_items WHERE journal_entry_id=?', [jeId]);
        } else {
            // Insert new
            const [result] = await conn.query('INSERT INTO journal_entries (company_code, date, reference, description, is_posted, last_updated) VALUES (?, ?, ?, ?, ?, ?)',
                [companyCode, date, reference, description, is_posted ? 1 : 0, last_updated]);
            jeId = result.insertId;
        }
        
        // Insert items
        if (items && items.length > 0) {
            for (const item of items) {
                await conn.query('INSERT INTO journal_items (journal_entry_id, account_code, debit, credit, description) VALUES (?, ?, ?, ?, ?)',
                    [jeId, item.account_code, item.debit || 0, item.credit || 0, item.description || '']);
            }
        }
        
        await conn.commit();
        res.json({ success: true, id: jeId });
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}));

app.delete('/api/journal-entries/:companyCode/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    await pool.query('DELETE FROM journal_entries WHERE id = ?', [id]);
    res.json({ success: true });
}));

// --- 5. Customers & Suppliers ---
const makeCrudEndpoints = (baseRoute, tableName) => {
    app.get(`/api/${baseRoute}/:companyCode`, asyncHandler(async (req, res) => {
        const { companyCode } = req.params;
        const [rows] = await pool.query(`SELECT * FROM ${tableName} WHERE company_code = ? ORDER BY name ASC`, [companyCode]);
        
        // Map database snake_case fields to frontend camelCase fields
        const mappedRows = rows.map(r => ({
            id: r.id,
            company_code: r.company_code,
            name: r.name,
            email: r.email,
            phone: r.phone,
            address: r.address,
            taxId: r.tax_id || '',
            creditTerm: r.credit_term || 0,
            contactPerson: r.contact_person || '',
            ...(tableName === 'suppliers' ? { bankAccount: r.bank_account || '' } : {})
        }));
        
        res.json(mappedRows);
    }));

    app.post(`/api/${baseRoute}/:companyCode`, asyncHandler(async (req, res) => {
        const { companyCode } = req.params;
        const { id, name, email, phone, address, taxId, creditTerm, contactPerson, bankAccount } = req.body;
        if (id) {
            if (tableName === 'suppliers') {
                await pool.query(`UPDATE ${tableName} SET name=?, email=?, phone=?, address=?, tax_id=?, credit_term=?, contact_person=?, bank_account=? WHERE id=? AND company_code=?`,
                    [name, email || null, phone || null, address || null, taxId || null, creditTerm || 0, contactPerson || null, bankAccount || null, id, companyCode]);
            } else {
                await pool.query(`UPDATE ${tableName} SET name=?, email=?, phone=?, address=?, tax_id=?, credit_term=?, contact_person=? WHERE id=? AND company_code=?`,
                    [name, email || null, phone || null, address || null, taxId || null, creditTerm || 0, contactPerson || null, id, companyCode]);
            }
            res.json({ success: true, id });
        } else {
            if (tableName === 'suppliers') {
                const [result] = await pool.query(`INSERT INTO ${tableName} (company_code, name, email, phone, address, tax_id, credit_term, contact_person, bank_account) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [companyCode, name, email || null, phone || null, address || null, taxId || null, creditTerm || 0, contactPerson || null, bankAccount || null]);
                res.json({ success: true, id: result.insertId });
            } else {
                const [result] = await pool.query(`INSERT INTO ${tableName} (company_code, name, email, phone, address, tax_id, credit_term, contact_person) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [companyCode, name, email || null, phone || null, address || null, taxId || null, creditTerm || 0, contactPerson || null]);
                res.json({ success: true, id: result.insertId });
            }
        }
    }));

    app.delete(`/api/${baseRoute}/:companyCode/:id`, asyncHandler(async (req, res) => {
        const { id } = req.params;
        await pool.query(`DELETE FROM ${tableName} WHERE id = ?`, [id]);
        res.json({ success: true });
    }));
};

makeCrudEndpoints('customers', 'customers');
makeCrudEndpoints('suppliers', 'suppliers');

// --- 6. Invoices & Bills ---
const makeInvoiceBillEndpoints = (baseRoute, tableName, partyIdField) => {
    app.get(`/api/${baseRoute}/:companyCode`, asyncHandler(async (req, res) => {
        const { companyCode } = req.params;
        const [rows] = await pool.query(`SELECT * FROM ${tableName} WHERE company_code = ? ORDER BY date DESC, id DESC`, [companyCode]);
        rows.forEach(r => {
            if (typeof r.items === 'string') {
                r.items = JSON.parse(r.items);
            }
        });
        res.json(rows);
    }));

    app.get(`/api/${baseRoute}/:companyCode/:id`, asyncHandler(async (req, res) => {
        const { companyCode, id } = req.params;
        const [rows] = await pool.query(`SELECT * FROM ${tableName} WHERE company_code = ? AND id = ?`, [companyCode, id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Document not found' });
        const doc = rows[0];
        if (typeof doc.items === 'string') {
            doc.items = JSON.parse(doc.items);
        }
        res.json(doc);
    }));

    app.post(`/api/${baseRoute}/:companyCode`, asyncHandler(async (req, res) => {
        const { companyCode } = req.params;
        const {
            id, date, status, subtotal, vat_rate, vat_amount, total,
            tax_withheld, net_payable, items, last_updated
        } = req.body;
        const partyId = req.body[partyIdField];
        
        const itemsStr = JSON.stringify(items);
        const lastUp = last_updated || Date.now();
        
        const sql = `
            INSERT INTO ${tableName} (
                id, company_code, date, ${partyIdField}, due_date, status, 
                subtotal, vat_rate, vat_amount, total, tax_withheld, net_payable, items, last_updated
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                date=?, ${partyIdField}=?, due_date=?, status=?, 
                subtotal=?, vat_rate=?, vat_amount=?, total=?, tax_withheld=?, net_payable=?, items=?, last_updated=?
        `;
        const params = [
            id, companyCode, date, partyId, date, status, 
            subtotal, vat_rate, vat_amount, total, tax_withheld, net_payable, itemsStr, lastUp,
            // Update params
            date, partyId, date, status, 
            subtotal, vat_rate, vat_amount, total, tax_withheld, net_payable, itemsStr, lastUp
        ];
        
        await pool.query(sql, params);
        res.json({ success: true, id });
    }));

    app.delete(`/api/${baseRoute}/:companyCode/:id`, asyncHandler(async (req, res) => {
        const { companyCode, id } = req.params;
        await pool.query(`DELETE FROM ${tableName} WHERE company_code = ? AND id = ?`, [companyCode, id]);
        res.json({ success: true });
    }));
};

makeInvoiceBillEndpoints('invoices', 'invoices', 'customer_id');
makeInvoiceBillEndpoints('bills', 'bills', 'supplier_id');

// --- 7. Receipts & Payments (AR Receipts & AP Payments) ---
const makePaymentReceiptEndpoints = (baseRoute, tableName, docIdField, partyIdField) => {
    app.get(`/api/${baseRoute}/:companyCode`, asyncHandler(async (req, res) => {
        const { companyCode } = req.params;
        const [rows] = await pool.query(`SELECT * FROM ${tableName} WHERE company_code = ? ORDER BY date DESC, id DESC`, [companyCode]);
        res.json(rows);
    }));

    app.post(`/api/${baseRoute}/:companyCode`, asyncHandler(async (req, res) => {
        const { companyCode } = req.params;
        const { id, date, amount, payment_method, reference_no, journal_entry_id } = req.body;
        const docId = req.body[docIdField];
        const partyId = req.body[partyIdField];

        const sql = `
            INSERT INTO ${tableName} (id, company_code, date, ${docIdField}, ${partyIdField}, amount, payment_method, reference_no, journal_entry_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                date=?, ${docIdField}=?, ${partyIdField}=?, amount=?, payment_method=?, reference_no=?, journal_entry_id=?
        `;
        const params = [
            id, companyCode, date, docId, partyId, amount, payment_method, reference_no || null, journal_entry_id || null,
            date, docId, partyId, amount, payment_method, reference_no || null, journal_entry_id || null
        ];

        await pool.query(sql, params);
        res.json({ success: true, id });
    }));

    app.delete(`/api/${baseRoute}/:companyCode/:id`, asyncHandler(async (req, res) => {
        const { companyCode, id } = req.params;
        await pool.query(`DELETE FROM ${tableName} WHERE company_code = ? AND id = ?`, [companyCode, id]);
        res.json({ success: true });
    }));
};

makePaymentReceiptEndpoints('ar-receipts', 'ar_receipts', 'invoice_id', 'customer_id');
makePaymentReceiptEndpoints('ap-payments', 'ap_payments', 'bill_id', 'supplier_id');

// --- 8. Petty Cash (Payments & Reimbursements) ---
app.get('/api/petty-cash-payments/:companyCode', asyncHandler(async (req, res) => {
    const { companyCode } = req.params;
    const [rows] = await pool.query('SELECT * FROM petty_cash_payments WHERE company_code = ? ORDER BY date DESC, id DESC', [companyCode]);
    res.json(rows);
}));

app.post('/api/petty-cash-payments/:companyCode', asyncHandler(async (req, res) => {
    const { companyCode } = req.params;
    const { id, date, payee, description, amount, expense_account_code, status, journal_entry_id } = req.body;

    const sql = `
        INSERT INTO petty_cash_payments (id, company_code, date, payee, description, amount, expense_account_code, status, journal_entry_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
            date=?, payee=?, description=?, amount=?, expense_account_code=?, status=?, journal_entry_id=?
    `;
    const params = [
        id, companyCode, date, payee, description || null, amount, expense_account_code, status, journal_entry_id || null,
        date, payee, description || null, amount, expense_account_code, status, journal_entry_id || null
    ];

    await pool.query(sql, params);
    res.json({ success: true, id });
}));

app.delete('/api/petty-cash-payments/:companyCode/:id', asyncHandler(async (req, res) => {
    const { companyCode, id } = req.params;
    await pool.query('DELETE FROM petty_cash_payments WHERE company_code = ? AND id = ?', [companyCode, id]);
    res.json({ success: true });
}));

app.get('/api/petty-cash-reimbursements/:companyCode', asyncHandler(async (req, res) => {
    const { companyCode } = req.params;
    const [rows] = await pool.query('SELECT * FROM petty_cash_reimbursements WHERE company_code = ? ORDER BY date DESC, id DESC', [companyCode]);
    res.json(rows);
}));

app.post('/api/petty-cash-reimbursements/:companyCode', asyncHandler(async (req, res) => {
    const { companyCode } = req.params;
    const { id, date, reference, amount, status, payment_method, journal_entry_id } = req.body;

    const sql = `
        INSERT INTO petty_cash_reimbursements (id, company_code, date, reference, amount, status, payment_method, journal_entry_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
            date=?, reference=?, amount=?, status=?, payment_method=?, journal_entry_id=?
    `;
    const params = [
        id, companyCode, date, reference, amount, status, payment_method, journal_entry_id || null,
        date, reference, amount, status, payment_method, journal_entry_id || null
    ];

    await pool.query(sql, params);
    res.json({ success: true, id });
}));

app.delete('/api/petty-cash-reimbursements/:companyCode/:id', asyncHandler(async (req, res) => {
    const { companyCode, id } = req.params;
    await pool.query('DELETE FROM petty_cash_reimbursements WHERE company_code = ? AND id = ?', [companyCode, id]);
    res.json({ success: true });
}));

// --- 9. Dynamic Catalogs (Expense Catalog & Payment Methods) ---
const makeCatalogEndpoints = (baseRoute, tableName) => {
    app.get(`/api/${baseRoute}/:companyCode`, asyncHandler(async (req, res) => {
        const { companyCode } = req.params;
        const [rows] = await pool.query(`SELECT * FROM ${tableName} WHERE company_code = ? ORDER BY code ASC`, [companyCode]);
        res.json(rows);
    }));

    app.post(`/api/${baseRoute}/:companyCode`, asyncHandler(async (req, res) => {
        const { companyCode } = req.params;
        const { code, name, account_code } = req.body;

        await pool.query(`INSERT INTO ${tableName} (company_code, code, name, account_code) VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE name = ?, account_code = ?`,
            [companyCode, code, name, account_code, name, account_code]);
        res.json({ success: true, code });
    }));

    app.delete(`/api/${baseRoute}/:companyCode/:code`, asyncHandler(async (req, res) => {
        const { companyCode, code } = req.params;
        await pool.query(`DELETE FROM ${tableName} WHERE company_code = ? AND code = ?`, [companyCode, code]);
        res.json({ success: true });
    }));
};

makeCatalogEndpoints('payment-methods', 'payment_methods');
makeCatalogEndpoints('expense-catalog', 'expense_catalog');


// ==========================================
// INVENTORY (ระบบสินค้า) ENDPOINTS
// ==========================================

// --- 10. Products & Services Master ---
app.get('/api/products/:companyCode', asyncHandler(async (req, res) => {
    const { companyCode } = req.params;
    const [rows] = await pool.query('SELECT * FROM products WHERE company_code = ? ORDER BY code ASC', [companyCode]);
    res.json(rows);
}));

app.post('/api/products/:companyCode', asyncHandler(async (req, res) => {
    const { companyCode } = req.params;
    const { id, code, name, type, category, unit, standard_cost, standard_price, description, min_qty, reorder_qty, status } = req.body;
    
    if (id) {
        await pool.query(
            `UPDATE products SET code=?, name=?, type=?, category=?, unit=?, standard_cost=?, standard_price=?, description=?, min_qty=?, reorder_qty=?, status=? 
             WHERE id=? AND company_code=?`,
            [code, name, type, category || null, unit, standard_cost || 0, standard_price || 0, description || null, min_qty || 0, reorder_qty || 0, status || 'active', id, companyCode]
        );
        res.json({ success: true, id });
    } else {
        const [result] = await pool.query(
            `INSERT INTO products (company_code, code, name, type, category, unit, standard_cost, standard_price, description, min_qty, reorder_qty, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [companyCode, code, name, type, category || null, unit, standard_cost || 0, standard_price || 0, description || null, min_qty || 0, reorder_qty || 0, status || 'active']
        );
        res.json({ success: true, id: result.insertId });
    }
}));

app.delete('/api/products/:companyCode/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    await pool.query('DELETE FROM products WHERE id = ?', [id]);
    res.json({ success: true });
}));

// --- 11. Product Sets (BOM) ---
app.get('/api/product-sets/:setProductId', asyncHandler(async (req, res) => {
    const { setProductId } = req.params;
    const [rows] = await pool.query(
        `SELECT psi.*, p.code, p.name, p.unit FROM product_set_items psi 
         JOIN products p ON psi.member_product_id = p.id 
         WHERE psi.set_product_id = ?`, [setProductId]
    );
    res.json(rows);
}));

app.post('/api/product-sets/:setProductId', asyncHandler(async (req, res) => {
    const { setProductId } = req.params;
    const { items } = req.body; // Array of { member_product_id, quantity }
    
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        await conn.query('DELETE FROM product_set_items WHERE set_product_id = ?', [setProductId]);
        if (items && items.length > 0) {
            for (const item of items) {
                await conn.query('INSERT INTO product_set_items (set_product_id, member_product_id, quantity) VALUES (?, ?, ?)',
                    [setProductId, item.member_product_id, item.quantity]);
            }
        }
        await conn.commit();
        res.json({ success: true });
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}));

// --- 12. Price Lists ---
app.get('/api/price-lists/:companyCode', asyncHandler(async (req, res) => {
    const { companyCode } = req.params;
    const [rows] = await pool.query('SELECT * FROM price_lists WHERE company_code = ?', [companyCode]);
    res.json(rows);
}));

app.post('/api/price-lists/:companyCode', asyncHandler(async (req, res) => {
    const { companyCode } = req.params;
    const { product_id, tier_name, price } = req.body;
    
    await pool.query(
        `INSERT INTO price_lists (company_code, product_id, tier_name, price) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE price = ?`,
        [companyCode, product_id, tier_name, price, price]
    );
    res.json({ success: true });
}));

app.delete('/api/price-lists/:companyCode/:productId/:tierName', asyncHandler(async (req, res) => {
    const { companyCode, productId, tierName } = req.params;
    await pool.query('DELETE FROM price_lists WHERE company_code = ? AND product_id = ? AND tier_name = ?', [companyCode, productId, tierName]);
    res.json({ success: true });
}));

// --- 13. Inventory Transactions (Stock movements) ---
app.get('/api/inventory-transactions/:companyCode', asyncHandler(async (req, res) => {
    const { companyCode } = req.params;
    const { productId } = req.query;
    
    let query = `
        SELECT it.*, p.code as product_code, p.name as product_name, p.unit as product_unit 
        FROM inventory_transactions it
        JOIN products p ON it.product_id = p.id
        WHERE it.company_code = ?
    `;
    const params = [companyCode];
    if (productId) {
        query += ' AND it.product_id = ?';
        params.push(productId);
    }
    query += ' ORDER BY it.date DESC, it.id DESC';
    
    const [rows] = await pool.query(query, params);
    res.json(rows);
}));

app.post('/api/inventory-transactions/:companyCode', asyncHandler(async (req, res) => {
    const { companyCode } = req.params;
    const { product_id, date, doc_ref, transaction_type, quantity, unit_cost, description } = req.body;
    
    const total_cost = (quantity * (unit_cost || 0));
    const [result] = await pool.query(
        `INSERT INTO inventory_transactions (company_code, product_id, date, doc_ref, transaction_type, quantity, unit_cost, total_cost, description) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [companyCode, product_id, date, doc_ref, transaction_type, quantity, unit_cost || 0, total_cost, description || null]
    );
    res.json({ success: true, id: result.insertId });
}));

// Bulk insertion of stock movements (e.g. during repairs or invoice postings)
app.post('/api/inventory-transactions-bulk/:companyCode', asyncHandler(async (req, res) => {
    const { companyCode } = req.params;
    const { transactions } = req.body; // Array of items
    
    if (!transactions || transactions.length === 0) return res.json({ success: true });
    
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        for (const t of transactions) {
            const total = t.quantity * (t.unit_cost || 0);
            await conn.query(
                `INSERT INTO inventory_transactions (company_code, product_id, date, doc_ref, transaction_type, quantity, unit_cost, total_cost, description) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [companyCode, t.product_id, t.date, t.doc_ref, t.transaction_type, t.quantity, t.unit_cost || 0, total, t.description || null]
            );
        }
        await conn.commit();
        res.json({ success: true });
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}));

app.delete('/api/inventory-transactions/:companyCode/:docRef', asyncHandler(async (req, res) => {
    const { companyCode, docRef } = req.params;
    await pool.query('DELETE FROM inventory_transactions WHERE company_code = ? AND doc_ref = ?', [companyCode, docRef]);
    res.json({ success: true });
}));

// --- 14. Inventory Count Sheets ---
app.get('/api/inventory-counts/:companyCode', asyncHandler(async (req, res) => {
    const { companyCode } = req.params;
    const [rows] = await pool.query('SELECT * FROM inventory_counts WHERE company_code = ? ORDER BY date DESC, id DESC', [companyCode]);
    res.json(rows);
}));

app.get('/api/inventory-counts/:companyCode/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const [counts] = await pool.query('SELECT * FROM inventory_counts WHERE id = ?', [id]);
    if (counts.length === 0) return res.status(404).json({ message: 'Count sheet not found' });
    const countSheet = counts[0];
    
    const [items] = await pool.query(
        `SELECT ici.*, p.code as product_code, p.name as product_name, p.unit as product_unit 
         FROM inventory_count_items ici
         JOIN products p ON ici.product_id = p.id
         WHERE ici.count_id = ?`, [id]
    );
    countSheet.items = items;
    res.json(countSheet);
}));

app.post('/api/inventory-counts/:companyCode', asyncHandler(async (req, res) => {
    const { companyCode } = req.params;
    const { id, date, ref_no, status, description, items } = req.body;
    
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        
        let countId = id;
        if (countId) {
            await conn.query('UPDATE inventory_counts SET date=?, ref_no=?, status=?, description=? WHERE id=? AND company_code=?',
                [date, ref_no, status, description || null, countId, companyCode]);
            await conn.query('DELETE FROM inventory_count_items WHERE count_id = ?', [countId]);
        } else {
            const [result] = await conn.query('INSERT INTO inventory_counts (company_code, date, ref_no, status, description) VALUES (?, ?, ?, ?, ?)',
                [companyCode, date, ref_no, status, description || null]);
            countId = result.insertId;
        }
        
        if (items && items.length > 0) {
            for (const item of items) {
                await conn.query(
                    `INSERT INTO inventory_count_items (count_id, product_id, system_qty, counted_qty, diff_qty, unit_cost) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [countId, item.product_id, item.system_qty, item.counted_qty, item.diff_qty, item.unit_cost || 0]
                );
            }
        }
        
        await conn.commit();
        res.json({ success: true, id: countId });
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}));

app.delete('/api/inventory-counts/:companyCode/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    await pool.query('DELETE FROM inventory_counts WHERE id = ?', [id]);
    res.json({ success: true });
}));


// --- 15. System Import/Export (For backups and migrations) ---
app.post('/api/import-all/:companyCode', asyncHandler(async (req, res) => {
    const { companyCode } = req.params;
    const allData = req.body; // Object with stores as arrays

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Helper to clear and bulk insert
        const importStore = async (tableName, items, columns, valuePlaceholder, mapperFn) => {
            if (!items || items.length === 0) return;
            await conn.query(`DELETE FROM ${tableName} WHERE company_code = ?`, [companyCode]);
            for (const item of items) {
                const values = mapperFn(item);
                await conn.query(`INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${valuePlaceholder})`, values);
            }
        };

        // 1. Settings
        if (allData.settings) {
            await conn.query('DELETE FROM settings WHERE company_code = ?', [companyCode]);
            for (const s of allData.settings) {
                await conn.query('INSERT INTO settings (company_code, `key`, value) VALUES (?, ?, ?)', [companyCode, s.key, typeof s.value === 'object' ? JSON.stringify(s.value) : String(s.value)]);
            }
        }

        // 2. Accounts
        if (allData.accounts) {
            await importStore('accounts', allData.accounts, ['company_code', 'code', 'name', 'category', 'parent_code'], '?, ?, ?, ?, ?', 
                item => [companyCode, item.code, item.name, item.category, item.parent_code || null]);
        }

        // 3. Customers
        const customerIdMap = {}; // Map old IDs to new IDs
        if (allData.customers) {
            await conn.query('DELETE FROM customers WHERE company_code = ?', [companyCode]);
            for (const c of allData.customers) {
                const [res] = await conn.query('INSERT INTO customers (company_code, name, email, phone, address) VALUES (?, ?, ?, ?, ?)',
                    [companyCode, c.name, c.email || null, c.phone || null, c.address || null]);
                customerIdMap[c.id] = res.insertId;
            }
        }

        // 4. Suppliers
        const supplierIdMap = {};
        if (allData.suppliers) {
            await conn.query('DELETE FROM suppliers WHERE company_code = ?', [companyCode]);
            for (const s of allData.suppliers) {
                const [res] = await conn.query('INSERT INTO suppliers (company_code, name, email, phone, address) VALUES (?, ?, ?, ?, ?)',
                    [companyCode, s.name, s.email || null, s.phone || null, s.address || null]);
                supplierIdMap[s.id] = res.insertId;
            }
        }

        // 5. Journal Entries
        if (allData.journalEntries) {
            await conn.query('DELETE FROM journal_entries WHERE company_code = ?', [companyCode]);
            for (const je of allData.journalEntries) {
                const [res] = await conn.query('INSERT INTO journal_entries (company_code, date, reference, description, is_posted, last_updated) VALUES (?, ?, ?, ?, ?, ?)',
                    [companyCode, je.date, je.reference, je.description || null, je.is_posted ? 1 : 0, je.last_updated || Date.now()]);
                
                if (je.items && je.items.length > 0) {
                    for (const item of je.items) {
                        await conn.query('INSERT INTO journal_items (journal_entry_id, account_code, debit, credit, description) VALUES (?, ?, ?, ?, ?)',
                            [res.insertId, item.account_code, item.debit || 0, item.credit || 0, item.description || '']);
                    }
                }
            }
        }

        // 6. Invoices
        if (allData.invoices) {
            await conn.query('DELETE FROM invoices WHERE company_code = ?', [companyCode]);
            for (const inv of allData.invoices) {
                const mappedCustId = customerIdMap[inv.customer_id] || inv.customer_id;
                await conn.query(
                    `INSERT INTO invoices (id, company_code, date, customer_id, due_date, status, subtotal, vat_rate, vat_amount, total, tax_withheld, net_payable, items, last_updated) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [inv.id, companyCode, inv.date, mappedCustId, inv.due_date || inv.date, inv.status, inv.subtotal, inv.vat_rate, inv.vat_amount, inv.total, inv.tax_withheld || 0, inv.net_payable, JSON.stringify(inv.items), inv.last_updated || Date.now()]
                );
            }
        }

        // 7. Bills
        if (allData.bills) {
            await conn.query('DELETE FROM bills WHERE company_code = ?', [companyCode]);
            for (const bill of allData.bills) {
                const mappedSuppId = supplierIdMap[bill.supplier_id] || bill.supplier_id;
                await conn.query(
                    `INSERT INTO bills (id, company_code, date, supplier_id, due_date, status, subtotal, vat_rate, vat_amount, total, tax_withheld, net_payable, items, last_updated) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [bill.id, companyCode, bill.date, mappedSuppId, bill.due_date || bill.date, bill.status, bill.subtotal, bill.vat_rate, bill.vat_amount, bill.total, bill.tax_withheld || 0, bill.net_payable, JSON.stringify(bill.items), bill.last_updated || Date.now()]
                );
            }
        }

        // 8. Receipts & Payments
        if (allData.arReceipts) {
            await conn.query('DELETE FROM ar_receipts WHERE company_code = ?', [companyCode]);
            for (const r of allData.arReceipts) {
                const mappedCustId = customerIdMap[r.customer_id] || r.customer_id;
                await conn.query('INSERT INTO ar_receipts (id, company_code, date, invoice_id, customer_id, amount, payment_method, reference_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [r.id, companyCode, r.date, r.invoice_id, mappedCustId, r.amount, r.payment_method, r.reference_no || null]);
            }
        }

        if (allData.apPayments) {
            await conn.query('DELETE FROM ap_payments WHERE company_code = ?', [companyCode]);
            for (const p of allData.apPayments) {
                const mappedSuppId = supplierIdMap[p.supplier_id] || p.supplier_id;
                await conn.query('INSERT INTO ap_payments (id, company_code, date, bill_id, supplier_id, amount, payment_method, reference_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [p.id, companyCode, p.date, p.bill_id, mappedSuppId, p.amount, p.payment_method, p.reference_no || null]);
            }
        }

        // 9. Petty Cash
        if (allData.pettyCashPayments) {
            await importStore('petty_cash_payments', allData.pettyCashPayments, ['id', 'company_code', 'date', 'payee', 'description', 'amount', 'expense_account_code', 'status'], '?, ?, ?, ?, ?, ?, ?, ?',
                item => [item.id, companyCode, item.date, item.payee, item.description || null, item.amount, item.expense_account_code, item.status]);
        }

        if (allData.pettyCashReimbursements) {
            await importStore('petty_cash_reimbursements', allData.pettyCashReimbursements, ['id', 'company_code', 'date', 'reference', 'amount', 'status', 'payment_method'], '?, ?, ?, ?, ?, ?, ?',
                item => [item.id, companyCode, item.date, item.reference, item.amount, item.status, item.payment_method]);
        }

        // 10. Dynamic catalogs
        if (allData.paymentMethods) {
            await importStore('payment_methods', allData.paymentMethods, ['company_code', 'code', 'name', 'account_code'], '?, ?, ?, ?',
                item => [companyCode, item.code, item.name, item.account_code]);
        }

        if (allData.expenseCatalog) {
            await importStore('expense_catalog', allData.expenseCatalog, ['company_code', 'code', 'name', 'account_code'], '?, ?, ?, ?',
                item => [companyCode, item.code, item.name, item.account_code]);
        }

        // 11. Products (if any in backup)
        if (allData.products) {
            await conn.query('DELETE FROM products WHERE company_code = ?', [companyCode]);
            for (const p of allData.products) {
                await conn.query(
                    `INSERT INTO products (company_code, code, name, type, category, unit, standard_cost, standard_price, description, min_qty, reorder_qty, status) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [companyCode, p.code, p.name, p.type || 'product', p.category || null, p.unit, p.standard_cost || 0, p.standard_price || 0, p.description || null, p.min_qty || 0, p.reorder_qty || 0, p.status || 'active']
                );
            }
        }

        await conn.commit();
        res.json({ success: true });
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}));

app.get('/api/export-all/:companyCode', asyncHandler(async (req, res) => {
    const { companyCode } = req.params;
    
    // Fetch all tables
    const exportTable = async (tableName) => {
        const [rows] = await pool.query(`SELECT * FROM ${tableName} WHERE company_code = ?`, [companyCode]);
        return rows;
    };

    const settingsRows = await exportTable('settings');
    const settings = settingsRows.map(r => {
        let val = r.value;
        try { val = JSON.parse(r.value); } catch {}
        return { key: r.key, value: val };
    });

    const accounts = await exportTable('accounts');
    const customers = await exportTable('customers');
    const suppliers = await exportTable('suppliers');
    
    const [jeRows] = await pool.query(`
        SELECT je.*, 
               (SELECT JSON_ARRAYAGG(
                   JSON_OBJECT('account_code', account_code, 'debit', debit, 'credit', credit, 'description', description)
               ) FROM journal_items WHERE journal_entry_id = je.id) as items
        FROM journal_entries je 
        WHERE je.company_code = ?
    `, [companyCode]);
    jeRows.forEach(r => {
        if (typeof r.items === 'string') {
            r.items = JSON.parse(r.items);
        } else if (r.items === null) {
            r.items = [];
        }
    });

    const invoices = await exportTable('invoices');
    invoices.forEach(r => {
        if (typeof r.items === 'string') r.items = JSON.parse(r.items);
    });

    const bills = await exportTable('bills');
    bills.forEach(r => {
        if (typeof r.items === 'string') r.items = JSON.parse(r.items);
    });

    const arReceipts = await exportTable('ar_receipts');
    const apPayments = await exportTable('ap_payments');
    const pettyCashPayments = await exportTable('petty_cash_payments');
    const pettyCashReimbursements = await exportTable('petty_cash_reimbursements');
    const paymentMethods = await exportTable('payment_methods');
    const expenseCatalog = await exportTable('expense_catalog');
    const products = await exportTable('products');

    res.json({
        settings,
        accounts,
        customers,
        suppliers,
        journalEntries: jeRows,
        invoices,
        bills,
        arReceipts,
        apPayments,
        pettyCashPayments,
        pettyCashReimbursements,
        paymentMethods,
        expenseCatalog,
        products
    });
}));


// ==========================================
// STATIC FILE SERVER & LISTENER
// ==========================================

// Serve static assets from the current directory
app.use(express.static(path.join(__dirname)));

// Fallback for SPA routing or opening index.html directly
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start initialization
initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`==========================================================`);
        console.log(`   ERP Accounting & Inventory Server Started Successfully`);
        console.log(`   Local Address: http://127.0.0.1:${PORT}`);
        console.log(`==========================================================`);
    });
});
