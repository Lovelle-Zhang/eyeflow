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

function assertScript(relativePath) {
  new vm.Script(read(relativePath), { filename: relativePath });
}

function main() {
  const pkg = JSON.parse(read("package.json"));
  const mainJs = read("main.js");
  const captureJs = read("scripts/current-visual-capture.js");
  const packagedSmokeJs = read("scripts/smoke-packaged-app.js");
  const verifyJs = read("scripts/verify.js");

  assertScript("scripts/current-visual-capture.js");
  assertScript("scripts/smoke-current-visual-capture.js");

  if (pkg.scripts?.["capture:current"] !== "node scripts/current-visual-capture.js") {
    throw new Error("package script capture:current is missing or changed");
  }
  if (pkg.scripts?.["smoke:current-capture"] !== "node scripts/smoke-current-visual-capture.js") {
    throw new Error("package script smoke:current-capture is missing or changed");
  }

  [
    "todayView",
    "today-session",
    "today-session-settings",
    "today-auto-tracking",
    "rhythmView",
    "settings-ordinary",
    "profileView",
    "profile-share-card",
    "onboarding-active",
    "break-lock-active",
    "force-return"
  ].forEach((target) => {
    assertIncludes(mainJs, target, `main current capture target ${target}`);
    assertIncludes(captureJs, target, `capture CLI target ${target}`);
  });

  [
    "filename",
    "timestamp",
    "requestedView",
    "visibleView",
    "pageTitle",
    "activeNav",
    "onboardingVisible",
    "mainTextSnapshot",
    "captureReason",
    "captureState",
    "readinessActionButtonMetrics",
    "stateMatchesRequest"
  ].forEach((field) => {
    assertIncludes(mainJs, field, `main capture metadata field ${field}`);
    assertIncludes(captureJs, field, `capture CLI validates metadata field ${field}`);
    assertIncludes(packagedSmokeJs, field, `packaged smoke gates metadata field ${field}`);
  });

  assertIncludes(mainJs, "webContents.capturePage()", "current visual capture uses Electron capturePage");
  assertIncludes(mainJs, "currentCaptureMismatches", "main capture records state mismatch details");
  assertIncludes(mainJs, "expectedEqualReadinessActionButtons", "main capture can gate equal settings action button sizes");
  assertIncludes(mainJs, 'requiredText: ["这一轮进行中", "Mira 已开始计时"]', "default Today capture must fail if the start card returns");
  assertIncludes(mainJs, "readinessActionButtonMetrics", "main capture records settings action button dimensions");
  assertIncludes(mainJs, "logCurrentCaptureBasis", "main capture prints scoring basis");
  assertIncludes(mainJs, "[EyeFlow:current-capture] 本次评分基于：", "main capture prints required basis header");
  assertIncludes(captureJs, "本次评分基于：", "capture CLI prints required basis header");
  assertIncludes(captureJs, "EYEFLOW_CURRENT_CAPTURE", "capture CLI launches explicit current target");
  assertIncludes(mainJs, "EYEFLOW_DEBUG_ACCESSIBILITY_TRUSTED", "main can fixture ordinary settings capture without changing system permissions");
  assertIncludes(captureJs, "EYEFLOW_DEBUG_ACCESSIBILITY_TRUSTED", "capture CLI can request ordinary settings state");
  assertIncludes(captureJs, "EYEFLOW_DEBUG_CAPTURE_DIR", "capture CLI controls capture directory");
  assertIncludes(captureJs, "EYEFLOW_USER_DATA_DIR", "capture CLI isolates local app data");
  assertIncludes(mainJs, "app.setPath(\"userData\", debugUserDataDir)", "main routes debug capture storage away from production user data");
  assertIncludes(mainJs, "const previewSeconds = debugCapture ? 10 : 15;", "debug force preview leaves enough time for break-lock captures");
  assertIncludes(captureJs, "validateMetadata", "capture CLI refuses mismatched screenshots");
  assertIncludes(captureJs, "stateMatchesRequest !== true", "capture CLI rejects mismatched current state");
  assertIncludes(packagedSmokeJs, "assertScreenshotStateGate", "packaged smoke has screenshot state gate");
  assertIncludes(packagedSmokeJs, "stateMatchesRequest !== true", "packaged smoke rejects mismatched captures");
  assertIncludes(packagedSmokeJs, "captureState", "packaged smoke validates capture state");
  assertIncludes(packagedSmokeJs, "eyeflow-break-lock-active.png", "packaged smoke covers break-lock active capture");
  assertIncludes(packagedSmokeJs, "eyeflow-force-return.png", "packaged smoke covers force-return capture");
  assertMatches(verifyJs, /\["Check current visual capture gate",\s*"smoke:current-capture"\]/, "verify includes current visual capture gate");

  console.log("[smoke:current-capture] PASSED. Current visual capture metadata and state gates are guarded.");
}

try {
  main();
} catch (error) {
  console.error("[smoke:current-capture] FAILED.", error.message);
  process.exitCode = 1;
}
