window.EyeFlowRestFlow = (() => {
  const defaultMicroTask = {
    title: "看一下窗外最远的那个东西",
    copy: "告诉 Mira 它大概是什么颜色。只选颜色，不需要输入内容。"
  };

  function safeBreakColor(color) {
    return String(color || "这个颜色").slice(0, 8);
  }

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
      title: force ? "Mira 带你离开屏幕一下" : "该让眼睛离开屏幕了",
      copy: force
        ? companionLine
        : `${companionLine} 先做一件很小的事：看向远处，给 Mira 一个颜色。`,
      microTitle: task.title,
      microCopy: task.copy,
      microReply: "Mira 在等一个很小的答案。",
      companionLine: openingCompanionLine,
      showCompanionLine: !force,
      showRecoveryFeedback: false,
      showFinishButton: !force,
      finishButtonText: "完成休息",
      showSnoozeButton: reason !== "extended" && !force,
      showForceReturnButton: false,
      showForceTask: force,
      showMicroTask: !force,
      showFlow: force,
      showMiniTimer: force,
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
      showRecoveryFeedback: true
    };
  }

  function breakMicroReplyView({ color, companionLine = "Mira 在这里守时间。" } = {}) {
    const safeColor = safeBreakColor(color);
    return {
      safeColor,
      reply: `Mira：收到，${safeColor}就够了。眼睛已经离开屏幕了。`,
      companionLine,
      showCompanionLine: true,
      finishButtonText: "完成休息"
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
        logCopy: "反馈：好多了。下一轮按当前打扰边界重新开始。",
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
    safeBreakColor,
    restBreakView,
    recoveryFeedbackView,
    breakMicroReplyView,
    recoveryCompletionPlan
  };
})();
