import sqlite3
c=sqlite3.connect('database/accounting.db')
print(c.execute("SELECT * FROM accounts WHERE code LIKE '%5102%'").fetchall())
