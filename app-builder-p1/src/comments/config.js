export const DEFAULT_COMMENT_CONFIG = Object.freeze({
  repository: 'galcohen-ctrl/html-commnet',
  page: 'app-builder-p1',
  project: 'app-builder-p1',
  dataBranch: 'data',
  assetDirectory: 'comment-assets/app-builder-p1',
});

export function getCommentMode(search = window.location.search) {
  return new URLSearchParams(search).get('mode') === 'local' ? 'local' : 'github';
}

export function resolveCommentConfig(overrides = {}) {
  return { ...DEFAULT_COMMENT_CONFIG, ...overrides };
}
