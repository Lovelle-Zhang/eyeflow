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

  assertIncludes(indexHtml, "今天眼睛怎么样？", "first-day check-in title");
  assertIncludes(indexHtml, "选此刻最明显的感觉就行，不用很准。", "first-day low-friction check copy");
  assertIncludes(indexHtml, "干涩、酸胀、模糊、畏光", "first-day symptom language");
  assertIncludes(coreJs, "首轮按 50 分钟专注开始", "first-day comfort rhythm");
  assertMatches(indexHtml, /onboardingPlanRhythm\.textContent\s*=\s*load < 48[\s\S]*每两小时安排一次短休息/, "first-day 50-minute plan mentions blink and short rests");
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
  assertIncludes(indexHtml, "看一下窗外最远的那个东西", "rest uses a tiny task");
  assertIncludes(indexHtml, "告诉 Mira 它大概是什么颜色", "rest task asks for a small answer");
  assertEqual(restFlow.breakMicroReplyView({ color: "蓝色" }).reply, "Mira：收到，蓝色就够了。眼睛已经离开屏幕了。", "rest task gives a short reply");
  assertIncludes(recoveryDataJs, "restCompanionLines", "rest companion line library");
  assertEqual(recoveryData.restCompanionLines.length, 20, "rest companion line count");
  assertIncludes(recoveryDataJs, "Mira 在这里守时间。", "rest companion line");
  assertIncludes(recoveryDataJs, "好了，回来时别急着盯屏幕。", "rest return line");
  assertIncludes(indexHtml, 'id="breakCompanionLine"', "rest companion line appears in rest overlay");
  assertIncludes(recoveryDataJs, "relationshipLines", "relationship line library");
  assertIncludes(recoveryDataJs, "你已经连续{days}没有跳过休息了。", "gentle streak line");
  assertIncludes(recoveryDataJs, "回来了。今天眼睛怎么样？", "returning user line");
  assertIncludes(recoveryDataJs, "你的节奏还在，不用补。", "no catch-up pressure line");
  assertIncludes(indexHtml, "function gentleStreakDays", "gentle streak calculation");
  assertIncludes(indexHtml, "function returningLine", "returning user dialogue");
  assertIncludes(indexHtml, "returningGapDays", "returning state records gap without blame");
  assertIncludes(indexHtml, "gentleStreakLine()", "completion can surface gentle streak");
  assertNotMatches(indexHtml + recoveryDataJs, /火焰|streak freeze|断签|补签/, "no anxiety streak language");

  assertIncludes(indexHtml, "第 3 天开始你可能会自然忽略 Mira。", "third-day retention cliff copy");
  assertIncludes(indexHtml, "窗口切换、键鼠停顿这类自然断点", "third-day alternate presence strategy");
  assertIncludes(indexHtml, "今天先不说休息的事了。你看起来在赶什么，专注完再说。", "occasional silence copy");

  assertIncludes(indexHtml, "这 7 天 Mira 帮你保留了", "seventh-day value proof");
  assertIncludes(indexHtml, "下周继续少打扰", "seventh-day forward plan");
  assertIncludes(indexHtml, "次提醒被你接住", "weekly handled-reminder proof");
  assertIncludes(indexHtml, "你用 EyeFlow 一年了。第一天你说眼睛", "one-year memory line");

  console.log("[smoke:retention] PASSED. First-day, third-day, and seventh-day retention moments are guarded.");
}

try {
  main();
} catch (error) {
  console.error("[smoke:retention] FAILED.", error.message);
  process.exitCode = 1;
}
