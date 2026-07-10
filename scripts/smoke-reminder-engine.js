#!/usr/bin/env node
// 场景表驱动的压力引擎行为测试。
//
// 唯一事实源 = docs/EYEFLOW_PROGRESSIVE_REMINDER_IMPL.md `0c. P1 场景表 v1`
// （2026-07-10 逐行批准）。行有增删改必须先改表、再改这里——本文件只是表的
// 可执行形式,不得夹带表以外的语义。
//
// 覆盖:基线 B1–B6 + 病例 C1–C9(dogfood 2026-07-08~10)。引擎必须全绿才进 P3。

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const ENGINE_FILE = "eyeflow-reminder-engine.js";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

let failures = 0;
let checks = 0;
function assert(cond, label) {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${label}`);
  }
}
function assertEqual(actual, expected, label) {
  assert(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${label} — got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`
  );
}

// ── 引擎加载(vm 独立执行,零依赖纯函数模块) ────────────────────────────
if (!fs.existsSync(path.join(root, ENGINE_FILE))) {
  console.error(`[smoke:reminder-engine] RED — engine module missing: ${ENGINE_FILE}`);
  process.exit(1);
}
const engineSource = read(ENGINE_FILE);
const sandbox = { window: {} };
vm.createContext(sandbox);
new vm.Script(engineSource, { filename: ENGINE_FILE }).runInContext(sandbox);
const E = sandbox.window.EyeFlowReminderEngine;
if (!E) {
  console.error("[smoke:reminder-engine] RED — window.EyeFlowReminderEngine not exported");
  process.exit(1);
}

// ── 参数钉死(P1 批准值;MICRO_RELIEF 为体验参数,dogfood 后只动数值不动引擎) ─
assertEqual(E.PARAMS.T_L1_SECONDS, 40 * 60, "T_L1 = 40min");
assertEqual(E.PARAMS.T_L2_SECONDS, 60 * 60, "T_L2 = 60min");
assertEqual(E.PARAMS.T_L3_SECONDS, 90 * 60, "T_L3 = 90min");
assertEqual(E.PARAMS.L3_SKIP_GATE, 2, "L3 需 skipCount ≥ 2");
assertEqual(E.PARAMS.PRESENT_IDLE_SECONDS, 300, "PRESENT_IDLE = 300s(被动盯屏算用眼)");
assertEqual(E.PARAMS.AWAY_FULL_SECONDS, 300, "AWAY_FULL = 300s(暂停/重置合并为一条)");
assertEqual(E.PARAMS.MICRO_RELIEF_SECONDS, 15 * 60, "MICRO_RELIEF = 15min(体验参数)");

// ── 场景执行器(输入 DSL → 引擎调用) ──────────────────────────────────
const FRAME = 10; // 秒;观测帧粒度
function t0() {
  // 本地 2026-07-10 09:00 —— bucket 判定用本地小时,构造本地时间保证跨时区确定性
  return new Date(2026, 6, 10, 9, 0, 0).getTime();
}
function makeRun(intensity) {
  return { state: E.createState(t0()), nowMs: t0(), intensity, settles: [], trace: [] };
}
function step(run, deltaSeconds, idleSeconds, extra) {
  run.nowMs += deltaSeconds * 1000;
  const obs = { nowMs: run.nowMs, idleSeconds, ...(extra || {}) };
  const out = E.pressureStep(run.state, obs);
  run.state = out.state;
  if (out.settled) run.settles.push(out.settled);
}
function present(run, minutes, extra, trace) {
  const total = Math.round(minutes * 60);
  for (let s = FRAME; s <= total; s += FRAME) {
    step(run, FRAME, 0, extra);
    if (trace) run.trace.push(intentBrief(run));
  }
}
function idleRun(run, seconds) {
  for (let s = FRAME; s <= seconds; s += FRAME) step(run, FRAME, s);
}
function away(run, minutes) {
  const total = Math.round(minutes * 60);
  for (let s = FRAME; s <= total; s += FRAME) step(run, FRAME, s);
}
function intent(run) {
  return E.intentFor(run.state, { intensity: run.intensity });
}
function intentBrief(run) {
  const i = intent(run);
  return `${i.level}/${i.surface}`;
}
function expectIntent(run, level, surface, due, label) {
  const i = intent(run);
  assertEqual(
    { level: i.level, surface: i.surface, breakDue: i.breakDue },
    { level, surface, breakDue: due },
    label
  );
}
function micro(run, seconds) {
  const r = E.settleRest(run.state, { kind: "micro", seconds });
  run.state = r.state;
  return r;
}
function skip(run) {
  run.state = E.settleRest(run.state, { kind: "micro-skip" }).state;
}
function uncertain(run) {
  const before = JSON.stringify(run.state);
  const r = E.settleRest(run.state, { kind: "micro-uncertain" });
  run.state = r.state;
  return { unchanged: JSON.stringify(run.state) === before, ledger: r.ledger };
}
function full(run, seconds) {
  const r = E.settleRest(run.state, { kind: "full", seconds });
  run.state = r.state;
  return r;
}
function eyeMinutes(run) {
  return Math.floor(run.state.eyeSeconds / 60);
}

