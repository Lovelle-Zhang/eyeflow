'use strict';

const path = require('node:path');
const { BrowserWindow, screen } = require('electron');

/**
 * The 加强档 reminder window (CHARTER §6.1/§6.3): a FULLSCREEN, transparent,
 * click-through overlay that lays a faint warm wash over the screen with a big
 * centered capsule — more prominent than the top island, but still "不接管":
 * clicks pass through the wash. Interactivity for the 小睡 button is toggled
 * per-region via reminder:hover (see the presenter), which is why we start
 * click-through with `forward: true` so the renderer still gets mousemove.
 *
 * Same reminder:* IPC protocol as the island, so it reuses the reminder preload.
 */
function createReminderStrongWindow() {
  const { bounds } = screen.getPrimaryDisplay(); // cover the whole display, menubar included
  const win = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    focusable: false, // never steal focus
    skipTaskbar: true,
    hasShadow: false,
    show: false,
    alwaysOnTop: true,
    fullscreenable: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: path.join(__dirname, '..', '..', 'preload', 'reminder.js'),
    },
  });

  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setIgnoreMouseEvents(true, { forward: true }); // click-through; forward → renderer still sees hover

  win.loadFile(path.join(__dirname, '..', '..', 'renderer', 'reminder-strong', 'index.html'));
  return win;
}

module.exports = { createReminderStrongWindow };
