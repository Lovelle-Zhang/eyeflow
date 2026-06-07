# EyeFlow Changelog - 2026-06-05

## Recovery Library

- Expanded the forced-rest recovery library with slow breathing, palm-cover darkness, jaw release, and shoulder-blade release steps.
- Added a `呼吸` recovery mode for users who want a quieter eyes-off-screen flow.
- Updated the mixed recovery sequence so it now blends gaze, blinking, breathing, face release, neck release, and closed-eye rest.
- Synced the desktop full-screen recovery fallback with the new breathing step and task whitelist.
- Kept eye-exercise guidance non-medical and explicit about not pressing the eyeball.

## Visual Polish

- Reduced the Today metrics from card-like tiles into a lighter signal strip.
- Changed the load-band legend into a small three-segment rail so it supports the current state without feeling like analytics.
- Tightened Settings reminder and recovery-mode buttons so labels no longer break awkwardly on desktop or mobile widths.

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
