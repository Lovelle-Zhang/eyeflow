'use strict';

// RED-first tests for the small Mira character SVG — CHARTER §8.5 (locked).
// Small Mira is a CONSTANT character: dark face + white eyes + green dot,
// does NOT change with energy (that's the big capsule's job, §8.3).

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { miraSvg } = require('../../../src/view/mira/mira-svg');

test('returns an SVG on the locked 1024 canvas base (§8.5)', () => {
  const svg = miraSvg();
  assert.match(svg, /^<svg\b/);
  assert.match(svg, /viewBox="0 0 1024 1024"/);
  assert.match(svg, /<\/svg>\s*$/);
});

test('full variant places eyes at the locked coords, r=44, slightly above center', () => {
  const svg = miraSvg({ variant: 'full' });
  assert.match(svg, /cx="380"\s+cy="468"\s+r="44"/);
  assert.match(svg, /cx="644"\s+cy="468"\s+r="44"/);
  // eye center y=468 is above the lens geometric center (494)
});

test('full variant: dark lens 671×318 (2.11:1) rx=159 (§8.5)', () => {
  const svg = miraSvg({ variant: 'full' });
  assert.match(svg, /x="177"\s+y="335"\s+width="671"\s+height="318"\s+rx="159"/);
  assert.ok(Math.abs(671 / 318 - 2.11) < 0.01, 'aspect ratio ~2.11:1');
});

test('full variant: green dot at locked (803,344) r=79, mint #6FE7C3', () => {
  const svg = miraSvg({ variant: 'full' });
  assert.match(svg, /cx="803"\s+cy="344"\s+r="79"/);
  assert.match(svg, /#6FE7C3/i);
});

test('full variant: glossy mint bg gradient + dark lens gradient + mint stroke (§8.5)', () => {
  const svg = miraSvg({ variant: 'full' });
  // bg gradient stops
  assert.match(svg, /#EAFFF6/i);
  assert.match(svg, /#BDEAFF/i);
  assert.match(svg, /offset="0.58"/);
  assert.match(svg, /#F3EEC7/i);
  // lens gradient
  assert.match(svg, /#0E1C20/i);
  assert.match(svg, /#10272A/i);
  // mint stroke micro-glow
  assert.match(svg, /stroke="#7EEFD4"/i);
  assert.match(svg, /stroke-width="31"/);
  // canvas-margin transform
  assert.match(svg, /translate\(82[ ,]+82\)\s*scale\(0\.84\)/);
});

test('flat variant: solid dark capsule (no gradient), bigger eyes r=46, dot r=82, base rx=230', () => {
  const svg = miraSvg({ variant: 'flat' });
  assert.match(svg, /rx="230"/);
  assert.match(svg, /#0E1C20/i); // solid capsule
  assert.doesNotMatch(svg, /linearGradient/i); // flat = no gradients (§8.5)
  assert.match(svg, /cx="380"\s+cy="468"\s+r="46"/);
  assert.match(svg, /cx="644"\s+cy="468"\s+r="46"/);
  assert.match(svg, /cx="803"\s+cy="344"\s+r="82"/);
});

test('both variants keep the green dot at the SAME locked coord (803,344)', () => {
  for (const variant of ['full', 'flat']) {
    assert.match(miraSvg({ variant }), /cx="803"\s+cy="344"/);
  }
});

test('closed eyes (rest states) replace eye circles — enables blink/nap later', () => {
  const open = miraSvg({ variant: 'flat', eyes: 'open' });
  const closed = miraSvg({ variant: 'flat', eyes: 'closed' });
  assert.match(open, /cx="380"\s+cy="468"\s+r="46"/);
  assert.doesNotMatch(closed, /cx="380"\s+cy="468"\s+r="46"/);
});
