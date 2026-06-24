# EyeFlow UI Optimization Tasks

## Current Score

Overall: **6.4 / 10**

EyeFlow already has the right product direction: quiet, gentle, low-interruption, and centered on Mira as a calm desktop companion. The current weakness is not taste direction; it is execution discipline. The design system exists, but much of the existing UI still uses local one-off values.

## Score Breakdown

| Area | Score | Notes |
| --- | ---: | --- |
| Product feel | 7.2 | The calm eye-rest companion direction is clear. |
| Quietness | 7.0 | The emotional direction is good, but some UI still feels busy. |
| macOS-native feel | 6.0 | Several panels still read like web UI instead of a native desktop app. |
| Visual consistency | 5.5 | Typography, spacing, radius, and component weights are not fully unified. |
| Typography and spacing system | 5.8 | Shared tokens exist, but existing screens still use many direct values. |
| Icon and symbol weight | 5.0 | Many SVGs still use `stroke-width="2"`, which is too heavy for Mira's quiet tone. |
| Design-system execution | 5.5 | The foundation is present; migration has not happened yet. |

## Current Diagnosis

EyeFlow has moved from "no shared UI rules" to "has a design system but has not fully executed it." The next step is not another document. The next step is a contained token migration on one high-frequency UI area that becomes the reference implementation for the rest of the product.

Current source scan still shows roughly **489** local style signals across the main UI files, including direct `font-size`, `gap`, `padding`, `border-radius`, and heavy SVG stroke values.

## Optimization Goal

Raise EyeFlow from **6.4** to **7.1+** by turning one high-frequency area into a clean design-system sample.

The goal is not to make the UI more decorative. The goal is to make it more disciplined, quieter, more consistent, and more macOS-native.

## Priority Task

### P0: Refactor One High-Frequency Panel With `--ef-*` Tokens

Target one of these areas first:

1. Settings panel
2. Main status panel
3. Current focus/rest control panel

Recommended first target: **settings panel**.

Why: It contains text hierarchy, controls, rows, buttons, helper copy, spacing, icons, and state indicators. If this panel becomes consistent, it can become the visual reference for the rest of EyeFlow.

## Required Execution Prompt

Use this prompt for the next implementation pass:

```text
Use $eyeflow-design-system to refactor the EyeFlow settings panel in index.html.

Goal:
Make the settings panel the reference implementation for EyeFlow's design system.

Requirements:
1. Read docs/EYEFLOW_DESIGN_SYSTEM.md.
2. Read eyeflow-design-system.css.
3. Keep behavior unchanged.
4. Replace local font-size, line-height, gap, padding, margin, border-radius, button height, icon size, SVG stroke-width, and symbol weight values with --ef-* tokens where practical.
5. Reduce heavy SVG strokes from stroke-width="2" to token-aligned values where the icon is small or low-emphasis.
6. Use spacing and type hierarchy instead of extra cards, shadows, or loud colors.
7. Do not add decorative gradients, glow, or visual effects.
8. Preserve Mira's quiet, gentle, low-interruption tone.
9. Run npm run verify.
10. Report which tokens were used and which local styles were removed.
```

## Acceptance Criteria

- New or modified typography uses `--ef-text-*`.
- New or modified spacing uses `--ef-space-*`.
- New or modified radius uses `--ef-radius-*`.
- New or modified controls use `--ef-control-*` or `--ef-hit-target`.
- Icons use `--ef-icon-*` and `--ef-icon-stroke-*` where possible.
- Text glyph symbols use `--ef-symbol-weight-*`.
- The refactored area looks quieter, not louder.
- The area feels closer to a native macOS panel than a web dashboard.
- `npm run verify` passes.

## Do Not Do Yet

- Do not refactor the entire `index.html` at once.
- Do not redesign all colors.
- Do not change product logic.
- Do not add new illustrations or decorative UI.
- Do not chase a higher score by making the interface more visually active.

## Next After P0

After the first panel is clean, repeat the same pattern in this order:

1. Main status panel
2. Mira companion panel
3. Break lock screen
4. Onboarding/first-open flow
5. History and scoring visualizations

## Expected Score After P0

If the settings panel is refactored well:

- Overall score: **7.0-7.2**
- Visual consistency: **6.8+**
- Icon/symbol weight: **6.5+**
- Design-system execution: **7.0+**

The product does not need more visual ambition right now. It needs one excellent, disciplined sample area.

## Next Task: P1 Main Focus Session Panel

After the settings panel pass, move to the main focus session panel in `index.html`.

Target area:

- `#sessionPanel`
- `.timer-card`
- `.session-card-head`
- `.session-state-pill`
- `.rhythm-space`
- `.timer-ring`
- `.timer-inner`
- `.timer-controls`
- `.rest-guide-hint`
- `.session-start-hint`
- `.session-settings`

Goal: make the focus session panel feel like the calm center of EyeFlow, not a decorated dashboard card.

Execution requirements:

1. Keep behavior unchanged.
2. Use `--ef-*` tokens for all modified type, spacing, radius, controls, motion, icon size, and icon stroke.
3. Reduce visual weight in `.rhythm-space` and `.timer-ring` where gradients, shadows, or rings feel decorative rather than calming.
4. Keep the timer readable, but avoid making it feel like a fitness dashboard.
5. Ensure the primary action, rest action, hint copy, and range controls share the same spacing and typography discipline.
6. Replace local values only within the target area; do not refactor unrelated sections.
7. Run `npm run verify`.

Acceptance criteria:

- The panel feels quieter and more native.
- The timer remains the clear focal point.
- Button and icon weights feel lighter and more consistent.
- Hint text no longer competes with primary controls.
- The panel can serve as the next reference area after settings.

## Next Task: P2 Current State Center And Daily Metrics

After the focus session panel pass, move to the current state center in `index.html`.

Target area:

- `.state-center`
- `.state-column`
- `.state-hero`
- `.state-stage`
- `.state-copy`
- `.state-label`
- `.today-flow`
- `.today-plan`
- `.assessment-reminder`
- `.pending-reminder`
- `.score-details`
- `.reason-grid`
- `.quick-check`
- `.metrics`
- `.metric`
- `.metric-main`
- `.load-band`
- `.load-legend`

Goal: make the current state center explain EyeFlow's status calmly and clearly without feeling like a dashboard or analytics product.

Execution requirements:

1. Keep behavior unchanged.
2. Use `--ef-*` tokens for all modified type, spacing, radius, controls, motion, icon size, and symbol weight.
3. Preserve the user's immediate answer: "Can I keep working, or should I rest?"
4. Reduce visual noise in `.state-hero`, `.metrics`, and `.load-legend`.
5. Make the load score feel like a gentle health signal, not a performance score.
6. Make `.quick-check` feel optional and low-pressure.
7. Make `.score-details` feel calm and explanatory, not like a data console.
8. Replace local values only within the target area; do not refactor unrelated sections.
9. Run `npm run verify`.

Acceptance criteria:

- The state center can be understood in 3 seconds.
- The load number is visible but not stressful.
- The explanation hierarchy is calmer and easier to scan.
- Metrics feel like quiet context, not KPI cards.
- The area feels more native and less like a web dashboard.

## Next Task: P3 Mira Companion And Companion Panel

After the current state center pass, move to Mira's always-on companion surfaces.

Target files:

- `companion.html`
- `companion-panel.html`

Target areas:

- `.shell`
- `.companion`
- `.pet`
- `.face`
- `.mouth`
- `.antenna`
- `.cheek`
- `.body`
- `.context-line`
- `.actions`
- `.icon-btn`
- `.panel`
- `.bubble`

Goal: make Mira feel like a quiet, native desktop companion, not a floating web widget.

Execution requirements:

