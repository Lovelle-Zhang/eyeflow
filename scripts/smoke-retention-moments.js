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

function main() {
  const indexHtml = read("index.html");
  const coreJs = read("eyeflow-core.js");
  new vm.Script(coreJs, { filename: "eyeflow-core.js" });

  assertIncludes(indexHtml, "今天眼睛怎么样？", "first-day check-in title");
  assertIncludes(indexHtml, "选此刻最明显的感觉就行，不用很准。", "first-day low-friction check copy");
  assertIncludes(indexHtml, "干涩、酸胀、模糊、畏光", "first-day symptom language");
  assertIncludes(coreJs, "首轮按 50 分钟专注开始", "first-day comfort rhythm");
  assertMatches(indexHtml, /onboardingPlanRhythm\.textContent\s*=\s*load < 48[\s\S]*每两小时安排一次短休息/, "first-day 50-minute plan mentions blink and short rests");

  assertIncludes(indexHtml, "看到 Mira 变色时先眨几下，不用停下。", "first reminder is light but noticeable");
  assertIncludes(indexHtml, "Mira 会借这个空隙提醒远眺", "natural-break reminder timing");
  assertIncludes(indexHtml, "不会突然打断", "reminder does not feel like a popup interruption");

  assertIncludes(indexHtml, "第 3 天开始你可能会自然忽略 Mira。", "third-day retention cliff copy");
  assertIncludes(indexHtml, "窗口切换、键鼠停顿这类自然断点", "third-day alternate presence strategy");

  assertIncludes(indexHtml, "这 7 天 Mira 帮你保留了", "seventh-day value proof");
  assertIncludes(indexHtml, "下周继续少打扰", "seventh-day forward plan");
  assertIncludes(indexHtml, "次提醒被你接住", "weekly handled-reminder proof");

  console.log("[smoke:retention] PASSED. First-day, third-day, and seventh-day retention moments are guarded.");
}

try {
  main();
} catch (error) {
  console.error("[smoke:retention] FAILED.", error.message);
  process.exitCode = 1;
}
