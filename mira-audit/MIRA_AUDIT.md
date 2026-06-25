# Mira Audit

生成时间：2026-06-25  
范围：`/Users/lovellezhang/Projects/codex-project`，并额外只读搜索了 `/Users/lovellezhang/Desktop`、`/Users/lovellezhang/Documents`、`/Users/lovellezhang/Projects` 中与 Mira 命名研究相关的关键词。  
约束：本次只新增 `mira-audit/`，没有修改 app 源码、没有重建、没有 commit。

文件名检索结论：项目源码中未发现文件名包含 `mira`/`Mira` 的独立资产文件；Mira 主要通过 `index.html`、`companion.html`、`break-lock.html` 中的 CSS/HTML 代码绘制，品牌图标位于 `assets/icon*`。

已复制位图：12 张 PNG。复制清单：

- `assets/icon-1024.png` -> `mira-audit/assets/icon-1024.png`
- `assets/icon.iconset/icon_128x128.png` -> `mira-audit/assets/icon.iconset/icon_128x128.png`
- `assets/icon.iconset/icon_128x128@2x.png` -> `mira-audit/assets/icon.iconset/icon_128x128@2x.png`
- `assets/icon.iconset/icon_16x16.png` -> `mira-audit/assets/icon.iconset/icon_16x16.png`
- `assets/icon.iconset/icon_16x16@2x.png` -> `mira-audit/assets/icon.iconset/icon_16x16@2x.png`
- `assets/icon.iconset/icon_256x256.png` -> `mira-audit/assets/icon.iconset/icon_256x256.png`
- `assets/icon.iconset/icon_256x256@2x.png` -> `mira-audit/assets/icon.iconset/icon_256x256@2x.png`
- `assets/icon.iconset/icon_32x32.png` -> `mira-audit/assets/icon.iconset/icon_32x32.png`
- `assets/icon.iconset/icon_32x32@2x.png` -> `mira-audit/assets/icon.iconset/icon_32x32@2x.png`
- `assets/icon.iconset/icon_512x512.png` -> `mira-audit/assets/icon.iconset/icon_512x512.png`
- `assets/icon.iconset/icon_512x512@2x.png` -> `mira-audit/assets/icon.iconset/icon_512x512@2x.png`
- `assets/icon.svg.png` -> `mira-audit/assets/icon.svg.png`

## 1. 形象清单

| 版本名 | 路径 | 类型 | 用在哪个界面/状态 | 尺寸 | 一句话描述 |
|---|---|---|---|---|---|
| EyeFlow app icon PNG family | `assets/icon-1024.png`, `assets/icon.svg.png`, `assets/icon.iconset/*.png` | 位图 | Dock/Finder/app bundle/iconset；也作为真实 app 头像的来源 | 16x16 到 1024x1024，共 12 张 PNG | 圆角方形 app mark：渐变底、深色 visor、双眼、绿色状态点；不是完整 Mira avatar。 |
| EyeFlow app icon SVG | `assets/icon.svg` | SVG | app icon 源图、品牌图标生成源 | 1024x1024 viewBox | 与 58-unit face 共享核心比例的品牌图标，去掉天线、嘴、脸颊和表情。 |
| Sidebar brand mark | `index.html` `.mark` | CSS | 主窗口左侧 EyeFlow 品牌区 | 38x38 | 小尺寸品牌 mark，使用单色深绿渐变和简化 visor。 |
| Today state-stage Mira | `index.html` `.stage-mira` / `.stage-pet` + `eyeflow-session-flow.js` `stageMiraView()` | CSS | 今天页主状态卡：calm/focus/blink/rest | 容器约 108x108；头像核心 58x58 | 主界面“状态解释者”，使用 orbit、统一 Mira 绿、通过眼睛/嘴表达状态。 |
| In-app companion / browser fallback Mira | `index.html` `.companion .pet` | CSS | 主窗口内右下/响应式 companion 预览 | 58x58 core | 与 Today 舞台共用 canonical face，支持 minimized、focus、blink、rest。 |
| First-open onboarding Mira | `index.html` `.mira-intro .pet` | CSS | 首次引导卡片 | CSS 宽高约 64x64，视觉 scale 1.24 | 去掉方形 app 容器，以圆形光晕承载 Mira，强调“她在这里”。 |
| Rest overlay Mira | `index.html` `.break-mira .pet` | CSS | 普通休息/恢复 overlay：gaze/blink/close/breath/neck/press | core 58x58，视觉 scale 1.9 | 恢复过程里的大号 Mira，随恢复动作改变眼睛、嘴和动作节奏。 |
| Feedback mini Mira | `index.html` `.break-overlay.feedback-mode .break-mira .pet` | CSS | 普通休息结束后的反馈卡 | 64x64 | 从 58-unit 标准缩放的 mini Mira，保留天线、嘴、脸颊。 |
| Profile share-card DOM mark | `index.html` `#profileView .share-art-mark` | CSS | 复盘页“今日分享卡”底部品牌露出 | `--ef-control-lg` = 40x40 | 分享卡里使用的真实 app icon mark，小而克制。 |
| Profile share-card canvas mark | `index.html` `drawShareMiraMark()` | canvas | 复制今日分享卡为图片时绘制底部品牌图标 | 调用处 44x44 | 用 canvas 复刻 app icon mark，用于剪贴板分享图片。 |
| Desktop companion window Mira | `companion.html` `.pet` / `.face` / `.mouth` | CSS | 真正的 macOS 悬浮桌面 Mira 窗口；day/night/focus/blink/rest | 68x68 | 独立窗口里的可拖动 Mira，夜间深色、白天浅色，状态点有颜色变化。 |
| Standalone force-rest Mira | `break-lock.html` `.mira-stage .pet` | CSS | `强制爱` 全屏恢复窗口 | base 72x72，视觉 scale 1.72 | 大号恢复引导 Mira，带环形柔光和恢复动作表情。 |

独立版本统计：12 个。位图版本 1 个（PNG family）；SVG 1 个；canvas 1 个；CSS/code 9 个。

## 2. 形象的代码定义（逐个内联源码）

### 2.1 EyeFlow app icon SVG（对应清单：EyeFlow app icon SVG）

Source: `assets/icon.svg`

```
<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="216" y1="156" x2="826" y2="874" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#EAFFF6"/>
      <stop offset="0.58" stop-color="#BDEAFF"/>
      <stop offset="1" stop-color="#F3EEC7"/>
    </linearGradient>
    <linearGradient id="lens" x1="222" y1="350" x2="808" y2="674" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#0E1C20"/>
      <stop offset="1" stop-color="#10272A"/>
    </linearGradient>
  </defs>

  <g transform="translate(82 82) scale(0.84)">
    <rect width="1024" height="1024" rx="216" fill="url(#bg)"/>
    <!-- Mira icon-face standard, scaled from the 58-unit companion face. -->
    <rect x="177" y="335" width="671" height="318" rx="159" fill="url(#lens)"/>
    <rect x="177" y="335" width="671" height="318" rx="159" stroke="#7EEFD4" stroke-width="31" stroke-opacity="0.18"/>
    <circle cx="380" cy="468" r="44" fill="#F8FFFC"/>
    <circle cx="644" cy="468" r="44" fill="#F8FFFC"/>
    <circle cx="803" cy="344" r="79" fill="#6FE7C3"/>
  </g>
</svg>
```


### 2.2 Design-system canonical Mira geometry（基础定义，不单独计入独立版本）

Source: `eyeflow-design-system.css:1-135`

```
:root {
  /* Typography scale */
  --ef-font-sans: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --ef-text-micro: 11px;
  --ef-text-caption: 11.5px;
  --ef-text-meta: 12px;
  --ef-text-helper: 12.5px;
  --ef-text-body-sm: 13px;
  --ef-text-body: 14px;
  --ef-text-body-lg: 15px;
  --ef-text-reading: 15.5px;
  --ef-text-title-sm: 16px;
  --ef-text-title-md: 18px;
  --ef-text-title-lg: 22px;
  --ef-text-display-sm: 28px;
  --ef-text-display-md: 34px;
  --ef-text-display-lg: 44px;

  /* Line-height scale */
  --ef-line-tight: 1.12;
  --ef-line-title: 1.22;
  --ef-line-compact: 1.35;
  --ef-line-body: 1.45;
  --ef-line-reading: 1.62;

  /* 5-role type scale. Every text element resolves to exactly one role via the
     .ef-role-* utility classes — no ad-hoc size/weight, no browser defaults. */
  --ef-role-display-size: 28px;
  --ef-role-display-weight: 600;
  --ef-role-display-line: 1.12;
  --ef-role-display-spacing: -0.022em;

  --ef-role-title-size: 17px;
  --ef-role-title-weight: 600;
  --ef-role-title-line: 1.25;
  --ef-role-title-spacing: -0.01em;

  --ef-role-stat-size: 20px;
  --ef-role-stat-weight: 600;
  --ef-role-stat-line: 1.2;
  --ef-role-stat-spacing: -0.01em;

  --ef-role-body-size: 14px;
  --ef-role-body-weight: 400;
  --ef-role-body-line: 1.55;
  --ef-role-body-spacing: 0;

  --ef-role-label-size: 12px;
  --ef-role-label-weight: 500;
  --ef-role-label-line: 1.4;
  --ef-role-label-spacing: 0;

  /* 2px-based spacing scale, biased toward quiet desktop density. */
  --ef-space-0: 0;
  --ef-space-1: 4px;
  --ef-space-2: 6px;
  --ef-space-3: 8px;
  --ef-space-4: 10px;
  --ef-space-5: 12px;
  --ef-space-6: 14px;
  --ef-space-7: 16px;
  --ef-space-8: 18px;
  --ef-space-9: 20px;
  --ef-space-10: 24px;
  --ef-space-11: 28px;
  --ef-space-12: 32px;
  --ef-space-13: 40px;
  --ef-space-14: 48px;

  /* Shape */
  --ef-radius-xs: 4px;
  --ef-radius-sm: 6px;
  --ef-radius-md: 8px;
  --ef-radius-lg: 12px;
  --ef-radius-xl: 16px;
  --ef-radius-pill: 999px;
  --ef-radius-companion: 22px;

  /* Controls */
  --ef-control-sm: 28px;
  --ef-control-md: 34px;
  --ef-control-lg: 40px;
  --ef-hit-target: 32px;

  /* Icon and symbol weight */
  --ef-icon-xs: 12px;
  --ef-icon-sm: 14px;
  --ef-icon-md: 16px;
  --ef-icon-lg: 20px;
  --ef-icon-xl: 24px;
  --ef-icon-stroke-quiet: 1.4;
  --ef-icon-stroke-base: 1.6;
  --ef-icon-stroke-strong: 1.8;
  --ef-symbol-weight-quiet: 500;
  --ef-symbol-weight-base: 600;
  --ef-symbol-weight-strong: 700;

  /* Mira avatar geometry: 58-unit canonical face. */
  --ef-mira-avatar-size: 58px;
  --ef-mira-avatar-radius: 18px 18px 16px 16px;
  --ef-mira-visor-top: 19px;
  --ef-mira-visor-left: 10px;
  --ef-mira-visor-width: 38px;
  --ef-mira-visor-height: 18px;
  --ef-mira-signal-top: 15px;
  --ef-mira-signal-right: 8px;
  --ef-mira-signal-size: 9px;
  --ef-mira-face-top: 24px;
  --ef-mira-face-left: 18px;
  --ef-mira-face-width: 22px;
  --ef-mira-face-height: 8px;
  --ef-mira-eye-size: 5px;
  --ef-mira-mouth-top: 38px;
  --ef-mira-mouth-width: 8px;
  --ef-mira-mouth-height: 5px;
  --ef-mira-mouth-stroke: 1.5px;
  --ef-mira-mouth-color: rgba(15, 159, 122, 0.58);
  --ef-mira-cheek-top: 35px;
  --ef-mira-cheek-size: 7px;
  --ef-mira-cheek-height: 3px;
  --ef-mira-cheek-offset: 12px;
  --ef-mira-antenna-top: 7px;
  --ef-mira-antenna-left: 18px;
  --ef-mira-antenna-width: 22px;
  --ef-mira-antenna-height: 12px;
  --ef-mira-antenna-stroke: 2px;

  /* Motion */
  --ef-motion-fast: 120ms;
  --ef-motion-base: 160ms;
  --ef-motion-slow: 240ms;
  --ef-ease-calm: cubic-bezier(0.2, 0, 0.2, 1);

  /* Compatibility aliases used by the current main window. */
  --text-xs: var(--ef-text-helper);
```


### 2.3 Sidebar brand mark（对应清单：Sidebar brand mark）

Source: `index.html:420-461`

```
    .mark {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      /* Pin the day gradient in both themes — the dark --mira (#4fc99c) made a
         bright-mint middle clash with the hardcoded dark-green ends at night. */
      background: linear-gradient(160deg, #2a8a6c 0%, #1f7a5e 60%, #1a6b52 100%);
      position: relative;
      flex: 0 0 auto;
      box-shadow:
        inset 0 0.5px 0 rgba(255, 255, 255, 0.28),
        0 1px 2px rgba(24, 60, 47, 0.22),
        0 2px 6px rgba(31, 122, 94, 0.18);
    }

    .mark::before {
      content: "";
      position: absolute;
      left: 6.5px;
      top: 12.4px;
      width: 25px;
      height: 11.8px;
      border-radius: var(--ef-radius-pill);
      background:
        radial-gradient(circle at 30.3% 41.7%, #fbfcf6 0 1.65px, transparent 1.95px),
        radial-gradient(circle at 69.7% 41.7%, #fbfcf6 0 1.65px, transparent 1.95px),
        rgba(255, 255, 255, 0.22);
      box-shadow: none;
    }

    .mark::after {
      content: "";
      position: absolute;
      right: 5.25px;
      top: 9.8px;
      width: 5.9px;
      height: 5.9px;
      border-radius: var(--ef-radius-pill);
      background: #c5ede0;
      box-shadow: none;
    }

```


### 2.4 Today state-stage Mira CSS（对应清单：Today state-stage Mira）

Source: `index.html:1748-1957`

