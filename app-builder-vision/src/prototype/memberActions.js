export function initMemberActions({ showToast, showPage = (key) => window.showPhonePage?.(key) }) {
  document.addEventListener('click', (event) => {
    const pageLink = event.target.closest('[data-member-page]');
    if (pageLink) showPage(pageLink.dataset.memberPage);
    const amount = event.target.closest('[data-credit-amount]');
    if (amount) {
      document.getElementById('credit-amount').value = amount.dataset.creditAmount;
      document.querySelectorAll('[data-credit-amount]').forEach((button) => button.setAttribute('aria-pressed', String(button === amount)));
    }
    const action = event.target.closest('[data-phone-action]');
    if (action) showToast?.(action.dataset.phoneAction);
    const copy = event.target.closest('[data-copy-referral]');
    if (copy) {
      navigator.clipboard?.writeText(document.getElementById('px-referral-code')?.textContent || 'FRIEND10').catch(() => {});
      copy.textContent = 'Copied';
      showToast?.('Invite code copied');
    }
    const tab = event.target.closest('.px-login-tabs [role="tab"]');
    if (!tab) return;
    const email = tab.textContent.trim() === 'Email';
    document.querySelectorAll('.px-login-tabs [role="tab"]').forEach((candidate) => {
      const active = candidate === tab;
      candidate.classList.toggle('active', active);
      candidate.setAttribute('aria-selected', String(active));
    });
    const label = document.querySelector('.px-login-card > label');
    const prefix = document.querySelector('.px-phone-field span');
    const input = document.getElementById('login-input');
    if (label) label.textContent = email ? 'Email address' : 'Phone number';
    if (prefix) prefix.hidden = email;
    if (input) {
      input.type = email ? 'email' : 'tel';
      input.inputMode = email ? 'email' : 'tel';
      input.placeholder = email ? 'you@example.com' : '(555) 000-0000';
    }
  });
  document.addEventListener('submit', (event) => {
    if (!event.target.matches('.member-credit-form')) return;
    event.preventDefault();
    if (!event.target.reportValidity()) return;
    event.target.querySelector('.member-credit-result').textContent = 'Preview ready. No credits have been transferred.';
  });
}