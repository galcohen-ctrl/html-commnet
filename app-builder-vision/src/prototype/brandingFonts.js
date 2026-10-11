const DEFAULT_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
const RECOMMENDED = ['DM Sans', 'Lato', 'Montserrat', 'Poppins', 'Nunito', 'Playfair Display', 'Merriweather', 'Lora', 'Rubik', 'Manrope', 'Questrial', 'Source Sans 3'];
const loadedFonts = new Map();
let catalogueRequest;

export function googleFontUrl(font) {
  const weights = font.weights?.length ? font.weights : [400];
  const axes = font.italic ? `ital,wght@${weights.map((weight) => `1,${weight}`).join(';')}` : `wght@${weights.join(';')}`;
  const url = new URL('https://fonts.googleapis.com/css2');
  url.searchParams.set('family', `${font.family}:${axes}`);
  url.searchParams.set('display', 'swap');
  return url.href;
}

export function fontStack(font) {
  const fallback = ['serif', 'monospace'].includes(font.category) ? font.category : font.category === 'handwriting' ? 'cursive' : 'sans-serif';
  return `${JSON.stringify(font.family)}, ${fallback}`;
}

function catalogue() {
  if (!catalogueRequest) {
    catalogueRequest = fetch(`${import.meta.env.BASE_URL}fonts/catalog.json`)
      .then((response) => {
        if (!response.ok) throw new Error('Font list unavailable');
        return response.json();
      })
      .then((data) => data.fonts)
      .catch((error) => { catalogueRequest = null; throw error; });
  }
  return catalogueRequest;
}

function loadFont(font) {
  if (loadedFonts.has(font.family)) return loadedFonts.get(font.family);
  const request = new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = googleFontUrl(font);
    link.dataset.googleFont = font.family;
    const timer = setTimeout(() => fail(), 15000);
    const fail = () => {
      clearTimeout(timer);
      link.remove();
      loadedFonts.delete(font.family);
      reject(new Error('Font download failed'));
    };
    link.onerror = fail;
    link.onload = async () => {
      try {
        const style = font.italic ? 'italic ' : '';
        await document.fonts.load(`${style}${font.weights?.[0] || 400} 16px ${JSON.stringify(font.family)}`);
        clearTimeout(timer);
        resolve();
      } catch { fail(); }
    };
    document.head.appendChild(link);
  });
  loadedFonts.set(font.family, request);
  return request;
}

export function initBrandingFonts({ applyFontFamily, markDirty }) {
  document.querySelectorAll('.brand-font-picker').forEach((picker) => {
    const role = picker.dataset.fontRole;
    const trigger = picker.querySelector('[data-font-open]');
    const panel = picker.querySelector('[data-font-panel]');
    const search = picker.querySelector('input[type="search"]');
    const selected = picker.querySelector('input[type="hidden"]');
    const label = picker.querySelector('[data-font-label]');
    const results = picker.querySelector('[data-font-results]');
    const status = picker.querySelector('[role="status"]');
    let fonts;
    let requestVersion = 0;

    function close(restoreFocus = false) {
      panel.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      if (restoreFocus) trigger.focus();
    }

    async function choose(font, restoring = false) {
      const version = ++requestVersion;
      status.textContent = font ? `Loading ${font.family}...` : '';
      picker.setAttribute('aria-busy', 'true');
      try {
        if (font) await loadFont(font);
        if (version !== requestVersion) return;
        const stack = font ? fontStack(font) : DEFAULT_FONT;
        applyFontFamily(stack, role);
        selected.value = font?.family || '';
        label.textContent = font?.family || 'Device default';
        label.style.fontFamily = stack;
        status.textContent = '';
        close(!restoring);
        if (!restoring) markDirty();
        document.dispatchEvent(new CustomEvent('como:branding-changed'));
      } catch {
        if (version === requestVersion) status.textContent = 'Could not load this font. Check your connection and try again.';
      } finally {
        if (version === requestVersion) picker.setAttribute('aria-busy', 'false');
      }
    }

    function render() {
      const query = search.value.trim().toLowerCase();
      const matches = query
        ? fonts.filter((font) => font.family.toLowerCase().includes(query)).slice(0, 40)
        : RECOMMENDED.map((family) => fonts.find((font) => font.family === family)).filter(Boolean);
      const fragment = document.createDocumentFragment();
      [null, ...matches].forEach((font) => {
        if (!font && query) return;
        const option = document.createElement('button');
        option.type = 'button';
        option.className = 'brand-font-option';
        option.textContent = font?.family || 'Device default';
        option.setAttribute('aria-pressed', String((font?.family || '') === selected.value));
        option.addEventListener('click', () => choose(font));
        fragment.appendChild(option);
      });
      results.replaceChildren(fragment);
      status.textContent = matches.length ? '' : 'No fonts found. Try another name.';
    }

    async function open() {
      panel.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      search.focus();
      if (!fonts) {
        status.textContent = 'Loading fonts...';
        try { fonts = await catalogue(); }
        catch { status.textContent = 'The font list could not load. Close and reopen to try again.'; return; }
      }
      render();
    }

    trigger.addEventListener('click', () => panel.hidden ? open() : close());
    search.addEventListener('input', () => { if (fonts) render(); });
    selected.addEventListener('input', async () => {
      try {
        fonts ||= await catalogue();
        const font = fonts.find((item) => item.family === selected.value);
        if (!selected.value || font) await choose(font || null, true);
      } catch { status.textContent = 'Connect to the internet to load your saved font.'; }
    });
    picker.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') { ++requestVersion; picker.setAttribute('aria-busy', 'false'); close(true); }
      if (!['ArrowDown', 'ArrowUp'].includes(event.key) || panel.hidden) return;
      const options = [...results.querySelectorAll('button')];
      const current = options.indexOf(document.activeElement);
      const next = event.key === 'ArrowDown' ? Math.min(options.length - 1, current + 1) : Math.max(0, current - 1);
      if (options[next]) { event.preventDefault(); options[next].focus(); }
    });
    document.addEventListener('click', (event) => {
      if (!picker.contains(event.target)) close();
    });
  });
}