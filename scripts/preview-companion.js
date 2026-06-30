// Throwaway harness: render the fused Mira bubble (companion.html auto-expands
// in non-desktop mode) for day + night and save PNGs so we can eyeball the
// redesign without driving the live app. Run: electron scripts/preview-companion.js
const { app, BrowserWindow } = require("electron");
const path = require("node:path");
const fs = require("node:fs");

const root = path.join(__dirname, "..");
const outDir = path.join(root, ".preview-out");
const shots = [
  { theme: "day", mood: "focus", file: "fused-day.png", bg: "#6e6bce" },
  { theme: "night", mood: "focus", file: "fused-night.png", bg: "#3b3a63" }
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function capture({ theme, mood, file, bg }) {
  const win = new BrowserWindow({
    width: 384,
    height: 132,
    show: false,
    frame: false,
    backgroundColor: bg,
    webPreferences: { offscreen: false }
  });
  const htmlFile = path.join(root, "companion.html");
  await win.loadFile(htmlFile, { search: `theme=${theme}&mood=${mood}` });
  win.showInactive();
  await sleep(1600);
  const image = await win.webContents.capturePage();
  fs.writeFileSync(path.join(outDir, file), image.toPNG());
  win.destroy();
  console.log("wrote", file);
}

app.whenReady().then(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const only = process.argv.find((a) => a === "day" || a === "night");
  const list = only ? shots.filter((s) => s.theme === only) : shots;
  for (const shot of list) {
    await capture(shot);
  }
  app.quit();
});
