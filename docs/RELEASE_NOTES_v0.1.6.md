# EyeFlow v0.1.6

EyeFlow v0.1.6 is a signed and notarized patch release for macOS testers, on top of v0.1.5. It fixes a batch of L4 强制爱 (break-lock) issues found in same-day dogfooding — the takeover now enters and exits cleanly — and closes two honest-numbers gaps in how that flow is accounted.

## Fixes

### L4 break-lock behaves

- **Fullscreen exit is reliable.** Leaving the forced rest (finish or emergency exit) no longer risks a stuck fullscreen window.
- **The dashboard stays out of the way.** It hides while the L4 rest is active, and after a real rest EyeFlow puts itself away instead of jumping back in front of you.
- **Window comes back where it was.** Dashboard bounds are restored after the rest instead of reverting to a stale position.
- **No stray reminder card during takeover.** The ordinary L2/L3 reminder card can't linger over the takeover flow.

### Honest numbers, kept honest

- **A superseded reminder keeps its record.** When L4 takes over while an L2/L3 reminder is pending, that reminder is now closed as "ignored" (you didn't respond — the system escalated) instead of being silently dropped. Its rhythm-memory entry resolves, so the closed-loop engine reads true ignore/adherence signals. A settings preview leaves a real pending reminder untouched.
- **Emergency exit counts once.** Mashing the emergency-exit button (or Escape) after confirming can no longer record duplicate "interrupted" recovery events.

## Tester Focus

- On L4, work up to the break point, take the full rest, and confirm the fullscreen closes cleanly and the dashboard returns to its previous position — then do it again but leave via 紧急退出 (double-press), including mashing it, and confirm only one interrupted entry shows in the log.
- Have an L2/L3 reminder pending when an L4 takeover fires; after the rest, check the reminder didn't reappear and the day's counts look sane.

## Privacy

EyeFlow is local-first. Builds do not include a cloud account, analytics backend, or crash reporting backend. EyeFlow does not use camera, microphone, or gaze tracking, and does not read screen contents.

## Medical Note

EyeFlow is a wellness tool, not medical software. If you have persistent eye pain, vision changes, severe dryness, headaches, or other concerning symptoms, take a break and consider consulting a qualified health professional.
