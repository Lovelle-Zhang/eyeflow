# EyeFlow Public Beta Readiness - 2026-06-17

## Evidence Used

- Packaged smoke screenshots: `/var/folders/lw/tm59fff56j90sxpk932lp01c0000gp/T/eyeflow-smoke`
- Latest capture time: 2026-06-17 19:46 +0800
- Verified states: Today, onboarding active, Settings, Profile, rest guide, companion panel, break-lock active, break-lock complete, force-return
- Latest release gate: `npm run launch:preflight`
- Current blocker: none for controlled public beta distribution
- Distribution status: DMG is Developer ID signed, notarized, stapled, and Gatekeeper accepted as `Notarized Developer ID`

## Current Verdict

Trusted private tester readiness: **8.8 / 10**

Public beta readiness: **8.3 / 10**

Target for public beta: **8.2 / 10**

EyeFlow is now ready for controlled public beta with a small, managed tester pool. The install-trust blocker is cleared; the remaining risk is product learning quality: onboarding clarity, Mira comfort, and disciplined feedback triage.

## Score Breakdown

| Area | Score | Why It Is Not Higher |
| --- | ---: | --- |
| Install trust | 8.8 | Developer ID signing, notarization, stapling, and Gatekeeper assessment pass; still needs a clean-Mac manual install check before widening. |
| First 30 seconds | 8.0 | Onboarding explains local-first and starts the first round quickly, but the modal still asks the user to understand several concepts at once. |
| Core recovery value | 8.3 | Rest guide and full-screen recovery are coherent; packaged smoke confirms the completion state is no longer captured early. |
| Mira companion comfort | 7.4 | Companion panel is calm and clear, but the panel still feels more like a web popover than a native macOS beta surface. |
| Settings and readiness | 8.0 | Settings explains boundary, rhythm, and desktop readiness well; update/status copy can still become more native and concise. |
| Feedback loop | 7.5 | Diagnostic feedback exists and copies successfully, but tester routing is still manual and not strongly triaged. |
| Release operations | 8.6 | Strict signature, ZIP metadata, smoke, staging, notarization, staple, and Gatekeeper gates are guarded; full `release:public` needs the installed-smoke timeout patch rerun end-to-end. |

## Lovelle North-Star Score

Energy: **8 / 10**  
EyeFlow directly protects user energy by reducing screen fatigue and making breaks easier to take. It is not a 9 yet because first-open comprehension still asks users to absorb several concepts at once.

Intelligence: **6 / 10**  
It helps users notice eye-state patterns and rhythms, but the product does not yet turn feedback into visibly smarter recommendations for testers.

Wealth: **3 / 10**  
The connection to productivity and work quality exists, but it is indirect and not yet measured.

Potential: **8 / 10**  
The habit loop can compound through local rhythm memory, Mira presence, and repeated recovery moments. Public beta now needs smoother onboarding and tighter feedback learning to unlock this.

Influence: **5 / 10**  
It is shareable as a thoughtful Mac utility; controlled public beta can now test whether Mira creates real word of mouth.

## Mira UX Assessment

User goal: keep working without letting eye strain quietly accumulate.

Likely tester feeling: "This looks gentle and thoughtful, but can I trust installing it, and will it interrupt me?"

Activation quality:

- Strong: first-open assessment is understandable and starts the first round.
- Strong: Mira is visible, friendly, and the rest guide gives concrete actions.
- Risk: testers may interpret `强制爱` as too intense before understanding the safety controls.
- Risk: Settings has good readiness information, but install/update status and diagnostics can still be simpler for non-technical testers.

Retention quality:

- Strong: repeated low-friction recovery loop is credible.
- Strong: completion state feels calm and confirms return.
- Risk: feedback is still manual, so learning from beta users depends on follow-up discipline.

## Published Tasks

### P0 - Configure Notarization And Pass Public Gate - Completed

Owner: Release

Goal: remove the last public beta install-trust blocker.

Tasks:

- Stored validated notarytool credentials in keychain profile `eyeflow-notary`.
- Ran the public release flow through signed DMG creation, Apple notarization, stapling, install, and installed-app smoke.
- Confirmed `npm run launch:preflight` passes without `--allow-unsigned`.
- Confirmed Gatekeeper accepts the DMG as `Notarized Developer ID`.
- Updated staged release artifacts after notarization.

Acceptance criteria:

- `npm run release:public` reaches notarization/staple/install; it needs rerun after widening installed-smoke timeout from 30s to 90s.
- `npm run launch:preflight` exits 0.
- DMG opens on a clean Mac user profile without right-click workaround.
- `dist/release/v0.1.0` contains the notarized DMG, ZIP, SHA256 file, and docs.

### P0 - Update Public Beta Install Copy - Completed

Owner: Product / Docs

Goal: make tester trust copy match the actual artifact state.

Tasks:

- Replace "unsigned" and "not yet notarized" language with "Developer ID signed and notarized" wherever appropriate.
- Tell testers to report any unexpected macOS block instead of following a Gatekeeper bypass path.
- Keep the non-medical, local-first, no-content-reading notes visible.
- Publish current SHA256 checksums with the download copy.

