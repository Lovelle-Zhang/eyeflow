#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const asar = require("@electron/asar");

const appPath = process.env.EYEFLOW_INSTALLED_APP || "/Applications/EyeFlow.app";
const asarPath = path.join(appPath, "Contents", "Resources", "app.asar");

function read(relativePath) {
  return asar.extractFile(asarPath, relativePath).toString("utf8");
}

function readBuffer(relativePath) {
  return asar.extractFile(asarPath, relativePath);
}

function assertIncludes(source, expected, label) {
  if (!source.includes(expected)) {
    throw new Error(`${label}: missing "${expected}"`);
  }
}

function assertNotIncludes(source, unexpected, label) {
  if (source.includes(unexpected)) {
    throw new Error(`${label}: found "${unexpected}"`);
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

// Dark-mode guardrail (mirrors smoke-core): themed views must use theme tokens,
// not hardcoded neutral surface/border/text colors. Allows the intentional set.
function assertNoHardcodedNeutralSurfaces(html, label) {
  const styles = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n");
  const THEMED = /#profileView|#rhythmView|\.metrics |\.metric-pair|\.state-cue|\.assessment-reminder|\.feedback-template|\.recovery-mode|\.trend\b|\.icon-btn|\.trust-item|\.reason\b|\.intervention|\.archive|\.history|\.data-console|\.profile-|\.readiness/;
  const INTENTIONAL = /share-art|candle|weekly-(?:state|candle)|\bwick\b|kline|onboarding|break-|companion|\.pet|mira-|stage-|pending-reminder|recovery-feedback|data-console-pre|today-flow|session-start-hint|\.insight|symptom|note-box|force-/;
  const NEUTRAL = [
    /border(?:-(?:top|bottom|left|right|color))?\s*:\s*[^;]*?rgba\((?:24,\s*32,\s*31|16,\s*27,\s*24)[^)]*\)/,
    /background(?:-color)?\s*:\s*(?:rgba\((?:251,\s*252,\s*246|245,\s*247,\s*246|242,\s*247,\s*241|248,\s*250,\s*243|246,\s*251,\s*248|247,\s*250,\s*246)[^)]*\)|#fbfdf9|#fbfcfa|#f6f8f4)/,
    /background(?:-color)?\s*:\s*rgba\(226,\s*235,\s*229[^)]*\)/,
    /color\s*:\s*rgba\(73,\s*88,\s*82[^)]*\)/,
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

function parseInlineScripts(relativePath) {
  const html = read(relativePath);
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
  scripts.forEach((match, index) => {
    new vm.Script(match[1], { filename: `${relativePath}#installed-script${index + 1}` });
  });
  return scripts.length;
}

function parseScriptFile(relativePath) {
  new vm.Script(read(relativePath), { filename: `${relativePath}#installed` });
}

function main() {
  if (!fs.existsSync(asarPath)) {
    throw new Error(`Missing installed app archive: ${asarPath}`);
  }

  const indexHtml = read("index.html");
  const designSystemCss = read("eyeflow-design-system.css");
  const coreJs = read("eyeflow-core.js");
  const recoveryDataJs = read("eyeflow-recovery-data.js");
  const sessionFlowJs = read("eyeflow-session-flow.js");
  const restFlowJs = read("eyeflow-rest-flow.js");
  const uiUtilsJs = read("eyeflow-ui-utils.js");
  const metricsJs = read("eyeflow-metrics.js");
  const companionHtml = read("companion.html");
  const breakLockHtml = read("break-lock.html");
  const mainJs = read("main.js");
  const preloadJs = read("preload.js");
  const feedbackTemplate = indexHtml.slice(
    indexHtml.indexOf("function buildFeedbackTemplate"),
    indexHtml.indexOf("function renderFeedbackPreview")
  );
  const feedbackCopy = indexHtml.slice(
    indexHtml.indexOf("async function copyFeedbackTemplate"),
    indexHtml.indexOf("function isNaturalBreak")
  );
  parseScriptFile("eyeflow-core.js");
  parseScriptFile("eyeflow-recovery-data.js");
  parseScriptFile("eyeflow-session-flow.js");
  parseScriptFile("eyeflow-rest-flow.js");
  parseScriptFile("eyeflow-ui-utils.js");

  const scriptCounts = [
    ["index.html", parseInlineScripts("index.html")],
    ["companion.html", parseInlineScripts("companion.html")],
    ["break-lock.html", parseInlineScripts("break-lock.html")]
  ];

  assertNotIncludes(indexHtml, '<span class="state-label">认识 Mira</span>', "installed onboarding removes the redundant intro label");
  assertIncludes(indexHtml, '<script src="eyeflow-core.js"></script>', "installed core script include");
  assertIncludes(indexHtml, '<link rel="stylesheet" href="./eyeflow-design-system.css">', "installed dashboard loads design system stylesheet");
  assertIncludes(indexHtml, '<script src="eyeflow-recovery-data.js"></script>', "installed recovery data script include");
  assertIncludes(indexHtml, '<script src="eyeflow-session-flow.js"></script>', "installed session flow script include");
  assertIncludes(indexHtml, '<script src="eyeflow-rest-flow.js"></script>', "installed rest flow script include");
  assertIncludes(indexHtml, '<script src="eyeflow-ui-utils.js"></script>', "installed UI utility script include");
  assertIncludes(coreJs, "window.EyeFlowCore", "installed core export");
  assertIncludes(coreJs, "computeEyeLoadScore", "installed core eye-load scorer");
  assertIncludes(coreJs, "baselineSummary", "installed core exposes baseline summary");
  // Shared surface tokens now live in the design system (single source for all windows).
  assertIncludes(designSystemCss, "--group-bg:", "installed app uses unified grouped surface tokens from the shared design system");
  assertIncludes(designSystemCss, "--panel:", "installed shared design system owns the warm-paper surface tokens");
  assertMatches(designSystemCss, /:root\[data-theme="dark"\]\s*\{[\s\S]*?--panel:\s*#212325;/, "installed shared design system carries the dark surface variants");
  assertIncludes(designSystemCss, "--group-shadow:", "installed app uses unified quiet shadow token from the shared design system");
  assertIncludes(designSystemCss, "--ef-text-reading: 15.5px;", "installed design system provides eye-comfort reading text size");
  assertIncludes(designSystemCss, "--ef-line-reading: 1.62;", "installed design system provides eye-comfort reading line height");
  assertIncludes(designSystemCss, "--ef-radius-pill: 999px;", "installed design system provides shared pill radius");
  assertIncludes(designSystemCss, "--text-stack-tight: var(--ef-space-2);", "installed design system provides unified text spacing aliases");
  assertIncludes(designSystemCss, "--ef-mira-avatar-size: 58px;", "installed design system defines the canonical Mira avatar size");
  assertIncludes(designSystemCss, "--ef-mira-visor-width: 38px;", "installed design system defines canonical Mira visor geometry");
  assertIncludes(designSystemCss, "--ef-mira-mouth-width: 8px;", "installed design system defines canonical Mira soft-smile width");
  assertIncludes(designSystemCss, "--ef-mira-mouth-color: rgba(15, 159, 122, 0.58);", "installed design system defines canonical Mira mouth color");
  assertIncludes(indexHtml, "#rhythmView .settings-grid", "installed settings view uses a comfort layout");
  assertIncludes(indexHtml, ".settings-actions", "installed settings actions use a reusable alignment class");
  assertIncludes(indexHtml, "--page-frame-width: min(1420px, 100%);", "installed app defines one shared centered page frame width");
  assertMatches(indexHtml, /\.topbar,\s*#todayView,\s*#rhythmView,\s*#profileView\s*\{[\s\S]*width:\s*min\(100%,\s*var\(--page-frame-width\)\);[\s\S]*justify-self:\s*center;/, "installed top-level pages share one centered page frame");
  assertMatches(indexHtml, /\.topbar h2\s*\{[\s\S]*font-size:\s*var\(--ef-text-title-lg\);[\s\S]*line-height:\s*var\(--ef-line-tight\);/, "installed top-level page titles use one tokenized scale");
  assertIncludes(indexHtml, "#rhythmView .settings-section {\n      min-width: 0;\n      gap: var(--ef-space-4);", "installed settings uses compact preference sections instead of card skeletons");
  assertIncludes(indexHtml, "border-color: var(--group-line);\n      background: var(--panel);", "installed settings primary cards share the tokenized crisp surface language");
  assertIncludes(indexHtml, "#rhythmView .settings-grid {\n      display: grid;\n      grid-template-columns: minmax(0, 1fr);", "installed settings page is a single preference stack");
  assertNotIncludes(indexHtml, "#rhythmView .settings-card", "installed settings page no longer depends on settings-card selectors");
  assertNotIncludes(indexHtml, "#rhythmView .desktop-readiness", "installed settings page no longer depends on desktop-readiness selectors");
  assertNotMatches(indexHtml, /class="[^"]*settings-card/, "installed settings page no longer renders settings-card skeletons");
  assertMatches(indexHtml, /#rhythmView \.settings-hero-section\s*\{[\s\S]*padding:\s*var\(--ef-space-6\) var\(--ef-space-7\);[\s\S]*gap:\s*var\(--ef-space-4\);[\s\S]*\}/, "installed settings boundary section keeps compact preference padding");
  assertIncludes(indexHtml, "#rhythmView .settings-boundary-disclosure summary {\n      min-height: var(--ef-control-md);", "installed settings current mode disclosure uses compact row height");
  assertIncludes(indexHtml, "class=\"settings-mode-summary\"", "installed settings current mode renders as a quiet summary");
  assertIncludes(indexHtml, "class=\"settings-mode-pill ef-status-pill\"", "installed settings current mode value uses a compact status pill");
  assertIncludes(indexHtml, 'id="currentIntensityValue">L1 安静 <span>最低提醒等级</span></strong>', "installed settings first screen explains the current mode level");
  assertIncludes(indexHtml, "function settingsModePillHtml", "installed settings mode pill keeps the level explanation when mode changes");
  assertNotMatches(indexHtml, /<span class="settings-row-label[^"]*">当前模式<\/span>[\s\S]*id="currentIntensityValue"/, "installed settings current mode does not repeat the same label and value row");
  assertNotIncludes(indexHtml, "L1 安静：只变 Mira 状态。", "installed settings current mode copy avoids repeating the selected mode name");
  assertIncludes(indexHtml, "#rhythmView .settings-segmented-control {\n      width: min(100%, calc(var(--ef-space-14) * 12));", "installed settings boundary segmented control stays compact on desktop");
  assertIncludes(indexHtml, "L1 安静</button>", "installed settings boundary segmented labels stay compact");
  assertIncludes(indexHtml, "L4 强制爱</button>", "installed settings force segmented label stays compact");
  assertIncludes(indexHtml, "class=\"settings-segmented-control ef-segmented-control\"", "installed settings boundary renders as a design-system segmented control");
  assertIncludes(designSystemCss, ".ef-segmented-control {\n  min-height: var(--ef-control-md);", "installed settings boundary segmented control uses design-system control tokens");
  assertMatches(indexHtml, /#rhythmView \.force-confirm \{[\s\S]*?border-top:\s*1px solid var\(--group-line\);/, "installed force confirmation is a low-weight, theme-aware prompt row");
  assertIncludes(indexHtml, "background: transparent;", "installed force confirmation avoids warning-card background");
  assertIncludes(indexHtml, "这一轮到恢复断点后接管。预览会以窗口打开，正式开启后会进入全屏恢复。", "installed force confirmation sets preview/fullscreen expectations");
  assertIncludes(indexHtml, "<button class=\"ghost\" id=\"cancelForceBtn\"", "installed force confirmation keeps cancel as a low-weight ghost-tier button");
  assertIncludes(indexHtml, "class=\"settings-preference-rows\"", "installed settings lower controls are grouped as preference rows");
  assertMatches(indexHtml, /#rhythmView \.settings-preference-rows\s*\{[\s\S]*?border-bottom:\s*1px solid var\(--group-line\);/, "installed settings preference rows avoid card borders (tokenized hairline)");
  assertMatches(indexHtml, /<div class="settings-preference-rows">\s*<details class="settings-disclosure-row ef-disclosure-row panel settings-rules-row">[\s\S]*<summary>查看轻提醒规则<\/summary>[\s\S]*<details class="settings-disclosure-row ef-disclosure-row panel advanced-settings system-integration-settings">[\s\S]*<summary>更多设置<\/summary>[\s\S]*<details class="settings-disclosure-row ef-disclosure-row panel advanced-settings system-diagnostic-card">[\s\S]*<summary>反馈与诊断<\/summary>/, "installed settings lower disclosures put reminder rules before tools and diagnostics");
  assertMatches(indexHtml, /#rhythmView \.settings-preference-rows \.tag\[data-state\]\s*\{[\s\S]*min-height:\s*auto;[\s\S]*border:\s*0;[\s\S]*background:\s*transparent;/, "installed settings folded-row status values render as quiet inline text instead of large pills");
  assertMatches(indexHtml, /#rhythmView \.settings-check-list label,\s*#rhythmView \.ef-switch-label\s*\{[\s\S]*display:\s*flex;[\s\S]*align-items:\s*center;[\s\S]*justify-content:\s*space-between;[\s\S]*width:\s*100%;[\s\S]*min-height:\s*var\(--ef-hit-target\);/, "installed settings checkbox groups use stable full-width switch rows");
  assertMatches(indexHtml, /#rhythmView \.ef-switch\s*\{[\s\S]*--ef-switch-h:\s*calc\(var\(--ef-control-sm\) - var\(--ef-space-2\)\);[\s\S]*--ef-switch-w:\s*calc\(var\(--ef-control-sm\) \+ var\(--ef-space-6\)\);[\s\S]*width:\s*var\(--ef-switch-w\);[\s\S]*height:\s*var\(--ef-switch-h\);[\s\S]*appearance:\s*none;/, "installed settings checkbox groups use tokenized macOS-style switches");
  assertIncludes(indexHtml, "background: var(--sb-active-bg);\n      box-shadow: none;", "installed sidebar active navigation uses the single Mira accent");
  assertIncludes(indexHtml, "class=\"settings-disclosure-row ef-disclosure-row panel advanced-settings system-diagnostic-card\"", "installed settings diagnostics are folded below the primary blocks");
  assertIncludes(indexHtml, "id=\"feedbackPreview\" hidden=\"\"", "installed settings diagnostic preview stays hidden by default");
  assertIncludes(indexHtml, "background: var(--group-bg);\n      box-shadow: none;", "installed settings grouped surfaces do not float like dashboard cards");
  assertIncludes(indexHtml, "body:has(#todayView:not([hidden])) .companion", "installed today view lets Mira compact away from session controls");
  assertIncludes(indexHtml, "body:has(#todayView:not([hidden])) .companion {\n        top: var(--ef-space-10);", "installed today compact Mira avoids bottom session sliders");
  assertIncludes(indexHtml, "body:has(#rhythmView:not([hidden])) .companion", "installed settings view lets Mira compact away from controls");
  assertMatches(indexHtml, /\.profile-summary-chips\s*\{[\s\S]*display:\s*none;/, "installed profile overview removes repeated summary chips from the main flow");
  assertMatches(indexHtml, /\.profile-overview-main\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\) minmax\(calc\(var\(--ef-space-14\) \* 4\.6\),\s*0\.34fr\);[\s\S]*align-items:\s*start;/, "installed profile overview uses one recommendation column and one compact parameter column, top-aligned as one bound card");
  assertMatches(indexHtml, /\.profile-insight-card\s*\{[\s\S]*padding:\s*var\(--ef-space-0\);[\s\S]*border:\s*0;[\s\S]*background:\s*transparent;/, "installed profile insight avoids nested card chrome");
  assertMatches(indexHtml, /\.profile-insight-strip\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\);[\s\S]*border:\s*0;[\s\S]*background:\s*transparent;/, "installed profile insight summary becomes a quiet vertical list");
  assertMatches(indexHtml, /\.profile-memory-grid\s*\{[\s\S]*display:\s*flex;[\s\S]*flex-wrap:\s*wrap;[\s\S]*border:\s*0;[\s\S]*border-top:\s*1px solid var\(--group-line-soft\);[\s\S]*background:\s*transparent;/, "installed profile rhythm memory no longer renders as a boxed table");
  assertMatches(indexHtml, /\.pet-toast::after\s*\{\s*display:\s*none;/, "installed Mira toast renders as a contained prompt without a speech-tail");
  assertIncludes(indexHtml, "dataset.anchor = \"mira-above\"", "installed Mira toast stays anchored near Mira instead of flying between corners");
  assertIncludes(indexHtml, "dataset.anchor = \"mira-below\"", "installed Mira toast can sit below compact top Mira");
  assertIncludes(indexHtml, "window.eyeflowDesktop.showMiraBubble(toastMessage)", "installed desktop Mira messages render in the companion window");
  assertIncludes(preloadJs, "showMiraBubble: (message) => ipcRenderer.invoke(\"companion:bubble\", message)", "installed preload exposes companion speech bubble command");
  assertIncludes(preloadJs, "onCompanionBubble", "installed preload exposes companion speech bubble listener");
  assertIncludes(preloadJs, "copyShareImage: (dataUrl) => ipcRenderer.invoke(\"share:copyImage\", dataUrl)", "installed preload exposes share-card image clipboard IPC");
  assertIncludes(mainJs, "companionSizes.bubble", "installed desktop companion has a transient speech-bubble window size");
  assertIncludes(mainJs, "ipcMain.handle(\"companion:bubble\"", "installed main process routes Mira speech bubbles to companion");
  assertIncludes(mainJs, "if (shouldExpand && companionBubbleBaseBounds)", "installed main process blocks companion panel while Mira bubble is visible");
  assertIncludes(mainJs, "if (companionExpanded) hideCompanionPanel();", "installed main process closes companion panel before showing Mira bubble");
  assertIncludes(companionHtml, "class=\"mira-bubble\"", "installed companion renders its own speech bubble beside Mira");
  assertMatches(companionHtml, /\.mira-bubble::after\s*\{\s*display:\s*none;/, "installed companion Mira bubble uses the same contained no-tail prompt style");
  assertIncludes(companionHtml, ".companion.speaking .mira-bubble", "installed companion speech bubble appears only while Mira speaks");
  assertIncludes(companionHtml, "let isMiraSpeaking = false;", "installed companion tracks Mira speech bubble visibility");
  assertIncludes(companionHtml, "if (nextExpanded && isMiraSpeaking)", "installed companion blocks status panel expansion while speaking");
  assertIncludes(indexHtml, ".readiness-grid {\n      display: grid;", "installed settings readiness uses grouped-row structure");
  assertIncludes(indexHtml, "class=\"ghost text-action settings-row-action ef-preference-row-action\" id=\"readinessRefreshBtn\" type=\"button\" hidden=\"\"", "installed settings notification row does not show a stray refresh action");
  assertIncludes(indexHtml, "#rhythmView .readiness-item .ghost", "installed settings readiness rows own their actions");
  assertMatches(indexHtml, /#rhythmView \.readiness-item\s*\{[\s\S]*grid-template-columns:\s*[\s\S]*minmax\(0,\s*1fr\)[\s\S]*minmax\(calc\(var\(--ef-space-14\) \* 2\.2\),\s*calc\(var\(--ef-space-14\) \* 2\.55\)\);/, "installed settings desktop readiness rows read as content plus one quiet action");
  assertMatches(indexHtml, /#rhythmView \.readiness-item \.settings-action-stack\s*\{[\s\S]*grid-row:\s*1 \/ span 3;[\s\S]*align-self:\s*center;/, "installed settings desktop readiness action aligns with the whole content block");
  assertMatches(indexHtml, /#rhythmView \.readiness-item p\s*\{[\s\S]*display:\s*block;/, "installed settings desktop readiness explanatory copy is visible in the content column");
  assertMatches(indexHtml, /#rhythmView \.settings-desktop-section \.settings-action-note\s*\{[\s\S]*display:\s*none;/, "installed settings desktop readiness action column avoids duplicated helper copy");
  assertMatches(indexHtml, /#rhythmView \.readiness-item \.settings-action-button\s*\{[\s\S]*min-height:\s*36px;[\s\S]*padding-inline:\s*var\(--ef-space-4\);/, "installed settings desktop readiness buttons use the unified 36px action height");
  assertMatches(indexHtml, /#rhythmView \.readiness-item \.settings-action-button\.primary-action\s*\{[\s\S]*background:\s*var\(--btn-ghost-bg\);[\s\S]*border-color:\s*var\(--btn-ghost-border\);/, "installed settings enhanced sensing action is a quiet outline button");
  assertMatches(indexHtml, /#rhythmView #readinessCompanionBtn\.primary-action\s*\{[\s\S]*color:\s*var\(--btn-tonal-fg\);[\s\S]*background:\s*var\(--btn-tonal-bg\);[\s\S]*border:\s*0;/, "installed settings hidden Mira restore action uses green tonal emphasis");
  assertMatches(indexHtml, /readinessCompanionBtn\.classList\.toggle\("primary-action",\s*!desktopMiraVisible\);[\s\S]*readinessCompanionBtn\.classList\.toggle\("secondary-action",\s*desktopMiraVisible\);/, "installed settings only makes the show-Mira restore action green");
  assertMatches(indexHtml, /#rhythmView \.readiness-item \.settings-action-button\.secondary-action\s*\{[\s\S]*background:\s*transparent;[\s\S]*border-color:\s*transparent;/, "installed settings exit Mira action is downgraded to a text-like control");
  assertIncludes(indexHtml, "#rhythmView .settings-desktop-section .readiness-status[data-state=\"action\"]", "installed settings readiness action badge stays low-weight");
  assertMatches(indexHtml, /#rhythmView \.readiness-item strong\s*\{[\s\S]*grid-column:\s*1;[\s\S]*grid-row:\s*2;/, "installed settings readiness status sits under the row label instead of forming a table column");
  assertIncludes(indexHtml, "#rhythmView .readiness-item strong::before {\n      content: none;", "installed settings readiness row status avoids duplicate dots");
  assertIncludes(indexHtml, "#rhythmView .readiness-item:nth-child(-n + 3)", "installed mobile readiness rows keep only horizontal dividers");
  assertMatches(indexHtml, /\.readiness-status\s*\{[\s\S]*border-radius:\s*var\(--ef-radius-md\);/, "installed read-only status labels share the unified 8px radius");
  assertIncludes(indexHtml, "font-weight: var(--ef-symbol-weight-base);", "installed details plus/minus symbols use design-system symbol weight");
  assertMatches(indexHtml, /\.active-setting\s*\{[\s\S]*box-shadow:\s*none;/, "installed active setting state avoids extra floating shadow");
  assertMatches(indexHtml, /\.intervention-meter\s*\{[\s\S]*gap:\s*var\(--ef-space-1\);[\s\S]*\}[\s\S]*\.intervention-meter span\s*\{[\s\S]*height:\s*var\(--ef-space-2\);[\s\S]*border-radius:\s*var\(--ef-radius-pill\);/, "installed intervention meter uses tokenized symbol rhythm");
  assertIncludes(indexHtml, "#profileView .profile-overview-main", "installed profile view uses a calmer scan layout");
  assertIncludes(indexHtml, ".profile-summary-chips", "installed profile summary chip markup stays available but hidden to avoid repeated signals");
  assertMatches(indexHtml, /#profileView \.profile-trend-tag,[\s\S]*#profileView \.archive-window-pill\s*\{[\s\S]*display:\s*inline-flex;[\s\S]*align-items:\s*center;[\s\S]*justify-content:\s*center;[\s\S]*text-align:\s*center;[\s\S]*white-space:\s*nowrap;/, "installed remaining profile pills center text inside their borders");
  assertMatches(indexHtml, /details\.panel\.profile-visual-panel summary::after\s*\{[\s\S]*display:\s*inline-flex;[\s\S]*align-items:\s*center;[\s\S]*justify-content:\s*center;[\s\S]*line-height:\s*1;/, "installed profile collapsed symbols stay optically centered");
  assertNotIncludes(indexHtml, 'class="metrics health-signals"', "installed today no longer renders a separate round metrics strip");
  assertNotIncludes(indexHtml, 'id="eyeLoad"', "installed today no longer repeats focused time below the timer bar");
  assertNotIncludes(indexHtml, 'id="focusMinutes"', "installed today no longer repeats the target below the timer bar");
  assertNotIncludes(indexHtml, 'id="breakCount"', "installed today keeps recovery count for the daily share summary");
  assertNotIncludes(indexHtml, 'id="logCount"', "installed today keeps log count for the daily share summary");
  assertNotIncludes(indexHtml, "50m", "installed today metrics do not mix English minute shorthand with Chinese units");
  assertMatches(indexHtml, /details\.quick-log-panel summary\s*\{[\s\S]*grid-template-columns:\s*var\(--ef-control-sm\) minmax\(0,\s*1fr\);/, "installed quick log summary keeps plus control inside the layout");
  assertMatches(indexHtml, /details\.quick-log-panel summary::after\s*\{\s*display:\s*none;\s*\}/, "installed quick log summary suppresses generic details plus");
  assertMatches(indexHtml, /details\.panel\.quick-log-panel summary::after\s*\{\s*content:\s*none;\s*display:\s*none;\s*\}/, "installed quick log summary keeps the generic details plus suppressed after shared overrides");
  assertIncludes(mainJs, "DASHBOARD_DEFAULT_SIZE = { width: 1280, height: 820 }", "installed dashboard opens at a Codex-like default size");
  assertMatches(mainJs, /function\s+defaultDashboardBounds\(\)\s*\{[\s\S]*return visibleDashboardBounds\(\{ \.\.\.DASHBOARD_DEFAULT_SIZE \}\);[\s\S]*\}/, "installed dashboard default bounds always use the target centered size");
  assertMatches(mainJs, /function\s+dashboardWindowOptions\(\)\s*\{[\s\S]*return defaultDashboardBounds\(\);[\s\S]*\}/, "installed dashboard creation ignores stale saved window bounds");
  assertMatches(mainJs, /function\s+keepDashboardVisible\(\)[\s\S]*dashboardWindow\.setBounds\(defaultDashboardBounds\(\), false\);/, "installed dashboard reopens centered at the default size");
  assertIncludes(mainJs, "defaultX = area.x + Math.round((area.width - width) / 2)", "installed dashboard default bounds are centered");
  assertIncludes(companionHtml, "font-size: var(--ef-text-helper);", "installed companion uses helper body text token");
  assertIncludes(companionHtml, "-webkit-line-clamp: 2;", "installed companion bubble keeps copy to two quiet lines");
  assertIncludes(indexHtml, 'const SYMPTOM_KEYS = ["dryness", "strain", "blur", "light"];', "installed dashboard defines canonical symptom key order");
  assertMatches(indexHtml, /function\s+currentSymptoms\(\)\s*\{[\s\S]*return normalizeSymptoms\(state\.symptoms\);[\s\S]*\}/, "installed dashboard reads current symptoms from state");
  assertMatches(indexHtml, /function\s+setCurrentSymptoms\(symptoms = \{\}, options = \{\}\)[\s\S]*state\.symptoms = normalizeSymptoms/, "installed dashboard writes symptoms through normalized setter");
  assertMatches(indexHtml, /function\s+render\(\)[\s\S]*const analysis = computeEyeAnalysis\(\);[\s\S]*state\.lastAnalysis = scoreAnalysisSnapshot\(analysis\);/, "installed render refreshes current analysis snapshot");
  assertMatches(indexHtml, /function\s+appendDataEvent\(type, payload = \{\}\)[\s\S]*const analysis = scoreAnalysisSnapshot[\s\S]*\.\.\.payload,[\s\S]*computedLoad:[\s\S]*symptoms:[\s\S]*confidence:[\s\S]*analysis[\s\S]*\};/, "installed events normalize load, symptoms, confidence, and analysis");
  assertIncludes(indexHtml, "event.computedLoad ?? event.loadAtEnd ?? event.loadAfter ?? event.loadAtShown ?? \"\"", "installed CSV export preserves zero load values");
  assertMatches(feedbackTemplate, /const analysis = computeEyeAnalysis\(\);\s*const load = analysis\.load;[\s\S]*analysis\.modelVersion/, "installed feedback template builds from unified analysis");
  assertMatches(feedbackCopy, /const result = await window\.eyeflowDesktop\.copyFeedbackText\(text\);[\s\S]*result\?\.ok === false/, "installed feedback copy checks clipboard result");
  assertIncludes(indexHtml, "COPIED_FEEDBACK_PREVIEW_MS = 2 * 60 * 1000", "installed feedback copy keeps full template visible");
  assertIncludes(indexHtml, "空白问题处就是你要回复的位置", "installed feedback copy explains reply location");
  assertMatches(mainJs, /ipcMain\.handle\("feedback:copy"[\s\S]*clipboard\.writeText\(clipped\);[\s\S]*clipboard\.readText\(\);[\s\S]*verified/, "installed feedback copy verifies clipboard readback");
  assertMatches(mainJs, /ipcMain\.handle\("share:copyImage"[\s\S]*nativeImage\.createFromDataURL\(source\)[\s\S]*clipboard\.writeImage\(image\)[\s\S]*clipboard\.readImage\(\);/, "installed share card copies a verified PNG image");
  assertIncludes(indexHtml, "baselineLoadSamples", "installed dashboard feeds history into baseline model");
  assertIncludes(indexHtml, "continuityLine", "installed dashboard publishes companion continuity line");
  assertIncludes(recoveryDataJs, "window.EyeFlowRecoveryData", "installed recovery data export");
  assertIncludes(recoveryDataJs, "recoveryTaskLibrary", "installed recovery task library");
  assertIncludes(uiUtilsJs, "window.EyeFlowUiUtils", "installed UI utility export");
  assertIncludes(uiUtilsJs, "formatFeedbackDuration", "installed UI utility exposes feedback duration formatter");
  assertIncludes(sessionFlowJs, "window.EyeFlowSessionFlow", "installed session flow export");
  assertIncludes(sessionFlowJs, "stageMiraView", "installed stage Mira helper");
  assertIncludes(restFlowJs, "window.EyeFlowRestFlow", "installed rest flow export");
  assertIncludes(restFlowJs, "recoveryCompletionPlan", "installed recovery completion helper");
  assertIncludes(restFlowJs, "showForceEscapeButton", "installed rest flow exposes force emergency exit state");
  assertIncludes(indexHtml, "专注工作时，也有人照顾你的眼睛。", "installed onboarding sells the companion feeling first");
  assertIncludes(indexHtml, '<button class="primary" id="startOnboardingBtn" type="button">好，开始吧</button>', "installed onboarding has one primary action");
  assertIncludes(indexHtml, "不打断，不监视，安静待在桌面一角。", "installed onboarding folds the trust boundary into one clean line");
  assertIncludes(indexHtml, "只是帮你记得休息。", "installed onboarding keeps the value simple");
  assertNotIncludes(indexHtml, "Mira 会安静地待在桌面一角。", "installed onboarding avoids repeating the quiet presence promise");
  assertNotIncludes(indexHtml, "不打断，不监视。", "installed onboarding avoids a separate trust-boundary sentence");
  assertIncludes(indexHtml, "FIRST_AHA_SECONDS = 5 * 60", "installed onboarding creates a first-five-minute aha moment");
  assertIncludes(indexHtml, "mira_aha_moment", "installed onboarding records Mira's first aha moment locally");
  assertIncludes(indexHtml, "我在旁边了。你继续专注，休息点到了我再轻轻提醒。", "installed onboarding first aha makes Mira feel present");
  assertNotIncludes(indexHtml, "眼睛现在怎么样", "installed onboarding no longer asks for a forced eye-state choice");
  assertNotIncludes(indexHtml, "选一个感觉，Mira 先安排第一轮。", "installed onboarding removes the choice prompt");
  assertNotIncludes(indexHtml, '<button class="onboarding-preset', "installed onboarding removes first-run state presets");
  assertNotIncludes(indexHtml, "想更准再细调", "installed onboarding removes first-run fine tuning");
  assertNotIncludes(indexHtml, "开始第一轮", "installed onboarding removes first-round planning language");
  assertNotIncludes(indexHtml, "体验恢复", "installed onboarding removes secondary first-run action");
  assertNotIncludes(indexHtml, "权限稍后", "installed onboarding removes permission wording from first-run");
  assertNotIncludes(indexHtml, "id=\"onboardingPermissionBtn\"", "installed onboarding has no first-screen permission button");
  assertNotIncludes(indexHtml, ">打开权限<", "installed UI avoids scary permission button copy");
  assertIncludes(indexHtml, "增强桌面感知", "installed settings contains optional enhanced desktop sensing");
  assertIncludes(indexHtml, "状态跟随 macOS“辅助功能”里的 EyeFlow 开关。", "installed settings mirrors the macOS Accessibility switch as the enhanced sensing source of truth");
  assertIncludes(indexHtml, "macOS 开关未开启；当前使用普通模式。", "installed settings defaults to ordinary mode when the macOS Accessibility switch is off");
  assertIncludes(indexHtml, "普通模式：只做本地计时和休息提醒。", "installed settings can stay in ordinary mode even when macOS permission is available");
  assertIncludes(indexHtml, "开启后识别当前 App 和空闲时间，用来判断是否在专注工作；需要时会打开 macOS 系统设置。", "installed settings explains the app-level enhanced sensing switch");
  assertIncludes(indexHtml, "系统设置里的 EyeFlow 开关还是关闭；打开后才会增强。", "installed settings does not show enhanced sensing as enabled before the macOS switch is on");
  assertIncludes(indexHtml, "系统设置里的 EyeFlow 开关变蓝后才会增强。", "installed settings row explains the system switch requirement before enhanced sensing is active");
  assertIncludes(indexHtml, "去系统设置开启", "installed settings directs requested enhanced sensing to the macOS switch without claiming it is active");
  assertIncludes(indexHtml, "识别当前 App 和空闲时间，用来判断是否在专注工作；不读取屏幕内容或具体操作。", "installed settings explains enabled enhanced sensing without over-claiming screen access");
  assertIncludes(indexHtml, "去系统设置管理", "installed settings sends enabled enhanced sensing management to macOS settings");
  assertNotIncludes(indexHtml, "刷新中", "installed settings does not expose a stuck enhanced sensing refresh state");
  assertNotIncludes(indexHtml, "正在刷新授权", "installed settings does not expose a stuck enhanced sensing authorization refresh state");
  assertNotIncludes(indexHtml, "刷新授权", "installed settings does not ask the user to manually refresh authorization");
  assertNotIncludes(indexHtml, "重启刷新授权", "installed settings does not ask the user to manually restart authorization");
  assertNotIncludes(indexHtml, "等待系统确认", "installed settings no longer blocks enhanced sensing on a pending main state");
  assertNotIncludes(indexHtml, "确认增强", "installed settings no longer requires a second confirmation button");
  assertNotIncludes(indexHtml, "待确认", "installed settings no longer surfaces pending authorization as the primary state");
  assertNotIncludes(indexHtml, "已开启增强桌面感知；正在等待 macOS“辅助功能”确认。", "installed settings avoids the old pending authorization copy");
  assertNotIncludes(indexHtml, "如果已经勾选 EyeFlow 仍显示待确认，请退出并重新打开 EyeFlow。", "installed settings avoids stale restart-only guidance");
  assertNotIncludes(indexHtml, "已保持开启；macOS 权限生效前仍按本地计时提醒。", "installed settings no longer shows an app-local enabled state before the system switch changes");
  assertNotIncludes(indexHtml, "已按你的选择开启；macOS 开关控制实际增强能力。", "installed settings does not claim requested enhanced sensing is active");
  assertIncludes(indexHtml, "桌面 Mira", "installed settings contains optional desktop Mira visibility");
  assertIncludes(indexHtml, "简约模式", "installed settings contains optional menu-bar mode");
  assertIncludes(indexHtml, "只留菜单栏", "installed settings can opt into menu-bar-only mode after closing the dashboard");
  assertIncludes(indexHtml, "首次默认显示；需要时可从这里退出。", "installed settings explains desktop Mira defaults visible but optional");
  assertIncludes(indexHtml, 'desktopMiraVisible ? "退出 Mira" : "显示 Mira"', "installed settings control panel can exit desktop Mira without using the floating avatar");
  assertIncludes(preloadJs, "setEnhancedSensing", "installed preload exposes enhanced sensing IPC");
  assertIncludes(preloadJs, "restartApp", "installed preload exposes restart IPC for stale accessibility authorization");
  assertIncludes(preloadJs, "setCompanionVisible", "installed preload exposes desktop Mira IPC");
  assertIncludes(preloadJs, "setHideDockOnClose", "installed preload exposes menu-bar mode IPC");
  assertMatches(indexHtml, /function isEnhancedSensingActiveForUi\(\)[\s\S]*return latestDesktopSettings\?\.enhancedDesktopSensing === true;/, "installed enhanced sensing UI only treats the effective system-enabled state as active");
  assertNotIncludes(indexHtml, "|| latestDesktopSettings?.enhancedDesktopSensingRequested === true", "installed enhanced sensing UI must not treat the requested state as active");
  assertNotIncludes(indexHtml, "scheduleEnhancedSensingAutoRestart", "installed enhanced sensing UI has no auto-restart loop");
  assertNotIncludes(indexHtml, "ENHANCED_PERMISSION_AUTO_RESTART_COOLDOWN_MS", "installed enhanced sensing UI has no refresh cooldown state");
  assertMatches(indexHtml, /const nextEnabled = !isEnhancedSensingActiveForUi\(\);/, "installed enhanced sensing toggle follows the effective UI state instead of stale saved settings");
  assertMatches(indexHtml, /setSystemStatus\(els\.desktopReadyTag,\s*"enabled",\s*"增强中"\)/, "installed settings shows enhanced sensing as enabled only after the system switch is on");
  assertMatches(indexHtml, /else if \(enhancedSensingRequested\) \{[\s\S]*setSystemStatus\(els\.desktopReadyTag,\s*"action",\s*"需系统开启"\)/, "installed settings has a separate non-enabled state for requested enhanced sensing");
  assertMatches(indexHtml, /setReadinessState\([\s\S]*?els\.readyPermissionTitle[\s\S]*?"已开启"[\s\S]*?enhancedSensingRequested[\s\S]*?"需系统开启"[\s\S]*?"普通模式"/, "installed settings row title separates enabled, system-required, and ordinary states (single render path)");
  assertMatches(indexHtml, /els\.readinessPermissionBtn\.textContent = enhancedSensing[\s\S]*\? "去系统设置管理"[\s\S]*: enhancedSensingRequested[\s\S]*\? "去系统设置开启"[\s\S]*: "开启增强感知"/, "installed settings button points requested enhanced sensing to system setup instead of management");
  assertIncludes(indexHtml, "settings-action-button primary-action", "installed settings enhanced sensing action has a distinct primary button style");
  assertIncludes(indexHtml, "settings-action-button secondary-action", "installed settings companion action has a distinct secondary button style");
  assertIncludes(indexHtml, "#rhythmView .readiness-item .settings-action-button", "installed settings readiness actions share one stable button sizing class");
  assertIncludes(indexHtml, "--settings-readiness-action-width", "installed settings readiness actions use one hard width token");
  assertMatches(indexHtml, /id="readyCompanionTitle"[\s\S]*<div class="settings-row-action settings-action-stack ef-preference-row-action">[\s\S]*id="readinessCompanionBtn"/, "installed settings companion action uses the same action stack as enhanced sensing");
  assertMatches(indexHtml, /if \(latestDesktopSettings\.platform === "darwin" && isEnhancedSensingActiveForUi\(\)\) \{[\s\S]*enhancedPermissionManageStartedAt = Date\.now\(\);[\s\S]*openAccessibilitySettings\(\);[\s\S]*return;/, "installed settings management opens macOS settings without immediately clearing the user's enhanced sensing preference");
  assertMatches(indexHtml, /function syncEnhancedSensingAfterSystemManage\(\)[\s\S]*enhancedDesktopSensingRequested[\s\S]*setEnhancedSensing\(false\)/, "installed settings clears the enhanced sensing request after returning from macOS settings with the switch off");
  assertMatches(indexHtml, /function refreshDesktopReadinessOnResume\(\)[\s\S]*await refreshDesktopReadiness\(\{ silent: true \}\);[\s\S]*await syncEnhancedSensingAfterSystemManage\(\);/, "installed settings rechecks and syncs enhanced sensing when returning from macOS settings");
  assertMatches(indexHtml, /function startDesktopSettingsWatch\(\)[\s\S]*setInterval\(pollDesktopSettingsWatch,\s*DESKTOP_SETTINGS_WATCH_MS\)/, "installed settings page actively watches macOS permission changes while open");
  assertMatches(indexHtml, /function switchView\(targetId\)[\s\S]*targetId === "rhythmView"[\s\S]*startDesktopSettingsWatch\(\)[\s\S]*stopDesktopSettingsWatch\(\)/, "installed settings page starts and stops the desktop permission watcher with the visible view");
  assertNotIncludes(indexHtml, "confirmEnhancedDesktopSensing", "installed frontend has no second-step enhanced sensing confirmation");
  assertNotIncludes(indexHtml, "enhancedPermissionPendingInSession", "installed frontend does not keep a pending enhanced sensing UI state");
  assertMatches(indexHtml, /function refreshDesktopReadinessOnResume\(\)[\s\S]*refreshDesktopReadiness\(\{ silent: true \}\)/, "installed settings rechecks desktop readiness when returning from macOS settings");
  assertMatches(indexHtml, /function startEnhancedPermissionPolling\(targetTrusted = true\)[\s\S]*enhancedPermissionPollTarget = targetTrusted;[\s\S]*refreshPermissionStatus\(\);[\s\S]*ENHANCED_PERMISSION_POLL_LIMIT_MS[\s\S]*enhancedPermissionNeedsRestart = true;/, "installed enhanced sensing auto-polls macOS switch changes and falls back to sync guidance");
  assertIncludes(mainJs, "ENHANCED_DESKTOP_SENSING_PREFERENCE_VERSION", "installed main versions enhanced desktop sensing preferences");
  assertIncludes(mainJs, "systemEnhancedDesktopSensing", "installed main derives enhanced sensing from the macOS Accessibility switch");
  assertIncludes(mainJs, "enhancedDesktopSensing: systemEnhancedDesktopSensing", "installed main mirrors the macOS Accessibility switch as the active enhanced sensing state");
  assertIncludes(mainJs, "hasAccessibilityTccPermission", "installed main falls back to the macOS TCC Accessibility record when Electron keeps a stale permission value");
  assertIncludes(mainJs, "ACCESSIBILITY_TCC_CLIENT", "installed main reads the EyeFlow Accessibility TCC client explicitly");
  assertNotIncludes(mainJs, "execFileSync", "installed main does not use an Apple Events probe to override macOS Accessibility status");
  assertNotIncludes(mainJs, "desiredEnhancedDesktopSensing", "installed main does not keep a second app-level source of truth for enhanced sensing");
  assertIncludes(mainJs, "ENHANCED_DESKTOP_SENSING_REQUEST_WINDOW_MS", "installed main expires stale enhanced sensing requests");
  assertIncludes(mainJs, "reconcileDesktopPreferences", "installed main cleans stale enhanced sensing requests during settings reads");
  assertIncludes(mainJs, "enhancedDesktopSensingRequested", "installed main returns the requested enhanced sensing sync state");
  assertIncludes(mainJs, "enhancedDesktopSensingRequestedAt", "installed main timestamps temporary enhanced sensing requests");
  assertIncludes(mainJs, 'ipcMain.handle("app:restart"', "installed main exposes restart IPC for stale accessibility authorization");
  assertMatches(mainJs, /ipcMain\.handle\("desktopSettings:setEnhancedSensing"[\s\S]*Boolean\(enabled\) !== hasAccessibilityPermission\(\)[\s\S]*openAccessibilitySettings\(\)/, "installed main opens the macOS Accessibility switch when the app button cannot change it directly");
  assertMatches(mainJs, /ipcMain\.handle\("desktopSettings:setEnhancedSensing"[\s\S]*writeDesktopPreference\("enhancedDesktopSensing", enabled\)/, "installed main saves the user's requested enhanced sensing state while macOS refreshes authorization");
  assertNotIncludes(mainJs, 'writeDesktopPreference("enhancedDesktopSensing", hasAccessibilityPermission())', "installed main must not overwrite the user's enhanced sensing request with a stale macOS permission read");
  assertMatches(mainJs, /next\.enhancedDesktopSensingRequestedAt = Date\.now\(\);[\s\S]*delete next\.enhancedDesktopSensingRequestedAt;/, "installed main keeps requested enhanced sensing temporary instead of permanent");
  assertIncludes(mainJs, "next.enhancedDesktopSensingPreferenceVersion = ENHANCED_DESKTOP_SENSING_PREFERENCE_VERSION", "installed main records explicit enhanced sensing choices");
  assertNotIncludes(mainJs, "enhancedDesktopSensingPending", "installed main has no pending enhanced sensing preference state");
  assertIncludes(mainJs, "COMPANION_VISIBILITY_PREFERENCE_VERSION", "installed main versions desktop Mira visibility preferences");
  assertIncludes(mainJs, "const COMPANION_VISIBILITY_PREFERENCE_VERSION = 3;", "installed main migrates older hidden Mira preferences back to the default-on policy");
  assertIncludes(mainJs, "hasCompanionVisibilityPreference", "installed main can migrate old hidden desktop Mira preferences");
  assertIncludes(mainJs, "showCompanionOnLaunch: hasCompanionVisibilityPreference", "installed main defaults desktop Mira visible unless explicitly hidden in the current preference version");
  assertIncludes(mainJs, "hideDockOnClose: settings.hideDockOnClose === true", "installed main defaults Dock-on-close behavior to visible unless user opts into menu-bar mode");
  assertMatches(indexHtml, /settings-desktop-section[\s\S]*简约模式[\s\S]*hideDockOnCloseToggle[\s\S]*<\/section>\s*<div class="settings-preference-rows">/, "installed settings exposes menu-bar mode in the visible desktop section");
  assertIncludes(mainJs, "next.companionVisibilityPreferenceVersion = COMPANION_VISIBILITY_PREFERENCE_VERSION", "installed main marks explicit desktop Mira visibility choices");
  assertMatches(mainJs, /ipcMain\.handle\("desktopSettings:setHideDockOnClose"[\s\S]*writeDesktopPreference\("hideDockOnClose", enabled\)/, "installed main persists the user-selected menu-bar mode");
  assertMatches(mainJs, /function hideDockIcon\(\)[\s\S]*app\.dock\.hide\(\);[\s\S]*\}/, "installed main can hide the Dock icon for quiet menu-bar launches");
  assertMatches(mainJs, /function wasOpenedAtLogin\(\)[\s\S]*app\.getLoginItemSettings\(\)\.wasOpenedAtLogin/, "installed main can distinguish macOS login-item launches from user launches");
  assertMatches(mainJs, /function wantsDashboardOnLaunch\(\)[\s\S]*return Boolean\(debugCapture \|\| debugOnboarding \|\| process\.env\.EYEFLOW_SHOW_DASHBOARD_ON_LAUNCH === "1"\);/, "installed main keeps explicit dashboard launch separate from ordinary app opens");
  assertMatches(mainJs, /function launchBehavior\(\)[\s\S]*openedAtLogin = wasOpenedAtLogin\(\);[\s\S]*showDashboard = wantsDashboardOnLaunch\(\) \|\| !openedAtLogin;[\s\S]*showDock: showDashboard,[\s\S]*showDashboard,[\s\S]*suppressInitialActivate: !showDashboard,[\s\S]*revealOnboarding: true/, "installed main opens the dashboard for user launches while keeping login-item launches quiet");
  assertMatches(mainJs, /function applyLaunchDockBehavior\(behavior\)[\s\S]*if \(behavior\.showDock\) \{[\s\S]*showDockIcon\(\);[\s\S]*\} else \{[\s\S]*hideDockIcon\(\);[\s\S]*\}/, "installed main applies Dock visibility from the launch behavior object");
  assertMatches(mainJs, /const launch = launchBehavior\(\);[\s\S]*applyLaunchDockBehavior\(launch\);[\s\S]*suppressNextActivate = launch\.suppressInitialActivate;[\s\S]*createDashboardWindow\(\{ showOnReady: launch\.showDashboard, revealOnboarding: launch\.revealOnboarding \}\);/, "installed main consumes one launch behavior object instead of scattered launch flags");
  assertMatches(mainJs, /dashboardWindow\.once\("ready-to-show", \(\) => \{[\s\S]*if \(showOnReady\) dashboardWindow\.show\(\);[\s\S]*\}\);/, "installed dashboard ready-to-show no longer forces the main page open on every launch");
  assertIncludes(mainJs, `dashboardWindow.on("close", (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      dashboardWindow.hide();
      if (desktopPreferenceDefaults().hideDockOnClose) hideDockIcon();
    }
  });`, "installed closing the dashboard hides the Dock icon only after the user enables menu-bar mode");
  assertMatches(mainJs, /function maybeRevealDashboardForOnboarding\(\{ showOnReady, revealOnboarding \} = \{\}\)[\s\S]*onboardingOverlayIsVisibleScript\(\)[\s\S]*showDashboard\(\{ view: "todayView", focus: "onboarding" \}\)/, "installed hidden launch still reveals the dashboard for unfinished onboarding");
  assertMatches(mainJs, /function handleActivate\(\)[\s\S]*suppressNextActivate[\s\S]*return;[\s\S]*showDashboard\(\);[\s\S]*app\.on\("activate", handleActivate\);/, "installed main suppresses only the startup activate event and keeps explicit app activation wired");
  assertMatches(mainJs, /app\.on\("window-all-closed", \(\) => \{[\s\S]*if \(process\.platform !== "darwin"\) app\.quit\(\);[\s\S]*\}\);/, "installed macOS quiet menu-bar mode keeps the app alive without a visible dashboard");
  assertMatches(mainJs, /if \(desktopPreferenceDefaults\(\)\.showCompanionOnLaunch \|\| debugCapture\) \{[\s\S]*revealCompanionWindow\(\);[\s\S]*\}/, "installed main reveals the companion window by default unless the user hides Mira");
  assertMatches(mainJs, /function getDesktopSettings\(\)[\s\S]*if \(preferences\.showCompanionOnLaunch\) \{[\s\S]*ensureCompanionVisibleForPreference\(\);[\s\S]*companionVisible: isCompanionWindowVisible\(\)/, "installed main self-heals enabled desktop Mira when settings are read");
  assertMatches(mainJs, /function defaultCompanionBounds\(\)[\s\S]*screen\.getPrimaryDisplay\(\)\?\.workArea[\s\S]*x: area\.x \+ area\.width - companionSizes\.compact\.width - 28[\s\S]*y: area\.y \+ area\.height - companionSizes\.compact\.height - 28/, "installed main defaults desktop Mira to the primary workArea bottom-right above the Dock");
  assertMatches(mainJs, /const bounds = settings\.companionBounds \|\| defaultCompanionBounds\(\);[\s\S]*const initialBounds = visibleCompanionBounds/, "installed first desktop Mira appearance uses the bottom-right default when no saved position exists");
  assertMatches(mainJs, /function repairCompanionBounds\(\{ reset = false \} = \{\}\)[\s\S]*visibleCompanionBounds\(reset \? defaultCompanionBounds\(\) : currentBounds\)[\s\S]*if \(sameWindowBounds\(currentBounds, nextBounds\)\) return false;[\s\S]*setBounds\(nextBounds, false\);/, "installed find Mira resets via the same bottom-right default without repeatedly setting identical bounds");
  assertMatches(mainJs, /label: "显示\/退出 Mira", accelerator: "CommandOrControl\+M", click: toggleCompanionVisibility/, "installed main menu provides keyboard-only Mira show and exit");
  assertMatches(mainJs, /function trayMiraVisibilityLabel\(\)[\s\S]*\? "退出 Mira"[\s\S]*: "显示 Mira";/, "installed tray menu labels the Mira action with the current visible state");
  assertMatches(mainJs, /function startTrayRest\(\)[\s\S]*showDashboard\(\{ restGuide: true \}\);[\s\S]*\}/, "installed tray rest action opens the rest guide");
  assertMatches(mainJs, /function trayStatusTitle\(\)[\s\S]*latestState\.mood === "rest"[\s\S]*return "休息";[\s\S]*load >= 75[\s\S]*return String\(load\);[\s\S]*return "";/, "installed tray stays icon-only by default and only shows compact status text when the state deserves attention");
  assertMatches(mainJs, /function trayStatusLine\(\)[\s\S]*return "到恢复断点了";[\s\S]*return "本轮计时中";[\s\S]*return `状态偏高 · \$\{load\}`;[\s\S]*return "Mira 安静待命";/, "installed tray menu state line explains the current EyeFlow path without becoming a dashboard");
  assertMatches(mainJs, /function updateTrayPresentation\(\)[\s\S]*tray\.setTitle\(statusTitle\);[\s\S]*tray\.setToolTip\(statusTitle \? `EyeFlow · \$\{statusTitle\}` : "EyeFlow"\);/, "installed tray presentation mirrors the compact status into the native menu bar title");
  assertMatches(mainJs, /function buildTrayMenu\(\)[\s\S]*label: trayStatusLine\(\)[\s\S]*label: "打开 EyeFlow"[\s\S]*label: "休息一下"[\s\S]*label: trayMiraVisibilityLabel\(\)/, "installed tray menu keeps the productized three-action shape with a readable state line");
  assertMatches(mainJs, /function handleTrayClick\(\)[\s\S]*process\.platform === "darwin"[\s\S]*showTrayMenu\(\);[\s\S]*return;[\s\S]*showDashboard\(\);/, "installed macOS tray click opens the native menu instead of flashing the dashboard");
  assertMatches(mainJs, /function showTrayMenu\(\)[\s\S]*const menu = updateTrayMenu\(\);[\s\S]*tray\.popUpContextMenu\(menu\);/, "installed tray menu is refreshed before it is shown");
  assertNotIncludes(mainJs, 'tray.on("click", showDashboard)', "installed tray click must not directly open the dashboard and steal the menu click");
  assertNotIncludes(mainJs, 'label: `用眼负荷 ${latestState.load || 0}`', "installed tray menu avoids dashboard-style eye-load data");
  assertNotIncludes(mainJs, '${latestActivity.activeApp || "未知 App"} · ${latestActivity.isWorking ? "活跃" : "空闲"}', "installed tray menu avoids app activity debugging data");
  assertMatches(mainJs, /function toggleCompanionVisibility\(\)[\s\S]*desktopPreferenceDefaults\(\)\.showCompanionOnLaunch && isCompanionWindowVisible\(\)[\s\S]*hideCompanionWindow\(\);[\s\S]*showCompanion\(\);/, "installed main menu shortcut shows Mira when preference is enabled but the window is missing");
  assertMatches(mainJs, /function hideCompanionWindow\(\{ persistPreference = true \} = \{\}\)[\s\S]*if \(persistPreference\) writeDesktopPreference\("showCompanionOnLaunch", false\);/, "installed temporary companion hides do not persist the hidden preference");
  assertMatches(mainJs, /ipcMain\.handle\("companion:hide", \(\) => \{[\s\S]*hideCompanionWindow\(\{ persistPreference: false \}\);[\s\S]*\}\);/, "installed renderer lifecycle hide keeps desktop Mira default visible");
  assertMatches(mainJs, /function showCompanionBubble\(message, options = \{\}\)[\s\S]*!desktopPreferenceDefaults\(\)\.showCompanionOnLaunch[\s\S]*return \{ ok: false, reason: "hidden" \};/, "installed hidden desktop Mira preference blocks toast bubbles from resurrecting Mira");
  assertMatches(mainJs, /function applyInterventionBehavior\(state\)[\s\S]*const companionVisible = isCompanionWindowVisible\(\);[\s\S]*const companionExited = !companionVisible && !companionHiddenByLifecycle;[\s\S]*if \(companionVisible && [\s\S]*showCompanionPanel\(\);[\s\S]*if \(\(\(companionExited && level >= 2\) \|\| \(level >= 3 && state\.allowSystemNotify\)\) && now - lastAutoNotifyAt > 12 \* 60 \* 1000\) \{[\s\S]*notify\(state\.message \|\| "找一个恢复断点，看远处 20 秒。"\);[\s\S]*\}/, "installed exited/hidden desktop Mira falls back to system notification for L2+ recovery-point reminders (runtime visibility, not preference)");
  assertMatches(mainJs, /function createDarwinTrayIcon\(\)[\s\S]*nativeImage\.createEmpty\(\)[\s\S]*scaleFactor: 1,[\s\S]*trayTemplate\.png[\s\S]*scaleFactor: 2,[\s\S]*trayTemplate@2x\.png[\s\S]*icon\.setTemplateImage\(true\);/, "installed macOS menu bar tray loads crisp 1x and 2x template assets");
  if (readBuffer("assets/trayTemplate.png").length < 100) {
    throw new Error("installed macOS menu bar tray template asset is missing or empty");
  }
  if (readBuffer("assets/trayTemplate@2x.png").length < 200) {
    throw new Error("installed macOS menu bar tray Retina template asset is missing or empty");
  }
  assertMatches(mainJs, /function\s+createTrayIcon\(\)[\s\S]*createDarwinTrayIcon\(\)[\s\S]*createFallbackTrayIcon\(\)[\s\S]*function\s+createTray\(\)[\s\S]*new Tray\(icon\)/, "installed menu bar tray uses the macOS template icon factory");
  assertIncludes(mainJs, 'const COMPANION_EXIT_HINT_TEXT = "双击我可以退出桌面 Mira";', "installed main has a quiet first-run Mira exit hint");
  assertIncludes(mainJs, "const COMPANION_EXIT_HINT_DURATION_MS = 3800;", "installed main keeps the first-run Mira exit hint brief");
  assertMatches(mainJs, /function maybeShowCompanionExitHint\(\)[\s\S]*settings\.companionExitHintShown === true[\s\S]*markCompanionExitHintShown\(settings\);[\s\S]*showCompanionBubble\(COMPANION_EXIT_HINT_TEXT, \{ durationMs: COMPANION_EXIT_HINT_DURATION_MS \}\)/, "installed main shows the Mira exit hint only once");
  assertMatches(mainJs, /function hideCompanionWindow\(\{ persistPreference = true \} = \{\}\)[\s\S]*if \(persistPreference\) markCompanionExitHintShown\(\);[\s\S]*writeDesktopPreference\("showCompanionOnLaunch", false\);/, "installed persistent Mira exit also dismisses the one-time hint");
  assertMatches(mainJs, /const canReadActiveApp = enhancedDesktopSensing && accessibilityTrusted;[\s\S]*const activeApp = canReadActiveApp \? await getActiveAppName\(\) : "本地计时";/, "installed main does not call System Events unless enhanced sensing is enabled");
  assertIncludes(indexHtml, 'recordOnboardingEvent("quiet_entry_started"', "installed onboarding records lightweight entry without assessment");
  assertNotIncludes(indexHtml, "Mira 初始打分；首轮", "installed onboarding does not create first-run assessment log");
  assertNotIncludes(indexHtml, 'els.sessionStartHint.textContent = "安静提醒已开始";', "installed first-run confirmation does not insert an extra landing hint");
  assertIncludes(indexHtml, "第一条恢复样本已建立。", "installed recovery records first sample value");
  assertMatches(indexHtml, /\.timer-card\s*\{[\s\S]*gap:\s*var\(--ef-space-5\);[\s\S]*padding:\s*var\(--ef-space-7\) var\(--ef-space-8\);[\s\S]*border-radius:\s*var\(--ef-radius-md\);/, "installed session card uses tokenized rhythm-panel structure");
  assertMatches(indexHtml, /:root\[data-theme="dark"\] \.symptom:focus-within\s*\{[\s\S]*background:\s*var\(--panel\);[\s\S]*box-shadow:\s*0 0 0 3px rgba\(79,\s*201,\s*156,\s*0\.12\);/, "installed quick-log symptom focus stays dark-readable in night mode");
  assertIncludes(indexHtml, '<h3 id="sessionPanelTitle">本轮节奏</h3>', "installed session panel title uses one Today rhythm surface");
  assertMatches(indexHtml, /els\.sessionPanelTitle\.textContent\s*=\s*controls\.panelTitle;/, "installed session panel title follows session state");
  assertIncludes(sessionFlowJs, 'function sessionState({', "installed session flow has a single normalized state model");
  assertIncludes(sessionFlowJs, 'if (isRunning || autoTracking) return "running";', "installed auto tracking normalizes to the running state");
  assertIncludes(sessionFlowJs, 'panelTitle: "恢复断点"', "installed rest-due session title uses breakpoint language");
  assertIncludes(indexHtml, "return `${remainingLabel} · 目标 ${focusTargetMinutes} 分钟`;", "installed session workflow hint shows remaining and target inside the timer");
  assertIncludes(indexHtml, "return `计时中 · 目标 ${focusTargetMinutes} 分钟`;", "installed auto-tracking hint uses unified timer language");
  assertMatches(sessionFlowJs, /if \(currentState === "running"\) \{[\s\S]*panelTitle: "本轮节奏"[\s\S]*pillText: "计时中"[\s\S]*startText: "暂停"/, "installed auto-tracking controls render as a unified timing state");
  assertIncludes(sessionFlowJs, "暂停当前计时", "installed auto-tracking start title follows the timing state");
  assertMatches(indexHtml, /function\s+toggleSession\(\)\s*\{[\s\S]*if \(isAutoTracking\(\)\) \{[\s\S]*pauseAutoTracking\(\);[\s\S]*return;[\s\S]*startSession\(\);/, "installed auto-tracking primary action pauses the current automatic round instead of starting another state");
  assertMatches(indexHtml, /function\s+pauseAutoTracking\(\)[\s\S]*sessionSource = "manual-paused";[\s\S]*lastActivityRecordAt = 0;[\s\S]*persist\(\);[\s\S]*render\(\);/, "installed auto-tracking pause enters manual-paused instead of bouncing back to auto");
  assertNotIncludes(indexHtml, "手动从 00:00", "installed auto-tracking hint avoids internal reset wording");
  assertNotIncludes(indexHtml, "可切到手动专注", "installed auto-tracking status no longer asks users to choose a mode");
  assertMatches(indexHtml, /function\s+startSession\(\)[\s\S]*?const sourceMode = sessionSource === "auto" && elapsedSeconds > 0 \? "auto" : "manual";[\s\S]*?startedAt = now - elapsedSeconds \* 1000;[\s\S]*lastSessionTickAt = now;/, "installed continuing an automatic round preserves accumulated time and resets the active tick baseline");
  assertIncludes(indexHtml, "const SYSTEM_SESSION_GAP_MS = 5 * 60 * 1000;", "installed session clock has a sleep-gap threshold");
  assertIncludes(indexHtml, "const NATURAL_AWAY_IDLE_SECONDS = 5 * 60;", "installed natural away detection is separated from the short rest duration");
  assertMatches(indexHtml, /function\s+repairStaleOpenFocusSession\(dayState\)[\s\S]*repairedFromStaleElapsedSeconds: elapsed[\s\S]*dayState\.elapsedSeconds = 0;[\s\S]*dayState\.sessionSource = "idle";[\s\S]*dayState\.activeFocusSessionId = "";[\s\S]*dayState\.reminderStats\.autoBreaks = Number\(dayState\.reminderStats\.autoBreaks \|\| 0\) \+ 1;/, "installed stale open sessions from old sleep-counting builds are repaired on load");
  assertMatches(indexHtml, /function\s+handleSystemLifecycle\(payload = \{\}\)\s*\{[\s\S]*if \(reason === "resume"\) \{[\s\S]*Date\.now\(\) - lastSessionTickAt > SYSTEM_SESSION_GAP_MS[\s\S]*completeSessionForSystemRest\("system-inactive-gap"\);[\s\S]*if \(reason === "lock-screen" \|\| reason === "suspend"\) \{[\s\S]*pauseVisibleBreakTimerForSystemRest\(\);[\s\S]*completeSessionForSystemRest\(reason\);[\s\S]*return;/, "installed lock, sleep, and missed long gaps end the current work round instead of counting sleep time");
  assertMatches(indexHtml, /function\s+tick\(\)\s*\{[\s\S]*now - lastSessionTickAt > SYSTEM_SESSION_GAP_MS[\s\S]*completeSessionForSystemRest\("system-inactive-gap"\);[\s\S]*return;[\s\S]*syncRunningSessionClock\(\{ now \}\);/, "installed session tick rejects long inactive gaps before recomputing elapsed time");
  assertMatches(indexHtml, /function\s+maybeAutoCompleteBreak\(activity\)[\s\S]*lastActiveSecondsBeforeIdle = isRunning[\s\S]*naturalAwaySeconds = Math\.max\(NATURAL_AWAY_IDLE_SECONDS, Number\(els\.breakTarget\.value \|\| 0\)\);[\s\S]*if \(activity\.idleSeconds < naturalAwaySeconds\) return;[\s\S]*if \(!isRunning && lastActiveSecondsBeforeIdle < Number\(els\.focusTarget\.value\) \* 60 \* 0\.5\) return;[\s\S]*if \(!isRunning && now - \(state\.lastAutoBreakAt \|\| 0\) < 12 \* 60 \* 1000\) return;[\s\S]*if \(isRunning\) \{[\s\S]*elapsedSeconds = Math\.max\(0, elapsedSeconds - Number\(activity\.idleSeconds \|\| 0\)\);[\s\S]*closeFocusSession\("idle"\);[\s\S]*sessionSource = "idle";/, "installed manual timing treats long keyboard idle as natural rest and removes idle time from focus");
  assertMatches(
    indexHtml,
    /function\s+finishForceBreak\(payload = \{\}\)[\s\S]*state\.forceEscapeUntil = Date\.now\(\) \+ SNOOZE_MINUTES \* 60 \* 1000;[\s\S]*render\(\);[\s\S]*persist\(\);/,
    "installed force escape quiet window is preserved through render"
  );
  assertNotIncludes(indexHtml, "queueTodayContinuity", "installed Today navigation no longer starts timing just by rendering");
  assertMatches(indexHtml, /\.timer-inner span\s*\{[\s\S]*white-space:\s*nowrap;[\s\S]*text-overflow:\s*ellipsis;/, "installed timer hint stays on one line");
  assertMatches(indexHtml, /\.session-state-pill\s*\{[\s\S]*width:\s*fit-content;[\s\S]*border:\s*0;[\s\S]*border-radius:\s*var\(--ef-radius-md\);[\s\S]*min-height:\s*var\(--ef-control-sm\);[\s\S]*background:\s*var\(--mode-pill-bg\);/, "installed mode/state pill is the low-key tonal sage pill (no border)");
  assertMatches(indexHtml, /\.timer-card > \.timer-controls \.primary,[\s\S]*\.timer-card > \.timer-controls \.btn-tonal\s*\{[\s\S]*min-height:\s*var\(--ef-control-lg\);/, "installed session timer controls (primary + ② tonal) go large at 40px");
  assertMatches(indexHtml, /\.timer-card \.small-icon\s*\{[\s\S]*width:\s*var\(--ef-icon-sm\);[\s\S]*height:\s*var\(--ef-icon-sm\);[\s\S]*stroke-width:\s*var\(--ef-icon-stroke-base\);/, "installed session controls use quiet design-system icon size");
  assertMatches(indexHtml, /\.session-settings\s*\{[\s\S]*gap:\s*var\(--ef-space-4\);[\s\S]*padding:\s*var\(--ef-space-0\);[\s\S]*border-radius:\s*var\(--ef-radius-md\);/, "installed session settings stay compact when folded");
  assertMatches(indexHtml, /\.session-settings summary\s*\{[\s\S]*color:\s*var\(--ink\);[\s\S]*font-size:\s*var\(--text-base\);[\s\S]*font-weight:\s*var\(--ef-symbol-weight-base\);/, "installed rhythm tuning summary matches the primary quick-log hierarchy");
  assertMatches(indexHtml, /\.session-settings\[open\]\s*\{[\s\S]*padding:\s*var\(--ef-space-3\) var\(--ef-space-5\);[\s\S]*border-top:\s*1px solid var\(--group-line-soft\);/, "installed session settings expand into a full-width setting area");
  assertMatches(indexHtml, /<details class="session-settings">[\s\S]*<summary>节奏<\/summary>/, "installed rhythm tuning is folded below the primary rhythm row");
  assertIncludes(indexHtml, 'const restButtonIcon = \'<svg class="small-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"', "installed rest action icon uses quiet stroke weight");
  assertMatches(indexHtml, /function\s+sessionHintText\(\)[\s\S]*remainingLabel[\s\S]*剩余 \$\{remainingMinutes\} 分钟[\s\S]*目标 \$\{focusTargetMinutes\} 分钟/, "installed today timer bar carries remaining and target time");
  assertNotIncludes(indexHtml, "els.focusMinutes.textContent", "installed round target is no longer rendered as a duplicate metric");
  assertNotIncludes(indexHtml, "els.loadBand.textContent", "installed remaining time is no longer rendered as a duplicate metric");
  assertIncludes(indexHtml, "今日专注 0 分钟 · 护眼恢复 0 分钟", "installed summary shares focus total and recovery duration without rest counts");
  assertMatches(indexHtml, /details\.quick-log-panel summary\s*\{[\s\S]*padding:\s*var\(--ef-space-8\) var\(--ef-space-9\);[\s\S]*grid-template-columns:\s*var\(--ef-control-sm\) minmax\(0,\s*1fr\);/, "installed quick log summary uses tokenized spacing");
  assertMatches(indexHtml, /details\.quick-log-panel summary::before\s*\{[\s\S]*width:\s*var\(--ef-control-sm\);[\s\S]*font-weight:\s*var\(--ef-symbol-weight-base\);[\s\S]*font-size:\s*var\(--ef-text-title-sm\);/, "installed quick log symbol uses tokenized weight");
  assertIncludes(indexHtml, "随时都可以记一下。", "installed quick log prompt invites anytime logging");
  assertNotIncludes(indexHtml, "眼睛变化时再展开。", "installed quick log prompt removes eye-change gate copy");
  assertMatches(indexHtml, /\.symptom\s*\{[\s\S]*padding:\s*var\(--ef-space-5\);[\s\S]*border-radius:\s*var\(--ef-radius-md\);[\s\S]*gap:\s*var\(--ef-space-4\);/, "installed quick log symptom cells use tokenized density");
  assertMatches(indexHtml, /\.note-box\s*\{[\s\S]*min-height:\s*calc\(var\(--ef-control-lg\) \* 2\);[\s\S]*padding:\s*var\(--ef-space-5\);[\s\S]*font-size:\s*var\(--ef-text-body\);/, "installed quick log note box uses tokenized control sizing");
  assertIncludes(indexHtml, 'class="field quick-log-note"', "installed quick log removes inline note spacing");
  assertIncludes(indexHtml, 'class="actions quick-log-actions"', "installed quick log removes inline action spacing");
  assertMatches(indexHtml, /\.daily-summary\s*\{[\s\S]*border:\s*1px solid var\(--group-line-soft\);[\s\S]*border-radius:\s*var\(--ef-radius-md\);/, "installed daily summary uses tokenized quiet container");
  assertMatches(indexHtml, /\.summary-card\s*\{[\s\S]*padding:\s*var\(--ef-space-7\) var\(--ef-space-8\);[\s\S]*gap:\s*var\(--ef-space-2\);/, "installed summary cards use tokenized density");
  assertMatches(indexHtml, /\.summary-card strong\s*\{[\s\S]*font-size:\s*var\(--ef-text-title-sm\);[\s\S]*line-height:\s*var\(--ef-line-title\);/, "installed summary titles use tokenized type");
  assertMatches(indexHtml, /\.summary-card p\s*\{[\s\S]*font-size:\s*var\(--ef-text-body-sm\);[\s\S]*line-height:\s*var\(--ef-line-body\);/, "installed summary copy uses tokenized body type");
  assertMatches(indexHtml, /\.state-center\s*\{[\s\S]*--state-panel-width:\s*var\(--page-frame-width\);[\s\S]*width:\s*min\(100%,\s*var\(--state-panel-width\)\);[\s\S]*justify-self:\s*start;[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\);[\s\S]*gap:\s*var\(--ef-space-5\);/, "installed today page uses the shared page frame for its status-action center");
  assertMatches(indexHtml, /body\.session-active #todayView \.note-dashboard,[\s\S]*body\.session-active #todayView \.daily-summary\s*\{[\s\S]*width:\s*min\(100%,\s*var\(--page-frame-width\)\);[\s\S]*justify-self:\s*start;/, "installed today active secondary modules align to the shared page frame");
  assertMatches(indexHtml, /\.state-hero\s*\{[\s\S]*--state-mira-size:\s*calc\(var\(--ef-space-14\) \+ var\(--ef-space-14\) \+ var\(--ef-space-5\)\);[\s\S]*padding:\s*var\(--ef-space-10\) var\(--ef-space-11\);[\s\S]*border:\s*0\.5px solid var\(--line\);[\s\S]*background:\s*var\(--panel\);[\s\S]*gap:\s*var\(--ef-space-4\);/, "installed state hero has quiet native hierarchy with more vertical breathing room");
  assertMatches(indexHtml, /\.state-stage\s*\{[\s\S]*grid-template-columns:\s*var\(--state-mira-size\) minmax\(0,\s*1fr\) minmax\(calc\(var\(--ef-space-14\) \* 3\.1\),\s*auto\);[\s\S]*gap:\s*var\(--ef-space-7\);/, "installed state stage reserves a right-side action column");
  assertMatches(indexHtml, /\.state-stage:not\(:has\(\.state-action-row button:not\(\[hidden\]\)\)\)\s*\{[\s\S]*grid-template-columns:\s*var\(--state-mira-size\) minmax\(0,\s*1fr\);/, "installed state stage collapses the action column when no action is visible");
  assertMatches(indexHtml, /#todayView \.state-copy \.state-label\s*\{[\s\S]*display:\s*none;/, "installed today page removes duplicate status pill from first glance");
  assertMatches(indexHtml, /\.state-cues\s*\{[\s\S]*display:\s*none;/, "installed today page removes first-screen statistic pill stack");
  assertMatches(indexHtml, /\.stage-mira span\s*\{[\s\S]*height:\s*var\(--ef-icon-lg\);[\s\S]*display:\s*none;[\s\S]*font-size:\s*var\(--ef-text-micro\);/, "installed today load number is downgraded below the main judgement");
  assertMatches(indexHtml, /\.stage-orbit\s*\{[\s\S]*background:\s*rgba\(229,\s*237,\s*231,\s*0\.5\);[\s\S]*opacity:\s*0\.72;/, "installed today Mira outer orbit uses a quiet base ring");
  assertMatches(indexHtml, /\.stage-orbit::before\s*\{[\s\S]*left:\s*50%;[\s\S]*transform:\s*translateX\(-50%\);[\s\S]*border-top:\s*var\(--ef-space-2\) solid var\(--stage-accent\);/, "installed today Mira outer arc is centered");
  assertMatches(indexHtml, /\.stage-orbit::before\s*\{[\s\S]*border-top:\s*var\(--ef-space-2\) solid var\(--stage-accent\);[\s\S]*opacity:\s*0\.72;/, "installed today Mira orbit stays lower-emphasis than the face");
  assertMatches(indexHtml, /\.stage-pet\s*\{[\s\S]*width:\s*var\(--ef-mira-avatar-size\);[\s\S]*border-radius:\s*var\(--ef-mira-avatar-radius\);/, "installed today Mira uses canonical avatar body geometry");
  assertMatches(indexHtml, /\.stage-pet::before\s*\{[\s\S]*left:\s*var\(--ef-mira-visor-left\);[\s\S]*width:\s*var\(--ef-mira-visor-width\);/, "installed today Mira visor uses canonical geometry tokens");
  assertMatches(indexHtml, /\.stage-pet \.pet-face\s*\{[\s\S]*left:\s*var\(--ef-mira-face-left\);[\s\S]*width:\s*var\(--ef-mira-face-width\);/, "installed today Mira eyes use canonical geometry tokens");
  assertMatches(indexHtml, /\.stage-pet \.pet-mouth\s*\{[\s\S]*left:\s*50%;/, "installed today Mira mouth aligns with the face center");
  assertMatches(indexHtml, /\.stage-pet \.pet-mouth\s*\{[\s\S]*top:\s*var\(--ef-mira-mouth-top\);[\s\S]*width:\s*var\(--ef-mira-mouth-width\);[\s\S]*height:\s*var\(--ef-mira-mouth-height\);[\s\S]*border-bottom-width:\s*var\(--ef-mira-mouth-stroke\);[\s\S]*border-bottom-color:\s*var\(--ef-mira-mouth-color\);/, "installed today stage Mira mouth stays as a canonical soft short smile");
  assertMatches(indexHtml, /(?:^|\n)\s*\.pet-mouth\s*\{[\s\S]*top:\s*var\(--ef-mira-mouth-top\);[\s\S]*width:\s*var\(--ef-mira-mouth-width\);[\s\S]*height:\s*var\(--ef-mira-mouth-height\);[\s\S]*border-bottom:\s*var\(--ef-mira-mouth-stroke\) solid var\(--ef-mira-mouth-color\);/, "installed main Mira default mouth stays as a canonical soft short smile");
  assertMatches(indexHtml, /\.stage-pet \.pet-antenna\s*\{[\s\S]*left:\s*var\(--ef-mira-antenna-left\);[\s\S]*width:\s*var\(--ef-mira-antenna-width\);/, "installed today Mira antenna arc uses canonical geometry tokens");
  assertMatches(indexHtml, /\.state-hero strong\s*\{[\s\S]*font-size:\s*var\(--ef-text-display-sm\);[\s\S]*line-height:\s*var\(--ef-line-tight\);/, "installed state headline answers continue-or-rest first");
  assertMatches(indexHtml, /<div class="state-copy">[\s\S]*<div class="today-flow" id="todayFlowCopy">[\s\S]*<\/div>\s*<\/div>\s*<div class="actions state-action-row">/, "installed today primary action sits outside the judgement column");
  assertMatches(indexHtml, /\.today-flow\s*\{[\s\S]*margin-top:\s*var\(--ef-space-6\);[\s\S]*padding:\s*var\(--ef-space-0\);[\s\S]*background:\s*transparent;[\s\S]*border:\s*0;[\s\S]*font-size:\s*var\(--ef-text-body-sm\);/, "installed today flow is supporting rhythm context inside the judgement column");
  assertMatches(indexHtml, /\.state-action-row\s*\{[\s\S]*justify-self:\s*end;[\s\S]*align-self:\s*end;[\s\S]*justify-content:\s*flex-end;[\s\S]*margin-top:\s*var\(--ef-space-0\);/, "installed today primary action stays in the right-side hero column aligned to the copy exit point");
  assertMatches(indexHtml, /\.state-action-row \.primary\s*\{[\s\S]*color:\s*var\(--btn-primary-fg\);[\s\S]*background:\s*var\(--btn-primary-bg\);/, "installed today primary action is the ① solid primary (tokenized, unified 36px)");
  assertMatches(indexHtml, /\.state-action-row \.primary\[data-intent="rest"\]\s*\{[\s\S]*background:\s*rgba\(255,\s*241,\s*245,\s*0\.46\);[\s\S]*border-color:\s*rgba\(201,\s*99,\s*127,\s*0\.22\);/, "installed today rest action stays light but distinct");
  assertMatches(indexHtml, /\.state-action-row:not\(:has\(button:not\(\[hidden\]\)\)\)\s*\{[\s\S]*display:\s*none;/, "installed today action column hides when no action is visible");
  assertNotIncludes(indexHtml, 'class="state-meta-row"', "installed today main state no longer renders unclear folded meta row");
  assertNotIncludes(indexHtml, 'aria-label="快速反馈"', "installed today main state no longer renders first-screen quick feedback");
  assertMatches(indexHtml, /\.state-center \.timer-card\s*\{[\s\S]*margin-top:\s*var\(--ef-space-7\);[\s\S]*padding:\s*var\(--ef-space-6\) var\(--ef-space-7\);[\s\S]*background:\s*var\(--panel\);[\s\S]*border-color:\s*var\(--group-line\);/, "installed today next-round card stays close to the Mira judgement");
  assertMatches(indexHtml, /\.state-center \.timer-card \.session-card-head\s*\{[\s\S]*justify-items:\s*start;[\s\S]*align-content:\s*center;/, "installed session workflow header aligns status with the title");
  assertMatches(indexHtml, /\.state-center \.timer-card \.session-settings\s*\{[\s\S]*grid-column:\s*1;[\s\S]*grid-row:\s*2;/, "installed folded rhythm settings stay with the workflow title");
  assertMatches(indexHtml, /\.state-center \.timer-card \.session-settings\[open\]\s*\{[\s\S]*grid-column:\s*1 \/ -1;/, "installed expanded rhythm settings can use the full workflow width");
  assertMatches(indexHtml, /body:not\(\.session-active\) #todayView \.state-center \.timer-card\s*\{[\s\S]*display:\s*none;/, "installed onboarding-only layout can hide timer panel");
  assertNotMatches(indexHtml, /#todayView \.health-signals/, "installed today removes the metric strip instead of separately hiding it");
  assertMatches(indexHtml, /body:not\(\.session-active\) #todayView details\.quick-log-panel,[\s\S]*body:not\(\.session-active\) #todayView \.daily-summary\s*\{[\s\S]*display:\s*none;/, "installed onboarding-only layout can hide secondary panels");
  assertMatches(indexHtml, /function\s+ensureTodayReadyForActivityStart\(\)[\s\S]*state\.lastAssessmentDay = todayKey\(\);[\s\S]*state\.initialAssessmentDone = true;[\s\S]*state\.onboardingDismissed = true;[\s\S]*return true;/, "installed today creates a lightweight daily state before activity-driven timing");
  assertNotIncludes(indexHtml, "autoStartSessionOnOpen", "installed app no longer starts timing before the first Today render");
  assertMatches(indexHtml, /function\s+startAutoTrackingFromActivity\(activity\)[\s\S]*if \(!ensureTodayReadyForActivityStart\(\)\) return false;[\s\S]*if \(!activity\?\.isWorking\) return false;[\s\S]*sessionSource = "auto";/, "installed screen activity starts automatic timing from idle");
  assertMatches(indexHtml, /function isManualPaused\(\)\s*\{\s*return sessionSource === "manual-paused";/, "installed manual pause is a real source state");
  assertMatches(indexHtml, /function startAutoTrackingFromActivity[\s\S]*?if \(isManualPaused\(\)\) return false;/, "installed screen activity does not auto-restart while manually paused");
  assertNotMatches(indexHtml, /function pause(?:AutoTracking|Session)[\s\S]{0,260}?elapsedSeconds = 0;/, "installed manual pause preserves visible elapsed time");
  assertMatches(indexHtml, /case "paused":[\s\S]*?已暂停[\s\S]*?els\.primaryActionBtn\.hidden = true;/, "installed paused hero does not duplicate the timer-card resume action");
  assertMatches(indexHtml, /function syncAutoTrackingClock\(\{ now = Date\.now\(\) \} = \{\}\)[\s\S]*?deltaSeconds = Math\.floor\(\(now - autoTrackLastTickAt\) \/ 1000\);[\s\S]*?elapsedSeconds \+= deltaSeconds;/, "installed auto tracking advances the visible timer one second at a time");
  assertMatches(indexHtml, /window\.setInterval\(\(\) => \{[\s\S]*?isAutoTracking\(\)[\s\S]*?!activityDetectionHealthy\(\)[\s\S]*?sessionSource = "idle";[\s\S]*?syncAutoTrackingClock\(\);[\s\S]*?\}, 1000\)/, "installed one-second loop smooths auto tracking and stops it if activity goes stale");
  assertMatches(indexHtml, /autoTrackResumeElapsedBase = elapsedSeconds;[\s\S]*resumedSeconds = Math\.max\(0, Math\.round\(\(detectedAt - autoTrackResumeStartedAt\) \/ 1000\)\);[\s\S]*elapsedSeconds = Math\.max\(elapsedSeconds, autoTrackResumeElapsedBase \+ resumedSeconds\);/, "installed auto-track after resume continues from paused time without catching up paused activeSeconds");
  assertMatches(sessionFlowJs, /if \(currentState === "paused"\)\s*\{[\s\S]*?startText: "恢复自动计时",[\s\S]*?startDisabled: false,/, "installed paused timer control offers an enabled resume action");
  assertMatches(
    indexHtml,
    /function\s+deriveTodayPhase\(\)\s*\{[\s\S]*return "needs-onboarding";[\s\S]*return "break-active";[\s\S]*return "force-quiet";[\s\S]*return "running";[\s\S]*return "paused";[\s\S]*return "idle";/,
    "installed Today phase centrally enumerates display states"
  );
  assertMatches(
    indexHtml,
    /function\s+render\(\)\s*\{[\s\S]*const todayPhase = deriveTodayPhase\(\);(?![\s\S]*queueTodayContinuity\("render"\))[\s\S]*document\.body\.classList\.toggle\("session-active", \["running", "break-active", "idle", "paused"\]\.includes\(todayPhase\)\);/,
    "installed Today keeps one surface and never starts timing by rendering"
  );
  assertMatches(
    indexHtml,
    /function\s+renderStateCenter\(load, todayPhase = deriveTodayPhase\(\)\)[\s\S]*if \(todayPhase === "force-quiet"\)[\s\S]*els\.stateHeadline\.textContent = "Mira 先安静几分钟";[\s\S]*case "running":[\s\S]*els\.stateHeadline\.textContent = "这一轮进行中";[\s\S]*case "idle":[\s\S]*els\.stateHeadline\.textContent = "我在旁边";/,
    "installed Today hero copy is truthful for running, idle standby, and force quiet"
  );
  assertNotMatches(
    indexHtml,
    /else\s*\{\s*\/\/ By design there is no idle preparation page[\s\S]*els\.stateHeadline\.textContent = "这一轮进行中";[\s\S]*els\.stateAction\.textContent = "Mira 已开始计时。";/,
    "installed Today idle branch does not reuse running copy"
  );
  assertNotMatches(indexHtml, /els\.stateHeadline\.textContent\s*=\s*"准备开始这一轮"/, "installed today no longer renders a preparation headline");
  assertNotMatches(indexHtml, /els\.stateAction\.textContent\s*=\s*"点开始后，我会立刻开始计时。"/, "installed today no longer asks for a duplicate start click");
  assertIncludes(indexHtml, 'els.stateHeadline.textContent = "这一轮进行中";', "installed running state uses one title for automatic and manual sessions");
  assertIncludes(indexHtml, 'els.stateAction.textContent = "Mira 已开始计时。";', "installed running session confirms timing has started");
  assertIncludes(indexHtml, '"到恢复断点我再提醒；需要停下就点暂停或休息。";', "installed running state explains reminder, pause, and rest paths");
  assertNotIncludes(indexHtml, '"本地计时中。"', "installed running hero does not repeat the timer status copy");
  assertNotIncludes(indexHtml, '"到休息点再提醒你。"', "installed running hero does not repeat the reminder copy");
  assertMatches(indexHtml, /els\.todayFlowCopy\.hidden\s*=\s*true;/, "installed today hides secondary rhythm explanation from first glance");
  assertIncludes(indexHtml, 'focusTarget: 50', "installed today default rhythm starts from 50 minutes");
  assertIncludes(indexHtml, 'id="focusTarget" type="range" min="15" max="60" step="5" value="50"', "installed today focus control uses the reasonable 15–60 min range");
  assertIncludes(indexHtml, 'id="breakTarget" type="range" min="20" max="240" step="10" value="120"', "installed today rest control uses the 20–240s range (step 10) so 休息长度 drives the actual rest");
  assertMatches(indexHtml, /\.today-plan\s*\{[\s\S]*display:\s*none;/, "installed today plan is downgraded out of the first screen");
  assertIncludes(indexHtml, '<span class="state-label" id="stateBand">已专注 0 分钟</span>', "installed state band shows focused time without a pseudo score");
  assertIncludes(indexHtml, '<strong id="stateHeadline">我在旁边</strong>', "installed today opens directly on the unified standby surface");
  assertIncludes(indexHtml, '<button class="primary" id="primaryActionBtn" type="button" data-intent="start" hidden="">开始这一轮 →</button>', "installed today keeps the duplicate hero start hidden by default");
  assertIncludes(indexHtml, "调整提醒边界", "installed settings folds advanced reminder boundaries behind a quiet disclosure");
  assertIncludes(indexHtml, 'id="currentIntensityValue">L1 安静 <span>最低提醒等级</span></strong>', "installed settings first screen shows current mode with context");
  assertIncludes(indexHtml, "不开启也不影响基础提醒。", "installed enhanced sensing explains optional permission");
  assertIncludes(indexHtml, "开启后，Mira 会识别当前 App 和空闲时间，用来判断是否在专注工作，并在合适的时候提醒你休息。不会读取屏幕内容或具体操作。", "installed enhanced sensing explains before macOS permission");
  assertIncludes(indexHtml, "状态跟随 macOS“辅助功能”里的 EyeFlow 开关。", "installed enhanced sensing follows the macOS permission switch");
  assertMatches(indexHtml, /\.nav button\s*\{[\s\S]*min-height:\s*var\(--ef-control-lg\);[\s\S]*gap:\s*var\(--ef-space-4\);/, "installed navigation uses tokenized control rhythm");
  assertMatches(indexHtml, /\.nav svg,[\s\S]*\.small-icon\s*\{[\s\S]*width:\s*var\(--ef-icon-md\);[\s\S]*height:\s*var\(--ef-icon-md\);/, "installed app icons use tokenized size");
  assertNotIncludes(indexHtml, 'stroke-width="2"', "installed app avoids heavy inline icon strokes");
  assertMatches(indexHtml, /function\s+completeInitialAssessment\(options = \{\}\)[\s\S]*state\.settings\.intensity\s*=\s*"quiet";/, "installed assessment completion defaults to L1 quiet");
  assertIncludes(indexHtml, "onboarding_event", "installed onboarding event stream");
  assertIncludes(indexHtml, "点“休息”，Mira 带你。", "installed rest guide hint");
  assertMatches(indexHtml, /\.onboarding-overlay\s*\{[\s\S]*position:\s*fixed;[\s\S]*inset:\s*0;[\s\S]*place-items:\s*center;/, "installed onboarding overlay centers the first-run dialog in the dashboard window");
  assertMatches(indexHtml, /\.onboarding-overlay\s*\{[\s\S]*background:\s*rgba\(15,\s*23,\s*21,\s*0\.68\);[\s\S]*backdrop-filter:\s*blur\(var\(--ef-space-6\)\) saturate\(0\.78\);/, "installed onboarding overlay darkens and blurs the background behind the first-run sheet");
  assertMatches(indexHtml, /body:has\(#onboardingOverlay\.show\) #primaryActionBtn\s*\{[\s\S]*opacity:\s*0;[\s\S]*pointer-events:\s*none;/, "installed onboarding hides the background start action while the first-run sheet is open");
  assertMatches(indexHtml, /\.onboarding-dialog\s*\{[\s\S]*width:\s*min\(calc\(var\(--ef-space-14\) \* 9\.4\),\s*100%\);[\s\S]*padding:\s*var\(--ef-space-8\) var\(--ef-space-8\) var\(--ef-space-6\);[\s\S]*box-shadow:\s*var\(--group-shadow\),\s*0 12px 32px rgba\(0,\s*0,\s*0,\s*0\.12\);/, "installed onboarding keeps bottom whitespace restrained with a quieter ADA shadow");
  assertMatches(indexHtml, /\.mira-intro\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\);[\s\S]*justify-items:\s*center;[\s\S]*text-align:\s*center;[\s\S]*background:\s*transparent;[\s\S]*box-shadow:\s*none;[\s\S]*transform:\s*translateY\(calc\(var\(--ef-space-1\) \* -1\)\);/, "installed onboarding intro centers and subtly lifts the first-run card content");
  assertMatches(indexHtml, /\.mira-intro \.pet\s*\{[\s\S]*--mira-intro-avatar-scale:\s*1\.46;[\s\S]*--mira-intro-avatar-offset:\s*0px;[\s\S]*width:\s*var\(--ef-mira-avatar-size\);[\s\S]*height:\s*var\(--ef-mira-avatar-size\);[\s\S]*border-radius:\s*var\(--ef-radius-pill\);[\s\S]*radial-gradient\(circle at 50% 54%/, "installed onboarding Mira floats on a soft glow while keeping canonical face geometry");
  assertMatches(indexHtml, /\.mira-intro \.pet::before\s*\{[\s\S]*top:\s*calc\(var\(--mira-intro-avatar-offset\) \+ var\(--ef-mira-visor-top\)\);[\s\S]*left:\s*calc\(var\(--mira-intro-avatar-offset\) \+ var\(--ef-mira-visor-left\)\);[\s\S]*width:\s*var\(--ef-mira-visor-width\);/, "installed onboarding Mira visor keeps canonical geometry inside the glow");
  assertMatches(indexHtml, /\.mira-intro \.pet-mouth\s*\{[\s\S]*top:\s*calc\(var\(--mira-intro-avatar-offset\) \+ var\(--ef-mira-mouth-top\)\);[\s\S]*width:\s*var\(--ef-mira-mouth-width\);[\s\S]*height:\s*var\(--ef-mira-mouth-height\);[\s\S]*border-bottom-width:\s*var\(--ef-mira-mouth-stroke\);/, "installed onboarding Mira mouth stays as a canonical soft short smile inside the glow");
  assertMatches(indexHtml, /\.break-mira \.pet\s*\{[\s\S]*width:\s*58px;[\s\S]*border-radius:\s*50%;[\s\S]*radial-gradient\(circle at 50% 50%/, "installed rest dialog Mira uses a circular avatar shell");
  assertMatches(indexHtml, /:root\[data-theme="dark"\] \.break-mira \.pet\s*\{[\s\S]*radial-gradient\(circle at 50% 50%/, "installed rest dialog Mira has a distinct night avatar shell");
  assertMatches(indexHtml, /\.break-overlay\.feedback-mode \.break-mira \.pet\s*\{[\s\S]*--feedback-mira-avatar-offset:\s*0px;[\s\S]*width:\s*var\(--ef-mira-avatar-size\);[\s\S]*border-radius:\s*var\(--ef-radius-pill\);[\s\S]*background:\s*#edf3ef;/, "installed feedback Mira is a solid round avatar (no glow), face filling the circle");
  assertMatches(indexHtml, /:root\[data-theme="dark"\] \.break-overlay\.feedback-mode \.break-mira \.pet\s*\{[\s\S]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.06\);/, "installed feedback Mira night is a solid round avatar (no glow)");
  assertMatches(indexHtml, /\.break-overlay\.feedback-mode \.break-mira \.pet::before\s*\{[\s\S]*top:\s*calc\(var\(--feedback-mira-avatar-offset\) \+ var\(--ef-mira-visor-top\)\);[\s\S]*left:\s*calc\(var\(--feedback-mira-avatar-offset\) \+ var\(--ef-mira-visor-left\)\);[\s\S]*width:\s*var\(--ef-mira-visor-width\);/, "installed feedback Mira visor keeps canonical geometry inside the themed glow");
  assertMatches(indexHtml, /\.break-overlay\.feedback-mode \.break-mira \.pet-mouth\s*\{[\s\S]*top:\s*calc\(var\(--feedback-mira-avatar-offset\) \+ var\(--ef-mira-mouth-top\)\);[\s\S]*width:\s*var\(--ef-mira-mouth-width\);[\s\S]*height:\s*var\(--ef-mira-mouth-height\);[\s\S]*border-bottom:\s*var\(--ef-mira-mouth-stroke\) solid var\(--ef-mira-mouth-color\);/, "installed feedback Mira mouth follows the canonical soft short smile standard");
  assertMatches(indexHtml, /\.onboarding-flow\s*\{[\s\S]*grid-template-columns:\s*1fr;[\s\S]*align-items:\s*start;/, "installed onboarding uses one column to avoid squeezed panels");
  assertMatches(indexHtml, /\.mira-intro h3\s*\{[\s\S]*font-size:\s*var\(--ef-text-title-lg\);[\s\S]*font-weight:\s*500;/, "installed onboarding title uses restrained token scale and weight");
  assertNotIncludes(indexHtml, ".mira-intro .state-label", "installed onboarding no longer styles a removed intro label");
  assertNotIncludes(indexHtml, 'class="onboarding-bands"', "installed onboarding removes the load segmented scale from the sheet");
  assertMatches(indexHtml, /\.onboarding-actions\s*\{[\s\S]*justify-content:\s*center;[\s\S]*position:\s*static;/, "installed onboarding centers the single primary action");
  assertMatches(indexHtml, /\.onboarding-actions \.primary\s*\{[\s\S]*min-height:\s*var\(--ef-control-lg\);[\s\S]*box-shadow:\s*none;/, "installed onboarding keeps one calm primary action");
  assertMatches(indexHtml, /\.onboarding-overlay\.debug-capture\s*\{[\s\S]*backdrop-filter:\s*blur\(var\(--ef-space-6\)\) saturate\(0\.78\);/, "installed onboarding debug capture keeps the blurred background");
  assertMatches(indexHtml, /\.onboarding-permission-note\s*\{[\s\S]*border:\s*0;[\s\S]*background:\s*transparent;/, "installed onboarding permission note is muted text");
  assertMatches(indexHtml, /id="sessionPanel"\s+tabindex="-1"/, "installed session panel focus target");
  assertMatches(indexHtml, /focusSessionPanel\(\{\s*focusTarget:\s*"panel"\s*\}\);/, "installed first-round panel focus");
  assertMatches(indexHtml, /function\s+handlePrimaryAction\(\)\s*\{[\s\S]*clearFirstRoundLanding\(\);[\s\S]*startSession\(\);[\s\S]*focusSessionPanel\(\{\s*focusTarget:\s*"panel"\s*\}\);/, "installed fallback hero primary action still starts workflow when shown");
  assertIncludes(preloadJs, "onDashboardFocus", "installed preload exposes dashboard focus IPC");
  assertMatches(mainJs, /function\s+sendDashboardFocus\(payload = \{\}\)[\s\S]*dashboardWindow\.webContents\.send\("dashboard:focus"/, "installed main process forwards dashboard focus requests");
  assertMatches(indexHtml, /onDashboardFocus\?\.\(\(payload = \{\}\) => \{[\s\S]*focusManualStartEntry\(\);/, "installed dashboard focus can locate the manual start entry");
  assertMatches(indexHtml, /function\s+focusManualStartEntry\(\)[\s\S]*switchView\("todayView"\)[\s\S]*focusSessionPanel\(\{\s*focusTarget:\s*"panel"\s*\}\)/, "installed manual start focus opens Today and targets the running timer panel");
  assertMatches(indexHtml, /function\s+toggleSession\(\)\s*\{[\s\S]*clearFirstRoundLanding\(\);/, "installed session action clears first-round hint");
  assertMatches(indexHtml, /function\s+showBreak\(reason\)\s*\{[\s\S]*clearFirstRoundLanding\(\);/, "installed break action clears first-round hint");
  assertMatches(indexHtml, /function\s+restartVisibleBreakTimerAfterResume\(\)[\s\S]*startBreakRestTimer\(breakRestTotalSeconds \|\| Number\(els\.breakTarget\.value\) \|\| 20\);/, "installed visible rest countdown restarts after system resume");
  assertMatches(indexHtml, /function\s+pauseVisibleBreakTimerForSystemRest\(\)[\s\S]*stopBreakRestTimer\(\);/, "installed visible rest countdown pauses during system sleep or lock");

  assertMatches(companionHtml, /(?:^|\n)\s*\.pet\s*\{[\s\S]*width:\s*var\(--ef-mira-avatar-size\);[\s\S]*border-radius:\s*var\(--ef-mira-avatar-radius\);/, "installed desktop Mira uses canonical avatar body geometry");
  assertMatches(companionHtml, /\.pet::before\s*\{[\s\S]*top:\s*var\(--ef-mira-visor-top\);[\s\S]*left:\s*var\(--ef-mira-visor-left\);[\s\S]*width:\s*var\(--ef-mira-visor-width\);/, "installed desktop Mira visor uses canonical geometry tokens");
  assertMatches(companionHtml, /(?:^|\n)\s*\.mouth\s*\{[\s\S]*top:\s*var\(--ef-mira-mouth-top\);[\s\S]*width:\s*var\(--ef-mira-mouth-width\);[\s\S]*height:\s*var\(--ef-mira-mouth-height\);[\s\S]*border-bottom:\s*var\(--ef-mira-mouth-stroke\) solid var\(--mira-mouth\);/, "installed desktop Mira mouth follows the canonical soft short smile standard");
  assertMatches(breakLockHtml, /--mira-scale-rest:\s*2\.12;[\s\S]*\.pet\s*\{[\s\S]*width:\s*var\(--ef-mira-avatar-size\);[\s\S]*border-radius:\s*50%;[\s\S]*radial-gradient\(circle at 50% 50%[\s\S]*transform:\s*scale\(var\(--mira-scale-rest\)\);[\s\S]*animation:\s*miraAliveBreath/, "installed break lock Mira uses a circular avatar shell");
  assertMatches(breakLockHtml, /\.pet::before\s*\{[\s\S]*top:\s*var\(--ef-mira-visor-top\);[\s\S]*left:\s*var\(--ef-mira-visor-left\);[\s\S]*width:\s*var\(--ef-mira-visor-width\);/, "installed break lock Mira visor uses canonical geometry tokens");
  assertMatches(breakLockHtml, /\.pet-mouth\s*\{[\s\S]*top:\s*var\(--ef-mira-mouth-top\);[\s\S]*width:\s*var\(--ef-mira-mouth-width\);[\s\S]*height:\s*var\(--ef-mira-mouth-height\);[\s\S]*border-bottom:\s*var\(--ef-mira-mouth-stroke\) solid var\(--ef-mira-mouth-color\);/, "installed break lock Mira mouth follows the canonical soft short smile standard");
  assertMatches(companionHtml, /currentMood\s*===\s*"rest"[\s\S]*openDashboard\(\{\s*restGuide:\s*true\s*\}\);[\s\S]*return;[\s\S]*if \(isMiraSpeaking\) return;/, "installed pink Mira opens rest guide even while its prompt is visible");
  assertIncludes(companionHtml, "看远处 20 秒。点我打开指引。", "installed pink Mira uses one-line rest copy");
  assertNotIncludes(companionHtml, "点我会打开休息指引。", "installed pink Mira removes the longer rest-guide instruction");
  assertNotMatches(companionHtml, /\.rest \.mouth\s*\{[\s\S]*content:\s*"Ɛ"/, "installed pink Mira does not use a separate rest mouth shape");
  assertMatches(companionHtml, /companion\.addEventListener\("dblclick"[\s\S]*setCompanionVisible\?\.\(false\)/, "installed desktop Mira double-click persists hidden visibility");
  assertIncludes(companionHtml, 'id="contextLine"', "installed companion renders continuity context");
  assertIncludes(companionHtml, "state.continuityLine", "installed companion consumes continuity context");
  assertMatches(companionHtml, /const shouldFocusManualStart = !options\.restGuide && !options\.view && !options\.focus;[\s\S]*\{ view: "todayView", focus: "manualStart" \}[\s\S]*window\.eyeflowDesktop\.showDashboard\(dashboardOptions\);/, "installed companion open button returns to Today manual focus by default");
  assertIncludes(indexHtml, 'continuityLine: `${classifyLoad(load)} · ${intensityLabel(state.settings.intensity || "quiet")}`', "installed companion context avoids baseline math");
  assertIncludes(companionHtml, "function shouldNotifyRest", "installed companion gates rest notifications");
  assertIncludes(companionHtml, "restNotifyCooldown = 12 * 60 * 1000", "installed companion rest notifications have a cooldown");
  assertMatches(companionHtml, /if \(state\.forceMode \|\| state\.forceBreakActive\) return false;/, "installed force mode suppresses companion rest notifications");
  assertMatches(companionHtml, /state\.allowSystemNotify !== true/, "installed companion respects notification setting");
  assertIncludes(indexHtml, "max-height: calc(100vh - var(--ef-space-12));", "installed break dialog stays inside short desktop windows");
  assertMatches(mainJs, /if \(label === "break-lock-complete"\) \{[\s\S]*window\.clearInterval\(ticker\);[\s\S]*completionShown = false;[\s\S]*showCompletion\(\);/, "installed debug break-lock complete capture stops the timer before forcing the completed state");
  assertIncludes(indexHtml, "overscroll-behavior: contain;", "installed break dialog scroll is contained");
  assertIncludes(breakLockHtml, "再点一次确认退出", "installed break lock emergency exit requires confirmation");
  assertIncludes(breakLockHtml, "interrupted: true", "installed break lock reports interrupted force exits");
  assertIncludes(indexHtml, "Mira 先只改变状态和颜色；到恢复断点再短暂提示。", "installed L2 early phase stays visual-only");
  assertIncludes(indexHtml, "强制爱临时退出", "installed force emergency exit has cooldown copy");
  assertIncludes(indexHtml, "Mira Insight", "installed profile review opens with Mira insight");
  assertIncludes(indexHtml, "先完成几轮，Mira 再给建议。", "installed first-day profile uses a direct empty state");
  assertIncludes(indexHtml, "先完成几轮专注和恢复。之后这里会整理出更适合你的提醒节奏。", "installed first-day profile defers analysis until there is usage evidence");
  assertIncludes(indexHtml, 'els.profileLoad.textContent = hasProfileEvidence ? load : "记录中";', "installed first-day profile does not expose a premature score");
  assertIncludes(indexHtml, "const hasVisibleUsageEvidence = Math.round(Number(profileStats?.activeSeconds || 0) / 60) > 0", "installed first-day profile waits for visible usage evidence");
  assertNotIncludes(indexHtml, "const hasProfileEvidence = state.logs.length > 0", "installed first-day profile does not treat incidental logs as enough evidence");
  assertIncludes(indexHtml, 'profilePlanTitle(nextAction, suggestion)', "installed first-day profile uses the plain next-round plan title");
  assertIncludes(indexHtml, 'els.profileTrendTag.textContent = "样本建立中";', "installed first-day profile avoids a premature stable verdict");
  assertIncludes(indexHtml, 'classList.toggle("profile-building", !hasProfileEvidence)', "installed first-day profile gets a dedicated low-evidence visual state");
  assertMatches(indexHtml, /#profileView\.profile-building \.profile-detail-fold\s*\{[\s\S]*display:\s*none;/, "installed first-day profile hides the whole detail fold");
  assertIncludes(recoveryDataJs, "最近{days}里，你都给眼睛留了恢复。", "installed gentle streak copy avoids impossible week math");
  assertNotMatches(recoveryDataJs, /这周有\{days\}|一周\{days\}|一周[一二三四五六七八九十]+天|周[^\n"]*[八九十]天/, "installed streak copy cannot say impossible week lengths");
  assertIncludes(indexHtml, "下一轮建议", "installed profile review answers the next-round plan directly");
  assertNotMatches(indexHtml, /<span class="profile-trend-tag" id="profileTrendTag">/, "installed profile insight header removes the duplicated overall-state chip");
  assertIncludes(indexHtml, "主要感受", "installed profile review uses a user-facing signal label");
  assertMatches(indexHtml, /<div class="profile-window-stats">[\s\S]*<span class="profile-window-stat-label">屏幕活跃<\/span>[\s\S]*<span class="profile-window-stat-label">护眼恢复<\/span>[\s\S]*<\/div>/, "installed profile window top summary keeps only the two user-value metrics");
  assertNotMatches(indexHtml, /<span class="profile-window-stat-label">(?:节奏|记录)<\/span>/, "installed profile window does not expose rhythm or record-count cards as top metrics");
  assertIncludes(indexHtml, "<span>提醒时间</span>", "installed profile review labels the reminder timing directly");
  assertIncludes(indexHtml, "<span>休息时间</span>", "installed profile review labels the rest timing directly");
  assertIncludes(indexHtml, "Mira 把这几天整理成一个可执行的节奏。", "installed profile insight subtitle explains the job in plain language");
  assertIncludes(indexHtml, "function profileHardHoldPattern", "installed profile observation can detect hard-hold patterns from local reminder and recovery events");
  assertIncludes(indexHtml, 'insightType: "hard_hold"', "installed profile observation detects repeated snoozed or ignored reminders as hard-hold mode");
  assertIncludes(indexHtml, 'insightType: "evening_delay"', "installed profile observation detects evening delay patterns");
  assertIncludes(indexHtml, 'insightType: "recovery_still_tired"', "installed profile observation uses tired-after-rest feedback");
  assertIncludes(indexHtml, 'insightType: "effective_rest"', "installed profile observation preserves recovery lengths that actually helped");
  assertMatches(indexHtml, /function\s+profilePlanTitle[\s\S]*return "保持轻提醒节奏";/, "installed profile recommendation headline renders one qualitative next action");
  assertNotMatches(indexHtml, /function\s+profilePlanTitle\([^)]*\)\s*\{(?:(?!function)[\s\S])*?suggestion\.focus/, "installed profile headline leaves the exact 分钟/秒 to the spec column");
  assertMatches(indexHtml, /<section class="daily-summary daily-share-card" aria-label="今日分享卡">[\s\S]*id="dailySummaryTitle"[\s\S]*id="dailySummaryCopy"[\s\S]*id="tomorrowPlan"[\s\S]*id="copyShareBtn"/, "installed daily share card contains summary and action");
  assertNotMatches(indexHtml, /<section class="daily-summary" aria-label="今日总结"/, "installed today no longer renders a separate daily summary section");
  assertNotMatches(indexHtml, /<section class="panel profile-share-card" aria-label="今日分享卡"/, "installed daily share card is no longer a separate panel");
  assertIncludes(indexHtml, 'class="profile-score-inline" hidden=""', "installed profile review hides technical status signal from main flow");
  assertMatches(indexHtml, /function\s+currentShareRhythmLabel\(\)[\s\S]*els\.tomorrowPlan\?\.textContent/, "installed daily share image uses the merged card recommendation as its rhythm");
  assertIncludes(indexHtml, "function currentDayFocusSeconds", "installed daily share focus is the current day's total work time");
  assertIncludes(metricsJs, "function recoverySecondsForDay", "installed daily share recovery uses duration instead of raw rest counts");
  assertMatches(metricsJs, /function\s+recoverySecondsForShareEvent\([\s\S]*event\.mode === "system-detected"\) return 0;/, "installed system-detected natural away does not inflate eye-care recovery duration");
  assertIncludes(metricsJs, "function naturalAwaySecondsForDay", "installed natural away is tracked separately from eye-care recovery");
  assertIncludes(indexHtml, "自然离屏", "installed auto away is explained as natural away, not eye-care recovery");
  assertIncludes(indexHtml, "<span>护眼恢复</span>", "installed daily share card labels recovery as eye care instead of rest counts");
  assertNotMatches(indexHtml, /card\.breaks|今日休息次数|<span>休息<\/span><strong id="shareCardBreaks"/, "installed daily share card does not expose rest as a count");
  assertIncludes(indexHtml, "eyeflow.app", "installed profile share card includes restrained domain branding");
  assertMatches(indexHtml, /#todayView \.share-art-mark,[\s\S]*#profileView \.share-art-mark\s*\{[\s\S]*width:\s*calc\(var\(--ef-control-lg\) \+ var\(--ef-space-1\)\);[\s\S]*background:\s*url\("\.\/assets\/icon\.svg"\) center \/ contain no-repeat;/, "installed daily share card uses the source app icon asset");
  assertMatches(indexHtml, /<button class="[^"]*" id="copyShareBtn" type="button">[\s\S]*?带走[\s\S]*?<\/button>/, "installed profile share card uses a compact copy action");
  assertIncludes(indexHtml, 'id="sharePreviewOverlay"', "installed daily share action opens a full-card preview overlay");
  assertIncludes(indexHtml, 'id="copyShareConfirmBtn"', "installed daily share preview has a separate copy confirmation");
  assertIncludes(indexHtml, 'els.copyShareBtn?.addEventListener("click", openDailySharePreview);', "installed daily share compact action does not copy before preview");
  assertIncludes(indexHtml, 'els.copyShareConfirmBtn?.addEventListener("click", copyDailyShareCard);', "installed daily share full preview performs the actual copy");
  assertNotIncludes(indexHtml, "带走这一句", "installed profile share card no longer frames sharing as copying one sentence");
  assertNotIncludes(indexHtml, "复制分享文案", "installed profile share card avoids internal copywriting language");
  assertIncludes(indexHtml, '<p id="shareCardNote" hidden="">本地复制，不上传数据。</p>', "installed profile share card keeps privacy copy hidden until feedback");
  assertIncludes(indexHtml, "卡片已复制。", "installed profile share card confirms image-card copying");
  assertIncludes(indexHtml, "MIRA_DAILY_SHARE_LINES", "installed profile share card uses a local line library");
  assertArrayLiteralMinLength(indexHtml, "MIRA_DAILY_SHARE_LINES", 30, "installed profile share card keeps a month-sized daily line library");
  assertIncludes(designSystemCss, "--ef-role-title-size: 17px;", "installed type scale defines the Title role token");
  assertIncludes(designSystemCss, "--ef-role-stat-size: 20px;", "installed type scale defines the Stat role token");
  assertMatches(indexHtml, /#profileView \.profile-overview-head h3,[\s\S]*?#profileView \.weekly-market-head h4,[\s\S]*?\{[\s\S]*?font-size:\s*var\(--ef-role-title-size\);/, "installed 复盘 card titles share one Title role");
  assertMatches(indexHtml, /#profileView \.profile-insight-title,[\s\S]*?#profileView \.profile-evidence strong,[\s\S]*?\{[\s\S]*?font-size:\s*var\(--ef-role-stat-size\);/, "installed 复盘 stat values share one Stat role");
  assertIncludes(designSystemCss, "--ef-text-secondary: color-mix(in srgb, var(--ink) 60%, transparent);", "installed secondary text is primary ink at 60%");
  assertMatches(indexHtml, /#profileView \.profile-insight-text\s*\{[\s\S]*max-width:\s*58ch;/, "installed profile judgement body stays bounded");
  assertMatches(indexHtml, /\.profile-insight-row p\s*\{[\s\S]*display:\s*none;/, "installed profile insight summary rows avoid repeated explanatory copy");
  assertMatches(indexHtml, /function\s+drawShareBrandMark\([\s\S]*iconSize = size \* 0\.84;[\s\S]*iconGradient\.addColorStop\(0,\s*"#EAFFF6"\);[\s\S]*iconGradient\.addColorStop\(0\.58,\s*"#BDEAFF"\);[\s\S]*iconGradient\.addColorStop\(1,\s*"#F3EEC7"\);[\s\S]*"#6FE7C3"/, "installed profile share image draws the real app icon mark");
  assertMatches(indexHtml, /function\s+drawDailyShareCardCanvas\([\s\S]*canvas\.width = 1200;[\s\S]*canvas\.height = 720;[\s\S]*#f5f3ee[\s\S]*eyeflow\.app/, "installed profile share image draws a textured card artifact");
  assertMatches(indexHtml, /window\.eyeflowDesktop\?\.copyShareImage[\s\S]*generateDailyShareImageDataUrl\(\)/, "installed profile share action copies the generated image card first");
  assertMatches(indexHtml, /function\s+shareCardPayload\([\s\S]*eyebrow:[\s\S]*insight:[\s\S]*今日专注[\s\S]*护眼恢复[\s\S]*节奏[\s\S]*function\s+buildDailyShareText\(\)[\s\S]*card\.insight[\s\S]*card\.metrics\.forEach[\s\S]*Mira 小句/, "installed today share payload keeps focus/recovery/rhythm; text fallback composes the period metrics plus a Mira line");
  assertIncludes(indexHtml, "状态线", "installed profile review keeps today's state line as a lower-weight disclosure");
  assertIncludes(indexHtml, "查看长期档案", "installed profile review moves long-term records behind one archive disclosure");
  assertNotIncludes(indexHtml, "默认收起", "installed profile archive does not expose implementation state copy");
  assertMatches(indexHtml, /<details class="panel profile-archive-disclosure"[\s\S]*查看长期档案[\s\S]*<section class="archive-panel"[\s\S]*<section class="history-panel"[\s\S]*<details class="data-console-panel profile-advanced-records">/, "installed profile archive contains trend, history, and advanced records");
  assertIncludes(indexHtml, "高级记录", "installed profile review keeps advanced records inside the archive");
  assertIncludes(indexHtml, "本地档案", "installed profile review keeps compact data basis");
  assertIncludes(indexHtml, "EyeFlow 只安排恢复节奏，不做健康结论", "installed profile review keeps non-medical boundary");
  assertIncludes(indexHtml, 'id="profileSampleCount"', "installed profile review exposes sample count");
  assertIncludes(indexHtml, 'id="profileConfidence"', "installed profile review exposes confidence level");
  assertIncludes(indexHtml, "Mira 参考了什么", "installed profile review keeps score contributors in advanced records");
  assertIncludes(indexHtml, "记录情况", "installed profile review keeps collection state in advanced records");
  assertIncludes(indexHtml, 'id="profileContributors"', "installed profile review renders contributor breakdown");
  assertIncludes(indexHtml, 'id="profileMissingSignals"', "installed profile review renders missing signal list");
  assertIncludes(indexHtml, "modelVersion", "installed profile logs store model version");
  assertIncludes(indexHtml, "missingSignals", "installed profile analysis stores missing signals");
  assertIncludes(indexHtml, "本地参考和导出", "installed profile archive includes advanced local records");
  assertIncludes(indexHtml, 'id="dataConsoleJson"', "installed data/model console exposes recent event JSON");
  assertIncludes(indexHtml, 'id="exportJsonBtn"', "installed data/model console can export JSON");
  assertIncludes(indexHtml, 'id="exportCsvBtn"', "installed data/model console can export CSV");
  assertIncludes(indexHtml, "function appendDataEvent", "installed local data event stream is implemented");
  assertIncludes(indexHtml, "PERSONAL_RHYTHM_WINDOW_DAYS = 7", "installed personal rhythm engine uses a seven-day local window");
  assertIncludes(indexHtml, "rhythmMemory: {", "installed personal rhythm engine has an explicit local memory structure");
  assertIncludes(indexHtml, "function appendRhythmMemory", "installed personal rhythm engine writes sanitized local rhythm memory");
  assertIncludes(indexHtml, "function rhythmLearningWindow", "installed personal rhythm engine summarizes local events");
  assertIncludes(indexHtml, "function recentRhythmEvents", "installed personal rhythm engine reads recent local events");
  assertIncludes(indexHtml, "manualHoldRounds", "installed personal rhythm engine respects manual rhythm changes for several rounds");
  assertMatches(indexHtml, /function\s+rhythmEventContext[\s\S]*focusTargetMinutes[\s\S]*breakTargetSeconds[\s\S]*reminderMethod[\s\S]*roundState/, "installed local round events capture state, reminder method, and rhythm targets");
  assertMatches(indexHtml, /appendRhythmMemory\("round_started"[\s\S]*startedAt[\s\S]*currentLoad[\s\S]*interruptionBoundary/, "installed rhythm memory records round starts without content");
  assertMatches(indexHtml, /appendRhythmMemory\("round_ended"[\s\S]*durationSeconds[\s\S]*acceptedRest[\s\S]*skippedRest/, "installed rhythm memory records round duration and rest response");
  assertMatches(indexHtml, /appendDataEvent\("reminder_event"[\s\S]*acceptedRest[\s\S]*\.\.\.rhythmEventContext/, "installed reminder events record whether rest was accepted");
  assertMatches(indexHtml, /appendDataEvent\("recovery_event"[\s\S]*postRestFeedback[\s\S]*acceptedRest[\s\S]*\.\.\.rhythmEventContext/, "installed recovery events record feedback after rest");
  assertMatches(indexHtml, /function\s+rhythmSuggestion[\s\S]*rhythmLearningWindow\(\)[\s\S]*manualHoldRounds[\s\S]*recommendationSource:\s*"rule-local"/, "installed rhythm suggestions use local rules and manual-hold protection");
  assertMatches(indexHtml, /function\s+renderTodayPlan[\s\S]*rhythmSuggestion\(load\)[\s\S]*suggestion\.reason/, "installed today page explains Mira rhythm in one sentence");
  assertMatches(indexHtml, /<p class="settings-section-note" id="rhythmReasonCopy" hidden="">/, "installed settings page keeps rhythm reason out of the first screen");
  assertIncludes(indexHtml, "采用 Mira 建议", "installed settings page can apply Mira rhythm suggestions");
  assertIncludes(indexHtml, 'id="openTodayRhythmBtn" type="button">调整这一轮节奏</button>', "installed settings rhythm row gives users a natural edit path");
  assertMatches(indexHtml, /function\s+openTodayRhythmSettings\(\)[\s\S]*switchView\("todayView"\);[\s\S]*sessionSettings\.open = true;/, "installed settings rhythm edit path opens today's rhythm controls");
  assertIncludes(indexHtml, "recommendationSource：", "installed feedback template exports rhythm recommendation source");
  assertIncludes(indexHtml, "lastRecommendationReason：", "installed feedback template exports rhythm recommendation reason");
  assertIncludes(indexHtml, '"postRestFeedback"', "installed CSV export includes recovery feedback");
  assertIncludes(indexHtml, '"reminderMethod"', "installed CSV export includes reminder method");
  assertIncludes(indexHtml, "daily_assessment", "installed local events include assessment type");
  assertIncludes(indexHtml, "focus_session", "installed local events include focus-session type");
  assertIncludes(indexHtml, "recovery_event", "installed local events include recovery type");
  assertIncludes(indexHtml, "reminder_event", "installed local events include reminder type");
  assertIncludes(indexHtml, "长期轻提醒档案", "installed profile review includes long-term archive");
  assertIncludes(indexHtml, "近 30 天状态趋势", "installed profile review includes trend window");
  assertIncludes(indexHtml, "weekly-state-grid", "installed profile trend uses a readable 30-day state band");
  assertIncludes(indexHtml, "weekly-state-peak", "installed profile trend marks the peak day");
  assertIncludes(indexHtml, "颜色越深代表状态越高", "installed profile trend explains the color gradient");
  assertIncludes(indexHtml, "提醒接住", "installed archive uses user-facing reminder handling copy");
  assertIncludes(indexHtml, "HISTORY_ARCHIVE_LIMIT = 365", "installed profile review keeps long-term archive");
  assertIncludes(indexHtml, "function recordedDurationLabel", "installed profile duration fields distinguish missing timing from zero minutes");
  assertIncludes(metricsJs, "function recordedSecondsForDay", "installed profile duration uses the strongest available local timing signal");
  assertIncludes(indexHtml, "autoElapsedSeconds", "installed profile preserves accumulated automatic local timing across the day");
  assertMatches(indexHtml, /autoElapsedSeconds\s*\+=\s*deltaSeconds;/, "installed automatic local timing accumulates instead of only keeping the latest active streak");
  assertMatches(indexHtml, /recordedSecondsForDay\(day\)[\s\S]*recordedDurationLabel\(recordedSecondsForDay\(day\)\)/, "installed profile history renders timing from daily recorded seconds");
  assertIncludes(indexHtml, '<div class="profile-evidence"><span>计时</span><strong id="profileFocusTime">未记录</strong></div>', "installed profile advanced timing evidence does not claim zero screen time");
  assertIncludes(indexHtml, '<div class="history-cell"><span>计时</span><strong>${focusLabel}</strong></div>', "installed profile history labels timing as local timer data");
  assertNotMatches(indexHtml, /<span>盯屏<\/span><strong>\$\{focusMinutes\}m<\/strong>|<span>盯屏<\/span>/, "installed profile history no longer presents missing local timer data as screen time");
  assertIncludes(indexHtml, "function renderProfileTrend", "installed profile visual trend renderer");
  assertIncludes(indexHtml, "function renderWeeklyKline", "installed weekly k-line renderer");
  assertIncludes(indexHtml, "history-spark", "installed history records include spark bars");
  assertMatches(mainJs, /dashboardWindow\.webContents\.send\("dashboard:restGuide"/, "installed dashboard rest-guide IPC");
  assertMatches(mainJs, /dashboardWindow\.webContents\.send\("dashboard:focus"/, "installed dashboard focus IPC");
  assertMatches(mainJs, /const quietedByUser = Boolean\(state\.reminderDeferred\) \|\| snoozeUntil > now;/, "installed desktop panel respects user quieting");
  assertMatches(mainJs, /fs\.mkdirSync\(debugCaptureDir,\s*\{\s*recursive:\s*true\s*\}\);/, "installed debug capture creates directory");

  assertNoHardcodedNeutralSurfaces(indexHtml, "installed themed views use theme tokens, not hardcoded neutral surfaces");

  console.log("[smoke:installed] PASSED. Installed EyeFlow.app contains the current Mira onboarding flow.");
  console.log(`  - app: ${appPath}`);
  console.log("  - eyeflow-core.js: parse OK");
  console.log("  - eyeflow-recovery-data.js: parse OK");
  console.log("  - eyeflow-session-flow.js: parse OK");
  console.log("  - eyeflow-rest-flow.js: parse OK");
  scriptCounts.forEach(([file, count]) => {
    console.log(`  - ${file}: ${count} inline script(s) parse OK`);
  });
}

try {
  main();
} catch (error) {
  console.error("[smoke:installed] FAILED.", error.message);
  process.exitCode = 1;
}
