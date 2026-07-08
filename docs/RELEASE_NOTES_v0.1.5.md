# EyeFlow v0.1.5

EyeFlow v0.1.5 is a signed and notarized beta refresh for macOS testers. It carries two stories. First, "honest numbers": a full class of focus/recovery accounting bugs — around sleep, screen lock, and the midnight rollover — is fixed so daily and weekly totals reflect what actually happened. Second, "graded care": reminders now come in four intensity levels (L1–L4) you pick from the menu bar, delivered through a new top-of-screen ambient island that can close a micro-rest on its own.

## Highlights

### Reminders, in four levels

- **Pick how strongly Mira cares — L1 光晕 · L2 轻提示 · L3 岛提醒 · L4 强制爱.** The four levels live in the menu bar with a one-line note each, so switching is one click, not a settings dive. New installs default to L2 轻提示. Channels are tied to the level you chose — the separate system-notification toggle is gone.
- **A top-of-screen ambient island stands in for Mira.** When the desktop companion is exited or hidden, reminders surface on a quiet island at the top of the screen instead of going nowhere. It is also an independent menu toggle, so it can coexist with Mira on screen.
- **The island closes the loop by itself.** A look-away micro-rest started from the island counts down, confirms "休息完成 · 已记录 ✓", and tucks itself away — no clicking "done", no self-report.
- **L4 强制爱 got manners.** A short heads-up appears before the screen is taken over (no more abrupt takeover), the real break point always fires its countdown capsule, auto tracking reliably reaches the break point, and the L4 menu entry lands on the Settings 提醒边界 section instead of a blank view.
- **One coordinator for all reminder notifications** — a reminder fires once, through the right channel, instead of triple-buzzing.

### Honest numbers

- **Sleep and lock no longer inflate focus.** Time spent asleep or with the screen locked is no longer imported as focus time. A focus round left open across a sleep is capped to the real active span, so a 30-minute round that ends after a 4-hour nap counts as ~30 minutes, not 4.5 hours.
- **Cross-midnight is honest.** A focus round that spans midnight is closed into the day it belonged to, so today starts from `00:00` and the previous day keeps its time in the weekly/monthly view. Manual rounds crossing midnight now roll into the week/month correctly.
- **Forced rest counts once, cleanly.** Starting a `强制爱` rest closes the open focus round (no orphaned, later-inflated segment), locking the screen during a rest no longer double-counts it, and double-clicking "finish" can't double-count a break.
- **The 本月 card now reads a real trend.** With enough history (about 8 days), the monthly recap opens with a trend observation computed from your own rhythm read-back — and when there isn't enough data yet, it says so honestly instead of inventing one.

### Share card and polish

- **Today share card leads with an insight.** The card opens with a short, honest "what Mira saw today" line above the numbers, and the entry point reads as a real take-away (a tonal-green 带走 button with a share glyph) instead of a muted row.
- **Reduce Motion is honored on the full-screen rest.** The break-lock rest window now respects the system "Reduce Motion" setting.
- **Steadier storage.** Saves are guarded against storage-quota errors so a full store can't interrupt the running clock.
- **One name everywhere.** The window title now matches the rest of the app: EyeFlow - Mira 的桌面陪伴空间.

## Tester Focus

- Switch reminder levels from the menu bar (L1→L4) and confirm each level's delivery matches its note; confirm a fresh install starts at L2.
- Exit or hide desktop Mira, wait for a reminder, and confirm the top island appears; let a micro-rest run to "休息完成 · 已记录 ✓" without touching anything.
- On L4, work up to the break point and confirm the heads-up appears before the takeover, and the countdown capsule always shows.
- Use it across a normal day including a sleep/lock and past midnight, then check that Today's focus starts fresh at `00:00` and the weekly view kept yesterday's time — no phantom hours from sleep.
- Open the share sheet (今日 / 本周 / 本月); confirm the 今日 card leads with a one-line insight, and — if you have 8+ days of history — the 本月 card opens with a trend line.
- With system "Reduce Motion" on, start a 强制爱 rest and confirm the rest screen is calm.

## Privacy

EyeFlow is local-first. Builds do not include a cloud account, analytics backend, or crash reporting backend. EyeFlow does not use camera, microphone, or gaze tracking, and does not read screen contents.

## Medical Note

EyeFlow is a wellness tool, not medical software. If you have persistent eye pain, vision changes, severe dryness, headaches, or other concerning symptoms, take a break and consider consulting a qualified health professional.
