'use strict';

/**
 * Menubar tray icon (CHARTER §4 / §8.5): the small Mira as a monochrome
 * template glyph — a small dark lens with one central light core knocked out.
 * Drawn as a PNG in pure Node (node:zlib), so no rasterizer dependency and the pixel
 * generation is unit-testable. Rendered at high res and downscaled by macOS for
 * crisp edges; setTemplateImage lets it adapt to light/dark menubars.
 */

const zlib = require('node:zlib');

const TRAY_CANVAS = { width: 132, height: 64 };
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(Buffer.concat([t, data])) >>> 0, 0);
  return Buffer.concat([len, t, data, crc]);
}

/** Encode an 8-bit grayscale+alpha image; sampler(x,y) → alpha 0..255 (gray=0). */
function encodeGrayAlpha(width, height, sampler) {
  const raw = Buffer.alloc((width * 2 + 1) * height);
  let p = 0;
  for (let y = 0; y < height; y++) {
    raw[p++] = 0; // filter type: none
    for (let x = 0; x < width; x++) {
      raw[p++] = 0; // gray = black
      raw[p++] = sampler(x, y);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 4; // color type: grayscale + alpha
  return Buffer.concat([
    PNG_SIG,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function inRoundRect(px, py, x1, y1, x2, y2, rad) {
  const qx = Math.max(x1 + rad - px, 0, px - (x2 - rad));
  const qy = Math.max(y1 + rad - py, 0, py - (y2 - rad));
  return qx * qx + qy * qy <= rad * rad;
}

const inCircle = (px, py, cx, cy, r) => (px - cx) ** 2 + (py - cy) ** 2 <= r * r;

/** The Pulse silhouette: a capsule with one central light core (§ MIRA_SYSTEM). */
function miraTrayPng() {
  const { width: W, height: H } = TRAY_CANVAS;
  const cap = { x1: 0.27 * W, y1: 0.2 * H, x2: 0.73 * W, y2: 0.8 * H }; // small centered lens (~1.55, matches the icon)
  const rad = (cap.y2 - cap.y1) / 2;
  const core = { x: 0.5 * W, y: 0.5 * H, r: 0.083 * W }; // the pulse — a light core knocked out

  const sampler = (x, y) => {
    const px = x + 0.5;
    const py = y + 0.5;
    if (inRoundRect(px, py, cap.x1, cap.y1, cap.x2, cap.y2, rad) && !inCircle(px, py, core.x, core.y, core.r)) {
      return 255;
    }
    return 0;
  };

  return encodeGrayAlpha(W, H, sampler);
}

/** Impure: wrap the PNG in a menubar-ready template nativeImage. */
function miraTrayImage() {
  const { nativeImage } = require('electron');
  const image = nativeImage.createFromBuffer(miraTrayPng()).resize({ height: 20, quality: 'best' });
  image.setTemplateImage(true);
  return image;
}

module.exports = { miraTrayPng, miraTrayImage, TRAY_CANVAS };
