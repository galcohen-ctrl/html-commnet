export function initPromoWidgets(ctx) {
  const {
    closeDrill, closeL3Panel, markDirty, openDrill, openL3Panel, showToast,
    updateHomeEmptyState, wireColorControl, wireRadioGroup, wireToggle,
  } = ctx;
  // Reordering is initialized after the static promo instances. Resolve it lazily
  // when a reviewer later creates a dynamic widget.
  const reorderPhoneWidgets = (...args) => ctx.reorderPhoneWidgets?.(...args);

  // ====================================================================
  // PROMO CARDS WIDGET — instanced: Home can host more than one promo strip.
  // Every instance owns its cards, section title, and presentation settings.
  // ====================================================================
  function initPromoCards(cfg) {
    const gid = (suffix) => document.getElementById(cfg.idp + suffix);
    const pcWidget = document.querySelector('.promo-cards-widget[data-widget="' + cfg.key + '"]');
    const pcCarousel = gid('-carousel-wrap');
    const pcDotsContainer = gid('-dots');
    const pcItemsList = gid('-items-list');
    const pcDrill = document.querySelector('[data-detail="' + cfg.drill + '"]');
    const pcEditDrill = document.querySelector('[data-detail="' + cfg.editDrill + '"]');
    const pcRowName = document.querySelector('.w-name[data-drill="' + cfg.drill + '"]');
    const pcEyebrow = pcWidget && pcWidget.querySelector('.pc-eyebrow');

    const pcCards = cfg.seed;
    let pcNextId = pcCards.length;
    let pcEditIdx = null; // which card index is being edited in the sub-drill

    function pcRenderPhone() {
      if (!pcCarousel) return;
      const visCards = pcCards.filter(c => c.visible);
      pcCarousel.innerHTML = '';
      visCards.forEach(c => {
        const card = document.createElement('div');
        card.className = 'pc-card';
        card.dataset.pcCard = c.id;
        const img = document.createElement('div');
        img.className = 'pc-card-img';
        if (c.imgData) {
          img.classList.add('has-upload');
          img.style.backgroundImage = 'url(' + c.imgData + ')';
        } else if (c.img) {
          img.classList.add(c.img);
        } else {
          img.classList.add('empty-img');
          img.textContent = '🖼';
        }
        card.appendChild(img);
        const body = document.createElement('div');
        body.className = 'pc-card-body';
        body.innerHTML = '<div class="pc-card-headline">' + escHtml(c.headline) + '</div>'
          + '<div class="pc-card-desc">' + escHtml(c.desc) + '</div>'
          + '<button class="pc-card-btn">' + escHtml(c.btnText) + '</button>';
        card.appendChild(body);
        pcCarousel.appendChild(card);
      });
      if (pcDotsContainer) {
        pcDotsContainer.innerHTML = '';
        if (visCards.length > 1) {
          visCards.forEach((_, i) => {
            const dot = document.createElement('span');
            dot.className = 'pc-dot' + (i === 0 ? ' active' : '');
            dot.dataset.dot = i;
            dot.addEventListener('click', () => {
              pcCarousel.scrollTo({ left: i * pcCarousel.offsetWidth, behavior: 'smooth' });
            });
            pcDotsContainer.appendChild(dot);
          });
        }
      }
      pcCarousel.onscroll = () => {
        const i = Math.round(pcCarousel.scrollLeft / pcCarousel.offsetWidth);
        pcDotsContainer.querySelectorAll('.pc-dot').forEach((d, idx) => d.classList.toggle('active', idx === i));
      };
    }

    function pcRenderItemList() {
      if (!pcItemsList) return;
      pcItemsList.innerHTML = '';
      pcCards.forEach((c, idx) => {
        const row = document.createElement('div');
        row.className = 'pc-item';
        row.dataset.pcIdx = idx;
        row.innerHTML = '<span class="handle">⠿</span>'
          + '<span class="pc-item-name">' + escHtml(c.headline || 'Untitled card') + '</span>'
          + '<button class="pc-vis ' + (c.visible ? 'on' : '') + '" title="Toggle visibility"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/><circle cx="10" cy="10" r="3"/></svg></button>'
          + '<button class="pc-del" title="Delete card"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 6h12M8 6V4h4v2M6 6v10a1 1 0 001 1h6a1 1 0 001-1V6"/></svg></button>'
          + '<span class="pc-item-chev">›</span>';
        row.querySelector('.pc-vis').addEventListener('click', (e) => {
          e.stopPropagation();
          c.visible = !c.visible;
          row.querySelector('.pc-vis').classList.toggle('on', c.visible);
          pcRenderPhone();
          markDirty();
        });
        row.querySelector('.pc-del').addEventListener('click', (e) => {
          e.stopPropagation();
          pcCards.splice(idx, 1);
          pcRenderItemList();
          pcRenderPhone();
          pcUpdateCount();
          markDirty();
        });
        row.addEventListener('click', (e) => {
          if (e.target.closest('.pc-vis') || e.target.closest('.pc-del') || e.target.closest('.handle')) return;
          pcOpenCardEdit(idx);
        });
        pcItemsList.appendChild(row);
      });
    }

    function pcUpdateCount() {
      const countEl = pcDrill && pcDrill.querySelector('.pc-count');
      if (countEl) countEl.textContent = pcCards.length;
    }

    function pcOpenCardEdit(idx) {
      pcEditIdx = idx;
      const c = pcCards[idx];
      if (!c) return;
      gid('-card-edit-title').textContent = c.headline || 'Untitled card';
      gid('-edit-headline').value = c.headline;
      gid('-edit-desc').value = c.desc;
      gid('-edit-action').value = c.action;
      gid('-edit-btn-text').value = c.btnText;
      pcPaintImageState(c.imgData);
      // Keep this widget's card list (level 2) visible in the config panel...
      const cpHome = document.getElementById('cp-home');
      cpHome.querySelector('.cp-master').classList.add('hide');
      cpHome.querySelectorAll('.cp-detail').forEach(d => d.classList.toggle('show', d === pcDrill));
      // ...and open the individual card editor one level deeper, in the third panel.
      openL3Panel(pcEditDrill);
      if (pcItemsList) {
        pcItemsList.querySelectorAll('.pc-item').forEach((r, i) => r.classList.toggle('l3-active', i === idx));
      }
    }

    function pcPaintImageState(imgData) {
      const preview = gid('-edit-image-preview');
      const empty = gid('-edit-image-empty');
      const removeBtn = gid('-edit-image-remove');
      const zone = gid('-edit-image-zone');
      if (imgData) {
        preview.src = imgData;
        preview.style.display = 'block';
        empty.style.display = 'none';
        removeBtn.style.display = '';
        zone.classList.add('has-image');
      } else {
        preview.style.display = 'none';
        empty.style.display = '';
        removeBtn.style.display = 'none';
        zone.classList.remove('has-image');
      }
    }

    function pcSyncEditFields() {
      if (pcEditIdx === null) return;
      const c = pcCards[pcEditIdx];
      if (!c) return;
      c.headline = gid('-edit-headline').value;
      c.desc = gid('-edit-desc').value;
      c.action = gid('-edit-action').value;
      c.btnText = gid('-edit-btn-text').value;
      pcRenderPhone();
      pcRenderItemList();
      markDirty();
    }
    ['-edit-headline', '-edit-desc', '-edit-action', '-edit-btn-text'].forEach(sfx => {
      const el = gid(sfx);
      if (!el) return;
      el.addEventListener('input', pcSyncEditFields);
      el.addEventListener('change', pcSyncEditFields);
    });

    // Section title: drives the phone eyebrow AND the widget's name in the left panel.
    // Not every instance offers this (e.g. More Offers keeps its name hardcoded), so no-op if absent.
    const pcTitleInput = gid('-section-title');
    const pcTitleToggle = gid('-section-title-toggle');
    function pcApplySectionTitle() {
      if (!pcTitleInput) return;
      const label = (pcTitleInput.value || '').trim();
      if (pcEyebrow) pcEyebrow.textContent = label;
      if (pcRowName) pcRowName.textContent = 'Promo Cards — ' + (label || 'Untitled');
      const drillTitle = pcDrill && pcDrill.querySelector('.cp-detail-title');
      if (drillTitle) drillTitle.textContent = 'Promo Cards — ' + (label || 'Untitled');
    }
    if (pcTitleInput) {
      pcTitleInput.addEventListener('input', () => { pcApplySectionTitle(); markDirty(); });
    }
    if (pcTitleToggle && pcEyebrow) {
      pcTitleToggle.addEventListener('click', () => {
        pcEyebrow.classList.toggle('hidden-slot', !pcTitleToggle.classList.contains('on'));
      });
    }

    // Card image upload
    const pcEditImageFile = gid('-edit-image-file');
    const pcEditImageZone = gid('-edit-image-zone');
    if (pcEditImageZone) {
      pcEditImageZone.addEventListener('click', () => pcEditImageFile.click());
      pcEditImageZone.addEventListener('dragover', (e) => { e.preventDefault(); pcEditImageZone.style.borderColor = 'var(--como)'; });
      pcEditImageZone.addEventListener('dragleave', () => { pcEditImageZone.style.borderColor = ''; });
      pcEditImageZone.addEventListener('drop', (e) => {
        e.preventDefault();
        pcEditImageZone.style.borderColor = '';
        const file = e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) pcHandleCardImage(file);
      });
    }
    if (pcEditImageFile) {
      pcEditImageFile.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) pcHandleCardImage(e.target.files[0]);
      });
    }
    function pcHandleCardImage(file) {
      readImageFile(file, (dataUrl) => {
        if (pcEditIdx === null) return;
        pcCards[pcEditIdx].imgData = dataUrl;
        pcCards[pcEditIdx].img = null; // clear preset gradient class
        pcPaintImageState(dataUrl);
        pcRenderPhone();
        markDirty();
      });
    }
    const pcEditImageRemove = gid('-edit-image-remove');
    if (pcEditImageRemove) {
      pcEditImageRemove.addEventListener('click', (e) => {
        e.stopPropagation();
        if (pcEditIdx === null) return;
        pcCards[pcEditIdx].imgData = null;
        pcCards[pcEditIdx].img = null;
        pcPaintImageState(null);
        pcEditImageFile.value = '';
        pcRenderPhone();
        markDirty();
      });
    }

    // Back from the card editor (third panel) → return to this widget's card list (level 2)
    const pcCardBack = gid('-card-back');
    if (pcCardBack) {
      pcCardBack.addEventListener('click', () => {
        pcEditIdx = null;
        closeL3Panel();
      });
    }

    const pcAddBtn = gid('-add-btn');
    if (pcAddBtn) {
      pcAddBtn.addEventListener('click', () => {
        pcCards.push({ id: pcNextId++, headline: '', desc: '', img: null, imgData: null, action: 'none', btnText: '', visible: true });
        pcRenderItemList();
        pcRenderPhone();
        pcUpdateCount();
        markDirty();
        pcOpenCardEdit(pcCards.length - 1);
      });
    }

    // Presentation radios (scoped to this instance's drill)
    const presentationMap = { display: 'pcDisplay', 'image-size': 'pcImage', 'cta-style': 'pcCta', corners: 'pcCorners' };
    if (pcDrill && pcWidget) {
      Object.keys(presentationMap).forEach(name => {
        pcDrill.querySelectorAll('[data-bind-radio="' + cfg.idp + '-' + name + '"]').forEach(r => {
          r.addEventListener('click', () => {
            pcWidget.dataset[presentationMap[name]] = r.dataset.value;
          });
        });
      });
      // Grid display → open the Google-Docs-style size picker to choose columns × rows
      const gridRadio = pcDrill.querySelector('[data-bind-radio="' + cfg.idp + '-display"][data-value="grid"]');
      if (gridRadio) {
        gridRadio.addEventListener('click', () => {
          openGridPicker(gridRadio, (cols, rows) => {
            pcWidget.style.setProperty('--pc-cols', cols);
            pcWidget.dataset.pcDisplay = 'grid';
            gridRadio.textContent = 'Grid ' + cols + '×' + rows;
            markDirty();
          });
        });
      }
      const pcBgInput = gid('-bg-color');
      if (pcBgInput) {
        wireColorControl(pcBgInput, (hex) => pcWidget.style.setProperty('--pc-card-bg', hex));
      }
    }

    pcApplySectionTitle();
    pcRenderPhone();
    pcRenderItemList();
    pcUpdateCount();
  }

  function escHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  // Shared image-file reader for every uploader in the config panel
  function readImageFile(file, onLoad) {
    if (!/^image\/(png|jpeg|jpg|webp)/i.test(file.type)) { showToast('Only png, jpg, or webp'); return; }
    if (file.size > 5 * 1024 * 1024) { showToast('Max 5 MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => onLoad(ev.target.result);
    reader.readAsDataURL(file);
  }

  // Google-Docs-style size picker: hover a cell to highlight the top-left block, click to pick cols × rows
  function openGridPicker(anchor, onPick) {
    document.querySelectorAll('.grid-picker').forEach(p => p.remove());
    const MAXC = 5, MAXR = 5;
    const pop = document.createElement('div');
    pop.className = 'grid-picker';
    const grid = document.createElement('div');
    grid.className = 'grid-picker-grid';
    grid.style.gridTemplateColumns = 'repeat(' + MAXC + ', 16px)';
    const label = document.createElement('div');
    label.className = 'grid-picker-label';
    label.textContent = '1 × 1';
    const cells = [];
    for (let r = 0; r < MAXR; r++) {
      for (let c = 0; c < MAXC; c++) {
        const cell = document.createElement('div');
        cell.className = 'grid-picker-cell';
        cell.addEventListener('mouseenter', () => {
          cells.forEach(x => x.el.classList.toggle('on', x.c <= c && x.r <= r));
          label.textContent = (c + 1) + ' × ' + (r + 1);
        });
        cell.addEventListener('click', (e) => {
          e.stopPropagation();
          onPick(c + 1, r + 1);
          pop.remove();
        });
        cells.push({ el: cell, c, r });
        grid.appendChild(cell);
      }
    }
    pop.appendChild(grid);
    pop.appendChild(label);
    document.body.appendChild(pop);
    const rect = anchor.getBoundingClientRect();
    let left = window.scrollX + rect.left;
    if (rect.left + pop.offsetWidth > window.innerWidth - 8) {
      left = window.scrollX + window.innerWidth - pop.offsetWidth - 8;
    }
    pop.style.top = (window.scrollY + rect.bottom + 6) + 'px';
    pop.style.left = left + 'px';
    const close = (e) => {
      if (!pop.contains(e.target) && e.target !== anchor) {
        pop.remove();
        document.removeEventListener('mousedown', close);
      }
    };
    setTimeout(() => document.addEventListener('mousedown', close), 0);
  }

  initPromoCards({
    key: 'promo-cards', idp: 'pc', drill: 'promo-cards', editDrill: 'pc-card-edit',
    seed: [
      { id: 0, headline: 'Black Angus Special', desc: '20% OFF Tonight — prime cut, chef-selected, served with truffle jus', img: 'beef', imgData: null, action: 'menu', btnText: 'View Menu →', visible: true },
      { id: 1, headline: 'Artisan Chocolate', desc: 'Free with $80 spend — dark 72% single-origin from our pastry chef', img: 'choc', imgData: null, action: 'rewards', btnText: 'Order Now →', visible: true },
      { id: 2, headline: 'Premium Sushi Night', desc: 'Omakase 12-course, reservations open this Friday', img: 'sushi', imgData: null, action: 'none', btnText: 'Reserve Table →', visible: true },
    ]
  });

  initPromoCards({
    key: 'promo-cards-2', idp: 'pc2', drill: 'promo-cards-2', editDrill: 'pc2-card-edit',
    seed: [
      { id: 0, headline: 'Midweek Set Lunch', desc: 'Two courses for $29, Tuesday to Thursday', img: 'beef', imgData: null, action: 'menu', btnText: 'See the set →', visible: true },
      { id: 1, headline: 'Bring a Friend', desc: 'Refer a friend and you both get 200 points', img: 'choc', imgData: null, action: 'rewards', btnText: 'Invite now →', visible: true },
    ]
  });

  // ====================================================================
  // + ADD WIDGET — dropdown to append new Promo Cards / Text Divider widgets.
  // Each added widget gets a config row (drag-reorderable + deletable) and a
  // live phone element, reusing the same wiring as the built-in widgets.
  // ====================================================================
  let dynWidgetSeq = 3;
  const cpHomeEl = document.getElementById('cp-home');
  const homePageEl = document.querySelector('.app-page[data-page="home"]');
  const addWidgetBtn = document.getElementById('add-widget-btn');
  const addWidgetMenu = document.getElementById('add-widget-menu');
  const addWidgetWrap = addWidgetBtn ? addWidgetBtn.closest('.cp-add-widget-wrap') : null;
  const widgetsListBody = addWidgetWrap ? addWidgetWrap.parentElement : null;

  function wireDrillNode(node) {
    node.querySelectorAll('.cp-head-row').forEach(h => {
      h.addEventListener('click', () => h.parentElement.classList.toggle('open'));
    });
    node.querySelectorAll('.cp-radio-group').forEach(wireRadioGroup);
  }

  // Build a config-panel widget row (handle + name + on/off toggle + edit + delete).
  function buildWidgetRow(name, key, drill, bindSel, onDelete) {
    const row = document.createElement('div');
    row.className = 'cp-widget-row on';
    row.dataset.dynamic = '1';
    row.innerHTML =
      '<span class="handle">⠿</span>'
      + '<span class="w-name" data-drill="' + drill + '">' + escHtml(name) + '</span>'
      + '<span class="toggle on" data-bind="' + bindSel + '" data-widget-toggle="' + key + '" title="Show on Home">'
      + '<svg class="i-plus" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 4v12M4 10h12"/></svg>'
      + '<svg class="i-check" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10l4 4 8-8"/></svg>'
      + '</span>'
      + '<button class="w-edit-icon" data-drill="' + drill + '" title="Edit widget"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12.5 3l4.5 4.5-10 10H2.5v-4.5l10-10z"/><path d="M11 4.5l4.5 4.5"/></svg></button>'
      + '<button class="w-edit-icon w-del" title="Remove widget"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h12M8 6V4h4v2M6 6v10a1 1 0 001 1h6a1 1 0 001-1V6"/></svg></button>';
    const toggle = row.querySelector('.toggle');
    wireToggle(toggle);
    row.querySelectorAll('[data-drill]').forEach(el => {
      el.addEventListener('click', (e) => { e.stopPropagation(); openDrill('cp-home', drill); });
    });
    row.querySelector('.w-del').addEventListener('click', (e) => {
      e.stopPropagation();
      onDelete();
      row.remove();
      updateHomeEmptyState();
      markDirty();
    });
    // Insert new rows above the "Click + / ✏" hint so the hint stays anchored
    // right before the "Add widget" button and doesn't split the widget list.
    const hintInline = widgetsListBody.querySelector('.cp-hint-inline');
    widgetsListBody.insertBefore(row, hintInline || addWidgetWrap);
    return row;
  }

  function promoDrillMarkup(idp, key, drill, editDrill, title) {
    return ''
      + '<div class="cp-detail" data-detail="' + drill + '">'
      +   '<div class="cp-detail-header"><button class="cp-back">‹</button><div class="cp-detail-title">' + escHtml(title) + '</div></div>'
      +   '<div class="cp-section open"><div class="cp-head-row">Your cards <span class="pc-count">1</span> <span class="chev">›</span></div>'
      +     '<div class="cp-body"><div class="pc-items-list" id="' + idp + '-items-list"></div><button class="pc-add-btn" id="' + idp + '-add-btn">+ Add card</button></div></div>'
      +   '<div class="cp-section open"><div class="cp-head-row">Presentation <span class="chev">›</span></div><div class="cp-body">'
      +     '<div class="cp-field"><label>Display</label><div class="cp-radio-group">'
      +       '<div class="cp-radio active" data-bind-radio="' + idp + '-display" data-value="carousel">Carousel</div>'
      +       '<div class="cp-radio" data-bind-radio="' + idp + '-display" data-value="stack">Stack</div>'
      +       '<div class="cp-radio" data-bind-radio="' + idp + '-display" data-value="grid">Grid</div></div></div>'
      +     '<div class="cp-field"><label>Image</label><div class="cp-radio-group">'
      +       '<div class="cp-radio active" data-bind-radio="' + idp + '-image-size" data-value="cover">Cover</div>'
      +       '<div class="cp-radio" data-bind-radio="' + idp + '-image-size" data-value="beside">Beside</div>'
      +       '<div class="cp-radio" data-bind-radio="' + idp + '-image-size" data-value="behind">Behind</div></div></div>'
      +     '<div class="cp-field"><label>Button</label><div class="cp-radio-group">'
      +       '<div class="cp-radio active" data-bind-radio="' + idp + '-cta-style" data-value="filled">Filled</div>'
      +       '<div class="cp-radio" data-bind-radio="' + idp + '-cta-style" data-value="outline">Outline</div>'
      +       '<div class="cp-radio" data-bind-radio="' + idp + '-cta-style" data-value="link">Link</div>'
      +       '<div class="cp-radio" data-bind-radio="' + idp + '-cta-style" data-value="none">None</div></div></div>'
      +     '<div class="cp-field"><label>Corners</label><div class="cp-radio-group">'
      +       '<div class="cp-radio" data-bind-radio="' + idp + '-corners" data-value="sharp">Sharp</div>'
      +       '<div class="cp-radio active" data-bind-radio="' + idp + '-corners" data-value="rounded">Rounded</div></div></div>'
      +     '<div class="cp-field"><label>Card background</label><div class="cp-color-row compact">'
      +       '<div class="cp-color-swatch" style="background:var(--p-panel);"><input type="color" value="#1a1728" id="' + idp + '-bg-color" /></div>'
      +       '<div class="cp-color-info"><div class="cp-color-label">Card background</div><input class="cp-color-hex" value="#1A1728" spellcheck="false" maxlength="9" /></div>'
      +     '</div></div>'
      +   '</div></div>'
      + '</div>'
      + '<div class="cp-detail" data-detail="' + editDrill + '">'
      +   '<div class="cp-detail-header"><button class="cp-back" id="' + idp + '-card-back">‹</button><div class="cp-detail-title" id="' + idp + '-card-edit-title">Edit Card</div></div>'
      +   '<div class="cp-section open"><div class="cp-body">'
      +     '<div class="cp-field"><label>Headline</label><input class="cp-input-text" id="' + idp + '-edit-headline" placeholder="e.g. 20% OFF Tonight" /></div>'
      +     '<div class="cp-field"><label>Description</label><textarea class="cp-input-text cp-textarea" id="' + idp + '-edit-desc" rows="2" placeholder="Short promo text"></textarea></div>'
      +     '<div class="cp-field"><label>Image</label>'
      +       '<div class="pc-edit-image-zone" id="' + idp + '-edit-image-zone">'
      +         '<img class="pc-edit-image-preview" id="' + idp + '-edit-image-preview" style="display:none;" />'
      +         '<div class="pc-edit-image-empty" id="' + idp + '-edit-image-empty"><div class="pc-upload-prompt"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg><span>Drop image or click</span></div><div class="pc-upload-hint">jpg · png · webp · max 5 MB</div></div>'
      +       '</div>'
      +       '<input type="file" id="' + idp + '-edit-image-file" accept="image/png,image/jpeg,image/jpg,image/webp" style="display:none;" />'
      +       '<button class="pc-edit-image-remove" id="' + idp + '-edit-image-remove" style="display:none;">✕ Remove image</button>'
      +       '<div class="cp-upload-note">Recommended 1200 × 800 px (3:2) · shown crisp on all screens</div>'
      +     '</div>'
      +     '<div class="cp-field"><label>Tap action</label><select class="cp-select" id="' + idp + '-edit-action"><option value="none">None</option><option value="home">Go to: Home</option><option value="rewards">Go to: Rewards</option><option value="locations">Go to: Locations</option><option value="menu">Go to: Menu</option><option value="more">Go to: More</option><option value="webview">Open web link</option></select></div>'
      +     '<div class="cp-field"><label>Button text</label><input class="cp-input-text" id="' + idp + '-edit-btn-text" placeholder="e.g. View Menu →" /></div>'
      +   '</div></div>'
      + '</div>';
  }

  function createPromoInstance() {
    const n = dynWidgetSeq++;
    const idp = 'pc' + n;
    const key = 'promo-cards-' + n;
    const drill = 'promo-cards-' + n;
    const editDrill = idp + '-card-edit';
    const title = 'Promo Cards ' + n;

    // Phone widget element
    const widget = document.createElement('div');
    widget.className = 'promo-cards-widget';
    widget.dataset.widget = key;
    widget.dataset.pcDisplay = 'carousel';
    widget.dataset.pcImage = 'cover';
    widget.dataset.pcCta = 'filled';
    widget.dataset.pcCorners = 'rounded';
    widget.innerHTML = '<div class="pc-carousel-wrap" id="' + idp + '-carousel-wrap"></div><div class="pc-dots" id="' + idp + '-dots"></div>';
    homePageEl.appendChild(widget);

    // Drills
    const holder = document.createElement('div');
    holder.innerHTML = promoDrillMarkup(idp, key, drill, editDrill, title);
    const nodes = Array.from(holder.children);
    nodes.forEach(node => { cpHomeEl.appendChild(node); wireDrillNode(node); });
    // Main drill back → master; edit-drill back is wired by initPromoCards
    const mainDrill = cpHomeEl.querySelector('[data-detail="' + drill + '"]');
    mainDrill.querySelector('.cp-back').addEventListener('click', () => closeDrill('cp-home'));

    // Config row
    buildWidgetRow(title, key, drill, '.promo-cards-widget[data-widget=\'' + key + '\']', () => {
      closeL3Panel();
      widget.remove();
      // Search the whole document (the card editor drill may have been moved into the third panel)
      document.querySelectorAll('[data-detail="' + drill + '"], [data-detail="' + editDrill + '"]').forEach(d => d.remove());
    });

    // Behaviour
    initPromoCards({
      key, idp, drill, editDrill,
      seed: [{ id: 0, headline: 'New promo', desc: 'Describe this offer', img: 'beef', imgData: null, action: 'none', btnText: 'Learn more →', visible: true }]
    });

    reorderPhoneWidgets();
    updateHomeEmptyState();
    markDirty();
    openDrill('cp-home', drill);
  }

  function createTextDivider() {
    const n = dynWidgetSeq++;
    const key = 'text-divider-' + n;
    const drill = 'divider-' + n;
    const label = 'New Section';

    // Phone element
    const el = document.createElement('div');
    el.className = 'text-divider align-center';
    el.dataset.widget = key;
    el.innerHTML = '<span>' + escHtml(label) + '</span>';
    homePageEl.appendChild(el);

    // Drill
    const holder = document.createElement('div');
    holder.innerHTML = ''
      + '<div class="cp-detail" data-detail="' + drill + '">'
      +   '<div class="cp-detail-header"><button class="cp-back">‹</button><div class="cp-detail-title">Text Divider</div></div>'
      +   '<div class="cp-section open"><div class="cp-head-row">Divider <span class="chev">›</span></div><div class="cp-body">'
      +     '<div class="cp-field"><label>Label</label><input class="cp-input-text dv-label" value="' + label + '" /></div>'
      +     '<div class="cp-field"><label>Alignment</label><div class="cp-radio-group">'
      +       '<div class="cp-radio active" data-dv-align="center">Center</div>'
      +       '<div class="cp-radio" data-dv-align="left">Left</div></div></div>'
      +     '<div class="cp-toggle-row"><span class="lbl">Show lines</span><span class="toggle on dv-lines"></span></div>'
      +   '</div></div>'
      + '</div>';
    const drillNode = holder.firstElementChild;
    cpHomeEl.appendChild(drillNode);
    drillNode.querySelectorAll('.cp-head-row').forEach(h => h.addEventListener('click', () => h.parentElement.classList.toggle('open')));
    drillNode.querySelector('.cp-back').addEventListener('click', () => closeDrill('cp-home'));
    // Label edit
    drillNode.querySelector('.dv-label').addEventListener('input', (e) => {
      el.querySelector('span').textContent = e.target.value;
      markDirty();
    });
    // Alignment
    drillNode.querySelectorAll('[data-dv-align]').forEach(r => {
      r.addEventListener('click', () => {
        drillNode.querySelectorAll('[data-dv-align]').forEach(x => x.classList.remove('active'));
        r.classList.add('active');
        el.classList.toggle('align-left', r.dataset.dvAlign === 'left');
        el.classList.toggle('align-center', r.dataset.dvAlign === 'center');
        markDirty();
      });
    });
    // Show-lines toggle
    const linesToggle = drillNode.querySelector('.dv-lines');
    linesToggle.addEventListener('click', () => {
      linesToggle.classList.toggle('on');
      el.classList.toggle('no-line', !linesToggle.classList.contains('on'));
      markDirty();
    });

    // Config row
    buildWidgetRow('Text Divider', key, drill, '.text-divider[data-widget=\'' + key + '\']', () => {
      el.remove();
      drillNode.remove();
    });

    reorderPhoneWidgets();
    updateHomeEmptyState();
    markDirty();
    openDrill('cp-home', drill);
  }

  if (addWidgetBtn && addWidgetMenu) {
    addWidgetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      addWidgetMenu.classList.toggle('open');
    });
    document.addEventListener('click', () => addWidgetMenu.classList.remove('open'));
    addWidgetMenu.addEventListener('click', (e) => e.stopPropagation());
    addWidgetMenu.querySelectorAll('button[data-add]').forEach(b => {
      b.addEventListener('click', () => {
        addWidgetMenu.classList.remove('open');
        if (b.dataset.add === 'promo') createPromoInstance();
        else if (b.dataset.add === 'divider') createTextDivider();
        else if (b.dataset.add === 'menu-categories') addMenuCategoriesWidget();
      });
    });
  }

  function addMenuCategoriesWidget() {
    if (document.querySelector('[data-widget-toggle="menu-categories"]')) {
      showToast?.('Menu Categories is already added');
      return;
    }
    buildWidgetRow('Menu Categories', 'menu-categories', 'menu-categories', '.mc-widget', () => {
      document.querySelectorAll('.mc-widget').forEach(el => el.classList.add('hidden-slot'));
    });
    showToast?.('Menu Categories widget added');
    markDirty?.();
  }


  return { initPromoCards, escHtml, readImageFile, openGridPicker, wireDrillNode, buildWidgetRow, promoDrillMarkup, createPromoInstance, createTextDivider };
}

