// js/app.js - Main Controller & UI Router

if (window.location.protocol === 'file:') {
    document.addEventListener('DOMContentLoaded', () => {
        const banner = document.createElement('div');
        banner.style.cssText = "background: #ef4444; color: white; padding: 14px 24px; text-align: center; font-weight: 600; font-family: 'Inter', 'Outfit', sans-serif; position: sticky; top: 0; z-index: 99999; border-bottom: 2px solid #b91c1c; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); font-size: 14px; line-height: 1.5;";
        banner.innerHTML = "⚠️ ท่านกำลังเปิดโปรแกรมผ่านไฟล์ HTML โดยตรง (ฐานข้อมูลจะไม่ทำงาน) <br><b>กรุณาปิดหน้าต่างนี้ แล้วดับเบิ้ลคลิกที่ไฟล์ <span style='background: rgba(255,255,255,0.25); padding: 2px 6px; border-radius: 4px;'>start-ledger.bat</span> หรือพิมพ์เข้าใช้งานทางลิงก์: <a href='http://127.0.0.1:8085' style='color: white; text-decoration: underline; font-weight: 700;'>http://127.0.0.1:8085</a> เพื่อเริ่มต้นระบบฐานข้อมูลครับ</b>";
        document.body.prepend(banner);
    });
}


import * as db from './db.js?v=14';
import * as store from './store.js?v=14';

// Global variables for Chart instances
let cashFlowChart = null;
let expensePieChart = null;

// Company settings state
let companyProfile = null;
let globalPeriod = null;
let currentTaxTab = 'sales'; // sales, purchase, wht

// Editing state variables
let editingInvoiceId = null;
let editingBillId = null;
let editingReceiptId = null;
let editingPaymentId = null;
let editingDPId = null;
let editingVRId = null;

const DEFAULT_BS_MAPPING = {
    cashEquivalent: '1110-00',
    temporaryInvestments: '',
    receivables: '1120-00, 1150-00',
    unbilledCompletedWorkCurrent: '',
    shortTermLoans: '1200-00',
    inventory: '1130-00',
    currentIncomeTaxAssets: '',
    currentBiologicalAssets: '',
    otherCurrentAssets: '',
    nonCurrentAssetsHeldForSaleCurrent: '',
    pledgedBankDeposits: '',
    investmentsInSubsidiaries: '',
    investmentsInJointVentures: '',
    investmentsInAssociates: '',
    otherLongTermInvestments: '',
    nonCurrentReceivables: '',
    longTermLoans: '',
    unbilledCompletedWorkNonCurrent: '',
    investmentProperty: '',
    propertyPlantEquipment: '1400-00',
    goodwill: '',
    intangibleAssets: '',
    nonCurrentBiologicalAssets: '',
    deferredTaxAssets: '',
    otherNonCurrentAssets: '',
    nonCurrentAssetsHeldForSaleNonCurrent: '',
    bankOverdraftsShortTermBorrowings: '',
    payables: '2110-00, 2150-00',
    advancedPaymentsFromCustomersCurrent: '',
    currentPortionOfLongTermLiab: '',
    currentPortionOfFinanceLeaseLiab: '',
    shortTermBorrowings: '',
    accruedCorporateTax: '2152-00',
    currentProvisionsForEmployeeBenefits: '',
    otherShortTermProvisions: '',
    otherCurrentLiabilities: '',
    longTermBorrowings: '2200-00',
    financeLeaseLiabilities: '',
    nonCurrentPayables: '',
    advancedPaymentsFromCustomersNonCurrent: '',
    deferredTaxLiabilities: '',
    nonCurrentProvisionsForEmployeeBenefits: '',
    otherLongTermProvisions: '',
    otherNonCurrentLiabilities: '',
    paidUpCapitalAccount: '3110-00',
    retainedEarningsAccount: '3210-00',
    suspenseAccount: '9999-99'
};

const BS_FIELDS = [
    { tab: 'current-assets', key: 'cashEquivalent', labelTh: 'เงินสดและรายการเทียบเท่าเงินสด', labelEn: 'Cash and cash equivalents' },
    { tab: 'current-assets', key: 'temporaryInvestments', labelTh: 'เงินลงทุนชั่วคราว', labelEn: 'Temporary investments' },
    { tab: 'current-assets', key: 'receivables', labelTh: 'ลูกหนี้การค้าและลูกหนี้หมุนเวียนอื่น', labelEn: 'Trade and other current receivables' },
    { tab: 'current-assets', key: 'unbilledCompletedWorkCurrent', labelTh: 'มูลค่าของงานส่วนที่เสร็จแต่ยังไม่ได้กำหนดเรียกชำระเงิน - หมุนเวียน', labelEn: 'Current unbilled completed work' },
    { tab: 'current-assets', key: 'shortTermLoans', labelTh: 'เงินให้กู้ยืมระยะสั้น', labelEn: 'Short-term loans' },
    { tab: 'current-assets', key: 'inventory', labelTh: 'สินค้าคงเหลือ', labelEn: 'Inventories' },
    { tab: 'current-assets', key: 'currentIncomeTaxAssets', labelTh: 'สินทรัพย์ภาษีเงินได้ของงวดปัจจุบัน', labelEn: 'Current income tax assets' },
    { tab: 'current-assets', key: 'currentBiologicalAssets', labelTh: 'สินทรัพย์ชีวภาพหมุนเวียน', labelEn: 'Current biological assets' },
    { tab: 'current-assets', key: 'otherCurrentAssets', labelTh: 'สินทรัพย์หมุนเวียนอื่น', labelEn: 'Other current assets' },
    { tab: 'current-assets', key: 'nonCurrentAssetsHeldForSaleCurrent', labelTh: 'สินทรัพย์ไม่หมุนเวียนที่ถือไว้เพื่อขาย - หมุนเวียน', labelEn: 'Non-current assets held for sale' },
    { tab: 'non-current-assets', key: 'pledgedBankDeposits', labelTh: 'เงินฝากธนาคารที่มีภาระค้ำประกัน', labelEn: 'Pledged bank deposits' },
    { tab: 'non-current-assets', key: 'investmentsInSubsidiaries', labelTh: 'เงินลงทุนในบริษัทย่อย', labelEn: 'Investments in subsidiaries' },
    { tab: 'non-current-assets', key: 'investmentsInJointVentures', labelTh: 'เงินลงทุนในการร่วมค้า', labelEn: 'Investments in joint ventures' },
    { tab: 'non-current-assets', key: 'investmentsInAssociates', labelTh: 'เงินลงทุนในบริษัทร่วม', labelEn: 'Investments in associates' },
    { tab: 'non-current-assets', key: 'otherLongTermInvestments', labelTh: 'เงินลงทุนระยะยาวอื่น', labelEn: 'Other long-term investments' },
    { tab: 'non-current-assets', key: 'nonCurrentReceivables', labelTh: 'ลูกหนี้การค้าและลูกหนี้ไม่หมุนเวียนอื่น', labelEn: 'Trade and other non-current receivables' },
    { tab: 'non-current-assets', key: 'longTermLoans', labelTh: 'เงินให้กู้ยืมระยะยาว', labelEn: 'Long-term loans' },
    { tab: 'non-current-assets', key: 'unbilledCompletedWorkNonCurrent', labelTh: 'มูลค่าของงานส่วนที่เสร็จแต่ยังไม่ได้กำหนดเรียกชำระเงิน - ไม่หมุนเวียน', labelEn: 'Non-current unbilled completed work' },
    { tab: 'non-current-assets', key: 'investmentProperty', labelTh: 'อสังหาริมทรัพย์เพื่อการลงทุน', labelEn: 'Investment property' },
    { tab: 'non-current-assets', key: 'propertyPlantEquipment', labelTh: 'ที่ดิน อาคารและอุปกรณ์', labelEn: 'Property, plant and equipment' },
    { tab: 'non-current-assets', key: 'goodwill', labelTh: 'ค่าความนิยม', labelEn: 'Goodwill' },
    { tab: 'non-current-assets', key: 'intangibleAssets', labelTh: 'สินทรัพย์ไม่มีตัวตน', labelEn: 'Intangible assets' },
    { tab: 'non-current-assets', key: 'nonCurrentBiologicalAssets', labelTh: 'สินทรัพย์ชีวภาพไม่หมุนเวียน', labelEn: 'Non-current biological assets' },
    { tab: 'non-current-assets', key: 'deferredTaxAssets', labelTh: 'สินทรัพย์ภาษีเงินได้รอการตัดบัญชี', labelEn: 'Deferred tax assets' },
    { tab: 'non-current-assets', key: 'otherNonCurrentAssets', labelTh: 'สินทรัพย์ไม่หมุนเวียนอื่น', labelEn: 'Other non-current assets' },
    { tab: 'non-current-assets', key: 'nonCurrentAssetsHeldForSaleNonCurrent', labelTh: 'สินทรัพย์ไม่หมุนเวียนที่ถือไว้เพื่อขาย - ไม่หมุนเวียน', labelEn: 'Non-current assets held for sale' },
    { tab: 'current-liabilities', key: 'bankOverdraftsShortTermBorrowings', labelTh: 'เงินเบิกเกินบัญชีและเงินกู้ยืมระยะสั้นจากสถาบันการเงิน', labelEn: 'Bank overdrafts and short-term borrowing' },
    { tab: 'current-liabilities', key: 'payables', labelTh: 'เจ้าหนี้การค้าและเจ้าหนี้หมุนเวียนอื่น', labelEn: 'Trade and other current payables' },
    { tab: 'current-liabilities', key: 'advancedPaymentsFromCustomersCurrent', labelTh: 'เงินรับล่วงหน้าส่วนที่เกินกว่างานส่วนที่เสร็จ - หมุนเวียน', labelEn: 'Current advanced payments from customers' },
    { tab: 'current-liabilities', key: 'currentPortionOfLongTermLiab', labelTh: 'ส่วนของหนี้สินระยะยาวที่ถึงกำหนดชำระภายในหนึ่งปี', labelEn: 'Current portion of long-term liabilities' },
    { tab: 'current-liabilities', key: 'currentPortionOfFinanceLeaseLiab', labelTh: 'ส่วนของหนี้สินตามสัญญาเช่าการเงินที่ถึงกำหนดชำระภายในหนึ่งปี', labelEn: 'Current portion of finance lease liabilities' },
    { tab: 'current-liabilities', key: 'shortTermBorrowings', labelTh: 'เงินกู้ยืมระยะสั้น', labelEn: 'Short-term borrowings' },
    { tab: 'current-liabilities', key: 'accruedCorporateTax', labelTh: 'ภาษีเงินได้นิติบุคคลค้างจ่าย', labelEn: 'Income tax payable' },
    { tab: 'current-liabilities', key: 'currentProvisionsForEmployeeBenefits', labelTh: 'ประมาณการหนี้สินระยะสั้นสำหรับผลประโยชน์พนักงาน', labelEn: 'Current provisions for employee benefits' },
    { tab: 'current-liabilities', key: 'otherShortTermProvisions', labelTh: 'ประมาณการหนี้สินระยะสั้นอื่น', labelEn: 'Other short-term provisions' },
    { tab: 'current-liabilities', key: 'otherCurrentLiabilities', labelTh: 'หนี้สินหมุนเวียนอื่น', labelEn: 'Other current liabilities' },
    { tab: 'non-current-liabilities', key: 'longTermBorrowings', labelTh: 'เงินกู้ยืมระยะยาว', labelEn: 'Long-term borrowings' },
    { tab: 'non-current-liabilities', key: 'financeLeaseLiabilities', labelTh: 'หนี้สินตามสัญญาเช่าการเงิน', labelEn: 'Finance lease liabilities' },
    { tab: 'non-current-liabilities', key: 'nonCurrentPayables', labelTh: 'เจ้าหนี้การค้าและเจ้าหนี้ไม่หมุนเวียนอื่น', labelEn: 'Trade and other non-current payables' },
    { tab: 'non-current-liabilities', key: 'advancedPaymentsFromCustomersNonCurrent', labelTh: 'เงินรับล่วงหน้าส่วนที่เกินกว่างานส่วนที่เสร็จ - ไม่หมุนเวียน', labelEn: 'Non-current advanced payments from customers' },
    { tab: 'non-current-liabilities', key: 'deferredTaxLiabilities', labelTh: 'หนี้สินภาษีเงินได้รอการตัดบัญชี', labelEn: 'Deferred tax liabilities' },
    { tab: 'non-current-liabilities', key: 'nonCurrentProvisionsForEmployeeBenefits', labelTh: 'ประมาณการหนี้สินไม่หมุนเวียนสำหรับผลประโยชน์พนักงาน', labelEn: 'Non-current provisions for employee benefits' },
    { tab: 'non-current-liabilities', key: 'otherLongTermProvisions', labelTh: 'ประมาณการหนี้สินระยะยาวอื่น', labelEn: 'Other long-term provisions' },
    { tab: 'non-current-liabilities', key: 'otherNonCurrentLiabilities', labelTh: 'หนี้สินไม่หมุนเวียนอื่น', labelEn: 'Other non-current liabilities' },
    { tab: 'equity', key: 'paidUpCapitalAccount', labelTh: 'ทุนที่ออกและชำระแล้ว', labelEn: 'Paid-up share capital' },
    { tab: 'equity', key: 'retainedEarningsAccount', labelTh: 'กำไร(ขาดทุน) สะสม', labelEn: 'Retained earnings (deficits)' },
    { tab: 'equity', key: 'suspenseAccount', labelTh: 'บัญชีพัก (ยังไม่ปรับดุล)', labelEn: 'Suspense account (unbalanced)' }
];

async function getBSMapping() {
    let mapping = await db.getByKey('settings', 'balance_sheet_mapping');
    if (!mapping || typeof mapping !== 'object') {
        mapping = { ...DEFAULT_BS_MAPPING, key: 'balance_sheet_mapping' };
        await db.putItem('settings', mapping);
    }
    return mapping;
}

function switchBSTab(tabId) {
    const tabs = ['current-assets', 'non-current-assets', 'current-liabilities', 'non-current-liabilities', 'equity'];
    tabs.forEach(t => {
        const btn = document.getElementById(`bs-tab-btn-${t}`);
        const content = document.getElementById(`bs-tab-content-${t}`);
        if (t === tabId) {
            if (btn) {
                btn.classList.remove('btn-secondary');
                btn.classList.add('btn-primary');
            }
            if (content) content.style.display = 'block';
        } else {
            if (btn) {
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-secondary');
            }
            if (content) content.style.display = 'none';
        }
    });
}

async function openBSGroupsModal() {
    const mapping = await getBSMapping();
    const accounts = await store.getAccounts();
    const tabs = ['current-assets', 'non-current-assets', 'current-liabilities', 'non-current-liabilities', 'equity'];
    
    tabs.forEach(tabId => {
        const tabContent = document.getElementById(`bs-tab-content-${tabId}`);
        if (!tabContent) return;
        tabContent.innerHTML = '';
        
        const fields = BS_FIELDS.filter(f => f.tab === tabId);
        fields.forEach(f => {
            const val = mapping[f.key] || '';
            const selectedCodes = val ? val.split(',').map(s => s.trim()).filter(Boolean) : [];
            
            const formGroup = document.createElement('div');
            formGroup.className = 'form-group';
            formGroup.style.marginBottom = '16px';
            
            // Build options list for checklist
            const optionsHtml = accounts.map(a => {
                const isChecked = selectedCodes.includes(a.code);
                const isSummary = a.type === 'summary';
                const style = isSummary 
                    ? 'font-weight: 700; color: var(--primary-color); background-color: rgba(79, 70, 229, 0.05);' 
                    : 'padding-left: 14px;';
                return `
                    <label style="display: flex; align-items: center; gap: 8px; margin: 0; padding: 6px 8px; border-radius: 4px; cursor: pointer; font-size: 13px; ${style}" class="dropdown-item-label" data-text="${a.code} ${a.name}">
                        <input type="checkbox" class="bs-account-checkbox" value="${a.code}" ${isChecked ? 'checked' : ''} style="margin: 0; width: 14px; height: 14px; cursor: pointer;">
                        <span><strong>${a.code}</strong> - ${a.name}</span>
                    </label>
                `;
            }).join('');

            formGroup.innerHTML = `
                <label style="font-size: 13px; font-weight: 600; margin-bottom: 4px; display: block;">
                    ${f.labelTh} <span style="font-weight: normal; color: var(--text-muted); font-size: 11px;">(${f.labelEn})</span>
                </label>
                <div style="display: flex; gap: 6px; align-items: center; width: 100%;">
                    <input type="text" class="form-control bs-group-input" data-key="${f.key}" value="${val}" placeholder="เช่น 1111-00, 1112-00" style="padding: 6px 10px; font-size: 13px; width: 100%;">
                    <button type="button" class="btn btn-secondary btn-sm bs-group-select-btn" style="padding: 6px 10px; font-size: 13px; height: 33px; display: inline-flex; align-items: center; gap: 4px; background-color: var(--primary-color); border-color: var(--primary-color); color: white; border-radius: 4px;" title="เลือกบัญชี">
                        <i class="fa-solid fa-list"></i> เลือก
                    </button>
                </div>
                <!-- Collapsible checklist -->
                <div class="dropdown-multiselect-menu" style="display: none; background: var(--card-bg, #fff); border: 1px solid var(--border-color, #ccc); border-radius: 6px; margin-top: 6px; padding: 8px; max-height: 200px; overflow-y: auto;">
                    <div style="margin-bottom: 8px;">
                        <input type="text" class="form-control dropdown-search" placeholder="🔍 ค้นหารหัสหรือชื่อบัญชี..." style="font-size: 12px; padding: 4px 8px; width: 100%; border-radius: 4px; border: 1px solid var(--border-color);">
                    </div>
                    <div class="dropdown-options-list" style="display: flex; flex-direction: column; gap: 2px;">
                        ${optionsHtml}
                    </div>
                </div>
            `;
            
            tabContent.appendChild(formGroup);
            
            // Bind events for this formGroup
            const input = formGroup.querySelector('.bs-group-input');
            const btn = formGroup.querySelector('.bs-group-select-btn');
            const menu = formGroup.querySelector('.dropdown-multiselect-menu');
            const searchInput = formGroup.querySelector('.dropdown-search');
            const checkboxes = formGroup.querySelectorAll('.bs-account-checkbox');
            const labels = formGroup.querySelectorAll('.dropdown-item-label');
            
            btn.addEventListener('click', () => {
                const isOpen = menu.style.display === 'block';
                if (!isOpen) {
                    menu.style.display = 'block';
                    // Sync checkboxes with current input value
                    const activeCodes = input.value.split(',').map(s => s.trim()).filter(Boolean);
                    checkboxes.forEach(cb => {
                        cb.checked = activeCodes.includes(cb.value);
                    });
                    
                    searchInput.value = '';
                    labels.forEach(l => l.style.display = 'flex');
                    btn.innerHTML = '<i class="fa-solid fa-chevron-up"></i> ซ่อน';
                    btn.style.backgroundColor = '#6b7280';
                    btn.style.borderColor = '#6b7280';
                } else {
                    menu.style.display = 'none';
                    btn.innerHTML = '<i class="fa-solid fa-list"></i> เลือก';
                    btn.style.backgroundColor = 'var(--primary-color)';
                    btn.style.borderColor = 'var(--primary-color)';
                }
            });
            
            searchInput.addEventListener('input', (e) => {
                const q = e.target.value.toLowerCase();
                labels.forEach(label => {
                    const text = label.getAttribute('data-text').toLowerCase();
                    if (text.includes(q)) {
                        label.style.display = 'flex';
                    } else {
                        label.style.display = 'none';
                    }
                });
            });
            
            checkboxes.forEach(cb => {
                cb.addEventListener('change', () => {
                    const selected = [];
                    checkboxes.forEach(c => {
                        if (c.checked) selected.push(c.value);
                    });
                    input.value = selected.join(', ');
                });
            });
        });
    });
    
    switchBSTab('current-assets');
    openModal('modal-configure-bs-groups');
}

// DOM loaded event
// DOM loaded event
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Database
    try {
        await initMultiCompany();
        await store.initializeStore();
        companyProfile = await db.getByKey('settings', 'company_profile');
        if (!companyProfile || typeof companyProfile !== 'object' || !companyProfile.name) {
            const activeCode = db.getActiveCompanyCode();
            const companies = await db.getCompanies();
            const currentComp = companies.find(c => c.code === activeCode) || { name: '0.ทดลอง' };
            companyProfile = {
                key: 'company_profile',
                name: currentComp.name,
                address: 'กรุงเทพมหานคร',
                taxId: '0105500000000',
                capitalShares: 100000,
                capitalPar: 10,
                capitalPaid: 1000000
            };
            await db.putItem('settings', companyProfile);
        }
        updateHeaderBadge();
        
        // Initialize Accounting Period
        await initAccountingPeriod();
        
        // Initialize View Routing
        initRouter();
        
        // Bind all UI Actions
        bindUIActions();
        
        // Initialize Auto Sync Engine
        initAutoSync();
        
        // Bind Authentication UI and Check Session
        initAuthentication();
    } catch (err) {
        console.error('Initialization error:', err);
        showToast('เกิดข้อผิดพลาดในการโหลดระบบฐานข้อมูล: ' + err.message, 'error');
    }
});

// Toast notification helper
function showToast(message, type = 'success') {
    const toast = document.getElementById('global-toast');
    const icon = document.getElementById('toast-icon');
    const msgSpan = document.getElementById('toast-message');
    
    toast.className = `alert-toast ${type} active`;
    msgSpan.innerText = message;
    
    if (type === 'success') {
        icon.className = 'fa-solid fa-circle-check';
    } else {
        icon.className = 'fa-solid fa-circle-exclamation';
    }
    
    setTimeout(() => {
        toast.classList.remove('active');
    }, 4000);
}

// Modal open/close helpers
window.openModal = function(modalId) {
    document.getElementById(modalId).classList.add('active');
};

window.closeModal = function(modalId) {
    document.getElementById(modalId).classList.remove('active');
};

// Helper for formatting THB Currency
function formatDateToDDMMYYYY(dateStr) {
    if (!dateStr) return '';
    if (dateStr.includes('/')) return dateStr;
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
}

function formatMoney(amount) {
    if (amount === undefined || amount === null || isNaN(amount)) return '0.00';
    return Number(amount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Update Company Badge in Header
function updateHeaderBadge() {
    if (companyProfile) {
        const activeCode = db.getActiveCompanyCode();
        const isBound = !!sessionStorage.getItem('ledger_company_code');
        const swapIcon = isBound ? '' : `<i class="fa-solid fa-right-left" style="margin-left: 8px; font-size: 10px; opacity: 0.7;"></i>`;
        document.getElementById('header-company-name').innerHTML = `<i class="fa-solid fa-building"></i> <span>[${activeCode}] ${companyProfile.name}</span> ${swapIcon}`;
        document.getElementById('header-company-name').style.cursor = isBound ? 'default' : 'pointer';
    }
}

// Apply global accounting period to all date inputs
function applyPeriodToDateInputs(startDate, endDate) {
    const inputs = {
        'journal-filter-start': startDate,
        'journal-filter-end': endDate,
        'ledger-date-start': startDate,
        'ledger-date-end': endDate,
        'tb-date-start': startDate,
        'tb-date-end': endDate,
        'pl-date-start': startDate,
        'pl-date-end': endDate,
        'bs-date-end': endDate,
        'tax-report-start': startDate,
        'tax-report-end': endDate
    };
    
    for (const [id, value] of Object.entries(inputs)) {
        const el = document.getElementById(id);
        if (el) {
            el.value = value;
        }
    }
}

// Load and initialize accounting period settings
async function initAccountingPeriod() {
    globalPeriod = await db.getByKey('settings', 'accounting_period');
    if (!globalPeriod || typeof globalPeriod !== 'object' || !globalPeriod.startDate) {
        globalPeriod = {
            key: 'accounting_period',
            startDate: '2026-01-01',
            endDate: '2026-12-31'
        };
        await db.putItem('settings', globalPeriod);
    }
    
    // Set settings form inputs
    const startInput = document.getElementById('settings-period-start');
    const endInput = document.getElementById('settings-period-end');
    if (startInput) startInput.value = globalPeriod.startDate;
    if (endInput) endInput.value = globalPeriod.endDate;
    
    // Set all report date fields
    applyPeriodToDateInputs(globalPeriod.startDate, globalPeriod.endDate);
}

// Authentication & Session Management
function initAuthentication() {
    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('btn-logout');
    
    // Check if session exists
    if (sessionStorage.getItem('ledger_logged_in') === 'true') {
        applySession();
    } else {
        document.body.classList.remove('logged-in');
        document.body.classList.add('logged-out');
    }
    
    // Login form submit
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value.trim();
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const data = await response.json();
                
                if (response.ok && data.success) {
                    sessionStorage.setItem('ledger_logged_in', 'true');
                    sessionStorage.setItem('ledger_username', data.user.username);
                    sessionStorage.setItem('ledger_role', data.user.role);
                    
                    if (data.user.company_code && data.user.company_code !== '*') {
                        sessionStorage.setItem('ledger_company_code', data.user.company_code);
                    } else {
                        sessionStorage.removeItem('ledger_company_code');
                    }
                    
                    applySession();
                    showToast(`เข้าสู่ระบบสำเร็จ ยินดีต้อนรับคุณ ${data.user.username}`, 'success');
                    
                    document.getElementById('login-username').value = '';
                    document.getElementById('login-password').value = '';
                    
                    // Force refresh company data if locked
                    if (data.user.company_code && data.user.company_code !== '*') {
                        window.currentCompanyCode = data.user.company_code;
                        localStorage.setItem('ledger_active_company', data.user.company_code);
                        if(typeof loadCompanyData === 'function') loadCompanyData();
                    }
                } else {
                    showToast(data.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง!', 'error');
                }
            } catch (err) {
                console.error("Login error:", err);
                showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ (โปรดตรวจสอบว่าเปิดใช้งาน start-online-ledger หรือยัง)', 'error');
            }
        });
    }
    
    // Logout button click
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('คุณต้องการออกจากระบบบัญชีใช่หรือไม่?')) {
                sessionStorage.clear();
                document.body.classList.remove('logged-in');
                document.body.classList.add('logged-out');
                showToast('ออกจากระบบเรียบร้อยแล้ว', 'success');
            }
        });
    }
}

function applySession() {
    document.body.classList.remove('logged-out');
    document.body.classList.add('logged-in');
    
    const username = sessionStorage.getItem('ledger_username') || '-';
    const role = sessionStorage.getItem('ledger_role') || '-';
    const roleThai = role === 'admin' ? 'ผู้ดูแลระบบ (Admin)' : 'พนักงานบัญชี (Accountant)';
    
    // Update sidebar display
    const usernameEl = document.getElementById('sidebar-username');
    const roleEl = document.getElementById('sidebar-role');
    if (usernameEl) usernameEl.innerText = username;
    if (roleEl) roleEl.innerText = roleThai;
    
    // Admin Menus Access Control
    const navSecurity = document.getElementById('nav-security-settings');
    const navUsers = document.getElementById('nav-users');
    if (role === 'admin') {
        if (navSecurity) navSecurity.style.display = 'block';
        if (navUsers) navUsers.style.display = 'block';
    } else {
        if (navSecurity) navSecurity.style.display = 'none';
        if (navUsers) navUsers.style.display = 'none';
    }

    // Company Access Control
    const boundCompanyCode = sessionStorage.getItem('ledger_company_code');
    const switchCompanyBtn = document.getElementById('sidebar-switch-company');
    if (switchCompanyBtn) {
        if (boundCompanyCode) {
            switchCompanyBtn.style.display = 'none'; // Hide if bound to single company
        } else {
            switchCompanyBtn.style.display = 'block';
        }
    }
    
    // Control feature access by Role
    const clearDbBtn = document.getElementById('btn-clear-db');
    const seed100kBtn = document.getElementById('btn-seed-100k');
    const importInput = document.getElementById('import-file-input');
    
    if (role === 'accountant') {
        // Hide/Disable database modifying tools in settings for Accountants
        if (clearDbBtn) {
            clearDbBtn.disabled = true;
            clearDbBtn.title = 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่ล้างระบบได้';
            clearDbBtn.style.opacity = '0.5';
        }
        if (seed100kBtn) {
            seed100kBtn.disabled = true;
            seed100kBtn.title = 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่รันสเตรสเทสได้';
            seed100kBtn.style.opacity = '0.5';
        }
        if (importInput) {
            importInput.disabled = true;
            importInput.title = 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่นำเข้าข้อมูลได้';
            importInput.parentElement.style.opacity = '0.5';
        }
    } else {
        // Admin has full power
        if (clearDbBtn) {
            clearDbBtn.disabled = false;
            clearDbBtn.title = '';
            clearDbBtn.style.opacity = '1';
        }
        if (seed100kBtn) {
            seed100kBtn.disabled = false;
            seed100kBtn.title = '';
            seed100kBtn.style.opacity = '1';
        }
        if (importInput) {
            importInput.disabled = false;
            importInput.title = '';
            importInput.parentElement.style.opacity = '1';
        }
    }
    
    // Auto-reload to switch and render default view
    switchView('dashboard');
}

// =========================================================================
// VIEW ROUTER
// =========================================================================
function initRouter() {
    const sidebarItems = document.querySelectorAll('.sidebar-menu li[data-view]');
    const submenuHeaders = document.querySelectorAll('.sidebar-menu-item-with-submenu > a');
    
    // Toggle submenu
    submenuHeaders.forEach(a => {
        a.addEventListener('click', (e) => {
            e.preventDefault();
            const parent = a.parentElement;
            const submenu = parent.querySelector('.sidebar-submenu');
            
            parent.classList.toggle('open');
            if (submenu) {
                submenu.classList.toggle('open');
            }
        });
    });

    sidebarItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const viewName = item.getAttribute('data-view');
            if (!viewName) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            // Remove active states
            document.querySelectorAll('.sidebar-menu li').forEach(li => li.classList.remove('active'));
            
            // Set active state
            item.classList.add('active');
            
            // Highlight parent if inside submenu
            const parentSubmenu = item.closest('.sidebar-submenu');
            if (parentSubmenu) {
                parentSubmenu.parentElement.classList.add('active');
            }
            
            switchView(viewName);
        });
    });
}

async function switchView(viewName) {
    // Ensure default dates from globalPeriod are populated on view switch if inputs are empty
    if (globalPeriod) {
        const startVal = globalPeriod.startDate;
        const endVal = globalPeriod.endDate;
        const startInputs = ['journal-filter-start', 'ledger-date-start', 'tb-date-start', 'pl-date-start', 'tax-report-start'];
        const endInputs = ['journal-filter-end', 'ledger-date-end', 'tb-date-end', 'pl-date-end', 'bs-date-end', 'tax-report-end'];
        
        startInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el && !el.value) el.value = startVal;
        });
        endInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el && !el.value) el.value = endVal;
        });
    }

    // Hide all view sections
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    
    // Show target section
    const targetSection = document.getElementById(`view-${viewName}`);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Update Title in Header
    const titles = {
        'dashboard': 'แผงควบคุมหลัก (Financial Dashboard)',
        'accounts': 'ผังบัญชีนิติบุคคล (Chart of Accounts)',
        'journal': 'สมุดรายวันทั่วไป (General Journal Entries)',
        'ledger': 'สมุดบัญชีแยกประเภท (General Ledger Report)',
        'trial-balance': 'กระดาษทำการงบทดลอง (Trial Balance)',
        'profit-loss': 'รายงานงบกำไรขาดทุน (Profit & Loss Statement)',
        'balance-sheet': 'งบแสดงฐานะการเงิน (Balance Sheet Report)',
        'tax-reports': 'รายงานภาษีซื้อ ภาษีขาย และภาษีหัก ณ ที่จ่าย (สรรพากร)',
        'invoices': 'การจัดการใบเสร็จ ใบแจ้งหนี้ และบิลค่าใช้จ่าย',
        'finance': 'การเงิน (Finance) - การรับชำระหนี้ จ่ายชำระหนี้ และวิธีการชำระเงิน',
        'petty-cash': 'ระบบเงินสดย่อย (Petty Cash System) - จ่ายและเบิกชดเชยเงินสดย่อย',
        'contacts': 'ทะเบียนลูกหนี้และเจ้าหนี้ (Customers & Suppliers)',
        'settings': 'ตั้งค่าระบบองค์กร & เครื่องมือทดสอบความจุ',
        'inventory-transactions': 'ความเคลื่อนไหวสินค้าประจำวัน (Daily Stock Movements)',
        'inventory-products': 'รายละเอียดสินค้าคงคลัง (Product Master List)',
        'inventory-sets': 'สินค้าชุดและโครงสร้างส่วนประกอบ (BOM Setup)',
        'inventory-services': 'รายละเอียดงานบริการนิติบุคคล (Service Catalog)',
        'inventory-prices': 'ตารางราคาขายแยกระดับและกลุ่มราคา (Customer Price Lists)',
        'inventory-counts': 'การตรวจนับสินค้าคงคลังและรายการปรับยอดสต็อก',
        'inventory-repair': 'เครื่องมือซ่อมแซมระบบสินค้าและคำนวณต้นทุนสะสม',
        'inventory-reorders': 'จุดแจ้งเตือนสินค้าสั่งซื้อขั้นต่ำ (Reorder Points Management)'
    };
    
    document.getElementById('current-view-title').innerText = titles[viewName] || 'ระบบบัญชี';
    
    // Load data specific to each view
    switch (viewName) {
        case 'dashboard':
            await renderDashboard();
            break;
        case 'accounts':
            await renderAccounts();
            break;
        case 'journal':
            await renderJournal();
            break;
        case 'ledger':
            await initLedgerView();
            break;
        case 'trial-balance':
            await renderTrialBalance();
            break;
        case 'profit-loss':
            await renderProfitLoss();
            break;
        case 'balance-sheet':
            await renderBalanceSheet();
            break;
        case 'tax-reports':
            await renderTaxReportsView();
            break;
        case 'invoices':
            await renderInvoicesView();
            break;
        case 'finance':
            await renderFinanceView();
            break;
        case 'petty-cash':
            await renderPettyCashView();
            break;
        case 'contacts':
            await renderContactsView();
            break;
        case 'settings':
            await renderSettingsView();
            break;
        case 'inventory-transactions':
            await renderInventoryTransactions();
            break;
        case 'inventory-products':
            await renderInventoryProducts();
            break;
        case 'inventory-sets':
            await renderInventorySets();
            break;
        case 'inventory-services':
            await renderInventoryServices();
            break;
        case 'inventory-prices':
            await renderInventoryPrices();
            break;
        case 'inventory-counts':
            await renderInventoryCounts();
            break;
        case 'inventory-repair':
            await renderInventoryRepair();
            break;
        case 'inventory-reorders':
            await renderInventoryReorders();
            break;
    }
}

// =========================================================================
// 1. DASHBOARD VIEW RENDERER
// =========================================================================
async function renderDashboard() {
    // Calculate total assets, revenues, expenses for metrics
    const accounts = await store.getAccounts();
    const trialBalance = await store.getTrialBalance(null, null); // Cumulative
    
    let cashBalance = 0;
    let totalRevenue = 0;
    let totalExpense = 0;
    
    for (const acc of trialBalance) {
        if (acc.code === '1111-00' || acc.code === '1112-00') {
            // Cash & Bank
            cashBalance += (acc.debit - acc.credit);
        }
        if (acc.category === 'revenue' && (acc.level === 1 || !acc.parentCode)) {
            totalRevenue += (acc.credit - acc.debit);
        }
        if (acc.category === 'expense' && (acc.level === 1 || !acc.parentCode)) {
            totalExpense += (acc.debit - acc.credit);
        }
    }
    
    const netProfit = totalRevenue - totalExpense;
    
    // Update dashboard labels
    document.getElementById('metric-cash').innerText = formatMoney(cashBalance) + ' ฿';
    document.getElementById('metric-revenue').innerText = formatMoney(totalRevenue) + ' ฿';
    document.getElementById('metric-expense').innerText = formatMoney(totalExpense) + ' ฿';
    
    const profitEl = document.getElementById('metric-netprofit');
    profitEl.innerText = formatMoney(netProfit) + ' ฿';
    if (netProfit >= 0) {
        profitEl.style.color = 'var(--success-green)';
    } else {
        profitEl.style.color = 'var(--danger-red)';
    }
    
    // Render charts
    renderDashboardCharts(totalRevenue, totalExpense, trialBalance);
    
    // Render 5 recent transactions
    const recentEntries = await store.getJournalEntries(5, 0);
    const tbody = document.querySelector('#dashboard-recent-table tbody');
    tbody.innerHTML = '';
    
    if (recentEntries.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">ไม่พบรายการธุรกรรมล่าสุด</td></tr>`;
        return;
    }
    
    recentEntries.forEach(entry => {
        // Calculate debit/credit sums for display
        let totalDebit = 0;
        let totalCredit = 0;
        entry.lines.forEach(l => {
            totalDebit += l.debit;
            totalCredit += l.credit;
        });
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatDateToDDMMYYYY(entry.date)}</td>
            <td><strong>${entry.reference}</strong></td>
            <td>${entry.description}</td>
            <td class="num-col text-debit">${formatMoney(totalDebit)} ฿</td>
            <td class="num-col text-credit">${formatMoney(totalCredit)} ฿</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderDashboardCharts(revenue, expense, trialBalance) {
    // Destory existing charts to prevent hover overlapping issues
    if (cashFlowChart) cashFlowChart.destroy();
    if (expensePieChart) expensePieChart.destroy();
    
    // 1. Cash flow chart (Bar Comparison)
    const ctxCash = document.getElementById('chart-cashflow').getContext('2d');
    cashFlowChart = new Chart(ctxCash, {
        type: 'bar',
        data: {
            labels: ['ภาพรวมสะสมปีนี้'],
            datasets: [
                {
                    label: 'รายรับทั้งหมด',
                    data: [revenue],
                    backgroundColor: 'rgba(16, 185, 129, 0.85)', // Emerald
                    borderColor: 'rgb(16, 185, 129)',
                    borderWidth: 1
                },
                {
                    label: 'ค่าใช้จ่ายทั้งหมด',
                    data: [expense],
                    backgroundColor: 'rgba(239, 68, 68, 0.85)', // Red
                    borderColor: 'rgb(239, 68, 68)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) { return formatMoney(value) + ' ฿'; }
                    }
                }
            }
        }
    });

    // 2. Expense breakdown Pie Chart
    const expenseData = [];
    const expenseLabels = [];
    
    trialBalance.forEach(acc => {
        if (acc.category === 'expense' && acc.type !== 'control') {
            const val = acc.debit - acc.credit;
            if (val > 0) {
                expenseData.push(val);
                expenseLabels.push(acc.name);
            }
        }
    });

    const ctxExp = document.getElementById('chart-expenses').getContext('2d');
    
    if (expenseData.length === 0) {
        // Render empty chart helper
        expenseLabels.push('ไม่มีค่าใช้จ่าย');
        expenseData.push(1);
    }

    expensePieChart = new Chart(ctxExp, {
        type: 'doughnut',
        data: {
            labels: expenseLabels,
            datasets: [{
                data: expenseData,
                backgroundColor: [
                    '#ef4444', '#f97316', '#eab308', '#3b82f6', '#8b5cf6',
                    '#ec4899', '#14b8a6', '#6b7280', '#06b6d4', '#10b981'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12 } }
            }
        }
    });
}

// =========================================================================
// 2. CHART OF ACCOUNTS VIEW
// =========================================================================
// Chart of Accounts State
let selectedCoaCode = '';
let coaMode = 'view'; // 'view', 'add', 'edit'
const collapsedStates = {};
let accountsGlobalList = [];

// Check if account has journal entries (using SQLite REST API)
async function hasJournalEntries(code) {
    try {
        const entries = await db.getAll('journalEntries');
        return entries.some(entry => entry.lines && entry.lines.some(line => line.accountCode === code));
    } catch (err) {
        console.error('Error in hasJournalEntries:', err);
        return false;
    }
}

// Check if account has a non-zero balance
async function hasAccountBalance(code) {
    try {
        const trialBalance = await store.getTrialBalance('', '');
        const entry = trialBalance.find(b => b.code === code);
        if (entry) {
            const balance = Math.abs(entry.debit - entry.credit);
            return balance > 0.01;
        }
        return false;
    } catch (err) {
        console.error('Error in hasAccountBalance:', err);
        return false;
    }
}

// Local helper to build the tree data structure
function buildCoaTreeData(accounts, query = '') {
    const map = {};
    accounts.forEach(a => {
        map[a.code] = { ...a, children: [], matches: false, visible: false };
    });

    const queryLower = query.toLowerCase().trim();
    accounts.forEach(a => {
        if (queryLower) {
            if (a.code.toLowerCase().includes(queryLower) || a.name.toLowerCase().includes(queryLower)) {
                map[a.code].matches = true;
                map[a.code].visible = true;
                
                // Keep parent chain visible and expanded
                let parentCode = a.parentCode;
                while (parentCode && map[parentCode]) {
                    map[parentCode].visible = true;
                    parentCode = map[parentCode].parentCode;
                }
            }
        } else {
            map[a.code].visible = true;
        }
    });

    const roots = [];
    accounts.forEach(a => {
        const node = map[a.code];
        if (a.parentCode && map[a.parentCode]) {
            map[a.parentCode].children.push(node);
        } else {
            if (!queryLower || node.visible) {
                roots.push(node);
            }
        }
    });

    return { roots, map };
}

// Generate TreeNode HTML recursively
function renderCoaTreeNodeHtml(node, query = '') {
    if (query && !node.visible) return '';

    const hasChildren = node.children.length > 0;
    let iconClass = 'fa-file-lines'; // Posting account
    if (node.type === 'control') {
        const isCollapsed = collapsedStates[node.code] === true;
        iconClass = isCollapsed ? 'fa-folder' : 'fa-folder-open';
    }

    const isCollapsed = collapsedStates[node.code] === true;
    const toggleClass = isCollapsed ? 'collapsed' : '';
    const listClass = isCollapsed ? 'hidden' : '';

    let html = `<li>`;
    html += `<div class="coa-tree-node-wrapper">`;

    if (node.type === 'control') {
        html += `<span class="coa-tree-toggle ${toggleClass}" data-code="${node.code}">`;
        html += `<i class="fa-solid fa-chevron-down"></i>`;
        html += `</span>`;
    } else {
        html += `<span style="width: 16px; display: inline-block; margin-right: -4px;"></span>`;
    }

    const isActive = (node.code === selectedCoaCode);
    const activeClass = isActive ? 'active' : '';
    const levelClass = `coa-level-${node.level || 1}`;

    html += `<span class="coa-tree-item ${activeClass} ${levelClass}" data-code="${node.code}">`;
    html += `<i class="fa-solid ${iconClass}"></i>`;
    html += `<span>${node.code} &nbsp; ${node.name}</span>`;
    html += `</span>`;
    html += `</div>`;

    if (hasChildren) {
        html += `<ul class="coa-tree-child-list ${listClass}">`;
        node.children.forEach(child => {
            html += renderCoaTreeNodeHtml(child, query);
        });
        html += `</ul>`;
    }

    html += `</li>`;
    return html;
}

// Render tree view only based on search query
function renderTreeOnly() {
    const query = document.getElementById('coa-search').value.toLowerCase().trim();
    
    // Auto-expand parents if searching
    if (query) {
        accountsGlobalList.forEach(a => {
            if (a.code.toLowerCase().includes(query) || a.name.toLowerCase().includes(query)) {
                let parentCode = a.parentCode;
                while (parentCode) {
                    collapsedStates[parentCode] = false; // Force expand
                    const parentNode = accountsGlobalList.find(x => x.code === parentCode);
                    parentCode = parentNode ? parentNode.parentCode : null;
                }
            }
        });
    }

    const { roots, map } = buildCoaTreeData(accountsGlobalList, query);
    const container = document.getElementById('coa-tree-container');
    
    if (roots.length === 0) {
        container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px;">ไม่พบรหัสบัญชีที่ตรงกับคำค้นหา</div>`;
        return;
    }

    let html = '<ul>';
    roots.forEach(root => {
        html += renderCoaTreeNodeHtml(root, query);
    });
    html += '</ul>';
    
    container.innerHTML = html;
}

// Populate the Parent Account dropdown with valid choices
function populateParentSelect(currentCode = '') {
    const parentSelect = document.getElementById('coa-parent');
    parentSelect.innerHTML = '<option value="">-- เป็นบัญชีระดับสูงสุด --</option>';
    
    const accountsMap = {};
    accountsGlobalList.forEach(a => {
        accountsMap[a.code] = a;
    });

    function isDescendant(childCode, ancestorCode) {
        let current = accountsMap[childCode];
        while (current && current.parentCode) {
            if (current.parentCode === ancestorCode) return true;
            current = accountsMap[current.parentCode];
        }
        return false;
    }

    const validParents = accountsGlobalList.filter(acc => {
        if (acc.type !== 'control') return false;
        if (currentCode) {
            if (acc.code === currentCode) return false;
            if (isDescendant(acc.code, currentCode)) return false;
        }
        return true;
    });

    validParents.forEach(acc => {
        const opt = document.createElement('option');
        opt.value = acc.code;
        const indent = '\u00A0\u00A0'.repeat(acc.level - 1);
        opt.text = `${indent}${acc.code} - ${acc.name}`;
        parentSelect.appendChild(opt);
    });
}

// Disable/Enable the details form fields
function setCoaFormDisabled(disabled) {
    document.getElementById('coa-code').disabled = disabled;
    document.getElementById('coa-name').disabled = disabled;
    document.getElementById('coa-name-en').disabled = disabled;
    document.getElementById('coa-parent').disabled = disabled;
    document.getElementById('coa-group').disabled = disabled;
    document.getElementById('coa-type').disabled = disabled;
    document.getElementById('coa-dept').disabled = disabled;
}

// Update the Navigation buttons state
function updateCoaToolbarNavigationStates() {
    if (coaMode !== 'view' || accountsGlobalList.length === 0) {
        document.getElementById('btn-coa-first').disabled = true;
        document.getElementById('btn-coa-prev').disabled = true;
        document.getElementById('btn-coa-next').disabled = true;
        document.getElementById('btn-coa-last').disabled = true;
        return;
    }

    const currentIndex = accountsGlobalList.findIndex(a => a.code === selectedCoaCode);
    document.getElementById('btn-coa-first').disabled = (currentIndex <= 0);
    document.getElementById('btn-coa-prev').disabled = (currentIndex <= 0);
    document.getElementById('btn-coa-next').disabled = (currentIndex < 0 || currentIndex >= accountsGlobalList.length - 1);
    document.getElementById('btn-coa-last').disabled = (currentIndex < 0 || currentIndex >= accountsGlobalList.length - 1);
}

// Display account details in the form
async function showCoaDetail(code) {
    const account = accountsGlobalList.find(a => a.code === code);
    if (!account) {
        document.getElementById('coa-detail-form').reset();
        document.getElementById('coa-detail-title').innerHTML = `<i class="fa-solid fa-circle-info"></i> รายละเอียดบัญชี`;
        document.getElementById('btn-coa-edit').disabled = true;
        document.getElementById('btn-coa-delete').disabled = true;
        return;
    }

    document.getElementById('coa-code').value = account.code;
    document.getElementById('coa-name').value = account.name;
    document.getElementById('coa-name-en').value = account.nameEn || '';
    document.getElementById('coa-parent').value = account.parentCode || '';
    document.getElementById('coa-level').value = account.level || 1;
    document.getElementById('coa-group').value = account.category;
    document.getElementById('coa-type').value = account.type || 'posting';
    document.getElementById('coa-dept').value = account.dept || 'N';

    document.getElementById('coa-detail-title').innerHTML = `<i class="fa-solid fa-circle-info"></i> รายละเอียดบัญชี: ${account.code}`;

    if (coaMode === 'view') {
        document.getElementById('btn-coa-edit').disabled = false;
        
        // Deletion check (Simplified to avoid slow async network checks)
        const hasChild = accountsGlobalList.some(a => a.parentCode === account.code);
        const isCore = ['1000-00', '1100-00', '1110-00', '1111-00', '1112-00', '1120-00', '1121-00', '2000-00', '2100-00', '2110-00', '2111-00', '3000-00', '4000-00', '5000-00', '9999-99'].includes(account.code);
        
        document.getElementById('btn-coa-delete').disabled = (hasChild || isCore);
    }
    
    updateCoaToolbarNavigationStates();
}

// Main Chart of Accounts View rendering
async function renderAccounts() {
    coaMode = 'view';
    setCoaFormDisabled(true);
    document.getElementById('coa-form-actions').style.display = 'none';
    document.getElementById('btn-coa-add').disabled = false;
    
    accountsGlobalList = await store.getAccounts();
    
    renderTreeOnly();
    populateParentSelect();
    
    if (!selectedCoaCode && accountsGlobalList.length > 0) {
        selectedCoaCode = accountsGlobalList[0].code;
    }
    
    if (selectedCoaCode) {
        setTimeout(() => {
            const activeNode = document.querySelector(`#coa-tree-container .coa-tree-item[data-code="${selectedCoaCode}"]`);
            if (activeNode) {
                activeNode.classList.add('active');
                
                let parentCode = accountsGlobalList.find(x => x.code === selectedCoaCode)?.parentCode;
                let needRedraw = false;
                while (parentCode) {
                    if (collapsedStates[parentCode] !== false) {
                        collapsedStates[parentCode] = false;
                        needRedraw = true;
                    }
                    const parentNode = accountsGlobalList.find(x => x.code === parentCode);
                    parentCode = parentNode ? parentNode.parentCode : null;
                }
                if (needRedraw) {
                    renderTreeOnly();
                }
            }
        }, 50);
        
        await showCoaDetail(selectedCoaCode);
    }
}

// Highlight and select helper for navigation
async function highlightAndSelectAccount(code) {
    let parentCode = accountsGlobalList.find(x => x.code === code)?.parentCode;
    let needRedraw = false;
    while (parentCode) {
        if (collapsedStates[parentCode] !== false) {
            collapsedStates[parentCode] = false;
            needRedraw = true;
        }
        const parentNode = accountsGlobalList.find(x => x.code === parentCode);
        parentCode = parentNode ? parentNode.parentCode : null;
    }
    
    if (needRedraw) {
        renderTreeOnly();
    }
    
    document.querySelectorAll('#coa-tree-container .coa-tree-item').forEach(el => {
        el.classList.remove('active');
    });
    
    const node = document.querySelector(`#coa-tree-container .coa-tree-item[data-code="${code}"]`);
    if (node) {
        node.classList.add('active');
        node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    await showCoaDetail(code);
}

// =========================================================================
// 3. JOURNAL ENTRIES VIEW
// =========================================================================
async function renderJournal(filteredEntries = null) {
    const entries = filteredEntries || await store.getJournalEntries(100, 0);
    const tbody = document.querySelector('#journal-table tbody');
    tbody.innerHTML = '';
    
    if (entries.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 32px;">ไม่พบรายการธุรกรรมในฐานข้อมูล</td></tr>`;
        return;
    }
    
    // Retrieve accounts mapping for labels
    const accounts = await store.getAccounts();
    const accountMap = {};
    accounts.forEach(a => accountMap[a.code] = a.name);
    
    entries.forEach(entry => {
        // Split lines into debits first, then credits
        const debitLines = entry.lines.filter(l => l.debit > 0);
        const creditLines = entry.lines.filter(l => l.credit > 0);
        
        const rowSpan = debitLines.length + creditLines.length;
        
        // Render first line
        const firstLine = debitLines[0] || creditLines[0];
        const isDebit = debitLines.length > 0;
        
        let linesHtml = '';
        
        // Compile lines inside table cell
        debitLines.forEach((line, index) => {
            linesHtml += `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 4px 0;">
                    <span style="flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${line.accountCode} - ${accountMap[line.accountCode] || 'ไม่ทราบชื่อบัญชี'}</span>
                    <span class="num-col text-debit" style="min-width: 120px; text-align: right; margin-left: 16px;">${formatMoney(line.debit)}</span>
                    <span style="min-width: 120px; text-align: right; margin-left: 16px; color: var(--text-muted);">-</span>
                </div>
            `;
        });
        
        creditLines.forEach((line, index) => {
            linesHtml += `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 4px 0;">
                    <span style="flex: 1; min-width: 0; padding-left: 24px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"><em>${line.accountCode} - ${accountMap[line.accountCode] || 'ไม่ทราบชื่อบัญชี'}</em></span>
                    <span style="min-width: 120px; text-align: right; margin-left: 16px; color: var(--text-muted);">-</span>
                    <span class="num-col text-credit" style="min-width: 120px; text-align: right; margin-left: 16px;">${formatMoney(line.credit)}</span>
                </div>
            `;
        });
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="vertical-align: top;">${formatDateToDDMMYYYY(entry.date)}</td>
            <td style="vertical-align: top;"><strong>${entry.reference}</strong></td>
            <td style="vertical-align: top;">
                <div style="font-weight: 600; margin-bottom: 6px;">${entry.description}</div>
                <div style="border-top: 1px solid #f1f5f9; padding-top: 4px;">
                    ${linesHtml}
                </div>
                ${entry.vatAmount ? `<span class="status-badge paid" style="font-size:10px; margin-top: 4px; display:inline-block;">VAT (${entry.vatType}): ${formatMoney(entry.vatAmount)} ฿</span>` : ''}
                ${entry.whtAmount ? `<span class="status-badge unpaid" style="font-size:10px; margin-top: 4px; display:inline-block; margin-left: 6px;">WHT (${entry.whtType}%): ${formatMoney(entry.whtAmount)} ฿</span>` : ''}
            </td>
            <td style="text-align: right; vertical-align: top; font-weight:700;" class="text-debit">
                ${formatMoney(entry.lines.reduce((sum, l) => sum + l.debit, 0))} ฿
            </td>
            <td style="text-align: right; vertical-align: top; font-weight:700;" class="text-credit">
                ${formatMoney(entry.lines.reduce((sum, l) => sum + l.credit, 0))} ฿
            </td>
            <td style="vertical-align: top; text-align: center;">
                <button class="btn btn-danger btn-sm delete-jv-btn" data-id="${entry.id}" style="padding: 2px 6px; font-size: 11px;"><i class="fa-solid fa-trash-alt"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Bind delete events
    document.querySelectorAll('.delete-jv-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = parseInt(btn.getAttribute('data-id'));
            if (confirm(`คุณต้องการลบธุรกรรมสมุดรายวันเลขที่ #${id} หรือไม่?`)) {
                await db.deleteItem('journalEntries', id);
                showToast('ลบรายการสมุดรายวันเรียบร้อยแล้ว');
                await renderJournal();
            }
        });
    });
}

// =========================================================================
// 4. GENERAL LEDGER VIEW
// =========================================================================
async function initLedgerView() {
    const accounts = await store.getAccounts();
    const startSelect = document.getElementById('ledger-account-start');
    const endSelect = document.getElementById('ledger-account-end');
    
    // Only display posting accounts for Ledger
    const postingAccounts = accounts.filter(acc => acc.type !== 'control').sort((a, b) => a.code.localeCompare(b.code));
    
    let optionsHtml = '';
    postingAccounts.forEach(acc => {
        optionsHtml += `<option value="${acc.code}">${acc.code} - ${acc.name}</option>`;
    });

    if (startSelect) {
        startSelect.innerHTML = optionsHtml;
        if (postingAccounts.length > 0) startSelect.value = postingAccounts[0].code;
    }
    
    if (endSelect) {
        endSelect.innerHTML = optionsHtml;
        if (postingAccounts.length > 0) endSelect.value = postingAccounts[postingAccounts.length - 1].code;
    }

    // Default dates
    const startVal = globalPeriod ? globalPeriod.startDate : '2026-01-01';
    const endVal = globalPeriod ? globalPeriod.endDate : '2026-12-31';
    const startEl = document.getElementById('ledger-date-start');
    if(startEl) startEl.value = startVal;
    const endEl = document.getElementById('ledger-date-end');
    if(endEl) endEl.value = endVal;

    // Show initial ledger for first posting account to last
    if (postingAccounts.length > 0 && startSelect && endSelect) {
        await renderLedger(startSelect.value, endSelect.value);
    }
}

async function renderLedger(startCode, endCode) {
    const startDate = document.getElementById('ledger-date-start').value;
    const endDate = document.getElementById('ledger-date-end').value;
    
    const accounts = await store.getAccounts();
    const postingAccounts = accounts.filter(acc => acc.type !== 'control').sort((a, b) => a.code.localeCompare(b.code));
    
    const targetAccounts = postingAccounts.filter(acc => acc.code >= startCode && acc.code <= endCode);
    
    const container = document.getElementById('ledger-results-container');
    const exportTbody = document.querySelector('#ledger-export-table tbody');
    if (!container || !exportTbody) return;
    
    container.innerHTML = '';
    exportTbody.innerHTML = '';
    
    if (targetAccounts.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 24px; color: var(--text-muted);">ไม่พบบัญชีในช่วงที่ระบุ</div>`;
        return;
    }

    // Optional: show loading indicator
    container.innerHTML = `<div style="text-align: center; padding: 24px;"><i class="fa-solid fa-circle-notch fa-spin"></i> กำลังโหลดข้อมูล...</div>`;
    
    let html = '';
    let exportHtml = '';
    
    for (const acc of targetAccounts) {
        const data = await store.getGeneralLedger(acc.code, startDate, endDate);
        
        let rowsHtml = '';
        if (data.lines.length === 0) {
            rowsHtml = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 12px;">ไม่พบประวัติรายการ</td></tr>`;
        } else {
            data.lines.forEach(line => {
                rowsHtml += `
                    <tr>
                        <td>${formatDateToDDMMYYYY(line.date)}</td>
                        <td><strong>${line.reference}</strong></td>
                        <td>${line.description}</td>
                        <td class="num-col text-debit">${line.debit > 0 ? formatMoney(line.debit) + ' ฿' : '-'}</td>
                        <td class="num-col text-credit">${line.credit > 0 ? formatMoney(line.credit) + ' ฿' : '-'}</td>
                        <td class="num-col" style="font-weight: 700; color: var(--primary-color);">${formatMoney(line.balance)} ฿</td>
                    </tr>
                `;
                
                // For export CSV
                exportHtml += `
                    <tr>
                        <td>${acc.code}</td>
                        <td>${acc.name}</td>
                        <td>${formatDateToDDMMYYYY(line.date)}</td>
                        <td>${line.reference}</td>
                        <td>${line.description}</td>
                        <td>${line.debit}</td>
                        <td>${line.credit}</td>
                        <td>${line.balance}</td>
                    </tr>
                `;
            });
        }
        
        // Build table per account with page-break
        html += `
            <div class="ledger-account-block" style="page-break-after: always; margin-bottom: 24px;">
                <h4 class="ledger-account-header" style="background-color: var(--background-color); padding: 12px; margin-bottom: 0; border: 1px solid var(--border-color); border-bottom: none; border-radius: 6px 6px 0 0;">
                    <i class="fa-solid fa-list"></i> บัญชี: ${acc.code} - ${acc.name} (หมวด ${acc.category})
                </h4>
                <div class="table-responsive" style="margin-bottom: 0;">
                    <table class="table-accounting" style="margin-bottom: 0;">
                        <thead>
                            <tr>
                                <th style="width: 15%">วันที่</th>
                                <th style="width: 15%">เลขที่อ้างอิง</th>
                                <th style="width: 30%">คำอธิบายรายการ</th>
                                <th style="text-align: right; width: 13%">เดบิต (DR.)</th>
                                <th style="text-align: right; width: 13%">เครดิต (CR.)</th>
                                <th style="text-align: right; width: 14%">ยอดคงเหลือ (BALANCE)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
    exportTbody.innerHTML = exportHtml;
}

async function renderTrialBalance() {
    const start = document.getElementById('tb-date-start').value || null;
    const end = document.getElementById('tb-date-end').value || null;
    
    const data = await store.getTrialBalance(start, end);
    const tbody = document.querySelector('#tb-table tbody');
    tbody.innerHTML = '';
    
    let sumDebit = 0;
    let sumCredit = 0;

    data.forEach(acc => {
        // Standard accounting Trial balance lists either net Debit or net Credit balance
        const balance = acc.debit - acc.credit;
        let drVal = 0;
        let crVal = 0;

        if (['asset', 'expense'].includes(acc.category)) {
            // Normal debit balance
            drVal = balance > 0 ? balance : 0;
            crVal = balance < 0 ? Math.abs(balance) : 0;
        } else {
            // Normal credit balance
            crVal = balance < 0 ? Math.abs(balance) : 0;
            drVal = balance > 0 ? balance : 0;
            // Wait, for liability/equity/revenue, normal is Credit balance, so credit = credit - debit
            const normalCrBalance = acc.credit - acc.debit;
            crVal = normalCrBalance > 0 ? normalCrBalance : 0;
            drVal = normalCrBalance < 0 ? Math.abs(normalCrBalance) : 0;
        }

        if (drVal === 0 && crVal === 0) return; // Skip zero balances to make report neat

        if (acc.type !== 'posting') return; // Only show posting accounts

        sumDebit += drVal;
        sumCredit += crVal;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${acc.code}</strong></td>
            <td>${acc.name}</td>
            <td class="num-col text-debit">${drVal > 0 ? formatMoney(drVal) + ' ฿' : '-'}</td>
            <td class="num-col text-credit">${crVal > 0 ? formatMoney(crVal) + ' ฿' : '-'}</td>
        `;
        tbody.appendChild(tr);
    });

    // Totals row
    const trTotal = document.createElement('tr');
    trTotal.className = 'row-total';
    trTotal.innerHTML = `
        <td colspan="2" style="text-align: right;">ยอดรวมสุทธิ (ต้องสมดุลกัน):</td>
        <td class="num-col text-debit">${formatMoney(sumDebit)} ฿</td>
        <td class="num-col text-credit">${formatMoney(sumCredit)} ฿</td>
    `;
    tbody.appendChild(trTotal);
}

async function renderProfitLoss() {
    const start = document.getElementById('pl-date-start').value || null;
    const end = document.getElementById('pl-date-end').value || null;
    const displayMode = document.getElementById('pl-display-mode')?.value || 'sub-accounts';
    
    const data = await store.getProfitAndLoss(start, end);
    const tbody = document.querySelector('#pl-table tbody');
    tbody.innerHTML = '';

    // Helper to format rows
    const formatPLRow = (name, code, amount, isControl) => {
        const isBold = isControl;
        const style = isBold ? 'font-weight: 600;' : '';
        let displayAmt = '';
        if (displayMode === 'control-only' || !isControl) {
            displayAmt = formatMoney(amount) + ' ฿';
        }
        return { style, displayAmt };
    };

    // 1. Revenues Section
    tbody.innerHTML += `<tr><td colspan="3" style="font-weight: 700; background-color: #f8fafc;">1. รายได้ (Revenues)</td></tr>`;
    
    let filteredRevenues = data.revenues;
    if (displayMode === 'control-only') {
        filteredRevenues = data.revenues.filter(r => r.type === 'control');
    }
    
    if (filteredRevenues.length === 0) {
        tbody.innerHTML += `<tr><td class="indent-account-1 text-muted">ไม่พบข้อมูลรายได้</td><td>-</td><td class="num-col">0.00 ฿</td></tr>`;
    } else {
        filteredRevenues.forEach(rev => {
            const isControl = rev.type === 'control';
            const { style, displayAmt } = formatPLRow(rev.name, rev.code, rev.amount, isControl);
            const indentClass = `indent-account-${rev.level || 1}`;
            tbody.innerHTML += `
                <tr style="${style}">
                    <td class="${indentClass}">${rev.name}</td>
                    <td style="text-align: right; color: var(--text-muted);">${rev.code}</td>
                    <td class="num-col">${displayAmt}</td>
                </tr>
            `;
        });
    }
    tbody.innerHTML += `<tr style="font-weight: 600;"><td class="indent-account-1">รวมรายได้ทั้งหมด:</td><td></td><td class="num-col" style="border-top: 1px solid #000;">${formatMoney(data.totalRevenue)} ฿</td></tr>`;

    // 2. Expenses Section
    tbody.innerHTML += `<tr><td colspan="3" style="font-weight: 700; background-color: #f8fafc; padding-top: 18px;">2. ค่าใช้จ่าย (Expenses)</td></tr>`;
    
    let filteredExpenses = data.expenses;
    if (displayMode === 'control-only') {
        filteredExpenses = data.expenses.filter(e => e.type === 'control');
    }
    
    if (filteredExpenses.length === 0) {
        tbody.innerHTML += `<tr><td class="indent-account-1 text-muted">ไม่พบข้อมูลค่าใช้จ่าย</td><td>-</td><td class="num-col">0.00 ฿</td></tr>`;
    } else {
        filteredExpenses.forEach(exp => {
            const isControl = exp.type === 'control';
            const { style, displayAmt } = formatPLRow(exp.name, exp.code, exp.amount, isControl);
            const indentClass = `indent-account-${exp.level || 1}`;
            tbody.innerHTML += `
                <tr style="${style}">
                    <td class="${indentClass}">${exp.name}</td>
                    <td style="text-align: right; color: var(--text-muted);">${exp.code}</td>
                    <td class="num-col">${displayAmt}</td>
                </tr>
            `;
        });
    }
    tbody.innerHTML += `<tr style="font-weight: 600;"><td class="indent-account-1">รวมค่าใช้จ่ายทั้งหมด:</td><td></td><td class="num-col" style="border-top: 1px solid #000;">${formatMoney(data.totalExpense)} ฿</td></tr>`;

    // 3. Net Profit / Loss
    const trNet = document.createElement('tr');
    trNet.className = 'row-total';
    trNet.innerHTML = `
        <td colspan="2">กำไร (ขาดทุน) สุทธิสำหรับงวด:</td>
        <td class="num-col" style="color: ${data.netProfit >= 0 ? 'var(--success-green)' : 'var(--danger-red)'}; font-size:16px;">
            ${formatMoney(data.netProfit)} ฿
        </td>
    `;
    tbody.appendChild(trNet);
}

async function renderBalanceSheet() {
    const end = document.getElementById('bs-date-end').value || null;
    const displayMode = document.getElementById('bs-display-mode')?.value || 'sub-accounts';
    
    // Get all accounts and balances to calculate values ourselves for custom groups
    const trialBalance = await store.getTrialBalance(null, end);
    const pl = await store.getProfitAndLoss(null, end);
    const netProfit = pl.netProfit;
    
    const tbody = document.querySelector('#bs-table tbody');
    tbody.innerHTML = '';

    const mapping = await getBSMapping();

    const isDescendant = (acc, targetCode, allAccounts) => {
        if (!acc || !targetCode) return false;
        if (acc.code === targetCode) return true;
        let current = acc;
        let depth = 0;
        while (current.parentCode && depth < 10) {
            if (current.parentCode === targetCode) {
                return true;
            }
            const parent = allAccounts.find(a => a.code === current.parentCode);
            if (!parent) break;
            current = parent;
            depth++;
        }
        return false;
    };

    const getSum = (mappingKey) => {
        const val = mapping[mappingKey];
        if (!val) return 0;
        
        const codesOrPrefixes = val.split(',').map(s => s.trim()).filter(s => s.length > 0);
        if (codesOrPrefixes.length === 0) return 0;

        let total = 0;
        trialBalance.forEach(acc => {
            if (acc.type === 'posting') {
                // For retainedEarningsAccount: only count equity accounts
                if (mappingKey === 'retainedEarningsAccount' && !['equity'].includes(acc.category)) {
                    return;
                }
                const match = codesOrPrefixes.some(item => {
                    if (acc.code === item || acc.code.startsWith(item)) {
                        return true;
                    }
                    return isDescendant(acc, item, trialBalance);
                });
                
                if (match) {
                    const balance = acc.debit - acc.credit;
                    if (['asset', 'expense'].includes(acc.category)) {
                        total += balance;
                    } else {
                        total += (-balance);
                    }
                }
            }
        });
        // For retained earnings: always include net profit
        if (mappingKey === 'retainedEarningsAccount') {
            total += netProfit;
        }
        return total;
    };

    const getGroupAccounts = (mappingKey) => {
        const val = mapping[mappingKey];
        if (!val) return [];
        
        const codesOrPrefixes = val.split(',').map(s => s.trim()).filter(s => s.length > 0);
        if (codesOrPrefixes.length === 0) return [];

        const matchingAccounts = [];
        // Use first code in retainedEarningsAccount mapping as the retained earnings account
        const reCode = mappingKey === 'retainedEarningsAccount' ? codesOrPrefixes[0] : null;
        let hasReCode = false;

        trialBalance.forEach(acc => {
            if (acc.type === 'posting') {
                // For retainedEarningsAccount: only show equity accounts (not income/expense)
                if (mappingKey === 'retainedEarningsAccount' && !['equity'].includes(acc.category)) {
                    return;
                }
                
                const match = codesOrPrefixes.some(item => {
                    if (acc.code === item || acc.code.startsWith(item)) {
                        return true;
                    }
                    return isDescendant(acc, item, trialBalance);
                });
                
                if (match) {
                    const balance = acc.debit - acc.credit;
                    let amount = balance;
                    if (!['asset', 'expense'].includes(acc.category)) {
                        amount = -balance;
                    }
                    
                    // Add net profit to the first retained earnings account from mapping
                    if (mappingKey === 'retainedEarningsAccount' && reCode && acc.code === reCode) {
                        amount += netProfit;
                        hasReCode = true;
                    }
                    
                    if (amount !== 0) {
                        matchingAccounts.push({
                            code: acc.code,
                            name: acc.name,
                            amount: amount,
                            level: acc.level
                        });
                    }
                }
            }
        });

        // Inject retained earnings account if it has no balance yet but there is net profit
        if (mappingKey === 'retainedEarningsAccount' && !hasReCode && netProfit !== 0 && reCode) {
            // Look up the account name from trial balance
            const reAcc = trialBalance.find(a => a.code === reCode);
            matchingAccounts.push({
                code: reCode,
                name: reAcc ? reAcc.name : 'กำไรสะสม',
                amount: netProfit,
                level: 3
            });
        }

        return matchingAccounts.sort((a, b) => a.code.localeCompare(b.code));
    };

    const formatRow = (name, code, amount, isBold = false, isIndent = 0, hideAmount = false) => {
        const style = isBold ? 'font-weight: 700;' : '';
        const padding = isIndent ? `padding-left: ${isIndent * 16}px;` : '';
        const displayAmt = hideAmount ? '' : (amount !== 0 ? formatMoney(amount) + ' ฿' : '-');
        return `
            <tr style="${style}">
                <td style="${padding}">${name}</td>
                <td style="text-align: right; color: var(--text-muted); font-size: 12px;">${code || ''}</td>
                <td class="num-col" style="text-align: right;">${displayAmt}</td>
            </tr>
        `;
    };

    // Helper to filter and render a section
    const renderSectionFields = (tabId, indent = 2) => {
        let sectionTotal = 0;
        const fields = BS_FIELDS.filter(f => f.tab === tabId);
        fields.forEach(f => {
            const val = getSum(f.key);
            const mappedCode = mapping[f.key] || '';
            // Only render if mapped OR if the balance is non-zero
            if (mappedCode || val !== 0) {
                if (displayMode === 'control-only') {
                    tbody.innerHTML += formatRow(f.labelTh, mappedCode, val, false, indent);
                } else {
                    // Show sub-accounts mode: Group header shows NO amount
                    tbody.innerHTML += formatRow(f.labelTh, mappedCode, 0, true, indent, true);
                    const groupAccounts = getGroupAccounts(f.key);
                    groupAccounts.forEach(ga => {
                        tbody.innerHTML += formatRow(ga.name, ga.code, ga.amount, false, indent + 1);
                    });
                }
                sectionTotal += val;
            }
        });
        return sectionTotal;
    };

    // 1. ASSETS SECTION
    tbody.innerHTML += `<tr><td colspan="3" style="font-weight: 700; background-color: #f8fafc; font-size: 14px;">สินทรัพย์ (Assets)</td></tr>`;
    tbody.innerHTML += formatRow('สินทรัพย์หมุนเวียน', '', 0, true, 1, displayMode === 'sub-accounts');
    const totalCurrentAssets = renderSectionFields('current-assets', 2);
    
    tbody.innerHTML += `
        <tr style="font-weight: 700; background-color: #f8fafc;">
            <td style="padding-left: 16px;">รวมสินทรัพย์หมุนเวียน</td>
            <td></td>
            <td class="num-col" style="border-top: 1px solid #000; text-align: right;">${formatMoney(totalCurrentAssets)} ฿</td>
        </tr>
    `;

    tbody.innerHTML += formatRow('สินทรัพย์ไม่หมุนเวียน', '', 0, true, 1, displayMode === 'sub-accounts');
    const totalNonCurrentAssets = renderSectionFields('non-current-assets', 2);
    
    tbody.innerHTML += `
        <tr style="font-weight: 700; background-color: #f8fafc;">
            <td style="padding-left: 16px;">รวมสินทรัพย์ไม่หมุนเวียน</td>
            <td></td>
            <td class="num-col" style="border-top: 1px solid #000; text-align: right;">${formatMoney(totalNonCurrentAssets)} ฿</td>
        </tr>
    `;

    const totalAssets = totalCurrentAssets + totalNonCurrentAssets;
    tbody.innerHTML += `
        <tr class="row-total" style="background-color: #eff6ff; font-weight: 700;">
            <td>รวมสินทรัพย์</td>
            <td></td>
            <td class="num-col" style="border-top: 1.5px solid #000; border-bottom: 3px double #000; text-align: right;">${formatMoney(totalAssets)} ฿</td>
        </tr>
    `;

    // 2. LIABILITIES SECTION
    tbody.innerHTML += `<tr><td colspan="3" style="font-weight: 700; background-color: #f8fafc; padding-top: 18px; font-size: 14px;">หนี้สินและส่วนของผู้ถือหุ้น (Liabilities and Shareholders' Equity)</td></tr>`;
    tbody.innerHTML += formatRow('หนี้สินหมุนเวียน', '', 0, true, 1, displayMode === 'sub-accounts');
    const totalCurrentLiabilities = renderSectionFields('current-liabilities', 2);
    
    tbody.innerHTML += `
        <tr style="font-weight: 700; background-color: #f8fafc;">
            <td style="padding-left: 16px;">รวมหนี้สินหมุนเวียน</td>
            <td></td>
            <td class="num-col" style="border-top: 1px solid #000; text-align: right;">${formatMoney(totalCurrentLiabilities)} ฿</td>
        </tr>
    `;

    tbody.innerHTML += formatRow('หนี้สินไม่หมุนเวียน', '', 0, true, 1, displayMode === 'sub-accounts');
    const totalNonCurrentLiabilities = renderSectionFields('non-current-liabilities', 2);
    
    tbody.innerHTML += `
        <tr style="font-weight: 700; background-color: #f8fafc;">
            <td style="padding-left: 16px;">รวมหนี้สินไม่หมุนเวียน</td>
            <td></td>
            <td class="num-col" style="border-top: 1px solid #000; text-align: right;">${formatMoney(totalNonCurrentLiabilities)} ฿</td>
        </tr>
    `;

    const totalLiabilities = totalCurrentLiabilities + totalNonCurrentLiabilities;
    tbody.innerHTML += `
        <tr style="font-weight: 700; background-color: #f8fafc;">
            <td>รวมหนี้สิน</td>
            <td></td>
            <td class="num-col" style="border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; text-align: right;">${formatMoney(totalLiabilities)} ฿</td>
        </tr>
    `;

    // 3. SHAREHOLDERS' EQUITY SECTION
    tbody.innerHTML += formatRow('ส่วนของผู้ถือหุ้น', '', 0, true, 1, displayMode === 'sub-accounts');
    tbody.innerHTML += formatRow('ทุนเรือนหุ้น', '', 0, true, 2, displayMode === 'sub-accounts');
    
    // ทุนที่ออกและชำระแล้ว - key: paidUpCapitalAccount
    const paidUpCapital = getSum('paidUpCapitalAccount');
    const mappedPaidUpCode = mapping['paidUpCapitalAccount'] || '';
    if (displayMode === 'control-only') {
        tbody.innerHTML += formatRow('ทุนที่ออกและชำระแล้ว', mappedPaidUpCode, paidUpCapital, false, 3);
    } else {
        tbody.innerHTML += formatRow('ทุนที่ออกและชำระแล้ว', mappedPaidUpCode, 0, true, 3, true);
        const paids = getGroupAccounts('paidUpCapitalAccount');
        paids.forEach(p => {
            tbody.innerHTML += formatRow(p.name, p.code, p.amount, false, 4);
        });
    }

    // กำไร(ขาดทุน) สะสม - key: retainedEarningsAccount
    const retainedEarnings = getSum('retainedEarningsAccount'); // netProfit already included in getSum
    const mappedRetainedCode = mapping['retainedEarningsAccount'] || '';
    if (displayMode === 'control-only') {
        tbody.innerHTML += formatRow('กำไร(ขาดทุน) สะสม', mappedRetainedCode, retainedEarnings, false, 2);
    } else {
        tbody.innerHTML += formatRow('กำไร(ขาดทุน) สะสม', mappedRetainedCode, 0, true, 2, true);
        const retains = getGroupAccounts('retainedEarningsAccount');
        retains.forEach(r => {
            tbody.innerHTML += formatRow(r.name, r.code, r.amount, false, 3);
        });
    }
    
    // บัญชีพัก (ยังไม่ปรับดุล) - key: suspenseAccount
    const suspenseAccount = getSum('suspenseAccount');
    const mappedSuspenseCode = mapping['suspenseAccount'] || '';
    if (suspenseAccount !== 0 || mappedSuspenseCode) {
        if (displayMode === 'control-only') {
            tbody.innerHTML += formatRow('บัญชีพัก (ยังไม่ปรับดุล)', mappedSuspenseCode, suspenseAccount, false, 2);
        } else {
            tbody.innerHTML += formatRow('บัญชีพัก (ยังไม่ปรับดุล)', mappedSuspenseCode, 0, true, 2, true);
            const suspenses = getGroupAccounts('suspenseAccount');
            suspenses.forEach(s => {
                tbody.innerHTML += formatRow(s.name, s.code, s.amount, false, 3);
            });
        }
    }

    const totalEquity = paidUpCapital + retainedEarnings + suspenseAccount;
    const equityAndLiabilities = totalLiabilities + totalEquity;

    tbody.innerHTML += `
        <tr style="font-weight: 700; background-color: #f8fafc;">
            <td style="padding-left: 16px;">รวมส่วนของผู้ถือหุ้น</td>
            <td></td>
            <td class="num-col" style="border-top: 1px solid #000; text-align: right;">${formatMoney(totalEquity)} ฿</td>
        </tr>
    `;

    tbody.innerHTML += `
        <tr class="row-total" style="background-color: #fff7ed; font-weight: 700;">
            <td>รวมหนี้สินและส่วนของผู้ถือหุ้น</td>
            <td></td>
            <td class="num-col" style="border-top: 1.5px solid #000; border-bottom: 3px double #000; text-align: right;">${formatMoney(equityAndLiabilities)} ฿</td>
        </tr>
    `;

    // Balance verification banner
    const checkValue = totalAssets - equityAndLiabilities;
    const isBalanced = Math.abs(checkValue) < 0.01;
    tbody.innerHTML += `
        <tr>
            <td colspan="3" style="text-align: right; font-weight: 700; padding: 12px; font-size:12px;">
                สมการบัญชี (ดุลสมการ): 
                ${isBalanced 
                    ? `<span style="color:var(--success-green);"><i class="fa-solid fa-check-double"></i> ดุลบัญชีสมดุลสมบูรณ์</span>` 
                    : `<span style="color:var(--danger-red);"><i class="fa-solid fa-warning"></i> บัญชีไม่สมดุลต่างกัน: ${formatMoney(checkValue)} ฿</span>`}
            </td>
        </tr>
    `;
}

// =========================================================================
// 8. INVOICES & BILLS VIEW (AR/AP)
// =========================================================================
let currentInvoiceTab = 'invoice'; // invoice or bill

let currentExpEditCode = ''; // Keeps track of which template is being edited

async function renderExpenseCatalog() {
    const templates = await db.getAll('expenseCatalog');
    const tbody = document.querySelector('#expense-catalog-table tbody');
    tbody.innerHTML = '';
    
    if (templates.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">ไม่มีข้อมูลรหัสค่าใช้จ่ายในระบบ</td></tr>`;
    } else {
        templates.sort((a,b) => a.code.localeCompare(b.code)).forEach(template => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${template.code}</strong></td>
                <td>${template.name} ${template.remarks ? `<br><small style="color:var(--text-muted);">${template.remarks}</small>` : ''}</td>
                <td><span class="status-badge sent" style="font-family:monospace;">${template.accountCode}</span></td>
                <td class="num-col">${formatMoney(template.amount)} ฿</td>
                <td style="text-align:center;">
                    <div style="display:flex; gap:6px; justify-content:center;">
                        <button class="btn btn-secondary btn-sm edit-exp-btn" data-code="${template.code}"><i class="fa-solid fa-pencil"></i></button>
                        <button class="btn btn-danger btn-sm delete-exp-btn" data-code="${template.code}"><i class="fa-solid fa-trash-alt"></i></button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Bind clicks for edit
        document.querySelectorAll('.edit-exp-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const code = btn.getAttribute('data-code');
                const t = templates.find(item => item.code === code);
                if (t) {
                    currentExpEditCode = code;
                    document.getElementById('exp-code').value = t.code;
                    document.getElementById('exp-code').disabled = true; // Disable PK code
                    document.getElementById('exp-name').value = t.name;
                    document.getElementById('exp-name-en').value = t.nameEn || '';
                    document.getElementById('exp-category').value = t.category || '01';
                    document.getElementById('exp-unit').value = t.unit || 'ครั้ง';
                    document.getElementById('exp-vat-type').value = t.vatType || 'none';
                    document.getElementById('exp-amount').value = t.amount || 0.00;
                    document.getElementById('exp-remarks').value = t.remarks || '';
                    document.getElementById('exp-account').value = t.accountCode || '';
                    
                    document.getElementById('exp-catalog-form-title').innerHTML = `<i class="fa-solid fa-pencil"></i> แก้ไขรหัสค่าใช้จ่าย: ${code}`;
                    document.getElementById('btn-exp-save').innerText = 'บันทึกการแก้ไข';
                }
            });
        });

        // Bind clicks for delete
        document.querySelectorAll('.delete-exp-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const code = btn.getAttribute('data-code');
                if (confirm(`คุณต้องการลบรหัสค่าใช้จ่าย "${code}" ออกจากระบบใช่หรือไม่?`)) {
                    await db.deleteItem('expenseCatalog', code);
                    showToast('ลบรหัสค่าใช้จ่ายเรียบร้อยแล้ว');
                    _expenseCatalog = []; // clear cache
                    await renderExpenseCatalog();
                    
                    // Trigger refresh of bill creator options
                    const allInvoices = await db.getAll('invoices');
                    const allBills = await db.getAll('bills');
                    renderInvoicesList(allInvoices);
                    renderBillsList(allBills);
                    
                    // Reload dropdowns
                    const latestTemplates = await db.getAll('expenseCatalog');
                    const billExpenseAccountSelect = document.getElementById('bill-expense-account');
                    if (billExpenseAccountSelect) {
                        if (window.jQuery && window.jQuery(billExpenseAccountSelect).hasClass('select2-hidden-accessible')) {
                            window.jQuery(billExpenseAccountSelect).select2('destroy');
                        }
                        billExpenseAccountSelect.innerHTML = latestTemplates.map(t => `<option value="${t.code}">${t.code} - ${t.name} (${t.accountCode})</option>`).join('');
                        if (window.jQuery) {
                            window.jQuery(billExpenseAccountSelect).select2({ width: '100%', dropdownAutoWidth: true });
                        }
                    }
                }
            });
        });
    }

    // Populate Account select in the catalog form (only posting accounts)
    const accounts = await store.getAccounts();
    const expAccountSelect = document.getElementById('exp-account');
    if (window.jQuery && window.jQuery(expAccountSelect).hasClass('select2-hidden-accessible')) {
        window.jQuery(expAccountSelect).select2('destroy');
    }
    expAccountSelect.innerHTML = '<option value="">-- เลือกบัญชีเดบิต --</option>';
    accounts.filter(a => a.type !== 'control').forEach(acc => {
        const opt = document.createElement('option');
        opt.value = acc.code;
        opt.text = `${acc.code} - ${acc.name}`;
        expAccountSelect.appendChild(opt);
    });
    if (window.jQuery) {
        window.jQuery(expAccountSelect).select2({ width: '100%', dropdownAutoWidth: true });
    }
    
    // Set default value if none is selected
    if (currentExpEditCode) {
        const t = templates.find(item => item.code === currentExpEditCode);
        if (t) expAccountSelect.value = t.accountCode || '';
    }
}

function clearExpenseCatalogForm() {
    currentExpEditCode = '';
    document.getElementById('expense-catalog-form').reset();
    document.getElementById('exp-code').disabled = false;
    document.getElementById('exp-catalog-form-title').innerHTML = `<i class="fa-solid fa-plus-circle"></i> รายละเอียดค่าใช้จ่าย`;
    document.getElementById('btn-exp-save').innerText = 'บันทึกแม่แบบ';
}

async function renderInvoicesView() {
    const invoices = await db.getAll('invoices');
    const bills = await db.getAll('bills');
    
    // Fill Date defaults
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('inv-date').value = today;
    document.getElementById('inv-due-date').value = today;
    const billDateEl = document.getElementById('bill-date');
    if (billDateEl) {
        billDateEl.value = today;
        // Listen to changes on bill-date to update payment dates
        billDateEl.addEventListener('change', async (e) => {
            const newDate = e.target.value;
            document.querySelectorAll('.bill-payment-date').forEach(el => {
                el.value = newDate;
            });
            if (!editingBillId && typeof window.generateBillId === 'function') {
                const newId = await window.generateBillId(newDate);
                const docNoEl = document.getElementById('bill-doc-no');
                if (docNoEl) docNoEl.value = newId;
            }
        });
    }

    // Load dropdowns for customers/suppliers
    await loadContactsDropdowns();

    // Load dynamic templates for bill expense accounts
    const templates = await db.getAll('expenseCatalog');
    const billExpenseAccountSelect = document.getElementById('bill-expense-account');
    if (billExpenseAccountSelect) {
        billExpenseAccountSelect.innerHTML = templates.map(t => `<option value="${t.code}">${t.code} - ${t.name} (${t.accountCode})</option>`).join('');
    }

    // Load dropdown for bill payment accounts
    const billPaymentAccountSelect = document.getElementById('bill-payment-account');
    if (billPaymentAccountSelect) {
        try {
            const allAccounts = await db.getAll('accounts');
            const assetAccounts = allAccounts.filter(a => a.type === 'posting' && a.category === 'asset');
            let accountsToShow = assetAccounts;
            if (accountsToShow.length === 0) {
                // Fallback: all posting accounts
                accountsToShow = allAccounts.filter(a => a.type === 'posting');
            }
            if (accountsToShow.length > 0) {
                const mappings = await store.getAccountMappings();
                const defaultCash = mappings?.cash || '1111-00';
                billPaymentAccountSelect.innerHTML = accountsToShow
                    .map(a => `<option value="${a.code}">${a.code} - ${a.name}</option>`)
                    .join('');
                // Try to set the default
                if (billPaymentAccountSelect.querySelector(`option[value="${defaultCash}"]`)) {
                    billPaymentAccountSelect.value = defaultCash;
                }
            }
        } catch (err) {
            console.error('Error loading payment accounts:', err);
        }
    }
    // Initialize invoice dynamic tables if they are empty
    const invItemsTbody = document.getElementById('invoice-items-tbody');
    if (invItemsTbody && invItemsTbody.querySelectorAll('.invoice-item-row').length === 0) {
        addInvoiceItemRow();
    }
    const invPaymentsTbody = document.getElementById('invoice-payments-tbody');
    if (invPaymentsTbody && invPaymentsTbody.querySelectorAll('.invoice-payment-row').length === 0) {
        await addInvoicePaymentRow();
    }
    recalculateInvoice();

    // Initialize bill dynamic tables if they are empty
    const billItemsTbody = document.getElementById('bill-items-tbody');
    if (billItemsTbody && billItemsTbody.querySelectorAll('.bill-item-row').length === 0) {
        if (templates.length > 0) {
            addBillItemRow(templates[0].code, 1, templates[0].amount || 0);
            const vatRateSelect = document.getElementById('bill-vat-rate');
            if (vatRateSelect) vatRateSelect.value = templates[0].vatType || 'none';
        } else {
            addBillItemRow();
        }
    }
    const billPaymentsTbody = document.getElementById('bill-payments-tbody');
    if (billPaymentsTbody && billPaymentsTbody.querySelectorAll('.bill-payment-row').length === 0) {
        await addBillPaymentRow();
    }
    recalculateBill();

    // Reset lists
    renderInvoicesList(invoices);
    renderBillsList(bills);
}

function renderInvoicesList(invoices) {
    const tbody = document.querySelector('#invoices-list-table tbody');
    tbody.innerHTML = '';
    
    if (invoices.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color:var(--text-muted);">ไม่มีประวัติใบแจ้งหนี้</td></tr>`;
        return;
    }

    invoices.sort((a,b) => b.date.localeCompare(a.date)).forEach(inv => {
        const tr = document.createElement('tr');
        const displayTotal = inv.grandTotal || inv.total || 0;
        const outstanding = inv.outstanding !== undefined ? inv.outstanding : Math.max(0, displayTotal - (inv.amountPaid || 0));
        tr.innerHTML = `
            <td><strong>${inv.id}</strong></td>
            <td>${inv.customerName}</td>
            <td class="num-col" style="font-size: 13px;">
                <strong>${formatMoney(displayTotal)} ฿</strong><br>
                <small style="color:var(--text-muted)">รับแล้ว: ${formatMoney(inv.amountPaid || 0)} ฿</small><br>
                <small style="color:${inv.status === 'paid' ? 'var(--text-muted)' : 'var(--danger-color)'}; font-weight: 600;">ค้างรับ: ${formatMoney(outstanding)} ฿</small>
            </td>
            <td>
                <span class="status-badge ${inv.status === 'paid' ? 'paid' : 'unpaid'}">
                    ${inv.status === 'paid' ? 'ชำระแล้ว' : 'ค้างชำระ'}
                </span>
            </td>
            <td>
                <button class="btn btn-secondary btn-sm print-inv-btn" data-id="${inv.id}"><i class="fa-solid fa-print"></i> พิมพ์</button>
                ${(inv.amountPaid || 0) === 0 ? `<button class="btn btn-primary btn-sm edit-inv-btn" data-id="${inv.id}" style="padding: 4px 8px; margin-right: 4px;"><i class="fa-solid fa-pencil"></i> แก้ไข</button>` : ''}
                <button class="btn btn-danger btn-sm delete-inv-btn" data-id="${inv.id}" style="padding: 4px 8px;"><i class="fa-solid fa-trash-alt"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Bind Invoices buttons
    document.querySelectorAll('.print-inv-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            showInvoicePrintPreview(id);
        });
    });

    document.querySelectorAll('.edit-inv-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            startEditInvoice(id);
        });
    });

    document.querySelectorAll('.delete-inv-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            if (confirm(`ต้องการลบใบแจ้งหนี้ ${id}? การลงบัญชีอัตโนมัติจะถูกยกเลิกด้วย`)) {
                const inv = await db.getByKey('invoices', id);
                if (inv && inv.journalId) {
                    await db.deleteItem('journalEntries', inv.journalId);
                }
                await db.deleteItem('invoices', id);
                await db.deleteItem('inventoryTransactions', id);
                showToast('ลบใบแจ้งหนี้เรียบร้อยแล้ว');
                await renderInvoicesView();
            }
        });
    });
}

function renderBillsList(bills) {
    const tbody = document.querySelector('#bills-list-table tbody');
    tbody.innerHTML = '';
    
    if (bills.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color:var(--text-muted);">ไม่มีประวัติบิลรายจ่าย</td></tr>`;
        return;
    }

    bills.sort((a,b) => b.date.localeCompare(a.date)).forEach(bill => {
        const tr = document.createElement('tr');
        const displayAmount = bill.totalAmount || bill.total || 0;
        const displayVendor = bill.vendorName || bill.vendor_name || '-';
        // Format date as DD/MM/YY
        const formatThDate = (d) => {
            if (!d) return '-';
            const parts = d.split('-');
            if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0].substring(2)}`;
            return d;
        };
        const displayDate = formatThDate(bill.paymentDate || bill.date);
        const outstanding = bill.outstanding !== undefined ? bill.outstanding : Math.max(0, displayAmount - (bill.amountPaid || 0));
        tr.innerHTML = `
            <td><strong>${bill.id}</strong><br><small style="color:var(--text-muted)">${displayDate}</small></td>
            <td>${displayVendor}</td>
            <td class="num-col" style="font-size: 13px;">
                <strong>${formatMoney(displayAmount)} ฿</strong><br>
                <small style="color:var(--text-muted)">จ่ายแล้ว: ${formatMoney(bill.amountPaid || 0)} ฿</small><br>
                <small style="color:${bill.status === 'paid' ? 'var(--text-muted)' : 'var(--danger-color)'}; font-weight: 600;">ค้างจ่าย: ${formatMoney(outstanding)} ฿</small>
            </td>
            <td>
                <span class="status-badge ${bill.status === 'paid' ? 'paid' : 'unpaid'}">
                    ${bill.status === 'paid' ? 'จ่ายแล้ว' : 'ค้างจ่าย'}
                </span>
            </td>
            <td>
                <button class="btn btn-secondary btn-sm print-bill-btn" data-id="${bill.id}" style="padding: 4px 8px; margin-right: 4px;"><i class="fa-solid fa-print"></i> พิมพ์</button>
                <button class="btn btn-primary btn-sm edit-bill-btn" data-id="${bill.id}" style="padding: 4px 8px; margin-right: 4px;"><i class="fa-solid fa-pencil"></i> แก้ไข</button>
                <button class="btn btn-danger btn-sm delete-bill-btn" data-id="${bill.id}" style="padding: 4px 8px;"><i class="fa-solid fa-trash-alt"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Bind Bills buttons
    document.querySelectorAll('.print-bill-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            showDocumentPrintPreview('bill', id);
        });
    });

    document.querySelectorAll('.edit-bill-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            startEditBill(id);
        });
    });

    document.querySelectorAll('.delete-bill-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            if (confirm(`ต้องการลบบิลรายจ่าย ${id}? การลงบัญชีอัตโนมัติจะถูกยกเลิกด้วย`)) {
                const bill = await db.getByKey('bills', id);
                if (bill && bill.journalId) {
                    await db.deleteItem('journalEntries', bill.journalId);
                }
                await db.deleteItem('bills', id);
                await db.deleteItem('inventoryTransactions', id);
                showToast('ลบบิลเรียบร้อยแล้ว');
                await renderInvoicesView();
            }
        });
    });
}

// Invoices & Bills Calculation Engines
function recalculateInvoice() {
    let subtotal = 0;
    let vat = 0;
    let wht = 0;
    
    const itemRows = document.querySelectorAll('#invoice-items-tbody .invoice-item-row');
    itemRows.forEach(row => {
        const qty = parseFloat(row.querySelector('.invoice-item-qty')?.value) || 0;
        const price = parseFloat(row.querySelector('.invoice-item-price')?.value) || 0;
        const amt = qty * price;
        const amtCell = row.querySelector('.invoice-item-amount');
        if (amtCell) amtCell.innerText = formatMoney(amt) + ' ฿';
        subtotal += amt;
        
        // VAT calculation for this row
        const hasVat = row.querySelector('.invoice-item-vat')?.checked;
        let rowVat = 0;
        if (hasVat) {
            rowVat = Math.round(amt * 0.07 * 100) / 100;
            vat += rowVat;
        }
        
        // WHT calculation for this row
        const whtRateVal = row.querySelector('.invoice-item-wht')?.value || 'none';
        let rowWht = 0;
        if (whtRateVal !== 'none') {
            const rate = parseFloat(whtRateVal) || 0;
            rowWht = Math.round(amt * (rate / 100) * 100) / 100;
            wht += rowWht;
        }

        // Net calculation for this row
        const rowNet = amt + rowVat - rowWht;
        const netCell = row.querySelector('.invoice-item-net');
        if (netCell) netCell.innerText = formatMoney(rowNet) + ' ฿';
    });

    // Round overall values to prevent float errors
    vat = Math.round(vat * 100) / 100;
    wht = Math.round(wht * 100) / 100;

    // Set hidden overall values for backend compatibility
    const firstVatRow = Array.from(itemRows).find(row => row.querySelector('.invoice-item-vat')?.checked);
    const vatRateSelectEl = document.getElementById('inv-vat-rate');
    if (vatRateSelectEl) {
        vatRateSelectEl.value = firstVatRow ? '7' : 'none';
    }
    
    const firstWhtRow = Array.from(itemRows).find(row => {
        const val = row.querySelector('.invoice-item-wht')?.value;
        return val && val !== 'none';
    });
    const whtRateSelectEl = document.getElementById('inv-wht-rate');
    if (whtRateSelectEl) {
        whtRateSelectEl.value = firstWhtRow ? firstWhtRow.querySelector('.invoice-item-wht').value : 'none';
        const typeRow = document.getElementById('inv-summary-wht-type-row');
        if (typeRow) {
            typeRow.style.display = whtRateSelectEl.value === 'none' ? 'none' : 'flex';
        }
    }

    const grand = subtotal + vat - wht;

    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
    setEl('inv-summary-subtotal', formatMoney(subtotal) + ' บาท');
    setEl('inv-summary-vat', formatMoney(vat) + ' บาท');
    setEl('inv-summary-wht', formatMoney(wht) + ' บาท');
    setEl('inv-summary-grand', formatMoney(grand) + ' บาท');

    // Sum payment rows
    let totalPaid = 0;
    document.querySelectorAll('#invoice-payments-tbody .invoice-payment-row').forEach(row => {
        totalPaid += parseFloat(row.querySelector('.invoice-payment-amount')?.value) || 0;
    });
    const outstanding = Math.max(0, grand - totalPaid);
    setEl('inv-total-paid-display', formatMoney(totalPaid) + ' ฿');
    setEl('inv-outstanding-display', formatMoney(outstanding) + ' ฿');
}

async function addInvoiceItemRow(desc = '', qty = 1, price = 0, hasVat = false, whtRate = 'none') {
    const tbody = document.getElementById('invoice-items-tbody');
    if (!tbody) return;
    
    await getProductCatalog();
    updateProductDatalist();

    // Calculate initial row values
    const amt = qty * price;
    const rowVat = hasVat ? Math.round(amt * 0.07 * 100) / 100 : 0;
    const rateNum = whtRate !== 'none' ? parseFloat(whtRate) : 0;
    const rowWht = rateNum > 0 ? Math.round(amt * (rateNum / 100) * 100) / 100 : 0;
    const rowNet = amt + rowVat - rowWht;

    const tr = document.createElement('tr');
    tr.className = 'invoice-item-row';
    tr.innerHTML = `
        <td><input type="text" list="invoice-product-datalist" class="form-control invoice-item-desc" placeholder="รหัส หรือ คำอธิบายสินค้า/บริการ" value="${desc}" required></td>
        <td><input type="number" class="form-control num-col invoice-item-qty" value="${qty}" min="0" step="any" style="text-align: right;"></td>
        <td><input type="number" class="form-control num-col invoice-item-price" value="${price}" min="0" step="0.01" style="text-align: right;"></td>
        <td style="text-align: center; vertical-align: middle;">
            <input type="checkbox" class="invoice-item-vat" ${hasVat ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
        </td>
        <td>
            <select class="form-control invoice-item-wht" style="padding: 2px 4px; height: auto; font-size: 13px;">
                <option value="none" ${whtRate === 'none' ? 'selected' : ''}>ไม่มี</option>
                <option value="1" ${whtRate === '1' ? 'selected' : ''}>หัก 1%</option>
                <option value="3" ${whtRate === '3' ? 'selected' : ''}>หัก 3%</option>
                <option value="5" ${whtRate === '5' ? 'selected' : ''}>หัก 5%</option>
            </select>
        </td>
        <td class="num-col invoice-item-amount" style="font-weight:600; text-align: right;">${formatMoney(amt)} ฿</td>
        <td class="num-col invoice-item-net" style="font-weight:600; text-align: right;">${formatMoney(rowNet)} ฿</td>
        <td style="text-align:center;"><button type="button" class="btn btn-danger btn-sm remove-invoice-item-btn" style="padding:2px 8px;">×</button></td>
    `;
    tbody.appendChild(tr);
    
    // attach listeners
    const descInput = tr.querySelector('.invoice-item-desc');
    const qtyInput = tr.querySelector('.invoice-item-qty');
    const priceInput = tr.querySelector('.invoice-item-price');
    const vatInput = tr.querySelector('.invoice-item-vat');
    const whtSelect = tr.querySelector('.invoice-item-wht');
    
    descInput.addEventListener('change', (e) => {
        const val = e.target.value;
        const matchedProduct = _productCatalog.find(p => p.code === val || (p.code + ' - ' + p.name) === val || p.name === val);
        if (matchedProduct) {
            priceInput.value = matchedProduct.standard_price || 0;
            updateRow();
        }
    });

    const updateRow = () => {
        const q = parseFloat(qtyInput.value) || 0;
        const p = parseFloat(priceInput.value) || 0;
        tr.querySelector('.invoice-item-amount').innerText = formatMoney(q * p) + ' ฿';
        recalculateInvoice();
    };
    qtyInput.addEventListener('input', updateRow);
    priceInput.addEventListener('input', updateRow);
    vatInput.addEventListener('change', recalculateInvoice);
    whtSelect.addEventListener('change', recalculateInvoice);
    
    tr.querySelector('.remove-invoice-item-btn').addEventListener('click', () => {
        if (tbody.querySelectorAll('.invoice-item-row').length > 1) {
            tr.remove();
            recalculateInvoice();
        }
    });
}
async function addInvoicePaymentRow(date = '', accountCode = '', amount = 0, reference = '') {
    const tbody = document.getElementById('invoice-payments-tbody');
    if (!tbody) return;
    const accounts = await getBillAssetAccounts();
    const today = new Date().toISOString().split('T')[0];
    const tr = document.createElement('tr');
    tr.className = 'invoice-payment-row';
    tr.innerHTML = `
        <td><input type="date" class="form-control invoice-payment-date" value="${date || today}"></td>
        <td><select class="form-control invoice-payment-account">${buildAccountOptions(accounts, accountCode)}</select></td>
        <td><input type="number" class="form-control num-col invoice-payment-amount" value="${amount}" min="0" step="0.01" placeholder="0.00"></td>
        <td><input type="text" class="form-control invoice-payment-ref" value="${reference}" placeholder="เลขที่อ้างอิง"></td>
        <td style="text-align:center;"><button type="button" class="btn btn-danger btn-sm remove-invoice-payment-btn" style="padding:2px 8px;">×</button></td>
    `;
    tbody.appendChild(tr);
    tr.querySelector('.invoice-payment-amount').addEventListener('input', recalculateInvoice);
    tr.querySelector('.remove-invoice-payment-btn').addEventListener('click', () => {
        tr.remove();
        recalculateInvoice();
    });
}

// ─── Bill Item & Payment helpers ────────────────────────────────
let _billAssetAccounts = []; // cache for payment account dropdowns

async function getBillAssetAccounts() {
    if (_billAssetAccounts.length > 0) return _billAssetAccounts;
    try {
        const allAccounts = await db.getAll('accounts');
        _billAssetAccounts = allAccounts.filter(a => a.type === 'posting' && a.category === 'asset');
        if (_billAssetAccounts.length === 0) {
            _billAssetAccounts = allAccounts.filter(a => a.type === 'posting');
        }
    } catch(e) { _billAssetAccounts = []; }
    return _billAssetAccounts;
}

function buildAccountOptions(accounts, selectedCode) {
    return accounts.map(a => `<option value="${a.code}" ${a.code === selectedCode ? 'selected' : ''}>${a.code} - ${a.name}</option>`).join('');
}

let _expenseCatalog = []; // cache for expense catalog items


// ==========================================
// Product Catalog & Datalist Helpers
// ==========================================
let _productCatalog = [];
async function getProductCatalog() {
    if (_productCatalog.length > 0) return _productCatalog;
    try {
        _productCatalog = await db.getAll('products');
    } catch(e) {
        _productCatalog = [];
    }
    return _productCatalog;
}

function updateProductDatalist() {
    let datalist = document.getElementById('invoice-product-datalist');
    if (!datalist) {
        datalist = document.createElement('datalist');
        datalist.id = 'invoice-product-datalist';
        document.body.appendChild(datalist);
    }
    let html = '';
    _productCatalog.forEach(p => {
        html += `<option value="${p.code} - ${p.name}">`;
    });
    datalist.innerHTML = html;
}

async function getExpenseCatalog() {
    if (_expenseCatalog.length > 0) return _expenseCatalog;
    try {
        _expenseCatalog = await db.getAll('expenseCatalog');
    } catch(e) {
        _expenseCatalog = [];
    }
    return _expenseCatalog;
}

async function addBillItemRow(expenseCode = '', qty = 1, price = 0, hasVat = false, whtRate = 'none') {
    const btn = document.getElementById('add-bill-item-btn');
    if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังโหลด...';
    
    const tbody = document.getElementById('bill-items-tbody');
    if (!tbody) {
        if (btn) btn.innerHTML = '<i class="fa-solid fa-plus"></i> เพิ่มรายการ';
        return;
    }
    
    let templates = [];
    try {
        templates = await getExpenseCatalog();
    } finally {
        if (btn) btn.innerHTML = '<i class="fa-solid fa-plus"></i> เพิ่มรายการ';
    }
    
    // Calculate initial row values
    const amt = qty * price;
    const rowVat = hasVat ? Math.round(amt * 0.07 * 100) / 100 : 0;
    const rateNum = whtRate !== 'none' ? parseFloat(whtRate) : 0;
    const rowWht = rateNum > 0 ? Math.round(amt * (rateNum / 100) * 100) / 100 : 0;
    const rowNet = amt + rowVat - rowWht;

    const tr = document.createElement('tr');
    tr.className = 'bill-item-row';
    
    // Build select options
    let selectHtml = `<select class="form-control bill-item-code" style="width:100%;">`;
    selectHtml += `<option value="">-- เลือกรหัสค่าใช้จ่าย --</option>`;
    templates.forEach(t => {
        selectHtml += `<option value="${t.code}" ${t.code === expenseCode ? 'selected' : ''}>${t.code}</option>`;
    });
    selectHtml += `</select>`;

    tr.innerHTML = `
        <td>${selectHtml}</td>
        <td><input type="text" class="form-control bill-item-desc" placeholder="รายละเอียด..." style="width:100%; min-width: 120px;"></td>
        <td><input type="number" class="form-control num-col bill-item-qty" value="${qty}" min="0" step="any" style="text-align: right; width:100%; min-width: 80px;"></td>
        <td><input type="number" class="form-control num-col bill-item-price" value="${price}" min="0" step="0.01" style="text-align: right; width:100%; min-width: 100px;"></td>
        <td style="text-align: center; vertical-align: middle;">
            <input type="checkbox" class="bill-item-vat" ${hasVat ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
        </td>
        <td>
            <select class="form-control bill-item-wht" style="padding: 2px 4px; height: auto; font-size: 13px;">
                <option value="none" ${whtRate === 'none' ? 'selected' : ''}>ไม่มี</option>
                <option value="1" ${whtRate === '1' ? 'selected' : ''}>หัก 1%</option>
                <option value="3" ${whtRate === '3' ? 'selected' : ''}>หัก 3%</option>
                <option value="5" ${whtRate === '5' ? 'selected' : ''}>หัก 5%</option>
            </select>
        </td>
        <td class="num-col bill-item-amount" style="font-weight:600; text-align: right;">${formatMoney(amt)} ฿</td>
        <td class="num-col bill-item-net" style="font-weight:600; text-align: right;">${formatMoney(rowNet)} ฿</td>
        <td style="text-align:center;"><button type="button" class="btn btn-danger btn-sm remove-bill-item-btn" style="padding:2px 8px;">×</button></td>
    `;
    tbody.appendChild(tr);
    
    // attach listeners
    const codeSelect = tr.querySelector('.bill-item-code');
    const descInput = tr.querySelector('.bill-item-desc');
    const qtyInput = tr.querySelector('.bill-item-qty');
    const priceInput = tr.querySelector('.bill-item-price');
    const vatInput = tr.querySelector('.bill-item-vat');
    const whtSelect = tr.querySelector('.bill-item-wht');
    
    codeSelect.addEventListener('change', (e) => {
        const selectedCode = e.target.value;
        const catalogItem = templates.find(t => t.code === selectedCode);
        if (catalogItem) {
            if (catalogItem.name) {
                descInput.value = catalogItem.name;
            }
            if (catalogItem.amount) {
                priceInput.value = catalogItem.amount;
            }
            if (vatInput) {
                vatInput.checked = (catalogItem.vatType === '7');
            }
        }
        updateRow();
    });
    
    const updateRow = () => {
        const q = parseFloat(qtyInput.value) || 0;
        const p = parseFloat(priceInput.value) || 0;
        tr.querySelector('.bill-item-amount').innerText = formatMoney(q * p) + ' ฿';
        recalculateBill();
    };
    qtyInput.addEventListener('input', updateRow);
    priceInput.addEventListener('input', updateRow);
    vatInput.addEventListener('change', recalculateBill);
    whtSelect.addEventListener('change', recalculateBill);
    
    tr.querySelector('.remove-bill-item-btn').addEventListener('click', () => {
        tr.remove();
        if (tbody.querySelectorAll('.bill-item-row').length === 0) {
            addBillItemRow(); // Add an empty row if the last one was deleted
        }
        recalculateBill();
    });
}

async function addBillPaymentRow(date = '', accountCode = '', amount = 0, reference = '') {
    const tbody = document.getElementById('bill-payments-tbody');
    if (!tbody) return;
    const accounts = await getBillAssetAccounts();
    const billDate = document.getElementById('bill-date')?.value || new Date().toISOString().split('T')[0];
    const tr = document.createElement('tr');
    tr.className = 'bill-payment-row';
    tr.innerHTML = `
        <td><input type="date" class="form-control bill-payment-date" value="${date || billDate}"></td>
        <td><select class="form-control bill-payment-account">${buildAccountOptions(accounts, accountCode)}</select></td>
        <td><input type="number" class="form-control num-col bill-payment-amount" value="${amount}" min="0" step="0.01" placeholder="0.00"></td>
        <td><input type="text" class="form-control bill-payment-ref" value="${reference}" placeholder="เลขที่อ้างอิง"></td>
        <td style="text-align:center;"><button type="button" class="btn btn-danger btn-sm remove-bill-payment-btn" style="padding:2px 8px;">×</button></td>
    `;
    tbody.appendChild(tr);
    tr.querySelector('.bill-payment-amount').addEventListener('input', recalculateBill);
    tr.querySelector('.remove-bill-payment-btn').addEventListener('click', () => {
        tr.remove();
        recalculateBill();
    });
}

function recalculateBill() {
    let subtotal = 0;
    let vat = 0;
    let wht = 0;
    
    const itemRows = document.querySelectorAll('#bill-items-tbody .bill-item-row');
    itemRows.forEach(row => {
        const qty = parseFloat(row.querySelector('.bill-item-qty')?.value) || 0;
        const price = parseFloat(row.querySelector('.bill-item-price')?.value) || 0;
        const amt = qty * price;
        const amtCell = row.querySelector('.bill-item-amount');
        if (amtCell) amtCell.innerText = formatMoney(amt) + ' ฿';
        subtotal += amt;
        
        // VAT calculation for this row
        const hasVat = row.querySelector('.bill-item-vat')?.checked;
        let rowVat = 0;
        if (hasVat) {
            rowVat = Math.round(amt * 0.07 * 100) / 100;
            vat += rowVat;
        }
        
        // WHT calculation for this row
        const whtRateVal = row.querySelector('.bill-item-wht')?.value || 'none';
        let rowWht = 0;
        if (whtRateVal !== 'none') {
            const rate = parseFloat(whtRateVal) || 0;
            rowWht = Math.round(amt * (rate / 100) * 100) / 100;
            wht += rowWht;
        }

        // Net calculation for this row
        const rowNet = amt + rowVat - rowWht;
        const netCell = row.querySelector('.bill-item-net');
        if (netCell) netCell.innerText = formatMoney(rowNet) + ' ฿';
    });

    // Round overall values to prevent float errors
    vat = Math.round(vat * 100) / 100;
    wht = Math.round(wht * 100) / 100;

    // Set hidden overall values for backend compatibility
    const firstVatRow = Array.from(itemRows).find(row => row.querySelector('.bill-item-vat')?.checked);
    const vatRateSelectEl = document.getElementById('bill-vat-rate');
    if (vatRateSelectEl) {
        vatRateSelectEl.value = firstVatRow ? '7' : 'none';
    }
    
    const firstWhtRow = Array.from(itemRows).find(row => {
        const val = row.querySelector('.bill-item-wht')?.value;
        return val && val !== 'none';
    });
    const whtRateSelectEl = document.getElementById('bill-wht-rate');
    if (whtRateSelectEl) {
        whtRateSelectEl.value = firstWhtRow ? firstWhtRow.querySelector('.bill-item-wht').value : 'none';
        const typeRow = document.getElementById('bill-summary-wht-type-row');
        if (typeRow) {
            typeRow.style.display = whtRateSelectEl.value === 'none' ? 'none' : 'flex';
        }
    }

    const grand = subtotal + vat - wht;

    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
    setEl('bill-summary-subtotal', formatMoney(subtotal) + ' บาท');
    setEl('bill-summary-vat', formatMoney(vat) + ' บาท');
    setEl('bill-summary-wht', formatMoney(wht) + ' บาท');
    setEl('bill-summary-grand', formatMoney(grand) + ' บาท');

    // Sum payment rows
    let totalPaid = 0;
    document.querySelectorAll('#bill-payments-tbody .bill-payment-row').forEach(row => {
        totalPaid += parseFloat(row.querySelector('.bill-payment-amount')?.value) || 0;
    });
    const outstanding = Math.max(0, grand - totalPaid);
    setEl('bill-total-paid-display', formatMoney(totalPaid) + ' ฿');
    setEl('bill-outstanding-display', formatMoney(outstanding) + ' ฿');
}

async function showInvoicePrintPreview(invoiceId) {
    await showDocumentPrintPreview('invoice', invoiceId);
}

async function showDocumentPrintPreview(docType, docId) {
    companyProfile = await db.getByKey('settings', 'company_profile');
    if (!companyProfile) {
        companyProfile = {
            name: 'บริษัท บัญชีรุ่งเรือง จำกัด (มหาชน)',
            address: 'กรุงเทพมหานคร',
            taxId: '0105500000000'
        };
    }

    const printArea = document.getElementById('print-area');
    if (!printArea) return;
    printArea.innerHTML = 'กำลังโหลดเอกสาร...';

    let html = '';

    if (docType === 'invoice') {
        const inv = await db.getByKey('invoices', docId);
        if (!inv) {
            printArea.innerHTML = 'ไม่พบข้อมูลเอกสารใบแจ้งหนี้/ใบกำกับภาษี';
            return;
        }
        const subtotal = inv.subtotal;
        const vat = inv.vatAmount;
        const wht = inv.whtAmount;
        const grandTotal = inv.grandTotal;
        const outstanding = inv.outstanding !== undefined ? inv.outstanding : (inv.status === 'paid' ? 0 : inv.grandTotal);
        const amountPaid = inv.amountPaid !== undefined ? inv.amountPaid : (inv.status === 'paid' ? inv.grandTotal : 0);

        html = `
            <div class="print-invoice-header">
                <div class="print-company-info">
                    <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 4px;">${companyProfile.name}</h3>
                    <p>ที่อยู่: ${companyProfile.address}</p>
                    <p>เลขประจำตัวผู้เสียภาษี: ${companyProfile.taxId}</p>
                </div>
                <div class="print-doc-meta">
                    <div class="print-doc-title">${inv.status === 'paid' ? 'ใบเสร็จรับเงิน / ใบกำกับภาษี' : 'ใบแจ้งหนี้ / ใบกำกับภาษี'}</div>
                    <p><strong>เลขที่เอกสาร:</strong> ${inv.id}</p>
                    <p><strong>วันที่ออก:</strong> ${formatDateToDDMMYYYY(inv.date)}</p>
                    <p><strong>กำหนดชำระ:</strong> ${inv.dueDate || '-'}</p>
                </div>
            </div>
            
            <div class="print-parties">
                <div class="print-party-box">
                    <p style="font-weight: 700; margin-bottom: 4px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;">ข้อมูลลูกค้า:</p>
                    <p><strong>ชื่อ:</strong> ${inv.customerName}</p>
                    <p><strong>เลขผู้เสียภาษี:</strong> ${inv.taxId || '-'}</p>
                    <p><strong>ที่อยู่:</strong> ${inv.address || '-'}</p>
                </div>
                <div class="print-party-box">
                    <p style="font-weight: 700; margin-bottom: 4px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;">ข้อมูลการชำระเงิน:</p>
                    <p><strong>ประเภทการขาย:</strong> ขายเชื่อ (A/R)</p>
                    <p><strong>สถานะเอกสาร:</strong> ${inv.status === 'paid' ? 'ชำระเงินเรียบร้อยแล้ว' : 'ค้างรับชำระ'}</p>
                </div>
            </div>

            <table class="print-table">
                <thead>
                    <tr>
                        <th>ลำดับ</th>
                        <th>รายละเอียดสินค้า/บริการ</th>
                        <th style="text-align: right; width: 12%;">จำนวน</th>
                        <th style="text-align: right; width: 20%;">ราคาต่อหน่วย</th>
                        <th style="text-align: right; width: 20%;">มูลค่าเงิน</th>
                    </tr>
                </thead>
                <tbody>
                    ${inv.items.map((item, idx) => `
                        <tr>
                            <td>${idx + 1}</td>
                            <td>
                                ${item.description}
                                ${item.hasVat || (item.whtRate && item.whtRate !== 'none') ? `
                                    <br><small style="color:var(--text-muted); font-size: 11px;">
                                        (${item.hasVat ? 'VAT 7%' : 'ไม่มี VAT'}
                                        ${item.whtRate && item.whtRate !== 'none' ? `, หัก ณ ที่จ่าย ${item.whtRate}%` : ''})
                                    </small>
                                ` : ''}
                            </td>
                            <td style="text-align: right;">${item.quantity}</td>
                            <td style="text-align: right;">${formatMoney(item.unitPrice)} ฿</td>
                            <td style="text-align: right;">${formatMoney(item.amount)} ฿</td>
                        </tr>
                    `).join('')}
                    <tr>
                        <td colspan="3" style="border: none;"></td>
                        <td style="font-weight: 600; text-align: right;">มูลค่าก่อนภาษี (Subtotal):</td>
                        <td style="text-align: right;">${formatMoney(subtotal)} ฿</td>
                    </tr>
                    <tr>
                        <td colspan="3" style="border: none;"></td>
                        <td style="font-weight: 600; text-align: right;">ภาษีมูลค่าเพิ่ม (VAT 7%):</td>
                        <td style="text-align: right;">${formatMoney(vat)} ฿</td>
                    </tr>
                    <tr>
                        <td colspan="3" style="border: none;"></td>
                        <td style="font-weight: 600; text-align: right;">หัก ณ ที่จ่าย (WHT):</td>
                        <td style="text-align: right;">${formatMoney(wht)} ฿</td>
                    </tr>
                    <tr style="font-weight: 700; background-color: #f9fafb;">
                        <td colspan="3" style="border: none;"></td>
                        <td style="text-align: right; border-top: 1.5px solid #000; border-bottom: 1.5px double #000;">ยอดสุทธิที่รับชำระ:</td>
                        <td style="text-align: right; border-top: 1.5px solid #000; border-bottom: 1.5px double #000;">${formatMoney(grandTotal)} ฿</td>
                    </tr>
                    <tr style="font-weight: 600;">
                        <td colspan="3" style="border: none;"></td>
                        <td style="text-align: right; color: #4b5563;">ชำระแล้ว:</td>
                        <td style="text-align: right; color: #4b5563;">${formatMoney(amountPaid)} ฿</td>
                    </tr>
                    <tr style="font-weight: 700; color: #b91c1c;">
                        <td colspan="3" style="border: none;"></td>
                        <td style="text-align: right; border-bottom: 1.5px solid #000;">ยอดคงเหลือค้างชำระ:</td>
                        <td style="text-align: right; border-bottom: 1.5px solid #000;">${formatMoney(outstanding)} ฿</td>
                    </tr>
                </tbody>
            </table>

            <div class="print-signatures">
                <div class="print-sig-box">
                    <p style="margin-bottom: 40px;">ผู้รับมอบอำนาจ / ผู้ส่งของ</p>
                    <p>(........................................................)</p>
                    <p>วันที่ ____/____/________</p>
                </div>
                <div class="print-sig-box">
                    <p style="margin-bottom: 40px;">ผู้ออกเอกสาร / ผู้รับเงิน</p>
                    <p>(........................................................)</p>
                    <p>วันที่ ____/____/________</p>
                </div>
            </div>
        `;
    } else if (docType === 'bill') {
        const bill = await db.getByKey('bills', docId);
        if (!bill) {
            printArea.innerHTML = 'ไม่พบข้อมูลเอกสารบิลรายจ่าย';
            return;
        }
        const subtotal = bill.subtotal;
        const vat = bill.vatAmount || 0;
        const wht = bill.whtAmount || 0;
        const grandTotal = bill.totalAmount;
        const outstanding = bill.outstanding !== undefined ? bill.outstanding : (bill.status === 'paid' ? 0 : bill.totalAmount);
        const amountPaid = bill.amountPaid !== undefined ? bill.amountPaid : (bill.status === 'paid' ? bill.totalAmount : 0);

        html = `
            <div class="print-invoice-header">
                <div class="print-company-info">
                    <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 4px;">${companyProfile.name}</h3>
                    <p>ที่อยู่: ${companyProfile.address}</p>
                    <p>เลขประจำตัวผู้เสียภาษี: ${companyProfile.taxId}</p>
                </div>
                <div class="print-doc-meta">
                    <div class="print-doc-title">ใบสำคัญบันทึกหนี้ / บิลค่าใช้จ่าย</div>
                    <p><strong>เลขที่เอกสาร:</strong> ${bill.id}</p>
                    <p><strong>วันที่ออก:</strong> ${formatDateToDDMMYYYY(bill.date)}</p>
                    <p><strong>กำหนดชำระ:</strong> ${bill.dueDate || '-'}</p>
                </div>
            </div>
            
            <div class="print-parties">
                <div class="print-party-box">
                    <p style="font-weight: 700; margin-bottom: 4px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;">ข้อมูลผู้ขาย/คู่ค้า (Vendor):</p>
                    <p><strong>ชื่อ:</strong> ${bill.vendorName}</p>
                    <p><strong>เลขผู้เสียภาษี:</strong> ${bill.taxId || '-'}</p>
                    <p><strong>ที่อยู่:</strong> ${bill.address || '-'}</p>
                </div>
                <div class="print-party-box">
                    <p style="font-weight: 700; margin-bottom: 4px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;">ข้อมูลรายการจ่าย:</p>
                    <p><strong>ประเภทบิล:</strong> ค่าใช้จ่าย / ซื้อสินค้า (A/P)</p>
                    <p><strong>สถานะเอกสาร:</strong> ${bill.status === 'paid' ? 'จ่ายชำระเงินแล้ว' : 'ค้างจ่ายชำระ'}</p>
                </div>
            </div>

            <table class="print-table">
                <thead>
                    <tr>
                        <th>ลำดับ</th>
                        <th>รายละเอียดสินค้า/บริการ</th>
                        <th style="text-align: right; width: 12%;">จำนวน</th>
                        <th style="text-align: right; width: 20%;">ราคาต่อหน่วย</th>
                        <th style="text-align: right; width: 20%;">มูลค่าเงิน</th>
                    </tr>
                </thead>
                <tbody>
                    ${bill.items.map((item, idx) => `
                        <tr>
                            <td>${idx + 1}</td>
                            <td>
                                ${item.description}
                                ${item.hasVat || (item.whtRate && item.whtRate !== 'none') ? `
                                    <br><small style="color:var(--text-muted); font-size: 11px;">
                                        (${item.hasVat ? 'VAT 7%' : 'ไม่มี VAT'}
                                        ${item.whtRate && item.whtRate !== 'none' ? `, หัก ณ ที่จ่าย ${item.whtRate}%` : ''})
                                    </small>
                                ` : ''}
                            </td>
                            <td style="text-align: right;">${item.quantity}</td>
                            <td style="text-align: right;">${formatMoney(item.unitPrice)} ฿</td>
                            <td style="text-align: right;">${formatMoney(item.amount)} ฿</td>
                        </tr>
                    `).join('')}
                    <tr>
                        <td colspan="3" style="border: none;"></td>
                        <td style="font-weight: 600; text-align: right;">มูลค่าสินค้า/บริการ (Subtotal):</td>
                        <td style="text-align: right;">${formatMoney(subtotal)} ฿</td>
                    </tr>
                    <tr>
                        <td colspan="3" style="border: none;"></td>
                        <td style="font-weight: 600; text-align: right;">ภาษีมูลค่าเพิ่ม (VAT 7%):</td>
                        <td style="text-align: right;">${formatMoney(vat)} ฿</td>
                    </tr>
                    <tr>
                        <td colspan="3" style="border: none;"></td>
                        <td style="font-weight: 600; text-align: right;">หัก ณ ที่จ่าย (WHT):</td>
                        <td style="text-align: right;">${formatMoney(wht)} ฿</td>
                    </tr>
                    <tr style="font-weight: 700; background-color: #f9fafb;">
                        <td colspan="3" style="border: none;"></td>
                        <td style="text-align: right; border-top: 1.5px solid #000; border-bottom: 1.5px double #000;">ยอดเงินสุทธิที่จ่าย:</td>
                        <td style="text-align: right; border-top: 1.5px solid #000; border-bottom: 1.5px double #000;">${formatMoney(grandTotal)} ฿</td>
                    </tr>
                    <tr style="font-weight: 600;">
                        <td colspan="3" style="border: none;"></td>
                        <td style="text-align: right; color: #4b5563;">ชำระแล้ว:</td>
                        <td style="text-align: right; color: #4b5563;">${formatMoney(amountPaid)} ฿</td>
                    </tr>
                    <tr style="font-weight: 700; color: #b91c1c;">
                        <td colspan="3" style="border: none;"></td>
                        <td style="text-align: right; border-bottom: 1.5px solid #000;">ยอดคงเหลือค้างจ่าย:</td>
                        <td style="text-align: right; border-bottom: 1.5px solid #000;">${formatMoney(outstanding)} ฿</td>
                    </tr>
                </tbody>
            </table>

            <div class="print-signatures">
                <div class="print-sig-box">
                    <p style="margin-bottom: 40px;">ผู้บันทึก / ผู้จัดทำ</p>
                    <p>(........................................................)</p>
                    <p>วันที่ ____/____/________</p>
                </div>
                <div class="print-sig-box">
                    <p style="margin-bottom: 40px;">ผู้ตรวจสอบ / ผู้อนุมัติ</p>
                    <p>(........................................................)</p>
                    <p>วันที่ ____/____/________</p>
                </div>
            </div>
        `;
    } else if (docType === 'receipt') {
        const re = await db.getByKey('arReceipts', docId);
        if (!re) {
            printArea.innerHTML = 'ไม่พบข้อมูลใบเสร็จรับเงิน';
            return;
        }

        html = `
            <div class="print-invoice-header">
                <div class="print-company-info">
                    <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 4px;">${companyProfile.name}</h3>
                    <p>ที่อยู่: ${companyProfile.address}</p>
                    <p>เลขประจำตัวผู้เสียภาษี: ${companyProfile.taxId}</p>
                </div>
                <div class="print-doc-meta">
                    <div class="print-doc-title">ใบเสร็จรับเงิน (Receipt)</div>
                    <p><strong>เลขที่เอกสาร:</strong> ${re.id}</p>
                    <p><strong>วันที่ออก:</strong> ${formatDateToDDMMYYYY(re.date)}</p>
                </div>
            </div>
            
            <div class="print-parties">
                <div class="print-party-box">
                    <p style="font-weight: 700; margin-bottom: 4px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;">ได้รับเงินจากลูกค้า:</p>
                    <p><strong>ชื่อ:</strong> ${re.customerName}</p>
                </div>
                <div class="print-party-box">
                    <p style="font-weight: 700; margin-bottom: 4px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;">ข้อมูลการรับชำระ:</p>
                    <p><strong>เงินสด:</strong> ${formatMoney(re.cashAmount)} ฿</p>
                    <p><strong>ภาษีหัก ณ ที่จ่าย (WHT):</strong> ${formatMoney(re.whtAmount)} ฿</p>
                    <p><strong>ส่วนลดจ่าย:</strong> ${formatMoney(re.discountAmount)} ฿</p>
                </div>
            </div>

            <table class="print-table">
                <thead>
                    <tr>
                        <th>ลำดับ</th>
                        <th>เลขที่ใบแจ้งหนี้อ้างอิง</th>
                        <th style="text-align: right;">ยอดเงินตามใบแจ้งหนี้</th>
                        <th style="text-align: right; width: 25%;">ยอดเงินที่ชำระครั้งนี้</th>
                    </tr>
                </thead>
                <tbody>
                    ${re.invoiceLines.map((line, idx) => `
                        <tr>
                            <td>${idx + 1}</td>
                            <td>${line.invoiceId}</td>
                            <td style="text-align: right;">${formatMoney(line.grandTotal)} ฿</td>
                            <td style="text-align: right;">${formatMoney(line.amount)} ฿</td>
                        </tr>
                    `).join('')}
                    <tr style="font-weight: 700; background-color: #f9fafb;">
                        <td colspan="2" style="border: none;"></td>
                        <td style="text-align: right; border-top: 1.5px solid #000; border-bottom: 1.5px double #000;">ยอดรับชำระสะสมรวม:</td>
                        <td style="text-align: right; border-top: 1.5px solid #000; border-bottom: 1.5px double #000;">${formatMoney(re.grandTotal)} ฿</td>
                    </tr>
                </tbody>
            </table>

            <div class="print-signatures">
                <div class="print-sig-box">
                    <p style="margin-bottom: 40px;">ลูกค้าผู้ชำระเงิน</p>
                    <p>(........................................................)</p>
                    <p>วันที่ ____/____/________</p>
                </div>
                <div class="print-sig-box">
                    <p style="margin-bottom: 40px;">ผู้รับเงิน / เจ้าหน้าที่การเงิน</p>
                    <p>(........................................................)</p>
                    <p>วันที่ ____/____/________</p>
                </div>
            </div>
        `;
    } else if (docType === 'payment') {
        const ps = await db.getByKey('apPayments', docId);
        if (!ps) {
            printArea.innerHTML = 'ไม่พบข้อมูลใบสำคัญจ่าย';
            return;
        }

        html = `
            <div class="print-invoice-header">
                <div class="print-company-info">
                    <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 4px;">${companyProfile.name}</h3>
                    <p>ที่อยู่: ${companyProfile.address}</p>
                    <p>เลขประจำตัวผู้เสียภาษี: ${companyProfile.taxId}</p>
                </div>
                <div class="print-doc-meta">
                    <div class="print-doc-title">ใบสำคัญจ่ายเงิน (Payment Voucher)</div>
                    <p><strong>เลขที่เอกสาร:</strong> ${ps.id}</p>
                    <p><strong>วันที่ออก:</strong> ${formatDateToDDMMYYYY(ps.date)}</p>
                </div>
            </div>
            
            <div class="print-parties">
                <div class="print-party-box">
                    <p style="font-weight: 700; margin-bottom: 4px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;">จ่ายชำระเงินให้แก่ (Payee):</p>
                    <p><strong>ชื่อ:</strong> ${ps.supplierName}</p>
                </div>
                <div class="print-party-box">
                    <p style="font-weight: 700; margin-bottom: 4px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;">ข้อมูลช่องทางการจ่ายเงิน:</p>
                    <p><strong>เงินสด:</strong> ${formatMoney(ps.cashAmount)} ฿</p>
                    <p><strong>ภาษีหัก ณ ที่จ่ายค้างจ่าย:</strong> ${formatMoney(ps.whtAmount)} ฿</p>
                    <p><strong>ส่วนลดรับ:</strong> ${formatMoney(ps.discountAmount)} ฿</p>
                </div>
            </div>

            <table class="print-table">
                <thead>
                    <tr>
                        <th>ลำดับ</th>
                        <th>เลขที่เอกสารบิลอ้างอิง</th>
                        <th style="text-align: right;">ยอดเงินเต็มจำนวนบิล</th>
                        <th style="text-align: right; width: 25%;">ยอดชำระครั้งนี้</th>
                    </tr>
                </thead>
                <tbody>
                    ${ps.billLines.map((line, idx) => `
                        <tr>
                            <td>${idx + 1}</td>
                            <td>${line.billId}</td>
                            <td style="text-align: right;">${formatMoney(line.totalAmount)} ฿</td>
                            <td style="text-align: right;">${formatMoney(line.amount)} ฿</td>
                        </tr>
                    `).join('')}
                    <tr style="font-weight: 700; background-color: #f9fafb;">
                        <td colspan="2" style="border: none;"></td>
                        <td style="text-align: right; border-top: 1.5px solid #000; border-bottom: 1.5px double #000;">ยอดจ่ายชำระรวม:</td>
                        <td style="text-align: right; border-top: 1.5px solid #000; border-bottom: 1.5px double #000;">${formatMoney(ps.grandTotal)} ฿</td>
                    </tr>
                </tbody>
            </table>

            <div class="print-signatures">
                <div class="print-sig-box">
                    <p style="margin-bottom: 40px;">ผู้จ่ายเงิน / ผู้จัดทำ</p>
                    <p>(........................................................)</p>
                    <p>วันที่ ____/____/________</p>
                </div>
                <div class="print-sig-box">
                    <p style="margin-bottom: 40px;">ผู้รับเงิน / เจ้าหนี้คู่ค้า</p>
                    <p>(........................................................)</p>
                    <p>วันที่ ____/____/________</p>
                </div>
            </div>
        `;
    } else if (docType === 'pettycash-pay') {
        const dp = await db.getByKey('pettyCashPayments', docId);
        if (!dp) {
            printArea.innerHTML = 'ไม่พบข้อมูลใบสำคัญจ่ายเงินสดย่อย';
            return;
        }

        // Contact name lookup
        let contactName = 'ทั่วไป (ไม่ระบุ)';
        if (dp.contactCode) {
            const prefix = dp.contactCode.substring(0, 2);
            const id = dp.contactCode.substring(2);
            let contact = null;
            if (prefix === 'C-') {
                contact = await db.getByKey('contacts', parseInt(id));
            } else if (prefix === 'S-') {
                contact = await db.getByKey('contacts', parseInt(id));
            }
            if (contact) {
                contactName = contact.name;
            }
        }

        let calculatedBase = dp.totalAmount;
        let calculatedVat = dp.vatAmount || 0;
        if (dp.vatType === 'include') {
            calculatedBase = dp.totalAmount - calculatedVat;
        } else if (dp.vatType === 'exclude') {
            calculatedBase = dp.totalAmount;
        }

        let netCashAmount = dp.totalAmount - dp.whtAmount;
        if (dp.vatType === 'exclude') {
            netCashAmount = dp.totalAmount + calculatedVat - dp.whtAmount;
        }

        html = `
            <div class="print-invoice-header">
                <div class="print-company-info">
                    <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 4px;">${companyProfile.name}</h3>
                    <p>ที่อยู่: ${companyProfile.address}</p>
                    <p>เลขประจำตัวผู้เสียภาษี: ${companyProfile.taxId}</p>
                </div>
                <div class="print-doc-meta">
                    <div class="print-doc-title">ใบสำคัญจ่ายเงินสดย่อย (Petty Cash Voucher)</div>
                    <p><strong>เลขที่เอกสาร:</strong> ${dp.id}</p>
                    <p><strong>วันที่ออก:</strong> ${formatDateToDDMMYYYY(dp.date)}</p>
                    <p><strong>ประเภท:</strong> ${dp.type}</p>
                </div>
            </div>
            
            <div class="print-parties">
                <div class="print-party-box">
                    <p style="font-weight: 700; margin-bottom: 4px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;">ผู้รับเงิน / รายละเอียด:</p>
                    <p><strong>ผู้ติดต่อ:</strong> ${contactName}</p>
                    <p><strong>หมายเหตุ:</strong> ${dp.remarks || '-'}</p>
                </div>
                <div class="print-party-box">
                    <p style="font-weight: 700; margin-bottom: 4px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;">ข้อมูลภาษี ณ ที่จ่าย (WHT):</p>
                    <p><strong>อัตรา WHT:</strong> ${dp.whtType === 'mixed' ? 'หลายอัตรา (Mixed)' : (dp.whtType !== 'none' ? `${dp.whtType}%` : 'ไม่มีหัก')}</p>
                    <p><strong>ภาษีหัก ณ ที่จ่าย:</strong> ${formatMoney(dp.whtAmount)} ฿</p>
                </div>
                <div class="print-party-box">
                    <p style="font-weight: 700; margin-bottom: 4px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;">ข้อมูลภาษีมูลค่าเพิ่ม (VAT):</p>
                    <p><strong>ประเภท VAT:</strong> ${dp.vatType === 'include' ? 'รวมในค่าใช้จ่าย (Include VAT)' : dp.vatType === 'exclude' ? 'แยกต่างหาก (Exclude VAT)' : 'ไม่มีภาษี'}</p>
                    <p><strong>ภาษีมูลค่าเพิ่ม:</strong> ${formatMoney(dp.vatAmount)} ฿</p>
                    <p><strong>เลขที่ใบกำกับภาษี:</strong> ${dp.taxInvoiceNo || '-'}</p>
                </div>
            </div>

            <table class="print-table">
                <thead>
                    <tr>
                        <th>ลำดับ</th>
                        <th>รหัสบัญชี</th>
                        <th>ชื่อบัญชีแยกประเภท</th>
                        <th>รายละเอียดรายการ</th>
                        <th style="text-align: right; width: 20%;">จำนวนเงิน</th>
                    </tr>
                </thead>
                <tbody>
                    ${dp.lines.map((line, idx) => `
                        <tr>
                            <td>${idx + 1}</td>
                            <td style="font-family: monospace;">${line.accountCode}</td>
                            <td>${line.accountName}</td>
                            <td>${line.description || '-'}${line.whtRate && line.whtRate !== 'none' ? ` (หัก ${line.whtRate}%)` : ''}</td>
                            <td style="text-align: right;">${formatMoney(line.amount)} ฿</td>
                        </tr>
                    `).join('')}
                    <tr>
                        <td colspan="3" style="border: none;"></td>
                        <td style="font-weight: 600; text-align: right;">ยอดรวมฐานภาษี (Base):</td>
                        <td style="text-align: right;">${formatMoney(calculatedBase)} ฿</td>
                    </tr>
                    ${dp.vatAmount > 0 ? `
                    <tr>
                        <td colspan="3" style="border: none;"></td>
                        <td style="font-weight: 600; text-align: right;">ภาษีมูลค่าเพิ่ม (VAT 7%):</td>
                        <td style="text-align: right;">${formatMoney(dp.vatAmount)} ฿</td>
                    </tr>
                    ` : ''}
                    ${dp.whtAmount > 0 ? `
                    <tr>
                        <td colspan="3" style="border: none;"></td>
                        <td style="font-weight: 600; text-align: right;">หักภาษี ณ ที่จ่าย (WHT):</td>
                        <td style="text-align: right;">${formatMoney(dp.whtAmount)} ฿</td>
                    </tr>
                    ` : ''}
                    <tr style="font-weight: 700; background-color: #f9fafb;">
                        <td colspan="3" style="border: none;"></td>
                        <td style="text-align: right; border-top: 1.5px solid #000; border-bottom: 1.5px double #000;">ยอดเงินสดจ่ายจริง (Net Cash):</td>
                        <td style="text-align: right; border-top: 1.5px solid #000; border-bottom: 1.5px double #000;">${formatMoney(netCashAmount)} ฿</td>
                    </tr>
                </tbody>
            </table>

            <div class="print-signatures">
                <div class="print-sig-box">
                    <p style="margin-bottom: 40px;">ผู้จ่ายเงิน (Custodian)</p>
                    <p>(........................................................)</p>
                    <p>วันที่ ____/____/________</p>
                </div>
                <div class="print-sig-box">
                    <p style="margin-bottom: 40px;">ผู้รับเงิน (Recipient)</p>
                    <p>(........................................................)</p>
                    <p>วันที่ ____/____/________</p>
                </div>
            </div>
        `;
    } else if (docType === 'pettycash-reim') {
        const vr = await db.getByKey('pettyCashReimbursements', docId);
        if (!vr) {
            printArea.innerHTML = 'ไม่พบข้อมูลใบเบิกชดเชยเงินสดย่อย';
            return;
        }

        const dps = [];
        for (const dpId of vr.dpIds) {
            const dp = await db.getByKey('pettyCashPayments', dpId);
            if (dp) dps.push(dp);
        }

        html = `
            <div class="print-invoice-header">
                <div class="print-company-info">
                    <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 4px;">${companyProfile.name}</h3>
                    <p>ที่อยู่: ${companyProfile.address}</p>
                    <p>เลขประจำตัวผู้เสียภาษี: ${companyProfile.taxId}</p>
                </div>
                <div class="print-doc-meta">
                    <div class="print-doc-title">ใบเบิกชดเชยเงินสดย่อย (Reimbursement Voucher)</div>
                    <p><strong>เลขที่เอกสาร:</strong> ${vr.id}</p>
                    <p><strong>วันที่ออก:</strong> ${formatDateToDDMMYYYY(vr.date)}</p>
                </div>
            </div>
            
            <div class="print-parties" style="margin-bottom: 16px;">
                <div style="width: 100%; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; background-color: #ffffff;">
                    <p><strong>คำอธิบาย / เหตุผลการเบิกชดเชย:</strong> ${vr.explanation || '-'}</p>
                    <p><strong>บัญชีชดเชยเงินสด/ธนาคาร (Reimburse Account):</strong> ${vr.reimburseAccount}</p>
                </div>
            </div>

            <h4 style="font-size: 13px; font-weight: 700; margin-bottom: 8px; color: #374151;">รายการจ่ายสดย่อยที่เบิกชดเชยในครั้งนี้ (Included DPs):</h4>
            <table class="print-table" style="margin-bottom: 24px;">
                <thead>
                    <tr>
                        <th>ลำดับ</th>
                        <th>เลขที่ใบจ่ายเงินสดย่อย (DP)</th>
                        <th>วันที่จ่าย</th>
                        <th>ผู้รับเงิน / รายการจ่าย</th>
                        <th style="text-align: right; width: 20%;">ภาษีหัก ณ ที่จ่าย</th>
                        <th style="text-align: right; width: 20%;">ยอดจ่ายสดย่อยรวม</th>
                    </tr>
                </thead>
                <tbody>
                    ${dps.map((dp, idx) => `
                        <tr>
                            <td>${idx + 1}</td>
                            <td><strong>${dp.id}</strong></td>
                            <td>${formatDateToDDMMYYYY(dp.date)}</td>
                            <td>${dp.remarks}</td>
                            <td style="text-align: right; font-family: monospace;">${formatMoney(dp.whtAmount || 0)} ฿</td>
                            <td style="text-align: right; font-family: monospace;">${formatMoney(dp.totalAmount)} ฿</td>
                        </tr>
                    `).join('')}
                    <tr style="font-weight: 700; background-color: #f9fafb;">
                        <td colspan="4" style="border: none;"></td>
                        <td style="text-align: right; border-top: 1.5px solid #000; border-bottom: 1.5px double #000;">ยอดเบิกชดเชยสะสมสุทธิ:</td>
                        <td style="text-align: right; border-top: 1.5px solid #000; border-bottom: 1.5px double #000;">${formatMoney(vr.totalAmount)} ฿</td>
                    </tr>
                </tbody>
            </table>

            <div class="print-signatures" style="margin-top: 40px;">
                <div class="print-sig-box">
                    <p style="margin-bottom: 40px;">ผู้ดูแลเงินสดย่อย / ผู้เบิก</p>
                    <p>(........................................................)</p>
                    <p>วันที่ ____/____/________</p>
                </div>
                <div class="print-sig-box">
                    <p style="margin-bottom: 40px;">ผู้อนุมัติชดเชย</p>
                    <p>(........................................................)</p>
                    <p>วันที่ ____/____/________</p>
                </div>
            </div>
        `;
    }

    printArea.innerHTML = html;
    openModal('modal-invoice-preview');
}

// =========================================================================
// 9. SETTINGS & SIMULATION VIEW
// =========================================================================
async function renderSettingsView() {
    companyProfile = await db.getByKey('settings', 'company_profile');
    if (companyProfile) {
        document.getElementById('settings-company-name').value = companyProfile.name || '';
        document.getElementById('settings-company-tax').value = companyProfile.taxId || '';
        document.getElementById('settings-company-address').value = companyProfile.address || '';
        document.getElementById('settings-capital-shares').value = companyProfile.shares !== undefined ? companyProfile.shares : 4000;
        document.getElementById('settings-capital-par').value = companyProfile.par !== undefined ? companyProfile.par : 100;
        document.getElementById('settings-capital-paid').value = companyProfile.paid !== undefined ? companyProfile.paid : 25;
        const vatRegisteredEl = document.getElementById('settings-company-vat-registered');
        if (vatRegisteredEl) {
            vatRegisteredEl.value = companyProfile.vatRegistered || 'yes';
        }
    }
    
    globalPeriod = await db.getByKey('settings', 'accounting_period');
    if (globalPeriod) {
        const startInput = document.getElementById('settings-period-start');
        const endInput = document.getElementById('settings-period-end');
        if (startInput) startInput.value = globalPeriod.startDate;
        if (endInput) endInput.value = globalPeriod.endDate;
    }

    // Tab buttons and sub-sections logic
    const generalBtn = document.getElementById('settings-tab-general-btn');
    const accountsBtn = document.getElementById('settings-tab-accounts-btn');
    const generalDiv = document.getElementById('settings-subsection-general');
    const accountsDiv = document.getElementById('settings-subsection-accounts');
    
    if (generalBtn && accountsBtn) {
        generalBtn.onclick = () => {
            generalBtn.className = 'btn btn-primary';
            generalBtn.classList.remove('btn-secondary');
            accountsBtn.className = 'btn btn-secondary';
            accountsBtn.classList.remove('btn-primary');
            generalDiv.style.display = 'block';
            accountsDiv.style.display = 'none';
        };
        accountsBtn.onclick = async () => {
            generalBtn.className = 'btn btn-secondary';
            generalBtn.classList.remove('btn-primary');
            accountsBtn.className = 'btn btn-primary';
            accountsBtn.classList.remove('btn-secondary');
            generalDiv.style.display = 'none';
            accountsDiv.style.display = 'block';
            await loadLinkedAccountsConfig();
        };
        // Reset to general sub-tab when entering settings view
        generalBtn.click();
    }
}

async function loadLinkedAccountsConfig() {
    const accounts = await store.getAccounts();
    const selectOptions = '<option value="">-- ไม่ระบุ (ใช้ค่าเริ่มต้น) --</option>' + accounts.map(a => `<option value="${a.code}">${a.code} - ${a.name}</option>`).join('');
    
    const form = document.getElementById('linked-accounts-form');
    if (!form) return;
    
    const selects = form.querySelectorAll('select.form-control');
    selects.forEach(select => {
        select.innerHTML = selectOptions;
    });
    
    const currentMappings = await store.getAccountMappings();
    selects.forEach(select => {
        const fieldId = select.id.replace('mapping-', '');
        if (currentMappings[fieldId]) {
            select.value = currentMappings[fieldId];
        }
    });

    form.onsubmit = async (e) => {
        e.preventDefault();
        const mappings = {};
        selects.forEach(select => {
            const fieldId = select.id.replace('mapping-', '');
            mappings[fieldId] = select.value;
        });
        await db.putItem('settings', {
            key: 'account_mappings',
            mappings: mappings
        });
        showToast('บันทึกตัวกำหนดบัญชีเรียบร้อยแล้ว', 'success');
    };

    const btnRepost = document.getElementById('btn-repost-all-settings');
    if (btnRepost) {
        btnRepost.onclick = () => {
            window.openModal('modal-repost-options');
        };
    }
}

function exportTableToCSV(tableId, filename) {
    const table = document.getElementById(tableId);
    if (!table) return;

    let csvContent = '\uFEFF'; // Excel UTF-8 BOM
    const rows = table.querySelectorAll('tr');

    rows.forEach(row => {
        if (row.style.display === 'none' || row.closest('.no-print')) return;
        
        const cols = row.querySelectorAll('th, td');
        const rowData = [];

        cols.forEach(col => {
            if (col.querySelector('button') || col.classList.contains('no-export')) {
                return;
            }
            let text = col.innerText.replace(/(\r\n|\n|\r)/gm, ' ').trim();
            text = text.replace(/"/g, '""');
            rowData.push('"' + text + '"');
        });

        if (rowData.length > 0) {
            csvContent += rowData.join(',') + '\n';
        }
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// =========================================================================
// ADD JOURNAL ENTRY FORM LOGIC (MODAL)
// =========================================================================
let jvLinesCount = 0;

function initJournalModalForm() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('jv-date').value = today;
    document.getElementById('jv-reference').value = 'JV-' + Date.now().toString().slice(-6);
    document.getElementById('jv-description').value = '';
    
    // Clear and add 2 blank rows initially
    const tbody = document.getElementById('jv-lines-tbody');
    tbody.innerHTML = '';
    jvLinesCount = 0;
    
    addJournalFormRow();
    addJournalFormRow();
    
    recalculateJournalTotals();
}

async function addJournalFormRow() {
    const tbody = document.getElementById('jv-lines-tbody');
    const index = jvLinesCount++;
    
    const accounts = (await store.getAccounts()).filter(a => a.type !== 'control');
    const selectOptions = accounts.map(a => `<option value="${a.code}">${a.code} - ${a.name}</option>`).join('');
    
    const tr = document.createElement('tr');
    tr.id = `jv-row-${index}`;
    tr.innerHTML = `
        <td>
            <select class="form-control jv-line-account">
                ${selectOptions}
            </select>
        </td>
        <td>
            <input type="number" class="form-control num-col jv-line-debit" value="0" min="0" step="0.01">
        </td>
        <td>
            <input type="number" class="form-control num-col jv-line-credit" value="0" min="0" step="0.01">
        </td>
        <td style="text-align: center;">
            <button type="button" class="btn btn-danger btn-sm" onclick="this.closest('tr').remove(); recalculateJournalTotals();" style="padding: 4px 8px;">&times;</button>
        </td>
    `;
    
    tbody.appendChild(tr);
    
    // Bind change events
    tr.querySelector('.jv-line-debit').addEventListener('input', (e) => {
        if (parseFloat(e.target.value) > 0) {
            tr.querySelector('.jv-line-credit').value = 0; // Prevent debit & credit on same row
        }
        recalculateJournalTotals();
    });
}

function recalculateJournalTotals() {
    let totalDebit = 0;
    let totalCredit = 0;
    
    document.querySelectorAll('.jv-line-debit').forEach(el => {
        totalDebit += parseFloat(el.value) || 0;
    });
    
    document.querySelectorAll('.jv-line-credit').forEach(el => {
        totalCredit += parseFloat(el.value) || 0;
    });
    
    document.getElementById('jv-total-debit').innerText = formatMoney(totalDebit);
    document.getElementById('jv-total-credit').innerText = formatMoney(totalCredit);
    
    const diff = Math.abs(totalDebit - totalCredit);
    const diffEl = document.getElementById('jv-diff-warning');
    
    if (diff < 0.01) {
        diffEl.innerHTML = `<i class="fa-solid fa-circle-check"></i> ดุลบัญชีสมสมดุล (Diff: 0.00)`;
        diffEl.style.color = 'var(--success-green)';
        document.getElementById('btn-jv-submit').disabled = false;
    } else {
        diffEl.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> บัญชีไม่สมดุล (Diff: ${formatMoney(diff)})`;
        diffEl.style.color = 'var(--danger-red)';
        document.getElementById('btn-jv-submit').disabled = true;
    }
}

// Global exposure for dynamic dynamic HTML handlers
window.recalculateJournalTotals = recalculateJournalTotals;

// =========================================================================
// BIND UI ACTIONS
// =========================================================================
function bindUIActions() {
    // Global Print and CSV Export listeners
    document.addEventListener('click', (e) => {
        const printBtn = e.target.closest('.btn-print-report');
        if (printBtn) {
            e.preventDefault();
            window.print();
        }

        const exportBtn = e.target.closest('.btn-export-csv');
        if (exportBtn) {
            e.preventDefault();
            const tableId = exportBtn.getAttribute('data-table');
            const filename = exportBtn.getAttribute('data-filename');
            if (tableId && filename) {
                exportTableToCSV(tableId, filename);
            }
        }

        const rdprepBtn = e.target.closest('.btn-export-rdprep');
        if (rdprepBtn) {
            e.preventDefault();
            const start = document.getElementById('tax-report-start').value;
            const end = document.getElementById('tax-report-end').value;
            exportRDPrep(start, end, currentTaxTab);
        }
    });

    // 1. Dashboard click handlers
    document.getElementById('dashboard-go-journal').addEventListener('click', () => {
        // Toggle view
        document.querySelector('[data-view="journal"]').click();
    });

    // 2. Chart of Accounts TreeView & Detail Panel Binding
    const treeContainer = document.getElementById('coa-tree-container');
    if (treeContainer) {
        // Event Delegation for Tree Items click and toggle click
        treeContainer.addEventListener('click', async (e) => {
            const item = e.target.closest('.coa-tree-item');
            if (item) {
                if (coaMode !== 'view') return; // Do not switch selection if editing or adding
                const code = item.getAttribute('data-code');
                selectedCoaCode = code;
                
                document.querySelectorAll('#coa-tree-container .coa-tree-item').forEach(el => {
                    el.classList.remove('active');
                });
                item.classList.add('active');
                
                await showCoaDetail(code);
                return;
            }

            const toggle = e.target.closest('.coa-tree-toggle');
            if (toggle) {
                e.stopPropagation();
                const code = toggle.getAttribute('data-code');
                const isCollapsed = toggle.classList.contains('collapsed');
                
                collapsedStates[code] = !isCollapsed;
                toggle.classList.toggle('collapsed');
                
                const childList = toggle.closest('li').querySelector('.coa-tree-child-list');
                if (childList) {
                    childList.classList.toggle('hidden');
                }
                
                const folderIcon = toggle.closest('.coa-tree-node-wrapper').querySelector('.coa-tree-item i');
                if (folderIcon) {
                    if (collapsedStates[code]) {
                        folderIcon.classList.remove('fa-folder-open');
                        folderIcon.classList.add('fa-folder');
                    } else {
                        folderIcon.classList.remove('fa-folder');
                        folderIcon.classList.add('fa-folder-open');
                    }
                }
            }
        });
    }

    // Toolbar Navigation
    document.getElementById('btn-coa-first').addEventListener('click', async () => {
        if (accountsGlobalList.length > 0) {
            selectedCoaCode = accountsGlobalList[0].code;
            await highlightAndSelectAccount(selectedCoaCode);
        }
    });
    
    document.getElementById('btn-coa-prev').addEventListener('click', async () => {
        const idx = accountsGlobalList.findIndex(a => a.code === selectedCoaCode);
        if (idx > 0) {
            selectedCoaCode = accountsGlobalList[idx - 1].code;
            await highlightAndSelectAccount(selectedCoaCode);
        }
    });
    
    document.getElementById('btn-coa-next').addEventListener('click', async () => {
        const idx = accountsGlobalList.findIndex(a => a.code === selectedCoaCode);
        if (idx >= 0 && idx < accountsGlobalList.length - 1) {
            selectedCoaCode = accountsGlobalList[idx + 1].code;
            await highlightAndSelectAccount(selectedCoaCode);
        }
    });
    
    document.getElementById('btn-coa-last').addEventListener('click', async () => {
        if (accountsGlobalList.length > 0) {
            selectedCoaCode = accountsGlobalList[accountsGlobalList.length - 1].code;
            await highlightAndSelectAccount(selectedCoaCode);
        }
    });

    // Helper to suggest the next account code based on currently selected account
    function suggestNextCoaCode(activeAccount) {
        if (!activeAccount) return '';
        
        let parentCode = '';
        let targetLevel = 1;
        if (activeAccount.type === 'control') {
            parentCode = activeAccount.code;
            targetLevel = (activeAccount.level || 1) + 1;
        } else {
            parentCode = activeAccount.parentCode || '';
            targetLevel = activeAccount.level || 1;
        }
        
        if (!parentCode) return '';
        
        const siblings = accountsGlobalList.filter(a => a.parentCode === parentCode);
        
        if (siblings.length > 0) {
            siblings.sort((a, b) => a.code.localeCompare(b.code));
            const lastCode = siblings[siblings.length - 1].code;
            
            if (lastCode.includes('-')) {
                const parts = lastCode.split('-');
                const prefix = parts[0];
                const suffix = parts[1];
                
                if (suffix === '00') {
                    const match = prefix.match(/(\d+)$/);
                    if (match) {
                        const numStr = match[1];
                        const val = parseInt(numStr) || 0;
                        const nextVal = val + 1;
                        const nextNumStr = String(nextVal).padStart(numStr.length, '0');
                        const newPrefix = prefix.substring(0, prefix.length - numStr.length) + nextNumStr;
                        return newPrefix + '-' + suffix;
                    }
                } else {
                    const match = suffix.match(/(\d+)$/);
                    if (match) {
                        const numStr = match[1];
                        const val = parseInt(numStr) || 0;
                        const nextVal = val + 1;
                        const nextNumStr = String(nextVal).padStart(numStr.length, '0');
                        const newSuffix = suffix.substring(0, suffix.length - numStr.length) + nextNumStr;
                        return prefix + '-' + newSuffix;
                    }
                }
            }
            return lastCode + '1';
        } else {
            if (parentCode.includes('-')) {
                const parts = parentCode.split('-');
                const prefix = parts[0];
                const suffix = parts[1];
                
                if (targetLevel === 3) {
                    const match = prefix.match(/(\d)0$/);
                    if (match) {
                        const val = parseInt(prefix.charAt(2)) || 0;
                        const nextVal = val + 1;
                        return prefix.substring(0, 2) + nextVal + '0-' + suffix;
                    }
                    return prefix.substring(0, 2) + '10-' + suffix;
                } else if (targetLevel === 4) {
                    if (suffix === '00') {
                        return prefix + '-01';
                    }
                    return prefix + '-01';
                }
            }
            return parentCode + '-01';
        }
    }

    // Toolbar Actions
    document.getElementById('btn-coa-add').addEventListener('click', () => {
        coaMode = 'add';
        setCoaFormDisabled(false);
        
        const activeAccount = accountsGlobalList.find(a => a.code === selectedCoaCode);
        
        document.getElementById('coa-detail-form').reset();
        populateParentSelect();
        
        let newParentCode = '';
        let newLevel = 1;
        let newCode = '';
        let newCategory = 'asset';
        let newDept = 'N';
        
        if (activeAccount) {
            newCategory = activeAccount.category;
            newDept = activeAccount.dept || 'N';
            if (activeAccount.type === 'control') {
                newParentCode = activeAccount.code;
                newLevel = (activeAccount.level || 1) + 1;
            } else {
                newParentCode = activeAccount.parentCode || '';
                newLevel = activeAccount.level || 1;
            }
            newCode = suggestNextCoaCode(activeAccount);
        }
        
        document.getElementById('coa-code').value = newCode;
        document.getElementById('coa-level').value = newLevel;
        document.getElementById('coa-parent').value = newParentCode;
        document.getElementById('coa-group').value = newCategory;
        document.getElementById('coa-dept').value = newDept;
        document.getElementById('coa-type').value = 'posting';
        
        document.getElementById('coa-form-actions').style.display = 'flex';
        document.getElementById('btn-coa-add').disabled = true;
        document.getElementById('btn-coa-edit').disabled = true;
        document.getElementById('btn-coa-delete').disabled = true;
        updateCoaToolbarNavigationStates();
        
        document.getElementById('coa-detail-title').innerHTML = `<i class="fa-solid fa-file-circle-plus"></i> เพิ่มบัญชีใหม่`;
        
        if (newCode) {
            document.getElementById('coa-name').focus();
        } else {
            document.getElementById('coa-code').focus();
        }
    });

    document.getElementById('btn-coa-edit').addEventListener('click', () => {
        if (!selectedCoaCode) return;
        coaMode = 'edit';
        setCoaFormDisabled(false);
        populateParentSelect(selectedCoaCode);
        
        const account = accountsGlobalList.find(a => a.code === selectedCoaCode);
        if (account) {
            document.getElementById('coa-parent').value = account.parentCode || '';
        }
        
        document.getElementById('coa-form-actions').style.display = 'flex';
        document.getElementById('btn-coa-add').disabled = true;
        document.getElementById('btn-coa-edit').disabled = true;
        document.getElementById('btn-coa-delete').disabled = true;
        updateCoaToolbarNavigationStates();
        
        document.getElementById('coa-detail-title').innerHTML = `<i class="fa-solid fa-pencil"></i> แก้ไขข้อมูลบัญชี: ${selectedCoaCode}`;
        document.getElementById('coa-name').focus();
    });

    document.getElementById('btn-coa-cancel').addEventListener('click', async () => {
        coaMode = 'view';
        setCoaFormDisabled(true);
        document.getElementById('coa-form-actions').style.display = 'none';
        document.getElementById('btn-coa-add').disabled = false;
        await showCoaDetail(selectedCoaCode);
    });

    document.getElementById('btn-coa-delete').addEventListener('click', async () => {
        if (!selectedCoaCode) return;
        
        const hasChild = accountsGlobalList.some(a => a.parentCode === selectedCoaCode);
        const isCore = ['1000-00', '1100-00', '1110-00', '1111-00', '1112-00', '1120-00', '1121-00', '2000-00', '2100-00', '2110-00', '2111-00', '3000-00', '4000-00', '5000-00', '9999-99'].includes(selectedCoaCode);
        
        if (hasChild) {
            alert('ไม่สามารถลบบัญชีนี้ได้ เนื่องจากมีบัญชีย่อยอยู่ภายใต้โครงสร้างนี้');
            return;
        }
        if (isCore) {
            alert('ไม่สามารถลบบัญชีนี้ได้ เนื่องจากเป็นบัญชีหลักของระบบ');
            return;
        }
        
        if (confirm(`คุณต้องการลบผังบัญชี ${selectedCoaCode} นี้ออกจากระบบใช่หรือไม่?`)) {
            try {
                await db.deleteItem('accounts', selectedCoaCode);
                showToast('ลบรหัสบัญชีเรียบร้อยแล้ว');
                selectedCoaCode = '';
                await renderAccounts();
            } catch (err) {
                console.error('Error deleting account:', err);
                showToast('เกิดข้อผิดพลาดในการลบบัญชี: ' + err.message, 'error');
            }
        }
    });

    document.getElementById('btn-coa-print')?.addEventListener('click', () => {
        const catMap = { 
            'asset': '1 - สินทรัพย์', 'liability': '2 - หนี้สิน', 'equity': '3 - ส่วนของเจ้าของ', 'revenue': '4 - รายได้', 'expense': '5 - ค่าใช้จ่าย',
            '1': '1 - สินทรัพย์', '2': '2 - หนี้สิน', '3': '3 - ส่วนของเจ้าของ', '4': '4 - รายได้', '5': '5 - ค่าใช้จ่าย' 
        };
        let tableHtml = `
        <html><head><title>รายงานผังบัญชี (Chart of Accounts)</title>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Sarabun', sans-serif; padding: 20px; font-size: 14px; color: #333; }
            h2 { text-align: center; margin-bottom: 20px; font-weight: 600; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f8f9fa; font-weight: 600; text-align: center; }
            .lvl-1 { font-weight: bold; background-color: #f1f5f9; }
            .lvl-2 { padding-left: 20px !important; }
            .lvl-3 { padding-left: 40px !important; }
            @media print {
                button { display: none; }
                @page { margin: 1.5cm; }
            }
        </style>
        </head><body>
        <h2>รายงานผังบัญชี (Chart of Accounts)</h2>
        <div style="text-align:right; margin-bottom: 10px;">
            <button onclick="window.print()" style="padding: 6px 16px; cursor: pointer; background: #0d6efd; color: white; border: none; border-radius: 4px;">พิมพ์รายงาน (Print)</button>
        </div>
        <table>
            <thead>
                <tr>
                    <th style="width: 15%">รหัสบัญชี</th>
                    <th style="width: 35%">ชื่อบัญชี (ภาษาไทย)</th>
                    <th style="width: 25%">ชื่อบัญชี (ภาษาอังกฤษ)</th>
                    <th style="width: 15%">หมวดหมู่</th>
                    <th style="width: 10%">ระดับ</th>
                </tr>
            </thead>
            <tbody>
        `;

        const sortedAccounts = [...accountsGlobalList].sort((a, b) => a.code.localeCompare(b.code));
        
        sortedAccounts.forEach(acc => {
            let nameTh = acc.name || acc.name_th || acc.accountName || acc.account_name || '';
            let nameEn = acc.nameEn || acc.name_en || acc.accountNameEn || acc.account_name_en || '';
            let cat = (acc.category || '').toString().trim().toLowerCase();
            let catText = catMap[cat] || acc.category;
            let lvlClass = 'lvl-1';
            if (acc.level == 2 || (acc.parentCode && !acc.level) || (acc.parent_code && !acc.level)) lvlClass = 'lvl-2';
            if (acc.level >= 3) lvlClass = 'lvl-3';
            
            tableHtml += `
                <tr class="${lvlClass}">
                    <td>${acc.code}</td>
                    <td class="${lvlClass}">${nameTh}</td>
                    <td>${nameEn}</td>
                    <td style="text-align:center;">${catText}</td>
                    <td style="text-align:center;">${acc.level || 1}</td>
                </tr>
            `;
        });

        tableHtml += `</tbody></table></body></html>`;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(tableHtml);
            printWindow.document.close();
            setTimeout(() => { printWindow.print(); }, 800);
        } else {
            alert("กรุณาอนุญาต Pop-ups สำหรับเว็บไซต์นี้เพื่อแสดงหน้าพิมพ์รายงานครับ");
        }
    });

    document.getElementById('btn-coa-copy-to-company').addEventListener('click', async () => {
        const activeCode = db.getActiveCompanyCode();
        try {
            const companies = await db.getCompanies();
            const activeCompany = companies.find(c => c.code === activeCode);
            document.getElementById('coa-copy-from-company-name').value = activeCompany ? `${activeCompany.name} (${activeCompany.code})` : activeCode;
            
            const selectEl = document.getElementById('coa-copy-to-company-select');
            selectEl.innerHTML = '';
            
            const otherCompanies = companies.filter(c => c.code !== activeCode);
            if (otherCompanies.length === 0) {
                alert('ไม่พบข้อมูลบริษัทอื่นในระบบ กรุณาเพิ่มบริษัทอื่นก่อนเพื่อคัดลอกผังบัญชี');
                return;
            }
            
            otherCompanies.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.code;
                opt.textContent = `${c.name} (${c.code})`;
                selectEl.appendChild(opt);
            });
            
            openModal('modal-coa-copy-to-company');
        } catch (err) {
            console.error('Error loading companies for copy:', err);
            alert('เกิดข้อผิดพลาดในการโหลดข้อมูลบริษัท: ' + err.message);
        }
    });

    document.getElementById('coa-copy-to-company-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fromCompanyCode = db.getActiveCompanyCode();
        const toCompanyCode = document.getElementById('coa-copy-to-company-select').value;
        if (!toCompanyCode) return;
        
        if (confirm(`คำเตือน: คุณแน่ใจหรือไม่ที่จะคัดลอกผังบัญชีไปยังบริษัทปลายทาง (${toCompanyCode})?\nการดำเนินการนี้จะลบข้อมูลผังบัญชีเดิมทั้งหมดของบริษัทดังกล่าว!`)) {
            try {
                await db.copyCoaToCompany(fromCompanyCode, toCompanyCode);
                showToast('คัดลอกผังบัญชีเรียบร้อยแล้ว');
                closeModal('modal-coa-copy-to-company');
            } catch (err) {
                console.error('Error copying COA:', err);
                showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
            }
        }
    });

    // Form Parent Selection Change
    document.getElementById('coa-parent').addEventListener('change', (e) => {
        const parentCode = e.target.value;
        const levelInput = document.getElementById('coa-level');
        if (!parentCode) {
            levelInput.value = 1;
        } else {
            const parentAcc = accountsGlobalList.find(a => a.code === parentCode);
            levelInput.value = parentAcc ? (parentAcc.level || 1) + 1 : 1;
        }
    });

    // Form Save
    document.getElementById('coa-detail-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = document.getElementById('coa-code').value.trim();
        const name = document.getElementById('coa-name').value.trim();
        const nameEn = document.getElementById('coa-name-en').value.trim();
        const parentCode = document.getElementById('coa-parent').value;
        const level = parseInt(document.getElementById('coa-level').value) || 1;
        const category = document.getElementById('coa-group').value;
        const type = document.getElementById('coa-type').value;
        const dept = document.getElementById('coa-dept').value;
        
        if (coaMode === 'add') {
            const codeRegex = /^[a-zA-Z0-9-]+$/;
            if (!codeRegex.test(code)) {
                alert('รหัสบัญชีสามารถประกอบด้วยตัวเลข ตัวอักษร และเครื่องหมายขีด (-) เท่านั้น');
                return;
            }
            const existing = accountsGlobalList.find(a => a.code === code);
            if (existing) {
                alert('รหัสบัญชีนี้มีอยู่แล้วในระบบ! โปรดระบุรหัสอื่น');
                return;
            }
            const newAccount = { code, name, nameEn, parentCode, level, category, type, dept };
            await db.putItem('accounts', newAccount);
            showToast('เพิ่มผังบัญชีเรียบร้อยแล้ว');
            selectedCoaCode = code;
        } else if (coaMode === 'edit') {
            if (code !== selectedCoaCode) {
                const codeRegex = /^[a-zA-Z0-9-]+$/;
                if (!codeRegex.test(code)) {
                    alert('รหัสบัญชีสามารถประกอบด้วยตัวเลข ตัวอักษร และเครื่องหมายขีด (-) เท่านั้น');
                    return;
                }
                const existing = accountsGlobalList.find(a => a.code === code);
                if (existing) {
                    alert('รหัสบัญชีนี้มีอยู่แล้วในระบบ! โปรดระบุรหัสอื่น');
                    return;
                }
                if (!confirm(`คุณต้องการเปลี่ยนเลขที่บัญชีจาก ${selectedCoaCode} เป็น ${code} ใช่หรือไม่?\nการดำเนินการนี้จะเปลี่ยนเลขที่บัญชีในเอกสารและประวัติธุรกรรมในอดีตทั้งหมดด้วย`)) {
                    return;
                }
                try {
                    await db.renameAccount(selectedCoaCode, code);
                    const updatedAccount = { code, name, nameEn, parentCode, level, category, type, dept };
                    await db.putItem('accounts', updatedAccount);
                    showToast('เปลี่ยนเลขที่บัญชีและปรับปรุงเอกสารเรียบร้อยแล้ว');
                    selectedCoaCode = code;
                } catch (err) {
                    alert('เกิดข้อผิดพลาดในการเปลี่ยนเลขที่บัญชี: ' + err.message);
                    return;
                }
            } else {
                const updatedAccount = { code: selectedCoaCode, name, nameEn, parentCode, level, category, type, dept };
                await db.putItem('accounts', updatedAccount);
                showToast('แก้ไขข้อมูลบัญชีเรียบร้อยแล้ว');
            }
        }
        
        coaMode = 'view';
        setCoaFormDisabled(true);
        document.getElementById('coa-form-actions').style.display = 'none';
        document.getElementById('btn-coa-add').disabled = false;
        await renderAccounts();
    });

    // Search
    document.getElementById('coa-search').addEventListener('input', () => {
        renderTreeOnly();
    });

    // 3. Journal Entry modal
    document.getElementById('btn-add-journal-modal').addEventListener('click', () => {
        initJournalModalForm();
        openModal('modal-add-journal');
    });

    document.getElementById('btn-jv-add-row').addEventListener('click', addJournalFormRow);

    document.getElementById('add-journal-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const date = document.getElementById('jv-date').value;
        const reference = document.getElementById('jv-reference').value;
        const description = document.getElementById('jv-description').value;
        
        const lines = [];
        let hasErrors = false;
        
        document.querySelectorAll('#jv-lines-tbody tr').forEach(tr => {
            const accountCode = tr.querySelector('.jv-line-account').value;
            const debit = parseFloat(tr.querySelector('.jv-line-debit').value) || 0;
            const credit = parseFloat(tr.querySelector('.jv-line-credit').value) || 0;
            
            if (debit === 0 && credit === 0) {
                // Skip completely blank rows, but if only one is filled, it's ok
                return;
            }
            
            lines.push({ accountCode, debit, credit });
        });

        if (lines.length < 2) {
            alert('รายการบัญชีต้องมีอย่างน้อย 2 แถวเพื่อบันทึกเดบิตและเครดิต!');
            return;
        }

        // Sum verification
        const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
        const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

        if (Math.abs(totalDebit - totalCredit) >= 0.01) {
            alert('ยอดเดบิตและเครดิตต้องเท่ากันจึงจะสามารถทำการลงบัญชีได้!');
            return;
        }

        const jv = {
            date,
            description,
            reference,
            lines,
            vatType: 'none',
            vatAmount: 0,
            whtType: 'none',
            whtAmount: 0
        };

        await db.putItem('journalEntries', jv);
        closeModal('modal-add-journal');
        showToast('บันทึกสมุดรายวันทั่วไปสำเร็จ');
        await renderJournal();
    });

    // Repost options trigger
    const btnRepostJournal = document.getElementById('btn-repost-all-journal');
    if (btnRepostJournal) {
        btnRepostJournal.addEventListener('click', () => {
            window.openModal('modal-repost-options');
        });
    }

    // Modal radio button toggling
    const repostScopeRadios = document.querySelectorAll('input[name="repost-scope"]');
    repostScopeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const val = e.target.value;
            const rangeDiv = document.getElementById('repost-range-inputs');
            const singleDiv = document.getElementById('repost-single-inputs');
            
            if (val === 'range') {
                if (rangeDiv) rangeDiv.style.display = 'flex';
                if (singleDiv) singleDiv.style.display = 'none';
            } else if (val === 'single') {
                if (rangeDiv) rangeDiv.style.display = 'none';
                if (singleDiv) singleDiv.style.display = 'flex';
            } else {
                if (rangeDiv) rangeDiv.style.display = 'none';
                if (singleDiv) singleDiv.style.display = 'none';
            }
        });
    });

    // Modal form submit
    const repostForm = document.getElementById('repost-options-form');
    if (repostForm) {
        repostForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const scope = document.querySelector('input[name="repost-scope"]:checked').value;
            const startDate = document.getElementById('repost-date-start').value;
            const endDate = document.getElementById('repost-date-end').value;
            const docType = document.getElementById('repost-doc-type').value;
            const docId = document.getElementById('repost-doc-id').value.trim();
            
            if (scope === 'range' && !startDate && !endDate) {
                alert('กรุณาระบุช่วงวันที่อย่างน้อยหนึ่งช่อง');
                return;
            }
            if (scope === 'single' && !docId) {
                alert('กรุณากรอกเลขที่เอกสาร');
                return;
            }
            
            showToast('กำลังประมวลผลลงบัญชีใหม่...', 'info');
            try {
                await store.repostTransactions({ scope, startDate, endDate, docType, docId });
                showToast('ลงบัญชีใหม่สำเร็จเรียบร้อยแล้ว', 'success');
                closeModal('modal-repost-options');
                await renderJournal();
            } catch (err) {
                console.error(err);
                showToast(err.message || 'เกิดข้อผิดพลาดในการลงบัญชีใหม่', 'error');
            }
        });
    }

    // Journal filter
    document.getElementById('btn-journal-filter').addEventListener('click', async () => {
        const start = document.getElementById('journal-filter-start').value;
        const end = document.getElementById('journal-filter-end').value;
        const search = document.getElementById('journal-filter-search').value.toLowerCase();
        
        let entries = await db.getJournalEntriesRange(start || null, end || null);
        
        if (search) {
            entries = entries.filter(e => 
                e.description.toLowerCase().includes(search) || 
                e.reference.toLowerCase().includes(search)
            );
        }

        // Sort descending
        entries.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
        
        document.getElementById('journal-pagination-info').innerText = `พบรายการคัดกรอง ${entries.length} รายการ`;
        await renderJournal(entries);
    });

    // 4. Ledger generators
    const btnLedger = document.getElementById('btn-ledger-generate');
    if (btnLedger) {
        btnLedger.addEventListener('click', async () => {
            const startCode = document.getElementById('ledger-account-start').value;
            const endCode = document.getElementById('ledger-account-end').value;
            await renderLedger(startCode, endCode);
        });
    }

    // 5. Trial balance generators
    document.getElementById('btn-tb-generate').addEventListener('click', async () => {
        await renderTrialBalance();
    });

    // 6. Profit and loss generators
    document.getElementById('btn-pl-generate').addEventListener('click', async () => {
        await renderProfitLoss();
    });
    document.getElementById('pl-display-mode')?.addEventListener('change', async () => {
        await renderProfitLoss();
    });

    // 7. Balance sheet generators
    document.getElementById('btn-bs-generate').addEventListener('click', async () => {
        await renderBalanceSheet();
    });
    document.getElementById('bs-display-mode')?.addEventListener('change', async () => {
        await renderBalanceSheet();
    });

    // 8. Invoices and Bills View actions
    // Sub-tab toggling
    document.getElementById('subtab-invoice-btn').addEventListener('click', () => {
        document.getElementById('subtab-invoice-btn').className = 'btn btn-primary';
        document.getElementById('subtab-bill-btn').className = 'btn btn-secondary';
        document.getElementById('subtab-expense-catalog-btn').className = 'btn btn-secondary';
        document.getElementById('subsection-invoices').style.display = 'block';
        document.getElementById('subsection-bills').style.display = 'none';
        document.getElementById('subsection-expense-catalog').style.display = 'none';
    });

    document.getElementById('subtab-bill-btn').addEventListener('click', () => {
        document.getElementById('subtab-invoice-btn').className = 'btn btn-secondary';
        document.getElementById('subtab-bill-btn').className = 'btn btn-primary';
        document.getElementById('subtab-expense-catalog-btn').className = 'btn btn-secondary';
        document.getElementById('subsection-invoices').style.display = 'none';
        document.getElementById('subsection-bills').style.display = 'block';
        document.getElementById('subsection-expense-catalog').style.display = 'none';
    });

    document.getElementById('subtab-expense-catalog-btn').addEventListener('click', async () => {
        document.getElementById('subtab-invoice-btn').className = 'btn btn-secondary';
        document.getElementById('subtab-bill-btn').className = 'btn btn-secondary';
        document.getElementById('subtab-expense-catalog-btn').className = 'btn btn-primary';
        document.getElementById('subsection-invoices').style.display = 'none';
        document.getElementById('subsection-bills').style.display = 'none';
        document.getElementById('subsection-expense-catalog').style.display = 'block';
        await renderExpenseCatalog();
    });

    // 8.2 Expense Catalog Form actions
    const expCatalogForm = document.getElementById('expense-catalog-form');
    if (expCatalogForm) {
        expCatalogForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const code = document.getElementById('exp-code').value.trim();
            const name = document.getElementById('exp-name').value.trim();
            const nameEn = document.getElementById('exp-name-en').value.trim();
            const category = document.getElementById('exp-category').value.trim() || '01';
            const unit = document.getElementById('exp-unit').value.trim() || 'ครั้ง';
            const vatType = document.getElementById('exp-vat-type').value;
            const amount = parseFloat(document.getElementById('exp-amount').value) || 0.00;
            const remarks = document.getElementById('exp-remarks').value.trim();
            const accountCode = document.getElementById('exp-account').value;

            if (!accountCode) {
                alert('โปรดเลือกบัญชีเดบิตค่าใช้จ่ายสำหรับสอดคล้องกับรหัสนี้');
                return;
            }

            if (!currentExpEditCode) {
                const existing = await db.getByKey('expenseCatalog', code);
                if (existing) {
                    alert('รหัสค่าใช้จ่ายนี้มีอยู่แล้วในระบบ! โปรดระบุรหัสอื่น');
                    return;
                }
            }

            const item = { code, name, nameEn, category, unit, vatType, amount, remarks, accountCode };
            await db.putItem('expenseCatalog', item);
            showToast(currentExpEditCode ? 'แก้ไขข้อมูลแม่แบบเรียบร้อยแล้ว' : 'เพิ่มรหัสค่าใช้จ่ายใหม่เรียบร้อยแล้ว');
            
            clearExpenseCatalogForm();
            _expenseCatalog = []; // clear cache
            await renderExpenseCatalog();
            
            // Reload the bills dropdown options
            const latestTemplates = await db.getAll('expenseCatalog');
            const billExpenseAccountSelect = document.getElementById('bill-expense-account');
            if (billExpenseAccountSelect) {
                if (window.jQuery && window.jQuery(billExpenseAccountSelect).hasClass('select2-hidden-accessible')) {
                    window.jQuery(billExpenseAccountSelect).select2('destroy');
                }
                billExpenseAccountSelect.innerHTML = latestTemplates.map(t => `<option value="${t.code}">${t.code} - ${t.name} (${t.accountCode})</option>`).join('');
                if (window.jQuery) {
                    window.jQuery(billExpenseAccountSelect).select2({ width: '100%', dropdownAutoWidth: true });
                }
            }
            
            // Also update all existing dynamic rows in the bill form
            document.querySelectorAll('.bill-item-code').forEach(select => {
                const currentVal = select.value;
                let html = '<option value="">-- เลือกค่าใช้จ่าย --</option>';
                latestTemplates.forEach(t => {
                    html += `<option value="${t.code}" ${t.code === currentVal ? 'selected' : ''}>${t.code} - ${t.name}</option>`;
                });
                select.innerHTML = html;
            });
        });

        document.getElementById('btn-exp-cancel').addEventListener('click', () => {
            clearExpenseCatalogForm();
        });
    }

    // AP Payments form logic
    const apSuppSelect = document.getElementById('ap-supplier-select');
    if (apSuppSelect) {
        apSuppSelect.addEventListener('change', async () => {
            const supplierId = apSuppSelect.value;
            const supplierOpt = apSuppSelect.selectedOptions[0];
            const supplierName = supplierOpt && supplierOpt.value !== "" ? supplierOpt.textContent : '';
            
            const tbody = document.getElementById('ap-bills-tbody');
            if (!tbody) return;
            tbody.innerHTML = '';
            
            if (!supplierId) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">เลือกรายชื่อเจ้าหนี้เพื่อแสดงยอดค้างชำระ</td></tr>';
                recalculateAP();
                return;
            }
            
            let editingPs = null;
            if (editingPaymentId) {
                editingPs = await db.getByKey('apPayments', editingPaymentId);
            }
            
            const allBills = await db.getAll('bills');
            const supplierBills = allBills.filter(bill => {
                const isPaidByThis = editingPs && editingPs.billLines.some(l => l.billId === bill.id);
                return bill.vendorName === supplierName && (bill.status === 'unpaid' || bill.status === 'partial' || isPaidByThis);
            });
            
            if (supplierBills.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">ไม่มีบิลค้างรับเจ้าหนี้</td></tr>';
                recalculateAP();
                return;
            }
            
            supplierBills.forEach(bill => {
                let outstanding = bill.outstanding !== undefined ? bill.outstanding : bill.totalAmount;
                let paidByThis = 0;
                if (editingPs) {
                    const line = editingPs.billLines.find(l => l.billId === bill.id);
                    if (line) {
                        paidByThis = line.amount;
                        outstanding += paidByThis;
                    }
                }
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${bill.id}</strong></td>
                    <td>${formatDateToDDMMYYYY(bill.date)}</td>
                    <td>${bill.dueDate || '-'}</td>
                    <td class="num-col" data-outstanding="${outstanding}" style="text-align: right;">${formatMoney(outstanding)} ฿</td>
                    <td>
                        <input type="number" class="form-control num-col ap-pay-input" data-id="${bill.id}" value="${paidByThis > 0 ? paidByThis.toFixed(2) : '0.00'}" min="0" max="${outstanding}" step="0.01" style="width: 100%; text-align: right;">
                    </td>
                    <td style="text-align: center;">
                        <input type="checkbox" class="ap-full-chk" data-id="${bill.id}" ${paidByThis > 0 && Math.abs(paidByThis - outstanding) < 0.01 ? 'checked' : ''} style="width: 18px; height: 18px;">
                    </td>
                `;
                tbody.appendChild(tr);
            });
            
            // Bind event listeners for inputs
            document.querySelectorAll('.ap-pay-input').forEach(input => {
                input.addEventListener('input', () => {
                    const id = input.getAttribute('data-id');
                    const maxVal = parseFloat(input.getAttribute('max'));
                    let val = parseFloat(input.value) || 0;
                    if (val > maxVal) {
                        val = maxVal;
                        input.value = maxVal.toFixed(2);
                    }
                    if (val < 0) {
                        val = 0;
                        input.value = '0.00';
                    }
                    
                    // Update checkbox
                    const chk = document.querySelector(`.ap-full-chk[data-id="${id}"]`);
                    if (chk) {
                        chk.checked = Math.abs(val - maxVal) < 0.01;
                    }
                    recalculateAP();
                });
            });
            
            document.querySelectorAll('.ap-full-chk').forEach(chk => {
                chk.addEventListener('change', () => {
                    const id = chk.getAttribute('data-id');
                    const input = document.querySelector(`.ap-pay-input[data-id="${id}"]`);
                    if (input) {
                        const maxVal = parseFloat(input.getAttribute('max'));
                        input.value = chk.checked ? maxVal.toFixed(2) : '0.00';
                    }
                    recalculateAP();
                });
            });
            
            recalculateAP();
        });
    }

    // Bill Predefined Expense Selection Change
    // Bill Predefined Expense Selection Change
    const billExpenseAccountSelect = document.getElementById('bill-expense-account');
    if (billExpenseAccountSelect) {
        billExpenseAccountSelect.addEventListener('change', async (e) => {
            const code = e.target.value;
            const templates = await db.getAll('expenseCatalog');
            const template = templates.find(t => t.code === code);
            if (template) {
                const tbody = document.getElementById('bill-items-tbody');
                const rows = tbody ? tbody.querySelectorAll('.bill-item-row') : [];
                let targetRow = null;
                if (rows.length === 1) {
                    const firstRow = rows[0];
                    const descVal = firstRow.querySelector('.bill-item-desc')?.value;
                    const priceVal = parseFloat(firstRow.querySelector('.bill-item-price')?.value) || 0;
                    if (!descVal && priceVal === 0) {
                        targetRow = firstRow;
                    }
                }
                
                if (targetRow) {
                    const codeEl = targetRow.querySelector('.bill-item-code');
                    if (codeEl) codeEl.value = template.code;
                    const descEl = targetRow.querySelector('.bill-item-desc');
                    if (descEl) descEl.value = template.name;
                    const priceEl = targetRow.querySelector('.bill-item-price');
                    if (priceEl) priceEl.value = template.amount || 0;
                    const qtyEl = targetRow.querySelector('.bill-item-qty');
                    if (qtyEl) qtyEl.value = 1;
                    const amtCell = targetRow.querySelector('.bill-item-amount');
                    if (amtCell) amtCell.innerText = formatMoney(template.amount || 0) + ' ฿';
                } else {
                    addBillItemRow(template.code, 1, template.amount || 0);
                }
                
                const vatRateSelect = document.getElementById('bill-vat-rate');
                if (vatRateSelect) {
                    vatRateSelect.value = template.vatType || 'none';
                }
                recalculateBill();
            }
        });
    }

    // Bill Form Change calculations & bindings
    document.getElementById('bill-vat-rate')?.addEventListener('change', recalculateBill);
    document.getElementById('bill-wht-rate')?.addEventListener('change', (e) => {
        const typeRow = document.getElementById('bill-summary-wht-type-row');
        if (typeRow) {
            typeRow.style.display = e.target.value === 'none' ? 'none' : 'flex';
        }
        recalculateBill();
    });

    // Add item/payment buttons for bills
    document.getElementById('add-bill-item-btn')?.addEventListener('click', () => addBillItemRow());
    document.getElementById('quick-add-expense-catalog-btn')?.addEventListener('click', () => {
        if (typeof window.openQuickAddExpenseCatalog === 'function') {
            window.openQuickAddExpenseCatalog();
        }
    });
    document.getElementById('btn-quick-add-vendor-bill')?.addEventListener('click', () => {
        if (typeof window.openQuickAddVendorBill === 'function') {
            window.openQuickAddVendorBill();
        }
    });    document.getElementById('add-bill-payment-btn')?.addEventListener('click', () => {
        const grandText = document.getElementById('bill-summary-grand')?.innerText || '0';
        const grand = parseFloat(grandText.replace(/[^0-9.-]/g, '')) || 0;
        let totalPaid = 0;
        document.querySelectorAll('#bill-payments-tbody .bill-payment-row').forEach(row => {
            totalPaid += parseFloat(row.querySelector('.bill-payment-amount')?.value) || 0;
        });
        const remaining = Math.max(0, grand - totalPaid);
        addBillPaymentRow('', '', remaining, '');
    });

    // Invoice Form Change calculations & bindings
    document.getElementById('inv-vat-rate')?.addEventListener('change', recalculateInvoice);
    document.getElementById('inv-wht-rate')?.addEventListener('change', (e) => {
        const typeRow = document.getElementById('inv-summary-wht-type-row');
        if (typeRow) {
            typeRow.style.display = e.target.value === 'none' ? 'none' : 'flex';
        }
        recalculateInvoice();
    });
    document.getElementById('inv-status')?.addEventListener('change', (e) => {
        const pSection = document.getElementById('invoice-payments-section');
        if (pSection) {
            pSection.style.display = e.target.value === 'paid' ? 'block' : 'none';
        }
        recalculateInvoice();
    });

    // Bill description cascade
    const billDescEl = document.getElementById('bill-description');
    if (billDescEl) {
        window.previousBillDesc = billDescEl.value || '';
        billDescEl.addEventListener('input', (e) => {
            const current = e.target.value;
            document.querySelectorAll('.bill-item-desc').forEach(el => {
                if (!el.value || el.value === window.previousBillDesc) {
                    el.value = current;
                }
            });
            window.previousBillDesc = current;
        });
    }

    // Add item/payment buttons for invoices
    document.getElementById('add-inv-item-btn')?.addEventListener('click', () => addInvoiceItemRow());
    document.getElementById('add-inv-payment-btn')?.addEventListener('click', () => {
        const grandText = document.getElementById('inv-summary-grand')?.innerText || '0';
        const grand = parseFloat(grandText.replace(/[^0-9.-]/g, '')) || 0;
        let totalPaid = 0;
        document.querySelectorAll('#invoice-payments-tbody .invoice-payment-row').forEach(row => {
            totalPaid += parseFloat(row.querySelector('.invoice-payment-amount')?.value) || 0;
        });
        const remaining = Math.max(0, grand - totalPaid);
        addInvoicePaymentRow('', '', remaining, '');
    });

    // Invoice Form Submission
    document.getElementById('invoice-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const customerName = document.getElementById('inv-customer-name').value;
        const taxId = document.getElementById('inv-tax-id').value;
        const address = document.getElementById('inv-address').value;
        const date = document.getElementById('inv-date').value;
        const dueDate = document.getElementById('inv-due-date').value;
        const status = document.getElementById('inv-status').value;
        
        // Collect ALL item rows
        const items = [];
        document.querySelectorAll('#invoice-items-tbody .invoice-item-row').forEach(row => {
            const desc = row.querySelector('.invoice-item-desc')?.value || '';
            const qty = parseFloat(row.querySelector('.invoice-item-qty')?.value) || 0;
            const price = parseFloat(row.querySelector('.invoice-item-price')?.value) || 0;
            const hasVat = row.querySelector('.invoice-item-vat')?.checked || false;
            const whtRate = row.querySelector('.invoice-item-wht')?.value || 'none';
            if (desc || price) {
                items.push({ 
                    description: desc, 
                    quantity: qty, 
                    unitPrice: price, 
                    amount: Math.round(qty * price * 100) / 100,
                    hasVat,
                    whtRate
                });
            }
        });
        if (items.length === 0) {
            showToast('กรุณาใส่รายการสินค้า/บริการอย่างน้อย 1 รายการ', 'error');
            return;
        }

        const vatRateSelect = document.getElementById('inv-vat-rate').value;
        const whtRateSelect = document.getElementById('inv-wht-rate').value;
        
        let vatAmount = 0;
        let whtAmount = 0;
        items.forEach(it => {
            if (it.hasVat) {
                vatAmount += Math.round(it.amount * 0.07 * 100) / 100;
            }
            if (it.whtRate && it.whtRate !== 'none') {
                const rate = parseFloat(it.whtRate) || 0;
                whtAmount += Math.round(it.amount * (rate / 100) * 100) / 100;
            }
        });
        vatAmount = Math.round(vatAmount * 100) / 100;
        whtAmount = Math.round(whtAmount * 100) / 100;

        const subtotal = items.reduce((s, it) => s + it.amount, 0);
        const grandTotal = subtotal + vatAmount - whtAmount;
        
        const firstWhtItem = items.find(it => it.whtRate && it.whtRate !== 'none');
        const whtRate = firstWhtItem ? parseFloat(firstWhtItem.whtRate) : 0;
        
        const whtTypeSelectEl = document.getElementById('inv-wht-type');
        const whtType = whtRate > 0 && whtTypeSelectEl ? whtTypeSelectEl.value : 'none';
        
        // Collect ALL payment rows
        const payments = [];
        if (status === 'paid') {
            document.querySelectorAll('#invoice-payments-tbody .invoice-payment-row').forEach(row => {
                const pDate = row.querySelector('.invoice-payment-date')?.value || date;
                const pAccount = row.querySelector('.invoice-payment-account')?.value || '';
                const pAmount = parseFloat(row.querySelector('.invoice-payment-amount')?.value) || 0;
                const pRef = row.querySelector('.invoice-payment-ref')?.value || '';
                if (pAmount > 0) {
                    payments.push({ date: pDate, account: pAccount, amount: pAmount, reference: pRef });
                }
            });
        }
        
        const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
        const paymentAccount = payments.length > 0 ? payments[0].account : '';
        
        let invoiceId = editingInvoiceId;
        let journalId = '';
        if (invoiceId) {
            const oldInv = await db.getByKey('invoices', invoiceId);
            if (oldInv) {
                journalId = oldInv.journalId || '';
            }
        } else {
            invoiceId = 'INV-' + Date.now().toString().slice(-8);
        }

        const invoice = {
            id: invoiceId,
            date,
            dueDate,
            customerName,
            taxId,
            address,
            items,
            payments,
            subtotal,
            vatRate: vatRateSelect === '7' ? 7 : 0,
            vatAmount,
            whtRate,
            whtType,
            whtAmount,
            grandTotal,
            status, // 'paid' or 'unpaid'
            outstanding: status === 'paid' ? Math.max(0, grandTotal - totalPaid) : grandTotal,
            amountPaid: status === 'paid' ? totalPaid : 0,
            paymentAccount,
            journalId: journalId
        };

        // Save invoice and post to journal
        await db.putItem('invoices', invoice);
        await store.postInvoiceToJournal(invoice);
        await logStockTransactionsFromDocument('invoice', invoiceId, date, customerName, invoice.items);
        
        resetInvoiceForm();
        setFormEditMode('invoice-form', false, null);
        showToast(`บันทึกใบแจ้งหนี้ ${invoiceId} และลงรายวันทั่วไปเรียบร้อยแล้ว`);
        await renderInvoicesView();
    });

    // Global generateBillId function
    window.generateBillId = async (dateStr) => {
        const yy = dateStr.substring(2, 4);
        const mm = dateStr.substring(5, 7);
        const dd = dateStr.substring(8, 10);
        const prefix = 'EX' + yy + mm + '-' + dd;
        const allBills = await db.getAll('bills');
        const billsOnDate = allBills.filter(b => b.id && b.id.startsWith(prefix));
        const maxSeq = billsOnDate.reduce((max, b) => {
            const seq = parseInt(b.id.substring(prefix.length));
            return isNaN(seq) ? max : Math.max(max, seq);
        }, 0);
        return prefix + String(maxSeq + 1).padStart(2, '0');
    };

    // Bill Form Submission
    document.getElementById('bill-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const vendorName = document.getElementById('bill-vendor-name').value;
        const taxId = document.getElementById('bill-tax-id').value;
        const address = (document.getElementById('bill-address') || {}).value || '';
        const docNo = (document.getElementById('bill-doc-no') || {}).value || '';
        const date = document.getElementById('bill-date').value;
        const paymentDate = date; // fallback paymentDate is now just the bill date
        const templateCodeEl = document.getElementById('bill-expense-account');
    const templateCode = templateCodeEl ? templateCodeEl.value : (document.querySelector('.bill-item-code')?.value || '');
        const templates = await db.getAll('expenseCatalog');
        const template = templates.find(t => t.code === templateCode);
        const expenseAccount = template ? template.accountCode : '5250-00';
        
        // Collect ALL item rows
        const items = [];
        document.querySelectorAll('#bill-items-tbody .bill-item-row').forEach(row => {
            const code = row.querySelector('.bill-item-code')?.value || '';
            const desc = row.querySelector('.bill-item-desc')?.value || '';
            const qty = parseFloat(row.querySelector('.bill-item-qty')?.value) || 0;
            const price = parseFloat(row.querySelector('.bill-item-price')?.value) || 0;
            const hasVat = row.querySelector('.bill-item-vat')?.checked || false;
            const whtRate = row.querySelector('.bill-item-wht')?.value || 'none';
            if (code || desc || price) {
                items.push({ 
                    code: code,
                    description: desc, 
                    quantity: qty, 
                    unitPrice: price, 
                    amount: Math.round(qty * price * 100) / 100,
                    hasVat,
                    whtRate
                });
            }
        });
        if (items.length === 0) {
            showToast('กรุณาใส่รายการจ่ายอย่างน้อย 1 รายการ', 'error');
            return;
        }
        
        const vatRateSelect = document.getElementById('bill-vat-rate').value;
        const whtRateSelect = document.getElementById('bill-wht-rate').value;
        
        let vatAmount = 0;
        let whtAmount = 0;
        items.forEach(it => {
            if (it.hasVat) {
                vatAmount += Math.round(it.amount * 0.07 * 100) / 100;
            }
            if (it.whtRate && it.whtRate !== 'none') {
                const rate = parseFloat(it.whtRate) || 0;
                whtAmount += Math.round(it.amount * (rate / 100) * 100) / 100;
            }
        });
        vatAmount = Math.round(vatAmount * 100) / 100;
        whtAmount = Math.round(whtAmount * 100) / 100;

        const subtotal = items.reduce((s, it) => s + it.amount, 0);
        const totalAmount = subtotal + vatAmount - whtAmount;
        
        const firstWhtItem = items.find(it => it.whtRate && it.whtRate !== 'none');
        const whtRate = firstWhtItem ? parseFloat(firstWhtItem.whtRate) : 0;
        
        const whtTypeSelectEl = document.getElementById('bill-wht-type');
        const whtType = whtRate > 0 && whtTypeSelectEl ? whtTypeSelectEl.value : 'none';
        
        // Collect ALL payment rows
        const payments = [];
        document.querySelectorAll('#bill-payments-tbody .bill-payment-row').forEach(row => {
            const pDate = row.querySelector('.bill-payment-date')?.value || date;
            const pAccount = row.querySelector('.bill-payment-account')?.value || '';
            const pAmount = parseFloat(row.querySelector('.bill-payment-amount')?.value) || 0;
            const pRef = row.querySelector('.bill-payment-ref')?.value || '';
            if (pAmount > 0) {
                payments.push({ date: pDate, account: pAccount, amount: pAmount, reference: pRef });
            }
        });
        
        const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
        // Auto-calculate status
        let status = 'unpaid';
        if (totalPaid >= totalAmount && totalAmount > 0) status = 'paid';
        else if (totalPaid > 0) status = 'partial';
        
        const paymentAccount = payments.length > 0 ? payments[0].account : '';
        
        let billId = editingBillId;
        let journalId = '';
        let oldBillIdToDelete = null;

        if (billId) {
            const oldBill = await db.getByKey('bills', billId);
            if (oldBill) {
                journalId = oldBill.journalId || '';
            }
            
            const yy = date.substring(2, 4);
            const mm = date.substring(5, 7);
            const dd = date.substring(8, 10);
            const expectedPrefix = 'EX' + yy + mm + '-' + dd;
            
            if (!billId.startsWith(expectedPrefix)) {
                oldBillIdToDelete = billId;
                billId = await window.generateBillId(date);
            }
        } else {
            // Generate bill ID
            billId = await window.generateBillId(date);
        }

        const bill = {
            id: billId,
            date,
            docNo,
            paymentDate,
            vendorName,
            taxId,
            address,
            expenseAccount,
            items,
            payments,
            subtotal,
            vatRate: vatRateSelect === '7' ? 7 : 0,
            vatAmount,
            whtRate,
            whtType,
            whtAmount,
            totalAmount,
            status,
            outstanding: totalAmount - totalPaid,
            amountPaid: totalPaid,
            paymentAccount,
            journalId: journalId
        };

        // Save bill and post to journal
        await db.putItem('bills', bill);
        
        if (oldBillIdToDelete && oldBillIdToDelete !== billId) {
            try { await db.deleteItem('bills', oldBillIdToDelete); } catch(e) {}
            try { await db.deleteItem('inventoryTransactions', oldBillIdToDelete); } catch(e) {}
        }
        
        await store.postBillToJournal(bill);
        await logStockTransactionsFromDocument('bill', billId, date, vendorName, bill.items);
        
        resetBillForm();
        setFormEditMode('bill-form', false, null);
        alert(`บันทึกบิลค่าใช้จ่าย ${billId} และลงรายวันทั่วไปเรียบร้อยแล้ว`);
        showToast(`บันทึกบิลค่าใช้จ่าย ${billId} และลงรายวันทั่วไปเรียบร้อยแล้ว`);
        await renderInvoicesView();
    });


    // 8.5 Finance View Event Listeners
    // Sub-tab toggling
    const subtabArBtn = document.getElementById('subtab-ar-receipts-btn');
    const subtabApBtn = document.getElementById('subtab-ap-payments-btn');
    const subtabPmBtn = document.getElementById('subtab-payment-methods-btn');

    if (subtabArBtn) {
        subtabArBtn.addEventListener('click', () => {
            subtabArBtn.className = 'btn btn-primary';
            if (subtabApBtn) subtabApBtn.className = 'btn btn-secondary';
            if (subtabPmBtn) subtabPmBtn.className = 'btn btn-secondary';
            const secAr = document.getElementById('subsection-ar-receipts');
            const secAp = document.getElementById('subsection-ap-payments');
            const secPm = document.getElementById('subsection-payment-methods');
            if (secAr) secAr.style.display = 'block';
            if (secAp) secAp.style.display = 'none';
            if (secPm) secPm.style.display = 'none';
        });
    }

    if (subtabApBtn) {
        subtabApBtn.addEventListener('click', () => {
            if (subtabArBtn) subtabArBtn.className = 'btn btn-secondary';
            subtabApBtn.className = 'btn btn-primary';
            if (subtabPmBtn) subtabPmBtn.className = 'btn btn-secondary';
            const secAr = document.getElementById('subsection-ar-receipts');
            const secAp = document.getElementById('subsection-ap-payments');
            const secPm = document.getElementById('subsection-payment-methods');
            if (secAr) secAr.style.display = 'none';
            if (secAp) secAp.style.display = 'block';
            if (secPm) secPm.style.display = 'none';
        });
    }

    if (subtabPmBtn) {
        subtabPmBtn.addEventListener('click', async () => {
            if (subtabArBtn) subtabArBtn.className = 'btn btn-secondary';
            if (subtabApBtn) subtabApBtn.className = 'btn btn-secondary';
            subtabPmBtn.className = 'btn btn-primary';
            const secAr = document.getElementById('subsection-ar-receipts');
            const secAp = document.getElementById('subsection-ap-payments');
            const secPm = document.getElementById('subsection-payment-methods');
            if (secAr) secAr.style.display = 'none';
            if (secAp) secAp.style.display = 'none';
            if (secPm) secPm.style.display = 'block';
            await renderPaymentMethods();
        });
    }

    // AR Receipts form logic
    const arCustSelect = document.getElementById('ar-customer-select');
    if (arCustSelect) {
        arCustSelect.addEventListener('change', async () => {
            const customerId = arCustSelect.value;
            const customerOpt = arCustSelect.selectedOptions[0];
            const customerName = customerOpt && customerOpt.value !== "" ? customerOpt.textContent.split(' (')[0] : '';
            
            const tbody = document.getElementById('ar-invoices-tbody');
            if (!tbody) return;
            tbody.innerHTML = '';
            
            if (!customerId) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">เลือกรายชื่อลูกค้าเพื่อแสดงบิลค้างชำระ</td></tr>';
                recalculateAR();
                return;
            }
            
            let editingRe = null;
            if (editingReceiptId) {
                editingRe = await db.getByKey('arReceipts', editingReceiptId);
            }

            const allInvoices = await db.getAll('invoices');
            const customerInvoices = allInvoices.filter(inv => {
                const isPaidByThis = editingRe && editingRe.invoiceLines.some(l => l.invoiceId === inv.id);
                return inv.customerName === customerName && (inv.status === 'unpaid' || inv.status === 'partial' || isPaidByThis);
            });
            
            if (customerInvoices.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">ไม่มีรายการค้างชำระสำหรับลูกหนี้นี้</td></tr>';
                recalculateAR();
                return;
            }
            
            customerInvoices.forEach(inv => {
                let outstanding = inv.outstanding !== undefined ? inv.outstanding : inv.grandTotal;
                let paidByThis = 0;
                if (editingRe) {
                    const line = editingRe.invoiceLines.find(l => l.invoiceId === inv.id);
                    if (line) {
                        paidByThis = line.amount;
                        outstanding += paidByThis;
                    }
                }
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${inv.id}</strong></td>
                    <td>${formatDateToDDMMYYYY(inv.date)}</td>
                    <td>${inv.dueDate}</td>
                    <td class="num-col" data-outstanding="${outstanding}" style="text-align: right;">${formatMoney(outstanding)} ฿</td>
                    <td>
                        <input type="number" class="form-control num-col ar-pay-input" data-id="${inv.id}" value="${paidByThis > 0 ? paidByThis.toFixed(2) : '0.00'}" min="0" max="${outstanding}" step="0.01" style="width: 100%; text-align: right;">
                    </td>
                    <td style="text-align: center;">
                        <input type="checkbox" class="ar-full-chk" data-id="${inv.id}" ${paidByThis > 0 && Math.abs(paidByThis - outstanding) < 0.01 ? 'checked' : ''} style="width: 18px; height: 18px;">
                    </td>
                `;
                tbody.appendChild(tr);
            });
            
            // Bind event listeners for inputs
            document.querySelectorAll('.ar-pay-input').forEach(input => {
                input.addEventListener('input', () => {
                    const id = input.getAttribute('data-id');
                    const maxVal = parseFloat(input.getAttribute('max'));
                    let val = parseFloat(input.value) || 0;
                    if (val > maxVal) {
                        val = maxVal;
                        input.value = maxVal.toFixed(2);
                    }
                    if (val < 0) {
                        val = 0;
                        input.value = '0.00';
                    }
                    
                    // Update checkbox
                    const chk = document.querySelector(`.ar-full-chk[data-id="${id}"]`);
                    if (chk) {
                        chk.checked = Math.abs(val - maxVal) < 0.01;
                    }
                    recalculateAR();
                });
            });
            
            document.querySelectorAll('.ar-full-chk').forEach(chk => {
                chk.addEventListener('change', () => {
                    const id = chk.getAttribute('data-id');
                    const input = document.querySelector(`.ar-pay-input[data-id="${id}"]`);
                    if (input) {
                        const maxVal = parseFloat(input.getAttribute('max'));
                        input.value = chk.checked ? maxVal.toFixed(2) : '0.00';
                    }
                    recalculateAR();
                });
            });
            
            recalculateAR();
        });
    }

    const arCashAmt = document.getElementById('ar-cash-amount');
    if (arCashAmt) arCashAmt.addEventListener('input', recalculateAR);

    const arWhtAmt = document.getElementById('ar-wht-amount');
    if (arWhtAmt) arWhtAmt.addEventListener('input', recalculateAR);

    const arDiscAmt = document.getElementById('ar-discount-amount');
    if (arDiscAmt) arDiscAmt.addEventListener('input', recalculateAR);

    const btnArAddPmRow = document.getElementById('btn-ar-add-payment-row');
    if (btnArAddPmRow) btnArAddPmRow.addEventListener('click', () => addARPaymentRow());

    const arReceiptForm = document.getElementById('ar-receipt-form');
    if (arReceiptForm) arReceiptForm.addEventListener('submit', handleARReceiptSubmit);



    const apCashAmt = document.getElementById('ap-cash-amount');
    if (apCashAmt) apCashAmt.addEventListener('input', recalculateAP);

    const apWhtAmt = document.getElementById('ap-wht-amount');
    if (apWhtAmt) apWhtAmt.addEventListener('input', recalculateAP);

    const apDiscAmt = document.getElementById('ap-discount-amount');
    if (apDiscAmt) apDiscAmt.addEventListener('input', recalculateAP);

    const btnApAddPmRow = document.getElementById('btn-ap-add-payment-row');
    if (btnApAddPmRow) btnApAddPmRow.addEventListener('click', () => addAPPaymentRow());

    const apPaymentForm = document.getElementById('ap-payment-form');
    if (apPaymentForm) apPaymentForm.addEventListener('submit', handleAPPaymentSubmit);

    // Payment Method Form Submission
    const pmForm = document.getElementById('payment-method-form');
    if (pmForm) {
        pmForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const code = document.getElementById('pm-code').value.trim().toUpperCase();
            const name = document.getElementById('pm-name').value.trim();
            const nameEn = document.getElementById('pm-name-en').value.trim();
            const type = document.getElementById('pm-type').value;
            const accountCode = document.getElementById('pm-account').value;
            const isCheque = document.getElementById('pm-is-cheque').checked;
            const bankCode = document.getElementById('pm-bank-code').value.trim();

            if (!accountCode) {
                alert('โปรดเลือกผังบัญชีสำหรับสอดคล้องกับช่องทางเงินนี้');
                return;
            }

            if (!currentPmEditCode) {
                const existing = await db.getByKey('paymentMethods', code);
                if (existing) {
                    alert('รหัสช่องทางการเงินนี้มีอยู่แล้วในระบบ! โปรดระบุรหัสอื่น');
                    return;
                }
            }

            const item = { code, name, nameEn, type, accountCode, isCheque, bankCode };
            await db.putItem('paymentMethods', item);
            showToast(currentPmEditCode ? 'แก้ไขวิธีการชำระเงินเรียบร้อยแล้ว' : 'เพิ่มวิธีการชำระเงินเรียบร้อยแล้ว');
            clearPaymentMethodForm();
            await renderPaymentMethods();
        });
    }

    const pmClearBtn = document.getElementById('btn-pm-clear');
    if (pmClearBtn) {
        pmClearBtn.addEventListener('click', clearPaymentMethodForm);
    }

    // 9. Company Profile Submission
    document.getElementById('company-profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('settings-company-name').value;
        const taxId = document.getElementById('settings-company-tax').value;
        const address = document.getElementById('settings-company-address').value;
        const shares = parseInt(document.getElementById('settings-capital-shares').value) || 4000;
        const par = parseFloat(document.getElementById('settings-capital-par').value) || 100;
        const paid = parseFloat(document.getElementById('settings-capital-paid').value) || 25;
        
        const vatRegistered = document.getElementById('settings-company-vat-registered')?.value || 'yes';
        companyProfile = {
            key: 'company_profile',
            name,
            taxId,
            address,
            currency: 'THB',
            shares,
            par,
            paid,
            vatRegistered
        };
        
        await db.putItem('settings', companyProfile);
        updateHeaderBadge();
        showToast('บันทึกข้อมูลบริษัทเรียบร้อยแล้ว');
    });

    // 9.1 Accounting Period Submission
    const periodForm = document.getElementById('accounting-period-form');
    if (periodForm) {
        periodForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const startDate = document.getElementById('settings-period-start').value;
            const endDate = document.getElementById('settings-period-end').value;
            
            globalPeriod = {
                key: 'accounting_period',
                startDate,
                endDate
            };
            
            await db.putItem('settings', globalPeriod);
            applyPeriodToDateInputs(startDate, endDate);
            showToast('บันทึกรอบระยะเวลาบัญชีเรียบร้อยแล้ว');
            
            // Refresh current view if it is a report to apply the period immediately
            const activeSection = document.querySelector('.view-section.active');
            if (activeSection) {
                const viewName = activeSection.id.replace('view-', '');
                await switchView(viewName);
            }
        });
    }

    // 9.2 Balance Sheet Grouping Submission & Listeners
    const btnConfigureBS = document.getElementById('btn-configure-bs-groups');
    if (btnConfigureBS) {
        btnConfigureBS.addEventListener('click', () => openBSGroupsModal());
    }

    const bsForm = document.getElementById('bs-groups-form');
    if (bsForm) {
        bsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const inputs = bsForm.querySelectorAll('.bs-group-input');
            const newMapping = { key: 'balance_sheet_mapping' };
            inputs.forEach(input => {
                const key = input.getAttribute('data-key');
                const val = input.value.trim();
                newMapping[key] = val;
            });
            
            await db.putItem('settings', newMapping);
            closeModal('modal-configure-bs-groups');
            showToast('บันทึกการตั้งค่าจัดกลุ่มบัญชีเรียบร้อยแล้ว', 'success');
            await renderBalanceSheet();
        });
    }

    const bsTabs = ['current-assets', 'non-current-assets', 'current-liabilities', 'non-current-liabilities', 'equity'];
    bsTabs.forEach(t => {
        const btn = document.getElementById(`bs-tab-btn-${t}`);
        if (btn) {
            btn.addEventListener('click', () => switchBSTab(t));
        }
    });

    // 10. Database Stress simulation (100,000 entries)
    document.getElementById('btn-seed-100k').addEventListener('click', async () => {
        if (!confirm('คุณแน่ใจว่าต้องการจำลองรายการข้อมูล 100,000 รายการ? รายการสมุดรายวันเดิมทั้งหมดจะถูกลบและแทนที่ด้วยรายการจำลอง แต่อาจใช้เวลาประมาณ 5-10 วินาที')) {
            return;
        }
        
        const progressContainer = document.getElementById('seed-progress-container');
        const progressBar = document.getElementById('seed-progress-bar');
        const progressPercent = document.getElementById('seed-progress-percent');
        const progressStatus = document.getElementById('seed-progress-status');
        const seedBtn = document.getElementById('btn-seed-100k');
        
        // Disable buttons
        seedBtn.disabled = true;
        document.getElementById('btn-clear-db').disabled = true;
        
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        progressPercent.innerText = '0%';
        progressStatus.innerText = 'กำลังคำนวณและสร้างรายการโครงสร้างบัญชี...';
        
        try {
            const startTime = performance.now();
            
            // Seed transactions
            await store.seedMassiveTransactions(100000, (percent) => {
                progressBar.style.width = `${percent}%`;
                progressPercent.innerText = `${percent}%`;
                progressStatus.innerText = `บันทึกสมุดรายวันลง IndexedDB... (${(percent * 1000).toLocaleString()} / 100,000 แถว)`;
            });
            
            const endTime = performance.now();
            const durationSec = ((endTime - startTime) / 1000).toFixed(2);
            
            progressStatus.innerText = `เสร็จสิ้น! บันทึก 100,000 ธุรกรรมเรียบร้อยใน ${durationSec} วินาที`;
            showToast(`จำลองรายการธุรกรรม 100,000 สำเร็จใน ${durationSec} วินาที!`, 'success');
            
        } catch (err) {
            console.error(err);
            showToast('เกิดข้อผิดพลาดในการเขียนจำลองข้อมูล: ' + err.message, 'error');
            progressStatus.innerText = 'ล้มเหลว';
        } finally {
            seedBtn.disabled = false;
            document.getElementById('btn-clear-db').disabled = false;
        }
    });

    // 11. Clear database
    document.getElementById('btn-clear-db').addEventListener('click', async () => {
        if (confirm('คำเตือน! คุณต้องการล้างฐานข้อมูลระบบบัญชีทั้งหมดใช่หรือไม่? ข้อมูลประวัติการบันทึกบัญชี, บิล, ใบกำกับภาษี และผังบัญชีจะถูกลบออกทั้งหมดอย่างถาวร!')) {
            await db.resetDatabase();
            await store.initializeStore();
            companyProfile = await db.getByKey('settings', 'company_profile');
            updateHeaderBadge();
            
            // Hide progress
            document.getElementById('seed-progress-container').style.display = 'none';
            
            showToast('ล้างฐานข้อมูลระบบและรีเซ็ตค่าเริ่มต้นสำเร็จ');
            
            // Go to dashboard
            switchView('dashboard');
        }
    });

    // 12. Backup JSON Export (Full System: all companies, all tables)
    document.getElementById('btn-export-json').addEventListener('click', async () => {
        try {
            showToast('กำลังเตรียมข้อมูลสำรองของทุกกิจการ...', 'success');
            const backupData = await exportAllSystemData();
            
            const jsonString = JSON.stringify(backupData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `ledger_full_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showToast('ดาวน์โหลดสำรองข้อมูลของทุกกิจการสำเร็จแล้ว');
        } catch (err) {
            console.error(err);
            alert('เกิดข้อผิดพลาดในการสำรองข้อมูล: ' + err.message);
        }
    });

    document.getElementById('btn-export-all-db')?.addEventListener('click', () => {
        showToast('กำลังดาวน์โหลดฐานข้อมูลทั้งหมด (SQLite .db)...', 'success');
        const url = '/api/admin/backup-db';
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.download = `accounting_full_backup_${new Date().toISOString().split('T')[0]}.db`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });
    // 13. Backup JSON Import (Full System: all companies, all tables)
    document.getElementById('import-file-input').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const allData = JSON.parse(event.target.result);
                
                if (!allData.companies || !allData.companyData) {
                    // Try to fall back to legacy single company import
                    if (allData.accounts && allData.journalEntries && allData.settings) {
                        if (!confirm('ไฟล์นี้เป็นระบบแบบกิจการเดียวรุ่นเก่า คุณต้องการกู้คืนข้อมูลทับกิจการปัจจุบันนี้หรือไม่?')) return;
                        await db.resetDatabase();
                        await db.bulkPut('accounts', allData.accounts);
                        await db.bulkPut('journalEntries', allData.journalEntries);
                        await db.bulkPut('settings', allData.settings);
                        if (allData.invoices) await db.bulkPut('invoices', allData.invoices);
                        if (allData.bills) await db.bulkPut('bills', allData.bills);
                        if (allData.customers) await db.bulkPut('customers', allData.customers);
                        if (allData.suppliers) await db.bulkPut('suppliers', allData.suppliers);
                        
                        companyProfile = await db.getByKey('settings', 'company_profile');
                        updateHeaderBadge();
                        showToast('กู้คืนฐานข้อมูลกิจการปัจจุบันสำเร็จ');
                        switchView('dashboard');
                        return;
                    }
                    alert('รูปแบบไฟล์สำรองข้อมูล JSON ไม่ถูกต้อง ขาดฟิลด์สำคัญสำหรับการกู้คืน!');
                    return;
                }

                if (!confirm(`คุณต้องการกู้คืนข้อมูลระบบทั้งหมดใช่หรือไม่? กิจการทั้งหมดในโปรแกรมและข้อมูลบัญชีเดิมจะถูกทดแทนด้วยข้อมูลในไฟล์นี้ทั้งหมด`)) {
                    return;
                }

                await importAllSystemData(allData);
                
                companyProfile = await db.getByKey('settings', 'company_profile');
                updateHeaderBadge();
                showToast('กู้คืนระบบฐานข้อมูลของทุกกิจการสำเร็จแล้ว');
                switchView('dashboard');
            } catch (err) {
                alert('เกิดข้อผิดพลาดในการโหลดไฟล์ JSON: ' + err.message);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    });

    // --- CLOUD SYNC TRIGGERS ---
    const btnCloudPush = document.getElementById('btn-cloud-push');
    if (btnCloudPush) {
        btnCloudPush.addEventListener('click', async () => {
            const syncStatus = document.getElementById('sync-status-message');
            const syncInput = document.getElementById('sync-code-input');
            btnCloudPush.disabled = true;
            btnCloudPush.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> กำลังอัปโหลด...';
            
            try {
                syncStatus.innerHTML = '<span style="color:var(--primary-color);"><i class="fa-solid fa-spinner fa-spin"></i> กำลังเตรียมรวบรวมข้อมูลกิจการทั้งหมด...</span>';
                const allData = await exportAllSystemData();
                
                let code = syncInput.value.trim();
                let url = '';
                let method = 'PUT';
                let aesKey = code;
                
                if (!aesKey) {
                    syncStatus.innerHTML = '<span style="color:var(--primary-color);"><i class="fa-solid fa-spinner fa-spin"></i> กำลังจองรหัสซิงค์บนคลาวด์...</span>';
                    const proxyPostUrl = 'https://corsproxy.io/?url=' + encodeURIComponent('https://jsonblob.com/api/jsonBlob') + '&resHeaders=access-control-expose-headers:location';
                    const preRes = await fetch(proxyPostUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ placeholder: true })
                    });
                    if (!preRes.ok) {
                        throw new Error('ไม่สามารถจองพื้นที่บนคลาวด์ได้ โปรดลองอีกครั้ง');
                    }
                    const locationHeader = preRes.headers.get('Location');
                    if (!locationHeader) {
                        throw new Error('ไม่สามารถรับรหัสซิงค์จากเซิร์ฟเวอร์ได้');
                    }
                    code = locationHeader.split('/').pop();
                    aesKey = code;
                }
                
                url = 'https://corsproxy.io/?url=' + encodeURIComponent('https://jsonblob.com/api/jsonBlob/' + code);

                syncStatus.innerHTML = '<span style="color:var(--primary-color);"><i class="fa-solid fa-spinner fa-spin"></i> กำลังเข้ารหัสและส่งข้อมูลขึ้นคลาวด์...</span>';
                
                const encryptedPayload = encryptAndCompressData(allData, aesKey);
                
                const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(encryptedPayload)
                });
                
                if (!response.ok) {
                    throw new Error('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์คลาวด์ได้ หรือขนาดไฟล์เกินขีดจำกัด');
                }
                
                syncInput.value = code;
                localStorage.setItem('cloud_sync_code', code);
                localStorage.setItem('cloud_last_sync_time', Date.now().toString());
                
                const syncCheckbox = document.getElementById('sync-auto-checkbox');
                if (syncCheckbox && localStorage.getItem('cloud_sync_enabled') === 'true') {
                    // Just confirm state
                }
                
                syncStatus.innerHTML = `<span style="color:var(--success-green); font-weight:700;"><i class="fa-solid fa-circle-check"></i> ซิงค์สำเร็จ! รหัสซิงค์ของคุณคือ: <code>${code}</code></span><br>* คัดลอกรหัสนี้ไปกรอกในอีกเบราว์เซอร์เพื่อดึงข้อมูล`;
                showToast('อัปโหลดข้อมูลขึ้นคลาวด์และเข้ารหัสลับสำเร็จ', 'success');
                updateSyncBadge('synced');
                showLocalWarningBannerIfNeeded();
            } catch (err) {
                console.error(err);
                syncStatus.innerHTML = `<span style="color:var(--danger-red);"><i class="fa-solid fa-triangle-exclamation"></i> ซิงค์ล้มเหลว: ${err.message}</span>`;
                showToast('ซิงค์ข้อมูลล้มเหลว: ' + err.message, 'error');
                updateSyncBadge('error');
            } finally {
                btnCloudPush.disabled = false;
                btnCloudPush.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> อัปโหลดขึ้นคลาวด์';
            }
        });
    }

    const btnCloudPull = document.getElementById('btn-cloud-pull');
    if (btnCloudPull) {
        btnCloudPull.addEventListener('click', async () => {
            const syncInput = document.getElementById('sync-code-input');
            const code = syncInput.value.trim();
            const syncStatus = document.getElementById('sync-status-message');
            
            if (!code) {
                alert('โปรดกรอกรหัสซิงค์ข้อมูลเพื่อดึงข้อมูลจากคลาวด์');
                return;
            }
            
            if (!confirm('คำเตือน! การดึงข้อมูลจากคลาวด์จะนำเข้าข้อมูลและทับฐานข้อมูลเดิมในเครื่องนี้ทั้งหมด คุณต้องการดำเนินการต่อหรือไม่?')) {
                return;
            }
            
            btnCloudPull.disabled = true;
            btnCloudPull.innerHTML = '<i class="fa-solid fa-cloud-arrow-down"></i> กำลังดึงข้อมูล...';
            
            try {
                syncStatus.innerHTML = '<span style="color:var(--primary-color);"><i class="fa-solid fa-spinner fa-spin"></i> กำลังดาวน์โหลดและถอดรหัสข้อมูล...</span>';
                const response = await fetch('https://corsproxy.io/?url=' + encodeURIComponent(`https://jsonblob.com/api/jsonBlob/${code}`));
                if (!response.ok) {
                    throw new Error('ไม่พบข้อมูลสำหรับรหัสซิงค์นี้ หรือเซิร์ฟเวอร์ขัดข้อง');
                }
                
                const encryptedPayload = await response.json();
                
                db.setSuppressDbChangedEvent(true);
                let allData;
                try {
                    allData = decryptAndDecompressData(encryptedPayload, code);
                    syncStatus.innerHTML = '<span style="color:var(--primary-color);"><i class="fa-solid fa-spinner fa-spin"></i> กำลังล้างระบบและบันทึกข้อมูลคลาวด์ลงในเครื่อง...</span>';
                    await importAllSystemData(allData);
                } finally {
                    db.setSuppressDbChangedEvent(false);
                }
                
                localStorage.setItem('cloud_sync_code', code);
                localStorage.setItem('cloud_last_sync_time', (encryptedPayload.timestamp || Date.now()).toString());
                
                const syncCheckbox = document.getElementById('sync-auto-checkbox');
                if (syncCheckbox) {
                    syncCheckbox.value = code;
                }
                
                syncStatus.innerHTML = `<span style="color:var(--success-green); font-weight:700;"><i class="fa-solid fa-circle-check"></i> ดึงข้อมูลสำเร็จ!</span>`;
                showToast('ดึงข้อมูลระบบจากคลาวด์และถอดรหัสสำเร็จแล้ว', 'success');
                updateSyncBadge('synced', encryptedPayload.timestamp || Date.now());
                showLocalWarningBannerIfNeeded();
                
                // Switch view to dashboard and refresh settings
                companyProfile = await db.getByKey('settings', 'company_profile');
                updateHeaderBadge();
                switchView('dashboard');
            } catch (err) {
                console.error(err);
                syncStatus.innerHTML = `<span style="color:var(--danger-red);"><i class="fa-solid fa-triangle-exclamation"></i> ดึงข้อมูลล้มเหลว: ${err.message}</span>`;
                showToast('ดาวน์โหลดล้มเหลว: ' + err.message, 'error');
                updateSyncBadge('error');
            } finally {
                btnCloudPull.disabled = false;
                btnCloudPull.innerHTML = '<i class="fa-solid fa-cloud-arrow-down"></i> ดึงข้อมูลจากคลาวด์';
            }
        });
    }

    // 14. Tax Reports view subtabs
    document.getElementById('tax-subtab-sales-btn').addEventListener('click', () => {
        currentTaxTab = 'sales';
        document.getElementById('tax-subtab-sales-btn').className = 'btn btn-primary';
        document.getElementById('tax-subtab-purchase-btn').className = 'btn btn-secondary';
        if (document.getElementById('tax-subtab-wht1-btn')) document.getElementById('tax-subtab-wht1-btn').className = 'btn btn-secondary';
        document.getElementById('tax-subtab-wht3-btn').className = 'btn btn-secondary';
        document.getElementById('tax-subtab-wht53-btn').className = 'btn btn-secondary';
        document.getElementById('card-tax-report-sales').style.display = 'block';
        document.getElementById('card-tax-report-purchase').style.display = 'none';
        document.getElementById('card-tax-report-wht').style.display = 'none';
        executeTaxReportQuery();
    });

    document.getElementById('tax-subtab-purchase-btn').addEventListener('click', () => {
        currentTaxTab = 'purchase';
        document.getElementById('tax-subtab-sales-btn').className = 'btn btn-secondary';
        document.getElementById('tax-subtab-purchase-btn').className = 'btn btn-primary';
        if (document.getElementById('tax-subtab-wht1-btn')) document.getElementById('tax-subtab-wht1-btn').className = 'btn btn-secondary';
        document.getElementById('tax-subtab-wht3-btn').className = 'btn btn-secondary';
        document.getElementById('tax-subtab-wht53-btn').className = 'btn btn-secondary';
        document.getElementById('card-tax-report-sales').style.display = 'none';
        document.getElementById('card-tax-report-purchase').style.display = 'block';
        document.getElementById('card-tax-report-wht').style.display = 'none';
        executeTaxReportQuery();
    });

    if (document.getElementById('tax-subtab-wht1-btn')) {
        document.getElementById('tax-subtab-wht1-btn').addEventListener('click', () => {
            currentTaxTab = 'wht1';
            document.getElementById('tax-subtab-sales-btn').className = 'btn btn-secondary';
            document.getElementById('tax-subtab-purchase-btn').className = 'btn btn-secondary';
            document.getElementById('tax-subtab-wht1-btn').className = 'btn btn-primary';
            document.getElementById('tax-subtab-wht3-btn').className = 'btn btn-secondary';
            document.getElementById('tax-subtab-wht53-btn').className = 'btn btn-secondary';
            document.getElementById('card-tax-report-sales').style.display = 'none';
            document.getElementById('card-tax-report-purchase').style.display = 'none';
            document.getElementById('card-tax-report-wht').style.display = 'block';
            executeTaxReportQuery();
        });
    }

    document.getElementById('tax-subtab-wht3-btn').addEventListener('click', () => {
        currentTaxTab = 'wht3';
        document.getElementById('tax-subtab-sales-btn').className = 'btn btn-secondary';
        document.getElementById('tax-subtab-purchase-btn').className = 'btn btn-secondary';
        if (document.getElementById('tax-subtab-wht1-btn')) document.getElementById('tax-subtab-wht1-btn').className = 'btn btn-secondary';
        document.getElementById('tax-subtab-wht3-btn').className = 'btn btn-primary';
        document.getElementById('tax-subtab-wht53-btn').className = 'btn btn-secondary';
        document.getElementById('card-tax-report-sales').style.display = 'none';
        document.getElementById('card-tax-report-purchase').style.display = 'none';
        document.getElementById('card-tax-report-wht').style.display = 'block';
        executeTaxReportQuery();
    });

    document.getElementById('tax-subtab-wht53-btn').addEventListener('click', () => {
        currentTaxTab = 'wht53';
        document.getElementById('tax-subtab-sales-btn').className = 'btn btn-secondary';
        document.getElementById('tax-subtab-purchase-btn').className = 'btn btn-secondary';
        if (document.getElementById('tax-subtab-wht1-btn')) document.getElementById('tax-subtab-wht1-btn').className = 'btn btn-secondary';
        document.getElementById('tax-subtab-wht3-btn').className = 'btn btn-secondary';
        document.getElementById('tax-subtab-wht53-btn').className = 'btn btn-primary';
        document.getElementById('card-tax-report-sales').style.display = 'none';
        document.getElementById('card-tax-report-purchase').style.display = 'none';
        document.getElementById('card-tax-report-wht').style.display = 'block';
        executeTaxReportQuery();
    });

    document.getElementById('btn-tax-report-generate').addEventListener('click', () => {
        executeTaxReportQuery();
    });

    document.getElementById('btn-print-tax-report').addEventListener('click', () => {
        window.print();
    });

    // 15. Contacts View subtabs & actions
    let currentContactTab = 'customer'; // customer or supplier

    const contactTabCustomerBtn = document.getElementById('contact-tab-customer-btn');
    const contactTabSupplierBtn = document.getElementById('contact-tab-supplier-btn');
    if (contactTabCustomerBtn && contactTabSupplierBtn) {
        contactTabCustomerBtn.addEventListener('click', () => {
            currentContactTab = 'customer';
            contactTabCustomerBtn.className = 'btn btn-primary';
            contactTabSupplierBtn.className = 'btn btn-secondary';
            document.getElementById('subsection-customers').style.display = 'block';
            document.getElementById('subsection-suppliers').style.display = 'none';
            document.getElementById('contact-search-label').innerText = 'ค้นหาลูกหนี้ (ชื่อ, เลขผู้เสียภาษี, เบอร์โทร)';
            renderContactsView();
        });

        contactTabSupplierBtn.addEventListener('click', () => {
            currentContactTab = 'supplier';
            contactTabCustomerBtn.className = 'btn btn-secondary';
            contactTabSupplierBtn.className = 'btn btn-primary';
            document.getElementById('subsection-customers').style.display = 'none';
            document.getElementById('subsection-suppliers').style.display = 'block';
            document.getElementById('contact-search-label').innerText = 'ค้นหาเจ้าหนี้ (ชื่อ, เลขผู้เสียภาษี, เบอร์โทร)';
            renderContactsView();
        });
    }

    const btnAddContactModal = document.getElementById('btn-add-contact-modal');
    if (btnAddContactModal) {
        btnAddContactModal.addEventListener('click', () => {
            document.getElementById('add-contact-form').reset();
            document.getElementById('contact-form-id').value = '';
            document.getElementById('contact-modal-title').innerHTML = `<i class="fa-solid fa-user-plus"></i> เพิ่มข้อมูลผู้ติดต่อใหม่`;
            document.getElementById('contact-form-is-customer').checked = (currentContactTab === 'customer');
            document.getElementById('contact-form-is-supplier').checked = (currentContactTab === 'supplier');
            
            const bankGroup = document.getElementById('contact-bank-group');
            if (bankGroup) bankGroup.style.display = (currentContactTab === 'supplier') ? 'block' : 'none';
            openModal('modal-add-contact-view');
        });
    }


    const isSupplierCheckbox = document.getElementById('contact-form-is-supplier');
    if (isSupplierCheckbox) {
        isSupplierCheckbox.addEventListener('change', () => {
            const bankGroup = document.getElementById('contact-bank-group');
            if (bankGroup) bankGroup.style.display = isSupplierCheckbox.checked ? 'block' : 'none';
        });
    }

    const btnContactTaxLookup = document.getElementById('btn-contact-tax-lookup');
    if (btnContactTaxLookup) {
        btnContactTaxLookup.addEventListener('click', async () => {
            const taxIdInput = document.getElementById('contact-form-taxid');
            const taxId = taxIdInput ? taxIdInput.value.replace(/\D/g, '') : '';
            if (taxId.length !== 13) {
                alert('โปรดระบุเลขประจำตัวผู้เสียภาษี 13 หลักให้ถูกต้องก่อนดึงข้อมูล');
                return;
            }
            
            const originalText = btnContactTaxLookup.innerHTML;
            btnContactTaxLookup.disabled = true;
            btnContactTaxLookup.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังดึงข้อมูล...';
            
            try {
                const res = await fetch(`/api/vat-lookup?taxId=${taxId}`);
                const data = await res.json();
                
                if (res.ok && data.success) {
                    document.getElementById('contact-form-name').value = data.name || '';
                    document.getElementById('contact-form-address').value = data.address || '';
                    showToast('ดึงข้อมูลจากกรมสรรพากรสำเร็จ', 'success');
                } else {
                    alert(data.message || 'ไม่พบข้อมูล หรือเกิดข้อผิดพลาดจากกรมสรรพากร');
                }
            } catch (err) {
                console.error(err);
                alert('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
            } finally {
                btnContactTaxLookup.disabled = false;
                btnContactTaxLookup.innerHTML = originalText;
            }
        });
    }

    const btnContactSearch = document.getElementById('btn-contact-search');
    if (btnContactSearch) {
        btnContactSearch.addEventListener('click', () => {
            renderContactsView();
        });
    }

    const btnContactReset = document.getElementById('btn-contact-reset');
    if (btnContactReset) {
        btnContactReset.addEventListener('click', () => {
            document.getElementById('contact-filter-search').value = '';
            renderContactsView();
        });
    }

    
    // Add/Edit Contact
    const addContactForm = document.getElementById('add-contact-form');
    if (addContactForm) {
        addContactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('contact-form-id').value;
            
            const isCustomer = document.getElementById('contact-form-is-customer').checked ? 1 : 0;
            const isSupplier = document.getElementById('contact-form-is-supplier').checked ? 1 : 0;
            
            if (!isCustomer && !isSupplier) {
                alert('กรุณาเลือกประเภทผู้ติดต่ออย่างน้อย 1 ประเภท (ลูกหนี้ หรือ เจ้าหนี้)');
                return;
            }

            const data = {
                name: document.getElementById('contact-form-name').value.trim(),
                taxId: document.getElementById('contact-form-taxid').value.trim(),
                creditTerm: parseInt(document.getElementById('contact-form-creditterm').value) || 0,
                phone: document.getElementById('contact-form-phone').value.trim(),
                email: document.getElementById('contact-form-email').value.trim(),
                contactPerson: document.getElementById('contact-form-person').value.trim(),
                bankAccount: document.getElementById('contact-form-bank').value.trim(),
                address: document.getElementById('contact-form-address').value.trim(),
                isCustomer: isCustomer,
                isSupplier: isSupplier
            };
            
            if (id) {
                data.id = parseInt(id);
            }
            
            await db.putItem('contacts', data);
            closeModal('modal-add-contact-view');
            renderContactsView();
            loadContactsDropdowns();
            showNotification(id ? 'อัปเดตผู้ติดต่อแล้ว' : 'เพิ่มผู้ติดต่อใหม่แล้ว', 'success');
        });
    }

    // Auto-populating Invoice Form when selecting a Customer
    const invCustomerSelect = document.getElementById('inv-customer-select');
    if (invCustomerSelect) {
        invCustomerSelect.addEventListener('change', async () => {
            const val = invCustomerSelect.value;
            const nameInput = document.getElementById('inv-customer-name');
            const taxInput = document.getElementById('inv-tax-id');
            const addressInput = document.getElementById('inv-address');
            
            if (val === 'manual') {
                nameInput.value = '';
                taxInput.value = '';
                addressInput.value = '';
                nameInput.style.display = 'block';
                nameInput.required = true;
            } else {
                const customer = await db.getByKey('contacts', parseInt(val));
                if (customer) {
                    nameInput.value = customer.name;
                    nameInput.style.display = 'none'; // hide it when selecting from list
                    nameInput.required = false; // not required to type since selected
                    taxInput.value = customer.taxId || '';
                    addressInput.value = customer.address || '';
                    
                    // Auto-calculate Due Date based on Invoice Date + Customer Credit Term
                    const invDateInput = document.getElementById('inv-date');
                    if (invDateInput.value && customer.creditTerm) {
                        const invDate = new Date(invDateInput.value);
                        invDate.setDate(invDate.getDate() + customer.creditTerm);
                        document.getElementById('inv-due-date').value = invDate.toISOString().split('T')[0];
                    }
                }
            }
        });
    }

    // Recalculate due date when invoice date is changed
    const invDateInput = document.getElementById('inv-date');
    if (invDateInput) {
        invDateInput.addEventListener('change', async () => {
            const val = invCustomerSelect.value;
            if (val !== 'manual') {
                const customer = await db.getByKey('contacts', parseInt(val));
                if (customer && customer.creditTerm) {
                    const invDate = new Date(invDateInput.value);
                    invDate.setDate(invDate.getDate() + customer.creditTerm);
                    document.getElementById('inv-due-date').value = invDate.toISOString().split('T')[0];
                }
            }
        });
    }

    // Auto-populating Bill Form when selecting a Supplier
    const billVendorSelect = document.getElementById('bill-vendor-select');
    if (billVendorSelect) {
        billVendorSelect.addEventListener('change', async () => {
            const val = billVendorSelect.value;
            const nameInput = document.getElementById('bill-vendor-name');
            const taxInput = document.getElementById('bill-tax-id');
            const addrInput = document.getElementById('bill-address');
            
            if (val === 'manual') {
                nameInput.value = '';
                taxInput.value = '';
                if (addrInput) addrInput.value = '';
                nameInput.style.display = 'block';
                nameInput.required = true;
            } else {
                const supplier = await db.getByKey('contacts', parseInt(val));
                if (supplier) {
                    nameInput.value = supplier.name;
                    nameInput.style.display = 'none'; // hide it when selecting from list
                    nameInput.required = false;
                    // Fix: server returns tax_id (snake_case), JS expects taxId
                    taxInput.value = supplier.taxId || supplier.tax_id || '';
                    if (addrInput) addrInput.value = supplier.address || '';
                }
            }
        });
    }

    // 16. COA Subtab Toggling & Opening Balances UI bindings
    const subtabCoaTreeBtn = document.getElementById('subtab-coa-tree-btn');
    const subtabCoaOpeningBtn = document.getElementById('subtab-coa-opening-btn');
    if (subtabCoaTreeBtn && subtabCoaOpeningBtn) {
        subtabCoaTreeBtn.addEventListener('click', () => {
            subtabCoaTreeBtn.className = 'btn btn-primary btn-sm';
            subtabCoaOpeningBtn.className = 'btn btn-secondary btn-sm';
            document.getElementById('coa-tree-view-wrapper').style.display = 'block';
            document.getElementById('coa-opening-view-wrapper').style.display = 'none';
        });
        subtabCoaOpeningBtn.addEventListener('click', async () => {
            subtabCoaTreeBtn.className = 'btn btn-secondary btn-sm';
            subtabCoaOpeningBtn.className = 'btn btn-primary btn-sm';
            document.getElementById('coa-tree-view-wrapper').style.display = 'none';
            document.getElementById('coa-opening-view-wrapper').style.display = 'block';
            await renderOpeningBalances();
        });
    }

    const openingSearch = document.getElementById('opening-search');
    if (openingSearch) {
        openingSearch.addEventListener('input', filterOpeningBalancesTable);
    }

    const btnOpeningSave = document.getElementById('btn-opening-save');
    if (btnOpeningSave) {
        btnOpeningSave.addEventListener('click', handleSaveOpeningBalances);
    }

    // 17. Petty Cash UI bindings
    const subtabPcPaymentBtn = document.getElementById('subtab-pc-payment-btn');
    const subtabPcReimburseBtn = document.getElementById('subtab-pc-reimburse-btn');
    if (subtabPcPaymentBtn && subtabPcReimburseBtn) {
        subtabPcPaymentBtn.addEventListener('click', () => {
            subtabPcPaymentBtn.className = 'btn btn-primary btn-sm';
            subtabPcReimburseBtn.className = 'btn btn-secondary btn-sm';
            document.getElementById('subsection-pc-payment').style.display = 'block';
            document.getElementById('subsection-pc-reimburse').style.display = 'none';
        });
        subtabPcReimburseBtn.addEventListener('click', async () => {
            subtabPcPaymentBtn.className = 'btn btn-secondary btn-sm';
            subtabPcReimburseBtn.className = 'btn btn-primary btn-sm';
            document.getElementById('subsection-pc-payment').style.display = 'none';
            document.getElementById('subsection-pc-reimburse').style.display = 'block';
            await loadPendingDPsForReimbursement();
            recalculateVR();
        });
    }

    const btnPcPayAddRow = document.getElementById('btn-pc-pay-add-row');
    if (btnPcPayAddRow) {
        btnPcPayAddRow.addEventListener('click', addDPLinesRow);
    }

    const pcWhtRateSelect = document.getElementById('pc-pay-wht-rate');
    if (pcWhtRateSelect) {
        pcWhtRateSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val !== 'mixed') {
                pettyCashPayLines.forEach(line => {
                    line.whtRate = val;
                });
                renderDPLinesTable();
            }
            recalculateDP();
        });
    }

    const pcWhtAmountInput = document.getElementById('pc-pay-wht-amount');
    if (pcWhtAmountInput) {
        pcWhtAmountInput.addEventListener('input', () => {
            recalculateDP();
        });
    }

    const pcPaymentForm = document.getElementById('pc-payment-form');
    if (pcPaymentForm) {
        pcPaymentForm.addEventListener('submit', handleDPFormSubmit);
    }

    const pcReimburseForm = document.getElementById('pc-reimburse-form');
    if (pcReimburseForm) {
        pcReimburseForm.addEventListener('submit', handleVRFormSubmit);
    }

    // --- MULTI-COMPANY TRIGGERS ---
    const headerCompanyBtn = document.getElementById('header-company-name');
    if (headerCompanyBtn) {
        headerCompanyBtn.addEventListener('click', async () => {
            if (sessionStorage.getItem('ledger_company_code')) {
                showToast('สิทธิ์ของคุณถูกจำกัดให้เข้าถึงเฉพาะบริษัทนี้เท่านั้น', 'error');
                return;
            }
            selectedCompanyCodeInSwitcher = db.getActiveCompanyCode();
            openModal('modal-switch-company');
            const searchInput = document.getElementById('company-search-input');
            if (searchInput) searchInput.value = '';
            await renderCompanyList();
        });
    }

    const sidebarSwitchLi = document.getElementById('sidebar-switch-company');
    if (sidebarSwitchLi) {
        sidebarSwitchLi.addEventListener('click', async (e) => {
            e.preventDefault();
            selectedCompanyCodeInSwitcher = db.getActiveCompanyCode();
            openModal('modal-switch-company');
            const searchInput = document.getElementById('company-search-input');
            if (searchInput) searchInput.value = '';
            await renderCompanyList();
        });
    }

    const companySearchInput = document.getElementById('company-search-input');
    if (companySearchInput) {
        companySearchInput.addEventListener('input', async () => {
            await renderCompanyList();
        });
    }

    const btnCompanyOk = document.getElementById('btn-company-ok');
    if (btnCompanyOk) {
        btnCompanyOk.addEventListener('click', async () => {
            if (!selectedCompanyCodeInSwitcher) {
                alert('โปรดเลือกบริษัท/กิจการที่ต้องการสลับ');
                return;
            }
            await performCompanySwitch(selectedCompanyCodeInSwitcher);
        });
    }

    const btnCompanyNew = document.getElementById('btn-company-new');
    if (btnCompanyNew) {
        btnCompanyNew.addEventListener('click', () => {
            const addForm = document.getElementById('add-company-form');
            if (addForm) addForm.reset();
            openModal('modal-add-company');
        });
    }

    const addCompanyForm = document.getElementById('add-company-form');
    if (addCompanyForm) {
        addCompanyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const codeInput = document.getElementById('company-form-code');
            const nameInput = document.getElementById('company-form-name');
            if (!codeInput || !nameInput) return;

            const code = codeInput.value.trim();
            const name = nameInput.value.trim();
            if (!code || !name) return;

            const codeRegex = /^[a-zA-Z0-9_]+$/;
            if (!codeRegex.test(code)) {
                alert('รหัสกิจการต้องประกอบด้วยภาษาอังกฤษ ตัวเลข หรือเครื่องหมาย _ เท่านั้น');
                return;
            }

            try {
                const companies = await db.getCompanies();
                const existing = companies.find(c => c.code.toLowerCase() === code.toLowerCase());
                if (existing) {
                    alert('รหัสกิจการนี้มีอยู่แล้วในระบบ! โปรดระบุรหัสอื่น');
                    return;
                }

                await db.addCompany(code, name);
                closeModal('modal-add-company');
                showToast(`เพิ่มกิจการ "${name}" สำเร็จ`, 'success');

                selectedCompanyCodeInSwitcher = code;
                await performCompanySwitch(code);
                await renderCompanyList();
            } catch (err) {
                console.error('Error adding company:', err);
                alert('เกิดข้อผิดพลาด: ' + err.message);
            }
        });
    }

    const btnCompanyDelete = document.getElementById('btn-company-delete');
    if (btnCompanyDelete) {
        btnCompanyDelete.addEventListener('click', async () => {
            if (!selectedCompanyCodeInSwitcher) {
                alert('โปรดเลือกบริษัท/กิจการที่ต้องการลบ');
                return;
            }

            const activeCode = db.getActiveCompanyCode();
            if (selectedCompanyCodeInSwitcher === activeCode) {
                alert('ไม่สามารถลบกิจการที่กำลังเปิดใช้งานอยู่ได้! โปรดสลับไปเปิดกิจการอื่นก่อนทำการลบ');
                return;
            }

            const companies = await db.getCompanies();
            const targetComp = companies.find(c => c.code === selectedCompanyCodeInSwitcher);
            if (!targetComp) return;

            if (confirm(`คำเตือนร้ายแรง! คุณแน่ใจว่าต้องการลบกิจการ "${targetComp.name}" (${targetComp.code}) ใช่หรือไม่?\nข้อมูลบัญชีและฐานข้อมูลทั้งหมดของบริษัทนี้จะถูกลบอย่างถาวรและไม่สามารถกู้คืนได้!`)) {
                try {
                    await db.deleteCompany(selectedCompanyCodeInSwitcher);
                    showToast(`ลบกิจการ ${targetComp.name} เรียบร้อยแล้ว`, 'success');
                    selectedCompanyCodeInSwitcher = activeCode;
                    await renderCompanyList();
                } catch (err) {
                    console.error('Error deleting company:', err);
                    alert('เกิดข้อผิดพลาดในการลบกิจการ: ' + err.message);
                }
            }
        });
    }

    // Bind Inventory system UI actions
    bindInventoryUIActions();
}

// Helper to bind click event on empty table search suggestion
function bindRdSuggestEvent(type) {
    const btn = document.getElementById('btn-search-rd-suggest');
    if (btn) {
        btn.addEventListener('click', async () => {
            const taxId = btn.getAttribute('data-taxid');
            const cleanTaxId = taxId.replace(/\D/g, '');
            
            if (cleanTaxId.length !== 13) {
                showToast(`เลขประจำตัวผู้เสียภาษีต้องมี 13 หลัก (คุณกรอกมา ${cleanTaxId.length} หลัก)`, 'error');
                return;
            }
            
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังค้นหาข้อมูลจากสรรพากร...';
            
            try {
                const res = await fetch(`/api/vat-lookup?taxId=${cleanTaxId}`);
                const data = await res.json();
                
                if (res.ok && data.success) {
                    // Open the Add Contact Modal and prefill
                    document.getElementById('contact-form-id').value = '';
                    document.getElementById('contact-form-is-customer').checked = (type === 'customer');
                document.getElementById('contact-form-is-supplier').checked = (type === 'supplier');
                const bankGroup = document.getElementById('contact-bank-group');
                if (bankGroup) bankGroup.style.display = (type === 'supplier') ? 'block' : 'none';
                    document.getElementById('contact-form-name').value = data.name || '';
                    document.getElementById('contact-form-taxid').value = data.taxId || '';
                    document.getElementById('contact-form-address').value = data.address || '';
                    document.getElementById('contact-form-phone').value = '';
                    document.getElementById('contact-form-email').value = '';
                    document.getElementById('contact-form-person').value = '';
                    document.getElementById('contact-form-bank').value = '';
                    
                    document.getElementById('contact-modal-title').innerHTML = '<i class="fa-solid fa-user-plus"></i> เพิ่มข้อมูลผู้ติดต่อใหม่ (ดึงข้อมูลสำเร็จ)';
                    openModal('modal-add-contact-view');
                    showToast('ค้นพบข้อมูลนิติบุคคลจากกรมสรรพากร!', 'success');
                } else {
                    showToast(data.message || 'ไม่พบข้อมูล หรืออยู่นอกระบบภาษีมูลค่าเพิ่ม', 'error');
                }
            } catch (err) {
                console.error(err);
                showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        });
    }
}


// =========================================================================
// 15. TAX REPORTS VIEW RENDERER
// =========================================================================
async function renderTaxReportsView() {
    // Set default dates if empty (standard current fiscal year)
    if (!document.getElementById('tax-report-start').value) {
        const startVal = globalPeriod ? globalPeriod.startDate : '2026-01-01';
        const endVal = globalPeriod ? globalPeriod.endDate : '2026-12-31';
        document.getElementById('tax-report-start').value = startVal;
        document.getElementById('tax-report-end').value = endVal;
    }
    
    await executeTaxReportQuery();
}

async function executeTaxReportQuery() {
    const start = document.getElementById('tax-report-start').value;
    const end = document.getElementById('tax-report-end').value;
    
    if (currentTaxTab === 'sales') {
        const data = await store.getSalesVatReport(start, end);
        renderSalesVatTable(data);
    } else if (currentTaxTab === 'purchase') {
        const data = await store.getPurchaseVatReport(start, end);
        renderPurchaseVatTable(data);
    } else if (currentTaxTab === 'wht1') {
        const data = await store.getWithholdingTaxReport(start, end);
        const filteredData = data.filter(d => d.pndType === '1');
        document.getElementById('tax-report-wht-title').innerHTML = '<i class="fa-solid fa-hand-holding-dollar"></i> รายงานภาษีเงินได้หัก ณ ที่จ่าย (ภ.ง.ด.1)';
        const btnExport = document.querySelector('.btn-export-csv[data-table="tax-wht-table"]');
        if (btnExport) btnExport.setAttribute('data-filename', 'wht1_report');
        renderWhtTable(filteredData);
    } else if (currentTaxTab === 'wht3') {
        const data = await store.getWithholdingTaxReport(start, end);
        const filteredData = data.filter(d => d.pndType === '3');
        document.getElementById('tax-report-wht-title').innerHTML = '<i class="fa-solid fa-hand-holding-dollar"></i> รายงานภาษีเงินได้หัก ณ ที่จ่าย (ภ.ง.ด.3)';
        const btnExport = document.querySelector('.btn-export-csv[data-table="tax-wht-table"]');
        if (btnExport) btnExport.setAttribute('data-filename', 'wht3_report');
        renderWhtTable(filteredData);
    } else if (currentTaxTab === 'wht53') {
        const data = await store.getWithholdingTaxReport(start, end);
        const filteredData = data.filter(d => d.pndType === '53');
        document.getElementById('tax-report-wht-title').innerHTML = '<i class="fa-solid fa-hand-holding-dollar"></i> รายงานภาษีเงินได้หัก ณ ที่จ่าย (ภ.ง.ด.53)';
        const btnExport = document.querySelector('.btn-export-csv[data-table="tax-wht-table"]');
        if (btnExport) btnExport.setAttribute('data-filename', 'wht53_report');
        renderWhtTable(filteredData);
    }
}

function renderSalesVatTable(data) {
    const tbody = document.querySelector('#tax-sales-table tbody');
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 32px;">ไม่พบข้อมูลภาษีขายสำหรับช่วงเวลาดังกล่าว</td></tr>`;
        return;
    }

    let sumBase = 0;
    let sumVat = 0;

    data.forEach((row, idx) => {
        sumBase += row.baseAmount;
        sumVat += row.vatAmount;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${idx + 1}</td>
            <td>${formatDateToDDMMYYYY(row.date)}</td>
            <td><strong>${row.reference}</strong></td>
            <td>${row.partyName}</td>
            <td>${row.taxId}</td>
            <td class="num-col">${formatMoney(row.baseAmount)} ฿</td>
            <td class="num-col text-debit" style="font-weight: 600;">${formatMoney(row.vatAmount)} ฿</td>
        `;
        tbody.appendChild(tr);
    });

    const trTotal = document.createElement('tr');
    trTotal.className = 'row-total';
    trTotal.innerHTML = `
        <td colspan="5" style="text-align: right;">ยอดรวมภาษีขายสะสมสุทธิ:</td>
        <td class="num-col">${formatMoney(sumBase)} ฿</td>
        <td class="num-col text-debit">${formatMoney(sumVat)} ฿</td>
    `;
    tbody.appendChild(trTotal);
}

function renderPurchaseVatTable(data) {
    const tbody = document.querySelector('#tax-purchase-table tbody');
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 32px;">ไม่พบข้อมูลภาษีซื้อสำหรับช่วงเวลาดังกล่าว</td></tr>`;
        return;
    }

    let sumBase = 0;
    let sumVat = 0;

    data.forEach((row, idx) => {
        sumBase += row.baseAmount;
        sumVat += row.vatAmount;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${idx + 1}</td>
            <td>${formatDateToDDMMYYYY(row.date)}</td>
            <td><strong>${row.reference}</strong></td>
            <td>${row.partyName}</td>
            <td>${row.taxId}</td>
            <td class="num-col">${formatMoney(row.baseAmount)} ฿</td>
            <td class="num-col text-credit" style="font-weight: 600;">${formatMoney(row.vatAmount)} ฿</td>
        `;
        tbody.appendChild(tr);
    });

    const trTotal = document.createElement('tr');
    trTotal.className = 'row-total';
    trTotal.innerHTML = `
        <td colspan="5" style="text-align: right;">ยอดรวมภาษีซื้อสะสมสุทธิ:</td>
        <td class="num-col">${formatMoney(sumBase)} ฿</td>
        <td class="num-col text-credit">${formatMoney(sumVat)} ฿</td>
    `;
    tbody.appendChild(trTotal);
}

function renderWhtTable(data) {
    const tbody = document.querySelector('#tax-wht-table tbody');
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 32px;">ไม่พบรายการภาษีหัก ณ ที่จ่ายสำหรับช่วงเวลาดังกล่าว</td></tr>`;
        return;
    }

    let sumBase = 0;
    let sumWht = 0;

    data.forEach((row, idx) => {
        sumBase += row.baseAmount;
        sumWht += row.whtAmount;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${idx + 1}</td>
            <td>${formatDateToDDMMYYYY(row.date)}</td>
            <td><strong>${row.reference}</strong></td>
            <td>${row.partyName}</td>
            <td>${row.taxId}</td>
            <td>
                <span style="font-size:12px;">${row.description}</span>
            </td>
            <td class="num-col">${row.whtRate}%</td>
            <td class="num-col">${formatMoney(row.baseAmount)} ฿</td>
            <td class="num-col text-credit" style="color: ${row.isPayable ? 'var(--warning-orange)' : 'var(--accent-blue)'}; font-weight: 600;">${formatMoney(row.whtAmount)} ฿</td>
        `;
        tbody.appendChild(tr);
    });

    const trTotal = document.createElement('tr');
    trTotal.className = 'row-total';
    trTotal.innerHTML = `
        <td colspan="7" style="text-align: right;">ยอดรวมสะสมหัก ณ ที่จ่ายสุทธิ:</td>
        <td class="num-col">${formatMoney(sumBase)} ฿</td>
        <td class="num-col text-credit">${formatMoney(sumWht)} ฿</td>
    `;
    tbody.appendChild(trTotal);
}

// =========================================================================
// 16. CONTACTS (DEBTORS / CREDITORS) VIEW RENDERER
// =========================================================================
async function renderContactsView() {
    let contacts = await db.getAll('contacts');
    
    // Fallback if contact-filter-search doesn't exist
    const searchInput = document.getElementById('contact-filter-search');
    const searchVal = searchInput ? searchInput.value.toLowerCase().trim() : '';

    if (searchVal) {
        contacts = contacts.filter(c => 
            c.name.toLowerCase().includes(searchVal) ||
            (c.taxId && c.taxId.includes(searchVal)) ||
            (c.phone && c.phone.includes(searchVal))
        );
    }
    
    const tbody = document.querySelector('#contacts-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (contacts.length === 0) {
        const cleanSearch = searchVal.replace(/\D/g, '');
        if (cleanSearch.length >= 10 && cleanSearch.length <= 15) {
            tbody.innerHTML = `<tr>
                <td colspan="8" style="text-align: center; padding: 32px;">
                    <div style="color: var(--text-muted); margin-bottom: 12px; font-size: 14px;">ไม่พบข้อมูลผู้ติดต่อนี้ในระบบ</div>
                    <button type="button" class="btn btn-primary btn-sm" id="btn-search-rd-suggest" data-taxid="${cleanSearch}">
                        <i class="fa-solid fa-cloud-arrow-down"></i> ดึงข้อมูล "${cleanSearch}" จากกรมสรรพากร
                    </button>
                </td>
            </tr>`;
            bindRdSuggestEvent('customer');
        } else {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 32px;">ไม่มีข้อมูลผู้ติดต่อ</td></tr>`;
        }
        return;
    }
    
    contacts.forEach(row => {
        let typeHtml = '';
        if (row.isCustomer && row.isSupplier) {
            typeHtml = '<span class="status-badge processing" style="background:var(--primary-color);color:white;">ลูกค้า / ผู้จำหน่าย</span>';
        } else if (row.isCustomer) {
            typeHtml = '<span class="status-badge success">ลูกค้า</span>';
        } else if (row.isSupplier) {
            typeHtml = '<span class="status-badge unpaid">ผู้จำหน่าย</span>';
        } else {
            typeHtml = '<span class="status-badge default">ทั่วไป</span>';
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.id}</td>
            <td><strong>${row.name}</strong>${row.contactPerson ? `<br><small style="color:var(--text-secondary)">ติดต่อ: ${row.contactPerson}</small>` : ''}</td>
            <td style="text-align: center;">${typeHtml}</td>
            <td>${row.taxId || '-'}</td>
            <td><span style="font-size:12px;">${row.address}</span>${row.email ? `<br><small style="color:var(--text-secondary)">${row.email}</small>` : ''}</td>
            <td>${row.phone || '-'}</td>
            <td style="text-align: center;"><span class="status-badge paid">${row.creditTerm} วัน</span></td>
            <td style="text-align: center;">
                <button class="btn btn-secondary btn-sm edit-contact-btn" data-id="${row.id}" style="padding: 4px 8px;"><i class="fa-solid fa-edit"></i></button>
                <button class="btn btn-danger btn-sm delete-contact-btn" data-id="${row.id}" style="padding: 4px 8px;"><i class="fa-solid fa-trash-alt"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    bindContactTableEvents();
}

function bindContactTableEvents() {
    document.querySelectorAll('.edit-contact-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = parseInt(btn.getAttribute('data-id'));
            const contact = await db.getByKey('contacts', id);
            if (contact) {
                document.getElementById('contact-form-id').value = contact.id;
                document.getElementById('contact-form-is-customer').checked = !!contact.isCustomer;
                document.getElementById('contact-form-is-supplier').checked = !!contact.isSupplier;
                
                const bankGroup = document.getElementById('contact-bank-group');
                if (bankGroup) {
                    bankGroup.style.display = contact.isSupplier ? 'block' : 'none';
                    if (contact.isSupplier) {
                        document.getElementById('contact-form-bank').value = contact.bankAccount || '';
                    } else {
                        document.getElementById('contact-form-bank').value = '';
                    }
                }
                
                document.getElementById('contact-form-name').value = contact.name;
                document.getElementById('contact-form-taxid').value = contact.taxId || '';
                document.getElementById('contact-form-creditterm').value = contact.creditTerm;
                document.getElementById('contact-form-phone').value = contact.phone || '';
                document.getElementById('contact-form-email').value = contact.email || '';
                document.getElementById('contact-form-person').value = contact.contactPerson || '';
                document.getElementById('contact-form-address').value = contact.address || '';
                
                document.getElementById('contact-modal-title').innerHTML = `<i class="fa-solid fa-edit"></i> แก้ไขข้อมูลผู้ติดต่อ: ${contact.name}`;
                openModal('modal-add-contact-view');
            }
        });
    });

    document.querySelectorAll('.delete-contact-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = parseInt(btn.getAttribute('data-id'));
            if (confirm(`คุณต้องการลบผู้ติดต่อ ID ${id} ใช่หรือไม่?`)) {
                await db.deleteItem('contacts', id);
                showToast(`ลบผู้ติดต่อเรียบร้อยแล้ว`);
                await renderContactsView();
                await loadContactsDropdowns();
            }
        });
    });
}

async function loadContactsDropdowns() {
    const contacts = await db.getAll('contacts');
    const customers = contacts.filter(c => c.isCustomer);
    const suppliers = contacts.filter(c => c.isSupplier);

    const customerSelect = document.getElementById('inv-customer-select');
    const vendorSelect = document.getElementById('bill-vendor-select');

    if (customerSelect) {
        customerSelect.innerHTML = '<option value="manual">-- พิมพ์ข้อมูลเอง --</option>';
        customers.sort((a,b) => a.name.localeCompare(b.name)).forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = `${c.name} (${c.creditTerm} วัน)`;
            customerSelect.appendChild(opt);
        });
        document.getElementById('inv-customer-name').style.display = 'block';
        document.getElementById('inv-customer-name').required = true;
    }

    if (vendorSelect) {
        vendorSelect.innerHTML = '<option value="manual">-- พิมพ์ข้อมูลเอง --</option>';
        suppliers.sort((a,b) => a.name.localeCompare(b.name)).forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.name;
            vendorSelect.appendChild(opt);
        });
        document.getElementById('bill-vendor-name').style.display = 'block';
        document.getElementById('bill-vendor-name').required = true;
    }

    // Populate AR/AP dropdowns
    const arCustomerSelect = document.getElementById('ar-customer-select');
    if (arCustomerSelect) {
        arCustomerSelect.innerHTML = '<option value="">-- เลือกรายชื่อลูกหนี้ --</option>';
        customers.sort((a,b) => a.name.localeCompare(b.name)).forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = `${c.name} (${c.creditTerm} วัน)`;
            arCustomerSelect.appendChild(opt);
        });
    }

    const apSupplierSelect = document.getElementById('ap-supplier-select');
    if (apSupplierSelect) {
        apSupplierSelect.innerHTML = '<option value="">-- เลือกรายชื่อเจ้าหนี้ --</option>';
        suppliers.sort((a,b) => a.name.localeCompare(b.name)).forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.name;
            apSupplierSelect.appendChild(opt);
        });
    }

    const pcContactSelect = document.getElementById('pc-pay-contact');
    if (pcContactSelect) {
        pcContactSelect.innerHTML = '<option value="">-- ไม่ระบุ (ทั่วไป) --</option>';
        
        // Add Customers
        customers.sort((a,b) => a.name.localeCompare(b.name)).forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = `[ลูกค้า] ${c.name}`;
            pcContactSelect.appendChild(opt);
        });
        
        // Add Suppliers
        suppliers.sort((a,b) => a.name.localeCompare(b.name)).forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = `[เจ้าหนี้] ${s.name}`;
            pcContactSelect.appendChild(opt);
        });
    }
}

let currentPmEditCode = '';

async function renderFinanceView() {
    const today = new Date().toISOString().split('T')[0];
    const arDate = document.getElementById('ar-date');
    if (arDate) arDate.value = today;
    const apDate = document.getElementById('ap-date');
    if (apDate) apDate.value = today;
    
    // Clear forms
    const arForm = document.getElementById('ar-receipt-form');
    if (arForm) arForm.reset();
    const apForm = document.getElementById('ap-payment-form');
    if (apForm) apForm.reset();
    
    // Reset document IDs
    const arId = document.getElementById('ar-id');
    if (arId) arId.value = '';
    const apId = document.getElementById('ap-id');
    if (apId) apId.value = '';
    const arRef = document.getElementById('ar-reference');
    if (arRef) arRef.value = '';
    const apRef = document.getElementById('ap-reference');
    if (apRef) apRef.value = '';
    const arMemo = document.getElementById('ar-memo');
    if (arMemo) arMemo.value = '';
    const apMemo = document.getElementById('ap-memo');
    if (apMemo) apMemo.value = '';
    
    // Clear lists/tables
    const arTbody = document.getElementById('ar-invoices-tbody');
    if (arTbody) arTbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">เลือกรายชื่อลูกค้าเพื่อแสดงบิลค้างชำระ</td></tr>';
    const apTbody = document.getElementById('ap-bills-tbody');
    if (apTbody) apTbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">เลือกรายชื่อเจ้าหนี้เพื่อแสดงบิลค้างชำระ</td></tr>';
    
    const arOtherTbody = document.getElementById('ar-other-payments-tbody');
    if (arOtherTbody) arOtherTbody.innerHTML = '';
    const apOtherTbody = document.getElementById('ap-other-payments-tbody');
    if (apOtherTbody) apOtherTbody.innerHTML = '';
    
    // Load dropdowns for customers/suppliers
    await loadContactsDropdowns();
    
    // Call specific render sub-renderers
    await renderPaymentMethods();
    await renderARReceiptsList();
    await renderAPPaymentsList();
    
    // Recalculate totals
    recalculateAR();
    recalculateAP();
}

async function loadPaymentMethodAccounts() {
    const accounts = await store.getAccounts();
    const pmAccountSelect = document.getElementById('pm-account');
    if (pmAccountSelect) {
        pmAccountSelect.innerHTML = accounts
            .filter(acc => acc.type === 'posting')
            .map(acc => `<option value="${acc.code}">${acc.code} - ${acc.name}</option>`)
            .join('');
    }
}

async function renderPaymentMethods() {
    const methods = await db.getAll('paymentMethods');
    const tbody = document.getElementById('payment-methods-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    await loadPaymentMethodAccounts();
    
    if (methods.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">ไม่มีข้อมูลวิธีการชำระเงินในระบบ</td></tr>`;
        return;
    }
    
    methods.sort((a,b) => a.code.localeCompare(b.code)).forEach(pm => {
        const tr = document.createElement('tr');
        const typeThai = pm.type === 'receipt' ? 'รับเงิน (Receipt)' : 'จ่ายเงิน (Payment)';
        tr.innerHTML = `
            <td><strong>${pm.code}</strong></td>
            <td>${pm.name} ${pm.nameEn ? `<br><small style="color:var(--text-muted);">${pm.nameEn}</small>` : ''}</td>
            <td><span class="status-badge ${pm.type === 'receipt' ? 'paid' : 'sent'}">${typeThai}</span></td>
            <td><span style="font-family:monospace; font-weight:600;">${pm.accountCode}</span></td>
            <td>${pm.isCheque ? 'เช็ค (' + (pm.bankCode || '-') + ')' : 'โอน/เงินสด'}</td>
            <td style="text-align:center;">
                <div style="display:flex; gap:6px; justify-content:center;">
                    <button type="button" class="btn btn-secondary btn-sm edit-pm-btn" data-code="${pm.code}"><i class="fa-solid fa-pencil"></i></button>
                    <button type="button" class="btn btn-danger btn-sm delete-pm-btn" data-code="${pm.code}"><i class="fa-solid fa-trash-alt"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    // Bind edit buttons
    document.querySelectorAll('.edit-pm-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const code = btn.getAttribute('data-code');
            const pm = methods.find(item => item.code === code);
            if (pm) {
                currentPmEditCode = code;
                const pmCodeInput = document.getElementById('pm-code');
                if (pmCodeInput) {
                    pmCodeInput.value = pm.code;
                    pmCodeInput.disabled = true;
                }
                const pmNameInput = document.getElementById('pm-name');
                if (pmNameInput) pmNameInput.value = pm.name;
                const pmNameEnInput = document.getElementById('pm-name-en');
                if (pmNameEnInput) pmNameEnInput.value = pm.nameEn || '';
                const pmTypeSelect = document.getElementById('pm-type');
                if (pmTypeSelect) pmTypeSelect.value = pm.type;
                const pmAccountSelect = document.getElementById('pm-account');
                if (pmAccountSelect) pmAccountSelect.value = pm.accountCode;
                const pmIsChequeChk = document.getElementById('pm-is-cheque');
                if (pmIsChequeChk) pmIsChequeChk.checked = !!pm.isCheque;
                const pmBankCodeInput = document.getElementById('pm-bank-code');
                if (pmBankCodeInput) pmBankCodeInput.value = pm.bankCode || '';
                
                const pmFormTitle = document.getElementById('payment-method-form-title');
                if (pmFormTitle) pmFormTitle.innerHTML = `<i class="fa-solid fa-pencil"></i> แก้ไขวิธีการเงิน: ${code}`;
                const btnPmSave = document.getElementById('btn-pm-save');
                if (btnPmSave) btnPmSave.innerText = 'บันทึกการแก้ไข';
            }
        });
    });
    
    // Bind delete buttons
    document.querySelectorAll('.delete-pm-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const code = btn.getAttribute('data-code');
            if (confirm(`คุณต้องการลบวิธีการชำระเงินรหัส ${code} ใช่หรือไม่?`)) {
                await db.deleteItem('paymentMethods', code);
                showToast(`ลบวิธีการชำระเงิน ${code} เรียบร้อยแล้ว`);
                await renderPaymentMethods();
            }
        });
    });
}

function clearPaymentMethodForm() {
    currentPmEditCode = '';
    const pmForm = document.getElementById('payment-method-form');
    if (pmForm) pmForm.reset();
    const pmCodeInput = document.getElementById('pm-code');
    if (pmCodeInput) pmCodeInput.disabled = false;
    const pmFormTitle = document.getElementById('payment-method-form-title');
    if (pmFormTitle) pmFormTitle.innerHTML = `<i class="fa-solid fa-plus-circle"></i> รายละเอียดช่องทางบัญชี`;
    const btnPmSave = document.getElementById('btn-pm-save');
    if (btnPmSave) btnPmSave.innerText = 'บันทึกช่องทาง';
}

function recalculateAR() {
    let invoiceTotal = 0;
    document.querySelectorAll('.ar-pay-input').forEach(input => {
        invoiceTotal += parseFloat(input.value) || 0;
    });
    const arTotalAlloc = document.getElementById('ar-total-allocated');
    if (arTotalAlloc) arTotalAlloc.innerText = formatMoney(invoiceTotal);
    const arSumInvTotal = document.getElementById('ar-summary-invoice-total');
    if (arSumInvTotal) arSumInvTotal.innerText = formatMoney(invoiceTotal) + ' บาท';
    
    const arCashAmt = document.getElementById('ar-cash-amount');
    const arWhtAmt = document.getElementById('ar-wht-amount');
    const arDiscAmt = document.getElementById('ar-discount-amount');
    
    const cash = arCashAmt ? (parseFloat(arCashAmt.value) || 0) : 0;
    const wht = arWhtAmt ? (parseFloat(arWhtAmt.value) || 0) : 0;
    const discount = arDiscAmt ? (parseFloat(arDiscAmt.value) || 0) : 0;
    
    let otherTotal = 0;
    document.querySelectorAll('.ar-other-pay-amount').forEach(input => {
        otherTotal += parseFloat(input.value) || 0;
    });
    
    const paymentsTotal = cash + wht + discount + otherTotal;
    const arSumPayTotal = document.getElementById('ar-summary-payments-total');
    if (arSumPayTotal) arSumPayTotal.innerText = formatMoney(paymentsTotal) + ' บาท';
    
    const diff = invoiceTotal - paymentsTotal;
    const diffEl = document.getElementById('ar-summary-diff');
    if (diffEl) {
        diffEl.innerText = formatMoney(diff) + ' บาท';
        
        const submitBtn = document.getElementById('btn-ar-submit');
        if (Math.abs(diff) < 0.01 && invoiceTotal > 0) {
            diffEl.style.color = 'var(--success-green)';
            if (submitBtn) submitBtn.disabled = false;
        } else {
            diffEl.style.color = 'var(--danger-red)';
            if (submitBtn) submitBtn.disabled = true;
        }
    }
}

function recalculateAP() {
    let billTotal = 0;
    document.querySelectorAll('.ap-pay-input').forEach(input => {
        billTotal += parseFloat(input.value) || 0;
    });
    const apTotalAlloc = document.getElementById('ap-total-allocated');
    if (apTotalAlloc) apTotalAlloc.innerText = formatMoney(billTotal);
    const apSumBillTotal = document.getElementById('ap-summary-bill-total');
    if (apSumBillTotal) apSumBillTotal.innerText = formatMoney(billTotal) + ' บาท';
    
    const apCashAmt = document.getElementById('ap-cash-amount');
    const apWhtAmt = document.getElementById('ap-wht-amount');
    const apDiscAmt = document.getElementById('ap-discount-amount');
    
    const cash = apCashAmt ? (parseFloat(apCashAmt.value) || 0) : 0;
    const wht = apWhtAmt ? (parseFloat(apWhtAmt.value) || 0) : 0;
    const discount = apDiscAmt ? (parseFloat(apDiscAmt.value) || 0) : 0;
    
    let otherTotal = 0;
    document.querySelectorAll('.ap-other-pay-amount').forEach(input => {
        otherTotal += parseFloat(input.value) || 0;
    });
    
    const paymentsTotal = cash + wht + discount + otherTotal;
    const apSumPayTotal = document.getElementById('ap-summary-payments-total');
    if (apSumPayTotal) apSumPayTotal.innerText = formatMoney(paymentsTotal) + ' บาท';
    
    const diff = billTotal - paymentsTotal;
    const diffEl = document.getElementById('ap-summary-diff');
    if (diffEl) {
        diffEl.innerText = formatMoney(diff) + ' บาท';
        
        const submitBtn = document.getElementById('btn-ap-submit');
        if (Math.abs(diff) < 0.01 && billTotal > 0) {
            diffEl.style.color = 'var(--success-green)';
            if (submitBtn) submitBtn.disabled = false;
        } else {
            diffEl.style.color = 'var(--danger-red)';
            if (submitBtn) submitBtn.disabled = true;
        }
    }
}

async function addARPaymentRow(methodCode = '', ref = '', bank = '', amount = 0) {
    const methods = await db.getAll('paymentMethods');
    const receiptMethods = methods.filter(pm => pm.type === 'receipt');
    
    const tbody = document.getElementById('ar-other-payments-tbody');
    const tr = document.createElement('tr');
    tr.className = 'ar-other-pay-row';
    
    const rowId = 'ar-opt-row-' + Date.now() + '-' + Math.floor(Math.random()*1000);
    tr.id = rowId;
    
    const optionsHtml = receiptMethods.map(pm => `<option value="${pm.code}" ${pm.code === methodCode ? 'selected' : ''}>${pm.code} - ${pm.name}</option>`).join('');
    
    tr.innerHTML = `
        <td>
            <select class="form-control ar-other-pay-method" style="width: 100%;">
                ${optionsHtml}
            </select>
        </td>
        <td>
            <input type="text" class="form-control ar-other-pay-ref" value="${ref}" placeholder="เช่น CHQ-12345" required style="width: 100%;">
        </td>
        <td>
            <input type="text" class="form-control ar-other-pay-bank" value="${bank}" placeholder="เช่น KBank" style="width: 100%;">
        </td>
        <td>
            <input type="number" class="form-control num-col ar-other-pay-amount" value="${amount > 0 ? amount.toFixed(2) : '0.00'}" min="0" step="0.01" required style="width: 100%; text-align: right;">
        </td>
        <td style="text-align: center;">
            <button type="button" class="btn btn-danger btn-sm delete-ar-opt-row" data-row="${rowId}" style="padding: 4px 8px;"><i class="fa-solid fa-trash-alt"></i></button>
        </td>
    `;
    
    tbody.appendChild(tr);
    
    tr.querySelector('.ar-other-pay-amount').addEventListener('input', recalculateAR);
    tr.querySelector('.delete-ar-opt-row').addEventListener('click', () => {
        tr.remove();
        recalculateAR();
    });
    
    recalculateAR();
}

async function addAPPaymentRow(methodCode = '', ref = '', bank = '', amount = 0) {
    const methods = await db.getAll('paymentMethods');
    const paymentMethods = methods.filter(pm => pm.type === 'payment');
    
    const tbody = document.getElementById('ap-other-payments-tbody');
    const tr = document.createElement('tr');
    tr.className = 'ap-other-pay-row';
    
    const rowId = 'ap-opt-row-' + Date.now() + '-' + Math.floor(Math.random()*1000);
    tr.id = rowId;
    
    const optionsHtml = paymentMethods.map(pm => `<option value="${pm.code}" ${pm.code === methodCode ? 'selected' : ''}>${pm.code} - ${pm.name}</option>`).join('');
    
    tr.innerHTML = `
        <td>
            <select class="form-control ap-other-pay-method" style="width: 100%;">
                ${optionsHtml}
            </select>
        </td>
        <td>
            <input type="text" class="form-control ap-other-pay-ref" value="${ref}" placeholder="เช่น SCB-9876" required style="width: 100%;">
        </td>
        <td>
            <input type="text" class="form-control ap-other-pay-bank" value="${bank}" placeholder="เช่น SCB" style="width: 100%;">
        </td>
        <td>
            <input type="number" class="form-control num-col ap-other-pay-amount" value="${amount > 0 ? amount.toFixed(2) : '0.00'}" min="0" step="0.01" required style="width: 100%; text-align: right;">
        </td>
        <td style="text-align: center;">
            <button type="button" class="btn btn-danger btn-sm delete-ap-opt-row" data-row="${rowId}" style="padding: 4px 8px;"><i class="fa-solid fa-trash-alt"></i></button>
        </td>
    `;
    
    tbody.appendChild(tr);
    
    tr.querySelector('.ap-other-pay-amount').addEventListener('input', recalculateAP);
    tr.querySelector('.delete-ap-opt-row').addEventListener('click', () => {
        tr.remove();
        recalculateAP();
    });
    
    recalculateAP();
}

async function handleARReceiptSubmit(e) {
    e.preventDefault();
    
    const customerId = document.getElementById('ar-customer-select').value;
    const customerOpt = document.getElementById('ar-customer-select').selectedOptions[0];
    const customerName = customerOpt ? customerOpt.textContent.split(' (')[0] : '';
    const date = document.getElementById('ar-date').value;
    
    let receiptId = document.getElementById('ar-id').value.trim();
    if (!receiptId) {
        receiptId = 'RE-' + Date.now().toString().slice(-8);
    }
    
    const reference = document.getElementById('ar-reference').value.trim();
    const memo = document.getElementById('ar-memo').value.trim();
    
    const invoiceLines = [];
    const inputs = document.querySelectorAll('.ar-pay-input');
    let grandTotal = 0;
    
    for (const input of inputs) {
        const id = input.getAttribute('data-id');
        const paidAmount = parseFloat(input.value) || 0;
        if (paidAmount > 0) {
            invoiceLines.push({ invoiceId: id, amount: paidAmount });
            grandTotal += paidAmount;
        }
    }
    
    if (invoiceLines.length === 0) {
        alert('โปรดระบุยอดเงินชำระอย่างน้อยหนึ่งใบแจ้งหนี้');
        return;
    }
    
    const cashAmount = parseFloat(document.getElementById('ar-cash-amount').value) || 0;
    const whtAmount = parseFloat(document.getElementById('ar-wht-amount').value) || 0;
    const discountAmount = parseFloat(document.getElementById('ar-discount-amount').value) || 0;
    
    const paymentLines = [];
    const pmRows = document.querySelectorAll('.ar-other-pay-row');
    const methods = await db.getAll('paymentMethods');
    
    for (const row of pmRows) {
        const code = row.querySelector('.ar-other-pay-method').value;
        const ref = row.querySelector('.ar-other-pay-ref').value;
        const bank = row.querySelector('.ar-other-pay-bank').value;
        const amount = parseFloat(row.querySelector('.ar-other-pay-amount').value) || 0;
        
        if (amount > 0) {
            const pm = methods.find(item => item.code === code);
            paymentLines.push({
                methodCode: code,
                accountCode: pm ? pm.accountCode : '9999-99',
                reference: ref,
                bankCode: bank,
                amount: amount
            });
        }
    }
    
    const paymentsSum = cashAmount + whtAmount + discountAmount + paymentLines.reduce((sum, line) => sum + line.amount, 0);
    if (Math.abs(grandTotal - paymentsSum) > 0.01) {
        alert('ยอดเงินที่จัดสรรตามบิลและยอดชำระไม่สมดุลกัน โปรดตรวจสอบความถูกต้อง');
        return;
    }
    
    let journalId = '';
    if (editingReceiptId) {
        const oldReceipt = await db.getByKey('arReceipts', editingReceiptId);
        if (oldReceipt) {
            journalId = oldReceipt.journalId || '';
            // Rollback old invoice allocations
            for (const line of oldReceipt.invoiceLines) {
                const inv = await db.getByKey('invoices', line.invoiceId);
                if (inv) {
                    inv.outstanding = (inv.outstanding !== undefined ? inv.outstanding : inv.grandTotal) + line.amount;
                    inv.amountPaid = Math.max(0, (inv.amountPaid !== undefined ? inv.amountPaid : 0) - line.amount);
                    if (inv.outstanding >= inv.grandTotal - 0.01) {
                        inv.status = 'unpaid';
                    } else if (inv.outstanding > 0.01) {
                        inv.status = 'partial';
                    } else {
                        inv.status = 'paid';
                    }
                    await db.putItem('invoices', inv);
                }
            }
        }
    }
    
    const receipt = {
        id: receiptId,
        date,
        customerId,
        customerName,
        reference,
        memo,
        grandTotal,
        cashAmount,
        whtAmount,
        discountAmount,
        invoiceLines,
        paymentLines,
        journalId: journalId
    };
    
    for (const line of invoiceLines) {
        const inv = await db.getByKey('invoices', line.invoiceId);
        if (inv) {
            const currentOutstanding = inv.outstanding !== undefined ? inv.outstanding : inv.grandTotal;
            const currentAmountPaid = inv.amountPaid !== undefined ? inv.amountPaid : (inv.status === 'paid' ? inv.grandTotal : 0);
            
            inv.outstanding = Math.max(0, currentOutstanding - line.amount);
            inv.amountPaid = currentAmountPaid + line.amount;
            
            if (inv.outstanding <= 0.01) {
                inv.status = 'paid';
            } else {
                inv.status = 'partial';
            }
            await db.putItem('invoices', inv);
        }
    }
    
    await store.postReceiptToJournal(receipt);
    
    resetReceiptForm();
    setFormEditMode('ar-receipt-form', false, null);
    showToast(`บันทึกใบรับชำระหนี้ ${receiptId} และผ่านบัญชีเรียบร้อยแล้ว`);
    await renderFinanceView();
}

async function handleAPPaymentSubmit(e) {
    e.preventDefault();
    
    const supplierId = document.getElementById('ap-supplier-select').value;
    const supplierOpt = document.getElementById('ap-supplier-select').selectedOptions[0];
    const supplierName = supplierOpt ? supplierOpt.textContent : '';
    const date = document.getElementById('ap-date').value;
    
    let paymentId = document.getElementById('ap-id').value.trim();
    if (!paymentId) {
        paymentId = 'PS-' + Date.now().toString().slice(-8);
    }
    
    const reference = document.getElementById('ap-reference').value.trim();
    const memo = document.getElementById('ap-memo').value.trim();
    
    const billLines = [];
    const inputs = document.querySelectorAll('.ap-pay-input');
    let grandTotal = 0;
    
    for (const input of inputs) {
        const id = input.getAttribute('data-id');
        const paidAmount = parseFloat(input.value) || 0;
        if (paidAmount > 0) {
            billLines.push({ billId: id, amount: paidAmount });
            grandTotal += paidAmount;
        }
    }
    
    if (billLines.length === 0) {
        alert('โปรดระบุยอดเงินจ่ายชำระอย่างน้อยหนึ่งบิลค่าใช้จ่าย');
        return;
    }
    
    const cashAmount = parseFloat(document.getElementById('ap-cash-amount').value) || 0;
    const whtAmount = parseFloat(document.getElementById('ap-wht-amount').value) || 0;
    const discountAmount = parseFloat(document.getElementById('ap-discount-amount').value) || 0;
    
    const paymentLines = [];
    const pmRows = document.querySelectorAll('.ap-other-pay-row');
    const methods = await db.getAll('paymentMethods');
    
    for (const row of pmRows) {
        const code = row.querySelector('.ap-other-pay-method').value;
        const ref = row.querySelector('.ap-other-pay-ref').value;
        const bank = row.querySelector('.ap-other-pay-bank').value;
        const amount = parseFloat(row.querySelector('.ap-other-pay-amount').value) || 0;
        
        if (amount > 0) {
            const pm = methods.find(item => item.code === code);
            paymentLines.push({
                methodCode: code,
                accountCode: pm ? pm.accountCode : '9999-99',
                reference: ref,
                bankCode: bank,
                amount: amount
            });
        }
    }
    
    const paymentsSum = cashAmount + whtAmount + discountAmount + paymentLines.reduce((sum, line) => sum + line.amount, 0);
    if (Math.abs(grandTotal - paymentsSum) > 0.01) {
        alert('ยอดเงินที่จัดสรรตามบิลและยอดจ่ายชำระไม่สมดุลกัน โปรดตรวจสอบความถูกต้อง');
        return;
    }
    
    let journalId = '';
    if (editingPaymentId) {
        const oldPayment = await db.getByKey('apPayments', editingPaymentId);
        if (oldPayment) {
            journalId = oldPayment.journalId || '';
            // Rollback old bill allocations
            for (const line of oldPayment.billLines) {
                const bill = await db.getByKey('bills', line.billId);
                if (bill) {
                    bill.outstanding = (bill.outstanding !== undefined ? bill.outstanding : bill.totalAmount) + line.amount;
                    bill.amountPaid = Math.max(0, (bill.amountPaid !== undefined ? bill.amountPaid : 0) - line.amount);
                    if (bill.outstanding >= bill.totalAmount - 0.01) {
                        bill.status = 'unpaid';
                    } else if (bill.outstanding > 0.01) {
                        bill.status = 'partial';
                    } else {
                        bill.status = 'paid';
                    }
                    await db.putItem('bills', bill);
                }
            }
        }
    }
    
    const payment = {
        id: paymentId,
        date,
        supplierId,
        supplierName,
        reference,
        memo,
        grandTotal,
        cashAmount,
        whtAmount,
        discountAmount,
        billLines,
        paymentLines,
        journalId: journalId
    };
    
    for (const line of billLines) {
        const bill = await db.getByKey('bills', line.billId);
        if (bill) {
            const currentOutstanding = bill.outstanding !== undefined ? bill.outstanding : bill.totalAmount;
            const currentAmountPaid = bill.amountPaid !== undefined ? bill.amountPaid : (bill.status === 'paid' ? bill.totalAmount : 0);
            
            bill.outstanding = Math.max(0, currentOutstanding - line.amount);
            bill.amountPaid = currentAmountPaid + line.amount;
            
            if (bill.outstanding <= 0.01) {
                bill.status = 'paid';
            } else {
                bill.status = 'partial';
            }
            await db.putItem('bills', bill);
        }
    }
    
    await store.postPaymentToJournal(payment);
    
    resetPaymentForm();
    setFormEditMode('ap-payment-form', false, null);
    showToast(`บันทึกใบสำคัญจ่าย ${paymentId} และผ่านบัญชีเรียบร้อยแล้ว`);
    await renderFinanceView();
}

async function renderARReceiptsList() {
    const receipts = await db.getAll('arReceipts');
    const tbody = document.querySelector('#ar-receipts-list-table tbody');
    tbody.innerHTML = '';
    
    if (receipts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 12px;">ไม่มีประวัติการรับชำระหนี้</td></tr>';
        return;
    }
    
    receipts.sort((a,b) => b.date.localeCompare(a.date)).forEach(re => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${re.id}</strong></td>
            <td>${re.customerName}</td>
            <td>${formatDateToDDMMYYYY(re.date)}</td>
            <td class="num-col" style="text-align: right;">${formatMoney(re.grandTotal)} ฿</td>
            <td style="text-align: center;">
                <button type="button" class="btn btn-secondary btn-sm print-re-btn" data-id="${re.id}" style="padding: 4px 8px; margin-right: 4px;"><i class="fa-solid fa-print"></i> พิมพ์</button>
                <button type="button" class="btn btn-primary btn-sm edit-re-btn" data-id="${re.id}" style="padding: 4px 8px; margin-right: 4px;"><i class="fa-solid fa-pencil"></i> แก้ไข</button>
                <button type="button" class="btn btn-danger btn-sm delete-re-btn" data-id="${re.id}" style="padding: 4px 8px;"><i class="fa-solid fa-trash-alt"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    document.querySelectorAll('.print-re-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            showDocumentPrintPreview('receipt', id);
        });
    });

    document.querySelectorAll('.edit-re-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            startEditReceipt(id);
        });
    });

    document.querySelectorAll('.delete-re-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            if (confirm(`คุณต้องการลบใบรับชำระหนี้ ${id} หรือไม่? ยอดคงค้างใบแจ้งหนี้และสมุดรายวันจะกลับไปเป็นค่าเดิมก่อนชำระ`)) {
                const re = await db.getByKey('arReceipts', id);
                if (re) {
                    for (const line of re.invoiceLines) {
                        const inv = await db.getByKey('invoices', line.invoiceId);
                        if (inv) {
                            inv.outstanding = (inv.outstanding !== undefined ? inv.outstanding : 0) + line.amount;
                            inv.amountPaid = Math.max(0, (inv.amountPaid !== undefined ? inv.amountPaid : inv.grandTotal) - line.amount);
                            
                            if (inv.outstanding >= inv.grandTotal - 0.01) {
                                inv.status = 'unpaid';
                            } else {
                                inv.status = 'partial';
                            }
                            await db.putItem('invoices', inv);
                        }
                    }
                    
                    if (re.journalId) {
                        await db.deleteItem('journalEntries', re.journalId);
                    }
                    
                    await db.deleteItem('arReceipts', id);
                    showToast(`ลบใบรับชำระหนี้ ${id} เรียบร้อยแล้ว`);
                    await renderFinanceView();
                }
            }
        });
    });
}

async function renderAPPaymentsList() {
    const payments = await db.getAll('apPayments');
    const tbody = document.querySelector('#ap-payments-list-table tbody');
    tbody.innerHTML = '';
    
    if (payments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 12px;">ไม่มีประวัติการจ่ายชำระหนี้</td></tr>';
        return;
    }
    
    payments.sort((a,b) => b.date.localeCompare(a.date)).forEach(ps => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${ps.id}</strong></td>
            <td>${ps.supplierName}</td>
            <td>${formatDateToDDMMYYYY(ps.date)}</td>
            <td class="num-col" style="text-align: right;">${formatMoney(ps.grandTotal)} ฿</td>
            <td style="text-align: center;">
                <button type="button" class="btn btn-secondary btn-sm print-ps-btn" data-id="${ps.id}" style="padding: 4px 8px; margin-right: 4px;"><i class="fa-solid fa-print"></i> พิมพ์</button>
                <button type="button" class="btn btn-primary btn-sm edit-ps-btn" data-id="${ps.id}" style="padding: 4px 8px; margin-right: 4px;"><i class="fa-solid fa-pencil"></i> แก้ไข</button>
                <button type="button" class="btn btn-danger btn-sm delete-ps-btn" data-id="${ps.id}" style="padding: 4px 8px;"><i class="fa-solid fa-trash-alt"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    document.querySelectorAll('.print-ps-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            showDocumentPrintPreview('payment', id);
        });
    });

    document.querySelectorAll('.edit-ps-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            startEditPayment(id);
        });
    });

    document.querySelectorAll('.delete-ps-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            if (confirm(`คุณต้องการลบใบจ่ายชำระหนี้ ${id} หรือไม่? ยอดคงค้างบิลและสมุดรายวันจะกลับไปเป็นค่าเดิมก่อนชำระ`)) {
                const ps = await db.getByKey('apPayments', id);
                if (ps) {
                    for (const line of ps.billLines) {
                        const bill = await db.getByKey('bills', line.billId);
                        if (bill) {
                            bill.outstanding = (bill.outstanding !== undefined ? bill.outstanding : 0) + line.amount;
                            bill.amountPaid = Math.max(0, (bill.amountPaid !== undefined ? bill.amountPaid : bill.totalAmount) - line.amount);
                            
                            if (bill.outstanding >= bill.totalAmount - 0.01) {
                                bill.status = 'unpaid';
                            } else {
                                bill.status = 'partial';
                            }
                            await db.putItem('bills', bill);
                        }
                    }
                    
                    if (ps.journalId) {
                        await db.deleteItem('journalEntries', ps.journalId);
                    }
                    
                    await db.deleteItem('apPayments', id);
                    showToast(`ลบใบจ่ายชำระหนี้ ${id} เรียบร้อยแล้ว`);
                    await renderFinanceView();
                }
            }
        });
    });
}

// =========================================================================
// 15. OPENING BALANCES CONTROLLER
// =========================================================================

let openingBalancesList = []; // Array of { accountCode, accountName, category, debit, credit }

async function renderOpeningBalances() {
    const tbody = document.getElementById('opening-balances-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" class="text-center"><div style="padding: 20px;"><i class="fa-solid fa-spinner fa-spin" style="font-size: 24px; color: var(--primary-color);"></i></div></td></tr>';
    
    // Load accounts and existing opening JV
    const accounts = await store.getAccounts();
    const postingAccounts = accounts.filter(acc => acc.type === 'posting' && acc.code !== '9999-99');
    
    const openingJV = await store.getOpeningJournalEntry();
    const balanceMap = {};
    if (openingJV) {
        document.getElementById('opening-balance-date').value = openingJV.date;
        openingJV.lines.forEach(line => {
            balanceMap[line.accountCode] = {
                debit: line.debit || 0,
                credit: line.credit || 0
            };
        });
    } else {
        document.getElementById('opening-balance-date').value = globalPeriod ? globalPeriod.startDate : '2026-01-01';
    }
    
    openingBalancesList = postingAccounts.map(acc => {
        const bal = balanceMap[acc.code] || { debit: 0, credit: 0 };
        return {
            accountCode: acc.code,
            accountName: acc.name,
            category: acc.category,
            debit: bal.debit,
            credit: bal.credit
        };
    });
    
    populateOpeningBalancesTable();
    recalculateOpeningBalances();
}

function populateOpeningBalancesTable() {
    const tbody = document.getElementById('opening-balances-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const searchVal = document.getElementById('opening-search').value.toLowerCase().trim();
    
    const filtered = openingBalancesList.filter(item => {
        return item.accountCode.toLowerCase().includes(searchVal) ||
               item.accountName.toLowerCase().includes(searchVal);
    });
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">ไม่พบรายการบัญชีที่ค้นหา</td></tr>';
        return;
    }
    
    filtered.forEach(item => {
        const tr = document.createElement('tr');
        
        let categoryThai = '';
        switch (item.category) {
            case 'asset': categoryThai = 'สินทรัพย์'; break;
            case 'liability': categoryThai = 'หนี้สิน'; break;
            case 'equity': categoryThai = 'ส่วนของทุน'; break;
            case 'revenue': categoryThai = 'รายได้'; break;
            case 'expense': categoryThai = 'ค่าใช้จ่าย'; break;
        }
        
        tr.innerHTML = `
            <td><strong>${item.accountCode}</strong></td>
            <td>${item.accountName}</td>
            <td><span class="status-badge ${item.category === 'asset' || item.category === 'revenue' ? 'paid' : 'sent'}">${categoryThai}</span></td>
            <td style="text-align: right;">
                <input type="number" class="form-control num-col op-debit-input" data-code="${item.accountCode}" value="${item.debit > 0 ? item.debit.toFixed(2) : ''}" placeholder="0.00" style="text-align: right; width: 130px; display: inline-block; font-size: 13px;" step="0.01" min="0">
            </td>
            <td style="text-align: right;">
                <input type="number" class="form-control num-col op-credit-input" data-code="${item.accountCode}" value="${item.credit > 0 ? item.credit.toFixed(2) : ''}" placeholder="0.00" style="text-align: right; width: 130px; display: inline-block; font-size: 13px;" step="0.01" min="0">
            </td>
        `;
        
        tbody.appendChild(tr);
    });
    
    // Bind change events
    tbody.querySelectorAll('.op-debit-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const code = e.target.getAttribute('data-code');
            const val = parseFloat(e.target.value) || 0;
            const match = openingBalancesList.find(x => x.accountCode === code);
            if (match) {
                match.debit = val;
                if (val > 0) {
                    match.credit = 0;
                    const creditInput = tbody.querySelector(`.op-credit-input[data-code="${code}"]`);
                    if (creditInput) creditInput.value = '';
                }
            }
            recalculateOpeningBalances();
        });
    });
    
    tbody.querySelectorAll('.op-credit-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const code = e.target.getAttribute('data-code');
            const val = parseFloat(e.target.value) || 0;
            const match = openingBalancesList.find(x => x.accountCode === code);
            if (match) {
                match.credit = val;
                if (val > 0) {
                    match.debit = 0;
                    const debitInput = tbody.querySelector(`.op-debit-input[data-code="${code}"]`);
                    if (debitInput) debitInput.value = '';
                }
            }
            recalculateOpeningBalances();
        });
    });
}

function filterOpeningBalancesTable() {
    populateOpeningBalancesTable();
}

function recalculateOpeningBalances() {
    let totalDebit = 0;
    let totalCredit = 0;
    
    openingBalancesList.forEach(item => {
        totalDebit += item.debit;
        totalCredit += item.credit;
    });
    
    const diff = totalDebit - totalCredit;
    
    const totalDebitEl = document.getElementById('opening-total-debit');
    const totalCreditEl = document.getElementById('opening-total-credit');
    const totalDiffEl = document.getElementById('opening-total-diff');
    const warningEl = document.getElementById('opening-suspense-warning');
    
    if (totalDebitEl) totalDebitEl.innerText = formatMoney(totalDebit);
    if (totalCreditEl) totalCreditEl.innerText = formatMoney(totalCredit);
    if (totalDiffEl) {
        totalDiffEl.innerText = formatMoney(diff);
        if (Math.abs(diff) < 0.01) {
            totalDiffEl.style.color = 'var(--success-green)';
            if (warningEl) warningEl.style.display = 'none';
        } else {
            totalDiffEl.style.color = 'var(--danger-red)';
            if (warningEl) warningEl.style.display = 'inline-block';
        }
    }
}

async function handleSaveOpeningBalances() {
    const date = document.getElementById('opening-balance-date').value;
    if (!date) {
        alert('กรุณาระบุวันที่บันทึกยоดยกมา');
        return;
    }
    
    try {
        await store.saveOpeningBalances(date, openingBalancesList);
        showToast('บันทึกยоดยกมาเริ่มต้นงวดบัญชีเรียบร้อยแล้ว');
        await renderOpeningBalances();
    } catch (err) {
        console.error('Error saving opening balances:', err);
        showToast('เกิดข้อผิดพลาดในการบันทึก: ' + err.message, 'error');
    }
}

// =========================================================================
// 16. PETTY CASH CONTROLLER
// =========================================================================

let pettyCashPayLines = []; 
let vrSelectedDps = []; 

async function renderPettyCashView() {
    const today = new Date().toISOString().split('T')[0];
    const pcPayDate = document.getElementById('pc-pay-date');
    if (pcPayDate) pcPayDate.value = today;
    const pcReimDate = document.getElementById('pc-reim-date');
    if (pcReimDate) pcReimDate.value = today;
    
    pettyCashPayLines = [];
    vrSelectedDps = [];
    
    const pcPayForm = document.getElementById('pc-payment-form');
    if (pcPayForm) pcPayForm.reset();
    if (pcPayDate) pcPayDate.value = today;
    
    const pcReimForm = document.getElementById('pc-reimburse-form');
    if (pcReimForm) pcReimForm.reset();
    if (pcReimDate) pcReimDate.value = today;
    
    await generateDocumentIds();
    await loadContactsDropdowns();
    await populateReimburseGLAccountDropdown();
    await renderDPLinesTable();
    await renderDPHistoryTable();
    await renderVRHistoryTable();
    await loadPendingDPsForReimbursement();
    
    recalculateDP();
    recalculateVR();
}

async function generateDocumentIds() {
    const dps = await db.getAll('pettyCashPayments');
    const vrs = await db.getAll('pettyCashReimbursements');
    
    const getNextDocId = (docs, prefixLetter, dateStr) => {
        const dateObj = dateStr ? new Date(dateStr) : new Date();
        const yy = dateObj.getFullYear().toString().substring(2);
        const mm = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        const dd = dateObj.getDate().toString().padStart(2, '0');
        
        const targetPrefix = `${prefixLetter}${yy}${mm}-${dd}`;
        
        const allDocs = docs.filter(x => x.id && x.id.startsWith(targetPrefix));
        
        if (allDocs.length > 0) {
            // รันต่อจากที่เพิ่มเข้าไปล่าสุด (ตัวสุดท้ายใน array)
            const lastId = allDocs[allDocs.length - 1].id;
            if (lastId) {
                const seqStr = lastId.substring(targetPrefix.length);
                const seq = parseInt(seqStr, 10);
                if (!isNaN(seq)) {
                    return targetPrefix + String(seq + 1).padStart(2, '0');
                }
            }
        }
        
        return `${targetPrefix}01`;
    };

    const pcPayId = document.getElementById('pc-pay-id');
    if (pcPayId) pcPayId.value = getNextDocId(dps, 'DP', document.getElementById('pc-pay-date')?.value);
    
    const pcReimId = document.getElementById('pc-reim-id');
    if (pcReimId) pcReimId.value = getNextDocId(vrs, 'VR', document.getElementById('pc-reim-date')?.value);
}

async function populateReimburseGLAccountDropdown() {
    const accounts = await store.getAccounts();
    const pcReimAccount = document.getElementById('pc-reim-account');
    if (!pcReimAccount) return;
    
    const assetAccounts = accounts.filter(a => a.type === 'posting' && a.category === 'asset');
    pcReimAccount.innerHTML = assetAccounts
        .map(a => `<option value="${a.code}">${a.code} - ${a.name}</option>`)
        .join('');
}

async function renderDPLinesTable() {
    const tbody = document.getElementById('pc-pay-lines-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (pettyCashPayLines.length === 0) {
        addDPLinesRow();
        return;
    }
    
    const accounts = await store.getAccounts();
    const postingAccounts = accounts.filter(a => a.type === 'posting');
    
    pettyCashPayLines.forEach((line, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <select class="form-control dp-line-account" data-index="${index}" style="font-size: 13px;">
                    <option value="">-- เลือกรหัสบัญชี --</option>
                    ${postingAccounts.map(a => `<option value="${a.code}" ${a.code === line.accountCode ? 'selected' : ''}>${a.code} - ${a.name}</option>`).join('')}
                </select>
            </td>
            <td>
                <input type="text" class="form-control dp-line-desc" data-index="${index}" value="${line.description}" placeholder="รายละเอียดค่าใช้จ่าย..." required style="font-size: 13px;">
            </td>
            <td>
                <select class="form-control dp-line-wht" data-index="${index}" style="font-size: 13px;">
                    <option value="none" ${line.whtRate === 'none' ? 'selected' : ''}>ไม่หัก</option>
                    <option value="1" ${line.whtRate === '1' ? 'selected' : ''}>หัก 1%</option>
                    <option value="2" ${line.whtRate === '2' ? 'selected' : ''}>หัก 2%</option>
                    <option value="3" ${line.whtRate === '3' ? 'selected' : ''}>หัก 3%</option>
                    <option value="5" ${line.whtRate === '5' ? 'selected' : ''}>หัก 5%</option>
                </select>
            </td>
            <td>
                <input type="number" class="form-control num-col dp-line-amount" data-index="${index}" value="${line.amount > 0 ? line.amount.toFixed(2) : ''}" placeholder="0.00" step="0.01" min="0.01" required style="font-size: 13px; text-align: right;">
            </td>
            <td style="text-align: center;">
                <button type="button" class="btn btn-danger btn-sm delete-dp-line-btn" data-index="${index}" style="padding: 4px 8px;"><i class="fa-solid fa-trash-alt"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    tbody.querySelectorAll('.dp-line-account').forEach(select => {
        select.addEventListener('change', (e) => {
            const idx = parseInt(e.target.getAttribute('data-index'));
            const code = e.target.value;
            const match = postingAccounts.find(x => x.code === code);
            pettyCashPayLines[idx].accountCode = code;
            pettyCashPayLines[idx].accountName = match ? match.name : '';
            recalculateDP();
        });
    });
    
    tbody.querySelectorAll('.dp-line-desc').forEach(input => {
        input.addEventListener('input', (e) => {
            const idx = parseInt(e.target.getAttribute('data-index'));
            pettyCashPayLines[idx].description = e.target.value;
        });
    });

    tbody.querySelectorAll('.dp-line-wht').forEach(select => {
        select.addEventListener('change', (e) => {
            const idx = parseInt(e.target.getAttribute('data-index'));
            pettyCashPayLines[idx].whtRate = e.target.value;
            recalculateDP();
        });
    });
    
    tbody.querySelectorAll('.dp-line-amount').forEach(input => {
        input.addEventListener('input', (e) => {
            const idx = parseInt(e.target.getAttribute('data-index'));
            pettyCashPayLines[idx].amount = parseFloat(e.target.value) || 0;
            recalculateDP();
        });
    });
    
    tbody.querySelectorAll('.delete-dp-line-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(btn.getAttribute('data-index'));
            pettyCashPayLines.splice(idx, 1);
            renderDPLinesTable();
            recalculateDP();
        });
    });
}

function addDPLinesRow() {
    const globalWhtSelect = document.getElementById('pc-pay-wht-rate');
    const defaultWht = globalWhtSelect ? globalWhtSelect.value : 'none';
    pettyCashPayLines.push({
        accountCode: '',
        accountName: '',
        description: '',
        whtRate: defaultWht,
        whtAmount: 0,
        amount: 0
    });
    renderDPLinesTable();
}

function recalculateDP() {
    let total = 0;
    pettyCashPayLines.forEach(line => {
        total += line.amount;
    });
    
    // 1. Calculate VAT
    const vatTypeSelect = document.getElementById('pc-pay-vat-type');
    const vatAmountInput = document.getElementById('pc-pay-vat-amount');
    const vatType = vatTypeSelect ? vatTypeSelect.value : 'none';
    
    let calculatedVat = 0;
    let baseAmount = total;
    if (vatType === 'include') {
        baseAmount = total / 1.07;
        calculatedVat = total - baseAmount;
    } else if (vatType === 'exclude') {
        baseAmount = total;
        calculatedVat = total * 0.07;
    }
    
    // Auto-populate VAT Amount on type change (or if input is not focused)
    if (vatAmountInput && document.activeElement !== vatAmountInput) {
        vatAmountInput.value = calculatedVat.toFixed(2);
    }
    
    let vatAmount = 0;
    if (vatAmountInput) {
        vatAmount = parseFloat(vatAmountInput.value) || 0;
    }
    
    // 2. Calculate WHT (based on pre-tax base amount of each line)
    let totalWhtAmount = 0;
    pettyCashPayLines.forEach(line => {
        const rateStr = line.whtRate || 'none';
        let lineBase = line.amount;
        if (vatType === 'include') {
            lineBase = line.amount / 1.07;
        }
        if (rateStr !== 'none') {
            const rate = parseFloat(rateStr) || 0;
            line.whtAmount = Math.round((lineBase * (rate / 100)) * 100) / 100;
        } else {
            line.whtAmount = 0;
        }
        totalWhtAmount += line.whtAmount;
    });
    
    // Update global WHT rate select dropdown dynamically
    const activeRates = [...new Set(pettyCashPayLines.map(l => l.whtRate || 'none'))];
    const whtRateSelect = document.getElementById('pc-pay-wht-rate');
    if (whtRateSelect) {
        const mixedOpt = whtRateSelect.querySelector('option[value="mixed"]');
        if (mixedOpt) mixedOpt.remove();
        
        if (activeRates.length > 1) {
            const opt = document.createElement('option');
            opt.value = 'mixed';
            opt.textContent = 'หักหลายอัตรา (Mixed)';
            whtRateSelect.appendChild(opt);
            whtRateSelect.value = 'mixed';
        } else if (activeRates.length === 1) {
            whtRateSelect.value = activeRates[0];
        } else {
            whtRateSelect.value = 'none';
        }
    }
    
    const whtAmountInput = document.getElementById('pc-pay-wht-amount');
    if (whtAmountInput) {
        whtAmountInput.value = totalWhtAmount.toFixed(2);
    }
    
    let whtAmount = totalWhtAmount;
    
    // 3. Calculate Net Cash Paid
    let netAmount = total - whtAmount;
    if (vatType === 'exclude') {
        netAmount = total + vatAmount - whtAmount;
    }
    
    const totalEl = document.getElementById('pc-pay-total-amount');
    if (totalEl) {
        totalEl.innerHTML = `
            <div style="font-size: 13px; font-weight: normal; color: var(--text-secondary); margin-bottom: 2px;">
                ยอดก่อนภาษี (Base): ${formatMoney(baseAmount)} ฿ | VAT: ${formatMoney(vatAmount)} ฿ | หัก ณ ที่จ่าย: ${formatMoney(whtAmount)} ฿
            </div>
            <div>ยอดจ่ายสุทธิ (เงินสด): <span style="color: var(--primary-color); font-size: 16px;">${formatMoney(netAmount)} ฿</span></div>
        `;
    }
}

async function handleDPFormSubmit(e) {
    e.preventDefault();
    
    const dpId = document.getElementById('pc-pay-id').value.trim();
    const date = document.getElementById('pc-pay-date').value;
    const type = document.getElementById('pc-pay-type').value;
    const status = document.getElementById('pc-pay-status').value;
    const remarks = document.getElementById('pc-pay-remarks').value.trim();
    const contactCode = document.getElementById('pc-pay-contact').value;
    const whtType = document.getElementById('pc-pay-wht-rate').value;
    const whtAmount = parseFloat(document.getElementById('pc-pay-wht-amount').value) || 0;
    const vatType = document.getElementById('pc-pay-vat-type').value;
    const vatAmount = parseFloat(document.getElementById('pc-pay-vat-amount').value) || 0;
    const taxInvoiceNo = document.getElementById('pc-pay-vat-no').value.trim();
    
    if (!dpId || !date) {
        alert('กรุณาระบุเลขที่และวันที่เอกสาร');
        return;
    }
    
    if (pettyCashPayLines.length === 0 || pettyCashPayLines.some(l => !l.accountCode || l.amount <= 0)) {
        alert('กรุณากรอกรายการบัญชีและจำนวนเงินให้ถูกต้อง');
        return;
    }
    
    if (editingDPId && editingDPId !== dpId) {
        const existing = await db.getByKey('pettyCashPayments', dpId);
        if (existing) {
            alert(`รหัสใบจ่ายเงินสดย่อย ${dpId} นี้มีอยู่ในระบบแล้ว! โปรดใช้รหัสอื่น`);
            return;
        }
    } else if (!editingDPId) {
        const existing = await db.getByKey('pettyCashPayments', dpId);
        if (existing) {
            alert(`รหัสใบจ่ายเงินสดย่อย ${dpId} นี้มีอยู่ในระบบแล้ว! โปรดใช้รหัสอื่นหรือคลิกล้างค่าใหม่`);
            return;
        }
    }
    
    let vrId = '';
    if (editingDPId) {
        const existingDP = await db.getByKey('pettyCashPayments', editingDPId);
        if (existingDP) {
            vrId = existingDP.vrId || '';
        }
    }
    
    const totalAmount = pettyCashPayLines.reduce((sum, l) => sum + l.amount, 0);
    
    const dpObj = {
        id: dpId,
        date: date,
        type: type,
        status: status,
        remarks: remarks,
        lines: pettyCashPayLines.map(l => ({
            accountCode: l.accountCode,
            accountName: l.accountName,
            description: l.description,
            amount: l.amount,
            whtRate: l.whtRate || 'none',
            whtAmount: l.whtAmount || 0
        })),
        totalAmount: totalAmount,
        vrId: vrId,
        contactCode: contactCode,
        whtType: whtType,
        whtAmount: whtAmount,
        vatType: vatType,
        vatAmount: vatAmount,
        taxInvoiceNo: taxInvoiceNo
    };
    
    try {
        if (editingDPId && editingDPId !== dpId) {
            await db.deleteItem('pettyCashPayments', editingDPId);
        }
        await db.putItem('pettyCashPayments', dpObj);
        showToast(`บันทึกใบจ่ายเงินสดย่อย ${dpId} เรียบร้อยแล้ว`);
        resetDPForm();
        setFormEditMode('pc-payment-form', false, null);
        await renderPettyCashView();
    } catch (err) {
        console.error('Error saving DP:', err);
        showToast('เกิดข้อผิดพลาดในการบันทึก: ' + err.message, 'error');
    }
}

async function renderDPHistoryTable() {
    const tbody = document.querySelector('#pc-pay-history-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const dps = await db.getAll('pettyCashPayments');
    if (dps.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 12px;">ไม่มีประวัติการจ่ายเงินสดย่อย</td></tr>';
        return;
    }
    
    dps.sort((a,b) => b.id.localeCompare(a.id)).forEach(dp => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${dp.id}</strong></td>
            <td>${formatDateToDDMMYYYY(dp.date)}</td>
            <td>${dp.remarks}</td>
            <td style="text-align: right; font-family: monospace;">${formatMoney(dp.totalAmount)} ฿</td>
            <td>${dp.vrId ? `<span class="status-badge paid">${dp.vrId}</span>` : '<span class="status-badge sent">ค้างเบิกชดเชย</span>'}</td>
            <td style="text-align: center;">
                <button type="button" class="btn btn-secondary btn-sm print-dp-btn" data-id="${dp.id}" style="padding: 4px 8px; margin-right: 4px;"><i class="fa-solid fa-print"></i> พิมพ์</button>
                ${!dp.vrId ? `<button type="button" class="btn btn-primary btn-sm edit-dp-btn" data-id="${dp.id}" style="padding: 4px 8px; margin-right: 4px;"><i class="fa-solid fa-pencil"></i> แก้ไข</button>` : ''}
                <button type="button" class="btn btn-danger btn-sm delete-dp-btn" data-id="${dp.id}" style="padding: 4px 8px;" ${dp.vrId ? 'disabled title="ถูกชดเชยแล้ว ห้ามลบ"' : ''}><i class="fa-solid fa-trash-alt"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    tbody.querySelectorAll('.print-dp-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            showDocumentPrintPreview('pettycash-pay', id);
        });
    });

    tbody.querySelectorAll('.edit-dp-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            startEditDP(id);
        });
    });

    tbody.querySelectorAll('.delete-dp-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            if (confirm(`คุณต้องการลบเอกสารจ่ายเงินสดย่อย ${id} ใช่หรือไม่?`)) {
                await db.deleteItem('pettyCashPayments', id);
                showToast(`ลบเอกสาร ${id} เรียบร้อยแล้ว`);
                await renderPettyCashView();
            }
        });
    });
}

async function loadPendingDPsForReimbursement() {
    const tbody = document.getElementById('pc-reim-pending-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const dps = await db.getAll('pettyCashPayments');
    const pendingDps = dps.filter(dp => {
        const isIncludedInThis = editingVRId && dp.vrId === editingVRId;
        return (!dp.vrId && dp.status === 'เรียบร้อย') || isIncludedInThis;
    });
    
    if (pendingDps.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 12px;">ไม่มีรายการใบจ่ายเงินสดย่อยที่รอเบิกชดเชย</td></tr>';
        return;
    }
    
    pendingDps.sort((a,b) => a.date.localeCompare(b.date)).forEach(dp => {
        const isChecked = editingVRId && dp.vrId === editingVRId;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="text-align: center;">
                <input type="checkbox" class="pc-reim-pending-chk" data-id="${dp.id}" ${isChecked ? 'checked' : ''}>
            </td>
            <td><strong>${dp.id}</strong></td>
            <td>${formatDateToDDMMYYYY(dp.date)}</td>
            <td>${dp.remarks}</td>
            <td style="text-align: right; font-family: monospace;">${formatMoney(dp.totalAmount)} ฿</td>
        `;
        tbody.appendChild(tr);
    });
    
    tbody.querySelectorAll('.pc-reim-pending-chk').forEach(chk => {
        chk.addEventListener('change', async (e) => {
            const id = e.target.getAttribute('data-id');
            const isChecked = e.target.checked;
            
            if (isChecked) {
                const dp = await db.getByKey('pettyCashPayments', id);
                if (dp) {
                    if (!vrSelectedDps.some(x => x.id === id)) {
                        vrSelectedDps.push(dp);
                    }
                }
            } else {
                vrSelectedDps = vrSelectedDps.filter(x => x.id !== id);
            }
            recalculateVR();
        });
    });
}

function recalculateVR() {
    const linesTbody = document.getElementById('pc-reim-lines-tbody');
    const totalEl = document.getElementById('pc-reim-total-amount');
    const submitBtn = document.getElementById('btn-pc-reim-submit');
    
    if (!linesTbody || !totalEl || !submitBtn) return;
    
    if (vrSelectedDps.length === 0) {
        linesTbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">กรุณาเลือกรายการ DP เพื่อคำนวณบัญชี</td></tr>';
        totalEl.innerText = '0.00 บาท';
        submitBtn.disabled = true;
        return;
    }
    
    const agg = {};
    let total = 0;
    
    vrSelectedDps.forEach(dp => {
        total += dp.totalAmount;
        dp.lines.forEach(l => {
            if (!agg[l.accountCode]) {
                agg[l.accountCode] = {
                    accountCode: l.accountCode,
                    accountName: l.accountName,
                    amount: 0
                };
            }
            agg[l.accountCode].amount += l.amount;
        });
    });
    
    linesTbody.innerHTML = '';
    Object.values(agg).sort((a,b) => a.accountCode.localeCompare(b.accountCode)).forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong style="font-family: monospace;">${row.accountCode}</strong></td>
            <td>${row.accountName}</td>
            <td style="text-align: right; font-family: monospace; font-weight: 600;">${formatMoney(row.amount)} ฿</td>
        `;
        linesTbody.appendChild(tr);
    });
    
    totalEl.innerText = formatMoney(total) + ' บาท';
    submitBtn.disabled = false;
}

async function handleVRFormSubmit(e) {
    e.preventDefault();
    
    const vrId = document.getElementById('pc-reim-id').value.trim();
    const date = document.getElementById('pc-reim-date').value;
    const explanation = document.getElementById('pc-reim-explanation').value.trim();
    const reimburseAccount = document.getElementById('pc-reim-account').value;
    
    if (!vrId || !date || !reimburseAccount || vrSelectedDps.length === 0) {
        alert('กรุณากรอกข้อมูลให้ครบถ้วนและเลือกรายการ DP อย่างน้อย 1 รายการ');
        return;
    }
    
    if (editingVRId && editingVRId !== vrId) {
        const existing = await db.getByKey('pettyCashReimbursements', vrId);
        if (existing) {
            alert(`รหัสใบเบิกชดเชย ${vrId} นี้มีอยู่ในระบบแล้ว! โปรดใช้รหัสอื่น`);
            return;
        }
    } else if (!editingVRId) {
        const existing = await db.getByKey('pettyCashReimbursements', vrId);
        if (existing) {
            alert(`รหัสใบเบิกชดเชย ${vrId} นี้มีอยู่ในระบบแล้ว! โปรดใช้รหัสอื่นหรือคลิกล้างค่าใหม่`);
            return;
        }
    }
    
    let journalId = '';
    if (editingVRId) {
        const existingVR = await db.getByKey('pettyCashReimbursements', editingVRId);
        if (existingVR) {
            journalId = existingVR.journalId || '';
        }
    }
    
    if (editingVRId) {
        // Clear vrId from all DPs originally in this VR first
        const allDPs = await db.getAll('pettyCashPayments');
        const oldVRDPs = allDPs.filter(dp => dp.vrId === editingVRId);
        for (const dp of oldVRDPs) {
            dp.vrId = '';
            await db.putItem('pettyCashPayments', dp);
        }
    }
    
    const agg = {};
    vrSelectedDps.forEach(dp => {
        dp.lines.forEach(l => {
            if (!agg[l.accountCode]) {
                agg[l.accountCode] = {
                    accountCode: l.accountCode,
                    accountName: l.accountName,
                    amount: 0
                };
            }
            agg[l.accountCode].amount += l.amount;
        });
    });
    
    const totalAmount = vrSelectedDps.reduce((sum, d) => sum + d.totalAmount, 0);
    
    const vrObj = {
        id: vrId,
        date: date,
        explanation: explanation,
        reimburseAccount: reimburseAccount,
        dpIds: vrSelectedDps.map(d => d.id),
        lines: Object.values(agg),
        totalAmount: totalAmount,
        journalId: journalId
    };
    
    try {
        if (editingVRId && editingVRId !== vrId) {
            await db.deleteItem('pettyCashReimbursements', editingVRId);
        }
        const newJournalId = await store.postPettyCashReimbursementToJournal(vrObj);
        
        for (const dp of vrSelectedDps) {
            dp.vrId = vrId;
            await db.putItem('pettyCashPayments', dp);
        }
        
        showToast(`บันทึกใบเบิกชดเชย ${vrId} และผ่านรายการสมุดรายวันเรียบร้อยแล้ว`);
        vrSelectedDps = [];
        resetVRForm();
        setFormEditMode('pc-reimburse-form', false, null);
        await renderPettyCashView();
    } catch (err) {
        console.error('Error saving VR:', err);
        showToast('เกิดข้อผิดพลาดในการบันทึก: ' + err.message, 'error');
    }
}

async function renderVRHistoryTable() {
    const tbody = document.querySelector('#pc-reim-history-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const vrs = await db.getAll('pettyCashReimbursements');
    if (vrs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 12px;">ไม่มีประวัติการเบิกชดเชยเงินสดย่อย</td></tr>';
        return;
    }
    
    vrs.sort((a,b) => b.id.localeCompare(a.id)).forEach(vr => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${vr.id}</strong></td>
            <td>${formatDateToDDMMYYYY(vr.date)}</td>
            <td>${vr.explanation}</td>
            <td style="text-align: right; font-family: monospace;">${formatMoney(vr.totalAmount)} ฿</td>
            <td><span style="font-family: monospace;">${vr.reimburseAccount}</span></td>
            <td style="text-align: center;">
                <button type="button" class="btn btn-secondary btn-sm print-vr-btn" data-id="${vr.id}" style="padding: 4px 8px; margin-right: 4px;"><i class="fa-solid fa-print"></i> พิมพ์</button>
                <button type="button" class="btn btn-primary btn-sm edit-vr-btn" data-id="${vr.id}" style="padding: 4px 8px; margin-right: 4px;"><i class="fa-solid fa-pencil"></i> แก้ไข</button>
                <button type="button" class="btn btn-danger btn-sm delete-vr-btn" data-id="${vr.id}" style="padding: 4px 8px;"><i class="fa-solid fa-trash-alt"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    tbody.querySelectorAll('.print-vr-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            showDocumentPrintPreview('pettycash-reim', id);
        });
    });

    tbody.querySelectorAll('.edit-vr-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            startEditVR(id);
        });
    });

    tbody.querySelectorAll('.delete-vr-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            if (confirm(`คุณต้องการลบเอกสารเบิกชดเชย ${id} หรือไม่?\n(ใบจ่ายเงินสดย่อยที่เกี่ยวข้องจะกลับมาค้างเบิก และการลงบัญชีจะถูก rollback)`)) {
                try {
                    const vr = await db.getByKey('pettyCashReimbursements', id);
                    if (vr) {
                        for (const dpId of vr.dpIds) {
                            const dp = await db.getByKey('pettyCashPayments', dpId);
                            if (dp) {
                                dp.vrId = '';
                                await db.putItem('pettyCashPayments', dp);
                            }
                        }
                        
                        // Delete all journal entries that match reference = vr.id or reference starts with vr.id + " / "
                        const jes = await db.getAll('journalEntries');
                        const matchingJes = jes.filter(je => je.reference === id || (je.reference && je.reference.startsWith(id + ' / ')));
                        for (const je of matchingJes) {
                            await db.deleteItem('journalEntries', je.id);
                        }
                        
                        await db.deleteItem('pettyCashReimbursements', id);
                        showToast(`ลบเอกสารเบิกชดเชย ${id} และ Rollback ข้อมูลเรียบร้อยแล้ว`);
                        await renderPettyCashView();
                    }
                } catch (err) {
                    console.error('Error deleting VR:', err);
                    showToast('เกิดข้อผิดพลาดในการลบ: ' + err.message, 'error');
                }
            }
        });
    });
}

// =========================================================================
// MULTI-COMPANY MANAGEMENT CONTROLLER
// =========================================================================
let selectedCompanyCodeInSwitcher = '';

async function initMultiCompany() {
    await db.openSystemDB();
    let companies = await db.getCompanies();
    if (companies.length === 0) {
        await db.addCompany('test', '0.ทดลอง');
        companies = await db.getCompanies();
    }
    
    let activeCode = db.getActiveCompanyCode();
    let activeComp = companies.find(c => c.code === activeCode);
    if (!activeComp) {
        activeCode = companies[0].code;
        db.setActiveCompanyCode(activeCode);
        activeComp = companies[0];
    }
}

async function renderCompanyList() {
    const companies = await db.getCompanies();
    const searchInput = document.getElementById('company-search-input');
    const searchVal = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const tbody = document.getElementById('company-list-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const activeCode = db.getActiveCompanyCode();
    const filtered = companies.filter(c => 
        c.code.toLowerCase().includes(searchVal) || 
        c.name.toLowerCase().includes(searchVal)
    );
    
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 16px;">ไม่พบข้อมูลกิจการ</td></tr>`;
        return;
    }
    
    filtered.sort((a, b) => a.code.localeCompare(b.code)).forEach(c => {
        const tr = document.createElement('tr');
        tr.className = 'clickable-row';
        if (c.code === selectedCompanyCodeInSwitcher) {
            tr.classList.add('selected');
        }
        
        const isCurrent = c.code === activeCode;
        const nameText = isCurrent ? `<strong>${c.name} (เปิดใช้งานอยู่)</strong>` : c.name;
        
        tr.innerHTML = `
            <td>${nameText}</td>
            <td><code>${c.code}</code></td>
            <td><code>${c.dbPath}</code></td>
        `;
        
        tr.addEventListener('click', () => {
            document.querySelectorAll('#company-list-table tbody tr').forEach(r => r.classList.remove('selected'));
            tr.classList.add('selected');
            selectedCompanyCodeInSwitcher = c.code;
        });
        
        tr.addEventListener('dblclick', async () => {
            selectedCompanyCodeInSwitcher = c.code;
            await performCompanySwitch(c.code);
        });
        
        tbody.appendChild(tr);
    });
}

async function performCompanySwitch(code) {
    if (!code) return;
    try {
        db.closeDB();
        db.setActiveCompanyCode(code);
        await store.initializeStore();
        
        companyProfile = await db.getByKey('settings', 'company_profile');
        if (!companyProfile || typeof companyProfile !== 'object' || !companyProfile.name) {
            const companies = await db.getCompanies();
            const currentComp = companies.find(c => c.code === code) || { name: '0.ทดลอง' };
            companyProfile = {
                key: 'company_profile',
                name: currentComp.name,
                address: 'กรุงเทพมหานคร',
                taxId: '0105500000000',
                capitalShares: 100000,
                capitalPar: 10,
                capitalPaid: 1000000
            };
            await db.putItem('settings', companyProfile);
        }
        
        await initAccountingPeriod();
        updateHeaderBadge();
        
        const activeSection = document.querySelector('.view-section.active');
        if (activeSection) {
            const viewName = activeSection.id.replace('view-', '');
            await switchView(viewName);
        }
        
        closeModal('modal-switch-company');
        showToast(`สลับไปยังกิจการ: ${companyProfile.name} เรียบร้อยแล้ว`, 'success');
    } catch (err) {
        console.error('Error switching company:', err);
        showToast('เกิดข้อผิดพลาดในการสลับกิจการ: ' + err.message, 'error');
    }
}

async function exportAllSystemData() {
    const companies = await db.getCompanies();
    const allData = {
        companies: companies,
        companyData: {}
    };
    
    const originalActiveCompany = db.getActiveCompanyCode();
    const tables = [
        'accounts', 'journalEntries', 'invoices', 'bills', 'settings', 
        'customers', 'suppliers', 'expenseCatalog', 'paymentMethods', 
        'arReceipts', 'apPayments', 'pettyCashPayments', 'pettyCashReimbursements'
    ];
    
    for (const comp of companies) {
        localStorage.setItem('active_company_code', comp.code);
        db.closeDB();
        
        const compPayload = {};
        for (const table of tables) {
            try {
                let records = await db.getAll(table);
                compPayload[table] = records;
            } catch (err) {
                console.error(`Error exporting table ${table} for ${comp.code}:`, err);
            }
        }
        allData.companyData[comp.code] = compPayload;
    }
    
    localStorage.setItem('active_company_code', originalActiveCompany);
    db.closeDB();
    
    return allData;
}

async function importAllSystemData(allData) {
    if (!allData || !allData.companies || !allData.companyData) {
        throw new Error('รูปแบบข้อมูลไฟล์สำรองข้อมูลไม่ถูกต้อง');
    }
    
    const systemDb = await db.openSystemDB();
    await new Promise((resolve, reject) => {
        const transaction = systemDb.transaction('companies', 'readwrite');
        const store = transaction.objectStore('companies');
        const request = store.clear();
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
    });
    
    for (const comp of allData.companies) {
        await db.addCompany(comp.code, comp.name);
    }
    
    const originalActiveCompany = db.getActiveCompanyCode();
    
    for (const [code, compPayload] of Object.entries(allData.companyData)) {
        localStorage.setItem('active_company_code', code);
        db.closeDB();
        
        await db.openDB();
        await db.resetDatabase();
        
        for (const [table, items] of Object.entries(compPayload)) {
            if (items && items.length > 0) {
                await db.bulkPut(table, items);
            }
        }
    }
    
    localStorage.setItem('active_company_code', originalActiveCompany);
    db.closeDB();
    await store.initializeStore();
}

// --- CLOUD SYNC UTILITIES & AUTO-SYNC ENGINE ---

export function updateSyncBadge(state, lastTime = null) {
    const badge = document.getElementById('header-sync-status');
    const textSpan = document.getElementById('header-sync-text');
    if (!badge || !textSpan) return;
    
    const icon = badge.querySelector('i');
    
    badge.className = 'sync-badge';
    badge.style.display = 'flex';
    
    let timeStr = '';
    if (lastTime) {
        const d = new Date(parseInt(lastTime));
        timeStr = ` (${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')})`;
    }
    
    if (state === 'disabled') {
        badge.classList.add('disabled');
        if (icon) icon.className = 'fa-solid fa-cloud';
        textSpan.textContent = 'ไม่ได้เปิดการซิงค์';
        badge.title = 'คลิกเพื่อตั้งค่าคลาวด์ซิงค์';
    } else if (state === 'syncing') {
        badge.classList.add('syncing');
        if (icon) icon.className = 'fa-solid fa-spinner fa-spin';
        textSpan.textContent = 'กำลังซิงค์...';
        badge.title = 'กำลังอัปโหลดข้อมูลไปยังคลาวด์';
    } else if (state === 'synced') {
        badge.classList.add('synced');
        const displayTime = timeStr || (localStorage.getItem('cloud_last_sync_time') ? (() => {
            const d = new Date(parseInt(localStorage.getItem('cloud_last_sync_time')));
            return ` (${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')})`;
        })() : '');
        if (icon) icon.className = 'fa-solid fa-circle-check';
        textSpan.textContent = 'ซิงค์แล้ว' + displayTime;
        badge.title = 'ข้อมูลปลอดภัยบนคลาวด์แล้ว คลิกเพื่อตั้งค่า';
    } else if (state === 'error') {
        badge.classList.add('error');
        if (icon) icon.className = 'fa-solid fa-triangle-exclamation';
        textSpan.textContent = 'ซิงค์ล้มเหลว';
        badge.title = 'ไม่สามารถซิงค์ข้อมูลได้ โปรดคลิกเพื่อตรวจเช็ค';
    }
}

export function encryptAndCompressData(data, syncCode) {
    if (!syncCode) {
        throw new Error('ไม่พบรหัสซิงค์ข้อมูลสำหรับเข้ารหัส');
    }
    const jsonStr = JSON.stringify(data);
    if (typeof LZString === 'undefined' || typeof CryptoJS === 'undefined') {
        throw new Error('ระบบยังไม่พร้อมเชื่อมต่อคลาวด์ โปรดเชื่อมต่ออินเทอร์เน็ตเพื่อโหลดเครื่องมือความปลอดภัย');
    }
    const compressed = LZString.compressToBase64(jsonStr);
    const encrypted = CryptoJS.AES.encrypt(compressed, syncCode).toString();
    return {
        encrypted: true,
        data: encrypted,
        timestamp: Date.now()
    };
}

export function decryptAndDecompressData(payload, syncCode) {
    if (!syncCode) {
        throw new Error('ไม่พบรหัสซิงค์สำหรับถอดรหัส');
    }
    if (typeof LZString === 'undefined' || typeof CryptoJS === 'undefined') {
        throw new Error('ระบบยังไม่พร้อมเชื่อมต่อคลาวด์ โปรดเชื่อมต่ออินเทอร์เน็ตเพื่อโหลดเครื่องมือความปลอดภัย');
    }
    
    if (payload && payload.encrypted && payload.data) {
        try {
            const decryptedBytes = CryptoJS.AES.decrypt(payload.data, syncCode);
            const decryptedStr = decryptedBytes.toString(CryptoJS.enc.Utf8);
            if (!decryptedStr) {
                throw new Error('รหัสซิงค์ไม่ถูกต้องหรือข้อมูลเสียหาย');
            }
            const decompressed = LZString.decompressFromBase64(decryptedStr);
            if (!decompressed) {
                throw new Error('ถอดรหัสล้มเหลว ข้อมูลอาจไม่ตรงรูปแบบ');
            }
            return JSON.parse(decompressed);
        } catch (err) {
            throw new Error('รหัสซิงค์ข้อมูลไม่ถูกต้อง หรือข้อมูลบนคลาวด์ไม่สามารถอ่านได้: ' + err.message);
        }
    } else {
        return payload;
    }
}

export async function performAutoPull(syncCode) {
    updateSyncBadge('syncing');
    try {
        const response = await fetch('https://corsproxy.io/?url=' + encodeURIComponent(`https://jsonblob.com/api/jsonBlob/${syncCode}`));
        if (!response.ok) {
            throw new Error('ไม่สามารถเข้าถึงฐานข้อมูลคลาวด์');
        }
        const cloudPayload = await response.json();
        const cloudTime = cloudPayload.timestamp || 0;
        
        const localTimeStr = localStorage.getItem('cloud_last_sync_time') || '0';
        const localTime = parseInt(localTimeStr);
        
        if (cloudTime > localTime) {
            console.log(`Cloud data is newer (${cloudTime} > ${localTime}). Importing...`);
            const allData = decryptAndDecompressData(cloudPayload, syncCode);
            
            db.setSuppressDbChangedEvent(true);
            try {
                await importAllSystemData(allData);
            } finally {
                db.setSuppressDbChangedEvent(false);
            }
            
            localStorage.setItem('cloud_last_sync_time', cloudTime.toString());
            updateSyncBadge('synced', cloudTime);
            showToast('ซิงค์ข้อมูลล่าสุดจากคลาวด์เรียบร้อยแล้ว', 'success');
            
            companyProfile = await db.getByKey('settings', 'company_profile');
            updateHeaderBadge();
            const activeSection = document.querySelector('.view-section.active');
            if (activeSection) {
                const viewName = activeSection.id.replace('view-', '');
                await switchView(viewName);
            }
        } else if (localTime > cloudTime) {
            console.log(`Local data is newer (${localTime} > ${cloudTime}). Pushing to cloud...`);
            await performAutoPush(syncCode);
        } else {
            console.log('Local and cloud databases are in sync.');
            updateSyncBadge('synced', localTime);
        }
    } catch (err) {
        console.error('Auto pull failed:', err);
        updateSyncBadge('error');
    }
}

export async function performAutoPush(syncCode) {
    if (!syncCode) return;
    updateSyncBadge('syncing');
    try {
        const allData = await exportAllSystemData();
        const encryptedPayload = encryptAndCompressData(allData, syncCode);
        
        const response = await fetch('https://corsproxy.io/?url=' + encodeURIComponent(`https://jsonblob.com/api/jsonBlob/${syncCode}`), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(encryptedPayload)
        });
        if (!response.ok) {
            throw new Error('Network error');
        }
        localStorage.setItem('cloud_last_sync_time', encryptedPayload.timestamp.toString());
        updateSyncBadge('synced', encryptedPayload.timestamp);
    } catch (err) {
        console.error('Auto push failed:', err);
        updateSyncBadge('error');
    }
}

let autoPushTimeout = null;
export function triggerAutoCloudPush() {
    const isAutoSync = localStorage.getItem('cloud_sync_enabled') === 'true';
    const syncCode = localStorage.getItem('cloud_sync_code') || '';
    if (!isAutoSync || !syncCode) {
        updateSyncBadge('disabled');
        return;
    }
    
    updateSyncBadge('syncing');
    if (autoPushTimeout) {
        clearTimeout(autoPushTimeout);
    }
    
    autoPushTimeout = setTimeout(async () => {
        await performAutoPush(syncCode);
    }, 2500);
}

// Warning Banner helper
export function showLocalWarningBannerIfNeeded() {
    return;
}

// Initialize Auto Sync Configuration and listeners
export function initAutoSync() {
    const syncCheckbox = document.getElementById('sync-auto-checkbox');
    const syncInput = document.getElementById('sync-code-input');
    
    if (syncCheckbox) {
        const isEnabled = localStorage.getItem('cloud_sync_enabled') === 'true';
        syncCheckbox.checked = isEnabled;
        
        const savedCode = localStorage.getItem('cloud_sync_code') || '';
        if (savedCode && syncInput) {
            syncInput.value = savedCode;
        }
        
        updateSyncBadge(isEnabled ? 'synced' : 'disabled');
        
        syncCheckbox.addEventListener('change', async (e) => {
            const checked = e.target.checked;
            localStorage.setItem('cloud_sync_enabled', checked ? 'true' : 'false');
            
            if (checked) {
                let code = syncInput ? syncInput.value.trim() : '';
                if (!code) {
                    // Generate new cloud sync space automatically
                    updateSyncBadge('syncing');
                    try {
                        const proxyPostUrl = 'https://corsproxy.io/?url=' + encodeURIComponent('https://jsonblob.com/api/jsonBlob') + '&resHeaders=access-control-expose-headers:location';
                        const preRes = await fetch(proxyPostUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ placeholder: true })
                        });
                        if (!preRes.ok) throw new Error('Network error');
                        const locationHeader = preRes.headers.get('Location');
                        if (!locationHeader) throw new Error('Location header missing');
                        code = locationHeader.split('/').pop();
                        if (syncInput) syncInput.value = code;
                    } catch (err) {
                        alert('ไม่สามารถเปิดซิงค์อัตโนมัติได้เนื่องจากปัญหาการเชื่อมต่อ: ' + err.message);
                        syncCheckbox.checked = false;
                        localStorage.setItem('cloud_sync_enabled', 'false');
                        updateSyncBadge('disabled');
                        return;
                    }
                }
                
                localStorage.setItem('cloud_sync_code', code);
                if (syncInput) syncInput.value = code;
                
                // Immediately push current local DB to cloud as initial backup
                await performAutoPush(code);
                showLocalWarningBannerIfNeeded();
                showToast('เปิดใช้งานระบบซิงค์คลาวด์อัตโนมัติเรียบร้อยแล้ว', 'success');
            } else {
                updateSyncBadge('disabled');
                showLocalWarningBannerIfNeeded();
                showToast('ปิดระบบซิงค์อัตโนมัติแล้ว (ข้อมูลยังคงบันทึกในคอมพิวเตอร์เครื่องนี้)', 'info');
            }
        });
    }
    
    // Warning banner buttons
    const btnEnableSync = document.getElementById('btn-banner-enable-sync');
    if (btnEnableSync) {
        btnEnableSync.addEventListener('click', () => {
            if (syncCheckbox) {
                syncCheckbox.checked = true;
                syncCheckbox.dispatchEvent(new Event('change'));
            }
            switchView('settings');
            const syncCard = document.getElementById('sync-code-input')?.closest('div');
            if (syncCard) {
                syncCard.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }
    
    const btnDismissBanner = document.getElementById('btn-banner-dismiss');
    if (btnDismissBanner) {
        btnDismissBanner.addEventListener('click', () => {
            localStorage.setItem('dismiss_sync_warning', 'true');
            showLocalWarningBannerIfNeeded();
        });
    }
    
    const headerSyncStatus = document.getElementById('header-sync-status');
    if (headerSyncStatus) {
        headerSyncStatus.addEventListener('click', () => {
            switchView('settings');
            const syncCard = document.getElementById('sync-code-input')?.closest('div');
            if (syncCard) {
                syncCard.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    // Listen to db-changed events dispatched from db.js
    window.addEventListener('db-changed', (e) => {
        console.log('Database change detected in store:', e.detail.storeName);
        triggerAutoCloudPush();
    });
    
    // Initial warning banner display check
    showLocalWarningBannerIfNeeded();
    
    // Initial auto-pull check
    const isAutoSync = localStorage.getItem('cloud_sync_enabled') === 'true';
    const syncCode = localStorage.getItem('cloud_sync_code') || '';
    if (isAutoSync && syncCode) {
        performAutoPull(syncCode);
    }
}

// =========================================================================
// INVENTORY SYSTEM CONTROLLERS (ระบบสินค้า)
// =========================================================================

// Global Inventory Variables
let selectedProductIdForPrice = null;
let selectedSetProductId = null;
let selectedCountSheetId = null;

// Helper to log stock transactions from Invoice/Bill
async function logStockTransactionsFromDocument(docType, docId, date, partyName, items) {
    try {
        await db.deleteItem('inventoryTransactions', docId);
    } catch (e) {
        console.log("No existing stock transactions for", docId);
    }

    const products = await db.getAll('products');
    
    for (const item of items) {
        const descText = item.description ? item.description.trim().toLowerCase() : '';
        if (!descText) continue;
        
        const product = products.find(p => 
            p.code.toLowerCase() === descText || 
            p.name.toLowerCase() === descText ||
            descText.includes(p.code.toLowerCase()) || 
            descText.includes(p.name.toLowerCase())
        );
        
        if (!product) continue;
        
        if (product.type === 'product') {
            const txType = docType === 'invoice' ? 'out' : 'in';
            let unitCost = docType === 'bill' ? item.unitPrice : product.standard_cost;
            
            if (docType === 'bill') {
                try {
                    const bill = await db.getByKey('bills', docId);
                    const companyProfile = await db.getByKey('settings', 'company_profile');
                    const isVatRegistered = !companyProfile || companyProfile.vatRegistered !== 'no';
                    if (bill && bill.vatRate > 0 && !isVatRegistered) {
                        unitCost = Math.round(item.unitPrice * (1 + (bill.vatRate || 0) / 100) * 100) / 100;
                    }
                } catch (e) {
                    console.error("Error loading bill or settings in logStockTransactionsFromDocument:", e);
                }
            }

            const tx = {
                product_id: product.id,
                date: date,
                doc_ref: docId,
                transaction_type: txType,
                quantity: item.quantity,
                unit_cost: unitCost,
                description: docType === 'invoice' ? `ขายให้ลูกค้า: ${partyName}` : `ซื้อจากคู่ค้า: ${partyName}`
            };
            await db.putItem('inventoryTransactions', tx);
        } else if (product.type === 'set') {
            const res = await fetch(`/api/product-sets/${product.id}`);
            if (res.ok) {
                const components = await res.json();
                for (const comp of components) {
                    const txType = docType === 'invoice' ? 'out' : 'in';
                    const tx = {
                        product_id: comp.member_product_id,
                        date: date,
                        doc_ref: docId,
                        transaction_type: txType,
                        quantity: item.quantity * comp.quantity,
                        unit_cost: comp.standard_cost || 0,
                        description: docType === 'invoice' ? 
                            `ขายสินค้าชุด: ${product.name} (ส่วนประกอบ: ${comp.name})` : 
                            `ซื้อสินค้าชุด: ${product.name} (ส่วนประกอบ: ${comp.name})`
                    };
                    await db.putItem('inventoryTransactions', tx);
                }
            }
        }
    }
}

// Bind Inventory UI Events
function bindInventoryUIActions() {
    // Product Add Button
    const btnProductAdd = document.getElementById('btn-inv-product-add');
    if (btnProductAdd) {
        btnProductAdd.addEventListener('click', () => {
            document.getElementById('add-inv-product-form').reset();
            document.getElementById('inv-product-form-id').value = '';
            document.getElementById('inv-product-form-type').value = 'product';
            document.getElementById('inv-product-modal-title').innerHTML = '<i class="fa-solid fa-box"></i> เพิ่มสินค้าใหม่';
            openModal('modal-add-inv-product');
        });
    }

    // Service Add Button
    const btnServiceAdd = document.getElementById('btn-inv-service-add');
    if (btnServiceAdd) {
        btnServiceAdd.addEventListener('click', () => {
            document.getElementById('add-inv-product-form').reset();
            document.getElementById('inv-product-form-id').value = '';
            document.getElementById('inv-product-form-type').value = 'service';
            document.getElementById('inv-product-modal-title').innerHTML = '<i class="fa-solid fa-bell-concierge"></i> เพิ่มบริการใหม่';
            openModal('modal-add-inv-product');
        });
    }

    // Product/Service Form Submit
    const productForm = document.getElementById('add-inv-product-form');
    if (productForm) {
        productForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('inv-product-form-id').value;
            const type = document.getElementById('inv-product-form-type').value;
            const code = document.getElementById('inv-product-code').value.trim();
            const name = document.getElementById('inv-product-name').value.trim();
            const category = document.getElementById('inv-product-category').value.trim();
            const unit = document.getElementById('inv-product-unit').value.trim();
            const standard_cost = parseFloat(document.getElementById('inv-product-cost').value) || 0;
            const standard_price = parseFloat(document.getElementById('inv-product-price').value) || 0;
            const description = document.getElementById('inv-product-desc-input').value.trim();
            const status = document.getElementById('inv-product-status').value;

            const productData = {
                id: id ? parseInt(id) : undefined,
                code,
                name,
                type,
                category,
                unit,
                standard_cost,
                standard_price,
                description,
                status
            };

            try {
                await db.putItem('products', productData);
                closeModal('modal-add-inv-product');
                showToast('บันทึกรายละเอียดเรียบร้อยแล้ว', 'success');
                if (type === 'product') {
                    await renderInventoryProducts();
                } else {
                    await renderInventoryServices();
                }
            } catch (err) {
                console.error(err);
                alert('เกิดข้อผิดพลาด: ' + err.message);
            }
        });
    }

    // Product Set Add Button
    const btnSetAdd = document.getElementById('btn-inv-set-add');
    if (btnSetAdd) {
        btnSetAdd.addEventListener('click', () => {
            document.getElementById('add-inv-set-form').reset();
            document.getElementById('inv-set-form-id').value = '';
            document.getElementById('inv-set-items-tbody').innerHTML = '';
            document.getElementById('inv-set-modal-title').innerHTML = '<i class="fa-solid fa-cubes"></i> ตั้งค่าสินค้าชุด (BOM Setup)';
            openModal('modal-add-inv-set');
            recalculateSetCost();
        });
    }

    // Set Components Row Add
    const btnSetAddRow = document.getElementById('btn-inv-set-add-row');
    if (btnSetAddRow) {
        btnSetAddRow.addEventListener('click', () => {
            addSetComponentRow();
        });
    }

    // Product Set Form Submit
    const setForm = document.getElementById('add-inv-set-form');
    if (setForm) {
        setForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('inv-set-form-id').value;
            const code = document.getElementById('inv-set-code').value.trim();
            const name = document.getElementById('inv-set-name').value.trim();
            const unit = document.getElementById('inv-set-unit').value.trim();
            const price = parseFloat(document.getElementById('inv-set-price').value) || 0;
            const description = document.getElementById('inv-set-desc').value.trim();

            const rows = document.querySelectorAll('#inv-set-items-tbody tr');
            const items = [];
            rows.forEach(row => {
                const member_product_id = parseInt(row.querySelector('.set-item-product').value);
                const quantity = parseFloat(row.querySelector('.set-item-qty').value) || 0;
                if (member_product_id && quantity > 0) {
                    items.push({ member_product_id, quantity });
                }
            });

            if (items.length === 0) {
                alert('กรุณาระบุส่วนประกอบของสินค้าชุดอย่างน้อย 1 รายการ');
                return;
            }

            const productData = {
                id: id ? parseInt(id) : undefined,
                code,
                name,
                type: 'set',
                unit,
                standard_price: price,
                description,
                status: 'active'
            };

            try {
                // 1. Put set product details
                const setProductId = await db.putItem('products', productData);
                // 2. Put BOM components
                const res = await fetch(`/api/product-sets/${setProductId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items })
                });
                if (!res.ok) throw new Error('Failed to save set components BOM');
                
                closeModal('modal-add-inv-set');
                showToast('บันทึกสินค้าชุดเรียบร้อยแล้ว', 'success');
                await renderInventorySets();
            } catch (err) {
                console.error(err);
                alert('เกิดข้อผิดพลาด: ' + err.message);
            }
        });
    }

    // Price List Add Button
    const btnPriceAdd = document.getElementById('btn-inv-price-add');
    if (btnPriceAdd) {
        btnPriceAdd.addEventListener('click', async () => {
            document.getElementById('add-inv-price-form').reset();
            const selectEl = document.getElementById('inv-price-product-id');
            selectEl.innerHTML = '';
            
            const products = await db.getAll('products');
            products.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = `[${p.code}] ${p.name} (${p.type === 'service' ? 'บริการ' : p.type === 'set' ? 'ชุด' : 'สินค้า'})`;
                selectEl.appendChild(opt);
            });
            openModal('modal-add-inv-price');
        });
    }

    // Price List Form Submit
    const priceForm = document.getElementById('add-inv-price-form');
    if (priceForm) {
        priceForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const product_id = parseInt(document.getElementById('inv-price-product-id').value);
            const tier_name = document.getElementById('inv-price-tier').value;
            const price = parseFloat(document.getElementById('inv-price-value').value) || 0;

            const priceData = { product_id, tier_name, price };
            try {
                await db.putItem('priceLists', priceData);
                closeModal('modal-add-inv-price');
                showToast('บันทึกตารางราคาขายเรียบร้อยแล้ว', 'success');
                await renderInventoryPrices();
            } catch (err) {
                console.error(err);
                alert('เกิดข้อผิดพลาด: ' + err.message);
            }
        });
    }

    // Stock Adjustment Button
    const btnTxAdjust = document.getElementById('btn-inv-tx-adjust');
    if (btnTxAdjust) {
        btnTxAdjust.addEventListener('click', async () => {
            document.getElementById('inv-adjust-form').reset();
            document.getElementById('inv-adjust-date').value = new Date().toISOString().split('T')[0];
            document.getElementById('inv-adjust-ref').value = 'ADJ-' + Date.now().toString().slice(-6);

            const selectEl = document.getElementById('inv-adjust-product-id');
            selectEl.innerHTML = '';
            const products = await db.getAll('products');
            products.filter(p => p.type === 'product').forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = `[${p.code}] ${p.name}`;
                selectEl.appendChild(opt);
            });
            openModal('modal-inv-adjust');
        });
    }

    // Stock Adjustment Form Submit
    const adjustForm = document.getElementById('inv-adjust-form');
    if (adjustForm) {
        adjustForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const product_id = parseInt(document.getElementById('inv-adjust-product-id').value);
            const date = document.getElementById('inv-adjust-date').value;
            const doc_ref = document.getElementById('inv-adjust-ref').value.trim();
            const transaction_type = document.getElementById('inv-adjust-type').value;
            const quantity = parseFloat(document.getElementById('inv-adjust-qty').value) || 0;
            const unit_cost = parseFloat(document.getElementById('inv-adjust-cost').value) || 0;
            const description = document.getElementById('inv-adjust-desc').value.trim();

            const txData = {
                product_id,
                date,
                doc_ref,
                transaction_type,
                quantity,
                unit_cost,
                description
            };

            try {
                await db.putItem('inventoryTransactions', txData);
                closeModal('modal-inv-adjust');
                showToast('ปรับยอดสต็อกเรียบร้อยแล้ว', 'success');
                await renderInventoryTransactions();
            } catch (err) {
                console.error(err);
                alert('เกิดข้อผิดพลาด: ' + err.message);
            }
        });
    }

    // Transactions Filter
    const btnTxFilter = document.getElementById('btn-inv-tx-filter');
    if (btnTxFilter) {
        btnTxFilter.addEventListener('click', async () => {
            await renderInventoryTransactions();
        });
    }

    // Product Search Input
    const prodSearch = document.getElementById('inv-product-search');
    if (prodSearch) {
        prodSearch.addEventListener('input', async () => {
            await renderInventoryProducts();
        });
    }

    // Set Search Input
    const setSearch = document.getElementById('inv-set-search');
    if (setSearch) {
        setSearch.addEventListener('input', async () => {
            await renderInventorySets();
        });
    }

    // Service Search Input
    const servSearch = document.getElementById('inv-service-search');
    if (servSearch) {
        servSearch.addEventListener('input', async () => {
            await renderInventoryServices();
        });
    }

    // Price Search Input
    const priceSearch = document.getElementById('inv-price-search');
    if (priceSearch) {
        priceSearch.addEventListener('input', async () => {
            await renderInventoryPrices();
        });
    }

    // Costing Repair Button
    const btnRepairStart = document.getElementById('btn-inv-repair-start');
    if (btnRepairStart) {
        btnRepairStart.addEventListener('click', async () => {
            await runInventoryCostingRepair();
        });
    }

    // Reorders Save All Button
    const btnReordersSave = document.getElementById('btn-inv-reorders-save-all');
    if (btnReordersSave) {
        btnReordersSave.addEventListener('click', async () => {
            await saveReorderPoints();
        });
    }

    // Count Create Button
    const btnCountCreate = document.getElementById('btn-inv-count-create');
    if (btnCountCreate) {
        btnCountCreate.addEventListener('click', async () => {
            selectedCountSheetId = null;
            document.getElementById('inv-count-form').reset();
            document.getElementById('inv-count-id').value = '';
            document.getElementById('inv-count-date').value = new Date().toISOString().split('T')[0];
            document.getElementById('inv-count-ref').value = 'SC-' + Date.now().toString().slice(-6);
            document.getElementById('btn-inv-count-post').style.display = 'inline-flex';
            document.getElementById('btn-inv-count-draft').style.display = 'inline-flex';
            document.getElementById('inv-count-sheet-title').innerHTML = '<i class="fa-solid fa-file-invoice"></i> สร้างใบตรวจนับสต็อกใหม่';
            
            // Populate grid with current active products
            await populateCountItemsGrid();
            
            document.getElementById('inv-counts-list-wrapper').style.display = 'none';
            document.getElementById('inv-count-form-wrapper').style.display = 'block';
        });
    }

    // Count Form Back Button
    const btnCountBack = document.getElementById('btn-inv-count-back');
    if (btnCountBack) {
        btnCountBack.addEventListener('click', () => {
            document.getElementById('inv-counts-list-wrapper').style.display = 'block';
            document.getElementById('inv-count-form-wrapper').style.display = 'none';
        });
    }

    // Count Form Submission (Post)
    const countForm = document.getElementById('inv-count-form');
    if (countForm) {
        countForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveCountSheet('posted');
        });
    }

    // Count Form Draft Button
    const btnCountDraft = document.getElementById('btn-inv-count-draft');
    if (btnCountDraft) {
        btnCountDraft.addEventListener('click', async () => {
            await saveCountSheet('draft');
        });
    }
}

// Recalculate component set cost standard
async function recalculateSetCost() {
    let total = 0;
    const rows = document.querySelectorAll('#inv-set-items-tbody tr');
    rows.forEach(row => {
        const cost = parseFloat(row.querySelector('.set-item-cost').textContent) || 0;
        const qty = parseFloat(row.querySelector('.set-item-qty').value) || 0;
        total += cost * qty;
    });
    document.getElementById('inv-set-total-cost').textContent = formatMoney(total) + ' บาท';
}

// Add set component row
async function addSetComponentRow(selectedId = '', qty = 1) {
    const tbody = document.getElementById('inv-set-items-tbody');
    const products = await db.getAll('products');
    const standardProducts = products.filter(p => p.type === 'product');

    if (standardProducts.length === 0) {
        alert('กรุณาไปสร้างสินค้าธรรมดา (Product) อย่างน้อย 1 รายการก่อนตั้งค่าสินค้าชุด');
        return;
    }

    const tr = document.createElement('tr');
    
    let selectOptions = '';
    standardProducts.forEach(p => {
        const isSelected = selectedId == p.id ? 'selected' : '';
        selectOptions += `<option value="${p.id}" data-cost="${p.standard_cost}" data-unit="${p.unit}" ${isSelected}>[${p.code}] ${p.name}</option>`;
    });

    const firstProduct = standardProducts.find(p => p.id == selectedId) || standardProducts[0];
    const initialCost = firstProduct.standard_cost || 0;
    const initialUnit = firstProduct.unit || 'ชิ้น';

    tr.innerHTML = `
        <td>
            <select class="form-control set-item-product">
                ${selectOptions}
            </select>
        </td>
        <td class="set-item-unit">${initialUnit}</td>
        <td class="num-col set-item-cost">${initialCost.toFixed(2)}</td>
        <td>
            <input type="number" class="form-control num-col set-item-qty" value="${qty}" min="0.01" step="0.01" required>
        </td>
        <td>
            <button type="button" class="btn btn-danger btn-sm remove-set-row-btn" style="padding: 4px 8px;"><i class="fa-solid fa-trash-alt"></i></button>
        </td>
    `;

    // Dropdown change handler
    const selectEl = tr.querySelector('.set-item-product');
    selectEl.addEventListener('change', () => {
        const opt = selectEl.selectedOptions[0];
        const cost = parseFloat(opt.getAttribute('data-cost')) || 0;
        const unit = opt.getAttribute('data-unit') || 'ชิ้น';
        tr.querySelector('.set-item-cost').textContent = cost.toFixed(2);
        tr.querySelector('.set-item-unit').textContent = unit;
        recalculateSetCost();
    });

    // Qty change handler
    tr.querySelector('.set-item-qty').addEventListener('input', () => {
        recalculateSetCost();
    });

    // Remove row
    tr.querySelector('.remove-set-row-btn').addEventListener('click', () => {
        tr.remove();
        recalculateSetCost();
    });

    tbody.appendChild(tr);
    recalculateSetCost();
}

// Populate count grid with active products and system balances
async function populateCountItemsGrid(sheetItems = null) {
    const tbody = document.getElementById('inv-count-items-tbody');
    tbody.innerHTML = '';

    const products = await db.getAll('products');
    const standardProducts = products.filter(p => p.type === 'product' && p.status === 'active');

    if (standardProducts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">ไม่พบสินค้าที่เปิดใช้งานในระบบ</td></tr>`;
        return;
    }

    // Compute current running balances
    const balances = await getStockBalancesMap();

    for (const p of standardProducts) {
        const tr = document.createElement('tr');
        const systemQty = balances[p.id] || 0;
        
        // Find if this product exists in loaded count sheet
        const countedRecord = sheetItems ? sheetItems.find(item => item.product_id == p.id) : null;
        const countedQtyVal = countedRecord ? countedRecord.counted_qty : systemQty;
        const diffQtyVal = countedRecord ? countedRecord.diff_qty : 0;

        tr.innerHTML = `
            <td><strong>${p.code}</strong></td>
            <td>${p.name}</td>
            <td>${p.unit}</td>
            <td class="num-col system-qty-val" data-cost="${p.standard_cost}">${systemQty.toFixed(2)}</td>
            <td>
                <input type="number" class="form-control num-col counted-qty-val" value="${countedQtyVal.toFixed(2)}" step="0.01" style="max-width: 140px; margin-left: auto;">
            </td>
            <td class="num-col diff-qty-val" style="font-weight: 700; color: ${diffQtyVal < 0 ? 'var(--danger-red)' : diffQtyVal > 0 ? 'var(--success-green)' : 'var(--text-secondary)'};">
                ${diffQtyVal > 0 ? '+' : ''}${diffQtyVal.toFixed(2)}
            </td>
        `;

        const countedInput = tr.querySelector('.counted-qty-val');
        countedInput.addEventListener('input', () => {
            const counted = parseFloat(countedInput.value) || 0;
            const diff = counted - systemQty;
            const diffCol = tr.querySelector('.diff-qty-val');
            diffCol.textContent = (diff > 0 ? '+' : '') + diff.toFixed(2);
            diffCol.style.color = diff < 0 ? 'var(--danger-red)' : diff > 0 ? 'var(--success-green)' : 'var(--text-secondary)';
        });

        tr.setAttribute('data-product-id', p.id);
        tbody.appendChild(tr);
    }
}

// Helper: Calculate stock balances map
async function getStockBalancesMap() {
    const txs = await db.getAll('inventoryTransactions');
    const balances = {};
    txs.forEach(tx => {
        if (!balances[tx.product_id]) balances[tx.product_id] = 0;
        if (tx.transaction_type === 'in' || tx.transaction_type === 'adjust_in') {
            balances[tx.product_id] += parseFloat(tx.quantity);
        } else if (tx.transaction_type === 'out' || tx.transaction_type === 'adjust_out') {
            balances[tx.product_id] -= parseFloat(tx.quantity);
        }
    });
    return balances;
}

// Save Count sheet and create stock adjustments
async function saveCountSheet(status) {
    const id = document.getElementById('inv-count-id').value;
    const date = document.getElementById('inv-count-date').value;
    const ref_no = document.getElementById('inv-count-ref').value.trim();
    const description = document.getElementById('inv-count-desc').value.trim();

    const rows = document.querySelectorAll('#inv-count-items-tbody tr');
    const items = [];
    rows.forEach(row => {
        const product_id = parseInt(row.getAttribute('data-product-id'));
        const system_qty = parseFloat(row.querySelector('.system-qty-val').textContent) || 0;
        const unit_cost = parseFloat(row.querySelector('.system-qty-val').getAttribute('data-cost')) || 0;
        const counted_qty = parseFloat(row.querySelector('.counted-qty-val').value) || 0;
        const diff_qty = counted_qty - system_qty;

        items.push({
            product_id,
            system_qty,
            counted_qty,
            diff_qty,
            unit_cost
        });
    });

    if (items.length === 0) {
        alert('ไม่พบรายการสินค้าที่ใช้ในการตรวจนับ');
        return;
    }

    const countData = {
        id: id ? parseInt(id) : undefined,
        date,
        ref_no,
        status,
        description,
        items
    };

    try {
        const savedId = await db.putItem('inventoryCounts', countData);
        
        // If status is posted, execute stock adjustments
        if (status === 'posted') {
            // Delete old count adjustments first
            try {
                await db.deleteItem('inventoryTransactions', ref_no);
            } catch (e) {}

            // Loop and add adjustment transactions
            for (const item of items) {
                if (item.diff_qty === 0) continue;
                
                const txType = item.diff_qty > 0 ? 'adjust_in' : 'adjust_out';
                const quantity = Math.abs(item.diff_qty);
                const tx = {
                    product_id: item.product_id,
                    date: date,
                    doc_ref: ref_no,
                    transaction_type: txType,
                    quantity: quantity,
                    unit_cost: item.unit_cost,
                    description: `ปรับปรุงสต็อกส่วนต่างจากการตรวจนับสต็อก: ${ref_no}`
                };
                await db.putItem('inventoryTransactions', tx);
            }
        }

        showToast(status === 'posted' ? 'ผ่านรายการและปรับปรุงยอดสต็อกแล้ว' : 'บันทึกแบบร่างสำเร็จ', 'success');
        document.getElementById('inv-counts-list-wrapper').style.display = 'block';
        document.getElementById('inv-count-form-wrapper').style.display = 'none';
        await renderInventoryCounts();
    } catch (err) {
        console.error(err);
        alert('เกิดข้อผิดพลาดในการบันทึก: ' + err.message);
    }
}

// 1. RENDER DAILY MOVEMENTS
async function renderInventoryTransactions() {
    const tbody = document.querySelector('#inv-transactions-table tbody');
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center;"><div class="spinner"></div></td></tr>`;

    try {
        const txs = await db.getAll('inventoryTransactions');
        const products = await db.getAll('products');
        
        // Populate select product filter
        const filterSelect = document.getElementById('inv-tx-product-select');
        if (filterSelect.options.length <= 1) {
            products.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = `[${p.code}] ${p.name}`;
                filterSelect.appendChild(opt);
            });
        }

        const selectedProductId = document.getElementById('inv-tx-product-select').value;
        const selectedType = document.getElementById('inv-tx-type-select').value;

        // Filter transactions
        let filtered = txs;
        if (selectedProductId) {
            filtered = filtered.filter(tx => tx.product_id == selectedProductId);
        }
        if (selectedType) {
            filtered = filtered.filter(tx => tx.transaction_type == selectedType);
        }

        tbody.innerHTML = '';
        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted);">ไม่พบความเคลื่อนไหวสินค้าคลัง</td></tr>`;
            return;
        }

        // Sort descending
        filtered.sort((a,b) => b.date.localeCompare(a.date) || b.id - a.id).forEach(tx => {
            const tr = document.createElement('tr');
            const typeLabels = {
                'in': '<span class="status-badge paid"><i class="fa-solid fa-arrow-down"></i> ซื้อเข้า</span>',
                'out': '<span class="status-badge unpaid"><i class="fa-solid fa-arrow-up"></i> ขายออก</span>',
                'adjust_in': '<span class="status-badge sent"><i class="fa-solid fa-circle-plus"></i> ปรับเพิ่ม</span>',
                'adjust_out': '<span class="status-badge draft"><i class="fa-solid fa-circle-minus"></i> ปรับลด</span>'
            };

            const totalVal = tx.total_cost || (tx.quantity * tx.unit_cost);

            tr.innerHTML = `
                <td>${formatDateToDDMMYYYY(tx.date)}</td>
                <td><strong>${tx.doc_ref}</strong></td>
                <td>${tx.product_code || ''}</td>
                <td>
                    ${tx.product_name || ''}
                    ${tx.description ? `<br><small style="color:var(--text-muted); font-style:italic;">${tx.description}</small>` : ''}
                </td>
                <td style="text-align: center;">${typeLabels[tx.transaction_type] || tx.transaction_type}</td>
                <td class="num-col">${tx.quantity}</td>
                <td>${tx.product_unit || ''}</td>
                <td class="num-col">${formatMoney(tx.unit_cost)} ฿</td>
                <td class="num-col" style="font-weight:600;">${formatMoney(totalVal)} ฿</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--danger-red);">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>`;
    }
}

// 2. RENDER PRODUCTS
async function renderInventoryProducts() {
    const tbody = document.querySelector('#inv-products-table tbody');
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center;"><div class="spinner"></div></td></tr>`;

    try {
        const products = await db.getAll('products');
        const query = document.getElementById('inv-product-search').value.trim().toLowerCase();

        let filtered = products.filter(p => p.type === 'product');
        if (query) {
            filtered = filtered.filter(p => p.code.toLowerCase().includes(query) || p.name.toLowerCase().includes(query));
        }

        tbody.innerHTML = '';
        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">ไม่พบสินค้าสำเร็จรูป</td></tr>`;
            return;
        }

        filtered.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${p.code}</strong></td>
                <td>
                    ${p.name}
                    ${p.description ? `<br><small style="color:var(--text-muted);">${p.description}</small>` : ''}
                </td>
                <td>${p.category || '-'}</td>
                <td>${p.unit}</td>
                <td class="num-col">${formatMoney(p.standard_cost)} ฿</td>
                <td class="num-col">${formatMoney(p.standard_price)} ฿</td>
                <td style="text-align: center;">
                    <span class="status-badge ${p.status === 'active' ? 'paid' : 'draft'}">
                        ${p.status === 'active' ? 'ใช้งาน' : 'ระงับ'}
                    </span>
                </td>
                <td style="text-align: center;">
                    <button class="btn btn-secondary btn-sm edit-product-btn" data-id="${p.id}"><i class="fa-solid fa-edit"></i></button>
                    <button class="btn btn-danger btn-sm delete-product-btn" data-id="${p.id}"><i class="fa-solid fa-trash-alt"></i></button>
                </td>
            `;

            // Edit handler
            tr.querySelector('.edit-product-btn').addEventListener('click', () => {
                document.getElementById('inv-product-form-id').value = p.id;
                document.getElementById('inv-product-form-type').value = p.type;
                document.getElementById('inv-product-code').value = p.code;
                document.getElementById('inv-product-name').value = p.name;
                document.getElementById('inv-product-category').value = p.category || '';
                document.getElementById('inv-product-unit').value = p.unit;
                document.getElementById('inv-product-cost').value = p.standard_cost;
                document.getElementById('inv-product-price').value = p.standard_price;
                document.getElementById('inv-product-desc-input').value = p.description || '';
                document.getElementById('inv-product-status').value = p.status;
                document.getElementById('inv-product-modal-title').innerHTML = '<i class="fa-solid fa-box"></i> แก้ไขสินค้า';
                openModal('modal-add-inv-product');
            });

            // Delete handler
            tr.querySelector('.delete-product-btn').addEventListener('click', async () => {
                if (confirm(`คุณต้องการลบสินค้า ${p.code} : ${p.name}? ข้อมูลสต็อกสินค้าทั้งหมดจะได้รับผลกระทบ`)) {
                    try {
                        await db.deleteItem('products', p.id);
                        showToast('ลบสินค้าเรียบร้อยแล้ว', 'success');
                        await renderInventoryProducts();
                    } catch (err) {
                        alert('ไม่สามารถลบสินค้าได้: ' + err.message);
                    }
                }
            });

            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--danger-red);">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>`;
    }
}

// 3. RENDER PRODUCT SETS (BOM)
async function renderInventorySets() {
    const tbody = document.querySelector('#inv-sets-table tbody');
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center;"><div class="spinner"></div></td></tr>`;

    try {
        const products = await db.getAll('products');
        const query = document.getElementById('inv-set-search').value.trim().toLowerCase();

        let filtered = products.filter(p => p.type === 'set');
        if (query) {
            filtered = filtered.filter(p => p.code.toLowerCase().includes(query) || p.name.toLowerCase().includes(query));
        }

        tbody.innerHTML = '';
        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">ไม่พบสินค้าจัดชุด (BOM)</td></tr>`;
            return;
        }

        for (const p of filtered) {
            const tr = document.createElement('tr');
            
            // Fetch components count and total cost
            const res = await fetch(`/api/product-sets/${p.id}`);
            let components = [];
            let totalCost = 0;
            if (res.ok) {
                components = await res.json();
                components.forEach(c => {
                    totalCost += (c.standard_cost || 0) * c.quantity;
                });
            }

            tr.innerHTML = `
                <td><strong>${p.code}</strong></td>
                <td>
                    ${p.name}
                    ${p.description ? `<br><small style="color:var(--text-muted);">${p.description}</small>` : ''}
                </td>
                <td>${p.unit}</td>
                <td class="num-col">${formatMoney(totalCost)} ฿</td>
                <td class="num-col">${formatMoney(p.standard_price)} ฿</td>
                <td>${components.length} รายการ</td>
                <td style="text-align: center;">
                    <button class="btn btn-secondary btn-sm edit-set-btn" data-id="${p.id}"><i class="fa-solid fa-edit"></i></button>
                    <button class="btn btn-danger btn-sm delete-set-btn" data-id="${p.id}"><i class="fa-solid fa-trash-alt"></i></button>
                </td>
            `;

            // Edit set click
            tr.querySelector('.edit-set-btn').addEventListener('click', async () => {
                document.getElementById('inv-set-form-id').value = p.id;
                document.getElementById('inv-set-code').value = p.code;
                document.getElementById('inv-set-name').value = p.name;
                document.getElementById('inv-set-unit').value = p.unit;
                document.getElementById('inv-set-price').value = p.standard_price;
                document.getElementById('inv-set-desc').value = p.description || '';
                document.getElementById('inv-set-modal-title').innerHTML = '<i class="fa-solid fa-cubes"></i> แก้ไขสินค้าชุด (BOM)';
                
                // Clear old components table and reload
                document.getElementById('inv-set-items-tbody').innerHTML = '';
                for (const c of components) {
                    await addSetComponentRow(c.member_product_id, c.quantity);
                }

                openModal('modal-add-inv-set');
            });

            // Delete set handler
            tr.querySelector('.delete-set-btn').addEventListener('click', async () => {
                if (confirm(`คุณต้องการลบสินค้าชุด ${p.code} : ${p.name}?`)) {
                    try {
                        await db.deleteItem('products', p.id);
                        showToast('ลบสินค้าชุดเรียบร้อยแล้ว', 'success');
                        await renderInventorySets();
                    } catch (err) {
                        alert('ไม่สามารถลบสินค้าชุดได้: ' + err.message);
                    }
                }
            });

            tbody.appendChild(tr);
        }

    } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--danger-red);">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>`;
    }
}

// 4. RENDER SERVICES
async function renderInventoryServices() {
    const tbody = document.querySelector('#inv-services-table tbody');
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center;"><div class="spinner"></div></td></tr>`;

    try {
        const products = await db.getAll('products');
        const query = document.getElementById('inv-service-search').value.trim().toLowerCase();

        let filtered = products.filter(p => p.type === 'service');
        if (query) {
            filtered = filtered.filter(p => p.code.toLowerCase().includes(query) || p.name.toLowerCase().includes(query));
        }

        tbody.innerHTML = '';
        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">ไม่พบรายการบริการ</td></tr>`;
            return;
        }

        filtered.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${p.code}</strong></td>
                <td>
                    ${p.name}
                    ${p.description ? `<br><small style="color:var(--text-muted);">${p.description}</small>` : ''}
                </td>
                <td>${p.category || '-'}</td>
                <td>${p.unit}</td>
                <td class="num-col">${formatMoney(p.standard_price)} ฿</td>
                <td style="text-align: center;">
                    <button class="btn btn-secondary btn-sm edit-service-btn" data-id="${p.id}"><i class="fa-solid fa-edit"></i></button>
                    <button class="btn btn-danger btn-sm delete-service-btn" data-id="${p.id}"><i class="fa-solid fa-trash-alt"></i></button>
                </td>
            `;

            // Edit handler
            tr.querySelector('.edit-service-btn').addEventListener('click', () => {
                document.getElementById('inv-product-form-id').value = p.id;
                document.getElementById('inv-product-form-type').value = p.type;
                document.getElementById('inv-product-code').value = p.code;
                document.getElementById('inv-product-name').value = p.name;
                document.getElementById('inv-product-category').value = p.category || '';
                document.getElementById('inv-product-unit').value = p.unit;
                document.getElementById('inv-product-cost').value = p.standard_cost;
                document.getElementById('inv-product-price').value = p.standard_price;
                document.getElementById('inv-product-desc-input').value = p.description || '';
                document.getElementById('inv-product-status').value = p.status;
                document.getElementById('inv-product-modal-title').innerHTML = '<i class="fa-solid fa-bell-concierge"></i> แก้ไขข้อมูลบริการ';
                openModal('modal-add-inv-product');
            });

            // Delete handler
            tr.querySelector('.delete-service-btn').addEventListener('click', async () => {
                if (confirm(`คุณต้องการลบบริการ ${p.code} : ${p.name}?`)) {
                    try {
                        await db.deleteItem('products', p.id);
                        showToast('ลบบริการเรียบร้อยแล้ว', 'success');
                        await renderInventoryServices();
                    } catch (err) {
                        alert('ไม่สามารถลบบริการได้: ' + err.message);
                    }
                }
            });

            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--danger-red);">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>`;
    }
}

// 5. RENDER PRICING TABLE
async function renderInventoryPrices() {
    const tbody = document.querySelector('#inv-prices-table tbody');
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center;"><div class="spinner"></div></td></tr>`;

    try {
        const products = await db.getAll('products');
        const priceList = await db.getAll('priceLists');
        const query = document.getElementById('inv-price-search').value.trim().toLowerCase();

        let filtered = products;
        if (query) {
            filtered = filtered.filter(p => p.code.toLowerCase().includes(query) || p.name.toLowerCase().includes(query));
        }

        tbody.innerHTML = '';
        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">ไม่พบข้อมูลที่ค้นหา</td></tr>`;
            return;
        }

        filtered.forEach(p => {
            const tr = document.createElement('tr');
            
            // Filter prices for this product
            const pPrices = priceList.filter(pl => pl.product_id == p.id);
            
            const retail = pPrices.find(pl => pl.tier_name === 'Retail')?.price;
            const wholesale = pPrices.find(pl => pl.tier_name === 'Wholesale')?.price;
            const vip = pPrices.find(pl => pl.tier_name === 'VIP')?.price;
            const member = pPrices.find(pl => pl.tier_name === 'Member')?.price;

            tr.innerHTML = `
                <td><strong>${p.code}</strong></td>
                <td>${p.name} <small style="color:var(--text-muted);">(${p.type === 'service' ? 'บริการ' : p.type === 'set' ? 'ชุด' : 'สินค้า'})</small></td>
                <td class="num-col">${formatMoney(p.standard_price)} ฿</td>
                <td class="num-col">${retail !== undefined ? formatMoney(retail) + ' ฿' : '<span style="color:var(--text-muted); font-size:11px;">-</span>'}</td>
                <td class="num-col">${wholesale !== undefined ? formatMoney(wholesale) + ' ฿' : '<span style="color:var(--text-muted); font-size:11px;">-</span>'}</td>
                <td class="num-col">${vip !== undefined ? formatMoney(vip) + ' ฿' : '<span style="color:var(--text-muted); font-size:11px;">-</span>'}</td>
                <td class="num-col">${member !== undefined ? formatMoney(member) + ' ฿' : '<span style="color:var(--text-muted); font-size:11px;">-</span>'}</td>
                <td style="text-align: center;">
                    <button class="btn btn-secondary btn-sm manage-price-btn" data-id="${p.id}"><i class="fa-solid fa-pencil"></i> ตั้งราคา</button>
                </td>
            `;

            tr.querySelector('.manage-price-btn').addEventListener('click', () => {
                document.getElementById('add-inv-price-form').reset();
                
                const selectEl = document.getElementById('inv-price-product-id');
                selectEl.innerHTML = `<option value="${p.id}">[${p.code}] ${p.name}</option>`;
                openModal('modal-add-inv-price');
            });

            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--danger-red);">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>`;
    }
}

// 6. RENDER INVENTORY COUNTS
async function renderInventoryCounts() {
    const tbody = document.querySelector('#inv-counts-table tbody');
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center;"><div class="spinner"></div></td></tr>`;

    try {
        const counts = await db.getAll('inventoryCounts');
        tbody.innerHTML = '';

        if (counts.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">ไม่มีประวัติการตรวจนับสินค้า</td></tr>`;
            return;
        }

        counts.sort((a,b) => b.date.localeCompare(a.date) || b.id - a.id).forEach(c => {
            const tr = document.createElement('tr');
            const statusLabel = c.status === 'posted' ? 
                '<span class="status-badge paid"><i class="fa-solid fa-circle-check"></i> ผ่านรายการแล้ว</span>' : 
                '<span class="status-badge draft"><i class="fa-solid fa-pen"></i> แบบร่าง</span>';

            tr.innerHTML = `
                <td><strong>${c.ref_no}</strong></td>
                <td>${formatDateToDDMMYYYY(c.date)}</td>
                <td>${c.description || '-'}</td>
                <td style="text-align: center;">${statusLabel}</td>
                <td style="text-align: center;">
                    <button class="btn btn-secondary btn-sm view-count-btn" data-id="${c.id}"><i class="fa-solid fa-eye"></i></button>
                    ${c.status !== 'posted' ? `<button class="btn btn-danger btn-sm delete-count-btn" data-id="${c.id}"><i class="fa-solid fa-trash-alt"></i></button>` : ''}
                </td>
            `;

            // View count details
            tr.querySelector('.view-count-btn').addEventListener('click', async () => {
                const companyCode = db.getActiveCompanyCode();
                const res = await fetch(`/api/inventory-counts/${companyCode}/${c.id}`);
                if (res.ok) {
                    const sheet = await res.json();
                    selectedCountSheetId = sheet.id;
                    
                    document.getElementById('inv-count-id').value = sheet.id;
                    document.getElementById('inv-count-date').value = sheet.date;
                    document.getElementById('inv-count-ref').value = sheet.ref_no;
                    document.getElementById('inv-count-desc').value = sheet.description || '';
                    document.getElementById('inv-count-sheet-title').innerHTML = `<i class="fa-solid fa-calculator"></i> รายการตรวจนับเลขที่: ${sheet.ref_no}`;
                    
                    await populateCountItemsGrid(sheet.items);
                    
                    if (sheet.status === 'posted') {
                        document.getElementById('btn-inv-count-post').style.display = 'none';
                        document.getElementById('btn-inv-count-draft').style.display = 'none';
                        document.querySelectorAll('.counted-qty-val').forEach(input => input.disabled = true);
                    } else {
                        document.getElementById('btn-inv-count-post').style.display = 'inline-flex';
                        document.getElementById('btn-inv-count-draft').style.display = 'inline-flex';
                    }

                    document.getElementById('inv-counts-list-wrapper').style.display = 'none';
                    document.getElementById('inv-count-form-wrapper').style.display = 'block';
                }
            });

            // Delete count sheet
            if (c.status !== 'posted') {
                tr.querySelector('.delete-count-btn').addEventListener('click', async () => {
                    if (confirm(`คุณต้องการลบใบตรวจนับแบบร่าง เลขที่ ${c.ref_no}?`)) {
                        try {
                            await db.deleteItem('inventoryCounts', c.id);
                            showToast('ลบรายการสำเร็จ', 'success');
                            await renderInventoryCounts();
                        } catch (err) {
                            alert('ลบรายการไม่สำเร็จ: ' + err.message);
                        }
                    }
                });
            }

            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--danger-red);">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>`;
    }
}

// 7. RENDER REORDER ALERTS
async function renderInventoryReorders() {
    const tbody = document.querySelector('#inv-reorders-table tbody');
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center;"><div class="spinner"></div></td></tr>`;

    try {
        const products = await db.getAll('products');
        const standardProducts = products.filter(p => p.type === 'product');

        if (standardProducts.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">ไม่มีรายการสินค้า</td></tr>`;
            return;
        }

        const balances = await getStockBalancesMap();
        tbody.innerHTML = '';

        standardProducts.forEach(p => {
            const tr = document.createElement('tr');
            const qty = balances[p.id] || 0;
            const minQty = p.min_qty || 0;
            const reorderQty = p.reorder_qty || 0;

            const isLow = qty < minQty;
            const statusLabel = isLow ? 
                '<span class="status-badge unpaid"><i class="fa-solid fa-triangle-exclamation"></i> สต็อกต่ำกว่าเกณฑ์</span>' : 
                '<span class="status-badge paid"><i class="fa-solid fa-check"></i> ปกติ</span>';

            tr.innerHTML = `
                <td><strong>${p.code}</strong></td>
                <td>${p.name}</td>
                <td>${p.unit}</td>
                <td class="num-col" style="font-weight:700; color: ${isLow ? 'var(--danger-red)' : 'var(--text-primary)'};">${qty.toFixed(2)}</td>
                <td>
                    <input type="number" class="form-control num-col reorder-min-input" value="${minQty}" min="0" step="0.01" style="max-width: 120px; margin-left: auto;">
                </td>
                <td>
                    <input type="number" class="form-control num-col reorder-qty-input" value="${reorderQty}" min="0" step="0.01" style="max-width: 120px; margin-left: auto;">
                </td>
                <td style="text-align: center;">${statusLabel}</td>
            `;

            tr.setAttribute('data-product-id', p.id);
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--danger-red);">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>`;
    }
}

// Save all reorder configurations from reorders grid
async function saveReorderPoints() {
    const rows = document.querySelectorAll('#inv-reorders-table tbody tr');
    if (rows.length === 0) return;

    try {
        for (const row of rows) {
            const productId = parseInt(row.getAttribute('data-product-id'));
            const minQty = parseFloat(row.querySelector('.reorder-min-input').value) || 0;
            const reorderQty = parseFloat(row.querySelector('.reorder-qty-input').value) || 0;

            if (!productId) continue;

            const product = await db.getByKey('products', productId);
            if (product) {
                product.min_qty = minQty;
                product.reorder_qty = reorderQty;
                await db.putItem('products', product);
            }
        }
        showToast('บันทึกจุดสั่งซื้อคลังสินค้าสำเร็จ', 'success');
        await renderInventoryReorders();
    } catch (err) {
        console.error(err);
        alert('เกิดข้อผิดพลาด: ' + err.message);
    }
}

// 8. COSTING REPAIR PANEL
async function renderInventoryRepair() {
    document.getElementById('inv-repair-progress-container').style.display = 'none';
}

// RUN COSTING REPAIR (Moving Average Cost Recalculator)
async function runInventoryCostingRepair() {
    const consoleEl = document.getElementById('inv-repair-console');
    const progressContainer = document.getElementById('inv-repair-progress-container');
    const progressBar = document.getElementById('inv-repair-progress-bar');
    const statusText = document.getElementById('inv-repair-status');
    const percentText = document.getElementById('inv-repair-percent');

    progressContainer.style.display = 'block';
    consoleEl.textContent = '--- เริ่มการซ่อมแซมระบบสินค้าและราคาทุนคงคลัง ---\n';
    
    progressBar.style.width = '0%';
    percentText.textContent = '0%';
    statusText.textContent = 'กำลังโหลดสินค้าและประวัติการเคลื่อนไหว...';

    try {
        const products = await db.getAll('products');
        const standardProducts = products.filter(p => p.type === 'product');

        if (standardProducts.length === 0) {
            consoleEl.textContent += 'ไม่พบสินค้าสำเร็จรูปสำหรับดำเนินการคำนวณ\n';
            progressBar.style.width = '100%';
            percentText.textContent = '100%';
            statusText.textContent = 'เสร็จสิ้น';
            return;
        }

        const txs = await db.getAll('inventoryTransactions');
        consoleEl.textContent += `ดึงข้อมูลสินค้าได้ ${standardProducts.length} รายการ และธุรกรรมเคลื่อนไหว ${txs.length} รายการ\n`;

        let completed = 0;

        for (const p of standardProducts) {
            consoleEl.textContent += `\nกำลังประมวลผลสินค้า [${p.code}] ${p.name}...\n`;
            
            // Get movements for this product and sort chronologically (date, then transaction ID)
            const pTxs = txs.filter(tx => tx.product_id == p.id);
            pTxs.sort((a,b) => a.date.localeCompare(b.date) || a.id - b.id);

            let runningQty = 0;
            let runningCost = 0; // Cumulative total cost
            let currentAvgCost = 0;

            consoleEl.textContent += `  พบประวัติธุรกรรม ${pTxs.length} รายการ\n`;

            const updatedTxs = [];

            for (const tx of pTxs) {
                const qtyVal = parseFloat(tx.quantity);
                const unitCostVal = parseFloat(tx.unit_cost) || 0;

                if (tx.transaction_type === 'in' || tx.transaction_type === 'adjust_in') {
                    // Purchase or input increases stock quantity and total valuation
                    runningQty += qtyVal;
                    runningCost += qtyVal * unitCostVal;
                    currentAvgCost = runningQty > 0 ? runningCost / runningQty : 0;
                    
                    tx.unit_cost = unitCostVal;
                    tx.total_cost = qtyVal * unitCostVal;
                    
                    consoleEl.textContent += `    + RECEIVE (${formatDateToDDMMYYYY(tx.date)} / ${tx.doc_ref}): รับเข้า ${qtyVal} @ ${formatMoney(unitCostVal)} - สต็อกสะสม = ${runningQty}, ต้นทุนเฉลี่ยสะสม = ${formatMoney(currentAvgCost)}\n`;
                } else if (tx.transaction_type === 'out' || tx.transaction_type === 'adjust_out') {
                    // Sale or issue decreases stock quantity at the current average cost
                    const oldAvg = currentAvgCost;
                    
                    runningQty -= qtyVal;
                    runningCost = runningQty * currentAvgCost; // remains at current average
                    
                    tx.unit_cost = oldAvg;
                    tx.total_cost = qtyVal * oldAvg;

                    consoleEl.textContent += `    - ISSUE (${formatDateToDDMMYYYY(tx.date)} / ${tx.doc_ref}): จ่ายออก ${qtyVal} @ ${formatMoney(oldAvg)} - สต็อกสะสม = ${runningQty}, ต้นทุนเฉลี่ยสะสม = ${formatMoney(currentAvgCost)}\n`;
                }
                
                updatedTxs.push(tx);
            }

            // Save updated transactions back to database
            if (updatedTxs.length > 0) {
                await db.bulkPut('inventoryTransactions', updatedTxs);
            }

            // Save final average cost back to product master cost
            p.standard_cost = currentAvgCost;
            await db.putItem('products', p);

            consoleEl.textContent += `  เสร็จสิ้น! ต้นทุนถัวเฉลี่ยถอยหลังสุดท้าย = ${formatMoney(currentAvgCost)} ฿\n`;

            completed++;
            const pct = Math.round((completed / standardProducts.length) * 100);
            progressBar.style.width = `${pct}%`;
            percentText.textContent = `${pct}%`;
                            statusText.textContent = `ประมวลผลไปแล้ว ${completed} / ${standardProducts.length} รายการ...`;
            
            consoleEl.scrollTop = consoleEl.scrollHeight;
        }


        consoleEl.textContent += '\n--- สรุปการซ่อมแซมราคาทุนและปรับสมดุลสินค้าคลังสำเร็จเสร็จสิ้น 100% ---\n';
        statusText.textContent = 'ดำเนินการซ่อมแซมระบบสินค้าคงคลังเสร็จสิ้นแล้ว!';
        showToast('ซ่อมแซมระบบสินค้าและคำนวณราคาทุนใหม่เรียบร้อยแล้ว', 'success');

    } catch (err) {
        console.error(err);
        consoleEl.textContent += `\n[FATAL ERROR] การประมวลผลล้มเหลว: ${err.message}\n`;
        statusText.textContent = 'เกิดข้อผิดพลาดในการคำนวณ!';
        showToast('ล้มเหลวในการซ่อมแซมระบบ: ' + err.message, 'error');
    }
}

// =========================================================================
// 19. GENERIC EDIT FORM UI HELPERS & CONTROLLERS
// =========================================================================

function setFormEditMode(formId, isEdit, id, cancelCallback) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    const card = form.closest('.card') || form.closest('.card-body')?.closest('.card');
    const headerTitle = card ? card.querySelector('.card-header h3') : null;
    let submitBtn = form.querySelector('button[type="submit"]');
    
    let originalTitleHtml = '';
    let originalBtnHtml = '';
    let editTitleHtml = '';
    let editBtnHtml = '';
    
    switch (formId) {
        case 'invoice-form':
            originalTitleHtml = '<i class="fa-solid fa-file-circle-plus"></i> บันทึกใบแจ้งหนี้ (Invoice Creator)';
            originalBtnHtml = '<i class="fa-solid fa-save"></i> บันทึกใบแจ้งหนี้ลงบัญชีอัตโนมัติ';
            editTitleHtml = '<i class="fa-solid fa-pencil"></i> แก้ไขใบแจ้งหนี้: ' + id;
            editBtnHtml = '<i class="fa-solid fa-save"></i> บันทึกการแก้ไขใบแจ้งหนี้';
            editingInvoiceId = isEdit ? id : null;
            break;
        case 'bill-form':
            originalTitleHtml = '<i class="fa-solid fa-file-invoice-dollar"></i> บันทึกใบสำคัญ / เจ้าหนี้ (Bill Expenses)';
            originalBtnHtml = '<i class="fa-solid fa-save"></i> บันทึกบิลลงบัญชีอัตโนมัติ';
            editTitleHtml = '<i class="fa-solid fa-pencil"></i> แก้ไขบิลค่าใช้จ่าย: ' + id;
            editBtnHtml = '<i class="fa-solid fa-save"></i> บันทึกการแก้ไขบิล';
            editingBillId = isEdit ? id : null;
            break;
        case 'ar-receipt-form':
            originalTitleHtml = '<i class="fa-solid fa-file-invoice-dollar"></i> บันทึกรับชำระหนี้ (AR Receipt)';
            originalBtnHtml = '<i class="fa-solid fa-save"></i> บันทึกรับชำระหนี้ลดยอดหนี้';
            editTitleHtml = '<i class="fa-solid fa-pencil"></i> แก้ไขการรับชำระหนี้: ' + id;
            editBtnHtml = '<i class="fa-solid fa-save"></i> บันทึกการแก้ไขใบเสร็จ';
            editingReceiptId = isEdit ? id : null;
            break;
        case 'ap-payment-form':
            originalTitleHtml = '<i class="fa-solid fa-file-signature"></i> บันทึกใบจ่ายชำระหนี้ (AP Payment)';
            originalBtnHtml = '<i class="fa-solid fa-save"></i> บันทึกจ่ายชำระหนี้ลดยอดหนี้';
            editTitleHtml = '<i class="fa-solid fa-pencil"></i> แก้ไขการจ่ายชำระหนี้: ' + id;
            editBtnHtml = '<i class="fa-solid fa-save"></i> บันทึกการแก้ไขใบสำคัญจ่าย';
            editingPaymentId = isEdit ? id : null;
            break;
        case 'pc-payment-form':
            originalTitleHtml = '<i class="fa-solid fa-receipt"></i> บันทึกการจ่ายเงินสดย่อย (DP)';
            originalBtnHtml = '<i class="fa-solid fa-save"></i> บันทึกจ่ายเงินสดย่อย';
            editTitleHtml = '<i class="fa-solid fa-pencil"></i> แก้ไขการจ่ายเงินสดย่อย: ' + id;
            editBtnHtml = '<i class="fa-solid fa-save"></i> บันทึกการแก้ไขใบสำคัญ';
            editingDPId = isEdit ? id : null;
            break;
        case 'pc-reimburse-form':
            originalTitleHtml = '<i class="fa-solid fa-rotate"></i> เบิกชดเชยเงินสดย่อย (VR)';
            originalBtnHtml = '<i class="fa-solid fa-check-double"></i> บันทึกเบิกชดเชยผ่านรายการ';
            editTitleHtml = '<i class="fa-solid fa-pencil"></i> แก้ไขใบเบิกชดเชยเงินสดย่อย: ' + id;
            editBtnHtml = '<i class="fa-solid fa-save"></i> บันทึกการแก้ไขใบเบิกชดเชย';
            editingVRId = isEdit ? id : null;
            break;
    }
    
    let cancelBtnId = formId + '-cancel-edit-btn';
    let cancelBtn = document.getElementById(cancelBtnId);
    
    if (isEdit) {
        if (headerTitle) headerTitle.innerHTML = editTitleHtml;
        if (submitBtn) {
            submitBtn.innerHTML = editBtnHtml;
            submitBtn.classList.remove('btn-success');
            submitBtn.classList.add('btn-warning');
        }
        
        if (!cancelBtn) {
            cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.id = cancelBtnId;
            cancelBtn.className = 'btn btn-secondary';
            cancelBtn.style.marginLeft = '8px';
            cancelBtn.innerHTML = '<i class="fa-solid fa-times"></i> ยกเลิก';
            cancelBtn.addEventListener('click', () => {
                setFormEditMode(formId, false, null);
                if (cancelCallback) cancelCallback();
            });
            submitBtn.parentNode.insertBefore(cancelBtn, submitBtn.nextSibling);
        }
    } else {
        if (headerTitle) headerTitle.innerHTML = originalTitleHtml;
        if (submitBtn) {
            submitBtn.innerHTML = originalBtnHtml;
            submitBtn.classList.remove('btn-warning');
            submitBtn.classList.add('btn-success');
        }
        
        if (cancelBtn) {
            cancelBtn.remove();
        }
        form.reset();
    }
}

async function startEditInvoice(id) {
    const inv = await db.getByKey('invoices', id);
    if (!inv) return;
    
    await switchView('invoices');
    document.getElementById('subtab-invoice-btn').click();
    
    setFormEditMode('invoice-form', true, id, resetInvoiceForm);
    
    document.getElementById('inv-customer-select').value = 'manual';
    document.getElementById('inv-customer-name').value = inv.customerName || '';
    document.getElementById('inv-tax-id').value = inv.taxId || '';
    document.getElementById('inv-address').value = inv.address || '';
    document.getElementById('inv-date').value = inv.date;
    document.getElementById('inv-due-date').value = inv.dueDate;
    
    // Clear dynamic tables
    const itemsTbody = document.getElementById('invoice-items-tbody');
    if (itemsTbody) itemsTbody.innerHTML = '';
    const paymentsTbody = document.getElementById('invoice-payments-tbody');
    if (paymentsTbody) paymentsTbody.innerHTML = '';

    // Load items
    if (inv.items && inv.items.length > 0) {
        inv.items.forEach(item => {
            const hasVat = item.hasVat !== undefined ? item.hasVat : (inv.vatRate === 7);
            const whtRate = item.whtRate !== undefined ? item.whtRate : (inv.whtRate > 0 ? `${inv.whtRate}` : 'none');
            addInvoiceItemRow(item.description, item.quantity, item.unitPrice, hasVat, whtRate);
        });
    } else {
        addInvoiceItemRow();
    }
    
    document.getElementById('inv-vat-rate').value = inv.vatRate === 7 ? '7' : 'none';
    document.getElementById('inv-wht-rate').value = inv.whtRate > 0 ? `${inv.whtRate}` : 'none';
    const typeElInv = document.getElementById('inv-wht-type');
    const typeRowInv = document.getElementById('inv-summary-wht-type-row');
    if (typeElInv && typeRowInv) {
        typeElInv.value = inv.whtType || 'none';
        typeRowInv.style.display = inv.whtRate > 0 ? 'flex' : 'none';
    }
    document.getElementById('inv-status').value = inv.status;

    // Toggle and load payments
    const pSection = document.getElementById('invoice-payments-section');
    if (pSection) {
        pSection.style.display = inv.status === 'paid' ? 'block' : 'none';
    }

    if (inv.status === 'paid') {
        if (inv.payments && inv.payments.length > 0) {
            for (const p of inv.payments) {
                await addInvoicePaymentRow(p.date, p.account, p.amount, p.reference);
            }
        } else {
            // Fallback for older invoice data
            const pDate = inv.paymentDate || inv.date;
            const pAmount = inv.grandTotal || inv.total || 0;
            const pAccount = inv.paymentAccount || '';
            await addInvoicePaymentRow(pDate, pAccount, pAmount, '');
        }
    } else {
        await addInvoicePaymentRow();
    }
    
    recalculateInvoice();
}

function resetInvoiceForm() {
    editingInvoiceId = null;
    const form = document.getElementById('invoice-form');
    if (form) form.reset();
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('inv-date').value = today;
    document.getElementById('inv-due-date').value = today;

    const itemsTbody = document.getElementById('invoice-items-tbody');
    if (itemsTbody) itemsTbody.innerHTML = '';
    const paymentsTbody = document.getElementById('invoice-payments-tbody');
    if (paymentsTbody) paymentsTbody.innerHTML = '';

    addInvoiceItemRow();
    
    // Hide payment section by default on reset
    const pSection = document.getElementById('invoice-payments-section');
    if (pSection) pSection.style.display = 'none';

    recalculateInvoice();
}

async function startEditBill(id) {
    const bill = await db.getByKey('bills', id);
    if (!bill) return;
    
    await switchView('invoices');
    document.getElementById('subtab-bill-btn').click();
    
    setFormEditMode('bill-form', true, id, resetBillForm);
    
    document.getElementById('bill-vendor-select').value = 'manual';
    document.getElementById('bill-vendor-name').value = bill.vendorName || bill.vendor_name || '';
    document.getElementById('bill-tax-id').value = bill.taxId || bill.tax_id || '';
    const addrEl = document.getElementById('bill-address');
    if (addrEl) addrEl.value = bill.address || '';
    document.getElementById('bill-date').value = bill.date;
    const docNoEl = document.getElementById('bill-doc-no');
    if (docNoEl) docNoEl.value = bill.id || ''; // Display the EX document number
    
    const billDescEl = document.getElementById('bill-description');
    if (billDescEl && bill.items && bill.items.length > 0) {
        billDescEl.value = bill.items[0].description || '';
        window.previousBillDesc = billDescEl.value;
    } else if (billDescEl) {
        billDescEl.value = '';
        window.previousBillDesc = '';
    }
    
    const templates = await db.getAll('expenseCatalog');
    const template = templates.find(t => t.accountCode === bill.expenseAccount);
    if (template) {
        document.getElementById('bill-expense-account').value = template.code;
    }
    
    // Clear dynamic tables
    const itemsTbody = document.getElementById('bill-items-tbody');
    if (itemsTbody) itemsTbody.innerHTML = '';
    const paymentsTbody = document.getElementById('bill-payments-tbody');
    if (paymentsTbody) paymentsTbody.innerHTML = '';

    // Load items
    if (bill.items && bill.items.length > 0) {
        bill.items.forEach(item => {
            const hasVat = item.hasVat !== undefined ? item.hasVat : (bill.vatRate === 7);
            const whtRate = item.whtRate !== undefined ? item.whtRate : (bill.whtRate > 0 ? `${bill.whtRate}` : 'none');
            addBillItemRow(item.code || '', item.quantity, item.unitPrice, hasVat, whtRate);
            
            // set description
            const tbody = document.getElementById('bill-items-tbody');
            if (tbody) {
                const rows = tbody.querySelectorAll('.bill-item-row');
                if (rows.length > 0) {
                    const lastRow = rows[rows.length - 1];
                    const descInput = lastRow.querySelector('.bill-item-desc');
                    if (descInput) descInput.value = item.description || '';
                }
            }
        });
    } else {
        addBillItemRow();
    }
    
    document.getElementById('bill-vat-rate').value = bill.vatRate === 7 ? '7' : 'none';
    document.getElementById('bill-wht-rate').value = bill.whtRate > 0 ? `${bill.whtRate}` : 'none';
    const typeElBill = document.getElementById('bill-wht-type');
    const typeRowBill = document.getElementById('bill-summary-wht-type-row');
    if (typeElBill && typeRowBill) {
        typeElBill.value = bill.whtType || 'none';
        typeRowBill.style.display = bill.whtRate > 0 ? 'flex' : 'none';
    }
    
    const statusEl = document.getElementById('bill-status');
    if (statusEl) statusEl.value = bill.status;
    
    const pGroup = document.getElementById('bill-payments-section');
    if (pGroup) {
        pGroup.style.display = 'block';
    }
    const billPayAcc = document.getElementById('bill-payment-account');
    if (billPayAcc) {
        billPayAcc.value = bill.paymentAccount || '';
    }

    // Load payments
    if (bill.payments && bill.payments.length > 0) {
        for (const p of bill.payments) {
            await addBillPaymentRow(p.date, p.account, p.amount, p.reference);
        }
    } else {
        // Fallback for older single payment data or paid status
        if (bill.status === 'paid' && bill.paymentAccount) {
            const pDate = bill.paymentDate || bill.payment_date || bill.date;
            const pAmount = bill.totalAmount || bill.total || 0;
            await addBillPaymentRow(pDate, bill.paymentAccount, pAmount, '');
        } else {
            await addBillPaymentRow();
        }
    }
    
    recalculateBill();
}

async function resetBillForm() {
    editingBillId = null;
    window.previousBillDesc = '';
    const form = document.getElementById('bill-form');
    if (form) form.reset();
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('bill-date').value = today;
    if (typeof window.generateBillId === 'function') {
        const newId = await window.generateBillId(today);
        const docNoEl = document.getElementById('bill-doc-no');
        if (docNoEl) docNoEl.value = newId;
    }
    
    const pGroup = document.getElementById('bill-payments-section');
    if (pGroup) pGroup.style.display = 'block';

    const itemsTbody = document.getElementById('bill-items-tbody');
    if (itemsTbody) itemsTbody.innerHTML = '';
    const paymentsTbody = document.getElementById('bill-payments-tbody');
    if (paymentsTbody) paymentsTbody.innerHTML = '';

    const templates = await db.getAll('expenseCatalog');
    if (templates && templates.length > 0) {
        const hasVat = templates[0].vatType === '7' || templates[0].vatType === 7 || templates[0].vatType === 'include' || templates[0].vatType === 'exclude';
        addBillItemRow(templates[0].code, 1, templates[0].amount || 0, hasVat, 'none');
        const vatRateSelect = document.getElementById('bill-vat-rate');
        if (vatRateSelect) vatRateSelect.value = templates[0].vatType || 'none';
    } else {
        addBillItemRow();
    }
    
    await addBillPaymentRow();
    
    recalculateBill();
}

async function startEditReceipt(id) {
    editingReceiptId = id;
    const re = await db.getByKey('arReceipts', id);
    if (!re) return;
    
    await switchView('finance');
    document.getElementById('subtab-ar-receipts-btn').click();
    
    setFormEditMode('ar-receipt-form', true, id, resetReceiptForm);
    
    document.getElementById('ar-id').value = re.id;
    document.getElementById('ar-reference').value = re.reference || '';
    document.getElementById('ar-memo').value = re.memo || '';
    document.getElementById('ar-date').value = re.date;
    
    const arCustSelect = document.getElementById('ar-customer-select');
    if (arCustSelect) {
        arCustSelect.value = re.customerId;
        arCustSelect.dispatchEvent(new Event('change'));
    }
    
    document.getElementById('ar-cash-amount').value = re.cashAmount.toFixed(2);
    document.getElementById('ar-wht-amount').value = re.whtAmount.toFixed(2);
    document.getElementById('ar-discount-amount').value = re.discountAmount.toFixed(2);
    
    const tbody = document.getElementById('ar-other-payments-tbody');
    if (tbody) tbody.innerHTML = '';
    
    if (re.paymentLines && re.paymentLines.length > 0) {
        for (const line of re.paymentLines) {
            await addARPaymentRow(line.methodCode, line.reference, line.bankCode, line.amount);
        }
    }
    
    setTimeout(() => {
        recalculateAR();
    }, 100);
}

function resetReceiptForm() {
    editingReceiptId = null;
    const form = document.getElementById('ar-receipt-form');
    if (form) form.reset();
    document.getElementById('ar-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('ar-id').value = '';
    
    const arCustSelect = document.getElementById('ar-customer-select');
    if (arCustSelect) arCustSelect.value = '';
    
    const tbody = document.getElementById('ar-invoices-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">เลือกรายชื่อลูกหนี้เพื่อแสดงยอดค้างชำระ</td></tr>';
    
    const otherRows = document.querySelectorAll('.ar-other-pay-row');
    otherRows.forEach(row => row.remove());
    
    recalculateAR();
}

async function startEditPayment(id) {
    editingPaymentId = id;
    const ps = await db.getByKey('apPayments', id);
    if (!ps) return;
    
    await switchView('finance');
    document.getElementById('subtab-ap-payments-btn').click();
    
    setFormEditMode('ap-payment-form', true, id, resetPaymentForm);
    
    document.getElementById('ap-id').value = ps.id;
    document.getElementById('ap-reference').value = ps.reference || '';
    document.getElementById('ap-memo').value = ps.memo || '';
    document.getElementById('ap-date').value = ps.date;
    
    const apSupplierSelect = document.getElementById('ap-supplier-select');
    if (apSupplierSelect) {
        apSupplierSelect.value = ps.supplierId;
        apSupplierSelect.dispatchEvent(new Event('change'));
    }
    
    document.getElementById('ap-cash-amount').value = ps.cashAmount.toFixed(2);
    document.getElementById('ap-wht-amount').value = ps.whtAmount.toFixed(2);
    document.getElementById('ap-discount-amount').value = ps.discountAmount.toFixed(2);
    
    const tbody = document.getElementById('ap-other-payments-tbody');
    if (tbody) tbody.innerHTML = '';
    
    if (ps.paymentLines && ps.paymentLines.length > 0) {
        for (const line of ps.paymentLines) {
            await addAPPaymentRow(line.methodCode, line.reference, line.bankCode, line.amount);
        }
    }
    
    setTimeout(() => {
        recalculateAP();
    }, 100);
}

function resetPaymentForm() {
    editingPaymentId = null;
    const form = document.getElementById('ap-payment-form');
    if (form) form.reset();
    document.getElementById('ap-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('ap-id').value = '';
    
    const apSupplierSelect = document.getElementById('ap-supplier-select');
    if (apSupplierSelect) apSupplierSelect.value = '';
    
    const tbody = document.getElementById('ap-bills-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">เลือกรายชื่อเจ้าหนี้เพื่อแสดงยอดค้างชำระ</td></tr>';
    
    const otherRows = document.querySelectorAll('.ap-other-pay-row');
    otherRows.forEach(row => row.remove());
    
    recalculateAP();
}

async function startEditDP(id) {
    editingDPId = id;
    const dp = await db.getByKey('pettyCashPayments', id);
    if (!dp) return;
    
    await switchView('petty-cash');
    document.getElementById('subtab-pc-payment-btn').click();
    
    setFormEditMode('pc-payment-form', true, id, resetDPForm);
    
    document.getElementById('pc-pay-id').value = dp.id;
    document.getElementById('pc-pay-date').value = dp.date;
    document.getElementById('pc-pay-type').value = dp.type || 'expense';
    document.getElementById('pc-pay-status').value = dp.status || 'paid';
    document.getElementById('pc-pay-remarks').value = dp.remarks || '';
    document.getElementById('pc-pay-contact').value = dp.contactCode || '';
    
    document.getElementById('pc-pay-wht-rate').value = dp.whtType || 'none';
    document.getElementById('pc-pay-wht-amount').value = dp.whtAmount ? dp.whtAmount.toFixed(2) : '0.00';
    document.getElementById('pc-pay-vat-type').value = dp.vatType || 'none';
    document.getElementById('pc-pay-vat-amount').value = dp.vatAmount ? dp.vatAmount.toFixed(2) : '0.00';
    document.getElementById('pc-pay-vat-no').value = dp.taxInvoiceNo || '';
    
    pettyCashPayLines = dp.lines.map(l => ({
        accountCode: l.accountCode,
        accountName: l.accountName,
        description: l.description,
        amount: l.amount,
        whtRate: l.whtRate !== undefined ? l.whtRate : (dp.whtType || 'none'),
        whtAmount: l.whtAmount !== undefined ? l.whtAmount : 0
    }));
    
    await renderDPLinesTable();
    recalculateDP();
}

function resetDPForm() {
    editingDPId = null;
    const form = document.getElementById('pc-payment-form');
    if (form) form.reset();
    document.getElementById('pc-pay-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('pc-pay-id').value = '';
    generateDocumentIds();
    
    pettyCashPayLines = [];
    const tbody = document.querySelector('#pc-pay-lines-table tbody');
    if (tbody) tbody.innerHTML = '';
    addDPLinesRow();
    
    recalculateDP();
}

async function startEditVR(id) {
    editingVRId = id;
    const vr = await db.getByKey('pettyCashReimbursements', id);
    if (!vr) return;
    
    await switchView('petty-cash');
    document.getElementById('subtab-pc-reimburse-btn').click();
    
    setFormEditMode('pc-reimburse-form', true, id, resetVRForm);
    
    document.getElementById('pc-reim-id').value = vr.id;
    document.getElementById('pc-reim-date').value = vr.date;
    document.getElementById('pc-reim-explanation').value = vr.explanation || '';
    document.getElementById('pc-reim-account').value = vr.reimburseAccount;
    
    const allDPs = await db.getAll('pettyCashPayments');
    vrSelectedDps = allDPs.filter(dp => dp.vrId === id);
    
    await loadPendingDPsForReimbursement();
    recalculateVR();
}

function resetVRForm() {
    editingVRId = null;
    const form = document.getElementById('pc-reimburse-form');
    if (form) form.reset();
    document.getElementById('pc-reim-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('pc-reim-id').value = '';
    generateDocumentIds();
    
    vrSelectedDps = [];
    loadPendingDPsForReimbursement();
}


// --- Search Filter Features ---
document.addEventListener('DOMContentLoaded', () => {
    const expSearch = document.getElementById('expense-catalog-search');
    if (expSearch) {
        expSearch.addEventListener('input', function(e) {
            const term = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#expense-catalog-table tbody tr');
            rows.forEach(row => {
                const text = row.innerText.toLowerCase();
                row.style.display = text.includes(term) ? '' : 'none';
            });
        });
    }

    const coaSearch = document.getElementById('coa-tree-search');
    if (coaSearch) {
        coaSearch.addEventListener('input', function(e) {
            const term = e.target.value.toLowerCase();
            const nodes = document.querySelectorAll('.coa-tree-node');
            
            if (!term) {
                // Reset visibility
                nodes.forEach(n => n.style.display = '');
                return;
            }
            
            // Hide all first
            nodes.forEach(n => n.style.display = 'none');
            
            // Show matches and trace up to parents
            nodes.forEach(n => {
                const textElement = n.querySelector('.coa-node-content');
                if (textElement && textElement.innerText.toLowerCase().includes(term)) {
                    n.style.display = '';
                    
                    // Show all ancestors and expand them
                    let parent = n.parentElement.closest('.coa-tree-node');
                    while (parent) {
                        parent.style.display = '';
                        const childContainer = parent.querySelector(':scope > .coa-node-children');
                        const toggleIcon = parent.querySelector(':scope > .coa-node-row .coa-node-toggle i');
                        
                        if (childContainer) {
                            childContainer.style.display = 'block';
                        }
                        if (toggleIcon && toggleIcon.classList.contains('fa-chevron-right')) {
                            toggleIcon.classList.remove('fa-chevron-right');
                            toggleIcon.classList.add('fa-chevron-down');
                        }
                        parent = parent.parentElement.closest('.coa-tree-node');
                    }
                }
            });
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // Invoices list search
    const invSearch = document.getElementById('invoices-list-search');
    if (invSearch) {
        invSearch.addEventListener('input', function(e) {
            const term = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#invoices-list-table tbody tr');
            rows.forEach(row => {
                const text = row.innerText.toLowerCase();
                row.style.display = text.includes(term) ? '' : 'none';
            });
        });
    }

    // Bills list search
    const billSearch = document.getElementById('bills-list-search');
    if (billSearch) {
        billSearch.addEventListener('input', function(e) {
            const term = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#bills-list-table tbody tr');
            rows.forEach(row => {
                const text = row.innerText.toLowerCase();
                row.style.display = text.includes(term) ? '' : 'none';
            });
        });
    }
});


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


// Expose to global scope for HTML onclick handlers
window.openUserModal = openUserModal;
window.editUser = editUser;
window.closeUserModal = closeUserModal;
window.deleteUser = deleteUser;

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

// Global functions for quick add outside DOMContentLoaded

window.openQuickAddVendorBill = function() {
    const form = document.getElementById('add-contact-form');
    if (form) form.reset();
    
    const idField = document.getElementById('contact-form-id');
    if (idField) idField.value = '';
    
    const titleField = document.getElementById('contact-modal-title');
    if (titleField) titleField.innerHTML = `<i class="fa-solid fa-user-plus"></i> เพิ่มคู่ค้า/เจ้าหนี้ใหม่`;
    
    const customerCheck = document.getElementById('contact-form-is-customer');
    if (customerCheck) customerCheck.checked = false;
    
    const supplierCheck = document.getElementById('contact-form-is-supplier');
    if (supplierCheck) {
        supplierCheck.checked = true;
        supplierCheck.dispatchEvent(new Event('change'));
    }
    
    const bankGroup = document.getElementById('contact-bank-group');
    if (bankGroup) bankGroup.style.display = 'block';
    
    if (typeof openModal === 'function') {
        openModal('modal-add-contact-view');
    } else if (window.openModal) {
        window.openModal('modal-add-contact-view');
    } else {
        alert('openModal is undefined');
    }
};

window._isQuickAddExpenseCatalogLoading = false;

window.openQuickAddExpenseCatalog = async function() {
    if (window._isQuickAddExpenseCatalogLoading) return;
    
    const btn = document.getElementById('quick-add-expense-catalog-btn');
    if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> DEBUG 1...';
    window._isQuickAddExpenseCatalogLoading = true;
    
    try {
        const selectEl = document.getElementById('quick-exp-account');
        if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> DEBUG 2...';
        
        if (selectEl) {
            selectEl.innerHTML = '';
            const accounts = await db.getAll('accounts');
            if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> DEBUG 3...';
            const expenseAccs = accounts.filter(a => a.category === 'expense' && a.type === 'posting');
            
            if (expenseAccs.length > 0) {
                expenseAccs.forEach(acc => {
                    selectEl.innerHTML += `<option value="${acc.code}">${acc.code} - ${acc.name}</option>`;
                });
            } else {
                selectEl.innerHTML = '<option value="">-- ไม่พบบัญชีค่าใช้จ่าย --</option>';
            }
            if (window.jQuery) {
                window.jQuery(selectEl).select2('destroy').select2({ width: '100%', dropdownAutoWidth: true, dropdownParent: window.jQuery('#modal-quick-add-expense-catalog') });
            }
        }
        
        // Reset form
        const form = document.getElementById('quick-expense-catalog-form');
        if (form) form.reset();
        
        if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> DEBUG 4...';
        
        if (typeof openModal === 'function') {
            openModal('modal-quick-add-expense-catalog');
        } else if (window.openModal) {
            window.openModal('modal-quick-add-expense-catalog');
        } else {
            console.error('openModal is undefined');
            alert('openModal is undefined');
        }
    } catch (err) {
        console.error(err);
        if (btn) btn.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Error';
        alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
        window._isQuickAddExpenseCatalogLoading = false;
        setTimeout(() => {
            if (btn) btn.innerHTML = '<i class="fa-solid fa-book-medical"></i> เพิ่มรหัสค่าใช้จ่ายใหม่';
        }, 100);
    }
};


    // Handle quick add expense catalog form submission using delegation
    document.addEventListener('submit', async (e) => {
        if (e.target.id === 'quick-expense-catalog-form') {
            e.preventDefault();
            try {
                const code = document.getElementById('quick-exp-code').value.trim();
                const name = document.getElementById('quick-exp-name').value.trim();
                const accountCode = document.getElementById('quick-exp-account').value;
                const vatType = document.getElementById('quick-exp-vat-type').value;
                const amount = parseFloat(document.getElementById('quick-exp-amount').value) || 0.00;
                
                if (!accountCode) {
                    alert('โปรดเลือกบัญชีเดบิตค่าใช้จ่ายสำหรับสอดคล้องกับรหัสนี้');
                    return;
                }
                
                const existing = await db.getByKey('expenseCatalog', code);
                if (existing) {
                    alert('รหัสค่าใช้จ่ายนี้มีอยู่แล้วในระบบ! โปรดระบุรหัสอื่น');
                    return;
                }
                
                const item = { 
                    code, 
                    name, 
                    nameEn: '', 
                    category: '01', 
                    unit: 'ครั้ง', 
                    vatType, 
                    amount, 
                    remarks: '', 
                    accountCode 
                };
                
                await db.putItem('expenseCatalog', item);
                if (typeof showToast === 'function') {
                    showToast('เพิ่มรหัสค่าใช้จ่ายใหม่แบบด่วนเรียบร้อยแล้ว');
                } else {
                    alert('เพิ่มรหัสค่าใช้จ่ายใหม่แบบด่วนเรียบร้อยแล้ว');
                }
                
                if (window.closeModal) window.closeModal('modal-quick-add-expense-catalog');
                
                // Update all existing dropdowns for expense catalogs in bill items
                const latestTemplates = await db.getAll('expenseCatalog');
                document.querySelectorAll('.bill-item-code').forEach(select => {
                    const currentVal = select.value;
                    let html = '<option value="">-- เลือกค่าใช้จ่าย --</option>';
                    latestTemplates.forEach(t => {
                        html += `<option value="${t.code}" ${t.code === currentVal ? 'selected' : ''}>${t.code} - ${t.name}</option>`;
                    });
                    select.innerHTML = html;
                });
                
                // Add a new row automatically using the new code if there's a function for it
                if (typeof addBillItemRow === 'function') {
                    addBillItemRow();
                    // Try to set the newly added row's select to this code
                    setTimeout(() => {
                        const selects = document.querySelectorAll('.bill-item-code');
                        if (selects.length > 0) {
                            const lastSelect = selects[selects.length - 1];
                            lastSelect.value = code;
                            lastSelect.dispatchEvent(new Event('change'));
                        }
                    }, 100);
                }
            } catch (err) {
                console.error(err);
                alert('เกิดข้อผิดพลาดในการบันทึกรหัสค่าใช้จ่าย: ' + err.message);
            }
        }
    });

// Dynamically regenerate Petty Cash IDs when date changes (only for new docs)
const elPcPayDate = document.getElementById('pc-pay-date');
if (elPcPayDate) {
    elPcPayDate.addEventListener('change', async () => {
        if (typeof editingDPId !== 'undefined' && !editingDPId) {
            await generateDocumentIds();
        }
    });
}
const elPcReimDate = document.getElementById('pc-reim-date');
if (elPcReimDate) {
    elPcReimDate.addEventListener('change', async () => {
        if (typeof editingVRId !== 'undefined' && !editingVRId) {
            await generateDocumentIds();
        }
    });
}

// =========================================================================
// RDPrep EXPORT
// =========================================================================
window.exportRDPrep = async function(start, end, pndTypeStr) {
    if (pndTypeStr !== 'wht1' && pndTypeStr !== 'wht3' && pndTypeStr !== 'wht53') {
        alert('กรุณาเลือกรายงาน ภ.ง.ด.1, ภ.ง.ด.3 หรือ ภ.ง.ด.53 ก่อนทำการส่งออก RDPrep');
        return;
    }

    let typeFilter = '';
    if (pndTypeStr === 'wht1') typeFilter = '1';
    else if (pndTypeStr === 'wht3') typeFilter = '3';
    else if (pndTypeStr === 'wht53') typeFilter = '53';
    
    const data = await store.getWithholdingTaxReport(start, end);
    const filteredData = data.filter(d => d.pndType === typeFilter);

    if (filteredData.length === 0) {
        alert('ไม่พบข้อมูลสำหรับส่งออก');
        return;
    }

    let txtContent = '';

    filteredData.forEach(row => {
        const taxId = (row.taxId && row.taxId !== '-') ? row.taxId.replace(/\D/g, '') : '';
        const rawName = (row.partyName || '').trim();
        
        let title = '';
        let firstName = '';
        let lastName = '';

        if (typeFilter === '3' || typeFilter === '1') {
            // For individuals
            const prefixes = ['นางสาว', 'น.ส.', 'นาง', 'ด.ญ.', 'นาย', 'ด.ช.'];
            let foundPrefix = false;
            for (const p of prefixes) {
                if (rawName.startsWith(p)) {
                    title = p;
                    let rest = rawName.substring(p.length).trim();
                    const parts = rest.split(/\s+/);
                    firstName = parts[0] || '';
                    lastName = parts.slice(1).join(' ') || '';
                    foundPrefix = true;
                    break;
                }
            }
            if (!foundPrefix) {
                const parts = rawName.split(/\s+/);
                firstName = parts[0] || '';
                lastName = parts.slice(1).join(' ') || '';
            }
        } else {
            // For corporations
            if (rawName.includes('บริษัท') && rawName.includes('จำกัด')) {
                title = 'บริษัท';
                let mid = rawName.replace('บริษัท', '').replace('จำกัด', '').trim();
                if (rawName.includes('มหาชน')) {
                    mid = mid.replace('มหาชน', '').trim();
                    lastName = 'จำกัด (มหาชน)';
                } else {
                    lastName = 'จำกัด';
                }
                firstName = mid;
            } else if (rawName.includes('ห้างหุ้นส่วนจำกัด') || rawName.startsWith('หจก.')) {
                title = rawName.startsWith('หจก.') ? 'หจก.' : 'ห้างหุ้นส่วนจำกัด';
                firstName = rawName.replace(title, '').trim();
            } else if (rawName.includes('ห้างหุ้นส่วนสามัญ')) {
                title = 'ห้างหุ้นส่วนสามัญ';
                firstName = rawName.replace(title, '').trim();
            } else {
                firstName = rawName;
            }
        }

        // Date format: DD/MM/YYYY
        let dateStr = '';
        if (row.date) {
            const d = new Date(row.date);
            if (!isNaN(d)) {
                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                let year = d.getFullYear(); 
                dateStr = `${day}/${month}/${year}`;
            }
        }

        const rate = parseFloat(row.whtRate) || 0;
        const base = parseFloat(row.baseAmount) || 0;
        const tax = parseFloat(row.whtAmount) || 0;
        const condition = '1';

        // standard 14 fields for RDPrep
        const fields = [
            '', // 0: No.
            '', // 1: Blank for individual TaxID if citizen ID used
            taxId, // 2: CitizenID or TaxID (13 digits)
            '', // 3: Branch
            title, // 4: Prefix
            firstName, // 5: First name
            lastName, // 6: Last name
            '', // 7: Branch Name/Address
            dateStr, // 8: Date
            row.description || '', // 9: Description
            rate.toString(), // 10: Rate
            base.toFixed(2), // 11: Base
            tax.toFixed(2), // 12: Tax
            condition // 13: Condition
        ];

        txtContent += fields.join('|') + '\r\n';
    });

    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${pndTypeStr}_rdprep_${start}_${end}.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
