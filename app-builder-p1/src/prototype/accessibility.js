const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const UPLOAD_SELECTOR = [
  '.cp-upload-zone',
  '.pc-edit-image-zone',
  '.ms-drop',
].join(',');

const MODALS = [
  {
    overlay: '#preset-confirm-overlay',
    dialog: '.confirm-box',
    initial: '#preset-confirm-cancel',
    close: '#preset-confirm-cancel',
    label: '.confirm-title',
    fallbackRestore: '#save-btn',
  },
  {
    overlay: '#settings-modal',
    dialog: '.sm-modal',
    initial: '#sm-search-input',
    close: '#sm-close',
    label: '#sm-title',
    fallbackRestore: '#side-settings-btn',
  },
  {
    overlay: '#gf-welcome',
    dialog: '.gf-welcome',
    initial: '#gf-welcome-skip',
    close: '#gf-welcome-skip',
    label: 'h1',
  },
];

function normalizedText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function textWithoutControls(element) {
  if (!element) return '';
  const copy = element.cloneNode(true);
  copy.querySelectorAll('button, input, select, textarea, svg, .toggle, .chev').forEach((node) => node.remove());
  return normalizedText(copy.textContent);
}

function isRendered(element) {
  if (!(element instanceof HTMLElement) || !element.isConnected) return false;
  if (element.hidden || element.closest('[hidden]')) return false;
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
}

function ensureId(element, prefix, nextId) {
  if (!element.id) element.id = `${prefix}-${nextId()}`;
  return element.id;
}

function setBooleanAttribute(element, name, value) {
  element.setAttribute(name, value ? 'true' : 'false');
}

/**
 * Accessibility is progressively layered over the DOM-driven prototype so the
 * original click handlers remain the single source of truth for product state.
 */
