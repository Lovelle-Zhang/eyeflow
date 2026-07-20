'use strict';

/**
 * Auto-update (§8.5) — quiet by design; Mira never nags. electron-updater checks
 * GitHub Releases (Lovelle-Zhang/eyeflow), downloads a newer signed build in the
 * background, and lets it install on the next quit (autoInstallOnAppQuit). No
 * prompts, no dialogs, no error popups: a new version just quietly arrives.
 *
 * Runs ONLY in the packaged, signed app — Squirrel.Mac refuses unsigned builds,
 * and dev has no update feed. Any failure (offline, module missing, bad feed) is
 * swallowed so a flaky network never disturbs a calm menubar utility.
 */

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // re-check every 6h while running

/**
 * @param {{ isPackaged: boolean, logger?: object }} opts
 * @returns {{ stop: () => void }}
 */
function startAutoUpdate({ isPackaged, logger } = {}) {
  if (!isPackaged) return { stop() {} }; // Squirrel needs a signed packaged app

  let autoUpdater;
  try {
    ({ autoUpdater } = require('electron-updater'));
  } catch {
    return { stop() {} }; // not packed (e.g. pruned) → auto-update just off, no crash
  }

  autoUpdater.autoDownload = true; // silent background download when one is found
  autoUpdater.autoInstallOnAppQuit = true; // apply on the next quit — never interrupt
  if (logger) autoUpdater.logger = logger;
  autoUpdater.on('error', () => {}); // stay silent; no error dialogs (§8.5 calm)

  const check = () => {
    autoUpdater.checkForUpdates().catch(() => {}); // offline / rate-limited → ignore
  };

  check();
  const timer = setInterval(check, CHECK_INTERVAL_MS);
  timer.unref?.(); // don't keep the app alive just to poll

  return {
    stop() {
      clearInterval(timer);
    },
  };
}

module.exports = { startAutoUpdate };
