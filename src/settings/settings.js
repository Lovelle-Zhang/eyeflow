'use strict';

/**
 * Persisted settings — pure defaults + validation (§7 onboarding flag + the two
 * §6.4 settings: full-rest duration + reminder tier). v1 stays cruelly small (no
 * knob soup, §6.4). The file read/write is a thin impure adapter (settings-store).
 */

const { DEFAULT_NAP_MS, NAP_DURATION_OPTIONS_MS } = require('../view/nap/nap');
const { DEFAULT_REMINDER_TIER, isReminderTier } = require('../view/reminder/tier');
const { DEFAULT_LOCALE, isLocale } = require('../view/i18n/panel-strings');

/**
 * @param {*} raw parsed persisted value (or null / garbage)
 * @param {string} [fallbackLocale] locale to use on first run (no persisted value);
 *   the impure store resolves it from the system language. A persisted choice wins.
 * @returns {{ onboardingDone: boolean, napMs: number, reminderTier: string, locale: string }}
 */
function hydrateSettings(raw, fallbackLocale = DEFAULT_LOCALE) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const fallback = isLocale(fallbackLocale) ? fallbackLocale : DEFAULT_LOCALE;
  return {
    onboardingDone: r.onboardingDone === true,
    napMs: NAP_DURATION_OPTIONS_MS.includes(r.napMs) ? r.napMs : DEFAULT_NAP_MS,
    reminderTier: isReminderTier(r.reminderTier) ? r.reminderTier : DEFAULT_REMINDER_TIER,
    locale: isLocale(r.locale) ? r.locale : fallback, // §4 UI language (persisted wins over system)
  };
}

module.exports = { hydrateSettings };
