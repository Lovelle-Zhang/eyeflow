'use strict';

const path = require('node:path');
const { BrowserWindow } = require('electron');
const { APP_CONFIG } = require('../../config/app.config');

/** @type {import('electron').BrowserWindow | null} */
let mainWindow = null;

/**
 * Create the (single) main window and load the empty shell renderer.
 * @returns {import('electron').BrowserWindow}
 */
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: APP_CONFIG.window.width,
    height: APP_CONFIG.window.height,
    minWidth: APP_CONFIG.window.minWidth,
    minHeight: APP_CONFIG.window.minHeight,
    title: APP_CONFIG.productName,
    show: false,
    webPreferences: {
      // Security defaults: isolated context, no node in the renderer, a narrow
      // preload bridge. sandbox is off so the trusted preload can require our
      // local config/IPC modules; contextIsolation remains the key protection
      // and the renderer only ever loads our own local content.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
    },
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

/** Focus/restore the existing window (used for second-instance handling). */
function focusMainWindow() {
  if (!mainWindow) {
    return;
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.focus();
}

function getMainWindow() {
  return mainWindow;
}

module.exports = { createMainWindow, focusMainWindow, getMainWindow };
