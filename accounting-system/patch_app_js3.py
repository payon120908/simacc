import re

with open('js/app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update applySession to show/hide nav-users
apply_session_original = """    // Security Settings Menu Access Control
    const navSecurity = document.getElementById('nav-security-settings');
    if (navSecurity) {
        if (role === 'admin') {
            navSecurity.style.display = 'block';
        } else {
            navSecurity.style.display = 'none';
        }
    }"""

apply_session_patch = """    // Admin Menus Access Control
    const navSecurity = document.getElementById('nav-security-settings');
    const navUsers = document.getElementById('nav-users');
    if (role === 'admin') {
        if (navSecurity) navSecurity.style.display = 'block';
        if (navUsers) navUsers.style.display = 'block';
    } else {
        if (navSecurity) navSecurity.style.display = 'none';
        if (navUsers) navUsers.style.display = 'none';
    }"""

content = content.replace(apply_session_original, apply_session_patch)

# 2. Add Users Management module at the end
users_js = """
// ==========================================
// USER MANAGEMENT MODULE
// ==========================================

async function loadUsers() {
    try {
        const response = await fetch('/api/users');
        if (response.ok) {
            const users = await response.json();
            const tbody = document.querySelector('#table-users tbody');
            if (!tbody) return;
            
            tbody.innerHTML = '';
            users.forEach(user => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${user.id}</td>
                    <td>${user.username}</td>
                    <td><span class="badge ${user.role === 'admin' ? 'bg-primary' : 'bg-secondary'}">${user.role}</span></td>
                    <td>${user.company_code || 'ทั้งหมด (*)'}</td>
                    <td>
                        <button class="btn btn-sm btn-outline" onclick="editUser(${user.id}, '${user.username}', '${user.role}', '${user.company_code || ''}')"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id})"><i class="fa-solid fa-trash"></i></button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (e) {
        console.error("Error loading users", e);
    }
}

function openUserModal() {
    document.getElementById('modal-user-title').innerText = 'เพิ่มผู้ใช้งาน';
    document.getElementById('user-id').value = '';
    document.getElementById('user-username').value = '';
    document.getElementById('user-password').value = '';
    document.getElementById('user-password').required = true;
    document.getElementById('user-role').value = 'accountant';
    document.getElementById('user-company').value = '';
    document.getElementById('modal-user').style.display = 'flex';
}

function editUser(id, username, role, companyCode) {
    document.getElementById('modal-user-title').innerText = 'แก้ไขผู้ใช้งาน';
    document.getElementById('user-id').value = id;
    document.getElementById('user-username').value = username;
    document.getElementById('user-password').value = '';
    document.getElementById('user-password').required = false;
    document.getElementById('user-role').value = role;
    document.getElementById('user-company').value = companyCode;
    document.getElementById('modal-user').style.display = 'flex';
}

function closeUserModal() {
    document.getElementById('modal-user').style.display = 'none';
}

async function deleteUser(id) {
    if (confirm('คุณต้องการลบผู้ใช้งานนี้ใช่หรือไม่?')) {
        try {
            const response = await fetch('/api/users/' + id, { method: 'DELETE' });
            if (response.ok) {
                showToast('ลบผู้ใช้งานสำเร็จ', 'success');
                loadUsers();
            } else {
                showToast('ไม่สามารถลบได้', 'error');
            }
        } catch (e) {
            showToast('เกิดข้อผิดพลาด: ' + e.message, 'error');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const userForm = document.getElementById('form-user');
    if (userForm) {
        userForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('user-id').value;
            const data = {
                username: document.getElementById('user-username').value,
                password: document.getElementById('user-password').value,
                role: document.getElementById('user-role').value,
                company_code: document.getElementById('user-company').value
            };
            
            const method = id ? 'PUT' : 'POST';
            const url = id ? '/api/users/' + id : '/api/users';
            
            try {
                const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                const resData = await response.json();
                if (response.ok) {
                    showToast('บันทึกข้อมูลผู้ใช้งานสำเร็จ', 'success');
                    closeUserModal();
                    loadUsers();
                } else {
                    showToast(resData.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
                }
            } catch (err) {
                showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
            }
        });
    }
    
    // Add loadUsers to sidebar click handler for the new view
    const navUsersBtn = document.getElementById('nav-users');
    if (navUsersBtn) {
        navUsersBtn.addEventListener('click', () => {
            loadUsers();
        });
    }
});
"""

if "USER MANAGEMENT MODULE" not in content:
    content += "\n" + users_js
    
# also inject loadUsers() into applySession if role == admin, to preload
content = content.replace("if (typeof loadSecuritySettings === 'function') loadSecuritySettings();", "if (typeof loadSecuritySettings === 'function') loadSecuritySettings();\n        if (role === 'admin' && typeof loadUsers === 'function') loadUsers();")

with open('js/app.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched app.js with user management successfully!")
