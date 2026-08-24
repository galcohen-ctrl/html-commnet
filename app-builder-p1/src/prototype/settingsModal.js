/**
 * Settings modal — opened from the sidebar gear via the account popover.
 *
 * Owns two things:
 *  - the generic modal shell (rail navigation, search, header/footer wiring)
 *  - the Online ordering connect wizard, whose state is shared with the Menu
 *    builder through `ctx.ordering` and the `como:ordering` DOM event.
 */

const PROVIDERS = [
  { id: 'deliverect', name: 'Deliverect', mark: 'D', color: '#0fa47f', desc: 'Headless commerce · POS & delivery sync', long: 'Deliverect — Headless Commerce', longDesc: 'Commerce API · menu, basket, checkout, POS sync', recommended: true },
  { id: 'olo', name: 'Olo', mark: 'O', color: '#12508f', desc: 'Enterprise ordering API', long: 'Olo — Enterprise Ordering', longDesc: 'Ordering API · menu, basket, checkout' },
  { id: 'ordering-co', name: 'Ordering.co', mark: 'Oc', color: '#7c3aed', desc: 'Fully headless ordering', long: 'Ordering.co — Headless', longDesc: 'Headless ordering API · menu & checkout' },
  { id: 'doordash', name: 'DoorDash', mark: 'DD', color: '#e8321a', desc: 'Marketplace & Drive delivery', long: 'DoorDash — Marketplace', longDesc: 'Marketplace menu feed + Drive delivery' },
  { id: 'uber-eats', name: 'Uber Eats', mark: 'UE', color: '#06c167', desc: 'Marketplace delivery', long: 'Uber Eats — Marketplace', longDesc: 'Marketplace menu feed + delivery' },
  { id: 'flipdish', name: 'Flipdish', mark: 'Fd', color: '#e8a33d', desc: 'Branded web & app ordering', long: 'Flipdish — Branded Ordering', longDesc: 'Branded ordering API · menu & checkout' },
];

