const { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, Notification, powerMonitor, screen, shell, systemPreferences } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { execFile } = require("node:child_process");

let dashboardWindow;
let companionWindow;
let companionPanelWindow;
let breakLockWindow;
let tray;
let breakLockCanClose = false;
let companionExpanded = false;
let companionHoverState = { avatar: false, panel: false };
let latestPanelSide = "right";
let lastAutoPanelAt = 0;
let lastAutoNotifyAt = 0;
let lastInterventionLevel = 1;
let autoPanelTimer = null;
let hoverCloseTimer = null;
let startupPanelShown = false;
let voiceProcess = null;
let latestState = {
  mood: "calm",
  title: "Mira 很安静",
  message: "我会在旁边看着节奏，先轻轻提醒，不抢你的控制权。",
  load: 0,
  isRunning: false,
  interventionLevel: 1
};
let latestActivity = {
  activeApp: "未知 App",
  idleSeconds: 0,
  isWorking: false,
  activeSeconds: 0,
  accessibilityTrusted: true,
  platform: process.platform,
  detectedAt: Date.now()
};
let activeWorkStartedAt = null;

app.setName("EyeFlow");
app.setAppUserModelId("com.eyeflow.app");

const appRoot = __dirname;
const companionSizes = {
  compact: { width: 86, height: 86 },
  panel: { width: 272, height: 116 }
};
const hoverCloseDelay = 950;

function settingsPath() {
  return path.join(app.getPath("userData"), "settings.json");
}

function readSettings() {
  try {
    return JSON.parse(fs.readFileSync(settingsPath(), "utf8"));
  } catch {
    return {};
  }
}

function writeSettings(settings) {
  try {
    fs.writeFileSync(settingsPath(), JSON.stringify(settings, null, 2));
  } catch {
    // Settings persistence is helpful but non-critical.
  }
}

function showDockIcon() {
  if (process.platform === "darwin" && app.dock) {
    app.dock.show();
  }
}

function getLaunchAtLogin() {
  if (process.platform !== "darwin") return false;
  return Boolean(app.getLoginItemSettings().openAtLogin);
}

function setLaunchAtLogin(openAtLogin) {
  if (process.platform !== "darwin") return false;
  app.setLoginItemSettings({
    openAtLogin: Boolean(openAtLogin),
    openAsHidden: false
  });
  updateApplicationMenu();
  updateTrayMenu();
  return getLaunchAtLogin();
}

function getDesktopSettings() {
  return {
    launchAtLogin: getLaunchAtLogin(),
    version: app.getVersion(),
    platform: process.platform
  };
}

function showAboutPanel() {
  showDockIcon();
  app.setAboutPanelOptions({
    applicationName: "EyeFlow",
    applicationVersion: app.getVersion(),
    version: app.getVersion(),
    copyright: "Private Alpha",
    credits: "Mira 会守住你的用眼节奏。"
  });
  app.showAboutPanel();
}

function updateApplicationMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: "EyeFlow",
      submenu: [
        { label: "关于 EyeFlow", click: showAboutPanel },
        { type: "separator" },
        { label: "打开 EyeFlow", accelerator: "CommandOrControl+O", click: showDashboard },
        { label: "显示 Mira", accelerator: "CommandOrControl+M", click: showCompanion },
        { label: "找回 Mira", accelerator: "CommandOrControl+Shift+M", click: resetCompanionPosition },
        {
          label: "开机自动启动",
          type: "checkbox",
          checked: getLaunchAtLogin(),
          click: (menuItem) => setLaunchAtLogin(menuItem.checked)
        },
        { type: "separator" },
        { role: "quit", label: "退出" }
      ]
    }
  ]));
}

