function slug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function pageKey(element) {
  return element.closest('.cp-page[id]')?.id?.replace(/^cp-/, '') || 'global';
}

const anchorGroups = [
  ['.app-page[data-page]', (element) => `phone-page-${element.dataset.page}`],
  ['.cp-page[id]', (element) => `config-page-${element.id.replace(/^cp-/, '')}`],
  ['.cp-detail[data-detail]', (element) => `config-detail-${element.dataset.detail}`],
  ['[data-widget]', (element) => `widget-${element.dataset.widget}`],
  ['[data-rw-tile]', (element) => `reward-card-${element.dataset.rwTile}`],
  ['.side-item[data-nav-page]', (element) => `nav-${element.dataset.navPage}`],
  ['.nav-item[data-nav]', (element) => `phone-nav-${element.dataset.nav}`],
  [
    '.cp-widget-row',
    (element) => {
      const key =
        element.querySelector('[data-widget-toggle]')?.dataset.widgetToggle ||
        element.querySelector('[data-rw-key]')?.dataset.rwKey ||
        element.querySelector('[data-drill]')?.dataset.drill;
      return key ? `config-${pageKey(element)}-widget-${slug(key)}` : '';
    },
  ],
  [
    '.cp-item[data-drill]',
    (element) => `config-${pageKey(element)}-item-${slug(element.dataset.drill)}`,
  ],
  [
    '.pc-item[data-pc-id]',
    (element) => {
      const list = element.closest('.pc-items-list')?.id || 'promo-cards';
      return `config-${slug(list)}-card-${slug(element.dataset.pcId)}`;
    },
  ],
  [
    '[data-pc-card]',
    (element) => {
      const widget = element.closest('[data-widget]')?.dataset.widget || 'promo-cards';
      return `widget-${slug(widget)}-card-${slug(element.dataset.pcCard)}`;
    },
  ],
  [
    '.cp-toggle-row',
    (element) => {
      const binding = element.querySelector('[data-bind]')?.dataset.bind;
      return binding ? `config-${pageKey(element)}-toggle-${slug(binding)}` : '';
    },
  ],
  [
    '.cp-radio-group',
    (element) => {
      const binding = element.querySelector('[data-bind-radio]')?.dataset.bindRadio;
      return binding ? `config-${pageKey(element)}-choice-${slug(binding)}` : '';
    },
  ],
];

function elementsWithin(root, selector) {
  const matches = root.matches?.(selector) ? [root] : [];
  return matches.concat([...(root.querySelectorAll?.(selector) || [])]);
}

function applyCommentAnchors(root = document) {
  anchorGroups.forEach(([selector, getAnchor]) => {
    elementsWithin(root, selector).forEach((element) => {
      if (element.dataset.commentAnchor) return;
      const anchor = getAnchor(element);
      if (anchor) element.dataset.commentAnchor = anchor;
    });
  });
}

export function installCommentAnchors() {
  applyCommentAnchors();

  // Widgets and promo cards can be created after startup. Anchor them as soon
  // as they enter the DOM so review comments remain durable after reordering.
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) applyCommentAnchors(node);
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}
