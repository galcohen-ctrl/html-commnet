export function initSetupWizard(ctx) {
  const { GOAL_DEFS, applyGoalPreset, setBrand } = ctx;

  // ============================================================
  // SETUP WIZARD — full-screen onboarding shown on load.
  // The live preview reuses the REAL phone: #device-frame is moved into the
  // wizard's preview slot during setup, then moved back into #preview-area on
  // finish, so every choice (goal → widgets, name, colour, logo) shows live.
  // ============================================================
  (function () {
    const wizardEl = document.getElementById('setup-wizard');
    if (!wizardEl) return;
    const stepsEl = document.getElementById('sw-steps');
    const progressEl = document.getElementById('sw-progress');
    const backBtn = document.getElementById('sw-back');
    const nextBtn = document.getElementById('sw-next');
    const skipBtn = document.getElementById('sw-skip');
    const phoneSlot = document.getElementById('sw-phone-slot');
    const deviceFrame = document.getElementById('device-frame');
    const previewArea = document.getElementById('preview-area');
    const STEP_COUNT = 3;

    const wiz = { step: 0, goal: null, bizName: '', category: '', accent: '#6d28d9', logo: null, font: 'sans-serif' };
    const CATEGORIES = ['Beauty and Spa', 'Entertainment', 'Food & Drink', 'Groceries & Market', 'Health & Fitness', 'Retail & Fashion', 'Services', 'Travel', 'Other'];
    const ACCENTS = ['#6d28d9', '#d4a648', '#d97706', '#0f766e', '#be123c', '#1d4ed8', '#2563eb'];
    const FONTS = ['Sans-serif', 'Serif', 'Mono', 'Rounded', 'Slab'];
    // Goal presets (icons, copy, and widget config) live in top-level GOAL_DEFS.
    const GOALS = GOAL_DEFS;

    function esc(s) { const d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
    function initials(name) {
      const t = (name || '').trim();
      if (!t) return '?';
      return t.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
    }

    function applyAccentLive() {
      document.body.style.setProperty('--p-accent', wiz.accent);
      const accentInput = document.querySelector('[data-bind-color="--p-accent"]');
      if (accentInput) {
        accentInput.value = wiz.accent;
        const row = accentInput.closest('.cp-color-row');
        const hex = row && row.querySelector('.cp-color-hex');
        const sw = row && row.querySelector('.cp-color-swatch');
        if (hex) hex.value = wiz.accent.toUpperCase();
        if (sw) sw.style.background = wiz.accent;
      }
    }
    function applyLogoLive() {
      const mk = initials(wiz.bizName);
      [document.getElementById('phone-brand-mark'), document.getElementById('brand-logo')].forEach(el => {
        if (!el) return;
        if (wiz.logo) {
          el.classList.add('has-logo');
          el.style.backgroundImage = 'url(' + wiz.logo + ')';
          el.style.backgroundSize = 'cover';
          el.style.backgroundPosition = 'center';
          el.textContent = '';
        } else {
          el.classList.remove('has-logo');
          el.style.backgroundImage = '';
          el.textContent = mk;
        }
      });
    }
    function applyBrandLive() {
      const name = wiz.bizName || 'Your Business';
      const sub = wiz.goal && GOALS[wiz.goal] ? GOALS[wiz.goal].sub : '';
      setBrand(name, initials(name), sub);
      const bizInput = document.querySelector('[data-bind-text=".app-page[data-page=\'home\'] .app-top-header .brand-text .name"]');
      if (bizInput) bizInput.value = name;
      applyAccentLive();
      applyLogoLive();
    }

    // ---- Step renderers (order: Business → Brand → Goal per design review) ----
    function stepBusiness() {
      const chips = CATEGORIES.map(c => '<button class="sw-chip' + (wiz.category === c ? ' selected' : '') + '" data-cat="' + esc(c) + '" type="button">' + esc(c) + '</button>').join('');
      return '<div class="sw-kicker">Step 1 of 3</div>'
        + '<h1 class="sw-title">Add your business details</h1>'
        + '<p class="sw-sub">Your business name and category appear on your app\u2019s home screen. You can update these later.</p>'
        + '<div class="sw-block"><label class="sw-label" for="sw-biz-name">Business name</label>'
        + '<input id="sw-biz-name" class="sw-input" type="text" placeholder="e.g. Velvet Bistro" value="' + esc(wiz.bizName) + '" autocomplete="off"></div>'
        + '<div class="sw-block"><label class="sw-label">Category</label><div class="sw-chip-row">' + chips + '</div></div>';
    }
    function stepBrand() {
      const swatches = ACCENTS.map(c => '<button class="sw-swatch' + (wiz.accent.toLowerCase() === c ? ' selected' : '') + '" style="background:' + c + '" data-accent="' + c + '" type="button" aria-label="Brand colour ' + c + '"></button>').join('');
      const logoInner = wiz.logo
        ? '<span class="sw-logo-prev"><img src="' + wiz.logo + '" alt="logo"></span><span class="sw-logo-text"><b>Looking good</b><span>PNG, JPG or SVG · drag &amp; drop works too</span></span><button class="sw-logo-remove" data-logo-remove type="button">Remove</button>'
        : '<span class="sw-logo-prev"><svg viewBox="0 0 24 24"><path d="M12 16V4M8 8l4-4 4 4"/><path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"/></svg></span><span class="sw-logo-text"><b>Upload your logo</b><span>PNG, JPG or SVG · drag &amp; drop works too</span></span>';
      const fontChips = FONTS.map(f => '<button class="sw-chip' + (wiz.font === f.toLowerCase().replace(/\s/g,'-') ? ' selected' : '') + '" data-font="' + f.toLowerCase().replace(/\s/g,'-') + '" type="button">' + esc(f) + '</button>').join('');
      return '<div class="sw-kicker">Step 2 of 3</div>'
        + '<h1 class="sw-title">Make it yours</h1>'
        + '<p class="sw-sub">Consistent branding helps customers recognize you and builds trust.</p>'
        + '<div class="sw-block"><label class="sw-label">Brand colour</label>'
        + '<p class="sw-helper">Colour is the first thing customers notice. We use it to create a consistent look across your storefront.</p>'
        + '<div class="sw-swatch-row">' + swatches
        + '<label class="sw-swatch-custom" title="Custom colour"><svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg><input type="color" value="' + wiz.accent + '" data-accent-custom></label>'
        + '</div></div>'
        + '<div class="sw-block"><label class="sw-label">Logo <span style="color:var(--muted);font-weight:400">(optional)</span></label>'
        + '<div class="sw-logo-drop" id="sw-logo-drop">' + logoInner + '</div>'
        + '<input type="file" id="sw-logo-file" accept="image/*" hidden></div>'
        + '<div class="sw-block"><label class="sw-label">Font family</label>'
        + '<p class="sw-helper">Typography sets the tone and makes your content easier to read.</p>'
        + '<div class="sw-chip-row">' + fontChips + '</div></div>';
    }
    function stepGoal() {
      const cards = ['loyalty', 'ordering'].map(key => {
        const g = GOALS[key];
        return '<button class="sw-goal-card' + (wiz.goal === key ? ' selected' : '') + '" data-goal="' + key + '" type="button">'
          + '<span class="sw-goal-ic">' + g.icon + '</span>'
          + '<span class="sw-goal-name">' + esc(g.name) + '</span>'
          + '<span class="sw-goal-desc">' + esc(g.desc) + '</span>'
          + '<span class="sw-goal-tags">' + g.tags.map(t => '<span class="sw-goal-tag">' + esc(t) + '</span>').join('') + '</span>'
          + '</button>';
      }).join('');
      return '<div class="sw-kicker">Step 3 of 3</div>'
        + '<h1 class="sw-title">Choose your app\u2019s main focus</h1>'
        + '<p class="sw-sub">Select the feature your customers will use most. You can add more features later.</p>'
        + '<div class="sw-goal-grid">' + cards + '</div>'
        + '<button class="sw-blank-link' + (wiz.goal === 'blank' ? ' selected' : '') + '" data-goal="blank" type="button"><span class="sw-blank-box"></span> Start from blank canvas</button>';
    }
    const STEPS = [stepBusiness, stepBrand, stepGoal];
    const STEP_KEYS = ['business', 'brand', 'goal'];

    function renderProgress() {
      progressEl.innerHTML = [0, 1, 2].map(i =>
        '<span class="p-dot ' + (i < wiz.step ? 'done' : i === wiz.step ? 'now' : '') + '"></span>').join('');
    }
    function render() {
      renderProgress();
      stepsEl.innerHTML = '<div class="sw-step" data-comment-anchor="setup-wizard-step-' + STEP_KEYS[wiz.step] + '">' + STEPS[wiz.step]() + '</div>';
      backBtn.style.visibility = wiz.step === 0 ? 'hidden' : 'visible';
      nextBtn.textContent = wiz.step === STEP_COUNT - 1 ? 'Set up your app' : 'Save and continue';
      nextBtn.disabled = (wiz.step === STEP_COUNT - 1 && !wiz.goal);
      bindStep();
    }

    function readLogo(f) {
      if (!f || !/^image\//.test(f.type)) return;
      const r = new FileReader();
      r.onload = e => { wiz.logo = e.target.result; applyLogoLive(); render(); };
      r.readAsDataURL(f);
    }
    function bindStep() {
      stepsEl.querySelectorAll('[data-goal]').forEach(el => {
        el.addEventListener('click', () => { wiz.goal = el.dataset.goal; applyGoalPreset(wiz.goal); applyBrandLive(); render(); });
      });
      const nameInput = document.getElementById('sw-biz-name');
      if (nameInput) nameInput.addEventListener('input', () => { wiz.bizName = nameInput.value; applyBrandLive(); });
      stepsEl.querySelectorAll('[data-cat]').forEach(el => {
        el.addEventListener('click', () => { wiz.category = el.dataset.cat; render(); });
      });
      stepsEl.querySelectorAll('[data-font]').forEach(el => {
        el.addEventListener('click', () => { wiz.font = el.dataset.font; render(); });
      });
      stepsEl.querySelectorAll('[data-accent]').forEach(el => {
        el.addEventListener('click', () => { wiz.accent = el.dataset.accent; applyAccentLive(); render(); });
      });
      const custom = stepsEl.querySelector('[data-accent-custom]');
      if (custom) {
        custom.addEventListener('input', () => { wiz.accent = custom.value; applyAccentLive(); });
        custom.addEventListener('change', () => { wiz.accent = custom.value; render(); });
      }
      const drop = document.getElementById('sw-logo-drop');
      const file = document.getElementById('sw-logo-file');
      const removeBtn = stepsEl.querySelector('[data-logo-remove]');
      if (drop && file) {
        drop.addEventListener('click', (e) => { if (!e.target.closest('[data-logo-remove]')) file.click(); });
        drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('dragover'); });
        drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
        drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('dragover'); readLogo(e.dataTransfer.files && e.dataTransfer.files[0]); });
        file.addEventListener('change', () => readLogo(file.files && file.files[0]));
      }
      if (removeBtn) removeBtn.addEventListener('click', (e) => { e.stopPropagation(); wiz.logo = null; applyLogoLive(); render(); });
    }

    function finishWizard() {
      if (deviceFrame && previewArea && deviceFrame.parentElement !== previewArea) previewArea.appendChild(deviceFrame);
      wizardEl.classList.add('sw-closing');
      setTimeout(() => { wizardEl.style.display = 'none'; }, 480);
    }

    nextBtn.addEventListener('click', () => {
      if (wiz.step < STEP_COUNT - 1) { wiz.step++; render(); }
      else finishWizard();
    });
    backBtn.addEventListener('click', () => { if (wiz.step > 0) { wiz.step--; render(); } });
    skipBtn.addEventListener('click', finishWizard);

    // Boot: move the real phone into the wizard preview, then render step 1
    if (deviceFrame && phoneSlot) {
      phoneSlot.appendChild(deviceFrame);
    }
    applyBrandLive();
    render();
  })();

}

