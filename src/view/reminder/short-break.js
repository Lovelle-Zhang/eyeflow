'use strict';

/**
 * Short-break countdown — pure math for the top capsule's 20s eye-rest
 * (CHARTER §6.1/§6.3). Given elapsed time, reports what the capsule should show:
 * seconds left and how full the progress line is (it shrinks with the countdown,
 * §8.4). Impure parts (the overlay window, the animation, the wall clock) live
 * around this and feed it elapsed ms.
 */

const SHORT_BREAK_MS = 20000; // 20s, fixed and not user-tunable (§6.3/§6.4)

// After a rested short break, hold the post-credit 气色 brighten this long before
// tucking, so the user SEES the recharge (休息=回充), matching the nap/onboarding.
// §9.7 tunable feel value; display-only, does not affect the real credit.
const RECHARGE_HOLD_MS = 900;

/**
 * @param {number} elapsedMs time since the break floated out
 * @param {number} [durationMs] total break length
 * @returns {{ remainingSec:number, remainingFraction:number, elapsedFraction:number, done:boolean }}
 */
function shortBreakFrame(elapsedMs, durationMs = SHORT_BREAK_MS) {
  const total = Math.max(0, durationMs);
  const clamped = Math.max(0, Math.min(elapsedMs, total));
  const remainingMs = total - clamped;
  return {
    remainingSec: Math.ceil(remainingMs / 1000),
    remainingFraction: total === 0 ? 0 : remainingMs / total,
    elapsedFraction: total === 0 ? 1 : clamped / total,
    done: clamped >= total,
  };
}

module.exports = { shortBreakFrame, SHORT_BREAK_MS, RECHARGE_HOLD_MS };
