import { LANGUAGE_CATALOG, createLanguageState } from './languageState.js';
import './multiLanguage.css';

const read = input => input.isContentEditable ? input.innerHTML : input.value;
const write = (input, value) => {
  if (read(input) === value) return;
  if (input.isContentEditable) input.innerHTML = safeRich(value);
  else input.value = value;
};
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const globe = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-5 5-5 13 0 18M12 3c5 5 5 13 0 18"/></svg>';

function safeRich(value) {
  const template = document.createElement('template');
  template.innerHTML = value;
  template.content.querySelectorAll('*').forEach(node => {
    if (!['B', 'STRONG', 'I', 'EM', 'U', 'BR', 'DIV', 'P', 'SPAN'].includes(node.tagName)) { node.replaceWith(document.createTextNode(node.textContent)); return; }
    const token = node.classList.contains('var-token') && /^[a-zA-Z]+$/.test(node.dataset.key || '') ? node.dataset.key : null;
    [...node.attributes].forEach(attribute => node.removeAttribute(attribute.name));
    if (token) { node.className = 'var-token'; node.dataset.key = token; node.contentEditable = 'false'; }
  });
  return template.innerHTML;
}

export function bindMemberField(ctx, input, key, english) {
  if (!input) return;
  if (english === undefined) english = read(input);
  ctx.memberFields ||= new Map();
  input.dataset.mlKey = key;
  ctx.memberFields.set(input, { key, english: String(english ?? '') });
  ctx.refreshMultiLanguage?.();
}

export function memberCopy(ctx, key, english) {
  ctx.memberSources ||= new Map();
  ctx.memberSources.set(key, String(english ?? ''));
  return ctx.localizeMemberCopy?.(key, String(english ?? '')) ?? String(english ?? '');
}

export function memberRenderer(ctx, render) {
  ctx.memberRenderers ||= new Set();
  ctx.memberRenderers.add(render);
}

