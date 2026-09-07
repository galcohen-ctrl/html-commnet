import { createWebsiteEditor } from './websiteScreen.js';

const CHOICES = [
  ['menu', 'Menu'], ['account', 'My Account'], ['orders', 'My Orders'], ['referral', 'Refer a Friend'],
  ['gifts', 'My Gifts'], ['point-shop', 'Point Shop'], ['story', 'Our Story'], ['contact', 'Contact Us'],
  ['about', 'About Us'], ['share-credit', 'Share Credit'], ['locations', 'Locations'], ['more', 'More'],
  ['custom', 'Custom Screen'], ['website', 'Your Web Page'],
];
const labelFor = (key) => CHOICES.find(([value]) => value === key)?.[1] || 'Menu';

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
  CHOICES.forEach(([value, label]) => {
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
    type = CHOICES.some(([key]) => key === data.type) ? data.type : 'menu';
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