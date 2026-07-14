'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

// Guards the modular layout so we don't regress toward monolith files —
// the biggest lesson carried over from the legacy project. A menubar app (§4):
// tray + popover panel, no debug shell.
const REQUIRED_FILES = [
  'config/app.config.js',
  'src/main/index.js',
  'src/main/paths.js',
  'src/main/single-instance.js',
  'src/main/energy-service.js',
  'src/main/menubar.js',
  'src/preload/panel.js',
  'src/renderer/panel/index.html',
  'src/renderer/panel/panel.js',
  'src/renderer/panel/panel.css',
];

test('all required modules exist', () => {
  for (const rel of REQUIRED_FILES) {
    assert.ok(fs.existsSync(path.join(ROOT, rel)), `missing: ${rel}`);
  }
});

// Anti-monolith discipline: no single source file may balloon. The threshold
// is intentionally low for a skeleton; raise deliberately as real modules land.
test('no source file exceeds the anti-monolith line budget', () => {
  const MAX_LINES = 150;
  const dirs = ['config', 'src'];
  const offenders = [];

  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.js')) {
        const lines = fs.readFileSync(full, 'utf8').split('\n').length;
        if (lines > MAX_LINES) {
          offenders.push(`${path.relative(ROOT, full)} (${lines} lines)`);
        }
      }
    }
  };

  for (const d of dirs) {
    walk(path.join(ROOT, d));
  }

  assert.deepEqual(offenders, [], `monolith files detected: ${offenders.join(', ')}`);
});
