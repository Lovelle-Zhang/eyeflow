'use strict';

/**
 * Presenter — maps engine energy + the today ledger into the panel payload
 * (§8.3 气色 / state word, formatted eye-use). Pure view mapping, kept out of the
 * service composition root.
 */

const { energyToColor, energyStateLabel } = require('../view/capsule/energy-color');
const { formatEyeUse } = require('../records/today');

function buildPanelPayload({ energy, record, napMs, reminderTier }) {
  return {
    energy,
    capsuleCss: energyToColor(energy).css,
    state: energyStateLabel(energy),
    eyeUseText: formatEyeUse(record.eyeUseMs).text,
    shortBreaks: record.shortBreaks,
    naps: record.naps,
    napMs,
    reminderTier,
  };
}

module.exports = { buildPanelPayload };
