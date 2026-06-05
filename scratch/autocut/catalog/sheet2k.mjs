import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const txt=readFileSync("scratch/autocut/motion.txt","utf8");
const T=[],M=[];let c=null;
for(const l of txt.split("\n")){const f=l.match(/^frame:\d+\s+pts:\d+\s+pts_time:([\d.]+)/);if(f){c=parseFloat(f[1]);continue;}const y=l.match(/^lavfi\.signalstats\.YAVG=([\d.]+)/);if(y&&c!==null){T.push(c);M.push(parseFloat(y[1]));c=null;}}
const A=parseFloat(process.argv[2]),B=parseFloat(process.argv[3]),ID=process.argv[4];
const SRC="cards/sources/bowmanchrome2025/bowmanchrome2025-portrait.mp4";
const dir="scratch/autocut/catalog";
const held=[];let i=0;
while(i<T.length){ if(T[i]<A||T[i]>B){i++;continue;}
  if(M[i]<9){ let j=i; while(j<T.length&&T[j]<=B&&M[j]<9)j++; const len=T[Math.min(j,T.length-1)]-T[i]; if(len>=0.25){ held.push((T[i]+T[Math.min(j-1,T.length-1)])/2);} i=j; } else i++; }
const merged=[];for(const h of held){if(merged.length&&h-merged[merged.length-1]<1.2)continue;merged.push(h);}
const picks=merged.slice(0,12);
// FULL-RES crop (no downscale) - native nameplate detail; tile at native then scale sheet
const crops=[];
picks.forEach((t,k)=>{const out=`${dir}/hi_${ID}_${k}.png`;
 spawnSync("ffmpeg",["-y","-hide_banner","-loglevel","error","-ss",String(t),"-i",SRC,"-frames:v","1","-vf","crop=1000:1200:40:460",out],{stdio:"ignore"});
 crops.push(out);});
const cols=4,n=crops.length;
const inputs=[];crops.forEach(c=>inputs.push("-i",c));
const r=spawnSync("ffmpeg",["-y","-hide_banner","-loglevel","error",...inputs,"-filter_complex",`${crops.map((_,k)=>`[${k}:v]scale=480:576[s${k}]`).join(";")};${crops.map((_,k)=>`[s${k}]`).join("")}xstack=inputs=${n}:layout=${crops.map((_,k)=>`${(k%cols)*480}_${Math.floor(k/cols)*576}`).join("|")}:fill=black[o]`,"-map","[o]",`${dir}/sheet2k_w${ID}.png`],{stdio:["ignore","ignore","pipe"]});
const fmt=x=>`${Math.floor(x/60)}:${String(Math.floor(x%60)).padStart(2,"0")}`;
console.log(JSON.stringify({window:ID,picks:picks.map((t,k)=>({k,t:+t.toFixed(1),clock:fmt(t)})),ok:r.status===0}));
