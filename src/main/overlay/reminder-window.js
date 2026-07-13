'use strict';

const path = require('node:path');
const { BrowserWindow, screen } = require('electron');

/**
 * The top reminder overlay window (CHARTER §6.1): a frameless, transparent,
 * always-on-top panel pinned to the top-center of the screen. Click-through and
 * non-focusable so it never takes over the screen — "不接管屏幕、可无视".
 */
function createReminderWindow() {
  const win = new BrowserWindow({
    width: 460,
    height: 170,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    focusable: false, // never steal focus
    skipTaskbar: true,
    hasShadow: false, // the capsule draws its own shadow (§8.4)
    show: false,
    alwaysOnTop: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: path.join(__dirname, '..', '..', 'preload', 'reminder.js'),
    },
  });

  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setIgnoreMouseEvents(true); // clicks pass through to whatever is below

  const { workArea } = screen.getPrimaryDisplay();
  const [w] = win.getSize();
  win.setPosition(Math.round(workArea.x + (workArea.width - w) / 2), workArea.y + 6);

  win.loadFile(path.join(__dirname, '..', '..', 'renderer', 'reminder', 'index.html'));
  return win;
}

module.exports = { createReminderWindow };
