#!/usr/bin/env node

const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.join(__dirname, "..");
const appBinary = process.env.EYEFLOW_APP_BINARY
  || path.join(root, "dist", "mac", "EyeFlow.app", "Contents", "MacOS", "EyeFlow");
const captureDir = process.env.EYEFLOW_SMOKE_CAPTURE_DIR
  || path.join(os.tmpdir(), "eyeflow-smoke");
const timeoutMs = Number(process.env.EYEFLOW_SMOKE_TIMEOUT_MS || 52000);
const logPath = path.join(captureDir, "eyeflow-smoke.log");

const expectedCaptures = [
  "eyeflow-dashboard-capture.png",
  "eyeflow-dashboard-rhythmView-capture.png",
  "eyeflow-dashboard-rest-guide-capture.png",
  "eyeflow-companion-capture.png",
  "eyeflow-companion-panel-capture.png",
  "eyeflow-break-lock-capture.png",
  "eyeflow-break-lock-complete-capture.png",
  "eyeflow-dashboard-force-return-capture.png"
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function quitEyeFlow() {
  if (process.platform !== "darwin") return;
  spawnSync("osascript", ["-e", 'tell application "EyeFlow" to quit'], {
    stdio: "ignore",
    timeout: 5000
  });
}

function captureStatus() {
  return expectedCaptures.map((name) => {
    const filePath = path.join(captureDir, name);
    let size = 0;
    try {
      size = fs.statSync(filePath).size;
    } catch {
      size = 0;
    }
    return {
      name,
      filePath,
      ok: size > 1024,
      size
    };
  });
}

function tail(text, lines = 28) {
  return text.split(/\r?\n/).slice(-lines).join("\n");
}

async function waitForChildExit(child, ms) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function main() {
  if (process.platform !== "darwin") {
    throw new Error("Packaged app smoke test currently requires macOS.");
  }
  if (!fs.existsSync(appBinary)) {
    throw new Error(`Missing packaged app binary: ${appBinary}`);
  }

  fs.rmSync(captureDir, { recursive: true, force: true });
  fs.mkdirSync(captureDir, { recursive: true });

  console.log("[smoke] Target:", appBinary);
  console.log("[smoke] Captures:", captureDir);

  quitEyeFlow();
  await sleep(1200);

  const child = spawn(appBinary, [], {
    env: {
      ...process.env,
      EYEFLOW_DEBUG_CAPTURE: "1",
      EYEFLOW_DEBUG_CAPTURE_DIR: captureDir,
      EYEFLOW_DEBUG_VIEW: "rhythmView",
      EYEFLOW_DEBUG_REST_CLICK: "1",
      EYEFLOW_DEBUG_FORCE_PREVIEW: "1"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });

  const startedAt = Date.now();
  let status = captureStatus();

  while (Date.now() - startedAt < timeoutMs) {
    status = captureStatus();
    if (status.every((item) => item.ok)) break;
    if (child.exitCode !== null || child.signalCode !== null) break;
    await sleep(500);
  }

  await sleep(900);
  quitEyeFlow();
  child.kill("SIGTERM");
  await waitForChildExit(child, 5000);
  if (child.exitCode === null && child.signalCode === null) {
    child.kill("SIGKILL");
  }

  fs.writeFileSync(logPath, output);

  status = captureStatus();
  const missing = status.filter((item) => !item.ok);
  if (missing.length) {
    console.error("[smoke] FAILED. Missing captures:");
    missing.forEach((item) => {
      console.error(`  - ${item.name} (${item.size} bytes)`);
    });
    console.error("[smoke] Log tail:");
    console.error(tail(output));
    process.exitCode = 1;
    return;
  }

  const voicePreserved = /voicePreserved:\s*true/.test(output);
  console.log("[smoke] PASSED. Packaged EyeFlow rendered all required views.");
  status.forEach((item) => {
    console.log(`  - ${item.name} (${item.size} bytes)`);
  });
  console.log("[smoke] Force preview preserved voice setting:", voicePreserved ? "yes" : "not observed");
  console.log("[smoke] Log:", logPath);
}

main().catch((error) => {
  console.error("[smoke] FAILED.", error.message);
  process.exitCode = 1;
});
