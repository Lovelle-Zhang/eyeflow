'use strict';

const path = require('node:path');
const { BrowserWindow } = require('electron');

/**
 * The menubar popover window (CHARTER §4): a small frameless, transparent panel
 * shown under the tray icon and hidden when it loses focus — the standard
 * menubar-popover behavior. Sized to its content by the renderer (panel:resize).
 */
function createPanelWindow() {
  const win = new BrowserWindow({
    width: 380,
    height: 420,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    show: false,
    hasShadow: false,
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
