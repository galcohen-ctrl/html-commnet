/**
 * html-commnet comment relay (Google Apps Script web app).
 *
 * Lets reviewers leave prototype comments with only their name or email.
 * The GitHub token lives in Script Properties (GITHUB_TOKEN) and never reaches
 * the browser. The page POSTs { meta, images } here; this script validates it,
 * builds the issue itself, and returns the created issue.
 *
 * Deploy: Deploy > New deployment > Web app, Execute as: Me,
 *         Who has access: Anyone. Put the /exec URL in src/comments/config.js
 *         (relayUrl) of each prototype.
 */

const REPOSITORY = 'galcohen-ctrl/html-commnet';
const DATA_BRANCH = 'data';
// Only these prototypes may post. Key = page/project in src/comments/config.js.
const ALLOWED_PAGES = ['app-builder-p1', 'app-builder-vision'];

const LIMITS = {
  name: 80,
  comment: 3000,
  screen: 60,
  selector: 600,
  anchor: 80,
  context: 120,
  images: 3,
  imageBytes: 5 * 1024 * 1024,
  // Rate caps per 10-minute window.
  perWindow: 40,
  perNamePerWindow: 15,
};
const IMAGE_TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };

function doGet() {
  return json_({ ok: true, service: 'html-commnet comment relay', pages: ALLOWED_PAGES });
}

function doPost(e) {
  try {
    const request = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const meta = sanitizeMeta_(request.meta || {});
    const images = sanitizeImages_(request.images || []);
    rateLimit_(meta.name);

    const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
    if (!token) throw new Error('Comment relay is not configured yet.');

    let issue = github_('post', '/issues', {
      title: '[' + meta.page.toUpperCase() + '] ' + (meta.comment || 'Screenshot comment').slice(0, 72),
      body: issueBody_(meta),
      labels: ['web-comment', meta.page],
    }, token);

    if (images.length) {
      meta.issue = { number: issue.number, url: issue.html_url, title: issue.title };
      meta.images = images.map(function (image, index) {
        return uploadImage_(meta.page, 'issue-' + issue.number, image, index + 1, token);
      });
      issue = github_('patch', '/issues/' + issue.number, { body: issueBody_(meta) }, token);
    }

    return json_({
      ok: true,
      issue: { number: issue.number, html_url: issue.html_url, title: issue.title, body: issue.body, created_at: issue.created_at },
    });
  } catch (error) {
    return json_({ ok: false, error: String((error && error.message) || error) });
  }
}

/* ------------------------------------------------------------ validation */

function text_(value, max) {
  return String(value == null ? '' : value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
}

function num_(value, min, max) {
  const n = Number(value);
  if (!isFinite(n)) return 0;
  return Math.min(max, Math.max(min, n));
}

function sanitizeMeta_(raw) {
  const page = text_(raw.page, 60);
  if (ALLOWED_PAGES.indexOf(page) === -1) throw new Error('Unknown prototype.');
  const name = text_(raw.name, LIMITS.name).replace(/[\r\n<>]/g, ' ');
  if (!name || name === 'Reviewer') throw new Error('Please enter your name or email.');
  const comment = text_(raw.comment, LIMITS.comment);
  const target = raw.target || {};
  const viewport = raw.viewport || {};
  const docSize = raw.docSize || {};
  const meta = {
    version: 4,
    project: page,
    page: page,
    screen: text_(raw.screen, LIMITS.screen) || 'unknown',
    name: name,
    comment: comment,
    target: {
      selector: text_(target.selector, LIMITS.selector),
      context: text_(target.context, LIMITS.context),
      relativeX: num_(target.relativeX, 0, 1),
      relativeY: num_(target.relativeY, 0, 1),
      fallbackClientX: num_(target.fallbackClientX, 0, 20000),
      fallbackClientY: num_(target.fallbackClientY, 0, 20000),
    },
    images: [],
    viewport: { width: Math.round(num_(viewport.width, 0, 20000)), height: Math.round(num_(viewport.height, 0, 20000)) },
    docSize: { width: Math.round(num_(docSize.width, 0, 50000)), height: Math.round(num_(docSize.height, 0, 50000)) },
    createdAt: new Date().toISOString(),
    via: 'relay',
  };
  const anchor = text_(target.commentAnchor, LIMITS.anchor);
  if (anchor) meta.target.commentAnchor = anchor;
  return meta;
}

function sanitizeImages_(raw) {
  if (!Array.isArray(raw)) return [];
  if (raw.length > LIMITS.images) throw new Error('At most ' + LIMITS.images + ' screenshots per comment.');
  return raw.map(function (image) {
    const type = text_(image && image.type, 40);
    if (!IMAGE_TYPES[type]) throw new Error('Screenshots must be PNG, JPG, WEBP or GIF.');
    const data = String((image && image.data) || '').replace(/\s/g, '');
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(data)) throw new Error('Screenshot data is invalid.');
    if (data.length * 0.75 > LIMITS.imageBytes) throw new Error('Each screenshot must be under 5 MB.');
    return { type: type, data: data, name: text_(image.name, 120) };
  });
}

