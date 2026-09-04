/**
 * Rewards page content blocks.
 *
 * Merchants told us a Rewards page is never only rewards — brands want to explain
 * how loyalty works, cross-link, and fill the space a carousel leaves empty. This
 * gives Rewards the same compose-your-own-page model Home already has.
 */

const BLOCK_DEFS = {
  text: {
    label: 'Text block',
    fields: ['heading', 'body'],
    make: () => ({ heading: 'How your loyalty works', body: 'Earn a point for every visit. Collect 10 and your next coffee is on us.' }),
  },
  promo: {
    label: 'Promo cards',
    fields: ['heading', 'cards'],
    make: () => ({
      heading: 'More from us',
      cards: [
        { headline: 'Refer a friend', desc: 'You both get 100 points', btnText: 'Invite' },
        { headline: 'Our story', desc: 'Roasted in-house since 2012', btnText: '' },
      ],
    }),
  },
  image: {
    label: 'Image banner',
    fields: ['image', 'heading', 'cta'],
    make: () => ({ heading: '', imgData: '', cta: '' }),
  },
};

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function initRewardsBlocks(ctx) {
  const { markDirty, showToast } = ctx;

  const list = document.getElementById('rw-widget-list');
  const stage = document.getElementById('rewards-stage');
  const addBtn = document.getElementById('rw-add-block-btn');
  const addMenu = document.getElementById('rw-add-block-menu');
  const drill = document.querySelector('[data-detail="rw-block"]');
  if (!list || !stage || !drill) return {};

  const blocks = [];
  let nextId = 1;
  let editingId = null;

  const byId = (id) => blocks.find((b) => b.id === id);
  const gid = (id) => document.getElementById(id);

  /* ------------------------------------------------------------- phone */

  /**
   * Rebuilds the phone stage from the config row order. Reward cards and added
   * widgets are one vertical stack, so order in the list is order on the phone.
   */
  function layoutRewardsStage() {
    [...list.querySelectorAll('.cp-widget-row')].forEach((row) => {
      const blockId = row.dataset.rwBlock;
      if (blockId) {
        const el = stage.querySelector(`[data-widget="rw-block-${blockId}"]`)
          || stage.querySelector(`.promo-cards-widget[data-widget="${blockId}"]`);
        if (el) stage.appendChild(el);
        return;
      }
      const key = row.querySelector('[data-rw-key]')?.dataset.rwKey;
      if (!key) return;
      // A member can hold more than one punch card, so move every matching tile.
      stage.querySelectorAll(`[data-rw-tile="${key}"]`).forEach((card) => stage.appendChild(card));
    });
  }

  function buildBlockEl(b) {
    const el = document.createElement('div');
    el.className = 'rw-block rw-block-' + b.type;
    el.dataset.widget = 'rw-block-' + b.id;

    if (b.type === 'text') {
      el.innerHTML = (b.heading ? `<div class="rw-block-h">${esc(b.heading)}</div>` : '')
        + (b.body ? `<div class="rw-block-p">${esc(b.body)}</div>` : '');
    } else if (b.type === 'promo') {
      const cards = b.cards.map((c) => `<div class="rw-block-card">
          <div class="rw-block-card-h">${esc(c.headline)}</div>
          <div class="rw-block-card-d">${esc(c.desc)}</div>
          ${c.btnText ? `<button class="rw-block-card-btn">${esc(c.btnText)}</button>` : ''}
        </div>`).join('');
      el.innerHTML = (b.heading ? `<div class="rw-block-h">${esc(b.heading)}</div>` : '')
        + `<div class="rw-block-cards">${cards}</div>`;
    } else {
      el.innerHTML = `<div class="rw-block-banner"${b.imgData ? ` style="background-image:url(${b.imgData})"` : ''}>
          ${b.imgData ? '' : '<span class="rw-block-banner-ph">🖼 Image banner</span>'}
          ${b.heading ? `<span class="rw-block-banner-h">${esc(b.heading)}</span>` : ''}
        </div>`
        + (b.cta ? `<button class="rw-block-card-btn wide">${esc(b.cta)}</button>` : '');
    }
    return el;
  }

  function renderPhone() {
    stage.querySelectorAll('[data-widget^="rw-block-"]').forEach((el) => el.remove());
    blocks.forEach((b) => stage.appendChild(buildBlockEl(b)));
    layoutRewardsStage();
  }

  /* ------------------------------------------------------------ config */

  function blockName(b) {
    if (b.type === 'text') return b.heading || 'Text Block';
    if (b.type === 'promo') return b.heading || 'Promo Cards';
    return b.heading || 'Image Banner';
  }

  function addBlockRow(b) {
    const row = document.createElement('div');
    row.className = 'cp-widget-row on rw-row-block';
    row.dataset.rwBlock = b.id;
    // A text block is just a headline and a paragraph, so it is edited in place
    // rather than sending the merchant into a panel for two fields.
    const inline = b.type === 'text'
      ? `<div class="rw-row-inline">
          <input class="cp-input-text" data-inline="heading" value="${esc(b.heading)}" placeholder="Heading (optional)" />
          <textarea class="cp-input-text cp-textarea" data-inline="body" rows="3" placeholder="Write what members should read here…">${esc(b.body)}</textarea>
        </div>`
      : '';
    row.innerHTML = `<div class="rw-row-head">
        <span class="handle">⠿</span>
        <span class="w-name" title="${esc(BLOCK_DEFS[b.type].label)}">${esc(blockName(b))}</span>
        <button class="w-del-icon" title="Remove widget"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4 6h12M8 6V4h4v2M6 6v10a1 1 0 001 1h6a1 1 0 001-1V6"/></svg></button>
      </div>${inline}`;

    row.querySelector('.rw-row-head').addEventListener('click', (e) => {
      if (e.target.closest('.handle, .w-del-icon, input, textarea')) return;
      openBlock(b.id);
    });
    row.querySelector('.w-del-icon').addEventListener('click', (e) => {
      e.stopPropagation();
      blocks.splice(blocks.indexOf(b), 1);
      row.remove();
      renderPhone();
      showToast?.(`${BLOCK_DEFS[b.type].label} removed`);
      markDirty?.();
    });
    row.querySelectorAll('[data-inline]').forEach((field) => {
      field.addEventListener('input', () => {
        b[field.dataset.inline] = field.value;
        refreshBlockRow(b);
        renderPhone();
        markDirty?.();
      });
    });
    list.appendChild(row);
    return row;
  }

  function refreshBlockRow(b) {
    const name = list.querySelector(`[data-rw-block="${b.id}"] .w-name`);
    if (name) name.textContent = blockName(b);
  }

  /* ------------------------------------------------------------- drill */

  function showFieldsFor(type) {
    const visible = BLOCK_DEFS[type].fields;
    drill.querySelectorAll('[data-rw-field]').forEach((f) => {
      f.style.display = visible.includes(f.dataset.rwField) ? '' : 'none';
    });
  }

  function paintImage(b) {
    const preview = gid('rw-block-image-preview');
    const empty = gid('rw-block-image-empty');
    const remove = gid('rw-block-image-remove');
    if (b.imgData) {
      preview.src = b.imgData;
      preview.style.display = 'block';
      empty.style.display = 'none';
      remove.style.display = '';
    } else {
      preview.style.display = 'none';
      empty.style.display = '';
      remove.style.display = 'none';
    }
  }

  function renderCardEditors(b) {
    const wrap = gid('rw-block-cards');
    if (!wrap) return;
    wrap.innerHTML = '';
    b.cards.forEach((c, i) => {
      const box = document.createElement('div');
      box.className = 'rw-card-editor';
      box.innerHTML = `<div class="rw-card-editor-head">Card ${i + 1}
          <button class="rw-card-del" title="Remove card">✕</button>
        </div>
        <input class="cp-input-text" data-c="headline" value="${esc(c.headline)}" placeholder="Headline" />
        <input class="cp-input-text" data-c="desc" value="${esc(c.desc)}" placeholder="Short description" />
        <input class="cp-input-text" data-c="btnText" value="${esc(c.btnText)}" placeholder="Button text — leave empty for no button" />`;
      box.querySelectorAll('[data-c]').forEach((inp) => {
        inp.addEventListener('input', () => {
          c[inp.dataset.c] = inp.value;
          renderPhone();
          markDirty?.();
        });
      });
      box.querySelector('.rw-card-del').addEventListener('click', () => {
        b.cards.splice(i, 1);
        renderCardEditors(b);
        renderPhone();
        markDirty?.();
      });
      wrap.appendChild(box);
    });
  }

  function openBlock(id) {
    const b = byId(id);
    if (!b) return;
    const row = list.querySelector(`[data-rw-block="${id}"]`);

    // Text blocks stay in the list; richer widgets open beside it in the third panel.
    if (b.type === 'text') {
      window.closeL3Panel?.();
      const opening = !row?.classList.contains('editing');
      list.querySelectorAll('.rw-row-block.editing').forEach((r) => r.classList.remove('editing'));
      if (opening && row) {
        row.classList.add('editing');
        row.querySelector('[data-inline="body"]')?.focus();
      }
      return;
    }

    editingId = id;
    showFieldsFor(b.type);
    gid('rw-block-title').textContent = blockName(b);
    gid('rw-block-heading').value = b.heading || '';
    gid('rw-block-body').value = b.body || '';
    gid('rw-block-cta').value = b.cta || '';
    if (b.type === 'promo') renderCardEditors(b);
    if (b.type === 'image') paintImage(b);
    window.openL3Panel?.(drill);
    list.querySelectorAll('.cp-widget-row').forEach((r) => {
      r.classList.toggle('l3-active', r === row);
    });
  }

  ['heading', 'body', 'cta'].forEach((field) => {
    const el = gid('rw-block-' + field);
    if (!el) return;
    el.addEventListener('input', () => {
      const b = byId(editingId);
      if (!b) return;
      b[field] = el.value;
      gid('rw-block-title').textContent = blockName(b);
      refreshBlockRow(b);
      renderPhone();
      markDirty?.();
    });
  });

  gid('rw-block-add-card')?.addEventListener('click', () => {
    const b = byId(editingId);
    if (!b) return;
    b.cards.push({ headline: 'New card', desc: '', btnText: '' });
    renderCardEditors(b);
    renderPhone();
    markDirty?.();
  });

  const imgFile = gid('rw-block-image-file');
  gid('rw-block-image-zone')?.addEventListener('click', () => imgFile?.click());
  imgFile?.addEventListener('change', () => {
    const file = imgFile.files?.[0];
    const b = byId(editingId);
    if (!file || !b) return;
    if (file.size > 5 * 1024 * 1024) { showToast?.('File too big — max 5MB'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      b.imgData = e.target.result;
      paintImage(b);
      renderPhone();
      showToast?.('Image uploaded');
      markDirty?.();
    };
    reader.readAsDataURL(file);
  });
  gid('rw-block-image-remove')?.addEventListener('click', () => {
    const b = byId(editingId);
    if (!b) return;
    b.imgData = '';
    if (imgFile) imgFile.value = '';
    paintImage(b);
    renderPhone();
    markDirty?.();
  });

  drill.querySelector('.cp-back')?.addEventListener('click', () => window.closeL3Panel?.());

  /* --------------------------------------------------------- add menu */

  function addBlock(type) {
    // Promo cards on Rewards use the same rich widget as Home (plus a Heading field).
    if (type === 'promo') { window.createRewardsPromoInstance?.(); return; }
    const block = { id: nextId++, type, ...BLOCK_DEFS[type].make() };
    blocks.push(block);
    const row = addBlockRow(block);
    renderPhone();
    markDirty?.();
    if (type === 'text') {
      row.classList.add('editing');
      row.querySelector('[data-inline="body"]')?.focus();
    } else {
      openBlock(block.id);
    }
    row.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  if (addBtn && addMenu) {
    addBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      addMenu.classList.toggle('open');
    });
    document.addEventListener('click', () => addMenu.classList.remove('open'));
    addMenu.querySelectorAll('[data-rw-add]').forEach((b) => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        addMenu.classList.remove('open');
        addBlock(b.dataset.rwAdd);
      });
    });
  }

  // Reward cards and added widgets live in one list, so a single reorder pass
  // covers both. DOM order in the list is the source of truth for the phone.
  ctx.initReorderable?.(list, () => {
    layoutRewardsStage();
    markDirty?.();
  });

  layoutRewardsStage();
  window.layoutRewardsStage = layoutRewardsStage;
  return { layoutRewardsStage };
}