export function initMultiLanguage(ctx) {
  const previousPayload = ctx.exportMultiLanguage?.();
  ctx.cleanupMultiLanguage?.();
  const abort = new AbortController();
  const fields = ctx.memberFields ||= new Map();
  const decorations = new Map();
  const staticPaint = new Map();
  const root = document.getElementById('app-shell');
  const device = document.querySelector('#device-frame .device-screen');
  let suspended = false;
  let refreshing = false;
  let liveKeys = new Set();
  let queued = false;
  let disposed = false;
  const state = createLanguageState(() => {
    schedule();
    ctx.markDirty?.();
  });
  const language = () => LANGUAGE_CATALOG.find(item => item.code === state.locale()) || LANGUAGE_CATALOG[0];
  const syncSource = (key, english) => {
    state.register(key, english);
    if (state.raw(key, 'en') !== english) state.set(key, english, 'en');
  };
  ctx.localizeMemberCopy = (key, english) => {
    if (refreshing) liveKeys.add(key);
    syncSource(key, english);
    return suspended ? english : state.get(key);
  };
  const register = (input, key, paint) => {
    if (!input) return;
    bindMemberField(ctx, input, key);
    if (paint) staticPaint.set(input, paint);
  };
  const business = document.createElement('section');
  business.className = 'ml-business gf-fieldset';
  business.innerHTML = '<h3 class="gf-field-label">App languages</h3><label for="ml-default-language">Default language</label><select class="cp-select" id="ml-default-language" aria-label="Default language"></select><details class="ml-offer"><summary>Add languages</summary><div class="ml-offer-body"><label for="ml-add-language">Also offer</label><select class="cp-select" id="ml-add-language" aria-label="Add app language"></select><div class="ml-tags"></div></div></details>';
  business.querySelector('#ml-default-language').innerHTML = LANGUAGE_CATALOG.map(item => `<option value="${item.code}">${esc(item.name)} - ${esc(item.native)}</option>`).join('');
  document.querySelector('#cp-business .cp-master')?.appendChild(business);
  const switcher = document.createElement('div');
  switcher.className = 'ml-switcher';
  switcher.setAttribute('aria-label', 'Editor and preview language');
  document.querySelector('.launch-preview-end')?.appendChild(switcher);

  function decorate(input) {
    if (decorations.has(input)) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'ml-field';
    input.before(wrapper);
    wrapper.appendChild(input);
    const source = document.createElement('div');
    source.className = 'ml-source';
    source.dir = 'ltr';
    source.innerHTML = '<span class="ml-code">EN</span><span class="ml-source-text"></span>';
    wrapper.prepend(source);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ml-globe';
    button.innerHTML = globe;
    button.title = 'Change editing language';
    button.setAttribute('aria-label', 'Change editing language');
    button.setAttribute('aria-expanded', 'false');
    const popup = document.createElement('div');
    popup.className = 'ml-carousel';
    popup.setAttribute('role', 'group');
    popup.setAttribute('aria-label', 'Editing language');
    popup.hidden = true;
    const open = value => {
      popup.hidden = !value;
      button.setAttribute('aria-expanded', String(value));
    };
    wrapper.append(button, popup);
    button.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') open(true); }, { signal: abort.signal });
    let closeTimer;
    wrapper.addEventListener('pointerenter', () => clearTimeout(closeTimer), { signal: abort.signal });
    wrapper.addEventListener('pointerleave', () => { closeTimer = setTimeout(() => open(false), 220); }, { signal: abort.signal });
    button.addEventListener('click', event => { event.stopPropagation(); open(popup.hidden); }, { signal: abort.signal });
    wrapper.addEventListener('focusout', event => { if (!wrapper.contains(event.relatedTarget)) open(false); }, { signal: abort.signal });
    decorations.set(input, { wrapper, source, button, popup, placeholder: input.getAttribute('placeholder') });
  }

  const status = code => {
    if (code === state.defaultLocale()) return 'Default';
    const keys = [...liveKeys];
    const count = state.missing(code, keys.filter(key => state.raw(key, 'en').trim())).length;
    return count ? `${count} missing` : 'Complete';
  };
  const chips = () => state.locales().map(code => `<button type="button" data-ml-locale="${code}" aria-pressed="${state.locale() === code}" title="${esc(LANGUAGE_CATALOG.find(item => item.code === code).name)}">${code.toUpperCase()}${status(code).endsWith('missing') ? '<i class="ml-dot"></i>' : ''}</button>`).join('');

  function renderChrome() {
    const multiple = state.locales().length > 1;
    const languageSelect = business.querySelector('#ml-add-language');
    business.querySelector('#ml-default-language').value = state.defaultLocale();
    const localesSignature = JSON.stringify(state.locales());
    if (languageSelect.dataset.locales !== localesSignature) {
      languageSelect.dataset.locales = localesSignature;
      languageSelect.innerHTML = '<option value="">Add language</option>' + LANGUAGE_CATALOG.filter(item => !state.locales().includes(item.code)).map(item => `<option value="${item.code}">${esc(item.name)} - ${esc(item.native)}</option>`).join('');
    }
    business.querySelector('.ml-tags').innerHTML = state.locales().filter(code => code !== state.defaultLocale()).map(code => `<span class="ml-tag">${esc(LANGUAGE_CATALOG.find(item => item.code === code).name)}<button type="button" data-ml-remove="${code}" aria-label="Remove ${code}" title="Remove language">&times;</button></span>`).join('');
    switcher.hidden = !multiple;
    const signature = JSON.stringify([state.locales(), state.locale(), state.locales().map(status)]);
    if (switcher.dataset.signature !== signature) {
      const expanded = !!switcher.querySelector('details[open]');
      switcher.dataset.signature = signature;
      switcher.innerHTML = state.locales().length <= 4 ? `<div class="ml-segments">${chips()}</div>` : `<details ${expanded ? 'open' : ''}><summary>${globe}<span>${esc(language().name)}</span><span aria-hidden="true">&#8963;</span></summary><div class="ml-menu">${state.locales().map(code => `<button type="button" data-ml-locale="${code}" aria-pressed="${code === state.locale()}"><span>${esc(LANGUAGE_CATALOG.find(item => item.code === code).name)}</span><small>${status(code)}</small></button>`).join('')}</div></details>`;
    }
    decorations.forEach(({ wrapper, source, button, popup, placeholder }, input) => {
      const { key } = fields.get(input) || {};
      if (!key) return;
      const missing = state.locale() !== state.defaultLocale() && !state.raw(key).trim() && !!state.get(key, state.defaultLocale()).trim();
      wrapper.classList.toggle('ml-multiple', multiple);
      wrapper.classList.toggle('ml-missing', missing);
      source.hidden = state.locale() === state.defaultLocale() || !multiple;
      source.querySelector('.ml-code').textContent = state.defaultLocale().toUpperCase();
      source.querySelector('.ml-source-text').textContent = plainSource(input, state.get(key, state.defaultLocale()));
      source.querySelector('.ml-source-text').title = plainSource(input, state.get(key, state.defaultLocale()));
      button.hidden = !multiple;
      if (!multiple) popup.hidden = true;
      const signature = chips();
      if (popup.dataset.signature !== signature) { popup.innerHTML = signature; popup.dataset.signature = signature; }
      input.classList.toggle('ml-missing-input', missing);
      if (!input.isContentEditable) {
        if (missing) input.placeholder = 'Translate';
        else if (placeholder === null) input.removeAttribute('placeholder');
        else input.placeholder = placeholder;
      }
      wrapper.classList.toggle('ml-translating', state.locale() !== state.defaultLocale());
      wrapper.style.setProperty('--ml-control-top', `${input.offsetTop}px`);
      wrapper.style.setProperty('--ml-control-height', `${Math.min(input.offsetHeight, 44)}px`);
    });
    if (device) { device.dir = language().dir; device.lang = state.locale(); }
    ['home', 'more'].forEach(page => {
      const header = root?.querySelector(`.app-page[data-page="${page}"] .app-top-header`);
      if (!header) return;
      let marker = header.querySelector('.ml-member-marker');
      if (!multiple) { marker?.remove(); return; }
      if (!marker) { marker = document.createElement('span'); marker.className = 'ml-member-marker'; header.appendChild(marker); }
      marker.innerHTML = `${globe}<span>${state.locale().toUpperCase()}</span><span aria-hidden="true">&#8964;</span>`;
      marker.setAttribute('aria-label', `App language: ${language().name}`);
    });
  }

  function plainSource(input, value) {
    if (!input.isContentEditable) return value;
    const template = document.createElement('template');
    template.innerHTML = safeRich(value);
    return template.content.textContent;
  }

  function refresh() {
    if (disposed || suspended || refreshing) return;
    refreshing = true;
    try {
      liveKeys = new Set();
      ctx.memberSources?.forEach((english, key) => syncSource(key, english));
      fields.forEach(({ key, english }, input) => {
        if (!input.isConnected) {
          fields.delete(input);
          decorations.delete(input);
          staticPaint.delete(input);
          return;
        }
        state.register(key, english);
        liveKeys.add(key);
        decorate(input);
        write(input, state.raw(key));
        input.dir = language().dir;
        staticPaint.get(input)?.(state.get(key));
      });
      ctx.memberRenderers?.forEach(render => render());
      renderChrome();
    } finally { refreshing = false; }
  }
  function schedule() {
    if (disposed || queued || refreshing) return;
    queued = true;
    queueMicrotask(() => { queued = false; refresh(); });
  }
  function withDefaultLanguage(callback) {
    const previous = suspended;
    suspended = true;
    fields.forEach(({ key }, input) => { write(input, state.raw(key, 'en')); });
    try { return callback(); }
    finally { suspended = previous; if (!suspended) refresh(); }
  }
  const capture = event => {
    if (suspended || event.target.closest('.ml-business')) return;
    const field = fields.get(event.target);
    if (field && ['input', 'change'].includes(event.type) && state.locale() !== 'en') {
      event.stopImmediatePropagation();
      state.set(field.key, read(event.target));
      return;
    }
    if (field && ['input', 'change'].includes(event.type)) {
      state.set(field.key, read(event.target), 'en');
      const source = ctx.memberSources;
      if (source?.has(field.key)) source.set(field.key, read(event.target));
    }
    if (state.locale() !== 'en' && !event.target.closest('.ml-globe, .ml-carousel, .ml-source, .ml-switcher, .ml-business, .var-dropdown') && !field) {
      fields.forEach(({ key }, input) => { write(input, state.raw(key, 'en')); });
    }
    schedule();
  };
  ['input', 'change', 'click', 'keydown', 'focusout'].forEach(type => document.addEventListener(type, capture, { capture: true, signal: abort.signal }));
  document.addEventListener('click', event => {
    const locale = event.target.closest('[data-ml-locale]');
    const remove = event.target.closest('[data-ml-remove]');
    if (locale) { state.setLocale(locale.dataset.mlLocale); locale.closest('details')?.removeAttribute('open'); }
    if (remove) state.setLocales(state.locales().filter(code => code !== remove.dataset.mlRemove));
  }, { signal: abort.signal });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      decorations.forEach(({ popup, button }) => { popup.hidden = true; button.setAttribute('aria-expanded', 'false'); });
      switcher.querySelector('details')?.removeAttribute('open');
    }
  }, { signal: abort.signal });
  business.querySelector('#ml-default-language').addEventListener('change', event => {
    state.setDefaultLocale(event.target.value);
  }, { signal: abort.signal });
  business.querySelector('#ml-add-language').addEventListener('change', event => {
    if (event.target.value) state.setLocales([...state.locales(), event.target.value]);
  }, { signal: abort.signal });
  ['como:stepchange', 'como:navchange', 'como:draft-restored', 'como:pages-changed', 'como:screenname'].forEach(type => document.addEventListener(type, schedule, { signal: abort.signal }));

  document.querySelectorAll('#config-panel [data-bind-text], #l3-panel [data-bind-text]').forEach(input => {
    if (input.closest('#setup-wizard, #settings-modal') || !input.matches('.cp-input-text')) return;
    const selector = input.dataset.bindText;
    const key = selector.includes('.brand-text .name') ? 'business.name' : `bound:${selector}`;
    register(input, key, value => document.querySelectorAll(selector).forEach(target => {
      if (input.isContentEditable) { const html = safeRich(value); if (target.innerHTML !== html) target.innerHTML = html; }
      else if (target.textContent !== value) target.textContent = value;
    }));
  });
  register(document.getElementById('gf-biz-name'), 'business.name', value => root?.querySelectorAll('.brand-text .name').forEach(target => { target.textContent = value || 'Your Business'; }));
  ['gf-headline', 'gf-branding-headline'].forEach(id => register(document.getElementById(id), 'business.tagline', value => { const target = document.getElementById('phone-brand-sub'); if (target) target.textContent = value; }));

  const api = {
    registerMemberField: register,
    refreshMultiLanguage: schedule,
    multiLanguage: state,
    exportMultiLanguage: () => state.export(),
    importMultiLanguage: payload => state.import(payload),
    withDefaultLanguage,
    cleanupMultiLanguage: () => {
      disposed = true;
      abort.abort();
      business.remove();
      switcher.remove();
      decorations.forEach(({ wrapper, placeholder }, input) => {
        write(input, state.raw(fields.get(input)?.key, 'en'));
        input.dir = 'ltr';
        input.classList.remove('ml-missing-input');
        if (placeholder === null) input.removeAttribute('placeholder');
        else input.setAttribute('placeholder', placeholder);
        wrapper.before(input);
        wrapper.remove();
      });
      root?.querySelectorAll('.ml-member-marker').forEach(marker => marker.remove());
    },
  };
  Object.assign(ctx, api);
  if (previousPayload) state.import(previousPayload);
  refresh();
  if (import.meta.hot) import.meta.hot.dispose(api.cleanupMultiLanguage);
  return api;
}