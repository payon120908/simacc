import re

with open('server.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the .get() calls on sqlite3.Row
content = content.replace("locked_until = user.get('locked_until') or 0", "locked_until = dict(user).get('locked_until') or 0")
content = content.replace("failed_attempts = (user.get('failed_attempts') or 0) + 1", "failed_attempts = (dict(user).get('failed_attempts') or 0) + 1")

with open('server.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed .get() bug on sqlite3.Row in server.py")
