const { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, Notification, clipboard, powerMonitor, screen, shell, systemPreferences } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { execFile } = require("node:child_process");

let dashboardWindow;
let companionWindow;
let companionPanelWindow;
let breakLockWindow;
let tray;
let breakLockCanClose = false;
const debugCapture = Boolean(process.env.EYEFLOW_DEBUG_CAPTURE);
const debugCaptureDir = process.env.EYEFLOW_DEBUG_CAPTURE_DIR || "/private/tmp";
const debugDashboardView = String(process.env.EYEFLOW_DEBUG_VIEW || "");
const debugCopyFeedback = Boolean(process.env.EYEFLOW_DEBUG_COPY_FEEDBACK);
const debugOnboarding = Boolean(process.env.EYEFLOW_DEBUG_ONBOARDING);
const debugForcePreview = Boolean(process.env.EYEFLOW_DEBUG_FORCE_PREVIEW);
const debugRestClick = Boolean(process.env.EYEFLOW_DEBUG_REST_CLICK);
const debugRestState = Boolean(process.env.EYEFLOW_DEBUG_REST_STATE || debugRestClick);
let debugForcePreviewVoiceBefore = null;
let companionExpanded = false;
let companionHoverState = { avatar: false, panel: false };
let latestPanelSide = "right";
let latestPanelAnchorY = "center";
let lastAutoPanelAt = 0;
let lastAutoNotifyAt = 0;
let lastInterventionLevel = 1;
let autoPanelTimer = null;
let hoverOpenTimer = null;
let hoverCloseTimer = null;
let panelReadyShowPending = false;
let companionVisibilityTimer = null;
let startupPanelShown = false;
let companionHiddenByLifecycle = false;
let voiceProcess = null;
let latestState = {
  mood: "calm",
  title: "Mira 很安静",
  message: "我会在旁边看着节奏，先轻轻提醒，不抢你的控制权。",
  load: 0,
  isRunning: false,
  interventionLevel: 1
};
if (debugRestState) {
  latestState = {
    mood: "rest",
    title: "Mira 想让你休息",
    message: "不用立刻停下。找一个恢复断点，看远处、眨眼，然后再回来。",
    load: 82,
    isRunning: true,
    interventionLevel: 3
  };
}
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
const diagnosticsStartedAt = new Date().toISOString();
const recentDiagnostics = [];

app.setName("EyeFlow");
app.setAppUserModelId("com.eyeflow.app");
recordDiagnostic("info", "app", "started", {
  version: app.getVersion(),
  platform: process.platform
});

process.on("uncaughtException", (error) => {
  recordDiagnostic("error", "main", "uncaught exception", {
    name: error?.name,
    message: error?.message
  });
  console.error("EyeFlow uncaught exception:", error);
});

process.on("unhandledRejection", (reason) => {
  recordDiagnostic("error", "main", "unhandled rejection", {
    message: reason?.message || reason
  });
  console.error("EyeFlow unhandled rejection:", reason);
});

const appRoot = __dirname;
const companionSizes = {
  compact: { width: 86, height: 86 },
  panel: { width: 272, height: 116 }
};
const hoverOpenDelay = 120;
const hoverCloseDelay = 1600;

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

function attachWebDiagnostics(win, label) {
  if (!win || win.isDestroyed()) return;
  win.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    recordDiagnostic("warn", label, "load failed", {
      errorCode,
      errorDescription,
      url: validatedURL
    });
    console.warn(`[EyeFlow:${label}] load failed`, errorCode, errorDescription, validatedURL);
  });
  win.webContents.on("render-process-gone", (_event, details) => {
    recordDiagnostic("error", label, "renderer gone", details);
    console.warn(`[EyeFlow:${label}] renderer gone`, details);
  });
  win.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    if (level < 2) return;
    recordDiagnostic(level >= 3 ? "error" : "warn", label, message, {
      line,
      source: path.basename(String(sourceId || ""))
    });
    console.warn(`[EyeFlow:${label}] ${message} (${sourceId}:${line})`);
  });
}

