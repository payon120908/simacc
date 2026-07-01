import re

with open('server.py', 'r', encoding='utf-8') as f:
    content = f.read()

correct_put = """
    def do_PUT(self):
        import urllib.parse
        parsed_url = urllib.parse.urlparse(self.path)
        if parsed_url.path.startswith('/api/'):
            content_length = int(self.headers.get('Content-Length', 0))
            body_data = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else ''
            handled = api_router.handle_request(self, 'PUT', parsed_url, body_data)
            if not handled:
                self.send_error(404, "API endpoint not found")
        else:
            self.send_error(403, "PUT not allowed for static files")
"""

# Find do_POST block and insert do_PUT after it.
if "def do_PUT(self):" not in content:
    # Just append it before `def do_DELETE(self):` or at the end of CustomHTTPRequestHandler
    content = content.replace("def do_DELETE(self):", correct_put + "\n    def do_DELETE(self):")
    
    with open('server.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS: Added do_PUT")
else:
    print("do_PUT already exists")
