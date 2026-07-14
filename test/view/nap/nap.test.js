'use strict';

// RED-first: the nap ritual's pure bits (CHARTER §6.3/§6.4). The countdown math
// is reused from shortBreakFrame; here we cover the duration options and the
// mm:ss clock the fullscreen ritual shows.

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { NAP_DURATION_OPTIONS_MS, DEFAULT_NAP_MS, formatClock } = require('../../../src/view/nap/nap');

test('the one setting (§6.4) offers 1 / 3 / 5 minutes', () => {
  assert.deepEqual(NAP_DURATION_OPTIONS_MS, [60000, 180000, 300000]);
});

test('default nap length is one of the offered options', () => {
  assert.ok(NAP_DURATION_OPTIONS_MS.includes(DEFAULT_NAP_MS));
});

test('formatClock renders m:ss with a zero-padded seconds field', () => {
  assert.equal(formatClock(0), '0:00');
  assert.equal(formatClock(5), '0:05');
  assert.equal(formatClock(65), '1:05');
  assert.equal(formatClock(180), '3:00');
  assert.equal(formatClock(125), '2:05');
});

test('formatClock floors fractional seconds and never goes negative', () => {
  assert.equal(formatClock(59.9), '0:59');
  assert.equal(formatClock(-3), '0:00');
});
