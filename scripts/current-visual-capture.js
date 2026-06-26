#!/usr/bin/env node

const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.join(__dirname, "..");
const captureDir = process.env.EYEFLOW_CURRENT_CAPTURE_DIR
  || path.join(os.tmpdir(), "eyeflow-current-capture");
const timeoutMs = Number(process.env.EYEFLOW_CURRENT_CAPTURE_TIMEOUT_MS || 90000);

const targets = {
  todayView: {
    aliases: ["today", "todayView"],
    filename: "eyeflow-dashboard-initial.png",
    requestedView: "todayView",
    visibleView: "todayView",
    captureState: "default"
  },
  "today-session": {
    aliases: ["today-session", "todaySession", "session"],
    filename: "eyeflow-dashboard-session.png",
    requestedView: "todayView",
    visibleView: "todayView",
    captureState: "session active"
  },
  "today-session-settings": {
    aliases: ["today-session-settings", "todaySessionSettings", "session-settings", "sessionSettings"],
    filename: "eyeflow-dashboard-session-settings.png",
    requestedView: "todayView",
    visibleView: "todayView",
    captureState: "session settings open"
  },
  "today-auto-tracking": {
    aliases: ["today-auto-tracking", "todayAutoTracking", "auto-tracking", "autoTracking"],
    filename: "eyeflow-dashboard-auto-tracking.png",
    requestedView: "todayView",
    visibleView: "todayView",
    captureState: "auto tracking"
  },
  rhythmView: {
    aliases: ["settings", "rhythm", "rhythmView"],
    filename: "eyeflow-settings-clean.png",
    requestedView: "rhythmView",
    visibleView: "rhythmView",
    captureState: "default"
  },
  "settings-ordinary": {
    aliases: ["settings-ordinary", "settingsOrdinary", "ordinary-settings"],
    filename: "eyeflow-settings-ordinary.png",
    requestedView: "rhythmView",
    visibleView: "rhythmView",
    captureState: "ordinary mode"
  },
  profileView: {
    aliases: ["profile", "recap", "profileView"],
    filename: "eyeflow-profile-clean.png",
    requestedView: "profileView",
    visibleView: "profileView",
    captureState: "default"
  },
  "profile-share-card": {
    aliases: ["profile-share-card", "profileShareCard", "share-card"],
    filename: "eyeflow-profile-share-card.png",
    requestedView: "profileView",
    visibleView: "profileView",
    captureState: "share card"
  },
  "onboarding-active": {
    aliases: ["onboarding", "onboarding-active"],
    filename: "eyeflow-onboarding-active.png",
    requestedView: "todayView",
    visibleView: "todayView",
    onboardingVisible: true,
    captureState: "onboarding active"
  },
  "break-lock-active": {
    aliases: ["break-lock", "break-lock-active"],
    filename: "eyeflow-break-lock-active.png",
    requestedView: "break-lock",
    visibleView: "",
    captureState: "break-lock active"
  },
  "force-return": {
    aliases: ["force-return", "forceReturn"],
    filename: "eyeflow-force-return.png",
    requestedView: "rhythmView",
    visibleView: "rhythmView",
    captureState: "force-return"
  }
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function metadataPathFor(filename) {
  return path.join(captureDir, filename.replace(/\.png$/i, ".metadata.json"));
}

function normalizeTarget(input) {
  const value = String(input || "").trim();
  if (!value) return null;
  return Object.entries(targets).find(([, target]) => target.aliases.includes(value))?.[0] || null;
}

function electronBinary() {
  const bin = process.platform === "win32"
    ? path.join(root, "node_modules", ".bin", "electron.cmd")
    : path.join(root, "node_modules", ".bin", "electron");
  if (!fs.existsSync(bin)) {
    throw new Error(`Missing Electron binary: ${bin}`);
  }
  return bin;
}

function readMetadata(target) {
  const metadataPath = metadataPathFor(target.filename);
  if (!fs.existsSync(metadataPath)) return null;
  return JSON.parse(fs.readFileSync(metadataPath, "utf8"));
}

function validateMetadata(metadata, target) {
  const failures = [];
  const requiredFields = [
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
  ];
  requiredFields.forEach((field) => {
    if (metadata[field] === undefined || metadata[field] === null) {
      failures.push(`missing metadata.${field}`);
    }
  });
  if (metadata.filename !== target.filename) failures.push(`filename=${metadata.filename}, expected ${target.filename}`);
  if (metadata.requestedView !== target.requestedView) failures.push(`requestedView=${metadata.requestedView}, expected ${target.requestedView}`);
  if (metadata.visibleView !== target.visibleView) failures.push(`visibleView=${metadata.visibleView}, expected ${target.visibleView}`);
  if (metadata.captureState !== target.captureState) failures.push(`captureState=${metadata.captureState}, expected ${target.captureState}`);
  if (target.onboardingVisible !== undefined && metadata.onboardingVisible !== target.onboardingVisible) {
    failures.push(`onboardingVisible=${metadata.onboardingVisible}, expected ${target.onboardingVisible}`);
  }
  if (metadata.stateMatchesRequest !== true) {
    failures.push(`stateMatchesRequest=${metadata.stateMatchesRequest}; ${metadata.stateMismatches?.join("; ") || "no mismatch details"}`);
  }
  if (!String(metadata.mainTextSnapshot || "").trim()) {
    failures.push("mainTextSnapshot is empty");
  }
  if (failures.length) {
    throw new Error(failures.join("; "));
  }
}

function basisText(metadata) {
  return [
    "本次评分基于：",
    `截图：${path.join(captureDir, metadata.filename)}`,
    `时间：${metadata.timestamp}`,
    `visibleView：${metadata.visibleView}`,
    `状态：${metadata.captureState}`
  ].join("\n");
}

async function main() {
  const requested = normalizeTarget(process.argv[2] || "todayView");
  if (!requested) {
    throw new Error(`Unknown capture target "${process.argv[2] || ""}". Use one of: ${Object.keys(targets).join(", ")}`);
  }
  const target = targets[requested];
  fs.rmSync(captureDir, { recursive: true, force: true });
  fs.mkdirSync(captureDir, { recursive: true });

  const env = {
    ...process.env,
    EYEFLOW_CURRENT_CAPTURE: requested,
    EYEFLOW_DEBUG_CAPTURE: "1",
    EYEFLOW_DEBUG_CAPTURE_DIR: captureDir,
    EYEFLOW_USER_DATA_DIR: path.join(captureDir, "user-data")
  };
  if (requested === "onboarding-active") env.EYEFLOW_DEBUG_ONBOARDING = "1";
  if (requested === "break-lock-active" || requested === "force-return") env.EYEFLOW_DEBUG_FORCE_PREVIEW = "1";
  if (requested === "settings-ordinary") {
    env.EYEFLOW_CURRENT_CAPTURE = "settings-ordinary,rhythmView";
    env.EYEFLOW_DEBUG_ACCESSIBILITY_TRUSTED = "0";
  }

  const child = spawn(electronBinary(), ["."], {
    cwd: root,
    env,
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
  let metadata = null;
  while (Date.now() - startedAt < timeoutMs) {
    metadata = readMetadata(target);
    if (metadata) break;
    if (child.exitCode !== null || child.signalCode !== null) break;
    await sleep(500);
  }

  child.kill("SIGTERM");
  await sleep(500);
  if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");

  if (!metadata) {
    throw new Error(`Timed out waiting for ${target.filename}\n${output.split(/\r?\n/).slice(-24).join("\n")}`);
  }
  validateMetadata(metadata, target);
  console.log(basisText(metadata));
  console.log(`metadata：${metadataPathFor(target.filename)}`);
}

main().catch((error) => {
  console.error("[capture:current] FAILED.", error.message);
  process.exitCode = 1;
});
