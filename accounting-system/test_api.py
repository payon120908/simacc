import urllib.request, json

try:
    req = urllib.request.urlopen('http://localhost:8085/api/bills/DATA2')
    data = json.loads(req.read())
    print('Bills API OK, count:', len(data))
    for b in data:
        bid = b.get('id')
        vendor = b.get('vendorName')
        total = b.get('totalAmount')
        taxid = b.get('taxId')
        addr = b.get('address')
        print(f'  {bid} | vendor={vendor} | total={total} | taxId={taxid} | addr={addr}')
    req2 = urllib.request.urlopen('http://localhost:8085/api/accounts/DATA2')
    accs = json.loads(req2.read())
    posting_asset = [a for a in accs if a.get('type')=='posting' and a.get('category')=='asset']
    print(f'Accounts API OK - posting+asset: {len(posting_asset)} accounts')
    if posting_asset:
        print('  First 3:', [(a.get('code'), a.get('name','')[:20]) for a in posting_asset[:3]])
except Exception as e:
    print('Error:', e)
    import traceback; traceback.print_exc()
