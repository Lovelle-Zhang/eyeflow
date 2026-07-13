'use strict';

// Pure painter (§9.4): consumes engine output pushed from main, paints the
// capsule 气色 + small Mira. No logic, no timers — it only reflects state.

const api = window.eyeflow || {};

const capsule = document.getElementById('capsule');
const mira = document.getElementById('mira');
const status = document.getElementById('status');
const fill = document.getElementById('fill');
const readout = document.getElementById('readout');

let assets = null;

api.onInit?.((payload) => {
  assets = payload;
  mira.innerHTML = payload.miraOpen; // small Mira is a constant character
});

api.onUpdate?.(({ energy, capsuleCss, events }) => {
  capsule.style.background = capsuleCss; // 气色 = energyToColor(energy) (§8.3)

  const pct = Math.round(energy);
  status.textContent = `精力 ${pct}%`;
  fill.style.width = `${pct}%`;

  // Momentary closed eyes when a reminder fires (blink/nap preview).
  if (assets) {
    const resting = events.includes('remind_short') || events.includes('remind_nap');
    mira.innerHTML = resting ? assets.miraClosed : assets.miraOpen;
  }

  if (events.length) {
    readout.textContent = `事件：${events.join('、')}`;
  }
});

document.getElementById('dev').addEventListener('click', (e) => {
  const act = e.target.dataset.act;
  if (act) api.dev?.(act);
});

api.ready?.();
