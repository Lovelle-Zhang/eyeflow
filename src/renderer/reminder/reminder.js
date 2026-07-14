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

api.onShow?.(({ kind, capsuleCss, text: prompt, durationSec }) => {
  capsule.style.setProperty('--cap-color', capsuleCss); // 气色 at reminder time (§8.3)
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
