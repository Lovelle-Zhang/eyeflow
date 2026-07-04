#!/usr/bin/env node

// A2 (cross-store) — 口径 consistency between the two rest bookkeeping stores:
// the event stream (recovery_event rows -> eyeflow-metrics.js aggregates) and
// the reminderStats counters (shown/completed/snoozed/ignored/autoBreaks).
//
// The two stores can only stay reconcilable if:
//   1. every recovery_event is born with an explicit `mode` + `completed`
//      (otherwise isUserRecovery / natural-away filters become guesswork), and
//   2. the counters have a single writer per field (the closePendingReminder
//      guard), co-traveling with the event append (completeRecovery closes the
//      pending reminder as "completed" in the same flow).
//
// This smoke pins both plus the classification of the four REAL event shapes
// the app emits. A full flow-level behavioral test (drive the DOM, assert the
// counter and the event advance together) needs the jsdom harness planned for
// the render-收口 phase; until then this is the fence that keeps the stores
// reconcilable at the source level.

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(cond, label) {
  if (!cond) throw new Error(`FAIL: ${label}`);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`FAIL: ${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function loadMetrics() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  new vm.Script(read("eyeflow-metrics.js"), { filename: "eyeflow-metrics.js" }).runInContext(sandbox);
  return sandbox.window.EyeFlowMetrics;
}

function countOccurrences(source, needle) {
  return source.split(needle).length - 1;
}

function functionBody(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert(start !== -1, `source defines function ${name}`);
  const next = source.indexOf("\n    function ", start + 1);
  return source.slice(start, next === -1 ? source.length : next);
}

function main() {
  const m = loadMetrics();
  const indexHtml = read("index.html");

  // --- 1. the four REAL shapes the app emits classify unambiguously -------
  // Mirrors the four appendDataEvent("recovery_event") sites in index.html:
  const lifecycleRest = { type: "recovery_event", mode: "system-lifecycle", completed: true, durationSeconds: 120 };
  const interruptedForce = { type: "recovery_event", mode: "mixed", completed: false, durationSeconds: 0 };
  const userRecovery = { type: "recovery_event", mode: "mixed", completed: true, durationSeconds: 120 };
  const naturalAway = { type: "recovery_event", mode: "system-detected", completed: true, durationSeconds: 300 };
  const day = { events: [lifecycleRest, interruptedForce, userRecovery, naturalAway] };

  assertEqual(m.recoverySecondsForDay(day), 120, "only the user recovery counts as eye-care recovery");
  assertEqual(m.naturalAwaySecondsForDay(day), 300, "only system-detected counts as natural away");
  assertEqual(m.totalAwaySecondsForDay(day), 420, "total away = recovery + natural away, lifecycle/interrupted excluded");
  const stats = m.windowStats([day]);
  assertEqual(stats.recoveryCount, 1, "windowStats counts exactly the user recovery");
  assertEqual(stats.restSeconds, 120, "windowStats rest seconds = user recovery seconds");

  // --- 2. every recovery_event is born with explicit mode + completed -----
  const appendSites = [];
  let cursor = 0;
  for (;;) {
    const at = indexHtml.indexOf('appendDataEvent("recovery_event"', cursor);
    if (at === -1) break;
    appendSites.push(indexHtml.slice(at, at + 600));
    cursor = at + 1;
  }
  assert(appendSites.length >= 4, `all recovery_event append sites found (got ${appendSites.length}, expected >= 4)`);
  appendSites.forEach((site, i) => {
    assert(/\bmode:/.test(site), `recovery_event append site #${i + 1} declares an explicit mode`);
    assert(/\bcompleted:/.test(site), `recovery_event append site #${i + 1} declares explicit completed`);
  });

  // --- 3. single-writer discipline for the reminder counters --------------
  const closeBody = functionBody(indexHtml, "closePendingReminder");
  ["completed", "snoozed", "ignored"].forEach((field) => {
    const needle = `state.reminderStats.${field} += 1`;
    assertEqual(countOccurrences(indexHtml, needle), 1, `reminderStats.${field} has exactly one writer`);
    assert(closeBody.includes(needle), `reminderStats.${field} is written only inside closePendingReminder`);
  });
  assertEqual(countOccurrences(indexHtml, "state.reminderStats.shown += 1"), 1, "reminderStats.shown has exactly one writer");

  // --- 4. co-travel: user recovery event + completed counter move together
  const completeRecoveryBody = functionBody(indexHtml, "completeRecovery");
  assert(
    completeRecoveryBody.includes('closePendingReminder("completed")'),
    "completeRecovery closes the pending reminder as completed (event + counter co-travel)"
  );
  assert(
    completeRecoveryBody.includes('appendDataEvent("recovery_event"'),
    "completeRecovery appends the recovery_event in the same flow"
  );

  // --- 5. break-lock rests reach the stats (the two-hop IPC loop) --------
  // The full-screen forced rest runs in its own window; its completion only
  // reaches the event stream via: main broadcasts breakLock:finished →
  // preload onForceBreakDone → dashboard finishForceBreak → completeRecovery.
  // Two analysis passes independently mis-read this wiring as missing — pin
  // every hop so a refactor can't silently orphan forced rests from stats.
  const preloadJs = read("preload.js");
  assert(preloadJs.includes('ipcRenderer.on("breakLock:finished"'), "preload listens for breakLock:finished");
  assert(/onForceBreakDone:/.test(preloadJs), "preload exposes onForceBreakDone");
  const mainJs = read("main.js");
  assert(mainJs.includes('.send("breakLock:finished"'), "main broadcasts breakLock:finished to the dashboard");
  assert(
    /onForceBreakDone\(\(payload\) => finishForceBreak\(payload\)\)/.test(indexHtml),
    "dashboard consumes onForceBreakDone → finishForceBreak"
  );
  // Force break must close an open focus round, or the next round merges into
  // the orphaned id and inflates a later segment (S1).
  const startForceBreakBody = functionBody(indexHtml, "startForceBreak");
  assert(
    startForceBreakBody.includes("closeFocusSession("),
    "startForceBreak closes an open focus round before stopping the clock (no orphaned session)"
  );

  const finishForceBreakBody = functionBody(indexHtml, "finishForceBreak");
  assert(
    finishForceBreakBody.includes("completeRecovery("),
    "finishForceBreak completion path records the rest via completeRecovery"
  );
  assert(
    finishForceBreakBody.includes('appendDataEvent("recovery_event"'),
    "finishForceBreak interrupted path also records (completed: false)"
  );

  console.log("[smoke:metrics-consistency] PASSED. Event stream and reminder counters stay reconcilable.");
}

try {
  main();
} catch (error) {
  console.error(`[smoke:metrics-consistency] ${error.message}`);
  process.exit(1);
}
