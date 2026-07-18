'use strict';

/**
 * Onboarding controller (CHARTER §7): shows the one-time fullscreen 相遇仪式 and,
 * when the scene finishes, reports the chosen nap duration back. The scripted
 * sequence itself lives in the renderer; main only supplies assets and closes.
 */

const { ipcMain } = require('electron');
const { createOnboardingWindow } = require('./overlay/onboarding-window');
const { miraSvg } = require('../view/mira/mira-svg');
const { NAP_DURATION_OPTIONS_MS, DEFAULT_NAP_MS } = require('../view/nap/nap');
const { panelStrings } = require('../view/i18n/panel-strings');

function runOnboarding({ onDone, locale } = {}) {
  const napOptions = NAP_DURATION_OPTIONS_MS.map((ms) => ({
    ms,
    label: panelStrings(locale).napOpt(Math.round(ms / 60000)), // §4 localized
  }));

  // Register the handshake listener BEFORE the window loads: the renderer fires
  // 'onboarding:ready' the moment its script runs, and an ipcRenderer.send with
  // no listener yet is dropped — losing the init reply leaves the card stuck at
  // opacity:0 (invisible). Wiring the listener first closes that race.
  const onReady = (e) =>
    e.sender.send('onboarding:init', {
      miraOpen: miraSvg({ variant: 'full', eyes: 'open' }),
      miraClosed: miraSvg({ variant: 'full', eyes: 'closed' }),
      napOptions,
      defaultNapMs: DEFAULT_NAP_MS,
      locale, // §4 台词 language (first-run: follows the system)
    });
  ipcMain.on('onboarding:ready', onReady);

  const win = createOnboardingWindow();
  win.show();

  ipcMain.once('onboarding:done', (_e, napMs) => {
    ipcMain.removeListener('onboarding:ready', onReady);
    if (!win.isDestroyed()) {
      win.close();
    }
    if (onDone) onDone(napMs);
  });

  return win;
}

module.exports = { runOnboarding };
