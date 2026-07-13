'use strict';

/**
 * App lifecycle wiring, kept separate from window/paths so the entry point
 * stays a thin composition root.
 *
 * @param {import('electron').App} app
 * @param {() => void} createWindow
 */
function registerLifecycle(app, createWindow) {
  app.whenReady().then(() => {
    createWindow();

    // macOS: re-create a window when the dock icon is clicked and none are open.
    app.on('activate', () => {
      const { BrowserWindow } = require('electron');
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  // Quit when all windows are closed, except on macOS where apps typically
  // stay active until the user quits explicitly.
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

module.exports = { registerLifecycle };
