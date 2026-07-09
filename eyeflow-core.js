window.EyeFlowCore = (() => {
  const MODEL_VERSION = "2.0.0-local";
  const KNOWLEDGE_BASE_VERSION = "2026-06-10";
  const DATA_DICTIONARY_VERSION = "2026-06-10";

  function numericSymptom(symptoms, key) {
    return Number(symptoms?.[key] || 0);
  }

  function clampValue(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || 0));
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

  function confidenceLevel({ sampleCount = 0, historyDays = 0, hasHardware = false } = {}) {
    if (hasHardware && historyDays >= 5 && sampleCount >= 8) return "research";
    if (sampleCount >= 8 || historyDays >= 5) return "high";
    if (sampleCount >= 3 || historyDays >= 2) return "medium";
    return "low";
  }

  function confidenceLabel(level) {
    return {
      research: "研究级",
      high: "高",
      medium: "中",
      low: "低"
    }[level] || "低";
  }

  function safetyFlagsForSymptoms(symptoms = {}, sampleCount = 0) {
    const values = Object.values(symptoms).map((value) => Number(value) || 0);
    const maxSymptom = Math.max(0, ...values);
    if (maxSymptom >= 8 && sampleCount >= 2) return ["persistent_severe_symptoms"];
    if (numericSymptom(symptoms, "blur") >= 8) return ["vision_change_reported"];
    return [];
  }

  function topContributorName(contributors) {
    const names = {
      symptom: "感受自评",
      behavior: "连续盯屏",
      recovery: "恢复抵消",
      environment: "环境信号",
      responseFit: "提醒适配"
    };
    return Object.entries(contributors)
      .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
      .map(([key, value]) => [names[key] || key, value])[0];
  }

  function baselineSummary(load, baselineLoads = []) {
    const loads = Array.isArray(baselineLoads)
      ? baselineLoads.map((value) => clampLoad(value)).filter((value) => value > 0)
      : [];
    if (!loads.length) {
      return {
        sampleCount: 0,
        average: null,
        delta: 0,
        volatility: 0,
        status: "insufficient"
      };
    }
    const average = loads.reduce((sum, value) => sum + value, 0) / loads.length;
    const variance = loads.reduce((sum, value) => sum + ((value - average) ** 2), 0) / loads.length;
    const volatility = Math.round(Math.sqrt(variance));
    const delta = Math.round(load - average);
    return {
      sampleCount: loads.length,
      average: Math.round(average),
      delta,
      volatility,
      status: loads.length < 7 ? "forming" : delta >= 12 ? "above" : delta <= -12 ? "below" : "stable"
    };
  }

  function computeEyeLoadAnalysis({
    symptoms = {},
    elapsedSeconds = 0,
    breaks = 0,
    reminderStats = {},
    sampleCount = 0,
    historyDays = 0,
    baselineLoads = [],
    hasDesktopContext = false,
    hasHardware = false,
    qualityFlags = []
  } = {}) {
    const normalizedSymptoms = {
      dryness: numericSymptom(symptoms, "dryness"),
      strain: numericSymptom(symptoms, "strain"),
      blur: numericSymptom(symptoms, "blur"),
      light: numericSymptom(symptoms, "light")
    };
    const rawSymptom = symptomLoadScore(symptoms);
    const rawBehavior = Math.min(36, Number(elapsedSeconds || 0) / 60 * 1.35);
    const rawRecovery = Math.min(18, Number(breaks || 0) * 4);
    const symptom = clampValue(rawSymptom, 0, 40);
    const behavior = clampValue(rawBehavior, 0, 35);
    const recovery = -clampValue(rawRecovery, 0, 25);
    const environment = 0;
    const handled = Number(reminderStats.completed || 0) + Number(reminderStats.snoozed || 0);
    const ignored = Number(reminderStats.ignored || 0);
    const responseFit = Number(reminderStats.shown || 0) >= 2 && ignored > handled ? 4 : 0;
    const contributors = {
      symptom: Number(symptom.toFixed(1)),
      behavior: Number(behavior.toFixed(1)),
      recovery: Number(recovery.toFixed(1)),
      environment,
      responseFit
    };
    const selfReportFloor = 12 + rawSymptom;
    const load = clampLoad(Math.max(selfReportFloor, 12 + rawSymptom + rawBehavior - rawRecovery));
    const baseline = baselineSummary(load, baselineLoads);
    const confidence = confidenceLevel({ sampleCount, historyDays, hasHardware });
    const missingSignals = [];
    if (!hasDesktopContext) missingSignals.push("desktopContext");
    if (!hasHardware) {
      missingSignals.push("blinkCompleteness", "gazeDistance", "ambientLux", "relativeHumidity");
    }
    if (baseline.sampleCount < 7) missingSignals.push("personalBaseline");
    const [topContributor] = topContributorName(contributors);
    const explanation = [
      `${topContributor}是当前主要贡献项。`,
      recovery < 0 ? "已完成恢复正在抵消部分状态累积。" : "尚未形成明显恢复抵消。",
      confidence === "low" ? "样本仍少，趋势判断保持低置信度。" : "已有一定历史样本，可用于趋势判断。"
    ];

    return {
      modelVersion: MODEL_VERSION,
      knowledgeBaseVersion: KNOWLEDGE_BASE_VERSION,
      dataDictionaryVersion: DATA_DICTIONARY_VERSION,
      load,
      zone: load >= 74 ? "high" : load >= 48 ? "medium" : "comfort",
      symptoms: normalizedSymptoms,
      baseline,
      confidence,
      confidenceLabel: confidenceLabel(confidence),
      contributors,
      evidenceRefs: [
        "des.symptoms.self-report",
        "des.behavior.continuous-near-work",
        "des.recovery.short-visual-break"
      ],
      explanation,
      missingSignals,
      safetyFlags: safetyFlagsForSymptoms(symptoms, sampleCount),
      qualityFlags: Array.isArray(qualityFlags) ? qualityFlags : []
    };
  }

  function computeEyeLoadScore(options = {}) {
    return computeEyeLoadAnalysis(options).load;
  }

  function classifyLoad(load) {
    if (load >= 74) return "状态偏高";
    if (load >= 48) return "状态中段";
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
    if (level === "clear") return "L3 明确提醒";
    if (level === "standard") return "L2 轻提示";
    return "L1 安静";
  }

  function modeActionCopy(level) {
    if (level === "force") return "到恢复断点进入全屏恢复，时间到才回到工作界面";
    if (level === "clear") return "到恢复断点或状态信号偏高时明确提醒，连续超出目标会说得更清楚";
    if (level === "standard") return "到恢复断点短暂轻提示，你可以休息或稍后处理";
    return "先轻提醒陪伴，不抢你的控制权";
  }

  // The TODAY share-card lead line: one honest "what I see today + a gentle next
  // step" sentence, computed only from TODAY's observable state (focus so far,
  // breaks taken, load zone, self-reported symptoms, reminder responses). It makes
  // NO multi-day behavioral claim — that needs the closed-loop rhythm engine, which
  // is still open-loop, so faking a pattern here would be dishonest. Week/month lead
  // lines stay unbuilt until that engine exists.
  function todayActionInsight(input = {}) {
    const focusSeconds = Math.max(0, Number(input.focusSeconds || 0));
    const breaks = Math.max(0, Number(input.breaks || 0));
    const focusTargetMinutes = Math.max(1, Number(input.focusTargetMinutes || 50));
    const zone = input.zone || "comfort";
    const symptoms = input.symptoms || {};
    const reminderStats = input.reminderStats || {};
    const focusMinutes = focusSeconds / 60;
    const hasActivity = focusSeconds >= 60 || breaks > 0;

    if (!hasActivity) return "新的一天。先照顾好眼睛，我在旁边陪着。";
    if (zone === "high") return "今天眼睛偏累了。下一轮短一点，先让它松一下。";
    if (focusMinutes >= focusTargetMinutes && breaks === 0) {
      return "今天专注攒了不少，还没停过。别一路撑到底——给眼睛一次远眺。";
    }
    // Dominant self-reported symptom (only when clearly elevated).
    const symptomLines = [
      ["strain", Number(symptoms.strain || 0), "今天眼睛发酸偏明显。停一下、看看远处，比硬撑管用。"],
      ["dryness", Number(symptoms.dryness || 0), "今天干涩偏明显。眨眨眼、看向远处，让眼睛润一下。"],
      ["blur", Number(symptoms.blur || 0), "今天有点看不清。离屏幕远一点，给焦距换换气。"],
      ["light", Number(symptoms.light || 0), "今天对光偏敏感。调暗一点、多远眺，眼睛会舒服些。"]
    ].sort((a, b) => b[1] - a[1]);
    if (symptomLines[0][1] >= 6) return symptomLines[0][2];

    if (breaks >= 1 && zone === "comfort") {
      return "今天有停下来护眼，这个节奏对眼睛刚好。保持。";
    }
    const shown = Number(reminderStats.shown || 0);
    const ignored = Number(reminderStats.ignored || 0);
    if (shown >= 2 && ignored >= shown / 2) {
      return "今天的提醒多半被留到了稍后。不催你，累了早点停会更轻。";
    }
    return "今天在稳稳地用眼。到断点时停一下，让节奏松一点。";
  }

  // Recap-page "月 = 趋势" (Slice A): ONE observed-trend sentence from the
  // EyeFlowRhythm.monthlyTrend signals, or null when the month isn't confidently
  // readable (the caller then falls back to the quote-led card). Same honesty rule as
  // todayActionInsight — it describes what happened (accepted rest more / deferred more /
  // stayed steady), never a causal promise, and never an uncomputable claim (those live
  // in the engine's degraded[]).
  function monthTrendInsight(trend = {}) {
    if (!trend || !trend.ready) return null;
    const rest = trend.rest || {};
    if (rest.ready && rest.direction === "rising-accept") {
      return "这个月，你越来越接得住休息了。";
    }
    if (rest.ready && rest.direction === "falling-accept") {
      return "这个月的提醒，慢慢被留到“稍后”的多了。";
    }
    const recovery = trend.recovery || {};
    if (recovery.ready && recovery.steady) {
      return "这一个月，护眼的节奏一直很稳。";
    }
    return null;
  }

  return {
    clampLoad,
    symptomLoadScore,
    estimateInitialLoad,
    computeEyeLoadAnalysis,
    computeEyeLoadScore,
    classifyLoad,
    initialRhythmForLoad,
    intensityLabel,
    modeActionCopy,
    todayActionInsight,
    monthTrendInsight
  };
})();
