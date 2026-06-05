#!/usr/bin/env node
// Print the motion curve for a source range at a given step, to map activity vs dead time.
import { readFileSync } from "node:fs";
const txt = readFileSync("scratch/autocut/motion.txt","utf8");
const T=[],M=[]; let c=null;
for(const l of txt.split("\n")){const f=l.match(/^frame:\d+\s+pts:\d+\s+pts_time:([\d.]+)/);if(f){c=parseFloat(f[1]);continue;}const y=l.match(/^lavfi\.signalstats\.YAVG=([\d.]+)/);if(y&&c!==null){T.push(c);M.push(parseFloat(y[1]));c=null;}}
const A=parseFloat(process.argv[2]), B=parseFloat(process.argv[3]), step=parseFloat(process.argv[4]||"1");
const fmt=(t)=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,"0")}.${Math.round((t%1)*10)}`;
for(let t=A;t<B;t+=step){
  const lo=t,hi=t+step; let s=0,n=0,mx=0;
  for(let i=0;i<T.length;i++){if(T[i]>=lo&&T[i]<hi){s+=M[i];n++;mx=Math.max(mx,M[i]);}}
  const avg=n?s/n:0;
  const lvl = avg<4?"DEAD":avg<10?"low ":avg<18?"med ":"HIGH";
  console.log(`${fmt(t)} (${t.toFixed(0)}s) avg=${avg.toFixed(1).padStart(5)} max=${mx.toFixed(0).padStart(3)}  ${lvl}`);
}
