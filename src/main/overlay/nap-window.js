'use strict';

const path = require('node:path');
const { BrowserWindow, screen } = require('electron');

/**
 * The fullscreen nap window (CHARTER §6.3): a full-screen takeover for the
 * complete rest — "接管屏幕、真正离开". Opaque, always-on-top, focusable (so Esc
 * can end it early). Uses simple-fullscreen to cover the menubar/dock without
 * switching macOS spaces.
 */
function createNapWindow() {
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
    backgroundColor: '#0E1C20', // opaque takeover (deep Mira dark, §8.5)
    alwaysOnTop: true,
    fullscreenable: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: path.join(__dirname, '..', '..', 'preload', 'nap.js'),
    },
  });

  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.loadFile(path.join(__dirname, '..', '..', 'renderer', 'nap', 'index.html'));
  return win;
}

module.exports = { createNapWindow };
