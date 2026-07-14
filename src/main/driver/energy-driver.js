'use strict';

/**
 * Energy driver — testable core (ENGINE_SPEC driver, landing-order step 6).
 *
 * Holds the engine state and advances it. The impure parts (reading system
 * idle time, the setInterval loop) live OUTSIDE this factory and are injected
 * (`getIdleSec`) or wired in energy-service.js — keeping this unit pure enough
 * to test with fakes (§9.4). One ledger only (§9.2): the engine state.
 */

const { step, initialState, DEFAULT_PARAMS } = require('../../engine/energy');

/**
 * @param {{ getIdleSec: () => number, params?: object, onUpdate?: (u:{energy:number,events:string[]}) => void }} opts
 */
function createEnergyDriver({ getIdleSec, params = DEFAULT_PARAMS, onUpdate } = {}) {
  if (typeof getIdleSec !== 'function') {
    throw new Error('createEnergyDriver: getIdleSec function is required');
  }

  let state = initialState(params);

  function publish(events) {
    if (onUpdate) {
      onUpdate({ energy: state.energy, events });
    }
  }

  function run(input) {
    const result = step(state, input, params);
    state = result.state;
    publish(result.events);
    return result;
  }

  return {
    /** Advance by dtMs of wall time, sampling the current system idle. */
    tick(dtMs) {
      return run({ kind: 'tick', dtMs, idleSec: getIdleSec() });
    },
    /** A completed 20s eye-rest → small recharge. */
    shortBreak() {
      return run({ kind: 'shortBreak' });
    },
    /**
     * Credit a KNOWN time gap (system sleep / app was closed) as away time →
     * recharge. Reuses the engine's AWAY band; energy clamps at full. Bypasses
     * the live idle reading (after wake, idle is unreliable). (#1/#2)
     */
    applyAway(awayMs) {
      return run({ kind: 'tick', dtMs: awayMs, idleSec: params.awaySec });
    },
    /** A completed full rest → refill to full. */
    nap() {
      return run({ kind: 'nap' });
    },
    /** Back to a fresh full state. */
    reset() {
      state = initialState(params);
      publish([]);
      return { state: { ...state }, events: [] };
    },
    /** Read-only snapshot (copy — the internal ledger stays insulated). */
    get state() {
      return { ...state };
    },
  };
}

module.exports = { createEnergyDriver };
