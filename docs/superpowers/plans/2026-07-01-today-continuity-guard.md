# Today Continuity Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the Today page stranded-idle blank state by making Today phase derivation central, truthful, and guarded across every reachable idle path.

**Architecture:** Introduce one Today phase model in `index.html` and derive hero copy, `session-active`, controls, and continuity behavior from that model. Add a queued continuity guard that can auto-start only from an explicit `auto-startable-idle` phase, while blocked phases such as onboarding, break overlays, force-escape quiet time, and manual pause remain respected. Keep the implementation scoped to the current single-file app structure and existing smoke scripts.

**Tech Stack:** Electron renderer HTML/JS (`index.html`), extracted session view model (`eyeflow-session-flow.js` if needed), Node smoke scripts (`scripts/smoke-session-flow.js`, `scripts/smoke-installed-app.js`), existing `npm run verify` and packaged-app smoke commands.

---

## Files

- Modify: `index.html`
  - Add `deriveTodayPhase()`, `isTodayContinuityBlocked()`, and `queueTodayContinuity()`.
  - Update `render()`, `renderStateCenter()`, `renderSessionControls()`, `switchView()`, `pauseSession()`, `pauseAutoTracking()`, and `autoStartSessionOnOpen()`.
  - Keep all visual styling within the current EyeFlow design system classes; do not introduce a new visual design pass.
- Modify: `scripts/smoke-session-flow.js`
  - Add structural assertions for the central phase model, queued guard, blocked reasons, and truthfulness invariant.
- Modify: `scripts/smoke-installed-app.js`
  - Mirror the important installed-app assertions so packaged builds cannot regress.
- Optional Modify: `eyeflow-session-flow.js`
  - Only change this file if `sessionControlView()` needs a zero-second `paused` interpretation. Prefer leaving it alone if `renderSessionControls()` can pass the correct boolean.

## Required Product Invariants

- Hero says "这一轮进行中" only when the derived Today phase is `running`.
- `body.session-active` is true when and only when the Today phase should reveal active session modules.
- `auto-startable-idle` should not be visible to the user on Today; it queues a continuity start and exits the current render.
- `manual-paused` must block auto-start even when `elapsedSeconds === 0`.
- `force-quiet` must block auto-start until `state.forceEscapeUntil` expires.
- Break overlay, force break, and onboarding must block auto-start.
- `switchView("todayView")` must participate in the same continuity path as `render()`.
- The fix must not reintroduce the old duplicate "准备开始这一轮" first-screen preparation page.

## Task 1: Add Failing Smoke Assertions

**Files:**
- Modify: `scripts/smoke-session-flow.js`
- Modify: `scripts/smoke-installed-app.js`

- [ ] **Step 1: Add renderer invariants to `scripts/smoke-session-flow.js`**

Insert these assertions after the existing auto-start assertions near the current `autoStartSessionOnOpen()` checks:

```js
  assertMatches(
    indexHtml,
    /function\s+deriveTodayPhase\(\)\s*\{[\s\S]*return "needs-onboarding";[\s\S]*return "break-active";[\s\S]*return "force-quiet";[\s\S]*return "manual-paused";[\s\S]*return "running";[\s\S]*return "auto-startable-idle";/,
    "today phase centrally enumerates onboarding, break, force quiet, manual pause, running, and auto-startable idle"
  );
  assertMatches(
    indexHtml,
    /function\s+isTodayContinuityBlocked\([^)]*\)\s*\{[\s\S]*"needs-onboarding"[\s\S]*"break-active"[\s\S]*"force-quiet"[\s\S]*"manual-paused"/,
    "today continuity has explicit blocked reasons"
  );
  assertMatches(
    indexHtml,
    /let\s+todayContinuityQueued\s*=\s*false;[\s\S]*function\s+queueTodayContinuity\([^)]*\)\s*\{[\s\S]*if \(todayContinuityQueued\) return;[\s\S]*queueMicrotask\(\(\) => \{[\s\S]*if \(deriveTodayPhase\(\) !== "auto-startable-idle"\) return;[\s\S]*autoStartSessionOnOpen\(\);[\s\S]*render\(\);[\s\S]*persist\(\);/,
    "today continuity queues auto-start outside the current render to avoid re-entrant rendering"
  );
  assertMatches(
    indexHtml,
    /function\s+render\(\)\s*\{[\s\S]*const todayPhase = deriveTodayPhase\(\);[\s\S]*if \(todayPhase === "auto-startable-idle"\) \{[\s\S]*queueTodayContinuity\("render"\);[\s\S]*return;[\s\S]*document\.body\.classList\.toggle\("session-active", todayPhase === "running" \|\| todayPhase === "break-active"\);/,
    "render derives session-active from todayPhase and exits when continuity should start"
  );
  assertMatches(
    indexHtml,
    /function\s+switchView\(targetId\)[\s\S]*if \(targetId === "todayView"\) \{[\s\S]*queueTodayContinuity\("switch-view"\);[\s\S]*\}/,
    "switching back to Today participates in the central continuity guard"
  );
  assertNotMatches(
    indexHtml,
    /else\s*\{[\s\S]*els\.stateHeadline\.textContent = "这一轮进行中";[\s\S]*els\.stateAction\.textContent = "Mira 已开始计时。";[\s\S]*els\.primaryActionBtn\.hidden = true;[\s\S]*\}/,
    "idle state no longer masquerades as a running hero"
  );
```

