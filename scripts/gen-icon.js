'use strict';

/**
 * Generate the macOS app icon (build/icon.icns) from the full-color Mira SVG
 * (§8.5) — the single source of truth. Electron rasterizes the SVG via
 * capturePage (no rasterizer dep); macOS `sips` + `iconutil` build the .icns.
 *
 * Run: npm run gen:icon
 */

const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { miraSvg } = require('../src/view/mira/mira-svg');

const BUILD = path.join(__dirname, '..', 'build');
const HTML = path.join(BUILD, '_icon.html');
const PNG = path.join(BUILD, 'icon-1024.png');
const ICONSET = path.join(BUILD, 'Mira.iconset');
const ICNS = path.join(BUILD, 'icon.icns');

app.whenReady().then(async () => {
  fs.mkdirSync(BUILD, { recursive: true });
  fs.writeFileSync(
    HTML,
    `<!doctype html><meta charset="utf-8"><style>html,body{margin:0}svg{display:block;width:1024px;height:1024px}</style>${miraSvg({ variant: 'full', eyes: 'open' })}`,
  );

  const win = new BrowserWindow({
    width: 1024,
    height: 1024,
    show: false,
    frame: false,
    transparent: true,
    webPreferences: { offscreen: false },
  });
  win.setPosition(-4000, -4000);
  win.showInactive();
  await win.loadFile(HTML);
  await new Promise((r) => setTimeout(r, 400));
  fs.writeFileSync(PNG, (await win.webContents.capturePage()).toPNG());

  fs.rmSync(ICONSET, { recursive: true, force: true });
  fs.mkdirSync(ICONSET);
  for (const s of [16, 32, 128, 256, 512]) {
    const at1 = path.join(ICONSET, `icon_${s}x${s}.png`);
    const at2 = path.join(ICONSET, `icon_${s}x${s}@2x.png`);
    execFileSync('sips', ['-z', String(s), String(s), PNG, '--out', at1]);
    execFileSync('sips', ['-z', String(s * 2), String(s * 2), PNG, '--out', at2]);
  }
  execFileSync('iconutil', ['-c', 'icns', ICONSET, '-o', ICNS]);

  fs.rmSync(HTML, { force: true });
  fs.rmSync(ICONSET, { recursive: true, force: true });
  // eslint-disable-next-line no-console
  console.log(`icon.icns written -> ${ICNS}`);
  app.quit();
});

app.on('window-all-closed', () => app.quit());
