'use strict';

/**
 * One reminder session's choreography (§6.1) — split from reminder-controller for
 * the §9.1 line budget. Owns its own countdown timer + prompt rotation and the
 * D2 "actually rested?" sample; the controller owns the busy lifecycle, IPC, and
 * the tuck watchdog. Pure behavior: the run() body is the former runSession()
 * verbatim, calling the injected tuck() wherever it used to send 'reminder:tuck'.
 */

const { energyToColor } = require('../view/capsule/energy-color');
const { rechargePreview } = require('../view/reminder/recharge');
const { shortBreakFrame, SHORT_BREAK_MS, RECHARGE_HOLD_MS } = require('../view/reminder/short-break');
const { earnedShortBreak, REMINDER_DEFAULTS } = require('../view/reminder/gating');
const { reminderCopy } = require('../view/reminder/copy');

function createReminderSession({ send, presenter, getEnergy, idleSec, getLocale, tuck } = {}) {
  const localeOf = () => (typeof getLocale === 'function' ? getLocale() : 'zh');
  let timer = null;
  let shortIndex = 0;
  let napIndex = 0;
  let earned = false; // D2: was this (short) break actually rested?

  function run(level, energy) {
    const isNap = level === 'nap';
    const copy = reminderCopy(localeOf()); // §4 localized prompt + nap button

    send('reminder:show', {
      kind: level, // renderer blinks (short) or opens eyes (nap) on the shared capsule
      capsuleCss: energyToColor(energy).css,
      energy, // 0–100; the pulse (--energy) shows the honest 气色, ready to brighten
      text: isNap
        ? copy.nap[napIndex % copy.nap.length]
        : copy.short[shortIndex % copy.short.length],
      napLabel: copy.napButton,
      durationSec: Math.round(SHORT_BREAK_MS / 1000),
    });

    if (isNap) {
      // §5.1 二级: a clickable "小睡" suggestion that dwells then tucks (no credit).
      presenter.setInteractive(true);
      napIndex += 1;
      timer = setTimeout(() => {
        timer = null;
        tuck();
      }, REMINDER_DEFAULTS.napSuggestDwellMs);
      return;
    }

    // §6.1 一级: the 20s eye-rest countdown, credited only if actually rested (D2).
    shortIndex += 1;
    const start = process.hrtime.bigint();
    timer = setInterval(() => {
      const elapsed = Number(process.hrtime.bigint() - start) / 1e6;
      const f = shortBreakFrame(elapsed);
      send('reminder:frame', { remainingSec: f.remainingSec, remainingFraction: f.remainingFraction });
      if (f.done) {
        clearInterval(timer);
        timer = null;
        earned = earnedShortBreak(idleSec()); // D2: sample rest as the break ends
        if (earned) {
          // 休息=回充: preview POST-credit 气色 (display-only; real credit fires once in finish(), §9.2 no double-credit).
          const base = typeof getEnergy === 'function' ? getEnergy() : energy;
          send('reminder:recharge', rechargePreview(base));
          timer = setTimeout(() => {
            timer = null;
            tuck();
          }, RECHARGE_HOLD_MS);
        } else {
          tuck(); // not rested → no charge, no charge animation (honest)
        }
      }
    }, 200);
  }

  return {
    run,
    /** D2: was the just-finished short break actually rested? Read in finish(). */
    get earned() {
      return earned;
    },
    /** Reset the earned flag when a new session becomes busy (mirrors the old trigger). */
    reset() {
      earned = false;
    },
    /** Clear the running countdown/dwell timer (on finish / destroy). */
    stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    },
  };
}

module.exports = { createReminderSession };
