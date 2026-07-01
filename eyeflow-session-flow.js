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

  function sessionState({
    isRunning = false,
    autoTracking = false,
    paused = false,
    resting = false
  } = {}) {
    if (resting) return "resting";
    if (isRunning || autoTracking) return "running";
    if (paused) return "paused";
    return "idle";
  }

  function computeRestDue({ isRunning = false, autoTracking = false, elapsedSeconds = 0, focusMinutes = 0 } = {}) {
    const targetSeconds = Number(focusMinutes || 0) * 60;
    return Boolean((isRunning || autoTracking) && targetSeconds > 0 && Number(elapsedSeconds || 0) >= targetSeconds);
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
    const currentState = sessionState({
      isRunning,
      autoTracking,
      paused,
      resting: restDue
    });

    if (currentState === "resting") {
	      return {
        panelTitle: "恢复断点",
        pillText: "恢复断点",
        pillState: "due",
        startText: "暂停",
        startTitle: "暂停当前计时",
        startIcon: "pause",
        startIsMode: false,
        restText,
        restTitle
      };
    }

    if (currentState === "running") {
      return {
        panelTitle: "本轮节奏",
        pillText: "计时中",
        pillState: "running",
        startText: "暂停",
        startTitle: "暂停当前计时",
        startIcon: "pause",
        startIsMode: false,
        restText,
        restTitle
      };
    }

    if (currentState === "paused") {
      return {
        panelTitle: "本轮节奏",
        pillText: "已暂停",
        pillState: "paused",
        startText: "恢复自动计时",
        startTitle: "恢复后，有屏幕活动时会自动开始计时",
        startIcon: "play",
        startDisabled: false,
        startIsMode: false,
        restText,
        restTitle
      };
    }

	    return {
	      panelTitle: "本轮节奏",
	      pillText: "待命中",
      pillState: !assessedToday ? "idle" : currentState,
      startText: "待命",
      startTitle: "有屏幕活动时自动开始计时",
      startIcon: "play",
      startDisabled: true,
      startIsMode: false,
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
    sessionState,
    sessionControlView,
    stageMiraView
  };
})();
