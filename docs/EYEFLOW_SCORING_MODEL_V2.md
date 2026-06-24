# EyeFlow Scoring Model V2

The current EyeFlow load score is a useful product estimate, but the next model should become explainable, source-aware, and hardware-ready. This document defines the target shape for V2.

The score is not a diagnosis. It is a behavioral eye-load estimate that helps EyeFlow choose recovery timing, disturbance level, and explanation copy.

Inputs should carry data provenance, evidence references, and confidence metadata. The model should be able to explain not only "why this score", but also "what the score does not know yet".

## Model Goals

- Explain every score with visible contributors.
- Separate symptom load, behavior load, recovery offset, environment load, and confidence.
- Support software-only mode today and hardware-enhanced mode later.
- Preserve local-first privacy and user control.
- Avoid medical claims.

## Output Contract

```json
{
  "modelVersion": "2.0.0",
  "load": 0,
  "zone": "comfort",
  "confidence": "low",
  "contributors": {
    "symptom": 0,
    "behavior": 0,
    "recovery": 0,
    "environment": 0,
    "responseFit": 0
  },
  "evidenceRefs": [],
  "explanation": [],
  "missingSignals": [],
  "safetyFlags": []
}
```

## Score Components

| Component | Range | Current inputs | Future hardware inputs | Direction |
| --- | --- | --- | --- | --- |
| Symptom load | 0-40 | dryness, strain, blur, light sensitivity | symptom + physiologic proxies after validation | Higher symptoms increase load |
| Behavior load | 0-35 | continuous focus time, session source | gaze distance, screen-facing probability, posture | Longer uninterrupted near work increases load |
| Recovery offset | -25-0 | completed breaks, natural breaks, feedback | post-break blink/gaze recovery | Completed recovery reduces load |
| Environment load | 0-15 | currently missing | ambient lux, humidity, airflow proxy | Poor environment increases load |
| Response fit | -10-10 | ignored/snoozed/completed reminders | context-aware acceptance | Poor fit lowers interruption level, not necessarily eye load |

The final score should be clamped to 0-100.

## Confidence Model

Confidence is separate from load.

| Confidence | Condition |
| --- | --- |
| Low | Few samples, current-day only, no hardware, no stable baseline |
| Medium | 3+ samples or 2+ recorded days, consistent symptom/log pattern |
| High | 8+ samples or 5+ recorded days, stable baseline and low missingness |
| Research | Hardware-enhanced with validated signal quality and clinical review |

User-facing copy should say "data completeness" or "confidence", not "accuracy".

## Zone Thresholds

Initial zones:

- Comfort: 0-47
- Medium load: 48-73
- High load: 74-100

These thresholds are product thresholds, not clinical thresholds. They should be calibrated with real-world data and reviewed before any external claims.

## Explanation Rules

Each score should return the top 2-3 contributors:

- "Main signal: strain 6/10."
- "Continuous near-work estimate is above today's baseline."
- "Completed recovery reduced current load."
- "Reminder fit is poor today, so EyeFlow should stay quieter."

Avoid:

- "You have dry eye."
- "Your myopia risk is high."
- "This prevents eye disease."

Prefer:

- "Dryness signal is elevated."
- "Near-work load is high today."
- "This is a behavioral estimate, not a medical diagnosis."

## Safety Flags

Safety flags do not diagnose. They tell EyeFlow to stop normal coaching and recommend professional care language.

| Flag | Trigger example | User-facing boundary |
| --- | --- | --- |
| `persistent_severe_symptoms` | repeated 8-10 symptom ratings | Consider consulting an eye-care professional |
| `vision_change_reported` | severe blur or sudden visual change self-report | Do not continue ordinary wellness framing |
| `pain_or_headache_repeated` | future symptom expansion | Recommend professional evaluation |
| `low_confidence_high_load` | high score with few samples | Explain uncertainty clearly |

## Data Lineage

Every score should retain enough metadata to audit how it was produced.

Required lineage fields:

- `modelVersion`
- `knowledgeBaseVersion`
- `dataDictionaryVersion`
- `inputWindow`
- `inputSources`
- `missingSignals`
- `qualityFlags`
- `evidenceRefs`

Lineage is product infrastructure. It makes future hardware integrations trustworthy because a user, tester, or reviewer can tell whether a score came from self-report, session timing, desktop context, or validated hardware signals.

## Personal Baseline

V2 should compare users against their own history:

- 7-day acute trend.
- 30-day working baseline.
- 90-365 day long-term archive.

The model should distinguish:

- High absolute load.
- High load relative to personal baseline.
- High volatility.
- Poor recovery adherence.
- Poor reminder fit.

## Hardware Upgrade Path

Hardware should not simply add "more data"; it should resolve current uncertainty.

| Current uncertainty | Hardware signal |
| --- | --- |
| Is the user actually looking at a screen? | screen-facing probability |
| Is the user working close up? | gaze/viewing distance |
| Is dryness risk plausible? | blink rate and completeness |
| Is the room visually stressful? | ambient lux and contrast context |
| Is recovery effective? | post-break blink/gaze pattern shift |
| Is posture contributing? | head pitch and stability |

## Model Governance

Every model release should record:

- `modelVersion`
- `knowledgeBaseVersion`
- training/calibration data scope, if any
- known limitations
- excluded populations
- reviewed user-facing claims
- privacy impact review

## Current Implementation Bridge

As of 2026-06-10, the app has a software-only V2 bridge:

- `computeEyeLoadAnalysis` returns load, zone, confidence, contributors, missing signals, evidence references, and lineage versions.
- `computeEyeLoadScore` remains compatible for existing reminder and rhythm logic.
- Local logs store `modelVersion` and an `analysis` snapshot for future review.
- The Profile page shows score contributors and missing signal state so the professional data layer is visible in-product.
- The Profile page includes a folded data/model console with local event counts, recent event JSON, and JSON/CSV export.
- A local `events` stream records `onboarding_event`, `daily_assessment`, `focus_session`, `recovery_event`, and `reminder_event` as a foundation for future backend or hardware ingestion.

This is still not a clinical model and does not include hardware signals yet.

## V2 Implementation Plan

1. Add contributor breakdown to the existing `computeEyeLoad` pipeline.
2. Store model version with every log entry.
3. Add missing-signal metadata to profile summaries.
4. Replace single confidence text with confidence object.
5. Add personal baseline calculation from 30/90/365 day archives.
6. Prepare hardware sample ingestion behind a disabled future schema.
