'use strict';

/**
 * Default energy-engine parameters (ENGINE_SPEC §E).
 *
 * §9.7: every experience value is a tunable parameter and lives HERE, in one
 * place. dogfood → adjust numbers only, never touch the engine logic.
 * All rates are points-per-minute; thresholds are seconds; energy is 0–100.
 */
const DEFAULT_PARAMS = Object.freeze({
  energyMax: 100,
  energyMin: 0,
  energyStart: 100,

  drainPerMin: 100 / 45, // ~2.222 → full drain in ~45 min of active use
  rechargePerMin: 100 / 15, // ~6.667 → full recharge in ~15 min away

  shortBreakGain: 44, // feel B: diligent short break → ~20 min to next nudge

  idleGraceSec: 30, // active → paused boundary
  awaySec: 300, // paused → away(recharge) boundary (§5.3 "5 分钟")

  lineX: 50, // L1 (light reminder) line
  lineY: 20, // L2 (explicit reminder) line; Y < X
});

module.exports = { DEFAULT_PARAMS };
