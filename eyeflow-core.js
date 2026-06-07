window.EyeFlowCore = (() => {
  function numericSymptom(symptoms, key) {
    return Number(symptoms?.[key] || 0);
  }

  function clampLoad(load) {
    return Math.max(0, Math.min(100, Math.round(load)));
  }

  function symptomLoadScore(symptoms = {}) {
    return numericSymptom(symptoms, "dryness") * 2.1
      + numericSymptom(symptoms, "strain") * 2.4
      + numericSymptom(symptoms, "blur") * 2
      + numericSymptom(symptoms, "light") * 1.4;
  }

  function estimateInitialLoad(symptoms = {}) {
    return clampLoad(12 + symptomLoadScore(symptoms));
  }

  function computeEyeLoadScore({ symptoms = {}, elapsedSeconds = 0, breaks = 0 } = {}) {
    const focusScore = Math.min(36, Number(elapsedSeconds || 0) / 60 * 1.35);
    const breakRelief = Math.min(18, Number(breaks || 0) * 4);
    return clampLoad(12 + symptomLoadScore(symptoms) + focusScore - breakRelief);
  }

  function classifyLoad(load) {
    if (load >= 74) return "高负荷";
    if (load >= 48) return "中等负荷";
    return "舒适区";
  }

  function initialRhythmForLoad(load) {
    if (load >= 74) {
      return {
        focus: 15,
        rest: 180,
        intensity: "clear",
        copy: "首轮先压低连续盯屏时间，恢复留足肩颈放松。"
      };
    }
    if (load >= 48) {
      return {
        focus: 20,
        rest: 150,
        intensity: "standard",
        copy: "首轮稍微短一点，恢复时间也拉长一点。"
      };
    }
    return {
      focus: 50,
      rest: 120,
      intensity: "quiet",
      copy: "首轮按 50 分钟专注开始，Mira 只用轻提示提醒眨眼。"
    };
  }

  function intensityLabel(level) {
    if (level === "force") return "L4 强制爱";
    if (level === "clear") return "L3 明确介入";
    if (level === "standard") return "L2 轻提示";
    return "L1 安静";
  }

  function modeActionCopy(level) {
    if (level === "force") return "到恢复断点进入全屏恢复，时间到才回到工作界面";
    if (level === "clear") return "到恢复断点或负荷偏高时明确介入，连续超时会升级语气";
    if (level === "standard") return "到恢复断点短暂轻提示，你可以休息或稍后处理";
    return "先低打扰陪伴，不抢你的控制权";
  }

  return {
    clampLoad,
    symptomLoadScore,
    estimateInitialLoad,
    computeEyeLoadScore,
    classifyLoad,
    initialRhythmForLoad,
    intensityLabel,
    modeActionCopy
  };
})();
