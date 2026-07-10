// js/store.js - State Management & Accounting Engine

import * as db from './db.js?v=13';

// Default Chart of Accounts matching Thai Accounting Standards with Express Hierarchy
export const DEFAULT_ACCOUNTS = [
    // 1. Assets (สินทรัพย์)
    { code: '1000-00', name: 'สินทรัพย์', category: 'asset', type: 'control', level: 1, parentCode: '' },
    { code: '1100-00', name: 'สินทรัพย์หมุนเวียน', category: 'asset', type: 'control', level: 2, parentCode: '1000-00' },
    { code: '1110-00', name: 'เงินสดและเงินฝากธนาคาร', category: 'asset', type: 'control', level: 3, parentCode: '1100-00' },
    { code: '1111-00', name: 'เงินสด', category: 'asset', type: 'posting', level: 4, parentCode: '1110-00' },
    { code: '1112-00', name: 'เงินฝากธนาคาร', category: 'asset', type: 'posting', level: 4, parentCode: '1110-00' },
    { code: '1120-00', name: 'ลูกหนี้การค้าและลูกหนี้อื่น', category: 'asset', type: 'control', level: 3, parentCode: '1100-00' },
    { code: '1121-00', name: 'ลูกหนี้การค้า', category: 'asset', type: 'posting', level: 4, parentCode: '1120-00' },
    { code: '1150-00', name: 'ภาษีซื้อและภาษีรอเรียกคืน', category: 'asset', type: 'control', level: 3, parentCode: '1100-00' },
    { code: '1151-00', name: 'ภาษีซื้อ', category: 'asset', type: 'posting', level: 4, parentCode: '1150-00' },
    { code: '1152-00', name: 'ภาษีเงินได้ถูกหัก ณ ที่จ่าย (WHT สินทรัพย์)', category: 'asset', type: 'posting', level: 4, parentCode: '1150-00' },
    { code: '1200-00', name: 'ลูกหนี้เงินให้กู้ยืมแก่กรรมการและลูกจ้าง', category: 'asset', type: 'control', level: 2, parentCode: '1000-00' },
    { code: '1300-00', name: 'เงินลงทุนในบริษัทในเครือ', category: 'asset', type: 'control', level: 2, parentCode: '1000-00' },
    { code: '1400-00', name: 'ที่ดิน อาคารและอุปกรณ์สุทธิ', category: 'asset', type: 'control', level: 2, parentCode: '1000-00' },
    { code: '1410-00', name: 'ที่ดิน อาคาร และอุปกรณ์', category: 'asset', type: 'posting', level: 3, parentCode: '1400-00' },
    { code: '1500-00', name: 'สินทรัพย์อื่น ๆ', category: 'asset', type: 'control', level: 2, parentCode: '1000-00' },
    { code: '1500-01', name: 'กรมธรรม์ประกันอัคคีภัย-สินค้าและอาคาร', category: 'asset', type: 'posting', level: 3, parentCode: '1500-00' },
    { code: '1500-02', name: 'กรมธรรม์ประกันอัคคีภัย-ยานพาหนะ', category: 'asset', type: 'posting', level: 3, parentCode: '1500-00' },
    { code: '1500-03', name: 'กรมธรรม์ประกันอุบัติเหตุพนักงาน', category: 'asset', type: 'posting', level: 3, parentCode: '1500-00' },
    { code: '1500-04', name: 'พันธบัตรโทรศัพท์', category: 'asset', type: 'posting', level: 3, parentCode: '1500-00' },
    { code: '1500-05', name: 'ดอกเบี้ยรอตัดบัญชี', category: 'asset', type: 'posting', level: 3, parentCode: '1500-00' },
    
    // 2. Liabilities (หนี้สิน)
    { code: '2000-00', name: 'หนี้สิน', category: 'liability', type: 'control', level: 1, parentCode: '' },
    { code: '2100-00', name: 'หนี้สินหมุนเวียน', category: 'liability', type: 'control', level: 2, parentCode: '2000-00' },
    { code: '2110-00', name: 'เจ้าหนี้การค้าและเจ้าหนี้อื่น', category: 'liability', type: 'control', level: 3, parentCode: '2100-00' },
    { code: '2111-00', name: 'เจ้าหนี้การค้า', category: 'liability', type: 'posting', level: 4, parentCode: '2110-00' },
    { code: '2150-00', name: 'ภาษีค้างจ่าย', category: 'liability', type: 'control', level: 3, parentCode: '2100-00' },
    { code: '2151-00', name: 'ภาษีขาย', category: 'liability', type: 'posting', level: 4, parentCode: '2150-00' },
    { code: '2161-00', name: 'ภาษีเงินได้หัก ณ ที่จ่ายค้างจ่าย (WHT หนี้สิน)', category: 'liability', type: 'posting', level: 4, parentCode: '2150-00' },
    { code: '2200-00', name: 'เงินกู้ยืมระยะยาว', category: 'liability', type: 'control', level: 2, parentCode: '2000-00' },
    { code: '2210-00', name: 'เงินกู้ยืมระยะยาว', category: 'liability', type: 'posting', level: 3, parentCode: '2200-00' },
    { code: '2300-00', name: 'หนี้สินอื่น ๆ', category: 'liability', type: 'control', level: 2, parentCode: '2000-00' },
    
    // 3. Equity (ส่วนของผู้ถือหุ้น)
    { code: '3000-00', name: 'ส่วนของผู้ถือหุ้น', category: 'equity', type: 'control', level: 1, parentCode: '' },
    { code: '3100-00', name: 'ทุนเรือนหุ้น', category: 'equity', type: 'control', level: 2, parentCode: '3000-00' },
    { code: '3110-00', name: 'ทุนจดทะเบียน', category: 'equity', type: 'posting', level: 3, parentCode: '3100-00' },
    { code: '3200-00', name: 'กำไรสะสม', category: 'equity', type: 'control', level: 2, parentCode: '3000-00' },
    { code: '3210-00', name: 'กำไรสะสม', category: 'equity', type: 'posting', level: 3, parentCode: '3200-00' },
    
    // 4. Revenues (รายได้)
    { code: '4000-00', name: 'รายได้', category: 'revenue', type: 'control', level: 1, parentCode: '' },
    { code: '4100-00', name: 'รายได้หลัก', category: 'revenue', type: 'control', level: 2, parentCode: '4000-00' },
    { code: '4111-00', name: 'รายได้จากการขายสินค้า', category: 'revenue', type: 'posting', level: 3, parentCode: '4100-00' },
    { code: '4112-00', name: 'รายได้จากการบริการ', category: 'revenue', type: 'posting', level: 3, parentCode: '4100-00' },
    { code: '4190-00', name: 'รายได้อื่น', category: 'revenue', type: 'posting', level: 2, parentCode: '4000-00' },
    
    // 5. Expenses (ค่าใช้จ่าย)
    { code: '5000-00', name: 'ค่าใช้จ่าย', category: 'expense', type: 'control', level: 1, parentCode: '' },
    { code: '5100-00', name: 'ต้นทุนขายและบริการ', category: 'expense', type: 'control', level: 2, parentCode: '5000-00' },
    { code: '5111-00', name: 'ต้นทุนสินค้าที่ขาย', category: 'expense', type: 'posting', level: 3, parentCode: '5100-00' },
    { code: '5200-00', name: 'ค่าใช้จ่ายในการบริหาร', category: 'expense', type: 'control', level: 2, parentCode: '5000-00' },
    { code: '5210-00', name: 'เงินเดือนและโบนัสพนักงาน', category: 'expense', type: 'posting', level: 3, parentCode: '5200-00' },
    { code: '5220-00', name: 'ค่าเช่าสถานที่', category: 'expense', type: 'posting', level: 3, parentCode: '5200-00' },
    { code: '5230-00', name: 'ค่าน้ำ ค่าไฟ ค่าโทรศัพท์', category: 'expense', type: 'posting', level: 3, parentCode: '5200-00' },
    { code: '5240-00', name: 'ค่าบริการขนส่ง', category: 'expense', type: 'posting', level: 3, parentCode: '5200-00' },
    { code: '5250-00', name: 'ค่าใช้จ่ายเบ็ดเตล็ด', category: 'expense', type: 'posting', level: 3, parentCode: '5200-00' },
    
    // Other accounts
    { code: '6000-00', name: 'ภาษีเงินได้นิติบุคคล', category: 'expense', type: 'posting', level: 1, parentCode: '' },
    { code: '9999-99', name: 'บัญชีพัก', category: 'equity', type: 'posting', level: 1, parentCode: '' }
];

// Migration Mapper for legacy codes
const CODE_MIGRATION_MAP = {
    '111100': '1111-00', '111200': '1112-00', '112100': '1121-00',
    '115100': '1151-00', '115200': '1152-00', '141000': '1410-00',
    '211100': '2111-00', '215100': '2151-00', '216100': '2161-00',
    '221000': '2210-00', '311000': '3110-00', '321000': '3210-00',
    '411000': '4111-00', '412000': '4112-00', '419000': '4190-00',
    '511000': '5111-00', '521000': '5210-00', '522000': '5220-00',
    '523000': '5230-00', '524000': '5240-00', '525000': '5250-00'
};

// Default Account Mappings (ตัวกำหนดบัญชีเพื่อลงรายวัน)
export const DEFAULT_ACCOUNT_MAPPINGS = {
    profit_loss: '3210-00',
    retained_earnings: '3210-00',
    suspense_account: '9999-99',
    cash: '1111-00',
    petty_cash: '1111-00',
    ar: '1121-00',
    notes_receivable_pre: '1121-00',
    inventory: '1410-00',
    wht_receivable: '1152-00',
    purchase_vat: '1151-00',
    undue_purchase_vat: '1151-00',
    prepaid_expense: '1500-01',
    ap: '2111-00',
    notes_payable_pre: '2111-00',
    wht_payable: '2161-00',
    wht_payable_pnd1: '2110-01',
    wht_payable_pnd3: '2110-02',
    wht_payable_pnd53: '2110-03',
    sales_vat: '2151-00',
    undue_sales_vat: '2151-00',
    deferred_revenue: '2111-00',
    cash_sales: '4111-00',
    credit_sales: '4111-00',
    sales_return: '4111-00',
    sales_discount: '5250-00',
    interest_received: '4190-00',
    bank_revenue: '4190-00',
    other_revenue: '4190-00',
    cost_of_sales: '5111-00',
    purchase_inventory: '5111-00',
    purchase_return: '5111-00',
    purchase_discount: '4190-00',
    interest_paid: '5250-00',
    bank_expense: '5250-00',
    bad_debt: '5250-00',
    other_expense: '5250-00',
    non_refundable_purchase_vat: '5250-00',
    disallowed_purchase_vat: '5250-00'
};

