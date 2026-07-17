'use strict';

// Menubar panel painter (§4). Pure view: consumes engine/records data pushed
// from main, drives the shared 气色 capsule + today stats, reports actions.

const api = window.panel || {};

const el = (id) => document.getElementById(id);
const hero = el('hero');
const pct = el('pct');
const state = el('state');
const eyeuse = el('eyeuse');
const rests = el('rests');
const restsLabel = el('rests-label');
const napSub = el('nap-sub');
const gear = el('gear');
const settings = el('settings');
const segs = el('segs');
const tierSegs = el('tier-segs');

let napOptions = [];
let tierOptions = [];

function reportHeight() {
  api.resize?.(el('panel').offsetHeight + 24);
}

api.onInit?.(({ napOptions: options, tierOptions: tiers }) => {
  napOptions = options || [];
  tierOptions = tiers || [];
  reportHeight();
});

api.onData?.((d) => {
  hero.style.setProperty('--cap-color', d.capsuleCss); // live 气色 (§8.3)
  pct.textContent = `精力 ${Math.round(d.energy)}%`;
  state.textContent = d.state;

  eyeuse.textContent = d.eyeUseText;
  const total = d.shortBreaks + d.naps;
  rests.textContent = `${total} 次`;
  restsLabel.textContent = `歇息（短歇 ${d.shortBreaks} · 小睡 ${d.naps}）`;

  napSub.textContent = `完整 · ${Math.round(d.napMs / 60000)} 分钟`;
  renderSegs(d.napMs);
  renderTierSegs(d.reminderTier);
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

function renderTierSegs(currentTier) {
  tierSegs.innerHTML = '';
  for (const opt of tierOptions) {
    const b = document.createElement('button');
    b.className = `seg${opt.tier === currentTier ? ' on' : ''}`;
    b.textContent = opt.label;
    b.addEventListener('click', () => api.setTier?.(opt.tier));
    tierSegs.appendChild(b);
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
el('quit').addEventListener('click', () => api.quit?.());

api.ready?.();
