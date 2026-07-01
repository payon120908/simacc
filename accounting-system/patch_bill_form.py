import re

# 1. Patch index.html table widths
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Original header for bill-items-table
# <th style="width: 25%;">รหัสค่าใช้จ่าย</th>
# <th style="width: 10%; text-align: right;">จำนวน</th>
# <th style="width: 12%; text-align: right;">ราคาต่อหน่วย</th>
# <th style="width: 10%; text-align: center;">VAT 7%</th>
# <th style="width: 13%;">หัก ณ ที่จ่าย</th>
# <th style="width: 13%; text-align: right;">จำนวนเงิน</th>
# <th style="width: 13%; text-align: right;">ยอดจ่าย</th>
# <th style="width: 4%;"></th>

new_header = '''<th style="width: 22%;">รหัสค่าใช้จ่าย</th>
                                        <th style="width: 13%; text-align: right;">จำนวน</th>
                                        <th style="width: 15%; text-align: right;">ราคาต่อหน่วย</th>
                                        <th style="width: 6%; text-align: center;">VAT</th>
                                        <th style="width: 12%;">หัก ณ ที่จ่าย</th>
                                        <th style="width: 14%; text-align: right;">จำนวนเงิน</th>
                                        <th style="width: 14%; text-align: right;">ยอดจ่าย</th>
                                        <th style="width: 4%;"></th>'''

html = re.sub(
    r'<th style="width: 25%;">รหัสค่าใช้จ่าย</th>\s*<th style="width: 10%; text-align: right;">จำนวน</th>\s*<th style="width: 12%; text-align: right;">ราคาต่อหน่วย</th>\s*<th style="width: 10%; text-align: center;">VAT 7%</th>\s*<th style="width: 13%;">หัก ณ ที่จ่าย</th>\s*<th style="width: 13%; text-align: right;">จำนวนเงิน</th>\s*<th style="width: 13%; text-align: right;">ยอดจ่าย</th>\s*<th style="width: 4%;"></th>',
    new_header,
    html
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)


# 2. Patch app.js to add alert
with open('js/app.js', 'r', encoding='utf-8') as f:
    js = f.read()

js = js.replace(
    "showToast(`บันทึกบิลค่าใช้จ่าย ${billId} ลงบัญชีเรียบร้อย`);",
    "alert(`บันทึกบิลค่าใช้จ่าย ${billId} ลงบัญชีเรียบร้อยแล้ว`);\n            showToast(`บันทึกบิลค่าใช้จ่าย ${billId} ลงบัญชีเรียบร้อย`);"
)

with open('js/app.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Patch applied successfully")
