'use strict';

// RED-first: the "resume today or start fresh" logic for persistence (§7).
// Pure — the actual file read/write is a thin impure adapter, not tested here.

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { hydrate, isValidRecord } = require('../../src/records/persistence');

test('resumes a valid record from the same day', () => {
  const raw = { dateKey: '2026-07-14', eyeUseMs: 5000, shortBreaks: 2, naps: 1 };
  assert.deepEqual(hydrate('2026-07-14', raw), raw);
});

test('starts fresh when the persisted record is from a different day (只做今天)', () => {
  const raw = { dateKey: '2026-07-13', eyeUseMs: 999, shortBreaks: 4, naps: 2 };
  assert.deepEqual(hydrate('2026-07-14', raw), {
    dateKey: '2026-07-14',
    eyeUseMs: 0,
    shortBreaks: 0,
    naps: 0,
  });
});

test('starts fresh on missing / malformed data', () => {
  const fresh = { dateKey: '2026-07-14', eyeUseMs: 0, shortBreaks: 0, naps: 0 };
  assert.deepEqual(hydrate('2026-07-14', null), fresh);
  assert.deepEqual(hydrate('2026-07-14', {}), fresh);
  assert.deepEqual(hydrate('2026-07-14', { dateKey: '2026-07-14', eyeUseMs: 'x' }), fresh);
  assert.deepEqual(hydrate('2026-07-14', 'garbage'), fresh);
});

test('isValidRecord guards the shape', () => {
  assert.equal(isValidRecord({ dateKey: '2026-07-14', eyeUseMs: 0, shortBreaks: 0, naps: 0 }), true);
  assert.equal(isValidRecord({ dateKey: 1, eyeUseMs: 0, shortBreaks: 0, naps: 0 }), false);
  assert.equal(isValidRecord(null), false);
});
