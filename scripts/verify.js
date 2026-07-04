#!/usr/bin/env node

const { spawnSync } = require("node:child_process");
const path = require("node:path");

const root = path.join(__dirname, "..");

const checks = [
  ["Check core scoring logic", "smoke:core"],
  ["Check metric口径 consistency", "smoke:metrics"],
  ["Check event/counter store consistency", "smoke:metrics-consistency"],
  ["Check session UI state", "smoke:session"],
  ["Check current visual capture gate", "smoke:current-capture"],
  ["Check rest recovery flow", "smoke:rest"],
  ["Check source onboarding flow", "smoke:onboarding"],
  ["Check retention moments", "smoke:retention"],
  ["Check visual smoke helper", "smoke:visual"],
  ["Check release wiring", "smoke:release"]
];

function run(label, scriptName) {
  console.log(`[verify] ${label}`);
  const result = spawnSync("npm", ["run", scriptName], {
    cwd: root,
    stdio: "inherit",
    timeout: 30000
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status}`);
  }
}

function main() {
  checks.forEach(([label, scriptName]) => run(label, scriptName));
  console.log("[verify] PASSED. Source smoke checks are green.");
}

try {
  main();
} catch (error) {
  console.error("[verify] FAILED.", error.message);
  process.exitCode = 1;
}
