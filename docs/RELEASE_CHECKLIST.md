# EyeFlow Release Candidate Checklist

This checklist keeps EyeFlow ready while Apple Developer registration is blocked. Treat it as two gates: the unsigned RC gate we can run now, and the signed public gate that opens after Developer ID access is ready.

## RC Gate While Waiting For Developer ID

- Run `npm run release:rc` after product-facing changes.
- Confirm the command passes source smoke checks, app bundle build, local install, installed-app smoke, and finished-app UI smoke.
- Use `npm run release:rc:artifacts` only when you need fresh unsigned DMG/ZIP artifacts for trusted private testers; this path uses `hdiutil` for the temporary unsigned DMG.
- Keep unsigned builds limited to trusted testers using `docs/BETA_INSTALL_GUIDE.md`.
- Do not publish publicly until `npm run release:public` passes with Developer ID signing.

## Public Gate After Developer ID

- Apple Developer Program membership is active.
- Developer ID Application certificate is available in the build keychain or CI secrets.
- Notarization credentials are configured as described in `docs/CODESIGN_NOTARIZE.md`.
- Run `npm run release:public`.
- Confirm `npm run launch:preflight` passes without `--allow-unsigned`.
- Upload `dist/release/v0.1.0` contents as the release candidate package.

## Build Artifacts

- App RC command: `npm run release:rc`
- Unsigned artifact RC command: `npm run release:rc:artifacts`
- Public signed release command: `npm run release:public`
- Packaged-app smoke command: `npm run smoke:app`
- App bundle: `dist/mac/EyeFlow.app`
- DMG installer: `dist/EyeFlow-0.1.0-x64.dmg`
- ZIP archive: `dist/EyeFlow-0.1.0-x64.zip`
- Current release notes: `docs/RELEASE_NOTES_v0.1.0.md`
- Desktop experience QA should use the finished EyeFlow app bundle, not `npm start` / the generic Electron development shell.

## Identity

- App name is `EyeFlow`.
- Robot companion name is `Mira`.
- Dock icon, sidebar logo, tray/menu name, About panel, and installer name all use EyeFlow.
- Old prototype names must not appear in new build artifacts.

## First Open

- Daily Mira assessment appears on first open of the day.
- First-open Mira assessment clearly states local storage, no content reading, and non-medical boundaries.
- Completing assessment starts the first focus round from `00:00`.
- Skipping assessment leaves a quiet calibration callout on Today.
- Mira appears as the desktop companion and can be restored with `找回 Mira`.
- Recent installed-app smoke test confirmed EyeFlow opens from `/Applications` and Mira is visible.

## Core Flow

- `开始手动专注` starts manual focus with one click.
- Pause/resume works with one click.
- Normal rest shows ordinary finish/snooze actions.
- `强制爱` requires explicit confirmation before enabling.
- `强制爱` preview and real recovery hide return until the countdown completes.
- Desktop `强制爱` uses true kiosk fullscreen: no menu bar or Dock during countdown.
- Recovery modes change the Mira-led task sequence.
- Strong rest voice guidance uses short task-specific voice cues and a slower macOS `say` rate for calmer pacing.
- Full-screen recovery completion changes to a clear return state, focuses `回到 EyeFlow`, and avoids native blue/yellow focus rings.
- Recent installed-app smoke test confirmed pause/resume, ordinary rest, and `强制爱` preview.

## Desktop Product Controls

- macOS menu includes `打开 EyeFlow`, `显示 Mira`, `找回 Mira`, `开机自动启动`, and `关于 EyeFlow`.
- Tray menu includes the same core controls.
- Settings shows a visible `桌面就绪` panel with accessibility permission, launch-at-login state, current version, notification channel, and refresh/open/toggle actions.
- Accessibility permission copy explains that EyeFlow only uses current app and idle-time signals, not document content, keyboard input, or camera access.
- Settings shows a `反馈与诊断` card that copies a structured local diagnostic feedback template.
- Settings `更多设置` shows version and startup-at-login state.
- Startup-at-login can be toggled from Settings and menu, and both stay in sync.
- Closing the dashboard hides it; reopening from Dock/menu/tray restores it.

## 2026-06-05 Development QA

