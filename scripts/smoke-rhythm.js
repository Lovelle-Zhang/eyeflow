#!/usr/bin/env node

// Smoke tests for eyeflow-rhythm.js — the closed-loop rhythm engine (Phase 3
// first slice). Pure module, exercised against synthetic round_ended streams so
// the behavioral signals are reproducible without a live app or clock.

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertApprox(actual, expected, label, tol = 1e-6) {
  if (typeof actual !== "number" || Math.abs(actual - expected) > tol) {
    throw new Error(`${label}: expected ≈${expected}, got ${JSON.stringify(actual)}`);
  }
}

function loadRhythm() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  new vm.Script(read("eyeflow-rhythm.js"), { filename: "eyeflow-rhythm.js" }).runInContext(sandbox);
  if (!sandbox.window.EyeFlowRhythm) {
    throw new Error("rhythm export missing: window.EyeFlowRhythm");
  }
  return sandbox.window.EyeFlowRhythm;
}

// Synthetic round_ended event. `at` derived from day + slot so ordering is stable.
function round(day, slot, opts = {}) {
  return {
    kind: "round_ended",
    day,
    at: `${day}T${String(9 + slot).padStart(2, "0")}:00:00.000Z`,
    durationSeconds: opts.durationSeconds != null ? opts.durationSeconds : 2800,
    focusTargetMinutes: opts.focusTargetMinutes != null ? opts.focusTargetMinutes : 50,
    acceptedRest: opts.acceptedRest === true,
    skippedRest: opts.skippedRest === true,
    currentLoad: opts.currentLoad != null ? opts.currentLoad : 40
  };
}

function accepted(day, slot, opts = {}) {
  return round(day, slot, { ...opts, acceptedRest: true, skippedRest: false });
}

function skipped(day, slot, opts = {}) {
  return round(day, slot, { ...opts, acceptedRest: false, skippedRest: true });
}

// Synthetic day-level record for the monthly trend (summaryHistory shape, normalized).
function dayRec(day, opts = {}) {
  return {
    day,
    completed: opts.completed || 0,
    snoozed: opts.snoozed || 0,
    ignored: opts.ignored || 0,
    recoverySeconds: opts.recoverySeconds || 0
  };
}

