export function initSystem() {
  // ---------- Save changes ----------
  const saveBtn = document.getElementById('save-btn');
  function markDirty() {
    saveBtn.classList.remove('disabled');
    saveBtn.textContent = 'Save changes';
  }
  saveBtn.addEventListener('click', () => {
    if (saveBtn.classList.contains('disabled')) return;
    saveBtn.classList.add('disabled');
    saveBtn.textContent = 'Saved ✓';
    showToast('Changes saved · would push to Bundy OTA in production');
  });

  // ---------- Toast helper ----------
  const toastEl = document.getElementById('toast-hint');
  let toastTimer;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  // ---------- Live clock ----------
  function tick() {
    const d = new Date();
    document.getElementById('clock').textContent =
      d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  }
  tick();
  setInterval(tick, 30000);


  return { markDirty, showToast };
}
