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
let S = window.OB_STRINGS.zh; // §4 台词 set from the resolved locale on init

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function say(text) {
  msg.classList.remove('in');
  void msg.offsetWidth; // reflow → fade the new line in
  msg.innerHTML = text; // 收尾品牌定格要富文本;文案皆为硬编码字符串,无注入风险
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
    done.textContent = S.pickDone;
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
  await line(S.hello);
  await line(S.intro1);
  await line(S.intro2);
  say(S.tryIntro);
  await button(S.tryBtn);

  // 第一个短歇 loop —— 页面暗层(--dim)与 Mira 光核(--energy)一起 dim→bright。
  // 渐变背景不能 CSS 过渡,所以用可淡出的暗层:交接时仍是暗的,休息里渐亮。演示压到
  // 10s(比真实短歇短)——恢复过程更明显;真实短歇仍走引擎的 20 秒。
  // 短歇里 Mira 只随 --energy 变暗+微缩、仍是圆光点(不压成一线——那是小睡 §6.3)。
  card.style.transition = '--dim 1200ms ease';
  card.style.setProperty('--dim', '1');
  face.style.transition = '--energy 1200ms ease';
  face.style.setProperty('--energy', '0.15');
  say(S.fade);
  await delay(2600);
  say(S.restNow);
  card.style.transition = '--dim 10000ms linear';
  card.style.setProperty('--dim', '0');
  face.style.transition = '--energy 10000ms linear';
  face.style.setProperty('--energy', '1');
  await shortLoop(10000);
  card.style.transition = '';
  face.style.transition = '';
  say(S.afterRest);
  await delay(2800);

  // 引出小睡 + 选时长 —— Mira 保持呼吸,只靠台词讲解,不再切形态
  await line(S.explainShort, 2800);
  await line(S.explainNap, 3000);
  say(S.pickPrompt);
  await pickDuration();

  // 收场
  await line(S.outro, 2600);
  msg.classList.add('brand');
  say(S.brand);
  card.classList.add('is-ending'); // Mira 缩小落定,与 EyeFlow 锁成品牌定格
  await delay(3000);
  face.classList.add('is-leaving'); // 光缩进菜单栏
  card.classList.remove('in');
  await delay(700);
  api.done(chosenNapMs);
}

api.onInit?.((payload) => {
  napOptions = payload.napOptions || [];
  chosenNapMs = payload.defaultNapMs;
  S = (window.OB_STRINGS && window.OB_STRINGS[payload.locale]) || window.OB_STRINGS.zh;
  requestAnimationFrame(() => card.classList.add('in'));
  run();
});

api.ready?.();