```
	    .stage-mira {
	      --stage-accent: var(--mint);
	      --stage-accent-soft: rgba(15, 159, 122, 0.18);
	      min-width: 0;
	      width: min(100%, var(--state-mira-size));
      aspect-ratio: 1;
      border-radius: 50%;
      display: grid;
      place-items: center;
      justify-self: center;
      position: relative;
      background:
        radial-gradient(circle at 50% 50%, rgba(251, 252, 246, 0.82) 0 36%, transparent 37%),
        radial-gradient(circle at 50% 50%, var(--stage-accent-soft) 0 50%, transparent 51%);
      box-shadow:
        inset 0 0 0 1px rgba(24, 32, 31, 0.045),
        0 8px 18px rgba(31, 47, 40, 0.045);
    }

	    .stage-orbit {
	      position: absolute;
	      inset: var(--ef-space-5);
	      border-radius: 50%;
	      background: rgba(229, 237, 231, 0.5);
	      opacity: 0.72;
	      mask: radial-gradient(circle, transparent 0 61%, #000 62% 100%);
	      -webkit-mask: radial-gradient(circle, transparent 0 61%, #000 62% 100%);
	    }

	    .stage-orbit::before {
	      content: "";
	      position: absolute;
	      top: var(--ef-space-0);
	      left: 50%;
	      width: calc(var(--ef-space-14) + var(--ef-space-8));
	      height: calc(var(--ef-space-14) + var(--ef-space-1));
	      transform: translateX(-50%);
	      border-top: var(--ef-space-2) solid var(--stage-accent);
	      border-radius: var(--ef-radius-pill) var(--ef-radius-pill) 0 0;
	      opacity: 0.72;
	    }

    .stage-pet {
      width: var(--ef-mira-avatar-size);
      aspect-ratio: 1;
      border-radius: var(--ef-mira-avatar-radius);
      background:
        linear-gradient(160deg, #e8f1ec 0%, #fbfcf6 52%, #e8f1ec 100%);
      display: grid;
      place-items: center;
      position: relative;
      overflow: hidden;
      box-shadow:
        inset 0 0 0 0.5px rgba(24, 32, 31, 0.08),
        inset 0 -8px 16px rgba(31, 122, 94, 0.08),
        0 1px 3px rgba(24, 32, 31, 0.06);
      z-index: 1;
      animation: miraCalmBreathe 5.6s ease-in-out infinite;
    }

	    .stage-pet::before {
	      content: "";
	      position: absolute;
	      top: var(--ef-mira-visor-top);
	      left: var(--ef-mira-visor-left);
	      width: var(--ef-mira-visor-width);
	      height: var(--ef-mira-visor-height);
      border-radius: var(--ef-radius-pill);
      background: rgba(15, 23, 21, 0.86);
      box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.1);
    }

    .stage-pet::after {
      content: "";
      position: absolute;
      top: var(--ef-mira-signal-top);
      right: var(--ef-mira-signal-right);
      width: var(--ef-mira-signal-size);
      height: var(--ef-mira-signal-size);
      border-radius: 50%;
      background: var(--stage-accent);
      box-shadow: 0 0 16px var(--stage-accent-soft);
      animation: miraSignalPulse 3.2s ease-in-out infinite;
    }

	    .stage-pet .pet-face {
	      top: var(--ef-mira-face-top);
	      left: var(--ef-mira-face-left);
	      width: var(--ef-mira-face-width);
	      height: var(--ef-mira-face-height);
	    }

    .stage-pet .pet-face::before,
    .stage-pet .pet-face::after {
      width: var(--ef-mira-eye-size);
      height: var(--ef-mira-eye-size);
    }

	    .stage-pet .pet-mouth {
	      top: var(--ef-mira-mouth-top);
	      left: 50%;
	      width: var(--ef-mira-mouth-width);
	      height: var(--ef-mira-mouth-height);
	      border-bottom-width: var(--ef-mira-mouth-stroke);
	      border-bottom-color: var(--ef-mira-mouth-color);
	    }

    .stage-pet .pet-cheek {
      top: var(--ef-mira-cheek-top);
      width: var(--ef-mira-cheek-size);
      height: var(--ef-mira-cheek-height);
    }

    .stage-pet .pet-cheek.left {
      left: var(--ef-mira-cheek-offset);
    }

    .stage-pet .pet-cheek.right {
      right: var(--ef-mira-cheek-offset);
    }

	    .stage-pet .pet-antenna {
	      top: var(--ef-mira-antenna-top);
	      left: var(--ef-mira-antenna-left);
	      width: var(--ef-mira-antenna-width);
	      height: var(--ef-mira-antenna-height);
	    }

    .stage-mira span {
      position: absolute;
      right: var(--ef-space-6);
      bottom: var(--ef-space-6);
      min-width: var(--ef-hit-target);
      height: var(--ef-icon-lg);
      padding: var(--ef-space-0) var(--ef-space-2);
      border-radius: var(--ef-radius-pill);
      display: none;
      place-items: center;
      color: rgba(248, 255, 251, 0.82);
      background: rgba(17, 25, 23, 0.56);
      font-size: var(--ef-text-micro);
      font-weight: var(--ef-symbol-weight-quiet);
      font-variant-numeric: tabular-nums;
      box-shadow: none;
      z-index: 2;
    }

    /* Mira's stage accent is now uniform across all moods.
       State is communicated through her face (eyes, mouth) and the
       surrounding copy — never by changing her skin color.
       ADA-grade: she is the same character throughout, just expressing differently. */
    .stage-mira[data-mood="focus"],
    .stage-mira[data-mood="blink"],
    .stage-mira[data-mood="rest"] {
      --stage-accent: var(--mira);
      --stage-accent-soft: var(--mira-soft);
    }

    .stage-mira[data-mood="focus"] .stage-pet {
      animation-name: miraFocusBreathe;
    }

    .stage-mira[data-mood="blink"] .stage-pet {
      animation: miraBlinkCue 2.2s ease-in-out infinite;
    }

    .stage-mira[data-mood="blink"] .pet-face::before,
    .stage-mira[data-mood="blink"] .pet-face::after {
      height: 2px;
      border-radius: var(--ef-radius-pill);
      transform: translateY(3px);
      animation-duration: 2.2s;
    }

    .stage-mira[data-mood="blink"] .pet-mouth {
      width: var(--ef-mira-mouth-width);
      height: var(--ef-mira-mouth-height);
      top: var(--ef-mira-mouth-top);
      border: 0;
      border-bottom: var(--ef-mira-mouth-stroke) solid var(--mira);
      opacity: 0.62;
      border-radius: 0 0 999px 999px;
      transform: translateX(-50%) scaleX(0.82);
    }

    .stage-mira[data-mood="rest"] .stage-pet {
      animation: miraRestNudge 2.4s ease-in-out infinite;
    }

    .stage-mira[data-mood="rest"] .pet-mouth {
      width: 14px;
      height: 13px;
      top: 42px;
      border: 0;
      background: transparent;
      transform: translateX(-50%);
      display: grid;
      place-items: center;
    }

    .stage-mira[data-mood="rest"] .pet-mouth::before {
      content: "Ɛ";
      font-family: ui-rounded, "SF Pro Rounded", Inter, system-ui, sans-serif;
      font-size: var(--ef-text-body-sm);
      font-weight: 500;
      line-height: 1;
      color: var(--mira);
      opacity: 0.72;
      transform: translateY(-1px) rotate(-4deg) scaleX(0.82);
    }
```


### 2.5 Today stage mood decision code（对应清单：Today state-stage Mira）

Source: `eyeflow-session-flow.js:1-89`

```
window.EyeFlowSessionFlow = (() => {
  // Single restrained accent — no mood-driven hue shifts (per the design DNA).
  // These feed only the rhythm sliders' --range-color/--range-glow; every stage
  // resolves to the tokenized Mira green, which flips with the light/dark theme.
  // (Mira's own companion/avatar mood tints live in separate CSS and are unaffected.)
  const stageTones = {
    calm: { color: "var(--mira)", glow: "var(--mira-soft)" },
    focus: { color: "var(--mira)", glow: "var(--mira-soft)" },
    blink: { color: "var(--mira)", glow: "var(--mira-soft)" },
    rest: { color: "var(--mira)", glow: "var(--mira-soft)" }
  };

  function computeRestDue({ isRunning = false, elapsedSeconds = 0, focusMinutes = 0 } = {}) {
    const targetSeconds = Number(focusMinutes || 0) * 60;
    return Boolean(isRunning && targetSeconds > 0 && Number(elapsedSeconds || 0) >= targetSeconds);
  }

  function sessionControlView({
    isRunning = false,
    restDue = false,
    assessedToday = false,
    autoTracking = false,
    paused = false,
    restSeconds = 120
  } = {}) {
    const restText = restDue ? `休息 ${restSeconds} 秒` : "休息";
    const restTitle = restDue ? `开始 ${restSeconds} 秒休息` : "主动休息";

	    if (isRunning) {
	      return {
	        panelTitle: restDue ? "恢复断点" : "本轮节奏",
	        pillText: restDue ? "恢复断点" : "手动专注",
	        pillState: restDue ? "due" : "manual",
        startText: "暂停",
        startTitle: "暂停当前专注",
        startIcon: "pause",
        startIsMode: false,
        restText,
        restTitle
      };
    }

	    return {
	      panelTitle: autoTracking ? "本轮节奏" : paused ? "这一轮已暂停" : "这一轮已安排",
	      pillText: !assessedToday ? "已安排" : autoTracking ? "自动记录" : paused ? "已暂停" : "未开始",
      pillState: !assessedToday ? "idle" : autoTracking ? "auto" : paused ? "paused" : "idle",
      startText: !assessedToday ? "开始安静提醒" : autoTracking ? "手动专注" : paused ? "继续专注" : "开始安静提醒",
      startTitle: !assessedToday
        ? "开始安静提醒"
        : autoTracking
          ? "切到手动专注并从 00:00 计时"
          : paused
            ? "继续当前专注"
            : "开始安静提醒",
      startIcon: "play",
      // "手动专注" while auto-tracking is a MODE TOGGLE, not a real action — the
      // renderer styles it as the low-key mode pill instead of solid primary.
      startIsMode: Boolean(assessedToday && autoTracking),
      restText,
      restTitle
    };
  }

  function stageMiraView({ load = 0, topSymptomValue = 0, isRunning = false, autoTracking = false } = {}) {
    const mood = load >= 74
      ? "rest"
      : load >= 48 || topSymptomValue >= 5
        ? "blink"
        : isRunning || autoTracking
          ? "focus"
          : "calm";

    return {
      mood,
      tone: stageTones[mood]
    };
  }

  return {
    computeRestDue,
    sessionControlView,
    stageMiraView
  };
})();
```


### 2.6 In-app companion / browser fallback Mira CSS（对应清单：In-app companion / browser fallback Mira）

Source: `index.html:4320-4510`

```
    .pet {
      width: var(--ef-mira-avatar-size);
      aspect-ratio: 1;
      border-radius: var(--ef-mira-avatar-radius);
      background:
        linear-gradient(160deg, #dcefe5 0%, #f8faf3 52%, #e5edf1 100%);
      display: grid;
      place-items: center;
      position: relative;
      overflow: hidden;
      transition: background 180ms ease, transform 180ms ease;
      box-shadow:
        inset 0 0 0 1px rgba(24, 32, 31, 0.08),
        inset 0 -8px 18px rgba(15, 159, 122, 0.12);
    }

    .companion.minimized .pet {
      cursor: grab;
    }

    .companion.minimized .pet:active {
      cursor: grabbing;
    }

    .companion.minimized .pet:hover {
      transform: translateY(-2px);
    }

    .pet::before {
      content: "";
      position: absolute;
      top: var(--ef-mira-visor-top);
      left: var(--ef-mira-visor-left);
      width: var(--ef-mira-visor-width);
      height: var(--ef-mira-visor-height);
      border-radius: var(--ef-radius-pill);
      background: rgba(15, 23, 21, 0.86);
      box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.1);
    }

    .pet::after {
      content: "";
      position: absolute;
      top: var(--ef-mira-signal-top);
      right: var(--ef-mira-signal-right);
      width: var(--ef-mira-signal-size);
      height: var(--ef-mira-signal-size);
      border-radius: 50%;
      background: var(--mira);
      box-shadow: 0 0 6px var(--mira-soft);
    }

    .companion[data-mood="focus"] .pet::after,
    .companion[data-mood="blink"] .pet::after,
    .companion[data-mood="rest"] .pet::after {
      background: var(--mira);
      box-shadow: 0 0 6px var(--mira-soft);
    }

    .pet-face {
      position: absolute;
      top: var(--ef-mira-face-top);
      left: var(--ef-mira-face-left);
      width: var(--ef-mira-face-width);
      height: var(--ef-mira-face-height);
      z-index: 1;
    }

    .pet-face::before,
    .pet-face::after {
      content: "";
      position: absolute;
      top: 0;
      width: var(--ef-mira-eye-size);
      height: var(--ef-mira-eye-size);
      border-radius: 50%;
      background: #fbfcf6;
      animation: petBlink 5s ease-in-out infinite;
    }

    .pet-face::before {
      left: 1px;
    }

    .pet-face::after {
      right: 1px;
    }

    .pet-mouth {
      position: absolute;
      top: var(--ef-mira-mouth-top);
      left: 50%;
      width: var(--ef-mira-mouth-width);
      height: var(--ef-mira-mouth-height);
      transform: translateX(-50%);
      border-bottom: var(--ef-mira-mouth-stroke) solid var(--ef-mira-mouth-color);
      border-radius: 0 0 999px 999px;
      z-index: 1;
    }

    .pet-cheek {
      position: absolute;
      top: var(--ef-mira-cheek-top);
      width: var(--ef-mira-cheek-size);
      height: var(--ef-mira-cheek-height);
      border-radius: var(--ef-radius-pill);
      background: rgba(215, 79, 117, 0.22);
      z-index: 1;
    }

    .pet-cheek.left {
      left: var(--ef-mira-cheek-offset);
    }

    .pet-cheek.right {
      right: var(--ef-mira-cheek-offset);
    }

    .pet-antenna {
      position: absolute;
      top: var(--ef-mira-antenna-top);
      left: var(--ef-mira-antenna-left);
      width: var(--ef-mira-antenna-width);
      height: var(--ef-mira-antenna-height);
      border-top: var(--ef-mira-antenna-stroke) solid rgba(15, 23, 21, 0.36);
      border-radius: 50%;
      z-index: 0;
    }

    .companion[data-mood="focus"] .pet {
      background:
        linear-gradient(160deg, #e5edf1 0%, #f8faf3 52%, #dcefe5 100%);
      animation: miraFocusBreathe 5.2s ease-in-out infinite;
    }

    .companion[data-mood="blink"] .pet {
      background:
        linear-gradient(160deg, #f5ead3 0%, #fbfcf6 52%, #dcefe5 100%);
      animation: miraBlinkCue 2.2s ease-in-out infinite;
    }

    .companion[data-mood="blink"] .pet-face::before,
    .companion[data-mood="blink"] .pet-face::after {
      height: 2px;
      border-radius: var(--ef-radius-pill);
      transform: translateY(2px);
      animation-duration: 2.2s;
    }

    .companion[data-mood="blink"] .pet-mouth {
      width: 8px;
      height: 5px;
      top: 38px;
      border: 0;
      border-bottom: 1.5px solid rgba(202, 143, 38, 0.62);
      border-radius: 0 0 999px 999px;
      transform: translateX(-50%) scaleX(0.82);
      box-shadow: 0 1px 0 rgba(255, 255, 255, 0.48);
    }

    .companion[data-mood="rest"] .pet {
      background:
        linear-gradient(160deg, #f7dde5 0%, #fbf8f2 52%, #f5ead3 100%);
      animation: petNudge 1.8s ease-in-out infinite;
    }

    .companion[data-mood="rest"] .pet-mouth {
      width: 12px;
      height: 13px;
      top: 34px;
      border: 0;
      background: transparent;
      transform: translateX(-50%);
      display: grid;
      place-items: center;
      opacity: 0.94;
    }

    .companion[data-mood="rest"] .pet-mouth::before {
      content: "Ɛ";
      font-family: ui-rounded, "SF Pro Rounded", Inter, system-ui, sans-serif;
      font-size: var(--ef-text-body-sm);
      font-weight: 500;
      line-height: 1;
      color: rgba(214, 82, 125, 0.72);
      text-shadow:
        0 1px 0 rgba(255, 255, 255, 0.5),
        0 0 1px rgba(68, 30, 44, 0.16);
      transform: translateY(-1px) rotate(-4deg) scaleX(0.82);
    }

```


### 2.7 In-app companion / browser fallback Mira HTML（对应清单：In-app companion / browser fallback Mira）

Source: `index.html:9568-9586`

```
  <aside class="companion" id="companion" data-mood="calm" aria-label="EyeFlow companion">
    <div class="pet" aria-hidden="true">
      <div class="pet-antenna"></div>
      <div class="pet-face"></div>
      <div class="pet-cheek left"></div>
      <div class="pet-cheek right"></div>
      <div class="pet-mouth"></div>
    </div>
    <div class="companion-body">
      <strong id="petTitle">Mira 很安静</strong>
      <p id="petMessage">我会在旁边看着节奏，先轻提醒陪伴，不抢你的控制权。</p>
    </div>
    <div class="companion-actions">
      <button class="icon-btn" id="petRestBtn" type="button" title="休息">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 2v6"></path><path d="M12 16v6"></path><path d="M2 12h6"></path><path d="M16 12h6"></path></svg>
      </button>
      <button class="icon-btn" id="petMinimizeBtn" type="button" title="最小化">
        <svg id="petMinimizeIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 12h14"></path></svg>
      </button>
```


### 2.8 Shared in-app Mira keyframes（对应清单：Today stage / in-app companion / onboarding / rest overlay）

Source: `index.html:4638-4708`

