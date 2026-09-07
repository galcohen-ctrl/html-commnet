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

// Every element in the preview that displays a merchant-uploaded image. The
// native ordering widgets are deliberately absent: their imagery arrives from
// the integration (Deliverect and friends), so there is nothing here to adjust.
const TARGET_SELECTOR = [
  '.pc-card-img.has-upload',
  '.rw-img',
  '.hb-img',
  '.app-top-header .brand-mark.has-logo',
  '.rw-block-banner',
  '.reels-image',
].join(', ');

/* ------------------------------------------------------------------ zoom
   A logo sits at ~56px in the preview; a promo card is ~290px wide. One fixed
   magnification cannot serve both, so work out what THIS element needs and let
   small slots zoom hard while large ones barely move.

   Four things decide it:
     · the browser viewport   — never zoom past what the window can show
     · the preview column     — the real work area, narrower than the window
     · the element's own box  — the smaller the slot, the more zoom it needs
     · how the image fills it — a shape mismatch leaves more hidden image to
                                drag through, which wants a little extra room
*/
const ZOOM_FILL = 0.46;   // share of the work area the frame should occupy
const ZOOM_MIN = 1.08;    // under this the movement costs more than it gives
const ZOOM_MAX = 4.6;     // ceiling, so the preview never turns to mush
const ZOOM_PAD = 28;      // breathing room kept inside the work area

// The crop control perches above the frame's top-right corner, set in from the
// edge so a gap shows — a bird sitting on a power line, not on the corner.
const FAB_GAP = 7;
const FAB_INSET = 14;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// The usable canvas: the preview column, clipped to whatever the window shows.
function workArea() {
  const area = document.getElementById('preview-area');
  const rect = area?.getBoundingClientRect();
  const left = Math.max(0, rect ? rect.left : 0);
  const top = Math.max(0, rect ? rect.top : 0);
  const right = Math.min(window.innerWidth, rect ? rect.right : window.innerWidth);
  const bottom = Math.min(window.innerHeight, rect ? rect.bottom : window.innerHeight);
  return {
    cx: (left + right) / 2,
    cy: (top + bottom) / 2,
    width: Math.max(160, right - left - ZOOM_PAD * 2),
    height: Math.max(160, bottom - top - ZOOM_PAD * 2),
  };
}

