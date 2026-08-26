'use strict';
// Deterministic offline render: step announce.html's seek(t) frame-by-frame,
// capture each frame at NATIVE retina resolution (no downscale → crisp), and
// encode a CFR 30fps H.264 mp4. No real-time pressure → smooth, exact duration.
// Usage: electron record.js [durationMs] [fps] [lang=en|zh]
const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const ffmpeg = require('ffmpeg-static');

const DIR = __dirname;
const LOG = path.join(DIR, 'log.txt');
const log = (...a) => { fs.appendFileSync(LOG, a.join(' ') + '\n'); };
fs.writeFileSync(LOG, '');
process.on('uncaughtException', e => log('UNCAUGHT', e && e.stack || e));

const DUR = parseInt(process.argv[2] || '61000', 10);
const FPS = parseInt(process.argv[3] || '30', 10);
const LANG = process.argv[4] === 'zh' ? 'zh' : 'en';
const PAGE = 'file://' + path.join(DIR, 'announce.html') + '?lang=' + LANG;
const OUT = path.join(DIR, `EyeFlow-Mira-announce-${LANG}.mp4`);

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1440, height: 900, show: false, webPreferences: { offscreen: true } });
  win.webContents.setFrameRate(FPS);
  win.webContents.on('paint', () => {});
  await win.loadURL(PAGE);
  // native capture size (retina 2x on this display → 2880x1800)
  await win.webContents.executeJavaScript('seek(0)');
  await new Promise(r => setTimeout(r, 120));
  const sz = (await win.webContents.capturePage()).getSize();
  const W = sz.width, H = sz.height;
  log('loaded', LANG, 'native', W + 'x' + H);

  const proc = spawn(ffmpeg, [
    '-y', '-f', 'rawvideo', '-pixel_format', 'bgra', '-video_size', `${W}x${H}`,
    '-framerate', String(FPS), '-i', '-',
    '-vf', 'gradfun=1.2:16', // deband smooth gradients (fixes the warm-wash / deep-green banding)
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'veryfast', '-threads', '0',
    '-movflags', '+faststart', OUT,
  ], { stdio: ['pipe', 'ignore', fs.openSync(path.join(DIR, 'ffmpeg-' + LANG + '.log'), 'w')] });
  let ferr = '';
  proc.on('error', e => log('FFMPEG ERROR', e && e.stack || e));
  proc.on('close', c => log('FFMPEG CLOSED code=' + c));
  proc.stdin.on('error', e => log('STDIN ERR ' + (e && e.code || e)));

  const write = buf => new Promise(res => { proc.stdin.write(buf) ? res() : proc.stdin.once('drain', res); });
  const total = Math.round(DUR / 1000 * FPS);
  for (let f = 0; f < total; f++) {
    const t = f * 1000 / FPS;
    await win.webContents.executeJavaScript(`seek(${t})`);
    await new Promise(r => setTimeout(r, 10)); // let the paint settle
    const img = await win.webContents.capturePage(); // native, no resize
    await write(img.toBitmap());
    if (f % 90 === 0) log('  frame', f, '/', total, 't=' + Math.round(t));
  }
  win.destroy();
  proc.stdin.end();
  await new Promise(res => proc.on('close', res));

  const kb = fs.existsSync(OUT) ? Math.round(fs.statSync(OUT).size / 1024) : 0;
  log(ferr.split('\n').filter(l => /frame=|Error|Invalid/.test(l)).slice(-1)[0] || '');
  log(`DONE ${LANG} ${total} frames @ ${W}x${H} → ${OUT} ${kb}KB`);
  app.quit();
});
