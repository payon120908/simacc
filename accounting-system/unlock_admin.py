import sqlite3

conn = sqlite3.connect('database/accounting.db')
conn.execute("UPDATE users SET failed_attempts=0, locked_until=0 WHERE username='admin'")
conn.commit()
print('Unlocked admin')
