# EyeFlow Changelog - 2026-06-05

## Timer Reliability

- Fixed a cross-day timer bug where EyeFlow could still show elapsed focus time after the Mac woke up or the app remained open overnight.
- Startup now loads saved elapsed time only when today's Mira assessment has already been completed.
- Focus sessions now check the current calendar day on tick, window focus, page show, and visibility resume; if a new day is detected, EyeFlow stops the session, clears the timer, and opens today's Mira assessment.
- Desktop activity sensing no longer writes automatic focus time before today's assessment is complete.
- The focus-session card now says `待校准` / `先校准今天` when the day has not been assessed, instead of implying that focus is already running.
- Settings activity copy now shows `等待校准` before daily assessment, making it clear that EyeFlow is sensing activity but not recording today's focus time yet.
