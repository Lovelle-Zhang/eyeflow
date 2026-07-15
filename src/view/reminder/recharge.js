'use strict';

/**
 * Short-break recharge preview (CHARTER §6.1, "休息=回充"). Pure: maps the current
 * energy to the DISPLAY payload the reminder capsule brightens to before tucking.
 *
 * §9.2 一个事实一个函数: the post-credit energy comes from `shortBreakEnergy` — the
 * SAME pure function the engine credits with (via step's `shortBreak`) — so the
 * brighten always matches the real credit. This is display-only; the actual
 * mutation still happens once in energy-service.onShortBreakComplete.
 */

const { shortBreakEnergy, DEFAULT_PARAMS } = require('../../engine/energy');
const { energyToColor } = require('../capsule/energy-color');

/**
 * @param {number} energy current (pre-credit) energy, 0–100
 * @param {object} [params] engine params (shortBreakGain + bounds)
 * @returns {{ capsuleCss:string, energy:number }} recharge IPC payload
 */
function rechargePreview(energy, params = DEFAULT_PARAMS) {
  const previewEnergy = shortBreakEnergy(energy, params);
  return { capsuleCss: energyToColor(previewEnergy).css, energy: previewEnergy };
}

module.exports = { rechargePreview };
