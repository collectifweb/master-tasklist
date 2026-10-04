#!/usr/bin/env python3
"""
tasks-server.py — Servir la page des tâches familiales sur port 8767
"""
import os
import json
import http.server
import socketserver

PORT = 8767
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
TASKS_FILE = os.path.join(DIRECTORY, "tasks.json")

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def _send_json(self, status_code, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_POST(self):
        if self.path != "/tasks.json":
            self.send_error(404, "Not found")
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self._send_json(400, {"error": "Invalid Content-Length"})
            return

        try:
            raw_body = self.rfile.read(length)
            payload = json.loads(raw_body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self._send_json(400, {"error": "Invalid JSON payload"})
            return

        if not isinstance(payload, list):
            self._send_json(400, {"error": "Payload must be an array of tasks"})
            return

        temp_file = TASKS_FILE + ".tmp"
        with open(temp_file, "w", encoding="utf-8") as fh:
            json.dump(payload, fh, ensure_ascii=False, indent=2)
            fh.write("\n")
        os.replace(temp_file, TASKS_FILE)
        self._send_json(200, {"ok": True, "count": len(payload)})

    def log_message(self, format, *args):
        pass  # Supprime les logs access

with socketserver.ThreadingTCPServer(("", PORT), Handler) as httpd:
    print(f"✅ Tâches familiale server running on http://localhost:{PORT}")
    httpd.serve_forever()
