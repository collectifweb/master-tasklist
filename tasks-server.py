#!/usr/bin/env python3
"""
tasks-server.py — Serveur local de la page des tâches.

Durcissements par rapport à la version publiée :
- écoute sur 127.0.0.1 par défaut (TASKS_BIND pour changer);
- POST /tasks.json exige « Authorization: Bearer <TASKS_WRITE_TOKEN> »
  (refus total si la variable n'est pas définie);
- corps limité (TASKS_MAX_BYTES, 256 Kio par défaut) et schéma minimal validé;
- seuls quelques chemins sont servis (pas de listing, pas de .git, pas de scripts).
"""
import hmac
import http.server
import json
import os
import socketserver

PORT = int(os.environ.get("TASKS_PORT", "8767"))
BIND = os.environ.get("TASKS_BIND", "127.0.0.1")
WRITE_TOKEN = os.environ.get("TASKS_WRITE_TOKEN", "")
MAX_BYTES = int(os.environ.get("TASKS_MAX_BYTES", str(256 * 1024)))
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
TASKS_FILE = os.path.join(DIRECTORY, "tasks.json")

ALLOWED_FILES = {"/", "/index.html", "/tasks.json"}
ALLOWED_PREFIXES = ("/sketches/",)
REQUIRED_KEYS = {"id", "task", "status"}


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
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def list_directory(self, path):  # pas de listing de dossiers
        self.send_error(404, "Not found")
        return None

    def _path_allowed(self):
        path = self.path.split("?", 1)[0]
        if ".." in path or "/." in path:
            return False
        return path in ALLOWED_FILES or path.startswith(ALLOWED_PREFIXES)

    def do_GET(self):
        if not self._path_allowed():
            self.send_error(404, "Not found")
            return
        super().do_GET()

    def do_HEAD(self):
        if not self._path_allowed():
            self.send_error(404, "Not found")
            return
        super().do_HEAD()

    def _authorized(self):
        if not WRITE_TOKEN:
            return False
        header = self.headers.get("Authorization", "")
        expected = "Bearer " + WRITE_TOKEN
        return hmac.compare_digest(header.encode(), expected.encode())

    def do_POST(self):
        if self.path.split("?", 1)[0] != "/tasks.json":
            self.send_error(404, "Not found")
            return
        if not self._authorized():
            self._send_json(401, {"error": "Unauthorized"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self._send_json(400, {"error": "Invalid Content-Length"})
            return
        if length <= 0 or length > MAX_BYTES:
            self._send_json(413, {"error": "Payload too large or empty"})
            return
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self._send_json(400, {"error": "Invalid JSON payload"})
            return
        if not isinstance(payload, list) or not all(
            isinstance(t, dict) and REQUIRED_KEYS <= t.keys() for t in payload
        ):
            self._send_json(400, {"error": "Payload must be an array of tasks"})
            return
        temp_file = TASKS_FILE + ".tmp"
        with open(temp_file, "w", encoding="utf-8") as fh:
            json.dump(payload, fh, ensure_ascii=False, indent=2)
            fh.write("\n")
        os.replace(temp_file, TASKS_FILE)
        self._send_json(200, {"ok": True, "count": len(payload)})

    def log_message(self, format, *args):
        pass


if __name__ == "__main__":
    if not WRITE_TOKEN:
        print("TASKS_WRITE_TOKEN absent : écriture désactivée (lecture seule).")
    with socketserver.ThreadingTCPServer((BIND, PORT), Handler) as httpd:
        print(f"Serveur des tâches sur http://{BIND}:{PORT}")
        httpd.serve_forever()
