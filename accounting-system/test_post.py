import urllib.request, json
req = urllib.request.Request(
    'http://localhost:8085/api/bills/test',
    data=json.dumps({
        'id': '260622-01',
        'date': '2026-06-22',
        'vendorName': 'test',
        'items': [{'quantity': 1, 'unitPrice': 100, 'amount': 100, 'description': ''}],
        'subtotal': 100,
        'totalAmount': 100
    }).encode(),
    headers={'Content-Type': 'application/json'},
    method='POST'
)
try:
    res = urllib.request.urlopen(req)
    print(res.read().decode())
except urllib.error.HTTPError as e:
    print(e.read().decode())