/**
 * Get active account mappings from settings or fallback to defaults
 */
export async function getAccountMappings() {
    const item = await db.getByKey('settings', 'account_mappings');
    const mappings = item ? item.mappings : {};
    const filteredMappings = {};
    for (const key in mappings) {
        if (mappings[key] && mappings[key] !== '') {
            filteredMappings[key] = mappings[key];
        }
    }
    return { ...DEFAULT_ACCOUNT_MAPPINGS, ...filteredMappings };
}

/**
 * Initialize default settings and seed accounts if empty
 */

/**
 * Resolves a preferred account code to a valid posting account in the active chart of accounts.
 * Checks category/first-digit match and performs keyword matching for AP, AR, VAT, WHT, Cash.
 */
export function findValidAccount(accounts, preferredCode, fallbackPrefix, fallbackDefault) {
    if (!accounts || accounts.length === 0) return fallbackDefault || preferredCode;
    
    const codeToCheck = preferredCode || fallbackDefault || '';
    const targetFirstDigit = codeToCheck ? codeToCheck[0] : '';
    
    // 1. Exact match first (must be posting)
    const exact = accounts.find(a => a.code === preferredCode && a.type === 'posting');
    if (exact) return exact.code;
    
    const postingAccounts = accounts.filter(a => a.type === 'posting');
    if (postingAccounts.length === 0) return fallbackDefault || preferredCode;
    
    // Restrict posting accounts to the same category/first digit if we have a target first digit
    let catAccounts = targetFirstDigit ? postingAccounts.filter(a => a.code.startsWith(targetFirstDigit)) : postingAccounts;
    if (catAccounts.length === 0) {
        catAccounts = postingAccounts;
    }
    
    // 2. Keyword matching within same category
    let keyword = null;
    let secondKeyword = null;
    const prefix = fallbackPrefix || (codeToCheck ? codeToCheck.split('-')[0] : '');
    
    if (prefix.startsWith('2102') || codeToCheck === '2111-00' || (fallbackDefault && fallbackDefault.includes('2111'))) {
        keyword = 'เจ้าหนี้';
        secondKeyword = 'payable';
    } else if (prefix.startsWith('1121') || codeToCheck === '1121-00' || (fallbackDefault && fallbackDefault.includes('1121'))) {
        keyword = 'ลูกหนี้';
        secondKeyword = 'receivable';
    } else if (codeToCheck === '1151-00' || prefix.startsWith('1151') || (fallbackDefault && fallbackDefault.includes('1151')) || codeToCheck === '1180-01') {
        keyword = 'ภาษีซื้อ';
        secondKeyword = 'purchase vat';
    } else if (codeToCheck === '2151-00' || prefix.startsWith('2151') || (fallbackDefault && fallbackDefault.includes('2151'))) {
        keyword = 'ภาษีขาย';
        secondKeyword = 'sales vat';
    } else if (codeToCheck === '2161-00' || prefix.startsWith('2161') || (fallbackDefault && fallbackDefault.includes('2161')) || codeToCheck === '2110-01' || codeToCheck === '2110-03') {
        keyword = 'หัก ณ ที่จ่าย';
        secondKeyword = 'wht';
    } else if (codeToCheck === '1152-00' || prefix.startsWith('1152') || (fallbackDefault && fallbackDefault.includes('1152'))) {
        keyword = 'หัก ณ ที่จ่าย';
        secondKeyword = 'wht';
    } else if (codeToCheck === '1111-00' || prefix.startsWith('1111') || (fallbackDefault && fallbackDefault.includes('1111'))) {
        keyword = 'เงินสด';
        secondKeyword = 'cash';
    }
    
    if (keyword) {
        const kwMatches = catAccounts.filter(a => 
            (a.name && a.name.includes(keyword)) || 
            (a.name_en && a.name_en.toLowerCase().includes(secondKeyword))
        );
        if (kwMatches.length > 0) {
            kwMatches.sort((a, b) => a.code.localeCompare(b.code));
            return kwMatches[0].code;
        }
    }
    
    // 3. Longest prefix match within category
    let currPrefix = prefix;
    while (currPrefix.length > 0) {
        const matches = catAccounts.filter(a => a.code.startsWith(currPrefix));
        if (matches.length > 0) {
            matches.sort((a, b) => a.code.localeCompare(b.code));
            return matches[0].code;
        }
        currPrefix = currPrefix.slice(0, -1);
    }
    
    // 4. Category fallback
    if (prefix.length > 0) {
        const firstDigit = prefix[0];
        const matches = catAccounts.filter(a => a.code.startsWith(firstDigit));
        if (matches.length > 0) {
            matches.sort((a, b) => a.code.localeCompare(b.code));
            return matches[0].code;
        }
    }
    
    return fallbackDefault || preferredCode;
}

