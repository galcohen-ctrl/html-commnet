#!/usr/bin/env python3
"""Local dev server for the AI Games review prototype.

Serves the static prototype files exactly like `python3 -m http.server`, plus a
tiny write API used only by the frontend's `?mode=local` comment overlay so
local-iteration comments and screenshots are stored on disk instead of
localStorage/base64:

  POST   /api/local-comments             create a comment, returns it with an id
  POST   /api/local-comments/<id>/image  save one screenshot for a comment
  DELETE /api/local-comments/<id>        remove a comment (resolved/fixed)
  GET    /api/local-comments             (falls through to static file serving of
                                          local-comments/comments.json)
  POST   /api/game-theme                 patch {content.title, meta.pageTitle,
                                          gameplay.scoreTarget} in a real game's
                                          theme.json (path restricted to
                                          games/<slug>/theme.json), so editing a
                                          game card in the merchant config keeps the
                                          live embedded game in sync

Data lives in this folder under local-comments/ (comments.json + assets/), so it
can be read directly from disk (no localStorage, no GitHub calls, no tokens).

The games/ path served here is a symlink to the standalone game bundles at
~/Documents/very----shit-projects/ai-games-copy-for-html-demo/vapiano-games — kept
outside this repo so it isn't duplicated or accidentally pushed to GitHub Pages.
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
GAMES_ROOT = os.path.realpath(os.path.join(ROOT, 'games'))

EXT_MAP = {'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif'}


def _resolve_theme_path(rel):
    """Resolve a themeUrl like 'games/snake/theme.json' to an absolute path,
    rejecting anything that isn't a theme.json strictly inside games/ (blocks
    path traversal via '..' segments or absolute paths)."""
    if not rel or not isinstance(rel, str):
        return None, 'Missing themeUrl'
    if not rel.startswith('games/') or not rel.endswith('/theme.json'):
        return None, 'themeUrl must point to a theme.json under games/'
    candidate = os.path.realpath(os.path.join(ROOT, rel))
    if candidate != GAMES_ROOT and not candidate.startswith(GAMES_ROOT + os.sep):
        return None, 'themeUrl escapes the games/ directory'
    if os.path.basename(candidate) != 'theme.json':
        return None, 'themeUrl must reference a theme.json file'
    return candidate, None


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

        if parsed.path == '/api/game-theme':
            body = self._read_body()
            theme_path, error = _resolve_theme_path(body.get('themeUrl'))
            if error:
                self._json(400, {'error': error})
                return
            try:
                with open(theme_path, encoding='utf-8') as f:
                    theme = json.load(f)
            except (OSError, json.JSONDecodeError) as e:
                self._json(404, {'error': f'Could not read theme file: {e}'})
                return
            title = body.get('title')
            if title:
                theme.setdefault('content', {})['title'] = title
                brand = theme.get('meta', {}).get('brand', '')
                theme.setdefault('meta', {})['pageTitle'] = f'{title} | {brand}' if brand else title
            score_target = body.get('scoreTarget')
            if isinstance(score_target, (int, float)) and score_target > 0:
                theme.setdefault('gameplay', {})['scoreTarget'] = int(score_target)
            with open(theme_path, 'w', encoding='utf-8') as f:
                json.dump(theme, f, indent=2, ensure_ascii=False)
            self._json(200, {'ok': True, 'themeUrl': body.get('themeUrl')})
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
            rel_url = f'local-comments/assets/{filename}'
            image = {
                'path': rel_url,
                'url': rel_url,
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
    port = int(os.environ.get('PORT', '8790'))
    os.chdir(ROOT)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(('127.0.0.1', port), Handler) as httpd:
        print(f'Serving {ROOT} at http://127.0.0.1:{port}')
        print('Local-mode comments -> local-comments/comments.json + local-comments/assets/')
        httpd.serve_forever()
