'use strict';

// RED-first: the tray icon is generated as a monochrome PNG in pure Node (no
// Electron, no rasterizer dep), so the pixel generation is testable. The
// nativeImage/template wrapping is the thin impure part, not tested here.

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { miraTrayPng, TRAY_CANVAS } = require('../../../src/main/tray/tray-icon');

test('produces a valid PNG (signature + IHDR dimensions)', () => {
  const png = miraTrayPng();
  assert.ok(Buffer.isBuffer(png));
  assert.deepEqual(
    [...png.subarray(0, 8)],
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    'PNG signature',
  );
  // IHDR width/height live at bytes 16..24
  assert.equal(png.readUInt32BE(16), TRAY_CANVAS.width);
  assert.equal(png.readUInt32BE(20), TRAY_CANVAS.height);
});

test('the icon is not blank — some pixels are opaque (the Mira silhouette)', () => {
  const png = miraTrayPng();
  // an all-transparent image compresses tiny; a real silhouette is bigger
  assert.ok(png.length > 200, 'PNG carries actual shape data');
});
