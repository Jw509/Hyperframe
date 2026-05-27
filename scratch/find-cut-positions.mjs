import { readFileSync } from "node:fs";
const { segments } = JSON.parse(readFileSync("briefs/cuts/bowmanchrome2025.json", "utf8"));

// Find cut-time start of any segment whose note contains "STOCKTON" or "SINGLETON".
let cumulative = 0;
let totalSamples = 0;
for (const seg of segments) {
  if (seg.note?.includes("STOCKTON")) {
    console.log(`STOCKTON segment src=${seg.start}-${seg.end}, cut_start=${cumulative.toFixed(3)}s`);
    // src 13:57 (837) is 2s into segment (starts at 835)
    const stocktonPeak = cumulative + (837 - seg.start);
    console.log(`  Stockton peak (src 13:57) at cut t=${stocktonPeak.toFixed(3)}s`);
    console.log(`  With +1.0s onset delay -> overlay data-start=${(stocktonPeak + 1.0).toFixed(3)}s`);
  }
  if (seg.note?.includes("SINGLETON")) {
    console.log(`SINGLETON segment src=${seg.start}-${seg.end}, cut_start=${cumulative.toFixed(3)}s`);
    const singletonPeak = cumulative + (1081 - seg.start);
    console.log(`  Singleton peak (src 18:01) at cut t=${singletonPeak.toFixed(3)}s`);
    console.log(`  With +1.0s onset delay -> overlay data-start=${(singletonPeak + 1.0).toFixed(3)}s`);
  }
  if (seg.note?.includes("card cycle")) totalSamples++;
  cumulative += seg.end - seg.start;
}
console.log(`\nTotal cut duration: ${cumulative.toFixed(3)}s`);
console.log(`Card-cycle samples: ${totalSamples}`);
