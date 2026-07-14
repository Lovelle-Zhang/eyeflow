'use strict';

// The scripted 相遇仪式 (CHARTER §7): 登场 → 自我介绍 → 第一个短歇 loop → 引出小睡
// + 选时长 → 收场. The luminous §3 capsule is the hero (CSS, so it can glow /
// breathe / blink). Copy per MIRA_LANGUAGE §四 (draft; final字句 at prototype).

const api = window.onboarding || {};
const el = (id) => document.getElementById(id);
const card = el('card');
const face = el('face');
const msg = el('msg');
const track = el('track');
const fill = el('fill');
const controls = el('controls');

let napOptions = [];
let chosenNapMs = 180000;

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const setEyes = (state) => face.classList.toggle('is-blink', state === 'closed');

// The page doubles as a charge meter for the demo (§7): tired 气色 → vivid.
const PAGE_VIVID = 'linear-gradient(150deg, #3aa77f 0%, #1a6b52 46%, #0c3225 100%)';
const PAGE_TIRED = 'linear-gradient(150deg, #61776b 0%, #46564c 46%, #313b34 100%)';

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
    for (const o of napOptions) {
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
  await delay(800);

  // 登场 + 自我介绍
  await line('你好，我是 Mira。');
  await line('我住在你的屏幕角落，不打扰你。');
  await line('你看屏幕太久时，我会提醒你——歇一下，看看远处。');
  say('现在，我们先一起试一次。');
  await button('好，来试试');

  // 第一个短歇 loop —— 整页当充电条:气色先淡下去,休息时一点点亮回来
  face.classList.add('is-rest');
  card.style.transition = 'background 1200ms ease';
  card.style.background = PAGE_TIRED;
  say('看屏幕久了，气色会一点点淡下去。');
  await delay(2600);
  say('那就歇一下——看看远处，看着它亮回来。');
  card.style.transition = 'background 20000ms linear';
  card.style.background = PAGE_VIVID;
  await shortLoop(20000);
  card.style.transition = ''; // back to the page's default transition
  face.classList.remove('is-rest');
  face.classList.add('is-bright');
  say('这样就好。是不是清楚了一点？');
  await delay(2800);
  face.classList.remove('is-bright');

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
  face.classList.add('is-leaving'); // 光缩进菜单栏
  card.classList.remove('in');
  await delay(700);
  api.done(chosenNapMs);
}

api.onInit?.((payload) => {
  napOptions = payload.napOptions || [];
  chosenNapMs = payload.defaultNapMs;
  requestAnimationFrame(() => card.classList.add('in'));
  run();
});

api.ready?.();
