import { createWebsiteEditor } from './websiteScreen.js';

const CHOICES = [
  ['menu', 'Menu'], ['account', 'My Account'], ['orders', 'My Orders'], ['referral', 'Refer a Friend'],
  ['gifts', 'My Gifts'], ['point-shop', 'Point Shop'], ['story', 'Our Story'], ['contact', 'Contact Us'],
  ['about', 'About Us'], ['share-credit', 'Share Credit'], ['locations', 'Locations'], ['more', 'More'],
  ['custom', 'My page'], ['website', 'Your Web Page'],
];
const FALLBACK_BUILTINS = [
  ['account', 'My Account', true], ['orders', 'My Orders', true], ['referral', 'Refer a Friend', true], ['story', 'Our Story', true],
  ['contact', 'Contact Us', true], ['about', 'About Us', true], ['gifts', 'My Gifts', false], ['point-shop', 'Point Shop', false], ['share-credit', 'Share Credit', false],
].map(([key, label, editable]) => ({ key, label, editable }));
const PATHS = [
  ['custom', 'Build a custom page', 'Your own page from Promo Cards, text and images: a campaign, a secret menu or brand content.', '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/>'],
  ['menu', 'Set up your menu', 'Show your menu from your website, a PDF, or build it here.', '<path d="M4 4h16v16H4z"/><path d="M4 9h16M9 4v16"/>'],
  ['builtin', 'Use a built-in page', 'My Account, Refer a Friend, Our Story and other ready-made pages.', '<path d="M12 6c-1.5-1.3-4-2-7-2v14c3 0 5.5.7 7 2 1.5-1.3 4-2 7-2V4c-3 0-5.5.7-7 2z"/><path d="M12 6v14"/>'],
];
const labelFor = (key) => CHOICES.find(([value]) => value === key)?.[1] || 'Menu';
// Already their own tabs, so offering them here shows the same screen twice.
const ALREADY_A_TAB = new Set(['locations', 'more']);
const SLOT_CHOICES = CHOICES.filter(([key]) => !ALREADY_A_TAB.has(key));

const NAV_ICONS = {
  menu: '<path d="M4 4h16v16H4z"/><path d="M4 9h16M9 4v16"/>',
  account: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a8 8 0 0116 0v1"/>',
  orders: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  referral: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.3 10.7l7.4-4.4M8.3 13.3l7.4 4.4"/>',
  gifts: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M4 12h16v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9zM12 8v14"/><path d="M12 8c-1.4-3.6-6-3.4-6-.9 0 2 3 1.4 6 .9zM12 8c1.4-3.6 6-3.4 6-.9 0 2-3 1.4-6 .9z"/>',
  'point-shop': '<path d="M4 8h16l-1.5 12a2 2 0 01-2 1.7H7.5a2 2 0 01-2-1.7L4 8z"/><path d="M8 8V6a4 4 0 018 0v2"/><path d="M9.5 13l1.5 1.5L15 11"/>',
  story: '<path d="M12 6c-1.5-1.3-4-2-7-2v14c3 0 5.5.7 7 2 1.5-1.3 4-2 7-2V4c-3 0-5.5.7-7 2z"/><path d="M12 6v14"/>',
  contact: '<path d="M21 11.5a8.5 8.5 0 01-8.5 8.5 8.3 8.3 0 01-3.9-.9L3 21l1.9-5.6A8.4 8.4 0 013 11.5 8.5 8.5 0 0111.5 3 8.5 8.5 0 0121 11.5z"/>',
  about: '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 11h1v5h1"/>',
  'share-credit': '<path d="M12 20.5C7 17 3 14 3 9.8 3 7 5.2 5 8 5c1.6 0 3.1.9 4 2.3C12.9 5.9 14.4 5 16 5c2.8 0 5 2 5 4.8 0 4.2-4 7.2-9 10.7z"/><path d="M9 12h6M12 9v6"/>',
  locations: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>',
  more: '<circle cx="6" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/>',
  custom: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/>',
  website: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 010 18M12 3a15 15 0 000 18"/>',
};

