const anchorGroups = [
  ['.app-page[data-page]', (element) => `phone-page-${element.dataset.page}`],
  ['.cp-detail[data-detail]', (element) => `config-detail-${element.dataset.detail}`],
  ['[data-widget]', (element) => `widget-${element.dataset.widget}`],
  ['.side-item[data-nav-page]', (element) => `nav-${element.dataset.navPage}`],
  // Per-step/pane anchors so comments don't bleed across modal sub-views
  ['.sm-pane[data-sm-pane]', (element) => `settings-pane-${element.dataset.smPane}`],
  ['.sm-oo-step[data-oo-step]', (element) => `settings-oo-step-${element.dataset.ooStep}`],
  ['.ms-screen[data-ms]', (element) => `menu-screen-${element.dataset.ms}`],
  ['.phone-modal[data-modal]', (element) => `phone-modal-${element.dataset.modal}`],
];

export function installCommentAnchors() {
  anchorGroups.forEach(([selector, getAnchor]) => {
    document.querySelectorAll(selector).forEach((element) => {
      if (!element.dataset.commentAnchor) {
        element.dataset.commentAnchor = getAnchor(element);
      }
    });
  });
}