```
    @keyframes petBlink {
      0%, 88%, 100% {
        transform: scaleY(1);
      }
      92%, 96% {
        transform: scaleY(0.12);
      }
    }

    @keyframes petNudge {
      0%, 100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-4px);
      }
    }

    @keyframes miraCalmBreathe {
      0%, 100% {
        transform: translateY(0) scale(1);
      }
      50% {
        transform: translateY(-2px) scale(1.012);
      }
    }

    @keyframes miraFocusBreathe {
      0%, 100% {
        transform: translateY(0) scale(1);
      }
      50% {
        transform: translateY(-2px) scale(1.018);
      }
    }

    @keyframes miraBlinkCue {
      0%, 100% {
        transform: translateY(0) scale(1);
      }
      42% {
        transform: translateY(-2px) scale(1.026);
      }
      58% {
        transform: translateY(0) scale(0.996);
      }
    }

    @keyframes miraRestNudge {
      0%, 100% {
        transform: translateY(0) rotate(0deg);
      }
      45% {
        transform: translateY(-3px) rotate(-1deg);
      }
      70% {
        transform: translateY(0) rotate(1deg);
      }
    }

    @keyframes miraSignalPulse {
      0%, 100% {
        transform: scale(1);
        opacity: 0.86;
      }
      50% {
        transform: scale(1.18);
        opacity: 1;
      }
    }

```


### 2.9 First-open onboarding Mira CSS（对应清单：First-open onboarding Mira）

Source: `index.html:4832-4958`

```
    .mira-intro {
      min-width: 0;
      position: relative;
      overflow: hidden;
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      justify-items: center;
      gap: var(--ef-space-5);
      align-items: center;
      padding: var(--ef-space-4) var(--ef-space-6) var(--ef-space-3);
      border: 0;
      border-radius: var(--ef-radius-md);
      text-align: center;
      color: var(--ink);
      background: transparent;
      box-shadow: none;
      transform: translateY(calc(var(--ef-space-1) * -1));
    }

    .mira-intro::after {
      content: none;
    }

    .mira-intro > * {
      position: relative;
      z-index: 1;
    }

    .mira-intro .pet {
      --mira-intro-avatar-scale: 1.24;
      width: calc(var(--ef-space-14) + var(--ef-space-7));
      height: calc(var(--ef-space-14) + var(--ef-space-7));
      margin: var(--ef-space-1) 0 var(--ef-space-2);
      justify-self: center;
      border-radius: var(--ef-radius-pill);
      background:
        radial-gradient(circle at 50% 54%, rgba(225, 255, 244, 0.68) 0 50%, rgba(225, 244, 238, 0.22) 51% 66%, transparent 67% 100%);
      box-shadow:
        0 var(--ef-space-2) var(--ef-space-6) rgba(24, 32, 31, 0.045);
      transform: scale(var(--mira-intro-avatar-scale));
      animation: miraIntroBreathe 6.4s ease-in-out infinite;
    }

    @keyframes miraIntroBreathe {
      0%, 100% {
        transform: translateY(0) scale(var(--mira-intro-avatar-scale));
      }
      50% {
        transform: translateY(-1px) scale(var(--mira-intro-avatar-scale));
      }
    }

    .mira-intro .pet::before {
      top: 24px;
      left: 14px;
      width: 36px;
      height: 18px;
      border-radius: var(--ef-radius-pill);
      background:
        linear-gradient(90deg, rgba(127, 232, 207, 0.2), rgba(104, 166, 232, 0.14)),
        rgba(20, 34, 36, 0.9);
      box-shadow:
        inset 0 0 0 1px rgba(255, 255, 255, 0.14),
        0 0 15px rgba(94, 207, 184, 0.14);
    }

    .mira-intro .pet::after {
      top: 20px;
      right: 12px;
      width: 7px;
      height: 7px;
    }

    .mira-intro .pet-face {
      top: 31px;
      left: 21px;
      width: 22px;
      height: 6px;
    }

    .mira-intro .pet-face::before,
    .mira-intro .pet-face::after {
      width: 5px;
      height: 5px;
    }

    .mira-intro .pet-face::before {
      left: 1px;
    }

    .mira-intro .pet-face::after {
      right: 1px;
    }

    .mira-intro .pet-mouth {
      top: 42px;
      width: 8px;
      height: 5px;
      border-bottom-width: 1.5px;
      border-bottom-color: rgba(15, 159, 122, 0.58);
    }

    .mira-intro .pet-cheek {
      top: 38px;
      width: 6px;
      height: 2.5px;
      background: rgba(15, 159, 122, 0.14);
    }

    .mira-intro .pet-cheek.left {
      left: 13px;
    }

    .mira-intro .pet-cheek.right {
      right: 13px;
    }

    .mira-intro .pet-antenna {
      top: 12px;
      left: 20px;
      width: 24px;
      height: 12px;
      border-top-color: rgba(15, 23, 21, 0.3);
    }

    .mira-intro-copy {
      min-width: 0;
```


### 2.10 First-open onboarding Mira HTML（对应清单：First-open onboarding Mira）

Source: `index.html:9546-9564`

```
    <div class="onboarding-dialog">
      <div class="mira-intro" aria-label="Mira 引导">
        <div class="pet" aria-hidden="true">
          <div class="pet-antenna"></div>
          <div class="pet-face"></div>
          <div class="pet-cheek left"></div>
          <div class="pet-cheek right"></div>
          <div class="pet-mouth"></div>
        </div>
        <div class="mira-intro-copy">
          <h3 id="onboardingTitle" aria-label="专注工作时，也有人照顾你的眼睛。">专注工作时，<br>也有人照顾你的眼睛。</h3>
          <div class="onboarding-flow">
            <p class="onboarding-permission-note">不打断，不监视，安静待在桌面一角。<br>只是帮你记得休息。</p>
          </div>
          <div class="actions onboarding-actions">
            <button class="primary" id="startOnboardingBtn" type="button">好，开始吧</button>
          </div>
        </div>
      </div>
```


### 2.11 Rest overlay Mira CSS（对应清单：Rest overlay Mira）

Source: `index.html:5711-5846`

```
    .break-mira {
      min-width: 0;
      height: 152px;
      display: grid;
      place-items: center;
      position: relative;
      margin-bottom: -2px;
    }

    .break-mira[hidden] {
      display: none;
    }

    .break-mira::before {
      content: "";
      position: absolute;
      width: 168px;
      height: 168px;
      border-radius: 50%;
      background:
        radial-gradient(circle, rgba(142, 223, 199, 0.16), rgba(142, 223, 199, 0.04) 52%, transparent 70%);
      animation: miraGuidePulse 3.6s ease-in-out infinite;
    }

    .break-mira .pet {
      width: 58px;
      transform: scale(1.9);
      transform-origin: center;
      box-shadow:
        inset 0 0 0 1px rgba(231, 241, 236, 0.12),
        inset 0 -8px 18px rgba(15, 159, 122, 0.16),
        0 18px 42px rgba(0, 0, 0, 0.22);
    }

    .break-mira-caption {
      position: absolute;
      bottom: 4px;
      left: 50%;
      transform: translateX(-50%);
      color: rgba(231, 241, 236, 0.52);
      font-size: var(--ef-text-meta);
      font-weight: 720;
      white-space: nowrap;
    }

    .break-overlay[data-relax="gaze"] .break-mira .pet-face {
      transform: translateX(4px);
    }

    .break-overlay[data-relax="blink"] .break-mira .pet {
      background:
        linear-gradient(160deg, #f5ead3 0%, #fbfcf6 52%, #dcefe5 100%);
      animation: miraBlinkLead 1.8s ease-in-out infinite;
    }

    .break-overlay[data-relax="blink"] .break-mira .pet-face::before,
    .break-overlay[data-relax="blink"] .break-mira .pet-face::after {
      height: 2px;
      border-radius: var(--ef-radius-pill);
      transform: translateY(2px);
      animation-duration: 1.8s;
    }

    .break-overlay[data-relax="blink"] .break-mira .pet-mouth {
      border-bottom-width: 1.5px;
      border-bottom-color: rgba(202, 143, 38, 0.62);
      transform: translateX(-50%) scaleX(0.82);
    }

    .break-overlay[data-relax="close"] .break-mira .pet-face::before,
    .break-overlay[data-relax="close"] .break-mira .pet-face::after,
    .break-overlay[data-relax="breath"] .break-mira .pet-face::before,
    .break-overlay[data-relax="breath"] .break-mira .pet-face::after,
    .break-overlay[data-relax="neck"] .break-mira .pet-face::before,
    .break-overlay[data-relax="neck"] .break-mira .pet-face::after {
      height: 2px;
      border-radius: var(--ef-radius-pill);
      transform: translateY(2px);
      animation: none;
    }

    .break-overlay[data-relax="close"] .break-mira .pet,
    .break-overlay[data-relax="breath"] .break-mira .pet,
    .break-overlay[data-relax="neck"] .break-mira .pet {
      animation: miraRestBreath 4s ease-in-out infinite;
    }

    .break-overlay[data-relax="breath"] .break-mira .pet::after {
      background: var(--mira);
      box-shadow: 0 0 6px var(--mira-soft);
      animation-duration: 4s;
    }

    .break-overlay[data-relax="breath"] .break-mira .pet-mouth {
      width: 12px;
      height: 4px;
      border: 0;
      border-radius: var(--ef-radius-pill);
      background: rgba(31, 122, 94, 0.42);
      transform: translateX(-50%) translateY(1px) scaleX(0.8);
    }

    .break-overlay[data-relax="neck"] .break-mira .pet-mouth {
      width: 10px;
      height: 4px;
      border-radius: var(--ef-radius-pill);
      border: 0;
      background: rgba(31, 122, 94, 0.42);
      transform: translateX(-50%) translateY(1px);
    }

    .break-overlay[data-relax="press"] .break-mira .pet {
      animation: miraRestBreath 3.4s ease-in-out infinite;
    }

    .break-overlay[data-relax="press"] .break-mira .pet::after {
      background: var(--mira);
      box-shadow: 0 0 6px var(--mira-soft);
    }

    .break-overlay[data-relax="press"] .break-mira .pet-face::before,
    .break-overlay[data-relax="press"] .break-mira .pet-face::after {
      height: 2px;
      border-radius: var(--ef-radius-pill);
      transform: translateY(2px);
      animation: none;
    }

    .break-overlay[data-relax="press"] .break-mira .pet-mouth {
      width: 8px;
      height: 5px;
      border: 0;
      border-bottom: 1.5px solid rgba(202, 143, 38, 0.62);
      border-radius: 0 0 999px 999px;
      transform: translateX(-50%) scaleX(0.78);
    }
```


### 2.12 Rest overlay Mira HTML（对应清单：Rest overlay Mira）

Source: `index.html:9592-9603`

```
      <div class="break-mira" id="breakMira" aria-label="Mira 陪你恢复" hidden="">
        <div class="pet" aria-hidden="true">
          <div class="pet-antenna"></div>
          <div class="pet-face"></div>
          <div class="pet-cheek left"></div>
          <div class="pet-cheek right"></div>
          <div class="pet-mouth"></div>
        </div>
        <span class="break-mira-caption" id="breakMiraCaption">跟着 Mira 慢慢来</span>
      </div>
      <h3 id="breakTitle">看向远处</h3>
      <p id="breakCopy">不用盯着屏幕，20 秒后再回来。</p>
```


### 2.13 Rest overlay Mira keyframes（对应清单：Rest overlay Mira）

Source: `index.html:6002-6039`

```
    @keyframes miraGuidePulse {
      0%,
      100% {
        transform: scale(0.96);
        opacity: 0.7;
      }
      50% {
        transform: scale(1.04);
        opacity: 1;
      }
    }

    @keyframes miraBlinkLead {
      0%,
      100% {
        transform: scale(1.9) translateY(0);
      }
      42% {
        transform: scale(1.9) translateY(-2px);
      }
      55% {
        transform: scale(1.9) translateY(1px);
      }
    }

    @keyframes miraRestBreath {
      0%,
      100% {
        transform: scale(1.88);
      }
      50% {
        transform: scale(1.96) translateY(1px);
      }
    }


    .breath {
      height: 112px;
```


### 2.14 Feedback mini Mira CSS（对应清单：Feedback mini Mira）

Source: `index.html:6138-6252`

```
    .break-overlay.feedback-mode .break-mira {
      grid-area: mira;
      width: 78px;
      height: 78px;
      margin: 0;
      place-self: start;
    }

    .break-overlay.feedback-mode .break-mira::before {
      width: 82px;
      height: 82px;
      background:
        radial-gradient(circle, rgba(142, 223, 199, 0.18), rgba(142, 223, 199, 0.045) 56%, transparent 72%);
      animation: none;
    }

    .break-overlay.feedback-mode .break-mira .pet {
      width: 64px;
      background: linear-gradient(160deg, #dcefe5 0%, #f8faf3 52%, #e5edf1 100%);
      transform: none;
      animation: none;
      box-shadow:
        inset 0 0 0 1px rgba(24, 32, 31, 0.08),
        inset 0 -8px 18px rgba(15, 159, 122, 0.13),
        0 14px 30px rgba(15, 23, 21, 0.12);
    }

    /* Mini Mira: 64px avatar, scaled from the 58-unit Mira face standard. */
    .break-overlay.feedback-mode .break-mira .pet::before {
      top: 21px;
      left: 50%;
      width: 42px;
      height: 20px;
      transform: translateX(-50%);
    }

    .break-overlay.feedback-mode .break-mira .pet::after {
      top: 16.5px;
      right: 9px;
      width: 10px;
      height: 10px;
    }

    .break-overlay.feedback-mode .break-mira .pet-face {
      top: 26.5px;
      left: 0;
      width: 64px;
      height: 8px;
      transform: none;
    }

    .break-overlay.feedback-mode .break-mira .pet-face::before,
    .break-overlay.feedback-mode .break-mira .pet-face::after {
      top: 0;
      width: 5.5px;
      height: 5.5px;
      border-radius: 50%;
      transform: none;
      animation: petBlink 5s ease-in-out infinite;
      background: #fbfcf6;
    }

    .break-overlay.feedback-mode .break-mira .pet-face::before {
      left: 21px;
    }

    .break-overlay.feedback-mode .break-mira .pet-face::after {
      right: auto;
      left: 37.5px;
    }

    .break-overlay.feedback-mode .break-mira .pet-antenna,
    .break-overlay.feedback-mode .break-mira .pet-mouth,
    .break-overlay.feedback-mode .break-mira .pet-cheek {
      display: block;
    }

    .break-overlay.feedback-mode .break-mira .pet-antenna {
      top: 8px;
      left: 50%;
      width: 24px;
      height: 13px;
      transform: translateX(-50%);
      border-top-color: rgba(15, 23, 21, 0.28);
    }

    .break-overlay.feedback-mode .break-mira .pet-mouth {
      top: 42px;
      left: 50%;
      width: 8px;
      height: 5px;
      border: 0;
      border-bottom: 1.5px solid rgba(15, 159, 122, 0.58);
      border-radius: 0 0 999px 999px;
      background: transparent;
      transform: translateX(-50%);
    }

    .break-overlay.feedback-mode .break-mira .pet-cheek {
      top: 38.5px;
      width: 7.7px;
      height: 3.3px;
      background: rgba(215, 79, 117, 0.18);
    }

    .break-overlay.feedback-mode .break-mira .pet-cheek.left {
      left: 13.2px;
    }

    .break-overlay.feedback-mode .break-mira .pet-cheek.right {
      right: 13.2px;
    }

    .break-overlay.feedback-mode .break-mira-caption {
      display: none;
```


### 2.15 Profile share-card DOM mark CSS（对应清单：Profile share-card DOM mark）

Source: `index.html:6702-6738`

```
    #profileView .share-art-mark {
      width: var(--ef-control-lg);
      height: var(--ef-control-lg);
      border-radius: var(--ef-radius-lg);
      background:
        linear-gradient(145deg, #d8fff1 0%, #bdeaff 58%, #f4efc7 100%);
      position: relative;
      flex: 0 0 auto;
      box-shadow:
        inset 0 0 0 1px rgba(255, 255, 255, 0.52),
        0 1px 2px rgba(31, 47, 40, 0.04);
    }

    #profileView .share-art-mark::before {
      content: "";
      position: absolute;
      left: 9px;
      top: 14px;
      width: 24px;
      height: 13px;
      border-radius: var(--ef-radius-pill);
      background:
        radial-gradient(circle at 31% 48%, #fbfff9 0 2px, transparent 2.4px),
        radial-gradient(circle at 69% 48%, #fbfff9 0 2px, transparent 2.4px),
        #1d2926;
    }

    #profileView .share-art-mark::after {
      content: "";
      position: absolute;
      right: 7px;
      top: 10px;
      width: 7px;
      height: 7px;
      border-radius: var(--ef-radius-pill);
      background: #62d6ae;
      box-shadow: 0 0 8px rgba(98, 214, 174, 0.54);
```


