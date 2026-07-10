const { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, Notification, clipboard, powerMonitor, screen, shell, systemPreferences } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { execFile, spawnSync } = require("node:child_process");

let dashboardWindow;
let companionWindow;
let breakLockWindow;
let notchWindow;
let notchHideTimer = null;
let islandRestActive = false;
let islandRestTimer = null;
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
  wantsCurrentVisualCapture("settings-l1") ? "settings-l1" : "",
  wantsCurrentVisualCapture("settings-l2") ? "settings-l2" : "",
  wantsCurrentVisualCapture("settings-l3") ? "settings-l3" : "",
  wantsCurrentVisualCapture("settings-ordinary") ? "settings-ordinary" : "",
  wantsCurrentVisualCapture("rhythmView") ? "rhythmView" : "",
  wantsCurrentVisualCapture("profileView") ? "profileView" : "",
  wantsCurrentVisualCapture("today-share-preview") ? "today-share-preview" : "",
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
let companionExpandBaseBounds = null;
let companionBoundsTransient = false;
let lastReminderAt = 0;
let lastInterventionLevel = 1;
// Transactional delivery (2026-07-10 stopgap): count consecutive frames where the
// designated reminder channel failed to reach the screen; give up after the bound
// so a permanently blocked channel (e.g. break-lock covering the island) cannot
// spin the retry loop forever.
let reminderDeliveryRetries = 0;
const MAX_REMINDER_DELIVERY_RETRIES = 45;
// Escalation dwell (2026-07-10 stopgap): the renderer recomputes the intervention
// level every frame from volatile inputs (frontmost app, load, idle window), so a
// momentary upward flip is usually jitter, not a real escalation. A higher level
// must hold for the dwell window before it may bypass the shared cooldown. The
// real break-point capsule is NOT delayed by this — it rides breakBypass.
let lastStableInterventionLevel = 1;
let pendingEscalationLevel = 0;
let pendingEscalationSince = 0;
const ESCALATION_DWELL_MS = 12 * 1000;
// Reminder banners self-throttle so coordinator jitter/retries can never chain
// system notifications back-to-back. companion:notify (user-triggered) stays raw.
let lastReminderNotifyAt = 0;
const REMINDER_NOTIFY_MIN_INTERVAL_MS = 60 * 1000;
let lastMenuIntensity = null;
let breakRestSurfaced = false;
let autoPanelTimer = null;
let hoverOpenTimer = null;
let hoverCloseTimer = null;
let companionVisibilityTimer = null;
let dockRecentPruneTimer = null;
let startupPanelShown = false;
let companionHiddenByLifecycle = false;
let voiceProcess = null;
let suppressNextActivate = false;
const DASHBOARD_DEFAULT_SIZE = { width: 1280, height: 820 };
const DASHBOARD_MIN_SIZE = { width: 1120, height: 760 };
const DASHBOARD_SCREEN_PADDING = 18;
const COMPANION_VISIBILITY_PREFERENCE_VERSION = 3;
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
    message: "看远处 20 秒。",
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
// True between lock-screen and unlock-screen — a locked screen is definitively
// not being looked at, regardless of how low system idle is.
let screenLocked = false;
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
  bubble: { width: 344, height: 104 },
  panel: { width: 292, height: 142 },
  expanded: { width: 360, height: 130 }
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
    "settings-l1": "settings-l1",
    settingsL1: "settings-l1",
    "l1-settings": "settings-l1",
    "settings-l2": "settings-l2",
    settingsL2: "settings-l2",
    "l2-settings": "settings-l2",
    "settings-l3": "settings-l3",
    settingsL3: "settings-l3",
    "l3-settings": "settings-l3",
    "settings-ordinary": "settings-ordinary",
    settingsOrdinary: "settings-ordinary",
    rhythm: "rhythmView",
    rhythmView: "rhythmView",
    profile: "profileView",
    recap: "profileView",
    profileView: "profileView",
    "today-share-preview": "today-share-preview",
    todaySharePreview: "today-share-preview",
    "profile-share-card": "profile-share-card",
    profileShareCard: "profile-share-card",
    onboarding: "onboarding-active",
    "onboarding-active": "onboarding-active",
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
        "settings-l1",
        "settings-l2",
        "settings-l3",
        "settings-ordinary",
        "profileView",
        "today-share-preview",
        "profile-share-card",
        "onboarding-active",
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
    "dashboard-settings-l1": "eyeflow-settings-l1.png",
    "dashboard-settings-l2": "eyeflow-settings-l2.png",
    "dashboard-settings-l3": "eyeflow-settings-l3.png",
    "dashboard-settings-ordinary": "eyeflow-settings-ordinary.png",
    "dashboard-profileView": "eyeflow-profile-clean.png",
    "dashboard-today-share-preview": "eyeflow-today-share-preview.png",
    "dashboard-profile-share-card": "eyeflow-profile-share-card.png",
    "dashboard-rest-guide": "eyeflow-rest-guide.png",
    "dashboard-force-return": "eyeflow-force-return.png",
    companion: "eyeflow-companion.png",
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
    const sharePreviewOverlay = document.querySelector("#sharePreviewOverlay");
    const sharePreviewVisible = Boolean(sharePreviewOverlay?.classList.contains("show")) && isVisible(sharePreviewOverlay);
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
      : sharePreviewVisible
      ? sharePreviewOverlay
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
    // Freeze transitions before the frame is grabbed. The sidebar cross-fades its
    // background over 240ms (--ef-motion-slow) on theme change; a boot-time
    // light→dark fade caught mid-way bakes a muddy in-between color into the PNG
    // (e.g. #515250 instead of the settled #1b1c1e). Killing transitions snaps any
    // in-flight fade — and any theme we set below — straight to its committed value.
    if (!document.getElementById("__eyeflowCaptureFreeze")) {
      const freeze = document.createElement("style");
      freeze.id = "__eyeflowCaptureFreeze";
      freeze.textContent = "*,*::before,*::after{transition:none !important;transition-duration:0s !important;transition-delay:0s !important;}";
      document.head.appendChild(freeze);
    }
    if (captureTheme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    }
    // Commit the frozen styles (and any pending theme change) before we continue.
    void document.documentElement.offsetWidth;
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
      if (stateHeadline) stateHeadline.textContent = "这一轮进行中";
      if (stateAction) stateAction.textContent = "Mira 已开始计时。";
      if (sessionPanelTitle) sessionPanelTitle.textContent = "本轮节奏";
      if (sessionPill) sessionPill.textContent = "计时中";
      if (timerHint) timerHint.textContent = "计时中";
      if (startBtnText) startBtnText.textContent = "暂停";
      document.querySelector("#sessionPanel")?.scrollIntoView({ behavior: "auto", block: "center", inline: "nearest" });
    }
    const captureIntensity = ${JSON.stringify(options.intensity || "")};
    if (captureIntensity && typeof setIntensity === "function") {
      setIntensity(captureIntensity, { persistChange: false, renderChange: false, userChange: false });
      const disclosure = document.querySelector(".settings-boundary-disclosure");
      if (disclosure) disclosure.open = true;
      if (typeof render === "function") render();
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
    if (label === "break-lock-complete") {
      await win.webContents.executeJavaScript(`(() => new Promise((resolve) => {
        if (typeof ticker !== "undefined" && ticker) {
          window.clearInterval(ticker);
          ticker = null;
        }
        if (typeof completionShown !== "undefined") completionShown = false;
        if (typeof showCompletion === "function") showCompletion();
        window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
      }))()`);
    }
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
  if (!/^[a-z0-9-]+$/i.test(viewName)) return;
  const settingsIntensity = ({
    "settings-l1": "quiet",
    "settings-l2": "standard",
    "settings-l3": "clear"
  })[viewName] || "";
  const targetViewName = settingsIntensity
    ? "rhythmView"
    : viewName === "settings-ordinary"
    ? "rhythmView"
    : viewName === "today-share-preview"
      ? "todayView"
    : viewName === "profile-share-card"
      ? "profileView"
      : viewName;
  const captureState = settingsIntensity
    ? `${settingsIntensity === "quiet" ? "L1" : settingsIntensity === "clear" ? "L3" : "L2"} settings`
    : viewName === "settings-ordinary"
    ? "ordinary mode"
    : viewName === "today-share-preview"
      ? "share preview"
    : viewName === "profile-share-card"
      ? "share card"
      : "default";
  const captureReason = settingsIntensity
    ? `${captureState} debug view`
    : viewName === "settings-ordinary"
    ? "ordinary settings debug view"
    : viewName === "today-share-preview"
      ? "today share preview debug view"
    : viewName === "profile-share-card"
      ? "profile share card debug view"
    : `clean ${targetViewName} debug view`;
  const focusSelector = viewName === "profile-share-card" ? ".profile-share-bridge" : "";
  const requiredText = viewName === "today-share-preview"
    ? ["带走这张卡", "复制卡片", "eyeflow.app"]
    : viewName === "profile-share-card"
    ? ["今天就到这里了", "今日分享卡", "eyeflow.app"]
    : settingsIntensity === "quiet"
    ? ["L1 安静", "只改变 Mira 状态，不主动打断。", "最低提醒等级"]
    : settingsIntensity === "standard"
    ? ["L2 轻提示", "到休息点再轻提醒。", "当前提醒等级"]
    : settingsIntensity === "clear"
    ? ["L3 明确", "偏载明显时提醒更清楚。", "当前提醒等级"]
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
      if ("${viewName}" === "today-share-preview") {
        if (typeof isRunning !== "undefined") isRunning = true;
        if (typeof elapsedSeconds !== "undefined") elapsedSeconds = Math.max(Number(elapsedSeconds || 0), 8 * 60);
        if (typeof render === "function") render();
        if (typeof openDailySharePreview === "function") openDailySharePreview();
      }
      const captureIntensity = ${JSON.stringify(settingsIntensity)};
      if (captureIntensity && typeof setIntensity === "function") {
        setIntensity(captureIntensity, { persistChange: false, renderChange: false, userChange: false });
        const disclosure = document.querySelector(".settings-boundary-disclosure");
        if (disclosure) disclosure.open = true;
        if (typeof render === "function") render();
        enforceView();
      }
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
      const mainViewportText = Array.from(document.querySelectorAll("main h1, main h2, main h3, main h4, main p, main span, main strong, main button, main summary, main small, #sharePreviewOverlay h1, #sharePreviewOverlay h2, #sharePreviewOverlay h3, #sharePreviewOverlay p, #sharePreviewOverlay span, #sharePreviewOverlay strong, #sharePreviewOverlay button"))
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
          captureReason,
          intensity: settingsIntensity
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

function runDebugAlivePingProbe() {
  if (!debugCapture || !dashboardWindow || dashboardWindow.isDestroyed()) return;
  setTimeout(() => {
    if (!dashboardWindow || dashboardWindow.isDestroyed()) return;
    dashboardWindow.webContents.executeJavaScript(`(() => {
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
      if (typeof startSession === "function" && !isRunning) startSession();
      const targetSeconds = Number(typeof FIRST_AHA_SECONDS === "number" ? FIRST_AHA_SECONDS : 300);
      elapsedSeconds = Math.max(targetSeconds, Number(elapsedSeconds || 0));
      startedAt = Date.now() - elapsedSeconds * 1000;
      if (typeof maybeShowFirstAhaMoment === "function") maybeShowFirstAhaMoment();
      const memory = typeof ensureMiraMemory === "function" ? ensureMiraMemory() : (state.miraMemory || {});
      const events = Array.isArray(state.events)
        ? state.events.filter((event) => event.type === "mira_aha_moment")
        : [];
      const latestEvent = events[events.length - 1] || {};
      return {
        ok: true,
        elapsedSeconds,
        sessionId: state.activeFocusSessionId || "",
        pingSessionId: memory.lastAlivePingSessionId || "",
        pingAt: memory.lastAlivePingAt || "",
        firstAhaAt: memory.firstAhaAt || "",
        eventCount: events.length,
        latestMessage: latestEvent.message || "",
        latestSessionId: latestEvent.sessionId || "",
        toastAnchor: window.__eyeflowToastProbe?.anchor || "",
        toastOverlaps: window.__eyeflowToastProbe?.overlaps || []
      };
    })()`).then((result) => {
      console.log("[EyeFlow:debug] alive ping", JSON.stringify(result));
    }).catch((error) => {
      console.warn("[EyeFlow:debug] alive ping failed", error.message);
    });
  }, debugOnboarding ? 8200 : 2600);
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
        tasks
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
            requiredText: ["可以慢慢回来了", "回到 EyeFlow"],
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
        requiredText: ["可以慢慢回来了", "回到 EyeFlow"],
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

// The one place that flips the Dock icon. Redundant show calls are skipped, but hide
// is always re-asserted: macOS can report the Dock as hidden while the UI still keeps
// a stale app icon around. Activation policy is set alongside the Dock call so
// menu-bar mode behaves like a real accessory app, not just a regular app with a
// hidden running indicator.
function setDockVisible(visible) {
  if (process.platform !== "darwin" || !app.dock) return;
  const next = Boolean(visible);
  if (typeof app.setActivationPolicy === "function") {
    app.setActivationPolicy(next ? "regular" : "accessory");
  }
  if (next && app.dock.isVisible() === true) return;
  if (next) {
    app.dock.show();
  } else {
    app.dock.hide();
  }
}

function showDockIcon() {
  setDockVisible(true);
}

function hideDockIcon() {
  setDockVisible(false);
}

function pruneEyeFlowDockRecentEntry() {
  if (process.platform !== "darwin") return false;
  const dockPreferencesPath = path.join(app.getPath("home"), "Library", "Preferences", "com.apple.dock.plist");
  if (!fs.existsSync(dockPreferencesPath)) return false;

  const countResult = spawnSync("/usr/bin/plutil", [
    "-extract",
    "recent-apps",
    "raw",
    "-o",
    "-",
    dockPreferencesPath
  ], { encoding: "utf8" });
  const count = Number.parseInt(String(countResult.stdout || "").trim(), 10);
  if (!Number.isFinite(count) || count <= 0) return false;

  let removed = false;
  for (let index = count - 1; index >= 0; index -= 1) {
    const bundleResult = spawnSync("/usr/libexec/PlistBuddy", [
      "-c",
      `Print :recent-apps:${index}:tile-data:bundle-identifier`,
      dockPreferencesPath
    ], { encoding: "utf8" });
    if (bundleResult.status !== 0 || String(bundleResult.stdout || "").trim() !== "com.eyeflow.app") continue;

    const deleteResult = spawnSync("/usr/libexec/PlistBuddy", [
      "-c",
      `Delete :recent-apps:${index}`,
      dockPreferencesPath
    ], { encoding: "utf8" });
    removed = removed || deleteResult.status === 0;
  }

  if (removed) {
    spawnSync("/usr/bin/killall", ["Dock"], { encoding: "utf8" });
  }
  return removed;
}

function scheduleEyeFlowDockRecentPrune() {
  if (process.platform !== "darwin") return;
  if (dockRecentPruneTimer) clearTimeout(dockRecentPruneTimer);
  dockRecentPruneTimer = setTimeout(() => {
    dockRecentPruneTimer = null;
    pruneEyeFlowDockRecentEntry();
  }, 1200);
}

// Single authority for the Dock icon. Menu-bar mode means the Dock icon stays hidden
// even when the dashboard is open; the menu bar item is the app's entry point.
function syncDock() {
  if (process.platform !== "darwin" || !app.dock) return;
  const shouldHide = desktopPreferenceDefaults().hideDockOnClose;
  setDockVisible(!shouldHide);
  if (shouldHide) {
    pruneEyeFlowDockRecentEntry();
    scheduleEyeFlowDockRecentPrune();
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
    hideDockOnClose: settings.hideDockOnClose === true,
    showCompanionOnLaunch: hasCompanionVisibilityPreference
      ? settings.showCompanionOnLaunch !== false
      : true,
    // Top-of-screen reminder island — an independent channel that can coexist with
    // the desktop companion (not either/or). Default on; toggled from the menu/tray.
    showReminderIsland: settings.showReminderIsland !== false
  };
}

function isCompanionWindowVisible() {
  return Boolean(companionWindow && !companionWindow.isDestroyed() && companionWindow.isVisible());
}

function ensureCompanionVisibleForPreference({ focus = false } = {}) {
  if (!desktopPreferenceDefaults().showCompanionOnLaunch) return false;
  if (isCompanionWindowVisible()) {
    keepCompanionVisible();
    if (focus) {
      bringCompanionToFront(companionWindow);
      companionWindow.focus();
    }
    return true;
  }
  revealCompanionWindow({ focus });
  return isCompanionWindowVisible();
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
  const preferences = desktopPreferenceDefaults(settings);
  if (preferences.showCompanionOnLaunch) {
    ensureCompanionVisibleForPreference();
  }
  return {
    ...preferences,
    companionVisible: isCompanionWindowVisible(),
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
        { type: "separator" },
        { label: "提醒强度", enabled: false },
        ...intensityMenuItems(),
        { type: "separator" },
        { label: "显示/退出 Mira", accelerator: "CommandOrControl+M", click: toggleCompanionVisibility },
        { label: "找回 Mira", accelerator: "CommandOrControl+Shift+M", click: resetCompanionPosition },
        {
          label: "顶端提醒岛",
          type: "checkbox",
          checked: desktopPreferenceDefaults().showReminderIsland,
          click: toggleReminderIsland
        },
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
  if (companionBubbleBaseBounds || companionExpandBaseBounds) return;
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

function hideEyeFlowAfterRealBreakLock() {
  if (dashboardWindow && !dashboardWindow.isDestroyed()) dashboardWindow.hide();
  syncDock();
  if (process.platform !== "darwin") return;
  suppressNextActivate = true;
  setTimeout(() => {
    if (dashboardWindow && !dashboardWindow.isDestroyed()) dashboardWindow.hide();
    app.hide();
    syncDock();
  }, 80);
}

function restoreDashboardAfterBreakLock(payload = {}) {
  if (!dashboardWindow || dashboardWindow.isDestroyed()) return;
  if (dashboardWindow.isMinimized()) dashboardWindow.restore();
  if (dashboardWindow.isFullScreen()) dashboardWindow.setFullScreen(false);
  if (dashboardWindow.isMaximized()) dashboardWindow.unmaximize();
  if (process.platform === "darwin") dashboardWindow.setVisibleOnAllWorkspaces(false);
  dashboardWindow.setAlwaysOnTop(false);
  keepDashboardVisible();
  dashboardWindow.webContents.send("breakLock:finished", payload);
  if (payload.preview) {
    dashboardWindow.show();
    dashboardWindow.focus();
    return;
  }
  hideEyeFlowAfterRealBreakLock();
}

let dashboardRevealTimer = null;

// Bring the dashboard onto the CURRENT Space/desktop. Without this, a window created
// on another Space "shows" off where the user can't see it — so open -a / dock-click
// looked like it did nothing (the "偶发显示不稳" symptom). Pin to all workspaces so it
// surfaces on the active Space, then revert on a delay: a SYNCHRONOUS revert can beat
// the WindowServer's Space reassignment and leave it on the origin Space. clearTimeout
// below cancels a pending revert if reveal fires again first. visibleOnFullScreen:true so an
// explicit open even surfaces over a fullscreen Space (a user-invoked main window,
// unlike the ambient companion).
function revealDashboardOnCurrentSpace() {
  if (!dashboardWindow || dashboardWindow.isDestroyed()) return;
  if (dashboardWindow.isMinimized()) dashboardWindow.restore();
  if (process.platform !== "darwin") {
    dashboardWindow.show();
    dashboardWindow.focus();
    return;
  }
  dashboardWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  dashboardWindow.show();
  dashboardWindow.moveTop();
  dashboardWindow.focus();
  app.focus({ steal: true });
  clearTimeout(dashboardRevealTimer);
  dashboardRevealTimer = setTimeout(() => {
    dashboardRevealTimer = null;
    if (dashboardWindow && !dashboardWindow.isDestroyed()) {
      dashboardWindow.setVisibleOnAllWorkspaces(false);
    }
  }, 300);
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
    }
  } else {
    if (source === "avatar") clearHoverOpenTimer();
    scheduleHoverClose();
  }
}

function bringCompanionToFront(win) {
  if (!win || win.isDestroyed()) return;
  win.setAlwaysOnTop(true, "floating");
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false });
  win.moveTop();
}

