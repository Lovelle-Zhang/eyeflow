'use strict';

/**
 * Energy service — main-process wiring (landing-order step 6, milestone ①).
 *
 * Composes: system idle → driver (engine) → presenter (energyToColor / miraSvg)
 * → IPC → renderer. The engine/view functions stay pure and separately tested;
 * this layer only glues them and owns the impure interval + IPC.
 */

const { ipcMain } = require('electron');
const { createEnergyDriver } = require('./driver/energy-driver');
const { getIdleSec } = require('./driver/system-idle');
const { energyToColor } = require('../view/capsule/energy-color');
const { miraSvg } = require('../view/mira/mira-svg');

function startEnergyService(win, { intervalMs = 1000 } = {}) {
  const send = (channel, payload) => {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, payload);
    }
  };

  // Presenter: map engine energy → the capsule's 气色 (§8.3) for the renderer.
  const driver = createEnergyDriver({
    getIdleSec,
    onUpdate: ({ energy, events }) =>
      send('energy:update', {
        energy,
        capsuleCss: energyToColor(energy).css,
        events,
      }),
  });

  // Impure loop: real elapsed time via a monotonic clock, sampled each interval.
  let last = process.hrtime.bigint();
  const timer = setInterval(() => {
    const now = process.hrtime.bigint();
    const dtMs = Number(now - last) / 1e6;
    last = now;
    driver.tick(dtMs);
  }, intervalMs);

  // Renderer handshake: send the constant Mira assets, then paint initial state.
  const onReady = () => {
    send('energy:init', {
      miraOpen: miraSvg({ variant: 'full', eyes: 'open' }),
      miraClosed: miraSvg({ variant: 'full', eyes: 'closed' }),
    });
    driver.reset();
  };
  ipcMain.on('ui:ready', onReady);

  // Temporary dev controls (replaced by real reminder/rest UI in step 6 proper).
  const onDev = (_event, action) => {
    if (action === 'ff') driver.tick(60000);
    else if (action === 'shortBreak') driver.shortBreak();
    else if (action === 'nap') driver.nap();
    else if (action === 'reset') driver.reset();
  };
  ipcMain.on('ui:dev', onDev);

  win.on('closed', () => {
    clearInterval(timer);
    ipcMain.removeListener('ui:ready', onReady);
    ipcMain.removeListener('ui:dev', onDev);
  });

  return driver;
}

module.exports = { startEnergyService };
