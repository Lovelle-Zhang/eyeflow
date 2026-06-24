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
  assertIncludes(indexHtml, 'return "自动记录中";', "auto-tracking hint stays short inside the timer");
  assertIncludes(indexHtml, "可切到手动专注", "auto-tracking status uses readable action copy");
  assertNotIncludes(indexHtml, 'class="state-meta-row"', "today main state no longer renders unclear folded meta row");
  assertNotIncludes(indexHtml, 'aria-label="快速反馈"', "today main state no longer renders first-screen quick feedback");
  assertNotIncludes(indexHtml, "手动从 00:00", "auto-tracking hint avoids internal reset wording");
  assertMatches(indexHtml, /\.timer-inner span\s*\{[\s\S]*white-space:\s*nowrap;[\s\S]*text-overflow:\s*ellipsis;/, "timer hint stays on one line");
  assertMatches(indexHtml, /function\s+modeCopy\(\)[\s\S]*timer:\s*`本轮 \$\{els\.focusTarget\.value\} 分 · 全屏恢复 \$\{els\.breakTarget\.value\} 秒`[\s\S]*timer:\s*`本轮 \$\{els\.focusTarget\.value\} 分 · 明确提醒 \$\{els\.breakTarget\.value\} 秒`[\s\S]*timer:\s*`本轮 \$\{els\.focusTarget\.value\} 分 · 轻提醒 \$\{els\.breakTarget\.value\} 秒`[\s\S]*timer:\s*`本轮 \$\{els\.focusTarget\.value\} 分 · 恢复 \$\{els\.breakTarget\.value\} 秒`/, "all session workflow modes use current-round copy");
  assertMatches(
    indexHtml,
    /function\s+handlePrimaryAction\(\)\s*\{[\s\S]*clearFirstRoundLanding\(\);[\s\S]*startSession\(\);[\s\S]*focusSessionPanel\(\{\s*focusTarget:\s*"panel"\s*\}\);/,
    "hero primary action starts the workflow immediately"
  );
  assertMatches(
    indexHtml,
    /const behaviorLevel = Number\(intervention\.level \|\| 1\);[\s\S]*interventionLevel: behaviorLevel,[\s\S]*interventionDisplayLevel: displayLevel,/,
    "companion publishes behavior level separately from display level"
  );
  assertMatches(
    indexHtml,
    /forceMode: state\.settings\.intensity === "force",[\s\S]*allowSystemNotify: Boolean\(state\.settings\.systemNotifyToggle && state\.settings\.intensity !== "force"\)/,
    "force mode suppresses ordinary companion notifications"
  );
  assertIncludes(indexHtml, "我先不弹普通提醒。到恢复断点后，会直接进入全屏恢复。", "force mode companion stays quiet until break point");
  assertIncludes(indexHtml, "强制爱临时退出", "force emergency exit has a quiet cooldown state");
  assertIncludes(indexHtml, "Mira 先只改变状态和颜色；到恢复断点再短暂提示。", "L2 early phase stays visual-only");
  assertMatches(
    indexHtml,
    /const standardEarly = state\.settings\.intensity === "standard";[\s\S]*level: standardEarly \? 1 : 2,/,
    "L2 early observation does not become an auto-popup"
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
    sessionFlow.computeRestDue({ isRunning: false, elapsedSeconds: 1200, focusMinutes: 20 }),
    false,
    "paused session is not rest due"
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
	    "这一轮已安排",
	    "planned session panel title"
	  );
  assertEqual(
    sessionFlow.sessionControlView({ isRunning: true, restDue: true, restSeconds: 150 }).restText,
    "休息 150 秒",
    "running rest-due button"
  );
  assertEqual(
    sessionFlow.sessionControlView({ assessedToday: false }).startText,
    "开始安静提醒",
    "unassessed start button"
  );
  assertEqual(
    sessionFlow.sessionControlView({ assessedToday: false }).pillText,
    "已安排",
    "unassessed pill stays arranged instead of calibration-led"
  );
  assertEqual(
    sessionFlow.sessionControlView({ assessedToday: true, autoTracking: true }).startText,
    "手动专注",
    "auto-tracking start button"
  );
  assertEqual(
    sessionFlow.sessionControlView({ assessedToday: true, autoTracking: true }).panelTitle,
    "本轮节奏",
    "auto-tracking panel title"
  );
  assertEqual(
    sessionFlow.sessionControlView({ assessedToday: true, autoTracking: true }).startTitle,
    "切到手动专注并从 00:00 计时",
    "auto-tracking start title"
  );
  assertEqual(
    sessionFlow.sessionControlView({ assessedToday: true, paused: true }).startText,
    "继续专注",
    "paused start button"
  );

  assertEqual(sessionFlow.stageMiraView({ load: 80 }).mood, "rest", "high load Mira mood");
  assertEqual(sessionFlow.stageMiraView({ load: 50 }).mood, "blink", "medium load Mira mood");
  assertEqual(sessionFlow.stageMiraView({ load: 20, topSymptomValue: 5 }).mood, "blink", "symptom-led Mira mood");
  assertEqual(sessionFlow.stageMiraView({ load: 20, isRunning: true }).mood, "focus", "running Mira mood");
  assertEqual(sessionFlow.stageMiraView({ load: 20 }).mood, "calm", "calm Mira mood");
  assertEqual(sessionFlow.stageMiraView({ load: 80 }).tone.color, "#c9637f", "rest Mira tone");

  console.log("[smoke:session] PASSED. Session controls and Mira stage state are extracted and stable.");
}

try {
  main();
} catch (error) {
  console.error("[smoke:session] FAILED.", error.message);
  process.exitCode = 1;
}
