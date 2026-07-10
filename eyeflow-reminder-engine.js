// EyeFlow 压力引擎 —— 提醒触发的唯一决策源(治本,规格 v1 · P0 已批准)。
//
// 纪律(docs/EYEFLOW_PROGRESSIVE_REMINDER_IMPL.md §0b/§0c):
// - 纯函数:无 Date.now() / Math.random(),时间一律由观测参数注入。
// - 单调:压力只随「在场用眼时间」上升;下降只经 settleRest 结算。
// - 输入面窄:观测只有 { nowMs, idleSeconds }。前台 app、load、当日统计
//   这类抖动/共情信号一律不进引擎——它们只允许在投递层影响"风格",
//   永远改不了 breakDue(病例 C1/C2 的结构性灭绝)。
// - 意图是水平信号(level-triggered):同一状态查询多少次都得到同一意图,
//   没有 escalated/驻留/breakBypass 这些边沿概念(病例 C3)。
// - 场景表 §0c 是行为的唯一事实源;改行为先改表,再改 smoke,再改这里。
(function () {
  const PARAMS = {
    // 压力级阈值(§1;T_L1 未来可配置)
    T_L1_SECONDS: 40 * 60,
    T_L2_SECONDS: 60 * 60,
    T_L3_SECONDS: 90 * 60,
    // 压力级 3 还需 micro 被显式跳过 ≥2 次(§1)
    L3_SKIP_GATE: 2,
    // idle < 300s = 在场(被动盯屏也是用眼,D3 / e215fd6)
    PRESENT_IDLE_SECONDS: 300,
    // 连续 idle ≥ 300s = 真离开 → full 结算(P1 拍板:暂停/重置合并为一条,
    // "暂停态"是概念债——≥5min 缺席按既有语义本来就是休息)
    AWAY_FULL_SECONDS: 300,
    // micro 完成的降压量。体验参数:dogfood 后可调,只动数值不动引擎。
    MICRO_RELIEF_SECONDS: 15 * 60
  };

  // 强度封顶(D1):用户四档的含义 = Mira 最多能 push 到哪级,不再直接决定行为。
  const CEILING = { quiet: 1, standard: 2, clear: 3, force: 3 };

  function createState(nowMs) {
    return {
      eyeSeconds: 0,        // 累积在场用眼秒数(唯一的压力基量)
      skipCount: 0,         // 显式跳过 micro 的次数(full 结算清零)
      away: false,          // 是否处于"真离开"段(保证 away 结算只发一次)
      lastObsAtMs: Number(nowMs) || 0
    };
  }

  // ── 1/3 pressureStep(prev, obs) — 单调压力引擎 ─────────────────────
  // obs = { nowMs, idleSeconds }。返回 { state, settled }:
  // settled 仅在跨入"真离开"那一帧非空 = { kind: "away-full", awaySeconds },
  // 供接线层记一次自然离屏账;引擎自身同时完成 full 结算(清零)。
  function pressureStep(prev, obs) {
    const nowMs = Number(obs && obs.nowMs) || 0;
    const idleSeconds = Math.max(0, Number(obs && obs.idleSeconds) || 0);
    const lastMs = Number(prev && prev.lastObsAtMs) || nowMs;
    const deltaSeconds = Math.max(0, (nowMs - lastMs) / 1000);
    const state = {
      eyeSeconds: Math.max(0, Number(prev && prev.eyeSeconds) || 0),
      skipCount: Math.max(0, Number(prev && prev.skipCount) || 0),
      away: Boolean(prev && prev.away),
      lastObsAtMs: nowMs
    };
    let settled = null;
    if (idleSeconds >= PARAMS.AWAY_FULL_SECONDS) {
      if (!state.away) {
        settled = { kind: "away-full", awaySeconds: Math.round(idleSeconds) };
        state.eyeSeconds = 0;
        state.skipCount = 0;
        state.away = true;
      }
      // 离开持续期间:不累积,也不再重复结算
    } else {
      state.away = false;
      state.eyeSeconds += deltaSeconds; // 在场(含 idle<300s 的被动盯屏)一律累积
    }
    return { state, settled };
  }

  function pressureLevel(state) {
    const eye = Math.max(0, Number(state && state.eyeSeconds) || 0);
    const skips = Math.max(0, Number(state && state.skipCount) || 0);
    if (eye >= PARAMS.T_L3_SECONDS && skips >= PARAMS.L3_SKIP_GATE) return 3;
    if (eye >= PARAMS.T_L2_SECONDS) return 2;
    if (eye >= PARAMS.T_L1_SECONDS) return 1;
    return 0;
  }

  // 文案上下文里的时段——实时取自注入时刻(事实纪律 C8:可验证事实要么实时算
  // 要么不说)。阈值与 eyeflow-ui-utils timeBucket 同口径。
  function timeBucketOf(nowMs) {
    const hour = new Date(Number(nowMs) || 0).getHours();
    if (hour < 11) return "上午";
    if (hour < 14) return "中午";
    if (hour < 18) return "下午";
    return "晚上";
  }

  // ── 2/3 intentFor(state, settings) — 意图查表(水平信号) ─────────────
  // 返回 { level, surface, breakDue, context }。context 是文案层允许引用的
  // 全部事实:{ level, surface, bucket, minutes } —— 没有历史日期/星期字段。
  function intentFor(state, settings) {
    const intensity = String((settings && settings.intensity) || "standard");
    const cap = CEILING[intensity] != null ? CEILING[intensity] : CEILING.standard;
    const level = Math.min(pressureLevel(state), cap);
    const surface = level === 0
      ? "none"
      : level === 1
        ? "glow"
        : level === 2
          ? "island-micro"
          : intensity === "force" ? "hard-full" : "soft-full";
    const breakDue = level >= 2;
    return {
      level,
      surface,
      breakDue,
      context: {
        level,
        surface,
        bucket: timeBucketOf(state && state.lastObsAtMs),
        minutes: Math.floor(Math.max(0, Number(state && state.eyeSeconds) || 0) / 60)
      }
    };
  }

  // ── 3/3 settleRest(state, rest) — 结算唯一入口 ──────────────────────
  // rest.kind:
  //   "micro"           完成 20s 轻仪式 → 降压 MICRO_RELIEF,不清 skipCount;
  //                     ledger 记实际时长(病例 C4:歇眼账 = 真实发生的秒数)
  //   "full"            完整休息 → 清零 + skipCount 归零
  //   "micro-skip"      显式跳过 → 仅 skipCount += 1(喂 L3 门,§1)
  //   "micro-uncertain" 传感拿不准 → 零变化、零记账(病例 C7:不确定不记负面账)
  // 返回 { state, ledger };ledger 为 null 表示无账可记。
  function settleRest(prev, rest) {
    const kind = String((rest && rest.kind) || "");
    const state = {
      eyeSeconds: Math.max(0, Number(prev && prev.eyeSeconds) || 0),
      skipCount: Math.max(0, Number(prev && prev.skipCount) || 0),
      away: Boolean(prev && prev.away),
      lastObsAtMs: Number(prev && prev.lastObsAtMs) || 0
    };
    if (kind === "micro") {
      state.eyeSeconds = Math.max(0, state.eyeSeconds - PARAMS.MICRO_RELIEF_SECONDS);
      return {
        state,
        ledger: { kind: "micro", recoverySeconds: Math.max(0, Math.round(Number(rest && rest.seconds) || 0)) }
      };
    }
    if (kind === "full") {
      state.eyeSeconds = 0;
      state.skipCount = 0;
      return {
        state,
        ledger: { kind: "full", recoverySeconds: Math.max(0, Math.round(Number(rest && rest.seconds) || 0)) }
      };
    }
    if (kind === "micro-skip") {
      state.skipCount += 1;
      return { state, ledger: null };
    }
    // "micro-uncertain" 及未知种类:诚实地什么都不做
    return { state, ledger: null };
  }

  const api = { PARAMS, createState, pressureStep, pressureLevel, intentFor, settleRest };
  if (typeof window !== "undefined") window.EyeFlowReminderEngine = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
