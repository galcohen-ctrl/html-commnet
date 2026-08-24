/**
 * Skeleton preview mode.
 *
 * Blank-canvas apps start with merchant-owned fields shown as shimmer bars
 * (text) or dashed hint-frames (images / widget slots). The moment the
 * merchant enters a real value in the config panel, the shimmer/frame is
 * replaced by their input. Member-owned data (points, tier, progress)
 * stays as realistic sample content and is not affected.
 */

// Selector → { hintLabel } for merchant-owned phone fields that shimmer.
const TEXT_TARGETS = [
  { sel: '.app-page[data-page="home"] .app-top-header .brand-text .name', hint: 'Your business' },
  { sel: '.greet-row .hello', hint: 'Your greeting' },
  { sel: '.guest-state .g-title', hint: 'Welcome title' },
  { sel: '.guest-state .g-sub', hint: 'Guest subheading' },
];

// Image-like slots that get a dashed hint-frame with a label.
const IMAGE_TARGETS = [
  { sel: '.pc-card-img', hint: 'Add a promo image' },
];

// Business name is a merchant-owned field; treat any non-default value as filled.
function isBusinessNameFilled() {
  const el = document.querySelector('.app-page[data-page="home"] .app-top-header .brand-text .name');
  if (!el) return false;
  const value = (el.textContent || '').trim();
  return value.length > 0 && value !== 'Your Business';
}

function markText(target) {
  const el = document.querySelector(target.sel);
  if (!el) return;
  const value = (el.textContent || el.value || '').trim();
  const isPlaceholder = value === '' || value === 'Your Business';
  el.classList.toggle('gf-blank', isPlaceholder);
  if (isPlaceholder) el.setAttribute('data-gf-hint', target.hint);
  else el.removeAttribute('data-gf-hint');
}

function markImage(target) {
  document.querySelectorAll(target.sel).forEach((el) => {
    const hasContent = el.classList.contains('has-upload') ||
      el.classList.contains('beef') || el.classList.contains('choc') || el.classList.contains('sushi');
    el.classList.toggle('gf-hint', !hasContent);
    if (!hasContent) el.setAttribute('data-gf-hint', target.hint);
    else el.removeAttribute('data-gf-hint');
  });
}

// Some skeletons cover a whole container (grid, list) instead of one widget.
// They hide when ANY element in the container is no longer hidden-slot.
const CONTAINER_SKELETONS = {
  'more-tiles': '.app-page[data-page="more"] .more-tile',
  'locations-list': '.app-page[data-page="locations"] .loc-card',
};

// A skeleton block for widget X hides once the real widget X is on the page.
function updateWidgetSkeletons() {
  document.querySelectorAll('.gf-skel-widget[data-skel-for]').forEach((skel) => {
    const key = skel.dataset.skelFor;

    // Container-style skeleton: hide once any item inside the container is on
    if (CONTAINER_SKELETONS[key]) {
      const anyOn = [...document.querySelectorAll(CONTAINER_SKELETONS[key])]
        .some((el) => !el.classList.contains('hidden-slot'));
      skel.style.display = anyOn ? 'none' : '';
      return;
    }

    // Single-widget skeleton: try data-widget first, then data-slot-name
    // (Home widgets use data-widget; Rewards cards use data-slot-name)
    const real =
      document.querySelector(`[data-widget="${key}"]`) ||
      document.querySelector(`[data-slot-name="${key}"]`);
    const widgetOn = real && !real.classList.contains('hidden-slot');
    skel.style.display = widgetOn ? 'none' : '';
  });
}

function applyMarks() {
  if (!document.body.classList.contains('gf-skeleton')) return;
  TEXT_TARGETS.forEach(markText);
  IMAGE_TARGETS.forEach(markImage);
  updateWidgetSkeletons();
}

export function enterSkeletonMode() {
  document.body.classList.add('gf-skeleton');
  applyMarks();
}

export function exitSkeletonMode() {
  document.body.classList.remove('gf-skeleton');
  document.querySelectorAll('.gf-blank, .gf-hint').forEach((el) => {
    el.classList.remove('gf-blank', 'gf-hint');
    el.removeAttribute('data-gf-hint');
  });
}

/**
 * Wire up the skeleton so it turns off field-by-field as the merchant edits.
 * We watch the shared preview via a MutationObserver; the bindings module
 * writes into these elements directly, so no extra hooks are needed.
 */
export function initSkeletonPreview(ctx) {
  // Default state: skeleton on for the blank canvas start.
  enterSkeletonMode();
  applyMarks();
  // If the Menu tab rendered its "no menu yet" placeholder before skeleton
  // mode was on, refresh it so the skeleton version appears instead.
  ctx?.renderMenuPhone?.();

  const preview = document.getElementById('preview-area') || document.body;
  const observer = new MutationObserver(() => {
    if (!document.body.classList.contains('gf-skeleton')) return;
    // Reapply marks so newly rendered promo cards get the hint frame, and
    // fields the merchant just filled lose their shimmer.
    applyMarks();
  });
  observer.observe(preview, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class', 'style'],
  });

  // Business-name input in the branding/business config exits skeleton for that field only
  document.addEventListener('input', (event) => {
    const nameInput = event.target?.closest?.('#gf-biz-name, #sw-biz-name, [data-bind-text*="brand-text"]');
    if (nameInput && isBusinessNameFilled()) {
      const el = document.querySelector('.app-page[data-page="home"] .app-top-header .brand-text .name');
      el?.classList.remove('gf-blank');
      el?.removeAttribute('data-gf-hint');
    }
  });

  return { enterSkeletonMode, exitSkeletonMode };
}
