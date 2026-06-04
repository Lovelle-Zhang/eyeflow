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

## Desktop Implementation Changes

- `preload.js` exposes `window.eyeflowDesktop`.
- `main.js` owns the Electron dashboard window, draggable companion window, and separate companion panel window.
- `companion.html` is the Mira avatar window and browser fallback preview.
- `companion-panel.html` is the desktop speech bubble panel.
- Browser/file preview has no Electron bridge, so `companion.html` now auto-expands unless `?compact=1` is present.
- Electron desktop mode still uses the real bridge and keeps the avatar/panel behavior separate.
- The latest built app is `dist/mac/EyeFlow.app`.
- Desktop startup now waits for the Mira window content to finish loading before showing it, then briefly opens the speech bubble so the user can locate Mira.
- Empty or missing saved Mira coordinates are sanitized before calling Electron screen APIs, preventing first-launch companion window creation from failing.
- Desktop dashboard startup now loads `index.html` with `onboarding=1`, so the app opens from Mira's daily eye-state assessment flow during the current demo phase.
- The onboarding flow replaced the English `Private Alpha` label with `今日状态校准`.
- The onboarding assessment now shows a lightweight live initial load estimate with the same 0-47, 48-73, and 74-100 bands used in the main dashboard.
- Range sliders now use custom EyeFlow styling with filled tracks, soft thumbs, active focus states, and live green/amber/pink tones instead of the browser default range control.
- The onboarding assessment now maps the initial load to the first focus rhythm: comfort keeps 25 min / 90 sec, medium uses 20 min / 120 sec, and high load uses 15 min / 150 sec.
- Timer controls were simplified into one stateful primary button (`开始专注` / `暂停` / `继续专注`) plus a separate `休息` button, removing the confusing simultaneous `开始` and `暂停` actions.
- Onboarding permissions were demoted from a main action button to a quiet note/link, keeping the first-run choice focused on starting or previewing EyeFlow.

## Recovery Notes

- A previous source recovery incident caused confusion between source files and packaged files.
- `index.html` was recovered from browser DOM into the project source.
- Old packaged zip names in `dist` may remain but should not be treated as source of truth.
- Source of truth is the project root files plus this docs folder.

## Memory Files Added

- `docs/EYEFLOW_PRODUCT_MEMORY.md`
- `/Users/lovellezhang/.codex/memories/eyeflow-product.md`
