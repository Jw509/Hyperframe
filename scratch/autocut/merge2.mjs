#!/usr/bin/env node
// Merge beats2/win_*.json into one full cut. Clean per-pack beats — just sort,
// resolve any cross-seam overlaps, drop sub-0.6s fragments. No shift.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
const dir = "scratch/autocut/beats2";
const files = readdirSync(dir).filter(f=>/^win_\d+\.json$/.test(f)).sort((a,b)=>parseInt(a.match(/\d+/))-parseInt(b.match(/\d+/)));
let all=[];
for(const f of files){ const j=JSON.parse(readFileSync(`${dir}/${f}`,"utf8")); for(const s of j.segments) all.push({start:+s.start,end:+s.end,note:s.note||"",win:j.window}); }
all.sort((a,b)=>a.start-b.start);
// resolve overlaps (clip earlier end to next start)
for(let i=0;i<all.length-1;i++) if(all[i].end>all[i+1].start) all[i].end=all[i+1].start;
all=all.filter(s=>s.end-s.start>=0.6);
const total=all.reduce((a,s)=>a+(s.end-s.start),0);
writeFileSync(process.argv[2]||"scratch/autocut/cut-full-v2.json",JSON.stringify({
  comment:`Full cut v2 — APPROVED method (open/fan/card slide-onset+settle) across 20 pack windows. ${all.length} beats.`,
  segments:all.map(s=>({start:+s.start.toFixed(3),end:+s.end.toFixed(3),note:s.note}))
},null,2));
const byWin={}; for(const s of all) byWin[s.win]=(byWin[s.win]||0)+1;
const durs=all.map(s=>+(s.end-s.start).toFixed(2)).sort((a,b)=>a-b);
console.log(`beats: ${all.length}   total: ${total.toFixed(1)}s (${(total/60).toFixed(2)} min)`);
console.log(`per-window: ${Object.entries(byWin).map(([w,c])=>`w${w}:${c}`).join("  ")}`);
console.log(`beat dur: min=${durs[0]} p25=${durs[Math.floor(durs.length*.25)]} p50=${durs[Math.floor(durs.length*.5)]} p75=${durs[Math.floor(durs.length*.75)]} max=${durs[durs.length-1]}`);
