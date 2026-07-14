'use strict';

/**
 * Settings store (§7/§6.4) — thin impure adapter persisting settings.json in the
 * ISOLATED userData dir (…/EyeFlow Next/settings.json). Settings change rarely,
 * so writes are synchronous. Never touches the legacy app's data.
 */

const fs = require('node:fs');
const path = require('node:path');
const { app } = require('electron');
const { hydrateSettings } = require('../settings/settings');

function createSettingsStore() {
  const file = path.join(app.getPath('userData'), 'settings.json');
  let current = hydrateSettings(null);

  return {
    file,
    load() {
      let raw = null;
      try {
        raw = JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch {
        /* no file yet / corrupt → defaults */
      }
      current = hydrateSettings(raw);
      return current;
    },
    /** Merge a patch, validate, and write. @returns the new settings */
    save(patch) {
      current = hydrateSettings({ ...current, ...patch });
      try {
        fs.writeFileSync(file, JSON.stringify(current));
      } catch {
        /* best effort */
      }
      return current;
    },
    get: () => current,
  };
}

module.exports = { createSettingsStore };
