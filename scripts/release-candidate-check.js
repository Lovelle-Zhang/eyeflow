#!/usr/bin/env node

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const distDir = path.join(root, "dist");
const appPath = path.join(distDir, "mac", "EyeFlow.app");
const unsignedDmgPath = path.join(distDir, `EyeFlow-${pkg.version}-x64.dmg`);
const withArtifacts = process.argv.includes("--artifacts");
const signed = process.argv.includes("--signed");

function run(label, command, args, options = {}) {
  console.log(`[release:rc] ${label}`);
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      ...options.env
    },
    timeout: options.timeout || 180000
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status}`);
  }
}

function createUnsignedDmg() {
  const stagingDir = path.join(distDir, "dmg-staging");
  const stagedApp = path.join(stagingDir, "EyeFlow.app");
  const appLink = path.join(stagingDir, "Applications");

  fs.rmSync(stagingDir, { recursive: true, force: true });
  fs.mkdirSync(stagingDir, { recursive: true });
  fs.cpSync(appPath, stagedApp, { recursive: true });
  fs.symlinkSync("/Applications", appLink);
  fs.rmSync(unsignedDmgPath, { force: true });

  try {
    run("Create unsigned DMG with hdiutil", "hdiutil", [
      "create",
      "-volname",
      "EyeFlow",
      "-srcfolder",
      stagingDir,
      "-ov",
      "-format",
      "UDZO",
      unsignedDmgPath
    ], { timeout: 180000 });
  } finally {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
}

function main() {
  console.log(`[release:rc] Mode: ${withArtifacts ? "artifact RC" : "app RC"}${signed ? " with signing required" : ""}`);

  run("Verify source smoke checks", "npm", ["run", "verify"], { timeout: 60000 });

  if (withArtifacts && signed) {
    run("Build signed DMG/ZIP release artifacts", "npm", ["run", "build:mac"], { timeout: 300000 });
  } else if (withArtifacts) {
    run("Build unsigned ZIP release artifact", "npm", ["run", "build:zip"], {
      timeout: 240000,
      env: { CSC_IDENTITY_AUTO_DISCOVERY: "false" }
    });
    createUnsignedDmg();
  } else {
    run("Build app bundle", "npm", ["run", "build:app"], { timeout: 180000 });
  }

  run("Install /Applications/EyeFlow.app", "npm", ["run", "install:local"], { timeout: 180000 });
  run("Check installed app bundle", "npm", ["run", "smoke:installed"], { timeout: 30000 });
  run("Smoke finished app UI", "npm", ["run", "smoke:app"], { timeout: 90000 });

  if (withArtifacts) {
    run(
      signed ? "Run signed launch preflight" : "Run unsigned artifact preflight",
      "node",
      ["scripts/launch-preflight.js", ...(signed ? [] : ["--allow-unsigned"])],
      { timeout: 60000 }
    );
  } else {
    console.log("[release:rc] Artifact gate skipped. Run npm run release:rc:artifacts when you need fresh DMG/ZIP checks.");
  }

  console.log("[release:rc] DONE. Release-candidate checks passed.");
  if (!signed) {
    console.log("[release:rc] Public launch still requires Developer ID signing and notarization.");
  }
}

try {
  main();
} catch (error) {
  console.error("[release:rc] FAILED.", error.message);
  process.exitCode = 1;
}
