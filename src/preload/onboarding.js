'use strict';

/**
 * Preload bridge for the onboarding scene. The renderer runs the scripted
 * sequence itself and reports done (with the chosen nap duration) at the end.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('onboarding', {
  ready: () => ipcRenderer.send('onboarding:ready'),
  onInit: (cb) => ipcRenderer.on('onboarding:init', (_e, payload) => cb(payload)),
  done: (napMs) => ipcRenderer.send('onboarding:done', napMs),
});
