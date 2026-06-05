import { readFileSync, writeFileSync } from "node:fs";
const j=JSON.parse(readFileSync("scratch/autocut/cut-full-v4.json","utf8"));
let s=j.segments.map(x=>({...x}));
// DO NOT sort — preserve authored order (user intentionally reorders some inserts).
// Only fix: drop non-positive/sub-0.5s, and clamp an overlap ONLY when consecutive beats
// come from the same forward region (start[i+1] between start[i] and end[i]).
let fixed=0, dropped=0;
for(let i=0;i<s.length-1;i++){
  if(s[i+1].start>=s[i].start && s[i+1].start<s[i].end){ s[i].end=s[i+1].start; fixed++; }
}
s=s.filter(x=>{ if(x.end-x.start<0.5){dropped++;return false;} return true; });
const total=s.reduce((a,x)=>a+(x.end-x.start),0);
writeFileSync("scratch/autocut/cut-full-v4-final.json",JSON.stringify({comment:j.comment,segments:s},null,2));
const land=s.filter(x=>x.source==="landscape");
console.log(`v4 final: ${s.length} beats, ${total.toFixed(1)}s (${(total/60).toFixed(2)} min); clamped ${fixed} same-region overlaps, dropped ${dropped} slivers`);
console.log(`landscape recrop: ${land.length}${land.length?" @ "+land.map(x=>x.start+" ("+x.cropX+")").join(", "):""}`);