function visibleCompanionBounds(bounds) {
  const displays = screen.getAllDisplays();
  const fallbackArea = displays[0]?.workArea || { x: 0, y: 0, width: 1440, height: 900 };
  const safeBounds = {
    width: Number.isFinite(bounds.width) ? bounds.width : companionSizes.compact.width,
    height: Number.isFinite(bounds.height) ? bounds.height : companionSizes.compact.height,
    x: Number.isFinite(bounds.x) ? bounds.x : fallbackArea.x + fallbackArea.width - companionSizes.compact.width - 28,
    y: Number.isFinite(bounds.y) ? bounds.y : fallbackArea.y + fallbackArea.height - companionSizes.compact.height - 28
  };
  const display = screen.getDisplayMatching(safeBounds);
  const area = display?.workArea || displays[0]?.workArea || { x: 0, y: 0, width: 1440, height: 900 };
  const padding = 12;
  const width = Math.min(safeBounds.width, area.width);
  const height = Math.min(safeBounds.height, area.height);
  return {
    width,
    height,
    x: Math.min(Math.max(safeBounds.x, area.x + padding), area.x + area.width - width - padding),
    y: Math.min(Math.max(safeBounds.y, area.y + padding), area.y + area.height - height - padding)
  };
}

function saveCompanionBounds() {
  if (!companionWindow || companionWindow.isDestroyed()) return;
  writeSettings({ ...readSettings(), companionBounds: companionWindow.getBounds() });
}

function dashboardWindowOptions() {
  const bounds = readSettings().dashboardBounds || {};
  const options = {
    width: Math.max(920, Math.round(Number(bounds.width) || 1180)),
    height: Math.max(680, Math.round(Number(bounds.height) || 820))
  };
  if (Number.isFinite(bounds.x) && Number.isFinite(bounds.y)) {
    options.x = Math.round(bounds.x);
    options.y = Math.round(bounds.y);
  }
  return options;
}

function saveDashboardBounds() {
  if (!dashboardWindow || dashboardWindow.isDestroyed()) return;
  if (dashboardWindow.isMinimized() || !dashboardWindow.isVisible()) return;
  writeSettings({ ...readSettings(), dashboardBounds: dashboardWindow.getBounds() });
}

function visiblePanelBounds(bounds) {
  const displays = screen.getAllDisplays();
  const display = screen.getDisplayMatching(bounds);
  const area = display?.workArea || displays[0]?.workArea || { x: 0, y: 0, width: 1440, height: 900 };
  const padding = 12;
  const width = Math.min(bounds.width || companionSizes.panel.width, area.width);
  const height = Math.min(bounds.height || companionSizes.panel.height, area.height);
  return {
    width,
    height,
    x: Math.min(Math.max(bounds.x ?? area.x + padding, area.x + padding), area.x + area.width - width - padding),
    y: Math.min(Math.max(bounds.y ?? area.y + padding, area.y + padding), area.y + area.height - height - padding)
  };
}

function panelBoundsForCompanion() {
  const icon = companionWindow?.getBounds() || { x: 40, y: 80, ...companionSizes.compact };
  const display = screen.getDisplayMatching(icon);
  const area = display.workArea;
  const panel = companionSizes.panel;
  const rightX = icon.x + icon.width - 3;
  const leftX = icon.x - panel.width + 3;
  const hasRoomRight = rightX + panel.width <= area.x + area.width - 12;
  latestPanelSide = hasRoomRight ? "right" : "left";
  const x = latestPanelSide === "right" ? rightX : leftX;
  const y = icon.y + Math.round((icon.height - panel.height) / 2);
  return visiblePanelBounds({ ...panel, x, y });
}

function sendPanelSide() {
  if (!companionPanelWindow || companionPanelWindow.isDestroyed()) return;
  companionPanelWindow.webContents.send("panel:side", latestPanelSide);
}

function sendCompanionExpanded() {
  if (!companionWindow || companionWindow.isDestroyed()) return;
  companionWindow.webContents.send("companion:expanded", companionExpanded);
}

function clearHoverCloseTimer() {
  if (!hoverCloseTimer) return;
  clearTimeout(hoverCloseTimer);
  hoverCloseTimer = null;
}

