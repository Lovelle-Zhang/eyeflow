'use strict';

/**
 * Preload bridge for the fullscreen nap ritual. The renderer paints the calm
 * scene from main's start/frame/done, and reports cancel (Esc/click) or closed
 * (after the welcome-back) back to main.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nap', {
  onStart: (cb) => ipcRenderer.on('nap:start', (_e, payload) => cb(payload)),
  onFrame: (cb) => ipcRenderer.on('nap:frame', (_e, payload) => cb(payload)),
  onDone: (cb) => ipcRenderer.on('nap:done', (_e, payload) => cb(payload)),
  cancel: () => ipcRenderer.send('nap:cancel'),
  closed: () => ipcRenderer.send('nap:closed'),
});
