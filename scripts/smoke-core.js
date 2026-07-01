#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(source, expected, label) {
  if (!source.includes(expected)) {
    throw new Error(`${label}: missing "${expected}"`);
  }
}

function assertMatches(source, pattern, label) {
  if (!pattern.test(source)) {
    throw new Error(`${label}: pattern not found: ${pattern}`);
  }
}

function assertNotMatches(source, pattern, label) {
  if (pattern.test(source)) {
    throw new Error(`${label}: unexpected pattern found: ${pattern}`);
  }
}

function assertArrayLiteralMinLength(source, name, minLength, label) {
  const match = source.match(new RegExp(`const\\s+${name}\\s*=\\s*\\[([\\s\\S]*?)\\];`));
  if (!match) {
    throw new Error(`${label}: missing array literal ${name}`);
  }
  const count = [...match[1].matchAll(/"[^"]*"/g)].length;
  if (count < minLength) {
    throw new Error(`${label}: expected at least ${minLength} items, got ${count}`);
  }
}

// Dark-mode guardrail: themed views must use theme tokens, not hardcoded neutral
// surface/border/text colors (those break in night mode). Scans <style> rules;
// allows the intentional set (share-art printed card, chart GLYPHS, dead
// onboarding CSS, semi-semantic reminders, dark code block). NOTE: chart
// plot-area BACKGROUNDS are surfaces, not glyphs — they are NOT exempt (the
// weekly grids were un-allowlisted; a white-veil background is flagged below).
function assertNoHardcodedNeutralSurfaces(html, label) {
  const styles = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n");
  const THEMED = /#profileView|#rhythmView|\.metrics |\.metric-pair|\.state-cue|\.assessment-reminder|\.feedback-template|\.recovery-mode|\.trend\b|\.icon-btn|\.trust-item|\.reason\b|\.intervention|\.archive|\.history|\.data-console|\.profile-|\.readiness/;
  const INTENTIONAL = /share-art|candle|weekly-(?:state|candle)|\bwick\b|kline|onboarding|break-|companion|\.pet|mira-|stage-|pending-reminder|recovery-feedback|data-console-pre|today-flow|session-start-hint|\.insight|symptom|note-box|force-/;
  const NEUTRAL = [
    /border(?:-(?:top|bottom|left|right|color))?\s*:\s*[^;]*?rgba\((?:24,\s*32,\s*31|16,\s*27,\s*24)[^)]*\)/,
    /background(?:-color)?\s*:\s*(?:rgba\((?:251,\s*252,\s*246|245,\s*247,\s*246|242,\s*247,\s*241|248,\s*250,\s*243|246,\s*251,\s*248|247,\s*250,\s*246)[^)]*\)|#fbfdf9|#fbfcfa|#f6f8f4)/,
    /background(?:-color)?\s*:\s*rgba\(226,\s*235,\s*229[^)]*\)/,
    /color\s*:\s*rgba\(73,\s*88,\s*82[^)]*\)/,
    // A plot-area / surface background must never be a light white veil (renders
    // lighter than the card in dark mode). Use a recessed token (--chart-plot-bg).
    /background[^;]*:\s*[^;]*rgba\(255,\s*255,\s*255/,
  ];
  const violations = [];
  for (const m of styles.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].replace(/\s+/g, " ").trim();
    if (!THEMED.test(sel) || INTENTIONAL.test(sel)) continue;
    for (const re of NEUTRAL) {
      const hit = m[2].match(re);
      if (hit) violations.push(`${sel.slice(0, 60)}  ::  ${hit[0].trim().slice(0, 48)}`);
    }
  }
  if (violations.length) {
    throw new Error(`${label}: ${violations.length} hardcoded neutral color(s) in themed views:\n  ${violations.slice(0, 15).join("\n  ")}`);
  }
}

// Critical-CSS guardrail: index.html inlines the design-system :root token block
// so first-paint layout (sidebar padding/gap, theme-switch sizing) never waits on
// the external stylesheet. That makes two copies — this asserts they don't drift:
// every --token declared in eyeflow-design-system.css's :root must appear, with an
// identical value, in index.html's "CRITICAL TOKENS" inline <style>.
function tokenMap(cssBlock) {
  const map = new Map();
  for (const m of cssBlock.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    map.set(m[1], m[2].replace(/\s+/g, " ").trim());
  }
  return map;
}

function assertCriticalTokensInSync(html, designCss, label) {
  const sourceRoot = designCss.match(/:root\s*\{([\s\S]*?)\n\}/);
  if (!sourceRoot) {
    throw new Error(`${label}: could not locate :root block in eyeflow-design-system.css`);
  }
  const inlineBlock = html.match(/<style>\s*\/\* CRITICAL TOKENS[\s\S]*?<\/style>/);
  if (!inlineBlock) {
    throw new Error(`${label}: missing inlined "CRITICAL TOKENS" <style> in index.html`);
  }
  const source = tokenMap(sourceRoot[1]);
  const inline = tokenMap(inlineBlock[0]);
  const drift = [];
  for (const [name, value] of source) {
    if (!inline.has(name)) {
      drift.push(`${name}: missing from inline mirror`);
    } else if (inline.get(name) !== value) {
      drift.push(`${name}: css="${value}" vs inline="${inline.get(name)}"`);
    }
  }
  if (drift.length) {
    throw new Error(
      `${label}: ${drift.length} token(s) drifted — re-copy the :root block into index.html's CRITICAL TOKENS <style>:\n  ${drift.slice(0, 20).join("\n  ")}`
    );
  }
}

// Dark-mode guardrail #2: colors injected from JS bypass the CSS token system
// entirely (the stage-tone sliders and the state band did exactly this), so the
// CSS scan above can't see them. Scan JS — inline <script> blocks plus the
// extracted modules — for hardcoded color literals assigned to .style.<color> or
// a custom property via setProperty. Theme-aware values use var(--token) instead.
function assertNoJsInjectedHardcodedColors(html, modules, label) {
  // Standalone hex (not an HTML entity like &#039;) or an opaque rgb/rgba.
  const HEX = /(?<![&\w])#[0-9a-fA-F]{3,8}\b/g;
  const RGBA = /\brgba?\(\s*\d[^)]*\)/g;
  const isHue = (v) => {
    const m = v.match(/rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/);
    return !m || Number(m[1]) > 0; // skip fully-transparent (alpha 0) — carries no hue
  };
  const scan = (src, where, sink) => {
    for (const line of src.split("\n")) {
      if (where && !where.test(line)) continue;
      for (const m of [...line.matchAll(HEX), ...line.matchAll(RGBA)]) {
        if (isHue(m[0])) sink.push(`${m[0]}  ::  ${line.trim().slice(0, 80)}`);
      }
    }
  };
  const violations = [];
  // Logic modules carry no presentation — any color literal belongs in a CSS token.
  for (const { name, src } of modules) {
    const sink = [];
    scan(src, null, sink);
    violations.push(...sink.map((v) => `${name}: ${v}`));
  }
  // index.html inline scripts: only flag color-context lines (canvas/share-art
  // generation may legitimately compute colors); the table/injection split that
  // hid the stage tones is covered by the module scan above.
  const COLOR_CTX = /\.style\.(background|backgroundColor|color|borderColor|fill|stroke|boxShadow)\b|setProperty\(\s*["'`]--[\w-]*(color|bg|fill|stroke|tone|glow|band)/i;
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join("\n");
  scan(scripts, COLOR_CTX, violations);
  if (violations.length) {
    throw new Error(
      `${label}: ${violations.length} JS-injected hardcoded color(s) — assign var(--token) so they flip with the theme:\n  ${violations.slice(0, 15).join("\n  ")}`
    );
  }
}

function loadCore() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  new vm.Script(read("eyeflow-core.js"), { filename: "eyeflow-core.js" }).runInContext(sandbox);
  if (!sandbox.window.EyeFlowCore) {
    throw new Error("core export missing: window.EyeFlowCore");
  }
  return sandbox.window.EyeFlowCore;
}

