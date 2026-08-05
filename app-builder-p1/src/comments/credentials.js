const TOKEN_KEY = 'hc_tok';
const NAME_KEY = 'hc_name';

export function getGithubToken() {
  return window.localStorage.getItem(TOKEN_KEY) || '';
}

export function setGithubToken(token) {
  window.localStorage.setItem(TOKEN_KEY, token.trim());
}

export function clearGithubToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export function getReviewerName() {
  return window.localStorage.getItem(NAME_KEY) || 'Reviewer';
}

export function setReviewerName(name) {
  const trimmedName = name.trim();
  if (trimmedName) window.localStorage.setItem(NAME_KEY, trimmedName);
}
