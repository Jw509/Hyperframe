import fs from "fs";
const P = "cards/comps/25Signature2Mega2Blaster/comps.json";
const d = JSON.parse(fs.readFileSync(P, "utf8"));
const byId = Object.fromEntries(d.comps.map(c => [c.compId, c]));
// Trey Amos 10:30 -> 10:27
const ta = byId["38"]; ta.tStart = 627; ta.tEnd = 629; ta.tBest = 628;
// intro overlay (top-middle, start of video) + emoji to the right
d.intro = {
  enabled: true,
  text: "All price totals for profit/loss will be shown at the end",
  image: "sunglasses-nobg.png",
  start: 0.8,
  duration: 5.5
};
fs.writeFileSync(P, JSON.stringify(d, null, 2));
console.log("Trey Amos #38 @", byId["38"].tStart, "| intro:", d.intro.text.slice(0, 30) + "...", "img", d.intro.image);
