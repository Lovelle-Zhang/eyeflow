'use strict';

// The scripted 相遇仪式 (CHARTER §7): 登场 → 自我介绍 → 第一个短歇 loop → 引出小睡
// + 选时长 → 收场. Copy follows MIRA_LANGUAGE §四 (draft; final字句 at prototype).

const api = window.onboarding || {};
const el = (id) => document.getElementById(id);
const card = el('card');
const mira = el('mira');
const msg = el('msg');
const track = el('track');
const fill = el('fill');
const controls = el('controls');

let assets = null;
let chosenNapMs = 180000;

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function setEyes(state) {
  if (assets) mira.innerHTML = state === 'closed' ? assets.miraClosed : assets.miraOpen;
}

function say(text) {
  msg.classList.remove('in');
  void msg.offsetWidth; // reflow → fade the new line in
  msg.textContent = text;
  msg.classList.add('in');
}

async function line(text, hold = 2000) {
  say(text);
  await delay(hold);
}

function button(label) {
  return new Promise((resolve) => {
    controls.innerHTML = '';
    const b = document.createElement('button');
    b.className = 'ob__btn';
    b.textContent = label;
    b.onclick = () => {
      controls.innerHTML = '';
      resolve();
    };
    controls.appendChild(b);
  });
}

function pickDuration() {
  return new Promise((resolve) => {
    controls.innerHTML = '';
    const segs = document.createElement('div');
    segs.className = 'ob__segs';
    for (const o of assets.napOptions) {
      const s = document.createElement('button');
      s.className = `ob__seg${o.ms === chosenNapMs ? ' on' : ''}`;
      s.textContent = o.label;
      s.onclick = () => {
        chosenNapMs = o.ms;
        [...segs.children].forEach((c) => c.classList.toggle('on', c === s));
      };
      segs.appendChild(s);
    }
    controls.appendChild(segs);
    const done = document.createElement('button');
    done.className = 'ob__btn';
    done.textContent = '好了';
    done.onclick = () => {
      controls.innerHTML = '';
      resolve();
    };
    controls.appendChild(done);
  });
}

async function shortLoop(ms) {
  track.removeAttribute('hidden');
  fill.style.transition = 'none';
  fill.style.width = '100%';
  void fill.offsetWidth;
  fill.style.transition = `width ${ms}ms linear`;
  fill.style.width = '0%';
  await delay(ms);
  track.setAttribute('hidden', '');
}

async function run() {
  mira.classList.add('breathe');
  setEyes('open');
  await delay(800);

  // 登场 + 自我介绍
  await line('你好，我是 Mira。');
  await line('我住在你的屏幕角落，不打扰你。');
  await line('你看屏幕太久时，我会提醒你——歇一下，看看远处。');
  say('现在，我们先一起试一次。');
  await button('好，来试试');

  // 第一个短歇 loop
  setEyes('closed');
  say('看看远处吧。');
  await shortLoop(20000);
  setEyes('open');
  mira.classList.add('bright');
  say('这样就好。是不是清楚了一点？');
  await delay(2800);
  mira.classList.remove('bright');

  // 引出小睡 + 选时长
  await line('刚才那个，是短歇——像眨一次长眼，随时来一下。', 2800);
  setEyes('closed');
  await line('累得深了，还可以小睡一会儿——闭眼久一点，歇得更透。', 3000);
  setEyes('open');
  say('小睡多久，你自己定。');
  await pickDuration();

  // 收场
  await line('好了，我记住了。之后我就在上面陪着你。', 2600);
  msg.classList.add('brand');
  say('守护你看清世界的方式。');
  await delay(2800);
  mira.classList.add('leave'); // capsule rises toward the menubar
  card.classList.remove('in'); // card fades away
  await delay(700);
  api.done(chosenNapMs);
}

api.onInit?.((payload) => {
  assets = payload;
  chosenNapMs = payload.defaultNapMs;
  setEyes('open');
  requestAnimationFrame(() => card.classList.add('in')); // card fades in
  run();
});

api.ready?.();