### 2.16 Profile share-card canvas mark（对应清单：Profile share-card canvas mark）

Source: `index.html:14476-14572`

```
    function drawShareMiraMark(ctx, x, y, size) {
      ctx.save();
      const iconGradient = ctx.createLinearGradient(x, y, x + size, y + size);
      iconGradient.addColorStop(0, "#d8fff1");
      iconGradient.addColorStop(0.58, "#bdeaff");
      iconGradient.addColorStop(1, "#f4efc7");
      ctx.fillStyle = iconGradient;
      roundedRect(ctx, x, y, size, size, size * 0.3);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.62)";
      ctx.lineWidth = 1;
      ctx.stroke();
      const visorW = size * 0.6;
      const visorH = size * 0.32;
      const visorX = x + size * 0.22;
      const visorY = y + size * 0.36;
      ctx.fillStyle = "#1d2926";
      roundedRect(ctx, visorX, visorY, visorW, visorH, visorH / 2);
      ctx.fill();
      ctx.fillStyle = "#fbfff9";
      ctx.beginPath();
      ctx.arc(visorX + visorW * 0.31, visorY + visorH * 0.5, size * 0.045, 0, Math.PI * 2);
      ctx.arc(visorX + visorW * 0.69, visorY + visorH * 0.5, size * 0.045, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#62d6ae";
      ctx.beginPath();
      ctx.arc(x + size * 0.74, y + size * 0.29, size * 0.09, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawDailyShareCardCanvas(card = shareCardPayload()) {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 720;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#f5f3ee";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const cardX = 260;
      const cardY = 74;
      const cardW = 680;
      const cardH = 572;
      roundedRect(ctx, cardX, cardY, cardW, cardH, 30);
      ctx.fillStyle = "rgba(250, 248, 244, 0.78)";
      ctx.fill();
      ctx.strokeStyle = "rgba(24, 32, 31, 0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();

      const contentX = cardX + 72;
      ctx.fillStyle = "rgba(73, 72, 68, 0.62)";
      ctx.font = '600 24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText(card.date, contentX, cardY + 90);

      ctx.fillStyle = "rgba(31, 33, 31, 0.94)";
      ctx.font = '600 48px "Songti SC", STSong, "Noto Serif CJK SC", Georgia, serif';
      wrapCanvasText(ctx, card.quote, cardW - 144).forEach((line, index) => {
        ctx.fillText(line, contentX, cardY + 178 + index * 66);
      });

      const metricY = cardY + 348;
      [
        ["今日专注", card.focus],
        ["休息", card.breaks],
        ["节奏", card.rhythm]
      ].forEach(([label, value], index) => {
        const x = contentX + index * 152;
        ctx.fillStyle = "rgba(73, 72, 68, 0.62)";
        ctx.font = '600 22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.fillText(label, x, metricY);
        ctx.fillStyle = "rgba(31, 33, 31, 0.86)";
        ctx.font = '750 28px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.fillText(value, x, metricY + 44);
      });

      ctx.strokeStyle = "rgba(24, 32, 31, 0.09)";
      ctx.beginPath();
      ctx.moveTo(contentX, cardY + 446);
      ctx.lineTo(cardX + cardW - 72, cardY + 446);
      ctx.stroke();

      drawShareMiraMark(ctx, contentX, cardY + 492, 44);
      ctx.fillStyle = "rgba(31, 33, 31, 0.82)";
      ctx.font = '750 25px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText("EyeFlow", contentX + 62, cardY + 513);
      ctx.fillStyle = "rgba(73, 72, 68, 0.62)";
      ctx.font = '600 21px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText("Mira 的桌面陪伴空间", contentX + 62, cardY + 541);

      const domainW = 150;
      const domainH = 42;
      const domainX = cardX + cardW - 72 - domainW;
      const domainY = cardY + 497;
      roundedRect(ctx, domainX, domainY, domainW, domainH, domainH / 2);
      ctx.fillStyle = "rgba(231, 228, 222, 0.78)";
      ctx.fill();
```


### 2.17 Desktop companion window Mira CSS（对应清单：Desktop companion window Mira）

Source: `companion.html:147-365`

```
    .pet {
      width: 68px;
      aspect-ratio: 1;
      position: absolute;
      left: 1px;
      top: 1px;
      border-radius: 23px 23px 20px 20px;
      background:
        linear-gradient(150deg, #172c2e 0%, #1f3937 48%, #142224 100%);
      display: grid;
      place-items: center;
      overflow: hidden;
      box-shadow:
        inset 0 0 0 1px rgba(127, 241, 213, 0.07),
        inset 0 -10px 20px rgba(3, 10, 12, 0.22);
      cursor: pointer;
      -webkit-app-region: no-drag;
      animation: idleFloat 4.8s ease-in-out infinite;
      transition:
        transform var(--ef-motion-base) var(--ef-ease-calm),
        box-shadow var(--ef-motion-base) var(--ef-ease-calm),
        background var(--ef-motion-slow) var(--ef-ease-calm);
    }

    .companion.settling .pet,
    .companion.settling .pet:hover,
    .companion.settling .pet:active {
      animation: none;
      transform: translateY(0) scale(1);
      transition: none;
    }

    .companion.expanded .pet {
      left: 7px;
      top: 25px;
    }

    .companion.speaking .pet {
      left: auto;
      right: 1px;
      top: 4px;
    }

    .companion.settling .pet::after,
    .companion.settling .face::before,
    .companion.settling .face::after {
      animation: none;
    }

    .theme-day .pet {
      background:
        linear-gradient(150deg, #fbfcf6 0%, #edf6ef 50%, #e5edf1 100%);
      box-shadow:
        inset 0 0 0 1px rgba(24, 32, 31, 0.06),
        inset 0 -8px 18px rgba(15, 159, 122, 0.08);
    }

    .pet:hover {
      transform: translateY(-1px);
    }

    .pet:active {
      transform: translateY(0) scale(0.97);
    }

    .companion.dragging .pet,
    .companion.dragging .pet:active {
      cursor: grabbing;
    }

    .pet::before {
      content: "";
      position: absolute;
      top: 22px;
      left: 12px;
      width: 44px;
      height: 21px;
      border-radius: 999px;
      background:
        linear-gradient(90deg, rgba(129, 239, 216, 0.18), rgba(108, 176, 255, 0.12)),
        rgba(6, 13, 15, 0.92);
      box-shadow:
        inset 0 0 0 1px rgba(139, 246, 222, 0.12);
    }

    .theme-day .pet::before {
      background:
        linear-gradient(90deg, rgba(127, 232, 207, 0.22), rgba(104, 166, 232, 0.16)),
        rgba(20, 34, 36, 0.88);
      box-shadow:
        inset 0 0 0 1px rgba(255, 255, 255, 0.12);
    }

    .pet::after {
      content: "";
      position: absolute;
      top: 17px;
      right: 9px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--mira-signal);
      box-shadow: 0 0 var(--ef-space-3) var(--mira-signal-glow);
      animation: signalPulse 2.8s ease-in-out infinite;
    }

    .focus {
      --mira-signal: #7cc6dd;
      --mira-signal-glow: rgba(124, 198, 221, 0.4);
    }

    .blink {
      --mira-signal: #e9c979;
      --mira-signal-glow: rgba(233, 201, 121, 0.34);
    }

    .rest {
      --mira-signal: #e78da8;
      --mira-signal-glow: rgba(231, 141, 168, 0.42);
    }

    .face {
      position: absolute;
      top: 28px;
      left: 21px;
      width: 26px;
      height: 8px;
      z-index: 1;
    }

    .face::before,
    .face::after {
      content: "";
      position: absolute;
      top: 0;
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #fbfcf6;
      animation: blink 5s ease-in-out infinite;
    }

    .face::before {
      left: 1px;
    }

    .face::after {
      right: 1px;
    }

    .mouth {
      position: absolute;
      top: 44px;
      left: 50%;
      width: 9px;
      height: 5px;
      transform: translateX(-50%);
      border-bottom: var(--mira-line) solid var(--mira-mouth);
      border-radius: 0 0 999px 999px;
      z-index: 1;
    }

    .antenna {
      position: absolute;
      top: 8px;
      left: 21px;
      width: 26px;
      height: 14px;
      border-top: var(--mira-line) solid var(--mira-antenna);
      filter: drop-shadow(0 0 var(--ef-space-1) var(--mira-antenna-glow));
      border-radius: 50%;
    }

    .cheek {
      position: absolute;
      top: 41px;
      width: 8px;
      height: 3px;
      border-radius: 999px;
      background: rgba(255, 139, 176, 0.24);
      z-index: 1;
    }

    .cheek.left {
      left: 14px;
    }

    .cheek.right {
      right: 14px;
    }

    .body {
      display: none;
      position: absolute;
      left: 86px;
      top: 7px;
      min-width: 0;
      cursor: default;
    }

    .companion.expanded .body {
      display: grid;
      align-content: center;
      position: absolute;
      z-index: 1;
      overflow: hidden;
      width: 260px;
      min-height: 118px;
      max-width: none;
      padding: var(--ef-space-6) calc(var(--ef-hit-target) + var(--ef-space-4)) var(--ef-space-6) var(--ef-space-7);
      border: 1px solid var(--popover-line);
      border-radius: var(--ef-radius-lg);
      background: var(--popover-bg);
      box-shadow: var(--popover-shadow);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      color: var(--popover-text);
    }

```


### 2.18 Desktop companion state CSS + keyframes（对应清单：Desktop companion window Mira）

Source: `companion.html:504-644`

```
    .focus .pet {
      background:
        linear-gradient(150deg, #132b33 0%, #1d3d48 48%, #142329 100%);
      animation: focusBreathe 5.2s ease-in-out infinite;
    }

    .theme-day.focus .pet {
      background:
        linear-gradient(150deg, #fbfcf6 0%, #e5edf1 50%, #dcefe5 100%);
    }

    .blink .pet {
      background:
        linear-gradient(150deg, #202c27 0%, #303727 48%, #142421 100%);
      animation: blinkCue 2.2s ease-in-out infinite;
    }

    .theme-day.blink .pet {
      background:
        linear-gradient(150deg, #fbfcf6 0%, #f5ead3 50%, #dcefe5 100%);
    }

    .blink .face::before,
    .blink .face::after {
      height: 2px;
      border-radius: 999px;
      transform: translateY(2px);
      animation-duration: 2.2s;
    }

    .blink .mouth {
      width: 9px;
      height: 5px;
      top: 44px;
      border: 0;
      border-bottom: var(--mira-line) solid rgba(255, 214, 111, 0.66);
      border-radius: 0 0 999px 999px;
      transform: translateX(-50%) scaleX(0.82);
      box-shadow: 0 0 var(--ef-space-2) rgba(255, 214, 111, 0.12);
    }

    .theme-day.blink .mouth {
      border-bottom-color: rgba(202, 143, 38, 0.62);
      box-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
    }

    .rest .pet {
      background:
        linear-gradient(150deg, #311f27 0%, #442735 48%, #2a2223 100%);
      animation: nudge 1.8s ease-in-out infinite;
    }

    .theme-day.rest .pet {
      background:
        linear-gradient(150deg, #fbfcf6 0%, #f7dde5 52%, #f5ead3 100%);
    }

    .rest .mouth {
      width: 14px;
      height: 15px;
      top: 40px;
      border: 0;
      background: transparent;
      transform: translateX(-50%);
      display: grid;
      place-items: center;
      opacity: 0.95;
    }

    .rest .mouth::before {
      content: "Ɛ";
      font-family: ui-rounded, "SF Pro Rounded", Inter, system-ui, sans-serif;
      font-size: var(--ef-text-body-sm);
      font-weight: 700;
      line-height: 1;
      color: var(--mira-rest-mouth);
      text-shadow: 0 1px 0 rgba(255, 255, 255, 0.14);
      transform: translateY(-1px) rotate(-4deg) scaleX(0.82);
    }

    .theme-day.rest .mouth::before {
      color: rgba(214, 82, 125, 0.72);
      text-shadow: 0 1px 0 rgba(255, 255, 255, 0.56);
    }

    @keyframes idleFloat {
      0%, 100% {
        transform: translateY(0) rotate(0deg);
      }
      50% {
        transform: translateY(-3px) rotate(-1deg);
      }
    }

    @keyframes signalPulse {
      0%, 100% {
        transform: scale(1);
        opacity: 0.86;
      }
      50% {
        transform: scale(1.24);
        opacity: 1;
      }
    }

    @keyframes blink {
      0%, 88%, 100% {
        transform: scaleY(1);
      }
      92%, 96% {
        transform: scaleY(0.12);
      }
    }

    @keyframes nudge {
      0%, 100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-4px);
      }
    }

    @keyframes focusBreathe {
      0%, 100% {
        transform: translateY(0) scale(1);
      }
      50% {
        transform: translateY(-2px) scale(1.015);
      }
    }

    @keyframes blinkCue {
      0%, 100% {
        transform: translateY(0) scale(1);
      }
      42% {
        transform: translateY(-2px) scale(1.025);
      }
      58% {
        transform: translateY(0) scale(0.995);
```


### 2.19 Desktop companion HTML（对应清单：Desktop companion window Mira）

Source: `companion.html:663-683`

```
    <aside class="companion booting settling" id="companion" title="双击隐藏 Mira">
      <div class="pet" aria-hidden="true">
        <div class="antenna"></div>
        <div class="face"></div>
        <div class="cheek left"></div>
        <div class="cheek right"></div>
        <div class="mouth"></div>
      </div>
      <div class="mira-bubble" id="miraBubble" aria-live="polite"><span id="miraBubbleText"></span></div>
      <div class="body">
        <strong id="title">Mira 很安静</strong>
        <p id="message">我会在旁边看着节奏，先轻提醒陪伴。</p>
        <span class="context-line" id="contextLine">舒适区 · L1 安静</span>
      </div>
      <div class="actions">
        <button class="icon-btn" id="openBtn" type="button" title="打开 EyeFlow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
        </button>
        <button class="icon-btn" id="collapseBtn" type="button" title="收起 Mira">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M5 12h14"/></svg>
        </button>
```


### 2.20 Standalone force-rest Mira CSS（对应清单：Standalone force-rest Mira）

Source: `break-lock.html:50-185`

```
    .mira-stage {
      height: 178px;
      display: grid;
      place-items: center;
      position: relative;
      margin-bottom: calc(var(--ef-space-1) * -1);
    }

    .mira-stage::before {
      content: "";
      position: absolute;
      width: 184px;
      height: 184px;
      border-radius: 50%;
      background:
        radial-gradient(circle, rgba(142, 223, 199, 0.1), rgba(142, 223, 199, 0.025) 54%, transparent 72%);
      animation: guidePulse 4.8s var(--ef-ease-calm) infinite;
    }

    .pet {
      width: 72px;
      aspect-ratio: 1;
      border-radius: 22px 22px 20px 20px;
      background:
        linear-gradient(160deg, #dcefe5 0%, #f8faf3 52%, #e5edf1 100%);
      display: grid;
      place-items: center;
      position: relative;
      overflow: hidden;
      transform: scale(1.72);
      transform-origin: center;
      box-shadow:
        inset 0 0 0 1px rgba(231, 241, 236, 0.1),
        inset 0 -8px 18px rgba(15, 159, 122, 0.1),
        0 14px 34px rgba(0, 0, 0, 0.16);
    }

    .pet::before {
      content: "";
      position: absolute;
      top: 24px;
      left: 12px;
      width: 48px;
      height: 22px;
      border-radius: 999px;
      background: rgba(15, 23, 21, 0.86);
      box-shadow: inset 0 0 0 var(--rest-line) rgba(255, 255, 255, 0.1);
    }

    .pet::after {
      content: "";
      position: absolute;
      right: 10px;
      top: 15px;
      width: 11px;
      height: 11px;
      border-radius: 999px;
      background: var(--mint);
      box-shadow: 0 0 var(--ef-space-4) rgba(142, 223, 199, 0.38);
    }

    .pet-face {
      position: absolute;
      top: 30px;
      left: 23px;
      width: 27px;
      height: 9px;
      z-index: 1;
      transition: transform var(--ef-motion-slow) var(--ef-ease-calm);
    }

    .pet-face::before,
    .pet-face::after {
      content: "";
      position: absolute;
      top: 0;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #fbfcf6;
      animation: petBlink 5s var(--ef-ease-calm) infinite;
    }

    .pet-face::before {
      left: 1px;
    }

    .pet-face::after {
      right: 1px;
    }

    .pet-mouth {
      position: absolute;
      top: 46px;
      left: 50%;
      width: 17px;
      height: 8px;
      transform: translateX(-50%);
      border-bottom: var(--rest-line) solid rgba(15, 23, 21, 0.78);
      border-radius: 0 0 999px 999px;
      z-index: 1;
    }

    .pet-cheek {
      position: absolute;
      top: 44px;
      width: 8px;
      height: 3px;
      border-radius: 999px;
      background: rgba(215, 79, 117, 0.22);
      z-index: 1;
    }

    .pet-cheek.left {
      left: 15px;
    }

    .pet-cheek.right {
      right: 15px;
    }

    .pet-antenna {
      position: absolute;
      top: 9px;
      left: 22px;
      width: 28px;
      height: 15px;
      border-top: var(--rest-line) solid rgba(15, 23, 21, 0.34);
      border-radius: 50%;
      z-index: 0;
    }

    .mira-caption {
      position: absolute;
      bottom: 0;
      left: 50%;
```


