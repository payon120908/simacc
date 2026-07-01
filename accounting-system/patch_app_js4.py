import re

with open('js/app.js', 'r', encoding='utf-8') as f:
    content = f.read()

exports_js = """
// Expose to global scope for HTML onclick handlers
window.openUserModal = openUserModal;
window.editUser = editUser;
window.closeUserModal = closeUserModal;
window.deleteUser = deleteUser;
"""

if "window.openUserModal" not in content:
    content = content.replace("function openUserModal()", exports_js + "\nfunction openUserModal()")

with open('js/app.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Exposed user modal functions to window!")
