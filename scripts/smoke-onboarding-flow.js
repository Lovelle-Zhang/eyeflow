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
  const companionPanelHtml = read("companion-panel.html");
  const mainJs = read("main.js");
  const preloadJs = read("preload.js");
  parseScriptFile("eyeflow-core.js");
  parseScriptFile("eyeflow-recovery-data.js");
  parseScriptFile("eyeflow-ui-utils.js");

  const scriptCounts = [
    ["index.html", parseInlineScripts("index.html")],
    ["companion.html", parseInlineScripts("companion.html")],
    ["companion-panel.html", parseInlineScripts("companion-panel.html")]
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
  assertIncludes(indexHtml, "setEnhancedSensing", "frontend exposes enhanced sensing setting");
  assertIncludes(indexHtml, "setCompanionVisible", "frontend exposes desktop Mira setting");
  assertIncludes(indexHtml, "首次默认显示；需要时可从这里退出。", "settings explains desktop Mira defaults visible but optional");
  assertIncludes(indexHtml, 'desktopMiraVisible ? "退出 Mira" : "显示 Mira"', "settings control panel can exit desktop Mira without using the floating avatar");
  assertMatches(indexHtml, /function isEnhancedSensingActiveForUi\(\)[\s\S]*return latestDesktopSettings\?\.enhancedDesktopSensing === true;/, "enhanced sensing UI only treats the effective system-enabled state as active");
  assertNotIncludes(indexHtml, "|| latestDesktopSettings?.enhancedDesktopSensingRequested === true", "enhanced sensing UI must not treat the requested state as active");
  assertNotIncludes(indexHtml, "scheduleEnhancedSensingAutoRestart", "enhanced sensing UI has no auto-restart loop");
  assertNotIncludes(indexHtml, "ENHANCED_PERMISSION_AUTO_RESTART_COOLDOWN_MS", "enhanced sensing UI has no refresh cooldown state");
  assertMatches(indexHtml, /const nextEnabled = !isEnhancedSensingActiveForUi\(\);/, "enhanced sensing toggle follows the effective UI state instead of stale saved settings");
  assertMatches(indexHtml, /setSystemStatus\(els\.desktopReadyTag,\s*"enabled",\s*"增强中"\)/, "settings shows enhanced sensing as enabled only after the system switch is on");
  assertMatches(indexHtml, /else if \(enhancedSensingRequested\) \{[\s\S]*setSystemStatus\(els\.desktopReadyTag,\s*"action",\s*"需系统开启"\)/, "settings has a separate non-enabled state for requested enhanced sensing");
  assertMatches(indexHtml, /els\.readyPermissionTitle\.textContent = enhancedSensing[\s\S]*\? "已开启"[\s\S]*: enhancedSensingRequested[\s\S]*\? "需系统开启"[\s\S]*: "普通模式"/, "settings row title separates enabled, system-required, and ordinary states");
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
  assertIncludes(mainJs, "hasCompanionVisibilityPreference", "main can migrate old hidden desktop Mira preferences");
  assertIncludes(mainJs, "showCompanionOnLaunch: hasCompanionVisibilityPreference", "main defaults desktop Mira visible unless explicitly hidden in the current preference version");
  assertIncludes(mainJs, "next.companionVisibilityPreferenceVersion = COMPANION_VISIBILITY_PREFERENCE_VERSION", "main marks explicit desktop Mira visibility choices");
  assertMatches(mainJs, /if \(desktopPreferenceDefaults\(\)\.showCompanionOnLaunch \|\| debugCapture \|\| wantsCurrentVisualCapture\("companion-panel"\)\) \{[\s\S]*createCompanionWindow\(\);[\s\S]*createCompanionPanelWindow\(\);[\s\S]*\}/, "main creates companion windows by default unless the user hides Mira");
  assertMatches(mainJs, /function defaultCompanionBounds\(\)[\s\S]*screen\.getPrimaryDisplay\(\)\?\.workArea[\s\S]*x: area\.x \+ area\.width - companionSizes\.compact\.width - 28[\s\S]*y: area\.y \+ area\.height - companionSizes\.compact\.height - 28/, "main defaults desktop Mira to the primary workArea bottom-right above the Dock");
  assertMatches(mainJs, /const bounds = settings\.companionBounds \|\| defaultCompanionBounds\(\);[\s\S]*const initialBounds = visibleCompanionBounds/, "first desktop Mira appearance uses the bottom-right default when no saved position exists");
  assertMatches(mainJs, /if \(reset\) \{[\s\S]*setBounds\(visibleCompanionBounds\(defaultCompanionBounds\(\)\), false\);[\s\S]*\}/, "find Mira resets to the same bottom-right default position");
  assertMatches(mainJs, /label: "显示\/退出 Mira", accelerator: "CommandOrControl\+M", click: toggleCompanionVisibility/, "main menu provides keyboard-only Mira show and exit");
  assertMatches(mainJs, /label: "显示\/退出 Mira", click: toggleCompanionVisibility/, "tray menu uses the same show and exit Mira action");
  assertMatches(mainJs, /function toggleCompanionVisibility\(\)[\s\S]*desktopPreferenceDefaults\(\)\.showCompanionOnLaunch[\s\S]*hideCompanionWindow\(\);[\s\S]*showCompanion\(\);/, "main menu shortcut toggles Mira visibility");
  assertMatches(mainJs, /function hideCompanionWindow\(\{ persistPreference = true \} = \{\}\)[\s\S]*if \(persistPreference\) writeDesktopPreference\("showCompanionOnLaunch", false\);/, "temporary companion hides do not persist the hidden preference");
  assertMatches(mainJs, /ipcMain\.handle\("companion:hide", \(\) => \{[\s\S]*hideCompanionWindow\(\{ persistPreference: false \}\);[\s\S]*\}\);/, "renderer lifecycle hide keeps desktop Mira default visible");
  assertMatches(mainJs, /function showCompanionBubble\(message, options = \{\}\)[\s\S]*!desktopPreferenceDefaults\(\)\.showCompanionOnLaunch[\s\S]*return \{ ok: false, reason: "hidden" \};/, "hidden desktop Mira preference blocks toast bubbles from resurrecting Mira");
  assertIncludes(mainJs, 'const COMPANION_EXIT_HINT_TEXT = "双击我可以退出桌面 Mira";', "main has a quiet first-run Mira exit hint");
  assertIncludes(mainJs, "const COMPANION_EXIT_HINT_DURATION_MS = 3800;", "main keeps the first-run Mira exit hint brief");
  assertMatches(mainJs, /function maybeShowCompanionExitHint\(\)[\s\S]*settings\.companionExitHintShown === true[\s\S]*markCompanionExitHintShown\(settings\);[\s\S]*showCompanionBubble\(COMPANION_EXIT_HINT_TEXT, \{ durationMs: COMPANION_EXIT_HINT_DURATION_MS \}\)/, "main shows the Mira exit hint only once");
  assertMatches(mainJs, /function hideCompanionWindow\(\{ persistPreference = true \} = \{\}\)[\s\S]*if \(persistPreference\) markCompanionExitHintShown\(\);[\s\S]*writeDesktopPreference\("showCompanionOnLaunch", false\);/, "persistent Mira exit also dismisses the one-time hint");
  assertMatches(mainJs, /const canReadActiveApp = enhancedDesktopSensing && accessibilityTrusted;[\s\S]*const activeApp = canReadActiveApp \? await getActiveAppName\(\) : "本地计时";/, "main does not call System Events unless enhanced sensing is enabled");
  assertIncludes(indexHtml, 'recordOnboardingEvent("quiet_entry_started"', "onboarding records lightweight entry without assessment");
  assertNotIncludes(indexHtml, "Mira 初始打分；首轮", "onboarding does not create first-run assessment log");
  assertMatches(indexHtml, /els\.sessionStartHint\.textContent\s*=\s*"安静提醒已开始";/, "first-run hint confirms quiet reminders");
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
  assertMatches(indexHtml, /id="sessionPanel"\s+tabindex="-1"/, "session panel can receive first-round focus");
  assertMatches(indexHtml, /function\s+completeInitialAssessment\(options = \{\}\)[\s\S]*showFirstRoundLanding\(\);/, "assessment completion lands on first round");
  assertIncludes(indexHtml, 'els.stateHeadline.textContent = autoTracking ? "正在记录这一轮" : "这一轮进行中";', "manual first round confirms it is already running");
  assertIncludes(indexHtml, ': "先把注意力留给当前任务。";', "manual first round avoids repeated timer wording");
  assertIncludes(indexHtml, 'els.stateExplain.textContent = "需要休息时，Mira 再轻提醒。";', "manual first round explains Mira will remind once");
  assertMatches(indexHtml, /function\s+completeInitialAssessment\(options = \{\}\)[\s\S]*state\.settings\.intensity\s*=\s*"quiet";[\s\S]*setIntensity\(state\.settings\.intensity,\s*\{\s*persistChange:\s*false,\s*renderChange:\s*false,\s*userChange:\s*false\s*\}\);/, "assessment completion defaults to L1 quiet");
  assertMatches(indexHtml, /function\s+showFirstRoundLanding\(\)[\s\S]*els\.sessionStartHint\.hidden\s*=\s*false;[\s\S]*focusSessionPanel\(\{\s*focusTarget:\s*"panel"\s*\}\);/, "first-round hint focuses session panel");
  assertMatches(indexHtml, /options\.focusTarget\s*===\s*"panel"[\s\S]*\?\s*els\.sessionPanel/, "focus helper can target session panel");
  assertMatches(indexHtml, /function\s+focusSessionPanel\(options = \{\}\)[\s\S]*clearFirstRoundLanding\(\);[\s\S]*els\.restGuideHint\.hidden\s*=\s*false;/, "rest guide clears first-round hint");
  assertIncludes(preloadJs, "onDashboardFocus", "preload exposes dashboard focus IPC");
  assertMatches(mainJs, /function\s+sendDashboardFocus\(payload = \{\}\)[\s\S]*dashboardWindow\.webContents\.send\("dashboard:focus"/, "main process forwards dashboard focus requests");
  assertMatches(indexHtml, /onDashboardFocus\?\.\(\(payload = \{\}\) => \{[\s\S]*focusManualStartEntry\(\);/, "dashboard focus can locate the manual start entry");
  assertMatches(indexHtml, /function\s+focusManualStartEntry\(\)[\s\S]*switchView\("todayView"\)[\s\S]*focusSessionPanel\(\{\s*focusTarget:\s*"start"\s*\}\)/, "manual start focus opens Today and targets the session action");
  assertMatches(companionPanelHtml, /showDashboard\(\{\s*view:\s*"todayView",\s*focus:\s*"manualStart"\s*\}\)/, "companion panel opens directly to the manual start entry");
  assertMatches(indexHtml, /function\s+toggleSession\(\)\s*\{[\s\S]*clearFirstRoundLanding\(\);/, "manual session controls clear first-round hint");
  assertMatches(indexHtml, /function\s+showBreak\(reason\)\s*\{[\s\S]*clearFirstRoundLanding\(\);/, "break overlay clears first-round hint");

  assertMatches(companionHtml, /currentMood\s*===\s*"rest"[\s\S]*openDashboard\(\{\s*restGuide:\s*true\s*\}\);/, "pink Mira click opens rest guide");
  assertIncludes(companionHtml, "点我会打开休息指引。", "pink Mira hover message");
  assertMatches(companionHtml, /companion\.addEventListener\("dblclick"[\s\S]*setCompanionVisible\?\.\(false\)/, "desktop Mira double-click persists hidden visibility");
  assertMatches(mainJs, /function\s+showDashboard\(options = \{\}\)[\s\S]*options\?\.restGuide[\s\S]*sendDashboardRestGuide/, "main process forwards rest guide request");
  assertMatches(mainJs, /dashboardWindow\.webContents\.send\("dashboard:restGuide"/, "dashboard rest-guide IPC");

  assertIncludes(companionPanelHtml, "anchor-top", "panel top anchor class");
  assertIncludes(companionPanelHtml, "anchor-bottom", "panel bottom anchor class");
  assertMatches(mainJs, /anchorY:\s*latestPanelAnchorY/, "main process sends panel vertical anchor");

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
