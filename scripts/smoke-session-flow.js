#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(source, expected, label) {
  if (!source.includes(expected)) {
    throw new Error(`${label}: missing "${expected}"`);
  }
}

function assertNotIncludes(source, expected, label) {
  if (source.includes(expected)) {
    throw new Error(`${label}: unexpected "${expected}"`);
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

function loadSessionFlow() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  new vm.Script(read("eyeflow-session-flow.js"), { filename: "eyeflow-session-flow.js" }).runInContext(sandbox);
  if (!sandbox.window.EyeFlowSessionFlow) {
    throw new Error("session flow export missing: window.EyeFlowSessionFlow");
  }
  return sandbox.window.EyeFlowSessionFlow;
}

function main() {
  const indexHtml = read("index.html");
  const packageJson = JSON.parse(read("package.json"));
  const sessionFlow = loadSessionFlow();

  assertMatches(
    indexHtml,
    /<script src="eyeflow-core\.js"><\/script>\s*<script src="eyeflow-recovery-data\.js"><\/script>\s*<script src="eyeflow-session-flow\.js"><\/script>\s*<script src="eyeflow-rest-flow\.js"><\/script>/,
    "session flow loads before inline app code"
  );
  assertIncludes(indexHtml, "window.EyeFlowSessionFlow", "dashboard reads session flow helpers");
  assertIncludes(indexHtml, "sessionControlView({", "session controls use extracted view model");
  assertIncludes(indexHtml, "stageMiraView({", "stage Mira uses extracted mood view");
  assertIncludes(indexHtml, "timer: `本轮 ${els.focusTarget.value} 分 · 恢复 ${els.breakTarget.value} 秒`", "session workflow hint uses current-round copy");
  assertIncludes(indexHtml, "return `计时中 · 目标 ${focusTargetMinutes} 分钟`;", "auto-tracking hint uses the same timer language as manual timing");
  assertIncludes(indexHtml, "return `这一轮计时中 · ${autoDuration}`;", "auto-tracking status reads as current timing");
  assertNotIncludes(indexHtml, "可切到手动专注", "auto-tracking status no longer asks users to choose a mode");
  assertNotIncludes(indexHtml, "切到手动专注", "auto-tracking controls no longer expose a second focus mode");
  assertNotMatches(indexHtml, /function\s+startSession\(\)[\s\S]*?if \(sessionSource === "auto"\) \{[\s\S]*?elapsedSeconds = 0;/, "continuing an automatic round does not reset recorded time");
  assertIncludes(indexHtml, "const SYSTEM_SESSION_GAP_MS = 5 * 60 * 1000;", "session clock has a sleep-gap threshold");
  assertIncludes(indexHtml, "const NATURAL_AWAY_IDLE_SECONDS = 5 * 60;", "natural away detection is separated from the short rest duration");
  assertMatches(indexHtml, /function\s+repairStaleOpenFocusSession\(dayState\)[\s\S]*repairedFromStaleElapsedSeconds: elapsed[\s\S]*dayState\.elapsedSeconds = 0;[\s\S]*dayState\.sessionSource = "idle";[\s\S]*dayState\.activeFocusSessionId = "";[\s\S]*dayState\.reminderStats\.autoBreaks = Number\(dayState\.reminderStats\.autoBreaks \|\| 0\) \+ 1;/, "stale open sessions from old sleep-counting builds are repaired on load");
  assertMatches(indexHtml, /function\s+handleSystemLifecycle\(payload = \{\}\)\s*\{[\s\S]*if \(reason === "resume"\) \{[\s\S]*Date\.now\(\) - lastSessionTickAt > SYSTEM_SESSION_GAP_MS[\s\S]*completeSessionForSystemRest\("system-inactive-gap"\);[\s\S]*if \(reason === "lock-screen" \|\| reason === "suspend"\) \{[\s\S]*pauseVisibleBreakTimerForSystemRest\(\);[\s\S]*completeSessionForSystemRest\(reason\);[\s\S]*return;/, "lock, sleep, and missed long gaps end the current work round instead of counting sleep time");
  assertMatches(indexHtml, /function\s+tick\(\)\s*\{[\s\S]*now - lastSessionTickAt > SYSTEM_SESSION_GAP_MS[\s\S]*completeSessionForSystemRest\("system-inactive-gap"\);[\s\S]*return;[\s\S]*syncRunningSessionClock\(\{ now \}\);/, "session tick rejects long inactive gaps before recomputing elapsed time");
  assertMatches(indexHtml, /function\s+maybeAutoCompleteBreak\(activity\)[\s\S]*lastActiveSecondsBeforeIdle = isRunning[\s\S]*naturalAwaySeconds = Math\.max\(NATURAL_AWAY_IDLE_SECONDS, Number\(els\.breakTarget\.value \|\| 0\)\);[\s\S]*if \(activity\.idleSeconds < naturalAwaySeconds\) return;[\s\S]*if \(!isRunning && lastActiveSecondsBeforeIdle < Number\(els\.focusTarget\.value\) \* 60 \* 0\.5\) return;[\s\S]*if \(!isRunning && now - \(state\.lastAutoBreakAt \|\| 0\) < 12 \* 60 \* 1000\) return;[\s\S]*if \(isRunning\) \{[\s\S]*elapsedSeconds = Math\.max\(0, elapsedSeconds - Number\(activity\.idleSeconds \|\| 0\)\);[\s\S]*closeFocusSession\("idle"\);[\s\S]*sessionSource = "idle";/, "manual timing treats long keyboard idle as natural rest and removes idle time from focus");
  assertMatches(
    indexHtml,
    /function\s+tick\(\)\s*\{[\s\S]*completeSessionForSystemRest\("system-inactive-gap"\);[\s\S]*return;/,
    "tick long-gap path still records the inactive gap before exiting"
  );
  assertMatches(
    indexHtml,
    /function\s+completeSessionForSystemRest\(reason\)[\s\S]*sessionSource = "idle";[\s\S]*render\(\);[\s\S]*persist\(\);/,
    "system rest completion may reset to idle, relying on central continuity instead of local path patches"
  );
  assertMatches(
    indexHtml,
    /function\s+maybeAutoCompleteBreak\(activity\)[\s\S]*elapsedSeconds = 0;[\s\S]*sessionSource = "idle";[\s\S]*showToast\("Mira：你刚停下来一会儿，已自动记录一次休息。"\);/,
    "natural away completion can reset to idle without needing a local auto-start patch"
  );
  assertMatches(
    indexHtml,
    /function\s+finishForceBreak\(payload = \{\}\)[\s\S]*state\.forceEscapeUntil = Date\.now\(\) \+ SNOOZE_MINUTES \* 60 \* 1000;[\s\S]*sessionSource = "idle";[\s\S]*render\(\);[\s\S]*persist\(\);/,
    "force escape keeps a quiet window that the central guard must respect"
  );
  assertMatches(
    indexHtml,
    /function\s+resetDay\(\)[\s\S]*sessionSource = "idle";[\s\S]*state\.lastAssessmentDay = "";[\s\S]*render\(\);[\s\S]*persist\(\);/,
    "reset day returns to an unassessed state rather than being auto-started"
  );
  assertNotIncludes(indexHtml, 'class="state-meta-row"', "today main state no longer renders unclear folded meta row");
  assertNotIncludes(indexHtml, 'aria-label="快速反馈"', "today main state no longer renders first-screen quick feedback");
  assertNotIncludes(indexHtml, "手动从 00:00", "auto-tracking hint avoids internal reset wording");
  assertMatches(indexHtml, /\.timer-inner span\s*\{[\s\S]*white-space:\s*nowrap;[\s\S]*text-overflow:\s*ellipsis;/, "timer hint stays on one line");
  assertMatches(indexHtml, /function\s+modeCopy\(\)[\s\S]*timer:\s*`本轮 \$\{els\.focusTarget\.value\} 分 · 全屏恢复 \$\{els\.breakTarget\.value\} 秒`[\s\S]*timer:\s*`本轮 \$\{els\.focusTarget\.value\} 分 · 明确提醒 \$\{els\.breakTarget\.value\} 秒`[\s\S]*timer:\s*`本轮 \$\{els\.focusTarget\.value\} 分 · 轻提醒 \$\{els\.breakTarget\.value\} 秒`[\s\S]*timer:\s*`本轮 \$\{els\.focusTarget\.value\} 分 · 恢复 \$\{els\.breakTarget\.value\} 秒`/, "all session workflow modes use current-round copy");
  assertMatches(
    indexHtml,
    /function\s+handlePrimaryAction\(\)\s*\{[\s\S]*clearFirstRoundLanding\(\);[\s\S]*startSession\(\);[\s\S]*focusSessionPanel\(\{\s*focusTarget:\s*"panel"\s*\}\);/,
    "fallback hero primary action starts the workflow when shown"
  );
  assertMatches(indexHtml, /function\s+ensureTodayReadyForActivityStart\(\)[\s\S]*state\.lastAssessmentDay = todayKey\(\);[\s\S]*state\.initialAssessmentDone = true;[\s\S]*state\.onboardingDismissed = true;[\s\S]*return true;/, "today creates a lightweight daily state before activity-driven timing");
  assertNotIncludes(indexHtml, "autoStartSessionOnOpen", "today no longer starts timing just because the page rendered");
  assertMatches(
    indexHtml,
    /function\s+deriveTodayPhase\(\)\s*\{[\s\S]*return "needs-onboarding";[\s\S]*return "break-active";[\s\S]*return "force-quiet";[\s\S]*return "running";[\s\S]*return "idle";/,
    "today phase centrally enumerates onboarding, break, force quiet, running, and idle"
  );
  assertMatches(
    indexHtml,
    /function\s+startAutoTrackingFromActivity\(activity\)[\s\S]*if \(!ensureTodayReadyForActivityStart\(\)\) return false;[\s\S]*if \(!activity\?\.isWorking\) return false;[\s\S]*sessionSource = "auto";/,
    "screen activity is the only automatic path from idle into timing"
  );
  assertMatches(
    indexHtml,
    /function\s+pauseSession\(endedBy = "paused"\)[\s\S]*closeFocusSession\(endedBy\);[\s\S]*sessionSource = "manual-paused";/,
    "pausing enters a respected manual-paused state without resetting elapsed time"
  );
  assertMatches(
    indexHtml,
    /if \(!isRunning\) \{[\s\S]*if \(canUseActivity && activity\.isWorking\) \{[\s\S]*startAutoTrackingFromActivity\(activity\);/,
    "activity updates restart timing from idle when the screen is active"
  );
  assertMatches(
    indexHtml,
    /function\s+render\(\)\s*\{[\s\S]*const todayPhase = deriveTodayPhase\(\);(?![\s\S]*queueTodayContinuity\("render"\))[\s\S]*document\.body\.classList\.toggle\("session-active", \["running", "break-active", "idle", "paused"\]\.includes\(todayPhase\)\);/,
    "render keeps one Today surface and never starts timing by rendering"
  );
  assertMatches(
    indexHtml,
    /case "idle":[\s\S]*els\.stateHeadline\.textContent = "我在旁边";[\s\S]*有屏幕活动时，我会自动开始计时。[\s\S]*els\.primaryActionBtn\.hidden = true;/,
    "idle is a standby state on the same Today page, not a start page"
  );
  assertNotMatches(
    indexHtml,
    /else\s*\{\s*\/\/ By design there is no idle preparation page[\s\S]*els\.stateHeadline\.textContent = "这一轮进行中";[\s\S]*els\.stateAction\.textContent = "Mira 已开始计时。";/,
    "idle state no longer masquerades as a running hero"
  );
  assertMatches(
    indexHtml,
    /const behaviorLevel = Number\(intervention\.level \|\| 1\);[\s\S]*interventionLevel: behaviorLevel,[\s\S]*interventionDisplayLevel: displayLevel,/,
    "companion publishes behavior level separately from display level"
  );
  // System notifications are governed by macOS (no in-app toggle): the state payload
  // no longer carries an allowSystemNotify flag, and the coordinator decides purely by
  // level + visibility.
  assertMatches(indexHtml, /forceMode: state\.settings\.intensity === "force",/, "force mode is still surfaced in the published state");
  assertNotMatches(indexHtml, /allowSystemNotify/, "no in-app system-notification flag in the state payload (macOS governs it)");
  assertIncludes(indexHtml, "我先不弹普通提醒。到恢复断点后，会直接进入全屏恢复。", "force mode companion stays quiet until break point");
  assertMatches(
    indexHtml,
    /function\s+startForceBreak\(intervention, options = \{\}\)[\s\S]*if \(!options\.preview\) closePendingReminder\("ignored"\);[\s\S]*currentBreakReason = "force";/,
    "force break closes the pending reminder honestly (ignored) instead of orphaning its accounting; previews leave it pending"
  );
  assertNotMatches(
    indexHtml,
    /function\s+startForceBreak\(intervention, options = \{\}\)[\s\S]{0,600}state\.pendingReminder = null;/,
    "force break must not null the pending reminder directly (orphans shown rhythm memory + reminderStats)"
  );
  assertMatches(
    indexHtml,
    /function\s+renderInterventionStrategy\(load\)\s*\{[\s\S]*const intervention = currentIntervention\(load\);[\s\S]*if \(intervention\.level >= 4\) \{[\s\S]*startForceBreak\(intervention\);[\s\S]*return true;[\s\S]*\}[\s\S]*maybeRecordReminder\(intervention, load\);/,
    "L4 force takeover bypasses ordinary reminder recording"
  );
  assertIncludes(indexHtml, "强制爱临时退出", "force emergency exit has a quiet cooldown state");
  assertIncludes(indexHtml, "Mira 先轻轻变化；到恢复断点再说清楚。", "pre-break (level-1) phase stays visual-only (P3 translation layer)");
  assertIncludes(indexHtml, "const FIRST_AHA_SECONDS = 5 * 60;", "Mira still gives a five-minute alive ping");
  assertIncludes(indexHtml, "lastAlivePingSessionId", "alive ping is tracked per session instead of permanently skipped");
  assertIncludes(indexHtml, "sessionId,", "alive ping records the current round id");
  assertIncludes(indexHtml, "showToast(memoryLine ? `Mira：${memoryLine}`", "repeated overrun memory line routes through desktop Mira instead of main-window toast");
  assertNotIncludes(indexHtml, "skipped-existing-history", "alive ping is not suppressed forever for returning users");
  assertNotIncludes(indexHtml, "if (memory.firstAhaAt) return;", "alive ping is no longer a one-time lifetime event");
  assertMatches(
    indexHtml,
    /if \(intent\.level === 1\) \{[\s\S]*?breakDue: false,/,
    "early observation (level-1 intent) does not become an auto-popup (P3: no breakDue before the threshold)"
  );
  assertMatches(
    indexHtml,
    /function\s+shouldSurfaceReminder\(intervention, load\)[\s\S]*const clearBreakDue = level >= 3[\s\S]*elapsedSeconds >= targetSeconds;[\s\S]*if \(clearBreakDue\) return true;[\s\S]*if \(isBusyForReminder\(\)\) return false;/,
    "L3 at the real break point must surface even while the user is still working"
  );
  assertMatches(
    indexHtml,
    /reminderPending: state\.pendingReminder\?\.status === "pending",[\s\S]*snoozeUntil: Number\(state\.snoozeUntil \|\| 0\),[\s\S]*reminderOpening,/,
    "companion publishes reminder context for desktop interruption gating"
  );
  if (!packageJson.build?.files?.includes("eyeflow-session-flow.js")) {
    throw new Error("package build files: missing eyeflow-session-flow.js");
  }

  assertEqual(
    sessionFlow.computeRestDue({ isRunning: true, elapsedSeconds: 1200, focusMinutes: 20 }),
    true,
    "rest is due at focus target"
  );
  assertEqual(
    sessionFlow.computeRestDue({ autoTracking: true, elapsedSeconds: 1200, focusMinutes: 20 }),
    true,
    "auto-tracked round is rest due at focus target"
  );
  assertEqual(
    sessionFlow.computeRestDue({ isRunning: false, elapsedSeconds: 1200, focusMinutes: 20 }),
    false,
    "paused session is not rest due"
  );
  // 2026-07-10 岛完成闭环:closeBreakRound 把 elapsed 归零后,rest-due 断点卡
  // (及其派生的菜单栏"休息"态)必须随之回落——这是岛完成→状态回落的行为锚点。
  assertEqual(
    sessionFlow.computeRestDue({ autoTracking: true, elapsedSeconds: 0, focusMinutes: 20 }),
    false,
    "island completion (closeBreakRound → elapsed 0) clears the rest-due card"
  );
  assertEqual(
    sessionFlow.sessionState({ autoTracking: true }),
    "running",
    "auto-tracking normalizes to the running session state"
  );
  assertEqual(
    sessionFlow.sessionState({ paused: true }),
    "paused",
    "manual pause normalizes to the paused session state"
  );
  assertEqual(
    sessionFlow.sessionState({ isRunning: true, resting: true }),
    "resting",
    "resting breakpoint has priority over recording state"
  );

	  assertEqual(
	    sessionFlow.sessionControlView({ isRunning: true, restDue: true, restSeconds: 150 }).pillText,
	    "恢复断点",
	    "running rest-due pill"
	  );
	  assertEqual(
	    sessionFlow.sessionControlView({ isRunning: true, restDue: false, restSeconds: 150 }).panelTitle,
	    "本轮节奏",
	    "running session panel title"
	  );
	  assertEqual(
	    sessionFlow.sessionControlView({ isRunning: false, assessedToday: true }).panelTitle,
	    "本轮节奏",
	    "idle session keeps the same panel title"
	  );
  assertEqual(
    sessionFlow.sessionControlView({ isRunning: true, restDue: true, restSeconds: 150 }).restText,
    "休息 150 秒",
    "running rest-due button"
  );
  assertEqual(
    sessionFlow.sessionControlView({ assessedToday: false }).startText,
    "待命",
    "unassessed standby button"
  );
  assertEqual(
    sessionFlow.sessionControlView({ assessedToday: false }).pillText,
    "待命中",
    "unassessed pill stays in standby"
  );
  assertEqual(
    sessionFlow.sessionControlView({ assessedToday: true, autoTracking: true }).startText,
    "暂停",
    "auto-tracking start button"
  );
  assertEqual(
    sessionFlow.sessionControlView({ assessedToday: true, autoTracking: true }).panelTitle,
    "本轮节奏",
    "auto-tracking panel title"
  );
  assertEqual(
    sessionFlow.sessionControlView({ assessedToday: true, autoTracking: true }).startTitle,
    "暂停当前计时",
    "auto-tracking start title"
  );
  assertEqual(
    sessionFlow.sessionControlView({ assessedToday: true, autoTracking: true }).startIcon,
    "pause",
    "auto-tracking start icon"
  );
  assertEqual(
    sessionFlow.sessionControlView({ assessedToday: true, autoTracking: true }).pillText,
    "计时中",
    "auto-tracking uses unified timer pill"
  );
  assertEqual(
    sessionFlow.sessionControlView({ assessedToday: true, autoTracking: true, restDue: true, restSeconds: 150 }).pillText,
    "恢复断点",
    "auto-tracking rest-due pill"
  );
  assertEqual(
    sessionFlow.sessionControlView({ assessedToday: true, autoTracking: true, restDue: true, restSeconds: 150 }).restText,
    "休息 150 秒",
    "auto-tracking rest-due button"
  );
  assertEqual(
    sessionFlow.sessionControlView({ assessedToday: true, paused: true }).startText,
    "恢复自动计时",
    "paused is a respected state offering resume, not a standby fallback"
  );
  assertEqual(
    sessionFlow.sessionControlView({ assessedToday: true, paused: true }).startDisabled,
    false,
    "the paused resume control is clickable"
  );

  assertEqual(sessionFlow.stageMiraView({ load: 80 }).mood, "rest", "high load Mira mood");
  assertEqual(sessionFlow.stageMiraView({ load: 50 }).mood, "blink", "medium load Mira mood");
  assertEqual(sessionFlow.stageMiraView({ load: 20, topSymptomValue: 5 }).mood, "blink", "symptom-led Mira mood");
  assertEqual(sessionFlow.stageMiraView({ load: 20, isRunning: true }).mood, "focus", "running Mira mood");
  assertEqual(sessionFlow.stageMiraView({ load: 20 }).mood, "calm", "calm Mira mood");
  // Mood still differentiates behavior/copy, but the slider tone is a single
  // restrained accent (no mood-driven hue shifts) — every stage resolves to the
  // tokenized Mira green that flips with the theme.
  ["rest", "blink", "focus", "calm"].forEach((mood, i) => {
    const load = [80, 50, 20, 20][i];
    const running = mood === "focus";
    const tone = sessionFlow.stageMiraView({ load, isRunning: running }).tone;
    assertEqual(tone.color, "var(--mira)", `${mood} Mira tone is the single accent`);
    assertEqual(tone.glow, "var(--mira-soft)", `${mood} Mira glow is the single accent`);
  });

  // Activity-pipeline watchdog: timing is activity-driven, so a dead pipeline must
  // surface honestly ("自动计时暂时不可用" + manual fallback), never a silent 待命.
  assertMatches(indexHtml, /function activityDetectionHealthy\(\)[\s\S]*?lastActivityAt > 0[\s\S]*?ACTIVITY_STALE_MS/, "activity health is derived from a freshness watchdog with a startup grace");
  assertMatches(indexHtml, /case "idle":[\s\S]*?if \(!activityDetectionHealthy\(\)\)[\s\S]*?自动计时暂时不可用[\s\S]*?手动开始计时/, "idle surfaces a dead activity pipeline honestly with a manual-start fallback");
  assertMatches(indexHtml, /function syncAutoTrackingClock\(\{ now = Date\.now\(\) \} = \{\}\)[\s\S]*?deltaSeconds = Math\.floor\(\(now - autoTrackLastTickAt\) \/ 1000\);[\s\S]*?elapsedSeconds \+= deltaSeconds;/, "auto tracking advances the visible timer one second at a time between activity updates");
  assertMatches(indexHtml, /window\.setInterval\(\(\) => \{[\s\S]*?isAutoTracking\(\)[\s\S]*?!activityDetectionHealthy\(\)[\s\S]*?sessionSource = "idle";[\s\S]*?syncAutoTrackingClock\(\);[\s\S]*?\}, 1000\)/, "the one-second loop smooths auto tracking and stops it if the activity pipeline goes stale");

  // Entry hardening: one sessionStartBlocked() guard, shared by BOTH the manual and
  // the activity-driven start, so no entry (shortcut / plan restart / future caller)
  // can start a focus round mid forced-break or onboarding.
  assertMatches(indexHtml, /function sessionStartBlocked\(\)[\s\S]*?forceBreakActive[\s\S]*?onboardingOverlay/, "a single sessionStartBlocked() guard centralizes the never-start invariant");
  assertMatches(indexHtml, /function startSession\(\)[\s\S]*?if \(sessionStartBlocked\(\)\) return;/, "manual startSession routes through the shared start guard");
  assertIncludes(indexHtml, "if (sessionStartBlocked() || forceQuietActive()) return false;", "activity-driven start shares the guard (plus the quiet-window it alone respects)");

  // Explicit manual pause is a REAL state the machine respects: pause → manual-paused,
  // screen activity does NOT auto-restart, resume → idle 待命. The pause button is no
  // longer "名义存在实际无用".
  assertMatches(indexHtml, /function isManualPaused\(\)\s*\{\s*return sessionSource === "manual-paused";/, "isManualPaused reflects the manual-paused source");
  assertMatches(indexHtml, /function pauseSession[\s\S]*?sessionSource = "manual-paused";/, "pausing enters the respected manual-paused state, not plain idle");
  assertMatches(indexHtml, /function pauseAutoTracking\(\)[\s\S]*?sessionSource = "manual-paused";/, "pausing auto tracking also enters manual-paused instead of bouncing back to auto");
  assertNotMatches(indexHtml, /function pause(?:AutoTracking|Session)[\s\S]{0,260}?elapsedSeconds = 0;/, "manual pause preserves the visible elapsed time instead of resetting to 00:00");
  assertMatches(indexHtml, /if \(!saved\.sessionSource\) \{[\s\S]*?loaded\.sessionSource = "idle";/, "loading state preserves persisted manual-paused now that it has a real UI");
  assertMatches(indexHtml, /function startAutoTrackingFromActivity[\s\S]*?if \(isManualPaused\(\)\) return false;/, "screen activity does NOT auto-restart timing while manually paused");
  assertMatches(indexHtml, /function deriveTodayPhase\(\)[\s\S]*?if \(isManualPaused\(\)\) return "paused";/, "manual pause is its own Today phase");
  assertMatches(indexHtml, /case "paused":[\s\S]*?已暂停[\s\S]*?els\.primaryActionBtn\.hidden = true;/, "paused hero is honest but does not duplicate the timer-card resume action");
  assertMatches(indexHtml, /function resumeFromManualPause\(\)[\s\S]*?sessionSource = "idle";/, "resume returns to idle 待命 so activity can auto-start again");
  assertMatches(indexHtml, /const canUseActivity = [\s\S]{0,120}?!isManualPaused\(\)/, "manual pause suspends ALL activity-driven session logic (incl. natural-break auto-complete)");
  assertMatches(indexHtml, /autoTrackResumeElapsedBase = elapsedSeconds;[\s\S]*resumedSeconds = Math\.max\(0, Math\.round\(\(detectedAt - autoTrackResumeStartedAt\) \/ 1000\)\);[\s\S]*elapsedSeconds = Math\.max\(elapsedSeconds, autoTrackResumeElapsedBase \+ resumedSeconds\);/, "auto-track after resume continues from the paused time without catching up paused desktop activeSeconds");
  assertNotIncludes(indexHtml, "elapsedSeconds = autoTrackFreshStart ? 1", "manual resume no longer jumps 00:00 → 00:01 before restoring elapsed time");
  assertMatches(indexHtml, /if \(load >= 74 && !isManualPaused\(\)\)/, "manual pause takes priority over the high-load rest CTA (button text matches action)");
  const sessionFlowJs = read("eyeflow-session-flow.js");
  assertMatches(sessionFlowJs, /if \(currentState === "paused"\)\s*\{[\s\S]*?startText: "恢复自动计时",[\s\S]*?startDisabled: false,/, "the timer control shows an enabled 恢复自动计时 button when paused");

  console.log("[smoke:session] PASSED. Session controls and Mira stage state are extracted and stable.");
}

try {
  main();
} catch (error) {
  console.error("[smoke:session] FAILED.", error.message);
  process.exitCode = 1;
}
