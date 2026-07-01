import re

with open('js/app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Patch the click event listener on headerCompanyBtn
orig_click = """headerCompanyBtn.addEventListener('click', async () => {
            selectedCompanyCodeInSwitcher = db.getActiveCompanyCode();
            openModal('modal-switch-company');"""

patched_click = """headerCompanyBtn.addEventListener('click', async () => {
            if (sessionStorage.getItem('ledger_company_code')) {
                showToast('สิทธิ์ของคุณถูกจำกัดให้เข้าถึงเฉพาะบริษัทนี้เท่านั้น', 'error');
                return;
            }
            selectedCompanyCodeInSwitcher = db.getActiveCompanyCode();
            openModal('modal-switch-company');"""

content = content.replace(orig_click, patched_click)

# 2. Patch the updateHeaderCompany to remove the swap icon if bound
orig_header = """    if (companyProfile) {
        const activeCode = db.getActiveCompanyCode();
        document.getElementById('header-company-name').innerHTML = `<i class="fa-solid fa-building"></i> <span>[${activeCode}] ${companyProfile.name}</span> <i class="fa-solid fa-right-left" style="margin-left: 8px; font-size: 10px; opacity: 0.7;"></i>`;
    }"""

patched_header = """    if (companyProfile) {
        const activeCode = db.getActiveCompanyCode();
        const isBound = !!sessionStorage.getItem('ledger_company_code');
        const swapIcon = isBound ? '' : `<i class="fa-solid fa-right-left" style="margin-left: 8px; font-size: 10px; opacity: 0.7;"></i>`;
        document.getElementById('header-company-name').innerHTML = `<i class="fa-solid fa-building"></i> <span>[${activeCode}] ${companyProfile.name}</span> ${swapIcon}`;
        document.getElementById('header-company-name').style.cursor = isBound ? 'default' : 'pointer';
    }"""

content = content.replace(orig_header, patched_header)

with open('js/app.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched company switcher logic!")
