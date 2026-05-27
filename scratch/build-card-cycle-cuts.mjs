// Generate cuts JSON for "every card visible" rule.
// Strategy: mechanical sampling — take SAMPLE_DUR seconds out of every STRIDE
// seconds across the card zone. Skip the boring intro tail (pack sorting)
// and bracket the two headliner reveals so they play uncut.
import { writeFileSync } from "node:fs";

const SAMPLE_DUR = 1.0;   // duration kept per sample
const STRIDE = 4.0;       // seconds between sample starts

// Headliner windows (keep uncut, no sampling inside them).
const STOCKTON = { start: 835.0, end: 848.0 };  // source 13:55-14:08
const SINGLETON = { start: 1078.0, end: 1092.0 }; // source 17:58-18:12

// Card-zone bounds where the host is showing cards.
const CARD_ZONE_START = 65.0;   // source 1:05 (after intro)
const CARD_ZONE_END = 1190.0;   // source 19:50 (before close)

function sampleRange(start, end, label) {
  const out = [];
  let t = start;
  let i = 1;
  while (t + SAMPLE_DUR < end) {
    out.push({
      start: Number(t.toFixed(2)),
      end: Number((t + SAMPLE_DUR).toFixed(2)),
      note: `${label} #${i}`,
    });
    i++;
    t += STRIDE;
  }
  return out;
}

// Order: intro -> pre-Stockton cards -> Stockton -> mid cards -> post-Singleton
// cards -> Singleton (recap plays over its tail).
const segments = [
  { start: 53.0, end: 63.0, note: "intro: box face -> open -> packs" },
  ...sampleRange(CARD_ZONE_START, STOCKTON.start - SAMPLE_DUR, "card cycle (pre-Stockton)"),
  { ...STOCKTON, note: "STOCKTON money shot (uncut)" },
  ...sampleRange(STOCKTON.end + 1, SINGLETON.start - SAMPLE_DUR, "card cycle (mid)"),
  ...sampleRange(SINGLETON.end + 1, CARD_ZONE_END, "card cycle (post-Singleton)"),
  { ...SINGLETON, note: "SINGLETON auto reveal (uncut, recap tail)" },
];

const totalDur = segments.reduce((s, x) => s + (x.end - x.start), 0);

const out = {
  comment: `v2 — "every card" rule. ${segments.length} segments, ${totalDur.toFixed(2)}s cut. Mechanical ${SAMPLE_DUR}s sample every ${STRIDE}s across card zone, headliners kept uncut.`,
  segments,
};
writeFileSync("briefs/cuts/bowmanchrome2025.json", JSON.stringify(out, null, 2));
console.log(`Wrote ${segments.length} segments, ${totalDur.toFixed(2)}s total`);
