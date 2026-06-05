# EyeFlow Changelog - 2026-06-05

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
