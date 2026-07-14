'use strict';

/**
 * Persisted settings — pure defaults + validation (§7 onboarding flag + the one
 * §6.4 duration setting). v1 keeps this cruelly small (no knobs, §6.4). The
 * file read/write is a thin impure adapter (settings-store).
 */

const { DEFAULT_NAP_MS, NAP_DURATION_OPTIONS_MS } = require('../view/nap/nap');

/**
 * @param {*} raw parsed persisted value (or null / garbage)
 * @returns {{ onboardingDone: boolean, napMs: number }}
 */
function hydrateSettings(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  return {
    onboardingDone: r.onboardingDone === true,
    napMs: NAP_DURATION_OPTIONS_MS.includes(r.napMs) ? r.napMs : DEFAULT_NAP_MS,
  };
}

module.exports = { hydrateSettings };