function sanitizeDiagnosticDetail(detail) {
  if (!detail || typeof detail !== "object") return {};
  return Object.fromEntries(Object.entries(detail).slice(0, 6).map(([key, value]) => [
    String(key).slice(0, 32),
    String(value === undefined || value === null ? "" : value).slice(0, 180)
  ]));
}

function recordDiagnostic(level, scope, message, detail = {}) {
  recentDiagnostics.push({
    at: new Date().toISOString(),
    level: String(level || "info").slice(0, 12),
    scope: String(scope || "app").slice(0, 32),
    message: String(message || "").replace(/\s+/g, " ").trim().slice(0, 240),
    detail: sanitizeDiagnosticDetail(detail)
  });
  while (recentDiagnostics.length > 20) recentDiagnostics.shift();
}

function diagnosticsSnapshot() {
  return {
    version: app.getVersion(),
    platform: process.platform,
    startedAt: diagnosticsStartedAt,
    items: recentDiagnostics.slice(-8)
  };
}

function captureDebugPage(win, label, delayMs = 600) {
  if (!debugCapture || !win || win.isDestroyed()) return;
  const outputPath = path.join(debugCaptureDir, `eyeflow-${label}-capture.png`);
  setTimeout(() => {
    if (!win || win.isDestroyed()) return;
    win.webContents.capturePage().then((image) => {
      fs.mkdirSync(debugCaptureDir, { recursive: true });
      fs.writeFileSync(outputPath, image.toPNG());
      console.log(`[EyeFlow:${label}] capture saved`, outputPath);
    }).catch((error) => {
      console.warn(`[EyeFlow:${label}] capture failed`, error.message);
    });
  }, delayMs);
}

function captureDebugDashboardView(viewName) {
  if (!debugCapture || !debugDashboardView || !dashboardWindow || dashboardWindow.isDestroyed()) return;
  if (!/^[a-z-]+$/i.test(viewName)) return;
  setTimeout(() => {
    if (!dashboardWindow || dashboardWindow.isDestroyed()) return;
    dashboardWindow.webContents.executeJavaScript(`(async () => {
      const button = document.querySelector('[data-view-target="${viewName}"]');
      const targetView = document.querySelector("#${viewName}");
      const enforceView = () => {
        if (!targetView) return;
        document.querySelectorAll(".view").forEach((view) => {
          view.hidden = view !== targetView;
        });
        document.querySelectorAll("[data-view-target]").forEach((navButton) => {
          navButton.classList.toggle("active", navButton.dataset.viewTarget === "${viewName}");
        });
        const titles = {
          todayView: ["今天", typeof statusCopy === "function" ? statusCopy(typeof computeEyeLoad === "function" ? computeEyeLoad() : 0, false) : ""],
          rhythmView: ["设置", "先选打扰边界，需要时再展开更多设置。"],
          profileView: ["复盘", "看见 Mira 帮你保留下来的低打扰恢复节奏。"]
        };
        const copy = titles["${viewName}"];
        if (copy) {
          const pageTitle = document.querySelector("#pageTitle");
          const statusText = document.querySelector("#statusText");
          if (pageTitle) pageTitle.textContent = copy[0];
          if (statusText) statusText.textContent = copy[1];
        }
      };
      if (button) {
        button.click();
        enforceView();
      } else if (targetView) {
        enforceView();
        if (typeof render === "function") render();
      } else {
        return { ok: false, reason: "missing view" };
      }
      window.setTimeout(enforceView, 160);
      document.querySelector("#onboardingOverlay")?.classList.remove("show");
      let feedbackProbe = null;
      if (${debugCopyFeedback ? "true" : "false"} && typeof buildFeedbackTemplate === "function") {
        const feedbackText = buildFeedbackTemplate();
        const result = await window.eyeflowDesktop?.copyFeedbackText?.(feedbackText);
        feedbackProbe = {
          copied: Boolean(result?.ok),
          length: feedbackText.length,
          preview: feedbackText.slice(0, 40)
        };
      }
      return {
        ok: true,
        activeText: button?.textContent?.trim() || "${viewName}",
        onboardingHidden: !document.querySelector("#onboardingOverlay")?.classList.contains("show"),
        feedbackProbe,
        visibleView: Array.from(document.querySelectorAll(".view"))
          .find((view) => !view.hidden)?.id || ""
      };
    })()`).then((result) => {
      console.log("[EyeFlow:debug] dashboard view", result);
      captureDebugPage(dashboardWindow, `dashboard-${viewName}`);
    }).catch((error) => {
      console.warn("[EyeFlow:debug] dashboard view failed", error.message);
    });
  }, 900);
}

