'use strict';

/**
 * §6.2 smart buffer (impure timer). When a reminder is due, don't interrupt
 * dense typing: poll until a natural gap appears (idle ≥ gapSec) or the cap is
 * hit, then float out. Pulled out of the controller to keep it thin (§9.1); the
 * gap decision itself is the pure `shouldFloatNow` (view/reminder/gating).
 */

const { shouldFloatNow, REMINDER_DEFAULTS } = require('../view/reminder/gating');

/**
 * Poll for a natural gap, then run `onFloat` once. Returns a canceller.
 * @param {() => number} idleSec current seconds since last input
 * @param {() => void} onFloat called once, when it's time to float out
 * @returns {() => void} cancel — stops any pending poll
 */
function bufferUntilGap(idleSec, onFloat) {
  const start = process.hrtime.bigint();
  let timer = null;
  const attempt = () => {
    const waitedMs = Number(process.hrtime.bigint() - start) / 1e6;
    if (shouldFloatNow(idleSec(), waitedMs)) {
      timer = null;
      onFloat();
    } else {
      timer = setTimeout(attempt, REMINDER_DEFAULTS.bufferPollMs);
    }
  };
  attempt();
  return () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
}

module.exports = { bufferUntilGap };
