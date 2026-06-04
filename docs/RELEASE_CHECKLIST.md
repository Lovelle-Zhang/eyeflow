# EyeFlow Release Checklist

This checklist is for private alpha builds before sharing EyeFlow with another tester.

## Build Artifacts

- Build command: `npm run build:mac`
- App bundle: `dist/mac/EyeFlow.app`
- DMG installer: `dist/EyeFlow-0.1.0-x64.dmg`
- ZIP archive: `dist/EyeFlow-0.1.0-x64.zip`
- Current release notes: `docs/RELEASE_NOTES_v0.1.0-alpha.1.md`

## Identity

- App name is `EyeFlow`.
- Robot companion name is `Mira`.
- Dock icon, sidebar logo, tray/menu name, About panel, and installer name all use EyeFlow.
- Old prototype names must not appear in new build artifacts.

## First Open

- Daily Mira assessment appears on first open of the day.
- Completing assessment starts the first focus round from `00:00`.
- Skipping assessment leaves a quiet calibration callout on Today.
- Mira appears as the desktop companion and can be restored with `找回 Mira`.

## Core Flow

- `开始手动专注` starts manual focus with one click.
- Pause/resume works with one click.
- Normal rest shows ordinary finish/snooze actions.
- `强制爱` requires explicit confirmation before enabling.
- `强制爱` preview and real recovery hide return until the countdown completes.
- Desktop `强制爱` uses true kiosk fullscreen: no menu bar or Dock during countdown.
- Recovery modes change the Mira-led task sequence.

## Desktop Product Controls

- macOS menu includes `打开 EyeFlow`, `显示 Mira`, `找回 Mira`, `开机自动启动`, and `关于 EyeFlow`.
- Tray menu includes the same core controls.
- Settings `更多设置` shows version and startup-at-login state.
- Startup-at-login can be toggled from Settings and menu, and both stay in sync.
- Closing the dashboard hides it; reopening from Dock/menu/tray restores it.

## Known Alpha Notes

- The app is unsigned in private alpha builds.
- Chrome/browser pages are preview fallbacks; the packaged desktop app is the source of truth for fullscreen recovery.
- If electron-builder cannot download its DMG helper, use the simple `hdiutil` fallback DMG and verify it by running image info, mounting it, checking `EyeFlow.app` plus the `/Applications` link, and detaching the volume.
