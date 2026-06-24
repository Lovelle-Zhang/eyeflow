window.EyeFlowRestFlow = (() => {
  const defaultMicroTask = {
    title: "看向远处",
    copy: "不用盯着屏幕，20 秒后再回来。"
  };

  function restBreakView({
    reason = "manual",
    companionLine = "慢慢来，不急。",
    openingCompanionLine = "Mira 在这里守时间。",
    microTask = defaultMicroTask
  } = {}) {
    const force = reason === "force";
    const task = { ...defaultMicroTask, ...microTask };
    return {
      feedbackMode: false,
      relax: force ? "gaze" : "",
      title: force ? "Mira 带你离开屏幕一下" : "看向远处",
      copy: force
        ? companionLine
        : "不用盯着屏幕，20 秒后再回来。",
      microTitle: task.title,
      microCopy: task.copy,
      microReply: "",
      companionLine: openingCompanionLine,
      showCompanionLine: false,
      showRecoveryFeedback: false,
      showFinishButton: !force,
      finishButtonText: "我回来了",
      snoozeButtonText: "稍后提醒",
      showSnoozeButton: reason !== "extended" && !force,
      showForceReturnButton: false,
      showForceEscapeButton: force,
      showForceTask: force,
      showMicroTask: false,
      showFlow: force,
      showMiniTimer: true,
      timerLabel: "剩余",
      timerSeconds: force ? 0 : 20,
      showMira: force,
      showBreath: !force
    };
  }

  function recoveryFeedbackView() {
    return {
      feedbackMode: true,
      relax: "feedback",
      title: "恢复得怎么样？",
      copy: "告诉 Mira 现在的感觉，下一轮会按你的反馈调整。",
      showMira: true,
      miraCaption: "Mira 在",
      showMicroTask: false,
      showCompanionLine: false,
      showBreath: false,
      showFinishButton: false,
      showSnoozeButton: false,
      showForceReturnButton: false,
      showForceEscapeButton: false,
      showRecoveryFeedback: true
    };
  }

  function recoveryCompletionPlan({
    feedback,
    returnToAssessment = false,
    focusTarget = 25,
    breakTarget = 120
  } = {}) {
    if (feedback === "better") {
      return {
        kind: returnToAssessment ? "assessment" : "restart",
        symptomRelief: 2,
        logTitle: "完成一次护眼恢复",
        logCopy: "反馈：好多了。下一轮按当前提醒边界重新开始。",
        toast: returnToAssessment
          ? "Mira：休息完成。回来后给今天打个分，我再按状态安排节奏。"
          : "Mira：太好了。我从新一轮开始看着节奏。",
        closeOverlay: true,
        restartSession: !returnToAssessment
      };
    }

    if (feedback === "same") {
      return {
        kind: returnToAssessment ? "assessment" : "restart",
        symptomRelief: 1,
        nextFocusTarget: Math.max(15, Number(focusTarget || 25) - 5),
        logTitle: "完成一次护眼恢复",
        logCopy: "反馈：差不多。下一轮提醒会提前一点。",
        toast: returnToAssessment
          ? "Mira：休息完成。先给今天打个分，我会把下一轮安排轻一点。"
          : "Mira：收到。下一轮我会提前一点，但还是先轻轻来。",
        closeOverlay: true,
        restartSession: !returnToAssessment
      };
    }

    return {
      kind: "extend",
      nextBreakTarget: Math.min(240, Number(breakTarget || 120) + 30),
      logTitle: "完成一次护眼恢复",
      logCopy: "反馈：还是累。建议继续休息，不急着回到屏幕。",
      toast: "Mira：那就先不急。再休息一会儿，我在。",
      closeOverlay: false,
      restartSession: false
    };
  }

  return {
    restBreakView,
    recoveryFeedbackView,
    recoveryCompletionPlan
  };
})();
