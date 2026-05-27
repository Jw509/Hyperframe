// v3 cuts: motion-aware "every card" cycle.
// Source: parse ffmpeg freezedetect output. Each "freeze" = host holding
// something still (a card, or empty mat). Filter to plausible card holds.
import { readFileSync, writeFileSync } from "node:fs";

const txt = readFileSync("scratch/freezes.txt", "utf8");
const lines = txt.split(/\r?\n/);

const freezes = [];
let current = null;
for (const line of lines) {
  const ms = line.match(/freeze_start:\s*([\d.]+)/);
  const md = line.match(/freeze_duration:\s*([\d.]+)/);
  const me = line.match(/freeze_end:\s*([\d.]+)/);
  if (ms) current = { start: parseFloat(ms[1]) };
  if (md && current) current.duration = parseFloat(md[1]);
  if (me && current) {
    current.end = parseFloat(me[1]);
    freezes.push(current);
    current = null;
  }
}

// Filter rules:
// - Inside the card zone (cards start at ~1:00, end ~19:50)
// - Freeze duration between 0.30s and 3.0s (card-hold range; longer = mat empty)
// - Avoid headliner windows (Stockton/Singleton play uncut)
const CARD_ZONE_START = 60.0;
const CARD_ZONE_END = 1190.0;
const STOCKTON = { start: 835.0, end: 848.0 };
const SINGLETON = { start: 1078.0, end: 1092.0 };

const MIN_DUR = 0.50;  // tighter: real card holds tend to be >= 0.5s
const MAX_DUR = 2.5;   // longer than 2.5s usually = empty mat / resting

const candidates = freezes.filter((f) =>
  f.start >= CARD_ZONE_START &&
  f.end <= CARD_ZONE_END &&
  f.duration >= MIN_DUR &&
  f.duration <= MAX_DUR &&
  !(f.end > STOCKTON.start && f.start < STOCKTON.end) &&
  !(f.end > SINGLETON.start && f.start < SINGLETON.end)
);

// Cluster freezes that are within MIN_GAP of each other (same card, micro-tremor).
const MIN_GAP = 0.5;
const clusters = [];
for (const f of candidates) {
  const last = clusters[clusters.length - 1];
  if (last && f.start - last.end < MIN_GAP) {
    last.end = f.end;
    last.duration = last.end - last.start;
  } else {
    clusters.push({ ...f });
  }
}

// For each clustered card-hold, build a cut window: include 0.5s BEFORE the
// freeze (hand bringing the card in) + the first ~0.5s of the freeze itself
// (card centered, name readable). Cap at 1.2s total.
const PRE = 0.5;
const HOLD = 0.5;
const MAX_CUT = 1.2;

const cardSegs = clusters.map((c, i) => {
  const start = Math.max(CARD_ZONE_START, c.start - PRE);
  const end = Math.min(c.start + HOLD, start + MAX_CUT);
  return {
    start: Number(start.toFixed(3)),
    end: Number(end.toFixed(3)),
    note: `card #${i + 1} (freeze ${c.start.toFixed(2)}-${c.end.toFixed(2)}s)`,
  };
});

// Split into pre-Stockton, mid (post-Stockton/pre-Singleton), and post-Singleton.
const preStock = cardSegs.filter((s) => s.end < STOCKTON.start);
const midSegs = cardSegs.filter((s) => s.start > STOCKTON.end && s.end < SINGLETON.start);
const postSing = cardSegs.filter((s) => s.start > SINGLETON.end);

const segments = [
  { start: 53.0, end: 63.0, note: "intro: box face -> open -> packs" },
  ...preStock,
  { ...STOCKTON, note: "STOCKTON money shot (uncut)" },
  ...midSegs,
  ...postSing,
  { ...SINGLETON, note: "SINGLETON auto reveal (uncut, recap tail)" },
];

const totalDur = segments.reduce((s, x) => s + (x.end - x.start), 0);

const out = {
  comment: `v3 — motion-aware "every card" cycle via freezedetect. ${cardSegs.length} card holds detected, ${segments.length} segments, ${totalDur.toFixed(2)}s cut. ~0.5s hand-in + 0.5s held = ~1.0s per card.`,
  segments,
};
writeFileSync("briefs/cuts/bowmanchrome2025.json", JSON.stringify(out, null, 2));

console.log(`Raw freezes: ${freezes.length}`);
console.log(`In-zone candidates (${MIN_DUR}-${MAX_DUR}s): ${candidates.length}`);
console.log(`Clustered card holds: ${cardSegs.length}`);
console.log(`  pre-Stockton: ${preStock.length}, mid: ${midSegs.length}, post-Singleton: ${postSing.length}`);
console.log(`Total segments (incl. intro + headliners): ${segments.length}`);
console.log(`Total cut duration: ${totalDur.toFixed(2)}s (${(totalDur / 60).toFixed(2)} min)`);
