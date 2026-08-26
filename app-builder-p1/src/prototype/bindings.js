export function initBindings(ctx) {
  const { markDirty, updateHomeEmptyState } = ctx;

  // ---------- Collapsible sections ----------
  document.querySelectorAll('.cp-head-row').forEach(h => {
    h.addEventListener('click', () => h.parentElement.classList.toggle('open'));
  });

  // ---------- Toggle bindings (show/hide phone elements via CSS selector) ----------
  function wireToggle(t) {
    t.addEventListener('click', () => {
      t.classList.toggle('on');
      markDirty();
      const bind = t.dataset.bind;
      if (bind) {
        const on = t.classList.contains('on');
        document.querySelectorAll(bind).forEach(el => {
          el.classList.toggle('hidden-slot', !on);
        });
      }
      // Sync parent widget-row .on/.off state
      const row = t.closest('.cp-widget-row');
      if (row) {
        const on = t.classList.contains('on');
        row.classList.toggle('on', on);
        row.classList.toggle('off', !on);
        // Turning a Home widget ON via its + toggle drills straight into its
        // config so the merchant can customise it right away. Seeding a focus
        // preset flips many at once, so it opts out via the guard class.
        if (on && row.closest('#cp-home') && !document.body.classList.contains('gf-applying-preset')) {
          const drillKey = row.querySelector('[data-drill]')?.dataset.drill;
          if (drillKey && typeof window.openDrill === 'function') {
            window.openDrill('cp-home', drillKey);
          }
        }
      }
      // Sync parent social-item .on/.off state (reveals the indented URL input below it)
      const socialItem = t.closest('.cp-social-item');
      if (socialItem) {
        const on = t.classList.contains('on');
        socialItem.classList.toggle('on', on);
        socialItem.classList.toggle('off', !on);
      }
      // Refresh empty canvas visibility
      if (typeof updateHomeEmptyState === 'function') updateHomeEmptyState();
    });
  }
  document.querySelectorAll('.toggle').forEach(wireToggle);

  // ---------- Radio bindings ----------
  function wireRadioGroup(g) {
    g.querySelectorAll('.cp-radio').forEach(r => {
      r.addEventListener('click', () => {
        g.querySelectorAll('.cp-radio').forEach(x => x.classList.remove('active'));
        r.classList.add('active');
        markDirty();
        // Position radio (Logo) → moves brand-mark in .app-top-header
        const bindRadio = r.dataset.bindRadio;
        const value = r.dataset.value;
        if (bindRadio === 'logo-position') {
          const headers = document.querySelectorAll('.app-page[data-page="home"] .app-top-header, .app-page[data-page="home-t3"] .app-top-header');
          headers.forEach(h => {
            h.classList.remove('pos-left', 'pos-center', 'pos-right');
            h.classList.add('pos-' + value);
          });
        }
        if (bindRadio === 'icon-style') {
          document.body.dataset.iconStyle = value;
        }
        if (bindRadio === 'stats-wrapper') {
          const statsRow = document.querySelector('.stats-row');
          if (statsRow) {
            statsRow.classList.remove('wrap-rounded', 'wrap-square', 'wrap-none');
            statsRow.classList.add('wrap-' + value);
          }
        }
        if (bindRadio === 'loyalty-layout') {
          const lc = document.querySelector('.loyalty-card');
          if (lc) lc.dataset.loyalty = value;
        }
        if (bindRadio === 'member-state') {
          const greetRow = document.querySelector('.greet-row');
          if (greetRow) greetRow.classList.toggle('is-guest', value === 'guest');
          document.querySelectorAll('[data-detail="profile"] [data-state-section="loggedin"]').forEach(s => {
            s.style.display = value === 'guest' ? 'none' : '';
          });
          document.querySelectorAll('[data-detail="profile"] [data-state-section="guest"]').forEach(s => {
            s.style.display = value === 'guest' ? '' : 'none';
          });
        }
      });
    });
  }
  document.querySelectorAll('.cp-radio-group').forEach(wireRadioGroup);

  // ---------- Text input bindings (edit label/copy in place) ----------
  function getPlainText(el) {
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return el.value;
    let out = '';
    el.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        out += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        out += node.classList && node.classList.contains('var-token') ? '{' + node.dataset.key + '}' : node.textContent;
      }
    });
    return out.replace(/\u200B/g, '');
  }
  document.querySelectorAll('.cp-input-text[data-bind-text]').forEach(inp => {
    inp.addEventListener('input', () => {
      const sel = inp.dataset.bindText;
      const text = getPlainText(inp);
      document.querySelectorAll(sel).forEach(el => {
        // preserve child elements: only set first text node
        el.textContent = text;
      });
      markDirty();
    });
  });

  // ---------- Member variable insertion ("@" dropdown, common SaaS pattern) ----------
  const MEMBER_VARS = [
    { key: 'firstName', label: 'First name' },
    { key: 'lastName', label: 'Last name' },
    { key: 'phone', label: 'Phone number' },
    { key: 'dob', label: 'Date of birth' },
    { key: 'tier', label: 'Tier level' },
  ];
  function setupVariableInput(input) {
    let dropdownEl = null;
    let activeIndex = -1;
    let filtered = MEMBER_VARS;
    let atNode = null;
    let atOffset = -1;

    function closeVarDropdown() {
      if (dropdownEl) { dropdownEl.remove(); dropdownEl = null; }
      activeIndex = -1;
      atNode = null; atOffset = -1;
    }
    function insertVariableToken(v) {
      if (!atNode) return;
      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      const caretRange = sel.getRangeAt(0);
      const range = document.createRange();
      range.setStart(atNode, atOffset);
      range.setEnd(caretRange.endContainer, caretRange.endOffset);
      range.deleteContents();
      const span = document.createElement('span');
      span.className = 'var-token';
      span.contentEditable = 'false';
      span.dataset.key = v.key;
      span.textContent = '{' + v.key + '}';
      range.insertNode(span);
      const spaceNode = document.createTextNode('\u200B');
      span.after(spaceNode);
      const newRange = document.createRange();
      newRange.setStart(spaceNode, 1);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
      input.focus();
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    function highlightItem(idx) {
      if (!dropdownEl) return;
      const items = [...dropdownEl.querySelectorAll('.var-dropdown-item')];
      items.forEach((it, i) => it.classList.toggle('active', i === idx));
      if (items[idx]) items[idx].scrollIntoView({ block: 'nearest' });
    }
    function renderDropdown() {
      if (!dropdownEl) return;
      dropdownEl.innerHTML = '';
      if (!filtered.length) {
        const empty = document.createElement('div');
        empty.className = 'var-dropdown-empty';
        empty.textContent = 'No matching variables';
        dropdownEl.appendChild(empty);
        return;
      }
      filtered.forEach((v, i) => {
        const item = document.createElement('div');
        item.className = 'var-dropdown-item';
        item.textContent = v.label + '  {' + v.key + '}';
        item.addEventListener('mousedown', (e) => {
          e.preventDefault();
          insertVariableToken(v);
          closeVarDropdown();
        });
        item.addEventListener('mouseenter', () => { activeIndex = i; highlightItem(activeIndex); });
        dropdownEl.appendChild(item);
      });
      activeIndex = 0;
      highlightItem(activeIndex);
    }
    function openVarDropdown() {
      if (dropdownEl) return;
      dropdownEl = document.createElement('div');
      dropdownEl.className = 'var-dropdown';
      document.body.appendChild(dropdownEl);
      const rect = input.getBoundingClientRect();
      dropdownEl.style.position = 'fixed';
      dropdownEl.style.right = 'auto';
      dropdownEl.style.left = rect.left + 'px';
      dropdownEl.style.top = (rect.bottom + 4) + 'px';
      dropdownEl.style.width = rect.width + 'px';
    }
    function checkForAt() {
      const sel = window.getSelection();
      if (!sel.rangeCount) { closeVarDropdown(); return; }
      const range = sel.getRangeAt(0);
      const node = range.endContainer;
      if (node.nodeType !== Node.TEXT_NODE || !input.contains(node)) { closeVarDropdown(); return; }
      const textBeforeCaret = node.textContent.slice(0, range.endOffset);
      const atIdx = textBeforeCaret.lastIndexOf('@');
      if (atIdx === -1) { closeVarDropdown(); return; }
      const searchTerm = textBeforeCaret.slice(atIdx + 1);
      if (/\s/.test(searchTerm)) { closeVarDropdown(); return; }
      atNode = node;
      atOffset = atIdx;
      const q = searchTerm.toLowerCase();
      filtered = MEMBER_VARS.filter(v => v.label.toLowerCase().includes(q) || v.key.toLowerCase().includes(q));
      openVarDropdown();
      renderDropdown();
    }
    input.addEventListener('input', checkForAt);
    input.addEventListener('keydown', (e) => {
      if (!dropdownEl) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = Math.min(activeIndex + 1, filtered.length - 1);
        highlightItem(activeIndex);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        highlightItem(activeIndex);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIndex >= 0 && filtered[activeIndex]) {
          insertVariableToken(filtered[activeIndex]);
          closeVarDropdown();
        }
      } else if (e.key === 'Escape') {
        closeVarDropdown();
      }
    });
    input.addEventListener('blur', () => setTimeout(closeVarDropdown, 150));
  }
  document.querySelectorAll('.cp-input-text[data-vars="true"]').forEach(setupVariableInput);

  // ---------- Color picker bindings (native swatch + editable HEX, two-way) ----------
  function normalizeHex(s) {
    s = (s || '').trim();
    if (s && s[0] !== '#') s = '#' + s;
    return /^#[0-9a-fA-F]{6}$/.test(s) ? s.toLowerCase() : null;
  }
  // Live CSS vars may be authored as #rgb or rgb()/rgba(); a native colour input only
  // accepts #rrggbb, so coerce whatever the theme actually resolved to.
  function toHex(value) {
    const s = (value || '').trim();
    if (!s) return null;
    const direct = normalizeHex(s);
    if (direct) return direct;
    const short = s.match(/^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/);
    if (short) return ('#' + short[1] + short[1] + short[2] + short[2] + short[3] + short[3]).toLowerCase();
    const rgb = s.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
    if (rgb) {
      const hex = rgb.slice(1, 4)
        .map((n) => Math.max(0, Math.min(255, Math.round(parseFloat(n)))).toString(16).padStart(2, '0'))
        .join('');
      return '#' + hex;
    }
    return null;
  }
  // Wires one <input type="color"> together with the sibling .cp-color-hex field.
  // `apply(hex)` receives the committed color; called on every valid change.
  function wireColorControl(colorInput, apply) {
    const swatch = colorInput.parentElement;
    const row = colorInput.closest('.cp-color-row');
    const hexEl = row ? row.querySelector('.cp-color-hex') : null;
    function paint(hex) {
      if (swatch) swatch.style.background = hex;
      apply(hex);
      markDirty();
    }
    colorInput.addEventListener('input', () => {
      const hex = colorInput.value;
      if (hexEl && document.activeElement !== hexEl) hexEl.value = hex.toUpperCase();
      paint(hex);
    });
    if (hexEl) {
      hexEl.addEventListener('input', () => {
        const hex = normalizeHex(hexEl.value);
        if (hex) { colorInput.value = hex; paint(hex); }
      });
      hexEl.addEventListener('blur', () => {
        const hex = normalizeHex(hexEl.value) || colorInput.value;
        hexEl.value = hex.toUpperCase();
      });
    }
  }
  window.wireColorControl = wireColorControl;

  // The advanced colour controls ship with placeholder hex values from the old dark
  // theme, so the swatch claimed "black" while the preview was white. Seed every
  // control from the live CSS var, and keep controls sharing a var in lockstep.
  const colorControls = [...document.querySelectorAll('input[type="color"][data-bind-color]')];

  function paintColorControl(input, hex) {
    input.value = hex;
    const swatch = input.parentElement;
    if (swatch) swatch.style.background = hex;
    const hexEl = input.closest('.cp-color-row')?.querySelector('.cp-color-hex');
    if (hexEl && document.activeElement !== hexEl) hexEl.value = hex.toUpperCase();
  }

  function syncColorVar(varName, hex) {
    colorControls.forEach((c) => {
      if (c.dataset.bindColor === varName) paintColorControl(c, hex);
    });
  }
  window.syncColorVar = syncColorVar;

  colorControls.forEach((inp) => {
    const varName = inp.dataset.bindColor;
    const live = toHex(getComputedStyle(document.body).getPropertyValue(varName));
    if (live) paintColorControl(inp, live);
    wireColorControl(inp, (hex) => {
      document.body.style.setProperty(varName, hex);
      syncColorVar(varName, hex);
    });
  });


  return { wireToggle, wireRadioGroup, getPlainText, setupVariableInput, normalizeHex, wireColorControl, syncColorVar };
}

