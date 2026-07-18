'use strict';

const path = require('node:path');
const { BrowserWindow, screen } = require('electron');

/**
 * The nap window (CHARTER §6.3): a full-screen but TRANSPARENT overlay for the
 * complete rest — 边缘柔和雾化 + 柔性阻挡. The renderer draws a deep-green mist that
 * thickens at the edges and stays clear in the center (§6.3 "把世界柔柔推远"),
 * NOT an opaque takeover. Full display bounds + screen-saver level covers the
 * menubar/dock; focusable + captures clicks so Esc/click ends the rest early.
 */
function createNapWindow() {
  const { bounds } = screen.getPrimaryDisplay();
  const win = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    frame: false,
    transparent: true, // clear center — the mist is CSS, the world shows through
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
      preload: path.join(__dirname, '..', '..', 'preload', 'nap.js'),
    },
  });

  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.loadFile(path.join(__dirname, '..', '..', 'renderer', 'nap', 'index.html'));
  return win;
}

module.exports = { createNapWindow };
