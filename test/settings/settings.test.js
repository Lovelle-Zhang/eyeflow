'use strict';

// RED-first: pure defaults/validation for persisted settings — the onboarding
// flag (§7) and the two §6.4 settings (nap duration + reminder tier). File I/O
// is a thin adapter.

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { hydrateSettings } = require('../../src/settings/settings');
const { DEFAULT_NAP_MS, NAP_DURATION_OPTIONS_MS } = require('../../src/view/nap/nap');
const { DEFAULT_REMINDER_TIER } = require('../../src/view/reminder/tier');

const DEFAULTS = { onboardingDone: false, napMs: DEFAULT_NAP_MS, reminderTier: DEFAULT_REMINDER_TIER };

test('defaults: onboarding not done, default nap length, default tier', () => {
  assert.deepEqual(hydrateSettings(null), DEFAULTS);
  assert.deepEqual(hydrateSettings({}), DEFAULTS);
});

test('keeps a valid persisted reminder tier; rejects unknown → default', () => {
  assert.equal(hydrateSettings({ reminderTier: 'strong' }).reminderTier, 'strong');
  assert.equal(hydrateSettings({ reminderTier: 'light' }).reminderTier, 'light');
  assert.equal(hydrateSettings({ reminderTier: 'nope' }).reminderTier, DEFAULT_REMINDER_TIER);
  assert.equal(hydrateSettings({ reminderTier: 2 }).reminderTier, DEFAULT_REMINDER_TIER);
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
  assert.deepEqual(hydrateSettings('nope'), DEFAULTS);
});
