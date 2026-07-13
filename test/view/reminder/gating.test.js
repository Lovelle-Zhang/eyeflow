'use strict';

// RED-first: D2 gating (signed decision). A short break only earns its recharge
// if the user actually rested — i.e. was idle (looked away) for enough of the
// 20s window. Keep typing through it → no credit → energy keeps falling toward Y.

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { earnedShortBreak, REMINDER_DEFAULTS } = require('../../../src/view/reminder/gating');

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
