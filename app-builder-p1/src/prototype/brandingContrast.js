// Text needs 4.5:1 (WCAG AA); the brand colour and icons are graphical UI and need 3:1 (SC 1.4.11).
export const TEXT_RATIO = 4.5;
export const UI_RATIO = 3;
export const DARK_INK = '#1d1d28';

function hexToRgb(hex) {
  const body = String(hex || '').trim().replace('#', '');
  return /^[0-9a-f]{6}$/i.test(body) ? [0, 2, 4].map((i) => parseInt(body.slice(i, i + 2), 16)) : null;
}

function luminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((c) => {
    const n = c / 255;
    return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// A colour we can't read counts as passing so it never raises a false warning.
export function ratio(a, b) {
  const first = luminance(a);
  const second = luminance(b);
  if (first === null || second === null) return 21;
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

export function hexToHsl(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s * 100, l * 100];
}

export function hslToHex(h, s, l) {
  const hue = ((h % 360) + 360) % 360;
  const sat = s / 100;
  const lig = l / 100;
  const k = (n) => (n + hue / 30) % 12;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n) => lig - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  const part = (n) => Math.round(f(n) * 255).toString(16).padStart(2, '0');
  return `#${part(0)}${part(8)}${part(4)}`;
}

// Moves a colour's lightness until it clears `minRatio` on every surface it sits on, keeping its hue.
export function nudgeColour(hex, surfaces, minRatio) {
  const hsl = hexToHsl(hex);
  if (!hsl) return hex;
  const [h, s] = hsl;
  let l = hsl[2];
  const lighten = surfaces.reduce((sum, surface) => sum + (luminance(surface) ?? 1), 0) / surfaces.length <= 0.5;
  const passes = (c) => surfaces.every((surface) => ratio(c, surface) >= minRatio);
  let candidate = hex;
  for (let step = 0; step < 32 && !passes(candidate); step += 1) {
    l = lighten ? Math.min(97, l + 3) : Math.max(3, l - 3);
    candidate = hslToHex(h, s, l);
  }
  return passes(candidate) ? candidate : (lighten ? '#ffffff' : '#000000');
}

const SURFACE_LABELS = { cards: 'cards', background: 'app background', background2: 'second background colour', bars: 'top and bottom bars' };

// Lightness each surface lands on when it is moved to a light or dark scheme (hue is kept, saturation capped).
const TARGETS = {
  light: { cards: [99, 20], background: [95, 40], background2: [91, 40], bars: [99, 20] },
  dark: { cards: [16, 30], background: [10, 40], background2: [14, 40], bars: [16, 30] },
};

const surfaceEntries = (p) => [
  ['cards', p.cards],
  ['background', p.backgrounds[0]],
  ...(p.backgrounds[1] ? [['background2', p.backgrounds[1]]] : []),
  ['bars', p.bars],
];

// Everything on the palette that misses its WCAG ratio. Primary text sits on cards and the background only.
export function problems(p) {
  const found = [];
  surfaceEntries(p).forEach(([surface, hex]) => {
    if (surface !== 'bars' && ratio(p.text, hex) < TEXT_RATIO) found.push({ kind: 'text', subject: 'text', surface });
    if (ratio(p.muted, hex) < TEXT_RATIO) found.push({ kind: 'text', subject: 'small text', surface });
    [['brand colour', p.accent], ['icons', p.icon]].forEach(([subject, colour]) => {
      if (ratio(colour, hex) < UI_RATIO) found.push({ kind: 'ui', subject, surface });
    });
  });
  return found;
}

function withReadableText(p) {
  const onCards = [p.cards, ...p.backgrounds];
  return { ...p, text: nudgeColour(p.text, onCards, TEXT_RATIO), muted: nudgeColour(p.muted, [...onCards, p.bars], TEXT_RATIO) };
}

// Moves every surface that is on the wrong side or clashes with the brand colour to a light or dark scheme.
function moveSurfaces(p, scheme) {
  const fixed = [p.accent, p.icon].filter(Boolean);
  const onScheme = (hex) => (scheme === 'light' ? (luminance(hex) ?? 1) >= 0.35 : (luminance(hex) ?? 0) <= 0.12);
  const move = (key, hex) => {
    if (onScheme(hex) && fixed.every((colour) => ratio(colour, hex) >= UI_RATIO)) return hex;
    const [lightness, maxSaturation] = TARGETS[scheme][key];
    const [h, s] = hexToHsl(hex) || [0, 0];
    return hslToHex(h, Math.min(s, maxSaturation), lightness);
  };
  return {
    ...p,
    cards: move('cards', p.cards),
    // A photo's average colour is not something a colour fix can move.
    backgrounds: p.backgroundIsImage ? p.backgrounds : p.backgrounds.map((hex, index) => move(index ? 'background2' : 'background', hex)),
    bars: move('bars', p.bars),
  };
}

// Brand colour and icons are the merchant's identity, so only surfaces and text move. Unreadable text counts double a
// weak brand colour; the lowest score wins and text-only (the smallest change) wins ties.
function solve(p) {
  const score = (palette) => problems(palette).reduce((sum, item) => sum + (item.kind === 'text' ? 2 : 1), 0);
  const entries = surfaceEntries(p);
  const meanLuminance = entries.reduce((sum, [, hex]) => sum + (luminance(hex) ?? 1), 0) / entries.length;
  const order = meanLuminance < 0.3 ? ['dark', 'light'] : ['light', 'dark'];
  const candidates = [withReadableText(p), ...order.map((scheme) => withReadableText(moveSurfaces(p, scheme)))];
  return candidates.reduce((best, candidate) => (score(candidate) < score(best) ? candidate : best));
}

const toHex = (r, g, b) => '#' + [r, g, b].map((n) => Math.max(0, Math.min(255, Number(n))).toString(16).padStart(2, '0')).join('');

// --p-bg is a flat colour, a tinted rgb(), or a gradient of two rgb() stops, so pull out every colour in it.
function coloursIn(value) {
  return [...String(value).matchAll(/#[0-9a-f]{6}\b|rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/gi)]
    .map((m) => (m[1] === undefined ? m[0].toLowerCase() : toHex(m[1], m[2], m[3])));
}

const unique = (items) => [...new Set(items)];
const join = (items) => (items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}` : items[0]);

function describe(found, changed, complete) {
  const subjects = unique(found.map((item) => item.subject));
  const keepsBrand = found.some((item) => item.kind === 'ui');
  const sentences = [`Your ${join(subjects)} may be hard to see.`];
  if (changed.length) sentences.push(`We can adjust your ${join(changed)} to ${complete ? 'fix it' : 'improve it'}${complete && keepsBrand ? ' and keep your brand colour as it is' : ''}.`);
  return sentences.join(' ');
}

function fitColour(hex, constraints) {
  const hsl = hexToHsl(hex);
  if (!hsl) return null;
  const [hue, saturation, lightness] = hsl;
  const candidates = Array.from({ length: 95 }, (_, index) => index + 3)
    .map(light => ({ light, colour: hslToHex(hue, saturation, light) }))
    .sort((a, b) => Math.abs(a.light - lightness) - Math.abs(b.light - lightness));
  return candidates.find(({ colour }) => constraints.every(([other, minimum]) => ratio(other, colour) >= minimum))?.colour || null;
}

function fitSurface(hex, palette) {
  const foregrounds = [
    [palette.text, TEXT_RATIO],
    [palette.muted, TEXT_RATIO],
    [palette.accent, UI_RATIO],
    [palette.icon, UI_RATIO],
  ].filter(([colour]) => colour);
  return fitColour(hex, foregrounds);
}

export function initBrandingContrast() {
  const bgStart = document.getElementById('appbg-color1');
  const bgEnd = document.getElementById('appbg-color2');
  const bgStrength = document.getElementById('appbg-opacity');
  const callout = document.getElementById('branding-contrast-callout');
  const summary = document.getElementById('px-contrast-result');
  if (!bgStart || !bgEnd || !bgStrength) return;

  const readVar = (name) => getComputedStyle(document.body).getPropertyValue(name).trim();
  const readHex = (name) => (/^#[0-9a-f]{6}$/i.test(readVar(name)) ? readVar(name).toLowerCase() : null);
  const colourInput = (name) => document.querySelector(`input[type="color"][data-bind-color="${name}"]`);

  function fieldControl(key) {
    if (key === 'background1') return bgStart;
    if (key === 'background2') return bgEnd;
    if (key === '--p-accent') return document.getElementById('gf-accent-custom');
    return colourInput(key);
  }

  function readPalette() {
    const backgrounds = coloursIn(readVar('--p-bg'));
    return {
      cards: readHex('--p-panel') || '#ffffff',
      backgrounds: backgrounds.length ? unique([backgrounds[0], backgrounds[backgrounds.length - 1]]) : ['#f2f2f7'],
      bars: readHex('--p-nav-bg') || '#ffffff',
      // With a background photo, --p-bg's only colour is the photo's average, which stands in for it.
      backgroundIsImage: document.body.dataset.appbg === 'image',
      text: readHex('--p-text'),
      muted: readHex('--p-text-muted'),
      accent: readHex('--p-accent'),
      // --p-icon is unset until the merchant picks one, and icons then inherit a checked colour.
      icon: readHex('--p-icon'),
    };
  }

  // Dispatching "input" reuses each control's own wiring: swatch, hex field, CSS variable, draft state.
  function setInput(input, hex) {
    if (!input || input.value === hex) return;
    input.value = hex;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // A fix replaces the colour outright, so any "colour strength" tint is reset to keep the checked colour exact.
  function setBackgrounds(hexes) {
    if (bgStrength.value !== '100') {
      bgStrength.value = '100';
      bgStrength.dispatchEvent(new Event('input', { bubbles: true }));
    }
    setInput(bgStart, hexes[0]);
    if (hexes[1]) setInput(bgEnd, hexes[1]);
  }

  function apply(current, fixed) {
    setInput(colourInput('--p-panel'), fixed.cards);
    setInput(colourInput('--p-nav-bg'), fixed.bars);
    if (fixed.text) setInput(colourInput('--p-text'), fixed.text);
    if (fixed.muted) setInput(colourInput('--p-text-muted'), fixed.muted);
    if (fixed.backgrounds.some((hex, index) => hex !== current.backgrounds[index])) setBackgrounds(fixed.backgrounds);
  }

  function replacementForField(key, current) {
    if (key === '--p-text') return fitColour(current.text, [current.cards, ...current.backgrounds].map(surface => [surface, TEXT_RATIO]));
    if (key === '--p-text-muted') return fitColour(current.muted, [current.cards, ...current.backgrounds, current.bars].map(surface => [surface, TEXT_RATIO]));
    if (key === '--p-accent') return fitColour(current.accent, [current.cards, ...current.backgrounds, current.bars].map(surface => [surface, UI_RATIO]));
    if (key === '--p-icon') return fitColour(current.icon, [current.cards, ...current.backgrounds, current.bars].map(surface => [surface, UI_RATIO]));
    if (key === '--p-panel') return fitSurface(current.cards, current);
    if (key === '--p-nav-bg') return fitSurface(current.bars, current);
    if (key === 'background2') return current.backgrounds[1] ? fitSurface(current.backgrounds[1], current) : null;
    if (key === 'background1') return fitSurface(current.backgrounds[0], current);
    return null;
  }

  function fixField(key) {
    const current = readPalette();
    const control = fieldControl(key);
    if (!control) return;
    const replacement = replacementForField(key, current);
    if (!replacement) return;
    if (key.startsWith('background')) {
      const backgrounds = [...current.backgrounds];
      backgrounds[key === 'background2' ? 1 : 0] = replacement;
      setBackgrounds(backgrounds);
    } else {
      setInput(control, replacement);
    }
    check();
  }

  function renderFieldIssues(current, found) {
    const issues = new Map();
    const surfaceKey = { cards: '--p-panel', bars: '--p-nav-bg', background: 'background1', background2: 'background2' };
    const subjectKey = { text: '--p-text', 'small text': '--p-text-muted', 'brand colour': '--p-accent', icons: '--p-icon' };
    found.forEach(({ subject, surface }) => {
      const keys = [subjectKey[subject], surfaceKey[surface]].filter(Boolean);
      keys.forEach(key => {
        if (!issues.has(key)) issues.set(key, new Set());
        issues.get(key).add(surface === 'background2' ? 'second background colour' : surface);
      });
    });
    const rowByKey = (key) => {
      const input = fieldControl(key);
      if (!input) return null;
      if (key === '--p-accent') return input.closest('.brand-accent-row');
      if (key.startsWith('background')) return current.backgroundIsImage
        ? document.getElementById('appbg-image-block')
        : input.closest('.cp-color-row');
      return input.closest('.cp-color-row');
    };
    document.querySelectorAll('.branding-inline-contrast').forEach(node => node.remove());
    document.querySelectorAll('.has-inline-contrast').forEach(row => row.classList.remove('has-inline-contrast'));
    issues.forEach((surfaces, key) => {
      const row = rowByKey(key);
      if (!row) return;
      row.classList.add('has-inline-contrast');
      const notice = document.createElement('div');
      notice.className = 'branding-inline-contrast';
      const message = document.createElement('span');
      message.textContent = `Low contrast with ${join([...surfaces])}.`;
      notice.append(message);
      const replacement = current.backgroundIsImage && key.startsWith('background') ? null : replacementForField(key, current);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'branding-contrast-fix';
      button.textContent = 'Fix it for me';
      button.addEventListener('click', () => {
        if (replacement) fixField(key);
        else { apply(current, solve(current)); check(); }
      });
      notice.append(button);
      if (!replacement) {
        const hint = document.createElement('span');
        hint.className = 'branding-inline-hint';
        hint.textContent = current.backgroundIsImage && key.startsWith('background')
          ? 'We will adjust the other colours. For a full fix, try a different image or a solid background.'
          : 'This fix may adjust more than one colour to resolve the conflict.';
        notice.append(hint);
      }
      row.append(notice);
    });
  }

  function changedLabels(current, fixed) {
    const changed = [];
    if (fixed.backgrounds[0] !== current.backgrounds[0]) changed.push(SURFACE_LABELS.background);
    if (fixed.backgrounds[1] && fixed.backgrounds[1] !== current.backgrounds[1]) changed.push(SURFACE_LABELS.background2);
    if (fixed.cards !== current.cards) changed.push(SURFACE_LABELS.cards);
    if (fixed.bars !== current.bars) changed.push(SURFACE_LABELS.bars);
    if (fixed.text !== current.text) changed.push('text');
    if (fixed.muted !== current.muted) changed.push('small text');
    return changed;
  }

  // Buttons and badges painted with the brand colour use whichever of white or dark text is more readable on it.
  function updateAccentInk() {
    const accent = readHex('--p-accent');
    if (!accent) return;
    const ink = ratio(accent, '#ffffff') >= ratio(accent, DARK_INK) ? '#ffffff' : DARK_INK;
    if (document.body.style.getPropertyValue('--p-accent-ink') !== ink) document.body.style.setProperty('--p-accent-ink', ink);
  }

  function check() {
    const current = readPalette();
    const found = problems(current);
    renderFieldIssues(current, found);
    document.body.dataset.brandingSafe = String(!found.length);
    if (summary) {
      summary.hidden = found.length > 0;
      summary.className = 'px-contrast-result safe';
      summary.innerHTML = '<strong>Colours are easy to read</strong>';
    }
    if (!callout) return;
    callout.hidden = !found.length;
    callout.replaceChildren();
    if (!found.length) return;
    const fixed = solve(current);
    const changed = changedLabels(current, fixed);
    const complete = !problems(fixed).length;
    const message = document.createElement('span');
    message.className = 'branding-contrast-message';
    message.textContent = describe(found, changed, complete)
      + (!complete && current.backgroundIsImage ? ' Try a different background image or a solid colour.' : '');
    callout.append(message);
    if (!changed.length) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'branding-contrast-fix';
    button.textContent = 'Fix it for me';
    button.addEventListener('click', () => { apply(current, fixed); check(); });
    callout.append(button);
  }

  // Every colour change lands on body.style (or swaps a theme class), so one observer covers pickers, hex fields, presets and draft restore.
  let timer = null;
  const schedule = () => { clearTimeout(timer); timer = setTimeout(check, 120); };
  new MutationObserver(() => { updateAccentInk(); schedule(); }).observe(document.body, { attributes: true, attributeFilter: ['style', 'class'] });
  document.addEventListener('como:draft-restored', () => { updateAccentInk(); schedule(); });
  updateAccentInk();
  check();
}
