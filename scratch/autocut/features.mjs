#!/usr/bin/env node
// What motion FEATURE best predicts the human beats? Measures the achievable recall ceiling.
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
const FPS = 15, N = T.length;
const SM = 2;
const Ms = M.map((_, i) => { let s=0,n=0; for(let k=-SM;k<=SM;k++){const j=i+k; if(j>=0&&j<N){s+=M[j];n++;}} return s/n; });
const LOW = 5, MID = 10, HIGH = 18;

// RISES: foot of a rising edge that crosses MID going up and reaches HIGH soon after
const rises = [];
for (let i = 2; i < N - 2; i++) {
  if (Ms[i-1] < MID && Ms[i] >= MID) {
    // confirm it climbs to HIGH within 0.5s
    let peak = 0; for (let j=i;j<Math.min(N,i+8);j++) peak=Math.max(peak,Ms[j]);
    if (peak >= HIGH) {
      // foot = walk back to last sample <= LOW (cap 0.8s)
      let k=i; let back=0; while(k>0 && back<12 && Ms[k]>LOW){k--;back++;}
      rises.push(T[k]);
    }
  }
}
// PEAKS: local maxima above HIGH, separated by >=0.5s
const peaks = [];
for (let i = 3; i < N - 3; i++) {
  if (Ms[i] >= HIGH && Ms[i] >= Ms[i-1] && Ms[i] > Ms[i+1] && Ms[i] >= Ms[i-3] && Ms[i] >= Ms[i+3]) {
    if (!peaks.length || T[i]-peaks[peaks.length-1] > 0.5) peaks.push(T[i]);
  }
}
// DIPS: local minima below LOW (holds), separated by >=0.5s
const dips = [];
for (let i = 3; i < N - 3; i++) {
  if (Ms[i] <= LOW && Ms[i] <= Ms[i-1] && Ms[i] < Ms[i+1] && Ms[i] <= Ms[i-3] && Ms[i] <= Ms[i+3]) {
    if (!dips.length || T[i]-dips[dips.length-1] > 0.5) dips.push(T[i]);
  }
}
const ANY = [...rises, ...peaks, ...dips].sort((a,b)=>a-b);

const gt = JSON.parse(readFileSync("briefs/cuts/bowmanchrome2025.json","utf8")).segments.map(s=>s.start);
function nearest(arr, x){ let b=Infinity; for(const a of arr) b=Math.min(b,Math.abs(a-x)); return b; }
function recallAt(arr, tol){ return gt.filter(g=>nearest(arr,g)<=tol).length; }

for (const tol of [0.4, 0.7, 1.0]) {
  console.log(`\n--- tolerance ±${tol}s ---`);
  console.log(`  RISES (${rises.length} events): recall ${recallAt(rises,tol)}/${gt.length} = ${(recallAt(rises,tol)/gt.length*100).toFixed(0)}%`);
  console.log(`  PEAKS (${peaks.length} events): recall ${recallAt(peaks,tol)}/${gt.length} = ${(recallAt(peaks,tol)/gt.length*100).toFixed(0)}%`);
  console.log(`  DIPS  (${dips.length} events): recall ${recallAt(dips,tol)}/${gt.length} = ${(recallAt(dips,tol)/gt.length*100).toFixed(0)}%`);
  console.log(`  ANY   (${ANY.length} events): recall ${recallAt(ANY,tol)}/${gt.length} = ${(recallAt(ANY,tol)/gt.length*100).toFixed(0)}%`);
}
// distribution of GT distance-to-nearest-ANY
const dists = gt.map(g=>nearest(ANY,g)).sort((a,b)=>a-b);
console.log(`\nGT dist-to-nearest-ANY: p25=${dists[Math.floor(gt.length*.25)].toFixed(2)} p50=${dists[Math.floor(gt.length*.5)].toFixed(2)} p75=${dists[Math.floor(gt.length*.75)].toFixed(2)} p90=${dists[Math.floor(gt.length*.9)].toFixed(2)} max=${dists[gt.length-1].toFixed(2)}`);
