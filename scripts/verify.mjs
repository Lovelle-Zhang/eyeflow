#!/usr/bin/env node
'use strict';

/**
 * verify — the project's single quality gate.
 *
 * Test discipline is set up from day one: this script is what CI and humans
 * run before trusting a change. Today it runs the node:test suite. As the
 * project grows, add lint / typecheck / smoke steps here so there is ONE
 * command that means "the project is healthy".
 */

import { spawnSync } from 'node:child_process';

const steps = [
  {
    name: 'unit tests (node:test)',
    cmd: process.execPath,
    args: ['--test', 'test/**/*.test.js'],
  },
];

let failed = false;

for (const step of steps) {
  process.stdout.write(`\n▶ ${step.name}\n`);
  const result = spawnSync(step.cmd, step.args, { stdio: 'inherit' });
  if (result.status !== 0) {
    failed = true;
    process.stdout.write(`✗ ${step.name} failed\n`);
    break;
  }
}

if (failed) {
  process.stdout.write('\n✗ verify failed\n');
  process.exit(1);
}

process.stdout.write('\n✓ verify passed\n');