function scheduleHoverClose() {
  if (!companionExpanded || companionHoverState.avatar || companionHoverState.panel) return;
  clearHoverCloseTimer();
  hoverCloseTimer = setTimeout(() => {
    hoverCloseTimer = null;
    if (companionExpanded && !companionHoverState.avatar && !companionHoverState.panel) {
      hideCompanionPanel();
    }
  }, hoverCloseDelay);
}

function updateCompanionHover(source, hovering) {
  if (source !== "avatar" && source !== "panel") return;
  companionHoverState[source] = Boolean(hovering);
  if (hovering) {
    clearHoverCloseTimer();
  } else {
    scheduleHoverClose();
  }
}

function positionCompanionPanel() {
  if (!companionPanelWindow || companionPanelWindow.isDestroyed()) return;
  companionPanelWindow.setBounds(panelBoundsForCompanion(), false);
  sendPanelSide();
}

function showCompanionPanel() {
  if (!companionWindow || companionWindow.isDestroyed()) createCompanionWindow();
  if (!companionPanelWindow || companionPanelWindow.isDestroyed()) createCompanionPanelWindow();
  companionExpanded = true;
  clearHoverCloseTimer();
  keepCompanionVisible();
  positionCompanionPanel();
  companionWindow.show();
  companionPanelWindow.show();
  companionPanelWindow.moveTop();
  sendCompanionExpanded();
}

function hideCompanionPanel() {
  companionExpanded = false;
  companionHoverState.panel = false;
  clearHoverCloseTimer();
  if (autoPanelTimer) {
    clearTimeout(autoPanelTimer);
    autoPanelTimer = null;
  }
  companionPanelWindow?.hide();
  sendCompanionExpanded();
}

function keepCompanionVisible() {
  if (!companionWindow || companionWindow.isDestroyed()) return;
  const nextBounds = visibleCompanionBounds(companionWindow.getBounds());
  companionWindow.setBounds(nextBounds, false);
  saveCompanionBounds();
}

function resetCompanionPosition() {
  if (!companionWindow) createCompanionWindow();
  companionExpanded = false;
  const display = screen.getPrimaryDisplay();
  const area = display.workArea;
  const bounds = visibleCompanionBounds({
    ...companionSizes.compact,
    x: area.x + area.width - companionSizes.compact.width - 28,
    y: area.y + area.height - companionSizes.compact.height - 28
  });
  companionWindow.setBounds(bounds, false);
  companionPanelWindow?.hide();
  companionWindow.show();
  companionWindow.moveTop();
  saveCompanionBounds();
}

