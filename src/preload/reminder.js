'use strict';

/**
 * Preload bridge for the reminder overlay. The overlay renderer is a pure
 * painter: it receives show/frame/tuck from main and reports back when it has
 * finished tucking away.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('reminder', {
  onShow: (cb) => ipcRenderer.on('reminder:show', (_e, payload) => cb(payload)),
  onFrame: (cb) => ipcRenderer.on('reminder:frame', (_e, payload) => cb(payload)),
  onRecharge: (cb) => ipcRenderer.on('reminder:recharge', (_e, payload) => cb(payload)),
  onTuck: (cb) => ipcRenderer.on('reminder:tuck', () => cb()),
  tucked: () => ipcRenderer.send('reminder:tucked'),
  napNow: () => ipcRenderer.send('reminder:nap-now'),
  // strong window only: report cursor-over-capsule so clicks can land on the
  // 小睡 button while the fullscreen wash stays click-through (§6.1 点穿除按钮).
  hover: (over) => ipcRenderer.send('reminder:hover', over),
});