function main() {
  const indexHtml = read("index.html");
  const mainJs = read("main.js");
  const preloadJs = read("preload.js");
  const companionHtml = read("companion.html");
  const designSystemCss = read("eyeflow-design-system.css");
  const metricsJs = read("eyeflow-metrics.js");
  const packageJson = JSON.parse(read("package.json"));
  const core = loadCore();
  const feedbackTemplate = indexHtml.slice(
    indexHtml.indexOf("function buildFeedbackTemplate"),
    indexHtml.indexOf("function renderFeedbackPreview")
  );
  const feedbackCopy = indexHtml.slice(
    indexHtml.indexOf("async function copyFeedbackTemplate"),
    indexHtml.indexOf("function isNaturalBreak")
  );

  assertMatches(
    indexHtml,
    /<script src="eyeflow-core\.js"><\/script>\s*<script src="eyeflow-recovery-data\.js"><\/script>\s*<script src="eyeflow-session-flow\.js"><\/script>\s*<script src="eyeflow-rest-flow\.js"><\/script>/,
    "core script loads before recovery, session, rest, and inline app code"
  );
  assertIncludes(indexHtml, "computeEyeLoadAnalysis({", "dashboard score wrapper uses core analysis");
  assertMatches(indexHtml, /<link rel="stylesheet" href="\.\/eyeflow-design-system\.css">\s*<style>/, "dashboard loads design system before local styles");
  assertIncludes(designSystemCss, "--ef-text-reading: 15.5px;", "design system defines eye-comfort reading text size");
  assertIncludes(designSystemCss, "--ef-line-reading: 1.62;", "design system defines eye-comfort reading line height");
  assertIncludes(designSystemCss, "--ef-radius-pill: 999px;", "design system defines shared pill radius");
  assertIncludes(designSystemCss, "--text-stack-tight: var(--ef-space-2);", "design system owns the compatibility text spacing aliases");
  assertIncludes(designSystemCss, "--text-stack-loose: var(--ef-space-6);", "design system owns loose text spacing");
  assertIncludes(indexHtml, "text-rendering: optimizeLegibility;", "dashboard enables comfortable text rendering");
  assertIncludes(indexHtml, "#rhythmView .settings-grid", "settings view uses a dedicated comfort layout");
  assertIncludes(indexHtml, ".settings-actions", "settings actions use a reusable alignment class");
  assertIncludes(indexHtml, "--page-frame-width: min(1420px, 100%);", "dashboard defines one shared centered page frame width");
  assertMatches(indexHtml, /\.topbar,\s*#todayView,\s*#rhythmView,\s*#profileView\s*\{[\s\S]*width:\s*min\(100%,\s*var\(--page-frame-width\)\);[\s\S]*justify-self:\s*center;/, "top-level pages share one centered page frame");
  assertMatches(indexHtml, /\.topbar h2\s*\{[\s\S]*font-size:\s*var\(--ef-text-title-lg\);[\s\S]*line-height:\s*var\(--ef-line-tight\);/, "top-level page titles use one tokenized scale");
  assertIncludes(indexHtml, "#rhythmView .settings-section {\n      min-width: 0;\n      gap: var(--ef-space-4);", "settings uses compact preference sections instead of card skeletons");
  assertIncludes(indexHtml, "border-color: var(--group-line);\n      background: var(--panel);", "settings primary cards share the tokenized crisp surface language");
  assertIncludes(indexHtml, "#rhythmView .settings-grid {\n      display: grid;\n      grid-template-columns: minmax(0, 1fr);", "settings page is a single preference stack");
  assertNotMatches(indexHtml, /#rhythmView\s+\.settings-card/, "settings page no longer depends on settings-card selectors");
  assertNotMatches(indexHtml, /#rhythmView\s+\.desktop-readiness/, "settings page no longer depends on desktop-readiness selectors");
  assertNotMatches(indexHtml, /class="[^"]*settings-card/, "settings page no longer renders settings-card skeletons");
  assertIncludes(indexHtml, "#rhythmView .settings-hero-section {\n      padding: var(--ef-space-6) var(--ef-space-7);\n      gap: var(--ef-space-4);", "settings current mode section stays compact");
  assertIncludes(indexHtml, "#rhythmView .settings-boundary-disclosure summary {\n      min-height: var(--ef-control-md);", "settings current mode disclosure uses compact row height");
  assertIncludes(indexHtml, "class=\"settings-mode-summary\"", "settings current mode renders as a quiet summary");
  assertIncludes(indexHtml, "class=\"settings-mode-pill ef-status-pill\"", "settings current mode value uses a compact status pill");
  assertIncludes(indexHtml, "调整提醒边界", "settings advanced reminder boundaries are folded behind a quiet disclosure");
  assertNotMatches(indexHtml, /<span class="settings-row-label[^"]*">当前模式<\/span>[\s\S]*id="currentIntensityValue"/, "settings current mode does not repeat the same label and value row");
  assertNotMatches(indexHtml, /L1 安静：只变 Mira 状态。/, "settings current mode copy avoids repeating the selected mode name");
  assertIncludes(indexHtml, 'id="currentIntensityValue">L1 安静 <span>最低提醒等级</span></strong>', "settings first screen explains the current mode level");
  assertIncludes(indexHtml, "function settingsModePillHtml", "settings mode pill keeps the level explanation when mode changes");
  assertIncludes(indexHtml, "L1 安静</button>", "settings boundary segmented labels stay compact");
  assertIncludes(indexHtml, "L4 强制爱</button>", "settings force segmented label stays compact");
  assertIncludes(indexHtml, "class=\"settings-segmented-control ef-segmented-control\"", "settings boundary renders as a design-system segmented control");
  assertIncludes(designSystemCss, ".ef-segmented-control {\n  min-height: var(--ef-control-md);", "settings boundary segmented control uses design-system control tokens");
  assertMatches(indexHtml, /#rhythmView \.force-confirm \{[\s\S]*?border-top:\s*1px solid var\(--group-line\);/, "force confirmation is a low-weight, theme-aware prompt row");
  assertIncludes(indexHtml, "background: transparent;", "force confirmation avoids warning-card background");
  assertIncludes(indexHtml, "这一轮到恢复断点后接管。预览会以窗口打开，正式开启后会进入全屏恢复。", "force confirmation sets preview/fullscreen expectations");
  assertIncludes(indexHtml, "<button class=\"ghost\" id=\"cancelForceBtn\"", "force confirmation keeps cancel as a low-weight ghost-tier button");
  assertIncludes(indexHtml, "class=\"settings-preference-rows\"", "settings lower controls are grouped as preference rows");
  assertMatches(indexHtml, /#rhythmView \.settings-preference-rows\s*\{[\s\S]*?border-bottom:\s*1px solid var\(--group-line\);/, "settings preference rows avoid card borders (tokenized hairline)");
  assertMatches(indexHtml, /<div class="settings-preference-rows">\s*<details class="settings-disclosure-row ef-disclosure-row panel settings-rules-row">[\s\S]*<summary>查看轻提醒规则<\/summary>[\s\S]*<details class="settings-disclosure-row ef-disclosure-row panel advanced-settings system-integration-settings">[\s\S]*<summary>更多设置<\/summary>[\s\S]*<details class="settings-disclosure-row ef-disclosure-row panel advanced-settings system-diagnostic-card">[\s\S]*<summary>反馈与诊断<\/summary>/, "settings lower disclosures put reminder rules before tools and diagnostics");
  assertMatches(indexHtml, /#rhythmView \.settings-preference-rows \.tag\[data-state\]\s*\{[\s\S]*min-height:\s*auto;[\s\S]*border:\s*0;[\s\S]*background:\s*transparent;/, "settings folded-row status values render as quiet inline text instead of large pills");
  assertMatches(indexHtml, /#rhythmView \.settings-check-list label,\s*#rhythmView \.ef-switch-label\s*\{[\s\S]*display:\s*flex;[\s\S]*align-items:\s*center;[\s\S]*justify-content:\s*space-between;[\s\S]*width:\s*100%;[\s\S]*min-height:\s*var\(--ef-hit-target\);/, "settings checkbox groups use stable full-width switch rows");
  assertMatches(indexHtml, /#rhythmView \.ef-switch\s*\{[\s\S]*--ef-switch-h:\s*calc\(var\(--ef-control-sm\) - var\(--ef-space-2\)\);[\s\S]*--ef-switch-w:\s*calc\(var\(--ef-control-sm\) \+ var\(--ef-space-6\)\);[\s\S]*width:\s*var\(--ef-switch-w\);[\s\S]*height:\s*var\(--ef-switch-h\);[\s\S]*appearance:\s*none;/, "settings checkbox groups use tokenized macOS-style switches");
  assertIncludes(indexHtml, "background: var(--sb-active-bg);\n      box-shadow: none;", "sidebar active navigation uses the single Mira accent");
  assertIncludes(indexHtml, "class=\"settings-disclosure-row ef-disclosure-row panel advanced-settings system-diagnostic-card\"", "settings diagnostics are folded below the primary blocks");
  assertIncludes(indexHtml, "id=\"feedbackPreview\" hidden=\"\"", "settings diagnostic preview stays hidden by default");
  assertIncludes(indexHtml, "background: var(--group-bg);\n      box-shadow: none;", "settings grouped surfaces do not float like dashboard cards");
  assertIncludes(indexHtml, "body:has(#todayView:not([hidden])) .companion", "today view lets Mira compact away from session controls");
  assertIncludes(indexHtml, "body:has(#todayView:not([hidden])) .companion {\n        top: var(--ef-space-10);", "today compact Mira avoids bottom session sliders");
  assertIncludes(indexHtml, "grid-template-columns: var(--state-mira-size) minmax(0, 1fr) minmax(calc(var(--ef-space-14) * 3.1), auto);", "today hero reserves a right-side action column");
  assertMatches(indexHtml, /<div class="state-copy">[\s\S]*<div class="today-flow" id="todayFlowCopy">[\s\S]*<\/div>\s*<\/div>\s*<div class="actions state-action-row">/, "today primary action sits outside the judgement column");
  assertIncludes(indexHtml, "body:has(#rhythmView:not([hidden])) .companion", "settings view lets Mira compact away from controls");
  assertMatches(indexHtml, /\.profile-summary-chips\s*\{[\s\S]*display:\s*none;/, "profile overview removes repeated summary chips from the main flow");
  assertMatches(indexHtml, /\.profile-overview-main\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\) minmax\(calc\(var\(--ef-space-14\) \* 4\.6\),\s*0\.34fr\);[\s\S]*align-items:\s*start;/, "profile overview uses one recommendation column and one compact parameter column, top-aligned as one bound card");
  assertMatches(indexHtml, /\.profile-insight-card\s*\{[\s\S]*padding:\s*var\(--ef-space-0\);[\s\S]*border:\s*0;[\s\S]*background:\s*transparent;/, "profile insight avoids nested card chrome");
  assertMatches(indexHtml, /\.profile-insight-strip\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\);[\s\S]*border:\s*0;[\s\S]*background:\s*transparent;/, "profile insight summary becomes a quiet vertical list");
  assertMatches(indexHtml, /\.profile-memory-grid\s*\{[\s\S]*display:\s*flex;[\s\S]*flex-wrap:\s*wrap;[\s\S]*border:\s*0;[\s\S]*border-top:\s*1px solid var\(--group-line-soft\);[\s\S]*background:\s*transparent;/, "profile rhythm memory no longer renders as a boxed table");
  assertMatches(indexHtml, /\.pet-toast::after\s*\{\s*display:\s*none;/, "Mira toast renders as a contained prompt without a speech-tail");
  assertIncludes(indexHtml, "dataset.anchor = \"mira-above\"", "Mira toast stays anchored near Mira instead of flying between corners");
  assertIncludes(indexHtml, "dataset.anchor = \"mira-below\"", "Mira toast can sit below compact top Mira");
  assertIncludes(indexHtml, "window.eyeflowDesktop.showMiraBubble(toastMessage)", "desktop Mira messages render in the companion window");
  assertIncludes(preloadJs, "showMiraBubble: (message) => ipcRenderer.invoke(\"companion:bubble\", message)", "preload exposes companion speech bubble command");
  assertIncludes(preloadJs, "onCompanionBubble", "preload exposes companion speech bubble listener");
  assertIncludes(preloadJs, "copyShareImage: (dataUrl) => ipcRenderer.invoke(\"share:copyImage\", dataUrl)", "preload exposes share-card image clipboard IPC");
  assertIncludes(mainJs, "companionSizes.bubble", "desktop companion has a transient speech-bubble window size");
  assertIncludes(mainJs, "ipcMain.handle(\"companion:bubble\"", "main process routes Mira speech bubbles to companion");
  assertIncludes(mainJs, "if (shouldExpand && companionBubbleBaseBounds)", "main process blocks companion panel while Mira bubble is visible");
  assertIncludes(mainJs, "if (companionExpanded) hideCompanionPanel();", "main process closes companion panel before showing Mira bubble");
  assertIncludes(companionHtml, "class=\"mira-bubble\"", "companion renders its own speech bubble beside Mira");
  assertMatches(companionHtml, /\.mira-bubble::after\s*\{\s*display:\s*none;/, "companion Mira bubble uses the same contained no-tail prompt style");
  assertIncludes(companionHtml, ".companion.speaking .mira-bubble", "companion speech bubble appears only while Mira speaks");
  assertIncludes(companionHtml, "let isMiraSpeaking = false;", "companion tracks Mira speech bubble visibility");
  assertIncludes(companionHtml, "if (nextExpanded && isMiraSpeaking)", "companion blocks status panel expansion while speaking");
  assertMatches(companionHtml, /const shouldFocusManualStart = !options\.restGuide && !options\.view && !options\.focus;[\s\S]*\{ view: "todayView", focus: "manualStart" \}[\s\S]*window\.eyeflowDesktop\.showDashboard\(dashboardOptions\);/, "companion open button returns to Today manual focus by default");
  assertMatches(companionHtml, /currentMood\s*===\s*"rest"[\s\S]*openDashboard\(\{\s*restGuide:\s*true\s*\}\);[\s\S]*return;/, "companion rest click still opens the rest guide");
  assertIncludes(indexHtml, ".readiness-grid {\n      display: grid;", "settings readiness uses grouped-row structure");
  assertIncludes(indexHtml, "class=\"ghost text-action settings-row-action ef-preference-row-action\" id=\"readinessRefreshBtn\" type=\"button\" hidden=\"\"", "settings notification row does not show a stray refresh action");
  assertIncludes(indexHtml, "#rhythmView .readiness-item .ghost", "settings readiness rows own their actions");
  assertMatches(indexHtml, /#rhythmView \.readiness-item\s*\{[\s\S]*grid-template-columns:\s*[\s\S]*minmax\(0,\s*1fr\)[\s\S]*minmax\(calc\(var\(--ef-space-14\) \* 2\.2\),\s*calc\(var\(--ef-space-14\) \* 2\.55\)\);/, "settings desktop readiness rows read as content plus one quiet action");
  assertMatches(indexHtml, /#rhythmView \.readiness-item \.settings-action-stack\s*\{[\s\S]*grid-row:\s*1 \/ span 3;[\s\S]*align-self:\s*center;/, "settings desktop readiness action aligns with the whole content block");
  assertMatches(indexHtml, /#rhythmView \.readiness-item p\s*\{[\s\S]*display:\s*block;/, "settings desktop readiness explanatory copy is visible in the content column");
  assertMatches(indexHtml, /#rhythmView \.settings-desktop-section \.settings-action-note\s*\{[\s\S]*display:\s*none;/, "settings desktop readiness action column avoids duplicated helper copy");
  assertMatches(indexHtml, /#rhythmView \.readiness-item \.settings-action-button\s*\{[\s\S]*min-height:\s*36px;[\s\S]*padding-inline:\s*var\(--ef-space-4\);/, "settings desktop readiness buttons use the unified 36px action height");
  assertMatches(indexHtml, /#rhythmView \.readiness-item \.settings-action-button\.primary-action\s*\{[\s\S]*background:\s*var\(--btn-ghost-bg\);[\s\S]*border-color:\s*var\(--btn-ghost-border\);/, "settings enhanced sensing action is a quiet outline button");
  assertMatches(indexHtml, /#rhythmView #readinessCompanionBtn\.primary-action\s*\{[\s\S]*color:\s*var\(--btn-tonal-fg\);[\s\S]*background:\s*var\(--btn-tonal-bg\);[\s\S]*border:\s*0;/, "settings hidden Mira restore action uses green tonal emphasis");
  assertMatches(indexHtml, /readinessCompanionBtn\.classList\.toggle\("primary-action",\s*!desktopMiraVisible\);[\s\S]*readinessCompanionBtn\.classList\.toggle\("secondary-action",\s*desktopMiraVisible\);/, "settings only makes the show-Mira restore action green");
  assertMatches(indexHtml, /#rhythmView \.readiness-item \.settings-action-button\.secondary-action\s*\{[\s\S]*background:\s*transparent;[\s\S]*border-color:\s*transparent;/, "settings exit Mira action is downgraded to a text-like control");
  assertIncludes(indexHtml, "#rhythmView .settings-desktop-section .readiness-status[data-state=\"action\"]", "settings readiness action badge stays low-weight");
  assertMatches(indexHtml, /#rhythmView \.readiness-item strong\s*\{[\s\S]*grid-column:\s*1;[\s\S]*grid-row:\s*2;/, "settings readiness status sits under the row label instead of forming a table column");
  assertIncludes(indexHtml, "#rhythmView .readiness-item strong::before {\n      content: none;", "settings readiness row status avoids duplicate dots");
  assertIncludes(indexHtml, "#rhythmView .readiness-item:nth-child(-n + 3)", "mobile readiness rows keep only horizontal dividers");
  // Read-only status labels share ONE radius — 8px. Pin it on the canonical pills
  // so the radius can't drift back to fully-round (--ef-radius-pill).
  assertMatches(indexHtml, /\.readiness-status\s*\{[\s\S]*border-radius:\s*var\(--ef-radius-md\);/, "readiness status pill uses the unified 8px status-label radius");
  assertMatches(indexHtml, /\.state-cue\s*\{[\s\S]*border-radius:\s*var\(--ef-radius-md\);/, "state-cue status pill uses the unified 8px status-label radius");
  assertNotMatches(indexHtml, /\.(readiness-status|state-cue)\s*\{[^}]*border-radius:\s*var\(--ef-radius-pill\);/, "status labels are not fully-round pills");
  assertIncludes(indexHtml, "font-weight: var(--ef-symbol-weight-base);", "details plus/minus symbols use design-system symbol weight");
  assertIncludes(indexHtml, "#profileView .profile-overview-main", "profile view uses a calmer scan layout");
  assertIncludes(indexHtml, "width: min(100%, var(--page-frame-width));", "dense views use the shared comfortable reading width");
  assertIncludes(indexHtml, ".profile-summary-chips", "profile summary chip markup stays available but hidden to avoid repeated signals");
  assertIncludes(indexHtml, "<h3>下一轮建议</h3>", "profile view opens with a direct next-round recommendation");
  assertNotMatches(indexHtml, /<span class="profile-trend-tag" id="profileTrendTag">/, "profile insight header removes the duplicated overall-state chip");
  assertIncludes(indexHtml, "profileInsightSentence", "profile view renders a short Mira insight from local state");
  assertIncludes(indexHtml, "Mira 记住的节奏", "profile view exposes rhythm memory as user-facing remembered rhythm");
  assertIncludes(indexHtml, "完成恢复", "profile rhythm memory shows completed recovery neutrally");
  assertIncludes(indexHtml, "稍后/未处理", "profile rhythm memory shows delayed or unhandled reminders neutrally");
  assertIncludes(indexHtml, "当前节奏来源", "profile rhythm memory shows whether Mira or the user owns the rhythm");
  assertMatches(indexHtml, /<section class="daily-summary daily-share-card" aria-label="今日分享卡">[\s\S]*id="dailySummaryTitle"[\s\S]*id="dailySummaryCopy"[\s\S]*id="tomorrowPlan"[\s\S]*id="copyShareBtn"/, "daily share card contains summary and action");
  assertNotMatches(indexHtml, /<section class="daily-summary" aria-label="今日总结"/, "today no longer renders a separate daily summary section");
  assertNotMatches(indexHtml, /<section class="panel profile-share-card" aria-label="今日分享卡"/, "daily share card is no longer a separate panel");
  assertIncludes(indexHtml, 'class="profile-score-inline" hidden=""', "profile review hides technical status signal from main flow");
  // 这几天 companion recap: warm observation on top, raw data folded.
  assertMatches(indexHtml, /profileView:\s*\["这几天"/, "recap page is titled 这几天, not a dashboard 复盘");
  assertMatches(indexHtml, /data-view-target="profileView">[\s\S]*?这几天\s*<\/button>/, "nav labels the recap 这几天");
  assertIncludes(indexHtml, 'id="profileObservation"', "这几天 opens with a warm Mira observation");
  assertIncludes(indexHtml, "function profileObservationText", "the observation is generated from local rest/symptom data");
  assertIncludes(indexHtml, "const PROFILE_OBSERVATION_MIN_REFRESH_MS = 6 * 60 * 60 * 1000;", "observation copy has a low-frequency refresh guard");
  assertIncludes(indexHtml, "function profileObservationCandidate", "observation is derived from named evidence types");
  assertIncludes(indexHtml, "function profileHardHoldPattern", "observation can detect hard-hold patterns from local reminder and recovery events");
  assertIncludes(indexHtml, 'insightType: "hard_hold"', "observation detects repeated snoozed or ignored reminders as hard-hold mode");
  assertIncludes(indexHtml, 'insightType: "evening_delay"', "observation detects evening delay patterns");
  assertIncludes(indexHtml, 'insightType: "recovery_still_tired"', "observation uses tired-after-rest feedback");
  assertIncludes(indexHtml, 'insightType: "effective_rest"', "observation preserves recovery lengths that actually helped");
  assertMatches(indexHtml, /function\s+profileObservationCandidate[\s\S]*?insightType = "high_signal"[\s\S]*?hardHoldPattern[\s\S]*?insightType = "skipped_rest"[\s\S]*?insightType = "manual_rhythm"/, "observation covers real evidence branches instead of copy variation");
  assertMatches(indexHtml, /function\s+profileObservationText[\s\S]*?state\.profileObservation = candidate;[\s\S]*?persist\(\);/, "observation is persisted locally after evidence changes");
  assertNotMatches(indexHtml, /function\s+profileObservationText[\s\S]*?Math\.random\(\)/, "observation does not randomly change on every render");
  assertIncludes(indexHtml, "展开看这几天的明细", "all quantitative views are tucked into one gentle fold");
  assertIncludes(indexHtml, 'class="panel profile-detail-fold"', "the fold is a single disclosure, not scattered cards");
  assertMatches(indexHtml, /<div class="profile-window-stats">[\s\S]*<span class="profile-window-stat-label">屏幕活跃<\/span>[\s\S]*<span class="profile-window-stat-label">护眼恢复<\/span>[\s\S]*<\/div>/, "profile window top summary keeps only the two user-value metrics");
  assertNotMatches(indexHtml, /<span class="profile-window-stat-label">(?:节奏|记录)<\/span>/, "profile window does not expose rhythm or record-count cards as top metrics");
  assertMatches(indexHtml, /#profileView \.profile-detail-fold-body > \.profile-rhythm-memory,[\s\S]*?background:\s*transparent;/, "folded sections render flat, not as cards-in-cards");
  assertNotMatches(indexHtml, /接住率/, "no pass-rate (接住率) grade anywhere in 这几天");
  assertNotMatches(indexHtml, /达标率/, "no 达标率 quota framing anywhere");
  assertNotMatches(indexHtml, /<span>波动<\/span>/, "KPI-flavored 波动 label is replaced with neutral wording");
  assertIncludes(indexHtml, "<span>起伏</span>", "trend range uses neutral 起伏 wording");
  assertMatches(indexHtml, /weeklyRecoveryHandled\.textContent[\s\S]*?大多接住/, "reminder handling reads qualitatively (大多接住), not as a X/Y pass rate");
  assertMatches(indexHtml, /function\s+currentShareRhythmLabel\(\)[\s\S]*els\.tomorrowPlan\?\.textContent/, "daily share image uses the merged card recommendation as its rhythm");
  assertIncludes(indexHtml, '<script src="eyeflow-metrics.js"></script>', "dashboard loads the single metrics module");
  assertIncludes(indexHtml, "window.EyeFlowMetrics", "dashboard reads day/period metrics from the single metrics module");
  assertIncludes(indexHtml, "function currentDayFocusSeconds", "daily share focus is the current day's total work time");
  assertIncludes(metricsJs, "function recoverySecondsForDay", "daily share recovery uses duration instead of raw rest counts");
  assertMatches(metricsJs, /function\s+recoverySecondsForShareEvent\([\s\S]*event\.mode === "system-detected"\) return 0;/, "system-detected natural away does not inflate eye-care recovery duration");
  assertIncludes(metricsJs, "function naturalAwaySecondsForDay", "natural away is tracked separately from eye-care recovery");
  assertIncludes(indexHtml, "自然离屏", "auto away is explained as natural away, not eye-care recovery");
  assertIncludes(indexHtml, "<span>护眼恢复</span>", "daily share card labels recovery as eye care instead of rest counts");
  assertNotMatches(indexHtml, /card\.breaks|今日休息次数|<span>休息<\/span><strong id="shareCardBreaks"/, "daily share card does not expose rest as a count");
  assertIncludes(indexHtml, "eyeflow.app", "profile share card includes restrained domain branding");
  assertMatches(indexHtml, /#todayView \.share-art-mark,[\s\S]*#profileView \.share-art-mark\s*\{[\s\S]*width:\s*calc\(var\(--ef-control-lg\) \+ var\(--ef-space-1\)\);[\s\S]*background:\s*url\("\.\/assets\/icon\.svg"\) center \/ contain no-repeat;/, "daily share card uses the source app icon asset");
  assertIncludes(indexHtml, '<button class="ghost" id="copyShareBtn" type="button">带走</button>', "daily share card uses a compact copy action");
  assertIncludes(indexHtml, 'id="sharePreviewOverlay"', "daily share action opens a full-card preview overlay");
  assertIncludes(indexHtml, 'id="copyShareConfirmBtn"', "daily share preview has a separate copy confirmation");
  assertIncludes(indexHtml, 'els.copyShareBtn?.addEventListener("click", openDailySharePreview);', "daily share compact action does not copy before preview");
  assertIncludes(indexHtml, 'els.copyShareConfirmBtn?.addEventListener("click", copyDailyShareCard);', "daily share full preview performs the actual copy");
  assertNotMatches(indexHtml, /带走这一句/, "profile share card no longer frames sharing as copying one sentence");
  assertNotMatches(indexHtml, /复制分享文案/, "profile share card avoids internal copywriting language");
  assertIncludes(indexHtml, '<p id="shareCardNote" hidden="">本地复制，不上传数据。</p>', "profile share card keeps privacy copy hidden until feedback");
  assertIncludes(indexHtml, "卡片已复制。", "profile share card confirms image-card copying");
  assertIncludes(indexHtml, "MIRA_DAILY_SHARE_LINES", "profile share card uses a local line library");
  assertArrayLiteralMinLength(indexHtml, "MIRA_DAILY_SHARE_LINES", 30, "profile share card keeps a month-sized daily line library");
  // 5-role type scale: every 复盘 text element resolves to one of five roles.
  assertIncludes(designSystemCss, "--ef-role-display-size: 28px;", "type scale defines the Display role token");
  assertIncludes(designSystemCss, "--ef-role-title-size: 17px;", "type scale defines the Title role token");
  assertIncludes(designSystemCss, "--ef-role-stat-size: 20px;", "type scale defines the Stat role token");
  assertIncludes(designSystemCss, "--ef-role-label-size: 12px;", "type scale defines the Label role token");
  // All card/section titles share ONE Title role (overview, chart, archive, history, weekly).
  assertMatches(indexHtml, /#profileView \.profile-overview-head h3,[\s\S]*?#profileView \.weekly-market-head h4,[\s\S]*?\{[\s\S]*?font-size:\s*var\(--ef-role-title-size\);/, "all 复盘 card titles share one Title role (below the Display page title)");
  // All numeric/stat values share ONE Stat role (insight, rows, memory, mini-stat, share, evidence).
  assertMatches(indexHtml, /#profileView \.profile-insight-title,[\s\S]*?#profileView \.profile-evidence strong,[\s\S]*?\{[\s\S]*?font-size:\s*var\(--ef-role-stat-size\);/, "all 复盘 stat values share one Stat role");
  // Secondary text derives from primary ink at 60%, not a separate gray.
  // (Token now lives in the shared design system, not inline in index.html.)
  assertIncludes(designSystemCss, "--ef-text-secondary: color-mix(in srgb, var(--ink) 60%, transparent);", "secondary text is primary ink at 60% (theme-tracking)");

  // ── Shared color system is the single source (moved out of index.html inline) ──
  // The surface/button/status tokens now live in eyeflow-design-system.css so every
  // window (index, companion, break-lock) shares one source. Assert they are defined
  // there (light + dark) and NOT redefined inline in index.html.
  ["--panel", "--wash", "--sb-bg", "--mira", "--mira-soft", "--btn-primary-bg",
   "--btn-tonal-bg", "--btn-ghost-fg", "--status-pill-bg", "--mode-pill-bg",
   "--group-shadow", "--line"].forEach((t) => {
    const esc = t.replace(/-/g, "\\-");
    assertMatches(designSystemCss, new RegExp("\\n\\s*" + esc + "\\s*:"), `shared token ${t} is defined in the design system (single source)`);
    assertNotMatches(indexHtml, new RegExp("\\n\\s*" + esc + "\\s*:\\s*(#|rgba|color-mix|var\\()"), `${t} is no longer redefined inline in index.html`);
  });
  assertMatches(designSystemCss, /:root\[data-theme="dark"\]\s*\{[\s\S]*?--panel:\s*#212325;/, "design system carries the dark-theme surface variants");
  // The bare dark token-BLOCK opener is gone from index.html (component dark
  // overrides like `:root[data-theme="dark"] .foo {` legitimately remain inline).
  assertNotMatches(indexHtml, /:root\[data-theme="dark"\]\s*\{/, "index.html no longer owns the dark-theme token block");
  assertNotMatches(indexHtml, /color-scheme:\s*dark;/, "the dark token block (color-scheme) moved out of index.html");
  // Reading-width constraints on the judgement copy are preserved.
  assertMatches(indexHtml, /#profileView \.profile-overview > \.profile-overview-head p\s*\{[\s\S]*max-width:\s*46ch;/, "profile judgement subtitle stays bounded");
  assertMatches(indexHtml, /#profileView \.profile-insight-text\s*\{[\s\S]*max-width:\s*58ch;/, "profile judgement body stays bounded");
  assertMatches(indexHtml, /\.profile-insight-row p\s*\{[\s\S]*display:\s*none;/, "profile insight summary rows avoid repeated explanatory copy");
  assertMatches(indexHtml, /function\s+drawShareBrandMark\([\s\S]*iconSize = size \* 0\.84;[\s\S]*iconGradient\.addColorStop\(0,\s*"#EAFFF6"\);[\s\S]*iconGradient\.addColorStop\(0\.58,\s*"#BDEAFF"\);[\s\S]*iconGradient\.addColorStop\(1,\s*"#F3EEC7"\);[\s\S]*"#6FE7C3"/, "profile share image draws the real app icon mark");
  assertMatches(indexHtml, /function\s+drawDailyShareCardCanvas\([\s\S]*canvas\.width = 1200;[\s\S]*canvas\.height = 720;[\s\S]*#f5f3ee[\s\S]*eyeflow\.app/, "profile share image draws a textured card artifact");
  assertMatches(indexHtml, /window\.eyeflowDesktop\?\.copyShareImage[\s\S]*generateDailyShareImageDataUrl\(\)/, "profile share action copies the generated image card first");
  assertMatches(indexHtml, /function\s+buildDailyShareText\(\)[\s\S]*今日专注[\s\S]*护眼恢复[\s\S]*节奏[\s\S]*Mira 今日小句/, "profile share fallback text includes focus, recovery duration, rhythm, and Mira line");
  assertIncludes(indexHtml, "function recordedDurationLabel", "profile duration fields distinguish missing timing from zero minutes");
  assertIncludes(metricsJs, "function recordedSecondsForDay", "profile duration uses the strongest available local timing signal");
  assertIncludes(indexHtml, "autoElapsedSeconds", "profile preserves accumulated automatic local timing across the day");
  assertMatches(indexHtml, /autoElapsedSeconds\s*\+=\s*deltaSeconds;/, "automatic local timing accumulates instead of only keeping the latest active streak");
  assertMatches(indexHtml, /recordedSecondsForDay\(day\)[\s\S]*recordedDurationLabel\(recordedSecondsForDay\(day\)\)/, "profile history renders timing from daily recorded seconds");
  assertIncludes(indexHtml, '<div class="profile-evidence"><span>计时</span><strong id="profileFocusTime">未记录</strong></div>', "profile advanced timing evidence does not claim zero screen time");
  assertIncludes(indexHtml, '<div class="history-cell"><span>计时</span><strong>${focusLabel}</strong></div>', "profile history labels timing as local timer data");
  assertNotMatches(indexHtml, /<span>盯屏<\/span><strong>\$\{focusMinutes\}m<\/strong>|<span>盯屏<\/span>/, "profile history no longer presents missing local timer data as screen time");
  assertIncludes(indexHtml, "profileNextAction", "profile view collapses next steps to one Mira recommendation");
  assertMatches(indexHtml, /function\s+renderProfile[\s\S]*rhythmSuggestion\(load\)[\s\S]*rhythmMemorySummary\(\)[\s\S]*profileInsightSentence[\s\S]*profileMemoryAccepted[\s\S]*profileMemorySkipped/, "profile insight is driven by load, symptoms, rhythmMemory, and local rhythm rules");
  assertIncludes(indexHtml, "Mira 把这几天整理成一个可执行的节奏。", "profile insight subtitle explains the job in plain language");
  assertIncludes(indexHtml, "<span>主要感受</span>", "profile review uses a user-facing signal label");
  assertIncludes(indexHtml, "<span>提醒时间</span>", "profile review labels the reminder timing directly");
  assertIncludes(indexHtml, "<span>休息时间</span>", "profile review labels the rest timing directly");
  assertMatches(indexHtml, /function\s+profilePlanTitle[\s\S]*return "保持轻提醒节奏";/, "profile plan title renders one qualitative next action");
  assertNotMatches(indexHtml, /function\s+profilePlanTitle\([^)]*\)\s*\{(?:(?!function)[\s\S])*?suggestion\.focus/, "profile plan title leaves the exact 分钟/秒 to the spec column");
  assertMatches(indexHtml, /function\s+profileInsightSentence[\s\S]*感受偏\$\{signalName\}[\s\S]*按轻提醒的节奏走/, "profile insight speaks Mira's qualitative judgement");
  assertNotMatches(indexHtml, /function\s+profileInsightSentence\([^)]*\)\s*\{(?:(?!function)[\s\S])*?分钟工作/, "profile insight no longer restates 分钟工作/秒休息 — those live only in the right-hand spec");
  assertIncludes(indexHtml, "profileRecommendationSource", "profile view keeps recommendation source visible as local rules");
  assertIncludes(indexHtml, "#profileView details.panel.profile-visual-panel,\n    #profileView details.panel.profile-archive-disclosure {\n      padding: var(--ef-space-0);", "profile collapsed details do not inherit large panel padding");
  assertIncludes(indexHtml, "#profileView details.panel.profile-visual-panel:not([open]),\n    #profileView details.panel.profile-archive-disclosure:not([open]) {\n      max-height: none;", "profile collapsed details are not clipped into empty cards");
  assertNotMatches(indexHtml, /默认收起/, "profile archive does not expose implementation state copy");
  assertIncludes(indexHtml, "#startBtnText", "focus start button text is isolated for no-wrap layout");
  assertNotMatches(indexHtml, /class="metrics health-signals"/, "today no longer renders a separate round metrics strip");
  assertNotMatches(indexHtml, /id="eyeLoad"/, "today no longer repeats focused time below the timer bar");
  assertNotMatches(indexHtml, /id="focusMinutes"/, "today no longer repeats the target below the timer bar");
  assertNotMatches(indexHtml, /id="breakCount"/, "today keeps recovery count for the daily share summary");
  assertNotMatches(indexHtml, /id="logCount"/, "today keeps log count for the daily share summary");
  assertMatches(indexHtml, /function\s+sessionHintText\(\)[\s\S]*remainingLabel[\s\S]*剩余 \$\{remainingMinutes\} 分钟[\s\S]*目标 \$\{focusTargetMinutes\} 分钟/, "today timer bar carries remaining and target time");
  assertNotMatches(indexHtml, />50m</, "today metrics do not mix English minute shorthand with Chinese units");
  assertMatches(indexHtml, /\.session-settings summary\s*\{[\s\S]*color:\s*var\(--ink\);[\s\S]*font-size:\s*var\(--text-base\);[\s\S]*font-weight:\s*var\(--ef-symbol-weight-base\);/, "rhythm tuning summary matches the primary quick-log hierarchy");
  assertMatches(indexHtml, /details\.quick-log-panel summary\s*\{[\s\S]*grid-template-columns:\s*var\(--ef-control-sm\) minmax\(0,\s*1fr\);/, "quick log summary keeps plus control inside the layout");
  assertMatches(indexHtml, /details\.quick-log-panel summary::after\s*\{\s*display:\s*none;\s*\}/, "quick log summary suppresses the generic details plus");
  assertMatches(indexHtml, /details\.panel\.quick-log-panel summary::after\s*\{\s*content:\s*none;\s*display:\s*none;\s*\}/, "quick log summary keeps the generic details plus suppressed after shared overrides");
  assertIncludes(indexHtml, "随时都可以记一下。", "quick log prompt invites anytime logging");
  assertNotMatches(indexHtml, /眼睛变化时再展开。/, "quick log prompt removes eye-change gate copy");
  assertIncludes(mainJs, "DASHBOARD_DEFAULT_SIZE = { width: 1280, height: 820 }", "desktop dashboard opens at a Codex-like default size");
  assertMatches(mainJs, /function\s+defaultDashboardBounds\(\)\s*\{[\s\S]*return visibleDashboardBounds\(\{ \.\.\.DASHBOARD_DEFAULT_SIZE \}\);[\s\S]*\}/, "desktop dashboard default bounds always use the target centered size");
  assertMatches(mainJs, /function\s+dashboardWindowOptions\(\)\s*\{[\s\S]*return defaultDashboardBounds\(\);[\s\S]*\}/, "desktop dashboard creation ignores stale saved window bounds");
  assertMatches(mainJs, /function\s+keepDashboardVisible\(\)[\s\S]*dashboardWindow\.setBounds\(defaultDashboardBounds\(\), false\);/, "desktop dashboard reopens centered at the default size");
  assertIncludes(mainJs, "defaultX = area.x + Math.round((area.width - width) / 2)", "desktop dashboard default bounds are centered");
  assertIncludes(indexHtml, 'const SYMPTOM_KEYS = ["dryness", "strain", "blur", "light"];', "dashboard defines one canonical symptom key order");
  assertMatches(indexHtml, /function\s+currentSymptoms\(\)\s*\{[\s\S]*return normalizeSymptoms\(state\.symptoms\);[\s\S]*\}/, "dashboard reads current symptoms from state, not scattered DOM reads");
  assertMatches(indexHtml, /function\s+setCurrentSymptoms\(symptoms = \{\}, options = \{\}\)[\s\S]*state\.symptoms = normalizeSymptoms/, "dashboard writes symptoms through one normalized setter");
  assertMatches(indexHtml, /function\s+render\(\)[\s\S]*const analysis = computeEyeAnalysis\(\);[\s\S]*state\.lastAnalysis = scoreAnalysisSnapshot\(analysis\);/, "render refreshes the current analysis snapshot");
  assertMatches(indexHtml, /function\s+appendDataEvent\(type, payload = \{\}\)[\s\S]*const analysis = scoreAnalysisSnapshot[\s\S]*\.\.\.payload,[\s\S]*computedLoad:[\s\S]*symptoms:[\s\S]*confidence:[\s\S]*analysis[\s\S]*\};/, "events normalize load, symptoms, confidence, and analysis after payload input");
  assertIncludes(indexHtml, "PERSONAL_RHYTHM_WINDOW_DAYS = 7", "personal rhythm engine uses a seven-day local window");
  assertIncludes(indexHtml, "rhythmMemory: {", "personal rhythm engine has an explicit local memory structure");
  assertIncludes(indexHtml, "function appendRhythmMemory", "personal rhythm engine writes sanitized local rhythm memory");
  assertIncludes(indexHtml, "function rhythmLearningWindow", "personal rhythm engine summarizes local events");
  assertIncludes(indexHtml, "function recentRhythmEvents", "personal rhythm engine reads recent local events");
  assertIncludes(indexHtml, "manualHoldRounds", "personal rhythm engine respects manual rhythm changes for several rounds");
  assertMatches(indexHtml, /function\s+rhythmEventContext[\s\S]*focusTargetMinutes[\s\S]*breakTargetSeconds[\s\S]*reminderMethod[\s\S]*roundState/, "local round events capture state, reminder method, and rhythm targets");
  assertMatches(indexHtml, /appendRhythmMemory\("round_started"[\s\S]*startedAt[\s\S]*currentLoad[\s\S]*interruptionBoundary/, "rhythm memory records round starts without content");
  assertMatches(indexHtml, /appendRhythmMemory\("round_ended"[\s\S]*durationSeconds[\s\S]*acceptedRest[\s\S]*skippedRest/, "rhythm memory records round duration and rest response");
  assertMatches(indexHtml, /appendDataEvent\("reminder_event"[\s\S]*acceptedRest[\s\S]*\.\.\.rhythmEventContext/, "reminder events record whether rest was accepted");
  assertMatches(indexHtml, /appendDataEvent\("recovery_event"[\s\S]*postRestFeedback[\s\S]*acceptedRest[\s\S]*\.\.\.rhythmEventContext/, "recovery events record feedback after rest");
  assertMatches(indexHtml, /function\s+rhythmSuggestion[\s\S]*rhythmLearningWindow\(\)[\s\S]*manualHoldRounds[\s\S]*recommendationSource:\s*"rule-local"/, "rhythm suggestions use local rules and manual-hold protection");
  assertMatches(indexHtml, /function\s+renderTodayPlan[\s\S]*rhythmSuggestion\(load\)[\s\S]*suggestion\.reason/, "today page explains Mira rhythm in one sentence");
  assertMatches(indexHtml, /<p class="settings-section-note" id="rhythmReasonCopy" hidden="">/, "settings page keeps Mira rhythm reason out of the first screen");
  assertIncludes(indexHtml, "采用 Mira 建议", "settings page can apply Mira rhythm suggestions");
  assertIncludes(indexHtml, 'id="openTodayRhythmBtn" type="button">调整这一轮节奏</button>', "settings rhythm row gives users a natural edit path");
  assertMatches(indexHtml, /function\s+openTodayRhythmSettings\(\)[\s\S]*switchView\("todayView"\);[\s\S]*sessionSettings\.open = true;/, "settings rhythm edit path opens today's rhythm controls");
  assertIncludes(indexHtml, "recommendationSource：", "feedback template exports rhythm recommendation source");
  assertIncludes(indexHtml, "lastRecommendationReason：", "feedback template exports rhythm recommendation reason");
  assertIncludes(indexHtml, "event.computedLoad ?? event.loadAtEnd ?? event.loadAfter ?? event.loadAtShown ?? \"\"", "CSV export preserves zero load values");
  assertIncludes(indexHtml, '"postRestFeedback"', "CSV export includes recovery feedback");
  assertIncludes(indexHtml, '"reminderMethod"', "CSV export includes reminder method");
  assertMatches(feedbackTemplate, /const analysis = computeEyeAnalysis\(\);\s*const load = analysis\.load;[\s\S]*analysis\.modelVersion/, "feedback template builds from the unified analysis snapshot");
  assertMatches(feedbackCopy, /const result = await window\.eyeflowDesktop\.copyFeedbackText\(text\);[\s\S]*result\?\.ok === false/, "feedback copy checks desktop clipboard result");
  assertIncludes(indexHtml, "COPIED_FEEDBACK_PREVIEW_MS = 2 * 60 * 1000", "feedback copy keeps the full template visible after copying");
  assertIncludes(indexHtml, "空白问题处就是你要回复的位置", "feedback copy tells users where to write replies");
  assertMatches(mainJs, /ipcMain\.handle\("feedback:copy"[\s\S]*clipboard\.writeText\(clipped\);[\s\S]*clipboard\.readText\(\);[\s\S]*verified/, "desktop feedback copy verifies clipboard readback");
  assertMatches(mainJs, /ipcMain\.handle\("share:copyImage"[\s\S]*nativeImage\.createFromDataURL\(source\)[\s\S]*clipboard\.writeImage\(image\)[\s\S]*clipboard\.readImage\(\);/, "desktop share card copies a verified PNG image");
  assertNotMatches(indexHtml, /function\s+estimateInitialLoad\(/, "initial load is extracted from index.html");
  assertNotMatches(indexHtml, /function\s+initialRhythmForLoad\(/, "initial rhythm is extracted from index.html");
  assertNotMatches(indexHtml, /function\s+classifyLoad\(/, "load classifier is extracted from index.html");
  if (!packageJson.build?.files?.includes("eyeflow-core.js")) {
    throw new Error("package build files: missing eyeflow-core.js");
  }
  if (!packageJson.build?.files?.includes("eyeflow-design-system.css")) {
    throw new Error("package build files: missing eyeflow-design-system.css");
  }

  assertEqual(core.estimateInitialLoad({ dryness: 2, strain: 3, blur: 1, light: 1 }), 27, "initial assessment score");
  assertEqual(
    core.computeEyeLoadScore({
      symptoms: { dryness: 2, strain: 3, blur: 1, light: 1 },
      elapsedSeconds: 20 * 60,
      breaks: 1
    }),
    50,
    "running eye-load score"
  );
  assertEqual(
    core.computeEyeLoadScore({
      symptoms: { dryness: 9, strain: 8, blur: 6, light: 5 },
      elapsedSeconds: 2000,
      breaks: 0
    }),
    100,
    "eye-load score clamps at 100"
  );
  assertEqual(
    core.computeEyeLoadScore({
      symptoms: { dryness: 1, strain: 0, blur: 0, light: 0 },
      elapsedSeconds: 0,
      breaks: 12
    }),
    14,
    "recovery offset does not erase current self-report baseline"
  );
  const analysis = core.computeEyeLoadAnalysis({
    symptoms: { dryness: 2, strain: 3, blur: 1, light: 1 },
    elapsedSeconds: 20 * 60,
    breaks: 1,
    sampleCount: 4,
    historyDays: 2,
    baselineLoads: [30, 32, 34, 36, 38, 40, 42]
  });
  assertEqual(analysis.load, 50, "analysis keeps score compatible");
  assertEqual(analysis.modelVersion, "2.0.0-local", "analysis exposes model version");
  assertEqual(analysis.confidenceLabel, "中", "analysis exposes confidence label");
  assertIncludes(analysis.missingSignals.join(","), "blinkCompleteness", "analysis marks missing hardware signals");
  assertEqual(typeof analysis.contributors.symptom, "number", "analysis exposes symptom contributor");
  assertEqual(analysis.symptoms.dryness, 2, "analysis carries normalized symptom snapshot");
  assertEqual(analysis.baseline.average, 36, "analysis exposes personal baseline average");
  assertEqual(analysis.baseline.status, "above", "analysis labels load relative to baseline");

  assertEqual(core.classifyLoad(16), "舒适区", "comfort band");
  assertEqual(core.classifyLoad(60), "状态中段", "medium band");
  assertEqual(core.classifyLoad(80), "状态偏高", "high band");

  assertEqual(core.initialRhythmForLoad(30).focus, 50, "comfort focus minutes");
  assertEqual(core.initialRhythmForLoad(30).rest, 120, "comfort rest seconds");
  assertEqual(core.initialRhythmForLoad(60).focus, 20, "medium focus minutes");
  assertEqual(core.initialRhythmForLoad(60).rest, 150, "medium rest seconds");
  assertEqual(core.initialRhythmForLoad(80).focus, 15, "high focus minutes");
  assertEqual(core.initialRhythmForLoad(80).rest, 180, "high rest seconds");

  assertEqual(core.intensityLabel("quiet"), "L1 安静", "quiet intensity label");
  assertEqual(core.intensityLabel("force"), "L4 强制爱", "force intensity label");
  assertIncludes(core.modeActionCopy("clear"), "明确介入", "clear mode action copy");

  assertNoHardcodedNeutralSurfaces(indexHtml, "themed views use theme tokens, not hardcoded neutral surfaces");

  // Chart plot-area backgrounds are recessed wells, not light veils. They use the
  // shared --chart-plot-bg token (derived from --wash-2, always darker than the
  // --panel card in both themes). Never a hardcoded rgba(255,255,255,…) veil.
  assertMatches(designSystemCss, /--chart-plot-bg:\s*var\(--wash-2\);/, "chart plot-area well is a shared token derived from --wash-2 (recessed in both themes)");
  ["profile-chart-shell", "weekly-state-grid", "weekly-candle-grid"].forEach((cls) => {
    // No rule for this plot surface may use a white veil...
    (indexHtml.match(new RegExp(`\\.${cls}\\s*\\{[^}]*\\}`, "g")) || []).forEach((rule) => {
      assertNotMatches(rule, /rgba\(255,\s*255,\s*255/, `.${cls} plot background is not a white veil`);
    });
    // ...and the recessed well token is what paints it.
    assertMatches(indexHtml, new RegExp(`\\.${cls}\\s*\\{[^}]*var\\(--chart-plot-bg\\)`), `.${cls} plot background uses the recessed --chart-plot-bg well`);
  });
  assertCriticalTokensInSync(indexHtml, read("eyeflow-design-system.css"), "inlined critical tokens match the design-system :root block");
  assertNoJsInjectedHardcodedColors(
    indexHtml,
    ["eyeflow-session-flow.js", "eyeflow-rest-flow.js", "eyeflow-core.js", "eyeflow-recovery-data.js", "eyeflow-ui-utils.js"]
      .map((name) => ({ name, src: read(name) })),
    "JS does not inject hardcoded colors that bypass the theme"
  );

  // F1/F4 legibility: the suggested rhythm must show its relation to 当前 + its
  // source, so a suggested number never reads as a contradiction with 本轮节奏.
  assertMatches(indexHtml, /function rhythmFocusRelation\(suggestion\)[\s\S]*?比现在 \+\$\{delta\}/, "rhythm suggestion exposes its delta vs current focus");
  assertMatches(indexHtml, /function rhythmSourceShortLabel\(suggestion\)[\s\S]*?rule-responsive[\s\S]*?近 7 天/, "rhythm suggestion maps its source to a plain-language label");
  assertMatches(indexHtml, /els\.profilePrimaryCopy\.textContent = hasProfileEvidence\s*\?\s*rhythmRelationLine\(suggestion, nextAction\)/, "下一轮建议 card shows the current→suggested relation line");
  assertMatches(indexHtml, /els\.suggestFocusTarget\.textContent = [\s\S]{0,80}?suggestFocusDelta[\s\S]*?\$\{suggestFocusDelta/, "恢复节奏 card shows the delta vs current focus");
  assertMatches(indexHtml, /Mira 建议下一轮 \$\{suggestion\.focus\} 分（\$\{rhythmFocusRelation\(suggestion\)\}/, "今天计划文案 states the relation + source");

  console.log("[smoke:core] PASSED. EyeFlow core scoring and first-round rhythm are stable.");
}

try {
  main();
} catch (error) {
  console.error("[smoke:core] FAILED.", error.message);
  process.exitCode = 1;
}
