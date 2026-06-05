#!/usr/bin/env node
// Dump the motion curve around the first K ground-truth IN-points to SEE the reveal signature.
import { readFileSync } from "node:fs";
const txt = readFileSync("scratch/autocut/motion.txt", "utf8");
const T = [], M = [];
let curT = null;
for (const line of txt.split("\n")) {
  const ft = line.match(/^frame:\d+\s+pts:\d+\s+pts_time:([\d.]+)/);
  if (ft) { curT = parseFloat(ft[1]); continue; }
  const ya = line.match(/^lavfi\.signalstats\.YAVG=([\d.]+)/);
  if (ya && curT !== null) { T.push(curT); M.push(parseFloat(ya[1])); curT = null; }
}
const FPS = 15;
const idxAt = (t) => Math.round(t * FPS) - 1;
const gt = JSON.parse(readFileSync("briefs/cuts/bowmanchrome2025.json", "utf8")).segments;
const K = parseInt(process.argv[2] || "10");
const before = 1.5, after = 2.2;
function bar(v){ const n = Math.round(v/2); return "#".repeat(Math.min(n,30)); }
for (const seg of gt.slice(0, K)) {
  const g = seg.start;
  console.log(`\n=== GT IN ${Math.floor(g/60)}:${(g%60).toFixed(2)}  (src ${g.toFixed(2)}, end ${seg.end.toFixed(2)}, dur ${(seg.end-g).toFixed(1)}s) ===`);
  const i0 = idxAt(g - before), i1 = idxAt(g + after);
  for (let i = i0; i <= i1; i++) {
    if (i < 0 || i >= T.length) continue;
    const rel = (T[i] - g);
    const mark = Math.abs(rel) < 0.034 ? " <== IN" : "";
    console.log(`  ${rel>=0?"+":""}${rel.toFixed(2)}s  m=${M[i].toFixed(1).padStart(5)} ${bar(M[i])}${mark}`);
  }
}
