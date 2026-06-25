# EyeFlow Design System

This document is the source of truth for new EyeFlow UI. Use the shared tokens in `eyeflow-design-system.css`; do not introduce one-off font sizes, gaps, padding, radius, or motion values unless there is a documented reason.

## Design Intent

EyeFlow should feel quiet, native to macOS, and low-interruption. UI density should support repeated daily use rather than marketing-style emphasis.

EyeFlow / Mira should aim for the texture of an Apple-native macOS companion app: stable, preference-row driven, lightly grouped, and trustworthy enough to remain open beside daily work. For settings and configuration surfaces, prefer macOS preference page patterns over dashboard modules.

Use:

- Restrained type sizes.
- Compact but breathable spacing.
- Few visual layers.
- 8px default radius for app surfaces.
- Soft motion that confirms state without demanding attention.
- Calm cross-fades for any brightness change. The 白天⇄晚上 switch must ease between themes (~460ms, `--ef-ease-calm`), never hard-cut — EyeFlow is an eye-care product and a luminance flash is a comfort defect. See "Eye-Comfort DNA" in `docs/EYEFLOW_PRODUCT_MEMORY.md`. Always honor `prefers-reduced-motion` (instant, flash-free fallback).

Avoid:

- Random intermediate font sizes.
- Nested cards inside cards.
- Oversized headings in tool surfaces.
- Heavy shadows, decorative glow, and loud color blocks.
- Layout spacing chosen by eye without token reference.
- Dashboard-style cards for preference pages.
- Thick borders, large status-color containers, and module tiles when a preference row is enough.

## Preference Page Patterns

Use these structures for settings and configuration:

- `ef-preference-section` for a lightly grouped section.
- `ef-preference-row` for label / value / action rows.
- `ef-segmented-control` for mutually exclusive modes such as L1-L4.
- `ef-status-pill` only for compact state summaries.
- `ef-disclosure-row` for collapsed advanced settings.
- `ef-sidebar-selected` for low-weight sidebar selection.

Rules:

- Preference pages should be built from rows, segmented controls, and light disclosure rows, not dashboard cards.
- A row should usually contain one label, one value, and at most one action.
- Status color should be a small hint, never a large container.
- Use spacing, alignment, and hierarchy before adding borders or background color.
- Expanded advanced content should remain row/list based and should not reintroduce large cards.

## Typography

Use the token that matches the job:

| Use | Token | Size | Line height |
| --- | --- | ---: | ---: |
| Tiny chart labels, dense metadata | `--ef-text-micro` | 11px | `--ef-line-compact` |
| Secondary companion copy | `--ef-text-caption` | 11.5px | `--ef-line-compact` |
| Labels, helper text, small buttons | `--ef-text-meta` | 12px | `--ef-line-body` |
| Quiet descriptions | `--ef-text-helper` | 12.5px | `--ef-line-body` |
| Dense body text | `--ef-text-body-sm` | 13px | `--ef-line-body` |
| Standard app body | `--ef-text-body` | 14px | `--ef-line-body` |
| Main reading body | `--ef-text-body-lg` | 15px | `--ef-line-body` |
| Longer reading text | `--ef-text-reading` | 15.5px | `--ef-line-reading` |
| Card titles | `--ef-text-title-sm` | 16px | `--ef-line-title` |
| Section titles | `--ef-text-title-md` | 18px | `--ef-line-title` |
| Page titles | `--ef-text-title-lg` | 22px | `--ef-line-tight` |
| Empty-state or hero title | `--ef-text-display-sm` | 28px | `--ef-line-tight` |

Rules:

- Use `letter-spacing: 0` for normal text.
- Reserve display sizes for welcome, empty, or lock screens.
- Prefer 12px to 13px for labels; prefer 14px to 15px for normal controls.
- Chinese body copy should usually use `--ef-line-body` or `--ef-line-reading`.

## Spacing

Use the shared 2px-based spacing scale:

