/**
 * Phone preview is view-only: taps never change the config panel or the step.
 * Taps that only change what the phone shows (opening a webview, a Promo Card
 * tap action, the QR or profile overlay, carousels, the member switcher) stay live.
 */
export function initPhoneLock() {
  const frame = document.getElementById('device-frame');
  if (!frame) return {};

  // Anything that moves the editor to another step or screen: the bottom bar,
  // the header that jumps to Branding, and legacy inline goToPage() buttons.
  const NAVIGATES_EDITOR = '#bottom-nav, .header-tap-target, .brand-mark, .brand-text';

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element) || !frame.contains(target)) return;
    const inline = target.closest('[onclick]');
    const blocked = target.closest(NAVIGATES_EDITOR)
      || (inline && /goToPage\(/.test(inline.getAttribute('onclick') || ''));
    if (!blocked) return;
    event.stopImmediatePropagation();
    event.preventDefault();
  }, true);

  return {};
}