- [ ] **Step 2: Add installed-app mirror assertions**

In `scripts/smoke-installed-app.js`, replace the old idle/running-only expectations around lines that currently assert the running hero with these assertions:

```js
  assertMatches(
    indexHtml,
    /function\s+deriveTodayPhase\(\)\s*\{[\s\S]*return "needs-onboarding";[\s\S]*return "break-active";[\s\S]*return "force-quiet";[\s\S]*return "manual-paused";[\s\S]*return "running";[\s\S]*return "auto-startable-idle";/,
    "installed Today phase centrally enumerates all display and continuity states"
  );
  assertMatches(
    indexHtml,
    /function\s+render\(\)\s*\{[\s\S]*const todayPhase = deriveTodayPhase\(\);[\s\S]*document\.body\.classList\.toggle\("session-active", todayPhase === "running" \|\| todayPhase === "break-active"\);/,
    "installed Today active layout follows the central phase"
  );
  assertMatches(
    indexHtml,
    /function\s+renderStateCenter\(load, todayPhase\)[\s\S]*case "running":[\s\S]*els\.stateHeadline\.textContent = "这一轮进行中";[\s\S]*case "manual-paused":[\s\S]*els\.stateHeadline\.textContent = "这一轮已暂停";[\s\S]*case "force-quiet":[\s\S]*els\.stateHeadline\.textContent = "Mira 先安静几分钟";/,
    "installed Today hero copy is truthful for running, manual pause, and force quiet"
  );
  assertNotMatches(
    indexHtml,
    /else\s*\{[\s\S]*els\.stateHeadline\.textContent = "这一轮进行中";[\s\S]*els\.stateAction\.textContent = "Mira 已开始计时。";/,
    "installed Today idle branch does not reuse running copy"
  );
```

- [ ] **Step 3: Run the failing tests**

Run:

```bash
npm run verify
```

Expected before implementation: `npm run verify` fails in `scripts/smoke-session-flow.js` or `scripts/smoke-installed-app.js` because `deriveTodayPhase()`, `queueTodayContinuity()`, and the new truthful phase rendering do not exist yet.

## Task 2: Centralize Today Phase and Pause Semantics

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add phase helpers near current session helpers**

Place these helpers near `isAutoTracking()` and `currentSessionState()`:

```js
    function forceQuietActive(now = Date.now()) {
      return Number(state.forceEscapeUntil || 0) > now;
    }

    function isManualPaused() {
      return sessionSource === "manual-paused";
    }

    function deriveTodayPhase() {
      if (!hasAssessedToday()) return "needs-onboarding";
      if (forceBreakActive || els.breakOverlay.classList.contains("show")) return "break-active";
      if (forceQuietActive()) return "force-quiet";
      if (isManualPaused()) return "manual-paused";
      if (isRunning || isAutoTracking() || elapsedSeconds > 0) return "running";
      return "auto-startable-idle";
    }

    function isTodayContinuityBlocked(todayPhase = deriveTodayPhase()) {
      return [
        "needs-onboarding",
        "break-active",
        "force-quiet",
        "manual-paused",
        "running"
      ].includes(todayPhase);
    }
```

- [ ] **Step 2: Preserve zero-second manual pause**

Change `pauseAutoTracking()` and `pauseSession()` so an explicit user pause stays explicit even at zero seconds:

```js
    function pauseAutoTracking() {
      sessionSource = "manual-paused";
      lastActivityRecordAt = 0;
      persist();
      render();
    }

    function pauseSession(endedBy = "paused") {
      if (!isRunning) return;
      syncRunningSessionClock();
      closeFocusSession(endedBy);
      isRunning = false;
      window.clearInterval(ticker);
      ticker = null;
      lastSessionTickAt = 0;
      sessionSource = "manual-paused";
      persist();
      render();
    }
```

Keep `resetSessionClock()`, `completeSessionForSystemRest()`, `maybeAutoCompleteBreak()`, and `resetDay()` allowed to set `sessionSource = "idle"` because those are system or reset transitions, not explicit user pause.

- [ ] **Step 3: Update paused consumers**

Replace paused checks that currently require elapsed time:

```js
paused: sessionSource === "manual-paused" && elapsedSeconds > 0
```

with:

```js
paused: isManualPaused()
```

At minimum update `currentSessionState()` and `renderSessionControls()`.

- [ ] **Step 4: Run tests**

Run:

```bash
npm run verify
```

Expected: the new smoke tests still fail because guard and render phase wiring are not complete, but existing pause-related assertions should be updated to match `manual-paused` semantics.

## Task 3: Add Queued Continuity Guard

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add the queued guard**

Place this near `autoStartSessionOnOpen()`:

```js
    let todayContinuityQueued = false;

    function queueTodayContinuity(reason = "render") {
      if (todayContinuityQueued) return;
      if (deriveTodayPhase() !== "auto-startable-idle") return;
      todayContinuityQueued = true;
      queueMicrotask(() => {
        todayContinuityQueued = false;
        if (deriveTodayPhase() !== "auto-startable-idle") return;
        autoStartSessionOnOpen({ reason });
        if (deriveTodayPhase() === "auto-startable-idle") return;
        render();
        persist();
      });
    }
```

- [ ] **Step 2: Make auto-start use blocked reasons**

Change `autoStartSessionOnOpen()` to accept a reason and use the central phase:

```js
    function autoStartSessionOnOpen(options = {}) {
      if (!ensureTodayReadyForAutoStart()) return;
      const todayPhase = deriveTodayPhase();
      if (isTodayContinuityBlocked(todayPhase)) return;
      if (todayPhase !== "auto-startable-idle") return;
      startSession();
    }
```

Do not clear `state.forceEscapeUntil` here. Only `startSession()` should clear it after the guard has already proven that force quiet is not active.

- [ ] **Step 3: Cover `switchView("todayView")`**

Add this block inside `switchView(targetId)` after view visibility and nav state are updated:

```js
      if (targetId === "todayView") {
        queueTodayContinuity("switch-view");
      }
```

- [ ] **Step 4: Run tests**

Run:

```bash
npm run verify
```

Expected: structural guard assertions pass. Remaining failures may be from `render()` and `renderStateCenter()` still not taking `todayPhase`.

## Task 4: Make Render and Hero Phase-Truthful

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Derive phase once in `render()`**

At the start of `render()` after rhythm/load derivation, add:

```js
      const todayPhase = deriveTodayPhase();
      if (!document.querySelector("#todayView").hidden && todayPhase === "auto-startable-idle") {
        queueTodayContinuity("render");
        return;
      }
```

Then replace:

```js
      document.body.classList.toggle("session-active", currentSessionState({ resting: restDue }) !== "idle" || elapsedSeconds > 0);
```

with:

```js
      document.body.classList.toggle("session-active", todayPhase === "running" || todayPhase === "break-active");
```

Call:

```js
      renderStateCenter(load, todayPhase);
```

instead of:

```js
      renderStateCenter(load);
```

- [ ] **Step 2: Make `renderStateCenter()` explicit**

Change the signature:

```js
    function renderStateCenter(load, todayPhase = deriveTodayPhase()) {
```

Replace its final state branch with this structure:

```js
      const sessionStarted = todayPhase === "running";

      if (load >= 74) {
        els.stateHeadline.textContent = "现在休息";
        els.stateAction.textContent = sessionStarted
          ? "到恢复断点了。"
          : "Mira 建议先休息。";
        els.stateExplain.textContent = "先离开屏幕一小段，回来再继续。";
        renderStateCues([]);
        els.primaryActionBtn.hidden = false;
        els.primaryActionBtn.dataset.intent = "rest";
        els.primaryActionBtn.textContent = "立即休息";
        return;
      }

      switch (todayPhase) {
        case "running":
          els.stateHeadline.textContent = "这一轮进行中";
          els.stateAction.textContent = "Mira 已开始计时。";
          els.stateExplain.textContent = load >= 48
            ? "状态偏高时我会先轻提醒；需要停下就点暂停或休息。"
            : "到恢复断点我再提醒；需要停下就点暂停或休息。";
          renderStateCues([]);
          els.primaryActionBtn.hidden = true;
          break;
        case "manual-paused":
          els.stateHeadline.textContent = "这一轮已暂停";
          els.stateAction.textContent = "Mira 会等你回来。";
          els.stateExplain.textContent = "点继续后，我再接着陪你守这一轮。";
          renderStateCues([]);
          els.primaryActionBtn.hidden = false;
          els.primaryActionBtn.dataset.intent = "start";
          els.primaryActionBtn.textContent = "继续这一轮";
          break;
        case "force-quiet": {
          const remainingMinutes = Math.max(1, Math.ceil((Number(state.forceEscapeUntil || 0) - Date.now()) / 60000));
          els.stateHeadline.textContent = "Mira 先安静几分钟";
          els.stateAction.textContent = `强制恢复刚被退出，约 ${remainingMinutes} 分钟后再提醒。`;
          els.stateExplain.textContent = "这段时间不会自动开启新一轮。";
          renderStateCues([]);
          els.primaryActionBtn.hidden = true;
          break;
        }
        case "needs-onboarding":
          els.stateHeadline.textContent = "先看一下今天状态";
          els.stateAction.textContent = "Mira 需要知道今天的眼睛状态。";
          els.stateExplain.textContent = "完成后，我会直接进入陪伴节奏。";
          renderStateCues([]);
          els.primaryActionBtn.hidden = false;
          els.primaryActionBtn.dataset.intent = "start";
          els.primaryActionBtn.textContent = "开始这一轮";
          break;
        case "break-active":
          els.stateHeadline.textContent = "正在恢复";
          els.stateAction.textContent = "Mira 正带你离开屏幕一下。";
          els.stateExplain.textContent = "完成恢复后再回到今天节奏。";
          renderStateCues([]);
          els.primaryActionBtn.hidden = true;
          break;
        case "auto-startable-idle":
        default:
          els.stateHeadline.textContent = "Mira 正在接上这一轮";
          els.stateAction.textContent = "马上开始计时。";
          els.stateExplain.textContent = "如果这句话停住不动，就是 continuity guard 没有接上。";
          renderStateCues([]);
          els.primaryActionBtn.hidden = true;
          break;
      }
```

The default copy is intentionally truthful and diagnostic. It should normally be invisible because `render()` returns before displaying `auto-startable-idle`.

- [ ] **Step 3: Run tests**

Run:

```bash
npm run verify
```

Expected: the new phase and truthfulness assertions pass. If old smoke assertions still require idle to contain running copy, update them to the new invariant rather than preserving the old bug.

## Task 5: Add Path-Specific Regression Coverage

**Files:**
- Modify: `scripts/smoke-session-flow.js`
- Modify: `scripts/smoke-installed-app.js`

- [ ] **Step 1: Add path assertions for the previously reachable idle paths**

Add these assertions to `scripts/smoke-session-flow.js`:

```js
  assertMatches(
    indexHtml,
    /function\s+tick\(\)\s*\{[\s\S]*completeSessionForSystemRest\("system-inactive-gap"\);[\s\S]*return;/,
    "tick long-gap path still records the inactive gap before exiting"
  );
  assertMatches(
    indexHtml,
    /function\s+completeSessionForSystemRest\(reason\)[\s\S]*sessionSource = "idle";[\s\S]*render\(\);[\s\S]*persist\(\);/,
    "system rest completion may reset to idle, relying on central continuity instead of local path patches"
  );
  assertMatches(
    indexHtml,
    /function\s+maybeAutoCompleteBreak\(activity\)[\s\S]*elapsedSeconds = 0;[\s\S]*sessionSource = "idle";[\s\S]*showToast\("Mira：你刚停下来一会儿，已自动记录一次休息。"\);/,
    "natural away completion can reset to idle without needing a local auto-start patch"
  );
  assertMatches(
    indexHtml,
    /function\s+finishForceBreak\(payload = \{\}\)[\s\S]*state\.forceEscapeUntil = Date\.now\(\) \+ SNOOZE_MINUTES \* 60 \* 1000;[\s\S]*sessionSource = elapsedSeconds > 0 \? "manual-paused" : "idle";[\s\S]*render\(\);[\s\S]*persist\(\);/,
    "force escape keeps a quiet window that the central guard must respect"
  );
  assertMatches(
    indexHtml,
    /function\s+resetDay\(\)[\s\S]*sessionSource = "idle";[\s\S]*state\.lastAssessmentDay = "";[\s\S]*render\(\);[\s\S]*persist\(\);/,
    "reset day returns to an unassessed state rather than being auto-started"
  );
```

