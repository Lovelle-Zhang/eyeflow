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
  const companionHtml = read("companion.html");
  const companionPanelHtml = read("companion-panel.html");
  const mainJs = read("main.js");
  parseScriptFile("eyeflow-core.js");
  parseScriptFile("eyeflow-recovery-data.js");

  const scriptCounts = [
    ["index.html", parseInlineScripts("index.html")],
    ["companion.html", parseInlineScripts("companion.html")],
    ["companion-panel.html", parseInlineScripts("companion-panel.html")]
  ];

  assertIncludes(indexHtml, "Mira 在做什么", "onboarding role section");
  assertIncludes(indexHtml, '<script src="eyeflow-core.js"></script>', "core script include");
  assertIncludes(indexHtml, '<script src="eyeflow-recovery-data.js"></script>', "recovery data script include");
  assertIncludes(coreJs, "window.EyeFlowCore", "core export");
  assertIncludes(coreJs, "computeEyeLoadScore", "core eye-load scorer");
  assertIncludes(recoveryDataJs, "window.EyeFlowRecoveryData", "recovery data export");
  assertIncludes(recoveryDataJs, "recoveryTaskLibrary", "recovery task library");
  assertIncludes(indexHtml, "今天眼睛怎么样？", "onboarding asks like a real check-in");
  assertIncludes(indexHtml, "像随口回答一句", "onboarding avoids form-like copy");
  assertIncludes(coreJs, "50 分钟专注", "comfort rhythm starts at 50 minutes");
  assertIncludes(indexHtml, "眼睛状态检查", "onboarding check section");
  assertIncludes(indexHtml, "下一步怎么用 Mira", "onboarding next section");
  assertIncludes(indexHtml, "保存状态，开始第一轮", "onboarding completion button");
  assertIncludes(indexHtml, "开始专注；Mira 变粉色时点它打开休息指引。", "onboarding next-step copy");
  assertIncludes(indexHtml, "第一轮已开始。Mira 变粉色时点它打开休息指引。", "first-round landing hint");
  assertMatches(indexHtml, /\.mira-intro \.state-label\s*\{[\s\S]*color:\s*#17382f;[\s\S]*background:\s*rgba\(236,\s*255,\s*246,\s*0\.95\);[\s\S]*font-weight:\s*780;/, "onboarding status pill keeps readable contrast");
  assertMatches(indexHtml, /\.onboarding-actions\s*\{[\s\S]*position:\s*sticky;[\s\S]*bottom:\s*-16px;/, "onboarding primary actions stay visible");
  assertMatches(indexHtml, /class="onboarding-permission-note"[\s\S]*class="actions onboarding-actions"/, "onboarding permission note stays before sticky actions");
  assertMatches(indexHtml, /id="sessionPanel"\s+tabindex="-1"/, "session panel can receive first-round focus");
  assertMatches(indexHtml, /function\s+completeInitialAssessment\(\)[\s\S]*showFirstRoundLanding\(\);/, "assessment completion lands on first round");
  assertMatches(indexHtml, /function\s+showFirstRoundLanding\(\)[\s\S]*els\.sessionStartHint\.hidden\s*=\s*false;[\s\S]*focusSessionPanel\(\{\s*focusTarget:\s*"panel"\s*\}\);/, "first-round hint focuses session panel");
  assertMatches(indexHtml, /options\.focusTarget\s*===\s*"panel"[\s\S]*\?\s*els\.sessionPanel/, "focus helper can target session panel");
  assertMatches(indexHtml, /function\s+focusSessionPanel\(options = \{\}\)[\s\S]*clearFirstRoundLanding\(\);[\s\S]*els\.restGuideHint\.hidden\s*=\s*false;/, "rest guide clears first-round hint");
  assertMatches(indexHtml, /function\s+toggleSession\(\)\s*\{[\s\S]*clearFirstRoundLanding\(\);/, "manual session controls clear first-round hint");
  assertMatches(indexHtml, /function\s+showBreak\(reason\)\s*\{[\s\S]*clearFirstRoundLanding\(\);/, "break overlay clears first-round hint");

  assertMatches(companionHtml, /currentMood\s*===\s*"rest"[\s\S]*openDashboard\(\{\s*restGuide:\s*true\s*\}\);/, "pink Mira click opens rest guide");
  assertIncludes(companionHtml, "点我会打开休息指引。", "pink Mira hover message");
  assertMatches(mainJs, /function\s+showDashboard\(options = \{\}\)[\s\S]*options\?\.restGuide[\s\S]*sendDashboardRestGuide/, "main process forwards rest guide request");
  assertMatches(mainJs, /dashboardWindow\.webContents\.send\("dashboard:restGuide"/, "dashboard rest-guide IPC");

  assertIncludes(companionPanelHtml, "anchor-top", "panel top anchor class");
  assertIncludes(companionPanelHtml, "anchor-bottom", "panel bottom anchor class");
  assertMatches(mainJs, /anchorY:\s*latestPanelAnchorY/, "main process sends panel vertical anchor");

  console.log("[smoke:onboarding] PASSED. First-run Mira flow is wired.");
  console.log("  - eyeflow-core.js: parse OK");
  console.log("  - eyeflow-recovery-data.js: parse OK");
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