| Token | Value | Use |
| --- | ---: | --- |
| `--ef-space-1` | 4px | Icon/text micro gaps |
| `--ef-space-2` | 6px | Tight text stacks |
| `--ef-space-3` | 8px | Title/body gaps |
| `--ef-space-4` | 10px | Compact component gaps |
| `--ef-space-5` | 12px | Standard internal gaps |
| `--ef-space-6` | 14px | Dense card padding |
| `--ef-space-7` | 16px | Standard card padding |
| `--ef-space-8` | 18px | Larger groups |
| `--ef-space-9` | 20px | Section blocks |
| `--ef-space-10` | 24px | Page padding |
| `--ef-space-12` | 32px | Large screen padding |

Rules:

- Text title to body: 6-8px.
- Component icon to label: 6-8px.
- Card internal padding: 14-16px.
- Form or setting row gap: 10-12px.
- Section gap: 18-24px.
- Page padding: 24-32px.

## Radius

| Token | Value | Use |
| --- | ---: | --- |
| `--ef-radius-xs` | 4px | Tiny badges, small pointers |
| `--ef-radius-sm` | 6px | Pills, compact controls |
| `--ef-radius-md` | 8px | Default cards, panels, inputs |
| `--ef-radius-lg` | 12px | Modals and larger sheets |
| `--ef-radius-xl` | 16px | Rare large calm surfaces |
| `--ef-radius-pill` | 999px | Segmented markers and fully-round dots (NOT status labels — those are 8px) |
| `--ef-radius-companion` | 22px | Mira companion body |

Rules:

- Default to `--ef-radius-md`.
- Do not use large rounded cards for ordinary app sections.
- Use the companion radius only for Mira character surfaces.

## Controls

| Token | Value | Use |
| --- | ---: | --- |
| `--ef-control-sm` | 28px | Compact chips and small buttons |
| `--ef-control-md` | 34px | Default buttons and inputs |
| `--ef-control-lg` | 40px | Primary actions in setup or rest flows |
| `--ef-hit-target` | 32px | Minimum comfortable click target |

Rules:

- Standard button text: 13-14px.
- Use 8-12px horizontal icon/label spacing.
- Primary actions should be calm, not visually loud.

## Button Tiers

Every action button shares ONE metric set — height 36px (timer controls go large
at 40px), radius 10px, font 14/500, icon-to-label gap 6px. Tiers differ ONLY in
fill, never in size/radius/type. Do not introduce new heights or radii for buttons.

| Tier | Class | Fill | Use |
| --- | --- | --- | --- |
| ① Primary | `.primary` | solid `--btn-primary-bg`, `--btn-primary-fg` text | The one real action per view (e.g. 开始这一轮, 现在休息). At most one. |
| ② Secondary | `.btn-tonal` | `--btn-tonal-bg` (sage), `--btn-tonal-fg` text, NO border | Parallel/secondary actions (休息, 开启增强感知). |
| ③ Ghost | `.ghost` | none — text (+ optional icon), `--btn-ghost-fg`, faint tonal hover | Low-emphasis actions (为什么, 导出, 调整节奏, 退出 Mira). |
| ④ Icon | `.icon-btn` | 36px square, hairline `--btn-icon-border`, icon only | Compact icon-only actions. |

Roles are NOT styling. Classify each control by what it does, then pick the tier:

- **Action** → tiers ①–④ above.
- **Mode / state** (a toggle or a read-only state, NOT a real action) → the low-key
  sage **mode pill** (`.session-state-pill`): 28px, `--mode-pill-bg` tonal, no border,
  radius 8px. It must NOT wear action styling. A control whose role changes by state
  (e.g. `#startBtn` = primary action when 暂停/继续/开始, but a mode toggle when 手动专注
  during auto-tracking) switches treatment in JS by state, not via a fixed class.
- **Status** (read-only) → the one **status pill** (`.readiness-status`, `.state-cue`,
  `.profile-share-metric`, `.ef-status-pill`, `.tag`, `.archive-window-pill`,
  `.profile-trend-tag`): tonal, small, optional leading dot. Read-only labels must
  NOT carry a border or solid fill that makes them look pressable. **All read-only
  status labels share ONE radius — 8px (`--ef-radius-md`); never `--ef-radius-pill`.**
  Two weights: TIER A neutral statements (current-state facts) → `.status-quiet`
  (transparent + leading dot, `--mode-pill-fg` text); TIER B mild-signal states →
  faint `--status-pill-bg`, no border. 28px / 12·500.

