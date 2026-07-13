'use strict';

const path = require('node:path');
const { APP_CONFIG } = require('../../config/app.config');

/**
 * Data isolation.
 *
 * Forces this app's identity and user-data directory to values that are
 * guaranteed distinct from the legacy app. Electron derives `userData` from
 * the app name, but we set it explicitly so nothing ever reads or writes the
 * legacy leveldb / data under "eyeflow", "eyeflow-mira" or "Codex".
 *
 * Must run BEFORE the app `ready` event.
 *
 * @param {import('electron').App} app
 * @returns {string} the resolved, isolated userData path
 */
function configureIsolatedPaths(app) {
  app.setName(APP_CONFIG.productName);

  const appDataRoot = app.getPath('appData');
  const userDataPath = path.join(appDataRoot, APP_CONFIG.userDataDirName);

  app.setPath('userData', userDataPath);

  return userDataPath;
}

module.exports = { configureIsolatedPaths };
