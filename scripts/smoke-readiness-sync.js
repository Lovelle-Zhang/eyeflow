// A1 — behavioral DOM test for the "one state -> one render path" discipline.
//
// Runs the REAL renderer in a hidden Electron window (reuses the existing
// electron dep; no jsdom, no IIFE stubbing). A preload injects a stub
// `window.eyeflowDesktop` so `isDesktopShell` is true and renderDesktopReadiness
// takes the darwin branches (which a static/preview DOM can't reach). For each
// scenario it drives renderDesktopSettings()/renderPermissionStatus() and asserts
// every readiness row's (data-state, title) pair and every toggle's
// (checked, title, copy) stay consistent — the exact desync the setReadinessState
// contract bug caused.
//
// Run: electron scripts/smoke-readiness-sync.js   (or: npm run smoke:readiness)
const { app, BrowserWindow } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");

const root = path.join(__dirname, "..");

// Preload: make window.eyeflowDesktop truthy (-> isDesktopShell) and tolerate
// every method the renderer may call on init. A Proxy returns a no-op for any
// property, so subscription/getter calls never throw; the three getters return
// minimal shapes so async init settles cleanly.
const PRELOAD_SRC = `
const desktop = new Proxy({}, {
  get(_t, prop) {
    if (prop === "getPermissionStatus") return () => Promise.resolve({ platform: "darwin", accessibilityTrusted: false, notificationSupported: true });
    if (prop === "getDesktopSettings") return () => Promise.resolve({ platform: "darwin", version: "0.1.1", launchAtLogin: false, hideDockOnClose: false, showCompanionOnLaunch: true, enhancedDesktopSensing: false });
    if (prop === "getDiagnostics") return () => Promise.resolve({ items: [] });
    return () => Promise.resolve(undefined);
  }
});
window.eyeflowDesktop = desktop;
`;

// --- scenarios + expectations ----------------------------------------------
const scenarios = [
  {
    name: "all-enabled (enhanced/visible/launch/notify on, simplified mode on)",
    systemNotify: true,
    settings: { platform: "darwin", version: "0.1.4", launchAtLogin: true, hideDockOnClose: true, showCompanionOnLaunch: true, enhancedDesktopSensing: true },
    perm: { platform: "darwin", accessibilityTrusted: true, notificationSupported: true },
    expect: {
      permission: { state: "enabled", title: "已开启" },
      companion: { state: "enabled", title: "默认显示" },
      launch: { state: "enabled", title: "已开启" },
      version: { state: "enabled", title: "EyeFlow 0.1.4" },
      notify: { state: "enabled", title: "已启用" },
      hideDock: { checked: true, title: "只留菜单栏和 Mira", copyIncludes: "从菜单栏可再打开" },
      launchToggle: { checked: true }
    }
  },
  {
    name: "ordinary (enhanced/visible/launch/notify off, Dock kept)",
    systemNotify: false,
    settings: { platform: "darwin", version: "0.1.1", launchAtLogin: false, hideDockOnClose: false, showCompanionOnLaunch: false, enhancedDesktopSensing: false },
    perm: { platform: "darwin", accessibilityTrusted: true, notificationSupported: true },
    expect: {
      permission: { state: "optional", title: "普通模式" },
      companion: { state: "optional", title: "已隐藏" },
      launch: { state: "optional", title: "手动" },
      version: { state: "enabled", title: "EyeFlow 0.1.1" },
      notify: { state: "optional", title: "默认关闭" },
      hideDock: { checked: false, title: "保留 Dock 图标", copyExcludes: "从菜单栏可再打开" },
      launchToggle: { checked: false }
    }
  },
  {
    name: "enhanced requested + notifications unavailable",
    systemNotify: false,
    settings: { platform: "darwin", version: "0.1.1", launchAtLogin: false, showCompanionOnLaunch: false, enhancedDesktopSensing: false, enhancedDesktopSensingRequested: true },
    perm: { platform: "darwin", accessibilityTrusted: false, notificationSupported: false },
    expect: {
      permission: { state: "action", title: "需系统开启" },
      notify: { state: "unavailable", title: "不可用" }
    }
  },
  {
    name: "notifications still checking (support unknown)",
    systemNotify: false,
    settings: { platform: "darwin", version: "0.1.1", launchAtLogin: false, showCompanionOnLaunch: false, enhancedDesktopSensing: false },
    perm: { platform: "darwin", accessibilityTrusted: true },
    expect: {
      notify: { state: "checking", title: "检查中" }
    }
  }
];

