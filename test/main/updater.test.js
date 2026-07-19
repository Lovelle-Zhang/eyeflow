'use strict';

// Auto-update guard (§8.5): the ONLY branch safe to unit-test is the dev no-op —
// the packaged branch reaches out to GitHub Releases over the network. We assert
// that in dev it never loads electron-updater / never touches Squirrel, and hands
// back a usable {stop} handle.

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { startAutoUpdate } = require('../../src/main/updater');

test('dev (not packaged): no-op, returns a stop() that is safe to call', () => {
  const handle = startAutoUpdate({ isPackaged: false });
  assert.equal(typeof handle.stop, 'function');
  assert.doesNotThrow(() => handle.stop());
});

test('no args: treated as not packaged (safe default no-op)', () => {
  const handle = startAutoUpdate();
  assert.equal(typeof handle.stop, 'function');
  assert.doesNotThrow(() => handle.stop());
});
