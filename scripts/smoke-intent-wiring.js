#!/usr/bin/env node
// 接线守卫 — 压力引擎 intent 的「产出字段」与渲染端「消费字段」必须两端一致。
//
// 由来(2026-07-12,P4 dogfood):引擎 intentFor 产出 context.bucket,渲染端却
// 从没读它(孤儿字段),通知改去读记账时缓存的 signal.bucket → 缓存过期显示错
// 时段(周三 bug)。反过来,渲染端若把 intent.context.bucket 手误写成
// intent.context.timeBucket,静态上没人拦、跑起来是 undefined。两类都属「接线
// 断点」,本守卫把它们变成红灯。
//
// 事实源 = 引擎运行时真实产出(vm 跑一遍 intentFor,取 Object.keys),不靠解析
// 字符串猜。渲染端消费 = index.html 里对 `intent.*` / `intent.context.*` 的成员
// 访问(index.html 对 intent 无解构,全是成员访问 —— 见 grep 确认)。

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const ENGINE_FILE = "eyeflow-reminder-engine.js";
const UI_FILE = "index.html";

let failures = 0;
let checks = 0;
function assert(cond, label) {
  checks += 1;
  if (!cond) {
    failures += 1;
    console.error(`  ✗ ${label}`);
  }
}

// ── 引擎产出:跑一遍拿真实 schema(非空 intent,含 context) ────────────────
const engineSource = fs.readFileSync(path.join(root, ENGINE_FILE), "utf8");
const sandbox = { window: {} };
vm.createContext(sandbox);
new vm.Script(engineSource, { filename: ENGINE_FILE }).runInContext(sandbox);
const engine = sandbox.window.EyeFlowReminderEngine;
assert(engine && typeof engine.intentFor === "function", "引擎导出 intentFor");

const probe = engine.createState(0);
probe.eyeSeconds = 60 * 60; // 保证 level≥1、surface≠none、context 全字段有值
const intent = engine.intentFor(probe, { intensity: "standard" });
const producedTop = new Set(Object.keys(intent));
const producedCtx = new Set(Object.keys(intent.context));

// ── 契约携带字段:引擎产出、但渲染端「故意」不直接透传的字段(每条都要有理由)──
// 新增引擎字段若无人消费,默认会红 —— 逼一次显式决定,不许静默长孤儿。
const CARRIED_TOP = new Map([
  ["breakDue", "翻译层带 force-escape 覆盖重新裁决 breakDue(P3 决策3),不直接透传"],
  ["context", "容器字段,通过 context.* 消费"]
]);
const CARRIED_CTX = new Map([
  ["level", "C8 文案上下文契约字段:允许文案引用,当前文案未插值"],
  ["surface", "C8 文案上下文契约字段:允许文案引用,当前文案未插值"]
]);

// ── 渲染端消费:index.html 对 intent 的成员访问 ────────────────────────────
const ui = fs.readFileSync(path.join(root, UI_FILE), "utf8");
const ctxReads = new Set();
const topReads = new Set();
let m;
const ctxRe = /\bintent\.context\.([a-zA-Z_]\w*)/g;
while ((m = ctxRe.exec(ui)) !== null) ctxReads.add(m[1]);
const topRe = /\bintent\.([a-zA-Z_]\w*)/g;
while ((m = topRe.exec(ui)) !== null) topReads.add(m[1]);
// intent.context.X 也会让 topRe 命中 "context" —— 正确,context 是产出的顶层字段。

// ── ① 幻读:渲染端读了引擎不产出的字段 = 命名孤儿/手误 → 红 ────────────────
for (const f of [...topReads].sort()) {
  assert(producedTop.has(f), `渲染端读的 intent.${f} 是引擎真实产出的字段(非手误)`);
}
for (const f of [...ctxReads].sort()) {
  assert(producedCtx.has(f), `渲染端读的 intent.context.${f} 是引擎真实产出的字段(非手误)`);
}

// ── ② 孤儿:引擎产出、渲染端既不读也未登记为契约携带 → 红 ──────────────────
for (const f of [...producedTop].sort()) {
  assert(
    topReads.has(f) || CARRIED_TOP.has(f),
    `引擎产出的 intent.${f} 被消费或已登记为契约携带字段(否则=孤儿)`
  );
}
for (const f of [...producedCtx].sort()) {
  assert(
    ctxReads.has(f) || CARRIED_CTX.has(f),
    `引擎产出的 intent.context.${f} 被消费或已登记为契约携带字段(否则=孤儿)`
  );
}

if (failures > 0) {
  console.error(
    `\n[smoke:intent-wiring] RED — ${failures}/${checks} 项未过。` +
      `引擎 intent 的产出字段与渲染端消费字段对不上(孤儿或手误)。` +
      `产出=${JSON.stringify({ top: [...producedTop], context: [...producedCtx] })};` +
      `消费=${JSON.stringify({ top: [...topReads], context: [...ctxReads] })}。`
  );
  process.exit(1);
}

console.log(
  `[smoke:intent-wiring] PASSED. ${checks} checks green — ` +
    `intent 产出 ${producedTop.size} 顶层 + ${producedCtx.size} context 字段,` +
    `渲染端消费/契约携带两端一致,无孤儿无手误。`
);
