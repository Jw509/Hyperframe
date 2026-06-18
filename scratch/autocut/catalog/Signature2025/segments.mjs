// Segment the riffle by motion PEAKS (card swaps); stillest frame between peaks = a card hold.
// Robust where a global low-threshold fails (constant hand drift keeps YAVG elevated).
import { readFileSync } from "node:fs";
const D = "scratch/autocut/catalog/Signature2025";
const txt = readFileSync(`${D}/motion.txt`, "utf8");
const T = [], M = [];
let c = null;
for (const l of txt.split("\n")) {
  const f = l.match(/pts_time:([\d.]+)/); if (f) { c = parseFloat(f[1]); continue; }
  const y = l.match(/YAVG=([\d.]+)/); if (y && c !== null) { T.push(c); M.push(parseFloat(y[1])); c = null; }
}
const sorted = [...M].sort((a, b) => a - b);
const q = p => sorted[Math.floor(p * (sorted.length - 1))];
const PEAK = parseFloat(process.argv[2] || q(0.6).toFixed(2));  // motion above this = a swap/transition
const MINSEG = parseFloat(process.argv[3] || "0.45");           // ignore segments shorter than this (s)
console.error(`frames=${M.length} med=${q(.5).toFixed(2)} p60=${q(.6).toFixed(2)} p75=${q(.75).toFixed(2)} PEAK=${PEAK} MINSEG=${MINSEG}`);
// Build "quiet" runs = stretches where M < PEAK. Each is a candidate card-hold.
const holds = [];
let i = 0;
while (i < M.length) {
  if (M[i] < PEAK) {
    let j = i; while (j < M.length && M[j] < PEAK) j++;
    const len = T[j - 1] - T[i];
    if (len >= MINSEG) {
      let lo = i, best = M[i]; for (let k = i; k < j; k++) if (M[k] < best) { best = M[k]; lo = k; }
      holds.push({ a: +T[i].toFixed(2), b: +T[j - 1].toFixed(2), still: +T[lo].toFixed(2), min: +best.toFixed(1), len: +len.toFixed(2) });
    }
    i = j;
  } else i++;
}
console.error(`-> ${holds.length} card-hold segments`);
console.error(holds.map(h => `${h.still}s [${h.a}-${h.b}] min=${h.min} len=${h.len}`).join("\n"));
console.log(JSON.stringify(holds.map(h => h.still)));