function readScript(scn) {
  return `(function(){
    try { if (typeof state !== "undefined" && state && state.settings) state.settings.systemNotifyToggle = ${JSON.stringify(scn.systemNotify)}; } catch (e) {}
    renderDesktopSettings(${JSON.stringify(scn.settings)});
    renderPermissionStatus(${JSON.stringify(scn.perm)});
    const row = (id) => { const t = document.getElementById(id); const item = t && t.closest(".readiness-item"); return { state: item ? item.dataset.state : null, title: t ? t.textContent : null }; };
    const tog = (tid, titleId, copyId) => ({ checked: document.getElementById(tid).checked, title: titleId ? document.getElementById(titleId).textContent : null, copy: copyId ? document.getElementById(copyId).textContent : null });
    return {
      permission: row("readyPermissionTitle"),
      companion: row("readyCompanionTitle"),
      launch: row("readyLaunchTitle"),
      version: row("readyVersionTitle"),
      notify: row("readyNotifyTitle"),
      hideDock: tog("hideDockOnCloseToggle", "hideDockOnCloseTitle", "hideDockOnCloseCopy"),
      launchToggle: tog("launchAtLoginToggle", null, "desktopLaunchCopy")
    };
  })()`;
}

const failures = [];
function check(scnName, where, cond, detail) {
  if (!cond) failures.push(`[${scnName}] ${where}: ${detail}`);
}

function assertRow(scnName, key, exp, got) {
  if (!got) { check(scnName, key, false, "row not found"); return; }
  check(scnName, `${key}.state`, got.state === exp.state, `expected "${exp.state}", got "${got.state}"`);
  check(scnName, `${key}.title`, got.title === exp.title, `expected "${exp.title}", got "${got.title}"`);
}

function assertToggle(scnName, key, exp, got) {
  if (!got) { check(scnName, key, false, "toggle not found"); return; }
  if (exp.checked !== undefined) check(scnName, `${key}.checked`, got.checked === exp.checked, `expected ${exp.checked}, got ${got.checked}`);
  if (exp.title !== undefined) check(scnName, `${key}.title`, got.title === exp.title, `expected "${exp.title}", got "${got.title}"`);
  if (exp.copyIncludes) check(scnName, `${key}.copy⊇`, String(got.copy).includes(exp.copyIncludes), `expected copy to include "${exp.copyIncludes}", got "${got.copy}"`);
  if (exp.copyExcludes) check(scnName, `${key}.copy⊅`, !String(got.copy).includes(exp.copyExcludes), `expected copy to exclude "${exp.copyExcludes}", got "${got.copy}"`);
}

function evaluate(scn, got) {
  for (const [key, exp] of Object.entries(scn.expect)) {
    if (key === "hideDock" || key === "launchToggle") assertToggle(scn.name, key, exp, got[key]);
    else assertRow(scn.name, key, exp, got[key]);
  }
}

async function main() {
  const preloadPath = path.join(os.tmpdir(), `eyeflow-readiness-preload-${process.pid}.js`);
  fs.writeFileSync(preloadPath, PRELOAD_SRC);

  const win = new BrowserWindow({
    width: 1180,
    height: 860,
    show: false,
    webPreferences: { preload: preloadPath, contextIsolation: false, nodeIntegration: false, sandbox: false }
  });

  await win.loadFile(path.join(root, "index.html"));
  await new Promise((r) => setTimeout(r, 500)); // let async init settle

  // sanity: the renderer's entry points must be reachable + desktop shell active
  const ready = await win.webContents.executeJavaScript(
    `({ render: typeof renderDesktopReadiness, perm: typeof renderPermissionStatus, settings: typeof renderDesktopSettings, shell: Boolean(window.eyeflowDesktop) })`,
    true
  );
  if (ready.render !== "function" || ready.perm !== "function" || ready.settings !== "function") {
    failures.push(`harness: render entry points unreachable (${JSON.stringify(ready)})`);
  }
  if (!ready.shell) failures.push("harness: isDesktopShell precondition not met (window.eyeflowDesktop missing)");

  if (!failures.length) {
    for (const scn of scenarios) {
      let got;
      try {
        got = await win.webContents.executeJavaScript(readScript(scn), true);
      } catch (e) {
        check(scn.name, "render", false, `threw: ${e && e.message}`);
        continue;
      }
      evaluate(scn, got);
    }
  }

  win.destroy();
  try { fs.unlinkSync(preloadPath); } catch (e) {}

  if (failures.length) {
    console.error("[smoke:readiness] FAILED:");
    failures.forEach((f) => console.error("  - " + f));
    process.exitCode = 1;
  } else {
    console.log(`[smoke:readiness] PASSED. Readiness rows + toggles render state/title/copy in sync across ${scenarios.length} scenarios (incl. darwin branches).`);
    process.exitCode = 0;
  }
}

app.whenReady()
  .then(main)
  .catch((e) => { console.error("[smoke:readiness] harness error:", e); process.exitCode = 1; })
  .finally(() => app.quit());
