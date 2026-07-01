import os
import re

file_path = r'c:\Users\payon\OneDrive\Documents\Simacc\accounting-system\temp_app.js'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update addBillItemRow signature
content = content.replace(
    "async function addBillItemRow(expenseCode = '', qty = 1, price = 0, hasVat = false, whtRate = 'none') {",
    "async function addBillItemRow(expenseCode = '', description = '', qty = 1, price = 0, hasVat = false, whtRate = 'none') {"
)

# 2. Update tr.innerHTML
old_tr = """    tr.innerHTML = `
        <td>${selectHtml}</td>
        <td><input type="number" class="form-control num-col bill-item-qty" value="${qty}" min="0" step="any" style="text-align: right;"></td>"""
new_tr = """    tr.innerHTML = `
        <td>${selectHtml}</td>
        <td><input type="text" class="form-control bill-item-desc" placeholder="รายละเอียด..." value="${description ? String(description).replace(/\"/g, '&quot;') : ''}"></td>
        <td><input type="number" class="form-control num-col bill-item-qty" value="${qty}" min="0" step="any" style="text-align: right;"></td>"""
content = content.replace(old_tr, new_tr)

# 3. Update line 1984
content = content.replace(
    "addBillItemRow(templates[0].name, 1, templates[0].amount || 0);",
    "addBillItemRow(templates[0].code, templates[0].name, 1, templates[0].amount || 0);"
)

# 4. Update line 4199
content = content.replace(
    "addBillItemRow(template.name, 1, template.amount || 0);",
    "addBillItemRow(template.code, template.name, 1, template.amount || 0);"
)

# 5. Update line 4376 to 4381 (add description collection)
old_vars = """        const taxId = document.getElementById('bill-tax-id').value;
        const address = (document.getElementById('bill-address') || {}).value || '';
        const date = document.getElementById('bill-date').value;"""
new_vars = """        const taxId = document.getElementById('bill-tax-id').value;
        const address = (document.getElementById('bill-address') || {}).value || '';
        const description = (document.getElementById('bill-description') || {}).value || '';
        const date = document.getElementById('bill-date').value;"""
content = content.replace(old_vars, new_vars)

# 6. Update items.push
old_push = """        document.querySelectorAll('#bill-items-tbody .bill-item-row').forEach(row => {
            const desc = row.querySelector('.bill-item-desc')?.value || '';
            const qty = parseFloat(row.querySelector('.bill-item-qty')?.value) || 0;
            const price = parseFloat(row.querySelector('.bill-item-price')?.value) || 0;
            const hasVat = row.querySelector('.bill-item-vat')?.checked || false;
            const whtRate = row.querySelector('.bill-item-wht')?.value || 'none';
            if (desc || price) {
                items.push({ 
                    description: desc, 
                    quantity: qty, 
                    unitPrice: price, 
                    amount: Math.round(qty * price * 100) / 100,
                    hasVat,
                    whtRate
                });
            }
        });"""
new_push = """        document.querySelectorAll('#bill-items-tbody .bill-item-row').forEach(row => {
            const code = row.querySelector('.bill-item-code')?.value || '';
            const desc = row.querySelector('.bill-item-desc')?.value || '';
            const qty = parseFloat(row.querySelector('.bill-item-qty')?.value) || 0;
            const price = parseFloat(row.querySelector('.bill-item-price')?.value) || 0;
            const hasVat = row.querySelector('.bill-item-vat')?.checked || false;
            const whtRate = row.querySelector('.bill-item-wht')?.value || 'none';
            if (desc || price) {
                items.push({ 
                    expenseCode: code,
                    description: desc, 
                    quantity: qty, 
                    unitPrice: price, 
                    amount: Math.round(qty * price * 100) / 100,
                    hasVat,
                    whtRate
                });
            }
        });"""
content = content.replace(old_push, new_push)

# 7. Update bill saving object
old_obj = """            taxId,
            address,
            expenseAccount,"""
new_obj = """            taxId,
            address,
            description,
            expenseAccount,"""
content = content.replace(old_obj, new_obj)

# 8. Update startEditBill
old_edit = """    document.getElementById('bill-tax-id').value = bill.taxId || bill.tax_id || '';
    const addrEl = document.getElementById('bill-address');
    if (addrEl) addrEl.value = bill.address || '';
    document.getElementById('bill-date').value = bill.date;"""
new_edit = """    document.getElementById('bill-tax-id').value = bill.taxId || bill.tax_id || '';
    const addrEl = document.getElementById('bill-address');
    if (addrEl) addrEl.value = bill.address || '';
    const descEl = document.getElementById('bill-description');
    if (descEl) descEl.value = bill.description || '';
    document.getElementById('bill-date').value = bill.date;"""
content = content.replace(old_edit, new_edit)

# 9. Update item loading
old_item_load = """        bill.items.forEach(item => {
            const hasVat = item.hasVat !== undefined ? item.hasVat : (bill.vatRate === 7);
            const whtRate = item.whtRate !== undefined ? item.whtRate : (bill.whtRate > 0 ? `${bill.whtRate}` : 'none');
            addBillItemRow(item.description, item.quantity, item.unitPrice, hasVat, whtRate);
        });"""
new_item_load = """        bill.items.forEach(item => {
            const hasVat = item.hasVat !== undefined ? item.hasVat : (bill.vatRate === 7);
            const whtRate = item.whtRate !== undefined ? item.whtRate : (bill.whtRate > 0 ? `${bill.whtRate}` : 'none');
            addBillItemRow(item.expenseCode || '', item.description || '', item.quantity, item.unitPrice, hasVat, whtRate);
        });"""
content = content.replace(old_item_load, new_item_load)

# 10. Update line 9710
content = content.replace(
    "addBillItemRow(templates[0].name, 1, templates[0].amount || 0, hasVat, 'none');",
    "addBillItemRow(templates[0].code, templates[0].name, 1, templates[0].amount || 0, hasVat, 'none');"
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched temp_app.js successfully!")
