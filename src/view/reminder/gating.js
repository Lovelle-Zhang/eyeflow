'use strict';

/**
 * Reminder gating — pure decisions for the reminder flow (CHARTER §6).
 * Kept out of the impure controller so they are unit-testable.
 *
 * All values here are §9.7 tunable params (feel), not structure.
 */

const REMINDER_DEFAULTS = Object.freeze({
  // D2: idle seconds within the 20s break needed to earn the recharge. If the
  // user kept typing through it, idle stays low → no credit → energy keeps
  // falling toward Y (natural escalation to the nap suggestion).
  restCreditSec: 15,
});

/**
 * D2 gating: did this short break earn its recharge?
 * @param {number} idleSecAtEnd seconds since last input, sampled as the break ends
 * @param {number} [restCreditSec]
 * @returns {boolean}
 */
function earnedShortBreak(idleSecAtEnd, restCreditSec = REMINDER_DEFAULTS.restCreditSec) {
  return idleSecAtEnd >= restCreditSec;
}

module.exports = { earnedShortBreak, REMINDER_DEFAULTS };
