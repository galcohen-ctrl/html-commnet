import { clamp, isVisible } from './utils.js';

const MEANINGFUL_SELECTOR = [
  '.modal',
  '.phone',
  '.pscreen',
  '.cp-widget-row',
  '.cp-detail',
  '.cp-radio-group',
  '.cp-color-hex',
  '.preview-toggles',
  '[data-widget]',
  'button',
  'input',
  'select',
  'textarea',
  'label',
  'h1',
  'h2',
  'h3',
  'h4',
  'p',
  'li',
].join(',');

const SPECIFIC_SELECTOR = [
  '.cp-widget-row',
  '.cp-detail',
  '.cp-radio-group',
  '.cp-color-hex',
  '.preview-toggles',
  '[data-widget]',
  'button',
  'input',
  'select',
  'textarea',
  'label',
  'h1',
  'h2',
  'h3',
  'h4',
  'p',
  'li',
].join(',');

export function cssEscape(value) {
  if (window.CSS?.escape) return window.CSS.escape(String(value));
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}

function attributeEscape(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function isCommentOverlayElement(element) {
  return Boolean(element?.closest?.('[data-comment-overlay]'));
}

export function isCommentOverlayMutation(mutation) {
  if (isCommentOverlayElement(mutation.target)) return true;
  const changedNodes = [...mutation.addedNodes, ...mutation.removedNodes];
  return (
    changedNodes.length > 0 &&
    changedNodes.every(
      (node) => node.nodeType === Node.ELEMENT_NODE && isCommentOverlayElement(node),
    )
  );
}

function screenName(screen) {
  if (!screen) return 'unknown';
  return screen.dataset.page || screen.id?.replace(/^s-/, '') || 'unknown';
}

export function currentScreen() {
  return screenName(
    document.querySelector('.app-page.active') ||
      document.querySelector('.screen:not(.hidden)'),
  );
}

export function screenForElement(element) {
  const screen =
    element?.closest?.('.app-page') || element?.closest?.('.screen');
  return screen ? screenName(screen) : currentScreen();
}

export function chooseCommentAnchor(element) {
  if (!element || isCommentOverlayElement(element)) return null;

  // Preserve precise control/content comments even inside a large anchored region.
  const specificElement = element.closest?.(SPECIFIC_SELECTOR);
  if (specificElement) return specificElement;

  // Product regions can opt into a durable anchor that survives markup refactors.
  const durableAnchor = element.closest?.('[data-comment-anchor]');
  if (durableAnchor) return durableAnchor;
  return element.closest?.(MEANINGFUL_SELECTOR) || element;
}

function isUnique(selector) {
  try {
    return document.querySelectorAll(selector).length === 1;
  } catch {
    return false;
  }
}

function durableSelectorFor(element) {
  const commentAnchor = element?.getAttribute?.('data-comment-anchor');
  if (!commentAnchor) return '';
  const anchorSelector = `[data-comment-anchor="${attributeEscape(commentAnchor)}"]`;
  if (isUnique(anchorSelector)) return anchorSelector;

  const page = element.closest('.app-page[data-page]');
  if (!page) return '';
  const pageSelector = `.app-page[data-page="${attributeEscape(page.dataset.page)}"] ${anchorSelector}`;
  return isUnique(pageSelector) ? pageSelector : '';
}

export function selectorForElement(element) {
  if (!element || element.nodeType !== Node.ELEMENT_NODE) return '';

  const ownDurableSelector = durableSelectorFor(element);
  if (ownDurableSelector) return ownDurableSelector;

  if (element.id && isUnique(`#${cssEscape(element.id)}`)) {
    return `#${cssEscape(element.id)}`;
  }

  const screen = element.closest('.app-page[data-page],.screen[id]');
  const screenSelector = screen?.dataset.page
    ? `.app-page[data-page="${attributeEscape(screen.dataset.page)}"]`
    : screen?.id
      ? `#${cssEscape(screen.id)}`
      : '';
  const attributes = [
    'data-widget',
    'data-detail',
    'data-bind',
    'data-bind-radio',
    'data-value',
  ];
  const candidates = [];
  const durableScope = durableSelectorFor(
    element.parentElement?.closest?.('[data-comment-anchor]'),
  );

  for (const attribute of attributes) {
    if (!element.hasAttribute(attribute)) continue;
    const base = `${element.tagName.toLowerCase()}[${attribute}="${attributeEscape(
      element.getAttribute(attribute),
    )}"]`;
    if (durableScope) candidates.push(`${durableScope} ${base}`);
    candidates.push(base);
    if (screenSelector) candidates.push(`${screenSelector} ${base}`);
  }

  if (typeof element.className === 'string' && element.className.trim()) {
    const classes = element.className
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 3)
      .map(cssEscape)
      .join('.');
    const base = `${element.tagName.toLowerCase()}.${classes}`;
    if (durableScope) candidates.push(`${durableScope} ${base}`);
    candidates.push(base);
    if (screenSelector) candidates.push(`${screenSelector} ${base}`);
  }

  const uniqueCandidate = candidates.find(isUnique);
  if (uniqueCandidate) return uniqueCandidate;

  const parts = [];
  let current = element;
  while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
    let part = current.tagName.toLowerCase();
    const durableSelector = durableSelectorFor(current);
    if (durableSelector) {
      parts.unshift(durableSelector);
      break;
    }
    if (current.id) {
      parts.unshift(`#${cssEscape(current.id)}`);
      break;
    }
    if (typeof current.className === 'string' && current.className.trim()) {
      const classes = current.className
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(cssEscape)
        .join('.');
      if (classes) part += `.${classes}`;
    }
    const siblings = [...(current.parentElement?.children || [])].filter(
      (sibling) => sibling.tagName === current.tagName,
    );
    if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
    parts.unshift(part);
    if (isUnique(parts.join(' > '))) return parts.join(' > ');
    current = current.parentElement;
  }
  return parts.join(' > ');
}

