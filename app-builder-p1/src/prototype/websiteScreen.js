export function websiteUrl(value) {
  try {
    const url = new URL(value);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.username || url.password || (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))) return null;
    return url.href;
  } catch { return null; }
}

export function renderWebsiteScreen(page, state, member = document.body.dataset.memberPreview) {
  page.classList.add('website-app-page');
  page.dataset.showNav = String(state.bottombar !== false);
  page.replaceChildren();
  const bar = document.createElement('div');
  bar.className = 'member-website-bar';
  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'px-phone-back';
  back.setAttribute('aria-label', 'Back to app');
  back.dataset.memberPage = state.returnPage || 'home';
  back.textContent = '\u2039';
  back.hidden = state.back === false;
  const title = document.createElement('strong');
  title.textContent = state.name || 'Your web page';
  bar.append(back, title);
  page.appendChild(bar);
  if (state.membersonly && member === 'guest') {
    const gate = document.createElement('div');
    gate.className = 'member-website-empty';
    gate.innerHTML = '<h2>Sign in to continue</h2><button class="member-primary-action" type="button" data-member-page="login">Sign in</button>';
    page.appendChild(gate);
    return;
  }
  const url = state.connected && websiteUrl(state.url);
  if (!url) {
    const empty = document.createElement('div');
    empty.className = 'member-website-empty';
    empty.textContent = 'Your web page will appear here.';
    page.appendChild(empty);
    return;
  }
  const frame = document.createElement('iframe');
  frame.className = 'member-website-frame';
  frame.title = state.name || 'Your web page';
  frame.loading = 'lazy';
  frame.src = url;
  frame.referrerPolicy = 'no-referrer';
  frame.setAttribute('sandbox', 'allow-scripts allow-forms allow-same-origin allow-popups');
  const fallback = document.createElement('a');
  fallback.className = 'member-website-external';
  fallback.href = url;
  fallback.target = '_blank';
  fallback.rel = 'noopener noreferrer';
  fallback.textContent = 'Open website';
  fallback.title = 'Open the website if its in-app preview is blocked';
  page.append(frame, fallback);
}

export function openWebsitePreview(value, options = {}, navigate = (key) => window.showPhonePage?.(key), returnPage = 'home') {
  const url = websiteUrl(value);
  if (!url) return false;
  let page = document.querySelector('.app-page[data-page="website-link"]');
  if (!page) {
    page = document.createElement('div'); page.className = 'app-page'; page.dataset.page = 'website-link';
    document.getElementById('app-shell').appendChild(page);
  }
  renderWebsiteScreen(page, { ...options, url, connected: true, name: new URL(url).hostname, returnPage });
  navigate('website-link');
  return true;
}

export function createWebsiteEditor(ctx, { key, host, page, saved = {}, onChange = () => {} }) {
  const state = { url: '', connected: false, back: true, bottombar: true, membersonly: false, name: 'Your web page', ...saved };
  const source = document.querySelector('#cp-menu [data-ms="webview"]');
  const editor = source.cloneNode(true);
  editor.className = 'screen-website-editor';
  editor.removeAttribute('data-ms');
  editor.querySelectorAll('.ms-kicker, .ms-return, .ms-title, .ms-sub, .ms-hint, .ms-help').forEach((element) => element.remove());
  editor.querySelector('.ms-label').textContent = 'Website address';
  const ids = new Map();
  editor.querySelectorAll('[id]').forEach((element) => {
    ids.set(element.id, `${key}-${element.id}`);
    element.id = `${key}-${element.id}`;
  });
  editor.querySelectorAll('[for], [aria-describedby]').forEach((element) => {
    ['for', 'aria-describedby'].forEach((attribute) => {
      const value = element.getAttribute(attribute);
      if (value && ids.has(value)) element.setAttribute(attribute, ids.get(value));
    });
  });
  const field = editor.querySelector('input[type="url"]');
  const error = editor.querySelector('.gf-field-error');
  const connect = editor.querySelector('.ms-btn');
  const status = editor.querySelector('.ms-status');
  const options = editor.querySelector('[id$="ms-webview-display"]');
  field.value = state.url;
  field.placeholder = 'https://your-website.com';
  field.setAttribute('aria-label', 'Website address');
  connect.textContent = 'Load page';
  status.textContent = 'Page added';
  options.hidden = false;

  function render() {
    renderWebsiteScreen(page, state);
    connect.textContent = state.connected ? 'Reload page' : 'Load page';
    status.classList.toggle('hidden', !state.connected);
    onChange(state);
  }

  field.addEventListener('input', () => {
    state.url = field.value;
    state.connected = false;
    status.classList.add('hidden');
    connect.textContent = 'Load page';
    error.textContent = '';
    ctx.markDirty();
  });
  connect.addEventListener('click', () => {
    const value = websiteUrl(field.value.trim());
    if (!value) {
      error.textContent = 'Enter a full website address starting with https://.';
      field.setAttribute('aria-invalid', 'true');
      field.focus();
      return;
    }
    field.setAttribute('aria-invalid', 'false');
    error.textContent = '';
    state.url = value;
    state.connected = true;
    render();
    ctx.markDirty();
  });
  editor.querySelectorAll('[data-web-opt]').forEach((toggle) => {
    const option = toggle.dataset.webOpt;
    if (['inapp', 'hideheader'].includes(option)) {
      toggle.setAttribute('aria-disabled', 'true');
      toggle.closest('.ms-toggle-row').title = 'Requires support from your website; unavailable in this browser preview.';
      toggle.closest('.ms-toggle-row').classList.add('website-option-unavailable');
      toggle.setAttribute('role', 'switch');
      toggle.setAttribute('aria-checked', 'false');
      toggle.classList.remove('on');
      return;
    }
    toggle.classList.toggle('on', !!state[option]);
    toggle.setAttribute('role', 'switch');
    toggle.setAttribute('aria-label', toggle.closest('.ms-toggle-row').querySelector('.ms-toggle-name').childNodes[0].textContent.trim());
    toggle.setAttribute('aria-checked', String(!!state[option]));
    toggle.tabIndex = 0;
    ctx.wireToggle(toggle);
    toggle.addEventListener('click', () => {
      state[option] = toggle.classList.contains('on');
      toggle.setAttribute('aria-checked', String(state[option]));
      render();
    });
    toggle.addEventListener('keydown', (event) => { if (['Enter', ' '].includes(event.key)) { event.preventDefault(); toggle.click(); } });
  });
  host.appendChild(editor);
  render();
  return { state, element: editor, render };
}