const SYNC_ROWS = ['Menus & categories', 'Items, photos & prices', 'Modifier groups & allergens', 'Locations, hours & prep times'];

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

  /** Shared ordering state — the Menu builder reads this to decide what to render. */
  const ordering = {
    connected: false,
    provider: PROVIDERS[0],
    locations: { downtown: true, riverside: true, northpark: false },
    allergens: true,
    tracking: true,
    tipping: true,
  };

  function announceOrdering(reason) {
    document.dispatchEvent(new CustomEvent('como:ordering', { detail: { ordering, reason } }));
  }

  /* ---------------------------------------------------------------- header */

  function activeStepEl() {
    const pane = panes.find(p => p.classList.contains('active'));
    if (!pane) return null;
    return pane.querySelector('.sm-oo-step.active') || pane;
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
    if (step) gotoStep(step);
    closeAccountMenu();
  }
  function close() {
    overlay.classList.remove('open');
    comboEl.classList.remove('open');
  }
  overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });
  document.getElementById('sm-close').addEventListener('click', close);
  document.getElementById('sm-cancel').addEventListener('click', close);

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
        const paneFor = { settings: 'general', billing: 'billing', team: 'team' };
        if (paneFor[key]) { open(paneFor[key]); return; }
        closeAccountMenu();
        const messages = {
          language: 'Language picker — not part of the P1 prototype',
          help: 'Help Center would open in a new tab',
          'whats-new': '3 new releases · changelog would open here',
          logout: 'Sign-out is out of scope for this prototype',
        };
        if (messages[key]) showToast(messages[key]);
      });
    });
  }

  /* ------------------------------------------------- Online ordering wizard */

  const ooPane = document.getElementById('sm-oo-pane');
  const ooSteps = [...ooPane.querySelectorAll('.sm-oo-step')];
  const comboEl = document.getElementById('sm-provider-combo');
  const comboBtn = document.getElementById('sm-provider-btn');
  const comboList = document.getElementById('sm-provider-list');

  const STEP_LABELS = ['Connect', 'Approve locations', 'Settings'];

  function renderSteppers(current) {
    ooPane.querySelectorAll('[data-oo-stepper]').forEach(bar => {
      const active = Number(bar.dataset.ooStepper);
      bar.innerHTML = STEP_LABELS.map((label, i) => {
        const n = i + 1;
        const state = n < active ? 'done' : n === active ? 'active' : '';
        const inner = n < active
          ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>'
          : n;
        return `<span class="sm-step ${state}"><span class="n">${inner}</span>${label}</span>`
          + (n < STEP_LABELS.length ? '<span class="sm-step-sep">›</span>' : '');
      }).join('');
    });
    void current;
  }

  let step = 'chooser';
  function gotoStep(next) {
    step = next;
    ooSteps.forEach(s => s.classList.toggle('active', s.dataset.ooStep === next));
    renderSteppers();
    syncHeader();
    document.getElementById('sm-body').scrollTop = 0;
    if (next === 'syncing') runSync();
  }

  /* provider combo */
  function renderProviders() {
    comboList.innerHTML = PROVIDERS.map(p => `
      <div class="sm-provider${chosen && chosen.id === p.id ? ' sel' : ''}" data-provider="${p.id}">
        <span class="sm-logo" style="background:${p.color}">${p.mark}</span>
        <span class="sm-provider-text">
          <span class="sm-provider-name">${p.name}</span>
          <span class="sm-provider-desc">${p.desc}</span>
        </span>
        ${p.recommended ? '<span class="sm-pill">Recommended</span>' : ''}
        <svg class="tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
      </div>`).join('');
    comboList.querySelectorAll('.sm-provider').forEach(row => {
      row.addEventListener('click', () => {
        setProvider(PROVIDERS.find(p => p.id === row.dataset.provider));
        comboEl.classList.remove('open');
      });
    });
  }

  let chosen = null;
  function clearProvider() {
    chosen = null;
    comboBtn.querySelector('[data-provider-placeholder]').hidden = false;
    comboBtn.querySelector('[data-provider-logo]').hidden = true;
    comboBtn.querySelector('[data-provider-selected]').hidden = true;
    renderProviders();
  }

  function setProvider(p) {
    chosen = p;
    ordering.provider = p;
    comboBtn.querySelector('[data-provider-placeholder]').hidden = true;
    const logo = comboBtn.querySelector('[data-provider-logo]');
    logo.hidden = false;
    logo.textContent = p.mark;
    logo.style.background = p.color;
    logo.style.width = '30px';
    logo.style.height = '30px';
    logo.style.fontSize = '11.5px';
    const sel = comboBtn.querySelector('[data-provider-selected]');
    sel.hidden = false;
    sel.querySelector('.sel-name').textContent = p.name;
    sel.querySelector('.sel-desc').textContent = p.desc;

    ooPane.querySelector('[data-keys-logo]').textContent = p.mark;
    ooPane.querySelector('[data-keys-logo]').style.background = p.color;
    ooPane.querySelector('[data-keys-name]').textContent = p.long;
    ooPane.querySelector('[data-keys-desc]').textContent = p.longDesc;
    ooPane.querySelector('[data-sync-provider]').textContent = p.name;
    ooPane.querySelectorAll('[data-admin-provider]').forEach(el => { el.textContent = p.name; });
    renderProviders();
  }

  comboBtn.addEventListener('click', (e) => { e.stopPropagation(); comboEl.classList.toggle('open'); });
  document.addEventListener('click', (e) => { if (!comboEl.contains(e.target)) comboEl.classList.remove('open'); });
  renderProviders();

  document.getElementById('sm-provider-change').addEventListener('click', () => gotoStep('chooser'));

  /* API key reveal */
  const keyInput = document.getElementById('sm-oo-key');
  document.getElementById('sm-oo-key-reveal').addEventListener('click', () => {
    keyInput.type = keyInput.type === 'password' ? 'text' : 'password';
  });

  /* sync animation */
  let syncTimers = [];
  function resetSync() {
    syncTimers.forEach(clearTimeout);
    syncTimers = [];
    ooPane.querySelectorAll('.sm-sync-row').forEach((row, i) => {
      row.className = 'sm-sync-row';
      row.querySelector('.name').textContent = SYNC_ROWS[i];
      row.querySelector('.state').textContent = 'Waiting';
    });
  }
  function runSync(onDone) {
    resetSync();
    const rows = [...ooPane.querySelectorAll('.sm-sync-row')];
    rows.forEach((row, i) => {
      syncTimers.push(setTimeout(() => {
        row.classList.add('busy');
        row.querySelector('.state').textContent = 'Syncing…';
      }, i * 700 + 120));
      syncTimers.push(setTimeout(() => {
        row.classList.remove('busy');
        row.classList.add('done');
        row.querySelector('.state').textContent = 'Done';
        if (i === rows.length - 1) {
          syncTimers.push(setTimeout(() => {
            if (onDone) onDone(); else gotoStep('locations');
          }, 450));
        }
      }, i * 700 + 700));
    });
  }

  /* locations */
  const locEls = [...ooPane.querySelectorAll('.sm-loc')];
  function refreshLocCount() {
    const on = locEls.filter(l => l.classList.contains('on')).length;
    document.getElementById('sm-loc-on').textContent = on;
    document.getElementById('sm-live-locs').textContent = on;
    locEls.forEach(l => { ordering.locations[l.dataset.loc] = l.classList.contains('on'); });
  }
  locEls.forEach(loc => {
    const tick = loc.querySelector('[data-loc-tick]');
    if (tick && !loc.classList.contains('closed')) {
      tick.addEventListener('click', () => {
        const on = !loc.classList.contains('on');
        loc.classList.toggle('on', on);
        tick.classList.toggle('on', on);
        if (!on) loc.classList.remove('expanded');
        refreshLocCount();
        markDirty();
      });
    }
    const hoursBtn = loc.querySelector('[data-loc-hours]');
    if (hoursBtn) {
      hoursBtn.addEventListener('click', () => {
        const expanded = loc.classList.toggle('expanded');
        hoursBtn.textContent = expanded ? 'Hide hours' : 'Edit hours';
      });
    }
    loc.querySelectorAll('.sm-chip').forEach(chip => {
      chip.addEventListener('click', () => { chip.classList.toggle('on'); markDirty(); });
    });
  });
  document.getElementById('sm-loc-select-all').addEventListener('click', () => {
    locEls.filter(l => !l.classList.contains('closed')).forEach(l => {
      l.classList.add('on');
      l.querySelector('[data-loc-tick]').classList.add('on');
    });
    refreshLocCount();
    markDirty();
  });

  /* admin */
  ooPane.querySelectorAll('[data-oo-bind]').forEach(t => {
    t.addEventListener('click', () => {
      ordering[t.dataset.ooBind] = t.classList.contains('on');
      announceOrdering('settings');
    });
  });

  const resyncBtn = document.getElementById('sm-resync');
  resyncBtn.addEventListener('click', () => {
    if (resyncBtn.classList.contains('busy')) return;
    resyncBtn.classList.add('busy');
    document.getElementById('sm-last-sync').textContent = 'syncing…';
    setTimeout(() => {
      resyncBtn.classList.remove('busy');
      document.getElementById('sm-last-sync').textContent = 'just now';
      showToast('Menu re-synced from ' + ordering.provider.name);
      announceOrdering('resync');
    }, 1500);
  });

  document.getElementById('sm-oo-disconnect').addEventListener('click', () => {
    ordering.connected = false;
    clearProvider();
    resetSync();
    gotoStep('chooser');
    announceOrdering('disconnect');
    showToast('Disconnected from ' + ordering.provider.name + ' — the Menu tab is empty again');
    markDirty();
  });

  /* ------------------------------------------------------- footer + back */

  backBtn.addEventListener('click', () => {
    const target = backBtn.dataset.target;
    if (target) gotoStep(target);
  });

  primaryBtn.addEventListener('click', () => {
    const pane = panes.find(p => p.classList.contains('active'));
    if (!pane) return;

    if (pane.dataset.smPane !== 'online-ordering') {
      showToast('Saved · ' + (pane.dataset.smTitle || 'Settings').replace(/&amp;/g, '&'));
      markDirty();
      close();
      return;
    }

    if (step === 'chooser') {
      if (!chosen) { showToast('Pick an ordering provider to continue'); return; }
      gotoStep('keys');
    } else if (step === 'keys') {
      const account = document.getElementById('sm-oo-account').value.trim();
      const key = keyInput.value.trim();
      if (!account || !key) { showToast('Add both an account ID and a production API key'); return; }
      gotoStep('syncing');
    } else if (step === 'locations') {
      refreshLocCount();
      if (!locEls.some(l => l.classList.contains('on'))) {
        showToast('Approve at least one location to keep going');
        return;
      }
      ordering.connected = true;
      announceOrdering('connected');
      gotoStep('admin');
      showToast(ordering.provider.name + ' connected · menu is live in the app');
    } else if (step === 'admin') {
      ordering.connected = true;
      announceOrdering('saved');
      markDirty();
      close();
      showToast('Online ordering settings saved');
    }
  });

  /* -------------------------------------------------------------- startup */

  renderSteppers();
  refreshLocCount();
  syncHeader();

  const api = {
    ordering,
    openSettings: open,
    closeSettings: close,
    gotoOrderingStep: (s) => { showPane('online-ordering'); gotoStep(s || 'chooser'); },
    isOrderingConnected: () => ordering.connected,
  };
  window.openSettings = open;
  window.isOrderingConnected = () => ordering.connected;
  return api;
}
