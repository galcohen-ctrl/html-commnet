export const LANGUAGE_CATALOG = [
  { code: 'en', name: 'English', native: 'English', dir: 'ltr' },
  { code: 'he', name: 'Hebrew', native: 'עברית', dir: 'rtl' },
  { code: 'ar', name: 'Arabic', native: 'العربية', dir: 'rtl' },
  { code: 'ru', name: 'Russian', native: 'Русский', dir: 'ltr' },
  { code: 'fr', name: 'French', native: 'Français', dir: 'ltr' },
  { code: 'es', name: 'Spanish', native: 'Español', dir: 'ltr' },
  { code: 'de', name: 'German', native: 'Deutsch', dir: 'ltr' },
  { code: 'pt', name: 'Portuguese', native: 'Português', dir: 'ltr' },
  { code: 'it', name: 'Italian', native: 'Italiano', dir: 'ltr' },
];

export function createLanguageState(onChange = () => {}) {
  let locales = ['en'];
  let current = 'en';
  let defaultLocale = 'en';
  let strings = Object.create(null);
  const known = code => LANGUAGE_CATALOG.some(language => language.code === code);
  const raw = (key, locale = current) => strings[key]?.[locale] ?? '';
  const notify = () => onChange();
  return {
    register(key, english = '') {
      if (!strings[key]) strings[key] = { en: String(english), [defaultLocale]: String(english) };
      return key;
    },
    raw,
    get(key, locale = current) {
      const value = raw(key, locale);
      return value.trim() ? value : raw(key, defaultLocale) || raw(key, 'en');
    },
    set(key, value, locale = current) {
      if (!known(locale)) return;
      if (!strings[key]) strings[key] = { en: '' };
      strings[key][locale] = String(value);
      notify();
    },
    locales: () => [...locales],
    locale: () => current,
    defaultLocale: () => defaultLocale,
    setDefaultLocale(code) {
      if (!known(code) || code === defaultLocale) return;
      Object.keys(strings).forEach(key => {
        if (!raw(key, code).trim()) strings[key][code] = raw(key, defaultLocale) || raw(key, 'en');
      });
      locales = [code, ...locales.filter(locale => locale !== defaultLocale && locale !== code)];
      defaultLocale = code;
      current = code;
      notify();
    },
    setLocales(codes) {
      locales = [defaultLocale, ...new Set(codes.filter(code => code !== defaultLocale && known(code)))];
      if (!locales.includes(current)) current = defaultLocale;
      notify();
    },
    setLocale(code) {
      if (!locales.includes(code)) return;
      current = code;
      notify();
    },
    missing(locale, keys = Object.keys(strings)) {
      return locale === defaultLocale ? [] : keys.filter(key => strings[key] && !raw(key, locale).trim());
    },
    export() {
      return JSON.parse(JSON.stringify({ defaultLocale, locales, locale: current, strings }));
    },
    import(payload) {
      if (!payload || !Array.isArray(payload.locales) || !payload.strings || typeof payload.strings !== 'object') return;
      const restored = Object.create(null);
      Object.entries(payload.strings).forEach(([key, translations]) => {
        if (!translations || typeof translations !== 'object') return;
        const values = Object.create(null);
        Object.entries(translations).forEach(([code, value]) => {
          if (known(code) && typeof value === 'string') values[code] = value;
        });
        restored[key] = values;
      });
      strings = Object.assign(Object.create(null), strings, restored);
      defaultLocale = known(payload.defaultLocale) ? payload.defaultLocale : 'en';
      locales = [defaultLocale, ...new Set(payload.locales.filter(code => code !== defaultLocale && known(code)))];
      current = locales.includes(payload.locale) ? payload.locale : defaultLocale;
      notify();
    },
  };
}