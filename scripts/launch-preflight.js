#!/usr/bin/env node

const { spawnSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const version = pkg.version;
const distDir = path.join(root, "dist");
const appPath = path.join(distDir, "mac", "EyeFlow.app");
const appBinary = path.join(appPath, "Contents", "MacOS", "EyeFlow");
const dmgPath = path.join(distDir, `EyeFlow-${version}-x64.dmg`);
const zipPath = path.join(distDir, `EyeFlow-${version}-x64.zip`);
const sumsPath = path.join(distDir, `EyeFlow-${version}-SHA256SUMS.txt`);
const releaseDir = path.join(distDir, "release", `v${version}`);
const allowUnsigned = process.argv.includes("--allow-unsigned");
const warnings = [];

const requiredDocs = [
  "README.md",
  "docs/BETA_INSTALL_GUIDE.md",
  "docs/DOWNLOAD_PAGE_COPY.md",
  "docs/PRIVACY.md",
  "docs/LAUNCH_CHECKLIST.md",
  `docs/RELEASE_NOTES_v${version}.md`,
  "docs/RELEASE_CHECKLIST.md",
  "docs/TESTER_SHARE_MESSAGE.md"
];

const checks = [];

function addCheck(name, ok, detail) {
  checks.push({ name, ok: Boolean(ok), detail: detail || "" });
}

function addWarning(name, detail) {
  warnings.push({ name, detail: detail || "" });
}

function exists(filePath) {
  try {
    return fs.statSync(filePath);
  } catch {
    return null;
  }
}

function fileSize(filePath) {
  const stat = exists(filePath);
  return stat ? stat.size : 0;
}

function sha256(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function run(command, args) {
  return spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    timeout: 20000
  });
}

