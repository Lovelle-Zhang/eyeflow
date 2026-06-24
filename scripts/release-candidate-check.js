#!/usr/bin/env node

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const distDir = path.join(root, "dist");
const appPath = path.join(distDir, "mac", "EyeFlow.app");
const unsignedDmgPath = path.join(distDir, `EyeFlow-${pkg.version}-x64.dmg`);
const zipPath = path.join(distDir, `EyeFlow-${pkg.version}-x64.zip`);
const zipBlockmapPath = `${zipPath}.blockmap`;
const latestMacPath = path.join(distDir, "latest-mac.yml");
const tempRoot = "/private/tmp";
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

function safeRemove(targetPath) {
  if (!targetPath.startsWith(distDir) && !targetPath.startsWith(path.join(tempRoot, "eyeflow-"))) {
    throw new Error(`Refusing to remove unexpected path: ${targetPath}`);
  }
  fs.rmSync(targetPath, { recursive: true, force: true });
}

function detachMountedVolume(mountPath) {
  if (!fs.existsSync(mountPath)) return;
  const result = spawnSync("hdiutil", ["detach", mountPath], {
    cwd: root,
    stdio: "inherit",
    timeout: 30000
  });
  if (result.status !== 0) {
    console.warn(`[release:rc] Warning: stale mounted volume could not be detached: ${mountPath}`);
  }
}

function assertDmgImageInfo() {
  run("Validate unsigned DMG imageinfo", "hdiutil", ["imageinfo", unsignedDmgPath], { timeout: 60000 });
}

function developerIdIdentity() {
  if (process.env.CSC_NAME) return process.env.CSC_NAME;
  const result = spawnSync("security", ["find-identity", "-v", "-p", "codesigning"], {
    cwd: root,
    encoding: "utf8",
    timeout: 30000
  });
  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  const match = output.match(/"([^"]*Developer ID Application:[^"]+)"/);
  if (!match) {
    throw new Error("No Developer ID Application identity is available for public signing");
  }
  return match[1];
}

function notarizationArgs() {
  if (process.env.APPLE_KEYCHAIN_PROFILE) {
    return ["--keychain-profile", process.env.APPLE_KEYCHAIN_PROFILE];
  }
  if (process.env.APPLE_API_KEY && process.env.APPLE_API_KEY_ID && process.env.APPLE_API_ISSUER) {
    return [
      "--key",
      process.env.APPLE_API_KEY,
      "--key-id",
      process.env.APPLE_API_KEY_ID,
      "--issuer",
      process.env.APPLE_API_ISSUER
    ];
  }
  if (process.env.APPLE_ID && process.env.APPLE_APP_SPECIFIC_PASSWORD && process.env.APPLE_TEAM_ID) {
    return [
      "--apple-id",
      process.env.APPLE_ID,
      "--password",
      process.env.APPLE_APP_SPECIFIC_PASSWORD,
      "--team-id",
      process.env.APPLE_TEAM_ID
    ];
  }
  return null;
}

function createDmg(label = "Create DMG with hdiutil") {
  const stagingDir = path.join(tempRoot, `eyeflow-dmg-staging-${process.pid}`);
  const stagedApp = path.join(stagingDir, "EyeFlow.app");
  const appLink = path.join(stagingDir, "Applications");

  detachMountedVolume("/Volumes/EyeFlow");
  safeRemove(stagingDir);
  fs.mkdirSync(stagingDir, { recursive: true });
  run("Stage app bundle for DMG", "ditto", [appPath, stagedApp], { timeout: 180000 });
  fs.symlinkSync("/Applications", appLink);
  safeRemove(unsignedDmgPath);

  try {
    run(label, "hdiutil", [
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
    assertDmgImageInfo();
  } finally {
    safeRemove(stagingDir);
  }
}

function signPublicApp() {
  const identity = developerIdIdentity();
  run("Re-sign app bundle with Developer ID", "codesign", [
    "--force",
    "--deep",
    "--options",
    "runtime",
    "--entitlements",
    path.join(root, "build/entitlements.mac.plist"),
    "--sign",
    identity,
    appPath
  ], { timeout: 180000 });
  run("Verify app bundle strict signature", "codesign", ["--verify", "--deep", "--strict", "--verbose=4", appPath], { timeout: 60000 });
  return identity;
}

function packageSignedZip() {
  safeRemove(zipPath);
  safeRemove(zipBlockmapPath);
  safeRemove(latestMacPath);
  run("Build ZIP from signed app bundle", path.join(root, "node_modules", ".bin", "electron-builder"), [
    "--mac",
    "zip",
    "--prepackaged",
    appPath,
    "--publish",
    "never"
  ], { timeout: 3600000 });
}

function signPublicDmg(identity) {
  createDmg("Create signed DMG with hdiutil");
  run("Sign DMG with Developer ID", "codesign", ["--force", "--sign", identity, unsignedDmgPath], { timeout: 60000 });
  run("Verify signed DMG signature", "codesign", ["--verify", "--verbose=4", unsignedDmgPath], { timeout: 60000 });
}

function notarizePublicDmg() {
  const args = notarizationArgs();
  if (!args) {
    throw new Error("Notarization credentials are not configured. Set APPLE_KEYCHAIN_PROFILE, APPLE_API_KEY/APPLE_API_KEY_ID/APPLE_API_ISSUER, or APPLE_ID/APPLE_APP_SPECIFIC_PASSWORD/APPLE_TEAM_ID.");
  }
  run("Submit DMG for Apple notarization", "xcrun", ["notarytool", "submit", unsignedDmgPath, ...args, "--wait"], { timeout: 3600000 });
  run("Staple notarization ticket to DMG", "xcrun", ["stapler", "staple", unsignedDmgPath], { timeout: 120000 });
  run("Validate stapled DMG", "xcrun", ["stapler", "validate", unsignedDmgPath], { timeout: 120000 });
}

function main() {
  console.log(`[release:rc] Mode: ${withArtifacts ? "artifact RC" : "app RC"}${signed ? " with signing required" : ""}`);

  run("Verify source smoke checks", "npm", ["run", "verify"], { timeout: 60000 });

  if (withArtifacts && signed) {
    run("Build app bundle for public release", "npm", ["run", "build:app"], { timeout: 3600000 });
    const identity = signPublicApp();
    packageSignedZip();
    signPublicDmg(identity);
    notarizePublicDmg();
  } else if (withArtifacts) {
    run("Build unsigned ZIP release artifact", "npm", ["run", "build:zip"], {
      timeout: 240000,
      env: { CSC_IDENTITY_AUTO_DISCOVERY: "false" }
    });
    createDmg("Create unsigned DMG with hdiutil");
  } else {
    run("Build app bundle", "npm", ["run", "build:app"], { timeout: 180000 });
  }

  run("Install /Applications/EyeFlow.app", "npm", ["run", "install:local"], { timeout: 180000 });
  run("Check installed app bundle", "npm", ["run", "smoke:installed"], { timeout: 90000 });
  run("Smoke finished app UI", "npm", ["run", "smoke:app"], { timeout: 130000 });

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
