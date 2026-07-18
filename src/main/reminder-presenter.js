'use strict';

/**
 * Reminder presenter (CHARTER §6.1/§6.4) — owns the overlay window and picks its
 * form by the user's tier: 'light' → top island, 'strong' → fullscreen centered
 * big capsule + faint warm wash. Both windows speak the SAME reminder:* protocol,
 * so the controller's session logic never cares which one is on screen.
 *
 * Split out of the controller for the §9.1 line budget; this is the home for all
 * window lifecycle + the strong window's per-region click-through toggle.
 */

const { ipcMain } = require('electron');
const { createReminderWindow } = require('./overlay/reminder-window');
const { createReminderStrongWindow } = require('./overlay/reminder-strong-window');

function createReminderPresenter({ getReminderTier } = {}) {
  const tierOf = () => (typeof getReminderTier === 'function' && getReminderTier() === 'strong' ? 'strong' : 'light');
  let win = null;
  let winTier = null; // which tier the current window was built for

  // Strong window is click-through; its renderer reports when the cursor is over
  // the capsule so clicks can land on the 小睡 button (§6.1 "点穿除按钮").
  const onHover = (_e, over) => {
    if (win && !win.isDestroyed() && winTier === 'strong') {
      win.setIgnoreMouseEvents(!over, { forward: true });
    }
  };
  ipcMain.on('reminder:hover', onHover);

  function ensureWindow() {
    const tier = tierOf();
    if (win && !win.isDestroyed() && winTier === tier) return;
    if (win && !win.isDestroyed()) win.destroy(); // tier changed → rebuild
    win = tier === 'strong' ? createReminderStrongWindow() : createReminderWindow();
    winTier = tier;
  }

  return {
    /** Ensure the tier-appropriate window exists and float it out (non-focusing). */
    show() {
      ensureWindow();
      win.showInactive();
    },
    /** Run cb once the window's content is loaded (immediately if already loaded). */
    whenReady(cb) {
      if (!win) return;
      if (win.webContents.isLoading()) win.webContents.once('did-finish-load', cb);
      else cb();
    },
    send(channel, payload) {
      if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
    },
    /**
     * Let clicks land on the capsule (the nap suggestion needs its button). The
     * island toggles the whole small window; the strong window stays click-through
     * and instead lets its renderer hover-toggle per-region (see onHover).
     */
    setInteractive(on) {
      if (win && !win.isDestroyed() && winTier === 'light') win.setIgnoreMouseEvents(!on);
    },
    hide() {
      if (win && !win.isDestroyed()) {
        // back to click-through for the next float (strong keeps hover-forwarding)
        if (winTier === 'strong') win.setIgnoreMouseEvents(true, { forward: true });
        else win.setIgnoreMouseEvents(true);
        win.hide();
      }
    },
    destroy() {
      ipcMain.removeListener('reminder:hover', onHover);
      if (win && !win.isDestroyed()) win.destroy();
      win = null;
      winTier = null;
    },
  };
}

module.exports = { createReminderPresenter };
