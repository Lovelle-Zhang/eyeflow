# EyeFlow · Mira 官宣视频 (announce film)

Deterministic, reproducible launch film for EyeFlow — bilingual (en/zh), 2880×1800, 61s.

## Output
`dist/EyeFlow-Mira-announce-{en,zh}.mp4` — 2880×1800 · 61s · 30fps CFR · H.264 + AAC, calm ambient score.
(These are gitignored to keep the repo lean; regenerate them with the steps below.)

## Structure (10 scenes)
welcome (相遇仪式) → principle (how she adapts) → short break (L1 · a little tired) →
strong "rest now" (加强档 L2 · more worn) → nap (小睡 · worn out, mist over the desktop → wake reveals it) →
panel (frosted glass over a real Mac desktop) → 20-20-20 → states (气色) → privacy → CTA.

The desk scenes render a real Mac desktop (wallpaper + a two-pane app window + a Dock with the Mira app + menubar).
Copy is the real in-app strings (`src/view/reminder/copy.js`, nap i18n, panel i18n). Faithful to the real
renderers (onboarding/capsule/nap/theme/app-mark/reminder-strong CSS).

## How it works
- `src/announce.html` — the whole film. `seek(t)` deterministically sets every animated property for time `t`
  (a `#freeze` stylesheet kills CSS motion so frames are exact). `?lang=zh|en` picks the copy dictionary;
  `?cut=30` renders the 30s social cut. Frosted glass is faked with a blurred wallpaper copy under `.pop`
  (offscreen can't composite `backdrop-filter`, but `filter: blur()` renders fine).
- `src/record.js` — Electron offscreen renders each frame via `seek(t)` at native 2880×1800 and pipes raw
  frames to ffmpeg (preset veryfast so the encoder keeps pace). `electron record.js <durMs> <fps> <en|zh>`.
- `src/gen-music.js` — pure-Node synthesized score (no deps, royalty-free) → `music.wav`.
- `src/stills.js` — grab a single frame at any timestamp for design review.

## Regenerate
Needs the repo's Electron (`node_modules/.bin/electron`) and `ffmpeg-static` (installed under the scratchpad
when this was built; `npm i ffmpeg-static` if absent). From this folder's `src/`:

```bash
node gen-music.js                                   # → music.wav
electron record.js 61000 30 en                      # → EyeFlow-Mira-announce-en.mp4 (silent)
electron record.js 61000 30 zh
# mux music:
ffmpeg -y -i EyeFlow-Mira-announce-en.mp4 -i music.wav -map 0:v:0 -map 1:a:0 \
  -c:v copy -c:a aac -b:a 192k -ar 48000 -af "loudnorm=I=-16:TP=-1.5:LRA=11" -shortest ../dist/EyeFlow-Mira-announce-en.mp4
```

Note: this Mac has no system ffmpeg — the build used `ffmpeg-static`.
