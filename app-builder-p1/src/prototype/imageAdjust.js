/**
 * Image adjust — press and hold any uploaded image in the phone preview to
 * reposition, zoom, rotate and crop it directly on the real frame.
 *
 * Works by delegation so it survives the preview re-rendering: a session
 * injects a temporary <img> over the target, and on Done/Apply it rasterizes
 * the visible frame to a data URL and writes it back as the background image.
 * That keeps every existing uploader and renderer unchanged.
 */

const HOLD_MS = 850;
const RING_CIRCUMFERENCE = 157.1;

// Every element in the preview that displays a merchant-uploaded image.
const TARGET_SELECTOR = [
  '.pc-card-img.has-upload',
  '.rw-img',
  '.hb-img',
  '.app-top-header .brand-mark.has-logo',
  '.rw-block-banner',
].join(', ');

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function backgroundUrlOf(element) {
  const value = getComputedStyle(element).backgroundImage;
  const match = /url\(["']?(.*?)["']?\)/.exec(value || '');
  return match ? match[1] : '';
}

export function initImageAdjust(ctx) {
  const { markDirty, showToast } = ctx;
  const shell = document.getElementById('app-shell');
  if (!shell) return {};

  let session = null;
  let coachShown = false;

  /* ------------------------------------------------------------- overlays */

  function buildToolbar() {
    const panel = document.createElement('div');
    panel.className = 'ia-tools';
    panel.innerHTML = `
      <div class="ia-adjust-controls">
        <h4>Adjust image</h4>
        <p>Fit it exactly how members will see it.</p>
        <label class="ia-slider">Zoom <span data-ia-zoom-value>100%</span>
          <input type="range" data-ia-zoom min="50" max="400" value="100" />
        </label>
        <label class="ia-slider">Rotate <span data-ia-rot-value>0°</span>
          <input type="range" data-ia-rot min="-180" max="180" value="0" />
        </label>
        <div class="ia-btns">
          <button class="ia-btn" type="button" data-ia-undo disabled>Undo</button>
          <button class="ia-btn" type="button" data-ia-redo disabled>Redo</button>
          <button class="ia-btn ia-wide" type="button" data-ia-reset>Reset to fit</button>
          <button class="ia-btn ia-wide ia-primary" type="button" data-ia-done>Done</button>
        </div>
      </div>
      <div class="ia-crop-controls">
        <h4>Crop</h4>
        <p>Pull the edges or corners inward. The view zooms in so you can fine-tune, then apply.</p>
        <div class="ia-btns">
          <button class="ia-btn" type="button" data-ia-crop-cancel>Cancel</button>
          <button class="ia-btn ia-primary" type="button" data-ia-crop-apply>Apply</button>
        </div>
      </div>`;
    document.body.appendChild(panel);
    return panel;
  }

  function positionToolbar(panel, target) {
    const rect = target.getBoundingClientRect();
    const width = panel.offsetWidth || 200;
    const height = panel.offsetHeight || 220;
    const phone = document.getElementById('device-frame') || target.closest('.phone-shell') || target;
    const phoneRect = phone.getBoundingClientRect();
    let left = phoneRect.right + 16;
    if (left + width > window.innerWidth - 12) left = Math.max(12, phoneRect.left - width - 16);
    let top = rect.top + rect.height / 2 - height / 2;
    top = clamp(top, 12, window.innerHeight - height - 12);
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  }

  function showCoach(target) {
    if (coachShown) return;
    coachShown = true;
    const rect = target.getBoundingClientRect();
    const coach = document.createElement('div');
    coach.className = 'ia-coach';
    coach.innerHTML = `
      <span class="ia-coach-dot"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg></span>
      <strong>Adjust it right here</strong>
      <small>Tap and hold the image for a moment to move, zoom, rotate and crop it on the preview.</small>
      <button type="button">Got it</button>`;
    document.body.appendChild(coach);
    const width = coach.offsetWidth || 216;
    let left = rect.left - width - 18;
    if (left < 12) left = rect.right + 18;
    coach.style.left = `${left}px`;
    coach.style.top = `${clamp(rect.top - 6, 12, window.innerHeight - 190)}px`;
    requestAnimationFrame(() => coach.classList.add('is-open'));
    const close = () => coach.remove();
    coach.querySelector('button').addEventListener('click', close);
    setTimeout(close, 12000);
  }

  /* -------------------------------------------------------------- session */

  function open(target) {
    if (session) return;
    const src = backgroundUrlOf(target);
    if (!src) return;

    const layer = document.createElement('img');
    layer.className = 'ia-layer';
    layer.src = src;

    const cropBox = document.createElement('div');
    cropBox.className = 'ia-cropbox';
    cropBox.innerHTML = `<span class="ia-grid"></span>
      <i class="ia-h ia-corner ia-nw" data-h="nw"></i><i class="ia-h ia-edge ia-n" data-h="n"></i><i class="ia-h ia-corner ia-ne" data-h="ne"></i>
      <i class="ia-h ia-edge ia-w" data-h="w"></i><i class="ia-h ia-edge ia-e" data-h="e"></i>
      <i class="ia-h ia-corner ia-sw" data-h="sw"></i><i class="ia-h ia-edge ia-s" data-h="s"></i><i class="ia-h ia-corner ia-se" data-h="se"></i>`;

    const cropBtn = document.createElement('button');
    cropBtn.type = 'button';
    cropBtn.className = 'ia-crop-fab';
    cropBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4L8.12 15.88"/><path d="M14.47 14.48L20 20"/><path d="M8.12 8.12L12 12"/></svg><span>Crop</span>`;

    target.classList.add('ia-active');
    target.append(layer, cropBox, cropBtn);

    const panel = buildToolbar();
    session = {
      target, layer, cropBox, cropBtn, panel, src,
      state: { x: 0, y: 0, scale: 1, rot: 0, src },
      history: [], index: -1, cropping: false, crop: null, fitTimer: null,
    };
    commit();
    render();
    // The logo sits in a tiny header slot; magnify the whole preview so it is
    // comfortable to reposition and crop. close() resets it.
    if (target.classList.contains('brand-mark')) {
      document.body.classList.add('ia-logo-zoom');
      session.isLogo = true;
    }
    positionToolbar(panel, target);
    if (session.isLogo) setTimeout(() => { if (session) positionToolbar(session.panel, session.target); }, 340);
    wireSession();
  }

  function close() {
    if (!session) return;
    clearTimeout(session.fitTimer);
    session.layer.remove();
    session.cropBox.remove();
    session.cropBtn.remove();
    session.panel.remove();
    session.target.classList.remove('ia-active', 'ia-cropping');
    document.body.classList.remove('ia-logo-zoom');
    session = null;
  }

  function render() {
    if (!session) return;
    const { state, layer, panel } = session;
    if (layer.getAttribute('src') !== state.src) layer.src = state.src;
    layer.style.transform = `translate(calc(-50% + ${state.x}px), calc(-50% + ${state.y}px)) scale(${state.scale}) rotate(${state.rot}deg)`;
    panel.querySelector('[data-ia-zoom]').value = Math.round(state.scale * 100);
    panel.querySelector('[data-ia-rot]').value = Math.round(state.rot);
    panel.querySelector('[data-ia-zoom-value]').textContent = `${Math.round(state.scale * 100)}%`;
    panel.querySelector('[data-ia-rot-value]').textContent = `${Math.round(state.rot)}°`;
  }

  function commit() {
    if (!session) return;
    const { state } = session;
    session.history = session.history.slice(0, session.index + 1);
    const last = session.history[session.index];
    if (last && last.x === state.x && last.y === state.y && last.scale === state.scale
      && last.rot === state.rot && last.src === state.src) return;
    session.history.push({ ...state });
    session.index = session.history.length - 1;
    syncHistoryButtons();
  }

  function syncHistoryButtons() {
    if (!session) return;
    session.panel.querySelector('[data-ia-undo]').disabled = session.index <= 0;
    session.panel.querySelector('[data-ia-redo]').disabled = session.index >= session.history.length - 1;
  }

  /* ------------------------------------------------------------ rasterize */

  function rasterize(region) {
    const { target, layer, state } = session;
    const width = region ? region.x2 - region.x1 : target.clientWidth;
    const height = region ? region.y2 - region.y1 : target.clientHeight;
    const offsetX = region ? region.x1 : 0;
    const offsetY = region ? region.y1 : 0;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    const context = canvas.getContext('2d');
    context.scale(ratio, ratio);
    context.translate(-offsetX, -offsetY);
    context.translate(target.clientWidth / 2 + state.x, target.clientHeight / 2 + state.y);
    context.scale(state.scale, state.scale);
    context.rotate((state.rot * Math.PI) / 180);
    const naturalW = layer.naturalWidth || target.clientWidth;
    const naturalH = layer.naturalHeight || target.clientHeight;
    const cover = Math.max(target.clientWidth / naturalW, target.clientHeight / naturalH);
    const drawW = naturalW * cover;
    const drawH = naturalH * cover;
    context.drawImage(layer, -drawW / 2, -drawH / 2, drawW, drawH);
    try {
      return canvas.toDataURL('image/png');
    } catch {
      return null;
    }
  }

  function finish() {
    if (!session) return;
    const baked = rasterize(null);
    const { target } = session;
    if (baked) {
      target.style.backgroundImage = `url(${baked})`;
      target.style.backgroundSize = 'cover';
      target.style.backgroundPosition = 'center';
      markDirty?.();
      showToast?.('Image updated');
    }
    close();
  }

  /* ----------------------------------------------------------------- crop */

  function layoutCrop() {
    const { crop, cropBox } = session;
    cropBox.style.left = `${crop.x1}px`;
    cropBox.style.top = `${crop.y1}px`;
    cropBox.style.width = `${crop.x2 - crop.x1}px`;
    cropBox.style.height = `${crop.y2 - crop.y1}px`;
  }

  function enterCrop() {
    session.cropping = true;
    session.target.classList.add('ia-cropping');
    session.panel.classList.add('is-cropping');
    session.crop = { x1: 0, y1: 0, x2: session.target.clientWidth, y2: session.target.clientHeight };
    layoutCrop();
  }

  function cancelCrop() {
    clearTimeout(session.fitTimer);
    session.cropping = false;
    session.target.classList.remove('ia-cropping', 'ia-animating');
    session.panel.classList.remove('is-cropping');
  }

  // Once the merchant stops adjusting, zoom the kept region up to the frame.
  function cropFit() {
    if (!session?.cropping) return;
    const { target, state, crop } = session;
    const width = target.clientWidth;
    const height = target.clientHeight;
    const cropW = crop.x2 - crop.x1;
    const cropH = crop.y2 - crop.y1;
    const k = Math.min(width / cropW, height / cropH);
    if (k <= 1.01) return;
    const dx = (crop.x1 + crop.x2) / 2 - width / 2;
    const dy = (crop.y1 + crop.y2) / 2 - height / 2;
    state.x = (state.x - dx) * k;
    state.y = (state.y - dy) * k;
    state.scale = clamp(state.scale * k, 0.5, 20);
    const newW = cropW * k;
    const newH = cropH * k;
    session.crop = {
      x1: (width - newW) / 2, y1: (height - newH) / 2,
      x2: (width + newW) / 2, y2: (height + newH) / 2,
    };
    target.classList.add('ia-animating');
    render();
    layoutCrop();
    setTimeout(() => session?.target.classList.remove('ia-animating'), 340);
  }

  function applyCrop() {
    const cropped = rasterize(session.crop);
    if (cropped) {
      session.state = { x: 0, y: 0, scale: 1, rot: 0, src: cropped };
      render();
      commit();
    }
    cancelCrop();
  }

  /* -------------------------------------------------------------- wiring */

  function wireSession() {
    const { target, panel, cropBox, cropBtn } = session;

    cropBtn.addEventListener('pointerdown', (event) => event.stopPropagation());
    cropBtn.addEventListener('click', enterCrop);
    panel.querySelector('[data-ia-crop-cancel]').addEventListener('click', cancelCrop);
    panel.querySelector('[data-ia-crop-apply]').addEventListener('click', applyCrop);
    panel.querySelector('[data-ia-done]').addEventListener('click', finish);
    panel.querySelector('[data-ia-reset]').addEventListener('click', () => {
      session.state = { ...session.state, x: 0, y: 0, scale: 1, rot: 0 };
      render();
      commit();
    });
    panel.querySelector('[data-ia-undo]').addEventListener('click', () => {
      if (session.index <= 0) return;
      session.index -= 1;
      session.state = { ...session.history[session.index] };
      render();
      syncHistoryButtons();
    });
    panel.querySelector('[data-ia-redo]').addEventListener('click', () => {
      if (session.index >= session.history.length - 1) return;
      session.index += 1;
      session.state = { ...session.history[session.index] };
      render();
      syncHistoryButtons();
    });

    const zoom = panel.querySelector('[data-ia-zoom]');
    zoom.addEventListener('input', () => { session.state.scale = Number(zoom.value) / 100; render(); });
    zoom.addEventListener('change', commit);
    const rotate = panel.querySelector('[data-ia-rot]');
    rotate.addEventListener('input', () => { session.state.rot = Number(rotate.value); render(); });
    rotate.addEventListener('change', commit);

    let panning = false;
    let startX = 0;
    let startY = 0;
    let originX = 0;
    let originY = 0;
    target.addEventListener('pointerdown', (event) => {
      if (session.cropping || event.target.closest('.ia-crop-fab')) return;
      panning = true;
      startX = event.clientX;
      startY = event.clientY;
      originX = session.state.x;
      originY = session.state.y;
      session._panScale = target.getBoundingClientRect().width / (target.clientWidth || 1);
      target.setPointerCapture(event.pointerId);
    });
    target.addEventListener('pointermove', (event) => {
      if (!panning) return;
      const s = session._panScale || 1;
      session.state.x = originX + (event.clientX - startX) / s;
      session.state.y = originY + (event.clientY - startY) / s;
      render();
    });
    target.addEventListener('pointerup', () => { if (panning) { panning = false; commit(); } });

    let wheelTimer = null;
    target.addEventListener('wheel', (event) => {
      if (session.cropping) return;
      event.preventDefault();
      if (event.shiftKey) {
        session.state.rot = clamp(session.state.rot + (event.deltaY > 0 ? -4 : 4), -180, 180);
      } else {
        const direction = event.deltaY > 0 ? -1 : 1;
        session.state.scale = clamp(session.state.scale * (1 + direction * 0.045), 0.5, 4);
      }
      render();
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(commit, 220);
    }, { passive: false });

    let drag = null;
    cropBox.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
      clearTimeout(session.fitTimer);
      drag = { handle: event.target.dataset.h || 'move', mx: event.clientX, my: event.clientY, sScale: target.getBoundingClientRect().width / (target.clientWidth || 1), ...session.crop };
      cropBox.setPointerCapture(event.pointerId);
    });
    cropBox.addEventListener('pointermove', (event) => {
      if (!drag) return;
      const width = target.clientWidth;
      const height = target.clientHeight;
      const s = drag.sScale || 1;
      const dx = (event.clientX - drag.mx) / s;
      const dy = (event.clientY - drag.my) / s;
      let { x1, y1, x2, y2 } = drag;
      const MIN = 36;
      if (drag.handle === 'move') {
        const w = x2 - x1;
        const h = y2 - y1;
        x1 = clamp(x1 + dx, 0, width - w);
        y1 = clamp(y1 + dy, 0, height - h);
        x2 = x1 + w;
        y2 = y1 + h;
      } else {
        if (drag.handle.includes('w')) x1 = clamp(x1 + dx, 0, x2 - MIN);
        if (drag.handle.includes('n')) y1 = clamp(y1 + dy, 0, y2 - MIN);
        if (drag.handle.includes('e')) x2 = clamp(x2 + dx, x1 + MIN, width);
        if (drag.handle.includes('s')) y2 = clamp(y2 + dy, y1 + MIN, height);
      }
      session.crop = { x1, y1, x2, y2 };
      layoutCrop();
    });
    cropBox.addEventListener('pointerup', () => {
      if (!drag) return;
      drag = null;
      clearTimeout(session.fitTimer);
      session.fitTimer = setTimeout(cropFit, 500);
    });
  }

  /* ------------------------------------------------- press and hold entry */

  let ring = null;
  let holdFrame = null;
  let holding = false;

  function stopHold() {
    holding = false;
    cancelAnimationFrame(holdFrame);
    ring?.remove();
    ring = null;
  }

  shell.addEventListener('pointerdown', (event) => {
    if (session) return;
    const target = event.target.closest(TARGET_SELECTOR);
    if (!target || !backgroundUrlOf(target)) return;
    holding = true;
    const rect = target.getBoundingClientRect();
    ring = document.createElement('div');
    ring.className = 'ia-ring';
    ring.innerHTML = `<svg width="60" height="60" viewBox="0 0 60 60">
        <circle class="ia-ring-disc" cx="30" cy="30" r="21"/>
        <circle class="ia-ring-track" cx="30" cy="30" r="25" fill="none" stroke-width="4"/>
        <circle class="ia-ring-fill" cx="30" cy="30" r="25" fill="none" stroke-width="4" stroke-dasharray="${RING_CIRCUMFERENCE}" stroke-dashoffset="${RING_CIRCUMFERENCE}"/>
      </svg>
      <span class="ia-ring-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg></span>`;
    ring.style.left = `${event.clientX - 30}px`;
    ring.style.top = `${event.clientY - 30}px`;
    document.body.appendChild(ring);
    const fill = ring.querySelector('.ia-ring-fill');
    const started = performance.now();
    const step = (now) => {
      if (!holding) return;
      const progress = Math.min((now - started) / HOLD_MS, 1);
      fill.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - progress));
      if (progress >= 1) {
        stopHold();
        open(target);
        return;
      }
      holdFrame = requestAnimationFrame(step);
    };
    holdFrame = requestAnimationFrame(step);
    // Guard against the rect going stale if the layout shifts mid-hold.
    void rect;
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((type) => {
    shell.addEventListener(type, () => { if (holding) stopHold(); });
  });
  shell.addEventListener('pointermove', () => { if (holding && !session) stopHold(); });

  window.addEventListener('keydown', (event) => {
    if (!session) return;
    if (event.key === 'Escape') {
      if (session.cropping) cancelCrop();
      else close();
    }
    if (event.key === 'Enter' && session.cropping) applyCrop();
  });

  // First uploaded image in a session gets a one-step pointer to the feature.
  const observer = new MutationObserver((records) => {
    if (coachShown) return;
    records.forEach((record) => {
      const element = record.target;
      if (!(element instanceof HTMLElement) || !element.matches?.(TARGET_SELECTOR)) return;
      if (backgroundUrlOf(element)) showCoach(element);
    });
  });
  observer.observe(shell, { attributes: true, attributeFilter: ['style', 'class'], subtree: true });

  return { openImageAdjust: open, closeImageAdjust: close };
}
