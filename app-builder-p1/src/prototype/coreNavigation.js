export function initCoreNavigation(ctx) {
  const { showToast } = ctx;

  const state = {
    page: 'home',
    template: 'tpl-blank',
    device: 'ios',
    modal: null,
    goal: 'blank'
  };

  const pageEls = document.querySelectorAll('.app-page');
  const cpPages = document.querySelectorAll('.cp-page');
  const navItems = document.querySelectorAll('.nav-item');
  const sideItems = document.querySelectorAll('.side-item[data-nav-page]');

  // ---------- Page navigation ----------
  function goToPage(page) {
    let actualPage = page;
    if (state.template === 'tpl-3') {
      if (page === 'home') actualPage = 'home-t3';
      if (page === 'menu') actualPage = 'qr';
    }
    pageEls.forEach(p => p.classList.toggle('active', p.dataset.page === actualPage));

    const cpKey = page;
    cpPages.forEach(cp => cp.style.display = cp.id === 'cp-' + cpKey ? 'flex' : 'none');

    navItems.forEach(n => n.classList.toggle('active', n.dataset.nav === page));
    sideItems.forEach(s => s.classList.toggle('active', s.dataset.navPage === page));
    document.getElementById('app-shell').scrollTop = 0;
    state.page = page;
    // Reset any open drill in the config panel so we always land on master view
    document.querySelectorAll('.cp-master').forEach(m => m.classList.remove('hide'));
    document.querySelectorAll('.cp-detail').forEach(d => d.classList.remove('show'));
    closeL3Panel();
    updateBrandingSideActive();
    closeModal();
  }
  window.goToPage = goToPage;

  navItems.forEach(n => n.addEventListener('click', () => goToPage(n.dataset.nav)));
  sideItems.forEach(s => s.addEventListener('click', () => goToPage(s.dataset.navPage)));

  // ---------- Sidebar collapse toggle ----------
  document.getElementById('side-toggle-btn').addEventListener('click', () => {
    document.body.classList.toggle('side-collapsed');
  });
  // Collapsed state: clicking anywhere in the empty area expands the sidebar
  document.getElementById('side-expand-zone').addEventListener('click', () => {
    if (document.body.classList.contains('side-collapsed')) {
      document.body.classList.remove('side-collapsed');
    }
  });
  // Sidebar Design section: Branding is global, so it jumps straight to the Home page's Branding drill
  const sideBrandingBtn = document.getElementById('side-branding-btn');
  if (sideBrandingBtn) {
    sideBrandingBtn.addEventListener('click', () => openBusinessNameSettings());
  }

  // ---------- Template preset ----------
  function setBrand(name, mark, sub) {
    document.getElementById('brand-name').textContent = name;
    document.getElementById('brand-logo').textContent = mark;
    const phoneName = document.getElementById('phone-brand-name');
    const phoneMark = document.getElementById('phone-brand-mark');
    const phoneSub  = document.getElementById('phone-brand-sub');
    if (phoneName) phoneName.textContent = name.toUpperCase();
    if (phoneMark) phoneMark.textContent = mark;
    if (phoneSub)  phoneSub.textContent  = sub;
  }
  function setWidgetOn(key, on) {
    const toggle = document.querySelector('[data-widget-toggle="' + key + '"]');
    if (!toggle) return;
    const currentlyOn = toggle.classList.contains('on');
    if (currentlyOn === on) return;
    toggle.click();
  }
  function setMenuSlotMode(mode) {
    // mode = 'menu' or 'qr'
    const menuSlot = document.getElementById('nav-menu-slot');
    const sideMenuSlot = document.getElementById('side-menu-slot');
    if (mode === 'qr') {
      menuSlot.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="4" height="4"/><rect x="13" y="7" width="4" height="4"/><rect x="7" y="13" width="4" height="4"/><rect x="13" y="13" width="4" height="4"/></svg><span>QR Code</span>';
      sideMenuSlot.innerHTML = '<span class="side-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="4" height="4"/><rect x="13" y="7" width="4" height="4"/><rect x="7" y="13" width="4" height="4"/><rect x="13" y="13" width="4" height="4"/></svg></span><span class="side-lbl">QR Code</span>';
      sideMenuSlot.title = 'QR Code';
    } else {
      menuSlot.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v16H4z"/><path d="M4 9h16M9 4v16"/></svg><span>Menu</span>';
      sideMenuSlot.innerHTML = '<span class="side-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v16H4z"/><path d="M4 9h16M9 4v16"/></svg></span><span class="side-lbl">Menu</span>';
      sideMenuSlot.title = 'Menu';
    }
  }
  function applyTemplate(tpl) {
    state.template = tpl;
    document.body.classList.remove('tpl-blank', 'tpl-2', 'tpl-3');
    document.body.classList.add(tpl);
    const presetNames = { 'tpl-blank': 'Blank canvas', 'tpl-2': 'Fine Dining preset', 'tpl-3': 'Café preset' };
    document.querySelectorAll('.preset-menu-item').forEach(b => b.classList.toggle('active', b.dataset.tpl === tpl));
    const presetLabel = document.getElementById('preset-btn-label');
    if (presetLabel) presetLabel.textContent = presetNames[tpl] || 'Blank canvas';

    const homeWidgetKeys = ['profile','promo-cards','promo-cards-2','social'];
    if (tpl === 'tpl-2') {
      homeWidgetKeys.forEach(k => setWidgetOn(k, true));
      setBrand('Velvet Bistro', 'V', 'Fine dining · Loyalty');
      setMenuSlotMode('menu');
      showToast('Loaded Fine Dining preset · Velvet Bistro');
    } else if (tpl === 'tpl-3') {
      homeWidgetKeys.forEach(k => setWidgetOn(k, false));
      setBrand('Café Concerto', 'C', 'Coffee · Bakery');
      setMenuSlotMode('qr');
      showToast('Loaded Café preset · Café Concerto');
    } else {
      homeWidgetKeys.forEach(k => setWidgetOn(k, false));
      setBrand('Your Business', '?', '');
      setMenuSlotMode('menu');
    }
    updateHomeEmptyState();
    goToPage(state.page);
  }

  // ---------- Goal presets (shared by the setup wizard and the top-bar preset dropdown) ----------
  const ORDERING_WIDGET_KEYS = ['order-again', 'top-items', 'menu-categories', 'menu-reels'];
  const ALL_HOME_WIDGET_KEYS = ['profile', 'promo-cards', 'promo-cards-2', 'social', ...ORDERING_WIDGET_KEYS];
  const GOAL_DEFS = {
    loyalty: {
      label: 'Loyalty and rewards', sub: 'Loyalty and rewards',
      widgets: ['profile', 'promo-cards', 'social'], menuDP: false,
      name: 'Loyalty and rewards',
      desc: 'Offer points, gifts, and punch cards to keep customers coming back.',
      tags: ['Profile and points', 'Promotional offers', 'Social'],
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>'
    },
    ordering: {
      label: 'Online ordering', sub: 'Online ordering',
      // Ordering preset seeds Profile and Promo Cards plus the four ordering widgets.
      // Gating still applies — locked widgets stay off until a provider is connected.
      widgets: ['profile', 'promo-cards', 'menu-reels', 'order-again', 'top-items', 'menu-categories'], menuDP: true,
      name: 'Online ordering',
      desc: 'Feature your menu and give customers a fast way to order for pickup or delivery.',
      tags: ['Menu and offers', 'Ordering and pickup', 'Reviews'],
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 01-8 0"/></svg>'
    },
    blank: {
      label: 'Blank canvas', sub: '',
      widgets: [], menuDP: false
    }
  };
  // Applies a goal preset to the real editor (widgets + menu D/P switcher + brand sub + top-bar label).
  function applyGoalPreset(goal) {
    const def = GOAL_DEFS[goal] || GOAL_DEFS.blank;
    state.goal = goal;
    // Focus seeds its recommended widgets, so the phone shows real content from the
    // App Focus step onward instead of an empty skeleton. Blank canvas seeds nothing.
    // The guard class stops each seeded toggle from drilling into its config.
    document.body.classList.add('gf-applying-preset');
    const wanted = new Set(def.widgets || []);
    const orderingReady = window.isOrderingConnected?.() === true;
    ALL_HOME_WIDGET_KEYS.forEach(k => {
      const gated = ORDERING_WIDGET_KEYS.includes(k) && !orderingReady;
      setWidgetOn(k, wanted.has(k) && !gated);
    });
    document.body.classList.remove('gf-applying-preset');
    // Tag the body so the skeleton layer can reflect the chosen focus.
    document.body.classList.remove('focus-loyalty', 'focus-ordering', 'focus-blank');
    document.body.classList.add('focus-' + goal);
    const dp = document.querySelector('#cp-menu [data-bind="[data-slot-name=\'menu-dp\']"]');
    if (dp && def.menuDP !== dp.classList.contains('on')) dp.click();
    const subEl = document.getElementById('phone-brand-sub');
    if (subEl) subEl.textContent = def.sub;
    const label = document.getElementById('preset-btn-label');
    if (label) label.textContent = def.label;
    document.querySelectorAll('.preset-menu-item').forEach(b => b.classList.toggle('active', b.dataset.goal === goal));
    if (typeof updateHomeEmptyState === 'function') updateHomeEmptyState();
  }
  window.applyGoalPreset = applyGoalPreset;

  // ---------- Preset dropdown + confirm-before-switch ----------
  let pendingGoal = null;
  const presetConfirmNames = { blank: 'Blank canvas', loyalty: 'Loyalty & Rewards', ordering: 'Online Ordering' };
  const presetDropdown = document.getElementById('preset-dropdown');
  const presetBtn = document.getElementById('preset-btn');
  presetBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (presetDropdown.classList.contains('disabled')) return;
    presetDropdown.classList.toggle('open');
  });
  document.addEventListener('click', () => presetDropdown.classList.remove('open'));
  document.querySelectorAll('.preset-menu-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      presetDropdown.classList.remove('open');
      const goal = item.dataset.goal;
      if (goal === state.goal) return;
      pendingGoal = goal;
      document.getElementById('confirm-preset-name').textContent = presetConfirmNames[goal] || goal;
      document.getElementById('preset-confirm-overlay').classList.add('open');
    });
  });
  document.getElementById('preset-confirm-cancel').addEventListener('click', () => {
    document.getElementById('preset-confirm-overlay').classList.remove('open');
    pendingGoal = null;
  });
  document.getElementById('preset-confirm-ok').addEventListener('click', () => {
    document.getElementById('preset-confirm-overlay').classList.remove('open');
    if (pendingGoal) {
      applyGoalPreset(pendingGoal);
      goToPage(state.page);
      pendingGoal = null;
    }
  });

  // ---------- Demo-only: simulate app published to app stores (locks preset switching) ----------
  const demoPublishedToggle = document.getElementById('demo-published-toggle');
  if (demoPublishedToggle) {
    demoPublishedToggle.addEventListener('click', () => {
      const isPublished = demoPublishedToggle.classList.toggle('active');
      presetDropdown.classList.toggle('disabled', isPublished);
      presetDropdown.classList.remove('open');
      demoPublishedToggle.textContent = isPublished ? 'Simulate: Published (preset locked)' : 'Simulate: Published';
      showToast(isPublished ? 'App is live in stores — preset switching disabled' : 'Back to draft — preset switching enabled');
    });
  }

  // ---------- Modals ----------
  function openModal(name) {
    document.querySelectorAll('.phone-modal').forEach(m => m.classList.toggle('open', m.dataset.modal === name));
    state.modal = name;
  }
  function closeModal() {
    document.querySelectorAll('.phone-modal').forEach(m => m.classList.remove('open'));
    state.modal = null;
  }
  window.openModal = openModal;
  window.closeModal = closeModal;

  document.querySelectorAll('.phone-modal').forEach(m => {
    m.addEventListener('click', (e) => { if (e.target === m) closeModal(); });
  });

  // ---------- Promo Cards carousel dots ----------
  const pcCarouselWrap = document.getElementById('pc-carousel-wrap');
  const pcDots = document.querySelectorAll('.pc-dot');
  if (pcCarouselWrap) {
    pcDots.forEach(d => {
      d.addEventListener('click', () => {
        const i = parseInt(d.dataset.dot);
        pcCarouselWrap.scrollTo({ left: i * pcCarouselWrap.offsetWidth, behavior: 'smooth' });
      });
    });
    pcCarouselWrap.addEventListener('scroll', () => {
      const i = Math.round(pcCarouselWrap.scrollLeft / pcCarouselWrap.offsetWidth);
      pcDots.forEach((d, idx) => d.classList.toggle('active', idx === i));
    });
  }

  // ---------- Config panel widget hover → spotlight on phone ----------
  document.querySelectorAll('.cp-item[data-hl]').forEach(item => {
    const sel = item.dataset.hl;
    item.addEventListener('mouseenter', () => {
      const target = document.querySelector('.app-page.active ' + sel) || document.querySelector(sel);
      if (target) target.classList.add('highlight-target');
    });
    item.addEventListener('mouseleave', () => {
      document.querySelectorAll('.highlight-target').forEach(t => t.classList.remove('highlight-target'));
    });
  });

  // ---------- Drill-in navigation (Toast pattern) ----------
  const PAGE_LABELS = { home: 'Home', rewards: 'Rewards', locations: 'Locations', menu: 'Menu', more: 'More' };
  function updateDrillCrumbs() {
    const label = PAGE_LABELS[state.page] || 'Home';
    document.querySelectorAll('.cp-crumb').forEach(c => c.textContent = label + ' settings');
  }
  function updateBrandingSideActive() {
    const detail = document.querySelector('.cp-detail[data-detail="branding"]');
    const btn = document.getElementById('side-branding-btn');
    if (btn) btn.classList.toggle('active', !!(detail && detail.classList.contains('show')));
  }
  // Depth changes drive the breadcrumb and the context-aware step footer.
  function emitNavChange() {
    document.dispatchEvent(new CustomEvent('como:navchange'));
  }
  function openDrill(pageId, key) {
    const page = document.getElementById(pageId);
    if (!page) return;
    closeL3Panel();
    const master = page.querySelector('.cp-master');
    if (master) master.classList.add('hide');
    page.querySelectorAll('.cp-detail').forEach(d => d.classList.toggle('show', d.dataset.detail === key));
    updateDrillCrumbs();
    updateBrandingSideActive();
    // scroll config panel to top
    document.getElementById('config-panel').scrollTop = 0;
    emitNavChange();
  }
  function closeDrill(pageId) {
    const page = document.getElementById(pageId);
    if (!page) return;
    closeL3Panel();
    const master = page.querySelector('.cp-master');
    if (master) master.classList.remove('hide');
    page.querySelectorAll('.cp-detail').forEach(d => d.classList.remove('show'));
    updateBrandingSideActive();
    document.getElementById('config-panel').scrollTop = 0;
    emitNavChange();
  }
  function resetAllDrills() {
    document.querySelectorAll('.cp-master').forEach(m => m.classList.remove('hide'));
    document.querySelectorAll('.cp-detail').forEach(d => d.classList.remove('show'));
  }
  window.openDrill = openDrill;
  window.closeDrill = closeDrill;

  // ---------- Third panel (L3): deep drill (e.g. individual card editor) ----------
  // Hosts a moved edit-drill (.cp-detail) node so the level-2 card list stays visible
  // in the config panel while an individual card is edited one level deeper.
  function openL3Panel(drillNode) {
    const body = document.getElementById('l3-body');
    if (!body || !drillNode) return;
    if (drillNode.parentElement !== body) body.appendChild(drillNode);
    body.querySelectorAll('.cp-detail').forEach(d => d.classList.toggle('show', d === drillNode));
    document.body.classList.add('l3-open');
    body.scrollTop = 0;
    document.dispatchEvent(new CustomEvent('como:navchange'));
  }
  function closeL3Panel() {
    document.body.classList.remove('l3-open');
    const body = document.getElementById('l3-body');
    if (body) body.querySelectorAll('.cp-detail.show').forEach(d => d.classList.remove('show'));
    document.querySelectorAll('.l3-active').forEach(i => i.classList.remove('l3-active'));
    document.dispatchEvent(new CustomEvent('como:navchange'));
  }
  window.openL3Panel = openL3Panel;
  window.closeL3Panel = closeL3Panel;

  // ---------- Jump to Business name & header settings (from the phone header, any page) ----------
  function openBusinessNameSettings() {
    goToPage('home');
    openDrill('cp-home', 'branding');
  }
  window.openBusinessNameSettings = openBusinessNameSettings;

  // ---------- Profile icon: preview the real Account/Login page (phone only — config panel untouched) ----------
  function showPhonePage(key) {
    let actualPage = key;
    if (state.template === 'tpl-3' && key === 'home') actualPage = 'home-t3';
    pageEls.forEach(p => p.classList.toggle('active', p.dataset.page === actualPage));
    document.getElementById('app-shell').scrollTop = 0;
    closeModal();
  }
  window.showPhonePage = showPhonePage;

  function openAccountPage() {
    const greetRow = document.querySelector('.greet-row');
    const isGuest = greetRow && greetRow.classList.contains('is-guest');
    showPhonePage(isGuest ? 'login' : 'account');
  }
  window.openAccountPage = openAccountPage;

  // ---------- Links that jump to Home → Branding & Customization ----------
  ['rewards-branding-link'].forEach(id => {
    const link = document.getElementById(id);
    if (link) link.addEventListener('click', (e) => { e.preventDefault(); openBusinessNameSettings(); });
  });

  // ---------- Empty-canvas hint: open the preset dropdown ----------
  const ecPresetHint = document.getElementById('ec-preset-hint');
  if (ecPresetHint) {
    ecPresetHint.addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('preset-dropdown').classList.add('open');
    });
    ecPresetHint.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ecPresetHint.click(); }
    });
  }

  document.querySelectorAll('.cp-item[data-drill]').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('handle')) return;
      const page = item.closest('.cp-page');
      openDrill(page.id, item.dataset.drill);
      // also spotlight
      const sel = item.dataset.hl;
      if (sel) {
        const target = document.querySelector('.app-page.active ' + sel) || document.querySelector(sel);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          target.classList.add('highlight-target');
          setTimeout(() => target.classList.remove('highlight-target'), 1800);
        }
      }
    });
  });
  // Widget-row drill triggers (name click + edit icon click)
  document.querySelectorAll('.w-name[data-drill], .w-chev[data-drill], .w-edit-icon[data-drill]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const page = el.closest('.cp-page');
      if (page) openDrill(page.id, el.dataset.drill);
    });
  });
  document.querySelectorAll('.cp-back').forEach(b => {
    b.addEventListener('click', () => {
      // A drill moved into the third panel (#l3-body) has no .cp-page ancestor;
      // its own handler closes the L3 panel, so skip the generic close here.
      const page = b.closest('.cp-page');
      if (page) closeDrill(page.id);
    });
  });

  // ---------- Empty state auto-hide ----------
  function updateHomeEmptyState() {
    const homePage = document.querySelector('.app-page[data-page="home"]');
    if (!homePage) return;
    const widgets = homePage.querySelectorAll('[data-widget]');
    const anyVisible = Array.from(widgets).some(w => !w.classList.contains('hidden-slot'));
    const empty = homePage.querySelector('[data-empty="home"]');
    if (empty) empty.classList.toggle('hidden-slot', anyVisible);
  }
  window.updateHomeEmptyState = updateHomeEmptyState;


  return {
    state, pageEls, cpPages, navItems, sideItems, GOAL_DEFS,
    goToPage, setBrand, setWidgetOn, setMenuSlotMode, applyTemplate, applyGoalPreset,
    openModal, closeModal, updateDrillCrumbs, updateBrandingSideActive,
    openDrill, closeDrill, resetAllDrills, openL3Panel, closeL3Panel,
    openBusinessNameSettings, showPhonePage, openAccountPage, updateHomeEmptyState,
  };
}
