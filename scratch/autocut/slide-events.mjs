#!/usr/bin/env node
/**
 * Detect SLIDE EVENTS in a source range from the full-res (60fps) motion curve.
 * A card reveal = motion rises from baseline into a burst (the thumb-slide), then
 * drops back down (the card settles). We emit, per burst:
 *   onset  = frame motion crosses up through RISE (start of the slide) -> the cut IN
 *   peak   = max motion in the burst
 *   settle = frame motion drops back below FALL after the peak (card at rest)
 *   holdEnd= settle + HOLD (default hold), capped at the next onset
 *
 * This pins the "cut on slide onset, hold through settle" method to the frame.
 * Vision still classifies open/fan/card and catches misses — this just gives
 * frame-accurate candidates so agents don't cut mid-slide or too fast.
 *
 * Usage: node slide-events.mjs <A> <B> [RISE=8] [FALL=6] [HOLD=1.6] [MINGAP=0.8] [json]
 */
import { readFileSync } from "node:fs";
const txt = readFileSync("scratch/autocut/motion.txt", "utf8");
const T = [], M = [];
let c = null;
for (const l of txt.split("\n")) {
  const f = l.match(/^frame:\d+\s+pts:\d+\s+pts_time:([\d.]+)/);
  if (f) { c = parseFloat(f[1]); continue; }
  const y = l.match(/^lavfi\.signalstats\.YAVG=([\d.]+)/);
  if (y && c !== null) { T.push(c); M.push(parseFloat(y[1])); c = null; }
}
const A = parseFloat(process.argv[2]), B = parseFloat(process.argv[3]);
const RISE = parseFloat(process.argv[4] || "8");
const FALL = parseFloat(process.argv[5] || "6");
const HOLD = parseFloat(process.argv[6] || "1.6");
const MINGAP = parseFloat(process.argv[7] || "0.8");   // min spacing between onsets
const PEAKMIN = 14;   // a burst must peak at least this to be a real slide (not a wobble)
const BASE = 5;       // motion considered "at baseline/settled" below this

// light smooth
const N = T.length;
const idx0 = T.findIndex(t => t >= A);
const idx1 = T.findIndex(t => t > B);
const lo = idx0 < 0 ? 0 : idx0, hi = idx1 < 0 ? N : idx1;
const Ms = [];
for (let i = lo; i < hi; i++) { let s=0,n=0; for(let k=-2;k<=2;k++){const j=i+k; if(j>=lo&&j<hi){s+=M[j];n++;}} Ms.push(s/n); }
const t = (i) => T[lo + i];

const events = [];
let i = 1;
const L = Ms.length;
while (i < L) {
  if (Ms[i-1] < RISE && Ms[i] >= RISE) {
    // onset: walk back to the foot (last sample <= BASE within 0.6s)
    let k = i, back = 0;
    while (k > 0 && back < 36 && Ms[k] > BASE) { k--; back++; }
    const onset = t(k);
    // find peak then settle
    let j = i, peak = Ms[i], peakI = i;
    while (j < L && (Ms[j] >= FALL || j - i < 6)) { if (Ms[j] > peak) { peak = Ms[j]; peakI = j; } j++; }
    // settle = first frame after peak that drops below FALL and stays for ~0.15s
    let s = peakI;
    while (s < L - 2 && !(Ms[s] < FALL && Ms[s+1] < FALL)) s++;
    const settle = t(Math.min(s, L-1));
    if (peak >= PEAKMIN) {
      events.push({ onset: +onset.toFixed(2), peak: +peak.toFixed(0), peakAt: +t(peakI).toFixed(2), settle: +settle.toFixed(2) });
    }
    i = Math.max(j, i + 1);
  } else i++;
}

// enforce min gap between onsets (merge bursts that belong to one slide)
const merged = [];
for (const e of events) {
  const p = merged[merged.length - 1];
  if (p && e.onset - p.onset < MINGAP) { p.settle = Math.max(p.settle, e.settle); p.peak = Math.max(p.peak, e.peak); }
  else merged.push({ ...e });
}

// build candidate beats: in = onset, end = max(settle+HOLD-ish, capped at next onset - 0.05)
const beats = merged.map((e, idx) => {
  const next = merged[idx+1];
  let end = e.settle + 0.4;                 // small tail past settle so the rest reads
  const holdTarget = e.settle + 0.2;        // ensure we at least reach settle
  end = Math.max(end, holdTarget);
  const cap = next ? next.onset - 0.05 : B;
  if (end > cap) end = cap;
  // guarantee a minimum on-screen hold if room allows
  if (end - e.onset < 1.1 && cap - e.onset >= 1.1) end = e.onset + 1.1;
  return { start: +e.onset.toFixed(2), end: +end.toFixed(2), peak: e.peak, settle: e.settle };
}).filter(b => b.end - b.start >= 0.6);

const fmt=(x)=>`${Math.floor(x/60)}:${String(Math.floor(x%60)).padStart(2,"0")}.${String(Math.round((x%1)*100)).padStart(2,"0")}`;
console.log(`range ${fmt(A)}-${fmt(B)}  RISE=${RISE} FALL=${FALL} PEAKMIN=${PEAKMIN}  -> ${beats.length} slide events`);
for (const b of beats) console.log(`  in=${b.start.toFixed(2)} (${fmt(b.start)})  end=${b.end.toFixed(2)}  dur=${(b.end-b.start).toFixed(2)}s  peak=${b.peak} settle=${b.settle.toFixed(2)}`);
if (process.argv.includes("json")) {
  process.stdout.write("\n" + JSON.stringify(beats.map(b=>({start:b.start,end:b.end})), null, 2));
}
