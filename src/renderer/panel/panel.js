'use strict';

// Menubar panel painter (§4). Pure view: consumes the localized payload pushed
// from main (every string is built there per the current locale, §4 zh/en),
// drives the shared 气色 capsule + today stats, and reports user actions.

const api = window.panel || {};

const el = (id) => document.getElementById(id);
const hero = el('hero');
const gear = el('gear');
const settings = el('settings');

function reportHeight() {
  api.resize?.(el('panel').offsetHeight + 24);
}

// one segmented control for all three switches (nap duration / tier / language)
function renderSegs(host, options, isOn, onPick) {
  host.innerHTML = '';
  for (const opt of options) {
    const b = document.createElement('button');
    b.className = `seg${isOn(opt) ? ' on' : ''}`;
    b.textContent = opt.label;
    b.addEventListener('click', () => onPick(opt));
    host.appendChild(b);
  }
}

api.onInit?.(() => reportHeight());

api.onData?.((d) => {
  hero.style.setProperty('--cap-color', d.capsuleCss); // live 气色 (§8.3)
  el('state').textContent = d.state;
  el('eyeuse').textContent = d.eyeUseText;

  const t = d.texts;
  for (const node of document.querySelectorAll('[data-t]')) node.textContent = t[node.dataset.t];
  el('pct').textContent = t.energy;
  el('rests').textContent = t.restsCount;
  el('rests-label').textContent = t.restsLabel;
  el('nap-sub').textContent = t.napSub;
  gear.setAttribute('aria-label', t.settings);

  renderSegs(el('segs'), d.napOptions, (o) => o.ms === d.napMs, (o) => api.setDuration?.(o.ms));
  renderSegs(el('tier-segs'), d.tierOptions, (o) => o.tier === d.reminderTier, (o) => api.setTier?.(o.tier));
  renderSegs(el('lang-segs'), d.languageOptions, (o) => o.locale === d.locale, (o) => api.setLocale?.(o.locale));
  renderSegs(el('login-segs'), d.loginOptions, (o) => o.on === d.openAtLogin, (o) => api.setLogin?.(o.on));

  reportHeight();
});

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
