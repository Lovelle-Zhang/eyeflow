'use strict';

/**
 * Energy-state store (#2) — thin impure adapter persisting energy.json in the
 * ISOLATED userData dir (…/EyeFlow Next/energy.json). So a mid-day relaunch
 * resumes your real energy (plus offline-recharge for the closed time), instead
 * of pretending you're full. Debounced writes; flush() on quit.
 */

const fs = require('node:fs');
const path = require('node:path');
const { app } = require('electron');
const { hydrateEnergy } = require('../engine/energy/persist');

function createEnergyStore({ debounceMs = 3000 } = {}) {
  const file = path.join(app.getPath('userData'), 'energy.json');
  let pending = null;
  let timer = null;

  function writeNow() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (!pending) return;
    try {
      fs.writeFileSync(file, JSON.stringify({ ...pending, savedAt: Date.now() }));
    } catch {
      /* best effort */
    }
  }

  return {
    file,
    /** @returns {{energy,l1Armed,l2Armed,savedAt}|null} the resumable snapshot */
    load() {
      let raw = null;
      try {
        raw = JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch {
        /* none / corrupt → fresh */
      }
      return hydrateEnergy(raw);
    },
    /** Queue a debounced write of the latest energy state. */
    save({ energy, l1Armed, l2Armed }) {
      pending = { energy, l1Armed, l2Armed };
      if (!timer) timer = setTimeout(writeNow, debounceMs);
    },
    flush: writeNow,
  };
}

module.exports = { createEnergyStore };
