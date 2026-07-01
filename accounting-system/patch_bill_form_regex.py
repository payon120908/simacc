import re

with open('js/app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Using regex to find the showToast line flexibly
js = re.sub(
    r'(showToast\(`บันทึกบิลค่าใช้จ่าย \$\{billId\} ลงบัญชีเรียบร้อย`\);)',
    r'alert(`บันทึกบิลค่าใช้จ่าย ${billId} สำเร็จเรียบร้อยแล้ว`);\n            \1',
    js
)

with open('js/app.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("JS patched with regex")
