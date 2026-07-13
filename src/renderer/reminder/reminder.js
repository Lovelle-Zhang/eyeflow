'use strict';

// Pure painter for the reminder overlay. Receives show/frame/tuck from main,
// plays the float-out / tuck, and reports back when it has finished tucking.

const api = window.reminder || {};

const capsule = document.getElementById('capsule');
const mira = document.getElementById('mira');
const text = document.getElementById('text');
const track = document.getElementById('track');
const fill = document.getElementById('fill');
const count = document.getElementById('count');

api.onShow?.(({ kind, capsuleCss, mira: svg, text: prompt, durationSec }) => {
  capsule.style.background = capsuleCss; // 气色 at reminder time (§8.3)
  mira.innerHTML = svg;
  text.textContent = prompt;

  // §5.1 二级建议 has no eye-rest countdown — just the message. §6.1 一级 does.
  const isNap = kind === 'nap';
  track.style.display = isNap ? 'none' : '';
  count.style.display = isNap ? 'none' : '';
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
  capsule.classList.remove('in'); // slides back up (§8.4)
  let notified = false;
  const done = () => {
    if (notified) return;
    notified = true;
    api.tucked?.();
  };
  capsule.addEventListener('transitionend', done, { once: true });
  setTimeout(done, 500); // fallback if transitionend doesn't fire
});
