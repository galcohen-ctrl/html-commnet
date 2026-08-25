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

  /* ------------------------------------------------------------ rendering */

  function render() {
    stepButtons.forEach((btn) => {
      const key = btn.dataset.step;
      btn.classList.toggle('done', done.has(key));
      btn.classList.toggle('active', key === flow.current);
    });

    const position = indexOf(flow.current);
    const countEl = document.getElementById('gf-step-count');
    if (countEl) countEl.textContent = `Step ${position + 1} of ${STEPS.length}`;

    const nextBtn = document.getElementById('gf-step-next');
    if (nextBtn) {
      const isLast = position === STEPS.length - 1;
      nextBtn.style.display = isLast ? 'none' : '';
      nextBtn.firstChild.textContent = done.has(flow.current) ? 'Saved · continue ' : 'Save and continue ';
    }

    const backBtn = document.getElementById('gf-step-back');
    if (backBtn) backBtn.style.visibility = position === 0 ? 'hidden' : '';
  }

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
      const prev = STEPS[indexOf(flow.current) - 1];
      if (prev) goToStep(prev.key);
    });
  }


  /* -------------------------------------------------------- welcome modal */

  const TOUR_STEPS = [
    { target: '.side-nav', title: 'Your steps', text: 'Follow these steps top to bottom. Each gets a green tick when done — and you can jump to any of them at any time.' },
    { target: '#config-panel', title: 'Set it up here', text: 'This panel is where you fill in details and choose the widgets for each step of your app.' },
    { target: '#device-frame', title: 'Live preview', text: 'Your customer\'s app updates here instantly as you make changes — no guessing what it looks like.' },
    { target: '.cp-step-foot', title: 'Save and continue', text: 'When a step looks good, save and move on. You can always go back and edit later.' },
  ];

  let tourBubble = null;
  let tourHighlight = null;

  function clearTour() {
    if (tourBubble) { tourBubble.remove(); tourBubble = null; }
    if (tourHighlight) { tourHighlight.remove(); tourHighlight = null; }
  }

  function showTourStep(idx) {
    clearTour();
    if (idx >= TOUR_STEPS.length) return;
    const step = TOUR_STEPS[idx];
    const anchor = document.querySelector(step.target);
    if (!anchor) { showTourStep(idx + 1); return; }
    const rect = anchor.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) { showTourStep(idx + 1); return; }

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
      <div class="gf-tour-header">Step ${idx + 1} — ${step.title} <span class="gf-tour-count">${idx + 1} / ${TOUR_STEPS.length}</span></div>
      <div class="gf-tour-body">${step.text}</div>
      <div class="gf-tour-actions">
        <button class="gf-tour-exit" type="button">Exit tour</button>
        <button class="gf-tour-next gf-btn primary" type="button">${idx < TOUR_STEPS.length - 1 ? 'Next →' : 'Start building →'}</button>
      </div>
      <div class="gf-tour-dots">${TOUR_STEPS.map((_, i) => `<span class="gf-tour-dot${i === idx ? ' active' : ''}"></span>`).join('')}</div>
    `;
    document.body.appendChild(tourBubble);

    const bw = tourBubble.offsetWidth;
    const bh = tourBubble.offsetHeight;
    const gap = 16;
    const margin = 12;
    let left, top, arrowSide;

    // Prefer placing the bubble to the right of the target; fall back to left.
    if (window.innerWidth - rect.right >= bw + gap) {
      left = rect.right + gap;
      arrowSide = 'left';
    } else if (rect.left >= bw + gap) {
      left = rect.left - bw - gap;
      arrowSide = 'right';
    } else {
      // Not enough room on either side — center over the target's right edge.
      left = Math.min(rect.right + gap, window.innerWidth - bw - margin);
      arrowSide = 'left';
    }
    top = rect.top + rect.height / 2 - bh / 2;
    top = Math.max(margin, Math.min(top, window.innerHeight - bh - margin));
    left = Math.max(margin, Math.min(left, window.innerWidth - bw - margin));

    tourBubble.style.top = `${top}px`;
    tourBubble.style.left = `${left}px`;
    tourBubble.classList.toggle('arrow-right', arrowSide === 'right');
    // Point the arrow at the vertical center of the target.
    const arrowY = rect.top + rect.height / 2 - top;
    tourBubble.style.setProperty('--gf-arrow-y', `${Math.max(18, Math.min(arrowY, bh - 18))}px`);

    tourBubble.querySelector('.gf-tour-next').addEventListener('click', () => showTourStep(idx + 1));
    tourBubble.querySelector('.gf-tour-exit').addEventListener('click', clearTour);
  }

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
  if (headlineInput) {
    headlineInput.addEventListener('input', () => {
      flow.headline = headlineInput.value;
      const subtitle = document.getElementById('phone-brand-sub');
      if (subtitle) subtitle.textContent = flow.headline || 'Storefront headline';
    });
  }

  document.querySelectorAll('#gf-biz-type-row [data-biztype]').forEach((chip) => {
    chip.addEventListener('click', () => {
      flow.bizType = chip.dataset.biztype;
      document.querySelectorAll('#gf-biz-type-row [data-biztype]').forEach((c) => c.classList.toggle('selected', c === chip));
    });
  });

  document.getElementById('gf-country')?.addEventListener('change', (e) => {
    flow.country = e.target.value;
  });

  document.querySelectorAll('#gf-cat-row [data-cat]').forEach((chip) => {
    chip.addEventListener('click', () => {
      flow.category = chip.dataset.cat;
      document.querySelectorAll('#gf-cat-row [data-cat]').forEach((c) => c.classList.toggle('selected', c === chip));
      const catBadge = document.querySelector('.app-page[data-page="home"] .category-badge');
      if (catBadge) catBadge.textContent = chip.dataset.cat;
    });
  });

  /* -------------------------------------------------------- branding step */

  function applyAccent(hex) {
    flow.accent = hex;
    document.body.style.setProperty('--p-accent', hex);
    const input = document.querySelector('[data-bind-color="--p-accent"]');
    if (input) {
      input.value = hex;
      const row = input.closest('.cp-color-row');
      const hexField = row?.querySelector('.cp-color-hex');
      const swatch = row?.querySelector('.cp-color-swatch');
      if (hexField) hexField.value = hex.toUpperCase();
      if (swatch) swatch.style.background = hex;
    }
  }
  document.querySelectorAll('#gf-accent-row [data-accent]').forEach((sw) => {
    sw.addEventListener('click', () => {
      applyAccent(sw.dataset.accent);
      document.querySelectorAll('#gf-accent-row [data-accent]').forEach((s) => s.classList.toggle('selected', s === sw));
    });
  });
  document.getElementById('gf-accent-custom')?.addEventListener('input', (e) => applyAccent(e.target.value));

  const logoZone = document.getElementById('gf-logo-zone');
  const logoFile = document.getElementById('gf-logo-file');
  if (logoZone && logoFile) {
    logoZone.addEventListener('click', () => logoFile.click());
    logoFile.addEventListener('change', () => {
      const file = logoFile.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        [document.getElementById('phone-brand-mark'), document.getElementById('brand-logo')].forEach((el) => {
          if (!el) return;
          el.classList.add('has-logo');
          el.style.backgroundImage = `url(${e.target.result})`;
          el.style.backgroundSize = 'cover';
          el.style.backgroundPosition = 'center';
          el.textContent = '';
        });
        showToast?.('Logo applied');
      };
      reader.readAsDataURL(file);
    });
  }
  document.querySelectorAll('#gf-font-row [data-font]').forEach((chip) => {
    chip.addEventListener('click', () => {
      flow.font = chip.dataset.font;
      document.querySelectorAll('#gf-font-row [data-font]').forEach((c) => c.classList.toggle('selected', c === chip));
    });
  });


  /* ------------------------------------------- app focus card (Home step) */
  /* --------------------------------------------------------- app focus step */

  function setFocus(goal) {
    flow.focus = goal;
    window.applyGoalPreset?.(goal);
    const val = document.getElementById('cp-focus-val');
    const ic = document.getElementById('cp-focus-ic');
    if (val) val.textContent = FOCUS_LABELS[goal] || 'Not chosen yet';
    if (ic) ic.innerHTML = FOCUS_ICONS[goal] || '';
    document.querySelectorAll('#gf-focus-options [data-focus]').forEach((b) => {
      b.classList.toggle('selected', b.dataset.focus === goal);
    });
    document.querySelectorAll('#cp-focus-menu [data-focus]').forEach((b) => {
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

  // Home step recap: "Change" opens an inline dropdown to switch focus without
  // leaving the Home step.
  const focusChange = document.getElementById('cp-focus-change');
  const focusMenu = document.getElementById('cp-focus-menu');
  if (focusChange && focusMenu) {
    focusChange.addEventListener('click', (e) => {
      e.stopPropagation();
      focusMenu.classList.toggle('open');
    });
    document.addEventListener('click', () => focusMenu.classList.remove('open'));
    focusMenu.querySelectorAll('[data-focus]').forEach((b) => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        focusMenu.classList.remove('open');
        setFocus(b.dataset.focus);
        showToast?.(`App focus set to ${FOCUS_LABELS[b.dataset.focus]}`);
      });
    });
  }

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
