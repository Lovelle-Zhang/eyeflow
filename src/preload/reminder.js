'use strict';

/**
 * Preload bridge for the reminder overlay. The overlay renderer is a pure
 * painter: it receives show/frame/tuck from main and reports back when it has
 * finished tucking away.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('reminder', {
  onShow: (cb) => ipcRenderer.on('reminder:show', (_e, payload) => cb(payload)),
  onFrame: (cb) => ipcRenderer.on('reminder:frame', (_e, payload) => cb(payload)),
  onTuck: (cb) => ipcRenderer.on('reminder:tuck', () => cb()),
  tucked: () => ipcRenderer.send('reminder:tucked'),
  napNow: () => ipcRenderer.send('reminder:nap-now'),
});
