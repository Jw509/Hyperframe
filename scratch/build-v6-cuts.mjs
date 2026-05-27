// v6 cuts: v5 auto-detect base + user-specified patches.
// - Fan shots pop briefly at 1:45 and 2:35 (0.5s each)
// - Vandross/Billy Edwards zone (1:50-1:57) included verbatim — user's
//   reference for "correct pacing"
// - Joe Royer: reveal + proper view + next card explicitly mapped; dedupe
//   any auto-detected window in the Royer zone
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

// Auto-detect params (v5 settings).
const CARD_ZONE_START = 75.0;
const MIN_DUR = 0.55;
const MAX_DUR = 1.10;
const MIN_GAP = 0.2;
const PRE = 0.70;
const POST = 0.50;
const MAX_WINDOW = 1.6;
const MIN_INTERVAL = 1.0;

// User-overridden zones — auto-detect SKIPS these; manual segments inserted.
const OVERRIDE_ZONES = [
  { start: 104.0, end: 106.0, reason: "fan shot 1" },
  { start: 109.0, end: 117.0, reason: "Vandross + Billy Edwards 1:50-1:57 zone" },
  { start: 154.0, end: 156.0, reason: "fan shot 2" },
  { start: 160.0, end: 185.0, reason: "Joe Royer 3-shot sequence" },
];

// User-specified segments to insert in source order.
const MANUAL_SEGMENTS = [
  { start: 104.5, end: 105.0, note: "FAN SHOT 1 pop (src 1:44.5)" },
  { start: 109.5, end: 112.0, note: "Junior Vandross (1:49.5-1:52)" },
  { start: 112.0, end: 115.0, note: "Billy Edwards Jr (Wisconsin) (1:52-1:55)" },
  { start: 154.5, end: 155.0, note: "FAN SHOT 2 pop (src 2:34.5)" },
  { start: 165.0, end: 167.0, note: "Joe Royer REVEAL (gold sparkle, 2:45-2:47)" },
  { start: 171.0, end: 173.0, note: "Joe Royer proper view (2:51-2:53)" },
  { start: 176.0, end: 178.0, note: "Aiden Chiles / next card (2:56-2:58)" },
];

// Filter freezes in card zone, excluding override zones.
const candidates = freezes.filter((f) => {
  if (f.start < CARD_ZONE_START) return false;
  if (f.duration < MIN_DUR || f.duration > MAX_DUR) return false;
  for (const z of OVERRIDE_ZONES) {
    if (f.end > z.start && f.start < z.end) return false;
  }
  return true;
});

// Cluster freezes (micro-tremors).
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

// Build raw windows (PRE motion + freeze + POST slide-out).
let rawWindows = clusters.map((c) => {
  const start = Math.max(CARD_ZONE_START, c.start - PRE);
  const heldDur = c.duration > 0.8 ? 0.8 : c.duration;
  const end = Math.min(c.start + heldDur + POST, start + MAX_WINDOW);
  return { start, end, note: `auto card (src ${c.start.toFixed(1)})` };
});

// Enforce MIN_INTERVAL spacing.
const autoWindows = [];
for (const w of rawWindows) {
  const last = autoWindows[autoWindows.length - 1];
  if (last && w.start - last.start < MIN_INTERVAL) continue;
  autoWindows.push({ ...w });
}

// Merge auto + manual, sort by source start time.
const allCardSegs = [...autoWindows, ...MANUAL_SEGMENTS].sort(
  (a, b) => a.start - b.start,
);

// Cap total card-cycle content at 50s (so total with 10s intro = 60s).
const TARGET_CARDS = 50.0;
const cards = [];
let acc = 0;
for (const s of allCardSegs) {
  const dur = s.end - s.start;
  if (acc + dur > TARGET_CARDS) break;
  cards.push({
    start: Number(s.start.toFixed(3)),
    end: Number(s.end.toFixed(3)),
    note: s.note,
  });
  acc += dur;
}

const INTRO = [
  { start: 23.0, end: 24.0, note: "intro a (src 23-24)" },
  { start: 26.0, end: 31.0, note: "intro b (src 26-31)" },
  { start: 37.0, end: 41.0, note: "intro c (src 37-41)" },
];

const segments = [...INTRO, ...cards];
const totalDur = segments.reduce((s, x) => s + (x.end - x.start), 0);

const out = {
  comment: `v6 — auto-detect + user patches. ${cards.length} card windows (${MANUAL_SEGMENTS.length} manual, ${cards.length - MANUAL_SEGMENTS.length} auto). Fan pops, Vandross/Edwards zone, Royer 3-shot. Total ${totalDur.toFixed(2)}s.`,
  segments,
};
writeFileSync("briefs/cuts/bowmanchrome2025.json", JSON.stringify(out, null, 2));

console.log(`Auto candidates after exclude: ${autoWindows.length}`);
console.log(`Manual segments inserted: ${MANUAL_SEGMENTS.length}`);
console.log(`Total cards in 50s budget: ${cards.length}`);
console.log(`Total cut duration: ${totalDur.toFixed(2)}s`);
console.log(`Manual segments in order:`);
MANUAL_SEGMENTS.forEach((m) => console.log(`  src ${m.start}-${m.end}  ${m.note}`));
