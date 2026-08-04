  const state = {
    page: 'home',
    template: 'tpl-blank',
    device: 'ios',
    modal: null
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
    document.body.className = tpl;
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
  // ---------- Preset dropdown + confirm-before-switch ----------
  let pendingPresetTpl = null;
  const presetConfirmNames = { 'tpl-blank': 'Blank canvas', 'tpl-2': 'Fine Dining', 'tpl-3': 'Café' };
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
      const tpl = item.dataset.tpl;
      if (tpl === state.template) return;
      pendingPresetTpl = tpl;
      document.getElementById('confirm-preset-name').textContent = presetConfirmNames[tpl] || tpl;
      document.getElementById('preset-confirm-overlay').classList.add('open');
    });
  });
  document.getElementById('preset-confirm-cancel').addEventListener('click', () => {
    document.getElementById('preset-confirm-overlay').classList.remove('open');
    pendingPresetTpl = null;
  });
  document.getElementById('preset-confirm-ok').addEventListener('click', () => {
    document.getElementById('preset-confirm-overlay').classList.remove('open');
    if (pendingPresetTpl) {
      applyTemplate(pendingPresetTpl);
      pendingPresetTpl = null;
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
  function openDrill(pageId, key) {
    const page = document.getElementById(pageId);
    if (!page) return;
    const master = page.querySelector('.cp-master');
    if (master) master.classList.add('hide');
    page.querySelectorAll('.cp-detail').forEach(d => d.classList.toggle('show', d.dataset.detail === key));
    updateDrillCrumbs();
    updateBrandingSideActive();
    // scroll config panel to top
    document.getElementById('config-panel').scrollTop = 0;
  }
  function closeDrill(pageId) {
    const page = document.getElementById(pageId);
    if (!page) return;
    const master = page.querySelector('.cp-master');
    if (master) master.classList.remove('hide');
    page.querySelectorAll('.cp-detail').forEach(d => d.classList.remove('show'));
    updateBrandingSideActive();
    document.getElementById('config-panel').scrollTop = 0;
  }
  function resetAllDrills() {
    document.querySelectorAll('.cp-master').forEach(m => m.classList.remove('hide'));
    document.querySelectorAll('.cp-detail').forEach(d => d.classList.remove('show'));
  }
  window.openDrill = openDrill;
  window.closeDrill = closeDrill;

  // ---------- Insert a breadcrumb kicker into every drill header (once, at load) ----------
  document.querySelectorAll('.cp-detail').forEach(d => {
    const header = d.querySelector('.cp-detail-header');
    if (!header) return;
    const crumb = document.createElement('div');
    crumb.className = 'cp-crumb';
    crumb.textContent = 'Home settings';
    d.insertBefore(crumb, header);
  });

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
      const page = b.closest('.cp-page');
      closeDrill(page.id);
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

  // ---------- Collapsible sections ----------
  document.querySelectorAll('.cp-head-row').forEach(h => {
    h.addEventListener('click', () => h.parentElement.classList.toggle('open'));
  });

  // ---------- Toggle bindings (show/hide phone elements via CSS selector) ----------
  function wireToggle(t) {
    t.addEventListener('click', () => {
      t.classList.toggle('on');
      markDirty();
      const bind = t.dataset.bind;
      if (bind) {
        const on = t.classList.contains('on');
        document.querySelectorAll(bind).forEach(el => {
          el.classList.toggle('hidden-slot', !on);
        });
      }
      // Sync parent widget-row .on/.off state
      const row = t.closest('.cp-widget-row');
      if (row) {
        const on = t.classList.contains('on');
        row.classList.toggle('on', on);
        row.classList.toggle('off', !on);
      }
      // Sync parent social-item .on/.off state (reveals the indented URL input below it)
      const socialItem = t.closest('.cp-social-item');
      if (socialItem) {
        const on = t.classList.contains('on');
        socialItem.classList.toggle('on', on);
        socialItem.classList.toggle('off', !on);
      }
      // Refresh empty canvas visibility
      if (typeof updateHomeEmptyState === 'function') updateHomeEmptyState();
    });
  }
  document.querySelectorAll('.toggle').forEach(wireToggle);

  // ---------- Radio bindings ----------
  function wireRadioGroup(g) {
    g.querySelectorAll('.cp-radio').forEach(r => {
      r.addEventListener('click', () => {
        g.querySelectorAll('.cp-radio').forEach(x => x.classList.remove('active'));
        r.classList.add('active');
        markDirty();
        // Position radio (Logo) → moves brand-mark in .app-top-header
        const bindRadio = r.dataset.bindRadio;
        const value = r.dataset.value;
        if (bindRadio === 'logo-position') {
          const headers = document.querySelectorAll('.app-page[data-page="home"] .app-top-header, .app-page[data-page="home-t3"] .app-top-header');
          headers.forEach(h => {
            h.classList.remove('pos-left', 'pos-center', 'pos-right');
            h.classList.add('pos-' + value);
          });
        }
        if (bindRadio === 'rewards-style') {
          const rw = document.querySelector('.app-page[data-page="rewards"]');
          if (rw) rw.classList.toggle('rewards-list-style', value === 'list');
        }
        if (bindRadio === 'icon-style') {
          document.body.dataset.iconStyle = value;
        }
        if (bindRadio === 'stats-wrapper') {
          const statsRow = document.querySelector('.stats-row');
          if (statsRow) {
            statsRow.classList.remove('wrap-rounded', 'wrap-square', 'wrap-none');
            statsRow.classList.add('wrap-' + value);
          }
        }
        if (bindRadio === 'member-state') {
          const greetRow = document.querySelector('.greet-row');
          if (greetRow) greetRow.classList.toggle('is-guest', value === 'guest');
          document.querySelectorAll('[data-detail="profile"] [data-state-section="loggedin"]').forEach(s => {
            s.style.display = value === 'guest' ? 'none' : '';
          });
          document.querySelectorAll('[data-detail="profile"] [data-state-section="guest"]').forEach(s => {
            s.style.display = value === 'guest' ? '' : 'none';
          });
        }
      });
    });
  }
  document.querySelectorAll('.cp-radio-group').forEach(wireRadioGroup);

  // ---------- Text input bindings (edit label/copy in place) ----------
  function getPlainText(el) {
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return el.value;
    let out = '';
    el.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        out += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        out += node.classList && node.classList.contains('var-token') ? '{' + node.dataset.key + '}' : node.textContent;
      }
    });
    return out.replace(/\u200B/g, '');
  }
  document.querySelectorAll('.cp-input-text[data-bind-text]').forEach(inp => {
    inp.addEventListener('input', () => {
      const sel = inp.dataset.bindText;
      const text = getPlainText(inp);
      document.querySelectorAll(sel).forEach(el => {
        // preserve child elements: only set first text node
        el.textContent = text;
      });
      markDirty();
    });
  });

  // ---------- Member variable insertion ("@" dropdown, common SaaS pattern) ----------
  const MEMBER_VARS = [
    { key: 'firstName', label: 'First name' },
    { key: 'lastName', label: 'Last name' },
    { key: 'phone', label: 'Phone number' },
    { key: 'dob', label: 'Date of birth' },
    { key: 'tier', label: 'Tier level' },
  ];
  function setupVariableInput(input) {
    let dropdownEl = null;
    let activeIndex = -1;
    let filtered = MEMBER_VARS;
    let atNode = null;
    let atOffset = -1;

    function closeVarDropdown() {
      if (dropdownEl) { dropdownEl.remove(); dropdownEl = null; }
      activeIndex = -1;
      atNode = null; atOffset = -1;
    }
    function insertVariableToken(v) {
      if (!atNode) return;
      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      const caretRange = sel.getRangeAt(0);
      const range = document.createRange();
      range.setStart(atNode, atOffset);
      range.setEnd(caretRange.endContainer, caretRange.endOffset);
      range.deleteContents();
      const span = document.createElement('span');
      span.className = 'var-token';
      span.contentEditable = 'false';
      span.dataset.key = v.key;
      span.textContent = '{' + v.key + '}';
      range.insertNode(span);
      const spaceNode = document.createTextNode('\u200B');
      span.after(spaceNode);
      const newRange = document.createRange();
      newRange.setStart(spaceNode, 1);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
      input.focus();
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    function highlightItem(idx) {
      if (!dropdownEl) return;
      const items = [...dropdownEl.querySelectorAll('.var-dropdown-item')];
      items.forEach((it, i) => it.classList.toggle('active', i === idx));
      if (items[idx]) items[idx].scrollIntoView({ block: 'nearest' });
    }
    function renderDropdown() {
      if (!dropdownEl) return;
      dropdownEl.innerHTML = '';
      if (!filtered.length) {
        const empty = document.createElement('div');
        empty.className = 'var-dropdown-empty';
        empty.textContent = 'No matching variables';
        dropdownEl.appendChild(empty);
        return;
      }
      filtered.forEach((v, i) => {
        const item = document.createElement('div');
        item.className = 'var-dropdown-item';
        item.textContent = v.label + '  {' + v.key + '}';
        item.addEventListener('mousedown', (e) => {
          e.preventDefault();
          insertVariableToken(v);
          closeVarDropdown();
        });
        item.addEventListener('mouseenter', () => { activeIndex = i; highlightItem(activeIndex); });
        dropdownEl.appendChild(item);
      });
      activeIndex = 0;
      highlightItem(activeIndex);
    }
    function openVarDropdown() {
      if (dropdownEl) return;
      dropdownEl = document.createElement('div');
      dropdownEl.className = 'var-dropdown';
      document.body.appendChild(dropdownEl);
      const rect = input.getBoundingClientRect();
      dropdownEl.style.position = 'fixed';
      dropdownEl.style.right = 'auto';
      dropdownEl.style.left = rect.left + 'px';
      dropdownEl.style.top = (rect.bottom + 4) + 'px';
      dropdownEl.style.width = rect.width + 'px';
    }
    function checkForAt() {
      const sel = window.getSelection();
      if (!sel.rangeCount) { closeVarDropdown(); return; }
      const range = sel.getRangeAt(0);
      const node = range.endContainer;
      if (node.nodeType !== Node.TEXT_NODE || !input.contains(node)) { closeVarDropdown(); return; }
      const textBeforeCaret = node.textContent.slice(0, range.endOffset);
      const atIdx = textBeforeCaret.lastIndexOf('@');
      if (atIdx === -1) { closeVarDropdown(); return; }
      const searchTerm = textBeforeCaret.slice(atIdx + 1);
      if (/\s/.test(searchTerm)) { closeVarDropdown(); return; }
      atNode = node;
      atOffset = atIdx;
      const q = searchTerm.toLowerCase();
      filtered = MEMBER_VARS.filter(v => v.label.toLowerCase().includes(q) || v.key.toLowerCase().includes(q));
      openVarDropdown();
      renderDropdown();
    }
    input.addEventListener('input', checkForAt);
    input.addEventListener('keydown', (e) => {
      if (!dropdownEl) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = Math.min(activeIndex + 1, filtered.length - 1);
        highlightItem(activeIndex);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        highlightItem(activeIndex);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIndex >= 0 && filtered[activeIndex]) {
          insertVariableToken(filtered[activeIndex]);
          closeVarDropdown();
        }
      } else if (e.key === 'Escape') {
        closeVarDropdown();
      }
    });
    input.addEventListener('blur', () => setTimeout(closeVarDropdown, 150));
  }
  document.querySelectorAll('.cp-input-text[data-vars="true"]').forEach(setupVariableInput);

  // ---------- Color picker bindings (native swatch + editable HEX, two-way) ----------
  function normalizeHex(s) {
    s = (s || '').trim();
    if (s && s[0] !== '#') s = '#' + s;
    return /^#[0-9a-fA-F]{6}$/.test(s) ? s.toLowerCase() : null;
  }
  // Wires one <input type="color"> together with the sibling .cp-color-hex field.
  // `apply(hex)` receives the committed color; called on every valid change.
  function wireColorControl(colorInput, apply) {
    const swatch = colorInput.parentElement;
    const row = colorInput.closest('.cp-color-row');
    const hexEl = row ? row.querySelector('.cp-color-hex') : null;
    function paint(hex) {
      if (swatch) swatch.style.background = hex;
      apply(hex);
      markDirty();
    }
    colorInput.addEventListener('input', () => {
      const hex = colorInput.value;
      if (hexEl && document.activeElement !== hexEl) hexEl.value = hex.toUpperCase();
      paint(hex);
    });
    if (hexEl) {
      hexEl.addEventListener('input', () => {
        const hex = normalizeHex(hexEl.value);
        if (hex) { colorInput.value = hex; paint(hex); }
      });
      hexEl.addEventListener('blur', () => {
        const hex = normalizeHex(hexEl.value) || colorInput.value;
        hexEl.value = hex.toUpperCase();
      });
    }
  }
  window.wireColorControl = wireColorControl;

  document.querySelectorAll('input[type="color"][data-bind-color]').forEach(inp => {
    wireColorControl(inp, (hex) => document.body.style.setProperty(inp.dataset.bindColor, hex));
  });

  // ---------- App background: Solid / Gradient + opacity ----------
  (function initAppBg() {
    const c1 = document.getElementById('appbg-color1');
    const c2 = document.getElementById('appbg-color2');
    const op = document.getElementById('appbg-opacity');
    const opVal = document.getElementById('appbg-opacity-val');
    const row2 = document.getElementById('appbg-row2');
    const seg = document.getElementById('appbg-mode');
    if (!c1 || !c2 || !op || !seg) return;
    let mode = 'solid';
    const hexToRgb = (h) => { const m = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(m.slice(i, i + 2), 16)); };
    const rgba = (h, a) => { const [r, g, b] = hexToRgb(h); return `rgba(${r},${g},${b},${a})`; };
    function apply() {
      const a = (+op.value) / 100;
      const bg = mode === 'gradient'
        ? `linear-gradient(180deg, ${rgba(c1.value, a)} 0%, ${rgba(c2.value, a)} 100%)`
        : rgba(c1.value, a);
      document.body.style.setProperty('--p-bg', bg);
    }
    wireColorControl(c1, apply);
    wireColorControl(c2, apply);
    op.addEventListener('input', () => { opVal.textContent = op.value + '%'; apply(); markDirty(); });
    seg.querySelectorAll('.cp-seg-btn').forEach(b => {
      b.addEventListener('click', () => {
        seg.querySelectorAll('.cp-seg-btn').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        mode = b.dataset.mode;
        row2.style.display = mode === 'gradient' ? '' : 'none';
        apply();
        markDirty();
      });
    });
  })();

  // ---------- Font picker (Branding drill: list + search + custom upload) ----------
  function applyFontFamily(font) {
    document.querySelectorAll('.app-shell').forEach(shell => shell.style.fontFamily = font);
  }
  function activateFontItem(item) {
    document.querySelectorAll('.cp-font-item, .cp-font-card').forEach(x => x.classList.remove('active'));
    item.classList.add('active');
    const font = item.dataset.font || item.dataset.bindFont;
    if (font) applyFontFamily(font);
    markDirty();
  }
  function wireFontItem(item) {
    item.addEventListener('click', () => activateFontItem(item));
  }
  document.querySelectorAll('.cp-font-item, .cp-font-card').forEach(wireFontItem);

  const fontSearch = document.getElementById('font-search');
  if (fontSearch) {
    fontSearch.addEventListener('input', () => {
      const q = fontSearch.value.trim().toLowerCase();
      document.querySelectorAll('#font-list .cp-font-item').forEach(item => {
        const name = item.querySelector('.fname').textContent.toLowerCase();
        item.style.display = name.includes(q) ? '' : 'none';
      });
    });
  }

  const fontFile = document.getElementById('font-file');
  const fontDropZone = document.getElementById('font-drop-zone');
  let customFontCounter = 0;
  function loadCustomFont(file) {
    if (!file) return;
    if (!/\.(woff2|otf|ttf)$/i.test(file.name)) {
      showToast('Font must be .woff2, .otf, or .ttf');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Font too big — max 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      customFontCounter++;
      const fontName = 'ComoCustomFont_' + customFontCounter;
      const style = document.createElement('style');
      style.textContent = '@font-face { font-family: "' + fontName + '"; src: url(' + JSON.stringify(ev.target.result) + '); }';
      document.head.appendChild(style);
      const stack = '"' + fontName + '", sans-serif';
      applyFontFamily(stack);
      // Add to the top of the list, active
      const list = document.getElementById('font-list');
      if (list) {
        const item = document.createElement('div');
        item.className = 'cp-font-item active';
        item.dataset.font = stack;
        const preview = document.createElement('span');
        preview.className = 'fname';
        preview.style.fontFamily = stack;
        preview.textContent = file.name.replace(/\.(woff2|otf|ttf)$/i, '');
        const sub = document.createElement('span');
        sub.className = 'fsub';
        sub.textContent = 'Custom · Uploaded';
        item.appendChild(preview);
        item.appendChild(sub);
        document.querySelectorAll('.cp-font-item, .cp-font-card').forEach(x => x.classList.remove('active'));
        list.insertBefore(item, list.firstChild);
        wireFontItem(item);
      }
      markDirty();
      showToast('Custom font “' + file.name + '” applied');
    };
    reader.readAsDataURL(file);
  }
  if (fontFile) {
    fontFile.addEventListener('change', (e) => loadCustomFont(e.target.files && e.target.files[0]));
  }
  if (fontDropZone) {
    fontDropZone.addEventListener('dragover', (e) => { e.preventDefault(); fontDropZone.classList.add('drag-over'); });
    fontDropZone.addEventListener('dragleave', () => fontDropZone.classList.remove('drag-over'));
    fontDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      fontDropZone.classList.remove('drag-over');
      loadCustomFont(e.dataTransfer.files && e.dataTransfer.files[0]);
    });
  }

  // ---------- Slider bindings (Logo size) ----------
  document.querySelectorAll('.cp-slider[data-bind-slider]').forEach(s => {
    const valEl = s.parentElement.querySelector('.cp-slider-val');
    s.addEventListener('input', () => {
      const val = s.value;
      if (valEl) valEl.textContent = val + '%';
      if (s.dataset.bindSlider === 'logo-size') {
        const size = 20 + (val / 100) * 32; // 20-52px
        document.querySelectorAll('.app-page .app-top-header .brand-mark').forEach(m => {
          m.style.width = size + 'px';
          m.style.height = size + 'px';
          m.style.fontSize = (size * 0.4) + 'px';
        });
      }
      markDirty();
    });
  });

  // ---------- Logo upload (preview + drag-drop + phone render) ----------
  const logoFile = document.getElementById('logo-file');
  const logoDropZone = document.getElementById('logo-drop-zone');
  const logoPreviewImg = document.getElementById('logo-preview-img');
  const logoPreviewEmpty = document.getElementById('logo-preview-empty');
  const logoClearBtn = document.getElementById('logo-clear-btn');

  function applyLogo(dataUrl) {
    // Preview inside the config panel
    if (logoPreviewImg) {
      logoPreviewImg.src = dataUrl;
      logoPreviewImg.style.display = 'block';
    }
    if (logoPreviewEmpty) logoPreviewEmpty.style.display = 'none';
    if (logoClearBtn) logoClearBtn.style.display = 'inline-block';

    // Render on the phone brand-mark (all pages). .has-logo class overrides theme !important.
    document.querySelectorAll('.app-page .app-top-header .brand-mark').forEach(m => {
      m.classList.add('has-logo');
      m.style.backgroundImage = 'url(' + dataUrl + ')';
    });

    // Auto-enable Logo Widget so the change is visible on Home
    const logoToggle = document.querySelector('[data-widget-toggle="logo"]');
    if (logoToggle && !logoToggle.classList.contains('on')) logoToggle.click();

    markDirty();
    showToast('Logo uploaded · rendered live on the phone');
  }

  function clearLogo() {
    if (logoPreviewImg) { logoPreviewImg.src = ''; logoPreviewImg.style.display = 'none'; }
    if (logoPreviewEmpty) logoPreviewEmpty.style.display = 'block';
    if (logoClearBtn) logoClearBtn.style.display = 'none';
    document.querySelectorAll('.app-page .app-top-header .brand-mark').forEach(m => {
      m.classList.remove('has-logo');
      m.style.backgroundImage = '';
    });
    if (logoFile) logoFile.value = '';
    markDirty();
    showToast('Logo removed');
  }

  function handleLogoFile(file) {
    if (!file) return;
    if (!/^image\/(png|jpeg|jpg|webp)/i.test(file.type)) {
      showToast('Only png, jpg, or webp supported');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('File too big — max 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => applyLogo(ev.target.result);
    reader.readAsDataURL(file);
  }

  if (logoFile) {
    logoFile.addEventListener('change', (e) => handleLogoFile(e.target.files && e.target.files[0]));
  }
  if (logoDropZone) {
    logoDropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      logoDropZone.classList.add('drag-over');
    });
    logoDropZone.addEventListener('dragleave', () => logoDropZone.classList.remove('drag-over'));
    logoDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      logoDropZone.classList.remove('drag-over');
      handleLogoFile(e.dataTransfer.files && e.dataTransfer.files[0]);
    });
  }
  if (logoClearBtn) {
    logoClearBtn.addEventListener('click', (e) => { e.stopPropagation(); clearLogo(); });
  }

  // ====================================================================
  // PROMO CARDS WIDGET — instanced: Home can host more than one promo strip.
  // Every instance owns its cards, section title, and presentation settings.
  // ====================================================================
  function initPromoCards(cfg) {
    const gid = (suffix) => document.getElementById(cfg.idp + suffix);
    const pcWidget = document.querySelector('.promo-cards-widget[data-widget="' + cfg.key + '"]');
    const pcCarousel = gid('-carousel-wrap');
    const pcDotsContainer = gid('-dots');
    const pcItemsList = gid('-items-list');
    const pcDrill = document.querySelector('[data-detail="' + cfg.drill + '"]');
    const pcEditDrill = document.querySelector('[data-detail="' + cfg.editDrill + '"]');
    const pcRowName = document.querySelector('.w-name[data-drill="' + cfg.drill + '"]');
    const pcEyebrow = pcWidget && pcWidget.querySelector('.pc-eyebrow');

    const pcCards = cfg.seed;
    let pcNextId = pcCards.length;
    let pcEditIdx = null; // which card index is being edited in the sub-drill

    function pcRenderPhone() {
      if (!pcCarousel) return;
      const visCards = pcCards.filter(c => c.visible);
      pcCarousel.innerHTML = '';
      visCards.forEach(c => {
        const card = document.createElement('div');
        card.className = 'pc-card';
        card.dataset.pcCard = c.id;
        const img = document.createElement('div');
        img.className = 'pc-card-img';
        if (c.imgData) {
          img.classList.add('has-upload');
          img.style.backgroundImage = 'url(' + c.imgData + ')';
        } else if (c.img) {
          img.classList.add(c.img);
        } else {
          img.classList.add('empty-img');
          img.textContent = '🖼';
        }
        card.appendChild(img);
        const body = document.createElement('div');
        body.className = 'pc-card-body';
        body.innerHTML = '<div class="pc-card-headline">' + escHtml(c.headline) + '</div>'
          + '<div class="pc-card-desc">' + escHtml(c.desc) + '</div>'
          + '<button class="pc-card-btn">' + escHtml(c.btnText) + '</button>';
        card.appendChild(body);
        pcCarousel.appendChild(card);
      });
      if (pcDotsContainer) {
        pcDotsContainer.innerHTML = '';
        if (visCards.length > 1) {
          visCards.forEach((_, i) => {
            const dot = document.createElement('span');
            dot.className = 'pc-dot' + (i === 0 ? ' active' : '');
            dot.dataset.dot = i;
            dot.addEventListener('click', () => {
              pcCarousel.scrollTo({ left: i * pcCarousel.offsetWidth, behavior: 'smooth' });
            });
            pcDotsContainer.appendChild(dot);
          });
        }
      }
      pcCarousel.onscroll = () => {
        const i = Math.round(pcCarousel.scrollLeft / pcCarousel.offsetWidth);
        pcDotsContainer.querySelectorAll('.pc-dot').forEach((d, idx) => d.classList.toggle('active', idx === i));
      };
    }

    function pcRenderItemList() {
      if (!pcItemsList) return;
      pcItemsList.innerHTML = '';
      pcCards.forEach((c, idx) => {
        const row = document.createElement('div');
        row.className = 'pc-item';
        row.dataset.pcIdx = idx;
        row.innerHTML = '<span class="handle">⠿</span>'
          + '<span class="pc-item-name">' + escHtml(c.headline || 'Untitled card') + '</span>'
          + '<button class="pc-vis ' + (c.visible ? 'on' : '') + '" title="Toggle visibility"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/><circle cx="10" cy="10" r="3"/></svg></button>'
          + '<button class="pc-del" title="Delete card"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 6h12M8 6V4h4v2M6 6v10a1 1 0 001 1h6a1 1 0 001-1V6"/></svg></button>'
          + '<span class="pc-item-chev">›</span>';
        row.querySelector('.pc-vis').addEventListener('click', (e) => {
          e.stopPropagation();
          c.visible = !c.visible;
          row.querySelector('.pc-vis').classList.toggle('on', c.visible);
          pcRenderPhone();
          markDirty();
        });
        row.querySelector('.pc-del').addEventListener('click', (e) => {
          e.stopPropagation();
          pcCards.splice(idx, 1);
          pcRenderItemList();
          pcRenderPhone();
          pcUpdateCount();
          markDirty();
        });
        row.addEventListener('click', (e) => {
          if (e.target.closest('.pc-vis') || e.target.closest('.pc-del') || e.target.closest('.handle')) return;
          pcOpenCardEdit(idx);
        });
        pcItemsList.appendChild(row);
      });
    }

    function pcUpdateCount() {
      const countEl = pcDrill && pcDrill.querySelector('.pc-count');
      if (countEl) countEl.textContent = pcCards.length;
    }

    function pcOpenCardEdit(idx) {
      pcEditIdx = idx;
      const c = pcCards[idx];
      if (!c) return;
      gid('-card-edit-title').textContent = c.headline || 'Untitled card';
      gid('-edit-headline').value = c.headline;
      gid('-edit-desc').value = c.desc;
      gid('-edit-action').value = c.action;
      gid('-edit-btn-text').value = c.btnText;
      pcPaintImageState(c.imgData);
      const cpHome = document.getElementById('cp-home');
      cpHome.querySelectorAll('.cp-detail').forEach(d => d.classList.remove('show'));
      cpHome.querySelector('.cp-master').classList.add('hide');
      pcEditDrill.classList.add('show');
      document.getElementById('config-panel').scrollTop = 0;
    }

    function pcPaintImageState(imgData) {
      const preview = gid('-edit-image-preview');
      const empty = gid('-edit-image-empty');
      const removeBtn = gid('-edit-image-remove');
      const zone = gid('-edit-image-zone');
      if (imgData) {
        preview.src = imgData;
        preview.style.display = 'block';
        empty.style.display = 'none';
        removeBtn.style.display = '';
        zone.classList.add('has-image');
      } else {
        preview.style.display = 'none';
        empty.style.display = '';
        removeBtn.style.display = 'none';
        zone.classList.remove('has-image');
      }
    }

    function pcSyncEditFields() {
      if (pcEditIdx === null) return;
      const c = pcCards[pcEditIdx];
      if (!c) return;
      c.headline = gid('-edit-headline').value;
      c.desc = gid('-edit-desc').value;
      c.action = gid('-edit-action').value;
      c.btnText = gid('-edit-btn-text').value;
      pcRenderPhone();
      pcRenderItemList();
      markDirty();
    }
    ['-edit-headline', '-edit-desc', '-edit-action', '-edit-btn-text'].forEach(sfx => {
      const el = gid(sfx);
      if (!el) return;
      el.addEventListener('input', pcSyncEditFields);
      el.addEventListener('change', pcSyncEditFields);
    });

    // Section title: drives the phone eyebrow AND the widget's name in the left panel.
    // Not every instance offers this (e.g. More Offers keeps its name hardcoded), so no-op if absent.
    const pcTitleInput = gid('-section-title');
    const pcTitleToggle = gid('-section-title-toggle');
    function pcApplySectionTitle() {
      if (!pcTitleInput) return;
      const label = (pcTitleInput.value || '').trim();
      if (pcEyebrow) pcEyebrow.textContent = label;
      if (pcRowName) pcRowName.textContent = 'Promo Cards — ' + (label || 'Untitled');
      const drillTitle = pcDrill && pcDrill.querySelector('.cp-detail-title');
      if (drillTitle) drillTitle.textContent = 'Promo Cards — ' + (label || 'Untitled');
    }
    if (pcTitleInput) {
      pcTitleInput.addEventListener('input', () => { pcApplySectionTitle(); markDirty(); });
    }
    if (pcTitleToggle && pcEyebrow) {
      pcTitleToggle.addEventListener('click', () => {
        pcEyebrow.classList.toggle('hidden-slot', !pcTitleToggle.classList.contains('on'));
      });
    }

    // Card image upload
    const pcEditImageFile = gid('-edit-image-file');
    const pcEditImageZone = gid('-edit-image-zone');
    if (pcEditImageZone) {
      pcEditImageZone.addEventListener('click', () => pcEditImageFile.click());
      pcEditImageZone.addEventListener('dragover', (e) => { e.preventDefault(); pcEditImageZone.style.borderColor = 'var(--como)'; });
      pcEditImageZone.addEventListener('dragleave', () => { pcEditImageZone.style.borderColor = ''; });
      pcEditImageZone.addEventListener('drop', (e) => {
        e.preventDefault();
        pcEditImageZone.style.borderColor = '';
        const file = e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) pcHandleCardImage(file);
      });
    }
    if (pcEditImageFile) {
      pcEditImageFile.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) pcHandleCardImage(e.target.files[0]);
      });
    }
    function pcHandleCardImage(file) {
      readImageFile(file, (dataUrl) => {
        if (pcEditIdx === null) return;
        pcCards[pcEditIdx].imgData = dataUrl;
        pcCards[pcEditIdx].img = null; // clear preset gradient class
        pcPaintImageState(dataUrl);
        pcRenderPhone();
        markDirty();
      });
    }
    const pcEditImageRemove = gid('-edit-image-remove');
    if (pcEditImageRemove) {
      pcEditImageRemove.addEventListener('click', (e) => {
        e.stopPropagation();
        if (pcEditIdx === null) return;
        pcCards[pcEditIdx].imgData = null;
        pcCards[pcEditIdx].img = null;
        pcPaintImageState(null);
        pcEditImageFile.value = '';
        pcRenderPhone();
        markDirty();
      });
    }

    // Back from sub-drill → return to this instance's drill (not master)
    const pcCardBack = gid('-card-back');
    if (pcCardBack) {
      pcCardBack.addEventListener('click', () => {
        pcEditIdx = null;
        const cpHome = document.getElementById('cp-home');
        cpHome.querySelectorAll('.cp-detail').forEach(d => d.classList.remove('show'));
        cpHome.querySelector('.cp-master').classList.add('hide');
        pcDrill.classList.add('show');
        document.getElementById('config-panel').scrollTop = 0;
      });
    }

    const pcAddBtn = gid('-add-btn');
    if (pcAddBtn) {
      pcAddBtn.addEventListener('click', () => {
        pcCards.push({ id: pcNextId++, headline: '', desc: '', img: null, imgData: null, action: 'none', btnText: '', visible: true });
        pcRenderItemList();
        pcRenderPhone();
        pcUpdateCount();
        markDirty();
        pcOpenCardEdit(pcCards.length - 1);
      });
    }

    // Presentation radios (scoped to this instance's drill)
    const presentationMap = { display: 'pcDisplay', 'image-size': 'pcImage', 'cta-style': 'pcCta', corners: 'pcCorners' };
    if (pcDrill && pcWidget) {
      Object.keys(presentationMap).forEach(name => {
        pcDrill.querySelectorAll('[data-bind-radio="' + cfg.idp + '-' + name + '"]').forEach(r => {
          r.addEventListener('click', () => {
            pcWidget.dataset[presentationMap[name]] = r.dataset.value;
          });
        });
      });
      // Grid display → open the Google-Docs-style size picker to choose columns × rows
      const gridRadio = pcDrill.querySelector('[data-bind-radio="' + cfg.idp + '-display"][data-value="grid"]');
      if (gridRadio) {
        gridRadio.addEventListener('click', () => {
          openGridPicker(gridRadio, (cols, rows) => {
            pcWidget.style.setProperty('--pc-cols', cols);
            pcWidget.dataset.pcDisplay = 'grid';
            gridRadio.textContent = 'Grid ' + cols + '×' + rows;
            markDirty();
          });
        });
      }
      const pcBgInput = gid('-bg-color');
      if (pcBgInput) {
        wireColorControl(pcBgInput, (hex) => pcWidget.style.setProperty('--pc-card-bg', hex));
      }
    }

    pcApplySectionTitle();
    pcRenderPhone();
    pcRenderItemList();
    pcUpdateCount();
  }

  function escHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  // Shared image-file reader for every uploader in the config panel
  function readImageFile(file, onLoad) {
    if (!/^image\/(png|jpeg|jpg|webp)/i.test(file.type)) { showToast('Only png, jpg, or webp'); return; }
    if (file.size > 5 * 1024 * 1024) { showToast('Max 5 MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => onLoad(ev.target.result);
    reader.readAsDataURL(file);
  }

  // Google-Docs-style size picker: hover a cell to highlight the top-left block, click to pick cols × rows
  function openGridPicker(anchor, onPick) {
    document.querySelectorAll('.grid-picker').forEach(p => p.remove());
    const MAXC = 5, MAXR = 5;
    const pop = document.createElement('div');
    pop.className = 'grid-picker';
    const grid = document.createElement('div');
    grid.className = 'grid-picker-grid';
    grid.style.gridTemplateColumns = 'repeat(' + MAXC + ', 16px)';
    const label = document.createElement('div');
    label.className = 'grid-picker-label';
    label.textContent = '1 × 1';
    const cells = [];
    for (let r = 0; r < MAXR; r++) {
      for (let c = 0; c < MAXC; c++) {
        const cell = document.createElement('div');
        cell.className = 'grid-picker-cell';
        cell.addEventListener('mouseenter', () => {
          cells.forEach(x => x.el.classList.toggle('on', x.c <= c && x.r <= r));
          label.textContent = (c + 1) + ' × ' + (r + 1);
        });
        cell.addEventListener('click', (e) => {
          e.stopPropagation();
          onPick(c + 1, r + 1);
          pop.remove();
        });
        cells.push({ el: cell, c, r });
        grid.appendChild(cell);
      }
    }
    pop.appendChild(grid);
    pop.appendChild(label);
    document.body.appendChild(pop);
    const rect = anchor.getBoundingClientRect();
    let left = window.scrollX + rect.left;
    if (rect.left + pop.offsetWidth > window.innerWidth - 8) {
      left = window.scrollX + window.innerWidth - pop.offsetWidth - 8;
    }
    pop.style.top = (window.scrollY + rect.bottom + 6) + 'px';
    pop.style.left = left + 'px';
    const close = (e) => {
      if (!pop.contains(e.target) && e.target !== anchor) {
        pop.remove();
        document.removeEventListener('mousedown', close);
      }
    };
    setTimeout(() => document.addEventListener('mousedown', close), 0);
  }

  initPromoCards({
    key: 'promo-cards', idp: 'pc', drill: 'promo-cards', editDrill: 'pc-card-edit',
    seed: [
      { id: 0, headline: 'Black Angus Special', desc: '20% OFF Tonight — prime cut, chef-selected, served with truffle jus', img: 'beef', imgData: null, action: 'menu', btnText: 'View Menu →', visible: true },
      { id: 1, headline: 'Artisan Chocolate', desc: 'Free with $80 spend — dark 72% single-origin from our pastry chef', img: 'choc', imgData: null, action: 'rewards', btnText: 'Order Now →', visible: true },
      { id: 2, headline: 'Premium Sushi Night', desc: 'Omakase 12-course, reservations open this Friday', img: 'sushi', imgData: null, action: 'none', btnText: 'Reserve Table →', visible: true },
    ]
  });

  initPromoCards({
    key: 'promo-cards-2', idp: 'pc2', drill: 'promo-cards-2', editDrill: 'pc2-card-edit',
    seed: [
      { id: 0, headline: 'Midweek Set Lunch', desc: 'Two courses for $29, Tuesday to Thursday', img: 'beef', imgData: null, action: 'menu', btnText: 'See the set →', visible: true },
      { id: 1, headline: 'Bring a Friend', desc: 'Refer a friend and you both get 200 points', img: 'choc', imgData: null, action: 'rewards', btnText: 'Invite now →', visible: true },
    ]
  });

  // ====================================================================
  // + ADD WIDGET — dropdown to append new Promo Cards / Text Divider widgets.
  // Each added widget gets a config row (drag-reorderable + deletable) and a
  // live phone element, reusing the same wiring as the built-in widgets.
  // ====================================================================
  let dynWidgetSeq = 3;
  const cpHomeEl = document.getElementById('cp-home');
  const homePageEl = document.querySelector('.app-page[data-page="home"]');
  const addWidgetBtn = document.getElementById('add-widget-btn');
  const addWidgetMenu = document.getElementById('add-widget-menu');
  const addWidgetWrap = addWidgetBtn ? addWidgetBtn.closest('.cp-add-widget-wrap') : null;
  const widgetsListBody = addWidgetWrap ? addWidgetWrap.parentElement : null;

  function wireDrillNode(node) {
    node.querySelectorAll('.cp-head-row').forEach(h => {
      h.addEventListener('click', () => h.parentElement.classList.toggle('open'));
    });
    node.querySelectorAll('.cp-radio-group').forEach(wireRadioGroup);
  }

  // Build a config-panel widget row (handle + name + on/off toggle + edit + delete).
  function buildWidgetRow(name, key, drill, bindSel, onDelete) {
    const row = document.createElement('div');
    row.className = 'cp-widget-row on';
    row.dataset.dynamic = '1';
    row.innerHTML =
      '<span class="handle">⠿</span>'
      + '<span class="w-name" data-drill="' + drill + '">' + escHtml(name) + '</span>'
      + '<span class="toggle on" data-bind="' + bindSel + '" data-widget-toggle="' + key + '" title="Show on Home">'
      + '<svg class="i-plus" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 4v12M4 10h12"/></svg>'
      + '<svg class="i-check" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10l4 4 8-8"/></svg>'
      + '</span>'
      + '<button class="w-edit-icon" data-drill="' + drill + '" title="Edit widget"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12.5 3l4.5 4.5-10 10H2.5v-4.5l10-10z"/><path d="M11 4.5l4.5 4.5"/></svg></button>'
      + '<button class="w-edit-icon w-del" title="Remove widget"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h12M8 6V4h4v2M6 6v10a1 1 0 001 1h6a1 1 0 001-1V6"/></svg></button>';
    const toggle = row.querySelector('.toggle');
    wireToggle(toggle);
    row.querySelectorAll('[data-drill]').forEach(el => {
      el.addEventListener('click', (e) => { e.stopPropagation(); openDrill('cp-home', drill); });
    });
    row.querySelector('.w-del').addEventListener('click', (e) => {
      e.stopPropagation();
      onDelete();
      row.remove();
      updateHomeEmptyState();
      markDirty();
    });
    widgetsListBody.insertBefore(row, addWidgetWrap);
    return row;
  }

  function promoDrillMarkup(idp, key, drill, editDrill, title) {
    return ''
      + '<div class="cp-detail" data-detail="' + drill + '">'
      +   '<div class="cp-detail-header"><button class="cp-back">‹</button><div class="cp-detail-title">' + escHtml(title) + '</div></div>'
      +   '<div class="cp-section open"><div class="cp-head-row">Your cards <span class="pc-count">1</span> <span class="chev">›</span></div>'
      +     '<div class="cp-body"><div class="pc-items-list" id="' + idp + '-items-list"></div><button class="pc-add-btn" id="' + idp + '-add-btn">+ Add card</button></div></div>'
      +   '<div class="cp-section open"><div class="cp-head-row">Presentation <span class="chev">›</span></div><div class="cp-body">'
      +     '<div class="cp-field"><label>Display</label><div class="cp-radio-group">'
      +       '<div class="cp-radio active" data-bind-radio="' + idp + '-display" data-value="carousel">Carousel</div>'
      +       '<div class="cp-radio" data-bind-radio="' + idp + '-display" data-value="stack">Stack</div>'
      +       '<div class="cp-radio" data-bind-radio="' + idp + '-display" data-value="grid">Grid</div></div></div>'
      +     '<div class="cp-field"><label>Image</label><div class="cp-radio-group">'
      +       '<div class="cp-radio active" data-bind-radio="' + idp + '-image-size" data-value="cover">Cover</div>'
      +       '<div class="cp-radio" data-bind-radio="' + idp + '-image-size" data-value="beside">Beside</div>'
      +       '<div class="cp-radio" data-bind-radio="' + idp + '-image-size" data-value="behind">Behind</div></div></div>'
      +     '<div class="cp-field"><label>Button</label><div class="cp-radio-group">'
      +       '<div class="cp-radio active" data-bind-radio="' + idp + '-cta-style" data-value="filled">Filled</div>'
      +       '<div class="cp-radio" data-bind-radio="' + idp + '-cta-style" data-value="outline">Outline</div>'
      +       '<div class="cp-radio" data-bind-radio="' + idp + '-cta-style" data-value="link">Link</div>'
      +       '<div class="cp-radio" data-bind-radio="' + idp + '-cta-style" data-value="none">None</div></div></div>'
      +     '<div class="cp-field"><label>Corners</label><div class="cp-radio-group">'
      +       '<div class="cp-radio" data-bind-radio="' + idp + '-corners" data-value="sharp">Sharp</div>'
      +       '<div class="cp-radio active" data-bind-radio="' + idp + '-corners" data-value="rounded">Rounded</div></div></div>'
      +     '<div class="cp-field"><label>Card background</label><div class="cp-color-row compact">'
      +       '<div class="cp-color-swatch" style="background:var(--p-panel);"><input type="color" value="#1a1728" id="' + idp + '-bg-color" /></div>'
      +       '<div class="cp-color-info"><div class="cp-color-label">Card background</div><input class="cp-color-hex" value="#1A1728" spellcheck="false" maxlength="9" /></div>'
      +     '</div></div>'
      +   '</div></div>'
      + '</div>'
      + '<div class="cp-detail" data-detail="' + editDrill + '">'
      +   '<div class="cp-detail-header"><button class="cp-back" id="' + idp + '-card-back">‹</button><div class="cp-detail-title" id="' + idp + '-card-edit-title">Edit Card</div></div>'
      +   '<div class="cp-section open"><div class="cp-body">'
      +     '<div class="cp-field"><label>Headline</label><input class="cp-input-text" id="' + idp + '-edit-headline" placeholder="e.g. 20% OFF Tonight" /></div>'
      +     '<div class="cp-field"><label>Description</label><textarea class="cp-input-text cp-textarea" id="' + idp + '-edit-desc" rows="2" placeholder="Short promo text"></textarea></div>'
      +     '<div class="cp-field"><label>Image</label>'
      +       '<div class="pc-edit-image-zone" id="' + idp + '-edit-image-zone">'
      +         '<img class="pc-edit-image-preview" id="' + idp + '-edit-image-preview" style="display:none;" />'
      +         '<div class="pc-edit-image-empty" id="' + idp + '-edit-image-empty"><div class="pc-upload-prompt"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg><span>Drop image or click</span></div><div class="pc-upload-hint">jpg · png · webp · max 5 MB</div></div>'
      +       '</div>'
      +       '<input type="file" id="' + idp + '-edit-image-file" accept="image/png,image/jpeg,image/jpg,image/webp" style="display:none;" />'
      +       '<button class="pc-edit-image-remove" id="' + idp + '-edit-image-remove" style="display:none;">✕ Remove image</button>'
      +       '<div class="cp-upload-note">Recommended 1200 × 800 px (3:2) · shown crisp on all screens</div>'
      +     '</div>'
      +     '<div class="cp-field"><label>Tap action</label><select class="cp-select" id="' + idp + '-edit-action"><option value="none">None</option><option value="home">Go to: Home</option><option value="rewards">Go to: Rewards</option><option value="locations">Go to: Locations</option><option value="menu">Go to: Menu</option><option value="more">Go to: More</option><option value="webview">Open web link</option></select></div>'
      +     '<div class="cp-field"><label>Button text</label><input class="cp-input-text" id="' + idp + '-edit-btn-text" placeholder="e.g. View Menu →" /></div>'
      +   '</div></div>'
      + '</div>';
  }

  function createPromoInstance() {
    const n = dynWidgetSeq++;
    const idp = 'pc' + n;
    const key = 'promo-cards-' + n;
    const drill = 'promo-cards-' + n;
    const editDrill = idp + '-card-edit';
    const title = 'Promo Cards ' + n;

    // Phone widget element
    const widget = document.createElement('div');
    widget.className = 'promo-cards-widget';
    widget.dataset.widget = key;
    widget.dataset.pcDisplay = 'carousel';
    widget.dataset.pcImage = 'cover';
    widget.dataset.pcCta = 'filled';
    widget.dataset.pcCorners = 'rounded';
    widget.innerHTML = '<div class="pc-carousel-wrap" id="' + idp + '-carousel-wrap"></div><div class="pc-dots" id="' + idp + '-dots"></div>';
    homePageEl.appendChild(widget);

    // Drills
    const holder = document.createElement('div');
    holder.innerHTML = promoDrillMarkup(idp, key, drill, editDrill, title);
    const nodes = Array.from(holder.children);
    nodes.forEach(node => { cpHomeEl.appendChild(node); wireDrillNode(node); });
    // Main drill back → master; edit-drill back is wired by initPromoCards
    const mainDrill = cpHomeEl.querySelector('[data-detail="' + drill + '"]');
    mainDrill.querySelector('.cp-back').addEventListener('click', () => closeDrill('cp-home'));

    // Config row
    buildWidgetRow(title, key, drill, '.promo-cards-widget[data-widget=\'' + key + '\']', () => {
      widget.remove();
      cpHomeEl.querySelectorAll('[data-detail="' + drill + '"], [data-detail="' + editDrill + '"]').forEach(d => d.remove());
    });

    // Behaviour
    initPromoCards({
      key, idp, drill, editDrill,
      seed: [{ id: 0, headline: 'New promo', desc: 'Describe this offer', img: 'beef', imgData: null, action: 'none', btnText: 'Learn more →', visible: true }]
    });

    reorderPhoneWidgets();
    updateHomeEmptyState();
    markDirty();
    openDrill('cp-home', drill);
  }

  function createTextDivider() {
    const n = dynWidgetSeq++;
    const key = 'text-divider-' + n;
    const drill = 'divider-' + n;
    const label = 'New Section';

    // Phone element
    const el = document.createElement('div');
    el.className = 'text-divider align-center';
    el.dataset.widget = key;
    el.innerHTML = '<span>' + escHtml(label) + '</span>';
    homePageEl.appendChild(el);

    // Drill
    const holder = document.createElement('div');
    holder.innerHTML = ''
      + '<div class="cp-detail" data-detail="' + drill + '">'
      +   '<div class="cp-detail-header"><button class="cp-back">‹</button><div class="cp-detail-title">Text Divider</div></div>'
      +   '<div class="cp-section open"><div class="cp-head-row">Divider <span class="chev">›</span></div><div class="cp-body">'
      +     '<div class="cp-field"><label>Label</label><input class="cp-input-text dv-label" value="' + label + '" /></div>'
      +     '<div class="cp-field"><label>Alignment</label><div class="cp-radio-group">'
      +       '<div class="cp-radio active" data-dv-align="center">Center</div>'
      +       '<div class="cp-radio" data-dv-align="left">Left</div></div></div>'
      +     '<div class="cp-toggle-row"><span class="lbl">Show lines</span><span class="toggle on dv-lines"></span></div>'
      +   '</div></div>'
      + '</div>';
    const drillNode = holder.firstElementChild;
    cpHomeEl.appendChild(drillNode);
    drillNode.querySelectorAll('.cp-head-row').forEach(h => h.addEventListener('click', () => h.parentElement.classList.toggle('open')));
    drillNode.querySelector('.cp-back').addEventListener('click', () => closeDrill('cp-home'));
    // Label edit
    drillNode.querySelector('.dv-label').addEventListener('input', (e) => {
      el.querySelector('span').textContent = e.target.value;
      markDirty();
    });
    // Alignment
    drillNode.querySelectorAll('[data-dv-align]').forEach(r => {
      r.addEventListener('click', () => {
        drillNode.querySelectorAll('[data-dv-align]').forEach(x => x.classList.remove('active'));
        r.classList.add('active');
        el.classList.toggle('align-left', r.dataset.dvAlign === 'left');
        el.classList.toggle('align-center', r.dataset.dvAlign === 'center');
        markDirty();
      });
    });
    // Show-lines toggle
    const linesToggle = drillNode.querySelector('.dv-lines');
    linesToggle.addEventListener('click', () => {
      linesToggle.classList.toggle('on');
      el.classList.toggle('no-line', !linesToggle.classList.contains('on'));
      markDirty();
    });

    // Config row
    buildWidgetRow('Text Divider', key, drill, '.text-divider[data-widget=\'' + key + '\']', () => {
      el.remove();
      drillNode.remove();
    });

    reorderPhoneWidgets();
    updateHomeEmptyState();
    markDirty();
    openDrill('cp-home', drill);
  }

  if (addWidgetBtn && addWidgetMenu) {
    addWidgetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      addWidgetMenu.classList.toggle('open');
    });
    document.addEventListener('click', () => addWidgetMenu.classList.remove('open'));
    addWidgetMenu.addEventListener('click', (e) => e.stopPropagation());
    addWidgetMenu.querySelectorAll('button[data-add]').forEach(b => {
      b.addEventListener('click', () => {
        addWidgetMenu.classList.remove('open');
        if (b.dataset.add === 'promo') createPromoInstance();
        else if (b.dataset.add === 'divider') createTextDivider();
      });
    });
  }

  // ====================================================================
  // REWARDS CARDS — the three Rewards tiles get a promo-card-style editor
  // (image + copy + button). Where each card links to is fixed by the platform.
  // ====================================================================
  const rwTiles = {
    gifts: { name: 'My Gifts', headline: 'Active Rewards ready to be redeemed', desc: '3 rewards available · Tap to view', btnText: '', imgData: null },
    points: { name: 'My Points Shop', headline: '1 pt per AED spent', desc: 'Trade points for gifts, discounts, and exclusive perks', btnText: '', imgData: null },
    punch: { name: 'Punch Card', headline: 'Coffee Punch Card', desc: '7 of 10 · Free coffee after 10 stamps', btnText: '', imgData: null },
  };
  let rwEditKey = null;

  function rwRenderPhone(key) {
    const t = rwTiles[key];
    const el = document.querySelector('[data-rw-tile="' + key + '"]');
    if (!t || !el) return;
    const img = el.querySelector('.rw-img');
    const btn = el.querySelector('.rw-btn');
    el.querySelector('.prog-title').textContent = t.headline;
    el.querySelector('.prog-sub').textContent = t.desc;
    if (img) {
      img.style.display = t.imgData ? '' : 'none';
      img.style.backgroundImage = t.imgData ? 'url(' + t.imgData + ')' : '';
    }
    if (btn) {
      btn.style.display = t.btnText.trim() ? '' : 'none';
      btn.textContent = t.btnText;
    }
  }

  function rwPaintImageState(imgData) {
    const preview = document.getElementById('rw-edit-image-preview');
    const empty = document.getElementById('rw-edit-image-empty');
    const removeBtn = document.getElementById('rw-edit-image-remove');
    const zone = document.getElementById('rw-edit-image-zone');
    if (imgData) {
      preview.src = imgData;
      preview.style.display = 'block';
      empty.style.display = 'none';
      removeBtn.style.display = '';
      zone.classList.add('has-image');
    } else {
      preview.style.display = 'none';
      empty.style.display = '';
      removeBtn.style.display = 'none';
      zone.classList.remove('has-image');
    }
  }

  function rwOpenEditor(key) {
    const t = rwTiles[key];
    if (!t) return;
    rwEditKey = key;
    document.getElementById('rw-edit-title').textContent = t.name;
    document.getElementById('rw-edit-headline').value = t.headline;
    document.getElementById('rw-edit-desc').value = t.desc;
    document.getElementById('rw-edit-btn-text').value = t.btnText;
    rwPaintImageState(t.imgData);
    openDrill('cp-rewards', 'rw-tile');
  }

  document.querySelectorAll('[data-rw-key]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      rwOpenEditor(el.dataset.rwKey);
    });
  });

  ['rw-edit-headline', 'rw-edit-desc', 'rw-edit-btn-text'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      if (!rwEditKey) return;
      const t = rwTiles[rwEditKey];
      t.headline = document.getElementById('rw-edit-headline').value;
      t.desc = document.getElementById('rw-edit-desc').value;
      t.btnText = document.getElementById('rw-edit-btn-text').value;
      rwRenderPhone(rwEditKey);
      markDirty();
    });
  });

  const rwImageZone = document.getElementById('rw-edit-image-zone');
  const rwImageFile = document.getElementById('rw-edit-image-file');
  if (rwImageZone) {
    rwImageZone.addEventListener('click', () => rwImageFile.click());
    rwImageZone.addEventListener('dragover', (e) => { e.preventDefault(); rwImageZone.style.borderColor = 'var(--como)'; });
    rwImageZone.addEventListener('dragleave', () => { rwImageZone.style.borderColor = ''; });
    rwImageZone.addEventListener('drop', (e) => {
      e.preventDefault();
      rwImageZone.style.borderColor = '';
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) rwApplyImage(file);
    });
  }
  if (rwImageFile) {
    rwImageFile.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) rwApplyImage(e.target.files[0]);
    });
  }
  function rwApplyImage(file) {
    readImageFile(file, (dataUrl) => {
      if (!rwEditKey) return;
      rwTiles[rwEditKey].imgData = dataUrl;
      rwPaintImageState(dataUrl);
      rwRenderPhone(rwEditKey);
      markDirty();
    });
  }
  const rwImageRemove = document.getElementById('rw-edit-image-remove');
  if (rwImageRemove) {
    rwImageRemove.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!rwEditKey) return;
      rwTiles[rwEditKey].imgData = null;
      rwPaintImageState(null);
      rwImageFile.value = '';
      rwRenderPhone(rwEditKey);
      markDirty();
    });
  }

  // ---------- Drag & reorder for widget rows (tile-hang float) ----------
  function initReorderable(container, onReorder) {
    if (!container) return;
    let dragging = null;
    let startY = 0;
    let itemH = 0;
    let currentIdx = 0;
    let targetIdx = 0;
    let liveRows = [];

    const onMove = (e) => {
      if (!dragging) return;
      const deltaY = e.clientY - startY;
      dragging.style.transform = 'translateY(' + deltaY + 'px) scale(1.03) rotate(' + (deltaY > 0 ? 1.2 : -1.2) + 'deg)';

      const shift = Math.round(deltaY / itemH);
      const newTarget = Math.max(0, Math.min(liveRows.length - 1, currentIdx + shift));
      if (newTarget === targetIdx) return;
      targetIdx = newTarget;

      liveRows.forEach((r, i) => {
        if (r === dragging) return;
        let disp = 0;
        if (currentIdx < targetIdx && i > currentIdx && i <= targetIdx) disp = -itemH;
        else if (currentIdx > targetIdx && i < currentIdx && i >= targetIdx) disp = itemH;
        r.style.transform = 'translateY(' + disp + 'px)';
      });
    };

    const onUp = () => {
      if (!dragging) return;
      const draggedRow = dragging;
      const from = currentIdx;
      const to = targetIdx;

      // Settle animation
      draggedRow.style.transition = 'transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 260ms ease';
      draggedRow.style.transform = 'translateY(0) scale(1) rotate(0)';

      setTimeout(() => {
        if (from !== to && liveRows[to]) {
          const ref = liveRows[to];
          if (from < to) ref.parentNode.insertBefore(draggedRow, ref.nextSibling);
          else ref.parentNode.insertBefore(draggedRow, ref);
          if (onReorder) onReorder();
        }
        liveRows.forEach(r => {
          r.style.transform = '';
          r.style.transition = '';
        });
        draggedRow.classList.remove('dragging');
        draggedRow.style.zIndex = '';
        draggedRow.style.boxShadow = '';
        dragging = null;
        liveRows = [];
      }, 260);

      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    container.addEventListener('mousedown', (e) => {
      const handle = e.target.closest('.handle');
      if (!handle) return;
      const row = handle.closest('.cp-widget-row');
      if (!row || !row.classList.contains('on')) return;
      e.preventDefault();

      liveRows = Array.from(container.querySelectorAll('.cp-widget-row.on'));
      currentIdx = liveRows.indexOf(row);
      targetIdx = currentIdx;
      dragging = row;
      startY = e.clientY;
      itemH = row.offsetHeight + 6;

      row.classList.add('dragging');
      liveRows.forEach(r => {
        if (r === row) return;
        r.style.transition = 'transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)';
      });

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  function reorderPhoneWidgets() {
    const homePage = document.querySelector('.app-page[data-page="home"]');
    if (!homePage) return;
    const container = document.querySelector('#cp-home .cp-master');
    if (!container) return;
    const anchor = homePage.querySelector('[data-empty="home"]');
    if (!anchor) return;
    const orderedKeys = Array.from(container.querySelectorAll('.cp-widget-row'))
      .map(r => r.querySelector('.toggle'))
      .filter(Boolean)
      .map(t => t.dataset.widgetToggle);
    let prev = anchor;
    orderedKeys.forEach(key => {
      const widget = homePage.querySelector('[data-widget="' + key + '"]');
      if (widget) {
        prev.parentNode.insertBefore(widget, prev.nextSibling);
        prev = widget;
      }
    });
  }

  // Rewards cards (My Gifts / My Points Shop / Punch Card) share one flex container,
  // so reordering is just re-appending each card in the config panel's row order.
  function reorderRewardsCards() {
    const rewardsPage = document.querySelector('.app-page[data-page="rewards"]');
    if (!rewardsPage) return;
    const container = document.querySelector('#cp-rewards .cp-master');
    if (!container) return;
    const wrap = rewardsPage.querySelector('.rewards-progs');
    if (!wrap) return;
    const orderedKeys = Array.from(container.querySelectorAll('.cp-widget-row'))
      .map(r => r.querySelector('.w-name'))
      .filter(Boolean)
      .map(n => n.dataset.rwKey);
    orderedKeys.forEach(key => {
      const card = wrap.querySelector('[data-rw-tile="' + key + '"]');
      if (card) wrap.appendChild(card);
    });
  }

  initReorderable(document.querySelector('#cp-home .cp-master'), reorderPhoneWidgets);
  initReorderable(document.querySelector('#cp-rewards .cp-master'), reorderRewardsCards);

  // ---------- Save changes ----------
  const saveBtn = document.getElementById('save-btn');
  function markDirty() {
    saveBtn.classList.remove('disabled');
    saveBtn.textContent = 'Save changes';
  }
  saveBtn.addEventListener('click', () => {
    if (saveBtn.classList.contains('disabled')) return;
    saveBtn.classList.add('disabled');
    saveBtn.textContent = 'Saved ✓';
    showToast('Changes saved · would push to Bundy OTA in production');
  });

  // ---------- Toast helper ----------
  const toastEl = document.getElementById('toast-hint');
  let toastTimer;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  // ---------- Live clock ----------
  function tick() {
    const d = new Date();
    document.getElementById('clock').textContent =
      d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  }
  tick();
  setInterval(tick, 30000);
