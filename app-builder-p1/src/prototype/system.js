export function initSystem(ctx = {}) {
  // ---------- Autosaved draft ----------
  const saveBtn = document.getElementById('save-btn');
  let saveTimer;
  let dirty = false;

  function renderSaveState(label, state) {
    if (!saveBtn) return;
    saveBtn.textContent = label;
    saveBtn.dataset.state = state;
    saveBtn.classList.toggle('disabled', state === 'saved');
  }

  function commitDraft() {
    clearTimeout(saveTimer);
    saveTimer = null;
    const saved = ctx.savePersistedDraft?.();
    if (saved === false) {
      dirty = true;
      renderSaveState('Retry save', 'error');
      return false;
    }
    if (saved === undefined) document.dispatchEvent(new CustomEvent('como:draft-save'));
    dirty = false;
    renderSaveState('Draft saved', 'saved');
    return true;
  }

  function markDirty(scope = 'content') {
    if (document.body.classList.contains('gf-restoring')) return;
    const resolvedScope = typeof scope === 'string' ? scope : 'content';
    dirty = true;
    document.dispatchEvent(new CustomEvent('como:draft-dirty', { detail: { scope: resolvedScope } }));
    renderSaveState('Saving…', 'saving');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(commitDraft, 550);
  }
  saveBtn?.addEventListener('click', () => {
    if (!dirty && saveBtn.dataset.state !== 'error') return;
    if (commitDraft()) showToast('Draft saved');
  });
  document.addEventListener('como:draft-save-error', () => {
    dirty = true;
    renderSaveState('Couldn\'t save', 'error');
  });

  // ---------- Toast helper ----------
  const toastEl = document.getElementById('toast-hint');
  const toastMessage = document.getElementById('toast-message');
  const toastAction = document.getElementById('toast-action');
  let toastTimer;
  function showToast(msg, options = {}) {
    if (!toastEl || !toastMessage) return;
    toastMessage.textContent = msg;
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
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), options.duration || (options.actionLabel ? 6000 : 2600));
  }

  // ---------- Live clock ----------
  function tick() {
    const d = new Date();
    document.getElementById('clock').textContent =
      d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  }
  tick();
  setInterval(tick, 30000);
  return { markDirty, showToast, saveDraft: commitDraft };
}