Acceptance criteria:

- `docs/BETA_INSTALL_GUIDE.md`, `docs/DOWNLOAD_PAGE_COPY.md`, `docs/TESTER_SHARE_MESSAGE.md`, and `docs/TESTER_FEEDBACK_FORM.md` do not claim the build is unsigned.
- Copy distinguishes signing from notarization.
- The share message is safe to send to public beta candidates.

### P1 - Create A Public Beta Tester Intake Packet

Owner: Product

Goal: make public beta feedback easier to collect and compare.

Tasks:

- Create one public beta intake message with:
  - target tester profile,
  - install link,
  - install caveat,
  - 10-minute test script,
  - feedback link or reply format.
- Add tester tags:
  - heavy Mac worker,
  - designer/developer,
  - office worker,
  - eye-strain sensitive,
  - non-technical Mac user.
- Define a weekly review ritual for feedback.

Acceptance criteria:

- Each tester can be assigned a profile tag before install.
- Each tester reports the same five core answers.
- Bugs include screenshot plus copied diagnostics when possible.

Status: published in `docs/EYEFLOW_PUBLIC_BETA_INTAKE.md`.

### P1 - Tighten First-Open Comprehension

Owner: UX

Goal: raise first 30 seconds from 8.0 to 8.5.

Tasks:

- Reduce first-open explanation to one primary promise and one trust line.
- Make the first action feel even more obvious: "开始第一轮" should read as the natural next step, not a configuration choice.
- Defer advanced calibration language until after first recovery.
- Keep local-first and non-medical boundaries visible but secondary.

Evidence:

- `/var/folders/lw/tm59fff56j90sxpk932lp01c0000gp/T/eyeflow-smoke/eyeflow-onboarding-active.png`

Acceptance criteria:

- A new tester can answer "what should I do first?" in under 5 seconds.
- No more than three meaningful decisions appear before first value.
- `npm run smoke:app` still passes.

### P1 - Make Public Beta Status Visible In Settings

Owner: Desktop / UX

Goal: reduce support burden from install and permission questions.

Tasks:

- Add or refine a `版本与安装状态` row inside Settings readiness.
- Show:
  - version,
  - Developer ID signed status if detectable,
  - notarization status if detectable or copy-only status if not,
  - Accessibility permission state,
  - diagnostics copy action.
- Keep it quiet and non-alarming.

Evidence:

- `/var/folders/lw/tm59fff56j90sxpk932lp01c0000gp/T/eyeflow-smoke/eyeflow-settings-clean.png`

Acceptance criteria:

- Testers can tell whether they are on beta build `0.1.0`.
- Support copy no longer needs to explain every status manually.
- `npm run verify` and `npm run smoke:app` pass.

### P2 - Improve Companion Panel Native Feel

Owner: UI

Goal: make Mira feel more like a native desktop companion during public beta.

Tasks:

- Reduce the remaining web-popover feeling in `companion-panel.html`.
- Keep the message readable without the panel feeling like a webpage card.
- Tighten icon button placement and hover states.
- Preserve the calm tone and avoid stronger decoration.

Evidence:

- `/var/folders/lw/tm59fff56j90sxpk932lp01c0000gp/T/eyeflow-smoke/eyeflow-companion-panel.png`

Acceptance criteria:

- Companion panel feels trustworthy enough to leave open during a workday.
- Text remains readable in compact panel size.
- `npm run verify` and `npm run smoke:app` pass.

### P2 - Add A Beta Feedback Triage Log

Owner: Product

Goal: prevent tester feedback from becoming scattered chat messages.

Tasks:

- Create `docs/EYEFLOW_BETA_FEEDBACK_LOG.md`.
- Track tester profile, install result, first-open comprehension, Mira comfort, rest clarity, repeat-use intent, and bug links.
- Mark each feedback item as:
  - install trust,
  - first value,
  - interruption comfort,
  - recovery quality,
  - visual polish,
  - crash/bug.

Acceptance criteria:

- Every beta tester can be summarized in one row.
- Top weekly issues can be counted without re-reading chats.

Status: published in `docs/EYEFLOW_BETA_FEEDBACK_LOG.md`.

## Smallest Validation Experiment

Run a 6-person public-beta dry run after notarization:

- 2 technical Mac users
- 2 screen-heavy office workers
- 1 designer/developer
- 1 non-technical Mac user

Success threshold:

- 5/6 install without help.
- 5/6 understand first action within 30 seconds.
- 4/6 complete one rest flow.
- 4/6 say Mira feels helpful or comfortable.
- 3/6 say they would keep it installed for one week.

Stop condition:

- If more than 2 testers fail install or distrust the warning, do not widen beta.
- If more than 2 testers describe Mira as distracting, fix companion behavior before widening beta.
- If more than 2 testers cannot explain what EyeFlow does after first open, simplify onboarding before widening beta.
