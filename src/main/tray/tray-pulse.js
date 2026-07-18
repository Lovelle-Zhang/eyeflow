'use strict';

/**
 * The tray pulse: Mira's core breathes green while the app is alive (the tray
 * icon is present ⇢ she's watching). Pre-renders one breathing cycle as
 * nativeImages for both menubar themes, cycles them on a slow timer, and swaps
 * the set when the system flips light/dark. Impure companion to tray-icon.js
 * (pure pixel generation).
 */

const { nativeImage, nativeTheme } = require('electron');
const { miraTrayFramePng } = require('./tray-icon');

const FRAMES = 24; // frames per breath
const PERIOD_MS = 3800; // one gentle in-out breath
const GLOW_MIN = 0.5; // never fully dark — she stays alive, just softer

/** Cosine-eased breath 0.5→1→0.5 over the cycle, rendered for one theme. */
function renderCycle(dark) {
  const out = [];
  for (let i = 0; i < FRAMES; i++) {
    const glow = GLOW_MIN + (1 - GLOW_MIN) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / FRAMES));
    const png = miraTrayFramePng({ dark, glow });
    out.push(nativeImage.createFromBuffer(png).resize({ height: 20, quality: 'best' }));
  }
  return out;
}

/**
 * Start breathing on `tray`. Returns a stop() that clears the timer and the
 * theme listener (call on quit).
 */
function startTrayPulse(tray) {
  const cache = { light: renderCycle(false), dark: renderCycle(true) };
  let i = 0;
  const draw = () => {
    const set = nativeTheme.shouldUseDarkColors ? cache.dark : cache.light;
    tray.setImage(set[i % FRAMES]);
  };
  draw();
  const timer = setInterval(() => {
    i = (i + 1) % FRAMES;
    draw();
  }, Math.round(PERIOD_MS / FRAMES));
  nativeTheme.on('updated', draw);

  return function stop() {
    clearInterval(timer);
    nativeTheme.removeListener('updated', draw);
  };
}

module.exports = { startTrayPulse };
