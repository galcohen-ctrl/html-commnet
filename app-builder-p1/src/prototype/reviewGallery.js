import { initMemberActions } from './memberActions.js';
import { openWebsitePreview } from './websiteScreen.js';
import { initInbox } from './inbox.js';

const PAGE_ACTIONS = new Set(['showPhonePage', 'goToPage']);
const CONTROL_ACTIONS = new Set(['closeModal', 'openAccountPage', 'openBusinessNameSettings', 'closeReelsModal']);

function phoneSnapshot(ctx) {
  const source = document.getElementById('device-frame');
  const frame = source.cloneNode(true);
  frame.style.removeProperty('transform');
  frame.style.removeProperty('width');
  frame.style.removeProperty('height');
  frame.querySelectorAll('script, .ia-tools, .ia-crop-overlay, .tap-preview-exit').forEach((element) => element.remove());
  frame.querySelectorAll('*').forEach((element) => {
    const handler = element.getAttribute('onclick')?.trim();
    const navigation = handler?.match(/^(showPhonePage|goToPage|openModal)\('([a-z-]+)'\);?$/);
    const control = handler?.match(/^([A-Za-z]+)\(\);?$/)?.[1];
    if (navigation) element.dataset[PAGE_ACTIONS.has(navigation[1]) ? 'reviewPage' : 'reviewModal'] = navigation[2];
    else if (CONTROL_ACTIONS.has(control)) element.dataset.reviewControl = control;
    [...element.attributes].forEach((attribute) => {
      if (attribute.name.startsWith('on')) element.removeAttribute(attribute.name);
    });
    element.classList.remove('highlight-target', 'widget-ghost', 'ia-active');
  });
  frame.querySelectorAll('.reels-frame').forEach((element) => {
    const reel = ctx.orderingWidgetState?.menuReels.items.find((item) => String(item.id) === element.dataset.reelId);
    element.dataset.reelSeconds = String(Math.max(3, Number(reel?.seconds) || 6));
  });
  const properties = {};
  const styles = getComputedStyle(document.body);
  for (let index = 0; index < styles.length; index += 1) {
    const name = styles[index];
    if (name.startsWith('--p-')) properties[name] = styles.getPropertyValue(name);
  }
  const classes = [...document.body.classList].filter((name) => /^(tpl-|oo-mode-|oo-connected$|focus-|menu-slot-|more-list$|screen-.*-off$|px-ordering-sample$)/.test(name));
  return {
    html: frame.outerHTML,
    properties,
    classes,
    iconStyle: document.body.dataset.iconStyle || 'outline',
    member: document.body.dataset.memberPreview || 'returning',
    fonts: [...document.querySelectorAll('link[data-google-font]')].map((link) => link.href),
    screenTargets: ctx.getAppScreenTargets?.() || {},
    inbox: ctx.exportInbox?.(),
  };
}

