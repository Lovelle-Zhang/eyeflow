// EyeFlow closed-loop rhythm engine (Phase 3, first slice — pure, unwired).
//
// The rhythm memory (state.rhythmMemory.recentEvents) has always been WRITTEN
// but never READ BACK to inform advice — the engine was open-loop. This module
// is the read-back half: given the round-ended event stream, it derives two
// honest behavioral signals the existing event schema already supports —
//   1. ignore trend  — are reminders / rest points being skipped more or less?
//   2. focus adherence — are rounds actually reaching their focus target?
// and turns them, with hysteresis, into AT MOST one gentle suggestion.
//
// HONESTY CONTRACT (why this module is deliberately small):
// The prettier recap insights the product wants — "120 秒以上的恢复更稳定"
// (recovery-duration effectiveness) and "高强度日之间恢复不均" (per-day load /
// recovery distribution) — are NOT produced by this slice. This is a SCOPE line,
// not (as an earlier roadmap note claimed) a missing-data line: the inputs already
// exist in rhythmMemory — recovery_feedback events carry durationSeconds +
// postRestFeedback, and every round_ended carries currentLoad tagged by day. Two
// real caveats remain before those insights can be claimed honestly, so they are
// DECLARED in `degraded[]` rather than faked:
//   1. recovery durationSeconds is currently the PLANNED breakTarget, not the
//      measured rest length (completeRecovery records els.breakTarget), so a clean
//      "120s+ is more stable" claim needs the measured-duration口径 first;
//   2. per-day load distribution just isn't aggregated here yet.
// They are next-slice work, not blocked on upstream data.
//
// Pure & deterministic: no Date.now(), no live state — window bounds are derived
// from the events themselves so unit tests are reproducible.
window.EyeFlowRhythm = (() => {
  const RHYTHM_MODEL_VERSION = "0.1.0-local";

  // Enough rest decisions in the window before we say anything about skipping.
  const MIN_REST_DECISIONS = 6;
  // Each half of the window needs this many decisions to claim a *trend*.
  const MIN_HALF_DECISIONS = 3;
  // Skip rate at/above this reads as "reminders often deferred".
  const HIGH_SKIP_RATE = 0.6;
  // A meaningful change between window halves.
  const TREND_DELTA = 0.15;

  // Enough finished rounds before we judge focus adherence.
  const MIN_ADHERENCE_ROUNDS = 5;
  // A round "hit" its target if it reached this fraction of it.
  const ADHERENCE_HIT_RATIO = 0.9;
  // Adherence at/below this reads as "rounds keep ending short of target".
  const LOW_ADHERENCE = 0.5;

  // Hysteresis: a condition must hold this many consecutive days before Mira
  // surfaces a suggestion (roadmap: 连续 3 天才建议、一天最多一条).
  const SUGGESTION_CONSECUTIVE_DAYS = 3;

  // A trend direction is only claimed when BOTH window halves span at least this
  // many distinct days — so one busy day cannot masquerade as a rising/falling
  // trend on a 2–3 day history.
  const MIN_TREND_DAYS_PER_HALF = 2;

  function num(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  // Pull the round-ended events out of a raw rhythmMemory.recentEvents array and
  // normalize them into a clean, sorted-ascending shape. Everything downstream
  // consumes THIS shape, never the raw event.
  function normalizeRoundEvents(recentEvents = []) {
    return (Array.isArray(recentEvents) ? recentEvents : [])
      .filter((event) => event && event.kind === "round_ended")
      .map((event) => {
        const ms = Date.parse(event.at || event.endedAt || "");
        const focusTargetMinutes = Math.max(0, num(event.focusTargetMinutes));
        return {
          day: event.day || "",
          at: event.at || "",
          ms,
          durationSeconds: Math.max(0, num(event.durationSeconds)),
          focusTargetSeconds: focusTargetMinutes * 60,
          acceptedRest: event.acceptedRest === true,
          skippedRest: event.skippedRest === true,
          load: Math.max(0, num(event.currentLoad))
        };
      })
      // Drop events whose timestamp won't parse — they'd otherwise pollute the
      // sort and the day-half split. (Real pruneRhythmMemory already filters
      // these; this keeps the pure module honest at its own boundary.)
      .filter((round) => Number.isFinite(round.ms))
      .sort((a, b) => a.ms - b.ms);
  }

  function distinctDays(rounds) {
    return [...new Set(rounds.map((r) => r.day).filter(Boolean))].sort();
  }

  // Split rounds into a "prior" and "recent" half by DAY (not by count), so a
  // single busy day cannot masquerade as a trend. Returns { prior, recent }.
  function splitByDayHalves(rounds) {
    const days = distinctDays(rounds);
    if (days.length < 2) return { prior: [], recent: rounds.slice() };
    const mid = Math.ceil(days.length / 2);
    const recentDays = new Set(days.slice(mid));
    const prior = [];
    const recent = [];
    for (const r of rounds) {
      (recentDays.has(r.day) ? recent : prior).push(r);
    }
    return { prior, recent };
  }

  function skipRateOf(rounds) {
    let accepted = 0;
    let skipped = 0;
    for (const r of rounds) {
      if (r.skippedRest) skipped += 1;
      else if (r.acceptedRest) accepted += 1;
    }
    const decisions = accepted + skipped;
    return { decisions, accepted, skipped, rate: decisions ? skipped / decisions : 0 };
  }

  // 1. Ignore/skip trend — is the user deferring rest points more or less?
  function computeIgnoreTrend(rounds = []) {
    const overall = skipRateOf(rounds);
    if (overall.decisions < MIN_REST_DECISIONS) {
      return { ready: false, reason: "not-enough-decisions", decisions: overall.decisions };
    }
    const { prior, recent } = splitByDayHalves(rounds);
    const priorRate = skipRateOf(prior);
    const recentRate = skipRateOf(recent);
    const canTrend = priorRate.decisions >= MIN_HALF_DECISIONS
      && recentRate.decisions >= MIN_HALF_DECISIONS
      && distinctDays(prior).length >= MIN_TREND_DAYS_PER_HALF
      && distinctDays(recent).length >= MIN_TREND_DAYS_PER_HALF;
    let direction = "steady";
    if (canTrend) {
      const delta = recentRate.rate - priorRate.rate;
      if (delta >= TREND_DELTA) direction = "rising";
      else if (delta <= -TREND_DELTA) direction = "falling";
    }
    return {
      ready: true,
      decisions: overall.decisions,
      skipRate: overall.rate,
      recentSkipRate: recentRate.decisions ? recentRate.rate : null,
      priorSkipRate: priorRate.decisions ? priorRate.rate : null,
      high: overall.rate >= HIGH_SKIP_RATE,
      direction: canTrend ? direction : "unknown"
    };
  }

  // 2. Focus adherence — do rounds actually reach their focus target?
  function computeFocusAdherence(rounds = []) {
    const targeted = rounds.filter((r) => r.focusTargetSeconds > 0);
    if (targeted.length < MIN_ADHERENCE_ROUNDS) {
      return { ready: false, reason: "not-enough-rounds", rounds: targeted.length };
    }
    let hits = 0;
    let actualSum = 0;
    let targetSum = 0;
    for (const r of targeted) {
      if (r.durationSeconds >= r.focusTargetSeconds * ADHERENCE_HIT_RATIO) hits += 1;
      actualSum += r.durationSeconds;
      targetSum += r.focusTargetSeconds;
    }
    const adherence = hits / targeted.length;
    return {
      ready: true,
      rounds: targeted.length,
      adherence,
      low: adherence <= LOW_ADHERENCE,
      avgActualMinutes: Math.round(actualSum / targeted.length / 60),
      avgTargetMinutes: Math.round(targetSum / targeted.length / 60)
    };
  }

  // At most ONE gentle suggestion, priority-ordered, only when the data backs it
  // and (if a consecutive-day count is supplied) hysteresis has been satisfied.
  // Returns { kind, text } or null. Text is recap-page copy (not canvas-bound),
  // so it is not held to the share-card char budget.
  function rhythmSuggestion(ignore, adherence, opts = {}) {
    // Opt-in gate: a caller must PROVE how many consecutive days the condition
    // has held. Omitting it (default 0) means "not yet earned" → no suggestion.
    const consecutiveDays = num(opts.consecutiveDays, 0);
    if (consecutiveDays < SUGGESTION_CONSECUTIVE_DAYS) return null;

    // Rising or high skip rate → offer clearer reminders (raise intensity).
    if (ignore && ignore.ready && (ignore.high || ignore.direction === "rising")) {
      return {
        kind: "raise-intensity",
        text: "最近提醒常被留到稍后。要我提醒得更明确一点吗？累了早点停会更轻。"
      };
    }
    // Consistently short of target → suggest a shorter single-round target.
    if (adherence && adherence.ready && adherence.low) {
      return {
        kind: "lower-focus-target",
        text: "最近几轮多半没到目标就停了。把单轮目标调短一点，会更容易接住节奏。"
      };
    }
    // Healthy: low skipping + reliable adherence → affirm, change nothing.
    if (ignore && ignore.ready && !ignore.high
      && adherence && adherence.ready && !adherence.low) {
      return {
        kind: "hold",
        text: "这段时间节奏挺稳——接住休息、也大多按自己的目标停下。保持就好。"
      };
    }
    return null;
  }

  // Top-level orchestrator. Consumes the raw rhythmMemory.recentEvents plus an
  // optional { consecutiveDays } hysteresis input; returns the honest signals
  // and an explicit list of insights that are NOT computable yet and why.
  function rhythmInsights(input = {}) {
    const rounds = normalizeRoundEvents(input.recentEvents);
    const dataDays = distinctDays(rounds).length;
    const ignore = computeIgnoreTrend(rounds);
    const adherence = computeFocusAdherence(rounds);
    const ready = dataDays >= 2 && (ignore.ready || adherence.ready);
    // Never suggest on an un-ready read; the suggestion itself is still
    // hysteresis-gated by input.consecutiveDays inside rhythmSuggestion.
    const suggestion = ready ? rhythmSuggestion(ignore, adherence, input) : null;
    return {
      version: RHYTHM_MODEL_VERSION,
      ready,
      dataDays,
      ignore,
      adherence,
      suggestion,
      // Honest negative space — declared, not faked. NOT blocked on missing data
      // (the inputs are already in rhythmMemory); these are next-slice scope.
      degraded: [
        { key: "recovery-effectiveness", reason: "数据已在 rhythmMemory(recovery_feedback.durationSeconds+postRestFeedback)；本 slice 未做，且 durationSeconds 现为计划 breakTarget 非实测时长——'120s+更稳'需先补实测口径" },
        { key: "load-distribution", reason: "数据已在 round_ended.currentLoad(按 day 标记)；本 slice 未做按日聚合" }
      ]
    };
  }

  return {
    RHYTHM_MODEL_VERSION,
    normalizeRoundEvents,
    computeIgnoreTrend,
    computeFocusAdherence,
    rhythmSuggestion,
    rhythmInsights
  };
})();
