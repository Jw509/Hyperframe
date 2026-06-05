#!/usr/bin/env node
/**
 * Auto-cut detector for silent card-opening footage.
 *
 * Signal model (from PIPELINE.md "Cut style — LOCKED"):
 *   reveal = thumb slides card UP (motion burst) -> card held high (low-motion HOLD).
 *   The approved IN-point sits at the SLIDE-START (onset of the burst before a hold).
 *
 * Pipeline:
 *   1. parse the 15fps motion-energy curve (YAVG of inter-frame difference)
 *   2. find HOLDs   = low-motion plateaus >= MIN_HOLD long
 *   3. for each hold, walk back through the preceding burst to the SLIDE ONSET -> candidate IN
 *   4. score candidate INs against the approved backbone (ground truth)
 *
 * Usage: node detect.mjs [--report=N] [tunables as KEY=VAL]
 */
import { readFileSync } from "node:fs";

// ---- tunables (overridable on CLI as KEY=VAL) ----
const P = {
  FPS: 15,
  STILL: 4.0,        // motion <= STILL  => "still" (hold candidate)
  ACTIVE: 8.0,       // motion >= ACTIVE => "active" (slide / burst)
  MIN_HOLD: 0.33,    // a hold must stay still this long (s)
  MAX_HOLD: 6.0,     // stills longer than this are dead-time, not a card hold (s)
  BURST_MIN: 0.13,   // the slide burst before a hold must last at least this (s)
  BURST_MAX: 2.5,    // don't walk back further than this for the onset (s)
  MERGE: 1.2,        // candidate INs closer than this are merged (keep fans FLOWING) (s)
  TOL: 0.7,          // match tolerance vs ground truth (s)
  SMOOTH: 2,         // moving-average half-window in frames
};
for (const a of process.argv.slice(2)) {
  const m = a.match(/^--?([A-Za-z_]+)=(.+)$/);
  if (m && m[1].toUpperCase() in P) P[m[1].toUpperCase()] = parseFloat(m[2]);
  else if (m && m[1].toLowerCase() === "report") P.REPORT = parseInt(m[2]);
}

// ---- parse motion.txt ----
const txt = readFileSync("scratch/autocut/motion.txt", "utf8");
const T = [], M = [];
let curT = null;
for (const line of txt.split("\n")) {
  const ft = line.match(/^frame:\d+\s+pts:\d+\s+pts_time:([\d.]+)/);
  if (ft) { curT = parseFloat(ft[1]); continue; }
  const ya = line.match(/^lavfi\.signalstats\.YAVG=([\d.]+)/);
  if (ya && curT !== null) { T.push(curT); M.push(parseFloat(ya[1])); curT = null; }
}
// smooth
const Ms = M.map((_, i) => {
  let s = 0, n = 0;
  for (let k = -P.SMOOTH; k <= P.SMOOTH; k++) { const j = i + k; if (j >= 0 && j < M.length) { s += M[j]; n++; } }
  return s / n;
});
const N = T.length;
const tAt = (i) => T[Math.max(0, Math.min(N - 1, i))];

// motion stats
const sorted = [...Ms].sort((a, b) => a - b);
const pct = (p) => sorted[Math.floor(sorted.length * p)].toFixed(2);
console.error(`motion: N=${N}  p10=${pct(0.1)} p25=${pct(0.25)} p50=${pct(0.5)} p75=${pct(0.75)} p90=${pct(0.9)} p99=${pct(0.99)} max=${sorted[N-1].toFixed(1)}`);

// ---- detect holds + slide onsets ----
const minHoldF = Math.round(P.MIN_HOLD * P.FPS);
const maxHoldF = Math.round(P.MAX_HOLD * P.FPS);
const burstMaxF = Math.round(P.BURST_MAX * P.FPS);
const burstMinF = Math.round(P.BURST_MIN * P.FPS);

const cands = [];
let i = 0;
while (i < N) {
  if (Ms[i] <= P.STILL) {
    // extend the still run
    let j = i;
    while (j < N && Ms[j] <= P.STILL) j++;
    const holdLen = j - i;
    if (holdLen >= minHoldF && holdLen <= maxHoldF) {
      // walk back from i through the preceding burst to the slide onset
      let k = i;
      let sawActive = false;
      let back = 0;
      while (k > 0 && back < burstMaxF) {
        if (Ms[k] >= P.ACTIVE) sawActive = true;
        // onset = where motion drops back to "still" before the burst
        if (sawActive && Ms[k] <= P.STILL) break;
        k--; back++;
      }
      const burstLen = i - k;
      if (sawActive && burstLen >= burstMinF) {
        cands.push({ in: +tAt(k).toFixed(3), hold: +tAt(i).toFixed(3), holdLen: +(holdLen / P.FPS).toFixed(2), burst: +(burstLen / P.FPS).toFixed(2) });
      }
    }
    i = j;
  } else i++;
}

// merge candidates that are very close (keep fan windows flowing)
const merged = [];
for (const c of cands) {
  if (merged.length && c.in - merged[merged.length - 1].in < P.MERGE) continue;
  merged.push(c);
}

// ---- ground truth ----
const gt = JSON.parse(readFileSync("briefs/cuts/bowmanchrome2025.json", "utf8")).segments.map(s => s.start);

// score
const usedC = new Set();
let hit = 0;
const missed = [];
for (const g of gt) {
  let best = -1, bestD = Infinity;
  for (let c = 0; c < merged.length; c++) {
    if (usedC.has(c)) continue;
    const d = Math.abs(merged[c].in - g);
    if (d < bestD) { bestD = d; best = c; }
  }
  if (best >= 0 && bestD <= P.TOL) { hit++; usedC.add(best); }
  else missed.push(g);
}
const recall = hit / gt.length;
const precision = merged.length ? usedC.size / merged.length : 0;

console.error(`\nparams: STILL=${P.STILL} ACTIVE=${P.ACTIVE} MIN_HOLD=${P.MIN_HOLD} MAX_HOLD=${P.MAX_HOLD} MERGE=${P.MERGE} TOL=${P.TOL}`);
console.error(`candidates: ${cands.length} raw -> ${merged.length} merged`);
console.error(`GT in-points: ${gt.length}`);
console.error(`RECALL  (GT matched): ${hit}/${gt.length} = ${(recall*100).toFixed(1)}%`);
console.error(`PRECISION (cands matched): ${usedC.size}/${merged.length} = ${(precision*100).toFixed(1)}%`);
console.error(`F1: ${(2*recall*precision/(recall+precision||1)*100).toFixed(1)}%`);

if (P.REPORT) {
  const fmt = (t) => `${Math.floor(t/60)}:${(t%60).toFixed(1).padStart(4,"0")}`;
  console.error(`\nMISSED GT (${missed.length}):`);
  for (const g of missed.slice(0, P.REPORT)) console.error(`  ${fmt(g)}  (src ${g.toFixed(2)})`);
}

// emit merged candidates as JSON on stdout if requested
if (process.argv.includes("--json")) {
  process.stdout.write(JSON.stringify(merged, null, 2));
}
