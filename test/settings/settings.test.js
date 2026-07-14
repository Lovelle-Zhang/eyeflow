'use strict';

// RED-first: pure defaults/validation for persisted settings — the onboarding
// flag (§7) and the one §6.4 duration setting. File I/O is a thin adapter.

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { hydrateSettings } = require('../../src/settings/settings');
const { DEFAULT_NAP_MS, NAP_DURATION_OPTIONS_MS } = require('../../src/view/nap/nap');

test('defaults: onboarding not done, default nap length', () => {
  assert.deepEqual(hydrateSettings(null), { onboardingDone: false, napMs: DEFAULT_NAP_MS });
  assert.deepEqual(hydrateSettings({}), { onboardingDone: false, napMs: DEFAULT_NAP_MS });
});

test('keeps a valid persisted duration (one of the §6.4 options)', () => {
  const ms = NAP_DURATION_OPTIONS_MS[2];
  assert.equal(hydrateSettings({ napMs: ms }).napMs, ms);
});

test('rejects an out-of-range duration → default', () => {
  assert.equal(hydrateSettings({ napMs: 99999 }).napMs, DEFAULT_NAP_MS);
  assert.equal(hydrateSettings({ napMs: 'x' }).napMs, DEFAULT_NAP_MS);
});

test('onboardingDone must be strictly true', () => {
  assert.equal(hydrateSettings({ onboardingDone: true }).onboardingDone, true);
  assert.equal(hydrateSettings({ onboardingDone: 'yes' }).onboardingDone, false);
  assert.equal(hydrateSettings({ onboardingDone: 1 }).onboardingDone, false);
});

test('ignores garbage input', () => {
  assert.deepEqual(hydrateSettings('nope'), { onboardingDone: false, napMs: DEFAULT_NAP_MS });
});
