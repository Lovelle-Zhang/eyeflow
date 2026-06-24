# EyeFlow Changelog - 2026-06-06

## Rest Guidance QA

- Added packaged-app debug switches for repeatable desktop QA:
  - `EYEFLOW_DEBUG_CAPTURE=1` saves Electron internal window captures.
  - `EYEFLOW_DEBUG_CAPTURE_DIR=/path` overrides the capture output directory.
  - `EYEFLOW_DEBUG_VIEW=rhythmView` opens the packaged dashboard to Settings for visual QA captures.
  - `EYEFLOW_DEBUG_COPY_FEEDBACK=1` copies the diagnostic feedback template during Settings QA and logs a feedback probe.
  - `EYEFLOW_DEBUG_ONBOARDING=1` opens the packaged dashboard with today's Mira assessment visible for first-open visual QA.
  - `EYEFLOW_DEBUG_REST_CLICK=1` forces Mira into the pink rest state and simulates the avatar click.
  - `EYEFLOW_DEBUG_FORCE_PREVIEW=1` triggers a silent 15-second packaged-app force-rest preview and captures the full-screen recovery page.
- Added `npm run smoke:app`, a repeatable packaged-app smoke test that launches `dist/mac/EyeFlow.app`, captures dashboard/Mira/panel/fullscreen recovery/return views into `/private/tmp/eyeflow-smoke`, validates the PNG outputs, writes a log, and quits the app.
- Stabilized the force-preview debug return path so completion-state capture is saved before the script clicks `回到 EyeFlow`.
- Confirmed `npm run smoke:app` passes against the finished app bundle and validates all required captures, including `eyeflow-break-lock-complete-capture.png`.
- Added a first-open trust strip to Mira assessment: local storage, no content reading, and non-medical reminder boundaries are visible before the user scores their eyes.
- Clarified Accessibility permission copy across onboarding and Settings: EyeFlow uses it only for current app and idle-time detection, not document content, keyboard input, or camera access.
- Confirmed the pink/rest Mira click path in the finished `EyeFlow.app`: Mira opens EyeFlow, focuses `休息`, and shows the rest-guide toast.
- Promoted the pink/rest Mira click path into `npm run smoke:app`: the packaged-app smoke test now requires `eyeflow-dashboard-rest-guide-capture.png` before the force-rest preview begins.
- Fixed a first-open edge case where today's Mira calibration overlay could cover the rest guide after clicking pink Mira. Rest-guide events now close the calibration overlay first, then focus `休息`.
- Added level-aware rest guidance: L3+ rest-guide events briefly highlight the session card and `休息` button in pink so the next action is unmistakable without auto-starting recovery.
- Added a short inline hint below the rest action during L3+ rest guidance so the instruction remains visible even if the toast fades.
- When a user rests before completing today's Mira assessment, recovery completion now gently reminds them to come back and score today's eye state instead of immediately reopening the calibration overlay.

## Desktop Readiness

- Added a visible `桌面就绪` panel on the Settings view so testers can see accessibility permission, launch-at-login state, and app version without opening advanced settings.
- Added direct actions for opening Accessibility settings, toggling launch-at-login, and refreshing desktop status after a permission change.
- Added notification-channel status to `桌面就绪`; EyeFlow now reports whether system notifications are supported and falls back to Mira state/audio cues when unavailable.
- Added notification status copy inside advanced notification settings and disables the system notification toggle when Electron reports notifications are unsupported.
- Added a `测试通知` action in advanced notification settings; the desktop notification IPC now returns `{ ok, supported }` so the UI can confirm success or explain fallback behavior.
- Added a `反馈与诊断` card in Settings. It copies a structured local diagnostic feedback template with version, platform, permission, launch-at-login, notification support, disturbance boundary, recovery mode, current load, focus time, and open-ended user questions.
- Added a local recent-diagnostics summary to `反馈与诊断`: the copied template now includes the latest window load, renderer, main-process, and voice-guide issues kept in memory, without uploading anything automatically.
- Preserved notification-support status when activity updates refresh permission copy, so Settings keeps reporting the correct notification channel after desktop activity events.
- Repositioned public and in-app copy around `轻提醒恢复系统`: Settings now says `提醒边界`, rhythm copy talks about `恢复断点`, and Mira's default language emphasizes light reminders instead of generic reminders.
- Increased packaged-app smoke timeout so the combined pink-Mira rest path plus 15-second force-recovery preview has enough time to capture completion and return states.
- Added a sidebar `复盘` entry and lightweight `7 天轻提醒复盘` panel, summarizing active days, completed recoveries, handled interventions, peak load, and a short Mira recommendation.
- Packaged-app QA confirmed `EYEFLOW_DEBUG_CAPTURE=1 EYEFLOW_DEBUG_VIEW=rhythmView` opens the finished `EyeFlow.app` to Settings and saves `/private/tmp/eyeflow-dashboard-rhythmView-capture.png` with the readiness panel rendered correctly.
- Reworked the visual palette around eye comfort: reduced pure-white surfaces, lowered high-saturation green/pink/amber states, softened dashboard surfaces, Mira avatars, and the full-screen recovery page so the product itself feels lower-glare and more aligned with eye-care positioning.

## Voice Guidance

- Added short `voiceCue` lines to Mira recovery tasks so voice guidance uses calm spoken prompts instead of reading longer on-screen descriptions.
- Slowed the macOS `say` voice guide from 165 to 150 words per minute for a gentler recovery rhythm.
- Packaged-app QA confirmed `EYEFLOW_DEBUG_CAPTURE=1 EYEFLOW_DEBUG_FORCE_PREVIEW=1` opens the finished app into a 15-second full-screen recovery preview and saves `/private/tmp/eyeflow-break-lock-capture.png`.
- Improved the full-screen recovery completion state: the page now changes to a clear `可以慢慢回来了` message, marks the task flow complete, focuses the return button, and uses EyeFlow's soft mint focus style instead of the native blue ring.
- Packaged-app QA confirmed `/private/tmp/eyeflow-break-lock-complete-capture.png` renders the completion state correctly.
- Improved the force-rest preview return path: after clicking `回到 EyeFlow`, the dashboard returns to Settings, keeps the force-rest confirmation visible, and shows a state-aware preview-complete hint.
- Made `EYEFLOW_DEBUG_FORCE_PREVIEW=1` poll for the return button before clicking it, then capture `/private/tmp/eyeflow-dashboard-force-return-capture.png` for end-to-end packaged-app QA.
- Changed `EYEFLOW_DEBUG_FORCE_PREVIEW=1` to launch a silent preview payload without mutating persisted user settings; the packaged-app QA probe now logs `voicePreserved: true` when the voice-guide toggle is unchanged after return.

## Handoff

- Updated `HANDOFF.md` so it reflects the current recovery library, Mira visibility work, packaged-app QA flow, and remaining real risks.
