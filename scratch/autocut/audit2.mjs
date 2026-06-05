// v2 auditor: label-based fan check (robust to reordering) + onset check.
import { readFileSync } from "node:fs";
const txt=readFileSync("scratch/autocut/motion.txt","utf8");
const T=[],M=[];let c=null;
for(const l of txt.split("\n")){const f=l.match(/^frame:\d+\s+pts:\d+\s+pts_time:([\d.]+)/);if(f){c=parseFloat(f[1]);continue;}const y=l.match(/^lavfi\.signalstats\.YAVG=([\d.]+)/);if(y&&c!==null){T.push(c);M.push(parseFloat(y[1]));c=null;}}
const win=(a,b)=>{const o=[];for(let i=0;i<T.length;i++){if(T[i]>=a&&T[i]<=b)o.push(M[i]);}return o;};
const mAt=(t)=>{let lo=0,hi=T.length-1;while(lo<hi){const m=(lo+hi)>>1;if(T[m]<t)lo=m+1;else hi=m;}return M[lo]||0;};
const s=JSON.parse(readFileSync(process.argv[2],"utf8")).segments;
const fmtOut=(()=>{let cum=0;return s.map(x=>{const o=cum;cum+=x.end-x.start;return o;});})();
const out=(i)=>{const t=fmtOut[i];return `${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,"0")}`;};
const isOpen=(n)=>/\bopen\b/i.test(n), isFan=(n)=>/\bfan\b/i.test(n), isCard=(n)=>/card|hit|auto|refractor|reveal|\bc\d/i.test(n)&&!isOpen(n)&&!isFan(n);
// NOFAN: each open beat, is there a fan before the next card?
let nofan=[],noswipe=[];
s.forEach((x,i)=>{
  if(isOpen(x.note)){ let sawFan=false; for(let j=i+1;j<Math.min(s.length,i+5);j++){ if(isFan(s[j].note)){sawFan=true;break;} if(isCard(s[j].note))break; } if(!sawFan) nofan.push(`out${out(i)} src${x.start.toFixed(0)} (${x.note.slice(0,26)})`); }
  if(isCard(x.note)){ const pre=win(x.start-0.8,x.start), post=win(x.start,x.start+0.7); const preMax=Math.max(0,...pre), postMax=Math.max(0,...post), m0=mAt(x.start); if(preMax>16 && m0>13 && postMax<preMax-2) noswipe.push(`out${out(i)} src${x.start.toFixed(1)} pre=${preMax.toFixed(0)} m0=${m0.toFixed(0)} post=${postMax.toFixed(0)} (${x.note.slice(0,24)})`); }
});
console.log(`AUDIT2 ${process.argv[2].split("/").pop()}: ${s.length} beats`);
console.log(`  NO-FAN (open w/o following fan): ${nofan.length}`); nofan.forEach(p=>console.log("    "+p));
console.log(`  NO-SWIPE (cut clearly after slide peaked): ${noswipe.length}`); noswipe.forEach(p=>console.log("    "+p));
