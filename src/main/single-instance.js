'use strict';

/**
 * Single-instance handling.
 *
 * Electron's single-instance lock is scoped by the app's userData path, which
 * we have already isolated (see paths.js). That means this app's lock can
 * never contend with the legacy app's lock — the two can run simultaneously.
 *
 * @param {import('electron').App} app
 * @param {() => void} onSecondInstance - called (in the primary process) when a
 *   second instance of THIS app is launched; use it to focus the window.
 * @returns {boolean} true if this is the primary instance and should continue,
 *   false if another instance of this app already holds the lock.
 */
function ensureSingleInstance(app, onSecondInstance) {
  const gotLock = app.requestSingleInstanceLock();

  if (!gotLock) {
    return false;
  }

  app.on('second-instance', () => {
    if (typeof onSecondInstance === 'function') {
      onSecondInstance();
    }
  });

  return true;
}

module.exports = { ensureSingleInstance };
