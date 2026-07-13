'use strict';

/**
 * Thin adapter over the OS idle clock — the ONLY system dependency of the
 * energy loop. Privacy (§POSITIONING 不监控): this reads a single duration
 * (seconds since last input) — no keystrokes, no content, no foreground app.
 *
 * Impure by nature (touches Electron) → kept out of the tested driver core.
 */

const { powerMonitor } = require('electron');

/** @returns {number} seconds since the last user input */
function getIdleSec() {
  return powerMonitor.getSystemIdleTime();
}

module.exports = { getIdleSec };
