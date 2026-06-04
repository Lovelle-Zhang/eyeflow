const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const svgPath = path.join(root, "assets", "icon.svg");
const pngPath = path.join(root, "assets", "icon-1024.png");

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  const svg = fs.readFileSync(svgPath, "utf8");
  const win = new BrowserWindow({
    width: 1024,
    height: 1024,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    webPreferences: {
      offscreen: true
    }
  });

  const html = `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          html, body {
            width: 1024px;
            height: 1024px;
            margin: 0;
            overflow: hidden;
            background: transparent;
          }
          svg {
            display: block;
            width: 1024px;
            height: 1024px;
          }
        </style>
      </head>
      <body>${svg}</body>
    </html>`;

  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  await new Promise((resolve) => setTimeout(resolve, 200));
  const image = await win.capturePage();
  fs.writeFileSync(pngPath, image.resize({ width: 1024, height: 1024 }).toPNG());
  app.quit();
});
