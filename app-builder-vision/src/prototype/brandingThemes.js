import { TEXT_RATIO, UI_RATIO, hexToHsl, hslToHex, nudgeColour, problems } from './brandingContrast.js';

const hex = value => /^#[0-9a-f]{6}$/i.test(value || '') ? value.toLowerCase() : null;

function makeThemes(accent) {
  const [hue, saturation] = hexToHsl(accent) || [260, 60];
  const themes = [
    { key: 'light', name: 'Light', bg: hslToHex(hue, Math.min(saturation, 35), 97), panel: '#ffffff', text: '#1d1d28', muted: '#6b6b7b' },
    { key: 'soft', name: 'Soft tint', bg: hslToHex(hue, Math.min(saturation, 55), 92), panel: hslToHex(hue, Math.min(saturation, 25), 98), text: '#1d1d28', muted: '#5f5f70' },
    { key: 'dark', name: 'Dark', bg: hslToHex(hue, Math.min(saturation, 45), 12), panel: hslToHex(hue, Math.min(saturation, 30), 18), text: '#f5f5fa', muted: '#c7c7d6' },
  ];
  return themes.map(theme => {
    const [bgHue, bgSat, bgLight] = hexToHsl(theme.bg);
    const bg2 = hslToHex(bgHue, bgSat, bgLight > 50 ? Math.max(3, bgLight - 6) : Math.min(97, bgLight + 6));
    const surfaces = [theme.bg, bg2, theme.panel];
    const icon = nudgeColour(accent, surfaces, UI_RATIO);
    const palette = {
      cards: theme.panel,
      backgrounds: [theme.bg, bg2],
      bars: theme.panel,
      backgroundIsImage: false,
      text: nudgeColour(theme.text, [theme.panel, ...surfaces], TEXT_RATIO),
      muted: nudgeColour(theme.muted, [theme.panel, ...surfaces], TEXT_RATIO),
      accent,
      icon,
    };
    const failed = problems(palette);
    const reason = failed.some(item => item.subject === 'brand colour')
      ? 'Brand colour needs more contrast here.'
      : failed.some(item => item.subject === 'icons')
        ? 'Icon colour needs more contrast here.'
        : failed.length ? 'This theme does not meet contrast requirements.' : '';
    return { ...theme, bg2, icon, palette, reason };
  });
}

