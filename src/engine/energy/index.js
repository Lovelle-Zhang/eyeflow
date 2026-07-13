'use strict';

/**
 * Energy engine — public API (ENGINE_SPEC §A/§B).
 *
 * Composition root for the engine: pure `step()` = §C energy update →
 * §D reminder evaluation. No UI, no timers, no I/O (§9.4).
 */

const { DEFAULT_PARAMS } = require('./params');
const { initialState } = require('./state');
const { nextEnergy } = require('./step');
const { evaluateReminders } = require('./reminders');

/**
 * Advance the engine by one input.
 * @param {{energy:number, l1Armed:boolean, l2Armed:boolean}} state
 * @param {{kind:string, dtMs?:number, idleSec?:number}} input
 * @param {object} [params]
 * @returns {{state:{energy:number,l1Armed:boolean,l2Armed:boolean}, events:string[]}}
 */
function step(state, input, params = DEFAULT_PARAMS) {
  // 1. apply input to energy (clamped)
  const energy = nextEnergy(state.energy, input, params);
  // 2. evaluate reminders on the resulting energy
  const { l1Armed, l2Armed, events } = evaluateReminders(
    energy,
    { l1Armed: state.l1Armed, l2Armed: state.l2Armed },
    params,
  );
  // 3. return a fresh state (input state untouched — pure)
  return { state: { energy, l1Armed, l2Armed }, events };
}

module.exports = { step, initialState, DEFAULT_PARAMS };
