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
  const companionHtml = read("companion.html");
  const companionPanelHtml = read("companion-panel.html");
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
    ["companion-panel.html", parseInlineScripts("companion-panel.html")],
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
  assertIncludes(indexHtml, "只在手动专注后接管。预览会以窗口打开，正式开启后会进入全屏恢复。", "installed force confirmation sets preview/fullscreen expectations");
  assertIncludes(indexHtml, "<button class=\"ghost\" id=\"cancelForceBtn\"", "installed force confirmation keeps cancel as a low-weight ghost-tier button");
  assertIncludes(indexHtml, "class=\"settings-preference-rows\"", "installed settings lower controls are grouped as preference rows");
  assertMatches(indexHtml, /#rhythmView \.settings-preference-rows\s*\{[\s\S]*?border-bottom:\s*1px solid var\(--group-line\);/, "installed settings preference rows avoid card borders (tokenized hairline)");
  assertMatches(indexHtml, /<div class="settings-preference-rows">\s*<details class="settings-disclosure-row ef-disclosure-row panel settings-rules-row">[\s\S]*<summary>查看轻提醒规则<\/summary>[\s\S]*<details class="settings-disclosure-row ef-disclosure-row panel advanced-settings system-integration-settings">[\s\S]*<summary>更多设置<\/summary>[\s\S]*<details class="settings-disclosure-row ef-disclosure-row panel advanced-settings system-diagnostic-card">[\s\S]*<summary>反馈与诊断<\/summary>/, "installed settings lower disclosures put reminder rules before tools and diagnostics");
  assertMatches(indexHtml, /#rhythmView \.settings-preference-rows \.tag\[data-state\]\s*\{[\s\S]*min-height:\s*auto;[\s\S]*border:\s*0;[\s\S]*background:\s*transparent;/, "installed settings folded-row status values render as quiet inline text instead of large pills");
  assertMatches(indexHtml, /#rhythmView \.settings-check-list label\s*\{[\s\S]*display:\s*inline-flex;[\s\S]*align-items:\s*center;[\s\S]*min-height:\s*var\(--ef-hit-target\);[\s\S]*white-space:\s*nowrap;/, "installed settings checkbox groups use stable centered inline labels");
  assertMatches(indexHtml, /#rhythmView \.settings-check-list input\[type="checkbox"\]\s*\{[\s\S]*display:\s*block;[\s\S]*width:\s*var\(--ef-icon-sm\);[\s\S]*height:\s*var\(--ef-icon-sm\);[\s\S]*transform:\s*translateY\(calc\(var\(--ef-space-1\) \* -0\.25\)\);/, "installed settings checkbox groups keep native controls small and baseline-aligned");
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
  assertIncludes(indexHtml, ".pet-toast::after", "installed Mira toast renders as a speech bubble");
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
  assertIncludes(indexHtml, "<span>剩余</span>", "installed today metrics explain remaining time as a unified progress value");
  assertIncludes(indexHtml, 'id="eyeLoad">—</strong>', "installed today metrics avoid pseudo-precise zero focused minutes");
  assertIncludes(indexHtml, 'id="focusMinutes">50 分钟</strong>', "installed today metrics use Chinese minute units for the round target");
  assertIncludes(indexHtml, 'id="breakCount">—</strong>', "installed today recovery metric avoids pseudo-precise zero counts");
  assertIncludes(indexHtml, 'id="logCount">—</strong>', "installed today log metric avoids pseudo-precise zero counts");
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
  assertIncludes(companionPanelHtml, "font-size: var(--ef-text-helper);", "installed companion panel uses helper body text token");
  assertIncludes(mainJs, "panel: { width: 292, height: 142 }", "installed companion panel stays compact with vertical actions");
  assertIncludes(companionHtml, "-webkit-line-clamp: 2;", "installed companion bubble keeps copy to two quiet lines");
  assertIncludes(companionPanelHtml, "-webkit-line-clamp: 2;", "installed companion panel keeps copy to two quiet lines");
  assertIncludes(companionPanelHtml, "--popover-line: rgba(255, 255, 255, 0.075);", "installed companion panel uses low-weight popover line");
  assertIncludes(companionPanelHtml, "box-shadow: var(--popover-shadow);", "installed companion panel uses macOS-style popover shadow token");
  assertMatches(companionPanelHtml, /\.bubble\s*\{[\s\S]*border:\s*1px solid var\(--popover-line\);[\s\S]*border-radius:\s*var\(--ef-radius-lg\);/, "installed companion panel reads as a native popover surface");
  assertMatches(companionPanelHtml, /\.panel::before\s*\{[\s\S]*box-shadow:\s*-1px 1px 0 var\(--popover-line\);/, "installed companion panel keeps a low-weight Mira connection tail");
  assertMatches(companionPanelHtml, /\.icon-btn\s*\{[\s\S]*width:\s*var\(--ef-hit-target\);[\s\S]*background:\s*transparent;[\s\S]*border:\s*1px solid transparent;/, "installed companion panel buttons are lightweight icon controls");
  assertMatches(companionPanelHtml, /svg\s*\{[\s\S]*width:\s*var\(--ef-icon-sm\);[\s\S]*stroke-width:\s*var\(--ef-icon-stroke-quiet\);/, "installed companion panel icons use quiet design-system stroke");
  assertNotIncludes(companionPanelHtml, 'stroke-width="2"', "installed companion panel avoids heavy inline icon strokes");
  assertMatches(companionPanelHtml, /\.bubble\s*\{[\s\S]*overflow:\s*hidden;[\s\S]*align-items:\s*start;/, "installed companion panel keeps text inside bubble");
  assertMatches(companionPanelHtml, /\.actions\s*\{[\s\S]*flex-direction:\s*column;/, "installed companion panel stacks actions vertically");
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
  assertIncludes(indexHtml, "首次默认显示；需要时可从这里退出。", "installed settings explains desktop Mira defaults visible but optional");
  assertIncludes(indexHtml, 'desktopMiraVisible ? "退出 Mira" : "显示 Mira"', "installed settings control panel can exit desktop Mira without using the floating avatar");
  assertIncludes(preloadJs, "setEnhancedSensing", "installed preload exposes enhanced sensing IPC");
  assertIncludes(preloadJs, "restartApp", "installed preload exposes restart IPC for stale accessibility authorization");
  assertIncludes(preloadJs, "setCompanionVisible", "installed preload exposes desktop Mira IPC");
  assertMatches(indexHtml, /function isEnhancedSensingActiveForUi\(\)[\s\S]*return latestDesktopSettings\?\.enhancedDesktopSensing === true;/, "installed enhanced sensing UI only treats the effective system-enabled state as active");
  assertNotIncludes(indexHtml, "|| latestDesktopSettings?.enhancedDesktopSensingRequested === true", "installed enhanced sensing UI must not treat the requested state as active");
  assertNotIncludes(indexHtml, "scheduleEnhancedSensingAutoRestart", "installed enhanced sensing UI has no auto-restart loop");
  assertNotIncludes(indexHtml, "ENHANCED_PERMISSION_AUTO_RESTART_COOLDOWN_MS", "installed enhanced sensing UI has no refresh cooldown state");
  assertMatches(indexHtml, /const nextEnabled = !isEnhancedSensingActiveForUi\(\);/, "installed enhanced sensing toggle follows the effective UI state instead of stale saved settings");
  assertMatches(indexHtml, /setSystemStatus\(els\.desktopReadyTag,\s*"enabled",\s*"增强中"\)/, "installed settings shows enhanced sensing as enabled only after the system switch is on");
  assertMatches(indexHtml, /else if \(enhancedSensingRequested\) \{[\s\S]*setSystemStatus\(els\.desktopReadyTag,\s*"action",\s*"需系统开启"\)/, "installed settings has a separate non-enabled state for requested enhanced sensing");
  assertMatches(indexHtml, /els\.readyPermissionTitle\.textContent = enhancedSensing[\s\S]*\? "已开启"[\s\S]*: enhancedSensingRequested[\s\S]*\? "需系统开启"[\s\S]*: "普通模式"/, "installed settings row title separates enabled, system-required, and ordinary states");
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
  assertIncludes(mainJs, "hasCompanionVisibilityPreference", "installed main can migrate old hidden desktop Mira preferences");
  assertIncludes(mainJs, "showCompanionOnLaunch: hasCompanionVisibilityPreference", "installed main defaults desktop Mira visible unless explicitly hidden in the current preference version");
  assertIncludes(mainJs, "next.companionVisibilityPreferenceVersion = COMPANION_VISIBILITY_PREFERENCE_VERSION", "installed main marks explicit desktop Mira visibility choices");
  assertMatches(mainJs, /if \(desktopPreferenceDefaults\(\)\.showCompanionOnLaunch \|\| debugCapture \|\| wantsCurrentVisualCapture\("companion-panel"\)\) \{[\s\S]*createCompanionWindow\(\);[\s\S]*createCompanionPanelWindow\(\);[\s\S]*\}/, "installed main creates companion windows by default unless the user hides Mira");
  assertMatches(mainJs, /function defaultCompanionBounds\(\)[\s\S]*screen\.getPrimaryDisplay\(\)\?\.workArea[\s\S]*x: area\.x \+ area\.width - companionSizes\.compact\.width - 28[\s\S]*y: area\.y \+ area\.height - companionSizes\.compact\.height - 28/, "installed main defaults desktop Mira to the primary workArea bottom-right above the Dock");
  assertMatches(mainJs, /const bounds = settings\.companionBounds \|\| defaultCompanionBounds\(\);[\s\S]*const initialBounds = visibleCompanionBounds/, "installed first desktop Mira appearance uses the bottom-right default when no saved position exists");
  assertMatches(mainJs, /if \(reset\) \{[\s\S]*setBounds\(visibleCompanionBounds\(defaultCompanionBounds\(\)\), false\);[\s\S]*\}/, "installed find Mira resets to the same bottom-right default position");
  assertMatches(mainJs, /label: "显示\/退出 Mira", accelerator: "CommandOrControl\+M", click: toggleCompanionVisibility/, "installed main menu provides keyboard-only Mira show and exit");
  assertMatches(mainJs, /label: "显示\/退出 Mira", click: toggleCompanionVisibility/, "installed tray menu uses the same show and exit Mira action");
  assertMatches(mainJs, /function toggleCompanionVisibility\(\)[\s\S]*desktopPreferenceDefaults\(\)\.showCompanionOnLaunch[\s\S]*hideCompanionWindow\(\);[\s\S]*showCompanion\(\);/, "installed main menu shortcut toggles Mira visibility");
  assertMatches(mainJs, /function hideCompanionWindow\(\{ persistPreference = true \} = \{\}\)[\s\S]*if \(persistPreference\) writeDesktopPreference\("showCompanionOnLaunch", false\);/, "installed temporary companion hides do not persist the hidden preference");
  assertMatches(mainJs, /ipcMain\.handle\("companion:hide", \(\) => \{[\s\S]*hideCompanionWindow\(\{ persistPreference: false \}\);[\s\S]*\}\);/, "installed renderer lifecycle hide keeps desktop Mira default visible");
  assertMatches(mainJs, /function showCompanionBubble\(message, options = \{\}\)[\s\S]*!desktopPreferenceDefaults\(\)\.showCompanionOnLaunch[\s\S]*return \{ ok: false, reason: "hidden" \};/, "installed hidden desktop Mira preference blocks toast bubbles from resurrecting Mira");
  assertIncludes(mainJs, 'const COMPANION_EXIT_HINT_TEXT = "双击我可以退出桌面 Mira";', "installed main has a quiet first-run Mira exit hint");
  assertIncludes(mainJs, "const COMPANION_EXIT_HINT_DURATION_MS = 3800;", "installed main keeps the first-run Mira exit hint brief");
  assertMatches(mainJs, /function maybeShowCompanionExitHint\(\)[\s\S]*settings\.companionExitHintShown === true[\s\S]*markCompanionExitHintShown\(settings\);[\s\S]*showCompanionBubble\(COMPANION_EXIT_HINT_TEXT, \{ durationMs: COMPANION_EXIT_HINT_DURATION_MS \}\)/, "installed main shows the Mira exit hint only once");
  assertMatches(mainJs, /function hideCompanionWindow\(\{ persistPreference = true \} = \{\}\)[\s\S]*if \(persistPreference\) markCompanionExitHintShown\(\);[\s\S]*writeDesktopPreference\("showCompanionOnLaunch", false\);/, "installed persistent Mira exit also dismisses the one-time hint");
  assertMatches(mainJs, /const canReadActiveApp = enhancedDesktopSensing && accessibilityTrusted;[\s\S]*const activeApp = canReadActiveApp \? await getActiveAppName\(\) : "本地计时";/, "installed main does not call System Events unless enhanced sensing is enabled");
  assertIncludes(indexHtml, 'recordOnboardingEvent("quiet_entry_started"', "installed onboarding records lightweight entry without assessment");
  assertNotIncludes(indexHtml, "Mira 初始打分；首轮", "installed onboarding does not create first-run assessment log");
  assertMatches(indexHtml, /els\.sessionStartHint\.textContent\s*=\s*"安静提醒已开始";/, "installed first-run hint confirms quiet reminders");
  assertIncludes(indexHtml, "第一条恢复样本已建立。", "installed recovery records first sample value");
  assertMatches(indexHtml, /\.timer-card\s*\{[\s\S]*gap:\s*var\(--ef-space-5\);[\s\S]*padding:\s*var\(--ef-space-7\) var\(--ef-space-8\);[\s\S]*border-radius:\s*var\(--ef-radius-md\);/, "installed session card uses tokenized rhythm-panel structure");
  assertIncludes(indexHtml, '<h3 id="sessionPanelTitle">这一轮已安排</h3>', "installed session panel title uses current-round language");
  assertMatches(indexHtml, /els\.sessionPanelTitle\.textContent\s*=\s*controls\.panelTitle;/, "installed session panel title follows session state");
  assertIncludes(sessionFlowJs, 'panelTitle: restDue ? "恢复断点" : "本轮节奏"', "installed running session title uses rhythm language");
  assertIncludes(indexHtml, 'return isRunning || elapsedSeconds > 0 ? "本地计时中" : "安静提醒中";', "installed session workflow hint hides first-round timing details");
  assertIncludes(indexHtml, 'return "自动记录中";', "installed auto-tracking hint stays short inside the timer");
  assertIncludes(sessionFlowJs, 'panelTitle: autoTracking ? "本轮节奏"', "installed auto-tracking panel title stays secondary to the main state");
  assertIncludes(sessionFlowJs, "切到手动专注并从 00:00 计时", "installed auto-tracking start title explains reset action");
  assertNotIncludes(indexHtml, "手动从 00:00", "installed auto-tracking hint avoids internal reset wording");
  assertMatches(indexHtml, /\.timer-inner span\s*\{[\s\S]*white-space:\s*nowrap;[\s\S]*text-overflow:\s*ellipsis;/, "installed timer hint stays on one line");
  assertMatches(indexHtml, /\.session-state-pill\s*\{[\s\S]*width:\s*fit-content;[\s\S]*border:\s*0;[\s\S]*border-radius:\s*var\(--ef-radius-md\);[\s\S]*min-height:\s*var\(--ef-control-sm\);[\s\S]*background:\s*var\(--mode-pill-bg\);/, "installed mode/state pill is the low-key tonal sage pill (no border)");
  assertMatches(indexHtml, /\.timer-card > \.timer-controls \.primary,[\s\S]*\.timer-card > \.timer-controls \.btn-tonal\s*\{[\s\S]*min-height:\s*var\(--ef-control-lg\);/, "installed session timer controls (primary + ② tonal) go large at 40px");
  assertMatches(indexHtml, /\.timer-card \.small-icon\s*\{[\s\S]*width:\s*var\(--ef-icon-sm\);[\s\S]*height:\s*var\(--ef-icon-sm\);[\s\S]*stroke-width:\s*var\(--ef-icon-stroke-base\);/, "installed session controls use quiet design-system icon size");
  assertMatches(indexHtml, /\.session-settings\s*\{[\s\S]*gap:\s*var\(--ef-space-4\);[\s\S]*padding:\s*var\(--ef-space-0\);[\s\S]*border-radius:\s*var\(--ef-radius-md\);/, "installed session settings stay compact when folded");
  assertMatches(indexHtml, /\.session-settings summary\s*\{[\s\S]*color:\s*var\(--ink\);[\s\S]*font-size:\s*var\(--text-base\);[\s\S]*font-weight:\s*var\(--ef-symbol-weight-base\);/, "installed rhythm tuning summary matches the primary quick-log hierarchy");
  assertMatches(indexHtml, /\.session-settings\[open\]\s*\{[\s\S]*padding:\s*var\(--ef-space-3\) var\(--ef-space-5\);[\s\S]*border-top:\s*1px solid var\(--group-line-soft\);/, "installed session settings expand into a full-width setting area");
  assertMatches(indexHtml, /<details class="session-settings">[\s\S]*<summary>调整节奏<\/summary>/, "installed rhythm tuning is folded below the primary rhythm row");
  assertIncludes(indexHtml, 'const restButtonIcon = \'<svg class="small-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"', "installed rest action icon uses quiet stroke weight");
  assertMatches(indexHtml, /\.metrics\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\) repeat\(2,\s*minmax\(calc\(var\(--ef-space-14\) \* 1\.6\),\s*0\.18fr\)\);[\s\S]*background:\s*var\(--panel\);[\s\S]*border:\s*0\.5px solid var\(--group-line\);[\s\S]*box-shadow:\s*var\(--group-shadow\);/, "installed metrics render as one quiet integrated progress strip");
  assertMatches(indexHtml, /\.metrics \.metric\s*\{[\s\S]*padding:\s*var\(--ef-space-2\) var\(--ef-space-5\);[\s\S]*min-height:\s*calc\(var\(--ef-control-lg\) \+ var\(--ef-space-2\)\);/, "installed metrics cells use low-burden signal density");
  assertMatches(indexHtml, /\.metrics \.metric strong\s*\{[\s\S]*font-size:\s*var\(--ef-text-body\);[\s\S]*line-height:\s*var\(--ef-line-title\);/, "installed secondary metrics avoid KPI-scale type");
  assertMatches(indexHtml, /\.metric-main\s*\{[\s\S]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);[\s\S]*gap:\s*var\(--ef-space-0\);/, "installed round progress groups focused, remaining, and target together");
  assertMatches(indexHtml, /\.metric-pair \+ \.metric-pair\s*\{[\s\S]*border-left:\s*1px solid var\(--group-line\);/, "installed round progress uses quiet internal dividers");
  assertIncludes(indexHtml, "els.focusMinutes.textContent = `${focusTargetMinutes} 分钟`;", "installed round target runtime unit stays Chinese");
  assertMatches(indexHtml, /els\.loadBand\.textContent = remainingMinutes > 0[\s\S]*`\$\{remainingMinutes\} 分钟`[\s\S]*:\s*"休息点";/, "installed remaining runtime unit stays Chinese");
  assertIncludes(indexHtml, "今日专注 0 分钟 · 你记录了 2 次", "installed summary separates focused time from user records");
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
  assertMatches(indexHtml, /body\.session-active #todayView \.health-signals,[\s\S]*body\.session-active #todayView \.note-dashboard,[\s\S]*body\.session-active #todayView \.daily-summary\s*\{[\s\S]*width:\s*min\(100%,\s*var\(--page-frame-width\)\);[\s\S]*justify-self:\s*start;/, "installed today active secondary modules align to the shared page frame");
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
  assertMatches(indexHtml, /#todayView \.health-signals\s*\{[\s\S]*margin-top:\s*var\(--ef-space-8\);/, "installed today lower signals do not create a blank first screen");
  assertMatches(indexHtml, /body:not\(\.session-active\) #todayView \.state-center \.timer-card\s*\{[\s\S]*display:\s*none;/, "installed today hides timer panel before focus starts");
  assertMatches(indexHtml, /body:not\(\.session-active\) #todayView \.health-signals\s*\{[\s\S]*display:\s*none;/, "installed today hides metric strip before focus starts");
  assertMatches(indexHtml, /body:not\(\.session-active\) #todayView details\.quick-log-panel,[\s\S]*body:not\(\.session-active\) #todayView \.daily-summary\s*\{[\s\S]*display:\s*none;/, "installed today hides secondary panels before focus starts");
  assertMatches(indexHtml, /els\.stateHeadline\.textContent\s*=\s*"准备开始这一轮"/, "installed today main state uses a preparation headline");
  assertMatches(indexHtml, /els\.stateAction\.textContent\s*=\s*"Mira 会陪你记得休息。"/, "installed today main state leads with Mira's companion role");
  assertMatches(indexHtml, /els\.stateExplain\.textContent\s*=\s*"开始后，她会安静待在旁边。"/, "installed today explains Mira presence without repeating timer copy");
  assertIncludes(indexHtml, 'els.stateHeadline.textContent = autoTracking ? "正在记录这一轮" : "这一轮进行中";', "installed running state separates auto and manual session meaning");
  assertIncludes(indexHtml, '? "保持当前节奏。"', "installed auto session uses rhythm copy instead of repeated timer copy");
  assertIncludes(indexHtml, ': "先把注意力留给当前任务。";', "installed manual session focuses the current task");
  assertIncludes(indexHtml, 'els.stateExplain.textContent = "需要休息时，Mira 再轻提醒。";', "installed running state explains reminder once");
  assertNotIncludes(indexHtml, '"本地计时中。"', "installed running hero does not repeat the timer status copy");
  assertNotIncludes(indexHtml, '"到休息点再提醒你。"', "installed running hero does not repeat the reminder copy");
  assertMatches(indexHtml, /els\.todayFlowCopy\.hidden\s*=\s*true;/, "installed today hides secondary rhythm explanation from first glance");
  assertIncludes(indexHtml, 'focusTarget: 50', "installed today default rhythm starts from 50 minutes");
  assertIncludes(indexHtml, 'id="focusTarget" type="range" min="20" max="70" step="5" value="50"', "installed today focus control keeps room around Mira judgement");
  assertIncludes(indexHtml, 'id="breakTarget" type="range" min="60" max="300" step="30" value="120"', "installed today recovery control keeps a wider manual span");
  assertMatches(indexHtml, /\.today-plan\s*\{[\s\S]*display:\s*none;/, "installed today plan is downgraded out of the first screen");
  assertIncludes(indexHtml, '<span class="state-label" id="stateBand">已专注 0 分钟</span>', "installed state band shows focused time without a pseudo score");
  assertIncludes(indexHtml, "Mira 会陪你记得休息。", "installed today first glance keeps Mira as the remembered subject");
  assertIncludes(indexHtml, "开始这一轮 →", "installed today first glance uses a lighter link-like primary action");
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
  assertMatches(indexHtml, /\.mira-intro \.pet\s*\{[\s\S]*--mira-intro-avatar-scale:\s*1\.24;[\s\S]*width:\s*calc\(var\(--ef-space-14\) \+ var\(--ef-space-7\)\);[\s\S]*height:\s*calc\(var\(--ef-space-14\) \+ var\(--ef-space-7\)\);[\s\S]*border-radius:\s*var\(--ef-radius-pill\);[\s\S]*radial-gradient\(circle/, "installed onboarding Mira reads as a larger round avatar instead of an app icon tile");
  assertMatches(indexHtml, /\.mira-intro \.pet-mouth\s*\{[\s\S]*top:\s*42px;[\s\S]*width:\s*8px;[\s\S]*height:\s*5px;[\s\S]*border-bottom-width:\s*1\.5px;/, "installed onboarding Mira mouth stays as a soft short smile");
  assertMatches(indexHtml, /\.break-overlay\.feedback-mode \.break-mira \.pet-mouth\s*\{[\s\S]*top:\s*42px;[\s\S]*width:\s*8px;[\s\S]*height:\s*5px;[\s\S]*border-bottom:\s*1\.5px solid rgba\(15,\s*159,\s*122,\s*0\.58\);/, "installed feedback Mira mouth follows the soft short smile standard");
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
  assertMatches(indexHtml, /function\s+handlePrimaryAction\(\)\s*\{[\s\S]*clearFirstRoundLanding\(\);[\s\S]*startSession\(\);[\s\S]*focusSessionPanel\(\{\s*focusTarget:\s*"panel"\s*\}\);/, "installed hero primary action starts workflow immediately");
  assertIncludes(preloadJs, "onDashboardFocus", "installed preload exposes dashboard focus IPC");
  assertMatches(mainJs, /function\s+sendDashboardFocus\(payload = \{\}\)[\s\S]*dashboardWindow\.webContents\.send\("dashboard:focus"/, "installed main process forwards dashboard focus requests");
  assertMatches(indexHtml, /onDashboardFocus\?\.\(\(payload = \{\}\) => \{[\s\S]*focusManualStartEntry\(\);/, "installed dashboard focus can locate the manual start entry");
  assertMatches(indexHtml, /function\s+focusManualStartEntry\(\)[\s\S]*switchView\("todayView"\)[\s\S]*focusSessionPanel\(\{\s*focusTarget:\s*"start"\s*\}\)/, "installed manual start focus opens Today and targets the session action");
  assertMatches(indexHtml, /function\s+toggleSession\(\)\s*\{[\s\S]*clearFirstRoundLanding\(\);/, "installed session action clears first-round hint");
  assertMatches(indexHtml, /function\s+showBreak\(reason\)\s*\{[\s\S]*clearFirstRoundLanding\(\);/, "installed break action clears first-round hint");

  assertMatches(companionHtml, /(?:^|\n)\s*\.mouth\s*\{[\s\S]*top:\s*44px;[\s\S]*width:\s*9px;[\s\S]*height:\s*5px;[\s\S]*border-bottom:\s*var\(--mira-line\) solid var\(--mira-mouth\);/, "installed desktop Mira mouth follows the soft short smile standard");
  assertMatches(companionHtml, /currentMood\s*===\s*"rest"[\s\S]*openDashboard\(\{\s*restGuide:\s*true\s*\}\);/, "installed pink Mira click opens rest guide");
  assertIncludes(companionHtml, "点我会打开休息指引。", "installed pink Mira copy");
  assertMatches(companionHtml, /companion\.addEventListener\("dblclick"[\s\S]*setCompanionVisible\?\.\(false\)/, "installed desktop Mira double-click persists hidden visibility");
  assertIncludes(companionHtml, 'id="contextLine"', "installed companion renders continuity context");
  assertIncludes(companionPanelHtml, 'id="contextLine"', "installed companion panel renders continuity context");
  assertIncludes(companionPanelHtml, "state.continuityLine", "installed companion panel consumes continuity context");
  assertIncludes(companionPanelHtml, 'title="打开手动专注"', "installed companion panel labels the manual start jump");
  assertMatches(companionPanelHtml, /showDashboard\(\{\s*view:\s*"todayView",\s*focus:\s*"manualStart"\s*\}\)/, "installed companion panel opens directly to the manual start entry");
  assertIncludes(indexHtml, 'continuityLine: `${classifyLoad(load)} · ${intensityLabel(state.settings.intensity || "quiet")}`', "installed companion context avoids baseline math");
  assertIncludes(companionHtml, "function shouldNotifyRest", "installed companion gates rest notifications");
  assertIncludes(companionHtml, "restNotifyCooldown = 12 * 60 * 1000", "installed companion rest notifications have a cooldown");
  assertMatches(companionHtml, /if \(state\.forceMode \|\| state\.forceBreakActive\) return false;/, "installed force mode suppresses companion rest notifications");
  assertMatches(companionHtml, /state\.allowSystemNotify !== true/, "installed companion respects notification setting");
  assertIncludes(indexHtml, "max-height: calc(100vh - var(--ef-space-12));", "installed break dialog stays inside short desktop windows");
  assertIncludes(indexHtml, "overscroll-behavior: contain;", "installed break dialog scroll is contained");
  assertIncludes(companionPanelHtml, "anchor-top", "installed panel top anchor");
  assertIncludes(companionPanelHtml, "anchor-bottom", "installed panel bottom anchor");
  assertIncludes(breakLockHtml, "再点一次确认退出", "installed break lock emergency exit requires confirmation");
  assertIncludes(breakLockHtml, "interrupted: true", "installed break lock reports interrupted force exits");
  assertIncludes(indexHtml, "Mira 先只改变状态和颜色；到恢复断点再短暂提示。", "installed L2 early phase stays visual-only");
  assertIncludes(indexHtml, "强制爱临时退出", "installed force emergency exit has cooldown copy");
  assertIncludes(indexHtml, "Mira Insight", "installed profile review opens with Mira insight");
  assertIncludes(indexHtml, "先完成几轮，Mira 再给建议。", "installed first-day profile uses a direct empty state");
  assertIncludes(indexHtml, "先完成几轮专注和恢复。之后这里会整理出更适合你的提醒节奏。", "installed first-day profile defers analysis until there is usage evidence");
  assertIncludes(indexHtml, 'els.profileLoad.textContent = hasProfileEvidence ? load : "记录中";', "installed first-day profile does not expose a premature score");
  assertIncludes(indexHtml, 'profilePlanTitle(nextAction, suggestion)', "installed first-day profile uses the plain next-round plan title");
  assertIncludes(indexHtml, 'els.profileTrendTag.textContent = "样本建立中";', "installed first-day profile avoids a premature stable verdict");
  assertIncludes(indexHtml, 'classList.toggle("profile-building", !hasProfileEvidence)', "installed first-day profile gets a dedicated low-evidence visual state");
  assertMatches(indexHtml, /#profileView\.profile-building \.profile-detail-fold\s*\{[\s\S]*display:\s*none;/, "installed first-day profile hides the whole detail fold");
  assertIncludes(indexHtml, "下一轮建议", "installed profile review answers the next-round plan directly");
  assertNotMatches(indexHtml, /<span class="profile-trend-tag" id="profileTrendTag">/, "installed profile insight header removes the duplicated overall-state chip");
  assertIncludes(indexHtml, "主要感受", "installed profile review uses a user-facing signal label");
  assertIncludes(indexHtml, "<span>提醒时间</span>", "installed profile review labels the reminder timing directly");
  assertIncludes(indexHtml, "<span>休息时间</span>", "installed profile review labels the rest timing directly");
  assertIncludes(indexHtml, "Mira 把这几天整理成一个可执行的节奏。", "installed profile insight subtitle explains the job in plain language");
  assertMatches(indexHtml, /function\s+profilePlanTitle[\s\S]*return "保持轻提醒节奏";/, "installed profile recommendation headline renders one qualitative next action");
  assertNotMatches(indexHtml, /function\s+profilePlanTitle\([^)]*\)\s*\{(?:(?!function)[\s\S])*?suggestion\.focus/, "installed profile headline leaves the exact 分钟/秒 to the spec column");
  assertIncludes(indexHtml, "今日分享卡", "installed profile review adds a daily share card");
  assertIncludes(indexHtml, 'class="profile-score-inline" hidden=""', "installed profile review hides technical status signal from main flow");
  assertMatches(indexHtml, /<div class="profile-share-bridge"[^>]*><span>今天就到这里了<\/span><\/div>\s*<section class="panel profile-share-card"/, "installed profile share card has a ritual transition after rhythm memory");
  assertMatches(indexHtml, /#profileView \.profile-share-bridge\s*\{[\s\S]*display:\s*flex;[\s\S]*font-size:\s*var\(--ef-text-body-sm\);[\s\S]*font-weight:\s*var\(--ef-symbol-weight-base\);/, "installed profile share transition uses quiet tokenized text");
  assertMatches(indexHtml, /#profileView \.profile-share-bridge::before,[\s\S]*#profileView \.profile-share-bridge::after\s*\{[\s\S]*height:\s*1px;[\s\S]*background:\s*var\(--group-line\);/, "installed profile share transition uses quiet, theme-adaptive divider lines");
  assertMatches(indexHtml, /<div class="profile-share-head">[\s\S]*<div class="profile-share-quick-metrics"[\s\S]*id="shareFocusTime"[\s\S]*id="shareBreaks"[\s\S]*<span class="profile-trend-tag">可分享<\/span>[\s\S]*<\/div>\s*<\/div>/, "installed profile share card exposes focus and rest in the first row");
  assertIncludes(indexHtml, 'class="profile-share-preview"', "installed profile share card renders a visual card preview");
  assertMatches(indexHtml, /#profileView \.share-art-card \{[\s\S]*?background:\s*var\(--group-bg-strong\);/, "installed profile share card preview follows the theme surface (no fixed bright block in dark)");
  assertIncludes(indexHtml, "shareCardRhythm", "installed profile share card exposes rhythm as the third data point");
  assertIncludes(indexHtml, "eyeflow.app", "installed profile share card includes restrained domain branding");
  assertMatches(indexHtml, /#profileView \.share-art-mark\s*\{[\s\S]*border-radius:\s*var\(--ef-radius-lg\);[\s\S]*linear-gradient\(145deg,\s*#d8fff1 0%,\s*#bdeaff 58%,\s*#f4efc7 100%\);/, "installed profile share card uses the real rounded-square app icon mark");
  assertMatches(indexHtml, /#profileView \.share-art-mark::after\s*\{[\s\S]*background:\s*#62d6ae;/, "installed profile share card app icon keeps the green status dot");
  assertIncludes(indexHtml, "带走这张卡", "installed profile share card uses a card-level copy action");
  assertNotIncludes(indexHtml, "带走这一句", "installed profile share card no longer frames sharing as copying one sentence");
  assertNotIncludes(indexHtml, "复制分享文案", "installed profile share card avoids internal copywriting language");
  assertIncludes(indexHtml, "只复制卡片，不上传数据。", "installed profile share card keeps privacy copy beside the action");
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
  assertMatches(indexHtml, /function\s+drawShareMiraMark\([\s\S]*iconGradient\.addColorStop\(0,\s*"#d8fff1"\);[\s\S]*iconGradient\.addColorStop\(0\.58,\s*"#bdeaff"\);[\s\S]*iconGradient\.addColorStop\(1,\s*"#f4efc7"\);[\s\S]*"#62d6ae"/, "installed profile share image draws the real app icon mark");
  assertMatches(indexHtml, /function\s+drawDailyShareCardCanvas\([\s\S]*canvas\.width = 1200;[\s\S]*canvas\.height = 720;[\s\S]*#f5f3ee[\s\S]*eyeflow\.app/, "installed profile share image draws a textured card artifact");
  assertMatches(indexHtml, /window\.eyeflowDesktop\?\.copyShareImage[\s\S]*generateDailyShareImageDataUrl\(\)/, "installed profile share action copies the generated image card first");
  assertMatches(indexHtml, /function\s+buildDailyShareText\(\)[\s\S]*今日专注[\s\S]*节奏[\s\S]*Mira 今日小句/, "installed profile share fallback text includes focus, rhythm, rest, and Mira line");
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
  assertIncludes(indexHtml, "function recordedSecondsForDay", "installed profile duration uses the strongest available local timing signal");
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
