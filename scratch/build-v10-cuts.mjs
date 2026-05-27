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

// Tagged headliners get an AUTOMATIC back-over skip zone after them
// (structural prevention of recurring failure mode #2).
const BACK_OVER_BUFFER = 7.0;

// Manual segments. Tags: "fan" = pop, "headliner" = adds back-over buffer,
// "first-of-pack" = enforces solo display after a fan
const MANUAL_SEGMENTS = [
  { start: 104.5, end: 105.3, note: "FAN SHOT 1 pop", tag: "fan", pack: 1 },
  { start: 109.5, end: 112.0, note: "Junior Vandross (pack 1 first card)", tag: "first-of-pack", pack: 1 },
  { start: 112.0, end: 115.0, note: "Billy Edwards Jr (Wisconsin)", pack: 1 },
  { start: 129.0, end: 132.0, note: "Barnes -> Baugh natural slide", pack: 1 },
  { start: 154.5, end: 155.3, note: "FAN SHOT 2 pop", tag: "fan", pack: 2 },
  { start: 159.0, end: 163.0, note: "DeSean Bishop solo (Tennessee, 2:39-2:43)", tag: "first-of-pack", pack: 2 },
  { start: 165.0, end: 167.5, note: "Joe Royer REVEAL (gold sparkle, 2:45-2:47.5)", tag: "headliner", pack: 2 },
  { start: 170.5, end: 173.5, note: "Joe Royer proper view (2:50.5-2:53.5)", tag: "headliner", pack: 2 },
  { start: 178.0, end: 180.5, note: "Aiden Chiles SOLO (2:58-3:00.5, no Royer overlap)", pack: 2 },
  // PACK 3 — denser cuts (was 15s continuous, now ~2-3s each)
  // The user said Hasz visible in pack 3 fan around src 210
  { start: 205.0, end: 207.5, note: "PACK 3 fan/opening (src 3:25-3:27)", tag: "fan", pack: 3 },
  { start: 208.5, end: 211.5, note: "Luke Hasz solo (pack 3 first card)", tag: "first-of-pack", pack: 3 },
  { start: 213.0, end: 215.5, note: "Pack 3 card 2 (src 3:33-3:35)", pack: 3 },
  { start: 217.0, end: 220.0, note: "Pack 3 card 3 (src 3:37-3:40)", pack: 3 },
  // Harrison Wallace + Trey Dez Green — Wallace covers Green at v9 cut 60.5
  // which = src 229.4. So END Wallace->Green at src 229.
  { start: 222.0, end: 226.0, note: "Harrison Wallace solo (src 3:42-3:46)", pack: 3 },
  { start: 226.5, end: 229.0, note: "Trey Dez Green solo (src 3:46.5-3:49, BEFORE Wallace covers)", pack: 3 },
  // PACK 4 — LJ Martins at v9 cut 74s = src ~250. Pack 4 fan probably src 245-247.
  { start: 245.0, end: 247.0, note: "PACK 4 fan/opening (src 4:05-4:07)", tag: "fan", pack: 4 },
  { start: 249.0, end: 252.0, note: "LJ Martins solo (pack 4 first card)", tag: "first-of-pack", pack: 4 },
  { start: 254.0, end: 256.5, note: "Pack 4 card 2 (src 4:14-4:16.5)", pack: 4 },
  { start: 258.0, end: 260.5, note: "Pack 4 card 3 (src 4:18-4:20.5)", pack: 4 },
  { start: 262.0, end: 264.5, note: "Pack 4 card 4 (src 4:22-4:24.5)", pack: 4 },
];

// Auto-derive OVERRIDE_ZONES from the manual segments to ensure auto-detect
// doesn't pick up dead time between them, AND headliners get back-over buffer.
const OVERRIDE_ZONES = [];
for (let i = 0; i < MANUAL_SEGMENTS.length; i++) {
  const s = MANUAL_SEGMENTS[i];
  const next = MANUAL_SEGMENTS[i + 1];
  // Always override the segment itself
  OVERRIDE_ZONES.push({ start: s.start, end: s.end, reason: `manual: ${s.note}` });
  // Headliners get a back-over skip zone after them
  if (s.tag === "headliner") {
    OVERRIDE_ZONES.push({
      start: s.end,
      end: s.end + BACK_OVER_BUFFER,
      reason: `back-over buffer after headliner: ${s.note}`,
    });
  }
  // Fans must be followed by a first-of-pack within 30s
  if (s.tag === "fan") {
    const nearbyFirst = MANUAL_SEGMENTS
      .slice(i + 1)
      .find((m) => m.tag === "first-of-pack" && m.start - s.end < 30 && m.pack === s.pack);
    if (!nearbyFirst) {
      throw new Error(
        `STRUCTURAL CHECK FAILED: fan segment at src ${s.start} (pack ${s.pack}) has no first-of-pack solo within 30s. ` +
        `This is the recurring failure mode #1 — first card of pack gets skipped.`,
      );
    }
  }
  // Auto-skip the gap between consecutive manual segments in the same pack
  if (next && next.pack === s.pack && next.start - s.end > 0.5 && next.start - s.end < 15) {
    OVERRIDE_ZONES.push({
      start: s.end,
      end: next.start,
      reason: `intra-pack gap between ${s.note} and ${next.note}`,
    });
  }
}
// Bridge gaps between packs that auto-detect should NOT fill
OVERRIDE_ZONES.push({ start: 75.0, end: 104.0, reason: "pre-pack 1 (auto may include intro tail)" });
OVERRIDE_ZONES.push({ start: 117.0, end: 129.0, reason: "between Edwards and Barnes (Barnes/Baugh source area)" });
OVERRIDE_ZONES.push({ start: 132.0, end: 154.0, reason: "between Baugh and fan2 (pack 1->2 transition)" });
OVERRIDE_ZONES.push({ start: 180.5, end: 205.0, reason: "SKIP — Royer-covers-Chiles + pack 2->3 transition" });
OVERRIDE_ZONES.push({ start: 229.0, end: 245.0, reason: "SKIP — Wallace-covers-Green + pack 3->4 transition" });

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
