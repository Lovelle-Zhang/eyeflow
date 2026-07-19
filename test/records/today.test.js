'use strict';

// RED-first: the minimal "today only" ledger (甲 / CHARTER §7 first piece).
// Pure reducer: accumulate active eye-use time + count rests, reset at day change.

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  emptyRecord,
  recordTick,
  recordRest,
  formatEyeUse,
} = require('../../src/records/today');

test('a fresh record is zeroed for its day', () => {
  const r = emptyRecord('2026-07-14');
  assert.deepEqual(r, { dateKey: '2026-07-14', eyeUseMs: 0, shortBreaks: 0, naps: 0 });
});

test('active ticks accumulate eye-use time; idle ticks do not', () => {
  let r = emptyRecord('2026-07-14');
  r = recordTick(r, { dtMs: 1000, active: true, dateKey: '2026-07-14' });
  r = recordTick(r, { dtMs: 1000, active: false, dateKey: '2026-07-14' });
  r = recordTick(r, { dtMs: 1000, active: true, dateKey: '2026-07-14' });
  assert.equal(r.eyeUseMs, 2000);
});

test('a new day resets the ledger (只做今天)', () => {
  let r = emptyRecord('2026-07-14');
  r = recordTick(r, { dtMs: 5000, active: true, dateKey: '2026-07-14' });
  r = recordRest(r, 'short', '2026-07-14');
  r = recordTick(r, { dtMs: 1000, active: true, dateKey: '2026-07-15' }); // rollover
  assert.equal(r.dateKey, '2026-07-15');
  assert.equal(r.eyeUseMs, 1000);
  assert.equal(r.shortBreaks, 0);
});

test('rests are counted by kind', () => {
  let r = emptyRecord('2026-07-14');
  r = recordRest(r, 'short', '2026-07-14');
  r = recordRest(r, 'short', '2026-07-14');
  r = recordRest(r, 'nap', '2026-07-14');
  assert.equal(r.shortBreaks, 2);
  assert.equal(r.naps, 1);
});

test('a rest just after midnight rolls the ledger to today, not lost', () => {
  // Rest completes in the sub-second window before the next tick sees the new day.
  let r = emptyRecord('2026-07-14');
  r = recordRest(r, 'short', '2026-07-14'); // yesterday's break
  r = recordRest(r, 'short', '2026-07-15'); // crosses midnight before any tick
  assert.equal(r.dateKey, '2026-07-15');
  assert.equal(r.shortBreaks, 1); // counted for the new day, not wiped
  assert.equal(r.eyeUseMs, 0);
});

test('non-positive dt is ignored', () => {
  let r = emptyRecord('2026-07-14');
  r = recordTick(r, { dtMs: 0, active: true, dateKey: '2026-07-14' });
  r = recordTick(r, { dtMs: -50, active: true, dateKey: '2026-07-14' });
  assert.equal(r.eyeUseMs, 0);
});

test('formatEyeUse renders h/m, dropping the hour when under an hour', () => {
  assert.equal(formatEyeUse(0).text, '0m');
  assert.equal(formatEyeUse(30 * 60000).text, '30m');
  assert.equal(formatEyeUse(65 * 60000).text, '1h 5m');
  assert.equal(formatEyeUse(252 * 60000).text, '4h 12m');
});
