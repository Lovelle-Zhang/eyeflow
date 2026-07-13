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

  // §6.2 smart buffer: when the reminder is due, don't interrupt dense typing.
  // A "natural gap" is idle ≥ gapSec; if none appears, float anyway at the cap.
  gapSec: 2,
  bufferMaxMs: 5 * 60 * 1000, // 5 minutes
  bufferPollMs: 500, // how often the buffer re-checks for a gap
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

/**
 * §6.2 smart buffer: should the due reminder float out now?
 * Yes if there's a natural gap (idle ≥ gapSec) OR we've buffered up to the cap.
 * @param {number} idleSec current seconds since last input
 * @param {number} waitedMs how long we've been buffering
 * @param {{gapSec?:number, bufferMaxMs?:number}} [opts]
 * @returns {boolean}
 */
function shouldFloatNow(idleSec, waitedMs, opts = {}) {
  const { gapSec = REMINDER_DEFAULTS.gapSec, bufferMaxMs = REMINDER_DEFAULTS.bufferMaxMs } = opts;
  return idleSec >= gapSec || waitedMs >= bufferMaxMs;
}

module.exports = { earnedShortBreak, shouldFloatNow, REMINDER_DEFAULTS };
