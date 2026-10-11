import { createInboxState, inboxUnreadCount, visibleInboxMessages, markInboxRead, markInboxAllRead, loadOlderInboxMessages } from '../data/inboxMock.js';

const ICONS = {
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M4 12v8h16v-8M12 8v12M12 8H7a3 3 0 1 1 3-3Zm0 0h5a3 3 0 1 0-3-3Z"/>',
  sparkles: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5ZM20 2v4m-2-2h4"/>',
  utensils: '<path d="M4 3v6a3 3 0 0 0 6 0V3M7 3v18M20 21V3c-4 2-4 10 0 10"/>',
  receipt: '<path d="M5 3h14v18l-3-2-4 2-4-2-3 2ZM9 7h6M9 11h6M9 15h3"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
};

const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.gift}</svg>`;

export function initInbox({ openModal, closeModal, showPage = (key) => window.showPhonePage?.(key) } = {}) {
  const state = createInboxState();
  let lastTrigger;
  let parentRevision;
  let loading = false;
  let gesture;
  let settleAnimation;
  let suppressClickUntil = 0;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const modal = () => document.querySelector('[data-modal="inbox"]');

  function syncBadges() {
    const count = document.body.dataset.memberPreview === 'guest' ? 0 : inboxUnreadCount(state);
    document.querySelectorAll('.px-profile-icon').forEach((button) => {
      let badge = button.querySelector('.profile-unread-badge');
      if (!badge) {
        badge = document.createElement('span'); badge.className = 'profile-unread-badge'; badge.setAttribute('aria-hidden', 'true');
        button.appendChild(badge);
      }
      button.dataset.inboxBaseLabel ||= button.getAttribute('aria-label') || 'Open profile';
      button.setAttribute('aria-label', `${button.dataset.inboxBaseLabel}${count ? `, ${count} unread messages` : ''}`);
      badge.textContent = count > 9 ? '9+' : String(count);
      badge.hidden = count === 0;
    });
    document.querySelectorAll('[data-inbox-count]').forEach((badge) => { badge.textContent = String(count); badge.hidden = count === 0; });
    document.querySelectorAll('.inbox-entry').forEach((button) => button.setAttribute('aria-label', `Notifications${count ? `, ${count} unread messages` : ''}`));
  }

  function announce(text) {
    const status = modal()?.querySelector('[data-inbox-status]');
    if (status) status.textContent = text;
  }

  function renderDetail(message) {
    const detail = modal().querySelector('[data-inbox-detail]');
    detail.replaceChildren();
    const meta = document.createElement('div'); meta.className = 'inbox-detail-meta'; meta.textContent = `${message.category} · ${message.time}`;
    const title = document.createElement('h3'); title.textContent = message.title; title.tabIndex = -1;
    const body = document.createElement('p'); body.textContent = message.body;
    detail.append(meta, title);
    if (message.image) { const image = document.createElement('img'); image.className = 'inbox-detail-image'; image.src = message.image; image.alt = 'A freshly prepared dish'; detail.appendChild(image); }
    detail.appendChild(body);
    if (message.target) {
      const action = document.createElement('button'); action.type = 'button'; action.className = 'inbox-detail-action'; action.dataset.inboxDestination = message.target; action.textContent = message.action;
      detail.appendChild(action);
    }
    const unread = document.createElement('button'); unread.type = 'button'; unread.className = 'inbox-mark-unread'; unread.dataset.inboxUnread = message.id; unread.textContent = 'Mark as unread';
    detail.appendChild(unread);
  }

  function render() {
    syncBadges();
    const overlay = modal();
    if (!overlay) return;
    const count = inboxUnreadCount(state);
    overlay.querySelector('[data-inbox-summary]').textContent = count ? `${count} unread ${count === 1 ? 'message' : 'messages'}` : 'All caught up';
    overlay.querySelector('[data-inbox-read-all]').disabled = count === 0;
    overlay.querySelector('[data-inbox-filter="all"] span').textContent = `All (${state.shown})`;
    overlay.querySelector('[data-inbox-filter="unread"] span').textContent = count ? `Unread (${count})` : 'Unread';
    overlay.querySelectorAll('[data-inbox-filter]').forEach((button) => {
      button.setAttribute('aria-selected', String(button.dataset.inboxFilter === state.filter));
      button.tabIndex = button.dataset.inboxFilter === state.filter ? 0 : -1;
    });
    const selected = state.messages.find((message) => message.id === state.selected);
    overlay.classList.toggle('inbox-show-detail', !!selected);
    overlay.querySelector('[data-inbox-back]').hidden = !selected;
    overlay.querySelector('[data-inbox-list-view]').hidden = !!selected;
    overlay.querySelector('[data-inbox-detail]').hidden = !selected;
    if (selected) renderDetail(selected);
    const list = overlay.querySelector('[data-inbox-list]');
    const fragment = document.createDocumentFragment();
    let group;
    const messages = visibleInboxMessages(state);
    messages.forEach((message) => {
      if (message.group !== group) {
        group = message.group;
        const heading = document.createElement('li'); heading.className = 'inbox-date'; heading.textContent = group;
        fragment.appendChild(heading);
      }
      const item = document.createElement('li');
      const button = document.createElement('button'); button.type = 'button'; button.className = `inbox-message${message.read ? '' : ' unread'}`; button.dataset.inboxMessage = message.id;
      button.setAttribute('aria-label', `${message.read ? '' : 'Unread: '}${message.title}, ${message.time}`);
      const art = document.createElement('span'); art.className = `inbox-message-icon inbox-kind-${message.icon}`; art.innerHTML = icon(message.icon);
      const content = document.createElement('span'); content.className = 'inbox-message-copy';
      const title = document.createElement('strong'); title.textContent = message.title;
      const preview = document.createElement('span'); preview.className = 'inbox-message-preview'; preview.textContent = message.preview;
      const time = document.createElement('span'); time.className = 'inbox-message-time'; time.textContent = message.time;
      const dot = document.createElement('span'); dot.className = 'inbox-unread-dot'; dot.hidden = message.read; dot.setAttribute('aria-hidden', 'true');
      content.append(title, preview, time); button.append(art, content, dot); item.appendChild(button); fragment.appendChild(item);
    });
    list.replaceChildren(fragment);
    overlay.querySelector('[data-inbox-empty]').hidden = messages.length > 0;
    const load = overlay.querySelector('[data-inbox-load]');
    load.hidden = state.shown >= state.messages.length;
    load.disabled = loading;
    load.textContent = loading ? 'Loading messages...' : 'Load older messages';
    overlay.querySelector('[data-inbox-scroll]').setAttribute('aria-busy', String(loading));
    overlay.setAttribute('aria-hidden', String(!overlay.classList.contains('open')));
  }

  function open(trigger, animate = true) {
    if (document.body.dataset.memberPreview === 'guest') { showPage('login'); return; }
    lastTrigger = trigger;
    state.selected = null;
    openModal?.('inbox');
    const overlay = modal();
    if (!overlay) return;
    overlay.classList.add('open');
    render();
    if (animate) {
      overlay.querySelector('.inbox-sheet').animate(
        reducedMotion.matches ? [{ opacity: .6 }, { opacity: 1 }] : [{ transform: 'translateY(24px)', opacity: .8 }, { transform: 'translateY(0)', opacity: 1 }],
        { duration: reducedMotion.matches ? 100 : 240, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
      );
    }
    overlay.querySelector('[data-inbox-close]').focus({ preventScroll: true });
  }

  function close(restoreFocus = true) {
    gesture = null;
    resetPull();
    closeModal?.();
    modal()?.classList.remove('open');
    modal()?.setAttribute('aria-hidden', 'true');
    if (restoreFocus && lastTrigger?.isConnected) lastTrigger.focus({ preventScroll: true });
  }

  async function loadOlder(pulled = false) {
    if (loading || state.shown >= state.messages.length) return;
    loading = true; render(); announce('Loading older messages');
    if (pulled) {
      const content = modal()?.querySelector('[data-inbox-list-content]');
      const indicator = modal()?.querySelector('[data-inbox-pull]');
      if (content) content.style.transform = 'translateY(52px)';
      if (indicator) { indicator.style.opacity = '1'; indicator.classList.add('loading'); indicator.querySelector('span').textContent = 'Loading older messages...'; }
    }
    await new Promise((resolve) => setTimeout(resolve, 450));
    const added = loadOlderInboxMessages(state);
    loading = false; render(); announce(`${added} older messages loaded`);
    resetPull();
  }

  function resetPull() {
    const content = modal()?.querySelector('[data-inbox-list-content]');
    const indicator = modal()?.querySelector('[data-inbox-pull]');
    if (content) {
      const from = getComputedStyle(content).transform;
      settleAnimation?.cancel();
      content.style.transform = 'translateY(0)';
      if (from !== 'none' && !reducedMotion.matches) settleAnimation = content.animate([{ transform: from }, { transform: 'translateY(0)' }], { duration: 200, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
    }
    if (indicator) { indicator.style.opacity = '0'; indicator.classList.remove('loading'); }
  }

  function startPull(target, point, pointerId) {
    const scroll = target.closest('[data-inbox-scroll]');
    if (!scroll || scroll.scrollTop > 0 || loading || state.selected || state.shown >= state.messages.length || !modal()?.classList.contains('open')) return;
    const content = scroll.querySelector('[data-inbox-list-content]');
    const transform = getComputedStyle(content).transform;
    const initial = transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m42;
    settleAnimation?.cancel();
    gesture = { scroll, content, pointerId, startX: point.clientX, startY: point.clientY, initial, distance: initial };
  }

  function movePull(point, event) {
    if (!gesture) return;
    const vertical = point.clientY - gesture.startY;
    const horizontal = Math.abs(point.clientX - gesture.startX);
    if (vertical < 0 || (horizontal > Math.abs(vertical) && gesture.distance < 8)) { gesture = null; resetPull(); return; }
    if (vertical < 8) return;
    event.preventDefault();
    if (gesture.pointerId !== undefined && !gesture.scroll.hasPointerCapture(gesture.pointerId)) gesture.scroll.setPointerCapture(gesture.pointerId);
    gesture.distance = Math.min(96, gesture.initial + (vertical * 160 * .55) / (160 + .55 * vertical));
    gesture.content.style.transform = `translateY(${gesture.distance}px)`;
    const indicator = modal().querySelector('[data-inbox-pull]');
    indicator.style.opacity = String(Math.min(1, gesture.distance / 34));
    indicator.querySelector('span').textContent = gesture.distance >= 58 ? 'Release to load older messages' : 'Pull to load older messages';
    indicator.querySelector('svg').style.transform = `rotate(${gesture.distance * 3}deg)`;
  }

  function finishPull(cancelled = false) {
    if (!gesture) return;
    const current = gesture;
    gesture = null;
    if (current.pointerId !== undefined && current.scroll.hasPointerCapture(current.pointerId)) current.scroll.releasePointerCapture(current.pointerId);
    if (current.distance > 8) suppressClickUntil = performance.now() + 250;
    if (!cancelled && current.distance >= 58) loadOlder(true);
    else resetPull();
  }

  document.addEventListener('pointerdown', (event) => { if (event.pointerType !== 'touch' && event.button === 0) startPull(event.target, event, event.pointerId); });
  document.addEventListener('pointermove', (event) => { if (gesture?.pointerId === event.pointerId) movePull(event, event); });
  document.addEventListener('pointerup', (event) => { if (gesture?.pointerId === event.pointerId) finishPull(); });
  document.addEventListener('pointercancel', (event) => { if (gesture?.pointerId === event.pointerId) finishPull(true); });
  document.addEventListener('touchstart', (event) => { if (event.touches.length === 1) startPull(event.target, event.touches[0]); }, { passive: true });
  document.addEventListener('touchmove', (event) => { if (gesture?.pointerId === undefined && event.touches.length === 1) movePull(event.touches[0], event); }, { passive: false });
  document.addEventListener('touchend', () => { if (gesture?.pointerId === undefined) finishPull(); });
  document.addEventListener('touchcancel', () => finishPull(true));
  document.addEventListener('click', (event) => {
    if (performance.now() < suppressClickUntil && event.target.closest('[data-inbox-scroll]')) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-inbox-open]');
    if (trigger) { open(trigger, event.detail > 0); return; }
    const overlay = modal();
    if (!overlay || !overlay.contains(event.target)) return;
    if (event.target === overlay || event.target.closest('[data-inbox-close]')) { close(); return; }
    const filter = event.target.closest('[data-inbox-filter]');
    if (filter) { state.filter = filter.dataset.inboxFilter; render(); return; }
    if (event.target.closest('[data-inbox-read-all]')) { markInboxAllRead(state); render(); announce('All messages marked as read'); return; }
    const message = event.target.closest('[data-inbox-message]');
    if (message) { state.selected = message.dataset.inboxMessage; markInboxRead(state, state.selected); render(); overlay.querySelector('[data-inbox-detail] h3').focus(); return; }
    if (event.target.closest('[data-inbox-back]')) { state.selected = null; render(); overlay.querySelector('[data-inbox-filter][aria-selected="true"]').focus(); return; }
    const unread = event.target.closest('[data-inbox-unread]');
    if (unread) { markInboxRead(state, unread.dataset.inboxUnread, false); state.selected = null; render(); announce('Message marked as unread'); return; }
    const destination = event.target.closest('[data-inbox-destination]');
    if (destination) { close(false); showPage(destination.dataset.inboxDestination); return; }
    if (event.target.closest('[data-inbox-load]')) loadOlder();
  });

  document.addEventListener('keydown', (event) => {
    const overlay = modal();
    if (!overlay?.classList.contains('open')) return;
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    const filter = event.target.closest('[data-inbox-filter]');
    if (filter && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault(); state.filter = state.filter === 'all' ? 'unread' : 'all'; render();
      overlay.querySelector(`[data-inbox-filter="${state.filter}"]`).focus();
    }
    if (event.key !== 'Tab') return;
    const focusable = [...overlay.querySelectorAll('button:not(:disabled), [tabindex="0"]')].filter((element) => element.getBoundingClientRect().height > 0);
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && (document.activeElement === first || !overlay.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || !overlay.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
  });
  new MutationObserver(() => {
    if (document.body.dataset.memberPreview === 'guest' && modal()?.classList.contains('open')) close(false);
    syncBadges();
  }).observe(document.body, { attributes: true, attributeFilter: ['data-member-preview'] });
  render();
  return {
    refreshInbox: (snapshot) => {
      if (snapshot && snapshot.revision !== parentRevision) {
        parentRevision = snapshot.revision;
        state.messages.forEach((message) => { message.read = snapshot.read.includes(message.id); });
        state.shown = snapshot.shown;
      }
      render();
    },
    exportInbox: () => ({ revision: state.revision, shown: state.shown, read: state.messages.filter((message) => message.read).map((message) => message.id) }),
  };
}