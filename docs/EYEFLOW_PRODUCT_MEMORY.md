# EyeFlow Product Memory

This file records product decisions that should survive code edits and rebuilds.

## Naming

- The app is called EyeFlow.
- The companion robot is called Mira.
- Do not rename the app to Mira. Do not use old names from earlier prototypes.

## Product Direction

- EyeFlow is a calm desktop eye-care assistant for people doing long screen-based work.
- It should reduce burden for eyes and body, so the product must stay simple, quiet, and comfortable.
- Keep only necessary features. Avoid adding complex dashboards, noisy gamification, or heavy workflows.

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
- Settings should let users choose the reminder ceiling directly as L1/L2/L3/L4. Do not hide L2/L3 behind vague labels like `标准`; the card may show the selected ceiling while the internal trigger still waits for the right timing.
- L4 `强制爱` must not trigger from desktop auto-recording alone. If EyeFlow is only auto-recording screen time, `强制爱` should show as pending/standby; full-screen recovery is armed only after the user explicitly starts manual focus.
- Enabling L4 `强制爱` requires an explicit confirmation step. Clicking the `强制爱` mode button should first show a confirmation/preview card and must not immediately change the active reminder mode.
- `5 分钟后` should behave as a real five-minute snooze, not a vague dismissal; the snooze window should override the ordinary reminder cooldown when it expires.
- The reminder rules panel must explicitly include L4 `强制爱`, including its opt-in boundary and hidden return button during countdown.
- The full-screen forced-rest page must feel protective, not punitive: use an eye-friendly low-contrast palette, avoid oversized countdowns that invite staring, and make Mira's recovery action the main focus.
- `强制爱` should support local voice guidance so the user can stop looking at the screen during recovery. Prefer system/offline voice first; do not require network, recording, or an account. Voice guidance should be optional but enabled by default.
- Browser fallback forced-rest previews should mirror the desktop recovery flow enough to set expectations: four-step recovery task, small countdown, and no ordinary finish/snooze actions during force-rest.
- Recovery feedback buttons should make the next action clear, such as starting the next round, reminding earlier, or continuing the rest. Do not make the user discover the result after clicking.
- Every day on first open, Mira should ask the user to rate their current eye state before starting focus.
- Daily eye-state assessment should affect both the first focus/rest rhythm and the reminder strength: comfort can stay quiet, medium/high load should move to standard reminders, while `强制爱` is preserved only if the user already opted in.
- The Today state-card action should guide the user to the focus-session card instead of duplicating the start button.
- The focus-session card owns start, pause, and rest controls.
- Desktop activity sensing may auto-record continuous screen time before the user starts a manual focus session, but the UI must label that state clearly as automatic recording. The primary button should say `开始手动专注`, not `继续专注`, until the user explicitly starts manual control.
- Automatic recording is background sensing only. When the user clicks `开始手动专注` from an auto-recorded state, the manual session starts as a fresh round from `00:00`; it should not inherit the auto-recorded elapsed time.
- The focus-session card should show whether the current timer is `自动记录`, `手动专注`, `已暂停`, or `未开始`; this keeps the running timer from feeling like EyeFlow secretly started a manual session.
- Daily calibration should pause any previous focus timer while Mira asks for the current eye state. After the user records today's score, the first focus round starts fresh from `00:00`.
- A calendar-day boundary is a hard timer boundary. If the app stays open overnight or the Mac wakes from sleep on a new day, EyeFlow must stop the previous session, clear visible elapsed time, and wait for today's Mira assessment before recording manual or automatic focus time.
- Screen lock, sleep, shutdown, or app quit should be treated as a natural rest boundary: hide Mira, complete the current visible session if one exists, record one system-detected rest, and clear the timer for the next round.
- Force-love preview is a product boundary test only: it must hide return/finish/snooze actions during the countdown, show `回到 EyeFlow` only after time ends, and not count as a real break.
- Recovery duration should be long enough for eyes and shoulders/neck, not just a blink break. Keep the manual rest range at 90-240 seconds; default comfort/medium/high rhythms should be 120/150/180 seconds.
- Fullscreen recovery should feel like Mira is doing the recovery with the user. Mira's face should be visible in the recovery screen and change with the current step: gaze, blink, close eyes, and shoulder/neck release.
- Fullscreen recovery steps should come from a small recovery task library. Settings may expose simple recovery modes: light, shoulder/neck, eye exercises, and mixed.
- Eye-exercise guidance must stay gentle and non-medical: guide light pressure around the orbital bone only, never pressing the eyeball.
- Recovery screens should reduce clock-watching. Show a gentle step flow with short labels so the user knows where they are, while Mira remains the main companion.
- The Today first screen should keep current state on the left and the focus-session timer on the right.
- Today should feel like a calm eye-care workbench, not a generic SaaS dashboard. Prefer soft translucent surfaces, low-contrast borders, restrained depth, and fewer repeated white-card treatments.
- Today needs a memorable state space, not only side-by-side cards: Mira, eye-load score, and the current recommendation should appear together in the main state stage so Mira feels like the product's state interpreter.
- The focus-session area should feel like a rhythm space, not a generic timer card. Its timer ring, controls, slider rails, and color state should visually follow the same mood as the Mira state stage.
- Today metrics should behave like a light signal strip rather than a report-card grid. Keep them scannable, but avoid making them compete with the main state stage.
- Today rhythm and reminder mode should read as one compact status strip inside the main state card, not as multiple explanatory blocks.
- Today should include one short plan sentence explaining why this rhythm is being used, what the main eye signal is, and what boundary the current reminder mode will follow.
- Today metrics belong under the current-state card as a light status strip; avoid letting them feel like a separate analytics dashboard row.
- Score reasoning belongs in a folded `为什么是这个状态` section, not as a permanently visible card.
- In normal states, the Today state card should not duplicate start/pause controls; only high-load states show an immediate rest action there.
- Optional symptom logging on Today should stay collapsed by default as `记录一下当下状态`.
- Settings should stay low-burden: show today's rhythm suggestion and reminder mode first, while permissions, notification details, reset actions, and reminder rules stay folded unless needed.
- UI text should wrap safely inside cards, buttons, Mira bubbles, and forced-rest screens.
- The packaged desktop app should remember dashboard window bounds between launches.
- Real desktop-product controls belong in Settings `更多设置` and macOS menus, not the main Today flow. Keep startup-at-login, About/version, tray, Dock, and window recovery controls available without making the eye-care workflow feel busy.
- Private alpha distribution should use a DMG installer as the shareable artifact, with `dist/mac/EyeFlow.app` as the local runnable bundle and ZIP as a secondary archive.
- If electron-builder cannot download the DMG helper in the current environment, a simple macOS `hdiutil` DMG is an acceptable private-alpha fallback after verifying image info, mount contents, and detach.

## Implementation Notes

- `index.html` is the EyeFlow dashboard.
- `companion.html` is the draggable Mira avatar window and browser preview fallback.
- `companion-panel.html` is the desktop speech bubble window.
- `main.js` owns Electron windows and IPC.
- `preload.js` exposes `window.eyeflowDesktop`.
- Browser/file preview has no Electron bridge, so `companion.html` must have a fallback that still shows Mira and the speech bubble.

## Change Logs

- 2026-06-03 changes are recorded in `docs/CHANGELOG_2026-06-03.md`.
- 2026-06-04 changes are recorded in `docs/CHANGELOG_2026-06-04.md`.
- 2026-06-05 changes are recorded in `docs/CHANGELOG_2026-06-05.md`.
- Release checks are recorded in `docs/RELEASE_CHECKLIST.md`.
