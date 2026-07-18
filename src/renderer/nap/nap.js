'use strict';

// Fullscreen nap ritual painter. Drives the shared capsule: deep-closed +
// breathing during the rest; wakes to open + bright + a brand-soul welcome, then
// closes. Esc or a click ends the rest early (main grants no credit for that).

const api = window.nap || {};

const el = (id) => document.getElementById(id);
const root = el('nap');
const capsule = el('capsule');
const face = el('face');
const clock = el('clock');
const fill = el('fill');
const message = el('message');
const hintEl = el('hint');

const setCharge = (energy, capsuleCss) => {
  capsule.style.setProperty('--cap-color', capsuleCss); // 气色 brightens as it charges
  face.style.setProperty('--energy', Math.max(0, Math.min(1, energy / 100)));
};

api.onStart?.(({ durationSec, energy, capsuleCss, tier, restText, hint }) => {
  face.classList.add('is-rest'); // 深睡：光收成缓慢的一线 (§6.3)
  face.classList.remove('is-bright');
  root.classList.remove('is-awake');
  document.body.classList.add('resting'); // fade the edge mist in (§6.3)
  document.body.classList.remove('awake');
  document.body.classList.toggle('strong', tier === 'strong'); // §6.4 加强档 → bigger capsule
  clock.textContent = formatStart(durationSec);
  fill.style.width = '0%'; // starts empty, fills as energy recharges over the nap
  message.textContent = restText; // §4 localized
  if (hint) hintEl.textContent = hint;
  setCharge(energy, capsuleCss); // start at the tired 气色
});

api.onFrame?.(({ clock: text, fraction, energy, capsuleCss }) => {
  clock.textContent = text;
  fill.style.width = `${Math.min(1, fraction) * 100}%`;
  setCharge(energy, capsuleCss); // watch the color brighten toward full
});

api.onDone?.(({ wakeText } = {}) => {
  face.classList.remove('is-rest'); // 醒来：光溢成场
  face.classList.add('is-bright');
  root.classList.add('is-awake');
  document.body.classList.add('awake'); // mist lifts as Mira wakes
  clock.textContent = '';
  fill.style.width = '100%';
  // MIRA_LANGUAGE §四: 休息完成 + 品牌魂话术（仪式时刻点睛，§4 localized）
  if (wakeText) message.textContent = wakeText;
  setTimeout(() => api.closed?.(), 2600);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') api.cancel?.();
});
document.addEventListener('click', () => api.cancel?.());

function formatStart(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
