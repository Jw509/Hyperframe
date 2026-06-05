import { readFileSync } from "node:fs";
const txt = readFileSync("scratch/autocut/motion.txt","utf8");
const T=[],M=[]; let c=null;
for(const l of txt.split("\n")){const f=l.match(/^frame:\d+\s+pts:\d+\s+pts_time:([\d.]+)/);if(f){c=parseFloat(f[1]);continue;}const y=l.match(/^lavfi\.signalstats\.YAVG=([\d.]+)/);if(y&&c!==null){T.push(c);M.push(parseFloat(y[1]));c=null;}}
const A=parseFloat(process.argv[2]),B=parseFloat(process.argv[3]);
const fmt=(t)=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,"0")}.${String(Math.round((t%1)*100)).padStart(2,"0")}`;
for(let i=0;i<T.length;i++){if(T[i]>=A&&T[i]<=B){const bar="#".repeat(Math.round(M[i]/2));console.log(`${fmt(T[i])} ${T[i].toFixed(3)}  m=${M[i].toFixed(1).padStart(5)} ${bar}`);}}
