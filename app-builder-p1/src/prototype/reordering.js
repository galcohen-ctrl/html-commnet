export function initReordering() {
  // ---------- Drag & reorder for widget rows (tile-hang float) ----------
  function initReorderable(container, onReorder) {
    if (!container) return;
    let dragging = null;
    let startY = 0;
    let itemH = 0;
    let currentIdx = 0;
    let targetIdx = 0;
    let liveRows = [];

    const onMove = (e) => {
      if (!dragging) return;
      const deltaY = e.clientY - startY;
      dragging.style.transform = 'translateY(' + deltaY + 'px) scale(1.03) rotate(' + (deltaY > 0 ? 1.2 : -1.2) + 'deg)';

      const shift = Math.round(deltaY / itemH);
      const newTarget = Math.max(0, Math.min(liveRows.length - 1, currentIdx + shift));
      if (newTarget === targetIdx) return;
      targetIdx = newTarget;

      liveRows.forEach((r, i) => {
        if (r === dragging) return;
        let disp = 0;
        if (currentIdx < targetIdx && i > currentIdx && i <= targetIdx) disp = -itemH;
        else if (currentIdx > targetIdx && i < currentIdx && i >= targetIdx) disp = itemH;
        r.style.transform = 'translateY(' + disp + 'px)';
      });
    };

    const onUp = () => {
      if (!dragging) return;
      const draggedRow = dragging;
      const from = currentIdx;
      const to = targetIdx;

      // Settle animation
      draggedRow.style.transition = 'transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 260ms ease';
      draggedRow.style.transform = 'translateY(0) scale(1) rotate(0)';

      setTimeout(() => {
        if (from !== to && liveRows[to]) {
          const ref = liveRows[to];
          if (from < to) ref.parentNode.insertBefore(draggedRow, ref.nextSibling);
          else ref.parentNode.insertBefore(draggedRow, ref);
          if (onReorder) onReorder();
        }
        liveRows.forEach(r => {
          r.style.transform = '';
          r.style.transition = '';
        });
        draggedRow.classList.remove('dragging');
        draggedRow.style.zIndex = '';
        draggedRow.style.boxShadow = '';
        dragging = null;
        liveRows = [];
      }, 260);

      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    container.addEventListener('mousedown', (e) => {
      const handle = e.target.closest('.handle');
      if (!handle) return;
      const row = handle.closest('.cp-widget-row');
      // Allow reorder for on OR off rows — merchants often plan the layout before
      // toggling widgets on. Reorder passes read every row's key regardless.
      // The reels chip row uses cp-fixed-slot to opt out (chip is pinned on phone).
      if (!row || row.classList.contains('cp-fixed-slot')) return;
      e.preventDefault();

      liveRows = Array.from(container.querySelectorAll('.cp-widget-row:not(.cp-fixed-slot)'));
      currentIdx = liveRows.indexOf(row);
      targetIdx = currentIdx;
      dragging = row;
      startY = e.clientY;
      itemH = row.offsetHeight + 6;

      row.classList.add('dragging');
      liveRows.forEach(r => {
        if (r === row) return;
        r.style.transition = 'transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)';
      });

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  function reorderPhoneWidgets() {
    const homePage = document.querySelector('.app-page[data-page="home"]');
    if (!homePage) return;
    const container = document.querySelector('#cp-home .cp-master');
    if (!container) return;
    const anchor = homePage.querySelector('[data-empty="home"]');
    if (!anchor) return;
    const orderedKeys = Array.from(container.querySelectorAll('.cp-widget-row'))
      .map(r => r.querySelector('.toggle'))
      .filter(Boolean)
      .map(t => t.dataset.widgetToggle)
      // Reels chip is pinned to the top of the phone by CSS; skip it in the reorder pass.
      .filter(k => k !== 'menu-reels');
    let prev = anchor;
    orderedKeys.forEach(key => {
      // Keep each widget's skeleton block glued to the widget so the placeholder
      // renders in the same position when the widget is toggled off.
      const skeleton = homePage.querySelector('.gf-skel-widget[data-skel-for="' + key + '"]');
      if (skeleton) {
        prev.parentNode.insertBefore(skeleton, prev.nextSibling);
        prev = skeleton;
      }
      // querySelectorAll: a single toggle key can own multiple phone widgets
      // (e.g. `profile` covers both `.greet-row` and `.loyalty-card`).
      const widgets = homePage.querySelectorAll('[data-widget="' + key + '"]');
      widgets.forEach(widget => {
        prev.parentNode.insertBefore(widget, prev.nextSibling);
        prev = widget;
      });
    });
  }

  // Rewards reordering is owned by rewardsBlocks.js, which lays out reward cards
  // and merchant-added widgets from one shared config list.
  function reorderRewardsCards() {
    window.layoutRewardsStage?.();
  }

  initReorderable(document.querySelector('#cp-home .cp-master'), reorderPhoneWidgets);


  return { initReorderable, reorderPhoneWidgets, reorderRewardsCards };
}

