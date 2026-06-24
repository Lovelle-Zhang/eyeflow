# EyeFlow Data Dictionary

EyeFlow's data model should be ready for both the current macOS app and a future hardware ecosystem. The model must be local-first by default, privacy-preserving, and explicit about what is measured, inferred, or self-reported.

## Principles

- Local-first storage is the default.
- No document contents, keystrokes, passwords, messages, or browsing history.
- Separate raw observations from inferred scores.
- Every field should have a unit, source, retention policy, and model role.
- Future hardware fields should be designed now, even if not collected yet.
- Health-related fields require stricter consent, review, and export controls.

## Privacy Levels

| Level | Meaning | Examples |
| --- | --- | --- |
| P0 | Non-sensitive product state | Selected recovery mode, window bounds |
| P1 | Local behavioral telemetry | Focus duration, break completion, reminder response |
| P2 | Health-adjacent self-report | Dryness, strain, blur, light sensitivity |
| P3 | Desktop context | Foreground app name, idle state |
| P4 | Future biometric / hardware signal | Blink rate, gaze distance, eye images, tear-film proxies |

P4 data must not be introduced without explicit consent, separate privacy copy, and a data-export/delete plan.

## Current Software Fields

| Field | Type | Unit | Source | Privacy | Model role |
| --- | --- | --- | --- | --- | --- |
| `currentDay` | string | YYYY-MM-DD | App clock | P0 | Daily boundary |
| `elapsedSeconds` | number | seconds | Session timer / desktop activity | P1 | Continuous screen-load feature |
| `focusTarget` | number | minutes | User setting / model suggestion | P0 | Rhythm plan |
| `breakTarget` | number | seconds | User setting / model suggestion | P0 | Recovery plan |
| `breaks` | number | count/day | Completed rest events | P1 | Recovery offset |
| `logs[].load` | number | 0-100 | EyeFlow inference | P2 | Historical score trend |
| `logs[].symptoms.dryness` | number | 0-10 | User self-report | P2 | Ocular surface symptom |
| `logs[].symptoms.strain` | number | 0-10 | User self-report | P2 | Accommodation/effort symptom |
| `logs[].symptoms.blur` | number | 0-10 | User self-report | P2 | Refocusing symptom |
| `logs[].symptoms.light` | number | 0-10 | User self-report | P2 | Light sensitivity symptom |
| `reminderStats.shown` | number | count/day | App event | P1 | Reminder exposure |
| `reminderStats.completed` | number | count/day | User action | P1 | Reminder acceptance |
| `reminderStats.snoozed` | number | count/day | User action | P1 | Reminder deferral |
| `reminderStats.ignored` | number | count/day | App event | P1 | Reminder mismatch |
| `reminderStats.autoBreaks` | number | count/day | System lifecycle | P1 | Natural recovery proxy |
| `settings.intensity` | enum | L1-L4 | User setting | P0 | Disturbance ceiling |
| `settings.recoveryMode` | enum | light/neck/breath/exercise/mixed | User setting | P0 | Recovery content |
| `summaryHistory[]` | array | day records | Local archive | P1/P2 | Longitudinal baseline |
| `sessionSource` | enum | idle/auto/manual/paused | App state | P1 | Timer interpretation |

## Desktop Context Fields

These are optional and depend on macOS permissions.

| Field | Type | Unit | Source | Privacy | Model role |
| --- | --- | --- | --- | --- | --- |
| `foregroundAppName` | string | app name | Accessibility permission | P3 | Work context class, reminder timing |
| `idleSeconds` | number | seconds | macOS idle state | P1 | Natural break detection |
| `isFullscreen` | boolean | true/false | Window state | P3 | Interruption suppression |
| `systemLifecycleEvent` | enum | lock/sleep/wake/quit | macOS lifecycle | P1 | Natural rest boundary |

Foreground app names should be stored only when needed for local logic. Do not store document titles, URLs, message text, or typed content.

## Future Hardware Fields

These fields are not collected in the current app. They define the hardware-ready schema.

| Field | Type | Unit | Suggested sampling | Privacy | Model role |
| --- | --- | --- | --- | --- | --- |
| `blinkRate` | number | blinks/min | 30-60 sec window | P4 | Ocular surface load |
| `blinkCompleteness` | number | 0-1 | 30-60 sec window | P4 | Dryness risk proxy |
| `eyeClosureDurationMs` | number | ms | event-level | P4 | Blink quality / rest proxy |
| `gazeDistanceCm` | number | cm | 5-30 sec window | P4 | Near-work load |
| `screenFacingProbability` | number | 0-1 | 5-30 sec window | P4 | Screen exposure |
| `gazeShiftDistance` | number | degrees or relative units | 30-60 sec window | P4 | Visual variability |
| `ambientLux` | number | lux | 1-5 min window | P3/P4 | Lighting / outdoor proxy |
| `relativeHumidity` | number | percent | 5-15 min window | P3 | Dryness environment |
| `headPitch` | number | degrees | 30-60 sec window | P4 | Posture load |
| `viewingDistanceStability` | number | variance | 5-15 min window | P4 | Sustained near-work pattern |
| `tearFilmProxy` | number | TBD | clinical/hardware research | P4 | Future ocular surface model only |

