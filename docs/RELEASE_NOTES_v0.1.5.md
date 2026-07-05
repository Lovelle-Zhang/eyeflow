# EyeFlow v0.1.5

EyeFlow v0.1.5 is a signed and notarized beta refresh for macOS testers. It is an "honest numbers" release: a full class of focus/recovery accounting bugs — around sleep, screen lock, and the midnight rollover — is fixed so the daily and weekly totals reflect what actually happened. It also brings the today share card's insight-led layout and a clearer entry point.

## Highlights

- **Sleep and lock no longer inflate focus.** Time spent asleep or with the screen locked is no longer imported as focus time. A focus round left open across a sleep is capped to the real active span, so a 30-minute round that ends after a 4-hour nap counts as ~30 minutes, not 4.5 hours.
- **Cross-midnight is honest.** A focus round that spans midnight is closed into the day it belonged to, so today starts from `00:00` and the previous day keeps its time in the weekly/monthly view. Manual rounds crossing midnight now roll into the week/month correctly.
- **Forced rest counts once, cleanly.** Starting a `强制爱` rest closes the open focus round (no orphaned, later-inflated segment), locking the screen during a rest no longer double-counts it, and double-clicking "finish" can't double-count a break.
- **Today share card leads with an insight.** The card now opens with a short, honest "what Mira saw today" line above the numbers, and the entry point reads as a real take-away (a tonal-green 带走 button with a share glyph) instead of a muted row.
- **Reduce Motion is honored on the full-screen rest.** The break-lock rest window now respects the system "Reduce Motion" setting.
- **Steadier storage.** Saves are guarded against storage-quota errors so a full store can't interrupt the running clock.

## Tester Focus

- Use it across a normal day including a sleep/lock and past midnight, then check that Today's focus starts fresh at `00:00` and the weekly view kept yesterday's time — no phantom hours from sleep.
- Open the share sheet (今日 / 本周 / 本月); confirm the 今日 card leads with a one-line insight and the 带走 button reads as tappable.
- With system "Reduce Motion" on, start a 强制爱 rest and confirm the rest screen is calm.

## Privacy

EyeFlow is local-first. Builds do not include a cloud account, analytics backend, or crash reporting backend. EyeFlow does not use camera, microphone, or gaze tracking, and does not read screen contents.

## Medical Note

EyeFlow is a wellness tool, not medical software. If you have persistent eye pain, vision changes, severe dryness, headaches, or other concerning symptoms, take a break and consider consulting a qualified health professional.
