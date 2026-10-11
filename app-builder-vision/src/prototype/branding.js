import { initBrandingBackground } from './brandingBackground.js';
import { initBrandingFonts } from './brandingFonts.js';

export function initBranding(ctx) {
  const { markDirty, showToast, wireColorControl } = ctx;

  initBrandingBackground({ wireColorControl, markDirty });

  // Each Fine-tune row shows the value it owns, so the merchant can skip the
  // whole group without opening five panels to check what is in them.
  function syncTuneSummaries() {
    const pairs = [
      ['brand-tune-header-val', document.querySelector('.app-page[data-page="home"] .app-top-header .brand-text .name')?.textContent, 'Not set'],
      ['brand-tune-fonts-val', document.querySelector('#brand-title-font-open [data-font-label]')?.textContent, 'Device default'],
      ['brand-tune-shapes-val', document.getElementById('brand-card-shape-value')?.textContent, 'Soft'],
      ['brand-tune-logo-val', document.getElementById('gf-logo-filename')?.textContent, 'Not uploaded'],
      ['brand-accent-hex', document.body.style.getPropertyValue('--p-accent')?.trim() || '#6D28D9', '#6D28D9'],
      ['brand-tune-background-val', document.getElementById('appbg-mode-value')?.value === 'gradient' ? 'Gradient' : 'Solid colour', 'Solid colour'],
    ];
    pairs.forEach(([id, value, fallback]) => {
      const el = document.getElementById(id);
      if (!el) return;
      const text = value?.toString().trim() || fallback;
      if (id === 'brand-accent-hex') {
        if (document.activeElement !== el) el.value = text.toUpperCase();
        return;
      }
      el.textContent = text;
    });
    // The Logo row only shows a filename after upload. Before that, keep the fallback.
    const logoRow = document.getElementById('brand-tune-logo-val');
    if (logoRow && document.getElementById('gf-logo-result')?.style.display === 'none') logoRow.textContent = 'Not uploaded';
  }
  ['como:draft-dirty', 'como:navchange', 'como:branding-changed'].forEach((name) => document.addEventListener(name, syncTuneSummaries));
  syncTuneSummaries();

  // The native colour popup is a browser widget that cannot be typed or pasted into
  // reliably, so the hex beside the swatch is a real text field that drives it.
  const accentPicker = document.getElementById('gf-accent-custom');
  const accentHex = document.getElementById('brand-accent-hex');
  const parseHex = (raw) => {
    const body = raw.trim().replace(/^#/, '');
    if (/^[0-9a-f]{3}$/i.test(body)) return '#' + body.split('').map((c) => c + c).join('').toLowerCase();
    if (/^[0-9a-f]{6}$/i.test(body)) return '#' + body.toLowerCase();
    return null;
  };
  accentHex?.addEventListener('input', () => {
    const hex = parseHex(accentHex.value);
    accentHex.classList.toggle('invalid', !hex && accentHex.value.trim() !== '');
    if (!hex || !accentPicker || accentPicker.value === hex) return;
    accentPicker.value = hex;
    accentPicker.dispatchEvent(new Event('input', { bubbles: true }));
  });
  accentHex?.addEventListener('blur', () => { accentHex.classList.remove('invalid'); syncTuneSummaries(); });
  accentHex?.addEventListener('keydown', (event) => { if (event.key === 'Enter') accentHex.blur(); });
  // Auto-open the Logo L3 drill the first time the merchant steps into Branding
  // from Business — the moment upload becomes the expected next action.
  let previousStep = null;
  document.addEventListener('como:stepchange', (event) => {
    const currentStep = event.detail?.step;
    if (previousStep === 'business' && currentStep === 'branding') {
      const logoDrill = document.querySelector('.cp-detail[data-detail="brand-logo"]');
      if (logoDrill) {
        window.openL3Panel?.(logoDrill);
        // The row must show it owns the open panel, as it does after a manual click.
        document.querySelector('#cp-branding .w-name[data-drill="brand-logo"]')?.closest('.cp-widget-row')?.classList.add('l3-active');
      }
    }
    previousStep = currentStep;
  });

  // Delegated so it survives HMR. Once opened, a branding drill lives in #l3-body
  // and has no .cp-page ancestor, so coreNavigation's generic .cp-back handler no-ops.
  document.addEventListener('click', (event) => {
    if (event.target.closest('.brand-drill .cp-back')) window.closeL3Panel?.();
  });

  // The stock palette already fails the 4.5:1 check, so the Fine-tune contrast badge
  // only appears once the merchant has changed a colour themselves.
  document.addEventListener('input', (event) => {
    if (event.target.closest('#gf-advanced-branding-section input')) document.body.dataset.brandingTouched = 'true';
  });

  // ---------- Font picker (Branding drill: list + search + custom upload) ----------
  function applyFontFamily(font, role = 'both') {
    if (role === 'both' || role === 'body') {
      document.body.style.setProperty('--p-font-body', font);
      document.querySelectorAll('.app-shell').forEach(shell => shell.style.fontFamily = font);
    }
    if (role === 'both' || role === 'title') document.body.style.setProperty('--p-font-title', font);
  }
  initBrandingFonts({ applyFontFamily, markDirty });

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

  // Custom font upload with legal-consent modal (branding step)
  const brandFontBtn = document.getElementById('brand-custom-font-btn');
  const brandFontFile = document.getElementById('brand-custom-font-file');
  const fontLegalOverlay = document.getElementById('font-legal-overlay');
  const fontLegalAgree = document.getElementById('font-legal-agree');
  const fontLegalOk = document.getElementById('font-legal-ok');
  const fontLegalCancel = document.getElementById('font-legal-cancel');
  const fontLegalFile = document.getElementById('font-legal-file');
  let pendingFontFile = null;

  function openFontLegal(file) {
    if (!fontLegalOverlay) return;
    pendingFontFile = file;
    if (fontLegalFile) fontLegalFile.textContent = file.name;
    if (fontLegalAgree) fontLegalAgree.checked = false;
    if (fontLegalOk) fontLegalOk.disabled = true;
    fontLegalOverlay.classList.add('open');
    fontLegalOverlay.setAttribute('aria-hidden', 'false');
  }
  function closeFontLegal() {
    if (!fontLegalOverlay) return;
    fontLegalOverlay.classList.remove('open');
    fontLegalOverlay.setAttribute('aria-hidden', 'true');
    pendingFontFile = null;
  }
  fontLegalAgree?.addEventListener('change', () => {
    if (fontLegalOk) fontLegalOk.disabled = !fontLegalAgree.checked;
  });
  fontLegalCancel?.addEventListener('click', closeFontLegal);
  fontLegalOverlay?.addEventListener('click', (e) => { if (e.target === fontLegalOverlay) closeFontLegal(); });
  fontLegalOk?.addEventListener('click', () => {
    if (!pendingFontFile || !fontLegalAgree?.checked) return;
    const file = pendingFontFile;
    closeFontLegal();
    loadCustomFont(file);
  });
  brandFontBtn?.addEventListener('click', () => brandFontFile?.click());
  brandFontFile?.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) openFontLegal(file);
    e.target.value = '';
  });

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


  return { applyFontFamily, activateFontItem, wireFontItem, loadCustomFont, applyLogo, clearLogo, handleLogoFile };
}
