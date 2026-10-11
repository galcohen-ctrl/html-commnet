export const DEFAULT_COMMENT_CONFIG = Object.freeze({
  repository: 'galcohen-ctrl/html-commnet',
  page: 'app-builder-p1',
  project: 'app-builder-p1',
  dataBranch: 'data',
  assetDirectory: 'comment-assets/app-builder-p1',
  // Google Apps Script relay (comment-relay/Code.gs in the html-commnet repo).
  // When set, reviewers only enter a name or email; the relay holds the token.
  // Empty: reviewers paste their own GitHub token, as before.
  relayUrl: '',
});

export function getCommentMode(search = window.location.search) {
  return new URLSearchParams(search).get('mode') === 'local' ? 'local' : 'github';
}

export function resolveCommentConfig(overrides = {}) {
  return { ...DEFAULT_COMMENT_CONFIG, ...overrides };
}
