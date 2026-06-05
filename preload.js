const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("eyeflowDesktop", {
  showDashboard: () => ipcRenderer.invoke("dashboard:show"),
  hideCompanion: () => ipcRenderer.invoke("companion:hide"),
  moveCompanionBy: (delta) => ipcRenderer.invoke("companion:moveBy", delta),
  setCompanionExpanded: (expanded) => ipcRenderer.invoke("companion:setExpanded", expanded),
  notify: (message) => ipcRenderer.invoke("companion:notify", message),
  publishState: (state) => ipcRenderer.invoke("state:publish", state),
  startForceBreak: (payload) => ipcRenderer.invoke("breakLock:start", payload),
  finishForceBreak: (payload) => ipcRenderer.invoke("breakLock:done", payload),
  speak: (payload) => ipcRenderer.invoke("voice:speak", payload),
  stopVoice: () => ipcRenderer.invoke("voice:stop"),
  getPermissionStatus: () => ipcRenderer.invoke("permissions:status"),
  openAccessibilitySettings: () => ipcRenderer.invoke("permissions:openAccessibility"),
  getDesktopSettings: () => ipcRenderer.invoke("desktopSettings:get"),
  setLaunchAtLogin: (enabled) => ipcRenderer.invoke("desktopSettings:setLaunchAtLogin", enabled),
  onState: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on("state:update", listener);
    return () => ipcRenderer.removeListener("state:update", listener);
  },
  onActivity: (callback) => {
    const listener = (_event, activity) => callback(activity);
    ipcRenderer.on("activity:update", listener);
    return () => ipcRenderer.removeListener("activity:update", listener);
  },
  onSystemLifecycle: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("system:lifecycle", listener);
    return () => ipcRenderer.removeListener("system:lifecycle", listener);
  },
  onPanelSide: (callback) => {
    const listener = (_event, side) => callback(side);
    ipcRenderer.on("panel:side", listener);
    return () => ipcRenderer.removeListener("panel:side", listener);
  },
  onCompanionExpanded: (callback) => {
    const listener = (_event, expanded) => callback(Boolean(expanded));
    ipcRenderer.on("companion:expanded", listener);
    return () => ipcRenderer.removeListener("companion:expanded", listener);
  },
  onForceBreakDone: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("breakLock:done", listener);
    return () => ipcRenderer.removeListener("breakLock:done", listener);
  },
  onForceBreakUpdate: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("breakLock:update", listener);
    return () => ipcRenderer.removeListener("breakLock:update", listener);
  }
});
