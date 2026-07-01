import re

with open('server.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the wrong do_PUT implementation
wrong_put = """    def do_PUT(self):
        parsed_url = urlparse(self.path)
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else ""
        self.router.handle_request(self, 'PUT', parsed_url, body)"""

correct_put = """    def do_PUT(self):
        import urllib.parse
        parsed_url = urllib.parse.urlparse(self.path)
        if parsed_url.path.startswith('/api/'):
            content_length = int(self.headers.get('Content-Length', 0))
            body_data = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else ''
            handled = api_router.handle_request(self, 'PUT', parsed_url, body_data)
            if not handled:
                self.send_error(404, "API endpoint not found")
        else:
            self.send_error(403, "PUT not allowed for static files")"""

content = content.replace(wrong_put, correct_put)

with open('server.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed do_PUT in server.py!")
