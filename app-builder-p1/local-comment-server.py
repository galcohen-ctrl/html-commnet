#!/usr/bin/env python3
"""Local dev server for the App Builder P1 GitHub Pages review prototype.

Serves the static prototype files exactly like `python3 -m http.server`, plus
a tiny write API used only by the frontend's `?mode=local` comment overlay
so local-iteration comments and screenshots are stored on disk instead of
GitHub Issues/tokens:

  POST   /api/local-comments             create a comment, returns it with an id
  POST   /api/local-comments/<id>/image  save one screenshot for a comment
  DELETE /api/local-comments/<id>        remove a comment (resolved/fixed)
  GET    /api/local-comments             (falls through to static file serving
                                           of local-comments/comments.json)

Data lives in this folder under local-comments/ (comments.json + assets/), so
it can be read directly from disk (no localStorage, no GitHub calls, no tokens).

Run: python3 local-comment-server.py  -> http://127.0.0.1:8791/index.html?mode=local
"""
import base64
import json
import os
import re
import socketserver
import time
import urllib.parse
from http.server import SimpleHTTPRequestHandler

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(ROOT, 'local-comments')
ASSETS_DIR = os.path.join(DATA_DIR, 'assets')
COMMENTS_FILE = os.path.join(DATA_DIR, 'comments.json')

EXT_MAP = {'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif'}


def _ensure_dirs():
    os.makedirs(ASSETS_DIR, exist_ok=True)
    if not os.path.exists(COMMENTS_FILE):
        with open(COMMENTS_FILE, 'w', encoding='utf-8') as f:
            json.dump([], f)


def _read_comments():
    _ensure_dirs()
    with open(COMMENTS_FILE, encoding='utf-8') as f:
        return json.load(f)


def _write_comments(items):
    with open(COMMENTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(items, f, indent=2, ensure_ascii=False)


class Handler(SimpleHTTPRequestHandler):
    def _json(self, code, payload):
        body = json.dumps(payload).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_body(self):
        length = int(self.headers.get('Content-Length', 0) or 0)
        raw = self.rfile.read(length) if length else b'{}'
        return json.loads(raw or b'{}')

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)

        if parsed.path == '/api/local-comments':
            meta = self._read_body()
            meta['id'] = 'local-' + str(int(time.time() * 1000))
            meta.setdefault('images', [])
            items = _read_comments()
            items.append(meta)
            _write_comments(items)
            self._json(200, meta)
            return

        m = re.match(r'^/api/local-comments/([^/]+)/image$', parsed.path)
        if m:
            cid = m.group(1)
            body = self._read_body()
            content_type = body.get('type', 'image/png')
            ext = EXT_MAP.get(content_type, 'png')
            index = body.get('index', 1)
            filename = f'{cid}-{index}.{ext}'
            _ensure_dirs()
            with open(os.path.join(ASSETS_DIR, filename), 'wb') as f:
                f.write(base64.b64decode(body.get('contentBase64', '')))
            image = {
                'path': f'local-comments/assets/{filename}',
                'url': f'local-comments/assets/{filename}',
                'name': body.get('name') or filename,
                'type': content_type,
            }
            items = _read_comments()
            for it in items:
                if it.get('id') == cid:
                    it.setdefault('images', []).append(image)
            _write_comments(items)
            self._json(200, image)
            return

        self.send_error(404)

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        m = re.match(r'^/api/local-comments/([^/]+)$', parsed.path)
        if m:
            cid = m.group(1)
            items = [it for it in _read_comments() if it.get('id') != cid]
            _write_comments(items)
            self._json(200, {'ok': True})
            return
        self.send_error(404)


if __name__ == '__main__':
    _ensure_dirs()
    port = int(os.environ.get('PORT', '8791'))
    os.chdir(ROOT)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(('127.0.0.1', port), Handler) as httpd:
        print(f'Serving {ROOT} at http://127.0.0.1:{port}')
        print('Local-mode comments -> local-comments/comments.json + local-comments/assets/')
        httpd.serve_forever()
