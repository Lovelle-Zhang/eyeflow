'use strict';

/**
 * Central identity & runtime configuration for EyeFlow Next.
 *
 * This is the SINGLE SOURCE OF TRUTH for anything that must stay isolated
 * from the frozen legacy app (codex-project / EyeFlow / com.eyeflow.app).
 * Nothing here may reference or reuse the old app's identity or data.
 */

const APP_CONFIG = Object.freeze({
  // Human-facing product name. Shown in the title bar and used by Electron
  // to derive the default userData directory. Deliberately different from the
  // legacy "EyeFlow" so both apps can be installed and run side by side.
  productName: 'EyeFlow Next',

  // Reverse-DNS bundle identifier. MUST differ from legacy "com.eyeflow.app"
  // so macOS treats this as a distinct application (own data container,
  // own Launch Services registration).
  appId: 'app.eyeflow.next',

  // Name of the isolated user-data directory under the OS app-data root.
  // MUST NOT collide with legacy dirs: "eyeflow", "eyeflow-mira", "Codex".
  userDataDirName: 'EyeFlow Next',

  // Single-instance lock key. Namespaced to this app so the dev/prod instance
  // never contends with the legacy app's singleton lock.
  singleInstanceKey: 'app.eyeflow.next.lock',

  // Local dev does not spin up a network dev server yet (the shell loads a
  // static file). If/when one is added, use this port — chosen to avoid the
  // legacy project's range. Kept here so there is one place to change it.
  devServerPort: 5310,

  window: Object.freeze({
    width: 1024,
    height: 720,
    minWidth: 640,
    minHeight: 480,
  }),
});

module.exports = { APP_CONFIG };
