import { readFileSync, writeFileSync } from "node:fs";
const d = JSON.parse(readFileSync("scratch/min3to5-edit/cut-FULL-v1.json", "utf8"));
// Fans become STATIC center-left crops (no pan); hard-cut back to normal next shot.
const fan1 = { start: 653.0, end: 656.3, source: "landscape", cropX: "(iw-1080)/2-400", note: "fan1 static center-left" };
const fan2 = { start: 688.0, end: 689.8, source: "landscape", cropX: "(iw-1080)/2-400", note: "fan2 static center-left (the 3:46 camera-left moment)" };
const out = [];
let replaced = 0, removed = 0;
for (const s of d.segments) {
  if (Math.abs(s.start - 650.381) < 0.1) { out.push(fan1); replaced++; continue; }   // fan1
  if (Math.abs(s.start - 656.05) < 0.25) { removed++; continue; }                      // skip the "3:30" shot
  if (Math.abs(s.start - 686.047) < 0.1) { out.push(fan2); replaced++; continue; }     // fan2
  out.push(s);
}
d.segments = out;
d.comment = "FULL v3: fans = STATIC center-left crop (no pan), hard-cut to normal. fan1 (src 653-656.3) then skip the redundant next shot. fan2 retimed to the 3:46 camera-left moment (src 688-689.8, ~1.8s).";
writeFileSync("scratch/min3to5-edit/cut-FULL-v3.json", JSON.stringify(d, null, 2));
console.log(`v3: ${out.length} segments (replaced ${replaced} fans, removed ${removed} shot)`);
