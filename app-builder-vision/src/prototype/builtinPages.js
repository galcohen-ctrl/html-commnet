import builtinPagesHtml from '../templates/config/builtin-pages.html?raw';

/*
 * Built-in page editors. Each built-in screen with fixed content (My Account,
 * My Orders, Refer a Friend, Our Story, About Us, Contact Us) gets its own editor
 * in the third panel (#l3-body). Fields drive the matching phone page live.
 * Public contract (window): BUILTIN_PAGES, openBuiltInPageEditor, closeBuiltInPageEditor,
 * exportBuiltInPages, importBuiltInPages.
 */

const PAGES = [
  { key: 'menu', label: 'Menu', editable: false },
  { key: 'account', label: 'My Account', editable: true },
  { key: 'orders', label: 'My Orders', editable: true },
  { key: 'referral', label: 'Refer a Friend', editable: true },
  { key: 'story', label: 'Our Story', editable: true },
  { key: 'contact', label: 'Contact Us', editable: true },
  { key: 'about', label: 'About Us', editable: true },
  { key: 'gifts', label: 'My Gifts', editable: false },
  { key: 'point-shop', label: 'Point Shop', editable: false },
  { key: 'share-credit', label: 'Share Credit', editable: false },
];

const TEMPLATE_FOR = { account: 'account', orders: 'orders', referral: 'referral', story: 'about-us', about: 'about-us', contact: 'contact' };
const ABOUT_COPY = {
  story: { title: 'Our Story', desc: 'Tell Members who you are and why you started.', cta1Hint: 'Opens your Locations screen.' },
  about: { title: 'About Us', desc: 'Share what makes your business special.', cta1Hint: 'Opens your Rewards screen.' },
};
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const ICON = {
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 17v3a2 2 0 0 1-2 2C10 22 2 14 2 4a2 2 0 0 1 2-2h3l2 6-3 2a16 16 0 0 0 8 8l2-3z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6.5 15h4"/></svg>',
};

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = (value) => JSON.parse(JSON.stringify(value));
const display = (el, on) => { if (el) el.style.display = on ? '' : 'none'; };
const hasText = (value) => String(value ?? '').trim().length > 0;

function getPath(obj, path) {
  return path.split('.').reduce((node, part) => (node == null ? node : node[part]), obj);
}
function setPath(obj, path, value) {
  const parts = path.split('.');
  const last = parts.pop();
  const target = parts.reduce((node, part) => node[part], obj);
  target[last] = value;
}

function defaults(phoneImage) {
  const values = [
    { title: 'Fresh ideas', desc: 'Seasonal favourites and something new to try.' },
    { title: 'A warm welcome', desc: 'A familiar place for every kind of occasion.' },
    { title: 'A little extra', desc: 'Rewards that make the next visit even better.' },
  ];
  return {
    account: { settings: true, gifts: true, payments: false, orders: true },
    orders: { active: true, history: true, reorder: true },
    referral: {
      image: null,
      headline: 'Give $10. Get $10.',
      description: 'Your friend gets credit on their first visit. You get yours after they join and purchase.',
      buttonText: 'Share invite',
      termsText: 'Referral credit is added automatically once your friend completes their first purchase. Cannot be combined with other sign-up offers.',
      termsLink: 'Read full terms and conditions',
    },
    story: {
      image: phoneImage.story || null,
      headline: 'A place at your table.',
      description: 'Good food brings people together. We make room for the everyday catch-ups, the celebrations, and everything in between.',
      sectionHeading: 'Something to come back to',
      sectionP1: 'Your favourites, a warm welcome, and a little something extra every time you visit.',
      sectionP2: '',
      showValues: false,
      valuesHeading: 'What we stand for',
      values: clone(values),
      showQuote: true,
      quoteText: 'Made with care. Shared with people you love.',
      quoteName: '',
      quoteRole: '',
      cta1: 'Find us',
      cta2: '',
    },
    about: {
      image: phoneImage.about || null,
      headline: 'Good things, made together.',
      description: 'There is more to a great meal than what is on the plate. It is the care that goes into it, and the people you share it with.',
      sectionHeading: '',
      sectionP1: '',
      sectionP2: '',
      showValues: true,
      valuesHeading: '',
      values: clone(values),
      showQuote: false,
      quoteText: 'We wanted to build more than a place to eat. We wanted a place where people feel at home.',
      quoteName: '',
      quoteRole: '',
      cta1: 'Explore your rewards',
      cta2: '',
    },
    contact: {
      image: null,
      headline: 'We are here for you.',
      description: 'A question about your visit or your rewards? Let us know.',
      direct: [
        { title: 'Call us', value: '+1 (555) 010-0100' },
        { title: 'Email us', value: 'hello@example.com' },
        { title: 'Visit a branch', value: 'Locations and opening hours' },
      ],
      feedbackHeading: 'How was your visit?',
      feedbackButton: 'Leave feedback',
    },
  };
}

