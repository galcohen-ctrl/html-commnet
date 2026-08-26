/**
 * Guided flow — replaces the full-screen setup wizard.
 *
 * The sidebar is the stepper: every setup task and every app screen is one
 * step with its own completion state. First-time merchants follow the order
 * top to bottom; returning merchants click straight into any step.
 */

const STEPS = [
  { key: 'business', label: 'Business details', kind: 'setup' },
  { key: 'app-focus', label: 'App focus', kind: 'setup' },
  { key: 'branding', label: 'Branding', kind: 'setup' },
  { key: 'home', label: 'Home', kind: 'screen' },
  { key: 'rewards', label: 'Rewards', kind: 'screen' },
  { key: 'locations', label: 'Locations', kind: 'screen' },
  { key: 'menu', label: 'Menu', kind: 'screen' },
  { key: 'more', label: 'More', kind: 'screen' },
  { key: 'publish', label: 'Review & publish', kind: 'publish' },
];

const FOCUS_LABELS = {
  loyalty: 'Loyalty and rewards',
  ordering: 'Online ordering',
  blank: 'Blank canvas',
};

const FOCUS_ICONS = {
  loyalty: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>',
  ordering: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 01-8 0"/></svg>',
  blank: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3" stroke-dasharray="3 3"/></svg>',
};