- Static checks passed: `node --check main.js`, `node --check preload.js`, and `git diff --check`.
- Finished-app smoke test target: `dist/mac/EyeFlow.app`.
- Finished-app window query confirmed the running process is `EyeFlow`, with `Mira` and `EyeFlow - 低打扰恢复系统` windows created.
- `npm run build:mac` successfully regenerated `dist/mac/EyeFlow.app` and ZIP; DMG helper download stalled in this environment.
- Fallback `hdiutil` DMG was generated from the current app bundle, image info passed, mounted contents showed `EyeFlow.app` plus `/Applications`, and the volume detached cleanly.
- Final DMG smoke test launched `/Volumes/EyeFlow/EyeFlow.app`; `EYEFLOW_DEBUG_CAPTURE=1` internal captures confirmed dashboard, Mira, and the Mira panel render correctly from the packaged app.
- Fixed a QA-found lifecycle edge case where companion cleanup could call `hide()` on destroyed Electron windows.
- Fixed a QA-found dashboard recovery gap by clamping saved dashboard bounds back onto the visible work area before showing.
- Rest-guide IPC path is wired consistently: desktop Mira sends `restGuide`, main process emits `dashboard:restGuide`, and Today focuses the rest action.
- Packaged-app debug run confirmed the pink/rest Mira click path: `EYEFLOW_DEBUG_REST_CLICK=1` made Mira rest/pink, simulated the avatar click, focused `休息`, and showed the rest-guide toast.
- 2026-06-06 packaged-app debug run confirmed the rest-guide path also works before today's assessment: the daily calibration overlay is closed first, `休息` receives focus, and the rest-guide toast remains visible.
- L3+ rest-guide QA confirmed the session card, `休息` button, and inline hint receive temporary pink emphasis while recovery still requires the user's click.
- Pre-assessment recovery completion now returns with a gentle reminder to score today's eye state instead of immediately reopening the calibration overlay.
- 2026-06-06 packaged-app Settings QA confirmed `EYEFLOW_DEBUG_CAPTURE=1 EYEFLOW_DEBUG_VIEW=rhythmView` opens the finished app to Settings and captures the new `桌面就绪` panel without overlap or text overflow.
- 2026-06-06 packaged-app Settings QA confirmed notification-channel status renders in `桌面就绪`; unsupported system notifications fall back to Mira state/audio cues.
- Advanced notification settings include a `测试通知` action; the IPC returns success/support status so the UI can confirm delivery or explain fallback behavior.
- Diagnostic feedback template includes desktop version, platform, accessibility status, launch-at-login status, notification support, disturbance boundary, recovery mode, current load, focus time, and user prompts.
- Packaged-app Settings QA can use `EYEFLOW_DEBUG_COPY_FEEDBACK=1` with `EYEFLOW_DEBUG_VIEW=rhythmView` to verify the feedback template copies through the desktop clipboard bridge.
- Packaged-app first-open QA can use `EYEFLOW_DEBUG_ONBOARDING=1 EYEFLOW_DEBUG_CAPTURE=1` to capture the Mira assessment without mutating today's saved assessment.
- `npm run smoke:app` runs the finished `dist/mac/EyeFlow.app`, saves Electron internal captures to `/private/tmp/eyeflow-smoke`, verifies dashboard/Mira/panel/fullscreen recovery/return captures, and exits the app after the check.
- `npm run launch:preflight` verifies release docs, DMG/ZIP freshness, SHA256 checksums, clean release staging, Developer ID signing, and Gatekeeper assessment.
- `node scripts/launch-preflight.js --allow-unsigned` is available only for local preparation before Apple Developer signing credentials are configured.
- 2026-06-06 packaged-app smoke script passed and verified all required captures, including the full-screen recovery completion state; the force-preview probe logged `voicePreserved: true`.
- 2026-06-06 packaged-app force-rest QA confirmed `EYEFLOW_DEBUG_CAPTURE=1 EYEFLOW_DEBUG_FORCE_PREVIEW=1` triggers a silent 15-second full-screen recovery preview and captures the break-lock page with task flow and timer rendered.
- 2026-06-06 packaged-app completion QA confirmed `/private/tmp/eyeflow-break-lock-complete-capture.png` shows the clear return state, complete task flow, `00:00` timer, and mint focus style on the return button.
- 2026-06-06 packaged-app preview-return QA confirmed `EYEFLOW_DEBUG_FORCE_PREVIEW=1` waits for `回到 EyeFlow`, clicks it, returns to Settings, and captures `/private/tmp/eyeflow-dashboard-force-return-capture.png` with the preview-complete hint visible.
- 2026-06-06 packaged-app debug hygiene QA confirmed `EYEFLOW_DEBUG_FORCE_PREVIEW=1` no longer mutates the persisted voice-guide setting; the return probe logged `voicePreserved: true`.
- macOS `screencapture` can return wallpaper-only images in this environment; use EyeFlow internal `capturePage()` debug captures when screen-recording permissions make system screenshots unreliable.

## Known Unsigned RC Notes

- Unsigned RC builds must stay private until Developer ID signing and notarization pass.
- Chrome/browser pages are preview fallbacks; the packaged desktop app is the source of truth for fullscreen recovery.
- If electron-builder cannot download its DMG helper, use the simple `hdiutil` fallback DMG and verify it by running image info, mounting it, checking `EyeFlow.app` plus the `/Applications` link, and detaching the volume.
