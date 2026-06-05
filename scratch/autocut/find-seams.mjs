#!/usr/bin/env node
// Derive processing-window seams from QUIET gaps in the motion curve (content-derived,
// NOT the human backbone) so no card-reveal is split across a window boundary.
import { readFileSync, writeFileSync } from "node:fs";
const txt = readFileSync("scratch/autocut/motion.txt", "utf8");
const T = [], M = [];
let curT = null;
for (const line of txt.split("\n")) {
  const ft = line.match(/^frame:\d+\s+pts:\d+\s+pts_time:([\d.]+)/);
  if (ft) { curT = parseFloat(ft[1]); continue; }
  const ya = line.match(/^lavfi\.signalstats\.YAVG=([\d.]+)/);
  if (ya && curT !== null) { T.push(curT); M.push(parseFloat(ya[1])); curT = null; }
}
const FPS = 15, N = T.length;
const SM = 3;
const Ms = M.map((_, i) => { let s=0,n=0; for(let k=-SM;k<=SM;k++){const j=i+k; if(j>=0&&j<N){s+=M[j];n++;}} return s/n; });

const QT = 3.0;      // quiet threshold
const MINQ = 1.0;    // min quiet-run length (s) to qualify as a gap
const TARGET = 75;   // target chunk length (s)
const MINCHUNK = 50; // don't seam if chunk would be shorter than this

// find quiet runs -> their midpoints
const gaps = [];
let i = 0;
while (i < N) {
  if (Ms[i] < QT) {
    let j = i; while (j < N && Ms[j] < QT) j++;
    const len = (j - i) / FPS;
    if (len >= MINQ) gaps.push({ start: T[i], end: T[j-1], mid: (T[i]+T[j-1])/2, len });
    i = j;
  } else i++;
}

const VID_END = 1205.58;
const CARD_START = 18;   // intro/setup before this
const CARD_END = 1190;

// greedily place seams near TARGET spacing, snapping to the nearest quiet-gap midpoint
const seams = [CARD_START];
let last = CARD_START;
while (last < CARD_END - MINCHUNK) {
  const ideal = last + TARGET;
  // candidate gaps in [last+MINCHUNK, last+TARGET+35]
  const cand = gaps.filter(g => g.mid > last + MINCHUNK && g.mid < ideal + 35 && g.mid < CARD_END - 5);
  if (!cand.length) {
    // no quiet gap; hard seam at ideal if room remains
    if (ideal < CARD_END - MINCHUNK) { seams.push(+ideal.toFixed(2)); last = ideal; }
    else break;
  } else {
    // prefer the LONGEST quiet gap nearest to ideal
    cand.sort((a,b) => (b.len - a.len) || (Math.abs(a.mid-ideal)-Math.abs(b.mid-ideal)));
    const pick = cand[0];
    seams.push(+pick.mid.toFixed(2));
    last = pick.mid;
  }
}
seams.push(CARD_END);

// split any over-long window (no quiet gap available) into equal sub-windows <= 85s
const MAXLEN = 90;
const bounds = [];
for (let k = 0; k < seams.length - 1; k++) {
  const a = seams[k], b = seams[k+1], len = b - a;
  if (len > MAXLEN) {
    const parts = Math.ceil(len / 85);
    for (let p = 0; p < parts; p++) bounds.push(+(a + (len*p)/parts).toFixed(2));
  } else bounds.push(+a.toFixed(2));
}
bounds.push(+seams[seams.length-1].toFixed(2));
const windows = [];
for (let k = 0; k < bounds.length - 1; k++) {
  windows.push({ id: k+1, start: bounds[k], end: bounds[k+1], dur: +(bounds[k+1]-bounds[k]).toFixed(1) });
}
writeFileSync("scratch/autocut/windows.json", JSON.stringify(windows, null, 2));
console.log(`quiet gaps found: ${gaps.length}`);
console.log(`windows: ${windows.length}`);
for (const w of windows) console.log(`  #${String(w.id).padStart(2)}  ${w.start}s -> ${w.end}s  (${w.dur}s)  [${Math.floor(w.start/60)}:${String(Math.floor(w.start%60)).padStart(2,"0")}-${Math.floor(w.end/60)}:${String(Math.floor(w.end%60)).padStart(2,"0")}]`);
