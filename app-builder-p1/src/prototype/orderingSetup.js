/**
 * Step 2 — "How do customers order from your app?"
 *
 * Replaces the old App Focus step (Lead with loyalty / Lead with ordering).
 *
 * Why: App Focus asked an editorial question ("what leads the home screen?")
 * whose answer the merchant could not act on yet. Choosing "Lead with ordering"
 * before a provider was connected produced a home screen full of locked widgets,
 * so the step promised a layout it could not deliver. Asking the capability
 * question first — how do orders actually happen? — makes the layout a
 * consequence rather than a wish, and the provider is connected during setup so
 * the ordering widgets are already unlocked by the time the merchant reaches Home.
 *
 * Three modes:
 *   native  — provider connected in-app. Ordering widgets unlock, home leads with ordering.
 *   webview — merchant's ordering site embedded. Como can't read the basket, so the
 *             ordering widgets stay locked and the home stays loyalty-led.
 *   skip    — loyalty-led app now, ordering added later from Settings.
 *
 * Every option previews on the phone while hovered and commits on click, so the
 * merchant decides against the actual result instead of against prose.
 */

const MODE_FOCUS = { native: 'ordering', webview: 'loyalty', skip: 'loyalty' };

const OUTCOMES = {
  native: {
    title: 'Ordering leads your home screen',
    sub: 'Order Again, Top Items and Menu Categories sit above loyalty. Points still apply at checkout.',
    action: null,
  },
  webview: {
    title: 'Loyalty leads your home screen',
    sub: 'Your ordering site opens in the Menu tab. Switch to the native integration any time to unlock the ordering widgets.',
    action: null,
  },
  skip: {
    title: 'Loyalty leads your home screen',
    sub: 'No Menu tab yet. Add ordering later from Settings and the widgets appear here.',
    action: null,
  },
};

const ICONS = {
  native: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
  webview: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/></svg>',
  skip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/></svg>',
};

// Industries where ordering is the obvious lead. Drives the "Recommended" badge
// so Step 1's answers actually change Step 2 instead of being collected and dropped.
const ORDERING_INDUSTRIES = ['Food & Drink', 'Groceries & Market'];

