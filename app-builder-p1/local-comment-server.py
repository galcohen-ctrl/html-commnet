#!/usr/bin/env python3
"""Local dev server for the App Builder P1 GitHub Pages review prototype.

Serves the static prototype files exactly like `python3 -m http.server`, plus
a tiny write API used only by the frontend's `?mode=local` comment overlay
so local-iteration comments and screenshots are stored on disk instead of
GitHub Issues/tokens:

  POST   /api/local-comments             create a comment, returns it with an id
  POST   /api/local-comments/<id>/image  save one screenshot for a comment
  DELETE /api/local-comments/<id>        remove a comment (resolved/fixed)
  GET    /api/local-comments             list comments
  GET    /api/local-comments/assets/...  serve a stored screenshot

Data lives in this folder under local-comments/ (comments.json + assets/), so
it can be read directly from disk (no localStorage, no GitHub calls, no tokens).

If dist/index.html exists, the production Vite build is served. Otherwise the
source directory is served for backwards compatibility.

Run: python3 local-comment-server.py
Open: http://127.0.0.1:8791/html-commnet/app-builder-p1/?mode=local
"""
import base64
import binascii
import json
import mimetypes
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
DIST_DIR = os.path.join(ROOT, 'dist')
STATIC_DIR = DIST_DIR if os.path.isfile(os.path.join(DIST_DIR, 'index.html')) else ROOT
PUBLIC_BASE = os.environ.get(
    'PUBLIC_BASE', '/html-commnet/app-builder-p1'
).rstrip('/')

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
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

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

    def translate_path(self, path):
        """Keep legacy local-comment URLs available while serving dist/."""
        parsed_path = urllib.parse.urlparse(path).path
        if parsed_path.startswith('/local-comments/'):
            relative_path = os.path.normpath(
                urllib.parse.unquote(parsed_path).lstrip('/')
            )
            if relative_path == 'local-comments' or relative_path.startswith(
                'local-comments' + os.sep
            ):
                return os.path.join(ROOT, relative_path)
        if STATIC_DIR == DIST_DIR and (
            parsed_path == PUBLIC_BASE or parsed_path.startswith(PUBLIC_BASE + '/')
        ):
            unprefixed_path = parsed_path[len(PUBLIC_BASE):] or '/'
            return super().translate_path(unprefixed_path)
        return super().translate_path(path)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/local-comments':
            self._json(200, _read_comments())
            return

        match = re.match(r'^/api/local-comments/assets/([^/]+)$', parsed.path)
        if match:
            filename = urllib.parse.unquote(match.group(1))
            if filename != os.path.basename(filename):
                self.send_error(400)
                return
            asset_path = os.path.join(ASSETS_DIR, filename)
            if not os.path.isfile(asset_path):
                self.send_error(404)
                return
            with open(asset_path, 'rb') as asset_file:
                payload = asset_file.read()
            self.send_response(200)
            self.send_header(
                'Content-Type', mimetypes.guess_type(filename)[0] or 'application/octet-stream'
            )
            self.send_header('Content-Length', str(len(payload)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(payload)
            return

        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)

        if parsed.path == '/api/local-comments':
            try:
                meta = self._read_body()
            except (json.JSONDecodeError, UnicodeDecodeError):
                self._json(400, {'message': 'Invalid JSON body'})
                return
            meta['id'] = 'local-' + str(time.time_ns())
            meta.setdefault('images', [])
            items = _read_comments()
            items.append(meta)
            _write_comments(items)
            self._json(200, meta)
            return

        m = re.match(r'^/api/local-comments/([^/]+)/image$', parsed.path)
        if m:
            cid = urllib.parse.unquote(m.group(1))
            try:
                body = self._read_body()
            except (json.JSONDecodeError, UnicodeDecodeError):
                self._json(400, {'message': 'Invalid JSON body'})
                return
            if not any(item.get('id') == cid for item in _read_comments()):
                self._json(404, {'message': 'Comment not found'})
                return
            content_type = body.get('type', 'image/png')
            ext = EXT_MAP.get(content_type, 'png')
            try:
                index = max(1, int(body.get('index', 1)))
                image_bytes = base64.b64decode(
                    body.get('contentBase64', ''), validate=True
                )
            except (TypeError, ValueError, binascii.Error):
                self._json(400, {'message': 'Invalid screenshot payload'})
                return
            filename = f'{cid}-{index}.{ext}'
            _ensure_dirs()
            with open(os.path.join(ASSETS_DIR, filename), 'wb') as f:
                f.write(image_bytes)
            image = {
                'path': f'local-comments/assets/{filename}',
                'url': f'/api/local-comments/assets/{filename}',
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
            cid = urllib.parse.unquote(m.group(1))
            existing_items = _read_comments()
            removed_items = [it for it in existing_items if it.get('id') == cid]
            items = [it for it in existing_items if it.get('id') != cid]
            _write_comments(items)
            for item in removed_items:
                for image in item.get('images', []):
                    filename = os.path.basename(image.get('path', ''))
                    if not filename.startswith(cid + '-'):
                        continue
                    asset_path = os.path.join(ASSETS_DIR, filename)
                    if os.path.isfile(asset_path):
                        os.remove(asset_path)
            self._json(200, {'ok': True})
            return
        self.send_error(404)


if __name__ == '__main__':
    _ensure_dirs()
    port = int(os.environ.get('PORT', '8791'))
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(('127.0.0.1', port), Handler) as httpd:
        print(f'Serving {STATIC_DIR} at http://127.0.0.1:{port}')
        print('Local-mode comments -> local-comments/comments.json + local-comments/assets/')
        httpd.serve_forever()
