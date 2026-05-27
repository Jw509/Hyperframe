import { readFileSync, writeFileSync } from "node:fs";
const d = JSON.parse(readFileSync("scratch/min3to5-edit/cut-FULL-v1.json", "utf8"));
const fan1 = { start: 651.5, end: 656.5, source: "landscape",
  cropX: "(iw-1080)/2+if(lt(t,1.5),0,if(lt(t,2.5),-400*(t-1.5),-400))", note: "fan1 keyframed left" };
const fan2 = { start: 684.5, end: 689.0, source: "landscape",
  cropX: "(iw-1080)/2+if(lt(t,0.3),0,if(lt(t,1.3),-400*(t-0.3),-400))", note: "fan2 keyframed left" };
let n = 0;
d.segments = d.segments.map(s => {
  if (Math.abs(s.start - 650.38) < 0.1) { n++; return fan1; }
  if (Math.abs(s.start - 686.05) < 0.1) { n++; return fan2; }
  return s;
});
d.comment = "FULL v2: the two fans (src ~653, ~688) re-cropped from the landscape source with a keyframed left pan (X ramps to -400) so the spread is visible. All other 85 segments identical to v1.";
writeFileSync("scratch/min3to5-edit/cut-FULL-v2.json", JSON.stringify(d, null, 2));
console.log(`v2 written; ${d.segments.length} segments, ${n} fans replaced`);
