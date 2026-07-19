'use strict';

/**
 * EyeFlow Next — main process entry point.
 *
 * Thin composition root. A menubar-only app (§2/§4): no main window — a tray
 * icon plus a popover panel. Wires isolation → single-instance → energy service
 * → menubar. No feature logic lives here.
 */

const { app } = require('electron');

const { configureIsolatedPaths } = require('./paths');
const { ensureSingleInstance } = require('./single-instance');
const { startEnergyService } = require('./energy-service');
const { createMenubar } = require('./menubar');
const { createSettingsStore } = require('./settings-store');
const { runOnboarding } = require('./onboarding-controller');
const { startAutoUpdate } = require('./updater');

// 1. Isolate identity + user-data before anything touches disk.
const userDataPath = configureIsolatedPaths(app);
// eslint-disable-next-line no-console
console.log(`[EyeFlow Next] isolated userData: ${userDataPath}`);

let menubar = null;

// 2. Single-instance lock (isolated). A second launch opens the panel.
const isPrimary = ensureSingleInstance(app, () => menubar && menubar.showPanel());
if (!isPrimary) {
  app.quit();
} else {
  app.whenReady().then(() => {
    if (app.dock) app.dock.hide(); // menubar app: no dock icon
    const settings = createSettingsStore();
    const saved = settings.load();
    // Menubar utility: come back after login. On by default (§7), user-toggleable
    // in the panel. Only the packaged app registers a login item — never dev electron.
    const applyLoginItem = (on) => {
      if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: on });
    };
    applyLoginItem(saved.openAtLogin);
    const service = startEnergyService({
      napMs: saved.napMs, // §6.4 duration setting persists
      persistNapMs: (ms) => settings.save({ napMs: ms }),
      reminderTier: saved.reminderTier, // §6.4 presentation tier persists
      persistTier: (tier) => settings.save({ reminderTier: tier }),
      locale: saved.locale, // §4 UI language persists
      persistLocale: (locale) => settings.save({ locale }),
      openAtLogin: saved.openAtLogin, // §7 launch-at-login persists
      persistOpenAtLogin: (on) => settings.save({ openAtLogin: on }),
      applyLoginItem,
    });
    menubar = createMenubar(service, { replayOnboarding: launchOnboarding });
    app.on('before-quit', () => service.flush()); // persist today's ledger (§7)

    // Quiet auto-update (§8.5): packaged app only, silent, installs on next quit.
    startAutoUpdate({ isPackaged: app.isPackaged });

    // The 相遇仪式 (§7): auto on first run, and re-playable from the dev tray menu
    // (handy for eyeballing the localized 台词). Uses the current UI language.
    function launchOnboarding() {
      service.setOnboardingActive(true); // no reminders during the ritual (#4)
      runOnboarding({
        locale: service.getLocale(), // §4 台词 follow the current language
        onDone: (napMs) => {
          service.setOnboardingActive(false);
          settings.save({ onboardingDone: true, napMs });
          service.setDuration(napMs);
          menubar.showPanel(); // "我就在上面陪着你" → land on the panel
        },
      });
    }

    if (!saved.onboardingDone) launchOnboarding(); // first run only
  });

  // Menubar app: stay alive with no windows open (the tray keeps it running).
  app.on('window-all-closed', () => {});
}
