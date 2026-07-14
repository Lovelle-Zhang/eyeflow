'use strict';

/**
 * Nap ritual — pure bits (CHARTER §6.3/§6.4). The countdown math is the same as
 * the short break, so the controller reuses shortBreakFrame(elapsed, durationMs);
 * this module owns only what's nap-specific: the duration options (§6.4, the one
 * v1 setting) and the mm:ss clock the fullscreen ritual displays.
 */

// §6.4: the single custom setting — full-rest length. 1 / 3 / 5 minutes.
const NAP_DURATION_OPTIONS_MS = Object.freeze([60000, 180000, 300000]);
const DEFAULT_NAP_MS = 180000; // 3 minutes

/**
 * Format seconds as m:ss for the calm ritual clock.
 * @param {number} totalSec
 * @returns {string}
 */
function formatClock(totalSec) {
  const s = Math.max(0, Math.floor(totalSec));
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

module.exports = { NAP_DURATION_OPTIONS_MS, DEFAULT_NAP_MS, formatClock };
