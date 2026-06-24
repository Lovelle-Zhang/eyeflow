# EyeFlow Final QA Record - 2026-06-13

## Version And Build Target

- Product: EyeFlow
- Version: 0.1.0
- Platform target: macOS x64
- App bundle target: `dist/mac/EyeFlow.app`
- ZIP artifact target: `dist/EyeFlow-0.1.0-x64.zip`
- DMG artifact target: `dist/EyeFlow-0.1.0-x64.dmg`

## Commands Run

1. `npm run verify`
2. `npm run release:rc`
3. `npm run release:rc:artifacts`
4. `node scripts/launch-preflight.js`

## Results

| Command | Result | Notes |
| --- | --- | --- |
| `npm run verify` | Passed | Source smoke checks passed. |
| `npm run release:rc` | Passed | App-level RC passed; packaged UI smoke passed. Artifact gate was intentionally skipped in this mode. |
| `npm run release:rc:artifacts` | Passed | Unsigned ZIP and DMG were generated, `hdiutil imageinfo` passed, packaged UI smoke passed, and unsigned artifact preflight passed with `--allow-unsigned`. |
| `node scripts/launch-preflight.js` | Failed as expected | Public preflight was run without `--allow-unsigned`; artifact freshness and DMG imageinfo passed, leaving only Developer ID signature and Gatekeeper blockers. |

## Artifact RC Notes

Previous failure:

```text
[release:rc] Create unsigned DMG with hdiutil
hdiutil: create failed - 设备未配置
[release:rc] FAILED. Create unsigned DMG with hdiutil failed with exit code 1
```

Resolution:

- The failure was caused by sandboxed `hdiutil` device access. The same `hdiutil create` and `hdiutil imageinfo` commands succeed outside the sandbox.
- `scripts/release-candidate-check.js` now stages unsigned DMG contents under `/private/tmp/eyeflow-*`, removes stale staging safely, handles a stale `/Volumes/EyeFlow` mount attempt, creates the unsigned DMG, and immediately validates it with `hdiutil imageinfo`.
- `npm run release:rc:artifacts` was rerun with unsandboxed hdiutil access and passed.

The artifact run emitted the expected unsigned build warning:

```text
skipped macOS application code signing reason=CSC_IDENTITY_AUTO_DISCOVERY=false
```

Unsigned artifact preflight explicitly allowed unsigned local/private artifacts:

```text
[PASS] Developer ID signature and hardened runtime - allow-unsigned mode
[PASS] Gatekeeper assessment passes - allow-unsigned mode
```

During the artifact refresh, packaged smoke briefly exposed a real desktop return-path issue:

```text
[smoke] FAILED. Force-return toast safe-zone probe failed:
  - force preview result is not visible
```

Resolution:

- The desktop full-screen recovery completion path now uses a separate renderer notification channel for returning from `break-lock.html` to the dashboard, avoiding reuse of the renderer-to-main `breakLock:done` invoke channel.
- `main.js` restores the dashboard before sending the completion payload.
- No smoke or preflight check was weakened; the same packaged smoke now passes with `Force-return preview hint visible: true`.

## Generated Artifacts

- `dist/EyeFlow-0.1.0-x64.dmg` - refreshed 2026-06-13 18:09:43 +0800, 114,986,771 bytes
- `dist/EyeFlow-0.1.0-x64.zip` - refreshed 2026-06-13 18:09:31 +0800, 99,971,954 bytes
- `dist/EyeFlow-0.1.0-x64.zip.blockmap` - refreshed 2026-06-13 18:09:32 +0800, 105,986 bytes
- `dist/EyeFlow-0.1.0-SHA256SUMS.txt` - regenerated 2026-06-13 18:26:46 +0800

Freshness baseline:

- `dist/mac/EyeFlow.app/Contents/MacOS/EyeFlow` - refreshed 2026-06-13 18:08:33 +0800
- DMG freshness: passed, newer than app binary.
- ZIP freshness: passed, newer than app binary.

Release staging:

- `dist/release/v0.1.0/EyeFlow-0.1.0-x64.dmg`
- `dist/release/v0.1.0/EyeFlow-0.1.0-x64.zip`
- `dist/release/v0.1.0/EyeFlow-0.1.0-SHA256SUMS.txt`
- release docs copied into `dist/release/v0.1.0/`

DMG validation:

```text
[PASS] DMG imageinfo passes - Format Description: 已压缩为UDIF只读(zlib) Class Name: CUDIFDiskImage
```

Public preflight validation without `--allow-unsigned`:

