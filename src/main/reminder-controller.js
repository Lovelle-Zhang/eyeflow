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
const { earnedShortBreak } = require('../view/reminder/gating');
const { SHORT_BREAK_PROMPTS } = require('../view/reminder/copy');

function createReminderController({ getIdleSec, onShortBreakComplete } = {}) {
  const idleSec = typeof getIdleSec === 'function' ? getIdleSec : () => 0;
  let win = null;
  let busy = false;
  let timer = null;
  let promptIndex = 0;
  let earned = false; // D2: was this break actually rested?

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

  function runCountdown(energy) {
    send('reminder:show', {
      capsuleCss: energyToColor(energy).css,
      mira: miraSvg({ variant: 'full', eyes: 'closed' }), // 短歇 = 眨一次长眼 (§6.3)
      text: SHORT_BREAK_PROMPTS[promptIndex % SHORT_BREAK_PROMPTS.length],
      durationSec: Math.round(SHORT_BREAK_MS / 1000),
    });
    promptIndex += 1;

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

  return {
    /** Float out a short break for the given current energy (§6.1). */
    trigger({ energy }) {
      if (busy) return; // one session at a time; ignore re-entrant reminders
      busy = true;
      earned = false;
      if (!win || win.isDestroyed()) win = createReminderWindow();
      win.showInactive();
      if (win.webContents.isLoading()) {
        win.webContents.once('did-finish-load', () => runCountdown(energy));
      } else {
        runCountdown(energy);
      }
    },
    destroy() {
      if (timer) clearInterval(timer);
      ipcMain.removeListener('reminder:tucked', finish);
      if (win && !win.isDestroyed()) win.destroy();
      win = null;
    },
  };
}

module.exports = { createReminderController };
