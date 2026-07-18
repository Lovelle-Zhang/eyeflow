'use strict';

/**
 * Presenter — maps engine energy + the today ledger into the panel payload
 * (§8.3 气色 / state word, formatted eye-use), localized per the persisted locale
 * (§4 zh/en). The panel renderer is a dumb view: every string it shows is built
 * here. Pure view mapping, kept out of the service composition root.
 */

const { energyToColor, energyStateKey } = require('../view/capsule/energy-color');
const { formatEyeUse } = require('../records/today');
const { panelStrings, LANGUAGE_OPTIONS } = require('../view/i18n/panel-strings');
const { NAP_DURATION_OPTIONS_MS } = require('../view/nap/nap');
const { REMINDER_TIERS } = require('../view/reminder/tier');

function buildPanelPayload({ energy, record, napMs, reminderTier, locale }) {
  const t = panelStrings(locale);
  const mins = (ms) => Math.round(ms / 60000);
  return {
    energy,
    locale,
    capsuleCss: energyToColor(energy).css,
    state: t.state[energyStateKey(energy)],
    eyeUseText: formatEyeUse(record.eyeUseMs).text, // "43m" / "4h 12m" — locale-neutral
    napMs,
    reminderTier,
    texts: {
      today: t.today,
      screenTime: t.screenTime,
      napLength: t.napLength,
      reminderStyle: t.reminderStyle,
      restNow: t.restNow,
      shortBreakSub: t.shortBreakSub,
      takeNap: t.takeNap,
      quit: t.quit,
      settings: t.settings,
      language: t.language,
      energy: t.energy(Math.round(energy)),
      restsCount: t.restsCount(record.shortBreaks + record.naps),
      restsLabel: t.restsLabel(record.shortBreaks, record.naps),
      napSub: t.napSub(mins(napMs)),
    },
    napOptions: NAP_DURATION_OPTIONS_MS.map((ms) => ({ ms, label: t.napOpt(mins(ms)) })),
    tierOptions: REMINDER_TIERS.map((tier) => ({ tier, label: t.tier[tier] })),
    languageOptions: LANGUAGE_OPTIONS,
  };
}

module.exports = { buildPanelPayload };
