import re

with open('server.py', 'r', encoding='utf-8') as f:
    content = f.read()

users_api = """
            # User Management
            if len(path_parts) >= 2 and path_parts[0] == 'api' and path_parts[1] == 'users':
                if method == 'GET':
                    conn = get_db()
                    rows = conn.execute("SELECT id, username, role, company_code, created_at FROM users").fetchall()
                    send_json([dict(r) for r in rows])
                    return True
                elif method == 'POST':
                    data = json.loads(body_data)
                    username = data.get('username')
                    password = data.get('password')
                    role = data.get('role', 'accountant')
                    company_code = data.get('company_code', '')
                    
                    if not username or not password:
                        send_json({"error": True, "message": "Username and Password are required"}, 400)
                        return True
                        
                    import hashlib
                    password_hash = hashlib.sha256(password.encode('utf-8')).hexdigest()
                    
                    conn = get_db()
                    try:
                        conn.execute("INSERT INTO users (username, password_hash, role, company_code) VALUES (?, ?, ?, ?)", (username, password_hash, role, company_code))
                        conn.commit()
                        send_json({"success": True})
                    except sqlite3.IntegrityError:
                        send_json({"error": True, "message": "Username already exists"}, 400)
                    return True
                elif method == 'PUT' and len(path_parts) == 3:
                    user_id = path_parts[2]
                    data = json.loads(body_data)
                    username = data.get('username')
                    role = data.get('role')
                    company_code = data.get('company_code', '')
                    password = data.get('password')
                    
                    conn = get_db()
                    if password:
                        import hashlib
                        password_hash = hashlib.sha256(password.encode('utf-8')).hexdigest()
                        conn.execute("UPDATE users SET username=?, role=?, company_code=?, password_hash=? WHERE id=?", (username, role, company_code, password_hash, user_id))
                    else:
                        conn.execute("UPDATE users SET username=?, role=?, company_code=? WHERE id=?", (username, role, company_code, user_id))
                    conn.commit()
                    send_json({"success": True})
                    return True
                elif method == 'DELETE' and len(path_parts) == 3:
                    user_id = path_parts[2]
                    conn = get_db()
                    conn.execute("DELETE FROM users WHERE id=?", (user_id,))
                    conn.commit()
                    send_json({"success": True})
                    return True
"""

# Insert before Security Settings block, or VAT lookup
content = re.sub(
    r'(# Security Settings)',
    users_api + r'\n            \1',
    content
)

with open('server.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched server.py with /api/users endpoints!")