export async function initializeStore() {
    await db.openDB();
    const existingAccounts = await db.getAll('accounts');
    
    // Seed default account mappings if empty
    const existingMappings = await db.getByKey('settings', 'account_mappings');
    if (!existingMappings) {
        console.log('Seeding default account mappings...');
        await db.putItem('settings', {
            key: 'account_mappings',
            mappings: DEFAULT_ACCOUNT_MAPPINGS
        });
    }
    
    const hasTreeStructure = existingAccounts.some(a => a.code === '1000-00');
    
    if (existingAccounts.length === 0) {
        console.log('Seeding default chart of accounts...');
        await db.bulkPut('accounts', DEFAULT_ACCOUNTS);
    } else if (!hasTreeStructure) {
        console.log('Migrating old flat accounts to new hierarchical accounts...');
        // 1. Re-seed accounts
        await db.clearStore('accounts');
        await db.bulkPut('accounts', DEFAULT_ACCOUNTS);
        
        // 2. Migrate existing journal entries
        const allJournals = await db.getAll('journalEntries');
        for (const entry of allJournals) {
            let modified = false;
            for (const line of entry.lines) {
                if (CODE_MIGRATION_MAP[line.accountCode]) {
                    line.accountCode = CODE_MIGRATION_MAP[line.accountCode];
                    modified = true;
                }
            }
            if (modified) {
                await db.putItem('journalEntries', entry);
            }
        }
        console.log('Migration completed successfully.');
    }

    // Seed default contacts (Debtors and Creditors)
    const existingContacts = await db.getAll('contacts');
    if (existingContacts.length === 0) {
        console.log('Seeding default contacts...');
        const defaultContacts = [
            { name: 'บริษัท บิ๊กเทรดดิ้ง จำกัด', taxId: '0105561001234', address: '88/8 อาคารสุขุมวิททาวเวอร์ ชั้น 15 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110', phone: '02-1234567', email: 'info@bigtrading.co.th', contactPerson: 'คุณสมชาย', creditTerm: 30, isCustomer: 1, isSupplier: 0 },
            { name: 'ห้างหุ้นส่วนจำกัด สมาร์ทเซอร์วิส', taxId: '0103559005678', address: '456 ซอยลาดพร้าว 101 แขวงคลองจั่น เขตบางกะปิ กรุงเทพมหานคร 10240', phone: '02-7654321', email: 'contact@smartservice.com', contactPerson: 'คุณวิภา', creditTerm: 15, isCustomer: 1, isSupplier: 0 },
            { name: 'บริษัท กรุงเทพพัฒนา จำกัด', taxId: '0105557009999', address: '99 ถนนสาทรใต้ แขวงทุ่งมหาเมฆ เขตสาทร กรุงเทพมหานคร 10120', phone: '02-9999999', email: 'billing@bkkdev.co.th', contactPerson: 'คุณประพันธ์', creditTerm: 45, isCustomer: 1, isSupplier: 0 },
            { name: 'บริษัท ซัพพลายคอร์ปอเรชั่น จำกัด', taxId: '0105552002345', address: '111/1 ถนนวิภาวดีรังสิต แขวงตลาดบางเขน เขตหลักสี่ กรุงเทพมหานคร 10210', phone: '02-5555555', email: 'orders@supplycorp.co.th', contactPerson: 'คุณอุดม', creditTerm: 30, bankAccount: 'ธนาคารกสิกรไทย 012-3-45678-9', isCustomer: 0, isSupplier: 1 },
            { name: 'บจก. การไฟฟ้าส่วนภูมิภาค (จำลอง)', taxId: '0105531002222', address: '200 ถนนงามวงศ์วาน แขวงลาดยาว เขตจตุจักร กรุงเทพมหานคร 10900', phone: '02-5890100', email: 'billing@pea.co.th', contactPerson: 'ฝ่ายการเงิน', creditTerm: 7, bankAccount: 'ธนาคารกรุงไทย 111-2-33333-4', isCustomer: 0, isSupplier: 1 },
            { name: 'บริษัท ดิจิทัล โซลูชั่นส์ จำกัด', taxId: '0105562008888', address: '55 อาคารเทคโนโลยีทาวเวอร์ ถนนรัชดาภิเษก แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพมหานคร 10310', phone: '02-8888888', email: 'support@digitalsol.co.th', contactPerson: 'คุณนลิน', creditTerm: 30, bankAccount: 'ธนาคารไทยพาณิชย์ 222-3-44444-5', isCustomer: 0, isSupplier: 1 }
        ];
        await db.bulkPut('contacts', defaultContacts);
    }

    const companyProfile = await db.getByKey('settings', 'company_profile');
    if (!companyProfile) {
        const activeCode = db.getActiveCompanyCode();
        let companyName = 'บริษัท บัญชีรุ่งเรือง จำกัด (มหาชน)';
        try {
            const companies = await db.getCompanies();
            const currentComp = companies.find(c => c.code === activeCode);
            if (currentComp) {
                companyName = currentComp.name;
            }
        } catch (err) {
            console.error('Error fetching company name for seeding:', err);
        }
        await db.putItem('settings', {
            key: 'company_profile',
            name: companyName,
            taxId: '0105500000000',
            address: 'กรุงเทพมหานคร',
            currency: 'THB',
            shares: 100000,
            par: 10,
            paid: 1000000
        });
    }

    // Seed default expense catalog templates if empty
    const existingCatalog = await db.getAll('expenseCatalog');
    if (existingCatalog.length === 0) {
        console.log('Seeding default expense catalog templates...');
        const defaultTemplates = [
            { code: 'ค่าขนส่ง', name: 'ค่าขนส่งและเดินทาง', nameEn: 'Transportation & Travel', category: '01', unit: 'ครั้ง', vatType: 'none', amount: 0.00, remarks: '', accountCode: '5240-00' },
            { code: 'ค่าเช่า', name: 'ค่าเช่าสถานที่', nameEn: 'Rent Expense', category: '01', unit: 'ครั้ง', vatType: 'none', amount: 0.00, remarks: '', accountCode: '5220-00' },
            { code: 'ค่าไฟ', name: 'ค่าน้ำ ค่าไฟ ค่าโทรศัพท์', nameEn: 'Water, Electricity & Telephone', category: '01', unit: 'ครั้ง', vatType: 'none', amount: 0.00, remarks: '', accountCode: '5230-00' },
            { code: 'เงินเดือน', name: 'เงินเดือนและโบนัสพนักงาน', nameEn: 'Salaries & Bonuses', category: '01', unit: 'ครั้ง', vatType: 'none', amount: 0.00, remarks: '', accountCode: '5210-00' },
            { code: 'เบ็ดเตล็ด', name: 'ค่าใช้จ่ายเบ็ดเตล็ด', nameEn: 'Miscellaneous Expense', category: '01', unit: 'ครั้ง', vatType: 'none', amount: 0.00, remarks: '', accountCode: '5250-00' },
            { code: 'วัตถุดิบ', name: 'ต้นทุนสินค้า/วัตถุดิบ', nameEn: 'Cost of Goods Sold', category: '01', unit: 'ครั้ง', vatType: 'none', amount: 0.00, remarks: '', accountCode: '5111-00' },
            { code: 'ภงด.53', name: 'ภาษีหัก ณ ที่จ่ายค้างจ่าย ภ.ง.ด.53', nameEn: 'Withholding Tax Payable PND53', category: '01', unit: 'ครั้ง', vatType: 'none', amount: 0.00, remarks: '', accountCode: '2161-00' }
        ];
        await db.bulkPut('expenseCatalog', defaultTemplates);
    }

    // Seed default payment/receipt methods if empty
    const existingMethods = await db.getAll('paymentMethods');
    if (existingMethods.length === 0) {
        console.log('Seeding default payment/receipt methods...');
        const defaultMethods = [
            // Receipt methods
            { code: 'CH', name: 'รับเช็ค', nameEn: 'Cheque Received', isCheque: true, bankCode: 'B2', accountCode: '1140-02', type: 'receipt' },
            { code: 'CH_CASH', name: 'รับเงินสด', nameEn: 'Cash Received', isCheque: false, bankCode: '', accountCode: '1111-00', type: 'receipt' },
            { code: 'TR_IN', name: 'เงินโอนเข้าบัญชี (ธนาคาร)', nameEn: 'Bank Transfer In', isCheque: false, bankCode: 'S1', accountCode: '1112-00', type: 'receipt' },
            { code: 'TX_WHT', name: 'ภาษีถูกหัก ณ ที่จ่าย (WHT สินทรัพย์)', nameEn: 'Tax Withholding Receivable', isCheque: false, bankCode: '', accountCode: '1152-00', type: 'receipt' },
            { code: 'DC_DISC', name: 'ส่วนลดเงินสด (จ่าย)', nameEn: 'Cash Discount Expense', isCheque: false, bankCode: '', accountCode: '5250-00', type: 'receipt' },
            
            // Payment methods
            { code: 'QP', name: 'เช็คจ่ายล่วงหน้า', nameEn: 'Post Date Cheque Pay', isCheque: true, bankCode: 'C1', accountCode: '1112-00', type: 'payment' },
            { code: 'CS_PAY', name: 'จ่ายเงินสด', nameEn: 'Cash Paid', isCheque: false, bankCode: '', accountCode: '1111-00', type: 'payment' },
            { code: 'TR_OUT', name: 'เงินโอนออกจากบัญชี (ธนาคาร)', nameEn: 'Bank Transfer Out', isCheque: false, bankCode: 'S2', accountCode: '1112-00', type: 'payment' },
            { code: 'TS_WHT', name: 'ภาษีหัก ณ ที่จ่ายค้างจ่าย (WHT หนี้สิน)', nameEn: 'Tax Withholding Payable', isCheque: false, bankCode: '', accountCode: '2161-00', type: 'payment' },
            { code: 'DC_EARN', name: 'ส่วนลดเงินสด (รับ)', nameEn: 'Cash Discount Earned', isCheque: false, bankCode: '', accountCode: '4190-00', type: 'payment' }
        ];
        await db.bulkPut('paymentMethods', defaultMethods);
    }
}

/**
 * Get all accounts ordered by code
 */
export async function getAccounts() {
    const accounts = await db.getAll('accounts');
    return accounts.sort((a, b) => a.code.localeCompare(b.code));
}

/**
 * Get all journal entries sorted by date descending, or paginated
 */
export async function getJournalEntries(limit = 100, offset = 0) {
    const entries = await db.getAll('journalEntries');
    // Sort descending by date, then by id
    entries.sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        return dateCompare !== 0 ? dateCompare : b.id - a.id;
    });
    return entries.slice(offset, offset + limit);
}

/**
 * Auto-Post Invoice to General Journal
 */
export async function postInvoiceToJournal(invoice) {
    const mappings = await getAccountMappings();
    const accounts = await db.getAll('accounts');
    
    const subtotal = invoice.subtotal;
    const vat = invoice.vatAmount || 0;
    const wht = invoice.whtAmount || 0;
    
    const resolvedWHTRec = findValidAccount(accounts, mappings.wht_receivable, '1', '1152-00');
    const resolvedAR = findValidAccount(accounts, mappings.ar, '1', '1121-00');
    const resolvedSalesVAT = findValidAccount(accounts, mappings.sales_vat, '2', '2151-00');
    const resolvedCash = findValidAccount(accounts, mappings.cash, '1', '1111-00');
    
    const lines = [];

    // Debit: WHT Receivable
    if (wht > 0) {
        lines.push({ accountCode: resolvedWHTRec, debit: wht, credit: 0 });
    }

    // Debit: Cash/Bank accounts from payments
    let totalPaid = 0;
    if (invoice.payments && invoice.payments.length > 0) {
        for (const p of invoice.payments) {
            if (p.amount > 0 && p.account) {
                // If it's a specific user-selected account, verify it but prefer it
                const pAcc = findValidAccount(accounts, p.account, '1', resolvedCash);
                lines.push({ accountCode: pAcc, debit: p.amount, credit: 0 });
                totalPaid += p.amount;
            }
        }
    } else if (invoice.status === 'paid') {
        const netCash = subtotal + vat - wht;
        const payAcc = findValidAccount(accounts, invoice.paymentAccount || mappings.cash, '1', resolvedCash);
        lines.push({ accountCode: payAcc, debit: netCash, credit: 0 });
        totalPaid += netCash;
    }

    // Debit: Accounts Receivable (AR) for the remainder
    const netCash = subtotal + vat - wht;
    const diff = netCash - totalPaid;
    if (diff > 0.01) {
        lines.push({ accountCode: resolvedAR, debit: diff, credit: 0 });
    } else if (diff < -0.01) {
        lines.push({ accountCode: resolvedAR, debit: 0, credit: -diff });
    }

    const isPaid = invoice.status === 'paid' || (diff <= 0.01 && totalPaid > 0);
    const rawRevenueAccount = isPaid ? mappings.cash_sales : mappings.credit_sales;
    const resolvedRevenue = findValidAccount(accounts, rawRevenueAccount, '4', '4111-00');
    lines.push({ accountCode: resolvedRevenue, debit: 0, credit: subtotal });

    if (vat > 0) {
        lines.push({ accountCode: resolvedSalesVAT, debit: 0, credit: vat });
    }

    const journalEntry = {
        date: invoice.date,
        description: `บันทึกรายการขายตามใบแจ้งหนี้เลขที่ ${invoice.id} (${invoice.customerName})`,
        reference: invoice.id,
        lines: lines,
        vatType: vat > 0 ? 'sales' : 'none',
        vatAmount: vat,
        whtType: wht > 0 ? `${invoice.whtRate}` : 'none',
        whtAmount: wht,
        partyName: invoice.customerName,
        taxId: invoice.taxId || ''
    };
    if (invoice.journalId) {
        journalEntry.id = invoice.journalId;
    }

    const entryId = await db.putItem('journalEntries', journalEntry);
    invoice.journalId = entryId;
    await db.putItem('invoices', invoice);
    return entryId;
}

/**
 * Auto-Post Bill (Expense) to General Journal
 */
