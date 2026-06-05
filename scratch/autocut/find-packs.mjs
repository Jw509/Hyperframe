#!/usr/bin/env node
/**
 * Find pack boundaries across the whole video from sustained QUIET gaps in the
 * motion curve. Between packs the host sets cards down / reaches for the next
 * pack / sorts -> a low-motion stretch. We seam there.
 *
 * Tune to land ~20 packs (box = 20 packs). Prints candidate pack windows.
 * Usage: node find-packs.mjs [QUIET=4.5] [MINGAP=2.2] [CARD_START=80] [CARD_END=1190]
 */
import { readFileSync, writeFileSync } from "node:fs";
const txt = readFileSync("scratch/autocut/motion.txt","utf8");
const T=[],M=[]; let c=null;
for(const l of txt.split("\n")){const f=l.match(/^frame:\d+\s+pts:\d+\s+pts_time:([\d.]+)/);if(f){c=parseFloat(f[1]);continue;}const y=l.match(/^lavfi\.signalstats\.YAVG=([\d.]+)/);if(y&&c!==null){T.push(c);M.push(parseFloat(y[1]));c=null;}}
const QUIET=parseFloat(process.argv[2]||"4.5");
const MINGAP=parseFloat(process.argv[3]||"2.2");
const CARD_START=parseFloat(process.argv[4]||"80");
const CARD_END=parseFloat(process.argv[5]||"1190");
const FPS=15, N=T.length;
const SM=4;
const Ms=M.map((_,i)=>{let s=0,n=0;for(let k=-SM;k<=SM;k++){const j=i+k;if(j>=0&&j<N){s+=M[j];n++;}}return s/n;});
const fmt=(x)=>`${Math.floor(x/60)}:${String(Math.floor(x%60)).padStart(2,"0")}`;

// find quiet runs >= MINGAP within card zone
const gaps=[];
let i=0;
while(i<N){
  if(T[i]>=CARD_START&&T[i]<=CARD_END&&Ms[i]<QUIET){
    let j=i;while(j<N&&Ms[j]<QUIET)j++;
    const len=(T[Math.min(j,N-1)]-T[i]);
    if(len>=MINGAP)gaps.push({start:+T[i].toFixed(1),end:+T[Math.min(j,N-1)].toFixed(1),mid:+((T[i]+T[Math.min(j,N-1)])/2).toFixed(1),len:+len.toFixed(1)});
    i=j;
  } else i++;
}
// pack windows = between consecutive gap midpoints
const seams=[CARD_START, ...gaps.map(g=>g.mid), CARD_END];
const packs=[];
for(let k=0;k<seams.length-1;k++){
  const a=seams[k],b=seams[k+1];
  if(b-a<3) continue; // skip slivers
  packs.push({id:packs.length+1,start:+a.toFixed(1),end:+b.toFixed(1),dur:+(b-a).toFixed(1)});
}
writeFileSync("scratch/autocut/packs.json",JSON.stringify(packs,null,2));
console.log(`QUIET=${QUIET} MINGAP=${MINGAP} -> ${gaps.length} gaps -> ${packs.length} pack windows`);
for(const p of packs)console.log(`  pack ${String(p.id).padStart(2)}: ${p.start}-${p.end}  (${p.dur}s)  [${fmt(p.start)}-${fmt(p.end)}]`);
