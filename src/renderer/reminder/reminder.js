'use strict';

// Pure painter for the reminder overlay. Receives show/frame/tuck from main,
// plays the float-out / tuck, and reports back when it has finished tucking.

const api = window.reminder || {};

const capsule = document.getElementById('capsule');
const mira = document.getElementById('mira');
const text = document.getElementById('text');
const fill = document.getElementById('fill');
const count = document.getElementById('count');

api.onShow?.(({ capsuleCss, mira: svg, text: prompt, durationSec }) => {
  capsule.style.background = capsuleCss; // 气色 at reminder time (§8.3)
  mira.innerHTML = svg;
  text.textContent = prompt;
  count.textContent = String(durationSec);
  fill.style.width = '100%';

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
