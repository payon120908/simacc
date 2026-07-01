import urllib.request, json

req = urllib.request.urlopen('http://localhost:8085/api/accounts/DATA2')
data = json.loads(req.read())
print('Total accounts:', len(data))

# Show first few accounts structure
print('\nFirst 3 accounts (all fields):')
for a in data[:3]:
    print(' ', a)

# Show all unique types/categories
types = set((a.get('type',''), a.get('category','')) for a in data)
print('\nAll type/category combos:')
for t in sorted(types):
    print(' ', t)

# Asset-like accounts
print('\nAccounts with 1xxx codes (assets):')
for a in data:
    if str(a.get('code','')).startswith('1'):
        print(f"  {a.get('code')} | type={a.get('type')} | category={a.get('category')} | name={a.get('name','')[:40]}")
