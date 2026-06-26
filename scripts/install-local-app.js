#!/usr/bin/env node

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const sourceApp = process.env.EYEFLOW_SOURCE_APP
  || path.join(root, "dist", "mac", "EyeFlow.app");
const targetApp = process.env.EYEFLOW_TARGET_APP
  || "/Applications/EyeFlow.app";
const sourceBinary = path.join(sourceApp, "Contents", "MacOS", "EyeFlow");
const targetBinary = path.join(targetApp, "Contents", "MacOS", "EyeFlow");
const shouldLaunch = process.env.EYEFLOW_INSTALL_NO_LAUNCH !== "1";
const quitTimeoutMs = Number(process.env.EYEFLOW_INSTALL_QUIT_TIMEOUT_MS || 12000);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    stdio: options.stdio || "pipe",
    timeout: options.timeout || 30000
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const output = `${result.stdout || ""}${result.stderr || ""}`.trim();
    throw new Error(`${command} ${args.join(" ")} failed${output ? `: ${output}` : ""}`);
  }
  return result;
}

function stat(filePath) {
  try {
    return fs.statSync(filePath);
  } catch {
    return null;
  }
}

function quitApp(name) {
  if (process.platform !== "darwin") return;
  spawnSync("osascript", ["-e", `tell application "${name}" to quit`], {
    stdio: "ignore",
    timeout: 5000
  });
}

function isEyeFlowRunning() {
  const result = spawnSync("ps", ["-axo", "command"], {
    encoding: "utf8",
    timeout: 3000
  });
  if (result.status !== 0) return false;
  return result.stdout.split(/\r?\n/).some((line) => {
    const command = line.trim();
    return command.startsWith("/Applications/EyeFlow.app/Contents/MacOS/EyeFlow")
      || command.startsWith("/Applications/EyeFlow.app/Contents/Frameworks/")
      || command.startsWith("/Applications/EyeFlow.app/Contents/Helpers/");
  });
}

function waitForEyeFlowExit() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < quitTimeoutMs) {
    if (!isEyeFlowRunning()) return true;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 350);
  }
  return !isEyeFlowRunning();
}

function main() {
  if (process.platform !== "darwin") {
    throw new Error("Local app install currently supports macOS only.");
  }
  if (!stat(sourceBinary)) {
    throw new Error(`Missing built app binary: ${sourceBinary}. Run npm run build:app first.`);
  }

  quitApp("EyeFlow");
  quitApp("Electron");
  if (!waitForEyeFlowExit()) {
    throw new Error("EyeFlow is still running. Quit EyeFlow and run npm run install:local again.");
  }

  run("ditto", [sourceApp, targetApp], { timeout: 120000 });

  const targetStat = stat(targetBinary);
  if (!targetStat) {
    throw new Error(`Install did not produce target binary: ${targetBinary}`);
  }

  if (shouldLaunch) {
    run("open", ["-a", "EyeFlow"], { timeout: 10000 });
  }

  console.log("[install:local] Installed EyeFlow.app");
  console.log(`  source: ${sourceApp}`);
  console.log(`  target: ${targetApp}`);
  console.log(`  updated: ${targetStat.mtime.toISOString()}`);
  console.log(`  launched: ${shouldLaunch ? "yes" : "no"}`);
}

try {
  main();
} catch (error) {
  console.error("[install:local] FAILED.", error.message);
  process.exitCode = 1;
}
