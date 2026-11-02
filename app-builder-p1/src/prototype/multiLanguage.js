import { LANGUAGE_CATALOG, createLanguageState } from './languageState.js';
import './multiLanguage.css';

const language = code => LANGUAGE_CATALOG.find(item => item.code === code) || LANGUAGE_CATALOG[0];
const pickerIcon = {
  chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
};
const read = input => 'value' in input ? input.value : [...input.childNodes].map(node => node.nodeType === 1 && node.classList.contains('var-token') ? `{${node.dataset.key}}` : node.textContent).join('').replace(/\u200b/g, '');
const write = (input, value) => {
  if ('value' in input) { if (input.value !== value) input.value = value; }
  else if (read(input) !== value) {
    input.replaceChildren();
    String(value).split(/(\{[a-zA-Z][a-zA-Z0-9]*\})/g).forEach(part => {
      if (/^\{[a-zA-Z][a-zA-Z0-9]*\}$/.test(part)) {
        const token = document.createElement('span');
        token.className = 'var-token'; token.dataset.key = part.slice(1, -1);
        token.contentEditable = 'false'; token.textContent = part;
        input.append(token);
      } else input.append(document.createTextNode(part));
    });
  }
};

export function registerLanguageOwner(ctx, owner) {
  (ctx.languageOwners ||= new Set()).add(owner);
  ctx.refreshMultiLanguage?.();
}

