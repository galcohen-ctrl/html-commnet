export const DEFAULT_COMMENT_CONFIG = Object.freeze({
  repository: 'galcohen-ctrl/html-commnet',
  page: 'app-builder-vision',
  project: 'app-builder-vision',
  dataBranch: 'data',
  assetDirectory: 'comment-assets/app-builder-vision',
});

export function getCommentMode(search = window.location.search) {
  return new URLSearchParams(search).get('mode') === 'local' ? 'local' : 'github';
}

export function resolveCommentConfig(overrides = {}) {
  return { ...DEFAULT_COMMENT_CONFIG, ...overrides };
}
