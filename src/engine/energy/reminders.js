'use strict';

/**
 * Reminders — ENGINE_SPEC §D. Pure edge-trigger + re-arm on the two lines
 * X (L1) and Y (L2). A line fires once while armed, then must recover to ≥ X
 * before it can fire again (§5.2 quiet window; D3: both re-arm at X).
 *
 * @param {number} energy          energy AFTER the §C update
 * @param {{l1Armed:boolean, l2Armed:boolean}} arming  previous arming flags
 * @param {{lineX:number, lineY:number}} params
 * @returns {{l1Armed:boolean, l2Armed:boolean, events:string[]}}
 */
function evaluateReminders(energy, arming, params) {
  const { lineX, lineY } = params;
  let { l1Armed, l2Armed } = arming;
  const events = [];

  // L1
  if (energy >= lineX) {
    l1Armed = true;
  } else if (l1Armed) {
    events.push('remind_short');
    l1Armed = false;
  }

  // L2 — re-arms only at ≥ X (D3), fires strictly below Y
  if (energy >= lineX) {
    l2Armed = true;
  } else if (energy < lineY && l2Armed) {
    events.push('remind_nap');
    l2Armed = false;
  }

  return { l1Armed, l2Armed, events };
}

module.exports = { evaluateReminders };
