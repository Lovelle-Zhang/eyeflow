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

  // Real active time per focus segment = the SMALLER of two independently-wrong-in-
  // opposite-directions signals:
  //   - wall span (endedAt - startedAt): correct normally, but a sleep/suspend gap
  //     before a late close inflates it past the real active time (a 30-min round
  //     closed at wake after a 4h sleep spans 4.5h). durationSeconds is gap-protected
  //     (frozen while suspended) so it stays right in this case.
  //   - durationSeconds (elapsed at close): correct normally, but could overshoot the
  //     span if it ever carried cumulative/paused time; the span caps that.
  // min() takes whichever is smaller, which is the honest one in both failure modes —
  // and for an eye-care app, under-counting focus is the safe direction. Fall back to
  // whichever exists when the other is missing/zero (legacy events without duration).
  function focusSegmentSeconds(event) {
    if (!event || event.type !== "focus_session" || event.phase !== "ended") return 0;
    const start = Date.parse(event.startedAt || "");
    const end = Date.parse(event.endedAt || "");
    const span = (Number.isFinite(start) && Number.isFinite(end) && end > start)
      ? (end - start) / 1000
      : 0;
    const duration = Math.max(0, Number(event.durationSeconds || 0));
    if (span > 0 && duration > 0) return Math.min(span, duration);
    return span > 0 ? span : duration;
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

  // Total time away from the screen for a day = deliberate eye-care recovery +
  // system-detected natural away. The two stay separately queryable above; this
  // is the one sanctioned way to add them (never re-add inline in a view).
  function totalAwaySecondsForDay(day = {}) {
    return recoverySecondsForDay(day) + naturalAwaySecondsForDay(day);
  }

  // Live "today so far" focus: ended segments PLUS the in-progress round's live
  // seconds, floored by the day's cumulative auto counter. NOTE this口径 is
  // intentionally different from recordedSecondsForDay (pure max, for STORED
  // days): the live view layers the running round on top of finished ones.
  // Extracted verbatim from the dashboard's currentDayFocusSeconds so the page
  // passes live state in instead of re-implementing the counting.
  function liveFocusSecondsForDay(day = {}, liveSeconds = 0) {
    const endedSeconds = (Array.isArray(day.events) ? day.events : [])
      .filter((event) => event?.type === "focus_session" && event.phase === "ended")
      .reduce((total, event) => total + focusSegmentSeconds(event), 0);
    const live = Math.max(0, Number(liveSeconds || 0));
    return Math.max(0, endedSeconds + live, Number(day.autoElapsedSeconds || 0));
  }

  // Window aggregate over a set of day records (今天 + summaryHistory slice).
  // The page owns picking WHICH records fall in the window (needs todayKey /
  // dayGap); the counting itself lives here so 本周/本月 figures provably use
  // the same event filters as every other view.
  function windowStats(records = []) {
    let activeSeconds = 0;
    let restSeconds = 0;
    let recoveryCount = 0;
    let recordCount = 0;
    (Array.isArray(records) ? records : []).forEach((record) => {
      (Array.isArray(record?.events) ? record.events : []).forEach((event) => {
        if (!event) return;
        if (event.type === "focus_session" && event.phase === "ended") {
          activeSeconds += focusSegmentSeconds(event);
        } else if (isUserRecovery(event)) {
          recoveryCount += 1;
          restSeconds += Math.max(0, Number(event.durationSeconds) || 0);
        } else if (isUserRecord(event)) {
          recordCount += 1;
        }
      });
    });
    // Mirror the displayed stats: the encouraging note shows whenever every
    // metric reads zero, so sub-minute noise doesn't suppress it.
    const hasData = Math.round(activeSeconds / 60) > 0 || recoveryCount > 0 || recordCount > 0;
    return { activeSeconds, restSeconds, recoveryCount, recordCount, hasData };
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
    dayMetrics,
    totalAwaySecondsForDay,
    liveFocusSecondsForDay,
    windowStats
  };
})();
