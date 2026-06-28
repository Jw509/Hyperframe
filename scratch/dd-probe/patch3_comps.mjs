import fs from "fs";
const P = "cards/comps/25Signature2Mega2Blaster/comps.json";
const d = JSON.parse(fs.readFileSync(P, "utf8"));
const byId = Object.fromEntries(d.comps.map(c => [c.compId, c]));
const setT = (id, t) => { const c = byId[id]; c.tStart = t; c.tEnd = +(t + 2).toFixed(2); c.tBest = +(t + 1).toFixed(2); c.placed = true; if (!c.conf || c.conf !== "user") c.conf = "user"; };

// moves
setT("08", 482);     // Alfred Collins: 0:35 wrong -> 8:02
setT("24", 220);     // Amon-Ra St. Brown (135120): -> 3:40 (was mis-IDed at 11:56)
setT("19", 401);     // Jordan Love (140248): -> 6:41 (was the 13:49 closer; that show removed)
setT("07", 103);     // Cooper Kupp: 13:16 -> 1:43
// re-place the red Kyle Williams (141745)
setT("48", 727);     // Kyle Williams Red&Black -> 12:07
// +1s nudges
setT("45", 77);      // Andrew Mukuba base 1:15 +1
setT("41", 177);     // Herbert/McConkey 2:56 +1
setT("15", 303);     // Cam Ward 5:02 +1
setT("13", 321);     // Brian Burns 5:20 +1
setT("11", 379);     // Chris Olave 6:17 +1
setT("42", 467.5);   // J.J. McCarthy 7:45 +1.5
setT("05", 509);     // Josh Allen 8:28 +1
setT("32", 544);     // Kyle Williams Teal 9:03 +1
setT("47", 699);     // Jalen Milroe 11:38 +1
setT("28", 725);     // Derrick Harmon 12:04 +1
setT("49", 749);     // Walter Nolen 12:28 +1
setT("21", 769);     // Mahomes Class Action 12:48 +1
setT("37", 805);     // Jalon Walker 13:24 +1
setT("35", 807.5);   // Jaydon Blue 13:27 +0.5
// duplicate appearance: Jordan Addison (134223) pulled again from a new pack at 6:59
byId["14"].extraShows = [419];

fs.writeFileSync(P, JSON.stringify(d, null, 2));
const placed = d.comps.filter(c => c.placed !== false);
const instances = placed.reduce((n, c) => n + 1 + ((c.extraShows || []).length), 0);
const pulled = placed.reduce((s, c) => s + (+c.value) * (1 + (c.extraShows || []).length), 0);
console.log(`placed comps: ${placed.length} | on-screen instances: ${instances}`);
console.log(`Jordan Love #19 @${byId["19"].tStart} | Addison #14 extraShows ${JSON.stringify(byId["14"].extraShows)} | Kyle red #48 @${byId["48"].tStart} placed=${byId["48"].placed}`);
console.log(`cards pulled total (dupes count) = $${pulled.toFixed(2)} | net $${(pulled - d.boxCostTotal).toFixed(2)} | ROI ${((pulled - d.boxCostTotal) / d.boxCostTotal * 100).toFixed(1)}%`);
