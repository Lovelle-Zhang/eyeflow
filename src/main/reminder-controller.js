'use strict';

/**
 * Reminder controller (CHARTER §6.1): on a `remind_short` event, float the top
 * capsule out, run the 20s eye-rest, then tuck it away. On completion, credit a
 * short break back to the engine (歇完就安静). One session at a time.
 *
 * Owns the impure interval + overlay window; the countdown math and copy are the
 * separately-tested pure modules.
 */

const { ipcMain } = require('electron');
const { createReminderWindow } = require('./overlay/reminder-window');
const { energyToColor } = require('../view/capsule/energy-color');
const { miraSvg } = require('../view/mira/mira-svg');
const { shortBreakFrame, SHORT_BREAK_MS } = require('../view/reminder/short-break');
const { earnedShortBreak, shouldFloatNow, REMINDER_DEFAULTS } = require('../view/reminder/gating');
const { SHORT_BREAK_PROMPTS, NAP_SUGGEST_PROMPTS } = require('../view/reminder/copy');

function createReminderController({ getIdleSec, getEnergy, onShortBreakComplete } = {}) {
  const idleSec = typeof getIdleSec === 'function' ? getIdleSec : () => 0;
  let win = null;
  let busy = false;
  let timer = null;
  let bufferTimer = null;
  let shortIndex = 0;
  let napIndex = 0;
  let earned = false; // D2: was this (short) break actually rested?

  const send = (channel, payload) => {
    if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
  };

  function finish() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    if (win && !win.isDestroyed()) win.hide();
    if (busy) {
      busy = false;
      // D2: only credit the recharge if the user actually rested (歇完就安静).
      // Kept typing through it → no credit → energy keeps falling toward Y.
      if (earned && onShortBreakComplete) onShortBreakComplete();
    }
  }

  ipcMain.on('reminder:tucked', finish);

  function runSession(level, energy) {
    const isNap = level === 'nap';

    send('reminder:show', {
      kind: level,
      capsuleCss: energyToColor(energy).css,
      // 短歇 = 眨一次长眼 (§6.3, closed); 二级建议 = 面对你说话 (open eyes).
      mira: miraSvg({ variant: 'full', eyes: isNap ? 'open' : 'closed' }),
      text: isNap
        ? NAP_SUGGEST_PROMPTS[napIndex % NAP_SUGGEST_PROMPTS.length]
        : SHORT_BREAK_PROMPTS[shortIndex % SHORT_BREAK_PROMPTS.length],
      durationSec: Math.round(SHORT_BREAK_MS / 1000),
    });

    if (isNap) {
      // §5.1 二级: a suggestion that dwells then tucks. No eye-rest countdown,
      // no credit — recovery comes from an actual nap (§6.3) or stepping away.
      napIndex += 1;
      timer = setTimeout(() => {
        timer = null;
        send('reminder:tuck');
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
        send('reminder:tuck');
      }
    }, 200);
  }

  function floatOut(level, fallbackEnergy) {
    // energy may have drifted during buffering → prefer a fresh read (§8.3).
    const energy = typeof getEnergy === 'function' ? getEnergy() : fallbackEnergy;
    if (!win || win.isDestroyed()) win = createReminderWindow();
    win.showInactive();
    if (win.webContents.isLoading()) {
      win.webContents.once('did-finish-load', () => runSession(level, energy));
    } else {
      runSession(level, energy);
    }
  }

  return {
    /**
     * A reminder is due (§6.1). Auto reminders buffer past dense typing (§6.2);
     * a user-initiated break (immediate) floats out right away — you asked for it.
     * @param {{ level?: 'short'|'nap', energy?: number, immediate?: boolean }} [opts]
     */
    trigger({ level = 'short', energy, immediate = false } = {}) {
      if (busy) return; // one session at a time; ignore re-entrant reminders
      busy = true;
      earned = false;

      if (immediate) {
        floatOut(level, energy);
        return;
      }

      // §6.2 smart buffer: wait for a natural gap, but no longer than the cap.
      const bufferStart = process.hrtime.bigint();
      const attempt = () => {
        const waitedMs = Number(process.hrtime.bigint() - bufferStart) / 1e6;
        if (shouldFloatNow(idleSec(), waitedMs)) {
          bufferTimer = null;
          floatOut(level, energy);
        } else {
          bufferTimer = setTimeout(attempt, REMINDER_DEFAULTS.bufferPollMs);
        }
      };
      attempt();
    },
    destroy() {
      if (timer) clearInterval(timer);
      if (bufferTimer) clearTimeout(bufferTimer);
      ipcMain.removeListener('reminder:tucked', finish);
      if (win && !win.isDestroyed()) win.destroy();
      win = null;
    },
  };
}

module.exports = { createReminderController };