export function targetForPoint(element, clientX, clientY) {
  const rect = element.getBoundingClientRect();
  const commentAnchor = element.getAttribute('data-comment-anchor') || undefined;
  return {
    selector: selectorForElement(element),
    ...(commentAnchor ? { commentAnchor } : {}),
    context: String(
      element.textContent || element.value || element.getAttribute('title') || '',
    )
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 90),
    relativeX: clamp((clientX - rect.left) / Math.max(1, rect.width)),
    relativeY: clamp((clientY - rect.top) / Math.max(1, rect.height)),
    fallbackClientX: clientX,
    fallbackClientY: clientY,
  };
}

export function findCommentTarget(comment) {
  // Prefer the exact selector (more specific); durable anchor is the fallback.
  const selector = comment?.target?.selector;
  if (selector) {
    try {
      const element = document.querySelector(selector);
      if (element) return element;
    } catch {
      // Fall through to the stable anchor.
    }
  }

  const durableAnchor = comment?.target?.commentAnchor;
  if (!durableAnchor) return null;

  const anchorSelector = `[data-comment-anchor="${attributeEscape(durableAnchor)}"]`;

  // If the stored selector was more specific than the anchor but failed to match,
  // the real target isn't on screen (e.g. a different wizard step) — don't
  // fall back to the broad container.
  if (selector && selector !== anchorSelector && !selector.startsWith(anchorSelector)) {
    return null;
  }

  try {
    return document.querySelector(anchorSelector);
  } catch {
    return null;
  }
}

// Returns the topmost full-screen overlay if one is active, so pins behind it
// are hidden instead of floating under the overlay.
function activeOverlay() {
  const wizard = document.getElementById('setup-wizard');
  if (wizard && window.getComputedStyle(wizard).display !== 'none') return wizard;
  const settings = document.getElementById('settings-modal');
  if (settings && settings.classList.contains('open')) return settings;
  return null;
}

function normalizeText(text) {
  return String(text || '').trim().replace(/\s+/g, ' ');
}

// Check whether the element's current text still overlaps the context that was
// captured when the comment was placed.  Catches cross-step mismatches where
// the same CSS selector exists on every wizard step but shows different content.
function contextMatches(element, storedContext) {
  if (!storedContext || storedContext.length < 12) return true;
  const current = normalizeText(element.textContent).slice(0, 90);
  if (!current) return true;
  const len = Math.min(50, storedContext.length, current.length);
  return current.slice(0, len) === storedContext.slice(0, len);
}

export function pinPositionForComment(comment) {
  const target = findCommentTarget(comment);
  if (!target || !isVisible(target)) return { x: -100, y: -100, visible: false };

  // Hide pins for elements that sit behind the active full-screen overlay
  const overlay = activeOverlay();
  if (overlay && !overlay.contains(target)) return { x: -100, y: -100, visible: false };

  // Hide if matched element's text diverged from the stored context
  if (!contextMatches(target, comment.target?.context)) {
    return { x: -100, y: -100, visible: false };
  }

  const rect = target.getBoundingClientRect();
  const relativeX = Number.isFinite(Number(comment.target?.relativeX))
    ? Number(comment.target.relativeX)
    : 0.5;
  const relativeY = Number.isFinite(Number(comment.target?.relativeY))
    ? Number(comment.target.relativeY)
    : 0.5;
  return {
    x: rect.left + clamp(relativeX) * rect.width,
    y: rect.top + clamp(relativeY) * rect.height,
    visible: true,
  };
}
