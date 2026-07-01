import re

with open('js/app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Replace the specific line using regex to ignore exact whitespace
js = re.sub(
    r"const templateCode = document\.getElementById\('bill-expense-account'\)\.value;",
    r"const templateCodeEl = document.getElementById('bill-expense-account');\n    const templateCode = templateCodeEl ? templateCodeEl.value : (document.querySelector('.bill-item-code')?.value || '');",
    js
)

with open('js/app.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Crash patch applied via regex")
