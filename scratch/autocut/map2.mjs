import { readFileSync } from "node:fs";
const cut = JSON.parse(readFileSync(process.argv[2]||"scratch/autocut/cut-full-v2.json","utf8"));
const fmt=(t)=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,"0")}.${Math.round((t%1)*10)}`;
let cum=0;
cut.segments.forEach((s,i)=>{
  const d=s.end-s.start, o0=cum, o1=cum+d;
  console.log(`#${String(i).padStart(3)} out ${fmt(o0)}-${fmt(o1)} | src ${s.start.toFixed(1)}-${s.end.toFixed(1)} (${d.toFixed(1)}s) | ${(s.note||"").slice(0,46)}`);
  cum=o1;
});
console.log(`TOTAL ${fmt(cum)} (${cut.segments.length} beats)`);
