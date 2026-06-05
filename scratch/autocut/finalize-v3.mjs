import { readFileSync, writeFileSync } from "node:fs";
const j = JSON.parse(readFileSync("scratch/autocut/cut-full-v3.json","utf8"));
let s = j.segments.map(x=>({...x}));
// the 2:13 fan landscape recrop: tag source if note has 'track-left' OR explicit cropX; here mark by note
s.forEach(x=>{ if(/out2:13|track-left/.test(x.note)){ x.source="landscape"; x.cropX="(iw-1080)/2-50"; } });
s.sort((a,b)=>a.start-b.start);
// resolve overlaps
let dropped=0;
for(let i=0;i<s.length-1;i++){ if(s[i].end>s[i+1].start){ s[i].end=s[i+1].start; } }
s = s.filter(x=>{ if(x.end-x.start<0.5){dropped++;return false;} return true; });
const total=s.reduce((a,x)=>a+(x.end-x.start),0);
writeFileSync("scratch/autocut/cut-full-v3-final.json", JSON.stringify({comment:j.comment, segments:s},null,2));
console.log(`v3 final: ${s.length} beats, ${total.toFixed(1)}s (${(total/60).toFixed(2)} min), dropped ${dropped} slivers`);
const land=s.filter(x=>x.source==="landscape"); console.log(`landscape recrop beats: ${land.length}${land.length?" @ "+land.map(x=>x.start).join(","):""}`);
// overlap check
let bad=0; for(let i=0;i<s.length-1;i++) if(s[i].end>s[i+1].start+0.001) bad++;
console.log(`overlaps remaining: ${bad}`);