function captureDebugOnboarding() {
  if (!debugCapture || !debugOnboarding || !dashboardWindow || dashboardWindow.isDestroyed()) return;
  setTimeout(() => {
    if (!dashboardWindow || dashboardWindow.isDestroyed()) return;
    dashboardWindow.webContents.executeJavaScript(`(() => {
      if (typeof showOnboarding !== "function") return { ok: false, reason: "missing showOnboarding" };
      showOnboarding();
      return new Promise((resolve) => {
        window.setTimeout(() => {
          const overlay = document.querySelector("#onboardingOverlay");
          const actions = document.querySelector(".onboarding-actions");
          const primaryAction = document.querySelector("#startOnboardingBtn");
          const pill = document.querySelector(".mira-intro .state-label");
          const role = document.querySelector("#onboardingMiraRoleTitle");
          const check = document.querySelector("#onboardingCheckTitle");
          const next = document.querySelector("#onboardingNextTitle");
          const rectFor = (element) => {
            if (!element) return null;
            const rect = element.getBoundingClientRect();
            return {
              left: Math.round(rect.left),
              top: Math.round(rect.top),
              right: Math.round(rect.right),
              bottom: Math.round(rect.bottom),
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            };
          };
          const actionRect = rectFor(primaryAction);
          const roleRect = rectFor(role);
          const checkRect = rectFor(check);
          const nextRect = rectFor(next);
          resolve({
            ok: true,
            onboardingVisible: overlay?.classList.contains("show") || false,
            pillText: pill?.textContent?.trim() || "",
            primaryActionText: primaryAction?.textContent?.trim() || "",
            primaryActionVisible: Boolean(actionRect)
              && actionRect.left >= 0
              && actionRect.top >= 0
              && actionRect.right <= window.innerWidth
              && actionRect.bottom <= window.innerHeight,
            primaryActionSticky: window.getComputedStyle(actions || document.body).position === "sticky",
            sectionsOrdered: Boolean(roleRect && checkRect && nextRect)
              && roleRect.top < checkRect.top
              && checkRect.top <= nextRect.top,
            actionRect,
            viewport: {
              width: window.innerWidth,
              height: window.innerHeight
            }
          });
        }, 520);
      });
    })()`).then((result) => {
      console.log("[EyeFlow:debug] onboarding", JSON.stringify(result));
      captureDebugPage(dashboardWindow, "dashboard-onboarding", 120);
    }).catch((error) => {
      console.warn("[EyeFlow:debug] onboarding failed", error.message);
    });
  }, 1700);
}

