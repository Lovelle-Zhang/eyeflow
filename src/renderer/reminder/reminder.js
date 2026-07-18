'use strict';

// Reminder overlay painter. Drives the shared 气色 capsule: sets its green from
// the live energy, floats out, runs the countdown, tucks away. The left mark is
// a steady app-icon squircle; state reads from the capsule 气色 + the countdown.

const api = window.reminder || {};

const el = (id) => document.getElementById(id);
const capsule = el('capsule');
const text = el('text');
const track = el('track');
const fill = el('fill');
const count = el('count');
const napbtn = el('napbtn');

napbtn.addEventListener('click', () => api.napNow?.());

api.onShow?.(({ kind, capsuleCss, text: prompt, napLabel, durationSec }) => {
  capsule.style.setProperty('--cap-color', capsuleCss); // 气色 at reminder time (§8.3)
  text.textContent = prompt;
  if (napLabel) napbtn.textContent = napLabel; // §4 localized nap button

  const isNap = kind === 'nap';
  track.style.display = isNap ? 'none' : '';
  count.style.display = isNap ? 'none' : '';
  napbtn.hidden = !isNap; // §5.1 二级: actionable nap button
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

// 休息=回充: a rested short break brightens the capsule's 气色 to the post-credit
// green before tucking. Pure cross-fade via the existing background transition
// (§8.4, prefers-reduced-motion safe — no new keyframes).
api.onRecharge?.(({ capsuleCss }) => {
  capsule.style.setProperty('--cap-color', capsuleCss);
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
