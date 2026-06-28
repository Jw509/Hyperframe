import fs from "fs";
const P = "cards/comps/25Signature2Mega2Blaster/comps.json";
const d = JSON.parse(fs.readFileSync(P, "utf8"));
for (const c of d.comps) {
  if (c.compId === "17") { // McBride Total Yards -> move to 7:20 (440s)
    c.tStart = 440; c.tEnd = 442; c.tBest = 441; c.placed = true; c.conf = "user-frame";
    c.note = "card is TOTAL YARDS insert (eBay title 'Zone Out' is a seller typo); placed at on-screen 7:20";
  }
  if (c.compId === "48") { // Kyle Williams red&black 9:04 -> WRONG, unplace (user will relocate)
    c.placed = false; c.tStart = null; c.tEnd = null; c.tBest = null; c.conf = null;
    c.note = "user: 9:04 placement wrong; the red&black #147 is elsewhere — to be relocated";
  }
}
// end payoff / loss-of-investment reveal card
d.recap = { enabled: true, durationSeconds: 7.5 };
fs.writeFileSync(P, JSON.stringify(d, null, 2));
const placed = d.comps.filter(c => c.placed);
const cardsValue = d.comps.reduce((s, c) => s + (+c.value || 0), 0);
console.log(`placed on-screen: ${placed.length}/${d.comps.length}`);
console.log(`recap: box cost $${d.boxCostTotal}  cards pulled $${cardsValue.toFixed(2)}  net $${(cardsValue - d.boxCostTotal).toFixed(2)}  ROI ${((cardsValue - d.boxCostTotal) / d.boxCostTotal * 100).toFixed(1)}%`);
console.log("McBride#17:", d.comps.find(c => c.compId === "17").tStart, "| KyleWilliams#48 placed:", d.comps.find(c => c.compId === "48").placed);