function runDebugForcePreview() {
  if (!debugForcePreview || !dashboardWindow || dashboardWindow.isDestroyed()) return;
  const startDelay = debugRestClick ? 3600 : 1400;
  setTimeout(() => {
    if (!dashboardWindow || dashboardWindow.isDestroyed()) return;
    dashboardWindow.webContents.executeJavaScript(`(() => {
      if (!window.eyeflowDesktop?.startForceBreak) {
        return { ok: false, reason: "missing desktop force break bridge" };
      }
      const mode = state.settings.recoveryMode || "mixed";
      const voiceChecked = Boolean(document.querySelector("#forceVoiceGuideToggle")?.checked);
      const tasks = typeof recoveryTasksForMode === "function"
        ? recoveryTasksForMode(mode)
        : [];
      window.eyeflowDesktop.startForceBreak({
        seconds: 15,
        preview: true,
        voiceGuide: false,
        recoveryMode: mode,
        tasks,
        title: "Mira 带你离开屏幕一下",
        copy: "这是 15 秒预览，不会计入今日休息。你可以感受一下恢复画面的节奏。"
      });
      return { ok: true, mode, taskCount: tasks.length, voiceChecked };
    })()`).then((result) => {
      if (typeof result?.voiceChecked === "boolean") {
        debugForcePreviewVoiceBefore = result.voiceChecked;
      }
      console.log("[EyeFlow:debug] force preview", result);
    }).catch((error) => {
      console.warn("[EyeFlow:debug] force preview failed", error.message);
    });
  }, startDelay);
  setTimeout(() => {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (!breakLockWindow || breakLockWindow.isDestroyed()) {
        clearInterval(timer);
        return;
      }
      breakLockWindow.webContents.executeJavaScript(`(() => {
        const button = document.querySelector("#doneBtn");
        if (!button || button.hidden) return { ok: false, reason: "return button unavailable" };
        return { ok: true, text: button.textContent.trim() };
      })()`).then((result) => {
        if (result?.ok) {
          clearInterval(timer);
          console.log("[EyeFlow:debug] force return ready", { ...result, attempts });
          captureDebugPage(breakLockWindow, "break-lock-complete");
          setTimeout(() => {
            if (!breakLockWindow || breakLockWindow.isDestroyed()) return;
            breakLockWindow.webContents.executeJavaScript(`(() => {
              const button = document.querySelector("#doneBtn");
              if (!button || button.hidden) return { ok: false, reason: "return button unavailable" };
              button.click();
              return { ok: true, text: button.textContent.trim() };
            })()`).then((clickResult) => {
              console.log("[EyeFlow:debug] force return", { ...clickResult, attempts });
            }).catch((error) => {
              console.warn("[EyeFlow:debug] force return click failed", error.message);
            });
          }, 1200);
          return;
        }
        if (attempts >= 18) {
          clearInterval(timer);
          console.log("[EyeFlow:debug] force return unavailable", { ...result, attempts });
        }
      }).catch((error) => {
        clearInterval(timer);
        console.warn("[EyeFlow:debug] force return failed", error.message);
      });
    }, 700);
  }, 18000);
}

function runDebugRestClick() {
  if (!debugRestClick || !companionWindow || companionWindow.isDestroyed()) return;
  setTimeout(() => {
    if (!companionWindow || companionWindow.isDestroyed()) return;
    companionWindow.webContents.send("state:update", latestState);
    setTimeout(() => runDebugRestClickScript(), 350);
  }, debugOnboarding ? 5200 : 1200);
}

