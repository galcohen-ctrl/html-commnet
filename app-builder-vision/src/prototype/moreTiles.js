/**
 * More step: the tile list mirrors the phone's More grid. Rows can be dragged to
 * reorder the tiles, switched on or off, and pages with their own layout (built-in
 * pages and custom pages) get a pencil that opens their editor. Tiles that are
 * full steps (Home, Rewards, Menu, Locations) or Hub 2 content have no pencil.
 */

const NAME_TO_KEY = {
  Home: 'home', 'My Account': 'account', 'My Orders': 'orders', 'Loyalty Rewards': 'rewards',
  'Our Menu': 'menu', 'Find a Cafe': 'locations', 'Refer a Friend': 'referral', 'Our Story': 'story',
  'Contact Us': 'contact', 'About Us': 'about', 'Share Credit': 'share-credit', 'My Gifts': 'gifts', 'Point Shop': 'point-shop',
};
const STEP_TILES = { home: 'Home', rewards: 'Rewards', menu: 'Menu', locations: 'Locations' };
const HUB_TILES = new Set(['share-credit', 'gifts', 'point-shop']);

const PENCIL = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12.5 3l4.5 4.5-10 10H2.5v-4.5l10-10z"/><path d="M11 4.5l4.5 4.5"/></svg>';

export function initMoreTiles(ctx) {
  const grid = document.querySelector('.more-grid');
  const section = [...document.querySelectorAll('#cp-more .cp-section')].find((el) => /More tiles/.test(el.querySelector('.cp-head-row')?.textContent || ''));
  const body = section?.querySelector('.cp-body');
  if (!grid || !body) return {};

  body.innerHTML = '<div class="more-tile-list"></div><div class="cp-hint-inline">Drag ⠿ to reorder. Use the pencil to edit a page\'s content.</div>';
  const list = body.querySelector('.more-tile-list');

  const keyOf = (tile) => tile.dataset.tileKey
    || (tile.dataset.memberPage?.startsWith('cpage-') ? tile.dataset.memberPage : null)
    || NAME_TO_KEY[tile.querySelector('.t-name')?.textContent.trim()]
    || tile.dataset.memberPage
    || null;

  const editableBuiltIn = (key) => (window.BUILTIN_PAGES || []).some((item) => item.key === key && item.editable);
  const kindOf = (key) => {
    if (key?.startsWith('cpage-')) return 'custom';
    if (STEP_TILES[key]) return 'step';
    if (HUB_TILES.has(key)) return 'hub';
    return editableBuiltIn(key) ? 'builtin' : 'hub';
  };
  const tileFor = (key) => grid.querySelector(`.more-tile[data-tile-key="${key}"]`);

  function openEditor(key) {
    const kind = kindOf(key);
    if (kind === 'builtin') window.openBuiltInPageEditor?.(key);
    else if (kind === 'custom') window.openCustomPage?.(key.replace('cpage-', ''), 'more');
    list.querySelectorAll('.cp-widget-row').forEach((row) => row.classList.toggle('l3-active', row.dataset.tileKey === key && kind === 'builtin'));
  }

  function rowFor(tile) {
    const key = keyOf(tile);
    tile.dataset.tileKey = key;
    const kind = kindOf(key);
    const on = !tile.classList.contains('hidden-slot');
    const row = document.createElement('div');
    row.className = `cp-widget-row more-tile-row ${on ? 'on' : 'off'}`;
    row.dataset.tileKey = key;
    row.dataset.kind = kind;
    const hint = kind === 'step' ? `Edited in the ${STEP_TILES[key]} step` : kind === 'hub' ? 'Content comes from Hub 2' : '';
    if (hint) row.title = hint;
    row.innerHTML = `<span class="handle">⠿</span><span class="w-name"></span><span class="toggle${on ? ' on' : ''}" data-bind=".more-tile[data-tile-key=&quot;${key}&quot;]" role="switch" tabindex="0" aria-checked="${on}" title="Show in More"></span>`
      + (kind === 'builtin' || kind === 'custom' ? `<button class="w-edit-icon" type="button" title="Edit page" aria-label="Edit page">${PENCIL}</button>` : '<span class="more-tile-spacer" aria-hidden="true"></span>');
    row.querySelector('.w-name').textContent = tile.querySelector('.t-name')?.textContent.trim() || key;
    const toggle = row.querySelector('.toggle');
    toggle.setAttribute('aria-label', row.querySelector('.w-name').textContent);
    ctx.wireToggle?.(toggle);
    toggle.addEventListener('click', () => {
      const nowOn = toggle.classList.contains('on');
      row.classList.toggle('on', nowOn);
      row.classList.toggle('off', !nowOn);
      toggle.setAttribute('aria-checked', String(nowOn));
      document.dispatchEvent(new CustomEvent('como:pages-changed'));
      // Like Home sections, switching a page on opens its editor straight away.
      if (nowOn && (kind === 'builtin' || kind === 'custom')) openEditor(key);
      if (!nowOn && row.classList.contains('l3-active')) window.closeL3Panel?.();
    });
    toggle.addEventListener('keydown', (event) => { if ([' ', 'Enter'].includes(event.key)) { event.preventDefault(); toggle.click(); } });
    row.addEventListener('click', (event) => {
      if (event.target.closest('.handle, .toggle')) return;
      if (kind !== 'builtin' && kind !== 'custom') return;
      if (row.classList.contains('off')) {
        toggle.classList.add('cp-toggle-nudge');
        setTimeout(() => toggle.classList.remove('cp-toggle-nudge'), 600);
        return;
      }
      openEditor(key);
    });
    return row;
  }

  // Rows are the source of truth for order; the phone grid follows them.
  function applyOrder() {
    [...list.querySelectorAll('.cp-widget-row')].forEach((row) => {
      const tile = tileFor(row.dataset.tileKey);
      if (tile) grid.appendChild(tile);
    });
  }

  function sync() {
    const tiles = [...grid.querySelectorAll('.more-tile')];
    tiles.forEach((tile) => { if (!tile.dataset.tileKey) tile.dataset.tileKey = keyOf(tile); });
    const keys = new Set(tiles.map((tile) => tile.dataset.tileKey));
    list.querySelectorAll('.cp-widget-row').forEach((row) => { if (!keys.has(row.dataset.tileKey)) row.remove(); });
    tiles.forEach((tile) => {
      const existing = list.querySelector(`.cp-widget-row[data-tile-key="${tile.dataset.tileKey}"]`);
      if (existing) {
        existing.querySelector('.w-name').textContent = tile.querySelector('.t-name')?.textContent.trim() || tile.dataset.tileKey;
        const on = !tile.classList.contains('hidden-slot');
        existing.classList.toggle('on', on);
        existing.classList.toggle('off', !on);
        existing.querySelector('.toggle').classList.toggle('on', on);
      } else list.appendChild(rowFor(tile));
    });
    applyOrder();
  }

  ctx.initReorderable?.(list, () => { applyOrder(); ctx.markDirty?.(); });
  sync();
  window.moreTiles = { sync };
  return { syncMoreTiles: sync };
}