### 2.21 Standalone force-rest Mira state CSS（对应清单：Standalone force-rest Mira）

Source: `break-lock.html:194-280`

```
    body[data-relax="gaze"] .pet-face {
      transform: translateX(5px);
    }

    body[data-relax="blink"] .pet {
      background:
        linear-gradient(160deg, #f5ead3 0%, #fbfcf6 52%, #dcefe5 100%);
      animation: miraBlinkLead 1.8s var(--ef-ease-calm) infinite;
    }

    body[data-relax="blink"] .pet-face::before,
    body[data-relax="blink"] .pet-face::after {
      height: 2px;
      border-radius: 999px;
      transform: translateY(3px);
      animation-duration: 1.8s;
    }

    body[data-relax="blink"] .pet-mouth {
      border-bottom-color: rgba(202, 143, 38, 0.78);
      transform: translateX(-50%) scaleX(0.82);
    }

    body[data-relax="close"] .pet-face::before,
    body[data-relax="close"] .pet-face::after,
    body[data-relax="breath"] .pet-face::before,
    body[data-relax="breath"] .pet-face::after,
    body[data-relax="neck"] .pet-face::before,
    body[data-relax="neck"] .pet-face::after {
      height: 2px;
      border-radius: 999px;
      transform: translateY(3px);
      animation: none;
    }

    body[data-relax="close"] .pet,
    body[data-relax="breath"] .pet,
    body[data-relax="neck"] .pet {
      animation: miraRestBreath 4s var(--ef-ease-calm) infinite;
    }

    body[data-relax="breath"] .pet::after {
      background: #8bd8c1;
      box-shadow: 0 0 var(--ef-space-5) rgba(139, 216, 193, 0.36);
      animation-duration: 4s;
    }

    body[data-relax="breath"] .pet-mouth {
      width: 18px;
      height: 6px;
      border: 0;
      border-radius: 999px;
      background: rgba(142, 223, 199, 0.62);
      transform: translateX(-50%) translateY(1px) scaleX(0.8);
    }

    body[data-relax="neck"] .pet-mouth {
      width: 18px;
      height: 5px;
      border-radius: 999px;
      border: 0;
      background: rgba(142, 223, 199, 0.68);
      transform: translateX(-50%) translateY(1px);
    }

    body[data-relax="press"] .pet {
      background:
        linear-gradient(160deg, #f5ead3 0%, #fbf8f2 52%, #dcefe5 100%);
      animation: miraRestBreath 3.4s var(--ef-ease-calm) infinite;
    }

    body[data-relax="press"] .pet::after {
      background: #e9c979;
      box-shadow: 0 0 var(--ef-space-5) rgba(233, 201, 121, 0.36);
    }

    body[data-relax="press"] .pet-face::before,
    body[data-relax="press"] .pet-face::after {
      height: 2px;
      border-radius: 999px;
      transform: translateY(3px);
      animation: none;
    }

    body[data-relax="press"] .pet-mouth {
      width: 14px;
      height: 6px;
```


### 2.22 Standalone force-rest Mira keyframes（对应清单：Standalone force-rest Mira）

Source: `break-lock.html:491-537`

```
    @keyframes guidePulse {
      0%,
      100% {
        transform: scale(0.96);
        opacity: 0.7;
      }
      50% {
        transform: scale(1.04);
        opacity: 1;
      }
    }

    @keyframes petBlink {
      0%,
      91%,
      100% {
        transform: scaleY(1);
      }
      94% {
        transform: scaleY(0.28);
      }
    }

    @keyframes miraBlinkLead {
      0%,
      100% {
        transform: scale(1.72) translateY(0);
      }
      42% {
        transform: scale(1.72) translateY(-3px);
      }
      55% {
        transform: scale(1.72) translateY(1px);
      }
    }

    @keyframes miraRestBreath {
      0%,
      100% {
        transform: scale(1.7);
      }
      50% {
        transform: scale(1.78) translateY(1px);
      }
    }
  </style>
  <link rel="stylesheet" href="./eyeflow-design-system.css">
```


### 2.23 Standalone force-rest Mira HTML（对应清单：Standalone force-rest Mira）

Source: `break-lock.html:541-549`

```
    <div class="mira-stage" aria-label="Mira 陪你恢复">
      <div class="pet" aria-hidden="true">
        <div class="pet-antenna"></div>
        <div class="pet-face"></div>
        <div class="pet-cheek left"></div>
        <div class="pet-cheek right"></div>
        <div class="pet-mouth"></div>
      </div>
      <span class="mira-caption" id="miraCaption">跟着 Mira 慢慢来</span>
```


## 3. 状态 / 七个触发节点

说明：没有搜到一个命名为“七个触发节点”的独立文档；下面是从 `miraDialogue()`、`currentIntervention()`、`stageMiraView()`、`recoveryTaskLibrary` 还原出的 7 个核心触发节点。

| 节点 | 触发条件 / 来源 | 应表达的情绪/状态 | 目前有没有视觉 | 现在长什么样 |
|---|---|---|---|---|
| 1. 首次认识 Mira | first open / onboarding | 可信、温柔、低负担；先建立“她在旁边” | 有 | `mira-intro` 圆形光晕里的 Mira，文案“不打断，不监视，安静待在桌面一角”。 |
| 2. 默认安静陪伴 | 未开始、未校准、L1、idle | 安静在场，不索取操作 | 有 | desktop companion calm / in-app companion calm；绿色点，短笑。 |
| 3. 专注进行 | `isRunning` 或 `isAutoTracking` | 陪你计时，守恢复断点，不打断 | 有 | Today stage focus / companion focus；轻呼吸动画，主色仍是 Mira 绿或桌面版偏蓝绿点。 |
| 4. 中段/干涩/眨眼提醒 | `load >= 48`、`topSymptomValue >= 5`、`dryness >= 5`、目标 72% | 轻提醒眨眼或松一下，不中断 | 有 | blink 状态眼睛压成短线，嘴变短，桌面版/旧文档有黄色信号。 |
| 5. 自然断点 / 到恢复断点 | `isNaturalBreak(latestActivity)` 或 elapsed 到目标 | 这是合适的空隙，提醒看远/眨眼 | 有 | companion 气泡标题“到恢复断点了”；Today/rest action 引导休息。 |
| 6. 状态偏高 / 明显超时 / L3-L4 | `load >= 74`、elapsed 超时、`intensity === force` | 更明确但仍不惩罚；L4 才全屏 | 有 | rest 状态 soft pink / pout-like mouth；L4 进入 `break-lock.html` 大号 Mira。 |
| 7. 恢复进行与完成反馈 | 普通休息、强制恢复、完成后反馈 | 陪用户一起恢复，并帮下一轮回到节奏 | 有 | `break-mira` / `mira-stage` 大号 Mira，gaze/blink/close/breath/neck/press 表情；完成后 mini Mira。 |

相关源码摘录：

Source: `index.html:13591-13660`

```
    function miraDialogue(kind, context = {}) {
      const load = Number(context.load ?? computeEyeLoad());
      const symptoms = context.symptoms || currentSymptoms();
      const focusTargetMinutes = Number(els.focusTarget.value);
      const elapsedMinutes = elapsedSeconds / 60;
      const annual = anniversaryLine();
      const reminderGroup = lightReminderGroup(load, symptoms);
      const reminderLine = lightReminderLine(reminderGroup, Math.floor(elapsedMinutes / 5));

      if (kind === "companion" && annual) {
        return { mood: "calm", title: "Mira 记得第一天", message: annual };
      }
      if (kind === "companion") {
        const back = returningLine();
        if (back) return { mood: "calm", title: "你回来了", message: back };
      }
      if (shouldHoldMiraSilence(load)) {
        return {
          mood: "focus",
          title: "Mira 先保持安静",
          message: relationshipLine("silence", "hold") || "今天先不说休息的事了。你看起来在赶什么，专注完再说。"
        };
      }
      if (kind === "companion") {
        const memoryLine = elapsedMinutes >= focusTargetMinutes * 0.72 ? modeMemoryLine("overrun") : "";
        if (memoryLine) {
          return { mood: "focus", title: "Mira 记得这个时段", message: memoryLine };
        }
        if (!hasAssessedToday()) {
          return { mood: "calm", title: "Mira 很安静", message: "本地计时，不读取屏幕内容。" };
        }
        if (state.settings.intensity === "force") {
          if (isRunning) {
            return {
              mood: "focus",
              title: "强制爱守到断点",
              message: "我先不弹普通提醒。到恢复断点后，会直接进入全屏恢复。"
            };
          }
          if (isAutoTracking()) {
            return {
              mood: "focus",
              title: "强制爱待命中",
              message: "我先只记录节奏。点开始手动专注后，会从新一轮开始并启用全屏恢复。"
            };
          }
        }
        if (latestActivity && isNaturalBreak(latestActivity)) {
          return { mood: "blink", title: "到恢复断点了", message: lightReminderLine("gaze", "natural-break") || "你刚停下来一下。现在适合看远处 20 秒，再继续。" };
        }
        if (load >= 74 || elapsedMinutes >= focusTargetMinutes + 10) {
          return { mood: "rest", title: "Mira 想让你休息", message: lightReminderLine("gaze", "rest") || "不用立刻停下。找一个恢复断点，看远处、眨眼，然后再回来。" };
        }
        if (symptoms.dryness >= 5 || elapsedMinutes >= focusTargetMinutes * 0.72) {
          return { mood: "blink", title: reminderGroup === "relax" ? "Mira 提醒你松一下" : "Mira 在提醒眨眼", message: reminderLine || "轻轻眨几次眼，让眼睛重新湿润一点。" };
        }
        if (isRunning) {
          return { mood: "focus", title: "Mira 陪你专注", message: `这轮 ${Math.floor(elapsedMinutes)} 分钟。到恢复断点我再轻提示，不会突然打断。` };
        }
        if (isAutoTracking()) {
          return {
            mood: "focus",
            title: state.settings.intensity === "force" ? "强制爱待命中" : "Mira 在陪你计时",
            message: state.settings.intensity === "force"
              ? "我先只记录节奏。点开始手动专注后，会从新一轮开始并启用全屏恢复。"
              : "你已经工作一会儿了。点开始手动专注后，会从新一轮开始。"
          };
        }
      }
      return null;
```


Source: `index.html:13660-13805`

```
      return null;
    }

    function restMicroTaskForReason(reason) {
      if (reason === "extended") {
        return {
          title: "继续看远处",
          copy: "不用盯着屏幕，再多休息一会儿。"
        };
      }
      return {
        title: "看向远处",
        copy: "不用盯着屏幕，20 秒后再回来。"
      };
    }

    function currentIntervention(load) {
      const focusTargetMinutes = Number(els.focusTarget.value);
      const elapsedMinutes = elapsedSeconds / 60;
      const symptoms = currentSymptoms();
      const reminderGroup = lightReminderGroup(load, symptoms);
      const reminderLine = lightReminderLine(reminderGroup, Math.floor(elapsedMinutes / 5));
      const deepWorkMiraOnly = latestActivity
        && state.settings.deepWorkMiraOnlyToggle
        && latestActivity.isDeepWorkApp;

      if (state.settings.intensity === "force") {
        const forceEscapeUntil = Number(state.forceEscapeUntil || 0);
        if (forceEscapeUntil > Date.now()) {
          const remainingMinutes = Math.max(1, Math.ceil((forceEscapeUntil - Date.now()) / 60000));
          return {
            level: 1,
            displayLevel: 4,
            title: "强制爱临时退出",
            copy: `这次强制恢复已中断，Mira 会安静 ${remainingMinutes} 分钟。重新开始手动专注后会恢复 L4 规则。`
          };
        }
        if (!isRunning) {
          return {
            level: 1,
            displayLevel: 4,
            title: "强制爱待命",
            copy: isAutoTracking()
              ? "正在自动记录连续计时。点开始手动专注后，会从 00:00 开始并启用恢复断点全屏恢复。"
              : "Mira 会先安静陪伴；开始手动专注后，到恢复断点才进入全屏恢复。"
          };
        }
        if (elapsedMinutes >= focusTargetMinutes) {
          return {
            level: 4,
            title: "强制爱：全屏休息",
            copy: "这一轮已经到恢复断点。EyeFlow 会进入全屏恢复，倒计时结束前不恢复工作界面。"
          };
        }
        return {
          level: 1,
          displayLevel: 4,
          title: "强制爱已开启",
          copy: "Mira 会先安静陪伴；到恢复断点后直接进入全屏恢复。"
        };
      }

      if (shouldHoldMiraSilence(load)) {
        return {
          level: 1,
          displayLevel: 1,
          title: "Mira 先保持安静",
          copy: "今天先不说休息的事了。你看起来在赶什么，专注完再说。"
        };
      }

      if (state.settings.intensity === "quiet" || deepWorkMiraOnly) {
        return {
          level: 1,
          title: "只让 Mira 轻轻变化",
            copy: deepWorkMiraOnly
              ? "检测到深度工作，暂时只更新 Mira 状态，不弹出提示。"
            : `当前是安静模式，默认只用状态球和文字变化。${reminderLine || "看到 Mira 变色时先眨几下，不用停下。"}`
        };
      }

      const chosenDisplayLevel = state.settings.intensity === "clear" ? 3 : 2;

      if (state.settings.intensity === "clear" && elapsedMinutes >= focusTargetMinutes + 10) {
        return {
          level: 3,
          displayLevel: 3,
          title: "已经明显超时",
          copy: "这轮已经超过目标时间较久，Mira 会更明确地建议你休息。"
        };
      }

      if (state.settings.intensity === "clear" && load >= 74) {
        return {
          level: 3,
          displayLevel: 3,
          title: "状态偏高，准备提醒",
          copy: "眼睛信号偏高。Mira 会先观察节奏，持续一小段时间后再明确介入。"
        };
      }

      if (latestActivity && isNaturalBreak(latestActivity)) {
        return {
          level: 2,
          displayLevel: chosenDisplayLevel,
          title: "在恢复断点轻提示",
          copy: `你刚停下来一下，Mira 会借这个空隙提醒你：${lightReminderLine("gaze", "opening") || "看一眼远处，再回来。"}`
        };
      }

      if (elapsedMinutes >= focusTargetMinutes) {
        return {
          level: 2,
          displayLevel: chosenDisplayLevel,
          title: "到恢复断点",
          copy: lightReminderLine("gaze", "due") || "这轮已经到恢复断点。先眨几下，再看远处 20 秒。"
        };
      }

      if (load >= 48 || elapsedMinutes >= focusTargetMinutes * 0.72) {
        const standardEarly = state.settings.intensity === "standard";
        return {
          level: standardEarly ? 1 : 2,
          displayLevel: chosenDisplayLevel,
          title: standardEarly ? "提前观察中" : "提前观察眨眼或远眺",
          copy: standardEarly
            ? reminderLine || "这一轮进入中段。Mira 先只改变状态和颜色；到恢复断点再短暂提示。"
            : reminderLine || "这一轮进入中段。Mira 会轻轻展开一次提醒；到恢复断点再说清楚。"
        };
      }

      return {
        level: 1,
        displayLevel: chosenDisplayLevel,
        title: state.settings.intensity === "clear" ? "明确介入已开启" : "轻提示已开启",
        copy: state.settings.intensity === "clear"
          ? "Mira 先保持安静；到恢复断点、状态信号偏高或明显超时时，会更明确地带你恢复。"
          : "Mira 先保持安静；到恢复断点时，会短暂提示你眨眼和远眺。"
      };
    }

    function renderInterventionStrategy(load) {
      const intervention = currentIntervention(load);
      maybeRecordReminder(intervention, load);
      if (intervention.level >= 4) {
        startForceBreak(intervention);
```


