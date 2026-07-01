import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

settings_menu_idx = content.find('data-view="settings"')
if settings_menu_idx != -1:
    print("=== MENU ===")
    print(content[settings_menu_idx-200:settings_menu_idx+200])

settings_sec_idx = content.find('id="view-settings"')
if settings_sec_idx != -1:
    print("=== SECTION ===")
    print(content[settings_sec_idx-100:settings_sec_idx+100])
