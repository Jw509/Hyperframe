#!/usr/bin/env node
// Map output(cut) timeline -> source timeline for the current full cut.
import { readFileSync } from "node:fs";
const cut = JSON.parse(readFileSync("scratch/autocut/cut-full-raw.json","utf8"));
const upto = parseFloat(process.argv[2] || "140");
const fmt=(t)=>`${Math.floor(t/60)}:${Math.floor(t%60).toString().padStart(2,"0")}.${Math.round((t%1)*10)}`;
let cum = 0;
console.log("out_start  out_end  | src_start  src_end  (dur)  note");
for (const s of cut.segments){
  const d = s.end - s.start;
  const o0 = cum, o1 = cum + d;
  if (o0 <= upto) {
    console.log(`${fmt(o0)}-${fmt(o1)}  | ${s.start.toFixed(2)}-${s.end.toFixed(2)} (${d.toFixed(1)}s)  ${(s.note||"").slice(0,70)}`);
  }
  cum = o1;
  if (o0 > upto) break;
}
console.log(`\n(output ${fmt(0)}-${fmt(upto)} shown)`);
