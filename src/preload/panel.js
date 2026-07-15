'use strict';

/**
 * Preload bridge for the menubar panel. The panel is a pure painter: it receives
 * init (constant assets) + data (live energy/records) and reports user actions.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('panel', {
  ready: () => ipcRenderer.send('panel:ready'),
  act: (kind) => ipcRenderer.send('panel:act', kind), // 'short' | 'nap'
  setDuration: (ms) => ipcRenderer.send('panel:set-duration', ms),
  resize: (height) => ipcRenderer.send('panel:resize', height),
  quit: () => ipcRenderer.send('panel:quit'),

  onInit: (cb) => ipcRenderer.on('panel:init', (_e, payload) => cb(payload)),
  onData: (cb) => ipcRenderer.on('panel:data', (_e, payload) => cb(payload)),
});
