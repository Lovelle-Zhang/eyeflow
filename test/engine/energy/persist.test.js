'use strict';

// RED-first: validating a persisted energy snapshot for resume (#2). Pure — the
// file I/O + offline-recharge wiring live in the impure store/service.

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { hydrateEnergy } = require('../../../src/engine/energy/persist');

test('accepts a well-formed snapshot', () => {
  const raw = { energy: 42, l1Armed: false, l2Armed: true, savedAt: 1000 };
  assert.deepEqual(hydrateEnergy(raw), raw);
});

test('clamps energy into range', () => {
  assert.equal(hydrateEnergy({ energy: 140, l1Armed: true, l2Armed: true, savedAt: 1 }).energy, 100);
  assert.equal(hydrateEnergy({ energy: -5, l1Armed: true, l2Armed: true, savedAt: 1 }).energy, 0);
});

test('rejects malformed / missing data → null (start fresh)', () => {
  assert.equal(hydrateEnergy(null), null);
  assert.equal(hydrateEnergy({}), null);
  assert.equal(hydrateEnergy({ energy: 'x', l1Armed: true, l2Armed: true, savedAt: 1 }), null);
  assert.equal(hydrateEnergy({ energy: 50, l1Armed: 1, l2Armed: true, savedAt: 1 }), null);
  assert.equal(hydrateEnergy({ energy: 50, l1Armed: true, l2Armed: true }), null); // no savedAt
  assert.equal(hydrateEnergy('nope'), null);
});
