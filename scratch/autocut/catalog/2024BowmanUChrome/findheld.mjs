// Find low-motion held plateaus in the blaster video and report them.
// motion.txt = per-frame YAVG of a tblend-difference stream (low = still/held).
import { readFileSync } from "node:fs";
const D = "scratch/autocut/catalog/2024BowmanUChrome";
const txt = readFileSync(`${D}/motion.txt`, "utf8");
const T = [], M = [];
let c = null;
for (const l of txt.split("\n")) {
  const f = l.match(/pts_time:([\d.]+)/); if (f) { c = parseFloat(f[1]); continue; }
  const y = l.match(/YAVG=([\d.]+)/); if (y && c !== null) { T.push(c); M.push(parseFloat(y[1])); c = null; }
}
const sorted = [...M].sort((a, b) => a - b);
const q = p => sorted[Math.floor(p * (sorted.length - 1))];
console.error(`frames=${M.length} min=${sorted[0].toFixed(2)} p10=${q(.1).toFixed(2)} med=${q(.5).toFixed(2)} p90=${q(.9).toFixed(2)} max=${sorted[sorted.length-1].toFixed(2)}`);
const TH = parseFloat(process.argv[2] || "3");
const MINLEN = parseFloat(process.argv[3] || "0.25");
const held = [];
let i = 0;
while (i < M.length) {
  if (M[i] < TH) {
    let j = i; while (j < M.length && M[j] < TH) j++;
    const len = T[j - 1] - T[i];
    if (len >= MINLEN) {
      // motion-weighted center (stillest point) within the plateau
      let lo = i, best = M[i]; for (let k = i; k < j; k++) if (M[k] < best) { best = M[k]; lo = k; }
      held.push({ a: +T[i].toFixed(2), b: +T[j - 1].toFixed(2), still: +T[lo].toFixed(2), len: +len.toFixed(2) });
    }
    i = j;
  } else i++;
}
console.error(`TH=${TH} MINLEN=${MINLEN} -> ${held.length} plateaus`);
console.log(JSON.stringify(held));