function runDebugRestClickScript() {
  if (!debugRestClick || !companionWindow || companionWindow.isDestroyed()) return;
  companionWindow.webContents.executeJavaScript(`(() => {
    const pet = document.querySelector(".pet");
    if (!pet) return { clicked: false, reason: "missing pet" };
    const rect = pet.getBoundingClientRect();
    const eventBase = {
      bubbles: true,
      cancelable: true,
      button: 0,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
      screenX: window.screenX + rect.left + rect.width / 2,
      screenY: window.screenY + rect.top + rect.height / 2
    };
    pet.dispatchEvent(new MouseEvent("mousedown", { ...eventBase, buttons: 1 }));
    pet.dispatchEvent(new MouseEvent("mouseup", { ...eventBase, buttons: 0 }));
    return {
      clicked: true,
      className: document.querySelector(".companion")?.className || "",
      message: document.querySelector("#message")?.textContent || ""
    };
  })()`).then((result) => {
    console.log("[EyeFlow:debug] rest click", result);
  }).catch((error) => {
    console.warn("[EyeFlow:debug] rest click failed", error.message);
  });
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
    copyright: "Local-first eye-care companion",
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

function visibleDashboardBounds(bounds) {
  const displays = screen.getAllDisplays();
  const fallbackArea = displays[0]?.workArea || { x: 0, y: 0, width: 1440, height: 900 };
  const safeBounds = {
    width: Math.max(1120, Math.round(Number(bounds.width) || 1320)),
    height: Math.max(760, Math.round(Number(bounds.height) || 840)),
    x: Number.isFinite(bounds.x) ? Math.round(bounds.x) : fallbackArea.x + 80,
    y: Number.isFinite(bounds.y) ? Math.round(bounds.y) : fallbackArea.y + 80
  };
  const display = screen.getDisplayMatching(safeBounds);
  const area = display?.workArea || fallbackArea;
  const padding = 18;
  const width = Math.min(safeBounds.width, area.width - padding * 2);
  const height = Math.min(safeBounds.height, area.height - padding * 2);
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
  return visibleDashboardBounds(bounds);
}

function saveDashboardBounds() {
  if (!dashboardWindow || dashboardWindow.isDestroyed()) return;
  if (dashboardWindow.isMinimized() || !dashboardWindow.isVisible()) return;
  writeSettings({ ...readSettings(), dashboardBounds: dashboardWindow.getBounds() });
}

function keepDashboardVisible() {
  if (!dashboardWindow || dashboardWindow.isDestroyed()) return;
  if (dashboardWindow.isMinimized()) dashboardWindow.restore();
  dashboardWindow.setBounds(visibleDashboardBounds(dashboardWindow.getBounds()), false);
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
  const visible = visiblePanelBounds({ ...panel, x, y });
  const pointerY = icon.y + Math.round(icon.height / 2) - visible.y;
  latestPanelAnchorY = pointerY < 36
    ? "top"
    : pointerY > visible.height - 36
      ? "bottom"
      : "center";
  return visible;
}

function sendPanelSide() {
  if (!companionPanelWindow || companionPanelWindow.isDestroyed()) return;
  companionPanelWindow.webContents.send("panel:side", {
    side: latestPanelSide,
    anchorY: latestPanelAnchorY
  });
}

function sendCompanionExpanded() {
  if (!companionWindow || companionWindow.isDestroyed()) return;
  companionWindow.webContents.send("companion:expanded", companionExpanded);
}

function clearHoverOpenTimer() {
  if (!hoverOpenTimer) return;
  clearTimeout(hoverOpenTimer);
  hoverOpenTimer = null;
}

function clearHoverCloseTimer() {
  if (!hoverCloseTimer) return;
  clearTimeout(hoverCloseTimer);
  hoverCloseTimer = null;
}

function scheduleHoverOpenFromMain() {
  clearHoverOpenTimer();
  hoverOpenTimer = setTimeout(() => {
    hoverOpenTimer = null;
    if (companionHoverState.avatar) {
      showCompanionPanel();
    }
  }, hoverOpenDelay);
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
    if (source === "avatar" && !companionExpanded) {
      scheduleHoverOpenFromMain();
    } else if (companionExpanded) {
      if (!companionPanelWindow || companionPanelWindow.isDestroyed()) createCompanionPanelWindow();
      showCompanionPanelWhenReady();
    }
  } else {
    if (source === "avatar") clearHoverOpenTimer();
    scheduleHoverClose();
  }
}

function positionCompanionPanel() {
  if (!companionPanelWindow || companionPanelWindow.isDestroyed()) return;
  companionPanelWindow.setBounds(panelBoundsForCompanion(), false);
  sendPanelSide();
}

