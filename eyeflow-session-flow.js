window.EyeFlowSessionFlow = (() => {
  const stageTones = {
    calm: { color: "#2a927a", glow: "rgba(42, 146, 122, 0.17)" },
    focus: { color: "#5fa9c1", glow: "rgba(95, 169, 193, 0.18)" },
    blink: { color: "#c49a45", glow: "rgba(196, 154, 69, 0.2)" },
    rest: { color: "#c9637f", glow: "rgba(201, 99, 127, 0.2)" }
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
    const restText = restDue ? `开始 ${restSeconds} 秒休息` : "休息";
    const restTitle = restDue ? `开始 ${restSeconds} 秒休息` : "主动休息";

    if (isRunning) {
      return {
        pillText: restDue ? "恢复断点" : "手动专注",
        pillState: restDue ? "due" : "manual",
        startText: "暂停",
        startTitle: "暂停当前专注",
        startIcon: "pause",
        restText,
        restTitle
      };
    }

    return {
      pillText: !assessedToday ? "待校准" : autoTracking ? "自动记录" : paused ? "已暂停" : "未开始",
      pillState: !assessedToday ? "idle" : autoTracking ? "auto" : paused ? "paused" : "idle",
      startText: !assessedToday ? "先校准今天" : autoTracking ? "开始手动专注" : paused ? "继续专注" : "开始专注",
      startTitle: !assessedToday
        ? "先让 Mira 记录今天的眼睛状态"
        : autoTracking
          ? "从 00:00 开始手动专注"
          : paused
            ? "继续当前专注"
            : "开始专注",
      startIcon: "play",
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
