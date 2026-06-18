// Find low-motion held plateaus in the ShatteredJTaylor riffle and report still-points.
// motion.txt = per-frame YAVG of a tblend-difference stream (low = still/held).
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
console.error(`frames=${M.length} min=${sorted[0].toFixed(2)} p10=${q(.1).toFixed(2)} p25=${q(.25).toFixed(2)} med=${q(.5).toFixed(2)} p75=${q(.75).toFixed(2)} p90=${q(.9).toFixed(2)} max=${sorted[sorted.length-1].toFixed(2)}`);
const TH = parseFloat(process.argv[2] || "3");
const MINLEN = parseFloat(process.argv[3] || "0.20");
const MERGE = parseFloat(process.argv[4] || "0.6");
const plats = [];
let i = 0;
while (i < M.length) {
  if (M[i] < TH) {
    let j = i; while (j < M.length && M[j] < TH) j++;
    const len = T[j - 1] - T[i];
    if (len >= MINLEN) {
      let lo = i, best = M[i]; for (let k = i; k < j; k++) if (M[k] < best) { best = M[k]; lo = k; }
      plats.push({ a: +T[i].toFixed(2), b: +T[j - 1].toFixed(2), still: +T[lo].toFixed(2), len: +len.toFixed(2) });
    }
    i = j;
  } else i++;
}
plats.sort((a, b) => a.still - b.still);
const merged = [];
for (const p of plats) { const last = merged[merged.length - 1]; if (last && p.still - last.still < MERGE) { if (p.len > last.len) Object.assign(last, p); continue; } merged.push({ ...p }); }
console.error(`TH=${TH} MINLEN=${MINLEN} MERGE=${MERGE} -> ${plats.length} plateaus -> ${merged.length} merged holds`);
console.log(JSON.stringify(merged.map(m => m.still)));
