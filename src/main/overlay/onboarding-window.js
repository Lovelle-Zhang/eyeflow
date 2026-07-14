'use strict';

const path = require('node:path');
const { BrowserWindow, screen } = require('electron');

/**
 * The first-run onboarding window (CHARTER §7): an INDEPENDENT, CENTERED welcome
 * scene — the one-time 相遇仪式 — NOT a fullscreen takeover (that's the §6.3 nap).
 * A transparent, centered window so the frosted glass card floats over the
 * desktop. Interactive (buttons / duration pick), so it stays focusable.
 */
const OB_SIZE = { width: 820, height: 520 }; // landscape — the page itself is a big capsule

function createOnboardingWindow() {
  const { workArea } = screen.getPrimaryDisplay();
  const win = new BrowserWindow({
    width: OB_SIZE.width,
    height: OB_SIZE.height,
    x: Math.round(workArea.x + (workArea.width - OB_SIZE.width) / 2),
    y: Math.round(workArea.y + (workArea.height - OB_SIZE.height) / 2),
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    show: false,
    hasShadow: false,
    alwaysOnTop: true,
    fullscreenable: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: path.join(__dirname, '..', '..', 'preload', 'onboarding.js'),
    },
  });

  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.loadFile(path.join(__dirname, '..', '..', 'renderer', 'onboarding', 'index.html'));
  return win;
}

module.exports = { createOnboardingWindow };
