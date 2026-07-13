'use strict';

// RED-first behavior tests for §D (reminders: edge-trigger + re-arm) of
// docs/ENGINE_SPEC.md.

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { step, DEFAULT_PARAMS } = require('../../../src/engine/energy');

const P = DEFAULT_PARAMS;

// Drive one active tick with a given dt and return {state, events}.
function tick(state, dtMs) {
  return step(state, { kind: 'tick', dtMs, idleSec: 0 }, P);
}

test('crossing below X while armed fires remind_short once, then disarms (D-a/D-b)', () => {
  // start just above X, drop below X in one active minute
  const start = { energy: P.lineX + 1, l1Armed: true, l2Armed: true };
  const r1 = tick(start, 60000);
  assert.ok(r1.state.energy < P.lineX);
  assert.deepEqual(r1.events, ['remind_short']);
  assert.equal(r1.state.l1Armed, false);

  // further descent while still < X → no repeat (quiet window)
  const r2 = tick(r1.state, 60000);
  assert.deepEqual(r2.events, []);
});

test('energy exactly at X is treated as green: no fire, re-arms (D-f)', () => {
  const start = { energy: P.lineX, l1Armed: true, l2Armed: true };
  const { state, events } = step(start, { kind: 'tick', dtMs: 0, idleSec: 0 }, P);
  assert.deepEqual(events, []);
  assert.equal(state.l1Armed, true);
});

test('crossing below Y while armed fires remind_nap once (D-a)', () => {
  const start = { energy: P.lineY + 1, l1Armed: false, l2Armed: true };
  const { state, events } = tick(start, 60000);
  assert.ok(state.energy < P.lineY);
  assert.deepEqual(events, ['remind_nap']);
  assert.equal(state.l2Armed, false);
});

test('a single large-dt tick that crosses both X and Y fires both (D-e)', () => {
  const start = { energy: 100, l1Armed: true, l2Armed: true };
  // huge dt: drain far below Y in one step
  const { state, events } = tick(start, 60 * 60000); // 60 min
  assert.equal(state.energy, 0);
  assert.deepEqual(events.sort(), ['remind_nap', 'remind_short']);
});

test('L1 re-arms only after energy returns to ≥ X, enabling repeated cadence (D-c)', () => {
  // below X, disarmed
  let s = { energy: P.lineX - 5, l1Armed: false, l2Armed: false };
  // a short break of ΔS=44 lifts above X → re-arm (no event on the way up)
  const up = step(s, { kind: 'shortBreak' }, P);
  assert.ok(up.state.energy >= P.lineX);
  assert.equal(up.state.l1Armed, true);
  assert.deepEqual(up.events, []);
  // drain back below X → fires again
  const down = tick(up.state, 60 * 60000);
  assert.ok(down.events.includes('remind_short'));
});

test('L2 re-arms only at ≥ X, not merely ≥ Y (D3/D-d)', () => {
  // a state clearly in (Y, X): L2 must NOT re-arm there (only ≥ X does)
  const between = (P.lineY + P.lineX) / 2;
  const held = step(
    { energy: between, l1Armed: false, l2Armed: false },
    { kind: 'tick', dtMs: 0, idleSec: 0 },
    P,
  );
  assert.equal(held.state.l2Armed, false, 'must not re-arm between Y and X');

  // now recover to ≥ X → L2 re-arms
  const recovered = step(
    { energy: P.lineX, l1Armed: false, l2Armed: false },
    { kind: 'tick', dtMs: 0, idleSec: 0 },
    P,
  );
  assert.equal(recovered.state.l2Armed, true);
});

test('nap re-arms both lines (D-d)', () => {
  const start = { energy: 2, l1Armed: false, l2Armed: false };
  const { state } = step(start, { kind: 'nap' }, P);
  assert.equal(state.l1Armed, true);
  assert.equal(state.l2Armed, true);
});

test('at floor 0, no new events (D-g)', () => {
  const start = { energy: 0, l1Armed: false, l2Armed: false };
  const { events } = tick(start, 60000);
  assert.deepEqual(events, []);
});
