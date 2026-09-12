#!/usr/bin/env python3
import http.server, socketserver, os, sys
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
ROOT = os.path.dirname(os.path.abspath(__file__))
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()
with socketserver.TCPServer(("0.0.0.0", PORT), Handler) as httpd:
    print(f"Serving MT Exam on http://localhost:{PORT}")
    httpd.serve_forever()
