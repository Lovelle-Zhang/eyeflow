#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const visualSourceFiles = [
  "index.html",
  "companion.html",
  "break-lock.html"
];
const styleSignalPattern = /href="\.\/eyeflow-design-system\.css"|stroke-width="2"|font-size:\s*(?!var\()[0-9]|gap:\s*[0-9]|padding:\s*[0-9]|border-radius:\s*[0-9]/g;
const tokenPattern = /--ef-/g;
const designSystemLink = 'href="./eyeflow-design-system.css"';
const styleDebtCeilings = {
  total: 150,
  index: 100,
  tokenFloor: 950
};

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

function countMatches(source, pattern) {
  const matches = source.match(pattern);
  return matches ? matches.length : 0;
}

function assertVisualSourceGate(sources) {
  const styleCounts = Object.fromEntries(visualSourceFiles.map((relativePath) => [
    relativePath,
    countMatches(sources[relativePath], styleSignalPattern)
  ]));
  const totalStyleSignals = Object.values(styleCounts).reduce((sum, count) => sum + count, 0);
  const tokenCounts = Object.fromEntries(visualSourceFiles.map((relativePath) => [
    relativePath,
    countMatches(sources[relativePath], tokenPattern)
  ]));
  const totalTokenRefs = Object.values(tokenCounts).reduce((sum, count) => sum + count, 0);
  const missingLinks = visualSourceFiles.filter((relativePath) => !sources[relativePath].includes(designSystemLink));
  const heavyStrokeFiles = visualSourceFiles.filter((relativePath) => sources[relativePath].includes('stroke-width="2"'));

  if (missingLinks.length) {
    throw new Error(`visual source gate: missing design-system stylesheet link in ${missingLinks.join(", ")}`);
  }
  if (heavyStrokeFiles.length) {
    throw new Error(`visual source gate: stroke-width="2" returned in ${heavyStrokeFiles.join(", ")}`);
  }
  if (styleCounts["index.html"] >= styleDebtCeilings.index) {
    throw new Error(`visual source gate: index.html style signals ${styleCounts["index.html"]} must stay below ${styleDebtCeilings.index}`);
  }
  if (totalStyleSignals >= styleDebtCeilings.total) {
    throw new Error(`visual source gate: total style signals ${totalStyleSignals} must stay below ${styleDebtCeilings.total}`);
  }
  if (totalTokenRefs <= styleDebtCeilings.tokenFloor) {
    throw new Error(`visual source gate: total --ef-* references ${totalTokenRefs} must stay above ${styleDebtCeilings.tokenFloor}`);
  }

  return { styleCounts, totalStyleSignals, tokenCounts, totalTokenRefs };
}

function main() {
  const pkg = JSON.parse(read("package.json"));
  const visualSources = Object.fromEntries(visualSourceFiles.map((relativePath) => [relativePath, read(relativePath)]));
  const verifyJs = read("scripts/verify.js");
  const refreshLocalJs = read("scripts/refresh-local-app.js");
  const sessionSmokeJs = read("scripts/smoke-session-flow.js");
  const restSmokeJs = read("scripts/smoke-rest-flow.js");
  const installLocalJs = read("scripts/install-local-app.js");
  const installedSmokeJs = read("scripts/smoke-installed-app.js");
  const packagedSmokeJs = read("scripts/smoke-packaged-app.js");
  const currentCaptureJs = read("scripts/current-visual-capture.js");
  const currentCaptureSmokeJs = read("scripts/smoke-current-visual-capture.js");
  const visualSmokeJs = read("scripts/smoke-visual-utils.js");
  const launchPreflightJs = read("scripts/launch-preflight.js");
  const mainJs = read("main.js");
  const visualGate = assertVisualSourceGate(visualSources);

  [
    "scripts/smoke-core.js",
    "scripts/smoke-session-flow.js",
    "scripts/smoke-current-visual-capture.js",
    "scripts/smoke-onboarding-flow.js",
    "scripts/smoke-retention-moments.js",
    "scripts/smoke-rest-flow.js",
    "scripts/verify.js",
    "scripts/refresh-local-app.js",
    "scripts/install-local-app.js",
    "scripts/smoke-installed-app.js",
    "scripts/smoke-packaged-app.js",
    "scripts/smoke-visual-utils.js",
    "scripts/smoke-visual-utils-test.js",
    "scripts/current-visual-capture.js",
    "scripts/release-candidate-check.js",
    "scripts/launch-preflight.js"
  ].forEach(assertScript);
  assertScript("eyeflow-session-flow.js");
  assertScript("eyeflow-rest-flow.js");
  assertScript("eyeflow-ui-utils.js");
  assertScript("eyeflow-metrics.js");
  assertScript("eyeflow-rhythm.js");

  assertPackageScript(pkg, "build:app", "electron-builder --mac dir --publish never");
  assertPackageScript(pkg, "install:local", "node scripts/install-local-app.js");
  assertPackageScript(pkg, "refresh:local", "node scripts/refresh-local-app.js");
  assertPackageScript(pkg, "verify", "node scripts/verify.js");
  assertPackageScript(pkg, "capture:current", "node scripts/current-visual-capture.js");
  assertPackageScript(pkg, "smoke:core", "node scripts/smoke-core.js");
  assertPackageScript(pkg, "smoke:rhythm", "node scripts/smoke-rhythm.js");
  assertPackageScript(pkg, "smoke:metrics", "node scripts/smoke-metrics.js");
  assertPackageScript(pkg, "smoke:readiness", "electron scripts/smoke-readiness-sync.js");
  assertPackageScript(pkg, "smoke:theme", "electron scripts/smoke-theme-sync.js");
  assertPackageScript(pkg, "smoke:session", "node scripts/smoke-session-flow.js");
  assertPackageScript(pkg, "smoke:current-capture", "node scripts/smoke-current-visual-capture.js");
  assertPackageScript(pkg, "smoke:onboarding", "node scripts/smoke-onboarding-flow.js");
  assertPackageScript(pkg, "smoke:retention", "node scripts/smoke-retention-moments.js");
  assertPackageScript(pkg, "smoke:rest", "node scripts/smoke-rest-flow.js");
  assertPackageScript(pkg, "smoke:visual", "node scripts/smoke-visual-utils-test.js");
  assertPackageScript(pkg, "smoke:release", "node scripts/smoke-release-flow.js");
  assertPackageScript(pkg, "smoke:installed", "node scripts/smoke-installed-app.js");
  assertPackageScript(pkg, "smoke:app", "node scripts/smoke-packaged-app.js");
  assertPackageScript(pkg, "release:rc", "node scripts/release-candidate-check.js");
  assertPackageScript(pkg, "release:rc:artifacts", "node scripts/release-candidate-check.js --artifacts");
  assertPackageScript(pkg, "release:public", "node scripts/release-candidate-check.js --artifacts --signed");
  assertPackageScript(pkg, "launch:preflight", "node scripts/launch-preflight.js");

  [
    "index.html",
    "eyeflow-design-system.css",
    "eyeflow-core.js",
    "eyeflow-recovery-data.js",
    "eyeflow-session-flow.js",
    "eyeflow-rest-flow.js",
    "eyeflow-ui-utils.js",
    "eyeflow-metrics.js",
    "companion.html",
    "break-lock.html",
    "main.js",
    "preload.js",
    "package.json",
    "assets/icon.icns"
  ].forEach((relativePath) => assertBuildFile(pkg, relativePath));

  assertMatches(refreshLocalJs, /run\("Check core scoring logic",\s*"npm",\s*\["run",\s*"smoke:core"\]/, "refresh checks core smoke");
  assertMatches(refreshLocalJs, /run\("Check session UI state",\s*"npm",\s*\["run",\s*"smoke:session"\]/, "refresh checks session smoke");
  assertMatches(refreshLocalJs, /run\("Check current visual capture gate",\s*"npm",\s*\["run",\s*"smoke:current-capture"\]/, "refresh checks current visual capture smoke");
  assertMatches(refreshLocalJs, /run\("Check rest recovery flow",\s*"npm",\s*\["run",\s*"smoke:rest"\]/, "refresh checks rest smoke");
  assertMatches(refreshLocalJs, /run\("Check source onboarding flow",\s*"npm",\s*\["run",\s*"smoke:onboarding"\]/, "refresh checks onboarding smoke");
  assertMatches(refreshLocalJs, /run\("Check retention moments",\s*"npm",\s*\["run",\s*"smoke:retention"\]/, "refresh checks retention smoke");
  assertMatches(refreshLocalJs, /run\("Check visual smoke helper",\s*"npm",\s*\["run",\s*"smoke:visual"\]/, "refresh checks visual helper smoke");
  assertMatches(refreshLocalJs, /run\("Check release wiring",\s*"npm",\s*\["run",\s*"smoke:release"\]/, "refresh checks release wiring");
  assertMatches(refreshLocalJs, /run\("Check readiness render sync[^"]*",\s*"npm",\s*\["run",\s*"smoke:readiness"\]/, "refresh checks readiness render sync smoke");
  assertMatches(refreshLocalJs, /run\("Check dark-mode theme render[^"]*",\s*"npm",\s*\["run",\s*"smoke:theme"\]/, "refresh checks dark-mode theme render smoke");
  assertMatches(refreshLocalJs, /run\("Build local app bundle",\s*"npm",\s*\["run",\s*"build:app"\]/, "refresh builds app bundle");
  assertMatches(refreshLocalJs, /run\("Install \/Applications\/EyeFlow\.app",\s*"npm",\s*\["run",\s*"install:local"\]/, "refresh installs local app");
  assertMatches(refreshLocalJs, /run\("Check installed app bundle",\s*"npm",\s*\["run",\s*"smoke:installed"\]/, "refresh checks installed app");

  assertMatches(verifyJs, /\["Check core scoring logic",\s*"smoke:core"\]/, "verify checks core smoke");
  assertMatches(verifyJs, /\["Check session UI state",\s*"smoke:session"\]/, "verify checks session smoke");
  assertMatches(verifyJs, /\["Check current visual capture gate",\s*"smoke:current-capture"\]/, "verify checks current visual capture smoke");
  assertMatches(verifyJs, /\["Check rest recovery flow",\s*"smoke:rest"\]/, "verify checks rest smoke");
  assertMatches(verifyJs, /\["Check source onboarding flow",\s*"smoke:onboarding"\]/, "verify checks onboarding smoke");
  assertMatches(verifyJs, /\["Check retention moments",\s*"smoke:retention"\]/, "verify checks retention smoke");
  assertMatches(verifyJs, /\["Check visual smoke helper",\s*"smoke:visual"\]/, "verify checks visual helper smoke");
  assertMatches(verifyJs, /\["Check release wiring",\s*"smoke:release"\]/, "verify checks release wiring");

  assertIncludes(installLocalJs, "/Applications/EyeFlow.app", "local install target");
  assertIncludes(sessionSmokeJs, "stageMiraView({ load: 80 }).mood", "session smoke guards high-load Mira mood");
  assertIncludes(restSmokeJs, "recoveryCompletionPlan", "rest smoke guards completion plan");
  assertMatches(installLocalJs, /path\.join\(root,\s*"dist",\s*"mac",\s*"EyeFlow\.app"\)/, "local install source");
  assertMatches(installLocalJs, /spawnSync\("ps",\s*\["-axo",\s*"command"\]/, "installer detects running app without pgrep");

  assertIncludes(installedSmokeJs, "eyeflow-core.js", "installed smoke checks core file");
  assertIncludes(installedSmokeJs, "eyeflow-ui-utils.js", "installed smoke checks UI utility file");
  assertIncludes(installedSmokeJs, "installed UI utility export", "installed smoke checks UI utility export");
  assertIncludes(installedSmokeJs, "installed dashboard loads design system stylesheet", "installed smoke checks design system stylesheet");
  assertIncludes(installedSmokeJs, "installed design system provides eye-comfort reading text size", "installed smoke checks design system typography");
  assertIncludes(installedSmokeJs, "installed design system provides unified text spacing aliases", "installed smoke checks design system spacing aliases");
  assertIncludes(installedSmokeJs, "eyeflow-recovery-data.js", "installed smoke checks recovery data file");
  assertIncludes(installedSmokeJs, "eyeflow-session-flow.js", "installed smoke checks session flow file");
  assertIncludes(installedSmokeJs, "eyeflow-rest-flow.js", "installed smoke checks rest flow file");
  assertIncludes(installedSmokeJs, "installed core exposes baseline summary", "installed smoke checks baseline model");
  assertIncludes(installedSmokeJs, "installed app uses unified grouped surface tokens", "installed smoke checks visual system tokens");
  assertIncludes(installedSmokeJs, "installed settings view uses a comfort layout", "installed smoke checks comfort layout");
  assertIncludes(installedSmokeJs, "installed app defines one shared centered page frame width", "installed smoke checks shared page frame token");
  assertIncludes(installedSmokeJs, "installed top-level pages share one centered page frame", "installed smoke checks top-level page alignment");
  assertIncludes(installedSmokeJs, "installed dashboard default bounds always use the target centered size", "installed smoke checks default dashboard bounds");
  assertIncludes(installedSmokeJs, "installed dashboard creation ignores stale saved window bounds", "installed smoke checks stale dashboard bounds are ignored");
  assertIncludes(installedSmokeJs, "installed dashboard reopens centered at the default size", "installed smoke checks centered dashboard reopen");
  assertIncludes(installedSmokeJs, "installed top-level page titles use one tokenized scale", "installed smoke checks top-level title scale");
  assertIncludes(installedSmokeJs, "installed active setting state avoids extra floating shadow", "installed smoke checks active setting restraint");
  assertIncludes(installedSmokeJs, "installed intervention meter uses tokenized symbol rhythm", "installed smoke checks intervention meter tokens");
  assertIncludes(installedSmokeJs, "installed dashboard opens at a Codex-like default size", "installed smoke checks default dashboard size");
  assertIncludes(installedSmokeJs, "installed dashboard reads current symptoms from state", "installed smoke checks unified symptom source");
  assertIncludes(installedSmokeJs, "installed events normalize load, symptoms, confidence, and analysis", "installed smoke checks normalized event snapshots");
  assertIncludes(installedSmokeJs, "installed feedback template builds from unified analysis", "installed smoke checks feedback template data source");
  assertIncludes(installedSmokeJs, "installed feedback copy verifies clipboard readback", "installed smoke checks desktop clipboard verification");
  assertIncludes(installedSmokeJs, "installed feedback copy explains reply location", "installed smoke checks feedback reply guidance");
  assertIncludes(installedSmokeJs, "installed dashboard publishes companion continuity line", "installed smoke checks companion continuity context");
  assertIncludes(installedSmokeJs, "installed session card uses tokenized rhythm-panel structure", "installed smoke checks session card rhythm tokens");
  assertIncludes(installedSmokeJs, "installed session panel title uses one Today rhythm surface", "installed smoke checks unified Today rhythm title");
  assertIncludes(installedSmokeJs, "installed session panel title follows session state", "installed smoke checks session title state");
  assertIncludes(installedSmokeJs, "installed session flow has a single normalized state model", "installed smoke checks normalized session state");
  assertIncludes(installedSmokeJs, "installed session workflow hint shows remaining and target inside the timer", "installed smoke checks timer hint context");
  assertIncludes(installedSmokeJs, "installed mode/state pill is the low-key tonal sage pill (no border)", "installed smoke checks session status pill tokens");
  assertIncludes(installedSmokeJs, "installed session timer controls (primary + ② tonal) go large at 40px", "installed smoke checks session control height token");
  assertIncludes(installedSmokeJs, "installed session controls use quiet design-system icon size", "installed smoke checks session icon size token");
  assertIncludes(installedSmokeJs, "installed session settings stay compact when folded", "installed smoke checks folded session settings tokens");
  assertIncludes(installedSmokeJs, "installed rhythm tuning summary matches the primary quick-log hierarchy", "installed smoke checks rhythm tuning summary hierarchy");
  assertIncludes(installedSmokeJs, "installed session settings expand into a full-width setting area", "installed smoke checks expanded session settings tokens");
  assertIncludes(installedSmokeJs, "installed rhythm tuning is folded below the primary rhythm row", "installed smoke checks rhythm tuning disclosure");
  assertIncludes(installedSmokeJs, "installed rest action icon uses quiet stroke weight", "installed smoke checks session icon stroke weight");
  assertIncludes(installedSmokeJs, "installed today no longer renders a separate round metrics strip", "installed smoke checks metrics strip removal");
  assertIncludes(installedSmokeJs, "installed today no longer repeats focused time below the timer bar", "installed smoke checks focused-time duplication removal");
  assertIncludes(installedSmokeJs, "installed today no longer repeats the target below the timer bar", "installed smoke checks target duplication removal");
  assertIncludes(installedSmokeJs, "installed today timer bar carries remaining and target time", "installed smoke checks timer-bar time context");
  assertIncludes(installedSmokeJs, "installed round target is no longer rendered as a duplicate metric", "installed smoke checks target duplicate removal");
  assertIncludes(installedSmokeJs, "installed remaining time is no longer rendered as a duplicate metric", "installed smoke checks remaining duplicate removal");
  assertIncludes(installedSmokeJs, "installed summary shares focus total and recovery duration without rest counts", "installed smoke checks honest summary copy");
  assertIncludes(installedSmokeJs, "installed quick log summary uses tokenized spacing", "installed smoke checks quick log summary tokens");
  assertIncludes(installedSmokeJs, "installed quick log symbol uses tokenized weight", "installed smoke checks quick log symbol tokens");
  assertIncludes(installedSmokeJs, "installed quick log prompt invites anytime logging", "installed smoke checks quick log anytime prompt");
  assertIncludes(installedSmokeJs, "installed quick log prompt removes eye-change gate copy", "installed smoke checks old quick log gate copy removal");
  assertIncludes(installedSmokeJs, "installed quick log symptom cells use tokenized density", "installed smoke checks quick log symptom tokens");
  assertIncludes(installedSmokeJs, "installed quick log note box uses tokenized control sizing", "installed smoke checks quick log note tokens");
  assertIncludes(installedSmokeJs, "installed quick log removes inline note spacing", "installed smoke checks quick log inline note removal");
  assertIncludes(installedSmokeJs, "installed quick log removes inline action spacing", "installed smoke checks quick log inline action removal");
  assertIncludes(installedSmokeJs, "installed daily summary uses tokenized quiet container", "installed smoke checks summary container tokens");
  assertIncludes(installedSmokeJs, "installed summary cards use tokenized density", "installed smoke checks summary density tokens");
  assertIncludes(installedSmokeJs, "installed summary titles use tokenized type", "installed smoke checks summary title tokens");
  assertIncludes(installedSmokeJs, "installed summary copy uses tokenized body type", "installed smoke checks summary copy tokens");
  assertIncludes(installedSmokeJs, "installed today page uses the shared page frame for its status-action center", "installed smoke checks today shared frame layout");
  assertIncludes(installedSmokeJs, "installed today active secondary modules align to the shared page frame", "installed smoke checks today active module alignment");
  assertIncludes(installedSmokeJs, "installed state hero has quiet native hierarchy with more vertical breathing room", "installed smoke checks state hero layout tokens");
  assertIncludes(installedSmokeJs, "installed state stage reserves a right-side action column", "installed smoke checks state stage right action column");
  assertIncludes(installedSmokeJs, "installed state stage collapses the action column when no action is visible", "installed smoke checks state stage action column collapse");
  assertIncludes(installedSmokeJs, "installed today next-round card stays close to the Mira judgement", "installed smoke checks today next-round spacing");
  assertIncludes(installedSmokeJs, "installed session workflow header aligns status with the title", "installed smoke checks workflow header alignment");
  assertIncludes(installedSmokeJs, "installed folded rhythm settings stay with the workflow title", "installed smoke checks folded rhythm settings alignment");
  assertIncludes(installedSmokeJs, "installed expanded rhythm settings can use the full workflow width", "installed smoke checks expanded rhythm settings width");
  assertIncludes(installedSmokeJs, "installed onboarding-only layout can hide timer panel", "installed smoke checks onboarding-only timer panel downgrade");
  assertIncludes(installedSmokeJs, "installed today removes the metric strip instead of separately hiding it", "installed smoke checks today metric strip removal");
  assertIncludes(installedSmokeJs, "installed onboarding-only layout can hide secondary panels", "installed smoke checks onboarding-only secondary panel downgrade");
  assertIncludes(installedSmokeJs, "installed today main state no longer renders unclear folded meta row", "installed smoke checks today meta row removal");
  assertIncludes(installedSmokeJs, "installed today main state no longer renders first-screen quick feedback", "installed smoke checks today first-screen feedback removal");
  assertIncludes(installedSmokeJs, "installed today page removes duplicate status pill from first glance", "installed smoke checks today duplicate status removal");
  assertIncludes(installedSmokeJs, "installed today Mira outer orbit uses a quiet base ring", "installed smoke checks today Mira orbit base");
  assertIncludes(installedSmokeJs, "installed today Mira orbit stays lower-emphasis than the face", "installed smoke checks today Mira orbit emphasis");
  assertIncludes(installedSmokeJs, "installed today Mira outer arc is centered", "installed smoke checks today Mira outer arc alignment");
  assertIncludes(installedSmokeJs, "installed today Mira uses canonical avatar body geometry", "installed smoke checks today Mira canonical body");
  assertIncludes(installedSmokeJs, "installed today Mira visor uses canonical geometry tokens", "installed smoke checks today Mira visor alignment");
  assertIncludes(installedSmokeJs, "installed today Mira eyes use canonical geometry tokens", "installed smoke checks today Mira eye alignment");
  assertIncludes(installedSmokeJs, "installed today Mira mouth aligns with the face center", "installed smoke checks today Mira mouth alignment");
  assertIncludes(installedSmokeJs, "installed today Mira antenna arc uses canonical geometry tokens", "installed smoke checks today Mira antenna arc alignment");
  assertIncludes(installedSmokeJs, "installed today no longer renders a preparation headline", "installed smoke checks removed preparation headline");
  assertIncludes(installedSmokeJs, "installed running state explains reminder, pause, and rest paths", "installed smoke checks today running explanation");
  assertIncludes(installedSmokeJs, "installed today primary action sits outside the judgement column", "installed smoke checks today action column order");
  assertIncludes(installedSmokeJs, "installed today flow is supporting rhythm context inside the judgement column", "installed smoke checks today flow tokens");
  assertIncludes(installedSmokeJs, "installed today primary action stays in the right-side hero column aligned to the copy exit point", "installed smoke checks today action placement");
  assertIncludes(installedSmokeJs, "installed today action column hides when no action is visible", "installed smoke checks today action column empty state");
  assertIncludes(installedSmokeJs, "installed fallback hero primary action still starts workflow when shown", "installed smoke checks fallback hero workflow action");
  assertIncludes(installedSmokeJs, "installed dashboard focus can locate the manual start entry", "installed smoke checks dashboard manual-start focus");
  assertIncludes(installedSmokeJs, "installed screen activity starts automatic timing from idle", "installed smoke checks activity-driven timing");
  assertIncludes(installedSmokeJs, "installed Today phase centrally enumerates display states", "installed smoke checks today phase model");
  assertIncludes(installedSmokeJs, "installed Today keeps one surface and never starts timing by rendering", "installed smoke checks today phase layout");
  assertIncludes(installedSmokeJs, "installed Today hero copy is truthful for running, idle standby, and force quiet", "installed smoke checks today truthful hero");
  assertIncludes(installedSmokeJs, "installed force escape quiet window is preserved through render", "installed smoke checks force quiet render path");
  assertIncludes(installedSmokeJs, "installed Today navigation no longer starts timing just by rendering", "installed smoke checks today navigation standby");
  assertIncludes(installedSmokeJs, "installed running state uses one title for automatic and manual sessions", "installed smoke checks running state wording");
  assertIncludes(installedSmokeJs, "installed today hides secondary rhythm explanation from first glance", "installed smoke checks today hides secondary rhythm detail");
  assertIncludes(installedSmokeJs, "installed today opens directly on the unified standby surface", "installed smoke checks today standby first screen");
  assertIncludes(installedSmokeJs, "installed today primary action is the ① solid primary (tokenized, unified 36px)", "installed smoke checks today primary action style");
  assertIncludes(installedSmokeJs, "installed today keeps the duplicate hero start hidden by default", "installed smoke checks hidden duplicate start");
  assertIncludes(installedSmokeJs, "installed settings current mode renders as a quiet summary", "installed smoke checks settings current mode summary");
  assertIncludes(installedSmokeJs, "installed settings current mode does not repeat the same label and value row", "installed smoke checks settings current mode repetition");
  assertIncludes(installedSmokeJs, "installed settings folds advanced reminder boundaries", "installed smoke checks settings boundary disclosure");
  assertIncludes(installedSmokeJs, "installed enhanced sensing explains optional permission", "installed smoke checks optional enhanced sensing copy");
  assertIncludes(installedSmokeJs, "installed enhanced sensing explains before macOS permission", "installed smoke checks pre-permission explanation");
  assertIncludes(installedSmokeJs, "installed settings mirrors the macOS Accessibility switch as the enhanced sensing source of truth", "installed smoke checks enhanced sensing follows the macOS switch");
  assertIncludes(installedSmokeJs, "installed settings defaults to ordinary mode when the macOS Accessibility switch is off", "installed smoke checks enhanced sensing ordinary-mode copy");
  assertIncludes(installedSmokeJs, "installed settings can stay in ordinary mode even when macOS permission is available", "installed smoke checks app-level enhanced sensing ordinary state");
  assertIncludes(installedSmokeJs, "installed settings enhanced sensing action has a distinct primary button style", "installed smoke checks enhanced sensing action styling");
  assertIncludes(installedSmokeJs, "installed settings companion action has a distinct secondary button style", "installed smoke checks desktop Mira action styling");
  assertIncludes(installedSmokeJs, "installed settings readiness actions share one stable button sizing class", "installed smoke checks desktop settings action sizing");
  assertIncludes(installedSmokeJs, "installed settings readiness actions use one hard width token", "installed smoke checks desktop settings action width token");
  assertIncludes(installedSmokeJs, "installed settings companion action uses the same action stack as enhanced sensing", "installed smoke checks desktop settings action structure");
  assertIncludes(installedSmokeJs, "installed settings explains the app-level enhanced sensing switch", "installed smoke checks app-level enhanced sensing switch copy");
  assertIncludes(installedSmokeJs, "installed settings does not show enhanced sensing as enabled before the macOS switch is on", "installed smoke checks enhanced sensing requested state is not shown as enabled");
  assertIncludes(installedSmokeJs, "installed settings row explains the system switch requirement before enhanced sensing is active", "installed smoke checks enhanced sensing system-required row copy");
  assertIncludes(installedSmokeJs, "installed settings directs requested enhanced sensing to the macOS switch without claiming it is active", "installed smoke checks requested enhanced sensing system setup action");
  assertIncludes(installedSmokeJs, "installed settings explains enabled enhanced sensing without over-claiming screen access", "installed smoke checks enhanced sensing enabled copy");
  assertIncludes(installedSmokeJs, "installed settings sends enabled enhanced sensing management to macOS settings", "installed smoke checks enhanced sensing management action");
  assertIncludes(installedSmokeJs, "installed settings does not expose a stuck enhanced sensing refresh state", "installed smoke checks enhanced sensing refresh-state removal");
  assertIncludes(installedSmokeJs, "installed settings does not expose a stuck enhanced sensing authorization refresh state", "installed smoke checks enhanced sensing authorization refresh removal");
  assertIncludes(installedSmokeJs, "installed settings does not ask the user to manually refresh authorization", "installed smoke checks manual refresh copy removal");
  assertIncludes(installedSmokeJs, "installed settings does not ask the user to manually restart authorization", "installed smoke checks manual authorization restart copy removal");
  assertIncludes(installedSmokeJs, "installed settings no longer blocks enhanced sensing on a pending main state", "installed smoke checks pending enhanced sensing state removal");
  assertIncludes(installedSmokeJs, "installed settings no longer requires a second confirmation button", "installed smoke checks confirmation button removal");
  assertIncludes(installedSmokeJs, "installed settings no longer surfaces pending authorization as the primary state", "installed smoke checks pending label removal");
  assertIncludes(installedSmokeJs, "installed settings no longer shows an app-local enabled state before the system switch changes", "installed smoke checks app-local enabled state removal");
  assertIncludes(installedSmokeJs, "installed settings does not claim requested enhanced sensing is active", "installed smoke checks requested enhanced sensing copy removal");
  assertIncludes(installedSmokeJs, "installed preload exposes restart IPC for stale accessibility authorization", "installed smoke checks restart IPC bridge");
  assertIncludes(installedSmokeJs, "installed enhanced sensing UI only treats the effective system-enabled state as active", "installed smoke checks enhanced sensing requested-state activation");
  assertIncludes(installedSmokeJs, "installed enhanced sensing UI must not treat the requested state as active", "installed smoke checks requested enhanced state is not active");
  assertIncludes(installedSmokeJs, "installed enhanced sensing UI has no auto-restart loop", "installed smoke checks auto-restart loop removal");
  assertIncludes(installedSmokeJs, "installed enhanced sensing UI has no refresh cooldown state", "installed smoke checks refresh cooldown removal");
  assertIncludes(installedSmokeJs, "installed enhanced sensing toggle follows the effective UI state instead of stale saved settings", "installed smoke checks enhanced sensing toggle uses effective UI state");
  assertIncludes(installedSmokeJs, "installed settings shows enhanced sensing as enabled only after the system switch is on", "installed smoke checks enhanced sensing visible enabled state");
  assertIncludes(installedSmokeJs, "installed settings has a separate non-enabled state for requested enhanced sensing", "installed smoke checks requested enhanced sensing non-enabled state");
  assertIncludes(installedSmokeJs, "installed settings row title separates enabled, system-required, and ordinary states", "installed smoke checks enabled/ordinary row title");
  assertIncludes(installedSmokeJs, "installed settings button points requested enhanced sensing to system setup instead of management", "installed smoke checks system-switch setup action");
  assertIncludes(installedSmokeJs, "installed settings management opens macOS settings without immediately clearing the user's enhanced sensing preference", "installed smoke checks system-switch management preserves preference before return");
  assertIncludes(installedSmokeJs, "installed settings clears the enhanced sensing request after returning from macOS settings with the switch off", "installed smoke checks system-switch-off sync");
  assertIncludes(installedSmokeJs, "installed settings rechecks and syncs enhanced sensing when returning from macOS settings", "installed smoke checks system settings return sync");
  assertIncludes(installedSmokeJs, "installed settings page actively watches macOS permission changes while open", "installed smoke checks live settings permission watcher");
  assertIncludes(installedSmokeJs, "installed settings page starts and stops the desktop permission watcher with the visible view", "installed smoke checks settings watcher lifecycle");
  assertIncludes(installedSmokeJs, "installed frontend has no second-step enhanced sensing confirmation", "installed smoke checks enhanced sensing confirmation code removal");
  assertIncludes(installedSmokeJs, "installed frontend does not keep a pending enhanced sensing UI state", "installed smoke checks pending enhanced sensing state removal");
  assertIncludes(installedSmokeJs, "installed main derives enhanced sensing from the macOS Accessibility switch", "installed smoke checks main system switch derivation");
  assertIncludes(installedSmokeJs, "installed main mirrors the macOS Accessibility switch as the active enhanced sensing state", "installed smoke checks main enhanced state source");
  assertIncludes(installedSmokeJs, "installed main falls back to the macOS TCC Accessibility record when Electron keeps a stale permission value", "installed smoke checks stale Electron permission fallback");
  assertIncludes(installedSmokeJs, "installed main reads the EyeFlow Accessibility TCC client explicitly", "installed smoke checks explicit TCC client");
  assertIncludes(installedSmokeJs, "installed main does not use an Apple Events probe to override macOS Accessibility status", "installed smoke blocks stale active-app permission probes");
  assertIncludes(installedSmokeJs, "installed main does not keep a second app-level source of truth for enhanced sensing", "installed smoke blocks app-level enhanced sensing state");
  assertIncludes(installedSmokeJs, "installed main expires stale enhanced sensing requests", "installed smoke checks stale requested enhanced sensing expiry");
  assertIncludes(installedSmokeJs, "installed main cleans stale enhanced sensing requests during settings reads", "installed smoke checks stale requested enhanced sensing cleanup");
  assertIncludes(installedSmokeJs, "installed main returns the requested enhanced sensing sync state", "installed smoke checks requested enhanced sync state");
  assertIncludes(installedSmokeJs, "installed main timestamps temporary enhanced sensing requests", "installed smoke checks enhanced sensing request timestamp");
  assertIncludes(installedSmokeJs, "installed main keeps requested enhanced sensing temporary instead of permanent", "installed smoke checks enhanced sensing request cleanup");
  assertIncludes(installedSmokeJs, "installed main exposes restart IPC for stale accessibility authorization", "installed smoke checks restart IPC handler");
  assertIncludes(installedSmokeJs, "installed main opens the macOS Accessibility switch when the app button cannot change it directly", "installed smoke checks main opens system switch");
  assertIncludes(installedSmokeJs, "installed main saves the user's requested enhanced sensing state while macOS refreshes authorization", "installed smoke checks user enhanced request persistence");
  assertIncludes(installedSmokeJs, "installed main must not overwrite the user's enhanced sensing request with a stale macOS permission read", "installed smoke checks stale permission writeback prevention");
  assertIncludes(installedSmokeJs, "installed settings rechecks desktop readiness when returning from macOS settings", "installed smoke checks resume desktop readiness refresh");
  assertIncludes(installedSmokeJs, "installed enhanced sensing auto-polls macOS switch changes and falls back to sync guidance", "installed smoke checks enhanced sensing system switch polling");
  assertIncludes(installedSmokeJs, "installed enhanced sensing follows the macOS permission switch", "installed smoke checks enhanced sensing system copy");
  assertIncludes(installedSmokeJs, "installed today default rhythm starts from 50 minutes", "installed smoke checks today default rhythm");
  assertIncludes(installedSmokeJs, "installed today plan is downgraded out of the first screen", "installed smoke checks today plan downgrade");
  assertIncludes(installedSmokeJs, "installed state band shows focused time without a pseudo score", "installed smoke checks state band first-screen honesty");
  assertIncludes(installedSmokeJs, "installed navigation uses tokenized control rhythm", "installed smoke checks nav control tokens");
  assertIncludes(installedSmokeJs, "installed app icons use tokenized size", "installed smoke checks app icon size tokens");
  assertIncludes(installedSmokeJs, "installed app avoids heavy inline icon strokes", "installed smoke checks heavy icon stroke removal");
  assertIncludes(installedSmokeJs, "installed pink Mira uses one-line rest copy", "installed smoke checks short pink Mira copy");
  assertIncludes(installedSmokeJs, "installed companion uses helper body text token", "installed smoke checks companion body typography token");
  assertIncludes(installedSmokeJs, "installed Mira toast renders as a contained prompt without a speech-tail", "installed smoke checks main toast no-tail prompt style");
  assertIncludes(installedSmokeJs, "installed companion Mira bubble uses the same contained no-tail prompt style", "installed smoke checks companion no-tail prompt style");
  assertIncludes(installedSmokeJs, "installed onboarding sells the companion feeling first", "installed smoke checks onboarding companion-first sentence");
  assertIncludes(installedSmokeJs, "installed onboarding creates a first-five-minute aha moment", "installed smoke checks onboarding aha moment");
  assertIncludes(installedSmokeJs, "installed onboarding has one primary action", "installed smoke checks onboarding single primary action");
  assertIncludes(installedSmokeJs, "installed onboarding hides the background start action while the first-run sheet is open", "installed smoke checks onboarding background action suppression");
  assertIncludes(installedSmokeJs, "installed onboarding removes first-run state presets", "installed smoke checks onboarding removes state presets");
  assertIncludes(installedSmokeJs, "installed onboarding removes permission wording from first-run", "installed smoke checks onboarding removes permission wording");
  assertIncludes(installedSmokeJs, "installed onboarding overlay centers the first-run dialog in the dashboard window", "installed smoke checks onboarding dialog centering");
  assertIncludes(installedSmokeJs, "installed main reveals the companion window by default unless the user hides Mira", "installed smoke checks companion default visible");
  assertIncludes(installedSmokeJs, "installed main self-heals enabled desktop Mira when settings are read", "installed smoke checks companion enabled-state self-heal");
  assertIncludes(installedSmokeJs, "installed main can migrate old hidden desktop Mira preferences", "installed smoke checks old hidden companion migration");
  assertIncludes(installedSmokeJs, "installed main marks explicit desktop Mira visibility choices", "installed smoke checks explicit companion preference marker");
  assertIncludes(installedSmokeJs, "installed temporary companion hides do not persist the hidden preference", "installed smoke checks lifecycle hide does not persist");
  assertIncludes(installedSmokeJs, "installed renderer lifecycle hide keeps desktop Mira default visible", "installed smoke checks renderer lifecycle hide");
  assertIncludes(installedSmokeJs, "installed companion open button returns to Today manual focus by default", "installed smoke checks companion opens manual focus");
  assertIncludes(installedSmokeJs, "installed main does not call System Events unless enhanced sensing is enabled", "installed smoke checks System Events gated");
  assertIncludes(installedSmokeJs, "installed onboarding intro centers and subtly lifts the first-run card content", "installed smoke checks onboarding centered lifted intro");
  assertIncludes(installedSmokeJs, "installed onboarding keeps bottom whitespace restrained", "installed smoke checks onboarding bottom whitespace");
  assertIncludes(installedSmokeJs, "installed onboarding Mira floats on a soft glow while keeping canonical face geometry", "installed smoke checks onboarding floating Mira avatar");
  assertIncludes(installedSmokeJs, "installed onboarding Mira mouth stays as a canonical soft short smile inside the glow", "installed smoke checks onboarding Mira mouth softness");
  assertIncludes(installedSmokeJs, "installed today stage Mira mouth stays as a canonical soft short smile", "installed smoke checks today Mira mouth softness");
  assertIncludes(installedSmokeJs, "installed main Mira default mouth stays as a canonical soft short smile", "installed smoke checks main Mira mouth softness");
  assertIncludes(installedSmokeJs, "installed rest dialog Mira uses a circular avatar shell", "installed smoke checks rest dialog circular Mira");
  assertIncludes(installedSmokeJs, "installed feedback Mira is a solid round avatar (no glow), face filling the circle", "installed smoke checks feedback daytime Mira avatar");
  assertIncludes(installedSmokeJs, "installed feedback Mira night is a solid round avatar (no glow)", "installed smoke checks feedback night Mira avatar");
  assertIncludes(installedSmokeJs, "installed feedback Mira mouth follows the canonical soft short smile standard", "installed smoke checks feedback Mira mouth softness");
  assertIncludes(installedSmokeJs, "installed desktop Mira mouth follows the canonical soft short smile standard", "installed smoke checks desktop Mira mouth softness");
  assertIncludes(installedSmokeJs, "installed break lock Mira uses a circular avatar shell", "installed smoke checks break lock circular Mira avatar");
  assertIncludes(installedSmokeJs, "installed break lock Mira mouth follows the canonical soft short smile standard", "installed smoke checks break lock Mira mouth softness");
  assertIncludes(installedSmokeJs, "installed onboarding uses one column to avoid squeezed panels", "installed smoke checks onboarding one-column layout");
  assertIncludes(installedSmokeJs, "installed onboarding no longer styles a removed intro label", "installed smoke checks onboarding label removal");
  assertIncludes(installedSmokeJs, "installed onboarding removes the load segmented scale from the sheet", "installed smoke checks onboarding segmented scale removal");
  assertIncludes(installedSmokeJs, "installed onboarding centers the single primary action", "installed smoke checks onboarding action centering CSS");
  assertIncludes(installedSmokeJs, "installed onboarding debug capture keeps the blurred background", "installed smoke checks onboarding debug capture blur CSS");
  assertIncludes(installedSmokeJs, "installed onboarding permission note is muted text", "installed smoke checks lightweight safety boundary");
  assertIncludes(installedSmokeJs, "installed force mode suppresses companion rest notifications", "installed smoke checks force notification suppression");
  assertIncludes(installedSmokeJs, "installed break lock emergency exit requires confirmation", "installed smoke checks force emergency exit");
  assertIncludes(installedSmokeJs, "installed L2 early phase stays visual-only", "installed smoke checks L2 early boundary");
  assertIncludes(installedSmokeJs, "installed profile review opens with Mira insight", "installed smoke checks profile Mira insight opening");
  assertIncludes(installedSmokeJs, "installed profile review answers the next-round plan directly", "installed smoke checks profile next-round overview");
  assertIncludes(installedSmokeJs, "installed profile review labels the reminder timing directly", "installed smoke checks profile reminder timing");
  assertIncludes(installedSmokeJs, "installed profile observation can detect hard-hold patterns from local reminder and recovery events", "installed smoke checks hard-hold observation");
  assertIncludes(installedSmokeJs, "installed profile observation uses tired-after-rest feedback", "installed smoke checks tired feedback observation");
  assertIncludes(installedSmokeJs, "installed daily share card contains summary and action", "installed smoke checks today daily share card");
  assertIncludes(installedSmokeJs, "installed today no longer renders a separate daily summary section", "installed smoke checks no duplicate daily summary");
  assertIncludes(installedSmokeJs, "installed daily share card is no longer a separate panel", "installed smoke checks share card is merged");
  assertIncludes(installedSmokeJs, "installed profile review hides technical status signal from main flow", "installed smoke checks profile signal hidden");
  assertIncludes(installedSmokeJs, "installed daily share image uses the merged card recommendation as its rhythm", "installed smoke checks profile share rhythm data");
  assertIncludes(installedSmokeJs, "installed profile share card includes restrained domain branding", "installed smoke checks profile share domain branding");
  assertIncludes(installedSmokeJs, "installed daily share card uses the source app icon asset", "installed smoke checks daily share app icon mark");
  assertIncludes(installedSmokeJs, "installed profile share image draws the real app icon mark", "installed smoke checks profile share generated app icon mark");
  assertIncludes(installedSmokeJs, "installed profile share card uses a compact copy action", "installed smoke checks profile share compact action");
  assertIncludes(installedSmokeJs, "installed daily share action opens a full-card preview overlay", "installed smoke checks share preview overlay");
  assertIncludes(installedSmokeJs, "installed daily share preview has a separate copy confirmation", "installed smoke checks share preview confirmation");
  assertIncludes(installedSmokeJs, "installed daily share compact action does not copy before preview", "installed smoke checks share preview before copy");
  assertIncludes(installedSmokeJs, "installed daily share full preview performs the actual copy", "installed smoke checks share preview copy action");
  assertIncludes(installedSmokeJs, "installed profile share card keeps privacy copy hidden until feedback", "installed smoke checks profile share hidden privacy copy");
  assertIncludes(installedSmokeJs, "installed profile share card confirms image-card copying", "installed smoke checks profile share copied state");
  assertIncludes(installedSmokeJs, "installed profile share image draws a textured card artifact", "installed smoke checks profile share generated image");
  assertIncludes(installedSmokeJs, "installed profile share action copies the generated image card first", "installed smoke checks profile share image-first action");
  assertIncludes(installedSmokeJs, "installed today share payload keeps focus/recovery/rhythm; text fallback composes the period metrics plus a Mira line", "installed smoke checks profile share fallback text");
  assertIncludes(installedSmokeJs, "installed preload exposes share-card image clipboard IPC", "installed smoke checks share image IPC");
  assertIncludes(installedSmokeJs, "installed share card copies a verified PNG image", "installed smoke checks share image clipboard write");
  assertIncludes(installedSmokeJs, "installed profile review keeps today's state line as a lower-weight disclosure", "installed smoke checks profile trend disclosure");
  assertIncludes(installedSmokeJs, "installed profile review moves long-term records behind one archive disclosure", "installed smoke checks profile archive disclosure");
  assertIncludes(installedSmokeJs, "installed profile archive does not expose implementation state copy", "installed smoke checks archive disclosure avoids internal state copy");
  assertIncludes(installedSmokeJs, "installed profile archive contains trend, history, and advanced records", "installed smoke checks profile archive grouping");
  assertIncludes(installedSmokeJs, "installed profile review keeps score contributors in advanced records", "installed smoke checks advanced profile contributors");
  assertIncludes(installedSmokeJs, "installed profile review renders missing signal list", "installed smoke checks missing-signal display");
  assertIncludes(installedSmokeJs, "installed profile archive includes advanced local records", "installed smoke checks advanced local records");
  assertIncludes(installedSmokeJs, "installed local data event stream is implemented", "installed smoke checks local event stream");
  assertIncludes(installedSmokeJs, "installed personal rhythm engine uses a seven-day local window", "installed smoke checks personal rhythm window");
  assertIncludes(installedSmokeJs, "installed personal rhythm engine has an explicit local memory structure", "installed smoke checks rhythm memory structure");
  assertIncludes(installedSmokeJs, "installed personal rhythm engine writes sanitized local rhythm memory", "installed smoke checks rhythm memory writer");
  assertIncludes(installedSmokeJs, "installed local round events capture state, reminder method, and rhythm targets", "installed smoke checks rhythm event context");
  assertIncludes(installedSmokeJs, "installed rhythm suggestions use local rules and manual-hold protection", "installed smoke checks personal rhythm suggestions");
  assertIncludes(installedSmokeJs, "installed today page explains Mira rhythm in one sentence", "installed smoke checks today rhythm reason");
  assertIncludes(installedSmokeJs, "installed settings page keeps rhythm reason out of the first screen", "installed smoke checks settings rhythm reason downgrade");
  assertIncludes(installedSmokeJs, "installed feedback template exports rhythm recommendation source", "installed smoke checks rhythm feedback diagnostics");
  assertIncludes(installedSmokeJs, "installed profile review keeps compact data basis", "installed smoke checks compact profile data basis");
  assertIncludes(installedSmokeJs, "installed profile review includes trend window", "installed smoke checks profile trend window");
  assertIncludes(installedSmokeJs, "installed profile trend uses a readable 30-day state band", "installed smoke checks profile state band trend");
  assertIncludes(installedSmokeJs, "installed profile trend marks the peak day", "installed smoke checks profile peak marker");
  assertIncludes(installedSmokeJs, "installed archive uses user-facing reminder handling copy", "installed smoke checks archive reminder copy");
  assertIncludes(installedSmokeJs, "installed history records include spark bars", "installed smoke checks history spark bars");

  [
    "eyeflow-dashboard-initial.png",
    "eyeflow-onboarding-active.png",
    "eyeflow-settings-clean.png",
    "eyeflow-profile-clean.png",
    "eyeflow-rest-guide.png",
    "eyeflow-companion.png",
    "eyeflow-break-lock-active.png",
    "eyeflow-break-lock-complete.png",
    "eyeflow-force-return.png"
  ].forEach((captureName) => assertIncludes(packagedSmokeJs, captureName, `packaged smoke capture ${captureName}`));
  assertIncludes(packagedSmokeJs, "runtimeErrorDiagnostics", "packaged smoke fails on runtime errors");
  assertIncludes(packagedSmokeJs, "assertOnboardingDomProbe", "packaged smoke checks onboarding DOM layout");
  assertIncludes(packagedSmokeJs, "assertDashboardViewLayoutProbe", "packaged smoke checks dashboard layout");
  assertIncludes(packagedSmokeJs, "assertForceReturnToastSafeZone", "packaged smoke checks force-return toast overlap");
  assertIncludes(packagedSmokeJs, "force return unavailable", "packaged smoke fails unavailable force-return paths");
  assertIncludes(packagedSmokeJs, "returnReady", "packaged smoke records force-return readiness");
  assertIncludes(packagedSmokeJs, "finalVisibleView", "packaged smoke records final force-return view");
  assertIncludes(packagedSmokeJs, "assertScreenshotStateGate", "packaged smoke checks screenshot metadata state");
  assertIncludes(packagedSmokeJs, "mainTextSnapshot", "packaged smoke checks screenshot text snapshot");
  assertIncludes(packagedSmokeJs, "captureState", "packaged smoke checks screenshot capture state");
  assertIncludes(packagedSmokeJs, "stateMatchesRequest", "packaged smoke checks screenshot state match flag");
  assertIncludes(packagedSmokeJs, "metadataPathForCapture", "packaged smoke requires metadata beside captures");
  assertIncludes(packagedSmokeJs, "toastOverlaps", "packaged smoke reports toast safe-zone overlap count");
  assertIncludes(packagedSmokeJs, "scrollXOverflow", "packaged smoke rejects visible horizontal overflow");
  assertIncludes(packagedSmokeJs, "clippedControls", "packaged smoke rejects clipped dashboard controls");
  assertIncludes(packagedSmokeJs, "EYEFLOW_SMOKE_TIMEOUT_MS || 90000", "packaged smoke gives force-return capture enough time");
  assertIncludes(mainJs, "debugCaptureQueues", "debug captures are serialized per window");
  assertIncludes(mainJs, "[EyeFlow:debug] dashboard view json", "dashboard debug emits structured layout probe");
  assertIncludes(mainJs, "__eyeflowToastSafeZoneProbe", "dashboard debug exposes toast safe-zone probe");
  assertIncludes(mainJs, "[EyeFlow:debug] force return dashboard json", "force-return debug emits structured toast probe");
  assertIncludes(mainJs, "debugOnboarding ? 4500 : 900", "dashboard debug view waits for onboarding capture");
  assertIncludes(mainJs, 'classList.add("show", "debug-capture")', "onboarding debug capture disables transition state");
  assertIncludes(mainJs, 'captureDebugPage(dashboardWindow, "dashboard-onboarding", 180', "onboarding debug screenshot captures before dashboard view changes");
  assertIncludes(mainJs, "debugCaptureMetadataPath", "debug captures write metadata beside screenshots");
  assertIncludes(mainJs, "debugCaptureProbeScript", "debug captures wait for stable renderer state");
  assertIncludes(mainJs, "debugPrepareCaptureScript", "debug captures re-prepare requested view before screenshot");
  assertIncludes(mainJs, "parseCurrentVisualCaptureTargets", "main process supports explicit current visual capture targets");
  assertIncludes(mainJs, "currentCaptureMismatches", "main process records current capture state mismatches");
  assertIncludes(mainJs, "logCurrentCaptureBasis", "main process prints required visual scoring basis");
  assertIncludes(currentCaptureJs, "EYEFLOW_CURRENT_CAPTURE", "current capture CLI launches explicit current target");
  assertIncludes(currentCaptureJs, "本次评分基于：", "current capture CLI prints scoring basis");
  assertIncludes(currentCaptureJs, "stateMatchesRequest !== true", "current capture CLI rejects mismatched state");
  assertIncludes(currentCaptureJs, "EYEFLOW_USER_DATA_DIR", "current capture CLI isolates local app data");
  assertIncludes(mainJs, "app.setPath(\"userData\", debugUserDataDir)", "main process isolates debug capture user data");
  assertIncludes(currentCaptureSmokeJs, "webContents.capturePage()", "current capture smoke requires Electron capturePage");
  assertIncludes(packagedSmokeJs, "EYEFLOW_USER_DATA_DIR", "packaged smoke isolates local app data");
  assertIncludes(packagedSmokeJs, "EYEFLOW_DEBUG_COPY_FEEDBACK", "packaged smoke probes feedback copy");
  assertIncludes(packagedSmokeJs, "Feedback copy probe", "packaged smoke reports feedback copy result");
  assertIncludes(packagedSmokeJs, "smoke-visual-utils", "packaged smoke uses visual helper");
  assertIncludes(visualSmokeJs, "assertOnboardingPrimaryActionVisible", "visual helper checks onboarding primary action visibility");
  assertIncludes(visualSmokeJs, "assertOnboardingVisualQuality", "visual helper exports onboarding quality check");
  assertIncludes(visualSmokeJs, "onboarding primary action text is not readable enough", "visual helper fails unreadable onboarding primary action contrast");
  assertIncludes(packagedSmokeJs, "voicePreserved", "packaged smoke observes force voice preservation");

  const releaseCandidateJs = read("scripts/release-candidate-check.js");
  assertIncludes(releaseCandidateJs, "Smoke finished app UI", "release candidate check runs finished app smoke");
  assertIncludes(releaseCandidateJs, "timeout: 90000", "release candidate gives installed smoke enough timeout headroom");
  assertIncludes(releaseCandidateJs, "timeout: 130000", "release candidate leaves headroom for screenshot-state smoke");
  assertIncludes(releaseCandidateJs, "build:zip", "release candidate artifact check builds unsigned ZIP");
  assertIncludes(releaseCandidateJs, "Create unsigned DMG with hdiutil", "release candidate artifact check has hdiutil DMG fallback");
  assertIncludes(releaseCandidateJs, "\"ditto\", [appPath, stagedApp]", "release candidate stages app bundles with symlink-preserving ditto");
  assertIncludes(releaseCandidateJs, "Validate unsigned DMG imageinfo", "release candidate artifact check validates unsigned DMG imageinfo");
  assertIncludes(releaseCandidateJs, "CSC_IDENTITY_AUTO_DISCOVERY", "release candidate artifact check can build unsigned before Developer ID");
  assertIncludes(releaseCandidateJs, "--allow-unsigned", "release candidate artifact check uses unsigned preflight before Developer ID");
  assertIncludes(releaseCandidateJs, "--signed", "release candidate check supports signed public gate");

  assertIncludes(launchPreflightJs, "Developer ID signature and hardened runtime", "preflight checks signing");
  assertIncludes(launchPreflightJs, "codesign\", [\"--verify\", \"--deep\", \"--strict\"", "preflight strictly verifies app bundle signature");
  assertIncludes(launchPreflightJs, "latest-mac.yml ZIP size is fresh", "preflight checks auto-update metadata freshness");
  assertIncludes(launchPreflightJs, "Gatekeeper assessment passes", "preflight checks Gatekeeper");
  assertIncludes(launchPreflightJs, "Release staging is clean", "preflight checks release staging");
  assertIncludes(launchPreflightJs, "Public app UI has no private-test wording", "preflight checks public UI wording");
  assertIncludes(launchPreflightJs, "docs/PRIVACY.md", "preflight requires privacy doc");

  console.log(`[smoke:release] Visual source gate: total style signals=${visualGate.totalStyleSignals}, index=${visualGate.styleCounts["index.html"]}, tokens=${visualGate.totalTokenRefs}`);
  console.log("[smoke:release] PASSED. Local install, packaged smoke, visual source gate, and launch preflight wiring are guarded.");
}

try {
  main();
} catch (error) {
  console.error("[smoke:release] FAILED.", error.message);
  process.exitCode = 1;
}
