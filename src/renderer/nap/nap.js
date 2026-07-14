'use strict';

// Fullscreen nap ritual painter. Shows deep-closed breathing Mira + calm
// countdown; on done, wakes to open eyes + a brand-soul welcome, then closes.
// Esc or a click ends the rest early (main grants no credit for that).

const api = window.nap || {};

const root = document.querySelector('.nap');
const mira = document.getElementById('mira');
const clock = document.getElementById('clock');
const fill = document.getElementById('fill');
const message = document.getElementById('message');

api.onStart?.(({ mira: svg, durationSec }) => {
  mira.innerHTML = svg;
  clock.textContent = formatStart(durationSec);
  fill.style.width = '0%';
  root.classList.remove('is-awake');
  message.textContent = '闭上眼，缓一缓。';
});

api.onFrame?.(({ clock: text, fraction }) => {
  clock.textContent = text;
  fill.style.width = `${Math.min(1, fraction) * 100}%`;
});

api.onDone?.(({ mira: svg }) => {
  mira.innerHTML = svg; // open eyes, awake
  root.classList.add('is-awake');
  clock.textContent = '';
  fill.style.width = '100%';
  // MIRA_LANGUAGE §四: 休息完成 + 品牌魂话术（仪式时刻点睛）
  message.textContent = '欢迎回来。清楚一点了吧。';
  setTimeout(() => api.closed?.(), 2600);
});

// End early — no credit (main decides).
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') api.cancel?.();
});
document.addEventListener('click', () => api.cancel?.());

function formatStart(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