function main() {
  const rhythm = loadRhythm();

  // --- normalizeRoundEvents: filter to round_ended, sort ascending by time ---
  const mixed = [
    { kind: "round_started", day: "2026-07-02", at: "2026-07-02T09:00:00.000Z" },
    round("2026-07-03", 2),
    round("2026-07-01", 0),
    { kind: "manual_rhythm_adjusted", day: "2026-07-02" },
    round("2026-07-02", 1)
  ];
  const norm = rhythm.normalizeRoundEvents(mixed);
  assertEqual(norm.length, 3, "normalize: keeps only round_ended events");
  assertEqual(
    norm.map((r) => r.day).join(","),
    "2026-07-01,2026-07-02,2026-07-03",
    "normalize: sorts ascending by timestamp"
  );
  assertEqual(rhythm.normalizeRoundEvents(null).length, 0, "normalize: tolerates non-array");

  // --- computeIgnoreTrend: gated below the decision floor ---
  const tooFew = rhythm.computeIgnoreTrend(
    rhythm.normalizeRoundEvents([accepted("2026-07-01", 0), skipped("2026-07-01", 1)])
  );
  assertEqual(tooFew.ready, false, "ignore: under decision floor is not ready");
  assertEqual(tooFew.reason, "not-enough-decisions", "ignore: reports the gate reason");

  // --- computeIgnoreTrend: high skip rate flagged ---
  const highSkipRounds = rhythm.normalizeRoundEvents([
    skipped("2026-07-01", 0), skipped("2026-07-01", 1), skipped("2026-07-02", 0),
    skipped("2026-07-02", 1), accepted("2026-07-03", 0), accepted("2026-07-03", 1)
  ]);
  const highSkip = rhythm.computeIgnoreTrend(highSkipRounds);
  assertEqual(highSkip.ready, true, "ignore: at/above floor is ready");
  assertApprox(highSkip.skipRate, 4 / 6, "ignore: computes overall skip rate");
  assertEqual(highSkip.high, true, "ignore: 0.67 skip rate reads as high");

  // --- computeIgnoreTrend: rising trend across day halves (not skewed by one day) ---
  const risingRaw = [
    accepted("2026-07-01", 0), accepted("2026-07-01", 1),
    accepted("2026-07-02", 0), accepted("2026-07-02", 1),
    skipped("2026-07-03", 0), skipped("2026-07-03", 1),
    skipped("2026-07-04", 0), skipped("2026-07-04", 1)
  ];
  const risingRounds = rhythm.normalizeRoundEvents(risingRaw);
  const rising = rhythm.computeIgnoreTrend(risingRounds);
  assertEqual(rising.direction, "rising", "ignore: prior-clean → recent-skipped reads as rising");
  assertEqual(rising.high, false, "ignore: overall 0.5 is not high even while rising");

  // --- computeIgnoreTrend: one busy day is NOT a trend (day-split guard) ---
  // A count-based split of these 6 rounds would read the trailing 3 (all skipped,
  // a single busy day) as "rising". The day-based split with a ≥2-day-per-half
  // floor must return "unknown" instead — this is what distinguishes the two.
  const oneBusyDay = rhythm.normalizeRoundEvents([
    accepted("2026-07-01", 0), accepted("2026-07-01", 1),
    accepted("2026-07-02", 0),
    skipped("2026-07-03", 0), skipped("2026-07-03", 1), skipped("2026-07-03", 2)
  ]);
  const guarded = rhythm.computeIgnoreTrend(oneBusyDay);
  assertEqual(guarded.ready, true, "guard: 6 decisions is ready");
  assertEqual(guarded.direction, "unknown", "guard: a single busy recent day is not a trend");

  // --- computeFocusAdherence: gated below the round floor ---
  const fewRounds = rhythm.normalizeRoundEvents([
    accepted("2026-07-01", 0), accepted("2026-07-01", 1), accepted("2026-07-01", 2)
  ]);
  assertEqual(rhythm.computeFocusAdherence(fewRounds).ready, false, "adherence: under round floor is not ready");

  // --- computeFocusAdherence: consistently short of target ---
  const shortRounds = rhythm.normalizeRoundEvents(
    [0, 1, 2, 3, 4, 5].map((i) => accepted("2026-07-0" + (i + 1), 0, { durationSeconds: 1000 }))
  );
  const low = rhythm.computeFocusAdherence(shortRounds);
  assertEqual(low.ready, true, "adherence: at/above floor is ready");
  assertApprox(low.adherence, 0, "adherence: none reach 90% of a 50-min target");
  assertEqual(low.low, true, "adherence: 0 reads as low");

  // --- computeFocusAdherence: reliably on target ---
  const goodRounds = rhythm.normalizeRoundEvents(
    [0, 1, 2, 3, 4, 5].map((i) => accepted("2026-07-0" + (i + 1), 0, { durationSeconds: 2800 }))
  );
  const good = rhythm.computeFocusAdherence(goodRounds);
  assertApprox(good.adherence, 1, "adherence: 2800s clears 90% of 3000s target");
  assertEqual(good.low, false, "adherence: full adherence is not low");

  // --- rhythmSuggestion: hysteresis gate (needs 3 consecutive days, opt-in) ---
  const risingTrend = rhythm.computeIgnoreTrend(risingRounds);
  assertEqual(
    rhythm.rhythmSuggestion(risingTrend, good, { consecutiveDays: 1 }),
    null,
    "suggestion: withheld until the condition holds 3 consecutive days"
  );
  assertEqual(
    rhythm.rhythmSuggestion(risingTrend, good),
    null,
    "suggestion: omitted consecutiveDays defaults to withheld (opt-in gate)"
  );

  // --- rhythmSuggestion: rising/high skip → offer clearer reminders ---
  const raise = rhythm.rhythmSuggestion(risingTrend, good, { consecutiveDays: 3 });
  assertEqual(raise && raise.kind, "raise-intensity", "suggestion: rising skip → raise intensity");

  // --- rhythmSuggestion: short adherence (skip not high) → shorter target ---
  const cleanIgnore = rhythm.computeIgnoreTrend(shortRounds); // all accepted → skip 0, not rising
  assertEqual(cleanIgnore.high, false, "precondition: short-round stream is not high-skip");
  const lower = rhythm.rhythmSuggestion(cleanIgnore, low, { consecutiveDays: 3 });
  assertEqual(lower && lower.kind, "lower-focus-target", "suggestion: chronic shortfall → lower target");

  // --- rhythmSuggestion: healthy → hold, change nothing ---
  const healthyIgnore = rhythm.computeIgnoreTrend(goodRounds);
  const hold = rhythm.rhythmSuggestion(healthyIgnore, good, { consecutiveDays: 3 });
  assertEqual(hold && hold.kind, "hold", "suggestion: low skip + strong adherence → hold");

  // --- rhythmInsights: cold start is honest, not fabricated ---
  const cold = rhythm.rhythmInsights({ recentEvents: [] });
  assertEqual(cold.ready, false, "insights: empty history is not ready");
  assertEqual(cold.dataDays, 0, "insights: no days on empty history");
  assertEqual(cold.suggestion, null, "insights: no suggestion on empty history");

  // --- rhythmInsights: degraded[] always declares the blocked insights ---
  const live = rhythm.rhythmInsights({ recentEvents: risingRaw, consecutiveDays: 3 });
  assertEqual(live.ready, true, "insights: real stream is ready");
  assertEqual(live.dataDays, 4, "insights: counts distinct days");
  assertEqual(live.degraded.length, 2, "insights: two insights declared not-yet-computable");
  assertEqual(
    live.degraded.map((d) => d.key).sort().join(","),
    "load-distribution,recovery-effectiveness",
    "insights: degraded declares recovery-effectiveness + load-distribution"
  );
  live.degraded.forEach((d) => {
    assertEqual(typeof d.reason === "string" && d.reason.length > 0, true, `insights: degraded "${d.key}" states a reason`);
  });

  // --- monthlyTrend (Slice A): gated below the day floor ---
  const fewDays = rhythm.monthlyTrend({ days: [
    dayRec("2026-07-01", { completed: 2 }), dayRec("2026-07-02", { completed: 2 }),
    dayRec("2026-07-03", { completed: 2 }), dayRec("2026-07-04", { snoozed: 2 })
  ] });
  assertEqual(fewDays.ready, false, "month: under the day floor is not ready");
  assertEqual(fewDays.reason, "not-enough-days", "month: reports the gate reason");
  assertEqual(fewDays.degraded.length, 2, "month: degraded declared even when unready");

  // --- monthlyTrend: accept rate rising across halves (① 越来越接得住休息) ---
  const risingAccept = rhythm.monthlyTrend({ days: [
    ...["01", "02", "03", "04"].map((d) => dayRec("2026-07-" + d, { snoozed: 1, ignored: 1 })),
    ...["05", "06", "07", "08"].map((d) => dayRec("2026-07-" + d, { completed: 2 }))
  ] });
  assertEqual(risingAccept.ready, true, "month: 8 days is ready");
  assertEqual(risingAccept.rest.direction, "rising-accept", "month: prior-skip → recent-accept reads as rising-accept");
  assertEqual(risingAccept.rest.recentAccepted, 8, "month: exposes recent accepted count for evidence");
  assertEqual(risingAccept.rest.priorAccepted, 0, "month: exposes prior accepted count for evidence");

  // --- monthlyTrend: accept rate falling = skip rising (② 留到稍后的多了) ---
  const fallingAccept = rhythm.monthlyTrend({ days: [
    ...["01", "02", "03", "04"].map((d) => dayRec("2026-07-" + d, { completed: 2 })),
    ...["05", "06", "07", "08"].map((d) => dayRec("2026-07-" + d, { snoozed: 1, ignored: 1 }))
  ] });
  assertEqual(fallingAccept.rest.direction, "falling-accept", "month: prior-accept → recent-skip reads as falling-accept");

  // --- monthlyTrend: steady rest + rest every day (③ 节奏一直稳) ---
  const steady = rhythm.monthlyTrend({ days: [0, 1, 2, 3, 4, 5, 6, 7].map((i) =>
    dayRec("2026-07-0" + (i + 1), { completed: 1, recoverySeconds: 120 })) });
  assertEqual(steady.rest.direction, "steady", "month: flat accept rate reads as steady");
  assertEqual(steady.recovery.steady, true, "month: rest every day reads as steady recovery");

  // --- monthlyTrend: a half with no rest decisions withholds the rest trend ---
  const sparse = rhythm.monthlyTrend({ days: [0, 1, 2, 3, 4, 5, 6, 7].map((i) =>
    dayRec("2026-07-0" + (i + 1), { recoverySeconds: 120 })) });
  assertEqual(sparse.rest.ready, false, "month: no rest decisions → rest trend not ready");
  assertEqual(sparse.rest.direction, "unknown", "month: no rest decisions → direction unknown");

  // --- monthlyTrend: decisions concentrated on ONE day per half is NOT a trend ---
  // Prior decisions all land on day 04, recent all on day 05 — 3 per half clears the
  // decision floor, but the distinct-decision-days guard must reject the direction so a
  // single busy day can't fake "越来越接得住休息".
  const lopsided = rhythm.monthlyTrend({ days: [
    dayRec("2026-07-01"), dayRec("2026-07-02"), dayRec("2026-07-03"),
    dayRec("2026-07-04", { snoozed: 2, ignored: 1 }),
    dayRec("2026-07-05", { completed: 3 }),
    dayRec("2026-07-06"), dayRec("2026-07-07"), dayRec("2026-07-08")
  ] });
  assertEqual(lopsided.ready, true, "month: 8 days is ready");
  assertEqual(lopsided.rest.ready, false, "month: decisions on one day per half don't earn a trend");
  assertEqual(lopsided.rest.direction, "unknown", "month: single-busy-day per half → direction unknown");

  console.log("[smoke:rhythm] PASSED. Closed-loop rhythm engine derives ignore/adherence signals with honest degradation.");
}

try {
  main();
} catch (error) {
  console.error("[smoke:rhythm] FAILED.", error.message);
  process.exitCode = 1;
}
