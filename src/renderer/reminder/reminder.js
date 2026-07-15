'use strict';

// Reminder overlay painter. Drives the shared 气色 capsule: sets its color from
// the live energy, blinks (short) or opens eyes (nap suggestion), floats out,
// runs the countdown, tucks away.

const api = window.reminder || {};

const el = (id) => document.getElementById(id);
const capsule = el('capsule');
const face = el('face');
const text = el('text');
const track = el('track');
const fill = el('fill');
const count = el('count');
const napbtn = el('napbtn');

napbtn.addEventListener('click', () => api.napNow?.());

const setEnergy = (energy) => face.style.setProperty('--energy', Math.max(0, Math.min(1, energy / 100)));

api.onShow?.(({ kind, capsuleCss, energy, text: prompt, durationSec }) => {
  capsule.style.setProperty('--cap-color', capsuleCss); // 气色 at reminder time (§8.3)
  setEnergy(energy); // the pulse's brightness = honest 气色, ready to brighten on recharge
  face.classList.toggle('is-blink', kind !== 'nap'); // 短歇=闭眼眨眼; 二级建议=睁眼
  text.textContent = prompt;

  const isNap = kind === 'nap';
  track.style.display = isNap ? 'none' : '';
  count.style.display = isNap ? 'none' : '';
  napbtn.hidden = !isNap; // §5.1 二级: actionable "小睡" button
  if (!isNap) {
    count.textContent = String(durationSec);
    fill.style.width = '100%';
  }

  capsule.classList.remove('in');
  void capsule.offsetWidth; // reflow so the float-out transition plays
  capsule.classList.add('in');
});

api.onFrame?.(({ remainingSec, remainingFraction }) => {
  count.textContent = String(remainingSec);
  fill.style.width = `${remainingFraction * 100}%`;
});

// 休息=回充: rested short break brightens the capsule + Pulse to the post-credit
// 气色 before tucking. Pure cross-fade via the existing CSS transitions (§8.4,
// prefers-reduced-motion safe — no new keyframes).
api.onRecharge?.(({ capsuleCss, energy }) => {
  capsule.style.setProperty('--cap-color', capsuleCss);
  setEnergy(energy);
});

api.onTuck?.(() => {
  capsule.classList.remove('in'); // slides back up
  let notified = false;
  const done = () => {
    if (notified) return;
    notified = true;
    api.tucked?.();
  };
  capsule.addEventListener('transitionend', done, { once: true });
  setTimeout(done, 500);
});
