#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assertIncludes(source, expected, label) {
  if (!source.includes(expected)) {
    throw new Error(`${label}: missing "${expected}"`);
  }
}

function assertNotIncludes(source, unexpected, label) {
  if (source.includes(unexpected)) {
    throw new Error(`${label}: unexpected "${unexpected}"`);
  }
}

function assertMatches(source, pattern, label) {
  if (!pattern.test(source)) {
    throw new Error(`${label}: pattern not found: ${pattern}`);
  }
}

function assertNotMatches(source, pattern, label) {
  if (pattern.test(source)) {
    throw new Error(`${label}: unexpected pattern: ${pattern}`);
  }
}

function parseInlineScripts(relativePath) {
  const html = read(relativePath);
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
  scripts.forEach((match, index) => {
    new vm.Script(match[1], { filename: `${relativePath}#script${index + 1}` });
  });
  return scripts.length;
}

function parseScriptFile(relativePath) {
  new vm.Script(read(relativePath), { filename: relativePath });
}

function main() {
  const indexHtml = read("index.html");
  const coreJs = read("eyeflow-core.js");
  const recoveryDataJs = read("eyeflow-recovery-data.js");
  const uiUtilsJs = read("eyeflow-ui-utils.js");
  const companionHtml = read("companion.html");
  const mainJs = read("main.js");
  const packageJson = read("package.json");
  const preloadJs = read("preload.js");
  parseScriptFile("eyeflow-core.js");
  parseScriptFile("eyeflow-recovery-data.js");
  parseScriptFile("eyeflow-ui-utils.js");

  const scriptCounts = [
    ["index.html", parseInlineScripts("index.html")],
    ["companion.html", parseInlineScripts("companion.html")]
  ];

  assertNotIncludes(indexHtml, '<span class="state-label">认识 Mira</span>', "onboarding removes the redundant intro label");
  assertIncludes(indexHtml, '<script src="eyeflow-core.js"></script>', "core script include");
  assertIncludes(indexHtml, '<script src="eyeflow-recovery-data.js"></script>', "recovery data script include");
  assertIncludes(indexHtml, '<script src="eyeflow-ui-utils.js"></script>', "UI utility script include");
  assertIncludes(coreJs, "window.EyeFlowCore", "core export");
  assertIncludes(coreJs, "computeEyeLoadScore", "core eye-load scorer");
  assertIncludes(recoveryDataJs, "window.EyeFlowRecoveryData", "recovery data export");
  assertIncludes(recoveryDataJs, "recoveryTaskLibrary", "recovery task library");
  assertIncludes(uiUtilsJs, "window.EyeFlowUiUtils", "UI utility export");
  assertIncludes(uiUtilsJs, "formatBreakTime", "UI utility exposes break time formatter");
  assertIncludes(indexHtml, "专注工作时，也有人照顾你的眼睛。", "onboarding sells the companion feeling first");
  assertIncludes(coreJs, "50 分钟专注", "comfort rhythm starts at 50 minutes");
  assertIncludes(indexHtml, '<button class="primary" id="startOnboardingBtn" type="button">好，开始吧</button>', "onboarding has one primary action");
  assertMatches(indexHtml, /body:has\(#onboardingOverlay\.show\) #primaryActionBtn\s*\{[\s\S]*opacity:\s*0;[\s\S]*pointer-events:\s*none;/, "onboarding hides the background start action while the first-run sheet is open");
  assertIncludes(indexHtml, "不打断，不监视，安静待在桌面一角。", "onboarding folds the trust boundary into one clean line");
  assertIncludes(indexHtml, "只是帮你记得休息。", "onboarding keeps the value simple");
  assertNotIncludes(indexHtml, "Mira 会安静地待在桌面一角。", "onboarding avoids repeating the quiet presence promise");
  assertNotIncludes(indexHtml, "不打断，不监视。", "onboarding avoids a separate trust-boundary sentence");
  assertIncludes(indexHtml, "FIRST_AHA_SECONDS = 5 * 60", "onboarding creates a first-five-minute aha moment");
  assertIncludes(indexHtml, "mira_aha_moment", "onboarding records Mira's first aha moment locally");
  assertIncludes(indexHtml, "我在旁边了。你继续专注，休息点到了我再轻轻提醒。", "onboarding first aha makes Mira feel present");
  assertNotIncludes(indexHtml, "眼睛现在怎么样", "onboarding no longer asks for a forced eye-state choice");
  assertNotIncludes(indexHtml, "选一个感觉，Mira 先安排第一轮。", "onboarding removes the choice prompt");
  assertNotIncludes(indexHtml, '<button class="onboarding-preset', "onboarding removes first-run state presets");
  assertNotIncludes(indexHtml, "想更准再细调", "onboarding removes first-run fine tuning");
  assertNotIncludes(indexHtml, "开始第一轮", "onboarding removes first-round planning language");
  assertNotIncludes(indexHtml, "体验恢复", "onboarding removes secondary first-run action");
  assertNotIncludes(indexHtml, "权限稍后", "onboarding removes permission wording from first-run");
  assertNotIncludes(indexHtml, "id=\"onboardingPermissionBtn\"", "onboarding has no first-screen permission button");
  assertNotIncludes(indexHtml, ">打开权限<", "onboarding and settings avoid scary permission button copy");
  assertIncludes(indexHtml, "增强桌面感知", "settings contains optional enhanced desktop sensing");
  assertIncludes(indexHtml, "状态跟随 macOS“辅助功能”里的 EyeFlow 开关。", "settings mirrors the macOS Accessibility switch as the enhanced sensing source of truth");
  assertIncludes(indexHtml, "macOS 开关未开启；当前使用普通模式。", "settings defaults to ordinary mode when the macOS Accessibility switch is off");
  assertIncludes(indexHtml, "普通模式：只做本地计时和休息提醒。", "settings can stay in ordinary mode even when macOS permission is available");
  assertIncludes(indexHtml, "开启后识别当前 App 和空闲时间，用来判断是否在专注工作；需要时会打开 macOS 系统设置。", "settings explains the app-level enhanced sensing switch");
  assertIncludes(indexHtml, "系统设置里的 EyeFlow 开关还是关闭；打开后才会增强。", "settings does not show enhanced sensing as enabled before the macOS switch is on");
  assertIncludes(indexHtml, "系统设置里的 EyeFlow 开关变蓝后才会增强。", "settings row explains the system switch requirement before enhanced sensing is active");
  assertIncludes(indexHtml, "去系统设置开启", "settings directs requested enhanced sensing to the macOS switch without claiming it is active");
  assertIncludes(indexHtml, "识别当前 App 和空闲时间，用来判断是否在专注工作；不读取屏幕内容或具体操作。", "settings explains enabled enhanced sensing without over-claiming screen access");
  assertIncludes(indexHtml, "去系统设置管理", "settings sends enabled enhanced sensing management to macOS settings");
  assertNotIncludes(indexHtml, "刷新中", "settings does not expose a stuck enhanced sensing refresh state");
  assertNotIncludes(indexHtml, "正在刷新授权", "settings does not expose a stuck enhanced sensing authorization refresh state");
  assertNotIncludes(indexHtml, "刷新授权", "settings does not ask the user to manually refresh authorization");
  assertNotIncludes(indexHtml, "重启刷新授权", "settings does not ask the user to manually restart authorization");
  assertNotIncludes(indexHtml, "等待系统确认", "settings no longer blocks enhanced sensing on a pending main state");
  assertNotIncludes(indexHtml, "确认增强", "settings no longer requires a second confirmation button");
  assertNotIncludes(indexHtml, "待确认", "settings no longer surfaces pending authorization as the primary state");
  assertNotIncludes(indexHtml, "已开启增强桌面感知；正在等待 macOS“辅助功能”确认。", "settings avoids the old pending authorization copy");
  assertNotIncludes(indexHtml, "如果已经勾选 EyeFlow 仍显示待确认，请退出并重新打开 EyeFlow。", "settings avoids stale restart-only guidance");
  assertNotIncludes(indexHtml, "已保持开启；macOS 权限生效前仍按本地计时提醒。", "settings no longer shows an app-local enabled state before the system switch changes");
  assertNotIncludes(indexHtml, "已按你的选择开启；macOS 开关控制实际增强能力。", "settings does not claim requested enhanced sensing is active");
  assertIncludes(indexHtml, "桌面 Mira", "settings contains optional desktop Mira visibility");
  assertIncludes(indexHtml, "简约模式", "settings contains optional menu-bar mode");
  assertIncludes(indexHtml, "只留菜单栏", "settings can opt into menu-bar-only mode after closing the dashboard");
  assertIncludes(indexHtml, "setEnhancedSensing", "frontend exposes enhanced sensing setting");
  assertIncludes(indexHtml, "setCompanionVisible", "frontend exposes desktop Mira setting");
  assertIncludes(indexHtml, "setHideDockOnClose", "frontend exposes menu-bar mode setting");
  assertIncludes(indexHtml, "首次默认显示；需要时可从这里退出。", "settings explains desktop Mira defaults visible but optional");
  assertIncludes(indexHtml, 'desktopMiraVisible ? "退出 Mira" : "显示 Mira"', "settings control panel can exit desktop Mira without using the floating avatar");
  assertMatches(indexHtml, /function isEnhancedSensingActiveForUi\(\)[\s\S]*return latestDesktopSettings\?\.enhancedDesktopSensing === true;/, "enhanced sensing UI only treats the effective system-enabled state as active");
  assertNotIncludes(indexHtml, "|| latestDesktopSettings?.enhancedDesktopSensingRequested === true", "enhanced sensing UI must not treat the requested state as active");
  assertNotIncludes(indexHtml, "scheduleEnhancedSensingAutoRestart", "enhanced sensing UI has no auto-restart loop");
  assertNotIncludes(indexHtml, "ENHANCED_PERMISSION_AUTO_RESTART_COOLDOWN_MS", "enhanced sensing UI has no refresh cooldown state");
  assertMatches(indexHtml, /const nextEnabled = !isEnhancedSensingActiveForUi\(\);/, "enhanced sensing toggle follows the effective UI state instead of stale saved settings");
  assertMatches(indexHtml, /setSystemStatus\(els\.desktopReadyTag,\s*"enabled",\s*"增强中"\)/, "settings shows enhanced sensing as enabled only after the system switch is on");
  assertMatches(indexHtml, /else if \(enhancedSensingRequested\) \{[\s\S]*setSystemStatus\(els\.desktopReadyTag,\s*"action",\s*"需系统开启"\)/, "settings has a separate non-enabled state for requested enhanced sensing");
  assertMatches(indexHtml, /setReadinessState\([\s\S]*?els\.readyPermissionTitle[\s\S]*?"已开启"[\s\S]*?enhancedSensingRequested[\s\S]*?"需系统开启"[\s\S]*?"普通模式"/, "settings row title separates enabled, system-required, and ordinary states (single render path)");
  assertMatches(indexHtml, /els\.readinessPermissionBtn\.textContent = enhancedSensing[\s\S]*\? "去系统设置管理"[\s\S]*: enhancedSensingRequested[\s\S]*\? "去系统设置开启"[\s\S]*: "开启增强感知"/, "settings button points requested enhanced sensing to system setup instead of management");
  assertIncludes(indexHtml, "settings-action-button primary-action", "settings enhanced sensing action has a distinct primary button style");
  assertIncludes(indexHtml, "settings-action-button secondary-action", "settings companion action has a distinct secondary button style");
  assertIncludes(indexHtml, "#rhythmView .readiness-item .settings-action-button", "settings readiness actions share one stable button sizing class");
  assertIncludes(indexHtml, "--settings-readiness-action-width", "settings readiness actions use one hard width token");
  assertMatches(indexHtml, /id="readyCompanionTitle"[\s\S]*<div class="settings-row-action settings-action-stack ef-preference-row-action">[\s\S]*id="readinessCompanionBtn"/, "settings companion action uses the same action stack as enhanced sensing");
  assertMatches(indexHtml, /if \(latestDesktopSettings\.platform === "darwin" && isEnhancedSensingActiveForUi\(\)\) \{[\s\S]*enhancedPermissionManageStartedAt = Date\.now\(\);[\s\S]*openAccessibilitySettings\(\);[\s\S]*return;/, "settings management opens macOS settings without immediately clearing the user's enhanced sensing preference");
  assertMatches(indexHtml, /function syncEnhancedSensingAfterSystemManage\(\)[\s\S]*enhancedDesktopSensingRequested[\s\S]*setEnhancedSensing\(false\)/, "settings clears the enhanced sensing request after returning from macOS settings with the switch off");
  assertMatches(indexHtml, /function refreshDesktopReadinessOnResume\(\)[\s\S]*await refreshDesktopReadiness\(\{ silent: true \}\);[\s\S]*await syncEnhancedSensingAfterSystemManage\(\);/, "settings rechecks and syncs enhanced sensing when returning from macOS settings");
  assertMatches(indexHtml, /function startDesktopSettingsWatch\(\)[\s\S]*setInterval\(pollDesktopSettingsWatch,\s*DESKTOP_SETTINGS_WATCH_MS\)/, "settings page actively watches macOS permission changes while open");
  assertMatches(indexHtml, /function switchView\(targetId\)[\s\S]*targetId === "rhythmView"[\s\S]*startDesktopSettingsWatch\(\)[\s\S]*stopDesktopSettingsWatch\(\)/, "settings page starts and stops the desktop permission watcher with the visible view");
  assertNotIncludes(indexHtml, "confirmEnhancedDesktopSensing", "frontend has no second-step enhanced sensing confirmation");
  assertNotIncludes(indexHtml, "enhancedPermissionPendingInSession", "frontend does not keep a pending enhanced sensing UI state");
  assertMatches(indexHtml, /function refreshDesktopReadinessOnResume\(\)[\s\S]*refreshDesktopReadiness\(\{ silent: true \}\)/, "settings rechecks desktop readiness when returning from macOS settings");
  assertMatches(indexHtml, /function startEnhancedPermissionPolling\(targetTrusted = true\)[\s\S]*enhancedPermissionPollTarget = targetTrusted;[\s\S]*refreshPermissionStatus\(\);[\s\S]*ENHANCED_PERMISSION_POLL_LIMIT_MS[\s\S]*enhancedPermissionNeedsRestart = true;/, "enhanced sensing auto-polls macOS switch changes and falls back to sync guidance");
  assertIncludes(preloadJs, "setEnhancedSensing", "preload exposes enhanced sensing IPC");
  assertIncludes(preloadJs, "restartApp", "preload exposes restart IPC for stale accessibility authorization");
  assertIncludes(preloadJs, "setCompanionVisible", "preload exposes desktop Mira IPC");
  assertIncludes(mainJs, "ENHANCED_DESKTOP_SENSING_PREFERENCE_VERSION", "main versions enhanced desktop sensing preferences");
  assertIncludes(mainJs, "systemEnhancedDesktopSensing", "main derives enhanced sensing from the macOS Accessibility switch");
  assertIncludes(mainJs, "enhancedDesktopSensing: systemEnhancedDesktopSensing", "main mirrors the macOS Accessibility switch as the active enhanced sensing state");
  assertIncludes(mainJs, "hasAccessibilityTccPermission", "main falls back to the macOS TCC Accessibility record when Electron keeps a stale permission value");
  assertIncludes(mainJs, "ACCESSIBILITY_TCC_CLIENT", "main reads the EyeFlow Accessibility TCC client explicitly");
  assertNotIncludes(mainJs, "execFileSync", "main does not use an Apple Events probe to override macOS Accessibility status");
  assertNotIncludes(mainJs, "desiredEnhancedDesktopSensing", "main does not keep a second app-level source of truth for enhanced sensing");
  assertIncludes(mainJs, "ENHANCED_DESKTOP_SENSING_REQUEST_WINDOW_MS", "main expires stale enhanced sensing requests");
  assertIncludes(mainJs, "reconcileDesktopPreferences", "main cleans stale enhanced sensing requests during settings reads");
  assertIncludes(mainJs, "enhancedDesktopSensingRequested", "main returns the requested enhanced sensing sync state");
  assertIncludes(mainJs, "enhancedDesktopSensingRequestedAt", "main timestamps temporary enhanced sensing requests");
  assertIncludes(mainJs, 'ipcMain.handle("app:restart"', "main exposes restart IPC for stale accessibility authorization");
  assertMatches(mainJs, /ipcMain\.handle\("desktopSettings:setEnhancedSensing"[\s\S]*Boolean\(enabled\) !== hasAccessibilityPermission\(\)[\s\S]*openAccessibilitySettings\(\)/, "main opens the macOS Accessibility switch when the app button cannot change it directly");
  assertMatches(mainJs, /ipcMain\.handle\("desktopSettings:setEnhancedSensing"[\s\S]*writeDesktopPreference\("enhancedDesktopSensing", enabled\)/, "main saves the user's requested enhanced sensing state while macOS refreshes authorization");
  assertNotIncludes(mainJs, 'writeDesktopPreference("enhancedDesktopSensing", hasAccessibilityPermission())', "main must not overwrite the user's enhanced sensing request with a stale macOS permission read");
  assertMatches(mainJs, /next\.enhancedDesktopSensingRequestedAt = Date\.now\(\);[\s\S]*delete next\.enhancedDesktopSensingRequestedAt;/, "main keeps requested enhanced sensing temporary instead of permanent");
  assertIncludes(mainJs, "next.enhancedDesktopSensingPreferenceVersion = ENHANCED_DESKTOP_SENSING_PREFERENCE_VERSION", "main records explicit enhanced sensing choices");
  assertNotIncludes(mainJs, "enhancedDesktopSensingPending", "main has no pending enhanced sensing preference state");
  assertIncludes(mainJs, "COMPANION_VISIBILITY_PREFERENCE_VERSION", "main versions desktop Mira visibility preferences");
  assertIncludes(mainJs, "const COMPANION_VISIBILITY_PREFERENCE_VERSION = 3;", "main migrates older hidden Mira preferences back to the default-on policy");
  assertIncludes(mainJs, "hasCompanionVisibilityPreference", "main can migrate old hidden desktop Mira preferences");
  assertIncludes(mainJs, "showCompanionOnLaunch: hasCompanionVisibilityPreference", "main defaults desktop Mira visible unless explicitly hidden in the current preference version");
  assertIncludes(mainJs, "hideDockOnClose: settings.hideDockOnClose === true", "main defaults Dock-on-close behavior to visible unless user opts into menu-bar mode");
  assertMatches(indexHtml, /settings-desktop-section[\s\S]*简约模式[\s\S]*hideDockOnCloseToggle[\s\S]*<\/section>\s*<div class="settings-preference-rows">/, "settings exposes menu-bar mode in the visible desktop section");
  assertIncludes(mainJs, "next.companionVisibilityPreferenceVersion = COMPANION_VISIBILITY_PREFERENCE_VERSION", "main marks explicit desktop Mira visibility choices");
  assertIncludes(preloadJs, "setHideDockOnClose", "preload exposes menu-bar mode IPC");
  assertMatches(mainJs, /ipcMain\.handle\("desktopSettings:setHideDockOnClose"[\s\S]*writeDesktopPreference\("hideDockOnClose", enabled\)/, "main persists the user-selected menu-bar mode");
  assertMatches(mainJs, /ipcMain\.handle\("desktopSettings:setHideDockOnClose"[\s\S]*if \(preferences\.hideDockOnClose\) \{[\s\S]*pruneEyeFlowDockRecentEntry\(\);[\s\S]*\}/, "turning on menu-bar mode immediately removes EyeFlow from Dock recents");
  assertNotMatches(mainJs, /function setDockVisible\(visible\)[\s\S]*app\.dock\.isVisible\(\) === next[\s\S]*return;[\s\S]*app\.dock\.hide\(\);/, "setDockVisible must re-assert hide even when macOS reports the Dock is already hidden");
  assertMatches(mainJs, /function setDockVisible\(visible\)[\s\S]*app\.setActivationPolicy\(next \? "regular" : "accessory"\)/, "setDockVisible updates the macOS activation policy, not only the Dock icon");
  assertMatches(mainJs, /function setDockVisible\(visible\)[\s\S]*if \(next && app\.dock\.isVisible\(\) === true\) return;[\s\S]*app\.dock\.hide\(\);/, "setDockVisible only skips redundant show calls, never redundant hide calls");
  assertMatches(mainJs, /function hideDockIcon\(\)[\s\S]*setDockVisible\(false\);[\s\S]*\}/, "main can hide the Dock icon for quiet menu-bar launches");
  assertMatches(mainJs, /function pruneEyeFlowDockRecentEntry\(\)[\s\S]*PlistBuddy[\s\S]*Delete :recent-apps:\$\{index\}[\s\S]*killall[\s\S]*Dock/, "main can remove only EyeFlow from macOS Dock recent-apps");
  assertMatches(mainJs, /function scheduleEyeFlowDockRecentPrune\(\)[\s\S]*setTimeout\(\(\) => \{[\s\S]*pruneEyeFlowDockRecentEntry\(\);[\s\S]*\}, 1200\)/, "main schedules a delayed Dock recent prune after macOS can asynchronously re-add EyeFlow");
  assertMatches(mainJs, /app\.on\("will-finish-launching", \(\) => \{[\s\S]*desktopPreferenceDefaults\(\)\.hideDockOnClose[\s\S]*hideDockIcon\(\);[\s\S]*pruneEyeFlowDockRecentEntry\(\);[\s\S]*\}\);/, "main hides the Dock and prunes EyeFlow recents during early macOS launch when menu-bar mode is already enabled");
  assertMatches(mainJs, /function wasOpenedAtLogin\(\)[\s\S]*app\.getLoginItemSettings\(\)\.wasOpenedAtLogin/, "main can distinguish macOS login-item launches from user launches");
  assertMatches(mainJs, /function wantsDashboardOnLaunch\(\)[\s\S]*return Boolean\(debugCapture \|\| debugOnboarding \|\| process\.env\.EYEFLOW_SHOW_DASHBOARD_ON_LAUNCH === "1"\);/, "main keeps explicit dashboard launch separate from ordinary app opens");
  assertMatches(mainJs, /function launchBehavior\(\)[\s\S]*openedAtLogin = wasOpenedAtLogin\(\);[\s\S]*showDashboard = wantsDashboardOnLaunch\(\) \|\| !openedAtLogin;[\s\S]*showDock: showDashboard,[\s\S]*showDashboard,[\s\S]*suppressInitialActivate: !showDashboard,[\s\S]*revealOnboarding: true/, "main opens the dashboard for user launches while keeping login-item launches quiet");
  assertMatches(mainJs, /function applyLaunchDockBehavior\(behavior\)[\s\S]*if \(behavior\.showDock\) \{[\s\S]*showDockIcon\(\);[\s\S]*\} else \{[\s\S]*hideDockIcon\(\);[\s\S]*\}/, "main applies Dock visibility from the launch behavior object");
  assertMatches(mainJs, /const gotSingleInstanceLock = app\.requestSingleInstanceLock\(\);[\s\S]*app\.on\("second-instance", \(\) => \{[\s\S]*showDashboard\(\);[\s\S]*\}\);[\s\S]*if \(!gotSingleInstanceLock\) \{[\s\S]*app\.quit\(\);[\s\S]*\} else \{[\s\S]*app\.whenReady\(\)/, "main holds a single-instance lock so duplicate launches hand off instead of running a second tray/Dock copy");
  assertMatches(mainJs, /const launch = launchBehavior\(\);[\s\S]*applyLaunchDockBehavior\(launch\);[\s\S]*suppressNextActivate = launch\.suppressInitialActivate;[\s\S]*createDashboardWindow\(\{ showOnReady: launch\.showDashboard, revealOnboarding: launch\.revealOnboarding \}\);/, "main consumes one launch behavior object instead of scattered launch flags");
  assertMatches(mainJs, /dashboardWindow\.once\("ready-to-show", \(\) => \{[\s\S]*if \(showOnReady\) dashboardWindow\.show\(\);[\s\S]*\}\);/, "dashboard ready-to-show no longer forces the main page open on every launch");
  assertIncludes(mainJs, `dashboardWindow.on("close", (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      dashboardWindow.hide();
      syncDock();
    }
  });`, "closing the dashboard syncs the Dock icon (hidden in menu-bar mode)");
  assertMatches(mainJs, /function syncDock\(\)[\s\S]*const shouldHide = desktopPreferenceDefaults\(\)\.hideDockOnClose;[\s\S]*setDockVisible\(!shouldHide\)/, "syncDock keeps the Dock hidden whenever menu-bar mode is enabled, even while the dashboard is open");
  assertMatches(mainJs, /function syncDock\(\)[\s\S]*if \(shouldHide\) \{[\s\S]*pruneEyeFlowDockRecentEntry\(\);[\s\S]*\}/, "syncDock prunes EyeFlow from Dock recents after visible windows can re-add it");
  assertMatches(mainJs, /function syncDock\(\)[\s\S]*if \(shouldHide\) \{[\s\S]*scheduleEyeFlowDockRecentPrune\(\);[\s\S]*\}/, "syncDock schedules a second recent prune for Dock's async recent-apps write");
  assertNotMatches(mainJs, /function showDashboard\(options = \{\}\) \{[\s\S]*?showDockIcon\(\);[\s\S]*?if \(!dashboardWindow\)/, "showDashboard must not resurrect the Dock in menu-bar mode");
  assertMatches(mainJs, /function showDashboard\(options = \{\}\) \{[\s\S]*syncDock\(\);[\s\S]*if \(!dashboardWindow \|\| dashboardWindow\.isDestroyed\(\)\)/, "showDashboard re-syncs the Dock instead of forcing it visible");
  assertMatches(mainJs, /notchWindow\.showInactive\(\);[\s\S]*notchWindow\.moveTop\(\);[\s\S]*syncDock\(\);/, "the island re-asserts the Dock state after showing (it can resurrect the Dock icon)");
  assertMatches(mainJs, /function maybeRevealDashboardForOnboarding\(\{ showOnReady, revealOnboarding \} = \{\}\)[\s\S]*onboardingOverlayIsVisibleScript\(\)[\s\S]*showDashboard\(\{ view: "todayView", focus: "onboarding" \}\)/, "hidden launch still reveals the dashboard for unfinished onboarding");
  assertMatches(mainJs, /function handleActivate\(\)[\s\S]*suppressNextActivate[\s\S]*return;[\s\S]*showDashboard\(\);[\s\S]*app\.on\("activate", handleActivate\);/, "main suppresses only the startup activate event and keeps explicit app activation wired");
  assertMatches(mainJs, /app\.on\("window-all-closed", \(\) => \{[\s\S]*if \(process\.platform !== "darwin"\) app\.quit\(\);[\s\S]*\}\);/, "macOS quiet menu-bar mode keeps the app alive without a visible dashboard");
  assertMatches(mainJs, /if \(desktopPreferenceDefaults\(\)\.showCompanionOnLaunch \|\| debugCapture\) \{[\s\S]*revealCompanionWindow\(\);[\s\S]*\}/, "main reveals the companion window by default unless the user hides Mira");
  assertMatches(mainJs, /function getDesktopSettings\(\)[\s\S]*if \(preferences\.showCompanionOnLaunch\) \{[\s\S]*ensureCompanionVisibleForPreference\(\);[\s\S]*companionVisible: isCompanionWindowVisible\(\)/, "main self-heals enabled desktop Mira when settings are read");
  assertMatches(mainJs, /function defaultCompanionBounds\(\)[\s\S]*screen\.getPrimaryDisplay\(\)\?\.workArea[\s\S]*x: area\.x \+ area\.width - companionSizes\.compact\.width - 28[\s\S]*y: area\.y \+ area\.height - companionSizes\.compact\.height - 28/, "main defaults desktop Mira to the primary workArea bottom-right above the Dock");
  assertMatches(mainJs, /const bounds = settings\.companionBounds \|\| defaultCompanionBounds\(\);[\s\S]*const initialBounds = visibleCompanionBounds/, "first desktop Mira appearance uses the bottom-right default when no saved position exists");
  assertMatches(mainJs, /function repairCompanionBounds\(\{ reset = false \} = \{\}\)[\s\S]*visibleCompanionBounds\(reset \? defaultCompanionBounds\(\) : currentBounds\)[\s\S]*if \(sameWindowBounds\(currentBounds, nextBounds\)\) return false;[\s\S]*setBounds\(nextBounds, false\);/, "find Mira resets via the same bottom-right default without repeatedly setting identical bounds");
  assertMatches(mainJs, /label: "显示\/退出 Mira", accelerator: "CommandOrControl\+M", click: toggleCompanionVisibility/, "main menu provides keyboard-only Mira show and exit");
  assertMatches(mainJs, /function trayMiraVisibilityLabel\(\)[\s\S]*\? "退出 Mira"[\s\S]*: "显示 Mira";/, "tray menu labels the Mira action with the current visible state");
  assertMatches(mainJs, /function startTrayRest\(\)[\s\S]*showDashboard\(\{ restGuide: true \}\);[\s\S]*\}/, "tray rest action opens the rest guide");
  assertMatches(mainJs, /function trayStatusTitle\(\)[\s\S]*latestState\.mood === "rest"[\s\S]*return "休息";[\s\S]*load >= 75[\s\S]*return String\(load\);[\s\S]*return "";/, "tray stays icon-only by default and only shows compact status text when the state deserves attention");
  assertMatches(mainJs, /function trayStatusLine\(\)[\s\S]*return "到恢复断点了";[\s\S]*return "本轮计时中";[\s\S]*return `状态偏高 · \$\{load\}`;[\s\S]*return "Mira 安静待命";/, "tray menu state line explains the current EyeFlow path without becoming a dashboard");
  assertMatches(mainJs, /function updateTrayPresentation\(\)[\s\S]*tray\.setTitle\(statusTitle\);[\s\S]*tray\.setToolTip\(statusTitle \? `EyeFlow · \$\{statusTitle\}` : "EyeFlow"\);/, "tray presentation mirrors the compact status into the native menu bar title");
  assertMatches(mainJs, /function buildTrayMenu\(\)[\s\S]*label: trayStatusLine\(\)[\s\S]*label: "打开 EyeFlow"[\s\S]*label: "休息一下"[\s\S]*label: trayMiraVisibilityLabel\(\)/, "tray menu keeps the productized three-action shape with a readable state line");
  assertMatches(mainJs, /function handleTrayClick\(\)[\s\S]*process\.platform === "darwin"[\s\S]*showTrayMenu\(\);[\s\S]*return;[\s\S]*showDashboard\(\);/, "macOS tray click opens the native menu instead of flashing the dashboard");
  assertMatches(mainJs, /function showTrayMenu\(\)[\s\S]*const menu = updateTrayMenu\(\);[\s\S]*tray\.popUpContextMenu\(menu\);/, "tray menu is refreshed before it is shown");
  assertNotIncludes(mainJs, 'tray.on("click", showDashboard)', "tray click must not directly open the dashboard and steal the menu click");
  assertNotIncludes(mainJs, 'label: `用眼负荷 ${latestState.load || 0}`', "tray menu avoids dashboard-style eye-load data");
  assertNotIncludes(mainJs, '${latestActivity.activeApp || "未知 App"} · ${latestActivity.isWorking ? "活跃" : "空闲"}', "tray menu avoids app activity debugging data");
  assertMatches(mainJs, /function toggleCompanionVisibility\(\)[\s\S]*desktopPreferenceDefaults\(\)\.showCompanionOnLaunch && isCompanionWindowVisible\(\)[\s\S]*hideCompanionWindow\(\);[\s\S]*showCompanion\(\);/, "main menu shortcut shows Mira when preference is enabled but the window is missing");
  assertMatches(mainJs, /function hideCompanionWindow\(\{ persistPreference = true \} = \{\}\)[\s\S]*if \(persistPreference\) writeDesktopPreference\("showCompanionOnLaunch", false\);/, "temporary companion hides do not persist the hidden preference");
  assertMatches(mainJs, /ipcMain\.handle\("companion:hide", \(\) => \{[\s\S]*hideCompanionWindow\(\{ persistPreference: false \}\);[\s\S]*\}\);/, "renderer lifecycle hide keeps desktop Mira default visible");
  assertMatches(mainJs, /function showCompanionBubble\(message, options = \{\}\)[\s\S]*!desktopPreferenceDefaults\(\)\.showCompanionOnLaunch[\s\S]*return \{ ok: false, reason: "hidden" \};/, "hidden desktop Mira preference blocks toast bubbles from resurrecting Mira");
  // Reminder channels are coordinated on ONE shared cooldown: the on-screen layer
  // (Mira bubble when visible + island when enabled, coexisting) plus the system
  // notification only as the away/lock-screen backup — never stacked while Mira is
  // on screen (kills the L3 triple-buzz).
  // One line, not a matrix: how strong (level) and where Mira can deliver (visibility) are
  // separate. Mira on-screen → her bubble carries L2+. Mira exited → the island IS the
  // reminder: a self-closing look-away micro-rest. No ambient bar, no per-level visual
  // form — level only changes Mira's words and whether the away system banner joins.
  assertMatches(mainJs, /function applyInterventionBehavior\(state\)[\s\S]*const showBubble = companionVisible && level >= 2;[\s\S]*const showRest = islandEnabled && companionExited && level >= 2;[\s\S]*const breakDue = Boolean\(state\.breakDue\);[\s\S]*const breakBypass = breakDue && !breakRestSurfaced;[\s\S]*if \(escalated \|\| breakBypass \|\| now - lastReminderAt > reminderCooldown\) \{[\s\S]*if \(breakDue\) breakRestSurfaced = true;[\s\S]*if \(showRest\) \{[\s\S]*if \(breakDue\) \{[\s\S]*startIslandMicroRest\(islandRestMessage\(level\), state\.reminderId \|\| null\);[\s\S]*showNotchIsland\(\{ mode: "text", message: islandNoticeMessage\(level\) \}\);[\s\S]*if \(showNotify\) notify\(reminderMessage\);/, "real break point gets the countdown capsule + bypasses cooldown; pre-target 提醒边界 is a no-countdown heads-up");
  assertIncludes(indexHtml, "const breakDue = Boolean((isRunning && Number(elapsedSeconds) >= Number(els.focusTarget.value) * 60) || naturalBreak);", "renderer publishes breakDue = timer hit target (or natural break) so main can distinguish the real break point");
  assertMatches(mainJs, /function islandNoticeMessage\(level\)[\s\S]*快到断点了/, "the pre-target heads-up has its own no-countdown copy");
  assertMatches(mainJs, /function islandRestMessage\(level\)[\s\S]*level >= 3 \? "眼睛该松一下了，看远处" : "陪你看会儿远处"/, "island rest copy is Mira's voice; L3 is more certain, not louder");
  assertNotIncludes(mainJs, 'mode: "bar"', "the ambient level bar is gone — the island is one thing: the away micro-rest");
  assertMatches(mainJs, /function startIslandMicroRest\(message, reminderId\)[\s\S]*showNotchIsland\(\{ mode: "rest", message, breakSeconds: ISLAND_LOOKAWAY_SECONDS \}\)[\s\S]*powerMonitor\.getSystemIdleTime\(\)[\s\S]*"reminder:resolve"[\s\S]*status: restedAway \? "completed" : "ignored"[\s\S]*reminderId: reminderId \|\| null[\s\S]*showNotchIsland\(\{ mode: "restResult", ok: restedAway \}\)/, "the away micro-rest senses the look-away and resolves the exact reminder (id-guarded, no dead-end)");
  assertMatches(mainJs, /function hideNotchIsland\(\) \{\s*cancelIslandMicroRest\(\);/, "hiding the island aborts any in-flight look-away timer (no stale resolve / re-show)");
  assertMatches(indexHtml, /onReminderResolve\(\(payload\) => \{[\s\S]*if \(!payload\.reminderId \|\| payload\.reminderId !== currentId\) return;/, "renderer only closes the exact reminder the look-away was for");
  assertMatches(mainJs, /powerMonitor\.on\("unlock-screen", \(\) => \{[\s\S]*companionHiddenByLifecycle = false;[\s\S]*ensureCompanionReachable\(\);[\s\S]*\}\);/, "unlocking clears the lifecycle-hidden latch so fallback reminders are not swallowed after lock/unlock");

  // Top-of-screen reminder island: Mira's stand-in for the bubble when she is put away.
  const islandHtml = read("island.html");
  assertMatches(mainJs, /function showNotchIsland\(input, legacyOptions = \{\}\) \{[\s\S]*if \(process\.platform !== "darwin"\) return[\s\S]*breakLockWindow[\s\S]*isVisible\(\)[\s\S]*return \{ ok: false, reason: "break-lock" \};/, "showNotchIsland is macOS-gated and never covers the full-screen rest");
  assertIncludes(mainJs, "const islandEnabled = desktopPreferenceDefaults().showReminderIsland !== false;", "island is a toggle-gated channel that coexists with Mira");
  assertIncludes(mainJs, "showReminderIsland: settings.showReminderIsland !== false", "reminder island preference defaults on");
  assertIncludes(mainJs, "function toggleReminderIsland()", "menu/tray can toggle the reminder island");
  assertMatches(mainJs, /label: "顶端提醒岛",\s*type: "checkbox",\s*checked: desktopPreferenceDefaults\(\)\.showReminderIsland,\s*click: toggleReminderIsland/, "app + tray menu expose the reminder island as a checkbox choice");
  assertMatches(mainJs, /function broadcastSystemLifecycle\(reason\)[\s\S]*if \(reason !== "resume"\) \{[\s\S]*hideNotchIsland\(\);/, "lock/suspend/shutdown hides the reminder island");
  assertIncludes(preloadJs, 'ipcRenderer.on("island:show", listener)', "preload exposes the island:show channel");
  assertIncludes(preloadJs, 'ipcRenderer.on("reminder:resolve", listener)', "preload exposes the reminder:resolve channel for the micro-rest loop");
  assertMatches(indexHtml, /onReminderResolve\(\(payload\) => \{[\s\S]*closePendingReminder\(status\)/, "renderer resolves the pending reminder when the island micro-rest closes the loop");
  assertIncludes(packageJson, '"island.html"', "island.html is included in packaged files");
  assertIncludes(islandHtml, "msgEl.textContent = message", "island renders the message as text (XSS-safe), not HTML");
  assertIncludes(islandHtml, "function showRest", "island runs the look-away micro-rest countdown");
  assertIncludes(islandHtml, '"好，眼睛松过了"', "island completion closes the loop in Mira's voice");
  assertNotIncludes(islandHtml, "BAR_HEIGHT", "island has no ambient level bar (collapsed to the one micro-rest surface)");
  assertIncludes(islandHtml, "prefers-reduced-motion", "island honors Reduce Motion");

  // Menu-bar reminder-strength switch: the four levels as one radio group (with inline
  // one-line notes) in both the tray and the app menu, routed through the renderer's
  // requestIntensity so L4 gets its in-app confirm instead of one-click full-screen.
  assertMatches(mainJs, /function intensityMenuItems\(\)[\s\S]*L1 安静 — 只改状态，不弹提醒[\s\S]*type: "radio"[\s\S]*requestIntensityFromMenu\("quiet"\)[\s\S]*L4 强制爱… — 到点全屏，应用内开启[\s\S]*requestIntensityFromMenu\("force"\)/, "menu exposes all four reminder levels as a radio group with inline notes");
  assertMatches(mainJs, /function requestIntensityFromMenu\(level\)[\s\S]*if \(level === "force"[\s\S]*showDashboard\(\);[\s\S]*"intensity:request", level/, "menu routes the level to the renderer; L4 opens the app for its confirm");
  assertMatches(mainJs, /function buildTrayMenu\(\)[\s\S]*\{ label: "提醒强度", enabled: false \},\s*\.\.\.intensityMenuItems\(\)/, "tray menu groups the reminder-strength radios under a 提醒强度 header");
  assertMatches(mainJs, /submenu: \[[\s\S]*\{ label: "提醒强度", enabled: false \},\s*\.\.\.intensityMenuItems\(\)/, "app (⌘) menu mirrors the same reminder-strength group");
  assertIncludes(mainJs, "if (currentIntensity() !== lastMenuIntensity) {", "app menu refreshes its radios only when the level actually changes");
  assertIncludes(preloadJs, 'ipcRenderer.on("intensity:request", listener)', "preload exposes the intensity:request channel for the menu switch");
  assertIncludes(indexHtml, 'intensity: state.settings.intensity || "standard"', "renderer publishes the raw intensity so the menu can check the right radio");
  assertMatches(indexHtml, /onIntensityRequest\(\(level\) => \{[\s\S]*requestIntensity\(level\)/, "menu intensity choice runs the same requestIntensity path as the in-app buttons");
  // The menu radio is decoupled from the render/publish cycle: the renderer notifies main
  // the instant the level changes, so a force-break early-return in render() can't leave
  // the menu showing a stale level.
  assertIncludes(indexHtml, "window.eyeflowDesktop?.setReminderIntensity?.(level);", "renderer notifies main the moment the level changes (no render-cycle lag)");
  assertMatches(mainJs, /ipcMain\.handle\("intensity:changed", \(_event, level\) => \{[\s\S]*applyMenuIntensity\(level\)/, "main updates the menu radio directly from the intensity:changed notify");
  assertMatches(mainJs, /function showDashboard\(options = \{\}\)[\s\S]*if \(!dashboardWindow \|\| dashboardWindow\.isDestroyed\(\)\) createDashboardWindow/, "showDashboard recovers a destroyed window, not just a missing one");

  // Recap "月 = 趋势" (Slice A): the previously-unwired closed-loop engine is now loaded,
  // and the 本月 share card + recap observation lead with an observed trend (or fall back
  // to quote-led when the month isn't confidently readable).
  assertIncludes(indexHtml, '<script src="eyeflow-rhythm.js"></script>', "the closed-loop rhythm engine is actually loaded by the renderer (was packaged but unwired)");
  assertMatches(indexHtml, /function currentMonthInsight\(\)[\s\S]*EyeFlowRhythm\.monthlyTrend\(\{ days: monthTrendDayRecords\(\) \}\)[\s\S]*monthTrendInsight\(trend\)/, "month insight runs the day archive through monthlyTrend → monthTrendInsight");
  assertMatches(indexHtml, /function monthTrendDayRecords\(\)[\s\S]*e\.type !== "reminder_event"[\s\S]*recoverySeconds: recoverySecondsForDay\(r\)/, "month day records reuse the profileWindow shape and derive accept/skip from each day's events");
  assertMatches(indexHtml, /const monthInsight = period === "month" \? currentMonthInsight\(\) : null;[\s\S]*monthInsight \? \{ eyebrow: "Mira 这个月看到的", insight: monthInsight \}/, "本月 share card leads with the month insight when readable");
  assertIncludes(indexHtml, "const monthLine = profileWindowDays >= 30 ? monthObservationLine() : null;", "recap 本月 observation always speaks to the month (insight or honest cold-start)");
  assertMatches(indexHtml, /function monthObservationLine\(\)[\s\S]*if \(insight\) return insight;[\s\S]*这个月才刚开始记[\s\S]*这个月的节奏还没看出明显走向/, "本月 cold-start is honest: 刚开始记 when thin, 还没看出走向 when data exists but no trend — never a fabricated trend");
  assertMatches(mainJs, /function createDarwinTrayIcon\(\)[\s\S]*nativeImage\.createEmpty\(\)[\s\S]*scaleFactor: 1,[\s\S]*trayTemplate\.png[\s\S]*scaleFactor: 2,[\s\S]*trayTemplate@2x\.png[\s\S]*icon\.setTemplateImage\(true\);/, "macOS menu bar tray loads crisp 1x and 2x template assets");
  assertIncludes(packageJson, '"assets/trayTemplate.png"', "macOS menu bar tray template asset is included in packaged files");
  assertIncludes(packageJson, '"assets/trayTemplate@2x.png"', "macOS menu bar tray Retina template asset is included in packaged files");
  assertIncludes(mainJs, 'const COMPANION_EXIT_HINT_TEXT = "双击我可以退出桌面 Mira";', "main has a quiet first-run Mira exit hint");
  assertIncludes(mainJs, "const COMPANION_EXIT_HINT_DURATION_MS = 3800;", "main keeps the first-run Mira exit hint brief");
  assertMatches(mainJs, /function maybeShowCompanionExitHint\(\)[\s\S]*settings\.companionExitHintShown === true[\s\S]*markCompanionExitHintShown\(settings\);[\s\S]*showCompanionBubble\(COMPANION_EXIT_HINT_TEXT, \{ durationMs: COMPANION_EXIT_HINT_DURATION_MS \}\)/, "main shows the Mira exit hint only once");
  assertMatches(mainJs, /function hideCompanionWindow\(\{ persistPreference = true \} = \{\}\)[\s\S]*if \(persistPreference\) markCompanionExitHintShown\(\);[\s\S]*writeDesktopPreference\("showCompanionOnLaunch", false\);/, "persistent Mira exit also dismisses the one-time hint");
  assertMatches(mainJs, /const canReadActiveApp = enhancedDesktopSensing && accessibilityTrusted;[\s\S]*const activeApp = canReadActiveApp \? await getActiveAppName\(\) : "本地计时";/, "main does not call System Events unless enhanced sensing is enabled");
  assertIncludes(indexHtml, 'recordOnboardingEvent("quiet_entry_started"', "onboarding records lightweight entry without assessment");
  assertNotIncludes(indexHtml, "Mira 初始打分；首轮", "onboarding does not create first-run assessment log");
  assertNotIncludes(indexHtml, 'els.sessionStartHint.textContent = "安静提醒已开始";', "first-run confirmation does not insert an extra landing hint");
  assertIncludes(indexHtml, "onboarding_event", "onboarding activation events are captured");
  assertMatches(indexHtml, /function\s+recordOnboardingEvent\(\s*phase,\s*payload = \{\}\s*\)/, "onboarding event helper is wired");
  assertMatches(indexHtml, /\.onboarding-overlay\s*\{[\s\S]*position:\s*fixed;[\s\S]*inset:\s*0;[\s\S]*place-items:\s*center;/, "onboarding overlay centers the first-run dialog in the dashboard window");
  assertMatches(indexHtml, /\.onboarding-dialog\s*\{[\s\S]*width:\s*min\(calc\(var\(--ef-space-14\) \* 9\.4\),\s*100%\);[\s\S]*padding:\s*var\(--ef-space-8\) var\(--ef-space-8\) var\(--ef-space-6\);[\s\S]*box-shadow:\s*var\(--group-shadow\),\s*0 12px 32px rgba\(0,\s*0,\s*0,\s*0\.12\);/, "onboarding dialog keeps bottom whitespace restrained with a quieter ADA shadow");
  assertMatches(indexHtml, /\.mira-intro\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\);[\s\S]*justify-items:\s*center;[\s\S]*text-align:\s*center;[\s\S]*background:\s*transparent;[\s\S]*box-shadow:\s*none;[\s\S]*transform:\s*translateY\(calc\(var\(--ef-space-1\) \* -1\)\);/, "onboarding intro centers and subtly lifts the first-run card content");
  assertMatches(indexHtml, /\.mira-intro \.pet\s*\{[\s\S]*--mira-intro-avatar-scale:\s*1\.46;[\s\S]*--mira-intro-avatar-offset:\s*0px;[\s\S]*width:\s*var\(--ef-mira-avatar-size\);[\s\S]*height:\s*var\(--ef-mira-avatar-size\);[\s\S]*border-radius:\s*var\(--ef-radius-pill\);[\s\S]*radial-gradient\(circle at 50% 54%/, "onboarding Mira floats on a soft glow while keeping canonical face geometry");
  assertMatches(indexHtml, /\.mira-intro \.pet::before\s*\{[\s\S]*top:\s*calc\(var\(--mira-intro-avatar-offset\) \+ var\(--ef-mira-visor-top\)\);[\s\S]*left:\s*calc\(var\(--mira-intro-avatar-offset\) \+ var\(--ef-mira-visor-left\)\);[\s\S]*width:\s*var\(--ef-mira-visor-width\);/, "onboarding Mira visor keeps canonical geometry inside the glow");
  assertMatches(indexHtml, /\.onboarding-flow\s*\{[\s\S]*grid-template-columns:\s*1fr;[\s\S]*align-items:\s*start;/, "onboarding content uses one column to avoid squeezed panels");
  assertMatches(indexHtml, /\.mira-intro h3\s*\{[\s\S]*font-size:\s*var\(--ef-text-title-lg\);[\s\S]*font-weight:\s*500;/, "onboarding title uses restrained token scale and weight");
  assertMatches(indexHtml, /\.mira-intro \.pet-mouth\s*\{[\s\S]*top:\s*calc\(var\(--mira-intro-avatar-offset\) \+ var\(--ef-mira-mouth-top\)\);[\s\S]*width:\s*var\(--ef-mira-mouth-width\);[\s\S]*height:\s*var\(--ef-mira-mouth-height\);[\s\S]*border-bottom-width:\s*var\(--ef-mira-mouth-stroke\);/, "onboarding Mira mouth stays as a canonical soft short smile inside the glow");
  assertNotIncludes(indexHtml, ".mira-intro .state-label", "onboarding no longer styles a removed intro label");
  assertMatches(indexHtml, /\.onboarding-actions\s*\{[\s\S]*justify-content:\s*center;[\s\S]*position:\s*static;/, "onboarding centers the single primary action");
  assertMatches(indexHtml, /\.onboarding-actions \.primary\s*\{[^}]*background:\s*#1f2f29;[^}]*box-shadow:\s*none;[^}]*\}/, "onboarding keeps only one calm primary action");
  assertMatches(indexHtml, /\.onboarding-permission-note\s*\{[\s\S]*border:\s*0;[\s\S]*background:\s*transparent;/, "onboarding permission note is muted text, not another card");
  assertMatches(indexHtml, /:root\[data-theme="dark"\] \.symptom:focus-within\s*\{[\s\S]*background:\s*var\(--panel\);[\s\S]*box-shadow:\s*0 0 0 3px rgba\(79,\s*201,\s*156,\s*0\.12\);/, "quick-log symptom focus stays dark-readable in night mode");
  assertMatches(indexHtml, /id="sessionPanel"\s+tabindex="-1"/, "session panel can receive first-round focus");
  assertMatches(indexHtml, /function\s+completeInitialAssessment\(options = \{\}\)[\s\S]*startSession\(\);[\s\S]*recordOnboardingEvent\("first_focus_started"[\s\S]*focusSessionPanel\(\{\s*focusTarget:\s*"panel"\s*\}\);/, "assessment confirmation starts timing and focuses the timer panel directly");
  assertIncludes(indexHtml, 'els.stateHeadline.textContent = "这一轮进行中";', "first round uses one running title for automatic and manual starts");
  assertIncludes(indexHtml, 'els.stateAction.textContent = "Mira 已开始计时。";', "first round confirms timing has started");
  assertMatches(indexHtml, /els\.stateExplain\.textContent = load >= 48[\s\S]{0,160}?"到恢复断点我再提醒；需要停下就点暂停或休息。"/, "running first round explains the reminder and pause path (load-branched)");
  // No idle "准备开始" preparation page may come back (smoke-installed also guards
  // this). Idle is now an in-page standby state that starts only from activity.
  assertNotMatches(indexHtml, /els\.stateHeadline\.textContent\s*=\s*"准备开始这一轮"/, "today never reintroduces a 准备开始 preparation headline");
  assertMatches(indexHtml, /function\s+handleResumeCheck\(\)[\s\S]*?ensureTodayReadyForActivityStart\(\);/, "returning to the app prepares Today for activity-driven timing");
  // The resume "not assessed today" branch (day rolled over, lastAssessmentDay cleared)
  // must route to onboarding / standby preparation, not strand the today view on an
  // empty start-card hero. Guards against the "刚打开还是空白页" regression.
  assertMatches(indexHtml, /if \(!hasAssessedToday\(\)\) \{[\s\S]*?if \(!canAutoPrepareToday\(\)\) \{[\s\S]*?showOnboarding\(\);[\s\S]*?\} else \{[\s\S]*?ensureTodayReadyForActivityStart\(\);/, "resume with an unassessed day routes to onboarding/standby preparation, never a start page");
  // Normal active launches should auto-prepare even on clean data; only explicit
  // debug/manual onboarding should block Today preparation.
  assertMatches(indexHtml, /function\s+canAutoPrepareToday\(\)[\s\S]*?if \(forceOnboarding\) return false;[\s\S]*?return true;/, "normal active launches auto-prepare while explicit debug onboarding stays blocked");
  assertMatches(indexHtml, /function\s+ensureTodayReadyForActivityStart\(\)[\s\S]*?if \(!canAutoPrepareToday\(\)\) return false;/, "today activity preparation respects only explicit onboarding blocks");
  // hasEverOnboarded must persist across day rollover, else returning users get
  // the guide re-shown every new day (regression codex caught).
  assertNotMatches(indexHtml, /function rolloverDayIfNeeded\(dayState\) \{(?:(?!\n    \})[\s\S])*?hasEverOnboarded/, "day rollover must not reset hasEverOnboarded");
  assertMatches(indexHtml, /const priorUseSignal = Boolean\([\s\S]*saved\.initialAssessmentDone[\s\S]*saved\.lastAssessmentDay[\s\S]*saved\.onboardingDismissed[\s\S]*saved\.summaryHistory[\s\S]*saved\.logs[\s\S]*saved\.rhythmMemory\?\.recentEvents[\s\S]*if \(saved\.hasEverOnboarded === undefined \|\| \(!loaded\.hasEverOnboarded && priorUseSignal\)\) \{[\s\S]*loaded\.hasEverOnboarded = priorUseSignal;/, "loadState repairs explicit false hasEverOnboarded when prior use exists");
  // Cross-day-while-open / resume rollover follows the same rule as cold launch:
  // prepare the same Today page unless explicit onboarding was requested.
  assertMatches(indexHtml, /function ensureCurrentDay\(options = \{\}\)[\s\S]*?options\.showOnboarding !== false && !canAutoPrepareToday\(\)[\s\S]*?showOnboarding\(\);[\s\S]*?ensureTodayReadyForActivityStart\(\);/, "cross-day rollover prepares standby Today unless explicit onboarding is active");
  assertMatches(indexHtml, /function\s+completeInitialAssessment\(options = \{\}\)[\s\S]*state\.settings\.intensity\s*=\s*"standard";[\s\S]*setIntensity\(state\.settings\.intensity,\s*\{\s*persistChange:\s*false,\s*renderChange:\s*false,\s*userChange:\s*false\s*\}\);/, "assessment completion defaults to L2 standard (轻提示)");
  assertNotMatches(indexHtml, /completeInitialAssessment[\s\S]*showFirstRoundLanding\(\);/, "onboarding no longer passes through a first-round landing page");
  assertMatches(indexHtml, /options\.focusTarget\s*===\s*"panel"[\s\S]*\?\s*els\.sessionPanel/, "focus helper can target session panel");
  assertMatches(indexHtml, /function\s+focusSessionPanel\(options = \{\}\)[\s\S]*clearFirstRoundLanding\(\);[\s\S]*els\.restGuideHint\.hidden\s*=\s*false;/, "rest guide clears first-round hint");
  assertIncludes(preloadJs, "onDashboardFocus", "preload exposes dashboard focus IPC");
  assertMatches(mainJs, /function\s+sendDashboardFocus\(payload = \{\}\)[\s\S]*dashboardWindow\.webContents\.send\("dashboard:focus"/, "main process forwards dashboard focus requests");
  assertMatches(indexHtml, /onDashboardFocus\?\.\(\(payload = \{\}\) => \{[\s\S]*focusManualStartEntry\(\);/, "dashboard focus can locate the manual start entry");
  assertMatches(indexHtml, /function\s+focusManualStartEntry\(\)[\s\S]*switchView\("todayView"\)[\s\S]*focusSessionPanel\(\{\s*focusTarget:\s*"panel"\s*\}\)/, "manual start focus opens Today and targets the running timer panel");
  assertMatches(indexHtml, /function\s+toggleSession\(\)\s*\{[\s\S]*clearFirstRoundLanding\(\);/, "manual session controls clear first-round hint");
  assertMatches(indexHtml, /function\s+showBreak\(reason\)\s*\{[\s\S]*clearFirstRoundLanding\(\);/, "break overlay clears first-round hint");

  assertMatches(companionHtml, /currentMood\s*===\s*"rest"[\s\S]*openDashboard\(\{\s*restGuide:\s*true\s*\}\);[\s\S]*return;[\s\S]*if \(isMiraSpeaking\) return;/, "pink Mira click opens rest guide even while its prompt is visible");
  assertIncludes(companionHtml, "看远处 20 秒。点我打开指引。", "pink Mira hover message stays short");
  assertNotIncludes(companionHtml, "点我会打开休息指引。", "pink Mira hover message removes longer instruction copy");
  assertMatches(companionHtml, /companion\.addEventListener\("dblclick"[\s\S]*setCompanionVisible\?\.\(false\)/, "desktop Mira double-click persists hidden visibility");
  assertMatches(mainJs, /function\s+showDashboard\(options = \{\}\)[\s\S]*options\?\.restGuide[\s\S]*sendDashboardRestGuide/, "main process forwards rest guide request");
  assertMatches(mainJs, /dashboardWindow\.webContents\.send\("dashboard:restGuide"/, "dashboard rest-guide IPC");

  console.log("[smoke:onboarding] PASSED. First-run Mira flow is wired.");
  console.log("  - eyeflow-core.js: parse OK");
  console.log("  - eyeflow-recovery-data.js: parse OK");
  console.log("  - eyeflow-ui-utils.js: parse OK");
  scriptCounts.forEach(([file, count]) => {
    console.log(`  - ${file}: ${count} inline script(s) parse OK`);
  });
}

try {
  main();
} catch (error) {
  console.error("[smoke:onboarding] FAILED.", error.message);
  process.exitCode = 1;
}
