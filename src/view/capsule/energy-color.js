'use strict';

/**
 * energyToColor — CHARTER §8.3 (locked). Maps energy (0–100) to the big green
 * capsule's 气色 (color), the "会变的仪表" side of the core visual language.
 *
 * Rules (§8.3): hue LOCKED at 157 (守住"还是墨绿"); as energy falls, saturation
 * drops a lot, lightness rises a little, alpha drops a little — conveying 共情
 * (she's tired), never turning red/yellow. Linear interpolation between anchors.
 *
 * Pure & UI-agnostic input/output (§9.4): energy in, color descriptor out. The
 * small Mira is a constant character and does NOT use this — only the capsule does.
 *
 * Note: the §8.3 hex codes are informational labels; the HSL + alpha columns are
 * the interpolation source of truth (hue is locked to 157).
 */

const HUE = 157;

// §8.3 anchor table, ascending by energy: energy → { s, l, a }.
const ANCHORS = [
  { energy: 15, s: 8, l: 40, a: 0.88 }, // 极低 · 蔫了·该充电 (visual floor)
  { energy: 40, s: 19, l: 36, a: 0.92 }, // 有点淡了
  { energy: 66, s: 40, l: 30, a: 0.95 }, // 常态
  { energy: 100, s: 61, l: 26, a: 0.97 }, // 满 · 神采奕奕
];

const FLOOR = ANCHORS[0];
const FULL = ANCHORS[ANCHORS.length - 1];

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function round(value, decimals) {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/**
 * @param {number} energy 0–100 (clamped outside the anchor range)
 * @returns {{h:number, s:number, l:number, a:number, css:string}}
 */
function energyToColor(energy) {
  let s;
  let l;
  let a;

  if (energy <= FLOOR.energy) {
    ({ s, l, a } = FLOOR); // clamp below 极低 → visual floor
  } else if (energy >= FULL.energy) {
    ({ s, l, a } = FULL); // clamp above full
  } else {
    // find the bracketing anchor pair and interpolate linearly
    for (let i = 0; i < ANCHORS.length - 1; i++) {
      const lo = ANCHORS[i];
      const hi = ANCHORS[i + 1];
      if (energy >= lo.energy && energy <= hi.energy) {
        const t = (energy - lo.energy) / (hi.energy - lo.energy);
        s = lerp(lo.s, hi.s, t);
        l = lerp(lo.l, hi.l, t);
        a = lerp(lo.a, hi.a, t);
        break;
      }
    }
  }

  const css = `hsla(${HUE}, ${round(s, 1)}%, ${round(l, 1)}%, ${round(a, 2)})`;
  return { h: HUE, s, l, a, css };
}

module.exports = { energyToColor };
