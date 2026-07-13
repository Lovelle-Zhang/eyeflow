// 在场传感的纯逻辑 —— 零 electron 依赖,可 node 直接单测。
//
// 由来(2026-07-12,dogfood):引擎拿"键鼠空闲"当"眼睛在不在用"的替身,对被动
// 观看(看视频/直播/演示)完全失明——零输入却满负荷用眼。满 5 分钟空闲被判"真
// 离开"、压力清零,于是看一小时教学可能一次提醒都不来(最坏的漏保护)。
//
// 补法:macOS 上视频/演示播放时,app 会持有 PreventUserIdleDisplaySleep(阻止息屏)
// 断言——这是"眼在看屏、只是没动手"的可靠信号(纯音频播放持有的是系统级睡眠断言、
// 不代表在看屏,故只认显示级)。传感器据此把上报的 idle 压到 away 阈值以下,让引擎
// 继续累积;引擎本身不动(仍是 {nowMs, idleSeconds} 的纯函数)。
(function () {
  // 解析 `pmset -g assertions` 输出:是否有"阻止息屏"断言被持有。
  // system-wide 块里形如 `PreventUserIdleDisplaySleep    1`。count>0 = 有东西在
  // 让屏幕不息 = 大概率在看视频/演示。
  function parseDisplayViewingActive(pmsetOutput) {
    if (!pmsetOutput || typeof pmsetOutput !== "string") return false;
    const m = pmsetOutput.match(/PreventUserIdleDisplaySleep\s+(\d+)/);
    return Boolean(m && Number(m[1]) > 0);
  }

  // 传感器侧的 idle 翻译:持有显示级观看断言时,即便键鼠零输入,人也在看屏——
  // 上报一个被钳到 cap 以下的 idle,让压力引擎继续累积(视频场景不再假清零)。
  // 三道护栏,按优先级:
  //   ① screenLocked = 权威离开,永不钳制(锁屏一定没在看);
  //   ② 无观看断言 = 相信原始 idle(该清就清);
  //   ③ 跑逃:断言被后台任务长时间持有、而人其实走了 —— raw ≥ maxHold 松开钳制,
  //      让压力仍能结算(默认 45 分钟:真看视频的人几乎必在此前有过滚动/微操)。
  function effectiveIdleSeconds(input) {
    const raw = Math.max(0, Number(input && input.rawIdleSeconds) || 0);
    const viewingActive = Boolean(input && input.viewingActive);
    const screenLocked = Boolean(input && input.screenLocked);
    const cap = Number(input && input.cap);
    const maxHold = Number(input && input.maxHoldSeconds);
    const capValue = Number.isFinite(cap) ? Math.max(0, cap) : 30;
    const maxHoldValue = Number.isFinite(maxHold) ? maxHold : 45 * 60;
    if (screenLocked) return raw;        // ① 锁屏权威离开
    if (!viewingActive) return raw;      // ② 无观看信号,信原始 idle
    if (raw >= maxHoldValue) return raw; // ③ 跑逃:媒体空放、人已离开
    return Math.min(raw, capValue);      // 在看:钳到 cap 以下,引擎继续累积
  }

  const api = { parseDisplayViewingActive, effectiveIdleSeconds };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.EyeFlowPresence = api;
})();
