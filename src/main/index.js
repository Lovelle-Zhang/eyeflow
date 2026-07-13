'use strict';

/**
 * EyeFlow Next — main process entry point.
 *
 * Thin composition root ONLY. No feature logic lives here — it wires together
 * focused modules. This is a deliberate guard against the monolith files that
 * plagued the legacy project: every concern gets its own module from day one.
 */

const { app } = require('electron');

const { configureIsolatedPaths } = require('./paths');
const { ensureSingleInstance } = require('./single-instance');
const { createMainWindow, focusMainWindow } = require('./window');
const { registerLifecycle } = require('./lifecycle');

// 1. Isolate identity + user-data BEFORE anything else touches disk.
const userDataPath = configureIsolatedPaths(app);
// eslint-disable-next-line no-console
console.log(`[EyeFlow Next] isolated userData: ${userDataPath}`);

// 2. Acquire the (isolated) single-instance lock. If a second copy of THIS app
//    launches, focus the existing window instead of starting over.
const isPrimary = ensureSingleInstance(app, focusMainWindow);
if (!isPrimary) {
  app.quit();
} else {
  // 3. Wire lifecycle → window creation.
  registerLifecycle(app, createMainWindow);
}
