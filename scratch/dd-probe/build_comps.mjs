import fs from "fs";
const dir = "scratch/dd-probe/";
const targets = JSON.parse(fs.readFileSync(dir + "comps_merged.json", "utf8"));
const best = JSON.parse(fs.readFileSync(dir + "best_sightings.json", "utf8"));
const idOf = i => String(i + 1).padStart(2, "0");
const comps = targets.map((t, i) => {
  const id = idOf(i); const b = best[id];
  const o = {
    compId: id, file: t.file, player: t.player, team: t.team || null, parallel: t.parallel || null,
    serial: t.serial || null, value: +t.value, soldDate: t.soldDate || null
  };
  if (b) {
    const ts = b.tStart ?? b.tBest, te = b.tEnd ?? b.tBest ?? ts;
    o.tStart = +ts; o.tEnd = +Math.max(te, ts); o.tBest = +(b.tBest ?? ts);
    o.placed = true; o.conf = b.confidence || "low"; o.win = b.win;
  } else { o.placed = false; o.conf = null; }
  return o;
});
const moneyId = comps.filter(c => c.placed).sort((a, b) => b.value - a.value)[0]?.compId;
comps.forEach(c => { if (c.compId === moneyId) c.money = true; });
const out = {
  _comment: "2025 Topps Signature Class DOUBLE DOUBLE (2 mega + 2 blaster). Comp values from eBay sold screenshots in cards/comps/25Signature2Mega2Blaster (2026-06-23). tStart/tEnd/tBest = on-screen seconds in the host 14-min 4K cut (cards/sources/DoubleDoubleSignature/SignatureDoubleDouble.mp4, 839.47s). Timings auto-catalogued via per-window vision fan-out (2s frames) then merged; conf=high/med/low. placed=false means not confidently located and NOT rendered yet. boxOpens drive the top-left cost counter (ticks up per box). Box TYPES/order pending user confirm.",
  slug: "25Signature2Mega2Blaster",
  product: "2025 Topps Signature Class - 2 Mega + 2 Blaster (Double Double)",
  videoDuration: 839.47,
  boxCostTotal: 191.96,
  boxOpens: [
    { t: 12, type: "mega", cost: 65.99, note: "80ct box; one of two megas shown sealed at t=8" },
    { t: 194, type: "mega", cost: 65.99, note: "second 80ct mega (W04 read 80 TOTAL)" },
    { t: 426, type: "blaster", cost: 29.99, note: "42ct box (W08 read 42 TOTAL/6-per-pack)" },
    { t: 580, type: "blaster", cost: 29.99, note: "4th crack; megas already opened so inferred blaster" }
  ],
  comps
};
fs.writeFileSync("cards/comps/25Signature2Mega2Blaster/comps.json", JSON.stringify(out, null, 2));
const placed = comps.filter(c => c.placed);
console.log("comps.json written:", comps.length, "comps,", placed.length, "placed,", comps.length - placed.length, "unplaced");
console.log("money shot:", comps.find(c => c.money)?.player);
console.log("placed value total: $" + placed.reduce((s, c) => s + c.value, 0).toFixed(2));
