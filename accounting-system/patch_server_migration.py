import re

with open('server.py', 'r', encoding='utf-8') as f:
    server_py = f.read()

# Replace bills migration using regex to handle whitespace
bills_pattern = re.compile(r'(\("payments", "TEXT"\),\s*)\]:')
server_py = bills_pattern.sub(r'\1    ("journal_id", "TEXT"),\n]:', server_py)

with open('server.py', 'w', encoding='utf-8') as f:
    f.write(server_py)

print("Migration patch applied successfully.")