export async function postBillToJournal(bill) {
    const mappings = await getAccountMappings();
    const accounts = await db.getAll('accounts');
    
    const subtotal = bill.subtotal;
    const vat = bill.vatAmount || 0;
    const wht = bill.whtAmount || 0;
    
    const resolvedAP = findValidAccount(accounts, mappings.ap, '2', '2111-00');
    const resolvedVAT = findValidAccount(accounts, mappings.purchase_vat, '1', '1151-00');
    const descText = bill.items && bill.items.length > 0 ? bill.items.map(i => i.description).join(' ') : '';
    const resolvedWHT = resolveWhtPayableAccount(accounts, mappings, bill.vendorName, bill.taxId, descText, bill.whtType);
    const resolvedCash = findValidAccount(accounts, mappings.cash, '1', '1111-00');
    const resolvedOtherExpense = findValidAccount(accounts, mappings.other_expense, '5', '5250-00');
    
    const lines = [];
    const debitsGroup = {}; 

    const companyProfile = await db.getByKey('settings', 'company_profile');
    const isVatRegistered = !companyProfile || companyProfile.vatRegistered !== 'no';

    // Debit: Expense Accounts (Row-Level logic)
    if (!bill.items || bill.items.length === 0) {
        let expenseAccount = findValidAccount(accounts, bill.expenseAccount, '5', resolvedOtherExpense);
        const amt = isVatRegistered ? subtotal : subtotal + vat;
        debitsGroup[expenseAccount] = (debitsGroup[expenseAccount] || 0) + amt;
    } else {
        const templates = await db.getAll('expenseCatalog');
        for (const item of bill.items) {
            let itemAccount = item.expenseAccount;
            if (!itemAccount && item.code) {
                const t = templates.find(temp => temp.code === item.code);
                if (t) itemAccount = t.accountCode;
            }
            if (!itemAccount) {
                const desc = item.description || '';
                if (desc.includes('เงินเดือน')) itemAccount = mappings.other_expense;
                else if (desc.includes('เช่า')) itemAccount = mappings.other_expense;
                else if (desc.includes('น้ำ') || desc.includes('ไฟ') || desc.includes('โทรศัพท์') || desc.includes('อินเทอร์เน็ต')) itemAccount = mappings.other_expense;
                else if (desc.includes('ขนส่ง')) itemAccount = mappings.bank_expense;
                else if (desc.includes('ซื้อสินค้า') || desc.includes('วัตถุดิบ')) itemAccount = mappings.purchase_inventory;
                else itemAccount = mappings.other_expense;
            }
            itemAccount = findValidAccount(accounts, itemAccount, '5', resolvedOtherExpense);
            
            let itemVat = 0;
            if (isVatRegistered) {
               // VAT handled separately
            } else {
               // Capitalize VAT into expense account directly if not registered
               itemVat = item.hasVat ? Math.round(item.amount * 0.07 * 100) / 100 : 0;
            }
            const amt = item.amount + itemVat;
            debitsGroup[itemAccount] = (debitsGroup[itemAccount] || 0) + amt;
        }
    }

    // Push debits
    for (const [accCode, amt] of Object.entries(debitsGroup)) {
        if (amt > 0.001) {
            lines.push({ accountCode: accCode, debit: Math.round(amt * 100) / 100, credit: 0 });
        }
    }

    if (isVatRegistered && vat > 0) {
        lines.push({ accountCode: resolvedVAT, debit: vat, credit: 0 });
    }

    // Credit: WHT Payable
    if (wht > 0) {
        lines.push({ accountCode: resolvedWHT, debit: 0, credit: wht });
    }

    // Credit: Cash/Bank accounts from payments
    let totalPaid = 0;
    if (bill.payments && bill.payments.length > 0) {
        for (const p of bill.payments) {
            if (p.amount > 0 && p.account) {
                const pAcc = findValidAccount(accounts, p.account, '1', resolvedCash);
                lines.push({ accountCode: pAcc, debit: 0, credit: p.amount });
                totalPaid += p.amount;
            }
        }
    } else if (bill.status === 'paid') {
        const netCash = subtotal + vat - wht;
        const payAcc = findValidAccount(accounts, bill.paymentAccount || mappings.cash, '1', resolvedCash);
        lines.push({ accountCode: payAcc, debit: 0, credit: netCash });
        totalPaid += netCash;
    }

    // Credit: Accounts Payable (AP) for the remainder
    const netCash = subtotal + vat - wht;
    const diff = netCash - totalPaid;
    if (diff > 0.01) {
        lines.push({ accountCode: resolvedAP, debit: 0, credit: diff });
    } else if (diff < -0.01) {
        lines.push({ accountCode: resolvedAP, debit: -diff, credit: 0 });
    }

    const journalEntry = {
        date: bill.date,
        description: `บันทึกค่าใช้จ่าย/ใบเสร็จ เลขที่ ${bill.id} (${bill.vendorName})`,
        reference: bill.id,
        lines: lines,
        vatType: vat > 0 ? 'purchase' : 'none',
        vatAmount: vat,
        whtType: wht > 0 ? `${bill.whtRate}` : 'none',
        whtAmount: wht,
        partyName: bill.vendorName,
        taxId: bill.taxId || ''
    };

    if (bill.journalId) {
        journalEntry.id = bill.journalId;
    }

    const entryId = await db.putItem('journalEntries', journalEntry);
    bill.journalId = entryId;
    await db.putItem('bills', bill);
    return entryId;
}

export function isWhtPayableAccount(accountCode, mappings) {
    if (!accountCode) return false;
    return accountCode === mappings.wht_payable || 
           accountCode === mappings.wht_payable_pnd1 ||
           accountCode === mappings.wht_payable_pnd3 || 
           accountCode === mappings.wht_payable_pnd53;
}

export function resolveWhtPayableAccount(accounts, mappings, contactName, taxId, descriptionText, whtType = null) {
    if (whtType === '1') {
        return findValidAccount(accounts, mappings.wht_payable_pnd1 || mappings.wht_payable, '2', '2110-01');
    } else if (whtType === '3') {
        return findValidAccount(accounts, mappings.wht_payable_pnd3 || mappings.wht_payable, '2', '2110-02');
    } else if (whtType === '53') {
        return findValidAccount(accounts, mappings.wht_payable_pnd53 || mappings.wht_payable, '2', '2110-03');
    }

    let whtMapping = mappings.wht_payable_pnd53 || mappings.wht_payable;
    let whtFallback = '2110-03';
    
    const name = contactName || '';
    const desc = descriptionText || '';
    
    // PND 1: Salary
    if (desc.includes('เงินเดือน') || desc.includes('ค่าจ้าง') || desc.includes('โบนัส')) {
        return findValidAccount(accounts, mappings.wht_payable_pnd1 || mappings.wht_payable, '2', '2110-01');
    }
    
    // PND 3: Individual Vendor
    const isIndividual = name.startsWith('นาย') || 
                         name.startsWith('นาง') || 
                         name.startsWith('น.ส.') ||
                         name.startsWith('ด.ช.') ||
                         name.startsWith('ด.ญ.') ||
                         (name && !name.includes('บริษัท') && !name.includes('จำกัด') && !name.includes('หจก.') && !name.includes('ห้างหุ้นส่วน') && !name.includes('บมจ.'));
                         
    const isCitizenId = taxId && taxId.length === 13 && /^[1-8]/.test(taxId);
    
    if (isCitizenId || (isIndividual && !taxId)) {
        whtMapping = mappings.wht_payable_pnd3 || mappings.wht_payable;
        whtFallback = '2110-02';
    }
    
    return findValidAccount(accounts, whtMapping, '2', whtFallback);
}

export async function getTrialBalance(startDate, endDate) {
    const accounts = await getAccounts();
    const entries = await db.getJournalEntriesRange(startDate, endDate);
    
    // Create map for rapid calculations
    const balances = {};
    for (const acc of accounts) {
        balances[acc.code] = { 
            code: acc.code, 
            name: acc.name, 
            category: acc.category, 
            type: acc.type || 'posting', 
            level: acc.level || 1, 
            parentCode: acc.parentCode || '', 
            debit: 0, 
            credit: 0 
        };
    }

    // Process all entries (posted to posting accounts)
    for (const entry of entries) {
        for (const line of entry.lines) {
            if (balances[line.accountCode]) {
                balances[line.accountCode].debit += line.debit;
                balances[line.accountCode].credit += line.credit;
            }
        }
    }

    // Roll up balances bottom-up (from level 5 down to level 1)
    const sortedByLevelDesc = [...accounts].sort((a, b) => (b.level || 1) - (a.level || 1));
    for (const acc of sortedByLevelDesc) {
        if (acc.parentCode && balances[acc.parentCode]) {
            balances[acc.parentCode].debit += balances[acc.code].debit;
            balances[acc.parentCode].credit += balances[acc.code].credit;
        }
    }

    return Object.values(balances);
}

/**
 * Calculate General Ledger for a specific account with running balance
 */
export async function getGeneralLedger(accountCode, startDate, endDate) {
    const account = await db.getByKey('accounts', accountCode);
    if (!account) throw new Error('Account not found');

    const entries = await db.getJournalEntriesRange(startDate, endDate);
    const ledgerLines = [];
    let runningBalance = 0;

    // Accounts increase on Debit if Asset/Expense, on Credit if Liability/Equity/Revenue
    const increaseOnDebit = ['asset', 'expense'].includes(account.category);

    for (const entry of entries) {
        for (const line of entry.lines) {
            if (line.accountCode === accountCode) {
                const debit = line.debit;
                const credit = line.credit;
                
                if (increaseOnDebit) {
                    runningBalance += (debit - credit);
                } else {
                    runningBalance += (credit - debit);
                }

                ledgerLines.push({
                    date: entry.date,
                    id: entry.id,
                    reference: entry.reference,
                    description: entry.description,
                    debit: debit,
                    credit: credit,
                    balance: runningBalance
                });
            }
        }
    }

    return {
        account: account,
        lines: ledgerLines,
        endingBalance: runningBalance
    };
}

/**
 * Generate Profit & Loss Statement (งบกำไรขาดทุน) with hierarchical support
 */
