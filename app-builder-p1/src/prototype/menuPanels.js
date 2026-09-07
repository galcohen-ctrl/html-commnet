const TITLES = { webview: 'Menu website', pdf: 'PDF menu', 'build-categories': 'Build your menu', 'build-items': 'Category' };

export function createMenuPanels(ctx, page, screens) {
  const moved = new Map();
  let changing = false;
  let mainScreen = 'chooser';

  function restore(element, entry) {
    entry.marker.replaceWith(element);
    element.querySelector(':scope > .menu-panel-toolbar')?.remove();
    element.classList.remove('cp-detail', 'show', 'active', 'menu-source-panel');
    moved.delete(element);
  }

  function paintMain() {
    page.dataset.menuView = mainScreen;
    screens.forEach((element) => {
      if (!moved.has(element)) element.classList.toggle('active', element.dataset.ms === mainScreen);
    });
  }

  function restoreClosed() {
    if (changing) return;
    moved.forEach((entry, element) => {
      if (!document.body.classList.contains(`l${entry.level}-open`) || !element.classList.contains('show')) restore(element, entry);
    });
    paintMain();
  }

  function close() {
    changing = true;
    ctx.closeL3Panel();
    moved.forEach((entry, element) => restore(element, entry));
    changing = false;
    paintMain();
  }

  function main(key) {
    close();
    mainScreen = key;
    paintMain();
    document.getElementById('config-panel').scrollTop = 0;
  }

  function open(key, level = 3, base = 'chooser') {
    const element = screens.find((screen) => screen.dataset.ms === key);
    if (!element) return;
    changing = true;
    if (level === 3) ctx.closeL3Panel();
    else ctx.closeL4Panel();
    moved.forEach((entry, node) => {
      if (entry.level >= level) restore(node, entry);
    });
    mainScreen = base;
    if (!element.querySelector(':scope > .menu-panel-toolbar')) {
      const toolbar = document.createElement('div');
      toolbar.className = 'menu-panel-toolbar';
      const title = document.createElement('h2');
      title.className = 'cp-detail-title';
      title.textContent = TITLES[key] || 'Menu';
      const closeButton = document.createElement('button');
      closeButton.type = 'button';
      closeButton.className = 'menu-panel-close';
      closeButton.setAttribute('aria-label', `Close ${TITLES[key] || 'menu'} panel`);
      closeButton.title = closeButton.getAttribute('aria-label');
      closeButton.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>';
      closeButton.addEventListener('click', () => level === 3 ? ctx.closeL3Panel() : ctx.closeL4Panel());
      toolbar.append(title, closeButton);
      element.prepend(toolbar);
    }
    const marker = document.createComment(`menu ${key} panel`);
    element.before(marker);
    moved.set(element, { marker, level });
    element.classList.add('cp-detail', 'menu-source-panel', 'active');
    element.dataset.detail = `menu-${key}`;
    if (level === 3) ctx.openL3Panel(element);
    else ctx.openL4Panel(element);
    changing = false;
    paintMain();
  }

  document.addEventListener('como:navchange', restoreClosed);
  return { main, open, close, isOpen: (key) => [...moved.keys()].some((element) => element.dataset.ms === key) };
}