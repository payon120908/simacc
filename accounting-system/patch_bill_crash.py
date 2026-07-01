import re

with open('js/app.js', 'r', encoding='utf-8') as f:
    js = f.read()

old_code = '''const paymentDate = paymentDateEl && paymentDateEl.value ? paymentDateEl.value : date;
    const templateCode = document.getElementById('bill-expense-account').value;
    const templates = await db.getAll('expenseCatalog');'''

new_code = '''const paymentDate = paymentDateEl && paymentDateEl.value ? paymentDateEl.value : date;
    const templateCodeEl = document.getElementById('bill-expense-account');
    const templateCode = templateCodeEl ? templateCodeEl.value : (document.querySelector('.bill-item-code')?.value || '');
    const templates = await db.getAll('expenseCatalog');'''

js = js.replace(old_code, new_code)

with open('js/app.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Patch applied successfully")