function createDashboardWindow() {
  dashboardWindow = new BrowserWindow({
    ...dashboardWindowOptions(),
    minWidth: 920,
    minHeight: 680,
    title: "EyeFlow",
    backgroundColor: "#f4f7f2",
    acceptFirstMouse: true,
    show: false,
    webPreferences: {
      preload: path.join(appRoot, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  dashboardWindow.loadFile(path.join(appRoot, "index.html"));

  dashboardWindow.once("ready-to-show", () => {
    dashboardWindow.show();
  });

  dashboardWindow.on("close", (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      dashboardWindow.hide();
    }
  });

  dashboardWindow.on("moved", saveDashboardBounds);
  dashboardWindow.on("resized", saveDashboardBounds);

  dashboardWindow.webContents.once("did-finish-load", () => {
    dashboardWindow.webContents.send("state:update", latestState);
    dashboardWindow.webContents.send("activity:update", latestActivity);
  });
}

function createCompanionWindow() {
  const settings = readSettings();
  const bounds = settings.companionBounds || {};
  const initialBounds = visibleCompanionBounds({
    width: companionSizes.compact.width,
    height: companionSizes.compact.height,
    x: bounds.x,
    y: bounds.y
  });
  companionWindow = new BrowserWindow({
    ...initialBounds,
    frame: false,
    resizable: false,
    movable: true,
    transparent: true,
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    acceptFirstMouse: true,
    show: false,
    title: "Mira",
    webPreferences: {
      preload: path.join(appRoot, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  companionWindow.loadFile(path.join(appRoot, "companion.html"));
  companionWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false });
  companionWindow.webContents.once("did-finish-load", () => {
    companionWindow.webContents.send("state:update", latestState);
    sendCompanionExpanded();
    keepCompanionVisible();
    companionWindow.show();
    companionWindow.moveTop();
    if (!startupPanelShown && Number(latestState.interventionLevel || 1) > 1) {
      startupPanelShown = true;
      setTimeout(() => {
        showCompanionPanel();
        if (autoPanelTimer) clearTimeout(autoPanelTimer);
        autoPanelTimer = setTimeout(() => {
          if (Number(latestState.interventionLevel || 1) <= 1) hideCompanionPanel();
        }, 7000);
      }, 450);
    } else {
      startupPanelShown = true;
    }
  });
  companionWindow.on("moved", () => {
    saveCompanionBounds();
    positionCompanionPanel();
  });
}

function createCompanionPanelWindow() {
  companionPanelWindow = new BrowserWindow({
    ...panelBoundsForCompanion(),
    frame: false,
    resizable: false,
    movable: false,
    transparent: true,
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    acceptFirstMouse: true,
    show: false,
    title: "Mira Panel",
    webPreferences: {
      preload: path.join(appRoot, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  companionPanelWindow.loadFile(path.join(appRoot, "companion-panel.html"));
  companionPanelWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false });
  companionPanelWindow.webContents.once("did-finish-load", () => {
    companionPanelWindow.webContents.send("state:update", latestState);
    sendPanelSide();
  });
}

function createTray() {
  const icon = nativeImage.createFromDataURL(
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAlElEQVR4nO2VwQ3DMAhFfYfdIbsDR2iH7A7dId0BO0R3yQ6ZITWqGPzQO+SbH5QBv4CkSkVN6ARwEXkHQq+AMwBam9wkvU8s6Z0RLgHEc9d5SZ3yXGaEApjUruc0DU2lVbwCzpQhyXwCTkpcdIF7YJru8iU0aGdFgWs+Gg5l+bC8j4K0rj6dX+5LzstC8yqQwW3EB3cdyasHctkAAAAASUVORK5CYII="
  );
  tray = new Tray(icon);
  tray.setToolTip("EyeFlow");
  updateTrayMenu();
  tray.on("click", showDashboard);
}

function updateTrayMenu() {
  if (!tray) return;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: latestState.title || "Mira 很安静", enabled: false },
    { label: `用眼负荷 ${latestState.load || 0}`, enabled: false },
    { label: `${latestActivity.activeApp || "未知 App"} · ${latestActivity.isWorking ? "活跃" : "空闲"}`, enabled: false },
    { type: "separator" },
    { label: "打开 EyeFlow", click: showDashboard },
    { label: "显示 Mira", click: showCompanion },
    { label: "找回 Mira", click: resetCompanionPosition },
    { label: "隐藏 Mira", click: () => companionWindow?.hide() },
    {
      label: "开机自动启动",
      type: "checkbox",
      checked: getLaunchAtLogin(),
      click: (menuItem) => setLaunchAtLogin(menuItem.checked)
    },
    { type: "separator" },
    { label: "关于 EyeFlow", click: showAboutPanel },
    {
      label: "退出",
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]));
}

function showDashboard() {
  showDockIcon();
  if (!dashboardWindow) createDashboardWindow();
  dashboardWindow.show();
  dashboardWindow.focus();
  if (process.platform === "darwin") app.focus({ steal: true });
}

function showCompanion() {
  if (!companionWindow) createCompanionWindow();
  keepCompanionVisible();
  companionWindow.show();
  companionWindow.focus();
}

function notify(message) {
  if (Notification.isSupported()) {
    new Notification({
      title: "Mira",
      body: message
    }).show();
  }
}

function stopVoice() {
  if (voiceProcess && !voiceProcess.killed) {
    voiceProcess.kill();
  }
  voiceProcess = null;
}

function speak(message) {
  const text = String(message?.text || message || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 520);
  if (!text) return { ok: false, reason: "empty" };
  stopVoice();
  if (process.platform !== "darwin") {
    return { ok: false, reason: "unsupported-platform" };
  }
  const child = execFile("say", ["-r", "165", text], (error) => {
    if (error && error.killed !== true) {
      console.warn("EyeFlow voice guide failed:", error.message);
    }
    if (voiceProcess === child) {
      voiceProcess = null;
    }
  });
  voiceProcess = child;
  return { ok: true, engine: "say" };
}

function sanitizeBreakTasks(tasks) {
  if (!Array.isArray(tasks)) return [];
  const allowedMoods = new Set(["gaze", "blink", "close", "neck", "press"]);
  return tasks.slice(0, 6).map((task) => ({
    mood: allowedMoods.has(task?.mood) ? task.mood : "gaze",
    label: String(task?.label || "").slice(0, 12),
    title: String(task?.title || "").slice(0, 48),
    copy: String(task?.copy || "").slice(0, 140),
    caption: String(task?.caption || "").slice(0, 36)
  })).filter((task) => task.title && task.copy);
}

function enterBreakLockFullscreen() {
  if (!breakLockWindow || breakLockWindow.isDestroyed()) return;
  breakLockWindow.setAlwaysOnTop(true, "screen-saver");
  breakLockWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  breakLockWindow.setFullScreen(true);
  breakLockWindow.setKiosk(true);
  breakLockWindow.moveTop();
}

function startBreakLock(payload = {}) {
  const seconds = Math.max(15, Math.min(600, Math.round(Number(payload.seconds) || 90)));
  const title = String(payload.title || "Mira 带你离开屏幕一下");
  const copy = String(payload.copy || "不用盯着倒计时。我来守时间，你把视线交给远处。");
  const tasks = sanitizeBreakTasks(payload.tasks);
  const voiceGuide = payload.voiceGuide !== false;
  breakLockCanClose = false;

  if (breakLockWindow && !breakLockWindow.isDestroyed()) {
    breakLockWindow.webContents.send("breakLock:update", {
      seconds,
      title,
      copy,
      tasks,
      preview: Boolean(payload.preview),
      voiceGuide
    });
    breakLockWindow.show();
    enterBreakLockFullscreen();
    breakLockWindow.focus();
    return;
  }

  breakLockWindow = new BrowserWindow({
    fullscreen: true,
    kiosk: true,
    frame: false,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    autoHideMenuBar: true,
    acceptFirstMouse: true,
    backgroundColor: "#101b18",
    title: "EyeFlow Rest",
    webPreferences: {
      preload: path.join(appRoot, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  breakLockWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  enterBreakLockFullscreen();
  breakLockWindow.loadFile(path.join(appRoot, "break-lock.html"), {
    query: {
      seconds: String(seconds),
      title,
      copy,
      tasks: JSON.stringify(tasks),
      preview: payload.preview ? "1" : "0",
      voiceGuide: voiceGuide ? "1" : "0"
    }
  });
  breakLockWindow.once("ready-to-show", () => {
    breakLockWindow.show();
    enterBreakLockFullscreen();
    breakLockWindow.focus();
  });
  breakLockWindow.on("closed", () => {
    breakLockWindow = null;
  });
  breakLockWindow.on("close", (event) => {
    if (!breakLockCanClose && !app.isQuitting) {
      event.preventDefault();
    }
  });
}

function finishBreakLock(payload = {}) {
  stopVoice();
  breakLockCanClose = true;
  if (breakLockWindow && !breakLockWindow.isDestroyed()) {
    breakLockWindow.setKiosk(false);
    breakLockWindow.setFullScreen(false);
    breakLockWindow.setAlwaysOnTop(false);
    breakLockWindow.close();
  }
  breakLockWindow = null;
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    dashboardWindow.webContents.send("breakLock:done", payload);
    dashboardWindow.show();
    dashboardWindow.focus();
  }
}

function broadcastState(state) {
  latestState = { ...latestState, ...state };
  updateTrayMenu();
  for (const win of [dashboardWindow, companionWindow, companionPanelWindow]) {
    if (win && !win.isDestroyed()) {
      win.webContents.send("state:update", latestState);
    }
  }
  applyInterventionBehavior(latestState);
}

function applyInterventionBehavior(state) {
  const level = Number(state.interventionLevel || 1);
  const now = Date.now();
  const levelChanged = level !== lastInterventionLevel;
  lastInterventionLevel = level;

  if (level <= 1) {
    if (levelChanged) hideCompanionPanel();
    return;
  }

  const panelCooldown = level >= 3 ? 4 * 60 * 1000 : 8 * 60 * 1000;
  if (levelChanged || now - lastAutoPanelAt > panelCooldown) {
    lastAutoPanelAt = now;
    showCompanionPanel();
    if (autoPanelTimer) {
      clearTimeout(autoPanelTimer);
      autoPanelTimer = null;
    }
    if (level === 2) {
      autoPanelTimer = setTimeout(() => {
        if (Number(latestState.interventionLevel || 1) === 2) hideCompanionPanel();
      }, 9000);
    }
  }

  if (level >= 3 && state.allowSystemNotify && now - lastAutoNotifyAt > 12 * 60 * 1000) {
    lastAutoNotifyAt = now;
    notify(state.message || "找一个自然断点，看远处 20 秒。");
  }
}

function broadcastActivity(activity) {
  latestActivity = { ...latestActivity, ...activity };
  updateTrayMenu();
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    dashboardWindow.webContents.send("activity:update", latestActivity);
  }
}

function broadcastSystemLifecycle(reason) {
  const payload = { reason, at: Date.now() };
  if (reason !== "resume") {
    hideCompanionPanel();
    companionWindow?.hide();
  }
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    dashboardWindow.webContents.send("system:lifecycle", payload);
  }
}

function getActiveAppName() {
  if (process.platform !== "darwin") {
    return Promise.resolve("当前应用");
  }
  return new Promise((resolve) => {
    execFile("/usr/bin/osascript", [
      "-e",
      'tell application "System Events" to get name of first application process whose frontmost is true'
    ], { timeout: 2500 }, (error, stdout) => {
      if (error) {
        resolve("未知 App");
        return;
      }
      resolve(stdout.trim() || "未知 App");
    });
  });
}

function hasAccessibilityPermission() {
  if (process.platform !== "darwin") return true;
  try {
    return systemPreferences.isTrustedAccessibilityClient(false);
  } catch {
    return false;
  }
}

function openAccessibilitySettings() {
  if (process.platform !== "darwin") return;
  shell.openExternal("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility");
}

function isDeepWorkApp(appName) {
  return [
    "Cursor",
    "Visual Studio Code",
    "Code",
    "Terminal",
    "iTerm2",
    "Warp",
    "Google Chrome",
    "Arc",
    "Safari",
    "Figma"
  ].some((name) => appName.toLowerCase().includes(name.toLowerCase()));
}

function startActivityMonitor() {
  setInterval(async () => {
    const idleSeconds = powerMonitor.getSystemIdleTime();
    const accessibilityTrusted = hasAccessibilityPermission();
    const activeApp = await getActiveAppName();
    const isWorking = idleSeconds < 30;
    if (isWorking && !activeWorkStartedAt) {
      activeWorkStartedAt = Date.now();
    }
    if (!isWorking) {
      activeWorkStartedAt = null;
    }
    const activeSeconds = activeWorkStartedAt
      ? Math.max(0, Math.floor((Date.now() - activeWorkStartedAt) / 1000))
      : 0;
    broadcastActivity({
      activeApp,
      idleSeconds,
      accessibilityTrusted,
      platform: process.platform,
      isWorking,
      isDeepWorkApp: isDeepWorkApp(activeApp),
      activeSeconds,
      detectedAt: Date.now()
    });
  }, 5000);
}

function startSystemLifecycleMonitor() {
  powerMonitor.on("lock-screen", () => {
    broadcastSystemLifecycle("lock-screen");
  });
  powerMonitor.on("suspend", () => {
    broadcastSystemLifecycle("suspend");
  });
  powerMonitor.on("shutdown", () => {
    broadcastSystemLifecycle("shutdown");
  });
  powerMonitor.on("resume", () => {
    broadcastSystemLifecycle("resume");
  });
}

app.whenReady().then(() => {
  showDockIcon();
  updateApplicationMenu();

  createDashboardWindow();
  createCompanionWindow();
  createCompanionPanelWindow();
  createTray();
  startActivityMonitor();
  startSystemLifecycleMonitor();
});

app.on("activate", showDashboard);

app.on("before-quit", () => {
  broadcastSystemLifecycle("quit");
  app.isQuitting = true;
  stopVoice();
});

ipcMain.handle("dashboard:show", () => {
  showDashboard();
});

ipcMain.handle("companion:hide", () => {
  companionWindow?.hide();
  companionPanelWindow?.hide();
  companionExpanded = false;
  companionHoverState = { avatar: false, panel: false };
  clearHoverCloseTimer();
  sendCompanionExpanded();
});

ipcMain.handle("companion:moveBy", (_event, delta) => {
  if (!companionWindow || companionWindow.isDestroyed()) return;
  const bounds = companionWindow.getBounds();
  const nextBounds = {
    ...bounds,
    x: bounds.x + Math.round(delta?.x || 0),
    y: bounds.y + Math.round(delta?.y || 0)
  };
  companionWindow.setBounds(visibleCompanionBounds(nextBounds), false);
  positionCompanionPanel();
  saveCompanionBounds();
});

ipcMain.handle("companion:setExpanded", (_event, expanded) => {
  const shouldExpand = Boolean(expanded);
  if (!companionWindow || companionWindow.isDestroyed()) return { expanded: false };
  if (companionExpanded === shouldExpand) return { expanded: companionExpanded };
  if (!companionPanelWindow || companionPanelWindow.isDestroyed()) createCompanionPanelWindow();
  if (shouldExpand) {
    showCompanionPanel();
  } else {
    hideCompanionPanel();
  }
  saveCompanionBounds();
  return { expanded: companionExpanded };
});

ipcMain.handle("companion:hover", (_event, source, hovering) => {
  updateCompanionHover(source, hovering);
  return { expanded: companionExpanded };
});

ipcMain.handle("companion:notify", (_event, message) => {
  notify(message);
});

ipcMain.handle("breakLock:start", (_event, payload) => {
  startBreakLock(payload);
});

ipcMain.handle("breakLock:done", (_event, payload) => {
  finishBreakLock(payload);
});

ipcMain.handle("voice:speak", (_event, payload) => speak(payload));

ipcMain.handle("voice:stop", () => {
  stopVoice();
  return { ok: true };
});

ipcMain.handle("state:publish", (_event, state) => {
  broadcastState(state);
});

ipcMain.handle("permissions:status", () => ({
  accessibilityTrusted: hasAccessibilityPermission(),
  platform: process.platform
}));

ipcMain.handle("permissions:openAccessibility", () => {
  openAccessibilitySettings();
});

ipcMain.handle("desktopSettings:get", () => getDesktopSettings());

ipcMain.handle("desktopSettings:setLaunchAtLogin", (_event, enabled) => ({
  ...getDesktopSettings(),
  launchAtLogin: setLaunchAtLogin(enabled)
}));