export function initGuidedFlow(ctx) {
  const { showToast, markDirty } = ctx;

  const done = new Set();
  const flow = { current: 'home', focus: null, bizName: '', headline: '', country: '', bizType: '', category: '', accent: '#6d28d9', font: 'sans-serif' };

  const stepButtons = [...document.querySelectorAll('.side-step[data-step]')];
  const indexOf = (key) => STEPS.findIndex((s) => s.key === key);

  /* ------------------------------------------------------------- routing */

  // Setup and publish steps have no matching phone page, so the preview stays
  // on Home while the merchant fills them in.
  function showSetupPage(key) {
    document.querySelectorAll('.cp-page').forEach((cp) => {
      cp.style.display = cp.id === 'cp-' + key ? 'flex' : 'none';
    });
    // Arriving at a step always starts at its top level, never inside a stale drill.
    window.closeL3Panel?.();
    document.querySelectorAll('.cp-master').forEach((m) => m.classList.remove('hide'));
    document.querySelectorAll('.cp-page .cp-detail').forEach((d) => d.classList.remove('show'));
    // The preview stays on the real Home screen throughout setup, so whatever the
    // merchant sees while choosing a focus and branding is what they keep.
    document.querySelectorAll('.app-page').forEach((p) => {
      p.classList.toggle('active', p.dataset.page === 'home');
    });
    document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
    const panel = document.getElementById('config-panel');
    if (panel) panel.scrollTop = 0;
  }

  function goToStep(key) {
    const step = STEPS[indexOf(key)];
    if (!step) return;
    flow.current = key;
    if (step.kind === 'screen') window.goToPage(key);
    else showSetupPage(key);
    if (key === 'publish') renderReview();
    render();
  }
  window.goToBrandingStep = () => goToStep('branding');

  /* ------------------------------------------------------------ rendering */

  // The footer used to always mean "next step" even when the merchant was two levels
  // deep inside a widget editor, so Back threw them onto an unrelated step. Footer and
  // breadcrumb now describe the level they are actually on.
  // A drill left open inside a hidden page must not count as the current depth.
  function currentPageEl() {
    return document.getElementById('cp-' + flow.current);
  }
  function openDrillEl() {
    const page = currentPageEl();
    if (!page) return null;
    return [...page.querySelectorAll('.cp-detail.show')].find((d) => !d.closest('#l3-body')) || null;
  }
  function openL3El() {
    return document.querySelector('#l3-body .cp-detail.show') || null;
  }
  function titleOf(el, fallback) {
    return el?.querySelector('.cp-detail-title')?.textContent?.trim() || fallback;
  }
  function exitOneLevel() {
    if (openL3El()) { window.closeL3Panel?.(); return true; }
    const drill = openDrillEl();
    if (drill) { window.closeDrill?.(drill.closest('.cp-page').id); return true; }
    return false;
  }

  function renderBreadcrumb(step, drill, l3) {
    const bar = document.getElementById('cp-breadcrumb');
    if (!bar) return;
    bar.innerHTML = '';
    const trail = [{ label: step.label, exit: 2 }];
    if (drill) trail.push({ label: titleOf(drill, 'Widget'), exit: 1 });
    if (l3) trail.push({ label: titleOf(l3, 'Item'), exit: 0 });

    trail.forEach((node, i) => {
      if (i > 0) {
        const sep = document.createElement('span');
        sep.className = 'cp-crumb-sep';
        sep.textContent = '›';
        bar.appendChild(sep);
      }
      const isLast = i === trail.length - 1;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cp-crumb-item' + (isLast ? ' current' : '');
      btn.textContent = node.label;
      btn.title = node.label;
      if (!isLast) {
        btn.addEventListener('click', () => {
          for (let hops = trail.length - 1 - i; hops > 0; hops -= 1) exitOneLevel();
        });
      }
      bar.appendChild(btn);
    });

    const level = document.createElement('span');
    level.className = 'cp-crumb-level';
    level.textContent = l3 ? 'Item'
      : drill ? 'Widget'
        : step.kind === 'screen' ? 'Screen'
          : step.kind === 'publish' ? 'Publish' : 'Setup';
    bar.appendChild(level);
  }

  function render() {
    stepButtons.forEach((btn) => {
      const key = btn.dataset.step;
      btn.classList.toggle('done', done.has(key));
      btn.classList.toggle('active', key === flow.current);
    });

    const position = indexOf(flow.current);
    const step = STEPS[position];
    if (!step) return;
    const drill = openDrillEl();
    const l3 = openL3El();
    renderBreadcrumb(step, drill, l3);

    const countEl = document.getElementById('gf-step-count');
    if (countEl) countEl.textContent = `Step ${position + 1} of ${STEPS.length}`;

    const nextBtn = document.getElementById('gf-step-next');
    const nextLabel = document.getElementById('gf-step-next-label');
    const backBtn = document.getElementById('gf-step-back');
    const backLabel = document.getElementById('gf-step-back-label');

    if (drill || l3) {
      const parentLabel = l3 ? titleOf(drill, step.label) : step.label;
      if (backLabel) backLabel.textContent = `Back to ${parentLabel}`;
      if (backBtn) backBtn.style.visibility = '';
      if (nextLabel) nextLabel.textContent = 'Done';
      if (nextBtn) nextBtn.style.display = '';
      return;
    }

    if (backLabel) backLabel.textContent = 'Back';
    if (backBtn) backBtn.style.visibility = position === 0 ? 'hidden' : '';
    if (nextLabel) nextLabel.textContent = done.has(flow.current) ? 'Saved · continue' : 'Save and continue';
    if (nextBtn) nextBtn.style.display = position === STEPS.length - 1 ? 'none' : '';
  }

  document.addEventListener('como:navchange', render);

  function renderReview() {
    const list = document.getElementById('gf-review-list');
    if (!list) return;
    list.innerHTML = STEPS.filter((s) => s.key !== 'publish')
      .map(
        (s) => `<div class="gf-review-row${done.has(s.key) ? ' done' : ''}">
          <span class="rv-tick"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></span>
          <span class="gf-review-name">${s.label}</span>
          <button class="gf-review-edit" data-review-go="${s.key}" type="button">${done.has(s.key) ? 'Edit' : 'Set up'}</button>
        </div>`,
      )
      .join('');
    list.querySelectorAll('[data-review-go]').forEach((b) => {
      b.addEventListener('click', () => goToStep(b.dataset.reviewGo));
    });
  }

  /* -------------------------------------------------------- step controls */

  stepButtons.forEach((btn) => {
    btn.addEventListener('click', () => goToStep(btn.dataset.step));
  });

  const nextBtn = document.getElementById('gf-step-next');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (exitOneLevel()) return;
      done.add(flow.current);
      markDirty?.();
      const next = STEPS[indexOf(flow.current) + 1];
      if (next) goToStep(next.key);
      else render();
    });
  }

  const backBtn = document.getElementById('gf-step-back');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      if (exitOneLevel()) return;
      const prev = STEPS[indexOf(flow.current) - 1];
      if (prev) goToStep(prev.key);
    });
  }


  /* -------------------------------------------------------- welcome modal */

  // A reviewer filled in real fields mid-tour without realising she was in a tour,
  // so the tour now blocks the editor entirely and narrates it instead.
  // `before` puts the app into the state each step describes.
  const TOUR_STEPS = [
    {
      target: '.side-nav', title: 'Track your progress',
      text: 'Each step in the left panel represents a section of your app. Completed steps display a green tick. You can work on them in any order.',
      before: () => goToStep('business'),
    },
    {
      target: '#config-panel', title: 'Enter your details',
      text: 'Use this panel to add your business information and choose the content for each section of your app.',
    },
    {
      target: '#device-frame', title: 'Preview your app',
      text: 'This preview reflects your changes in real time. What you see here is what your customers will see.',
    },
    {
      target: '#cp-breadcrumb', title: 'Know where you are',
      text: 'This trail shows your current step, the widget you opened, and the item inside it. Select any part of it to move back up a level.',
    },
    {
      target: '.cp-step-foot', title: 'Save and continue',
      text: 'Save your progress at the bottom of each step. You can go back and make changes at any time.',
    },
    {
      target: '#gf-focus-options', title: 'Choose your app focus',
      text: 'Select what your app is mainly for. This sets your starting layout only. You can add loyalty or ordering features at any time.',
      before: () => goToStep('app-focus'),
    },
    {
      target: '#gf-accent-row', title: 'Apply your brand colour',
      text: 'Select a colour and it is applied across every screen. Advanced options let you set backgrounds, cards, and text separately.',
      before: () => goToStep('branding'),
    },
    {
      target: '#cp-home-widgets', title: 'Build your home screen',
      text: 'Select the plus icon to add a widget, the pencil to edit it, and the handle to change its order. Hover over any widget to preview it on the phone before you add it.',
      before: () => goToStep('home'),
    },
    {
      target: '[data-detail="promo-cards"]', title: 'Edit a widget',
      text: 'Opening a widget shows its settings. Here you manage the cards it contains and how the widget is presented.',
      before: () => { goToStep('home'); window.openDrill?.('cp-home', 'promo-cards'); },
    },
    {
      target: '#l3-panel', title: 'Edit a single item',
      text: 'Individual items open in this third panel, so the list they belong to stays visible. Each card has its own image, link, and button, or no button at all.',
      before: () => {
        goToStep('home');
        window.openDrill?.('cp-home', 'promo-cards');
        document.querySelector('#cp-home .pc-item')?.click();
      },
    },
    {
      target: '#rw-page-content', title: 'Add your own content',
      text: 'A page does not have to contain only its default widgets. Add text, promo cards, or a banner so the page carries your brand as well.',
      before: () => goToStep('rewards'),
    },
    {
      target: '.sm-body, #settings-modal', title: 'Manage your settings',
      text: 'Your store listing, online ordering, notifications, and integrations are managed here, separately from designing your screens.',
      before: () => { goToStep('home'); window.openSettings?.('general'); },
    },
  ];

  let tourBubble = null;
  let tourHighlight = null;
  let tourBadge = null;
  let tourActive = false;

  function clearTourChrome() {
    [tourBubble, tourHighlight, tourBadge].forEach((el) => el?.remove());
    tourBubble = tourHighlight = tourBadge = null;
  }

  function endTour(toStart) {
    tourActive = false;
    clearTourChrome();
    document.body.classList.remove('gf-touring');
    window.closeSettings?.();
    document.getElementById('settings-modal')?.classList.remove('open');
    window.closeL3Panel?.();
    window.closeDrill?.('cp-home');
    if (toStart) {
      goToStep('business');
      showToast?.('Tour closed — this is your setup, go ahead and edit');
    }
  }

  function ensureTourChrome() {
    if (!tourBadge) {
      tourBadge = document.createElement('div');
      tourBadge.className = 'gf-tour-badge';
      tourBadge.innerHTML = '<span class="gf-tour-badge-dot"></span><span id="gf-tour-badge-text"></span>'
        + '<button class="gf-tour-badge-exit" type="button">Exit tour</button>';
      tourBadge.querySelector('.gf-tour-badge-exit').addEventListener('click', () => endTour(true));
      document.body.appendChild(tourBadge);
    }
  }

  function showTourStep(idx) {
    if (idx >= TOUR_STEPS.length) { endTour(true); return; }
    tourActive = true;
    document.body.classList.add('gf-touring');
    ensureTourChrome();

    const step = TOUR_STEPS[idx];
    try { step.before?.(); } catch { /* a step that can't be staged still narrates */ }

    // Staged steps open panels that animate in, so measuring on the next frame would
    // catch them mid-transition. Let them settle before positioning the bubble.
    const paint = () => {
      if (!tourActive) return;
      tourBubble?.remove();
      tourHighlight?.remove();
      tourBubble = tourHighlight = null;

      document.getElementById('gf-tour-badge-text').textContent = `Product tour · ${idx + 1} of ${TOUR_STEPS.length}`;

      const anchor = step.target.split(',').map((s) => document.querySelector(s.trim())).find((el) => {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
      if (!anchor) { showTourStep(idx + 1); return; }
      const rect = anchor.getBoundingClientRect();

      tourHighlight = document.createElement('div');
      tourHighlight.className = 'gf-tour-highlight';
      tourHighlight.style.top = `${rect.top}px`;
      tourHighlight.style.left = `${rect.left}px`;
      tourHighlight.style.width = `${rect.width}px`;
      tourHighlight.style.height = `${rect.height}px`;
      document.body.appendChild(tourHighlight);

      tourBubble = document.createElement('div');
      tourBubble.className = 'gf-tour-bubble';
      tourBubble.innerHTML = `
        <div class="gf-tour-header">${step.title} <span class="gf-tour-count">${idx + 1} / ${TOUR_STEPS.length}</span></div>
        <div class="gf-tour-body">${step.text}</div>
        <div class="gf-tour-actions">
          <button class="gf-tour-exit" type="button">Exit tour</button>
          ${idx > 0 ? '<button class="gf-tour-prev" type="button">Back</button>' : ''}
          <button class="gf-tour-next gf-btn primary" type="button">${idx < TOUR_STEPS.length - 1 ? 'Next →' : 'Start building →'}</button>
        </div>
        <div class="gf-tour-dots">${TOUR_STEPS.map((_, i) => `<span class="gf-tour-dot${i === idx ? ' active' : ''}"></span>`).join('')}</div>
      `;
      document.body.appendChild(tourBubble);

      const bw = tourBubble.offsetWidth;
      const bh = tourBubble.offsetHeight;
      const gap = 16;
      const margin = 12;
      let left;
      let arrowSide;

      if (window.innerWidth - rect.right >= bw + gap) {
        left = rect.right + gap;
        arrowSide = 'left';
      } else if (rect.left >= bw + gap) {
        left = rect.left - bw - gap;
        arrowSide = 'right';
      } else {
        left = Math.min(rect.right + gap, window.innerWidth - bw - margin);
        arrowSide = 'left';
      }
      let top = rect.top + rect.height / 2 - bh / 2;
      top = Math.max(margin, Math.min(top, window.innerHeight - bh - margin));
      left = Math.max(margin, Math.min(left, window.innerWidth - bw - margin));

      tourBubble.style.top = `${top}px`;
      tourBubble.style.left = `${left}px`;
      tourBubble.classList.toggle('arrow-right', arrowSide === 'right');
      const arrowY = rect.top + rect.height / 2 - top;
      tourBubble.style.setProperty('--gf-arrow-y', `${Math.max(18, Math.min(arrowY, bh - 18))}px`);

      tourBubble.querySelector('.gf-tour-next').addEventListener('click', () => showTourStep(idx + 1));
      tourBubble.querySelector('.gf-tour-prev')?.addEventListener('click', () => showTourStep(idx - 1));
      tourBubble.querySelector('.gf-tour-exit').addEventListener('click', () => endTour(true));
    };

    if (step.before) setTimeout(paint, 340);
    else requestAnimationFrame(paint);
  }

  document.addEventListener('keydown', (e) => {
    if (tourActive && e.key === 'Escape') endTour(true);
  });

  const welcome = document.getElementById('gf-welcome');
  if (welcome) {
    welcome.classList.add('open');
    const close = (withTour) => {
      welcome.classList.remove('open');
      goToStep('business');
      if (withTour) requestAnimationFrame(() => showTourStep(0));
    };
    document.getElementById('gf-welcome-start')?.addEventListener('click', () => close(true));
    document.getElementById('gf-welcome-skip')?.addEventListener('click', () => close(false));
  }

  /* ------------------------------------------------- business details step */

  const nameInput = document.getElementById('gf-biz-name');
  if (nameInput) {
    nameInput.addEventListener('input', () => {
      flow.bizName = nameInput.value;
      const name = flow.bizName || 'Your Business';
      const initials = name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
      ctx.setBrand?.(name, initials || '?', flow.focus ? FOCUS_LABELS[flow.focus] : '');
      const bound = document.querySelector('[data-bind-text=".app-page[data-page=\'home\'] .app-top-header .brand-text .name"]');
      if (bound) bound.value = name;
    });
  }

  const headlineInput = document.getElementById('gf-headline');
  const brandingHeadlineInput = document.getElementById('gf-branding-headline');
  function setHeadline(value, source) {
    flow.headline = value;
    if (headlineInput && source !== headlineInput) headlineInput.value = value;
    if (brandingHeadlineInput && source !== brandingHeadlineInput) brandingHeadlineInput.value = value;
    const subtitle = document.getElementById('phone-brand-sub');
    if (subtitle) subtitle.textContent = value || 'Storefront headline';
    markDirty?.();
  }
  headlineInput?.addEventListener('input', () => setHeadline(headlineInput.value, headlineInput));
  brandingHeadlineInput?.addEventListener('input', () => setHeadline(brandingHeadlineInput.value, brandingHeadlineInput));

  document.querySelectorAll('#gf-biz-type-row [data-biztype]').forEach((chip) => {
    chip.addEventListener('click', () => {
      flow.bizType = chip.dataset.biztype;
      document.querySelectorAll('#gf-biz-type-row [data-biztype]').forEach((c) => c.classList.toggle('selected', c === chip));
    });
  });

  document.getElementById('gf-country')?.addEventListener('change', (e) => {
    flow.country = e.target.value;
  });

  // Merchants can span industries (restaurant + convenience store), so this is a
  // capped multi-select rather than one choice.
  const MAX_CATEGORIES = 3;
  flow.categories = [];

  function renderCategories() {
    const chips = [...document.querySelectorAll('#gf-cat-row [data-cat]')];
    const atCap = flow.categories.length >= MAX_CATEGORIES;
    chips.forEach((c) => {
      const on = flow.categories.includes(c.dataset.cat);
      c.classList.toggle('selected', on);
      c.classList.toggle('disabled', !on && atCap);
    });
    const badge = document.querySelector('.app-page[data-page="home"] .category-badge');
    if (badge) {
      const [first, ...rest] = flow.categories;
      badge.textContent = first ? (rest.length ? `${first} +${rest.length}` : first) : '';
      badge.classList.toggle('hidden-slot', !first);
    }
    const hint = document.getElementById('gf-cat-hint');
    if (hint) {
      hint.textContent = atCap
        ? `You've picked ${MAX_CATEGORIES} of ${MAX_CATEGORIES}. Deselect one to choose a different industry.`
        : 'Pick every industry you operate in — a restaurant with a convenience store counts as both.';
    }
  }

  document.querySelectorAll('#gf-cat-row [data-cat]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const cat = chip.dataset.cat;
      const idx = flow.categories.indexOf(cat);
      if (idx > -1) {
        flow.categories.splice(idx, 1);
      } else if (flow.categories.length < MAX_CATEGORIES) {
        flow.categories.push(cat);
      } else {
        showToast?.(`You can pick up to ${MAX_CATEGORIES} industries`);
        return;
      }
      flow.category = flow.categories[0] || '';
      renderCategories();
    });
  });
  renderCategories();

  /* -------------------------------------------------------- branding step */

  function applyAccent(hex) {
    flow.accent = hex;
    document.body.style.setProperty('--p-accent', hex);
    window.syncColorVar?.('--p-accent', hex);
    document.querySelectorAll('#gf-accent-row [data-accent]').forEach((s) => {
      s.classList.toggle('selected', s.dataset.accent.toLowerCase() === hex.toLowerCase());
    });
  }
  document.querySelectorAll('#gf-accent-row [data-accent]').forEach((sw) => {
    sw.addEventListener('click', () => applyAccent(sw.dataset.accent));
  });
  document.getElementById('gf-accent-custom')?.addEventListener('input', (e) => applyAccent(e.target.value));

  const logoZone = document.getElementById('gf-logo-zone');
  const logoFile = document.getElementById('gf-logo-file');
  const logoResult = document.getElementById('gf-logo-result');
  const logoThumb = document.getElementById('gf-logo-thumb-img');
  const logoFilename = document.getElementById('gf-logo-filename');
  const logoControls = document.getElementById('gf-logo-controls');

  function paintLogoTargets(dataUrl) {
    document.querySelectorAll('.app-page .app-top-header .brand-mark, #brand-logo').forEach((el) => {
      if (!el) return;
      el.classList.toggle('has-logo', !!dataUrl);
      el.style.backgroundImage = dataUrl ? `url(${dataUrl})` : '';
      el.style.backgroundSize = dataUrl ? 'cover' : '';
      el.style.backgroundPosition = dataUrl ? 'center' : '';
      if (!dataUrl) el.textContent = el.id === 'brand-logo' ? '?' : '?';
    });
  }

  function showLogoResult(dataUrl, name) {
    if (logoThumb) logoThumb.src = dataUrl;
    if (logoFilename) logoFilename.textContent = name;
    if (logoResult) logoResult.style.display = '';
    if (logoZone) logoZone.style.display = 'none';
    if (logoControls) logoControls.hidden = false;
  }

  function clearLogoResult() {
    if (logoResult) logoResult.style.display = 'none';
    if (logoZone) logoZone.style.display = '';
    if (logoControls) logoControls.hidden = true;
    if (logoFile) logoFile.value = '';
    paintLogoTargets(null);
    markDirty?.();
    showToast?.('Logo removed');
  }

  function readLogoFile(file) {
    if (!file) return;
    if (!/^image\/(png|jpeg|jpg|webp)/i.test(file.type)) { showToast?.('Only png, jpg, or webp supported'); return; }
    if (file.size > 5 * 1024 * 1024) { showToast?.('File too big — max 5MB'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      paintLogoTargets(dataUrl);
      showLogoResult(dataUrl, file.name);
      markDirty?.();
      showToast?.('Logo uploaded');
    };
    reader.readAsDataURL(file);
  }

  if (logoZone && logoFile) {
    logoZone.addEventListener('click', () => logoFile.click());
    logoZone.addEventListener('dragover', (e) => { e.preventDefault(); logoZone.classList.add('drag-over'); });
    logoZone.addEventListener('dragleave', () => logoZone.classList.remove('drag-over'));
    logoZone.addEventListener('drop', (e) => {
      e.preventDefault();
      logoZone.classList.remove('drag-over');
      readLogoFile(e.dataTransfer.files?.[0]);
    });
    logoFile.addEventListener('change', () => readLogoFile(logoFile.files?.[0]));
    document.getElementById('gf-logo-replace')?.addEventListener('click', () => logoFile.click());
    document.getElementById('gf-logo-remove')?.addEventListener('click', clearLogoResult);
  }
  document.querySelectorAll('#gf-font-row [data-font]').forEach((chip) => {
    chip.addEventListener('click', () => {
      flow.font = chip.dataset.font;
      document.querySelectorAll('#gf-font-row [data-font]').forEach((c) => c.classList.toggle('selected', c === chip));
      const fontStacks = {
        'sans-serif': '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
        serif: 'Georgia, "Times New Roman", serif',
        mono: '"SFMono-Regular", Consolas, monospace',
        rounded: '"Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
        slab: 'Rockwell, "Roboto Slab", Georgia, serif',
      };
      ctx.applyFontFamily?.(fontStacks[flow.font] || fontStacks['sans-serif']);
    });
  });


  /* ------------------------------------------- app focus card (Home step) */
  /* --------------------------------------------------------- app focus step */

  function setFocus(goal) {
    flow.focus = goal;
    window.applyGoalPreset?.(goal);
    // The recap appears on more than one step, so every instance is kept in sync.
    document.querySelectorAll('.cp-focus-val').forEach((el) => {
      el.textContent = FOCUS_LABELS[goal] || 'Not chosen yet';
    });
    document.querySelectorAll('.cp-focus-ic').forEach((el) => {
      el.innerHTML = FOCUS_ICONS[goal] || '';
    });
    document.querySelectorAll('#gf-focus-options [data-focus]').forEach((b) => {
      b.classList.toggle('selected', b.dataset.focus === goal);
    });
    document.querySelectorAll('.cp-focus-menu [data-focus]').forEach((b) => {
      b.classList.toggle('active', b.dataset.focus === goal);
    });
    document.body.classList.remove('focus-loyalty', 'focus-ordering', 'focus-blank');
    document.body.classList.add('focus-' + goal);
  }

  // App Focus step: big Celia-style cards. Picking one applies the focus and
  // advances to the next step, mirroring "select then Save & continue".
  document.querySelectorAll('#gf-focus-options [data-focus]').forEach((card) => {
    card.addEventListener('click', () => {
      setFocus(card.dataset.focus);
      done.add('app-focus');
      showToast?.(`App focus set to ${FOCUS_LABELS[card.dataset.focus]}`);
    });
  });

  // Home and Branding both carry a recap so the merchant can switch focus without
  // going back a step. Wire every instance the same way.
  document.querySelectorAll('.cp-focus-recap').forEach((recap) => {
    const changeBtn = recap.querySelector('.cp-focus-change');
    const menu = recap.querySelector('.cp-focus-menu');
    if (!changeBtn || !menu) return;
    changeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const wasOpen = menu.classList.contains('open');
      document.querySelectorAll('.cp-focus-menu.open').forEach((m) => m.classList.remove('open'));
      menu.classList.toggle('open', !wasOpen);
    });
    menu.querySelectorAll('[data-focus]').forEach((b) => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.remove('open');
        setFocus(b.dataset.focus);
        showToast?.(`App focus set to ${FOCUS_LABELS[b.dataset.focus]}`);
      });
    });
  });
  document.addEventListener('click', () => {
    document.querySelectorAll('.cp-focus-menu.open').forEach((m) => m.classList.remove('open'));
  });

  /* -------------------------------------------------------- publish step */

  document.getElementById('gf-publish-btn')?.addEventListener('click', () => {
    done.add('publish');
    render();
    showToast?.('Your app would now be sent to the App Store and Google Play');
  });

  setFocus('blank');
  goToStep('home');

  return { goToStep };
}
