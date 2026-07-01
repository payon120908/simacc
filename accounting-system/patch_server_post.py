import re

with open('server.py', 'r', encoding='utf-8') as f:
    code = f.read()

patch = '''elif table_name == 'contacts':
            if 'taxId' in data: data['tax_id'] = data.pop('taxId')
            if 'creditTerm' in data: data['credit_term'] = data.pop('creditTerm')
            if 'contactPerson' in data: data['contact_person'] = data.pop('contactPerson')
            if 'bankAccount' in data: data['bank_account'] = data.pop('bankAccount')
            if 'isCustomer' in data: data['is_customer'] = data.pop('isCustomer')
            if 'isSupplier' in data: data['is_supplier'] = data.pop('isSupplier')'''

code = re.sub(
    r"elif table_name == 'contacts':\s*if 'taxId' in data: data\['tax_id'\] = data\.pop\('taxId'\)\s*if 'creditTerm' in data: data\['credit_term'\] = data\.pop\('creditTerm'\)\s*if 'contactPerson' in data: data\['contact_person'\] = data\.pop\('contactPerson'\)\s*if 'bankAccount' in data: data\['bank_account'\] = data\.pop\('bankAccount'\)",
    patch,
    code
)

with open('server.py', 'w', encoding='utf-8') as f:
    f.write(code)
print('Server patched successfully')
