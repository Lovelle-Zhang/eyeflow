# EyeFlow v0.1.0-alpha.1

Private alpha release for first installation-level testing.

## Summary

This build turns EyeFlow from a browser prototype into a packaged macOS desktop app. It includes the core EyeFlow dashboard, Mira desktop companion, daily eye-state assessment, focus/rest rhythm control, and opt-in `强制爱` fullscreen recovery.

## What To Test

- Install EyeFlow from the DMG into `/Applications`.
- Open EyeFlow from `/Applications`, not from the development folder.
- Confirm Mira appears on first open and can be shown, hidden, restored, and dragged.
- Complete Mira's daily eye-state assessment and confirm the first focus round starts from `00:00`.
- Start, pause, resume, and rest from the focus-session card.
- Enable `强制爱` only after the explicit confirmation card appears.
- Confirm `强制爱` enters true fullscreen recovery and hides return until the countdown completes.
- Check Settings `更多设置`: startup-at-login state, version, reset today, and reminder rules.

## Release Artifacts

Attach these files to the GitHub Release:

- `dist/EyeFlow-0.1.0-x64.dmg`
- `dist/EyeFlow-0.1.0-x64.zip`

## Verification Done

- Syntax checked `main.js` and `preload.js`.
- Syntax checked inline scripts in `index.html` and `break-lock.html`.
- Built the packaged macOS app and ZIP through `npm run build:mac`.
- Created a private-alpha DMG fallback with macOS `hdiutil` after electron-builder's DMG helper download failed in the local environment.
- Verified the fallback DMG with `hdiutil imageinfo`.
- Mounted the DMG read-only, confirmed it contains `EyeFlow.app` and an `/Applications` link, then detached it.
- Relaunched `dist/mac/EyeFlow.app` and confirmed the running process is the packaged app bundle.

## Manual Acceptance

- Installed `EyeFlow.app` from the DMG into `/Applications`.
- Launched `/Applications/EyeFlow.app` and confirmed the running process comes from the installed app bundle.
- Confirmed the installed app opens the EyeFlow dashboard and shows Mira.
- Confirmed pause/resume works from the focus-session card.
- Confirmed Mira interaction works, including visible desktop companion behavior.
- Confirmed ordinary rest flow works.
- Confirmed `强制爱` preview works as expected in installed-app testing.

## Known Alpha Notes

- This build is unsigned and not notarized.
- macOS may show a security warning on first open.
- Browser preview pages are not the source of truth for fullscreen recovery; the packaged desktop app is.
- Automatic updates, crash reporting, and a public feedback backend are not included yet.
