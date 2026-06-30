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

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function main() {
  const indexHtml = read("index.html");
  const coreJs = read("eyeflow-core.js");
  const recoveryDataJs = read("eyeflow-recovery-data.js");
  const restFlowJs = read("eyeflow-rest-flow.js");
  new vm.Script(coreJs, { filename: "eyeflow-core.js" });
  const recoverySandbox = { window: {} };
  vm.createContext(recoverySandbox);
  new vm.Script(recoveryDataJs, { filename: "eyeflow-recovery-data.js" }).runInContext(recoverySandbox);
  const recoveryData = recoverySandbox.window.EyeFlowRecoveryData;
  const restFlowSandbox = { window: {} };
  vm.createContext(restFlowSandbox);
  new vm.Script(restFlowJs, { filename: "eyeflow-rest-flow.js" }).runInContext(restFlowSandbox);
  const restFlow = restFlowSandbox.window.EyeFlowRestFlow;

  assertIncludes(indexHtml, "专注工作时，也有人照顾你的眼睛。", "first-day sells the companion feeling before mechanics");
  assertIncludes(indexHtml, '<button class="primary" id="startOnboardingBtn" type="button">好，开始吧</button>', "first-day has one primary action");
  assertIncludes(indexHtml, "不打断，不监视，安静待在桌面一角。", "first-day positions Mira and states trust in one clean line");
  assertIncludes(indexHtml, "只是帮你记得休息。", "first-day value is easy to understand");
  assertNotMatches(indexHtml, /<span class="state-label">认识 Mira<\/span>|Mira 会安静地待在桌面一角。|不打断，不监视。/, "first-day removes the redundant label and repeated quiet-presence copy");
  assertIncludes(indexHtml, "FIRST_AHA_SECONDS = 5 * 60", "first-day creates a first-five-minute aha moment");
  assertIncludes(indexHtml, "mira_aha_moment", "first-day aha is recorded as a local event");
  assertIncludes(indexHtml, "我在旁边了。你继续专注，休息点到了我再轻轻提醒。", "first-day aha makes Mira feel present");
  assertNotMatches(indexHtml, /眼睛现在怎么样|选一个感觉，Mira 先安排第一轮。|开始第一轮|权限稍后|id="onboardingPermissionBtn"/, "first-day removes forced onboarding and first-screen permission");
  assertIncludes(coreJs, "首轮按 50 分钟专注开始", "first-day comfort rhythm");
  assertMatches(indexHtml, /function\s+completeInitialAssessment\(options = \{\}\)[\s\S]*ONBOARDING_PRESETS\.fine[\s\S]*state\.settings\.intensity\s*=\s*"quiet"/, "first-day plan starts with low-load quiet rhythm");
  assertIncludes(indexHtml, "function miraDialogue", "local Mira dialogue layer");
  assertIncludes(indexHtml, "Mira 只记这个模式，不记你做了什么。", "mode memory avoids content memory");

  assertIncludes(indexHtml, "看到 Mira 变色时先眨几下，不用停下。", "first reminder is light but noticeable");
  assertIncludes(recoveryDataJs, "lightReminderLines", "light reminder line library");
  assertEqual(recoveryData.lightReminderLines.blink.length, 10, "blink reminder line count");
  assertEqual(recoveryData.lightReminderLines.gaze.length, 10, "gaze reminder line count");
  assertEqual(recoveryData.lightReminderLines.relax.length, 10, "relax reminder line count");
  assertIncludes(recoveryDataJs, "眨眼。不用停下来。", "blink reminder line");
  assertIncludes(recoveryDataJs, "找一个3米以外的点，看5秒。", "gaze reminder line uses relaxed wording");
  assertIncludes(recoveryDataJs, "眼睛需要一个不是像素的东西。", "gaze reminder memorable line");
  assertIncludes(recoveryDataJs, "肩膀放下来。", "body relax reminder line");
  assertIncludes(indexHtml, "Mira 会借这个空隙提醒你", "natural-break reminder timing");
  assertIncludes(indexHtml, "不会突然打断", "reminder does not feel like a popup interruption");
  assertIncludes(indexHtml, "看向远处", "rest uses one clear instruction");
  assertIncludes(indexHtml, "不用盯着屏幕，20 秒后再回来。", "rest asks users to leave the screen");
  assertNotMatches(indexHtml, /data-break-color=/, "rest does not show color choice buttons");
  assertEqual(restFlow.restBreakView({ reason: "manual" }).showMicroTask, false, "manual rest avoids in-rest questions");
  assertEqual(restFlow.restBreakView({ reason: "manual" }).finishButtonText, "我回来了", "rest return action is clear");
  assertIncludes(recoveryDataJs, "restCompanionLines", "rest companion line library");
  assertEqual(recoveryData.restCompanionLines.length, 20, "rest companion line count");
  assertIncludes(recoveryDataJs, "Mira 在这里守时间。", "rest companion line");
  assertIncludes(recoveryDataJs, "好了，回来时别急着盯屏幕。", "rest return line");
  assertIncludes(indexHtml, 'id="breakCompanionLine"', "rest companion line appears in rest overlay");
  assertIncludes(recoveryDataJs, "relationshipLines", "relationship line library");
  assertIncludes(recoveryDataJs, "你已经连续{days}把恢复接住了。", "gentle streak line");
  assertIncludes(recoveryDataJs, "最近{days}里，你都给眼睛留了恢复。", "gentle streak copy avoids impossible week math");
  assertNotMatches(recoveryDataJs, /这周有\{days\}|一周\{days\}|一周[一二三四五六七八九十]+天|周[^\n"]*[八九十]天/, "streak copy cannot say impossible week lengths");
  assertIncludes(recoveryDataJs, "回来了。今天眼睛怎么样？", "returning user line");
  assertIncludes(recoveryDataJs, "你的节奏还在，不用补。", "no catch-up pressure line");
  assertIncludes(indexHtml, "function gentleStreakDays", "gentle streak calculation");
  assertIncludes(indexHtml, "function returningLine", "returning user dialogue");
  assertIncludes(indexHtml, "returningGapDays", "returning state records gap without blame");
  assertIncludes(indexHtml, "gentleStreakLine()", "completion can surface gentle streak");
  assertNotMatches(indexHtml + recoveryDataJs, /火焰|streak freeze|断签|补签/, "no anxiety streak language");

  assertIncludes(indexHtml, "第 3 天开始你可能会自然把提醒留到稍后。", "third-day retention cliff copy");
  assertIncludes(indexHtml, "窗口切换、键鼠停顿这类自然断点", "third-day alternate presence strategy");
  assertIncludes(indexHtml, "今天先不说休息的事了。你看起来在赶什么，专注完再说。", "occasional silence copy");

  assertIncludes(indexHtml, "档案正在成形", "seventh-day value proof");
  assertIncludes(indexHtml, "EyeFlow 会更清楚哪些提醒真的适合你", "seventh-day forward plan");
  assertIncludes(indexHtml, "其中一部分来自被你接住的提醒", "weekly handled-reminder proof");
  assertIncludes(indexHtml, "Mira Insight", "profile review opens with Mira insight");
  assertIncludes(indexHtml, "先完成几轮，Mira 再给建议。", "first-day profile uses a direct empty state before enough evidence");
  assertIncludes(indexHtml, "先完成几轮专注和恢复。之后这里会整理出更适合你的提醒节奏。", "first-day profile defers insight until usage evidence exists");
  assertIncludes(indexHtml, 'els.profileLoad.textContent = hasProfileEvidence ? load : "记录中";', "first-day profile avoids premature score display");
  assertIncludes(indexHtml, 'classList.toggle("profile-building", !hasProfileEvidence)', "first-day profile has a dedicated low-evidence visual state");
  assertIncludes(indexHtml, "下一轮建议", "profile review answers the next-round plan directly");
  assertIncludes(indexHtml, "主要感受", "profile review leads with user-facing signal language");
  assertIncludes(indexHtml, "<span>提醒时间</span>", "profile review shows reminder timing");
  assertIncludes(indexHtml, "<span>休息时间</span>", "profile review shows rest timing");
  assertIncludes(indexHtml, "状态线", "profile review keeps trend chart as a lower-weight disclosure");
  assertIncludes(indexHtml, "高级记录", "profile review keeps advanced records collapsed");
  assertIncludes(indexHtml, "本地档案", "profile review keeps data basis compact");
  assertIncludes(indexHtml, "EyeFlow 只安排恢复节奏，不做健康结论", "profile review keeps non-medical boundary");
  assertIncludes(indexHtml, 'id="profileSampleCount"', "profile review exposes sample count");
  assertIncludes(indexHtml, 'id="profileConfidence"', "profile review exposes confidence level");
  assertIncludes(indexHtml, "Mira 参考了什么", "profile review keeps score contributors in advanced records");
  assertIncludes(indexHtml, "记录情况", "profile review keeps data collection state in advanced records");
  assertIncludes(indexHtml, 'id="profileContributors"', "profile review renders contributor breakdown");
  assertIncludes(indexHtml, 'id="profileMissingSignals"', "profile review renders missing signal list");
  assertIncludes(indexHtml, "modelVersion", "profile logs store model version");
  assertIncludes(indexHtml, "missingSignals", "profile analysis stores missing signals");
  assertIncludes(indexHtml, "本地参考和导出", "profile review includes advanced local records");
  assertIncludes(indexHtml, 'id="dataConsoleJson"', "data/model console exposes recent event JSON");
  assertIncludes(indexHtml, 'id="exportJsonBtn"', "data/model console can export JSON");
  assertIncludes(indexHtml, 'id="exportCsvBtn"', "data/model console can export CSV");
  assertIncludes(indexHtml, "function appendDataEvent", "local data event stream is implemented");
  assertIncludes(indexHtml, "daily_assessment", "local events include assessment type");
  assertIncludes(indexHtml, "focus_session", "local events include focus-session type");
  assertIncludes(indexHtml, "recovery_event", "local events include recovery type");
  assertIncludes(indexHtml, "reminder_event", "local events include reminder type");
  assertIncludes(indexHtml, 'id="profileTrendSvg"', "profile review exposes trend svg");
  assertIncludes(indexHtml, "近 30 天状态趋势", "profile review includes long-term trend window");
  assertIncludes(indexHtml, 'id="weeklyKline"', "profile review exposes weekly k-line container");
  assertIncludes(indexHtml, "function renderProfileTrend", "profile review renders visual trend");
  assertIncludes(indexHtml, "function renderWeeklyKline", "profile review renders weekly k-line");
  assertIncludes(indexHtml, "HISTORY_ARCHIVE_LIMIT = 365", "profile review keeps long-term local archive");
  assertIncludes(indexHtml, "history-spark", "history records include sparkline bars");
  assertIncludes(indexHtml, "你用 EyeFlow 一年了。第一天你说眼睛", "one-year memory line");

  console.log("[smoke:retention] PASSED. First-day, third-day, and seventh-day retention moments are guarded.");
}

try {
  main();
} catch (error) {
  console.error("[smoke:retention] FAILED.", error.message);
  process.exitCode = 1;
}
