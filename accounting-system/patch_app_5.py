import os

file_path = r'c:\Users\payon\OneDrive\Documents\Simacc\accounting-system\temp_app.js'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update startEditInvoice
old_inv = """    const targetName = inv.customerName || '';
    document.getElementById('inv-customer-name').value = targetName;
    
    let foundId = 'manual';
    try {
        const customers = await db.getAll('customers');
        const match = customers.find(c => c.name === targetName);
        if (match) foundId = match.id.toString();
    } catch(e) {}"""

new_inv = """    const targetName = inv.customerName || '';
    document.getElementById('inv-customer-name').value = targetName;
    
    let foundId = 'manual';
    try {
        const customers = await db.getAll('customers');
        let match = customers.find(c => c.name === targetName);
        if (!match && (inv.taxId || inv.tax_id)) {
            const tId = inv.taxId || inv.tax_id;
            match = customers.find(c => c.taxId === tId || c.tax_id === tId);
            if (match) {
                document.getElementById('inv-customer-name').value = match.name;
            }
        }
        if (match) foundId = match.id.toString();
    } catch(e) {}"""

content = content.replace(old_inv, new_inv)


# 2. Update startEditBill
old_bill = """    const targetName = bill.vendorName || bill.vendor_name || '';
    document.getElementById('bill-vendor-name').value = targetName;
    
    let foundId = 'manual';
    try {
        const suppliers = await db.getAll('suppliers');
        const match = suppliers.find(s => s.name === targetName);
        if (match) foundId = match.id.toString();
    } catch(e) {}"""

new_bill = """    const targetName = bill.vendorName || bill.vendor_name || '';
    document.getElementById('bill-vendor-name').value = targetName;
    
    let foundId = 'manual';
    try {
        const suppliers = await db.getAll('suppliers');
        let match = suppliers.find(s => s.name === targetName);
        if (!match && (bill.taxId || bill.tax_id)) {
            const tId = bill.taxId || bill.tax_id;
            match = suppliers.find(s => s.taxId === tId || s.tax_id === tId);
            if (match) {
                document.getElementById('bill-vendor-name').value = match.name;
            }
        }
        if (match) foundId = match.id.toString();
    } catch(e) {}"""

content = content.replace(old_bill, new_bill)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched temp_app.js with taxId fallback successfully!")
