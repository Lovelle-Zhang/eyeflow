# EyeFlow Screenshot State QA - 2026-06-14

## Scope

P22 fixed the visual acceptance trust gap where DOM probes could pass while the final PNG capture showed a different page state.

## Commands

| Command | Result | Notes |
| --- | --- | --- |
| `npm run verify` | Passed | Source smoke checks and release wiring passed. |
| `npm run release:rc` | Passed | Rebuilt app bundle, installed `/Applications/EyeFlow.app`, and passed packaged UI smoke. |
| Screenshot state gate | Passed | Each required PNG has sidecar metadata and state/content assertions. |

## Screenshot State Gate

Capture directory:

```text
/var/folders/lw/tm59fff56j90sxpk932lp01c0000gp/T/eyeflow-smoke
```

The packaged smoke now requires every PNG to have a `.metadata.json` sidecar with:

- `filename`
- `requestedView`
- `visibleView`
- `pageTitle`
- `activeNav`
- `onboardingVisible`
- `timestamp`
- `captureReason`
- `mainTextSnapshot`
- `afterState`

Clean dashboard screenshots are verified against both state metadata and text snapshots:

| Capture | requestedView | visibleView | pageTitle | activeNav | onboardingVisible | captureReason |
| --- | --- | --- | --- | --- | --- | --- |
| `eyeflow-onboarding-active.png` | `todayView` | `todayView` | `今天` | `今天` | `true` | `onboarding active debug view` |
| `eyeflow-settings-clean.png` | `rhythmView` | `rhythmView` | `设置` | `设置` | `false` | `clean rhythmView debug view` |
| `eyeflow-profile-clean.png` | `profileView` | `profileView` | `复盘` | `复盘` | `false` | `clean profileView debug view` |
| `eyeflow-rest-guide.png` | `todayView` | `todayView` | `今天` | `今天` | `false` | `rest guide after Mira click` |
| `eyeflow-force-return.png` | `rhythmView` | `rhythmView` | `设置` | `设置` | `false` | `force preview return` |

Text snapshot checks passed:

- Settings clean capture contains `今天的恢复节奏` and `桌面就绪`.
- Profile clean capture contains `今天眼睛怎么样` and `下一步`.
- Onboarding capture contains `眼睛现在怎么样`, `Mira 已安排`, `安全边界`, and `开始第一轮`.
- Rest guide capture contains `点“休息”，Mira 带你。`.
- Force return capture contains `预览完成`.

## Implementation Notes

- Debug captures are serialized per window, so dashboard screenshots cannot prepare different views at the same time.
- Each dashboard capture re-prepares its requested view immediately before `capturePage()`.
- Onboarding, rest-guide, and force-return captures have explicit preparation for their special UI state.
- The packaged smoke fails if metadata is missing, if the final state does not match the filename, or if required text is absent.
