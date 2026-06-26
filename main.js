const { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, Notification, clipboard, powerMonitor, screen, shell, systemPreferences } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { execFile, spawnSync } = require("node:child_process");

let dashboardWindow;
let companionWindow;
let companionPanelWindow;
let breakLockWindow;
let tray;
let breakLockCanClose = false;
const currentVisualCaptureTargets = parseCurrentVisualCaptureTargets(process.env.EYEFLOW_CURRENT_CAPTURE || process.env.EYEFLOW_DEBUG_CURRENT_CAPTURE || "");
const debugCapture = Boolean(process.env.EYEFLOW_DEBUG_CAPTURE || currentVisualCaptureTargets.size);
const debugCaptureDir = process.env.EYEFLOW_DEBUG_CAPTURE_DIR || "/private/tmp";
const debugUserDataDir = process.env.EYEFLOW_USER_DATA_DIR
  || (debugCapture ? path.join(debugCaptureDir, "user-data") : "");
if (debugUserDataDir) {
  fs.mkdirSync(debugUserDataDir, { recursive: true });
  app.setPath("userData", debugUserDataDir);
}
const debugDashboardView = [
  String(process.env.EYEFLOW_DEBUG_VIEW || ""),
  wantsCurrentVisualCapture("settings-ordinary") ? "settings-ordinary" : "",
  wantsCurrentVisualCapture("rhythmView") ? "rhythmView" : "",
  wantsCurrentVisualCapture("profileView") ? "profileView" : "",
  wantsCurrentVisualCapture("profile-share-card") ? "profile-share-card" : ""
].filter(Boolean).join(",");
const debugDashboardViews = debugDashboardView
  .split(",")
  .map((viewName) => viewName.trim())
  .filter(Boolean);
const debugCopyFeedback = Boolean(process.env.EYEFLOW_DEBUG_COPY_FEEDBACK);
const debugOnboarding = Boolean(process.env.EYEFLOW_DEBUG_ONBOARDING || wantsCurrentVisualCapture("onboarding-active"));
const debugForcePreview = Boolean(process.env.EYEFLOW_DEBUG_FORCE_PREVIEW || wantsCurrentVisualCapture("break-lock-active", "force-return"));
const debugRestClick = Boolean(process.env.EYEFLOW_DEBUG_REST_CLICK);
const debugRestState = Boolean(process.env.EYEFLOW_DEBUG_REST_STATE || debugRestClick);
const debugAccessibilityTrustedOverride = debugCapture && process.env.EYEFLOW_DEBUG_ACCESSIBILITY_TRUSTED !== undefined
  ? process.env.EYEFLOW_DEBUG_ACCESSIBILITY_TRUSTED === "1"
  : null;
let debugForcePreviewVoiceBefore = null;
const debugCaptureQueues = new Map();
let companionExpanded = false;
let companionHoverState = { avatar: false, panel: false };
let companionBubbleTimer = null;
let companionBubbleBaseBounds = null;
let companionBoundsTransient = false;
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
const DASHBOARD_DEFAULT_SIZE = { width: 1280, height: 820 };
const DASHBOARD_MIN_SIZE = { width: 1120, height: 760 };
const DASHBOARD_SCREEN_PADDING = 18;
const COMPANION_VISIBILITY_PREFERENCE_VERSION = 2;
const COMPANION_EXIT_HINT_TEXT = "双击我可以退出桌面 Mira";
const COMPANION_EXIT_HINT_DURATION_MS = 3800;
const ENHANCED_DESKTOP_SENSING_PREFERENCE_VERSION = 3;
const ENHANCED_DESKTOP_SENSING_REQUEST_WINDOW_MS = 5 * 60 * 1000;
const ACCESSIBILITY_TCC_CACHE_MS = 1000;
const ACCESSIBILITY_TCC_DB = "/Library/Application Support/com.apple.TCC/TCC.db";
const ACCESSIBILITY_TCC_CLIENT = "com.eyeflow.app";
let accessibilityTccCache = { checkedAt: 0, trusted: false };
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
  bubble: { width: 390, height: 104 },
  panel: { width: 292, height: 142 }
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

