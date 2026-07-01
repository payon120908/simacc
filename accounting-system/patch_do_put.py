import re

with open('server.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Add do_PUT
put_method = """    def do_PUT(self):
        parsed_url = urlparse(self.path)
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else ""
        self.router.handle_request(self, 'PUT', parsed_url, body)
"""

if "def do_PUT(self):" not in content:
    content = re.sub(
        r'(def do_POST\(self\):[\s\S]*?self\.router\.handle_request\(self, \'POST\', parsed_url, body\))',
        r'\1\n\n' + put_method,
        content
    )

# Also update Access-Control-Allow-Methods in handle_request
content = content.replace(
    "handler.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')",
    "handler.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')"
)

with open('server.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("Added do_PUT to server.py!")
