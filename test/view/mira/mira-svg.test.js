'use strict';

// Mira SVG = The Pulse (CHARTER §8.5 superseded → MIRA_SYSTEM.md). A dark lens
// holding one luminous pulse core — NOT two eyes. Used for the app icon.

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { miraSvg } = require('../../../src/view/mira/mira-svg');

test('returns an SVG on the locked 1024 canvas base', () => {
  const svg = miraSvg();
  assert.match(svg, /^<svg\b/);
  assert.match(svg, /viewBox="0 0 1024 1024"/);
  assert.match(svg, /<\/svg>\s*$/);
});

test('full variant: dark lens (§8.5 geometry) + a glowing pulse core, no eyes', () => {
  const svg = miraSvg({ variant: 'full' });
  assert.match(svg, /x="177"\s+y="335"\s+width="671"\s+height="318"\s+rx="159"/); // lens
  assert.match(svg, /radialGradient/i); // the pulse glow
  assert.match(svg, /cx="512"\s+cy="494"/); // core centered in the lens
  // no two-eye pair from the retired face
  assert.doesNotMatch(svg, /cx="380"\s+cy="468"/);
  assert.doesNotMatch(svg, /cx="644"\s+cy="468"/);
});

test('full variant: glossy mint plate gradient + canvas-margin transform', () => {
  const svg = miraSvg({ variant: 'full' });
  assert.match(svg, /#EAFFF6/i);
  assert.match(svg, /#BDEAFF/i);
  assert.match(svg, /#F3EEC7/i);
  assert.match(svg, /translate\(82[ ,]+82\)\s*scale\(0\.84\)/);
});

test('the pulse core light uses the mint pulse colors', () => {
  const svg = miraSvg({ variant: 'full' });
  assert.match(svg, /#f4fff9/i); // core center
  assert.match(svg, /#8fe6c0/i); // mint mid
});

test('flat variant: solid plate + solid dark lens + solid core, no gradients', () => {
  const svg = miraSvg({ variant: 'flat' });
  assert.match(svg, /rx="230"/);
  assert.match(svg, /#0E1C20/i);
  assert.doesNotMatch(svg, /Gradient/i); // 32px → flat, no gradients
  assert.match(svg, /cx="512"\s+cy="494"/); // core still centered
});
