'use strict';

/**
 * Offscreen render of the menubar panel to a clean transparent PNG (zh | en) for
 * the landing page's "product shot". Loads the real panel renderer, injects a
 * sample resting-state payload + a light popover card, and capturePage's the card
 * (with a shadow margin) onto transparency — no desktop, no window chrome.
 *
 * Usage: electron scripts/shoot-panel.js <zh|en> <outPath.png>
 */

const { app, BrowserWindow, nativeTheme } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const locale = process.argv[2] === 'en' ? 'en' : 'zh';
const outPath = process.argv[3] || `/tmp/panel-${locale}.png`;
const PANEL = 'file://' + path.join(__dirname, '..', 'src', 'renderer', 'panel', 'index.html');

const CAP_COLOR = 'hsla(157, 42%, 29%, 0.96)'; // §8.3 healthy 气色 green
const TEXT = {
  zh: {
    state: '常态', eyeUse: '1h 42m', energy: '精力 66%', restsCount: '8 次',
    restsLabel: '歇息（短歇 7 · 小睡 1）', napSub: '完整 · 3 分钟',
    today: '今天', screenTime: '今日用眼', restNow: '现在歇一下', shortBreakSub: '短歇 · 20 秒', takeNap: '小睡一会儿',
  },
  en: {
    state: 'Steady', eyeUse: '1h 42m', energy: 'Energy 66%', restsCount: '8×',
    restsLabel: 'Rests (breaks 7 · naps 1)', napSub: 'Full · 3 min',
    today: 'Today', screenTime: 'Screen time', restNow: 'Rest now', shortBreakSub: 'Short break · 20s', takeNap: 'Take a nap',
  },
}[locale];

function injection(t, capColor) {
  return `(() => {
    const $ = (s) => document.querySelector(s);
    document.documentElement.style.background = 'transparent';
    document.body.style.cssText = 'margin:0;background:transparent;display:flex;padding:44px;';
    const panel = document.getElementById('panel');
    const card = document.createElement('div');
    card.id = 'shot-card';
    card.style.cssText = 'width:360px;border-radius:16px;overflow:hidden;background:#f5f7f9;'
      + 'box-shadow:0 26px 64px rgba(22,42,60,0.20),0 4px 12px rgba(22,42,60,0.10),inset 0 0 0 0.5px rgba(0,0,0,0.07);';
    card.appendChild(panel);
    document.body.appendChild(card);
    const t = ${JSON.stringify(t)};
    document.getElementById('hero').style.setProperty('--cap-color', ${JSON.stringify(capColor)});
    document.getElementById('pct').textContent = t.energy;
    document.getElementById('state').textContent = t.state;
    document.getElementById('eyeuse').textContent = t.eyeUse;
    document.getElementById('rests').textContent = t.restsCount;
    document.getElementById('rests-label').textContent = t.restsLabel;
    document.getElementById('nap-sub').textContent = t.napSub;
    $('[data-t="today"]').textContent = t.today;
    $('[data-t="screenTime"]').textContent = t.screenTime;
    $('.row--primary [data-t="restNow"]').textContent = t.restNow;
    $('[data-t="shortBreakSub"]').textContent = t.shortBreakSub;
    $('[data-t="takeNap"]').textContent = t.takeNap;
    // resting state: #settings stays hidden (default)
  })()`;
}

nativeTheme.themeSource = 'light';
app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 480,
    height: 480,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: { paintWhenInitiallyHidden: true },
  });
  await win.loadURL(PANEL);
  await win.webContents.executeJavaScript(injection(TEXT, CAP_COLOR));
  await new Promise((r) => setTimeout(r, 700));
  const rect = await win.webContents.executeJavaScript(`(() => {
    const c = document.getElementById('shot-card');
    const r = c.getBoundingClientRect();
    const m = 38;
    return { x: Math.max(0, Math.round(r.x - m)), y: Math.max(0, Math.round(r.y - m)),
             width: Math.round(r.width + m * 2), height: Math.round(r.height + m * 2) };
  })()`);
  const img = await win.webContents.capturePage(rect);
  fs.writeFileSync(outPath, img.toPNG());
  // eslint-disable-next-line no-console
  console.log('wrote', outPath, `${img.getSize().width}x${img.getSize().height}`);
  app.quit();
});
