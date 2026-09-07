/**
 * Ordering widgets — Order Again, Top Items, Menu Categories, Menu Reels.
 *
 * The first three are gated on the online-ordering native integration: their
 * config rows sit disabled until `settings.ordering.connected` is true, because
 * their content comes from the provider. Clicking a disabled row opens the
 * Online Ordering wizard in the settings modal. When the wizard finishes,
 * `orderingWizardOrigin` steers where the merchant lands next (see Ship 3
 * origin routing).
 *
 * Menu Reels is NOT gated. Its media is uploaded by the merchant, so it works
 * on every ordering path — native, a linked website, or none at all.
 */

import { LAST_ORDER, PAST_ORDERS, TOP_ITEMS, MENU_CATEGORIES, MENU_REELS, REELS_CHIP_DEFAULTS } from '../data/orderingMock.js';

// Keys of every widget that requires online ordering to work. Menu Reels is
// absent on purpose: the merchant supplies its media, so it needs no provider.
const OO_WIDGET_KEYS = ['order-again', 'top-items', 'menu-categories'];

// Reel media is either a clip or a still. A typed URL is classified by its
// extension; an upload states its kind outright, so nothing has to be guessed.
const VIDEO_URL = /\.(mp4|m4v|mov|webm)(\?|#|$)/i;
function mediaKindFromUrl(url) {
  if (!url) return 'video';
  if (url.startsWith('data:video') || url.startsWith('blob:video')) return 'video';
  if (url.startsWith('data:image')) return 'image';
  return VIDEO_URL.test(url) ? 'video' : 'image';
}
const reelSource = (reel) => (reel.mediaType === 'image' ? reel.image : reel.video) || '';

function escHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

export function initOrderingWidgets(ctx) {
  const { showToast, markDirty, openDrill, closeL3Panel, openL3Panel, openL4Panel, closeL4Panel } = ctx;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const state = {
    orderAgain: {
      layout: 'hero',
      showImage: true,
      showMeta: true,
      eyebrow: 'Your last order',
      buttonLabel: 'Reorder',
      empty: LAST_ORDER,
      orders: PAST_ORDERS.map((o) => ({ ...o })),
    },
    topItems: {
      title: 'Popular right now',
      layout: 'carousel',
      showPrice: true,
      showSeeAll: true,
      items: TOP_ITEMS.map((i) => ({ ...i })),
      editing: null,
    },
    menuCategories: {
      title: 'Browse the menu',
      cols: 3,
      showCount: true,
      items: MENU_CATEGORIES.map((c) => ({ ...c })),
      editing: null,
    },
    menuReels: {
      chipLabel: REELS_CHIP_DEFAULTS.label,
      autoOpen: REELS_CHIP_DEFAULTS.autoOpen,
      dismissible: REELS_CHIP_DEFAULTS.dismissible,
      items: MENU_REELS.map((r) => ({ mediaType: 'video', image: '', mediaName: '', ...r })),
      editing: null,
      activeIdx: 0,
      autoAdvanceTimer: null,
    },
  };

  /* ============================================================ Gating */

  function isOrderingConnected() {
    return typeof window.isOrderingConnected === 'function'
      ? window.isOrderingConnected()
      : false;
  }

  function applyGating() {
    const connected = isOrderingConnected();
    document.querySelectorAll('.cp-widget-row.cp-oo-widget').forEach((row) => {
      row.classList.toggle('locked', !connected);
      const toggle = row.querySelector('.toggle');
      if (toggle) {
        toggle.classList.toggle('locked-toggle', !connected);
        toggle.setAttribute('aria-disabled', String(!connected));
      }
    });
    document.body.classList.toggle('oo-connected', connected);
  }

  // Track WHERE the wizard was opened from so we can route the user back after save.
  function openOrderingWizardFrom(originKey) {
    window.orderingWizardOrigin = originKey;
    if (typeof window.openSettings === 'function') {
      window.openSettings('online-ordering', 'chooser');
    }
  }

  // Intercept clicks on locked ordering-widget rows and open the wizard instead of toggling.
  document.addEventListener('click', (event) => {
    if (document.body.classList.contains('gf-applying-preset') || document.body.classList.contains('gf-restoring')) return;
    if (isOrderingConnected()) return;
    const row = event.target.closest('.cp-widget-row.cp-oo-widget');
    if (!row || !row.classList.contains('locked')) return;
    // Let the drag handle mousedown flow start a drag; only intercept clicks.
    event.preventDefault();
    event.stopPropagation();
    openOrderingWizardFrom('home-widget:' + row.dataset.ooWidget);
    showToast('Connect your online ordering provider to unlock this widget');
  }, true);

  // React to ordering connection changes fired by the settings modal.
  document.addEventListener('como:ordering', (event) => {
    applyGating();
    // Only route the merchant back home when the wizard actually closes ('saved').
    // 'connected' fires mid-wizard at the locations step and shouldn't disrupt them.
    const reason = event.detail?.reason;
    if (reason !== 'saved') return;
    if (isOrderingConnected() && typeof window.orderingWizardOrigin === 'string'
        && window.orderingWizardOrigin.startsWith('home-widget:')) {
      const key = window.orderingWizardOrigin.slice('home-widget:'.length);
      const toggle = document.querySelector('[data-widget-toggle="' + key + '"]');
      const row = toggle && toggle.closest('.cp-widget-row');
      if (toggle && row && !toggle.classList.contains('on')) toggle.click();
      const homeStep = document.querySelector('.side-step[data-step="home"]');
      if (homeStep) homeStep.click();
      if (row) row.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
      window.orderingWizardOrigin = null;
      showToast('Online ordering connected · this widget is now live');
    }
  });

  /* ==================================================== Order Again */

  const oaWidget = document.querySelector('.oa-widget');
  const OA_REORDER_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 01-9 9 9 9 0 01-7.6-4.2"/><path d="M3 12a9 9 0 019-9 9 9 0 017.6 4.2"/><path d="M20 3v5h-5M4 21v-5h5"/></svg>';
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const oaOrders = () => state.orderAgain.orders || [];

  // The header sub-line names whichever order is currently centered, so swiping
  // keeps the "when / where" context in view above the card.
  function oaUpdateActive(i) {
    const orders = oaOrders();
    const idx = Math.max(0, Math.min(i, orders.length - 1));
    const o = orders[idx];
    if (!o || !oaWidget) return;
    const when = oaWidget.querySelector('#oa-when');
    if (when) when.textContent = o.when + ' · ' + o.location;
    oaWidget.querySelectorAll('#oa-dots .pc-dot').forEach((d, k) => d.classList.toggle('active', k === idx));
  }

  function renderOrderAgain() {
    if (!oaWidget) return;
    const s = state.orderAgain;
    oaWidget.dataset.oaLayout = s.layout;
    oaWidget.classList.toggle('no-image', !s.showImage);
    oaWidget.classList.toggle('no-meta', !s.showMeta);
    oaWidget.querySelector('.oa-eyebrow').textContent = s.eyebrow;
    const carousel = oaWidget.querySelector('#oa-carousel');
    const dots = oaWidget.querySelector('#oa-dots');
    const orders = oaOrders();
    if (carousel) {
      carousel.innerHTML = orders.map((o) => (
        '<div class="oa-card">'
        + '<div class="oa-img" style="background-image:url(' + o.itemImage + ')"></div>'
        + '<div class="oa-body">'
        +   '<div class="oa-name">' + esc(o.itemName) + '</div>'
        +   '<div class="oa-meta">' + esc(o.addOns) + '</div>'
        +   '<div class="oa-price">' + esc(o.price) + '</div>'
        + '</div>'
        + '<button class="oa-btn" type="button">' + OA_REORDER_SVG + ' ' + esc(s.buttonLabel) + '</button>'
        + '</div>'
      )).join('');
    }
    if (dots) {
      dots.innerHTML = orders.map((_, i) => '<span class="pc-dot' + (i === 0 ? ' active' : '') + '" data-oa-dot="' + i + '"></span>').join('');
      dots.style.display = orders.length > 1 ? '' : 'none';
    }
    const i = carousel ? Math.round(carousel.scrollLeft / (carousel.offsetWidth || 1)) : 0;
    oaUpdateActive(i);
  }

  function wireOrderAgain() {
    const carousel = oaWidget?.querySelector('#oa-carousel');
    if (carousel) {
      carousel.addEventListener('scroll', () => {
        oaUpdateActive(Math.round(carousel.scrollLeft / (carousel.offsetWidth || 1)));
      });
    }
    oaWidget?.addEventListener('click', (e) => {
      const dot = e.target.closest('[data-oa-dot]');
      if (dot && carousel) {
        const i = parseInt(dot.dataset.oaDot);
        carousel.scrollTo({ left: i * carousel.offsetWidth, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
        return;
      }
      if (e.target.closest('.oa-btn')) showToast?.('Added your order to the cart');
    });
    document.querySelectorAll('[data-oa-layout]').forEach((r) => {
      r.addEventListener('click', () => {
        document.querySelectorAll('[data-oa-layout]').forEach((x) => x.classList.remove('active'));
        r.classList.add('active');
        state.orderAgain.layout = r.dataset.oaLayout;
        renderOrderAgain();
        markDirty?.();
      });
    });
    document.getElementById('oa-toggle-image')?.addEventListener('click', function () {
      state.orderAgain.showImage = this.classList.contains('on');
      renderOrderAgain();
      markDirty?.();
    });
    document.getElementById('oa-toggle-meta')?.addEventListener('click', function () {
      state.orderAgain.showMeta = this.classList.contains('on');
      renderOrderAgain();
      markDirty?.();
    });
    document.getElementById('oa-eyebrow-input')?.addEventListener('input', (e) => {
      state.orderAgain.eyebrow = e.target.value;
      renderOrderAgain();
      markDirty?.();
    });
    document.getElementById('oa-btn-input')?.addEventListener('input', (e) => {
      state.orderAgain.buttonLabel = e.target.value;
      renderOrderAgain();
      markDirty?.();
    });
  }

  /* ==================================================== Top Items */

  const tiWidget = document.querySelector('.ti-widget');
  const tiCarousel = document.getElementById('ti-carousel');
  const tiItemsList = document.getElementById('ti-items-list');

  function renderTopItemsPhone() {
    if (!tiWidget || !tiCarousel) return;
    tiWidget.dataset.tiLayout = state.topItems.layout;
    tiWidget.classList.toggle('no-price', !state.topItems.showPrice);
    tiWidget.querySelector('.ti-title').textContent = state.topItems.title;
    tiWidget.querySelector('.ti-see-all').style.display = state.topItems.showSeeAll ? '' : 'none';
    tiCarousel.innerHTML = '';
    state.topItems.items.filter((i) => i.visible).forEach((item) => {
      const card = document.createElement('div');
      card.className = 'ti-card';
      card.dataset.tiId = item.id;
      card.innerHTML =
        '<div class="ti-card-img" style="background-image:url(' + escHtml(item.image) + ')">'
        + (item.badge ? '<span class="ti-badge">' + escHtml(item.badge) + '</span>' : '')
        + '</div>'
        + '<div class="ti-card-body">'
        + '<div class="ti-card-name">' + escHtml(item.name) + '</div>'
        + '<div class="ti-card-price">' + escHtml(item.price) + '</div>'
        + '</div>'
        + '<button class="ti-add-btn" type="button">+</button>';
      tiCarousel.appendChild(card);
    });
  }

  function renderTopItemsList() {
    if (!tiItemsList) return;
    tiItemsList.innerHTML = '';
    state.topItems.items.forEach((item, idx) => {
      const row = document.createElement('div');
      row.className = 'pc-item';
      row.dataset.tiIdx = idx;
      row.innerHTML =
        '<span class="handle">⠿</span>'
        + '<span class="pc-item-name">' + escHtml(item.name) + '</span>'
        + '<button class="pc-vis ' + (item.visible ? 'on' : '') + '" title="Toggle visibility"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/><circle cx="10" cy="10" r="3"/></svg></button>'
        + '<button class="pc-del" title="Remove"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 6h12M8 6V4h4v2M6 6v10a1 1 0 001 1h6a1 1 0 001-1V6"/></svg></button>'
        + '<span class="pc-item-chev">›</span>';
      row.querySelector('.pc-vis').addEventListener('click', (e) => {
        e.stopPropagation();
        item.visible = !item.visible;
        renderTopItemsList();
        renderTopItemsPhone();
        markDirty?.();
      });
      row.querySelector('.pc-del').addEventListener('click', (e) => {
        e.stopPropagation();
        state.topItems.items.splice(idx, 1);
        renderTopItemsList();
        renderTopItemsPhone();
        document.getElementById('ti-count').textContent = state.topItems.items.length;
        markDirty?.();
      });
      row.addEventListener('click', (e) => {
        if (e.target.closest('.pc-vis') || e.target.closest('.pc-del') || e.target.closest('.handle')) return;
        openTopItemEdit(idx);
      });
      tiItemsList.appendChild(row);
    });
    document.getElementById('ti-count').textContent = state.topItems.items.length;
  }

  function openTopItemEdit(idx) {
    state.topItems.editing = idx;
    const item = state.topItems.items[idx];
    if (!item) return;
    document.getElementById('ti-item-title').textContent = item.name || 'Edit item';
    document.getElementById('ti-item-name').value = item.name;
    document.getElementById('ti-item-price').value = item.price;
    document.getElementById('ti-item-badge').value = item.badge || '';
    document.getElementById('ti-item-image').value = item.image;
    const cpHome = document.getElementById('cp-home');
    cpHome.querySelector('.cp-master').classList.add('hide');
    cpHome.querySelectorAll('.cp-detail').forEach((d) => d.classList.toggle('show', d.dataset.detail === 'top-items'));
    openL3Panel(document.querySelector('[data-detail="ti-item-edit"]'));
  }

  function wireTopItems() {
    document.querySelectorAll('[data-ti-layout]').forEach((r) => {
      r.addEventListener('click', () => {
        document.querySelectorAll('[data-ti-layout]').forEach((x) => x.classList.remove('active'));
        r.classList.add('active');
        state.topItems.layout = r.dataset.tiLayout;
        renderTopItemsPhone();
        markDirty?.();
      });
    });
    document.getElementById('ti-title-input')?.addEventListener('input', (e) => {
      state.topItems.title = e.target.value;
      renderTopItemsPhone();
      markDirty?.();
    });
    document.getElementById('ti-toggle-price')?.addEventListener('click', function () {
      state.topItems.showPrice = this.classList.contains('on');
      renderTopItemsPhone();
      markDirty?.();
    });
    document.getElementById('ti-toggle-see-all')?.addEventListener('click', function () {
      state.topItems.showSeeAll = this.classList.contains('on');
      renderTopItemsPhone();
      markDirty?.();
    });
    document.getElementById('ti-add-btn')?.addEventListener('click', () => {
      const nextId = 'ti-new-' + Date.now();
      state.topItems.items.push({ id: nextId, name: 'New item', price: '$0.00', image: TOP_ITEMS[0].image, badge: '', visible: true });
      renderTopItemsList();
      renderTopItemsPhone();
      openTopItemEdit(state.topItems.items.length - 1);
      markDirty?.();
    });
    ['ti-item-name', 'ti-item-price', 'ti-item-badge', 'ti-item-image'].forEach((id) => {
      document.getElementById(id)?.addEventListener('input', () => {
        if (state.topItems.editing === null) return;
        const it = state.topItems.items[state.topItems.editing];
        if (!it) return;
        it.name = document.getElementById('ti-item-name').value;
        it.price = document.getElementById('ti-item-price').value;
        it.badge = document.getElementById('ti-item-badge').value;
        it.image = document.getElementById('ti-item-image').value;
        renderTopItemsPhone();
        renderTopItemsList();
        markDirty?.();
      });
    });
    document.getElementById('ti-item-back')?.addEventListener('click', () => {
      state.topItems.editing = null;
      closeL3Panel();
    });
  }

  /* ================================================== Menu Categories */

  const mcWidget = document.querySelector('.mc-widget');
  const mcGrid = document.getElementById('mc-grid');
  const mcItemsList = document.getElementById('mc-items-list');

  function renderMenuCategoriesPhone() {
    if (!mcWidget || !mcGrid) return;
    mcWidget.dataset.mcCols = String(state.menuCategories.cols);
    mcWidget.classList.toggle('no-count', !state.menuCategories.showCount);
    mcWidget.querySelector('.mc-title').textContent = state.menuCategories.title;
    mcGrid.innerHTML = '';
    state.menuCategories.items.filter((c) => c.visible).forEach((cat) => {
      const tile = document.createElement('div');
      tile.className = 'mc-tile';
      tile.dataset.mcId = cat.id;
      tile.innerHTML =
        '<div class="mc-tile-img" style="background-image:url(' + escHtml(cat.image) + ')"></div>'
        + '<div class="mc-tile-body">'
        + '<div class="mc-tile-name">' + escHtml(cat.name) + '</div>'
        + '<div class="mc-tile-count">' + escHtml(String(cat.count)) + ' items</div>'
        + '</div>';
      mcGrid.appendChild(tile);
    });
  }

  function renderMenuCategoriesList() {
    if (!mcItemsList) return;
    mcItemsList.innerHTML = '';
    state.menuCategories.items.forEach((cat, idx) => {
      const row = document.createElement('div');
      row.className = 'pc-item';
      row.innerHTML =
        '<span class="handle">⠿</span>'
        + '<span class="pc-item-name">' + escHtml(cat.name) + '</span>'
        + '<button class="pc-vis ' + (cat.visible ? 'on' : '') + '"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/><circle cx="10" cy="10" r="3"/></svg></button>'
        + '<button class="pc-del"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 6h12M8 6V4h4v2M6 6v10a1 1 0 001 1h6a1 1 0 001-1V6"/></svg></button>'
        + '<span class="pc-item-chev">›</span>';
      row.querySelector('.pc-vis').addEventListener('click', (e) => {
        e.stopPropagation();
        cat.visible = !cat.visible;
        renderMenuCategoriesList();
        renderMenuCategoriesPhone();
        markDirty?.();
      });
      row.querySelector('.pc-del').addEventListener('click', (e) => {
        e.stopPropagation();
        state.menuCategories.items.splice(idx, 1);
        renderMenuCategoriesList();
        renderMenuCategoriesPhone();
        markDirty?.();
      });
      row.addEventListener('click', (e) => {
        if (e.target.closest('.pc-vis') || e.target.closest('.pc-del') || e.target.closest('.handle')) return;
        openCategoryEdit(idx);
      });
      mcItemsList.appendChild(row);
    });
    document.getElementById('mc-count').textContent = state.menuCategories.items.length;
  }

  function openCategoryEdit(idx) {
    state.menuCategories.editing = idx;
    const cat = state.menuCategories.items[idx];
    if (!cat) return;
    document.getElementById('mc-item-title').textContent = cat.name || 'Edit category';
    document.getElementById('mc-item-name').value = cat.name;
    document.getElementById('mc-item-count-input').value = cat.count;
    document.getElementById('mc-item-image').value = cat.image;
    const cpHome = document.getElementById('cp-home');
    cpHome.querySelector('.cp-master').classList.add('hide');
    cpHome.querySelectorAll('.cp-detail').forEach((d) => d.classList.toggle('show', d.dataset.detail === 'menu-categories'));
    openL3Panel(document.querySelector('[data-detail="mc-item-edit"]'));
  }

  function wireMenuCategories() {
    document.querySelectorAll('[data-mc-cols]').forEach((r) => {
      r.addEventListener('click', () => {
        document.querySelectorAll('[data-mc-cols]').forEach((x) => x.classList.remove('active'));
        r.classList.add('active');
        state.menuCategories.cols = Number(r.dataset.mcCols);
        renderMenuCategoriesPhone();
        markDirty?.();
      });
    });
    document.getElementById('mc-title-input')?.addEventListener('input', (e) => {
      state.menuCategories.title = e.target.value;
      renderMenuCategoriesPhone();
      markDirty?.();
    });
    document.getElementById('mc-toggle-count')?.addEventListener('click', function () {
      state.menuCategories.showCount = this.classList.contains('on');
      renderMenuCategoriesPhone();
      markDirty?.();
    });
    document.getElementById('mc-add-btn')?.addEventListener('click', () => {
      state.menuCategories.items.push({ id: 'cat-new-' + Date.now(), name: 'New category', image: MENU_CATEGORIES[0].image, count: 0, visible: true });
      renderMenuCategoriesList();
      renderMenuCategoriesPhone();
      openCategoryEdit(state.menuCategories.items.length - 1);
      markDirty?.();
    });
    ['mc-item-name', 'mc-item-count-input', 'mc-item-image'].forEach((id) => {
      document.getElementById(id)?.addEventListener('input', () => {
        if (state.menuCategories.editing === null) return;
        const cat = state.menuCategories.items[state.menuCategories.editing];
        if (!cat) return;
        cat.name = document.getElementById('mc-item-name').value;
        cat.count = document.getElementById('mc-item-count-input').value;
        cat.image = document.getElementById('mc-item-image').value;
        renderMenuCategoriesPhone();
        renderMenuCategoriesList();
        markDirty?.();
      });
    });
    document.getElementById('mc-item-back')?.addEventListener('click', () => {
      state.menuCategories.editing = null;
      closeL3Panel();
    });
  }

  /* ==================================================== Menu Reels */

  const reelsChip = document.querySelector('.phone-reels-chip');
  const reelsChipLabel = document.getElementById('phone-reels-chip-label');
  const reelsChipDismiss = reelsChip?.querySelector('.reels-chip-dismiss');
  const reelsModal = document.querySelector('.phone-modal[data-modal="reels"]');
  const reelsStack = document.getElementById('reels-stack');
  const mrItemsList = document.getElementById('mr-items-list');

  function activeReels() {
    const now = new Date();
    return state.menuReels.items.filter((r) => {
      if (!r.visible) return false;
      if (!r.expires) return true;
      return new Date(r.expires) >= now;
    });
  }

  function renderReelsStack() {
    if (!reelsStack) return;
    reelsStack.innerHTML = '';
    activeReels().forEach((reel, idx) => {
      const frame = document.createElement('div');
      frame.className = 'reels-frame';
      frame.dataset.reelId = reel.id;
      frame.dataset.reelIdx = idx;
      // A still reel renders as a background-image frame, which is exactly what
      // the press-and-hold image adjuster knows how to reframe. A video reel
      // keeps its <video> and is left alone.
      const media = reel.mediaType === 'image'
        ? '<div class="reels-image" style="background-image:url(' + reel.image + ')"></div>'
        : '<video class="reels-video" playsinline muted loop preload="metadata" poster="' + escHtml(reel.poster) + '"><source src="' + escHtml(reel.video) + '" type="video/mp4" /></video>';
      frame.innerHTML =
        media
        + '<div class="reels-overlay-top"><div class="reels-progress-ring" data-reel-progress><svg viewBox="0 0 40 40"><circle class="reels-ring-track" cx="20" cy="20" r="17" /><circle class="reels-ring-fill" cx="20" cy="20" r="17" /></svg></div><span class="reels-count">' + (idx + 1) + ' / ' + activeReels().length + '</span></div>'
        + '<div class="reels-overlay-bottom">'
        + '<div class="reels-title">' + escHtml(reel.title) + '</div>'
        + '<div class="reels-subtitle">' + escHtml(reel.subtitle) + '</div>'
        + (reel.ctaTarget === 'none' ? ''
          : '<button class="reels-cta" data-reel-cta="' + escHtml(reel.ctaTarget) + '">' + escHtml(reel.ctaLabel) + '</button>')
        + '</div>';
      reelsStack.appendChild(frame);
    });
    reelsStack.style.setProperty('--reels-count', activeReels().length);
    setReelsActiveIndex(state.menuReels.activeIdx || 0);
  }

  function setReelsActiveIndex(idx) {
    const total = activeReels().length;
    if (!total) return;
    const clamped = Math.max(0, Math.min(total - 1, idx));
    state.menuReels.activeIdx = clamped;
    if (!reelsStack) return;
    reelsStack.style.transition = reduceMotion.matches ? 'opacity 100ms linear' : 'transform 420ms cubic-bezier(.2,.8,.2,1)';
    reelsStack.style.transform = 'translateY(' + (-clamped * 100) + '%)';
    reelsStack.querySelectorAll('.reels-frame').forEach((f, i) => {
      const video = f.querySelector('video');
      if (!video) return;
      if (i === clamped && !reduceMotion.matches) {
        video.currentTime = 0;
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
    scheduleAutoAdvance();
  }

  const adjustingImage = () => document.body.classList.contains('ia-adjusting');

  function scheduleAutoAdvance() {
    clearTimeout(state.menuReels.autoAdvanceTimer);
    if (adjustingImage()) return;
    if (reduceMotion.matches) return;
    const reels = activeReels();
    const cur = reels[state.menuReels.activeIdx];
    if (!cur) return;
    const secs = Math.max(3, Number(cur.seconds) || 6);
    // Update progress ring animation duration
    const activeFrame = reelsStack?.querySelector('.reels-frame[data-reel-idx="' + state.menuReels.activeIdx + '"]');
    const ring = activeFrame?.querySelector('.reels-ring-fill');
    if (ring) {
      ring.style.animation = 'none';
      // Force reflow so animation restarts.
      void ring.offsetWidth;
      ring.style.animation = 'reels-ring ' + secs + 's linear forwards';
    }
    state.menuReels.autoAdvanceTimer = setTimeout(() => {
      const total = activeReels().length;
      const next = state.menuReels.activeIdx + 1;
      if (next >= total) closeReelsModal();
      else setReelsActiveIndex(next);
    }, secs * 1000);
  }

  function openReelsModal(startIdx) {
    if (!reelsModal || !activeReels().length) return;
    state.menuReels.activeIdx = startIdx || 0;
    renderReelsStack();
    reelsModal.classList.add('open');
    document.body.classList.add('reels-open');
  }

  function closeReelsModal() {
    if (!reelsModal) return;
    reelsModal.classList.remove('open');
    document.body.classList.remove('reels-open');
    clearTimeout(state.menuReels.autoAdvanceTimer);
    reelsStack?.querySelectorAll('video').forEach((v) => v.pause());
  }
  window.closeReelsModal = closeReelsModal;

  // Swipe up/down between reels; swipe down at first reel closes.
  function wireReelsSwipe() {
    if (!reelsStack) return;
    let gesture = null;
    reelsStack.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.reels-cta')) return;
      // An open adjust session is dragging the image inside the frame; a swipe
      // would fight it for the same pointer.
      if (adjustingImage()) return;
      reelsStack.setPointerCapture(e.pointerId);
      gesture = { pointerId: e.pointerId, startY: e.clientY, lastY: e.clientY, lastTime: performance.now(), velocity: 0 };
      reelsStack.classList.add('dragging');
      clearTimeout(state.menuReels.autoAdvanceTimer);
    });
    reelsStack.addEventListener('pointermove', (e) => {
      if (!gesture || e.pointerId !== gesture.pointerId) return;
      const now = performance.now();
      const elapsed = Math.max(1, now - gesture.lastTime);
      gesture.velocity = (e.clientY - gesture.lastY) / elapsed;
      gesture.lastY = e.clientY;
      gesture.lastTime = now;
      let dy = e.clientY - gesture.startY;
      const atFirst = state.menuReels.activeIdx === 0 && dy > 0;
      const atLast = state.menuReels.activeIdx === activeReels().length - 1 && dy < 0;
      if (atFirst || atLast) dy *= .42;
      reelsStack.style.transition = 'none';
      reelsStack.style.transform = 'translateY(calc(' + (-state.menuReels.activeIdx * 100) + '% + ' + dy + 'px))';
    });
    const finish = (e, cancelled = false) => {
      if (!gesture || e.pointerId !== gesture.pointerId) return;
      const activeGesture = gesture;
      const dy = e.clientY - activeGesture.startY;
      const velocity = activeGesture.velocity;
      gesture = null;
      if (reelsStack.hasPointerCapture?.(e.pointerId)) reelsStack.releasePointerCapture(e.pointerId);
      reelsStack.classList.remove('dragging');
      const total = activeReels().length;
      const threshold = 60;
      if (!cancelled && (dy < -threshold || velocity < -.55) && state.menuReels.activeIdx < total - 1) {
        setReelsActiveIndex(state.menuReels.activeIdx + 1);
      } else if (!cancelled && (dy > threshold || velocity > .55)) {
        if (state.menuReels.activeIdx === 0) closeReelsModal();
        else setReelsActiveIndex(state.menuReels.activeIdx - 1);
      } else {
        setReelsActiveIndex(state.menuReels.activeIdx);
      }
    };
    // While an image-adjust session is open the pointer belongs to it, and the
    // stack must stay put underneath.
    document.addEventListener('como:image-adjust', (event) => {
      if (event.detail?.open) clearTimeout(state.menuReels.autoAdvanceTimer);
      else scheduleAutoAdvance();
    });

    reelsStack.addEventListener('pointerup', (e) => finish(e));
    reelsStack.addEventListener('pointercancel', (e) => finish(e, true));
    reelsStack.addEventListener('lostpointercapture', (e) => { if (gesture) finish(e, true); });
    reelsStack.addEventListener('click', (e) => {
      const cta = e.target.closest('.reels-cta');
      if (cta) {
        e.stopPropagation();
        closeReelsModal();
        showToast('Added ' + (cta.textContent || 'item') + ' to cart');
      }
    });
  }

  function renderReelsList() {
    if (!mrItemsList) return;
    mrItemsList.innerHTML = '';
    state.menuReels.items.forEach((reel, idx) => {
      const row = document.createElement('div');
      row.className = 'pc-item';
      const expired = reel.expires && new Date(reel.expires) < new Date();
      row.innerHTML =
        '<span class="handle">⠿</span>'
        + '<span class="pc-item-name">' + escHtml(reel.title) + (expired ? ' <em>(expired)</em>' : '') + '</span>'
        + '<button class="pc-vis ' + (reel.visible ? 'on' : '') + '"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/><circle cx="10" cy="10" r="3"/></svg></button>'
        + '<button class="pc-del"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 6h12M8 6V4h4v2M6 6v10a1 1 0 001 1h6a1 1 0 001-1V6"/></svg></button>'
        + '<span class="pc-item-chev">›</span>';
      row.querySelector('.pc-vis').addEventListener('click', (e) => {
        e.stopPropagation();
        reel.visible = !reel.visible;
        renderReelsList();
        renderReelsStack();
        markDirty?.();
      });
      row.querySelector('.pc-del').addEventListener('click', (e) => {
        e.stopPropagation();
        state.menuReels.items.splice(idx, 1);
        renderReelsList();
        renderReelsStack();
        markDirty?.();
      });
      row.addEventListener('click', (e) => {
        if (e.target.closest('.pc-vis') || e.target.closest('.pc-del') || e.target.closest('.handle')) return;
        openReelEdit(idx);
      });
      mrItemsList.appendChild(row);
    });
    document.getElementById('mr-count').textContent = state.menuReels.items.length;
  }

  function openReelEdit(idx) {
    state.menuReels.editing = idx;
    const reel = state.menuReels.items[idx];
    if (!reel) return;
    document.getElementById('mr-item-title').textContent = reel.title || 'Edit reel';
    document.getElementById('mr-item-title-input').value = reel.title;
    document.getElementById('mr-item-subtitle').value = reel.subtitle;
    document.getElementById('mr-item-poster').value = reel.poster || '';
    paintReelMedia(reel);
    document.getElementById('mr-item-cta-label').value = reel.ctaLabel;
    document.getElementById('mr-item-cta-target').value = reel.ctaTarget;
    document.getElementById('mr-item-seconds').value = reel.seconds;
    document.getElementById('mr-item-seconds-value').textContent = reel.seconds + 's';
    document.getElementById('mr-item-expires').value = reel.expires || '';
    const reelsPanel = document.querySelector('[data-detail="menu-reels"]');
    if (reelsPanel.parentElement.id !== 'l3-body' || !reelsPanel.classList.contains('show')) openL3Panel(reelsPanel);
    openL4Panel(document.querySelector('[data-detail="mr-item-edit"]'));
  }

  // Mirrors the reel's current media into the editor: preview, remove button,
  // the URL box, and whether a poster is worth asking for at all.
  function paintReelMedia(reel) {
    const zone = document.getElementById('mr-item-media-zone');
    const img = document.getElementById('mr-item-media-preview');
    const video = document.getElementById('mr-item-media-video');
    const empty = document.getElementById('mr-item-media-empty');
    const remove = document.getElementById('mr-item-media-remove');
    const url = document.getElementById('mr-item-media-url');
    const posterField = document.getElementById('mr-item-poster-field');
    if (!zone || !img || !video || !empty || !remove || !url) return;

    const src = reelSource(reel);
    const isImage = reel.mediaType === 'image';
    zone.classList.toggle('has-image', !!src);
    empty.style.display = src ? 'none' : '';
    remove.style.display = src ? '' : 'none';
    img.style.display = src && isImage ? '' : 'none';
    video.style.display = src && !isImage ? '' : 'none';
    if (src && isImage) img.src = src;
    if (src && !isImage) video.src = src;
    // Don't clobber what the merchant is typing; only mirror an uploaded file.
    if (document.activeElement !== url) url.value = /^(data:|blob:)/.test(src) ? '' : src;
    url.placeholder = isImage ? 'https://…/reel.jpg' : 'https://…/reel.mp4';
    if (posterField) posterField.hidden = isImage;
  }

  function setReelMedia(reel, src, kind, name = '') {
    reel.mediaType = kind;
    if (kind === 'image') reel.image = src;
    else reel.video = src;
    reel.mediaName = name;
    paintReelMedia(reel);
    renderReelsStack();
    markDirty?.();
  }

  const editingReel = () => (state.menuReels.editing === null ? null : state.menuReels.items[state.menuReels.editing]);

  function wireReelMedia() {
    const zone = document.getElementById('mr-item-media-zone');
    const file = document.getElementById('mr-item-media-file');
    const remove = document.getElementById('mr-item-media-remove');
    const url = document.getElementById('mr-item-media-url');
    if (!zone || !file) return;

    // A clip can run to tens of megabytes, which no draft in localStorage will
    // survive — so videos become object URLs and only stills are inlined.
    function acceptFile(chosen) {
      const reel = editingReel();
      if (!reel || !chosen) return;
      if (chosen.type.startsWith('video/')) {
        setReelMedia(reel, URL.createObjectURL(chosen), 'video', chosen.name);
        showToast('Reel video added');
        return;
      }
      if (!chosen.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        setReelMedia(reel, String(reader.result), 'image', chosen.name);
        showToast('Reel image added · press and hold it in the preview to reframe');
      };
      reader.readAsDataURL(chosen);
    }

    zone.addEventListener('click', () => file.click());
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.style.borderColor = 'var(--como)'; });
    zone.addEventListener('dragleave', () => { zone.style.borderColor = ''; });
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.style.borderColor = '';
      acceptFile(e.dataTransfer.files && e.dataTransfer.files[0]);
    });
    file.addEventListener('change', (e) => acceptFile(e.target.files && e.target.files[0]));

    remove?.addEventListener('click', (e) => {
      e.stopPropagation();
      const reel = editingReel();
      if (!reel) return;
      file.value = '';
      setReelMedia(reel, '', reel.mediaType);
    });

    url?.addEventListener('input', () => {
      const reel = editingReel();
      if (!reel) return;
      const value = url.value.trim();
      setReelMedia(reel, value, mediaKindFromUrl(value));
    });
  }

  function wireMenuReels() {
    document.querySelector('[data-detail="menu-reels"] .cp-back')?.addEventListener('click', () => {
      state.menuReels.editing = null;
      closeL3Panel();
    });
    reelsChip?.addEventListener('click', (e) => {
      if (e.target.closest('.reels-chip-dismiss')) return;
      openReelsModal(0);
    });
    reelsChipDismiss?.addEventListener('click', (e) => {
      e.stopPropagation();
      reelsChip.classList.add('dismissed');
    });
    document.getElementById('mr-chip-label')?.addEventListener('input', (e) => {
      state.menuReels.chipLabel = e.target.value;
      if (reelsChipLabel) reelsChipLabel.textContent = e.target.value;
      markDirty?.();
    });
    document.getElementById('mr-toggle-autoopen')?.addEventListener('click', function () {
      state.menuReels.autoOpen = this.classList.contains('on');
      markDirty?.();
    });
    document.getElementById('mr-toggle-dismiss')?.addEventListener('click', function () {
      state.menuReels.dismissible = this.classList.contains('on');
      if (reelsChipDismiss) reelsChipDismiss.style.display = state.menuReels.dismissible ? '' : 'none';
      markDirty?.();
    });
    document.getElementById('mr-preview-btn')?.addEventListener('click', () => {
      // Reset dismissed state and re-open the modal — simulates a cold app launch.
      reelsChip?.classList.remove('dismissed');
      openReelsModal(0);
      showToast('Previewing member cold-launch experience');
    });
    document.getElementById('mr-add-btn')?.addEventListener('click', () => {
      state.menuReels.items.push({
        id: 'reel-new-' + Date.now(),
        title: 'New reel', subtitle: 'Describe this reel',
        ctaLabel: 'Order now →', ctaTarget: 'ti-1',
        mediaType: 'video', video: '', image: '', poster: '', mediaName: '',
        seconds: 6, expires: '', visible: true,
      });
      renderReelsList();
      renderReelsStack();
      openReelEdit(state.menuReels.items.length - 1);
      markDirty?.();
    });
    document.getElementById('mr-item-seconds')?.addEventListener('input', (e) => {
      document.getElementById('mr-item-seconds-value').textContent = e.target.value + 's';
      const idx = state.menuReels.editing;
      if (idx === null) return;
      state.menuReels.items[idx].seconds = Number(e.target.value);
      markDirty?.();
    });
    // Media has its own handlers in wireReelMedia(); these are the plain fields.
    ['mr-item-title-input', 'mr-item-subtitle', 'mr-item-poster', 'mr-item-cta-label', 'mr-item-cta-target', 'mr-item-expires'].forEach((id) => {
      document.getElementById(id)?.addEventListener('input', () => {
        const r = editingReel();
        if (!r) return;
        r.title = document.getElementById('mr-item-title-input').value;
        r.subtitle = document.getElementById('mr-item-subtitle').value;
        r.poster = document.getElementById('mr-item-poster').value;
        r.ctaLabel = document.getElementById('mr-item-cta-label').value;
        r.ctaTarget = document.getElementById('mr-item-cta-target').value;
        r.expires = document.getElementById('mr-item-expires').value;
        renderReelsList();
        renderReelsStack();
        markDirty?.();
      });
    });
    wireReelMedia();
    document.getElementById('mr-item-back')?.addEventListener('click', () => {
      state.menuReels.editing = null;
      closeL4Panel();
    });
  }

  /* ==================================================== Kick-off */

  renderOrderAgain();
  renderTopItemsPhone();
  renderTopItemsList();
  renderMenuCategoriesPhone();
  renderMenuCategoriesList();
  renderReelsList();
  renderReelsStack();
  wireOrderAgain();
  wireTopItems();
  wireMenuCategories();
  wireMenuReels();
  wireReelsSwipe();
  applyGating();

  // Cold-launch simulation: if the merchant left "Auto-open on cold launch" on
  // and the reels chip is enabled, open the reels modal once after the app loads.
  setTimeout(() => {
    if (reduceMotion.matches) return;
    if (!state.menuReels.autoOpen) return;
    const chipEnabled = reelsChip && !reelsChip.classList.contains('hidden-slot');
    if (chipEnabled && activeReels().length) openReelsModal(0);
  }, 800);

  function exportOrderingWidgets() {
    return JSON.parse(JSON.stringify(state, (key, value) => {
      if (/timer|editing/i.test(key)) return undefined;
      // An object URL is only valid for this document, so saving one would
      // restore a reel pointing at nothing.
      if (typeof value === 'string' && value.startsWith('blob:')) return '';
      return value;
    }));
  }

  function importOrderingWidgets(saved = {}) {
    ['orderAgain', 'topItems', 'menuCategories', 'menuReels'].forEach((key) => {
      if (saved[key]) Object.assign(state[key], saved[key]);
    });
    renderOrderAgain();
    renderTopItemsPhone();
    renderTopItemsList();
    renderMenuCategoriesPhone();
    renderMenuCategoriesList();
    renderReelsList();
    renderReelsStack();
    applyGating();
  }

  return { OO_WIDGET_KEYS, orderingWidgetState: state, openReelsModal, closeReelsModal, applyGating, exportOrderingWidgets, importOrderingWidgets };
}
