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

function runOnboarding({ onDone } = {}) {
  const win = createOnboardingWindow();
  win.show();

  const napOptions = NAP_DURATION_OPTIONS_MS.map((ms) => ({
    ms,
    label: `${Math.round(ms / 60000)} 分钟`,
  }));

  const onReady = (e) =>
    e.sender.send('onboarding:init', {
      miraOpen: miraSvg({ variant: 'full', eyes: 'open' }),
      miraClosed: miraSvg({ variant: 'full', eyes: 'closed' }),
      napOptions,
      defaultNapMs: DEFAULT_NAP_MS,
    });

  ipcMain.on('onboarding:ready', onReady);
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
