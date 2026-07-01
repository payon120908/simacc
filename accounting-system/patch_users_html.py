import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Add Menu
menu_item = """                <li data-view="users" id="nav-users" style="display: none;">
                    <a href="#users"><i class="fa-solid fa-users"></i><span>จัดการผู้ใช้งาน</span></a>
                </li>
"""
content = re.sub(
    r'(<li data-view="security-settings"[\s\S]*?</li>)',
    r'\1\n' + menu_item,
    content
)

# Add Section
section = """                <!-- USER MANAGEMENT VIEW -->
                <section id="view-users" class="view-section">
                    <div class="settings-card" style="background: var(--bg-surface); padding: 24px; border-radius: 12px; border: 1px solid var(--border-color);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                            <h3><i class="fa-solid fa-users" style="color: var(--accent-blue); margin-right: 8px;"></i> ระบบจัดการผู้ใช้งาน</h3>
                            <button class="btn btn-primary" onclick="openUserModal()"><i class="fa-solid fa-plus"></i> เพิ่มผู้ใช้งาน</button>
                        </div>
                        <div class="table-responsive">
                            <table class="table" id="table-users">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>ชื่อผู้ใช้งาน</th>
                                        <th>สิทธิ์</th>
                                        <th>บริษัทที่ดูแล</th>
                                        <th>จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <!-- User rows will go here -->
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- User Modal -->
                    <div id="modal-user" class="modal">
                        <div class="modal-content" style="max-width: 500px;">
                            <div class="modal-header">
                                <h3 id="modal-user-title">เพิ่มผู้ใช้งาน</h3>
                                <button class="btn-close" onclick="closeUserModal()"><i class="fa-solid fa-xmark"></i></button>
                            </div>
                            <div class="modal-body">
                                <form id="form-user">
                                    <input type="hidden" id="user-id">
                                    <div class="form-group">
                                        <label>Username</label>
                                        <input type="text" id="user-username" class="form-control" required>
                                    </div>
                                    <div class="form-group">
                                        <label>Password</label>
                                        <input type="password" id="user-password" class="form-control" placeholder="ปล่อยว่างไว้หากไม่ต้องการเปลี่ยน (สำหรับการแก้ไข)">
                                    </div>
                                    <div class="form-group">
                                        <label>Role</label>
                                        <select id="user-role" class="form-control">
                                            <option value="admin">Admin (ผู้ดูแลระบบ)</option>
                                            <option value="accountant">Accountant (พนักงานบัญชี)</option>
                                        </select>
                                    </div>
                                    <div class="form-group" id="user-company-group">
                                        <label>Company Code (เว้นว่างหากให้เข้าได้ทุกบริษัท)</label>
                                        <input type="text" id="user-company" class="form-control" placeholder="เช่น DATA1">
                                    </div>
                                    <div style="display: flex; gap: 12px; margin-top: 24px;">
                                        <button type="submit" class="btn btn-primary" style="flex: 1;"><i class="fa-solid fa-save"></i> บันทึก</button>
                                        <button type="button" class="btn btn-secondary" onclick="closeUserModal()" style="flex: 1;">ยกเลิก</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </section>

"""
content = re.sub(
    r'(<!-- SECURITY SETTINGS VIEW -->)',
    section + r'\1',
    content
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched index.html for users successfully!")