function bringCompanionToFront(win) {
  if (!win || win.isDestroyed()) return;
  win.setAlwaysOnTop(true, "floating");
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false });
  win.moveTop();
}

function revealCompanionWindow({ reset = false, focus = false } = {}) {
  if (!companionWindow || companionWindow.isDestroyed()) createCompanionWindow();
  if (!companionWindow || companionWindow.isDestroyed()) return;
  companionHiddenByLifecycle = false;
  if (reset) {
    const display = screen.getPrimaryDisplay();
    const area = display.workArea;
    companionWindow.setBounds(visibleCompanionBounds({
      ...companionSizes.compact,
      x: area.x + area.width - companionSizes.compact.width - 28,
      y: area.y + area.height - companionSizes.compact.height - 28
    }), false);
  } else {
    keepCompanionVisible();
  }
  companionWindow.showInactive();
  bringCompanionToFront(companionWindow);
  if (focus) companionWindow.focus();
  saveCompanionBounds();
}

function ensureCompanionReachable() {
  if (!companionWindow || companionWindow.isDestroyed()) return;
  keepCompanionVisible();
  if (!companionWindow.isVisible()) return;
  bringCompanionToFront(companionWindow);
  if (companionExpanded) {
    positionCompanionPanel();
    if (companionPanelWindow && !companionPanelWindow.isDestroyed()) {
      companionPanelWindow.showInactive();
      bringCompanionToFront(companionPanelWindow);
    }
  }
}

function startCompanionVisibilityMonitor() {
  if (companionVisibilityTimer) return;
  companionVisibilityTimer = setInterval(ensureCompanionReachable, 30 * 1000);
}

function hideWindowIfAlive(win) {
  if (!win || win.isDestroyed()) return;
  win.hide();
}

function showCompanionPanelWhenReady() {
  if (!companionPanelWindow || companionPanelWindow.isDestroyed()) return;
  positionCompanionPanel();
  if (companionPanelWindow.webContents.isLoading()) {
    if (panelReadyShowPending) return;
    panelReadyShowPending = true;
    companionPanelWindow.webContents.once("did-finish-load", () => {
      panelReadyShowPending = false;
      if (!companionExpanded || !companionPanelWindow || companionPanelWindow.isDestroyed()) return;
      positionCompanionPanel();
      companionPanelWindow.showInactive();
      bringCompanionToFront(companionPanelWindow);
      sendCompanionExpanded();
    });
    return;
  }
  companionPanelWindow.showInactive();
  bringCompanionToFront(companionPanelWindow);
}

function showCompanionPanel() {
  if (!companionWindow || companionWindow.isDestroyed()) createCompanionWindow();
  if (!companionPanelWindow || companionPanelWindow.isDestroyed()) createCompanionPanelWindow();
  companionExpanded = true;
  clearHoverOpenTimer();
  clearHoverCloseTimer();
  revealCompanionWindow();
  showCompanionPanelWhenReady();
  sendCompanionExpanded();
}

function hideCompanionPanel() {
  companionExpanded = false;
  companionHoverState.panel = false;
  clearHoverOpenTimer();
  clearHoverCloseTimer();
  if (autoPanelTimer) {
    clearTimeout(autoPanelTimer);
    autoPanelTimer = null;
  }
  hideWindowIfAlive(companionPanelWindow);
  sendCompanionExpanded();
}

function keepCompanionVisible() {
  if (!companionWindow || companionWindow.isDestroyed()) return;
  const nextBounds = visibleCompanionBounds(companionWindow.getBounds());
  companionWindow.setBounds(nextBounds, false);
  saveCompanionBounds();
}

function resetCompanionPosition() {
  companionExpanded = false;
  hideWindowIfAlive(companionPanelWindow);
  revealCompanionWindow({ reset: true, focus: true });
  sendCompanionExpanded();
}

