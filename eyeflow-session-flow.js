window.EyeFlowSessionFlow = (() => {
  // Single restrained accent — no mood-driven hue shifts (per the design DNA).
  // These feed only the rhythm sliders' --range-color/--range-glow; every stage
  // resolves to the tokenized Mira green, which flips with the light/dark theme.
  // (Mira's own companion/avatar mood tints live in separate CSS and are unaffected.)
  const stageTones = {
    calm: { color: "var(--mira)", glow: "var(--mira-soft)" },
    focus: { color: "var(--mira)", glow: "var(--mira-soft)" },
    blink: { color: "var(--mira)", glow: "var(--mira-soft)" },
    rest: { color: "var(--mira)", glow: "var(--mira-soft)" }
  };

  function computeRestDue({ isRunning = false, elapsedSeconds = 0, focusMinutes = 0 } = {}) {
    const targetSeconds = Number(focusMinutes || 0) * 60;
    return Boolean(isRunning && targetSeconds > 0 && Number(elapsedSeconds || 0) >= targetSeconds);
  }

  function sessionControlView({
    isRunning = false,
    restDue = false,
    assessedToday = false,
    autoTracking = false,
    paused = false,
    restSeconds = 120
  } = {}) {
    const restText = restDue ? `休息 ${restSeconds} 秒` : "休息";
    const restTitle = restDue ? `开始 ${restSeconds} 秒休息` : "主动休息";

	    if (isRunning) {
	      return {
	        panelTitle: restDue ? "恢复断点" : "本轮节奏",
	        pillText: restDue ? "恢复断点" : "手动专注",
	        pillState: restDue ? "due" : "manual",
        startText: "暂停",
        startTitle: "暂停当前专注",
        startIcon: "pause",
        startIsMode: false,
        restText,
        restTitle
      };
    }

	    return {
	      panelTitle: autoTracking ? "本轮节奏" : paused ? "这一轮已暂停" : "这一轮已安排",
	      pillText: !assessedToday ? "已安排" : autoTracking ? "自动记录" : paused ? "已暂停" : "未开始",
      pillState: !assessedToday ? "idle" : autoTracking ? "auto" : paused ? "paused" : "idle",
      startText: !assessedToday ? "开始安静提醒" : autoTracking ? "手动专注" : paused ? "继续专注" : "开始安静提醒",
      startTitle: !assessedToday
        ? "开始安静提醒"
        : autoTracking
          ? "切到手动专注并从 00:00 计时"
          : paused
            ? "继续当前专注"
            : "开始安静提醒",
      startIcon: "play",
      // "手动专注" while auto-tracking is a MODE TOGGLE, not a real action — the
      // renderer styles it as the low-key mode pill instead of solid primary.
      startIsMode: Boolean(assessedToday && autoTracking),
      restText,
      restTitle
    };
  }

  function stageMiraView({ load = 0, topSymptomValue = 0, isRunning = false, autoTracking = false } = {}) {
    const mood = load >= 74
      ? "rest"
      : load >= 48 || topSymptomValue >= 5
        ? "blink"
        : isRunning || autoTracking
          ? "focus"
          : "calm";

    return {
      mood,
      tone: stageTones[mood]
    };
  }

  return {
    computeRestDue,
    sessionControlView,
    stageMiraView
  };
})();
