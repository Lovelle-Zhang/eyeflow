// Dark-mode render guard — the coverage the audit said was ~0.
//
// Runs the REAL renderer in a hidden Electron window (same harness as
// smoke-readiness-sync.js). Asserts that semantic surfaces actually RETHEME
// between light and dark (token + computed-color flips), that the companion
// eyes dim at night, and — the one static scans can't see — that the share-card
// <canvas> EXPORTS a dark card in dark mode (corner-pixel luminance check).
//
// Run: electron scripts/smoke-theme-sync.js   (or: npm run smoke:theme)
const { app, BrowserWindow } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");

const root = path.join(__dirname, "..");

// Stub window.eyeflowDesktop so index.html's init settles cleanly (Proxy → no-op
// for any method); not strictly needed for theme reads but keeps load clean.
const PRELOAD_SRC = `
window.eyeflowDesktop = new Proxy({}, { get(_t, p) {
  if (p === "getPermissionStatus") return () => Promise.resolve({ platform: "darwin", accessibilityTrusted: false, notificationSupported: true });
  if (p === "getDesktopSettings") return () => Promise.resolve({ platform: "darwin", version: "0.1.1" });
  if (p === "getDiagnostics") return () => Promise.resolve({ items: [] });
  return () => Promise.resolve(undefined);
} });
`;

const failures = [];
const ok = (cond, detail) => { if (!cond) failures.push(detail); };
const avg = (rgb) => (Number(rgb[0]) + Number(rgb[1]) + Number(rgb[2])) / 3;
const parseRGB = (s) => (String(s).match(/\d+(\.\d+)?/g) || []).map(Number).slice(0, 3);

// Gathers light+dark snapshots from index.html in one page-side pass.
const INDEX_GATHER = `(function(){
  const de = document.documentElement;
  const rv = (n) => getComputedStyle(de).getPropertyValue(n).trim();
  const hint = document.getElementById("restGuideHint"); if (hint) hint.hidden = false;
  function read(theme){
    de.setAttribute("data-theme", theme);
    const corner = (typeof drawDailyShareCardCanvas === "function")
      ? Array.from(drawDailyShareCardCanvas().getContext("2d").getImageData(2, 2, 1, 1).data).slice(0, 3)
      : null;
    return {
      focusRing: rv("--focus-ring"),
      roseBg: rv("--rest-rose-bg"),
      roseFg: rv("--rest-rose-fg"),
      hintBg: hint ? getComputedStyle(hint).backgroundColor : null,
      canvasCorner: corner
    };
  }
  return { light: read("light"), dark: read("dark") };
})()`;

const COMPANION_EYE = `(function(){
  const f = document.querySelector(".face");
  return f ? getComputedStyle(f, "::before").backgroundColor : null;
})()`;

async function main() {
  const preloadPath = path.join(os.tmpdir(), `eyeflow-theme-preload-${process.pid}.js`);
  fs.writeFileSync(preloadPath, PRELOAD_SRC);
  const win = new BrowserWindow({
    width: 1200, height: 760, show: false,
    webPreferences: { preload: preloadPath, contextIsolation: false, nodeIntegration: false, sandbox: false }
  });

  // ---- index.html: tokens / elements / canvas flip ----
  await win.loadFile(path.join(root, "index.html"));
  await new Promise((r) => setTimeout(r, 400));
  let idx;
  try {
    idx = await win.webContents.executeJavaScript(INDEX_GATHER, true);
  } catch (e) {
    failures.push(`index gather threw: ${e && e.message}`);
  }
  if (idx) {
    const { light, dark } = idx;
    ok(light.focusRing && dark.focusRing && light.focusRing !== dark.focusRing, `--focus-ring must flip (light "${light.focusRing}" vs dark "${dark.focusRing}")`);
    ok(light.roseBg && dark.roseBg && light.roseBg !== dark.roseBg, `--rest-rose-bg must flip (light "${light.roseBg}" vs dark "${dark.roseBg}")`);
    ok(light.roseFg !== dark.roseFg, `--rest-rose-fg must flip (light "${light.roseFg}" vs dark "${dark.roseFg}")`);
    ok(light.hintBg && dark.hintBg && light.hintBg !== dark.hintBg, `.rest-guide-hint background must flip (light "${light.hintBg}" vs dark "${dark.hintBg}")`);
    // Canvas: the user-facing export must be dark in dark, light in light.
    if (!dark.canvasCorner || !light.canvasCorner) {
      failures.push("canvas corner pixel unavailable (drawDailyShareCardCanvas missing?)");
    } else {
      ok(avg(dark.canvasCorner) < 90, `share-card canvas must export DARK in dark mode (corner avg ${avg(dark.canvasCorner).toFixed(0)}, expected <90; got ${JSON.stringify(dark.canvasCorner)})`);
      ok(avg(light.canvasCorner) > 190, `share-card canvas must stay LIGHT in light mode (corner avg ${avg(light.canvasCorner).toFixed(0)}, expected >190; got ${JSON.stringify(light.canvasCorner)})`);
    }
  }

  // ---- companion.html: eyes dim at night ----
  let nightEye = null, dayEye = null;
  try {
    await win.loadFile(path.join(root, "companion.html"), { search: "theme=night&mood=focus" });
    await new Promise((r) => setTimeout(r, 300));
    nightEye = await win.webContents.executeJavaScript(COMPANION_EYE, true);
    await win.loadFile(path.join(root, "companion.html"), { search: "theme=day&mood=focus" });
    await new Promise((r) => setTimeout(r, 300));
    dayEye = await win.webContents.executeJavaScript(COMPANION_EYE, true);
  } catch (e) {
    failures.push(`companion eye read threw: ${e && e.message}`);
  }
  if (nightEye && dayEye) {
    ok(nightEye !== dayEye, `companion eye must dim at night (night "${nightEye}" vs day "${dayEye}")`);
    ok(avg(parseRGB(nightEye)) < avg(parseRGB(dayEye)), `night eye must be DIMMER than day (night avg ${avg(parseRGB(nightEye)).toFixed(0)} vs day ${avg(parseRGB(dayEye)).toFixed(0)})`);
  } else {
    failures.push("companion eye colors unavailable");
  }

  win.destroy();
  try { fs.unlinkSync(preloadPath); } catch (e) {}

  if (failures.length) {
    console.error("[smoke:theme] FAILED:");
    failures.forEach((f) => console.error("  - " + f));
    app.exit(1);
  } else {
    console.log("[smoke:theme] PASSED. Semantic surfaces retheme, companion eyes dim at night, and the share-card canvas exports dark in dark mode.");
    app.exit(0);
  }
}

app.whenReady()
  .then(main)
  .catch((e) => { console.error("[smoke:theme] harness error:", e); app.exit(1); });
