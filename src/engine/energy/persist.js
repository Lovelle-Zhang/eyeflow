'use strict';

/**
 * Energy-state persistence — pure validation (#2). Decides whether a saved
 * snapshot can be resumed. The file I/O and the offline-recharge (applyAway for
 * the closed duration) live in the impure store/service.
 */

const { DEFAULT_PARAMS } = require('./params');

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * @param {*} raw parsed persisted value
 * @returns {{energy:number, l1Armed:boolean, l2Armed:boolean, savedAt:number} | null}
 */
function hydrateEnergy(raw) {
  if (
    raw &&
    typeof raw === 'object' &&
    Number.isFinite(raw.energy) &&
    typeof raw.l1Armed === 'boolean' &&
    typeof raw.l2Armed === 'boolean' &&
    Number.isFinite(raw.savedAt)
  ) {
    return {
      energy: clamp(raw.energy, DEFAULT_PARAMS.energyMin, DEFAULT_PARAMS.energyMax),
      l1Armed: raw.l1Armed,
      l2Armed: raw.l2Armed,
      savedAt: raw.savedAt,
    };
  }
  return null;
}

module.exports = { hydrateEnergy };