Source: `eyeflow-recovery-data.js:1-230`

```
window.EyeFlowRecoveryData = {
  recoveryModeMeta: {
    light: {
      label: "轻量",
      copy: "全屏恢复会用远眺、慢眨眼和闭眼，把节奏放轻一点。"
    },
    neck: {
      label: "肩颈",
      copy: "强制爱会重点带你放松下巴、肩膀和颈侧。"
    },
    breath: {
      label: "呼吸",
      copy: "强制爱会用闭眼、掌心热敷和慢呼吸，帮助眼睛从屏幕里退出来。"
    },
    exercise: {
      label: "眼保健操",
      copy: "强制爱会加入轻按眼周骨缘的步骤，不按压眼球。"
    },
    mixed: {
      label: "混合",
      copy: "强制爱会组合远眺、眨眼、呼吸和肩颈放松。"
    }
  },
  recoveryTaskLibrary: {
    gaze: {
      mood: "gaze",
      label: "远眺",
      title: "看向远处",
      copy: "不用盯着屏幕，看远处 20 秒再回来。",
      caption: "看远处",
      voiceCue: "不用盯着屏幕。看向远处，20 秒后再慢慢回来。"
    },
    blink: {
      mood: "blink",
      label: "慢眨眼",
      title: "跟 Mira 慢慢眨眼",
      copy: "跟着 Mira 的节奏眨 8 次，每一次都闭完整一点。",
      caption: "慢慢眨，不要急",
      voiceCue: "慢慢眨眼。每一次都闭完整一点，再自然睁开。"
    },
    close: {
      mood: "close",
      label: "闭眼",
      title: "和 Mira 一起闭眼",
      copy: "闭眼 10 秒，把眉心、下巴和屏幕里的紧张一起放下来。",
      caption: "眼睛先休息",
      voiceCue: "现在闭眼。眉心放松，下巴也松一点。"
    },
    breath: {
      mood: "breath",
      label: "慢呼吸",
      title: "跟 Mira 慢慢呼吸",
      copy: "吸气时肩膀不要抬，呼气时让眼眶周围松一点。",
      caption: "呼气时放松",
      voiceCue: "吸气不用用力。呼气时，让眼眶周围松下来。"
    },
    palms: {
      mood: "breath",
      label: "掌心",
      title: "用掌心给眼睛一点暗处",
      copy: "搓热双手，轻轻罩在闭上的眼睛外侧，不压眼球。",
      caption: "只遮光，不按压",
      voiceCue: "双手轻轻罩在眼睛外侧。只遮光，不要压眼球。"
    },
    neck: {
      mood: "neck",
      label: "肩颈",
      title: "跟 Mira 放松肩颈",
      copy: "下巴微收，肩膀慢慢沉下去，感觉后颈慢慢变长。",
      caption: "肩膀慢慢沉下去",
      voiceCue: "下巴微收。肩膀慢慢沉下去，后颈变长一点。"
    },
    jaw: {
      mood: "neck",
      label: "下颌",
      title: "把下颌松开一点",
      copy: "牙齿轻轻分开，舌尖自然放松，别让脸部继续用力。",
      caption: "脸也放松",
      voiceCue: "牙齿轻轻分开。舌尖放松，让脸也休息一下。"
    },
    sideNeck: {
      mood: "neck",
      label: "颈侧",
      title: "把颈侧放松下来",
      copy: "头轻轻偏向一侧，不要用力拉。换边时慢一点。",
      caption: "颈侧也松一点",
      voiceCue: "头轻轻偏向一侧。不用拉扯，只让颈侧慢慢松开。"
    },
    shoulderBlade: {
      mood: "neck",
      label: "肩胛",
      title: "让肩胛慢慢往后下",
      copy: "轻轻展开胸口，肩胛像往后下方滑一点，不要耸肩。",
      caption: "后背也松开",
      voiceCue: "肩胛往后下方轻轻滑一点。不要耸肩。"
    },
    brow: {
      mood: "press",
      label: "眉头",
      title: "轻按眉头附近",
      copy: "用舒服的力度按揉眉头上方的骨缘，不按压眼球。",
      caption: "只按骨缘，不压眼球",
      voiceCue: "轻按眉头上方的骨缘。力度舒服，不压眼球。"
    },
    underEye: {
      mood: "press",
      label: "眼下",
      title: "轻揉眼下骨缘",
      copy: "沿着眼下方骨缘轻轻打圈，力度保持很轻。",
      caption: "轻一点就够了",
      voiceCue: "沿眼下骨缘轻轻打圈。轻一点就够了。"
    },
    temple: {
      mood: "press",
      label: "太阳穴",
      title: "放松太阳穴周围",
      copy: "用指腹在太阳穴附近慢慢打圈，保持呼吸平稳。",
      caption: "慢慢打圈",
      voiceCue: "太阳穴附近慢慢打圈。呼吸保持平稳。"
    }
  },
  recoveryModeTasks: {
    light: ["gaze", "blink", "breath", "close"],
    neck: ["gaze", "jaw", "neck", "sideNeck", "shoulderBlade", "close"],
    breath: ["gaze", "close", "palms", "breath"],
    exercise: ["gaze", "brow", "underEye", "temple", "close"],
    mixed: ["gaze", "blink", "breath", "jaw", "neck", "close"]
  },
  lightReminderLines: {
    blink: [
      "眨一下眼睛。",
      "眼睛忘了眨。提醒一下。",
      "慢慢眨一次。",
      "眼睛干了吗。眨几下。",
      "闭上，再睁开。",
      "眨眼。不用停下来。",
      "眼睛工作了一段时间了。",
      "让眼睛休息一秒。",
      "眨一下，继续。",
      "眼皮动一动。"
    ],
    gaze: [
      "看一下窗外最远的东西。",
      "找一个3米以外的点，看5秒。",
      "把视线从屏幕移开，看看别处。",
      "屏幕以外的世界现在是什么颜色。",
      "看一眼远处，再回来。",
      "你上次看窗外是什么时候。",
      "找一个不发光的东西看一会儿。",
      "离屏幕最远的那个角落，看一眼。",
      "眼睛需要一个不是像素的东西。",
      "现在窗外的光是什么颜色。"
    ],
    relax: [
      "肩膀放下来。",
      "脖子左右各转一下。",
      "松开握鼠标的手。",
      "后背靠一下椅背。",
      "深呼吸一次。",
      "下巴放松。",
      "手放开键盘，放在腿上。",
      "把腰挺直一秒，再放松。",
      "脚踩一下地。",
      "全身放松三秒，然后继续。"
    ]
  },
  restCompanionLines: [
    "不用看屏幕。",
    "眼睛先离开一会儿。",
    "看远一点就好。",
    "慢慢来，不急。",
    "让眼睛缓一下。",
    "现在不用做什么。",
    "把视线放远。",
    "眨几下，再停一停。",
    "肩膀也放下来。",
    "呼吸慢一点。",
    "眼睛已经休息到一半了。",
    "继续看远处。",
    "不用盯着倒计时。",
    "Mira 在这里守时间。",
    "让屏幕等你一下。",
    "闭眼也可以。",
    "下巴松一点。",
    "手也放开一会儿。",
    "差不多了，慢慢回来。",
    "好了，回来时别急着盯屏幕。"
  ],
  relationshipLines: {
    streak: [
      "你已经连续{days}没有跳过休息了。",
      "这周有{days}，眼睛都被你接住了。",
      "这不是打卡，是你的眼睛开始有节奏了。"
    ],
    returning: [
      "回来了。今天眼睛怎么样？",
      "先从今天开始。",
      "你的节奏还在，不用补。"
    ],
    pattern: [
      "你上次也是这个时间段容易撑过去不休息。",
      "Mira 只记这个模式，不记你做了什么。",
      "这个时段先轻一点。"
    ],
    silence: [
      "今天先不说休息的事了。你看起来在赶什么，专注完再说。",
      "Mira 先少说一点。",
      "这段专注先交给你。"
    ]
  }
};
```


## 4. 角色设定

### 4.1 性格、语气、产品位置

`README.md`：

Source: `README.md:1-25`

```
# EyeFlow

EyeFlow 是承载 Mira 的 macOS 桌面应用。Mira 是一个安静待在桌面一角的陪伴角色，在你专注工作时帮你记得休息。

EyeFlow 不是生硬提醒你休息的工具，而是让 Mira 用低打扰的方式陪你完成眨眼、远眺和短休息。

当前版本正在推进公开 macOS 发布：核心体验已经可以在 macOS 桌面运行，公开发布前需要通过签名、公证和上线 preflight。

## 产品原则

- App 叫 EyeFlow，机器人叫 Mira。
- EyeFlow 是产品容器，Mira 是用户记住和产生关系的主角。
- 目标是给眼睛和身体减负，用轻提醒的方式把恢复自然放进工作节奏。
- Mira 不抢控制权，提醒要有边界。
- `强制爱` 是用户明确开启的 L4 模式：到恢复断点进入全屏恢复，倒计时结束前不显示返回按钮。
- 浏览器页面只用于预览；真正的全屏恢复以打包后的桌面 App 为准。

## 当前能力

- 第一次打开，先认识 Mira，并用一个动作开始安静陪伴。
- 开始后 5 分钟内，Mira 会出现一次轻量 aha 时刻，让用户感到她真的在旁边。
- 今日页面展示当前用眼负荷、专注会话、节奏来源和轻量记录入口。
- Mira 桌面头像可拖动、可展开、可通过菜单找回。
- 支持安静、标准、强制爱三种提醒边界。
- 强制爱恢复页支持 Mira 陪伴、步骤流和不同恢复方式。
```


`HANDOFF.md`：

Source: `HANDOFF.md:1-35`

```
# EyeFlow Handoff

## 项目目标

EyeFlow 是承载 Mira 的 macOS 桌面应用。Mira 是用户记住和产生关系的主角：安静待在桌面一角，不抢控制权，不监视内容，只在合适的时候帮用户记得休息。EyeFlow 不是医学诊断工具，产品气质应轻、安静、有善意。

## 当前架构

项目是 Electron 桌面应用。`main.js` 负责主窗口、Mira 悬浮窗、Mira 气泡窗、强制爱全屏窗、托盘、菜单、系统生命周期、活动检测、通知、语音和 IPC。`preload.js` 暴露安全桥。`index.html` 是主工作台。`companion.html` 是悬浮 Mira 头像。`companion-panel.html` 是 Mira 气泡。`break-lock.html` 是强制爱全屏恢复页。应用通过 electron-builder 打包，本地安装到 `/Applications/EyeFlow.app`。

## 已完成功能

- 首次打开先让用户认识 Mira：卖陪伴感，而不是解释工具配置。
- 首日开始后 5 分钟内有一次轻量 aha 气泡，让用户感到 Mira 真的在旁边。
- 状态信号分区：0-47 舒适区，48-73 状态中段，74-100 状态偏高。
- 自动记录和手动专注分离；手动专注从 `00:00` 重新开始。
- 日切、锁屏、睡眠、关机、退出时清理或结算计时，避免隔天继续计时。
- L1/L2/L3/L4 提醒等级；L4 `强制爱` 为用户主动开启。
- 强制爱全屏恢复页，带更慢的语音引导和短恢复 cue；倒计时结束后切到明确完成态，聚焦 `回到 EyeFlow`，使用薄荷焦点样式。
- 恢复动作库：远眺、慢眨眼、闭眼、慢呼吸、掌心遮光、下颌、肩颈、颈侧、肩胛和轻柔眼周骨缘，不按压眼球。
- Mira 悬浮头像：hover 展开、点击收起、拖动移动、离开后延迟自动收起。
- Mira 在 focus、blink、rest 等状态有轻动画；支持减少动态效果。
- Mira 粉色/rest 状态点击头像会打开 EyeFlow，并把主界面聚焦到 `休息` 操作，同时显示休息指引 toast。
- Mira 可见性守护：找回、显示、生命周期恢复、显示器变化和定时监测会把 Mira 拉回可见工作区。
- 忙碌友好提醒：现在休息、5 分钟后、忙完再说。
- 设置页新增 `桌面就绪` 面板，直接展示辅助功能权限、开机启动、当前版本和通知通道，并可打开权限设置、切换开机启动、刷新桌面状态。
- 设置页新增 `反馈与诊断` 卡片，可复制结构化本地诊断反馈模板，包含版本、平台、权限、启动项、通知支持、提醒方式、恢复方式、当前状态信号、最近本地窗口/渲染/语音诊断摘要和用户问题；不会自动上传。
- 高级通知设置里有 `测试通知`，系统通知不可用时会禁用开关并说明会回退到 Mira 状态/轻提示音。
- 私测打包流程：本地 `.app`、DMG/ZIP 构建、GitHub 推送；桌面 QA 必须使用 EyeFlow 成品包，不使用 `npm start` 的 Electron 开发壳。可运行 `npm run smoke:app` 对 `dist/mac/EyeFlow.app` 做自动冒烟测试。
- 成品包 QA 辅助开关：`EYEFLOW_DEBUG_CAPTURE=1` 保存 Electron 内部渲染截图，`EYEFLOW_DEBUG_VIEW=rhythmView` 自动打开设置页截图，`EYEFLOW_DEBUG_ONBOARDING=1` 自动显示首次认识 Mira 的引导用于视觉 QA，`EYEFLOW_DEBUG_COPY_FEEDBACK=1` 自动复制反馈与诊断模板并记录 probe，`EYEFLOW_DEBUG_REST_CLICK=1` 自动验证粉色 Mira 点击休息指引路径，`EYEFLOW_DEBUG_FORCE_PREVIEW=1` 自动触发静音 15 秒强制爱预览、等待 `回到 EyeFlow`、返回设置页并截图；该开关现在不写入用户设置，并会 probe `voicePreserved`。`npm run smoke:app` 已把成品包截图校验流程自动化，并把粉色 Mira 点击后的 `休息` 指引纳入必过截图。

## 待完成功能

- 闭眼/呼吸音频引导还可以继续增强，例如更自然的分段停顿、提示音和用户可选音色。
- Mira 动画还可以继续更细腻，但要保持安静、少提醒。
```


`docs/EYEFLOW_PRODUCT_MEMORY.md`：

Source: `docs/EYEFLOW_PRODUCT_MEMORY.md:1-88`

