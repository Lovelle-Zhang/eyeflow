'use strict';

// RED-first end-to-end rhythm tests: feed many ticks and assert the arc
// described in §D-a..D-g of docs/ENGINE_SPEC.md.

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { step, initialState, DEFAULT_PARAMS } = require('../../../src/engine/energy');

const P = DEFAULT_PARAMS;

// Run `count` active ticks of `dtMs` each; collect all emitted events.
function runActive(state, count, dtMs, all) {
  for (let i = 0; i < count; i++) {
    const r = step(state, { kind: 'tick', dtMs, idleSec: 0 }, P);
    state = r.state;
    all.push(...r.events);
  }
  return state;
}

test('ignore all breaks: exactly one remind_short then one remind_nap, floors at 0 (D-a/D-b/D-d/D-g)', () => {
  let s = initialState(P);
  const events = [];
  // 60 minutes of continuous use, one-second ticks
  s = runActive(s, 60 * 60, 1000, events);

  const shorts = events.filter((e) => e === 'remind_short').length;
  const naps = events.filter((e) => e === 'remind_nap').length;

  assert.equal(shorts, 1, 'exactly one short-break nudge on the way down');
  assert.equal(naps, 1, 'exactly one nap suggestion on the way down');
  assert.equal(s.energy, 0, 'energy grinds to the floor');
  // order: short must come before nap
  assert.ok(events.indexOf('remind_short') < events.indexOf('remind_nap'));
});

test('first remind_short lands near ~22 min at default params (E table sanity)', () => {
  let s = initialState(P);
  let minutes = 0;
  let firedAt = null;
  for (let i = 0; i < 60 * 60; i++) {
    const r = step(s, { kind: 'tick', dtMs: 1000, idleSec: 0 }, P);
    s = r.state;
    if (r.events.includes('remind_short')) {
      firedAt = (i + 1) / 60;
      break;
    }
  }
  assert.ok(firedAt !== null, 'remind_short should fire');
  // 100→50 at 100/45 per-min ≈ 22.5 min
  assert.ok(firedAt > 20 && firedAt < 25, `expected ~22.5 min, got ${firedAt}`);
});

test('heed short breaks: repeated remind_short cadence, never a nap (D-c)', () => {
  let s = initialState(P);
  const events = [];
  // simulate: work until a short nudge, then take a real 20s break (shortBreak),
  // repeat several rounds — the healthy loop
  for (let round = 0; round < 4; round++) {
    // work in 1s active ticks until remind_short fires
    let guard = 0;
    for (;;) {
      const r = step(s, { kind: 'tick', dtMs: 1000, idleSec: 0 }, P);
      s = r.state;
      events.push(...r.events);
      if (r.events.includes('remind_short')) break;
      if (++guard > 60 * 60) throw new Error('short nudge never fired');
    }
    // heed it: a real look-away short break
    s = step(s, { kind: 'shortBreak' }, P).state;
  }

  const naps = events.filter((e) => e === 'remind_nap').length;
  const shorts = events.filter((e) => e === 'remind_short').length;
  assert.equal(naps, 0, 'diligent short breaks avoid nap suggestions');
  assert.equal(shorts, 4, 'one nudge per round, four rounds');
});
