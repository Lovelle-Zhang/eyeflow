'use strict';

/**
 * Notarize the signed .app via a keychain-stored notarytool profile — so the
 * Apple app-specific password lives ONLY in the login keychain, never in env,
 * build config, or the repo. Set the profile up once (interactive, password is
 * typed into your OWN terminal and stored securely):
 *
 *   xcrun notarytool store-credentials "eyeflow-notary" \
 *     --apple-id "<your-apple-id>" --team-id "S27DT99T65"
 *
 * Skips gracefully when SKIP_NOTARIZE=1 (fast unsigned dev builds).
 */

const { notarize } = require('@electron/notarize');

const KEYCHAIN_PROFILE = 'eyeflow-notary';

exports.default = async function notarizeApp(context) {
  if (context.electronPlatformName !== 'darwin') return;
  if (process.env.SKIP_NOTARIZE) return;
  const appName = context.packager.appInfo.productFilename;
  await notarize({
    tool: 'notarytool',
    appPath: `${context.appOutDir}/${appName}.app`,
    keychainProfile: KEYCHAIN_PROFILE,
  });
};
