import fs from "fs";
const P = "cards/comps/25Signature2Mega2Blaster/comps.json";
const d = JSON.parse(fs.readFileSync(P, "utf8"));

// 1) box order from user: 0:12 blaster, 3:14 mega, 7:06 blaster, 9:40 mega
d.boxOpens = [
  { t: 12, type: "blaster", cost: 29.99, note: "user-confirmed: blaster" },
  { t: 194, type: "mega", cost: 65.99, note: "user-confirmed: mega" },
  { t: 426, type: "blaster", cost: 29.99, note: "user-confirmed: blaster" },
  { t: 580, type: "mega", cost: 65.99, note: "user-confirmed: mega" }
];

// 2) user-supplied times for the 8 previously-unplaced comps (mm:ss -> s)
const times = { "44": 32, "40": 53, "25": 469, "32": 543, "06": 642, "33": 739, "27": 785, "35": 807 };
let filled = 0;
for (const c of d.comps) {
  if (times[c.compId] != null) {
    const t = times[c.compId];
    c.tStart = t; c.tEnd = t + 2; c.tBest = t + 1;
    c.placed = true; c.conf = "user"; c.win = "user";
    filled++;
  }
}
fs.writeFileSync(P, JSON.stringify(d, null, 2));
const placed = d.comps.filter(c => c.placed);
console.log(`filled ${filled} user times; now ${placed.length}/${d.comps.length} placed`);
console.log("boxOpens:", d.boxOpens.map(b => `${b.type}@${b.t}`).join(" "));
// flag near-collisions (<3.5s apart)
const ps = placed.map(c => ({ id: c.compId, p: c.player, t: c.tStart })).sort((a, b) => a.t - b.t);
console.log("near-collisions (<3.5s):");
for (let i = 1; i < ps.length; i++) if (ps[i].t - ps[i - 1].t < 3.5) console.log(`  ${ps[i-1].id} ${ps[i-1].p}@${ps[i-1].t}  <->  ${ps[i].id} ${ps[i].p}@${ps[i].t}`);
