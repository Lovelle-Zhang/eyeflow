#!/usr/bin/env node

const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { assertOnboardingVisualQuality } = require("./smoke-visual-utils");

const root = path.join(__dirname, "..");
const appBinary = process.env.EYEFLOW_APP_BINARY
  || path.join(root, "dist", "mac", "EyeFlow.app", "Contents", "MacOS", "EyeFlow");
const captureDir = process.env.EYEFLOW_SMOKE_CAPTURE_DIR
  || path.join(os.tmpdir(), "eyeflow-smoke");
const timeoutMs = Number(process.env.EYEFLOW_SMOKE_TIMEOUT_MS || 90000);
const logPath = path.join(captureDir, "eyeflow-smoke.log");

const expectedCaptures = [
  "eyeflow-dashboard-initial.png",
  "eyeflow-onboarding-active.png",
  "eyeflow-settings-clean.png",
  "eyeflow-profile-clean.png",
  "eyeflow-rest-guide.png",
  "eyeflow-companion.png",
  "eyeflow-companion-panel.png",
  "eyeflow-break-lock-active.png",
  "eyeflow-break-lock-complete.png",
  "eyeflow-force-return.png"
];

const expectedCaptureStates = [
  {
    name: "eyeflow-dashboard-initial.png",
    requestedView: "todayView",
    visibleView: "todayView",
    pageTitle: "今天",
    activeNav: "今天",
    onboardingVisible: false,
    captureState: "default",
    requiredText: ["准备开始这一轮", "Mira 会陪你记得休息", "开始这一轮"],
    forbiddenText: ["先校准今天", "今天还没给眼睛打分", "状态 未校准"]
  },
  {
    name: "eyeflow-onboarding-active.png",
    requestedView: "todayView",
    visibleView: "todayView",
    onboardingVisible: true,
    captureState: "onboarding active",
    requiredText: ["专注工作时，也有人照顾你的眼睛", "不打断，不监视，安静待在桌面一角", "好，开始吧"],
    forbiddenText: ["眼睛现在怎么样", "开始第一轮", "打开权限"]
  },
  {
    name: "eyeflow-settings-clean.png",
    requestedView: "rhythmView",
    visibleView: "rhythmView",
    pageTitle: "设置",
    activeNav: "设置",
    onboardingVisible: false,
    captureState: "default",
    requiredText: ["恢复节奏", "提醒边界", "增强桌面感知"]
  },
  {
    name: "eyeflow-profile-clean.png",
    requestedView: "profileView",
    visibleView: "profileView",
    pageTitle: "这几天",
    activeNav: "这几天",
    onboardingVisible: false,
    captureState: "default",
    requiredText: ["下一轮建议", "今日分享卡", "今天就到这里了"]
  },
  {
    name: "eyeflow-companion-panel.png",
    requestedView: "companion-panel",
    visibleView: "",
    pageTitle: "Mira Panel",
    activeNav: "",
    onboardingVisible: false,
    captureState: "companion panel",
    requiredText: ["Mira", "舒适区"]
  },
  {
    name: "eyeflow-break-lock-active.png",
    requestedView: "break-lock",
    visibleView: "",
    pageTitle: "EyeFlow Rest",
    activeNav: "",
    onboardingVisible: false,
    captureState: "break-lock active",
    requiredText: ["Mira 带你离开屏幕一下", "紧急退出"]
  },
  {
    name: "eyeflow-break-lock-complete.png",
    requestedView: "break-lock",
    visibleView: "",
    pageTitle: "EyeFlow Rest",
    activeNav: "",
    onboardingVisible: false,
    captureState: "force-return",
    requiredText: ["Mira 已经守完这段时间", "回到 EyeFlow"]
  },
  {
    name: "eyeflow-rest-guide.png",
    requestedView: "todayView",
    visibleView: "todayView",
    onboardingVisible: false,
    breakOverlayVisible: true,
    captureState: "rest guide active",
    requiredText: ["看向远处", "不用盯着屏幕", "我回来了", "稍后提醒"],
    forbiddenText: ["给 Mira 一个颜色", "只选颜色", "蓝", "绿", "白", "灰", "其他"]
  },
  {
    name: "eyeflow-force-return.png",
    requestedView: "rhythmView",
    visibleView: "rhythmView",
    pageTitle: "设置",
    activeNav: "设置",
    onboardingVisible: false,
    returnReady: true,
    finalVisibleView: "rhythmView",
    captureState: "force-return",
    requiredText: ["预览完成"]
  }
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
    const metadataPath = metadataPathForCapture(filePath);
    const expected = expectedCaptureStates.find((item) => item.name === name);
    let size = 0;
    let metadataSize = 0;
    let metadataOk = false;
    let metadataReason = "missing metadata";
    try {
      size = fs.statSync(filePath).size;
    } catch {
      size = 0;
    }
    try {
      metadataSize = fs.statSync(metadataPath).size;
    } catch {
      metadataSize = 0;
    }
    if (metadataSize > 20 && !expected) {
      metadataOk = true;
      metadataReason = "metadata present";
    } else if (metadataSize > 20) {
      try {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
        const text = String(metadata.mainTextSnapshot || "");
        const afterText = String(metadata.afterState?.mainTextSnapshot || "");
        const requiredText = expected?.requiredText || [];
        const hasRequiredText = requiredText.every((item) => text.includes(item) || afterText.includes(item));
        metadataOk = metadata.stateMatchesRequest === true && hasRequiredText;
        metadataReason = metadataOk
          ? "ok"
          : `stateMatchesRequest=${metadata.stateMatchesRequest}; requiredText=${hasRequiredText}`;
      } catch (error) {
        metadataReason = `metadata parse failed: ${error.message}`;
      }
    }
    return {
      name,
      filePath,
      metadataPath,
      ok: size > 1024 && metadataSize > 20 && metadataOk,
      size,
      metadataSize,
      metadataOk,
      metadataReason
    };
  });
}

