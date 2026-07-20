'use strict';

/**
 * Offscreen render of an app surface to a clean PNG (zh | en) for the landing.
 * Loads the real renderer, injects a representative frozen state, and captures
 * the window (dark/warm scenes) — no desktop, no chrome. Companion to
 * shoot-panel.js (which handles the light popover on transparency).
 *
 * Usage: electron scripts/shoot.js <strong|nap|onboarding> <zh|en> <out.png>
 */

const { app, BrowserWindow, nativeTheme } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const surface = process.argv[2];
const locale = process.argv[3] === 'en' ? 'en' : 'zh';
const outPath = process.argv[4] || `/tmp/${surface}-${locale}.png`;
const fileUrl = (rel) => 'file://' + path.join(__dirname, '..', 'src', 'renderer', rel);

const T = {
  strong: { zh: '眼睛歇歇，看看远处', en: 'Rest your eyes — look far' },
  napSuggest: { zh: '要不要小睡一会儿，我陪你', en: "How about a short nap? I'll stay with you" },
  napButton: { zh: '小睡一会儿', en: 'Take a nap' },
  napMsg: { zh: '闭上眼，缓一缓。', en: 'Close your eyes, and settle.' },
  napHint: { zh: '按 Esc 结束', en: 'Press Esc to end' },
  obHello: { zh: '你好，我是 Mira', en: "Hi, I'm Mira" },
};

const SURFACES = {
  // 加强档提醒: centered big capsule on a warm wash (transparent edges → glow)
  strong: {
    url: fileUrl('reminder-strong/index.html'),
    size: [980, 620],
    inject: () => `(() => {
      document.documentElement.style.background = 'transparent';
      document.body.classList.add('awake');
      const cap = document.getElementById('capsule');
      cap.style.setProperty('--cap-color', 'hsla(157, 21%, 34%, 0.94)');
      document.getElementById('text').textContent = ${JSON.stringify(T.strong[locale])};
      document.getElementById('count').textContent = '18';
      cap.classList.add('in');
    })()`,
  },
  // 加强档 L2 小睡建议: same warm-wash big capsule, but the countdown gives way
  // to the 小睡 button (kind==='nap' branch of reminder-strong.js).
  'strong-nap': {
    url: fileUrl('reminder-strong/index.html'),
    size: [980, 620],
    inject: () => `(() => {
      document.documentElement.style.background = 'transparent';
      document.body.classList.add('awake');
      const cap = document.getElementById('capsule');
      cap.style.setProperty('--cap-color', 'hsla(157, 21%, 34%, 0.94)');
      document.getElementById('text').textContent = ${JSON.stringify(T.napSuggest[locale])};
      document.getElementById('track').style.display = 'none';
      document.getElementById('count').style.display = 'none';
      const btn = document.getElementById('napbtn');
      btn.hidden = false;
      btn.textContent = ${JSON.stringify(T.napButton[locale])};
      cap.classList.add('in');
    })()`,
  },
  // 小睡仪式: fullscreen dark rest scene, breathing capsule + charge bar
  nap: {
    url: fileUrl('nap/index.html'),
    size: [980, 620],
    inject: () => `(() => {
      document.body.classList.add('resting');
      const face = document.getElementById('face');
      face.classList.add('is-rest');
      face.style.setProperty('--energy', '0.6');
      document.getElementById('capsule').style.setProperty('--cap-color', 'hsla(157, 31%, 33%, 0.95)');
      document.getElementById('message').textContent = ${JSON.stringify(T.napMsg[locale])};
      document.getElementById('hint').textContent = ${JSON.stringify(T.napHint[locale])};
      document.getElementById('clock').textContent = '0:42';
      document.getElementById('fill').style.width = '46%';
    })()`,
  },
  // 相遇仪式: dark meeting scene, Mira + one line of 台词
  onboarding: {
    url: fileUrl('onboarding/index.html'),
    size: [1280, 820],
    inject: () => `(() => {
      const card = document.getElementById('card');
      card.classList.add('in');
      card.style.transform = 'scale(0.62)'; // card is viewport-relative; shrink to sit in the dark scene
      const msg = document.getElementById('msg');
      msg.innerHTML = ${JSON.stringify(T.obHello[locale])};
      msg.classList.add('in');
    })()`,
  },
};

const cfg = SURFACES[surface];
if (!cfg) {
  // eslint-disable-next-line no-console
  console.error('unknown surface:', surface);
  process.exit(1);
}

nativeTheme.themeSource = 'dark';
app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: cfg.size[0],
    height: cfg.size[1],
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: { paintWhenInitiallyHidden: true },
  });
  await win.loadURL(cfg.url);
  if (cfg.zoom) win.webContents.setZoomFactor(cfg.zoom);
  await win.webContents.executeJavaScript(cfg.inject());
  await new Promise((r) => setTimeout(r, 800));
  const img = await win.webContents.capturePage();
  fs.writeFileSync(outPath, img.toPNG());
  // eslint-disable-next-line no-console
  console.log('wrote', outPath, `${img.getSize().width}x${img.getSize().height}`);
  app.quit();
});
