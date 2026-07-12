// Throwaway iron-proof harness (P4 dogfood, 2026-07-12).
//
// 目的:证明"引擎的话被 UI 听见了"——不是"引擎在 asar 里"这么弱,而是:喂一个
// 已知输入(累积用眼秒数),让装机版的真实渲染代码(currentReminderIntent →
// currentIntervention → renderCompanion)自己算,看 UI 出的 level/surface 与
// 引擎意图逐项吻合,并截下 Mira 随输入升级的断点态。
//
// 关键:加载的是【装机版 app.asar 解包出来的 index.html + eyeflow-reminder-engine.js】
// (即 /Applications/EyeFlow.app 真正在跑的字节),不是随手 new 一个引擎。
// eyeflowDesktop 桥用 Proxy 打桩,仅为让页面能 boot;提醒决策链一行没动。
//
// 运行:electron scripts/capture-engine-proof.js
// 产物:<outDir>/engine-proof.json(判定表) + mira-L1.png / mira-L2.png(截图)

const { app, BrowserWindow } = require("electron");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const APP_ASAR = process.env.EYEFLOW_PROOF_ASAR
  || "/Applications/EyeFlow.app/Contents/Resources/app.asar";
const OUT_DIR = process.env.EYEFLOW_PROOF_OUT
  || path.join(os.tmpdir(), "eyeflow-engine-proof");

// 已知输入 → 期望(engine PARAMS:L1=40m,L2=60m,L3=90m+skip≥2;ceiling quiet=1)。
const CASES = [
  { label: "0m/standard",      eyeSeconds: 0,    skipCount: 0, intensity: "standard", want: { level: 0, surface: "none",         breakDue: false, minutes: 0  } },
  { label: "40m/standard",     eyeSeconds: 2400, skipCount: 0, intensity: "standard", want: { level: 1, surface: "glow",         breakDue: false, minutes: 40 } },
  { label: "60m/standard",     eyeSeconds: 3600, skipCount: 0, intensity: "standard", want: { level: 2, surface: "island-micro", breakDue: true,  minutes: 60 } },
  { label: "90m+2skip/clear",  eyeSeconds: 5400, skipCount: 2, intensity: "clear",    want: { level: 3, surface: "soft-full",    breakDue: true,  minutes: 90 } },
  { label: "60m/quiet(ceiling)", eyeSeconds: 3600, skipCount: 0, intensity: "quiet",  want: { level: 1, surface: "glow",         breakDue: false, minutes: 60 } }
];

function extractRenderer() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "eyeflow-proof-src-"));
  execFileSync("npx", ["asar", "extract", APP_ASAR, dir], { stdio: "ignore" });
  const indexPath = path.join(dir, "index.html");
  if (!fs.existsSync(indexPath)) throw new Error(`index.html not in ${APP_ASAR}`);
  if (!fs.existsSync(path.join(dir, "eyeflow-reminder-engine.js"))) {
    throw new Error("eyeflow-reminder-engine.js not in the installed asar — packaging fix not shipped");
  }
  return { dir, indexPath };
}

function writeStubPreload(dir) {
  const p = path.join(dir, "__proof_preload.js");
  fs.writeFileSync(p, `
    // 最小桩:让 index.html 能 boot。所有 on* 订阅返回 no-op;await 的 getter 给
    // 无害默认。不碰任何提醒决策——决策全在页面里的引擎+翻译层。
    const settings = { enhancedSensing: false, companionVisible: true, launchAtLogin: false, hideDockOnClose: false };
    const handler = {
      get(_t, prop) {
        if (typeof prop !== "string") return undefined;
        if (prop.startsWith("on")) return () => () => {};
        if (prop === "getPermissionStatus") return async () => ({ accessibility: "granted", screenRecording: "granted" });
        if (prop === "getDesktopSettings" || prop === "setEnhancedSensing" || prop === "setCompanionVisible"
            || prop === "setLaunchAtLogin" || prop === "setHideDockOnClose" || prop === "setReminderIntensity") {
          return async () => ({ ...settings });
        }
        if (prop === "getDiagnostics") return async () => ({});
        return async () => undefined;
      }
    };
    window.eyeflowDesktop = new Proxy({}, handler);
  `);
  return p;
}

const IN_PAGE_SWEEP = `(() => {
  if (!window.EyeFlowReminderEngine) return { fatal: "window.EyeFlowReminderEngine 未定义 —— 引擎脚本没在渲染端加载/执行" };
  if (typeof currentReminderIntent !== "function" || typeof currentIntervention !== "function") {
    return { fatal: "currentReminderIntent/currentIntervention 未就绪 —— 翻译层没接上" };
  }
  const CASES = ${JSON.stringify(CASES)};
  const rows = CASES.map((c) => {
    state.settings = state.settings || {};
    state.settings.intensity = c.intensity;
    // 直接喂一个已知引擎状态,让真实的翻译层去消费它。
    reminderEngineState = { eyeSeconds: c.eyeSeconds, skipCount: c.skipCount, away: false, lastObsAtMs: Date.now() };
    const intent = currentReminderIntent();
    const iv = currentIntervention(typeof computeEyeLoad === "function" ? computeEyeLoad() : 0);
    return {
      label: c.label, input: { eyeSeconds: c.eyeSeconds, skipCount: c.skipCount, intensity: c.intensity }, want: c.want,
      engineRawLevel: window.EyeFlowReminderEngine.pressureLevel(reminderEngineState),
      intent: { level: intent.level, surface: intent.surface, breakDue: intent.breakDue, minutes: intent.context.minutes, bucket: intent.context.bucket },
      ui: { level: iv.level, surface: iv.surface, breakDue: iv.breakDue, title: iv.title, copy: iv.copy }
    };
  });
  return { rows };
})()`;