export async function getProfitAndLoss(startDate, endDate) {
    const trialBalance = await getTrialBalance(startDate, endDate);
    
    const revenues = [];
    const expenses = [];
    let totalRevenue = 0;
    let totalExpense = 0;

    for (const acc of trialBalance) {
        if (acc.category === 'revenue') {
            const balance = acc.credit - acc.debit; // Revenues normal balance is Credit
            if (balance !== 0) {
                revenues.push({ code: acc.code, name: acc.name, amount: balance, type: acc.type, level: acc.level });
                // Only add to total revenue if it's a top-level account (level 1)
                if (acc.level === 1 || !acc.parentCode) {
                    totalRevenue += balance;
                }
            }
        } else if (acc.category === 'expense') {
            const balance = acc.debit - acc.credit; // Expenses normal balance is Debit
            if (balance !== 0) {
                expenses.push({ code: acc.code, name: acc.name, amount: balance, type: acc.type, level: acc.level });
                // Only add to total expense if it's a top-level account (level 1)
                if (acc.level === 1 || !acc.parentCode) {
                    totalExpense += balance;
                }
            }
        }
    }

    return {
        revenues: revenues.sort((a,b) => a.code.localeCompare(b.code)),
        expenses: expenses.sort((a,b) => a.code.localeCompare(b.code)),
        totalRevenue,
        totalExpense,
        netProfit: totalRevenue - totalExpense
    };
}

/**
 * Generate Balance Sheet (งบแสดงฐานะการเงิน) with hierarchical support
 */
export async function getBalanceSheet(endDate) {
    // Cumulative from start, so we pass null as startDate
    const trialBalance = await getTrialBalance(null, endDate);
    
    // We need net profit up to this point to add to Retained Earnings
    const pl = await getProfitAndLoss(null, endDate);
    const netProfit = pl.netProfit;

    const assets = [];
    const liabilities = [];
    const equities = [];
    
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    for (const acc of trialBalance) {
        if (acc.category === 'asset') {
            const balance = acc.debit - acc.credit; // Assets normal balance is Debit
            if (balance !== 0) {
                assets.push({ code: acc.code, name: acc.name, amount: balance, type: acc.type, level: acc.level });
                if (acc.level === 1 || !acc.parentCode) {
                    totalAssets += balance;
                }
            }
        } else if (acc.category === 'liability') {
            const balance = acc.credit - acc.debit; // Liabilities normal balance is Credit
            if (balance !== 0) {
                liabilities.push({ code: acc.code, name: acc.name, amount: balance, type: acc.type, level: acc.level });
                if (acc.level === 1 || !acc.parentCode) {
                    totalLiabilities += balance;
                }
            }
        } else if (acc.category === 'equity') {
            let balance = acc.credit - acc.debit; // Equity normal balance is Credit
            if (balance !== 0) {
                equities.push({ code: acc.code, name: acc.name, amount: balance, type: acc.type, level: acc.level, parentCode: acc.parentCode });
            }
        }
    }

    // Adjust Retained Earnings to include current period's net profit dynamically
    const mappings = await getAccountMappings();
    const reCode = mappings.retained_earnings || '3500-00';
    const allAccounts = await getAccounts();

    if (netProfit !== 0) {
        let currentCode = reCode;
        while (currentCode) {
            const eqItem = equities.find(e => e.code === currentCode);
            if (eqItem) {
                eqItem.amount += netProfit;
            } else {
                const accDef = allAccounts.find(a => a.code === currentCode);
                if (accDef) {
                    equities.push({ 
                        code: accDef.code, 
                        name: accDef.name, 
                        amount: netProfit, 
                        type: accDef.type, 
                        level: accDef.level, 
                        parentCode: accDef.parentCode 
                    });
                } else {
                    // Fallback
                    equities.push({
                        code: currentCode,
                        name: 'กำไรสะสม',
                        amount: netProfit,
                        type: 'posting',
                        level: 3,
                        parentCode: ''
                    });
                }
            }
            // Move up to parent
            const accDef = allAccounts.find(a => a.code === currentCode);
            currentCode = accDef ? accDef.parentCode : null;
        }
    }

    // Calculate totalEquity using level 1 accounts (or parentCode === "")
    for (const eq of equities) {
        if (eq.level === 1 || !eq.parentCode) {
            totalEquity += eq.amount;
        }
    }

    return {
        assets: assets.sort((a,b) => a.code.localeCompare(b.code)),
        liabilities: liabilities.sort((a,b) => a.code.localeCompare(b.code)),
        equities: equities.sort((a,b) => a.code.localeCompare(b.code)),
        totalAssets,
        totalLiabilities,
        totalEquity,
        equityAndLiabilities: totalLiabilities + totalEquity
    };
}

/**
 * Generate 100,000 journal entries in memory and write to IndexedDB in batches.
 * Highly optimized to run under ~10-15 seconds.
 */
export async function seedMassiveTransactions(count = 100000, onProgress) {
    console.log(`Starting generation of ${count} transactions...`);
    const batchSize = 10000;
    const batches = Math.ceil(count / batchSize);

    // Seed base starting balance or capital
    await db.clearStore('journalEntries');
    
    // Seed initial Capital Investment
    await db.putItem('journalEntries', {
        date: '2025-01-01',
        description: 'ผู้ถือหุ้นนำเงินมาลงทุนในบริษัท (ทุนจดทะเบียน)',
        reference: 'CAP-001',
        lines: [
            { accountCode: '1112-00', debit: 500000000, credit: 0 }, // 500M cash
            { accountCode: '3110-00', debit: 0, credit: 500000000 }
        ],
        vatType: 'none',
        vatAmount: 0,
        whtType: 'none',
        whtAmount: 0,
        partyName: 'ผู้ถือหุ้นทั้งหมด',
        taxId: ''
    });

    const categories = ['sales', 'service', 'rental', 'utility', 'supplies'];

    for (let b = 0; b < batches; b++) {
        const batchEntries = [];
        const startIdx = b * batchSize + 2; // +2 since CAP-001 is ID 1
        const endIdx = Math.min(count + 1, (b + 1) * batchSize + 1);

        for (let i = startIdx; i <= endIdx; i++) {
            // Random date in 2025
            const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
            const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
            const date = `2025-${month}-${day}`;
            
            // Random category
            const cat = categories[Math.floor(Math.random() * categories.length)];
            let lines = [];
            let desc = '';
            let vatType = 'none';
            let vatAmount = 0;
            let whtType = 'none';
            let whtAmount = 0;

            const amount = Math.floor(Math.random() * 15000) + 500; // 500 to 15500 baht

            switch (cat) {
                case 'sales':
                    // Debit Bank, Credit Sales, Credit Sales VAT (7%)
                    desc = 'ขายสินค้าพร้อมใบกำกับภาษี';
                    vatType = 'sales';
                    vatAmount = Math.round(amount * 0.07 * 100) / 100;
                    lines = [
                        { accountCode: '1112-00', debit: amount + vatAmount, credit: 0 },
                        { accountCode: '4111-00', debit: 0, credit: amount },
                        { accountCode: '2151-00', debit: 0, credit: vatAmount }
                    ];
                    break;
                case 'service':
                    // Service revenue, 7% VAT, 3% Withholding Tax
                    desc = 'รับจ้างบริการที่ปรึกษาหักภาษี ณ ที่จ่าย';
                    vatType = 'sales';
                    vatAmount = Math.round(amount * 0.07 * 100) / 100;
                    whtType = '3';
                    whtAmount = Math.round(amount * 0.03 * 100) / 100;
                    lines = [
                        { accountCode: '1112-00', debit: amount + vatAmount - whtAmount, credit: 0 },
                        { accountCode: '1152-00', debit: whtAmount, credit: 0 },
                        { accountCode: '4112-00', debit: 0, credit: amount },
                        { accountCode: '2151-00', debit: 0, credit: vatAmount }
                    ];
                    break;
                case 'rental':
                    // Rent Expense, 5% Withholding Tax
                    desc = 'จ่ายค่าเช่าสำนักงานรายเดือน หัก ณ ที่จ่าย 5%';
                    whtType = '5';
                    whtAmount = Math.round(amount * 0.05 * 100) / 100;
                    lines = [
                        { accountCode: '5220-00', debit: amount, credit: 0 },
                        { accountCode: '1112-00', debit: 0, credit: amount - whtAmount },
                        { accountCode: '2161-00', debit: 0, credit: whtAmount }
                    ];
                    break;
                case 'utility':
                    // Utility Expense (electricity/water), 7% VAT
                    desc = 'จ่ายค่าไฟฟ้าและน้ำประปาสำนักงาน';
                    vatType = 'purchase';
                    vatAmount = Math.round(amount * 0.07 * 100) / 100;
                    lines = [
                        { accountCode: '5230-00', debit: amount, credit: 0 },
                        { accountCode: '1151-00', debit: vatAmount, credit: 0 },
                        { accountCode: '1112-00', debit: 0, credit: amount + vatAmount }
                    ];
                    break;
                case 'supplies':
                default:
                    // Misc Expense, Cash
                    desc = 'จ่ายค่าใช้จ่ายเบ็ดเตล็ดประจำวัน';
                    lines = [
                        { accountCode: '5250-00', debit: amount, credit: 0 },
                        { accountCode: '1111-00', debit: 0, credit: amount }
                    ];
                    break;
            }

            let partyName = '';
            let taxId = '';
            if (vatType === 'sales' || whtType === '3') {
                partyName = 'ลูกค้าทั่วไป (รายการจำลอง)';
                taxId = '0105560000001';
            } else if (vatType === 'purchase' || whtType === '5') {
                partyName = 'คู่ค้า/เจ้าหนี้ทั่วไป (รายการจำลอง)';
                taxId = '0105560000002';
            } else {
                partyName = 'ร้านค้าทั่วไป (จำลอง)';
                taxId = '';
            }

            batchEntries.push({
                date,
                description: `${desc} (รายการทดลองประสิทธิภาพ #${i})`,
                reference: `SIM-${String(i).padStart(6, '0')}`,
                lines,
                vatType,
                vatAmount,
                whtType,
                whtAmount,
                partyName,
                taxId
            });
        }

        // Perform batch save in IndexedDB
        await db.bulkPut('journalEntries', batchEntries);

        if (onProgress) {
            onProgress(Math.round(((b + 1) / batches) * 100));
        }
    }
    console.log(`Massive seed completed successfully.`);
}

/**
 * Get Sales VAT Report
 */
