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
const { systemLocale } = require('../view/i18n/panel-strings');

function createSettingsStore() {
  const file = path.join(app.getPath('userData'), 'settings.json');
  const sysLocale = systemLocale(app.getLocale()); // §4 first-run default follows the OS language
  let current = hydrateSettings(null, sysLocale);

  return {
    file,
    load() {
      let raw = null;
      try {
        raw = JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch {
        /* no file yet / corrupt → defaults */
      }
      current = hydrateSettings(raw, sysLocale);
      return current;
    },
    /** Merge a patch, validate, and write. @returns the new settings */
    save(patch) {
      current = hydrateSettings({ ...current, ...patch }, sysLocale);
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
