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
    sessionFlow.sessionControlView({ isRunning: true, restDue: true, restSeconds: 150 }).restText,
    "开始 150 秒休息",
    "running rest-due button"
  );
  assertEqual(
    sessionFlow.sessionControlView({ assessedToday: false }).startText,
    "先校准今天",
    "unassessed start button"
  );
  assertEqual(
    sessionFlow.sessionControlView({ assessedToday: true, autoTracking: true }).startText,
    "开始手动专注",
    "auto-tracking start button"
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
