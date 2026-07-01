import io
import re

with io.open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Replace the select account group
old_select = '''                                <div class="form-group" style="flex: 1.5; margin-bottom: 0;">
                                    <label>เลือกบัญชี</label>
                                    <select class="form-control" id="ledger-account-select">
                                        <!-- Loaded dynamically -->
                                    </select>
                                </div>'''
new_select = '''                                <div class="form-group" style="flex: 1; margin-bottom: 0;">
                                    <label>จากบัญชี</label>
                                    <select class="form-control" id="ledger-account-start">
                                        <!-- Loaded dynamically -->
                                    </select>
                                </div>
                                <div class="form-group" style="flex: 1; margin-bottom: 0;">
                                    <label>ถึงบัญชี</label>
                                    <select class="form-control" id="ledger-account-end">
                                        <!-- Loaded dynamically -->
                                    </select>
                                </div>'''
html = html.replace(old_select, new_select)

# 2. Replace the ledger table container
old_table_block = '''                            <h3 class="card-title" id="ledger-card-title"><i class="fa-solid fa-list"></i> บัญชีแยกประเภท: เงินฝากธนาคาร (111200)</h3>
                            <div class="no-print" style="display: flex; gap: 8px;">
                                <button class="btn btn-secondary btn-sm btn-print-report" data-target="view-ledger"><i class="fa-solid fa-print"></i> พิมพ์ PDF</button>
                                <button class="btn btn-secondary btn-sm btn-export-csv" data-table="ledger-table" data-filename="general_ledger"><i class="fa-solid fa-file-csv"></i> ส่งออก CSV</button>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table-accounting" id="ledger-table">
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
                                        <!-- Dynamic rows -->
                                    </tbody>
                                </table>
                            </div>
                        </div>'''

new_table_block = '''                            <h3 class="card-title" id="ledger-card-title"><i class="fa-solid fa-list"></i> สมุดบัญชีแยกประเภท (General Ledger Report)</h3>
                            <div class="no-print" style="display: flex; gap: 8px;">
                                <button class="btn btn-secondary btn-sm btn-print-report" data-target="view-ledger"><i class="fa-solid fa-print"></i> พิมพ์ PDF</button>
                                <button class="btn btn-secondary btn-sm btn-export-csv" data-table="ledger-export-table" data-filename="general_ledger"><i class="fa-solid fa-file-csv"></i> ส่งออก CSV</button>
                            </div>
                        </div>
                        <div class="card-body">
                            <div id="ledger-results-container">
                                <!-- Dynamic tables populated here -->
                            </div>
                            
                            <!-- Hidden table for CSV export -->
                            <table id="ledger-export-table" style="display: none;">
                                <thead>
                                    <tr>
                                        <th>รหัสบัญชี</th>
                                        <th>ชื่อบัญชี</th>
                                        <th>วันที่</th>
                                        <th>เลขที่อ้างอิง</th>
                                        <th>คำอธิบายรายการ</th>
                                        <th>เดบิต (DR.)</th>
                                        <th>เครดิต (CR.)</th>
                                        <th>ยอดคงเหลือ (BALANCE)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <!-- Populated for export -->
                                </tbody>
                            </table>
                        </div>'''

# In case the title is different in the HTML
html = re.sub(r'<h3 class="card-title" id="ledger-card-title">.*?</div>\s*</div>', new_table_block + '\n                    </div>', html, flags=re.DOTALL)

with io.open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Patch HTML completed.")
