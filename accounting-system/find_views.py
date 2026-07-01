import re
with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if 'id=' in line and 'view' in line.lower() and '<div' in line:
        print(f"L{i+1}: {line.strip()}")
