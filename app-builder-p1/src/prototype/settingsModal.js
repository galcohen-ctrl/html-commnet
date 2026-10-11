/**
 * Settings modal — opened from the sidebar gear via the account popover.
 *
 * Owns the generic modal shell (rail navigation, search, header/footer wiring).
 * The Online ordering wizard was removed in Phase 1.
 */

export function initSettingsModal(ctx) {
  const { showToast, markDirty } = ctx;

  const overlay = document.getElementById('settings-modal');
  if (!overlay) return {};

  const rail = document.getElementById('sm-rail');
  const searchInput = document.getElementById('sm-search-input');
  const titleEl = document.getElementById('sm-title');
  const subEl = document.getElementById('sm-sub');
  const backBtn = document.getElementById('sm-back');
  const primaryBtn = document.getElementById('sm-primary');
  const navs = [...overlay.querySelectorAll('.sm-nav')];
  const panes = [...overlay.querySelectorAll('.sm-pane')];

  const ordering = { connected: false };

  /* ---------------------------------------------------------------- header */

  function activeStepEl() {
    const pane = panes.find(p => p.classList.contains('active'));
    if (!pane) return null;
    return pane.querySelector('.sm-oo-step.active, .sm-submission-step.active') || pane;
  }

  function syncHeader() {
    const el = activeStepEl();
    if (!el) return;
    titleEl.innerHTML = el.dataset.smTitle || '';
    subEl.innerHTML = el.dataset.smSub || '';
    primaryBtn.innerHTML = el.dataset.smPrimary || 'Save changes';
    const busy = el.dataset.smPrimaryBusy === 'true';
    primaryBtn.classList.toggle('busy', busy);
    primaryBtn.disabled = busy;
    backBtn.classList.toggle('show', !!el.dataset.smBack);
    backBtn.dataset.target = el.dataset.smBack || '';
  }

  /* ------------------------------------------------------------ navigation */

  function showPane(key) {
    panes.forEach(p => p.classList.toggle('active', p.dataset.smPane === key));
    navs.forEach(n => n.classList.toggle('active', n.dataset.smNav === key));
    document.getElementById('sm-body').scrollTop = 0;
    if (key === 'app-submission') renderSubmissionState();
    syncHeader();
  }

  navs.forEach(n => n.addEventListener('click', () => showPane(n.dataset.smNav)));

  overlay.querySelectorAll('[data-sm-goto]').forEach(btn => {
    btn.addEventListener('click', () => showPane(btn.dataset.smGoto));
  });

  /* ---------------------------------------------------------------- search */

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    navs.forEach(n => {
      const label = n.textContent.trim().toLowerCase();
      n.classList.toggle('no-match', !!q && !label.includes(q));
    });
    rail.querySelectorAll('.sm-group').forEach(g => {
      const any = [...g.querySelectorAll('.sm-nav')].some(n => !n.classList.contains('no-match'));
      g.classList.toggle('no-match', !any);
    });
    const anyVisible = navs.some(n => !n.classList.contains('no-match'));
    rail.classList.toggle('searching-empty', !anyVisible);
  });

  /* ----------------------------------------------------------- open/close */

  function open(pane, step) {
    overlay.classList.add('open');
    showPane(pane || 'general');
    if (pane === 'app-submission') goSubmissionStep(step || 'overview');
    else if (step) gotoStep(step);
    closeAccountMenu();
  }
  function close() {
    overlay.classList.remove('open');
  }
  overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });
  document.getElementById('sm-close').addEventListener('click', close);
  document.getElementById('sm-cancel').addEventListener('click', close);
  overlay.querySelector('.sm-help')?.addEventListener('click', () => {
    window.open('https://www.como.com/help', '_blank', 'noopener,noreferrer');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) { close(); return; }
    if ((e.metaKey || e.ctrlKey) && e.key === ',') {
      e.preventDefault();
      overlay.classList.contains('open') ? close() : open('general');
    }
  });

  /* -------------------------------------------- sidebar gear + account menu */

  const gearBtn = document.getElementById('side-settings-btn');
  const accountMenu = document.getElementById('account-menu');

  function closeAccountMenu() {
    if (!accountMenu) return;
    accountMenu.classList.remove('open');
    gearBtn.classList.remove('popover-open');
  }
  if (gearBtn && accountMenu) {
    gearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = !accountMenu.classList.contains('open');
      accountMenu.classList.toggle('open', willOpen);
      gearBtn.classList.toggle('popover-open', willOpen);
    });
    document.addEventListener('click', (e) => {
      if (!accountMenu.contains(e.target)) closeAccountMenu();
    });
    accountMenu.querySelectorAll('.am-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = item.dataset.am;
        const paneFor = { settings: 'general' };
        if (paneFor[key]) { open(paneFor[key]); return; }
        closeAccountMenu();
        const messages = {
          language: 'Language picker — not part of the P1 prototype',
          help: 'Help Center would open in a new tab',
          logout: 'Sign-out is out of scope for this prototype',
        };
        if (messages[key]) showToast(messages[key]);
      });
    });
  }

  /* ------------------------------------------------ App submission guide */

  const submissionPane = overlay.querySelector('[data-sm-pane="app-submission"]');
  const submissionSteps = submissionPane ? [...submissionPane.querySelectorAll('.sm-submission-step')] : [];
  const submissionNav = submissionPane ? [...submissionPane.querySelectorAll('[data-submission-nav]')] : [];
  const submissionState = {
    step: 'overview',
    accounts: { apple: true, google: false },
    listing: false,
    listingAssets: { icon: false, screens: false },
    privacy: false,
    testing: false,
    prepared: { apple: false, google: false },
  };
  const SUBMISSION_ORDER = ['overview', 'accounts', 'listing', 'privacy', 'testing', 'submit', 'history'];

  function submissionReady() {
    return submissionState.accounts.apple
      && submissionState.accounts.google
      && submissionState.listing
      && submissionState.privacy
      && submissionState.testing;
  }

  function storeRemaining(store) {
    return [
      submissionState.accounts[store],
      submissionState.listing,
      submissionState.privacy,
      submissionState.testing,
    ].filter(value => !value).length;
  }

  function stageReady(key) {
    if (key === 'accounts') return submissionState.accounts.apple && submissionState.accounts.google;
    if (key === 'listing' || key === 'privacy' || key === 'testing') return submissionState[key];
    if (key === 'submit') return submissionState.prepared.apple || submissionState.prepared.google;
    return false;
  }

  function renderSubmissionState() {
    if (!submissionPane) return;
    const completedGates = [
      submissionState.accounts.apple,
      submissionState.accounts.google,
      submissionState.listing,
      submissionState.privacy,
      submissionState.testing,
    ].filter(Boolean).length;
    const percent = completedGates * 20;
    const progress = submissionPane.querySelector('[data-submission-progress]');
    if (progress) {
      progress.style.setProperty('--progress', `${percent * 3.6}deg`);
      progress.setAttribute('aria-label', `${completedGates} of 5 setup gates ready`);
      progress.querySelector('strong').textContent = `${percent}%`;
    }

    ['apple', 'google'].forEach(store => {
      const remaining = storeRemaining(store);
      const status = submissionPane.querySelector(`[data-store-status="${store}"]`);
      if (status) {
        status.textContent = submissionState.prepared[store]
          ? 'Ready for review'
          : remaining ? `${remaining} to do` : 'Ready';
        status.className = `sm-status ${remaining ? 'warn' : 'ok'}`;
      }
      const card = submissionPane.querySelector(`[data-store-card="${store}"]`);
      if (card) {
        card.querySelectorAll('[data-gate-row]').forEach(row => {
          const gate = row.dataset.gateRow;
          const ready = gate === 'accounts' ? submissionState.accounts[store] : submissionState[gate];
          row.classList.toggle('done', !!ready);
          row.querySelector('span').textContent = ready ? '✓' : String(['accounts', 'listing', 'privacy', 'testing'].indexOf(gate) + 1);
        });
      }
    });

    submissionNav.forEach(item => {
      const key = item.dataset.submissionNav;
      item.classList.toggle('active', key === submissionState.step);
      item.classList.toggle('done', stageReady(key));
      if (key === submissionState.step) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    });

    const railStatus = overlay.querySelector('[data-submission-rail-status]');
    const remainingStages = ['accounts', 'listing', 'privacy', 'testing'].filter(key => !stageReady(key)).length;
    if (railStatus) {
      railStatus.textContent = submissionReady() ? 'Ready' : `${remainingStages} to do`;
      railStatus.classList.toggle('ready', submissionReady());
    }

    const submitStep = submissionPane.querySelector('[data-submission-step="submit"]');
    if (submitStep) {
      const ready = submissionReady();
      submitStep.dataset.smPrimaryBusy = ready ? 'false' : 'true';
      submitStep.dataset.smPrimary = ready ? 'Prepare submission summary' : 'Complete setup first';
      const note = submitStep.querySelector('[data-ready-note]');
      if (note) {
        note.classList.toggle('ok', ready);
        note.classList.toggle('info', !ready);
        note.querySelector('div').innerHTML = ready
          ? '<b>All setup gates are ready.</b> Review the stores and release choices below before asking Como to prepare the submission.'
          : '<b>Setup is not ready yet.</b> Complete developer access, listing, privacy, and native testing before preparing a request.';
      }
    }
  }

  function goSubmissionStep(next) {
    if (!submissionPane || !SUBMISSION_ORDER.includes(next)) return;
    submissionState.step = next;
    submissionSteps.forEach(item => item.classList.toggle('active', item.dataset.submissionStep === next));
    renderSubmissionState();
    syncHeader();
    document.getElementById('sm-body').scrollTop = 0;
    requestAnimationFrame(() => {
      const active = submissionPane.querySelector('.sm-submission-step.active');
      const focusTarget = active?.querySelector('input, textarea, select, button, a');
      if (focusTarget) focusTarget.focus({ preventScroll: true });
    });
  }

  function validateListing() {
    const fields = ['sm-listing-name', 'sm-listing-subtitle', 'sm-listing-description', 'sm-listing-keywords'];
    let firstInvalid = null;
    fields.forEach(id => {
      const input = document.getElementById(id);
      const valid = !!input.value.trim();
      input.setAttribute('aria-invalid', String(!valid));
      if (!valid && !firstInvalid) firstInvalid = input;
    });
    const valid = !firstInvalid && submissionState.listingAssets.icon && submissionState.listingAssets.screens;
    const error = submissionPane.querySelector('[data-listing-error]');
    error.hidden = valid;
    if (!valid) (firstInvalid || submissionPane.querySelector('[data-listing-asset]:not(.added)'))?.focus();
    submissionState.listing = valid;
    return valid;
  }

  function validatePrivacy() {
    const url = document.getElementById('sm-privacy-url');
    const checks = [...submissionPane.querySelectorAll('[data-privacy-check]')];
    let validUrl = false;
    try { validUrl = /^https?:$/.test(new URL(url.value).protocol); } catch { validUrl = false; }
    const valid = validUrl && checks.every(check => check.checked);
    url.setAttribute('aria-invalid', String(!validUrl));
    submissionPane.querySelector('[data-privacy-error]').hidden = valid;
    if (!valid) (validUrl ? checks.find(check => !check.checked) : url)?.focus();
    submissionState.privacy = valid;
    return valid;
  }

  function validateTesting() {
    const checks = [...submissionPane.querySelectorAll('[data-test-check]')];
    const valid = checks.every(check => check.checked);
    submissionPane.querySelector('[data-testing-error]').hidden = valid;
    if (!valid) checks.find(check => !check.checked)?.focus();
    submissionState.testing = valid;
    return valid;
  }

  if (submissionPane) {
    submissionNav.forEach(item => item.addEventListener('click', () => goSubmissionStep(item.dataset.submissionNav)));
    submissionPane.querySelectorAll('[data-submission-goto]').forEach(item => {
      item.addEventListener('click', () => goSubmissionStep(item.dataset.submissionGoto));
    });
    submissionPane.querySelector('[data-submission-review]').addEventListener('click', () => {
      showToast('Review request drafted · a CSM would follow up before anything is submitted');
    });
    submissionPane.querySelector('[data-connect-account="google"]').addEventListener('click', (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      button.textContent = 'Checking access…';
      setTimeout(() => {
        submissionState.accounts.google = true;
        button.hidden = true;
        submissionPane.querySelector('[data-account-status="google"]').hidden = false;
        submissionPane.querySelector('[data-account-card="google"]').classList.add('ready');
        renderSubmissionState();
        syncHeader();
        markDirty('submission');
        showToast('Google delegated access marked ready for this prototype');
      }, 450);
    });
    submissionPane.querySelectorAll('[data-listing-asset]').forEach(button => {
      button.addEventListener('click', () => {
        const key = button.dataset.listingAsset;
        submissionState.listingAssets[key] = true;
        button.classList.add('added');
        button.querySelector(`[data-asset-state="${key}"]`).textContent = 'Ready';
        button.setAttribute('aria-pressed', 'true');
        markDirty('submission');
      });
    });
    submissionPane.querySelectorAll('#sm-listing-name, #sm-listing-subtitle').forEach(input => {
      const counter = submissionPane.querySelector(`[data-count-for="${input.id}"]`);
      const update = () => { counter.textContent = String(input.value.length); };
      input.addEventListener('input', update);
      update();
    });
    submissionPane.querySelectorAll('input, textarea, select').forEach(input => {
      input.addEventListener('input', () => markDirty('submission'));
      input.addEventListener('change', () => markDirty('submission'));
    });
    submissionPane.querySelector('[data-open-test-links]').addEventListener('click', () => {
      showToast('Native test links would open for iOS and Android');
    });
    submissionPane.querySelector('[data-cancel-submission]').addEventListener('click', () => {
      submissionPane.querySelector('[data-submission-confirmation]').hidden = true;
      primaryBtn.focus();
    });
    submissionPane.querySelector('[data-confirm-submission]').addEventListener('click', () => {
      const selected = [...submissionPane.querySelectorAll('[data-submit-store]:checked')].map(input => input.dataset.submitStore);
      if (!selected.length) {
        showToast('Choose at least one store to prepare');
        return;
      }
      const history = submissionPane.querySelector('[data-submission-history]');
      selected.forEach(store => {
        submissionState.prepared[store] = true;
        const label = store === 'apple' ? 'Apple iOS 3.5.0 (221)' : 'Google Android 3.5.0 (221)';
        const mark = store === 'apple' ? 'A' : 'G';
        history.insertAdjacentHTML('afterbegin', `<div class="sm-rows-row"><span class="sm-store-mark ${store}" aria-hidden="true">${mark}</span><div class="sm-rows-text"><div class="sm-rows-name">${label}</div><div class="sm-rows-sub">Prepared just now · waiting for merchant and Como review</div></div><span class="sm-status warn">Ready for review</span></div>`);
      });
      submissionPane.querySelector('[data-submission-confirmation]').hidden = true;
      markDirty('submission');
      renderSubmissionState();
      goSubmissionStep('history');
      showToast(`${selected.length === 2 ? 'Apple and Google requests' : 'Store request'} prepared · nothing was submitted externally`);
    });
    renderSubmissionState();
  }

  /* -------------------------------------------------------------- startup */

  syncHeader();

  const api = {
    ordering,
    openSettings: open,
    closeSettings: close,
    isOrderingConnected: () => false,
    exportOrderingState: () => ({}),
    importOrderingState: () => {},
  };
  window.openSettings = open;
  window.isOrderingConnected = () => false;
  return api;
}
