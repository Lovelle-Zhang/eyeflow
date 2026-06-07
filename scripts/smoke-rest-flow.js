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

function parseInlineScripts(relativePath) {
  const html = read(relativePath);
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
  scripts.forEach((match, index) => {
    new vm.Script(match[1], { filename: `${relativePath}#rest-script${index + 1}` });
  });
  return scripts.length;
}

function main() {
  const indexHtml = read("index.html");
  const mainJs = read("main.js");
  const companionHtml = read("companion.html");

  const inlineCount = parseInlineScripts("index.html");

  assertIncludes(indexHtml, 'id="restSessionBtn"', "session rest button");
  assertIncludes(indexHtml, 'id="takeReminderBreakBtn"', "pending reminder rest button");
  assertIncludes(indexHtml, 'id="finishBreakBtn"', "finish rest button");
  assertIncludes(indexHtml, 'data-recovery-feedback="better"', "better recovery feedback");
  assertIncludes(indexHtml, 'data-recovery-feedback="same"', "same recovery feedback");
  assertIncludes(indexHtml, 'data-recovery-feedback="tired"', "tired recovery feedback");
  assertIncludes(indexHtml, "点“休息”开始，Mira 会一步步带你。", "rest guide hint copy");

  assertMatches(indexHtml, /els\.restSessionBtn\.addEventListener\("click",\s*\(\)\s*=>\s*showBreak\("manual"\)\);/, "session rest button opens manual break");
  assertMatches(indexHtml, /els\.takeReminderBreakBtn\.addEventListener\("click",\s*\(\)\s*=>\s*showBreak\("scheduled"\)\);/, "pending reminder rest button opens scheduled break");
  assertMatches(indexHtml, /els\.finishBreakBtn\.addEventListener\("click",\s*finishBreak\);/, "finish rest button asks feedback");
  assertMatches(indexHtml, /button\.addEventListener\("click",\s*\(\)\s*=>\s*completeRecovery\(button\.dataset\.recoveryFeedback\)\);/, "feedback buttons complete recovery");
  assertMatches(indexHtml, /function\s+finishBreak\(\)[\s\S]*recoveryFeedback\.hidden\s*=\s*false;/, "finishBreak reveals feedback choices");
  assertMatches(indexHtml, /function\s+completeRecovery\(feedback\)[\s\S]*state\.breaks\s*\+=\s*1;[\s\S]*elapsedSeconds\s*=\s*0;/, "completeRecovery records rest and resets timer");
  assertMatches(indexHtml, /state\.breakTarget\s*=\s*Math\.min\(240,\s*Number\(els\.breakTarget\.value\)\s*\+\s*30\);[\s\S]*showBreak\("extended"\);/, "tired feedback extends rest");

  assertMatches(companionHtml, /currentMood\s*===\s*"rest"[\s\S]*openDashboard\(\{\s*restGuide:\s*true\s*\}\);/, "pink Mira opens rest guide");
  assertMatches(mainJs, /dashboardWindow\.webContents\.send\("dashboard:restGuide"/, "desktop forwards rest guide");
  assertMatches(indexHtml, /onRestGuide\?\.\(\(payload = \{\}\) => \{[\s\S]*focusSessionPanel\(\{\s*target:\s*"rest",\s*guideLevel:\s*level\s*\}\);/, "dashboard rest guide focuses rest button");

  console.log("[smoke:rest] PASSED. Rest guide and recovery flow are wired.");
  console.log(`  - index.html: ${inlineCount} inline script(s) parse OK`);
}

try {
  main();
} catch (error) {
  console.error("[smoke:rest] FAILED.", error.message);
  process.exitCode = 1;
}