Segmented controls (白天/晚上, the L1–L4 rhythm selector) are their own single
component each — do not rebuild them as button rows.

All tier colors are tokenized (`--btn-*`, `--mode-pill-*`, `--status-pill-*`) with
light and dark values, so tiers render correctly in both themes.

## Icons And Symbols

Icons and symbols must have a consistent visual weight. A 14px label paired with a heavy 22px plus sign will make the UI feel web-like and noisy even if the text scale is correct.

| Token | Value | Use |
| --- | ---: | --- |
| `--ef-icon-xs` | 12px | Dense metadata, tiny inline status |
| `--ef-icon-sm` | 14px | Small controls, compact rows |
| `--ef-icon-md` | 16px | Default buttons, settings rows |
| `--ef-icon-lg` | 20px | Empty states, larger companion actions |
| `--ef-icon-xl` | 24px | Rare hero or lock-screen symbols |
| `--ef-icon-stroke-quiet` | 1.4 | Secondary or low-emphasis icons |
| `--ef-icon-stroke-base` | 1.6 | Default icon stroke |
| `--ef-icon-stroke-strong` | 1.8 | Primary actions or active states |
| `--ef-symbol-weight-quiet` | 500 | Secondary glyphs such as small arrows |
| `--ef-symbol-weight-base` | 600 | Default text glyph symbols |
| `--ef-symbol-weight-strong` | 700 | Active plus/minus/check states |

Rules:

- Default UI icons should be 14-16px with stroke 1.4-1.6.
- Use 20px+ icons only for empty states, rest screens, or companion moments.
- Plus, minus, chevron, check, close, and alert symbols should match nearby text weight.
- Avoid oversized `+`, `×`, `!`, and arrow glyphs in compact panels.
- Prefer line icons over filled icons for quiet controls.
- Active states may increase color contrast before increasing stroke weight.
- If an icon sits beside 12px text, use a 12-14px icon; if it sits beside 14px text, use a 14-16px icon.
- Symbol-only buttons still need a stable hit target, usually `--ef-hit-target`.

## Mira Avatar Standard

Mira is a product character, not decorative chrome. Use the shared 58-unit geometry tokens from `eyeflow-design-system.css` for the default face in the main window, Today stage, desktop companion, and calm onboarding states.

Canonical default avatar:

- Body: `--ef-mira-avatar-size`, `--ef-mira-avatar-radius`.
- Visor: `--ef-mira-visor-*`.
- Signal dot: `--ef-mira-signal-*`.
- Eyes: `--ef-mira-face-*` and `--ef-mira-eye-size`.
- Mouth: `--ef-mira-mouth-*`; default is a short soft smile, not a long horizontal line.
- Cheeks and antenna: `--ef-mira-cheek-*` and `--ef-mira-antenna-*`.

Rules:

- Do not create a separate visor, eye, mouth, or antenna coordinate set for a new Mira surface.
- Larger surfaces may scale the container or add a quiet orbit, but the face itself should stay on the canonical 58-unit proportions unless a state-specific expression requires a documented override.
- Calm/default/focus states use the short soft smile. Blink/rest states may override eye height or mouth color, but should keep the same width discipline.
- Stage or orbit decoration must be lower-emphasis than Mira's face. Avoid thick arcs, saturated halos, and large decorative rings that make Mira feel like a badge or game avatar.
- App icons and tiny brand marks may stay simplified; they are not the expressive Mira avatar.

## Motion

Use:

- `--ef-motion-fast`: hover, small state confirmations.
- `--ef-motion-base`: panel open, companion reaction.
- `--ef-motion-slow`: rest flow transitions.
- `--ef-ease-calm`: default easing.

Rules:

- Motion should reduce uncertainty, not entertain.
- Avoid looping UI motion outside Mira breathing/rest states.
- Prefer opacity and small transforms over large movement.

## Implementation Rules

- New CSS must use `--ef-*` tokens for text, spacing, radius, controls, and motion.
- Existing `--text-*` aliases are compatibility only. Do not add new ones.
- If a value is missing, extend `eyeflow-design-system.css` first, then use it.
- If a one-off value is necessary for an illustration or chart, keep it local to that component and explain the reason in the selector name or nearby comment.
