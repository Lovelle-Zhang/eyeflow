'use strict';

const path = require('node:path');
const { BrowserWindow } = require('electron');

/**
 * The menubar popover window (CHARTER §4 / Apple HIG §8.1): a frameless panel on
 * the native macOS popover MATERIAL (vibrancy) with rounded corners + the system
 * shadow — so it reads as a real menubar popover, not a custom card. Dismisses on
 * blur; sized to its content by the renderer (panel:resize).
 */
function createPanelWindow() {
  const win = new BrowserWindow({
    width: 360,
    height: 420,
    frame: false,
    transparent: true,
    vibrancy: 'popover', // native NSVisualEffectView popover material (adapts light/dark)
    visualEffectState: 'active',
    roundedCorners: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    show: false,
    hasShadow: true,
    fullscreenable: false,
    alwaysOnTop: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: path.join(__dirname, '..', '..', 'preload', 'panel.js'),
    },
  });

  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.loadFile(path.join(__dirname, '..', '..', 'renderer', 'panel', 'index.html'));

  // Popover behavior: dismiss on blur (unless devtools has focus).
  win.on('blur', () => {
    if (!win.webContents.isDevToolsFocused()) win.hide();
  });

  return win;
}

module.exports = { createPanelWindow };
