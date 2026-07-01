import sqlite3
import os
import hashlib

DB_PATH = os.path.join(os.path.dirname(__file__), 'database', 'accounting.db')

def hash_password(password):
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def connect_db():
    if not os.path.exists(DB_PATH):
        print("ไม่พบไฟล์ฐานข้อมูล! กรุณารันระบบ 1 ครั้งก่อนเพื่อสร้างฐานข้อมูล")
        exit(1)
    return sqlite3.connect(DB_PATH)

def list_users():
    conn = connect_db()
    users = conn.execute("SELECT id, username, role, company_code FROM users").fetchall()
    print("\n--- รายชื่อผู้ใช้งานทั้งหมด ---")
    print(f"{'ID':<5} | {'Username':<15} | {'Role':<15} | {'Company Code'}")
    print("-" * 55)
    for u in users:
        print(f"{u[0]:<5} | {u[1]:<15} | {u[2]:<15} | {u[3] or 'ทั้งหมด (*)'}")
    print("-" * 55)

def list_companies():
    conn = connect_db()
    companies = conn.execute("SELECT code, name FROM companies").fetchall()
    print("\n--- รายชื่อบริษัท/กิจการทั้งหมด ---")
    for c in companies:
        print(f"รหัส: {c[0]} | ชื่อ: {c[1]}")
    print("---------------------------------")

def add_user():
    username = input("\nระบุ Username ใหม่: ").strip()
    if not username: return
    
    password = input("ระบุรหัสผ่าน (Password): ").strip()
    if not password: return
    
    print("\nเลือกระดับสิทธิ์ (Role):")
    print("1 = ผู้ดูแลระบบ (Admin) - เข้าถึงได้ทุกบริษัท แก้ไขการตั้งค่าได้")
    print("2 = พนักงานบัญชี (Accountant) - เข้าถึงได้เฉพาะบริษัทที่กำหนด")
    role_choice = input("เลือกสิทธิ์ (1 หรือ 2): ").strip()
    
    if role_choice == '1':
        role = 'admin'
        company_code = '*'
    else:
        role = 'accountant'
        list_companies()
        company_code = input("\nระบุ รหัสบริษัท ที่ต้องการให้บัญชีนี้เข้าถึง (เช่น DATA1): ").strip()
        if not company_code:
            print("ต้องระบุรหัสบริษัทสำหรับพนักงานบัญชี!")
            return

    conn = connect_db()
    try:
        conn.execute("INSERT INTO users (username, password_hash, role, company_code) VALUES (?, ?, ?, ?)",
                     (username, hash_password(password), role, company_code))
        conn.commit()
        print(f"\n[สำเร็จ] เพิ่มผู้ใช้งาน '{username}' เรียบร้อยแล้ว!")
    except sqlite3.IntegrityError:
        print(f"\n[ผิดพลาด] ชื่อผู้ใช้งาน '{username}' มีอยู่แล้วในระบบ!")

def main():
    while True:
        print("\n=== ระบบจัดการผู้ใช้งาน SimAcc ===")
        print("1. ดูรายชื่อผู้ใช้งานทั้งหมด")
        print("2. เพิ่มผู้ใช้งานใหม่")
        print("3. ดูรายชื่อบริษัททั้งหมด (รหัสอ้างอิง)")
        print("0. ออกจากโปรแกรม")
        
        choice = input("เลือกเมนู: ").strip()
        if choice == '1':
            list_users()
        elif choice == '2':
            add_user()
        elif choice == '3':
            list_companies()
        elif choice == '0':
            break
        else:
            print("เลือกเมนูไม่ถูกต้อง!")

if __name__ == '__main__':
    main()
