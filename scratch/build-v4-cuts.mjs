// v4-test: focused first-minute iteration of the cut style.
// - New intro from source 23-24 + 26-31 + 37-41 (~10s)
// - Card windows extended to include slide-out motion (freeze_end + 0.5s)
// - Cap at ~60s output for fast render times
// - No headliner overlays in this 60s slice (they're at 13:57 and 18:01)
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

// Card zone starts AFTER the pack-stack zone — first real card holds begin
// around source 1:15-1:30. Anything between 50-75s is still pack sorting.
const CARD_ZONE_START = 75.0;
const MIN_DUR = 0.55;
const MAX_DUR = 1.10;   // tighter: real card displays are typically 0.5-1.0s

const candidates = freezes.filter((f) =>
  f.start >= CARD_ZONE_START &&
  f.duration >= MIN_DUR &&
  f.duration <= MAX_DUR
);

// Cluster freezes within MIN_GAP of each other (same card, micro-tremor).
// Tight 0.2s gap keeps separate cards from chaining into long runs.
const MIN_GAP = 0.2;
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

// Window per card: include the freeze itself + slide-out motion afterwards.
// PRE captures the hand bringing card in; POST captures the card sliding out
// before next card lands. Cuts no longer feel like a blink.
const PRE = 0.70;   // longer slide-in — viewer SEES the card coming up
const POST = 0.50;  // slide-out into next card

// Cap each card window at MAX_WINDOW seconds to prevent runaway merges.
// Also enforce MIN_INTERVAL between window STARTS so we don't pile up.
const MAX_WINDOW = 1.6;
const MIN_INTERVAL = 1.0;

let rawWindows = clusters.map((c) => {
  const start = Math.max(CARD_ZONE_START, c.start - PRE);
  const end = Math.min(c.start + (c.duration > 0.8 ? 0.8 : c.duration) + POST, start + MAX_WINDOW);
  return { start, end };
});

// Filter to enforce MIN_INTERVAL between adjacent window starts.
const merged = [];
for (const w of rawWindows) {
  const last = merged[merged.length - 1];
  if (last && w.start - last.start < MIN_INTERVAL) continue;  // too close, skip
  merged.push({ ...w });
}

// Build the segment list. Intro first, then card windows up to ~50s of card
// content (so total ~60s including intro).
const INTRO = [
  { start: 23.0, end: 24.0, note: "intro a (src 23-24)" },
  { start: 26.0, end: 31.0, note: "intro b (src 26-31)" },
  { start: 37.0, end: 41.0, note: "intro c (src 37-41)" },
];
const introDur = INTRO.reduce((s, x) => s + (x.end - x.start), 0);

const TARGET_TOTAL = 60.0;
const cardBudget = TARGET_TOTAL - introDur;

const cards = [];
let acc = 0;
let i = 1;
for (const w of merged) {
  const dur = w.end - w.start;
  if (acc + dur > cardBudget) break;
  cards.push({
    start: Number(w.start.toFixed(3)),
    end: Number(w.end.toFixed(3)),
    note: `card window #${i} (${dur.toFixed(2)}s)`,
  });
  acc += dur;
  i++;
}

const segments = [...INTRO, ...cards];
const totalDur = segments.reduce((s, x) => s + (x.end - x.start), 0);

const out = {
  comment: `v4-test — first-minute iteration. ${INTRO.length} intro segments + ${cards.length} card windows. Card windows: ${PRE}s pre + freeze + ${POST}s slide-out, overlapping windows merged. Total ${totalDur.toFixed(2)}s.`,
  segments,
};
writeFileSync("briefs/cuts/bowmanchrome2025.json", JSON.stringify(out, null, 2));

console.log(`Raw freezes in zone: ${candidates.length}`);
console.log(`Clustered card holds: ${clusters.length}`);
console.log(`Card windows after merge: ${merged.length}`);
console.log(`Cards fit in ${cardBudget.toFixed(1)}s budget: ${cards.length}`);
console.log(`Total segments: ${segments.length}`);
console.log(`Total cut duration: ${totalDur.toFixed(2)}s`);
console.log(`Avg per-card window: ${(acc / cards.length).toFixed(2)}s`);
