#!/usr/bin/env node

// A2 — behavioral + data-口径 consistency test for the single metrics module.
//
// This is the test the string-only smoke suite could never be: it EXECUTES the
// aggregation functions and asserts the numbers, and it pins the cross-view
// invariant "one metric -> one function" — the same day must yield the same
// figure everywhere because every view routes through eyeflow-metrics.js.

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

function assertDeepEqual(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`FAIL: ${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function loadMetrics() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  new vm.Script(read("eyeflow-metrics.js"), { filename: "eyeflow-metrics.js" }).runInContext(sandbox);
  if (!sandbox.window.EyeFlowMetrics) {
    throw new Error("metrics export missing: window.EyeFlowMetrics");
  }
  return sandbox.window.EyeFlowMetrics;
}

function main() {
  const m = loadMetrics();

  // --- fixtures ---------------------------------------------------------
  // Two ended focus segments: wall-clock 1500s + 600s = 2100s. durationSeconds
  // is deliberately wrong (cumulative across pauses) to prove we use the span.
  const focusA = { type: "focus_session", phase: "ended", startedAt: "2026-06-20T10:00:00Z", endedAt: "2026-06-20T10:25:00Z", durationSeconds: 99999 };
  const focusB = { type: "focus_session", phase: "ended", startedAt: "2026-06-20T10:30:00Z", endedAt: "2026-06-20T10:40:00Z", durationSeconds: 0 };
  const focusRunning = { type: "focus_session", phase: "running", startedAt: "2026-06-20T11:00:00Z" }; // not ended -> 0
  const recUser = { type: "recovery_event", durationSeconds: 120 };                 // user-initiated
  const recIncomplete = { type: "recovery_event", durationSeconds: 200, completed: false };
  const recAuto = { type: "recovery_event", mode: "system-detected", durationSeconds: 300 };
  const recLifecycle = { type: "recovery_event", mode: "system-lifecycle", durationSeconds: 50 };
  const userRecord = { type: "daily_assessment", trigger: "manual_log" };
  const systemRecord = { type: "daily_assessment", trigger: "auto" };

  const events = [focusA, focusB, focusRunning, recUser, recIncomplete, recAuto, recLifecycle, userRecord, systemRecord];
  const day = { events };

  // --- focusSegmentSeconds: wall-clock, not durationSeconds -------------
  assertEqual(m.focusSegmentSeconds(focusA), 1500, "focusSegmentSeconds uses wall-clock span, not durationSeconds");
  assertEqual(m.focusSegmentSeconds(focusRunning), 0, "focusSegmentSeconds ignores non-ended segments");

  // --- recordedSecondsForDay: events sum, with snapshot fallback --------
  assertEqual(m.recordedSecondsForDay(day), 2100, "recordedSecondsForDay sums ended wall-clock segments");
  assertEqual(m.recordedSecondsForDay({ events, elapsedSeconds: 100 }), 2100, "events win when larger than snapshot");
  // Pins the legacy snapshot fallback so any future change is caught by a test,
  // not by a user noticing a wrong number.
  assertEqual(m.recordedSecondsForDay({ events, elapsedSeconds: 5000 }), 5000, "snapshot fallback wins for legacy days with no/low events");
  assertEqual(m.recordedSecondsForDay({}), 0, "empty day is zero, never NaN");

  // --- recovery vs natural-away filtering -------------------------------
  assertEqual(m.recoverySecondsForDay(day), 120, "recovery counts only user-initiated completed recovery");
  assertEqual(m.naturalAwaySecondsForDay(day), 300, "natural-away counts only system-detected");
  assertEqual(m.recoverySecondsForShareEvent(recAuto), 0, "system-detected is never eye-care recovery");
  assertEqual(m.recoverySecondsForShareEvent(recLifecycle), 0, "system-lifecycle is never eye-care recovery");
  assertEqual(m.recoverySecondsForShareEvent(recIncomplete), 0, "incomplete recovery does not count");
  assertEqual(m.naturalAwaySecondsForEvent(recUser), 0, "user recovery is not natural-away");

  // --- predicates -------------------------------------------------------
  assert(m.isUserRecovery(recUser), "recUser is user recovery");
  assert(!m.isUserRecovery(recAuto), "system-detected is not user recovery");
  assert(!m.isUserRecovery(recLifecycle), "system-lifecycle is not user recovery");
  assert(!m.isUserRecovery(recIncomplete), "incomplete is not user recovery");
  assert(m.isUserRecord(userRecord), "manual_log is a user record");
  assert(!m.isUserRecord(systemRecord), "auto assessment is not a user record");

  // --- dayMetrics is the single source: components === individual fns ---
  const bundle = m.dayMetrics(day);
  assertDeepEqual(bundle, { focusSeconds: 2100, recoverySeconds: 120, naturalAwaySeconds: 300 }, "dayMetrics bundles the canonical figures");
  assertEqual(bundle.focusSeconds, m.recordedSecondsForDay(day), "dayMetrics.focusSeconds === recordedSecondsForDay (one metric, one function)");
  assertEqual(bundle.recoverySeconds, m.recoverySecondsForDay(day), "dayMetrics.recoverySeconds === recoverySecondsForDay");
  assertEqual(bundle.naturalAwaySeconds, m.naturalAwaySecondsForDay(day), "dayMetrics.naturalAwaySeconds === naturalAwaySecondsForDay");

  // --- cross-view invariant: period total === sum of per-day -----------
  // Week/month overviews sum per-day; this guarantees they agree with the
  // individual day rows (the original 统计口径 desync this module prevents).
  const day1 = { events: [focusA, recUser] };          // 1500 focus, 120 recovery
  const day2 = { events: [focusB, recUser, recAuto] }; // 600 focus, 120 recovery, 300 away
  const weekFocus = m.recordedSecondsForDay(day1) + m.recordedSecondsForDay(day2);
  const weekRecovery = m.recoverySecondsForDay(day1) + m.recoverySecondsForDay(day2);
  assertEqual(weekFocus, 2100, "week focus total === sum of per-day focus");
  assertEqual(weekRecovery, 240, "week recovery total === sum of per-day recovery");

  // --- totalAwaySecondsForDay: the one sanctioned recovery+away sum ------
  assertEqual(m.totalAwaySecondsForDay(day), 420, "total away = recovery(120) + natural-away(300)");
  assertEqual(
    m.totalAwaySecondsForDay(day),
    m.recoverySecondsForDay(day) + m.naturalAwaySecondsForDay(day),
    "total away === sum of its two components (never diverges from parts)"
  );
  assertEqual(m.totalAwaySecondsForDay({}), 0, "empty day total away is zero");

  // --- liveFocusSecondsForDay: live口径 (ended + running round) ----------
  assertEqual(m.liveFocusSecondsForDay(day, 60), 2160, "live focus = ended segments + live round seconds");
  assertEqual(m.liveFocusSecondsForDay({ events, autoElapsedSeconds: 5000 }, 60), 5000, "cumulative auto counter floors the live figure");
  assertEqual(m.liveFocusSecondsForDay({}, 0), 0, "empty live day is zero, never NaN");
  // Pins the intentional live-vs-stored口径 relationship: with no live round and
  // no snapshot fallbacks, both must agree on the same events.
  assertEqual(m.liveFocusSecondsForDay(day, 0), m.recordedSecondsForDay(day), "live and stored口径 agree when nothing is running");
  // ...and pins the intentional DIVERGENCE: the stored口径 honors the legacy
  // elapsedSeconds snapshot fallback, the live口径 deliberately ignores it
  // (live = ended + running round, floored only by the auto counter).
  const legacyDay = { events, elapsedSeconds: 5000 };
  assertEqual(m.recordedSecondsForDay(legacyDay), 5000, "stored口径 honors the legacy elapsedSeconds fallback");
  assertEqual(m.liveFocusSecondsForDay(legacyDay, 0), 2100, "live口径 intentionally ignores the elapsedSeconds fallback");

  // --- windowStats: 本周/本月 counting uses the same filters --------------
  const win = m.windowStats([day1, day2]);
  assertDeepEqual(
    win,
    { activeSeconds: 2100, restSeconds: 240, recoveryCount: 2, recordCount: 0, hasData: true },
    "windowStats aggregates focus/rest/counts with the canonical filters"
  );
  assertEqual(win.activeSeconds, weekFocus, "windowStats.activeSeconds === sum of per-day recorded focus (same events)");
  assertEqual(win.restSeconds, weekRecovery, "windowStats.restSeconds === sum of per-day recovery");
  assertDeepEqual(
    m.windowStats([]),
    { activeSeconds: 0, restSeconds: 0, recoveryCount: 0, recordCount: 0, hasData: false },
    "empty window has no data (encouraging note can show)"
  );

  // --- structural: dashboard must route through the module, not re-define
  const indexHtml = read("index.html");
  assert(indexHtml.includes("window.EyeFlowMetrics"), "dashboard reads metrics from the single module");
  assert(indexHtml.includes('<script src="eyeflow-metrics.js"></script>'), "dashboard loads the metrics module");
  [
    "function recordedSecondsForDay",
    "function recoverySecondsForDay",
    "function naturalAwaySecondsForDay",
    "function focusSegmentSeconds",
    "function isUserRecovery",
    "function windowStats",
    "function liveFocusSecondsForDay",
    "function totalAwaySecondsForDay"
  ].forEach((sig) => {
    assert(!indexHtml.includes(sig), `dashboard must NOT re-define metric (one metric, one function): ${sig}`);
  });
  // The two counting loops that used to live inline must stay dead — the page
  // passes records/live seconds to the module instead of re-implementing.
  assert(!indexHtml.includes("activeSeconds += focusSegmentSeconds"), "profile window counting must stay in eyeflow-metrics.js");
  assert(!indexHtml.includes("endedSeconds + liveSeconds"), "live day-focus counting must stay in eyeflow-metrics.js");

  console.log("[smoke:metrics] PASSED. Day/period metrics are single-sourced and口径-consistent.");
}

try {
  main();
} catch (error) {
  console.error(`[smoke:metrics] ${error.message}`);
  process.exit(1);
}
