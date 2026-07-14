'use strict';

/**
 * The impure runtime clock for the energy service — kept out of the composition
 * root. A monotonic-clock tick loop with dt clamping (#1) plus system sleep/wake
 * handling (§9.4). Calls onTick(dtMs) each interval; onAway(ms) when the machine
 * wakes from sleep (the frozen gap is credited as away time).
 */

const { powerMonitor } = require('electron');
const { DEFAULT_PARAMS } = require('../engine/energy');

function startEnergyLoop({ intervalMs = 1000, onTick, onAway }) {
  let last = process.hrtime.bigint();

  const timer = setInterval(() => {
    const now = process.hrtime.bigint();
    // Clamp: a tick never advances more than maxTickMs — any bigger gap
    // (sleep / throttle / stall) is not continuous screen use (#1).
    const dtMs = Math.min(Number(now - last) / 1e6, DEFAULT_PARAMS.maxTickMs);
    last = now;
    onTick(dtMs);
  }, intervalMs);

  let suspendedAt = null;
  const onSuspend = () => {
    suspendedAt = Date.now();
  };
  const onResume = () => {
    if (suspendedAt != null) {
      onAway(Date.now() - suspendedAt); // slept = away → recharge
      suspendedAt = null;
    }
    last = process.hrtime.bigint(); // reset clock so the next dt is normal
  };
  powerMonitor.on('suspend', onSuspend);
  powerMonitor.on('resume', onResume);

  return {
    stop() {
      clearInterval(timer);
      powerMonitor.removeListener('suspend', onSuspend);
      powerMonitor.removeListener('resume', onResume);
    },
  };
}

module.exports = { startEnergyLoop };
