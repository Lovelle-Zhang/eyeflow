'use strict';

/**
 * Public control surface for the energy service (split from the composition root
 * for the §9.1 line budget). Pure wiring: given the service's internal handles +
 * a shared mutable `state` object, returns the object the menubar / onboarding
 * drive. The facade WRITES state.{napMs,reminderTier,onboardingActive}; the
 * service body READS the same object, so both stay in sync.
 */

function createServiceApi({
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
}) {
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
        napController.start(state.napMs);
      }
    },
    setDuration(ms) {
      state.napMs = ms;
      if (persistNapMs) persistNapMs(ms); // §6.4 setting persists
      push();
    },
    /** §6.4 reminder presentation tier ('light' | 'strong') — persists + re-paints. */
    setReminderTier(tier) {
      state.reminderTier = tier;
      if (persistTier) persistTier(tier);
      push();
    },
    /** Current tier; the reminder controller reads this to pick island vs big capsule. */
    getReminderTier: () => state.reminderTier,
    /** §4 panel UI language ('zh' | 'en') — persists + re-paints. */
    setLocale(locale) {
      state.locale = locale;
      if (persistLocale) persistLocale(locale);
      push();
    },
    /** Current UI language; the tray builds its menu in this locale. */
    getLocale: () => state.locale,
    /** Suppress auto reminders while the onboarding ritual is on screen (#4). */
    setOnboardingActive(active) {
      state.onboardingActive = active;
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

module.exports = { createServiceApi };
