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
  const restFlow = loadRestFlow();

  const inlineCount = parseInlineScripts("index.html");

  assertIncludes(indexHtml, '<script src="eyeflow-rest-flow.js"></script>', "rest flow script include");
  assertIncludes(indexHtml, "window.EyeFlowRestFlow", "dashboard reads rest flow helpers");
  assertIncludes(indexHtml, 'id="restSessionBtn"', "session rest button");
  assertIncludes(indexHtml, 'id="takeReminderBreakBtn"', "pending reminder rest button");
  assertIncludes(indexHtml, 'id="finishBreakBtn"', "finish rest button");
  assertIncludes(indexHtml, 'id="breakMicroTask"', "micro rest task");
  assertIncludes(indexHtml, 'id="breakCompanionLine"', "rest companion line");
  assertIncludes(indexHtml, 'data-break-color="蓝色"', "micro color answer");
  assertIncludes(indexHtml, 'data-recovery-feedback="better"', "better recovery feedback");
  assertIncludes(indexHtml, 'data-recovery-feedback="same"', "same recovery feedback");
  assertIncludes(indexHtml, 'data-recovery-feedback="tired"', "tired recovery feedback");
  assertIncludes(indexHtml, "点“休息”开始，Mira 会一步步带你。", "rest guide hint copy");

  assertMatches(indexHtml, /els\.restSessionBtn\.addEventListener\("click",\s*\(\)\s*=>\s*showBreak\("manual"\)\);/, "session rest button opens manual break");
  assertMatches(indexHtml, /els\.takeReminderBreakBtn\.addEventListener\("click",\s*\(\)\s*=>\s*showBreak\("scheduled"\)\);/, "pending reminder rest button opens scheduled break");
  assertMatches(indexHtml, /els\.finishBreakBtn\.addEventListener\("click",\s*finishBreak\);/, "finish rest button asks feedback");
  assertMatches(indexHtml, /function\s+showBreak\(reason\)[\s\S]*restBreakView\(\{/, "showBreak uses extracted rest view");
  assertMatches(indexHtml, /function\s+finishBreak\(\)[\s\S]*recoveryFeedbackView\(\)/, "finishBreak uses extracted feedback view");
  assertMatches(indexHtml, /function\s+answerBreakMicroTask\(color\)[\s\S]*breakMicroReplyView\(\{/, "micro task uses extracted reply view");
  assertMatches(indexHtml, /button\.addEventListener\("click",\s*\(\)\s*=>\s*completeRecovery\(button\.dataset\.recoveryFeedback\)\);/, "feedback buttons complete recovery");
  assertMatches(indexHtml, /function\s+completeRecovery\(feedback\)[\s\S]*state\.breaks\s*\+=\s*1;[\s\S]*elapsedSeconds\s*=\s*0;/, "completeRecovery records rest and resets timer");
  assertMatches(indexHtml, /function\s+completeRecovery\(feedback\)[\s\S]*recoveryCompletionPlan\(\{[\s\S]*showBreak\("extended"\);/, "completeRecovery uses extracted recovery plan");

  assertEqual(restFlow.restBreakView({ reason: "manual", companionLine: "慢慢来。" }).showMicroTask, true, "manual rest shows micro task");
  assertEqual(restFlow.restBreakView({ reason: "force" }).showForceTask, true, "force rest shows guided task");
  assertEqual(restFlow.restBreakView({ reason: "force" }).showFinishButton, false, "force rest hides ordinary finish button");
  assertEqual(restFlow.recoveryFeedbackView().showRecoveryFeedback, true, "feedback view reveals choices");
  assertEqual(restFlow.breakMicroReplyView({ color: "蓝色" }).reply, "Mira：收到，蓝色就够了。眼睛已经离开屏幕了。", "micro reply copy");
  assertEqual(restFlow.recoveryCompletionPlan({ feedback: "better" }).symptomRelief, 2, "better feedback relief");
  assertEqual(restFlow.recoveryCompletionPlan({ feedback: "same", focusTarget: 20 }).nextFocusTarget, 15, "same feedback shortens focus");
  assertEqual(restFlow.recoveryCompletionPlan({ feedback: "tired", breakTarget: 210 }).nextBreakTarget, 240, "tired feedback extends rest cap");

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
