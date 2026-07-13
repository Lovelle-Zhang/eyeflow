'use strict';

/**
 * Preload bridge.
 *
 * Intentionally minimal for the skeleton: it exposes only static identity
 * metadata to the renderer over a locked-down contextBridge. No IPC, no
 * privileged APIs — those get added deliberately, per feature, later.
 */

const { contextBridge } = require('electron');
const { APP_CONFIG } = require('../../config/app.config');

contextBridge.exposeInMainWorld('eyeflow', {
  productName: APP_CONFIG.productName,
  appId: APP_CONFIG.appId,
});
