// The configurable opening experience is demonstrated here. Native OS launch
// assets remain the responsibility of the mobile build pipeline.
export function initLaunchScreen(ctx) {
  const section = document.getElementById('branding-launch-section');
  const preview = document.getElementById('preview-area');
  const canvas = document.getElementById('launch-screen-content');
  const upload = document.getElementById('launch-upload');
  const input = document.getElementById('launch-file');
  const play = document.getElementById('launch-play');
  const error = document.getElementById('launch-error');
  const brand = document.querySelector('.app-page[data-page="home"] .brand-mark');
  if (!section || !preview || !canvas) return {};

  let media = null;
  let playback = null;
  let timer;
  let uploadVersion = 0;
  // Drafts reset on reload in this prototype. Object URLs keep large videos out
  // of localStorage while preserving same-session draft/published restoration.
  const uploads = new Set();

  function showError(message = '') {
    error.textContent = message;
    error.hidden = !message;
  }

  function content(animate = false) {
    if (!media) {
      const mark = document.createElement('div');
      mark.className = 'launch-brand-mark';
      if (brand?.classList.contains('has-logo')) mark.style.backgroundImage = brand.style.backgroundImage;
      else mark.textContent = brand?.textContent.trim() || '?';
      return mark;
    }
    if (media.kind !== 'video') {
      // A background layer, not an <img>: that is what imageAdjust reads and
      // writes, so press-and-hold reframing works here like anywhere else.
      const element = document.createElement('div');
      element.className = 'launch-screen-media launch-screen-image';
      element.setAttribute('role', 'img');
      element.setAttribute('aria-label', 'Custom launch screen');
      element.style.backgroundImage = `url("${media.url}")`;
      return element;
    }
    const element = document.createElement('video');
    element.className = 'launch-screen-media';
    element.src = media.url;
    element.muted = true;
    element.playsInline = true;
    element.preload = 'auto';
    element.autoplay = animate;
    element.addEventListener('loadeddata', () => {
      if (animate) element.play().catch(() => {});
    }, { once: true });
    return element;
  }

  function stopPlayback({ handoff = false } = {}) {
    clearTimeout(timer);
    if (!playback) {
      canvas.querySelector('video')?.pause();
      play.disabled = false;
      play.querySelector('span').textContent = 'Preview app opening';
      return;
    }
    const node = playback;
    playback = null;
    const finalise = () => {
      node.querySelector('video')?.pause();
      node.remove();
      canvas.querySelector('video')?.pause();
      play.disabled = false;
      play.querySelector('span').textContent = 'Preview app opening';
    };
    // The home screen sits underneath the playback in the same device-screen.
    // Fading + scaling the launch out (rather than yanking it) reveals home the
    // way iOS does when its own launch storyboard hands off to the app.
    if (handoff && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      node.classList.add('is-exiting');
      node.addEventListener('transitionend', finalise, { once: true });
      setTimeout(finalise, 500);
      return;
    }
    finalise();
  }

  function render() {
    stopPlayback();
    canvas.replaceChildren(content());
    document.getElementById('launch-summary').textContent = media ? 'Custom' : 'Brand default';
    document.getElementById('launch-upload-label').textContent = media ? 'Replace image, GIF, or video' : 'Upload image, GIF, or video';
    document.getElementById('launch-upload-result').hidden = !media;
    document.getElementById('launch-file-name').textContent = media?.name || '';
    document.getElementById('launch-upload-thumb').replaceChildren(...(media ? [content()] : []));
  }

  function syncVisibility() {
    // The launch panel now lives in the third panel; `.show` is its open state.
    const active = window.getCurrentStep?.() === 'branding' && section.classList.contains('show');
    preview.classList.toggle('launch-preview-active', active);
    if (!active) stopPlayback();
    document.dispatchEvent(new CustomEvent('como:launch-previewchange'));
  }

  async function acceptFile(file) {
    if (!file) return;
    const version = ++uploadVersion;
    showError();
    const kind = /^video\/(mp4|webm)$/.test(file.type) ? 'video'
      : /^image\/(png|jpeg|webp|gif)$/.test(file.type) ? 'image' : null;
    if (!kind) return showError('Choose a PNG, JPG, WebP, GIF, MP4 or WebM file.');
    if (file.size > 10 * 1024 * 1024) return showError('This file is over 10 MB. Choose a smaller file.');
    const url = URL.createObjectURL(file);
    const probe = document.createElement(kind === 'video' ? 'video' : 'img');
    if (kind === 'video') { probe.muted = true; probe.preload = 'auto'; }
    upload.setAttribute('aria-busy', 'true');
    document.getElementById('launch-upload-label').textContent = 'Loading preview…';
    const valid = await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), 10000);
      const done = (value) => { clearTimeout(timeout); resolve(value); };
      probe.addEventListener(kind === 'video' ? 'loadeddata' : 'load', () => done(true), { once: true });
      probe.addEventListener('error', () => done(false), { once: true });
      probe.src = url;
    });
    probe.removeAttribute('src');
    if (kind === 'video') probe.load();
    if (version !== uploadVersion) { URL.revokeObjectURL(url); return; }
    upload.removeAttribute('aria-busy');
    if (!valid) {
      URL.revokeObjectURL(url);
      render();
      return showError('This file could not be previewed. Try another image or video.');
    }
    uploads.add(url);
    media = { url, kind, name: file.name };
    render();
    ctx.markDirty?.();
    if (kind !== 'video') ctx.showToast?.('Launch image added · press and hold it in the preview to reframe');
  }

  upload.addEventListener('click', () => input.click());
  input.addEventListener('change', () => { acceptFile(input.files?.[0]); input.value = ''; });
  upload.addEventListener('dragover', (event) => { event.preventDefault(); upload.classList.add('drag-over'); });
  upload.addEventListener('dragleave', () => upload.classList.remove('drag-over'));
  upload.addEventListener('drop', (event) => {
    event.preventDefault();
    upload.classList.remove('drag-over');
    acceptFile(event.dataTransfer.files?.[0]);
  });
  document.getElementById('launch-reset').addEventListener('click', () => {
    uploadVersion += 1;
    upload.removeAttribute('aria-busy');
    media = null;
    showError();
    render();
    ctx.markDirty?.();
  });
  play.addEventListener('click', () => {
    stopPlayback();
    const animate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    playback = document.createElement('div');
    playback.className = 'launch-screen-content launch-playback';
    playback.setAttribute('aria-label', 'App opening preview');
    playback.append(content(animate));
    if (media?.kind !== 'video') {
      const hairline = document.createElement('span');
      hairline.className = 'launch-loading-hairline';
      hairline.setAttribute('aria-hidden', 'true');
      playback.append(hairline);
    }
    document.querySelector('#device-frame > .device-screen').append(playback);
    if (animate) canvas.querySelector('video')?.play().catch(() => {});
    play.disabled = true;
    play.querySelector('span').textContent = 'Playing opening…';
    ctx.setResponsiveView?.('preview', { persist: false });
    timer = setTimeout(() => stopPlayback({ handoff: true }), 2200);
  });
  new MutationObserver(syncVisibility).observe(section, { attributes: true, attributeFilter: ['class'] });
  // imageAdjust bakes the reframed result straight onto the layer's background;
  // adopt it as the new media so the next render does not undo the edit.
  document.addEventListener('como:image-adjust', (event) => {
    if (event.detail?.open || media?.kind === 'video') return;
    const layer = canvas.querySelector('.launch-screen-image');
    const baked = /url\(["']?(.*?)["']?\)/.exec(layer?.style.backgroundImage || '')?.[1];
    if (!baked || !media || baked === media.url) return;
    uploads.add(baked);
    media = { ...media, url: baked };
    render();
  });
  if (brand) new MutationObserver(() => { if (!media) render(); }).observe(brand, { attributes: true, childList: true, characterData: true, subtree: true });
  document.addEventListener('como:stepchange', syncVisibility);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopPlayback(); });
  render();
  syncVisibility();
  return {
    exportLaunchScreen: () => media ? { ...media } : {},
    importLaunchScreen: (saved = {}) => {
      media = uploads.has(saved?.url) ? { url: saved.url, kind: saved.kind, name: saved.name } : null;
      render();
    },
  };
}
