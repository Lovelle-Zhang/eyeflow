'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { APP_CONFIG } = require('../config/app.config');

// Legacy identifiers that this project must NEVER reuse. Data isolation from
// the frozen codex-project / EyeFlow app is a hard requirement.
const LEGACY_APP_ID = 'com.eyeflow.app';
const LEGACY_DATA_DIRS = ['eyeflow', 'eyeflow-mira', 'Codex'];

// The public brand is "EyeFlow". Distinctness from the (removed) legacy app is
// enforced by the appId + userDataDirName below, NOT the display name.
test('product name is the public brand "EyeFlow"', () => {
  assert.equal(APP_CONFIG.productName, 'EyeFlow');
});

test('bundle id is app.eyeflow.next and differs from legacy', () => {
  assert.equal(APP_CONFIG.appId, 'app.eyeflow.next');
  assert.notEqual(APP_CONFIG.appId, LEGACY_APP_ID);
});

test('userData dir name does not collide with any legacy data dir', () => {
  for (const legacy of LEGACY_DATA_DIRS) {
    assert.notEqual(
      APP_CONFIG.userDataDirName.toLowerCase(),
      legacy.toLowerCase(),
      `userData dir must not equal legacy "${legacy}"`,
    );
  }
});

test('single-instance key is namespaced to this app', () => {
  assert.ok(APP_CONFIG.singleInstanceKey.startsWith('app.eyeflow.next'));
});

test('config object is frozen (single source of truth, immutable)', () => {
  assert.ok(Object.isFrozen(APP_CONFIG));
});
