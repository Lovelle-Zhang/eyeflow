'use strict';

/**
 * Nap controller (CHARTER §6.3): runs the fullscreen rest ritual. Counts down
 * the chosen duration while Mira breathes deep-closed; on completion the engine
 * refills to full (§5.4.3) and a brief "欢迎回来" plays. Esc/click cancels early
 * with no credit (you didn't complete the rest). One ritual at a time.
 */

const { ipcMain } = require('electron');
const { createNapWindow } = require('./overlay/nap-window');
const { miraSvg } = require('../view/mira/mira-svg');
const { shortBreakFrame } = require('../view/reminder/short-break');
const { formatClock, DEFAULT_NAP_MS } = require('../view/nap/nap');

function createNapController({ onNapComplete } = {}) {
  let win = null;
  let timer = null;
  let busy = false;

  const send = (channel, payload) => {
    if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
  };

  function close() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    busy = false;
    if (win && !win.isDestroyed()) {
      win.setSimpleFullScreen(false);
      win.close();
    }
    win = null;
  }

  const onCancel = () => {
    if (busy) close();
  }; // Esc/click → bail, no credit
  const onClosed = () => close(); // after the welcome-back
  ipcMain.on('nap:cancel', onCancel);
  ipcMain.on('nap:closed', onClosed);

  function run(durationMs) {
    send('nap:start', {
      mira: miraSvg({ variant: 'full', eyes: 'closed' }), // 深闭眼 (§6.3)
      durationSec: Math.round(durationMs / 1000),
    });

    const start = process.hrtime.bigint();
    timer = setInterval(() => {
      const elapsed = Number(process.hrtime.bigint() - start) / 1e6;
      const f = shortBreakFrame(elapsed, durationMs);
      send('nap:frame', { clock: formatClock(f.remainingSec), fraction: f.elapsedFraction });
      if (f.done) {
        clearInterval(timer);
        timer = null;
        if (onNapComplete) onNapComplete(); // 回满 (§5.4.3)
        send('nap:done', { mira: miraSvg({ variant: 'full', eyes: 'open' }) });
      }
    }, 250);
  }

  return {
    /** Begin the fullscreen nap for the chosen duration (§6.3/§6.4). */
    start(durationMs = DEFAULT_NAP_MS) {
      if (busy) return;
      busy = true;
      if (!win || win.isDestroyed()) win = createNapWindow();
      win.setSimpleFullScreen(true);
      win.show();
      if (win.webContents.isLoading()) {
        win.webContents.once('did-finish-load', () => run(durationMs));
      } else {
        run(durationMs);
      }
    },
    destroy() {
      if (timer) clearInterval(timer);
      ipcMain.removeListener('nap:cancel', onCancel);
      ipcMain.removeListener('nap:closed', onClosed);
      if (win && !win.isDestroyed()) win.destroy();
      win = null;
    },
  };
}

module.exports = { createNapController };