function metadataPathForCapture(filePath) {
  return filePath.replace(/\.png$/i, ".metadata.json");
}

function tail(text, lines = 28) {
  return text.split(/\r?\n/).slice(-lines).join("\n");
}

function runtimeErrorDiagnostics(output) {
  return output
    .split(/\r?\n/)
    .filter((line) => /\[EyeFlow:[^\]]+\]\s+.*\b(Uncaught|ReferenceError|TypeError|SyntaxError|RangeError)\b/i.test(line));
}

function assertOnboardingDomProbe(output) {
  const match = output.match(/\[EyeFlow:debug\] onboarding (\{[^\n]+\})/);
  if (!match) {
    throw new Error("debug onboarding DOM probe did not emit JSON");
  }

  let probe = null;
  try {
    probe = JSON.parse(match[1]);
  } catch (error) {
    throw new Error(`debug onboarding DOM probe JSON is invalid: ${error.message}`);
  }

  const checks = [
    [probe.onboardingVisible === true, "onboarding overlay is visible"],
    [probe.pillText === "", "onboarding removes the redundant intro label"],
    [probe.sentenceText === "专注工作时，也有人照顾你的眼睛。", "onboarding companion-first sentence is present"],
    [probe.privacyText.includes("不打断，不监视，安静待在桌面一角。"), "onboarding trust and desktop companion copy are merged"],
    [probe.privacyText.includes("只是帮你记得休息。"), "onboarding simple value copy is present"],
    [probe.primaryActionText === "好，开始吧", "onboarding primary action copy is present"],
    [probe.primaryActionVisible === true, "onboarding primary action is inside the viewport"],
    [probe.introVisible === true, "onboarding intro is inside the viewport"],
    [probe.actionPosition === "static", "onboarding action bar is part of the compact sheet"],
    [probe.hasForcedChoices === false, "onboarding removes forced first-run choices"],
    [probe.hasPermissionButton === false, "onboarding removes first-screen permission button"]
  ];
  const missing = checks
    .filter(([ok]) => !ok)
    .map(([, label]) => label);

  if (missing.length) {
    throw new Error(`debug onboarding DOM probe missing: ${missing.join(", ")}`);
  }
  return `visible=${probe.onboardingVisible}, action=${probe.actionPosition}, choices=${probe.hasForcedChoices}`;
}

