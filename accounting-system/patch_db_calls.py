import re

files = [
    r'c:\Users\payon\OneDrive\Documents\Anti\accounting-system\js\app.js',
    r'c:\Users\payon\OneDrive\Documents\Anti\accounting-system\js\store.js'
]

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace getByKey
    content = re.sub(r"db\.getByKey\('customers'", "db.getByKey('contacts'", content)
    content = re.sub(r"db\.getByKey\('suppliers'", "db.getByKey('contacts'", content)
    
    # Replace getAll
    content = re.sub(r"db\.getAll\('customers'\)", "db.getAll('contacts').then(c => c.filter(x => x.isCustomer))", content)
    content = re.sub(r"db\.getAll\('suppliers'\)", "db.getAll('contacts').then(c => c.filter(x => x.isSupplier))", content)
    
    # Replace putItem
    content = re.sub(r"db\.putItem\('customers'", "db.putItem('contacts'", content)
    content = re.sub(r"db\.putItem\('suppliers'", "db.putItem('contacts'", content)
    
    # Replace deleteItem
    content = re.sub(r"db\.deleteItem\('customers'", "db.deleteItem('contacts'", content)
    content = re.sub(r"db\.deleteItem\('suppliers'", "db.deleteItem('contacts'", content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Patch applied to all DB calls.")
