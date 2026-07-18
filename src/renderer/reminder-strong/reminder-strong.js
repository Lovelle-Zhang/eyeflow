'use strict';

// 加强档 reminder painter (CHARTER §6.1). Same reminder:* protocol as the island
// (../reminder/reminder.js) driving the shared 气色 capsule, but centered in a
// fullscreen warm wash. Extra: fades the wash in/out (body.awake) and reports
// cursor-over-capsule so the click-through window lets the 小睡 button work.

const api = window.reminder || {};
const el = (id) => document.getElementById(id);
const capsule = el('capsule');
const text = el('text');
const track = el('track');
const fill = el('fill');
const count = el('count');
const napbtn = el('napbtn');

napbtn.addEventListener('click', () => api.napNow?.());

// point-through except the capsule: only claim the cursor when a button is shown
capsule.addEventListener('mouseenter', () => {
  if (!napbtn.hidden) api.hover?.(true);
});
capsule.addEventListener('mouseleave', () => api.hover?.(false));

api.onShow?.(({ kind, capsuleCss, text: prompt, durationSec }) => {
  capsule.style.setProperty('--cap-color', capsuleCss); // 气色 at reminder time (§8.3)
  text.textContent = prompt;

  const isNap = kind === 'nap';
  track.style.display = isNap ? 'none' : '';
  count.style.display = isNap ? 'none' : '';
  napbtn.hidden = !isNap;
  if (!isNap) {
    count.textContent = String(durationSec);
    fill.style.width = '100%';
  }

  document.body.classList.add('awake'); // fade the warm wash in
  capsule.classList.remove('in');
  void capsule.offsetWidth; // reflow so the entrance plays
  capsule.classList.add('in');
});

api.onFrame?.(({ remainingSec, remainingFraction }) => {
  count.textContent = String(remainingSec);
  fill.style.width = `${remainingFraction * 100}%`;
});

// 休息=回充: brighten the capsule 气色 to the post-credit green before tucking.
api.onRecharge?.(({ capsuleCss }) => {
  capsule.style.setProperty('--cap-color', capsuleCss);
});

api.onTuck?.(() => {
  api.hover?.(false); // release any claimed interactivity
  capsule.classList.remove('in'); // scale/fade out
  document.body.classList.remove('awake'); // wash fades out
  let notified = false;
  const done = () => {
    if (notified) return;
    notified = true;
    api.tucked?.();
  };
  capsule.addEventListener('transitionend', done, { once: true });
  setTimeout(done, 700);
});
