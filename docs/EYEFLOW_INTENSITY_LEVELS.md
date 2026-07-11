# EyeFlow L1-L4 Reminder Levels

> **⚠️ 2026-07-10 P3 — trigger architecture replaced.** Reminder triggering now
> lives in the pure-function pressure engine `eyeflow-reminder-engine.js`
> (thresholds 40/60/90min continuous eye time × intensity ceiling; behavior
> pinned by the scenario table in `EYEFLOW_PROGRESSIVE_REMINDER_IMPL.md` §0c and
> executed by `scripts/smoke-reminder-engine.js`). The renderer's
> `currentIntervention` is a TRANSLATION layer (intent → copy), and main's
> `applyInterventionBehavior` is an intent consumer (one delivery per intent +
> gentle refresh). The old per-frame level computation, silence gates
> (`shouldHoldMiraSilence`), surface gates (`shouldSurfaceReminder` /
> `isBusyForReminder`), escalation dwell and break-point latch are DELETED —
> the matrix smoke fails if they reappear. Sections below describing the old
> trigger conditions are historical until this doc's full rewrite lands with P4.

This file is the canonical self-check for EyeFlow's reminder levels. If any L1-L4 behavior changes, update this file and `scripts/smoke-intensity-matrix.js` in the same commit.

## Why This Exists

The reminder system is split across renderer code, main-process channel routing, the island window, settings copy, tray/menu copy, and install validation. Bugs happened when one layer changed without the others:

- L4 looked fixed in code, but the old running app process stayed alive after install, so the user kept testing an old build.
- L3 displayed as L3 but still behaved like L2 at the normal break point, so the green countdown rest did not start.
- L3 copy said "clear prompt" while code only triggered the clear channel under a narrower overrun branch.

The rule: do not trust visual labels alone. The source of behavior is `intervention.level`, `breakDue`, and main-process channel routing.

## Vocabulary

- `intensity`: persisted user setting: `quiet`, `standard`, `clear`, or `force`.
- `behavior level`: `intervention.level`; this is what main-process routing uses.
- `display level`: `intervention.displayLevel`; this is only UI labeling.
- `breakDue`: true when the current round reached the focus target, or when auto mode found a natural break.
- `reminder island`: the top green capsule window, implemented by `island.html` and driven by `showNotchIsland()`.
- `look-away rest`: the island's timed rest mode, started by `startIslandMicroRest()`.
- `desktop Mira`: the small companion window.

## Code Map

Engine, `eyeflow-reminder-engine.js` (P3, the only trigger authority):

- `pressureStep(prev, obs)`: monotonic pressure from `{ nowMs, idleSeconds }` only.
- `intentFor(state, settings)`: pressure level × intensity ceiling → `{ level, surface, breakDue, context }`.
- `settleRest(state, rest)`: micro reduces / full resets / micro-skip feeds the L3 gate / micro-uncertain books nothing.

Renderer, `index.html`:

- `currentIntervention(load)`: TRANSLATION layer — engine intent → level/displayLevel/title/copy. No trigger logic. Force escape window suppresses the intent here only; `hard-full` maps to level 4 → `startForceBreak`.
- `closeBreakRound({ reminderStatus, settle })`: the single round-closure + pressure-settlement exit.
- `shouldSurfaceReminder(intervention, load)`: decides whether a renderer-side pending reminder may be recorded.
- `maybeRecordReminder(intervention, load)`: creates or upgrades `state.pendingReminder`.
- `renderInterventionStrategy(load)`: starts L4 directly, otherwise records normal reminders.
- `renderCompanion(load)`: publishes `interventionLevel`, `interventionDisplayLevel`, `breakDue`, and reminder context to main.

Main process, `main.js`:

- `applyInterventionBehavior(state)`: single channel coordinator for companion bubble, island, and system notification.
- `startIslandMicroRest(message, reminderId)`: starts the green countdown rest and resolves the exact reminder.
- `showNotchIsland(input)`: creates/updates the island window.
- `startBreakLock(payload)`: starts the L4 fullscreen rest.
- `install-local-app.js`: must confirm old `/Applications/EyeFlow.app` exits before replacing the app.

Self-checks:

- `npm run smoke:intensity`: source-level L1-L4 matrix.
- `npm run smoke:installed`: installed app bundle matrix and packaging check.
- `npm run verify`: full source smoke chain.

