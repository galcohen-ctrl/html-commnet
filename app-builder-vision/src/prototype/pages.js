/**
 * Pages: merchant-created pages built from the same sections as Home
 * (Promo Cards, Text Block, Text Divider, Image Banner), plus a manager for the
 * built-in pages. A page is reached from a More tile, a Promo Card or Image
 * Banner tap action ("Open page"), or the fourth tab. Pages can open one more
 * page, never deeper.
 */

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const ICON = {
  pencil: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12.5 3l4.5 4.5-10 10H2.5v-4.5l10-10z"/><path d="M11 4.5l4.5 4.5"/></svg>',
  trash: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4 6h12M8 6V4h4v2M6 6v10a1 1 0 001 1h6a1 1 0 001-1V6"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  tile: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/>',
};

const TAP_SELECTS = 'select[id$="-edit-action"], select.hb-action, #rw-block-tap-action';
const PAGE_LABEL = { home: 'Home', rewards: 'Rewards', locations: 'Locations', more: 'More' };

export function initPages(ctx) {
  const { showToast, markDirty } = ctx;
  const root = document.getElementById('cp-pages');
  const shell = document.getElementById('app-shell');
  if (!root || !shell) return {};

  const customList = root.querySelector('#pg-custom-list');
  const emptyEl = root.querySelector('#pg-empty');
  const countEl = root.querySelector('#pg-count');
  const pages = [];
  let seq = 1;
  let textSeq = 1;
  let editing = null;

  const keyOf = (page) => 'cpage-' + page.id;
  const byKey = (key) => pages.find((page) => keyOf(page) === key);
  const byId = (id) => pages.find((page) => page.id === id);
  const changed = () => document.dispatchEvent(new CustomEvent('como:pages-changed'));

  /* ------------------------------------------------------------ Text Block */

  function createTextBlock(opts = {}) {
    const { stage, list, saved } = opts;
    const key = 'text-block-' + textSeq++;
    const data = { heading: saved?.heading ?? 'A short heading', body: saved?.body ?? 'Write what Members should read here.' };
    const element = document.createElement('div');
    element.className = 'cpage-text-block';
    element.dataset.widget = key;
    const paint = () => {
      element.innerHTML = (data.heading ? `<div class="rw-block-h">${esc(data.heading)}</div>` : '')
        + (data.body ? `<div class="rw-block-p">${esc(data.body)}</div>` : '');
    };
    paint();
    stage.appendChild(element);

    const row = document.createElement('div');
    row.className = 'cp-widget-row on rw-row-block editing';
    row.dataset.dynamic = '1';
    row.innerHTML = `<div class="rw-row-head">
        <span class="handle">⠿</span>
        <span class="w-name">Text Block</span>
        <button class="w-del-icon" type="button" title="Remove section">${ICON.trash}</button>
      </div>
      <div class="rw-row-inline">
        <input class="cp-input-text" data-inline="heading" value="${esc(data.heading)}" placeholder="Heading (optional)" />
        <textarea class="cp-input-text cp-textarea" data-inline="body" rows="3" placeholder="Write what Members should read here…">${esc(data.body)}</textarea>
      </div>`;
    row.querySelector('[data-inline="heading"]').addEventListener('input', (event) => { data.heading = event.target.value; paint(); markDirty(); });
    row.querySelector('[data-inline="body"]').addEventListener('input', (event) => { data.body = event.target.value; paint(); markDirty(); });
    row.querySelector('.w-del-icon').addEventListener('click', (event) => {
      event.stopPropagation();
      element.remove();
      row.remove();
      markDirty();
    });
    list.appendChild(row);
    return { key, row, element, capture: () => ({ type: 'text', ...data }) };
  }

  /* ----------------------------------------------------------------- Pages */

  const FACTORIES = () => ({
    promo: ctx.createPromoInstance,
    divider: ctx.createTextDivider,
    image: ctx.createImageBanner,
    text: createTextBlock,
  });

  function createPage({ name = 'New page', silent = false } = {}) {
    const id = 'p' + seq++;
    const page = { id, name, widgets: [] };
    const key = keyOf(page);

    page.element = document.createElement('div');
    page.element.className = 'app-page custom-app-page cpage';
    page.element.dataset.page = key;
    page.element.innerHTML = `<div class="app-top-header cpage-header"><button class="cpage-back" type="button" aria-label="Back">${ICON.back}</button><strong></strong></div><div class="custom-widget-stage"></div><div class="custom-screen-empty">Add sections to build this page</div>`;
    shell.appendChild(page.element);
    page.stage = page.element.querySelector('.custom-widget-stage');
    page.empty = page.element.querySelector('.custom-screen-empty');
    page.element.querySelector('.cpage-back').addEventListener('click', () => goBack());

    page.detail = document.createElement('div');
    page.detail.className = 'cp-detail pg-editor';
    page.detail.dataset.detail = key;
    page.detail.innerHTML = `
      <div class="cp-detail-header"><button class="cp-back" type="button">‹</button><div class="cp-detail-title"></div></div>
      <div class="cp-field"><label>Page name</label><input class="cp-input-text pg-name" maxlength="24" /></div>
      <div class="cp-section open">
        <div class="cp-head-row">Sections <span class="pc-count pg-section-count">0</span> <span class="chev">›</span></div>
        <div class="cp-body">
          <div class="custom-widget-list pg-section-list"></div>
          <div class="cp-add-widget-wrap">
            <button class="cp-add-widget-btn" type="button" data-pg-add>+ Add Section</button>
            <div class="cp-add-widget-menu">
              <button type="button" data-pg-section="promo">Promo Cards</button>
              <button type="button" data-pg-section="text">Text Block</button>
              <button type="button" data-pg-section="divider">Text Divider</button>
              <button type="button" data-pg-section="image">Image Banner</button>
            </div>
          </div>
          <div class="cp-hint-inline">Link a Promo Card or Image Banner to another page with its Open page tap action. Pages can open one more page, no deeper.</div>
        </div>
      </div>
      <div class="cp-section open">
        <div class="cp-head-row">Where Members find this page <span class="chev">›</span></div>
        <div class="cp-body">
          <div class="pg-reach-list"></div>
          <button class="ms-btn pg-place-btn" type="button">Choose where…</button>
        </div>
      </div>
      <button class="pg-delete" type="button">Delete page</button>`;
    root.appendChild(page.detail);
    page.list = page.detail.querySelector('.pg-section-list');
    page.nameInput = page.detail.querySelector('.pg-name');
    page.nameInput.value = name;
    page.detail.querySelector('.cp-back').addEventListener('click', () => window.closeDrill?.('cp-pages'));

    const addMenu = page.detail.querySelector('.cp-add-widget-menu');
    page.detail.querySelector('[data-pg-add]').addEventListener('click', (event) => { event.stopPropagation(); addMenu.classList.toggle('open'); });
    document.addEventListener('click', () => addMenu.classList.remove('open'));
    page.detail.querySelectorAll('[data-pg-section]').forEach((button) => button.addEventListener('click', () => {
      addMenu.classList.remove('open');
      addSection(page, button.dataset.pgSection);
    }));
    page.detail.querySelector('.pg-place-btn').addEventListener('click', () => openPlacement(page));
    page.nameInput.addEventListener('input', () => { rename(page, page.nameInput.value); markDirty(); });

    const deleteBtn = page.detail.querySelector('.pg-delete');
    let armed = null;
    deleteBtn.addEventListener('click', () => {
      if (armed) { clearTimeout(armed); armed = null; removePage(page); return; }
      deleteBtn.textContent = 'Click again to delete this page';
      deleteBtn.classList.add('armed');
      armed = setTimeout(() => { armed = null; deleteBtn.textContent = 'Delete page'; deleteBtn.classList.remove('armed'); }, 3000);
    });

    ctx.initReorderable?.(page.list, () => { syncStage(page); markDirty(); });
    new MutationObserver(() => syncStage(page)).observe(page.list, { childList: true });

    pages.push(page);
    rename(page, name, { silent: true });
    syncStage(page);
    renderMaster();
    refreshActionSelects();
    if (!silent) { markDirty(); changed(); }
    return page;
  }

  function addSection(page, kind, saved) {
    const factory = FACTORIES()[kind];
    if (!factory) return null;
    const instance = factory({ stage: page.stage, config: root, list: page.list, saved, restoring: !!saved });
    if (instance) page.widgets.push(instance);
    syncStage(page);
    refreshActionSelects();
    return instance;
  }

  function syncStage(page) {
    page.widgets = page.widgets.filter((widget) => widget.row?.isConnected);
    [...page.list.querySelectorAll('.cp-widget-row')].forEach((row) => {
      const widget = page.widgets.find((item) => item.row === row);
      if (widget?.element) page.stage.appendChild(widget.element);
    });
    page.empty.hidden = page.stage.children.length > 0;
    const count = page.detail.querySelector('.pg-section-count');
    if (count) count.textContent = String(page.widgets.length);
    refreshActionSelects();
    renderMaster();
  }

  function rename(page, value, { silent = false } = {}) {
    page.name = (value || '').trim() || 'New page';
    page.element.querySelector('.cpage-header strong').textContent = page.name;
    page.detail.querySelector('.cp-detail-title').textContent = page.name;
    const tile = tileOf(page);
    if (tile) { tile.querySelector('.t-name').textContent = page.name; window.moreTiles?.sync(); }
    refreshActionSelects();
    renderMaster();
    if (!silent) changed();
  }

  function removePage(page) {
    [...page.list.querySelectorAll('.w-del-icon')].forEach((button) => button.click());
    tileOf(page)?.remove();
    window.moreTiles?.sync();
    if (window.getSlotPageKey?.() === keyOf(page)) window.clearSlotPage?.();
    page.element.remove();
    page.detail.remove();
    pages.splice(pages.indexOf(page), 1);
    if (editing === page) editing = null;
    if (openRef === page) openRef = null;
    window.closeL3Panel?.();
    window.closeDrill?.('cp-pages');
    renderMaster();
    refreshActionSelects();
    markDirty();
    changed();
    showToast(`“${page.name}” deleted`, { variant: 'success' });
  }

  /* ---------------------------------------------------------- Phone paging */

  const stack = [];
  const originalShow = window.showPhonePage;
  const activePhonePage = () => shell.querySelector('.app-page.active')?.dataset.page;
  window.showPhonePage = (key) => {
    const current = activePhonePage();
    if (typeof key === 'string' && key.startsWith('cpage-')) {
      if (!byKey(key)) { showToast('That page was deleted.', { variant: 'error' }); return undefined; }
      if (current && current !== key) stack.push(current);
    } else stack.length = 0;
    return originalShow?.(key);
  };
  function goBack() {
    let previous = stack.pop() || 'more';
    if (previous.startsWith('cpage-') && !byKey(previous)) previous = 'more';
    originalShow?.(previous);
  }
  document.addEventListener('como:stepchange', () => { stack.length = 0; });

  /* ---------------------------------------------------------- More tiles */

  const tileOf = (page) => document.querySelector(`.more-tile[data-member-page="${keyOf(page)}"]`);
  const inMore = (page) => { const tile = tileOf(page); return !!tile && !tile.classList.contains('hidden-slot'); };

  function addMoreTile(page) {
    let tile = tileOf(page);
    if (tile) {
      if (tile.classList.contains('hidden-slot')) document.querySelector(`#cp-more .more-tile-row[data-tile-key="${keyOf(page)}"] .toggle`)?.click();
      return tile;
    }
    const grid = document.querySelector('.more-grid');
    const proto = grid?.querySelector('.more-tile');
    if (!grid || !proto) return null;
    tile = proto.cloneNode(true);
    tile.removeAttribute('onclick');
    tile.classList.remove('hidden-slot');
    tile.dataset.memberPage = keyOf(page);
    tile.dataset.tileKey = keyOf(page);
    tile.querySelector('.t-name').textContent = page.name;
    tile.querySelector('.t-sub').textContent = 'Custom page';
    const icon = tile.querySelector('.t-ic svg');
    if (icon) icon.innerHTML = ICON.tile;
    grid.appendChild(tile);
    window.moreTiles?.sync();
    return tile;
  }

  /* -------------------------------------------------------- Reachability */

  const hostLabel = (hostKey) => {
    if (hostKey.startsWith('cpage-')) return `Opened from ${byKey(hostKey)?.name || 'a page'}`;
    if (hostKey === 'menu' || hostKey === 'custom-menu') return `Tap action on the ${slotTabName()} tab`;
    return `Tap action on ${PAGE_LABEL[hostKey] || hostKey}`;
  };

  function reach(page) {
    const key = keyOf(page);
    const out = [];
    if (inMore(page)) out.push('Tile in More');
    if (window.getSlotPageKey?.() === key) out.push(`The ${slotTabName()} tab`);
    const hosts = new Set();
    shell.querySelectorAll(`[data-preview-page="${key}"], [data-rw-action="${key}"]`).forEach((element) => {
      if (element.closest('.hidden-slot')) return;
      const host = element.closest('.app-page')?.dataset.page;
      if (host && host !== key) hosts.add(host);
    });
    hosts.forEach((host) => out.push(hostLabel(host)));
    return out;
  }

  function outgoing(page) {
    return new Set([...page.element.querySelectorAll('[data-preview-page^="cpage-"]')].map((el) => el.dataset.previewPage).filter((key) => key !== keyOf(page)));
  }
  function isSecondLevel(page) {
    const key = keyOf(page);
    return pages.some((other) => other !== page && outgoing(other).has(key));
  }

  /* ---------------------------------------------------- Tap action options */

  function hostOfSelect(select) {
    const detail = select.closest('.cp-detail')?.dataset.detail || '';
    for (const page of pages) {
      for (const widget of page.widgets) {
        const key = widget.key || '';
        const idp = /^promo-cards-(\d+)$/.test(key) ? 'pc' + key.split('-').pop() : null;
        if (detail === key || (idp && detail === idp + '-card-edit')) return page;
      }
    }
    return null;
  }

  function refreshActionSelects() {
    document.querySelectorAll(TAP_SELECTS).forEach((select) => {
      const host = hostOfSelect(select);
      let candidates = pages.slice();
      let note = '';
      if (host) {
        if (isSecondLevel(host)) { candidates = []; note = 'Pages can go two levels deep, no deeper'; }
        else candidates = candidates.filter((page) => page !== host && outgoing(page).size === 0);
      }
      const signature = candidates.map((page) => keyOf(page) + ':' + page.name).join('|') + '#' + note;
      const existing = select.querySelector('optgroup[data-pages]');
      if (existing?.dataset.sig === signature) return;
      const current = select.value;
      existing?.remove();
      if (!candidates.length && !note) return;
      const group = document.createElement('optgroup');
      group.dataset.pages = '1';
      group.dataset.sig = signature;
      group.label = 'Pages';
      candidates.forEach((page) => {
        const option = document.createElement('option');
        option.value = keyOf(page);
        option.textContent = `Open page: ${page.name}`;
        group.appendChild(option);
      });
      if (note) {
        const option = document.createElement('option');
        option.disabled = true;
        option.textContent = note;
        group.appendChild(option);
      }
      select.appendChild(group);
      if (current && [...select.options].some((option) => option.value === current)) select.value = current;
    });
  }
  document.addEventListener('change', (event) => {
    if (event.target.matches?.(TAP_SELECTS)) {
      requestAnimationFrame(() => { refreshActionSelects(); renderMaster(); changed(); });
    }
  });
  document.addEventListener('mousedown', (event) => {
    if (event.target.matches?.(TAP_SELECTS)) refreshActionSelects();
  }, true);
  let selectScan = 0;
  new MutationObserver((mutations) => {
    const hasNewSelect = mutations.some((m) => [...m.addedNodes].some((node) => node.nodeType === 1 && (node.matches?.('select') || node.querySelector?.('select'))));
    if (!hasNewSelect) return;
    cancelAnimationFrame(selectScan);
    selectScan = requestAnimationFrame(refreshActionSelects);
  }).observe(document.body, { childList: true, subtree: true });

  /* --------------------------------------------------------------- Manager */

  function renderMaster() {
    if (countEl) countEl.textContent = String(pages.length);
    if (emptyEl) emptyEl.hidden = pages.length > 0;
    if (customList) {
      customList.innerHTML = '';
      pages.forEach((page) => {
        const where = reach(page);
        const row = document.createElement('div');
        row.className = 'cp-widget-row on pg-row';
        row.innerHTML = `<span class="w-name">${esc(page.name)}</span>
          <span class="pg-status ${where.length ? 'ok' : 'warn'}" title="${esc(where.join(', '))}">${where.length ? esc(where.length === 1 ? where[0] : `${where[0]} +${where.length - 1}`) : 'Not linked yet'}</span>
          <button class="w-edit-icon" type="button" title="Edit page" aria-label="Edit ${esc(page.name)}">${ICON.pencil}</button>`;
        row.addEventListener('click', () => openPage(page));
        customList.appendChild(row);
      });
    }
    pages.forEach((page) => {
      const wrap = page.detail.querySelector('.pg-reach-list');
      if (!wrap) return;
      const where = reach(page);
      wrap.innerHTML = where.length
        ? where.map((label) => `<div class="pg-reach-item ok">${esc(label)}</div>`).join('')
        : '<div class="pg-reach-item warn">Not linked anywhere yet. Members cannot open this page.</div>';
    });
  }

  // The page editor lives in the Pages step. Opened from More or the tab step,
  // finishing the page takes the merchant back to where they started.
  let openRef = null;
  let returnTo = null;
  const STEP_NAMES = { menu: () => 'tab setup', more: () => 'More' };
  function openPage(page, { origin = null } = {}) {
    editing = page;
    openRef = page;
    returnTo = origin;
    if (window.getCurrentStep?.() !== 'pages') window.goToStep?.('pages');
    window.openDrill?.('cp-pages', keyOf(page));
    originalShow?.(keyOf(page));
    renderMaster();
  }
  window.openCustomPage = (id, origin = null) => {
    const page = byId(id);
    if (page) openPage(page, { origin });
  };

  const baseCloseDrill = window.closeDrill;
  window.closeDrill = (pageId) => {
    const finished = pageId === 'cp-pages' ? openRef : null;
    baseCloseDrill?.(pageId);
    if (!finished) return;
    openRef = null;
    const origin = returnTo;
    returnTo = null;
    if (origin) { window.goToStep?.(origin); return; }
    // The placement question comes once the page has content, not at creation.
    if (pages.includes(finished) && finished.widgets.length && !reach(finished).length && !finished.prompted) {
      finished.prompted = true;
      openPlacement(finished);
    }
  };
  window.drillBackLabel = () => (returnTo && openRef && window.getCurrentStep?.() === 'pages' ? `Back to ${STEP_NAMES[returnTo]?.() || 'previous step'}` : '');
  document.addEventListener('como:stepchange', (event) => {
    if (event.detail?.step !== 'pages') { openRef = null; returnTo = null; }
  });

  document.addEventListener('como:stepchange', (event) => {
    if (event.detail?.step !== 'pages') return;
    renderMaster();
    originalShow?.(editing && byKey(keyOf(editing)) ? keyOf(editing) : 'more');
  });
  document.addEventListener('como:pages-changed', renderMaster);
  document.addEventListener('como:screenstate', renderMaster);
  document.addEventListener('como:ordering-mode', renderMaster);

  root.querySelector('#pg-create-btn')?.addEventListener('click', () => createPageFlow({ source: 'pages' }));
  document.getElementById('more-create-page')?.addEventListener('click', () => createPageFlow({ source: 'more' }));

  /* ------------------------------------------------------------ Create flow */

  // One flow for every entry point. From More or the tab step the place is already
  // obvious, so the page is linked there straight away and no question is asked.
  function createPageFlow({ source = 'pages' } = {}) {
    const page = createPage({ name: pages.length ? `New page ${pages.length + 1}` : 'New page' });
    let origin = null;
    if (source === 'more') { addMoreTile(page); origin = 'more'; showToast(`“${page.name}” added as a tile in More`, { variant: 'success' }); }
    if (source === 'tab') { window.setSlotPage?.(page.id); origin = 'menu'; showToast(`“${page.name}” now shows in your ${slotTabName()} tab`, { variant: 'success' }); }
    openPage(page, { origin });
    requestAnimationFrame(() => {
      page.nameInput.focus();
      page.nameInput.select();
    });
    return page;
  }
  window.createPageFlow = createPageFlow;

  /* ------------------------------------------------------- Placement modal */

  function slotTabName() {
    return document.querySelector('#bottom-nav [data-nav="menu"] span')?.textContent.trim() || 'Menu';
  }

  const modal = document.createElement('div');
  modal.className = 'pg-modal-overlay';
  modal.hidden = true;
  modal.innerHTML = `<div class="pg-modal" role="dialog" aria-modal="true" aria-labelledby="pg-modal-title">
      <button class="pg-modal-close" type="button" aria-label="Close">✕</button>
      <h2 id="pg-modal-title"></h2>
      <p class="pg-modal-sub">Each option takes one click and you can see the result straight away. Change it any time in Pages.</p>
      <div class="pg-options" role="list"></div>
      <div class="pg-modal-actions">
        <button class="gf-btn ghost" type="button" data-pg-done>Skip for now</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  const optionsEl = modal.querySelector('.pg-options');
  const doneBtn = modal.querySelector('[data-pg-done]');
  let placing = null;
  let changedInModal = false;

  const skeleton = {
    more: '<div class="pg-skel"><div class="pg-skel-bar"></div><div class="pg-skel-grid"><i></i><i></i><i></i><i></i><i></i><i class="hl"></i></div></div>',
    tap: '<div class="pg-skel pg-skel-tap"><div class="pg-skel-bar"></div><div class="pg-skel-card"><b></b><s></s><u class="hl"></u></div><span class="pg-skel-arrow">→</span><div class="pg-skel-mini"><div class="pg-skel-bar"></div><b></b><b></b></div></div>',
    tab: '<div class="pg-skel"><div class="pg-skel-bar"></div><div class="pg-skel-body"></div><div class="pg-skel-tabs"><i></i><i></i><i></i><i class="hl"></i><i></i></div></div>',
  };

  // Shows the merchant exactly what a modal action changed, on the phone itself.
  function showOnPhone(key, highlightSelector) {
    // Bring the phone in front of the dimmed backdrop so the change is visible.
    document.body.classList.add('pg-reveal-phone');
    originalShow?.(key);
    const target = highlightSelector && document.querySelector(highlightSelector);
    if (!target) return;
    target.classList.remove('pg-flash');
    void target.offsetWidth;
    target.classList.add('pg-flash');
    target.scrollIntoView?.({ block: 'nearest' });
    setTimeout(() => target.classList.remove('pg-flash'), 2200);
  }

  function optionCard({ id, art, title, text, done, doneText, actionLabel, onAction, onShow, info }) {
    const card = document.createElement('div');
    card.className = 'pg-option' + (done ? ' done' : '') + (info ? ' info' : '');
    card.dataset.option = id;
    card.setAttribute('role', 'listitem');
    card.innerHTML = `<span class="pg-option-art">${art}</span>
      <span class="pg-option-title">${esc(title)}</span>
      <span class="pg-option-text">${text}</span>
      <span class="pg-option-foot"></span>`;
    const foot = card.querySelector('.pg-option-foot');
    if (info) {
      foot.remove();
    } else if (done) {
      foot.innerHTML = `<span class="pg-option-result"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>${esc(doneText)}</span><button type="button" class="pg-option-link">Show me</button>`;
      foot.querySelector('.pg-option-link').addEventListener('click', onShow);
    } else {
      foot.innerHTML = `<button type="button" class="gf-btn primary pg-option-btn">${esc(actionLabel)}</button>`;
      foot.querySelector('.pg-option-btn').addEventListener('click', () => {
        onAction();
        changedInModal = true;
        paintOptions(placing);
        onShow();
      });
    }
    return card;
  }

  function paintOptions(page) {
    const key = keyOf(page);
    const tabName = slotTabName();
    modal.querySelector('#pg-modal-title').textContent = `Where should Members find “${page.name}”?`;
    optionsEl.innerHTML = '';
    optionsEl.appendChild(optionCard({
      id: 'more', art: skeleton.more, title: 'A tile in More',
      text: 'Members open it from the More menu.',
      done: inMore(page), doneText: 'Added',
      actionLabel: 'Add to More',
      onAction: () => { addMoreTile(page); showToast(`“${page.name}” added as a tile in More`, { variant: 'success' }); },
      onShow: () => showOnPhone('more', `.more-tile[data-member-page="${key}"]`),
    }));
    // Only a loyalty-only app has a free tab; with ordering it holds Order.
    if (ctx.getOrderingMode?.() === 'skip') {
      const inTab = window.getSlotPageKey?.() === key;
      optionsEl.appendChild(optionCard({
        id: 'tab', art: skeleton.tab, title: 'A tab in the bottom bar',
        text: inTab ? `This page now fills the <b>${esc(tabName)}</b> tab.` : `Show this page in your <b>${esc(tabName)}</b> tab instead of what it shows now.`,
        done: inTab, doneText: 'Added',
        actionLabel: `Show in the ${tabName} tab`,
        onAction: () => { window.setSlotPage?.(page.id); showToast(`“${page.name}” now shows in the bottom bar`, { variant: 'success' }); },
        onShow: () => showOnPhone(key, '#bottom-nav [data-nav="menu"]'),
      }));
    }
    optionsEl.appendChild(optionCard({
      id: 'tap', art: skeleton.tap, title: 'From a tap action', info: true,
      text: `Anything with a <b>Tap action</b> can open this page: Promo Cards and Image Banners on Home, Rewards blocks, and sections inside your other pages. Choose <b>Open page: ${esc(page.name)}</b>.`,
    }));
    optionsEl.dataset.count = String(optionsEl.children.length);
    doneBtn.textContent = changedInModal ? 'Done' : 'Skip for now';
    doneBtn.classList.toggle('primary', changedInModal);
    doneBtn.classList.toggle('ghost', !changedInModal);
  }

  function openPlacement(page) {
    placing = page;
    changedInModal = false;
    paintOptions(page);
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add('open'));
    (optionsEl.querySelector('.pg-option-btn') || doneBtn).focus();
  }
  function closePlacement() {
    const page = placing;
    modal.classList.remove('open');
    modal.hidden = true;
    document.body.classList.remove('pg-reveal-phone');
    placing = null;
    renderMaster();
    if (changedInModal) { markDirty(); changed(); }
    else if (page) showToast('You can link this page later with Choose where in its editor.');
  }
  modal.querySelector('.pg-modal-close').addEventListener('click', closePlacement);
  doneBtn.addEventListener('click', closePlacement);
  modal.addEventListener('click', (event) => { if (event.target === modal) closePlacement(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !modal.hidden) closePlacement(); });

  /* ------------------------------------------------------------ Public API */

  window.getCustomPages = () => pages.map((page) => ({ id: page.id, key: keyOf(page), name: page.name }));
  window.getPagesReadiness = () => ({
    total: pages.length,
    unreachable: pages.filter((page) => reach(page).length === 0).map((page) => page.name),
  });
  renderMaster();

  function capturePages() {
    return pages.map((page) => ({
      id: page.id, name: page.name,
      widgets: [...page.list.querySelectorAll('.cp-widget-row')].map((row) => page.widgets.find((widget) => widget.row === row)).filter(Boolean).map((widget) => widget.capture()),
    }));
  }
  function restorePages(saved = []) {
    [...pages].forEach((page) => removePage(page));
    saved.forEach((item) => {
      const page = createPage({ name: item.name, silent: true });
      (item.widgets || []).forEach((widget) => addSection(page, widget.type, widget));
    });
  }

  return { createTextBlock, createCustomPage: createPage, exportPages: capturePages, importPages: restorePages };
}
