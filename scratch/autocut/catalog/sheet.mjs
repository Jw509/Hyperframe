// Build a nameplate contact-sheet for a window: find low-motion held plateaus,
// extract a nameplate crop at each, tile into ONE labeled image.
import { readFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
const txt=readFileSync("scratch/autocut/motion.txt","utf8");
const T=[],M=[];let c=null;
for(const l of txt.split("\n")){const f=l.match(/^frame:\d+\s+pts:\d+\s+pts_time:([\d.]+)/);if(f){c=parseFloat(f[1]);continue;}const y=l.match(/^lavfi\.signalstats\.YAVG=([\d.]+)/);if(y&&c!==null){T.push(c);M.push(parseFloat(y[1]));c=null;}}
const A=parseFloat(process.argv[2]),B=parseFloat(process.argv[3]),ID=process.argv[4];
const SRC="cards/sources/bowmanchrome2025/bowmanchrome2025-portrait.mp4";
const dir="scratch/autocut/catalog";
// find held plateaus: motion < 8 for >= 0.4s, take the midpoint; merge if within 1.5s
const FPS=15; const held=[];
let i=0;
const idx0=T.findIndex(t=>t>=A), idx1=T.findIndex(t=>t>B);
const lo=idx0<0?0:idx0, hi=idx1<0?T.length:idx1;
while(i<T.length){ if(T[i]<A||T[i]>B){i++;continue;}
  if(M[i]<8){ let j=i; while(j<T.length&&T[j]<=B&&M[j]<8)j++; const len=T[Math.min(j,T.length-1)]-T[i]; if(len>=0.3){ held.push((T[i]+T[Math.min(j-1,T.length-1)])/2);} i=j; } else i++; }
// merge close
const merged=[]; for(const h of held){ if(merged.length&&h-merged[merged.length-1]<1.8) continue; merged.push(h);}
// cap to ~10
const picks=merged.slice(0,12);
const fmt=x=>`${Math.floor(x/60)}m${String(Math.floor(x%60)).padStart(2,"0")}`;
const crops=[];
picks.forEach((t,k)=>{ const out=`${dir}/np_${ID}_${k}_${t.toFixed(1)}.png`;
  spawnSync("ffmpeg",["-y","-hide_banner","-loglevel","error","-ss",String(t),"-i",SRC,"-frames:v","1","-vf","crop=900:1150:90:470,scale=300:-1",out],{stdio:"ignore"});
  crops.push(out);
});
// tile into one sheet, 4 cols
const list=`${dir}/list_${ID}.txt`;
const sheet=`${dir}/sheet_w${ID}.png`;
spawnSync("ffmpeg",["-y","-hide_banner","-loglevel","error","-i",`${dir}/np_${ID}_%d_*.png`].concat([]),{stdio:"ignore"});
// can't glob; use concat filter via inputs
const inputs=[]; crops.forEach(c=>{inputs.push("-i",c);});
const n=crops.length; const cols=4, rows=Math.ceil(n/cols);
const fc=crops.map((_,k)=>`[${k}:v]`).join("")+`xstack=inputs=${n}:layout=`+crops.map((_,k)=>`${(k%cols)}_${Math.floor(k/cols)}`).map((p,k)=>{const x=(k%cols);const y=Math.floor(k/cols);return `${x===0?"0":"w0*"+x}_${y===0?"0":"h0*"+y}`;}).join("|");
// xstack layout is finicky; instead just tile via making same-size and tile filter
const r=spawnSync("ffmpeg",["-y","-hide_banner","-loglevel","error",...inputs,"-filter_complex",`${crops.map((_,k)=>`[${k}:v]scale=300:383[s${k}]`).join(";")};${crops.map((_,k)=>`[s${k}]`).join("")}xstack=inputs=${n}:layout=${crops.map((_,k)=>`${(k%cols)*300}_${Math.floor(k/cols)*383}`).join("|")}:fill=black[o]`,"-map","[o]",sheet],{stdio:["ignore","ignore","pipe"]});
console.log(JSON.stringify({window:ID,picks:picks.map((t,k)=>({k,t:+t.toFixed(1),clock:fmt(t)})), sheet, ok:r.status===0}));
if(r.status!==0) console.log("xstack failed:", (r.stderr||"").toString().slice(0,200));
