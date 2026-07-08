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

function assertNotIncludes(source, expected, label) {
  if (source.includes(expected)) {
    throw new Error(`${label}: unexpected "${expected}"`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertMatches(source, pattern, label) {
  if (!pattern.test(source)) {
    throw new Error(`${label}: pattern not found: ${pattern}`);
  }
}

function assertNotMatches(source, pattern, label) {
  if (pattern.test(source)) {
    throw new Error(`${label}: unexpected pattern found: ${pattern}`);
  }
}

function functionBody(source, name) {
  const start = source.indexOf(`function ${name}`);
  if (start === -1) throw new Error(`${name}: function not found`);
  const signatureEnd = source.indexOf(") {", start);
  if (signatureEnd === -1) throw new Error(`${name}: function signature not found`);
  const braceStart = source.indexOf("{", signatureEnd);
  let depth = 0;
  for (let index = braceStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(braceStart + 1, index);
    }
  }
  throw new Error(`${name}: function body not closed`);
}

function parseInlineScripts(relativePath) {
  const html = read(relativePath);
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
  scripts.forEach((match, index) => {
    new vm.Script(match[1], { filename: `${relativePath}#rest-script${index + 1}` });
  });
  return scripts.length;
}

function loadRestFlow() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  new vm.Script(read("eyeflow-rest-flow.js"), { filename: "eyeflow-rest-flow.js" }).runInContext(sandbox);
  if (!sandbox.window.EyeFlowRestFlow) {
    throw new Error("rest flow export missing: window.EyeFlowRestFlow");
  }
  return sandbox.window.EyeFlowRestFlow;
}

function main() {
  const indexHtml = read("index.html");
  const mainJs = read("main.js");
  const companionHtml = read("companion.html");
  const breakLockHtml = read("break-lock.html");
  const restFlow = loadRestFlow();

  const inlineCount = parseInlineScripts("index.html");
  const breakLockInlineCount = parseInlineScripts("break-lock.html");

  assertIncludes(indexHtml, '<script src="eyeflow-rest-flow.js"></script>', "rest flow script include");
  assertIncludes(indexHtml, "window.EyeFlowRestFlow", "dashboard reads rest flow helpers");
  assertIncludes(indexHtml, 'id="restSessionBtn"', "session rest button");
  assertIncludes(indexHtml, 'id="takeReminderBreakBtn"', "pending reminder rest button");
  assertIncludes(indexHtml, 'id="finishBreakBtn"', "finish rest button");
  assertIncludes(indexHtml, 'id="forceEscapeBtn"', "force emergency exit button");
  assertIncludes(indexHtml, 'id="breakMiniTimer"', "manual rest countdown");
  assertIncludes(indexHtml, "看向远处", "rest overlay leads with distance gaze");
  assertIncludes(indexHtml, "不用盯着屏幕，20 秒后再回来。", "rest overlay avoids reading work");
  assertIncludes(indexHtml, 'id="breakCompanionLine"', "rest companion line");
  assertIncludes(indexHtml, "我回来了", "manual rest return action");
  assertIncludes(indexHtml, "稍后提醒", "manual rest snooze action");
  assertIncludes(indexHtml, "可以回来了", "manual rest completion title");
  assertIncludes(indexHtml, "慢慢回来，不用急着盯屏幕。", "manual rest completion copy");
  assertIncludes(indexHtml, "formatBreakTime(remaining)", "manual rest timer renders as a live countdown");
  assertIncludes(indexHtml, ".break-overlay.rest-ready", "manual rest has a clear completed visual state");
  assertIncludes(indexHtml, "playRestCompletionBowl();", "manual rest completion plays a gentle bowl cue");
  assertIncludes(indexHtml, "function playRestCompletionBowl()", "manual rest bowl cue is implemented locally");
  assertIncludes(indexHtml, "frequency: 432", "manual rest bowl cue uses a soft fundamental tone");
  assertIncludes(indexHtml, "grid-template-columns: repeat(2, minmax(0, 1fr));", "manual rest buttons share one action layout");
  assertNotIncludes(indexHtml, "data-break-color=", "rest overlay removes color choice buttons");
  assertIncludes(indexHtml, 'data-recovery-feedback="better"', "better recovery feedback");
  assertIncludes(indexHtml, 'data-recovery-feedback="same"', "same recovery feedback");
  assertIncludes(indexHtml, 'data-recovery-feedback="tired"', "tired recovery feedback");
  assertIncludes(indexHtml, '<button class="ghost" type="button" data-recovery-feedback="tired">还累</button>', "tired recovery feedback uses a lightweight label");
  assertNotIncludes(indexHtml, "还想休息", "tired recovery feedback no longer sounds like another operation");
  assertIncludes(indexHtml, "点“休息”，Mira 带你。", "rest guide hint copy");
  assertIncludes(indexHtml, "max-height: calc(100vh - var(--ef-space-12));", "break dialog stays inside short desktop windows");
  assertIncludes(indexHtml, "overscroll-behavior: contain;", "break dialog scroll is contained");

  assertMatches(indexHtml, /els\.restSessionBtn\.addEventListener\("click",\s*\(\)\s*=>\s*showBreak\("manual"\)\);/, "session rest button opens manual break");
  assertMatches(indexHtml, /els\.takeReminderBreakBtn\.addEventListener\("click",\s*\(\)\s*=>\s*showBreak\("scheduled"\)\);/, "pending reminder rest button opens scheduled break");
  assertMatches(indexHtml, /els\.finishBreakBtn\.addEventListener\("click",\s*finishBreak\);/, "finish rest button asks feedback");
  assertMatches(indexHtml, /function\s+showBreak\(reason\)[\s\S]*restBreakView\(\{/, "showBreak uses extracted rest view");
  assertMatches(indexHtml, /function\s+finishBreak\(\)[\s\S]*recoveryFeedbackView\(\)/, "finishBreak uses extracted feedback view");
  assertMatches(indexHtml, /function\s+restartVisibleBreakTimerAfterResume\(\)[\s\S]*startBreakRestTimer\(breakRestTotalSeconds \|\| Number\(els\.breakTarget\.value\) \|\| 20\);/, "visible rest countdown restarts after system resume");
  assertMatches(indexHtml, /function\s+pauseVisibleBreakTimerForSystemRest\(\)[\s\S]*stopBreakRestTimer\(\);/, "visible rest countdown pauses during system sleep or lock");
  assertMatches(indexHtml, /button\.addEventListener\("click",\s*\(\)\s*=>\s*completeRecovery\(button\.dataset\.recoveryFeedback\)\);/, "feedback buttons complete recovery");
  assertMatches(indexHtml, /function\s+completeRecovery\(feedback\)[\s\S]*state\.breaks\s*\+=\s*1;[\s\S]*elapsedSeconds\s*=\s*0;/, "completeRecovery records rest and resets timer");
  assertMatches(indexHtml, /function\s+completeRecovery\(feedback\)[\s\S]*recoveryCompletionPlan\(\{[\s\S]*showBreak\("extended"\);/, "completeRecovery uses extracted recovery plan");
  assertIncludes(indexHtml, "firstRecoverySample", "recovery events mark first recovery sample");
  assertIncludes(indexHtml, "第一条恢复样本已建立。", "first recovery completion explains sample value");

  assertEqual(restFlow.restBreakView({ reason: "manual", companionLine: "慢慢来。" }).showMicroTask, false, "manual rest does not show micro task");
  assertEqual(restFlow.restBreakView({ reason: "manual" }).title, "看向远处", "manual rest has one clear instruction");
  assertEqual(restFlow.restBreakView({ reason: "manual" }).finishButtonText, "我回来了", "manual rest return button");
  assertEqual(restFlow.restBreakView({ reason: "manual" }).snoozeButtonText, "稍后提醒", "manual rest snooze button");
  assertEqual(restFlow.restBreakView({ reason: "manual" }).timerLabel, "剩余", "manual rest timer label is countdown-oriented");
  assertEqual(restFlow.restBreakView({ reason: "manual", breakSeconds: 120 }).timerSeconds, 120, "manual rest countdown follows the 休息长度 setting");
  assertEqual(restFlow.restBreakView({ reason: "manual", breakSeconds: 60 }).timerSeconds, 60, "manual rest countdown honors a shorter setting");
  assertMatches(restFlow.restBreakView({ reason: "manual", breakSeconds: 90 }).copy, /90 秒后再回来/, "manual rest copy states the actual rest length");
  assertEqual(restFlow.restBreakView({ reason: "force" }).timerSeconds, 0, "force rest runs its own guided flow, not the countdown");
  assertMatches(indexHtml, /restBreakView\(\{[\s\S]*?breakSeconds: Number\(els\.breakTarget\.value\)/, "showBreak passes the 休息长度 value into the rest view");
  assertEqual(restFlow.restBreakView({ reason: "force" }).showForceTask, true, "force rest shows guided task");
  assertEqual(restFlow.restBreakView({ reason: "force" }).showFinishButton, false, "force rest hides ordinary finish button");
  assertEqual(restFlow.restBreakView({ reason: "force" }).showForceEscapeButton, true, "force rest exposes emergency exit");
  assertEqual(restFlow.restBreakView({ reason: "manual" }).showForceEscapeButton, false, "manual rest does not expose force exit");
  assertEqual(restFlow.recoveryFeedbackView().showRecoveryFeedback, true, "feedback view reveals choices");
  assertEqual(restFlow.recoveryCompletionPlan({ feedback: "better" }).symptomRelief, 2, "better feedback relief");
  assertEqual(restFlow.recoveryCompletionPlan({ feedback: "same", focusTarget: 20 }).nextFocusTarget, 15, "same feedback shortens focus");
  assertEqual(restFlow.recoveryCompletionPlan({ feedback: "tired", breakTarget: 210 }).nextBreakTarget, 240, "tired feedback extends rest cap");

  assertMatches(companionHtml, /currentMood\s*===\s*"rest"[\s\S]*openDashboard\(\{\s*restGuide:\s*true\s*\}\);[\s\S]*return;[\s\S]*if \(isMiraSpeaking\) return;/, "pink Mira opens rest guide even while its prompt is visible");
  // Single reminder-notification authority: only main.js's coordinator sends system
  // notifications. The companion window and the dashboard reminder/natural-break paths
  // no longer fire their own (that used to stack banners on top of the bubble/island).
  assertNotMatches(companionHtml, /eyeflowDesktop\.notify\(/, "companion delegates system notifications to the main-process coordinator");
  assertNotMatches(indexHtml, /现在像是一个恢复断点/, "natural-break nudge no longer fires its own system notification");
  assertNotMatches(indexHtml, /miraExited\(\) && !state\.settings\.systemNotifyToggle && window\.eyeflowDesktop\?\.notify/, "exited-Mira reminder fallback is delivered by main.js, not the dashboard");
  assertMatches(mainJs, /const quietedByUser = Boolean\(state\.reminderDeferred\) \|\| snoozeUntil > now;[\s\S]*hideCompanionPanel\(\);[\s\S]*return;/, "desktop panel respects snooze and busy-later responses");
  assertMatches(mainJs, /const hasReminderOpening = Boolean\(state\.isRunning \|\| state\.reminderOpening \|\| state\.naturalBreak \|\| state\.reminderPending\);/, "desktop panel requires an interruption opening");
  assertIncludes(breakLockHtml, "再点一次确认退出", "break lock emergency exit requires confirmation");
  assertIncludes(breakLockHtml, "interrupted: true", "break lock reports interrupted force exits");
  const finishBreakLockBody = functionBody(mainJs, "finishBreakLock");
  assertNotMatches(
    finishBreakLockBody,
    /breakLockWindow\s*=\s*null;/,
    "break lock finish keeps the window reference until closed"
  );
  assertMatches(
    finishBreakLockBody,
    /forceCloseBreakLockWindow\(/,
    "break lock finish has a forced-close fallback for stuck fullscreen windows"
  );
  assertNotMatches(
    finishBreakLockBody,
    /dashboardWindow\.show\(\);\s*dashboardWindow\.focus\(\);/,
    "break lock finish does not directly reveal a possibly fullscreen dashboard"
  );
  assertMatches(
    finishBreakLockBody,
    /restoreDashboardAfterBreakLock\(payload\);/,
    "break lock finish restores the dashboard window before reveal"
  );
  assertMatches(
    mainJs,
    /function\s+restoreDashboardAfterBreakLock\(payload = \{\}\)[\s\S]*dashboardWindow\.setFullScreen\(false\);[\s\S]*dashboardWindow\.unmaximize\(\);[\s\S]*dashboardWindow\.setVisibleOnAllWorkspaces\(false\);[\s\S]*keepDashboardVisible\(\);[\s\S]*dashboardWindow\.show\(\);/,
    "dashboard is forced back to a normal centered window after break lock"
  );
  assertMatches(
    breakLockHtml,
    /document\.addEventListener\("keydown"[\s\S]*event\.key === "Escape"[\s\S]*requestEmergencyExit\(\);/,
    "break lock supports Escape as an emergency exit fallback"
  );
  assertMatches(mainJs, /if \(label === "break-lock-complete"\) \{[\s\S]*window\.clearInterval\(ticker\);[\s\S]*completionShown = false;[\s\S]*showCompletion\(\);/, "debug break-lock complete capture stops the timer before forcing the completed state");
  assertMatches(mainJs, /dashboardWindow\.webContents\.send\("dashboard:restGuide"/, "desktop forwards rest guide");
  assertMatches(indexHtml, /onRestGuide\?\.\(\(payload = \{\}\) => \{[\s\S]*focusSessionPanel\(\{\s*target:\s*"rest",\s*guideLevel:\s*level\s*\}\);/, "dashboard rest guide focuses rest button");

  console.log("[smoke:rest] PASSED. Rest guide and recovery flow are wired.");
  console.log(`  - index.html: ${inlineCount} inline script(s) parse OK`);
  console.log(`  - break-lock.html: ${breakLockInlineCount} inline script(s) parse OK`);
}

try {
  main();
} catch (error) {
  console.error("[smoke:rest] FAILED.", error.message);
  process.exitCode = 1;
}