function hideCompanionWindow() {
  hideWindowIfAlive(companionWindow);
  hideWindowIfAlive(companionPanelWindow);
  companionExpanded = false;
  companionHoverState = { avatar: false, panel: false };
  companionHiddenByLifecycle = false;
  clearHoverOpenTimer();
  clearHoverCloseTimer();
  sendCompanionExpanded();
}

function createDashboardWindow() {
  dashboardWindow = new BrowserWindow({
    ...dashboardWindowOptions(),
    minWidth: 1120,
    minHeight: 760,
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
  attachWebDiagnostics(dashboardWindow, "dashboard");

  dashboardWindow.loadFile(path.join(appRoot, "index.html"), debugOnboarding
    ? { query: { onboarding: "1" } }
    : undefined);

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
    captureDebugPage(dashboardWindow, "dashboard");
    captureDebugDashboardView(debugDashboardView);
    captureDebugOnboarding();
    runDebugForcePreview();
    if (debugCapture) {
      dashboardWindow.webContents.executeJavaScript(`({
        title: document.title,
        bodyClass: document.body.className,
        appText: document.querySelector(".app")?.textContent?.trim().slice(0, 80) || "",
        childCount: document.body.children.length
      })`).then((probe) => {
        console.log("[EyeFlow:dashboard] dom probe", probe);
      }).catch((error) => {
        console.warn("[EyeFlow:dashboard] dom probe failed", error.message);
      });
    }
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
  attachWebDiagnostics(companionWindow, "companion");

  companionWindow.loadFile(path.join(appRoot, "companion.html"));
  companionWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false });
  companionWindow.webContents.once("did-finish-load", () => {
    companionWindow.webContents.send("state:update", latestState);
    sendCompanionExpanded();
    captureDebugPage(companionWindow, "companion");
    revealCompanionWindow();
    runDebugRestClick();
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
  panelReadyShowPending = false;
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
  attachWebDiagnostics(companionPanelWindow, "companion-panel");

  companionPanelWindow.loadFile(path.join(appRoot, "companion-panel.html"));
  companionPanelWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false });
  companionPanelWindow.webContents.once("did-finish-load", () => {
    companionPanelWindow.webContents.send("state:update", latestState);
    sendPanelSide();
    captureDebugPage(companionPanelWindow, "companion-panel");
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
    { label: "隐藏 Mira", click: hideCompanionWindow },
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

function sendDashboardRestGuide() {
  if (!dashboardWindow || dashboardWindow.isDestroyed()) return;
  dashboardWindow.webContents.send("dashboard:restGuide", {
    at: Date.now(),
    mood: latestState.mood || "calm",
    interventionLevel: Number(latestState.interventionLevel || 1),
    load: Number(latestState.load || 0)
  });
  captureDebugPage(dashboardWindow, "dashboard-rest-guide");
}

function showDashboard(options = {}) {
  showDockIcon();
  if (!dashboardWindow) createDashboardWindow();
  keepDashboardVisible();
  dashboardWindow.show();
  dashboardWindow.focus();
  if (process.platform === "darwin") app.focus({ steal: true });
  if (options?.restGuide) {
    if (dashboardWindow.webContents.isLoading()) {
      dashboardWindow.webContents.once("did-finish-load", sendDashboardRestGuide);
    } else {
      setTimeout(sendDashboardRestGuide, 120);
    }
  }
}

function showCompanion() {
  revealCompanionWindow({ focus: true });
}

function notify(message) {
  if (!Notification.isSupported()) {
    return { ok: false, supported: false };
  }
  new Notification({
    title: "Mira",
    body: message
  }).show();
  return { ok: true, supported: true };
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
  const child = execFile("say", ["-r", "150", text], (error) => {
    if (error && error.killed !== true) {
      recordDiagnostic("warn", "voice", "voice guide failed", {
        message: error.message
      });
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
  const allowedMoods = new Set(["gaze", "blink", "close", "neck", "press", "breath"]);
  return tasks.slice(0, 6).map((task) => ({
    mood: allowedMoods.has(task?.mood) ? task.mood : "gaze",
    label: String(task?.label || "").slice(0, 12),
    title: String(task?.title || "").slice(0, 48),
    copy: String(task?.copy || "").slice(0, 140),
    caption: String(task?.caption || "").slice(0, 36),
    voiceCue: String(task?.voiceCue || "").slice(0, 120)
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
    captureDebugPage(breakLockWindow, "break-lock");
    if (debugCapture && payload.preview) {
      setTimeout(() => captureDebugPage(breakLockWindow, "break-lock-complete"), (seconds + 1) * 1000);
    }
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
  attachWebDiagnostics(breakLockWindow, "break-lock");

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
  breakLockWindow.webContents.once("did-finish-load", () => {
    captureDebugPage(breakLockWindow, "break-lock");
    if (debugCapture && payload.preview) {
      setTimeout(() => captureDebugPage(breakLockWindow, "break-lock-complete"), (seconds + 1) * 1000);
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
    if (debugCapture && payload.preview) {
      setTimeout(() => {
        captureDebugPage(dashboardWindow, "dashboard-force-return");
        dashboardWindow.webContents.executeJavaScript(`(() => ({
          visibleView: Array.from(document.querySelectorAll(".view"))
            .find((view) => !view.hidden)?.id || "",
          forceVoiceChecked: Boolean(document.querySelector("#forceVoiceGuideToggle")?.checked),
          previewHint: document.querySelector("#forcePreviewResult")?.hidden === false
        }))()`).then((result) => {
          console.log("[EyeFlow:debug] force return dashboard", {
            ...result,
            voicePreserved: debugForcePreviewVoiceBefore === null
              || result.forceVoiceChecked === debugForcePreviewVoiceBefore
          });
        }).catch((error) => {
          console.warn("[EyeFlow:debug] force return dashboard probe failed", error.message);
        });
      }, 900);
    }
  }
}

function broadcastState(state) {
  if (debugRestClick && latestState.mood === "rest" && state?.mood !== "rest") {
    console.log("[EyeFlow:debug] ignored non-rest state during rest-click test", state?.mood || "");
    return;
  }
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
    notify(state.message || "找一个恢复断点，看远处 20 秒。");
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
    hideWindowIfAlive(companionWindow);
    companionHiddenByLifecycle = true;
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
    setTimeout(() => {
      if (companionHiddenByLifecycle && companionWindow && !companionWindow.isDestroyed()) {
        revealCompanionWindow();
      }
    }, 1000);
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
  startCompanionVisibilityMonitor();
  screen.on("display-added", ensureCompanionReachable);
  screen.on("display-removed", ensureCompanionReachable);
  screen.on("display-metrics-changed", ensureCompanionReachable);
});

app.on("activate", showDashboard);

app.on("before-quit", () => {
  broadcastSystemLifecycle("quit");
  app.isQuitting = true;
  stopVoice();
});

ipcMain.handle("dashboard:show", (_event, options) => {
  showDashboard(options);
});

ipcMain.handle("companion:hide", () => {
  hideCompanionWindow();
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
  if (companionExpanded === shouldExpand) {
    if (shouldExpand) {
      if (!companionPanelWindow || companionPanelWindow.isDestroyed()) createCompanionPanelWindow();
      revealCompanionWindow();
      showCompanionPanelWhenReady();
    }
    return { expanded: companionExpanded };
  }
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
  return notify(message);
});

ipcMain.handle("feedback:copy", (_event, text) => {
  clipboard.writeText(String(text || "").slice(0, 12000));
  return { ok: true };
});

ipcMain.handle("diagnostics:get", () => diagnosticsSnapshot());

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
  notificationSupported: Notification.isSupported(),
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
