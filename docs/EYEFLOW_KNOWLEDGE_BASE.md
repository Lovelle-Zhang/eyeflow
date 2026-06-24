# EyeFlow Knowledge Base

EyeFlow's interaction can feel soft, but its knowledge layer must stay rigorous. This document defines the eye-health concepts EyeFlow may use for product logic, scoring, future hardware signals, and user-facing explanations.

EyeFlow is not a medical device. It does not diagnose, treat, or prevent disease. The knowledge base supports behavioral load monitoring, recovery timing, and long-term local trend interpretation.

Last reviewed: 2026-06-10.

## Evidence Standard

Every product rule should be tagged with an evidence level.

| Level | Source type | Product use |
| --- | --- | --- |
| A | Clinical guideline, professional society statement, consensus report, systematic review, or meta-analysis | May influence default model structure and safety boundaries |
| B | Peer-reviewed study or validated instrument with a clear population and method | May influence feature weights after product validation |
| C | Product telemetry, user feedback, or ergonomic best practice | May personalize timing or UI, but cannot be framed as clinical evidence |
| D | Design hypothesis or team intuition | May be tested, but should not drive health claims |

Any claim shown to users must be phrased as a behavioral or comfort signal unless reviewed by qualified clinical advisors.

## Evidence Packet Format

Every knowledge item that affects product logic should be recorded as an evidence packet.

Required fields:

- `id`: stable internal identifier, such as `des.blink.reduced-rate`.
- `domain`: digital eye strain, ocular surface, accommodation, myopia context, recovery timing, posture, or environment.
- `evidenceLevel`: A, B, C, or D.
- `source`: citation or internal study reference.
- `lastReviewed`: YYYY-MM-DD.
- `claimBoundary`: what EyeFlow may say and what it must not say.
- `productUse`: score input, reminder rule, recovery content, copy guardrail, or future hardware signal.
- `limitations`: population, sample size, measurement limits, uncertainty, or conflicting evidence.

Example:

```json
{
  "id": "des.recovery.short-visual-break",
  "domain": "recovery timing",
  "evidenceLevel": "A",
  "source": "professional guidance / review literature",
  "lastReviewed": "2026-06-10",
  "claimBoundary": "May say short distance-viewing breaks can help reduce continuous near-focus burden; must not say it prevents eye disease.",
  "productUse": "recovery timing and explanation copy",
  "limitations": "Not a substitute for eye exam; response varies by person and underlying condition."
}
```

## Core Domains

### Digital Eye Strain

Digital eye strain is a symptom cluster rather than a single disease label. Common factors include prolonged near work, continuous screen viewing, reduced blinking, glare, poor lighting, dry indoor environments, uncorrected refractive error, and musculoskeletal posture load.

EyeFlow should model digital eye strain as multiple pathways:

- Ocular surface load: dryness, irritation, incomplete blink risk, air movement, low humidity.
- Accommodation load: sustained near focus, difficulty refocusing, prolonged close viewing.
- Vergence load: sustained convergence for near tasks, visual discomfort during long sessions.
- Extra-ocular load: neck, shoulder, posture, and general fatigue associated with screen work.

Product implication: one score must never pretend to be a diagnosis. The score should decompose into observable contributors and self-reported symptoms.

### Dryness And Ocular Surface Load

Screen use can reduce blink frequency and blink completeness for many users. Dryness risk is affected by screen attention, room humidity, airflow, contact lens use, medications, sleep, and ocular conditions.

EyeFlow can currently observe only indirect signals:

- Long continuous focus time.
- User-reported dryness.
- Reminder response and recovery completion.

Future hardware can improve this domain with blink rate, blink completeness, eyelid closure duration, ambient humidity, and airflow proxies.

Product implication: EyeFlow should guide blink, gaze-away, and environment checks, but it should not infer dry eye disease.

### Accommodation And Near-Work Load

Sustained close focus can contribute to visual fatigue. EyeFlow should treat near-work duration as a load contributor and recovery distance viewing as a recovery candidate.

Software-only inference is limited because the app does not know actual gaze distance. Future hardware should capture gaze distance, screen distance, and focal behavior proxies.

Product implication: focus duration is not enough. A long session with many natural breaks is different from a long uninterrupted near-focus session.

### Myopia And Long-Term Risk Context

Myopia risk is especially relevant for children and adolescents and should not be generalized carelessly to adult screen workers. Current evidence suggests outdoor time, near work, and screen use patterns are relevant risk-context variables, but EyeFlow should avoid making individual myopia-risk claims without clinical input and user age context.

