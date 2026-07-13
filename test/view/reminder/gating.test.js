'use strict';

// RED-first: D2 gating (signed decision). A short break only earns its recharge
// if the user actually rested — i.e. was idle (looked away) for enough of the
// 20s window. Keep typing through it → no credit → energy keeps falling toward Y.

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  earnedShortBreak,
  shouldFloatNow,
  REMINDER_DEFAULTS,
} = require('../../../src/view/reminder/gating');

test('default rest-credit threshold is a sensible chunk of the 20s window', () => {
  assert.ok(REMINDER_DEFAULTS.restCreditSec > 0 && REMINDER_DEFAULTS.restCreditSec <= 20);
});

test('idle for the whole window earns the credit', () => {
  assert.equal(earnedShortBreak(20), true);
});

test('idle exactly at the threshold earns it (boundary)', () => {
  assert.equal(earnedShortBreak(REMINDER_DEFAULTS.restCreditSec), true);
});

test('idle just below the threshold does NOT earn it', () => {
  assert.equal(earnedShortBreak(REMINDER_DEFAULTS.restCreditSec - 1), false);
});

test('kept typing through it (idle ~0) earns nothing → escalates toward Y', () => {
  assert.equal(earnedShortBreak(0), false);
});

test('threshold is tunable (§9.7)', () => {
  assert.equal(earnedShortBreak(10, 8), true);
  assert.equal(earnedShortBreak(7, 8), false);
});

// §6.2 smart buffer
test('buffer defaults exist: a natural-gap size and a 5-minute cap', () => {
  assert.ok(REMINDER_DEFAULTS.gapSec > 0);
  assert.equal(REMINDER_DEFAULTS.bufferMaxMs, 5 * 60 * 1000);
});

test('a natural gap (idle ≥ gapSec) floats out immediately — even with no wait', () => {
  assert.equal(shouldFloatNow(REMINDER_DEFAULTS.gapSec, 0), true);
  assert.equal(shouldFloatNow(REMINDER_DEFAULTS.gapSec + 5, 0), true);
});

test('dense typing (idle < gapSec) keeps buffering while under the cap', () => {
  assert.equal(shouldFloatNow(0, 1000), false);
  assert.equal(shouldFloatNow(REMINDER_DEFAULTS.gapSec - 1, 120000), false);
});

test('dense typing that never yields floats anyway at the 5-minute cap', () => {
  assert.equal(shouldFloatNow(0, REMINDER_DEFAULTS.bufferMaxMs), true);
  assert.equal(shouldFloatNow(0, REMINDER_DEFAULTS.bufferMaxMs + 1), true);
});

test('buffer knobs are tunable (§9.7)', () => {
  assert.equal(shouldFloatNow(3, 0, { gapSec: 5 }), false);
  assert.equal(shouldFloatNow(0, 100, { bufferMaxMs: 100 }), true);
});
