#!/usr/bin/env python3
"""
Simple HTTP server with proper MIME types for WASM files.
Run with: python server.py
"""
import http.server
import socketserver
import os

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Set proper MIME type for WASM files
        if self.path.endswith('.wasm'):
            self.send_header('Content-Type', 'application/wasm')
        # Enable CORS for local development
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def log_message(self, format, *args):
        # Log all requests for debugging
        print(f"[{self.log_date_time_string()}] {format % args}")

PORT = 8000

# Check if port is already in use
import socket
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
result = sock.connect_ex(('127.0.0.1', PORT))
sock.close()

if result == 0:
    print(f"ERROR: Port {PORT} is already in use!")
    print("Please stop any existing servers on port 8000 and try again.")
    print("\nTo find and kill processes using port 8000:")
    print("  Windows: netstat -ano | findstr :8000")
    print("  Then: taskkill /PID <PID> /F")
    exit(1)

with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
    print(f"Server starting on http://localhost:{PORT}/")
    print("Press Ctrl+C to stop the server")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")

