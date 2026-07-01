# EyeFlow v0.1.2

EyeFlow v0.1.2 is a signed and notarized beta refresh for macOS testers. It keeps Mira's quiet desktop companion experience and focuses on making the Today view timing trustworthy and the rhythm guidance unambiguous.

## Highlights

- Made Today timing activity-driven: a round auto-starts when there is real screen activity, and when activity detection drops out the app says so instead of silently not counting.
- Made manual pause a state the machine truly respects: while paused, screen activity no longer secretly restarts timing; elapsed time is preserved and resumes cleanly.
- Removed the idle "Today page is just a header with everything below blank" residue, including the cross-day and post-resume empty-page cases.
- Clarified the rhythm view so the suggested rhythm no longer reads as contradicting the current one; manual adjustments now reflect immediately, and the rest countdown follows the configured rest length.
- Fixed an occasional case where onboarding did not show on first open.
- Windowing: opening or docking now brings the dashboard to the Space you are currently on instead of occasionally surfacing on another desktop.

## Tester Focus

- Install from the DMG and confirm first open is understandable.
- Leave the app idle, then work — confirm the Today round starts on its own and the timer moves.
- Pause a round, keep working, and confirm timing stays paused and resumes correctly.
- Open the rhythm view and check that "suggested vs current" reads clearly and updates on manual change.
- Try one rest flow and confirm the countdown matches your rest-length setting.

## Privacy

EyeFlow is local-first. Builds do not include a cloud account, analytics backend, or crash reporting backend. EyeFlow does not use camera, microphone, or gaze tracking, and does not read screen contents.

## Medical Note

EyeFlow is a wellness tool, not medical software. If you have persistent eye pain, vision changes, severe dryness, headaches, or other concerning symptoms, take a break and consider consulting a qualified health professional.
