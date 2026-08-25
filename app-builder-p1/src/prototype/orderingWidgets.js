/**
 * Ordering widgets — Order Again, Top Items, Menu Categories, Menu Reels.
 *
 * All four are gated on the online-ordering native integration: their config
 * rows sit disabled until `settings.ordering.connected` is true. Clicking a
 * disabled row opens the Online Ordering wizard in the settings modal. When
 * the wizard finishes, `orderingWizardOrigin` steers where the merchant lands
 * next (see Ship 3 origin routing).
 */

import { LAST_ORDER, TOP_ITEMS, MENU_CATEGORIES, MENU_REELS, REELS_CHIP_DEFAULTS } from '../data/orderingMock.js';

// Keys of every widget that requires online ordering to work.
const OO_WIDGET_KEYS = ['order-again', 'top-items', 'menu-categories'];

function escHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

export function initOrderingWidgets(ctx) {
  const { showToast, markDirty, openDrill, closeL3Panel, openL3Panel } = ctx;

  const state = {
    orderAgain: {
      layout: 'hero',
      showImage: true,
      showMeta: true,
      eyebrow: 'Your last order',
      buttonLabel: 'Reorder',
      empty: LAST_ORDER,
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
      items: MENU_REELS.map((r) => ({ ...r })),
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
      if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.orderingWizardOrigin = null;
      showToast('Online ordering connected · this widget is now live');
    }
  });

  /* ==================================================== Order Again */

  const oaWidget = document.querySelector('.oa-widget');

  function renderOrderAgain() {
    if (!oaWidget) return;
    const s = state.orderAgain;
    oaWidget.dataset.oaLayout = s.layout;
    oaWidget.classList.toggle('no-image', !s.showImage);
    oaWidget.classList.toggle('no-meta', !s.showMeta);
    oaWidget.querySelector('.oa-eyebrow').textContent = s.eyebrow;
    oaWidget.querySelector('.oa-btn').lastChild.textContent = ' ' + s.buttonLabel;
    oaWidget.querySelector('#oa-name').textContent = s.empty.itemName;
    oaWidget.querySelector('#oa-meta').textContent = s.empty.addOns;
    oaWidget.querySelector('#oa-price').textContent = s.empty.price;
    oaWidget.querySelector('#oa-when').textContent = s.empty.when + ' · ' + s.empty.location;
    const img = oaWidget.querySelector('#oa-img');
    if (img) img.style.backgroundImage = 'url(' + s.empty.itemImage + ')';
  }

  function wireOrderAgain() {
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
      frame.innerHTML =
        '<video class="reels-video" playsinline muted loop preload="metadata" poster="' + escHtml(reel.poster) + '"><source src="' + escHtml(reel.video) + '" type="video/mp4" /></video>'
        + '<div class="reels-overlay-top"><div class="reels-progress-ring" data-reel-progress><svg viewBox="0 0 40 40"><circle class="reels-ring-track" cx="20" cy="20" r="17" /><circle class="reels-ring-fill" cx="20" cy="20" r="17" /></svg></div><span class="reels-count">' + (idx + 1) + ' / ' + activeReels().length + '</span></div>'
        + '<div class="reels-overlay-bottom">'
        + '<div class="reels-title">' + escHtml(reel.title) + '</div>'
        + '<div class="reels-subtitle">' + escHtml(reel.subtitle) + '</div>'
        + '<button class="reels-cta" data-reel-cta="' + escHtml(reel.ctaTarget) + '">' + escHtml(reel.ctaLabel) + '</button>'
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
    reelsStack.style.transform = 'translateY(' + (-clamped * 100) + '%)';
    reelsStack.querySelectorAll('.reels-frame').forEach((f, i) => {
      const video = f.querySelector('video');
      if (!video) return;
      if (i === clamped) {
        video.currentTime = 0;
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
    scheduleAutoAdvance();
  }

  function scheduleAutoAdvance() {
    clearTimeout(state.menuReels.autoAdvanceTimer);
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
    let startY = null;
    let dragging = false;
    reelsStack.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.reels-cta')) return;
      startY = e.clientY;
      dragging = true;
      clearTimeout(state.menuReels.autoAdvanceTimer);
    });
    document.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dy = e.clientY - startY;
      reelsStack.style.transition = 'none';
      reelsStack.style.transform = 'translateY(calc(' + (-state.menuReels.activeIdx * 100) + '% + ' + dy + 'px))';
    });
    document.addEventListener('pointerup', (e) => {
      if (!dragging) return;
      dragging = false;
      const dy = e.clientY - startY;
      reelsStack.style.transition = '';
      const total = activeReels().length;
      const threshold = 60;
      if (dy < -threshold && state.menuReels.activeIdx < total - 1) {
        setReelsActiveIndex(state.menuReels.activeIdx + 1);
      } else if (dy > threshold) {
        if (state.menuReels.activeIdx === 0) closeReelsModal();
        else setReelsActiveIndex(state.menuReels.activeIdx - 1);
      } else {
        setReelsActiveIndex(state.menuReels.activeIdx);
      }
    });
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
    document.getElementById('mr-item-video').value = reel.video;
    document.getElementById('mr-item-poster').value = reel.poster;
    document.getElementById('mr-item-cta-label').value = reel.ctaLabel;
    document.getElementById('mr-item-cta-target').value = reel.ctaTarget;
    document.getElementById('mr-item-seconds').value = reel.seconds;
    document.getElementById('mr-item-seconds-value').textContent = reel.seconds + 's';
    document.getElementById('mr-item-expires').value = reel.expires || '';
    const cpHome = document.getElementById('cp-home');
    cpHome.querySelector('.cp-master').classList.add('hide');
    cpHome.querySelectorAll('.cp-detail').forEach((d) => d.classList.toggle('show', d.dataset.detail === 'menu-reels'));
    openL3Panel(document.querySelector('[data-detail="mr-item-edit"]'));
  }

  function wireMenuReels() {
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
        video: MENU_REELS[0].video, poster: MENU_REELS[0].poster,
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
    ['mr-item-title-input', 'mr-item-subtitle', 'mr-item-video', 'mr-item-poster', 'mr-item-cta-label', 'mr-item-cta-target', 'mr-item-expires'].forEach((id) => {
      document.getElementById(id)?.addEventListener('input', () => {
        const idx = state.menuReels.editing;
        if (idx === null) return;
        const r = state.menuReels.items[idx];
        if (!r) return;
        r.title = document.getElementById('mr-item-title-input').value;
        r.subtitle = document.getElementById('mr-item-subtitle').value;
        r.video = document.getElementById('mr-item-video').value;
        r.poster = document.getElementById('mr-item-poster').value;
        r.ctaLabel = document.getElementById('mr-item-cta-label').value;
        r.ctaTarget = document.getElementById('mr-item-cta-target').value;
        r.expires = document.getElementById('mr-item-expires').value;
        renderReelsList();
        renderReelsStack();
        markDirty?.();
      });
    });
    document.getElementById('mr-item-back')?.addEventListener('click', () => {
      state.menuReels.editing = null;
      closeL3Panel();
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
    if (!state.menuReels.autoOpen) return;
    const chipEnabled = reelsChip && !reelsChip.classList.contains('hidden-slot');
    if (chipEnabled && activeReels().length) openReelsModal(0);
  }, 800);

  return { OO_WIDGET_KEYS, openReelsModal, closeReelsModal, applyGating };
}
