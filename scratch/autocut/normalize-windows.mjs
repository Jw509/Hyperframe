#!/usr/bin/env node
// Normalize pack windows: merge short ones into neighbors, split long ones. Target 25-85s.
import { readFileSync, writeFileSync } from "node:fs";
const packs = JSON.parse(readFileSync("scratch/autocut/packs.json","utf8"));
const MIN=22, MAX=85;
// 1. merge: walk and absorb a window <MIN into the previous (or next if first)
let w = packs.map(p=>({start:p.start,end:p.end}));
let changed=true;
while(changed){
  changed=false;
  for(let i=0;i<w.length;i++){
    if(w[i].end-w[i].start<MIN){
      if(i>0){ w[i-1].end=w[i].end; w.splice(i,1); changed=true; break; }
      else if(w.length>1){ w[1].start=w[0].start; w.splice(0,1); changed=true; break; }
    }
  }
}
// 2. split anything >MAX into equal parts <=MAX
const out=[];
for(const x of w){
  const len=x.end-x.start;
  if(len>MAX){ const parts=Math.ceil(len/MAX); for(let p=0;p<parts;p++) out.push({start:+(x.start+len*p/parts).toFixed(1),end:+(x.start+len*(p+1)/parts).toFixed(1)}); }
  else out.push({start:+x.start.toFixed(1),end:+x.end.toFixed(1)});
}
const windows=out.map((x,i)=>({id:i+1,start:x.start,end:x.end,dur:+(x.end-x.start).toFixed(1)}));
writeFileSync("scratch/autocut/windows2.json",JSON.stringify(windows,null,2));
const fmt=(x)=>`${Math.floor(x/60)}:${String(Math.floor(x%60)).padStart(2,"0")}`;
console.log(`${windows.length} normalized windows (target ${MIN}-${MAX}s):`);
for(const x of windows)console.log(`  #${String(x.id).padStart(2)} ${x.start}-${x.end} (${x.dur}s) [${fmt(x.start)}-${fmt(x.end)}]`);