function assertDashboardViewLayoutProbe(output) {
  const probes = parseDashboardViewProbes(output);
  const probe = probes.find((item) => item.requestedView === "rhythmView") || probes[0];
  if (!probe) {
    throw new Error("debug dashboard view layout probe did not emit JSON");
  }

  const layout = probe.layout || {};
  const clipped = Array.isArray(layout.clippedControls) ? layout.clippedControls : [];
  const overflow = Array.isArray(layout.overflowElements) ? layout.overflowElements : [];
  const toastOverlaps = Array.isArray(probe.toastSafeZone?.overlaps) ? probe.toastSafeZone.overlaps : [];
  const failures = [];
  if (probe.visibleView !== "rhythmView") failures.push(`visibleView=${probe.visibleView || "missing"}`);
  if (probe.onboardingHidden !== true) failures.push("onboarding overlay still visible");
  if (Number(layout.scrollXOverflow || 0) > 0) failures.push(`horizontal overflow ${layout.scrollXOverflow}px`);
  if (clipped.length) failures.push(`clipped controls: ${clipped.map((item) => item.text).join(", ")}`);
  if (overflow.length) failures.push(`overflow elements: ${overflow.map((item) => item.className || item.tag).join(", ")}`);
  if (toastOverlaps.length) failures.push(`toast overlaps safe-zone elements: ${toastOverlaps.map((item) => item.text || item.selector).join(", ")}`);

  if (failures.length) {
    throw new Error(failures.join("; "));
  }

  return `view=${probe.visibleView}, overflow=${layout.scrollXOverflow || 0}, clipped=${clipped.length}, toastOverlaps=${toastOverlaps.length}`;
}

function parseDashboardViewProbes(output) {
  return Array.from(output.matchAll(/\[EyeFlow:debug\] dashboard view json (\{[^\n]+\})/g))
    .map((match) => {
      try {
        return JSON.parse(match[1]);
      } catch (error) {
        throw new Error(`debug dashboard view layout JSON is invalid: ${error.message}`);
      }
    });
}

function readCaptureMetadata(captureName) {
  const filePath = path.join(captureDir, captureName);
  const metadataPath = metadataPathForCapture(filePath);
  if (!fs.existsSync(metadataPath)) {
    throw new Error(`${captureName} is missing metadata file`);
  }
  try {
    return JSON.parse(fs.readFileSync(metadataPath, "utf8"));
  } catch (error) {
    throw new Error(`${captureName} metadata JSON is invalid: ${error.message}`);
  }
}

function assertField(metadata, expected, field, failures) {
  if (expected[field] === undefined) return;
  if (metadata[field] !== expected[field]) {
    failures.push(`${field}=${JSON.stringify(metadata[field])}, expected ${JSON.stringify(expected[field])}`);
  }
}

function assertAfterField(metadata, expected, field, failures) {
  if (expected[field] === undefined) return;
  const afterValue = metadata.afterState?.[field];
  if (afterValue !== expected[field]) {
    failures.push(`afterState.${field}=${JSON.stringify(afterValue)}, expected ${JSON.stringify(expected[field])}`);
  }
}

