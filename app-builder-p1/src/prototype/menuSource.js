/**
 * Menu source flow — the whole Menu tab of the config panel plus the phone
 * preview that mirrors it.
 *
 * Screens live in `templates/config-menu.html` as `.ms-screen[data-ms]` blocks;
 * this module owns which one is showing, the manual menu data model, and the
 * single `renderPhone()` pass that redraws the phone for the current state.
 */

const ICON = {
  chev: '<svg class="ms-row-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>',
  grip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M9 7V5h6v2"/><path d="M6 7l1 13h10l1-13"/></svg>',
  tick: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  pencil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8.5 10.5V7a3.5 3.5 0 017 0v3.5"/></svg>',
  reload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 01-9 9 9 9 0 01-7.6-4.2"/><path d="M3 12a9 9 0 019-9 9 9 0 017.6 4.2"/><path d="M20 3v5h-5M4 21v-5h5"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M15 6l-6 6 6 6"/></svg>',
  cutlery: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 3l7 7"/><path d="M20 3L9.5 13.5"/><path d="M13.5 12.5L20 19"/><path d="M7.5 14.5L4 18"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8L3.5 9.7l5.9-.9z"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 8h12M6 12h12M6 16h8"/></svg>',
};

const SWATCH = ['#8a6a4a', '#b4585e', '#7a6bb0', '#5f8a6a', '#c08a3e', '#4a6f8a'];

const HEROES = [
  { name: 'hero-dining.jpg', background: 'linear-gradient(135deg,#8a6a4a,#5c4433 58%,#25160f)' },
  { name: 'chef-counter.jpg', background: 'linear-gradient(135deg,#334155,#111827 56%,#0f766e)' },
  { name: 'seasonal-table.jpg', background: 'linear-gradient(135deg,#8f3d55,#4c1d34 55%,#d97706)' },
  { name: 'garden-terrace.jpg', background: 'linear-gradient(135deg,#3f6b57,#153d32 58%,#d4a648)' },
];

const DIET_TAGS = ['Gluten', 'Sesame', 'Veg', 'Vegan', 'Nut', 'Dairy'];

function uid(prefix) {
  return prefix + '-' + Math.random().toString(36).slice(2, 8);
}

function seedCategories() {
  return [
    {
      id: uid('cat'), name: 'Starters', color: SWATCH[0], hero: true,
      items: [
        { id: uid('it'), name: 'Truffle Arancini', desc: 'Crispy · shaved parmesan', price: '$14', cal: '340 kcal', layout: 'card', color: SWATCH[0], tags: ['Gluten', 'Dairy'], available: true, badge: 'Popular' },
        { id: uid('it'), name: 'Burrata & Heirloom', desc: 'Basil oil · sea salt', price: '$16', cal: '290 kcal', layout: 'card', color: SWATCH[1], tags: ['Veg'], available: true },
        { id: uid('it'), name: 'Tuna Tartare', desc: 'Yuzu · avocado · nori', price: '$18', cal: '260 kcal', layout: 'card', color: SWATCH[5], tags: ['Sesame'], available: true },
      ],
    },
    {
      id: uid('cat'), name: 'Mains', color: SWATCH[1], hero: false,
      items: [
        { id: uid('it'), name: 'Wagyu Gold Stack', desc: 'Aged cheddar · brioche', price: '$28', cal: '820 kcal', layout: 'card', color: SWATCH[2], tags: ['Gluten', 'Dairy'], available: true },
        { id: uid('it'), name: 'Sea Bass', desc: 'Fennel · citrus · olive oil', price: '$36', cal: '540 kcal', layout: 'card', color: SWATCH[5], tags: [], available: true },
        { id: uid('it'), name: 'Falafel Green Bowl', desc: 'Freekeh · herbs · tahini', price: '$14.20', cal: '480 kcal', layout: 'card', color: SWATCH[3], tags: ['Vegan', 'Sesame'], available: true, badge: 'Veg' },
      ],
    },
    {
      id: uid('cat'), name: 'Desserts', color: SWATCH[2], hero: true,
      items: [
        { id: uid('it'), name: 'Dark Chocolate Tart', desc: 'Sea salt · crème fraîche', price: '$14', cal: '520 kcal', layout: 'card', color: SWATCH[4], tags: ['Dairy', 'Nut'], available: true },
        { id: uid('it'), name: 'Vanilla Bean Crème', desc: 'Bourbon vanilla · caramel', price: '$11', cal: '410 kcal', layout: 'card', color: SWATCH[0], tags: ['Dairy'], available: true },
      ],
    },
  ];
}

