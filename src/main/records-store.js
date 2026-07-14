'use strict';

/**
 * Records store (§7) — thin impure adapter that persists the "today" ledger to
 * a single JSON file in the ISOLATED userData dir (…/EyeFlow Next/today.json).
 * Never touches the legacy app's data. Writes are debounced; flush() forces a
 * synchronous write (call on quit).
 */

const fs = require('node:fs');
const path = require('node:path');
const { app } = require('electron');
const { hydrate } = require('../records/persistence');
const { dayKey } = require('../records/today');

function createRecordsStore({ debounceMs = 3000 } = {}) {
  const file = path.join(app.getPath('userData'), 'today.json');
  let pending = null;
  let timer = null;

  function writeNow() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (!pending) return;
    try {
      fs.writeFileSync(file, JSON.stringify(pending));
    } catch {
      /* best effort — losing the local tally is not worth crashing over */
    }
  }

  return {
    file,
    /** Read today's record back, resuming the same day or starting fresh (§7). */
    load() {
      let raw = null;
      try {
        raw = JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch {
        /* no file yet, or corrupt → fresh */
      }
      return hydrate(dayKey(new Date()), raw);
    },
    /** Queue a debounced write of the latest record. */
    save(record) {
      pending = record;
      if (!timer) timer = setTimeout(writeNow, debounceMs);
    },
    /** Force a synchronous write (e.g. on quit). */
    flush: writeNow,
  };
}

module.exports = { createRecordsStore };
