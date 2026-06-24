# EyeFlow Public Launch Checklist

This checklist is for maintaining the signed and notarized public macOS beta release.

## Required Before Public Release

- Apple Developer Program membership is active.
- Developer ID Application certificate is available in the build machine keychain or through CI secrets.
- `security find-identity -v -p codesigning` shows a usable `Developer ID Application` identity for the release team.
- CI signing secrets are configured if not building locally:
  - `CSC_LINK` and `CSC_KEY_PASSWORD`, or an installed keychain identity plus `CSC_NAME`.
- Notarization credentials are configured with one of the electron-builder-supported methods:
  - `APPLE_API_KEY`, `APPLE_API_KEY_ID`, and `APPLE_API_ISSUER`.
  - `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID`.
  - `APPLE_KEYCHAIN` and `APPLE_KEYCHAIN_PROFILE`.
- `npm run release:rc` passes before requesting a public build.
- `npm run release:rc:artifacts` passes for private unsigned artifact confidence.
- `npm run release:public` produces signed DMG and ZIP artifacts and passes finished-app smoke.
- `npm run launch:preflight` passes without `--allow-unsigned`.
- `dist/EyeFlow-0.1.0-SHA256SUMS.txt` is uploaded with the release.
- `docs/PRIVACY.md` is linked from the release page or website.
- `docs/RELEASE_NOTES_v0.1.0.md` is used as the public release body.
- Signing and notarization steps follow `docs/CODESIGN_NOTARIZE.md`.

## Distribution Page

The public download page should include:

- Product name: EyeFlow.
- One-sentence description: a low-interruption recovery system for screen-heavy work.
- Current version and release date.
- Download link for the DMG.
- SHA256 checksum.
- Privacy link.
- Note that EyeFlow is not medical software.
- Short first-open instructions for Accessibility permission.

## Public Beta Distribution

- Share only with testers who understand this is still a beta product, even though the installer is Developer ID signed and notarized.
- Keep `npm run release:rc` green after every product-facing change.
- Use `npm run release:rc:artifacts` only when you need fresh unsigned DMG/ZIP artifacts.
- Do not run public distribution from unsigned RC artifacts, even if `node scripts/launch-preflight.js --allow-unsigned` passes.
- Use `docs/BETA_INSTALL_GUIDE.md` as the tester install instructions.
- Use `docs/DOWNLOAD_PAGE_COPY.md` as the draft download page copy.
- Use `docs/TESTER_FEEDBACK_FORM.md` as the feedback questionnaire.
- Ask testers to paste the copied `反馈与诊断` template when reporting issues.
- Keep `npm run launch:preflight` green before widening the tester pool.

## Final Manual QA

- Install from the public DMG on a clean macOS user profile.
- Confirm Gatekeeper opens the app without right-click workaround.
- Confirm macOS reports the app as identified developer software.
- Complete first-open Mira assessment.
- Confirm first-open Mira assessment shows local-first, no-content-reading, and non-medical boundaries.
- Confirm Accessibility permission copy explains current-app and idle-time use without content, keyboard, or camera access.
- Confirm Mira appears, moves, expands, hides, and can be restored.
- Confirm Settings shows `桌面就绪` and `反馈与诊断`.
- Toggle launch-at-login and verify the setting after app relaunch.
- Run ordinary rest.
- Preview `强制爱`.
- Enable `强制爱`, start a manual focus session, and verify full-screen recovery.
- Confirm copied feedback template contains version and permission status.

## Launch Blockers

- Unsigned, unstapled, or unnotarized DMG.
- `node scripts/launch-preflight.js` fails on Developer ID signature or Gatekeeper assessment.
- Old product names in release artifacts.
- Broken Mira visibility or recovery return path.
- Missing privacy note.
- Missing release notes.
- Missing checksum.
- Any smoke test failure.