```
# EyeFlow Product Memory

This file records product decisions that should survive code edits and rebuilds.

## Naming

- The app is called EyeFlow.
- The companion robot is called Mira.
- EyeFlow is the product container; Mira is the remembered subject and the user-facing protagonist.
- Do not rename the app to Mira. Do not use old names from earlier prototypes.

## Product Direction

- EyeFlow is a quiet macOS desktop companion experience for people doing long screen-based work.
- It should reduce burden for eyes and body by letting Mira help users complete recovery with minimal disruption, so the product must stay simple, quiet, and comfortable.
- The core positioning is: Mira is not a timer or a monitoring tool; she is a calm desktop companion who helps users remember to rest.
- First-open and public-facing copy should sell the feeling before explaining mechanics: companion first, differentiation second, features third.
- Keep only necessary features. Avoid adding complex dashboards, noisy gamification, or heavy workflows.

## Eye-Comfort DNA

- EyeFlow is an eye-care product, so "extreme friendliness to the eyes" is part of the product DNA, not a polish item. The interface itself must never be a source of eye strain.
- No harsh luminance flashes. Any change that shifts overall brightness — above all the 白天⇄晚上 (light⇄dark) switch — must be a calm cross-fade, never a hard cut. The dark→light jump at night is the worst offender and must feel gentle.
- Prefer soft, eased transitions over instant snaps for anything that changes color, brightness, or large surfaces. Motion should confirm a change without startling the eye.
- Always honor `prefers-reduced-motion`: users who opt out of motion get an instant, flash-free result instead of an animation.
- When in doubt between "snappy" and "gentle," choose gentle. Comfort for the eyes outranks perceived speed.
- Implementation note: the theme switch arms a one-shot `.theme-anim` cross-fade on `<html>` only during an explicit switch (see `index.html`), so first paint and normal interactions stay instant while the flip stays soft.

## Professional Foundation

- EyeFlow's surface can feel healing, but the professional layer must not be softened. Data analysis, eye-health reasoning, and future hardware collection should feel credible enough to support a serious product ecosystem.
- Product decisions that involve eye health should reference `docs/EYEFLOW_KNOWLEDGE_BASE.md`, including evidence level, source, excluded populations, and claim boundary.
- Data work should reference `docs/EYEFLOW_DATA_DICTIONARY.md`. Keep raw observations, user self-reports, inferred scores, desktop context, and future hardware signals separate.
- The eye-load score should be explainable and confidence-aware. It may guide recovery timing and interruption boundaries, but it must not present itself as diagnosis, treatment, or disease prevention.
- Future hardware support is a product requirement, not a decorative roadmap item. The data model should be ready for blink quality, gaze/viewing distance, ambient light, humidity, posture, signal quality, firmware version, and consent state.
- Any biometric, eye image, high-frequency gaze, or hardware-derived ocular signal must require explicit opt-in, stricter privacy copy, export/delete controls, and review before it appears in the product.
- Frontend copy should be calm and human, but professional claims should stay narrow: prefer behavioral terms like `load`, `signal`, `pattern`, `trend`, and `confidence`; avoid unsupported clinical wording.

## Visual Identity Standards

- EyeFlow and Mira use related visual DNA, but they are not the same graphic.
- `EyeFlow brand icon` is the product/app mark. Use it only for product identity surfaces:
  - macOS Dock and Finder app icon
  - `assets/icon.svg`, generated PNG/iconset/ICNS assets, DMG/app bundle icon
  - sidebar brand mark beside `EyeFlow`
  - About/release/install surfaces if an app mark is needed
- EyeFlow brand icon must stay simple: rounded square tile, black mask, two small white eyes, one green status dot. It must not have Mira's antenna arc, mouth, cheeks, expressions, mood colors, or animations.
- The EyeFlow brand icon's green dot is a brand signal, not a live mood indicator. Do not recolor it per eye-load state.
- `Mira avatar` is the companion character. Use it only where Mira is present as a guide, companion, or recovery partner:
  - draggable desktop companion in `companion.html`
  - Mira speech bubble / companion panel
  - onboarding and daily assessment guidance
  - Today state stage when Mira interprets the user's state
  - rest/recovery/fullscreen guidance screens
  - Mira-led feedback or response moments
- Mira avatar may have the antenna arc, mouth, cheeks, expressions, motion, and mood-colored status dot. It should feel alive and can change by state.
- Do not use the full Mira avatar as the Dock/app icon. Do not replace the draggable Mira avatar with the simplified EyeFlow brand icon.
- Mira-led feedback cards are Mira avatar surfaces, not EyeFlow brand icon surfaces. If the feedback space is compact, use a `mini Mira` variant: keep the antenna arc, mouth, cheeks, mask, eyes, and mood dot, but scale them from the shared 58-unit face reference so nothing drifts or looks hand-placed.
- Shared geometry rule: both graphics can share the same core face proportions for the mask, eyes, and status dot, derived from the 58-unit Mira face reference: mask `x=10 y=19 w=38 h=18`, status dot `size=9 top=15 right=8`, and icon eyes centered at `x=21.5/36.5 y=26.5 r=2.5`. The difference is in context and allowed details: EyeFlow brand icon is simplified; Mira avatar is expressive.

## Mira Desktop Form

- Mira should feel like a small desktop companion.
- The desktop form is a draggable Mira avatar plus a related speech-bubble panel.
- The expanded state should look like Mira is speaking, with a bubble tail or clear visual connection.
- Avoid a disconnected rectangular card beside the avatar.
- Day and night avatars should share the same geometry and expression system; only the color tone changes.
- Mira avatars should avoid visible white head highlights on product surfaces. Soft color gradients are fine, but do not use a distinct circular white spot on the head.
- Night avatars should avoid visible face highlights. Keep the dark surface clean, soft, and low-contrast; let the status dot, mouth, and expression carry the mood instead of a bright top-left glow.
- The status signal is one small dot. Its color changes by state:
  - calm/focus: soft green or blue-green
  - blink: warm yellow
  - rest/high load: soft pink

## Interaction Principles

- Mira should not steal control.
- L1: only state changes, expression, and copy.
- L2: short speech bubble only when timing is fair, such as at the focus target or a natural break; mid-session medium load should first change state without expanding a reminder.
- L3: stronger rest suggestion for high load or clear overtime, still gentle; high load can be observed briefly before surfacing a reminder so the app does not punish the user immediately after assessment.
- L4 `强制爱`: opt-in only; stay quiet before the focus target time, then use a full-screen forced rest whose return button appears only after the rest countdown finishes.
- The floating Mira avatar should feel light: hovering on Mira briefly opens the speech bubble, one gentle tap can still open/close it, and dragging is available only after a clear movement threshold. After the cursor leaves both Mira and the speech bubble, the bubble should wait about 1.5-1.8 seconds before closing so the interaction feels calm rather than twitchy. Normal L1 startup should not auto-open the speech bubble.
- Settings should let users choose the reminder ceiling directly as L1/L2/L3/L4. Do not hide L2/L3 behind vague labels like `标准`; the card may show the selected ceiling while the internal trigger still waits for the right timing.
- L4 `强制爱` must not trigger from desktop auto-recording alone. If EyeFlow is only auto-recording screen time, `强制爱` should show as pending/standby; full-screen recovery is armed only after the user explicitly starts manual focus.
- Enabling L4 `强制爱` requires an explicit confirmation step. Clicking the `强制爱` mode button should first show a confirmation/preview card and must not immediately change the active disturbance boundary.
- `5 分钟后` should behave as a real five-minute snooze, not a vague dismissal; the snooze window should override the ordinary reminder cooldown when it expires.
- The reminder rules panel must explicitly include L4 `强制爱`, including its opt-in boundary and hidden return button during countdown.
- The full-screen forced-rest page must feel protective, not punitive: use an eye-friendly low-contrast palette, avoid oversized countdowns that invite staring, and make Mira's recovery action the main focus.
```


`docs/DOWNLOAD_PAGE_COPY.md`：

Source: `docs/DOWNLOAD_PAGE_COPY.md:1-45`

```
# EyeFlow 下载页文案

这份文案适合放在一个简单试用页上。真正发出前，把下载链接换成实际链接。

## 首屏

认识 Mira

专注工作时，  
也有人照顾你的眼睛。

Mira 会安静地待在桌面一角。  
不打断。  
不监视。  
只是帮你记得休息。

按钮：认识 Mira

链接：隐私说明

辅助说明：

EyeFlow 是承载 Mira 的 macOS 应用。

## 三句话说明

- 别的工具会打断你。Mira 不会。
- Mira 会先安静陪你计时，到合适的时候再轻轻提醒。
- 本地优先：节奏数据保存在你的 Mac 上，不读取文档、键盘输入、消息、摄像头或麦克风。

## Mira 会做什么

- 在桌面一角安静陪伴，不抢控制权。
- 根据你的专注节奏，找更自然的休息点。
- 到休息点时，给一个很轻的提醒。
- 休息结束后，帮你回到刚才的节奏。
- 每天结束时，整理一张安静的本地复盘。

## 你可以试什么

- 第一次打开，看看是否能在 30 秒内理解 Mira 在做什么。
- 确认 Mira 出现、可拖动、可展开/收起。
- 开始一轮专注，看看 Mira 是否真的像一个桌面伙伴，而不是普通计时器。
- 等 5 分钟内的第一次轻提醒，看看是否有“她在旁边”的感觉。
- Mira 变粉色时点一下，看看休息指引是否清楚。
```


### 4.2 视觉身份设定

`docs/EYEFLOW_DESIGN_SYSTEM.md`：

Source: `docs/EYEFLOW_DESIGN_SYSTEM.md:200-219`

```
## Mira Avatar Standard

Mira is a product character, not decorative chrome. Use the shared 58-unit geometry tokens from `eyeflow-design-system.css` for the default face in the main window, Today stage, desktop companion, and calm onboarding states.

Canonical default avatar:

- Body: `--ef-mira-avatar-size`, `--ef-mira-avatar-radius`.
- Visor: `--ef-mira-visor-*`.
- Signal dot: `--ef-mira-signal-*`.
- Eyes: `--ef-mira-face-*` and `--ef-mira-eye-size`.
- Mouth: `--ef-mira-mouth-*`; default is a short soft smile, not a long horizontal line.
- Cheeks and antenna: `--ef-mira-cheek-*` and `--ef-mira-antenna-*`.

Rules:

- Do not create a separate visor, eye, mouth, or antenna coordinate set for a new Mira surface.
- Larger surfaces may scale the container or add a quiet orbit, but the face itself should stay on the canonical 58-unit proportions unless a state-specific expression requires a documented override.
- Calm/default/focus states use the short soft smile. Blink/rest states may override eye height or mouth color, but should keep the same width discipline.
- Stage or orbit decoration must be lower-emphasis than Mira's face. Avoid thick arcs, saturated halos, and large decorative rings that make Mira feel like a badge or game avatar.
- App icons and tiny brand marks may stay simplified; they are not the expressive Mira avatar.
```


`docs/CHANGELOG_2026-06-03.md`：

Source: `docs/CHANGELOG_2026-06-03.md:1-35`

```
# EyeFlow Changelog - 2026-06-03

## Product Decisions Recorded

- App name is EyeFlow.
- Robot companion name is Mira.
- EyeFlow should stay simple, quiet, and comfortable because it is meant to reduce burden for eyes and body.
- Features should be kept necessary and clear rather than becoming a complex productivity dashboard.
- Mira's desktop product form is a draggable avatar with a visually connected speech bubble.
- The expanded state should read as a dialogue bubble, not a disconnected rectangular card.
- Day and night Mira should share the same geometry and expression system; only color tones change.
- Mira uses one small status dot whose color changes by state.

## UX And Flow Changes

- Daily first open should guide the user through a current eye-state self rating.
- After the user rates their current state, Mira should guide them into focus mode.
- High-load or pink/rest state should close the loop through a gentle recovery flow rather than stopping at a warning.
- Reminder levels stay simple:
  - L1: state, expression, and copy only.
  - L2: short bubble reminder, then auto-collapse.
  - L3: stronger rest suggestion, still gentle and non-controlling.

## Mira Visual Changes

- Mira status signal was simplified to one dot.
- Blink state uses a warmer yellow signal.
- Rest/high-load state uses a soft pink signal.
- Rest mouth was refined away from a harsh black shape toward a softer pout-like expression.
- The preview/expanded companion layout was restored to avatar plus speech bubble with a tail.
- The outer expanded companion container is transparent; the bubble itself carries the background and shadow.
- Narrow dashboard previews now keep Mira's copy visible by default and hide only the action buttons, so Mira does not collapse into an unclear static icon unless explicitly minimized.
- The onboarding Mira avatar now has its own 92px layout rules for mask, eyes, mouth, cheeks, antenna, and signal dot instead of stretching the small companion avatar coordinates.
- The onboarding Mira avatar highlight circle was removed so the only round status indicator is the single state dot.

```


`docs/CHANGELOG_2026-06-04.md`：

Source: `docs/CHANGELOG_2026-06-04.md:212-219`

```
- Standardized the EyeFlow icon-face geometry against Mira's 58-unit face reference, documenting the mask, status dot, and eye positions so app icon, sidebar mark, and compact feedback avatar stay consistent.
- Split the visual identity rules into two strict systems: EyeFlow brand icon for product identity surfaces, and Mira avatar for companion/guidance surfaces.
- Returned the ordinary-rest feedback card to the Mira avatar system with a standardized 64px mini Mira, keeping the antenna arc, mouth, and cheeks aligned to the shared face geometry.
- Added optional `强制爱` voice guidance, enabled by default, using macOS system speech in the desktop app and browser speech synthesis as a fallback for previews.
- Fixed the `强制爱` settings card so the chosen mode displays as L4 while the internal trigger still waits until a manual focus session reaches the target time.
- Replaced the vague `安静 / 标准 / 强制爱` reminder selector with explicit `L1 / L2 / L3 / L4` choices so users can directly choose light, clearer, or forced reminder ceilings.
- Removed the visible top-left highlight from the night Mira avatar and softened the night blink yellow so the compact companion feels calmer on dark desktops.
- Removed the circular white head highlight from the Today state-stage Mira, in-app companion Mira, and full-screen recovery Mira so the avatar system stays cleaner and more consistent.
```


`docs/CHANGELOG_2026-06-05.md`：

Source: `docs/CHANGELOG_2026-06-05.md:17-60`

```
## Mira Motion

- Added quieter state-aware motion for Mira: slow breathing in calm/focus states, a short blink cue for blink reminders, and a softer rest nudge.
- Synced the main Today Mira and browser fallback companion with the same low-intensity motion language.
- Added `prefers-reduced-motion` handling so Mira and UI transitions respect users who reduce motion at the system level.

## Rest Guidance

- When desktop Mira is in the pink rest state, clicking the avatar now opens EyeFlow and guides focus to the rest action instead of only toggling the speech bubble.
- Added a short rest-guide toast so users understand that the `休息` button starts the guided recovery flow.

## Distribution QA

- Regenerated the finished `dist/mac/EyeFlow.app` bundle and ZIP for finished-app desktop QA.
- Rebuilt the private-alpha DMG with the local `hdiutil` fallback after the electron-builder DMG helper download stalled.
- Verified the fallback DMG image info, mounted contents, `EyeFlow.app` identity, `/Applications` link, and clean detach.

## Mira Visibility

- Added a unified Mira reveal path that clamps the floating avatar back onto the visible work area, restores always-on-top behavior, and brings it forward without stealing focus by default.
- `显示 Mira`, `找回 Mira`, and Mira speech-bubble expansion now share the same reachability logic.
- Added a lightweight periodic reachability check plus display-change handling so Mira is less likely to disappear after monitor or Spaces changes.
- Sleep/lock lifecycle recovery now distinguishes system-hidden Mira from user-hidden Mira.
- Hardened companion hide calls so lifecycle cleanup no longer calls `hide()` on destroyed Electron windows.

## Timer Reliability

- Fixed a cross-day timer bug where EyeFlow could still show elapsed focus time after the Mac woke up or the app remained open overnight.
- Startup now loads saved elapsed time only when today's Mira assessment has already been completed.
- Focus sessions now check the current calendar day on tick, window focus, page show, and visibility resume; if a new day is detected, EyeFlow stops the session, clears the timer, and opens today's Mira assessment.
- Desktop activity sensing no longer writes automatic focus time before today's assessment is complete.
- The focus-session card now says `待校准` / `先校准今天` when the day has not been assessed, instead of implying that focus is already running.
- Settings activity copy now shows `等待校准` before daily assessment, making it clear that EyeFlow is sensing activity but not recording today's focus time yet.
- Added a lightweight session-source state so EyeFlow can distinguish automatic recording, manual focus, paused manual focus, and idle.
- Starting manual focus from an automatic recording now begins a fresh round from `00:00` instead of inheriting the auto-recorded elapsed time.
- Added desktop lifecycle handling for lock screen, sleep, shutdown, and app quit. These events now hide Mira, complete the current visible session if one exists, record a system-detected rest, and reset the timer for the next round.
- When a manual focus session passes its target time, the timer hint now explains that the round has reached or exceeded the target and recommends the current rest duration, so the yellow load state does not feel like a random jump.
- The focus-session card now turns the yellow due state into an explicit next action: the state pill says `到点休息` and the rest button changes to `开始 N 秒休息`.
- Added busy-friendly reminder surfacing: when the user is actively working, EyeFlow keeps the yellow state and in-place rest action but waits for a natural break or short idle moment before showing a reminder card.
- Reminder cards now include `忙完再说`, which suppresses repeated prompts and waits until the next natural break before reminding again.
- Lightened the floating Mira interaction: tapping the avatar now toggles the speech bubble open/closed, dragging only begins after a clear movement threshold, double-click no longer opens the dashboard in the desktop shell, and ordinary L1 startup no longer auto-expands Mira.
- Added hover-to-open for floating Mira: resting the cursor on the avatar briefly opens the speech bubble, while tap-to-close still works.
- Added a calmer hover boundary for floating Mira: the speech bubble now stays open while the cursor moves between the avatar and bubble, then closes after a short delay once both areas are left.
- Slowed Mira's hover auto-close delay to about 1.6 seconds so the bubble recedes more gently.
```


