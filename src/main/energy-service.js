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
const { energyToColor, energyStateLabel } = require('../view/capsule/energy-color');
const { dayKey, recordTick, recordRest, formatEyeUse } = require('../records/today');
const { DEFAULT_NAP_MS } = require('../view/nap/nap');

function startEnergyService({ intervalMs = 1000, napMs: initialNapMs = DEFAULT_NAP_MS, persistNapMs } = {}) {
  const store = createRecordsStore();
  let record = store.load(); // resume today, or start fresh (§7)
  const energyStore = createEnergyStore();
  const savedEnergy = energyStore.load(); // resume energy across restart (#2)
  let napMs = initialNapMs;
  const subscribers = new Set();

  const napController = createNapController({
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
      if (controller) {
        if (events.includes('remind_nap')) controller.trigger({ level: 'nap' });
        else if (events.includes('remind_short')) controller.trigger({ level: 'short', energy });
      }
      push();
    },
  });

  controller = createReminderController({
    getIdleSec,
    getEnergy: () => driver.state.energy,
    onShortBreakComplete: () => {
      driver.shortBreak();
      record = recordRest(record, 'short'); // D2: only genuine rests reach here
      store.save(record);
      push();
    },
  });

  // Offline resume (#2): credit the time the app was closed as away → recharge.
  if (savedEnergy) {
    driver.applyAway(Date.now() - savedEnergy.savedAt);
  }

  function payload() {
    const energy = driver.state.energy;
    return {
      energy,
      capsuleCss: energyToColor(energy).css,
      state: energyStateLabel(energy),
      eyeUseText: formatEyeUse(record.eyeUseMs).text,
      shortBreaks: record.shortBreaks,
      naps: record.naps,
      napMs,
    };
  }

  function push() {
    const p = payload();
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

  return {
    subscribe(fn) {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
    push,
    act(kind) {
      // User-initiated → immediate (bypass the §6.2 auto-reminder buffer).
      if (kind === 'short') {
        controller.trigger({ level: 'short', energy: driver.state.energy, immediate: true });
      } else if (kind === 'nap') {
        napController.start(napMs);
      }
    },
    setDuration(ms) {
      napMs = ms;
      if (persistNapMs) persistNapMs(ms); // §6.4 setting persists
      push();
    },
    dev(action) {
      if (action === 'ff') driver.tick(60000);
      else if (action === 'remind') {
        controller.trigger({ level: 'short', energy: driver.state.energy, immediate: true });
      } else if (action === 'remindNap') controller.trigger({ level: 'nap', immediate: true });
      else if (action === 'napRitual') napController.start(12000);
      else if (action === 'reset') driver.reset();
    },
    flush() {
      store.flush();
      energyStore.save(driver.state);
      energyStore.flush();
    },
    destroy() {
      loop.stop();
      store.flush();
      energyStore.save(driver.state);
      energyStore.flush();
      controller.destroy();
      napController.destroy();
    },
  };
}

module.exports = { startEnergyService };