export function initAppScreenSlot(ctx) {
  const panel = document.getElementById('cp-menu');
  const phone = document.getElementById('app-shell');
  const navItem = document.querySelector('#bottom-nav [data-nav="menu"]');
  if (!panel || !phone || !navItem) return {};
  let type = 'menu';
  let name = navItem.querySelector('span').textContent;
  let orderingName = name;
  let orderingMode = ctx.getOrderingMode?.();
  let syncingName = false;
  let website;
  let savedWebsite;
  let legacy = [];
  const widgets = [];
  const canReplaceScreen = () => ctx.getOrderingMode?.() === 'skip';
  const defaultOrderingName = () => ['native', 'webview'].includes(ctx.getOrderingMode?.()) ? 'Order' : 'Menu';

  const header = document.createElement('div');
  header.className = 'menu-slot-header';
  header.innerHTML = '<h1 class="cp-page-title"></h1>'
    + '<div class="slot-paths" role="group" aria-label="What this tab shows"><div class="slot-paths-lead">What should this tab show?</div>'
    + PATHS.map(([key, label, text, icon]) => `<button type="button" class="slot-path" data-slot-path="${key}"><span class="slot-path-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icon}</svg></span><span class="slot-path-text"><strong>${label}</strong><small>${text}</small></span><span class="slot-path-chev" aria-hidden="true">›</span></button>`).join('')
    + '</div>'
    + '<div class="slot-path-bar" hidden><span class="slot-path-kicker">This tab shows</span><strong class="slot-path-label"></strong><button type="button" class="slot-path-change">Change</button></div>'
    + '<div class="cp-field slot-builtin-field" hidden><label for="menu-builtin-choice">Built-in page</label><select class="cp-select" id="menu-builtin-choice"></select><button type="button" class="cp-add-widget-btn slot-builtin-edit">Edit this page</button><div class="cp-hint-inline slot-builtin-note" hidden>This page shows content from Hub 2, so there is nothing to edit here.</div></div>'
    + '<div class="cp-field slot-name-field"><label for="menu-screen-name">Tab name</label><input class="cp-input-text" id="menu-screen-name" maxlength="24" /></div>';
  const title = header.querySelector('.cp-page-title'); title.textContent = name;
  const include = panel.querySelector('[data-screen-toggle="menu"]');
  if (include) {
    title.after(include);
    include.querySelector('strong').textContent = 'Show in app';
    include.querySelector('small')?.remove();
    include.setAttribute('aria-label', 'Show this screen in app');
  }
  panel.prepend(header);
  const nameInput = header.querySelector('#menu-screen-name'); nameInput.value = name;
  const pathsEl = header.querySelector('.slot-paths');
  const pathBar = header.querySelector('.slot-path-bar');
  const builtinField = header.querySelector('.slot-builtin-field');
  const builtinChoice = header.querySelector('#menu-builtin-choice');
  const builtinEdit = header.querySelector('.slot-builtin-edit');
  const builtinNote = header.querySelector('.slot-builtin-note');
  // With ordering off, the tab is the merchant's to fill: their own page, a menu,
  // or one of the app's built-in pages. Null means they have not picked yet.
  let path = null;
  // A tab showing a custom page takes the page's name until the merchant renames the tab.
  let nameFollowsPage = true;
  const builtinList = () => (window.BUILTIN_PAGES?.length ? window.BUILTIN_PAGES : FALLBACK_BUILTINS).filter((item) => item.key !== 'menu');
  const isBuiltin = (key) => builtinList().some((item) => item.key === key);
  const builtinEditable = (key) => builtinList().some((item) => item.key === key && item.editable);
  function fillBuiltinChoice() {
    const items = builtinList();
    const current = isBuiltin(type) ? type : items[0]?.key;
    builtinChoice.innerHTML = items.map((item) => `<option value="${item.key}">${item.label}</option>`).join('');
    builtinChoice.value = current;
  }
  const customHost = document.createElement('div'); customHost.className = 'custom-screen-config'; customHost.hidden = true;
  customHost.innerHTML = '<div class="cp-field slot-page-field"><label for="menu-page-choice">Your page</label><select class="cp-select" id="menu-page-choice"></select><button class="cp-add-widget-btn" type="button" data-slot-edit-page>Edit this page</button></div><button class="cp-add-widget-btn" type="button" data-slot-create-page>+ Create a new page</button><div class="cp-hint-inline">Pages are built from Promo Cards, Text Blocks, Text Dividers and Image Banners.</div>';
  const websiteHost = document.createElement('div'); websiteHost.className = 'screen-website-host'; websiteHost.hidden = true;
  header.after(customHost, websiteHost);
  const customPage = document.createElement('div');
  customPage.className = 'app-page custom-app-page'; customPage.dataset.page = 'custom-menu';
  customPage.innerHTML = '<div class="app-top-header"><strong></strong></div><div class="custom-screen-empty">Choose a page, or create one, to show in this tab</div>';
  const websitePage = document.createElement('div'); websitePage.className = 'app-page'; websitePage.dataset.page = 'website-menu';
  phone.append(customPage, websitePage);
  const pageChoice = customHost.querySelector('#menu-page-choice');
  let selectedPageId = null;
  const customPages = () => window.getCustomPages?.() || [];
  const selectedPage = () => customPages().find((item) => item.id === selectedPageId) || null;
  function fillPageChoice() {
    const pages = customPages();
    if (!pages.some((item) => item.id === selectedPageId)) selectedPageId = pages[0]?.id || null;
    pageChoice.innerHTML = pages.length
      ? pages.map((item) => `<option value="${item.id}">${item.name.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))}</option>`).join('')
      : '<option value="">No pages yet</option>';
    pageChoice.value = selectedPageId || '';
    customHost.querySelector('.slot-page-field').hidden = !pages.length;
  }
  pageChoice.addEventListener('change', () => {
    selectedPageId = pageChoice.value || null;
    if (isDefaultName('custom')) nameFollowsPage = true;
    followPageName();
    render();
    ctx.markDirty();
    document.dispatchEvent(new CustomEvent('como:pages-changed'));
  });
  customHost.querySelector('[data-slot-create-page]').addEventListener('click', () => window.createPageFlow?.({ source: 'tab' }));
  customHost.querySelector('[data-slot-edit-page]').addEventListener('click', () => { if (selectedPageId) window.openCustomPage?.(selectedPageId, 'menu'); });
  // The tab takes the page's name until the merchant renames the tab themselves.
  function followPageName() {
    const page = selectedPage();
    if (!page || !canReplaceScreen() || type !== 'custom' || !nameFollowsPage) return;
    name = page.name;
    nameInput.value = name;
    applyName();
  }
  window.getSlotPageKey = () => (canReplaceScreen() && type === 'custom' ? selectedPage()?.key || null : null);
  window.setSlotPage = (id) => {
    type = 'custom'; path = 'custom'; selectedPageId = id;
    fillPageChoice();
    followPageName();
    render();
    ctx.markDirty();
    document.dispatchEvent(new CustomEvent('como:pages-changed'));
  };
  window.clearSlotPage = () => {
    if (type !== 'custom') return;
    selectedPageId = null;
    fillPageChoice();
    render({ preview: window.getCurrentStep?.() === 'menu' });
  };
  document.addEventListener('como:pages-changed', () => {
    fillPageChoice();
    const page = selectedPage();
    if (type === 'custom' && canReplaceScreen() && nameFollowsPage && page && name !== page.name) {
      nameInput.value = page.name;
      applyName();
    }
  });

  function target() {
    if (!canReplaceScreen()) return 'menu';
    if (type === 'custom') return selectedPage()?.key || 'custom-menu';
    if (type === 'website') return `${type}-menu`;
    if (type === 'account' && document.body.dataset.memberPreview === 'guest') return 'login';
    return type;
  }

  function syncVisibleName() {
    const visibleName = canReplaceScreen() ? name : orderingName;
    if (document.activeElement !== nameInput) nameInput.value = visibleName;
    if (navItem.querySelector('span').textContent === visibleName && title.textContent.trim() === visibleName) return;
    syncingName = true;
    try { ctx.renameAppScreen('menu', visibleName); }
    finally { syncingName = false; }
  }

  function applyName() {
    if (canReplaceScreen()) name = nameInput.value.trim() || labelFor(type);
    else orderingName = nameInput.value.trim() || defaultOrderingName();
    syncVisibleName();
    customPage.querySelector('.app-top-header strong').textContent = name;
    if (website) { website.state.name = name; website.render(); }
  }

  function render({ preview = true, resetMenu = false, syncOrdering = false } = {}) {
    const allowed = canReplaceScreen();
    const picking = allowed && !path;
    const visibleType = !allowed ? 'menu' : picking ? 'pick' : type;
    panel.dataset.screenType = visibleType;
    pathsEl.hidden = !picking;
    pathBar.hidden = !(allowed && path);
    pathBar.querySelector('.slot-path-label').textContent = PATHS.find(([key]) => key === path)?.[1] || '';
    builtinField.hidden = !(allowed && path === 'builtin');
    if (allowed && path === 'builtin') {
      fillBuiltinChoice();
      builtinEdit.hidden = !builtinEditable(type);
      builtinNote.hidden = builtinEditable(type);
    }
    nameInput.closest('.cp-field').hidden = !(allowed && path);
    nameInput.disabled = !allowed;
    customHost.hidden = !(allowed && path === 'custom');
    if (allowed && path === 'custom') fillPageChoice();
    websiteHost.hidden = visibleType !== 'website';
    syncVisibleName();
    if (visibleType === 'website') {
      if (!website) website = createWebsiteEditor(ctx, { key: 'menu-slot', host: websiteHost, page: websitePage, saved: { ...savedWebsite, name } });
      else website.render();
    }
    if (visibleType === 'menu' && (resetMenu || syncOrdering)) {
      panel.classList.add('px-show-advanced');
      ctx.showMenuForOrdering(ctx.getOrderingMode?.());
    }
    if (preview) {
      window.showPhonePage(target());
      document.querySelectorAll('#bottom-nav .nav-item').forEach((item) => item.classList.toggle('active', item === navItem));
    }
    const navIcon = navItem.querySelector('svg');
    if (navIcon) navIcon.innerHTML = NAV_ICONS[isBuiltin(type) || type === 'custom' ? type : 'menu'] || NAV_ICONS.menu;
  }

  const isDefaultName = (prev) => !nameInput.value.trim() || name === labelFor(prev) || ['Menu', 'Order', 'One of my pages'].includes(name) || customPages().some((item) => item.name === name);
  function setType(next) {
    const previous = type;
    const keepName = !isDefaultName(previous);
    type = next;
    if (!keepName) {
      nameInput.value = next === 'custom' ? (selectedPage()?.name || 'My page') : labelFor(next);
      nameFollowsPage = true;
    }
    window.closeL3Panel?.();
    applyName();
  }

  header.querySelectorAll('[data-slot-path]').forEach((button) => button.addEventListener('click', () => {
    if (!canReplaceScreen()) return;
    path = button.dataset.slotPath;
    if (path === 'menu') { setType('menu'); render({ resetMenu: true }); }
    else if (path === 'custom') { fillPageChoice(); setType('custom'); followPageName(); render(); }
    else {
      fillBuiltinChoice();
      setType(builtinChoice.value);
      render();
      if (builtinEditable(type)) window.openBuiltInPageEditor?.(type);
    }
    ctx.markDirty();
    document.dispatchEvent(new CustomEvent('como:pages-changed'));
  }));
  pathBar.querySelector('.slot-path-change').addEventListener('click', () => {
    path = null;
    window.closeL3Panel?.();
    render();
  });
  builtinChoice.addEventListener('change', () => {
    setType(builtinChoice.value);
    render();
    if (builtinEditable(type)) window.openBuiltInPageEditor?.(type);
    ctx.markDirty();
  });
  builtinEdit.addEventListener('click', () => window.openBuiltInPageEditor?.(type));
  nameInput.addEventListener('input', () => { nameFollowsPage = false; applyName(); ctx.markDirty(); });
  document.addEventListener('como:screenname', (event) => {
    if (event.detail.key !== 'menu' || syncingName) return;
    if (canReplaceScreen()) name = event.detail.name;
    else orderingName = event.detail.name;
    if (document.activeElement !== nameInput) nameInput.value = event.detail.name;
    customPage.querySelector('.app-top-header strong').textContent = name;
    if (website) { website.state.name = name; website.render(); }
  });
  document.addEventListener('como:screenstate', (event) => {
    if (event.detail.key === 'menu' && event.detail.enabled && window.getCurrentStep() === 'menu') render();
  });
  document.addEventListener('como:stepchange', (event) => {
    if (event.detail.step === 'menu') render({ syncOrdering: !canReplaceScreen() });
  });
  document.querySelectorAll('.px-preview-state [data-member-state]').forEach((button) => button.addEventListener('click', () => {
    website?.render();
    if (window.getCurrentStep() === 'menu') render();
  }));
  document.addEventListener('como:ordering-mode', (event) => {
    const nextMode = event.detail.mode;
    const changed = nextMode !== orderingMode;
    if (changed && nextMode !== 'skip') orderingName = defaultOrderingName();
    orderingMode = nextMode;
    render({ preview: window.getCurrentStep() === 'menu', syncOrdering: changed });
  });

  function refreshOriginalLabels() {
    document.querySelectorAll('#side-screen-list .side-step').forEach((button) => {
      const included = ctx.getScreenState(button.dataset.step);
      let badge = button.querySelector('.screen-off-badge');
      if (!badge) { badge = document.createElement('span'); badge.className = 'screen-off-badge'; badge.textContent = 'Not in app'; button.appendChild(badge); }
      badge.hidden = included;
      button.classList.toggle('screen-off', !included);
    });
  }
  document.addEventListener('como:screenstate', refreshOriginalLabels);
  document.addEventListener('como:draft-restored', refreshOriginalLabels);
  refreshOriginalLabels();

  const destinations = { 'Our Story': 'story', 'Contact Us': 'contact', 'About Us': 'about' };
  document.querySelectorAll('.more-tile').forEach((tile) => {
    const destination = destinations[tile.querySelector('.t-name')?.textContent.trim()];
    if (destination) tile.dataset.memberPage = destination;
  });
  [['share-credit', 'Share Credit', 'Send a little treat'], ['gifts', 'My Gifts', 'Your gifts in one place'], ['point-shop', 'Point Shop', 'Choose your next reward']].forEach(([key, label, subtitle]) => {
    const tile = document.querySelector('.more-tile:nth-child(7)').cloneNode(true);
    tile.removeAttribute('onclick'); tile.dataset.memberPage = key; tile.classList.remove('hidden-slot');
    tile.querySelector('.t-name').textContent = label; tile.querySelector('.t-sub').textContent = subtitle;
    const tileIcon = tile.querySelector('.t-ic svg');
    if (tileIcon && NAV_ICONS[key]) tileIcon.innerHTML = NAV_ICONS[key];
    document.querySelector('.more-grid').appendChild(tile);
    const row = document.createElement('div'); row.className = 'cp-toggle-row';
    const text = document.createElement('span'); text.className = 'lbl'; text.textContent = label;
    const toggle = document.createElement('span'); toggle.className = 'toggle on'; toggle.dataset.bind = `.more-tile[data-member-page="${key}"]`;
    toggle.setAttribute('role', 'switch'); toggle.setAttribute('aria-label', label); toggle.setAttribute('aria-checked', 'true'); toggle.tabIndex = 0;
    ctx.wireToggle(toggle);
    toggle.addEventListener('click', () => toggle.setAttribute('aria-checked', String(toggle.classList.contains('on'))));
    toggle.addEventListener('keydown', (event) => { if ([' ', 'Enter'].includes(event.key)) { event.preventDefault(); toggle.click(); } });
    row.append(text, toggle); document.querySelector('#cp-more .cp-toggle-row').parentElement.appendChild(row);
  });
  const required = document.createElement('span'); required.className = 'screen-required'; required.textContent = 'Always in your app';
  document.querySelector('#cp-rewards .cp-page-title')?.after(required);
  ctx.refreshScreenNavigation();
  render({ preview: false, resetMenu: true });

  function capture() {
    return [{
      key: 'menu', type, path, name, orderingName, pageId: selectedPageId,
      website: website?.state || savedWebsite,
      legacy,
    }];
  }

  function restore(saved = []) {
    const data = saved.find((item) => item.key === 'menu') || saved[0];
    if (!data) return;
    legacy = data.legacy || saved.filter((item) => item !== data);
    type = SLOT_CHOICES.some(([key]) => key === data.type) && data.type !== 'website' ? data.type : 'menu';
    path = data.path !== undefined ? data.path : type === 'custom' ? 'custom' : isBuiltin(type) ? 'builtin' : null;
    selectedPageId = data.pageId || selectedPageId;
    name = data.name || labelFor(type); nameInput.value = name;
    orderingName = ['native', 'webview'].includes(ctx.getOrderingMode?.()) ? 'Order' : data.orderingName || defaultOrderingName();
    savedWebsite = data.website || legacy.find((item) => item.type === 'website')?.website;
    if (website) {
      website.element.remove(); website = null;
    }
    customPage.querySelector('.app-top-header strong').textContent = name;
    render({ preview: window.getCurrentStep() === 'menu' });
  }

  return {
    resolveAppScreen: (key) => key === 'menu' ? target() : key,
    getAppScreenTargets: () => ({ menu: target() }),
    exportAppScreens: capture,
    importAppScreens: restore,
  };
}