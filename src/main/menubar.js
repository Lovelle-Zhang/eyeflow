'use strict';

/**
 * Menubar (CHARTER §4): the tray icon (constant monochrome Mira, §8.5) + the
 * popover panel. Binds the panel's IPC to the core energy service and streams
 * live data to it. Dev triggers live in the tray's right-click menu, keeping the
 * product panel clean.
 */

const { app, Tray, Menu, screen, ipcMain } = require('electron');
const { miraTrayImage } = require('./tray/tray-icon');
const { createPanelWindow } = require('./overlay/panel-window');
const { miraSvg } = require('../view/mira/mira-svg');
const { NAP_DURATION_OPTIONS_MS } = require('../view/nap/nap');
const { REMINDER_TIER_OPTIONS } = require('../view/reminder/tier');

function createMenubar(service) {
  const tray = new Tray(miraTrayImage());
  tray.setToolTip('EyeFlow Next');
  const win = createPanelWindow();

  const napOptions = NAP_DURATION_OPTIONS_MS.map((ms) => ({
    ms,
    label: `${Math.round(ms / 60000)} 分钟`,
  }));

  function positionUnderTray() {
    const b = tray.getBounds();
    const [w] = win.getSize();
    const wa = screen.getDisplayMatching(b).workArea;
    let x = Math.round(b.x + b.width / 2 - w / 2);
    x = Math.max(wa.x + 8, Math.min(x, wa.x + wa.width - w - 8));
    win.setPosition(x, Math.round(b.y + b.height + 6));
  }

  function showPanel() {
    positionUnderTray();
    win.show();
    win.focus();
    service.push();
  }

  function toggle() {
    if (win.isVisible()) win.hide();
    else showPanel();
  }

  const trayMenu = Menu.buildFromTemplate([
    { label: '打开 EyeFlow Next', click: showPanel },
    { type: 'separator' },
    {
      label: '开发者',
      submenu: [
        { label: '快进 1 分钟', click: () => service.dev('ff') },
        { label: '测试一级提醒', click: () => service.dev('remind') },
        { label: '测试二级提醒', click: () => service.dev('remindNap') },
        { label: '小睡仪式 12s', click: () => service.dev('napRitual') },
        { label: '重置精力', click: () => service.dev('reset') },
      ],
    },
    { type: 'separator' },
    { label: '退出 EyeFlow Next', role: 'quit' },
  ]);

  tray.on('click', toggle);
  tray.on('right-click', () => tray.popUpContextMenu(trayMenu));

  ipcMain.on('panel:ready', (e) => {
    e.sender.send('panel:init', {
      mira: miraSvg({ variant: 'full', eyes: 'open' }),
      napOptions,
      tierOptions: REMINDER_TIER_OPTIONS,
    });
    service.push();
  });
  ipcMain.on('panel:act', (_e, kind) => {
    service.act(kind); // do it now, then dismiss the panel like a menu
    win.hide();
  });
  ipcMain.on('panel:set-duration', (_e, ms) => service.setDuration(ms));
  ipcMain.on('panel:set-tier', (_e, tier) => service.setReminderTier(tier));
  ipcMain.on('panel:quit', () => app.quit());
  ipcMain.on('panel:resize', (_e, height) => {
    const [w] = win.getSize();
    win.setSize(w, Math.max(120, Math.round(height)));
    positionUnderTray();
  });

  service.subscribe((data) => {
    if (!win.isDestroyed()) win.webContents.send('panel:data', data);
  });

  return { tray, win, showPanel };
}

module.exports = { createMenubar };
