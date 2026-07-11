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
    /title: intensity === "quiet" \? "只让 Mira 轻轻变化" : "轻轻提个醒"/,
    "L1 stays non-interrupting: level-1 intent keeps the quiet Mira-only title (P3 translation layer)"
  );

  assertIncludes(indexHtml, "L2</strong>到恢复断点时轻提一次", "L2 user-facing rule describes a break-point prompt");
  assertMatches(
    indexHtml,
    /if \(intent\.level === 1\) \{[\s\S]*?breakDue: false,/,
    "pre-break pressure (level 1) never carries breakDue (P3)"
  );
  assertMatches(
    indexHtml,
    /if \(intent\.level === 2\) \{[\s\S]*?breakDue: true,\s*title: "到恢复断点"/,
    "level-2 intent is the break point: breakDue with the break-point title (P3)"
  );

  assertIncludes(indexHtml, "L3</strong>状态信号偏高或明显超出目标时更明确", "L3 user-facing rule describes clear escalation");
  assertIncludes(indexHtml, "即使 Mira 在屏", "L3 copy states the real break-point prompt is clear even while Mira is visible");
  assertIncludes(mainJs, "L3 明确 — 到点胶囊+通知", "L3 menu copy matches the real break-point channel");
  assertMatches(
    indexHtml,
    /if \(intent\.level === 3\) \{[\s\S]*?breakDue: true,/,
    "level-3 intent always carries breakDue (P3)"
  );
  assertMatches(
    indexHtml,
    /title: "该好好歇一下了"/,
    "level-3 translation keeps a clear, honest escalation title (P3; 90min+skip gate lives in the engine)"
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
    /if \(!intervention\.breakDue\) return;/,
    "reminder recording is driven solely by the engine intent's breakDue (P3; naturalBreak/elapsed heuristics retired)"
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
    /const showBubble = companionVisible && level < 3;[\s\S]*const showRest = islandEnabled && !deepWorkQuiet && \(companionExited \|\| level >= 3\);[\s\S]*const showNotify = !deepWorkQuiet && \(companionExited \|\| level >= 3\) && \(level >= 3 \|\| !islandEnabled\);/,
    "level-3 intent routes to green capsule plus system notification even if Mira is visible (P3)"
  );
  assertMatches(
    mainJs,
    /function surfaceReminderChannels\(decision\)[\s\S]*?if \(!breakDue && now - lastSurfacedAt < SURFACE_MIN_INTERVAL_MS\)[\s\S]*?restDelivered = startIslandMicroRest\(islandRestMessage\(level\), reminderId \|\| null\);[\s\S]*?function applyInterventionBehavior\(state\)[\s\S]*?const surfaced = surfaceReminderChannels\(\{[\s\S]*?const primaryOk = !primaryRestWanted \|\| restDelivered;[\s\S]*?if \(delivered\) lastReminderAt = now;[\s\S]*?lastDeliveredIntentKey = intentKey;/,
    "reminder delivery is transactional through the single exit; the intent key is consumed only after the channel confirmed (P3)"
  );
  assertMatches(
    mainJs,
    /const intentKey = `\$\{level\}\|\$\{surface\}\|\$\{breakDue\}`;\s*const isNewIntent = intentKey !== lastDeliveredIntentKey;\s*if \(!isNewIntent && now - lastReminderAt < REMIND_REFRESH_MS\) return;/,
    "the coordinator consumes the monotonic intent as a level signal: one delivery per intent + gentle refresh (P3; dwell/escalated/breakBypass retired)"
  );
  assertMatches(
    mainJs,
    /reminder:resolve", \{[\s\S]*?restSeconds: ISLAND_LOOKAWAY_SECONDS/,
    "island resolve carries the look-away's real length from the sensor's single constant"
  );
  {
    // 事实纪律(2026-07-10, MIRA_LANGUAGE.md):通知可达的记忆句不得断言星期几——
    // 历史时间戳的账本可被误判污染,横幅里的"之前的周三"会被读成说错今天日期。
    const memoryFnStart = indexHtml.indexOf("function modeMemoryLine");
    if (memoryFnStart < 0) throw new Error("modeMemoryLine missing from index.html");
    const memoryFn = indexHtml.slice(memoryFnStart, indexHtml.indexOf("\n    }", memoryFnStart));
    if (memoryFn.includes("weekdayName")) {
      throw new Error("modeMemoryLine must not assert weekdays — time buckets only (事实纪律 2026-07-10)");
    }
  }
  assertIncludes(indexHtml, "以往${signal.bucket}", "mode memory speaks in real-time-consistent time buckets");
  assertMatches(
    indexHtml,
    /closeBreakRound\(\{\s*reminderStatus: "completed",\s*settle: \{ kind: "micro", seconds: Math\.max\(0, Number\(payload\.restSeconds\) \|\| 20\) \}\s*\}\);[\s\S]*?appendDataEvent\("recovery_event", \{[\s\S]*?durationSeconds: Math\.max\(0, Number\(payload\.restSeconds\) \|\| 20\),\s*mode: "island-micro",[\s\S]*?trigger: "island-micro",/,
    "a completed island micro-rest settles the engine as micro AND books the real recovery_event (P3 + X)"
  );
  // 岛完成必须与完整休息走同一条销账路径(closeBreakRound):关本轮 → rest-due 卡、
  // 菜单栏"休息"态、breakDue/闩锁自然回落。禁止在 resolve handler 里手抄轮次关闭。
  assertMatches(
    indexHtml,
    /function closeBreakRound\(\{ reminderStatus = "completed", settle = null \} = \{\}\) \{\s*state\.breaks \+= 1;\s*elapsedSeconds = 0;\s*startedAt = null;\s*sessionSource = "idle";\s*lastNudgeAt = 0;\s*const hadPending = closePendingReminder\(reminderStatus\);/,
    "closeBreakRound is the single round-closure path, now carrying the pressure settlement (P3)"
  );
  {
    const closureCopies = (indexHtml.match(/state\.breaks \+= 1;\s*elapsedSeconds = 0;\s*startedAt = null;\s*sessionSource = "idle";/g) || []).length;
    if (closureCopies !== 1) {
      throw new Error(`round-closure core must exist exactly once (inside closeBreakRound); found ${closureCopies} copies`);
    }
  }
  assertMatches(
    indexHtml,
    /restStartedBeforeAssessment = false;\s*closeBreakRound\(\{\s*reminderStatus: "completed",\s*settle: \{ kind: "full", seconds: Number\(els\.breakTarget\.value \|\| 0\) \}\s*\}\);/,
    "completeRecovery walks the same closeBreakRound path with a full pressure settlement (P3)"
  );
  assertMatches(
    indexHtml,
    /function closeBreakRound\(\{ reminderStatus = "completed", settle = null \} = \{\}\) \{[\s\S]*?state\.lastReminderAt = Date\.now\(\);[\s\S]*?settleReminderEngine\(settle\.kind, settle\.seconds\);[\s\S]*?return hadPending;/,
    "closing a round re-arms the record cooldown AND settles the pressure engine through the single exit (P3)"
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
    /if \(intent\.surface === "hard-full"\) \{\s*return \{\s*level: 4,[\s\S]*?title: "强制爱：全屏休息"/,
    "hard-full intent translates to level 4 and the existing force-break path (P3 decision 3)"
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
