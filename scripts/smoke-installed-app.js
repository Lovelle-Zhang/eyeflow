#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const asar = require("@electron/asar");

const appPath = process.env.EYEFLOW_INSTALLED_APP || "/Applications/EyeFlow.app";
const asarPath = path.join(appPath, "Contents", "Resources", "app.asar");

function read(relativePath) {
  return asar.extractFile(asarPath, relativePath).toString("utf8");
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
    new vm.Script(match[1], { filename: `${relativePath}#installed-script${index + 1}` });
  });
  return scripts.length;
}

function parseScriptFile(relativePath) {
  new vm.Script(read(relativePath), { filename: `${relativePath}#installed` });
}

function main() {
  if (!fs.existsSync(asarPath)) {
    throw new Error(`Missing installed app archive: ${asarPath}`);
  }

  const indexHtml = read("index.html");
  const coreJs = read("eyeflow-core.js");
  const recoveryDataJs = read("eyeflow-recovery-data.js");
  const sessionFlowJs = read("eyeflow-session-flow.js");
  const restFlowJs = read("eyeflow-rest-flow.js");
  const companionHtml = read("companion.html");
  const companionPanelHtml = read("companion-panel.html");
  const mainJs = read("main.js");
  parseScriptFile("eyeflow-core.js");
  parseScriptFile("eyeflow-recovery-data.js");
  parseScriptFile("eyeflow-session-flow.js");
  parseScriptFile("eyeflow-rest-flow.js");

  const scriptCounts = [
    ["index.html", parseInlineScripts("index.html")],
    ["companion.html", parseInlineScripts("companion.html")],
    ["companion-panel.html", parseInlineScripts("companion-panel.html")]
  ];

  assertIncludes(indexHtml, "Mira 在做什么", "installed onboarding role section");
  assertIncludes(indexHtml, '<script src="eyeflow-core.js"></script>', "installed core script include");
  assertIncludes(indexHtml, '<script src="eyeflow-recovery-data.js"></script>', "installed recovery data script include");
  assertIncludes(indexHtml, '<script src="eyeflow-session-flow.js"></script>', "installed session flow script include");
  assertIncludes(indexHtml, '<script src="eyeflow-rest-flow.js"></script>', "installed rest flow script include");
  assertIncludes(coreJs, "window.EyeFlowCore", "installed core export");
  assertIncludes(coreJs, "computeEyeLoadScore", "installed core eye-load scorer");
  assertIncludes(recoveryDataJs, "window.EyeFlowRecoveryData", "installed recovery data export");
  assertIncludes(recoveryDataJs, "recoveryTaskLibrary", "installed recovery task library");
  assertIncludes(sessionFlowJs, "window.EyeFlowSessionFlow", "installed session flow export");
  assertIncludes(sessionFlowJs, "stageMiraView", "installed stage Mira helper");
  assertIncludes(restFlowJs, "window.EyeFlowRestFlow", "installed rest flow export");
  assertIncludes(restFlowJs, "recoveryCompletionPlan", "installed recovery completion helper");
  assertIncludes(indexHtml, "眼睛状态检查", "installed onboarding check section");
  assertIncludes(indexHtml, "下一步怎么用 Mira", "installed onboarding next section");
  assertIncludes(indexHtml, "保存状态，开始第一轮", "installed onboarding button");
  assertIncludes(indexHtml, "第一轮已开始。Mira 变粉色时点它打开休息指引。", "installed first-round landing");
  assertIncludes(indexHtml, "点“休息”开始，Mira 会一步步带你。", "installed rest guide hint");
  assertMatches(indexHtml, /id="sessionPanel"\s+tabindex="-1"/, "installed session panel focus target");
  assertMatches(indexHtml, /focusSessionPanel\(\{\s*focusTarget:\s*"panel"\s*\}\);/, "installed first-round panel focus");
  assertMatches(indexHtml, /function\s+toggleSession\(\)\s*\{[\s\S]*clearFirstRoundLanding\(\);/, "installed session action clears first-round hint");
  assertMatches(indexHtml, /function\s+showBreak\(reason\)\s*\{[\s\S]*clearFirstRoundLanding\(\);/, "installed break action clears first-round hint");

  assertMatches(companionHtml, /currentMood\s*===\s*"rest"[\s\S]*openDashboard\(\{\s*restGuide:\s*true\s*\}\);/, "installed pink Mira click opens rest guide");
  assertIncludes(companionHtml, "点我会打开休息指引。", "installed pink Mira copy");
  assertIncludes(companionPanelHtml, "anchor-top", "installed panel top anchor");
  assertIncludes(companionPanelHtml, "anchor-bottom", "installed panel bottom anchor");
  assertMatches(mainJs, /dashboardWindow\.webContents\.send\("dashboard:restGuide"/, "installed dashboard rest-guide IPC");
  assertMatches(mainJs, /fs\.mkdirSync\(debugCaptureDir,\s*\{\s*recursive:\s*true\s*\}\);/, "installed debug capture creates directory");

  console.log("[smoke:installed] PASSED. Installed EyeFlow.app contains the current Mira onboarding flow.");
  console.log(`  - app: ${appPath}`);
  console.log("  - eyeflow-core.js: parse OK");
  console.log("  - eyeflow-recovery-data.js: parse OK");
  console.log("  - eyeflow-session-flow.js: parse OK");
  console.log("  - eyeflow-rest-flow.js: parse OK");
  scriptCounts.forEach(([file, count]) => {
    console.log(`  - ${file}: ${count} inline script(s) parse OK`);
  });
}

try {
  main();
} catch (error) {
  console.error("[smoke:installed] FAILED.", error.message);
  process.exitCode = 1;
}
