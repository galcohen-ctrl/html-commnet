export const MAX_APP_SCREENS = 5;
export const REQUIRED_APP_SCREENS = new Set(['home', 'rewards']);

export function checkScreenChange(screens, key, enabled) {
  if (!enabled && REQUIRED_APP_SCREENS.has(key)) return 'required';
  const active = Object.entries({ home: true, ...screens }).filter(([, included]) => included).length;
  if (enabled && !screens[key] && active >= MAX_APP_SCREENS) return 'limit';
  return null;
}