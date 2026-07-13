'use strict';

/**
 * Small Mira character SVG — CHARTER §8.5 (locked, inherited from app icon).
 *
 * Small Mira is the CHARACTER (§3): a constant face — dark capsule + white eyes
 * + green dot — that does NOT change with energy. Energy 气色 lives on the big
 * green capsule (§8.3), not here. Small Mira only animates its eyes during rest
 * (open / blink / closed), so `eyes` is parametrized for §6.3 later.
 *
 * Pure: options in → SVG string out. All coordinates are on the locked
 * 1024×1024 canvas base; the 'full' variant adds canvas margin via a transform.
 */

// Locked geometry (§8.5), shared by both variants — the green dot and eye
// centers stay at identical coords across variants ("同构").
const CANVAS = 1024;
const LENS = { x: 177, y: 335, w: 671, h: 318, rx: 159 }; // 2.11:1, rx ≈ half-height
const EYE_L = { cx: 380, cy: 468 }; // y=468 sits just above lens center (494) → "有神"
const EYE_R = { cx: 644, cy: 468 };
const DOT = { cx: 803, cy: 344 }; // top-right outer edge

// Colors (§8.5).
const C = {
  bgMintWhite: '#EAFFF6',
  bgSky: '#BDEAFF',
  bgWarm: '#F3EEC7',
  lensDarkA: '#0E1C20',
  lensDarkB: '#10272A',
  eye: '#F8FFFC',
  dot: '#6FE7C3', // same mint as the progress line (§8.4) — intentional echo
  stroke: '#7EEFD4',
};

/** Eyes: open = white circles; closed = thin rounded bars (blink/nap). */
function eyesMarkup(r, state) {
  if (state === 'closed') {
    const barH = Math.round(r * 0.36);
    const barW = r * 2;
    const y = EYE_L.cy - barH / 2;
    const bar = (cx) =>
      `<rect x="${cx - r}" y="${y}" width="${barW}" height="${barH}" rx="${barH / 2}" fill="${C.eye}"/>`;
    return `${bar(EYE_L.cx)}${bar(EYE_R.cx)}`;
  }
  return (
    `<circle cx="${EYE_L.cx}" cy="${EYE_L.cy}" r="${r}" fill="${C.eye}"/>` +
    `<circle cx="${EYE_R.cx}" cy="${EYE_R.cy}" r="${r}" fill="${C.eye}"/>`
  );
}

/** Full render: glossy mint base, dark-gradient lens, mint stroke, canvas margin. */
function fullVariant(eyes) {
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
    '</defs>';

  const body =
    `<g transform="translate(82 82) scale(0.84)">` +
    `<rect x="0" y="0" width="${CANVAS}" height="${CANVAS}" rx="216" fill="url(#miraBg)"/>` +
    `<rect x="${LENS.x}" y="${LENS.y}" width="${LENS.w}" height="${LENS.h}" rx="${LENS.rx}" ` +
    `fill="url(#miraLens)" stroke="${C.stroke}" stroke-width="31" stroke-opacity="0.18"/>` +
    eyesMarkup(44, eyes) +
    `<circle cx="${DOT.cx}" cy="${DOT.cy}" r="79" fill="${C.dot}"/>` +
    '</g>';

  return defs + body;
}

/** Flat 32px avatar: solid fills, no gradients, slightly larger eyes/dot (§8.5). */
function flatVariant(eyes) {
  return (
    `<rect x="0" y="0" width="${CANVAS}" height="${CANVAS}" rx="230" fill="${C.bgMintWhite}"/>` +
    `<rect x="${LENS.x}" y="${LENS.y}" width="${LENS.w}" height="${LENS.h}" rx="${LENS.rx}" fill="${C.lensDarkA}"/>` +
    eyesMarkup(46, eyes) +
    `<circle cx="${DOT.cx}" cy="${DOT.cy}" r="82" fill="${C.dot}"/>`
  );
}

/**
 * @param {{variant?: 'full'|'flat', eyes?: 'open'|'closed'}} [opts]
 * @returns {string} SVG markup
 */
function miraSvg(opts = {}) {
  const { variant = 'full', eyes = 'open' } = opts;
  const inner = variant === 'flat' ? flatVariant(eyes) : fullVariant(eyes);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS} ${CANVAS}" ` +
    `role="img" aria-label="Mira">${inner}</svg>`
  );
}

module.exports = { miraSvg };
