const STORAGE_KEY = 'como-app-builder-draft:v3';
const PUBLISHED_KEY = 'como-app-builder-published:v1';
const STORAGE_VERSION = 3;

function plainClone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value, (key, item) => (
    /timer|editing/i.test(key) ? undefined : item
  )));
}

function controlKey(element) {
  return element.id || element.name || element.dataset.bind || element.dataset.bindText || element.dataset.bindColor || '';
}

function serializeControls() {
  const controls = {};
  document.querySelectorAll('input, select, textarea').forEach((element) => {
    const key = controlKey(element);
    if (!key || element.type === 'file' || element.type === 'password') return;
    controls[key] = element.type === 'checkbox' || element.type === 'radio'
      ? { checked: element.checked, value: element.value }
      : { value: element.value };
  });
  return controls;
}

function serializeToggles() {
  const toggles = {};
  document.querySelectorAll('.toggle').forEach((toggle, index) => {
    const key = toggle.dataset.widgetToggle
      || toggle.dataset.bind
      || toggle.dataset.ooBind
      || toggle.id
      || `toggle-${index}`;
    toggles[key] = toggle.classList.contains('on');
  });
  return toggles;
}

function serializeTheme() {
  const properties = {};
  for (let index = 0; index < document.body.style.length; index += 1) {
    const property = document.body.style[index];
    if (property.startsWith('--')) properties[property] = document.body.style.getPropertyValue(property);
  }
  const logo = document.querySelector('.app-page .app-top-header .brand-mark.has-logo');
  return { properties, logo: logo?.style.backgroundImage || '' };
}

function capture(ctx) {
  return {
    version: STORAGE_VERSION,
    savedAt: new Date().toISOString(),
    guided: plainClone(ctx.exportDraft?.() || {}),
    product: plainClone(ctx.exportProductExperience?.() || {}),
    appScreens: plainClone(ctx.exportAppScreens?.() || []),
    menu: plainClone(ctx.exportMenuSource?.() || ctx.menuState || {}),
    ordering: plainClone(ctx.exportOrderingState?.() || ctx.ordering || {}),
    orderingWidgets: plainClone(ctx.exportOrderingWidgets?.() || {}),
    rewards: plainClone(ctx.rwTiles || {}),
    controls: serializeControls(),
    toggles: serializeToggles(),
    theme: serializeTheme(),
  };
}

function restoreControls(controls = {}) {
  document.querySelectorAll('input, select, textarea').forEach((element) => {
    const saved = controls[controlKey(element)];
    if (!saved || element.type === 'file' || element.type === 'password') return;
    if ('checked' in saved) element.checked = !!saved.checked;
    if ('value' in saved && element.type !== 'checkbox' && element.type !== 'radio') element.value = saved.value;
    const eventName = element.tagName === 'SELECT' || element.type === 'checkbox' || element.type === 'radio' ? 'change' : 'input';
    element.dispatchEvent(new Event(eventName, { bubbles: true }));
  });
}

function restoreToggles(toggles = {}) {
  const used = new Set();
  document.querySelectorAll('.toggle').forEach((toggle, index) => {
    const key = toggle.dataset.widgetToggle
      || toggle.dataset.bind
      || toggle.dataset.ooBind
      || toggle.id
      || `toggle-${index}`;
    if (used.has(key) || typeof toggles[key] !== 'boolean') return;
    used.add(key);
    if (toggle.classList.contains('on') !== toggles[key]) toggle.click();
  });
  window.updateHomeEmptyState?.();
}

function restoreTheme(theme = {}) {
  Object.entries(theme.properties || {}).forEach(([property, value]) => {
    document.body.style.setProperty(property, value);
    window.syncColorVar?.(property, value);
  });
  if (theme.logo) {
    document.querySelectorAll('.app-page .app-top-header .brand-mark, #brand-logo').forEach((element) => {
      element.classList.add('has-logo');
      element.style.backgroundImage = theme.logo;
      element.style.backgroundSize = 'cover';
      element.style.backgroundPosition = 'center';
    });
  }
}

export function initDraftPersistence(ctx) {
  function saveTo(key) {
    try {
      const payload = capture(ctx);
      localStorage.setItem(key, JSON.stringify(payload));
      document.dispatchEvent(new CustomEvent('como:draft-saved', { detail: { savedAt: payload.savedAt, key } }));
      return true;
    } catch (error) {
      document.dispatchEvent(new CustomEvent('como:draft-save-error', { detail: { message: error?.message || 'Save failed' } }));
      return false;
    }
  }

  function read(key) {
    try {
      const payload = JSON.parse(localStorage.getItem(key) || 'null');
      return payload?.version === STORAGE_VERSION ? payload : null;
    } catch {
      localStorage.removeItem(key);
      return null;
    }
  }

  function apply(payload) {
    if (!payload) return false;
    document.body.classList.add('gf-restoring', 'gf-applying-preset');
    try {
      ctx.importDraft?.(payload.guided);
      ctx.importAppScreens?.(payload.appScreens);
      ctx.importOrderingState?.(payload.ordering);
      ctx.importMenuSource?.(payload.menu);
      ctx.importOrderingWidgets?.(payload.orderingWidgets);
      Object.entries(payload.rewards || {}).forEach(([key, value]) => {
        if (ctx.rwTiles?.[key]) Object.assign(ctx.rwTiles[key], value);
        ctx.rwRenderPhone?.(key);
      });
      restoreControls(payload.controls);
      restoreToggles(payload.toggles);
      restoreTheme(payload.theme);
      ctx.importProductExperience?.(payload.product);
    } finally {
      document.body.classList.remove('gf-restoring', 'gf-applying-preset');
    }
    document.dispatchEvent(new CustomEvent('como:draft-restored', { detail: { savedAt: payload.savedAt } }));
    return true;
  }

  function restore() {
    return apply(read(STORAGE_KEY));
  }

  function restorePublished() {
    const restored = apply(read(PUBLISHED_KEY));
    if (restored) saveTo(STORAGE_KEY);
    return restored;
  }

  document.addEventListener('como:draft-save', () => saveTo(STORAGE_KEY));
  // Prototype resets on every load: a refresh should start from a clean app and
  // never resurrect a previous session's selections (e.g. the ordering chips).
  localStorage.removeItem(STORAGE_KEY);
  const restored = false;

  return {
    draftStorageKey: STORAGE_KEY,
    publishedStorageKey: PUBLISHED_KEY,
    savePersistedDraft: () => saveTo(STORAGE_KEY),
    savePublishedVersion: () => saveTo(PUBLISHED_KEY),
    restorePersistedDraft: restore,
    restorePublishedDraft: restorePublished,
    hasPublishedVersion: () => !!read(PUBLISHED_KEY),
    clearPersistedDraft: () => localStorage.removeItem(STORAGE_KEY),
    draftRestored: restored,
  };
}