export function initOrderingSetup(ctx = {}) {
  const root = document.getElementById('oo-choice');
  if (!root) return {};

  const options = [...root.querySelectorAll('[data-oo-mode]')];
  const outcome = document.getElementById('oo-outcome');
  const errorEl = document.getElementById('oo-choice-error');

  let mode = null;
  // Web view is "configured" once its menu URL is connected on the Menu screen.
  let webviewConfigured = false;
  // Snapshot of the real layout, taken before a hover preview mutates it.
  let hoverSnapshot = null;

  function applyMode(target, { preview = false } = {}) {
    const focus = MODE_FOCUS[target] || 'loyalty';
    if (target === 'webview') window.ensureWebviewPromoInstance?.({ dirty: !preview });
    document.body.classList.toggle('oo-mode-native', target === 'native');
    document.body.classList.toggle('oo-mode-webview', target === 'webview');
    document.body.classList.toggle('oo-mode-skip', target === 'skip');
    // Native is the only mode where Como owns the basket, so it is the only mode
    // that may unlock the ordering widgets. On hover we preview the unlocked home
    // so the merchant sees what they would get; once committed, the widgets stay
    // locked until a provider is actually connected in the settings wizard.
    const showUnlocked = target === 'native' && (preview || !!window.isOrderingConnected?.());
    document.body.classList.toggle('oo-connected', showUnlocked);
    window.applyGoalPreset?.(focus, { emit: !preview, source: preview ? 'oo-preview' : 'oo-setup' });
    if (target === 'webview') {
      const toggle = document.querySelector('[data-widget-toggle="promo-webview"]');
      if (toggle && !toggle.classList.contains('on')) {
        document.body.classList.add('gf-applying-preset');
        toggle.click();
        document.body.classList.remove('gf-applying-preset');
      }
      window.positionWebviewPromo?.();
    }
    window.setMenuSlotMode?.(target === 'skip' ? 'hidden' : target === 'webview' ? 'webview' : 'menu');
    renumberSteps();
  }

  /**
   * "Not yet" hides the Menu step, which would otherwise leave the sidebar
   * reading 4, 5, 6, 8. The numbering is a promise that it counts the work in
   * front of you, so it has to close the gap.
   */
  function renumberSteps() {
    let n = 0;
    document.querySelectorAll('.side-step[data-step]').forEach((btn) => {
      if (btn.classList.contains('slot-hidden') || btn.offsetParent === null) return;
      n += 1;
      const numEl = btn.querySelector('.step-dot .n');
      if (numEl) numEl.textContent = String(n);
    });
  }

  function renderOutcome() {
    if (!outcome) return;
    if (!mode) { outcome.hidden = true; return; }
    const def = OUTCOMES[mode];
    outcome.hidden = false;
    outcome.dataset.ooMode = mode;
    outcome.querySelector('[data-oo-outcome-ic]').innerHTML = ICONS[mode] || '';
    outcome.querySelector('[data-oo-outcome-title]').textContent = def.title;
    outcome.querySelector('[data-oo-outcome-sub]').textContent = def.sub;
  }

  function isConfigured(target) {
    if (target === 'native') return !!window.isOrderingConnected?.();
    if (target === 'webview') return webviewConfigured;
    if (target === 'skip') return true;
    return false;
  }

  function reflect() {
    options.forEach((opt) => {
      const target = opt.dataset.ooMode;
      const selected = target === mode;
      opt.classList.toggle('selected', selected);
      opt.setAttribute('aria-checked', selected ? 'true' : 'false');
      // A green chip appears on native / web view once its provider or menu is wired up.
      const configured = (target === 'native' || target === 'webview') && isConfigured(target);
      opt.classList.toggle('configured', configured);
      const status = opt.querySelector('[data-oo-status]');
      if (status) status.hidden = !configured;
    });
    root.classList.toggle('has-selection', Boolean(mode));
    if (errorEl && mode) errorEl.textContent = '';
    renderOutcome();
  }

  function commit(target, { launchConfig = true } = {}) {
    // A committed choice ends any in-flight preview, so the snapshot is stale.
    hoverSnapshot = null;
    mode = target;
    applyMode(target);
    reflect();
    // A committed mode fills the phone preview, so we leave the header-only state.
    document.body.classList.remove('phone-header-only');
    document.dispatchEvent(new CustomEvent('como:ordering-mode', { detail: { mode: target, focus: MODE_FOCUS[target] } }));
    ctx.markDirty?.();
    if (!launchConfig) return;
    // Each capability is configured somewhere concrete: native connects a provider
    // in the settings wizard, web view points at a menu URL on the Menu screen.
    // Route the merchant straight there so the choice always has a next action.
    if (target === 'native' && !window.isOrderingConnected?.()) {
      window.orderingWizardOrigin = 'oo-step';
      ctx.openSettings?.('online-ordering', 'chooser');
    } else if (target === 'webview' && !webviewConfigured) {
      ctx.openWebviewSetup?.({ fromOrdering: true });
    }
  }

  // A member can only have one ordering method live, so leaving a CONNECTED one
  // needs an explicit, clearly-worded confirmation before we tear it down.
  const OO_LABELS = { native: 'In-app ordering', webview: 'a linked ordering website', skip: '“Not yet”' };
  const providerName = () => (document.querySelector('[data-admin-provider]')?.textContent || 'Deliverect').trim();

  function switchGuardFor(target) {
    if (mode === 'native' && !!window.isOrderingConnected?.() && target !== 'native') {
      const p = providerName();
      return {
        title: 'Disconnect ' + p + '?',
        body: 'You can only run one ordering method at a time. Switching to ' + OO_LABELS[target] + ' disconnects ' + p + ', removes its “Connected” badge, and turns off the in-app ordering widgets (Order Again, Top Items, Menu).',
        confirmText: 'Disconnect ' + p,
        onConfirm: () => document.getElementById('sm-oo-disconnect')?.click(),
      };
    }
    if (mode === 'webview' && webviewConfigured && target !== 'webview') {
      return {
        title: 'Remove your linked website?',
        body: 'You can only run one ordering method at a time. Switching to ' + OO_LABELS[target] + ' removes your linked ordering website and its “Connected” badge.',
        confirmText: 'Remove linked website',
        onConfirm: () => {
          webviewConfigured = false;
          document.dispatchEvent(new CustomEvent('como:menu-source', { detail: { approach: 'webview', connected: false } }));
        },
      };
    }
    return null;
  }

  function confirmSwitch({ title, body, confirmText, cancelText = 'Cancel' }) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'gf-confirm-overlay';
      overlay.innerHTML =
        '<div class="gf-confirm" role="dialog" aria-modal="true" aria-labelledby="gf-confirm-title">'
        + '<h3 class="gf-confirm-title" id="gf-confirm-title"></h3>'
        + '<p class="gf-confirm-body"></p>'
        + '<div class="gf-confirm-btns"><button type="button" class="gf-confirm-cancel"></button><button type="button" class="gf-confirm-ok"></button></div>'
        + '</div>';
      overlay.querySelector('.gf-confirm-title').textContent = title;
      overlay.querySelector('.gf-confirm-body').textContent = body;
      const okBtn = overlay.querySelector('.gf-confirm-ok');
      const cancelBtn = overlay.querySelector('.gf-confirm-cancel');
      okBtn.textContent = confirmText;
      cancelBtn.textContent = cancelText;
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('is-open'));
      const onKey = (ev) => { if (ev.key === 'Escape') finish(false); };
      const finish = (val) => { overlay.classList.remove('is-open'); document.removeEventListener('keydown', onKey); setTimeout(() => overlay.remove(), 170); resolve(val); };
      okBtn.addEventListener('click', () => finish(true));
      cancelBtn.addEventListener('click', () => finish(false));
      overlay.addEventListener('click', (ev) => { if (ev.target === overlay) finish(false); });
      document.addEventListener('keydown', onKey);
      requestAnimationFrame(() => okBtn.focus());
    });
  }

  options.forEach((opt) => {
    const target = opt.dataset.ooMode;

    opt.addEventListener('mouseenter', () => {
      if (mode === target) return;
      // Remember the committed state once, so leaving any option restores it.
      if (!hoverSnapshot) hoverSnapshot = mode;
      applyMode(target, { preview: true });
      root.classList.add('previewing');
      // Hovering an option previews its layout, so reveal the full phone.
      document.body.classList.remove('phone-header-only');
    });

    opt.addEventListener('mouseleave', () => {
      root.classList.remove('previewing');
      if (mode) applyMode(mode, { preview: true });
      else {
        clearPreview();
        // Back to the blank header-only state when nothing is committed.
        document.body.classList.add('phone-header-only');
      }
      hoverSnapshot = null;
    });

    opt.addEventListener('focus', () => {
      if (mode === target) return;
      if (!hoverSnapshot) hoverSnapshot = mode;
      applyMode(target, { preview: true });
    });

    opt.addEventListener('click', (e) => {
      // The web-view URL field lives inside the option; typing must not re-commit.
      if (e.target.closest('[data-oo-field]')) return;
      if (target === mode) { commit(target); return; }
      const guard = switchGuardFor(target);
      if (!guard) { commit(target); return; }
      confirmSwitch(guard).then((ok) => {
        if (!ok) { applyMode(mode, { preview: true }); return; }
        guard.onConfirm?.();
        commit(target);
      });
    });
  });

  function clearPreview() {
    document.body.classList.remove('oo-mode-native', 'oo-mode-webview', 'oo-mode-skip', 'oo-connected');
    window.applyGoalPreset?.('blank', { emit: false, source: 'oo-clear' });
    window.setMenuSlotMode?.('menu');
  }

  // Step 1 feeds the recommendation instead of being collected and forgotten.
  function refreshRecommendation(flow = {}) {
    const cats = flow.categories?.length ? flow.categories : [flow.category].filter(Boolean);
    const recommend = cats.some((c) => ORDERING_INDUSTRIES.includes(c));
    root.querySelector('[data-oo-rec]')?.toggleAttribute('hidden', !recommend);
  }
  document.addEventListener('como:business-changed', (e) => refreshRecommendation(e.detail || {}));

  // Native connects through the settings wizard; reflect the real connection back
  // onto the step as a green "Connected" chip and an unlocked ordering home.
  document.addEventListener('como:ordering', (e) => {
    const connected = !!e.detail?.ordering?.connected;
    if (connected && window.orderingWizardOrigin === 'oo-step') {
      window.orderingWizardOrigin = null;
      if (mode !== 'native') commit('native', { launchConfig: false });
    }
    if (mode === 'native') applyMode('native');
    reflect();
  });

  // Web view is configured on the Menu screen; a connected menu URL completes it.
  document.addEventListener('como:menu-source', (e) => {
    const d = e.detail || {};
    if (d.approach !== 'webview') return;
    webviewConfigured = !!d.connected;
    reflect();
  });

  // Inline info tooltips on the ordering cards — hover to show, leave to hide.
  root.querySelectorAll('[data-oo-tip]').forEach((btn) => {
    const showTip = () => {
      if (btn.parentElement.querySelector('.oo-tip-bubble')) return;
      const bubble = document.createElement('div');
      bubble.className = 'oo-tip-bubble';
      bubble.textContent = btn.dataset.ooTip;
      btn.parentElement.style.position = 'relative';
      btn.parentElement.appendChild(bubble);
    };
    const hideTip = () => {
      btn.parentElement.querySelector('.oo-tip-bubble')?.remove();
    };
    btn.addEventListener('mouseenter', showTip);
    btn.addEventListener('mouseleave', hideTip);
    btn.addEventListener('focus', showTip);
    btn.addEventListener('blur', hideTip);
  });

  window.getOrderingMode = () => mode;

  return {
    getOrderingMode: () => mode,
    setOrderingMode: (m) => commit(m, { launchConfig: false }),
    isOrderingConnectedMode: () => mode === 'native',
    isOrderingStepComplete: () => {
      if (mode === 'skip') return true;
      if (mode === 'native') return !!window.isOrderingConnected?.();
      if (mode === 'webview') return webviewConfigured;
      return false;
    },
    refreshOrderingRecommendation: refreshRecommendation,
  };
}