export function initMenuSource(ctx) {
  const { showToast, markDirty, openL3Panel, closeL3Panel, goToPage } = ctx;

  const page = document.getElementById('cp-menu');
  if (!page) return {};
  const phonePage = document.querySelector('.app-page[data-page="menu"]');
  const phoneRender = document.getElementById('pm-render');
  const screens = [...page.querySelectorAll('.ms-screen')];

  const state = {
    approach: null,
    integration: null,
    screen: 'chooser',
    webview: { url: 'https://velvetbistro.com/menu', connected: false, back: true, bottombar: true, inapp: true, hideheader: false, membersonly: false },
    pdf: { uploaded: false },
    custom: { url: 'https://order.velvetbistro.com', connected: false, back: true, bottombar: true, inapp: true, membersonly: true, theme: true, hideheader: true, color: '#6d28d9' },
    ordering: { layout: 'grid', color: '#6d28d9', allergens: true, banner: true, hero: 0 },
    manual: { started: false, categories: seedCategories(), activeCat: null, activeItem: null, hero: null },
  };

  /* ------------------------------------------------------------- screens */

  function show(screen) {
    state.screen = screen;
    screens.forEach(s => s.classList.toggle('active', s.dataset.ms === screen));
    document.getElementById('config-panel').scrollTop = 0;
    if (screen !== 'build-items') closeL3Panel();
    renderPhone();
  }

  function resetApproach() {
    state.approach = null;
    state.integration = null;
    state.manual.activeCat = null;
    state.manual.activeItem = null;
    page.querySelectorAll('[data-approach]').forEach(o => o.classList.remove('on'));
    show('chooser');
    markDirty();
  }

  page.querySelectorAll('[data-approach]').forEach(opt => {
    opt.addEventListener('click', () => {
      const approach = opt.dataset.approach;
      page.querySelectorAll('[data-approach]').forEach(o => o.classList.toggle('on', o === opt));
      state.approach = approach;
      markDirty();
      if (approach === 'webview') show('webview');
      else if (approach === 'pdf') show('pdf');
      else if (approach === 'ordering') show(orderingApi().connected ? 'oo-connected' : 'oo-integration');
      else if (approach === 'manual') show(state.manual.started ? 'build-categories' : 'build-method');
    });
  });

  page.querySelectorAll('[data-ms-change]').forEach(b => b.addEventListener('click', resetApproach));
  page.querySelectorAll('[data-ms-back]').forEach(b => b.addEventListener('click', () => show(b.dataset.msBack)));
  page.querySelectorAll('[data-ms-help]').forEach(b => {
    b.addEventListener('click', () => showToast('The Help Center would open in a new tab'));
  });

  /* ------------------------------------------------------------- webview */

  const webUrl = document.getElementById('ms-webview-url');
  const webStatus = document.getElementById('ms-webview-status');
  webUrl.addEventListener('input', () => {
    state.webview.url = webUrl.value;
    state.webview.connected = false;
    webStatus.classList.add('hidden');
    renderPhone();
  });
  document.getElementById('ms-webview-connect').addEventListener('click', () => {
    state.webview.url = webUrl.value.trim() || 'https://velvetbistro.com/menu';
    state.webview.connected = true;
    webStatus.classList.remove('hidden');
    markDirty();
    renderPhone();
    showToast('Loaded ' + hostOf(state.webview.url) + ' in the preview');
  });
  page.querySelectorAll('[data-web-opt]').forEach(t => {
    t.addEventListener('click', () => {
      state.webview[t.dataset.webOpt] = t.classList.contains('on');
      renderPhone();
    });
  });

  /* ----------------------------------------------------------------- pdf */

  const pdfFile = document.getElementById('ms-pdf-file');
  const pdfReplace = document.getElementById('ms-pdf-replace');
  const pdfDrop = document.getElementById('ms-pdf-drop');
  function setPdf(on) {
    state.pdf.uploaded = on;
    pdfFile.hidden = !on;
    pdfReplace.hidden = !on;
    pdfDrop.style.display = on ? 'none' : '';
    renderPhone();
  }
  pdfDrop.addEventListener('click', () => { setPdf(true); markDirty(); showToast('velvet-bistro-dinner.pdf rendered in the preview'); });
  document.getElementById('ms-pdf-remove').addEventListener('click', () => { setPdf(false); markDirty(); });
  pdfReplace.addEventListener('click', () => { setPdf(false); });

  /* ----------------------------------------------- online ordering (both) */

  function orderingApi() {
    return ctx.ordering || { connected: false, provider: { name: 'Deliverect', mark: 'D', color: '#0fa47f' } };
  }

  page.querySelectorAll('[data-integration]').forEach(opt => {
    opt.addEventListener('click', () => {
      page.querySelectorAll('[data-integration]').forEach(o => o.classList.toggle('on', o === opt));
      state.integration = opt.dataset.integration;
      if (state.integration === 'native') {
        if (orderingApi().connected) show('oo-connected');
        else if (ctx.gotoOrderingStep) { ctx.gotoOrderingStep('chooser'); window.openSettings('online-ordering'); }
      } else {
        show('oo-custom');
      }
      markDirty();
    });
  });

  document.getElementById('ms-oo-manage').addEventListener('click', () => {
    if (ctx.gotoOrderingStep) { ctx.gotoOrderingStep('admin'); window.openSettings('online-ordering'); }
  });

  page.querySelectorAll('[data-ordering-opt]').forEach(t => {
    t.addEventListener('click', () => {
      state.ordering[t.dataset.orderingOpt] = t.classList.contains('on');
      renderPhone();
    });
  });
  page.querySelectorAll('[data-layouts="ordering"] .ms-layout').forEach(btn => {
    btn.addEventListener('click', () => {
      page.querySelectorAll('[data-layouts="ordering"] .ms-layout').forEach(b => b.classList.toggle('on', b === btn));
      state.ordering.layout = btn.dataset.layout;
      markDirty();
      renderPhone();
    });
  });
  wireSwatches('ordering', (hex) => { state.ordering.color = hex; renderPhone(); });
  wireSwatches('custom', (hex) => { state.custom.color = hex; renderPhone(); });

  const orderingHeroThumb = document.getElementById('ms-ordering-hero-thumb');
  const orderingHeroName = document.getElementById('ms-ordering-hero-name');
  function renderOrderingHeroControl() {
    const hero = HEROES[state.ordering.hero];
    orderingHeroThumb.style.backgroundImage = hero.background;
    orderingHeroName.textContent = hero.name;
  }
  document.getElementById('ms-ordering-hero-replace').addEventListener('click', () => {
    state.ordering.hero = (state.ordering.hero + 1) % HEROES.length;
    renderOrderingHeroControl();
    markDirty();
    renderPhone();
    showToast('Header image replaced in the live ordering preview');
  });

  function wireSwatches(group, apply) {
    page.querySelectorAll('[data-swatches="' + group + '"] .ms-swatch').forEach(sw => {
      sw.addEventListener('click', () => {
        page.querySelectorAll('[data-swatches="' + group + '"] .ms-swatch').forEach(s => s.classList.toggle('on', s === sw));
        apply(sw.dataset.color);
        markDirty();
      });
    });
  }

  /* --------------------------------------------------- custom provider web */

  const customUrl = document.getElementById('ms-custom-url');
  customUrl.addEventListener('input', () => {
    state.custom.url = customUrl.value;
    state.custom.connected = false;
    renderPhone();
  });
  document.getElementById('ms-custom-connect').addEventListener('click', () => {
    state.custom.url = customUrl.value.trim() || 'https://order.velvetbistro.com';
    state.custom.connected = true;
    markDirty();
    renderPhone();
    showToast('Loaded ' + hostOf(state.custom.url) + ' in the preview');
  });
  page.querySelectorAll('[data-custom-opt]').forEach(t => {
    t.addEventListener('click', () => {
      state.custom[t.dataset.customOpt] = t.classList.contains('on');
      renderPhone();
    });
  });

  /* ------------------------------------------------------- manual builder */

  document.getElementById('ms-build-scratch').addEventListener('click', () => {
    state.manual.started = true;
    markDirty();
    renderCategories();
    show('build-categories');
  });
  document.getElementById('ms-build-import').addEventListener('click', () => {
    state.manual.started = true;
    markDirty();
    renderCategories();
    show('build-categories');
    showToast('Imported velvet-menu.csv · 3 categories, 8 items mapped');
  });
  document.getElementById('ms-build-ai').addEventListener('click', () => {
    showToast('We’ll email you when AI menu drafting ships');
  });

  const catList = document.getElementById('ms-category-list');
  const itemList = document.getElementById('ms-item-list');

  function catById(id) { return state.manual.categories.find(c => c.id === id); }
  function activeCat() { return catById(state.manual.activeCat); }
  function activeItem() {
    const cat = activeCat();
    return cat ? cat.items.find(i => i.id === state.manual.activeItem) : null;
  }

  function renderCategories() {
    catList.innerHTML = state.manual.categories.map(cat => `
      <div class="ms-row" data-cat="${cat.id}">
        <span class="ms-handle" data-drag>${ICON.grip}</span>
        <span class="ms-row-thumb" style="background:${cat.color}"></span>
        <span class="ms-row-text">
          <span class="ms-row-name">${escapeHtml(cat.name)}</span>
          <span class="ms-row-meta">${cat.items.length} item${cat.items.length === 1 ? '' : 's'} · ${cat.hero ? 'hero image set' : 'add hero image'}</span>
        </span>
        <button class="ms-row-del" type="button" data-del-cat title="Delete category">${ICON.trash}</button>
        ${ICON.chev}
      </div>`).join('');

    catList.querySelectorAll('.ms-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('[data-drag]')) return;
        if (e.target.closest('[data-del-cat]')) {
          const id = row.dataset.cat;
          state.manual.categories = state.manual.categories.filter(c => c.id !== id);
          renderCategories();
          markDirty();
          renderPhone();
          showToast('Category removed');
          return;
        }
        openCategory(row.dataset.cat);
      });
    });
    makeSortable(catList, () => {
      state.manual.categories = [...catList.querySelectorAll('.ms-row')].map(r => catById(r.dataset.cat));
      markDirty();
      renderPhone();
    });
  }

  document.getElementById('ms-add-category').addEventListener('click', addCategory);
  document.getElementById('ms-new-category').addEventListener('click', addCategory);
  function addCategory() {
    const n = state.manual.categories.length;
    state.manual.categories.push({
      id: uid('cat'),
      name: 'New category',
      color: SWATCH[n % SWATCH.length],
      hero: false,
      items: [],
    });
    markDirty();
    renderCategories();
    renderPhone();
    const last = catList.lastElementChild;
    if (last) startRename(last, state.manual.categories[state.manual.categories.length - 1], renderCategories);
  }

  const manualHero = document.getElementById('ms-menu-hero');
  const manualHeroButton = document.getElementById('ms-hero-set');
  function renderManualHeroControl() {
    if (state.manual.hero === null) {
      manualHero.classList.add('empty');
      manualHero.style.backgroundImage = '';
      manualHero.innerHTML = `<div class="ms-hero-empty">${ICON.plus}<span>Add a wide menu header</span></div>`;
      manualHeroButton.textContent = 'Set';
      return;
    }
    const hero = HEROES[state.manual.hero];
    manualHero.classList.remove('empty');
    manualHero.style.backgroundImage = hero.background;
    manualHero.innerHTML = `<span class="ms-hero-file">${escapeHtml(hero.name)}</span>`;
    manualHeroButton.textContent = 'Replace';
  }
  manualHeroButton.addEventListener('click', () => {
    state.manual.hero = state.manual.hero === null ? 2 : (state.manual.hero + 1) % HEROES.length;
    renderManualHeroControl();
    markDirty();
    renderPhone();
    showToast('Menu hero image updated in the phone preview');
  });

  function openCategory(id) {
    state.manual.activeCat = id;
    state.manual.activeItem = null;
    const cat = activeCat();
    if (!cat) return;
    document.getElementById('ms-items-title').textContent = cat.name;
    document.getElementById('ms-items-meta').textContent =
      cat.items.length + ' item' + (cat.items.length === 1 ? '' : 's') + ' · ' + (cat.hero ? 'category hero image set' : 'no category hero image');
    renderItems();
    show('build-items');
  }

  document.getElementById('ms-items-back').addEventListener('click', () => {
    state.manual.activeCat = null;
    state.manual.activeItem = null;
    closeL3Panel();
    renderCategories();
    show('build-categories');
  });

  document.getElementById('ms-rename-category').addEventListener('click', () => {
    const cat = activeCat();
    if (!cat) return;
    const title = document.getElementById('ms-items-title');
    if (title.querySelector('input')) return;
    const original = cat.name;
    title.innerHTML = `<input class="ms-title-input" type="text" value="${escapeHtml(original)}" aria-label="Category name">`;
    const input = title.querySelector('input');
    const commit = () => {
      const next = input.value.trim();
      cat.name = next || original;
      title.textContent = cat.name;
      renderCategories();
      markDirty();
      renderPhone();
    };
    input.addEventListener('blur', commit, { once: true });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') input.blur();
      if (event.key === 'Escape') { input.value = original; input.blur(); }
    });
    input.focus();
    input.select();
  });

  function renderItems() {
    const cat = activeCat();
    if (!cat) return;
    itemList.innerHTML = cat.items.map(item => `
      <div class="ms-row${item.id === state.manual.activeItem ? ' on' : ''}${item.available ? '' : ' is-off'}" data-item="${item.id}">
        <span class="ms-handle" data-drag>${ICON.grip}</span>
        <span class="ms-row-thumb" style="background:${item.color}"></span>
        <span class="ms-row-text">
          <span class="ms-row-name">${escapeHtml(item.name)}</span>
          <span class="ms-row-meta">${escapeHtml(item.price)}${item.badge ? ' · <span class="ms-tag-mini' + (item.badge === 'Veg' ? ' veg' : '') + '">' + item.badge + '</span>' : ''}${item.available ? '' : ' · <span class="ms-tag-mini off">Unavailable</span>'}</span>
        </span>
        <button class="ms-row-del" type="button" data-del-item title="Delete item">${ICON.trash}</button>
        ${ICON.chev}
      </div>`).join('') || '<div class="ms-tip">No items yet — add your first dish.</div>';

    itemList.querySelectorAll('.ms-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('[data-drag]')) return;
        if (e.target.closest('[data-del-item]')) {
          cat.items = cat.items.filter(i => i.id !== row.dataset.item);
          if (state.manual.activeItem === row.dataset.item) { state.manual.activeItem = null; closeL3Panel(); }
          markDirty();
          openCategory(cat.id);
          renderPhone();
          return;
        }
        openItem(row.dataset.item);
      });
    });
    makeSortable(itemList, () => {
      const order = [...itemList.querySelectorAll('.ms-row')].map(r => r.dataset.item);
      cat.items.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
      markDirty();
      renderPhone();
    });
  }

  document.getElementById('ms-add-item').addEventListener('click', () => {
    const cat = activeCat();
    if (!cat) return;
    const item = {
      id: uid('it'), name: 'New item', desc: '', price: '$0.00', cal: '',
      layout: 'card', color: SWATCH[cat.items.length % SWATCH.length], tags: [], available: true,
    };
    cat.items.push(item);
    markDirty();
    openCategory(cat.id);
    openItem(item.id);
    renderPhone();
  });

  /* --------------------------------------------------------- item editor */

  const editor = document.getElementById('ms-item-editor');
  const fName = document.getElementById('ms-item-name');
  const fDesc = document.getElementById('ms-item-desc');
  const fPrice = document.getElementById('ms-item-price');
  const fCal = document.getElementById('ms-item-cal');
  const fAvail = document.getElementById('ms-item-available');
  const tagWrap = document.getElementById('ms-item-tags');

  function openItem(id) {
    state.manual.activeItem = id;
    const cat = activeCat();
    const item = activeItem();
    if (!item) return;

    document.getElementById('ms-item-back-label').textContent = cat.name;
    document.getElementById('ms-item-heading').textContent = item.name;
    fName.value = item.name;
    fDesc.value = item.desc;
    fPrice.value = item.price;
    fCal.value = item.cal;
    fAvail.classList.toggle('on', item.available);
    document.getElementById('ms-item-photo').style.background = item.color;
    document.getElementById('ms-item-photo-name').textContent =
      item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.jpg';
    editor.querySelectorAll('[data-item-layout]').forEach(b => b.classList.toggle('on', b.dataset.itemLayout === item.layout));

    tagWrap.innerHTML = DIET_TAGS.map(t => `
      <button class="ms-tag${item.tags.includes(t) ? ' on' : ''}" type="button" data-tag="${t}">${ICON.tick}${t}</button>`).join('')
      + `<button class="ms-tag add" type="button" data-tag-add>${ICON.plus}Add</button>`;
    tagWrap.querySelectorAll('[data-tag]').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = btn.dataset.tag;
        const on = !item.tags.includes(t);
        item.tags = on ? [...item.tags, t] : item.tags.filter(x => x !== t);
        btn.classList.toggle('on', on);
        markDirty();
        renderPhone();
      });
    });
    tagWrap.querySelector('[data-tag-add]').addEventListener('click', () => showToast('Custom dietary tags come from your catalog settings'));

    itemList.querySelectorAll('.ms-row').forEach(r => r.classList.toggle('on', r.dataset.item === id));
    openL3Panel(editor);
    renderPhone();
  }

  function bindField(el, key, transform) {
    el.addEventListener('input', () => {
      const item = activeItem();
      if (!item) return;
      item[key] = transform ? transform(el.value) : el.value;
      if (key === 'name') document.getElementById('ms-item-heading').textContent = item.name;
      renderItems();
      itemList.querySelectorAll('.ms-row').forEach(r => r.classList.toggle('on', r.dataset.item === item.id));
      markDirty();
      renderPhone();
    });
  }
  bindField(fName, 'name');
  bindField(fDesc, 'desc');
  bindField(fPrice, 'price');
  bindField(fCal, 'cal');

  fAvail.addEventListener('click', () => {
    const item = activeItem();
    if (!item) return;
    item.available = fAvail.classList.contains('on');
    renderItems();
    itemList.querySelectorAll('.ms-row').forEach(r => r.classList.toggle('on', r.dataset.item === item.id));
    renderPhone();
  });

  editor.querySelectorAll('[data-item-layout]').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = activeItem();
      if (!item) return;
      editor.querySelectorAll('[data-item-layout]').forEach(b => b.classList.toggle('on', b === btn));
      item.layout = btn.dataset.itemLayout;
      markDirty();
      renderPhone();
    });
  });

  document.getElementById('ms-item-photo-replace').addEventListener('click', () => {
    const item = activeItem();
    if (!item) return;
    item.color = SWATCH[(SWATCH.indexOf(item.color) + 1) % SWATCH.length];
    document.getElementById('ms-item-photo').style.background = item.color;
    renderItems();
    itemList.querySelectorAll('.ms-row').forEach(r => r.classList.toggle('on', r.dataset.item === item.id));
    markDirty();
    renderPhone();
  });

  document.getElementById('ms-item-back').addEventListener('click', () => {
    state.manual.activeItem = null;
    closeL3Panel();
    renderItems();
    renderPhone();
  });

  document.getElementById('ms-item-delete').addEventListener('click', () => {
    const cat = activeCat();
    const item = activeItem();
    if (!cat || !item) return;
    cat.items = cat.items.filter(i => i.id !== item.id);
    state.manual.activeItem = null;
    closeL3Panel();
    markDirty();
    openCategory(cat.id);
    renderPhone();
    showToast('Item deleted');
  });

  /* -------------------------------------------------------- inline rename */

  function startRename(row, model, after) {
    const nameEl = row.querySelector('.ms-row-name');
    if (!nameEl) return;
    nameEl.innerHTML = '<input type="text" value="' + escapeHtml(model.name) + '">';
    const input = nameEl.querySelector('input');
    input.focus();
    input.select();
    const commit = () => {
      model.name = input.value.trim() || model.name;
      after();
      markDirty();
      renderPhone();
    };
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
      if (e.key === 'Escape') { input.value = model.name; input.blur(); }
    });
  }

  /* ------------------------------------------------------- drag to reorder */

  function makeSortable(container, onDrop) {
    let dragging = null; let rows = []; let startY = 0; let from = 0; let to = 0; let h = 0;

    const move = (e) => {
      if (!dragging) return;
      const dy = e.clientY - startY;
      dragging.style.transform = 'translateY(' + dy + 'px) scale(1.02)';
      const shift = Math.round(dy / h);
      const next = Math.max(0, Math.min(rows.length - 1, from + shift));
      if (next === to) return;
      to = next;
      rows.forEach((r, i) => {
        if (r === dragging) return;
        let d = 0;
        if (from < to && i > from && i <= to) d = -h;
        else if (from > to && i < from && i >= to) d = h;
        r.style.transform = 'translateY(' + d + 'px)';
      });
    };
    const up = () => {
      if (!dragging) return;
      const row = dragging; const f = from; const t = to;
      row.style.transition = 'transform .22s cubic-bezier(.2,.8,.2,1)';
      row.style.transform = 'translateY(0)';
      setTimeout(() => {
        if (f !== t && rows[t]) {
          const ref = rows[t];
          if (f < t) ref.parentNode.insertBefore(row, ref.nextSibling);
          else ref.parentNode.insertBefore(row, ref);
          onDrop();
        }
        rows.forEach(r => { r.style.transform = ''; r.style.transition = ''; });
        row.classList.remove('dragging');
        dragging = null; rows = [];
      }, 220);
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };

    container.addEventListener('mousedown', (e) => {
      const handle = e.target.closest('[data-drag]');
      if (!handle) return;
      const row = handle.closest('.ms-row');
      if (!row) return;
      e.preventDefault();
      rows = [...container.querySelectorAll('.ms-row')];
      from = rows.indexOf(row); to = from;
      dragging = row; startY = e.clientY; h = row.offsetHeight + 8;
      row.classList.add('dragging');
      rows.forEach(r => { if (r !== row) r.style.transition = 'transform .2s cubic-bezier(.2,.8,.2,1)'; });
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    });
  }

  /* ------------------------------------------------------------ the phone */

  function hostOf(url) {
    return String(url).replace(/^https?:\/\//, '').replace(/\/$/, '');
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function setBottomNav(visible) {
    const nav = document.getElementById('bottom-nav');
    if (nav) nav.style.visibility = visible ? '' : 'hidden';
  }

  function appHeader(title, sub, opts = {}) {
    return `<div class="pm-head">
      <div class="pm-head-left">
        ${opts.back ? '<button class="icon-btn" style="width:32px;height:32px" onclick="goToPage(\'home\')">' + ICON.back + '</button>' : ''}
        <div>
          <div class="pm-head-title">${escapeHtml(title)}</div>
          <div class="pm-head-sub">${escapeHtml(sub)}</div>
        </div>
      </div>
      ${opts.search ? '<button class="icon-btn" title="Search">🔍</button>' : ''}
    </div>`;
  }

  function browserChrome(url, showBack) {
    return `<div class="pm-chrome">
      ${showBack ? '<span class="pm-chrome-btn">' + ICON.back + '</span>' : ''}
      <span class="pm-url">${ICON.lock}${escapeHtml(hostOf(url))}</span>
      <span class="pm-chrome-btn">${ICON.reload}</span>
    </div>`;
  }

  function renderNone() {
    return appHeader('MENU', 'Not set up yet') + `
      <div class="pm-empty">
        <div class="pm-empty-ic">${ICON.cutlery}</div>
        <div class="pm-empty-title">No menu yet</div>
        <div class="pm-empty-sub">Choose how to power your menu to preview it here.</div>
      </div>`;
  }

  function renderWebview() {
    const w = state.webview;
    if (!w.connected) {
      return appHeader('MENU', 'Webview · not loaded') + `
        <div class="pm-empty">
          <div class="pm-empty-ic">${ICON.cutlery}</div>
          <div class="pm-empty-title">Nothing loaded yet</div>
          <div class="pm-empty-sub">Paste your menu web address and press Connect &amp; load.</div>
        </div>`;
    }
    if (w.membersonly) {
      return `<div class="pm-browser">${browserChrome(w.url, w.back)}
        <div class="pm-gate">
          <div class="pm-gate-ic">${ICON.lock}</div>
          <div class="pm-gate-title">Members only</div>
          <div class="pm-gate-sub">Sign in to view the menu and unlock member pricing.</div>
          <button class="pm-gate-btn">Sign in</button>
        </div></div>`;
    }
    const dishes = [
      ['Charred Octopus', 'Smoked paprika, salsa verde', '$24'],
      ['Wagyu Gold Stack', 'Aged cheddar, truffle aioli', '$32'],
      ['Wood-Fired Branzino', 'Fennel, citrus, olive oil', '$29'],
      ['Dark Chocolate Tart', 'Sea salt, crème fraîche', '$14'],
    ];
    return `<div class="pm-browser">${browserChrome(w.url, w.back)}
      <div class="pm-site">
        ${w.hideheader ? '' : `<div class="pm-site-hero"><div class="n">VELVET BISTRO</div><div class="s">Seasonal · Wood-fired · Est. 2012</div></div>`}
        <div class="pm-site-body">
          <div class="pm-site-h">Our Menu</div>
          ${dishes.map(([n, d, p]) => `<div class="pm-site-item"><span><span class="n">${n}</span><span class="d">${d}</span></span><span class="p">${p}</span></div>`).join('')}
        </div>
      </div></div>`;
  }

  function renderPdf() {
    if (!state.pdf.uploaded) {
      return appHeader('MENU', 'PDF menu · no file') + `
        <div class="pm-empty">
          <div class="pm-empty-ic">${ICON.cutlery}</div>
          <div class="pm-empty-title">No PDF uploaded</div>
          <div class="pm-empty-sub">Drop a PDF on the left and it renders here.</div>
        </div>`;
    }
    const rows = [
      ['STARTERS', [['Truffle Arancini', '14'], ['Burrata & Heirloom', '16'], ['Tuna Tartare', '18']]],
      ['MAINS', [['Wagyu Gold Stack', '42'], ['Angus Smash', '24'], ['Seared Sea Bass', '36']]],
      ['DESSERTS', [['Dark Chocolate Torte', '12'], ['Vanilla Bean Crème', '11']]],
    ];
    return appHeader('MENU', 'PDF menu · Page 1 of 2') + `
      <div class="pm-pdf">
        <div class="pm-paper">
          <div class="pm-paper-title">VELVET BISTRO</div>
          <div class="pm-paper-sub">DINNER MENU</div>
          ${rows.map(([sec, items]) => `<div class="pm-paper-sec">${sec}</div>` +
            items.map(([n, p]) => `<div class="pm-paper-row"><span>${n}</span><span>${p}</span></div>`).join('')).join('')}
        </div>
        <div class="pm-pager">1 / 2</div>
      </div>`;
  }

  function renderCustom() {
    const c = state.custom;
    if (!c.connected) {
      return appHeader('MENU', 'Custom provider · not loaded') + `
        <div class="pm-empty">
          <div class="pm-empty-ic">${ICON.cutlery}</div>
          <div class="pm-empty-title">Nothing loaded yet</div>
          <div class="pm-empty-sub">Add your ordering web address and press Connect &amp; load.</div>
        </div>`;
    }
    const dishes = [['Wagyu Gold Stack', '$32'], ['Charred Octopus', '$24'], ['Wood-Fired Branzino', '$29'], ['Garden Burrata', '$18'], ['Dark Chocolate Tart', '$14']];
    const accent = c.theme ? c.color : '#1d1d28';
    return `<div class="pm-browser" style="--p-accent:${accent}">
      <div class="pm-chrome">
        ${c.back ? '<span class="pm-chrome-btn">' + ICON.back + '</span>' : ''}
        <span style="flex:1;text-align:center;font-size:11px;font-weight:800">Order</span>
        <span class="pm-chrome-btn" style="letter-spacing:1px">···</span>
      </div>
      <div class="pm-site">
        ${c.hideheader ? '' : `<div class="pm-site-hero" style="background:${accent}"><div class="n">VELVET BISTRO</div><div class="s">Order online</div></div>`}
        <div class="pm-site-body">
          <div class="pm-site-h">Order Online</div>
          <div class="pm-site-item" style="padding-top:0"><span class="d">${escapeHtml(hostOf(c.url))} · Pickup in ~20 min</span></div>
          ${dishes.map(([n, p]) => `<div class="pm-site-item"><span><span class="n">${n}</span><span class="d">${p}</span></span><button class="add" style="background:${accent}">Add</button></div>`).join('')}
        </div>
      </div></div>`;
  }

  function dietBadges(tags, on) {
    if (!on || !tags.length) return '';
    return '<div class="pm-tagrow">' + tags.map(t => `<span class="pm-dtag">${t}</span>`).join('') + '</div>';
  }

  function renderOrdering() {
    const o = state.ordering;
    const cats = [
      { name: 'Starters', items: [
        { name: 'Truffle Arancini', desc: 'Crispy · shaved parmesan', price: '$14', color: SWATCH[0], badge: 'Vegan', tags: ['Gluten'] },
        { name: 'Burrata', desc: 'Basil oil · sea salt', price: '$16', color: SWATCH[1], tags: ['Veg'] },
      ] },
      { name: 'Mains', items: [
        { name: 'Wagyu Stack', desc: 'Aged cheddar · brioche', price: '$42', color: SWATCH[1], tags: ['Gluten', 'Dairy'] },
        { name: 'Sea Bass', desc: 'Fennel · citrus', price: '$36', color: SWATCH[5], badge: 'GF', tags: [] },
      ] },
    ];
    const head = appHeader('MENU', 'Powered by ' + orderingApi().provider.name);
    const banner = o.banner ? `<div class="pm-banner">
      <span class="pm-banner-ic">${ICON.star}</span>
      <span><span class="pm-banner-title">You have 240 points</span><span class="pm-banner-sub">60 more to unlock $5 off</span></span>
    </div>` : '';
    const hero = `<div class="pm-hero" style="background-image:${HEROES[o.hero].background}">
      <div class="pm-hero-txt"><div class="pm-hero-title">Order for pickup</div><div class="pm-hero-sub">Ready in ~15 min</div></div>
    </div>`;

    const body = cats.map(cat => {
      const sec = `<div class="pm-sec">${cat.name.toUpperCase()}</div>`;
      if (o.layout === 'list') {
        return sec + cat.items.map(i => `<div class="pm-list-item">
          <span class="im" style="background:${i.color}"></span>
          <span class="tx"><span class="nm">${i.name}</span><span class="ds">${i.desc}</span>${dietBadges(i.tags, o.allergens)}</span>
          <span class="pr">${i.price}</span>
        </div>`).join('');
      }
      if (o.layout === 'hero') {
        return sec + cat.items.map(i => `<div class="pm-show">
          <div class="pm-show-img" style="background:${i.color}">${o.allergens && i.badge ? '<span class="pm-badge">' + i.badge + '</span>' : ''}</div>
          <div class="pm-show-body">
            <div class="pm-show-name">${i.name}</div>
            <div class="pm-show-desc">${i.desc}</div>
            ${dietBadges(i.tags, o.allergens)}
            <div class="pm-show-foot"><span class="pm-card-price">${i.price}</span><button class="pm-add">+</button></div>
          </div>
        </div>`).join('');
      }
      return sec + '<div class="pm-grid">' + cat.items.map(i => `<div class="pm-card">
        <div class="pm-card-img" style="background:${i.color}">${o.allergens && i.badge ? '<span class="pm-badge">' + i.badge + '</span>' : ''}</div>
        <div class="pm-card-body">
          <div class="pm-card-name">${i.name}</div>
          ${dietBadges(i.tags, o.allergens)}
          <div class="pm-card-foot"><span class="pm-card-price">${i.price}</span><button class="pm-add">+</button></div>
        </div>
      </div>`).join('') + '</div>';
    }).join('');

    return `<div style="--pm-accent:${o.color}">${head}${banner}${hero}${body}</div>`;
  }

  function renderManual() {
    const m = state.manual;
    const cats = m.categories;
    const total = cats.reduce((n, c) => n + c.items.length, 0);

    const head = appHeader('MENU', 'Curated by your head chef');
    const manualHeroBackground = m.hero === null
      ? 'linear-gradient(135deg,#6b4a34,#2e1f16)'
      : HEROES[m.hero].background;
    const hero = `<div class="pm-hero" style="background-image:${manualHeroBackground}">
      <div class="pm-hero-txt"><div class="pm-hero-title">Our Menu</div><div class="pm-hero-sub">Curated by your head chef</div></div>
    </div>`;

    if (!total) {
      return head + hero + `<div class="pm-empty">
        <div class="pm-empty-ic">${ICON.list}</div>
        <div class="pm-empty-title">No items yet</div>
        <div class="pm-empty-sub">Add categories by hand, or import a file to get your menu started.</div>
        <button class="pm-empty-btn">Import file</button>
      </div>`;
    }

    const openCatId = m.activeCat;
    const tabs = cats.length ? '<div class="pm-tabs">' + cats.map(c =>
      `<button class="pm-tab${c.id === openCatId || (!openCatId && c === cats[0]) ? ' on' : ''}">${escapeHtml(c.name)}</button>`).join('') + '</div>' : '';

    const body = cats.filter(c => c.items.length).map(cat => {
      const sec = `<div class="pm-sec">${escapeHtml(cat.name).toUpperCase()}</div>`;
      const cards = cat.items.map(item => {
        const editing = item.id === m.activeItem;
        const off = item.available ? '' : 'opacity:.45;';
        if (item.layout === 'list') {
          return `<div class="pm-list-item${editing ? ' editing' : ''}" style="${off}">
            <span class="im" style="background:${item.color}"></span>
            <span class="tx"><span class="nm">${escapeHtml(item.name)}</span><span class="ds">${escapeHtml(item.desc)}</span>${dietBadges(item.tags, true)}</span>
            <span class="pr">${escapeHtml(item.price)}</span>
          </div>`;
        }
        if (item.layout === 'hero') {
          return `<div class="pm-show${editing ? ' editing' : ''}" style="${off}">
            <div class="pm-show-img" style="background:${item.color}">${editing ? editingBadge() : ''}</div>
            <div class="pm-show-body">
              <div class="pm-show-name">${escapeHtml(item.name)}</div>
              <div class="pm-show-desc">${escapeHtml(item.desc)}</div>
              ${dietBadges(item.tags, true)}
              <div class="pm-show-foot"><span class="pm-card-price">${escapeHtml(item.price)}</span><button class="pm-add">+</button></div>
            </div>
          </div>`;
        }
        return `<div class="pm-card${editing ? ' editing' : ''}" style="${off}">
          <div class="pm-card-img" style="background:${item.color}">${editing ? editingBadge() : ''}</div>
          <div class="pm-card-body">
            <div class="pm-card-name">${escapeHtml(item.name)}</div>
            ${item.desc ? '<div class="pm-card-desc">' + escapeHtml(item.desc) + '</div>' : ''}
            ${dietBadges(item.tags, true)}
            <div class="pm-card-foot"><span class="pm-card-price">${escapeHtml(item.price)}</span><button class="pm-add">+</button></div>
          </div>
        </div>`;
      });

      const gridItems = cat.items.filter(i => i.layout === 'card').length;
      const isOpenCat = cat.id === openCatId;
      const ghost = isOpenCat && gridItems ? `<div class="pm-card ghost">${ICON.plus}Add item</div>` : '';
      const anyCard = cat.items.some(i => i.layout === 'card');
      if (anyCard && cat.items.every(i => i.layout === 'card')) {
        return sec + '<div class="pm-grid">' + cards.join('') + ghost + '</div>';
      }
      return sec + cards.join('');
    }).join('');

    return head + hero + tabs + body;
  }

  function editingBadge() {
    return `<span class="pm-editing-badge">${ICON.pencil}Editing</span>`;
  }

  function renderPhone() {
    if (!phoneRender) return;
    let html;
    let mode = 'none';
    if (state.approach === 'webview') { mode = 'webview'; html = renderWebview(); }
    else if (state.approach === 'pdf') { mode = 'pdf'; html = renderPdf(); }
    else if (state.approach === 'manual') { mode = 'manual'; html = renderManual(); }
    else if (state.approach === 'ordering') {
      if (state.integration === 'custom') { mode = 'custom'; html = renderCustom(); }
      else if (orderingApi().connected) { mode = 'ordering'; html = renderOrdering(); }
      else { mode = 'none'; html = renderNone(); }
    } else { html = renderNone(); }

    phonePage.dataset.menuMode = mode;
    phoneRender.innerHTML = html;

    const hideNav = (mode === 'webview' && state.webview.connected && !state.webview.bottombar)
      || (mode === 'custom' && state.custom.connected && !state.custom.bottombar);
    setBottomNav(!hideNav);
  }

  /* --------------------------------------- react to the settings-modal flow */

  document.addEventListener('como:ordering', (e) => {
    const oo = e.detail.ordering;
    if (state.approach !== 'ordering') return;
    if (oo.connected) {
      state.integration = 'native';
      const logo = document.getElementById('ms-oo-logo');
      logo.textContent = oo.provider.mark;
      logo.style.background = oo.provider.color;
      document.getElementById('ms-oo-name').textContent = oo.provider.name;
      if (state.screen !== 'oo-connected') show('oo-connected');
    } else if (e.detail.reason === 'disconnect') {
      show('oo-integration');
    }
    renderPhone();
  });

  /* --------------------------------------------------------------- startup */

  renderCategories();
  renderOrderingHeroControl();
  renderManualHeroControl();
  renderPhone();

  return {
    menuState: state,
    showMenuScreen: show,
    renderMenuPhone: renderPhone,
    openMenuTab: () => goToPage('menu'),
  };
}
