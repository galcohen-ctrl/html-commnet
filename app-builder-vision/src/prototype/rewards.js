export function initRewards(ctx) {
  const { markDirty, openDrill, readImageFile } = ctx;

  // ====================================================================
  // REWARDS CARDS — the three Rewards tiles get a promo-card-style editor
  // (image + copy + button). Where each card links to is fixed by the platform.
  // ====================================================================
  const rwTiles = {
    gifts: { name: 'My Gifts', headline: 'Active Rewards ready to be redeemed', desc: '3 rewards available · Tap to view', btnText: '', imgData: null },
    points: { name: 'My Points Shop', headline: '1 pt per AED spent', desc: 'Trade points for gifts, discounts, and exclusive perks', btnText: '', imgData: null },
    punch: { name: 'Punch Card', headline: 'Coffee Punch Card', desc: '7 of 10 · Free coffee after 10 stamps', btnText: '', imgData: null },
  };
  let rwEditKey = null;

  function rwRenderPhone(key) {
    const t = rwTiles[key];
    const el = document.querySelector('[data-rw-tile="' + key + '"]');
    if (!t || !el) return;
    const img = el.querySelector('.rw-img');
    const btn = el.querySelector('.rw-btn');
    el.querySelector('.prog-title').textContent = t.headline;
    el.querySelector('.prog-sub').textContent = t.desc;
    if (img) {
      img.style.display = t.imgData ? '' : 'none';
      img.style.backgroundImage = t.imgData ? 'url(' + t.imgData + ')' : '';
    }
    if (btn) {
      btn.style.display = t.btnText.trim() ? '' : 'none';
      btn.textContent = t.btnText;
    }
  }

  function rwPaintImageState(imgData) {
    const preview = document.getElementById('rw-edit-image-preview');
    const empty = document.getElementById('rw-edit-image-empty');
    const removeBtn = document.getElementById('rw-edit-image-remove');
    const zone = document.getElementById('rw-edit-image-zone');
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

  function rwOpenEditor(key) {
    const t = rwTiles[key];
    if (!t) return;
    // A reward tile that isn't shown yet can't be configured — nudge its + toggle.
    const tileRow = [...document.querySelectorAll('#cp-rewards .cp-widget-row')]
      .find((r) => r.querySelector('[data-rw-key]')?.dataset.rwKey === key);
    if (tileRow && tileRow.classList.contains('off')) {
      const toggle = tileRow.querySelector('.toggle');
      if (toggle) {
        toggle.classList.add('cp-toggle-nudge');
        setTimeout(() => toggle.classList.remove('cp-toggle-nudge'), 600);
      }
      return;
    }
    rwEditKey = key;
    document.getElementById('rw-edit-title').textContent = t.name;
    document.getElementById('rw-edit-headline').value = t.headline;
    document.getElementById('rw-edit-desc').value = t.desc;
    document.getElementById('rw-edit-btn-text').value = t.btnText;
    rwPaintImageState(t.imgData);
    // Editing one reward card is an item-level edit, so it opens in the third
    // panel and the reward list stays visible beside it.
    const node = document.querySelector('[data-detail="rw-tile"]');
    window.openL3Panel?.(node);
    document.querySelectorAll('#cp-rewards .cp-widget-row').forEach((row) => {
      row.classList.toggle('l3-active', row.querySelector('[data-rw-key]')?.dataset.rwKey === key);
    });
  }

  document.querySelectorAll('[data-rw-key]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      rwOpenEditor(el.dataset.rwKey);
    });
  });

  document.querySelector('[data-detail="rw-tile"] .cp-back')?.addEventListener('click', () => {
    window.closeL3Panel?.();
  });

  ['rw-edit-headline', 'rw-edit-desc', 'rw-edit-btn-text'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      if (!rwEditKey) return;
      const t = rwTiles[rwEditKey];
      t.headline = document.getElementById('rw-edit-headline').value;
      t.desc = document.getElementById('rw-edit-desc').value;
      t.btnText = document.getElementById('rw-edit-btn-text').value;
      rwRenderPhone(rwEditKey);
      markDirty();
    });
  });

  const rwImageZone = document.getElementById('rw-edit-image-zone');
  const rwImageFile = document.getElementById('rw-edit-image-file');
  if (rwImageZone) {
    rwImageZone.addEventListener('click', () => rwImageFile.click());
    rwImageZone.addEventListener('dragover', (e) => { e.preventDefault(); rwImageZone.style.borderColor = 'var(--como)'; });
    rwImageZone.addEventListener('dragleave', () => { rwImageZone.style.borderColor = ''; });
    rwImageZone.addEventListener('drop', (e) => {
      e.preventDefault();
      rwImageZone.style.borderColor = '';
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) rwApplyImage(file);
    });
  }
  if (rwImageFile) {
    rwImageFile.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) rwApplyImage(e.target.files[0]);
    });
  }
  function rwApplyImage(file) {
    readImageFile(file, (dataUrl) => {
      if (!rwEditKey) return;
      rwTiles[rwEditKey].imgData = dataUrl;
      rwPaintImageState(dataUrl);
      rwRenderPhone(rwEditKey);
      markDirty();
    });
  }
  const rwImageRemove = document.getElementById('rw-edit-image-remove');
  if (rwImageRemove) {
    rwImageRemove.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!rwEditKey) return;
      rwTiles[rwEditKey].imgData = null;
      rwPaintImageState(null);
      rwImageFile.value = '';
      rwRenderPhone(rwEditKey);
      markDirty();
    });
  }


  return { rwTiles, rwRenderPhone, rwPaintImageState, rwOpenEditor, rwApplyImage };
}