function sameWindowBounds(a, b) {
  return Boolean(a && b)
    && Math.abs(a.x - b.x) <= 1
    && Math.abs(a.y - b.y) <= 1
    && Math.abs(a.width - b.width) <= 1
    && Math.abs(a.height - b.height) <= 1;
}

function repairCompanionBounds({ reset = false } = {}) {
  if (!companionWindow || companionWindow.isDestroyed()) return false;
  if (companionBubbleBaseBounds || companionExpandBaseBounds) return false;
  const currentBounds = companionWindow.getBounds();
  const nextBounds = visibleCompanionBounds(reset ? defaultCompanionBounds() : currentBounds);
  if (sameWindowBounds(currentBounds, nextBounds)) return false;
  companionWindow.setBounds(nextBounds, false);
  saveCompanionBounds();
  return true;
}

function revealCompanionWindow({ reset = false, focus = false } = {}) {
  if (!companionWindow || companionWindow.isDestroyed()) createCompanionWindow();
  if (!companionWindow || companionWindow.isDestroyed()) return;
  companionHiddenByLifecycle = false;
  const wasVisible = companionWindow.isVisible();
  const repaired = repairCompanionBounds({ reset });
  if (!wasVisible) companionWindow.showInactive();
  if (!wasVisible || reset || focus) bringCompanionToFront(companionWindow);
  if (focus) companionWindow.focus();
  if (!repaired && !wasVisible) saveCompanionBounds();
  syncDock();
}