function assertScreenshotStateGate() {
  const metadataItems = expectedCaptures.map((name) => readCaptureMetadata(name));
  const failures = [];
  for (const metadata of metadataItems) {
    const capturePath = path.join(captureDir, metadata.filename || "");
    if (!metadata.filename || !expectedCaptures.includes(metadata.filename)) {
      failures.push(`${metadata.filename || "unknown"} is not an expected capture filename`);
    }
    if (metadata.filename && !fs.existsSync(capturePath)) {
      failures.push(`${metadata.filename} metadata points at a missing PNG`);
    }
    ["requestedView", "visibleView", "pageTitle", "activeNav", "onboardingVisible", "timestamp", "captureReason", "captureState", "readinessActionButtonMetrics", "mainTextSnapshot", "stateMatchesRequest"].forEach((field) => {
      if (metadata[field] === undefined || metadata[field] === null) {
        failures.push(`${metadata.filename} missing metadata.${field}`);
      }
    });
    if (!metadata.afterState) {
      failures.push(`${metadata.filename} missing afterState verification`);
    }
    const expected = expectedCaptureStates.find((item) => item.name === metadata.filename);
    if (expected && metadata.stateMatchesRequest !== true) {
      failures.push(`${metadata.filename} stateMatchesRequest=${metadata.stateMatchesRequest}; ${(metadata.stateMismatches || []).join("; ")}`);
    }
  }

  for (const expected of expectedCaptureStates) {
    const metadata = metadataItems.find((item) => item.filename === expected.name);
    if (!metadata) {
      failures.push(`${expected.name} metadata was not written`);
      continue;
    }
    assertField(metadata, expected, "requestedView", failures);
    assertField(metadata, expected, "visibleView", failures);
    assertField(metadata, expected, "pageTitle", failures);
    assertField(metadata, expected, "activeNav", failures);
    assertField(metadata, expected, "onboardingVisible", failures);
    assertField(metadata, expected, "breakOverlayVisible", failures);
    assertField(metadata, expected, "captureState", failures);
    assertField(metadata, expected, "returnReady", failures);
    assertField(metadata, expected, "finalVisibleView", failures);
    if (expected.returnReady === true && Number(metadata.attempts || 0) <= 0) {
      failures.push(`${expected.name} metadata attempts=${metadata.attempts || "missing"}`);
    }
    assertAfterField(metadata, expected, "visibleView", failures);
    assertAfterField(metadata, expected, "pageTitle", failures);
    assertAfterField(metadata, expected, "activeNav", failures);
    assertAfterField(metadata, expected, "onboardingVisible", failures);
    assertAfterField(metadata, expected, "breakOverlayVisible", failures);

    const beforeText = String(metadata.mainTextSnapshot || "");
    for (const text of expected.requiredText || []) {
      if (!beforeText.includes(text)) {
        failures.push(`${expected.name} metadata text is missing ${JSON.stringify(text)}`);
      }
    }
    for (const text of expected.forbiddenText || []) {
      if (beforeText.includes(text)) {
        failures.push(`${expected.name} metadata text should not include ${JSON.stringify(text)}`);
      }
    }
  }

  if (failures.length) {
    throw new Error(failures.join("; "));
  }

  return expectedCaptureStates
    .map((expected) => {
      const metadata = metadataItems.find((item) => item.filename === expected.name);
      return `${expected.name}: view=${metadata.visibleView || "n/a"}, title=${metadata.pageTitle || "n/a"}, onboarding=${metadata.onboardingVisible}`;
    })
    .join(" | ");
}

function assertProfileViewProbe(output) {
  const probes = parseDashboardViewProbes(output);
  const probe = probes.find((item) => item.requestedView === "profileView");
  if (!probe) {
    throw new Error("profileView dashboard probe did not emit JSON");
  }

  const layout = probe.layout || {};
  const clipped = Array.isArray(layout.clippedControls) ? layout.clippedControls : [];
  const overflow = Array.isArray(layout.overflowElements) ? layout.overflowElements : [];
  const firstScreen = String(probe.mainViewportText || "");
  const forbidden = [
    "设置",
    "今日数据摘要",
    "状态来源",
    "采集状态",
    "数据完整度",
    "模型版本",
    "本地事件流",
    "JSON",
    "CSV",
    "评分拆解"
  ].filter((text) => firstScreen.includes(text));
  const failures = [];
  if (probe.visibleView !== "profileView") failures.push(`visibleView=${probe.visibleView || "missing"}`);
  if (!["复盘", "这几天"].includes(probe.pageTitleText)) {
    failures.push(`pageTitle=${probe.pageTitleText || "missing"}`);
  }
  if (!["复盘", "这几天"].includes(probe.activeNavText)) {
    failures.push(`activeNav=${probe.activeNavText || "missing"}`);
  }
  if (forbidden.length) failures.push(`profile first screen contains: ${forbidden.join(", ")}`);
  if (Number(layout.scrollXOverflow || 0) > 0) failures.push(`horizontal overflow ${layout.scrollXOverflow}px`);
  if (clipped.length) failures.push(`clipped controls: ${clipped.map((item) => item.text).join(", ")}`);
  if (overflow.length) failures.push(`overflow elements: ${overflow.map((item) => item.className || item.tag).join(", ")}`);

  if (failures.length) {
    throw new Error(failures.join("; "));
  }

  return `view=${probe.visibleView}, title=${probe.pageTitleText}, active=${probe.activeNavText}, forbidden=${forbidden.length}`;
}

