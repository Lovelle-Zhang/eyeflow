'use strict';

// The short-break recharge PREVIEW payload (CHARTER §6.1 "休息=回充"). It must be
// display-only and reuse the engine's real credit math (§9.2 一个事实一个函数):
// the preview energy == what step() would actually credit.

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { rechargePreview } = require('../../../src/view/reminder/recharge');
const { step, shortBreakEnergy, DEFAULT_PARAMS } = require('../../../src/engine/energy');
const { energyToColor } = require('../../../src/view/capsule/energy-color');

const P = DEFAULT_PARAMS;

test('preview energy equals the real credit the engine would apply (one-fact, §9.2)', () => {
  const { state } = step({ energy: 48, l1Armed: false, l2Armed: false }, { kind: 'shortBreak' }, P);
  assert.equal(rechargePreview(48).energy, state.energy);
});

test('preview color is the post-credit 气色, not the pre-credit one', () => {
  const preview = rechargePreview(48);
  assert.equal(preview.capsuleCss, energyToColor(shortBreakEnergy(48, P)).css);
  assert.notEqual(preview.capsuleCss, energyToColor(48).css);
});

test('preview clamps at full — brighten never exceeds 100 (§5.4.1)', () => {
  assert.equal(rechargePreview(90).energy, 100);
});
