import assert from 'node:assert/strict';
import test from 'node:test';
import { createInboxState, inboxUnreadCount, visibleInboxMessages, markInboxRead, markInboxAllRead, loadOlderInboxMessages } from '../src/data/inboxMock.js';

test('inbox starts with five messages and three unread', () => {
  const state = createInboxState();
  assert.equal(visibleInboxMessages(state).length, 5);
  assert.equal(inboxUnreadCount(state), 3);
});

test('reading a message updates the unread filter and count', () => {
  const state = createInboxState(); state.filter = 'unread';
  markInboxRead(state, 'gift-ready');
  assert.equal(inboxUnreadCount(state), 2);
  assert.equal(visibleInboxMessages(state).length, 2);
  markInboxRead(state, 'gift-ready', false);
  assert.equal(inboxUnreadCount(state), 3);
});

test('mark all read clears the unread view without deleting messages', () => {
  const state = createInboxState(); state.filter = 'unread'; markInboxAllRead(state);
  assert.equal(visibleInboxMessages(state).length, 0);
  assert.equal(inboxUnreadCount(state), 0);
  state.filter = 'all'; assert.equal(visibleInboxMessages(state).length, 5);
});

test('older messages load in bounded batches without duplicates', () => {
  const state = createInboxState();
  assert.equal(loadOlderInboxMessages(state), 3);
  assert.equal(loadOlderInboxMessages(state), 2);
  assert.equal(loadOlderInboxMessages(state), 0);
  assert.equal(new Set(visibleInboxMessages(state).map((message) => message.id)).size, 10);
});

test('preview instances do not share mutable read state', () => {
  const first = createInboxState(), second = createInboxState(); markInboxAllRead(first);
  assert.equal(inboxUnreadCount(second), 3);
});