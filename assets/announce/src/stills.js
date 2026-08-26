'use strict';
const { app, BrowserWindow } = require('electron');
const path = require('node:path'), fs = require('node:fs');
const DIR = __dirname;
const LANG = (process.argv[2] === 'zh' || process.argv[2] === 'en') ? process.argv[2] : 'en';
const PAGE = 'file://' + path.join(DIR, 'announce.html') + '?lang=' + LANG;
const TS = process.argv.slice((process.argv[2] === 'zh' || process.argv[2] === 'en') ? 3 : 2).map(Number);
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1440, height: 900, show: false, webPreferences: { offscreen: true } });
  let painted = false; win.webContents.on('paint', () => { painted = true; });
  await win.loadURL(PAGE);
  fs.mkdirSync(path.join(DIR, 'check'), { recursive: true });
  for (const ms of TS) {
    await win.webContents.executeJavaScript(`seek(${ms})`);
    await new Promise(r => setTimeout(r, 120));
    const img = (await win.webContents.capturePage()).resize({ width: 1440, height: 900 });
    fs.writeFileSync(path.join(DIR, 'check', `${LANG}-${ms}.png`), img.toPNG());
  }
  win.destroy(); app.quit();
});