function assertForceReturnToastSafeZone(output) {
  const match = output.match(/\[EyeFlow:debug\] force return dashboard json (\{[^\n]+\})/);
  if (!match) {
    throw new Error("force-return dashboard probe did not emit JSON");
  }

  let probe = null;
  try {
    probe = JSON.parse(match[1]);
  } catch (error) {
    throw new Error(`force-return dashboard JSON is invalid: ${error.message}`);
  }

  const overlaps = Array.isArray(probe.toastSafeZone?.overlaps) ? probe.toastSafeZone.overlaps : [];
  const failures = [];
  if (probe.visibleView !== "rhythmView") failures.push(`visibleView=${probe.visibleView || "missing"}`);
  if (probe.returnReady !== true) failures.push("force return was not ready");
  if (probe.finalVisibleView !== "rhythmView") failures.push(`finalVisibleView=${probe.finalVisibleView || "missing"}`);
  if (probe.previewHint !== true) failures.push("force preview result is not visible");
  if (overlaps.length) failures.push(`toast overlaps safe-zone elements: ${overlaps.map((item) => item.text || item.selector).join(", ")}`);

  if (failures.length) {
    throw new Error(failures.join("; "));
  }

  return `view=${probe.visibleView}, returnReady=${probe.returnReady}, attempts=${probe.attempts || 0}, finalVisibleView=${probe.finalVisibleView || ""}, previewHint=${probe.previewHint}, toastAnchor=${probe.toastSafeZone?.anchor || ""}, toastOverlaps=${overlaps.length}`;
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
      EYEFLOW_USER_DATA_DIR: path.join(captureDir, "user-data"),
      EYEFLOW_DEBUG_VIEW: "rhythmView,profileView",
      EYEFLOW_DEBUG_ONBOARDING: "1",
      EYEFLOW_DEBUG_REST_CLICK: "1",
      EYEFLOW_DEBUG_FORCE_PREVIEW: "1",
      EYEFLOW_DEBUG_COPY_FEEDBACK: "1"
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
  const runtimeErrors = runtimeErrorDiagnostics(output);
  if (runtimeErrors.length) {
    console.error("[smoke] FAILED. Runtime errors observed:");
    runtimeErrors.slice(-8).forEach((line) => {
      console.error(`  - ${line}`);
    });
    console.error("[smoke] Log tail:");
    console.error(tail(output));
    process.exitCode = 1;
    return;
  }

  if (/\[EyeFlow:debug\] force return unavailable/.test(output)) {
    console.error("[smoke] FAILED. Force preview return button was unavailable.");
    console.error("[smoke] Log tail:");
    console.error(tail(output, 42));
    process.exitCode = 1;
    return;
  }

  if (missing.length) {
    console.error("[smoke] FAILED. Missing captures:");
    missing.forEach((item) => {
      console.error(`  - ${item.name} (${item.size} bytes, metadata ${item.metadataSize} bytes, ${item.metadataReason})`);
    });
    console.error("[smoke] Log tail:");
    console.error(tail(output));
    process.exitCode = 1;
    return;
  }

  let onboardingDomDiagnostics = "";
  let dashboardLayoutDiagnostics = "";
  let profileViewDiagnostics = "";
  let forceReturnToastDiagnostics = "";
  let screenshotStateDiagnostics = "";
  try {
    onboardingDomDiagnostics = assertOnboardingDomProbe(output);
  } catch (error) {
    console.error("[smoke] FAILED. Onboarding DOM layout probe failed:");
    console.error(`  - ${error.message}`);
    console.error("[smoke] Log tail:");
    console.error(tail(output, 42));
    process.exitCode = 1;
    return;
  }
  try {
    dashboardLayoutDiagnostics = assertDashboardViewLayoutProbe(output);
  } catch (error) {
    console.error("[smoke] FAILED. Dashboard layout probe failed:");
    console.error(`  - ${error.message}`);
    console.error("[smoke] Log tail:");
    console.error(tail(output, 42));
    process.exitCode = 1;
    return;
  }
  try {
    profileViewDiagnostics = assertProfileViewProbe(output);
  } catch (error) {
    console.error("[smoke] FAILED. Profile view capture probe failed:");
    console.error(`  - ${error.message}`);
    console.error("[smoke] Log tail:");
    console.error(tail(output, 42));
    process.exitCode = 1;
    return;
  }
  try {
    forceReturnToastDiagnostics = assertForceReturnToastSafeZone(output);
  } catch (error) {
    console.error("[smoke] FAILED. Force-return toast safe-zone probe failed:");
    console.error(`  - ${error.message}`);
    console.error("[smoke] Log tail:");
    console.error(tail(output, 42));
    process.exitCode = 1;
    return;
  }
  try {
    screenshotStateDiagnostics = assertScreenshotStateGate();
  } catch (error) {
    console.error("[smoke] FAILED. Screenshot state/content gate failed:");
    console.error(`  - ${error.message}`);
    console.error("[smoke] Log tail:");
    console.error(tail(output, 42));
    process.exitCode = 1;
    return;
  }

  let onboardingDiagnostics = null;
  try {
    onboardingDiagnostics = assertOnboardingVisualQuality(path.join(captureDir, "eyeflow-onboarding-active.png"));
  } catch (error) {
    console.error("[smoke] FAILED. Onboarding visual readability check failed:");
    console.error(`  - ${error.message}`);
    console.error("[smoke] Capture:", path.join(captureDir, "eyeflow-onboarding-active.png"));
    process.exitCode = 1;
    return;
  }

  const voicePreserved = /voicePreserved:\s*true/.test(output);
  const feedbackCopied = /feedbackProbe:\s*\{[\s\S]*copied:\s*true/.test(output);
  if (!feedbackCopied) {
    console.error("[smoke] FAILED. Feedback copy probe did not confirm clipboard write.");
    console.error("[smoke] Log tail:");
    console.error(tail(output, 42));
    process.exitCode = 1;
    return;
  }
  console.log("[smoke] PASSED. Packaged EyeFlow rendered all required views.");
  status.forEach((item) => {
    console.log(`  - ${item.name} (${item.size} bytes, metadata ${item.metadataSize} bytes)`);
  });
  console.log("[smoke] Onboarding DOM layout:", onboardingDomDiagnostics);
  console.log("[smoke] Dashboard layout:", dashboardLayoutDiagnostics);
  console.log("[smoke] Profile view capture:", profileViewDiagnostics);
  console.log("[smoke] Force-return toast safe-zone:", forceReturnToastDiagnostics);
  console.log("[smoke] Screenshot state gate:", screenshotStateDiagnostics);
  console.log("[smoke] Onboarding pill readability:", onboardingDiagnostics.pill);
  console.log("[smoke] Onboarding action visibility:", onboardingDiagnostics.action);
  console.log("[smoke] Force preview preserved voice setting:", voicePreserved ? "yes" : "not observed");
  console.log("[smoke] Feedback copy probe:", feedbackCopied ? "passed" : "not observed");
  console.log("[smoke] Log:", logPath);
}

main().catch((error) => {
  console.error("[smoke] FAILED.", error.message);
  process.exitCode = 1;
});
