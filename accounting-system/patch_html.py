import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Add Menu
menu_item = """                <li data-view="security-settings" id="nav-security-settings" style="display: none;">
                    <a href="#security-settings"><i class="fa-solid fa-shield-halved"></i><span>ตั้งค่าความปลอดภัย</span></a>
                </li>
"""
content = re.sub(
    r'(<li data-view="settings">[\s\S]*?</li>)',
    r'\1\n' + menu_item,
    content
)

# Add Section
section = """                <!-- SECURITY SETTINGS VIEW -->
                <section id="view-security-settings" class="view-section">
                    <div class="settings-card" style="max-width: 600px; margin: 0 auto; background: var(--bg-surface); padding: 24px; border-radius: 12px; border: 1px solid var(--border-color);">
                        <h3 style="margin-bottom: 16px;"><i class="fa-solid fa-shield-halved" style="color: var(--accent-blue); margin-right: 8px;"></i> นโยบายความปลอดภัย (Global Security Policy)</h3>
                        <form id="form-security-settings">
                            <div class="form-group">
                                <label for="sec-session-timeout">เวลาหมดอายุ Session (นาที)</label>
                                <input type="number" id="sec-session-timeout" class="form-control" min="1" value="30">
                                <small style="color: var(--text-secondary);">ระยะเวลาที่ไม่มีการใช้งานก่อนถูกบังคับออกจากระบบ</small>
                            </div>
                            <div class="form-group">
                                <label for="sec-max-attempts">จำนวนครั้งที่ล็อกอินผิดได้สูงสุด</label>
                                <input type="number" id="sec-max-attempts" class="form-control" min="1" value="5">
                            </div>
                            <div class="form-group">
                                <label for="sec-lockout-duration">ระยะเวลาล็อคบัญชี (นาที)</label>
                                <input type="number" id="sec-lockout-duration" class="form-control" min="1" value="15">
                            </div>
                            <button type="submit" class="btn btn-primary" style="width: 100%;"><i class="fa-solid fa-save"></i> บันทึกการตั้งค่า</button>
                        </form>
                    </div>
                </section>

"""
content = re.sub(
    r'(<!-- 10\. SETTINGS & SIMULATION TOOLS VIEW -->)',
    section + r'\1',
    content
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched index.html successfully!")
