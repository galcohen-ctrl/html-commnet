/**
 * Hover ghost preview.
 *
 * A reviewer asked for widgets to be enabled automatically per App Focus, but that
 * would let a focus choice overwrite the merchant's canvas. Instead, hovering a
 * widget row previews that widget on the phone in a dimmed "ghost" state between
 * the skeleton and the live widget, so merchants can see what they would get
 * before committing. Nothing is mutated: leaving the row restores the real state.
 */

// A config row's key maps to phone element(s) and the skeleton block standing in for them.
const REWARD_SLOTS = { gifts: 'rewards-gifts', points: 'rewards-points', punch: 'rewards-punch' };

export function initGhostPreview() {
  let activeKeys = null;

  function targetsFor(row) {
    const homeToggle = row.querySelector('[data-widget-toggle]');
    if (homeToggle) {
      const homeKey = homeToggle.dataset.widgetToggle;
      // Some widgets (the reels chip) have no data-widget, so fall back to the
      // selector the toggle already binds to.
      let widgets = [...document.querySelectorAll(`[data-widget="${homeKey}"]`)];
      if (!widgets.length && homeToggle.dataset.bind) {
        widgets = [...document.querySelectorAll(homeToggle.dataset.bind)];
      }
      return {
        widgets,
        skeletons: [...document.querySelectorAll(`.gf-skel-widget[data-skel-for="${homeKey}"]`)],
      };
    }
    const rewardKey = row.querySelector('[data-rw-key]')?.dataset.rwKey;
    if (rewardKey) {
      return {
        widgets: [...document.querySelectorAll(`[data-rw-tile="${rewardKey}"]`)],
        skeletons: [...document.querySelectorAll(`.gf-skel-widget[data-skel-for="${REWARD_SLOTS[rewardKey]}"]`)],
      };
    }
    return null;
  }

  function clearGhost() {
    if (!activeKeys) return;
    activeKeys.widgets.forEach((el) => {
      el.classList.remove('widget-ghost');
      // Restore from the toggle rather than a remembered flag, so a widget the
      // merchant switched on mid-hover stays on.
      if (el.dataset.ghostWasHidden === '1') el.classList.add('hidden-slot');
      delete el.dataset.ghostWasHidden;
    });
    activeKeys.skeletons.forEach((el) => { el.style.visibility = ''; });
    activeKeys = null;
  }

  function showGhost(row) {
    const t = targetsFor(row);
    if (!t || !t.widgets.length) return;
    // Only preview what is not already on screen.
    const hidden = t.widgets.filter((el) => el.classList.contains('hidden-slot'));
    if (!hidden.length) return;

    clearGhost();
    hidden.forEach((el) => {
      el.dataset.ghostWasHidden = '1';
      el.classList.remove('hidden-slot');
      el.classList.add('widget-ghost');
    });
    t.skeletons.forEach((el) => { el.style.visibility = 'hidden'; });
    activeKeys = { widgets: hidden, skeletons: t.skeletons };
  }

  function syncRow(row) {
    const t = targetsFor(row);
    const on = row.classList.contains('on');
    if (!t) return;
    t.widgets.forEach((el) => {
      el.classList.remove('widget-ghost');
      el.classList.toggle('hidden-slot', !on);
      delete el.dataset.ghostWasHidden;
    });
    t.skeletons.forEach((el) => { el.style.visibility = ''; });
    activeKeys = null;
  }

  document.querySelectorAll('#cp-home, #cp-rewards').forEach((page) => {
    page.addEventListener('mouseover', (e) => {
      const row = e.target.closest('.cp-widget-row');
      if (!row || !page.contains(row)) return;
      if (row.classList.contains('on')) { clearGhost(); return; }
      showGhost(row);
    });
    page.addEventListener('mouseout', (e) => {
      const row = e.target.closest('.cp-widget-row');
      if (!row) return;
      if (row.contains(e.relatedTarget)) return;
      clearGhost();
    });
    // A click may flip the toggle; re-derive visibility from the row instead of
    // restoring the pre-hover state.
    page.addEventListener('click', (e) => {
      const row = e.target.closest('.cp-widget-row');
      if (row) requestAnimationFrame(() => syncRow(row));
    });
  });

  return { clearGhost };
}
