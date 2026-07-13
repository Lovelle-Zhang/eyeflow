'use strict';

// RED-first behavior tests for §C (energy update) of docs/ENGINE_SPEC.md.
// The engine is a pure function: step(state, input, params) → { state, events }.

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { step, initialState, DEFAULT_PARAMS } = require('../../../src/engine/energy');

const P = DEFAULT_PARAMS;

function fresh() {
  return initialState(P);
}

test('initial state is full energy, both lines armed (§A3)', () => {
  assert.deepEqual(fresh(), { energy: 100, l1Armed: true, l2Armed: true });
});

test('step is pure: does not mutate the input state', () => {
  const s0 = fresh();
  const snapshot = { ...s0 };
  step(s0, { kind: 'tick', dtMs: 60000, idleSec: 0 }, P);
  assert.deepEqual(s0, snapshot, 'input state must be untouched');
});

test('ACTIVE tick discharges at drainPerMin (§C1)', () => {
  const { state } = step(fresh(), { kind: 'tick', dtMs: 60000, idleSec: 0 }, P);
  // one minute of active use → energy drops by drainPerMin
  assert.ok(Math.abs(state.energy - (100 - P.drainPerMin)) < 1e-9);
});

test('PAUSED band (idleSec in [grace, away)) holds energy (§C1/§5.4.2)', () => {
  const start = { energy: 60, l1Armed: false, l2Armed: false };
  const idle = P.idleGraceSec; // exactly at grace → paused
  const { state } = step(start, { kind: 'tick', dtMs: 120000, idleSec: idle }, P);
  assert.equal(state.energy, 60, 'paused band must not change energy');
});

test('AWAY band (idleSec ≥ away) recharges at rechargePerMin (§C1)', () => {
  const start = { energy: 40, l1Armed: false, l2Armed: false };
  const { state } = step(start, { kind: 'tick', dtMs: 60000, idleSec: P.awaySec }, P);
  assert.ok(Math.abs(state.energy - (40 + P.rechargePerMin)) < 1e-9);
});

test('discharge is clamped at floor 0, never negative (§5.4.4)', () => {
  const start = { energy: 1, l1Armed: false, l2Armed: false };
  const { state } = step(start, { kind: 'tick', dtMs: 600000, idleSec: 0 }, P);
  assert.equal(state.energy, 0);
});

test('recharge is clamped at ceiling 100 (§5.4.1)', () => {
  const start = { energy: 99, l1Armed: true, l2Armed: true };
  const { state } = step(start, { kind: 'tick', dtMs: 600000, idleSec: P.awaySec }, P);
  assert.equal(state.energy, 100);
});

test('shortBreak adds shortBreakGain, clamped (§C2)', () => {
  const start = { energy: 50, l1Armed: false, l2Armed: false };
  const { state } = step(start, { kind: 'shortBreak' }, P);
  assert.equal(state.energy, 50 + P.shortBreakGain);
});

test('nap refills to full (§C3/§5.4.3)', () => {
  const start = { energy: 5, l1Armed: false, l2Armed: false };
  const { state } = step(start, { kind: 'nap' }, P);
  assert.equal(state.energy, 100);
});