function oneLine(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function checkArtifacts() {
  addCheck("App bundle exists", Boolean(exists(appPath)), appPath);
  addCheck("App binary exists", Boolean(exists(appBinary)), appBinary);
  addCheck("DMG exists", fileSize(dmgPath) > 1024 * 1024, dmgPath);
  addCheck("ZIP exists", fileSize(zipPath) > 1024 * 1024, zipPath);

  const appStat = exists(appBinary);
  const dmgStat = exists(dmgPath);
  const zipStat = exists(zipPath);
  if (appStat && dmgStat) {
    addCheck("DMG is newer than app binary", dmgStat.mtimeMs >= appStat.mtimeMs, new Date(dmgStat.mtimeMs).toISOString());
  }
  if (appStat && zipStat) {
    addCheck("ZIP is newer than app binary", zipStat.mtimeMs >= appStat.mtimeMs, new Date(zipStat.mtimeMs).toISOString());
  }

  const legacy = fs.existsSync(distDir)
    ? fs.readdirSync(distDir).filter((name) => /\.(dmg|zip|blockmap)$/i.test(name)
      && !name.startsWith(`EyeFlow-${version}-`))
    : [];
  if (legacy.length) {
    addWarning("Legacy artifacts remain in dist", legacy.join(", "));
  }
}

function checkDocs() {
  requiredDocs.forEach((relativePath) => {
    const fullPath = path.join(root, relativePath);
    addCheck(`Doc exists: ${relativePath}`, fileSize(fullPath) > 300, relativePath);
  });
}

function checkPackageConfig() {
  addCheck("Product name is EyeFlow", pkg.build?.productName === "EyeFlow", pkg.build?.productName);
  addCheck("App ID is com.eyeflow.app", pkg.build?.appId === "com.eyeflow.app", pkg.build?.appId);
  addCheck("Version is stable semver", /^\d+\.\d+\.\d+$/.test(version), version);
  addCheck("macOS category set", pkg.build?.mac?.category === "public.app-category.productivity", pkg.build?.mac?.category);
  addCheck("Icon configured", pkg.build?.mac?.icon === "assets/icon.icns", pkg.build?.mac?.icon);
  addCheck("macOS entitlements configured", pkg.build?.mac?.entitlements === "build/entitlements.mac.plist", pkg.build?.mac?.entitlements || "missing");
  addCheck("macOS inherited entitlements configured", pkg.build?.mac?.entitlementsInherit === "build/entitlements.mac.inherit.plist", pkg.build?.mac?.entitlementsInherit || "missing");
  addCheck("Hardened runtime configured", pkg.build?.mac?.hardenedRuntime === true, String(pkg.build?.mac?.hardenedRuntime));
  addCheck("Notarization configured", pkg.build?.mac?.notarize === true, String(pkg.build?.mac?.notarize));
}

function checkPublicUiCopy() {
  const appFiles = [
    "index.html",
    "companion.html",
    "companion-panel.html",
    "break-lock.html",
    "main.js",
    "preload.js"
  ];
  const banned = [
    { pattern: /私测/, label: "私测" },
    { pattern: /private alpha/i, label: "private alpha" },
    { pattern: /alpha tester/i, label: "alpha tester" }
  ];
  const hits = [];
  appFiles.forEach((relativePath) => {
    const text = fs.readFileSync(path.join(root, relativePath), "utf8");
    banned.forEach((item) => {
      if (item.pattern.test(text)) hits.push(`${relativePath}:${item.label}`);
    });
  });
  addCheck("Public app UI has no private-test wording", hits.length === 0, hits.join(", "));
}

function checkDmg() {
  if (!exists(dmgPath) || process.platform !== "darwin") return;
  const result = run("hdiutil", ["imageinfo", dmgPath]);
  addCheck("DMG imageinfo passes", result.status === 0, oneLine(result.stderr || result.stdout).slice(0, 220));
}

function checkSigning() {
  if (!exists(appPath) || process.platform !== "darwin") return;
  const codeSign = run("codesign", ["-dv", "--verbose=4", appPath]);
  const output = `${codeSign.stdout || ""}\n${codeSign.stderr || ""}`;
  const developerId = /Authority=Developer ID Application/.test(output);
  const hardened = /Runtime Version=/.test(output);
  const signedOk = allowUnsigned || (codeSign.status === 0 && developerId && hardened);
  addCheck(
    "Developer ID signature and hardened runtime",
    signedOk,
    allowUnsigned ? "allow-unsigned mode" : oneLine(output).slice(0, 240)
  );

  if (!exists(dmgPath)) return;
  const spctl = run("spctl", ["-a", "-vv", "-t", "install", dmgPath]);
  const spctlOutput = `${spctl.stdout || ""}\n${spctl.stderr || ""}`;
  addCheck(
    "Gatekeeper assessment passes",
    allowUnsigned || spctl.status === 0,
    allowUnsigned ? "allow-unsigned mode" : oneLine(spctlOutput).slice(0, 240)
  );
}

function writeChecksums() {
  if (!exists(dmgPath) || !exists(zipPath)) return;
  const lines = [
    `${sha256(dmgPath)}  ${path.basename(dmgPath)}`,
    `${sha256(zipPath)}  ${path.basename(zipPath)}`
  ];
  fs.writeFileSync(sumsPath, `${lines.join("\n")}\n`);
  addCheck("SHA256SUMS written", true, sumsPath);
}

function stageRelease() {
  if (!exists(dmgPath) || !exists(zipPath) || !exists(sumsPath)) return;
  fs.rmSync(releaseDir, { recursive: true, force: true });
  fs.mkdirSync(releaseDir, { recursive: true });
  [
    dmgPath,
    zipPath,
    sumsPath,
    path.join(root, `docs/RELEASE_NOTES_v${version}.md`),
    path.join(root, "docs/BETA_INSTALL_GUIDE.md"),
    path.join(root, "docs/DOWNLOAD_PAGE_COPY.md"),
    path.join(root, "docs/PRIVACY.md"),
    path.join(root, "docs/LAUNCH_CHECKLIST.md"),
    path.join(root, "docs/TESTER_SHARE_MESSAGE.md")
  ].forEach((filePath) => {
    fs.copyFileSync(filePath, path.join(releaseDir, path.basename(filePath)));
  });
  const staged = fs.readdirSync(releaseDir).sort();
  const unexpected = staged.filter((name) => ![
    `EyeFlow-${version}-SHA256SUMS.txt`,
    `EyeFlow-${version}-x64.dmg`,
    `EyeFlow-${version}-x64.zip`,
    "BETA_INSTALL_GUIDE.md",
    "DOWNLOAD_PAGE_COPY.md",
    "LAUNCH_CHECKLIST.md",
    "PRIVACY.md",
    `RELEASE_NOTES_v${version}.md`,
    "TESTER_SHARE_MESSAGE.md"
  ].includes(name));
  addCheck("Release staging is clean", unexpected.length === 0, releaseDir);
}

function printResults() {
  const failed = checks.filter((check) => !check.ok);
  warnings.forEach((warning) => {
    const detail = warning.detail ? ` - ${warning.detail}` : "";
    console.log(`[WARN] ${warning.name}${detail}`);
  });
  checks.forEach((check) => {
    const mark = check.ok ? "PASS" : "FAIL";
    const detail = check.detail ? ` - ${check.detail}` : "";
    console.log(`[${mark}] ${check.name}${detail}`);
  });
  console.log("");
  if (failed.length) {
    console.error(`[launch] FAILED: ${failed.length} launch blocker(s).`);
    process.exitCode = 1;
    return;
  }
  console.log("[launch] PASSED: release artifacts are ready for public launch checks.");
}

checkArtifacts();
checkDocs();
checkPackageConfig();
checkPublicUiCopy();
checkDmg();
checkSigning();
writeChecksums();
stageRelease();
printResults();
