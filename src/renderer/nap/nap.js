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

api.onStart?.(({ durationSec }) => {
  face.classList.add('closed'); // 深闭眼 (§6.3)
  capsule.classList.add('is-breathing');
  capsule.classList.remove('is-bright');
  root.classList.remove('is-awake');
  clock.textContent = formatStart(durationSec);
  fill.style.width = '0%';
  message.textContent = '闭上眼，缓一缓。';
});

api.onFrame?.(({ clock: text, fraction }) => {
  clock.textContent = text;
  fill.style.width = `${Math.min(1, fraction) * 100}%`;
});

api.onDone?.(() => {
  face.classList.remove('closed'); // 睁眼
  capsule.classList.remove('is-breathing');
  capsule.classList.add('is-bright');
  root.classList.add('is-awake');
  clock.textContent = '';
  fill.style.width = '100%';
  // MIRA_LANGUAGE §四: 休息完成 + 品牌魂话术（仪式时刻点睛）
  message.textContent = '欢迎回来。清楚一点了吧。';
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
