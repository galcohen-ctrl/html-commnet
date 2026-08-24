export function initBranding(ctx) {
  const { markDirty, showToast, wireColorControl } = ctx;

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


  return { applyFontFamily, activateFontItem, wireFontItem, loadCustomFont, applyLogo, clearLogo, handleLogoFile };
}