export function initAccessibility(ctx = {}) {
  let sequence = 0;
  const nextId = () => ++sequence;
  const enhanced = {
    toggles: new WeakSet(),
    radios: new WeakSet(),
    radioGroups: new WeakSet(),
    heads: new WeakSet(),
    uploads: new WeakSet(),
    providers: new WeakSet(),
    dragHandles: new WeakSet(),
    locationTicks: new WeakSet(),
    pressedButtons: new WeakSet(),
  };

  const toast = document.getElementById('toast-hint');
  if (toast) {
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.setAttribute('aria-atomic', 'true');
  }

  const liveRegion = document.createElement('div');
  liveRegion.id = 'app-builder-a11y-status';
  liveRegion.setAttribute('role', 'status');
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');
  Object.assign(liveRegion.style, {
    position: 'fixed',
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: '0',
  });
  (toast?.parentElement || document.body).appendChild(liveRegion);

  const focusStyle = document.createElement('style');
  focusStyle.id = 'app-builder-a11y-focus-style';
  focusStyle.textContent = `
    .toggle:focus-visible,
    .cp-radio:focus-visible,
    .cp-head-row:focus-visible,
    .cp-upload-zone:focus-visible,
    .pc-edit-image-zone:focus-visible,
    .ms-drop:focus-visible,
    .sm-provider:focus-visible,
    .handle:focus-visible,
    [data-drag]:focus-visible,
    [data-loc-tick]:focus-visible {
      outline: 3px solid var(--como, #6d28d9);
      outline-offset: 3px;
    }
  `;
  document.head.appendChild(focusStyle);

  let announceFrame;
  function announce(message) {
    const text = normalizedText(message);
    if (!text) return;
    cancelAnimationFrame(announceFrame);
    liveRegion.textContent = '';
    announceFrame = requestAnimationFrame(() => { liveRegion.textContent = text; });
  }

  function labelForToggle(toggle) {
    const row = toggle.closest([
      '.sm-toggle-row',
      '.ms-toggle-row',
      '.cp-toggle-row',
      '.cp-widget-row',
      '.cp-social-item',
      'label',
    ].join(','));
    const named = row?.querySelector([
      '.sm-toggle-name',
      '.ms-toggle-name',
      '.w-name',
      '.lbl',
      '.cp-social-name',
      'label',
    ].join(','));
    return textWithoutControls(named || row) || normalizedText(toggle.getAttribute('title')) || 'Option';
  }

  function syncToggle(toggle) {
    setBooleanAttribute(toggle, 'aria-checked', toggle.classList.contains('on'));
  }

  function enhanceToggle(toggle) {
    if (enhanced.toggles.has(toggle)) { syncToggle(toggle); return; }
    enhanced.toggles.add(toggle);
    toggle.setAttribute('role', 'switch');
    toggle.tabIndex = 0;
    if (!toggle.hasAttribute('aria-label') && !toggle.hasAttribute('aria-labelledby')) {
      toggle.setAttribute('aria-label', labelForToggle(toggle));
    }
    syncToggle(toggle);
    toggle.addEventListener('keydown', (event) => {
      if (event.key !== ' ' && event.key !== 'Enter') return;
      event.preventDefault();
      toggle.click();
    });
    toggle.addEventListener('click', () => queueMicrotask(() => syncToggle(toggle)));
  }

  function radioGroupLabel(group) {
    const field = group.closest('.cp-field');
    const labelled = field?.querySelector(':scope > label, :scope > .cp-subhead, :scope > .cp-mini-label');
    if (labelled) return textWithoutControls(labelled);
    const sectionTitle = group.closest('.cp-section')?.querySelector(':scope > .cp-head-row');
    return textWithoutControls(sectionTitle) || 'Options';
  }

  function syncRadioGroup(group) {
    const radios = [...group.querySelectorAll(':scope > .cp-radio')];
    if (!radios.length) return;
    let selected = radios.find((radio) => radio.classList.contains('active'));
    if (!selected) selected = radios[0];
    radios.forEach((radio) => {
      const checked = radio === selected;
      setBooleanAttribute(radio, 'aria-checked', checked);
      radio.tabIndex = checked ? 0 : -1;
    });
  }

  function moveRadioFocus(radio, event) {
    const group = radio.closest('.cp-radio-group');
    const radios = [...group.querySelectorAll(':scope > .cp-radio')].filter(isRendered);
    const current = radios.indexOf(radio);
    if (current < 0 || !radios.length) return;
    let target = current;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') target = (current - 1 + radios.length) % radios.length;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') target = (current + 1) % radios.length;
    if (event.key === 'Home') target = 0;
    if (event.key === 'End') target = radios.length - 1;
    if (target === current && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    radios[target].focus({ preventScroll: true });
    radios[target].click();
  }

  function enhanceRadioGroup(group) {
    if (!enhanced.radioGroups.has(group)) {
      enhanced.radioGroups.add(group);
      group.setAttribute('role', 'radiogroup');
      if (!group.hasAttribute('aria-label') && !group.hasAttribute('aria-labelledby')) {
        group.setAttribute('aria-label', radioGroupLabel(group));
      }
    }
    group.querySelectorAll(':scope > .cp-radio').forEach((radio) => {
      if (enhanced.radios.has(radio)) return;
      enhanced.radios.add(radio);
      radio.setAttribute('role', 'radio');
      radio.addEventListener('keydown', (event) => {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
          moveRadioFocus(radio, event);
          return;
        }
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          radio.click();
        }
      });
      radio.addEventListener('click', () => queueMicrotask(() => syncRadioGroup(group)));
    });
    syncRadioGroup(group);
  }

  function syncHead(head) {
    setBooleanAttribute(head, 'aria-expanded', head.parentElement?.classList.contains('open'));
  }

  function enhanceHead(head) {
    if (enhanced.heads.has(head)) { syncHead(head); return; }
    enhanced.heads.add(head);
    head.setAttribute('role', 'button');
    head.tabIndex = 0;
    const body = head.parentElement?.querySelector(':scope > .cp-body');
    if (body) head.setAttribute('aria-controls', ensureId(body, 'cp-section-body', nextId));
    syncHead(head);
    head.addEventListener('keydown', (event) => {
      if (event.key !== ' ' && event.key !== 'Enter') return;
      event.preventDefault();
      head.click();
    });
    head.addEventListener('click', () => queueMicrotask(() => syncHead(head)));
  }

  function uploadLabel(zone) {
    const fieldLabel = zone.closest('.cp-field')?.querySelector(':scope > label');
    if (fieldLabel) return `Upload ${textWithoutControls(fieldLabel)}`;
    const title = zone.querySelector('.ms-drop-title, .cp-upload-btn, .pc-upload-prompt');
    return textWithoutControls(title || zone) || 'Choose a file to upload';
  }

  function enhanceUpload(zone) {
    if (enhanced.uploads.has(zone)) return;
    enhanced.uploads.add(zone);
    zone.setAttribute('role', 'button');
    zone.tabIndex = 0;
    if (!zone.hasAttribute('aria-label') && !zone.hasAttribute('aria-labelledby')) {
      zone.setAttribute('aria-label', uploadLabel(zone));
    }
    zone.addEventListener('keydown', (event) => {
      if (event.key !== ' ' && event.key !== 'Enter') return;
      event.preventDefault();
      zone.click();
    });
  }

  function providerRows() {
    return [...document.querySelectorAll('#sm-provider-list .sm-provider')].filter(isRendered);
  }

  function syncProviderCombo() {
    const combo = document.getElementById('sm-provider-combo');
    const button = document.getElementById('sm-provider-btn');
    const list = document.getElementById('sm-provider-list');
    if (!combo || !button || !list) return;
    button.setAttribute('aria-haspopup', 'listbox');
    button.setAttribute('aria-controls', list.id);
    setBooleanAttribute(button, 'aria-expanded', combo.classList.contains('open'));
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', 'Ordering providers');
    list.querySelectorAll('.sm-provider').forEach((row) => {
      setBooleanAttribute(row, 'aria-selected', row.classList.contains('sel'));
      row.tabIndex = row.classList.contains('sel') ? 0 : -1;
    });
  }

  function focusProviderAt(index) {
    const rows = providerRows();
    if (!rows.length) return;
    const bounded = Math.max(0, Math.min(rows.length - 1, index));
    rows.forEach((row, rowIndex) => { row.tabIndex = rowIndex === bounded ? 0 : -1; });
    rows[bounded].focus({ preventScroll: true });
  }

  function enhanceProviderRow(row) {
    if (enhanced.providers.has(row)) return;
    enhanced.providers.add(row);
    row.setAttribute('role', 'option');
    row.setAttribute('aria-label', textWithoutControls(row.querySelector('.sm-provider-text')) || textWithoutControls(row));
    row.addEventListener('click', () => queueMicrotask(syncProviderCombo));
    row.addEventListener('keydown', (event) => {
      const rows = providerRows();
      const index = rows.indexOf(row);
      if (event.key === 'ArrowDown') { event.preventDefault(); focusProviderAt((index + 1) % rows.length); }
      else if (event.key === 'ArrowUp') { event.preventDefault(); focusProviderAt((index - 1 + rows.length) % rows.length); }
      else if (event.key === 'Home') { event.preventDefault(); focusProviderAt(0); }
      else if (event.key === 'End') { event.preventDefault(); focusProviderAt(rows.length - 1); }
      else if (event.key === 'Escape') {
        event.preventDefault();
        document.getElementById('sm-provider-combo')?.classList.remove('open');
        syncProviderCombo();
        document.getElementById('sm-provider-btn')?.focus({ preventScroll: true });
      } else if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        row.click();
        queueMicrotask(() => document.getElementById('sm-provider-btn')?.focus({ preventScroll: true }));
      }
    });
  }

  const providerButton = document.getElementById('sm-provider-btn');
  if (providerButton) {
    providerButton.addEventListener('click', () => queueMicrotask(syncProviderCombo));
    providerButton.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      event.preventDefault();
      const combo = document.getElementById('sm-provider-combo');
      if (!combo.classList.contains('open')) providerButton.click();
      requestAnimationFrame(() => focusProviderAt(event.key === 'ArrowDown' ? 0 : providerRows().length - 1));
    });
  }

  function rowName(row) {
    return textWithoutControls(row?.querySelector('.w-name, .ms-row-name, .ms-cat-name, .ms-item-name, .pc-item-name'))
      || 'item';
  }

  function reorderableRow(handle) {
    if (handle.matches('[data-drag]')) return handle.closest('.ms-row');
    const row = handle.closest('.cp-widget-row');
    if (row?.closest('#cp-home .cp-master, #rw-widget-list')) return row;
    return null;
  }

  function moveWithExistingDragPath(handle, direction) {
    const row = reorderableRow(handle);
    if (!row) return;
    const peers = [...row.parentElement.children].filter((peer) => peer.matches(row.matches('.ms-row') ? '.ms-row' : '.cp-widget-row'));
    const from = peers.indexOf(row);
    const to = from + direction;
    const name = rowName(row);
    if (to < 0 || to >= peers.length) {
      announce(`${name} is already ${direction < 0 ? 'first' : 'last'}.`);
      return;
    }

    const rect = row.getBoundingClientRect();
    const startY = rect.top + rect.height / 2;
    const delta = direction * (row.offsetHeight + (row.matches('.ms-row') ? 8 : 6));
    handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientY: startY }));
    document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true, clientY: startY + delta }));
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientY: startY + delta }));

    window.setTimeout(() => {
      handle.focus({ preventScroll: true });
      const currentPeers = [...row.parentElement.children].filter((peer) => peer.matches(row.matches('.ms-row') ? '.ms-row' : '.cp-widget-row'));
      const position = currentPeers.indexOf(row) + 1;
      const message = `${name} moved to position ${position} of ${currentPeers.length}.`;
      ctx.showToast?.(message);
      announce(message);
    }, 320);
  }

  function enhanceDragHandle(handle) {
    if (enhanced.dragHandles.has(handle)) return;
    enhanced.dragHandles.add(handle);
    // The modern Pointer Events reorder module owns complete keyboard semantics.
    // Do not attach the legacy synthetic-mouse fallback a second time.
    if (handle.dataset.reorderNative === 'true') return;
    const row = reorderableRow(handle);
    const locked = handle.classList.contains('handle-locked') || !row;
    handle.setAttribute('role', 'button');
    handle.setAttribute('aria-label', locked
      ? `${rowName(handle.closest('.cp-widget-row, .ms-row'))} position cannot be changed`
      : `Move ${rowName(row)}. Use Alt plus Up or Down Arrow.`);
    setBooleanAttribute(handle, 'aria-disabled', locked);
    if (locked) return;
    handle.tabIndex = 0;
    handle.setAttribute('aria-keyshortcuts', 'Alt+ArrowUp Alt+ArrowDown');
    handle.addEventListener('keydown', (event) => {
      if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
      event.preventDefault();
      moveWithExistingDragPath(handle, event.key === 'ArrowUp' ? -1 : 1);
    });
  }

  function syncLocationTick(tick) {
    setBooleanAttribute(tick, 'aria-checked', tick.classList.contains('on'));
  }

  function enhanceLocationTick(tick) {
    if (enhanced.locationTicks.has(tick)) { syncLocationTick(tick); return; }
    enhanced.locationTicks.add(tick);
    const location = tick.closest('.sm-loc');
    const name = textWithoutControls(location?.querySelector('.sm-loc-name')) || 'location';
    tick.setAttribute('role', 'checkbox');
    tick.setAttribute('aria-label', `Accept online orders at ${name}`);
    const disabled = location?.classList.contains('closed');
    setBooleanAttribute(tick, 'aria-disabled', disabled);
    if (!disabled) tick.tabIndex = 0;
    syncLocationTick(tick);
    tick.addEventListener('keydown', (event) => {
      if (event.key !== ' ' && event.key !== 'Enter') return;
      event.preventDefault();
      tick.click();
    });
    tick.addEventListener('click', () => queueMicrotask(() => syncLocationTick(tick)));
  }

  function enhancePressedButton(button) {
    if (enhanced.pressedButtons.has(button)) {
      setBooleanAttribute(button, 'aria-pressed', button.classList.contains('on'));
      return;
    }
    enhanced.pressedButtons.add(button);
    setBooleanAttribute(button, 'aria-pressed', button.classList.contains('on'));
    button.addEventListener('click', () => queueMicrotask(() => {
      setBooleanAttribute(button, 'aria-pressed', button.classList.contains('on'));
    }));
  }

  function hasProgrammaticLabel(control) {
    if (control.hasAttribute('aria-label') || control.hasAttribute('aria-labelledby')) return true;
    if (!control.id) return false;
    try { return !!document.querySelector(`label[for="${CSS.escape(control.id)}"]`); }
    catch { return false; }
  }

  function labelSettingsControl(control) {
    if (hasProgrammaticLabel(control)) return;
    if (control.id === 'sm-search-input') {
      control.setAttribute('aria-label', 'Search settings');
      return;
    }
    const fieldLabel = control.closest('.sm-field')?.querySelector(':scope > .sm-label');
    if (fieldLabel) {
      control.setAttribute('aria-label', textWithoutControls(fieldLabel));
      return;
    }
    const teammate = control.closest('.sm-rows-row')?.querySelector('.sm-rows-name');
    if (teammate && control.matches('select')) {
      control.setAttribute('aria-label', `${textWithoutControls(teammate)} access level`);
      return;
    }
    const placeholder = normalizedText(control.getAttribute('placeholder'));
    const title = normalizedText(control.getAttribute('title'));
    if (title || placeholder) control.setAttribute('aria-label', title || placeholder);
  }

  function labelInfoButton(button) {
    if (button.hasAttribute('aria-label')) return;
    const label = button.closest('.sm-label, .ms-toggle-name, .sm-toggle-name');
    button.setAttribute('aria-label', `More information about ${textWithoutControls(label) || 'this setting'}`);
  }

  function applyHeadingSemantics(scope) {
    scope.querySelectorAll?.('.cp-page-title, .ms-title').forEach((heading) => {
      heading.setAttribute('role', 'heading');
      heading.setAttribute('aria-level', '1');
    });
    scope.querySelectorAll?.('.cp-detail-title, .sm-rail-title').forEach((heading) => {
      heading.setAttribute('role', 'heading');
      heading.setAttribute('aria-level', '2');
    });
    scope.querySelectorAll?.('.sm-section-label, .ms-section-label').forEach((heading) => {
      heading.setAttribute('role', 'heading');
      heading.setAttribute('aria-level', '3');
    });
  }

  function syncCurrentStates() {
    document.querySelectorAll('.side-step[data-step]').forEach((step) => {
      if (step.classList.contains('active')) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
    });
    document.querySelectorAll('#settings-modal .sm-nav').forEach((nav) => {
      if (nav.classList.contains('active')) nav.setAttribute('aria-current', 'page');
      else nav.removeAttribute('aria-current');
    });
    document.querySelectorAll('.toggle').forEach(syncToggle);
    document.querySelectorAll('.cp-radio-group').forEach(syncRadioGroup);
    document.querySelectorAll('.cp-head-row').forEach(syncHead);
    document.querySelectorAll('[data-loc-tick]').forEach(syncLocationTick);
    document.querySelectorAll('#settings-modal .sm-chip').forEach((button) => {
      setBooleanAttribute(button, 'aria-pressed', button.classList.contains('on'));
    });
    syncProviderCombo();
  }

  function scan(scope = document) {
    const root = scope instanceof Element ? scope : document;
    root.querySelectorAll?.('.toggle').forEach(enhanceToggle);
    root.querySelectorAll?.('.cp-radio-group').forEach(enhanceRadioGroup);
    root.querySelectorAll?.('.cp-head-row').forEach(enhanceHead);
    root.querySelectorAll?.(UPLOAD_SELECTOR).forEach(enhanceUpload);
    root.querySelectorAll?.('#sm-provider-list .sm-provider').forEach(enhanceProviderRow);
    root.querySelectorAll?.('.handle, [data-drag]').forEach(enhanceDragHandle);
    root.querySelectorAll?.('[data-loc-tick]').forEach(enhanceLocationTick);
    root.querySelectorAll?.('#settings-modal .sm-chip').forEach(enhancePressedButton);
    root.querySelectorAll?.('#settings-modal input, #settings-modal textarea, #settings-modal select').forEach(labelSettingsControl);
    root.querySelectorAll?.('.sm-info, .ms-info').forEach(labelInfoButton);
    applyHeadingSemantics(root);

    const reveal = document.getElementById('sm-oo-key-reveal');
    const keyInput = document.getElementById('sm-oo-key');
    if (reveal && keyInput && !reveal.dataset.a11yWired) {
      reveal.dataset.a11yWired = 'true';
      const syncReveal = () => reveal.setAttribute('aria-label', keyInput.type === 'password' ? 'Show production API key' : 'Hide production API key');
      syncReveal();
      reveal.addEventListener('click', () => queueMicrotask(syncReveal));
    }
  }

  let backgroundState = [];
  let activeModal = null;

  function restoreBackground() {
    backgroundState.forEach(({ element, inert, ariaHidden }) => {
      element.inert = inert;
      if (ariaHidden === null) element.removeAttribute('aria-hidden');
      else element.setAttribute('aria-hidden', ariaHidden);
    });
    backgroundState = [];
  }

  function isLiveRegionHost(element) {
    return element.matches?.('#toast-hint, #app-builder-a11y-status')
      || !!element.querySelector?.('#toast-hint, #app-builder-a11y-status');
  }

  function isolateModal(overlay) {
    let activeChild = overlay;
    let parent = overlay.parentElement;
    const seen = new Set();
    while (parent) {
      [...parent.children].forEach((sibling) => {
        if (sibling === activeChild || seen.has(sibling) || isLiveRegionHost(sibling)) return;
        seen.add(sibling);
        backgroundState.push({
          element: sibling,
          inert: sibling.inert,
          ariaHidden: sibling.getAttribute('aria-hidden'),
        });
        sibling.inert = true;
        sibling.setAttribute('aria-hidden', 'true');
      });
      if (parent === document.body) break;
      activeChild = parent;
      parent = parent.parentElement;
    }
  }

  function focusableElements(dialog) {
    return [...dialog.querySelectorAll(FOCUSABLE_SELECTOR)].filter((element) => {
      return isRendered(element) && !element.closest('[inert]') && element.getAttribute('aria-hidden') !== 'true';
    });
  }

  function modalIsOpen(descriptor) {
    const overlay = descriptor.overlay instanceof Element
      ? descriptor.overlay
      : document.querySelector(descriptor.overlay);
    return !!overlay?.classList.contains('open');
  }

  function configureDialog(descriptor) {
    const overlay = document.querySelector(descriptor.overlay);
    const dialog = overlay?.querySelector(descriptor.dialog);
    if (!overlay || !dialog) return null;
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    const label = dialog.querySelector(descriptor.label);
    if (label) {
      const labelId = ensureId(label, 'dialog-title', nextId);
      dialog.setAttribute('aria-labelledby', labelId);
      dialog.removeAttribute('aria-label');
    }
    return { ...descriptor, overlay, dialog };
  }

  function closeActiveModal() {
    if (!activeModal) return;
    const close = activeModal.overlay.querySelector(activeModal.close) || document.querySelector(activeModal.close);
    close?.click();
  }

  function activateModal(descriptor) {
    const configured = configureDialog(descriptor);
    if (!configured) return;
    const trigger = document.activeElement instanceof HTMLElement && document.activeElement !== document.body
      ? document.activeElement
      : null;
    activeModal = { ...configured, trigger };
    configured.overlay.setAttribute('aria-hidden', 'false');
    isolateModal(configured.overlay);

    requestAnimationFrame(() => {
      if (activeModal?.overlay !== configured.overlay || !modalIsOpen(configured)) return;
      const preferred = configured.overlay.querySelector(configured.initial) || document.querySelector(configured.initial);
      const target = isRendered(preferred) ? preferred : focusableElements(configured.dialog)[0] || configured.dialog;
      if (target === configured.dialog && !target.hasAttribute('tabindex')) target.tabIndex = -1;
      target.focus({ preventScroll: true });
    });
  }

  function deactivateModal() {
    if (!activeModal) return;
    const previous = activeModal;
    activeModal = null;
    restoreBackground();
    const fallback = previous.fallbackRestore ? document.querySelector(previous.fallbackRestore) : null;
    const restore = isRendered(previous.trigger) ? previous.trigger : isRendered(fallback) ? fallback : null;
    restore?.focus({ preventScroll: true });
  }

  function syncModalState() {
    MODALS.forEach((descriptor) => {
      const overlay = document.querySelector(descriptor.overlay);
      if (overlay) setBooleanAttribute(overlay, 'aria-hidden', !overlay.classList.contains('open'));
    });

    // Guided-flow owns the blocking product tour, including Escape. Its staged
    // Settings view must not become a competing focus trap.
    const next = document.body.classList.contains('gf-touring')
      ? null
      : MODALS.find(modalIsOpen) || null;
    const nextOverlay = next ? document.querySelector(next.overlay) : null;
    if (activeModal?.overlay === nextOverlay) return;
    if (activeModal) deactivateModal();
    if (next) activateModal(next);
  }

  function trapModalKeydown(event) {
    if (document.body.classList.contains('gf-touring') || !activeModal) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeActiveModal();
      return;
    }
    if (event.key !== 'Tab') return;
    const items = focusableElements(activeModal.dialog);
    if (!items.length) {
      event.preventDefault();
      activeModal.dialog.focus({ preventScroll: true });
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && (document.activeElement === first || !activeModal.dialog.contains(document.activeElement))) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!event.shiftKey && (document.activeElement === last || !activeModal.dialog.contains(document.activeElement))) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  }

  document.addEventListener('keydown', trapModalKeydown, true);

  function announceNavigation() {
    const page = [...document.querySelectorAll('.cp-page')].find(isRendered);
    const title = page?.querySelector('.cp-page-title, .cp-detail.show .cp-detail-title');
    if (title) announce(`${normalizedText(title.textContent)} editor`);
    syncCurrentStates();
  }
  document.addEventListener('como:navchange', announceNavigation);

  let refreshQueued = false;
  function queueRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    queueMicrotask(() => {
      refreshQueued = false;
      scan(document);
      syncCurrentStates();
      syncModalState();
    });
  }

  const observer = new MutationObserver(queueRefresh);
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class', 'hidden', 'style'],
  });

  scan(document);
  syncCurrentStates();
  syncModalState();

  return {
    announceAccessibility: announce,
    disposeAccessibility() {
      observer.disconnect();
      document.removeEventListener('keydown', trapModalKeydown, true);
      document.removeEventListener('como:navchange', announceNavigation);
      deactivateModal();
      cancelAnimationFrame(announceFrame);
      liveRegion.remove();
      focusStyle.remove();
    },
  };
}