1. Keep behavior unchanged.
2. Use `--ef-*` tokens for all modified type, spacing, radius, controls, motion, icon size, icon stroke, and symbol weight.
3. Replace remaining `stroke-width="2"` icons in companion surfaces with token-aligned lighter strokes where appropriate.
4. Replace 30px icon buttons with `--ef-hit-target` or `--ef-control-sm` unless a measured window constraint requires the exact value.
5. Reduce glow, heavy shadow, and overly saturated signal effects that make Mira feel noisy.
6. Keep Mira expressive, but make the expression subtle enough to sit on screen all day.
7. Ensure day and night themes feel like the same product, not two separate skins.
8. Ensure expanded text, context line, and action buttons share the same spacing discipline.
9. Replace local values only in the target files; do not refactor main app UI in this pass.
10. Run `npm run verify`.

Acceptance criteria:

- Mira feels calmer at rest.
- Focus, blink, and rest moods remain distinguishable without becoming loud.
- Companion icon buttons feel native and lightly weighted.
- The expanded bubble feels like a desktop popover, not a webpage tooltip.
- The panel remains readable in day and night themes.
- The always-on companion feels trustworthy enough to leave visible all day.

## Next Task: P4 Break Lock And Rest Guide

After the companion pass, move to the full-screen rest guide.

Target file:

- `break-lock.html`

Target area:

- `body`
- `main`
- `.mira-stage`
- `.pet`
- `.stage-label`
- `h1`
- `.subtitle`
- `.guide-card`
- `.breath-text`
- `.task`
- `.ring`
- `.countdown`
- `.actions`
- `button`
- `.feedback-mode`
- `.recovery-feedback`

Goal: make the rest guide feel like a warm recovery space, not a warning screen, punishment screen, or fitness countdown.

Execution requirements:

1. Keep behavior unchanged.
2. Use `--ef-*` tokens for all modified type, spacing, radius, controls, motion, icon size, icon stroke, and symbol weight.
3. Reduce any lock-screen, warning, emergency, or punishment feeling.
4. Keep the main rest action clear, but make it gentle rather than forceful.
5. Make the countdown visible without making it visually stressful.
6. Make recovery tasks feel guided, not like a checklist.
7. Make buttons restrained and native-feeling.
8. Reduce heavy shadows, high-contrast glows, decorative gradients, and saturated highlights.
9. Keep the dark rest environment comfortable for tired eyes.
10. Replace local values only in `break-lock.html`; do not refactor the main app overlay in this pass.
11. Run `npm run verify`.

Acceptance criteria:

- The screen does not feel stressful.
- The user immediately understands what to do.
- The countdown is clear but not oppressive.
- The UI feels like a native recovery space, not a web modal.
- The page remains quiet and eye-friendly in dark conditions.
- `npm run verify` passes.

## Next Task: P5 First Open And Onboarding

After the break lock pass, move to the first-open onboarding flow in `index.html`.

Target area:

- `.onboarding-overlay`
- `.onboarding-dialog`
- `.mira-intro`
- `.mira-intro-copy`
- `.mira-whisper`
- `.onboarding-flow`
- `.onboarding-section`
- `.onboarding-presets`
- `.onboarding-preset`
- `.onboarding-fine-tune`
- `.onboarding-load`
- `.onboarding-load-main`
- `.onboarding-bands`
- `.onboarding-rhythm`
- `.onboarding-plan`
- `.onboarding-plan-item`
- `.onboarding-proof`
- `.onboarding-permission-note`
- `.onboarding-actions`
- `.onboarding-preview-link`

Goal: make the first-open experience explain Mira and deliver first value without feeling like a setup form.

Execution requirements:

1. Keep behavior unchanged.
2. Use `--ef-*` tokens for all modified type, spacing, radius, controls, motion, icon size, icon stroke, and symbol weight.
3. Reduce local hard-coded typography and spacing in the onboarding selectors.
4. Keep the first action obvious: choose today's eye state, then start the first round.
5. Make presets feel like lightweight choices, not a form assessment.
6. Make fine-tuning optional and visually secondary.
7. Make the load preview feel like a rhythm suggestion, not a diagnostic result.
8. Make the next-step plan concise enough to scan in under 10 seconds.
9. Keep the permission note quiet and practical.
10. Replace local values only in onboarding; do not refactor unrelated sections.
11. Run `npm run verify`.

