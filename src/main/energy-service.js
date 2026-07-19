'use strict';

/**
 * Energy service — the windowless core (§9.4 composition). Owns the driver
 * (engine), the reminder + nap controllers, the "today" ledger, the nap-duration
 * setting, and the tick loop. Publishes a panel-ready payload to subscribers;
 * the menubar wires the UI. Pure engine/view/records functions stay separate.
 */

const { DEFAULT_PARAMS } = require('../engine/energy');
const { createEnergyDriver } = require('./driver/energy-driver');
const { startEnergyLoop } = require('./energy-loop');
const { getIdleSec } = require('./driver/system-idle');
const { createReminderController } = require('./reminder-controller');
const { createNapController } = require('./nap-controller');
const { createRecordsStore } = require('./records-store');
const { createEnergyStore } = require('./energy-store');
const { buildPanelPayload } = require('./energy-presenter');
const { createServiceApi } = require('./energy-service-api');
const { dayKey, recordTick, recordRest } = require('../records/today');
const { DEFAULT_NAP_MS } = require('../view/nap/nap');
const { DEFAULT_REMINDER_TIER } = require('../view/reminder/tier');
const { DEFAULT_LOCALE } = require('../view/i18n/panel-strings');

function startEnergyService({
  intervalMs = 1000,
  napMs: initialNapMs = DEFAULT_NAP_MS,
  persistNapMs,
  reminderTier: initialTier = DEFAULT_REMINDER_TIER,
  persistTier,
  locale: initialLocale = DEFAULT_LOCALE,
  persistLocale,
  openAtLogin: initialOpenAtLogin = true,
  persistOpenAtLogin,
  applyLoginItem, // impure: register/unregister the OS login item (main-only)
} = {}) {
  const store = createRecordsStore();
  let record = store.load(); // resume today, or start fresh (§7)
  const energyStore = createEnergyStore();
  const savedEnergy = energyStore.load(); // resume energy across restart (#2)
  // Shared mutable settings/flags: the API facade writes these, the service body
  // below reads them — same object, so both stay in sync (§6.4 / #4).
  const state = {
    napMs: initialNapMs,
    reminderTier: initialTier, // §6.1/§6.4 presentation tier (light / strong)
    locale: initialLocale, // §4 panel UI language (zh / en)
    openAtLogin: initialOpenAtLogin, // §7 come back after login (user-toggleable)
    onboardingActive: false, // suppress reminders during the intro ritual (#4)
  };
  const subscribers = new Set();

  const napController = createNapController({
    getEnergy: () => driver.state.energy, // animate the charge-up (气色 brightening) during the nap
    getReminderTier: () => state.reminderTier, // §6.4 加强档 → bigger nap capsule
    getLocale: () => state.locale, // §4 localized nap copy
    onNapComplete: () => {
      driver.nap();
      record = recordRest(record, 'nap');
      store.save(record);
      push();
    },
  });

  let controller;
  const driver = createEnergyDriver({
    getIdleSec,
    resume: savedEnergy
      ? { energy: savedEnergy.energy, l1Armed: savedEnergy.l1Armed, l2Armed: savedEnergy.l2Armed }
      : undefined,
    onUpdate: ({ energy, events }) => {
      // Not during a nap ritual or onboarding — don't stack rituals (#4).
      if (controller && !napController.isBusy() && !state.onboardingActive) {
        if (events.includes('remind_nap')) controller.trigger({ level: 'nap' });
        else if (events.includes('remind_short')) controller.trigger({ level: 'short', energy });
      }
      push();
    },
  });

  controller = createReminderController({
    getIdleSec,
    getEnergy: () => driver.state.energy,
    getReminderTier: () => state.reminderTier, // §6.4 island vs strong presentation
    getLocale: () => state.locale, // §4 localized reminder prompt + nap button
    onShortBreakComplete: () => {
      driver.shortBreak();
      record = recordRest(record, 'short'); // D2: only genuine rests reach here
      store.save(record);
      push();
    },
    onNapNow: () => napController.start(state.napMs), // §5.1 二级建议被接受 → 小睡 (#3)
  });

  // Offline resume (#2): credit the time the app was closed as away → recharge.
  if (savedEnergy) {
    driver.applyAway(Date.now() - savedEnergy.savedAt);
  }

  function push() {
    const p = buildPanelPayload({
      energy: driver.state.energy,
      record,
      napMs: state.napMs,
      reminderTier: state.reminderTier,
      locale: state.locale,
      openAtLogin: state.openAtLogin,
    });
    for (const fn of subscribers) fn(p);
  }

  const loop = startEnergyLoop({
    intervalMs,
    onTick: (dtMs) => {
      const active = getIdleSec() < DEFAULT_PARAMS.idleGraceSec;
      record = recordTick(record, { dtMs, active, dateKey: dayKey(new Date()) });
      store.save(record);
      driver.tick(dtMs); // → onUpdate → push (record already updated)
      energyStore.save(driver.state); // persist energy for restart resume (#2)
    },
    onAway: (ms) => {
      driver.applyAway(ms); // slept = away → recharge (#1)
      push();
    },
  });

  return createServiceApi({
    subscribers,
    push,
    driver,
    controller,
    napController,
    store,
    energyStore,
    loop,
    state,
    persistNapMs,
    persistTier,
    persistLocale,
    persistOpenAtLogin,
    applyLoginItem,
  });
}

module.exports = { startEnergyService };
