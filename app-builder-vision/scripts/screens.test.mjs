import assert from 'node:assert/strict';
import test from 'node:test';
import { checkScreenChange } from '../src/prototype/screenRules.js';
import { websiteUrl } from '../src/prototype/websiteScreen.js';

const full = { home: true, rewards: true, locations: true, menu: true, more: true };

test('Home and Rewards cannot be turned off', () => {
  assert.equal(checkScreenChange(full, 'home', false), 'required');
  assert.equal(checkScreenChange(full, 'rewards', false), 'required');
});

test('a sixth screen needs an available slot', () => {
  assert.equal(checkScreenChange(full, 'extra-1', true), 'limit');
  assert.equal(checkScreenChange({ ...full, locations: false }, 'extra-1', true), null);
});

test('restoring an original screen cannot exceed five', () => {
  assert.equal(checkScreenChange({ ...full, locations: false, 'extra-1': true }, 'locations', true), 'limit');
});

test('already included screens and optional removal remain valid', () => {
  assert.equal(checkScreenChange(full, 'menu', true), null);
  assert.equal(checkScreenChange(full, 'menu', false), null);
});

test('website screens reject executable schemes and embedded credentials', () => {
  assert.equal(websiteUrl('javascript:alert(1)'), null);
  assert.equal(websiteUrl('data:text/html,hello'), null);
  assert.equal(websiteUrl('https://name:password@example.com'), null);
  assert.equal(websiteUrl('https://example.com/page'), 'https://example.com/page');
  assert.equal(websiteUrl('http://127.0.0.1:5175/test'), 'http://127.0.0.1:5175/test');
});