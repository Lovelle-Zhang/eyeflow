# EyeFlow Thread Recovery

Use this file if the Codex sidebar loses this conversation.

## Current Workspace

- Project: `/Users/lovellezhang/Projects/codex-project`
- App: EyeFlow
- Current focus: Post-RC polish toward a 9/10 local release state, excluding Developer ID signing and notarization.

## Latest Completed Work

- Reviewed the settings panel with `$mira-visual-critic`.
- Applied `$eyeflow-design-system` changes to make the settings panel quieter and more macOS-native.
- Updated `index.html` settings panel styling:
  - Settings width set to `860px`.
  - Internal settings surfaces use grouped settings language.
  - Main settings card title lowered from display scale to `--ef-text-title-lg`.
  - Settings cards, desktop readiness, and advanced settings use `--group-bg`, `--group-line`, and tokenized spacing.
  - Desktop readiness now reads as a 2x2 grouped row instead of floating nested cards.
- Updated smoke checks in:
  - `scripts/smoke-core.js`
  - `scripts/smoke-installed-app.js`
- Continued 9/10 polish after the settings pass:
  - Medium desktop windows now compact Mira on Today, Settings, and Profile so it does not cover controls.
  - Today view moves compact Mira to the top-right at medium widths to keep session sliders reachable.
  - Break/recovery dialog now uses design-system spacing/radius tokens, has a viewport max-height, and contains overflow on short desktop windows.
  - Browser audits confirmed Today, Profile, Settings, onboarding, and L4 preview have no horizontal overflow or covered controls at the tested 1280x720 viewport.
  - Smoke checks now guard compact Mira behavior and short-window break dialog bounds.
- Continued reliability hardening after the 9/10 pass:
  - Packaged app smoke now parses a structured dashboard layout probe and fails on horizontal overflow or clipped visible controls.
  - Dashboard debug output now emits `[EyeFlow:debug] dashboard view json` for machine-readable app-layout diagnostics.
  - Onboarding debug capture now completes before the rhythm/settings capture to avoid screenshot race flakes in `npm run release:rc`.
- Fixed the desktop companion bubble overflow reported in the 2026-06-12 screenshot:
  - Companion panel window now uses a compact `292x142` layout after stacking the action buttons vertically.
  - Companion bubble/body hides overflow, clamps long copy to three lines, and keeps the continuity/context line inside the panel.
  - Companion context no longer exposes internal baseline math such as `基线 18 · +2`; the bubble now shows user-facing rhythm only, for example `舒适区 · L1 安静`.
  - Companion typography and spacing are tokenized with `--ef-text-helper`, `--ef-text-caption`, `--ef-line-*`, `--ef-space-*`, and `--ef-radius-md`.
  - Installed smoke now guards the compact panel size, vertical action stack, tokenized companion body text, long-copy clamp, and hidden baseline math.
- Hardened packaged smoke after a force-return capture race:
  - Default packaged smoke timeout increased to `64000ms` so the final dashboard force-return capture has time to land.
  - Onboarding debug capture applies a `debug-capture` class to disable blur/transition artifacts during smoke screenshots.
  - Dashboard debug view waits `4500ms` when onboarding capture is active, so onboarding visual smoke and rhythm view capture no longer race.
- Completed EyeFlow 1.4 visual-system lift toward a 9/10 local release state:
  - `index.html` Today first screen now tokenizes the high-frequency state hero, session panel, metrics strip, quick-log panel, daily summary, navigation rhythm, and app icon sizes.
  - Session controls use `--ef-space-*`, `--ef-control-lg`, `--ef-icon-md`, `--ef-radius-md`, and quiet `stroke-width="1.6"`.
  - Metrics, quick-log, daily summary, and Today state surfaces now guard tokenized spacing, text scale, symbol weight, and radius instead of naked `px` values.
  - Quick-log no longer uses inline margin styles for note/actions; the plus/minus control uses `--ef-symbol-weight-base`.
  - All inline SVG strokes in `index.html` have been normalized away from `stroke-width="2"`.
  - Smoke checks now fail if high-frequency areas regress to heavy icon strokes, un-tokenized quick-log controls, un-tokenized metric density, or viewport-scaled state headlines.
- Refactored the EyeFlow settings panel with `$eyeflow-design-system`:
  - `#rhythmView` settings cards, desktop readiness, recovery mode, advanced settings, feedback preview, and mobile settings overrides use `--ef-*` typography, spacing, radius, control, and symbol tokens.
  - Active setting buttons no longer add a floating shadow; selected state relies on restrained contrast.
  - The L1-L4 intervention meter now uses `--ef-space-1`, `--ef-space-2`, and `--ef-radius-pill`.
  - Details plus/minus symbols keep `--ef-symbol-weight-base` and tokenized line height.
  - Installed smoke now guards active-setting restraint and tokenized intervention-meter rhythm.

## Verification

These commands passed:

```bash
npm run verify
npm run release:rc
```

`/Applications/EyeFlow.app` has been updated by the RC flow. Packaged app smoke rendered dashboard, onboarding, settings, rest guide, companion, companion panel, break lock, and force-return captures successfully. Latest packaged smoke also reported `Dashboard layout: view=rhythmView, overflow=0, clipped=0`, feedback copy probe passed, and force preview preserved voice settings.

Latest companion panel capture was visually checked at:

`/var/folders/lw/tm59fff56j90sxpk932lp01c0000gp/T/eyeflow-smoke/eyeflow-companion-panel-capture.png`

The screenshot shows the rest copy, vertically stacked action buttons, and continuity line contained inside the smaller bubble with no text leaking outside the border. The continuity line reads `舒适区 · L1 安静`, confirming baseline math is no longer shown in the bubble.

Latest dashboard capture was visually checked at:

`/var/folders/lw/tm59fff56j90sxpk932lp01c0000gp/T/eyeflow-smoke/eyeflow-dashboard-capture.png`

The Today first screen now reads as a more disciplined macOS-style desktop UI: quieter icon strokes, tokenized status hero, calmer metric strip, cleaner quick-log disclosure, and consistent card density.

## Remaining Known Gate

Public launch still requires Developer ID signing and notarization.

## How To Resume

Tell Codex:

> Continue EyeFlow from `docs/EYEFLOW_THREAD_RECOVERY.md`; inspect git diff and keep polishing from the current working tree.
