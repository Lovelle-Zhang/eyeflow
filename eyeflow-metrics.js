// Single source of truth for day/period metric aggregation.
//
// DISCIPLINE: "one metric -> one function". Every view (今天 / 这几天 /
// 周·月概览 / 分享卡 / 复盘) must read its focus/recovery/natural-away numbers
// through THESE functions — never re-implement the counting inline. That is the
// fix for the recurring "统计口径不一致" class of bug, where the same day showed
// different totals in different views.
//
// All functions here are PURE: they take an event or a `day` record
// ({ events, elapsedSeconds, autoElapsedSeconds }) and return a number. Live,
// in-progress session state (today's running counter) stays in the page, which
// layers its live delta on top of these stored-day aggregates.
window.EyeFlowMetrics = (() => {
  function recordedMinutes(seconds) {
    return Math.floor(Math.max(0, Number(seconds || 0)) / 60);
  }

  // Real active time per focus segment = wall-clock (endedAt - startedAt).
  // durationSeconds is cumulative across pause/resume, so summing it would
  // double-count; the segment span never does.
  function focusSegmentSeconds(event) {
    if (!event || event.type !== "focus_session" || event.phase !== "ended") return 0;
    const start = Date.parse(event.startedAt || "");
    const end = Date.parse(event.endedAt || "");
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      return (end - start) / 1000;
    }
    return 0;
  }

  function isUserRecovery(event) {
    return Boolean(
      event
      && event.type === "recovery_event"
      && event.completed !== false
      && event.mode !== "system-detected"
      && event.mode !== "system-lifecycle"
    );
  }

  // A user-written status = saveLog, which emits a daily_assessment with
  // trigger "manual_log". Excludes addSystemLog system entries (no such event).
  function isUserRecord(event) {
    return Boolean(event && event.type === "daily_assessment" && event.trigger === "manual_log");
  }

  function recoverySecondsForShareEvent(event) {
    if (!event || event.type !== "recovery_event" || event.completed === false) return 0;
    if (event.mode === "system-lifecycle") return 0;
    if (event.mode === "system-detected") return 0;
    return Math.max(0, Number(event.durationSeconds || 0));
  }

  function recoverySecondsForDay(day = {}) {
    return (Array.isArray(day.events) ? day.events : [])
      .reduce((total, event) => total + recoverySecondsForShareEvent(event), 0);
  }

  function naturalAwaySecondsForEvent(event) {
    if (!event || event.type !== "recovery_event" || event.completed === false) return 0;
    if (event.mode !== "system-detected") return 0;
    return Math.max(0, Number(event.durationSeconds || 0));
  }

  function naturalAwaySecondsForDay(day = {}) {
    return (Array.isArray(day.events) ? day.events : [])
      .reduce((total, event) => total + naturalAwaySecondsForEvent(event), 0);
  }

  function recordedSecondsForDay(day = {}) {
    const eventSeconds = (Array.isArray(day.events) ? day.events : [])
      .filter((event) => event?.type === "focus_session" && event.phase === "ended")
      .reduce((total, event) => total + focusSegmentSeconds(event), 0);
    return Math.max(0, eventSeconds, Number(day.elapsedSeconds || 0), Number(day.autoElapsedSeconds || 0));
  }

  // Canonical bundle for a stored day — use this when a view needs more than one
  // number so every figure provably comes from the same record + same filters.
  function dayMetrics(day = {}) {
    return {
      focusSeconds: recordedSecondsForDay(day),
      recoverySeconds: recoverySecondsForDay(day),
      naturalAwaySeconds: naturalAwaySecondsForDay(day)
    };
  }

  return {
    recordedMinutes,
    focusSegmentSeconds,
    isUserRecovery,
    isUserRecord,
    recoverySecondsForShareEvent,
    recoverySecondsForDay,
    naturalAwaySecondsForEvent,
    naturalAwaySecondsForDay,
    recordedSecondsForDay,
    dayMetrics
  };
})();
