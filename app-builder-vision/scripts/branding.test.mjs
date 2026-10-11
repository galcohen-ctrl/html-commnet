import assert from 'node:assert/strict';
import test from 'node:test';
import { backgroundValue } from '../src/prototype/brandingBackground.js';
import { fontStack, googleFontUrl } from '../src/prototype/brandingFonts.js';

test('gradient explicitly interpolates in OKLCH with a diagonal default', () => {
  assert.equal(backgroundValue({ mode: 'gradient', start: '#ff0000', end: '#0000ff' }), 'linear-gradient(135deg in oklch shorter hue, rgb(255, 0, 0), rgb(0, 0, 255))');
});

test('older browsers receive a valid ordinary gradient', () => {
  assert.equal(backgroundValue({ mode: 'gradient', start: '#ff0000', end: '#0000ff', direction: 90 }, false), 'linear-gradient(90deg, rgb(255, 0, 0), rgb(0, 0, 255))');
});

test('colour strength softens toward white without making content transparent', () => {
  assert.equal(backgroundValue({ mode: 'solid', start: '#000000', strength: 0 }), 'rgb(255, 255, 255)');
  assert.equal(backgroundValue({ mode: 'solid', start: '#000000', strength: 50 }), 'rgb(128, 128, 128)');
});

test('font labels resolve to their actual Google Fonts family', () => {
  const font = { family: 'Playfair Display', category: 'serif', weights: [400, 700] };
  assert.equal(fontStack(font), '"Playfair Display", serif');
  const url = new URL(googleFontUrl(font));
  assert.equal(url.searchParams.get('family'), 'Playfair Display:wght@400;700');
  assert.equal(url.searchParams.get('display'), 'swap');
});

test('italic-only families request valid axes instead of a missing regular style', () => {
  const url = new URL(googleFontUrl({ family: 'Test Family', weights: [400], italic: true }));
  assert.equal(url.searchParams.get('family'), 'Test Family:ital,wght@1,400');
});