function ensureCompanionReachable() {
  const shouldShowCompanion = desktopPreferenceDefaults().showCompanionOnLaunch;
  if (!companionWindow || companionWindow.isDestroyed()) {
    if (shouldShowCompanion) revealCompanionWindow();
    return;
  }
  keepCompanionVisible();
  if (!companionWindow.isVisible()) {
    if (shouldShowCompanion) revealCompanionWindow();
    return;
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

function expandedBoundsForCompanion(baseBounds) {
  return visibleCompanionBounds({
    ...companionSizes.expanded,
    x: baseBounds.x + baseBounds.width - companionSizes.expanded.width,
    y: baseBounds.y + Math.round((baseBounds.height - companionSizes.expanded.height) / 2)
  });
}

function showCompanionPanel() {
  if (companionBubbleBaseBounds) return;
  if (!companionWindow || companionWindow.isDestroyed()) createCompanionWindow();
  if (!companionWindow || companionWindow.isDestroyed()) return;
  clearHoverOpenTimer();
  clearHoverCloseTimer();
  if (!companionExpandBaseBounds) {
    companionExpandBaseBounds = companionWindow.getBounds();
  }
  companionExpanded = true;
  companionBoundsTransient = true;
  companionWindow.setBounds(expandedBoundsForCompanion(companionExpandBaseBounds), false);
  companionBoundsTransient = false;
  companionWindow.showInactive();
  bringCompanionToFront(companionWindow);
  sendCompanionExpanded();
  syncDock();
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
  if (companionWindow && !companionWindow.isDestroyed() && companionExpandBaseBounds) {
    companionBoundsTransient = true;
    companionWindow.setBounds(visibleCompanionBounds({
      ...companionSizes.compact,
      x: companionExpandBaseBounds.x,
      y: companionExpandBaseBounds.y
    }), false);
    companionBoundsTransient = false;
  }
  companionExpandBaseBounds = null;
  sendCompanionExpanded();
  saveCompanionBounds();
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
  syncDock();
  sendCompanionBubble({ visible: true, message: text });
  if (companionBubbleTimer) clearTimeout(companionBubbleTimer);
  const durationMs = Number.isFinite(options.durationMs) ? options.durationMs : 8000;
  companionBubbleTimer = setTimeout(restoreCompanionBubble, Math.max(1200, Math.min(durationMs, 12000)));
  return { ok: true, bounds: nextBounds };
}

function maybeShowCompanionExitHint() {
  const settings = readSettings();
  if (settings.companionExitHintShown === true) return { ok: false, reason: "shown" };
  if (debugCapture || wantsCurrentVisualCapture("companion")) {
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
  repairCompanionBounds();
}

function resetCompanionPosition() {
  companionExpanded = false;
  revealCompanionWindow({ reset: true, focus: true });
  sendCompanionExpanded();
}

function hideCompanionWindow({ persistPreference = true } = {}) {
  if (persistPreference) markCompanionExitHintShown();
  if (persistPreference) writeDesktopPreference("showCompanionOnLaunch", false);
  hideWindowIfAlive(companionWindow);
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

function wasOpenedAtLogin() {
  if (process.platform !== "darwin") return false;
  return Boolean(app.getLoginItemSettings().wasOpenedAtLogin);
}

function wantsDashboardOnLaunch() {
  return Boolean(debugCapture || debugOnboarding || process.env.EYEFLOW_SHOW_DASHBOARD_ON_LAUNCH === "1");
}

function launchBehavior() {
  const openedAtLogin = wasOpenedAtLogin();
  const showDashboard = wantsDashboardOnLaunch() || !openedAtLogin;
  return {
    openedAtLogin,
    showDock: showDashboard,
    showDashboard,
    suppressInitialActivate: !showDashboard,
    revealOnboarding: true
  };
}

function applyLaunchDockBehavior(behavior) {
  if (desktopPreferenceDefaults().hideDockOnClose) {
    hideDockIcon();
    return;
  }
  if (behavior.showDock) {
    showDockIcon();
  } else {
    hideDockIcon();
  }
}

function onboardingOverlayIsVisibleScript() {
  return `(() => {
    const overlay = document.querySelector("#onboardingOverlay");
    if (!overlay || !overlay.classList.contains("show")) return false;
    const style = window.getComputedStyle(overlay);
    return style.display !== "none"
      && style.visibility !== "hidden"
      && Number(style.opacity || 0) > 0;
  })()`;
}

function maybeRevealDashboardForOnboarding({ showOnReady, revealOnboarding } = {}) {
  if (showOnReady || !revealOnboarding || debugCapture) return;
  if (!dashboardWindow || dashboardWindow.isDestroyed()) return;
  dashboardWindow.webContents.executeJavaScript(onboardingOverlayIsVisibleScript()).then((onboardingVisible) => {
    if (!onboardingVisible || !dashboardWindow || dashboardWindow.isDestroyed()) return;
    showDashboard({ view: "todayView", focus: "onboarding" });
  }).catch((error) => {
    console.warn("[EyeFlow:dashboard] onboarding reveal probe failed", error.message);
  });
}

function createDashboardWindow(options = {}) {
  const showOnReady = options.showOnReady !== false;
  const revealOnboarding = options.revealOnboarding !== false;
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
    if (showOnReady) dashboardWindow.show();
  });

  // Whenever the dashboard becomes visible, re-assert the Dock: a companion/island
  // show during launch may have hidden it before the window appeared.
  dashboardWindow.on("show", () => syncDock());

  dashboardWindow.on("close", (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      dashboardWindow.hide();
      syncDock();
    }
  });

  dashboardWindow.on("moved", saveDashboardBounds);
  dashboardWindow.on("resized", saveDashboardBounds);

  dashboardWindow.webContents.once("did-finish-load", () => {
    dashboardWindow.webContents.send("state:update", latestState);
    dashboardWindow.webContents.send("activity:update", latestActivity);
    maybeRevealDashboardForOnboarding({ showOnReady, revealOnboarding });
    captureDebugPage(dashboardWindow, "dashboard", 600, debugOnboarding
      ? {
          requestedView: "todayView",
          captureState: "default",
          captureReason: "initial dashboard"
        }
      : {
          requestedView: "todayView",
          expectedOnboardingVisible: false,
          captureState: "default",
          requiredText: ["我在旁边", "有屏幕活动时，我会自动开始计时。"],
          captureReason: "initial dashboard"
        });
    if (wantsCurrentVisualCapture("today-session")) {
      captureDebugPage(dashboardWindow, "dashboard-session", 1000, {
        requestedView: "todayView",
        expectedVisibleView: "todayView",
        expectedOnboardingVisible: false,
        sessionActive: true,
        captureState: "session active",
        requiredText: ["这一轮进行中", "Mira 已开始计时", "本轮"],
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
        requiredText: ["节奏", "专注提醒", "休息长度"],
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
        requiredText: ["计时中", "暂停"],
        captureReason: "today auto tracking"
      });
    }
    const debugViewDelayStep = debugRestClick ? 7000 : 900;
    debugDashboardViews.forEach((viewName, index) => {
      captureDebugDashboardView(viewName, index * debugViewDelayStep);
    });
    captureDebugOnboarding();
    runDebugAlivePingProbe();
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
    ensureCompanionVisibleForPreference();
    setTimeout(() => maybeShowCompanionExitHint(), 650);
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
    if (companionBoundsTransient) return;
    saveCompanionBounds();
  });
}

function createFallbackTrayIcon() {
  return nativeImage.createFromDataURL(
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAlElEQVR4nO2VwQ3DMAhFfYfdIbsDR2iH7A7dId0BO0R3yQ6ZITWqGPzQO+SbH5QBv4CkSkVN6ARwEXkHQq+AMwBam9wkvU8s6Z0RLgHEc9d5SZ3yXGaEApjUruc0DU2lVbwCzpQhyXwCTkpcdIF7YJru8iU0aGdFgWs+Gg5l+bC8j4K0rj6dX+5LzstC8yqQwW3EB3cdyasHctkAAAAASUVORK5CYII="
  );
}

function createDarwinTrayIcon() {
  const icon = nativeImage.createEmpty();
  icon.addRepresentation({
    scaleFactor: 1,
    buffer: fs.readFileSync(path.join(appRoot, "assets", "trayTemplate.png"))
  });
  icon.addRepresentation({
    scaleFactor: 2,
    buffer: fs.readFileSync(path.join(appRoot, "assets", "trayTemplate@2x.png"))
  });
  icon.setTemplateImage(true);
  return icon;
}

function createTrayIcon() {
  return process.platform === "darwin" ? createDarwinTrayIcon() : createFallbackTrayIcon();
}

function createTray() {
  const icon = createTrayIcon();
  tray = new Tray(icon);
  updateTrayPresentation();
  updateTrayMenu();
  tray.on("click", handleTrayClick);
  tray.on("right-click", showTrayMenu);
}

function trayStatusTitle() {
  const load = Math.round(Number(latestState.load || 0));
  const level = Number(latestState.interventionLevel || 1);
  if (latestState.mood === "rest" || level >= 3) return "休息";
  if (load >= 75) return String(load);
  return "";
}

function updateTrayPresentation() {
  if (!tray) return;
  const statusTitle = trayStatusTitle();
  if (process.platform === "darwin") {
    tray.setTitle(statusTitle);
  }
  tray.setToolTip(statusTitle ? `EyeFlow · ${statusTitle}` : "EyeFlow");
}

function trayMiraVisibilityLabel() {
  return desktopPreferenceDefaults().showCompanionOnLaunch && isCompanionWindowVisible()
    ? "退出 Mira"
    : "显示 Mira";
}

function trayStatusLine() {
  const load = Math.round(Number(latestState.load || 0));
  const level = Number(latestState.interventionLevel || 1);
  if (latestState.mood === "rest" || level >= 3) return "到恢复断点了";
  if (latestState.isRunning || latestState.mood === "focus") return "本轮计时中";
  if (load >= 75) return `状态偏高 · ${load}`;
  return "Mira 安静待命";
}

function startTrayRest() {
  showDashboard({ restGuide: true });
}

// Intensity (the reminder boundary) lives in the renderer — the single source of truth.
// The menu reads the current level from the last published state for its radio check.
function currentIntensity() {
  const v = latestState && latestState.intensity;
  return (v === "quiet" || v === "standard" || v === "clear" || v === "force") ? v : "standard";
}

// The four reminder-boundary levels as one radio group, each with an inline one-line note.
// Reused by both the tray and the app (⌘) menu so they stay identical.
function intensityMenuItems() {
  const cur = currentIntensity();
  return [
    { label: "L1 安静 — 只改状态，不弹提醒", type: "radio", checked: cur === "quiet", click: () => requestIntensityFromMenu("quiet") },
    { label: "L2 轻提示 — 到断点轻提一次", type: "radio", checked: cur === "standard", click: () => requestIntensityFromMenu("standard") },
    { label: "L3 明确 — 到点胶囊+通知", type: "radio", checked: cur === "clear", click: () => requestIntensityFromMenu("clear") },
    { label: "L4 强制爱… — 到点全屏，应用内开启", type: "radio", checked: cur === "force", click: () => requestIntensityFromMenu("force") }
  ];
}

// Route the menu choice through the renderer's requestIntensity (the SAME path as the
// in-app buttons), so L4 gets its in-app confirm instead of one-click arming full-screen
// from the menu bar. L1/L2/L3 apply silently in the background window.
function requestIntensityFromMenu(level) {
  // Force needs its in-app confirm, which lives inside a collapsed disclosure on the
  // Settings page — navigate there and open/scroll to the 提醒边界 section so the choice
  // isn't lost behind the Today view. A missing/destroyed window (any level) also needs showing.
  if (level === "force") {
    showDashboard({ view: "rhythmView", focus: "intensity" });
  } else if (!dashboardWindow || dashboardWindow.isDestroyed()) {
    showDashboard();
  }
  const send = () => {
    if (dashboardWindow && !dashboardWindow.isDestroyed()) {
      dashboardWindow.webContents.send("intensity:request", level);
    }
  };
  if (dashboardWindow && !dashboardWindow.isDestroyed() && dashboardWindow.webContents.isLoading()) {
    dashboardWindow.webContents.once("did-finish-load", send);
  } else {
    send();
  }
}

// The renderer notifies main the instant the level changes, so the menu radio never lags
// the render/publish cycle — render() can early-return (force break) before it publishes
// the companion state, which would otherwise leave latestState.intensity stale.
function applyMenuIntensity(level) {
  if (level !== "quiet" && level !== "standard" && level !== "clear" && level !== "force") return;
  latestState = { ...latestState, intensity: level };
  updateTrayMenu();
  if (level !== lastMenuIntensity) {
    lastMenuIntensity = level;
    updateApplicationMenu();
  }
}
ipcMain.handle("intensity:changed", (_event, level) => {
  applyMenuIntensity(level);
  return { ok: true };
});

function buildTrayMenu() {
  return Menu.buildFromTemplate([
    { label: trayStatusLine(), enabled: false },
    { type: "separator" },
    { label: "打开 EyeFlow", click: showDashboard },
    { label: "休息一下", click: startTrayRest },
    { type: "separator" },
    { label: "提醒强度", enabled: false },
    ...intensityMenuItems(),
    { type: "separator" },
    { label: trayMiraVisibilityLabel(), click: toggleCompanionVisibility },
    {
      label: "顶端提醒岛",
      type: "checkbox",
      checked: desktopPreferenceDefaults().showReminderIsland,
      click: toggleReminderIsland
    },
    { type: "separator" },
    { role: "quit", label: "退出 EyeFlow" }
  ]);
}

function updateTrayMenu() {
  if (!tray) return null;
  updateTrayPresentation();
  const menu = buildTrayMenu();
  if (process.platform !== "darwin") tray.setContextMenu(menu);
  return menu;
}

function showTrayMenu() {
  if (!tray) return;
  const menu = updateTrayMenu();
  tray.popUpContextMenu(menu);
}

function handleTrayClick() {
  if (process.platform === "darwin") {
    showTrayMenu();
    return;
  }
  showDashboard();
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
  syncDock();
  if (!dashboardWindow || dashboardWindow.isDestroyed()) createDashboardWindow({ showOnReady: true, revealOnboarding: false });
  keepDashboardVisible();
  revealDashboardOnCurrentSpace();
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
  if (desktopPreferenceDefaults().showCompanionOnLaunch && isCompanionWindowVisible()) {
    hideCompanionWindow();
    return;
  }
  showCompanion();
}

function toggleReminderIsland() {
  const next = !desktopPreferenceDefaults().showReminderIsland;
  writeDesktopPreference("showReminderIsland", next); // refreshes app + tray menus
  if (!next) hideNotchIsland();
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

// Reminder-path banners only (the coordinator). ≥60s between banners, so level
// jitter or transactional retries can never chain system notifications. Returns
// ok:false when throttled so the caller does not count it as a delivery.
// `urgent` (codex review 2026-07-10): when the banner is the round's ONLY designated
// channel (island disabled / non-darwin) the break point must not be droppable by the
// throttle — the once-per-round latch already limits it to a single shot.
function notifyReminder(message, { urgent = false } = {}) {
  const now = Date.now();
  if (!urgent && now - lastReminderNotifyAt < REMINDER_NOTIFY_MIN_INTERVAL_MS) {
    return { ok: false, supported: true, throttled: true };
  }
  const sent = notify(message);
  if (sent && sent.ok) lastReminderNotifyAt = now;
  return sent;
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

function forceCloseBreakLockWindow(winToClose) {
  if (!winToClose || winToClose.isDestroyed()) return;
  breakLockCanClose = true;
  try {
    winToClose.setKiosk(false);
    winToClose.setFullScreen(false);
    winToClose.setAlwaysOnTop(false);
    winToClose.setVisibleOnAllWorkspaces(false);
    winToClose.hide();
    winToClose.close();
  } catch (error) {
    console.warn("[EyeFlow] break-lock close failed", error.message);
  }
  setTimeout(() => {
    if (!winToClose || winToClose.isDestroyed()) return;
    try {
      winToClose.destroy();
    } catch (error) {
      console.warn("[EyeFlow] break-lock destroy failed", error.message);
    }
  }, 1200);
}

function hideDashboardBehindBreakLock(previewWindow) {
  if (previewWindow) return;
  if (!dashboardWindow || dashboardWindow.isDestroyed()) return;
  dashboardWindow.hide();
  syncDock();
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
  // A full-screen rest supersedes any ambient island look-away — abort it so its timer
  // can't resolve the pending reminder before this longer break actually completes.
  hideNotchIsland();

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
      requiredText: ["看向远处", "紧急退出"],
      captureReason: payload.preview ? "force preview active" : "break lock active"
    });
    breakLockWindow.show();
    enterBreakLockFullscreen();
    syncDock();
    breakLockWindow.focus();
    hideDashboardBehindBreakLock(previewWindow);
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
      requiredText: ["看向远处", "紧急退出"],
      captureReason: payload.preview ? "force preview active" : "break lock active"
    });
  });
  breakLockWindow.once("ready-to-show", () => {
    breakLockWindow.show();
    enterBreakLockFullscreen();
    syncDock();
    breakLockWindow.focus();
    hideDashboardBehindBreakLock(previewWindow);
  });
  const currentBreakLockWindow = breakLockWindow;
  breakLockWindow.on("closed", () => {
    if (breakLockWindow === currentBreakLockWindow) breakLockWindow = null;
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
    const closeBreakLockWindow = () => forceCloseBreakLockWindow(winToClose);
    if (debugCapture && payload.preview) {
      Promise.resolve(captureDebugPageNow(winToClose, "break-lock-complete", {
        requestedView: "break-lock",
        expectedVisibleView: "",
        captureState: "force-return",
        requiredText: ["可以慢慢回来了", "回到 EyeFlow"],
        captureReason: "force preview complete state"
      })).finally(closeBreakLockWindow);
    } else {
      closeBreakLockWindow();
    }
  }
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    restoreDashboardAfterBreakLock(payload);
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
  // The app (⌘) menu isn't rebuilt on every publish; refresh it only when the reminder
  // level actually changes so its radio group stays in sync with the tray + settings.
  if (currentIntensity() !== lastMenuIntensity) {
    lastMenuIntensity = currentIntensity();
    updateApplicationMenu();
  }
  for (const win of [dashboardWindow, companionWindow]) {
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
  // Only an UPWARD escalation (e.g. L2 → L3) may bypass the shared cooldown to
  // re-surface immediately — and only after it held for the dwell window
  // (2026-07-10 stopgap): app-switch/load/idle jitter flips the recomputed level
  // 1↔3 in seconds, and every raw up-flip used to fire capsule+banner instantly
  // (the "rapid-fire reminders" dogfood bug). Downshifts settle immediately.
  let escalated = false;
  if (level > lastStableInterventionLevel) {
    if (pendingEscalationLevel !== level) {
      pendingEscalationLevel = level;
      pendingEscalationSince = now;
    }
    if (now - pendingEscalationSince >= ESCALATION_DWELL_MS) {
      escalated = true;
      lastStableInterventionLevel = level;
      pendingEscalationLevel = 0;
    }
  } else {
    lastStableInterventionLevel = level;
    pendingEscalationLevel = 0;
  }

  // Runtime visibility: the companion is off-screen if hidden by preference, exited
  // this session via double-click, or hidden by a sleep/lock lifecycle event. The
  // lifecycle case is transient (restored on resume) and must NOT get a fallback.
  const companionVisible = isCompanionWindowVisible();
  const companionExited = !companionVisible && !companionHiddenByLifecycle;

  const snoozeUntil = Number(state.snoozeUntil || 0);
  const quietedByUser = Boolean(state.reminderDeferred) || snoozeUntil > now;
  if (quietedByUser) {
    if (companionVisible) hideCompanionPanel();
    return;
  }

  // breakDue is itself an opening (codex review 2026-07-10): in auto tracking
  // isRunning is false, and at the exact break point the user may be mid-typing
  // (no reminderOpening, no naturalBreak) with the pending record still blocked by
  // the renderer cooldown — without breakDue here the coordinator returned before
  // breakBypass could ever fire the round's capsule.
  const hasReminderOpening = Boolean(state.isRunning || state.reminderOpening || state.naturalBreak || state.reminderPending || state.breakDue);
  if (!hasReminderOpening) {
    if (levelChanged && companionVisible) hideCompanionPanel();
    return;
  }

  const islandEnabled = desktopPreferenceDefaults().showReminderIsland !== false;
  const reminderMessage = state.message || "找一个恢复断点，看远处 20 秒。";

  // The REAL break point (manual timer hit its target, or an auto-mode natural pause) is
  // the moment that most deserves the full look-away. It surfaces the countdown capsule
  // and BYPASSES the shared cooldown once per round — so an earlier pre-target heads-up
  // can't eat it. Before the target, the "提醒边界" heads-up is only a no-countdown pill.
  const breakDue = Boolean(state.breakDue);
  const l3BreakPoint = level >= 3 && breakDue;
  // Two independent questions, kept separate so the same level always behaves the same:
  //   (1) how strong is the reminder; (2) where can Mira deliver it. Mira on screen
  //   carries L2 in her bubble. L3 at the real break point gets the clear top capsule
  //   and system banner even when Mira is visible.
  const showBubble = companionVisible && level >= 2 && !l3BreakPoint;
  const showRest = islandEnabled && level >= 2 && (companionExited || l3BreakPoint);
  // System notification is the away/lock-screen backup, governed by macOS itself (no
  // in-app toggle). L3 at the real break point is also explicit enough to join it.
  const showNotify = level >= 2 && (companionExited || l3BreakPoint) && (level >= 3 || !islandEnabled);

  if (!breakDue) breakRestSurfaced = false; // re-arm the once-per-break-point latch each round
  const breakBypass = breakDue && !breakRestSurfaced;

  if (!showBubble && !showRest && !showNotify) {
    // Nothing to surface (L1, or a non-break reminder while Mira is on screen and quiet).
    if (levelChanged && companionVisible) hideCompanionPanel();
    return;
  }

  const reminderWaiting = Boolean(state.reminderPending);
  const reminderCooldown = reminderWaiting
    ? 12 * 60 * 1000
    : level >= 3
      ? 6 * 60 * 1000
      : 8 * 60 * 1000;

  // ONE coordinated surfacing on a single shared cooldown, so a reminder never
  // multi-buzzes across drifting per-channel timers. An upward escalation
  // (e.g. L2 → L3) re-surfaces immediately.
  if (escalated || breakBypass || now - lastReminderAt > reminderCooldown) {
    // Transactional delivery (2026-07-10 stopgap): deliver FIRST, consume the
    // latch/cooldown only after a channel confirmed it reached the screen. The old
    // order booked lastReminderAt/breakRestSurfaced up front, so a blocked island
    // (look-away already running, break-lock covering it, window error) silently
    // ate the once-per-round break capsule and the 12-min pending cooldown kept it
    // buried. Now a failed delivery leaves the books untouched and the very next
    // publish retries — bounded by MAX_REMINDER_DELIVERY_RETRIES.
    let delivered = false;
    let restDelivered = false;
    if (showBubble) {
      showCompanionPanel();
      delivered = true;
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
    // Mira exited → the island IS the reminder. At the real break point it runs the
    // look-away micro-rest (带计时, self-closing); before the target it's only a
    // no-countdown heads-up pill (提醒边界热身) — never a full rest capsule too early.
    if (showRest) {
      if (breakDue) {
        restDelivered = startIslandMicroRest(islandRestMessage(level), state.reminderId || null);
        delivered = delivered || restDelivered;
      } else {
        const pill = showNotchIsland({ mode: "text", message: islandNoticeMessage(state, level) });
        delivered = delivered || Boolean(pill && pill.ok);
      }
    }
    if (showNotify) {
      const sent = notifyReminder(reminderMessage, { urgent: breakDue && !showRest });
      delivered = delivered || Boolean(sent && sent.ok);
    }
    // The break capsule is the PRIMARY channel at the real break point: a system
    // banner alone must not consume the once-per-round latch, or "banner fired,
    // capsule missing" would still bury the round's look-away.
    const primaryRestWanted = showRest && breakDue;
    const primaryOk = !primaryRestWanted || restDelivered;
    if (delivered) {
      lastReminderAt = now;
      // Ledger sync (2026-07-10 热身双跳): a level that was successfully DELIVERED to
      // the user is the confirmed stable level, no matter which gate path opened
      // (cooldown / breakBypass / escalated). Without this, a cooldown-path fire at a
      // level whose dwell was still pending left the escalation ledger behind — the
      // dwell completed seconds later, `escalated` re-opened the gate, and the same
      // heads-up pill fired twice within seconds. Delivery ledger and escalation
      // ledger must never disagree about what the user has already seen.
      lastStableInterventionLevel = level;
      pendingEscalationLevel = 0;
    }
    if (delivered && primaryOk) {
      reminderDeliveryRetries = 0;
      if (breakDue) breakRestSurfaced = true; // the target break point surfaces once per round
    } else {
      reminderDeliveryRetries += 1;
      if (reminderDeliveryRetries >= MAX_REMINDER_DELIVERY_RETRIES) {
        // Bounded surrender: the channel stayed blocked for the whole retry window
        // (~45 publishes). Consume the books like the old behavior so the loop
        // converges; the round's capsule is conceded to the next cooldown/round.
        reminderDeliveryRetries = 0;
        lastReminderAt = now;
        if (breakDue) breakRestSurfaced = true;
      }
    }
  } else {
    // No delivery attempted this frame — the failure streak is broken. The retry
    // bound counts CONSECUTIVE blocked attempts; without this reset, stale failures
    // from an earlier round leaked into the next break point and surrendered early
    // (codex review 2026-07-10).
    reminderDeliveryRetries = 0;
  }
}

// The away micro-rest: the island doesn't just announce a put-away reminder — it runs a
// short look-away countdown and closes the loop itself. main.js is the sensor, so it
// judges whether you actually stepped away (input stayed idle through the look-away) and
// tells the renderer to resolve its single pending-reminder ledger. This kills the
// "island fired, then nothing — the rest sits in the background forever" dead-end.
// Mira's words on the away look-away capsule — the same gentle first-person voice as the
// rest of the app. L3 is more certain, not louder (matches her "我建议现在休息一下").
function islandRestMessage(level) {
  return level >= 3 ? "眼睛该松一下了，看远处" : "陪你看会儿远处";
}

// The pre-target heads-up on the away island — a green pill WITHOUT a countdown, distinct
// from the real break point's带计时 look-away capsule. In force mode it's a warning that
// the full-screen takeover is coming (so it's never abrupt), not a look-away line.
function islandNoticeMessage(state, level) {
  if (state && state.forceMode) return "快到断点了，到点会进入全屏恢复——先收个尾";
  return level >= 3 ? "眼睛该歇会儿了，待会儿看看远处" : "快到断点了，待会儿看看远处";
}

const ISLAND_LOOKAWAY_SECONDS = 20;
// Returns true only when the look-away actually reached the screen — the coordinator
// uses this to decide whether the once-per-round break latch may be consumed.
function startIslandMicroRest(message, reminderId) {
  if (islandRestActive) return false; // one look-away at a time; the cooldown handles the rest
  const shown = showNotchIsland({ mode: "rest", message, breakSeconds: ISLAND_LOOKAWAY_SECONDS });
  if (!shown || !shown.ok) return false; // island unavailable (non-darwin / break-lock) — leave the ledger to its own timeout
  islandRestActive = true;
  if (islandRestTimer) clearTimeout(islandRestTimer);
  islandRestTimer = setTimeout(() => {
    islandRestTimer = null;
    islandRestActive = false;
    let restedAway = false;
    try {
      // getSystemIdleTime = seconds since the last keyboard/mouse input. If it covers most
      // of the look-away, the user stopped interacting = they took the micro-break. This is
      // the same present/idle proxy the app already uses; input-idle is not proof they
      // looked away, but it's the honest signal we have, and the copy says "look away".
      restedAway = powerMonitor.getSystemIdleTime() >= Math.max(8, ISLAND_LOOKAWAY_SECONDS - 6);
    } catch (_) {
      restedAway = false;
    }
    if (dashboardWindow && !dashboardWindow.isDestroyed()) {
      // Carry the reminder id so the renderer only closes the exact reminder this
      // look-away was for — never a newer/stale one the user may have swapped in during
      // the 20s (id mismatch → the renderer leaves it to its own 12-min timeout).
      dashboardWindow.webContents.send("reminder:resolve", {
        status: restedAway ? "completed" : "ignored",
        reminderId: reminderId || null,
        source: "island-micro-rest"
      });
    }
    showNotchIsland({ mode: "restResult", ok: restedAway });
  }, ISLAND_LOOKAWAY_SECONDS * 1000);
  return true;
}

// Cancel an in-flight look-away so its timer can't fire after the island was hidden
// (toggle-off, lock/suspend/quit, or a full-screen break superseding it) and resolve
// a reminder or re-show the pill behind the user's back.
function cancelIslandMicroRest() {
  if (islandRestTimer) {
    clearTimeout(islandRestTimer);
    islandRestTimer = null;
  }
  islandRestActive = false;
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
    hideNotchIsland();
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
  // 浏览器不再一刀切算深度工作（2026-07-10 审计止血）：对开发者它们几乎常驻前台，
  // 会把「深度工作静默」变成永久静默、吃掉断点提醒。真在浏览器里深度工作的场景，
  // 交给用户的「深度工作时只显示 Mira」开关语义本身，不靠 app 名单猜。
  return [
    "Cursor",
    "Visual Studio Code",
    "Code",
    "Terminal",
    "iTerm2",
    "Warp",
    "Figma"
  ].some((name) => appName.toLowerCase().includes(name.toLowerCase()));
}

// "Present at the screen" idle ceiling. EyeFlow is an EYE-care app: passive screen use
// (watching a video, reading a long page) is eye load with zero keyboard/mouse input, so
// a 30s no-input window mislabeled it as a break and reset the round. 5 min matches the
// renderer's NATURAL_AWAY_IDLE_SECONDS ("real away = rest"), so short idle now keeps the
// round running / keeps reminding, and only a genuine ≥5min absence counts as rest. When
// uncertain (idle but maybe still watching), we err toward protecting the eyes.
const PRESENT_IDLE_SECONDS = 5 * 60;

function startActivityMonitor() {
  let lastActivityTickAt = Date.now();
  setInterval(async () => {
    // A missed-tick gap means this process was suspended (sleep) or the clock
    // jumped forward — continuous-active time cannot have continued through it.
    // Drop the anchor so activeSeconds restarts from the wake instant; without
    // this, wake-by-keypress (idle ≈ 0 at the first tick) keeps a pre-sleep
    // anchor alive and the renderer's auto-tracking seed imports the whole
    // sleep span as focus — 今日专注 shows hours right after opening the lid.
    // The since-midnight clamp (24d1734) can't catch same-day sleep import.
    const tickNow = Date.now();
    if (tickNow - lastActivityTickAt > 15000) {
      activeWorkStartedAt = null;
    }
    lastActivityTickAt = tickNow;
    const idleSeconds = powerMonitor.getSystemIdleTime();
    // Self-heal the lock latch from the OS truth each tick (codex review):
    // if lock-screen/unlock-screen was ever missed, the event-only latch would
    // stick — permanently dead activity on a missed unlock, or a lock counted
    // as watching on a missed lock. getSystemIdleState reports "locked"
    // directly; "unknown" leaves the latch as-is.
    const systemIdleState = powerMonitor.getSystemIdleState(1);
    if (systemIdleState === "locked") {
      screenLocked = true;
    } else if (screenLocked && (systemIdleState === "active" || systemIdleState === "idle")) {
      screenLocked = false;
    }
    const accessibilityTrusted = hasAccessibilityPermission();
    const desktopPrefs = desktopPreferenceDefaults();
    const enhancedDesktopSensing = Boolean(desktopPrefs.enhancedDesktopSensing);
    const canReadActiveApp = enhancedDesktopSensing && accessibilityTrusted;
    const activeApp = canReadActiveApp ? await getActiveAppName() : "本地计时";
    // A locked screen is definitively not being looked at — idle alone can't
    // tell (a <5min lock keeps idleSeconds under the present-idle threshold,
    // so the anchor would survive and re-import the lock span on unlock).
    const isWorking = !screenLocked && idleSeconds < PRESENT_IDLE_SECONDS;
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
    screenLocked = true;
    activeWorkStartedAt = null;
    broadcastSystemLifecycle("lock-screen");
  });
  powerMonitor.on("unlock-screen", () => {
    screenLocked = false;
    // Unlocking ends the lifecycle hide. Clear the latch unconditionally — while
    // it is set, applyInterventionBehavior treats Mira as "transiently hidden" and
    // withholds the fallback notification, so a stuck latch (lock/unlock with no
    // resume) would silently swallow L2+ reminders for preference-hidden users.
    // Restore Mira through the preference-aware path so a user-hidden companion is
    // NOT resurrected.
    companionHiddenByLifecycle = false;
    ensureCompanionReachable();
  });
  powerMonitor.on("suspend", () => {
    activeWorkStartedAt = null;
    broadcastSystemLifecycle("suspend");
  });
  powerMonitor.on("shutdown", () => {
    broadcastSystemLifecycle("shutdown");
  });
  powerMonitor.on("resume", () => {
    broadcastSystemLifecycle("resume");
    setTimeout(() => {
      // Clear the latch unconditionally (so a gone/destroyed window can't leave it
      // stuck true and swallow later fallback reminders), then restore Mira through
      // the preference-aware path so a user-hidden companion is NOT resurrected.
      companionHiddenByLifecycle = false;
      ensureCompanionReachable();
    }, 1000);
  });
}

// --- Top-of-screen ambient reminder island (notch-adaptive) ---
// A transparent, click-through, screen-saver-level window pinned to the top-center of
// the active display. Content slides down just under the top edge (we never draw on the
// physical notch); on non-notch Macs it simply reads as a top-center pill. It mirrors the
// break-lock window's level so it sits over the menu bar and survives full-screen apps.
// This is Mira's on-screen stand-in for her bubble when the desktop companion is put away.
function notchIslandBounds() {
  const cursor = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursor) || screen.getPrimaryDisplay();
  const area = display.bounds; // full bounds (incl. menu bar), not workArea
  const width = 560;
  const height = 180;
  return {
    width,
    height,
    x: Math.round(area.x + (area.width - width) / 2),
    y: Math.round(area.y) // top edge; the pill inside slides down from behind it
  };
}

function createNotchWindow() {
  notchWindow = new BrowserWindow({
    ...notchIslandBounds(),
    // NSPanel (non-activating): an ambient overlay must not flip the app's
    // activation policy back to "regular" — otherwise showing it resurrects the
    // Dock icon in menu-bar-only mode. A panel floats without owning the app.
    type: "panel",
    frame: false,
    resizable: false,
    movable: false,
    transparent: true,
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    show: false,
    title: "EyeFlow",
    webPreferences: {
      preload: path.join(appRoot, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  attachWebDiagnostics(notchWindow, "island");
  notchWindow.setAlwaysOnTop(true, "screen-saver");
  notchWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  notchWindow.setIgnoreMouseEvents(true); // click-through; ambient, not interactive
  notchWindow.on("closed", () => { notchWindow = null; });
  notchWindow.loadFile(path.join(appRoot, "island.html"));
}

function hideNotchIsland() {
  cancelIslandMicroRest(); // hiding the island also aborts any look-away it was running
  if (notchHideTimer) {
    clearTimeout(notchHideTimer);
    notchHideTimer = null;
  }
  if (notchWindow && !notchWindow.isDestroyed()) notchWindow.hide();
}

function showNotchIsland(input, legacyOptions = {}) {
  // Notch-adaptive top island is macOS-only; never let it throw into the caller
  // (it runs inside reminder delivery). Also don't cover the full-screen rest.
  if (process.platform !== "darwin") return { ok: false, reason: "unsupported" };
  // Accept a plain string (legacy text pill) or a structured payload:
  //   { mode: "rest", message, breakSeconds } — away look-away micro-rest countdown
  //   { mode: "restResult", ok }              — close the loop (✓ / soft line)
  const payload = typeof input === "string"
    ? { mode: "text", message: input, ...legacyOptions }
    : { ...input };
  const mode = payload.mode || "text";
  try {
    if (breakLockWindow && !breakLockWindow.isDestroyed() && breakLockWindow.isVisible()) {
      return { ok: false, reason: "break-lock" };
    }
    if (!notchWindow || notchWindow.isDestroyed()) createNotchWindow();
    if (!notchWindow || notchWindow.isDestroyed()) return { ok: false, reason: "missing" };
    notchWindow.setBounds(notchIslandBounds());
    notchWindow.setAlwaysOnTop(true, "screen-saver");
    notchWindow.showInactive();
    notchWindow.moveTop();
    syncDock(); // showing this window can resurrect the Dock icon — re-assert it away
    const breakSeconds = Math.max(5, Math.min(Number(payload.breakSeconds) || 20, 120));
    // Per-mode window lifetime: the rest pill must outlive its countdown (the restResult
    // signal overrides the hide when it lands); the result surface is brief.
    const durationMs = mode === "rest"
      ? breakSeconds * 1000 + 3000
      : mode === "restResult"
        ? 1600
        : Math.max(1600, Math.min(Number(payload.durationMs) || 6000, 12000));
    const text = String(payload.message || "").slice(0, 80);
    const data = { mode, message: text, breakSeconds, ok: Boolean(payload.ok), durationMs };
    const present = () => {
      if (!notchWindow || notchWindow.isDestroyed()) return;
      notchWindow.webContents.send("island:show", data);
      // Start the auto-hide only once the message is actually delivered, so a slow
      // first load can't hide the pill before it ever appears.
      if (notchHideTimer) clearTimeout(notchHideTimer);
      notchHideTimer = setTimeout(() => {
        notchHideTimer = null;
        if (notchWindow && !notchWindow.isDestroyed()) notchWindow.hide();
      }, durationMs + 600);
    };
    if (notchWindow.webContents.isLoading()) {
      notchWindow.webContents.once("did-finish-load", present);
    } else {
      present();
    }
    return { ok: true };
  } catch (error) {
    console.warn("[EyeFlow] island show failed", error && error.message);
    return { ok: false, reason: "error" };
  }
}

ipcMain.handle("island:show", (_event, message) => showNotchIsland(message));

// Exactly one EyeFlow. Several bundles share the id com.eyeflow.app (the installed
// copy, the dist build output, a mounted release DMG) and the app is also a login
// item — without this lock a second launch from a different path runs a duplicate
// with its own tray + Dock presence that quits independently of the first. The
// second instance hands off to the running one and exits.
const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (process.platform === "darwin") {
  app.on("will-finish-launching", () => {
    if (desktopPreferenceDefaults().hideDockOnClose) {
      hideDockIcon();
      pruneEyeFlowDockRecentEntry();
      scheduleEyeFlowDockRecentPrune();
    }
  });
}

app.on("second-instance", () => {
  // A duplicate launch was redirected here — surface the running instance instead.
  // Defer through whenReady: the event can arrive before this (winning) instance
  // has finished booting, and creating windows before ready is unsafe.
  app.whenReady().then(() => {
    ensureCompanionReachable();
    showDashboard();
  });
});

if (!gotSingleInstanceLock) {
  app.quit();
} else {
app.whenReady().then(() => {
  updateApplicationMenu();

  const launch = launchBehavior();
  applyLaunchDockBehavior(launch);
  suppressNextActivate = launch.suppressInitialActivate;
  createDashboardWindow({ showOnReady: launch.showDashboard, revealOnboarding: launch.revealOnboarding });
  if (launch.suppressInitialActivate) {
    setTimeout(() => {
      suppressNextActivate = false;
    }, 1200);
  }
  if (desktopPreferenceDefaults().showCompanionOnLaunch || debugCapture) {
    revealCompanionWindow();
  }
  createTray();
  startActivityMonitor();
  startSystemLifecycleMonitor();
  startCompanionVisibilityMonitor();
  // Dev-only: cycle the reminder island through its real states — the L2 look-away
  // capsule closing as completed, then the L3 look-away capsule closing as skipped — so
  // the copy + loop can be eyeballed without waiting for a real L2+ reminder. Visual demo
  // only: it drives showNotchIsland directly and never touches the pending-reminder ledger.
  if (process.env.EYEFLOW_ISLAND_SPIKE === "1") {
    const demoSteps = [
      [1500, () => showNotchIsland({ mode: "rest", message: islandRestMessage(2), breakSeconds: 6 })],
      [8000, () => showNotchIsland({ mode: "restResult", ok: true })],
      [11000, () => showNotchIsland({ mode: "rest", message: islandRestMessage(3), breakSeconds: 6 })],
      [17500, () => showNotchIsland({ mode: "restResult", ok: false })]
    ];
    for (const [delay, fn] of demoSteps) setTimeout(fn, delay);
  }
  screen.on("display-added", ensureCompanionReachable);
  screen.on("display-removed", ensureCompanionReachable);
  screen.on("display-metrics-changed", ensureCompanionReachable);
});
}

function handleActivate() {
  if (suppressNextActivate && dashboardWindow && !dashboardWindow.isVisible()) {
    suppressNextActivate = false;
    return;
  }
  suppressNextActivate = false;
  showDashboard();
}

app.on("activate", handleActivate);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

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
    return { expanded: companionExpanded };
  }
  if (shouldExpand) {
    showCompanionPanel();
  } else {
    hideCompanionPanel();
  }
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

ipcMain.handle("desktopSettings:setHideDockOnClose", (_event, enabled) => {
  const preferences = writeDesktopPreference("hideDockOnClose", enabled);
  if (preferences.hideDockOnClose) {
    pruneEyeFlowDockRecentEntry();
    scheduleEyeFlowDockRecentPrune();
  }
  return {
    ...getDesktopSettings(),
    ...preferences
  };
});