Eye image, video, or high-frequency gaze data must be opt-in, encrypted at rest, and excluded from ordinary product telemetry.

## Consent And Provenance Fields

These fields should accompany any hardware or research-grade event.

| Field | Type | Meaning |
| --- | --- | --- |
| `consentVersion` | string | The exact consent copy accepted by the user |
| `consentScope` | array | Local use, export, research share, cloud sync, or model improvement |
| `captureMode` | enum | off / summary-only / raw-local / export-enabled |
| `deviceId` | string | Local device identifier, rotated or anonymized where possible |
| `deviceModel` | string | Hardware model |
| `firmwareVersion` | string | Firmware build used when the sample was captured |
| `calibrationVersion` | string | Calibration profile or algorithm version |
| `signalQuality` | number | 0-1 quality estimate for a sample or window |
| `processingLevel` | enum | raw / derived / aggregated / anonymized |
| `retentionClass` | enum | session / daily-summary / user-archive / research-export |

No hardware signal should enter scoring without provenance and quality metadata.

## Event Schema

Current implementation note: the macOS app now stores a local `events` stream for core event types and exposes a folded data/model console for local JSON/CSV export. Hardware samples remain future-only.

### `onboarding_event`

Required fields:

- `eventId`
- `day`
- `at`
- `phase`
- `funnel`

Recommended fields:

- `computedLoad`
- `rhythmFocusMinutes`
- `rhythmRestSeconds`
- `preset`
- `symptom`
- `value`

Use this to diagnose first-run activation: viewed, preset selected, symptom changed, skipped, assessment completed, recovery preview started, and first focus started.

### `daily_assessment`

Required fields:

- `eventId`
- `day`
- `createdAt`
- `symptoms`
- `computedLoad`
- `modelVersion`
- `confidence`

### `focus_session`

Required fields:

- `eventId`
- `startedAt`
- `endedAt`
- `durationSeconds`
- `source`
- `interruptedByBreak`
- `loadAtStart`
- `loadAtEnd`

### `recovery_event`

Required fields:

- `eventId`
- `startedAt`
- `endedAt`
- `durationSeconds`
- `mode`
- `completed`
- `feedback`
- `trigger`

Recommended fields:

- `firstRecoverySample`
- `loadAfter`

### `reminder_event`

Required fields:

- `eventId`
- `shownAt`
- `loadAtShown`
- `trigger`
- `intensityCeiling`
- `userResponse`
- `responseLatencySeconds`

### `hardware_sample`

Future-only fields:

- `sampleId`
- `capturedAt`
- `windowSeconds`
- `deviceId`
- `firmwareVersion`
- `signals`
- `qualityFlags`

## Derived Metrics

| Metric | Inputs | Meaning |
| --- | --- | --- |
| `eyeLoad` | symptoms, continuous focus, recovery offsets, reminder state | Behavioral eye-load estimate |
| `loadZone` | `eyeLoad` | comfort / medium / high |
| `dailyPeakLoad` | day logs | Highest estimated load in a day |
| `handledReminderRate` | completed + snoozed / shown | Reminder fit and acceptability |
| `recoveryDensity` | breaks / focus hours | Recovery frequency |
| `dataCompleteness` | sample count, history days, hardware quality | Confidence proxy |
| `personalBaseline` | 30-365 day history | User-specific normal range |
| `loadVolatility` | intraday and multi-day load range | Stability of pattern |

## Data Quality Flags

| Flag | Meaning | Product response |
| --- | --- | --- |
| `missing_symptoms` | User has not recorded symptoms recently | Lower score confidence |
| `short_history` | Fewer than 7 recorded days | Avoid long-term claims |
| `permission_limited` | Desktop context unavailable | Use manual/session timing only |
| `hardware_unavailable` | No validated hardware signals | Show software-only confidence |
| `low_signal_quality` | Hardware sample below quality threshold | Exclude from scoring |
| `baseline_shift` | Recent pattern differs strongly from historical baseline | Explain as trend, not diagnosis |

## Retention

Current local archive target:

- Daily summary history: up to 365 days.
- Raw interaction events: local-first; future retention should be configurable.
- Hardware raw samples: future-only; default should be summarized and minimized.

Cloud sync, research export, or model training should be opt-in and separate from the core app.

## Export Shape

Future export should support:

- User-readable daily CSV.
- Machine-readable JSONL events.
- Summary parquet/CSV for research only after consent.
- Source metadata with model version and evidence version.