```text
[PASS] DMG is newer than app binary - 2026-06-13T10:09:43.008Z
[PASS] ZIP is newer than app binary - 2026-06-13T10:09:31.892Z
[PASS] DMG imageinfo passes - Format Description: 已压缩为UDIF只读(zlib) Class Name: CUDIFDiskImage
[FAIL] Developer ID signature and hardened runtime - /Users/lovellezhang/Projects/codex-project/dist/mac/EyeFlow.app: code object is not signed at all
[FAIL] Gatekeeper assessment passes - /Users/lovellezhang/Projects/codex-project/dist/EyeFlow-0.1.0-x64.dmg: rejected source=no usable signature
```

## Capture Directory

Packaged smoke capture directory from the successful app-level RC:

```text
/var/folders/lw/tm59fff56j90sxpk932lp01c0000gp/T/eyeflow-smoke
```

## Packaged Smoke Screenshots

- `/var/folders/lw/tm59fff56j90sxpk932lp01c0000gp/T/eyeflow-smoke/eyeflow-dashboard-capture.png`
- `/var/folders/lw/tm59fff56j90sxpk932lp01c0000gp/T/eyeflow-smoke/eyeflow-dashboard-onboarding-capture.png`
- `/var/folders/lw/tm59fff56j90sxpk932lp01c0000gp/T/eyeflow-smoke/eyeflow-dashboard-rhythmView-capture.png`
- `/var/folders/lw/tm59fff56j90sxpk932lp01c0000gp/T/eyeflow-smoke/eyeflow-dashboard-profileView-capture.png`
- `/var/folders/lw/tm59fff56j90sxpk932lp01c0000gp/T/eyeflow-smoke/eyeflow-dashboard-rest-guide-capture.png`
- `/var/folders/lw/tm59fff56j90sxpk932lp01c0000gp/T/eyeflow-smoke/eyeflow-companion-capture.png`
- `/var/folders/lw/tm59fff56j90sxpk932lp01c0000gp/T/eyeflow-smoke/eyeflow-companion-panel-capture.png`
- `/var/folders/lw/tm59fff56j90sxpk932lp01c0000gp/T/eyeflow-smoke/eyeflow-break-lock-capture.png`
- `/var/folders/lw/tm59fff56j90sxpk932lp01c0000gp/T/eyeflow-smoke/eyeflow-break-lock-complete-capture.png`
- `/var/folders/lw/tm59fff56j90sxpk932lp01c0000gp/T/eyeflow-smoke/eyeflow-dashboard-force-return-capture.png`

## Visual Source Gate

From `npm run verify` / `npm run release:rc`:

- Total style signals: 124
- `index.html` style signals: 89
- `--ef-*` token references: 1233
- `stroke-width="2"`: 0

Thresholds remain unchanged:

- Total style signals must stay below 150
- `index.html` style signals must stay below 100
- `--ef-*` token references must stay above 950
- `stroke-width="2"` must remain 0

## Packaged Smoke Layout Results

From successful artifact-level RC packaged smoke:

- Dashboard layout: `view=rhythmView`
- Dashboard overflow: 0
- Clipped controls: 0
- Dashboard `toastOverlaps`: 0
- Force-return view: `view=rhythmView`
- Force-return preview hint visible: true
- Force-return toast anchor: `bottom-left`
- Force-return `toastOverlaps`: 0
- Onboarding DOM layout: `visible=true`, `sticky=true`, `ordered=true`
- Onboarding pill readability: `contrast=144.5`, `box=146x56`
- Onboarding action visibility: `contrast=214.1`, `box=232x78`
- Force preview preserved voice setting: yes
- Feedback copy probe: passed

## Known Remaining Gates

- Public release blocker: Developer ID signing is not configured, so `Developer ID signature and hardened runtime` fails.
- Public release blocker: Gatekeeper assessment fails because the refreshed DMG has no usable signature.
- Public release blocker: notarization has not been completed; this remains gated on Developer ID credentials.

Current public preflight without `--allow-unsigned` was checked and fails exactly where expected:

```text
[FAIL] Developer ID signature and hardened runtime - /Users/lovellezhang/Projects/codex-project/dist/mac/EyeFlow.app: code object is not signed at all
[FAIL] Gatekeeper assessment passes - /Users/lovellezhang/Projects/codex-project/dist/EyeFlow-0.1.0-x64.dmg: rejected source=no usable signature
```

`npm run release:public` is wired for the signed public path through `node scripts/release-candidate-check.js --artifacts --signed`; it was checked for wiring only, not executed, because Developer ID credentials are not available yet.

## Recommendation

- Private/local tester readiness: ready for local app-bundle, unsigned ZIP, and unsigned DMG testing, subject to normal unsigned macOS Gatekeeper handling.
- Public release readiness: not ready. Public release remains blocked by Developer ID signing and notarization.

Final QA recommendation: EyeFlow is artifact-level RC ready for private/local tester distribution. Public release requires Developer ID signing and notarization.
