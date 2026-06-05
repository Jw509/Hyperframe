#!/usr/bin/env node
// Show current cut beats with cumulative OUTPUT time + SOURCE time, optionally for a source range.
import { readFileSync } from "node:fs";
const cut = JSON.parse(readFileSync(process.argv[2]||"scratch/autocut/cut-full-v2.json","utf8"));
const A = parseFloat(process.argv[3]||"0"), B = parseFloat(process.argv[4]||"99999");
const fo=(t)=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,"0")}.${Math.round((t%1)*10)}`;
let cum=0;
console.log("out_in   out_out | src_in   src_out  dur  note");
for(const s of cut.segments){
  const d=s.end-s.start, o0=cum, o1=cum+d;
  if(s.start>=A && s.start<=B)
    console.log(`${fo(o0)} ${fo(o1)} | ${s.start.toFixed(2)} ${s.end.toFixed(2)} ${d.toFixed(1)}  ${(s.note||"").slice(0,60)}`);
  cum=o1;
}
console.log(`total ${fo(cum)}`);
