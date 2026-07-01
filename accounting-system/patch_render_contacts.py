import re

with open('js/app.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_code = '''async function renderContactsView() {
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
'''

# Replace lines 5796 to 5963 (0-indexed 5795 to 5962)
del lines[5796:5963]
lines.insert(5796, new_code)

with open('js/app.js', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Replaced renderContactsView successfully!")
