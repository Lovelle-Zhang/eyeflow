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

function assertPackageScript(pkg, name, expected) {
  const actual = pkg.scripts?.[name];
  if (actual !== expected) {
    throw new Error(`package script ${name}: expected "${expected}", got "${actual || "missing"}"`);
  }
}

function assertBuildFile(pkg, relativePath) {
  if (!pkg.build?.files?.includes(relativePath)) {
    throw new Error(`package build files: missing ${relativePath}`);
  }
}

function main() {
  const pkg = JSON.parse(read("package.json"));
  const verifyJs = read("scripts/verify.js");
  const refreshLocalJs = read("scripts/refresh-local-app.js");
  const sessionSmokeJs = read("scripts/smoke-session-flow.js");
  const restSmokeJs = read("scripts/smoke-rest-flow.js");
  const installLocalJs = read("scripts/install-local-app.js");
  const installedSmokeJs = read("scripts/smoke-installed-app.js");
  const packagedSmokeJs = read("scripts/smoke-packaged-app.js");
  const launchPreflightJs = read("scripts/launch-preflight.js");

  [
    "scripts/smoke-core.js",
    "scripts/smoke-session-flow.js",
    "scripts/smoke-onboarding-flow.js",
    "scripts/smoke-retention-moments.js",
    "scripts/smoke-rest-flow.js",
    "scripts/verify.js",
    "scripts/refresh-local-app.js",
    "scripts/install-local-app.js",
    "scripts/smoke-installed-app.js",
    "scripts/smoke-packaged-app.js",
    "scripts/launch-preflight.js"
  ].forEach(assertScript);
  assertScript("eyeflow-session-flow.js");
  assertScript("eyeflow-rest-flow.js");

  assertPackageScript(pkg, "build:app", "electron-builder --mac dir --publish never");
  assertPackageScript(pkg, "install:local", "node scripts/install-local-app.js");
  assertPackageScript(pkg, "refresh:local", "node scripts/refresh-local-app.js");
  assertPackageScript(pkg, "verify", "node scripts/verify.js");
  assertPackageScript(pkg, "smoke:core", "node scripts/smoke-core.js");
  assertPackageScript(pkg, "smoke:session", "node scripts/smoke-session-flow.js");
  assertPackageScript(pkg, "smoke:onboarding", "node scripts/smoke-onboarding-flow.js");
  assertPackageScript(pkg, "smoke:retention", "node scripts/smoke-retention-moments.js");
  assertPackageScript(pkg, "smoke:rest", "node scripts/smoke-rest-flow.js");
  assertPackageScript(pkg, "smoke:release", "node scripts/smoke-release-flow.js");
  assertPackageScript(pkg, "smoke:installed", "node scripts/smoke-installed-app.js");
  assertPackageScript(pkg, "smoke:app", "node scripts/smoke-packaged-app.js");
  assertPackageScript(pkg, "launch:preflight", "node scripts/launch-preflight.js");

  [
    "index.html",
    "eyeflow-core.js",
    "eyeflow-recovery-data.js",
    "eyeflow-session-flow.js",
    "eyeflow-rest-flow.js",
    "companion.html",
    "companion-panel.html",
    "break-lock.html",
    "main.js",
    "preload.js",
    "package.json",
    "assets/icon.icns"
  ].forEach((relativePath) => assertBuildFile(pkg, relativePath));

  assertMatches(refreshLocalJs, /run\("Check core scoring logic",\s*"npm",\s*\["run",\s*"smoke:core"\]/, "refresh checks core smoke");
  assertMatches(refreshLocalJs, /run\("Check session UI state",\s*"npm",\s*\["run",\s*"smoke:session"\]/, "refresh checks session smoke");
  assertMatches(refreshLocalJs, /run\("Check rest recovery flow",\s*"npm",\s*\["run",\s*"smoke:rest"\]/, "refresh checks rest smoke");
  assertMatches(refreshLocalJs, /run\("Check source onboarding flow",\s*"npm",\s*\["run",\s*"smoke:onboarding"\]/, "refresh checks onboarding smoke");
  assertMatches(refreshLocalJs, /run\("Check retention moments",\s*"npm",\s*\["run",\s*"smoke:retention"\]/, "refresh checks retention smoke");
  assertMatches(refreshLocalJs, /run\("Check release wiring",\s*"npm",\s*\["run",\s*"smoke:release"\]/, "refresh checks release wiring");
  assertMatches(refreshLocalJs, /run\("Build local app bundle",\s*"npm",\s*\["run",\s*"build:app"\]/, "refresh builds app bundle");
  assertMatches(refreshLocalJs, /run\("Install \/Applications\/EyeFlow\.app",\s*"npm",\s*\["run",\s*"install:local"\]/, "refresh installs local app");
  assertMatches(refreshLocalJs, /run\("Check installed app bundle",\s*"npm",\s*\["run",\s*"smoke:installed"\]/, "refresh checks installed app");

  assertMatches(verifyJs, /\["Check core scoring logic",\s*"smoke:core"\]/, "verify checks core smoke");
  assertMatches(verifyJs, /\["Check session UI state",\s*"smoke:session"\]/, "verify checks session smoke");
  assertMatches(verifyJs, /\["Check rest recovery flow",\s*"smoke:rest"\]/, "verify checks rest smoke");
  assertMatches(verifyJs, /\["Check source onboarding flow",\s*"smoke:onboarding"\]/, "verify checks onboarding smoke");
  assertMatches(verifyJs, /\["Check retention moments",\s*"smoke:retention"\]/, "verify checks retention smoke");
  assertMatches(verifyJs, /\["Check release wiring",\s*"smoke:release"\]/, "verify checks release wiring");

  assertIncludes(installLocalJs, "/Applications/EyeFlow.app", "local install target");
  assertIncludes(sessionSmokeJs, "stageMiraView({ load: 80 }).mood", "session smoke guards high-load Mira mood");
  assertIncludes(restSmokeJs, "recoveryCompletionPlan", "rest smoke guards completion plan");
  assertMatches(installLocalJs, /path\.join\(root,\s*"dist",\s*"mac",\s*"EyeFlow\.app"\)/, "local install source");
  assertMatches(installLocalJs, /spawnSync\("ps",\s*\["-axo",\s*"command"\]/, "installer detects running app without pgrep");

  assertIncludes(installedSmokeJs, "eyeflow-core.js", "installed smoke checks core file");
  assertIncludes(installedSmokeJs, "eyeflow-recovery-data.js", "installed smoke checks recovery data file");
  assertIncludes(installedSmokeJs, "eyeflow-session-flow.js", "installed smoke checks session flow file");
  assertIncludes(installedSmokeJs, "eyeflow-rest-flow.js", "installed smoke checks rest flow file");
  assertIncludes(installedSmokeJs, "点我会打开休息指引。", "installed smoke checks pink Mira copy");

  [
    "eyeflow-dashboard-capture.png",
    "eyeflow-dashboard-rhythmView-capture.png",
    "eyeflow-dashboard-rest-guide-capture.png",
    "eyeflow-companion-capture.png",
    "eyeflow-companion-panel-capture.png",
    "eyeflow-break-lock-capture.png",
    "eyeflow-break-lock-complete-capture.png",
    "eyeflow-dashboard-force-return-capture.png"
  ].forEach((captureName) => assertIncludes(packagedSmokeJs, captureName, `packaged smoke capture ${captureName}`));
  assertIncludes(packagedSmokeJs, "voicePreserved", "packaged smoke observes force voice preservation");

  assertIncludes(launchPreflightJs, "Developer ID signature and hardened runtime", "preflight checks signing");
  assertIncludes(launchPreflightJs, "Gatekeeper assessment passes", "preflight checks Gatekeeper");
  assertIncludes(launchPreflightJs, "Release staging is clean", "preflight checks release staging");
  assertIncludes(launchPreflightJs, "Public app UI has no private-test wording", "preflight checks public UI wording");
  assertIncludes(launchPreflightJs, "docs/PRIVACY.md", "preflight requires privacy doc");

  console.log("[smoke:release] PASSED. Local install, packaged smoke, and launch preflight wiring are guarded.");
}

try {
  main();
} catch (error) {
  console.error("[smoke:release] FAILED.", error.message);
  process.exitCode = 1;
}
