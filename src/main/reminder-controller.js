'use strict';

/**
 * Reminder controller (CHARTER §6.1): float the top capsule out, run the 20s
 * eye-rest (L1) or the nap suggestion (L2), then tuck away. One session at a
 * time. Owns the impure IPC + overlay window + busy lifecycle; the per-session
 * choreography (timer, prompts, D2 rest sample) lives in reminder-session.js.
 */

const { ipcMain } = require('electron');
const { createReminderPresenter } = require('./reminder-presenter');
const { createReminderSession } = require('./reminder-session');
const { bufferUntilGap } = require('./reminder-buffer');

// After we ask the renderer to tuck away we expect a `reminder:tucked` back (just
// the ~360ms tuck animation, §8.4). If it never arrives (renderer crash / dropped
// IPC), this watchdog force-finishes so `busy` can't wedge and silently swallow
// every future reminder + drop an earned rest.
const TUCK_WATCHDOG_MS = 2500;

function createReminderController({
  getIdleSec,
  getEnergy,
  getReminderTier,
  getLocale,
  onShortBreakComplete,
  onNapNow,
} = {}) {
  const idleSec = typeof getIdleSec === 'function' ? getIdleSec : () => 0;
  const presenter = createReminderPresenter({ getReminderTier }); // §6.4 island vs strong window
  let busy = false;
  let cancelBuffer = null;
  let watchdog = null;

  const send = (channel, payload) => presenter.send(channel, payload);

  function clearWatchdog() {
    if (watchdog) {
      clearTimeout(watchdog);
      watchdog = null;
    }
  }

  function finish() {
    clearWatchdog();
    session.stop();
    presenter.hide();
    if (busy) {
      busy = false;
      // D2: credit the recharge only if actually rested (kept typing → no credit).
      if (session.earned && onShortBreakComplete) onShortBreakComplete();
    }
  }

  // Ask the renderer to tuck, then arm the watchdog in case `tucked` never returns.
  function tuck() {
    send('reminder:tuck');
    clearWatchdog();
    watchdog = setTimeout(finish, TUCK_WATCHDOG_MS);
  }

  const session = createReminderSession({ send, presenter, getEnergy, idleSec, getLocale, tuck });

  // §5.1 二级: nap suggestion accepted → start the ritual + tuck.
  const onNapAccepted = () => {
    if (busy && onNapNow) onNapNow();
    tuck();
  };

  ipcMain.on('reminder:tucked', finish);
  ipcMain.on('reminder:nap-now', onNapAccepted);

  function floatOut(level, fallbackEnergy) {
    // energy may drift during buffering → prefer a fresh read (§8.3).
    const energy = typeof getEnergy === 'function' ? getEnergy() : fallbackEnergy;
    presenter.show(); // ensure the tier-appropriate window (island / strong) + float it out
    presenter.whenReady(() => session.run(level, energy));
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
      session.reset(); // D2: fresh earned flag for this session

      if (immediate) {
        floatOut(level, energy);
        return;
      }

      // §6.2 smart buffer: float on the next natural gap, or at the cap.
      cancelBuffer = bufferUntilGap(idleSec, () => floatOut(level, energy));
    },
    destroy() {
      clearWatchdog();
      session.stop();
      if (cancelBuffer) cancelBuffer();
      ipcMain.removeListener('reminder:tucked', finish);
      ipcMain.removeListener('reminder:nap-now', onNapAccepted);
      presenter.destroy();
    },
  };
}

module.exports = { createReminderController };