## Canonical Matrix

| Level | Setting | Behavior Level | Trigger | User-Facing Surface | Main Channel |
| --- | --- | ---: | --- | --- | --- |
| L1 | `quiet` | 1 | Always quiet unless another non-intensity system is active | Mira state/text only | No bubble, no island, no notification |
| L2 | `standard` | 1 before target, 2 at break point | Focus target reached, or natural break | Mira bubble if visible; island countdown if Mira exited | `showBubble` when visible, `showRest` when exited |
| L3 | `clear` | 2 for early heads-up, 3 at normal break point/high load/obvious overrun | Target reached, high load, or target + 10 minutes | At real break point: green countdown + system notification even if Mira visible | `l3BreakPoint` forces `showRest` and `showNotify` |
| L4 | `force` | 1 before target, 2 pre-warning, 4 at break point | Target reached after explicit opt-in | Fullscreen rest lock | `renderInterventionStrategy()` bypasses normal reminders and calls `startForceBreak()` |

## L1: Quiet

### User Promise

L1 is non-interrupting. It may change Mira's state, expression, and text, but it must not pop a bubble, top capsule, system notification, or fullscreen takeover.

Settings copy:

```html
L1 只改变状态球、表情和文字，不弹气泡，也不打断你。
```

### Trigger Rules

- Selected by `state.settings.intensity === "quiet"`.
- Also used when deep-work quieting applies (`deepWorkMiraOnly`).
- `currentIntervention(load)` returns `level: 1`.

### Code Path

`index.html`:

```js
if (state.settings.intensity === "quiet" || deepWorkMiraOnly) {
  return {
    level: 1,
    title: "只让 Mira 轻轻变化",
    copy: ...
  };
}
```

`shouldSurfaceReminder()` blocks it:

```js
const level = Number(intervention.level || 1);
if (level < 2) return false;
```

`main.js` also has no active channel because `showBubble`, `showRest`, and `showNotify` all require `level >= 2`.

### Self-Check

- `scripts/smoke-intensity-matrix.js` must assert the L1 copy and `level: 1` quiet branch.

## L2: Light Prompt

### User Promise

L2 waits until a break point. Before the break point, Mira can visually change, but she should not start a clear rest interruption.

Settings copy:

```html
L2 到恢复断点时轻提一次
```

### Trigger Rules

- Selected by `state.settings.intensity === "standard"`.
- Before the target: when `load >= 48` or `elapsedMinutes >= focusTargetMinutes * 0.72`, it returns `level: 1` with L2 display styling.
- At the target: it returns behavior `level: 2`.
- Natural break can also return behavior `level: 2`.

### Code Path

Early phase:

```js
if (load >= 48 || elapsedMinutes >= focusTargetMinutes * 0.72) {
  const standardEarly = state.settings.intensity === "standard";
  return {
    level: standardEarly ? 1 : 2,
    displayLevel: chosenDisplayLevel,
    title: standardEarly ? "提前观察中" : "提前观察眨眼或远眺",
    copy: ...
  };
}
```

Break point:

```js
if (elapsedMinutes >= focusTargetMinutes) {
  return {
    level: state.settings.intensity === "clear" ? 3 : 2,
    displayLevel: chosenDisplayLevel,
    title: "到恢复断点",
    copy: ...
  };
}
```

For `standard`, this expression resolves to behavior `level: 2`.

### Main-Process Surface

When desktop Mira is visible:

```js
const showBubble = companionVisible && level >= 2 && !l3BreakPoint;
```

When desktop Mira has been exited/hidden by user preference:

```js
const showRest = islandEnabled && level >= 2 && (companionExited || l3BreakPoint);
```

For L2, `l3BreakPoint` is false, so the island countdown is the away channel, not the visible-Mira channel.

### Self-Check

- L2 pre-target must remain behavior `level: 1`.
- L2 target branch must remain behavior `level: 2`.
- L2 with visible Mira must not accidentally use the L3 visible-Mira countdown path.

## L3: Clear Prompt

### User Promise

L3 is the explicit reminder level. At the real break point, it must start the green countdown rest and system notification even when desktop Mira is visible.

Settings/menu copy:

