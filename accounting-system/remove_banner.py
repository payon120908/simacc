import re

# 1. Update index.html
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Use regex to find and remove the div with id="local-warning-banner"
# It starts with <div id="local-warning-banner" and ends before <div class="dashboard-stats">
# Or we can just find it exactly
banner_regex = r'<div id="local-warning-banner" class="local-warning-banner" style="display: none;">[\s\S]*?</div>\s*(?=<(div|!--))'
# To be safe, just remove it based on a known block
html = re.sub(
    r'<div id="local-warning-banner".*?<div class="banner-actions">.*?</div>\s*</div>',
    '',
    html,
    flags=re.DOTALL
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)


# 2. Update app.js
with open('js/app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Make showLocalWarningBannerIfNeeded do nothing
js = re.sub(
    r'export function showLocalWarningBannerIfNeeded\(\) \{[\s\S]*?\n\}',
    'export function showLocalWarningBannerIfNeeded() {\n    return;\n}',
    js
)

with open('js/app.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Banner removed successfully!")
