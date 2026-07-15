'use strict';

/**
 * Reminder controller (CHARTER §6.1): float the top capsule out, run the 20s
 * eye-rest (L1) or the nap suggestion (L2), then tuck away. One session at a
 * time. Owns the impure interval + overlay window; math/copy are pure modules.
 */

const { ipcMain } = require('electron');
const { createReminderWindow } = require('./overlay/reminder-window');
const { bufferUntilGap } = require('./reminder-buffer');
const { energyToColor } = require('../view/capsule/energy-color');
const { rechargePreview } = require('../view/reminder/recharge');
const { shortBreakFrame, SHORT_BREAK_MS, RECHARGE_HOLD_MS } = require('../view/reminder/short-break');
const { earnedShortBreak, REMINDER_DEFAULTS } = require('../view/reminder/gating');
const { SHORT_BREAK_PROMPTS, NAP_SUGGEST_PROMPTS } = require('../view/reminder/copy');

function createReminderController({ getIdleSec, getEnergy, onShortBreakComplete, onNapNow } = {}) {
  const idleSec = typeof getIdleSec === 'function' ? getIdleSec : () => 0;
  let win = null;
  let busy = false;
  let timer = null;
  let cancelBuffer = null;
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
    if (win && !win.isDestroyed()) {
      win.setIgnoreMouseEvents(true); // back to click-through for the next float
      win.hide();
    }
    if (busy) {
      busy = false;
      // D2: credit the recharge only if actually rested (kept typing → no credit).
      if (earned && onShortBreakComplete) onShortBreakComplete();
    }
  }

  // §5.1 二级: nap suggestion accepted → start the ritual + tuck.
  const onNapAccepted = () => {
    if (busy && onNapNow) onNapNow();
    send('reminder:tuck');
  };

  ipcMain.on('reminder:tucked', finish);
  ipcMain.on('reminder:nap-now', onNapAccepted);

  function runSession(level, energy) {
    const isNap = level === 'nap';

    send('reminder:show', {
      kind: level, // renderer blinks (short) or opens eyes (nap) on the shared capsule
      capsuleCss: energyToColor(energy).css,
      energy, // 0–100; the pulse (--energy) shows the honest 气色, ready to brighten
      text: isNap
        ? NAP_SUGGEST_PROMPTS[napIndex % NAP_SUGGEST_PROMPTS.length]
        : SHORT_BREAK_PROMPTS[shortIndex % SHORT_BREAK_PROMPTS.length],
      durationSec: Math.round(SHORT_BREAK_MS / 1000),
    });

    if (isNap) {
      // §5.1 二级: a clickable "小睡" suggestion that dwells then tucks (no credit).
      if (win && !win.isDestroyed()) win.setIgnoreMouseEvents(false);
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
        if (earned) {
          // 休息=回充: preview POST-credit 气色 (display-only; real credit fires once in finish(), §9.2 no double-credit).
          const base = typeof getEnergy === 'function' ? getEnergy() : energy;
          send('reminder:recharge', rechargePreview(base));
          timer = setTimeout(() => {
            timer = null;
            send('reminder:tuck');
          }, RECHARGE_HOLD_MS);
        } else {
          send('reminder:tuck'); // not rested → no charge, no charge animation (honest)
        }
      }
    }, 200);
  }

  function floatOut(level, fallbackEnergy) {
    // energy may drift during buffering → prefer a fresh read (§8.3).
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

      // §6.2 smart buffer: float on the next natural gap, or at the cap.
      cancelBuffer = bufferUntilGap(idleSec, () => floatOut(level, energy));
    },
    destroy() {
      if (timer) clearInterval(timer);
      if (cancelBuffer) cancelBuffer();
      ipcMain.removeListener('reminder:tucked', finish);
      ipcMain.removeListener('reminder:nap-now', onNapAccepted);
      if (win && !win.isDestroyed()) win.destroy();
      win = null;
    },
  };
}

module.exports = { createReminderController };
