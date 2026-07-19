# EyeFlow Next

A **brand-new, independent** desktop application built from scratch.

> **Not related to the legacy project.** EyeFlow Next shares **no code, no git
> history, no application identity, and no user data** with the frozen legacy
> `codex-project` / `EyeFlow` app. This repository has its own history from its
> first commit. The old project is frozen and must not be touched or forked.

## Status

**Shipping — v0.2.0** (signed + notarized macOS build). EyeFlow is a calm
menubar companion: a tray icon (Mira, a breathing point of light) plus a popover
panel. It watches your eye-use energy and invites you to rest — a top island or a
centered capsule for reminders, a full-screen ritual for naps, a one-time meeting
onboarding, and a "today only" ledger. Everything defers to the three governing
docs in [`docs/`](docs/) (CHARTER first). Features landed one at a time; new work
still follows the Charter and the technical discipline below.

**System integration**: comes back after login (user-toggleable, §6.4) and
updates itself quietly in the background via GitHub Releases (electron-updater,
installs on next quit — no nagging). Both are packaged-app only; dev is a no-op.

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
  main/                 # Electron main process (thin — a composition root + modules)
    index.js            #   composition root only — wires the modules below
    paths.js            #   isolated userData / identity (pinned before any disk I/O)
    single-instance.js  #   single-instance lock (scoped to the isolated userData)
    energy-service.js   #   windowless core: driver + reminder/nap + today ledger + loop
    energy-service-api.js #  the control surface the menubar/onboarding drive
    driver/             #   energy driver + system-idle + clock sources
    reminder-*.js       #   reminder controller / buffer / presenter
    nap-controller.js   #   full-rest ritual
    records-store.js    #   "today only" ledger persistence
    settings-store.js   #   isolated settings.json (duration/tier/locale/openAtLogin)
    menubar.js          #   tray + popover panel + IPC wiring
    tray/               #   tray icon + breathing pulse (app-alive dot)
    overlay/            #   panel / reminder / nap window factories
    onboarding-controller.js  # first-run meeting ritual
    updater.js          #   quiet auto-update (packaged only)
  preload/              # locked-down contextBridge per surface (panel/reminder/nap/onboarding)
  renderer/             # dumb views: panel, reminder, reminder-strong, nap, onboarding, shared
  engine/energy/        # PURE energy engine (step/state/reminders/params/persist) — test-first
  view/                 # PURE view mapping (capsule 气色, reminder copy, mira svg, i18n, nap)
  records/              # PURE "today only" reducer (today.js) + persistence
  settings/             # PURE settings defaults + validation
test/                   # node:test suites (isolation, structure, engine, records, ...)
build/                  # icon, entitlements, notarize.js (Developer ID + notarytool)
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
"the project is healthy". It runs the `node:test` suite covering:

- **Isolation** — asserts identity/data values never collide with the legacy app.
- **Structure** — asserts the modular layout exists and no file exceeds the
  anti-monolith line budget.
- **Engine** — the pure energy engine (drain/recharge/pause bands, reminder
  arming, clamping) and the driver (offline/sleep resume via `applyAway`).
- **Records** — the "today only" ledger reducer (eye-use accrual, rest counting,
  day rollover).
- **Settings / view / i18n** — defaults + validation, capsule 气色 mapping,
  reminder copy compliance with MIRA_LANGUAGE.

Add lint / typecheck / smoke steps to [`scripts/verify.mjs`](scripts/verify.mjs)
as the project grows so there is always one gate to run.
