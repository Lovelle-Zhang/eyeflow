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

function assertNotMatches(source, pattern, label) {
  if (pattern.test(source)) {
    throw new Error(`${label}: unexpected pattern found: ${pattern}`);
  }
}

function loadCore() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  new vm.Script(read("eyeflow-core.js"), { filename: "eyeflow-core.js" }).runInContext(sandbox);
  if (!sandbox.window.EyeFlowCore) {
    throw new Error("core export missing: window.EyeFlowCore");
  }
  return sandbox.window.EyeFlowCore;
}

function main() {
  const indexHtml = read("index.html");
  const packageJson = JSON.parse(read("package.json"));
  const core = loadCore();

  assertMatches(
    indexHtml,
    /<script src="eyeflow-core\.js"><\/script>\s*<script src="eyeflow-recovery-data\.js"><\/script>\s*<script src="eyeflow-session-flow\.js"><\/script>\s*<script src="eyeflow-rest-flow\.js"><\/script>/,
    "core script loads before recovery, session, rest, and inline app code"
  );
  assertIncludes(indexHtml, "computeEyeLoadScore({", "dashboard score wrapper uses core score");
  assertNotMatches(indexHtml, /function\s+estimateInitialLoad\(/, "initial load is extracted from index.html");
  assertNotMatches(indexHtml, /function\s+initialRhythmForLoad\(/, "initial rhythm is extracted from index.html");
  assertNotMatches(indexHtml, /function\s+classifyLoad\(/, "load classifier is extracted from index.html");
  if (!packageJson.build?.files?.includes("eyeflow-core.js")) {
    throw new Error("package build files: missing eyeflow-core.js");
  }

  assertEqual(core.estimateInitialLoad({ dryness: 2, strain: 3, blur: 1, light: 1 }), 27, "initial assessment score");
  assertEqual(
    core.computeEyeLoadScore({
      symptoms: { dryness: 2, strain: 3, blur: 1, light: 1 },
      elapsedSeconds: 20 * 60,
      breaks: 1
    }),
    50,
    "running eye-load score"
  );
  assertEqual(
    core.computeEyeLoadScore({
      symptoms: { dryness: 9, strain: 8, blur: 6, light: 5 },
      elapsedSeconds: 2000,
      breaks: 0
    }),
    100,
    "eye-load score clamps at 100"
  );

  assertEqual(core.classifyLoad(16), "舒适区", "comfort band");
  assertEqual(core.classifyLoad(60), "中等负荷", "medium band");
  assertEqual(core.classifyLoad(80), "高负荷", "high band");

  assertEqual(core.initialRhythmForLoad(30).focus, 50, "comfort focus minutes");
  assertEqual(core.initialRhythmForLoad(30).rest, 120, "comfort rest seconds");
  assertEqual(core.initialRhythmForLoad(60).focus, 20, "medium focus minutes");
  assertEqual(core.initialRhythmForLoad(60).rest, 150, "medium rest seconds");
  assertEqual(core.initialRhythmForLoad(80).focus, 15, "high focus minutes");
  assertEqual(core.initialRhythmForLoad(80).rest, 180, "high rest seconds");

  assertEqual(core.intensityLabel("quiet"), "L1 安静", "quiet intensity label");
  assertEqual(core.intensityLabel("force"), "L4 强制爱", "force intensity label");
  assertIncludes(core.modeActionCopy("clear"), "明确介入", "clear mode action copy");

  console.log("[smoke:core] PASSED. EyeFlow core scoring and first-round rhythm are stable.");
}

try {
  main();
} catch (error) {
  console.error("[smoke:core] FAILED.", error.message);
  process.exitCode = 1;
}