export async function getSalesVatReport(startDate, endDate) {
    const companyProfile = await db.getByKey('settings', 'company_profile');
    const isVatRegistered = !companyProfile || companyProfile.vatRegistered !== 'no';
    if (!isVatRegistered) {
        return [];
    }

    const mappings = await getAccountMappings();
    const entries = await db.getJournalEntriesRange(startDate, endDate);
    const report = [];

    entries.forEach(entry => {
        if (entry.vatType === 'sales' && entry.vatAmount > 0) {
            let baseAmount = 0;
            entry.lines.forEach(l => {
                if (l.credit > 0 && l.accountCode !== mappings.sales_vat) {
                    baseAmount += l.credit;
                }
            });
            if (baseAmount === 0) {
                baseAmount = Math.round((entry.vatAmount / 0.07) * 100) / 100;
            }

            report.push({
                date: entry.date,
                reference: entry.reference,
                partyName: entry.partyName || 'ลูกค้าทั่วไป',
                taxId: entry.taxId || '-',
                baseAmount,
                vatAmount: entry.vatAmount
            });
        }
    });

    return report.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get Purchase VAT Report
 */
export async function getPurchaseVatReport(startDate, endDate) {
    const companyProfile = await db.getByKey('settings', 'company_profile');
    const isVatRegistered = !companyProfile || companyProfile.vatRegistered !== 'no';
    if (!isVatRegistered) {
        return []; // Non-VAT registered companies do not have purchase VAT reports
    }

    const mappings = await getAccountMappings();
    const entries = await db.getJournalEntriesRange(startDate, endDate);
    const report = [];

    entries.forEach(entry => {
        if (entry.vatType === 'purchase' && entry.vatAmount > 0) {
            let baseAmount = 0;
            entry.lines.forEach(l => {
                if (l.debit > 0 && l.accountCode !== mappings.purchase_vat) {
                    baseAmount += l.debit;
                }
            });
            if (baseAmount === 0) {
                baseAmount = Math.round((entry.vatAmount / 0.07) * 100) / 100;
            }

            report.push({
                date: entry.date,
                reference: entry.reference,
                partyName: entry.partyName || 'คู่ค้า',
                taxId: entry.taxId || '-',
                baseAmount,
                vatAmount: entry.vatAmount
            });
        }
    });

    // Also include unreimbursed petty cash payments (DPs) that have VAT
    const dps = await db.getAll('pettyCashPayments');
    for (const dp of dps) {
        if (!dp.vrId && dp.vatAmount > 0) {
            if (startDate && dp.date < startDate) continue;
            if (endDate && dp.date > endDate) continue;

            let partyName = dp.remarks || 'ทั่วไป';
            let taxId = '-';

            if (dp.contactCode) {
                let contactId = parseInt(String(dp.contactCode).replace(/^[CS]-/, ''));
        let contact = await db.getByKey('contacts', contactId);
                if (contact) {
                    partyName = contact.name;
                    taxId = contact.taxId || '-';
                }
            }

            let baseAmount = dp.totalAmount;
            if (dp.vatType === 'include') {
                baseAmount = dp.totalAmount - dp.vatAmount;
            }

            report.push({
                date: dp.date,
                reference: dp.id,
                partyName: partyName,
                taxId: taxId,
                baseAmount: Math.round(baseAmount * 100) / 100,
                vatAmount: dp.vatAmount
            });
        }
    }

    return report.sort((a, b) => a.date.localeCompare(b.date));
}

export async function getWithholdingTaxReport(startDate, endDate) {
    const mappings = await getAccountMappings();
    const accounts = await getAccounts();
    const getAccountName = (code) => {
        const acc = accounts.find(a => a.code === code);
        return acc ? acc.name : code;
    };
    const entries = await db.getJournalEntriesRange(startDate, endDate);
    const report = [];

    entries.forEach(entry => {
        if (entry.whtAmount > 0) {
            const isPayable = entry.lines.some(l => isWhtPayableAccount(l.accountCode, mappings));
            const rate = parseFloat(entry.whtType) || 0;
            let baseAmount = 0;
            
            if (rate > 0) {
                baseAmount = Math.round((entry.whtAmount * 100 / rate) * 100) / 100;
            } else {
                const excludedCodes = [
                    mappings.cash, '1111-00', '1112-00',
                    mappings.purchase_vat, '1151-00',
                    mappings.wht_receivable, '1152-00',
                    mappings.sales_vat, '2151-00',
                    mappings.wht_payable, mappings.wht_payable_pnd1, mappings.wht_payable_pnd3, mappings.wht_payable_pnd53, '2161-00', '2110-01', '2110-02', '2110-03'
                ];
                entry.lines.forEach(l => {
                    if (l.debit > 0 && !excludedCodes.includes(l.accountCode)) {
                        baseAmount += l.debit;
                    } else if (l.credit > 0 && !excludedCodes.includes(l.accountCode)) {
                        baseAmount += l.credit;
                    }
                });
            }

            let pndType = 'other';
            if (entry.lines.some(l => l.accountCode === mappings.wht_payable_pnd3 || l.accountCode === '2110-02')) {
                pndType = '3';
            } else if (entry.lines.some(l => l.accountCode === mappings.wht_payable_pnd53 || l.accountCode === '2110-03' || l.accountCode === mappings.wht_payable)) {
                pndType = '53';
            }
            
            // Extract expense name
            let expenseName = '';
            if (rate > 0) {
                const expenseLines = entry.lines.filter(l => l.debit > 0 && String(l.accountCode).startsWith('5'));
                if (expenseLines.length > 0) {
                    const names = expenseLines.map(l => getAccountName(l.accountCode));
                    expenseName = [...new Set(names)].join(', ');
                }
            } else {
                const excludedCodes = [
                    mappings.cash, '1111-00', '1112-00',
                    mappings.purchase_vat, '1151-00',
                    mappings.wht_receivable, '1152-00',
                    mappings.sales_vat, '2151-00',
                    mappings.wht_payable, mappings.wht_payable_pnd1, mappings.wht_payable_pnd3, mappings.wht_payable_pnd53, '2161-00', '2110-01', '2110-02', '2110-03'
                ];
                const expenseLines = entry.lines.filter(l => !excludedCodes.includes(l.accountCode) && l.debit > 0);
                if (expenseLines.length > 0) {
                    const names = expenseLines.map(l => getAccountName(l.accountCode));
                    expenseName = [...new Set(names)].join(', ');
                }
            }
            
            report.push({
                date: entry.date,
                reference: entry.reference,
                partyName: entry.partyName || (isPayable ? 'ผู้ถูกหัก' : 'ผู้หัก'),
                taxId: entry.taxId || '-',
                description: expenseName || entry.description,
                whtRate: rate,
                baseAmount,
                whtAmount: entry.whtAmount,
                isPayable,
                pndType
            });
        }
    });

    // Also include unreimbursed petty cash payments (DPs) that have WHT
    const dps = await db.getAll('pettyCashPayments');
    for (const dp of dps) {
        if (!dp.vrId && dp.whtAmount > 0) {
            if (startDate && dp.date < startDate) continue;
            if (endDate && dp.date > endDate) continue;

            let partyName = dp.remarks || 'ทั่วไป';
            let taxId = '-';
            let pndType = '53'; // Default to PND.53

            if (dp.contactCode) {
                let contactId = parseInt(String(dp.contactCode).replace(/^[CS]-/, ''));
        let contact = await db.getByKey('contacts', contactId);
                if (contact) {
                    partyName = contact.name;
                    taxId = contact.taxId || '-';
                    
                    const name = partyName || '';
                    const isIndividual = name.startsWith('นาย') || 
                                         name.startsWith('นาง') || 
                                         name.startsWith('น.ส.') ||
                                         name.startsWith('ด.ช.') ||
                                         name.startsWith('ด.ญ.') ||
                                         (name && !name.includes('บริษัท') && !name.includes('จำกัด') && !name.includes('หจก.') && !name.includes('ห้างหุ้นส่วน') && !name.includes('บมจ.'));
                                         
                    const isCitizenId = taxId && taxId.length === 13 && /^[1-8]/.test(taxId);
                    if (isCitizenId || (isIndividual && !taxId)) {
                        pndType = '3';
                    }
                }
            }

            if (dp.lines && dp.lines.length > 0) {
                dp.lines.forEach(line => {
                    const lineRate = parseFloat(line.whtRate) || 0;
                    const lineWhtAmount = parseFloat(line.whtAmount) || 0;
                    if (lineWhtAmount > 0 || lineRate > 0) {
                        let lineBase = line.amount;
                        if (dp.vatType === 'include') {
                            lineBase = line.amount / 1.07;
                        }
                        const expName = line.accountCode ? getAccountName(line.accountCode) : null;
                        const origDesc = line.description || dp.remarks || 'จ่ายเงินสดย่อย';
                        
                        report.push({
                            date: dp.date,
                            reference: dp.id,
                            partyName: partyName,
                            taxId: taxId,
                            description: expName || origDesc,
                            whtRate: lineRate,
                            baseAmount: Math.round(lineBase * 100) / 100,
                            whtAmount: lineWhtAmount,
                            isPayable: true,
                            pndType
                        });
                    }
                });
            } else {
                let baseAmount = dp.totalAmount;
                if (dp.vatType === 'include' && dp.vatAmount > 0) {
                    baseAmount = dp.totalAmount - dp.vatAmount;
                }
                const rate = parseFloat(dp.whtType) || 0;
                const expName = dp.accountCode ? getAccountName(dp.accountCode) : null;
                const origDesc = dp.remarks || 'จ่ายเงินสดย่อย';
                
                report.push({
                    date: dp.date,
                    reference: dp.id,
                    partyName: partyName,
                    taxId: taxId,
                    description: expName || origDesc,
                    whtRate: rate,
                    baseAmount: Math.round(baseAmount * 100) / 100,
                    whtAmount: dp.whtAmount,
                    isPayable: true,
                    pndType
                });
            }
        }
    }

    return report.sort((a, b) => a.date.localeCompare(b.date));
}

export async function postReceiptToJournal(receipt) {
    const mappings = await getAccountMappings();
    const accounts = await db.getAll('accounts');
    
    const resolvedAR = findValidAccount(accounts, mappings.ar, '1', '1121-00');
    const resolvedCash = findValidAccount(accounts, mappings.cash, '1', '1111-00');
    const resolvedWHTRec = findValidAccount(accounts, mappings.wht_receivable, '1', '1152-00');
    const resolvedDiscount = findValidAccount(accounts, mappings.sales_discount, '5', '5250-00');

    const lines = [];
    
    // 1. Credit: Accounts Receivable
    lines.push({ accountCode: resolvedAR, debit: 0, credit: receipt.grandTotal });
    
    // 2. Debits
    if (receipt.cashAmount > 0) {
        lines.push({ accountCode: resolvedCash, debit: receipt.cashAmount, credit: 0 });
    }
    if (receipt.whtAmount > 0) {
        lines.push({ accountCode: resolvedWHTRec, debit: receipt.whtAmount, credit: 0 });
    }
    if (receipt.discountAmount > 0) {
        lines.push({ accountCode: resolvedDiscount, debit: receipt.discountAmount, credit: 0 });
    }
    
    // Other payments (e.g., bank transfer, cheque)
    if (receipt.paymentLines && receipt.paymentLines.length > 0) {
        receipt.paymentLines.forEach(line => {
            if (line.amount > 0) {
                const pAcc = findValidAccount(accounts, line.accountCode, '1', resolvedCash);
                lines.push({ accountCode: pAcc, debit: line.amount, credit: 0 });
            }
        });
    }
    
    const jv = {
        date: receipt.date,
        description: `รับชำระหนี้จากลูกหนี้การค้าตามใบรับชำระเลขที่ ${receipt.id} (${receipt.customerName})`,
        reference: receipt.id,
        lines: lines,
        vatType: 'none',
        vatAmount: 0,
        whtType: receipt.whtAmount > 0 ? '3' : 'none',
        whtAmount: receipt.whtAmount,
        partyName: receipt.customerName,
        taxId: ''
    };
    if (receipt.journalId) {
        jv.id = receipt.journalId;
    }
    
    const journalId = await db.putItem('journalEntries', jv);
    receipt.journalId = journalId;
    await db.putItem('arReceipts', receipt);
    return journalId;
}

/**
 * Auto-Post Payment (AP Settlement) to General Journal
 */
export async function postPaymentToJournal(payment) {
    const mappings = await getAccountMappings();
    const accounts = await db.getAll('accounts');
    
    const resolvedAP = findValidAccount(accounts, mappings.ap, '2', '2111-00');
    const resolvedCash = findValidAccount(accounts, mappings.cash, '1', '1111-00');
    const resolvedWHTPay = resolveWhtPayableAccount(accounts, mappings, payment.supplierName || '', '', '');
    const resolvedDiscount = findValidAccount(accounts, mappings.purchase_discount, '4', '4190-00');

    const lines = [];
    
    // 1. Debit: Accounts Payable
    lines.push({ accountCode: resolvedAP, debit: payment.grandTotal, credit: 0 });
    
    // 2. Credits
    if (payment.cashAmount > 0) {
        lines.push({ accountCode: resolvedCash, debit: 0, credit: payment.cashAmount });
    }
    if (payment.whtAmount > 0) {
        lines.push({ accountCode: resolvedWHTPay, debit: 0, credit: payment.whtAmount });
    }
    if (payment.discountAmount > 0) {
        lines.push({ accountCode: resolvedDiscount, debit: 0, credit: payment.discountAmount });
    }
    
    // Other payments (e.g. cheque, bank transfer)
    if (payment.paymentLines && payment.paymentLines.length > 0) {
        payment.paymentLines.forEach(line => {
            if (line.amount > 0) {
                const pAcc = findValidAccount(accounts, line.accountCode, '1', resolvedCash);
                lines.push({ accountCode: pAcc, debit: 0, credit: line.amount });
            }
        });
    }
    
    const jv = {
        date: payment.date,
        description: `จ่ายชำระหนี้ให้เจ้าหนี้การค้าตามใบสำคัญจ่ายเลขที่ ${payment.id} (${payment.supplierName})`,
        reference: payment.id,
        lines: lines,
        vatType: 'none',
        vatAmount: 0,
        whtType: payment.whtAmount > 0 ? '3' : 'none',
        whtAmount: payment.whtAmount,
        partyName: payment.supplierName,
        taxId: ''
    };
    if (payment.journalId) {
        jv.id = payment.journalId;
    }
    
    const journalId = await db.putItem('journalEntries', jv);
    payment.journalId = journalId;
    await db.putItem('apPayments', payment);
    return journalId;
}

/**
 * Get the opening journal entry (isOpening === true) if it exists
 */
export async function getOpeningJournalEntry() {
    const entries = await db.getAll('journalEntries');
    return entries.find(e => e.isOpening === true || e.reference === 'ยอดยกมา');
}

/**
 * Save opening balances into a single balanced Journal Entry.
 * If total debits and credits do not match, the difference will be balanced using '9999-99' (Suspense Account).
 */
export async function saveOpeningBalances(date, linesList) {
    let activeLines = linesList.filter(l => (l.debit > 0 || l.credit > 0) && l.accountCode !== '9999-99');
    
    let totalDebit = activeLines.reduce((sum, l) => sum + l.debit, 0);
    let totalCredit = activeLines.reduce((sum, l) => sum + l.credit, 0);
    let diff = totalDebit - totalCredit;
    
    if (Math.abs(diff) >= 0.01) {
        const suspenseCode = '9999-99';
        const existingSuspenseIdx = activeLines.findIndex(l => l.accountCode === suspenseCode);
        
        let suspenseDebit = diff < 0 ? Math.abs(diff) : 0;
        let suspenseCredit = diff > 0 ? diff : 0;
        
        if (existingSuspenseIdx !== -1) {
            activeLines[existingSuspenseIdx].debit += suspenseDebit;
            activeLines[existingSuspenseIdx].credit += suspenseCredit;
        } else {
            activeLines.push({
                accountCode: suspenseCode,
                debit: suspenseDebit,
                credit: suspenseCredit
            });
        }
    }
    
    const existingEntry = await getOpeningJournalEntry();
    
    const jv = {
        date: date || '2026-01-01',
        description: 'บันทึกยอดยกมาเริ่มต้นงวดบัญชี',
        reference: 'ยอดยกมา',
        lines: activeLines.map(l => ({
            accountCode: l.accountCode,
            debit: parseFloat(l.debit.toFixed(2)),
            credit: parseFloat(l.credit.toFixed(2))
        })),
        vatType: 'none',
        vatAmount: 0,
        whtType: 'none',
        whtAmount: 0,
        partyName: 'ยอดยกมาเริ่มต้น',
        taxId: '',
        isOpening: true
    };
    
    if (existingEntry && existingEntry.id) {
        jv.id = existingEntry.id;
    }
    
    const entryId = await db.putItem('journalEntries', jv);
    return entryId;
}

/**
 * Post Petty Cash Reimbursement (VR) to General Journal
 */
export async function postPettyCashReimbursementToJournal(vr) {
    const mappings = await getAccountMappings();
    const accounts = await db.getAll("accounts");
    
    // 0. Clean up any existing journal entries associated with this VR to avoid duplicates when editing
    const jes = await db.getAll('journalEntries');
    const matchingJes = jes.filter(je => je.reference === vr.id || (je.reference && je.reference.startsWith(vr.id + ' / ')));
    for (const je of matchingJes) {
        await db.deleteItem('journalEntries', je.id);
    }

    // 1. Fetch all DPs in this VR
    const dpList = [];
    for (const dpId of vr.dpIds) {
        const dp = await db.getByKey('pettyCashPayments', dpId);
        if (dp) dpList.push(dp);
    }
    
    // 2. Separate DPs into those requiring separate JVs (WHT or VAT present) and aggregated simple DPs
    const separateDPs = dpList.filter(dp => (dp.whtAmount && dp.whtAmount > 0) || (dp.vatAmount && dp.vatAmount > 0));
    const aggregateDPs = dpList.filter(dp => (!dp.whtAmount || dp.whtAmount <= 0) && (!dp.vatAmount || dp.vatAmount <= 0));
    
    let journalId = null;
    
    // 3. Post a separate JV for each WHT/VAT DP to preserve vendor details
    for (const dp of separateDPs) {
        // Look up contact details
        let partyName = dp.remarks || 'ผู้รับเงิน';
        let taxId = '';
        
        if (dp.contactCode) {
            let contactId = parseInt(String(dp.contactCode).replace(/^[CS]-/, ''));
        let contact = await db.getByKey('contacts', contactId);
            if (contact) {
                partyName = contact.name;
                taxId = contact.taxId || '';
            }
        }
        
        const companyProfile = await db.getByKey('settings', 'company_profile');
        const isVatRegistered = !companyProfile || companyProfile.vatRegistered !== 'no';

        // Group lines by whtRate
        const groups = {};
        dp.lines.forEach(line => {
            const rate = line.whtRate !== undefined ? line.whtRate : (dp.whtType || 'none');
            if (!groups[rate]) {
                groups[rate] = [];
            }
            groups[rate].push(line);
        });

        // Post a JV for each WHT group
        for (const [whtRate, groupLines] of Object.entries(groups)) {
            const groupTotal = groupLines.reduce((sum, l) => sum + l.amount, 0);
            if (groupTotal <= 0) continue;

            const prop = dp.totalAmount > 0 ? (groupTotal / dp.totalAmount) : 0;
            const groupVatAmount = Math.round((dp.vatAmount || 0) * prop * 100) / 100;

            let groupWhtAmount = 0;
            groupLines.forEach(l => {
                if (l.whtAmount !== undefined) {
                    groupWhtAmount += l.whtAmount;
                } else {
                    const rateVal = parseFloat(whtRate) || 0;
                    let lineBase = l.amount;
                    if (dp.vatType === 'include') {
                        lineBase = l.amount / 1.07;
                    }
                    groupWhtAmount += Math.round((lineBase * (rateVal / 100)) * 100) / 100;
                }
            });
            groupWhtAmount = Math.round(groupWhtAmount * 100) / 100;

            const lines = [];

            // Debits (Expenses - Pre-VAT amount or Capitalized VAT)
            groupLines.forEach(line => {
                if (line.amount > 0) {
                    let lineBaseAmount = line.amount;
                    if (isVatRegistered) {
                        if (dp.vatType === 'include' && dp.vatAmount > 0) {
                            lineBaseAmount = line.amount - (line.amount / dp.totalAmount) * dp.vatAmount;
                        }
                    } else {
                        if (dp.vatType === 'exclude' && dp.vatAmount > 0) {
                            lineBaseAmount = line.amount + (line.amount / dp.totalAmount) * dp.vatAmount;
                        }
                    }
                    lines.push({
                        accountCode: line.accountCode,
                        debit: Math.round(lineBaseAmount * 100) / 100,
                        credit: 0,
                        description: line.description || dp.remarks
                    });
                }
            });

            // Debit: Purchase VAT (proportional)
            if (isVatRegistered && groupVatAmount > 0) {
                lines.push({
                    accountCode: findValidAccount(accounts, mappings.purchase_vat, '1', '1151-00'),
                    debit: groupVatAmount,
                    credit: 0,
                    description: `ภาษีซื้อ จากการจ่ายเงินสดย่อย ${dp.id} (${whtRate === 'none' ? 'ไม่หัก' : `หัก ${whtRate}%`})`
                });
            }

            // Credit: WHT Payable
            if (groupWhtAmount > 0) {
                const dpDesc = dp.lines && dp.lines.length > 0 ? dp.lines.map(l => l.remarks).join(' ') : dp.remarks || '';
                lines.push({
                    accountCode: resolveWhtPayableAccount(accounts, mappings, dp.contactName || '', dp.taxId || '', dpDesc),
                    debit: 0,
                    credit: groupWhtAmount,
                    description: `ภาษีหัก ณ ที่จ่าย ${whtRate}% จากการจ่ายเงินสดย่อย ${dp.id}`
                });
            }

            // Net Cash amount paid from petty cash
            const groupNetCashAmount = dp.vatType === 'exclude' ? (groupTotal + groupVatAmount - groupWhtAmount) : (groupTotal - groupWhtAmount);
            if (groupNetCashAmount > 0) {
                lines.push({
                    accountCode: vr.reimburseAccount,
                    debit: 0,
                    credit: Math.round(groupNetCashAmount * 100) / 100,
                    description: `ชดเชยจ่ายเงินสดย่อยสุทธิ ${dp.id} (${whtRate === 'none' ? 'ไม่หัก' : `หัก ${whtRate}%`})`
                });
            }

            const activeRates = Object.keys(groups).filter(r => groups[r].reduce((sum, l) => sum + l.amount, 0) > 0);
            const hasMultipleRates = activeRates.length > 1;
            const rateSuffix = hasMultipleRates ? ` (${whtRate === 'none' ? 'No WHT' : `WHT ${whtRate}%`})` : '';
            const referenceStr = dp.taxInvoiceNo 
                ? `${vr.id} / ${dp.id} / ${dp.taxInvoiceNo}${rateSuffix}` 
                : `${vr.id} / ${dp.id}${rateSuffix}`;

            const jv = {
                date: dp.date || vr.date,
                description: `ชดเชยเงินสดย่อย (${dp.id}): ${dp.remarks}${rateSuffix}`,
                reference: referenceStr,
                lines: lines,
                vatType: groupVatAmount > 0 ? 'purchase' : 'none',
                vatAmount: groupVatAmount || 0,
                whtType: whtRate,
                whtAmount: groupWhtAmount || 0,
                partyName: partyName,
                taxId: taxId
            };

            const entryId = await db.putItem('journalEntries', jv);
            if (!journalId) journalId = entryId;
        }
    }
    
    // 4. Post a summary JV for the remaining non-WHT/non-VAT DPs (if any)
    if (aggregateDPs.length > 0 || dpList.length === 0) {
        // Aggregate lines by accountCode
        const agg = {};
        aggregateDPs.forEach(dp => {
            dp.lines.forEach(l => {
                if (!agg[l.accountCode]) {
                    agg[l.accountCode] = {
                        accountCode: l.accountCode,
                        amount: 0
                    };
                }
                agg[l.accountCode].amount += l.amount;
            });
        });
        
        const lines = [];
        Object.values(agg).forEach(line => {
            if (line.amount > 0) {
                lines.push({
                    accountCode: line.accountCode,
                    debit: Math.round(line.amount * 100) / 100,
                    credit: 0
                });
            }
        });
        
        const totalAggregateAmount = aggregateDPs.reduce((sum, d) => sum + d.totalAmount, 0);
        if (totalAggregateAmount > 0 || lines.length > 0) {
            lines.push({
                accountCode: vr.reimburseAccount,
                debit: 0,
                credit: Math.round(totalAggregateAmount * 100) / 100
            });
            
            const jv = {
                date: vr.date,
                description: `เบิกชดเชยเงินสดย่อยตามใบเบิกเลขที่ ${vr.id}: ${vr.explanation}`,
                reference: vr.id,
                lines: lines,
                vatType: 'none',
                vatAmount: 0,
                whtType: 'none',
                whtAmount: 0,
                partyName: 'Custodian (เงินสดย่อย)',
                taxId: ''
            };
            
            const entryId = await db.putItem('journalEntries', jv);
            if (!journalId) journalId = entryId;
        }
    }
    
    vr.journalId = journalId;
    await db.putItem('pettyCashReimbursements', vr);
    return journalId;
}

/**
 * Repost all transactions (Invoices, Bills, Receipts, Payments, and Petty Cash Reimbursements)
 * to the General Journal using the current Linked Account Mappings.
 */
export async function repostTransactions({ scope, startDate, endDate, docType, docId }) {
    // 1. Fetch transactions based on scope
    let invoices = [];
    let bills = [];
    let receipts = [];
    let payments = [];
    let reimbursements = [];

    if (scope === 'all') {
        invoices = await db.getAll('invoices');
        bills = await db.getAll('bills');
        receipts = await db.getAll('arReceipts');
        payments = await db.getAll('apPayments');
        reimbursements = await db.getAll('pettyCashReimbursements');
    } else if (scope === 'range') {
        const invAll = await db.getAll('invoices');
        const billAll = await db.getAll('bills');
        const recAll = await db.getAll('arReceipts');
        const payAll = await db.getAll('apPayments');
        const reimAll = await db.getAll('pettyCashReimbursements');

        const filterRange = (items) => items.filter(item => {
            if (!item.date) return false;
            if (startDate && item.date < startDate) return false;
            if (endDate && item.date > endDate) return false;
            return true;
        });

        invoices = filterRange(invAll);
        bills = filterRange(billAll);
        receipts = filterRange(recAll);
        payments = filterRange(payAll);
        reimbursements = filterRange(reimAll);
    } else if (scope === 'single') {
        if (!docId) throw new Error('กรุณาระบุเลขที่เอกสาร');
        
        let storeName = '';
        if (docType === 'invoice') storeName = 'invoices';
        else if (docType === 'bill') storeName = 'bills';
        else if (docType === 'arReceipt') storeName = 'arReceipts';
        else if (docType === 'apPayment') storeName = 'apPayments';
        else if (docType === 'pettyCashReimbursement') storeName = 'pettyCashReimbursements';

        const item = await db.getByKey(storeName, docId);
        if (!item) {
            throw new Error(`ไม่พบเอกสารประเภท ${docType} เลขที่ ${docId}`);
        }

        if (docType === 'invoice') invoices = [item];
        else if (docType === 'bill') bills = [item];
        else if (docType === 'arReceipt') receipts = [item];
        else if (docType === 'apPayment') payments = [item];
        else if (docType === 'pettyCashReimbursement') reimbursements = [item];
    }

    // 2. Fetch all current journal entries to locate JVs to delete
    const allJVs = await db.getAll('journalEntries');
    const jvIdsToDelete = new Set();

    const targetReferences = new Set();
    invoices.forEach(inv => targetReferences.add(inv.id));
    bills.forEach(bill => targetReferences.add(bill.id));
    receipts.forEach(re => targetReferences.add(re.id));
    payments.forEach(p => targetReferences.add(p.id));
    reimbursements.forEach(vr => targetReferences.add(vr.id));

    allJVs.forEach(jv => {
        if (targetReferences.has(jv.reference)) {
            if (jv.id) jvIdsToDelete.add(jv.id);
        } else {
            reimbursements.forEach(vr => {
                const vrPrefix = vr.id + ' / ';
                if (jv.reference && jv.reference.startsWith(vrPrefix)) {
                    if (jv.id) jvIdsToDelete.add(jv.id);
                }
            });
        }
    });

    // Delete identified JVs from database
    for (const jvId of jvIdsToDelete) {
        await db.deleteItem('journalEntries', jvId);
    }

    // 3. Post selected transactions in order of date
    const ops = [];

    invoices.forEach(inv => {
        ops.push({
            date: inv.date || '2026-01-01',
            run: async () => {
                await postInvoiceToJournal(inv);
            }
        });
    });

    bills.forEach(bill => {
        ops.push({
            date: bill.date || '2026-01-01',
            run: async () => {
                await postBillToJournal(bill);
            }
        });
    });

    receipts.forEach(re => {
        ops.push({
            date: re.date || '2026-01-01',
            run: async () => {
                await postReceiptToJournal(re);
            }
        });
    });

    payments.forEach(p => {
        ops.push({
            date: p.date || '2026-01-01',
            run: async () => {
                await postPaymentToJournal(p);
            }
        });
    });

    reimbursements.forEach(vr => {
        ops.push({
            date: vr.date || '2026-01-01',
            run: async () => {
                await postPettyCashReimbursementToJournal(vr);
            }
        });
    });

    // Sort chronologically by date
    ops.sort((a, b) => a.date.localeCompare(b.date));

    // Execute posting sequentially
    let errorCount = 0;
    let lastError = null;
    
    for (const op of ops) {
        try {
            await op.run();
        } catch (err) {
            console.error('Failed to repost transaction:', err);
            errorCount++;
            lastError = err;
        }
    }
    
    if (errorCount > 0) {
        throw new Error(`เกิดข้อผิดพลาด ${errorCount} รายการ: ${lastError.message}`);
    }
}

export async function repostAllTransactions() {
    await repostTransactions({ scope: 'all' });
}