Product implication: EyeFlow may track near-work exposure and outdoor-light exposure as future hardware/research variables, but the consumer app should avoid saying it prevents myopia.

### Recovery And Break Timing

The 20-20-20 rule is a widely used behavioral heuristic, but EyeFlow should not hard-code it as a universal medical standard. The product direction is better described as personalized low-interruption recovery:

- Use short visual breaks to reduce continuous near-focus load.
- Prefer natural break points when possible.
- Escalate only when load is high, session length is long, or the user has opted into stronger boundaries.
- Track whether reminders are completed, delayed, ignored, or naturally resolved.

Product implication: EyeFlow's value is not just "more reminders"; it is measuring which recovery timing actually works for the user.

## Knowledge To Product Mapping

| Knowledge concept | Current software signal | Future hardware signal | Product action |
| --- | --- | --- | --- |
| Continuous near work | Manual/automatic focus time | Gaze distance, screen-facing state | Estimate load accumulation |
| Blink/dryness risk | Dryness self-rating, session length | Blink rate, blink completeness, humidity | Suggest blink or hydration-oriented recovery |
| Refocusing burden | Blur self-rating, focus duration | Gaze distance shift, refocus latency proxy | Suggest distance viewing |
| High symptom load | Self-rated dryness, strain, blur, light sensitivity | Physiologic proxies after validation | Shorten next focus rhythm and raise confidence warning |
| Poor reminder fit | Ignored vs completed reminders | User state and context alignment | Reduce interruption and wait for natural breaks |
| Recovery effectiveness | Break completion, feedback | Post-break blink/gaze changes | Update rhythm recommendation |

## Source Registry

These sources are starting anchors, not the final clinical review. Each future model release should update this registry.

| Source | Type | Relevance |
| --- | --- | --- |
| American Academy of Ophthalmology, "Computers, Digital Devices and Eye Strain" (`https://www.aao.org/eye-health/tips-prevention/computer-usage`) | Professional education | Digital eye strain, blink behavior, screen-use guidance |
| American Academy of Ophthalmology, "Blue Light and Digital Eye Strain" (`https://www.aao.org/eye-health/tips-prevention/blue-light-digital-eye-strain`) | Professional education | Avoid over-claiming blue-light harm |
| American Optometric Association, "Computer Vision Syndrome" (`https://www.aoa.org/healthy-eyes/eye-and-vision-conditions/computer-vision-syndrome`) | Professional education | CVS symptoms, ergonomics, care boundary |
| TFOS DEWS II and TFOS Lifestyle reports (`https://www.tearfilm.org/`) | Consensus/report family | Dry eye, ocular surface, environment, lifestyle factors |
| Digital Eye Strain: Updated Perspectives, Clinical Optometry, 2024 | Review | DES mechanisms and management perspective |
| Digital Eye Strain - A Comprehensive Review, Ophthalmology and Therapy, 2022 | Review | DES definitions, symptoms, and management |
| Computer vision syndrome: a comprehensive literature review, Future Science OA, 2025 | Review | CVS evidence summary |
| JAMA Network Open 2025 screen-time/myopia meta-analysis, reported by Health and The Guardian | Meta-analysis / secondary reporting | Screen time and myopia association; requires careful age-specific interpretation |
| ESPiM: Eye-Strain Probation Model, 2023 (`https://arxiv.org/abs/2311.18480`) | Research prototype | Eye-tracking-based strain modeling direction |
| Fundus2Globe, 2025 (`https://arxiv.org/abs/2502.13182`) | Research prototype | Future precision-ophthalmology and digital-twin direction |

## Knowledge Update Workflow

- Review source registry before each public release and whenever scoring logic changes.
- Prefer professional organizations, consensus reports, systematic reviews, and peer-reviewed studies over popular summaries.
- Track emerging research separately from product claims. Research prototypes can inspire future hardware strategy, but they cannot justify consumer health claims without validation.
- Keep a claim inventory for all user-facing language about eyes, symptoms, score meaning, recovery, myopia, dryness, and blue light.
- Require clinical or qualified expert review before moving any claim from internal reasoning to marketing copy or onboarding copy.
- If evidence changes, update the knowledge base first, then the scoring model, then UI copy.

## Clinical Review Requirements

Before any claim moves from internal model logic to user-facing language:

- Mark whether the claim is behavioral, ergonomic, wellness, or clinical.
- Attach evidence level and source.
- Define excluded populations and warning signs.
- Confirm the language does not imply diagnosis or treatment.
- Add a fallback recommendation to consult a qualified eye-care professional for persistent pain, vision changes, severe dryness, flashes, floaters, or headaches.
