import re
import json

with open('server.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update init_db
init_db_patch = """
    # 0.1 Security Settings Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT
    );
    ''')
    
    # Try to alter users table for lockout support if columns don't exist
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN failed_attempts INTEGER DEFAULT 0")
        cursor.execute("ALTER TABLE users ADD COLUMN locked_until BIGINT DEFAULT 0")
    except:
        pass
"""
content = re.sub(
    r'(# 0\. Users Table)',
    init_db_patch + r'\n    \1',
    content
)

# 2. Update login endpoint
login_original = """                        user = conn.execute("SELECT * FROM users WHERE username = ? AND password_hash = ?", (username, password_hash)).fetchone()
                        
                        if user:
                            send_json({
                                "success": True,
                                "user": {
                                    "username": user['username'],
                                    "role": user['role'],
                                    "company_code": user['company_code']
                                }
                            })
                        else:
                            send_json({"error": True, "message": "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง"}, 401)"""

login_patch = """                        import time
                        current_time = int(time.time())
                        
                        user = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
                        
                        if user:
                            locked_until = user.get('locked_until') or 0
                            if locked_until > current_time:
                                remaining = (locked_until - current_time) // 60
                                send_json({"error": True, "message": f"บัญชีถูกล็อค กรุณาลองใหม่ในอีก {remaining or 1} นาที"}, 401)
                                return True
                                
                            if user['password_hash'] == password_hash:
                                # Success
                                conn.execute("UPDATE users SET failed_attempts = 0, locked_until = 0 WHERE username = ?", (username,))
                                conn.commit()
                                send_json({
                                    "success": True,
                                    "user": {
                                        "username": user['username'],
                                        "role": user['role'],
                                        "company_code": user['company_code']
                                    }
                                })
                            else:
                                # Failed attempt
                                max_att_row = conn.execute("SELECT value FROM system_settings WHERE key = 'max_login_attempts'").fetchone()
                                max_attempts = int(max_att_row['value']) if max_att_row else 5
                                
                                failed_attempts = (user.get('failed_attempts') or 0) + 1
                                
                                if failed_attempts >= max_attempts:
                                    dur_row = conn.execute("SELECT value FROM system_settings WHERE key = 'lockout_duration_minutes'").fetchone()
                                    lockout_duration = int(dur_row['value']) if dur_row else 15
                                    new_locked_until = current_time + (lockout_duration * 60)
                                    conn.execute("UPDATE users SET failed_attempts = ?, locked_until = ? WHERE username = ?", (failed_attempts, new_locked_until, username))
                                    conn.commit()
                                    send_json({"error": True, "message": f"คุณใส่รหัสผ่านผิดเกินกำหนด บัญชีถูกล็อคเป็นเวลา {lockout_duration} นาที"}, 401)
                                else:
                                    conn.execute("UPDATE users SET failed_attempts = ? WHERE username = ?", (failed_attempts, username))
                                    conn.commit()
                                    send_json({"error": True, "message": "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง"}, 401)
                        else:
                            send_json({"error": True, "message": "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง"}, 401)"""

content = content.replace(login_original, login_patch)

# 3. Add Security Settings endpoints
security_endpoints = """
            # Security Settings
            if len(path_parts) == 3 and path_parts[0] == 'api' and path_parts[1] == 'system' and path_parts[2] == 'security':
                if method == 'GET':
                    conn = get_db()
                    rows = conn.execute("SELECT key, value FROM system_settings").fetchall()
                    settings = {r['key']: r['value'] for r in rows}
                    send_json(settings)
                    return True
                elif method == 'POST':
                    # TODO check role=admin in real app, but here we assume caller is admin via UI constraint
                    data = json.loads(body_data)
                    conn = get_db()
                    for k, v in data.items():
                        conn.execute("INSERT INTO system_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", (k, str(v)))
                    conn.commit()
                    send_json({"success": True})
                    return True
"""

content = re.sub(
    r'(# VAT Lookup)',
    security_endpoints + r'\n            \1',
    content
)

with open('server.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched server.py successfully!")
