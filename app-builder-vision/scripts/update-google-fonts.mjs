import { mkdir, writeFile } from 'node:fs/promises';

const apiKey = process.env.GOOGLE_FONTS_API_KEY;
const source = apiKey
  ? new URL('https://www.googleapis.com/webfonts/v1/webfonts')
  : new URL('https://fonts.google.com/metadata/fonts');
if (apiKey) source.searchParams.set('key', apiKey);
const response = await fetch(source, { signal: AbortSignal.timeout(20000) });
if (!response.ok) throw new Error(`Font catalogue request failed (${response.status})`);
const text = await response.text();
const data = JSON.parse(text.startsWith(")]}'") ? text.slice(text.indexOf('{')) : text);
const families = data.items || data.familyMetadataList;
if (!Array.isArray(families) || families.length < 1000) throw new Error('Incomplete font catalogue');

const fonts = families.map((font) => {
  const variants = font.variants || Object.keys(font.fonts || {});
  const normalWeights = variants.map((variant) => variant === 'regular' ? '400' : variant).filter((variant) => /^\d+$/.test(variant)).map(Number);
  const italic = normalWeights.length === 0;
  const weights = italic
    ? variants.map((variant) => Number(variant.replace(/italic|i$/, '') || '400')).filter(Number.isFinite)
    : normalWeights;
  const selectedWeights = weights.filter((weight) => [400, 500, 600, 700].includes(weight));
  const category = font.category?.toLowerCase().replaceAll(' ', '-') || 'sans-serif';
  return {
    family: font.family,
    category,
    weights: [...new Set(selectedWeights.length ? selectedWeights : [weights[0] || 400])].sort((first, second) => first - second),
    ...(italic ? { italic: true } : {}),
  };
}).sort((first, second) => first.family.localeCompare(second.family));

const directory = new URL('../public/fonts/', import.meta.url);
await mkdir(directory, { recursive: true });
await writeFile(new URL('catalog.json', directory), JSON.stringify({ source: 'Google Fonts', fonts }) + '\n');
console.log(`Updated catalogue: ${fonts.length} real Google Fonts families.`);