### 4.3 金·专注 定位说明

未找到。项目内以及外圈只读搜索 `/Users/lovellezhang/Desktop`、`/Users/lovellezhang/Documents`、`/Users/lovellezhang/Projects` 均未命中 `金·专注` / `金专注` / `专注定位`。

### 4.4 “Mira” 命名研究（wonder / 奇迹 等）

未找到完整命名研究文档。外圈只读搜索未命中 `wonder`、`miracle`、`奇迹`、`命名研究`、`Mira.*命名`、`命名.*Mira`。当前项目只保留命名决策原文：

- `docs/EYEFLOW_PRODUCT_MEMORY.md`: “The companion robot is called Mira.”
- `README.md`: “App 叫 EyeFlow，机器人叫 Mira。”
- `docs/RELEASE_CHECKLIST.md`: “Robot companion name is `Mira`.”

## 5. 现有视觉 token

### 5.1 设计系统 token

Source: `eyeflow-design-system.css:1-135`

```
:root {
  /* Typography scale */
  --ef-font-sans: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --ef-text-micro: 11px;
  --ef-text-caption: 11.5px;
  --ef-text-meta: 12px;
  --ef-text-helper: 12.5px;
  --ef-text-body-sm: 13px;
  --ef-text-body: 14px;
  --ef-text-body-lg: 15px;
  --ef-text-reading: 15.5px;
  --ef-text-title-sm: 16px;
  --ef-text-title-md: 18px;
  --ef-text-title-lg: 22px;
  --ef-text-display-sm: 28px;
  --ef-text-display-md: 34px;
  --ef-text-display-lg: 44px;

  /* Line-height scale */
  --ef-line-tight: 1.12;
  --ef-line-title: 1.22;
  --ef-line-compact: 1.35;
  --ef-line-body: 1.45;
  --ef-line-reading: 1.62;

  /* 5-role type scale. Every text element resolves to exactly one role via the
     .ef-role-* utility classes — no ad-hoc size/weight, no browser defaults. */
  --ef-role-display-size: 28px;
  --ef-role-display-weight: 600;
  --ef-role-display-line: 1.12;
  --ef-role-display-spacing: -0.022em;

  --ef-role-title-size: 17px;
  --ef-role-title-weight: 600;
  --ef-role-title-line: 1.25;
  --ef-role-title-spacing: -0.01em;

  --ef-role-stat-size: 20px;
  --ef-role-stat-weight: 600;
  --ef-role-stat-line: 1.2;
  --ef-role-stat-spacing: -0.01em;

  --ef-role-body-size: 14px;
  --ef-role-body-weight: 400;
  --ef-role-body-line: 1.55;
  --ef-role-body-spacing: 0;

  --ef-role-label-size: 12px;
  --ef-role-label-weight: 500;
  --ef-role-label-line: 1.4;
  --ef-role-label-spacing: 0;

  /* 2px-based spacing scale, biased toward quiet desktop density. */
  --ef-space-0: 0;
  --ef-space-1: 4px;
  --ef-space-2: 6px;
  --ef-space-3: 8px;
  --ef-space-4: 10px;
  --ef-space-5: 12px;
  --ef-space-6: 14px;
  --ef-space-7: 16px;
  --ef-space-8: 18px;
  --ef-space-9: 20px;
  --ef-space-10: 24px;
  --ef-space-11: 28px;
  --ef-space-12: 32px;
  --ef-space-13: 40px;
  --ef-space-14: 48px;

  /* Shape */
  --ef-radius-xs: 4px;
  --ef-radius-sm: 6px;
  --ef-radius-md: 8px;
  --ef-radius-lg: 12px;
  --ef-radius-xl: 16px;
  --ef-radius-pill: 999px;
  --ef-radius-companion: 22px;

  /* Controls */
  --ef-control-sm: 28px;
  --ef-control-md: 34px;
  --ef-control-lg: 40px;
  --ef-hit-target: 32px;

  /* Icon and symbol weight */
  --ef-icon-xs: 12px;
  --ef-icon-sm: 14px;
  --ef-icon-md: 16px;
  --ef-icon-lg: 20px;
  --ef-icon-xl: 24px;
  --ef-icon-stroke-quiet: 1.4;
  --ef-icon-stroke-base: 1.6;
  --ef-icon-stroke-strong: 1.8;
  --ef-symbol-weight-quiet: 500;
  --ef-symbol-weight-base: 600;
  --ef-symbol-weight-strong: 700;

  /* Mira avatar geometry: 58-unit canonical face. */
  --ef-mira-avatar-size: 58px;
  --ef-mira-avatar-radius: 18px 18px 16px 16px;
  --ef-mira-visor-top: 19px;
  --ef-mira-visor-left: 10px;
  --ef-mira-visor-width: 38px;
  --ef-mira-visor-height: 18px;
  --ef-mira-signal-top: 15px;
  --ef-mira-signal-right: 8px;
  --ef-mira-signal-size: 9px;
  --ef-mira-face-top: 24px;
  --ef-mira-face-left: 18px;
  --ef-mira-face-width: 22px;
  --ef-mira-face-height: 8px;
  --ef-mira-eye-size: 5px;
  --ef-mira-mouth-top: 38px;
  --ef-mira-mouth-width: 8px;
  --ef-mira-mouth-height: 5px;
  --ef-mira-mouth-stroke: 1.5px;
  --ef-mira-mouth-color: rgba(15, 159, 122, 0.58);
  --ef-mira-cheek-top: 35px;
  --ef-mira-cheek-size: 7px;
  --ef-mira-cheek-height: 3px;
  --ef-mira-cheek-offset: 12px;
  --ef-mira-antenna-top: 7px;
  --ef-mira-antenna-left: 18px;
  --ef-mira-antenna-width: 22px;
  --ef-mira-antenna-height: 12px;
  --ef-mira-antenna-stroke: 2px;

  /* Motion */
  --ef-motion-fast: 120ms;
  --ef-motion-base: 160ms;
  --ef-motion-slow: 240ms;
  --ef-ease-calm: cubic-bezier(0.2, 0, 0.2, 1);

  /* Compatibility aliases used by the current main window. */
  --text-xs: var(--ef-text-helper);
```


### 5.2 主窗口运行时颜色 token

Source: `index.html:1-165`

```
<!doctype html>
<html lang="zh-CN"><head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>EyeFlow - Mira 桌面伙伴</title>
  <link rel="stylesheet" href="./eyeflow-design-system.css">
  <style>
    /* CRITICAL TOKENS — mirror of eyeflow-design-system.css :root block.
       Inlined so first-paint layout (sidebar padding/gap, theme-switch sizing,
       all --ef-* spacing/radius/motion) never depends on the external sheet
       loading a frame late. KEEP IN SYNC with eyeflow-design-system.css. */
    :root {
      /* Typography scale */
      --ef-font-sans: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      --ef-text-micro: 11px;
      --ef-text-caption: 11.5px;
      --ef-text-meta: 12px;
      --ef-text-helper: 12.5px;
      --ef-text-body-sm: 13px;
      --ef-text-body: 14px;
      --ef-text-body-lg: 15px;
      --ef-text-reading: 15.5px;
      --ef-text-title-sm: 16px;
      --ef-text-title-md: 18px;
      --ef-text-title-lg: 22px;
      --ef-text-display-sm: 28px;
      --ef-text-display-md: 34px;
      --ef-text-display-lg: 44px;
    
      /* Line-height scale */
      --ef-line-tight: 1.12;
      --ef-line-title: 1.22;
      --ef-line-compact: 1.35;
      --ef-line-body: 1.45;
      --ef-line-reading: 1.62;
    
      /* 5-role type scale. Every text element resolves to exactly one role via the
         .ef-role-* utility classes — no ad-hoc size/weight, no browser defaults. */
      --ef-role-display-size: 28px;
      --ef-role-display-weight: 600;
      --ef-role-display-line: 1.12;
      --ef-role-display-spacing: -0.022em;
    
      --ef-role-title-size: 17px;
      --ef-role-title-weight: 600;
      --ef-role-title-line: 1.25;
      --ef-role-title-spacing: -0.01em;
    
      --ef-role-stat-size: 20px;
      --ef-role-stat-weight: 600;
      --ef-role-stat-line: 1.2;
      --ef-role-stat-spacing: -0.01em;
    
      --ef-role-body-size: 14px;
      --ef-role-body-weight: 400;
      --ef-role-body-line: 1.55;
      --ef-role-body-spacing: 0;
    
      --ef-role-label-size: 12px;
      --ef-role-label-weight: 500;
      --ef-role-label-line: 1.4;
      --ef-role-label-spacing: 0;
    
      /* 2px-based spacing scale, biased toward quiet desktop density. */
      --ef-space-0: 0;
      --ef-space-1: 4px;
      --ef-space-2: 6px;
      --ef-space-3: 8px;
      --ef-space-4: 10px;
      --ef-space-5: 12px;
      --ef-space-6: 14px;
      --ef-space-7: 16px;
      --ef-space-8: 18px;
      --ef-space-9: 20px;
      --ef-space-10: 24px;
      --ef-space-11: 28px;
      --ef-space-12: 32px;
      --ef-space-13: 40px;
      --ef-space-14: 48px;
    
      /* Shape */
      --ef-radius-xs: 4px;
      --ef-radius-sm: 6px;
      --ef-radius-md: 8px;
      --ef-radius-lg: 12px;
      --ef-radius-xl: 16px;
      --ef-radius-pill: 999px;
      --ef-radius-companion: 22px;
    
      /* Controls */
      --ef-control-sm: 28px;
      --ef-control-md: 34px;
      --ef-control-lg: 40px;
      --ef-hit-target: 32px;
    
      /* Icon and symbol weight */
      --ef-icon-xs: 12px;
      --ef-icon-sm: 14px;
      --ef-icon-md: 16px;
      --ef-icon-lg: 20px;
      --ef-icon-xl: 24px;
      --ef-icon-stroke-quiet: 1.4;
      --ef-icon-stroke-base: 1.6;
      --ef-icon-stroke-strong: 1.8;
      --ef-symbol-weight-quiet: 500;
      --ef-symbol-weight-base: 600;
      --ef-symbol-weight-strong: 700;
    
      /* Mira avatar geometry: 58-unit canonical face. */
      --ef-mira-avatar-size: 58px;
      --ef-mira-avatar-radius: 18px 18px 16px 16px;
      --ef-mira-visor-top: 19px;
      --ef-mira-visor-left: 10px;
      --ef-mira-visor-width: 38px;
      --ef-mira-visor-height: 18px;
      --ef-mira-signal-top: 15px;
      --ef-mira-signal-right: 8px;
      --ef-mira-signal-size: 9px;
      --ef-mira-face-top: 24px;
      --ef-mira-face-left: 18px;
      --ef-mira-face-width: 22px;
      --ef-mira-face-height: 8px;
      --ef-mira-eye-size: 5px;
      --ef-mira-mouth-top: 38px;
      --ef-mira-mouth-width: 8px;
      --ef-mira-mouth-height: 5px;
      --ef-mira-mouth-stroke: 1.5px;
      --ef-mira-mouth-color: rgba(15, 159, 122, 0.58);
      --ef-mira-cheek-top: 35px;
      --ef-mira-cheek-size: 7px;
      --ef-mira-cheek-height: 3px;
      --ef-mira-cheek-offset: 12px;
      --ef-mira-antenna-top: 7px;
      --ef-mira-antenna-left: 18px;
      --ef-mira-antenna-width: 22px;
      --ef-mira-antenna-height: 12px;
      --ef-mira-antenna-stroke: 2px;
    
      /* Motion */
      --ef-motion-fast: 120ms;
      --ef-motion-base: 160ms;
      --ef-motion-slow: 240ms;
      --ef-ease-calm: cubic-bezier(0.2, 0, 0.2, 1);
    
      /* Compatibility aliases used by the current main window. */
      --text-xs: var(--ef-text-helper);
      --text-sm: 13.5px;
      --text-base: var(--ef-text-body-lg);
      --text-reading: var(--ef-text-reading);
      --line-reading: var(--ef-line-reading);
      --line-compact: 1.42;
      --text-stack-tight: var(--ef-space-2);
      --text-stack: var(--ef-space-4);
      --text-stack-loose: var(--ef-space-6);
    }
  </style>
  <style>
    :root {
      color-scheme: light;
      /* Neutral system — single restrained palette, no mood-driven hue shifts. */
      --ink: #1d1d1f;
      --ink-soft: #38383b;
      /* Secondary text = primary ink at 60% — derived, so it tracks light/dark
         automatically instead of being a separate gray hex. */
      --ef-text-secondary: color-mix(in srgb, var(--ink) 60%, transparent);
```


### 5.3 关键颜色摘要

| 用途 | 变量 / 值 |
|---|---|
| 主墨色 | `--ink: #1b2622` |
| 柔和文字 | `--muted: #6b7973` |
| 页面 wash | `--wash: #eef4ed` |
| 面板底色 | `--panel: #fbfcf6` |
| Mira 主色 | `--mira: #1f7a5e` |
| Mira soft | `--mira-soft: rgba(31, 122, 94, 0.08)` |
| Mira line | `--mira-line: rgba(31, 122, 94, 0.18)` |
| app icon gradient | `#d8fff1`, `#bdeaff`, `#f4efc7` |
| app icon signal dot | `#62d6ae` / SVG `#6FE7C3` |
| share-card background | `#f5f3ee` |
| companion dark focus signal | `#7cc6dd` |
| companion blink signal | `#e9c979` |
| companion rest signal | `#e78da8` |
| typography | `--ef-font-sans`, app body also uses `-apple-system`, `BlinkMacSystemFont`, `SF Pro Text`, `Inter` |
| share-card quote font | `Songti SC`, `STSong`, `Noto Serif CJK SC`, `Georgia`, `serif` |

## 6. 不一致点（快速判断）

- 品牌图标和 Mira avatar 的边界已有文档规定，但实际 UI 中 `share-art-mark`、sidebar `.mark`、canvas `drawShareMiraMark()` 都容易被误认为 Mira 头像；需要在命名上持续标注为 app mark / brand icon。
- `assets/icon.svg` / `share-art-mark` 使用浅蓝-薄荷-米黄渐变；sidebar `.mark` 现在是深绿单色渐变，视觉家族相关但气质不同。
- `companion.html` 桌面 Mira 仍保留 mood-driven signal colors（focus 蓝绿、blink 黄、rest 粉），而 `index.html` Today stage 已转成“统一 Mira 绿，用表情表达状态”。这是当前最大系统差异。
- `break-lock.html` 的强制恢复 Mira 使用 72px base + 1.72 scale，`index.html` 普通恢复使用 58px + 1.9 scale，二者视觉尺寸接近但几何基准不同。
- first-open onboarding Mira 使用单独坐标（如 visor top 24 / width 36），不是完全用 58-unit tokens；文档曾记录“onboarding has own layout rules”，但设计系统现在要求尽量使用 shared 58-unit geometry。
- `rest` 嘴型在多处使用 “Ɛ” 字符绘制；stage、companion、break overlay 的字号/颜色/weight 略有差异，可能导致同一表情在不同界面气质不一致。
- app icon SVG 注释写的是 “Mira icon-face standard”，但 Product Memory 后续又要求 “app icon is not the full Mira avatar”。这不是功能冲突，但命名上容易混淆。