function rateLimit_(name) {
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    const cache = CacheService.getScriptCache();
    const windowKey = 'w' + Math.floor(Date.now() / 600000);
    const nameKey = windowKey + ':' + Utilities.base64EncodeWebSafe(name.toLowerCase()).slice(0, 200);
    const total = Number(cache.get(windowKey) || 0);
    const byName = Number(cache.get(nameKey) || 0);
    if (total >= LIMITS.perWindow || byName >= LIMITS.perNamePerWindow) {
      throw new Error('Too many comments right now. Please try again in a few minutes.');
    }
    cache.put(windowKey, String(total + 1), 900);
    cache.put(nameKey, String(byName + 1), 900);
  } finally {
    lock.releaseLock();
  }
}

/* ---------------------------------------------------------- issue format */

// Same shape as the browser adapter's issueBody(), so pins load identically.
function issueBody_(meta) {
  // Escape < and > inside the JSON so a comment can never close the HTML
  // comment early; JSON.parse turns \u003c back into "<".
  const json = JSON.stringify(meta, null, 2).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
  const t = meta.target;
  // Break @mentions so a visitor cannot ping GitHub users through the relay.
  const safe = function (value) { return String(value || '').replace(/@/g, '@\u200b'); };
  let body = '<!-- hc:comment\n' + json + '\n-->\n';
  body += '**Page**: ' + meta.page + '\n';
  body += '**Screen**: ' + safe(meta.screen) + '\n';
  body += '**Name**: ' + safe(meta.name) + '\n';
  body += '**Comment**: ' + safe(meta.comment) + '\n';
  body += '**Element**: ' + safe(t.selector) + '\n';
  body += '**Context**: ' + safe(t.context) + '\n';
  body += '**Anchor**: selector=' + safe(t.selector).replace(/\n/g, ' ') + ', rx=' + t.relativeX + ', ry=' + t.relativeY + '\n';
  body += '**Fallback**: x=' + Math.round(t.fallbackClientX) + ', y=' + Math.round(t.fallbackClientY) + '\n';
  body += '**Viewport**: ' + meta.viewport.width + 'x' + meta.viewport.height + '\n';
  body += '**DocSize**: ' + meta.docSize.width + 'x' + meta.docSize.height + '\n';
  if (meta.images && meta.images.length) {
    body += '\n**Screenshots**:\n';
    meta.images.forEach(function (image, index) { body += '- [Screenshot ' + (index + 1) + '](' + image.url + ')\n'; });
    body += '\n';
    meta.images.forEach(function (image, index) { body += '![Screenshot ' + (index + 1) + '](' + image.url + ')\n'; });
  }
  return body;
}

/* ---------------------------------------------------------------- GitHub */

function uploadImage_(page, commentId, image, index, token) {
  const extension = IMAGE_TYPES[image.type];
  const path = 'comment-assets/' + page + '/' + commentId + '-' + index + '.' + extension;
  github_('put', '/contents/' + path, {
    message: 'docs: add ' + page + ' comment screenshot ' + commentId + '-' + index,
    content: image.data,
    branch: DATA_BRANCH,
  }, token);
  return {
    path: path,
    url: 'https://raw.githubusercontent.com/' + REPOSITORY + '/' + DATA_BRANCH + '/' + path,
    name: image.name || ('screenshot-' + index + '.' + extension),
    type: image.type,
  };
}

function github_(method, path, payload, token) {
  const response = UrlFetchApp.fetch('https://api.github.com/repos/' + REPOSITORY + path, {
    method: method,
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    muteHttpExceptions: true,
  });
  const code = response.getResponseCode();
  const body = JSON.parse(response.getContentText() || '{}');
  if (code < 200 || code >= 300) {
    throw new Error('GitHub ' + method.toUpperCase() + ' ' + path.split('/')[1] + ' failed (' + code + '): ' + (body.message || 'error'));
  }
  return body;
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
