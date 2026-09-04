const VIEW_STORAGE_KEY = 'como-app-builder-responsive-view';

function readStoredView() {
  try {
    const value = window.sessionStorage.getItem(VIEW_STORAGE_KEY);
    return value === 'preview' ? 'preview' : 'edit';
  } catch {
    return 'edit';
  }
}

function storeView(value) {
  try {
    window.sessionStorage.setItem(VIEW_STORAGE_KEY, value);
  } catch {
    // Storage can be unavailable in a privacy-restricted embedded preview.
  }
}

export function initResponsive() {
  const topbar = document.querySelector('.topbar');
  if (!topbar) return {};

  const preview = document.getElementById('preview-area');
  const device = document.getElementById('device-frame');
  const stage = document.getElementById('device-stage');

  const compactQuery = window.matchMedia('(max-width: 1179.98px)');
  const mobileQuery = window.matchMedia('(max-width: 767.98px)');
  let currentView = readStoredView();

  const switcher = document.createElement('div');
  switcher.className = 'responsive-view-switch';
  switcher.setAttribute('role', 'group');
  switcher.setAttribute('aria-label', 'Builder view');
  switcher.innerHTML = `
    <button type="button" data-responsive-view="edit" aria-pressed="true">Edit</button>
    <button type="button" data-responsive-view="preview" aria-pressed="false">Preview</button>
  `;
  topbar.insertBefore(switcher, topbar.querySelector('.top-spacer'));

  const buttons = [...switcher.querySelectorAll('[data-responsive-view]')];

  function setResponsiveView(view, options = {}) {
    const next = view === 'preview' ? 'preview' : 'edit';
    currentView = next;
    document.body.dataset.responsiveView = next;
    buttons.forEach((button) => {
      const active = button.dataset.responsiveView === next;
      button.setAttribute('aria-pressed', String(active));
    });
    if (options.persist !== false) storeView(next);

    if (compactQuery.matches && options.animate !== false) {
      const entering = next === 'preview' ? preview : document.getElementById('config-panel');
      if (entering?.animate) {
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        entering.animate(
          reduced
            ? [{ opacity: .65 }, { opacity: 1 }]
            : [{ opacity: .55, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }],
          { duration: reduced ? 100 : 180, easing: 'cubic-bezier(.23,1,.32,1)' },
        );
      }
    }

    if (options.focus === true && compactQuery.matches) {
      const target = next === 'preview'
        ? document.querySelector('.preview-edit-toggle, #device-frame')
        : document.querySelector('.config-panel input:not([type="hidden"]), .config-panel button, .config-panel [tabindex="0"]');
      requestAnimationFrame(() => target?.focus({ preventScroll: true }));
    }

    document.dispatchEvent(new CustomEvent('como:responsiveviewchange', {
      detail: { view: next, compact: compactQuery.matches },
    }));
  }

  function syncLayoutMode() {
    document.body.dataset.layoutMode = mobileQuery.matches
      ? 'mobile'
      : compactQuery.matches ? 'compact' : 'desktop';
    // Preserve the merchant's last compact choice while desktop simply shows both.
    if (compactQuery.matches) setResponsiveView(currentView, { persist: false });
  }

  function updatePreviewFit() {
    if (!preview || !device || !stage || preview.clientWidth === 0 || preview.clientHeight === 0) return;
    const style = getComputedStyle(preview);
    const inlineSpace = preview.clientWidth
      - parseFloat(style.paddingLeft || '0')
      - parseFloat(style.paddingRight || '0');
    let blockSpace = preview.clientHeight
      - parseFloat(style.paddingTop || '0')
      - parseFloat(style.paddingBottom || '0');

    const toolbar = preview.querySelector('.preview-edit-toolbar');
    if (toolbar) {
      const toolbarStyle = getComputedStyle(toolbar);
      if (toolbarStyle.position !== 'absolute' && toolbarStyle.position !== 'fixed') {
        blockSpace -= toolbar.getBoundingClientRect().height
          + parseFloat(toolbarStyle.marginTop || '0')
          + parseFloat(toolbarStyle.marginBottom || '0');
      }
    }

    const rawScale = Math.min(1, inlineSpace / 320, blockSpace / 660);
    const scale = Math.max(0.42, Number.isFinite(rawScale) ? rawScale : 1);
    device.style.setProperty('--preview-device-scale', scale.toFixed(4));
    stage.style.width = `${Math.round(320 * scale)}px`;
    stage.style.height = `${Math.round(660 * scale)}px`;
    preview.dataset.previewScale = scale.toFixed(2);
  }

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      setResponsiveView(button.dataset.responsiveView);
    });
  });

  // Choosing a destination in the compact rail means the merchant is going there
  // to configure it. The phone's own navigation remains in Preview.
  document.getElementById('side-nav')?.addEventListener('click', (event) => {
    const destination = event.target.closest('.side-item[data-step], .side-item[data-nav-page]');
    if (destination && compactQuery.matches) setResponsiveView('edit');
  });

  // Direct preview selection opens a bounded editor, so reveal that editor on a
  // one-pane layout without an arbitrary timer or intermediate animation.
  document.addEventListener('como:previewedit', () => {
    if (compactQuery.matches) setResponsiveView('edit');
  });

  compactQuery.addEventListener('change', syncLayoutMode);
  mobileQuery.addEventListener('change', syncLayoutMode);
  const previewObserver = preview && 'ResizeObserver' in window
    ? new ResizeObserver(() => updatePreviewFit())
    : null;
  if (preview) previewObserver?.observe(preview);
  document.addEventListener('como:responsiveviewchange', () => requestAnimationFrame(updatePreviewFit));
  window.addEventListener('resize', updatePreviewFit, { passive: true });
  setResponsiveView(currentView, { persist: false });
  syncLayoutMode();
  requestAnimationFrame(updatePreviewFit);

  window.setResponsiveView = setResponsiveView;
  return { setResponsiveView, getResponsiveView: () => currentView, updatePreviewFit };
}
