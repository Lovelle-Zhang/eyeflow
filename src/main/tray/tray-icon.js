'use strict';

/**
 * Menubar tray icon (CHARTER §4 / §8.5): the small Mira — a dark lens holding
 * one central point of light. Two renders live here, both pure PNG in Node
 * (node:zlib, no rasterizer dep, unit-testable):
 *   · miraTrayPng      — the monochrome template silhouette (core knocked out).
 *   · miraTrayFramePng — a COLOURED frame whose core breathes green while the
 *     app is alive. A colour icon can't be a macOS template (which auto-inverts),
 *     so the lens tone flips with the menubar theme instead (tray-pulse.js drives
 *     the breath + theme). Rendered high-res and downscaled by macOS for crisp edges.
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

/** Encode an 8-bit truecolor+alpha image; sampler(x,y) → [r,g,b,a] 0..255. */
function encodeRGBA(width, height, sampler) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  let p = 0;
  for (let y = 0; y < height; y++) {
    raw[p++] = 0; // filter type: none
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = sampler(x, y);
      raw[p++] = r; raw[p++] = g; raw[p++] = b; raw[p++] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: truecolor + alpha
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

// The alive pulse: Mira's core glows green and breathes while she's running. The
// lens tone flips with the menubar theme (dark bar → light lens), standing in for
// the template auto-invert a coloured icon can't have.
const PULSE_MINT = [0x8f, 0xe6, 0xc0];
const PULSE_CORE = [0xf4, 0xff, 0xf9];
const lensTone = (dark) => (dark ? [0xe9, 0xf2, 0xee] : [0x0b, 0x1a, 0x15]);

/** One breathing frame → PNG. dark: menubar is dark. glow: 0..1 pulse intensity. */
function miraTrayFramePng({ dark = false, glow = 1 } = {}) {
  const { width: W, height: H } = TRAY_CANVAS;
  const cap = { x1: 0.27 * W, y1: 0.2 * H, x2: 0.73 * W, y2: 0.8 * H };
  const rad = (cap.y2 - cap.y1) / 2;
  const cx = 0.5 * W;
  const cy = 0.5 * H;
  const rCore = 0.05 * W;
  const rGlow = 0.13 * W;
  const lens = lensTone(dark);

  const sampler = (x, y) => {
    const px = x + 0.5;
    const py = y + 0.5;
    if (!inRoundRect(px, py, cap.x1, cap.y1, cap.x2, cap.y2, rad)) return [0, 0, 0, 0];
    const d = Math.hypot(px - cx, py - cy);
    let g = d <= rCore ? 1 : d >= rGlow ? 0 : (rGlow - d) / (rGlow - rCore);
    g = g * g * glow; // eased falloff, scaled by the breath
    if (g <= 0) return [lens[0], lens[1], lens[2], 255];
    const cm = d >= rCore ? 0 : (rCore - d) / rCore; // white hotspot at the very center
    const mix = (i) => {
      const src = PULSE_MINT[i] + (PULSE_CORE[i] - PULSE_MINT[i]) * cm;
      return Math.round(lens[i] + (src - lens[i]) * g);
    };
    return [mix(0), mix(1), mix(2), 255];
  };

  return encodeRGBA(W, H, sampler);
}

/** Impure: wrap the PNG in a menubar-ready template nativeImage. */
function miraTrayImage() {
  const { nativeImage } = require('electron');
  const image = nativeImage.createFromBuffer(miraTrayPng()).resize({ height: 20, quality: 'best' });
  image.setTemplateImage(true);
  return image;
}

module.exports = { miraTrayPng, miraTrayFramePng, miraTrayImage, TRAY_CANVAS };
