#!/usr/bin/env node
// 在场传感纯逻辑的行为测试(eyeflow-presence.js)。
// 覆盖:pmset 断言解析 + 视频场景 idle 钳制的四道分支/边界。

const presence = require("../eyeflow-presence");

let failures = 0;
let checks = 0;
function assertEqual(actual, expected, label) {
  checks += 1;
  if (actual !== expected) {
    failures += 1;
    console.error(`  ✗ ${label} — got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);
  }
}

// ── parseDisplayViewingActive ────────────────────────────────────────────────
const heldOutput = [
  "Assertion status system-wide:",
  "   BackgroundTask                 0",
  "   UserIsActive                   1",
  "   PreventUserIdleDisplaySleep    1",
  "   PreventSystemSleep             0"
].join("\n");
const notHeldOutput = heldOutput.replace("PreventUserIdleDisplaySleep    1", "PreventUserIdleDisplaySleep    0");
const multiHeld = heldOutput.replace("PreventUserIdleDisplaySleep    1", "PreventUserIdleDisplaySleep    3");

assertEqual(presence.parseDisplayViewingActive(heldOutput), true, "断言持有(count 1) → 在看");
assertEqual(presence.parseDisplayViewingActive(multiHeld), true, "断言持有(count 3) → 在看");
assertEqual(presence.parseDisplayViewingActive(notHeldOutput), false, "断言 count 0 → 不在看");
assertEqual(presence.parseDisplayViewingActive(""), false, "空输出 → false");
assertEqual(presence.parseDisplayViewingActive(null), false, "null → false");
assertEqual(presence.parseDisplayViewingActive("无关文本"), false, "无该断言字段 → false");

// ── effectiveIdleSeconds ─────────────────────────────────────────────────────
const CAP = 30;
const MAX = 45 * 60;
const base = { cap: CAP, maxHoldSeconds: MAX };

// 无观看信号:原样信任 raw idle(该清就清)
assertEqual(presence.effectiveIdleSeconds({ ...base, rawIdleSeconds: 600, viewingActive: false, screenLocked: false }), 600,
  "无观看信号 → raw(600) 原样,引擎照常在 300s 清零");

// 在看:raw 高但钳到 cap 以下(引擎判在场、继续累积)
assertEqual(presence.effectiveIdleSeconds({ ...base, rawIdleSeconds: 600, viewingActive: true, screenLocked: false }), CAP,
  "看视频 idle=600 → 钳到 cap(30),引擎不再假清零");

// 在看但 raw 本就低于 cap:不抬高
assertEqual(presence.effectiveIdleSeconds({ ...base, rawIdleSeconds: 12, viewingActive: true, screenLocked: false }), 12,
  "看视频 idle=12(<cap) → 原样 12,不无端抬高");

// 锁屏权威离开:即便"在看"断言在,也不钳制
assertEqual(presence.effectiveIdleSeconds({ ...base, rawIdleSeconds: 600, viewingActive: true, screenLocked: true }), 600,
  "锁屏优先 → raw(600),观看断言不得覆盖真离开");

// 跑逃护栏:断言被空放媒体长持、人已离开,raw ≥ maxHold → 松开钳制
assertEqual(presence.effectiveIdleSeconds({ ...base, rawIdleSeconds: MAX, viewingActive: true, screenLocked: false }), MAX,
  "raw 达 maxHold(45min) → 松开钳制,压力可结算");
assertEqual(presence.effectiveIdleSeconds({ ...base, rawIdleSeconds: MAX - 1, viewingActive: true, screenLocked: false }), CAP,
  "raw 差 1 秒到 maxHold → 仍在看、仍钳制(边界)");

// 缺省参数:cap 默认 30 / maxHold 默认 45min
assertEqual(presence.effectiveIdleSeconds({ rawIdleSeconds: 600, viewingActive: true, screenLocked: false }), 30,
  "缺省 cap=30");
assertEqual(presence.effectiveIdleSeconds({ rawIdleSeconds: -5, viewingActive: true, screenLocked: false }), 0,
  "负 raw 夹到 0");

if (failures > 0) {
  console.error(`\n[smoke:presence] RED — ${failures}/${checks} 项未过。`);
  process.exit(1);
}
console.log(`[smoke:presence] PASSED. ${checks} checks green — 断言解析 + 视频场景 idle 钳制(锁屏优先/跑逃护栏/边界)全通过。`);
