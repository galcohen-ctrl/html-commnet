import { createWebsiteEditor } from './websiteScreen.js';

const CHOICES = [
  ['menu', 'Menu'], ['account', 'My Account'], ['orders', 'My Orders'], ['referral', 'Refer a Friend'],
  ['gifts', 'My Gifts'], ['point-shop', 'Point Shop'], ['story', 'Our Story'], ['contact', 'Contact Us'],
  ['about', 'About Us'], ['share-credit', 'Share Credit'], ['locations', 'Locations'], ['more', 'More'],
  ['custom', 'Custom Screen'], ['website', 'Your Web Page'],
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
  header.innerHTML = '<h1 class="cp-page-title"></h1><div class="cp-field"><label for="menu-screen-choice">Screen</label><select class="cp-select" id="menu-screen-choice"></select></div><div class="cp-field"><label for="menu-screen-name">Tab name</label><input class="cp-input-text" id="menu-screen-name" maxlength="24" /></div>';
  const title = header.querySelector('.cp-page-title'); title.textContent = name;
  const include = panel.querySelector('[data-screen-toggle="menu"]');
  if (include) {
    title.after(include);
    include.querySelector('strong').textContent = 'Show in app';
    include.querySelector('small')?.remove();
    include.setAttribute('aria-label', 'Show this screen in app');
  }
  panel.prepend(header);
  const choice = header.querySelector('select');
  const nameInput = header.querySelector('input'); nameInput.value = name;
  SLOT_CHOICES.forEach(([value, label]) => {
    const option = document.createElement('option'); option.value = value; option.textContent = label;
    choice.appendChild(option);
  });
  const customHost = document.createElement('div'); customHost.className = 'custom-screen-config'; customHost.hidden = true;
  customHost.innerHTML = '<div class="custom-widget-list"></div><div class="cp-add-widget-wrap"><button class="cp-add-widget-btn" type="button" data-custom-add>+ Add widget</button><div class="cp-add-widget-menu"><button type="button" data-custom-widget="promo">Promo Cards</button><button type="button" data-custom-widget="divider">Text Divider</button><button type="button" data-custom-widget="image">Image Banner</button></div></div>';
  const websiteHost = document.createElement('div'); websiteHost.className = 'screen-website-host'; websiteHost.hidden = true;
  header.after(customHost, websiteHost);
  const customPage = document.createElement('div');
  customPage.className = 'app-page custom-app-page'; customPage.dataset.page = 'custom-menu';
  customPage.innerHTML = '<div class="app-top-header"><strong></strong></div><div class="custom-widget-stage"></div><div class="custom-screen-empty">No content yet</div>';
  const websitePage = document.createElement('div'); websitePage.className = 'app-page'; websitePage.dataset.page = 'website-menu';
  phone.append(customPage, websitePage);
  const list = customHost.querySelector('.custom-widget-list');
  const stage = customPage.querySelector('.custom-widget-stage');
  const empty = customPage.querySelector('.custom-screen-empty');

  function target() {
    if (!canReplaceScreen()) return 'menu';
    if (type === 'custom' || type === 'website') return `${type}-menu`;
    if (type === 'account' && document.body.dataset.memberPreview === 'guest') return 'login';
    return type;
  }

  function reorder() {
    [...list.querySelectorAll('.cp-widget-row')].forEach((row) => {
      const widget = widgets.find((item) => item.row === row);
      if (widget) stage.appendChild(widget.element);
    });
    empty.hidden = stage.children.length > 0;
  }

  function addWidget(kind, saved, restoring = false) {
    const factory = { promo: ctx.createPromoInstance, divider: ctx.createTextDivider, image: ctx.createImageBanner }[kind];
    if (!factory) return;
    widgets.push(factory({ stage, config: panel, list, saved, restoring }));
    reorder();
  }
  ctx.initReorderable(list, () => { reorder(); ctx.markDirty(); });
  new MutationObserver(reorder).observe(list, { childList: true });
  const addMenu = customHost.querySelector('.cp-add-widget-menu');
  customHost.querySelector('[data-custom-add]').addEventListener('click', (event) => { event.stopPropagation(); addMenu.classList.toggle('open'); });
  document.addEventListener('click', () => addMenu.classList.remove('open'));
  customHost.querySelectorAll('[data-custom-widget]').forEach((button) => button.addEventListener('click', () => {
    addMenu.classList.remove('open'); addWidget(button.dataset.customWidget);
  }));

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
    const visibleType = allowed ? type : 'menu';
    panel.dataset.screenType = visibleType;
    choice.closest('.cp-field').hidden = !allowed;
    nameInput.closest('.cp-field').hidden = !allowed;
    choice.disabled = !allowed;
    nameInput.disabled = !allowed;
    choice.title = allowed ? '' : 'Available when online ordering is set to Not yet.';
    choice.value = visibleType;
    customHost.hidden = visibleType !== 'custom';
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
    if (navIcon) navIcon.innerHTML = NAV_ICONS[visibleType] || NAV_ICONS.menu;
  }

  choice.addEventListener('change', () => {
    if (!canReplaceScreen()) { render({ preview: false }); return; }
    const previous = type;
    type = choice.value;
    if (name === labelFor(previous) || ['Menu', 'Order'].includes(name) || !nameInput.value.trim()) nameInput.value = labelFor(type);
    window.closeL3Panel?.();
    applyName();
    render({ resetMenu: type === 'menu' });
    ctx.markDirty();
  });
  nameInput.addEventListener('input', () => { applyName(); ctx.markDirty(); });
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
      key: 'menu', type, name, orderingName,
      website: website?.state || savedWebsite,
      widgets: [...list.querySelectorAll('.cp-widget-row')].map((row) => widgets.find((widget) => widget.row === row)).filter(Boolean).map((widget) => widget.capture()),
      legacy,
    }];
  }

  function restore(saved = []) {
    const data = saved.find((item) => item.key === 'menu') || saved[0];
    if (!data) return;
    legacy = data.legacy || saved.filter((item) => item !== data);
    type = SLOT_CHOICES.some(([key]) => key === data.type) ? data.type : 'menu';
    name = data.name || labelFor(type); nameInput.value = name;
    orderingName = ['native', 'webview'].includes(ctx.getOrderingMode?.()) ? 'Order' : data.orderingName || defaultOrderingName();
    [...list.querySelectorAll('.w-del-icon')].forEach((button) => button.click());
    widgets.length = 0;
    const restoredWidgets = data.widgets?.length ? data.widgets : legacy.find((item) => item.type === 'custom')?.widgets || [];
    restoredWidgets.forEach((widget) => addWidget(widget.type, widget, true));
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