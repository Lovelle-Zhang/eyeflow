# EyeFlow Privacy

EyeFlow is designed as a local-first macOS low-interruption recovery system for screen-heavy work. It is not a medical device and does not diagnose, treat, or prevent disease.

## Data EyeFlow Uses

EyeFlow may store the following data locally on your Mac:

- Daily eye-state self-assessment values such as dryness, strain, blur, and light sensitivity.
- Focus and rest session timing.
- Reminder response counts, such as completed, snoozed, or ignored reminders.
- App settings, including disturbance boundary, recovery mode, launch-at-login preference, and Mira window position.
- Desktop activity signals used to estimate natural break points, such as the active app name and idle time, when macOS Accessibility permission is granted.

## Local Storage

EyeFlow stores app state locally through the desktop app storage and Electron user data directory. This release does not include a cloud account, sync service, analytics backend, or crash reporting backend.

## Permissions

EyeFlow may ask for macOS Accessibility permission. This lets EyeFlow read limited desktop context such as the current foreground app and idle state so it can avoid poorly timed reminders. EyeFlow does not use this permission to read document contents, keystrokes, passwords, messages, or browsing history.

System notifications are optional. If system notifications are unavailable or disabled, EyeFlow uses Mira state changes and optional light audio cues instead.

## Future Hardware Data

The current release does not collect blink rate, gaze distance, eye images, video, tear-film signals, or other biometric hardware data.

If EyeFlow adds hardware support later, those signals require separate opt-in consent, clearer data labels, local export and delete controls, and a privacy review before release. Eye image, video, high-frequency gaze, or hardware-derived ocular signals must not be treated like ordinary product telemetry.

## Sharing Feedback

The feedback template copies a text summary to your clipboard only when you press the copy button. It does not upload anything automatically. Review the text before sending it.

## Medical Note

EyeFlow provides wellness reminders only. If you have persistent pain, vision changes, severe dryness, headaches, or other concerning symptoms, consider taking a screen break and consulting a qualified health professional.

## Contact

For feedback, send the copied feedback template to the EyeFlow maintainer through the agreed channel.
