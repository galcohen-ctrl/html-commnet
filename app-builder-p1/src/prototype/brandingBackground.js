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

const MAX_IMAGE_EDGE = 1280;

export function initBrandingBackground({ wireColorControl, markDirty, showToast }) {
  const start = document.getElementById('appbg-color1');
  const end = document.getElementById('appbg-color2');
  const strength = document.getElementById('appbg-opacity');
  const mode = document.getElementById('appbg-mode-value');
  const direction = document.getElementById('appbg-direction');
  const texture = document.getElementById('appbg-texture');
  const gradientControls = document.getElementById('appbg-gradient-controls');
  const imageData = document.getElementById('appbg-image-data');
  const imageAverage = document.getElementById('appbg-image-average');
  const imageName = document.getElementById('appbg-image-name');
  const imageBlock = document.getElementById('appbg-image-block');
  const imageZone = document.getElementById('appbg-image-zone');
  const imageFile = document.getElementById('appbg-image-file');
  const imageResult = document.getElementById('appbg-image-result');
  const imageThumb = document.getElementById('appbg-image-thumb');
  const imageFilename = document.getElementById('appbg-image-filename');
  if (!start || !end || !mode || !imageData) return;
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
    const imageMode = mode.value === 'image';
    const hasImage = imageMode && Boolean(imageData.value);
    // A photo sits over its own average colour, which is also what contrast is checked against.
    const flat = backgroundValue({ mode: 'solid', start: hasImage && imageAverage.value ? imageAverage.value : start.value });
    const background = imageMode
      ? (hasImage ? `url("${imageData.value}") center / cover no-repeat, ${flat}` : flat)
      : backgroundValue({ mode: mode.value, start: start.value, end: end.value, strength: strength.value, direction: direction.value }, smooth);
    document.body.style.setProperty('--p-bg', texture.checked && !imageMode ? `${grainImage()}, ${background}` : background);
    // The phone frame paints the photo once; the inner scroll area would otherwise repeat it with a seam.
    document.body.dataset.appbg = hasImage ? 'image' : 'colour';
    paintImageControls(imageMode);
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
    const presets = document.getElementById('appbg-presets');
    if (presets) presets.dataset.mode = mode.value;
    const label1 = document.getElementById('appbg-label1');
    if (label1) label1.textContent = mode.value === 'gradient' ? 'First colour' : 'App background';
    const strengthName = Number(strength.value) < 34 ? 'Light' : Number(strength.value) < 67 ? 'Balanced' : 'Rich';
    document.getElementById('appbg-opacity-val').textContent = strengthName;
    strength.setAttribute('aria-valuetext', strengthName);
  }

  function setColor(input, value) {
    input.value = value;
    input.parentElement.style.background = value;
    input.closest('.cp-color-row').querySelector('.cp-color-hex').value = value.toUpperCase();
  }

  // Photos take no tint, grain or presets, so those controls hide while Image is selected.
  function paintImageControls(imageMode) {
    if (!imageBlock) return;
    imageBlock.hidden = !imageMode;
    [document.getElementById('appbg-presets'), start.closest('.cp-color-row'), strength?.closest('.cp-slider-row'), texture?.closest('label')]
      .forEach((element) => { if (element) element.hidden = imageMode; });
    const hasImage = Boolean(imageData.value);
    imageZone.hidden = hasImage;
    imageResult.hidden = !hasImage;
    if (hasImage) imageThumb.src = imageData.value;
    imageFilename.textContent = imageName.value || 'Background image';
  }

  // Kept as a scaled-down JPEG so a phone-sized copy fits in the saved draft; also yields the average colour.
  async function prepareImage(file) {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const sample = document.createElement('canvas');
    sample.width = 16;
    sample.height = 16;
    const sampleContext = sample.getContext('2d');
    sampleContext.drawImage(canvas, 0, 0, 16, 16);
    const pixels = sampleContext.getImageData(0, 0, 16, 16).data;
    const total = [0, 0, 0];
    for (let offset = 0; offset < pixels.length; offset += 4) {
      total[0] += pixels[offset];
      total[1] += pixels[offset + 1];
      total[2] += pixels[offset + 2];
    }
    bitmap.close?.();
    return {
      dataUrl: canvas.toDataURL('image/jpeg', 0.82),
      average: '#' + total.map((sum) => Math.round(sum / 256).toString(16).padStart(2, '0')).join(''),
    };
  }

  async function useImageFile(file) {
    if (!file) return;
    if (!/^image\/(png|jpeg|jpg|webp)/i.test(file.type)) { showToast?.('Only png, jpg, or webp supported', { variant: 'error' }); return; }
    if (file.size > 5 * 1024 * 1024) { showToast?.('File too big — max 5MB', { variant: 'error' }); return; }
    try {
      const { dataUrl, average } = await prepareImage(file);
      imageData.value = dataUrl;
      imageAverage.value = average;
      imageName.value = file.name;
      mode.value = 'image';
      apply();
      markDirty();
      showToast?.('Background image added', { variant: 'success' });
    } catch {
      showToast?.('That image could not be read', { variant: 'error' });
    }
  }

  function removeImage() {
    imageData.value = '';
    imageAverage.value = '';
    imageName.value = '';
    apply();
    markDirty();
    showToast?.('Background image removed', { variant: 'success' });
  }

  if (imageZone && imageFile) {
    imageZone.addEventListener('click', () => imageFile.click());
    imageZone.addEventListener('dragover', (event) => { event.preventDefault(); imageZone.classList.add('drag-over'); });
    imageZone.addEventListener('dragleave', () => imageZone.classList.remove('drag-over'));
    imageZone.addEventListener('drop', (event) => {
      event.preventDefault();
      imageZone.classList.remove('drag-over');
      useImageFile(event.dataTransfer.files?.[0]);
    });
    imageFile.addEventListener('change', () => { useImageFile(imageFile.files?.[0]); imageFile.value = ''; });
    document.getElementById('appbg-image-replace')?.addEventListener('click', () => imageFile.click());
    document.getElementById('appbg-image-remove')?.addEventListener('click', removeImage);
  }
  // Moving and zooming the photo happens on the phone itself (imageAdjust.js), which hands back the framed result.
  document.getElementById('appbg-image-adjust')?.addEventListener('click', () => document.dispatchEvent(new CustomEvent('como:appbg-adjust-request')));
  document.addEventListener('como:appbg-adjusted', async (event) => {
    try {
      const { dataUrl, average } = await prepareImage(await (await fetch(event.detail.dataUrl)).blob());
      imageData.value = dataUrl;
      imageAverage.value = average;
      apply();
      markDirty();
    } catch {
      showToast?.('That image could not be read', { variant: 'error' });
    }
  });
  // Draft restore refills these hidden fields and fires "input" on each, so the background rebuilds from them.
  [imageData, imageAverage, imageName].forEach((input) => input.addEventListener('input', apply));

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
  // In solid mode a preset is a single colour, so it must not silently flip the
  // merchant into gradient mode behind the segmented control.
  document.querySelectorAll('[data-bg-start]').forEach((button) => button.addEventListener('click', () => {
    if (mode.value === 'gradient') {
      setColor(start, button.dataset.bgStart);
      setColor(end, button.dataset.bgEnd);
      direction.value = '135';
    } else {
      setColor(start, button.dataset.bgSolid || button.dataset.bgStart);
    }
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
}