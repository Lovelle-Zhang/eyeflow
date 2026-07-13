'use strict';

/**
 * Preload bridge — the single trusted channel between main and renderer.
 * Exposes identity metadata plus a narrow energy/IPC surface over a locked-down
 * contextBridge. The renderer stays a pure painter: it can listen for updates
 * and fire dev actions, nothing more.
 */

const { contextBridge, ipcRenderer } = require('electron');
const { APP_CONFIG } = require('../../config/app.config');

contextBridge.exposeInMainWorld('eyeflow', {
  productName: APP_CONFIG.productName,
  appId: APP_CONFIG.appId,

  // renderer → main
  ready: () => ipcRenderer.send('ui:ready'),
  dev: (action) => ipcRenderer.send('ui:dev', action),

  // main → renderer
  onInit: (cb) => ipcRenderer.on('energy:init', (_e, payload) => cb(payload)),
  onUpdate: (cb) => ipcRenderer.on('energy:update', (_e, payload) => cb(payload)),
});
