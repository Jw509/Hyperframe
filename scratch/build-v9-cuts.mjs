// v8 cuts: redesigned to PRESERVE NATURAL SLIDES between cards.
// - Auto-windows are MERGED when within 2s of each other (so consecutive
//   card displays + their slide transitions stay continuous, no snap-cuts)
// - Capped at MAX_MERGED 6s to avoid runaway merges including dead time
// - User patches: Bishop added, Chiles fixed to correct src, Royer override
//   tightened so it doesn't eat Bishop
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

const CARD_ZONE_START = 75.0;
const MIN_DUR = 0.55;
const MAX_DUR = 1.10;
const PRE = 0.50;
const POST = 0.50;

// NEW: merge windows within MERGE_GAP seconds of each other. Captures the
// natural slide motion between consecutive card displays.
const MERGE_GAP = 2.0;
// Cap each merged window to avoid runaway expansion through long static
// stretches (host pausing to talk).
const MAX_MERGED = 6.0;

const OVERRIDE_ZONES = [
  { start: 104.0, end: 106.0, reason: "fan shot 1" },
  { start: 109.0, end: 117.0, reason: "Vandross + Billy Edwards 1:50-1:57 zone" },
  { start: 117.0, end: 136.0, reason: "Barnes/Baugh natural slide" },
  { start: 154.0, end: 156.5, reason: "fan shot 2" },
  { start: 158.5, end: 163.5, reason: "DeSean Bishop solo zone" },
  { start: 164.5, end: 168.0, reason: "Royer REVEAL zone" },
  { start: 170.0, end: 174.5, reason: "Royer proper view zone" },
  { start: 174.5, end: 180.5, reason: "Royer-moves -> Chiles SOLO zone (manual)" },
  // CRITICAL skip: 180-200 is where Royer comes back over Chiles + pre-pack-3
  // The user said this is where the awkward 'Royer back over Chiles' lives.
  { start: 180.5, end: 205.0, reason: "SKIP — Royer-covers-Chiles + pack transition" },
  { start: 205.0, end: 222.0, reason: "Pack 3 Hasz zone (one continuous slide window)" },
  { start: 222.0, end: 240.0, reason: "Wallace -> Trey Dez Green continuous slide" },
];

// Per-card manual segments. Each has natural slide motion built in.
const MANUAL_SEGMENTS = [
  { start: 104.5, end: 105.3, note: "FAN SHOT 1 pop (src 1:44.5, 0.8s)" },
  { start: 109.5, end: 112.0, note: "Junior Vandross (1:49.5-1:52)" },
  { start: 112.0, end: 115.0, note: "Billy Edwards Jr (Wisconsin) (1:52-1:55)" },
  { start: 129.0, end: 132.0, note: "Barnes -> Baugh natural slide" },
  { start: 154.5, end: 155.3, note: "FAN SHOT 2 pop (src 2:34.5, 0.8s)" },
  { start: 159.0, end: 163.0, note: "DeSean Bishop solo (Tennessee, 2:39-2:43)" },
  { start: 165.0, end: 167.5, note: "Joe Royer REVEAL (gold sparkle, 2:45-2:47.5)" },
  { start: 170.5, end: 173.5, note: "Joe Royer proper view (2:50.5-2:53.5)" },
  // CHANGED v8->v9: Chiles solo is at src 178-180 (per user), NOT 181-184
  // (which was Royer being put BACK over Chiles)
  { start: 178.0, end: 180.5, note: "Aiden Chiles SOLO (2:58-3:00.5, no Royer overlap)" },
  // Pack 3 Hasz: long continuous window (15s) so the slide between cards is
  // preserved per "thumb is the slide marker" rule
  { start: 205.0, end: 220.0, note: "PACK 3 Hasz zone (continuous 15s, all slides)" },
  // Wallace -> Trey Dez Green: continuous block so Wallace doesn't get put
  // back over Green (same pattern as Royer/Chiles).
  { start: 222.0, end: 238.0, note: "Harrison Wallace -> Trey Dez Green continuous (16s)" },
];

const candidates = freezes.filter((f) => {
  if (f.start < CARD_ZONE_START) return false;
  if (f.duration < MIN_DUR || f.duration > MAX_DUR) return false;
  for (const z of OVERRIDE_ZONES) {
    if (f.end > z.start && f.start < z.end) return false;
  }
  return true;
});

// Build raw windows (PRE motion + held + POST slide-out).
const raw = candidates.map((c) => {
  const heldDur = c.duration > 0.7 ? 0.7 : c.duration;
  return {
    start: Math.max(CARD_ZONE_START, c.start - PRE),
    end: c.end + POST,
  };
});

// MERGE windows within MERGE_GAP — preserves slides between consecutive cards.
const merged = [];
for (const w of raw) {
  const last = merged[merged.length - 1];
  if (last && w.start - last.end < MERGE_GAP) {
    last.end = Math.min(w.end, last.start + MAX_MERGED);
    if (last.end - last.start >= MAX_MERGED) {
      // Cap reached — start a new window from where we are.
      // But only if the next freeze starts AFTER the cap.
    }
  } else {
    merged.push({ ...w });
  }
}

const autoWindows = merged.map((w) => ({
  ...w,
  note: `auto card cluster (src ${w.start.toFixed(1)}-${w.end.toFixed(1)})`,
}));

const allCardSegs = [...autoWindows, ...MANUAL_SEGMENTS].sort(
  (a, b) => a.start - b.start,
);

// TEST MODE: cap so render is ~5 min. Up to ~90s of card content gets us
// through Chiles + Hasz + Wallace + Green (the user's main complaints).
const TEST_CAP = 90.0;
const cards = [];
let acc = 0;
for (const s of allCardSegs) {
  const dur = s.end - s.start;
  if (acc + dur > TEST_CAP) break;
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
  comment: `v9 — Chiles fix (178-180 not 181-184), drop Royer-covers-Chiles, pack 3 Hasz continuous, Wallace->Green continuous. ${cards.length} card windows (${MANUAL_SEGMENTS.length} manual, ${cards.length - MANUAL_SEGMENTS.length} auto-merged). Total ${totalDur.toFixed(2)}s.`,
  segments,
};
writeFileSync("briefs/cuts/bowmanchrome2025.json", JSON.stringify(out, null, 2));

console.log(`Raw candidates after override: ${candidates.length}`);
console.log(`After merge (gap<${MERGE_GAP}s): ${autoWindows.length}`);
console.log(`Manual segments: ${MANUAL_SEGMENTS.length}`);
console.log(`Total card windows: ${cards.length}`);
console.log(`Total cut duration: ${totalDur.toFixed(2)}s (${(totalDur/60).toFixed(2)} min)`);
console.log(`Avg auto window: ${(autoWindows.reduce((s,w)=>s+w.end-w.start,0)/autoWindows.length).toFixed(2)}s`);
