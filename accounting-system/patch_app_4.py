import os

file_path = r'c:\Users\payon\OneDrive\Documents\Simacc\accounting-system\temp_app.js'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update startEditInvoice
old_inv = """    document.getElementById('inv-customer-select').value = 'manual';
    document.getElementById('inv-customer-name').value = inv.customerName || '';"""

new_inv = """    const targetName = inv.customerName || '';
    document.getElementById('inv-customer-name').value = targetName;
    
    let foundId = 'manual';
    try {
        const customers = await db.getAll('customers');
        const match = customers.find(c => c.name === targetName);
        if (match) foundId = match.id.toString();
    } catch(e) {}
    
    const customerSelect = document.getElementById('inv-customer-select');
    const nameInput = document.getElementById('inv-customer-name');
    
    if (foundId !== 'manual') {
        customerSelect.value = foundId;
        nameInput.style.display = 'none';
        nameInput.required = false;
    } else {
        customerSelect.value = 'manual';
        nameInput.style.display = 'block';
        nameInput.required = true;
    }"""

content = content.replace(old_inv, new_inv)


# 2. Update startEditBill
old_bill = """    document.getElementById('bill-vendor-select').value = 'manual';
    document.getElementById('bill-vendor-name').value = bill.vendorName || bill.vendor_name || '';"""

new_bill = """    const targetName = bill.vendorName || bill.vendor_name || '';
    document.getElementById('bill-vendor-name').value = targetName;
    
    let foundId = 'manual';
    try {
        const suppliers = await db.getAll('suppliers');
        const match = suppliers.find(s => s.name === targetName);
        if (match) foundId = match.id.toString();
    } catch(e) {}
    
    const vendorSelect = document.getElementById('bill-vendor-select');
    const nameInput = document.getElementById('bill-vendor-name');
    
    if (foundId !== 'manual') {
        vendorSelect.value = foundId;
        nameInput.style.display = 'none';
        nameInput.required = false;
    } else {
        vendorSelect.value = 'manual';
        nameInput.style.display = 'block';
        nameInput.required = true;
    }"""

content = content.replace(old_bill, new_bill)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched temp_app.js for dropdown selection successfully!")
