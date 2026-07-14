'use strict';

// Menubar panel painter (§4). Pure view: consumes engine/records data pushed
// from main, paints the capsule 气色 + today stats, and reports user actions
// (short break / nap / duration setting) back. No logic.

const api = window.panel || {};

const el = (id) => document.getElementById(id);
const mira = el('mira');
const hero = el('hero');
const pct = el('pct');
const state = el('state');
const fill = el('fill');
const eyeuse = el('eyeuse');
const rests = el('rests');
const restsLabel = el('rests-label');
const napSub = el('nap-sub');
const gear = el('gear');
const settings = el('settings');
const segs = el('segs');

let napOptions = [];

function reportHeight() {
  api.resize?.(document.getElementById('panel').offsetHeight + 24);
}

api.onInit?.(({ mira: svg, napOptions: options }) => {
  mira.innerHTML = svg;
  napOptions = options || [];
  reportHeight();
});

api.onData?.((d) => {
  hero.style.background = d.capsuleCss;
  pct.textContent = `精力 ${Math.round(d.energy)}%`;
  state.textContent = d.state;
  fill.style.width = `${Math.round(d.energy)}%`;

  eyeuse.textContent = d.eyeUseText;
  const total = d.shortBreaks + d.naps;
  rests.textContent = `${total} 次`;
  restsLabel.textContent = `歇息（短歇 ${d.shortBreaks} · 小睡 ${d.naps}）`;

  const min = Math.round(d.napMs / 60000);
  napSub.textContent = `完整 · ${min} 分钟`;
  renderSegs(d.napMs);
  reportHeight();
});

function renderSegs(currentMs) {
  segs.innerHTML = '';
  for (const opt of napOptions) {
    const b = document.createElement('button');
    b.className = `seg${opt.ms === currentMs ? ' on' : ''}`;
    b.textContent = opt.label;
    b.addEventListener('click', () => api.setDuration?.(opt.ms));
    segs.appendChild(b);
  }
}

gear.addEventListener('click', () => {
  const open = settings.hasAttribute('hidden');
  if (open) settings.removeAttribute('hidden');
  else settings.setAttribute('hidden', '');
  gear.classList.toggle('on', open);
  reportHeight();
});

el('act-short').addEventListener('click', () => api.act?.('short'));
el('act-nap').addEventListener('click', () => api.act?.('nap'));

api.ready?.();
