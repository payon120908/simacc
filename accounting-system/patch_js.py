import re
import os

app_path = r'c:\Users\payon\OneDrive\Documents\Anti\accounting-system\js\app.js'
store_path = r'c:\Users\payon\OneDrive\Documents\Anti\accounting-system\js\store.js'
db_path = r'c:\Users\payon\OneDrive\Documents\Anti\accounting-system\js\db.js'

with open(db_path, 'r', encoding='utf-8') as f: db_js = f.read()
with open(store_path, 'r', encoding='utf-8') as f: store_js = f.read()
with open(app_path, 'r', encoding='utf-8') as f: app_js = f.read()

# Patch db.js
db_js = re.sub(r"case 'customers': return 'customers';\s*case 'suppliers': return 'suppliers';", "case 'contacts': return 'contacts';", db_js)

# Patch store.js
store_replace = """
        let contactId = parseInt(String(dp.contactCode).replace(/^[CS]-/, ''));
        let contact = await db.getByKey('contacts', contactId);
"""
store_js = re.sub(r"const prefix = dp\.contactCode\.substring\(0, 2\);\s*const id = dp\.contactCode\.substring\(2\);\s*let contact = null;\s*if \(prefix === 'C-'\) \{\s*contact = await db\.getByKey\('customers', parseInt\(id\)\);\s*\} else if \(prefix === 'S-'\) \{\s*contact = await db\.getByKey\('suppliers', parseInt\(id\)\);\s*\}", store_replace.strip(), store_js)

# Patch app.js dropdowns
dropdown_patch = """
async function loadContactsDropdowns() {
    const contacts = await db.getAll('contacts');
    const customers = contacts.filter(c => c.isCustomer);
    const suppliers = contacts.filter(c => c.isSupplier);
"""
app_js = re.sub(r"async function loadContactsDropdowns\(\) \{\s*const customers = await db\.getAll\('customers'\);\s*const suppliers = await db\.getAll\('suppliers'\);", dropdown_patch.strip(), app_js)

app_js = re.sub(r"opt\.value = `C-\$\{c\.id\}`;", "opt.value = c.id;", app_js)
app_js = re.sub(r"opt\.value = `S-\$\{s\.id\}`;", "opt.value = s.id;", app_js)

# Patch app.js renderContactsView
render_patch = """
    let contacts = await db.getAll('contacts');
    let displayList = [];
    if (currentContactTab === 'customer') {
        displayList = contacts.filter(c => c.isCustomer);
    } else {
        displayList = contacts.filter(c => c.isSupplier);
    }
"""
app_js = re.sub(r"let customers = await db\.getAll\('customers'\);\s*let suppliers = await db\.getAll\('suppliers'\);\s*let displayList = currentContactTab === 'customer' \? customers : suppliers;", render_patch.strip(), app_js)

with open(db_path, 'w', encoding='utf-8') as f: f.write(db_js)
with open(store_path, 'w', encoding='utf-8') as f: f.write(store_js)
with open(app_path, 'w', encoding='utf-8') as f: f.write(app_js)
print('Patched successfully.')
