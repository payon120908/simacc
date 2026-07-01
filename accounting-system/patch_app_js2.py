import re

with open('js/app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update applySession to show/hide nav-security-settings
apply_session_original = """    // Company Access Control
    const boundCompanyCode = sessionStorage.getItem('ledger_company_code');"""

apply_session_patch = """    // Security Settings Menu Access Control
    const navSecurity = document.getElementById('nav-security-settings');
    if (navSecurity) {
        if (role === 'admin') {
            navSecurity.style.display = 'block';
        } else {
            navSecurity.style.display = 'none';
        }
    }

    // Company Access Control
    const boundCompanyCode = sessionStorage.getItem('ledger_company_code');"""

content = content.replace(apply_session_original, apply_session_patch)

# 2. Add Security Settings module at the end
security_js = """
// ==========================================
// SECURITY SETTINGS MODULE
// ==========================================
let sessionTimeoutTimer = null;
let sessionIdleMinutes = 30; // Default

async function loadSecuritySettings() {
    try {
        const response = await fetch('/api/system/security');
        if (response.ok) {
            const data = await response.json();
            if (data.session_timeout_minutes) {
                document.getElementById('sec-session-timeout').value = data.session_timeout_minutes;
                sessionIdleMinutes = parseInt(data.session_timeout_minutes, 10);
            }
            if (data.max_login_attempts) {
                document.getElementById('sec-max-attempts').value = data.max_login_attempts;
            }
            if (data.lockout_duration_minutes) {
                document.getElementById('sec-lockout-duration').value = data.lockout_duration_minutes;
            }
            resetIdleTimer();
        }
    } catch (e) {
        console.error("Error loading security settings", e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const secForm = document.getElementById('form-security-settings');
    if (secForm) {
        secForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                session_timeout_minutes: document.getElementById('sec-session-timeout').value,
                max_login_attempts: document.getElementById('sec-max-attempts').value,
                lockout_duration_minutes: document.getElementById('sec-lockout-duration').value
            };
            try {
                const response = await fetch('/api/system/security', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (response.ok) {
                    showToast('บันทึกการตั้งค่าความปลอดภัยเรียบร้อยแล้ว', 'success');
                    sessionIdleMinutes = parseInt(data.session_timeout_minutes, 10);
                    resetIdleTimer();
                } else {
                    showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
                }
            } catch (err) {
                showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
            }
        });
    }
    
    // Idle Timer Logic
    function resetIdleTimer() {
        if (sessionTimeoutTimer) clearTimeout(sessionTimeoutTimer);
        if (sessionStorage.getItem('ledger_logged_in') === 'true' && sessionIdleMinutes > 0) {
            sessionTimeoutTimer = setTimeout(() => {
                showToast('หมดเวลาเชื่อมต่อ กรุณาเข้าสู่ระบบใหม่', 'error');
                const logoutBtn = document.getElementById('btn-logout');
                if (logoutBtn) logoutBtn.click();
            }, sessionIdleMinutes * 60 * 1000);
        }
    }
    
    ['mousemove', 'keydown', 'scroll', 'click'].forEach(evt => {
        document.addEventListener(evt, resetIdleTimer);
    });
});
"""

if "SECURITY SETTINGS MODULE" not in content:
    content += "\n" + security_js

with open('js/app.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched app.js successfully!")