export function initReviewGallery(ctx) {
  const gallery = document.getElementById('review-gallery');
  const dialog = document.getElementById('review-preview-dialog');
  if (!gallery || !dialog) return {};
  const entries = new Map();
  let active = false;
  let scheduled = false;
  let payload;
  let signature;
  let dialogFrame;

  function screens() {
    return [...document.querySelectorAll('#bottom-nav .nav-item[data-nav]')]
      .filter((item) => !item.hidden && !item.classList.contains('slot-hidden') && ctx.getScreenState?.(item.dataset.nav) !== false)
      .map((item) => ({ key: item.dataset.nav, label: item.querySelector('span')?.textContent.trim() || item.dataset.nav }));
  }

  function send(frame) {
    if (payload) frame.contentWindow?.postMessage({ type: 'como:review:update', payload }, location.origin);
  }

  function makePhone(screen, wrapper) {
    const frame = document.createElement('iframe');
    const url = new URL(location.href);
    url.search = '';
    url.searchParams.set('review-screen', screen.key);
    frame.src = url.href;
    frame.title = `${screen.label} live preview`;
    frame.className = 'review-phone-frame';
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    frame.addEventListener('load', () => send(frame));
    wrapper.appendChild(frame);
    return frame;
  }

  function sizePhones() {
    document.querySelectorAll('.review-phone-wrap').forEach((wrapper) => {
      const width = wrapper.getBoundingClientRect().width;
      if (width) wrapper.style.setProperty('--review-scale', String(width / 360));
    });
  }

  function openLarge(screen) {
    const wrapper = dialog.querySelector('.review-phone-wrap');
    wrapper.replaceChildren();
    document.getElementById('review-dialog-title').textContent = screen.label;
    dialogFrame = makePhone(screen, wrapper);
    dialog.showModal();
    sizePhones();
  }

  function createEntry(screen) {
    const item = document.createElement('article');
    item.className = 'review-phone-item';
    item.dataset.reviewScreen = screen.key;
    item.dataset.commentAnchor = `review-${screen.key}`;
    const heading = document.createElement('div');
    heading.className = 'review-phone-heading';
    const title = document.createElement('h3');
    title.textContent = screen.label;
    const expand = document.createElement('button');
    expand.type = 'button';
    expand.className = 'review-expand';
    expand.setAttribute('aria-label', `Open ${screen.label} larger`);
    expand.title = `Open ${screen.label} larger`;
    expand.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/></svg>';
    expand.addEventListener('click', () => openLarge({ key: screen.key, label: title.textContent }));
    heading.append(title, expand);
    const wrapper = document.createElement('div');
    wrapper.className = 'review-phone-wrap';
    const frame = makePhone(screen, wrapper);
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'review-reset review-expand';
    reset.title = `Back to ${screen.label}`;
    reset.setAttribute('aria-label', reset.title);
    reset.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/></svg>';
    reset.addEventListener('click', () => frame.contentWindow?.postMessage({ type: 'como:review:reset', page: screen.key }, location.origin));
    heading.insertBefore(reset, expand);
    item.append(heading, wrapper);
    gallery.appendChild(item);
    return { item, frame, title, expand };
  }

  function update() {
    scheduled = false;
    if (!active && !dialog.open) return;
    const selected = screens();
    const keys = new Set(selected.map((screen) => screen.key));
    entries.forEach((entry, key) => {
      if (!keys.has(key)) { entry.item.remove(); entries.delete(key); }
    });
    selected.forEach((screen, index) => {
      if (!entries.has(screen.key)) entries.set(screen.key, createEntry(screen));
      const entry = entries.get(screen.key);
      entry.title.textContent = screen.label;
      entry.expand.title = `Open ${screen.label} larger`;
      entry.expand.setAttribute('aria-label', entry.expand.title);
      entry.frame.title = `${screen.label} live preview`;
      entry.item.style.order = String(index);
    });
    const nextPayload = phoneSnapshot(ctx);
    const nextSignature = JSON.stringify(nextPayload);
    if (nextSignature !== signature) {
      signature = nextSignature;
      payload = nextPayload;
      entries.forEach((entry) => send(entry.frame));
      if (dialogFrame) send(dialogFrame);
    }
    sizePhones();
  }

  function schedule() {
    if (scheduled || (!active && !dialog.open)) return;
    scheduled = true;
    requestAnimationFrame(update);
  }

  document.addEventListener('como:stepchange', (event) => {
    active = event.detail.step === 'publish';
    gallery.hidden = !active;
    document.body.classList.toggle('review-gallery-active', active);
    if (active) schedule();
    else {
      if (dialog.open) dialog.close();
      entries.forEach((entry) => entry.item.remove());
      entries.clear();
      signature = null;
    }
  });
  ['como:draft-dirty', 'como:screenstate', 'como:branding-changed', 'como:draft-restored'].forEach((event) => document.addEventListener(event, schedule));
  const observer = new MutationObserver(schedule);
  observer.observe(document.getElementById('device-frame'), { subtree: true, childList: true, characterData: true, attributes: true });
  observer.observe(document.body, { attributes: true, attributeFilter: ['style', 'class', 'data-member-preview', 'data-icon-style'] });
  const resize = new ResizeObserver(sizePhones);
  resize.observe(gallery);
  resize.observe(dialog);
  window.addEventListener('message', (event) => {
    if (event.origin !== location.origin || event.data?.type !== 'como:review:ready') return;
    const frame = [...entries.values()].map((entry) => entry.frame).concat(dialogFrame || []).find((entry) => entry.contentWindow === event.source);
    if (frame) send(frame);
  });
  document.getElementById('review-dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => { dialogFrame?.remove(); dialogFrame = null; });
  return { refreshReviewGallery: schedule };
}

export function initReviewPhone(initialPage) {
  const root = document.getElementById('root');
  let currentPage = initialPage;
  let screenTargets = {};
  let websiteVisit;
  let reelIndex = 0;
  let reelTimer;
  let gesture;
  let toastTimer;
  const toast = document.createElement('div');
  toast.className = 'review-toast';
  toast.setAttribute('role', 'status');
  toast.hidden = true;
  document.body.appendChild(toast);
  function showToast(message) {
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2600);
  }
  initMemberActions({ showToast, showPage });
  const inbox = initInbox({ showPage, closeModal });

  function closeModal() {
    document.querySelectorAll('.phone-modal, .reels-modal').forEach((modal) => modal.classList.remove('open'));
    document.querySelectorAll('video').forEach((video) => video.pause());
    document.body.classList.remove('reels-open');
    clearTimeout(reelTimer);
  }

  function showReel(index) {
    const stack = document.getElementById('reels-stack');
    const frames = [...(stack?.querySelectorAll('.reels-frame') || [])];
    if (!frames.length) return;
    if (index < 0 || index >= frames.length) { closeModal(); return; }
    reelIndex = index;
    stack.style.transform = `translateY(${-index * 100}%)`;
    clearTimeout(reelTimer);
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    frames.forEach((frame, position) => {
      const video = frame.querySelector('video');
      if (!video) return;
      video.controls = reducedMotion;
      if (position === index && !reducedMotion) video.play().catch(() => {});
      else video.pause();
    });
    if (!reducedMotion) {
      const seconds = Number(frames[index].dataset.reelSeconds) || 6;
      reelTimer = setTimeout(() => showReel(index + 1), seconds * 1000);
    }
  }

  function openReels(index = 0) {
    document.querySelector('.reels-modal')?.classList.add('open');
    document.body.classList.add('reels-open');
    showReel(index);
  }

  function showPage(key) {
    const target = screenTargets[key] || key;
    const actualKey = target === 'home' && document.body.classList.contains('tpl-3') ? 'home-t3' : target;
    const page = [...document.querySelectorAll('.app-page')].find((element) => element.dataset.page === actualKey);
    if (!page) return;
    currentPage = key;
    document.body.dataset.reviewPage = key;
    document.querySelectorAll('.app-page').forEach((element) => element.classList.toggle('active', element === page));
    document.querySelectorAll('.nav-item').forEach((element) => element.classList.toggle('active', element.dataset.nav === key));
    document.getElementById('app-shell').scrollTop = 0;
    closeModal();
  }

  function receive(payload) {
    if (!payload || typeof payload.html !== 'string') return;
    screenTargets = payload.screenTargets || {};
    const previousScroll = document.getElementById('app-shell')?.scrollTop || 0;
    const previousModal = document.querySelector('.phone-modal.open')?.dataset.modal;
    const inboxScroll = document.querySelector('[data-inbox-scroll]')?.scrollTop || 0;
    const inboxDetailScroll = document.querySelector('[data-inbox-detail]')?.scrollTop || 0;
    const previousInput = document.getElementById('login-input');
    const loginState = previousInput ? { value: previousInput.value, email: previousInput.type === 'email' } : null;
    document.body.className = [...payload.classes, 'review-phone'].join(' ');
    document.body.dataset.memberPreview = payload.member;
    document.body.dataset.iconStyle = payload.iconStyle;
    Object.entries(payload.properties).forEach(([name, value]) => {
      if (name.startsWith('--p-')) document.body.style.setProperty(name, value);
    });
    payload.fonts.forEach((href) => {
      const url = new URL(href);
      if (url.origin !== 'https://fonts.googleapis.com' || [...document.querySelectorAll('link[rel="stylesheet"]')].some((link) => link.href === href)) return;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    });
    const template = document.createElement('template');
    template.innerHTML = payload.html;
    root.replaceChildren(template.content);
    if (currentPage === 'website-link' && websiteVisit) openWebsitePreview(websiteVisit.url, websiteVisit.options, () => {}, websiteVisit.returnPage);
    showPage(currentPage);
    document.getElementById('app-shell').scrollTop = previousScroll;
    if (loginState) {
      const tab = [...document.querySelectorAll('.px-login-tabs [role="tab"]')].find((element) => element.textContent.trim() === (loginState.email ? 'Email' : 'Phone'));
      tab?.click();
      document.getElementById('login-input').value = loginState.value;
    }
    if (previousModal === 'reels') openReels(reelIndex);
    else if (previousModal) document.querySelector(`.phone-modal[data-modal="${CSS.escape(previousModal)}"]`)?.classList.add('open');
    inbox.refreshInbox(payload.inbox);
    const inboxList = document.querySelector('[data-inbox-scroll]');
    const inboxDetail = document.querySelector('[data-inbox-detail]');
    if (inboxList) inboxList.scrollTop = inboxScroll;
    if (inboxDetail) inboxDetail.scrollTop = inboxDetailScroll;
    document.body.dataset.reviewReady = 'true';
  }

  window.addEventListener('message', (event) => {
    if (event.origin !== location.origin || event.source !== parent) return;
    if (event.data?.type === 'como:review:update') receive(event.data.payload);
    if (event.data?.type === 'como:review:reset') showPage(event.data.page);
  });
  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-nav], [data-review-page]:not(body), [data-preview-page], [data-preview-url], [data-review-modal], [data-review-control], .pc-dot, .reels-chip-dismiss, .reels-cta, .phone-reels-chip, .phone-modal');
    if (!target) return;
    if ('previewUrl' in target.dataset) {
      event.preventDefault();
      let options = {};
      try { options = JSON.parse(target.dataset.previewBrowser || '{}'); } catch {}
      websiteVisit = { url: target.dataset.previewUrl, options, returnPage: currentPage };
      if (!openWebsitePreview(websiteVisit.url, options, showPage, currentPage)) showToast('Add a website address first.');
    } else if (target.dataset.nav || target.dataset.reviewPage || target.dataset.previewPage) {
      event.preventDefault();
      showPage(target.dataset.nav || target.dataset.reviewPage || target.dataset.previewPage);
    } else if (target.dataset.reviewModal) {
      document.querySelectorAll('.phone-modal').forEach((modal) => modal.classList.toggle('open', modal.dataset.modal === target.dataset.reviewModal));
    } else if (target.dataset.reviewControl === 'openAccountPage') {
      showPage(document.body.dataset.memberPreview === 'guest' ? 'login' : 'account');
    } else if (target.dataset.reviewControl === 'closeModal' || target.dataset.reviewControl === 'closeReelsModal' || event.target === target && target.classList.contains('phone-modal')) {
      closeModal();
    } else if (target.classList.contains('pc-dot')) {
      const carousel = target.closest('.promo-cards-widget')?.querySelector('.pc-carousel-wrap');
      carousel?.scrollTo({ left: Number(target.dataset.dot) * carousel.clientWidth, behavior: 'auto' });
    } else if (target.classList.contains('phone-reels-chip')) {
      openReels();
    } else if (target.classList.contains('reels-chip-dismiss')) {
      target.closest('.phone-reels-chip').hidden = true;
    } else if (target.classList.contains('reels-cta')) {
      closeModal();
      showToast(`Added ${target.textContent || 'item'} to cart`);
    }
  });
  document.addEventListener('pointerdown', (event) => {
    const stack = event.target.closest('#reels-stack');
    if (!stack || event.target.closest('button') || event.target.closest('video')?.controls) return;
    stack.setPointerCapture(event.pointerId);
    gesture = { pointerId: event.pointerId, start: event.clientY };
    clearTimeout(reelTimer);
  });
  document.addEventListener('pointerup', (event) => {
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const distance = event.clientY - gesture.start;
    gesture = null;
    showReel(reelIndex + (distance < -40 ? 1 : distance > 40 ? -1 : 0));
  });
  document.addEventListener('pointercancel', () => { gesture = null; });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeModal();
    if (document.body.classList.contains('reels-open') && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      showReel(reelIndex + (event.key === 'ArrowDown' ? 1 : -1));
    }
    if (['Enter', ' '].includes(event.key) && event.target.matches('[role="button"]')) { event.preventDefault(); event.target.click(); }
  });
  document.addEventListener('submit', (event) => event.preventDefault());
  document.body.className = 'review-phone';
  parent.postMessage({ type: 'como:review:ready' }, location.origin);
}