#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

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

function main() {
  const indexHtml = read("index.html");
  const mainJs = read("main.js");
  const intensityDocs = read("docs/EYEFLOW_INTENSITY_LEVELS.md");
  const packageJson = JSON.parse(read("package.json"));
  const verifyJs = read("scripts/verify.js");

  ["L1: Quiet", "L2: Light Prompt", "L3: Clear Prompt", "L4: Force Rest", "Cross-Process Data Flow", "Install And Runtime Validation"].forEach((heading) => {
    assertIncludes(intensityDocs, heading, `intensity docs include ${heading}`);
  });
  assertIncludes(intensityDocs, "currentIntervention(load)", "intensity docs name the renderer intervention source");
  assertIncludes(intensityDocs, "applyInterventionBehavior(state)", "intensity docs name the main-process channel coordinator");
  assertIncludes(intensityDocs, "startIslandMicroRest()", "intensity docs name the green countdown rest entry point");
  assertIncludes(intensityDocs, "process elapsed time must be newer than the install", "intensity docs cover old-process install drift");

  assertIncludes(indexHtml, "L1</strong>只改变状态球、表情和文字，不弹气泡，也不打断你。", "L1 user-facing rule stays quiet-only");
  assertMatches(
    indexHtml,
    /state\.settings\.intensity === "quiet" \|\| deepWorkMiraOnly[\s\S]*return \{[\s\S]*level: 1,[\s\S]*title: "只让 Mira 轻轻变化"/,
    "L1 behavior level is always non-interrupting"
  );

  assertIncludes(indexHtml, "L2</strong>到恢复断点时轻提一次", "L2 user-facing rule describes a break-point prompt");
  assertMatches(
    indexHtml,
    /const standardEarly = state\.settings\.intensity === "standard";[\s\S]*level: standardEarly \? 1 : 2,[\s\S]*title: standardEarly \? "提前观察中" : "提前观察眨眼或远眺"/,
    "L2 pre-break phase stays visual-only"
  );
  assertMatches(
    indexHtml,
    /if \(elapsedMinutes >= focusTargetMinutes\) \{\s*return \{\s*level: state\.settings\.intensity === "clear" \? 3 : 2,\s*displayLevel: chosenDisplayLevel,\s*title: "到恢复断点"/,
    "L2 reaches behavior level 2 at the break point, while L3 reaches behavior level 3 immediately"
  );

  assertIncludes(indexHtml, "L3</strong>状态信号偏高或明显超出目标时更明确", "L3 user-facing rule describes clear escalation");
  assertIncludes(indexHtml, "即使 Mira 在屏", "L3 copy states the real break-point prompt is clear even while Mira is visible");
  assertIncludes(mainJs, "L3 明确 — 到点胶囊+通知", "L3 menu copy matches the real break-point channel");
  assertMatches(
    indexHtml,
    /if \(elapsedMinutes >= focusTargetMinutes\) \{\s*return \{\s*level: state\.settings\.intensity === "clear" \? 3 : 2,[\s\S]*title: "到恢复断点"/,
    "L3 at the normal break point escalates before the +10 minute obvious-overrun branch"
  );
  assertMatches(
    indexHtml,
    /state\.settings\.intensity === "clear" && elapsedMinutes >= focusTargetMinutes \+ 10[\s\S]*level: 3,[\s\S]*title: "已经比目标久了不少"/,
    "L3 obvious overrun escalates to behavior level 3"
  );
  assertMatches(
    indexHtml,
    /function\s+shouldSurfaceReminder\(intervention, load\)[\s\S]*const clearBreakDue = level >= 3[\s\S]*elapsedSeconds >= targetSeconds;[\s\S]*if \(clearBreakDue\) return true;[\s\S]*if \(isBusyForReminder\(\)\) return false;/,
    "L3 break-point reminder cannot be swallowed by busy activity"
  );
  assertMatches(
    indexHtml,
    /function shouldHoldMiraSilence\(load\)[\s\S]*?const silenceBreakDue =[\s\S]*?if \(silenceBreakDue\) return false;/,
    "silence gate can never swallow the real break point (2026-07-10 hard rule)"
  );
  assertMatches(
    indexHtml,
    /title: "到恢复断点"[\s\S]*title: "在恢复断点轻提示"/,
    "the real break-point escalation is evaluated before the natural-break light prompt (2026-07-10)"
  );
  assertMatches(
    indexHtml,
    /if \(state\.settings\.deepWorkMiraOnlyToggle && latestActivity\?\.isDeepWorkApp && elapsedSeconds >= targetSeconds \* 0\.55\) return true;/,
    "deep-work silence requires the explicit user toggle"
  );
  {
    const deepWorkFnStart = mainJs.indexOf("function isDeepWorkApp");
    if (deepWorkFnStart < 0) throw new Error("isDeepWorkApp missing from main.js");
    const deepWorkFn = mainJs.slice(deepWorkFnStart, mainJs.indexOf("}", deepWorkFnStart + 400) + 1);
    ["Google Chrome", '"Arc"', '"Safari"'].forEach((browser) => {
      if (deepWorkFn.includes(browser)) {
        throw new Error(`browsers must not be blanket deep-work apps: found ${browser} in isDeepWorkApp`);
      }
    });
  }
  assertMatches(
    mainJs,
    /const l3BreakPoint = level >= 3 && breakDue;[\s\S]*const showBubble = companionVisible && level >= 2 && !l3BreakPoint;[\s\S]*const showRest = islandEnabled && level >= 2 && \(companionExited \|\| l3BreakPoint\);[\s\S]*const showNotify = level >= 2 && \(companionExited \|\| l3BreakPoint\) && \(level >= 3 \|\| !islandEnabled\);/,
    "L3 real break point routes to green capsule plus system notification even if Mira is visible"
  );
  assertMatches(
    mainJs,
    /restDelivered = startIslandMicroRest\(islandRestMessage\(level\), state\.reminderId \|\| null\);[\s\S]*?const primaryOk = !primaryRestWanted \|\| restDelivered;[\s\S]*?if \(delivered\) \{\s*lastReminderAt = now;[\s\S]*?lastStableInterventionLevel = level;\s*pendingEscalationLevel = 0;\s*\}/,
    "reminder delivery is transactional: latch/cooldown consumed only after the channel confirmed (2026-07-10)"
  );
  assertMatches(
    mainJs,
    /const ESCALATION_DWELL_MS = 12 \* 1000;[\s\S]*if \(now - pendingEscalationSince >= ESCALATION_DWELL_MS\) \{\s*escalated = true;/,
    "an upward level flip must dwell before it may bypass the shared cooldown (2026-07-10)"
  );
  assertMatches(
    mainJs,
    /const REMINDER_NOTIFY_MIN_INTERVAL_MS = 60 \* 1000;[\s\S]*function notifyReminder\(message, \{ urgent = false \} = \{\}\)[\s\S]*?if \(!urgent && now - lastReminderNotifyAt < REMINDER_NOTIFY_MIN_INTERVAL_MS\)/,
    "reminder banners self-throttle to at most one per minute (2026-07-10)"
  );
  assertMatches(
    mainJs,
    /if \(showNotify\) \{\s*const sent = notifyReminder\(reminderMessage, \{ urgent: breakDue && !showRest \}\);/,
    "the coordinator uses the throttled reminder banner; the sole-channel break banner is urgent"
  );

  assertIncludes(indexHtml, "L4</strong>强制爱：只在你主动选择后启用", "L4 user-facing rule requires explicit opt-in");
  assertMatches(
    indexHtml,
    /state\.settings\.intensity === "force"[\s\S]*if \(elapsedMinutes >= focusTargetMinutes\) \{[\s\S]*level: 4,[\s\S]*title: "强制爱：全屏休息"/,
    "L4 reaches behavior level 4 only at the break point"
  );
  assertMatches(
    indexHtml,
    /function\s+renderInterventionStrategy\(load\)\s*\{[\s\S]*if \(intervention\.level >= 4\) \{[\s\S]*startForceBreak\(intervention\);[\s\S]*return true;[\s\S]*\}[\s\S]*maybeRecordReminder\(intervention, load\);/,
    "L4 bypasses ordinary reminders and enters force break"
  );
  assertMatches(
    indexHtml,
    /function\s+startForceBreak\(intervention, options = \{\}\)[\s\S]*if \(!options\.preview\) closePendingReminder\("ignored"\);[\s\S]*window\.eyeflowDesktop\.startForceBreak\(payload\);/,
    "L4 force break clears ordinary pending reminder state and enters the desktop bridge"
  );

  assertMatches(
    indexHtml,
    /const behaviorLevel = Number\(intervention\.level \|\| 1\);[\s\S]*const displayLevel = Number\(intervention\.displayLevel \|\| intervention\.level \|\| 1\);[\s\S]*interventionLevel: behaviorLevel,[\s\S]*interventionDisplayLevel: displayLevel,[\s\S]*breakDue,/,
    "renderer publishes behavior level, display level, and breakDue as separate cross-process facts"
  );
  assertMatches(
    mainJs,
    /function applyInterventionBehavior\(state\)[\s\S]*const level = Number\(state\.interventionLevel \|\| 1\);[\s\S]*const breakDue = Boolean\(state\.breakDue\);/,
    "main process drives channels from behavior level plus breakDue, not display labels"
  );

  if (packageJson.scripts?.["smoke:intensity"] !== "node scripts/smoke-intensity-matrix.js") {
    throw new Error("package script smoke:intensity is missing or changed");
  }
  assertIncludes(verifyJs, '["Check reminder intensity matrix", "smoke:intensity"]', "verify includes the L1-L4 matrix smoke");

  console.log("[smoke:intensity] PASSED. L1-L4 reminder behavior, copy, and channels are matrix-guarded.");
}

try {
  main();
} catch (error) {
  console.error("[smoke:intensity] FAILED.", error.message);
  process.exitCode = 1;
}