```html
L3 状态信号偏高或明显超出目标时更明确——到真正恢复断点时，即使 Mira 在屏，也会用顶部岛的 20 秒歇眼和系统通知明确提示。
```

```js
{ label: "L3 明确 — 到点胶囊+通知", ... }
```

### Trigger Rules

L3 can enter behavior `level: 3` through three branches:

- Normal break point: `elapsedMinutes >= focusTargetMinutes`.
- High load: `load >= 74`.
- Obvious overrun: `elapsedMinutes >= focusTargetMinutes + 10`.

Normal break point is the important branch. It must not wait for the +10 minute branch.

```js
if (elapsedMinutes >= focusTargetMinutes) {
  return {
    level: state.settings.intensity === "clear" ? 3 : 2,
    displayLevel: chosenDisplayLevel,
    title: "到恢复断点",
    copy: ...
  };
}
```

For `clear`, this resolves to behavior `level: 3`.

### Renderer Reminder Gate

L3 at the break point must bypass the busy-activity blocker:

```js
const clearBreakDue = level >= 3
  && elapsedSeconds >= targetSeconds;
if (clearBreakDue) return true;
if (isBusyForReminder()) return false;
```

This matters because the user may still be typing at the target. L3 is chosen precisely because the user wants a clear interruption.

### Published State

`renderCompanion(load)` must publish behavior facts, not just display labels:

```js
const behaviorLevel = Number(intervention.level || 1);
const displayLevel = Number(intervention.displayLevel || intervention.level || 1);
const breakDue = Boolean(((isRunning || isAutoTracking()) && Number(elapsedSeconds) >= Number(els.focusTarget.value) * 60) || naturalBreak);

publishCompanionState({
  interventionLevel: behaviorLevel,
  interventionDisplayLevel: displayLevel,
  breakDue,
  ...
});
```

### Main-Process Surface

The central L3 rule is:

```js
const breakDue = Boolean(state.breakDue);
const l3BreakPoint = level >= 3 && breakDue;
const showBubble = companionVisible && level >= 2 && !l3BreakPoint;
const showRest = islandEnabled && level >= 2 && (companionExited || l3BreakPoint);
const showNotify = level >= 2 && (companionExited || l3BreakPoint) && (level >= 3 || !islandEnabled);
```

At the normal break point:

- `level >= 3` is true.
- `breakDue` is true.
- `l3BreakPoint` is true.
- `showBubble` is false.
- `showRest` is true.
- `showNotify` is true.

Then:

```js
if (showRest) {
  if (breakDue) {
    startIslandMicroRest(islandRestMessage(level), state.reminderId || null);
  } else {
    showNotchIsland({ mode: "text", message: islandNoticeMessage(state, level) });
  }
}
if (showNotify) notify(reminderMessage);
```

Expected result: top green countdown rest starts automatically.

### Failure Cases To Check First

When L3 does not start the countdown, check these in order:

0. Is `shouldHoldMiraSilence(load)` forcing `level: 1`? The silence gate runs before every non-force branch. Since 2026-07-10 it must return false whenever the real break point is due, and its deep-work branch must require `deepWorkMiraOnlyToggle`. (This gate was the top root cause of the 2026-07-10 "missing green capsule" dogfood bug — see `docs/REMINDER_AUDIT_2026-07-10.md`.)
1. Is the running process new? Use `ps -axo pid,ppid,etime,command | rg "EyeFlow.app|/Applications/EyeFlow"`. If elapsed time is older than the latest install, the user is testing an old process.
2. Does installed `index.html` contain `level: state.settings.intensity === "clear" ? 3 : 2` in the normal break-point branch?
3. Does `publishCompanionState` include `interventionLevel` and `breakDue`?
4. Is `showReminderIsland` false? If so, L3 should still notify, but no green capsule appears by design.
5. Is `breakLockWindow` visible? `showNotchIsland()` refuses to cover L4 fullscreen rest.

### Self-Check

- `npm run smoke:intensity` must guard L3 normal break point, high load, overrun, busy bypass, and main channel routing.
- `npm run smoke:installed` must guard the installed bundle has the same L3 normal break-point behavior.

## L4: Force Rest

### User Promise

L4 is fullscreen only after explicit opt-in. It should pre-warn before takeover, then enter fullscreen rest at the break point. It must not rely on ordinary reminder cards.