function main() {
  // ── B1 该提醒必提醒(clear) ─────────────────────────────────────────
  console.log("B1 该提醒必提醒");
  {
    const run = makeRun("clear");
    present(run, 40);
    expectIntent(run, 1, "glow", false, "B1 @40m → L1/glow");
    present(run, 20);
    expectIntent(run, 2, "island-micro", true, "B1 @60m → L2/岛micro/due");
    skip(run);
    skip(run);
    present(run, 30);
    expectIntent(run, 3, "soft-full", true, "B1 @90m(skip×2) → L3/软全屏/due");
  }

  // ── B2 micro 降压不清零(standard) ──────────────────────────────────
  console.log("B2 micro 降压不清零");
  {
    const run = makeRun("standard");
    present(run, 60);
    expectIntent(run, 2, "island-micro", true, "B2 @60m → L2/due");
    micro(run, 20);
    assertEqual(eyeMinutes(run), 45, "B2 micro 后累积 = 45min");
    expectIntent(run, 1, "glow", false, "B2 micro 后 → L1/无due");
    present(run, 15);
    expectIntent(run, 2, "island-micro", true, "B2 +15m 累积回满 60m → 再次 L2/due");
  }

  // ── B3 full 清零(clear) ────────────────────────────────────────────
  console.log("B3 full 清零");
  {
    const run = makeRun("clear");
    present(run, 70);
    full(run, 60);
    assertEqual(run.state.eyeSeconds, 0, "B3 full 后累积 = 0");
    assertEqual(run.state.skipCount, 0, "B3 full 后 skipCount = 0");
    expectIntent(run, 0, "none", false, "B3 full 后 → L0/none");
    present(run, 39);
    expectIntent(run, 0, "none", false, "B3 +39m 仍 L0(39 < 40)");
    present(run, 1);
    expectIntent(run, 1, "glow", false, "B3 +40m → L1");
  }

  // ── B4 封顶语义(四档同序列) ────────────────────────────────────────
  console.log("B4 封顶语义");
  {
    const expected = {
      quiet: [1, "glow", false],
      standard: [2, "island-micro", true],
      clear: [3, "soft-full", true],
      force: [3, "hard-full", true]
    };
    for (const [intensity, [level, surface, due]] of Object.entries(expected)) {
      const run = makeRun(intensity);
      present(run, 60);
      skip(run);
      skip(run);
      present(run, 35);
      expectIntent(run, level, surface, due, `B4 ${intensity} @95m+skip×2 → L${level}/${surface}`);
    }
  }

  // ── B5 离开即清(standard) ──────────────────────────────────────────
  console.log("B5 离开即清");
  {
    const run = makeRun("standard");
    present(run, 50);
    away(run, 5);
    assertEqual(run.settles.length, 1, "B5 away 触发恰好一次 full 结算");
    assertEqual(run.settles[0].kind, "away-full", "B5 结算类型 = away-full(自然离屏账)");
    assert(run.settles[0].awaySeconds >= 300, "B5 自然离屏账 ≥ 300s");
    expectIntent(run, 0, "none", false, "B5 away 后 → L0");
    present(run, 10);
    expectIntent(run, 0, "none", false, "B5 回来 +10m 仍 L0(10 < 40)");
  }

  // ── B6 被动盯屏算用眼(standard) ────────────────────────────────────
  console.log("B6 被动盯屏算用眼");
  {
    const run = makeRun("standard");
    for (let cycle = 0; cycle < 8; cycle++) {
      present(run, 0.5);   // 敲键 30s
      idleRun(run, 240);   // idle 240s(< 300,属在场)
    }
    present(run, 4);        // 8×(30s+240s)=36min + 4min = 40min
    assertEqual(eyeMinutes(run), 40, "B6 idle<300s 全部计入 → 累积 40min");
    expectIntent(run, 1, "glow", false, "B6 @40m → L1/glow");
  }

  // ── C1 静默闸缺席(结构性灭绝) ──────────────────────────────────────
  console.log("C1 静默闸缺席");
  {
    const noise = { frontApp: "Google Chrome", load: 80, todayIgnored: 5, deepWork: true };
    const run = makeRun("clear");
    present(run, 40, noise);
    expectIntent(run, 1, "glow", false, "C1 噪声在场 @40m 与 B1 相同");
    present(run, 20, noise);
    expectIntent(run, 2, "island-micro", true, "C1 噪声在场 @60m 与 B1 相同");
    skip(run);
    skip(run);
    present(run, 30, noise);
    expectIntent(run, 3, "soft-full", true, "C1 噪声在场 @90m 与 B1 相同(断点永不被吞)");
    for (const forbidden of ["isDeepWorkApp", "frontApp", "appName", "deepWork", "activeSeconds", "weekday", "getDay"]) {
      assert(!engineSource.includes(forbidden), `C1 引擎源码不含抖动/共情输入: ${forbidden}`);
    }
  }

  // ── C2 切 app 狂跳(单调性) ─────────────────────────────────────────
  console.log("C2 切 app 狂跳");
  {
    const run = makeRun("clear");
    let flip = false;
    const total = 61 * 60;
    for (let s = FRAME; s <= total; s += FRAME) {
      flip = !flip;
      step(run, FRAME, 0, { frontApp: flip ? "Google Chrome" : "Slack" });
      run.trace.push(intentBrief(run));
    }
    let transitions = 0;
    for (let i = 1; i < run.trace.length; i++) {
      if (run.trace[i] !== run.trace[i - 1]) transitions += 1;
    }
    assertEqual(transitions, 2, "C2 61 分钟 app 每 10s 切换 → intent 仅在 40/60m 各变一次");
    expectIntent(run, 2, "island-micro", true, "C2 @61m → L2(稳定)");
  }

  // ── C3 热身双跳(水平信号) ──────────────────────────────────────────
  console.log("C3 热身双跳");
  {
    const run = makeRun("clear");
    present(run, 60);
    const first = intent(run);
    step(run, 2, 0); // T+2s
    const second = intent(run);
    assertEqual(second, first, "C3 T 与 T+2s 的意图完全一致(无边沿,无补枪)");
  }

  // ── C4 岛记零(结算账目) ────────────────────────────────────────────
  console.log("C4 岛记零");
  {
    const run = makeRun("standard");
    present(run, 60);
    const before = run.state.skipCount;
    const r = micro(run, 20);
    assertEqual(r.ledger, { kind: "micro", recoverySeconds: 20 }, "C4 settle 输出歇眼 +20s(实际时长)");
    assertEqual(eyeMinutes(run), 45, "C4 压力 −15min(60 → 45)");
    assertEqual(run.state.skipCount, before, "C4 skipCount 不变");
  }

  // ── C5 灰卡挂死(结算后 due 必落) ───────────────────────────────────
  console.log("C5 灰卡挂死");
  {
    const run = makeRun("standard");
    present(run, 60);
    micro(run, 20);
    expectIntent(run, 1, "glow", false, "C5 micro 后 → L1/due=false(派生 UI 随 due 消失,接线断言在 P3)");
  }

  // ── C6 待命态误触发(look-away 余波) ────────────────────────────────
  console.log("C6 待命态误触发");
  {
    const run = makeRun("standard");
    present(run, 60);
    micro(run, 20);
    idleRun(run, 30); // look-away 余波:idle 30s(<300,属在场)
    assertEqual(eyeMinutes(run), 45, "C6 余波仅 +30s → 累积仍 45min 档");
    expectIntent(run, 1, "glow", false, "C6 无陈旧计数可再触发 due");
  }

  // ── C7 判定语义(uncertain 零记账;仅显式 skip 记账) ─────────────────
  console.log("C7 判定语义");
  {
    const runA = makeRun("standard");
    present(runA, 60);
    const u = uncertain(runA);
    assert(u.unchanged, "C7 micro? 传感不确定 → 状态零变化");
    assertEqual(u.ledger, null, "C7 micro? → 零记账");
    expectIntent(runA, 2, "island-micro", true, "C7 micro? 后意图不变(仍 L2/due)");

    const runB = makeRun("clear");
    present(runB, 60);
    uncertain(runB);
    skip(runB);
    skip(runB);
    assertEqual(runB.state.skipCount, 2, "C7 仅显式 skip 计数(uncertain 不计)");
    present(runB, 30);
    expectIntent(runB, 3, "soft-full", true, "C7 clear @90m + skip×2 → L3");
  }

  // ── C8 事实纪律(文案上下文 schema) ─────────────────────────────────
  console.log("C8 事实纪律");
  {
    const run = makeRun("standard");
    present(run, 40);
    const i = intent(run);
    assertEqual(Object.keys(i).sort(), ["breakDue", "context", "level", "surface"], "C8 intent 顶层 schema");
    assertEqual(Object.keys(i.context).sort(), ["bucket", "level", "minutes", "surface"], "C8 文案上下文只含 level/surface/bucket/minutes");
    assertEqual(i.context.bucket, "上午", "C8 bucket 实时取自注入时刻(09:40 → 上午)");
    assertEqual(i.context.minutes, 40, "C8 minutes = 实时累积分钟");
    assert(!("weekday" in i.context) && !("date" in i.context), "C8 无历史日期/星期字段");
  }

  // ── C9 结算后机枪(静默窗由降压量自然保证) ──────────────────────────
  console.log("C9 结算后机枪");
  {
    const run = makeRun("standard");
    present(run, 60);
    micro(run, 20);
    const readings = [eyeMinutes(run)];
    expectIntent(run, 1, "glow", false, "C9 结算后即刻 → L1/due=false");
    for (let q = 0; q < 3; q++) {
      present(run, 4);
      readings.push(eyeMinutes(run));
      expectIntent(run, 1, "glow", false, `C9 +${(q + 1) * 4}min 仍 L1/due=false`);
    }
    assertEqual(readings, [45, 49, 53, 57], "C9 累积 45→49→53→57min(无人为冷却,纯累积)");
    present(run, 3);
    expectIntent(run, 2, "island-micro", true, "C9 回满 60m 才再次 L2/due");
  }

  if (failures) {
    console.error(`[smoke:reminder-engine] FAILED. ${failures}/${checks} checks red.`);
    process.exitCode = 1;
  } else {
    console.log(`[smoke:reminder-engine] PASSED. ${checks} checks green — P1 场景表 B1–B6 + C1–C9 全数通过。`);
  }
}

try {
  main();
} catch (error) {
  console.error("[smoke:reminder-engine] FAILED.", error.message);
  process.exitCode = 1;
}
