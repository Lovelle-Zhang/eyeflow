'use strict';
// Original calm ambient bed for the film — warm D-major pad + sparse bell
// motif + soft sub, Freeverb, gentle fades. Writes music.wav (44.1k stereo 16-bit).
// No deps. Royalty-free (fully synthesized here). [reverted: the calm version]
const fs = require('node:fs');
const path = require('node:path');

const SR = 44100, DUR = 61.0, N = Math.round(SR * DUR);
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const L = new Float32Array(N), R = new Float32Array(N);

// ---- pad chords (MIDI), one per segment ----
const SEG = DUR / 8;
const CHORDS = [
  [50,57,62,66], // D
  [47,54,59,62], // Bm
  [43,50,55,59], // G
  [45,52,57,61], // A
  [50,57,62,66], // D
  [47,54,59,62], // Bm
  [43,50,55,59], // G
  [50,57,62,69], // D (add high A)
];
function addPad(midi, t0, t1) {
  const f = mtof(midi), a0 = Math.floor((t0) * SR), a1 = Math.floor((t1) * SR);
  const ATT = 1.3 * SR, REL = 1.6 * SR, dur = a1 - a0;
  for (let i = 0; i < dur + REL; i++) {
    const n = a0 + i; if (n < 0 || n >= N) continue;
    let env;
    if (i < ATT) env = i / ATT; else if (i < dur) env = 1; else env = Math.max(0, 1 - (i - dur) / REL);
    env *= env;
    const tr = 1 + 0.08 * Math.sin(2 * Math.PI * 0.13 * n / SR);
    const ph = 2 * Math.PI * n / SR;
    const s = Math.sin(ph * f * 0.9997) + Math.sin(ph * f * 1.0003) + 0.35 * Math.sin(ph * f * 2);
    const v = s * 0.055 * env * tr;
    L[n] += v; R[n] += v;
  }
}
for (let c = 0; c < CHORDS.length; c++) {
  const t0 = c * SEG - 0.3, t1 = (c + 1) * SEG;
  for (const m of CHORDS[c]) addPad(m, t0, t1);
}
// soft sub drone on each chord root, one octave down
for (let c = 0; c < CHORDS.length; c++) addPad(CHORDS[c][0] - 12, c * SEG - 0.2, (c + 1) * SEG);

// sparse bell motif (D-major pentatonic), bell timbre = 3 partials, exp decay
function addBell(midi, t, amp) {
  const f = mtof(midi), a0 = Math.floor(t * SR), DEC = 1.7 * SR, ATT = 0.004 * SR;
  for (let i = 0; i < DEC * 2.4; i++) {
    const n = a0 + i; if (n < 0 || n >= N) continue;
    const env = (i < ATT ? i / ATT : Math.exp(-(i - ATT) / DEC));
    const ph = 2 * Math.PI * n / SR;
    const s = Math.sin(ph * f) + 0.4 * Math.sin(ph * f * 2.01) + 0.12 * Math.sin(ph * f * 3.0);
    const v = s * amp * env;
    L[n] += v; R[n] += v;
  }
}
const MEL = [
  [0,0.9,74],[0,3.7,69], [1,0.8,71],[1,3.6,66], [2,1.0,67],[2,3.8,71],
  [3,0.8,69],[3,3.6,73], [4,0.9,74],[4,3.4,78], [5,0.8,71],[5,3.6,69],
  [6,1.0,67],[6,3.8,66], [7,0.8,62],[7,3.2,74],
];
for (const [seg, off, midi] of MEL) addBell(midi, seg * SEG + off, 0.12);

// ---- Freeverb (stereo) ----
const COMB = [1116,1188,1277,1356,1422,1491,1557,1617], AP = [556,441,341,225];
const SPREAD = 23, FB = 0.86, DAMP = 0.22, APF = 0.5;
function reverbChan(dry, offset) {
  const out = new Float32Array(N);
  const combs = COMB.map(d => ({ buf: new Float32Array(d + offset), i: 0, lp: 0, size: d + offset }));
  const aps = AP.map(d => ({ buf: new Float32Array(d + offset), i: 0, size: d + offset }));
  for (let n = 0; n < N; n++) {
    const inp = dry[n] * 0.015; let acc = 0;
    for (const c of combs) { const y = c.buf[c.i]; c.lp = y * (1 - DAMP) + c.lp * DAMP; c.buf[c.i] = inp + c.lp * FB; if (++c.i >= c.size) c.i = 0; acc += y; }
    for (const a of aps) { const bufout = a.buf[a.i]; const y = -acc + bufout; a.buf[a.i] = acc + bufout * APF; if (++a.i >= a.size) a.i = 0; acc = y; }
    out[n] = acc;
  }
  return out;
}
const wetL = reverbChan(L, 0), wetR = reverbChan(R, SPREAD);

// ---- mix dry+wet, tremolo swell, master limit, fades ----
const WET = 3.2, DRY = 0.85, FIN = 1.2 * SR, FOUT = 3.6 * SR;
const outL = new Float32Array(N), outR = new Float32Array(N);
for (let n = 0; n < N; n++) {
  const swell = 0.9 + 0.1 * Math.sin(2 * Math.PI * 0.05 * n / SR - 1.4);
  let l = (L[n] * DRY + wetL[n] * WET) * swell;
  let r = (R[n] * DRY + wetR[n] * WET) * swell;
  let fade = 1;
  if (n < FIN) fade = n / FIN;
  if (n > N - FOUT) fade = Math.min(fade, (N - n) / FOUT);
  fade *= fade;
  l = Math.tanh(l * 0.9) * 0.82 * fade;
  r = Math.tanh(r * 0.9) * 0.82 * fade;
  outL[n] = l; outR[n] = r;
}
let peak = 0; for (let n = 0; n < N; n++) peak = Math.max(peak, Math.abs(outL[n]), Math.abs(outR[n]));

const bytes = N * 4, buf = Buffer.alloc(44 + bytes);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + bytes, 4); buf.write('WAVE', 8);
buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(bytes, 40);
let o = 44;
for (let n = 0; n < N; n++) {
  buf.writeInt16LE(Math.max(-32768, Math.min(32767, outL[n] * 32767)) | 0, o); o += 2;
  buf.writeInt16LE(Math.max(-32768, Math.min(32767, outR[n] * 32767)) | 0, o); o += 2;
}
fs.writeFileSync(path.join(__dirname, 'music.wav'), buf);
console.log('wrote music.wav (calm)', (bytes / 1e6).toFixed(1) + 'MB', 'peak', peak.toFixed(3));
