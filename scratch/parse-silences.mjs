// Parse ffmpeg silencedetect output -> rank candidate "reveal" moments.
// In card-opening footage, the "moment of reveal" is typically:
//   - long silence (host stares at card, processing what they pulled)
//   - then reaction starts (silence_end)
// We rank silence ENDs by their preceding silence_duration.
import { readFileSync, writeFileSync } from "node:fs";

const txt = readFileSync(process.argv[2], "utf8");

const events = [];
const reStart = /silence_start:\s*([\d.]+)/g;
const reEnd = /silence_end:\s*([\d.]+)\s*\|\s*silence_duration:\s*([\d.]+)/g;

let m;
while ((m = reStart.exec(txt)) !== null) {
  events.push({ type: "start", t: parseFloat(m[1]) });
}
while ((m = reEnd.exec(txt)) !== null) {
  events.push({
    type: "end",
    t: parseFloat(m[1]),
    dur: parseFloat(m[2]),
  });
}
events.sort((a, b) => a.t - b.t);

// For ranking, take each silence_end with its silence_duration.
const reveals = events
  .filter((e) => e.type === "end" && e.dur >= 1.0)
  .map((e) => ({ revealAt: e.t, silencePrior: e.dur }))
  .sort((a, b) => b.silencePrior - a.silencePrior);

console.log(`Total silences detected: ${events.filter((e) => e.type === "end").length}`);
console.log(`Reveals with >=1.0s prior silence: ${reveals.length}`);

// Top 40 candidates by silence length (a reaction-amplitude proxy)
const top = reveals.slice(0, 40).sort((a, b) => a.revealAt - b.revealAt);
console.log("\nTop 40 candidates (sorted by timestamp):");
for (const r of top) {
  const mm = Math.floor(r.revealAt / 60);
  const ss = (r.revealAt % 60).toFixed(2).padStart(5, "0");
  console.log(`  ${mm}:${ss}   prior_silence=${r.silencePrior.toFixed(2)}s`);
}

writeFileSync(
  process.argv[3] || "scratch/silences-ranked.json",
  JSON.stringify(top, null, 2),
);