async function settle(win, ms) {
  await win.webContents.executeJavaScript(
    `new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, ${ms}))))`
  );
}

async function waitForApp(win, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ready = await win.webContents.executeJavaScript(
      `Boolean(window.EyeFlowReminderEngine && typeof currentReminderIntent === "function" && typeof currentIntervention === "function" && typeof state === "object")`
    ).catch(() => false);
    if (ready) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const { dir, indexPath } = extractRenderer();
  const preload = writeStubPreload(dir);

  const win = new BrowserWindow({
    width: 480, height: 900, show: false,
    webPreferences: { preload, contextIsolation: false, nodeIntegration: false, sandbox: false }
  });

  let failed = false;
  try {
    await win.loadFile(indexPath);
    const booted = await waitForApp(win, 20000);
    if (!booted) throw new Error("app 未在 20s 内 boot(引擎/翻译层未就绪)");
    await settle(win, 200);

    const result = await win.webContents.executeJavaScript(IN_PAGE_SWEEP);
    if (result.fatal) throw new Error(result.fatal);

    // ── 判定:UI 翻译输出与期望逐项吻合 ────────────────────────────────
    const checks = [];
    for (const row of result.rows) {
      const w = row.want, ui = row.ui, it = row.intent;
      const ok = ui.level === w.level && ui.surface === w.surface && ui.breakDue === w.breakDue && it.minutes === w.minutes && it.surface === ui.surface;
      checks.push({ ...row, ok });
      if (!ok) failed = true;
    }

    fs.writeFileSync(path.join(OUT_DIR, "engine-proof.json"), JSON.stringify({ asar: APP_ASAR, rows: checks }, null, 2));

    // ── 打印判定表 ───────────────────────────────────────────────────
    console.log("\n  输入(已知)             引擎裸level  →  UI level/surface/breakDue      minutes  判定");
    console.log("  " + "─".repeat(92));
    for (const r of checks) {
      const inStr = `eye=${String(r.input.eyeSeconds).padStart(4)}s skip=${r.input.skipCount} ${r.input.intensity}`.padEnd(30);
      const uiStr = `L${r.ui.level}/${r.ui.surface}/${r.ui.breakDue}`.padEnd(28);
      console.log(`  ${inStr} L${r.engineRawLevel}  →  ${uiStr} ${String(r.intent.minutes).padStart(3)}m    ${r.ok ? "✓" : "✗ 期望 L" + r.want.level + "/" + r.want.surface}`);
    }
    console.log("  " + "─".repeat(92));

    // ── 截图:真实的岛胶囊(island.html),文案是引擎在该 level 算出的 intervention
    // copy —— 即"断点态胶囊 = 新引擎算出来的"。L2(60m)与 L3(90m clear)各一张。
    const capsuleWin = new BrowserWindow({
      width: 520, height: 120, show: false, backgroundColor: "#1b1c1e",
      webPreferences: { preload, contextIsolation: false, nodeIntegration: false, sandbox: false }
    });
    await capsuleWin.loadFile(path.join(dir, "island.html"));
    await settle(capsuleWin, 200);
    const capsuleShots = checks.filter((r) => r.ui.surface === "island-micro" || r.ui.surface === "soft-full");
    for (const r of capsuleShots) {
      const message = `${r.ui.title} · ${r.ui.copy}`;
      const info = await capsuleWin.webContents.executeJavaScript(
        `(() => { present({ mode: "text", message: ${JSON.stringify(message)}, durationMs: 12000 });
                  return document.querySelector("#msg")?.textContent || ""; })()`
      ).catch(() => "");
      await settle(capsuleWin, 350);
      const png = await capsuleWin.webContents.capturePage();
      const name = `capsule-L${r.ui.level}-${r.input.eyeSeconds}s.png`;
      fs.writeFileSync(path.join(OUT_DIR, name), png.toPNG());
      console.log(`  📸 ${name}  (eye=${r.input.eyeSeconds}s → engine L${r.engineRawLevel} → UI L${r.ui.level}/${r.ui.surface}; 胶囊文案=引擎 intervention.copy)`);
    }
    capsuleWin.destroy();

    console.log(`\n  产物目录:${OUT_DIR}`);
    console.log(failed ? "\n[engine-proof] RED — UI 输出与引擎意图不吻合(见 ✗ 行)。" : "\n[engine-proof] PASSED — 已知输入喂进去,装机版 UI 逐项听见了引擎的意图。");
  } catch (err) {
    failed = true;
    console.error("\n[engine-proof] ERROR —", err.message);
  } finally {
    win.destroy();
    app.exit(failed ? 1 : 0);
  }
});
