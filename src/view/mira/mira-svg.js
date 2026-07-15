'use strict';

/**
 * Mira SVG — The Pulse (CHARTER §8.5 superseded → docs/MIRA_SYSTEM.md). A dark
 * lens (§8.5 geometry) holding ONE luminous breathing-light core — not two eyes.
 * Used for the app icon (the UI surfaces render the pulse in CSS, not this SVG).
 *
 * Pure: options in → SVG string out, on the locked 1024×1024 canvas.
 */

const CANVAS = 1024;
const LENS = { x: 177, y: 335, w: 671, h: 318, rx: 159 }; // §8.5 dark lens
const CORE = { cx: 512, cy: 494, r: 128 }; // pulse core, centered in the lens

const C = {
  bgMintWhite: '#EAFFF6',
  bgSky: '#BDEAFF',
  bgWarm: '#F3EEC7',
  lensDarkA: '#0E1C20',
  lensDarkB: '#10272A',
  pulse: '#f4fff9',
  pulseMid: '#8fe6c0',
  stroke: '#7EEFD4',
};

/** Full render: glossy mint plate, dark-gradient lens, a glowing pulse core. */
function fullVariant() {
  const defs =
    '<defs>' +
    `<linearGradient id="miraBg" gradientUnits="userSpaceOnUse" x1="216" y1="156" x2="826" y2="874">` +
    `<stop offset="0" stop-color="${C.bgMintWhite}"/>` +
    `<stop offset="0.58" stop-color="${C.bgSky}"/>` +
    `<stop offset="1" stop-color="${C.bgWarm}"/>` +
    '</linearGradient>' +
    `<linearGradient id="miraLens" gradientUnits="userSpaceOnUse" x1="${LENS.x}" y1="${LENS.y}" x2="${LENS.x + LENS.w}" y2="${LENS.y + LENS.h}">` +
    `<stop offset="0" stop-color="${C.lensDarkA}"/>` +
    `<stop offset="1" stop-color="${C.lensDarkB}"/>` +
    '</linearGradient>' +
    `<radialGradient id="miraPulse" gradientUnits="userSpaceOnUse" cx="${CORE.cx}" cy="${CORE.cy}" r="${CORE.r}">` +
    `<stop offset="0" stop-color="${C.pulse}"/>` +
    `<stop offset="0.36" stop-color="${C.pulseMid}"/>` +
    `<stop offset="0.62" stop-color="${C.pulseMid}" stop-opacity="0.35"/>` +
    `<stop offset="1" stop-color="${C.pulseMid}" stop-opacity="0"/>` +
    '</radialGradient>' +
    '</defs>';

  // macOS Big Sur+ icon grid: the body sits in an 824×824 region centered on the
  // 1024 canvas → 100px transparent margin all around (scale 824/1024). rx 230
  // scales to ~185px, matching the system squircle's continuous corner.
  const body =
    `<g transform="translate(100 100) scale(0.8046875)">` +
    `<rect x="0" y="0" width="${CANVAS}" height="${CANVAS}" rx="230" fill="url(#miraBg)"/>` +
    `<rect x="${LENS.x}" y="${LENS.y}" width="${LENS.w}" height="${LENS.h}" rx="${LENS.rx}" ` +
    `fill="url(#miraLens)" stroke="${C.stroke}" stroke-width="31" stroke-opacity="0.18"/>` +
    `<circle cx="${CORE.cx}" cy="${CORE.cy}" r="${CORE.r}" fill="url(#miraPulse)"/>` +
    '</g>';

  return defs + body;
}

/** Flat 32px variant: solid fills, no gradients; the core distills to a dot. */
function flatVariant() {
  return (
    `<rect x="0" y="0" width="${CANVAS}" height="${CANVAS}" rx="230" fill="${C.bgMintWhite}"/>` +
    `<rect x="${LENS.x}" y="${LENS.y}" width="${LENS.w}" height="${LENS.h}" rx="${LENS.rx}" fill="${C.lensDarkA}"/>` +
    `<circle cx="${CORE.cx}" cy="${CORE.cy}" r="96" fill="${C.pulseMid}"/>` +
    `<circle cx="${CORE.cx}" cy="${CORE.cy}" r="52" fill="${C.pulse}"/>`
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
