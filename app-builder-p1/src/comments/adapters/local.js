import { fileToBase64, readJsonResponse } from '../utils.js';

const API_ROOT = '/api/local-comments';

function localImageUrl(url = '') {
  if (url.startsWith('/api/local-comments/assets/')) return url;
  if (url.startsWith('/local-comments/assets/')) {
    return `/api/local-comments/assets/${url.split('/').pop()}`;
  }
  if (url.startsWith('local-comments/assets/')) {
    return `/api/local-comments/assets/${url.split('/').pop()}`;
  }
  return url;
}

function normalizeLocalComment(meta, page) {
  return {
    id: meta.id,
    issueNumber: null,
    issueUrl: null,
    title: `[${page.toUpperCase()}] ${(meta.comment || '').slice(0, 72)}`,
    name: meta.name || 'Reviewer',
    text: meta.comment || '',
    screen: meta.screen || 'unknown',
    target: meta.target || {},
    images: (meta.images || []).map((image) => ({
      ...image,
      url: localImageUrl(image.url || image.path),
    })),
    createdAt: meta.createdAt,
    local: true,
  };
}

async function requestJson(path, options, label) {
  const response = await fetch(path, options);
  return readJsonResponse(response, label);
}

export function createLocalCommentsAdapter(config) {
  return {
    mode: 'local',
    async load() {
      const items = await requestJson(
        `${API_ROOT}?t=${Date.now()}`,
        undefined,
        'Local comment load failed (is local-comment-server.py running?)',
      );
      return (items || [])
        .map((item) => normalizeLocalComment(item, config.page))
        .reverse();
    },
    async save(meta, pendingImages) {
      const saved = await requestJson(
        API_ROOT,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...meta, images: [] }),
        },
        'Local save failed',
      );
      saved.images = await Promise.all(
        pendingImages.map(async ({ file }, index) => {
          const type = file.type || 'image/png';
          return requestJson(
            `${API_ROOT}/${encodeURIComponent(saved.id)}/image`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type,
                contentBase64: await fileToBase64(file),
                index: index + 1,
                name: file.name || `screenshot-${index + 1}`,
              }),
            },
            'Local screenshot upload failed',
          );
        }),
      );
      return normalizeLocalComment(saved, config.page);
    },
    async resolve(comment) {
      await requestJson(
        `${API_ROOT}/${encodeURIComponent(comment.id)}`,
        { method: 'DELETE' },
        'Could not resolve local comment',
      );
    },
  };
}