Acceptance criteria:

- A new user can understand what Mira does within 10 seconds.
- The first click is obvious.
- The onboarding feels warm and useful, not explanatory or heavy.
- The flow reduces decision fatigue.
- The UI feels like macOS setup/prefs quality, not a web onboarding modal.
- The first value moment is clear: Mira sets a first rhythm based on today's eye state.

## Next Task: P6 History, Profile, And Scoring Visualizations

After the onboarding pass, move to the profile/history/scoring surfaces in `index.html`.

Target area:

- `#profileView`
- `.profile-score-block`
- `.profile-analysis-block`
- `.profile-analysis-line`
- `.profile-chart-svg`
- `#profileTrendSvg`
- `#weeklyKline`
- `.weekly-candle`
- `.history-list`
- `.history-table`
- `.history-row`
- `.history-date`
- `.history-peak`
- `.history-trend`
- `.history-cell`
- `.history-signal`
- `.data-console-stat`

Goal: make EyeFlow's long-term history feel like a calm recovery archive, not an analytics dashboard or performance report.

Execution requirements:

1. Keep behavior unchanged.
2. Use `--ef-*` tokens for all modified type, spacing, radius, controls, motion, icon size, icon stroke, and symbol weight.
3. Reduce KPI/dashboard feeling in score cards, charts, history rows, and data lineage blocks.
4. Keep explainability, but make the first scan answer simple: "Am I improving, stable, or overloaded?"
5. Make load trends feel like health context, not productivity judgment.
6. Make chart strokes, dots, axes, and guide lines lighter and more consistent with Mira's quiet tone.
7. Avoid adding new chart types, new metrics, or new data logic.
8. Remove decorative density where repeated rows, chart labels, or stat blocks compete with the main insight.
9. Replace local values only in the target profile/history area; do not refactor unrelated sections.
10. Run `npm run verify`.

Acceptance criteria:

- The profile view can be understood in 5 seconds.
- The main trend is clear without making the user feel scored or judged.
- Charts feel lightweight and native, not like a business dashboard.
- History rows are easier to scan and use consistent density.
- Data lineage remains trustworthy but visually secondary.
- `npm run verify` passes.

## Next Task: P7 Desktop Readiness, Permissions, And System Settings

After the profile/history pass, move to the desktop readiness and system integration settings in `index.html`.

Target area:

- Desktop readiness/status sections in Settings
- Accessibility permission status
- Notification support/status
- Launch-at-login status
- App version and local diagnostic status
- Advanced notification settings
- Any action rows that open macOS settings or refresh desktop status

Goal: make EyeFlow's system integration feel trustworthy, local, and macOS-native instead of feeling like a permission-heavy web app.

Execution requirements:

1. Keep behavior unchanged.
2. Use `--ef-*` tokens for all modified type, spacing, radius, controls, motion, icon size, icon stroke, and symbol weight.
3. Make permission status readable in one scan: enabled, unavailable, needs action, or optional.
4. Make Accessibility permission feel bounded and understandable; do not imply EyeFlow reads content, messages, passwords, or browsing data.
5. Make notification settings feel optional and low-pressure.
6. Make launch-at-login feel like a convenience toggle, not a demand.
7. Reduce dense explanatory copy; keep privacy and system boundaries visible but compact.
8. Align status pills, action buttons, helper copy, and diagnostic rows to the same spacing and type system.
9. Avoid warning colors unless user action is genuinely required.
10. Replace local values only in the desktop readiness/settings integration area; do not refactor unrelated sections.
11. Run `npm run verify`.

Acceptance criteria:

- A user can understand EyeFlow's permission state in under 5 seconds.
- The UI clearly communicates local-only and privacy boundaries.
- Permission actions feel like native macOS settings actions, not web CTA buttons.
- Optional settings do not create anxiety or urgency.
- Status pills and action rows use consistent tokenized density.
- `npm run verify` passes.
