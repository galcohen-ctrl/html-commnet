export function backgroundValue({ mode, start, end, strength = 100, direction = 135 }, smooth = true) {
  const amount = Math.max(0, Math.min(100, Number(strength) || 0));
  const color = (hex) => {
    const channels = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
    const tinted = channels.map((channel) => Math.round(255 + (channel - 255) * amount / 100));
    return `rgb(${tinted.join(', ')})`;
  };
  if (mode !== 'gradient') return color(start);
  const angle = [45, 90, 135, 180].includes(Number(direction)) ? Number(direction) : 135;
  return `linear-gradient(${angle}deg${smooth ? ' in oklch shorter hue' : ''}, ${color(start)}, ${color(end)})`;
}

export function initBrandingBackground({ wireColorControl, markDirty }) {
  const start = document.getElementById('appbg-color1');
  const end = document.getElementById('appbg-color2');
  const strength = document.getElementById('appbg-opacity');
  const mode = document.getElementById('appbg-mode-value');
  const direction = document.getElementById('appbg-direction');
  const texture = document.getElementById('appbg-texture');
  const gradientControls = document.getElementById('appbg-gradient-controls');
  if (!start || !end || !mode) return;
  const smooth = CSS.supports('background-image', 'linear-gradient(135deg in oklch, red, blue)');
  let grain;

  function grainImage() {
    if (grain) return grain;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const context = canvas.getContext('2d');
    const image = context.createImageData(64, 64);
    let seed = 2166136261;
    for (let offset = 0; offset < image.data.length; offset += 4) {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      const shade = seed & 255;
      image.data.set([shade, shade, shade, 10], offset);
    }
    context.putImageData(image, 0, 0);
    grain = `url("${canvas.toDataURL()}")`;
    return grain;
  }

  function apply() {
    const background = backgroundValue({ mode: mode.value, start: start.value, end: end.value, strength: strength.value, direction: direction.value }, smooth);
    document.body.style.setProperty('--p-bg', texture.checked ? `${grainImage()}, ${background}` : background);
    document.querySelectorAll('#appbg-mode [data-mode]').forEach((button) => {
      const active = button.dataset.mode === mode.value;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('[data-bg-direction]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.bgDirection === direction.value));
    });
    gradientControls.hidden = mode.value !== 'gradient';
    document.getElementById('appbg-row2').hidden = mode.value !== 'gradient';
    const strengthName = Number(strength.value) < 34 ? 'Light' : Number(strength.value) < 67 ? 'Balanced' : 'Rich';
    document.getElementById('appbg-opacity-val').textContent = strengthName;
    strength.setAttribute('aria-valuetext', strengthName);
    document.getElementById('brand-background-sample').style.background = document.body.style.getPropertyValue('--p-bg');
  }

  function setColor(input, value) {
    input.value = value;
    input.parentElement.style.background = value;
    input.closest('.cp-color-row').querySelector('.cp-color-hex').value = value.toUpperCase();
  }

  wireColorControl(start, apply);
  wireColorControl(end, apply);
  [strength, mode, direction, texture].forEach((input) => input.addEventListener('input', () => { apply(); markDirty(); }));
  document.querySelectorAll('#appbg-mode [data-mode]').forEach((button) => button.addEventListener('click', () => {
    mode.value = button.dataset.mode;
    apply();
    markDirty();
  }));
  document.querySelectorAll('[data-bg-direction]').forEach((button) => button.addEventListener('click', () => {
    direction.value = button.dataset.bgDirection;
    apply();
    markDirty();
  }));
  document.querySelectorAll('[data-bg-start]').forEach((button) => button.addEventListener('click', () => {
    setColor(start, button.dataset.bgStart);
    setColor(end, button.dataset.bgEnd);
    mode.value = 'gradient';
    direction.value = '135';
    strength.value = '100';
    apply();
    markDirty();
  }));
  document.getElementById('appbg-swap')?.addEventListener('click', () => {
    const previous = start.value;
    setColor(start, end.value);
    setColor(end, previous);
    apply();
    markDirty();
  });

  const shapeNames = ['Square', 'Soft', 'Round'];
  [['card', [0, 12, 24]], ['button', [2, 10, 999]]].forEach(([kind, values]) => {
    const input = document.getElementById(`brand-${kind}-shape`);
    if (!input) return;
    const paint = () => {
      const index = Math.max(0, Math.min(2, Number(input.value)));
      document.body.style.setProperty(`--p-${kind}-radius`, `${values[index]}px`);
      input.setAttribute('aria-valuetext', shapeNames[index]);
      document.getElementById(`brand-${kind}-shape-value`).textContent = shapeNames[index];
    };
    input.addEventListener('input', () => { paint(); markDirty(); });
    paint();
  });
  document.getElementById('brand-background-sample').style.background = getComputedStyle(document.body).getPropertyValue('--p-bg');
}