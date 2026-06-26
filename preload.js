const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("eyeflowDesktop", {
  showDashboard: (options) => ipcRenderer.invoke("dashboard:show", options),
  hideCompanion: () => ipcRenderer.invoke("companion:hide"),
  moveCompanionBy: (delta) => ipcRenderer.invoke("companion:moveBy", delta),
  setCompanionExpanded: (expanded) => ipcRenderer.invoke("companion:setExpanded", expanded),
  setCompanionHover: (source, hovering) => ipcRenderer.invoke("companion:hover", source, hovering),
  notify: (message) => ipcRenderer.invoke("companion:notify", message),
  showMiraBubble: (message) => ipcRenderer.invoke("companion:bubble", message),
  publishState: (state) => ipcRenderer.invoke("state:publish", state),
  startForceBreak: (payload) => ipcRenderer.invoke("breakLock:start", payload),
  finishForceBreak: (payload) => ipcRenderer.invoke("breakLock:done", payload),
  speak: (payload) => ipcRenderer.invoke("voice:speak", payload),
  stopVoice: () => ipcRenderer.invoke("voice:stop"),
  getPermissionStatus: () => ipcRenderer.invoke("permissions:status"),
  openAccessibilitySettings: () => ipcRenderer.invoke("permissions:openAccessibility"),
  restartApp: () => ipcRenderer.invoke("app:restart"),
  getDesktopSettings: () => ipcRenderer.invoke("desktopSettings:get"),
  setLaunchAtLogin: (enabled) => ipcRenderer.invoke("desktopSettings:setLaunchAtLogin", enabled),
  setEnhancedSensing: (enabled) => ipcRenderer.invoke("desktopSettings:setEnhancedSensing", enabled),
  setCompanionVisible: (enabled) => ipcRenderer.invoke("desktopSettings:setCompanionVisible", enabled),
  getDiagnostics: () => ipcRenderer.invoke("diagnostics:get"),
  copyFeedbackText: (text) => ipcRenderer.invoke("feedback:copy", text),
  copyShareImage: (dataUrl) => ipcRenderer.invoke("share:copyImage", dataUrl),
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
  onCompanionExpanded: (callback) => {
    const listener = (_event, expanded) => callback(Boolean(expanded));
    ipcRenderer.on("companion:expanded", listener);
    return () => ipcRenderer.removeListener("companion:expanded", listener);
  },
  onCompanionBubble: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("companion:bubble", listener);
    return () => ipcRenderer.removeListener("companion:bubble", listener);
  },
  onForceBreakDone: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("breakLock:finished", listener);
    return () => ipcRenderer.removeListener("breakLock:finished", listener);
  },
  onForceBreakUpdate: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("breakLock:update", listener);
    return () => ipcRenderer.removeListener("breakLock:update", listener);
  },
  onRestGuide: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("dashboard:restGuide", listener);
    return () => ipcRenderer.removeListener("dashboard:restGuide", listener);
  },
  onDashboardFocus: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("dashboard:focus", listener);
    return () => ipcRenderer.removeListener("dashboard:focus", listener);
  }
});
