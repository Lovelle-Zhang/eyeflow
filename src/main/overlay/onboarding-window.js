'use strict';

const path = require('node:path');
const { BrowserWindow, screen } = require('electron');

/**
 * The first-run onboarding window (CHARTER §7): a fullscreen, centered welcome
 * scene — the one-time 相遇仪式. Interactive (buttons / duration pick), so it is
 * focusable and does NOT ignore mouse events. Simple-fullscreen covers the
 * menubar/dock without switching macOS spaces.
 */
function createOnboardingWindow() {
  const { bounds } = screen.getPrimaryDisplay();
  const win = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    show: false,
    hasShadow: false,
    backgroundColor: '#0E1C20',
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
