#!/usr/bin/env node
// Score the full auto-cut IN-points against the approved backbone (ground truth).
import { readFileSync } from "node:fs";
const auto = JSON.parse(readFileSync(process.argv[2] || "scratch/autocut/cut-full-raw.json","utf8")).segments.map(s=>s.start);
const gt = JSON.parse(readFileSync("briefs/cuts/bowmanchrome2025.json","utf8")).segments.map(s=>s.start);
function score(tol){
  const used = new Set(); let hit = 0; const missed=[];
  for (const g of gt){ let b=-1,bd=Infinity; for(let i=0;i<auto.length;i++){ if(used.has(i))continue; const d=Math.abs(auto[i]-g); if(d<bd){bd=d;b=i;} } if(b>=0&&bd<=tol){hit++;used.add(b);} else missed.push(g); }
  return { hit, recall: hit/gt.length, precision: used.size/auto.length, missed };
}
console.log(`auto IN-points: ${auto.length}   GT IN-points: ${gt.length}`);
for (const tol of [0.5,0.7,1.0,1.5]){
  const s = score(tol);
  console.log(`±${tol}s : recall ${s.hit}/${gt.length}=${(s.recall*100).toFixed(0)}%  precision ${(s.precision*100).toFixed(0)}%`);
}
const s = score(1.0);
const fmt=(t)=>`${Math.floor(t/60)}:${(t%60).toFixed(1).padStart(4,"0")}`;
console.log(`\nGT beats my cut MISSED (>1.0s from any auto beat), ${s.missed.length}:`);
console.log("  " + s.missed.map(fmt).join("  "));