function markCompanionExitHintShown(settings = readSettings()) {
  if (settings.companionExitHintShown === true) return settings;
  const next = {
    ...settings,
    companionExitHintShown: true
  };
  writeSettings(next);
  return next;
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

function parseCurrentVisualCaptureTargets(input) {
  const aliases = {
    today: "todayView",
    todayView: "todayView",
    "today-session": "today-session",
    "today-session-settings": "today-session-settings",
    "today-auto-tracking": "today-auto-tracking",
    todaySession: "today-session",
    todaySessionSettings: "today-session-settings",
    todayAutoTracking: "today-auto-tracking",
    session: "today-session",
    sessionSettings: "today-session-settings",
    settings: "rhythmView",
    "settings-ordinary": "settings-ordinary",
    settingsOrdinary: "settings-ordinary",
    rhythm: "rhythmView",
    rhythmView: "rhythmView",
    profile: "profileView",
    recap: "profileView",
    profileView: "profileView",
    "profile-share-card": "profile-share-card",
    profileShareCard: "profile-share-card",
    onboarding: "onboarding-active",
    "onboarding-active": "onboarding-active",
    "mira-panel": "companion-panel",
    "companion-panel": "companion-panel",
    panel: "companion-panel",
    "break-lock": "break-lock-active",
    "break-lock-active": "break-lock-active",
    breakLock: "break-lock-active",
    "force-return": "force-return",
    forceReturn: "force-return"
  };
  const requested = String(input || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const targets = new Set();
  requested.forEach((item) => {
    if (item === "all") {
      [
        "todayView",
        "today-session",
        "today-session-settings",
        "today-auto-tracking",
        "rhythmView",
        "settings-ordinary",
        "profileView",
        "profile-share-card",
        "onboarding-active",
        "companion-panel",
        "break-lock-active",
        "force-return"
      ].forEach((target) => targets.add(target));
      return;
    }
    if (aliases[item]) targets.add(aliases[item]);
  });
  return targets;
}

function wantsCurrentVisualCapture(...targets) {
  return targets.some((target) => currentVisualCaptureTargets.has(target));
}

function debugCaptureFilename(label) {
  return ({
    dashboard: "eyeflow-dashboard-initial.png",
    "dashboard-session": "eyeflow-dashboard-session.png",
    "dashboard-session-settings": "eyeflow-dashboard-session-settings.png",
    "dashboard-auto-tracking": "eyeflow-dashboard-auto-tracking.png",
    "dashboard-onboarding": "eyeflow-onboarding-active.png",
    "dashboard-rhythmView": "eyeflow-settings-clean.png",
    "dashboard-settings-ordinary": "eyeflow-settings-ordinary.png",
    "dashboard-profileView": "eyeflow-profile-clean.png",
    "dashboard-profile-share-card": "eyeflow-profile-share-card.png",
    "dashboard-rest-guide": "eyeflow-rest-guide.png",
    "dashboard-force-return": "eyeflow-force-return.png",
    companion: "eyeflow-companion.png",
    "companion-panel": "eyeflow-companion-panel.png",
    "break-lock": "eyeflow-break-lock-active.png",
    "break-lock-complete": "eyeflow-break-lock-complete.png"
  })[label] || `eyeflow-${label}.png`;
}

function debugCaptureMetadataPath(outputPath) {
  return outputPath.replace(/\.png$/i, ".metadata.json");
}

function captureStateFor(label, options = {}) {
  if (options.captureState) return options.captureState;
  if (options.onboardingVisible) return "onboarding active";
  if (options.restGuide) return "rest guide active";
  if (label === "break-lock") return "break-lock active";
  if (label === "break-lock-complete" || label === "dashboard-force-return") return "force-return";
  if (label === "companion-panel") return "companion panel";
  if (label === "companion") return "companion avatar";
  return "default";
}

function expectedVisibleViewFor(options = {}) {
  if (options.expectedVisibleView !== undefined) return options.expectedVisibleView;
  return ["todayView", "rhythmView", "profileView"].includes(options.requestedView)
    ? options.requestedView
    : undefined;
}

function currentCaptureMismatches(metadata, options = {}) {
  const mismatches = [];
  const expectedVisibleView = expectedVisibleViewFor(options);
  if (expectedVisibleView !== undefined && metadata.visibleView !== expectedVisibleView) {
    mismatches.push(`visibleView=${metadata.visibleView || "missing"} expected ${expectedVisibleView || "empty"}`);
  }
  if (options.expectedOnboardingVisible !== undefined && metadata.onboardingVisible !== options.expectedOnboardingVisible) {
    mismatches.push(`onboardingVisible=${metadata.onboardingVisible} expected ${options.expectedOnboardingVisible}`);
  }
  if (options.expectedBreakOverlayVisible !== undefined && metadata.breakOverlayVisible !== options.expectedBreakOverlayVisible) {
    mismatches.push(`breakOverlayVisible=${metadata.breakOverlayVisible} expected ${options.expectedBreakOverlayVisible}`);
  }
  for (const text of options.requiredText || []) {
    if (!String(metadata.mainTextSnapshot || "").includes(text)) {
      mismatches.push(`mainTextSnapshot missing ${JSON.stringify(text)}`);
    }
  }
  if (options.expectedEqualReadinessActionButtons) {
    const metrics = metadata.readinessActionButtonMetrics;
    if (!metrics?.permission || !metrics?.companion) {
      mismatches.push("readiness action button metrics are missing");
    } else if (!metrics.sameWidth || !metrics.sameHeight) {
      mismatches.push(`readiness action button size mismatch ${JSON.stringify(metrics)}`);
    }
  }
  if (!metadata.mainTextSnapshot) {
    mismatches.push("mainTextSnapshot is empty");
  }
  return mismatches;
}

function logCurrentCaptureBasis(metadata, outputPath) {
  console.log("[EyeFlow:current-capture] 本次评分基于：");
  console.log(`[EyeFlow:current-capture] 截图：${outputPath}`);
  console.log(`[EyeFlow:current-capture] 时间：${metadata.timestamp}`);
  console.log(`[EyeFlow:current-capture] visibleView：${metadata.visibleView}`);
  console.log(`[EyeFlow:current-capture] 状态：${metadata.captureState}`);
}

function debugCaptureProbeScript(options = {}) {
  return `(async () => {
    const waitFrame = () => new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
    await waitFrame();
    await waitFrame();
    await new Promise((resolve) => window.setTimeout(resolve, ${Number(options.settleMs || 120)}));
    await waitFrame();
    const isVisible = (element) => {
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return style.display !== "none"
        && style.visibility !== "hidden"
        && rect.width > 0
        && rect.height > 0
        && rect.bottom > 0
        && rect.top < window.innerHeight
        && rect.right > 0
        && rect.left < window.innerWidth;
    };
    const visibleView = Array.from(document.querySelectorAll(".view"))
      .find((view) => !view.hidden)?.id || "";
    const onboardingOverlay = document.querySelector("#onboardingOverlay");
    const onboardingVisible = Boolean(onboardingOverlay?.classList.contains("show")) && isVisible(onboardingOverlay);
    const breakOverlay = document.querySelector("#breakOverlay");
    const breakOverlayVisible = Boolean(breakOverlay?.classList.contains("show")) && isVisible(breakOverlay);
    const measureButton = (selector) => {
      const element = document.querySelector(selector);
      if (!isVisible(element)) return null;
      const rect = element.getBoundingClientRect();
      return {
        width: Math.round(rect.width * 100) / 100,
        height: Math.round(rect.height * 100) / 100
      };
    };
    const permissionAction = measureButton("#readinessPermissionBtn");
    const companionAction = measureButton("#readinessCompanionBtn");
    const readinessActionButtonMetrics = {
      permission: permissionAction,
      companion: companionAction,
      sameWidth: Boolean(permissionAction && companionAction && Math.abs(permissionAction.width - companionAction.width) <= 0.5),
      sameHeight: Boolean(permissionAction && companionAction && Math.abs(permissionAction.height - companionAction.height) <= 0.5)
    };
    const textRoot = breakOverlayVisible
      ? breakOverlay
      : onboardingVisible
      ? onboardingOverlay
      : (visibleView ? document.querySelector("#" + CSS.escape(visibleView)) : null)
        || document.querySelector("main")
        || document.body;
    const mainTextSnapshot = Array.from(textRoot.querySelectorAll("h1, h2, h3, h4, p, span, strong, button, summary, small, label"))
      .filter(isVisible)
      .map((element) => (element.textContent || "").trim())
      .filter(Boolean)
      .join(" ")
      .replace(/\\s+/g, " ")
      .slice(0, 2400);
    return {
      requestedView: ${JSON.stringify(options.requestedView || "")},
      visibleView,
      pageTitle: document.querySelector("#pageTitle")?.textContent?.trim() || document.title || "",
      activeNav: document.querySelector(".nav button.active")?.textContent?.trim() || "",
      onboardingVisible,
      breakOverlayVisible,
      readinessActionButtonMetrics,
      mainTextSnapshot,
      bodyClass: document.body.className || "",
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };
  })()`;
}

function debugPrepareCaptureScript(options = {}) {
  if (!options.requestedView || !/^[a-z-]+$/i.test(options.requestedView)) {
    return "Promise.resolve({ ok: true, skipped: true })";
  }
  const captureTheme = process.env.EYEFLOW_DEBUG_CAPTURE_THEME === "dark" ? "dark" : "";
  return `(async () => {
    const requestedView = ${JSON.stringify(options.requestedView)};
    const captureTheme = ${JSON.stringify(captureTheme)};
    if (captureTheme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    }
    const targetView = document.querySelector("#" + CSS.escape(requestedView));
    if (!targetView) return { ok: false, reason: "missing requested view", requestedView };
    if (typeof switchView === "function") {
      switchView(requestedView);
    }
    document.querySelectorAll(".view").forEach((view) => {
      view.hidden = view !== targetView;
    });
    document.querySelectorAll("[data-view-target]").forEach((navButton) => {
      navButton.classList.toggle("active", navButton.dataset.viewTarget === requestedView);
    });
    if (${options.onboardingVisible === true ? "true" : "false"}) {
      if (typeof showOnboarding === "function") showOnboarding();
      document.querySelector("#onboardingOverlay")?.classList.add("show", "debug-capture");
    } else {
      document.querySelector("#onboardingOverlay")?.classList.remove("show");
    }
    const titles = {
      todayView: ["今天", typeof statusCopy === "function" ? statusCopy(typeof computeEyeLoad === "function" ? computeEyeLoad() : 0, false) : ""],
      rhythmView: ["设置", "先选提醒边界，需要时再展开更多设置。"],
      profileView: ["这几天", "Mira 帮你理解今天状态和下一轮节奏。"]
    };
    const copy = titles[requestedView];
    if (copy) {
      const pageTitle = document.querySelector("#pageTitle");
      const statusText = document.querySelector("#statusText");
      if (pageTitle) pageTitle.textContent = copy[0];
      if (statusText) statusText.textContent = copy[1];
    }
    if (${options.restGuide === true ? "true" : "false"}) {
      const sessionPanel = document.querySelector("#sessionPanel");
      const restGuideHint = document.querySelector("#restGuideHint");
      sessionPanel?.classList.add("rest-guide");
      if (restGuideHint) restGuideHint.hidden = false;
      if (typeof showBreak === "function") showBreak("manual");
    }
    if (${options.sessionActive === true ? "true" : "false"}) {
      document.querySelector("#onboardingOverlay")?.classList.remove("show", "debug-capture");
      if (typeof todayKey === "function") {
        state.currentDay = todayKey();
        state.lastAssessmentDay = todayKey();
      }
      state.onboardingDismissed = true;
      state.initialAssessmentDone = true;
      if (!Number(state.focusTarget)) state.focusTarget = 50;
      if (!Number(state.breakTarget)) state.breakTarget = 120;
      if (typeof render === "function") render();
      if (typeof startSession === "function") startSession();
      if (typeof render === "function") render();
      document.querySelector("#sessionPanel")?.scrollIntoView({ behavior: "auto", block: "center", inline: "nearest" });
    }
    if (${options.autoTracking === true ? "true" : "false"}) {
      document.querySelector("#onboardingOverlay")?.classList.remove("show", "debug-capture");
      if (typeof todayKey === "function") {
        state.currentDay = todayKey();
        state.lastAssessmentDay = todayKey();
      }
      state.onboardingDismissed = true;
      state.initialAssessmentDone = true;
      elapsedSeconds = Math.max(Number(elapsedSeconds || state.elapsedSeconds || 0), 75);
      startedAt = null;
      isRunning = false;
      sessionSource = "auto";
      state.sessionSource = "auto";
      if (typeof window.__eyeflowDebugSetAutoTracking === "function") {
        window.__eyeflowDebugSetAutoTracking();
      }
      if (typeof render === "function") render();
      document.body.classList.add("session-active");
      const stateHeadline = document.querySelector("#stateHeadline");
      const stateAction = document.querySelector("#stateAction");
      const sessionPanelTitle = document.querySelector("#sessionPanelTitle");
      const sessionPill = document.querySelector("#sessionStatePill");
      const timerHint = document.querySelector("#timerHint");
      const startBtnText = document.querySelector("#startBtnText");
      if (stateHeadline) stateHeadline.textContent = "Mira 正在自动记录";
      if (stateAction) stateAction.textContent = "看到你已经开始工作，50 分钟后轻提醒。";
      if (sessionPanelTitle) sessionPanelTitle.textContent = "本轮节奏";
      if (sessionPill) sessionPill.textContent = "自动记录";
      if (timerHint) timerHint.textContent = "自动记录中";
      if (startBtnText) startBtnText.textContent = "手动专注";
      document.querySelector("#sessionPanel")?.scrollIntoView({ behavior: "auto", block: "center", inline: "nearest" });
    }
    if (${options.sessionSettingsOpen === true ? "true" : "false"}) {
      const settings = document.querySelector(".session-settings");
      if (settings) {
        settings.open = true;
        settings.scrollIntoView({ behavior: "auto", block: "center", inline: "nearest" });
      }
    }
    [document.scrollingElement, document.documentElement, document.body, document.querySelector("main"), document.querySelector(".app")]
      .filter(Boolean)
      .forEach((element) => {
        if (typeof element.scrollTo === "function") {
          element.scrollTo(0, 0);
        } else {
          element.scrollTop = 0;
          element.scrollLeft = 0;
        }
      });
    Array.from(document.querySelectorAll("*"))
      .filter((element) => element.scrollHeight > element.clientHeight + 2 || element.scrollWidth > element.clientWidth + 2)
      .slice(0, 80)
      .forEach((element) => {
        element.scrollTop = 0;
        element.scrollLeft = 0;
      });
    const focusSelector = ${JSON.stringify(options.focusSelector || "")};
    if (focusSelector) {
      document.querySelector(focusSelector)?.scrollIntoView({ behavior: "auto", block: "center", inline: "nearest" });
    }
    await new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
    await new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    return {
      ok: true,
      requestedView,
      visibleView: Array.from(document.querySelectorAll(".view"))
        .find((view) => !view.hidden)?.id || ""
    };
  })()`;
}

function captureDebugPage(win, label, delayMs = 600, options = {}) {
  if (!debugCapture || !win || win.isDestroyed()) return;
  const delay = typeof delayMs === "number" ? delayMs : 600;
  const captureOptions = typeof delayMs === "object" ? delayMs : options;
  setTimeout(() => {
    if (!win || win.isDestroyed()) return;
    captureDebugPageNow(win, label, captureOptions);
  }, delay);
}

function captureDebugPageNow(win, label, options = {}) {
  if (!debugCapture || !win || win.isDestroyed()) return;
  const queueKey = win.id || 0;
  const previousCapture = debugCaptureQueues.get(queueKey) || Promise.resolve();
  const nextCapture = previousCapture.then(
    () => performDebugCapture(win, label, options),
    () => performDebugCapture(win, label, options)
  );
  debugCaptureQueues.set(queueKey, nextCapture.catch(() => {}));
  return nextCapture;
}

async function performDebugCapture(win, label, options = {}) {
  if (!debugCapture || !win || win.isDestroyed()) return;
  const outputPath = path.join(debugCaptureDir, debugCaptureFilename(label));
  const metadataPath = debugCaptureMetadataPath(outputPath);
  const captureReason = options.captureReason || label;
  const captureState = captureStateFor(label, options);
  try {
    fs.mkdirSync(debugCaptureDir, { recursive: true });
    await win.webContents.executeJavaScript(debugPrepareCaptureScript(options));
    const beforeState = await win.webContents.executeJavaScript(debugCaptureProbeScript(options));
    const image = await win.webContents.capturePage();
    const afterState = await win.webContents.executeJavaScript(debugCaptureProbeScript({ ...options, settleMs: 0 }));
    const metadata = {
      filename: path.basename(outputPath),
      requestedView: beforeState?.requestedView || options.requestedView || "",
      visibleView: beforeState?.visibleView || "",
      pageTitle: beforeState?.pageTitle || "",
      activeNav: beforeState?.activeNav || "",
      onboardingVisible: Boolean(beforeState?.onboardingVisible),
      breakOverlayVisible: Boolean(beforeState?.breakOverlayVisible),
      timestamp: new Date().toISOString(),
      captureReason,
      captureState,
      ...(options.extraMetadata || {}),
      readinessActionButtonMetrics: beforeState?.readinessActionButtonMetrics || null,
      mainTextSnapshot: beforeState?.mainTextSnapshot || "",
      beforeState,
      afterState
    };
    const mismatches = currentCaptureMismatches(metadata, options);
    metadata.stateMatchesRequest = mismatches.length === 0;
    metadata.stateMismatches = mismatches;
    fs.writeFileSync(outputPath, image.toPNG());
    fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
    console.log(`[EyeFlow:${label}] capture saved`, outputPath);
    console.log(`[EyeFlow:${label}] capture metadata`, JSON.stringify({
      filename: metadata.filename,
      requestedView: metadata.requestedView,
      visibleView: metadata.visibleView,
      pageTitle: metadata.pageTitle,
      activeNav: metadata.activeNav,
      onboardingVisible: metadata.onboardingVisible,
      breakOverlayVisible: metadata.breakOverlayVisible,
      captureReason: metadata.captureReason,
      captureState: metadata.captureState,
      stateMatchesRequest: metadata.stateMatchesRequest
    }));
    logCurrentCaptureBasis(metadata, outputPath);
    if (!metadata.stateMatchesRequest) {
      console.warn(`[EyeFlow:${label}] capture state mismatch`, mismatches.join("; "));
    }
  } catch (error) {
    console.warn(`[EyeFlow:${label}] capture failed`, error.message);
  }
}

function captureDebugDashboardView(viewName, extraDelayMs = 0) {
  if (!debugCapture || !viewName || !dashboardWindow || dashboardWindow.isDestroyed()) return;
  if (!/^[a-z-]+$/i.test(viewName)) return;
  const targetViewName = viewName === "settings-ordinary"
    ? "rhythmView"
    : viewName === "profile-share-card"
      ? "profileView"
      : viewName;
  const captureState = viewName === "settings-ordinary"
    ? "ordinary mode"
    : viewName === "profile-share-card"
      ? "share card"
      : "default";
  const captureReason = viewName === "settings-ordinary"
    ? "ordinary settings debug view"
    : viewName === "profile-share-card"
      ? "profile share card debug view"
    : `clean ${targetViewName} debug view`;
  const focusSelector = viewName === "profile-share-card" ? ".profile-share-bridge" : "";
  const requiredText = viewName === "profile-share-card"
    ? ["今天就到这里了", "今日分享卡", "eyeflow.app"]
    : [];
  setTimeout(() => {
    if (!dashboardWindow || dashboardWindow.isDestroyed()) return;
    dashboardWindow.webContents.executeJavaScript(`(async () => {
      const button = document.querySelector('[data-view-target="${targetViewName}"]');
      const targetView = document.querySelector("#${targetViewName}");
      const enforceView = () => {
        if (!targetView) return;
        document.querySelectorAll(".view").forEach((view) => {
          view.hidden = view !== targetView;
        });
        document.querySelectorAll("[data-view-target]").forEach((navButton) => {
          navButton.classList.toggle("active", navButton.dataset.viewTarget === "${targetViewName}");
        });
        const titles = {
          todayView: ["今天", typeof statusCopy === "function" ? statusCopy(typeof computeEyeLoad === "function" ? computeEyeLoad() : 0, false) : ""],
          rhythmView: ["设置", "先选提醒边界，需要时再展开更多设置。"],
          profileView: ["复盘", "Mira 帮你理解今天状态和下一轮节奏。"]
        };
        const copy = titles["${targetViewName}"];
        if (copy) {
          const pageTitle = document.querySelector("#pageTitle");
          const statusText = document.querySelector("#statusText");
          if (pageTitle) pageTitle.textContent = copy[0];
          if (statusText) statusText.textContent = copy[1];
        }
        document.scrollingElement?.scrollTo(0, 0);
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
      await new Promise((resolve) => window.setTimeout(resolve, 240));
      enforceView();
      const isVisible = (element) => {
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return style.display !== "none"
          && style.visibility !== "hidden"
          && rect.width > 0
          && rect.height > 0
          && rect.bottom > 0
          && rect.top < window.innerHeight;
      };
      const clippedControls = Array.from(document.querySelectorAll("button, .tag, .state-label, .readiness-status, .ghost, .primary"))
        .filter(isVisible)
        .filter((element) => element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 2)
        .map((element) => ({
          text: (element.textContent || element.id || element.tagName).trim().slice(0, 48),
          width: element.clientWidth,
          scrollWidth: element.scrollWidth,
          height: element.clientHeight,
          scrollHeight: element.scrollHeight
        }))
        .slice(0, 8);
      const overflowElements = Array.from(document.querySelectorAll("body *"))
        .filter(isVisible)
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return window.getComputedStyle(element).position !== "fixed" && rect.right > window.innerWidth + 1;
        })
        .map((element) => ({
          tag: element.tagName,
          className: String(element.className || "").slice(0, 48),
          text: (element.textContent || "").trim().slice(0, 48)
        }))
        .slice(0, 8);
      const toastSafeZone = typeof window.__eyeflowToastSafeZoneProbe === "function"
        ? window.__eyeflowToastSafeZoneProbe()
        : { anchor: "", overlaps: [] };
      const mainViewportText = Array.from(document.querySelectorAll("main h1, main h2, main h3, main h4, main p, main span, main strong, main button, main summary, main small"))
        .filter(isVisible)
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.bottom > 0
            && rect.top < window.innerHeight
            && rect.right > 0
            && rect.left < window.innerWidth;
        })
        .map((element) => (element.textContent || "").trim())
        .filter(Boolean)
        .join(" ")
        .replace(/\\s+/g, " ")
        .slice(0, 2000);
      return {
        ok: true,
        requestedView: "${targetViewName}",
        activeText: button?.textContent?.trim() || "${viewName}",
        activeNavText: document.querySelector(".nav button.active")?.textContent?.trim() || "",
        pageTitleText: document.querySelector("#pageTitle")?.textContent?.trim() || "",
        mainViewportText,
        onboardingHidden: !document.querySelector("#onboardingOverlay")?.classList.contains("show"),
        feedbackProbe,
        layout: {
          scrollXOverflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
          clippedControls,
          overflowElements,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          }
        },
        toastSafeZone,
        visibleView: Array.from(document.querySelectorAll(".view"))
          .find((view) => !view.hidden)?.id || ""
      };
    })()`).then((result) => {
      console.log("[EyeFlow:debug] dashboard view", result);
      console.log("[EyeFlow:debug] dashboard view json", JSON.stringify(result));
      dashboardWindow.webContents.executeJavaScript(`(() => {
        const targetView = document.querySelector("#${targetViewName}");
        if (!targetView) return;
        document.querySelectorAll(".view").forEach((view) => {
          view.hidden = view !== targetView;
        });
        document.querySelectorAll("[data-view-target]").forEach((navButton) => {
          navButton.classList.toggle("active", navButton.dataset.viewTarget === "${targetViewName}");
        });
        const titles = {
          todayView: ["今天", typeof statusCopy === "function" ? statusCopy(typeof computeEyeLoad === "function" ? computeEyeLoad() : 0, false) : ""],
          rhythmView: ["设置", "先选提醒边界，需要时再展开更多设置。"],
          profileView: ["复盘", "Mira 帮你理解今天状态和下一轮节奏。"]
        };
        const copy = titles["${targetViewName}"];
        if (copy) {
          const pageTitle = document.querySelector("#pageTitle");
          const statusText = document.querySelector("#statusText");
          if (pageTitle) pageTitle.textContent = copy[0];
          if (statusText) statusText.textContent = copy[1];
        }
        document.scrollingElement?.scrollTo(0, 0);
      })()`).finally(() => {
        captureDebugPageNow(dashboardWindow, `dashboard-${viewName}`, {
          requestedView: targetViewName,
          expectedVisibleView: targetViewName,
          expectedOnboardingVisible: false,
          expectedEqualReadinessActionButtons: targetViewName === "rhythmView",
          focusSelector,
          requiredText,
          captureState,
          captureReason
        });
      });
    }).catch((error) => {
      console.warn("[EyeFlow:debug] dashboard view failed", error.message);
    });
  }, (debugOnboarding ? 4500 : 900) + extraDelayMs);
}

function captureDebugOnboarding() {
  if (!debugCapture || !debugOnboarding || !dashboardWindow || dashboardWindow.isDestroyed()) return;
  setTimeout(() => {
    if (!dashboardWindow || dashboardWindow.isDestroyed()) return;
    dashboardWindow.webContents.executeJavaScript(`(() => {
      if (typeof showOnboarding !== "function") return { ok: false, reason: "missing showOnboarding" };
      showOnboarding();
      document.querySelector("#onboardingOverlay")?.classList.add("show", "debug-capture");
      return new Promise((resolve) => {
        window.setTimeout(() => {
          const overlay = document.querySelector("#onboardingOverlay");
          overlay?.classList.add("show", "debug-capture");
          const actions = document.querySelector(".onboarding-actions");
          const primaryAction = document.querySelector("#startOnboardingBtn");
          const pill = document.querySelector(".mira-intro .state-label");
          const intro = document.querySelector(".mira-intro");
          const sentence = document.querySelector(".mira-intro h3");
          const privacy = document.querySelector(".onboarding-permission-note");
          const forcedChoices = document.querySelectorAll(".onboarding-preset");
          const permissionButton = document.querySelector("#onboardingPermissionBtn");
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
          const introRect = rectFor(intro);
          resolve({
            ok: true,
            onboardingVisible: overlay?.classList.contains("show") || false,
            pillText: pill?.textContent?.trim() || "",
            sentenceText: sentence?.textContent?.trim() || "",
            privacyText: privacy?.textContent?.trim() || "",
            hasForcedChoices: forcedChoices.length > 0,
            hasPermissionButton: Boolean(permissionButton),
            primaryActionText: primaryAction?.textContent?.trim() || "",
            primaryActionVisible: Boolean(actionRect)
              && actionRect.left >= 0
              && actionRect.top >= 0
              && actionRect.right <= window.innerWidth
              && actionRect.bottom <= window.innerHeight,
            actionPosition: window.getComputedStyle(actions || document.body).position,
            introVisible: Boolean(introRect)
              && introRect.left >= 0
              && introRect.top >= 0
              && introRect.right <= window.innerWidth
              && introRect.bottom <= window.innerHeight,
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
      captureDebugPage(dashboardWindow, "dashboard-onboarding", 180, {
        requestedView: "todayView",
        onboardingVisible: true,
        expectedVisibleView: "todayView",
        expectedOnboardingVisible: true,
        captureState: "onboarding active",
        requiredText: ["专注工作时，也有人照顾你的眼睛", "不打断，不监视，安静待在桌面一角", "好，开始吧"],
        captureReason: "onboarding active debug view"
      });
    }).catch((error) => {
      console.warn("[EyeFlow:debug] onboarding failed", error.message);
    });
  }, 1700);
}

function runDebugForcePreview() {
  if (!debugForcePreview || !dashboardWindow || dashboardWindow.isDestroyed()) return;
  const startDelay = debugCapture && debugRestClick ? 16000 : (debugRestClick ? 3600 : 1400);
  const previewSeconds = debugCapture ? 10 : 15;
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
        seconds: ${previewSeconds},
        preview: true,
        voiceGuide: false,
        recoveryMode: mode,
        tasks,
        title: "Mira 带你离开屏幕一下",
        copy: "这是 ${previewSeconds} 秒窗口预览，不会计入今日休息。正式开启后会进入全屏恢复。"
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
          captureDebugPageNow(breakLockWindow, "break-lock-complete", {
            requestedView: "break-lock",
            expectedVisibleView: "",
            captureState: "force-return",
            requiredText: ["Mira 已经守完这段时间", "回到 EyeFlow"],
            captureReason: "force preview complete state"
          });
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
          }, 2800);
          return;
        }
        if (attempts >= 18) {
          clearInterval(timer);
          console.warn("[EyeFlow:debug] force return unavailable", { ...result, attempts });
        }
      }).catch((error) => {
        clearInterval(timer);
        console.warn("[EyeFlow:debug] force return failed", error.message);
      });
    }, 700);
  }, startDelay + ((previewSeconds + 1) * 1000));
}

function captureDebugBreakLockComplete(win, delayMs = 600) {
  if (!debugCapture || !win || win.isDestroyed()) return;
  setTimeout(() => {
    if (!win || win.isDestroyed()) return;
    win.webContents.executeJavaScript(`(() => {
      if (typeof showCompletion === "function") {
        showCompletion();
        return { ok: true };
      }
      return { ok: false, reason: "missing showCompletion" };
    })()`).then((result) => {
      if (!result?.ok) {
        console.warn("[EyeFlow:debug] force complete state unavailable", result);
      }
    }).catch((error) => {
      console.warn("[EyeFlow:debug] force complete state failed", error.message);
    }).finally(() => {
      captureDebugPage(win, "break-lock-complete", 160, {
        requestedView: "break-lock",
        expectedVisibleView: "",
        captureState: "force-return",
        requiredText: ["Mira 已经守完这段时间", "回到 EyeFlow"],
        captureReason: "force preview complete state"
      });
    });
  }, delayMs);
}

function runDebugRestClick() {
  if (!debugRestClick || !companionWindow || companionWindow.isDestroyed()) return;
  setTimeout(() => {
    if (!companionWindow || companionWindow.isDestroyed()) return;
    companionWindow.webContents.send("state:update", latestState);
    setTimeout(() => runDebugRestClickScript(), 350);
  }, debugOnboarding && debugCapture ? 13000 : (debugOnboarding ? 5200 : 1200));
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

function desktopPreferenceDefaults(settings = readSettings()) {
  const hasCompanionVisibilityPreference = Number(settings.companionVisibilityPreferenceVersion || 0) >= COMPANION_VISIBILITY_PREFERENCE_VERSION;
  const systemEnhancedDesktopSensing = process.platform === "darwin" && hasAccessibilityPermission();
  const enhancedDesktopSensingRequestedAt = Number(settings.enhancedDesktopSensingRequestedAt || 0);
  const hasFreshEnhancedDesktopSensingRequest = enhancedDesktopSensingRequestedAt > 0
    && Date.now() - enhancedDesktopSensingRequestedAt < ENHANCED_DESKTOP_SENSING_REQUEST_WINDOW_MS;
  return {
    enhancedDesktopSensing: systemEnhancedDesktopSensing,
    enhancedDesktopSensingRequested: !systemEnhancedDesktopSensing
      && settings.enhancedDesktopSensingRequested === true
      && hasFreshEnhancedDesktopSensingRequest,
    showCompanionOnLaunch: hasCompanionVisibilityPreference
      ? settings.showCompanionOnLaunch !== false
      : true
  };
}

function reconcileDesktopPreferences(settings = readSettings()) {
  if (process.platform !== "darwin") return settings;
  const systemEnhancedDesktopSensing = hasAccessibilityPermission();
  const requestedAt = Number(settings.enhancedDesktopSensingRequestedAt || 0);
  const requestIsStale = settings.enhancedDesktopSensingRequested === true
    && (!requestedAt || Date.now() - requestedAt >= ENHANCED_DESKTOP_SENSING_REQUEST_WINDOW_MS);
  if (!systemEnhancedDesktopSensing && !requestIsStale) return settings;
  if (settings.enhancedDesktopSensingRequested !== true
    && settings.enhancedDesktopSensingRequestedAt === undefined) return settings;
  const next = {
    ...settings,
    enhancedDesktopSensing: systemEnhancedDesktopSensing,
    enhancedDesktopSensingRequested: false
  };
  delete next.enhancedDesktopSensingRequestedAt;
  writeSettings(next);
  return next;
}

function writeDesktopPreference(key, enabled) {
  const settings = readSettings();
  const next = {
    ...settings,
    [key]: Boolean(enabled)
  };
  if (key === "showCompanionOnLaunch") {
    next.companionVisibilityPreferenceVersion = COMPANION_VISIBILITY_PREFERENCE_VERSION;
  }
  if (key === "enhancedDesktopSensing") {
    const systemEnhancedDesktopSensing = process.platform === "darwin" && hasAccessibilityPermission();
    next.enhancedDesktopSensing = systemEnhancedDesktopSensing;
    if (process.platform === "darwin" && Boolean(enabled) && !systemEnhancedDesktopSensing) {
      next.enhancedDesktopSensingRequested = true;
      next.enhancedDesktopSensingRequestedAt = Date.now();
    } else {
      next.enhancedDesktopSensingRequested = false;
      delete next.enhancedDesktopSensingRequestedAt;
    }
    next.enhancedDesktopSensingPreferenceVersion = ENHANCED_DESKTOP_SENSING_PREFERENCE_VERSION;
  }
  writeSettings(next);
  updateApplicationMenu();
  updateTrayMenu();
  return desktopPreferenceDefaults(next);
}

function getDesktopSettings() {
  const settings = reconcileDesktopPreferences();
  return {
    ...desktopPreferenceDefaults(settings),
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
        { label: "显示/退出 Mira", accelerator: "CommandOrControl+M", click: toggleCompanionVisibility },
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
  const fallbackBounds = defaultCompanionBounds();
  const safeBounds = {
    width: Number.isFinite(bounds.width) ? bounds.width : companionSizes.compact.width,
    height: Number.isFinite(bounds.height) ? bounds.height : companionSizes.compact.height,
    x: Number.isFinite(bounds.x) ? bounds.x : fallbackBounds.x,
    y: Number.isFinite(bounds.y) ? bounds.y : fallbackBounds.y
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

function defaultCompanionBounds() {
  const area = screen.getPrimaryDisplay()?.workArea || { x: 0, y: 0, width: 1440, height: 900 };
  return {
    ...companionSizes.compact,
    x: area.x + area.width - companionSizes.compact.width - 28,
    y: area.y + area.height - companionSizes.compact.height - 28
  };
}

function visibleDashboardBounds(bounds) {
  const displays = screen.getAllDisplays();
  const fallbackArea = displays[0]?.workArea || { x: 0, y: 0, width: 1440, height: 900 };
  const hasSavedPosition = Number.isFinite(bounds.x) && Number.isFinite(bounds.y);
  const safeBounds = {
    width: Math.max(DASHBOARD_MIN_SIZE.width, Math.round(Number(bounds.width) || DASHBOARD_DEFAULT_SIZE.width)),
    height: Math.max(DASHBOARD_MIN_SIZE.height, Math.round(Number(bounds.height) || DASHBOARD_DEFAULT_SIZE.height)),
    x: Number.isFinite(bounds.x) ? Math.round(bounds.x) : fallbackArea.x,
    y: Number.isFinite(bounds.y) ? Math.round(bounds.y) : fallbackArea.y
  };
  const display = screen.getDisplayMatching(safeBounds);
  const area = display?.workArea || fallbackArea;
  const padding = DASHBOARD_SCREEN_PADDING;
  const width = Math.min(safeBounds.width, area.width - padding * 2);
  const height = Math.min(safeBounds.height, area.height - padding * 2);
  const defaultX = area.x + Math.round((area.width - width) / 2);
  const defaultY = area.y + Math.round((area.height - height) / 2);
  return {
    width,
    height,
    x: hasSavedPosition
      ? Math.min(Math.max(safeBounds.x, area.x + padding), area.x + area.width - width - padding)
      : defaultX,
    y: hasSavedPosition
      ? Math.min(Math.max(safeBounds.y, area.y + padding), area.y + area.height - height - padding)
      : defaultY
  };
}

function defaultDashboardBounds() {
  return visibleDashboardBounds({ ...DASHBOARD_DEFAULT_SIZE });
}

function saveCompanionBounds() {
  if (!companionWindow || companionWindow.isDestroyed()) return;
  writeSettings({ ...readSettings(), companionBounds: companionWindow.getBounds() });
}

function dashboardWindowOptions() {
  return defaultDashboardBounds();
}

function saveDashboardBounds() {
  if (!dashboardWindow || dashboardWindow.isDestroyed()) return;
  if (dashboardWindow.isMinimized() || !dashboardWindow.isVisible()) return;
  writeSettings({ ...readSettings(), dashboardBounds: dashboardWindow.getBounds() });
}

function keepDashboardVisible() {
  if (!dashboardWindow || dashboardWindow.isDestroyed()) return;
  if (dashboardWindow.isMinimized()) dashboardWindow.restore();
  dashboardWindow.setBounds(defaultDashboardBounds(), false);
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

function sendCompanionBubble(payload) {
  if (!companionWindow || companionWindow.isDestroyed()) return;
  companionWindow.webContents.send("companion:bubble", payload);
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
  if (companionBubbleBaseBounds) return;
  hoverOpenTimer = setTimeout(() => {
    hoverOpenTimer = null;
    if (companionHoverState.avatar && !companionBubbleBaseBounds) {
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
  if (companionBubbleBaseBounds) {
    clearHoverOpenTimer();
    if (companionExpanded) hideCompanionPanel();
    return;
  }
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
    companionWindow.setBounds(visibleCompanionBounds(defaultCompanionBounds()), false);
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
  if (companionBubbleBaseBounds) return;
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

function restoreCompanionBubble() {
  if (companionBubbleTimer) {
    clearTimeout(companionBubbleTimer);
    companionBubbleTimer = null;
  }
  sendCompanionBubble({ visible: false });
  if (!companionWindow || companionWindow.isDestroyed()) return;
  const baseBounds = companionBubbleBaseBounds || companionWindow.getBounds();
  companionBubbleBaseBounds = null;
  companionBoundsTransient = true;
  companionWindow.setBounds(visibleCompanionBounds({
    ...companionSizes.compact,
    x: baseBounds.x,
    y: baseBounds.y
  }), false);
  companionBoundsTransient = false;
  saveCompanionBounds();
}

function showCompanionBubble(message, options = {}) {
  const text = String(message || "").replace(/\s+/g, " ").trim().slice(0, 96);
  if (!text) return { ok: false, reason: "empty" };
  if (!desktopPreferenceDefaults().showCompanionOnLaunch && !debugCapture && !wantsCurrentVisualCapture("companion")) {
    return { ok: false, reason: "hidden" };
  }
  if (!companionWindow || companionWindow.isDestroyed()) createCompanionWindow();
  if (!companionWindow || companionWindow.isDestroyed()) return { ok: false, reason: "missing companion" };
  companionHoverState = { avatar: false, panel: false };
  clearHoverOpenTimer();
  clearHoverCloseTimer();
  if (companionExpanded) hideCompanionPanel();
  if (!companionBubbleBaseBounds) companionBubbleBaseBounds = companionWindow.getBounds();
  const baseBounds = companionBubbleBaseBounds;
  const nextBounds = visibleCompanionBounds({
    ...companionSizes.bubble,
    x: baseBounds.x + baseBounds.width - companionSizes.bubble.width,
    y: baseBounds.y + Math.round((baseBounds.height - companionSizes.bubble.height) / 2)
  });
  companionBoundsTransient = true;
  companionWindow.setBounds(nextBounds, false);
  companionBoundsTransient = false;
  companionWindow.showInactive();
  bringCompanionToFront(companionWindow);
  sendCompanionBubble({ visible: true, message: text });
  if (companionBubbleTimer) clearTimeout(companionBubbleTimer);
  const durationMs = Number.isFinite(options.durationMs) ? options.durationMs : 5200;
  companionBubbleTimer = setTimeout(restoreCompanionBubble, Math.max(1200, Math.min(durationMs, 8000)));
  return { ok: true, bounds: nextBounds };
}

function maybeShowCompanionExitHint() {
  const settings = readSettings();
  if (settings.companionExitHintShown === true) return { ok: false, reason: "shown" };
  if (debugCapture || wantsCurrentVisualCapture("companion") || wantsCurrentVisualCapture("companion-panel")) {
    return { ok: false, reason: "capture" };
  }
  if (!desktopPreferenceDefaults(settings).showCompanionOnLaunch) {
    markCompanionExitHintShown(settings);
    return { ok: false, reason: "hidden" };
  }
  if (companionExpanded || Number(latestState.interventionLevel || 1) > 1) {
    return { ok: false, reason: "busy" };
  }
  markCompanionExitHintShown(settings);
  return showCompanionBubble(COMPANION_EXIT_HINT_TEXT, { durationMs: COMPANION_EXIT_HINT_DURATION_MS });
}

function keepCompanionVisible() {
  if (!companionWindow || companionWindow.isDestroyed()) return;
  if (companionBubbleBaseBounds) return;
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

function hideCompanionWindow({ persistPreference = true } = {}) {
  if (persistPreference) markCompanionExitHintShown();
  if (persistPreference) writeDesktopPreference("showCompanionOnLaunch", false);
  hideWindowIfAlive(companionWindow);
  hideWindowIfAlive(companionPanelWindow);
  companionExpanded = false;
  companionHoverState = { avatar: false, panel: false };
  companionBubbleBaseBounds = null;
  if (companionBubbleTimer) {
    clearTimeout(companionBubbleTimer);
    companionBubbleTimer = null;
  }
  if (persistPreference) companionHiddenByLifecycle = false;
  clearHoverOpenTimer();
  clearHoverCloseTimer();
  sendCompanionExpanded();
}

function createDashboardWindow() {
  dashboardWindow = new BrowserWindow({
    ...dashboardWindowOptions(),
    minWidth: DASHBOARD_MIN_SIZE.width,
    minHeight: DASHBOARD_MIN_SIZE.height,
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
    captureDebugPage(dashboardWindow, "dashboard", 600, {
      requestedView: "todayView",
      expectedOnboardingVisible: false,
      captureState: "default",
      captureReason: "initial dashboard"
    });
    if (wantsCurrentVisualCapture("today-session")) {
      captureDebugPage(dashboardWindow, "dashboard-session", 1000, {
        requestedView: "todayView",
        expectedVisibleView: "todayView",
        expectedOnboardingVisible: false,
        sessionActive: true,
        captureState: "session active",
        requiredText: ["这一轮进行中", "先把注意力留给当前任务", "本轮"],
        captureReason: "today session active"
      });
    }
    if (wantsCurrentVisualCapture("today-session-settings")) {
      captureDebugPage(dashboardWindow, "dashboard-session-settings", 1000, {
        requestedView: "todayView",
        expectedVisibleView: "todayView",
        expectedOnboardingVisible: false,
        sessionActive: true,
        sessionSettingsOpen: true,
        captureState: "session settings open",
        requiredText: ["调整节奏", "专注提醒", "休息长度"],
        captureReason: "today session settings open"
      });
    }
    if (wantsCurrentVisualCapture("today-auto-tracking")) {
      captureDebugPage(dashboardWindow, "dashboard-auto-tracking", 1000, {
        requestedView: "todayView",
        expectedVisibleView: "todayView",
        expectedOnboardingVisible: false,
        autoTracking: true,
        captureState: "auto tracking",
        requiredText: ["自动记录", "手动专注"],
        captureReason: "today auto tracking"
      });
    }
    const debugViewDelayStep = debugRestClick ? 7000 : 900;
    debugDashboardViews.forEach((viewName, index) => {
      captureDebugDashboardView(viewName, index * debugViewDelayStep);
    });
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
  const bounds = settings.companionBounds || defaultCompanionBounds();
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
    captureDebugPage(companionWindow, "companion", 600, {
      requestedView: "companion",
      expectedVisibleView: "",
      captureState: "companion avatar",
      captureReason: "companion avatar"
    });
    revealCompanionWindow();
    setTimeout(() => maybeShowCompanionExitHint(), 650);
    runDebugRestClick();
    if (wantsCurrentVisualCapture("companion-panel")) {
      setTimeout(() => showCompanionPanel(), 450);
    }
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
    if (companionBoundsTransient) return;
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
    if (wantsCurrentVisualCapture("companion-panel")) {
      companionExpanded = true;
      positionCompanionPanel();
      companionPanelWindow.showInactive();
      bringCompanionToFront(companionPanelWindow);
    }
    captureDebugPage(companionPanelWindow, "companion-panel", 600, {
      requestedView: "companion-panel",
      expectedVisibleView: "",
      captureState: "companion panel",
      requiredText: ["Mira", "舒适区"],
      captureReason: "companion panel"
    });
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
    { label: "显示/退出 Mira", click: toggleCompanionVisibility },
    { label: "找回 Mira", click: resetCompanionPosition },
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
  captureDebugPage(dashboardWindow, "dashboard-rest-guide", 600, {
    requestedView: "todayView",
    restGuide: true,
    focusSelector: "#breakOverlay",
    expectedVisibleView: "todayView",
    expectedOnboardingVisible: false,
    expectedBreakOverlayVisible: true,
    captureState: "rest guide active",
    requiredText: ["看向远处", "不用盯着屏幕"],
    captureReason: "rest guide after Mira click"
  });
}

function sendDashboardFocus(payload = {}) {
  if (!dashboardWindow || dashboardWindow.isDestroyed()) return;
  dashboardWindow.webContents.send("dashboard:focus", {
    at: Date.now(),
    view: payload.view || "todayView",
    focus: payload.focus || "manualStart"
  });
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
  } else if (options?.view || options?.focus) {
    const focusPayload = {
      view: options.view,
      focus: options.focus
    };
    if (dashboardWindow.webContents.isLoading()) {
      dashboardWindow.webContents.once("did-finish-load", () => sendDashboardFocus(focusPayload));
    } else {
      setTimeout(() => sendDashboardFocus(focusPayload), 120);
    }
  }
}

function showCompanion() {
  writeDesktopPreference("showCompanionOnLaunch", true);
  revealCompanionWindow({ focus: true });
  setTimeout(() => maybeShowCompanionExitHint(), 650);
}

function toggleCompanionVisibility() {
  if (desktopPreferenceDefaults().showCompanionOnLaunch) {
    hideCompanionWindow();
    return;
  }
  showCompanion();
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
  const allowedMoods = new Set(["gaze", "blink", "close", "neck", "jaw", "press", "breath"]);
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
  if (breakLockWindow.__eyeflowPreviewWindow) return;
  breakLockWindow.setAlwaysOnTop(true, "screen-saver");
  breakLockWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  breakLockWindow.setFullScreen(true);
  breakLockWindow.setKiosk(true);
  breakLockWindow.moveTop();
}

function startBreakLock(payload = {}) {
  const previewWindow = Boolean(payload.preview);
  const minSeconds = debugCapture && payload.preview ? 4 : 15;
  const seconds = Math.max(minSeconds, Math.min(600, Math.round(Number(payload.seconds) || 90)));
  const title = String(payload.title || "Mira 带你离开屏幕一下");
  const copy = String(payload.copy || "不用盯着倒计时。我来守时间，你把视线交给远处。");
  const tasks = sanitizeBreakTasks(payload.tasks);
  const voiceGuide = payload.voiceGuide !== false;
  breakLockCanClose = false;

  if (breakLockWindow && !breakLockWindow.isDestroyed()) {
    breakLockWindow.__eyeflowPreviewWindow = previewWindow;
    breakLockWindow.webContents.send("breakLock:update", {
      seconds,
      title,
      copy,
      tasks,
      preview: Boolean(payload.preview),
      voiceGuide
    });
    captureDebugPage(breakLockWindow, "break-lock", debugCapture && payload.preview ? 180 : 600, {
      requestedView: "break-lock",
      expectedVisibleView: "",
      captureState: payload.preview ? "break-lock active" : "break-lock active",
      requiredText: ["Mira 带你离开屏幕一下", "紧急退出"],
      captureReason: payload.preview ? "force preview active" : "break lock active"
    });
    breakLockWindow.show();
    enterBreakLockFullscreen();
    breakLockWindow.focus();
    return;
  }

  breakLockWindow = new BrowserWindow({
    width: previewWindow ? DASHBOARD_DEFAULT_SIZE.width : undefined,
    height: previewWindow ? DASHBOARD_DEFAULT_SIZE.height : undefined,
    fullscreen: !previewWindow,
    kiosk: !previewWindow,
    frame: false,
    show: false,
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
  breakLockWindow.__eyeflowPreviewWindow = previewWindow;
  attachWebDiagnostics(breakLockWindow, "break-lock");

  breakLockWindow.setVisibleOnAllWorkspaces(!previewWindow, { visibleOnFullScreen: !previewWindow });
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
    captureDebugPage(breakLockWindow, "break-lock", debugCapture && payload.preview ? 180 : 600, {
      requestedView: "break-lock",
      expectedVisibleView: "",
      captureState: "break-lock active",
      requiredText: ["Mira 带你离开屏幕一下", "紧急退出"],
      captureReason: payload.preview ? "force preview active" : "break lock active"
    });
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
    const winToClose = breakLockWindow;
    const closeBreakLockWindow = () => {
      if (winToClose.isDestroyed()) return;
      winToClose.setKiosk(false);
      winToClose.setFullScreen(false);
      winToClose.setAlwaysOnTop(false);
      winToClose.close();
    };
    if (debugCapture && payload.preview) {
      Promise.resolve(captureDebugPageNow(winToClose, "break-lock-complete", {
        requestedView: "break-lock",
        expectedVisibleView: "",
        captureState: "force-return",
        requiredText: ["Mira 已经守完这段时间", "回到 EyeFlow"],
        captureReason: "force preview complete state"
      })).finally(closeBreakLockWindow);
    } else {
      closeBreakLockWindow();
    }
  }
  breakLockWindow = null;
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    dashboardWindow.show();
    dashboardWindow.focus();
    dashboardWindow.webContents.send("breakLock:finished", payload);
    if (debugCapture && payload.preview) {
      setTimeout(() => {
        dashboardWindow.webContents.executeJavaScript(`(() => new Promise((resolve) => {
          let attempts = 0;
          let fallbackApplied = false;
          const readProbe = () => {
            if (typeof switchView === "function") {
              switchView("rhythmView");
            }
            const visibleView = Array.from(document.querySelectorAll(".view"))
                .find((view) => !view.hidden)?.id || "";
            return {
              visibleView,
              finalVisibleView: visibleView,
              forceVoiceChecked: Boolean(document.querySelector("#forceVoiceGuideToggle")?.checked),
              previewHint: document.querySelector("#forcePreviewResult")?.hidden === false,
              returnReady: document.querySelector("#forcePreviewResult")?.hidden === false,
              toastSafeZone: typeof window.__eyeflowToastSafeZoneProbe === "function"
                ? window.__eyeflowToastSafeZoneProbe()
                : { anchor: "", overlaps: [] },
              attempts
            };
          };
          const waitForPreview = () => {
            attempts += 1;
            const probe = readProbe();
            if (probe.returnReady || attempts >= 18) {
              resolve({
                ...probe,
                returnReady: Boolean(probe.returnReady),
                finalVisibleView: probe.visibleView,
                attempts
              });
              return;
            }
            if (!fallbackApplied && attempts >= 4 && typeof finishForceBreak === "function") {
              fallbackApplied = true;
              finishForceBreak({ preview: true });
            }
            window.setTimeout(waitForPreview, 250);
          };
          waitForPreview();
        }))()`).then((result) => {
          console.log("[EyeFlow:debug] force return dashboard", {
            ...result,
            voicePreserved: debugForcePreviewVoiceBefore === null
              || result.forceVoiceChecked === debugForcePreviewVoiceBefore
          });
          console.log("[EyeFlow:debug] force return dashboard json", JSON.stringify({
            ...result,
            voicePreserved: debugForcePreviewVoiceBefore === null
              || result.forceVoiceChecked === debugForcePreviewVoiceBefore
          }));
          captureDebugPage(dashboardWindow, "dashboard-force-return", 600, {
            requestedView: "rhythmView",
            expectedVisibleView: "rhythmView",
            expectedOnboardingVisible: false,
            focusSelector: "#forcePreviewResult",
            captureState: "force-return",
            requiredText: ["预览完成"],
            captureReason: "force preview return",
            extraMetadata: {
              returnReady: Boolean(result.returnReady),
              attempts: Number(result.attempts || 0),
              finalVisibleView: result.finalVisibleView || result.visibleView || ""
            }
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

  const snoozeUntil = Number(state.snoozeUntil || 0);
  const quietedByUser = Boolean(state.reminderDeferred) || snoozeUntil > now;
  if (quietedByUser) {
    hideCompanionPanel();
    return;
  }

  const hasReminderOpening = Boolean(state.isRunning || state.reminderOpening || state.naturalBreak || state.reminderPending);
  if (!hasReminderOpening) {
    if (levelChanged) hideCompanionPanel();
    return;
  }

  const reminderWaiting = Boolean(state.reminderPending);
  const panelCooldown = reminderWaiting
    ? 12 * 60 * 1000
    : level >= 3
      ? 6 * 60 * 1000
      : 8 * 60 * 1000;
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

function hasAccessibilityTccPermission() {
  if (process.platform !== "darwin") return true;
  if (Date.now() - accessibilityTccCache.checkedAt < ACCESSIBILITY_TCC_CACHE_MS) {
    return accessibilityTccCache.trusted;
  }
  let trusted = false;
  try {
    const result = spawnSync("/usr/bin/sqlite3", [
      ACCESSIBILITY_TCC_DB,
      `select auth_value from access where service='kTCCServiceAccessibility' and client='${ACCESSIBILITY_TCC_CLIENT}' order by last_modified desc limit 1;`
    ], {
      encoding: "utf8",
      timeout: 1000
    });
    trusted = result.status === 0 && result.stdout.trim().split(/\r?\n/).includes("2");
  } catch {
    trusted = false;
  }
  accessibilityTccCache = { checkedAt: Date.now(), trusted };
  return trusted;
}

function hasAccessibilityPermission() {
  if (process.platform !== "darwin") return true;
  if (debugAccessibilityTrustedOverride !== null) return debugAccessibilityTrustedOverride;
  try {
    if (systemPreferences.isTrustedAccessibilityClient(false)) return true;
  } catch {
    // Electron can keep the old Accessibility value until the app restarts.
  }
  return hasAccessibilityTccPermission();
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
    const desktopPrefs = desktopPreferenceDefaults();
    const enhancedDesktopSensing = Boolean(desktopPrefs.enhancedDesktopSensing);
    const canReadActiveApp = enhancedDesktopSensing && accessibilityTrusted;
    const activeApp = canReadActiveApp ? await getActiveAppName() : "本地计时";
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
      enhancedDesktopSensing,
      platform: process.platform,
      isWorking,
      isDeepWorkApp: canReadActiveApp && isDeepWorkApp(activeApp),
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
  if (desktopPreferenceDefaults().showCompanionOnLaunch || debugCapture || wantsCurrentVisualCapture("companion-panel")) {
    createCompanionWindow();
    createCompanionPanelWindow();
  }
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
  hideCompanionWindow({ persistPreference: false });
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
  if (shouldExpand && companionBubbleBaseBounds) {
    if (companionExpanded) hideCompanionPanel();
    return { expanded: false, blocked: "bubble" };
  }
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

ipcMain.handle("companion:bubble", (_event, message) => {
  return showCompanionBubble(message);
});

ipcMain.handle("feedback:copy", (_event, text) => {
  const clipped = String(text || "").slice(0, 12000);
  try {
    clipboard.writeText(clipped);
    const readBack = clipboard.readText();
    const verified = readBack === clipped;
    return { ok: verified, verified, length: clipped.length };
  } catch (error) {
    return { ok: false, verified: false, length: clipped.length, error: error.message };
  }
});

ipcMain.handle("share:copyImage", (_event, dataUrl) => {
  const source = String(dataUrl || "");
  if (!source.startsWith("data:image/png;base64,")) {
    return { ok: false, verified: false, error: "unsupported image format" };
  }
  try {
    const image = nativeImage.createFromDataURL(source);
    if (image.isEmpty()) {
      return { ok: false, verified: false, error: "empty image" };
    }
    clipboard.writeImage(image);
    const readBack = clipboard.readImage();
    const verified = !readBack.isEmpty();
    return { ok: verified, verified, size: image.getSize() };
  } catch (error) {
    return { ok: false, verified: false, error: error.message };
  }
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

ipcMain.handle("app:restart", () => {
  app.relaunch();
  app.exit(0);
  return { ok: true };
});

ipcMain.handle("desktopSettings:get", () => getDesktopSettings());

ipcMain.handle("desktopSettings:setLaunchAtLogin", (_event, enabled) => ({
  ...getDesktopSettings(),
  launchAtLogin: setLaunchAtLogin(enabled)
}));

ipcMain.handle("desktopSettings:setEnhancedSensing", (_event, enabled) => {
  if (process.platform === "darwin" && Boolean(enabled) !== hasAccessibilityPermission()) {
    openAccessibilitySettings();
  }
  writeDesktopPreference("enhancedDesktopSensing", enabled);
  return getDesktopSettings();
});

ipcMain.handle("desktopSettings:setCompanionVisible", (_event, enabled) => {
  const visible = Boolean(enabled);
  const preferences = writeDesktopPreference("showCompanionOnLaunch", visible);
  if (visible) {
    revealCompanionWindow({ focus: true });
  } else {
    hideCompanionWindow();
  }
  return {
    ...getDesktopSettings(),
    ...preferences
  };
});