export function initBrandingThemes({ markDirty, showToast }) {
  const grid = document.querySelector('.branding-theme-grid');
  if (!grid) return {};
  const accentInput = document.getElementById('gf-accent-custom');
  const inputs = {
    background: document.getElementById('appbg-color1'),
    background2: document.getElementById('appbg-color2'),
    strength: document.getElementById('appbg-opacity'),
    mode: document.getElementById('appbg-mode-value'),
    direction: document.getElementById('appbg-direction'),
    texture: document.getElementById('appbg-texture'),
    image: document.getElementById('appbg-image-data'),
    average: document.getElementById('appbg-image-average'),
    imageName: document.getElementById('appbg-image-name'),
  };
  const colourInputs = Object.fromEntries(['--p-panel', '--p-nav-bg', '--p-text', '--p-text-muted', '--p-icon']
    .map(name => [name, document.querySelector(`input[type="color"][data-bind-color="${name}"]`)]));
  const readVar = name => hex(getComputedStyle(document.body).getPropertyValue(name).trim());
  let applying = false;

  function paletteFor(theme) {
    const bg = theme.bg;
    return {
      '--p-panel': theme.panel,
      '--p-nav-bg': theme.panel,
      '--p-text': theme.palette.text,
      '--p-text-muted': theme.palette.muted,
      '--p-icon': theme.icon,
      '--p-bg': bg,
    };
  }

  function render() {
    const accent = readVar('--p-accent') || accentInput?.value || '#6d28d9';
    const themes = makeThemes(accent);
    grid.querySelectorAll('[data-brand-theme]').forEach(button => {
      const theme = themes.find(item => item.key === button.dataset.brandTheme);
      if (!theme) return;
      const colors = [theme.bg, theme.panel, theme.icon];
      button.querySelectorAll('.branding-theme-swatches i').forEach((swatch, index) => { swatch.style.backgroundColor = colors[index]; });
      const status = button.querySelector('.branding-theme-status');
      status.textContent = theme.reason || 'Accessible';
      button.disabled = Boolean(theme.reason);
      button.title = theme.reason || `${theme.name} theme. Meets WCAG contrast requirements.`;
      button.setAttribute('aria-label', theme.reason ? `${theme.name}: ${theme.reason}` : `Apply ${theme.name} accessible theme`);
      button.setAttribute('aria-pressed', String(button.dataset.active === 'true'));
    });
    return themes;
  }
  const scheduleRender = () => queueMicrotask(render);

  function snapshot() {
    return {
      mode: inputs.mode.value,
      background: inputs.background.value,
      background2: inputs.background2.value,
      strength: inputs.strength.value,
      direction: inputs.direction.value,
      texture: inputs.texture.checked,
      image: inputs.image.value,
      average: inputs.average.value,
      imageName: inputs.imageName.value,
      iconVariable: document.body.style.getPropertyValue('--p-icon'),
      colours: Object.fromEntries(Object.entries(colourInputs).map(([name, input]) => [name, input?.value || ''])),
    };
  }

  function fire(input) {
    input?.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function restore(saved) {
    applying = true;
    inputs.background.value = saved.background;
    inputs.background2.value = saved.background2;
    inputs.strength.value = saved.strength;
    inputs.direction.value = saved.direction;
    inputs.texture.checked = saved.texture;
    inputs.image.value = saved.image;
    inputs.average.value = saved.average;
    inputs.imageName.value = saved.imageName;
    Object.entries(saved.colours).forEach(([name, value]) => {
      if (colourInputs[name]) colourInputs[name].value = value;
    });
    Object.keys(colourInputs).forEach(name => fire(colourInputs[name]));
    inputs.mode.value = saved.mode;
    fire(inputs.mode);
    fire(inputs.image);
    if (!saved.iconVariable) document.body.style.removeProperty('--p-icon');
    grid.querySelectorAll('[data-brand-theme]').forEach(button => { delete button.dataset.active; });
    render();
    markDirty?.();
    applying = false;
  }

  function apply(theme) {
    const previous = snapshot();
    applying = true;
    inputs.background.value = theme.bg;
    inputs.background2.value = theme.bg2;
    inputs.strength.value = '100';
    inputs.direction.value = '135';
    inputs.texture.checked = false;
    inputs.image.value = '';
    inputs.average.value = '';
    inputs.imageName.value = '';
    Object.entries(paletteFor(theme)).forEach(([name, value]) => {
      const input = colourInputs[name];
      if (input) { input.value = value; fire(input); }
    });
    fire(inputs.background);
    fire(inputs.background2);
    fire(inputs.strength);
    fire(inputs.direction);
    fire(inputs.texture);
    fire(inputs.image);
    inputs.mode.value = 'solid';
    fire(inputs.mode);
    grid.querySelectorAll('[data-brand-theme]').forEach(button => {
      button.dataset.active = String(button.dataset.brandTheme === theme.key);
      button.setAttribute('aria-pressed', button.dataset.active);
    });
    markDirty?.();
    applying = false;
    showToast?.(`${theme.name} theme applied`, {
      variant: 'success',
      actionLabel: 'Undo',
      onAction: () => restore(previous),
    });
  }

  grid.addEventListener('click', event => {
    const button = event.target.closest('[data-brand-theme]');
    if (!button || button.disabled) return;
    const theme = render().find(item => item.key === button.dataset.brandTheme);
    if (theme && !theme.reason) apply(theme);
  });
  document.addEventListener('input', event => {
    if (applying || !event.target.matches('input[type="color"], .cp-color-hex, #appbg-opacity, #appbg-texture')) return;
    grid.querySelectorAll('[data-brand-theme]').forEach(button => { delete button.dataset.active; button.setAttribute('aria-pressed', 'false'); });
  });
  accentInput?.addEventListener('input', scheduleRender);
  document.getElementById('brand-accent-hex')?.addEventListener('input', scheduleRender);
  document.addEventListener('click', event => {
    if (applying || !event.target.closest('#appbg-mode, #appbg-presets, #appbg-swap, [data-bg-direction]')) return;
    grid.querySelectorAll('[data-brand-theme]').forEach(button => { delete button.dataset.active; button.setAttribute('aria-pressed', 'false'); });
  });
  document.addEventListener('como:draft-restored', render);
  document.addEventListener('como:branding-changed', render);
  render();
  return { renderBrandingThemes: render };
}