export function initMultiLanguage(ctx) {
  const restored = ctx.exportMultiLanguage?.();
  ctx.cleanupMultiLanguage?.();
  const abort = new AbortController();
  const fields = new Map();
  const previews = new Map();
  const activeKeys = new Set();
  const renderers = new Set();
  const shell = document.getElementById('app-shell');
  let painting = false;
  let queued = false;
  let defaultDepth = 0;
  let importing = false;
  let disposed = false;
  const state = createLanguageState(() => {
    if (!importing) ctx.markDirty?.();
    schedule();
  });
  const button = (text, action, title = text) => {
    const node = document.createElement('button');
    node.type = 'button'; node.textContent = text; node.title = title;
    node.setAttribute('aria-label', title);
    node.addEventListener('click', action, { signal: abort.signal });
    return node;
  };
  const text = (key, english) => {
    activeKeys.add(key);
    state.register(key, english);
    if (state.raw(key, 'en') !== String(english)) state.set(key, english, 'en');
    return defaultDepth ? state.raw(key, 'en') : state.get(key);
  };
  const sourceValue = input => !input ? '' : fields.has(input) ? state.raw(fields.get(input).key, 'en') : read(input);
  const withDefaultLanguage = callback => {
    defaultDepth++;
    const saved = [...fields].filter(([input]) => input.isConnected).map(([input, field]) => [input, read(input), input.innerHTML, field]);
    saved.forEach(([input, , , field]) => write(input, state.raw(field.key, 'en')));
    observer.disconnect();
    try {
      renderers.forEach(render => render());
      paintFields();
      return callback();
    }
    finally {
      defaultDepth--;
      saved.forEach(([input, value, html]) => {
        if ('value' in input) write(input, value);
        else input.innerHTML = html;
      });
      renderers.forEach(render => render());
      paintFields();
      observe();
    }
  };

  function decorate(input, key, english, targets) {
    if (!input) return;
    activeKeys.add(key);
    state.register(key, english ?? read(input));
    const previous = fields.get(input);
    if (previous) { previous.key = key; previous.targets = targets; return; }
    const original = { placeholder: input.getAttribute('placeholder'), dir: input.getAttribute('dir') };
    const wrap = document.createElement('div'); wrap.className = 'ml-field'; wrap.dataset.mlUi = '';
    input.before(wrap); wrap.append(input);
    const source = document.createElement('div'); source.className = 'ml-source'; source.dir = 'ltr';
    const code = document.createElement('b'); code.textContent = 'EN';
    const value = document.createElement('span');
    source.append(code, value); wrap.prepend(source);
    const globe = button('', () => setOpen(!wrap.classList.contains('ml-open')), 'Field language');
    globe.innerHTML = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18M12 3c-5 5-5 13 0 18"/></svg>';
    globe.className = 'ml-globe'; globe.setAttribute('aria-expanded', 'false'); globe.setAttribute('aria-haspopup', 'true');
    const popup = document.createElement('div'); popup.className = 'ml-carousel'; popup.setAttribute('aria-label', 'Field language');
    const setOpen = open => {
      document.querySelectorAll('.ml-open').forEach(node => { if (node !== wrap) node.classList.remove('ml-open'); });
      wrap.classList.toggle('ml-open', open); globe.setAttribute('aria-expanded', String(open));
    };
    globe.addEventListener('pointerenter', () => setOpen(true), { signal: abort.signal });
    let closeTimer;
    wrap.addEventListener('pointerenter', () => clearTimeout(closeTimer), { signal: abort.signal });
    wrap.addEventListener('pointerleave', () => { closeTimer = setTimeout(() => { if (!wrap.contains(document.activeElement)) setOpen(false); }, 220); }, { signal: abort.signal });
    wrap.addEventListener('focusout', event => { if (!wrap.contains(event.relatedTarget)) setOpen(false); }, { signal: abort.signal });
    wrap.append(globe, popup);
    const field = { key, targets, wrap, source, value, globe, popup, original, localeSignature: '' };
    fields.set(input, field);
  }

  function paintFields() {
    const activeLocale = defaultDepth ? 'en' : state.locale();
    const multiple = state.locales().length > 1;
    fields.forEach((field, input) => {
      if (!input.isConnected) { fields.delete(input); return; }
      activeKeys.add(field.key);
      const english = state.raw(field.key, 'en');
      const translated = !defaultDepth && activeLocale !== state.defaultLocale();
      const missing = translated && !state.raw(field.key).trim();
      field.wrap.classList.toggle('ml-multiple', multiple);
      field.wrap.classList.toggle('ml-missing', missing);
      field.source.hidden = !multiple || !translated;
      const source = state.get(field.key, state.defaultLocale());
      field.source.querySelector('b').textContent = state.defaultLocale().toUpperCase();
      field.value.textContent = source; field.value.title = source;
      input.dir = language(activeLocale).dir;
      if (missing) input.setAttribute('placeholder', 'Translate');
      else if (field.original.placeholder === null) input.removeAttribute('placeholder');
      else input.setAttribute('placeholder', field.original.placeholder);
      write(input, defaultDepth ? english : state.raw(field.key));
      field.wrap.style.setProperty('--ml-control-top', `${input.offsetTop}px`);
      field.wrap.style.setProperty('--ml-control-height', `${Math.min(input.offsetHeight, 44)}px`);
      const signature = state.locales().join(',') + ':' + state.locale() + ':' + state.locales().map(code => state.raw(field.key, code).trim() ? '1' : '0').join('');
      if (field.localeSignature !== signature) {
        field.popup.replaceChildren(...state.locales().map(code => {
          const chip = button(code.toUpperCase(), () => { state.setLocale(code); field.wrap.classList.remove('ml-open'); }, language(code).name);
          chip.classList.toggle('selected', code === state.locale());
          chip.setAttribute('aria-pressed', String(code === state.locale()));
          if (state.missing(code, [field.key]).length) chip.classList.add('ml-gap');
          return chip;
        }));
        field.localeSignature = signature;
      }
      const nodes = typeof field.targets === 'function' ? field.targets() : document.querySelectorAll(field.targets || ':not(*)');
      nodes?.forEach(node => {
        const next = state.get(field.key, activeLocale) || (field.key === 'business:name' ? 'Your Business' : field.key === 'business:tagline' ? 'Storefront headline' : '');
        if (node.textContent !== next) node.textContent = next;
        if (node.matches('.hb-h, .hb-cta, .pc-rw-heading')) { node.hidden = !next.trim(); if (node.matches('.pc-rw-heading')) node.style.display = next.trim() ? '' : 'none'; }
      });
    });
    previews.forEach((resolve, key) => resolve().forEach(node => {
      activeKeys.add(key);
      const next = state.get(key, activeLocale);
      if (node.textContent !== next) node.textContent = next;
    }));
  }

  const setup = document.createElement('section'); setup.className = 'ml-setup'; setup.dataset.mlUi = '';
  const heading = document.createElement('h3'); heading.textContent = 'App languages';
  const picker = document.createElement('div'); picker.className = 'ml-pick';
  const pickerButton = document.createElement('button'); pickerButton.type = 'button'; pickerButton.className = 'ml-pick-btn';
  pickerButton.setAttribute('aria-haspopup', 'true'); pickerButton.setAttribute('aria-expanded', 'false'); pickerButton.setAttribute('aria-label', 'Choose app languages');
  const pickerSummary = document.createElement('span'); pickerSummary.className = 'ml-pick-summary';
  pickerButton.append(pickerSummary); pickerButton.insertAdjacentHTML('beforeend', pickerIcon.chevron);
  const pickerPop = document.createElement('div'); pickerPop.className = 'ml-pick-pop'; pickerPop.hidden = true;
  const searchLabel = document.createElement('label'); searchLabel.className = 'ml-pick-search'; searchLabel.insertAdjacentHTML('afterbegin', pickerIcon.search);
  const search = document.createElement('input'); search.type = 'text'; search.placeholder = 'Search languages'; search.autocomplete = 'off'; search.setAttribute('aria-label', 'Search languages');
  searchLabel.append(search);
  const languageList = document.createElement('ul'); languageList.className = 'ml-pick-list'; languageList.setAttribute('aria-label', 'App languages');
  const empty = document.createElement('p'); empty.className = 'ml-pick-empty'; empty.textContent = 'No language found'; empty.hidden = true;
  pickerPop.append(searchLabel, languageList, empty);
  picker.append(pickerButton, pickerPop);
  setup.append(heading, picker);
  document.querySelector('#cp-business .cp-master')?.append(setup);
  let pickerSignature = '';
  function renderPicker() {
    const locales = state.locales();
    const defaultLocale = state.defaultLocale();
    const query = search.value.trim().toLowerCase();
    const signature = JSON.stringify([locales, defaultLocale, query]);
    if (pickerSignature === signature) return;
    pickerSignature = signature;
    const focused = document.activeElement?.dataset.mlPick || document.activeElement?.dataset.mlMake || '';
    pickerSummary.replaceChildren();
    const lead = document.createElement('span'); lead.className = 'ml-pick-lead';
    const leadName = document.createElement('span'); leadName.textContent = language(defaultLocale).name;
    const defaultBadge = document.createElement('i'); defaultBadge.textContent = 'Default';
    lead.append(leadName, defaultBadge);
    const others = locales.filter(code => code !== defaultLocale).map(code => language(code).name);
    const rest = document.createElement('span'); rest.className = `ml-pick-rest${others.length ? '' : ' is-hint'}`;
    rest.textContent = others.join(' · ') || 'Add languages';
    pickerSummary.append(lead, rest);

    const matches = LANGUAGE_CATALOG.filter(item => !query || `${item.name} ${item.native} ${item.code}`.toLowerCase().includes(query));
    languageList.replaceChildren(...matches.map(item => {
      const selected = locales.includes(item.code);
      const isDefault = item.code === defaultLocale;
      const row = document.createElement('li'); row.className = `ml-pick-row${selected ? ' is-on' : ''}`;
      const choice = document.createElement('button'); choice.type = 'button'; choice.className = 'ml-pick-toggle';
      choice.dataset.mlPick = item.code; choice.setAttribute('role', 'checkbox'); choice.setAttribute('aria-checked', String(selected));
      choice.disabled = isDefault && locales.length === 1;
      choice.title = choice.disabled ? 'Keep at least one language' : `${selected ? 'Remove' : 'Add'} ${item.name}`;
      const box = document.createElement('span'); box.className = 'ml-box'; box.insertAdjacentHTML('afterbegin', pickerIcon.check);
      const name = document.createElement('span'); name.textContent = item.name;
      const native = document.createElement('span'); native.className = 'ml-pick-native'; native.dir = 'auto'; native.textContent = item.native;
      choice.append(box, name, native);
      choice.addEventListener('click', () => {
        const before = state.locales();
        if (!before.includes(item.code)) state.setLocales([...before, item.code]);
        else if (before.length > 1 && item.code === state.defaultLocale()) state.setDefaultLocale(before.find(code => code !== item.code));
        else if (before.length > 1) state.setLocales(before.filter(code => code !== item.code));
      }, { signal: abort.signal });
      row.append(choice);
      if (isDefault) {
        const badge = document.createElement('span'); badge.className = 'ml-pick-badge'; badge.textContent = 'Default'; row.append(badge);
      } else if (selected) {
        const make = document.createElement('button'); make.type = 'button'; make.className = 'ml-pick-make'; make.dataset.mlMake = item.code; make.textContent = 'Make default';
        make.addEventListener('click', () => {
          const before = state.locales();
          state.setDefaultLocale(item.code);
          state.setLocales([item.code, ...before.filter(code => code !== item.code)]);
        }, { signal: abort.signal });
        row.append(make);
      }
      return row;
    }));
    empty.hidden = matches.length > 0;
    if (focused) (languageList.querySelector(`[data-ml-pick="${focused}"], [data-ml-make="${focused}"]`))?.focus({ preventScroll: true });
  }
  function setPickerOpen(open) {
    pickerPop.hidden = !open;
    pickerButton.setAttribute('aria-expanded', String(open));
    if (open) { search.focus({ preventScroll: true }); pickerPop.scrollIntoView({ block: 'nearest' }); }
    else if (search.value) { search.value = ''; renderPicker(); }
  }
  pickerButton.addEventListener('click', () => setPickerOpen(pickerPop.hidden), { signal: abort.signal });
  search.addEventListener('input', renderPicker, { signal: abort.signal });
  pickerPop.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.stopPropagation(); setPickerOpen(false); pickerButton.focus(); }
  }, { signal: abort.signal });
  document.addEventListener('click', event => {
    if (!pickerPop.hidden && !setup.contains(event.target)) setPickerOpen(false);
  }, { signal: abort.signal });
  const switcher = document.createElement('div'); switcher.className = 'ml-switcher'; switcher.dataset.mlUi = '';
  const phone = shell?.closest('.device-stage');
  (phone || shell)?.after(switcher);
  let switchSignature = '';
  function paintLanguages() {
    const missing = code => state.missing(code, [...activeKeys].filter(key => state.raw(key, 'en').trim()));
    const signature = JSON.stringify([state.locales(), state.locale(), state.locales().map(code => missing(code).length)]);
    renderPicker();
    if (signature === switchSignature) return;
    switchSignature = signature;
    switcher.hidden = state.locales().length === 1;
    switcher.replaceChildren();
    if (switcher.hidden) return;
    const choose = code => state.setLocale(code);
    if (state.locales().length <= 4) {
      switcher.classList.remove('ml-menu-mode');
      state.locales().forEach(code => {
        const item = button(code.toUpperCase(), () => choose(code), language(code).name);
        item.classList.toggle('selected', code === state.locale()); item.setAttribute('aria-pressed', String(code === state.locale()));
        if (missing(code).length) item.classList.add('ml-gap');
        switcher.append(item);
      });
    } else {
      switcher.classList.add('ml-menu-mode');
      const menu = document.createElement('div'); menu.className = 'ml-language-menu'; menu.hidden = true;
      const toggle = button(`${language(state.locale()).name} ⌃`, () => { menu.hidden = !menu.hidden; toggle.setAttribute('aria-expanded', String(!menu.hidden)); }, 'Preview language');
      toggle.setAttribute('aria-expanded', 'false');
      state.locales().forEach(code => {
        const gaps = missing(code).length;
        const item = button('', () => choose(code), language(code).name);
        const name = document.createElement('span'); name.textContent = language(code).name;
        const status = document.createElement('small'); status.textContent = code === state.defaultLocale() ? 'Default' : gaps ? `${gaps} missing` : 'Complete';
        item.append(name, status); item.classList.toggle('selected', code === state.locale()); menu.append(item);
      });
      switcher.append(toggle, menu);
    }
  }

  function refresh() {
    if (disposed || painting || defaultDepth) return;
    painting = true;
    activeKeys.clear();
    observer.disconnect();
    try {
      ctx.languageOwners?.forEach(owner => {
        if (!owner.element.isConnected) { ctx.languageOwners.delete(owner); renderers.delete(owner.render); return; }
        owner.bind?.();
        if (owner.render) renderers.add(owner.render);
      });
      ctx.discoverLanguageFields?.();
      renderers.forEach(render => render());
      paintFields(); paintLanguages();
      if (shell) {
        shell.dir = language(state.locale()).dir;
        document.getElementById('bottom-nav')?.setAttribute('dir', language(state.locale()).dir);
        shell.querySelectorAll('.ml-member-marker').forEach(node => node.remove());
        if (state.locales().length > 1) shell.querySelectorAll('.app-page[data-page="home"] .app-top-header, .app-page[data-page="more"] .app-top-header').forEach(header => {
          const marker = document.createElement('span'); marker.className = 'ml-member-marker'; marker.dataset.mlUi = '';
          marker.textContent = `${state.locale().toUpperCase()} ▾`; marker.title = language(state.locale()).name;
          header.append(marker);
        });
      }
    } finally { painting = false; observe(); }
  }
  function schedule() {
    if (disposed || queued || painting) return;
    queued = true;
    queueMicrotask(() => { queued = false; refresh(); });
  }
  const capture = event => {
    if (defaultDepth || event.target.closest?.('[data-ml-ui]') && !fields.has(event.target)) return;
    const input = event.target;
    const field = fields.get(input);
    if ((event.type === 'input' || event.type === 'change') && field) {
      const value = read(input);
      if (state.locale() !== 'en') {
        event.stopImmediatePropagation();
        state.set(field.key, value);
        return;
      }
      state.set(field.key, value, 'en');
    }
    if (state.locale() !== 'en' && event.type !== 'focusin') {
      event.stopImmediatePropagation();
      if (event.type === 'click') event.preventDefault();
      withDefaultLanguage(() => input.dispatchEvent(event instanceof InputEvent
        ? new InputEvent(event.type, { bubbles: true, cancelable: true, inputType: event.inputType, data: event.data })
        : event instanceof MouseEvent ? new MouseEvent(event.type, { bubbles: true, cancelable: true, clientX: event.clientX, clientY: event.clientY })
          : new Event(event.type, { bubbles: true, cancelable: true })));
    }
    schedule();
  };
  ['input', 'change', 'click', 'focusin'].forEach(type => document.addEventListener(type, capture, { capture: true, signal: abort.signal }));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      document.querySelectorAll('.ml-open').forEach(node => node.classList.remove('ml-open'));
      switcher.querySelector('.ml-language-menu')?.setAttribute('hidden', '');
    }
  }, { signal: abort.signal });
  const observer = new MutationObserver(records => {
    if (records.some(record => !record.target.closest?.('[data-ml-ui]') && [...record.addedNodes, ...record.removedNodes].some(node => node.nodeType === 1 && !node.hasAttribute('data-ml-ui')))) schedule();
  });
  function observe() {
    if (shell) observer.observe(shell.parentElement, { childList: true, subtree: true });
    ['config-panel', 'l3-body', 'l4-body'].forEach(id => {
      const root = document.getElementById(id); if (root) observer.observe(root, { childList: true, subtree: true });
    });
  }
  observe();
  function discoverStaticFields() {
    const registerStatic = (input, key, targets) => {
      if (input && !fields.has(input)) decorate(input, key, read(input), targets);
    };
    registerStatic(document.getElementById('gf-biz-name'), 'business:name', '.app-top-header .brand-text .name, #phone-brand-name, #rewards-brand, [data-phone-brand]');
    registerStatic(document.getElementById('gf-headline'), 'business:tagline', '#phone-brand-sub');
    registerStatic(document.getElementById('gf-branding-headline'), 'business:tagline', '#phone-brand-sub');
    document.querySelectorAll('#config-panel [data-bind-text], #l3-body [data-bind-text]').forEach(input => {
      if (!input.matches('input, textarea, [contenteditable]')) return;
      const target = input.dataset.bindText;
      if (!target || !document.querySelector(target)?.closest('#app-shell')) return;
      const key = target.includes('.brand-text .name') ? 'business:name' : `bound:${target}`;
      registerStatic(input, key, target);
    });
    document.querySelectorAll('input[id$="-section-title"]').forEach(input => {
      if (!input.closest('#config-panel, #l3-body')) return;
      const idp = input.id.slice(0, -'-section-title'.length);
      registerStatic(input, `section:${idp}:title`, () => document.querySelectorAll(`#${idp}-carousel-wrap ~ .pc-eyebrow, .promo-cards-widget:has(#${idp}-carousel-wrap) .pc-eyebrow`));
    });
    registerStatic(document.getElementById('menu-screen-name'), 'tab:menu', '#bottom-nav [data-nav="menu"] span');
  }
  document.querySelectorAll('#bottom-nav [data-nav]').forEach(item => {
    const key = `tab:${item.dataset.nav}`;
    state.register(key, item.querySelector('span')?.textContent || '');
    previews.set(key, () => document.querySelectorAll(`#bottom-nav [data-nav="${item.dataset.nav}"] span`));
  });
  document.addEventListener('como:screenname', event => {
    const key = `tab:${event.detail.key}`;
    state.set(key, event.detail.name, 'en');
  }, { signal: abort.signal });
  Object.assign(ctx, {
    languageState: state, languageText: text, languageSourceValue: sourceValue,
    registerLanguageField: decorate, refreshMultiLanguage: schedule, withDefaultLanguage,
    discoverLanguageFields: discoverStaticFields,
    addLanguageRenderer: render => { renderers.add(render); return () => renderers.delete(render); },
    exportMultiLanguage: () => { ctx.discoverLanguageFields?.(); return state.export(); },
    importMultiLanguage: payload => { importing = true; try { state.import(payload); } finally { importing = false; } },
    cleanupMultiLanguage: () => {
      disposed = true;
      abort.abort(); observer.disconnect(); setup.remove(); switcher.remove();
      fields.forEach((field, input) => { write(input, state.raw(field.key, 'en')); field.wrap.replaceWith(input); input.removeAttribute('dir'); if (field.original.placeholder === null) input.removeAttribute('placeholder'); else input.setAttribute('placeholder', field.original.placeholder); });
      shell?.removeAttribute('dir'); document.getElementById('bottom-nav')?.removeAttribute('dir'); shell?.querySelectorAll('.ml-member-marker').forEach(node => node.remove());
    },
  });
  if (restored) {
    importing = true;
    try { state.import(restored); } finally { importing = false; }
  }
  schedule();
  return {};
}