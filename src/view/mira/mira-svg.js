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
    // native macOS depth: a soft grounding shadow so the plate reads as sitting
    // ABOVE the surface (matches OneDrive/Obsidian ~15–21px drop). A blurred,
    // offset shape (not feDropShadow) — no sharp source edge = no dark keyline.
    '<filter id="miraShadow" x="-16%" y="-16%" width="132%" height="142%" color-interpolation-filters="sRGB">' +
    `<feGaussianBlur stdDeviation="19"/>` +
    '</filter>' +
    // edge-lighting so the shapes read as solid form (the "细条刻画"): a crisp
    // bright rim where light hits the top edge, fading to a dark shadowed rim
    // at the bottom. Light source is top (consistent with the drop shadow).
    `<linearGradient id="plateRim" gradientUnits="userSpaceOnUse" x1="512" y1="0" x2="512" y2="1024">` +
    `<stop offset="0" stop-color="#ffffff" stop-opacity="0.6"/>` +
    `<stop offset="0.2" stop-color="#ffffff" stop-opacity="0"/>` +
    `<stop offset="0.82" stop-color="#0a1a14" stop-opacity="0"/>` +
    `<stop offset="1" stop-color="#0a1a14" stop-opacity="0.14"/>` +
    '</linearGradient>' +
    `<linearGradient id="lensSheen" gradientUnits="userSpaceOnUse" x1="512" y1="335" x2="512" y2="585">` +
    `<stop offset="0" stop-color="#bff0dd" stop-opacity="0.20"/>` +
    `<stop offset="1" stop-color="#bff0dd" stop-opacity="0"/>` +
    '</linearGradient>' +
    `<linearGradient id="lensRim" gradientUnits="userSpaceOnUse" x1="512" y1="335" x2="512" y2="653">` +
    `<stop offset="0" stop-color="#d7fff2" stop-opacity="0.9"/>` +
    `<stop offset="0.16" stop-color="#8fe6c0" stop-opacity="0.3"/>` +
    `<stop offset="0.5" stop-color="#8fe6c0" stop-opacity="0"/>` +
    `<stop offset="0.86" stop-color="#03100c" stop-opacity="0"/>` +
    `<stop offset="1" stop-color="#03100c" stop-opacity="0.6"/>` +
    '</linearGradient>' +
    `<clipPath id="plateClip"><rect x="0" y="0" width="${CANVAS}" height="${CANVAS}" rx="230"/></clipPath>` +
    `<clipPath id="lensClip"><rect x="${LENS.x}" y="${LENS.y}" width="${LENS.w}" height="${LENS.h}" rx="${LENS.rx}"/></clipPath>` +
    '</defs>';

  // macOS Big Sur+ icon grid: the body sits in an 824×824 region centered on the
  // 1024 canvas → 100px transparent margin all around (scale 824/1024). rx 230
  // scales to ~185px, matching the system squircle's continuous corner.
  const body =
    // grounding shadow: a shape inset from the plate and pushed DOWN, so the
    // plate hides its top/sides and only a soft shadow protrudes below (bottom-
    // weighted, like OneDrive/Obsidian — not a rim clinging to every edge).
    `<rect x="120" y="138" width="784" height="786" rx="172" fill="#09201a" fill-opacity="0.34" filter="url(#miraShadow)"/>` +
    `<g transform="translate(100 100) scale(0.8046875)">` +
    `<rect x="0" y="0" width="${CANVAS}" height="${CANVAS}" rx="230" fill="url(#miraBg)"/>` +
    // plate: a fine top rim-light (clipped so the highlight sits just inside the edge)
    `<g clip-path="url(#plateClip)"><rect x="0" y="0" width="${CANVAS}" height="${CANVAS}" rx="230" fill="none" stroke="url(#plateRim)" stroke-width="8"/></g>` +
    // lens vessel: dark base, a top sheen, and a crisp bright-top/dark-bottom rim
    `<rect x="${LENS.x}" y="${LENS.y}" width="${LENS.w}" height="${LENS.h}" rx="${LENS.rx}" fill="url(#miraLens)"/>` +
    `<g clip-path="url(#lensClip)">` +
    `<rect x="${LENS.x}" y="${LENS.y}" width="${LENS.w}" height="250" fill="url(#lensSheen)"/>` +
    `<rect x="${LENS.x}" y="${LENS.y}" width="${LENS.w}" height="${LENS.h}" rx="${LENS.rx}" fill="none" stroke="url(#lensRim)" stroke-width="18"/>` +
    '</g>' +
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
