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
      if (!row || !row.classList.contains('on')) return;
      e.preventDefault();

      liveRows = Array.from(container.querySelectorAll('.cp-widget-row.on'));
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
      .map(t => t.dataset.widgetToggle);
    let prev = anchor;
    orderedKeys.forEach(key => {
      const widget = homePage.querySelector('[data-widget="' + key + '"]');
      if (widget) {
        prev.parentNode.insertBefore(widget, prev.nextSibling);
        prev = widget;
      }
    });
  }

  // Rewards cards (My Gifts / My Points Shop / Punch Card) share one flex container,
  // so reordering is just re-appending each card in the config panel's row order.
  function reorderRewardsCards() {
    const rewardsPage = document.querySelector('.app-page[data-page="rewards"]');
    if (!rewardsPage) return;
    const container = document.querySelector('#cp-rewards .cp-master');
    if (!container) return;
    const wrap = rewardsPage.querySelector('.rewards-progs');
    if (!wrap) return;
    const orderedKeys = Array.from(container.querySelectorAll('.cp-widget-row'))
      .map(r => r.querySelector('.w-name'))
      .filter(Boolean)
      .map(n => n.dataset.rwKey);
    orderedKeys.forEach(key => {
      const card = wrap.querySelector('[data-rw-tile="' + key + '"]');
      if (card) wrap.appendChild(card);
    });
  }

  initReorderable(document.querySelector('#cp-home .cp-master'), reorderPhoneWidgets);
  initReorderable(document.querySelector('#cp-rewards .cp-master'), reorderRewardsCards);


  return { initReorderable, reorderPhoneWidgets, reorderRewardsCards };
}