Settings/menu copy:

```html
L4 强制爱：只在你主动选择后启用；到恢复断点进入全屏恢复，倒计时结束前不显示返回按钮。
```

```js
{ label: "L4 强制爱… — 到点全屏，应用内开启", ... }
```

### Trigger Rules

In `currentIntervention(load)`:

- If L4 was recently emergency-exited, return `level: 1`, `displayLevel: 4`.
- If no round is running, return standby `level: 1`, `displayLevel: 4`.
- At focus target, return `level: 4`.
- At 72% of target, return pre-warning `level: 2`, `displayLevel: 4`.
- Otherwise return enabled quiet state `level: 1`, `displayLevel: 4`.

Break-point branch:

```js
if (elapsedMinutes >= focusTargetMinutes) {
  return {
    level: 4,
    title: "强制爱：全屏休息",
    copy: ...
  };
}
```

### Renderer Path

`renderInterventionStrategy(load)` handles L4 before normal reminder recording:

```js
const intervention = currentIntervention(load);
if (intervention.level >= 4) {
  startForceBreak(intervention);
  return true;
}
maybeRecordReminder(intervention, load);
```

`startForceBreak()` must close ordinary pending reminders honestly:

```js
if (!options.preview) closePendingReminder("ignored");
...
window.eyeflowDesktop.startForceBreak(payload);
```

### Main-Process Surface

L4 uses a separate fullscreen window:

- `startBreakLock(payload)`: creates/reuses `breakLockWindow`.
- `hideDashboardBehindBreakLock(previewWindow)`: hides the dashboard for real L4 rest.
- `hideEyeFlowAfterRealBreakLock()`: after real L4 completion, hides the EyeFlow app and returns the user to the previous work state.

L4 should not be represented by the normal green island countdown except for its pre-warning.

### Self-Check

- `npm run smoke:rest` guards break-lock flow.
- `npm run smoke:onboarding` guards L4 settings/menu and channel wiring.
- `npm run smoke:installed` guards installed break-lock code.

## Cross-Process Data Flow

```text
index.html render()
  -> currentIntervention(load)
  -> renderInterventionStrategy(load)
       -> L4: startForceBreak() and return
       -> L1-L3: maybeRecordReminder()
  -> renderCompanion(load)
       -> publishCompanionState({
            interventionLevel,
            interventionDisplayLevel,
            reminderPending,
            reminderId,
            breakDue,
            intensity
          })

main.js publish-state handler
  -> latestState = payload
  -> applyInterventionBehavior(latestState)
       -> showCompanionPanel()
       -> startIslandMicroRest()
       -> notify()
```

Important: `renderInterventionStrategy(load)` and `renderCompanion(load)` each call `currentIntervention(load)`. If changing intervention logic, both surfaces must still agree.

## Install And Runtime Validation

For local testing, code correctness is not enough. The user tests the running macOS app.

Required sequence:

```bash
npm run verify
npm run build:app
npm run install:local
npm run smoke:installed
ps -axo pid,ppid,etime,command | rg "EyeFlow.app|/Applications/EyeFlow"
```

The process elapsed time must be newer than the install. If not, the user is still testing an old process.

`scripts/install-local-app.js` must fail closed if it cannot verify the old app exited. It must never report "Installed" when `ps` failed.

## Required Update Checklist

Before changing any L1-L4 behavior:

- Update this file.
- Update settings copy in `index.html`.
- Update tray/menu copy in `main.js` if the promise changed.
- Update `scripts/smoke-intensity-matrix.js`.
- If the installed app could drift, update `scripts/smoke-installed-app.js`.
- Run `npm run smoke:intensity`.
- Run `npm run verify`.
- Build and install with `npm run build:app` and `npm run install:local`.
- Confirm the process is fresh.
- Run `npm run smoke:installed`.

## Red Flags

- "It displays L3" is not enough. Check behavior `level`.
- "It installed" is not enough. Check process elapsed time.
- "Pending reminder exists" is not enough. The green countdown comes from `applyInterventionBehavior()`.
- "System notification fired" is not enough. L3 real break point should also start `startIslandMicroRest()` when island is enabled.
- "L4 preview worked" is not enough. Preview intentionally does not follow all real L4 hide/return rules.
