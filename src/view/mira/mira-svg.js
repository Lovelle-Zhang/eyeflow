'use strict';

/**
 * Mira SVG — The Pulse (CHARTER §8.5 superseded → docs/MIRA_SYSTEM.md). A small
 * dark lens holding ONE crisp point of light — not two eyes, not a soft glow.
 * Used for the app icon (the UI surfaces render the pulse in CSS, not this SVG).
 *
 * Pure: options in → SVG string out, on the locked 1024×1024 canvas.
 */

const CANVAS = 1024;
const LENS = { x: 265, y: 335, w: 494, h: 318, rx: 159 }; // small, centered dark lens
const CORE = { cx: 512, cy: 494, r: 90 }; // crisp point of light, centered in the lens

const C = {
  bgMintWhite: '#EAFFF6',
  bgAqua: '#AEEDE0', // §8.5 backplate mid-tone — aqua-mint (was sky-blue); on-brand green-family
  bgWarm: '#F3EEC7',
  lensDarkA: '#0E1C20',
  lensDarkB: '#10272A',
  pulse: '#f4fff9',
  pulseMid: '#8fe6c0',
  stroke: '#7EEFD4',
};

/** Full render: glossy mint plate, small dark lens, a crisp point of light. */
function fullVariant() {
  const defs =
    '<defs>' +
    `<linearGradient id="miraBg" gradientUnits="userSpaceOnUse" x1="216" y1="156" x2="826" y2="874">` +
    `<stop offset="0" stop-color="${C.bgMintWhite}"/>` +
    `<stop offset="0.58" stop-color="${C.bgAqua}"/>` +
    `<stop offset="1" stop-color="${C.bgWarm}"/>` +
    '</linearGradient>' +
    `<linearGradient id="miraLens" gradientUnits="userSpaceOnUse" x1="${LENS.x}" y1="${LENS.y}" x2="${LENS.x + LENS.w}" y2="${LENS.y + LENS.h}">` +
    `<stop offset="0" stop-color="${C.lensDarkA}"/>` +
    `<stop offset="1" stop-color="${C.lensDarkB}"/>` +
    '</linearGradient>' +
    // crisp point of light: bright core that falls off fast (not a big soft glow)
    `<radialGradient id="miraPulse" gradientUnits="userSpaceOnUse" cx="${CORE.cx}" cy="${CORE.cy}" r="${CORE.r}">` +
    `<stop offset="0" stop-color="${C.pulse}"/>` +
    `<stop offset="0.45" stop-color="${C.pulseMid}"/>` +
    `<stop offset="0.72" stop-color="${C.pulseMid}" stop-opacity="0.22"/>` +
    `<stop offset="1" stop-color="${C.pulseMid}" stop-opacity="0"/>` +
    '</radialGradient>' +
    // native macOS depth: a soft, bottom-weighted grounding shadow so the plate
    // reads as sitting ABOVE the surface (matches OneDrive/Obsidian ~15–21px drop).
    '<filter id="miraShadow" x="-16%" y="-16%" width="132%" height="142%" color-interpolation-filters="sRGB">' +
    `<feGaussianBlur stdDeviation="19"/>` +
    '</filter>' +
    '</defs>';

  // macOS Big Sur+ icon grid: the body sits in an 824×824 region centered on the
  // 1024 canvas → 100px margin all around (scale 824/1024). rx 230 → ~185px corner.
  const body =
    // grounding shadow: a shape inset from the plate and pushed DOWN, so the plate
    // hides its top/sides and only a soft shadow protrudes below (bottom-weighted).
    `<rect x="120" y="138" width="784" height="786" rx="172" fill="#09201a" fill-opacity="0.34" filter="url(#miraShadow)"/>` +
    `<g transform="translate(100 100) scale(0.8046875)">` +
    `<rect x="0" y="0" width="${CANVAS}" height="${CANVAS}" rx="230" fill="url(#miraBg)"/>` +
    `<rect x="${LENS.x}" y="${LENS.y}" width="${LENS.w}" height="${LENS.h}" rx="${LENS.rx}" fill="url(#miraLens)"/>` +
    `<circle cx="${CORE.cx}" cy="${CORE.cy}" r="${CORE.r}" fill="url(#miraPulse)"/>` +
    '</g>';

  return defs + body;
}

/** Flat 32px variant: solid fills, no gradients; the core distills to a dot. */
function flatVariant() {
  return (
    `<rect x="0" y="0" width="${CANVAS}" height="${CANVAS}" rx="230" fill="${C.bgMintWhite}"/>` +
    `<rect x="${LENS.x}" y="${LENS.y}" width="${LENS.w}" height="${LENS.h}" rx="${LENS.rx}" fill="${C.lensDarkA}"/>` +
    `<circle cx="${CORE.cx}" cy="${CORE.cy}" r="74" fill="${C.pulseMid}"/>` +
    `<circle cx="${CORE.cx}" cy="${CORE.cy}" r="42" fill="${C.pulse}"/>`
  );
}

/**
 * @param {{variant?: 'full'|'flat'}} [opts]
 * @returns {string} SVG markup
 */
function miraSvg(opts = {}) {
  const { variant = 'full' } = opts;
  const inner = variant === 'flat' ? flatVariant() : fullVariant();
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS} ${CANVAS}" ` +
    `role="img" aria-label="Mira">${inner}</svg>`
  );
}

module.exports = { miraSvg };
