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
    const service = startEnergyService({
      napMs: saved.napMs, // §6.4 duration setting persists
      persistNapMs: (ms) => settings.save({ napMs: ms }),
      reminderTier: saved.reminderTier, // §6.4 presentation tier persists
      persistTier: (tier) => settings.save({ reminderTier: tier }),
    });
    menubar = createMenubar(service);
    app.on('before-quit', () => service.flush()); // persist today's ledger (§7)

    // First run: the one-time onboarding 相遇仪式 (§7). Never shown again.
    if (!saved.onboardingDone) {
      service.setOnboardingActive(true); // no reminders during the ritual (#4)
      runOnboarding({
        onDone: (napMs) => {
          service.setOnboardingActive(false);
          settings.save({ onboardingDone: true, napMs });
          service.setDuration(napMs);
          menubar.showPanel(); // "我就在上面陪着你" → land on the panel
        },
      });
    }
  });

  // Menubar app: stay alive with no windows open (the tray keeps it running).
  app.on('window-all-closed', () => {});
}
