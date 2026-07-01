// js/db.js - REST API Client for MySQL Accounting & Inventory System

let suppressDbChangedEvent = false;

export function setSuppressDbChangedEvent(val) {
    suppressDbChangedEvent = val;
}

function notifyDbChanged(storeName) {
    if (!suppressDbChangedEvent) {
        window.dispatchEvent(new CustomEvent('db-changed', { detail: { storeName } }));
    }
}

export function getActiveCompanyCode() {
    return localStorage.getItem('active_company_code') || 'test';
}

export function setActiveCompanyCode(code) {
    localStorage.setItem('active_company_code', code);
    closeDB();
}

// Dummy functions to maintain compatibility with IndexedDB lifecycle calls
export function closeDB() {}
export function openSystemDB() { return Promise.resolve(null); }
export function openDB() { return Promise.resolve(null); }

function bustCache(url) {
    return url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now();
}


// --- Companies Management ---
export async function getCompanies() {
    const res = await fetch(bustCache('/api/companies'));
    if (!res.ok) throw new Error('Failed to fetch companies');
    return res.json();
}

export async function addCompany(code, name) {
    const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, name })
    });
    if (!res.ok) throw new Error('Failed to add company');
    notifyDbChanged('companies');
    return res.json();
}

export async function deleteCompany(code) {
    const res = await fetch(`/api/companies/${code}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete company');
    notifyDbChanged('companies');
    return true;
}

// Map store name to REST base route name
function mapStoreToRoute(storeName) {
    switch (storeName) {
        case 'accounts': return 'accounts';
        case 'journalEntries': return 'journal-entries';
        case 'invoices': return 'invoices';
        case 'bills': return 'bills';
        case 'contacts': return 'contacts';
        case 'paymentMethods': return 'payment-methods';
        case 'expenseCatalog': return 'expense-catalog';
        case 'arReceipts': return 'ar-receipts';
        case 'apPayments': return 'ap-payments';
        case 'pettyCashPayments': return 'petty-cash-payments';
        case 'pettyCashReimbursements': return 'petty-cash-reimbursements';
        case 'products': return 'products';
        case 'priceLists': return 'price-lists';
        case 'inventoryTransactions': return 'inventory-transactions';
        case 'inventoryCounts': return 'inventory-counts';
        default: return null;
    }
}

// --- Generic CRUD Operations ---
export async function getAll(storeName) {
    const companyCode = getActiveCompanyCode();
    
    // Special handling for settings store (key-value mapping)
    if (storeName === 'settings') {
        const res = await fetch(bustCache(`/api/settings/${companyCode}`));
        if (!res.ok) throw new Error('Failed to fetch settings');
        const data = await res.json();
        return Object.keys(data).map(key => ({ key, value: data[key] }));
    }
    
    const route = mapStoreToRoute(storeName);
    if (!route) throw new Error(`Unknown store name: ${storeName}`);
    
    const res = await fetch(bustCache(`/api/${route}/${companyCode}`));
    if (!res.ok) throw new Error(`Failed to fetch ${storeName}`);
    return res.json();
}

export async function getByKey(storeName, key) {
    const companyCode = getActiveCompanyCode();
    
    if (storeName === 'settings') {
        const res = await fetch(bustCache(`/api/settings/${companyCode}`));
        if (!res.ok) throw new Error('Failed to fetch settings');
        const data = await res.json();
        return data[key];
    }
    
    const route = mapStoreToRoute(storeName);
    if (!route) throw new Error(`Unknown store name: ${storeName}`);
    
    // Query directly if endpoint supports singular GET, else fetch all and filter
    const directGetStores = ['invoices', 'bills', 'journalEntries', 'inventoryCounts'];
    if (directGetStores.includes(storeName)) {
        const res = await fetch(bustCache(`/api/${route}/${companyCode}/${key}`));
        if (res.status === 404) return undefined;
        if (!res.ok) throw new Error(`Failed to fetch key ${key} from ${storeName}`);
        return res.json();
    }
    
    const allItems = await getAll(storeName);
    return allItems.find(item => item.id === key || item.code === key || item.id === parseInt(key));
}

export async function putItem(storeName, item) {
    const companyCode = getActiveCompanyCode();
    
    if (storeName === 'settings') {
        const res = await fetch(`/api/settings/${companyCode}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
        });
        if (!res.ok) throw new Error('Failed to save settings');
        notifyDbChanged(storeName);
        return item.key;
    }
    
    const route = mapStoreToRoute(storeName);
    if (!route) throw new Error(`Unknown store name: ${storeName}`);
    
    const res = await fetch(`/api/${route}/${companyCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
    });
    if (!res.ok) throw new Error(`Failed to save item to ${storeName}`);
    const resData = await res.json();
    notifyDbChanged(storeName);
    return resData.id || item.id || item.code;
}

export async function deleteItem(storeName, key) {
    const companyCode = getActiveCompanyCode();
    const route = mapStoreToRoute(storeName);
    if (!route) throw new Error(`Unknown store name: ${storeName}`);
    
    const res = await fetch(`/api/${route}/${companyCode}/${key}`, {
        method: 'DELETE'
    });
    if (!res.ok) {
        let errMsg = `Failed to delete key ${key} from ${storeName}`;
        try {
            const errData = await res.json();
            if (errData && errData.message) {
                errMsg = errData.message;
            } else if (errData && errData.error && typeof errData.error === 'string') {
                errMsg = errData.error;
            }
        } catch (e) {
            // Ignore JSON parse errors
        }
        throw new Error(errMsg);
    }
    notifyDbChanged(storeName);
    return true;
}

export async function bulkPut(storeName, items) {
    if (!items || items.length === 0) return true;
    
    // Special bulk path for inventory transactions
    if (storeName === 'inventoryTransactions') {
        const companyCode = getActiveCompanyCode();
        const res = await fetch(`/api/inventory-transactions-bulk/${companyCode}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transactions: items })
        });
        if (!res.ok) throw new Error('Failed to bulk save inventory transactions');
        notifyDbChanged(storeName);
        return true;
    }
    
    // Fallback to sequential PUTs for other stores
    for (const item of items) {
        await putItem(storeName, item);
    }
    return true;
}

export async function clearStore(storeName) {
    // Reset database endpoint handles individual clears dynamically
    return true;
}

export async function getJournalEntriesRange(startDate, endDate) {
    const companyCode = getActiveCompanyCode();
    let url = `/api/journal-entries/${companyCode}`;
    const params = [];
    if (startDate) params.push(`startDate=${startDate}`);
    if (endDate) params.push(`endDate=${endDate}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    
    const res = await fetch(bustCache(url));
    if (!res.ok) throw new Error('Failed to fetch journal entries range');
    return res.json();
}

export async function resetDatabase() {
    const companyCode = getActiveCompanyCode();
    const res = await fetch(`/api/companies/${companyCode}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to reset database: delete failed');
    
    const companyList = await getCompanies();
    const company = companyList.find(c => c.code === companyCode) || { name: 'Company Name' };
    await addCompany(companyCode, company.name);
    
    notifyDbChanged('all');
    return true;
}

export async function renameAccount(oldCode, newCode) {
    const companyCode = getActiveCompanyCode();
    const res = await fetch(`/api/accounts/${companyCode}/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldCode, newCode })
    });
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to rename account');
    }
    notifyDbChanged('accounts');
    return true;
}

export async function copyCoaToCompany(fromCompanyCode, toCompanyCode) {
    const res = await fetch('/api/accounts/copy-to-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromCompanyCode, toCompanyCode })
    });
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to copy chart of accounts');
    }
    notifyDbChanged('accounts');
    return true;
}