export function initBuiltInPages(ctx = {}) {
  const { showToast, markDirty } = ctx;
  const l3Body = document.getElementById('l3-body');
  const phoneShell = document.getElementById('app-shell');
  if (!l3Body || !phoneShell) return {};

  const openL3 = (node) => (ctx.openL3Panel || window.openL3Panel)?.(node);
  const closeL3 = () => (ctx.closeL3Panel || window.closeL3Panel)?.();
  const showPhone = (key) => (ctx.showPhonePage || window.showPhonePage)?.(key);
  const phonePage = (key) => phoneShell.querySelector(`.app-page[data-page="${key}"]`);

  window.BUILTIN_PAGES = PAGES.map((p) => ({ ...p }));

  const state = defaults({
    story: phonePage('story')?.querySelector('.member-story-photo')?.getAttribute('src'),
    about: phonePage('about')?.querySelector('.member-about-photo')?.getAttribute('src'),
  });

  /* ------------------------------------------------------------- editors */

  const parsed = document.createElement('div');
  parsed.innerHTML = builtinPagesHtml;
  const imageSnippet = parsed.querySelector('template[data-bp-snippet="image"]');
  const panels = {};

  l3Body.querySelectorAll('[data-bp-page]').forEach((node) => node.remove());

  function buildPanel(key) {
    const tpl = parsed.querySelector(`template[data-bp-template="${TEMPLATE_FOR[key]}"]`);
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.dataset.detail = `bp-${key}`;
    node.dataset.bpPage = key;

    node.querySelectorAll('[data-bp-include="image"]').forEach((slot) => {
      slot.replaceWith(imageSnippet.content.firstElementChild.cloneNode(true));
    });
    if (ABOUT_COPY[key]) {
      node.querySelector('[data-bp-title]').textContent = ABOUT_COPY[key].title;
      node.querySelector('[data-bp-desc]').textContent = ABOUT_COPY[key].desc;
      node.querySelector('[data-bp-cta1-hint]').textContent = ABOUT_COPY[key].cta1Hint;
    }

    node.querySelectorAll('[data-bp-field]').forEach((input) => {
      const path = input.dataset.bpField;
      input.id = `bp-${key}-${path.replace(/\./g, '-')}`;
      input.addEventListener('input', () => {
        setPath(state[key], path, input.value);
        markDirty?.();
        renderPhone(key);
      });
    });
    node.querySelectorAll('[data-bp-toggle]').forEach((toggle) => {
      const name = toggle.dataset.bpToggle;
      toggle.id = `bp-${key}-${name}`;
      toggle.addEventListener('click', () => {
        toggle.classList.toggle('on');
        state[key][name] = toggle.classList.contains('on');
        markDirty?.();
        renderPhone(key);
      });
    });
    node.querySelectorAll('.cp-head-row').forEach((head) => {
      head.addEventListener('click', () => head.parentElement.classList.toggle('open'));
    });
    node.querySelector('.cp-back')?.addEventListener('click', () => closeBuiltInPageEditor());
    wireImage(node, key);
    return node;
  }

  function wireImage(node, key) {
    const zone = node.querySelector('[data-bp-image-zone]');
    if (!zone) return;
    const file = node.querySelector('[data-bp-image-file]');
    const remove = node.querySelector('[data-bp-image-remove]');
    file.id = `bp-${key}-image-file`;

    const accept = (picked) => {
      if (!picked) return;
      if (!/^image\/(png|jpeg|jpg|webp)$/i.test(picked.type)) { showToast?.('Upload a PNG, JPG, or WebP file.', { variant: 'error' }); return; }
      if (picked.size > MAX_IMAGE_BYTES) { showToast?.('This file exceeds the 5 MB limit.', { variant: 'error' }); return; }
      const reader = new FileReader();
      reader.onload = (event) => {
        state[key].image = event.target.result;
        syncImage(key);
        markDirty?.();
        renderPhone(key);
      };
      reader.readAsDataURL(picked);
    };
    zone.addEventListener('click', () => file.click());
    file.addEventListener('change', () => { accept(file.files?.[0]); file.value = ''; });
    ['dragenter', 'dragover'].forEach((name) => zone.addEventListener(name, (event) => { event.preventDefault(); zone.classList.add('is-drag'); }));
    ['dragleave', 'drop'].forEach((name) => zone.addEventListener(name, (event) => { event.preventDefault(); zone.classList.remove('is-drag'); }));
    zone.addEventListener('drop', (event) => accept(event.dataTransfer?.files?.[0]));
    remove.addEventListener('click', (event) => {
      event.stopPropagation();
      state[key].image = null;
      syncImage(key);
      markDirty?.();
      renderPhone(key);
    });
  }

  function syncImage(key) {
    const node = panels[key];
    const zone = node?.querySelector('[data-bp-image-zone]');
    if (!zone) return;
    const image = state[key].image;
    zone.classList.toggle('has-image', !!image);
    const preview = node.querySelector('[data-bp-image-preview]');
    preview.style.display = image ? 'block' : 'none';
    if (image) preview.src = image;
    node.querySelector('[data-bp-image-empty]').style.display = image ? 'none' : 'flex';
    node.querySelector('[data-bp-image-remove]').style.display = image ? 'block' : 'none';
  }

  function syncEditor(key) {
    const node = panels[key];
    if (!node) return;
    node.querySelectorAll('[data-bp-field]').forEach((input) => {
      input.value = getPath(state[key], input.dataset.bpField) ?? '';
    });
    node.querySelectorAll('[data-bp-toggle]').forEach((toggle) => {
      toggle.classList.toggle('on', !!state[key][toggle.dataset.bpToggle]);
    });
    syncImage(key);
  }

  /* --------------------------------------------------------- phone pages */

  const refs = {};

  function prepareAccount() {
    const page = phonePage('account');
    const row = page?.querySelector('.px-profile-actions');
    if (!row) return;
    const byLabel = (label) => [...row.querySelectorAll('button')].find((b) => b.textContent.trim() === label);
    const payments = document.createElement('button');
    payments.type = 'button';
    payments.dataset.phoneAction = 'Payment methods opened';
    payments.innerHTML = `${ICON.card}<span>Payments</span>`;
    byLabel('My gifts')?.after(payments);
    refs.account = { row, settings: byLabel('Edit profile'), gifts: byLabel('My gifts'), payments, orders: byLabel('Orders') };
  }

  function preparePhonePages() {
    prepareAccount();

    const orders = phonePage('orders');
    if (orders) {
      refs.orders = {
        active: orders.querySelector('.px-active-order'),
        head: orders.querySelector('.px-section-head'),
        history: orders.querySelector('.px-order-history'),
      };
    }

    const referral = phonePage('referral');
    const hero = referral?.querySelector('.px-referral-hero');
    if (hero) {
      const photo = document.createElement('img');
      photo.className = 'bp-hero-photo';
      photo.alt = '';
      hero.querySelector('.px-sample-label')?.after(photo);
      const terms = document.createElement('div');
      terms.className = 'bp-referral-terms';
      terms.innerHTML = '<p></p><a href="#"></a>';
      terms.querySelector('a').addEventListener('click', (event) => event.preventDefault());
      referral.querySelector('.px-referral-stats')?.after(terms);
      refs.referral = {
        hero,
        photo,
        people: hero.querySelector('.px-referral-people'),
        title: hero.querySelector(':scope > strong'),
        desc: hero.querySelector(':scope > p'),
        share: hero.querySelector('.px-referral-share'),
        terms,
      };
    }

    ['story', 'about', 'contact'].forEach((key) => {
      const content = phonePage(key)?.querySelector('.member-story-content');
      if (content) refs[key] = { content, label: content.querySelector('.px-sample-label')?.textContent || 'Sample content' };
    });
  }

  function renderAccount() {
    const r = refs.account;
    if (!r) return;
    const s = state.account;
    ['settings', 'gifts', 'payments', 'orders'].forEach((name) => display(r[name], s[name]));
    const visible = ['settings', 'gifts', 'payments', 'orders'].filter((name) => s[name]).length;
    display(r.row, visible > 0);
    r.row.style.gridTemplateColumns = `repeat(${Math.max(visible, 1)}, 1fr)`;
  }

  function renderOrders() {
    const r = refs.orders;
    if (!r) return;
    const s = state.orders;
    display(r.active, s.active);
    display(r.head, s.history);
    display(r.history, s.history);
    r.history?.querySelectorAll('button').forEach((b) => display(b, s.reorder));
  }

  function renderReferral() {
    const r = refs.referral;
    if (!r) return;
    const s = state.referral;
    r.photo.src = s.image || '';
    display(r.photo, !!s.image);
    display(r.people, !s.image);
    r.title.textContent = s.headline;
    display(r.title, hasText(s.headline));
    r.desc.textContent = s.description;
    display(r.desc, hasText(s.description));
    r.share.textContent = s.buttonText;
    display(r.share, hasText(s.buttonText));
    const [text, link] = r.terms.children;
    text.textContent = hasText(s.termsText) ? `* ${s.termsText}` : '';
    display(text, hasText(s.termsText));
    link.textContent = s.termsLink;
    display(link, hasText(s.termsLink));
    display(r.terms, hasText(s.termsText) || hasText(s.termsLink));
  }

  function aboutButtons(key, s) {
    const target = key === 'story' ? 'locations' : 'rewards';
    return [
      hasText(s.cta1) ? `<button class="member-primary-action" type="button" data-member-page="${target}">${esc(s.cta1)}</button>` : '',
      hasText(s.cta2) ? `<button class="${hasText(s.cta1) ? 'member-secondary-action bp-cta-second' : 'member-primary-action'}" type="button" data-member-page="menu">${esc(s.cta2)}</button>` : '',
    ].join('');
  }

  function renderAbout(key) {
    const r = refs[key];
    if (!r) return;
    const s = state[key];
    const hasSection = hasText(s.sectionHeading) || hasText(s.sectionP1) || hasText(s.sectionP2);
    const values = s.values.filter((v) => hasText(v.title) || hasText(v.desc));
    r.content.innerHTML = [
      `<span class="px-sample-label">${esc(r.label)}</span>`,
      s.image ? `<img class="${key === 'story' ? 'member-story-photo' : 'member-about-photo'} bp-photo" src="${esc(s.image)}" alt="" />` : '',
      hasText(s.headline) ? `<h1>${esc(s.headline)}</h1>` : '',
      hasText(s.description) ? `<p>${esc(s.description)}</p>` : '',
      hasSection ? [
        hasText(s.sectionHeading) ? `<h2>${esc(s.sectionHeading)}</h2>` : '',
        hasText(s.sectionP1) ? `<p>${esc(s.sectionP1)}</p>` : '',
        hasText(s.sectionP2) ? `<p>${esc(s.sectionP2)}</p>` : '',
      ].join('') : '',
      s.showValues && values.length ? [
        hasText(s.valuesHeading) ? `<h2>${esc(s.valuesHeading)}</h2>` : '',
        `<dl class="member-values">${values.map((v) => `<div><dt>${esc(v.title)}</dt><dd>${esc(v.desc)}</dd></div>`).join('')}</dl>`,
      ].join('') : '',
      s.showQuote && hasText(s.quoteText) ? [
        `<div class="member-story-quote">${esc(s.quoteText)}</div>`,
        hasText(s.quoteName) || hasText(s.quoteRole)
          ? `<div class="bp-quote-by">${hasText(s.quoteName) ? `<strong>${esc(s.quoteName)}</strong>` : ''}${hasText(s.quoteRole) ? `<span>${esc(s.quoteRole)}</span>` : ''}</div>`
          : '',
      ].join('') : '',
      `<div class="bp-ctas">${aboutButtons(key, s)}</div>`,
    ].join('');
  }

  function renderContact() {
    const r = refs.contact;
    if (!r) return;
    const s = state.contact;
    const [phone, email, place] = s.direct;
    const row = (item, icon, open, close = 'a') => (hasText(item.title) || hasText(item.value) ? `${open}${icon}<span><strong>${esc(item.title)}</strong><small>${esc(item.value)}</small></span><span aria-hidden="true">&#8250;</span></${close}>` : '');
    const rows = [
      row(phone, ICON.phone, `<a href="tel:${esc(phone.value.replace(/[^\d+]/g, ''))}">`),
      row(email, ICON.mail, `<a href="mailto:${esc(email.value.trim())}">`),
      row(place, ICON.pin, '<button type="button" data-member-page="locations">', 'button'),
    ].join('');
    r.content.innerHTML = [
      `<span class="px-sample-label">${esc(r.label)}</span>`,
      s.image ? '<img class="member-story-photo bp-photo" alt="" />' : '',
      hasText(s.headline) ? `<h1>${esc(s.headline)}</h1>` : '',
      hasText(s.description) ? `<p>${esc(s.description)}</p>` : '',
      rows ? `<div class="member-contact-list">${rows}</div>` : '',
      hasText(s.feedbackButton) ? [
        hasText(s.feedbackHeading) ? `<h2>${esc(s.feedbackHeading)}</h2>` : '',
        `<button class="member-secondary-action" type="button" data-phone-action="Feedback form preview opened">${esc(s.feedbackButton)}</button>`,
      ].join('') : '',
    ].join('');
    // Set via the DOM so a long data URL never goes through the HTML parser.
    const photo = r.content.querySelector('.bp-photo');
    if (photo) photo.src = s.image;
  }

  function renderPhone(key) {
    if (key === 'account') renderAccount();
    else if (key === 'orders') renderOrders();
    else if (key === 'referral') renderReferral();
    else if (key === 'story' || key === 'about') renderAbout(key);
    else if (key === 'contact') renderContact();
  }

  /* ------------------------------------------------------------- public */

  function openBuiltInPageEditor(key) {
    const def = PAGES.find((p) => p.key === key);
    if (!def || !def.editable || !panels[key]) return;
    syncEditor(key);
    showPhone(key);
    openL3(panels[key]);
    renderPhone(key);
  }

  function closeBuiltInPageEditor() {
    closeL3();
  }

  function exportBuiltInPages() {
    return { version: 1, pages: clone(state) };
  }

  function importBuiltInPages(saved) {
    const pages = saved?.pages;
    if (!pages || typeof pages !== 'object') return;
    Object.keys(state).forEach((key) => {
      const incoming = pages[key];
      if (!incoming || typeof incoming !== 'object') return;
      const merge = (target, source) => Object.keys(target).forEach((field) => {
        if (!(field in source)) return;
        if (Array.isArray(target[field]) && Array.isArray(source[field])) {
          target[field].forEach((item, i) => { if (source[field][i] && typeof item === 'object') merge(item, source[field][i]); });
        } else if (target[field] !== null && typeof target[field] === 'object') {
          if (source[field] && typeof source[field] === 'object') merge(target[field], source[field]);
        } else if (typeof source[field] === typeof target[field] || field === 'image') {
          target[field] = source[field];
        }
      });
      merge(state[key], incoming);
      syncEditor(key);
      renderPhone(key);
    });
  }

  window.openBuiltInPageEditor = openBuiltInPageEditor;
  window.closeBuiltInPageEditor = closeBuiltInPageEditor;
  window.exportBuiltInPages = exportBuiltInPages;
  window.importBuiltInPages = importBuiltInPages;

  Object.keys(TEMPLATE_FOR).forEach((key) => {
    panels[key] = buildPanel(key);
    l3Body.appendChild(panels[key]);
    syncEditor(key);
  });
  preparePhonePages();
  Object.keys(TEMPLATE_FOR).forEach(renderPhone);

  return {
    builtInPages: PAGES,
    openBuiltInPageEditor,
    closeBuiltInPageEditor,
    exportBuiltInPages,
    importBuiltInPages,
  };
}
