import re

with open('js/app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Replace RD Suggest patch
js = re.sub(
    r"document\.getElementById\('contact-form-type'\)\.value = type;\s*document\.getElementById\('contact-form-type'\)\.dispatchEvent\(new Event\('change'\)\);",
    "document.getElementById('contact-form-is-customer').checked = (type === 'customer');\n                document.getElementById('contact-form-is-supplier').checked = (type === 'supplier');\n                const bankGroup = document.getElementById('contact-bank-group');\n                if (bankGroup) bankGroup.style.display = (type === 'supplier') ? 'block' : 'none';",
    js
)

# 2. Replace Edit Contact patch
js = re.sub(
    r"const storeName = type === 'customer' \? 'customers' : 'suppliers';\s*const contact = await db\.getByKey\(storeName, id\);\s*if \(contact\) \{\s*document\.getElementById\('contact-form-id'\)\.value = contact\.id;\s*document\.getElementById\('contact-form-type'\)\.value = type;",
    "const contact = await db.getByKey('contacts', id);\n                        if (contact) {\n                            document.getElementById('contact-form-id').value = contact.id;\n                            document.getElementById('contact-form-is-customer').checked = !!contact.isCustomer;\n                            document.getElementById('contact-form-is-supplier').checked = !!contact.isSupplier;\n                            const bankGroup = document.getElementById('contact-bank-group');\n                            if (bankGroup) bankGroup.style.display = contact.isSupplier ? 'block' : 'none';",
    js
)

with open('js/app.js', 'w', encoding='utf-8') as f:
    f.write(js)

print('Done.')
