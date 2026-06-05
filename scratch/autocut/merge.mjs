#!/usr/bin/env node
/**
 * Merge per-window beat files into one full cut.
 *   - sort by start, resolve overlaps (clip earlier end to later start)
 *   - merge consecutive segments that nearly touch (<MERGE gap) -> smooths seams & flowing runs
 *   - optional +SHIFT on starts except first-of-pack (gap-before > GAP)  [locked style rule]
 *
 * Usage: node merge.mjs <out.json> [SHIFT=0] [GAP=10]
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";

const [outPath, shiftArg, gapArg] = process.argv.slice(2);
const SHIFT = shiftArg ? parseFloat(shiftArg) : 0;
const GAP = gapArg ? parseFloat(gapArg) : 10;
const MERGE = 0.3;       // merge consecutive segs with gap < this
const MINDUR = 0.7;      // drop sub-this fragments after clipping

const dir = "scratch/autocut/beats";
const files = readdirSync(dir).filter(f => /^win_\d+\.json$/.test(f))
  .sort((a,b)=>parseInt(a.match(/\d+/))-parseInt(b.match(/\d+/)));

let all = [];
for (const f of files) {
  const j = JSON.parse(readFileSync(`${dir}/${f}`, "utf8"));
  for (const s of j.segments) all.push({ start: +s.start, end: +s.end, note: s.note || "", win: j.window });
}
all.sort((a,b)=>a.start-b.start);

// resolve overlaps: clip earlier end to next start
for (let i = 0; i < all.length-1; i++) {
  if (all[i].end > all[i+1].start) all[i].end = all[i+1].start;
}
all = all.filter(s => s.end - s.start >= 0.2);

// merge near-touching consecutive segments
const merged = [];
for (const s of all) {
  const p = merged[merged.length-1];
  if (p && s.start - p.end < MERGE) { p.end = Math.max(p.end, s.end); p.note += " | " + s.note; }
  else merged.push({ ...s });
}

// optional slide-shift (locked rule): +SHIFT except first-of-pack
let prevEnd = -Infinity, packs = 0;
const out = merged.map((s) => {
  const gapBefore = s.start - prevEnd;
  const firstOfPack = gapBefore > GAP;
  if (firstOfPack) packs++;
  const start = firstOfPack ? s.start : s.start + SHIFT;
  prevEnd = s.end;
  return { start: +start.toFixed(3), end: +s.end.toFixed(3), note: s.note, win: s.win, firstOfPack };
}).filter(s => s.end - s.start >= MINDUR);

const total = out.reduce((a,s)=>a+(s.end-s.start),0);
writeFileSync(outPath, JSON.stringify({
  comment: `Full auto-cut from 19 vision windows. SHIFT=${SHIFT}s (except first-of-pack gap>${GAP}s). ${out.length} segments.`,
  segments: out,
}, null, 2));

// per-window counts
const byWin = {};
for (const s of out) byWin[s.win] = (byWin[s.win]||0)+1;
console.log(`segments: ${out.length}  (raw ${all.length} -> merged ${merged.length} -> final ${out.length})`);
console.log(`first-of-pack count: ${packs}`);
console.log(`total duration: ${total.toFixed(1)}s (${(total/60).toFixed(2)} min)`);
console.log(`per-window: ${Object.entries(byWin).map(([w,c])=>`w${w}:${c}`).join("  ")}`);
const durs = out.map(s=>+(s.end-s.start).toFixed(2)).sort((a,b)=>a-b);
console.log(`seg dur: min=${durs[0]} p25=${durs[Math.floor(durs.length*.25)]} p50=${durs[Math.floor(durs.length*.5)]} p75=${durs[Math.floor(durs.length*.75)]} max=${durs[durs.length-1]}`);
console.log(`longest segs: ${out.map(s=>({d:+(s.end-s.start).toFixed(1),t:s.start})).sort((a,b)=>b.d-a.d).slice(0,6).map(x=>`${x.d}s@${x.t}`).join(", ")}`);