- [ ] **Step 2: Mirror the highest-risk path assertions in installed smoke**

Add these to `scripts/smoke-installed-app.js` near the existing session lifecycle assertions:

```js
  assertMatches(
    indexHtml,
    /function\s+finishForceBreak\(payload = \{\}\)[\s\S]*state\.forceEscapeUntil = Date\.now\(\) \+ SNOOZE_MINUTES \* 60 \* 1000;[\s\S]*render\(\);[\s\S]*persist\(\);/,
    "installed force escape quiet window is preserved through render"
  );
  assertMatches(
    indexHtml,
    /function\s+switchView\(targetId\)[\s\S]*if \(targetId === "todayView"\) \{[\s\S]*queueTodayContinuity\("switch-view"\);[\s\S]*\}/,
    "installed Today navigation invokes the central continuity guard"
  );
```

- [ ] **Step 3: Run tests**

Run:

```bash
npm run verify
```

Expected: all smoke tests pass.

## Task 6: Manual App Verification

**Files:**
- No planned source edits.

- [ ] **Step 1: Build the app**

Run:

```bash
npm run build:app
```

Expected: build completes successfully and creates/updates the packaged app under `dist/`.

- [ ] **Step 2: Install locally**

Run:

```bash
npm run install:local
```

Expected: `/Applications/EyeFlow.app` is replaced with the new local build.

- [ ] **Step 3: Run installed smoke**

Run:

```bash
npm run smoke:installed
```

Expected: installed app smoke passes.

- [ ] **Step 4: Confirm the app is running**

Run:

```bash
pgrep -fl EyeFlow
```

Expected: output includes `/Applications/EyeFlow.app/Contents/MacOS/EyeFlow`.

- [ ] **Step 5: Visual check**

Open the Today page in the running app and verify:

- Running phase shows "这一轮进行中" and active modules are visible.
- Manual pause shows "这一轮已暂停" and does not auto-start by itself.
- Force escape shows "Mira 先安静几分钟" and does not auto-start during the quiet window.
- There is no visible blank Today page where the hero says running but session modules are hidden.

## Task 7: Final Diff Review and Commit

**Files:**
- Expected modified files:
  - `index.html`
  - `scripts/smoke-session-flow.js`
  - `scripts/smoke-installed-app.js`
  - optionally `eyeflow-session-flow.js`

- [ ] **Step 1: Show file scope**

Run:

```bash
git diff --name-status
```

Expected: only the files listed above are modified.

- [ ] **Step 2: Show compact diff summary**

Run:

```bash
git diff --stat
```

Expected: changes are focused on Today phase/guard and smoke coverage.

- [ ] **Step 3: Stage the focused unit**

Run:

```bash
git add index.html scripts/smoke-session-flow.js scripts/smoke-installed-app.js eyeflow-session-flow.js
```

If `eyeflow-session-flow.js` was not modified, use:

```bash
git add index.html scripts/smoke-session-flow.js scripts/smoke-installed-app.js
```

- [ ] **Step 4: Commit**

Run:

```bash
git commit -m "fix: centralize today continuity state"
```

Expected: one focused commit is created for the Today stranded-idle fix.

- [ ] **Step 5: Confirm clean worktree**

Run:

```bash
git status --short
```

Expected: no output.

## Self-Review

- Spec coverage: The plan covers the seven known stranded-idle paths by replacing local path patches with a central phase and continuity guard, while retaining explicit tests for tick gap, system lifecycle, natural away, reset day, force escape, zero-second manual pause, render, and switchView.
- Completion scan: The plan contains concrete file paths, functions, commands, snippets, and expected outcomes. It does not rely on deferred implementation notes.
- Type consistency: The phase names are consistently `needs-onboarding`, `break-active`, `force-quiet`, `manual-paused`, `running`, and `auto-startable-idle`. The guard functions consistently use `deriveTodayPhase()`, `isTodayContinuityBlocked()`, and `queueTodayContinuity()`.

## Execution Recommendation

Use inline execution for this repository unless a separate worktree is created first. The change is one cohesive state-machine fix and should land as one focused commit after verification, matching the project's current git hygiene agreement.