function backgroundUrlOf(element) {
  const value = getComputedStyle(element).backgroundImage;
  const match = /url\(["']?(.*?)["']?\)/.exec(value || '');
  return match ? match[1] : '';
}

export function initImageAdjust(ctx) {
  const { markDirty, showToast } = ctx;
  // The screen, not the page stack: full-screen overlays such as Menu Reels sit
  // beside #app-shell, and their media is adjustable too.
  const shell = document.querySelector('.device-screen') || document.getElementById('app-shell');
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

  // Both overlays hang off the LIVE box of the element, so they keep their
  // relationship to it while the zoom animates and at whatever scale it lands.
  function positionToolbar(panel, target) {
    const rect = target.getBoundingClientRect();
    const width = panel.offsetWidth || 200;
    const height = panel.offsetHeight || 220;
    const gap = 18;
    // Take whichever side of the element has more room, so the panel never
    // ends up sitting on top of the thing being adjusted.
    const left = window.innerWidth - rect.right >= rect.left
      ? rect.right + gap
      : rect.left - width - gap;
    panel.style.left = `${clamp(left, 12, window.innerWidth - width - 12)}px`;
    panel.style.top = `${clamp(rect.top + rect.height / 2 - height / 2, 12, window.innerHeight - height - 12)}px`;
  }

  function positionCropFab(fab, target) {
    const rect = target.getBoundingClientRect();
    const height = fab.offsetHeight || 28;
    // Anchored by its right edge so the label can grow leftwards on hover
    // without ever creeping past the corner it is perched on.
    const right = clamp(window.innerWidth - (rect.right - FAB_INSET), 6, window.innerWidth - 48);
    const perched = rect.top - height - FAB_GAP;
    const inside = perched < 8;
    fab.classList.toggle('is-inside', inside);
    const top = inside ? rect.top + FAB_GAP : perched;
    fab.style.right = `${right}px`;
    fab.style.top = `${clamp(top, 6, window.innerHeight - height - 6)}px`;
  }

  function syncOverlays() {
    if (!session) return;
    positionCropFab(session.cropBtn, session.target);
    positionToolbar(session.panel, session.target);
  }

  // Ride along with the zoom transition so the controls travel with the frame
  // instead of snapping into place once it settles.
  function pumpOverlays(ms = 460) {
    if (!session) return;
    cancelAnimationFrame(session.pumpFrame);
    const until = performance.now() + ms;
    const step = () => {
      if (!session) return;
      syncOverlays();
      if (performance.now() < until) session.pumpFrame = requestAnimationFrame(step);
    };
    session.pumpFrame = requestAnimationFrame(step);
  }

  /* ----------------------------------------------------------- zoom-to-fit */

  function computeZoom(base, layer) {
    const { rect } = base;
    if (!rect.width || !rect.height) return 1;
    const area = workArea();

    // Compare the frame and the work area by their geometric means rather than
    // by one edge: a 40px logo and a wide, short promo card then land at a
    // similar visual weight instead of the card being flung to full width.
    let k = (Math.sqrt(area.width * area.height) * ZOOM_FILL) / Math.sqrt(rect.width * rect.height);

    // A photo whose shape disagrees with its frame is cropped hard by `cover`,
    // so there is more hidden image to drag through. Give that case slack.
    const naturalW = layer?.naturalWidth || 0;
    const naturalH = layer?.naturalHeight || 0;
    if (naturalW && naturalH) {
      const imageRatio = naturalW / naturalH;
      const frameRatio = rect.width / rect.height;
      const mismatch = Math.max(imageRatio / frameRatio, frameRatio / imageRatio);
      k *= clamp(1 + (mismatch - 1) * 0.18, 1, 1.3);
    }

    // Whatever the maths asks for, the zoomed element still has to fit.
    k = Math.min(k, area.width / rect.width, area.height / rect.height, ZOOM_MAX);
    return k < ZOOM_MIN ? 1 : k;
  }

  function applyZoom() {
    if (!session) return;
    const stage = document.getElementById('device-stage');
    const base = session.base;
    if (!stage || !base) return;
    const k = computeZoom(base, session.layer);
    session.zoom = k;
    if (k === 1) return;

    const cx = base.rect.left + base.rect.width / 2;
    const cy = base.rect.top + base.rect.height / 2;
    const area = workArea();
    // Scale about the element's own centre so that point holds still, then
    // slide it into the middle of the work area. Order matters: the translate
    // is composed outside the scale, so it stays in unscaled pixels.
    stage.style.transformOrigin = `${((cx - base.stage.left) / (base.stage.width || 1)) * 100}% `
      + `${((cy - base.stage.top) / (base.stage.height || 1)) * 100}%`;
    stage.style.transform = `translate(${area.cx - cx}px, ${area.cy - cy}px) scale(${k})`;
    // The zoom magnifies everything inside the stage, outlines and crop handles
    // included. Publishing the factor lets the CSS divide it back out so the
    // editing chrome keeps its real on-screen weight at any magnification.
    document.documentElement.style.setProperty('--ia-zoom', String(k));
    pumpOverlays();
  }

  function clearZoom() {
    document.documentElement.style.removeProperty('--ia-zoom');
    const stage = document.getElementById('device-stage');
    if (!stage) return;
    stage.style.transform = '';
    stage.style.transformOrigin = '';
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
    target.append(layer, cropBox);
    // The control perches OUTSIDE the frame, and the frame clips its children,
    // so it lives on the body and is positioned against the element's box.
    document.body.appendChild(cropBtn);

    // Freeze the preview column first: locking its scrollbar away now means the
    // measurements below describe the layout the zoom will actually land in.
    document.body.classList.add('ia-adjusting');

    const panel = buildToolbar();
    const stage = document.getElementById('device-stage');
    session = {
      target, layer, cropBox, cropBtn, panel, src,
      state: { x: 0, y: 0, scale: 1, rot: 0, src },
      history: [], index: -1, cropping: false, crop: null, fitTimer: null,
      zoom: 1, pumpFrame: 0,
      // Untransformed geometry, captured once — every zoom calculation reads
      // these so a recompute never measures its own previous scale.
      base: {
        rect: target.getBoundingClientRect(),
        stage: stage ? stage.getBoundingClientRect() : null,
      },
    };
    commit();
    render();
    syncOverlays();

    // Every editable image gets the magnifier, not just the logo — but sized to
    // the slot. The natural dimensions sharpen it, so wait for the decode.
    if (layer.complete && layer.naturalWidth) applyZoom();
    else layer.addEventListener('load', applyZoom, { once: true });

    // Anything that animates the preview on its own — the reels stack, for one —
    // needs to hold still while the merchant is working inside it.
    document.dispatchEvent(new CustomEvent('como:image-adjust', { detail: { open: true, target } }));
    wireSession();
  }

  function close() {
    if (!session) return;
    clearTimeout(session.fitTimer);
    cancelAnimationFrame(session.pumpFrame);
    session.layer.remove();
    session.cropBox.remove();
    session.cropBtn.remove();
    session.panel.remove();
    session.target.classList.remove('ia-active', 'ia-cropping');
    clearZoom();
    document.body.classList.remove('ia-adjusting');
    session = null;
    document.dispatchEvent(new CustomEvent('como:image-adjust', { detail: { open: false } }));
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
    session.cropBtn.classList.add('is-hidden');
    session.panel.classList.add('is-cropping');
    session.crop = { x1: 0, y1: 0, x2: session.target.clientWidth, y2: session.target.clientHeight };
    layoutCrop();
  }

  function cancelCrop() {
    clearTimeout(session.fitTimer);
    session.cropping = false;
    session.target.classList.remove('ia-cropping', 'ia-animating');
    session.cropBtn.classList.remove('is-hidden');
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

  // The overlays are pinned to the element's on-screen box, so anything that
  // moves that box has to move them too.
  window.addEventListener('resize', syncOverlays);
  document.getElementById('preview-area')?.addEventListener('scroll', syncOverlays, { passive: true });

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
