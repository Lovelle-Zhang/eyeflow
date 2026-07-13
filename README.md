# EyeFlow Next

A **brand-new, independent** desktop application built from scratch.

> **Not related to the legacy project.** EyeFlow Next shares **no code, no git
> history, no application identity, and no user data** with the frozen legacy
> `codex-project` / `EyeFlow` app. This repository has its own history from its
> first commit. The old project is frozen and must not be touched or forked.

## Status

Day-one **skeleton only**. Zero features. This is an intentionally empty,
runnable Electron shell whose sole purpose is to prove the isolation and
project discipline are in place before any functionality is written. Features
land one at a time, only after the *New Project Charter* is finalized.

## Isolation guarantees

Everything that keeps this app separate from the legacy app lives in one place:
[`config/app.config.js`](config/app.config.js).

| Concern            | EyeFlow Next            | Legacy (do not touch)                  |
| ------------------ | ----------------------- | -------------------------------------- |
| Product name       | `EyeFlow Next`          | `EyeFlow`                              |
| Bundle id          | `app.eyeflow.next`      | `com.eyeflow.app`                      |
| User-data dir      | `…/EyeFlow Next`        | `…/eyeflow`, `…/eyeflow-mira`, `Codex` |
| Git history        | fresh (own repo)        | separate repo                          |

- **Install & run side by side.** Different product name **and** bundle id mean
  macOS registers this as a distinct app — both can be installed to
  `/Applications` and run at the same time without overwriting each other.
- **Independent data.** The main process explicitly pins `userData` to
  `…/Application Support/EyeFlow Next` (see
  [`src/main/paths.js`](src/main/paths.js)) **before** anything touches disk, so
  it never reads or writes the legacy leveldb / data directories.
- **No process/port contention.** The dev shell loads a static file (no network
  dev server → no port to fight over). The single-instance lock is scoped by the
  isolated `userData` path, so it cannot contend with the legacy app's lock.

## Architecture — modular from day one

The biggest lesson from the legacy project was monolith files. This project
forbids them from the first commit: every concern gets its own small module, and
a test enforces a per-file line budget.

```
config/
  app.config.js         # single source of truth: identity, paths, ports
src/
  main/                 # Electron main process (thin, composed of modules)
    index.js            #   composition root only — wires the modules below
    paths.js            #   isolated userData / identity
    single-instance.js  #   single-instance lock
    window.js           #   BrowserWindow creation
    lifecycle.js        #   app lifecycle events
  preload/
    index.js            # locked-down contextBridge (identity metadata only)
  renderer/
    index.html          # empty shell UI (title: "EyeFlow Next")
    renderer.js
    styles.css
test/                   # node:test suites (config isolation + structure)
scripts/
  verify.mjs            # the one quality gate: `npm run verify`
```

## Getting started

```bash
npm install      # installs Electron (+ electron-builder for packaging)
npm start        # launch the empty shell
npm run verify   # run the test suite (the quality gate)
npm run dist     # build a distributable (electron-builder)
```

## Test discipline

Test-first from day one. `npm run verify` is the single command that means
"the project is healthy". It currently runs the `node:test` suite covering:

- **Isolation** — asserts identity/data values never collide with the legacy app.
- **Structure** — asserts the modular layout exists and no file exceeds the
  anti-monolith line budget.

Add lint / typecheck / smoke steps to [`scripts/verify.mjs`](scripts/verify.mjs)
as the project grows so there is always one gate to run.
