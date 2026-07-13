'use strict';

// RED-first tests for energyToColor — CHARTER §8.3 (locked color spec).
// Hue is locked at 157; S/L/alpha interpolate linearly across the anchor
// points; low energy conveys 共情 (never turns red/yellow).

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { energyToColor } = require('../../../src/view/capsule/energy-color');

// §8.3 anchor table: energy → { s, l, a }, hue always 157.
const ANCHORS = [
  { energy: 100, s: 61, l: 26, a: 0.97 },
  { energy: 66, s: 40, l: 30, a: 0.95 },
  { energy: 40, s: 19, l: 36, a: 0.92 },
  { energy: 15, s: 8, l: 40, a: 0.88 },
];

const near = (x, y) => Math.abs(x - y) < 1e-9;

test('every anchor energy reproduces its exact §8.3 HSL + alpha', () => {
  for (const p of ANCHORS) {
    const c = energyToColor(p.energy);
    assert.equal(c.h, 157, 'hue locked at 157');
    assert.ok(near(c.s, p.s), `S at ${p.energy}: ${c.s} vs ${p.s}`);
    assert.ok(near(c.l, p.l), `L at ${p.energy}: ${c.l} vs ${p.l}`);
    assert.ok(near(c.a, p.a), `A at ${p.energy}: ${c.a} vs ${p.a}`);
  }
});

test('midpoint interpolates linearly between two anchors', () => {
  // halfway between energy 66 and 100 → energy 83
  const c = energyToColor(83);
  assert.equal(c.h, 157);
  assert.ok(near(c.s, (40 + 61) / 2));
  assert.ok(near(c.l, (30 + 26) / 2));
  assert.ok(near(c.a, (0.95 + 0.97) / 2));
});

test('hue stays 157 across the whole range — never drifts to red/yellow (§8.3)', () => {
  for (let e = 0; e <= 100; e += 5) {
    assert.equal(energyToColor(e).h, 157, `hue at energy ${e}`);
  }
});

test('energy above 100 clamps to the full-energy color', () => {
  assert.deepEqual(energyToColor(140), energyToColor(100));
});

test('energy below the 极低 anchor (15) clamps to it — visual floor', () => {
  const floor = energyToColor(15);
  assert.deepEqual(energyToColor(0), floor);
  assert.deepEqual(energyToColor(7), floor);
});

test('as energy falls: saturation drops, lightness rises, alpha drops (§8.3 path)', () => {
  const full = energyToColor(100);
  const low = energyToColor(15);
  assert.ok(low.s < full.s, 'saturation drops (气散掉)');
  assert.ok(low.l > full.l, 'lightness rises slightly');
  assert.ok(low.a < full.a, 'alpha drops (微透明)');
});

test('emits a directly usable CSS hsla() string', () => {
  assert.equal(energyToColor(100).css, 'hsla(157, 61%, 26%, 0.97)');
});
