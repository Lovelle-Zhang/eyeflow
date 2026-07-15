'use strict';

/**
 * energy update — ENGINE_SPEC §C. Pure: computes the next energy value from an
 * input, with no side effects. Reminder/arming logic lives in reminders.js.
 */

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Post-short-break energy (§C2) — the ONE source of the short-break credit math
 * (§9.2 一个事实一个函数). Both the real credit (step's `shortBreak` input, via
 * the driver) and the display-only recharge preview in the reminder controller
 * call this, so the brighten always matches what the engine will actually credit.
 * @param {number} energy current energy (0–100)
 * @param {object} params engine params (uses shortBreakGain + energy bounds)
 * @returns {number} clamped post-credit energy
 */
function shortBreakEnergy(energy, params) {
  return clamp(energy + params.shortBreakGain, params.energyMin, params.energyMax);
}

/**
 * Apply one input to `energy` and return the clamped next energy.
 * @param {number} energy
 * @param {{kind:string, dtMs?:number, idleSec?:number}} input
 * @param {object} params
 * @returns {number}
 */
function nextEnergy(energy, input, params) {
  const { energyMin, energyMax } = params;

  switch (input.kind) {
    case 'tick': {
      const mins = input.dtMs / 60000;
      if (input.idleSec < params.idleGraceSec) {
        // ACTIVE
        energy -= params.drainPerMin * mins;
      } else if (input.idleSec >= params.awaySec) {
        // AWAY → natural recharge
        energy += params.rechargePerMin * mins;
      }
      // else PAUSED → hold (§5.4.2)
      break;
    }
    case 'shortBreak':
      energy = shortBreakEnergy(energy, params);
      break;
    case 'nap':
      energy = energyMax;
      break;
    default:
      throw new Error(`unknown input kind: ${input.kind}`);
  }

  return clamp(energy, energyMin, energyMax);
}

module.exports = { nextEnergy, shortBreakEnergy };
