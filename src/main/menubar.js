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
const { trayStrings } = require('../view/i18n/tray-strings');

function createMenubar(service) {
  const tray = new Tray(miraTrayImage());
  tray.setToolTip('EyeFlow Next');
  const win = createPanelWindow();

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

  // built fresh each open so it matches the current UI language (§4)
  function buildTrayMenu() {
    const t = trayStrings(service.getLocale?.());
    return Menu.buildFromTemplate([
      { label: t.open, click: showPanel },
      { type: 'separator' },
      {
        label: t.dev,
        submenu: [
          { label: t.ff, click: () => service.dev('ff') },
          { label: t.remind, click: () => service.dev('remind') },
          { label: t.remindNap, click: () => service.dev('remindNap') },
          { label: t.napRitual, click: () => service.dev('napRitual') },
          { label: t.reset, click: () => service.dev('reset') },
        ],
      },
      { type: 'separator' },
      { label: t.quit, role: 'quit' },
    ]);
  }

  tray.on('click', toggle);
  tray.on('right-click', () => tray.popUpContextMenu(buildTrayMenu()));

  ipcMain.on('panel:ready', (e) => {
    // options + all strings arrive localized in panel:data (built per locale)
    e.sender.send('panel:init', { mira: miraSvg({ variant: 'full', eyes: 'open' }) });
    service.push();
  });
  ipcMain.on('panel:act', (_e, kind) => {
    service.act(kind); // do it now, then dismiss the panel like a menu
    win.hide();
  });
  ipcMain.on('panel:set-duration', (_e, ms) => service.setDuration(ms));
  ipcMain.on('panel:set-tier', (_e, tier) => service.setReminderTier(tier));
  ipcMain.on('panel:set-locale', (_e, locale) => service.setLocale(locale));
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
