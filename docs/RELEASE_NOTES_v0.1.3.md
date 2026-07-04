# EyeFlow v0.1.3

EyeFlow v0.1.3 is a signed and notarized beta refresh for macOS testers. It makes the Today focus total trustworthy across day boundaries and system sleep, counts passive screen time as eye use, keeps reminders reachable when Mira is closed, and adds shareable daily / weekly / monthly recap cards.

## Highlights

- Fixed the Today focus total getting wiped or inflated around the day boundary: locking or sleeping the Mac no longer zeroes the day's total, and a session that spans midnight no longer bleeds yesterday's time into the new day. After midnight, 今日专注 starts cleanly from zero.
- Unified the cross-day rollover behind a single guard so manual starts, guided starts, and resets all archive yesterday and reset today the same way.
- Counted passive screen use as eye use: watching or reading without keyboard/mouse input now keeps a round alive instead of being treated as idle after 30 seconds (present-idle raised from 30s to 5min), better matching real eye strain.
- Made reminders reachable when Mira is exited: if the companion is closed when a reminder is due, EyeFlow falls back to a system notification instead of losing the nudge.
- Added share cards: the daily card now carries EyeFlow's brand green, and new weekly / monthly recap cards (今日 / 本周 / 本月 tabs) summarize your eye-care rhythm over longer spans.

## Tester Focus

- Leave the app running past midnight and confirm 今日专注 reads from zero on the new day, not carrying the previous day's time.
- Lock or sleep the Mac mid-round, come back, and confirm the day's focus total is preserved (not reset to zero).
- Watch a video or read without touching the keyboard/mouse and confirm the round keeps counting instead of dropping to idle.
- Close Mira, wait for a reminder to come due, and confirm you still get a system notification.
- Open the share sheet and try the 今日 / 本周 / 本月 recap cards.

## Privacy

EyeFlow is local-first. Builds do not include a cloud account, analytics backend, or crash reporting backend. EyeFlow does not use camera, microphone, or gaze tracking, and does not read screen contents.

## Medical Note

EyeFlow is a wellness tool, not medical software. If you have persistent eye pain, vision changes, severe dryness, headaches, or other concerning symptoms, take a break and consider consulting a qualified health professional.
