export function initSystem(ctx = {}) {
  function saveDraft() {
    const saved = ctx.savePersistedDraft?.();
    if (saved === false) return false;
    if (saved === undefined) document.dispatchEvent(new CustomEvent('como:draft-save'));
    return true;
  }

  function markDirty(scope = 'content') {
    if (document.body.classList.contains('gf-restoring')) return;
    const resolvedScope = typeof scope === 'string' ? scope : 'content';
    document.dispatchEvent(new CustomEvent('como:draft-dirty', { detail: { scope: resolvedScope } }));
  }
  document.addEventListener('como:draft-save-error', () => {
    showToast('Could not save your app. Try again.', { variant: 'error' });
  });

  // ---------- Toast helper ----------
  const toastEl = document.getElementById('toast-hint');
  const toastMessage = document.getElementById('toast-message');
  const toastAction = document.getElementById('toast-action');
  let toastTimer;
  function showToast(msg, options = {}) {
    if (!toastEl || !toastMessage) return;
    toastMessage.textContent = msg;
    toastEl.classList.toggle('toast-success', options.variant === 'success');
    toastEl.classList.toggle('toast-error', options.variant === 'error');
    if (toastAction) {
      toastAction.hidden = !options.actionLabel;
      toastAction.textContent = options.actionLabel || '';
      toastAction.onclick = options.actionLabel
        ? () => {
            toastEl.classList.remove('show');
            options.onAction?.();
          }
        : null;
    }
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    // Errors stay longer: they usually tell the merchant what to fix.
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), options.duration || (options.actionLabel ? 6000 : options.variant === 'error' ? 4200 : 2600));
  }

  // ---------- Live clock ----------
  function tick() {
    const d = new Date();
    document.getElementById('clock').textContent =
      d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  }
  tick();
  setInterval(tick, 30000);
  return { markDirty, showToast, saveDraft };
}
