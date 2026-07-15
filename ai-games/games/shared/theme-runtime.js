/* Shared JSON theme loader. Each game owns its own theme.json. */
(function () {
  function applyCssVariables(css) {
    Object.entries(css || {}).forEach(([name, value]) => {
      document.documentElement.style.setProperty(name.startsWith('--') ? name : `--${name}`, String(value));
    });
  }

  async function loadTheme(path) {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Could not load ${path}: ${response.status}`);
    const theme = await response.json();
    applyCssVariables(theme.css);
    if (theme.meta && theme.meta.pageTitle) document.title = theme.meta.pageTitle;
    return theme;
  }

  window.GameTheme = { loadTheme, applyCssVariables };
})();
