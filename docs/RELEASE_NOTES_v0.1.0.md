# EyeFlow v0.1.0

EyeFlow is a low-interruption recovery system for screen-heavy work. Mira helps you notice eye strain, find natural break points, and complete short recovery moments without breaking flow.

## Highlights

- Daily Mira eye-state check-in for dryness, strain, blur, and light sensitivity.
- Local eye-load estimate with comfort, medium-load, and high-load bands.
- Manual focus sessions that start from `00:00`.
- Gentle reminders with L1/L2/L3 levels.
- Opt-in `强制爱` L4 mode with full-screen recovery after explicit confirmation.
- Mira desktop companion with restore, drag, hover panel, and rest guidance.
- Recovery modes for light, neck/shoulder, breath, eye-care exercise, and mixed routines.
- Settings `桌面就绪` panel for Accessibility permission, launch-at-login, version, and notification status.
- Private tester feedback template for structured bug reports and experience notes.

## Privacy

EyeFlow is local-first. Private builds do not include a cloud account, analytics backend, or crash reporting backend. See `docs/PRIVACY.md` for details.

## Installation

Download the DMG, open it, and drag `EyeFlow.app` to `/Applications`.

On first open, EyeFlow may ask for macOS Accessibility permission so it can identify the current foreground app and natural break points. EyeFlow does not read document contents, passwords, messages, or browsing history.

## Verification

This release should be published only after:

- `npm run smoke:app` passes.
- `npm run launch:preflight` passes without unsigned allowances.
- The DMG passes Gatekeeper assessment.
- The SHA256 checksum is published with the release.

## Medical Note

EyeFlow is a wellness tool, not medical software. If you have persistent eye pain, vision changes, severe dryness, headaches, or other concerning symptoms, take a break and consider consulting a qualified health professional.
