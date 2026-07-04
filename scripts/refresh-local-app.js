#!/usr/bin/env node

const { spawnSync } = require("node:child_process");
const path = require("node:path");

const root = path.join(__dirname, "..");

function run(label, command, args, options = {}) {
  console.log(`[refresh:local] ${label}`);
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      ...options.env
    },
    timeout: options.timeout || 180000
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status}`);
  }
}

function main() {
  run("Check core scoring logic", "npm", ["run", "smoke:core"], { timeout: 30000 });
  run("Check metric口径 consistency", "npm", ["run", "smoke:metrics"], { timeout: 30000 });
  run("Check session UI state", "npm", ["run", "smoke:session"], { timeout: 30000 });
  run("Check current visual capture gate", "npm", ["run", "smoke:current-capture"], { timeout: 30000 });
  run("Check rest recovery flow", "npm", ["run", "smoke:rest"], { timeout: 30000 });
  run("Check source onboarding flow", "npm", ["run", "smoke:onboarding"], { timeout: 30000 });
  run("Check retention moments", "npm", ["run", "smoke:retention"], { timeout: 30000 });
  run("Check visual smoke helper", "npm", ["run", "smoke:visual"], { timeout: 30000 });
  run("Check release wiring", "npm", ["run", "smoke:release"], { timeout: 30000 });
  run("Check readiness render sync (Electron)", "npm", ["run", "smoke:readiness"], { timeout: 60000 });
  run("Check dark-mode theme render (Electron)", "npm", ["run", "smoke:theme"], { timeout: 60000 });
  run("Build local app bundle", "npm", ["run", "build:app"], { timeout: 360000 });
  run("Install /Applications/EyeFlow.app", "npm", ["run", "install:local"], { timeout: 180000 });
  run("Check installed app bundle", "npm", ["run", "smoke:installed"], { timeout: 30000 });
  console.log("[refresh:local] DONE. Installed EyeFlow.app is updated and verified.");
}

try {
  main();
} catch (error) {
  console.error("[refresh:local] FAILED.", error.message);
  process.exitCode = 1;
}
