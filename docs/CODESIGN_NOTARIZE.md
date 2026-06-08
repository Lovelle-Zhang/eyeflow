# EyeFlow macOS Signing And Notarization

Public macOS distribution requires Developer ID signing and Apple notarization. Without this, Gatekeeper will reject the DMG and users will see security warnings.

## Required Apple Setup

- Active Apple Developer Program membership.
- Developer ID Application certificate installed in the build machine keychain.
- Notarization credentials using one of these electron-builder-supported methods:
  - App Store Connect API key: `APPLE_API_KEY`, `APPLE_API_KEY_ID`, `APPLE_API_ISSUER`.
  - Apple ID app-specific password: `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`.
  - Keychain profile: `APPLE_KEYCHAIN`, `APPLE_KEYCHAIN_PROFILE`.

The App Store Connect API key route is preferred for CI and repeatable release builds.

## Local Verification

Check available signing identities:

```bash
security find-identity -v -p codesigning
```

You should see a `Developer ID Application` identity for the Apple team that will publish EyeFlow.

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

## Current Local Limitation

The current machine does not expose a valid `Developer ID Application` identity, so local public-launch preflight fails exactly where expected:

- Developer ID signature and hardened runtime.
- Gatekeeper assessment.

This is not an app-code blocker; it is a distribution credential blocker.
