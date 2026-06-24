# EyeFlow macOS Signing And Notarization

Public macOS distribution requires Developer ID signing and Apple notarization. Without this, Gatekeeper will reject the DMG and users will see security warnings.

## Required Apple Setup

- Active Apple Developer Program membership.
- Developer ID Application certificate for EyeFlow's Apple team.
  - Local keychain route: install the certificate and private key in the build machine keychain.
  - CI/secret route: provide the exported `.p12` through electron-builder signing secrets.
- The signing identity must be visible to `codesign` as `Developer ID Application`.
- Notarization credentials using one of these electron-builder-supported methods:
  - App Store Connect API key: `APPLE_API_KEY`, `APPLE_API_KEY_ID`, `APPLE_API_ISSUER`.
  - Apple ID app-specific password: `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`.
  - Keychain profile: `APPLE_KEYCHAIN`, `APPLE_KEYCHAIN_PROFILE`.

The App Store Connect API key route is preferred for CI and repeatable release builds.

## Required Credentials And Environment

Signing:

- `Developer ID Application: <Team Name> (<TEAM_ID>)` certificate and private key.
- For local builds, the identity must be unlocked and accessible in Keychain Access.
- For CI builds, provide either:
  - `CSC_LINK` pointing to the exported Developer ID `.p12`, plus `CSC_KEY_PASSWORD`.
  - Or an installed keychain identity plus an explicit `CSC_NAME` if multiple identities exist.

Notarization, choose one method:

- App Store Connect API key:
  - `APPLE_API_KEY`
  - `APPLE_API_KEY_ID`
  - `APPLE_API_ISSUER`
- Apple ID app-specific password:
  - `APPLE_ID`
  - `APPLE_APP_SPECIFIC_PASSWORD`
  - `APPLE_TEAM_ID`
- Keychain profile:
  - `APPLE_KEYCHAIN`
  - `APPLE_KEYCHAIN_PROFILE`

Do not set `CSC_IDENTITY_AUTO_DISCOVERY=false` for public release. That flag is only for unsigned private tester artifacts.

## Local Verification

Check available signing identities:

```bash
security find-identity -v -p codesigning
```

You should see a `Developer ID Application` identity for the Apple team that will publish EyeFlow.

Check the current public gate:

```bash
node scripts/launch-preflight.js
```

For public beta artifacts, this must pass without `--allow-unsigned`.

## Release Build

Before Apple credentials are available, keep the app release-candidate-ready with:

```bash
npm run release:rc
```

When you need to refresh unsigned DMG/ZIP artifacts for private testing:

```bash
npm run release:rc:artifacts
```

The unsigned artifact gate builds the ZIP with electron-builder and creates the private-test DMG with macOS `hdiutil`, so it does not depend on electron-builder's notarized DMG helper before Developer ID access is ready. These unsigned gates are useful for engineering QA, but they are not public launch clearance.

After credentials are configured:

```bash
npm run release:public
```

`npm run launch:preflight` must pass without `--allow-unsigned`.

`npm run release:public` is wired to `node scripts/release-candidate-check.js --artifacts --signed`; it must build signed artifacts, run installed-app smoke, run packaged-app smoke, then run public launch preflight without `--allow-unsigned`.

Do not use unsigned artifacts from `npm run release:rc:artifacts` for public distribution.

## Expected Passing Checks

- `Developer ID signature and hardened runtime`
- `Gatekeeper assessment passes`
- `DMG imageinfo passes`
- `Release staging is clean`

The upload-ready directory is:

```text
dist/release/v0.1.0
```

It contains the DMG, ZIP, SHA256 checksum file, privacy note, launch checklist, and release notes.

## Current Local Status

The current machine exposes a valid `Developer ID Application` identity and has a validated notarytool keychain profile named `eyeflow-notary`.

Current local credentials:

- Signing identity: `Developer ID Application: Yi Zhang (S27DT99T65)`
- Notarization profile: `APPLE_KEYCHAIN_PROFILE=eyeflow-notary`

The current public beta DMG is Developer ID signed, notarized, stapled, and accepted by Gatekeeper as `Notarized Developer ID`.
